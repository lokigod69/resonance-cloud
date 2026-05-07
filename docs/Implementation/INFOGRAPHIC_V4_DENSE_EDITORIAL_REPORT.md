# Infographic V4 Dense Editorial Report

## Why V4 Exists

V3 reference templates provide consistent layout, but live testing showed that fixed skeleton guidance can become too sparse or constrained. V4 tests the opposite direction: maximum editorial information density in an Admin Lab-only vocabulary infographic.

## How V4 Differs

- V1/V2: adaptive planner/compiler templates that produce fresh infographic prompts.
- V3: reference-guided image-to-image templates using skeleton PNGs and `input_urls`.
- V4: dense text-to-image prompt-writer mode with no reference image and no fixed skeleton.

V4 keeps `backend_template = infographic_prompt_v1` and adds `infographic_template = infographic_dense_editorial_v4`. It uses `gpt-image-2-text-to-image`, `aspect_ratio = 16:9`, and `resolution = 1K`.

## Thin Compiler

The V4 LLM writes a rich structured provider-ready prompt. The compiler stays thin:

- enforces `content.word` as the target-language title/headword
- enforces `content.translation` as the base-language subtitle/gloss
- wraps the writer output with vocabulary-first rules
- bans visible metadata and internal JSON keys
- records dense-editorial metadata

This keeps the writer free to create 8-12 modules and detailed editorial structure instead of compressing V4 into V3-style short panel caps.

## Prompt Length Strategy

V4 targets richer prompts than V3. The expected operating range is roughly 4500-7500 characters for real outputs. Tests ensure the sample prompt is not sparse and does not duplicate boilerplate. Metadata records `prompt_length_warning = over_8500_chars` when the final prompt exceeds 8500 characters.

## Vocabulary-First Rule

V4 is a language-learning infographic, not a topic encyclopedia. At least 70% of visible content should teach the target word as language: meaning, pronunciation, part of speech, forms/grammar, examples, collocations, register, synonyms/contrasts, word family, false friends, common mistakes, usage notes, and learner warnings.

At most 30% may be world/topic context, and only when it directly helps the learner understand or use the word. For topic-like nouns such as `chess`, V4 should teach the English word first: `play chess`, `chess board`, `chess piece`, `chess match`, `chess vs chest`, pronunciation, and grammar/usage before adding small topic context.

## Metadata

V4 metadata includes:

- `infographic_template: infographic_dense_editorial_v4`
- `backend_template`
- `prompt_writer_model`
- `final_prompt_chars`
- `final_prompt_preview`
- `final_prompt_hash` / `final_prompt_sha256`
- `base_language_intended`
- `target_language`
- `visible_module_count`
- `dense_editorial: true`
- `vocabulary_first: true`
- `provider_model: gpt-image-2-text-to-image`
- optional `prompt_length_warning`

## Tests And Checks

Coverage added:

- registry contains `infographic_dense_editorial_v4`
- V4 is not reference-guided
- Admin Lab can select V4 after V3 templates
- V4 routes through text-to-image, not image-to-image
- V4 prompt includes high-density editorial requirements
- V4 prompt includes vocabulary-first rules
- V4 prompt bans visible target/base language metadata and internal JSON keys
- V4 prompt orients `chess` title and `Schach` subtitle correctly
- V4 includes examples/collocations/forms as language-learning modules
- V4 metadata records prompt writer and dense editorial fields
- existing V1/V2/V3 tests continue to pass

Checks run for this change:

- `npm run test:admin-layer2-lab`
- `npm run build`
- targeted ESLint for changed frontend files
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py tests/test_card_layer2_resolution.py tests/test_layer2_visual_planning.py tests/test_card_deck_orchestration_isolation.py -q`
- `git diff --check`

## Known Risks

- Dense prompts can still produce visual clutter if the image model over-renders every module.
- The LLM prompt writer may produce more content than fits at 1K resolution; Admin Lab review should compare readability before any user exposure.
- Vocabulary-first prompting reduces topic drift but does not guarantee perfect model compliance.
- V4 relies on text-to-image only, so it will not preserve a consistent house template like V3.
