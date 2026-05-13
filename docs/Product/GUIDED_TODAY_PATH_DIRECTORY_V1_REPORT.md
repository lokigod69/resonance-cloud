# Guided Today Path Directory V1 Report

Commit SHA: `91b27a95a25e7e6b40a27f39b2f0ae1933e6def4`

## Files Changed

- `frontend/src/components/today/GuidedPathDirectory.tsx`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/src/components/today/Today.css`
- `frontend/src/pages/Today.tsx`
- `frontend/src/pages/GuidedCheckpoint.tsx`
- `frontend/src/lib/guidedCheckpoint.ts`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `frontend/scripts/test-checkpoint-selection.ts`
- `frontend/scripts/test-guided-path-directory.ts`

## Tests And Checks Run

- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-checkpoint-selection.ts`
- `npx tsx scripts/test-checkpoint-trigger.ts`
- `npx tsx scripts/test-checkpoint-storage.ts`
- `npx tsx scripts/test-guided-path-directory.ts`
- `npm run check:i18n`
- `npx eslint src/components/today/TodayPathOverview.tsx src/components/today/GuidedPathDirectory.tsx src/components/today/CheckpointCard.tsx src/pages/Today.tsx src/pages/GuidedCheckpoint.tsx src/lib/guidedCheckpoint.ts scripts/test-guided-today-path-overview.ts scripts/test-checkpoint-selection.ts scripts/test-guided-path-directory.ts`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

## Path Directory Behavior

The Today header now shows only the active path context: title, German to English direction, active vibe, and progress. The permanent inline path chip row was removed and replaced with one compact `Pfad wechseln` / `Change path` action.

The directory opens as an accessible dialog, shows the current continue path first, and lists the implemented A1 practical packs as compact choices: `A1 P1`, `A1 P2`, and `A1 P3`. Each choice includes the configured subtitle and path progress such as `0/10` or `1/10`. Selecting a path closes the directory and updates Today.

The directory has a lightweight `Praktisch` grouping structure so future groups can be added without cluttering `/today`, but it does not expose generation categories or selectable future packs.

## Mobile And Desktop Behavior

Desktop uses a centered modal panel with constrained width and height. Mobile uses a near-full-screen bottom sheet with readable stacked path rows and the same keyboard/focus affordances.

## Selected Vs Recommended Fix

When no explicit lesson is selected, the recommended lesson remains the primary start target. Once the user selects another lesson, only the selected lesson keeps the selected/start visual and play emphasis. The recommended lesson keeps only quiet metadata and does not retain the competing active glow.

## Path Check Behavior

`Pfad-Check` / `Path Check` is available from the current path header and from the directory current-path section. It routes to `/today/checkpoint?mode=path-check&path=<path>&vibe=<vibe>`, samples checkpoint items from the selected path and active vibe without requiring completion, and reuses the existing Type Recall, Speak, and Summary checkpoint UI.

Path Check creates only an in-memory summary record for the session. It does not mark lessons complete and does not write the normal Quick Review checkpoint record.

## Quick Review Behavior Preserved

`Kurze Wiederholung` remains gated by fully completed paths in the active vibe. The existing `/today/checkpoint?vibe=<vibe>` route still uses the completion-gated checkpoint plan and writes the normal local checkpoint record on completion.

## Out Of Scope Confirmation

No backend, Supabase schema, provider, generation, credit, deck, word, Music, Study, global theme, live TTS/video/provider, or lesson-content changes were made.
