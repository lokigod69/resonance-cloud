-- append_imageless_cards: add complete text/IPA cards to an existing
-- learner-owned image-less deck without invoking generation pipelines.

begin;

create or replace function public.append_imageless_cards(
  p_deck_id uuid,
  p_items jsonb,
  p_origin text default 'manual'
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deck public.decks%rowtype;
  v_item jsonb;
  v_count integer := 0;
  v_word text;
  v_translation text;
  v_ipa text;
  v_is_phrase boolean;
  v_base_language text;
  v_origin text := coalesce(nullif(btrim(coalesce(p_origin, 'manual')), ''), 'manual');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if p_deck_id is null then
    raise exception 'deck_id is required' using errcode = '22023';
  end if;

  if v_origin not in ('manual', 'tutor_extraction', 'category') then
    raise exception 'origin must be manual, tutor_extraction, or category'
      using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'p_items must be a non-empty array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'p_items must be a non-empty array' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':imageless_append:' || p_deck_id::text, 0)
  );

  select *
    into v_deck
    from public.decks
   where id = p_deck_id
   for update;

  if not found then
    raise exception 'Deck not found' using errcode = 'P0002';
  end if;

  if v_deck.user_id <> v_user_id then
    raise exception 'Not authorized' using errcode = '42501';
  end if;

  if v_deck.deck_type is distinct from 'card_text' then
    raise exception 'Append only supported for card_text decks' using errcode = '42501';
  end if;

  for v_item in
    select value
      from jsonb_array_elements(p_items) with ordinality as t(value, ord)
     order by t.ord
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'item % must be an object', v_count + 1
        using errcode = '22023';
    end if;

    v_word := nullif(btrim(coalesce(v_item->>'word', '')), '');
    v_translation := nullif(btrim(coalesce(v_item->>'translation', '')), '');
    v_ipa := nullif(btrim(coalesce(v_item->>'ipa', '')), '');
    v_base_language := coalesce(nullif(btrim(coalesce(v_item->>'base_language', '')), ''), 'English');

    if v_word is null then
      raise exception 'item % is missing word', v_count + 1
        using errcode = '22023';
    end if;
    if v_translation is null then
      raise exception 'item % (%) is missing translation', v_count + 1, v_word
        using errcode = '22023';
    end if;

    if v_item ? 'is_phrase' then
      if jsonb_typeof(v_item->'is_phrase') <> 'boolean' then
        raise exception 'item % (%) has invalid is_phrase', v_count + 1, v_word
          using errcode = '22023';
      end if;
      v_is_phrase := (v_item->>'is_phrase')::boolean;
    else
      v_is_phrase := false;
    end if;

    insert into public.words (
      deck_id,
      user_id,
      word,
      original_input,
      translation,
      ipa,
      thumbnail_url,
      video_url,
      status,
      current_stage,
      music_state,
      metadata
    ) values (
      p_deck_id,
      v_user_id,
      v_word,
      v_word,
      v_translation,
      v_ipa,
      null,
      null,
      'complete',
      'complete',
      'pending',
      jsonb_build_object(
        'origin', v_origin,
        'is_phrase', v_is_phrase,
        'target_language', btrim(v_deck.target_language),
        'base_language', v_base_language
      )
    );

    v_count := v_count + 1;
  end loop;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.decks
     set word_count = word_count + v_count,
         updated_at = now()
   where id = p_deck_id;

  return v_count;
end;
$$;

comment on function public.append_imageless_cards(uuid, jsonb, text) is
  'Appends complete text/IPA words to a learner-owned card_text deck. Does not debit credits or invoke generation pipelines.';

revoke all on function public.append_imageless_cards(uuid, jsonb, text) from public, anon;
grant execute on function public.append_imageless_cards(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';

commit;
