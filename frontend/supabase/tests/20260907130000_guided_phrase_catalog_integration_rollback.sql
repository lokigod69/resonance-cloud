-- Post-migration integration checks for 20260907130000.
-- Run with psql after applying the migration. Every fixture write is rolled back.
\set ON_ERROR_STOP on

begin;

create temporary table hardening_130_context (
  user_id uuid not null,
  asset_id uuid,
  initial_credits integer,
  initial_decks bigint,
  initial_words bigint,
  initial_jobs bigint,
  no_audio_word_id uuid,
  audio_word_id uuid
) on commit drop;

insert into hardening_130_context (user_id)
select id from public.profiles
where role = 'learner'
order by created_at asc nulls last, id asc
limit 1;

update hardening_130_context c set
  initial_credits = (select credits from public.profiles where id = c.user_id),
  initial_decks = (select count(*) from public.decks where user_id = c.user_id),
  initial_words = (select count(*) from public.words where user_id = c.user_id),
  initial_jobs = (select count(*) from public.generation_jobs where user_id = c.user_id);

do $$
begin
  if not exists (select 1 from hardening_130_context) then
    raise exception 'Integration test requires an existing learner profile';
  end if;
end
$$;

insert into public.guided_phrase_catalog (
  path_id, lesson_id, lesson_number, vibe, target_language,
  target_language_code, authored_base_language, phrase, translations, content_hash
) values
  ('__130_path__', '__130_no_audio__', 1, 'bright', 'English', 'en-US', 'German',
   'Catalog phrase without audio.',
   '{"English":"Catalog phrase without audio.","German":"Katalogsatz ohne Audio."}'::jsonb,
   repeat('a', 64)),
  ('__130_path__', '__130_with_audio__', 2, 'bright', 'English', 'en-US', 'German',
   'Catalog phrase with audio.',
   '{"English":"Catalog phrase with audio.","German":"Katalogsatz mit Audio."}'::jsonb,
   repeat('b', 64));

with created as (
  insert into public.guided_tts_assets (
    provider, target_language_code, voice_profile_key, provider_voice_id,
    provider_model_id, output_format, voice_settings_hash,
    normalization_version, text, normalized_text, text_hash, cache_key,
    storage_bucket, storage_path, public_url, content_type,
    character_count, status, generated_at
  ) values (
    'elevenlabs', 'en-US', '__130_voice__', '__130_provider_voice__',
    '__130_model__', 'mp3_44100_128', '__130_settings__',
    'v1', 'Catalog phrase with audio.', 'catalog phrase with audio.', '__130_text_hash__',
    '__130_cache_' || gen_random_uuid()::text, 'guided-tts',
    '__130__/exact.mp3', '/storage/v1/object/public/guided-tts/__130__/exact.mp3',
    'audio/mpeg', 26, 'ready', now()
  ) returning id
)
update hardening_130_context set asset_id = created.id from created;

insert into public.guided_tts_asset_usages (
  asset_id, path_id, lesson_id, lesson_number, vibe, surface, surface_key, source_text
)
select asset_id, '__130_path__', '__130_with_audio__', 2, 'bright',
       'corePhrase', '__self', 'Catalog phrase with audio.'
from hardening_130_context;

grant select, update on hardening_130_context to authenticated;

-- Anonymous callers cannot execute the definer RPC with a forged subject.
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_130_context), true);
set local role anon;
do $$
begin
  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__130 Guided English__', '__130_path__',
      '__130_no_audio__', 'bright', 'Catalog phrase without audio.', 'Katalogsatz ohne Audio.'
    );
    raise exception 'Anonymous catalog keep unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;

set local role postgres;
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_130_context), true);
set local role authenticated;

-- Browser roles cannot read or mutate the server-owned catalog.
do $$
begin
  begin
    perform 1 from public.guided_phrase_catalog limit 1;
    raise exception 'Authenticated catalog read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.guided_phrase_catalog (
      path_id, lesson_id, lesson_number, vibe, target_language,
      target_language_code, authored_base_language, phrase, translations, content_hash
    ) values (
      '__forged__', '__forged__', 1, 'bright', 'English', 'en-US', 'English',
      'Forged phrase.', '{"English":"Forged phrase."}'::jsonb, repeat('c', 64)
    );
    raise exception 'Authenticated catalog insert unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;

-- Invalid requests fail before a deck or word can be created.
do $$
begin
  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__130 Guided English__', '__130_path__',
      '__130_unregistered__', 'bright', 'Unregistered phrase.', 'Nicht registriert.'
    );
    raise exception 'Unregistered coordinate unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__130 Guided English__', '__130_path__',
      '__130_no_audio__', 'bright', 'Changed caller phrase.', 'Katalogsatz ohne Audio.'
    );
    raise exception 'Mismatched phrase unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.keep_guided_phrase(
      'French', 'German', '__130 Guided French__', '__130_path__',
      '__130_no_audio__', 'bright', 'Catalog phrase without audio.', 'Katalogsatz ohne Audio.'
    );
    raise exception 'Mismatched target language unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;
  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__130 Guided English__', '__130_path__',
      '__130_no_audio__', 'bright', 'Catalog phrase without audio.', 'Manipulierte Übersetzung.'
    );
    raise exception 'Mismatched registered translation unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;

  if (select count(*) from public.decks where user_id = (select user_id from hardening_130_context))
       <> (select initial_decks from hardening_130_context)
    or (select count(*) from public.words where user_id = (select user_id from hardening_130_context))
       <> (select initial_words from hardening_130_context)
  then
    raise exception 'Rejected catalog requests changed learner content';
  end if;
end
$$;

-- A registered phrase without audio remains keepable, but cannot claim audio.
do $$
declare
  v_no_audio jsonb;
  v_audio jsonb;
  v_duplicate jsonb;
begin
  select public.keep_guided_phrase(
    'English', 'German', '__130 Guided English__', '__130_path__',
    '__130_no_audio__', 'bright', 'Catalog phrase without audio.', 'Katalogsatz ohne Audio.'
  ) into v_no_audio;
  if v_no_audio->>'inserted' <> 'true' then
    raise exception 'Registered no-audio phrase was not inserted: %', v_no_audio;
  end if;
  update hardening_130_context set no_audio_word_id = (v_no_audio->>'word_id')::uuid;
  if not exists (
    select 1 from public.words where id = (v_no_audio->>'word_id')::uuid
      and tts_audio_url is null and tts_status is null
      and metadata#>>'{guided,catalog_hash}' = repeat('a', 64)
  ) then
    raise exception 'No-audio catalog word claimed audio or lost provenance';
  end if;

  select public.keep_guided_phrase(
    'English', 'German', '__130 ignored__', '__130_path__',
    '__130_with_audio__', 'bright', 'Catalog phrase with audio.', 'Katalogsatz mit Audio.'
  ) into v_audio;
  if v_audio->>'inserted' <> 'true' then
    raise exception 'Registered audio phrase was not inserted: %', v_audio;
  end if;
  update hardening_130_context set audio_word_id = (v_audio->>'word_id')::uuid;
  if not exists (
    select 1 from public.words where id = (v_audio->>'word_id')::uuid
      and tts_audio_url = '/storage/v1/object/public/guided-tts/__130__/exact.mp3'
      and tts_status = 'ready'
      and metadata#>>'{guided,catalog_hash}' = repeat('b', 64)
  ) then
    raise exception 'Audio catalog word did not retain exact registered audio provenance';
  end if;

  select public.keep_guided_phrase(
    'English', 'German', '__130 ignored__', '__130_path__',
    '__130_with_audio__', 'bright', 'Catalog phrase with audio.', 'Katalogsatz mit Audio.'
  ) into v_duplicate;
  if v_duplicate->>'inserted' <> 'false'
    or (v_duplicate->>'word_id')::uuid <> (v_audio->>'word_id')::uuid
  then
    raise exception 'Catalog keep was not idempotent: %, %', v_audio, v_duplicate;
  end if;
end
$$;

do $$
begin
  if (select count(*) from public.words where user_id = (select user_id from hardening_130_context))
       <> (select initial_words + 2 from hardening_130_context)
    or (select count(*) from public.generation_jobs where user_id = (select user_id from hardening_130_context))
       <> (select initial_jobs from hardening_130_context)
    or (select credits from public.profiles where id = (select user_id from hardening_130_context))
       is distinct from (select initial_credits from hardening_130_context)
  then
    raise exception 'Catalog keep changed paid-pipeline state or inserted the wrong word count';
  end if;
end
$$;

-- A corrupted audio usage is rejected even when the phrase is already kept.
set local role postgres;
update public.guided_tts_asset_usages
set source_text = 'Corrupted audio source.'
where path_id = '__130_path__' and lesson_id = '__130_with_audio__'
  and vibe = 'bright' and surface = 'corePhrase' and surface_key = '__self';
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_130_context), true);
set local role authenticated;
do $$
begin
  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__130 ignored__', '__130_path__',
      '__130_with_audio__', 'bright', 'Catalog phrase with audio.', 'Katalogsatz mit Audio.'
    );
    raise exception 'Corrupted registered audio unexpectedly succeeded';
  exception when sqlstate '22023' then null;
  end;
end
$$;

rollback;
