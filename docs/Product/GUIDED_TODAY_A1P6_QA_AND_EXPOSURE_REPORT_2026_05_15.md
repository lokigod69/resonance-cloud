# Guided Today A1P6 QA and Exposure Report - 2026-05-15

## Files Changed

- `frontend/src/components/today/GuidedPathDirectory.tsx`
- `frontend/src/lib/guidedPathLabels.ts`
- `frontend/scripts/test-guided-path-directory.ts`
- `docs/Product/GUIDED_TODAY_A1P6_QA_AND_EXPOSURE_REPORT_2026_05_15.md`

## P6 Content Review

- No P6 lesson content was changed in this pass.
- P6 still has exactly 10 lessons.
- Every P6 lesson still has `bright`, `wistful`, and `sharp` variants.
- P6 remains German -> English.
- Existing P6 data checks confirm the health/pharmacy copy avoids diagnosis, dosage advice, treatment instructions, medical claims, and emergency overreach.
- Existing trophy word checks confirm P6 trophy words are practical and distinct per active vibe.
- Segment Review story scaffolds exist for:
  - `english-a1-practical-6:1`
  - `english-a1-practical-6:2`

## Exposure

P6 was exposed in the Guided Today path directory.

Exact exposed path ids:

1. `english-a1-practical-1`
2. `english-a1-practical-2`
3. `english-a1-practical-3`
4. `english-a1-practical-4`
5. `english-a1-practical-5`
6. `english-a1-practical-6`

## Untouched Areas

- P1-P5 lesson content was untouched.
- No global Sharp rewrite was done.
- Trophy song/client code was untouched.
- Backend, Supabase, generation providers, decks, words, credits, category practice, language expansion, A2, and global theme were untouched.

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

- No authenticated browser QA was run in this pass.
- P7-P10 remain planning-only and are not implemented or exposed.
