# Guided Today A1 Practical 9 Implementation Report

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
- `docs/Product/GUIDED_TODAY_A1P9_IMPLEMENTATION_REPORT_2026_05_15.md`

## Path added

- `english-a1-practical-9`

## Lesson titles added

1. Nice to meet you
2. Are you free today?
3. Can we meet later?
4. What time works for you?
5. Let's meet here
6. I am waiting outside
7. I am running late
8. Can we change the plan?
9. See you tomorrow
10. Have a good evening

## Implementation status

- P9 has exactly 10 lessons.
- P9 has active Bright, Wistful, and Sharp variants for every lesson.
- P9 remains German to English.
- P9 is exposed in the Guided Today path directory.
- Added segment story scaffolds:
  - `english-a1-practical-9:1`
  - `english-a1-practical-9:2`
- P1-P8 content was untouched.
- No global Sharp rewrite was done.
- No trophy song/client code, backend, Supabase, category practice, language expansion, or A2 changes were made.

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

## Tests and checks run

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

- Browser QA was not performed in an authenticated local session.
- P10 remains unimplemented and unexposed.
- Sharp may still need a future broader design pass, but this change did not rewrite Sharp globally.

## Recommended next step

Implement and expose P10 after P9 is accepted.
