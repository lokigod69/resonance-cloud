-- Grok provider columns on speak_conversations.
-- Both columns nullable for backwards compatibility with Voxtral and Gemini rows.

alter table public.speak_conversations
  add column if not exists grok_voice text;

alter table public.speak_conversations
  add column if not exists grok_category text;

alter table public.speak_conversations
  add constraint speak_conversations_grok_voice_check
  check (grok_voice is null or grok_voice in ('eve', 'ara', 'rex', 'sal', 'leo'));

alter table public.speak_conversations
  add constraint speak_conversations_grok_category_check
  check (grok_category is null or grok_category in (
    'travel', 'business', 'romance', 'philosophy', 'daily_life',
    'food', 'arts', 'news'
  ));
