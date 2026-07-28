-- Subscription tiers, expiring plan credits, and usage metering.
--
-- Implements the 2026-07-28 pricing decisions (memory/DECISIONS.md): two paid
-- tiers (standard/premium) with weekly and monthly Stripe prices, subscription
-- credit grants that RESET at every renewal (no rollover — owner decision),
-- purchased/signup credits that never expire, songs premium-only, and usage
-- counters for Speak seconds / Lens scans / Grok Live minutes.
--
-- Model:
--   profiles.credits       — non-expiring balance (signup grant, invite codes,
--                            admin grants, legacy Stripe credit top-ups). Unchanged.
--   profiles.plan_credits  — the current period's subscription grant. Reset to the
--                            plan amount on each paid invoice, zeroed when the
--                            subscription ends. Spent BEFORE profiles.credits.
--   usage_counters         — per (user, feature, period) numeric counters for
--                            allowance metering (speak_seconds / lens_scans /
--                            live_minutes; period_key computed by the API layer,
--                            'lifetime' for free-tier trials).
--   live_sessions          — one row per Grok Live token mint (the token itself is
--                            capped at 10 minutes, so a mint IS the billable unit).
--
-- Accepted simplification, on purpose: music-job failure refunds
-- (fail_music_only_job) still return credits to the non-expiring balance even if
-- the debit came from plan_credits. That converts at most one job's cost per
-- failure and failures are not user-controllable; revisit if abused.
--
-- The four debit RPCs below are the canonical bodies from their latest migrations
-- (submit_generation: 20260529131000; request_word_retry: 20260502170000;
-- submit_music_only_job: 20260506100000; submit_level_music_only_job:
-- 20260629100000) with surgical patches: total-balance checks, plan-first debit
-- via debit_user_credits(), and the premium gate on both music RPCs.

begin;

-- 1. Expiring plan-credit balance --------------------------------------------

alter table public.profiles
  add column if not exists plan_credits integer not null default 0;

alter table public.profiles
  drop constraint if exists profiles_plan_credits_nonnegative;

alter table public.profiles
  add constraint profiles_plan_credits_nonnegative check (plan_credits >= 0);

comment on column public.profiles.plan_credits is
  'Current-period subscription credit grant. Reset (not added) on each paid invoice, zeroed when the subscription ends, spent before profiles.credits. Never negative.';

-- Recreate the profile guard verbatim (last defined 20260727090000) with one
-- addition: users cannot self-insert a profile carrying plan_credits.
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

-- 2. Plan identity on the subscription row -----------------------------------

alter table public.user_subscriptions
  add column if not exists plan text
    check (plan in ('standard', 'premium'));

alter table public.user_subscriptions
  add column if not exists plan_interval text
    check (plan_interval in ('week', 'month'));

alter table public.user_subscriptions
  add column if not exists current_period_start timestamptz;

-- 3. Ledger provenance for plan grants ----------------------------------------

alter table public.credit_ledger
  drop constraint if exists credit_ledger_event_type_check;

alter table public.credit_ledger
  add constraint credit_ledger_event_type_check check (
    event_type in ('stripe_subscription', 'subscription_grant', 'consumption', 'refund', 'admin_grant')
  );

-- 4. Usage counters ------------------------------------------------------------

create table if not exists public.usage_counters (
  user_id uuid not null references public.profiles(id) on delete cascade,
  feature text not null check (feature in ('speak_seconds', 'lens_scans', 'live_minutes')),
  period_key text not null,
  used numeric not null default 0 check (used >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, feature, period_key)
);

alter table public.usage_counters enable row level security;

drop policy if exists "Users can read own usage counters" on public.usage_counters;
create policy "Users can read own usage counters"
  on public.usage_counters
  for select
  using (user_id = auth.uid());

drop policy if exists "Admins can read usage counters" on public.usage_counters;
create policy "Admins can read usage counters"
  on public.usage_counters
  for select
  using (public.is_admin());

grant select on public.usage_counters to authenticated;

-- Atomic increment with an optional ceiling. p_max null = unconditional record
-- (used after work already happened); p_max set = conditional debit (used for
-- Lens scans and Live minutes, where the increment IS the authorization).
-- A NEGATIVE p_amount (p_max must be null) is a refund/compensation — e.g. a
-- Live token mint that failed after its debit — and floors the counter at 0.
create or replace function public.consume_feature_usage(
  p_user_id uuid,
  p_feature text,
  p_period_key text,
  p_amount numeric,
  p_max numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_used numeric;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_user_id is null
     or p_feature is null
     or nullif(btrim(coalesce(p_period_key, '')), '') is null
     or p_amount is null
     or p_amount = 0
     or (p_amount < 0 and p_max is not null) then
    raise exception 'Invalid usage consumption request' using errcode = '22023';
  end if;

  if p_amount < 0 then
    update public.usage_counters
       set used = greatest(0, used + p_amount),
           updated_at = now()
     where user_id = p_user_id and feature = p_feature and period_key = p_period_key
     returning used into v_used;

    return jsonb_build_object('allowed', true, 'used', coalesce(v_used, 0));
  end if;

  if p_max is not null and p_amount > p_max then
    select used into v_used
      from public.usage_counters
     where user_id = p_user_id and feature = p_feature and period_key = p_period_key;

    return jsonb_build_object('allowed', false, 'used', coalesce(v_used, 0));
  end if;

  insert into public.usage_counters (user_id, feature, period_key, used)
  values (p_user_id, p_feature, p_period_key, p_amount)
  on conflict (user_id, feature, period_key) do update
    set used = public.usage_counters.used + excluded.used,
        updated_at = now()
    where p_max is null
       or public.usage_counters.used + excluded.used <= p_max
  returning used into v_used;

  if v_used is null then
    select used into v_used
      from public.usage_counters
     where user_id = p_user_id and feature = p_feature and period_key = p_period_key;

    return jsonb_build_object('allowed', false, 'used', coalesce(v_used, 0));
  end if;

  return jsonb_build_object('allowed', true, 'used', v_used);
end;
$$;

revoke all on function public.consume_feature_usage(uuid, text, text, numeric, numeric) from public, anon, authenticated;
grant execute on function public.consume_feature_usage(uuid, text, text, numeric, numeric) to service_role;

-- 5. Grok Live session log -----------------------------------------------------

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text,
  model text,
  minutes_debited numeric not null default 10,
  est_cost_usd numeric,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists live_sessions_user_started_idx
  on public.live_sessions(user_id, started_at desc);

alter table public.live_sessions enable row level security;

drop policy if exists "Users can read own live sessions" on public.live_sessions;
create policy "Users can read own live sessions"
  on public.live_sessions
  for select
  using (user_id = auth.uid());

drop policy if exists "Admins can read live sessions" on public.live_sessions;
create policy "Admins can read live sessions"
  on public.live_sessions
  for select
  using (public.is_admin());

grant select on public.live_sessions to authenticated;

-- 6. Shared spend helper (plan credits first, then non-expiring credits) -------
-- Callers hold the profile row lock and have already enabled the privileged-
-- update session flag; this function only encodes the spend order.

create or replace function public.debit_user_credits(
  p_user_id uuid,
  p_amount integer
)
returns boolean
language plpgsql
set search_path = public
as $$
begin
  if p_amount is null or p_amount <= 0 then
    return false;
  end if;

  update public.profiles
     set plan_credits = greatest(0, plan_credits - p_amount),
         credits = credits - greatest(0, p_amount - plan_credits)
   where id = p_user_id
     and (plan_credits + credits) >= p_amount;

  return found;
end;
$$;

revoke all on function public.debit_user_credits(uuid, integer) from public, anon, authenticated;

-- 7. Plan lookup helper --------------------------------------------------------

create or replace function public.has_active_plan(p_user_id uuid)
returns text
language sql
stable
set search_path = public
as $$
  select plan
    from public.user_subscriptions
   where user_id = p_user_id
     and plan is not null
     and status in ('active', 'trialing')
     and (current_period_end is null or current_period_end > now() - interval '3 days')
$$;

revoke all on function public.has_active_plan(uuid) from public, anon, authenticated;

-- 8. submit_generation: total-balance check + plan-first debit -----------------

create or replace function public.submit_generation(
  p_deck_payload jsonb,
  p_word_list text[],
  p_job_payload jsonb,
  p_existing_deck_id uuid default null,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_deck public.decks%rowtype;
  v_deck_id uuid;
  v_job_id uuid;
  v_word_count integer := coalesce(array_length(p_word_list, 1), 0);
  v_credit_cost_per_word integer;
  v_credits_required integer;
  v_word text;
  v_existing_job public.generation_jobs%rowtype;
  v_target_language text;
  v_art_style text;
  v_movie_override text;
  v_settings_override jsonb;
  v_deck_type text := coalesce(nullif(p_deck_payload->>'deck_type', ''), 'video');
  v_card_image_model text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_word_count <= 0 then
    raise exception 'At least one word is required' using errcode = '22023';
  end if;

  foreach v_word in array p_word_list
  loop
    if nullif(btrim(v_word), '') is null then
      raise exception 'Words cannot be blank' using errcode = '22023';
    end if;
  end loop;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0)
    );

    select *
      into v_existing_job
      from public.generation_jobs
     where user_id = v_user_id
       and submit_idempotency_key = p_idempotency_key
     for update;

    if found then
      return jsonb_build_object(
        'success', true,
        'idempotent', true,
        'deck_id', v_existing_job.deck_id,
        'job_id', v_existing_job.id,
        'deck_type', v_existing_job.deck_type,
        'credit_cost_per_word', v_existing_job.credit_cost_per_word,
        'credits_charged', v_existing_job.credits_charged
      );
    end if;
  end if;

  v_target_language := nullif(p_job_payload->>'target_language', '');
  v_art_style := nullif(p_job_payload->>'art_style', '');
  v_movie_override := nullif(p_job_payload->>'movie_override', '');
  v_settings_override := coalesce(p_job_payload->'settings_override', '{}'::jsonb);

  if p_existing_deck_id is not null then
    select *
      into v_deck
      from public.decks
     where id = p_existing_deck_id
       and user_id = v_user_id
     for update;

    if not found then
      raise exception 'Deck not found or not owned by user' using errcode = '42501';
    end if;

    if v_deck.deck_type = 'card_text' then
      raise exception 'Cannot append to image-less deck via submit_generation; use append_imageless_cards'
        using errcode = '42501';
    end if;

    v_deck_id := v_deck.id;
    v_deck_type := coalesce(nullif(v_deck.deck_type, ''), 'video');
    v_target_language := v_deck.target_language;
  else
    if v_deck_type not in ('video', 'card') then
      raise exception 'invalid deck_type: %', v_deck_type using errcode = '22023';
    end if;
  end if;

  if v_target_language is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if v_deck_type not in ('video', 'card') then
    raise exception 'invalid deck_type: %', v_deck_type using errcode = '22023';
  end if;

  if v_deck_type = 'card' then
    v_card_image_model := coalesce(nullif(v_settings_override->>'card_image_model', ''), 'zturbo');

    if v_card_image_model not in ('zturbo', 'gpt_image_2') then
      raise exception 'invalid card_image_model: %', v_card_image_model using errcode = '22023';
    end if;

    v_settings_override := jsonb_set(
      v_settings_override,
      '{card_image_model}',
      to_jsonb(v_card_image_model),
      true
    );
  end if;

  v_credit_cost_per_word := case
    when v_deck_type = 'video' then 10
    when v_card_image_model = 'gpt_image_2' then 5
    else 1
  end;
  v_credits_required := v_word_count * v_credit_cost_per_word;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if (v_profile.credits + v_profile.plan_credits) < v_credits_required then
    return jsonb_build_object(
      'success', false,
      'error', format(
        'Not enough credits. You have %s but need %s.',
        v_profile.credits + v_profile.plan_credits,
        v_credits_required
      ),
      'deck_type', v_deck_type,
      'credit_cost_per_word', v_credit_cost_per_word,
      'credits_charged', v_credits_required
    );
  end if;

  if p_existing_deck_id is null then
    insert into public.decks (
      user_id,
      name,
      target_language,
      art_style,
      movie_override,
      word_count,
      status,
      deck_type
    )
    values (
      v_user_id,
      coalesce(nullif(p_deck_payload->>'name', ''), v_target_language || ' Deck'),
      v_target_language,
      v_art_style,
      v_movie_override,
      v_word_count,
      'generating',
      v_deck_type
    )
    returning * into v_deck;

    v_deck_id := v_deck.id;
  end if;

  insert into public.generation_jobs (
    user_id,
    deck_id,
    status,
    target_language,
    art_style,
    movie_override,
    words_total,
    settings_override,
    submit_idempotency_key,
    credits_charged,
    credit_cost_per_word,
    deck_type
  )
  values (
    v_user_id,
    v_deck_id,
    'pending',
    v_target_language,
    v_art_style,
    v_movie_override,
    v_word_count,
    v_settings_override,
    p_idempotency_key,
    v_credits_required,
    v_credit_cost_per_word,
    v_deck_type
  )
  returning id into v_job_id;

  foreach v_word in array p_word_list
  loop
    insert into public.words (
      deck_id,
      user_id,
      generation_job_id,
      word,
      original_input,
      status,
      current_stage
    )
    values (
      v_deck_id,
      v_user_id,
      v_job_id,
      btrim(v_word),
      btrim(v_word),
      'pending',
      'pre_bootstrap'
    );
  end loop;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.decks
     set status = 'generating',
         word_count = case
           when p_existing_deck_id is null then v_word_count
           else word_count + v_word_count
         end,
         updated_at = now()
   where id = v_deck_id
     and user_id = v_user_id;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  if not public.debit_user_credits(v_user_id, v_credits_required) then
    raise exception 'Unable to debit generation credits' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'deck_id', v_deck_id,
    'job_id', v_job_id,
    'deck_type', v_deck_type,
    'credit_cost_per_word', v_credit_cost_per_word,
    'credits_charged', v_credits_required
  );
end;
$$;

comment on function public.submit_generation(jsonb, text[], jsonb, uuid, text) is
  'Atomic user generation submit: validates ownership and deck-type/card-tier pricing, creates deck/job/owned words, records exact credits charged, and debits plan credits before non-expiring credits. Rejects card_text existing-deck appends.';

-- 9. request_word_retry: total-balance check + plan-first debit ----------------

create or replace function public.request_word_retry(
  p_word_id uuid,
  p_retry_scope text default 'word'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_word public.words%rowtype;
  v_deck public.decks%rowtype;
  v_scope text := coalesce(nullif(p_retry_scope, ''), 'word');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
    into v_word
    from public.words
   where id = p_word_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'Word not found or not owned by user' using errcode = '42501';
  end if;

  select *
    into v_deck
    from public.decks
   where id = v_word.deck_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'Deck not found or not owned by user' using errcode = '42501';
  end if;

  if v_word.retry_requested then
    return jsonb_build_object(
      'success', true,
      'already_requested', true,
      'deck_id', v_word.deck_id,
      'word_id', v_word.id
    );
  end if;

  if v_scope = 'music' then
    if v_word.current_stage not in ('complete', 'post_video_queued') then
      raise exception 'Word is not in a retryable music state' using errcode = '22023';
    end if;
  else
    if v_word.current_stage <> 'failed' then
      raise exception 'Word is not in a retryable failed state' using errcode = '22023';
    end if;
  end if;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if (v_profile.credits + v_profile.plan_credits) < 1 then
    return jsonb_build_object(
      'success', false,
      'error', 'Not enough credits. You need 1 credit to retry.'
    );
  end if;

  -- Music retries requeue a paid Suno call — same premium rule as the song RPCs
  -- (review finding 2026-07-28: this path bypassed the songs-premium gate).
  if v_scope = 'music'
     and coalesce(v_profile.role, 'learner') <> 'admin'
     and coalesce(public.has_active_plan(v_user_id), '') <> 'premium' then
    return jsonb_build_object(
      'success', false,
      'error', 'Music retry requires a Premium subscription.'
    );
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  if v_scope = 'music' then
    update public.words
       set music_state = 'pending',
           suno_task_id = null,
           suno_audio_url = null,
           suno_audio_url_b = null,
           suno_storage_url = null,
           suno_storage_url_b = null,
           failed_stage = null,
           retry_requested = true,
           retry_requested_at = now()
     where id = v_word.id
       and user_id = v_user_id
       and retry_requested = false
       and current_stage in ('complete', 'post_video_queued');
  else
    update public.words
       set retry_requested = true,
           retry_requested_at = now(),
           error_message = null
     where id = v_word.id
       and user_id = v_user_id
       and retry_requested = false
       and current_stage = 'failed';
  end if;

  if not found then
    return jsonb_build_object(
      'success', true,
      'already_requested', true,
      'deck_id', v_word.deck_id,
      'word_id', v_word.id
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  if not public.debit_user_credits(v_user_id, 1) then
    raise exception 'Unable to debit retry credit' using errcode = '40001';
  end if;

  update public.decks
     set status = 'generating',
         updated_at = now()
   where id = v_word.deck_id
     and user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'already_requested', false,
    'deck_id', v_word.deck_id,
    'word_id', v_word.id
  );
end;
$$;

comment on function public.request_word_retry(uuid, text) is
  'Atomic user retry request: validates ownership/state and debits one credit (plan credits first) while setting retry flags.';

-- 10. submit_music_only_job: premium gate + plan-first debit -------------------

create or replace function public.submit_music_only_job(
  p_word_id uuid,
  p_lyric_mode text,
  p_genre text default null,
  p_vocal_gender text default 'female',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_word public.words%rowtype;
  v_existing_job public.music_generation_jobs%rowtype;
  v_job public.music_generation_jobs%rowtype;
  v_lyric_mode text := nullif(btrim(coalesce(p_lyric_mode, '')), '');
  v_genre text := nullif(btrim(coalesce(p_genre, '')), '');
  v_vocal_gender text := nullif(btrim(coalesce(p_vocal_gender, 'female')), '');
  v_cost integer := 10;
  v_request jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0)
    );

    select *
      into v_existing_job
      from public.music_generation_jobs
     where user_id = v_user_id
       and submit_idempotency_key = p_idempotency_key
     for update;

    if found then
      return jsonb_build_object(
        'success', true,
        'idempotent', true,
        'music_job_id', v_existing_job.id,
        'status', v_existing_job.status
      );
    end if;
  end if;

  if v_lyric_mode not in ('reliable', 'contextual', 'creative', 'dramatic') then
    raise exception 'Invalid lyric mode' using errcode = '22023';
  end if;

  if v_genre is not null and lower(v_genre) = 'auto' then
    v_genre := null;
  end if;

  if v_vocal_gender is null then
    v_vocal_gender := 'female';
  end if;

  if v_vocal_gender not in ('male', 'female', 'any') then
    raise exception 'Invalid vocal gender' using errcode = '22023';
  end if;

  select *
    into v_word
    from public.words
   where id = p_word_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'Word not found or not owned by user' using errcode = '42501';
  end if;

  if v_word.current_stage <> 'complete' or v_word.status <> 'complete' then
    raise exception 'Word must be complete before song generation' using errcode = '22023';
  end if;

  if coalesce(v_word.suno_storage_url, v_word.suno_audio_url) is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'already_has_song',
      'word_id', v_word.id
    );
  end if;

  select *
    into v_existing_job
    from public.music_generation_jobs
   where word_id = v_word.id
     and status in ('pending', 'processing', 'submitted', 'polling', 'uploading')
   for update;

  if found then
    return jsonb_build_object(
      'success', false,
      'error', 'active_job_exists',
      'music_job_id', v_existing_job.id,
      'status', v_existing_job.status
    );
  end if;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if coalesce(v_profile.role, 'learner') <> 'admin'
     and coalesce(public.has_active_plan(v_user_id), '') <> 'premium' then
    return jsonb_build_object(
      'success', false,
      'error', 'premium_required'
    );
  end if;

  if (v_profile.credits + v_profile.plan_credits) < v_cost then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'credits_available', v_profile.credits + v_profile.plan_credits,
      'credits_required', v_cost
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  if not public.debit_user_credits(v_user_id, v_cost) then
    raise exception 'Unable to reserve song credits' using errcode = '40001';
  end if;

  v_request := jsonb_build_object(
    'status', 'pending',
    'genre', coalesce(v_genre, 'auto'),
    'lyric_mode', v_lyric_mode,
    'vocal_gender', v_vocal_gender,
    'cost_credits', v_cost,
    'requested_at', now()
  );

  insert into public.music_generation_jobs (
    user_id,
    word_id,
    deck_id,
    status,
    lyric_mode,
    genre,
    vocal_gender,
    submit_idempotency_key,
    credits_reserved,
    credits_charged,
    credits_refunded,
    metadata
  )
  values (
    v_user_id,
    v_word.id,
    v_word.deck_id,
    'pending',
    v_lyric_mode,
    v_genre,
    v_vocal_gender,
    p_idempotency_key,
    v_cost,
    0,
    0,
    jsonb_build_object('request', v_request)
  )
  returning * into v_job;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.words
     set music_state = 'pending',
         metadata = coalesce(metadata, '{}'::jsonb)
           || jsonb_build_object(
             'song_generation',
             v_request || jsonb_build_object('music_job_id', v_job.id)
           )
   where id = v_word.id
     and user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'music_job_id', v_job.id,
    'idempotent', false
  );
end;
$$;

comment on function public.submit_music_only_job(uuid, text, text, text, text) is
  'Create an isolated song-only job for a complete word. Premium-only (admins exempt); debits 10 credits plan-first, idempotently.';

-- 11. submit_level_music_only_job: premium gate + plan-first debit -------------

create or replace function public.submit_level_music_only_job(
  p_category_slug text,
  p_level_number integer,
  p_target_language text,
  p_word_list jsonb,
  p_display_title text,
  p_lyric_mode text default 'reliable',
  p_genre text default null,
  p_vocal_gender text default 'female',
  p_idempotency_key text default null,
  p_deck_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_deck public.decks%rowtype;
  v_existing_job public.music_generation_jobs%rowtype;
  v_job public.music_generation_jobs%rowtype;
  v_category_slug text := nullif(btrim(coalesce(p_category_slug, '')), '');
  v_target_language text := nullif(btrim(coalesce(p_target_language, '')), '');
  v_display_title text := nullif(btrim(coalesce(p_display_title, '')), '');
  v_lyric_mode text := nullif(btrim(coalesce(p_lyric_mode, '')), '');
  v_genre text := nullif(btrim(coalesce(p_genre, '')), '');
  v_vocal_gender text := nullif(btrim(coalesce(p_vocal_gender, 'female')), '');
  v_deck_id uuid := null;
  v_cost integer := 10;
  v_request jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0)
    );

    select *
      into v_existing_job
      from public.music_generation_jobs
     where user_id = v_user_id
       and submit_idempotency_key = p_idempotency_key
     for update;

    if found then
      if p_deck_id is not null and v_existing_job.deck_id is distinct from p_deck_id then
        raise exception 'Deck does not match level song request' using errcode = '22023';
      end if;

      return jsonb_build_object(
        'success', true,
        'idempotent', true,
        'music_job_id', v_existing_job.id,
        'deck_id', v_existing_job.deck_id,
        'status', v_existing_job.status
      );
    end if;
  end if;

  if v_category_slug is null then
    raise exception 'category_slug is required' using errcode = '22023';
  end if;

  if p_level_number is null or p_level_number < 1 then
    raise exception 'level_number is required' using errcode = '22023';
  end if;

  if v_target_language is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if v_display_title is null then
    raise exception 'display_title is required' using errcode = '22023';
  end if;

  if p_word_list is null or jsonb_typeof(p_word_list) <> 'array' then
    raise exception 'word_list must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_word_list) = 0 then
    raise exception 'word_list requires entries' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_word_list) as item(value)
     where nullif(btrim(coalesce(
       item.value->>'target',
       item.value->>'word',
       item.value->>'term',
       ''
     )), '') is null
  ) then
    raise exception 'word_list entries require target terms' using errcode = '22023';
  end if;

  if v_lyric_mode is null then
    v_lyric_mode := 'reliable';
  end if;

  if v_lyric_mode not in ('reliable', 'contextual', 'creative', 'dramatic') then
    raise exception 'Invalid lyric mode' using errcode = '22023';
  end if;

  if v_genre is not null and lower(v_genre) = 'auto' then
    v_genre := null;
  end if;

  if v_vocal_gender is null then
    v_vocal_gender := 'female';
  end if;

  if v_vocal_gender not in ('male', 'female', 'any') then
    raise exception 'Invalid vocal gender' using errcode = '22023';
  end if;

  if p_deck_id is not null then
    select *
      into v_deck
      from public.decks
     where id = p_deck_id
       and user_id = v_user_id;

    if not found then
      raise exception 'Deck not found or not owned by user' using errcode = '42501';
    end if;

    if v_deck.source_kind is distinct from 'curriculum'
       or v_deck.curriculum_category_slug is distinct from v_category_slug
       or v_deck.curriculum_level is distinct from p_level_number
       or v_deck.target_language is distinct from v_target_language then
      raise exception 'Deck does not match level song request' using errcode = '22023';
    end if;

    v_deck_id := v_deck.id;
  end if;

  select *
    into v_existing_job
    from public.music_generation_jobs
   where user_id = v_user_id
     and scope = 'level'
     and category_slug = v_category_slug
     and level_number = p_level_number
     and target_language = v_target_language
     and status in ('pending', 'processing', 'submitted', 'polling', 'uploading')
   for update;

  if found then
    return jsonb_build_object(
      'success', false,
      'error', 'active_job_exists',
      'music_job_id', v_existing_job.id,
      'deck_id', v_existing_job.deck_id,
      'status', v_existing_job.status
    );
  end if;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if coalesce(v_profile.role, 'learner') <> 'admin'
     and coalesce(public.has_active_plan(v_user_id), '') <> 'premium' then
    return jsonb_build_object(
      'success', false,
      'error', 'premium_required'
    );
  end if;

  if (v_profile.credits + v_profile.plan_credits) < v_cost then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'credits_available', v_profile.credits + v_profile.plan_credits,
      'credits_required', v_cost
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  if not public.debit_user_credits(v_user_id, v_cost) then
    raise exception 'Unable to reserve song credits' using errcode = '40001';
  end if;

  v_request := jsonb_build_object(
    'scope', 'level',
    'status', 'pending',
    'deck_id', v_deck_id,
    'category_slug', v_category_slug,
    'level_number', p_level_number,
    'target_language', v_target_language,
    'display_title', v_display_title,
    'genre', coalesce(v_genre, 'auto'),
    'lyric_mode', v_lyric_mode,
    'vocal_gender', v_vocal_gender,
    'cost_credits', v_cost,
    'requested_at', now()
  );

  insert into public.music_generation_jobs (
    user_id,
    scope,
    word_id,
    deck_id,
    category_slug,
    level_number,
    target_language,
    word_list,
    display_title,
    status,
    lyric_mode,
    genre,
    vocal_gender,
    submit_idempotency_key,
    credits_reserved,
    credits_charged,
    credits_refunded,
    metadata
  )
  values (
    v_user_id,
    'level',
    null,
    v_deck_id,
    v_category_slug,
    p_level_number,
    v_target_language,
    p_word_list,
    v_display_title,
    'pending',
    v_lyric_mode,
    v_genre,
    v_vocal_gender,
    p_idempotency_key,
    v_cost,
    0,
    0,
    jsonb_build_object('request', v_request)
  )
  returning * into v_job;

  return jsonb_build_object(
    'success', true,
    'music_job_id', v_job.id,
    'deck_id', v_job.deck_id,
    'idempotent', false,
    'scope', 'level'
  );
end;
$$;

comment on function public.submit_level_music_only_job(text, integer, text, jsonb, text, text, text, text, text, uuid) is
  'Create an isolated level-song job for a static library level and optional validated imported deck. Premium-only (admins exempt); debits 10 credits plan-first, idempotently.';

-- 12. Plan grant from Stripe (replaces the flat credit top-up for new webhooks) -

create or replace function public.record_stripe_plan_grant(
  p_user_id uuid,
  p_plan text,
  p_plan_interval text,
  p_credits integer,
  p_stripe_invoice_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_price_id text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted public.credit_ledger%rowtype;
  v_plan_credits integer;
  v_existing_sub public.user_subscriptions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_user_id is null
     or p_plan not in ('standard', 'premium')
     or p_plan_interval not in ('week', 'month')
     or p_credits is null
     or p_credits <= 0
     or nullif(btrim(coalesce(p_stripe_invoice_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_customer_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_subscription_id, '')), '') is null
     or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Missing plan grant fields' using errcode = '22023';
  end if;

  -- Lock order everywhere: profile first, then subscription (deadlock guard).
  perform 1
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  select * into v_existing_sub
  from public.user_subscriptions
  where user_id = p_user_id
  for update;

  -- Out-of-order webhook guard: a delayed or prorated invoice for an OLDER
  -- period must never reset a newer period's balance or subscription state.
  if found
     and v_existing_sub.current_period_start is not null
     and p_current_period_start is not null
     and p_current_period_start < v_existing_sub.current_period_start then
    return jsonb_build_object(
      'inserted', false,
      'stale_period', true,
      'plan_credits', (select plan_credits from public.profiles where id = p_user_id)
    );
  end if;

  insert into public.credit_ledger (
    user_id,
    amount,
    event_type,
    stripe_invoice_id,
    stripe_subscription_id,
    stripe_customer_id,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    p_credits,
    'subscription_grant',
    p_stripe_invoice_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
      || jsonb_build_object('plan', p_plan, 'plan_interval', p_plan_interval, 'grant_semantics', 'reset')
  )
  on conflict (idempotency_key) do nothing
  returning * into v_inserted;

  if not found then
    select plan_credits into v_plan_credits
    from public.profiles
    where id = p_user_id;

    return jsonb_build_object(
      'inserted', false,
      'idempotent', true,
      'plan_credits', v_plan_credits
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  -- Reset, never accumulate: subscription grants do not roll over.
  update public.profiles
     set plan_credits = p_credits
   where id = p_user_id
   returning plan_credits into v_plan_credits;

  insert into public.user_subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    price_id,
    plan,
    plan_interval,
    current_period_start,
    current_period_end,
    metadata
  )
  values (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    'active',
    p_price_id,
    p_plan,
    p_plan_interval,
    p_current_period_start,
    p_current_period_end,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id) do update
    set stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        status = 'active',
        price_id = coalesce(excluded.price_id, public.user_subscriptions.price_id),
        plan = excluded.plan,
        plan_interval = excluded.plan_interval,
        current_period_start = coalesce(excluded.current_period_start, public.user_subscriptions.current_period_start),
        current_period_end = coalesce(excluded.current_period_end, public.user_subscriptions.current_period_end),
        metadata = public.user_subscriptions.metadata || excluded.metadata,
        updated_at = now();

  return jsonb_build_object(
    'inserted', true,
    'idempotent', false,
    'ledger_id', v_inserted.id,
    'plan', p_plan,
    'plan_credits', v_plan_credits
  );
end;
$$;

revoke all on function public.record_stripe_plan_grant(uuid, text, text, integer, text, text, text, text, timestamptz, timestamptz, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_stripe_plan_grant(uuid, text, text, integer, text, text, text, text, timestamptz, timestamptz, text, jsonb) to service_role;

-- 12b. Tier refund: claw back the plan grant first, then non-expiring credits --
-- (Review finding 2026-07-28: routing tier refunds through the legacy RPC
-- subtracted permanent credits while leaving the refunded plan grant spendable.)

create or replace function public.record_stripe_plan_refund(
  p_user_id uuid,
  p_amount integer,
  p_stripe_charge_id text,
  p_stripe_refund_id text,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_idempotency_key text,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted public.credit_ledger%rowtype;
  v_profile public.profiles%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_user_id is null
     or p_amount is null
     or p_amount <= 0
     or nullif(btrim(coalesce(p_stripe_charge_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_refund_id, '')), '') is null
     or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Missing plan refund fields' using errcode = '22023';
  end if;

  select * into v_profile
  from public.profiles
  where id = p_user_id
  for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  insert into public.credit_ledger (
    user_id,
    amount,
    event_type,
    stripe_invoice_id,
    stripe_charge_id,
    stripe_refund_id,
    stripe_subscription_id,
    stripe_customer_id,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    -abs(p_amount),
    'refund',
    p_stripe_invoice_id,
    p_stripe_charge_id,
    p_stripe_refund_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('refund_target', 'plan_credits_first')
  )
  on conflict (idempotency_key) do nothing
  returning * into v_inserted;

  if not found then
    return jsonb_build_object('inserted', false, 'idempotent', true);
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set plan_credits = greatest(0, plan_credits - p_amount),
         credits = greatest(0, credits - greatest(0, p_amount - plan_credits))
   where id = p_user_id;

  return jsonb_build_object('inserted', true, 'idempotent', false, 'ledger_id', v_inserted.id);
end;
$$;

revoke all on function public.record_stripe_plan_refund(uuid, integer, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_stripe_plan_refund(uuid, integer, text, text, text, text, text, text, jsonb) to service_role;

-- 12c. Checkout status must never downgrade a paid subscription ---------------
-- (Review finding 2026-07-28: a delayed checkout.session.completed overwrote
-- 'active' with 'checkout_completed', making a paid user resolve as free.)
-- Verbatim body from 20260524090000 except the monotonic status expression.

create or replace function public.record_stripe_subscription_checkout(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_price_id text default null,
  p_current_period_end timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_profile_id uuid;
  v_subscription public.user_subscriptions%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_user_id is null
     or nullif(btrim(coalesce(p_stripe_customer_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_subscription_id, '')), '') is null
     or nullif(btrim(coalesce(p_status, '')), '') is null then
    raise exception 'Missing subscription checkout fields' using errcode = '22023';
  end if;

  select id into v_profile_id
  from public.profiles
  where id = p_user_id;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  insert into public.user_subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    price_id,
    current_period_end,
    metadata
  )
  values (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_status,
    p_price_id,
    p_current_period_end,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id) do update
    set stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        status = case
          when public.user_subscriptions.status in ('active', 'trialing')
               and excluded.status = 'checkout_completed'
            then public.user_subscriptions.status
          else excluded.status
        end,
        price_id = coalesce(excluded.price_id, public.user_subscriptions.price_id),
        current_period_end = coalesce(excluded.current_period_end, public.user_subscriptions.current_period_end),
        metadata = public.user_subscriptions.metadata || excluded.metadata,
        updated_at = now()
  returning * into v_subscription;

  return jsonb_build_object(
    'user_id', v_subscription.user_id,
    'stripe_customer_id', v_subscription.stripe_customer_id,
    'stripe_subscription_id', v_subscription.stripe_subscription_id,
    'status', v_subscription.status
  );
end;
$$;

-- 13. Subscription status: terminal states zero the plan grant -----------------

create or replace function public.record_stripe_subscription_status(
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_end timestamptz default null,
  p_metadata jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_subscription public.user_subscriptions%rowtype;
  v_user_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_stripe_subscription_id, '')), '') is null
     or nullif(btrim(coalesce(p_status, '')), '') is null then
    raise exception 'Missing subscription status fields' using errcode = '22023';
  end if;

  select user_id into v_user_id
  from public.user_subscriptions
  where stripe_subscription_id = p_stripe_subscription_id;

  if not found then
    return jsonb_build_object('updated', false);
  end if;

  -- Same lock order as the grant path (profile first, then subscription).
  perform 1
  from public.profiles
  where id = v_user_id
  for update;

  update public.user_subscriptions
     set status = p_status,
         current_period_end = coalesce(p_current_period_end, current_period_end),
         metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
         updated_at = now()
   where stripe_subscription_id = p_stripe_subscription_id
   returning * into v_subscription;

  if not found then
    return jsonb_build_object('updated', false);
  end if;

  if p_status in ('canceled', 'unpaid', 'incomplete_expired') then
    perform set_config('app.allow_profile_privileged_update', 'on', true);

    update public.profiles
       set plan_credits = 0
     where id = v_subscription.user_id;
  end if;

  return jsonb_build_object(
    'updated', true,
    'user_id', v_subscription.user_id,
    'status', v_subscription.status
  );
end;
$$;

notify pgrst, 'reload schema';

commit;
