-- Persist and bound generation bootstrap retries (runner audit I-4).
-- Existing jobs start at attempt zero. The worker owns these fields through
-- the existing trusted-mutation guard and marks the job failed at its cap.

begin;

alter table public.generation_jobs
  add column if not exists bootstrap_attempt_count integer not null default 0,
  add column if not exists bootstrap_retry_after timestamptz;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_bootstrap_attempt_count_check;

alter table public.generation_jobs
  add constraint generation_jobs_bootstrap_attempt_count_check
  check (bootstrap_attempt_count >= 0);

create index if not exists idx_generation_jobs_bootstrap_retry_due
  on public.generation_jobs (bootstrap_retry_after, priority desc, created_at)
  where status = 'approved';

notify pgrst, 'reload schema';

commit;
