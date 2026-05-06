-- Isolated song-only generation jobs.
--
-- This feature deliberately does not use generation_jobs, request_word_retry,
-- feeder, downstream_worker, assembly, or bookend. User submit goes through a
-- SECURITY DEFINER RPC that reserves/debits 10 credits up front; terminal
-- failure refunds that reservation exactly once.

begin;

create table if not exists public.music_generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  word_id uuid not null references public.words(id) on delete cascade,
  deck_id uuid references public.decks(id) on delete set null,
  status text not null default 'pending'
    check (status in (
      'pending',
      'processing',
      'submitted',
      'polling',
      'uploading',
      'complete',
      'failed',
      'cancelled'
    )),
  lyric_mode text not null
    check (lyric_mode in ('reliable', 'contextual', 'dramatic')),
  genre text,
  vocal_gender text not null default 'female'
    check (vocal_gender in ('male', 'female', 'any')),
  submit_idempotency_key text,
  suno_task_id text,
  suno_audio_url text,
  suno_audio_url_b text,
  suno_storage_url text,
  suno_storage_url_b text,
  concept_artifact jsonb,
  music_caption text,
  error_message text,
  failed_step text,
  credits_reserved integer not null default 10 check (credits_reserved >= 0),
  credits_charged integer not null default 0 check (credits_charged >= 0),
  credits_refunded integer not null default 0 check (credits_refunded >= 0),
  attempts integer not null default 0 check (attempts >= 0),
  locked_at timestamptz,
  started_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create unique index if not exists idx_music_generation_jobs_submit_idempotency
  on public.music_generation_jobs (user_id, submit_idempotency_key)
  where submit_idempotency_key is not null;

create unique index if not exists idx_music_generation_jobs_active_word
  on public.music_generation_jobs (word_id)
  where status in ('pending', 'processing', 'submitted', 'polling', 'uploading');

create index if not exists idx_music_generation_jobs_worker_poll
  on public.music_generation_jobs (status, created_at);

drop trigger if exists trg_music_generation_jobs_updated_at on public.music_generation_jobs;
create trigger trg_music_generation_jobs_updated_at
  before update on public.music_generation_jobs
  for each row execute function public.set_updated_at();

alter table public.music_generation_jobs enable row level security;

drop policy if exists "Users read own music generation jobs" on public.music_generation_jobs;
create policy "Users read own music generation jobs"
  on public.music_generation_jobs for select
  using (user_id = auth.uid() or public.is_admin());

-- No normal-user insert/update/delete policies. Mutations go through
-- SECURITY DEFINER RPCs or the service-role worker.

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

  if v_lyric_mode not in ('reliable', 'contextual', 'dramatic') then
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

create or replace function public.claim_music_only_job(p_job_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.music_generation_jobs%rowtype;
begin
  update public.music_generation_jobs
     set status = 'processing',
         locked_at = now(),
         started_at = coalesce(started_at, now()),
         attempts = attempts + 1
   where id = p_job_id
     and (
       status = 'pending'
       or (
         status = 'processing'
         and suno_task_id is null
         and locked_at < now() - interval '15 minutes'
       )
     )
   returning * into v_job;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'not_claimable'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'job', to_jsonb(v_job)
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

  return jsonb_build_object(
    'success', true,
    'music_job_id', v_job.id
  );
end;
$$;

create or replace function public.complete_music_only_job(
  p_job_id uuid,
  p_suno_audio_url text,
  p_suno_audio_url_b text,
  p_suno_storage_url text,
  p_suno_storage_url_b text,
  p_music_caption text,
  p_concept_artifact jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_job public.music_generation_jobs%rowtype;
begin
  select *
    into v_job
    from public.music_generation_jobs
   where id = p_job_id
   for update;

  if not found then
    return jsonb_build_object('success', false, 'error', 'job_not_found');
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
         error_message = null,
         failed_step = null
   where id = v_job.id
   returning * into v_job;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.words
     set suno_audio_url = p_suno_audio_url,
         suno_audio_url_b = p_suno_audio_url_b,
         suno_storage_url = p_suno_storage_url,
         suno_storage_url_b = p_suno_storage_url_b,
         suno_task_id = v_job.suno_task_id,
         music_state = 'baked',
         metadata = coalesce(metadata, '{}'::jsonb)
           || jsonb_build_object(
             'song_generation',
             coalesce(metadata->'song_generation', '{}'::jsonb)
               || jsonb_strip_nulls(jsonb_build_object(
                 'status', 'complete',
                 'completed_at', now(),
                 'music_caption', p_music_caption,
                 'music_job_id', v_job.id,
                 'suno_task_id', v_job.suno_task_id
               ))
           )
   where id = v_job.word_id;

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

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'music_job_id', v_job.id,
    'credits_refunded', v_job.credits_refunded
  );
end;
$$;

comment on table public.music_generation_jobs is
  'Isolated async song-only jobs for existing complete image/card words. Not used by the full generation pipeline.';

comment on function public.submit_music_only_job(uuid, text, text, text, text) is
  'Create an isolated song-only job for a complete word and reserve/debit 10 credits idempotently.';

comment on function public.claim_music_only_job(uuid) is
  'Service-role worker claim for pending or stale pre-submit song-only jobs.';

comment on function public.mark_music_only_submitted(uuid, text) is
  'Service-role worker transition after KIE/Suno returns a task id.';

comment on function public.complete_music_only_job(uuid, text, text, text, text, text, jsonb) is
  'Service-role worker terminal success for song-only jobs. Finalizes reserved credits without an additional debit.';

comment on function public.fail_music_only_job(uuid, text, text) is
  'Service-role worker terminal failure for song-only jobs. Refunds reserved credits exactly once when no successful charge exists.';

revoke all on function public.submit_music_only_job(uuid, text, text, text, text) from public, anon;
revoke all on function public.claim_music_only_job(uuid) from public, anon, authenticated;
revoke all on function public.mark_music_only_submitted(uuid, text) from public, anon, authenticated;
revoke all on function public.complete_music_only_job(uuid, text, text, text, text, text, jsonb) from public, anon, authenticated;
revoke all on function public.fail_music_only_job(uuid, text, text) from public, anon, authenticated;

grant execute on function public.submit_music_only_job(uuid, text, text, text, text) to authenticated;
grant execute on function public.claim_music_only_job(uuid) to service_role;
grant execute on function public.mark_music_only_submitted(uuid, text) to service_role;
grant execute on function public.complete_music_only_job(uuid, text, text, text, text, text, jsonb) to service_role;
grant execute on function public.fail_music_only_job(uuid, text, text) to service_role;

notify pgrst, 'reload schema';

commit;

