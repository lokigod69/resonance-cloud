# Phase 1F.0 Credit Pricing Model Review

Date: 2026-05-02

## Current State

The original Phase 1B/1E pricing model charged:

- `submit_generation`: 1 credit per submitted word
- `request_word_retry`: 1 credit per retry

However, the current branch has advanced beyond Phase 1E:

- `72f857e feat(wizard): deck-type tile picker + credit cost per deck type`
- local-only migration `20260502210000_credit_cost_per_deck_type.sql`
- frontend copy/UI that references `video = 10 credits per word` and `card = 1 credit per word`

Live function inspection during the adversarial review found `v_credits_required` inside `public.submit_generation`, which indicates that deck-type pricing may already be live despite `20260502210000` showing as local-only in migration history.

## Where Current Credit Cost Is Calculated

Server-side:

- Historical one-credit implementation:
  - `frontend/supabase/migrations/20260428130000_phase1b_atomic_generation_retry.sql`
  - `frontend/supabase/migrations/20260502170000_phase1e_trusted_rpc_guard_fix.sql`
  - calculates `v_word_count` and debits `profiles.credits - v_word_count`
- Local-only deck-type migration:
  - `frontend/supabase/migrations/20260502210000_credit_cost_per_deck_type.sql`
  - calculates `v_credit_cost_per_word`
  - calculates `v_credits_required`
  - debits `profiles.credits - v_credits_required`

Retry:

- `request_word_retry` debits `profiles.credits - 1`.

Frontend:

- `frontend/src/components/generate/steps/ConfirmStep.tsx`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/GeneratePG.tsx`
- `frontend/src/components/generate/steps/DeckTypeStep.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/src/pages/Settings.tsx`

## What Needs To Change For Video vs Cards

The intended pricing model should be made explicit and atomic in `submit_generation`:

- `deck_type = 'video'`: 10 credits per word
- `deck_type = 'card'`: 1 credit per word
- existing deck submissions should use the existing deck's stored `deck_type`, not a browser-supplied override
- new deck submissions should validate `p_deck_payload->>'deck_type'`
- insufficient credits must be checked against the exact computed total
- idempotent retry of the same submit must not double-charge

Do not rely on frontend-only calculations. The browser may display estimates, but the RPC must remain the source of truth.

## Schema Needed

Recommended:

- `decks.deck_type text check (deck_type in ('video', 'card')) default 'video'`
- `generation_jobs.credits_charged integer not null default 0`
- optionally `generation_jobs.credit_cost_per_word integer not null default 1`
- optionally `generation_jobs.generation_type` only if it has a different meaning than `decks.deck_type`

`words` probably does not need its own `deck_type` if every word belongs to one deck and one job. If future mixed-mode decks are allowed, then store per-word cost/type explicitly.

## Refund / Admin Reject Implications

Admin reject/refund cannot safely use `generation_jobs.words_total` once pricing varies.

Phase 1F admin RPCs should refund:

- exactly `generation_jobs.credits_charged`, or
- the sum of per-word charges if per-word accounting is added

Required behavior:

- refund must be atomic with job rejection
- refund must be idempotent
- audit event should record actor, reason, job ID, original status, and exact refund amount
- browser should not compute refund amount

## Frontend Display Requirements

Frontend required-credit displays should call one shared helper, not duplicate math:

- `computeCreditCost(deckType, wordCount)`
- video/card copy should come from translations
- existing deck flows must read and respect `deck_type`
- disabled submit UI should match the server-side RPC calculation

Current conflicts:

- `frontend/src/pages/Settings.tsx` still says each word generation costs 1 credit.
- Some frontend translation/UI changes are currently dirty/unrelated in the worktree.
- `frontend/supabase/migrations/20260502120000_add_deck_type_to_submit_generation.sql` and `20260502210000_credit_cost_per_deck_type.sql` are local-only and should not be pushed/applied blindly.

## Tests Needed

SQL/RPC tests:

- video submit with 1 word and 9 credits returns insufficient credits
- video submit with 1 word and 10 credits succeeds and debits 10
- card submit with 1 word and 1 credit succeeds and debits 1
- multi-word video/card costs multiply correctly
- existing deck submit uses stored deck type even if browser sends a conflicting type
- idempotent repeat returns existing job and does not debit twice
- failed validation does not debit credits
- `request_word_retry` still charges exactly 1 credit unless product explicitly changes retry pricing

Admin/refund tests:

- reject/refund returns exact `credits_charged`
- reject without refund does not credit the user
- repeated reject/refund cannot double-refund

Frontend tests:

- displayed required credits match helper output
- submit button disables when cached credits are below required amount
- API/RPC error for insufficient credits is shown cleanly

## Recommended Next Step

Before Phase 1F admin RPC work, reconcile the deck-type/pricing migrations:

1. Decide whether pricing is already intentionally live.
2. If live, repair/align migration history intentionally and add `credits_charged` before admin refunds are hardened.
3. If not intended live, restore `submit_generation` to the Phase 1E version through a new corrective migration rather than editing old applied migrations.
4. Do not run `supabase db push` while `20260502120000` and `20260502210000` remain unresolved local-only migrations.
