# Layer 2 Backend Template Experiment V1 Report

## Why Template B Was Added

Live Layer 2 Lab testing showed that the structured-plan/compiler path improved routing, but it still over-shaped some cards. Mini stories could flatten, mnemonic-hook prompts could become semantic metaphors, and the compiler sometimes preserved generic prompt clutter while trimming useful visual detail.

Template B exists to test a different architecture: let an LLM write the final GPT Image-2 provider prompt directly, then apply only minimal safety checks before sending it to KIE.

## Template A vs Template B

`structured_plan_v1` remains the existing path:

- enrichment writes a visual plan
- Layer 2 planning adds structured fields
- the compiler formats those fields into the final GPT Image-2 prompt

`direct_prompt_v1` is the new experiment path:

- the card worker resolves Layer 2 settings
- a direct prompt-writer LLM call receives word facts, strategy, presentation form, art style, and answer policy
- the writer returns one final provider prompt string
- the backend safety pass enforces target-word policy, translation policy, style contradiction cleanup, and the hard cap
- that prompt goes directly to GPT Image-2 with 16:9 and 1K

## Prompt Length

Direct Prompt V1 is intentionally allowed to be richer than the compact compiler path.

- preferred range: 900-1400 characters
- hard cap: 2000 characters

This gives the writer room for camera angle, lighting, material detail, composition, emotional tone, and style language. If the prompt exceeds the hard cap, the backend trims at a sentence/word boundary while preserving as much of the core visual concept as possible.

## Admin Lab Usage

The Admin Layer 2 Lab now has a Backend Template selector:

- Structured Plan
- Direct Prompt

Each script row stores its selected backend template in:

- `settings_override.card_layer2.backend_template`
- `settings_override.layer2_eval.backend_template`
- `words.metadata.gpt_image_2_card.backend_template`

This supports side-by-side tests in one evaluation deck, for example:

- `freedom / sound_mnemonic / mini_story / anime / structured_plan_v1`
- `freedom / sound_mnemonic / mini_story / anime / direct_prompt_v1`

## Direct Prompt Metadata

For direct prompt runs, GPT Image-2 metadata includes:

- `backend_template`
- `direct_prompt_writer_model`
- `direct_prompt_chars`
- `direct_prompt_prompt_sha256`
- `direct_prompt_preview`
- `target_word_allowed`
- `answer_visibility`

The final provider prompt hash remains stored as `final_provider_prompt_sha256`.

## Expected Prompt Output

Mini story example:

`Polished anime-style 16:9 image showing a three-beat visual story of liberty. On the left, a small bird sits inside a cramped cage; in the center, the cage door opens in a shaft of sunlight; on the right, the bird bursts into a vast golden sky above open fields. No readable text.`

Word as design example:

`Photorealistic 16:9 image where the word FREEDOM is the central physical object, built from broken cage bars, wind-carved stone, and strands of wild grass on a mountain ridge at sunrise. The letters are large, readable, and monumental. Do not write the translation.`

Single scene style example:

`Rick-and-Morty-inspired animated 16:9 sci-fi comedy scene showing prejudice as a warped perception device. A nervous cartoon office worker looks into a cracked alien mirror that exaggerates a stranger into a ridiculous monster before the stranger has done anything. No readable labels or captions.`

## Safety Checks

Direct Prompt V1 does not pass through the structured compiler. It only applies:

- target word removal for non-word-object forms
- direct translation removal when distinct from the target word
- removal of accidental `photorealistic` contradiction for non-realistic styles
- required answer-policy sentence if the writer omitted it
- 2000-character hard cap

For `word_object_design`, the target word is allowed and `answer_visibility` is `target_word_embedded`. The direct translation remains forbidden.

## Tests And Checks Run

- `python -m pytest tests/test_card_layer2_resolution.py tests/test_layer2_visual_planning.py tests/test_gpt_image_2_prompt_composer.py tests/test_gpt_image_2_card_integration.py tests/test_gpt_image_2_no_fallback.py tests/test_orchestration_feeder.py tests/test_admin_gpt_image_2_frontend.py -q`
- `npm run test:admin-layer2-lab`
- `npm run test:lane-payload`
- `npm run build`
- `npx eslint src/components/admin/WordDetailPanel.tsx src/pages/admin/Layer2Lab.tsx src/pages/admin/ObservabilityAggregate.tsx src/lib/adminLayer2Lab.ts src/components/generate/useWizardState.ts`
- `python -m py_compile` on changed backend Python files

## Remaining Risks

Direct Prompt V1 adds one extra OpenRouter call for each selected lab card. It is intentionally admin-only for now. Prompt quality will depend on the writer model, and the minimal safety pass can remove forbidden terms but cannot fully judge whether the image concept is pedagogically strong. The next recommendation is to generate matched comparison decks and review image quality, style obedience, and recall value before exposing this template outside Admin Lab.
