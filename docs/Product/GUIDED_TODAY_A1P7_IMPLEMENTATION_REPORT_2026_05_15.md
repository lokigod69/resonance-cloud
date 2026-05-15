# Guided Today A1P7 Implementation Report - 2026-05-15

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
- `docs/Product/GUIDED_TODAY_A1P7_IMPLEMENTATION_REPORT_2026_05_15.md`

## Path Added

- `english-a1-practical-7`

## Lesson Titles Added

1. I need a ticket
2. Where is the bus?
3. What time does it leave?
4. Is this the right train?
5. I need a taxi
6. Can we go there?
7. Please stop here
8. I am going to the station
9. How long does it take?
10. I have arrived

## Content Status

- P7 has exactly 10 lessons.
- P7 has active Bright, Wistful, and Sharp variants for every lesson.
- P7 remains German -> English.
- P7 is exposed in the Guided Today path directory.
- P1-P6 content was untouched.
- No global Sharp rewrite was done.
- No trophy song/client, backend, Supabase, category practice, language expansion, A2, decks, words, credits, generation provider, or global theme changes were made.

## Exposed Path Ids

- `english-a1-practical-1`
- `english-a1-practical-2`
- `english-a1-practical-3`
- `english-a1-practical-4`
- `english-a1-practical-5`
- `english-a1-practical-6`
- `english-a1-practical-7`

## Segment Stories Added

- `english-a1-practical-7:1`
- `english-a1-practical-7:2`

## Tests and Checks Run

- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-segment-reviews.ts`
- `npx tsx scripts/test-guided-cross-vibe.ts`
- `npx tsx scripts/test-guided-path-directory.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npm run test:guided-today`
- `npm run check:i18n`
- `npm run build`

Notes:
- `test-guided-cross-vibe` passed with warnings below the hard-fail threshold, including P7 lesson 4, 6, and 8 Bright/Wistful similarity warnings.
- `check:i18n` passed with existing warn-only French gaps.
- `build` passed with existing chunk size and dynamic import warnings.

## Remaining Gaps

- Authenticated browser QA was not performed in this pass.
- P7 content is implemented and exposed, but still benefits from product review before deeper expansion.
- P8 is not implemented.

## Recommended Next Step

Implement and expose P8.
