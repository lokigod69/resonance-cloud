# Phase 1B Atomic Generation/Retry Report

Date: 2026-04-29

## Summary

Phase 1B adds RPC-backed generation submit and retry paths so Phase 1A profile/credit hardening can be applied without breaking core generation and retry credit debits. The browser no longer directly updates `profiles.credits` during generation submit or retry.

## Files Changed

- `docs/Stabilization/PHASE1_MAIN_WORKTREE_STATUS.md`
- `docs/Stabilization/PHASE1_A_ADVERSARIAL_REVIEW.md`
- `docs/Stabilization/PHASE1_SQL_APPLY_ORDER.md`
- `docs/Stabilization/PHASE1_B_SQL_VERIFICATION.md`
- `docs/Stabilization/PHASE1_B_ATOMIC_GENERATION_RETRY_REPORT.md`
- `frontend/supabase/migrations/20260428130000_phase1b_atomic_generation_retry.sql`
- `frontend/src/components/generate/submitGeneration.ts`
- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`
- `frontend/src/pages/Music.tsx`
- `tests/test_phase1b_atomic_generation_retry.py`

Phase 1A files brought onto `main`:

- `frontend/supabase/migrations/20260428090000_pre_bootstrap_stage.sql`
- `frontend/supabase/migrations/20260428120000_phase1a_db_rls_auth_hardening.sql`
- `frontend/src/components/RedeemCodeDialog.tsx`
- `frontend/src/pages/Onboarding.tsx`
- Phase 1A docs in `docs/Stabilization`

## Migration Added

`frontend/supabase/migrations/20260428130000_phase1b_atomic_generation_retry.sql`

It adds:

- `generation_jobs.submit_idempotency_key`
- unique partial idempotency index on `(user_id, submit_idempotency_key)`
- `public.submit_generation(...)`
- `public.request_word_retry(...)`

`submit_generation` uses a transaction-scoped advisory lock on `(auth.uid(), p_idempotency_key)` before creating deck/job/word rows so concurrent duplicate submits serialize before side effects.

## Frontend Changes

- `submitGeneration.ts` now calls `supabase.rpc('submit_generation', ...)`.
- `DeckView.tsx` retry now calls `supabase.rpc('request_word_retry', ...)`.
- `DeckViewPG.tsx` retry now calls `supabase.rpc('request_word_retry', ...)`.
- `Music.tsx` Suno retry now calls `supabase.rpc('request_word_retry', ...)`.

## Checks Run

- `uv run --with pytest python -m pytest tests/test_phase1b_atomic_generation_retry.py -q`
  - Initial red result before implementation: failed as expected because the Phase 1B migration and RPC frontend calls were missing.
  - Final result: `4 passed`.
- `npm run build`
  - Result: passed.
  - Existing Vite warning remained: `src/lib/supabase.ts` is both dynamically and statically imported.
- `npx eslint src/components/RedeemCodeDialog.tsx src/pages/Onboarding.tsx src/components/generate/submitGeneration.ts src/pages/DeckView.tsx src/pages/DeckViewPG.tsx src/pages/Music.tsx`
  - Result: passed.
- `git diff --check`
  - Result: passed.
- Frontend direct-credit scan:
  - `submitGeneration.ts`, `DeckView.tsx`, `DeckViewPG.tsx`, and `Music.tsx` now show RPC calls and no direct `.from('profiles')` credit updates.
- Invite fallback scan:
  - `RedeemCodeDialog.tsx` and `Onboarding.tsx` now show only `redeem_invite_code`; no `invite_codes`, `redeemed_by`, legacy fallback, or direct credit update remains.
- `supabase db lint --local`
  - Result: not completed because no local Supabase Postgres was listening at `127.0.0.1:54322`.
- `supabase db push --dry-run`
  - Result: not completed because this worktree is not linked to a Supabase project: `Cannot find project ref. Have you run supabase link?`

## Checks Not Run

- Production SQL was not applied.
- Paid providers were not called.
- Live generation was not run.
- Full repo-wide frontend lint was not used as the acceptance gate because this repo has existing unrelated lint debt; targeted lint for changed frontend files passed.

## Safety Assessment

Phase 1A and Phase 1B are now safe to test together in local/staging. Phase 1A alone blocks direct browser credit updates. Phase 1B supplies the replacement RPC paths for generation submit and retry.

Broad RLS tightening for `decks`, `words`, and `generation_jobs` is intentionally not included yet.

## Production Test Checklist After SQL Is Applied

1. Submit generation with enough credits.
2. Submit generation with insufficient credits.
3. Duplicate submit using the same idempotency key.
4. Retry failed word with enough credits.
5. Retry failed word with insufficient credits.
6. Duplicate retry click.
7. Music retry from Music page.
8. Confirm credits decrement exactly once per accepted submit/retry.
9. Confirm normal users cannot manually update `profiles.credits`.
10. Confirm normal users cannot manually update `profiles.role`.
11. Confirm invite redemption still works through `redeem_invite_code`.
