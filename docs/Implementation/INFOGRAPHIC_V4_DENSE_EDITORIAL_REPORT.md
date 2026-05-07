# Infographic V4 Dense Editorial Report

## Purpose

V4 is the Admin Lab-only dense editorial lane. It exists to test rich, high-density vocabulary infographics without the fixed skeleton constraints of V3.

## Architecture

V4 remains `backend_template = infographic_prompt_v1` with `infographic_template = infographic_dense_editorial_v4`.

The flow is:

1. Deterministic brief assembly: target word, translation/gloss, base language, target language, template choice, and hard banned visible strings.
2. Editorial prompt writer: one LLM call writes a natural-language provider-ready image prompt, like an art director briefing an infographic designer.
3. Deterministic validator: checks orientation, banned labels, raw JSON keys, vocabulary-first requirements, concrete language names, prompt length, and required learning modules.
4. Provider call: validated V4 prompts route to GPT Image-2 text-to-image.

V4 does not silently fall back to V2 in Admin Lab. If validation fails twice, the card fails clearly before the paid provider call and records validator metadata.

## Provider

V4 is not reference-guided. It uses:

- `model: gpt-image-2-text-to-image`
- `input.prompt`
- `input.aspect_ratio: 16:9`
- `resolution: 1K`

V3 remains the reference-guided image-to-image lane.

## Prompt Shape

The final provider prompt is natural language, not JSON. It starts from a compact wrapper:

- target word/headword
- translation/gloss
- explanation language
- target-language forms/examples allowance
- vocabulary-first rule
- dense editorial design direction
- compact planned modules
- short bans

Raw keys such as `type`, `style`, `composition`, `info_panels`, `visual_elements`, and `design_goals` are validator failures when they leak into the final provider prompt.

## Prompt Length Strategy

The target provider prompt range is now compact:

- ideal: 2500-4500 characters
- acceptable: 1800-6000 characters
- warning metadata over 6000 characters
- Admin Lab hard validator failure over 8000 characters

The intent is to make most of the prompt actual content/design direction, not repeated rules.

## Vocabulary First

V4 is a language-learning infographic, not a topic encyclopedia.

At least 70% of the card content must teach the target word as language: meaning, pronunciation, grammar/forms, examples, collocations, register, word family, false friends, common mistakes, synonyms/contrasts, and usage notes.

At most 30% may be topic/world context, and only when it helps the learner use or understand the word. For `chess` / `Schach`, V4 explicitly keeps the English headword and teaches language content such as `play chess`, `chess board`, `chess piece`, `chess match`, and `chess vs chest` before any game context.

## Metadata

V4 metadata includes:

- `infographic_template`
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
- `dense_editorial_word_category`
- `validator_passed`
- `validator_errors`
- `validator_retry_count`
- `prompt_rule_ratio_estimate`
- `prompt_length_warning`
- `provider_model: gpt-image-2-text-to-image`

## Risks

- A validated prompt can still produce a visually cluttered card if the image model over-renders modules.
- The validator checks prompt intent, not final image compliance.
- Prompt writer regeneration is limited to one retry in Admin Lab to avoid hidden loops.
