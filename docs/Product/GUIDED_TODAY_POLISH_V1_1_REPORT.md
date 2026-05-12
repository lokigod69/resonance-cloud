# Guided Today Polish V1.1 Report

## Commit And Push

- Commit SHA: final immutable SHA is recorded in the final response after commit creation.
- Pushed `origin/main` SHA: final pushed SHA is recorded in the final response after `git push origin main`.

## Files Changed

- `frontend/src/components/today/Today.css`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/src/components/today/TypeRecallStep.tsx`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_POLISH_V1_1_REPORT.md`

## Tests Run

The required verification commands are run before commit and push:

- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npx eslint src/pages/Today.tsx src/components/today/TodayHero.tsx src/components/today/TodayPathOverview.tsx src/components/today/TodaySession.tsx src/components/today/TypeRecallStep.tsx src/data/guidedLessons.ts scripts/test-guided-vibes.ts scripts/test-guided-today-path-overview.ts scripts/test-guided-today-data.ts`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

## Sharp Top-Right Atmosphere

Sharp keeps the graphite/cyan high-contrast identity, but its root atmosphere is now the mirrored counterpoint to Bright. Bright remains warm top-left sunlight; Wistful remains centered mist; Sharp now uses a cyan/silver top-right radial and angled edge, with the main emphasis at `86% 8%` instead of centered at `50% 0%`.

## Selected Lesson Copy Reduction

The selected/recommended lesson panel no longer shows the visible "Ausgewaehlte Lektion" or "Naechste Lektion" label. That label remains screen-reader-only for accessibility. The visible panel is reduced to lesson number, lesson title, and the action button.

## Type Recall Target Improvements

The active Guided Today variants were audited for low-value Type Recall answers. Obvious final-word targets were replaced with meaningful phrase chunks:

- Lesson 1 Bright, Wistful, and Sharp now recall `speak` instead of `English`.
- Lesson 5 Bright and Wistful now recall `How much` instead of `this`.
- Lesson 7 Bright now recalls `help me` instead of `please`.
- Lesson 8 Bright now recalls `I love` instead of `here`.
- Lesson 8 Sharp now recalls `Good place` instead of `it`.

Accepted answers remain capitalization-tolerant, and the single-input Type Recall model is unchanged.

## Fallback UI Simplification

The bulky fallback chip/help area was removed from Type Recall. "Ich weiss nicht" now reveals one compact answer line, marks `usedFallback: true`, and enables continuing without showing irrelevant selectable helper chips.

## German Cue Cleanup

The active Guided Today Speak cues were audited with static coverage. Speak `baseCue` strings remain learner-facing German prompts for producing the English target phrase, and obvious English leakage such as `clear question`, `quick question`, `how much`, and similar cue text is blocked by tests.

## Scope Confirmation

This pass is scoped to `/today` components, Today-local CSS, Guided Today lesson data, Today translation copy, Today static tests, and this report.

No backend, Supabase, provider, generation, credit, deck, word, persistence, routing, global theme, Music, Study, or Speak-outside-Today files were changed.
