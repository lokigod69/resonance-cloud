-- Curriculum import: schema additions + import/delete RPCs.
--
-- Adds the source/provenance columns on decks and a curriculum-term marker
-- on words, plus two SECURITY DEFINER RPCs that materialize and clean up
-- curriculum-imported card decks for a learner.
--
-- Design ref: investigations/CATEGORIES_STUDY_WIRING_DESIGN.md §11.5.
--
-- Hard constraint: submit_curriculum_import must not debit credits.

begin;

-- ---------------------------------------------------------------------------
-- Schema additions
-- ---------------------------------------------------------------------------

alter table public.decks
  add column if not exists source_kind text not null default 'user'
    check (source_kind in ('user', 'curriculum')),
  add column if not exists curriculum_category_slug text,
  add column if not exists curriculum_level integer;

alter table public.words
  add column if not exists curriculum_entry_term text;

create index if not exists idx_decks_curriculum
  on public.decks (user_id, source_kind, curriculum_category_slug, curriculum_level)
  where source_kind = 'curriculum';

-- ---------------------------------------------------------------------------
-- submit_curriculum_import
-- ---------------------------------------------------------------------------
--
-- Materializes a curriculum level as a card deck owned by the calling learner.
-- Idempotent: a second call for the same (user, category_slug, level_number)
-- returns the existing deck_id without touching anything.
--
-- p_entries shape (jsonb array): each element is an object with
--   term            text  required
--   translation     text  required
--   pos             text  optional
--   article         text  optional
--   ipa             text  optional
--   mnemonic        text  optional
--   etymology       text  optional
--   example         text  optional
--   example_gloss   text  optional
--   synonyms        text  optional (already comma-joined by the caller)
--   tags            text  optional (already comma-joined by the caller)
--   thumbnail_url   text  optional, nullable
--   metadata        jsonb optional (lands at words.metadata.curriculum)
--
-- Returns the deck_id.

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

  -- Per-learner per-level lock; serializes concurrent imports of the same
  -- level from the same learner.
  perform pg_advisory_xact_lock(
    hashtextextended(
      v_user_id::text || ':curriculum:' || p_category_slug || ':' || p_level_number::text,
      0
    )
  );

  -- Idempotency: if this learner has already imported this level, return
  -- the existing deck. Most-recent wins on the off chance of historical
  -- duplicates from before this RPC existed.
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

-- ---------------------------------------------------------------------------
-- delete_curriculum_deck
-- ---------------------------------------------------------------------------
--
-- Lets a learner uninstall one of their curriculum-imported decks. Cascade
-- handles dependent words, recall_attempts, and music_generation_jobs. User-
-- generated decks remain admin-only delete.
--
-- Curriculum entries store thumbnail_url as a relative public asset path
-- ('/curriculum/.../*.webp'), not as a Supabase Storage URL. The standard
-- archive_words storage-cleanup helper would mis-treat those paths as
-- objects in the videos bucket, so this RPC deletes via cascade without
-- queueing storage cleanup.

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

  delete from public.decks
   where id = p_deck_id
     and user_id = v_user_id
     and source_kind = 'curriculum';
end;
$$;

comment on function public.delete_curriculum_deck(uuid) is
  'Deletes a curriculum-imported deck owned by the calling learner. Cascades to words, recall_attempts, and music_generation_jobs.';

revoke all on function public.delete_curriculum_deck(uuid) from public, anon;
grant execute on function public.delete_curriculum_deck(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
