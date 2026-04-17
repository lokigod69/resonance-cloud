-- Gemini TTS provider + mode/voice tracking on speak_conversations
-- All columns are nullable or have defaults so existing rows need no backfill.

alter table public.speak_conversations
  add column if not exists provider text default 'voxtral';

alter table public.speak_conversations
  add column if not exists gemini_character_mode_id text;

alter table public.speak_conversations
  add column if not exists gemini_voice_name text;
