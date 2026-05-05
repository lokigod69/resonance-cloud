# Admin Layer 2 Lab V1 Report

## Route

Created admin-only route:

- `/admin/layer2-lab`

The route is protected by the existing `AdminRoute` wrapper and is available from the admin navigation as `Layer 2 Lab`.

## How To Use

1. Open `/admin/layer2-lab`.
2. Choose target language, base language, and deck name prefix.
3. Add one or more words as chips.
4. Build individual rows with word scope, meaning strategy, presentation form, art style, and optional label.
5. Use preset buttons for smoke batches:
   - Word Design Smoke
   - Style Obedience Smoke
   - Story Form Smoke
6. Review the visible script table.
7. Click `Create Evaluation Deck`.

The page then shows a link to the created deck.

## Job/Deck Strategy

The current `submit_generation` RPC accepts one `settings_override` per generation job, not per word. Since each lab row can have different Layer 2 settings, V1 uses:

- one normal Premium Card deck
- one generation job per script row
- one word per job

This preserves correct per-card settings without changing the RPC or adding migrations.

## RPC Constraints Found

The RPC creates words from `p_word_list` and assigns the same job-level `settings_override` to the whole job. It does not currently support per-word settings or per-word metadata payloads.

Because of that:

- Option 1, one job with per-word overrides, is not supported safely.
- Option 2, one deck with one job per script row, is implemented.
- Option 3, separate decks per unique group, was not needed.

The base language control is included for lab intent, but enrichment still reads base language from the admin profile during backend processing.

## Presets Included

Word Design Smoke:

- pride / clear_meaning / word_object_design / realistic
- remorse / clear_meaning / word_object_design / pixar_3d
- flowers / clear_meaning / word_object_design / realistic
- prejudice / clear_meaning / word_object_design / rick_and_morty_style

Style Obedience Smoke:

- prejudice / clear_meaning / single_scene / rick_and_morty_style
- pride / clear_meaning / single_scene / south_park_style
- remorse / clear_meaning / single_scene / pixar_3d
- viral / clear_meaning / single_scene / pen_and_ink

Story Form Smoke:

- viral / absurd_hook / mini_story / surrealism
- shipwreck / sound_mnemonic / split_panel / illustration
- fragrance / exaggerated_meaning / single_scene / cinematic

## Metadata

Each lab job sends:

```json
{
  "settings_override": {
    "card_image_model": "gpt_image_2",
    "card_image_style": "<row art style>",
    "card_layer2": {
      "meaning_strategy": "<row meaning strategy>",
      "presentation_form": "<row presentation form>",
      "visual_intensity": "balanced"
    },
    "layer2_eval": {
      "label": "<optional row label>",
      "meaning_strategy": "<row meaning strategy>",
      "presentation_form": "<row presentation form>",
      "art_style": "<row art style>",
      "source": "admin_layer2_lab_v1"
    }
  }
}
```

The feeder copies `settings_override.layer2_eval` into `words.metadata.layer2_eval` when enrichment writes word metadata. Admin word detail now surfaces Layer 2 evaluation info plus friendly rows for `layer2_user_choices`, `layer2_resolved`, `layer2_snap_notes`, `image_bridge`, and `card_image_style`.

## Compiler Cleanup

Fixed the target-word stripping artifact where a Layer 2 bridge could become:

```text
Memory logic: keep one direct visual moment focused on .
```

After cleanup, that becomes:

```text
Memory logic: keep one direct visual moment focused on the meaning.
```

## Tests And Checks

Passed:

- `npm run test:admin-layer2-lab`
- targeted ESLint for the new admin lab files and touched frontend files
- `python -m pytest tests/test_gpt_image_2_prompt_composer.py -q`

Known check blocker:

- `npm run build` is currently blocked by an unrelated existing TypeScript error in `frontend/src/components/study/canvas/EmberCanvas.tsx`: `setWordVersion` is undefined.

## Remaining Limitations

- The lab does not create a full analytics dashboard.
- Base language is visible in the lab UI but cannot override the backend enrichment base language without a future RPC/backend change.
- Evaluation metadata is stored through job `settings_override` and feeder writeback, not through direct per-word RPC metadata injection.
