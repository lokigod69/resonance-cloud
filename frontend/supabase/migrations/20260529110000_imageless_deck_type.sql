-- Image-less text/IPA decks use deck_type='card_text'.
-- Existing replayed schema constrains public.decks.deck_type to ('video', 'card');
-- preserve the 'video' default while allowing the new non-pipeline variant.

begin;

alter table public.decks
  drop constraint if exists decks_deck_type_check;

alter table public.decks
  add constraint decks_deck_type_check
  check (deck_type in ('video', 'card', 'card_text'));

notify pgrst, 'reload schema';

commit;
