# Guided Today A1 Practical 10 Implementation Report

Date: 2026-05-15

## Files changed

- `frontend/src/data/guidedLessons.ts`
- `frontend/src/lib/guidedSegmentStories.ts`
- `frontend/src/components/today/GuidedPathDirectory.tsx`
- `frontend/src/lib/guidedPathLabels.ts`
- `frontend/scripts/test-guided-today-data.ts`
- `frontend/scripts/test-guided-segment-reviews.ts`
- `frontend/scripts/test-guided-cross-vibe.ts`
- `frontend/scripts/test-guided-path-directory.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_A1P10_IMPLEMENTATION_REPORT_2026_05_15.md`

## Path added

- `english-a1-practical-10`

## Lesson titles added

1. Today was good
2. I liked this place
3. Thank you for your help
4. I learned a lot
5. I am tired now
6. I need to go
7. See you next time
8. Tomorrow works for me
9. Have a good night
10. Goodbye for now

## Data status

- P10 has exactly 10 lessons.
- P10 has active Bright, Wistful, and Sharp variants for every lesson.
- P10 remains German -> English.
- P10 uses the same Guided Today lesson data shape as P1-P9.
- P10 content stays A1 practical: short wrap-up, thanks, tiredness, tomorrow, night, and goodbye language.
- P10 was exposed in the Guided Today path directory.

## Exposed path ids

- `english-a1-practical-1`
- `english-a1-practical-2`
- `english-a1-practical-3`
- `english-a1-practical-4`
- `english-a1-practical-5`
- `english-a1-practical-6`
- `english-a1-practical-7`
- `english-a1-practical-8`
- `english-a1-practical-9`
- `english-a1-practical-10`

## Segment stories

Added story scaffold entries:

- `english-a1-practical-10:1`
- `english-a1-practical-10:2`

Segment 1 covers lessons 1-5: saying the day was good, liking the place, thanking someone, saying learning happened, and saying tiredness.

Segment 2 covers lessons 6-10: leaving, next time, tomorrow, good night, and goodbye for now.

## Non-goals preserved

- P1-P9 content was untouched.
- No global Sharp rewrite was done.
- Trophy song/client code was untouched.
- Backend, Supabase, generation providers, decks, words, credits, category practice, language expansion, A2, and global theme were untouched.
- Segment Review UI was not redesigned.

## Tests/checks run

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

## Remaining gaps

- Browser QA was not part of this implementation pass.
- Cross-vibe distinctness still reports historical warnings in older paths, but P10 adds no hard failures and no trophy collisions.
- Recommended next step: run one A1P1-P10 consolidation QA pass.
