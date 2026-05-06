-- Allow the Story lyric-depth mode for isolated song-only jobs.
--
-- Previous song-only MVP migration allowed Short/Phrase/Long only:
-- reliable/contextual/dramatic. The product modal now exposes the same four
-- current Niveau modes as the generate wizard, so Story/creative must be
-- accepted by both the table constraint and submit RPC validation.

begin;

alter table public.music_generation_jobs
  drop constraint if exists music_generation_jobs_lyric_mode_check;

alter table public.music_generation_jobs
  add constraint music_generation_jobs_lyric_mode_check
  check (lyric_mode in ('reliable', 'contextual', 'creative', 'dramatic'));

create or replace function public.submit_music_only_job(
  p_word_id uuid,
  p_lyric_mode text,
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
  v_word public.words%rowtype;
  v_existing_job public.music_generation_jobs%rowtype;
  v_job public.music_generation_jobs%rowtype;
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
    into v_word
    from public.words
   where id = p_word_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'Word not found or not owned by user' using errcode = '42501';
  end if;

  if v_word.current_stage <> 'complete' or v_word.status <> 'complete' then
    raise exception 'Word must be complete before song generation' using errcode = '22023';
  end if;

  if coalesce(v_word.suno_storage_url, v_word.suno_audio_url) is not null then
    return jsonb_build_object(
      'success', false,
      'error', 'already_has_song',
      'word_id', v_word.id
    );
  end if;

  select *
    into v_existing_job
    from public.music_generation_jobs
   where word_id = v_word.id
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
    'status', 'pending',
    'genre', coalesce(v_genre, 'auto'),
    'lyric_mode', v_lyric_mode,
    'vocal_gender', v_vocal_gender,
    'cost_credits', v_cost,
    'requested_at', now()
  );

  insert into public.music_generation_jobs (
    user_id,
    word_id,
    deck_id,
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
    v_word.id,
    v_word.deck_id,
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

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.words
     set music_state = 'pending',
         metadata = coalesce(metadata, '{}'::jsonb)
           || jsonb_build_object(
             'song_generation',
             v_request || jsonb_build_object('music_job_id', v_job.id)
           )
   where id = v_word.id
     and user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'music_job_id', v_job.id,
    'idempotent', false
  );
end;
$$;

comment on function public.submit_music_only_job(uuid, text, text, text, text) is
  'Create an isolated song-only job for a complete word and reserve/debit 10 credits idempotently. Allows reliable/contextual/creative/dramatic lyric modes.';

revoke all on function public.submit_music_only_job(uuid, text, text, text, text) from public, anon;
grant execute on function public.submit_music_only_job(uuid, text, text, text, text) to authenticated;

notify pgrst, 'reload schema';

commit;

