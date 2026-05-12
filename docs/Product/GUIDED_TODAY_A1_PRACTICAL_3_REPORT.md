# Guided Today A1 Practical 3 Report

## Commit

- Commit SHA: recorded in the final response after commit creation. A committed file cannot contain its own final immutable SHA without changing that SHA.
- Branch: `main`
- Push target: `origin main`

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_A1_PRACTICAL_3_REPORT.md`

## Tests Run

- `npx tsx scripts/test-guided-vibes.ts` - 98 passed, 0 failed
- `npx tsx scripts/test-guided-today-path-overview.ts` - 106 passed, 0 failed
- `npx tsx scripts/test-guided-today-data.ts` - 2697 passed, 0 failed
- `npm run check:i18n` - German complete; known French gaps remain warn-only
- `npx eslint src/data/guidedLessons.ts scripts/test-guided-vibes.ts scripts/test-guided-today-path-overview.ts scripts/test-guided-today-data.ts` - passed
- `npm run build` - passed; existing bundle and dynamic import warnings remain non-blocking
- `git diff --check` - run before commit
- `git diff --cached --check` - run before commit

## A1P3 Path Summary

Added local/static path `english-a1-practical-3` with title `English A1 Practical 3` and subtitle `Moving Around: Places, Time, Transport`.

The path contains ten active Foundation-flow lessons:

1. Right or left?
2. How far is it?
3. Is it open?
4. Which bus?
5. The next stop
6. A ticket, please
7. What time does it close?
8. The corner
9. By foot or by taxi?
10. I missed my stop

Each lesson uses the existing `Scene -> Match Pairs -> Build Phrase -> Type Recall -> Speak -> Complete` flow.

## Vibe Distinction Summary

Every A1P3 lesson includes Bright, Wistful, and Sharp variants.

- Bright variants use warm, open, practical travel phrasing.
- Wistful variants use careful, softer travel phrasing without sad or poetic language.
- Sharp variants use direct, concise travel phrasing while staying polite.

Trophy words are unique within each vibe across the A1P3 path. Type Recall targets use meaningful chunks such as `turn left`, `five minutes`, `bus number`, `single ticket`, and `missed my stop` rather than trivial final words.

## Retention And Spec Alignment

Progress remains path-scoped through existing Guided Today path ids. Vibe completion badges remain path/lesson-scoped through existing per-lesson `vibeCompletions`. Future vibes remain non-selectable through the active vibe resolver and storage helper tests.

All A1P3 content uses German base language, English target language, A1-practical phrase length, lesson-specific scene/media captions, German Speak cues, and micro-situation lesson packs.

## Preservation And Scope

A1P1 and A1P2 lesson content was preserved. Only path registry exposure and tests were extended to include A1P3.

No backend, Supabase, provider, generation, deck, word, global-theme, credit, pricing, Music, Study, or broad routing changes were made.
