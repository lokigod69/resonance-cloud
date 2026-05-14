-- Hotfix: delete_curriculum_deck was issuing a direct DELETE against
-- public.decks without enabling the phase1e trusted-mutation bypass. The
-- BEFORE DELETE trigger phase1e_protect_direct_deck_delete (added in
-- 20260502160000_phase1e_user_deck_word_share_rpcs.sql) raises
-- 'Direct deletes are not allowed; use the archive RPC' with errcode 42501
-- for any caller that is not service_role, not admin, and has not set
-- app.allow_phase1e_pipeline_update='on' in the current session.
--
-- A SECURITY DEFINER function does not change auth.role() — a learner-
-- initiated call therefore tripped the trigger and rolled back the entire
-- delete. The reference pattern is archive_words
-- (20260512061547_archive_words_batch.sql:97-101), which calls
-- set_config('app.allow_phase1e_pipeline_update', 'on', true) immediately
-- before its DELETE. Mirror that here so both the deck DELETE and its
-- cascading word DELETEs are admitted as trusted mutations.

begin;

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

  -- Bypass phase1e_protect_direct_word_deck_delete for both the deck DELETE
  -- and the cascading word DELETEs. Same pattern as archive_words.
  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

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
