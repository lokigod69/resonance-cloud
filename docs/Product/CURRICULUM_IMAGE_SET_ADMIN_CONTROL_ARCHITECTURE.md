# Curriculum Image Set — Admin Control — Architecture

Date: 2026-05-21
Repo: orchestrator (lokigod69/resonance-cloud)
Branch: main

## Goal

Replace the learner-facing A/C toggle with an admin-controlled active curriculum image-set selection. Learners never see or pick an image set; they see whichever set the admin has marked active (with a per-category override option).

## Answers to the 9 investigation questions

### 1. Where should the UI live — `/admin/profiles` or a new `/admin/curriculum`?

A new `/admin/curriculum` page.

Rationale: `frontend/src/pages/admin/Profiles.tsx` is already very heavy — it manages language profile settings, stage settings, durations, and a multi-stage configuration UI. Curriculum image-set selection is a distinct concern (which image family learners see), it is not coupled to language_profiles settings, and it should not be buried inside the language-profile editor. A small dedicated admin route keeps surfaces single-purpose and discoverable.

The new route is added to `App.tsx` admin block and linked from `AppHeader.tsx` / `AppSidebar.tsx` admin nav.

### 2. Should we extend `language_profiles` or use a separate table?

Separate tables.

Rationale:
- `language_profiles` is locked down by `phase1h1_protect_language_profiles` triggers requiring audited admin RPCs for every write. That guardrail is appropriate for generation/voice configuration but is overkill for a single image-set selection toggle.
- `language_profiles.settings` is a `jsonb` blob keyed by stage; cramming image-set selection in there would muddle ownership.
- A dedicated table pair (`curriculum_image_sets` registry + `curriculum_image_set_selections` selections) keeps the concept first-class, gives us clean FK constraints and unique partial indexes for "one default per language, one override per (language, category)", and lets RLS use plain `public.is_admin()` instead of the audited-RPC harness — fitting the lower risk of this config (rendering preview only; not deck identity, not generation, not credit).

### 3. How is the active image set resolved?

Resolution order, evaluated client-side after the admin config is loaded:

1. **Category override** — `curriculum_image_set_selections` row with `language_iso = current` AND `category_slug = current_slug` AND `active_set_key` set.
2. **Language default** — `curriculum_image_set_selections` row with `language_iso = current` AND `category_slug IS NULL`.
3. **Set A fallback** — if no rows are loaded (e.g. first install, DB unreachable) and Set A is registered/available, render Set A.
4. **Legacy curriculum image fallback** — the existing `curriculumEntryImagePath(...)` path (`/curriculum/categories/{lang}/{slug}/entries/{normalized}.webp`) and the existing failed-image emoji/placeholder behavior already used by `CurriculumEntryImage.tsx`. This means a clean install with no migration applied still renders today's images.

Per-term resolution then layers the static manifests:

1. If active set has the term (manifest hit) → that asset.
2. Else if Set A has the term → fall back to Set A (intentional cross-set fallback so partial Set C coverage is acceptable).
3. Else legacy placeholder behavior.

### 4. Which frontend components need the active image-set value?

- `frontend/src/pages/categories/CategoryListPage.tsx` — currently only renders a category grid with no per-term images. No image-set value needed at the page level, but the page should still call the active-set loader so it warms a single cache for child routes.
- `frontend/src/pages/categories/CategoryDetailPage.tsx` — renders level cards (no per-term images today). Needs the active set for the per-category override (so navigation context is correct) — implementation reads the active set via the hook so the value is available for any future hero/preview rendering, but does not visibly change anything until the user enters a level.
- `frontend/src/pages/categories/LevelDetailPage.tsx` — renders `CurriculumEntryImage` per term. Needs the active set.
- `frontend/src/components/categories/CurriculumEntryImage.tsx` — accepts the active set (renamed prop from learner-toggle prop to `activeImageSet`) and resolves through the new resolver.
- `frontend/src/components/categories/CurriculumEntryDetailModal.tsx` — same: accepts an active set and resolves the modal hero image through it.

A new `useActiveCurriculumImageSet(languageIso, categorySlug?)` hook in `frontend/src/lib/curriculumImageSetConfig.ts` provides the resolved active set key once for the whole page, caches the Supabase result in a module-scope memo per `(language_iso)`, and returns `{ activeSetKey, isLoaded }`.

### 5. Does Continue Learning / import need to change in this pass?

No.

- Continue Learning reads cards from imported decks; deck card `thumbnail_url` is stamped at import time by `curriculumDeckBridge.ts`. Changing the active image set after import does NOT rewrite existing card media (see Part 6 deck/import audit).
- This pass only changes how the curriculum browsing surfaces (`/categories`, `/categories/:slug`, `/categories/:slug/:level`) render preview images for terms not yet imported. Imported cards remain canonical.
- A future pass could optionally re-resolve a card's preview at study time using a runtime helper, but doing so silently would surprise users who imported a deck under a specific image set. Out of scope here.

### 6. Do deck/study surfaces render stored `thumbnail_url` or do they support runtime curriculum image resolution today?

Stored `thumbnail_url`. `curriculumDeckBridge.ts` computes a curriculum image path via `curriculumImagePathIfKnown(...)` and stores it as `thumbnail_url` on the imported card row. The study/deck UI then reads `thumbnail_url` from the database. No runtime curriculum image lookup happens at study time.

Implication: the admin active-set switch affects browsing only. Existing imported decks keep their original image paths. This is what we want for this pass (no media overwrite).

### 7. What is the safest first implementation that avoids A/C deck duplication?

The shape used in this pass:

- Image sets are a rendering-time choice driven by an admin config, NOT a deck dimension.
- No `image_set_id` column is added to `decks`, `words`, or any deck-identity surface.
- No new "Set A" / "Set C" deck rows are created. There is still exactly one curriculum deck per (user, language, category, level) once imported.
- The admin config table is keyed by `(language_iso, category_slug?)`, not by `deck_id`. Switching the admin selection does not affect any deck row, does not affect any `words.thumbnail_url`, and does not enqueue any provider/generation work.
- Set fallback (active set missing a term → fall back to Set A) is encoded in the resolver, not in the deck.

### 8. What future changes would be needed for Italian/French/culturally specific image sets?

The schema already supports this:

- Insert new `curriculum_image_sets` rows for `language_iso = 'it'`, `'fr'`, etc., pointing at language-specific `public_base_path` / `manifest_path`.
- Insert a default `curriculum_image_set_selections` row per language.
- The frontend resolver is already language-keyed via the `languageIso` argument, so all that is needed is the manifest+assets shipped under `public/curriculum/{iso}/{set}/...`.
- Culturally specific sets (e.g. an Italian-specific Set IT-A) can register under that language only and never appear in the English admin dropdown.

### 9. Where could image-set-specific metadata live later?

See dedicated note `CURRICULUM_IMAGE_SET_METADATA_ARCHITECTURE.md`. Short version: image-set-specific metadata (visual caption, style tags, cultural notes, exact-text review status, prompt route, source render batch, alt text) belongs to the image asset, not the word. We can later add:

- A column extension on `curriculum_image_sets` for set-level metadata (style family, art direction notes).
- A per-asset metadata table keyed by `(language_iso, set_key, normalized_word)` for per-image metadata.

Out of scope for this pass; the doc records the intent.

## Frontend module shape

```
frontend/src/lib/curriculumImageSetConfig.ts   (new)
  - types: ImageSetKey, ImageSetRecord, ImageSetSelection
  - loadCurriculumImageSetConfig(supabase, languageIso) → cached promise
  - resolveActiveSetKey(config, languageIso, categorySlug?) → key string
  - useActiveCurriculumImageSet(languageIso, categorySlug?) → { activeSetKey, isLoaded }

frontend/src/lib/curriculumImageSets.ts        (rewritten, no localStorage)
  - normalizeCurriculumImageSetWord(term)
  - resolveCurriculumImageSetAsset(term, { activeSetKey, languageIso, registry }) → { publicPath, resolvedSet, fallbackUsed }
  - removes: useCurriculumImageSet, getCurriculumImageSet, setCurriculumImageSet, CURRICULUM_IMAGE_SET_STORAGE_KEY, IMAGE_SET_CHANGE_EVENT

frontend/src/lib/curriculumImageSets.test.ts   (rewritten)
  - covers: normalization, manifest-driven resolution, fallback to Set A, fallback to null

frontend/src/data/curriculumImageSetAvailability.ts  (kept)
  - exports CURRICULUM_IMAGE_SET_A_WORD_SET / _C_WORD_SET (static word lists derived from manifests)
  - used as a fast lookup without re-parsing manifest JSON

frontend/src/pages/admin/CurriculumImageSets.tsx     (new)
  - admin UI: pick language, pick default set, manage per-category overrides
```

## Database

Two new tables, one migration. RLS uses `public.is_admin()`. See Part 2 / the migration file for SQL.

## Out of scope

- No changes to `submit_generation`, `request_word_retry`, `generation_jobs`, `CardWorker`, paid providers, or credits.
- No changes to deck identity.
- No changes to Supabase storage buckets.
- No `image_set_id` on decks or words.
- No retroactive rewrite of imported card `thumbnail_url`.
