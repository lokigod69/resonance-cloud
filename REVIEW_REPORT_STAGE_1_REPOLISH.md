# REVIEW REPORT - Stage 1 Re-Polish (H1 / H2 / H4)

## 1. Overall verdict: FAIL

I do not recognize this implementation as my own prior work. The H1/H2/H4 changes inside `src/services/events.py` and `tests/test_events_helper.py` are generally correct, idiomatic, and well-covered by targeted tests, but the review gate still fails because the working tree diff is not limited to the two allowed files. `git diff --name-only` in the repo root shows a third tracked modified file, `src/services/enrichment.py`, which is an explicit blocker under the stated scope rules. One additional environment limitation: `IMPLEMENTATION_PROMPT_STAGE_1_REPOLISH_H1_H2_H4.md` was not present anywhere under `D:\CODING\ResonanceTEST`, so prompt-derived checks were verified against this review brief plus live code rather than the original prompt file.

## 2. Scope and hard-constraint verification (Section 3)

### 3.1 Exactly two files modified

- FAIL. `git diff --name-only` returned:

```text
src/services/enrichment.py
src/services/events.py
tests/test_events_helper.py
```

Expected exactly:

```text
src/services/events.py
tests/test_events_helper.py
```

This is a blocker scope violation.

### 3.2 No `loop.run_in_executor`

- PASS. `git grep -n "run_in_executor\|asyncio.to_thread\|ensure_future" src/services/events.py` found only `asyncio.to_thread` and `asyncio.ensure_future`; there were zero `run_in_executor` matches. Relevant code: `src/services/events.py:67-73`.

### 3.3 `asyncio.to_thread` present

- PASS. `_submit_write()` uses `asyncio.to_thread(_write_event, row)` at `src/services/events.py:67-73`.

### 3.4 Non-blocking contract preserved

- PASS. The write sites catch and warn rather than re-raise (`src/services/events.py:168-176`, `src/services/events.py:297-303`), `_write_event()` swallows insert failures after logging (`src/services/events.py:349-360`), and `logged_llm_call.__exit__()` returns `False`, so caller exceptions still propagate normally (`src/services/events.py:150-176`).

### 3.5 No changes outside the helper

- FAIL. The named no-touch files are unchanged (`git diff --name-only -- src/services/metadata.py src/orchestration/downstream_worker.py src/pipeline.py cloud_engines/concept_engine/models.py cloud_engines/image_engine/models.py cloud_engines/song_engine/models.py cloud_engines/video_engine/models.py` returned nothing), but there is still an out-of-scope tracked modification in `src/services/enrichment.py` (`src/services/enrichment.py:13-15`, `src/services/enrichment.py:20-25`, `src/services/enrichment.py:44-205`). That violates the helper-only scope rule.

## 3. Eleven-point checklist results (Section 4)

### 4.1 `_get_client()` reads `SUPABASE_SERVICE_KEY` with `or SUPABASE_KEY` fallback

- PASS. `src/services/events.py:45-55` uses `os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")`. This matches `job_runner.py:29-30` and `scripts/backfill_suno_storage.py:36-37`.

### 4.2 `_get_client_safe()` clears the None-cache-poison case

- PASS. `src/services/events.py:58-64` calls `_get_client()`, checks for `None`, then calls `cache_clear()` if available before returning. Control-flow note: it clears the cache on every `None` return from the cached function, not only the first one. That is acceptable and ensures retries are not starved.

### 4.3 `_submit_write()` uses `asyncio.to_thread`, not `run_in_executor` or manual threads

- PASS. `src/services/events.py:67-73`.

### 4.4 `_submit_write()` fire-and-forgets without blocking the calling coroutine

- PASS. `_submit_write()` is a synchronous function and schedules `asyncio.to_thread(...)` via `asyncio.ensure_future(...)` without awaiting it (`src/services/events.py:67-73`).

### 4.5 Sync concept-engine call sites still route correctly and no-loop detection uses `asyncio.get_running_loop()`

- PASS. The concept-engine call sites still enter `logged_llm_call` in `cloud_engines/concept_engine/caption.py:46-66`, `cloud_engines/concept_engine/caption.py:103-127`, and `cloud_engines/concept_engine/lyrics.py:206-234`. Those route through `logged_llm_call.__exit__()` into `_submit_write()` (`src/services/events.py:150-176`). No-loop detection is done with `asyncio.get_running_loop()` inside a `try/except RuntimeError` block (`src/services/events.py:67-72`), not with thread inspection.

### 4.6 All `_get_client` call sites now go through `_get_client_safe`

- PASS. `git grep -n "_get_client("` returned only the definition at `src/services/events.py:46` and the internal call inside `_get_client_safe()` at `src/services/events.py:59`. `_write_event()` now uses `_get_client_safe()` at `src/services/events.py:311`.

### 4.7 Orphan cleanup runs only when upload succeeded and insert then failed

- PASS. `uploaded_storage_key` is initialized to `None` (`src/services/events.py:319-320`), set only after a successful upload (`src/services/events.py:326-338`), and cleanup is gated by `if uploaded_storage_key is not None` inside the insert-failure handler (`src/services/events.py:351-360`).

### 4.8 Cleanup failures log a warning, do not re-raise, and do not mask the original insert failure log

- PASS. The insert failure warning is logged first at `src/services/events.py:351-355`; cleanup is attempted second at `src/services/events.py:356-360`; cleanup failures are warned and swallowed at `src/services/events.py:357-360`.

### 4.9 Phase 2A work is not touched

- PASS. `git diff --name-only -- src/pipeline.py cloud_engines/concept_engine/models.py cloud_engines/image_engine/models.py cloud_engines/song_engine/models.py cloud_engines/video_engine/models.py` returned nothing.

### 4.10 Non-blocking contract preserved per Section 3.4

- PASS. Same evidence as 3.4: `src/services/events.py:150-176`, `src/services/events.py:297-303`, and `src/services/events.py:349-360`.

### 4.11 New tests cover all six H1/H2/H4 scenarios

- PASS. Imports for async mocking are present at `tests/test_events_helper.py:16-17`. The six scenario tests exist and exercise the intended paths:
  - H1 fallback: `tests/test_events_helper.py:314-325`
  - H1 None-cache-poison retry: `tests/test_events_helper.py:328-343`
  - H2 async dispatch via `asyncio.to_thread`: `tests/test_events_helper.py:350-359`
  - H2 sync fall-through with no running loop: `tests/test_events_helper.py:362-368`
  - H4 orphan cleanup on insert failure after upload: `tests/test_events_helper.py:375-397`
  - H4 cleanup-failure swallowing: `tests/test_events_helper.py:400-425`

## 4. Implementation quality review (Section 5)

### 5.1 Idiomatic Python

- PASS. The helper uses standard library primitives (`functools.lru_cache`, `asyncio.to_thread`), typed signatures remain consistent (`src/services/events.py:67`, `src/services/events.py:306`), logging stays on the module logger (`src/services/events.py:54`, `src/services/events.py:171-173`, `src/services/events.py:352-360`), and there are no bare `except:` blocks, print statements, or mutable default arguments.

### 5.2 Race conditions in `_submit_write()`

- PASS-WITH-NOTE. `asyncio.ensure_future(asyncio.to_thread(...))` at `src/services/events.py:73` is a valid best-effort non-blocking pattern for Stage 1, but it does not retain task handles or provide shutdown draining. Event writes can therefore be lost if the worker exits while queued writes are still pending.

### 5.3 `lru_cache` behavior on `_get_client()`

- PASS. The flow is correct: `_get_client()` is cached (`src/services/events.py:45-55`), `_get_client_safe()` calls it and clears the cache whenever the cached result is `None` (`src/services/events.py:58-64`), and the H1 retry test proves the second call rebuilds once env vars are populated (`tests/test_events_helper.py:328-343`).

### 5.4 Orphan cleanup correctness

- PASS. Upload uses `storage_key = f"{event_id}/response.txt"` (`src/services/events.py:324-338`), and cleanup removes exactly that same key via `.remove([uploaded_storage_key])` (`src/services/events.py:356-358`). I do not see a path-format mismatch.

### 5.5 Test isolation

- PASS-WITH-NOTE. The H1 tests explicitly clear `_get_client`'s cache before and after use (`tests/test_events_helper.py:315`, `tests/test_events_helper.py:325`, `tests/test_events_helper.py:329`, `tests/test_events_helper.py:343`), and the full `tests/test_events_helper.py` run passed all 17 tests in one shot. There is no shared autouse fixture that clears this cache for future tests, so the current isolation is sufficient but somewhat manual.

### 5.6 Existing test preservation

- PASS. The original 11 helper tests still exist at `tests/test_events_helper.py:79-307`, and the file now contains 17 total tests after the six H1/H2/H4 additions (`tests/test_events_helper.py:314-425`). The targeted run passed exactly 17 tests with 0 skipped and 0 xfailed.

### 5.7 Consistent style with existing code

- PASS. Naming and structure fit the existing helper: `_get_client_safe()` and `_submit_write()` are small private helpers, warning logs reuse the existing `events:` prefix, and the added tests follow the file's existing fake-object and monkeypatch style (`src/services/events.py:58-73`, `tests/test_events_helper.py:28-72`, `tests/test_events_helper.py:314-425`).

## 5. Runtime verification results (Section 6)

### Interpreter note

The exact host `python` commands requested in the prompt were not usable in this desktop session because the host interpreter was outside the repo virtual environment:

```text
python -m pytest tests/test_events_helper.py -v
-> No module named pytest

python -c "import src.services.events"
-> ModuleNotFoundError: No module named 'supabase'
```

I therefore reran the checks from the same repo root with the repo interpreter at `.venv\Scripts\python.exe`, which is the authoritative environment for this repository.

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

============================= 17 passed in 0.59s ==============================
```

### 6.2 Full test suite (`tests --ignore=tests/manual`)

- PASS-WITH-NOTE. Exact output:

```text
============================= test session starts =============================
platform win32 -- Python 3.14.3, pytest-9.0.3, pluggy-1.6.0
rootdir: D:\CODING\ResonanceTEST\orchestrator
configfile: pyproject.toml
plugins: anyio-4.12.1
collected 177 items

tests\test_concept_lyric_levels.py .................................     [ 18%]
tests\test_enrichment.py ..............................                  [ 35%]
tests\test_events_helper.py .................                            [ 45%]
tests\test_orchestration_feeder.py .....................                 [ 57%]
tests\test_orchestration_integration.py .                                [ 57%]
tests\test_orchestration_job_runner.py .                                 [ 58%]
tests\test_orchestration_logging.py ....                                 [ 60%]
tests\test_orchestration_music_state.py .........F.F.....                [ 70%]
tests\test_orchestration_recovery.py .........                           [ 75%]
tests\test_orchestration_retry.py .......                                [ 79%]
tests\test_orchestration_state.py .................                      [ 88%]
tests\test_orchestration_timers.py ..                                    [ 89%]
tests\test_orchestration_worker_retries.py ...........                   [ 96%]
tests\test_short_mode_durations.py .......                               [100%]

================================== FAILURES ===================================
________ test_crit2_downstream_worker_process_word_claims_exclusively _________
...
E       AssertionError: assert WindowsPath('/tmp/d-1') == WindowsPath('C:/Users/micha/AppData/Local/Temp/pytest-of-micha/pytest-27/test_crit2_downstream_worker_p0')
...
___ test_crit5_inline_submit_failure_routes_through_placeholder_worker_path ___
...
E       AssertionError: assert WindowsPath('/tmp/d-1') == WindowsPath('C:/Users/micha/AppData/Local/Temp/pytest-of-micha/pytest-27/test_crit5_inline_submit_failu0')
...
=========================== short test summary info ===========================
FAILED tests/test_orchestration_music_state.py::test_crit2_downstream_worker_process_word_claims_exclusively
FAILED tests/test_orchestration_music_state.py::test_crit5_inline_submit_failure_routes_through_placeholder_worker_path
======================= 2 failed, 175 passed in 54.71s ========================
```

Investigation note: the fail count matches the expected two pre-existing `tests/test_orchestration_music_state.py` failures, and there were no new failures attributable to `events.py`. The pass count is higher than the prompt's expected `145` because this tree also contains an extra `tests/test_enrichment.py` (30 passing tests) and a related tracked modification in `src/services/enrichment.py`. That is additional evidence of working-tree drift, not an `events.py` regression.

### 6.3 Static import check

- PASS. `.venv\Scripts\python.exe -c "import src.services.events"` exited 0 with no output.

## 6. Risk register (Section 7)

### 7.1 Orphan storage growth if cleanup fails

- Severity: medium.
- Evidence: `src/services/events.py:356-360`.
- Assessment: cleanup failures are only warning-logged and there is no metric, counter, or reconciliation path in this helper. If storage delete begins failing, orphaned payloads can accumulate silently apart from warning logs. The warning also omits the storage key, which makes manual cleanup harder.

### 7.2 LRU-cache poisoning at cold start

- Severity: informational.
- Evidence: `src/services/events.py:58-64`, `tests/test_events_helper.py:328-343`.
- Assessment: this specific risk is addressed. `_get_client_safe()` clears the cached `None`, so later calls can rebuild once env vars are present.

### 7.3 Fire-and-forget task buildup

- Severity: medium.
- Evidence: `src/services/events.py:67-73`.
- Assessment: there is no backpressure, task registry, or bounded queue. If Supabase slows down under high event volume, many background `to_thread` tasks can accumulate in the loop's default executor queue. Stage 1's contract tolerates best-effort writes, but this remains an operational risk.

### 7.4 Async dispatch from worker threads

- Severity: low.
- Evidence: `src/services/events.py:67-72`.
- Assessment: this path is correct. In a worker thread entered via `asyncio.to_thread`, there is no running loop in that thread, so `_submit_write()` falls back to direct synchronous `_write_event(row)` execution.

## 7. Findings requiring fix before merge

1. BLOCKER - Scope creep outside the approved two-file refactor. `git diff --name-only` shows `src/services/enrichment.py` in addition to `src/services/events.py` and `tests/test_events_helper.py`, which violates the explicit "exactly two files modified" gate. The out-of-scope edits are real source changes, not whitespace noise (`src/services/enrichment.py:13-15`, `src/services/enrichment.py:20-25`, `src/services/enrichment.py:44-205`). Halt merge until the working tree is reduced back to the two allowed files.

No other blocking findings in the H1/H2/H4 implementation itself.

## 8. Minor notes for Sir Robert (not requiring fix)

1. `IMPLEMENTATION_PROMPT_STAGE_1_REPOLISH_H1_H2_H4.md` was not present anywhere under `D:\CODING\ResonanceTEST`, so this review used the requirements embedded in the review brief plus live code. If the missing prompt contained extra acceptance criteria not repeated here, those remain unverified from my environment.
2. In this desktop session, host `python` is not the repo interpreter. Reproducible verification required `.venv\Scripts\python.exe`.
3. The cleanup-failure warning does not include the orphaned storage key. That is acceptable for Stage 1, but it will make future orphan forensics more manual than necessary.
4. Cache isolation in tests is currently manual rather than fixture-driven. It is sufficient today, but future tests touching `_get_client_safe()` should remember to clear `_get_client.cache_clear()`.

## 9. Adversarial self-review

1. I may be too strict in the overall verdict because the FAIL is driven by repository hygiene and scope control, not by a demonstrated defect in the H1/H2/H4 helper logic. If Sir Robert intentionally kept unrelated local work in the same tree, this report still blocks merge because the written gate says it must.
2. I may be too lenient on operational concerns around `asyncio.ensure_future(asyncio.to_thread(...))`. The implementation is correct for the stated non-blocking contract, but I did not stress-test high-concurrency task buildup or shutdown behavior beyond static reasoning.
3. I could not read the named implementation prompt file because it was missing from the workspace. If that prompt contained hard constraints not reproduced in this review brief, I could have missed them.
4. I reviewed the working tree against the current local `HEAD`; I did not compare against GitHub `main` or inspect remote PR metadata. If the branch already carried unrelated drift before this change, the scope blocker is still valid for merge, but its origin could predate the implementing agent.
