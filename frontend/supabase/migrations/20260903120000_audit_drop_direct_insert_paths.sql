-- Platform hardening audit 2026-09-03, finding B-01 (Critical).
--
-- The Phase 2A policies "Users insert own words" / "Users insert own jobs"
-- (20260322210000) were never removed when generation moved behind
-- submit_generation. With them, any learner can INSERT a generation_jobs row
-- with credits_charged = 0, status = 'approved' and maximum priority (plus the
-- matching words rows) straight through PostgREST; the runner auto-approves
-- pending jobs and processes approved ones with no credit check.
--
-- Every legitimate writer is unaffected: submit_generation, request_word_retry,
-- submit_curriculum_import, submit_imageless_import, append_imageless_cards,
-- submit_lens_save and submit_word_stream_save are SECURITY DEFINER (they run
-- as the table owner, which RLS and these grants do not bind), and the Railway
-- runner uses the service role. The browser has no direct insert into either
-- table (verified: no `.from('words').insert` / `.from('generation_jobs').insert`
-- in src/ at audit time).
--
-- Verify after apply:
--   select policyname from pg_policies
--    where tablename in ('words', 'generation_jobs') and cmd = 'INSERT';   -- 0 rows
--   select has_table_privilege('authenticated', 'public.words', 'insert');  -- false
--   Generate wizard still submits (it uses the RPC).

begin;

drop policy if exists "Users insert own words" on public.words;
drop policy if exists "Users insert own jobs" on public.generation_jobs;

-- Belt and braces at the privilege level: PostgREST checks grants before RLS.
revoke insert on public.words from anon, authenticated;
revoke insert on public.generation_jobs from anon, authenticated;

notify pgrst, 'reload schema';

commit;
