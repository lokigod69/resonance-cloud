-- Post-migration integration checks for 20260907132000.
-- Run with psql after applying the migration. Every learner write is rolled back.
\set ON_ERROR_STOP on

begin;

do $$
declare
  v_value text;
begin
  select c.translations ->> 'Italian'
    into v_value
    from public.guided_phrase_catalog c
   where c.path_id = 'japanese-a1-practical-1'
     and c.lesson_id = 'japanese-a1-practical-1-lesson-5-korewa-nan-desuka'
     and c.vibe = 'bright'
     and c.content_hash = 'c1ed5405f8d17689d82cad41a27b36daed4923df00e30f6e3bd854afcdac977b';
  if not found or v_value is distinct from 'Cos''è questo?' then
    raise exception 'Corrected Guided Italian meaning is absent: %', v_value;
  end if;
end
$$;

create temporary table hardening_132_context (
  user_id uuid not null,
  initial_credits integer,
  initial_words bigint,
  initial_jobs bigint,
  word_id uuid
) on commit drop;

insert into hardening_132_context (user_id)
select p.id
  from public.profiles p
 where p.role = 'learner'
   and not exists (
     select 1 from public.words w
      where w.user_id = p.id
        and lower(btrim(w.word)) = lower(btrim('これは 何 ですか。'))
        and w.status <> 'failed'
   )
 order by p.created_at asc nulls last, p.id
 limit 1;

update hardening_132_context c set
  initial_credits = (select credits from public.profiles where id = c.user_id),
  initial_words = (select count(*) from public.words where user_id = c.user_id),
  initial_jobs = (select count(*) from public.generation_jobs where user_id = c.user_id);

do $$
begin
  if not exists (select 1 from hardening_132_context) then
    raise exception 'Integration test requires a learner without the corrected phrase';
  end if;
end
$$;

grant select, update on hardening_132_context to authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_132_context), true);
set local role authenticated;

do $$
declare
  v_result jsonb;
begin
  begin
    perform public.keep_guided_phrase(
      'Japanese', 'Italian', '__132 Guided Japanese__', 'japanese-a1-practical-1',
      'japanese-a1-practical-1-lesson-5-korewa-nan-desuka', 'bright',
      'これは 何 ですか。', E'Cos''è questo? \nQuesto è un oggetto che non conosco. Cos''è?'
    );
    raise exception 'Obsolete invented Italian meaning unexpectedly passed catalog validation';
  exception when sqlstate '22023' then null;
  end;

  select public.keep_guided_phrase(
    'Japanese', 'Italian', '__132 Guided Japanese__', 'japanese-a1-practical-1',
    'japanese-a1-practical-1-lesson-5-korewa-nan-desuka', 'bright',
    'これは 何 ですか。', 'Cos''è questo?'
  ) into v_result;
  if v_result->>'inserted' <> 'true' then
    raise exception 'Corrected Italian meaning was not kept: %', v_result;
  end if;
  update hardening_132_context set word_id = (v_result->>'word_id')::uuid;
end
$$;

set local role postgres;

do $$
begin
  if not exists (
    select 1
      from hardening_132_context c
      join public.words w on w.id = c.word_id and w.user_id = c.user_id
     where w.word = 'これは 何 ですか。'
       and w.translation = 'Cos''è questo?'
       and w.metadata#>>'{guided,path_id}' = 'japanese-a1-practical-1'
       and w.metadata#>>'{guided,lesson_id}' = 'japanese-a1-practical-1-lesson-5-korewa-nan-desuka'
       and w.metadata#>>'{guided,vibe}' = 'bright'
       and w.metadata#>>'{guided,catalog_hash}' = 'c1ed5405f8d17689d82cad41a27b36daed4923df00e30f6e3bd854afcdac977b'
       and w.metadata#>>'{base_language}' = 'Italian'
  ) then
    raise exception 'Corrected Italian Keep lost canonical phrase identity';
  end if;

  if (select count(*) from public.words where user_id = (select user_id from hardening_132_context))
       <> (select initial_words + 1 from hardening_132_context)
    or (select count(*) from public.generation_jobs where user_id = (select user_id from hardening_132_context))
       <> (select initial_jobs from hardening_132_context)
    or (select credits from public.profiles where id = (select user_id from hardening_132_context))
       is distinct from (select initial_credits from hardening_132_context)
  then
    raise exception 'Corrected Italian Keep changed paid-pipeline state or inserted the wrong word count';
  end if;
end
$$;

rollback;
