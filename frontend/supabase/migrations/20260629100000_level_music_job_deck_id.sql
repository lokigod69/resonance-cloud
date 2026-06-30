-- Manual apply only: run this single file in the Supabase SQL editor.
-- Do not use supabase db push for this project drift boundary.

begin;

drop function if exists public.submit_level_music_only_job(text, integer, text, jsonb, text, text, text, text, text);

create or replace function public.submit_level_music_only_job(
  p_category_slug text,
  p_level_number integer,
  p_target_language text,
  p_word_list jsonb,
  p_display_title text,
  p_lyric_mode text default 'reliable',
  p_genre text default null,
  p_vocal_gender text default 'female',
  p_idempotency_key text default null,
  p_deck_id uuid default null
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
  v_existing_job public.music_generation_jobs%rowtype;
  v_job public.music_generation_jobs%rowtype;
  v_category_slug text := nullif(btrim(coalesce(p_category_slug, '')), '');
  v_target_language text := nullif(btrim(coalesce(p_target_language, '')), '');
  v_display_title text := nullif(btrim(coalesce(p_display_title, '')), '');
  v_lyric_mode text := nullif(btrim(coalesce(p_lyric_mode, '')), '');
  v_genre text := nullif(btrim(coalesce(p_genre, '')), '');
  v_vocal_gender text := nullif(btrim(coalesce(p_vocal_gender, 'female')), '');
  v_deck_id uuid := null;
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
      if p_deck_id is not null and v_existing_job.deck_id is distinct from p_deck_id then
        raise exception 'Deck does not match level song request' using errcode = '22023';
      end if;

      return jsonb_build_object(
        'success', true,
        'idempotent', true,
        'music_job_id', v_existing_job.id,
        'deck_id', v_existing_job.deck_id,
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

  if p_deck_id is not null then
    select *
      into v_deck
      from public.decks
     where id = p_deck_id
       and user_id = v_user_id;

    if not found then
      raise exception 'Deck not found or not owned by user' using errcode = '42501';
    end if;

    if v_deck.source_kind is distinct from 'curriculum'
       or v_deck.curriculum_category_slug is distinct from v_category_slug
       or v_deck.curriculum_level is distinct from p_level_number
       or v_deck.target_language is distinct from v_target_language then
      raise exception 'Deck does not match level song request' using errcode = '22023';
    end if;

    v_deck_id := v_deck.id;
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
      'deck_id', v_existing_job.deck_id,
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
    'deck_id', v_deck_id,
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
    v_deck_id,
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
    'deck_id', v_job.deck_id,
    'idempotent', false,
    'scope', 'level'
  );
end;
$$;

comment on function public.submit_level_music_only_job(text, integer, text, jsonb, text, text, text, text, text, uuid) is
  'Create an isolated level-song job for a static library level and optional validated imported deck. Reserves/debits 10 credits idempotently.';

revoke all on function public.submit_level_music_only_job(text, integer, text, jsonb, text, text, text, text, text, uuid) from public, anon;
grant execute on function public.submit_level_music_only_job(text, integer, text, jsonb, text, text, text, text, text, uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
