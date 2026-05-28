-- delete_imageless_deck: trusted learner delete for image-less card_text decks.

begin;

create or replace function public.delete_imageless_deck(p_deck_id uuid)
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

  if v_deck.deck_type is distinct from 'card_text' then
    raise exception 'Only image-less card_text decks can be deleted via this RPC'
      using errcode = '42501';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  delete from public.decks
   where id = p_deck_id;
end;
$$;

comment on function public.delete_imageless_deck(uuid) is
  'Deletes a learner-owned image-less card_text deck. Cascades to dependent words through existing foreign keys.';

revoke all on function public.delete_imageless_deck(uuid) from public, anon;
grant execute on function public.delete_imageless_deck(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
