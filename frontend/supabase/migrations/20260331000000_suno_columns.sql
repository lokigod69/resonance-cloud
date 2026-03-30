-- Add Suno full song columns to words table
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS suno_audio_url TEXT;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS suno_task_id TEXT;
