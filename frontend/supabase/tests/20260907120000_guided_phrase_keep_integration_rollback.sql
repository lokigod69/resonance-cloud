-- Post-migration integration checks for 20260907120000.
-- Run with psql against the linked database after applying the migration.
-- All fixture writes are rolled back.

\set ON_ERROR_STOP on

begin;

create temporary table hardening_120_context (
  user_id uuid not null,
  foreign_user_id uuid,
  asset_id uuid,
  first_deck_id uuid,
  first_word_id uuid,
  replacement_deck_id uuid,
  foreign_deck_id uuid,
  initial_credits integer
) on commit drop;

insert into hardening_120_context (user_id)
select id
from public.profiles
where role = 'learner'
order by created_at asc nulls last, id asc
limit 1;

update hardening_120_context c
set foreign_user_id = (
      select id from public.profiles
      where role = 'learner' and id <> c.user_id
      order by created_at asc nulls last, id asc
      limit 1
    ),
    initial_credits = (select credits from public.profiles where id = c.user_id);

do $$
begin
  if not exists (select 1 from hardening_120_context where foreign_user_id is not null) then
    raise exception 'Integration test requires two existing learner profiles';
  end if;
end
$$;

with created as (
  insert into public.guided_tts_assets (
    provider, target_language_code, voice_profile_key, provider_voice_id,
    provider_model_id, output_format, voice_settings_hash,
    normalization_version, text, normalized_text, text_hash, cache_key,
    storage_bucket, storage_path, public_url, content_type,
    character_count, status, generated_at
  ) values (
    'elevenlabs', 'en-US', '__120_voice__', '__120_provider_voice__',
    '__120_model__', 'mp3_44100_128', '__120_settings__',
    'v1', 'Keep this exact phrase.', 'keep this exact phrase.', '__120_text_hash__',
    '__120_cache_' || gen_random_uuid()::text, 'guided-tts',
    '__120__/exact.mp3', '/storage/v1/object/public/guided-tts/__120__/exact.mp3',
    'audio/mpeg', 23, 'ready', now()
  )
  returning id
)
update hardening_120_context set asset_id = created.id from created;

insert into public.guided_tts_asset_usages (
  asset_id, path_id, lesson_id, lesson_number, vibe, surface, surface_key, source_text
)
select asset_id, '__120_path__', '__120_lesson__', 1, 'bright',
       'corePhrase', '__self', 'Keep this exact phrase.'
from hardening_120_context;

grant select, update on hardening_120_context to authenticated;

-- The RPC is unavailable to anonymous callers even if a forged JWT subject is set.
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_120_context), true);
set local role anon;
do $$
begin
  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__120 Guided English__', '__120_path__',
      '__120_lesson__', 'bright', 'Keep this exact phrase.', 'Behalte diesen genauen Satz.'
    );
    raise exception 'Anonymous guided phrase keep unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

set local role postgres;
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_120_context), true);
set local role authenticated;

-- The identity table has read-only ownership visibility; clients cannot forge rows.
do $$
begin
  begin
    insert into public.guided_phrase_decks(user_id, target_language, deck_id)
    values ((select user_id from hardening_120_context), 'English', gen_random_uuid());
    raise exception 'Authenticated identity-table insert unexpectedly succeeded';
  exception when insufficient_privilege then
    null;
  end;
end
$$;

do $$
declare
  v_first jsonb;
  v_duplicate jsonb;
  v_after_rename jsonb;
  v_deck_id uuid;
  v_word_id uuid;
begin
  select public.keep_guided_phrase(
    'English', 'German', '__120 Guided English__', '__120_path__',
    '__120_lesson__', 'bright', 'Keep this exact phrase.', 'Behalte diesen genauen Satz.'
  ) into v_first;

  if v_first->>'inserted' <> 'true' then
    raise exception 'First keep did not report insertion: %', v_first;
  end if;
  v_deck_id := (v_first->>'deck_id')::uuid;
  v_word_id := (v_first->>'word_id')::uuid;
  update hardening_120_context set first_deck_id = v_deck_id, first_word_id = v_word_id;

  if not exists (
    select 1 from public.decks
    where id = v_deck_id and user_id = (select user_id from hardening_120_context)
      and name = '__120 Guided English__' and target_language = 'English'
      and deck_type = 'card_text' and source_kind = 'user'
      and status = 'complete' and word_count = 1
  ) then
    raise exception 'Guided deck invariants are wrong';
  end if;

  if not exists (
    select 1 from public.words
    where id = v_word_id and deck_id = v_deck_id
      and user_id = (select user_id from hardening_120_context)
      and word = 'Keep this exact phrase.'
      and translation = 'Behalte diesen genauen Satz.'
      and tts_audio_url = '/storage/v1/object/public/guided-tts/__120__/exact.mp3'
      and tts_status = 'ready'
      and metadata->>'origin' = 'guided_today'
      and metadata->>'is_phrase' = 'true'
      and metadata->>'target_language' = 'English'
      and metadata->>'base_language' = 'German'
      and metadata#>>'{guided,path_id}' = '__120_path__'
      and metadata#>>'{guided,lesson_id}' = '__120_lesson__'
      and metadata#>>'{guided,vibe}' = 'bright'
  ) then
    raise exception 'Guided word metadata or audio provenance is wrong';
  end if;

  if (select count(*) from public.words where deck_id = v_deck_id) <> 1
     or (select count(*) from public.generation_jobs where deck_id = v_deck_id) <> 0
     or (select credits from public.profiles where id = (select user_id from hardening_120_context))
        is distinct from (select initial_credits from hardening_120_context) then
    raise exception 'Keep changed paid-pipeline state or deck count';
  end if;

  select public.keep_guided_phrase(
    'English', 'German', '__120 ignored name__', '__120_path__',
    '__120_lesson__', 'bright', 'Keep this exact phrase.', 'Andere Übersetzung'
  ) into v_duplicate;
  if v_duplicate->>'inserted' <> 'false'
     or (v_duplicate->>'deck_id')::uuid <> v_deck_id
     or (v_duplicate->>'word_id')::uuid <> v_word_id then
    raise exception 'Duplicate keep was not idempotent: first %, duplicate %', v_first, v_duplicate;
  end if;

  update public.decks set name = '__120 learner rename__' where id = v_deck_id;
  select public.keep_guided_phrase(
    'English', 'German', '__120 replacement name__', '__120_path__',
    '__120_lesson__', 'bright', 'Keep this exact phrase.', 'Andere Übersetzung'
  ) into v_after_rename;
  if (v_after_rename->>'deck_id')::uuid <> v_deck_id
     or v_after_rename->>'inserted' <> 'false'
     or (select name from public.decks where id = v_deck_id) <> '__120 learner rename__' then
    raise exception 'Deck rename did not preserve guided identity: %', v_after_rename;
  end if;

  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__120 Guided English__', '__120_path__',
      '__120_lesson__', 'bright', 'Mismatched attacker text.', 'Falscher Text'
    );
    raise exception 'Mismatched phrase reused registered lesson audio';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.keep_guided_phrase(
      'French', 'German', '__120 Guided French__', '__120_path__',
      '__120_lesson__', 'bright', 'Keep this exact phrase.', 'Gardez cette phrase exacte.'
    );
    raise exception 'Mismatched target language reused registered lesson audio';
  exception when sqlstate '22023' then
    null;
  end;

  if (select word_count from public.decks where id = v_deck_id) <> 1
     or (select count(*) from public.words where deck_id = v_deck_id) <> 1 then
    raise exception 'Rejected mismatch changed deck contents';
  end if;
end
$$;

-- A second account cannot see or reuse the first account's identity.
set local role postgres;
select set_config('request.jwt.claim.sub', (select foreign_user_id::text from hardening_120_context), true);
set local role authenticated;

do $$
declare
  v_foreign jsonb;
begin
  if exists (select 1 from public.guided_phrase_decks where user_id = (select user_id from hardening_120_context)) then
    raise exception 'RLS disclosed another user''s guided deck identity';
  end if;

  select public.keep_guided_phrase(
    'English', 'German', '__120 Foreign Guided English__', '__120_path__',
    '__120_lesson__', 'bright', 'Keep this exact phrase.', 'Behalte diesen genauen Satz.'
  ) into v_foreign;
  update hardening_120_context set foreign_deck_id = (v_foreign->>'deck_id')::uuid;
  if v_foreign->>'inserted' <> 'true'
     or (v_foreign->>'deck_id')::uuid = (select first_deck_id from hardening_120_context) then
    raise exception 'Foreign account did not receive an independent deck: %', v_foreign;
  end if;
end
$$;

-- Deleting the image-less deck cascades the identity; the next keep creates a fresh deck.
set local role postgres;
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_120_context), true);
set local role authenticated;

select public.delete_imageless_deck((select first_deck_id from hardening_120_context));

do $$
declare
  v_replacement jsonb;
begin
  if exists (
    select 1 from public.guided_phrase_decks
    where user_id = (select user_id from hardening_120_context) and target_language = 'English'
  ) then
    raise exception 'Deck deletion did not cascade the guided identity';
  end if;

  select public.keep_guided_phrase(
    'English', 'German', '__120 Fresh Guided English__', '__120_path__',
    '__120_lesson__', 'bright', 'Keep this exact phrase.', 'Behalte diesen genauen Satz.'
  ) into v_replacement;
  update hardening_120_context set replacement_deck_id = (v_replacement->>'deck_id')::uuid;

  if v_replacement->>'inserted' <> 'true'
     or (v_replacement->>'deck_id')::uuid = (select first_deck_id from hardening_120_context)
     or (select word_count from public.decks where id = (v_replacement->>'deck_id')::uuid) <> 1 then
    raise exception 'Keep after delete did not create a fresh one-word deck: %', v_replacement;
  end if;
end
$$;

rollback;
