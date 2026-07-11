# Layer 2 Prompt Compiler Polish Report

## Manual Smoke Failure

Premium Customize correctly sent Layer 2 settings, but the GPT Image-2 compiler still opened Layer 2 prompts with:

```text
Photorealistic 16:9 language-learning image.
```

That contradicted non-realistic styles. For example, `card_image_style=rick_and_morty_style` still began with `Photorealistic`, so GPT Image-2 followed the opening more than the later style directive.

Word as Design was also too weak. The prior text directive only said to render the target word as physical material, which made the word optional or label-like instead of the central visible object.

## Prompt Opening Change

Layer 2 prompts now use a style-first opening derived from `card_image_style`.

Before:

```text
Photorealistic 16:9 language-learning image. Visual meaning: preconceived bias. Scene: ...
```

After:

```text
Rick-and-Morty-inspired animated 16:9 vocabulary memory image. Style: Rick-and-Morty-inspired animated sci-fi comedy look. Meaning: preconceived bias. Scene: ...
```

Other examples:

```text
Pixar-like polished 3D animated 16:9 vocabulary memory image.
Pen-and-ink 16:9 vocabulary memory illustration.
Photorealistic 16:9 vocabulary memory image.
```

The compiler no longer starts non-realistic Layer 2 prompts with `Photorealistic`, and it removes the generic `language-learning image` wording from Layer 2 openings.

Quick Generate remains on the existing non-Layer2 prompt path when `card_layer2` artifacts are absent.

## Style Obedience

The style directive now appears immediately after the style-first opening sentence for Layer 2 prompts instead of being buried after scene details.

The backend style resolver now also recognizes the Premium UI animation styles:

- `rick_and_morty_style`
- `south_park_style`
- `pixar_3d`

## Word as Design

For `presentation_form=word_object_design`, the resolver now emits a stronger text directive:

```text
Make the target word "prejudice" visibly readable as a large physical typographic object in the scene, constructed from material tied to the meaning. The word must be central to the composition, not a small label.
```

Answer visibility remains:

- Word as Design: target word allowed, direct answer/translation forbidden.
- Other forms: target word forbidden, direct answer/translation forbidden.

The prompt compiler also preserves the hard cap by using a compact Layer 2 overflow shape when the stronger word-design directive makes the full prompt too long.

## Tests Run

```text
.venv\Scripts\python.exe -m pytest tests/test_card_layer2_resolution.py tests/test_gpt_image_2_prompt_composer.py tests/test_gpt_image_2_card_integration.py tests/test_gpt_image_2_no_fallback.py -q
```

Result: 44 passed, 1 existing dependency warning.

Additional checks:

```text
.venv\Scripts\python.exe -m py_compile cloud_engines/image_engine/gpt_card_prompts.py cloud_engines/image_engine/card_layer2.py
git diff --check
```

## Remaining Risks

- The style openings are deterministic prompt language, not a provider guarantee; real image compliance still depends on GPT Image-2 behavior.
- Word as Design should be smoke-tested with abstract words as well as concrete nouns because material typography may need later per-word heuristics.
- The UI can send style values that are now supported here, but future added UI styles still need corresponding backend opening/directive entries.
