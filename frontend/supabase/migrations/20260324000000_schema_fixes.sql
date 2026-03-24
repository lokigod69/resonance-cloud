-- Fix missing columns and ensure system_settings defaults

-- settings_override is used by the generate wizard to pass creative_direction and genre
ALTER TABLE public.generation_jobs ADD COLUMN IF NOT EXISTS settings_override JSONB DEFAULT NULL;

-- theme column for user-selectable skinning (standard, retro, soft)
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS theme TEXT DEFAULT 'standard';

-- Ensure system_settings has a row with auto_approve enabled
INSERT INTO public.system_settings (id, auto_approve, queue_paused)
VALUES (1, true, false)
ON CONFLICT (id) DO UPDATE SET auto_approve = true;
