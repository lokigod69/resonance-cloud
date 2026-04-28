# PIPELINE_REFACTOR_FIX_ROUND2_HANDOFF

## Section 1 — Fixes applied

### CRIT-2.1 — `stage_attempts` resets on cross-stage transitions
- Summary: moved the cross-stage vs same-stage `stage_attempts` semantics into `transition_word_stage` itself, so cross-stage entry becomes attempt `1`, same-stage re-entry increments in place, and callers do not need bespoke reset logic.
- Files modified:
  - `orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql:50-100,169-172`
  - `orchestrator/tests/fake_supabase.py:170-206`
  - `orchestrator/src/orchestration/state.py:168-194`
- Tests added:
  - `orchestrator/tests/test_orchestration_state.py:55-124`
  - `orchestrator/tests/test_orchestration_retry.py:113-145`
- What they catch pre-fix:
  - The new state tests fail if `images(stage_attempts=2) -> concept` enters concept at `3` instead of `1`.
  - The same-stage re-entry test fails if a retry bump stops incrementing in place.
  - The retry helper test fails if a rejected bump is silently treated as success.

### CRIT-2.2 — retry bumps exit cleanly on `False`
- Summary: centralized same-stage retry bumps in `retry.bump_same_stage_or_release()`, taught `run_stage_with_budget()` to surface a `RetryReleased` control path, and updated every worker retry site to stop work immediately when the guarded bump is rejected.
- Files modified:
  - `orchestrator/src/orchestration/retry.py:81-150`
  - `orchestrator/src/orchestration/upstream_worker.py:185-197`
  - `orchestrator/src/orchestration/video_dispatcher.py:123-136`
  - `orchestrator/src/orchestration/downstream_worker.py:328-330,498-549,599,648-680`
- Tests added:
  - `orchestrator/tests/test_orchestration_worker_retries.py:142-605`
  - `orchestrator/tests/test_orchestration_timers.py:70-149`
- What they catch pre-fix:
  - The five cancel-mid-retry tests fail if upstream/video/downstream keep retrying after the row flips to `cancelling`.
  - The five happy-path retry tests fail if the centralized helper blocks legitimate retries.
  - The upload race test fails if a slower replica keeps going after a faster replica already completed the word.
  - The timer tests fail if a retry-release path skips the worker finally-block emit/clear path.

### CRIT-2.3 — remove redundant `status='complete'` write from `publishing.py`
- Summary: publishing now writes only artifact URLs; the orchestrator remains the sole writer of terminal status/current_stage.
- Files modified:
  - `orchestrator/src/services/publishing.py:141-151`
- Tests added:
  - `orchestrator/tests/test_orchestration_music_state.py:388-482`
- What they catch pre-fix:
  - The direct publishing test fails if `upload_ab_results()` still mutates `status`.
  - The crash-window test fails if `status` flips to `complete` before the orchestrator lands `current_stage='complete'`.

### HIGH-2.1 — Silent-`False` handling audit
- Summary: audited every production caller of `state.transition_stage`, `state.claim_retry`, and `state.mark_failed`; there are no remaining silent-`False` call sites. Same-stage retry bumps now go through one shared wrapper.
- Files modified:
  - `orchestrator/src/orchestration/retry.py:85-110`
  - `orchestrator/src/orchestration/upstream_worker.py:142-197`
  - `orchestrator/src/orchestration/video_dispatcher.py:80-158`
  - `orchestrator/src/orchestration/downstream_worker.py:127-680`
  - `orchestrator/src/orchestration/feeder.py:346-354,508-523,682-698`
- Tests added:
  - covered by the worker-path retry tests, bootstrap tests, and the existing state/feeder transition tests.

### HIGH-2.2 — tests now exercise the actual worker/infrastructure paths
- Summary: added worker-path concurrency, submit-failure routing, bootstrap ordering/cancellation, rendered logging-format, SIGTERM drain, and timer-emission tests instead of proving only the underlying primitive in isolation.
- Files modified:
  - `orchestrator/tests/test_orchestration_music_state.py:165-482`
  - `orchestrator/tests/test_orchestration_feeder.py:335-613`
  - `orchestrator/tests/test_orchestration_logging.py:112-139`
  - `orchestrator/tests/test_orchestration_job_runner.py:32-157`
  - `orchestrator/tests/test_orchestration_timers.py:70-149`
  - `orchestrator/tests/test_orchestration_worker_retries.py:142-605`
- What they catch pre-fix:
  - downstream worker exclusivity would execute branch code twice,
  - inline submit failure would still call bake,
  - bootstrap could expose `pending` before `manifest.json`,
  - bootstrap could still stomp a `cancelling` word,
  - deployed logging format could omit rendered `word=` / `stage=` tokens,
  - SIGTERM drain could skip orderly `stop()` calls,
  - timer emit/clear could fail on failure or release paths.

### HIGH-2.3 — rollback comments added to RPC migration
- Summary: documented the reverse-order `DROP FUNCTION` statements immediately in the migration file.
- Files modified:
  - `orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql:169-172`
- Tests added:
  - none; documentation-only change.

### LOW-2.1 — `__init__.py` absolute-path reference
- Status: no code change needed. `orchestrator/src/orchestration/__init__.py` already referenced `PIPELINE_REFACTOR_DESIGN_V4_FINAL.md` by filename only.

## Section 2 — Silent-False call-site matrix

| Call site | On-`False` behavior | Correct? |
| --- | --- | --- |
| `src/orchestration/retry.py:54` `state.mark_failed()` inside `finalize_failure()` | Logs “already marked failed” and skips refund if not owner. | Yes |
| `src/orchestration/retry.py:98` `state.transition_stage()` inside `bump_same_stage_or_release()` | Logs release and returns `False` to the caller. | Yes |
| `src/orchestration/feeder.py:346` `state.claim_retry()` | Logs stale/live/raced retry and returns without queueing. | Yes |
| `src/orchestration/feeder.py:508` `pending -> enrichment` | Skips the word and leaves it untouched. | Yes |
| `src/orchestration/feeder.py:682` `enrichment -> pending` | Logs and leaves the word in enrichment/cancelling instead of stomping it. | Yes |
| `src/orchestration/upstream_worker.py:142` stage-entry claim | Logs and aborts the stage for that word. | Yes |
| `src/orchestration/upstream_worker.py:186` same-stage retry bump via helper | `RetryReleased` bubbles out; worker returns without more writes. | Yes |
| `src/orchestration/upstream_worker.py:111` `song -> video_queued` | Logs and returns without queue handoff. | Yes |
| `src/orchestration/video_dispatcher.py:80` `video_queued -> video` claim | Logs and exits cleanly. | Yes |
| `src/orchestration/video_dispatcher.py:124` same-stage retry bump via helper | `RetryReleased` clears log context and exits. | Yes |
| `src/orchestration/video_dispatcher.py:146` `video -> post_video_queued` | Logs and returns without downstream handoff. | Yes |
| `src/orchestration/downstream_worker.py:127` `post_video_queued -> branch_target` claim | Logs and exits cleanly. | Yes |
| `src/orchestration/downstream_worker.py:260` `suno_bake -> assembly` submit-failed reroute | Logs and exits if reroute lost. | Yes |
| `src/orchestration/downstream_worker.py:287` fallback reroute to `assembly` | Returns `False` and stops work. | Yes |
| `src/orchestration/downstream_worker.py:328` `suno_bake` retry bump via helper | Returns `False` and stops before another bake call. | Yes |
| `src/orchestration/downstream_worker.py:363` `suno_bake -> uploading` | Logs and exits cleanly. | Yes |
| `src/orchestration/downstream_worker.py:387` bake-exhausted `suno_bake -> assembly` | Returns `False` and exits if transition lost. | Yes |
| `src/orchestration/downstream_worker.py:498` assembly retry path | `RetryReleased` now returns out of `_run_ab_pipeline()` without terminal-failing A. | Yes |
| `src/orchestration/downstream_worker.py:544` bookend retry path | `RetryReleased` now exits instead of falling through to upload. | Yes |
| `src/orchestration/downstream_worker.py:523` `assembly/bookend -> uploading` | Logs and exits cleanly. | Yes |
| `src/orchestration/downstream_worker.py:648` upload retry bump via helper | Returns `False` and stops before another upload attempt. | Yes |
| `src/orchestration/downstream_worker.py:680` `uploading -> complete` | Logs and exits if another actor already moved the word. | Yes |

Result: no remaining production caller silently ignores a rejected boolean return.

## Section 3 — Migration changes

### SQL additions
- Updated `transition_word_stage` so `stage_attempts` is derived from `current_stage` vs `p_new_stage`, not just `p_increment_attempts`.
- Added rollback comment block with the three `DROP FUNCTION IF EXISTS ...` statements.

### Updated RPC function (`transition_word_stage`)

```sql
CREATE OR REPLACE FUNCTION transition_word_stage(
    p_word_id              uuid,
    p_allowed_prior_stages text[],
    p_new_stage            text,
    p_new_status           text,
    p_increment_attempts   boolean,
    p_additional_updates   jsonb DEFAULT '{}'::jsonb
) RETURNS boolean
LANGUAGE plpgsql
AS $$
DECLARE
    rows_affected integer;
BEGIN
    UPDATE public.words
    SET current_stage        = p_new_stage,
        status               = p_new_status,
        stage_started_at     = now(),
        stage_attempts       = CASE
                                    WHEN current_stage != p_new_stage
                                         AND p_increment_attempts THEN 1
                                    WHEN current_stage != p_new_stage THEN 0
                                    WHEN p_increment_attempts
                                         THEN stage_attempts + 1
                                    ELSE 0
                               END,
        total_stage_attempts = total_stage_attempts +
                               CASE WHEN p_increment_attempts THEN 1 ELSE 0 END,
        music_state          = CASE WHEN p_additional_updates ? 'music_state'
                                    THEN p_additional_updates->>'music_state'
                                    ELSE music_state
                               END,
        suno_task_id         = CASE WHEN p_additional_updates ? 'suno_task_id'
                                    THEN p_additional_updates->>'suno_task_id'
                                    ELSE suno_task_id
                               END,
        suno_audio_url       = CASE WHEN p_additional_updates ? 'suno_audio_url'
                                    THEN p_additional_updates->>'suno_audio_url'
                                    ELSE suno_audio_url
                               END,
        failed_stage         = CASE WHEN p_additional_updates ? 'failed_stage'
                                    THEN p_additional_updates->>'failed_stage'
                                    ELSE failed_stage
                               END
    WHERE id              = p_word_id
      AND current_stage   = ANY(p_allowed_prior_stages)
      AND current_stage  != 'cancelling';

    GET DIAGNOSTICS rows_affected = ROW_COUNT;
    RETURN rows_affected = 1;
END;
$$;
```

## Section 4 — Test suite status

- Total count before round 2: `63` (round-1 handoff claim).
- Total count after round 2: `90`.
- Net new tests: `27`.
- New tests by fix area:
  - CRIT-2.1: 5 tests (`test_orchestration_state.py`, `test_orchestration_retry.py`)
  - CRIT-2.2 / HIGH-2.1: 11 worker retry tests (`test_orchestration_worker_retries.py`)
  - CRIT-2 / CRIT-5 / CRIT-2.3: 5 downstream worker/publishing tests (`test_orchestration_music_state.py`)
  - HIGH-2 / HIGH-3: 3 bootstrap tests (`test_orchestration_feeder.py`)
  - HIGH-5: 1 rendered logging-format test (`test_orchestration_logging.py`)
  - MED-1: 1 SIGTERM drain test (`test_orchestration_job_runner.py`)
  - MED-3: 2 timer emit/clear tests (`test_orchestration_timers.py`)
- Environment note:
  - `pytest` was missing from the orchestrator venv. Installed via `python -m ensurepip` and `python -m pip install pytest` before executing the suite.

### Full run output

Command:

```powershell
D:\CODING\ResonanceTEST\orchestrator\.venv\Scripts\python.exe -m pytest `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_feeder.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_integration.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_job_runner.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_logging.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_music_state.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_recovery.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_retry.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_state.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_timers.py `
  D:\CODING\ResonanceTEST\orchestrator\tests\test_orchestration_worker_retries.py -q
```

Output:

```text
90 passed in 53.29s
```

## Section 5 — Regression audit

- Round-1 orchestration tests still pass; the full orchestration suite is green at `90 passed`.
- The retry-release propagation did not introduce a new downstream regression:
  - A-side assembly release no longer falls into `finalize_failure()`.
  - Bookend release no longer falls through to upload.
- The HIGH-6 fix is now structural, not a recovery band-aid:
  - `publishing.py` no longer writes terminal `status`,
  - `_upload_and_complete()` remains the only path that lands `current_stage='complete'`.
- Scope stayed within the round-2 brief:
  - no new changes to the protected engines/adapters/service files,
  - the only touched protected-area exception is the authorized one-line removal in `src/services/publishing.py`.

## Section 6 — Verification checklist

1. Open `orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql` and confirm the `stage_attempts` `CASE` distinguishes cross-stage from same-stage entry.
2. Open `orchestrator/tests/fake_supabase.py` and confirm `_handle_transition_word_stage()` captures `old_stage` before updating the row.
3. Open `orchestrator/src/orchestration/retry.py` and confirm `bump_same_stage_or_release()` is the single retry-bump wrapper.
4. Grep `bump_same_stage_or_release` and confirm it is used from upstream, video, downstream assembly/bookend, downstream suno_bake, and downstream upload paths.
5. Open `orchestrator/src/services/publishing.py` and confirm `update_data` contains URLs only, not `"status": "complete"`.
6. Run the worker retry tests and confirm the cancel-mid-retry cases all pass:
   - `test_upstream_retry_bump_releases_when_word_cancelled`
   - `test_video_retry_bump_releases_when_word_cancelled`
   - `test_downstream_suno_bake_retry_bump_releases_when_word_cancelled`
   - `test_downstream_assembly_retry_bump_releases_when_word_cancelled`
   - `test_downstream_upload_retry_bump_releases_when_word_cancelled`
7. Run `test_crit2_downstream_worker_process_word_claims_exclusively` and confirm only one worker reaches the branch body.
8. Run `test_crit5_inline_submit_failure_routes_through_placeholder_worker_path` and confirm bake is never called after inline submit failure.
9. Run `test_bootstrap_writes_manifest_before_exposing_pending` and `test_bootstrap_crash_after_manifest_write_recovers_and_reruns` to verify the bootstrap ordering guarantee.
10. Run `test_job_runner_sigterm_drains_workers` and `test_stage_timer_emits_and_clears_on_terminal_failure` to verify the MED-1 / MED-3 coverage landed.
