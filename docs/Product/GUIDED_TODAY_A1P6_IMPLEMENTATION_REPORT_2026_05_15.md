# Guided Today A1P6 Implementation Report - 2026-05-15

## Files Changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/guidedSegmentStories.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-segment-reviews.ts`
- `frontend/scripts/test-guided-cross-vibe.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_A1P6_IMPLEMENTATION_REPORT_2026_05_15.md`

## Path Added

- `english-a1-practical-6`

## Lesson Titles Added

1. `I don't feel well`
2. `A pharmacy nearby?`
3. `I need medicine`
4. `It hurts here`
5. `I have a headache`
6. `I need water`
7. `Is there a doctor?`
8. `I have an allergy`
9. `Can you call for help?`
10. `I feel better now`

## Implementation Status

- P6 has exactly 10 lessons.
- P6 has active `bright`, `wistful`, and `sharp` variants for every lesson.
- P6 remains German -> English.
- P6 keeps A1 practical health/pharmacy language short and concrete.
- P6 avoids diagnosis, dosage, treatment instructions, medical claims, and emergency overreach.
- P6 is not exposed in the path directory. `GuidedPathDirectory.tsx` still exposes only P1-P5.
- P6 is included in the implemented path data/options so data, overview, and Segment Review tests can validate it before directory exposure.

## Segment Stories Added

- `english-a1-practical-6:1`
- `english-a1-practical-6:2`

Segment 1 covers lessons 1-5: feeling unwell, finding a pharmacy, asking generally for medicine, saying where it hurts, and stating a headache.

Segment 2 covers lessons 6-10: asking for water, asking about a doctor nearby, mentioning an allergy, asking someone to call for help, and closing with feeling better.

## Untouched Areas

- P1-P5 lesson content was not changed.
- No global Sharp rewrite was done.
- Trophy song/client code was not changed.
- Backend, Supabase, generation providers, category practice, language expansion, A2, decks, words, credits, and global theme were not changed.

## Tests and Checks Run

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

- P6 content still needs product review before path-directory exposure.
- P6 remains hidden from the path directory until separate exposure approval.
- No authenticated browser QA was run in this pass.

## Recommended Next Step

Review P6 content, then expose `english-a1-practical-6` in the path directory if accepted.
