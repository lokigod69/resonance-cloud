-- One pending Stripe Checkout per user plus ordered subscription status events.

begin;

create table if not exists public.stripe_billing_customers (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text unique,
  customer_request_key uuid not null default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

insert into public.stripe_billing_customers (user_id, stripe_customer_id)
select user_id, stripe_customer_id
from public.user_subscriptions
where stripe_customer_id is not null
on conflict (user_id) do update
set stripe_customer_id = coalesce(
  public.stripe_billing_customers.stripe_customer_id,
  excluded.stripe_customer_id
);

alter table public.stripe_billing_customers enable row level security;
revoke all on public.stripe_billing_customers from public, anon, authenticated;

create table if not exists public.stripe_checkout_reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan text not null check (plan in ('standard', 'premium')),
  plan_interval text not null check (plan_interval in ('week', 'month')),
  status text not null default 'reserved' check (
    status in ('reserved', 'open', 'completed', 'expired')
  ),
  stripe_customer_id text,
  stripe_checkout_session_id text,
  checkout_url text,
  expires_at timestamptz not null,
  stripe_session_expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz,
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists stripe_checkout_one_pending_per_user
  on public.stripe_checkout_reservations(user_id)
  where status in ('reserved', 'open');
create unique index if not exists stripe_checkout_session_unique
  on public.stripe_checkout_reservations(stripe_checkout_session_id)
  where stripe_checkout_session_id is not null;
create index if not exists stripe_checkout_expiry_idx
  on public.stripe_checkout_reservations(expires_at)
  where status in ('reserved', 'open');

alter table public.stripe_checkout_reservations enable row level security;
revoke all on public.stripe_checkout_reservations from public, anon, authenticated;
grant select on public.stripe_checkout_reservations to service_role;

create or replace function public.reserve_stripe_checkout(
  p_user_id uuid,
  p_plan text,
  p_plan_interval text,
  p_expires_at timestamptz,
  p_stripe_session_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.stripe_checkout_reservations%rowtype;
  v_created public.stripe_checkout_reservations%rowtype;
  v_subscription_status text;
  v_billing_customer public.stripe_billing_customers%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_user_id is null
     or p_plan is null or p_plan not in ('standard', 'premium')
     or p_plan_interval is null or p_plan_interval not in ('week', 'month')
     or p_expires_at is null
     or p_expires_at < clock_timestamp() + interval '25 minutes'
     or p_expires_at > clock_timestamp() + interval '25 hours' then
    raise exception 'Invalid checkout reservation' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if p_stripe_session_expires_at is null
     or p_stripe_session_expires_at <= p_expires_at
     or p_stripe_session_expires_at > clock_timestamp() + interval '24 hours' then
    raise exception 'Invalid Stripe session expiry' using errcode = '22023';
  end if;

  insert into public.stripe_billing_customers (user_id)
  values (p_user_id)
  on conflict (user_id) do nothing;
  select * into v_billing_customer
    from public.stripe_billing_customers
   where user_id = p_user_id
   for update;

  select status into v_subscription_status
    from public.user_subscriptions
   where user_id = p_user_id;
  if v_subscription_status is not null
     and v_subscription_status not in ('canceled', 'incomplete_expired') then
    return jsonb_build_object('allowed', false, 'reason', 'already_subscribed');
  end if;

  update public.stripe_checkout_reservations
     set status = 'expired', updated_at = clock_timestamp()
   where user_id = p_user_id
     and status in ('reserved', 'open')
     and expires_at <= clock_timestamp();

  select * into v_existing
    from public.stripe_checkout_reservations
   where user_id = p_user_id
     and status in ('reserved', 'open')
     and expires_at > clock_timestamp()
   limit 1
   for update;

  if v_existing.id is not null then
    if v_existing.plan <> p_plan or v_existing.plan_interval <> p_plan_interval then
      return jsonb_build_object(
        'allowed', false,
        'reason', 'checkout_pending',
        'reservation_id', v_existing.id,
        'plan', v_existing.plan,
        'plan_interval', v_existing.plan_interval,
        'expires_at', v_existing.expires_at
      );
    end if;
    return jsonb_build_object(
      'allowed', true,
      'created', false,
      'reservation_id', v_existing.id,
      'plan', v_existing.plan,
      'plan_interval', v_existing.plan_interval,
      'status', v_existing.status,
      'stripe_customer_id', v_existing.stripe_customer_id,
      'billing_customer_id', v_billing_customer.stripe_customer_id,
      'customer_request_key', v_billing_customer.customer_request_key,
      'stripe_checkout_session_id', v_existing.stripe_checkout_session_id,
      'checkout_url', v_existing.checkout_url,
      'expires_at', v_existing.expires_at,
      'stripe_session_expires_at', v_existing.stripe_session_expires_at
    );
  end if;

  insert into public.stripe_checkout_reservations (
    user_id, plan, plan_interval, expires_at, stripe_session_expires_at
  ) values (
    p_user_id, p_plan, p_plan_interval, p_expires_at, p_stripe_session_expires_at
  ) returning * into v_created;

  return jsonb_build_object(
    'allowed', true,
    'created', true,
    'reservation_id', v_created.id,
    'plan', v_created.plan,
    'plan_interval', v_created.plan_interval,
    'status', v_created.status,
    'billing_customer_id', v_billing_customer.stripe_customer_id,
    'customer_request_key', v_billing_customer.customer_request_key,
    'expires_at', v_created.expires_at,
    'stripe_session_expires_at', v_created.stripe_session_expires_at
  );
end;
$$;

create or replace function public.record_stripe_checkout_reservation(
  p_user_id uuid,
  p_reservation_id uuid,
  p_status text,
  p_stripe_customer_id text default null,
  p_stripe_checkout_session_id text default null,
  p_checkout_url text default null,
  p_expires_at timestamptz default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.stripe_checkout_reservations%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_user_id is null or p_reservation_id is null
     or p_status not in ('reserved', 'open', 'completed', 'expired') then
    raise exception 'Invalid checkout reservation update' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  select * into v_row
    from public.stripe_checkout_reservations
   where id = p_reservation_id and user_id = p_user_id
   for update;
  if v_row.id is null then
    return jsonb_build_object('updated', false, 'reason', 'not_found');
  end if;

  if p_stripe_customer_id is not null then
    insert into public.stripe_billing_customers (user_id, stripe_customer_id)
    values (p_user_id, p_stripe_customer_id)
    on conflict (user_id) do nothing;
    if exists (
      select 1 from public.stripe_billing_customers
       where user_id = p_user_id
         and stripe_customer_id is not null
         and stripe_customer_id <> p_stripe_customer_id
    ) then
      raise exception 'Stripe customer mismatch' using errcode = '23505';
    end if;
    update public.stripe_billing_customers
       set stripe_customer_id = p_stripe_customer_id,
           updated_at = clock_timestamp()
     where user_id = p_user_id;
  end if;

  update public.stripe_checkout_reservations
     set status = case
           when status = 'completed' then 'completed'
           else p_status
         end,
         stripe_customer_id = coalesce(p_stripe_customer_id, stripe_customer_id),
         stripe_checkout_session_id = coalesce(p_stripe_checkout_session_id, stripe_checkout_session_id),
         checkout_url = case when p_status in ('completed', 'expired') then null else coalesce(p_checkout_url, checkout_url) end,
         expires_at = coalesce(p_expires_at, expires_at),
         completed_at = case when p_status = 'completed' then coalesce(completed_at, clock_timestamp()) else completed_at end,
         updated_at = clock_timestamp()
   where id = p_reservation_id
   returning * into v_row;

  return jsonb_build_object('updated', true, 'status', v_row.status);
end;
$$;

create or replace function public.rotate_deleted_stripe_customer(
  p_user_id uuid,
  p_deleted_customer_id text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_key uuid;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  perform 1 from public.profiles where id = p_user_id for update;
  update public.stripe_billing_customers
     set stripe_customer_id = null,
         customer_request_key = gen_random_uuid(),
         updated_at = clock_timestamp()
   where user_id = p_user_id
     and stripe_customer_id = p_deleted_customer_id
   returning customer_request_key into v_key;
  if v_key is null then
    select customer_request_key into v_key
      from public.stripe_billing_customers
     where user_id = p_user_id;
  end if;
  return v_key;
end;
$$;

alter table public.user_subscriptions
  add column if not exists last_event_created bigint;

-- Stripe can deliver checkout, invoice and subscription events out of order.
-- Each ordered wrapper holds the same profile/subscription locks as the
-- underlying mutation. Older checkout/status deliveries cannot overwrite
-- newer state; older paid invoices still land once without changing newer
-- subscription fields. The deployed un-ordered functions remain intact for
-- schema-first rollout compatibility.
create or replace function public.record_stripe_subscription_checkout_ordered(
  p_user_id uuid,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_status text,
  p_price_id text,
  p_current_period_end timestamptz,
  p_metadata jsonb,
  p_event_created bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.user_subscriptions%rowtype;
  v_result jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'Missing Stripe event timestamp' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  select * into v_existing
    from public.user_subscriptions
   where user_id = p_user_id
   for update;
  if v_existing.user_id is not null
     and v_existing.last_event_created is not null
     and p_event_created < v_existing.last_event_created then
    return jsonb_build_object(
      'updated', false,
      'reason', 'stale_event',
      'last_event_created', v_existing.last_event_created
    );
  end if;

  v_result := public.record_stripe_subscription_checkout(
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    p_status,
    p_price_id,
    p_current_period_end,
    coalesce(p_metadata, '{}'::jsonb)
  );
  update public.user_subscriptions
     set last_event_created = greatest(coalesce(last_event_created, p_event_created), p_event_created)
   where user_id = p_user_id;
  return coalesce(v_result, '{}'::jsonb) || jsonb_build_object('last_event_created', p_event_created);
end;
$$;

create or replace function public.record_stripe_plan_grant_ordered(
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
  p_metadata jsonb,
  p_event_created bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.user_subscriptions%rowtype;
  v_result jsonb;
  v_inserted public.credit_ledger%rowtype;
  v_plan_credits integer;
  v_stale_event boolean := false;
  v_expired_period boolean := false;
  v_allowance_restore boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'Missing Stripe event timestamp' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  select * into v_existing
    from public.user_subscriptions
   where user_id = p_user_id
   for update;
  v_stale_event := v_existing.user_id is not null
    and v_existing.last_event_created is not null
    and p_event_created < v_existing.last_event_created;

  if not v_stale_event then
    v_result := public.record_stripe_plan_grant(
      p_user_id,
      p_plan,
      p_plan_interval,
      p_credits,
      p_stripe_invoice_id,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_price_id,
      p_current_period_start,
      p_current_period_end,
      p_idempotency_key,
      coalesce(p_metadata, '{}'::jsonb)
    );
    update public.user_subscriptions
       set last_event_created = greatest(coalesce(last_event_created, p_event_created), p_event_created)
     where user_id = p_user_id;
    return coalesce(v_result, '{}'::jsonb) || jsonb_build_object('last_event_created', p_event_created);
  end if;

  -- A newer status delivery must keep its subscription fields, but an older
  -- paid invoice is still a real financial event and lands exactly once.
  -- Spendable plan allowance returns only for the same period while the newer
  -- subscription state remains eligible; canceled or expired state wins.
  if p_plan not in ('standard', 'premium')
     or p_plan_interval not in ('week', 'month')
     or p_credits is null or p_credits <= 0
     or nullif(btrim(coalesce(p_stripe_invoice_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_customer_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_subscription_id, '')), '') is null
     or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Missing plan grant fields' using errcode = '22023';
  end if;
  v_expired_period := v_existing.current_period_start is not null
    and p_current_period_start is not null
    and p_current_period_start < v_existing.current_period_start;
  v_allowance_restore := not v_expired_period
    and v_existing.status in ('active', 'trialing');

  insert into public.credit_ledger (
    user_id, amount, event_type, stripe_invoice_id, stripe_subscription_id,
    stripe_customer_id, idempotency_key, metadata
  ) values (
    p_user_id, p_credits, 'subscription_grant', p_stripe_invoice_id,
    p_stripe_subscription_id, p_stripe_customer_id, p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'plan', p_plan,
      'plan_interval', p_plan_interval,
      'grant_semantics', 'reset',
      'subscription_state_preserved', true,
      'allowance_restored', v_allowance_restore,
      'expired_period', v_expired_period
    )
  ) on conflict (idempotency_key) do nothing
  returning * into v_inserted;

  if v_inserted.id is null then
    select plan_credits into v_plan_credits from public.profiles where id = p_user_id;
    return jsonb_build_object(
      'inserted', false,
      'idempotent', true,
      'stale_subscription_event', true,
      'stale_period', v_expired_period,
      'allowance_restored', false,
      'plan_credits', v_plan_credits,
      'last_event_created', v_existing.last_event_created
    );
  end if;
  if v_allowance_restore then
    perform set_config('app.allow_profile_privileged_update', 'on', true);
    update public.profiles set plan_credits = p_credits
     where id = p_user_id returning plan_credits into v_plan_credits;
  else
    select plan_credits into v_plan_credits from public.profiles where id = p_user_id;
  end if;
  return jsonb_build_object(
    'inserted', true,
    'idempotent', false,
    'ledger_id', v_inserted.id,
    'stale_subscription_event', true,
    'stale_period', v_expired_period,
    'allowance_restored', v_allowance_restore,
    'plan_credits', v_plan_credits,
    'last_event_created', v_existing.last_event_created
  );
end;
$$;

create or replace function public.record_stripe_subscription_credit_ordered(
  p_user_id uuid,
  p_amount integer,
  p_stripe_invoice_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_price_id text,
  p_idempotency_key text,
  p_metadata jsonb,
  p_event_created bigint
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_existing public.user_subscriptions%rowtype;
  v_result jsonb;
  v_inserted public.credit_ledger%rowtype;
  v_balance integer;
  v_stale_event boolean := false;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_event_created is null or p_event_created <= 0 then
    raise exception 'Missing Stripe event timestamp' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  select * into v_existing
    from public.user_subscriptions
   where user_id = p_user_id
   for update;
  v_stale_event := v_existing.user_id is not null
    and v_existing.last_event_created is not null
    and p_event_created < v_existing.last_event_created;

  if not v_stale_event then
    v_result := public.record_stripe_subscription_credit(
      p_user_id,
      p_amount,
      p_stripe_invoice_id,
      p_stripe_customer_id,
      p_stripe_subscription_id,
      p_price_id,
      p_idempotency_key,
      coalesce(p_metadata, '{}'::jsonb)
    );
    update public.user_subscriptions
       set last_event_created = greatest(coalesce(last_event_created, p_event_created), p_event_created)
     where user_id = p_user_id;
    return coalesce(v_result, '{}'::jsonb) || jsonb_build_object('last_event_created', p_event_created);
  end if;

  -- Legacy subscription credits are permanent purchased value. A newer
  -- status event may preserve subscription state, but must not erase payment.
  if p_amount is null or p_amount <= 0
     or nullif(btrim(coalesce(p_stripe_invoice_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_customer_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_subscription_id, '')), '') is null
     or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Missing subscription credit fields' using errcode = '22023';
  end if;
  insert into public.credit_ledger (
    user_id, amount, event_type, stripe_invoice_id, stripe_subscription_id,
    stripe_customer_id, idempotency_key, metadata
  ) values (
    p_user_id, p_amount, 'stripe_subscription', p_stripe_invoice_id,
    p_stripe_subscription_id, p_stripe_customer_id, p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object('subscription_state_preserved', true)
  ) on conflict (idempotency_key) do nothing
  returning * into v_inserted;
  if v_inserted.id is null then
    select credits into v_balance from public.profiles where id = p_user_id;
    return jsonb_build_object(
      'inserted', false,
      'idempotent', true,
      'stale_subscription_event', true,
      'balance', v_balance,
      'last_event_created', v_existing.last_event_created
    );
  end if;
  perform set_config('app.allow_profile_privileged_update', 'on', true);
  update public.profiles set credits = credits + p_amount
   where id = p_user_id returning credits into v_balance;
  return jsonb_build_object(
    'inserted', true,
    'idempotent', false,
    'ledger_id', v_inserted.id,
    'stale_subscription_event', true,
    'balance', v_balance,
    'last_event_created', v_existing.last_event_created
  );
end;
$$;

create or replace function public.record_stripe_plan_refund_ordered(
  p_user_id uuid,
  p_amount integer,
  p_stripe_charge_id text,
  p_stripe_refund_id text,
  p_stripe_invoice_id text,
  p_stripe_subscription_id text,
  p_stripe_customer_id text,
  p_idempotency_key text,
  p_metadata jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_grant_metadata jsonb;
  v_allowance_restored boolean := true;
  v_inserted public.credit_ledger%rowtype;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;
  if p_user_id is null
     or p_amount is null or p_amount <= 0
     or nullif(btrim(coalesce(p_stripe_charge_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_refund_id, '')), '') is null
     or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Missing plan refund fields' using errcode = '22023';
  end if;

  perform 1 from public.profiles where id = p_user_id for update;
  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;
  select metadata into v_grant_metadata
    from public.credit_ledger
   where user_id = p_user_id
     and stripe_invoice_id = p_stripe_invoice_id
     and event_type = 'subscription_grant'
   order by created_at desc, id desc
   limit 1;
  if v_grant_metadata ? 'allowance_restored' then
    v_allowance_restored := coalesce((v_grant_metadata->>'allowance_restored')::boolean, true);
  end if;

  if v_allowance_restored then
    return public.record_stripe_plan_refund(
      p_user_id,
      p_amount,
      p_stripe_charge_id,
      p_stripe_refund_id,
      p_stripe_invoice_id,
      p_stripe_subscription_id,
      p_stripe_customer_id,
      p_idempotency_key,
      coalesce(p_metadata, '{}'::jsonb)
    );
  end if;

  -- The paid invoice was accounted but never made allowance spendable because
  -- a newer canceled/expired subscription state won. Record the monetary
  -- refund once without clawing unrelated current balances.
  insert into public.credit_ledger (
    user_id, amount, event_type, stripe_invoice_id, stripe_charge_id,
    stripe_refund_id, stripe_subscription_id, stripe_customer_id,
    idempotency_key, metadata
  ) values (
    p_user_id, -abs(p_amount), 'refund', p_stripe_invoice_id,
    p_stripe_charge_id, p_stripe_refund_id, p_stripe_subscription_id,
    p_stripe_customer_id, p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb) || jsonb_build_object(
      'refund_target', 'financial_only_no_allowance',
      'allowance_restored', false
    )
  ) on conflict (idempotency_key) do nothing
  returning * into v_inserted;
  if v_inserted.id is null then
    return jsonb_build_object('inserted', false, 'idempotent', true, 'allowance_clawed_back', false);
  end if;
  return jsonb_build_object(
    'inserted', true,
    'idempotent', false,
    'ledger_id', v_inserted.id,
    'allowance_clawed_back', false
  );
end;
$$;

-- Keep the deployed four-argument function callable during schema-first
-- rollout. The ordered six-argument overload is selected only by new code.
create or replace function public.record_stripe_subscription_status(
  p_stripe_subscription_id text,
  p_status text,
  p_current_period_start timestamptz,
  p_current_period_end timestamptz,
  p_metadata jsonb,
  p_event_created bigint
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
     or nullif(btrim(coalesce(p_status, '')), '') is null
     or p_event_created is null or p_event_created <= 0 then
    raise exception 'Missing subscription status fields' using errcode = '22023';
  end if;

  select user_id into v_user_id
    from public.user_subscriptions
   where stripe_subscription_id = p_stripe_subscription_id;
  if not found then
    return jsonb_build_object('updated', false, 'reason', 'unknown_subscription');
  end if;

  perform 1 from public.profiles where id = v_user_id for update;
  select * into v_subscription
    from public.user_subscriptions
   where stripe_subscription_id = p_stripe_subscription_id
   for update;
  if v_subscription.user_id is null then
    return jsonb_build_object('updated', false, 'reason', 'unknown_subscription');
  end if;
  if v_subscription.last_event_created is not null
     and p_event_created < v_subscription.last_event_created then
    return jsonb_build_object(
      'updated', false,
      'reason', 'stale_event',
      'last_event_created', v_subscription.last_event_created
    );
  end if;

  update public.user_subscriptions
     set status = p_status,
         current_period_start = coalesce(p_current_period_start, current_period_start),
         current_period_end = coalesce(p_current_period_end, current_period_end),
         metadata = metadata || coalesce(p_metadata, '{}'::jsonb),
         last_event_created = p_event_created,
         updated_at = now()
   where user_id = v_subscription.user_id
   returning * into v_subscription;

  if p_status in ('canceled', 'unpaid', 'incomplete_expired') then
    perform set_config('app.allow_profile_privileged_update', 'on', true);
    update public.profiles set plan_credits = 0 where id = v_subscription.user_id;
  end if;

  return jsonb_build_object(
    'updated', true,
    'user_id', v_subscription.user_id,
    'status', v_subscription.status,
    'last_event_created', v_subscription.last_event_created
  );
end;
$$;

revoke all on function public.reserve_stripe_checkout(uuid, text, text, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function public.reserve_stripe_checkout(uuid, text, text, timestamptz, timestamptz) to service_role;
revoke all on function public.record_stripe_checkout_reservation(uuid, uuid, text, text, text, text, timestamptz) from public, anon, authenticated;
grant execute on function public.record_stripe_checkout_reservation(uuid, uuid, text, text, text, text, timestamptz) to service_role;
revoke all on function public.rotate_deleted_stripe_customer(uuid, text) from public, anon, authenticated;
grant execute on function public.rotate_deleted_stripe_customer(uuid, text) to service_role;
revoke all on function public.record_stripe_subscription_checkout_ordered(uuid, text, text, text, text, timestamptz, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.record_stripe_subscription_checkout_ordered(uuid, text, text, text, text, timestamptz, jsonb, bigint) to service_role;
revoke all on function public.record_stripe_plan_grant_ordered(uuid, text, text, integer, text, text, text, text, timestamptz, timestamptz, text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.record_stripe_plan_grant_ordered(uuid, text, text, integer, text, text, text, text, timestamptz, timestamptz, text, jsonb, bigint) to service_role;
revoke all on function public.record_stripe_subscription_credit_ordered(uuid, integer, text, text, text, text, text, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.record_stripe_subscription_credit_ordered(uuid, integer, text, text, text, text, text, jsonb, bigint) to service_role;
revoke all on function public.record_stripe_plan_refund_ordered(uuid, integer, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
grant execute on function public.record_stripe_plan_refund_ordered(uuid, integer, text, text, text, text, text, text, jsonb) to service_role;
revoke all on function public.record_stripe_subscription_status(text, text, timestamptz, timestamptz, jsonb, bigint) from public, anon, authenticated;
grant execute on function public.record_stripe_subscription_status(text, text, timestamptz, timestamptz, jsonb, bigint) to service_role;

notify pgrst, 'reload schema';

commit;
