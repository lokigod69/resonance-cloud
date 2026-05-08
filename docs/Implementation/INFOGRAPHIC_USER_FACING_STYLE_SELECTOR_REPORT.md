# Infographic User-Facing Style Selector Report

## Final Frontend QA Pass

Actual UI bug found: the Infographic style selector was wired, but selecting **Infographic** left the disabled Meaning Strategy and Art Style controls rendered as full option grids. On shorter Generate viewports, those inactive grids pushed **Infographic Style** below the visible area, so the live UI looked like the selector never appeared.

Fix:

- Premium Customize now compacts inactive **Meaning Strategy** and **Art Style** rows for Infographic.
- **Presentation Form** remains active, with **Infographic** visibly selected.
- **Infographic Style** appears directly under Presentation Form, with the helper text: "Infographics use dedicated educational-poster prompting. Meaning Strategy and Art Style do not apply."
- Word Design remains a normal presentation form and keeps Meaning Strategy and Art Style active.
- The odd extra Word Design description was removed for visual consistency.

Classic and Glassy both pass `premiumInfographicStyle` into `PremiumCardCustomizationStep` and update it through `onInfographicStyleChange`. The shared reducer path in `useWizardState.ts` and the Glassy local submit path in `GenerateGO.tsx` both route custom Infographic through `infographic_prompt_v1` with the selected user-facing template.

Quick Infographic still submits immediately from the Words screen. It does not open a style chooser and maps **Auto** to `infographic_study_poster_v2`.

Polish completed:

- Generate selection summary pills (`English`, `Premium Card`, `1 word`) now have a subtle top offset from the header/nav.
- Art style labels are now user-facing: **Studio Ghibli**, **Disney**, and **Charcoal**.
- Rick and Morty already had an existing style-specific asset at `premium-style-samples/rick_and_morty_style.webp`; the premium visual asset map points to it.

## User-Facing UX

Premium Card keeps the existing Words screen quick-mode flow. Clicking **Infographic** submits immediately, matching Clear, Memorable, Weird, and Word Design. That quick path uses the user-facing **Auto** style.

Premium Card Customize keeps **Infographic** in the Presentation Form row. When Infographic is selected, Meaning Strategy and Art Style remain visible but inactive, with the note:

> Infographics use dedicated educational-poster prompting. Meaning Strategy and Art Style do not apply.

The Infographic Style selector appears below Presentation Form and uses only user-facing labels.

## Quick Infographic Behavior

Words screen quick Infographic sends:

- `premium_quick_mode = infographic`
- `card_layer2.backend_template = infographic_prompt_v1`
- `card_layer2.presentation_form = infographic_card`
- `card_layer2.infographic_template = infographic_study_poster_v2`
- `premium_generation_mode.infographic_template = infographic_study_poster_v2`

The quick Infographic payload omits meaningful `art_style` and `meaning_strategy` metadata. The legacy `card_layer2.meaning_strategy` field remains as an implementation-only compatibility default.

## Customize Behavior

For non-Infographic presentation forms, Premium Customize continues to use:

- Meaning Strategy
- Presentation Form
- Art Style

For Infographic presentation form, the payload routes through `infographic_prompt_v1`, includes the selected mapped `infographic_template`, omits `card_image_style`, and omits meaningful art/meaning fields from `premium_generation_mode`.

## Mapping

| User Style | Internal Template |
| --- | --- |
| Auto | `infographic_study_poster_v2` |
| Study Poster | `infographic_study_poster_v2` |
| Visual Dictionary | `infographic_visual_dictionary_v2` |
| Language Atlas | `infographic_language_atlas_v2` |
| Museum Exhibit | `infographic_museum_exhibit_v2` |
| Dense Encyclopedia | `infographic_dense_editorial_v4` |

## Admin-Only Templates

V3 Reference templates remain Admin Lab only because they are image-to-image and still belong to the future consistent-template experiment. User-facing UI does not expose V1/V2/V3/V4 labels, reference labels, or internal enum values.

Dense Encyclopedia is visible as an experimental user-facing style, but it is not labeled V4.

## V4 Prompt Caching

Dense Editorial V4 now persists a validated `final_prompt` before the provider call. Metadata includes:

- `final_prompt`
- `final_prompt_hash`
- `prompt_writer_model`
- `prompt_attempt_count`
- `provider_attempt_count`
- `reused_cached_prompt`
- `retry_used_cached_prompt`
- validator state

Provider failure or timeout retries reuse the cached final prompt. The prompt writer is called again only when no valid cached prompt exists, the cached prompt is corrupt, or the prior failure came from the validator or prompt writer.

## Safety Text Cleanup

The V4 final provider prompt no longer includes visible-safety phrases such as “No fake facts”, “No fake quotes”, “No fake etymologies”, “No forced mnemonics”, “Info is verified”, or “Teaching real language”. The validator now blocks prompts that ask to render those phrases as a footer, badge, watermark, shield, note, label, panel, plaque, or similar visible text.

## Tests And Checks

Run in this QA pass:

- `npm run test:admin-layer2-lab`
- `npm run test:lane-payload`
- `npx eslint src/components/generate/useWizardState.ts src/components/generate/premiumVisualAssets.ts src/components/generate/shared/PremiumVisualSelectors.tsx src/components/generate/steps/PremiumCardCustomizationStep.tsx src/pages/GenerateGO.tsx src/pages/GeneratePG.tsx scripts/test-product-lane-payload.ts`
- `npm run build`
- `.venv\Scripts\python.exe -m pytest tests/test_gpt_image_2_card_integration.py tests/test_card_layer2_resolution.py tests/test_infographic_prompt.py -q`
- `git diff --check`
- Local Playwright component harness against Vite for `PremiumCardCustomizationStep`: after selecting Infographic, `Visual Dictionary` appears inside a 700px viewport, inactive Meaning/Art option buttons are absent, and Continue fires.

Notes:

- The package exposes this payload script as `test:lane-payload`; no separate `test:product-lane-payload` script is currently present.
- `npm run build` completed with existing Vite warnings for mixed static/dynamic Supabase imports and a large chunk.
- Python tests completed with existing third-party deprecation warnings.

## Remaining Risks

- The V4 prompt cache is local to the per-word card-image output directory. It covers normal worker retries and timeout retry recovery in the same workspace, but not cross-machine retries without the local workspace cache.
- Dense Encyclopedia remains experimental and can still fail provider-side even when prompt validation passes.
