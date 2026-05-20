# Curriculum Image Set — Admin Control — Deck/Import Audit

Date: 2026-05-21

This audit replaces the older `CURRICULUM_IMAGE_SET_DECK_IMPORT_AUDIT.md` (which was scoped to the abandoned learner-facing A/C toggle). The architecture has pivoted to an admin-controlled active set; this audit walks through the deck/import implications under the new architecture.

## 1. Are A and C separate decks?

No. There is exactly one curriculum deck per (user, language, category, level) once imported. The admin's choice of active image set has no effect on deck identity. Searching the codebase for `image_set_id`, `set_a_`, `set_c_`, `deck_a`, `deck_c`, etc. returns zero deck-model references — no schema column exists for image set on `decks` or `words`.

## 2. Does image set appear in deck identity?

No. `decks.id`, `decks.user_id`, `decks.curriculum_category_slug`, `decks.curriculum_level`, and `words.deck_id` are the only deck-identifying fields touched by the curriculum import path. Image set is not in any unique index on `decks`.

## 3. Does admin switching active set create duplicate decks?

No. The admin toggle writes to `public.curriculum_image_set_selections` only. That table is keyed by `(language_iso, category_slug)` and is read at render time by the frontend resolver. Nothing in the toggle code path touches `decks`, `words`, `generation_jobs`, `request_word_retry`, `submit_generation`, or any storage bucket.

## 4. Does admin switching active set overwrite existing card media?

No. `frontend/src/lib/curriculumDeckBridge.ts` stamps `thumbnail_url` on `words` rows at import time using `curriculumImagePathIfKnown(...)`, which produces paths under `/curriculum/categories/{iso}/{slug}/entries/{normalized}.webp` (the legacy curriculum image manifest). The new resolver lives in `curriculumImageSets.ts` / `curriculumImageSetConfig.ts` and produces paths under `/curriculum/{iso}/set-a/...` or `/curriculum/{iso}/set-c/...`. The import path does NOT consult the admin active-set table and does NOT use the new resolver. Existing imported cards keep their original `thumbnail_url`.

## 5. Does Continue Learning read active image-set selection in this pass?

No. Continue Learning loads imported decks, reads `words.thumbnail_url`, and renders that. It does not call `loadCurriculumImageSetConfig` or `useActiveCurriculumImageSet`. This is deliberate and matches the canonical behavior the spec demanded.

## 6. If imported cards store `thumbnail_url`, what happens to existing decks after admin switches active set?

Nothing changes on existing decks. The stored URL is canonical. Concretely:

- A card imported while the admin had Set A active → `thumbnail_url = /curriculum/categories/en/.../apple.webp`.
- Admin later switches the active set to Set C.
- Same card still renders the same `thumbnail_url`. The admin switch only affects future browsing previews in `/categories/*` for terms whose decks have not yet been imported.

If a future feature wants to refresh imported card media when the admin switches sets, that is an explicit re-import / re-stamp action — out of scope for this pass.

## 7. What would be needed for study/deck runtime image resolution later?

Three pieces, none of which are implemented in this pass:

1. A deck-aware lookup: given a `words` row, derive `(languageIso, categorySlug)` (from `decks.curriculum_*`) and term.
2. A runtime override that prefers `resolveCurriculumImageSetAsset(term, { activeSetKey, languageIso })` over the stored `thumbnail_url` when both exist.
3. A UX decision: do we let the admin retroactively change what learners see on imported decks? If yes, this is the route. If no, leave the import-time stamp canonical and ship a separate "rebuild curriculum thumbnails" admin action. Documented as a future option; not built here.

## 8. Is there any media overwrite risk?

No. The only writes the admin UI performs are to `curriculum_image_set_selections` (a small config table; pure config; no media). No code path in this change writes to `storage.objects`, no code path calls a provider, and no code path mutates `words.thumbnail_url`.

## 9. Are `submit_generation` / `request_word_retry` / `generation_jobs` / `CardWorker` / provider calls untouched?

Yes — fully untouched. Verified by grepping the changed files. The admin UI uses only:

- `supabase.from('curriculum_image_sets').*`
- `supabase.from('curriculum_image_set_selections').*`

It does not import any provider client, does not enqueue any job, does not touch credits, does not call any RPC named `submit_*`, `request_*`, or anything in the generation pipeline.

## Summary

- A and C are NOT separate decks.
- Image set is NOT in deck identity.
- Admin switching DOES NOT duplicate decks.
- Admin switching DOES NOT overwrite stored card media.
- Continue Learning is unchanged.
- Existing decks remain canonical after a set switch.
- No provider / credit / generation paths are touched.
- No media overwrite risk.
