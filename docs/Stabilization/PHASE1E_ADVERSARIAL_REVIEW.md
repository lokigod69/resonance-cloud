# Phase 1E Adversarial Review

Date: 2026-05-02

## Scope

Reviewed Phase 1E after commit `b0c6413` and the later main-branch state. No Phase 1A/1B/1C SQL was rerun. Quota enforcement was not enabled. No paid providers were called.

This pass made one narrow Phase 1E repair: direct public `shared_words.view_count` PATCH requests now hard-fail instead of returning `200 []`.

## Worktree Hygiene

Current branch:

- `main`

Current `HEAD` at review time:

- `72f857e feat(wizard): deck-type tile picker + credit cost per deck type`

Unrelated dirty/untracked files left untouched:

- `frontend/src/components/settings/fieldConfigs.ts`
- `frontend/src/lib/translations.ts`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/GeneratePG.tsx`
- `tests/test_frontend_duration_fields.py`
- `frontend/src/components/generate/steps/CardImageStyleStep.tsx`
- report/handoff markdown files unrelated to Phase 1E
- `frontend/supabase/migrations/20260502120000_add_deck_type_to_submit_generation.sql`
- `frontend/supabase/migrations/20260502210000_credit_cost_per_deck_type.sql`

## Migration State

`supabase migration list --linked` confirmed:

| Migration | Local | Remote | Notes |
| --- | --- | --- | --- |
| `20260502160000` | yes | yes | Phase 1E user deck/word/share RPCs. |
| `20260502170000` | yes | yes | Trusted guard fix. |
| `20260502180000` | yes | yes | Recompute/archive guard fix. |
| `20260502190000` | yes | yes | Share ID entropy schema fix. |
| `20260502220000` | yes | yes | Added during this review; first shared view denial repair. |
| `20260502230000` | yes | yes | Added during this review; forces direct shared update denial through trigger. |
| `20260502120000` | yes | no | Local-only deck_type submit_generation rewrite. Do not apply blindly. |
| `20260502210000` | yes | no | Local-only credit-cost-per-deck-type rewrite. Do not apply blindly. |

`20260502120000_add_deck_type_to_submit_generation.sql` is unrelated to Phase 1E. It redefines `submit_generation` to accept/write `deck_type` while still charging one credit per word. It also predates the Phase 1E trusted-trigger pattern and should not be pushed blindly.

`20260502210000_credit_cost_per_deck_type.sql` is also unrelated to Phase 1E. It redefines `submit_generation` for `video = 10 credits/word` and `card = 1 credit/word`; it is local-only in migration history.

## Shared Words Repair

Before repair:

- The tightened test failed because anon/public direct PATCH to `/rest/v1/shared_words?...` returned `200 []`.
- The row was not mutated, but the endpoint did not hard-deny the direct update.

Repair:

- `20260502220000_phase1e_deny_direct_share_view_update.sql`
- `20260502230000_phase1e_force_share_update_denial.sql`

The final repair creates an update policy that lets direct PATCH reach a trigger, and the trigger denies all untrusted direct `shared_words` updates. `increment_shared_word_view` sets the existing transaction-local trusted flag and remains the only public write path for `view_count`.

Live result:

- Public direct PATCH to `shared_words.view_count` is denied.
- Service-role readback confirms the direct PATCH did not set `view_count = 123`.
- `increment_shared_word_view` increments to `1`.
- A second `increment_shared_word_view` increments to `2`.

## Phase 1E SQL Review

Confirmed:

- Phase 1E `SECURITY DEFINER` functions set `search_path = public`.
- Helper/trigger functions are revoked from `public`, `anon`, and `authenticated` unless callable access is intended.
- User RPCs use `auth.uid()` and ownership checks:
  - `rate_word`: `words.id` and `user_id`
  - `update_deck_metadata`: `decks.id` and `user_id`
  - `move_words_to_deck`: all moved words plus source/target decks owned by caller and same target language
  - `archive_word`: owned word and deck
  - `archive_deck`: owned empty deck
  - `create_or_get_share_link`: owned word
- `create_or_get_share_link` generates IDs server-side with `extensions.gen_random_bytes`; browser-supplied share IDs are no longer used.
- `archive_word` derives storage cleanup paths from database rows and URL parsing; it does not accept browser-supplied storage paths.
- `request_word_retry` and `submit_generation` still use transaction-local trusted updates for Phase 1E triggers in the Phase 1E migration line.
- Admin direct writes remain intentionally outside Phase 1E and are reserved for Phase 1F.

Trusted mutation scope:

- `phase1e_is_trusted_mutation()` trusts `service_role`, `public.is_admin()`, or the transaction-local `app.allow_phase1e_pipeline_update = on`.
- The guard no longer trusts `current_user`.
- Normal clients cannot set this flag through the exposed RPC surface found in Phase 1E.
- The flag is set only inside trusted server-side functions needed to update guarded fields.

## Live Probe Results

`npm run test:phase1e:rls` passed after the shared-words repair.

Confirmed by the probe:

- normal user cannot directly update `words.status/current_stage/video_url`
- normal user cannot directly update `generation_jobs.status/priority/words_completed`
- normal user cannot directly update `decks.word_count/status`
- public cannot directly set/reset `shared_words.view_count`
- public can call `increment_shared_word_view`
- `request_word_retry` still works
- `submit_generation` still works

## Credit Pricing Finding

The review found that current main is no longer a pure Phase 1E state. `HEAD` includes a later deck-type/pricing commit, and live `submit_generation` inspection returned evidence of `v_credits_required`, which is not in the original Phase 1B/1E one-credit-per-word implementation.

This means:

- The original Phase 1E statement “generation is still 1 credit per submitted word” is not reliable for the current live schema.
- `request_word_retry` remains one credit based on the Phase 1B/1E function lineage and unchanged local migration sources.
- `20260502210000_credit_cost_per_deck_type.sql` is local-only in migration history even though live function inspection indicates pricing logic may already be present.

Do not run `supabase db push` until the local-only pricing/deck-type migrations are reconciled. Applying them blindly could re-redefine `submit_generation` after Phase 1E and may create history drift or compatibility issues.

## Checks Run

- `supabase migration list --linked`: completed
- `npm run test:phase1e:rls`: passed
- `npm run typecheck:api`: passed
- `npm run test:api:paid`: passed with mocks; no paid providers called
- `npm run test:regressions`: passed
- targeted ESLint for `scripts/test-phase1e-rpc-rls.ts`: passed
- `npm run build`: passed
- `git diff --check`: passed

## Blockers / Risks

No blocker remains for the Phase 1E RLS repair itself.

Open rollout risks:

- `20260502120000` and `20260502210000` are local-only and should not be included in a broad `db push`.
- Current live pricing state appears ahead of migration history.
- Admin direct writes are still Phase 1F work.
- Storage cleanup is queued but still needs a service-side cleanup worker.
