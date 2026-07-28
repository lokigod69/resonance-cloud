-- Storage enumeration lockdown (beta hardening, 2026-07-27).
--
-- Four buckets were created `public = true` WITH a bare `for select using
-- (bucket_id = '<name>')` policy on storage.objects. The policy is what powers the
-- storage *list* API — so an anonymous caller could enumerate every object path and
-- walk off with every user's generated songs, videos and TTS clips.
--
-- The fix drops the list/select policies but keeps the buckets public: direct
-- public-URL downloads (`/storage/v1/object/public/...`) do not consult RLS, and the
-- app only ever plays these assets via public_url values stored in table rows.
-- Verified 2026-07-27: no client code calls supabase.storage.from() on any of these
-- buckets (the only client storage calls are profile-avatars, which has correct
-- owner-scoped policies), and api/delete-account.ts uses the service-role client,
-- which bypasses RLS. Nothing breaks; only enumeration dies.

begin;

drop policy if exists "Public read videos" on storage.objects;
drop policy if exists "Public read audio" on storage.objects;
drop policy if exists "Public read tts-pronunciations" on storage.objects;
drop policy if exists "Public read voice-samples" on storage.objects;

commit;
