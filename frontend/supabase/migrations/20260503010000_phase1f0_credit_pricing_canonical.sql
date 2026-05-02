-- Phase 1F.0 canonical deck-type credit pricing.
--
-- This migration supersedes local-only pricing drafts that were never recorded
-- in remote migration history. It is safe over the partially live state where
-- decks.deck_type and a draft submit_generation price calculation may already
-- exist, but generation_jobs pricing columns do not.

begin;

alter table public.decks
  add column if not exists deck_type text;

update public.decks
set deck_type = 'video'
where deck_type is null
   or deck_type not in ('video', 'card');

alter table public.decks
  alter column deck_type set default 'video',
  alter column deck_type set not null;

alter table public.decks
  drop constraint if exists decks_deck_type_check;

alter table public.decks
  add constraint decks_deck_type_check
  check (deck_type in ('video', 'card'));

alter table public.generation_jobs
  add column if not exists credits_charged integer not null default 0,
  add column if not exists credit_cost_per_word integer not null default 1,
  add column if not exists deck_type text;

update public.generation_jobs gj
set deck_type = coalesce(d.deck_type, 'video')
from public.decks d
where gj.deck_id = d.id
  and (gj.deck_type is null or gj.deck_type not in ('video', 'card'));

update public.generation_jobs
set deck_type = 'video'
where deck_type is null
   or deck_type not in ('video', 'card');

alter table public.generation_jobs
  alter column deck_type set default 'video',
  alter column deck_type set not null;

alter table public.generation_jobs
  drop constraint if exists generation_jobs_deck_type_check,
  drop constraint if exists generation_jobs_credits_charged_check,
  drop constraint if exists generation_jobs_credit_cost_per_word_check;

alter table public.generation_jobs
  add constraint generation_jobs_deck_type_check
  check (deck_type in ('video', 'card')),
  add constraint generation_jobs_credits_charged_check
  check (credits_charged >= 0),
  add constraint generation_jobs_credit_cost_per_word_check
  check (credit_cost_per_word > 0);

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
  v_credit_cost_per_word integer;
  v_credits_required integer;
  v_word text;
  v_existing_job public.generation_jobs%rowtype;
  v_target_language text;
  v_art_style text;
  v_movie_override text;
  v_settings_override jsonb;
  v_deck_type text := coalesce(nullif(p_deck_payload->>'deck_type', ''), 'video');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_word_count <= 0 then
    raise exception 'At least one word is required' using errcode = '22023';
  end if;

  foreach v_word in array p_word_list
  loop
    if nullif(btrim(v_word), '') is null then
      raise exception 'Words cannot be blank' using errcode = '22023';
    end if;
  end loop;

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
        'job_id', v_existing_job.id,
        'deck_type', v_existing_job.deck_type,
        'credit_cost_per_word', v_existing_job.credit_cost_per_word,
        'credits_charged', v_existing_job.credits_charged
      );
    end if;
  end if;

  v_target_language := nullif(p_job_payload->>'target_language', '');
  v_art_style := nullif(p_job_payload->>'art_style', '');
  v_movie_override := nullif(p_job_payload->>'movie_override', '');
  v_settings_override := coalesce(p_job_payload->'settings_override', '{}'::jsonb);

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
    v_deck_type := coalesce(nullif(v_deck.deck_type, ''), 'video');
    v_target_language := v_deck.target_language;
  else
    if v_deck_type not in ('video', 'card') then
      raise exception 'invalid deck_type: %', v_deck_type using errcode = '22023';
    end if;
  end if;

  if v_target_language is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if v_deck_type not in ('video', 'card') then
    raise exception 'invalid deck_type: %', v_deck_type using errcode = '22023';
  end if;

  v_credit_cost_per_word := case v_deck_type
    when 'video' then 10
    when 'card' then 1
  end;
  v_credits_required := v_word_count * v_credit_cost_per_word;

  select *
    into v_profile
    from public.profiles
   where id = v_user_id
   for update;

  if not found then
    raise exception 'Profile not found' using errcode = 'P0002';
  end if;

  if v_profile.credits < v_credits_required then
    return jsonb_build_object(
      'success', false,
      'error', format(
        'Not enough credits. You have %s but need %s.',
        v_profile.credits,
        v_credits_required
      ),
      'deck_type', v_deck_type,
      'credit_cost_per_word', v_credit_cost_per_word,
      'credits_charged', v_credits_required
    );
  end if;

  if p_existing_deck_id is null then
    insert into public.decks (
      user_id,
      name,
      target_language,
      art_style,
      movie_override,
      word_count,
      status,
      deck_type
    )
    values (
      v_user_id,
      coalesce(nullif(p_deck_payload->>'name', ''), v_target_language || ' Deck'),
      v_target_language,
      v_art_style,
      v_movie_override,
      v_word_count,
      'generating',
      v_deck_type
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
    submit_idempotency_key,
    credits_charged,
    credit_cost_per_word,
    deck_type
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
    p_idempotency_key,
    v_credits_required,
    v_credit_cost_per_word,
    v_deck_type
  )
  returning id into v_job_id;

  foreach v_word in array p_word_list
  loop
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

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

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
     set credits = credits - v_credits_required
   where id = v_user_id
     and credits >= v_credits_required;

  if not found then
    raise exception 'Unable to debit generation credits' using errcode = '40001';
  end if;

  return jsonb_build_object(
    'success', true,
    'idempotent', false,
    'deck_id', v_deck_id,
    'job_id', v_job_id,
    'deck_type', v_deck_type,
    'credit_cost_per_word', v_credit_cost_per_word,
    'credits_charged', v_credits_required
  );
end;
$$;

comment on function public.submit_generation(jsonb, text[], jsonb, uuid, text) is
  'Atomic user generation submit: validates ownership and deck-type pricing, creates deck/job/owned words, records exact credits charged, and debits credits.';

revoke all on function public.submit_generation(jsonb, text[], jsonb, uuid, text) from public, anon;
grant execute on function public.submit_generation(jsonb, text[], jsonb, uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
