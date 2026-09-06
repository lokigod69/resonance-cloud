-- Post-migration integration checks for 20260907106000.
-- Run with psql against the linked database after applying the migration.
-- All fixture writes are rolled back.

\set ON_ERROR_STOP on

begin;

create temporary table hardening_106_context (
  user_id uuid not null,
  curriculum_deck_id uuid,
  imageless_deck_id uuid,
  word_id uuid,
  foreign_user_id uuid,
  foreign_imageless_deck_id uuid
) on commit drop;

insert into hardening_106_context (user_id)
select id
from public.profiles
where role = 'learner'
order by created_at asc nulls last, id asc
limit 1;

update hardening_106_context c
set foreign_user_id = (
  select id from public.profiles
  where role = 'learner' and id <> c.user_id
  order by created_at asc nulls last, id asc
  limit 1
);

do $$
begin
  if not exists (select 1 from hardening_106_context where foreign_user_id is not null) then
    raise exception 'Integration test requires two existing learner profiles';
  end if;
end
$$;

select set_config('app.allow_phase1e_pipeline_update', 'on', true);

with created as (
  insert into public.decks (
    user_id, name, target_language, word_count, status, deck_type,
    source_kind, curriculum_category_slug, curriculum_level
  )
  select user_id, '__106 curriculum__', 'German', 0, 'complete', 'card',
         'curriculum', '__106__', 1
  from hardening_106_context
  returning id
)
update hardening_106_context set curriculum_deck_id = created.id from created;

with created as (
  insert into public.decks (
    user_id, name, target_language, word_count, status, deck_type, source_kind
  )
  select user_id, '__106 imageless__', 'German', 1, 'complete', 'card_text', 'user'
  from hardening_106_context
  returning id
)
update hardening_106_context set imageless_deck_id = created.id from created;

with created as (
  insert into public.decks (
    user_id, name, target_language, word_count, status, deck_type, source_kind
  )
  select foreign_user_id, '__106 foreign imageless__', 'German', 0, 'complete', 'card_text', 'user'
  from hardening_106_context
  returning id
)
update hardening_106_context set foreign_imageless_deck_id = created.id from created;

with created as (
  insert into public.words (
    deck_id, user_id, word, original_input, translation, status, current_stage,
    thumbnail_url, card_thumbnail_url
  )
  select imageless_deck_id, user_id, '__106 word__', '__106 word__', 'word',
         'complete', 'complete', 'https://example.invalid/full.png',
         '/storage/v1/object/public/videos/__106__/card.thumb.webp'
  from hardening_106_context
  returning id
)
update hardening_106_context set word_id = created.id from created;

insert into public.generation_jobs (
  user_id, deck_id, status, target_language, words_total
)
select user_id, curriculum_deck_id, 'pending', 'German', 0
from hardening_106_context
union all
select user_id, imageless_deck_id, 'processing', 'German', 1
from hardening_106_context;

grant select on hardening_106_context to authenticated;

select set_config(
  'request.jwt.claim.sub',
  (select user_id::text from hardening_106_context),
  true
);
select set_config('app.allow_phase1e_pipeline_update', 'off', true);
set local role authenticated;

-- The preview URL is runner-owned even though ordinary lexical edits remain allowed.
do $$
begin
  begin
    update public.words
       set card_thumbnail_url = 'https://example.invalid/thumb.webp'
     where id = (select word_id from hardening_106_context);
    raise exception 'Direct card_thumbnail_url update unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;
end
$$;

-- Ownership stays server-enforced even though these are SECURITY DEFINER RPCs.
do $$
begin
  begin
    perform public.delete_imageless_deck(
      (select foreign_imageless_deck_id from hardening_106_context)
    );
    raise exception 'Foreign-owned imageless deck deletion unexpectedly succeeded';
  exception when sqlstate '42501' then
    null;
  end;
end
$$;

-- Both delete RPCs must reject every active generation state.
do $$
begin
  begin
    perform public.delete_curriculum_deck(
      (select curriculum_deck_id from hardening_106_context)
    );
    raise exception 'Active curriculum deck deletion unexpectedly succeeded';
  exception when sqlstate '55000' then
    null;
  end;

  begin
    perform public.delete_imageless_deck(
      (select imageless_deck_id from hardening_106_context)
    );
    raise exception 'Active imageless deck deletion unexpectedly succeeded';
  exception when sqlstate '55000' then
    null;
  end;
end
$$;

-- Cover the third active state explicitly after pending was checked above.
set local role postgres;
select set_config('app.allow_phase1e_pipeline_update', 'on', true);
update public.generation_jobs
set status = 'approved'
where deck_id = (select curriculum_deck_id from hardening_106_context);
set local role authenticated;
select set_config('app.allow_phase1e_pipeline_update', 'off', true);

do $$
begin
  begin
    perform public.delete_curriculum_deck(
      (select curriculum_deck_id from hardening_106_context)
    );
    raise exception 'Approved curriculum deck deletion unexpectedly succeeded';
  exception when sqlstate '55000' then
    null;
  end;
end
$$;

-- Every remaining bulk import entry point rejects a 501-item payload before writes.
do $$
declare
  v_curriculum_items jsonb := (
    select jsonb_agg(jsonb_build_object('term', 'w' || n, 'translation', 't' || n))
    from generate_series(1, 501) as n
  );
  v_imageless_items jsonb := (
    select jsonb_agg(jsonb_build_object('word', 'w' || n, 'translation', 't' || n))
    from generate_series(1, 501) as n
  );
begin
  begin
    perform public.submit_curriculum_import(
      '__106_cap__', 1, '__106 cap__', v_curriculum_items, 'German'
    );
    raise exception 'Curriculum import accepted 501 entries';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.submit_imageless_import(
      '__106 cap__', 'German', 'English', v_imageless_items, 'manual'
    );
    raise exception 'Imageless import accepted 501 items';
  exception when sqlstate '22023' then
    null;
  end;

  begin
    perform public.append_imageless_cards(
      (select imageless_deck_id from hardening_106_context),
      v_imageless_items,
      'manual'
    );
    raise exception 'Imageless append accepted 501 items';
  exception when sqlstate '22023' then
    null;
  end;
end
$$;

-- The boundary itself remains usable: import 500 cards, then append 500 cards.
-- This also exercises the production RPC bodies and canonical language helper
-- while keeping the rollback fixture below 1,500 created word rows.
do $$
declare
  v_import_items jsonb := (
    select jsonb_agg(
      jsonb_build_object(
        'word', 'import-' || n,
        'translation', 'translation-' || n,
        'is_phrase', false
      )
      order by n
    )
    from generate_series(1, 500) as n
  );
  v_append_items jsonb := (
    select jsonb_agg(
      jsonb_build_object(
        'word', 'append-' || n,
        'translation', 'translation-' || n,
        'base_language', 'Japanese',
        'is_phrase', false
      )
      order by n
    )
    from generate_series(1, 500) as n
  );
  v_deck_id uuid;
  v_appended integer;
  v_word_count integer;
begin
  if public.normalize_language_value('pl') <> 'Polish'
     or public.normalize_language_value('ru') <> 'Russian'
     or public.normalize_language_value('ja') <> 'Japanese' then
    raise exception 'Language normalization did not canonicalize pl/ru/ja';
  end if;

  select public.submit_imageless_import(
    '__106 exact cap__', 'pl', 'ru', v_import_items, 'manual'
  ) into v_deck_id;

  select public.append_imageless_cards(
    v_deck_id, v_append_items, 'manual'
  ) into v_appended;

  if v_appended <> 500 then
    raise exception 'Exact-500 append returned %, expected 500', v_appended;
  end if;

  select d.word_count
    into v_word_count
    from public.decks d
   where d.id = v_deck_id
     and d.user_id = (select user_id from hardening_106_context)
     and d.deck_type = 'card_text'
     and d.target_language = 'Polish';

  if v_word_count is distinct from 1000 then
    raise exception 'Exact-500 import/append deck count was %, expected 1000', v_word_count;
  end if;

  if (select count(*) from public.words where deck_id = v_deck_id) <> 1000 then
    raise exception 'Exact-500 import/append did not create 1000 word rows';
  end if;

  if exists (
    select 1
      from public.words
     where deck_id = v_deck_id
       and word like 'import-%'
       and (
         metadata->>'target_language' is distinct from 'Polish'
         or metadata->>'base_language' is distinct from 'Russian'
       )
  ) then
    raise exception 'Exact-500 import did not persist canonical language metadata';
  end if;
end
$$;

set local role postgres;
select set_config('app.allow_phase1e_pipeline_update', 'on', true);

update public.generation_jobs
   set status = 'failed'
 where deck_id in (
   select curriculum_deck_id from hardening_106_context
   union all
   select imageless_deck_id from hardening_106_context
 );

set local role authenticated;
select set_config('app.allow_phase1e_pipeline_update', 'off', true);

select public.delete_curriculum_deck(
  (select curriculum_deck_id from hardening_106_context)
);
select public.delete_imageless_deck(
  (select imageless_deck_id from hardening_106_context)
);

set local role postgres;

do $$
begin
  if exists (
    select 1 from public.decks
    where id in (
      select curriculum_deck_id from hardening_106_context
      union all
      select imageless_deck_id from hardening_106_context
    )
  ) then
    raise exception 'Terminal decks were not deleted';
  end if;

  if not exists (
    select 1
      from public.storage_cleanup_queue
     where source_id = (select word_id from hardening_106_context)
       and bucket = 'videos'
       and object_path = '__106__/card.thumb.webp'
  ) then
    raise exception 'Card thumbnail was not queued for storage cleanup';
  end if;
end
$$;

rollback;
