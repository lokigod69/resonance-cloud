# Guided Today A1 Practical 2 Report

Date: 2026-05-12

## Commit And Push

The final local commit SHA and pushed `origin/main` SHA are reported in the implementation response after `git push origin main` completes. They are not embedded here because a commit cannot reliably contain its own final SHA.

## Files Changed

- `docs/Product/GUIDED_CURRICULUM_SPINE_V0.md`
- `docs/Product/GUIDED_TODAY_A1_PRACTICAL_2_REPORT.md`
- `frontend/src/data/guidedLessons.ts`
- `frontend/src/pages/Today.tsx`
- `frontend/src/components/today/TodayPathOverview.tsx`
- `frontend/scripts/test-guided-vibes.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `frontend/scripts/test-guided-today-data.ts`

## Tests Run

Required verification set:

- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npm run check:i18n`
- `npx eslint src/pages/Today.tsx src/components/today/TodayHero.tsx src/components/today/TodayPathOverview.tsx src/components/today/TodaySession.tsx src/lib/todayProgress.ts src/lib/todayVibe.ts src/data/guidedLessons.ts scripts/test-guided-vibes.ts scripts/test-guided-today-path-overview.ts scripts/test-guided-today-data.ts`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

Final pass/fail evidence is in the implementation response.

## Curriculum Spine Summary

`GUIDED_CURRICULUM_SPINE_V0.md` defines Guided Today as the practical curriculum spine: real-life language survival moments taught through a learner-selected voice. It records the V0 ladder from A1 Practical 1 through the B1 sample, the difficulty ramp, future session-template roadmap, active vibe rules, A1 Practical 2 lesson goals, and explicit non-goals.

## A1 Practical 2 Summary

English A1 Practical 2 is added as a separate static/local path with id `english-a1-practical-2` and subtitle `Small Help and Simple Choices`.

The path includes 10 lessons:

1. I don't understand
2. Write it down
3. Show me
4. Which one?
5. Do you have...?
6. By card
7. A receipt, please
8. I have a reservation
9. Is this right?
10. One moment

Each lesson has Bright, Wistful, and Sharp variants with draft status, German learner-facing cues, English target phrases, chunks, lesson items, Build Phrase chips, Type Recall targets, Speak targets, trophy words, placeholder scene captions, song seeds, and visual notes.

## Path Selector Behavior

`/today` now has a compact path switcher inside the existing overview header. It exposes:

- `A1 Practical 1`
- `A1 Practical 2`

Switching paths updates the lesson grid, selected lesson panel, progress count, selected path metadata, and available lessons without adding routes or backend sync.

## Progress And Vibe Completion Behavior

Progress remains scoped by `lesson.courseId`, now matching the selected path id. Completing a lesson in A1 Practical 1 does not change A1 Practical 2 counts, and vice versa.

Vibe selection uses the existing path-scoped localStorage helper. Each path can persist its selected active vibe independently. Per-vibe completion badges remain scoped to path and lesson through the existing `vibeCompletions` structure.

Future vibes remain non-selectable.

## A1 Practical 1 Preservation

A1 Practical 1 keeps its existing lesson definitions, lesson order, active vibe variants, session flow, local progress behavior, and per-vibe completion badge behavior. Its path id is now `english-a1-practical-1` so the app can distinguish it from A1 Practical 2.

## Non-Goals Confirmed

No backend, Supabase, provider, generation, deck, word, credit, pricing, Music, Study, Speak outside `/today`, trophy persistence, or broad global theme changes were included.
