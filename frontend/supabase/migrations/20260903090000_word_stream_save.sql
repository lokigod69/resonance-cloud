-- submit_word_stream_save: keep a word tapped in the Home Word Stream.
--
-- Finds or creates the caller's per-language stream deck (source_kind
-- 'stream', deck_type 'card_text' — text cards, no generation pipelines, no
-- credits), inserts complete word rows with per-word word_slug dedupe, and
-- carries the thematic-library provenance under metadata.curriculum so the
-- importer, Surf and the Home audio lookup resolve recordings the same way.
-- Modeled 1:1 on submit_lens_save (20260706030000). See
-- docs/Product/FABLE_WORD_STREAM_PLAN.md.

begin;

-- decks.source_kind gains 'stream'. The original constraint was declared
-- inline (20260515120000) so its name is Postgres-assigned; drop only the
-- VALUE-LIST check on the column (Postgres renders `in (...)` as
-- `= ANY (ARRAY[...])`), never an unrelated check that merely mentions it,
-- then re-add the widened one. The transaction rolls everything back if the
-- re-add fails, so the table is never left without the constraint.
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
    check (source_kind in ('user', 'curriculum', 'stream'));

create index if not exists idx_decks_stream
  on public.decks (user_id, target_language)
  where source_kind = 'stream';

create or replace function public.submit_word_stream_save(
  p_target_language text,
  p_base_language text,
  p_deck_name text,
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
  v_deck_name text := nullif(btrim(coalesce(p_deck_name, '')), '');
  v_target_language text := nullif(btrim(coalesce(p_target_language, '')), '');
  v_base_language text := nullif(btrim(coalesce(p_base_language, '')), '');
  v_row record;
  v_inserted integer := 0;
  v_skipped integer := 0;
  v_word_ids uuid[] := '{}';
  v_word_id uuid;
  v_word text;
  v_word_slug text;
  v_translation text;
  v_pos text;
  v_tts_audio_url text;
  v_thumbnail_url text;
  v_curriculum jsonb;
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

  if v_deck_name is null then
    v_deck_name := 'Word Stream — ' || v_target_language;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(v_user_id::text || ':word_stream:' || v_target_language, 0)
  );

  select id
    into v_deck_id
    from public.decks
   where user_id = v_user_id
     and target_language = v_target_language
     and source_kind = 'stream'
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
      left(v_deck_name, 120),
      v_target_language,
      0,
      'complete',
      'card_text',
      'stream'
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
    v_pos := nullif(btrim(coalesce(v_row.value->>'pos', '')), '');
    v_tts_audio_url := nullif(btrim(coalesce(v_row.value->>'tts_audio_url', '')), '');
    v_thumbnail_url := nullif(btrim(coalesce(v_row.value->>'thumbnail_url', '')), '');

    if v_word is null then
      raise exception 'item % is missing word', v_row.ord
        using errcode = '22023';
    end if;
    if v_translation is null then
      raise exception 'item % (%) is missing translation', v_row.ord, v_word
        using errcode = '22023';
    end if;
    if v_tts_audio_url is not null and v_tts_audio_url !~ '^https?://' then
      raise exception 'item % (%) has an invalid tts_audio_url', v_row.ord, v_word
        using errcode = '22023';
    end if;
    if v_thumbnail_url is not null and v_thumbnail_url !~ '^(https?://|/)' then
      raise exception 'item % (%) has an invalid thumbnail_url', v_row.ord, v_word
        using errcode = '22023';
    end if;

    if jsonb_typeof(coalesce(v_row.value->'metadata', 'null'::jsonb)) = 'object' then
      v_curriculum := v_row.value->'metadata';
    else
      v_curriculum := '{}'::jsonb;
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
      pos,
      thumbnail_url,
      video_url,
      tts_audio_url,
      tts_status,
      tts_generated_at,
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
      v_pos,
      v_thumbnail_url,
      null,
      v_tts_audio_url,
      case when v_tts_audio_url is not null then 'ready' else null end,
      case when v_tts_audio_url is not null then now() else null end,
      'complete',
      'complete',
      'pending',
      jsonb_strip_nulls(jsonb_build_object(
        'origin', 'word_stream',
        'is_phrase', false,
        'target_language', v_target_language,
        'base_language', v_base_language,
        'curriculum', v_curriculum
      ))
    )
    returning id into v_word_id;

    v_word_ids := array_append(v_word_ids, v_word_id);
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
    'skipped', v_skipped,
    'word_ids', to_jsonb(v_word_ids)
  );
end;
$$;

comment on function public.submit_word_stream_save(text, text, text, jsonb) is
  'Finds or creates the caller-owned Word Stream card_text deck for a target language, inserts complete word rows with thematic-library provenance, and idempotently skips duplicates by normalized word_slug.';

revoke all on function public.submit_word_stream_save(text, text, text, jsonb) from public, anon;
grant execute on function public.submit_word_stream_save(text, text, text, jsonb) to authenticated;

notify pgrst, 'reload schema';

commit;
