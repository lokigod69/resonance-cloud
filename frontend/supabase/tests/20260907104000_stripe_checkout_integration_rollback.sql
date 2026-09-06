-- Rollback-only F-04/B-18 database integration checks.

\set ON_ERROR_STOP on
begin;

create temporary table checkout_contract (
  user_id uuid not null,
  reservation_id uuid,
  customer_id text not null,
  expires_at timestamptz not null default clock_timestamp() + interval '23 hours',
  stripe_session_expires_at timestamptz not null default clock_timestamp() + interval '23 hours 50 minutes'
) on commit drop;

insert into checkout_contract (user_id, customer_id)
select p.id, coalesce(s.stripe_customer_id, 'cus_contract_' || replace(p.id::text, '-', ''))
from public.profiles p
left join public.user_subscriptions s on s.user_id = p.id
where s.user_id is null or s.status in ('canceled', 'incomplete_expired')
order by p.created_at asc nulls last, p.id
limit 1;

do $$
begin
  if not exists (select 1 from checkout_contract) then
    raise exception 'Checkout contract requires a profile without a live subscription';
  end if;
end
$$;

grant select, update on checkout_contract to service_role;
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

with first_reservation as (
  select public.reserve_stripe_checkout(user_id, 'standard', 'month', expires_at, stripe_session_expires_at) receipt
  from checkout_contract
)
update checkout_contract c
set reservation_id = (first_reservation.receipt->>'reservation_id')::uuid
from first_reservation;

do $$
declare
  v_ctx checkout_contract%rowtype := (select c from checkout_contract c);
  v_same jsonb;
  v_conflict jsonb;
begin
  v_same := public.reserve_stripe_checkout(v_ctx.user_id, 'standard', 'month', v_ctx.expires_at, v_ctx.stripe_session_expires_at);
  v_conflict := public.reserve_stripe_checkout(v_ctx.user_id, 'premium', 'month', v_ctx.expires_at, v_ctx.stripe_session_expires_at);
  if (v_same->>'reservation_id')::uuid <> v_ctx.reservation_id
     or coalesce((v_same->>'created')::boolean, true) then
    raise exception 'Identical checkout did not reuse reservation: %', v_same;
  end if;
  if v_conflict->>'reason' <> 'checkout_pending' then
    raise exception 'Concurrent different plan was not blocked: %', v_conflict;
  end if;
end
$$;

select public.record_stripe_checkout_reservation(
  user_id,
  reservation_id,
  'open',
  customer_id,
  'cs_contract',
  'https://checkout.stripe.test/cs_contract',
  expires_at
)
from checkout_contract;

do $$
declare
  v_ctx checkout_contract%rowtype := (select c from checkout_contract c);
  v_retry jsonb;
begin
  v_retry := public.reserve_stripe_checkout(v_ctx.user_id, 'standard', 'month', v_ctx.expires_at, v_ctx.stripe_session_expires_at);
  if v_retry->>'stripe_customer_id' <> v_ctx.customer_id
     or v_retry->>'stripe_checkout_session_id' <> 'cs_contract'
     or v_retry->>'checkout_url' <> 'https://checkout.stripe.test/cs_contract' then
    raise exception 'Open Checkout session was not recoverable: %', v_retry;
  end if;
end
$$;

-- One cursor orders checkout, invoice and status mutations together.
do $$
declare
  v_ctx checkout_contract%rowtype := (select c from checkout_contract c);
  v_checkout jsonb;
  v_invoice jsonb;
  v_new_status jsonb;
  v_old_status jsonb;
  v_old_invoice jsonb;
  v_canceled_invoice jsonb;
  v_old_legacy_invoice jsonb;
  v_expired_invoice jsonb;
  v_duplicate_invoice jsonb;
  v_active_refund jsonb;
  v_duplicate_active_refund jsonb;
  v_canceled_refund jsonb;
  v_expired_refund jsonb;
  v_credits_before integer;
  v_plan_before integer;
begin
  v_checkout := public.record_stripe_subscription_checkout_ordered(
    v_ctx.user_id, v_ctx.customer_id, 'sub_contract', 'checkout_completed',
    null, null, '{}'::jsonb, 2000000000
  );
  v_old_status := public.record_stripe_subscription_status(
    'sub_contract', 'past_due', null, null, '{}'::jsonb, 1999999999
  );
  if v_checkout->>'last_event_created' <> '2000000000'
     or v_old_status->>'reason' <> 'stale_event' then
    raise exception 'Checkout/status event ordering failed: checkout %, old %', v_checkout, v_old_status;
  end if;

  v_invoice := public.record_stripe_plan_grant_ordered(
    v_ctx.user_id, 'standard', 'month', 20,
    'in_contract_new', v_ctx.customer_id, 'sub_contract', 'price_contract',
    timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00',
    'stripe:invoice:in_contract_new', '{}'::jsonb, 2000000002
  );
  v_old_status := public.record_stripe_subscription_status(
    'sub_contract', 'canceled', null, null, '{}'::jsonb, 2000000001
  );
  if not coalesce((v_invoice->>'inserted')::boolean, false)
     or v_old_status->>'reason' <> 'stale_event'
     or (select status from public.user_subscriptions where user_id = v_ctx.user_id) <> 'active' then
    raise exception 'Invoice/status event ordering failed: invoice %, old %', v_invoice, v_old_status;
  end if;

  v_new_status := public.record_stripe_subscription_status(
    'sub_contract', 'active',
    timestamptz '2026-10-01 00:00:00+00', timestamptz '2026-11-01 00:00:00+00',
    '{}'::jsonb, 2000000004
  );
  v_old_invoice := public.record_stripe_plan_grant_ordered(
    v_ctx.user_id, 'standard', 'month', 20,
    'in_contract_old', v_ctx.customer_id, 'sub_contract', 'price_contract',
    timestamptz '2026-10-01 00:00:00+00', timestamptz '2026-11-01 00:00:00+00',
    'stripe:invoice:in_contract_old', '{}'::jsonb, 2000000003
  );
  if not coalesce((v_new_status->>'updated')::boolean, false)
     or not coalesce((v_old_invoice->>'inserted')::boolean, false)
     or v_old_invoice->>'allowance_restored' <> 'true'
     or (select status from public.user_subscriptions where user_id = v_ctx.user_id) <> 'active'
     or (select plan_credits from public.profiles where id = v_ctx.user_id) <> 20 then
    raise exception 'Newer active status did not preserve older paid allowance: status %, invoice %',
      v_new_status, v_old_invoice;
  end if;

  v_active_refund := public.record_stripe_plan_refund_ordered(
    v_ctx.user_id, 5, 'ch_contract_active', 're_contract_active',
    'in_contract_old', 'sub_contract', v_ctx.customer_id,
    'stripe:refund:re_contract_active', '{}'::jsonb
  );
  v_duplicate_active_refund := public.record_stripe_plan_refund_ordered(
    v_ctx.user_id, 5, 'ch_contract_active', 're_contract_active',
    'in_contract_old', 'sub_contract', v_ctx.customer_id,
    'stripe:refund:re_contract_active', '{}'::jsonb
  );
  if not coalesce((v_active_refund->>'inserted')::boolean, false)
     or coalesce((v_duplicate_active_refund->>'inserted')::boolean, true)
     or (select plan_credits from public.profiles where id = v_ctx.user_id) <> 15 then
    raise exception 'Active invoice refund did not claw allowance exactly once: first %, duplicate %',
      v_active_refund, v_duplicate_active_refund;
  end if;

  v_new_status := public.record_stripe_subscription_status(
    'sub_contract', 'canceled',
    timestamptz '2026-10-01 00:00:00+00', timestamptz '2026-11-01 00:00:00+00',
    '{}'::jsonb, 2000000006
  );
  v_canceled_invoice := public.record_stripe_plan_grant_ordered(
    v_ctx.user_id, 'standard', 'month', 30,
    'in_contract_canceled', v_ctx.customer_id, 'sub_contract', 'price_contract',
    timestamptz '2026-10-01 00:00:00+00', timestamptz '2026-11-01 00:00:00+00',
    'stripe:invoice:in_contract_canceled', '{}'::jsonb, 2000000005
  );
  select credits into v_credits_before from public.profiles where id = v_ctx.user_id;
  v_old_legacy_invoice := public.record_stripe_subscription_credit_ordered(
    v_ctx.user_id, 20, 'in_contract_legacy_old', v_ctx.customer_id,
    'sub_contract', 'price_contract', 'stripe:invoice:in_contract_legacy_old',
    '{}'::jsonb, 2000000005
  );
  v_duplicate_invoice := public.record_stripe_subscription_credit_ordered(
    v_ctx.user_id, 20, 'in_contract_legacy_old', v_ctx.customer_id,
    'sub_contract', 'price_contract', 'stripe:invoice:in_contract_legacy_old',
    '{}'::jsonb, 2000000005
  );
  v_expired_invoice := public.record_stripe_plan_grant_ordered(
    v_ctx.user_id, 'premium', 'month', 99,
    'in_contract_expired', v_ctx.customer_id, 'sub_contract', 'price_contract',
    timestamptz '2026-09-01 00:00:00+00', timestamptz '2026-10-01 00:00:00+00',
    'stripe:invoice:in_contract_expired', '{}'::jsonb, 2000000004
  );
  select plan_credits into v_plan_before from public.profiles where id = v_ctx.user_id;
  v_canceled_refund := public.record_stripe_plan_refund_ordered(
    v_ctx.user_id, 30, 'ch_contract_canceled', 're_contract_canceled',
    'in_contract_canceled', 'sub_contract', v_ctx.customer_id,
    'stripe:refund:re_contract_canceled', '{}'::jsonb
  );
  v_expired_refund := public.record_stripe_plan_refund_ordered(
    v_ctx.user_id, 99, 'ch_contract_expired', 're_contract_expired',
    'in_contract_expired', 'sub_contract', v_ctx.customer_id,
    'stripe:refund:re_contract_expired', '{}'::jsonb
  );
  if not coalesce((v_new_status->>'updated')::boolean, false)
     or not coalesce((v_old_invoice->>'inserted')::boolean, false)
     or v_old_invoice->>'stale_subscription_event' <> 'true'
     or v_old_invoice->>'stale_period' <> 'false'
     or v_old_invoice->>'allowance_restored' <> 'true'
     or not coalesce((v_canceled_invoice->>'inserted')::boolean, false)
     or v_canceled_invoice->>'allowance_restored' <> 'false'
     or not coalesce((v_old_legacy_invoice->>'inserted')::boolean, false)
     or coalesce((v_duplicate_invoice->>'inserted')::boolean, true)
     or not coalesce((v_expired_invoice->>'inserted')::boolean, false)
     or v_expired_invoice->>'stale_period' <> 'true'
     or v_expired_invoice->>'allowance_restored' <> 'false'
     or not coalesce((v_canceled_refund->>'inserted')::boolean, false)
     or v_canceled_refund->>'allowance_clawed_back' <> 'false'
     or not coalesce((v_expired_refund->>'inserted')::boolean, false)
     or v_expired_refund->>'allowance_clawed_back' <> 'false'
     or (select status from public.user_subscriptions where user_id = v_ctx.user_id) <> 'canceled'
     or (select last_event_created from public.user_subscriptions where user_id = v_ctx.user_id) <> 2000000006
     or (select current_period_start from public.user_subscriptions where user_id = v_ctx.user_id)
          <> timestamptz '2026-10-01 00:00:00+00'
     or (select plan_credits from public.profiles where id = v_ctx.user_id) <> v_plan_before
     or (select credits from public.profiles where id = v_ctx.user_id) <> v_credits_before + 20
     or (select count(*) from public.credit_ledger where idempotency_key in (
       'stripe:invoice:in_contract_old',
       'stripe:invoice:in_contract_canceled',
       'stripe:invoice:in_contract_legacy_old',
       'stripe:invoice:in_contract_expired'
     )) <> 4 then
    raise exception 'Status/invoice financial ordering failed: status %, plan %, canceled %, legacy %, expired %',
      v_new_status, v_old_invoice, v_canceled_invoice, v_old_legacy_invoice, v_expired_invoice;
  end if;

  v_old_status := public.record_stripe_subscription_status(
    'sub_contract_unknown', 'active', null, null, '{}'::jsonb, 2000000004
  );
  if v_old_status->>'reason' <> 'unknown_subscription' then
    raise exception 'Unknown subscription was not made retryable: %', v_old_status;
  end if;
end
$$;

set local role postgres;
do $$
begin
  if has_table_privilege('authenticated', 'public.stripe_checkout_reservations', 'select')
     or has_function_privilege('authenticated', 'public.reserve_stripe_checkout(uuid,text,text,timestamptz,timestamptz)', 'execute')
     or has_function_privilege('authenticated', 'public.record_stripe_subscription_checkout_ordered(uuid,text,text,text,text,timestamptz,jsonb,bigint)', 'execute')
     or has_function_privilege('authenticated', 'public.record_stripe_plan_grant_ordered(uuid,text,text,integer,text,text,text,text,timestamptz,timestamptz,text,jsonb,bigint)', 'execute')
     or has_function_privilege('authenticated', 'public.record_stripe_subscription_credit_ordered(uuid,integer,text,text,text,text,text,jsonb,bigint)', 'execute')
     or has_function_privilege('authenticated', 'public.record_stripe_plan_refund_ordered(uuid,integer,text,text,text,text,text,text,jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.record_stripe_subscription_status(text,text,timestamptz,timestamptz,jsonb,bigint)', 'execute') then
    raise exception 'Checkout reservation internals are exposed to authenticated clients';
  end if;
  if to_regprocedure('public.record_stripe_subscription_status(text,text,timestamptz,jsonb)') is null then
    raise exception 'Schema-first rollout dropped the deployed four-argument status RPC';
  end if;
end
$$;

rollback;
