# Guided Today P4/P5 Directory Exposure Report - 2026-05-15

## Files Changed

- `frontend/src/components/today/GuidedPathDirectory.tsx`
- `frontend/scripts/test-guided-path-directory.ts`
- `docs/Product/GUIDED_TODAY_P4_P5_DIRECTORY_EXPOSURE_REPORT_2026_05_15.md`

## Path IDs Now Exposed

- `english-a1-practical-1`
- `english-a1-practical-2`
- `english-a1-practical-3`
- `english-a1-practical-4`
- `english-a1-practical-5`

No A1P6, A2, category-practice, or language-expansion paths were exposed.

## Lesson Data Status

P4 and P5 were already present in `frontend/src/data/guidedLessons.ts`.
The directory exposure change did not modify lesson data.

Each exposed path resolves to 10 lessons:

- `english-a1-practical-1`: 10 lessons
- `english-a1-practical-2`: 10 lessons
- `english-a1-practical-3`: 10 lessons
- `english-a1-practical-4`: 10 lessons
- `english-a1-practical-5`: 10 lessons

## Content Preservation

Lesson content was untouched.
Bright content was untouched.
Wistful content was untouched.
Sharp content was untouched.
Trophy words and trophy song/client code were untouched.

## Segment Review, Path Check, and Quick Review

`frontend/scripts/test-guided-path-directory.ts` now fails if the directory stops exposing exactly A1 Practical 1-5.
It also validates, for each exposed path, that:

- the path overview loads 10 lessons,
- Path Check samples only the selected path,
- Segment Review 1 has five lessons for lessons 1-5,
- Segment Review 2 has five lessons for lessons 6-10,
- Segment Review plans sample only the selected path.

Quick Review behavior remains completion-gated and unavailable with no completed path.

## Tests and Checks Run

- `npx tsx scripts/test-guided-path-directory.ts` before implementation: failed as expected because only P1-P3 were exposed.
- `npx tsx scripts/test-guided-path-directory.ts`: passed, 66 passed, 0 failed.
- `npx tsx scripts/test-guided-today-data.ts`: passed, 4510 passed, 0 failed.
- `npx tsx scripts/test-guided-today-path-overview.ts`: passed, 141 passed, 0 failed.
- `npx tsx scripts/test-guided-segment-reviews.ts`: passed, 236 passed, 0 failed.
- `npx tsx scripts/test-guided-cross-vibe.ts`: passed with exit 0; reported 0 hard fails, 3 warnings, 2 allowlist hits, 0 trophy collisions.
- `npm run test:guided-today`: passed with exit 0.
- `npm run check:i18n`: passed with exit 0; French missing keys remain warn-only and out of scope.
- `npm run build`: passed with exit 0; Vite reported existing dynamic-import and chunk-size warnings.
- `git diff --check`: passed.
- `git diff --cached --check`: passed.

## Manual QA

Local dev server was started at `http://127.0.0.1:5178`.
Opening `/today` in the in-app browser redirected to the sign-in screen.
No local auth bypass was found in the scoped frontend search, so authenticated manual route QA was not completed.

## Remaining Gaps

- Authenticated browser QA for selecting P4 and P5 from `/today` remains blocked without local credentials or an approved auth bypass.
- Existing cross-vibe warnings are non-blocking and unrelated to this directory exposure.
- Existing unrelated local worktree changes were left untouched.
