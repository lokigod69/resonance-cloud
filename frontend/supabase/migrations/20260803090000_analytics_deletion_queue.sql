-- Analytics OS change order CO-2 (2026-08-02): Art. 17 erasure re-sweep queue.
-- On account deletion the API erases the user's PostHog person immediately and
-- queues the uuid here; a daily cron (api/analytics-deletion-sweep.ts) re-issues
-- the deletion for rows older than 24h (in-flight events can land after the
-- first pass), then removes the row once PostHog confirms. The table holds
-- nothing but the uuid + timestamp, retained solely to complete erasure.
--
-- Deliberately NO foreign key to auth.users: the user row is destroyed moments
-- after this row is written.

begin;

create table if not exists public.analytics_deletion_queue (
  user_uuid uuid primary key,
  requested_at timestamptz not null default now()
);

comment on table public.analytics_deletion_queue is
  'Art. 17 analytics-erasure re-sweep queue (Analytics OS CO-2). Rows are removed once PostHog confirms the person + events are gone.';

-- Service-role only: RLS enabled with no policies.
alter table public.analytics_deletion_queue enable row level security;

commit;
