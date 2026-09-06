-- Stable Lens deck identity and exact per-item save receipts.
--
-- The original submit_lens_save found its deck by the mutable display name
-- `Lens — <language>`. Renaming that deck therefore made the next save create
-- another one. Lens decks now have a dedicated source_kind and a unique
-- per-user/per-language identity. Existing decks are adopted only when their
-- word provenance proves they are Lens-only; names and cards are untouched.
--
-- The function signature remains unchanged. Older clients may omit client_id
-- and continue to use inserted/skipped counts. New clients send client_id on
-- each JSON item and receive an ordered outcome with the inserted or existing
-- word id, so mixed results can be reconciled without guessing.

begin;

-- Replace only the source_kind value-list constraint. PostgreSQL renders an
-- inline IN check as `= ANY (ARRAY[...])`, so accept either representation.
do $$
declare
  v_name text;
begin
  for v_name in
    select con.conname
      from pg_constraint con
      join pg_class rel on rel.oid = con.conrelid
      join pg_namespace nsp on nsp.oid = rel.relnamespace
     where nsp.nspname = 'public'
       and rel.relname = 'decks'
       and con.contype = 'c'
       and pg_get_constraintdef(con.oid) ~* 'source_kind\s*(=\s*ANY\s*\(|IN\s*\()'
  loop
    execute format('alter table public.decks drop constraint %I', v_name);
  end loop;
end
$$;

alter table public.decks
  add constraint decks_source_kind_check
    check (source_kind in ('user', 'curriculum', 'stream', 'lens'));

-- Adopt one provable legacy Lens deck per user/language. A display name alone
-- is deliberately insufficient: users can create arbitrary decks with that
-- name. A candidate must contain a Lens-origin word and no word from any other
-- origin. If historical duplicate Lens decks exist, the oldest becomes the
-- canonical save target while every other deck, name and card stays intact.
select set_config('app.allow_phase1e_pipeline_update', 'on', true);

with eligible as (
  select
    d.id,
    row_number() over (
      partition by d.user_id, d.target_language
      order by d.created_at asc, d.id asc
    ) as identity_rank
  from public.decks d
  where d.source_kind = 'user'
    and d.deck_type = 'card_text'
    and not exists (
      select 1 from public.decks canonical
      where canonical.user_id = d.user_id
        and canonical.target_language = d.target_language
        and canonical.source_kind = 'lens'
    )
    and exists (
      select 1
      from public.words w
      where w.deck_id = d.id
        and w.user_id = d.user_id
        and w.metadata->>'origin' = 'lens'
    )
    and not exists (
      select 1
      from public.words w
      where w.deck_id = d.id
        and (w.user_id is distinct from d.user_id
          or w.metadata->>'origin' is distinct from 'lens')
    )
)
update public.decks d
   set source_kind = 'lens'
  from eligible e
 where d.id = e.id
   and e.identity_rank = 1;

create unique index if not exists idx_decks_lens_identity
  on public.decks (user_id, target_language)
  where source_kind = 'lens';

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
  v_outcomes jsonb := '[]'::jsonb;
  v_seen_client_ids text[] := '{}';
  v_client_id text;
  v_word_id uuid;
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

  if jsonb_array_length(p_items) > 50 then
    raise exception 'items must contain at most 50 items' using errcode = '22023';
  end if;

  v_deck_name := 'Lens — ' || v_target_language;

  -- The unique partial index is the invariant; this transaction lock gives
  -- same-user/same-language calls an orderly find-or-create path and also
  -- serializes duplicate-word checks within this RPC.
  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':lens:' || v_target_language, 0)
  );

  select id
    into v_deck_id
    from public.decks
   where user_id = v_user_id
     and target_language = v_target_language
     and source_kind = 'lens'
   order by created_at asc, id asc
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
      'lens'
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

    -- Deployed pre-migration clients do not send client_id. Give those rows a
    -- deterministic compatibility id; new clients always send their recap id.
    v_client_id := coalesce(
      nullif(btrim(coalesce(v_row.value->>'client_id', '')), ''),
      'legacy-' || v_row.ord::text
    );
    if length(v_client_id) > 200 then
      raise exception 'item % has an invalid client_id', v_row.ord
        using errcode = '22023';
    end if;
    if v_client_id = any(v_seen_client_ids) then
      raise exception 'item % has a duplicate client_id', v_row.ord
        using errcode = '22023';
    end if;
    v_seen_client_ids := array_append(v_seen_client_ids, v_client_id);

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
    v_word_id := null;

    select w.id
      into v_word_id
      from public.words w
     where w.deck_id = v_deck_id
       and w.user_id = v_user_id
       and w.status <> 'failed'
       and (
         w.word_slug = v_word_slug
         or (w.word_slug is null and lower(btrim(w.word)) = v_word_slug)
       )
     order by w.created_at asc, w.id asc
     limit 1;

    if v_word_id is not null then
      v_skipped := v_skipped + 1;
      v_outcomes := v_outcomes || jsonb_build_array(jsonb_build_object(
        'client_id', v_client_id,
        'word_id', v_word_id,
        'status', 'skipped'
      ));
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
    )
    returning id into v_word_id;

    v_inserted := v_inserted + 1;
    v_outcomes := v_outcomes || jsonb_build_array(jsonb_build_object(
      'client_id', v_client_id,
      'word_id', v_word_id,
      'status', 'inserted'
    ));
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
    'skipped', v_skipped,
    'outcomes', v_outcomes
  );
end;
$$;

comment on function public.submit_lens_save(text, text, jsonb) is
  'Finds or creates the caller-owned canonical Lens card_text deck by stable source identity, inserts complete Lens rows, and returns ordered inserted/skipped outcomes with word ids. Does not debit credits.';

revoke all on function public.submit_lens_save(text, text, jsonb) from public, anon;
grant execute on function public.submit_lens_save(text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
