-- ============================================================================
-- Pipeline Refactor v4-final — words state-machine columns
-- ============================================================================
-- Design: PIPELINE_REFACTOR_DESIGN_V4_FINAL.md §9
--
-- WHAT THIS DOES
--   Adds eight columns to `words` and two filtered indexes so the orchestrator
--   can run a pipelined 3-source feeder (orphans / new jobs / retries) with
--   atomic guarded state transitions.
--
--     current_stage         - state machine value (pending, images, ... failed)
--     stage_started_at      - when word entered current stage
--     stage_attempts        - attempts at current stage (resets on transition)
--     total_stage_attempts  - monotonic diagnostic counter
--     failed_stage          - stage that caused terminal failure (NULL if none)
--     music_state           - Suno track state (pending/submitted/baked/...)
--     retry_requested       - set by dashboard/music-page retry
--     retry_requested_at    - timestamp for retry ordering
--
--   Plus partial indexes on (current_stage) filtered to active rows and
--   (retry_requested, retry_requested_at) filtered to retry-flagged rows.
--
-- SAFETY
--   Aborts (RAISE EXCEPTION) if any row in generation_jobs or words is still
--   status='processing'. Operator must drain the queue first.
--
-- IDEMPOTENCE
--   All additions use IF NOT EXISTS / DO $$ BEGIN ... EXCEPTION ... END $$
--   guards so rerunning after a partial failure is safe.
--
-- BACKFILL RULES (§9.4)
--   status='pending'  -> current_stage='pending',   music_state='pending'
--   status='complete' AND suno_audio_url IS NOT NULL
--                     -> current_stage='complete',  music_state='baked'
--   status='complete' AND suno_audio_url IS NULL
--                     -> current_stage='complete',  music_state='disabled'
--   status='failed'   -> current_stage='failed',    failed_stage='unknown',
--                        music_state='pending'
--   any other status  -> left NULL; orchestrator ignores them
--
-- ROLLBACK
--   See the DROP section at the bottom (commented out).
-- ============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- Safety gate: refuse to run while anything is mid-flight
-- ---------------------------------------------------------------------------
DO $$
DECLARE
    processing_jobs  integer;
    processing_words integer;
BEGIN
    SELECT COUNT(*) INTO processing_jobs
      FROM generation_jobs
     WHERE status = 'processing';

    SELECT COUNT(*) INTO processing_words
      FROM words
     WHERE status = 'processing';

    IF processing_jobs > 0 OR processing_words > 0 THEN
        RAISE EXCEPTION
            'Migration aborted: % jobs and % words are still status=processing. '
            'Pause the queue and wait for terminal states before migrating.',
            processing_jobs, processing_words;
    END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Column additions
-- ---------------------------------------------------------------------------
ALTER TABLE words ADD COLUMN IF NOT EXISTS current_stage        text;
ALTER TABLE words ADD COLUMN IF NOT EXISTS stage_started_at     timestamptz;
ALTER TABLE words ADD COLUMN IF NOT EXISTS stage_attempts       integer NOT NULL DEFAULT 0;
ALTER TABLE words ADD COLUMN IF NOT EXISTS total_stage_attempts integer NOT NULL DEFAULT 0;
ALTER TABLE words ADD COLUMN IF NOT EXISTS failed_stage         text;
ALTER TABLE words ADD COLUMN IF NOT EXISTS music_state          text NOT NULL DEFAULT 'pending';
ALTER TABLE words ADD COLUMN IF NOT EXISTS retry_requested      boolean NOT NULL DEFAULT false;
ALTER TABLE words ADD COLUMN IF NOT EXISTS retry_requested_at   timestamptz;

-- ---------------------------------------------------------------------------
-- Backfill (§9.4) - runs before CHECK constraints so legacy values are safe
-- ---------------------------------------------------------------------------
UPDATE words
   SET current_stage = 'pending',
       music_state   = 'pending'
 WHERE current_stage IS NULL
   AND status = 'pending';

UPDATE words
   SET current_stage = 'complete',
       music_state   = 'baked'
 WHERE current_stage IS NULL
   AND status = 'complete'
   AND suno_audio_url IS NOT NULL;

UPDATE words
   SET current_stage = 'complete',
       music_state   = 'disabled'
 WHERE current_stage IS NULL
   AND status = 'complete'
   AND suno_audio_url IS NULL;

UPDATE words
   SET current_stage = 'failed',
       failed_stage  = 'unknown',
       music_state   = 'pending'
 WHERE current_stage IS NULL
   AND status = 'failed';

-- Any rows still NULL in current_stage are in an unknown legacy status
-- (e.g. 'cancelled' values from prior schemas). Leave them NULL — the
-- orchestrator's poll predicates ignore rows with NULL current_stage.

-- ---------------------------------------------------------------------------
-- CHECK constraints (added after backfill, guarded for rerun safety)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
    ALTER TABLE words
      ADD CONSTRAINT words_current_stage_check
      CHECK (current_stage IS NULL OR current_stage IN (
        'pending',
        'enrichment',
        'images',
        'concept',
        'song',
        'video_queued',
        'video',
        'post_video_queued',
        'assembly',
        'bookend',
        'suno_bake',
        'uploading',
        'complete',
        'failed',
        'cancelling',
        'cancelled'
      ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

DO $$
BEGIN
    ALTER TABLE words
      ADD CONSTRAINT words_music_state_check
      CHECK (music_state IN (
        'pending',
        'disabled',
        'submitted',
        'baked',
        'submit_failed',
        'bake_failed'
      ));
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ---------------------------------------------------------------------------
-- Indexes (§9.1)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_words_current_stage_active
    ON words (current_stage)
 WHERE current_stage IS NOT NULL
   AND current_stage NOT IN ('complete', 'failed', 'cancelled');

CREATE INDEX IF NOT EXISTS idx_words_retry_requested
    ON words (retry_requested, retry_requested_at)
 WHERE retry_requested = true;

COMMIT;

-- ============================================================================
-- ROLLBACK (run manually if needed)
-- ============================================================================
-- BEGIN;
--   DROP INDEX IF EXISTS idx_words_retry_requested;
--   DROP INDEX IF EXISTS idx_words_current_stage_active;
--   ALTER TABLE words DROP CONSTRAINT IF EXISTS words_music_state_check;
--   ALTER TABLE words DROP CONSTRAINT IF EXISTS words_current_stage_check;
--   ALTER TABLE words DROP COLUMN IF EXISTS retry_requested_at;
--   ALTER TABLE words DROP COLUMN IF EXISTS retry_requested;
--   ALTER TABLE words DROP COLUMN IF EXISTS music_state;
--   ALTER TABLE words DROP COLUMN IF EXISTS failed_stage;
--   ALTER TABLE words DROP COLUMN IF EXISTS total_stage_attempts;
--   ALTER TABLE words DROP COLUMN IF EXISTS stage_attempts;
--   ALTER TABLE words DROP COLUMN IF EXISTS stage_started_at;
--   ALTER TABLE words DROP COLUMN IF EXISTS current_stage;
-- COMMIT;
