# Multilingual Category Packs Audit And Implementation Report

Date: 2026-05-24

## Summary

Implemented a concept-based multilingual static vocabulary layer for the public thematic generate category packs. The existing English category packs remain the canonical ordering source, and each static vocabulary item now resolves to a stable concept id plus translated terms for the initial Latin-script target languages.

## Current Category Architecture Discovered

The generate category source is `frontend/src/data/categories.ts`.

Public category groups currently exposed by `getPublicCategoryGroups()`:

- Essentials: Greetings & Introductions, Food & Dining, Travel & Directions, Family & Relationships, Numbers & Time
- Living World: Animals, Fruits, Vegetables
- Food & Kitchen: Food & Drinks, Nuts & Seeds
- Everyday Life: Home & Objects, Body & Health, Clothing & Appearance
- World & Travel: Nature & Weather, Places & Buildings, Transport & Travel
- People & Society: Jobs & People, Feelings & States, Education & Learning
- Culture & Leisure: Sports & Hobbies, Music & Instruments, Arts & Entertainment
- Modern Life: Technology & Media, Money, Shopping & Services
- Language Building: Verbs (Actions), Adjectives (Descriptions), Idioms & Expressions
- Real Talk, Cultural, Fun & Unique, and Practical legacy/API-backed groups remain public.

Generic Nouns / Things remains in source data with `public: false`, so it is frozen/legacy and hidden from the public picker. Generic Verbs and Adjectives remain public for now and continue to be API-backed; they do not block thematic category completeness.

Family & Relationships already exists as a non-static public category in Essentials. It was not recreated or moved in this pass.

## Static Thematic Packs Verified

Static public thematic packs verified:

- Animals: 100 items, 10 levels, noun
- Fruits: 100 items, 10 levels, noun
- Vegetables: 100 items, 10 levels, noun
- Food & Drinks: 100 items, 10 levels, noun
- Nuts & Seeds: 50 items, 5 levels, noun
- Home & Objects: 100 items, 10 levels, noun
- Body & Health: 100 items, 10 levels, noun/adjective
- Clothing & Appearance: 100 items, 10 levels, noun/adjective
- Nature & Weather: 100 items, 10 levels, noun
- Places & Buildings: 100 items, 10 levels, noun
- Transport & Travel: 100 items, 10 levels, noun
- Jobs & People: 100 items, 10 levels, noun
- Feelings & States: 100 items, 10 levels, adjective/noun/verb
- Education & Learning: 100 items, 10 levels, noun/verb
- Sports & Hobbies: 100 items, 10 levels, noun
- Music & Instruments: 100 items, 10 levels, noun
- Arts & Entertainment: 100 items, 10 levels, noun
- Technology & Media: 100 items, 10 levels, noun
- Money, Shopping & Services: 100 items, 10 levels, adjective/noun/verb

Total static concept items: 1,850.

Education & Learning was already present before the multilingual migration started in this goal. It was audited and included in the multilingual model.

## Target Languages

Initial Latin-script static vocabulary target languages:

- `en`: English
- `de`: German
- `fr`: French
- `es`: Spanish
- `pt`: Portuguese
- `it`: Italian
- `pl`: Polish
- `id`: Indonesian
- `ceb`: Bisaya / Cebuano

No Korean, Japanese, Chinese, Arabic, Thai, Cyrillic-script, or other script-heavy language packs were added.

## Data Model Chosen

The model is concept-based and additive:

- Existing category metadata and level arrays remain the source of category order.
- `getStaticCategoryVocabularyItems()` resolves each entry into a concept item with:
  - stable `id`
  - `categoryId`
  - `level`
  - `order`
  - `part_of_speech`
  - `sense`
  - `translations`
- `getStaticCategoryWords()` remains backward compatible for English and now accepts a target vocabulary language.
- Translations live in `frontend/src/data/staticCategoryTranslations.ts`, keyed by concept id.

Stable concept ids are generated from category id plus an English concept slug, for example:

- `animals.dog`
- `fruits.apple`
- `body_health.sore_throat`
- `money_shopping_services.bank_account`
- `education_learning.critical_thinking`

Future images, prompts, enrichment, audio, and review metadata should attach to these concept ids, not to raw English strings.

English is the canonical internal base language for this pass. Existing English category words are the source terms for stable slugs and concept ids; translated terms never become concept ids.

## Target Vocabulary Language Selection

The generate category picker now includes a target vocabulary language selector for the static vocabulary language set. It defaults to:

1. `state.language` when already selected in the generate wizard.
2. `activeLanguage` from the existing language context.
3. English.

Changing this selector updates the wizard target language through `PRESELECT_LANGUAGE`. Category labels still use UI i18n; only vocabulary chips are translated by the selected target vocabulary language.

Static category words are resolved locally and do not call `/api/suggest-words`. API-backed legacy/generic categories still call `/api/suggest-words` with the selected target language.

## Helper Translation Language Selection

The generate category picker now separates three concepts:

- UI locale: still controls interface text and category labels through the existing translation system.
- Target vocabulary language: controls the primary vocabulary term added to chips and sent as the deck/job target language.
- Helper translation language: controls the secondary support term shown beside the chip term.

The selector appears in `frontend/src/components/generate/steps/CategoryPicker.tsx`, inside the expanded category drawer directly above level selection. It exposes the same complete vocabulary language set as the target selector: English, German, French, Spanish, Portuguese, Italian, Polish, Indonesian, and Bisaya / Cebuano.

Target vocabulary language defaults to the wizard/stored target language when available, then active language context, then English. Helper translation language defaults to the user's stored `profile.base_language` when it is one of the static vocabulary languages; otherwise it falls back to German for the required English/German verification path.

If target and helper resolve to the same term, chips render one term. Otherwise chips render bilingual text in the form `target / helper`, for example `table / Tisch` or `Tisch / table`.

Selected static category entries now carry concept metadata through the frontend state and payload:

- `conceptId` / `itemId`
- `categoryId`
- `level`
- `order`
- `part_of_speech`
- `sense`
- `targetLanguage`
- `targetTerm`
- `helperLanguage`
- `helperTerm`
- `translations`

The existing generation API boundary still receives `wordList` as target-language strings for compatibility. The concept metadata is added to `generation_jobs.settings_override.category_vocabulary_items` by the frontend payload builder and by the glassy generate page's local submit path. No backend schema or provider code was changed.

## Translation Coverage

Every static concept item has non-empty translation objects for all target languages:

- 1,850 English terms
- 1,850 German terms
- 1,850 French terms
- 1,850 Spanish terms
- 1,850 Portuguese terms
- 1,850 Italian terms
- 1,850 Polish terms
- 1,850 Indonesian terms
- 1,850 Bisaya / Cebuano terms

Some translations were generated through an unpaid local one-off translation script and should receive human review before being treated as final editorial copy. The schema supports `needsReview`, currently used for unchanged Cebuano/Bisaya outputs.

Items marked `needsReview`: 627 translation entries.

## Duplicate Findings

The validation allows duplicates across different categories because thematic ownership and sense can differ. It also reports exact duplicate translated terms within the same category/language for review. Current scan found 424 within-category/language duplicate translated terms, mostly caused by natural synonym collapse or broad machine translations, for example:

- Animals: mouse/rat collapse in several languages.
- Fruits: tangerine/mandarin and lemon/citron collapse in several languages.
- Vegetables: pumpkin/squash variants collapse in several languages.
- Places & Buildings: port/harbor and city hall/town hall collapse.
- Feelings & States: related emotion terms collapse in several languages.
- Education & Learning: primary school/elementary school collapse in several languages.

No canonical thematic words were removed because of these duplicates. Final chip/output dedupe still operates by normalized displayed term when multiple sources are merged.

## Files Changed

- `frontend/src/data/categories.ts`
- `frontend/src/data/staticCategoryTranslations.ts`
- `frontend/src/components/generate/shared/GlassInput.tsx`
- `frontend/src/components/generate/steps/CategoryPicker.tsx`
- `frontend/src/components/generate/steps/WordsStep.tsx`
- `frontend/src/components/generate/useWizardState.ts`
- `frontend/src/lib/translations.ts`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/scripts/test-generate-category-picker-flow.ts`
- `frontend/scripts/test-product-lane-payload.ts`
- `frontend/scripts/test-generate-i18n-ui-cleanup.ts`
- `frontend/scripts/test-static-category-translations.ts`
- `frontend/package.json`
- `docs/Product/MULTILINGUAL_CATEGORY_PACKS_AUDIT_AND_IMPLEMENTATION_REPORT.md`

## Validation

Checks run during implementation:

- `npm run test:generate-category-picker-flow`
- `npm run test:lane-payload`
- `npm exec -- tsx scripts/test-generate-i18n-ui-cleanup.ts`
- `npm run test:static-category-translations`
- targeted ESLint for changed frontend/data/test files
- `git diff --check -- <changed files>`
- Vite dev server smoke on `http://127.0.0.1:5178/` returned HTTP 200

English/German bilingual behavior was verified by static flow tests:

- Home & Objects, Level 1, target English + helper German: `chair / Stuhl`, `table / Tisch`, `bed / Bett`
- Home & Objects, Level 1, target German + helper English: `Stuhl / chair`, `Tisch / table`, `Bett / bed`
- Home & Objects, Level 1, target English + helper English: `chair`, `table`, `bed`

Full typecheck was attempted with `npm run typecheck` and is blocked by unrelated existing errors in:

- `frontend/src/components/today/trophy/TrophyStudyModal.tsx`

The error surface is missing/renamed guided trophy exports and a stale `lessonId` field. This file was not touched by this task.

## Scope Confirmation

No Supabase schema, backend provider, paid API, credits, image generation, storage/media, card rendering, video generation, generated user decks, or user content was changed.

## Frontend Visibility, Korean Extension, And QA Follow-Up

### Main And Deployment State

Local `main` and `origin/main` both pointed to `3d859a0d734f72d4eccf27ad013e06e0b371d64d` before this follow-up. That history contains both expected multilingual category commits:

- `2710df9` / `feat: add multilingual static vocabulary category packs`
- `2c3f21b5ba48573326683590089f1119cbeae6a1` / `feat: add bilingual category vocabulary selection`

Production `https://resonanz.pro` is served by Vercel and was Ready when checked. `vercel inspect https://resonanz.pro` returned deployment `frontend-h6h8dgh04-lokigod69s-projects.vercel.app`, created May 24, 2026 06:57 PST. The deployed asset already contained the previous multilingual Generate selector strings and static concept ids, but it did not contain this follow-up's new Categories-page Generate CTA or Korean Home & Objects terms before this commit was pushed.

Post-push deployment verification: Vercel built `frontend-3tm6qjoqp-lokigod69s-projects.vercel.app` and marked it Ready. The live `https://resonanz.pro` asset changed to `assets/index-C47-geU_.js` and contains the Korean Home & Objects term `의자`, the Categories-page CTA text `Generate from thematic categories`, and the selector label `Bisaya / Cebuano (review)`.

### User-Visible Wiring

The multilingual category picker remains wired into the Generate flow:

- `/generate` renders `GenerateGO` for the glassy skin and `Generate` / `GeneratePG` for the classic skin.
- Both Generate skins render `WordsStep`.
- `WordsStep` renders `CategoryPicker`.
- `CategoryPicker` reads the public static thematic packs from `frontend/src/data/categories.ts`.

The target vocabulary language selector and helper translation language selector now appear immediately when the category drawer opens, before a category tile is selected. Previously they were visible only after selecting a category, which made the feature easy to miss.

The separate `/categories` page still uses `frontend/src/data/curriculumCategories.ts`, not the Generate static category packs. This is intentionally a curriculum browser today. To make the new thematic Generate picker discoverable from that page without rewriting the curriculum browser, `/categories` now includes a visible "Generate from thematic categories" link to `/generate`.

The Generate route and Categories route are protected routes, so unauthenticated local Chrome smoke testing redirects to `/login`. Source-level wiring tests and payload tests verify the actual Generate picker behavior. A local Vite server at `http://127.0.0.1:5178/generate` returned HTTP 200 before auth routing redirected the headless browser.

### Korean Extension

Korean was added as a target vocabulary language:

- code: `ko`
- value: `Korean`
- selector label: `한국어`

Korean terms attach to the existing stable concept ids inside the same multilingual concept pack model. No separate Korean category packs were created. Korean primary terms use Hangul, not romanization.

The Korean entries were generated in a local unpaid translation pass and every Korean translation is marked `needsReview: true`. Romanization was not added in this pass to keep the schema change minimal; the existing translation object remains `term` plus optional `needsReview`.

Verified Home & Objects examples:

- target Korean + helper English: `의자 / chair`, `테이블 / table`, `침대 / bed`
- target English + helper Korean: `chair / 의자`, `table / 테이블`, `bed / 침대`

### Language Exposure And Review Flags

The selector exposes:

- English (`en`)
- German (`de`)
- French (`fr`)
- Spanish (`es`)
- Portuguese (`pt`)
- Italian (`it`)
- Polish (`pl`)
- Indonesian (`id`)
- Bisaya / Cebuano (`ceb`)
- Korean (`ko`)

Cebuano remains exposed but its selector label now reads `Bisaya / Cebuano (review)` because the current data still has many review-needed entries. Korean is also exposed because coverage is complete and validation enforces non-empty terms, but all Korean terms are marked review-needed pending human review.

Current translation coverage and review counts:

- Total public static categories: 19
- Total concept items: 1,850
- Missing exposed-language terms: 0 for every exposed language
- `needsReview`: Cebuano 627, Korean 1,850, all other exposed languages 0

Current duplicate scan:

- Within-category/language duplicate groups: 425
- Duplicate item memberships across those groups: 880
- These duplicates are review findings, not blocker errors, because some are natural sense/translation collapses.

Top duplicate examples from the current scan:

- `animals` / Portuguese: `rato` for `animals.mouse`, `animals.rat`
- `animals` / Indonesian: `tikus` for `animals.mouse`, `animals.rat`
- `animals` / Indonesian: `buaya` for `animals.crocodile`, `animals.alligator`
- `animals` / Indonesian: `berang-berang` for `animals.otter`, `animals.beaver`
- `animals` / Indonesian: `musang` for `animals.weasel`, `animals.ferret`
- `animals` / Indonesian: `trenggiling` for `animals.anteater`, `animals.pangolin`
- `animals` / Cebuano: `ilaga` for `animals.mouse`, `animals.rat`
- `animals` / Cebuano: `alibangbang` for `animals.butterfly`, `animals.dragonfly`
- `animals` / Cebuano: `buaya` for `animals.crocodile`, `animals.alligator`
- `animals` / Korean: `쥐` for `animals.mouse`, `animals.rat`

Canonical thematic entries are still not removed because of legacy/generic category overlap. Dedupe remains at final displayed/output chip level by normalized term.

### Checks Run In Follow-Up

Passed:

- `npm run test:generate-category-picker-flow`
- `npm run test:lane-payload`
- `npm exec -- tsx scripts/test-generate-i18n-ui-cleanup.ts`
- `npm run test:static-category-translations`
- `npm run typecheck`
- targeted ESLint on changed category/frontend/test files

Attempted:

- `npm run build`

Build was blocked by a pre-existing untracked local file: `frontend/src/components/today/trophy/TrophyStudyModal.tsx`. The file imports stale guided trophy exports (`createGuidedTrophyStudyRecord`, `GuidedTrophyStudyItem`) and writes a stale `lessonId` property into `GuidedTrophyClozeItem`. This file was not staged or changed for this category task. A clean tracked tree is expected to avoid this local untracked-file build blocker; `npm run typecheck` passed in this workspace.

### Scope Confirmation

This follow-up changed frontend category data, frontend category visibility, tests, and this report only. No Supabase schema, backend provider, paid API, credits, image generation, storage/media, card rendering, video generation, generated user decks, or user content was changed.
