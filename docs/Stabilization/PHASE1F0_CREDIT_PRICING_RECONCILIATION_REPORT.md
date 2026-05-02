# Phase 1F.0 Credit Pricing Reconciliation Report

Date: 2026-05-02

## Summary

Phase 1F.0 makes deck-type pricing canonical in the server RPC:

- `video`: 10 credits per word
- `card`: 1 credit per word
- `request_word_retry`: unchanged at 1 credit

The browser remains an estimate/display layer. `public.submit_generation` is the source of truth for effective deck type, cost per word, and exact debit.

## Migration Strategy

Live DB was partially ahead of migration history:

- `decks.deck_type` existed live.
- `submit_generation` already had `v_credits_required`.
- `generation_jobs` did not have `credits_charged`, `credit_cost_per_word`, or `deck_type`.
- Remote migration history did not include `20260502120000` or `20260502210000`.

Resolution:

- Removed stale active pricing drafts from the migrations folder:
  - `frontend/supabase/migrations/20260502120000_add_deck_type_to_submit_generation.sql`
  - `frontend/supabase/migrations/20260502210000_credit_cost_per_deck_type.sql`
- Added one canonical migration:
  - `frontend/supabase/migrations/20260503010000_phase1f0_credit_pricing_canonical.sql`
- Applied only the canonical migration manually with `psql` using `set role postgres`.
- Repaired only `20260503010000` to applied status using `supabase migration repair --linked --status applied 20260503010000`.
- Did not run broad `supabase db push`, because unrelated local-only migrations remain in the active folder.
- Final `supabase migration list --linked` showed `20260503010000` aligned local/remote and no unresolved local-only stale pricing migrations for `20260502120000` or `20260502210000`.

## Schema Changes

`public.decks`:

- Ensures `deck_type text not null default 'video'`.
- Enforces `deck_type in ('video', 'card')`.
- Backfills null/invalid deck types to `video`.

`public.generation_jobs`:

- Adds `credits_charged integer not null default 0`.
- Adds `credit_cost_per_word integer not null default 1`.
- Adds `deck_type text not null default 'video'`.
- Backfills job `deck_type` from the owning deck.
- Enforces nonnegative `credits_charged`, positive `credit_cost_per_word`, and valid `deck_type`.

## Final `submit_generation` Behavior

- Requires `auth.uid()`.
- Rejects empty word lists.
- Validates blank words before creating rows or debiting.
- For new decks, validates `p_deck_payload->>'deck_type'`.
- For existing decks, locks the existing deck and uses stored `decks.deck_type`; browser-supplied deck type is ignored.
- Computes:
  - `video`: `word_count * 10`
  - `card`: `word_count * 1`
- Returns clean `success=false` for insufficient credits without creating/debiting.
- Creates `generation_jobs` with exact `credits_charged`, `credit_cost_per_word`, and `deck_type`.
- Inserts words with `current_stage='pre_bootstrap'`.
- Sets `app.allow_phase1e_pipeline_update` before updating `decks.status`/`word_count`.
- Sets `app.allow_profile_privileged_update` before debiting `profiles.credits`.
- Idempotent repeats return original `deck_id`, `job_id`, `deck_type`, `credit_cost_per_word`, and `credits_charged` without a second debit.

## Frontend Changes

- `frontend/src/components/generate/GenerateWizard.tsx`
  - Existing-deck add flow now fetches `deck_type` and locks the local wizard state to the stored deck type.
- `frontend/src/components/generate/steps/ConfirmStep.tsx`
  - Uses shared `computeCreditCost` for visible credit usage.
- `frontend/src/pages/Settings.tsx`
  - Replaced stale “each word generation costs 1 credit” copy with video/card pricing.
- Existing GO/PG generation flows already selected `deck_type`, passed it only for new deck payloads, and read stored `deck_type` for existing-deck flows.

## Quota and Provider Boundary

- Quota enforcement remained off: `api_quota_settings.enforcement_enabled=false`.
- No paid provider APIs were called.

## Phase 1F Admin Refund Readiness

Admin reject/refund RPCs can now refund exactly `generation_jobs.credits_charged`.

Remaining Phase 1F work:

- Add admin reject/refund RPCs.
- Make refund idempotent.
- Audit refund actor, job, original status, refund amount, and reason.
- Ensure rejection/refund state transitions remain behind trusted server/admin paths.
