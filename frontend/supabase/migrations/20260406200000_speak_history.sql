-- Speak conversation sessions
create table if not exists public.speak_conversations (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  language      text not null,
  voice_name    text,
  level         text,
  message_count int not null default 0,
  title         text,
  started_at    timestamptz not null default now(),
  ended_at      timestamptz
);

create index idx_speak_conversations_user
  on public.speak_conversations(user_id, started_at desc);

alter table public.speak_conversations enable row level security;

create policy "Users read own speak conversations"
  on public.speak_conversations for select
  using (user_id = auth.uid() or public.is_admin());

create policy "Users insert own speak conversations"
  on public.speak_conversations for insert
  with check (user_id = auth.uid());

create policy "Users update own speak conversations"
  on public.speak_conversations for update
  using (user_id = auth.uid());

create policy "Admin delete speak conversations"
  on public.speak_conversations for delete
  using (public.is_admin());

-- Individual messages within conversations
create table if not exists public.speak_messages (
  id              uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.speak_conversations(id) on delete cascade,
  role            text not null check (role in ('user', 'assistant')),
  content         text not null,
  created_at      timestamptz not null default now()
);

create index idx_speak_messages_conversation
  on public.speak_messages(conversation_id, created_at asc);

alter table public.speak_messages enable row level security;

create policy "Users read own speak messages"
  on public.speak_messages for select
  using (
    exists (
      select 1 from public.speak_conversations c
      where c.id = speak_messages.conversation_id
      and (c.user_id = auth.uid() or public.is_admin())
    )
  );

create policy "Users insert own speak messages"
  on public.speak_messages for insert
  with check (
    exists (
      select 1 from public.speak_conversations c
      where c.id = speak_messages.conversation_id
      and c.user_id = auth.uid()
    )
  );

-- Atomic message count increment (avoids read-then-write race condition)
create or replace function public.increment_speak_message_count(conv_id uuid, inc int)
returns void as $$
  update public.speak_conversations
  set message_count = message_count + inc
  where id = conv_id and user_id = auth.uid();
$$ language sql security definer;
