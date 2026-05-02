-- Phase 1E user deck/word/share RPCs and targeted pipeline-field guards.
--
-- This migration does not change Phase 1A/1B/1C SQL history. It adds narrow
-- user/public RPCs, moves share view counting behind an RPC, and blocks normal
-- authenticated users from directly updating worker-owned pipeline fields.

begin;

-- ---------------------------------------------------------------------------
-- Storage cleanup queue
-- ---------------------------------------------------------------------------

create table if not exists public.storage_cleanup_queue (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  bucket text not null default 'videos',
  object_path text not null,
  source_table text not null,
  source_id uuid,
  user_id uuid references public.profiles(id) on delete set null,
  status text not null default 'pending'
    check (status in ('pending', 'processing', 'complete', 'failed')),
  error_message text,
  unique (bucket, object_path, source_table, source_id)
);

alter table public.storage_cleanup_queue enable row level security;

drop policy if exists "Admins read storage cleanup queue" on public.storage_cleanup_queue;
create policy "Admins read storage cleanup queue"
  on public.storage_cleanup_queue for select
  using (public.is_admin());

-- ---------------------------------------------------------------------------
-- Helpers
-- ---------------------------------------------------------------------------

create or replace function public.phase1e_is_trusted_mutation()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    or public.is_admin()
    or coalesce(current_setting('app.allow_phase1e_pipeline_update', true), '') = 'on';
$$;

create or replace function public.phase1e_extract_video_object_path(p_url text)
returns text
language plpgsql
immutable
set search_path = public
as $$
declare
  v_marker text := '/storage/v1/object/public/videos/';
  v_pos integer;
  v_path text;
begin
  if nullif(btrim(p_url), '') is null then
    return null;
  end if;

  v_pos := strpos(p_url, v_marker);
  if v_pos > 0 then
    v_path := substring(p_url from v_pos + length(v_marker));
    return nullif(split_part(v_path, '?', 1), '');
  end if;

  if p_url !~* '^https?://' and p_url !~* '^data:' then
    return nullif(split_part(p_url, '?', 1), '');
  end if;

  return null;
end;
$$;

create or replace function public.phase1e_queue_word_storage_cleanup(
  p_word_id uuid,
  p_user_id uuid,
  p_deck_id uuid,
  p_word text,
  p_video_url text,
  p_thumbnail_url text,
  p_video_url_b text,
  p_thumbnail_url_b text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.storage_cleanup_queue (
    bucket,
    object_path,
    source_table,
    source_id,
    user_id
  )
  select
    'videos',
    object_path,
    'words',
    p_word_id,
    p_user_id
  from (
    values
      (p_user_id::text || '/' || p_deck_id::text || '/' || p_word || '/video.mp4'),
      (p_user_id::text || '/' || p_deck_id::text || '/' || p_word || '/thumb.jpg'),
      (p_user_id::text || '/' || p_deck_id::text || '/' || p_word || '/video_b.mp4'),
      (p_user_id::text || '/' || p_deck_id::text || '/' || p_word || '/thumb_b.jpg'),
      (public.phase1e_extract_video_object_path(p_video_url)),
      (public.phase1e_extract_video_object_path(p_thumbnail_url)),
      (public.phase1e_extract_video_object_path(p_video_url_b)),
      (public.phase1e_extract_video_object_path(p_thumbnail_url_b))
  ) as paths(object_path)
  where nullif(btrim(object_path), '') is not null
  on conflict do nothing;
end;
$$;

create or replace function public.phase1e_recalculate_deck(p_deck_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
  v_any_active boolean;
  v_all_complete boolean;
  v_any_complete boolean;
  v_all_failed boolean;
  v_status text;
  v_deck public.decks%rowtype;
begin
  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  select
    count(*)::integer,
    coalesce(bool_or(
      status in ('pending', 'processing')
      or (
        current_stage is not null
        and current_stage not in ('complete', 'failed', 'cancelled')
      )
    ), false),
    coalesce(bool_and(status = 'complete'), false),
    coalesce(bool_or(status = 'complete'), false),
    coalesce(bool_and(status = 'failed'), false)
  into v_count, v_any_active, v_all_complete, v_any_complete, v_all_failed
  from public.words
  where deck_id = p_deck_id;

  v_status := case
    when v_count = 0 then 'draft'
    when v_any_active then 'generating'
    when v_all_complete then 'complete'
    when v_all_failed then 'failed'
    when v_any_complete then 'partial'
    else 'partial'
  end;

  update public.decks
  set word_count = v_count,
      status = v_status,
      updated_at = now()
  where id = p_deck_id
  returning * into v_deck;

  if not found then
    raise exception 'Deck not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_deck.id,
    'name', v_deck.name,
    'target_language', v_deck.target_language,
    'word_count', v_deck.word_count,
    'status', v_deck.status,
    'updated_at', v_deck.updated_at
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Targeted direct-write protections
-- ---------------------------------------------------------------------------

create or replace function public.phase1e_protect_words_pipeline_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.current_stage is distinct from old.current_stage
     or new.video_url is distinct from old.video_url
     or new.thumbnail_url is distinct from old.thumbnail_url
     or new.video_url_b is distinct from old.video_url_b
     or new.thumbnail_url_b is distinct from old.thumbnail_url_b
     or new.music_state is distinct from old.music_state
     or new.retry_requested is distinct from old.retry_requested
     or new.failed_stage is distinct from old.failed_stage
     or new.stage_attempts is distinct from old.stage_attempts
     or new.total_stage_attempts is distinct from old.total_stage_attempts
     or new.stage_started_at is distinct from old.stage_started_at then
    raise exception 'Direct updates to worker-owned word fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1e_protect_words_pipeline_fields on public.words;
create trigger phase1e_protect_words_pipeline_fields
before update on public.words
for each row
execute function public.phase1e_protect_words_pipeline_fields();

create or replace function public.phase1e_protect_deck_pipeline_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.word_count is distinct from old.word_count
     or new.status is distinct from old.status then
    raise exception 'Direct updates to worker-owned deck fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1e_protect_deck_pipeline_fields on public.decks;
create trigger phase1e_protect_deck_pipeline_fields
before update on public.decks
for each row
execute function public.phase1e_protect_deck_pipeline_fields();

create or replace function public.phase1e_protect_generation_job_pipeline_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.status is distinct from old.status
     or new.priority is distinct from old.priority
     or new.words_completed is distinct from old.words_completed
     or new.started_at is distinct from old.started_at
     or new.completed_at is distinct from old.completed_at then
    raise exception 'Direct updates to worker-owned generation job fields are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1e_protect_generation_job_pipeline_fields on public.generation_jobs;
create trigger phase1e_protect_generation_job_pipeline_fields
before update on public.generation_jobs
for each row
execute function public.phase1e_protect_generation_job_pipeline_fields();

create or replace function public.phase1e_protect_direct_word_deck_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return old;
  end if;

  raise exception 'Direct deletes are not allowed; use the archive RPC'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1e_protect_direct_word_delete on public.words;
create trigger phase1e_protect_direct_word_delete
before delete on public.words
for each row
execute function public.phase1e_protect_direct_word_deck_delete();

drop trigger if exists phase1e_protect_direct_deck_delete on public.decks;
create trigger phase1e_protect_direct_deck_delete
before delete on public.decks
for each row
execute function public.phase1e_protect_direct_word_deck_delete();

-- ---------------------------------------------------------------------------
-- User RPCs
-- ---------------------------------------------------------------------------

create or replace function public.rate_word(
  p_word_id uuid,
  p_rating int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_word public.words%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if p_rating is null or p_rating < 1 or p_rating > 5 then
    raise exception 'Rating must be between 1 and 5' using errcode = '22023';
  end if;

  update public.words
  set rating = p_rating,
      rated_at = now(),
      updated_at = now()
  where id = p_word_id
    and user_id = v_user_id
  returning * into v_word;

  if not found then
    raise exception 'Word not found or not owned by user' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', v_word.id,
    'rating', v_word.rating,
    'rated_at', v_word.rated_at
  );
end;
$$;

create or replace function public.update_deck_metadata(
  p_deck_id uuid,
  p_name text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_name text := btrim(coalesce(p_name, ''));
  v_deck public.decks%rowtype;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  if v_name = '' then
    raise exception 'Deck name is required' using errcode = '22023';
  end if;

  if length(v_name) > 100 then
    raise exception 'Deck name is too long' using errcode = '22023';
  end if;

  update public.decks
  set name = v_name,
      updated_at = now()
  where id = p_deck_id
    and user_id = v_user_id
  returning * into v_deck;

  if not found then
    raise exception 'Deck not found or not owned by user' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', v_deck.id,
    'name', v_deck.name,
    'target_language', v_deck.target_language,
    'word_count', v_deck.word_count,
    'status', v_deck.status,
    'updated_at', v_deck.updated_at
  );
end;
$$;

create or replace function public.move_words_to_deck(
  p_word_ids uuid[],
  p_target_deck_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_word_ids uuid[];
  v_target_deck public.decks%rowtype;
  v_word_count integer;
  v_source_deck_ids uuid[];
  v_source_deck_id uuid;
  v_source_summaries jsonb := '[]'::jsonb;
  v_target_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select array_agg(distinct id)
  into v_word_ids
  from unnest(coalesce(p_word_ids, array[]::uuid[])) as id
  where id is not null;

  if coalesce(array_length(v_word_ids, 1), 0) = 0 then
    raise exception 'At least one word is required' using errcode = '22023';
  end if;

  select *
  into v_target_deck
  from public.decks
  where id = p_target_deck_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Target deck not found or not owned by user' using errcode = '42501';
  end if;

  select count(*)
  into v_word_count
  from (
    select id
    from public.words
    where id = any(v_word_ids)
      and user_id = v_user_id
    for update
  ) as locked_words;

  if v_word_count <> array_length(v_word_ids, 1) then
    raise exception 'One or more words are not owned by user' using errcode = '42501';
  end if;

  select array_agg(distinct deck_id)
  into v_source_deck_ids
  from public.words
  where id = any(v_word_ids)
    and user_id = v_user_id;

  perform 1
  from public.decks
  where id = any(v_source_deck_ids)
    and user_id = v_user_id
    and target_language = v_target_deck.target_language
  for update;

  if (
    select count(*)
    from public.decks
    where id = any(v_source_deck_ids)
      and user_id = v_user_id
      and target_language = v_target_deck.target_language
  ) <> array_length(v_source_deck_ids, 1) then
    raise exception 'Words can only move between owned decks in the same target language'
      using errcode = '22023';
  end if;

  update public.words
  set deck_id = p_target_deck_id,
      updated_at = now()
  where id = any(v_word_ids)
    and user_id = v_user_id;

  foreach v_source_deck_id in array v_source_deck_ids
  loop
    if v_source_deck_id <> p_target_deck_id then
      v_source_summaries := v_source_summaries || jsonb_build_array(
        public.phase1e_recalculate_deck(v_source_deck_id)
      );
    end if;
  end loop;

  v_target_summary := public.phase1e_recalculate_deck(p_target_deck_id);

  return jsonb_build_object(
    'success', true,
    'word_ids', to_jsonb(v_word_ids),
    'source_decks', v_source_summaries,
    'target_deck', v_target_summary
  );
end;
$$;

create or replace function public.archive_word(p_word_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_word public.words%rowtype;
  v_deck public.decks%rowtype;
  v_deck_summary jsonb;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  select *
  into v_word
  from public.words
  where id = p_word_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Word not found or not owned by user' using errcode = '42501';
  end if;

  select *
  into v_deck
  from public.decks
  where id = v_word.deck_id
    and user_id = v_user_id
  for update;

  if not found then
    raise exception 'Deck not found or not owned by user' using errcode = '42501';
  end if;

  perform public.phase1e_queue_word_storage_cleanup(
    v_word.id,
    v_word.user_id,
    v_word.deck_id,
    v_word.word,
    v_word.video_url,
    v_word.thumbnail_url,
    v_word.video_url_b,
    v_word.thumbnail_url_b
  );

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.words
  where id = v_word.id
    and user_id = v_user_id;

  v_deck_summary := public.phase1e_recalculate_deck(v_deck.id);

  return jsonb_build_object(
    'success', true,
    'word_id', v_word.id,
    'deck', v_deck_summary
  );
end;
$$;

create or replace function public.archive_deck(p_deck_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_deck public.decks%rowtype;
  v_word_count integer;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
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

  select count(*)::integer
  into v_word_count
  from public.words
  where deck_id = p_deck_id
    and user_id = v_user_id;

  if v_word_count > 0 then
    raise exception 'Deck must be empty before archive' using errcode = '22023';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.decks
  where id = p_deck_id
    and user_id = v_user_id;

  return jsonb_build_object(
    'success', true,
    'deck_id', v_deck.id
  );
end;
$$;

create or replace function public.create_or_get_share_link(p_word_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.shared_words%rowtype;
  v_id text;
begin
  if v_user_id is null then
    raise exception 'Authentication required' using errcode = '42501';
  end if;

  perform 1
  from public.words
  where id = p_word_id
    and user_id = v_user_id;

  if not found then
    raise exception 'Word not found or not owned by user' using errcode = '42501';
  end if;

  select *
  into v_existing
  from public.shared_words
  where word_id = p_word_id
    and user_id = v_user_id;

  if found then
    return jsonb_build_object(
      'success', true,
      'id', v_existing.id,
      'path', '/v/' || v_existing.id,
      'reused', true
    );
  end if;

  loop
    v_id := lower(encode(extensions.gen_random_bytes(6), 'hex'));
    begin
      insert into public.shared_words (id, word_id, user_id)
      values (v_id, p_word_id, v_user_id)
      returning * into v_existing;
      exit;
    exception
      when unique_violation then
        v_existing := null;
    end;
  end loop;

  return jsonb_build_object(
    'success', true,
    'id', v_existing.id,
    'path', '/v/' || v_existing.id,
    'reused', false
  );
end;
$$;

create or replace function public.increment_shared_word_view(p_share_id text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_share public.shared_words%rowtype;
begin
  if nullif(btrim(coalesce(p_share_id, '')), '') is null then
    return jsonb_build_object(
      'success', false,
      'error', 'Share not found'
    );
  end if;

  update public.shared_words
  set view_count = view_count + 1
  where id = btrim(p_share_id)
  returning * into v_share;

  if not found then
    return jsonb_build_object(
      'success', false,
      'error', 'Share not found'
    );
  end if;

  return jsonb_build_object(
    'success', true,
    'id', v_share.id,
    'view_count', v_share.view_count
  );
end;
$$;

-- Public clients must not be able to set/reset view_count directly.
drop policy if exists "Public update view count" on public.shared_words;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------

revoke all on function public.phase1e_is_trusted_mutation() from public, anon, authenticated;
revoke all on function public.phase1e_extract_video_object_path(text) from public, anon, authenticated;
revoke all on function public.phase1e_queue_word_storage_cleanup(uuid, uuid, uuid, text, text, text, text, text) from public, anon, authenticated;
revoke all on function public.phase1e_recalculate_deck(uuid) from public, anon, authenticated;
revoke all on function public.phase1e_protect_words_pipeline_fields() from public, anon, authenticated;
revoke all on function public.phase1e_protect_deck_pipeline_fields() from public, anon, authenticated;
revoke all on function public.phase1e_protect_generation_job_pipeline_fields() from public, anon, authenticated;
revoke all on function public.phase1e_protect_direct_word_deck_delete() from public, anon, authenticated;

revoke all on function public.rate_word(uuid, int) from public, anon;
revoke all on function public.update_deck_metadata(uuid, text) from public, anon;
revoke all on function public.move_words_to_deck(uuid[], uuid) from public, anon;
revoke all on function public.archive_word(uuid) from public, anon;
revoke all on function public.archive_deck(uuid) from public, anon;
revoke all on function public.create_or_get_share_link(uuid) from public, anon;
revoke all on function public.increment_shared_word_view(text) from public;

grant execute on function public.rate_word(uuid, int) to authenticated;
grant execute on function public.update_deck_metadata(uuid, text) to authenticated;
grant execute on function public.move_words_to_deck(uuid[], uuid) to authenticated;
grant execute on function public.archive_word(uuid) to authenticated;
grant execute on function public.archive_deck(uuid) to authenticated;
grant execute on function public.create_or_get_share_link(uuid) to authenticated;
grant execute on function public.increment_shared_word_view(text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
