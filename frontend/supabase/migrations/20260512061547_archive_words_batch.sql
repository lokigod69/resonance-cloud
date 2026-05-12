-- Batch archive words from a single owned deck.
-- The 50-word cap keeps each RPC bounded while still covering edit-mode batches.

begin;

create or replace function public.archive_words(
  p_word_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_word_ids uuid[];
  v_word_count integer;
  v_deck_ids uuid[];
  v_deck_id uuid;
  v_deck public.decks%rowtype;
  v_word public.words%rowtype;
  v_deck_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if coalesce(array_length(p_word_ids, 1), 0) > 50 then
    raise exception 'At most 50 words can be archived at once' using errcode = '22023';
  end if;

  select array_agg(distinct id)
  into v_word_ids
  from unnest(coalesce(p_word_ids, array[]::uuid[])) as id
  where id is not null;

  if coalesce(array_length(v_word_ids, 1), 0) = 0 then
    raise exception 'At least one word is required' using errcode = '22023';
  end if;

  select count(*)
  into v_word_count
  from (
    select id
    from public.words
    where id = any(v_word_ids)
      and user_id = v_user_id
    for update
  ) as locked_words;

  if v_word_count <> array_length(v_word_ids, 1) then
    raise exception 'One or more words are not owned by user' using errcode = '42501';
  end if;

  select array_agg(distinct deck_id)
  into v_deck_ids
  from public.words
  where id = any(v_word_ids)
    and user_id = v_user_id;

  if coalesce(array_length(v_deck_ids, 1), 0) <> 1 then
    raise exception 'Words must belong to the same deck' using errcode = '42501';
  end if;

  v_deck_id := v_deck_ids[1];

  select *
  into v_deck
  from public.decks
  where id = v_deck_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Deck not found or not owned by user' using errcode = '42501';
  end if;

  for v_word in
    select *
    from public.words
    where id = any(v_word_ids)
      and user_id = v_user_id
    for update
  loop
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
  end loop;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.words
  where id = any(v_word_ids)
    and user_id = v_user_id;

  v_deck_summary := public.phase1e_recalculate_deck(v_deck.id);

  return jsonb_build_object('success', true, 'word_ids', to_jsonb(v_word_ids), 'deck', v_deck_summary);
end;
$$;

revoke all on function public.archive_words(uuid[]) from public, anon;
grant execute on function public.archive_words(uuid[]) to authenticated;

notify pgrst, 'reload schema';

commit;
