-- Option B: per-job word ownership.
--
-- Adds public.words.generation_job_id as nullable provenance for new rows.
-- Existing legacy rows stay NULL and continue through deck-wide fallback paths
-- until a later cleanup removes those fallbacks.
--
-- Also updates submit_generation so the atomic submit transaction creates the
-- generation job first and writes each submitted word with generation_job_id.

begin;

alter table public.words
  add column if not exists generation_job_id uuid;

do $$
begin
  if not exists (
    select 1
      from pg_constraint
     where conrelid = 'public.words'::regclass
       and conname = 'words_generation_job_id_fkey'
  ) then
    alter table public.words
      add constraint words_generation_job_id_fkey
      foreign key (generation_job_id)
      references public.generation_jobs(id)
      on delete set null;
  end if;
end
$$;

create index if not exists idx_words_generation_job_id
  on public.words (generation_job_id);

create index if not exists idx_words_generation_job_stage
  on public.words (generation_job_id, current_stage)
  where generation_job_id is not null;

comment on column public.words.generation_job_id is
  'Nullable owning generation_jobs.id for per-job pipeline ownership. NULL rows are legacy and use deck-wide fallback paths.';

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
      generation_job_id,
      word,
      status,
      current_stage
    )
    values (
      v_deck_id,
      v_user_id,
      v_job_id,
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

comment on function public.submit_generation(jsonb, text[], jsonb, uuid, text) is
  'Atomic user generation submit: validates ownership and credits, creates deck/job/owned words, and debits credits.';

revoke all on function public.submit_generation(jsonb, text[], jsonb, uuid, text) from public, anon;
grant execute on function public.submit_generation(jsonb, text[], jsonb, uuid, text) to authenticated;

commit;
