-- Phase 1E follow-up: qualify pgcrypto randomness for share IDs.
-- Supabase projects commonly expose pgcrypto functions from the extensions
-- schema, while this SECURITY DEFINER function pins search_path to public.

begin;

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
      'id', v_existing.id,
      'path', '/v/' || v_existing.id,
      'url_path', '/v/' || v_existing.id
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
        null;
    end;
  end loop;

  return jsonb_build_object(
    'id', v_existing.id,
    'path', '/v/' || v_existing.id,
    'url_path', '/v/' || v_existing.id
  );
end;
$$;

revoke all on function public.create_or_get_share_link(uuid) from public, anon;
grant execute on function public.create_or_get_share_link(uuid) to authenticated;

notify pgrst, 'reload schema';

commit;
