-- Phase 1E follow-up: ensure trusted user RPC recomputation/archive paths can
-- update/delete the rows guarded by Phase 1E triggers.

begin;

create or replace function public.phase1e_recalculate_deck(p_deck_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_any_active boolean;
  v_all_complete boolean;
  v_any_complete boolean;
  v_all_failed boolean;
  v_status text;
  v_deck public.decks%rowtype;
begin
  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  select
    count(*)::integer,
    coalesce(bool_or(
      status in ('pending', 'processing')
      or (
        current_stage is not null
        and current_stage not in ('complete', 'failed', 'cancelled')
      )
    ), false),
    coalesce(bool_and(status = 'complete'), false),
    coalesce(bool_or(status = 'complete'), false),
    coalesce(bool_and(status = 'failed'), false)
  into v_count, v_any_active, v_all_complete, v_any_complete, v_all_failed
  from public.words
  where deck_id = p_deck_id;

  v_status := case
    when v_count = 0 then 'draft'
    when v_any_active then 'generating'
    when v_all_complete then 'complete'
    when v_all_failed then 'failed'
    when v_any_complete then 'partial'
    else 'partial'
  end;

  update public.decks
  set word_count = v_count,
      status = v_status,
      updated_at = now()
  where id = p_deck_id
  returning * into v_deck;

  if not found then
    raise exception 'Deck not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_deck.id,
    'name', v_deck.name,
    'target_language', v_deck.target_language,
    'word_count', v_deck.word_count,
    'status', v_deck.status,
    'updated_at', v_deck.updated_at
  );
end;
$$;

create or replace function public.archive_word(p_word_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_word public.words%rowtype;
  v_deck public.decks%rowtype;
  v_deck_summary jsonb;
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

  perform public.phase1e_queue_word_storage_cleanup(
    v_word.id,
    v_word.user_id,
    v_word.deck_id,
    v_word.word,
    v_word.video_url,
    v_word.thumbnail_url,
    v_word.video_url_b,
    v_word.thumbnail_url_b
  );

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.words
  where id = v_word.id
    and user_id = v_user_id;

  v_deck_summary := public.phase1e_recalculate_deck(v_deck.id);

  return jsonb_build_object(
    'success', true,
    'word_id', v_word.id,
    'deck', v_deck_summary
  );
end;
$$;

create or replace function public.archive_deck(p_deck_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deck public.decks%rowtype;
  v_word_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into v_deck
  from public.decks
  where id = p_deck_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Deck not found or not owned by user' using errcode = '42501';
  end if;

  select count(*)::integer
  into v_word_count
  from public.words
  where deck_id = p_deck_id
    and user_id = v_user_id;

  if v_word_count > 0 then
    raise exception 'Deck must be empty before archive' using errcode = '22023';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.decks
  where id = p_deck_id
    and user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'deck_id', v_deck.id
  );
end;
$$;

revoke all on function public.phase1e_recalculate_deck(uuid) from public, anon, authenticated;
revoke all on function public.archive_word(uuid) from public, anon;
revoke all on function public.archive_deck(uuid) from public, anon;
grant execute on function public.archive_word(uuid) to authenticated;
grant execute on function public.archive_deck(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
