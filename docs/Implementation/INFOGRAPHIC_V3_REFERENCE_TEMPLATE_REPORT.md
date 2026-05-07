# Infographic V3 Reference Template Report

## Summary

V3 adds Admin Layer 2 Lab-only reference-guided infographic templates. V1/V2 remain adaptive fresh-design prompts through `infographic_prompt_v1`; V3 keeps the same planner/compiler architecture but adds a skeleton reference registry, reference-safe compiler rules, reference metadata, and provider attachment hooks when a usable reference URL exists.

## Selected Reference Assets

Assets are stored under:

- `cloud_engines/image_engine/assets/infographic_references/language_atlas_reference_v3a.png`
- `cloud_engines/image_engine/assets/infographic_references/study_knowledge_reference_v3a.png`
- `cloud_engines/image_engine/assets/infographic_references/museum_exhibit_reference_v3a.png`

The cloud Docker image copies `cloud_engines/` into `/app/cloud_engines/`, and `.dockerignore` does not exclude PNG files, so these assets are included in the cloud/Railway image.

## V3 Templates

- `infographic_language_atlas_v3_reference` -> `V3 · Language Atlas Reference`
- `infographic_study_knowledge_v3_reference` -> `V3 · Study / Knowledge Reference`
- `infographic_museum_exhibit_v3_reference` -> `V3 · Museum Exhibit Reference`

Each registry entry stores:

- template enum
- label
- `reference_mode = skeleton`
- `template_reference_id`
- `reference_asset_path`
- optional `reference_url`
- fallback style description
- compatible planner template, currently `infographic_prompt_v1`

## Difference From V1/V2

V1/V2 are adaptive fresh-design prompts: the planner chooses a word-specific structure and the compiler gives the image model broad layout freedom.

V3 is consistent-template mode: the planner still writes word-specific educational content, while the compiler instructs the image model to use a selected skeleton only as visual scaffolding. The compiler preserves composition, panel rhythm, palette, border style, typography mood, icon style, and density, but rejects all readable text from the reference.

## Provider Reference Support

The current GPT Image-2 KIE adapter supports image-to-image/reference input only when a URL list is already available:

- text-to-image model: `gpt-image-2-text-to-image`
- image-to-image model: `gpt-image-2-image-to-image`
- payload field: `input.input_urls`
- prompt field: `input.prompt`
- other fields used by the adapter: `input.aspect_ratio`, `input.resolution`

The adapter does not currently upload local repo files to a public URL. Because the V3 assets are local PNG files, the default behavior is blueprint-only fallback unless `INFOGRAPHIC_REFERENCE_BASE_URL` or a registry `reference_url` provides a reachable image URL.

Supported external file constraints are not verified in this change beyond the existing code path accepting URL strings. The three bundled assets are PNG and 16:9.

## Pricing Status

Pricing parity is unknown. The adapter currently applies the same internal `KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K` estimate for both GPT Image-2 text-to-image and image-to-image calls, but this change does not verify KIE pricing parity for reference-image jobs.

## Fallback Behavior

If a V3 asset is missing, has no usable URL, or cannot be attached, generation does not crash. The final prompt includes a text blueprint fallback description of the skeleton layout, and metadata records the fallback.

Common fallback metadata:

- `reference_attached: false`
- `reference_fallback_used: true`
- `reference_fallback_reason: reference_url_unavailable` or `reference_asset_missing`

If a reference URL is available, the provider receives `input_urls` and metadata records:

- `reference_attached: true`
- `reference_fallback_used: false`

## Metadata Fields

V3 metadata includes:

- `backend_template`
- `infographic_template`
- `reference_mode`
- `template_reference_id`
- `template_reference_asset_path`
- `template_reference_url`
- `reference_attached`
- `reference_fallback_used`
- `reference_fallback_reason`
- `reference_asset_exists`
- `fallback_style_description`
- `final_prompt_preview`
- `final_prompt_hash`
- `final_prompt_sha256`
- `planner_pass_count`
- `base_language_intended`
- `target_language`

## Tests And Checks

Run for this change:

- `npm run test:admin-layer2-lab`
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py -q`
- `npm run build`
- `npx eslint src/lib/adminLayer2Lab.ts src/components/generate/useWizardState.ts scripts/test-admin-layer2-lab.ts`
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py tests/test_card_layer2_resolution.py tests/test_layer2_visual_planning.py tests/test_card_deck_orchestration_isolation.py -q`
- `.venv\Scripts\python.exe -m pytest tests/test_orchestration_feeder.py -q`
- `git diff --check`

## Adding Future V3b/V3c Templates

1. Generate a clean skeleton reference image with no readable content.
2. Add the PNG under `cloud_engines/image_engine/assets/infographic_references/`.
3. Add a `_v3_reference(...)` entry in `cloud_engines/image_engine/infographic_prompt.py`.
4. Add the enum to `InfographicTemplate` in `frontend/src/components/generate/useWizardState.ts`.
5. Add the option to `INFOGRAPHIC_TEMPLATE_OPTIONS` in `frontend/src/lib/adminLayer2Lab.ts`.
6. Add registry, asset-existence, compiler-rule, metadata, and Admin Lab payload tests.
7. If provider attachment is required, provide a stable public `reference_url` or implement/upload-test a local asset upload path first.

## Production Risks

- Local assets are not attachable without a public URL/upload path, so production V3 currently relies on prompt blueprint fallback unless `INFOGRAPHIC_REFERENCE_BASE_URL` is configured.
- GPT Image-2 image-to-image pricing parity is unknown.
- KIE file constraints for reference images are not verified by this change.
- Reference-guided generation can still copy structure too literally if the model ignores rules; skeletons intentionally avoid readable words to reduce leakage.
- V3 is intentionally Admin Lab-only until production output quality is reviewed.
