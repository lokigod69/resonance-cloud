-- Gemini TTS voice-sample cache: storage bucket + lookup table
-- Samples are short pre-rendered WAV clips of a voice + character-mode + language
-- combination, played inline in the Gemini two-stage voice picker.

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

insert into storage.buckets (id, name, public)
values ('voice-samples', 'voice-samples', true)
on conflict (id) do nothing;

-- Public read access — samples are non-sensitive short clips
create policy "Public read voice-samples"
  on storage.objects for select
  using (bucket_id = 'voice-samples');

-- Admin-only insert — samples are generated server-side via the service role
create policy "Admin insert voice-samples"
  on storage.objects for insert
  with check (bucket_id = 'voice-samples' and public.is_admin());

-- Admin-only delete — manual invalidation when prompts are edited
create policy "Admin delete voice-samples"
  on storage.objects for delete
  using (bucket_id = 'voice-samples' and public.is_admin());

-- ============================================================================
-- LOOKUP TABLE
-- ============================================================================

create table if not exists public.voice_samples (
  voice_name        text        not null,
  language          text        not null,
  character_mode_id text        not null,
  version           integer     not null default 1,
  storage_url       text        not null,
  invalidated_at    timestamptz,
  created_at        timestamptz not null default now(),
  primary key (voice_name, language, character_mode_id, version)
);

-- Partial index: active samples only, accelerates the common lookup
create index if not exists idx_voice_samples_active
  on public.voice_samples(character_mode_id, language)
  where invalidated_at is null;

alter table public.voice_samples enable row level security;

create policy "Anyone can read voice_samples"
  on public.voice_samples for select
  using (true);

create policy "Admin insert voice_samples"
  on public.voice_samples for insert
  with check (public.is_admin());

create policy "Admin update voice_samples"
  on public.voice_samples for update
  using (public.is_admin());

create policy "Admin delete voice_samples"
  on public.voice_samples for delete
  using (public.is_admin());
