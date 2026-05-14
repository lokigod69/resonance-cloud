-- Hotfix: submit_curriculum_import was missing the NOT NULL original_input
-- column on words, causing every first-word insert to raise 23502.
--
-- original_input was made NOT NULL with no default by
-- 20260509101721_word_input_audit.sql. The submit_generation RPC populates
-- it with btrim(v_word); the curriculum import RPC must mirror that pattern,
-- using the canonical curriculum term as the learner's literal input.
--
-- Full NOT NULL audit cross-checked against every migration that touches
-- public.words and public.decks. Only original_input was missed; every
-- other NOT NULL column on either table is either supplied by the RPC or
-- carries a DEFAULT.

begin;

create or replace function public.submit_curriculum_import(
  p_category_slug text,
  p_level_number integer,
  p_level_name text,
  p_entries jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing_deck_id uuid;
  v_deck_id uuid;
  v_entry jsonb;
  v_entry_count integer;
  v_term text;
  v_translation text;
  v_thumbnail text;
  v_inserted integer := 0;
  v_word_metadata jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if nullif(btrim(coalesce(p_category_slug, '')), '') is null then
    raise exception 'category_slug is required' using errcode = '22023';
  end if;

  if p_level_number is null or p_level_number < 1 then
    raise exception 'level_number must be a positive integer' using errcode = '22023';
  end if;

  if nullif(btrim(coalesce(p_level_name, '')), '') is null then
    raise exception 'level_name is required' using errcode = '22023';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'entries must be a JSON array' using errcode = '22023';
  end if;

  v_entry_count := jsonb_array_length(p_entries);
  if v_entry_count = 0 then
    raise exception 'entries must contain at least one item' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':curriculum:' || p_category_slug || ':' || p_level_number::text,
      0
    )
  );

  select id
    into v_existing_deck_id
    from public.decks
   where user_id = v_user_id
     and source_kind = 'curriculum'
     and curriculum_category_slug = p_category_slug
     and curriculum_level = p_level_number
   order by created_at desc
   limit 1;

  if v_existing_deck_id is not null then
    return v_existing_deck_id;
  end if;

  insert into public.decks (
    user_id,
    name,
    target_language,
    word_count,
    status,
    deck_type,
    source_kind,
    curriculum_category_slug,
    curriculum_level
  ) values (
    v_user_id,
    p_level_name,
    'en',
    v_entry_count,
    'complete',
    'card',
    'curriculum',
    p_category_slug,
    p_level_number
  )
  returning id into v_deck_id;

  for v_entry in
    select value
      from jsonb_array_elements(p_entries) with ordinality as t(value, ord)
     order by t.ord
  loop
    v_term := nullif(btrim(coalesce(v_entry->>'term', '')), '');
    v_translation := nullif(btrim(coalesce(v_entry->>'translation', '')), '');

    if v_term is null then
      raise exception 'entry % is missing term', v_inserted + 1
        using errcode = '22023';
    end if;
    if v_translation is null then
      raise exception 'entry % (%) is missing translation', v_inserted + 1, v_term
        using errcode = '22023';
    end if;

    v_thumbnail := nullif(btrim(coalesce(v_entry->>'thumbnail_url', '')), '');

    if jsonb_typeof(coalesce(v_entry->'metadata', 'null'::jsonb)) = 'object' then
      v_word_metadata := jsonb_build_object('curriculum', v_entry->'metadata');
    else
      v_word_metadata := jsonb_build_object('curriculum', '{}'::jsonb);
    end if;

    insert into public.words (
      deck_id,
      user_id,
      word,
      original_input,
      translation,
      mnemonic,
      etymology,
      pos,
      article,
      ipa,
      example,
      example_gloss,
      synonyms,
      tags,
      thumbnail_url,
      status,
      current_stage,
      music_state,
      metadata,
      curriculum_entry_term
    ) values (
      v_deck_id,
      v_user_id,
      v_term,
      v_term,
      v_translation,
      nullif(btrim(coalesce(v_entry->>'mnemonic', '')), ''),
      nullif(btrim(coalesce(v_entry->>'etymology', '')), ''),
      nullif(btrim(coalesce(v_entry->>'pos', '')), ''),
      nullif(btrim(coalesce(v_entry->>'article', '')), ''),
      nullif(btrim(coalesce(v_entry->>'ipa', '')), ''),
      nullif(btrim(coalesce(v_entry->>'example', '')), ''),
      nullif(btrim(coalesce(v_entry->>'example_gloss', '')), ''),
      coalesce(v_entry->>'synonyms', ''),
      coalesce(v_entry->>'tags', ''),
      v_thumbnail,
      'complete',
      'complete',
      'pending',
      v_word_metadata,
      v_term
    );

    v_inserted := v_inserted + 1;
  end loop;

  return v_deck_id;
end;
$$;

comment on function public.submit_curriculum_import(text, integer, text, jsonb) is
  'Materializes a curriculum level as a card deck owned by the calling learner. Idempotent on (user, category_slug, level_number). Does not debit credits.';

revoke all on function public.submit_curriculum_import(text, integer, text, jsonb) from public, anon;
grant execute on function public.submit_curriculum_import(text, integer, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
