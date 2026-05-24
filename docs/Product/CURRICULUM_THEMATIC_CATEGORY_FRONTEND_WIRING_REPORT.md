# Curriculum Thematic Category Frontend Wiring Report

## Summary

The Curriculum / Categories page now renders both category systems:

- legacy curated curriculum cards from `frontend/src/data/curriculumCategories.ts`
- public thematic static vocabulary packs from `frontend/src/data/categories.ts`

The old cards remain visible and keep their existing detail routes, imported badges, cover-image behavior, and curriculum deck flow. The new thematic cards appear below them in a dedicated section grouped by the existing static category groups.

## Source Mismatch Discovered

The page titled "Kategorien" is rendered by:

- `frontend/src/pages/categories/CategoryListPage.tsx`

Before this task, it only called:

- `listCurriculumCategories()` from `frontend/src/data/curriculumCategories.ts`

The Generate category picker is rendered through:

- `/generate`
- `GenerateGO` for glassy mode
- `Generate` / `GeneratePG` for classic mode
- shared `WordsStep`
- shared `CategoryPicker`

The Generate picker reads:

- `getPublicCategoryGroups()` from `frontend/src/data/categories.ts`

So the issue was a real frontend data-source split, not deployment cache. The thematic packs were wired into Generate only.

## Implementation

`CategoryListPage` now builds a second display model from `getPublicCategoryGroups()`, filtering to categories with `staticWordLevels`.

The legacy section is labelled as curated curriculum and still renders:

- Family & Relationships
- Numbers & Time
- Nouns / Substantive
- Adjectives
- Verbs

The thematic section renders the 19 static packs:

- Animals
- Fruits
- Vegetables
- Food & Drinks
- Nuts & Seeds
- Home & Objects
- Nature & Weather
- Places & Buildings
- Transport & Travel
- Body & Health
- Clothing & Appearance
- Jobs & People
- Sports & Hobbies
- Music & Instruments
- Technology & Media
- Arts & Entertainment
- Money, Shopping & Services
- Feelings & States
- Education & Learning

Thematic cards are grouped by:

- Living World
- Food & Kitchen
- Everyday Life
- World & Travel
- People & Society
- Culture & Leisure
- Modern Life

## Placeholder Images

Thematic packs do not require category cover images. Each card uses a deterministic gradient fallback based on the category id/name plus the category emoji. There is no image request, no broken image state, and no dependency on image set A/C assets.

Existing curriculum image fallback behavior remains unchanged for the legacy cards.

## Card Action

Each thematic card links to:

`/generate?category=<category_id>`

`WordsStep` now reads the `category` and optional `level` query params and passes them to `CategoryPicker`. `CategoryPicker` opens the drawer with the requested thematic category selected once the Words step is reached. This is the minimum useful integration; a full category detail/preview page for thematic packs is deferred.

## Language Handling

The Categories page uses UI locale translations for section labels, group labels, and category labels. Vocabulary target/helper language selection remains in the Generate picker, where it already separates UI locale from target vocabulary language and helper translation language.

No word preview was added on the Categories page in this pass, so no additional vocabulary language state was introduced there.

## Tests And Checks

Passed:

- `npm exec -- tsx scripts/test-curriculum-category-display.ts`
- `npm run test:generate-category-picker-flow`
- `npm run test:lane-payload`
- `npm exec -- tsx scripts/test-generate-i18n-ui-cleanup.ts`
- `npm run test:static-category-translations`
- targeted ESLint on changed TypeScript/TSX files
- `git diff --check -- <changed files>`

Local route smoke:

- `http://127.0.0.1:5181/categories` returned HTTP 200 from the local Vite dev server.

Blocked:

- `npm run typecheck` is still blocked by the existing unrelated untracked `frontend/src/components/today/trophy/TrophyStudyModal.tsx` errors:
  - missing `createGuidedTrophyStudyRecord`
  - missing `GuidedTrophyStudyItem`
  - stale `lessonId` property on `GuidedTrophyClozeItem`

That file was not touched or staged for this task.

## Scope Confirmation

No Supabase schema, backend provider, paid API, credits, image generation, storage/media, generated deck, card/video rendering, or user-content changes were made.
