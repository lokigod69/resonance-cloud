-- Fix: decks status constraint was missing 'failed'
-- The job runner sets status='failed' when all words fail, but the constraint rejected it.
ALTER TABLE public.decks DROP CONSTRAINT IF EXISTS decks_status_check;
ALTER TABLE public.decks ADD CONSTRAINT decks_status_check
  CHECK (status IN ('draft', 'generating', 'complete', 'partial', 'failed'));
