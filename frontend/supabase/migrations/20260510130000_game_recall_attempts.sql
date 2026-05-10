-- Drop the existing study_mode CHECK constraint so future games
-- (slicer, runner, etc.) don't each need a migration.
ALTER TABLE public.recall_attempts
  DROP CONSTRAINT IF EXISTS recall_attempts_study_mode_check;

-- Add nullable metadata column for game-specific context.
ALTER TABLE public.recall_attempts
  ADD COLUMN IF NOT EXISTS metadata jsonb;
