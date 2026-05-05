-- Extend recall_attempts.study_mode CHECK constraint to include 'canvas'
-- Phase A of Canvas study mode rollout

ALTER TABLE public.recall_attempts
  DROP CONSTRAINT IF EXISTS recall_attempts_study_mode_check;

ALTER TABLE public.recall_attempts
  ADD CONSTRAINT recall_attempts_study_mode_check
  CHECK (study_mode IN ('video', 'audio', 'flashcard', 'canvas'));
