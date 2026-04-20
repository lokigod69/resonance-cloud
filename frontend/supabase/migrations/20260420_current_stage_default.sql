-- ============================================================================
-- Pipeline Refactor v4-final — current_stage DEFAULT safety net
-- ============================================================================
-- Context: 20260418_pipeline_state.sql added current_stage to public.words
-- without a DEFAULT. Any INSERT that omitted the column produced NULL, which
-- blocked the feeder's transition_word_stage RPC (allowed_prior=['pending'])
-- and stranded two Quick Generate test words on 2026-04-20.
--
-- Both client-side inserts in frontend/src/components/generate/submitGeneration.ts
-- now supply current_stage='pending' explicitly. This migration is the
-- belt-and-suspenders: future code paths that forget the column will default
-- to 'pending' instead of stranding the row.
--
-- IDEMPOTENCE
--   ALTER COLUMN ... SET DEFAULT is idempotent. Safe to re-run.
-- ============================================================================

BEGIN;

ALTER TABLE public.words
  ALTER COLUMN current_stage SET DEFAULT 'pending';

COMMIT;

-- Rollback:
-- ALTER TABLE public.words ALTER COLUMN current_stage DROP DEFAULT;
