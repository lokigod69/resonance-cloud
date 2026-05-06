# Card Queue UX Card Progress Report

Date: 2026-05-06

## Scope

Implemented only the immediate frontend UX correction for card deck queue display.

This pass did not change worker concurrency, feeder same-deck locking, provider behavior, `submit_generation`, `request_word_retry`, pricing, RPCs, or DB schema.

## Files Changed

- `frontend/src/lib/cardGenerationProgress.ts`
- `frontend/src/components/CardGenerationProgress.tsx`
- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/GeneratePG.tsx`
- `frontend/scripts/test-card-generation-progress.ts`
- `frontend/package.json`

## Previous Queue Display Locations

`QueuePositionDisplay` was rendered from:

- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`

The generated states in:

- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/pages/GeneratePG.tsx`

also showed `jobsAhead` copy from `useQueuePosition`.

## Card Deck Behavior Now

For `deck_type === 'card'`:

- deck pages do not enable the global queue-position poll;
- deck pages do not render `QueuePositionDisplay`;
- deck pages do not show "jobs ahead";
- deck pages do not show estimated wait;
- generated pages do not show jobs-ahead copy;
- deck pages show local card progress from loaded `words`:
  - complete;
  - processing;
  - queued;
  - failed.

The progress classifier uses `status` and `current_stage` conservatively:

- complete: `status === 'complete'` or `current_stage === 'complete'`;
- failed: `status === 'failed'`, `current_stage === 'failed'`, or `current_stage === 'cancelled'`;
- processing: `status === 'processing'` or active stages such as `pending_image`, `enrichment`, `rendering`, `uploading`;
- queued: `status === 'pending'`, `status === 'queued'`, or queued stages such as `pre_bootstrap`, `pending`, `queued`.

## Video/Music Behavior

Non-card generating decks still use the existing `useQueuePosition` hook and `QueuePositionDisplay` behavior. The global queue-position RPC and `QueuePositionDisplay` component were not removed.

## Admin Layer 2 Lab

The Lab submission result already shows submitted and failed row counts. This pass did not change the Lab submission model or add queue polling to the Lab. Card lab decks now use the card deck progress display once opened.

## Adversarial Review Fix

Adversarial review found a redirect regression after card submissions:

- card submissions disabled `useQueuePosition`;
- `GenerateGO.tsx` and `GeneratePG.tsx` still depended on queue `jobStatus` / `hasChecked` to navigate after submit;
- new PG card decks could show a fallback link to `/dashboard` instead of `/deck/${generatedDeckId}`.

Fix applied:

- added explicit generated-deck navigation helpers in `frontend/src/lib/cardGenerationProgress.ts`;
- card submissions now navigate to `/deck/${queueDeckId}` without waiting for queue polling;
- non-card submissions keep the existing queue-based navigation condition;
- generated-state fallback/open links now use the returned deck id when available.

This fix did not re-enable `QueuePositionDisplay`, jobs-ahead copy, or ETA copy for card decks.

## Tests And Checks

Passed:

- `npm run test:card-generation-progress`
- `npx eslint src/lib/cardGenerationProgress.ts src/components/CardGenerationProgress.tsx src/pages/DeckView.tsx src/pages/DeckViewPG.tsx src/pages/GenerateGO.tsx src/pages/GeneratePG.tsx scripts/test-card-generation-progress.ts --quiet`
- `npm run build`

Known pre-existing issue:

- `npm run lint -- --quiet` still fails on unrelated existing app-wide lint errors outside this pass.

## Remaining Risks

- Card progress depends on the deck page's existing `words` fetch/poll cadence. No new polling was added.
- Stage classification is intentionally conservative. Future worker stages should be added to `frontend/src/lib/cardGenerationProgress.ts` if they need distinct display treatment.
- The Admin Layer 2 Lab throughput bottleneck remains unchanged because this pass intentionally did not implement batching or parallel same-deck processing.

## Rollback

Revert the frontend files listed above to restore the previous global queue display for card decks. No backend, DB, worker, provider, or pricing rollback is required.
