-- ============================================================================
-- Pipeline Refactor v4-final — Atomic state-transition RPCs (fix round 1)
-- ============================================================================
-- Design refs: PIPELINE_REFACTOR_DESIGN_V4_FINAL.md §14.1, §7.5
-- Review refs: CRIT-1, CRIT-3 (via claim_retry_word), HIGH-4
--
-- WHAT THIS DOES
--   Adds three Postgres functions so the orchestrator's state transitions are
--   true single-UPDATE atomic operations at the database, matching §14.1's
--   canonical shape. The Python layer becomes a thin wrapper around
--   `sb.rpc(...)` calls.
--
--     transition_word_stage     - guarded transition with cancelling exclusion,
--                                 optional attempt-counter increment, and
--                                 arbitrary additional column updates in the
--                                 same UPDATE. Replaces the previous two-call
--                                 read-then-write that could lose counter
--                                 increments under concurrency.
--
--     mark_word_failed          - terminal-failure transition guarded by
--                                 current_stage != 'failed' so refund_credit
--                                 fires exactly once across replica overlap
--                                 (§7.5).
--
--     claim_retry_word          - retry-flag claim that also atomically
--                                 increments total_stage_attempts and guards
--                                 to terminal current_stage values so a live
--                                 word accidentally flagged for retry cannot
--                                 have its stage rewritten out from under an
--                                 active worker (CRIT-4).
--
-- IDEMPOTENCE
--   CREATE OR REPLACE. Safe to re-run. No data migration.
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- transition_word_stage
-- ---------------------------------------------------------------------------
-- Single-UPDATE atomic state transition. Returns TRUE iff rowcount=1 (this
-- caller owns the transition). FALSE means the word is cancelling, in an
-- unexpected prior state, or was claimed by another replica.
--
-- p_additional_updates is a jsonb object whose keys are column names and
-- values are the new column values. Supported keys in v1: music_state,
-- suno_task_id, suno_audio_url, failed_stage. Unknown keys are ignored.
-- Pass JSON null (not SQL NULL) to explicitly clear a column value.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION transition_word_stage(
    p_word_id              uuid,
    p_allowed_prior_stages text[],
    p_new_stage            text,
    p_new_status           text,
    p_increment_attempts   boolean,
    p_additional_updates   jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected integer;
BEGIN
    UPDATE public.words
    SET current_stage        = p_new_stage,
        status               = p_new_status,
        stage_started_at     = now(),
        stage_attempts       = CASE
                                    WHEN current_stage != p_new_stage
                                         AND p_increment_attempts THEN 1
                                    WHEN current_stage != p_new_stage THEN 0
                                    WHEN p_increment_attempts
                                         THEN stage_attempts + 1
                                    ELSE 0
                               END,
        total_stage_attempts = total_stage_attempts +
                               CASE WHEN p_increment_attempts THEN 1 ELSE 0 END,
        music_state          = CASE WHEN p_additional_updates ? 'music_state'
                                    THEN p_additional_updates->>'music_state'
                                    ELSE music_state
                               END,
        suno_task_id         = CASE WHEN p_additional_updates ? 'suno_task_id'
                                    THEN p_additional_updates->>'suno_task_id'
                                    ELSE suno_task_id
                               END,
        suno_audio_url       = CASE WHEN p_additional_updates ? 'suno_audio_url'
                                    THEN p_additional_updates->>'suno_audio_url'
                                    ELSE suno_audio_url
                               END,
        failed_stage         = CASE WHEN p_additional_updates ? 'failed_stage'
                                    THEN p_additional_updates->>'failed_stage'
                                    ELSE failed_stage
                               END
    WHERE id              = p_word_id
      AND current_stage   = ANY(p_allowed_prior_stages)
      AND current_stage  != 'cancelling';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected = 1;
END;
$$;

-- ---------------------------------------------------------------------------
-- mark_word_failed
-- ---------------------------------------------------------------------------
-- Terminal failure transition guarded by current_stage != 'failed'. §7.5
-- requires rowcount=1 before refund_credit is called; return value carries
-- that signal.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION mark_word_failed(
    p_word_id      uuid,
    p_failed_stage text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected integer;
BEGIN
    UPDATE public.words
    SET current_stage    = 'failed',
        status           = 'failed',
        failed_stage     = p_failed_stage,
        stage_started_at = now()
    WHERE id            = p_word_id
      AND current_stage != 'failed';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected = 1;
END;
$$;

-- ---------------------------------------------------------------------------
-- claim_retry_word
-- ---------------------------------------------------------------------------
-- Claim a retry-flagged word. Resets stage_attempts to 0 and increments
-- total_stage_attempts by 1 (per §4.1 retry-start is a stage entry). Guarded
-- both by retry_requested=true (replica-overlap idempotency, §6.1 Source 2)
-- and by current_stage IN terminal states (CRIT-4: prevents a live word with
-- retry_requested accidentally set from being rewritten mid-flight).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION claim_retry_word(
    p_word_id       uuid,
    p_target_stage  text,
    p_target_status text
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected integer;
BEGIN
    UPDATE public.words
    SET retry_requested      = false,
        failed_stage         = NULL,
        stage_attempts       = 0,
        total_stage_attempts = total_stage_attempts + 1,
        status               = p_target_status,
        current_stage        = p_target_stage,
        stage_started_at     = now()
    WHERE id              = p_word_id
      AND retry_requested = true
      AND current_stage IN ('failed', 'complete', 'cancelled');

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected = 1;
END;
$$;

COMMIT;

-- Rollback (apply in reverse order if needed):
-- DROP FUNCTION IF EXISTS claim_retry_word(uuid, text, text);
-- DROP FUNCTION IF EXISTS mark_word_failed(uuid, text);
-- DROP FUNCTION IF EXISTS transition_word_stage(uuid, text[], text, text, boolean, jsonb);
