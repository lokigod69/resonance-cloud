-- Post-migration integration checks for 20260907131000.
-- Run with psql after applying the migration. Every learner write is rolled back.
\set ON_ERROR_STOP on

begin;

create temporary table hardening_131_locales (
  base_language text primary key
) on commit drop;

insert into hardening_131_locales values
  ('Bisaya'), ('English'), ('French'), ('German'), ('Indonesian'), ('Italian'),
  ('Japanese'), ('Korean'), ('Polish'), ('Portuguese'), ('Russian'), ('Spanish');

-- This digest is over every canonical coordinate, all 12 published base-language
-- values, and the catalog content hash. It catches a missing, stale, or altered
-- value without duplicating the 32,400-row migration in the test.
do $$
declare
  v_payload text;
  v_digest text;
begin
  if (select count(*) from public.guided_phrase_catalog) <> 2700 then
    raise exception 'Expected exactly 2,700 guided phrase catalog rows';
  end if;

  if (
    select count(*)
      from public.guided_phrase_catalog c
      cross join hardening_131_locales l
     where nullif(btrim(c.translations ->> l.base_language), '') is not null
       and length(c.translations ->> l.base_language) <= 1000
  ) <> 32400 then
    raise exception 'Expected 32,400 nonempty bounded guided base-language values';
  end if;

  select string_agg(
           concat_ws(chr(31), c.path_id, c.lesson_id, c.vibe, l.base_language,
                     c.translations ->> l.base_language, c.content_hash),
           chr(30)
           order by c.path_id collate "C", c.lesson_id collate "C",
                    c.vibe collate "C", l.base_language collate "C"
         )
    into v_payload
    from public.guided_phrase_catalog c
    cross join hardening_131_locales l;

  v_digest := encode(extensions.digest(convert_to(v_payload, 'UTF8'), 'sha256'), 'hex');
  if v_digest <> 'cd222fe3279333f9f520c5806cb111176ad76796a1e55594b52dee0d99535157' then
    raise exception 'Guided phrase locale digest mismatch: %', v_digest;
  end if;
end
$$;

create temporary table hardening_131_context (
  user_id uuid not null,
  initial_credits integer,
  initial_decks bigint,
  initial_words bigint,
  initial_jobs bigint,
  audio_path_id text,
  audio_lesson_id text,
  audio_vibe text,
  audio_target text,
  audio_phrase text,
  audio_translation text,
  audio_translation_german text,
  audio_hash text,
  audio_word_id uuid,
  no_audio_path_id text,
  no_audio_lesson_id text,
  no_audio_vibe text,
  no_audio_target text,
  no_audio_phrase text,
  no_audio_translation text,
  no_audio_hash text,
  no_audio_word_id uuid
) on commit drop;

insert into hardening_131_context (user_id)
select id
  from public.profiles
 where role = 'learner'
 order by created_at asc nulls last, id asc
 limit 1;

update hardening_131_context c set
  initial_credits = (select credits from public.profiles where id = c.user_id),
  initial_decks = (select count(*) from public.decks where user_id = c.user_id),
  initial_words = (select count(*) from public.words where user_id = c.user_id),
  initial_jobs = (select count(*) from public.generation_jobs where user_id = c.user_id);

do $$
begin
  if not exists (select 1 from hardening_131_context) then
    raise exception 'Integration test requires an existing learner profile';
  end if;
end
$$;

-- Choose a real published catalog coordinate whose new French meaning was added
-- by 131000 and whose registered core recording is consistently usable.
with candidate as (
  select c.path_id, c.lesson_id, c.vibe, c.target_language, c.phrase,
         c.translations ->> 'French' as translation,
         c.translations ->> 'German' as translation_german,
         c.content_hash
    from public.guided_phrase_catalog c
   where c.authored_base_language <> 'French'
     and nullif(btrim(c.translations ->> 'French'), '') is not null
     and exists (
       select 1
         from public.guided_tts_asset_usages u
         join public.guided_tts_assets a on a.id = u.asset_id
        where u.path_id = c.path_id and u.lesson_id = c.lesson_id and u.vibe = c.vibe
          and u.surface = 'corePhrase' and u.surface_key = '__self'
          and btrim(u.source_text) = btrim(c.phrase)
          and a.target_language_code = c.target_language_code
          and a.status = 'ready' and nullif(btrim(a.public_url), '') is not null
     )
     and not exists (
       select 1
         from public.guided_tts_asset_usages u
         join public.guided_tts_assets a on a.id = u.asset_id
        where u.path_id = c.path_id and u.lesson_id = c.lesson_id and u.vibe = c.vibe
          and u.surface = 'corePhrase' and u.surface_key = '__self'
          and (btrim(u.source_text) is distinct from btrim(c.phrase)
            or a.target_language_code is distinct from c.target_language_code
            or a.status is distinct from 'ready'
            or nullif(btrim(a.public_url), '') is null)
     )
     and not exists (
       select 1 from public.words w
        where w.user_id = (select user_id from hardening_131_context)
          and lower(btrim(w.word)) = lower(btrim(c.phrase)) and w.status <> 'failed'
     )
   order by c.path_id, c.lesson_id, c.vibe
   limit 1
)
update hardening_131_context x set
  audio_path_id = c.path_id,
  audio_lesson_id = c.lesson_id,
  audio_vibe = c.vibe,
  audio_target = c.target_language,
  audio_phrase = c.phrase,
  audio_translation = c.translation,
  audio_translation_german = c.translation_german,
  audio_hash = c.content_hash
from candidate c;

-- Also choose a real catalog coordinate with no registered core recording. It
-- must remain keepable without falsely claiming generated audio provenance.
with candidate as (
  select c.path_id, c.lesson_id, c.vibe, c.target_language, c.phrase,
         c.translations ->> 'French' as translation, c.content_hash
    from public.guided_phrase_catalog c
   where c.authored_base_language <> 'French'
     and nullif(btrim(c.translations ->> 'French'), '') is not null
     and not exists (
       select 1 from public.guided_tts_asset_usages u
        where u.path_id = c.path_id and u.lesson_id = c.lesson_id and u.vibe = c.vibe
          and u.surface = 'corePhrase' and u.surface_key = '__self'
     )
     and not exists (
       select 1 from public.words w
        where w.user_id = (select user_id from hardening_131_context)
          and lower(btrim(w.word)) = lower(btrim(c.phrase)) and w.status <> 'failed'
     )
     and c.phrase is distinct from (select audio_phrase from hardening_131_context)
   order by c.path_id, c.lesson_id, c.vibe
   limit 1
)
update hardening_131_context x set
  no_audio_path_id = c.path_id,
  no_audio_lesson_id = c.lesson_id,
  no_audio_vibe = c.vibe,
  no_audio_target = c.target_language,
  no_audio_phrase = c.phrase,
  no_audio_translation = c.translation,
  no_audio_hash = c.content_hash
from candidate c;

do $$
begin
  if exists (
    select 1 from hardening_131_context
     where audio_path_id is null or no_audio_path_id is null
  ) then
    raise exception 'Integration test requires one unused audio and one unused no-audio catalog coordinate';
  end if;
end
$$;

grant select, update on hardening_131_context to authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_131_context), true);
set local role authenticated;

do $$
declare
  v_audio jsonb;
  v_no_audio jsonb;
  v_duplicate jsonb;
  v_other_base jsonb;
begin
  select public.keep_guided_phrase(
    audio_target, 'French', '__131 Guided__', audio_path_id,
    audio_lesson_id, audio_vibe, audio_phrase, audio_translation
  ) into v_audio
  from hardening_131_context;
  if v_audio->>'inserted' <> 'true' then
    raise exception 'New-base catalog phrase with audio was not inserted: %', v_audio;
  end if;
  update hardening_131_context set audio_word_id = (v_audio->>'word_id')::uuid;

  select public.keep_guided_phrase(
    no_audio_target, 'French', '__131 Guided__', no_audio_path_id,
    no_audio_lesson_id, no_audio_vibe, no_audio_phrase, no_audio_translation
  ) into v_no_audio
  from hardening_131_context;
  if v_no_audio->>'inserted' <> 'true' then
    raise exception 'New-base catalog phrase without audio was not inserted: %', v_no_audio;
  end if;
  update hardening_131_context set no_audio_word_id = (v_no_audio->>'word_id')::uuid;

  select public.keep_guided_phrase(
    audio_target, 'French', '__131 ignored__', audio_path_id,
    audio_lesson_id, audio_vibe, audio_phrase, audio_translation
  ) into v_duplicate
  from hardening_131_context;
  if v_duplicate->>'inserted' <> 'false'
    or (v_duplicate->>'word_id')::uuid <> (v_audio->>'word_id')::uuid
  then
    raise exception 'New-base catalog keep was not idempotent: %, %', v_audio, v_duplicate;
  end if;

  -- Changing the requested explanation language must identify the already-kept
  -- phrase without rewriting its original saved meaning or provenance.
  select public.keep_guided_phrase(
    x.audio_target, 'German', '__131 ignored__', x.audio_path_id,
    x.audio_lesson_id, x.audio_vibe, x.audio_phrase, x.audio_translation_german
  ) into v_other_base
  from hardening_131_context x;
  if v_other_base->>'inserted' <> 'false'
    or (v_other_base->>'word_id')::uuid <> (v_audio->>'word_id')::uuid
  then
    raise exception 'Base-language change did not preserve kept phrase identity: %, %', v_audio, v_other_base;
  end if;
end
$$;

set local role postgres;

do $$
begin
  if not exists (
    select 1
      from hardening_131_context x
      join public.words w on w.id = x.audio_word_id and w.user_id = x.user_id
     where w.word = x.audio_phrase
       and w.translation = x.audio_translation
       and w.metadata#>>'{guided,path_id}' = x.audio_path_id
       and w.metadata#>>'{guided,lesson_id}' = x.audio_lesson_id
       and w.metadata#>>'{guided,vibe}' = x.audio_vibe
       and w.metadata#>>'{guided,catalog_hash}' = x.audio_hash
       and w.metadata#>>'{base_language}' = 'French'
       and w.tts_status = 'ready'
       and exists (
         select 1
           from public.guided_tts_asset_usages u
           join public.guided_tts_assets a on a.id = u.asset_id
          where u.path_id = x.audio_path_id and u.lesson_id = x.audio_lesson_id
            and u.vibe = x.audio_vibe and u.surface = 'corePhrase' and u.surface_key = '__self'
            and btrim(u.source_text) = btrim(x.audio_phrase)
            and a.status = 'ready' and a.public_url = w.tts_audio_url
       )
  ) then
    raise exception 'New-base word lost canonical identity or exact registered audio provenance';
  end if;

  if not exists (
    select 1
      from hardening_131_context x
      join public.words w on w.id = x.no_audio_word_id and w.user_id = x.user_id
     where w.word = x.no_audio_phrase
       and w.translation = x.no_audio_translation
       and w.metadata#>>'{guided,catalog_hash}' = x.no_audio_hash
       and w.metadata#>>'{base_language}' = 'French'
       and w.tts_audio_url is null and w.tts_status is null
  ) then
    raise exception 'No-audio new-base word claimed audio or lost canonical provenance';
  end if;

  if (select count(*) from public.words where user_id = (select user_id from hardening_131_context))
       <> (select initial_words + 2 from hardening_131_context)
    or (select count(*) from public.generation_jobs where user_id = (select user_id from hardening_131_context))
       <> (select initial_jobs from hardening_131_context)
    or (select credits from public.profiles where id = (select user_id from hardening_131_context))
       is distinct from (select initial_credits from hardening_131_context)
  then
    raise exception 'Locale catalog keep changed paid-pipeline state or inserted the wrong word count';
  end if;
end
$$;

rollback;
