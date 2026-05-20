# Curriculum Image Set — Admin Control — Precheck

Date: 2026-05-21
Repo: orchestrator (git-connected, GitHub: lokigod69/resonance-cloud)
Branch: main
Last commit: 7bbbd75 feat(guided-today): widen unions for polish + pl-PL and ship polish a1 practical p1

## Pivot summary

Previous direction: a learner-facing A/C image-set toggle on category routes.

New direction: admin-controlled active curriculum image set. Learners do NOT see or choose A/C. The active set is an admin/content configuration only.

## Was A/C toggle already committed?

No. Verified via `git log --oneline --all -- "**CurriculumImageSetToggle**"` and `git ls-files`. The previous A/C toggle work exists only in the working tree as either untracked files or unstaged modifications to tracked files.

This precheck removes the learner-facing UI surface while preserving the underlying static assets and manifests so the new admin-controlled resolver can reuse them.

## Existing repo state (relevant files)

### Modified tracked files belonging to the learner-toggle approach

These will be partially reverted / refactored to remove `useCurriculumImageSet` and the learner toggle, while keeping the file fix that allows passing an external image-set value:

- `frontend/src/components/categories/CurriculumEntryDetailModal.tsx`
- `frontend/src/components/categories/CurriculumEntryImage.tsx`
- `frontend/src/pages/categories/CategoryListPage.tsx`
- `frontend/src/pages/categories/CategoryDetailPage.tsx`
- `frontend/src/pages/categories/LevelDetailPage.tsx`
- `frontend/src/pages/categories/Categories.module.css` (drops `.imageSetControl`/`.imageSetButtons` block)

### Untracked files belonging to the learner-toggle approach

- `frontend/src/components/categories/CurriculumImageSetToggle.tsx` — DELETE (no learner toggle)
- `frontend/src/lib/curriculumImageSets.ts` — REPLACE (drops `localStorage`, drops `useCurriculumImageSet`, drops `CURRICULUM_IMAGE_SET_STORAGE_KEY`; resolver helpers refactored to take an admin-resolved active set)
- `frontend/src/lib/curriculumImageSets.test.ts` — REPLACE (tests rewritten for pure resolver behavior, no localStorage)

### Untracked files useful for admin-controlled rendering — KEEP

- `frontend/src/data/curriculumImageSetAvailability.ts` — pure word lists derived from production manifests. Useful as a fast static fallback so the resolver does not need to fetch manifests on every render. Kept; no learner-toggle dependency on it.
- `frontend/public/curriculum/en/set-a/*.webp` — 322 assets. Static.
- `frontend/public/curriculum/en/set-c/*.webp` — 296 assets. Static.
- `frontend/public/curriculum/en/manifests/set-a.json` — generated manifest.
- `frontend/public/curriculum/en/manifests/set-c.json` — generated manifest.
- `frontend/public/curriculum/en/manifests/set-ac-index.json` — index. Will be edited to drop the `localStorageKey` field (no longer canonical; admin selection is the source of truth).

### Untracked documentation files — KEEP for historical record

- `docs/Product/CURRICULUM_IMAGE_SETS_AC_FRONTEND_WIRING_REPORT.md`
- `docs/Product/CURRICULUM_IMAGE_SETS_AC_HANDOFF_2026_05_17.md`
- `docs/Product/CURRICULUM_IMAGE_SETS_AC_SOURCE_AUDIT.md`
- `docs/Product/CURRICULUM_IMAGE_SET_DECK_IMPORT_AUDIT.md`
- `docs/Product/CURRICULUM_IMAGE_SET_TOGGLE_VISIBILITY_AUDIT.md`

These document the prior learner-toggle approach and remain useful as a record of why we pivoted. They are NOT being staged in this commit. The new admin-control work will produce its own dedicated docs under `CURRICULUM_IMAGE_SET_ADMIN_CONTROL_*` and `CURRICULUM_IMAGE_SET_METADATA_ARCHITECTURE.md`.

## Unrelated local changes — DO NOT TOUCH

These tracked changes are unrelated Guided Today / trophy song work and must not be staged or reverted in this pass:

- `docs/Product/GUIDED_TODAY_VIBE_CHARACTER_BIBLES.md`
- `frontend/scripts/generate-guided-trophy-song-audio.ts`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `frontend/src/components/today/GuidedSpeechPrompt.tsx`
- `frontend/src/components/today/Today.css`
- `frontend/src/components/today/TodaySession.tsx`

Untracked unrelated assets/docs and other Guided Today artefacts are also being left alone:

- `frontend/public/guided/today/*`
- `frontend/public/guided/trophy-songs/*`
- `frontend/public/guided/vibes/concepts/*`
- `frontend/supabase/migrations/20260517010000_guided_tts_v1.sql`
- `docs/Product/GUIDED_*` series
- `docs/Costs/`
- `docs/Product/MOBILE_AND_OPTIMIZATION_AUDIT_2026_05_17.md`
- `docs/Product/TODAY_*` series
- `ADVERSARIAL_REVIEW_CAMERA_VOCABULARY_FINDINGS.md`
- `build/`
- `resonance_arch_compare_pack/`
- `resonance_curriculum_arch_compare_runner.py`
- `scripts/seed_guided_voice_profiles.py`

The Part 9 commit will use path-specific `git add` and will NOT use `git add -A`.

## Rollback safety

- No `git reset --hard` performed.
- No unrelated file restored.
- Removal of the learner toggle uses path-specific `Edit`/`Write`/`Bash rm` only.
- The replaced `curriculumImageSets.ts` overwrites an untracked file (not yet in git), so the prior version is not in the index and there is no working-tree loss for tracked content.
- Tracked file edits revert toggle wiring while preserving the optional `imageSet` parameter on `CurriculumEntryImage` / `CurriculumEntryDetailModal` (those props are renamed/repurposed for the admin-resolved active set rather than localStorage).

## Result

Old learner-facing toggle: removed.
Reusable assets/manifests: preserved.
Tracked unrelated changes: untouched.
Admin-controlled active image set: implemented in subsequent parts.
