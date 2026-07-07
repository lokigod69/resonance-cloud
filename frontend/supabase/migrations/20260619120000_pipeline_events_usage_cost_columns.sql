-- Pipeline events: usage & cost observability columns (additive only).
--
-- Purpose: extend the existing append-only `public.pipeline_events` table so it can
-- serve as the single per-call usage-and-cost event log. The original table
-- (20260421000000_pipeline_events.sql) already carries `cost_usd`, `tokens_in`,
-- `tokens_out`, `status`, `latency_ms`, and `error_type`. This migration adds the
-- few fields that were missing so the four blind frontend /api/* provider calls and
-- the Python engines can record real, groupable spend.
--
-- This is the MEASUREMENT layer only. It does NOT add tiers, entitlements, limits,
-- or change credit pricing — `tier` is denormalized here for future rollups but is
-- written NULL until a tier concept exists (a later monetization migration).
--
-- Additive contract:
--   * Every column is added with `IF NOT EXISTS` and is nullable (or unit-typed),
--     so the existing service-role writer in src/services/events.py — which inserts
--     a fixed column dict — keeps working unchanged; new columns simply default NULL.
--   * RLS is untouched: admin-read-only via public.is_admin(); writes continue to go
--     through the service role (which bypasses RLS). No INSERT/UPDATE/DELETE policy is
--     added or changed.
--   * `error_type` is intentionally NOT (re)added — it already exists on the table.

-- ============================================================================
-- COLUMNS
-- ============================================================================

alter table public.pipeline_events
  -- Denormalized user tier at write time (cheap rollups, immune to later plan
  -- changes). Written NULL for now — the tier concept does not yet exist.
  add column if not exists tier            text,

  -- Clean enum-style grouping key for rollups. Expected values:
  --   speak_turn, speak_grok_session, extract_vocab, suggest_words, translate_ipa,
  --   guided_transcribe, image_render, card_gen, song_submit, video_render,
  --   guided_tts, concept_llm, storyboard_llm
  add column if not exists feature         text,

  -- Per-call usage units the schema previously lacked. `tokens_in`/`tokens_out`
  -- already exist and are reused for LLM token counts.
  add column if not exists chars           int,          -- TTS characters (Voxtral, char-billed TTS)
  add column if not exists audio_seconds   numeric,      -- STT audio duration billed by the second/hour
  add column if not exists session_seconds numeric,      -- wall-clock session duration (grok realtime)
  add column if not exists images          int,          -- image count for per-image billed renders

  -- Actual billed cost where a provider reports it; NULL where only estimable.
  -- `cost_usd` remains the estimate (computed from units x the current rate table).
  add column if not exists real_cost_usd   numeric(10, 6);

-- ============================================================================
-- INDEXES — support the admin rollups (spend per feature / per day)
-- ============================================================================

-- Spend-per-feature and waste-by-feature rollups group by feature.
create index if not exists ix_events_feature_created_at
  on public.pipeline_events (feature, created_at desc);

-- ============================================================================
-- Rollback:
-- BEGIN;
--   DROP INDEX IF EXISTS public.ix_events_feature_created_at;
--   ALTER TABLE public.pipeline_events
--     DROP COLUMN IF EXISTS real_cost_usd,
--     DROP COLUMN IF EXISTS images,
--     DROP COLUMN IF EXISTS session_seconds,
--     DROP COLUMN IF EXISTS audio_seconds,
--     DROP COLUMN IF EXISTS chars,
--     DROP COLUMN IF EXISTS feature,
--     DROP COLUMN IF EXISTS tier;
-- COMMIT;
