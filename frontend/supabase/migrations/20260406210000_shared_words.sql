-- Shared word links (public access tokens)
create table if not exists public.shared_words (
  id          text primary key,              -- short nanoid (e.g. 'abc123'), NOT uuid
  word_id     uuid not null references public.words(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  view_count  int not null default 0,
  created_at  timestamptz not null default now()
);

-- Unique constraint: one share link per user+word combo (reuse existing link)
create unique index idx_shared_words_user_word on public.shared_words(user_id, word_id);

alter table public.shared_words enable row level security;

-- ANYONE can read shared_words (needed for public share page)
create policy "Public read shared words"
  on public.shared_words for select
  using (true);

-- Authenticated users can create share links for their own words
create policy "Users create own share links"
  on public.shared_words for insert
  with check (user_id = auth.uid());

-- Allow view_count to be incremented by anyone (serverless fn uses anon key)
create policy "Public update view count"
  on public.shared_words for update
  using (true)
  with check (true);

-- Admin delete
create policy "Admin delete shared words"
  on public.shared_words for delete
  using (public.is_admin());

-- Function to get full share data (word + deck info) by share ID
-- Uses security definer so anon key can read word/deck data ONLY via this function
create or replace function public.get_shared_word(share_id text)
returns json as $$
  select json_build_object(
    'share_id', sw.id,
    'word_id', w.id,
    'word', w.word,
    'translation', w.translation,
    'mnemonic', w.mnemonic,
    'etymology', w.etymology,
    'pos', w.pos,
    'article', w.article,
    'video_url', w.video_url,
    'video_url_b', w.video_url_b,
    'thumbnail_url', w.thumbnail_url,
    'target_language', d.target_language,
    'art_style', d.art_style,
    'view_count', sw.view_count
  )
  from public.shared_words sw
  join public.words w on w.id = sw.word_id
  join public.decks d on d.id = w.deck_id
  where sw.id = share_id;
$$ language sql security definer;
