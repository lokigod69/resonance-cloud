# Numbers & Time Frontend Materialization Report

## Source

- Production source folder: `D:\CODING\ResonanceTEST\curriculum\production_renders\en\NUMBERS_TIME_ENVIRONMENTAL_WORD_DESIGN_OPENAI_HIGH_2026_05_24_061510`
- Frontend repo: `D:\CODING\ResonanceTEST\orchestrator`
- Category slug: `zahlen_zeit`

## Frontend Paths Updated

- `frontend/public/curriculum/categories/en/zahlen_zeit/entries/*.webp`
- `frontend/public/curriculum/en/set-a/*.webp`
- `frontend/public/curriculum/en/set-c/*.webp`
- `frontend/public/curriculum/en/manifests/set-a.json`
- `frontend/public/curriculum/en/manifests/set-c.json`
- `frontend/public/curriculum/en/manifests/set-ac-index.json`
- `frontend/src/data/curriculumImageSetAvailability.ts`
- `frontend/src/data/curriculumEntryImageManifest.ts`

## Counts

- Category-entry images wired: 69
- Set A Numbers & Time assets: 69
- Set C Numbers & Time assets: 69
- Final Set A available count: 391
- Final Set C available count: 365

Both Set A and Set C include the materialized Numbers & Time assets. The old pre-materialization counts, Set A 322 and Set C 296, are no longer present in `set-ac-index.json`.

## Active Frontend Wiring

- Category fallback image paths resolve under `/curriculum/categories/en/zahlen_zeit/entries/`.
- Admin-selected Set A resolves Numbers & Time terms under `/curriculum/en/set-a/`.
- Admin-selected Set C resolves Numbers & Time terms under `/curriculum/en/set-c/` without falling back to Set A for representative terms.
- Apostrophe terms were normalized to match the active frontend resolver: `one o'clock` -> `one_oclock` / `one-oclock`, `two o'clock` -> `two_oclock` / `two-oclock`.
- No learner-facing A/C toggle was introduced.
- Admin image-set selection remains the switching path through `useActiveCurriculumImageSet`.
- Continue Learning still creates/reuses canonical curriculum decks through `curriculumDeckBridge`; image-set choice is not part of deck identity.

## Checks Run

- `git status --short`
- `npm run build`
- `npx tsx src/lib/curriculumImageSets.test.ts`
- `npx tsx src/lib/curriculumImagePath.test.ts`
- `npx tsx scripts/test-curriculum-category-display.ts`
- JSON parse check for `set-a.json`, `set-c.json`, `set-ac-index.json`
- Verified 69 category WebPs under `frontend/public/curriculum/categories/en/zahlen_zeit/entries`
- Verified corresponding 69 Set A and 69 Set C WebPs exist
- Verified representative and row-derived WebPs are `840x472`
- Verified active Set A and Set C resolver output for representative Numbers & Time terms
- `git diff --check`

## Unrelated Failures

- `npm run build` fails before Vite build during TypeScript compilation on the existing unrelated guided trophy issue in `frontend/src/components/today/trophy/TrophyStudyModal.tsx`.
- `npx tsx scripts/test-curriculum-category-display.ts` fails on an existing unrelated thematic static level preview assertion in `frontend/scripts/test-curriculum-category-display.ts`.

No OpenAI/provider calls, image regeneration, Supabase schema changes, deck import changes, deck identity changes, generation job changes, CardWorker changes, submit generation changes, request retry changes, or credits/pricing changes were made.
