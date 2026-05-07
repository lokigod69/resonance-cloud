# Infographic Lab Generation Safety Verification

Date: 2026-05-07

## Scope

This pass verified the Admin Layer 2 Lab Infographic V1/V2 testing path before paid GPT Image-2 generation. It did not call paid providers and did not change Quick Generate, Standard Card, Clear, Memorable, Weird, Word Design, card pricing, card worker concurrency, retry RPCs, or the same-deck lock.

## Files Changed

- `frontend/scripts/test-admin-layer2-lab.ts`
- `frontend/src/components/admin/WordDetailPanel.tsx`
- `tests/test_orchestration_feeder.py`
- `tests/test_orchestration_recovery.py`
- `tests/test_gpt_image_2_card_integration.py`
- `docs/Implementation/INFOGRAPHIC_LAB_GENERATION_SAFETY_VERIFICATION.md`

## Repeated Same-Word Variant Safety

Result: safe at payload, bootstrap, metadata, and storage-key levels.

The exact `threshold` x 10 template matrix was added to the Admin Lab payload test:

- `infographic_knowledge_guide_v1`
- `infographic_language_atlas_v1`
- `infographic_study_poster_v1`
- `infographic_visual_dictionary_v1`
- `infographic_museum_exhibit_v1`
- `infographic_knowledge_guide_v2`
- `infographic_language_atlas_v2`
- `infographic_study_poster_v2`
- `infographic_visual_dictionary_v2`
- `infographic_museum_exhibit_v2`

Verified behavior:

- All rows keep visible `wordList[0] = "threshold"`.
- All rows keep `layer2_eval.original_word = "threshold"`.
- All rows route through `backend_template = "infographic_prompt_v1"` in both `settings_override.card_layer2` and `settings_override.layer2_eval`.
- Each row preserves its own `infographic_template` and friendly label.
- Meaning strategy and art style are omitted from infographic `layer2_eval`.
- Script cost is `10 x 5 = 50` Premium GPT Image-2 credits.

Backend bootstrap recomputes the lab variant slug from the base word slug, script index, and lab run id, then stores that slug as `words.word_slug`. The verified slug series is:

- `threshold-l2-safe1-001`
- `threshold-l2-safe1-002`
- `threshold-l2-safe1-003`
- `threshold-l2-safe1-004`
- `threshold-l2-safe1-005`
- `threshold-l2-safe1-006`
- `threshold-l2-safe1-007`
- `threshold-l2-safe1-008`
- `threshold-l2-safe1-009`
- `threshold-l2-safe1-010`

The learner-facing word remains `threshold`; the slug changes only the backend workspace/object identity.

## Storage Path Uniqueness

Result: safe.

The card worker upload key is:

```text
{user_id}/{deck_id}/cards/{word_slug}.png
```

Because Admin Lab rows become unique `word_slug` values, the repeated same-word infographic rows write to unique object paths such as:

- `user-1/deck-1/cards/threshold-l2-safe1-001.png`
- `user-1/deck-1/cards/threshold-l2-safe1-010.png`

The regression test explicitly verifies that `user-1/deck-1/cards/threshold.png` is not reused by the 10-row matrix.

## Per-Row Template Isolation

Result: safe.

The Admin Lab payload test now covers a same-deck pair:

- row A: `threshold` x `infographic_knowledge_guide_v1`
- row B: `threshold` x `infographic_museum_exhibit_v2`

Both rows preserve their own template in:

- `settings_override.card_layer2.infographic_template`
- `settings_override.layer2_eval.infographic_template`
- `settings_override.layer2_eval.variant_slug`

No deck-level setting overwrites the per-row selected template. The frontend submit loop still creates one payload per script row and passes the row object into `buildLayer2LabPayload`, so the last selected UI template does not backfill earlier script rows.

## Job and Same-Deck Lock Behavior

Result: expected serialization, not a stuck state.

Admin Layer 2 Lab still submits one `generation_jobs` row per script row. The frontend submit loop calls the generation RPC once per script row, creating the first deck on row 1 and appending later rows to the same deck.

The feeder same-deck lock is intentionally still active for Source 1 new jobs:

- It skips an approved job when the same deck already has a different processing job.
- The skipped job remains `approved`.
- A later feeder cycle can start it after the prior same-deck job leaves `processing`.

For this Admin Lab shape, each row is a one-word job appended to one card deck. Therefore `CARD_CONCURRENCY` can process card jobs across different decks, but these same-deck lab rows are effectively one at a time because only one same-deck job is allowed to be processing through Source 1.

This is a bottleneck by design, not a regression. It should be treated as serialized generation, not a stuck deck, unless a job remains `processing` after its word is terminal or recovery fails to reset stale `pending_image` rows.

## Pending Image Recovery

Result: infographic rows are covered.

Recovery is generic for card words and was extended with infographic-specific regression tests.

Verified stale row:

- `status = processing`
- `current_stage = pending_image`
- `stage_attempts > 0`
- no `thumbnail_url`
- no `image_url`
- no `card_image_url`
- metadata indicates `backend_template = infographic_prompt_v1`
- metadata indicates any V1/V2 `infographic_template`

Expected and verified recovery:

- `current_stage = pending`
- `status = pending`
- `stage_attempts = 0`
- `stage_started_at = null`
- pushed row in `card_queue` contains the updated values
- infographic template metadata is preserved

Verified completed-output row:

- `current_stage = pending_image`
- `stage_attempts > 0`
- existing `image_url`
- metadata indicates `backend_template = infographic_prompt_v1`

Expected and verified recovery:

- row is not reset
- row is not queued
- output URL is preserved
- no regenerate/overwrite path is triggered

## Admin Detail Review Visibility

Result: improved.

`WordDetailPanel` now exposes infographic GPT Image-2 metadata when present:

- Backend Template
- Infographic Template
- Planner Model
- Planner Panel Count
- Planner Pass Count
- Planner Hero Treatment
- Final Prompt Chars
- Final Prompt SHA-256
- Final Prompt Preview
- Base Language Intended
- Target Language
- Planner JSON Preview

The existing Layer 2 Evaluation section already shows the learner-facing word, backend template, and selected infographic template from `metadata.layer2_eval`.

## Browser and Payload Smoke

Payload smoke: passed.

The static Admin Lab script test now verifies all 10 dropdown registry entries, repeated same-word payloads, per-row template isolation, routing to `infographic_prompt_v1`, omitted noisy controls for infographic payloads, and 50-credit cost for 10 rows.

Browser smoke: partially exercised.

The Browser Use Node REPL was unavailable because its Node runtime was `v22.21.0` and the tool requires `>= v22.22.0`. A shell Playwright fallback loaded the local app at `/admin/layer2-lab` against an existing Vite server. The app redirected to `/login` because the Playwright context had no authenticated admin Supabase session. No console/page runtime errors were observed before the auth gate.

Authenticated interaction with the live Admin Lab controls was not automated in this pass. No provider calls were made.

## Tests and Checks Run

Passed:

- `npm run test:admin-layer2-lab`
- `npx eslint src/pages/admin/Layer2Lab.tsx src/lib/adminLayer2Lab.ts src/components/admin/WordDetailPanel.tsx src/components/generate/useWizardState.ts scripts/test-admin-layer2-lab.ts`
- `.venv\Scripts\python.exe -m pytest tests/test_infographic_prompt.py tests/test_layer2_direct_prompt.py tests/test_gpt_image_2_card_integration.py tests/test_gpt_image_2_prompt_composer.py tests/test_card_layer2_resolution.py tests/test_layer2_visual_planning.py tests/test_orchestration_recovery.py tests/test_card_deck_orchestration_isolation.py tests/test_orchestration_feeder.py -q`
- `npm run build`
- `git diff --check`

## Remaining Limitations

- No paid GPT Image-2 or planner provider calls were made.
- Authenticated browser interaction with `/admin/layer2-lab` was not completed because the local browser context had no admin session.
- Same-deck Admin Lab generation is serialized by design. Ten rows should be expected to take roughly ten single-card generations, not one parallel batch.
- If a processing job is externally wedged in a non-terminal state, later same-deck approved jobs will wait behind it until normal completion or recovery.

## Production Test Recommendation

Start with 2 rows in production first:

- `threshold` x `V1 · Knowledge Guide`
- `threshold` x `V2 · Museum Exhibit`

Verify that two distinct cards appear in the same deck, their Admin Word Detail metadata shows different infographic templates, and the first job completes before the second starts. If that behaves as expected, run the full 10-row `threshold` matrix. Expect serialized processing under the same-deck lock.
