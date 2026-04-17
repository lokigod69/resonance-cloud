# Implementation Plan — Hook B: Job-Level Pre-Warm + Keep-Alive

**Branch:** `feat/job-level-prewarm` (from `main`)
**Base commit:** 44c4da2
**Scope:** Mirror `_upcoming_words` → `_upcoming_jobs`, wire Hook B at `job_runner.main()`, add tests. No refactor.

---

## Phase 1 — Investigation findings

### IP-Q1 — Integration-point verification

All prior citations verified accurate on current `main`:

| Prior citation | Verified | Current file:line |
|---|---|---|
| `notify_upcoming_video` | ✅ | [pod_manager.py:553-579](cloud_engines/video_engine/pod_manager.py#L553-L579) |
| `cancel_upcoming_video` | ✅ | [pod_manager.py:582-593](cloud_engines/video_engine/pod_manager.py#L582-L593) |
| `idle_check` | ✅ | [pod_manager.py:618-653](cloud_engines/video_engine/pod_manager.py#L618-L653) |
| `_upcoming_words` declaration | ✅ | [pod_manager.py:67](cloud_engines/video_engine/pod_manager.py#L67) |
| `POD_PREWARM_STALE_SECONDS` | ✅ | [config.py:59](cloud_engines/video_engine/config.py#L59), default `1200` |
| `_prewarm_applicable` | ✅ | [pod_manager.py:536-550](cloud_engines/video_engine/pod_manager.py#L536-L550) |
| Hook B target | ✅ | [job_runner.py:976-980](job_runner.py#L976-L980) |
| `_reset_state` (clears dict) | ✅ | [pod_manager.py:156-168](cloud_engines/video_engine/pod_manager.py#L156-L168) |

Prior report range for `cancel_upcoming_video` was "596-616" — actual is 582-593. The 596-616 range corresponds to `_run_prewarm`. Minor drift; corrected above.

`notify_upcoming_video` is imported into `job_runner.py` at [job_runner.py:43](job_runner.py#L43):

```python
from cloud_engines.video_engine.pod_manager import notify_upcoming_video, cancel_upcoming_video
```

### IP-Q2 — Pre-warm cold-start mechanism

`notify_upcoming_video` does two things:

1. Populates `_upcoming_words[word_id] = time.monotonic()` under `_lock` (keep-alive).
2. If pod is idle and no pre-warm is in flight, spawns a daemon thread running `_run_prewarm`.

Source ([pod_manager.py:553-579](cloud_engines/video_engine/pod_manager.py#L553-L579)):

```python
def notify_upcoming_video(word_id: str) -> None:
    global _last_activity, _prewarm_in_flight
    if not _prewarm_applicable():
        return
    start_prewarm = False
    with _lock:
        _upcoming_words[word_id] = time.monotonic()
        _last_activity = time.monotonic()
        if _pod_status == "idle" and not _prewarm_in_flight:
            _prewarm_in_flight = True
            start_prewarm = True
    if start_prewarm:
        logger.info("RunPod: Pre-warming pod for upcoming word %s", word_id)
        threading.Thread(
            target=_run_prewarm,
            daemon=True,
            name=f"pod-prewarm-{str(word_id)[:8]}",
        ).start()
```

The daemon-thread entry point is the module-level function `_run_prewarm` at [pod_manager.py:596-615](cloud_engines/video_engine/pod_manager.py#L596-L615). It:

- Re-checks `_upcoming_words` at entry; if empty, logs "Pre-warm skipped" and returns (avoids a wasted cold-start if everything was cancelled during thread-spawn race).
- Calls `ensure_pod_ready()` (blocking, can take up to `RUNPOD_POD_STARTUP_TIMEOUT` seconds).
- Clears `_prewarm_in_flight` in a `finally` block.

**Critical consequence for `notify_upcoming_job`:** the new function must spawn the same `_run_prewarm` worker. And `_run_prewarm`'s early-out check at [pod_manager.py:606](cloud_engines/video_engine/pod_manager.py#L606) — `if not _upcoming_words: return` — currently only looks at the word dict. When `notify_upcoming_job` triggers pre-warm with only `_upcoming_jobs` populated (normal at job-pickup time, before any word enters processing), that early-out would incorrectly skip the cold-start. **Therefore `_run_prewarm` must be updated to `if not _upcoming_words and not _upcoming_jobs: return`.** This is the only modification to existing pre-warm code.

### IP-Q3 — `process_job` exit paths

`process_job` is defined at [job_runner.py:725-920](job_runner.py#L725-L920). Return paths:

| Kind | File:line |
|---|---|
| Early `return` — no pending words | [job_runner.py:800](job_runner.py#L800) |
| Normal success end-of-function | [job_runner.py:920](job_runner.py#L920) (implicit `return None` — function ends) |
| Uncaught exceptions propagate | any point in the body — there is no top-level `try/except` in `process_job` |

**There is no top-level `try/finally` in `process_job`.** Individual per-word failures call `process_word` which has its own error handling and returns `False`; those do not exit `process_job`. The function either runs to completion or propagates an exception to `main()`.

**Recommendation (confirmed feasible):** wrap the Hook B call at `main()` instead of modifying `process_job`. Rationale:

- `main()` already catches `Exception` in its outer `try/except` at [job_runner.py:944, 985-987](job_runner.py#L944) — so a `try/finally` around `await process_job(job)` in `main()` is robust to both normal return and exception.
- Keeps the change to one call site, one level of abstraction (runner loop) instead of leaking pod-manager concerns into `process_job`.
- No risk of missing an early-return path — `finally` covers every exit of the `try` block.

Chosen shape:

```python
job = job_resp.data[0]
if job.get("job_type") == "suno_retry":
    await process_suno_retry_job(job)
else:
    notify_upcoming_job(job["id"])
    try:
        await process_job(job)
    finally:
        cancel_upcoming_job(job["id"])
```

### IP-Q4 — `suno_retry` job type

**Decision: exclude `suno_retry` from job-level pre-warm.** Evidence:

`process_suno_retry_job` ([job_runner.py:616-720](job_runner.py#L616-L720)) calls `bake_suno_into_word` ([src/services/suno_bakein.py](src/services/suno_bakein.py)). Grep of `suno_bakein.py` for `call_engine`, `pod_manager`, `ensure_pod_ready`, `video_engine`, `"video"`:

```
src/services/suno_bakein.py:11:from src.pipeline import run_stage
src/services/suno_bakein.py:376: await run_stage(workspace_path, word_slug, "assembly")
src/services/suno_bakein.py:415: await run_stage(workspace_path, word_slug, "bookend")
```

Only `assembly` and `bookend` are invoked. Both are Railway CPU stages — no pod, no GPU. So `suno_retry` never needs the pod. Calling `notify_upcoming_job` for it would force unnecessary cold starts.

Hook B will gate on `job.get("job_type") == "suno_retry"` and skip the notify path for that type.

### IP-Q5 — Smart-retry / `stages_to_run` interaction

`stages_to_run` is computed at [job_runner.py:202-224](job_runner.py#L202-L224), **inside `process_word`**, not inside `process_job`. So Hook B at [job_runner.py:976-980](job_runner.py#L976-L980) fires before any word's `stages_to_run` is known.

**Accepted trade-off:** a pod may pre-warm for a job whose smart-retry subset excludes `video` (e.g., retrying a job where only assembly/bookend failed). Cost: a wasted pod cold-start. This is:

- Rare in practice — smart retries with video already complete are a minority of runs.
- Self-healing — `release_use` and `cancel_upcoming_job` drop the signal; `idle_check` terminates the pod after `RUNPOD_IDLE_TIMEOUT`.
- Not worth optimizing now — any attempt to inspect `stages_to_run` pre-pickup would require reaching into word records and duplicating `get_incomplete_stages` logic. Not in scope.

### IP-Q6 — Stale-entry GC for `_upcoming_jobs`

Existing GC in `idle_check` ([pod_manager.py:627-638](cloud_engines/video_engine/pod_manager.py#L627-L638)) removes `_upcoming_words` entries older than `POD_PREWARM_STALE_SECONDS` (default 1200s = 20 min). Runs regardless of pod state, once per 60s idle tick ([start_cloud.py:149](start_cloud.py#L149)).

**Proposal: `POD_PREWARM_JOB_STALE_SECONDS = 3600` (1 hour).** Justification:

- A job = N words. Realistic upper bound on N is ~20 words × a few minutes per word ≈ 40-60 min per job. 1200s is too tight.
- The prior report's merge-freeze context showed multi-word decks taking tens of minutes.
- 1 hour is a generous upper bound that still catches genuinely stuck state (a crashed runner leaving `_upcoming_jobs` non-empty forever).
- Matches the spirit of stuck-job recovery in `start_cloud.py` which uses a 30-min stale threshold for `generation_jobs.started_at` — but we're one level more conservative here because a single GC tick is the only safety net, whereas stuck-job recovery has other failsafes.

The GC is a pure safety net. If `cancel_upcoming_job` fires correctly via `try/finally` at every `main()` iteration, no entry will ever age to 1h.

---

## Phase 2 — Implementation summary

### Change 1 — `cloud_engines/video_engine/config.py`

Add one constant after `POD_PREWARM_STALE_SECONDS` ([config.py:59](cloud_engines/video_engine/config.py#L59)):

```python
POD_PREWARM_JOB_STALE_SECONDS: int = int(os.getenv("POD_PREWARM_JOB_STALE_SECONDS", "3600"))
```

### Change 2 — `cloud_engines/video_engine/pod_manager.py`

- Import `POD_PREWARM_JOB_STALE_SECONDS` from `.config`.
- Declare `_upcoming_jobs: dict[str, float] = {}` next to `_upcoming_words`.
- Clear `_upcoming_jobs` in `_reset_state`.
- Update `_run_prewarm` early-out to check both dicts.
- Add `notify_upcoming_job(job_id: str) -> None` mirroring `notify_upcoming_video`.
- Add `cancel_upcoming_job(job_id: str) -> None` mirroring `cancel_upcoming_video`.
- In `idle_check`:
  - Add parallel GC block for `_upcoming_jobs`.
  - Add guard `if _upcoming_jobs: return` after the `_upcoming_words` guard.

### Change 3 — `job_runner.py`

- Extend import from `pod_manager` to include `notify_upcoming_job`, `cancel_upcoming_job`.
- Wrap `await process_job(job)` in `main()` with `notify_upcoming_job` + `try/finally` + `cancel_upcoming_job`. Do NOT wrap `process_suno_retry_job`.

### Change 4 — `tests/manual/test_pod_prewarm.py`

Add new tests (numbered 15+) covering:

- 15: `notify_upcoming_job` adds to `_upcoming_jobs` when applicable.
- 16: `notify_upcoming_job` is a no-op when `_prewarm_applicable()` is false.
- 17: `notify_upcoming_job` triggers cold-start when pod is idle.
- 18: `cancel_upcoming_job` removes entry and refreshes `_last_activity`.
- 19: `cancel_upcoming_job` is idempotent for unknown job_id.
- 20: `idle_check` does not terminate when `_upcoming_jobs` non-empty.
- 21: `idle_check` GCs stale `_upcoming_jobs` past `POD_PREWARM_JOB_STALE_SECONDS`.
- 22: `_upcoming_words` and `_upcoming_jobs` are independent (clearing one leaves the other).

---

## Out of scope for this PR (explicitly)

- Hook A (auto-approve arrival notification) — a superset that can be added later.
- Hook C (DB query inside `idle_check`) — requires plumbing a Supabase client into `pod_manager`; larger change.
- Any modification of `_upcoming_words`, `notify_upcoming_video`, `cancel_upcoming_video` **semantics** (the `_run_prewarm` early-out update is a compatible bug-fix-shaped extension, not a semantic change).
- Any change to `_active_jobs`, `acquire_use`, `release_use`, or the LTX adapter.
- Any pipeline / stage / smart-retry change.
- Any `RUNPOD_IDLE_TIMEOUT` default change.
