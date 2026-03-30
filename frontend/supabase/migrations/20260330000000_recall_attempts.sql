-- Recall attempts: tracks every study button press (remembered / review later)
create table if not exists public.recall_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  knew_it boolean not null,
  created_at timestamptz not null default now()
);

-- Primary query: latest attempt per word for a user (heat computation)
create index idx_recall_attempts_user_word_time
  on public.recall_attempts(user_id, word_id, created_at desc);

-- Secondary: admin analytics by time
create index idx_recall_attempts_created_at
  on public.recall_attempts(created_at);

alter table public.recall_attempts enable row level security;

-- Users read own attempts; admins read all
create policy "Users read own recall attempts"
  on public.recall_attempts for select
  using (user_id = auth.uid() or public.is_admin());

-- Users insert own attempts
create policy "Users insert own recall attempts"
  on public.recall_attempts for insert
  with check (user_id = auth.uid());

-- Admin cleanup
create policy "Admin delete recall attempts"
  on public.recall_attempts for delete
  using (public.is_admin());
