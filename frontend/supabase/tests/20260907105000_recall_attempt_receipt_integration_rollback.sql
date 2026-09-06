-- Post-migration integration checks for 20260907105000.
-- Run with psql against the linked database after applying the migration.
-- All fixture writes are rolled back.

\set ON_ERROR_STOP on

begin;

create temporary table hardening_105_context (
  user_id uuid not null,
  deck_id uuid,
  word_id uuid,
  foreign_user_id uuid,
  foreign_deck_id uuid,
  foreign_word_id uuid,
  receipt_id uuid not null default gen_random_uuid(),
  clock_receipt_id uuid not null default gen_random_uuid(),
  occurred_at timestamptz not null default '2026-09-06 08:00:00+00'
) on commit drop;

insert into hardening_105_context (user_id)
select id
from public.profiles
where role = 'learner'
order by created_at asc nulls last, id asc
limit 1;

update hardening_105_context c
set foreign_user_id = (
  select id from public.profiles
  where role = 'learner' and id <> c.user_id
  order by created_at asc nulls last, id asc
  limit 1
);

do $$
begin
  if not exists (select 1 from hardening_105_context where foreign_user_id is not null) then
    raise exception 'Integration test requires two existing learner profiles';
  end if;
end
$$;

select set_config('app.allow_phase1e_pipeline_update', 'on', true);

with created as (
  insert into public.decks (
    user_id, name, target_language, word_count, status, deck_type, source_kind
  )
  select user_id, '__105 recall receipts__', 'German', 1, 'complete', 'card_text', 'user'
  from hardening_105_context
  returning id
)
update hardening_105_context set deck_id = created.id from created;

with created as (
  insert into public.words (
    deck_id, user_id, word, original_input, translation, status, current_stage
  )
  select deck_id, user_id, '__105 word__', '__105 word__', 'word', 'complete', 'complete'
  from hardening_105_context
  returning id
)
update hardening_105_context set word_id = created.id from created;

with created as (
  insert into public.decks (
    user_id, name, target_language, word_count, status, deck_type, source_kind
  )
  select foreign_user_id, '__105 foreign receipts__', 'German', 1, 'complete', 'card_text', 'user'
  from hardening_105_context
  returning id
)
update hardening_105_context set foreign_deck_id = created.id from created;

with created as (
  insert into public.words (
    deck_id, user_id, word, original_input, translation, status, current_stage
  )
  select foreign_deck_id, foreign_user_id, '__105 foreign word__', '__105 foreign word__', 'word', 'complete', 'complete'
  from hardening_105_context
  returning id
)
update hardening_105_context set foreign_word_id = created.id from created;

grant select on hardening_105_context to authenticated;
select set_config('request.jwt.claim.sub', (select user_id::text from hardening_105_context), true);
select set_config('app.allow_phase1e_pipeline_update', 'off', true);
set local role authenticated;

do $$
declare
  v_first jsonb;
  v_duplicate jsonb;
  v_missing jsonb;
  v_foreign jsonb;
  v_clock_skew jsonb;
  v_clock_retry jsonb;
  v_count integer;
  v_created_at timestamptz;
begin
  select public.record_recall_attempt(
    receipt_id, word_id, true, 'flashcard', '{"fixture":105}'::jsonb, occurred_at
  ) into v_first
  from hardening_105_context;
  if v_first->>'status' <> 'inserted' then
    raise exception 'First receipt was not inserted: %', v_first;
  end if;

  select public.record_recall_attempt(
    receipt_id, word_id, true, 'flashcard', '{"fixture":105}'::jsonb, occurred_at
  ) into v_duplicate
  from hardening_105_context;
  if v_duplicate->>'status' <> 'duplicate'
     or v_duplicate->>'attempt_id' is distinct from v_first->>'attempt_id' then
    raise exception 'Retry was not idempotent: first %, duplicate %', v_first, v_duplicate;
  end if;

  select count(*), min(created_at)
    into v_count, v_created_at
    from public.recall_attempts
   where user_id = (select user_id from hardening_105_context)
     and client_receipt_id = (select receipt_id from hardening_105_context);
  if v_count <> 1 or v_created_at is distinct from (select occurred_at from hardening_105_context) then
    raise exception 'Receipt count/time mismatch: count %, time %', v_count, v_created_at;
  end if;

  begin
    perform public.record_recall_attempt(
      receipt_id, word_id, false, 'flashcard', '{"fixture":105}'::jsonb, occurred_at
    ) from hardening_105_context;
    raise exception 'Conflicting payload was acknowledged';
  exception when sqlstate '22000' then
    null;
  end;

  select public.record_recall_attempt(
    gen_random_uuid(), gen_random_uuid(), true, 'flashcard', null, now()
  ) into v_missing;
  if v_missing->>'status' <> 'discarded' or v_missing->>'reason' <> 'word_unavailable' then
    raise exception 'Missing word was not terminally discarded: %', v_missing;
  end if;

  select public.record_recall_attempt(
    gen_random_uuid(), foreign_word_id, true, 'flashcard', null, now()
  ) into v_foreign
  from hardening_105_context;
  if v_foreign->>'status' <> 'discarded' or v_foreign->>'reason' <> 'word_unavailable' then
    raise exception 'Foreign-owned word was not rejected without disclosure: %', v_foreign;
  end if;

  select public.record_recall_attempt(
    clock_receipt_id, word_id, true, 'flashcard', null, now() + interval '1 day'
  ) into v_clock_skew
  from hardening_105_context;
  if v_clock_skew->>'status' <> 'clock_skew' or nullif(v_clock_skew->>'occurred_at', '') is null then
    raise exception 'Future occurrence did not return a bounded clock correction: %', v_clock_skew;
  end if;

  select public.record_recall_attempt(
    clock_receipt_id,
    word_id, true, 'flashcard', null, (v_clock_skew->>'occurred_at')::timestamptz
  ) into v_clock_retry
  from hardening_105_context;
  if v_clock_retry->>'status' <> 'inserted' then
    raise exception 'Corrected clock receipt was not inserted: %', v_clock_retry;
  end if;
end
$$;

rollback;
