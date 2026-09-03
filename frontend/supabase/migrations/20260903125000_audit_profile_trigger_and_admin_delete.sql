-- Platform hardening audit 2026-09-03, findings B-13 (Low) and B-19 (Low).
--
-- B-13: 20260802090000 recreated protect_profile_privileged_fields() from the
-- 20260727 body and silently dropped the `plan_credits` INSERT guard that
-- 20260728090000 had added (copy-forward regression). Recreate once with BOTH
-- guards and the full safe-column allowlist, so the function is correct
-- regardless of the order the two earlier files were applied in.
--
-- B-19: deleting an admin account trips phase1f_protect_admin_roles: the
-- auth.users → profiles cascade fires sync_admin_role_from_profile(), whose
-- `delete from admin_roles` runs without a PostgREST JWT (auth.role() is null)
-- and without the admin-role flag, so the whole deletion rolls back.
-- sync_admin_role_from_profile is itself only reachable through trusted paths
-- (users cannot change profiles.role), so it may set the flag for its own
-- transaction-local writes.

begin;

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
    'target_language',
    'theme',
    'skin',
    'onboarding_complete',
    'onboarding_completed',
    'onboarding_preferences',
    'updated_at',
    'avatar_path',
    'avatar_updated_at',
    'new_words_per_day',
    'analytics_opt_out'
  ];
  v_blocked_columns text;
  v_is_trusted boolean;
begin
  v_is_trusted :=
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting('app.allow_profile_privileged_update', true), '') = 'on';

  if tg_op = 'INSERT' then
    if not v_is_trusted then
      if new.id is distinct from auth.uid() then
        raise exception 'Users can only insert their own profile'
          using errcode = '42501';
      end if;

      if coalesce(new.role, 'learner') <> 'learner'
         or coalesce(new.credits, 0) <> 0
         or coalesce(new.plan_credits, 0) <> 0 then
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

revoke all on function public.protect_profile_privileged_fields() from public, anon, authenticated;

create or replace function public.sync_admin_role_from_profile()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- Transaction-local: lets phase1f_protect_admin_roles accept the writes this
  -- trigger makes on behalf of a trusted profile change or account deletion.
  perform set_config('app.allow_admin_role_update', 'on', true);

  if tg_op = 'DELETE' then
    delete from public.admin_roles where user_id = old.id;
    return old;
  end if;

  if new.role = 'admin' then
    insert into public.admin_roles (user_id)
    values (new.id)
    on conflict (user_id)
    do update set updated_at = timezone('utc'::text, now());
  else
    delete from public.admin_roles where user_id = new.id;
  end if;

  return new;
end;
$$;

revoke all on function public.sync_admin_role_from_profile() from public, anon, authenticated;

commit;
