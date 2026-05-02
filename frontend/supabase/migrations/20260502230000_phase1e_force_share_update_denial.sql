-- Phase 1E adversarial repair: force direct shared_words PATCH requests to
-- reach a trigger that denies them, instead of RLS returning 200 with no rows.

begin;

create or replace function public.phase1e_protect_shared_word_updates()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  raise exception 'Direct updates to shared words are not allowed'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1e_protect_shared_word_view_count on public.shared_words;
drop trigger if exists phase1e_protect_shared_word_updates on public.shared_words;
create trigger phase1e_protect_shared_word_updates
before update on public.shared_words
for each row
execute function public.phase1e_protect_shared_word_updates();

drop policy if exists "Phase 1E deny direct shared word updates via trigger" on public.shared_words;
create policy "Phase 1E deny direct shared word updates via trigger"
  on public.shared_words
  for update
  using (true)
  with check (true);

revoke all on function public.phase1e_protect_shared_word_updates() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
