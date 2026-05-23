-- Phase 1 Stripe subscription billing shell.
--
-- Adds immutable Stripe-facing credit ledger rows and subscription state while
-- preserving the existing profiles.credits balance contract used by generation,
-- retry, and music RPCs.

begin;

create table if not exists public.credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  event_type text not null check (
    event_type in ('stripe_subscription', 'consumption', 'refund', 'admin_grant')
  ),
  stripe_invoice_id text,
  stripe_charge_id text,
  stripe_refund_id text,
  stripe_subscription_id text,
  stripe_customer_id text,
  idempotency_key text not null unique,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists credit_ledger_user_created_idx
  on public.credit_ledger(user_id, created_at desc);

create index if not exists credit_ledger_invoice_idx
  on public.credit_ledger(stripe_invoice_id)
  where stripe_invoice_id is not null;

create index if not exists credit_ledger_charge_idx
  on public.credit_ledger(stripe_charge_id)
  where stripe_charge_id is not null;

alter table public.credit_ledger enable row level security;

drop policy if exists "Users can read own credit ledger" on public.credit_ledger;
create policy "Users can read own credit ledger"
  on public.credit_ledger
  for select
  using (user_id = auth.uid());

drop policy if exists "Admins can read credit ledger" on public.credit_ledger;
create policy "Admins can read credit ledger"
  on public.credit_ledger
  for select
  using (public.is_admin());

grant select on public.credit_ledger to authenticated;

create table if not exists public.user_subscriptions (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  stripe_customer_id text not null,
  stripe_subscription_id text not null unique,
  status text not null,
  price_id text,
  current_period_end timestamptz,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists user_subscriptions_customer_idx
  on public.user_subscriptions(stripe_customer_id);

alter table public.user_subscriptions enable row level security;

drop policy if exists "Users can read own subscription" on public.user_subscriptions;
create policy "Users can read own subscription"
  on public.user_subscriptions
  for select
  using (user_id = auth.uid());

drop policy if exists "Admins can read subscriptions" on public.user_subscriptions;
create policy "Admins can read subscriptions"
  on public.user_subscriptions
  for select
  using (public.is_admin());

grant select on public.user_subscriptions to authenticated;

create or replace function public.get_user_balance(p_user_id uuid)
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(sum(amount), 0)::integer
  from public.credit_ledger
  where user_id = p_user_id
    and (p_user_id = auth.uid() or public.is_admin() or coalesce(auth.role(), '') = 'service_role');
$$;

revoke all on function public.get_user_balance(uuid) from public, anon;
grant execute on function public.get_user_balance(uuid) to authenticated, service_role;

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
        status = excluded.status,
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

create or replace function public.record_stripe_subscription_credit(
  p_user_id uuid,
  p_amount integer,
  p_stripe_invoice_id text,
  p_stripe_customer_id text,
  p_stripe_subscription_id text,
  p_price_id text,
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
  v_balance integer;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if p_user_id is null
     or p_amount is null
     or p_amount <= 0
     or nullif(btrim(coalesce(p_stripe_invoice_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_customer_id, '')), '') is null
     or nullif(btrim(coalesce(p_stripe_subscription_id, '')), '') is null
     or nullif(btrim(coalesce(p_idempotency_key, '')), '') is null then
    raise exception 'Missing subscription credit fields' using errcode = '22023';
  end if;

  perform 1
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
    stripe_subscription_id,
    stripe_customer_id,
    idempotency_key,
    metadata
  )
  values (
    p_user_id,
    p_amount,
    'stripe_subscription',
    p_stripe_invoice_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning * into v_inserted;

  if not found then
    select credits into v_balance
    from public.profiles
    where id = p_user_id;

    return jsonb_build_object(
      'inserted', false,
      'idempotent', true,
      'balance', v_balance
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set credits = credits + p_amount
   where id = p_user_id
   returning credits into v_balance;

  insert into public.user_subscriptions (
    user_id,
    stripe_customer_id,
    stripe_subscription_id,
    status,
    price_id,
    metadata
  )
  values (
    p_user_id,
    p_stripe_customer_id,
    p_stripe_subscription_id,
    'active',
    p_price_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (user_id) do update
    set stripe_customer_id = excluded.stripe_customer_id,
        stripe_subscription_id = excluded.stripe_subscription_id,
        status = 'active',
        price_id = coalesce(excluded.price_id, public.user_subscriptions.price_id),
        metadata = public.user_subscriptions.metadata || excluded.metadata,
        updated_at = now();

  return jsonb_build_object(
    'inserted', true,
    'idempotent', false,
    'ledger_id', v_inserted.id,
    'amount', v_inserted.amount,
    'balance', v_balance
  );
end;
$$;

create or replace function public.record_stripe_refund_credit(
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
  v_balance integer;
  v_refund_amount integer := -abs(p_amount);
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
    raise exception 'Missing refund credit fields' using errcode = '22023';
  end if;

  perform 1
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
    v_refund_amount,
    'refund',
    p_stripe_invoice_id,
    p_stripe_charge_id,
    p_stripe_refund_id,
    p_stripe_subscription_id,
    p_stripe_customer_id,
    p_idempotency_key,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning * into v_inserted;

  if not found then
    select credits into v_balance
    from public.profiles
    where id = p_user_id;

    return jsonb_build_object(
      'inserted', false,
      'idempotent', true,
      'balance', v_balance
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set credits = greatest(0, credits + v_refund_amount)
   where id = p_user_id
   returning credits into v_balance;

  return jsonb_build_object(
    'inserted', true,
    'idempotent', false,
    'ledger_id', v_inserted.id,
    'amount', v_inserted.amount,
    'balance', v_balance
  );
end;
$$;

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
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_stripe_subscription_id, '')), '') is null
     or nullif(btrim(coalesce(p_status, '')), '') is null then
    raise exception 'Missing subscription status fields' using errcode = '22023';
  end if;

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

  return jsonb_build_object(
    'updated', true,
    'user_id', v_subscription.user_id,
    'status', v_subscription.status
  );
end;
$$;

revoke all on function public.record_stripe_subscription_checkout(uuid, text, text, text, text, timestamptz, jsonb) from public, anon, authenticated;
revoke all on function public.record_stripe_subscription_credit(uuid, integer, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_stripe_refund_credit(uuid, integer, text, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.record_stripe_subscription_status(text, text, timestamptz, jsonb) from public, anon, authenticated;

grant execute on function public.record_stripe_subscription_checkout(uuid, text, text, text, text, timestamptz, jsonb) to service_role;
grant execute on function public.record_stripe_subscription_credit(uuid, integer, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.record_stripe_refund_credit(uuid, integer, text, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.record_stripe_subscription_status(text, text, timestamptz, jsonb) to service_role;

notify pgrst, 'reload schema';

commit;
