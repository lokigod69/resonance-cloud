-- Post-migration integration checks for 20260907133000.
-- Run with psql after applying the migration. Every fixture write is rolled back.
\set ON_ERROR_STOP on

begin;

do $$
declare
  v_joined bigint;
  v_source_mismatches bigint;
  v_code_mismatches bigint;
begin
  select count(*),
         count(*) filter (where btrim(u.source_text) is distinct from btrim(c.phrase)),
         count(*) filter (where not coalesce((
           lower(btrim(a.target_language_code)) = lower(btrim(c.target_language_code))
           or (
             position('-' in btrim(c.target_language_code)) > 0
             and lower(btrim(a.target_language_code)) = split_part(lower(btrim(c.target_language_code)), '-', 1)
           )
         ), false))
    into v_joined, v_source_mismatches, v_code_mismatches
    from public.guided_phrase_catalog c
    join public.guided_tts_asset_usages u
      on u.path_id = c.path_id and u.lesson_id = c.lesson_id and u.vibe = c.vibe
     and u.surface = 'corePhrase' and u.surface_key = '__self'
    join public.guided_tts_assets a on a.id = u.asset_id;

  if v_joined <> 2501 or v_source_mismatches <> 0 or v_code_mismatches <> 0 then
    raise exception 'Guided catalog audio identity is incomplete: joined %, source %, code %',
      v_joined, v_source_mismatches, v_code_mismatches;
  end if;

  if (select count(*) from public.guided_tts_asset_usage_quarantine
       where quarantined_by_migration = '20260907133000') <> 1 then
    raise exception 'Expected one reversibly quarantined Guided usage';
  end if;

  if not exists (
    select 1
      from public.guided_tts_asset_usage_quarantine q
      join public.guided_tts_assets a
        on a.id = (q.original_row ->> 'asset_id')::uuid
     where q.quarantined_by_migration = '20260907133000'
       and q.reason = 'Core phrase source differs from canonical Guided catalog phrase'
       and q.original_row ->> 'path_id' = 'english-a1-practical-1'
       and q.original_row ->> 'lesson_id' = 'english-a1-practical-001-first-contact'
       and q.original_row ->> 'vibe' = 'wistful'
       and q.original_row ->> 'surface' = 'corePhrase'
       and q.original_row ->> 'surface_key' = '__self'
       and q.original_row ->> 'source_text' = 'Sorry to ask — do you happen to speak English?'
  ) then
    raise exception 'Quarantined Guided usage is incomplete or its recording asset was removed';
  end if;
end
$$;

-- Browser roles cannot inspect the private reversible quarantine.
set local role anon;
do $$
begin
  begin
    perform 1 from public.guided_tts_asset_usage_quarantine limit 1;
    raise exception 'Anonymous quarantine read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;
set local role authenticated;
do $$
begin
  begin
    perform 1 from public.guided_tts_asset_usage_quarantine limit 1;
    raise exception 'Authenticated quarantine read unexpectedly succeeded';
  exception when insufficient_privilege then null;
  end;
end
$$;
set local role postgres;

create temporary table hardening_133_context (
  user_id uuid not null,
  initial_credits integer,
  initial_words bigint,
  initial_jobs bigint,
  mismatch_usage_id uuid,
  japanese_word_id uuid,
  english_word_id uuid
) on commit drop;

insert into hardening_133_context (user_id, mismatch_usage_id)
select p.id, (q.original_row ->> 'id')::uuid
  from public.profiles p
  cross join public.guided_tts_asset_usage_quarantine q
 where p.role = 'learner'
   and q.quarantined_by_migration = '20260907133000'
   and not exists (
     select 1 from public.words w
      where w.user_id = p.id and w.status <> 'failed'
        and lower(btrim(w.word)) in (
          lower(btrim('これは 何 ですか。')),
          lower(btrim('Do you speak a little English?'))
        )
   )
 order by p.created_at asc nulls last, p.id
 limit 1;

update hardening_133_context c set
  initial_credits = (select credits from public.profiles where id = c.user_id),
  initial_words = (select count(*) from public.words where user_id = c.user_id),
  initial_jobs = (select count(*) from public.generation_jobs where user_id = c.user_id);

do $$
begin
  if not exists (select 1 from hardening_133_context) then
    raise exception 'Integration test requires a learner without either fixture phrase';
  end if;
end
$$;

-- Restore the archived mismatched link transactionally to prove exact source
-- identity still rejects it. The recording asset itself was never deleted.
insert into public.guided_tts_asset_usages (
  id, asset_id, path_id, lesson_id, lesson_number, vibe,
  surface, surface_key, source_text, created_at
)
select (q.original_row ->> 'id')::uuid,
       (q.original_row ->> 'asset_id')::uuid,
       q.original_row ->> 'path_id',
       q.original_row ->> 'lesson_id',
       (q.original_row ->> 'lesson_number')::integer,
       q.original_row ->> 'vibe',
       q.original_row ->> 'surface',
       q.original_row ->> 'surface_key',
       q.original_row ->> 'source_text',
       (q.original_row ->> 'created_at')::timestamptz
  from public.guided_tts_asset_usage_quarantine q
 where q.quarantined_by_migration = '20260907133000';

grant select, update on hardening_133_context to authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_133_context), true);
set local role authenticated;

do $$
begin
  begin
    perform public.keep_guided_phrase(
      'English', 'German', '__133 Guided English__', 'english-a1-practical-1',
      'english-a1-practical-001-first-contact', 'wistful',
      'Do you speak a little English?', 'Sprechen Sie ein bisschen Englisch?'
    );
    raise exception 'Mismatched Guided audio source unexpectedly passed identity validation';
  exception when sqlstate '22023' then null;
  end;
end
$$;

set local role postgres;
delete from public.guided_tts_asset_usages
 where id = (select mismatch_usage_id from hardening_133_context);

select set_config('request.jwt.claim.sub', (select user_id::text from hardening_133_context), true);
set local role authenticated;

do $$
declare
  v_japanese jsonb;
  v_english jsonb;
begin
  select public.keep_guided_phrase(
    'Japanese', 'Italian', '__133 Guided Japanese__', 'japanese-a1-practical-1',
    'japanese-a1-practical-1-lesson-5-korewa-nan-desuka', 'bright',
    'これは 何 ですか。', 'Cos''è questo?'
  ) into v_japanese;
  if v_japanese ->> 'inserted' <> 'true' then
    raise exception 'Primary-subtag Japanese recording was not keepable: %', v_japanese;
  end if;
  update hardening_133_context set japanese_word_id = (v_japanese ->> 'word_id')::uuid;

  select public.keep_guided_phrase(
    'English', 'German', '__133 Guided English__', 'english-a1-practical-1',
    'english-a1-practical-001-first-contact', 'wistful',
    'Do you speak a little English?', 'Sprechen Sie ein bisschen Englisch?'
  ) into v_english;
  if v_english ->> 'inserted' <> 'true' then
    raise exception 'Quarantined coordinate was not keepable without audio: %', v_english;
  end if;
  update hardening_133_context set english_word_id = (v_english ->> 'word_id')::uuid;
end
$$;

set local role postgres;

do $$
begin
  if not exists (
    select 1
      from hardening_133_context c
      join public.words w on w.id = c.japanese_word_id and w.user_id = c.user_id
     where w.word = 'これは 何 ですか。'
       and w.translation = 'Cos''è questo?'
       and w.tts_status = 'ready'
       and exists (
         select 1
           from public.guided_tts_asset_usages u
           join public.guided_tts_assets a on a.id = u.asset_id
          where u.path_id = 'japanese-a1-practical-1'
            and u.lesson_id = 'japanese-a1-practical-1-lesson-5-korewa-nan-desuka'
            and u.vibe = 'bright' and u.surface = 'corePhrase' and u.surface_key = '__self'
            and a.target_language_code = 'ja' and a.public_url = w.tts_audio_url
       )
  ) then
    raise exception 'Japanese primary-subtag Keep lost exact recording provenance';
  end if;

  if not exists (
    select 1
      from hardening_133_context c
      join public.words w on w.id = c.english_word_id and w.user_id = c.user_id
     where w.word = 'Do you speak a little English?'
       and w.translation = 'Sprechen Sie ein bisschen Englisch?'
       and w.tts_audio_url is null and w.tts_status is null
  ) then
    raise exception 'Quarantined coordinate falsely retained mismatched audio';
  end if;

  if (select count(*) from public.words where user_id = (select user_id from hardening_133_context))
       <> (select initial_words + 2 from hardening_133_context)
    or (select count(*) from public.generation_jobs where user_id = (select user_id from hardening_133_context))
       <> (select initial_jobs from hardening_133_context)
    or (select credits from public.profiles where id = (select user_id from hardening_133_context))
       is distinct from (select initial_credits from hardening_133_context)
  then
    raise exception 'Guided TTS identity test changed paid-pipeline state or inserted the wrong word count';
  end if;
end
$$;

rollback;
