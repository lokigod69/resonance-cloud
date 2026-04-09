-- Add corrections cache column to speak_conversations.
-- Stores an array of { original, corrected, explanation } objects from the
-- on-demand LLM review so it only needs to be computed once per conversation.
alter table public.speak_conversations
  add column if not exists corrections jsonb;

-- Allow users to update their own conversations (needed to cache corrections).
-- Uses a guarded DO block because the policy may already exist.
do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename  = 'speak_conversations'
      and policyname = 'Users update own speak conversations'
  ) then
    create policy "Users update own speak conversations"
      on public.speak_conversations for update
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
