BEGIN;

-- Add pre_bootstrap as the word stage used after user submission and before
-- Source 1 has prepared enrichment, workspace files, and the manifest. This
-- stage intentionally precedes pending; Source 3 only sees words after
-- bootstrap exposes them as pending.

ALTER TABLE public.words
  DROP CONSTRAINT IF EXISTS words_current_stage_check;

ALTER TABLE public.words
  ADD CONSTRAINT words_current_stage_check
  CHECK (current_stage IS NULL OR current_stage IN (
    'pre_bootstrap',
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

COMMENT ON CONSTRAINT words_current_stage_check ON public.words IS
  'Allowed word pipeline stages. pre_bootstrap is the user-submitted pre-Source-1 stage before pending.';

COMMIT;
