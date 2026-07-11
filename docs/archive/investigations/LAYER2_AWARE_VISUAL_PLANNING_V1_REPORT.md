# Layer 2-Aware Visual Planning V1 Report

## Why Compiler-Only Layer 2 Failed

The prior Layer 2 implementation routed user choices into the final GPT Image-2 prompt compiler, but the enrichment stage still produced a normal single-scene `visual_card_plan`. That meant `mini_story`, `split_panel`, and `sound_mnemonic` were being added late as generic prompt text instead of shaping the actual scene. Manual smoke testing showed mini-story cards collapsing into a single image, mnemonic cards becoming generic metaphors, and prompt cleanup leaving broken fragments such as `lead into a clear scene of.`

## Planning Changes

Layer 2 planning is now applied only when `settings_override.card_layer2` is present. Quick Generate without `card_layer2` returns the existing `visual_card_plan` unchanged.

The new deterministic planner writes:

- `layer2_planning_version: "layer2_planning_v1"`
- `meaning_strategy`
- `presentation_form`
- `mini_story_beats`
- `split_panel_brief`
- `word_design_brief`
- `word_design_mode`
- `mnemonic_hook`
- `hook_type`
- `hook_quality`
- `fallback_reason` when applicable
- `effective_planning_notes`

No LLM call was added. The adapter uses existing enrichment facts, bridge mnemonic, mnemonic, etymology, POS, word, and translation.

## Mini Story

`presentation_form=mini_story` now creates three explicit visible beats and rewrites `image_scene` as a sequence:

Before:

`Scene: A person stands on a cliff, feeling free.`

After:

`Mini story: three visible beats - first, a person trapped behind bars; second, the door opening; third, the person stepping into a wide open landscape.`

For mnemonic-hook mode, the beats follow hook -> connection -> meaning.

## Split Panel

`presentation_form=split_panel` now stores a brief with left/right states and a soft transition:

```json
{
  "left": "confinement, cage bars, or visible constraint",
  "right": "open landscape, free movement, and release",
  "divider": "soft visual transition"
}
```

The compiler uses this as the primary scene source.

## Word As Design

`presentation_form=word_object_design` now stores `word_design_brief` and `word_design_mode`.

Mode selection is deterministic:

- concrete words such as `flowers` -> `word_as_matter`
- abstract words such as `freedom`, `prejudice`, `remorse`, `pride` -> `environmental_typography`
- other nouns default toward `word_as_matter`
- otherwise default to `environmental_typography`

The prompt makes the target word the primary typographic subject and keeps normal scene content as background context.

## Mnemonic Hook

The existing enum remains `sound_mnemonic`, but planning treats it as Mnemonic Hook.

Supported hook types:

- `phonetic_bridge`
- `wordplay_bridge`
- `morpheme_bridge`
- `semantic_mnemonic`
- `etymology_bridge`
- `fallback_clear_meaning`

Examples:

- `disease` uses `wordplay_bridge`: `dis-ease = not at ease`
- `freedom` uses a semantic mnemonic such as `free as a bird`; it does not pretend to be phonetic
- missing or weak hooks fall back to `fallback_clear_meaning` with `fallback_reason: "no_phonetic_hook"`

The final structured hook is stored in both `visual_card_plan` and `gpt_image_2_card`.

## Prompt Compiler Changes

The compiler now accepts structured planning fields and uses them before generic `image_scene` text:

- `mini_story_beats` -> mini-story sequence line
- `split_panel_brief` -> left/right contrast line
- `word_design_brief` -> word-as-design primary subject line
- `mnemonic_hook` -> single-scene hook/meaning line

Prompt cleanup now repairs target-word stripping artifacts including:

- `focused on .`
- `lead into a clear scene of.`
- `teaching .`
- empty parentheses

Layer 2 prompts keep the selected style opening and concise clutter rules so structured story/form content survives the hard cap.

## Admin Metadata

Admin word detail now surfaces the new planning and prompt metadata rows for:

- `layer2_eval`
- `layer2_user_choices`
- `layer2_resolved`
- `layer2_planning_version`
- `mini_story_beats`
- `split_panel_brief`
- `word_design_brief`
- `word_design_mode`
- `mnemonic_hook`
- `hook_type`
- `hook_quality`
- `image_bridge`
- final provider prompt hash

## Tests And Checks Run

- `python -m pytest tests/test_layer2_visual_planning.py tests/test_gpt_image_2_prompt_composer.py tests/test_gpt_image_2_card_integration.py tests/test_gpt_image_2_no_fallback.py tests/test_admin_gpt_image_2_frontend.py -q`
- `python -m pytest tests/test_orchestration_feeder.py -q`
- `npm run test:admin-layer2-lab`
- `npm run test:lane-payload`
- `npm run build`
- `npx eslint src/components/admin/WordDetailPanel.tsx`
- `python -m py_compile` on changed backend Python files

Initial root-level npm script attempts failed because `package.json` lives under `frontend`; the same scripts were rerun successfully from `frontend`.

## Remaining Risks

The planner is deterministic and intentionally conservative. It improves structure without expanding the public UI, but some mnemonic hooks will still fall back to clear meaning until a richer lexical or etymology source is available.
