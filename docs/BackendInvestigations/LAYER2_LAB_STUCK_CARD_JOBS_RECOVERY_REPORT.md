# Layer 2 Lab Stuck Card Jobs Recovery Report

Date: 2026-05-06

## Root Cause

Startup recovery requeued `pending_image` words without resetting them. A card word left at:

- `current_stage='pending_image'`
- `status='processing'`
- `stage_attempts > 0`
- no `thumbnail_url`

is treated by `CardWorker` as an already-active duplicate and released. After a crash or restart, that row can therefore remain wedged forever. Later Layer 2 Lab jobs on the same deck stay `approved` because the same-deck processing lock correctly sees the stale `processing` job.

## Code Change

Updated `src/orchestration/recovery.py`:

- `pending_image` recovery now reverts the word to `current_stage='pending'`.
- Recovered rows get worker-processable `status='pending'` via `state.map_stage_to_status('pending')`.
- `stage_attempts` resets to `0`.
- `stage_started_at` clears to `NULL` for `pending_image -> pending`, removing the stale active-stage timestamp.
- The in-memory row pushed to `card_queue` is updated with the same recovered values.
- Adversarial review found that `pending_image` rows with existing card output must not be reset and regenerated. Recovery now skips `pending_image` rows when `thumbnail_url`, `image_url`, or `card_image_url` is already present. This preserves output from the crash window where the thumbnail was written but the final `pending_image -> complete` transition did not land.

The existing Feeder Source 3 behavior then keeps recovered card rows queueable:

- `pending` + `deck_type='card'` routes to `card_queue`.
- `pending_image` still routes to `card_queue` for retry-reentry paths.

## Tests Run

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_orchestration_recovery.py -q
```

Result: `13 passed, 1 warning`.

After the adversarial-review thumbnail guard:

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_orchestration_recovery.py -q
```

Result: `14 passed, 1 warning`.

```powershell
.\.venv\Scripts\python.exe -m pytest tests/test_card_deck_orchestration_isolation.py tests/test_orchestration_feeder.py tests/test_orchestration_finalizer.py -q
```

Result: `42 passed, 1 warning`.

```powershell
git diff --check
```

Result: passed with no whitespace errors.

## Intentionally Not Changed

- `CARD_CONCURRENCY` was not changed.
- The same-deck lock was not removed or weakened.
- Provider API behavior was not changed.
- GPT Image-2 prompts were not changed.
- `submit_generation` and `request_word_retry` were not changed.
- Pricing was not changed.
- Frontend card queue UX files were not changed as part of this backend fix.
- No manual SQL was executed.

## Remaining Work

This is the minimum startup recovery fix. It handles crash/restart leftovers, but it does not solve live hangs where a running `CardWorker` remains blocked inside a provider call.

Remaining recommended follow-up:

- Persist provider submit/task identity before long polling.
- Add a conservative live `pending_image` watchdog for old active rows with no thumbnail and no completed render/upload event.
- Prefer resuming/polling a known provider task before issuing a duplicate provider call.

## Manual SQL Recovery Proposal

Do not run without explicit approval.

The safest manual recovery is to reset only the known stale words back to `pending`, guarded by exact word/job IDs, active stage/status, and missing thumbnail. Leave parent jobs as `processing` so Feeder Source 3 can requeue the words and the Finalizer can complete the jobs after card generation succeeds.

```sql
begin;

update public.words
set
  current_stage = 'pending',
  status = 'pending',
  stage_attempts = 0,
  stage_started_at = null
where id = '678062b0-f89a-4393-8f50-57d134fa3b43'
  and generation_job_id = '30c179b0-c043-45e1-8148-f16da98da898'
  and current_stage = 'pending_image'
  and status = 'processing'
  and thumbnail_url is null;

update public.words
set
  current_stage = 'pending',
  status = 'pending',
  stage_attempts = 0,
  stage_started_at = null
where id = '027ec337-3691-4aed-8552-5d8b53b21985'
  and generation_job_id = '21d98897-3684-420a-a9a0-4e14f12d1f11'
  and current_stage = 'pending_image'
  and status = 'processing'
  and thumbnail_url is null;

-- Optional older stale Layer 2 Lab word:
update public.words
set
  current_stage = 'pending',
  status = 'pending',
  stage_attempts = 0,
  stage_started_at = null
where id = '5263f140-146d-45aa-8fb4-eb805dcf3ef1'
  and generation_job_id = '5271999e-e3c2-420b-86e0-4ed2d88c95c7'
  and current_stage = 'pending_image'
  and status = 'processing'
  and thumbnail_url is null;

-- Review affected row counts before commit.
commit;
```
