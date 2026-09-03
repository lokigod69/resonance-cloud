-- Platform hardening audit 2026-09-03, finding B-09 (Medium).
--
-- The hot-table SELECT policies use bare `auth.uid()` / `public.is_admin()`.
-- In an OR predicate Postgres evaluates is_admin() (a definer function with a
-- subquery on admin_roles) for every row that fails the ownership test, which
-- is every row an admin page scans. Wrapping both in `(select ...)` turns them
-- into one-time initplans; `to authenticated` keeps anon out of the planner
-- entirely. Semantics are unchanged: owners see their rows, admins see all.

begin;

drop policy if exists "Users read own words" on public.words;
create policy "Users read own words"
  on public.words for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Users read own decks" on public.decks;
create policy "Users read own decks"
  on public.decks for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Users read own jobs" on public.generation_jobs;
create policy "Users read own jobs"
  on public.generation_jobs for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

drop policy if exists "Users read own recall attempts" on public.recall_attempts;
create policy "Users read own recall attempts"
  on public.recall_attempts for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));

notify pgrst, 'reload schema';

commit;
