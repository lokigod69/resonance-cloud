# Layer 2 Backend Foundation Implementation Report

Date: 2026-05-05
Scope: backend compiler foundation only. No frontend UI, migrations, pricing, Standard Card, or enrichment prompt changes.

## Implemented Meaning Strategies

V1 user-facing/backend-supported:

- `clear_meaning`
- `exaggerated_meaning`
- `absurd_hook`
- `sound_mnemonic`

Internal/future-compatible:

- `embedded_word`, reached through `presentation_form=word_object_design`
- `etymology_origin`, accepted internally but falls back to `clear_meaning` when etymology is missing

## Implemented Presentation Forms

V1 user-facing/backend-supported:

- `single_scene`
- `mini_story`
- `split_panel`
- `word_object_design`

Future-compatible enum placeholders remain present for later quality passes:

- `teaching_card`
- `social_stream_scene`
- `dialogue_bubble_scene`

These are not exposed by this backend foundation pass.

## Implemented Art Styles

`card_image_style` remains the art-style field. The Layer 2 compiler maps these compact style directives:

- `realistic`
- `cinematic`
- `editorial`
- `illustration`
- `anime`
- `studio_ghibli_inspired`
- `disney_animation_inspired`
- `comic_book`
- `pixel_art`
- `vintage_film`
- `oil_painting`
- `surrealism`
- `fantasy_art`
- `pen_and_ink`
- `charcoal_sketch`
- `claymation`
- `ukiyo_e`
- `chinese_ink_wash`
- `art_deco`
- `art_nouveau`

`random` resolves deterministically to the realistic directive for reproducibility.

## Word Object Design

`word_object_design` resolves effective `meaning_strategy` to internal `embedded_word` and stores the chosen effective text mode in metadata as:

- `layer2_resolved.text_embedding_mode`
- `layer2_resolved.effective_text_embedding_mode`

V1 uses `word_as_matter` as the deterministic default. Concrete/abstract detection is intentionally not implemented yet because it is not reliable without a separate quality pass; choosing between `word_as_matter`, `word_as_form`, and environmental typography remains a follow-up.

## Snap And Fallback Rules

Implemented:

- `word_object_design` forces `meaning_strategy=embedded_word`.
- `clear_meaning + word_object_design` snaps presentation to `single_scene` unless `word_object_design` was explicitly selected, in which case meaning becomes `embedded_word`.
- `sound_mnemonic` uses `bridge_mnemonic`, falls back to `mnemonic`, and records a snap note.
- `etymology_origin` falls back to `clear_meaning` when etymology is missing.
- `simple` visual intensity snaps to `balanced` for text-heavy presentation forms.

## Image Bridge And Metadata

`image_bridge` is deterministic, no LLM call, capped at 220 characters, and fuses Meaning Strategy with Presentation Form. It is inserted into the GPT Image-2 prompt between scene and the answer-visibility sentence.

New GPT metadata fields:

- `layer2_user_choices`
- `layer2_resolved`
- `layer2_snap_notes`
- `image_bridge`

## Held Back For Layer 2.5

Intentionally not implemented or exposed in V1:

- social stream scenes
- dialogue bubbles
- speech bubbles
- thought bubbles
- infographic / teaching card presentation
- public `etymology_origin`

These remain conceptually valid but need a separate prompt-quality and answer-leakage pass.

## Default Quick Generate Preservation

When `settings_override.card_layer2` is absent:

- `CardWorker` passes no Layer 2 customization.
- GPT Image-2 prompt assembly uses the existing Quick Generate template.
- `renderer_profile` remains the current `balanced_teaching` default.
- answer-hidden behavior remains unchanged.
- the 1K 16:9 GPT Image-2 path remains unchanged.
- GPT Image-2 failures still do not fall back to a non-GPT provider.

The new art-style directive, image bridge, text directive, and Layer 2 metadata are only applied when structured `card_layer2` settings are present.
