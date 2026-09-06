-- Exact, idempotent generation credit refunds (audit B-07).
--
-- Future initial-word and retry debits are represented by one immutable charge
-- operation carrying the amount and the plan/permanent source split. Terminal
-- failure and admin rejection consume the outstanding operation balance once.

begin;

alter table public.generation_jobs
  add column if not exists plan_credits_charged integer,
  add column if not exists permanent_credits_charged integer,
  add column if not exists plan_credit_period_key text,
  add column if not exists credit_accounting_version text;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_credit_bucket_sum_check;
alter table public.generation_jobs
  add constraint generation_jobs_credit_bucket_sum_check check (
    credit_accounting_version is null
    or credit_accounting_version = 'legacy_ambiguous_v1'
    or (
      plan_credits_charged is not null
      and permanent_credits_charged is not null
      and plan_credits_charged >= 0
      and permanent_credits_charged >= 0
      and plan_credits_charged + permanent_credits_charged = credits_charged
    )
  );

create table if not exists public.generation_credit_operations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  generation_job_id uuid references public.generation_jobs(id) on delete set null,
  word_id uuid,
  operation_kind text not null check (
    operation_kind in ('initial_word', 'word_retry', 'music_retry', 'legacy_job_balance')
  ),
  credits_charged integer not null check (credits_charged > 0),
  plan_credits_charged integer,
  permanent_credits_charged integer,
  plan_period_key text,
  accounting_source text not null check (
    accounting_source in ('bucket_v1', 'legacy_permanent_v1', 'legacy_ambiguous_v1')
  ),
  automatic_refund_eligible boolean not null default true,
  refund_status text not null default 'charged' check (
    refund_status in ('charged', 'refunded', 'legacy_ambiguous')
  ),
  credits_refunded integer not null default 0 check (credits_refunded >= 0),
  plan_credits_refunded integer not null default 0 check (plan_credits_refunded >= 0),
  permanent_credits_refunded integer not null default 0 check (permanent_credits_refunded >= 0),
  plan_credits_restored integer not null default 0 check (plan_credits_restored >= 0),
  permanent_credits_restored integer not null default 0 check (permanent_credits_restored >= 0),
  charged_at timestamptz not null default now(),
  refunded_at timestamptz,
  refund_reason text,
  metadata jsonb not null default '{}'::jsonb,
  constraint generation_credit_operation_bucket_sum check (
    accounting_source = 'legacy_ambiguous_v1'
    or (
      plan_credits_charged is not null
      and permanent_credits_charged is not null
      and plan_credits_charged + permanent_credits_charged = credits_charged
    )
  ),
  constraint generation_credit_operation_refund_sum check (
    credits_refunded = plan_credits_refunded + permanent_credits_refunded
    and credits_refunded <= credits_charged
  )
);

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.generation_credit_operations'::regclass
      and conname = 'generation_credit_operations_word_id_fkey'
  ) then
    alter table public.generation_credit_operations
      add constraint generation_credit_operations_word_id_fkey
      foreign key (word_id)
      references public.words(id)
      on delete set null
      deferrable initially deferred;
  end if;
end
$$;

create index if not exists generation_credit_operations_job_idx
  on public.generation_credit_operations(generation_job_id, refund_status);
create index if not exists generation_credit_operations_word_idx
  on public.generation_credit_operations(word_id, charged_at desc);

alter table public.generation_credit_operations enable row level security;
revoke all on public.generation_credit_operations from public, anon, authenticated;

alter table public.words
  add column if not exists active_credit_operation_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.words'::regclass
      and conname = 'words_active_credit_operation_id_fkey'
  ) then
    alter table public.words
      add constraint words_active_credit_operation_id_fkey
      foreign key (active_credit_operation_id)
      references public.generation_credit_operations(id)
      on delete set null;
  end if;
end
$$;

create index if not exists words_active_credit_operation_idx
  on public.words(active_credit_operation_id)
  where active_credit_operation_id is not null;

-- New generation jobs are inserted before debit while submit_generation holds
-- the profile row lock. Capture the split from that same pre-debit profile.
create or replace function public.capture_generation_job_credit_buckets()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_balance integer := 0;
begin
  if coalesce(new.credits_charged, 0) <= 0 then
    new.plan_credits_charged := 0;
    new.permanent_credits_charged := 0;
    new.plan_credit_period_key := null;
    new.credit_accounting_version := 'bucket_v1';
    return new;
  end if;

  select greatest(coalesce(plan_credits, 0), 0)
    into v_plan_balance
    from public.profiles
   where id = new.user_id;

  new.plan_credits_charged := least(v_plan_balance, new.credits_charged);
  new.permanent_credits_charged := new.credits_charged - new.plan_credits_charged;
  select 'sub:' || current_period_start::text
    into new.plan_credit_period_key
    from public.user_subscriptions
   where user_id = new.user_id
     and status in ('active', 'trialing')
     and current_period_start is not null
   limit 1;
  new.credit_accounting_version := 'bucket_v1';
  return new;
end;
$$;

drop trigger if exists capture_generation_job_credit_buckets on public.generation_jobs;
create trigger capture_generation_job_credit_buckets
before insert on public.generation_jobs
for each row execute function public.capture_generation_job_credit_buckets();

-- Allocate each initial word's cost from the captured job buckets in insertion
-- order. The surrounding submit transaction rolls this back if debit fails.
create or replace function public.capture_initial_word_credit_operation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.generation_jobs%rowtype;
  v_plan_already integer;
  v_plan_amount integer;
  v_amount integer;
  v_operation_id uuid;
begin
  if new.generation_job_id is null then
    return new;
  end if;

  select * into v_job
    from public.generation_jobs
   where id = new.generation_job_id;

  if v_job.id is null
     or v_job.credit_accounting_version <> 'bucket_v1'
     or coalesce(v_job.credit_cost_per_word, 0) <= 0 then
    return new;
  end if;

  select coalesce(sum(plan_credits_charged), 0)
    into v_plan_already
    from public.generation_credit_operations
   where generation_job_id = v_job.id;

  v_amount := least(
    v_job.credit_cost_per_word,
    greatest(0, v_job.credits_charged - coalesce((
      select sum(credits_charged)
      from public.generation_credit_operations
      where generation_job_id = v_job.id
    ), 0))
  );
  if v_amount <= 0 then
    return new;
  end if;

  v_plan_amount := least(v_amount, greatest(0, v_job.plan_credits_charged - v_plan_already));
  insert into public.generation_credit_operations (
    user_id, generation_job_id, word_id, operation_kind, credits_charged,
    plan_credits_charged, permanent_credits_charged, plan_period_key,
    accounting_source
  ) values (
    new.user_id, v_job.id, new.id, 'initial_word', v_amount,
    v_plan_amount, v_amount - v_plan_amount, v_job.plan_credit_period_key,
    'bucket_v1'
  ) returning id into v_operation_id;

  new.active_credit_operation_id := v_operation_id;
  return new;
end;
$$;

drop trigger if exists capture_initial_word_credit_operation on public.words;
create trigger capture_initial_word_credit_operation
before insert on public.words
for each row execute function public.capture_initial_word_credit_operation();

-- Paid retries set retry_requested in the same transaction immediately before
-- debit. Capture that operation from the already-locked pre-debit profile.
create or replace function public.capture_retry_credit_operation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_plan_balance integer := 0;
  v_period_key text;
  v_operation_id uuid;
  v_kind text;
begin
  if coalesce(old.retry_requested, false)
     or not coalesce(new.retry_requested, false) then
    return new;
  end if;

  select greatest(coalesce(plan_credits, 0), 0)
    into v_plan_balance
    from public.profiles
   where id = new.user_id;
  select 'sub:' || current_period_start::text
    into v_period_key
    from public.user_subscriptions
   where user_id = new.user_id
     and status in ('active', 'trialing')
     and current_period_start is not null
   limit 1;

  v_kind := case
    when new.music_state = 'pending' and old.music_state is distinct from new.music_state
      then 'music_retry'
    else 'word_retry'
  end;

  insert into public.generation_credit_operations (
    user_id, generation_job_id, word_id, operation_kind, credits_charged,
    plan_credits_charged, permanent_credits_charged, plan_period_key,
    accounting_source
  ) values (
    new.user_id, new.generation_job_id, new.id, v_kind, 1,
    least(v_plan_balance, 1), 1 - least(v_plan_balance, 1), v_period_key,
    'bucket_v1'
  ) returning id into v_operation_id;

  new.active_credit_operation_id := v_operation_id;
  return new;
end;
$$;

drop trigger if exists capture_retry_credit_operation on public.words;
create trigger capture_retry_credit_operation
before update of retry_requested on public.words
for each row execute function public.capture_retry_credit_operation();

-- The operation pointer is worker-owned even though the historical word guard
-- predates this column.
create or replace function public.protect_word_credit_operation_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.active_credit_operation_id is distinct from old.active_credit_operation_id
     and not public.phase1e_is_trusted_mutation() then
    raise exception 'Direct updates to word credit operation are not allowed'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists protect_word_credit_operation_id on public.words;
create trigger protect_word_credit_operation_id
before update on public.words
for each row execute function public.protect_word_credit_operation_id();

-- Historical bucket provenance does not exist. Pre-plan jobs are provably
-- permanent-credit charges; later jobs are explicitly ambiguous. A word that
-- is already failed is always ambiguous because the old out-of-transaction
-- refund may already have landed.
select set_config('app.allow_phase1e_pipeline_update', 'on', true);

update public.generation_jobs
set plan_credits_charged = case when created_at < timestamptz '2026-07-28 00:00:00+00' then 0 else null end,
    permanent_credits_charged = case when created_at < timestamptz '2026-07-28 00:00:00+00' then credits_charged else null end,
    plan_credit_period_key = null,
    credit_accounting_version = case
      when created_at < timestamptz '2026-07-28 00:00:00+00' then 'legacy_permanent_v1'
      else 'legacy_ambiguous_v1'
    end
where credit_accounting_version is null;

with ranked as (
  select w.id as word_id,
         w.user_id,
         w.generation_job_id,
         w.current_stage,
         w.retry_requested_at,
         j.credit_cost_per_word,
         j.credits_charged,
         j.admin_refund_amount,
         j.credit_accounting_version,
         row_number() over (partition by j.id order by w.created_at, w.id) as ordinal
  from public.words w
  join public.generation_jobs j on j.id = w.generation_job_id
), inserted as (
  insert into public.generation_credit_operations (
    user_id, generation_job_id, word_id, operation_kind, credits_charged,
    plan_credits_charged, permanent_credits_charged, plan_period_key,
    accounting_source, automatic_refund_eligible, refund_status, metadata
  )
  select user_id,
         generation_job_id,
         word_id,
         'initial_word',
         least(credit_cost_per_word, greatest(0, credits_charged - ((ordinal - 1) * credit_cost_per_word)))::integer,
         case when credit_accounting_version = 'legacy_permanent_v1' then 0 else null end,
         case when credit_accounting_version = 'legacy_permanent_v1'
           then least(credit_cost_per_word, greatest(0, credits_charged - ((ordinal - 1) * credit_cost_per_word)))::integer
           else null end,
         null,
         credit_accounting_version,
         credit_accounting_version = 'legacy_permanent_v1'
           and current_stage <> 'failed'
           and retry_requested_at is null
           and coalesce(admin_refund_amount, 0) = 0,
         case
           when credit_accounting_version = 'legacy_permanent_v1'
             and current_stage <> 'failed'
             and retry_requested_at is null
             and coalesce(admin_refund_amount, 0) = 0 then 'charged'
           else 'legacy_ambiguous'
         end,
         jsonb_build_object('backfilled', true, 'reason', case
           when coalesce(admin_refund_amount, 0) > 0 then 'prior_admin_refund_recorded'
           when current_stage = 'failed' then 'prior_refund_unknown'
           when retry_requested_at is not null then 'prior_retry_refund_unknown'
           else 'source_bucket_unknown'
         end)
  from ranked
  where least(credit_cost_per_word, greatest(0, credits_charged - ((ordinal - 1) * credit_cost_per_word))) > 0
    and not exists (
      select 1 from public.generation_credit_operations o where o.word_id = ranked.word_id
    )
  returning id, word_id
)
update public.words w
set active_credit_operation_id = inserted.id
from inserted
where w.id = inserted.word_id;

insert into public.generation_credit_operations (
  user_id, generation_job_id, operation_kind, credits_charged,
  accounting_source, automatic_refund_eligible, refund_status, metadata
)
select j.user_id,
       j.id,
       'legacy_job_balance',
       j.credits_charged - coalesce(sum(o.credits_charged), 0),
       'legacy_ambiguous_v1',
       false,
       'legacy_ambiguous',
       jsonb_build_object('backfilled', true, 'reason', 'unmatched_job_balance')
from public.generation_jobs j
left join public.generation_credit_operations o on o.generation_job_id = j.id
group by j.id
having j.credits_charged - coalesce(sum(o.credits_charged), 0) > 0;

-- Restore one operation at most once. Plan credits return only to the same
-- still-current subscription period; an expired plan grant remains expired.
create or replace function public.refund_generation_credit_operation(
  p_operation_id uuid,
  p_reason text,
  p_allow_ambiguous boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_operation public.generation_credit_operations%rowtype;
  v_current_period text;
  v_plan_restore integer := 0;
  v_permanent_restore integer := 0;
begin
  select * into v_operation
    from public.generation_credit_operations
   where id = p_operation_id;
  if v_operation.id is null then
    return jsonb_build_object('refunded', false, 'reason', 'operation_not_found');
  end if;

  perform 1 from public.profiles where id = v_operation.user_id for update;
  if not found then
    return jsonb_build_object('refunded', false, 'reason', 'profile_not_found');
  end if;

  select * into v_operation
    from public.generation_credit_operations
   where id = p_operation_id
   for update;

  if v_operation.refund_status <> 'charged' then
    return jsonb_build_object('refunded', false, 'reason', v_operation.refund_status);
  end if;
  if not v_operation.automatic_refund_eligible and not p_allow_ambiguous then
    return jsonb_build_object(
      'refunded', false,
      'reason', 'legacy_reconciliation_required',
      'ambiguous_credits', v_operation.credits_charged
    );
  end if;
  if v_operation.accounting_source = 'legacy_ambiguous_v1' then
    return jsonb_build_object(
      'refunded', false,
      'reason', 'legacy_reconciliation_required',
      'ambiguous_credits', v_operation.credits_charged
    );
  end if;

  select 'sub:' || current_period_start::text
    into v_current_period
    from public.user_subscriptions
   where user_id = v_operation.user_id
     and status in ('active', 'trialing')
     and current_period_start is not null
   limit 1;

  v_plan_restore := case
    when v_operation.plan_period_key is not null
     and v_operation.plan_period_key = v_current_period
      then coalesce(v_operation.plan_credits_charged, 0)
    else 0
  end;
  v_permanent_restore := coalesce(v_operation.permanent_credits_charged, 0);

  perform set_config('app.allow_profile_privileged_update', 'on', true);
  update public.profiles
     set plan_credits = plan_credits + v_plan_restore,
         credits = credits + v_permanent_restore
   where id = v_operation.user_id;

  update public.generation_credit_operations
     set refund_status = 'refunded',
         credits_refunded = credits_charged,
         plan_credits_refunded = coalesce(plan_credits_charged, 0),
         permanent_credits_refunded = coalesce(permanent_credits_charged, 0),
         plan_credits_restored = v_plan_restore,
         permanent_credits_restored = v_permanent_restore,
         refunded_at = clock_timestamp(),
         refund_reason = left(coalesce(p_reason, 'generation_failure'), 120)
   where id = p_operation_id
   returning * into v_operation;

  return jsonb_build_object(
    'refunded', true,
    'credits_refunded', v_operation.credits_refunded,
    'plan_credits_restored', v_plan_restore,
    'permanent_credits_restored', v_permanent_restore,
    'plan_credits_expired', v_operation.plan_credits_refunded - v_plan_restore
  );
end;
$$;

create or replace function public.mark_word_failed_and_refund(
  p_word_id uuid,
  p_failed_stage text,
  p_error_message text default null,
  p_expected_operation_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_word public.words%rowtype;
  v_operation_kind text;
  v_refund jsonb := jsonb_build_object('refunded', false, 'reason', 'no_charge_operation');
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role required' using errcode = '42501';
  end if;

  select * into v_word from public.words where id = p_word_id for update;
  if v_word.id is null then
    return jsonb_build_object('owned', false, 'reason', 'word_not_found');
  end if;
  if v_word.current_stage = 'failed' then
    return jsonb_build_object('owned', false, 'reason', 'already_failed');
  end if;

  -- A replica must settle the charge operation it actually started with. A
  -- late worker from the prior attempt must never fail/refund a newly paid
  -- retry. During schema-first rollout, the old runner omits the fence; allow
  -- initial jobs but fail closed for retry operations until code is deployed.
  if p_expected_operation_id is not null
     and v_word.active_credit_operation_id is distinct from p_expected_operation_id then
    return jsonb_build_object(
      'owned', false,
      'reason', 'stale_credit_operation',
      'expected_operation_id', p_expected_operation_id,
      'active_operation_id', v_word.active_credit_operation_id
    );
  end if;
  if p_expected_operation_id is null and v_word.active_credit_operation_id is not null then
    select operation_kind into v_operation_kind
      from public.generation_credit_operations
     where id = v_word.active_credit_operation_id;
    if v_operation_kind in ('word_retry', 'music_retry') then
      return jsonb_build_object(
        'owned', false,
        'reason', 'operation_fence_required',
        'active_operation_id', v_word.active_credit_operation_id
      );
    end if;
  end if;

  perform 1 from public.profiles where id = v_word.user_id for update;
  if not found then
    raise exception 'Word owner profile not found' using errcode = '23503';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);
  update public.words
     set current_stage = 'failed',
         status = 'failed',
         failed_stage = p_failed_stage,
         error_message = left(p_error_message, 500),
         stage_started_at = now()
   where id = p_word_id
     and current_stage <> 'failed'
   returning * into v_word;

  if v_word.active_credit_operation_id is not null then
    v_refund := public.refund_generation_credit_operation(
      v_word.active_credit_operation_id,
      'word_failure:' || coalesce(p_failed_stage, 'unknown'),
      false
    );
  end if;

  return jsonb_build_object(
    'owned', true,
    'word_id', v_word.id,
    'operation_id', v_word.active_credit_operation_id,
    'refund', v_refund
  );
end;
$$;

-- Admin rejection refunds only still-charged, automatically reconcilable
-- operations. Ambiguous historical balance is reported, never silently minted.
create or replace function public.admin_reject_generation_job(
  p_job_id uuid,
  p_refund boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.generation_jobs%rowtype;
  v_after public.generation_jobs%rowtype;
  v_profile_before public.profiles%rowtype;
  v_profile_after public.profiles%rowtype;
  v_operation record;
  v_receipt jsonb;
  v_refund_requested boolean := coalesce(p_refund, false);
  v_refund_amount integer := 0;
  v_plan_restored integer := 0;
  v_permanent_restored integer := 0;
  v_ambiguous_amount integer := 0;
begin
  select * into v_before
    from public.generation_jobs
   where id = p_job_id
   for update;

  if not found then
    raise exception 'Generation job not found' using errcode = 'P0002';
  end if;
  if v_before.status not in ('pending', 'approved', 'processing', 'partial', 'failed', 'rejected') then
    raise exception 'Job status % cannot be rejected', v_before.status using errcode = '22023';
  end if;

  if v_refund_requested then
    select * into v_profile_before
      from public.profiles
     where id = v_before.user_id
     for update;
    if not found then
      raise exception 'Job owner profile not found' using errcode = 'P0002';
    end if;

    select coalesce(sum(credits_charged), 0) into v_ambiguous_amount
      from public.generation_credit_operations
     where generation_job_id = p_job_id
       and refund_status = 'legacy_ambiguous';

    for v_operation in
      select id
        from public.generation_credit_operations
       where generation_job_id = p_job_id
         and refund_status = 'charged'
         and automatic_refund_eligible
       order by charged_at, id
       for update
    loop
      v_receipt := public.refund_generation_credit_operation(
        v_operation.id, 'admin_reject:' || left(coalesce(p_reason, ''), 80), false
      );
      if coalesce((v_receipt->>'refunded')::boolean, false) then
        v_refund_amount := v_refund_amount + coalesce((v_receipt->>'credits_refunded')::integer, 0);
        v_plan_restored := v_plan_restored + coalesce((v_receipt->>'plan_credits_restored')::integer, 0);
        v_permanent_restored := v_permanent_restored + coalesce((v_receipt->>'permanent_credits_restored')::integer, 0);
      end if;
    end loop;

    select * into v_profile_after from public.profiles where id = v_before.user_id;
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);
  update public.generation_jobs
     set status = 'rejected',
         completed_at = coalesce(completed_at, now()),
         admin_rejected_at = coalesce(admin_rejected_at, now()),
         admin_refunded_at = case when v_refund_amount > 0 then now() else admin_refunded_at end,
         admin_refund_amount = coalesce(admin_refund_amount, 0) + v_refund_amount
   where id = p_job_id
   returning * into v_after;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_reject_generation_job',
    'generation_jobs',
    p_job_id::text,
    p_reason,
    jsonb_build_object('job', to_jsonb(v_before), 'profile', case when v_profile_before.id is null then null else to_jsonb(v_profile_before) end),
    jsonb_build_object('job', to_jsonb(v_after), 'profile', case when v_profile_after.id is null then null else to_jsonb(v_profile_after) end),
    jsonb_build_object(
      'original_status', v_before.status,
      'refund_requested', v_refund_requested,
      'refund_amount', v_refund_amount,
      'plan_credits_restored', v_plan_restored,
      'permanent_credits_restored', v_permanent_restored,
      'legacy_ambiguous_amount', v_ambiguous_amount
    )
  );

  return jsonb_build_object(
    'job_id', v_after.id,
    'status', v_after.status,
    'refund_amount', v_refund_amount,
    'refunded', v_refund_amount > 0,
    'plan_credits_restored', v_plan_restored,
    'permanent_credits_restored', v_permanent_restored,
    'legacy_ambiguous_amount', v_ambiguous_amount,
    'credits_charged', v_after.credits_charged
  );
end;
$$;

revoke all on function public.refund_generation_credit_operation(uuid, text, boolean) from public, anon, authenticated;
revoke all on function public.mark_word_failed_and_refund(uuid, text, text, uuid) from public, anon, authenticated;
grant execute on function public.mark_word_failed_and_refund(uuid, text, text, uuid) to service_role;

revoke all on function public.admin_reject_generation_job(uuid, boolean, text) from public, anon;
grant execute on function public.admin_reject_generation_job(uuid, boolean, text) to authenticated;

comment on table public.generation_credit_operations is
  'Immutable charge provenance plus exactly-once refund state for initial generation and paid retry operations. legacy_ambiguous rows require manual reconciliation.';
comment on function public.mark_word_failed_and_refund(uuid, text, text, uuid) is
  'Atomically owns a terminal word failure and refunds its active eligible charge operation at most once.';

notify pgrst, 'reload schema';

commit;
