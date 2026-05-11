# Guided Today UX Cleanup V1.3 Report

Date: 2026-05-11

## Summary

Guided Today V1.3 makes `/today` more path-like and less dashboard-like. The overview now favors lesson sequence, compact state, and vibe choice over explanatory copy. Exercise feedback leans on visual states, and completion now sends learners forward to the next lesson before offering replay.

## Files Changed

- `frontend/src/pages/Today.tsx`
- `frontend/src/components/today/TodayHero.tsx`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/src/components/today/TodaySession.tsx`
- `frontend/src/components/today/MatchPairsStep.tsx`
- `frontend/src/components/today/BuildPhraseStep.tsx`
- `frontend/src/components/today/TypeRecallStep.tsx`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_UX_CLEANUP_V1_3_REPORT.md`

## UX Changes

- Lesson path cards now show only lesson number, title, and visual state: empty circle, play marker, or green check.
- Situation descriptions, selected-vibe phrase previews, trophy copy, and repeated not-started labels are absent from lesson cards.
- The top path header keeps `English A1 Practical`, `German -> English`, selected vibe, and compact completion count without the extra Today/Guided Path label.
- The active vibe selector now shows only `Bright`, `Wistful`, and `Sharp` plus selected state. A hidden `.today-vibe-emblemSlot` exists for future emblem/image assets.
- The session header no longer renders the exact target phrase before build/type/speak steps.
- The session has one clear `Back to path` action at the top. The generic bottom step-back control was removed.
- Match pairs use a smaller centered matching area with compact columns and visual-only correct state.
- Build correct state is visual-only. The `Richtig.` success pill is not rendered.
- Type Recall correct state is visual-only, and wrong feedback stays compact without revealing the expected answer.
- Completion prioritizes `Next lesson` when a next lesson exists, then `Back to path`, then smaller replay.

## Future Direction

Each lesson can later unlock a trophy-word card. Trophy cards may become a visual collection or deck for the path, but V1.3 deliberately does not implement any deck, words, Supabase, or persistence integration. V0 remains local/static.

Future vibe emblems should populate the prepared selector slot without requiring generated assets in this pass.

## Deliberately Not Touched

- Supabase schema
- backend persistence
- generation
- credits
- providers
- decks
- words
- `generation_jobs`
- Music
- Study
- Speak
- broad app theme system
- generated or authored image assets

## Validation

Required validation for this pass:

- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npm run build`
- targeted ESLint on changed Today files/scripts
- `git diff --check`
- `git diff --cached --check`
