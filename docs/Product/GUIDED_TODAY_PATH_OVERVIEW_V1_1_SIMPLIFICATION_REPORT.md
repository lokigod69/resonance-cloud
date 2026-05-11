# Guided Today Path Overview V1.1 Simplification Report

Date: 2026-05-11

## Summary

Guided Today Path Overview V1.1 simplifies `/today` so the learner first chooses a voice, sees the recommended next lesson, and can open the path without seeing dense lesson internals. The path overview is now less spoiler-heavy, and the trophy word is revealed at lesson completion instead of in the Scene step.

## Files Changed

- `frontend/src/components/today/TodayHero.tsx`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/src/components/today/TodaySession.tsx`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_PATH_OVERVIEW_V1_1_SIMPLIFICATION_REPORT.md`

## Removed From Overview

- Removed vibe palette bars from active voice cards.
- Removed per-vibe example phrases from active voice cards.
- Removed `Beispiel` / example labels from the voice picker.
- Removed selected-vibe phrase previews from lesson path cards.
- Removed trophy word labels and trophy pills from lesson path cards.
- Removed the phrase-detail box from the recommended lesson panel.

The overview order is now:

1. Path header
2. Voice selector
3. Recommended next lesson
4. Minimal 10-lesson path

## Current Path UX

The path header still shows `English A1 Practical`, German to English direction, selected voice, and local completion count.

The recommended panel shows:

- lesson number and title,
- one short situation line,
- primary action button.

The 10-lesson path cards show:

- lesson number,
- title,
- status/icon,
- one short situation line,
- an explicit open/replay action button.

The cards are no longer dense study sheets.

## Trophy Word Reveal

The Scene step no longer renders trophy word content.

The Complete step now reveals:

- `Trophäenwort`,
- word,
- meaning,
- example,
- why it matters.

Trophy word data remains in static lesson data. Only the reveal timing changed.

## Back To Path Behavior

`TodaySession` now has a clear `Zurück zum Pfad` action near the top of the session. It calls the existing path-exit view handler and only sets `sessionActive` to false.

Back to path does not:

- reset progress,
- restart the lesson,
- change selected vibe,
- mutate localStorage progress.

The existing in-session back button remains step navigation.

## Content Coherence Flags And Fixes

Added source/data checks to `frontend/scripts/test-guided-today-path-overview.ts`.

The script now checks:

- overview cards do not render trophy labels,
- overview cards do not render selected-vibe phrase previews,
- voice selector does not render palette swatches or example phrases,
- Scene does not reveal trophy words,
- Complete can reveal trophy words,
- Back to path does not mutate progress,
- first-incomplete recommendation still works,
- future vibes remain non-selectable,
- vibe switching does not mutate progress,
- Lesson 8 avoids known incoherent items and chips.

Lesson 8 fixes:

- Bright items now focus on `I love`, `it`, `here`, `nice`, and `place`.
- Wistful items now focus on `quiet`, `here`, `I like`, `it`, and `place`.
- Sharp core phrase changed from `Good place. Right call.` to `Good place. I like it.`.
- Sharp items now focus on `good`, `place`, `I like`, `it`, and `here`.
- Removed the suspicious `right call`, `decided`, `focused`, `again`, `soft`, `almost`, `charming`, and `delighted` lesson-item usage from Lesson 8.

Manual review flags still printed by the lightweight audit:

- Lesson 1 Sharp item `focused`
- Lesson 6 Wistful item `almost`
- Lesson 7 Sharp item `focused`

These remain warnings only because they are outside the specific Lesson 8 request and may be intentional voice-color vocabulary.

## Checks Run

- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- Targeted ESLint during implementation:
  `npx eslint src/pages/Today.tsx src/components/today/TodayPathOverview.tsx src/components/today/TodaySession.tsx src/components/today/TodayHero.tsx src/data/guidedLessons.ts scripts/test-guided-today-path-overview.ts`

Final required checks are listed in the commit/final response after execution.

## Known Risks

- Authenticated visual QA still depends on having a valid local user session.
- The lightweight coherence audit is heuristic and intentionally does not perform semantic grading.
- Some non-Lesson-8 voice-color words remain flagged for manual review.
- The old pre-session known-item marking surface remains out of the main V1.1 overview path.

## Next Recommended Phase

Run authenticated visual QA for the simplified `/today` path and decide whether a tiny lesson preflight should restore optional known-item marking without reintroducing the dense curriculum-database feel.
