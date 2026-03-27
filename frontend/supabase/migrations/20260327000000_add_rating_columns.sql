-- Add star rating columns for user video quality feedback
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS rating SMALLINT CHECK (rating >= 1 AND rating <= 5);
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS rated_at TIMESTAMPTZ;
