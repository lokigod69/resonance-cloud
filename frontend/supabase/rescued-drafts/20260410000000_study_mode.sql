-- Add study_mode column to recall_attempts
-- Existing rows are retroactively 'video' since that was the only mode
ALTER TABLE public.recall_attempts
  ADD COLUMN IF NOT EXISTS study_mode text;

UPDATE public.recall_attempts
SET study_mode = 'video'
WHERE study_mode IS NULL;

ALTER TABLE public.recall_attempts
  ALTER COLUMN study_mode SET DEFAULT 'video';

ALTER TABLE public.recall_attempts
  ALTER COLUMN study_mode SET NOT NULL;

ALTER TABLE public.recall_attempts
  ADD CONSTRAINT recall_attempts_study_mode_check
  CHECK (study_mode IN ('video', 'audio', 'flashcard'));

-- New composite index for mode-filtered heat queries
CREATE INDEX IF NOT EXISTS idx_recall_attempts_user_mode_word_time
  ON public.recall_attempts(user_id, study_mode, word_id, created_at DESC);

-- Keep old index for aggregate queries (Speak feature uses cross-mode heat)
-- idx_recall_attempts_user_word_time remains unchanged
