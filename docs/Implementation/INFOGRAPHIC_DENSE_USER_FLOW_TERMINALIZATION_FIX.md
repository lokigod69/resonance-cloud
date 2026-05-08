# Dense Infographic User Flow Terminalization Fix

## Scope

This pass fixes user-facing Premium Card -> Customize -> Infographic -> Dense Encyclopedia rows that fail before the image provider. It does not change V1/V2/V3 prompt templates, user-facing Infographic UI, Standard Card, Quick Generate, or metadata display priority.

## Investigated Path

User-facing Dense Encyclopedia uses the same backend route/template pair as Admin Lab Dense:

- `backend_template = infographic_prompt_v1`
- `presentation_form = infographic_card`
- `infographic_template = infographic_dense_editorial_v4`

The user-facing lane payload test now compares the Dense user route against the Admin Lab Dense route for backend, presentation, and template.

## Root Cause

Dense V4 validator failures were correctly failing before KIE/GPT Image-2, and the engine metadata contained:

- `failure_origin = validator`
- `provider_reached = false`
- `validator_hard_errors`
- `validator_warnings`
- `validator_retry_count`
- `final_prompt_preview`
- `prompt_attempt_count`

However, `generate_card_image()` wrapped all failed GPT Image-2 render results as retryable, including before-provider validator failures. The card worker then treated the deterministic validator failure as a normal retryable `pending_image` failure and re-entered the stage budget instead of terminalizing the word immediately.

## Fix

`cloud_engines/image_engine/card_engine.py` now marks before-provider GPT card failures as non-retryable when:

- `failure_origin` is `validator` or `prompt_writer` and `provider_reached` is `false`, or
- `validator_passed` is `false`.

`src/orchestration/card_worker.py` now recognizes terminal before-provider card failures and raises a terminal stage exception. `retry.run_stage_with_budget()` supports terminal exception pass-through so the worker can call `mark_word_failed` immediately rather than retrying the same validator failure three times.

Failed GPT Image-2 metadata is still persisted before terminalization.

## Expected Behavior

For `wishful thinking` with Dense Encyclopedia:

- If V4 validates, provider is reached.
- If V4 validator hard errors remain, provider is not called.
- The word becomes terminal failed at `failed_stage = pending_image`.
- `words.metadata.gpt_image_2_card` keeps validator and prompt debug fields.
- The one-word job finalizes as failed.
- Later same-deck approved jobs can start after finalization.
- Deck/admin diagnostics show “Validator failed before provider” when validator metadata is present.

## Tests

Added or updated coverage:

- V4 validator hard failure stops before provider and returns a non-retryable card result.
- V4 warning-only prompts still reach GPT Image-2.
- User-facing Dense settings route matches Admin Lab Dense backend/template/presentation.
- User-facing Dense validator failure terminalizes the word after one card attempt.
- Failed V4 before-provider metadata remains persisted on the word.
- Same-deck later approved jobs can start after a Dense validator failure finalizes.

## Verification

Commands to run for this pass:

- `npm run test:lane-payload`
- `npm run test:admin-layer2-lab`
- `npm run build`
- targeted ESLint for changed files
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py tests/test_card_layer2_resolution.py tests/test_orchestration_finalizer.py tests/test_orchestration_recovery.py -q`
- `git diff --check`
