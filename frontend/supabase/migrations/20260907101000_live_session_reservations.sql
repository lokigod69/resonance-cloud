-- Reconnect-safe Grok Live billing reservations.
--
-- One active reservation represents one allowance debit and one recoverable
-- xAI client secret. Returning the stored secret makes HTTP retries and normal
-- reconnects idempotent without minting more usable credentials.

begin;

alter table public.live_sessions
  add column if not exists period_key text,
  add column if not exists reservation_expires_at timestamptz,
  add column if not exists reservation_status text,
  add column if not exists mint_attempt_count integer not null default 0,
  add column if not exists active_mint_request_id uuid,
  add column if not exists mint_claim_expires_at timestamptz,
  add column if not exists last_mint_request_id uuid,
  add column if not exists last_mint_outcome text,
  add column if not exists client_secret_ciphertext text,
  add column if not exists client_secret_expires_at timestamptz,
  add column if not exists minutes_refunded numeric not null default 0;

alter table public.live_sessions
  drop constraint if exists live_sessions_reservation_status_check;
alter table public.live_sessions
  add constraint live_sessions_reservation_status_check
  check (reservation_status is null or reservation_status in ('active', 'expired', 'refunded'));

alter table public.live_sessions
  drop constraint if exists live_sessions_reservation_counts_check;
alter table public.live_sessions
  add constraint live_sessions_reservation_counts_check
  check (mint_attempt_count >= 0 and minutes_refunded >= 0);

create unique index if not exists live_sessions_one_active_reservation_per_user
  on public.live_sessions(user_id)
  where reservation_status = 'active';

create index if not exists live_sessions_active_reservation_expiry_idx
  on public.live_sessions(user_id, reservation_expires_at desc)
  where reservation_status = 'active';

-- Existing RLS lets users read their own session history. Keep that behavior
-- while withholding encrypted credentials and internal mint-claim nonces.
revoke select on public.live_sessions from authenticated;
grant select (
  id,
  user_id,
  plan,
  model,
  minutes_debited,
  est_cost_usd,
  started_at,
  ended_at,
  metadata,
  period_key,
  reservation_expires_at,
  reservation_status,
  mint_attempt_count,
  last_mint_outcome,
  client_secret_expires_at,
  minutes_refunded
) on public.live_sessions to authenticated;

-- Refund only while the server can prove that no credential was persisted and
-- no mint claim can still complete. The profile-first lock order matches quota
-- debit, retry, and cleanup callers and prevents refund/debit deadlocks.
create or replace function public.refund_abandoned_live_session_reservation(
  p_user_id uuid,
  p_reservation_id uuid,
  p_reason text,
  p_require_expired boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reservation public.live_sessions%rowtype;
  v_refund jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return false;
  end if;

  select * into v_reservation
    from public.live_sessions
   where id = p_reservation_id
     and user_id = p_user_id
   for update;

  if v_reservation.id is null
     or v_reservation.reservation_status <> 'active'
     or v_reservation.client_secret_ciphertext is not null
     or v_reservation.minutes_refunded > 0
     or (p_require_expired and v_reservation.reservation_expires_at > v_now)
     or (
       not p_require_expired
       and v_reservation.active_mint_request_id is not null
       and v_reservation.mint_claim_expires_at > v_now
     ) then
    return false;
  end if;

  if v_reservation.minutes_debited > 0 then
    v_refund := public.consume_feature_usage(
      p_user_id,
      'live_minutes',
      v_reservation.period_key,
      -v_reservation.minutes_debited,
      null
    );
  end if;

  update public.live_sessions
     set reservation_status = 'refunded',
         minutes_refunded = minutes_debited,
         ended_at = v_now,
         active_mint_request_id = null,
         mint_claim_expires_at = null,
         last_mint_outcome = 'refunded',
         metadata = metadata || jsonb_build_object('refund', left(coalesce(p_reason, 'abandoned_no_credential'), 80))
   where id = p_reservation_id;

  return true;
end;
$$;

create or replace function public.reserve_live_session_mint(
  p_user_id uuid,
  p_period_key text,
  p_plan text,
  p_minutes numeric,
  p_max numeric,
  p_is_admin boolean,
  p_requested_reservation_id uuid,
  p_mint_request_id uuid,
  p_max_mint_attempts integer default 4,
  p_claim_seconds integer default 15
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_now timestamptz := clock_timestamp();
  v_reservation public.live_sessions%rowtype;
  v_debit jsonb;
  v_created boolean := false;
  v_remaining_seconds integer;
  v_expired_id uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_user_id is null
     or nullif(btrim(coalesce(p_period_key, '')), '') is null
     or nullif(btrim(coalesce(p_plan, '')), '') is null
     or p_minutes is null or p_minutes <= 0
     or (not coalesce(p_is_admin, false) and (p_max is null or p_max <= 0))
     or p_mint_request_id is null
     or p_max_mint_attempts < 1 or p_max_mint_attempts > 8
     or p_claim_seconds < 5 or p_claim_seconds > 60 then
    raise exception 'Invalid Live reservation request' using errcode = '22023';
  end if;

  -- The profile row is the per-user mutex. It serializes first mint, retry and
  -- reconnect requests before either allowance or reservation state changes.
  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Unknown user' using errcode = '23503';
  end if;

  -- A reservation that expired without ever storing a credential is safe to
  -- compensate. Even if its provider request returns later, completion is
  -- stale and the route cannot disclose that credential.
  select id into v_expired_id
    from public.live_sessions
   where user_id = p_user_id
     and reservation_status = 'active'
     and reservation_expires_at <= v_now
     and client_secret_ciphertext is null
   limit 1;

  if v_expired_id is not null then
    perform public.refund_abandoned_live_session_reservation(
      p_user_id, v_expired_id, 'expired_no_credential', true
    );
  end if;

  -- A stored secret stops being useful for reconnect authentication at the
  -- provider's expires_at. This says nothing about an already-open socket,
  -- which only the client (or a future trusted proxy) can close early.
  update public.live_sessions
     set reservation_status = 'expired',
         ended_at = coalesce(ended_at, least(reservation_expires_at, coalesce(client_secret_expires_at, reservation_expires_at))),
         active_mint_request_id = null,
         mint_claim_expires_at = null
   where user_id = p_user_id
     and reservation_status = 'active'
     and client_secret_ciphertext is not null
     and (
       reservation_expires_at <= v_now
       or (client_secret_ciphertext is not null and client_secret_expires_at <= v_now)
     );

  -- A requested id is a continuity hint only. It never selects another user's
  -- row; a stale hint falls back to that user's current active reservation.
  if p_requested_reservation_id is not null then
    select * into v_reservation
      from public.live_sessions
     where id = p_requested_reservation_id
       and user_id = p_user_id
       and reservation_status = 'active'
       and reservation_expires_at > v_now;
  end if;

  if v_reservation.id is null then
    select * into v_reservation
      from public.live_sessions
     where user_id = p_user_id
       and reservation_status = 'active'
       and reservation_expires_at > v_now
     order by reservation_expires_at desc
     limit 1;
  end if;

  if v_reservation.id is null then
    if not coalesce(p_is_admin, false) then
      v_debit := public.consume_feature_usage(
        p_user_id,
        'live_minutes',
        p_period_key,
        p_minutes,
        p_max
      );
      if coalesce((v_debit ->> 'allowed')::boolean, false) is not true then
        return jsonb_build_object(
          'allowed', false,
          'reason', 'allowance_exhausted',
          'used', coalesce((v_debit ->> 'used')::numeric, 0)
        );
      end if;
    end if;

    insert into public.live_sessions (
      user_id,
      plan,
      model,
      minutes_debited,
      est_cost_usd,
      period_key,
      reservation_expires_at,
      reservation_status,
      metadata
    ) values (
      p_user_id,
      p_plan,
      'grok-realtime',
      case when coalesce(p_is_admin, false) then 0 else p_minutes end,
      0,
      p_period_key,
      v_now + make_interval(secs => (p_minutes * 60)::double precision),
      'active',
      jsonb_build_object('billing', 'live_reservation', 'is_admin', coalesce(p_is_admin, false))
    ) returning * into v_reservation;
    v_created := true;
  end if;

  v_remaining_seconds := greatest(
    0,
    floor(extract(epoch from (v_reservation.reservation_expires_at - v_now)))::integer
  );

  if v_reservation.client_secret_ciphertext is not null
     and v_reservation.client_secret_expires_at > v_now then
    return jsonb_build_object(
      'allowed', true,
      'reason', null,
      'reservation_id', v_reservation.id,
      'reservation_expires_at', v_reservation.reservation_expires_at,
      'remaining_seconds', least(
        v_remaining_seconds,
        floor(extract(epoch from (v_reservation.client_secret_expires_at - v_now)))::integer
      ),
      'created', false,
      'minutes_debited', 0,
      'reuse_secret', true,
      'client_secret_ciphertext', v_reservation.client_secret_ciphertext,
      'client_secret_expires_at', v_reservation.client_secret_expires_at
    );
  end if;

  if v_remaining_seconds <= 0 then
    return jsonb_build_object('allowed', false, 'reason', 'reservation_expired');
  end if;

  if v_reservation.active_mint_request_id is not null
     and v_reservation.mint_claim_expires_at > v_now then
    return jsonb_build_object(
      'allowed', false,
      'reason', case
        when v_reservation.active_mint_request_id = p_mint_request_id then 'duplicate_request'
        else 'mint_in_progress'
      end,
      'reservation_id', v_reservation.id,
      'reservation_expires_at', v_reservation.reservation_expires_at,
      'retry_after_seconds', greatest(1, ceil(extract(epoch from (v_reservation.mint_claim_expires_at - v_now)))::integer)
    );
  end if;

  if v_reservation.last_mint_request_id = p_mint_request_id then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'duplicate_request',
      'reservation_id', v_reservation.id,
      'reservation_expires_at', v_reservation.reservation_expires_at
    );
  end if;

  if v_reservation.mint_attempt_count >= p_max_mint_attempts then
    return jsonb_build_object(
      'allowed', false,
      'reason', 'mint_limit_reached',
      'reservation_id', v_reservation.id,
      'reservation_expires_at', v_reservation.reservation_expires_at
    );
  end if;

  update public.live_sessions
     set mint_attempt_count = mint_attempt_count + 1,
         active_mint_request_id = p_mint_request_id,
         mint_claim_expires_at = v_now + make_interval(secs => p_claim_seconds),
         last_mint_request_id = p_mint_request_id,
         last_mint_outcome = 'claimed',
         metadata = metadata || jsonb_build_object('last_reused', not v_created)
   where id = v_reservation.id
   returning * into v_reservation;

  return jsonb_build_object(
    'allowed', true,
    'reason', null,
    'reservation_id', v_reservation.id,
    'reservation_expires_at', v_reservation.reservation_expires_at,
    'remaining_seconds', v_remaining_seconds,
    'created', v_created,
    'minutes_debited', case when v_created then v_reservation.minutes_debited else 0 end,
    'reuse_secret', false,
    'mint_attempt_count', v_reservation.mint_attempt_count
  );
end;
$$;

create or replace function public.complete_live_session_mint(
  p_user_id uuid,
  p_reservation_id uuid,
  p_mint_request_id uuid,
  p_outcome text,
  p_client_secret_ciphertext text default null,
  p_client_secret_expires_at timestamptz default null,
  p_est_cost_usd numeric default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_reservation public.live_sessions%rowtype;
  v_refunded boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_user_id is null or p_reservation_id is null or p_mint_request_id is null
     or p_outcome not in ('success', 'definitive_failure')
     or (p_outcome = 'success' and (
       nullif(p_client_secret_ciphertext, '') is null
       or p_client_secret_expires_at is null
       or p_client_secret_expires_at <= clock_timestamp()
     )) then
    raise exception 'Invalid Live mint completion' using errcode = '22023';
  end if;

  -- Resolve identity without locking, then take the same profile-first mutex
  -- used by reservation/debit before locking the reservation itself.
  select * into v_reservation
    from public.live_sessions
   where id = p_reservation_id and user_id = p_user_id;

  if v_reservation.id is null then
    return jsonb_build_object('accepted', false, 'reason', 'stale_claim');
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    return jsonb_build_object('accepted', false, 'reason', 'stale_claim');
  end if;

  select * into v_reservation
    from public.live_sessions
   where id = p_reservation_id and user_id = p_user_id
   for update;

  if v_reservation.id is null
     or v_reservation.reservation_status <> 'active'
     or v_reservation.active_mint_request_id is distinct from p_mint_request_id then
    return jsonb_build_object('accepted', false, 'reason', 'stale_claim');
  end if;

  if p_outcome = 'success' then
    update public.live_sessions
       set active_mint_request_id = null,
           mint_claim_expires_at = null,
           last_mint_outcome = 'success',
           client_secret_ciphertext = p_client_secret_ciphertext,
           client_secret_expires_at = p_client_secret_expires_at,
           reservation_expires_at = least(reservation_expires_at, p_client_secret_expires_at),
           est_cost_usd = greatest(coalesce(est_cost_usd, 0), coalesce(p_est_cost_usd, 0))
     where id = p_reservation_id
     returning * into v_reservation;
  else
    update public.live_sessions
       set mint_attempt_count = greatest(0, mint_attempt_count - 1),
           active_mint_request_id = null,
           mint_claim_expires_at = null,
           last_mint_outcome = 'definitive_failure'
     where id = p_reservation_id
     returning * into v_reservation;

    -- The server never returned or stored a credential on this path. Once the
    -- matching claim is cleared no other valid claim exists, so retry count is
    -- irrelevant: the debit can be compensated exactly once.
    if v_reservation.client_secret_ciphertext is null
       and v_reservation.minutes_debited > 0 then
      v_refunded := public.refund_abandoned_live_session_reservation(
        p_user_id, p_reservation_id, 'server_confirmed_no_credential', false
      );
      select * into v_reservation
        from public.live_sessions
       where id = p_reservation_id;
    end if;
  end if;

  return jsonb_build_object(
    'accepted', true,
    'refunded', v_refunded,
    'reservation_status', v_reservation.reservation_status,
    'mint_attempt_count', v_reservation.mint_attempt_count
  );
end;
$$;

-- Bounded maintenance entry point for a scheduler/ops job. The per-row helper
-- rechecks every predicate under locks, so this candidate scan may race safely.
create or replace function public.cleanup_abandoned_live_session_reservations(
  p_limit integer default 100
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row record;
  v_count integer := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit < 1 or p_limit > 500 then
    raise exception 'Invalid cleanup limit' using errcode = '22023';
  end if;

  for v_row in
    select id, user_id
      from public.live_sessions
     where reservation_status = 'active'
       and reservation_expires_at <= clock_timestamp()
       and client_secret_ciphertext is null
     order by reservation_expires_at asc
     limit p_limit
  loop
    if public.refund_abandoned_live_session_reservation(
      v_row.user_id, v_row.id, 'scheduled_expired_no_credential', true
    ) then
      v_count := v_count + 1;
    end if;
  end loop;

  return v_count;
end;
$$;

revoke all on function public.reserve_live_session_mint(uuid, text, text, numeric, numeric, boolean, uuid, uuid, integer, integer) from public, anon, authenticated;
grant execute on function public.reserve_live_session_mint(uuid, text, text, numeric, numeric, boolean, uuid, uuid, integer, integer) to service_role;

revoke all on function public.complete_live_session_mint(uuid, uuid, uuid, text, text, timestamptz, numeric) from public, anon, authenticated;
grant execute on function public.complete_live_session_mint(uuid, uuid, uuid, text, text, timestamptz, numeric) to service_role;

revoke all on function public.refund_abandoned_live_session_reservation(uuid, uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.cleanup_abandoned_live_session_reservations(integer) from public, anon, authenticated;
grant execute on function public.cleanup_abandoned_live_session_reservations(integer) to service_role;

notify pgrst, 'reload schema';
commit;
