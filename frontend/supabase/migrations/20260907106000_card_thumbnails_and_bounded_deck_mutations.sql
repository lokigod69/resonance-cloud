-- E-03/F-20/B-17: small card thumbnails, safe deck deletion, bounded imports.
-- Existing card rows keep thumbnail_url as their fallback. New card renders retain
-- the full image there and write the 640x360 WebP derivative separately.

begin;

-- Some manually provisioned deployments lack the June normalization helper.
-- Install the pure dependency here; do not rerun that migration's data backfill.
create or replace function public.normalize_language_value(p_language text)
returns text
language sql
immutable
set search_path = pg_catalog
as $$
  select case lower(btrim(coalesce(p_language, '')))
    when '' then ''
    when 'en' then 'English' when 'english' then 'English'
    when 'de' then 'German' when 'german' then 'German'
    when 'fr' then 'French' when 'french' then 'French'
    when 'it' then 'Italian' when 'italian' then 'Italian'
    when 'es' then 'Spanish' when 'spanish' then 'Spanish'
    when 'pt' then 'Portuguese' when 'portuguese' then 'Portuguese'
    when 'pl' then 'Polish' when 'polish' then 'Polish'
    when 'ru' then 'Russian' when 'russian' then 'Russian'
    when 'ja' then 'Japanese' when 'japanese' then 'Japanese'
    when 'nl' then 'Dutch' when 'dutch' then 'Dutch'
    when 'hi' then 'Hindi' when 'hindi' then 'Hindi'
    when 'ar' then 'Arabic' when 'arabic' then 'Arabic'
    when 'fil' then 'Tagalog' when 'tl' then 'Tagalog' when 'tagalog' then 'Tagalog'
    when 'ceb' then 'Bisaya' when 'bisaya' then 'Bisaya' when 'cebuano' then 'Bisaya'
    when 'id' then 'Indonesian' when 'indonesian' then 'Indonesian' when 'bahasa indonesia' then 'Indonesian'
    when 'ko' then 'Korean' when 'korean' then 'Korean'
    else btrim(coalesce(p_language, ''))
  end
$$;
revoke all on function public.normalize_language_value(text) from public, anon;
grant execute on function public.normalize_language_value(text) to authenticated, service_role;

alter table public.words
  add column if not exists card_thumbnail_url text;

comment on column public.words.card_thumbnail_url is
  'Small generated card preview (currently 640x360 WebP). Full study/detail image remains in thumbnail_url.';

create or replace function public.phase1e_protect_card_thumbnail_url()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.card_thumbnail_url is distinct from old.card_thumbnail_url then
    raise exception 'Direct updates to worker-owned word fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1e_protect_card_thumbnail_url on public.words;
create trigger phase1e_protect_card_thumbnail_url
before update of card_thumbnail_url on public.words
for each row
execute function public.phase1e_protect_card_thumbnail_url();

create or replace function public.phase1e_queue_card_thumbnail_cleanup()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_object_path text := public.phase1e_extract_video_object_path(old.card_thumbnail_url);
begin
  if v_object_path is not null then
    insert into public.storage_cleanup_queue (
      bucket, object_path, source_table, source_id, user_id
    ) values (
      'videos', v_object_path, 'words', old.id, old.user_id
    )
    on conflict do nothing;
  end if;

  return old;
end;
$$;

drop trigger if exists phase1e_queue_card_thumbnail_cleanup on public.words;
create trigger phase1e_queue_card_thumbnail_cleanup
before delete on public.words
for each row
execute function public.phase1e_queue_card_thumbnail_cleanup();

revoke all on function public.phase1e_protect_card_thumbnail_url() from public, anon, authenticated;
revoke all on function public.phase1e_queue_card_thumbnail_cleanup() from public, anon, authenticated;

create or replace function public.delete_curriculum_deck(p_deck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deck public.decks%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_deck_id is null then
    raise exception 'deck_id is required' using errcode = '22023';
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

  if v_deck.source_kind is distinct from 'curriculum' then
    raise exception 'Only curriculum-imported decks can be deleted via this RPC'
      using errcode = '42501';
  end if;

  -- The deck lock above serializes deletion with new jobs through the FK.
  -- Lock existing active rows as well so a status transition cannot race the check.
  perform 1
    from public.generation_jobs
   where deck_id = p_deck_id
   order by id
   for update;

  if exists (
    select 1
      from public.generation_jobs
     where deck_id = p_deck_id
       and status in ('pending', 'approved', 'processing')
  ) then
    raise exception 'Deck cannot be deleted while generation is active'
      using errcode = '55000';
  end if;

  -- Bypass phase1e_protect_direct_word_deck_delete for both the deck DELETE
  -- and the cascading word DELETEs. Same pattern as archive_words.
  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.decks
   where id = p_deck_id
     and user_id = v_user_id
     and source_kind = 'curriculum';
end;
$$;

comment on function public.delete_curriculum_deck(uuid) is
  'Deletes a learner-owned curriculum deck only when no generation job is active. Cascades through existing foreign keys.';

revoke all on function public.delete_curriculum_deck(uuid) from public, anon;
grant execute on function public.delete_curriculum_deck(uuid) to authenticated;

create or replace function public.delete_imageless_deck(p_deck_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deck public.decks%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_deck_id is null then
    raise exception 'deck_id is required' using errcode = '22023';
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

  if v_deck.deck_type is distinct from 'card_text' then
    raise exception 'Only image-less card_text decks can be deleted via this RPC'
      using errcode = '42501';
  end if;

  -- The deck lock above serializes deletion with new jobs through the FK.
  -- Lock existing active rows as well so a status transition cannot race the check.
  perform 1
    from public.generation_jobs
   where deck_id = p_deck_id
   order by id
   for update;

  if exists (
    select 1
      from public.generation_jobs
     where deck_id = p_deck_id
       and status in ('pending', 'approved', 'processing')
  ) then
    raise exception 'Deck cannot be deleted while generation is active'
      using errcode = '55000';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.decks
   where id = p_deck_id;
end;
$$;

comment on function public.delete_imageless_deck(uuid) is
  'Deletes a learner-owned image-less card_text deck only when no generation job is active. Cascades through existing foreign keys.';

revoke all on function public.delete_imageless_deck(uuid) from public, anon;
grant execute on function public.delete_imageless_deck(uuid) to authenticated;

create or replace function public.submit_curriculum_import(
  p_category_slug text,
  p_level_number integer,
  p_level_name text,
  p_entries jsonb,
  p_target_language text
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

  if nullif(btrim(coalesce(p_target_language, '')), '') is null then
    raise exception 'target_language is required' using errcode = '22023';
  end if;

  if p_entries is null or jsonb_typeof(p_entries) <> 'array' then
    raise exception 'entries must be a JSON array' using errcode = '22023';
  end if;

  v_entry_count := jsonb_array_length(p_entries);
  if v_entry_count = 0 then
    raise exception 'entries must contain at least one item' using errcode = '22023';
  end if;

  if v_entry_count > 500 then
    raise exception 'entries must contain at most 500 items' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':curriculum:' || p_category_slug || ':' || p_level_number::text || ':' || p_target_language,
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
     and target_language = p_target_language
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
    p_target_language,
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

comment on function public.submit_curriculum_import(text, integer, text, jsonb, text) is
  'Materializes at most 500 static/curriculum entries as a learner-owned card deck. Idempotent per user/category/level/language; no credit debit.';

revoke all on function public.submit_curriculum_import(text, integer, text, jsonb, text) from public, anon;
grant execute on function public.submit_curriculum_import(text, integer, text, jsonb, text) to authenticated;

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

  if v_item_count > 500 then
    raise exception 'items must contain at most 500 items' using errcode = '22023';
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
  'Materializes at most 500 learner-owned text/IPA cards, with normalized language storage and no generation or credit debit.';

revoke all on function public.submit_imageless_import(text, text, text, jsonb, text) from public, anon;
grant execute on function public.submit_imageless_import(text, text, text, jsonb, text) to authenticated;

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

  if jsonb_array_length(p_items) > 500 then
    raise exception 'p_items must contain at most 500 items' using errcode = '22023';
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
  'Appends at most 500 complete text/IPA cards to a learner-owned card_text deck, with no generation or credit debit.';

revoke all on function public.append_imageless_cards(uuid, jsonb, text) from public, anon;
grant execute on function public.append_imageless_cards(uuid, jsonb, text) to authenticated;

notify pgrst, 'reload schema';

commit;
