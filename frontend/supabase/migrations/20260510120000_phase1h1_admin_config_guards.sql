-- Phase 1H.1 admin configuration direct-write guards.
--
-- Apply after 20260510110000_phase1h1_admin_config_rpcs.sql and after the
-- frontend is deployed with RPC-based writes.

begin;

create or replace function public.phase1h1_is_trusted_admin_config_update()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting('app.allow_admin_config_update', true), '') = 'on';
$$;

create or replace function public.phase1h1_protect_word_review_flag()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.needs_review is distinct from old.needs_review
     and not public.phase1h1_is_trusted_admin_config_update() then
    raise exception 'Word review flag changes must use audited admin RPCs'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1h1_protect_word_review_flag on public.words;
create trigger phase1h1_protect_word_review_flag
before update on public.words
for each row
execute function public.phase1h1_protect_word_review_flag();

create or replace function public.phase1h1_protect_language_profiles()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1h1_is_trusted_admin_config_update() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'Language profile changes must use audited admin RPCs'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1h1_protect_language_profiles on public.language_profiles;
create trigger phase1h1_protect_language_profiles
before insert or update or delete on public.language_profiles
for each row
execute function public.phase1h1_protect_language_profiles();

create or replace function public.phase1h1_protect_voices()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1h1_is_trusted_admin_config_update() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  raise exception 'Voice registry changes must use audited admin RPCs'
    using errcode = '42501';
end;
$$;

drop trigger if exists phase1h1_protect_voices on public.voices;
create trigger phase1h1_protect_voices
before insert or update or delete on public.voices
for each row
execute function public.phase1h1_protect_voices();

revoke all on function public.phase1h1_is_trusted_admin_config_update() from public, anon, authenticated;
revoke all on function public.phase1h1_protect_word_review_flag() from public, anon, authenticated;
revoke all on function public.phase1h1_protect_language_profiles() from public, anon, authenticated;
revoke all on function public.phase1h1_protect_voices() from public, anon, authenticated;

notify pgrst, 'reload schema';

commit;
