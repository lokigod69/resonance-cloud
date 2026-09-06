-- Rollback-only B-07 integration: exact 5-credit failure refund, retry charge,
-- duplicate failure, and admin overlap.

\set ON_ERROR_STOP on
begin;

create temporary table generation_refund_contract (
  user_id uuid not null,
  admin_id uuid,
  job_id uuid,
  word_id uuid,
  operation_id uuid,
  balance_before integer not null
) on commit drop;

insert into generation_refund_contract (user_id, admin_id, balance_before)
select p.id,
       (select ar.user_id from public.admin_roles ar order by ar.user_id limit 1),
       20
from public.profiles p
where not exists (select 1 from public.admin_roles ar where ar.user_id = p.id)
order by p.created_at asc nulls last, p.id
limit 1;

do $$
begin
  if not exists (select 1 from generation_refund_contract) then
    raise exception 'Generation refund test requires a non-admin profile';
  end if;
end
$$;

select set_config('app.allow_profile_privileged_update', 'on', true);
update public.profiles
set credits = 20, plan_credits = 0
where id = (select user_id from generation_refund_contract);

grant select, update on generation_refund_contract to authenticated, service_role;
select set_config('request.jwt.claim.sub', (select user_id::text from generation_refund_contract), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;

with receipt as (
  select public.submit_generation(
    jsonb_build_object('name', '__refund contract__', 'deck_type', 'card'),
    array['refund-contract-word'],
    jsonb_build_object(
      'target_language', 'English',
      'settings_override', jsonb_build_object('card_image_model', 'gpt_image_2')
    ),
    null,
    'refund-contract-' || gen_random_uuid()::text
  ) value
)
update generation_refund_contract c
set job_id = (receipt.value->>'job_id')::uuid
from receipt;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

update generation_refund_contract c
set word_id = w.id,
    operation_id = w.active_credit_operation_id
from public.words w
where w.generation_job_id = c.job_id;

do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_op public.generation_credit_operations%rowtype;
begin
  select o.* into v_op
    from public.words w
    join public.generation_credit_operations o on o.id = w.active_credit_operation_id
   where w.id = v_ctx.word_id;
  if v_op.credits_charged <> 5
     or v_op.plan_credits_charged <> 0
     or v_op.permanent_credits_charged <> 5
     or v_op.refund_status <> 'charged' then
    raise exception 'Initial 5-credit operation is wrong: %', to_jsonb(v_op);
  end if;
  if (select credits from public.profiles where id = v_ctx.user_id) <> 15 then
    raise exception 'Initial debit was not five credits';
  end if;
end
$$;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;

do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_first jsonb;
  v_duplicate jsonb;
begin
  v_first := public.mark_word_failed_and_refund(v_ctx.word_id, 'images', 'contract', v_ctx.operation_id);
  v_duplicate := public.mark_word_failed_and_refund(v_ctx.word_id, 'images', 'contract duplicate', v_ctx.operation_id);
  if not coalesce((v_first->>'owned')::boolean, false)
     or coalesce((v_duplicate->>'owned')::boolean, false)
     or v_first#>>'{refund,credits_refunded}' <> '5' then
    raise exception 'Atomic failure/refund is not exact/idempotent: first %, duplicate %', v_first, v_duplicate;
  end if;
  if (select credits from public.profiles where id = v_ctx.user_id) <> 20 then
    raise exception 'Five-credit failure refund did not restore balance';
  end if;
end
$$;

-- A retry is a separate one-credit operation and receives only its own refund.
select set_config('request.jwt.claim.sub', (select user_id::text from generation_refund_contract), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
select public.request_word_retry(word_id, 'word') from generation_refund_contract;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_retry_operation_id uuid;
  v_stale jsonb;
  v_unfenced jsonb;
  v_receipt jsonb;
begin
  select active_credit_operation_id into v_retry_operation_id
    from public.words where id = v_ctx.word_id;
  -- The worker normally claims the retry before it can fail again.
  perform public.claim_retry_word(v_ctx.word_id, 'pre_bootstrap', 'pending');
  v_stale := public.mark_word_failed_and_refund(
    v_ctx.word_id, 'images', 'stale original worker', v_ctx.operation_id
  );
  if v_stale->>'reason' <> 'stale_credit_operation'
     or (select current_stage from public.words where id = v_ctx.word_id) = 'failed' then
    raise exception 'Stale worker was allowed to settle a paid retry: %', v_stale;
  end if;

  -- The schema-first compatibility call fails closed for a retry until the
  -- fenced runner is deployed.
  v_unfenced := public.mark_word_failed_and_refund(v_ctx.word_id, 'images', 'old runner');
  if v_unfenced->>'reason' <> 'operation_fence_required' then
    raise exception 'Unfenced old runner did not fail closed: %', v_unfenced;
  end if;

  v_receipt := public.mark_word_failed_and_refund(
    v_ctx.word_id, 'images', 'retry contract', v_retry_operation_id
  );
  if v_receipt#>>'{refund,credits_refunded}' <> '1' then
    raise exception 'Retry refunded the wrong operation amount: %', v_receipt;
  end if;
  if (select credits from public.profiles where id = v_ctx.user_id) <> 20 then
    raise exception 'Retry debit/refund did not net to zero';
  end if;
end
$$;

-- If an admin rejects after worker refunds, outstanding is zero; the original
-- 5-credit charge and 1-credit retry cannot be refunded again.
do $$
begin
  if (select admin_id from generation_refund_contract) is null then
    raise exception 'Generation refund test requires one admin role';
  end if;
end
$$;

select set_config('request.jwt.claim.sub', (select admin_id::text from generation_refund_contract), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_receipt jsonb;
begin
  v_receipt := public.admin_reject_generation_job(v_ctx.job_id, true, 'refund contract');
  if (v_receipt->>'refund_amount')::integer <> 0 then
    raise exception 'Admin rejection duplicated word refunds: %', v_receipt;
  end if;
end
$$;

-- Mixed plan/permanent operation: both buckets return in the same period.
select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
select set_config('app.allow_profile_privileged_update', 'on', true);
update public.profiles
   set credits = 20, plan_credits = 3
 where id = (select user_id from generation_refund_contract);
insert into public.user_subscriptions (
  user_id, stripe_customer_id, stripe_subscription_id, status,
  current_period_start, current_period_end, plan, plan_interval
)
select user_id,
       'cus_refund_' || replace(user_id::text, '-', ''),
       'sub_refund_' || replace(user_id::text, '-', ''),
       'active',
       timestamptz '2026-09-01 00:00:00+00',
       timestamptz '2026-10-01 00:00:00+00',
       'standard', 'month'
from generation_refund_contract
on conflict (user_id) do update
set status = 'active',
    current_period_start = excluded.current_period_start,
    current_period_end = excluded.current_period_end,
    plan = excluded.plan,
    plan_interval = excluded.plan_interval;

select set_config('request.jwt.claim.sub', (select user_id::text from generation_refund_contract), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
with receipt as (
  select public.submit_generation(
    jsonb_build_object('name', '__mixed refund contract__', 'deck_type', 'card'),
    array['mixed-refund-contract-word'],
    jsonb_build_object(
      'target_language', 'English',
      'settings_override', jsonb_build_object('card_image_model', 'gpt_image_2')
    ),
    null,
    'mixed-refund-contract-' || gen_random_uuid()::text
  ) value
)
update generation_refund_contract c
set job_id = (receipt.value->>'job_id')::uuid
from receipt;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
update generation_refund_contract c
set word_id = w.id, operation_id = w.active_credit_operation_id
from public.words w where w.generation_job_id = c.job_id;
do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_op public.generation_credit_operations%rowtype;
  v_receipt jsonb;
begin
  select * into v_op from public.generation_credit_operations where id = v_ctx.operation_id;
  if v_op.plan_credits_charged <> 3 or v_op.permanent_credits_charged <> 2 then
    raise exception 'Mixed charge split is wrong: %', to_jsonb(v_op);
  end if;
  v_receipt := public.mark_word_failed_and_refund(
    v_ctx.word_id, 'images', 'mixed same-period contract', v_ctx.operation_id
  );
  if v_receipt#>>'{refund,plan_credits_restored}' <> '3'
     or v_receipt#>>'{refund,permanent_credits_restored}' <> '2'
     or (select plan_credits from public.profiles where id = v_ctx.user_id) <> 3
     or (select credits from public.profiles where id = v_ctx.user_id) <> 20 then
    raise exception 'Mixed same-period refund is wrong: %', v_receipt;
  end if;
end
$$;

-- Once the subscription period changes, only the permanent portion returns;
-- expired plan credits stay expired and remain accounted in the receipt.
select set_config('app.allow_profile_privileged_update', 'on', true);
update public.profiles
   set credits = 20, plan_credits = 2
 where id = (select user_id from generation_refund_contract);
update public.user_subscriptions
   set status = 'active',
       current_period_start = timestamptz '2026-09-01 00:00:00+00',
       current_period_end = timestamptz '2026-10-01 00:00:00+00'
 where user_id = (select user_id from generation_refund_contract);

select set_config('request.jwt.claim.sub', (select user_id::text from generation_refund_contract), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
with receipt as (
  select public.submit_generation(
    jsonb_build_object('name', '__expired plan refund contract__', 'deck_type', 'card'),
    array['expired-plan-refund-contract-word'],
    jsonb_build_object(
      'target_language', 'English',
      'settings_override', jsonb_build_object('card_image_model', 'gpt_image_2')
    ),
    null,
    'expired-plan-refund-contract-' || gen_random_uuid()::text
  ) value
)
update generation_refund_contract c
set job_id = (receipt.value->>'job_id')::uuid
from receipt;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
update generation_refund_contract c
set word_id = w.id, operation_id = w.active_credit_operation_id
from public.words w where w.generation_job_id = c.job_id;
select set_config('app.allow_profile_privileged_update', 'on', true);
update public.profiles
   set plan_credits = 7
 where id = (select user_id from generation_refund_contract);
update public.user_subscriptions
   set current_period_start = timestamptz '2026-10-01 00:00:00+00',
       current_period_end = timestamptz '2026-11-01 00:00:00+00'
 where user_id = (select user_id from generation_refund_contract);
do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_receipt jsonb;
begin
  v_receipt := public.mark_word_failed_and_refund(
    v_ctx.word_id, 'images', 'expired plan contract', v_ctx.operation_id
  );
  if v_receipt#>>'{refund,plan_credits_restored}' <> '0'
     or v_receipt#>>'{refund,permanent_credits_restored}' <> '3'
     or v_receipt#>>'{refund,plan_credits_expired}' <> '2'
     or (select plan_credits from public.profiles where id = v_ctx.user_id) <> 7
     or (select credits from public.profiles where id = v_ctx.user_id) <> 20 then
    raise exception 'Expired-period refund is wrong: %', v_receipt;
  end if;
end
$$;

-- Admin-before-worker: admin refunds the outstanding operation; a later
-- fenced worker may mark terminal state but cannot refund the charge twice.
select set_config('app.allow_profile_privileged_update', 'on', true);
update public.profiles
   set credits = 20, plan_credits = 0
 where id = (select user_id from generation_refund_contract);
update public.user_subscriptions
   set status = 'canceled'
 where user_id = (select user_id from generation_refund_contract);
select set_config('request.jwt.claim.sub', (select user_id::text from generation_refund_contract), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
with receipt as (
  select public.submit_generation(
    jsonb_build_object('name', '__admin first refund contract__', 'deck_type', 'card'),
    array['admin-first-refund-contract-word'],
    jsonb_build_object(
      'target_language', 'English',
      'settings_override', jsonb_build_object('card_image_model', 'gpt_image_2')
    ),
    null,
    'admin-first-refund-contract-' || gen_random_uuid()::text
  ) value
)
update generation_refund_contract c
set job_id = (receipt.value->>'job_id')::uuid
from receipt;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
update generation_refund_contract c
set word_id = w.id, operation_id = w.active_credit_operation_id
from public.words w where w.generation_job_id = c.job_id;

select set_config('request.jwt.claim.sub', (select admin_id::text from generation_refund_contract), true);
select set_config('request.jwt.claim.role', 'authenticated', true);
set local role authenticated;
do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_receipt jsonb;
begin
  v_receipt := public.admin_reject_generation_job(v_ctx.job_id, true, 'admin first contract');
  if v_receipt->>'refund_amount' <> '5'
     or (select credits from public.profiles where id = v_ctx.user_id) <> 20 then
    raise exception 'Admin-first refund is wrong: %', v_receipt;
  end if;
end
$$;

select set_config('request.jwt.claim.role', 'service_role', true);
set local role service_role;
do $$
declare
  v_ctx generation_refund_contract%rowtype := (select c from generation_refund_contract c);
  v_receipt jsonb;
begin
  v_receipt := public.mark_word_failed_and_refund(
    v_ctx.word_id, 'images', 'late worker after admin', v_ctx.operation_id
  );
  if v_receipt#>>'{refund,refunded}' <> 'false'
     or (select credits from public.profiles where id = v_ctx.user_id) <> 20 then
    raise exception 'Worker duplicated admin-first refund: %', v_receipt;
  end if;
end
$$;

set local role postgres;
do $$
begin
  if has_table_privilege('authenticated', 'public.generation_credit_operations', 'select')
     or has_function_privilege('authenticated', 'public.mark_word_failed_and_refund(uuid,text,text,uuid)', 'execute')
     or not has_function_privilege('service_role', 'public.mark_word_failed_and_refund(uuid,text,text,uuid)', 'execute') then
    raise exception 'Generation refund internals have incorrect ACLs';
  end if;
end
$$;
rollback;
