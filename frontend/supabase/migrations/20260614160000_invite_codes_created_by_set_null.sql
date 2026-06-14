begin;

alter table public.invite_codes
  drop constraint if exists invite_codes_created_by_fkey;

alter table public.invite_codes
  add constraint invite_codes_created_by_fkey
  foreign key (created_by)
  references public.profiles(id)
  on delete set null;

commit;
