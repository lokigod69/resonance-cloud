"""Run this once to fix the deck status constraint in live Supabase."""

print("Run this SQL in Supabase Dashboard > SQL Editor:")
print()
print("ALTER TABLE public.decks DROP CONSTRAINT IF EXISTS decks_status_check;")
print("ALTER TABLE public.decks ADD CONSTRAINT decks_status_check")
print("  CHECK (status IN ('draft', 'generating', 'complete', 'partial', 'failed'));")
