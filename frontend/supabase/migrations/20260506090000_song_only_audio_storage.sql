-- Song-only generation audio storage.
--
-- Formalizes the audio bucket already used by backend Suno upload code and
-- makes permanent Suno storage URL columns explicit/idempotent.

begin;

insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict (id) do update
  set public = excluded.public;

alter table public.words
  add column if not exists suno_storage_url text,
  add column if not exists suno_storage_url_b text;

drop policy if exists "Public read audio" on storage.objects;
create policy "Public read audio"
  on storage.objects for select
  using (bucket_id = 'audio');

drop policy if exists "Service role insert audio" on storage.objects;
create policy "Service role insert audio"
  on storage.objects for insert
  with check (
    bucket_id = 'audio'
    and auth.role() = 'service_role'
  );

drop policy if exists "Service role update audio" on storage.objects;
create policy "Service role update audio"
  on storage.objects for update
  using (
    bucket_id = 'audio'
    and auth.role() = 'service_role'
  )
  with check (
    bucket_id = 'audio'
    and auth.role() = 'service_role'
  );

drop policy if exists "Service role delete audio" on storage.objects;
create policy "Service role delete audio"
  on storage.objects for delete
  using (
    bucket_id = 'audio'
    and auth.role() = 'service_role'
  );

notify pgrst, 'reload schema';

commit;

