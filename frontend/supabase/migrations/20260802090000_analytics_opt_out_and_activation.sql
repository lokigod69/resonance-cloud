-- Analytics OS instrumentation (handoff 2026-08-02): per-user analytics opt-out
-- and the activation gate ("first learning_action ever, once per user").
--
-- Frontend/api read these defensively: until this migration is applied the
-- opt-out lookup fails and the server emitter suppresses events (privacy-safe),
-- and the activation RPC failure simply means no activation event. Apply before
-- flipping AOS_ANALYTICS_ENABLED / VITE_AOS_ANALYTICS_ENABLED.

begin;

-- 1. Per-user opt-out (Legal OS requirement, built ahead of the verdict).
--    Default false = analytics allowed once the master switch is on.
alter table public.profiles
  add column if not exists analytics_opt_out boolean not null default false;

comment on column public.profiles.analytics_opt_out is
  'When true, ALL portfolio analytics emits for this user are suppressed at source (client and server).';

-- 2. Activation truth: set once, the first time any learning_action lands.
--    Deliberately privileged (NOT in the safe-update allowlist) — only the
--    RPC below or the service role may write it.
alter table public.profiles
  add column if not exists activated_at timestamptz;

comment on column public.profiles.activated_at is
  'When the user completed their first learning action (guided step, study rep, speak turn, lens scan, song, game round). Set once by record_learning_action_activation; the analytics "activation" event fires iff this transition happens.';

-- 2b. Let users write their own analytics_opt_out: profile updates are gated by
--     protect_profile_privileged_fields' column allowlist (last defined in
--     20260727090000_beta_target_language_and_signup_credits.sql), and a column
--     absent from that array is silently un-writable for authenticated users.
--     Recreated verbatim with analytics_opt_out added (activated_at is
--     deliberately NOT added — it stays RPC/service-role-only).
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

revoke all on function public.protect_profile_privileged_fields() from public, anon, authenticated;

-- 3. The activation gate. Returns {first: bool, activated_at: timestamptz}.
--    'first' is true exactly once per user, ever — the caller emits the
--    portfolio 'activation' event iff first. Callable by the user for
--    client-side learning actions (no argument / own id) and by the service
--    role for server-side ones (explicit p_user_id).
create or replace function public.record_learning_action_activation(p_user_id uuid default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := coalesce(p_user_id, auth.uid());
  v_activated_at timestamptz;
begin
  if v_user is null then
    raise exception 'No user for activation' using errcode = '42501';
  end if;

  if p_user_id is not null
     and auth.uid() is not null
     and p_user_id <> auth.uid() then
    raise exception 'Users can only record their own activation'
      using errcode = '42501';
  end if;

  -- activated_at is not in the safe-update allowlist; authorize this one
  -- statement for the trigger (transaction-local, like the Stripe RPCs).
  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set activated_at = now()
   where id = v_user
     and activated_at is null
   returning activated_at into v_activated_at;

  if found then
    return jsonb_build_object('first', true, 'activated_at', v_activated_at);
  end if;

  select activated_at into v_activated_at
  from public.profiles
  where id = v_user;

  return jsonb_build_object('first', false, 'activated_at', v_activated_at);
end;
$$;

revoke all on function public.record_learning_action_activation(uuid) from public, anon;
grant execute on function public.record_learning_action_activation(uuid) to authenticated, service_role;

commit;
