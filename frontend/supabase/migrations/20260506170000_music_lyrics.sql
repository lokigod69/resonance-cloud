begin;

create table if not exists public.music_lyrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,

  source_type text not null
    check (source_type in ('song_only', 'video_pipeline')),
  source_job_id uuid,
  generation_job_id uuid,
  provider_task_id text,
  attempt_number integer not null default 1,

  language text not null,
  language_code text,
  lyric_mode text,
  genre text,
  music_caption text,

  lyrics text not null,
  suno_lyrics text,
  display_lyrics text,

  translation_language text,
  translation_language_code text,
  translated_lyrics text,
  translation_status text
    check (translation_status in ('ok', 'failed', 'skipped', 'pending')),
  translation_model text,
  translation_attempted_at timestamptz,
  translation_warnings jsonb,
  translation_error text,

  synced_lyrics jsonb,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists music_lyrics_word_idx
  on public.music_lyrics (word_id, created_at desc);

create index if not exists music_lyrics_user_idx
  on public.music_lyrics (user_id);

create index if not exists music_lyrics_translation_status_idx
  on public.music_lyrics (translation_status)
  where translation_status is not null;

create unique index if not exists music_lyrics_song_only_source_job_uidx
  on public.music_lyrics (source_type, source_job_id)
  where source_type = 'song_only' and source_job_id is not null;

create unique index if not exists music_lyrics_video_generation_job_uidx
  on public.music_lyrics (source_type, word_id, generation_job_id)
  where source_type = 'video_pipeline' and generation_job_id is not null;

drop trigger if exists trg_music_lyrics_updated_at on public.music_lyrics;
create trigger trg_music_lyrics_updated_at
  before update on public.music_lyrics
  for each row execute function public.set_updated_at();

alter table public.music_lyrics enable row level security;

drop policy if exists "Users read own music lyrics" on public.music_lyrics;
create policy "Users read own music lyrics"
  on public.music_lyrics for select to authenticated
  using (auth.uid() = user_id);

drop policy if exists "Service role manages music lyrics" on public.music_lyrics;
create policy "Service role manages music lyrics"
  on public.music_lyrics for all to service_role
  using (true)
  with check (true);

comment on table public.music_lyrics is
  'Canonical generated song lyrics and best-effort display translations for song-only and video pipeline music.';

notify pgrst, 'reload schema';

commit;
