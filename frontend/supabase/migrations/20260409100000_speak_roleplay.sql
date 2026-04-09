alter table public.speak_conversations
  add column if not exists mode text not null default 'freeform';

alter table public.speak_conversations
  add column if not exists scenario_id text;

alter table public.speak_conversations
  add column if not exists npc_name text;

alter table public.speak_conversations
  add column if not exists context_variant text;
