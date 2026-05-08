# German i18n Phase 1B Card Progress Report

Date: 2026-05-08

## Scope

Phase 1B localizes `CardGenerationProgress` only. It does not change card generation behavior, queue logic, worker code, `submit_generation`, progress classification, or admin surfaces.

## Changes

- Added compact `status.*.short` keys in English, German, and French.
- Added `cardGenerationProgress.title` and `cardGenerationProgress.ariaLabel` keys in English, German, and French.
- Replaced hardcoded card progress strings with `t()` in `frontend/src/components/CardGenerationProgress.tsx`.
- Added a presentation-label assertion to `frontend/scripts/test-card-generation-progress.ts` so German chip labels stay short.

## German Labels

- Complete: `Fertig`
- Processing: `Lädt`
- Queued: `Queue`
- Failed: `Fehler`
- Generating cards: `Karten werden erstellt`

These labels avoid long chip text such as `Fehlgeschlagen` and `Wird verarbeitet`.

## Visual QA

Rendered the real component in a temporary Vite QA page at 390 px width with a German auth profile.

Result:

- `html lang="de"` was present.
- Classic and glassy variants rendered German labels.
- Browser overflow scan found `0` horizontally overflowing nodes.

Temporary QA files and screenshots were removed before commit.

## Verification

Run before merge:

```bash
npm run check:i18n
npm run build
npm run test:card-generation-progress
npx eslint src/components/CardGenerationProgress.tsx src/lib/translations.ts scripts/test-card-generation-progress.ts
git diff --check
```
