-- Post-migration integration test for stable Lens identity and exact receipts.
-- Run with psql against the linked database only after reviewing/applying
-- 20260907100000_lens_deck_identity_and_save_outcomes.sql.
-- Every fixture write is enclosed in this transaction and rolled back.

\set ON_ERROR_STOP on

begin;

create temporary table lens_contract_context (
  user_id uuid not null,
  target_language text not null,
  arbitrary_deck_id uuid
) on commit drop;

create temporary table lens_contract_receipts (
  slot text primary key,
  receipt jsonb not null
) on commit drop;

insert into lens_contract_context (user_id, target_language)
select id, '__Lens contract rollback 20260907100000__'
from public.profiles
where role = 'learner'
order by created_at asc nulls last, id asc
limit 1;

do $$
begin
  if not exists (select 1 from lens_contract_context) then
    raise exception 'Lens integration test requires one existing profile';
  end if;
end
$$;

-- A user deck with the old generated display name must never be claimed based
-- on its name. It remains untouched beside the new source_kind=lens deck.
with created as (
  insert into public.decks (
    user_id,
    name,
    target_language,
    word_count,
    status,
    deck_type,
    source_kind
  )
  select
    user_id,
    'Lens — ' || target_language,
    target_language,
    0,
    'complete',
    'card_text',
    'user'
  from lens_contract_context
  returning id
)
update lens_contract_context
set arbitrary_deck_id = created.id
from created;

grant select, insert, update on lens_contract_context to authenticated;
grant select, insert, update on lens_contract_receipts to authenticated;

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from lens_contract_context),
  true
);
set local role authenticated;

insert into lens_contract_receipts (slot, receipt)
select 'initial', public.submit_lens_save(
  target_language,
  'English',
  jsonb_build_array(
    jsonb_build_object(
      'client_id', 'initial-alpha',
      'word', 'lens-contract-alpha',
      'translation', 'alpha',
      'is_phrase', false
    ),
    jsonb_build_object(
      'client_id', 'initial-beta',
      'word', 'lens-contract-beta',
      'translation', 'beta',
      'is_phrase', false
    )
  )
)
from lens_contract_context;

do $$
declare
  v_receipt jsonb := (select receipt from lens_contract_receipts where slot = 'initial');
  v_lens_deck_id uuid := (v_receipt->>'deck_id')::uuid;
  v_arbitrary_deck_id uuid := (select arbitrary_deck_id from lens_contract_context);
begin
  if v_lens_deck_id = v_arbitrary_deck_id then
    raise exception 'RPC claimed an arbitrary user deck by display name';
  end if;
  if v_receipt->>'inserted' <> '2' or v_receipt->>'skipped' <> '0' then
    raise exception 'Initial counts are wrong: %', v_receipt;
  end if;
  if v_receipt#>>'{outcomes,0,client_id}' <> 'initial-alpha'
     or v_receipt#>>'{outcomes,0,status}' <> 'inserted'
     or nullif(v_receipt#>>'{outcomes,0,word_id}', '') is null
     or v_receipt#>>'{outcomes,1,client_id}' <> 'initial-beta'
     or v_receipt#>>'{outcomes,1,status}' <> 'inserted'
     or nullif(v_receipt#>>'{outcomes,1,word_id}', '') is null then
    raise exception 'Initial item outcomes are wrong: %', v_receipt;
  end if;
  if not exists (
    select 1 from public.decks
    where id = v_lens_deck_id
      and source_kind = 'lens'
      and deck_type = 'card_text'
  ) then
    raise exception 'Canonical Lens deck has incorrect provenance';
  end if;
end
$$;

-- Clear the trusted-mutation flag set inside the prior RPC, then prove an
-- ordinary user rename is preserved by the next save.
select set_config('app.allow_phase1e_pipeline_update', 'off', true);
update public.decks
set name = 'Renamed Lens contract deck'
where id = (
  select (receipt->>'deck_id')::uuid
  from lens_contract_receipts
  where slot = 'initial'
);

insert into lens_contract_receipts (slot, receipt)
select 'mixed', public.submit_lens_save(
  target_language,
  'English',
  jsonb_build_array(
    jsonb_build_object(
      'client_id', 'mixed-alpha',
      'word', 'lens-contract-alpha',
      'translation', 'alpha',
      'is_phrase', false
    ),
    jsonb_build_object(
      'client_id', 'mixed-gamma',
      'word', 'lens-contract-gamma',
      'translation', 'gamma',
      'is_phrase', false
    )
  )
)
from lens_contract_context;

do $$
declare
  v_initial jsonb := (select receipt from lens_contract_receipts where slot = 'initial');
  v_mixed jsonb := (select receipt from lens_contract_receipts where slot = 'mixed');
begin
  if v_mixed->>'deck_id' <> v_initial->>'deck_id' then
    raise exception 'Rename caused a second Lens deck: initial %, mixed %', v_initial, v_mixed;
  end if;
  if not exists (
    select 1 from public.decks
    where id = (v_initial->>'deck_id')::uuid
      and name = 'Renamed Lens contract deck'
  ) then
    raise exception 'RPC changed the learner''s renamed deck name';
  end if;
  if v_mixed->>'inserted' <> '1' or v_mixed->>'skipped' <> '1'
     or v_mixed#>>'{outcomes,0,client_id}' <> 'mixed-alpha'
     or v_mixed#>>'{outcomes,0,status}' <> 'skipped'
     or v_mixed#>>'{outcomes,0,word_id}' <> v_initial#>>'{outcomes,0,word_id}'
     or v_mixed#>>'{outcomes,1,client_id}' <> 'mixed-gamma'
     or v_mixed#>>'{outcomes,1,status}' <> 'inserted' then
    raise exception 'Mixed item receipt is wrong: %', v_mixed;
  end if;
end
$$;

-- Retrying the same submitted words is idempotent and returns the same row ids.
insert into lens_contract_receipts (slot, receipt)
select 'retry', public.submit_lens_save(
  target_language,
  'English',
  jsonb_build_array(
    jsonb_build_object(
      'client_id', 'retry-alpha',
      'word', 'lens-contract-alpha',
      'translation', 'alpha',
      'is_phrase', false
    ),
    jsonb_build_object(
      'client_id', 'retry-gamma',
      'word', 'lens-contract-gamma',
      'translation', 'gamma',
      'is_phrase', false
    )
  )
)
from lens_contract_context;

do $$
declare
  v_initial jsonb := (select receipt from lens_contract_receipts where slot = 'initial');
  v_mixed jsonb := (select receipt from lens_contract_receipts where slot = 'mixed');
  v_retry jsonb := (select receipt from lens_contract_receipts where slot = 'retry');
  v_lens_deck_id uuid := (v_initial->>'deck_id')::uuid;
begin
  if v_retry->>'deck_id' <> v_initial->>'deck_id'
     or v_retry->>'inserted' <> '0'
     or v_retry->>'skipped' <> '2'
     or v_retry#>>'{outcomes,0,word_id}' <> v_initial#>>'{outcomes,0,word_id}'
     or v_retry#>>'{outcomes,1,word_id}' <> v_mixed#>>'{outcomes,1,word_id}' then
    raise exception 'Retry is not idempotent: %', v_retry;
  end if;
  if (select word_count from public.decks where id = v_lens_deck_id) <> 3 then
    raise exception 'Retry changed canonical word_count';
  end if;
  if (select count(*) from public.words where deck_id = v_lens_deck_id) <> 3 then
    raise exception 'Retry created duplicate word rows';
  end if;
  if not exists (
    select 1 from public.decks d
    join lens_contract_context c on c.arbitrary_deck_id = d.id
    where d.source_kind = 'user'
      and d.word_count = 0
      and d.name = 'Lens — ' || c.target_language
  ) then
    raise exception 'Arbitrary same-name user deck was modified';
  end if;
end
$$;

set local role postgres;

do $$
begin
  if exists (
    select 1
    from public.decks
    where source_kind = 'lens'
    group by user_id, target_language
    having count(*) > 1
  ) then
    raise exception 'More than one canonical Lens deck exists for a user/language';
  end if;
end
$$;

rollback;
