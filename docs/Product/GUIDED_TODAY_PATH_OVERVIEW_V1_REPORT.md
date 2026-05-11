# Guided Today Path Overview V1 Report

Date: 2026-05-11

## Summary

`/today` now presents English A1 Practical as a 10-lesson guided path instead of a single isolated lesson. The page shows the path title, German to English direction, selected active voice, recommended next lesson, and a compact 10-lesson overview with completion state per lesson.

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/src/pages/Today.tsx`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/src/components/today/TodaySession.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_PATH_OVERVIEW_V1_REPORT.md`

## Path UX Added

- Added a path dashboard for `english-a1-practical`.
- The dashboard shows `English A1 Practical`, `German -> English`, active voice, and local completion count.
- A prominent recommended lesson panel shows the recommended lesson number, title, selected-vibe phrase, German cue, and an action button.
- The overview renders all 10 lesson cards with title, selected-vibe core phrase, status, and trophy word.
- Opening any lesson switches into the existing `TodaySession` flow.
- Completing a lesson now offers a `View path` action so the learner can return to the overview and see the next recommendation.

## Status Model

Added `getGuidedPathOverview(pathId, progress, vibeId, selectedLessonId)` as the shared pure status helper.

Statuses are computed from local Today progress:

- `complete`: lesson id is in `completedLessonIds`.
- `current`: first incomplete lesson in lesson-number order.
- `not-started`: any remaining incomplete lesson that is not the first incomplete lesson.

If no lessons are complete, Lesson 1 is recommended. After Lesson 1 is complete, Lesson 2 is recommended, continuing through Lesson 10. When all 10 are complete, `isComplete` is true and no recommended lesson is returned.

## Lesson Selection Behavior

Selecting or opening a lesson stores only page-local React selection state. It does not write localStorage, mutate progress, mark completion, or reset the selected voice. The selected lesson is resolved with the current active vibe before rendering the session.

Completed lessons and not-started lessons are both openable. Completed lessons use replay copy, while the first incomplete lesson keeps the strongest visual emphasis as the recommended next step.

## Restart Behavior

Restart continues to call `restartTodayLessonProgress(progress, lesson)` for the currently selected lesson only. It removes that lesson from the course's completed/skipped ids and deletes only that lesson progress entry. Other completed lessons remain intact.

Restart does not change the selected vibe and does not clear full-path progress.

## Vibe Behavior

The Bright/Wistful/Sharp picker remains the active selector. The overview and lesson cards resolve every displayed phrase through the selected active vibe. Changing vibe:

- updates the recommended panel and all lesson card copy,
- exits any active session back to the overview,
- does not reset completion,
- does not fork progress,
- does not make Tender, Bold, or Cheeky selectable.

Future vibes remain blocked by `ACTIVE_GUIDED_VIBE_IDS` and `setSelectedGuidedVibe`.

## Still Local-Only

Progress remains localStorage-only and lesson-level. The selected vibe remains local path-scoped preference state under:

```text
resonance_guided_vibe__english-a1-practical
```

No raw typed answers, raw speech transcripts, private speech data, or per-vibe progress records are stored.

## Deliberately Not Touched

- Supabase migrations or schema
- backend persistence
- `submit_generation`
- `request_word_retry`
- credits or pricing
- decks
- words
- `generation_jobs`
- generation pipeline
- paid providers
- ElevenLabs
- KIE
- Suno
- Music internals
- Study internals
- Speak internals
- Slicer files
- broad app skin/theme system
- decorative or generated assets

## Checks Run

- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npm run build`
- `npx eslint src/pages/Today.tsx src/components/today/TodayPathOverview.tsx src/components/today/TodaySession.tsx src/data/guidedLessons.ts scripts/test-guided-today-path-overview.ts`
- Browser smoke at `http://127.0.0.1:5178/today`

`npm run build` exits successfully with the existing Vite warnings about large chunks and the ineffective dynamic import involving `src/lib/supabase.ts`.

`npm run check:i18n` exits successfully. It still reports existing French warn-only gaps for older Today vibe keys, not for the new path overview keys.

Browser smoke confirmed unauthenticated `/today` still redirects to `/login`; authenticated visual QA was not completed because no local test session credentials were available.

## Known Risks

- The overview is authenticated behind the existing app route guard, so local browser QA without a session cannot inspect the actual path dashboard.
- Completion is still lesson-level only. There is no backend path completion record, no server sync, and no cross-device continuity.
- The path overview intentionally does not persist in-session partial step progress, so the recommended action is based on complete/skipped/new local lesson state.
- The old intro's pre-session known-item marking is no longer the primary `/today` entry surface. `TodaySession` still receives the known-item set, but V1 focuses on path selection and recommendation.

## Next Recommended Phase

Add authenticated visual QA coverage for `/today` and decide whether known-item pre-marking belongs in each lesson's session intro or in a compact per-lesson preflight panel. After that, the next product phase should address backend persistence for lesson-level path progress without adding per-vibe forks.
