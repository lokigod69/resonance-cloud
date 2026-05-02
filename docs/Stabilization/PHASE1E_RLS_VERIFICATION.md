# Phase 1E RLS Verification

Date: 2026-05-02

## Live SQL/RLS Probe

Added:

- `frontend/scripts/test-phase1e-rpc-rls.ts`
- `npm run test:phase1e:rls`

The probe uses disposable Supabase Auth users and service-role cleanup. It does not call paid providers.

Covered:

- normal user can call `rate_word` for own word
- normal user cannot rate another user's word
- normal user can rename own deck through `update_deck_metadata`
- normal user cannot rename another user's deck
- normal user can move owned words into an owned same-language target deck
- normal user cannot move another user's word
- normal user cannot move a word into another user's deck
- `move_words_to_deck` recalculates deck `word_count` and `status` server-side
- normal user can archive own word through RPC
- normal user can archive an empty owned deck through RPC
- normal user cannot directly update `words.status/current_stage/video_url`
- normal user cannot directly update `generation_jobs.status/priority/words_completed`
- normal user cannot directly update `decks.word_count/status`
- public cannot directly set/reset `shared_words.view_count`
- public can call `increment_shared_word_view`, incrementing by one
- `request_word_retry` still works after the Phase 1E triggers
- `submit_generation` still works after the Phase 1E triggers

## Migration Apply/Repair

Verified aligned remotely:

- `20260502160000 | 20260502160000`
- `20260502170000 | 20260502170000`
- `20260502180000 | 20260502180000`
- `20260502190000 | 20260502190000`

Unrelated and left untouched:

- `20260502120000 |` remains local-only.

Quota check:

- `public.api_quota_settings.enforcement_enabled = false`

## Checks Run

- `npm run build`: passed
- `npm run typecheck:api`: passed
- `npm run test:api:paid`: passed with mocks; no paid provider calls
- `npm run test:regressions`: passed
- `npm run test:phase1e:rls`: passed
- targeted ESLint for changed files: passed
- `git diff --check`: passed

Build note:

- A later `npm run build` rerun failed because of unrelated pre-existing dirty deck-type wizard work outside Phase 1E: `src/components/generate/GenerateWizard.tsx` now receives an `ExistingDeck` without required `deck_type` after local changes in `useWizardState.ts` / `GenerateGO.tsx`. Those files were left untouched for Phase 1E.

## Known Live Findings During Verification

- The first live Phase 1E apply trusted `current_user` inside a security-definer guard, so direct normal-user updates were incorrectly treated as trusted. Fixed by `20260502170000`.
- The live deck recomputation helper initially lacked the transaction-local trusted flag. Fixed by `20260502180000`.
- `create_or_get_share_link` initially called unqualified `gen_random_bytes` under `search_path = public`. Fixed by `20260502190000`.

## Remaining Risks

- Admin content delete/review flows still use direct admin browser writes and should move to audited admin RPCs in Phase 1F.
- Storage cleanup is queued in SQL but object deletion is not yet performed by a service worker.
- This phase does not broadly lock all `words`, `decks`, or `generation_jobs` mutations; it targets normal-user pipeline-owned fields and migrated user lifecycle flows.

## Next Recommended Phase

Phase 1F should implement audited admin RPCs for queue approval/rejection, refunds, role/credit changes, invite codes, system settings, and content archive/delete. Do not tighten broader admin-facing RLS until those admin browser writes are replaced.
