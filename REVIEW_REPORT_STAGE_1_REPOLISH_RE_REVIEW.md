# REVIEW REPORT - Stage 1 Re-Polish Re-Review (H1 / H2 / H4)

## 1. Overall verdict: PASS

I do not recognize this implementation as my own prior work. The original blocker was scope creep from an unrelated `src/services/enrichment.py` working-tree change; that blocker is now resolved. On this re-review, `git diff --name-only` in the repo root shows exactly the two authorized files, the H1/H2/H4 code paths in `src/services/events.py` remain correct on spot-check, `tests/test_events_helper.py` still passes 17/17, and the broader suite still shows only the same two pre-existing `tests/test_orchestration_music_state.py` failures with a higher pass count because the enrichment work is now on `main`.

## 2. Scope and hard-constraint verification (Section 3)

### 3.1 Exactly two files modified

- PASS. `git diff --name-only` returned exactly:

```text
src/services/events.py
tests/test_events_helper.py
```

No extra tracked files were present in the live diff.

### 3.2 No `loop.run_in_executor`

- PASS. `git grep -n "run_in_executor\|asyncio.to_thread\|ensure_future\|_get_client(" src/services/events.py` found no `run_in_executor` matches. Relevant helper code remains at `src/services/events.py:67-73`.

### 3.3 `asyncio.to_thread` present

- PASS. `_submit_write()` still uses `asyncio.to_thread(_write_event, row)` at `src/services/events.py:67-73`.

### 3.4 Non-blocking contract preserved

- PASS. Write-site failures are still warning-logged and swallowed at `src/services/events.py:168-176`, `src/services/events.py:297-303`, and `src/services/events.py:349-360`. `logged_llm_call.__exit__()` still returns `False`, so caller exceptions propagate normally at `src/services/events.py:150-176`.

### 3.5 No changes outside the helper

- PASS. `git diff --name-only -- src/services/metadata.py src/orchestration/downstream_worker.py src/pipeline.py cloud_engines/concept_engine/models.py cloud_engines/image_engine/models.py cloud_engines/song_engine/models.py cloud_engines/video_engine/models.py` returned nothing. The working-tree diff is limited to the helper and its unit test.

## 3. Eleven-point checklist results (Section 4)

### 4.1 `_get_client()` reads `SUPABASE_SERVICE_KEY` with `or SUPABASE_KEY` fallback

- PASS. `src/services/events.py:45-55` matches `job_runner.py:29-30` and `scripts/backfill_suno_storage.py:36-37`.

### 4.2 `_get_client_safe()` clears the None-cache-poison case

- PASS. `src/services/events.py:58-64` still clears the cache on every `None` return from `_get_client()`. That is acceptable because retries are not starved.

### 4.3 `_submit_write()` uses `asyncio.to_thread`, not `run_in_executor` or manual threads

- PASS. `src/services/events.py:67-73`.

### 4.4 `_submit_write()` fire-and-forgets without blocking the calling coroutine

- PASS. `_submit_write()` schedules `asyncio.to_thread(...)` via `asyncio.ensure_future(...)` and does not await it at `src/services/events.py:67-73`.

### 4.5 Sync concept-engine call sites still route correctly and no-loop detection uses `asyncio.get_running_loop()`

- PASS. The concept-engine call sites still enter `logged_llm_call` at `cloud_engines/concept_engine/caption.py:46-66`, `cloud_engines/concept_engine/caption.py:103-127`, and `cloud_engines/concept_engine/lyrics.py:206-234`. No-loop detection remains a `try/except RuntimeError` around `asyncio.get_running_loop()` at `src/services/events.py:67-72`.

### 4.6 All `_get_client` call sites now go through `_get_client_safe`

- PASS. The only `_get_client(` matches in `src/services/events.py` are the definition at `src/services/events.py:46` and the internal call inside `_get_client_safe()` at `src/services/events.py:59`. `_write_event()` uses `_get_client_safe()` at `src/services/events.py:311`.

### 4.7 Orphan cleanup runs only when upload succeeded and insert then failed

- PASS. `uploaded_storage_key` starts as `None` at `src/services/events.py:319-320`, is set only after successful upload at `src/services/events.py:326-338`, and cleanup is gated by `if uploaded_storage_key is not None` at `src/services/events.py:356-360`.

### 4.8 Cleanup failures log a warning, do not re-raise, and do not mask the original insert failure log

- PASS. The insert-failure warning is emitted first at `src/services/events.py:351-355`, and cleanup-failure warning is emitted second at `src/services/events.py:356-360`.

### 4.9 Phase 2A work is not touched

- PASS. `src/pipeline.py` and the engine `models.py` files remain outside the diff; see Section 2.5 above.

### 4.10 Non-blocking contract preserved per Section 3.4

- PASS. Same supporting code remains unchanged at `src/services/events.py:150-176`, `src/services/events.py:297-303`, and `src/services/events.py:349-360`.

### 4.11 New tests cover all six H1/H2/H4 scenarios

- PASS. The helper test file still contains the six scenario tests with the expected imports and code paths:
  - H1 fallback: `tests/test_events_helper.py:314-325`
  - H1 None-cache-poison retry: `tests/test_events_helper.py:328-343`
  - H2 async dispatch: `tests/test_events_helper.py:350-359`
  - H2 sync fall-through: `tests/test_events_helper.py:362-368`
  - H4 orphan cleanup after successful offload and failed insert: `tests/test_events_helper.py:375-397`
  - H4 cleanup-failure swallowing: `tests/test_events_helper.py:400-425`

## 4. Implementation quality review (Section 5)

### 5.1 Idiomatic Python

- PASS. No mutable defaults, no bare `except:`, no `print()` calls, and the added helpers remain small and typed at `src/services/events.py:58-73` and `src/services/events.py:306-360`.

### 5.2 Race conditions in `_submit_write()`

- PASS-WITH-MINOR-NOTE. The implementation is still acceptable for a Stage 1 best-effort non-blocking contract, but scheduled writes can still be lost during shutdown because task handles are not tracked or drained (`src/services/events.py:73`).

### 5.3 `lru_cache` behavior on `_get_client()`

- PASS. `_get_client()` is cached at `src/services/events.py:45-55`, `_get_client_safe()` clears cached `None` results at `src/services/events.py:58-64`, and the retry test still proves the behavior at `tests/test_events_helper.py:328-343`.

### 5.4 Orphan cleanup correctness

- PASS. Upload uses `storage_key = f"{event_id}/response.txt"` at `src/services/events.py:324-338`, and cleanup removes exactly that same key via `.remove([uploaded_storage_key])` at `src/services/events.py:356-358`.

### 5.5 Test isolation

- PASS-WITH-MINOR-NOTE. The H1 tests still clear `_get_client.cache_clear()` before and after use at `tests/test_events_helper.py:315`, `tests/test_events_helper.py:325`, `tests/test_events_helper.py:329`, and `tests/test_events_helper.py:343`. Isolation remains manual but sufficient.

### 5.6 Existing test preservation

- PASS. The original helper tests remain present at `tests/test_events_helper.py:79-307`, and the file still passes exactly 17 tests in one run; see Section 5.1 below for the full output.

### 5.7 Consistent style with existing code

- PASS. The helper still matches existing naming and logging conventions, with concise private helpers and the same `events:` warning prefix (`src/services/events.py:54`, `src/services/events.py:171-173`, `src/services/events.py:352-360`).

## 5. Runtime verification results (Section 6)

### Interpreter note

The host `python` in this desktop session is not the project interpreter, so I ran the requested checks with `.venv\Scripts\python.exe` from the orchestrator root. This is the repo environment that successfully imports `supabase` and runs the test suite.

### 6.1 Targeted helper tests

- PASS. Exact output:

```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0 -- D:\CODING\ResonanceTEST\orchestrator\.venv\Scripts\python.exe
cachedir: .pytest_cache
rootdir: D:\CODING\ResonanceTEST\orchestrator
configfile: pyproject.toml
plugins: anyio-4.12.1
collecting ... collected 17 items

tests/test_events_helper.py::test_logged_llm_call_success_writes_row PASSED [  5%]
tests/test_events_helper.py::test_logged_llm_call_exception_writes_failed_row_and_reraises PASSED [ 11%]
tests/test_events_helper.py::test_response_offload_when_body_exceeds_threshold PASSED [ 17%]
tests/test_events_helper.py::test_small_body_does_not_offload PASSED     [ 23%]
tests/test_events_helper.py::test_missing_creds_does_not_raise PASSED    [ 29%]
tests/test_events_helper.py::test_insert_exception_does_not_propagate PASSED [ 35%]
tests/test_events_helper.py::test_offload_upload_failure_still_writes_row PASSED [ 41%]
tests/test_events_helper.py::test_record_response_merges_metadata_extras PASSED [ 47%]
tests/test_events_helper.py::test_logged_api_call_request_body_in_metadata PASSED [ 52%]
tests/test_events_helper.py::test_write_event_row_direct PASSED          [ 58%]
tests/test_events_helper.py::test_write_event_row_missing_creds_swallows PASSED [ 64%]
tests/test_events_helper.py::test_get_client_safe_falls_back_to_supabase_key PASSED [ 70%]
tests/test_events_helper.py::test_get_client_safe_clears_none_cache_and_allows_retry PASSED [ 76%]
tests/test_events_helper.py::test_submit_write_uses_to_thread_when_loop_running PASSED [ 82%]
tests/test_events_helper.py::test_submit_write_calls_write_event_directly_without_running_loop PASSED [ 88%]
tests/test_events_helper.py::test_insert_failure_after_successful_offload_removes_orphan PASSED [ 94%]
tests/test_events_helper.py::test_orphan_cleanup_failure_is_swallowed PASSED [100%]

============================= 17 passed in 0.54s ==============================
```

### 6.2 Full test suite (`tests --ignore=tests/manual`)

- PASS-WITH-NOTE. Exact output:

```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0
rootdir: D:\CODING\ResonanceTEST\orchestrator
configfile: pyproject.toml
plugins: anyio-4.12.1
collected 211 items

tests\test_concept_lyric_levels.py .................................     [ 15%]
tests\test_enrichment.py ............................................... [ 37%]
.................                                                        [ 45%]
tests\test_events_helper.py .................                            [ 54%]
tests\test_orchestration_feeder.py .....................                 [ 63%]
tests\test_orchestration_integration.py .                                [ 64%]
tests\test_orchestration_job_runner.py .                                 [ 64%]
tests\test_orchestration_logging.py ....                                 [ 66%]
tests\test_orchestration_music_state.py .........F.F.....                [ 74%]
tests\test_orchestration_recovery.py .........                           [ 79%]
tests\test_orchestration_retry.py .......                                [ 82%]
tests\test_orchestration_state.py .................                      [ 90%]
tests\test_orchestration_timers.py ..                                    [ 91%]
tests\test_orchestration_worker_retries.py ...........                   [ 96%]
tests\test_short_mode_durations.py .......                               [100%]

================================== FAILURES ===================================
________ test_crit2_downstream_worker_process_word_claims_exclusively _________
...
E       AssertionError: assert WindowsPath('/tmp/d-1') == WindowsPath('C:/Users/micha/AppData/Local/Temp/pytest-of-micha/pytest-31/test_crit2_downstream_worker_p0')
...
___ test_crit5_inline_submit_failure_routes_through_placeholder_worker_path ___
...
E       AssertionError: assert WindowsPath('/tmp/d-1') == WindowsPath('C:/Users/micha/AppData/Local/Temp/pytest-of-micha/pytest-31/test_crit5_inline_submit_failu0')
...
=========================== short test summary info ===========================
FAILED tests/test_orchestration_music_state.py::test_crit2_downstream_worker_process_word_claims_exclusively
FAILED tests/test_orchestration_music_state.py::test_crit5_inline_submit_failure_routes_through_placeholder_worker_path
======================= 2 failed, 209 passed in 54.42s ========================
```

Assessment: the fail count is unchanged from the prior review, and the pass count is higher because the enrichment tests are now on `main`. I saw no new failures attributable to `events.py` or `tests/test_events_helper.py`.

### 6.3 Static import check

- PASS. `.venv\Scripts\python.exe -c "import src.services.events"` exited 0 with no output.

## 6. Risk register (Section 7)

### 7.1 Orphan storage growth if cleanup fails

- Severity: medium.
- Evidence: `src/services/events.py:356-360`.
- Assessment: cleanup failures are warning-logged but not surfaced via any metric or reconciliation flow in this helper. If storage delete starts failing consistently, orphaned payloads could accumulate quietly apart from warning logs.

### 7.2 LRU-cache poisoning at cold start

- Severity: informational.
- Evidence: `src/services/events.py:58-64`, `tests/test_events_helper.py:328-343`.
- Assessment: the implemented cache-clear path still addresses this correctly.

### 7.3 Fire-and-forget task leakage

- Severity: medium.
- Evidence: `src/services/events.py:67-73`.
- Assessment: there is still no backpressure or bounded queue. If Supabase is slow and write volume spikes, background `to_thread` jobs can accumulate.

### 7.4 Async dispatch inside worker threads

- Severity: low.
- Evidence: `src/services/events.py:67-72`.
- Assessment: this path still behaves correctly. In a worker thread with no running loop, `_submit_write()` falls back to direct synchronous `_write_event(row)` execution.

## 7. Findings requiring fix before merge

No blocking findings.

## 8. Minor notes for Sir Robert (not requiring fix)

1. `IMPLEMENTATION_PROMPT_STAGE_1_REPOLISH_H1_H2_H4.md` was still not present anywhere under `D:\CODING\ResonanceTEST` in my environment, so this re-review relied on the review brief plus live code rather than the original prompt file.
2. The full suite pass count is now `209` rather than the earlier `145` expectation from the original prompt because the enrichment work and tests are now on `main`.
3. The helper still uses a best-effort background scheduling model; that is acceptable for Stage 1, but it remains worth keeping in mind for Phase 2 observability hardening.

## 9. Adversarial self-review

1. I may be too lenient because this re-review was intentionally a spot-check, not a full line-by-line re-audit from scratch. I compensated by rerunning the key runtime checks and re-reading the modified helper and tests, but I did not exhaustively repeat every search from the first review.
2. I may be too strict in carrying forward the note about the missing implementation prompt file. The actual implementation appears compliant with the repeated acceptance criteria in the review brief, so the missing file did not block verification here.
3. I did not independently inspect Git history beyond current working-tree state and runtime behavior. If a subtle behavioral regression were introduced outside the two-file diff but only exposed by timing or production traffic, this re-review would not catch it.
