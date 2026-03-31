-- Add Suno B-track column to words table (second kie.ai generation per word)
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS suno_audio_url_b TEXT;
