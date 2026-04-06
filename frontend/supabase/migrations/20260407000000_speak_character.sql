-- Add character_id to speak_conversations for the character tutor system
ALTER TABLE public.speak_conversations
  ADD COLUMN IF NOT EXISTS character_id TEXT;
