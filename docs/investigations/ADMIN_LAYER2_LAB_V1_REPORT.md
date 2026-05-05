# Admin Layer 2 Lab V1 Report

## Route

Created admin-only route:

- `/admin/layer2-lab`

The route is protected by the existing `AdminRoute` wrapper and is available from the admin navigation as `Layer 2 Lab`.

## How To Use

1. Open `/admin/layer2-lab`.
2. Choose target language, base language, and deck mode.
   - Create new evaluation deck: enter a deck name prefix.
   - Append to existing deck: select a recent card deck.
3. Add one or more words as chips.
4. Build individual rows with word scope, meaning strategy, presentation form, art style, and optional label.
5. Use preset buttons for smoke batches:
   - Word Design Smoke
   - Style Obedience Smoke
   - Story Form Smoke
6. Review the visible script table.
7. Review the estimated credit cost: `script row count x 5` Premium GPT Image-2 credits.
8. Click `Create Evaluation Deck`.

The page then shows a result summary with the created deck link, submitted row count, failed row count, and any failed row labels/reasons.

Preset buttons now use the current word chips when any chips exist. If no chips exist, they fall back to their default sample words.

## Job/Deck Strategy

The current `submit_generation` RPC accepts one `settings_override` per generation job, not per word. Since each lab row can have different Layer 2 settings, V1 uses:

- one normal Premium Card deck
- one generation job per script row
- one word per job

This preserves correct per-card settings without changing the RPC or adding migrations.

The first row is submitted without an existing deck id, so it creates the evaluation deck. Every later row is submitted through the same `submitGeneration` path with the captured deck id as the existing deck, equivalent to repeatedly using Add Cards into one Premium Card deck.

If the first row fails, no deck exists and the lab stops. If a later row fails, the lab keeps the created deck link, records the failed row in the visible summary, and continues attempting later rows.

Append mode uses the same one-job-per-script-row path, but starts with the selected card deck as `existingDeck`. Every row is submitted with that deck id. The UI only offers card decks for selection, and submit is blocked if append mode has no selected card deck.

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

With entered words, Word Design Smoke creates one row per entered word and rotates art styles through:

- realistic
- pixar_3d
- rick_and_morty_style
- pen_and_ink

Style Obedience Smoke:

- prejudice / clear_meaning / single_scene / rick_and_morty_style
- pride / clear_meaning / single_scene / south_park_style
- remorse / clear_meaning / single_scene / pixar_3d
- viral / clear_meaning / single_scene / pen_and_ink

With entered words, Style Obedience Smoke creates one row per entered word and rotates art styles through:

- rick_and_morty_style
- south_park_style
- pixar_3d
- pen_and_ink
- surrealism

Story Form Smoke:

- viral / absurd_hook / mini_story / surrealism
- shipwreck / sound_mnemonic / split_panel / illustration
- fragrance / exaggerated_meaning / single_scene / cinematic

With entered words, Story Form Smoke creates one row per entered word and rotates the same three meaning/presentation/style triples.

## UI Polish

Layer 2 Lab dropdown menus use an opaque dark popup, high z-index, a visible border, and max-height scrolling. This keeps the long Art Style menu readable without underlying page text bleeding through.

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
      "source": "admin_layer2_lab_v1",
      "script_index": 1,
      "label": "<optional row label>",
      "meaning_strategy": "<row meaning strategy>",
      "presentation_form": "<row presentation form>",
      "art_style": "<row art style>"
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

- `npm run build`
- `npm run test:admin-layer2-lab`
- targeted ESLint for the new admin lab files and touched frontend files
- `git diff --check`

## Remaining Limitations

- The lab does not create a full analytics dashboard.
- Base language is visible in the lab UI but cannot override the backend enrichment base language without a future RPC/backend change.
- Evaluation metadata is stored through job `settings_override` and feeder writeback, not through direct per-word RPC metadata injection.
