-- Phase 2B: Content Browser columns + Admin PIN

-- Add metadata JSONB column to words table for storing generation details
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT NULL;

-- Add needs_review flag for admin quality control
ALTER TABLE public.words ADD COLUMN IF NOT EXISTS needs_review BOOLEAN DEFAULT false;

-- Add admin_pin to system_settings for admin access control
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS admin_pin TEXT DEFAULT '1337';

-- Indexes for content browser filtering
CREATE INDEX IF NOT EXISTS idx_words_needs_review ON public.words (needs_review) WHERE needs_review = true;
CREATE INDEX IF NOT EXISTS idx_words_status ON public.words (status);
