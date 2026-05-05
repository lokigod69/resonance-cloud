# Layer 2 Direct Prompt V1 Refinement Report

## Why UI Labels Changed

Admin testing compares two backend prompt architectures. The internal enum names are useful in code, but too technical in the Lab:

- `structured_plan_v1` now displays as `Compiler V1`
- `direct_prompt_v1` now displays as `LLM V1`

The enum values are unchanged in payloads and metadata.

## Mnemonic Hook Naming

The UI label for `sound_mnemonic` now displays as `Mnemonic Hook`.

Reason: Direct Prompt V1 should choose the best memory bridge, not force a fake sound association. The mode can use phonetics, wordplay, morphemes, etymology, semantic metaphor, or fallback clear meaning.

## Direct Prompt Guardrail

Word as Design produced stronger concepts, but manual testing showed spelling risk for visible words. The prompt writer now gets one concise rule only:

`If the target word appears, spell it exactly: {TARGET_WORD}.`

This is intentionally lightweight. It avoids letter-by-letter instructions, repeated warnings, or rigid per-letter design requirements so LLM V1 stays creative-first.

## Mode Definition Cleanup

The Direct Prompt V1 system prompt now uses compact definitions:

- Clear Meaning: direct meaning.
- Exaggerated Meaning: intensified but still clear.
- Absurd Hook: strange, memorable, understandable.
- Mnemonic Hook: best available memory bridge.
- Single Scene: one visual moment.
- Mini Story: 2-3 visible beats.
- Split Panel: two contrasted states.
- Word as Design: target word is the main visual object.

## Admin Visibility

Admin Word Detail now shows a compact friendly Layer 2 summary from `layer2_eval`, for example:

`LLM V1 · Absurd Hook · Mini Story · Realistic`

The same metadata remains available in detailed rows for debugging.

## Dropdown Readability

Layer 2 Lab select menus now use a local opaque dark menu style with higher z-index, border, scrollable max height, and no backdrop blur. This avoids underlying page text bleeding through the art-style and backend-template dropdowns without changing the shared select component.

## Tests And Checks Run

- `python -m pytest tests/test_card_layer2_resolution.py tests/test_layer2_visual_planning.py tests/test_layer2_direct_prompt.py tests/test_gpt_image_2_prompt_composer.py tests/test_gpt_image_2_card_integration.py tests/test_gpt_image_2_no_fallback.py tests/test_orchestration_feeder.py tests/test_admin_gpt_image_2_frontend.py -q`
- `npm run test:admin-layer2-lab`
- `npm run test:lane-payload`
- `npm run build`
- targeted ESLint for changed frontend files
- `python -m py_compile cloud_engines/image_engine/layer2_direct_prompt.py`
- `git diff --check`

## Remaining Risks

The spelling guard is intentionally minimal. If repeated tests still show misspellings in word-object designs, the next step should be another small targeted instruction, not a broad compiler-style constraint block.

## Next Testing Plan

Create matched Lab rows with the same word/settings across `Compiler V1` and `LLM V1`, then compare:

- Word as Design spelling accuracy
- Mini Story readability
- Mnemonic Hook usefulness
- art-style obedience
- recall value after a short delay
