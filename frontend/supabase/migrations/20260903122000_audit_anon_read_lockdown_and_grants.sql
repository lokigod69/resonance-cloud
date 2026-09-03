-- Platform hardening audit 2026-09-03, findings B-03, B-04, B-05 (Medium) and
-- B-14, B-15, B-16 (Low).
--
-- Several early policies read `using (true)` with no role clause, so the
-- public anon key can list them through PostgREST:
--   system_settings   (queue state + an unused admin_pin column)
--   shared_words      (every share id with its owner and word id — turns
--                      "unlisted" links into a public index)
--   language_profiles (per-language generation config / prompt settings)
--   voices, voice_samples, tts_assets, random_word_lists (reference data)
--
-- Client readers at audit time: system_settings and language_profiles only
-- from admin pages; voices only from admin pages (+ the admin-only Railway
-- client); shared_words never directly (both consumers use the definer RPCs
-- get_shared_word / create_or_get_share_link); voice_samples only through
-- api/voice-sample.ts (service role); tts_assets and random_word_lists not at
-- all. The Railway runner uses the service role. So every policy below can be
-- narrowed without touching a live path.
--
-- admin_pin is NOT dropped here (owner to confirm it is unused outside the
-- repo); it simply stops being world-readable.

begin;

-- B-03: system settings → admins only
drop policy if exists "Anyone can read system settings" on public.system_settings;
create policy "Admins read system settings"
  on public.system_settings for select
  to authenticated
  using ((select public.is_admin()));

-- B-04: share links → owner (and admins); the public share page keeps working
-- through get_shared_word (security definer)
drop policy if exists "Public read shared words" on public.shared_words;
create policy "Users read own share links"
  on public.shared_words for select
  to authenticated
  using (user_id = (select auth.uid()) or (select public.is_admin()));
revoke select on public.shared_words from anon;

-- B-05: reference tables → signed-in users (language profiles: admins only)
drop policy if exists "Anyone can read language profiles" on public.language_profiles;
create policy "Admins read language profiles"
  on public.language_profiles for select
  to authenticated
  using ((select public.is_admin()));

drop policy if exists "Anyone can read voices" on public.voices;
create policy "Authenticated read voices"
  on public.voices for select
  to authenticated
  using (true);

drop policy if exists "Anyone can read voice_samples" on public.voice_samples;
create policy "Authenticated read voice_samples"
  on public.voice_samples for select
  to authenticated
  using (true);

drop policy if exists "Public read tts_assets" on public.tts_assets;
create policy "Authenticated read tts_assets"
  on public.tts_assets for select
  to authenticated
  using (true);

drop policy if exists "Anyone can read random word lists" on public.random_word_lists;
create policy "Authenticated read random word lists"
  on public.random_word_lists for select
  to authenticated
  using (true);

-- B-14: pipeline RPCs are SECURITY INVOKER and were never revoked from PUBLIC,
-- so they appear in the API for anon/authenticated (RLS + the Phase 1E trigger
-- make calls fail today, so this is exposure, not exploit). Revoke whatever
-- overloads exist, signature-agnostic, and grant the runner's role back.
do $$
declare
  r record;
begin
  for r in
    select p.oid::regprocedure as signature
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('transition_word_stage', 'mark_word_failed', 'claim_retry_word')
  loop
    execute format('revoke all on function %s from public, anon, authenticated', r.signature);
    execute format('grant execute on function %s to service_role', r.signature);
  end loop;
end
$$;

-- B-14: two definer functions without a pinned search_path
alter function public.get_shared_word(text) set search_path = public;

-- B-16 (+ search_path): clamp the client-supplied increment. The home's
-- "spoke today" signal reads message_count >= 2, so an unbounded value is a
-- cheap way to fake activity.
create or replace function public.increment_speak_message_count(conv_id uuid, inc int)
returns void
language sql
security definer
set search_path = public
as $$
  update public.speak_conversations
  set message_count = message_count + least(greatest(inc, 0), 50)
  where id = conv_id and user_id = auth.uid();
$$;

-- B-15: the body already raises on a null auth.uid(); the anon grant just
-- broke the project's own convention.
revoke execute on function public.submit_imageless_import(text, text, text, jsonb, text) from anon;

notify pgrst, 'reload schema';

commit;
