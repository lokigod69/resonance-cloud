-- Phase 1A DB/RLS/Auth hardening.
--
-- Goals:
-- - admin_roles is the admin source of truth.
-- - profiles.role is only a trusted mirror/display field.
-- - ordinary authenticated users can update safe profile preferences only.
-- - ordinary authenticated users cannot self-admin or self-credit.
-- - invite codes are redeemed only through the hardened RPC.
-- - dangerous credit mutation RPCs are not executable by ordinary users.

begin;

-- ---------------------------------------------------------------------------
-- Admin authority
-- ---------------------------------------------------------------------------

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_roles
    where user_id = auth.uid()
  );
$$;

comment on table public.admin_roles is
  'Authoritative admin membership. profiles.role is a compatibility mirror only.';

comment on function public.is_admin() is
  'Returns true when auth.uid() is present in public.admin_roles; does not trust profiles.role.';

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated, service_role;

drop policy if exists "Admins manage admin roles" on public.admin_roles;
create policy "Admins manage admin roles"
  on public.admin_roles
  for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------------
-- Profile protection
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_safe_update_columns text[] := array[
    'display_name',
    'base_language',
    'theme',
    'skin',
    'onboarding_complete',
    'onboarding_completed',
    'onboarding_preferences',
    'updated_at'
  ];
  v_blocked_columns text;
  v_is_trusted boolean;
begin
  v_is_trusted :=
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting('app.allow_profile_privileged_update', true), '') = 'on'
    or public.is_admin();

  if tg_op = 'INSERT' then
    if not v_is_trusted then
      if new.id is distinct from auth.uid() then
        raise exception 'Users can only insert their own profile'
          using errcode = '42501';
      end if;

      if coalesce(new.role, 'learner') <> 'learner'
         or coalesce(new.credits, 0) <> 0 then
        raise exception 'Users cannot set privileged profile fields'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and not v_is_trusted then
    select string_agg(changed.key, ', ' order by changed.key)
    into v_blocked_columns
    from (
      select n.key
      from jsonb_each(to_jsonb(new)) as n(key, value)
      join jsonb_each(to_jsonb(old)) as o(key, value)
        on o.key = n.key
      where n.value is distinct from o.value
        and not (n.key = any (v_safe_update_columns))
    ) as changed;

    if v_blocked_columns is not null then
      raise exception 'Users can only update safe profile preference fields. Blocked: %',
        v_blocked_columns
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists protect_profile_privileged_fields on public.profiles;
create trigger protect_profile_privileged_fields
before insert or update on public.profiles
for each row
execute function public.protect_profile_privileged_fields();

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
  on public.profiles
  for update
  using (id = auth.uid())
  with check (id = auth.uid());

drop policy if exists "Admins can update all profiles" on public.profiles;
create policy "Admins can update all profiles"
  on public.profiles
  for update
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Allow profile inserts" on public.profiles;
drop policy if exists "Users can insert own profile safety net" on public.profiles;
create policy "Users can insert own profile safety net"
  on public.profiles
  for insert
  with check (auth.role() = 'authenticated' and id = auth.uid());

drop policy if exists "Admins can insert profiles" on public.profiles;
create policy "Admins can insert profiles"
  on public.profiles
  for insert
  with check (public.is_admin());

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  perform set_config('app.allow_profile_privileged_update', 'on', true);

  insert into public.profiles (id, email, display_name, role, credits, created_at)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    'learner',
    0,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

revoke all on function public.protect_profile_privileged_fields() from public, anon, authenticated;
revoke all on function public.sync_admin_role_from_profile() from public, anon, authenticated;
revoke all on function public.touch_admin_roles_updated_at() from public, anon, authenticated;
revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Credit mutation RPC
-- ---------------------------------------------------------------------------

create or replace function public.refund_credit(user_id_param uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and coalesce(current_setting('app.allow_profile_privileged_update', true), '') <> 'on' then
    raise exception 'refund_credit is restricted to trusted server paths'
      using errcode = '42501';
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
  set credits = credits + 1
  where id = user_id_param;
end;
$$;

comment on function public.refund_credit(uuid) is
  'Trusted server RPC for refunding one credit. Not executable by ordinary authenticated users.';

revoke all on function public.refund_credit(uuid) from public, anon, authenticated;
grant execute on function public.refund_credit(uuid) to service_role;

-- ---------------------------------------------------------------------------
-- Invite codes and redemption
-- ---------------------------------------------------------------------------

drop policy if exists "Authenticated users can read codes" on public.invite_codes;
drop policy if exists "Admins can manage codes" on public.invite_codes;
drop policy if exists "Admins manage invite codes" on public.invite_codes;

create policy "Admins manage invite codes"
  on public.invite_codes
  for all
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins manage invite code redemptions" on public.invite_code_redemptions;
create policy "Admins manage invite code redemptions"
  on public.invite_code_redemptions
  for all
  using (public.is_admin())
  with check (public.is_admin());

create or replace function public.redeem_invite_code(code_text text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_code public.invite_codes%rowtype;
  v_count integer;
  v_user_id uuid := auth.uid();
  v_updated integer;
begin
  if v_user_id is null then
    return jsonb_build_object('success', false, 'error', 'Authentication required');
  end if;

  select *
  into v_code
  from public.invite_codes
  where upper(code) = upper(btrim(code_text))
    and is_active = true
  for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'Invalid or inactive code');
  end if;

  if exists (
    select 1
    from public.invite_code_redemptions
    where invite_code_id = v_code.id
      and user_id = v_user_id
  ) then
    return jsonb_build_object('success', false, 'error', 'You have already redeemed this code');
  end if;

  if v_code.max_uses is not null then
    select count(*)
    into v_count
    from public.invite_code_redemptions
    where invite_code_id = v_code.id;

    if v_count >= v_code.max_uses then
      return jsonb_build_object('success', false, 'error', 'This code has reached its maximum uses');
    end if;
  end if;

  insert into public.invite_code_redemptions (
    invite_code_id,
    user_id,
    credits_awarded
  )
  values (v_code.id, v_user_id, v_code.credits);

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
  set credits = credits + v_code.credits
  where id = v_user_id;

  get diagnostics v_updated = row_count;
  if v_updated <> 1 then
    raise exception 'Profile not found for invite redemption'
      using errcode = 'P0002';
  end if;

  return jsonb_build_object('success', true, 'credits_awarded', v_code.credits);
end;
$$;

comment on function public.redeem_invite_code(text) is
  'Atomic invite-code redemption path. Locks the invite code row, records redemption, and credits the user.';

revoke all on function public.redeem_invite_code(text) from public, anon;
grant execute on function public.redeem_invite_code(text) to authenticated;

commit;
