-- Profile avatar upload.
--
-- Adds two profile columns (avatar_path, avatar_updated_at), introduces a
-- private storage bucket "profile-avatars", and updates the Phase 1A
-- protect_profile_privileged_fields trigger so authenticated users can update
-- only those two new columns alongside the existing safe-update list. role,
-- credits, email, and other privileged fields remain protected.
--
-- Storage: one fixed object per user at <user_id>/avatar.jpg. RLS denies any
-- other path, any other bucket, and any anonymous access. Re-uploading
-- overwrites the same key (upsert), so only the latest avatar is ever stored.

begin;

-- ---------------------------------------------------------------------------
-- 1. Profile columns
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column if not exists avatar_path text,
  add column if not exists avatar_updated_at timestamptz;

comment on column public.profiles.avatar_path is
  'Object key inside the profile-avatars storage bucket. Always <user_id>/avatar.jpg or null. Never a public URL.';

comment on column public.profiles.avatar_updated_at is
  'Set whenever the avatar object is created, replaced, or removed. Used for cache busting.';

-- ---------------------------------------------------------------------------
-- 2. Phase 1A protection trigger — extend safe-update list with avatar fields
--    Body is byte-identical to Phase 1A
--    (20260428120000_phase1a_db_rls_auth_hardening.sql) apart from the
--    v_safe_update_columns array.
-- ---------------------------------------------------------------------------

create or replace function public.protect_profile_privileged_fields()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_safe_update_columns text[] := array[
    'display_name',
    'base_language',
    'theme',
    'skin',
    'onboarding_complete',
    'onboarding_completed',
    'onboarding_preferences',
    'updated_at',
    'avatar_path',
    'avatar_updated_at'
  ];
  v_blocked_columns text;
  v_is_trusted boolean;
begin
  v_is_trusted :=
    coalesce(auth.role(), '') = 'service_role'
    or coalesce(current_setting('app.allow_profile_privileged_update', true), '') = 'on'
    or public.is_admin();

  if tg_op = 'INSERT' then
    if not v_is_trusted then
      if new.id is distinct from auth.uid() then
        raise exception 'Users can only insert their own profile'
          using errcode = '42501';
      end if;

      if coalesce(new.role, 'learner') <> 'learner'
         or coalesce(new.credits, 0) <> 0 then
        raise exception 'Users cannot set privileged profile fields'
          using errcode = '42501';
      end if;
    end if;

    return new;
  end if;

  if tg_op = 'UPDATE' and not v_is_trusted then
    select string_agg(changed.key, ', ' order by changed.key)
    into v_blocked_columns
    from (
      select n.key
      from jsonb_each(to_jsonb(new)) as n(key, value)
      join jsonb_each(to_jsonb(old)) as o(key, value)
        on o.key = n.key
      where n.value is distinct from o.value
        and not (n.key = any (v_safe_update_columns))
    ) as changed;

    if v_blocked_columns is not null then
      raise exception 'Users can only update safe profile preference fields. Blocked: %',
        v_blocked_columns
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

revoke all on function public.protect_profile_privileged_fields() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Private storage bucket
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'profile-avatars',
  'profile-avatars',
  false,
  2097152,
  array['image/jpeg']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

-- ---------------------------------------------------------------------------
-- 4. RLS — own-path-only at fixed filename <user_id>/avatar.jpg
-- ---------------------------------------------------------------------------

drop policy if exists "Users read own avatar" on storage.objects;
create policy "Users read own avatar"
  on storage.objects for select
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

drop policy if exists "Users insert own avatar" on storage.objects;
create policy "Users insert own avatar"
  on storage.objects for insert
  with check (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

drop policy if exists "Users update own avatar" on storage.objects;
create policy "Users update own avatar"
  on storage.objects for update
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  )
  with check (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

drop policy if exists "Users delete own avatar" on storage.objects;
create policy "Users delete own avatar"
  on storage.objects for delete
  using (
    bucket_id = 'profile-avatars'
    and auth.role() = 'authenticated'
    and name = auth.uid()::text || '/avatar.jpg'
  );

commit;
