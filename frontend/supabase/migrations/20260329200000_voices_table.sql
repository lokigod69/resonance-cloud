-- Voices: shared ElevenLabs voice registry for bookend TTS pronunciation
create table if not exists public.voices (
  id uuid primary key default gen_random_uuid(),
  voice_id text not null,
  name text not null,
  language text not null default '',
  language_code text not null default '',
  notes text not null default '',
  created_at timestamptz not null default now()
);

create index idx_voices_language on public.voices(language);
create unique index idx_voices_voice_id on public.voices(voice_id);

alter table public.voices enable row level security;

-- All authenticated users can read voices (shared resource)
create policy "Anyone can read voices"
  on public.voices for select
  using (true);

-- Only admins can insert voices
create policy "Admin insert voices"
  on public.voices for insert
  with check (public.is_admin());

-- Only admins can update voices
create policy "Admin update voices"
  on public.voices for update
  using (public.is_admin());

-- Only admins can delete voices
create policy "Admin delete voices"
  on public.voices for delete
  using (public.is_admin());
