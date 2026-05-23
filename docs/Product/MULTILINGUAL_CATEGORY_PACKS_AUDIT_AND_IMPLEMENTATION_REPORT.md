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

## Target Vocabulary Language Selection

The generate category picker now includes a target vocabulary language selector for the static vocabulary language set. It defaults to:

1. `state.language` when already selected in the generate wizard.
2. `activeLanguage` from the existing language context.
3. English.

Changing this selector updates the wizard target language through `PRESELECT_LANGUAGE`. Category labels still use UI i18n; only vocabulary chips are translated by the selected target vocabulary language.

Static category words are resolved locally and do not call `/api/suggest-words`. API-backed legacy/generic categories still call `/api/suggest-words` with the selected target language.

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
- `frontend/src/components/generate/steps/CategoryPicker.tsx`
- `frontend/src/components/generate/steps/WordsStep.tsx`
- `frontend/src/lib/translations.ts`
- `frontend/scripts/test-generate-category-picker-flow.ts`
- `frontend/scripts/test-generate-i18n-ui-cleanup.ts`
- `frontend/scripts/test-static-category-translations.ts`
- `frontend/package.json`
- `docs/Product/MULTILINGUAL_CATEGORY_PACKS_AUDIT_AND_IMPLEMENTATION_REPORT.md`

## Validation

Checks run during implementation:

- `npm run test:generate-category-picker-flow`
- `npm exec -- tsx scripts/test-generate-i18n-ui-cleanup.ts`
- `npm run test:static-category-translations`
- targeted ESLint for changed frontend/data/test files
- `git diff --check -- <changed files>`

Full typecheck was attempted with `npm run typecheck` and is blocked by unrelated existing errors in:

- `frontend/src/components/today/trophy/TrophyStudyModal.tsx`

The error surface is missing/renamed guided trophy exports and a stale `lessonId` field. This file was not touched by this task.

## Scope Confirmation

No Supabase schema, backend provider, paid API, credits, image generation, storage/media, card rendering, video generation, generated user decks, or user content was changed.
