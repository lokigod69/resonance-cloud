-- submit_lens_save: materialize saved Lens scan results into an owned
-- card_text deck without invoking image, video, song, or TTS generation.

begin;

create or replace function public.submit_lens_save(
  p_target_language text,
  p_base_language text,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deck_id uuid;
  v_deck_name text;
  v_target_language text := nullif(btrim(coalesce(p_target_language, '')), '');
  v_base_language text := nullif(btrim(coalesce(p_base_language, '')), '');
  v_row record;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_word text;
  v_word_slug text;
  v_translation text;
  v_ipa text;
  v_pos text;
  v_article text;
  v_example text;
  v_example_gloss text;
  v_transliteration text;
  v_is_phrase boolean;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if v_target_language is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if v_base_language is null then
    raise exception 'base_language is required' using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be a JSON array' using errcode = '22023';
  end if;

  if jsonb_array_length(p_items) = 0 then
    raise exception 'items must contain at least one item' using errcode = '22023';
  end if;

  v_deck_name := 'Lens — ' || v_target_language;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':lens:' || v_target_language, 0)
  );

  select id
    into v_deck_id
    from public.decks
   where user_id = v_user_id
     and target_language = v_target_language
     and deck_type = 'card_text'
     and name = v_deck_name
   order by created_at asc
   limit 1
   for update;

  if v_deck_id is null then
    insert into public.decks (
      user_id,
      name,
      target_language,
      word_count,
      status,
      deck_type,
      source_kind
    ) values (
      v_user_id,
      v_deck_name,
      v_target_language,
      0,
      'complete',
      'card_text',
      'user'
    )
    returning id into v_deck_id;
  end if;

  for v_row in
    select value, ord
      from jsonb_array_elements(p_items) with ordinality as t(value, ord)
     order by t.ord
  loop
    if jsonb_typeof(v_row.value) <> 'object' then
      raise exception 'item % must be an object', v_row.ord
        using errcode = '22023';
    end if;

    v_word := nullif(btrim(coalesce(v_row.value->>'word', '')), '');
    v_translation := nullif(btrim(coalesce(v_row.value->>'translation', '')), '');
    v_ipa := nullif(btrim(coalesce(v_row.value->>'ipa', '')), '');
    v_pos := nullif(btrim(coalesce(v_row.value->>'pos', '')), '');
    v_article := nullif(btrim(coalesce(v_row.value->>'article', '')), '');
    v_example := nullif(btrim(coalesce(v_row.value->>'example', '')), '');
    v_example_gloss := nullif(btrim(coalesce(v_row.value->>'example_gloss', '')), '');
    v_transliteration := nullif(btrim(coalesce(v_row.value->>'transliteration', '')), '');

    if v_word is null then
      raise exception 'item % is missing word', v_row.ord
        using errcode = '22023';
    end if;
    if v_translation is null then
      raise exception 'item % (%) is missing translation', v_row.ord, v_word
        using errcode = '22023';
    end if;

    if v_row.value ? 'is_phrase' then
      if jsonb_typeof(v_row.value->'is_phrase') <> 'boolean' then
        raise exception 'item % (%) has invalid is_phrase', v_row.ord, v_word
          using errcode = '22023';
      end if;
      v_is_phrase := (v_row.value->>'is_phrase')::boolean;
    else
      v_is_phrase := false;
    end if;

    v_word_slug := lower(btrim(v_word));

    if exists (
      select 1
        from public.words w
       where w.deck_id = v_deck_id
         and w.user_id = v_user_id
         and w.status <> 'failed'
         and (
           w.word_slug = v_word_slug
           or (w.word_slug is null and lower(btrim(w.word)) = v_word_slug)
         )
       limit 1
    ) then
      v_skipped := v_skipped + 1;
      continue;
    end if;

    insert into public.words (
      deck_id,
      user_id,
      word,
      word_slug,
      original_input,
      translation,
      ipa,
      pos,
      article,
      example,
      example_gloss,
      thumbnail_url,
      video_url,
      status,
      current_stage,
      music_state,
      metadata
    ) values (
      v_deck_id,
      v_user_id,
      v_word,
      v_word_slug,
      v_word,
      v_translation,
      v_ipa,
      v_pos,
      v_article,
      v_example,
      v_example_gloss,
      null,
      null,
      'complete',
      'complete',
      'pending',
      jsonb_strip_nulls(jsonb_build_object(
        'origin', 'lens',
        'is_phrase', v_is_phrase,
        'target_language', v_target_language,
        'base_language', v_base_language,
        'transliteration', v_transliteration
      ))
    );

    v_inserted := v_inserted + 1;
  end loop;

  if v_inserted > 0 then
    perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

    update public.decks
       set word_count = word_count + v_inserted,
           updated_at = now()
     where id = v_deck_id;
  end if;

  return jsonb_build_object(
    'deck_id', v_deck_id,
    'inserted', v_inserted,
    'skipped', v_skipped
  );
end;
$$;

comment on function public.submit_lens_save(text, text, jsonb) is
  'Finds or creates the caller-owned Lens card_text deck for a target language, inserts complete Lens word rows, and idempotently skips duplicates by normalized word_slug.';

revoke all on function public.submit_lens_save(text, text, jsonb) from public, anon;
grant execute on function public.submit_lens_save(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
