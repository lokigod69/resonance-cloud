-- Pronunciation Audio V1.0: cached target-headword TTS for card decks only.
-- Scope is intentionally tight: no base-translation audio, no user voice prefs,
-- no backfill, and no bookend/video pipeline schema changes.

begin;

-- ---------------------------------------------------------------------------
-- Words: denormalized current pronunciation for fast card reads
-- ---------------------------------------------------------------------------

alter table public.words
  add column if not exists tts_audio_url text,
  add column if not exists tts_status text
    check (tts_status is null or tts_status in ('ready', 'failed')),
  add column if not exists tts_voice_id text,
  add column if not exists tts_generated_at timestamptz;

-- ---------------------------------------------------------------------------
-- Storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('tts-pronunciations', 'tts-pronunciations', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read tts-pronunciations" on storage.objects;
create policy "Public read tts-pronunciations"
  on storage.objects for select
  using (bucket_id = 'tts-pronunciations');

drop policy if exists "Service role insert tts-pronunciations" on storage.objects;
create policy "Service role insert tts-pronunciations"
  on storage.objects for insert
  with check (bucket_id = 'tts-pronunciations' and auth.role() = 'service_role');

drop policy if exists "Service role update tts-pronunciations" on storage.objects;
create policy "Service role update tts-pronunciations"
  on storage.objects for update
  using (bucket_id = 'tts-pronunciations' and auth.role() = 'service_role')
  with check (bucket_id = 'tts-pronunciations' and auth.role() = 'service_role');

drop policy if exists "Service role delete tts-pronunciations" on storage.objects;
create policy "Service role delete tts-pronunciations"
  on storage.objects for delete
  using (bucket_id = 'tts-pronunciations' and auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- Shared TTS cache
-- ---------------------------------------------------------------------------

create table if not exists public.tts_assets (
  id uuid primary key default gen_random_uuid(),
  language_code text not null,
  provider text not null default 'elevenlabs',
  provider_voice_id text not null,
  model_id text,
  spoken_text text not null,
  spoken_text_hash text not null,
  audio_url text not null,
  storage_bucket text not null default 'tts-pronunciations',
  storage_path text not null,
  content_type text not null default 'audio/mpeg',
  created_at timestamptz not null default now(),
  constraint tts_assets_provider_check check (provider = 'elevenlabs')
);

create unique index if not exists idx_tts_assets_cache_key
  on public.tts_assets (language_code, provider, provider_voice_id, spoken_text_hash);

create index if not exists idx_tts_assets_created_at
  on public.tts_assets (created_at desc);

alter table public.tts_assets enable row level security;

drop policy if exists "Public read tts_assets" on public.tts_assets;
create policy "Public read tts_assets"
  on public.tts_assets for select
  using (true);

-- Intentionally no INSERT/UPDATE/DELETE policies. Worker writes use service role.

-- ---------------------------------------------------------------------------
-- Per-word attachment
-- ---------------------------------------------------------------------------

create table if not exists public.word_tts_assets (
  id uuid primary key default gen_random_uuid(),
  word_id uuid not null references public.words(id) on delete cascade,
  tts_asset_id uuid not null references public.tts_assets(id) on delete restrict,
  role text not null,
  created_at timestamptz not null default now(),
  constraint word_tts_assets_role_check check (role = 'target_headword')
);

create unique index if not exists idx_word_tts_assets_word_role
  on public.word_tts_assets (word_id, role);

create index if not exists idx_word_tts_assets_asset
  on public.word_tts_assets (tts_asset_id);

alter table public.word_tts_assets enable row level security;

drop policy if exists "Users read own word_tts_assets" on public.word_tts_assets;
create policy "Users read own word_tts_assets"
  on public.word_tts_assets for select
  using (
    exists (
      select 1
      from public.words w
      where w.id = word_tts_assets.word_id
        and (w.user_id = auth.uid() or public.is_admin())
    )
  );

-- Intentionally no INSERT/UPDATE/DELETE policies. Worker writes use service role.

commit;
