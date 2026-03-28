-- A/B dual-take support: store a second video version per word
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS video_url_b text;
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS thumbnail_url_b text;
