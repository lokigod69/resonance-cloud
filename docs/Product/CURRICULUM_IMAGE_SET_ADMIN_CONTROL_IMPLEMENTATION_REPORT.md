# Curriculum Image Set — Admin Control — Implementation Report

Date: 2026-05-21
Branch: main (orchestrator)
Repo: lokigod69/resonance-cloud

## What changed

Replaced the abandoned learner-facing A/C toggle work (uncommitted) with an admin-controlled active curriculum image-set selection. Learners do not see or pick an image set. The admin chooses the active set per language (and optionally per category); learners see whichever set is active.

## Files changed

### New

- `frontend/supabase/migrations/20260521120000_curriculum_image_set_admin_control.sql` — adds `curriculum_image_sets` and `curriculum_image_set_selections` tables with seed data and admin-only RLS.
- `frontend/src/lib/curriculumImageSets.ts` — pure (no localStorage, no React) resolver from term + active set key → public asset path with fallback to Set A.
- `frontend/src/lib/curriculumImageSets.test.ts` — tsx-runnable tests for the resolver.
- `frontend/src/lib/curriculumImageSetConfig.ts` — Supabase loader + module-scoped cache + `useActiveCurriculumImageSet(languageIso, categorySlug?)` hook.
- `frontend/src/pages/admin/CurriculumImageSets.tsx` — admin UI at `/admin/curriculum` for language default and per-category overrides, with a preview strip.
- `frontend/src/data/curriculumImageSetAvailability.ts` — static per-set word availability index (used by the resolver).
- `frontend/public/curriculum/en/manifests/set-a.json` — manifest (322 + 77 missing-set-C records = 399 entries total).
- `frontend/public/curriculum/en/manifests/set-c.json` — manifest (296 + 103 missing-set-C entries = 399 entries total).
- `frontend/public/curriculum/en/manifests/set-ac-index.json` — index (without the `localStorageKey` field).
- `frontend/public/curriculum/en/set-a/*.webp` — 322 assets.
- `frontend/public/curriculum/en/set-c/*.webp` — 296 assets.
- `docs/Product/CURRICULUM_IMAGE_SET_ADMIN_CONTROL_PRECHECK.md`
- `docs/Product/CURRICULUM_IMAGE_SET_ADMIN_CONTROL_ARCHITECTURE.md`
- `docs/Product/CURRICULUM_IMAGE_SET_ADMIN_CONTROL_DECK_IMPORT_AUDIT.md`
- `docs/Product/CURRICULUM_IMAGE_SET_METADATA_ARCHITECTURE.md`
- `docs/Product/CURRICULUM_IMAGE_SET_ADMIN_CONTROL_IMPLEMENTATION_REPORT.md` (this file)

### Modified

- `frontend/src/App.tsx` — registers `/admin/curriculum`.
- `frontend/src/components/layout/AppSidebar.tsx` — adds Curriculum Images link.
- `frontend/src/components/layout/AppHeader.tsx` — adds Curriculum Images link.
- `frontend/src/components/categories/CurriculumEntryImage.tsx` — accepts optional `activeImageSet` prop and resolves via the new resolver; preserves legacy path fallback.
- `frontend/src/components/categories/CurriculumEntryDetailModal.tsx` — accepts optional `activeImageSet` prop.
- `frontend/src/pages/categories/LevelDetailPage.tsx` — calls `useActiveCurriculumImageSet(targetLanguage, slug)` and passes the resolved active set to `CurriculumEntryImage` and `CurriculumEntryDetailModal`.

### Removed (toggle removal)

- `frontend/src/components/categories/CurriculumImageSetToggle.tsx` — deleted; was untracked.

### NOT modified

- `frontend/src/pages/categories/CategoryListPage.tsx` — no learner toggle.
- `frontend/src/pages/categories/CategoryDetailPage.tsx` — no learner toggle.
- `frontend/src/pages/categories/Categories.module.css` — no `imageSetControl` block ever committed.
- `frontend/src/lib/curriculumDeckBridge.ts` — import path unchanged; still stamps `thumbnail_url` from the canonical curriculum image manifest.
- `submit_generation`, `request_word_retry`, `generation_jobs`, CardWorker, provider clients, credits, deck identity — fully untouched.

## Checks run

- `npx tsx src/lib/curriculumImageSets.test.ts` — 17/17 pass.
- `npx tsx src/lib/curriculumImagePath.test.ts` — pass.
- `npx tsx scripts/test-curriculum-category-display.ts` — `curriculum category display ok`.
- Manifest parse check (node) — `set-a.json` 399 entries, `set-c.json` 399 entries, `set-ac-index.json` `defaultSet: A`, no `localStorageKey` field.
- `npx tsc -b --noEmit` — clean.
- `npx eslint` on every changed file — clean.
- `npm run build` — build succeeds (1.75s).
- `git diff --check` and `git diff --cached --check` — clean.

## Checks not run, and why

- **Local Supabase migration apply** — not run. The local environment has the Supabase CLI but no linked local DB shadow; running `supabase db lint --linked` returns only a pre-existing unrelated warning on `public.request_word_retry`. The migration was reviewed for SQL syntax against existing migrations in the repo (same patterns as `phase1h1` and `phase2a` migrations) but was not applied locally. The migration is shipped and will be applied via the project's normal migration workflow.
- **Authenticated browser screenshots** — not produced. No authenticated browser session is available in this environment, so no live UI screenshots of `/admin/curriculum`, `/categories`, `/categories/:slug`, or `/categories/:slug/:level` were captured. Code-level verification (typecheck + build + lint + tests) covers correctness; the visual surface follows the wiring documented in the architecture doc.

## Resolution behavior (summary)

1. Category override (`(language_iso, category_slug)` row) → use that set.
2. Else language default (`(language_iso, category_slug = null)` row) → use that set.
3. Else Set A if registered/enabled.
4. Else `DEFAULT_ACTIVE_SET_KEY = 'A'` (last-resort).

Per-term, within the chosen set:

1. If active set has the term → its `/curriculum/{iso}/set-{x}/{term}.webp`.
2. Else if Set A has the term → fall back to Set A asset.
3. Else legacy `curriculumEntryImagePath(...)` (existing manifest) + emoji placeholder fallback (existing behavior).

## Acceptance against spec

- No learner-facing A/C toggle. ✓
- No localStorage image-set preference. ✓ (`CURRICULUM_IMAGE_SET_STORAGE_KEY` removed; resolver is pure)
- No A/C deck variants. ✓ (no `image_set_id` introduced anywhere)
- No deck duplication. ✓ (admin write path only touches `curriculum_image_set_selections`)
- No persistent deck media overwrite. ✓ (`words.thumbnail_url` not mutated by anything in this change)
- Continue Learning canonical. ✓ (no changes to that path)
- English active default = Set A. ✓ (seed inserts `('en', null, 'A')`)
- Set C available but inactive unless admin selects. ✓ (registered with `is_enabled = true`, but not the default selection)

## Recommendation

`safe_to_review_admin_image_set_control`
