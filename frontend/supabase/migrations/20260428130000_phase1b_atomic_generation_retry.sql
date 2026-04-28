-- Phase 1B atomic generation submit and retry commands.
--
-- Phase 1A blocks ordinary users from updating privileged profile fields.
-- These RPCs replace the browser's old direct profiles.credits writes while
-- leaving decks, words, and generation_jobs policies otherwise unchanged.

begin;

alter table public.generation_jobs
  add column if not exists submit_idempotency_key text;

create unique index if not exists idx_generation_jobs_submit_idempotency
  on public.generation_jobs (user_id, submit_idempotency_key)
  where submit_idempotency_key is not null;

create or replace function public.submit_generation(
  p_deck_payload jsonb,
  p_word_list text[],
  p_job_payload jsonb,
  p_existing_deck_id uuid default null,
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
  v_deck public.decks%rowtype;
  v_deck_id uuid;
  v_job_id uuid;
  v_word_count integer := coalesce(array_length(p_word_list, 1), 0);
  v_word text;
  v_existing_job public.generation_jobs%rowtype;
  v_target_language text;
  v_art_style text;
  v_movie_override text;
  v_settings_override jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_word_count <= 0 then
    raise exception 'At least one word is required' using errcode = '22023';
  end if;

  if p_idempotency_key is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(v_user_id::text || ':' || p_idempotency_key, 0)
    );

    select *
      into v_existing_job
      from public.generation_jobs
     where user_id = v_user_id
       and submit_idempotency_key = p_idempotency_key
     for update;

    if found then
      return jsonb_build_object(
        'success', true,
        'idempotent', true,
        'deck_id', v_existing_job.deck_id,
        'job_id', v_existing_job.id
      );
    end if;
  end if;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_profile.credits < v_word_count then
    return jsonb_build_object(
      'success', false,
      'error', format(
        'Not enough credits. You have %s but need %s.',
        v_profile.credits,
        v_word_count
      )
    );
  end if;

  v_target_language := nullif(p_job_payload->>'target_language', '');
  v_art_style := nullif(p_job_payload->>'art_style', '');
  v_movie_override := nullif(p_job_payload->>'movie_override', '');
  v_settings_override := coalesce(p_job_payload->'settings_override', '{}'::jsonb);

  if v_target_language is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if p_existing_deck_id is not null then
    select *
      into v_deck
      from public.decks
     where id = p_existing_deck_id
       and user_id = v_user_id
     for update;

    if not found then
      raise exception 'Deck not found or not owned by user' using errcode = '42501';
    end if;

    v_deck_id := v_deck.id;
  else
    insert into public.decks (
      user_id,
      name,
      target_language,
      art_style,
      movie_override,
      word_count,
      status
    )
    values (
      v_user_id,
      coalesce(nullif(p_deck_payload->>'name', ''), v_target_language || ' Deck'),
      v_target_language,
      v_art_style,
      v_movie_override,
      v_word_count,
      'generating'
    )
    returning * into v_deck;

    v_deck_id := v_deck.id;
  end if;

  insert into public.generation_jobs (
    user_id,
    deck_id,
    status,
    target_language,
    art_style,
    movie_override,
    words_total,
    settings_override,
    submit_idempotency_key
  )
  values (
    v_user_id,
    v_deck_id,
    'pending',
    v_target_language,
    v_art_style,
    v_movie_override,
    v_word_count,
    v_settings_override,
    p_idempotency_key
  )
  returning id into v_job_id;

  foreach v_word in array p_word_list
  loop
    if nullif(btrim(v_word), '') is null then
      raise exception 'Words cannot be blank' using errcode = '22023';
    end if;

    insert into public.words (
      deck_id,
      user_id,
      word,
      status,
      current_stage
    )
    values (
      v_deck_id,
      v_user_id,
      btrim(v_word),
      'pending',
      'pre_bootstrap'
    );
  end loop;

  update public.decks
     set status = 'generating',
         word_count = case
           when p_existing_deck_id is null then v_word_count
           else word_count + v_word_count
         end,
         updated_at = now()
   where id = v_deck_id
     and user_id = v_user_id;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set credits = credits - v_word_count
   where id = v_user_id
     and credits >= v_word_count;

  if not found then
    raise exception 'Unable to debit generation credits' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'deck_id', v_deck_id,
    'job_id', v_job_id
  );
end;
$$;

create or replace function public.request_word_retry(
  p_word_id uuid,
  p_retry_scope text default 'word'
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
  v_deck public.decks%rowtype;
  v_scope text := coalesce(nullif(p_retry_scope, ''), 'word');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
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

  select *
    into v_deck
    from public.decks
   where id = v_word.deck_id
     and user_id = v_user_id
   for update;

  if not found then
    raise exception 'Deck not found or not owned by user' using errcode = '42501';
  end if;

  if v_word.retry_requested then
    return jsonb_build_object(
      'success', true,
      'already_requested', true,
      'deck_id', v_word.deck_id,
      'word_id', v_word.id
    );
  end if;

  if v_scope = 'music' then
    if v_word.current_stage not in ('complete', 'post_video_queued') then
      raise exception 'Word is not in a retryable music state' using errcode = '22023';
    end if;
  else
    if v_word.current_stage <> 'failed' then
      raise exception 'Word is not in a retryable failed state' using errcode = '22023';
    end if;
  end if;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_profile.credits < 1 then
    return jsonb_build_object(
      'success', false,
      'error', 'Not enough credits. You need 1 credit to retry.'
    );
  end if;

  if v_scope = 'music' then
    update public.words
       set music_state = 'pending',
           suno_task_id = null,
           suno_audio_url = null,
           suno_audio_url_b = null,
           suno_storage_url = null,
           suno_storage_url_b = null,
           failed_stage = null,
           retry_requested = true,
           retry_requested_at = now()
     where id = v_word.id
       and user_id = v_user_id
       and retry_requested = false
       and current_stage in ('complete', 'post_video_queued');
  else
    update public.words
       set retry_requested = true,
           retry_requested_at = now(),
           error_message = null
     where id = v_word.id
       and user_id = v_user_id
       and retry_requested = false
       and current_stage = 'failed';
  end if;

  if not found then
    return jsonb_build_object(
      'success', true,
      'already_requested', true,
      'deck_id', v_word.deck_id,
      'word_id', v_word.id
    );
  end if;

  perform set_config('app.allow_profile_privileged_update', 'on', true);

  update public.profiles
     set credits = credits - 1
   where id = v_user_id
     and credits >= 1;

  if not found then
    raise exception 'Unable to debit retry credit' using errcode = '40001';
  end if;

  update public.decks
     set status = 'generating',
         updated_at = now()
   where id = v_word.deck_id
     and user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'already_requested', false,
    'deck_id', v_word.deck_id,
    'word_id', v_word.id
  );
end;
$$;

comment on function public.submit_generation(jsonb, text[], jsonb, uuid, text) is
  'Atomic user generation submit: validates ownership and credits, creates deck/words/job, and debits credits.';

comment on function public.request_word_retry(uuid, text) is
  'Atomic user retry request: validates ownership/state and debits one credit while setting retry flags.';

revoke all on function public.submit_generation(jsonb, text[], jsonb, uuid, text) from public, anon;
revoke all on function public.request_word_retry(uuid, text) from public, anon;
grant execute on function public.submit_generation(jsonb, text[], jsonb, uuid, text) to authenticated;
grant execute on function public.request_word_retry(uuid, text) to authenticated;

commit;
