-- Rollback-only integration checks for reconnect-safe Live reservations.
-- Run after applying 20260907101000_live_session_reservations.sql.

\set ON_ERROR_STOP on

begin;

create temporary table live_reservation_contract (
  user_id uuid not null,
  other_user_id uuid,
  period_key text not null,
  reservation_id uuid,
  first_request_id uuid not null default gen_random_uuid(),
  retry_request_id uuid not null default gen_random_uuid()
) on commit drop;

insert into live_reservation_contract (user_id, other_user_id, period_key)
select p.id,
       (select p2.id from public.profiles p2 where p2.id <> p.id order by p2.id limit 1),
       'contract:live:' || gen_random_uuid()::text
from public.profiles p
where p.role = 'learner'
  and not exists (select 1 from public.live_sessions s where s.user_id = p.id and s.reservation_status = 'active')
order by p.created_at asc nulls last, p.id
limit 1;

do $$
begin
  if not exists (select 1 from live_reservation_contract) then
    raise exception 'Live reservation integration test requires one profile';
  end if;
end
$$;

grant select, update on live_reservation_contract to service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

-- First request debits once and owns a mint claim.
with reserved as (
  select public.reserve_live_session_mint(
    user_id, period_key, 'premium', 10, 60, false, null,
    first_request_id, 4, 15
  ) as receipt
  from live_reservation_contract
)
update live_reservation_contract c
set reservation_id = (reserved.receipt->>'reservation_id')::uuid
from reserved;

-- Simulate a lost HTTP result before the provider call. Once the claim is
-- stale, a retry must reuse the same debit/reservation rather than charge 10.
set local role postgres;
update public.live_sessions
set mint_claim_expires_at = clock_timestamp() - interval '1 second'
where id = (select reservation_id from live_reservation_contract);
set local role service_role;

do $$
declare
  v_ctx live_reservation_contract%rowtype := (select c from live_reservation_contract c);
  v_retry jsonb;
  v_used numeric;
begin
  v_retry := public.reserve_live_session_mint(
    v_ctx.user_id, v_ctx.period_key, 'premium', 10, 60, false,
    v_ctx.reservation_id, v_ctx.retry_request_id, 4, 15
  );
  if (v_retry->>'reservation_id')::uuid <> v_ctx.reservation_id
     or coalesce((v_retry->>'created')::boolean, true)
     or (v_retry->>'minutes_debited')::numeric <> 0 then
    raise exception 'Lost-response retry minted another reservation/debit: %', v_retry;
  end if;

  select used into v_used
    from public.usage_counters
   where user_id = v_ctx.user_id
     and feature = 'live_minutes'
     and period_key = v_ctx.period_key;
  if v_used <> 10 then
    raise exception 'Retry changed usage counter: %', v_used;
  end if;
end
$$;

-- A definitive failure after any number of stale attempts is safe to refund:
-- the matching claim is cleared and no encrypted credential was persisted.
do $$
declare
  v_ctx live_reservation_contract%rowtype := (select c from live_reservation_contract c);
  v_first jsonb;
  v_duplicate jsonb;
  v_used numeric;
begin
  v_first := public.complete_live_session_mint(
    v_ctx.user_id, v_ctx.reservation_id, v_ctx.retry_request_id,
    'definitive_failure', null, null, null
  );
  if not coalesce((v_first->>'accepted')::boolean, false)
     or not coalesce((v_first->>'refunded')::boolean, false) then
    raise exception 'Definitive no-credential failure was not refunded: %', v_first;
  end if;

  v_duplicate := public.complete_live_session_mint(
    v_ctx.user_id, v_ctx.reservation_id, v_ctx.retry_request_id,
    'definitive_failure', null, null, null
  );
  if coalesce((v_duplicate->>'accepted')::boolean, false) then
    raise exception 'Duplicate completion was accepted: %', v_duplicate;
  end if;

  select used into v_used
    from public.usage_counters
   where user_id = v_ctx.user_id
     and feature = 'live_minutes'
     and period_key = v_ctx.period_key;
  if coalesce(v_used, 0) <> 0 then
    raise exception 'Refund was not exact/idempotent: %', v_used;
  end if;
end
$$;

-- Create another debit, abandon it to expiry, and prove maintenance cleanup
-- refunds it without a browser assertion.
update live_reservation_contract
set period_key = 'contract:live-expiry:' || gen_random_uuid()::text,
    reservation_id = null,
    first_request_id = gen_random_uuid();

with reserved as (
  select public.reserve_live_session_mint(
    user_id, period_key, 'premium', 10, 60, false, null,
    first_request_id, 4, 15
  ) as receipt
  from live_reservation_contract
)
update live_reservation_contract c
set reservation_id = (reserved.receipt->>'reservation_id')::uuid
from reserved;

set local role postgres;
update public.live_sessions
set reservation_expires_at = clock_timestamp() - interval '1 second'
where id = (select reservation_id from live_reservation_contract);
set local role service_role;

do $$
declare
  v_cleaned integer;
  v_ctx live_reservation_contract%rowtype := (select c from live_reservation_contract c);
begin
  v_cleaned := public.cleanup_abandoned_live_session_reservations(100);
  if v_cleaned < 1 then
    raise exception 'Expired no-credential reservation was not cleaned';
  end if;
  if coalesce((select used from public.usage_counters
               where user_id = v_ctx.user_id and feature = 'live_minutes'
                 and period_key = v_ctx.period_key), 0) <> 0 then
    raise exception 'Expiry cleanup did not restore allowance';
  end if;
end
$$;

-- A foreign user cannot complete another user's claim.
do $$
declare
  v_ctx live_reservation_contract%rowtype := (select c from live_reservation_contract c);
  v_foreign jsonb;
begin
  if v_ctx.other_user_id is not null then
    v_foreign := public.complete_live_session_mint(
      v_ctx.other_user_id, v_ctx.reservation_id, v_ctx.first_request_id,
      'definitive_failure', null, null, null
    );
    if coalesce((v_foreign->>'accepted')::boolean, false) then
      raise exception 'Foreign completion was accepted';
    end if;
  end if;
end
$$;

set local role postgres;

do $$
begin
  if has_column_privilege('authenticated', 'public.live_sessions', 'client_secret_ciphertext', 'select')
     or has_column_privilege('authenticated', 'public.live_sessions', 'active_mint_request_id', 'select')
     or has_function_privilege('authenticated', 'public.cleanup_abandoned_live_session_reservations(integer)', 'execute') then
    raise exception 'Private Live reservation state is exposed to authenticated clients';
  end if;
end
$$;

rollback;
