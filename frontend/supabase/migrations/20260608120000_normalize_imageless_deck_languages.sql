-- Normalize text-deck language storage so card_text decks share the same
-- language grouping as image/video decks.

begin;

create or replace function public.normalize_language_value(p_language text)
returns text
language sql
immutable
as $$
  select case lower(btrim(coalesce(p_language, '')))
    when '' then ''
    when 'en' then 'English'
    when 'english' then 'English'
    when 'de' then 'German'
    when 'german' then 'German'
    when 'fr' then 'French'
    when 'french' then 'French'
    when 'it' then 'Italian'
    when 'italian' then 'Italian'
    when 'es' then 'Spanish'
    when 'spanish' then 'Spanish'
    when 'pt' then 'Portuguese'
    when 'portuguese' then 'Portuguese'
    when 'nl' then 'Dutch'
    when 'dutch' then 'Dutch'
    when 'hi' then 'Hindi'
    when 'hindi' then 'Hindi'
    when 'ar' then 'Arabic'
    when 'arabic' then 'Arabic'
    when 'fil' then 'Tagalog'
    when 'tl' then 'Tagalog'
    when 'tagalog' then 'Tagalog'
    when 'ceb' then 'Bisaya'
    when 'bisaya' then 'Bisaya'
    when 'cebuano' then 'Bisaya'
    when 'id' then 'Indonesian'
    when 'indonesian' then 'Indonesian'
    when 'bahasa indonesia' then 'Indonesian'
    when 'ko' then 'Korean'
    when 'korean' then 'Korean'
    else btrim(coalesce(p_language, ''))
  end
$$;

comment on function public.normalize_language_value(text) is
  'Maps supported ISO language codes and case variants to the canonical language values stored in decks.target_language.';

select set_config('app.allow_phase1e_pipeline_update', 'on', true);

update public.decks
   set target_language = public.normalize_language_value(target_language),
       updated_at = now()
 where target_language is not null
   and public.normalize_language_value(target_language) is distinct from btrim(target_language);

create or replace function public.submit_imageless_import(
  p_deck_name text,
  p_target_language text,
  p_base_language text,
  p_items jsonb,
  p_origin text default 'manual'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deck_id uuid;
  v_item jsonb;
  v_item_count integer;
  v_inserted integer := 0;
  v_word text;
  v_translation text;
  v_ipa text;
  v_is_phrase boolean;
  v_target_language text := public.normalize_language_value(p_target_language);
  v_base_language text := public.normalize_language_value(p_base_language);
  v_origin text := coalesce(nullif(btrim(coalesce(p_origin, 'manual')), ''), 'manual');
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '28000';
  end if;

  if nullif(btrim(coalesce(p_deck_name, '')), '') is null then
    raise exception 'deck_name is required' using errcode = '22023';
  end if;

  if nullif(v_target_language, '') is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if nullif(v_base_language, '') is null then
    raise exception 'base_language is required' using errcode = '22023';
  end if;

  if v_origin not in ('manual', 'tutor_extraction', 'category') then
    raise exception 'origin must be manual, tutor_extraction, or category'
      using errcode = '22023';
  end if;

  if p_items is null or jsonb_typeof(p_items) <> 'array' then
    raise exception 'items must be a JSON array' using errcode = '22023';
  end if;

  v_item_count := jsonb_array_length(p_items);
  if v_item_count = 0 then
    raise exception 'items must contain at least one item' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':imageless:' || btrim(p_deck_name) || ':' || v_target_language,
      0
    )
  );

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
    btrim(p_deck_name),
    v_target_language,
    v_item_count,
    'complete',
    'card_text',
    'user'
  )
  returning id into v_deck_id;

  for v_item in
    select value
      from jsonb_array_elements(p_items) with ordinality as t(value, ord)
     order by t.ord
  loop
    if jsonb_typeof(v_item) <> 'object' then
      raise exception 'item % must be an object', v_inserted + 1
        using errcode = '22023';
    end if;

    v_word := nullif(btrim(coalesce(v_item->>'word', '')), '');
    v_translation := nullif(btrim(coalesce(v_item->>'translation', '')), '');
    v_ipa := nullif(btrim(coalesce(v_item->>'ipa', '')), '');

    if v_word is null then
      raise exception 'item % is missing word', v_inserted + 1
        using errcode = '22023';
    end if;
    if v_translation is null then
      raise exception 'item % (%) is missing translation', v_inserted + 1, v_word
        using errcode = '22023';
    end if;

    if v_item ? 'is_phrase' then
      if jsonb_typeof(v_item->'is_phrase') <> 'boolean' then
        raise exception 'item % (%) has invalid is_phrase', v_inserted + 1, v_word
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
      v_deck_id,
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
        'target_language', v_target_language,
        'base_language', v_base_language
      )
    );

    v_inserted := v_inserted + 1;
  end loop;

  return v_deck_id;
end;
$$;

comment on function public.submit_imageless_import(text, text, text, jsonb, text) is
  'Materializes a learner-owned image-less card_text deck with complete text/IPA words. Normalizes deck language storage and does not debit credits or invoke generation pipelines.';

revoke all on function public.submit_imageless_import(text, text, text, jsonb, text) from public, anon;
grant execute on function public.submit_imageless_import(text, text, text, jsonb, text) to authenticated, anon;

notify pgrst, 'reload schema';

commit;
