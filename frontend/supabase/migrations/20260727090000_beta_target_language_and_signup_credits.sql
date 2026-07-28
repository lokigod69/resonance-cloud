-- Beta onboarding: server-side target language + starter credits at signup.
--
-- Context (2026-07-27): production confirmed that profiles.base_language carries the
-- column default 'English', so the App.tsx onboarding gate (`!profile.base_language`)
-- never fires and new accounts are asked nothing. The rebuilt onboarding gates on a
-- target language instead. It must survive a reinstall / second device, so the chosen
-- target lives on the profile row, not only in localStorage.
--
-- Frontend note: the app reads this column defensively (profile select('*'), write
-- falls back gracefully), so deploy order does not matter — but until this migration
-- is applied, the onboarding gate degrades to per-device localStorage.

begin;

-- 1. The learner's chosen target language, wizard naming ('Bisaya', not 'Cebuano').
--    Nullable on purpose: NULL means "never chose one" and is what fires onboarding.
--    No default — a default here would recreate the exact dead-gate bug this fixes.
alter table public.profiles
  add column if not exists target_language text;

comment on column public.profiles.target_language is
  'Canonical learning-target language chosen in onboarding (wizard naming). NULL = onboarding not completed. Deliberately no default.';

-- 1b. Let users write their own target_language: profile updates are gated by
--     protect_profile_privileged_fields' column allowlist (last defined in
--     20260622090000_daily_habits_new_words_per_day.sql), and a column absent from
--     that array is silently un-writable for authenticated users. Recreated verbatim
--     with target_language added.
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
    'new_words_per_day'
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

-- 2. Starter credits: new accounts begin with 10 credits (one song, or a few image
--    cards) instead of 0, so the generate door is not a guaranteed dead end for a
--    tester without an invite code. Owner decision 2026-07-27 ("free credits for
--    sign up"). Existing accounts are untouched — top up via invite codes.
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
    10,
    now()
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

commit;
