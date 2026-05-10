-- Phase 1H.1 audited admin configuration RPCs.
--
-- Adds additive RPCs for the remaining non-Image admin browser write paths:
-- - words.needs_review
-- - language_profiles
-- - voices
--
-- Direct-write denial triggers are intentionally deferred to
-- 20260510120000_phase1h1_admin_config_guards.sql so frontend and SQL can
-- roll out without a race.

begin;

create or replace function public.admin_set_word_review_flag(
  p_word_id uuid,
  p_needs_review boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.words%rowtype;
  v_after public.words%rowtype;
begin
  select *
    into v_before
    from public.words
   where id = p_word_id
   for update;

  if not found then
    raise exception 'Word not found' using errcode = 'P0002';
  end if;

  perform set_config('app.allow_admin_config_update', 'on', true);

  update public.words
     set needs_review = coalesce(p_needs_review, false)
   where id = p_word_id
   returning * into v_after;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_set_word_review_flag',
    'words',
    v_after.id::text,
    p_reason,
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object('field', 'needs_review')
  );

  return jsonb_build_object(
    'id', v_after.id,
    'needs_review', v_after.needs_review
  );
end;
$$;

create or replace function public.admin_upsert_language_profile(
  p_profile_id uuid,
  p_language text,
  p_name text,
  p_settings jsonb,
  p_notes text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.language_profiles%rowtype;
  v_after public.language_profiles%rowtype;
  v_language text := nullif(btrim(coalesce(p_language, '')), '');
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_settings jsonb := coalesce(p_settings, '{}'::jsonb);
begin
  if v_language is null then
    raise exception 'language is required' using errcode = '22023';
  end if;

  if v_name is null then
    raise exception 'name is required' using errcode = '22023';
  end if;

  if jsonb_typeof(v_settings) is distinct from 'object' then
    raise exception 'settings must be a JSON object' using errcode = '22023';
  end if;

  perform set_config('app.allow_admin_config_update', 'on', true);

  if p_profile_id is null then
    insert into public.language_profiles (
      language,
      name,
      settings,
      notes,
      is_active
    )
    values (
      v_language,
      v_name,
      v_settings,
      nullif(btrim(coalesce(p_notes, '')), ''),
      false
    )
    returning * into v_after;
  else
    select *
      into v_before
      from public.language_profiles
     where id = p_profile_id
     for update;

    if not found then
      raise exception 'Language profile not found' using errcode = 'P0002';
    end if;

    update public.language_profiles
       set language = v_language,
           name = v_name,
           settings = v_settings,
           notes = nullif(btrim(coalesce(p_notes, '')), '')
     where id = p_profile_id
     returning * into v_after;
  end if;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_upsert_language_profile',
    'language_profiles',
    v_after.id::text,
    p_reason,
    case when p_profile_id is null then null else to_jsonb(v_before) end,
    to_jsonb(v_after),
    jsonb_build_object('created', p_profile_id is null)
  );

  return jsonb_build_object(
    'id', v_after.id,
    'language', v_after.language,
    'name', v_after.name,
    'is_active', v_after.is_active,
    'settings', v_after.settings,
    'notes', v_after.notes
  );
end;
$$;

create or replace function public.admin_set_language_profile_active(
  p_profile_id uuid,
  p_is_active boolean,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.language_profiles%rowtype;
  v_after public.language_profiles%rowtype;
  v_deactivated_ids uuid[];
begin
  select *
    into v_before
    from public.language_profiles
   where id = p_profile_id
   for update;

  if not found then
    raise exception 'Language profile not found' using errcode = 'P0002';
  end if;

  perform set_config('app.allow_admin_config_update', 'on', true);

  if coalesce(p_is_active, false) then
    with deactivated as (
      update public.language_profiles
         set is_active = false
       where language = v_before.language
         and id <> v_before.id
         and is_active = true
       returning id
    )
    select coalesce(array_agg(id), '{}'::uuid[])
      into v_deactivated_ids
      from deactivated;
  end if;

  update public.language_profiles
     set is_active = coalesce(p_is_active, false)
   where id = v_before.id
   returning * into v_after;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_set_language_profile_active',
    'language_profiles',
    v_after.id::text,
    p_reason,
    to_jsonb(v_before),
    to_jsonb(v_after),
    jsonb_build_object(
      'deactivated_profile_ids',
      coalesce(to_jsonb(v_deactivated_ids), '[]'::jsonb)
    )
  );

  return jsonb_build_object(
    'id', v_after.id,
    'language', v_after.language,
    'name', v_after.name,
    'is_active', v_after.is_active
  );
end;
$$;

create or replace function public.admin_delete_language_profile(
  p_profile_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.language_profiles%rowtype;
begin
  select *
    into v_before
    from public.language_profiles
   where id = p_profile_id
   for update;

  if not found then
    raise exception 'Language profile not found' using errcode = 'P0002';
  end if;

  perform set_config('app.allow_admin_config_update', 'on', true);

  delete from public.language_profiles
   where id = p_profile_id;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_delete_language_profile',
    'language_profiles',
    v_before.id::text,
    p_reason,
    to_jsonb(v_before),
    null,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'id', v_before.id,
    'deleted', true
  );
end;
$$;

create or replace function public.admin_upsert_voice(
  p_voice_row_id uuid,
  p_voice_id text,
  p_name text,
  p_language text,
  p_language_code text,
  p_notes text,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.voices%rowtype;
  v_after public.voices%rowtype;
  v_voice_id text := nullif(btrim(coalesce(p_voice_id, '')), '');
  v_name text := nullif(btrim(coalesce(p_name, '')), '');
  v_language text := btrim(coalesce(p_language, ''));
  v_language_code text := btrim(coalesce(p_language_code, ''));
begin
  if v_voice_id is null then
    raise exception 'voice_id is required' using errcode = '22023';
  end if;

  if v_name is null then
    raise exception 'name is required' using errcode = '22023';
  end if;

  if length(v_language_code) > 16 then
    raise exception 'language_code is too long' using errcode = '22023';
  end if;

  perform set_config('app.allow_admin_config_update', 'on', true);

  if p_voice_row_id is null then
    insert into public.voices (
      voice_id,
      name,
      language,
      language_code,
      notes
    )
    values (
      v_voice_id,
      v_name,
      v_language,
      v_language_code,
      btrim(coalesce(p_notes, ''))
    )
    returning * into v_after;
  else
    select *
      into v_before
      from public.voices
     where id = p_voice_row_id
     for update;

    if not found then
      raise exception 'Voice not found' using errcode = 'P0002';
    end if;

    update public.voices
       set voice_id = v_voice_id,
           name = v_name,
           language = v_language,
           language_code = v_language_code,
           notes = btrim(coalesce(p_notes, ''))
     where id = p_voice_row_id
     returning * into v_after;
  end if;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_upsert_voice',
    'voices',
    v_after.id::text,
    p_reason,
    case when p_voice_row_id is null then null else to_jsonb(v_before) end,
    to_jsonb(v_after),
    jsonb_build_object('created', p_voice_row_id is null)
  );

  return jsonb_build_object(
    'id', v_after.id,
    'voice_id', v_after.voice_id,
    'name', v_after.name,
    'language', v_after.language,
    'language_code', v_after.language_code,
    'notes', v_after.notes
  );
end;
$$;

create or replace function public.admin_delete_voice(
  p_voice_row_id uuid,
  p_reason text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := public.phase1f_require_admin();
  v_before public.voices%rowtype;
begin
  select *
    into v_before
    from public.voices
   where id = p_voice_row_id
   for update;

  if not found then
    raise exception 'Voice not found' using errcode = 'P0002';
  end if;

  perform set_config('app.allow_admin_config_update', 'on', true);

  delete from public.voices
   where id = p_voice_row_id;

  perform public.phase1f_audit_admin_action(
    v_actor,
    'admin_delete_voice',
    'voices',
    v_before.id::text,
    p_reason,
    to_jsonb(v_before),
    null,
    '{}'::jsonb
  );

  return jsonb_build_object(
    'id', v_before.id,
    'deleted', true
  );
end;
$$;

revoke all on function public.admin_set_word_review_flag(uuid, boolean, text) from public, anon;
revoke all on function public.admin_upsert_language_profile(uuid, text, text, jsonb, text, text) from public, anon;
revoke all on function public.admin_set_language_profile_active(uuid, boolean, text) from public, anon;
revoke all on function public.admin_delete_language_profile(uuid, text) from public, anon;
revoke all on function public.admin_upsert_voice(uuid, text, text, text, text, text, text) from public, anon;
revoke all on function public.admin_delete_voice(uuid, text) from public, anon;

grant execute on function public.admin_set_word_review_flag(uuid, boolean, text) to authenticated;
grant execute on function public.admin_upsert_language_profile(uuid, text, text, jsonb, text, text) to authenticated;
grant execute on function public.admin_set_language_profile_active(uuid, boolean, text) to authenticated;
grant execute on function public.admin_delete_language_profile(uuid, text) to authenticated;
grant execute on function public.admin_upsert_voice(uuid, text, text, text, text, text, text) to authenticated;
grant execute on function public.admin_delete_voice(uuid, text) to authenticated;

notify pgrst, 'reload schema';

commit;
