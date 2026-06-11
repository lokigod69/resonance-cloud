begin;

-- Generated media in the videos bucket is pipeline-owned.
-- Audit search found no direct browser/client uploads to storage.from('videos')
-- in frontend/src or frontend/api. Worker and backend uploads use the service
-- role key, and the service role bypasses RLS.
drop policy if exists "Users upload own videos" on storage.objects;

commit;
