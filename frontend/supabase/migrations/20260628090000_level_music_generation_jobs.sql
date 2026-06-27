begin;

alter table public.music_generation_jobs
  add column if not exists scope text not null default 'word',
  add column if not exists category_slug text,
  add column if not exists level_number integer,
  add column if not exists target_language text,
  add column if not exists target_language_code text,
  add column if not exists word_list jsonb,
  add column if not exists display_title text,
  add column if not exists lyrics text;

alter table public.music_generation_jobs
  alter column word_id drop not null;

alter table public.music_generation_jobs
  drop constraint if exists music_generation_jobs_scope_check;

alter table public.music_generation_jobs
  add constraint music_generation_jobs_scope_check
  check (scope in ('word', 'level'));

alter table public.music_generation_jobs
  drop constraint if exists music_generation_jobs_scope_fields_check;

alter table public.music_generation_jobs
  add constraint music_generation_jobs_scope_fields_check
  check (
    (
      scope = 'word'
      and word_id is not null
    )
    or
    (
      scope = 'level'
      and word_id is null
      and category_slug is not null
      and level_number is not null
      and target_language is not null
      and word_list is not null
      and jsonb_typeof(word_list) = 'array'
      and display_title is not null
    )
  );

drop index if exists public.idx_music_generation_jobs_active_word;

create unique index if not exists idx_music_generation_jobs_active_word
  on public.music_generation_jobs (word_id)
  where scope = 'word'
    and status in ('pending', 'processing', 'submitted', 'polling', 'uploading');

create unique index if not exists idx_music_generation_jobs_active_level
  on public.music_generation_jobs (user_id, category_slug, level_number, target_language)
  where scope = 'level'
    and status in ('pending', 'processing', 'submitted', 'polling', 'uploading');

create or replace function public.submit_level_music_only_job(
  p_category_slug text,
  p_level_number integer,
  p_target_language text,
  p_word_list jsonb,
  p_display_title text,
  p_lyric_mode text default 'reliable',
  p_genre text default null,
  p_vocal_gender text default 'female',
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_profile public.profiles%rowtype;
  v_existing_job public.music_generation_jobs%rowtype;
  v_job public.music_generation_jobs%rowtype;
  v_category_slug text := nullif(btrim(coalesce(p_category_slug, '')), '');
  v_target_language text := nullif(btrim(coalesce(p_target_language, '')), '');
  v_display_title text := nullif(btrim(coalesce(p_display_title, '')), '');
  v_lyric_mode text := nullif(btrim(coalesce(p_lyric_mode, '')), '');
  v_genre text := nullif(btrim(coalesce(p_genre, '')), '');
  v_vocal_gender text := nullif(btrim(coalesce(p_vocal_gender, 'female')), '');
  v_cost integer := 10;
  v_request jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0)
    );

    select *
      into v_existing_job
      from public.music_generation_jobs
     where user_id = v_user_id
       and submit_idempotency_key = p_idempotency_key
     for update;

    if found then
      return jsonb_build_object(
        'success', true,
        'idempotent', true,
        'music_job_id', v_existing_job.id,
        'status', v_existing_job.status
      );
    end if;
  end if;

  if v_category_slug is null then
    raise exception 'category_slug is required' using errcode = '22023';
  end if;

  if p_level_number is null or p_level_number < 1 then
    raise exception 'level_number is required' using errcode = '22023';
  end if;

  if v_target_language is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if v_display_title is null then
    raise exception 'display_title is required' using errcode = '22023';
  end if;

  if p_word_list is null or jsonb_typeof(p_word_list) <> 'array' then
    raise exception 'word_list must be an array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_word_list) = 0 then
    raise exception 'word_list requires entries' using errcode = '22023';
  end if;

  if exists (
    select 1
      from jsonb_array_elements(p_word_list) as item(value)
     where nullif(btrim(coalesce(
       item.value->>'target',
       item.value->>'word',
       item.value->>'term',
       ''
     )), '') is null
  ) then
    raise exception 'word_list entries require target terms' using errcode = '22023';
  end if;

  if v_lyric_mode is null then
    v_lyric_mode := 'reliable';
  end if;

  if v_lyric_mode not in ('reliable', 'contextual', 'creative', 'dramatic') then
    raise exception 'Invalid lyric mode' using errcode = '22023';
  end if;

  if v_genre is not null and lower(v_genre) = 'auto' then
    v_genre := null;
  end if;

  if v_vocal_gender is null then
    v_vocal_gender := 'female';
  end if;

  if v_vocal_gender not in ('male', 'female', 'any') then
    raise exception 'Invalid vocal gender' using errcode = '22023';
  end if;

  select *
    into v_existing_job
    from public.music_generation_jobs
   where user_id = v_user_id
     and scope = 'level'
     and category_slug = v_category_slug
     and level_number = p_level_number
     and target_language = v_target_language
     and status in ('pending', 'processing', 'submitted', 'polling', 'uploading')
   for update;

  if found then
    return jsonb_build_object(
      'success', false,
      'error', 'active_job_exists',
      'music_job_id', v_existing_job.id,
      'status', v_existing_job.status
    );
  end if;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_profile.credits < v_cost then
    return jsonb_build_object(
      'success', false,
      'error', 'insufficient_credits',
      'credits_available', v_profile.credits,
      'credits_required', v_cost
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set credits = credits - v_cost
   where id = v_user_id
     and credits >= v_cost;

  if not found then
    raise exception 'Unable to reserve song credits' using errcode = '40001';
  end if;

  v_request := jsonb_build_object(
    'scope', 'level',
    'status', 'pending',
    'category_slug', v_category_slug,
    'level_number', p_level_number,
    'target_language', v_target_language,
    'display_title', v_display_title,
    'genre', coalesce(v_genre, 'auto'),
    'lyric_mode', v_lyric_mode,
    'vocal_gender', v_vocal_gender,
    'cost_credits', v_cost,
    'requested_at', now()
  );

  insert into public.music_generation_jobs (
    user_id,
    scope,
    word_id,
    deck_id,
    category_slug,
    level_number,
    target_language,
    word_list,
    display_title,
    status,
    lyric_mode,
    genre,
    vocal_gender,
    submit_idempotency_key,
    credits_reserved,
    credits_charged,
    credits_refunded,
    metadata
  )
  values (
    v_user_id,
    'level',
    null,
    null,
    v_category_slug,
    p_level_number,
    v_target_language,
    p_word_list,
    v_display_title,
    'pending',
    v_lyric_mode,
    v_genre,
    v_vocal_gender,
    p_idempotency_key,
    v_cost,
    0,
    0,
    jsonb_build_object('request', v_request)
  )
  returning * into v_job;

  return jsonb_build_object(
    'success', true,
    'music_job_id', v_job.id,
    'idempotent', false,
    'scope', 'level'
  );
end;
$$;

create or replace function public.mark_music_only_submitted(
  p_job_id uuid,
  p_suno_task_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.music_generation_jobs%rowtype;
begin
  if nullif(btrim(coalesce(p_suno_task_id, '')), '') is null then
    raise exception 'suno_task_id is required' using errcode = '22023';
  end if;

  update public.music_generation_jobs
     set status = 'submitted',
         suno_task_id = p_suno_task_id,
         submitted_at = coalesce(submitted_at, now())
   where id = p_job_id
     and status in ('processing', 'submitted', 'polling')
   returning * into v_job;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'not_submittable'
    );
  end if;

  if v_job.scope = 'word' then
    perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

    update public.words
       set suno_task_id = p_suno_task_id,
           music_state = 'submitted',
           metadata = coalesce(metadata, '{}'::jsonb)
             || jsonb_build_object(
               'song_generation',
               coalesce(metadata->'song_generation', '{}'::jsonb)
                 || jsonb_build_object(
                   'status', 'submitted',
                   'music_job_id', v_job.id,
                   'suno_task_id', p_suno_task_id,
                   'submitted_at', now()
                 )
             )
     where id = v_job.word_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'music_job_id', v_job.id
  );
end;
$$;

create or replace function public.complete_level_music_only_job(
  p_job_id uuid,
  p_suno_audio_url text,
  p_suno_audio_url_b text,
  p_suno_storage_url text,
  p_suno_storage_url_b text,
  p_music_caption text,
  p_concept_artifact jsonb,
  p_lyrics text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.music_generation_jobs%rowtype;
  v_lyrics text;
begin
  select *
    into v_job
    from public.music_generation_jobs
   where id = p_job_id
   for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'job_not_found');
  end if;

  if v_job.scope <> 'level' then
    return jsonb_build_object('success', false, 'error', 'invalid_scope');
  end if;

  if v_job.status = 'complete' then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'music_job_id', v_job.id
    );
  end if;

  if v_job.status in ('failed', 'cancelled') then
    return jsonb_build_object(
      'success', false,
      'error', 'job_terminal',
      'status', v_job.status
    );
  end if;

  v_lyrics := coalesce(
    nullif(p_lyrics, ''),
    p_concept_artifact->>'suno_lyrics',
    p_concept_artifact->>'lyrics',
    v_job.lyrics
  );

  update public.music_generation_jobs
     set status = 'complete',
         credits_charged = credits_reserved,
         credits_refunded = 0,
         completed_at = now(),
         suno_audio_url = p_suno_audio_url,
         suno_audio_url_b = p_suno_audio_url_b,
         suno_storage_url = p_suno_storage_url,
         suno_storage_url_b = p_suno_storage_url_b,
         concept_artifact = p_concept_artifact,
         music_caption = p_music_caption,
         lyrics = v_lyrics,
         error_message = null,
         failed_step = null
   where id = v_job.id
   returning * into v_job;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'music_job_id', v_job.id
  );
end;
$$;

create or replace function public.fail_music_only_job(
  p_job_id uuid,
  p_failed_step text,
  p_error_message text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.music_generation_jobs%rowtype;
  v_music_state text;
  v_refund integer := 0;
begin
  select *
    into v_job
    from public.music_generation_jobs
   where id = p_job_id
   for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'job_not_found');
  end if;

  if v_job.status in ('failed', 'cancelled') then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'music_job_id', v_job.id,
      'credits_refunded', v_job.credits_refunded
    );
  end if;

  if v_job.status = 'complete' then
    return jsonb_build_object(
      'success', true,
      'idempotent', true,
      'music_job_id', v_job.id,
      'status', 'complete'
    );
  end if;

  if v_job.credits_charged = 0 and v_job.credits_refunded = 0 then
    v_refund := v_job.credits_reserved;
    perform set_config('app.allow_profile_privileged_update', 'on', true);

    update public.profiles
       set credits = credits + v_refund
     where id = v_job.user_id;
  end if;

  v_music_state := case
    when coalesce(p_failed_step, '') in ('download', 'upload') then 'bake_failed'
    else 'submit_failed'
  end;

  update public.music_generation_jobs
     set status = 'failed',
         failed_step = p_failed_step,
         error_message = left(coalesce(p_error_message, 'Unknown song generation failure'), 2000),
         completed_at = now(),
         credits_refunded = case
           when credits_charged = 0 and credits_refunded = 0 then credits_reserved
           else credits_refunded
         end
   where id = v_job.id
   returning * into v_job;

  if v_job.scope = 'word' then
    perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

    update public.words
       set music_state = v_music_state,
           metadata = coalesce(metadata, '{}'::jsonb)
             || jsonb_build_object(
               'song_generation',
               coalesce(metadata->'song_generation', '{}'::jsonb)
                 || jsonb_strip_nulls(jsonb_build_object(
                   'status', 'failed',
                   'music_job_id', v_job.id,
                   'failed_at', now(),
                   'failed_step', p_failed_step,
                   'error_message', left(coalesce(p_error_message, 'Unknown song generation failure'), 2000)
                 ))
             )
     where id = v_job.word_id;
  end if;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'music_job_id', v_job.id,
    'credits_refunded', v_job.credits_refunded
  );
end;
$$;

revoke all on function public.submit_level_music_only_job(text, integer, text, jsonb, text, text, text, text, text) from public, anon;
revoke all on function public.complete_level_music_only_job(uuid, text, text, text, text, text, jsonb, text) from public, anon, authenticated;
revoke all on function public.mark_music_only_submitted(uuid, text) from public, anon, authenticated;
revoke all on function public.fail_music_only_job(uuid, text, text) from public, anon, authenticated;

grant execute on function public.submit_level_music_only_job(text, integer, text, jsonb, text, text, text, text, text) to authenticated;
grant execute on function public.complete_level_music_only_job(uuid, text, text, text, text, text, jsonb, text) to service_role;
grant execute on function public.mark_music_only_submitted(uuid, text) to service_role;
grant execute on function public.fail_music_only_job(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

commit;
