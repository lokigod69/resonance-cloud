-- Guided Today TTS V1: schema scaffolding for the ElevenLabs + Supabase pipeline.
--
-- See docs/Product/GUIDED_TODAY_TTS_ELEVENLABS_SUPABASE_ARCHITECTURE_2026_05_15.md.
--
-- This migration is intentionally schema-only:
--   * No content rows are seeded.
--   * No voice profiles are activated.
--   * No storage objects are uploaded.
--   * No provider calls are reachable from here.
--
-- The companion `voice` library (public.voices) is unchanged and remains the
-- raw provider voice library. Guided Today routes voices through the new
-- `guided_voice_profiles` table.

begin;

-- ---------------------------------------------------------------------------
-- Storage bucket: public-read, service-role-write.
-- Mirrors the policy shape from `tts-pronunciations`
-- (20260509030000_pronunciation_audio_v1.sql).
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public)
values ('guided-tts', 'guided-tts', true)
on conflict (id) do update set public = excluded.public;

drop policy if exists "Public read guided-tts" on storage.objects;
create policy "Public read guided-tts"
  on storage.objects for select
  using (bucket_id = 'guided-tts');

drop policy if exists "Service role insert guided-tts" on storage.objects;
create policy "Service role insert guided-tts"
  on storage.objects for insert
  with check (bucket_id = 'guided-tts' and auth.role() = 'service_role');

drop policy if exists "Service role update guided-tts" on storage.objects;
create policy "Service role update guided-tts"
  on storage.objects for update
  using (bucket_id = 'guided-tts' and auth.role() = 'service_role')
  with check (bucket_id = 'guided-tts' and auth.role() = 'service_role');

drop policy if exists "Service role delete guided-tts" on storage.objects;
create policy "Service role delete guided-tts"
  on storage.objects for delete
  using (bucket_id = 'guided-tts' and auth.role() = 'service_role');

-- ---------------------------------------------------------------------------
-- guided_voice_profiles
-- Maps (target_language_code, vibe, optional path/lesson/surface) to one
-- active provider_voice_id plus model and voice settings. Hierarchical
-- resolution is handled in application code (see src/services/guided_tts/).
-- ---------------------------------------------------------------------------

create table if not exists public.guided_voice_profiles (
  id                    uuid primary key default gen_random_uuid(),
  voice_profile_key     text not null,
  provider              text not null default 'elevenlabs',
  target_language_code  text not null,
  vibe                  text,
  scope_path_id         text,
  scope_lesson_id       text,
  scope_surface         text,
  provider_voice_id     text not null,
  provider_model_id     text not null default 'eleven_flash_v2_5',
  output_format         text not null default 'mp3_44100_128',
  voice_settings        jsonb not null default
    '{"stability":0.75,"similarity_boost":0.75,"style":0.0,"use_speaker_boost":true}'::jsonb,
  voice_settings_hash   text not null,
  assignment_version    integer not null default 1,
  active                boolean not null default false,
  priority              integer not null default 100,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint guided_voice_profiles_provider_check
    check (provider = 'elevenlabs'),
  constraint guided_voice_profiles_vibe_check
    check (vibe is null or vibe in ('bright', 'wistful', 'sharp')),
  constraint guided_voice_profiles_settings_object
    check (jsonb_typeof(voice_settings) = 'object')
);

create unique index if not exists guided_voice_profiles_key_active
  on public.guided_voice_profiles (voice_profile_key)
  where active;

create index if not exists guided_voice_profiles_resolution
  on public.guided_voice_profiles (
    target_language_code, vibe, scope_path_id, scope_lesson_id, scope_surface, active
  );

alter table public.guided_voice_profiles enable row level security;

drop policy if exists "Admins read guided_voice_profiles" on public.guided_voice_profiles;
create policy "Admins read guided_voice_profiles"
  on public.guided_voice_profiles for select
  using (public.is_admin());

-- No INSERT/UPDATE/DELETE policies. Writes go through the audited RPC below
-- or service role.

-- ---------------------------------------------------------------------------
-- guided_tts_assets
-- One row per (voice profile, normalized text). The cache key column is a
-- pre-computed deterministic surrogate that prevents accidental duplicates.
-- ---------------------------------------------------------------------------

create table if not exists public.guided_tts_assets (
  id                     uuid primary key default gen_random_uuid(),
  provider               text not null default 'elevenlabs',
  target_language_code   text not null,
  voice_profile_key      text not null,
  provider_voice_id      text not null,
  provider_model_id      text not null,
  output_format          text not null,
  voice_settings_hash    text not null,
  normalization_version  text not null,
  text                   text not null,
  normalized_text        text not null,
  text_hash              text not null,
  cache_key              text not null,
  storage_bucket         text not null default 'guided-tts',
  storage_path           text not null,
  public_url             text,
  content_type           text not null default 'audio/mpeg',
  duration_ms            integer,
  character_count        integer not null,
  status                 text not null default 'pending',
  error                  text,
  provider_request_id    text,
  content_commit_sha     text,
  generated_at           timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now(),
  constraint guided_tts_assets_provider_check
    check (provider = 'elevenlabs'),
  constraint guided_tts_assets_status_check
    check (status in ('pending', 'generating', 'ready', 'failed', 'archived'))
);

create unique index if not exists guided_tts_assets_cache_key
  on public.guided_tts_assets (cache_key);

create index if not exists guided_tts_assets_status
  on public.guided_tts_assets (status);

create index if not exists guided_tts_assets_voice_profile_key
  on public.guided_tts_assets (voice_profile_key);

alter table public.guided_tts_assets enable row level security;

drop policy if exists "Public read ready guided_tts_assets" on public.guided_tts_assets;
create policy "Public read ready guided_tts_assets"
  on public.guided_tts_assets for select
  using (status = 'ready');

-- Service role writes only; no INSERT/UPDATE/DELETE policies.

-- ---------------------------------------------------------------------------
-- guided_tts_asset_usages
-- Records which (path, lesson, vibe, surface, surface_key) consumes which
-- asset. Many lessons can share one asset.
-- ---------------------------------------------------------------------------

create table if not exists public.guided_tts_asset_usages (
  id            uuid primary key default gen_random_uuid(),
  asset_id      uuid not null references public.guided_tts_assets(id) on delete restrict,
  path_id       text not null,
  lesson_id     text not null,
  lesson_number integer not null,
  vibe          text not null,
  surface       text not null,
  surface_key   text not null,
  source_text   text not null,
  created_at    timestamptz not null default now(),
  constraint guided_tts_asset_usages_unique unique
    (path_id, lesson_id, vibe, surface, surface_key),
  constraint guided_tts_asset_usages_vibe_check
    check (vibe in ('bright', 'wistful', 'sharp')),
  constraint guided_tts_asset_usages_surface_check
    check (surface in ('corePhrase', 'chunk', 'trophyWord', 'speakTarget'))
);

create index if not exists guided_tts_asset_usages_asset
  on public.guided_tts_asset_usages (asset_id);

create index if not exists guided_tts_asset_usages_lookup
  on public.guided_tts_asset_usages (path_id, lesson_id, vibe, surface);

alter table public.guided_tts_asset_usages enable row level security;

drop policy if exists "Public read guided_tts_asset_usages" on public.guided_tts_asset_usages;
create policy "Public read guided_tts_asset_usages"
  on public.guided_tts_asset_usages for select
  using (true);

-- Service role writes only; no INSERT/UPDATE/DELETE policies.

-- ---------------------------------------------------------------------------
-- guided_tts_generation_runs
-- Audit + dry-run-before-spend gate. Phase 1 has no commit code path; the
-- table exists so the inventory script and future workers can record what
-- they were asked to do.
-- ---------------------------------------------------------------------------

create table if not exists public.guided_tts_generation_runs (
  id                    uuid primary key default gen_random_uuid(),
  requested_by          uuid references auth.users(id) on delete set null,
  scope                 jsonb not null default '{}'::jsonb,
  dry_run               boolean not null default true,
  status                text not null default 'pending',
  total_assets          integer not null default 0,
  missing_assets        integer not null default 0,
  generated_assets      integer not null default 0,
  skipped_assets        integer not null default 0,
  failed_assets         integer not null default 0,
  total_character_count integer not null default 0,
  notes                 text,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now(),
  constraint guided_tts_generation_runs_status_check
    check (status in ('pending', 'running', 'completed', 'failed', 'cancelled')),
  constraint guided_tts_generation_runs_scope_object
    check (jsonb_typeof(scope) = 'object')
);

create index if not exists guided_tts_generation_runs_status
  on public.guided_tts_generation_runs (status, created_at desc);

alter table public.guided_tts_generation_runs enable row level security;

drop policy if exists "Admins read guided_tts_generation_runs" on public.guided_tts_generation_runs;
create policy "Admins read guided_tts_generation_runs"
  on public.guided_tts_generation_runs for select
  using (public.is_admin());

-- Service role writes only.

-- ---------------------------------------------------------------------------
-- Playback view consumed by /today. Only exposes status='ready' rows and
-- joins on the usages table so the frontend never sees voice IDs or settings.
-- ---------------------------------------------------------------------------

create or replace view public.guided_tts_playback as
select
  u.path_id,
  u.lesson_id,
  u.vibe,
  u.surface,
  u.surface_key,
  a.public_url,
  a.duration_ms,
  a.status
from public.guided_tts_asset_usages u
join public.guided_tts_assets a on a.id = u.asset_id
where a.status = 'ready';

grant select on public.guided_tts_playback to anon, authenticated;

-- ---------------------------------------------------------------------------
-- admin_upsert_guided_voice_profile
-- Audited insert/update of a single profile. Caller must be admin.
-- ---------------------------------------------------------------------------

create or replace function public.admin_upsert_guided_voice_profile(
  p_profile_id           uuid,
  p_voice_profile_key    text,
  p_target_language_code text,
  p_vibe                 text,
  p_scope_path_id        text,
  p_scope_lesson_id      text,
  p_scope_surface        text,
  p_provider_voice_id    text,
  p_provider_model_id    text,
  p_output_format        text,
  p_voice_settings       jsonb,
  p_voice_settings_hash  text,
  p_assignment_version   integer,
  p_active               boolean,
  p_priority             integer,
  p_notes                text,
  p_reason               text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.guided_voice_profiles%rowtype;
  v_after  public.guided_voice_profiles%rowtype;
  v_key text := nullif(btrim(coalesce(p_voice_profile_key, '')), '');
  v_lang text := nullif(btrim(coalesce(p_target_language_code, '')), '');
  v_voice_id text := nullif(btrim(coalesce(p_provider_voice_id, '')), '');
  v_model text := nullif(btrim(coalesce(p_provider_model_id, '')), '');
  v_format text := nullif(btrim(coalesce(p_output_format, '')), '');
  v_settings jsonb := coalesce(p_voice_settings, '{}'::jsonb);
  v_settings_hash text := nullif(btrim(coalesce(p_voice_settings_hash, '')), '');
begin
  if v_key is null then
    raise exception 'voice_profile_key is required' using errcode = '22023';
  end if;

  if v_lang is null then
    raise exception 'target_language_code is required' using errcode = '22023';
  end if;

  if v_voice_id is null then
    raise exception 'provider_voice_id is required' using errcode = '22023';
  end if;

  if v_model is null then
    raise exception 'provider_model_id is required' using errcode = '22023';
  end if;

  if v_format is null then
    raise exception 'output_format is required' using errcode = '22023';
  end if;

  if v_settings_hash is null then
    raise exception 'voice_settings_hash is required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_settings) is distinct from 'object' then
    raise exception 'voice_settings must be a JSON object' using errcode = '22023';
  end if;

  if p_vibe is not null and p_vibe not in ('bright', 'wistful', 'sharp') then
    raise exception 'vibe must be one of bright, wistful, sharp, or null' using errcode = '22023';
  end if;

  if p_profile_id is null then
    insert into public.guided_voice_profiles (
      voice_profile_key,
      target_language_code,
      vibe,
      scope_path_id,
      scope_lesson_id,
      scope_surface,
      provider_voice_id,
      provider_model_id,
      output_format,
      voice_settings,
      voice_settings_hash,
      assignment_version,
      active,
      priority,
      notes
    ) values (
      v_key,
      v_lang,
      p_vibe,
      nullif(btrim(coalesce(p_scope_path_id, '')), ''),
      nullif(btrim(coalesce(p_scope_lesson_id, '')), ''),
      nullif(btrim(coalesce(p_scope_surface, '')), ''),
      v_voice_id,
      v_model,
      v_format,
      v_settings,
      v_settings_hash,
      coalesce(p_assignment_version, 1),
      coalesce(p_active, false),
      coalesce(p_priority, 100),
      nullif(btrim(coalesce(p_notes, '')), '')
    )
    returning * into v_after;
  else
    select *
      into v_before
      from public.guided_voice_profiles
     where id = p_profile_id
     for update;

    if not found then
      raise exception 'Guided voice profile not found' using errcode = 'P0002';
    end if;

    update public.guided_voice_profiles
       set voice_profile_key    = v_key,
           target_language_code = v_lang,
           vibe                 = p_vibe,
           scope_path_id        = nullif(btrim(coalesce(p_scope_path_id, '')), ''),
           scope_lesson_id      = nullif(btrim(coalesce(p_scope_lesson_id, '')), ''),
           scope_surface        = nullif(btrim(coalesce(p_scope_surface, '')), ''),
           provider_voice_id    = v_voice_id,
           provider_model_id    = v_model,
           output_format        = v_format,
           voice_settings       = v_settings,
           voice_settings_hash  = v_settings_hash,
           assignment_version   = coalesce(p_assignment_version, v_before.assignment_version),
           active               = coalesce(p_active, v_before.active),
           priority             = coalesce(p_priority, v_before.priority),
           notes                = nullif(btrim(coalesce(p_notes, '')), ''),
           updated_at           = now()
     where id = p_profile_id
     returning * into v_after;
  end if;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_upsert_guided_voice_profile',
    'guided_voice_profiles',
    v_after.id::text,
    p_reason,
    case when p_profile_id is null then null else to_jsonb(v_before) end,
    to_jsonb(v_after),
    jsonb_build_object('created', p_profile_id is null)
  );

  return jsonb_build_object(
    'id', v_after.id,
    'voice_profile_key', v_after.voice_profile_key,
    'target_language_code', v_after.target_language_code,
    'vibe', v_after.vibe,
    'provider_voice_id', v_after.provider_voice_id,
    'provider_model_id', v_after.provider_model_id,
    'output_format', v_after.output_format,
    'voice_settings_hash', v_after.voice_settings_hash,
    'active', v_after.active,
    'priority', v_after.priority,
    'assignment_version', v_after.assignment_version
  );
end;
$$;

revoke all on function public.admin_upsert_guided_voice_profile(
  uuid, text, text, text, text, text, text, text, text, text, jsonb, text,
  integer, boolean, integer, text, text
) from public, anon;

grant execute on function public.admin_upsert_guided_voice_profile(
  uuid, text, text, text, text, text, text, text, text, text, jsonb, text,
  integer, boolean, integer, text, text
) to authenticated;

notify pgrst, 'reload schema';

commit;
