# Guided Today A1P8 Implementation Report - 2026-05-15

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/guidedSegmentStories.ts`
- `frontend/src/components/today/GuidedPathDirectory.tsx`
- `frontend/src/lib/guidedPathLabels.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-segment-reviews.ts`
- `frontend/scripts/test-guided-cross-vibe.ts`
- `frontend/scripts/test-guided-path-directory.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_A1P8_IMPLEMENTATION_REPORT_2026_05_15.md`

## Path Added

- `english-a1-practical-8`

## Lesson Titles Added

1. I have a reservation
2. I need a room
3. Where is my room?
4. I need the key
5. Is there Wi-Fi?
6. Where is the bathroom?
7. I need a towel
8. I want to sleep
9. What time is breakfast?
10. I am checking out

## Implementation Status

- P8 has exactly 10 lessons.
- P8 has active Bright, Wistful, and Sharp variants for every lesson.
- P8 remains German -> English.
- P8 is exposed in the Guided Today path directory.
- P8 uses the existing Guided Today lesson schema and the existing Segment Review logic.

## Exposed Path IDs

- `english-a1-practical-1`
- `english-a1-practical-2`
- `english-a1-practical-3`
- `english-a1-practical-4`
- `english-a1-practical-5`
- `english-a1-practical-6`
- `english-a1-practical-7`
- `english-a1-practical-8`

## Segment Stories Added

- `english-a1-practical-8:1`
- `english-a1-practical-8:2`

## Scope Confirmations

- P1-P7 content was untouched.
- No global Sharp rewrite was done.
- No trophy song/client code was changed.
- No backend, Supabase, generation provider, deck, word, credit, category practice, language expansion, or A2 files were changed.

## Tests And Checks Run

- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-segment-reviews.ts`
- `npx tsx scripts/test-guided-cross-vibe.ts`
- `npx tsx scripts/test-guided-path-directory.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npm run test:guided-today`
- `npm run check:i18n`
- `npm run build`
- `git diff --check`
- `git diff --cached --check`

## Remaining Gaps

- No authenticated browser QA was run in this pass.
- Cross-vibe distinctness reports warning-level similarities only; no hard failures or trophy collisions were found.
- P9 and P10 are not implemented.

## Recommended Next Step

Implement and expose P9.
