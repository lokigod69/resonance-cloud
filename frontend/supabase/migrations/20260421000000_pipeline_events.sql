-- Pipeline events: append-only observability table for outbound LLM and API calls.
--
-- Purpose: capture full system prompts, user prompts, and response bodies for every
-- meaningful engine decision or third-party call (OpenRouter, kie.ai Suno, etc.) so
-- admins can audit what the pipeline actually sent and received. Sits alongside the
-- existing words.metadata aggregator — does not replace it.
--
-- Append-only: no UPDATE or DELETE policies. Rows are immutable facts.
--
-- Retention: 90 days live is the operational intent. No scheduled deletion job is
-- implemented in this migration; revisit once real row-count / storage growth data
-- is available (approximately one production week).
--
-- PII: admins can see full learner-submitted words and LLM prompts. Access is gated
-- by public.is_admin() + RLS below. Service role (worker writes) bypasses RLS.

-- ============================================================================
-- STORAGE BUCKET — large response offload (>256 KB responses)
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('pipeline-events', 'pipeline-events', false)
on conflict (id) do nothing;

-- Admin-only read — full payloads may contain learner data or model prompts
create policy "Admin read pipeline-events"
  on storage.objects for select
  using (bucket_id = 'pipeline-events' and public.is_admin());

-- ============================================================================
-- TABLE
-- ============================================================================

create table if not exists public.pipeline_events (
  id              uuid primary key default gen_random_uuid(),
  created_at      timestamptz not null default now(),

  -- Provenance
  event_source    text not null,   -- 'engine' | 'orchestrator' | 'suno_bakein' | 'enrichment' | 'publishing'
  stage           text not null,   -- 'concept' | 'images' | 'song' | 'video' | 'assembly' | 'bookend' | 'suno_bakein' | 'enrichment' | 'publishing'
  sub_step        text,            -- free-text identifier for the specific call site

  -- Identity (all nullable — some events occur before identity is fully known)
  word_id         uuid references public.words(id),
  deck_id         uuid references public.decks(id),
  user_id         uuid references public.profiles(id),
  job_id          uuid references public.generation_jobs(id),
  attempt         int2,

  -- Model / provider
  model_provider  text,
  model_name      text,

  -- Outcome
  status          text not null,   -- 'success' | 'failed' | 'partial' | 'skipped' | 'retried'
  error_message   text,
  error_type      text,

  -- Metrics
  latency_ms      int4,
  cost_usd        numeric(10, 6),
  tokens_in       int4,
  tokens_out      int4,

  -- Payloads (full text — no truncation; large bodies offload to Storage via response_ref)
  system_prompt   text,
  user_prompt     text,
  response_body   text,
  response_ref    text,            -- Storage path (within bucket 'pipeline-events') when response_body offloaded

  -- External correlation
  request_id      text,            -- provider-side id: OpenRouter id, kie.ai taskId, Fal.ai request_id

  -- Grab bag
  metadata        jsonb not null default '{}'::jsonb
);

-- ============================================================================
-- INDEXES
-- ============================================================================

create index if not exists ix_events_word_id_created_at
  on public.pipeline_events (word_id, created_at desc);

create index if not exists ix_events_deck_id_created_at
  on public.pipeline_events (deck_id, created_at desc);

create index if not exists ix_events_user_id_created_at
  on public.pipeline_events (user_id, created_at desc);

create index if not exists ix_events_job_id
  on public.pipeline_events (job_id);

create index if not exists ix_events_stage_status
  on public.pipeline_events (stage, status);

create index if not exists ix_events_model_name_created_at
  on public.pipeline_events (model_name, created_at desc);

create index if not exists ix_events_created_at
  on public.pipeline_events (created_at desc);

-- ============================================================================
-- ROW LEVEL SECURITY — admin read only, no write/update/delete policies
-- (service role bypasses RLS automatically for worker writes)
-- ============================================================================

alter table public.pipeline_events enable row level security;

create policy "Admins read pipeline_events"
  on public.pipeline_events for select
  using (public.is_admin());

-- Intentionally no INSERT/UPDATE/DELETE policies.
-- Writes happen via service-role key (bypasses RLS).
-- Append-only by design — no row mutation from application layer.

-- ============================================================================
-- Rollback:
-- BEGIN;
--   DROP POLICY IF EXISTS "Admins read pipeline_events" ON public.pipeline_events;
--   DROP INDEX IF EXISTS public.ix_events_created_at;
--   DROP INDEX IF EXISTS public.ix_events_model_name_created_at;
--   DROP INDEX IF EXISTS public.ix_events_stage_status;
--   DROP INDEX IF EXISTS public.ix_events_job_id;
--   DROP INDEX IF EXISTS public.ix_events_user_id_created_at;
--   DROP INDEX IF EXISTS public.ix_events_deck_id_created_at;
--   DROP INDEX IF EXISTS public.ix_events_word_id_created_at;
--   DROP TABLE IF EXISTS public.pipeline_events;
--   DROP POLICY IF EXISTS "Admin read pipeline-events" ON storage.objects;
--   DELETE FROM storage.buckets WHERE id = 'pipeline-events';
-- COMMIT;
