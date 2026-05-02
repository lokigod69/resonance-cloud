-- Phase 1E adversarial repair: direct public shared_words.view_count PATCH
-- should fail closed instead of returning a silent 200/no-row update.

begin;

create or replace function public.phase1e_protect_shared_word_view_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.phase1e_is_trusted_mutation() then
    return new;
  end if;

  if new.view_count is distinct from old.view_count then
    raise exception 'Direct updates to shared word view counts are not allowed'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists phase1e_protect_shared_word_view_count on public.shared_words;
create trigger phase1e_protect_shared_word_view_count
before update of view_count on public.shared_words
for each row
execute function public.phase1e_protect_shared_word_view_count();

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
    raise exception 'Share id is required' using errcode = '22023';
  end if;

  perform set_config('app.allow_phase1e_pipeline_update', 'on', true);

  update public.shared_words
  set view_count = view_count + 1
  where id = btrim(p_share_id)
  returning * into v_share;

  if not found then
    raise exception 'Share not found' using errcode = 'P0002';
  end if;

  return jsonb_build_object(
    'id', v_share.id,
    'view_count', v_share.view_count
  );
end;
$$;

revoke all on function public.phase1e_protect_shared_word_view_count() from public, anon, authenticated;
revoke all on function public.increment_shared_word_view(text) from public;
grant execute on function public.increment_shared_word_view(text) to anon, authenticated;

notify pgrst, 'reload schema';

commit;
