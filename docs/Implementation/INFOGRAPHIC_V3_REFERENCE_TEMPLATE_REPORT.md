# Infographic V3 Reference Template Report

## Summary

V3 is an Admin Layer 2 Lab-only reference-guided infographic branch. V1/V2 still route through `infographic_prompt_v1` as adaptive text-to-image prompts. V3 keeps the planner/compiler flow, but the provider request now uses KIE GPT Image-2 image-to-image when a skeleton reference URL is available.

## Selected Reference Assets

Bundled skeleton PNGs:

- `cloud_engines/image_engine/assets/infographic_references/language_atlas_reference_v3a.png`
- `cloud_engines/image_engine/assets/infographic_references/study_knowledge_reference_v3a.png`
- `cloud_engines/image_engine/assets/infographic_references/museum_exhibit_reference_v3a.png`

The cloud Docker image copies `cloud_engines/` into the image and `.dockerignore` does not exclude PNG files, so the assets are included in cloud/Railway deployments.

## Templates

- `infographic_language_atlas_v3_reference` -> `V3 - Language Atlas Reference`
- `infographic_study_knowledge_v3_reference` -> `V3 - Study / Knowledge Reference`
- `infographic_museum_exhibit_v3_reference` -> `V3 - Museum Exhibit Reference`

Each registry entry stores the enum, label, `reference_mode = skeleton`, `template_reference_id`, `reference_asset_path`, fallback style description, and compatible planner template.

## V3 Versus V1/V2

V1/V2 are fresh-design modes: the planner chooses a word-specific educational plan and the compiler gives the image model broad layout freedom.

V3 is consistent-template mode: the planner still writes word-specific content, but the compiler adds compact reference rules and the provider attaches the selected skeleton. The reference is visual scaffolding only. The model is told to preserve layout rhythm, palette, borders, icon style, typography mood, density, and premium infographic feel while ignoring all reference text.

## KIE Payload

V3 reference runs use the KIE create-task endpoint:

```json
{
  "model": "gpt-image-2-image-to-image",
  "input": {
    "prompt": "<final_prompt>",
    "input_urls": ["https://.../language_atlas_reference_v3a.png"],
    "aspect_ratio": "auto"
  }
}
```

V1/V2 remain text-to-image:

```json
{
  "model": "gpt-image-2-text-to-image",
  "input": {
    "prompt": "<final_prompt>",
    "aspect_ratio": "16:9",
    "resolution": "1K"
  }
}
```

The endpoint remains `/api/v1/jobs/createTask`. V3 uses `aspect_ratio: "auto"` because the KIE image-to-image docs example uses `auto`; the skeleton images themselves are 16:9. Pricing parity is unknown.

## Reference URL Resolution

Local repo paths are never sent directly to KIE. The resolver checks the local asset exists, then resolves an HTTPS URL in this order:

1. Use a registry `reference_url` if present.
2. Use `INFOGRAPHIC_REFERENCE_BASE_URL/<filename>` if configured.
3. Upload the local PNG to Supabase Storage using `SUPABASE_URL` plus `SUPABASE_SERVICE_KEY` or `SUPABASE_KEY`.

Supabase upload defaults:

- bucket: `INFOGRAPHIC_REFERENCE_BUCKET`, default `videos`
- key prefix: `INFOGRAPHIC_REFERENCE_STORAGE_PREFIX`, default `infographic-references`
- content type: `image/png`
- upsert enabled

The returned URL must be HTTPS. Upload failures, missing credentials, missing assets, or non-HTTPS URLs are recorded in metadata.

## Failure Behavior

Admin Lab V3 no longer silently falls back to text-to-image. If a V3 template cannot resolve one HTTPS reference URL, the job fails before the provider call with reference fallback metadata. This prevents a fake reference-guided run from being submitted as `gpt-image-2-text-to-image`.

Blueprint fallback metadata is still recorded for debugging:

- `reference_attached: false`
- `reference_fallback_used: true`
- `reference_fallback_reason: reference_url_unavailable` or `reference_asset_missing`

When the URL is usable:

- `reference_attached: true`
- `reference_fallback_used: false`
- `provider_model: gpt-image-2-image-to-image`

## Metadata Fields

V3 metadata includes:

- `backend_template`
- `infographic_template`
- `provider_model`
- `reference_mode`
- `template_reference_id`
- `template_reference_asset_path`
- `template_reference_url`
- `reference_url_error`
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

Admin Word Detail displays provider model, reference attached, fallback used, reference URL/path, and final prompt preview.

## Tests And Checks

Tests added or updated prove:

- V1/V2 infographic templates still use `gpt-image-2-text-to-image`.
- V3 reference templates use `gpt-image-2-image-to-image`.
- V3 payload includes exactly one `input_urls` entry.
- V3 image-to-image payload omits text-to-image-only `resolution`.
- Missing V3 reference URL fails before the provider and records fallback metadata.
- The Supabase resolver can turn a local skeleton asset into an HTTPS URL.
- The compact V3 compiler prompt includes the ignore-reference-text, base-language, and no-fake-facts rules and stays under 3500 characters in tests.

Run for this change:

- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py -q`
- `npm run test:admin-layer2-lab`
- `npm run build`
- targeted ESLint for changed frontend files
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py tests/test_card_layer2_resolution.py tests/test_layer2_visual_planning.py tests/test_card_deck_orchestration_isolation.py -q`
- `git diff --check`

## Adding Future V3b/V3c Templates

1. Create a clean 16:9 skeleton PNG with no readable content.
2. Add it under `cloud_engines/image_engine/assets/infographic_references/`.
3. Add a `_v3_reference(...)` registry entry in `cloud_engines/image_engine/infographic_prompt.py`.
4. Add the enum to the Admin Lab frontend template type/options.
5. Add registry, asset existence, compiler prompt, metadata, URL resolver, and provider payload tests.
6. Ensure production has either `INFOGRAPHIC_REFERENCE_BASE_URL` or Supabase Storage credentials so V3 can resolve an HTTPS URL.

## Known Risks

- KIE GPT Image-2 image-to-image pricing parity is unknown.
- KIE file size and image dimension constraints were not independently verified beyond using 16:9 PNG skeletons and documented payload fields.
- Supabase public URL access depends on bucket policy; private buckets require a signed-URL extension before production use.
- Reference-guided output quality still needs Admin Lab review before V3 is exposed to normal users.
