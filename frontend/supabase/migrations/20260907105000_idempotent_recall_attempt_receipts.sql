begin;

alter table public.recall_attempts
  add column if not exists client_receipt_id uuid;

create unique index if not exists recall_attempts_user_receipt_uidx
  on public.recall_attempts (user_id, client_receipt_id)
  where client_receipt_id is not null;

create or replace function public.record_recall_attempt(
  p_receipt_id uuid,
  p_word_id uuid,
  p_knew_it boolean,
  p_study_mode text,
  p_metadata jsonb default null,
  p_occurred_at timestamptz default now()
) returns jsonb
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_existing public.recall_attempts%rowtype;
  v_created_at timestamptz := coalesce(p_occurred_at, now());
begin
  if v_user_id is null then
    raise exception using errcode = '42501', message = 'authentication_required';
  end if;
  if p_receipt_id is null or p_word_id is null or p_study_mode is null
     or length(trim(p_study_mode)) = 0 or length(p_study_mode) > 64 then
    raise exception using errcode = '22023', message = 'invalid_recall_attempt';
  end if;
  if v_created_at > now() + interval '5 minutes' then
    return jsonb_build_object('status', 'clock_skew', 'occurred_at', now());
  end if;

  select * into v_existing
  from public.recall_attempts
  where user_id = v_user_id and client_receipt_id = p_receipt_id;

  if found then
    if v_existing.word_id is distinct from p_word_id
       or v_existing.knew_it is distinct from p_knew_it
       or v_existing.study_mode is distinct from p_study_mode
       or v_existing.metadata is distinct from p_metadata
       or v_existing.created_at is distinct from v_created_at then
      raise exception using errcode = '22000', message = 'recall_receipt_conflict';
    end if;
    return jsonb_build_object('status', 'duplicate', 'attempt_id', v_existing.id);
  end if;

  -- Missing, deleted and foreign-owned words are terminal for this queued item.
  if not exists (
    select 1 from public.words
    where id = p_word_id and user_id = v_user_id
  ) then
    return jsonb_build_object('status', 'discarded', 'reason', 'word_unavailable');
  end if;

  insert into public.recall_attempts (
    user_id, word_id, knew_it, study_mode, metadata, created_at, client_receipt_id
  ) values (
    v_user_id, p_word_id, p_knew_it, p_study_mode, p_metadata, v_created_at, p_receipt_id
  )
  on conflict (user_id, client_receipt_id) where client_receipt_id is not null do nothing
  returning * into v_existing;

  if found then
    return jsonb_build_object('status', 'inserted', 'attempt_id', v_existing.id);
  end if;

  select * into v_existing
  from public.recall_attempts
  where user_id = v_user_id and client_receipt_id = p_receipt_id;
  if v_existing.word_id is distinct from p_word_id
     or v_existing.knew_it is distinct from p_knew_it
     or v_existing.study_mode is distinct from p_study_mode
     or v_existing.metadata is distinct from p_metadata
     or v_existing.created_at is distinct from v_created_at then
    raise exception using errcode = '22000', message = 'recall_receipt_conflict';
  end if;
  return jsonb_build_object('status', 'duplicate', 'attempt_id', v_existing.id);
end;
$$;

revoke all on function public.record_recall_attempt(uuid, uuid, boolean, text, jsonb, timestamptz) from public, anon;
grant execute on function public.record_recall_attempt(uuid, uuid, boolean, text, jsonb, timestamptz) to authenticated;

notify pgrst, 'reload schema';

commit;
