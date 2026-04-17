-- Phase 2: Gemini accents — adds accent_id as a cache dimension on voice_samples
-- and a log column on speak_conversations. Default accent is 'none' (no override).
--
-- accent_id extends the composite primary key on voice_samples, so cached
-- samples for the same voice+language+mode+version with different accent IDs
-- are stored as separate rows. Existing rows backfill to accent_id='none'.

-- ── voice_samples ──────────────────────────────────────────────────────────
alter table public.voice_samples
  drop constraint voice_samples_pkey;

alter table public.voice_samples
  add column if not exists accent_id text not null default 'none';

alter table public.voice_samples
  add primary key (voice_name, language, character_mode_id, version, accent_id);

-- Refresh the partial index to include accent as a lookup dimension
drop index if exists idx_voice_samples_active;
create index idx_voice_samples_active
  on public.voice_samples(character_mode_id, language, accent_id)
  where invalidated_at is null;

-- ── speak_conversations ────────────────────────────────────────────────────
alter table public.speak_conversations
  add column if not exists gemini_accent_id text default 'none';
