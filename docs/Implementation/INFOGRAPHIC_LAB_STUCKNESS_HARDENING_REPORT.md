# Infographic Lab Stuckness Hardening Report

Date: 2026-05-07

## Summary

The same-deck serialization is expected: Admin Layer 2 Lab submits one script row as one `generation_jobs` row, each row appends one word to the same card deck, and the feeder allows only one `processing` job per deck.

The live stuckness was a real wedge risk, not just expected serialization, if a prior one-word card job stayed `generation_jobs.status = processing` after its word had already reached a terminal state or after a card output had already been persisted.

## Cause

Two blocking patterns were found and hardened:

1. `words.status` could be terminal while `words.current_stage` remained active, such as `current_stage = pending_image` and `status = failed`. The finalizer previously trusted `current_stage` first, so the job was not considered terminal and the same-deck lock kept later approved rows waiting.
2. Startup recovery intentionally avoided regenerating `pending_image` card words that already had `thumbnail_url`, `image_url`, or `card_image_url`, but it left them active. That avoided duplicate paid image generation but could still leave the job processing until manual repair.

Provider hangs were also hardened with a card render timeout. A timed-out render now returns a normal card-generation failure path, exhausts/retries under the existing `pending_image` budget, and eventually marks the word failed instead of letting the worker wait forever.

## Fixes Applied

- `src/orchestration/finalizer.py`
  - Terminal `current_stage` still wins when present.
  - Terminal `status` now also counts if `current_stage` is stuck in an active state.
  - A one-word job with `status = failed` and `current_stage = pending_image` finalizes to `generation_jobs.status = failed`.

- `src/orchestration/recovery.py`
  - `pending_image` rows with an existing card output are finalized to `complete` without requeueing or regenerating.

- `src/orchestration/card_worker.py`
  - Added `CARD_IMAGE_RENDER_TIMEOUT_SECONDS`, default `360`.
  - A render timeout returns a bounded failure and does not upload.

- `cloud_engines/image_engine/infographic_prompt.py`
  - Safety rules are now explicitly internal instructions only.
  - Planner `footer_line`, panel text, visual notes, and avoid-list items that contain safety-rule leakage such as `No invented facts` or `Keine erfundenen Fakten` are filtered out of visible display content.

## Impact

Expected serialization remains unchanged. Row 4 should wait while row 3 is genuinely processing.

A failed or recovered row 3 should no longer block rows 4-10 forever after finalizer/recovery runs. If row 3 terminalizes, the next feeder cycle can claim row 4.

No broad admin repair RPC was added because the preferred automatic finalizer/recovery repairs now cover the narrow stuck shape. Manual SQL should not be needed for this pattern after deploy.

## Tests

Added or updated coverage for:

- one-word card job finalizes when word `status` is terminal but stage is stuck active
- same-deck approved job can start after prior same-deck failed job finalizes
- infographic/card `pending_image` rows with existing output complete without regeneration
- card render timeout returns failure without upload
- infographic safety/avoid text is not compiled as visible panel/footer content

Verification run:

- `.venv\Scripts\python.exe -m pytest tests/test_orchestration_finalizer.py tests/test_orchestration_feeder.py tests/test_orchestration_recovery.py tests/test_card_deck_orchestration_isolation.py tests/test_infographic_prompt.py tests/test_gpt_image_2_card_integration.py -q`
- `npm run build`
- `npm run test:admin-layer2-lab`

## Production Testing Recommendation

After Railway redeploy, resume with a same-deck Infographic Lab run of at least 10 rows. If one row fails, confirm the row becomes terminal and later approved rows continue on the next feeder/finalizer cycle rather than waiting indefinitely.

If a row appears stuck, inspect:

```sql
select id, status, deck_id, words_completed, words_failed, started_at, completed_at, error_message
from generation_jobs
where deck_id = '<deck-id>'
order by created_at;

select id, word, status, current_stage, failed_stage, thumbnail_url, image_url, card_image_url, generation_job_id, error_message
from words
where deck_id = '<deck-id>'
order by created_at;
```

Expected post-fix repair state: any one-word job whose word is terminal should become `failed`, `complete`, or `partial`; it should not remain `processing` forever.
