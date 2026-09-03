-- Platform hardening audit 2026-09-03, findings B-02 (High), B-08 (Medium),
-- I-1 (High, word_slug as worker path) and I-2 (High, suno_audio_url SSRF).
--
-- Owners may UPDATE their own decks / generation_jobs / words rows, and the
-- Phase 1E triggers (20260502160000) guard only pipeline-progress columns.
-- The runner re-reads decks.deck_type and generation_jobs.settings_override at
-- bootstrap, so a job priced as 1-credit cards could be flipped to 10-credit
-- video (or gpt_image_2 / premium modes) after paying. Words could likewise be
-- re-parented across decks/jobs or have metadata.visual_card_plan seeded to
-- steer a paid render.
--
-- Legitimate direct client updates at audit time: none on decks or
-- generation_jobs; on words only word/translation/ipa (useEditImagelessCard)
-- and tts_audio_url/tts_status/tts_generated_at (curriculumDeckBridge). All of
-- those stay allowed. Admins, the service role and the flagged RPCs remain
-- trusted through phase1e_is_trusted_mutation().

begin;

create or replace function public.phase1e_protect_deck_pipeline_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.word_count is distinct from old.word_count
     or new.status is distinct from old.status
     -- pricing / routing fields (audit 2026-09-03 B-02)
     or new.deck_type is distinct from old.deck_type
     or new.user_id is distinct from old.user_id
     or new.target_language is distinct from old.target_language
     or new.source_kind is distinct from old.source_kind
     or new.curriculum_category_slug is distinct from old.curriculum_category_slug
     or new.curriculum_level is distinct from old.curriculum_level then
    raise exception 'Direct updates to worker-owned deck fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1e_protect_deck_pipeline_fields on public.decks;
create trigger phase1e_protect_deck_pipeline_fields
before update on public.decks
for each row
execute function public.phase1e_protect_deck_pipeline_fields();

-- generation_jobs has no legitimate direct client update at all: deny every
-- non-trusted update instead of enumerating columns.
create or replace function public.phase1e_protect_generation_job_pipeline_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  raise exception 'Direct updates to generation jobs are not allowed'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1e_protect_generation_job_pipeline_fields on public.generation_jobs;
create trigger phase1e_protect_generation_job_pipeline_fields
before update on public.generation_jobs
for each row
execute function public.phase1e_protect_generation_job_pipeline_fields();

create or replace function public.phase1e_protect_words_pipeline_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.current_stage is distinct from old.current_stage
     or new.video_url is distinct from old.video_url
     or new.thumbnail_url is distinct from old.thumbnail_url
     or new.video_url_b is distinct from old.video_url_b
     or new.thumbnail_url_b is distinct from old.thumbnail_url_b
     or new.music_state is distinct from old.music_state
     or new.retry_requested is distinct from old.retry_requested
     or new.failed_stage is distinct from old.failed_stage
     or new.stage_attempts is distinct from old.stage_attempts
     or new.total_stage_attempts is distinct from old.total_stage_attempts
     or new.stage_started_at is distinct from old.stage_started_at
     -- ownership / pipeline-input fields (audit 2026-09-03 B-08, I-1, I-2):
     -- word_slug is used verbatim by the service-role workers as a workspace
     -- and storage path, and suno_audio_url is downloaded, re-hosted and fed
     -- to ffmpeg — neither may be user-writable.
     or new.word_slug is distinct from old.word_slug
     or new.deck_id is distinct from old.deck_id
     or new.generation_job_id is distinct from old.generation_job_id
     or new.user_id is distinct from old.user_id
     or new.metadata is distinct from old.metadata
     or new.original_input is distinct from old.original_input
     or new.curriculum_entry_term is distinct from old.curriculum_entry_term
     or new.suno_task_id is distinct from old.suno_task_id
     or new.suno_audio_url is distinct from old.suno_audio_url
     or new.suno_audio_url_b is distinct from old.suno_audio_url_b
     or new.suno_storage_url is distinct from old.suno_storage_url
     or new.suno_storage_url_b is distinct from old.suno_storage_url_b then
    raise exception 'Direct updates to worker-owned word fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1e_protect_words_pipeline_fields on public.words;
create trigger phase1e_protect_words_pipeline_fields
before update on public.words
for each row
execute function public.phase1e_protect_words_pipeline_fields();

notify pgrst, 'reload schema';

commit;
