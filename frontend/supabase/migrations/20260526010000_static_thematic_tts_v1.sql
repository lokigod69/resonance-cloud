-- Static Thematic TTS V1: category-level reusable playback over guided_tts_assets.
--
-- This migration is schema/view only:
--   * no production content rows are seeded
--   * no storage objects are uploaded
--   * no provider calls are reachable from SQL
--   * guided_tts_asset_usages is intentionally unchanged

begin;

create table if not exists public.static_tts_voice_assignments (
  id                    uuid primary key default gen_random_uuid(),
  target_language_code  text not null,
  category_slug         text,
  voice_profile_key     text not null,
  label                 text,
  active                boolean not null default true,
  priority              integer not null default 100,
  audio_version         integer not null default 1,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

create index if not exists static_tts_voice_assignments_lookup
  on public.static_tts_voice_assignments (
    target_language_code, category_slug, active, priority, audio_version desc
  );

create unique index if not exists static_tts_voice_assignments_active_unique
  on public.static_tts_voice_assignments (
    target_language_code, coalesce(category_slug, ''), voice_profile_key, audio_version
  )
  where active;

alter table public.static_tts_voice_assignments enable row level security;

drop policy if exists "Public read static_tts_voice_assignments" on public.static_tts_voice_assignments;
create policy "Public read static_tts_voice_assignments"
  on public.static_tts_voice_assignments for select
  using (active = true);

create table if not exists public.static_tts_asset_usages (
  id                    uuid primary key default gen_random_uuid(),
  asset_id              uuid not null references public.guided_tts_assets(id) on delete restrict,
  target_language_code  text not null,
  category_slug         text not null,
  level_number          integer not null,
  concept_id            text not null,
  spoken_text           text not null,
  part_of_speech        text,
  sense                 text,
  voice_profile_key     text not null,
  audio_version         integer not null default 1,
  qa_status             text not null default 'pending',
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint static_tts_asset_usages_unique unique
    (target_language_code, category_slug, concept_id, voice_profile_key, audio_version),
  constraint static_tts_asset_usages_qa_status_check
    check (qa_status in ('pending', 'ready', 'approved', 'rejected', 'failed'))
);

create index if not exists static_tts_asset_usages_level_lookup
  on public.static_tts_asset_usages (target_language_code, category_slug, level_number);

create index if not exists static_tts_asset_usages_concept
  on public.static_tts_asset_usages (concept_id);

create index if not exists static_tts_asset_usages_asset
  on public.static_tts_asset_usages (asset_id);

alter table public.static_tts_asset_usages enable row level security;

drop policy if exists "Public read static_tts_asset_usages" on public.static_tts_asset_usages;
-- No direct public table read policy. Browsers consume only the
-- public.static_tts_playback view below, which omits asset_id and timestamps.

create or replace view public.static_tts_playback as
select
  u.target_language_code,
  u.category_slug,
  u.level_number,
  u.concept_id,
  u.spoken_text,
  a.public_url,
  a.duration_ms,
  u.audio_version,
  u.voice_profile_key,
  u.qa_status
from public.static_tts_asset_usages u
join public.guided_tts_assets a on a.id = u.asset_id
where a.status = 'ready'
  and a.public_url is not null
  and u.qa_status in ('ready', 'approved');

grant select on public.static_tts_playback to anon, authenticated;

notify pgrst, 'reload schema';

commit;
