-- Allow users to delete their own speak conversations.
-- speak_messages rows cascade via FK.
create policy "Users delete own speak conversations"
  on public.speak_conversations for delete
  using (user_id = auth.uid());
