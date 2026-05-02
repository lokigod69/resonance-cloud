# Phase 1F.0 Credit Pricing Verification

Date: 2026-05-02

## Pre-Apply Verification

- `git status --short` captured initial dirty/untracked state.
- `supabase migration list --linked` captured migration drift:
  - `20260502120000` local-only.
  - `20260502210000` local-only.
  - Phase 1E repair migrations aligned local/remote.
  - unrelated local-only migrations also present.
- Live schema/function inspection confirmed:
  - `decks.deck_type` existed.
  - `generation_jobs.credits_charged` did not exist.
  - `generation_jobs.credit_cost_per_word` did not exist.
  - `generation_jobs.deck_type` did not exist.
  - `submit_generation` included `v_credits_required`.
  - `submit_generation` did not set the Phase 1E deck-update trusted flag before updating deck pipeline fields.
  - `request_word_retry` still charged 1 credit and used trusted flags.
  - quota enforcement was `false`.

## Red/Green Test Evidence

Added `frontend/scripts/test-phase1f0-credit-pricing.ts` and `npm run test:phase1f0:credits`.

Red run before canonical migration:

```text
AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:
+ actual - expected

+ undefined
- 'video'
```

This failed because live `submit_generation` did not return canonical `deck_type`/pricing metadata and job price columns were missing.

Green run after canonical migration:

```text
> frontend@0.0.0 test:phase1f0:credits
> tsx scripts/test-phase1f0-credit-pricing.ts

Phase 1F.0 credit pricing tests passed
```

Coverage includes:

- 1-word video with 9 credits returns insufficient credits and does not debit.
- 1-word video with sufficient credits debits exactly 10.
- 1-word card debits exactly 1.
- Multi-word video debits `10 * word_count`.
- Multi-word card debits `1 * word_count`.
- `generation_jobs.credits_charged` equals exact debit.
- `generation_jobs.credit_cost_per_word` equals 10 or 1.
- `generation_jobs.deck_type` matches effective deck type.
- Existing video deck append ignores browser `card` override and charges video price.
- Existing card deck append ignores browser `video` override and charges card price.
- Existing-deck append works under Phase 1E deck triggers.
- Idempotent repeat returns existing job and does not debit twice.
- Blank-word validation does not debit credits.
- `request_word_retry` charges exactly 1 credit.
- Normal user cannot directly update `profiles.credits`.
- Normal user cannot directly update `decks.status`/`word_count`.
- Normal user cannot directly update `generation_jobs.status`/`priority`/`words_completed`.
- Quota enforcement remains off.
- `computeCreditCost('video', 2) = 20`.
- `computeCreditCost('card', 2) = 2`.
- Settings copy no longer says every word costs 1 credit.

## Live Schema After Apply

Verified after apply:

- `generation_jobs.credits_charged|integer|NO|0`
- `generation_jobs.credit_cost_per_word|integer|NO|1`
- `generation_jobs.deck_type|text|NO|'video'::text`
- `submit_generation` returns and persists `deck_type`, `credit_cost_per_word`, and `credits_charged`.
- `submit_generation` sets `app.allow_phase1e_pipeline_update` before updating decks.
- `submit_generation` sets `app.allow_profile_privileged_update` before debiting credits.
- `api_quota_settings.enforcement_enabled=false`.

## Migration History

- Canonical SQL applied: `20260503010000_phase1f0_credit_pricing_canonical.sql`.
- Migration history repaired for `20260503010000` after manual SQL apply.
- Stale active pricing migrations are resolved:
  - `20260502120000` removed from active migrations.
  - `20260502210000` removed from active migrations.
- Broad `supabase db push` was not run.

The repair command returned:

```text
Repaired migration history: [20260503010000] => applied
```

Final `supabase migration list --linked` later succeeded and showed:

- `20260502120000` no longer present as local-only.
- `20260502210000` no longer present as local-only.
- `20260503010000 | 20260503010000`.
- Phase 1E repair migrations remained aligned.
- Unrelated local-only migrations still exist and were not applied by Phase 1F.0.

## Checks

Completed:

- `npm run build`
- `npm run typecheck:api`
- `npm run test:api:paid`
- `npm run test:regressions`
- `npm run test:phase1e:rls`
- `npm run test:phase1f0:credits`
- `npx eslint src/components/generate/GenerateWizard.tsx src/components/generate/steps/ConfirmStep.tsx src/pages/Settings.tsx scripts/test-phase1f0-credit-pricing.ts`
- `git diff --check`

Notes:

- `npm run build` passed with existing Vite warnings about dynamic import chunking and large chunks.
- `npm run test:api:paid` uses mocked `globalThis.fetch` with test API keys; provider-looking logs are from mocked responses, not real paid provider network calls.
- Targeted ESLint initially surfaced existing React compiler issues in touched files; those were fixed and the targeted lint command then passed.
