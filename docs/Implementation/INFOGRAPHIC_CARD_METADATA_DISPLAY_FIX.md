# Infographic Card Metadata Display Fix

## Current Metadata Sources

Infographic cards still have multiple metadata sources:

- `words.metadata.visual_card_plan`: legacy enrichment-time plan created before image generation. It may describe a mnemonic scene that is not used by the final Infographic prompt.
- `words.metadata.gpt_image_2_card`: post-render GPT Image-2 metadata, including selected backend/template, final prompt debug fields, provider state, validator state, cache flags, and Layer 2 resolution fields.
- `words.metadata.gpt_image_2_card.infographic_learning`: normalized learner-facing Infographic summary added in this pass.

Template routing remains unchanged:

- `backend_template = infographic_prompt_v1` means the shared Infographic backend route.
- `infographic_template` identifies the selected style:
  - `infographic_study_poster_v2`
  - `infographic_visual_dictionary_v2`
  - `infographic_language_atlas_v2`
  - `infographic_museum_exhibit_v2`
  - `infographic_dense_editorial_v4`

## Normalized Schema

Successful Infographic generations now persist:

```json
{
  "template": "infographic_study_poster_v2",
  "template_label": "Study Poster",
  "headword": "threshold",
  "translation": "Schwelle",
  "base_language": "German",
  "target_language": "English",
  "part_of_speech": "noun",
  "pronunciation": "...",
  "example_sentences": [
    { "target": "Cross the threshold.", "gloss": "Ueberschreite die Schwelle." }
  ],
  "collocations": ["cross the threshold"],
  "etymology": "...",
  "usage_note": "...",
  "common_mistake": "...",
  "memory_cue": "...",
  "footer_takeaway": "..."
}
```

Only planner/writer output or already-known word fields are copied. Missing optional fields are omitted. Full prompts stay in existing debug fields such as `final_prompt_preview`, `final_prompt_hash`, and the V4 `final_prompt`.

Friendly labels are used inside `infographic_learning.template_label`: Study Poster, Visual Dictionary, Language Atlas, Museum Exhibit, Dense Encyclopedia.

## Resolver Priority

For Infographic cards, `resolveCardLearningMetadata` now detects Infographic state from:

- `backend_template = infographic_prompt_v1`
- `presentation_form = infographic_card`
- `premium_quick_mode = infographic`
- `infographic_template`
- `gpt_image_2_card.infographic_learning`

When `infographic_learning` exists, user-facing Card Detail uses:

1. `gpt_image_2_card.infographic_learning`
2. GPT Image-2 selected-template/debug fields where appropriate
3. `word.translation` and standard word fields
4. legacy examples only if no normalized example exists

It does not show `visual_card_plan.image_scene`, `visual_card_plan.mnemonic`, or `visual_card_plan.rationale_summary` as learner-facing Infographic detail.

## Admin Display

Admin Word Detail now separates:

- `Infographic Learning Metadata`: normalized learner summary, template label, headword, translation, languages, examples, collocations, usage note, common mistake, memory cue, and footer takeaway.
- `Legacy Pre-image Visual Plan`: `metadata.visual_card_plan`, clearly labeled as legacy pre-image planning.
- `GPT Image-2 Card`: provider/template/debug metadata, final prompt preview/hash, validator state, failure origin, and prompt cache flags.

## Visual Plan Demotion

`visual_card_plan` is still preserved for debugging. It is no longer treated as the source of truth for user-facing Infographic detail when normalized Infographic metadata exists. This prevents mismatches such as a card image showing a rejection-letter failure infographic while detail text describes a collapsing tower.

## Tests And Checks

Added or updated tests cover:

- V2 Study Poster writes `infographic_learning` with template/headword/translation.
- V2 Visual Dictionary writes available fields and tolerates missing optional fields.
- V4 Dense Editorial writes template/headword/translation and extractable examples/collocations/takeaway.
- The `card_engine` Infographic route persists `infographic_learning`.
- The frontend resolver prefers `infographic_learning` over conflicting `visual_card_plan`.
- Quick Infographic translation display resolves for words such as `vaccinations`.
- Same-word phrase translations such as `wishful thinking` remain coherent.
- Admin Word Detail exposes Infographic Learning Metadata and labels the visual plan as legacy pre-image planning.
- Standard and non-infographic Premium resolver behavior remains covered by existing tests.

Commands run:

- `npm run build`
- `npx eslint src/lib/wordDisplayMetadata.ts src/components/WordInfoPanel.tsx src/components/admin/WordDetailPanel.tsx scripts/test-word-display-metadata.ts`
- `npm run test:lane-payload`
- `npm run test:admin-layer2-lab`
- `npm run test:word-metadata`
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py tests/test_card_layer2_resolution.py -q`
- `git diff --check`

## Remaining Risks

- V4 writer output can be natural prose, so extraction is intentionally conservative. If a field is not clearly present, it is omitted instead of inferred.
- Some older Infographic rows will not have `infographic_learning`; those rows may still use legacy fallback behavior until regenerated or backfilled.
- A future Card Detail polish pass can add richer layout for multiple examples and longer collocation lists.
