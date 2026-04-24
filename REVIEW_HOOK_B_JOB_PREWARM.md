# Adversarial Code Review — Hook B Job-Level Pre-Warm

**Branch:** `feat/job-level-prewarm`
**Commits:** `707ea61` (plan), `68218cd` (impl + tests)
**Files touched (verified):** `cloud_engines/video_engine/config.py`, `cloud_engines/video_engine/pod_manager.py`, `job_runner.py`, `tests/manual/test_pod_prewarm.py` — 218 insertions, 4 deletions. Matches author's report.
**Reviewer:** hostile — looking for bugs, not rubber-stamping.

---

## Executive summary

**Verdict: NEEDS CHANGES (minor).**

The implementation is functionally correct: all correctness-relevant invariants hold, lock ordering is sound, idle_check semantics are preserved, the `try/finally` wires exception and normal-return paths. No CRITICAL findings.

However, there is one HIGH coverage gap (no test exercises the `job_runner.main()` Hook B wiring), two MEDIUM doc drifts, and a MEDIUM observability gap (thread name format doesn't distinguish word- vs job-triggered pre-warms). The coverage gap should be closed before merge because the `try/finally` is the whole point of the PR; if a future refactor breaks it, nothing catches it. The doc and observability issues are fine to defer.

No CRITICAL or scope-violation findings.

---

## Section 1 — `pod_manager.py` core changes

### 1.1 — `_upcoming_jobs` declaration and typing — PASS

[pod_manager.py:68-71](cloud_engines/video_engine/pod_manager.py#L68-L71):

```python
_upcoming_words: dict[str, float] = {}
# Parallel job-level tracking populated by Hook B in job_runner.main(), ~30s
# earlier than the word-level signal. Keyed by generation_jobs.id.
_upcoming_jobs: dict[str, float] = {}
```

- Type matches `_upcoming_words`: `dict[str, float]`. ✓
- Module scope, same location. ✓
- All mutations under `_lock` (verified: line 596, 614, 639, 674, 682, 692; see findings below). ✓

### 1.2 — `notify_upcoming_job` implementation — PASS

[pod_manager.py:601-626](cloud_engines/video_engine/pod_manager.py#L601-L626). Side-by-side with `notify_upcoming_video` ([553-579](cloud_engines/video_engine/pod_manager.py#L553-L579)):

Differences:
- Parameter name: `job_id` vs `word_id`. Justified.
- Dict: `_upcoming_jobs` vs `_upcoming_words`. Justified.
- Log format: `"Pre-warming pod for upcoming job %s"` vs `"... for upcoming word %s"`. Justified.
- Thread name: `f"pod-prewarm-{str(job_id)[:8]}"` — **identical format** to the word version. See M4 below.

Invariants:
- `_prewarm_applicable()` gate at line 611 — ✓ matches line 564.
- `_lock` acquired before mutation (line 614) — ✓.
- `_pod_status == "idle" and not _prewarm_in_flight` — ✓ identical to line 570.
- `time.monotonic()` for timestamp — ✓ (line 615).
- Idempotency: `_upcoming_jobs[job_id] = time.monotonic()` overwrites on second call — refreshes timestamp. ✓

### 1.3 — `cancel_upcoming_job` implementation — PASS (with observation M3)

[pod_manager.py:629-641](cloud_engines/video_engine/pod_manager.py#L629-L641). Side-by-side with `cancel_upcoming_video` ([582-593](cloud_engines/video_engine/pod_manager.py#L582-L593)):

- `_lock` acquired (line 639) — ✓.
- `.pop(job_id, None)` — returns None for missing key, no KeyError. Idempotent. ✓.
- `_last_activity` bumped only when key was actually popped — ✓ matches line 592-593.
- **No logging at any level** — mirrors existing `cancel_upcoming_video`. See M3.

### 1.4 — `idle_check` modifications — PASS

[pod_manager.py:666-715](cloud_engines/video_engine/pod_manager.py#L666-L715).

**GC placement verified correct:**

```python
with _lock:
    # Stale-entry GC (runs regardless of pod state)
    now = time.monotonic()
    stale = [
        wid for wid, ts in _upcoming_words.items()
        if now - ts >= POD_PREWARM_STALE_SECONDS
    ]
    for wid in stale:
        del _upcoming_words[wid]
        logger.warning(...)
    stale_jobs = [
        jid for jid, ts in _upcoming_jobs.items()
        if now - ts >= POD_PREWARM_JOB_STALE_SECONDS
    ]
    for jid in stale_jobs:
        del _upcoming_jobs[jid]
        logger.warning(
            "RunPod: Stale _upcoming_jobs entry removed: %s (age >= %ds)",
            jid, POD_PREWARM_JOB_STALE_SECONDS,
        )

    if _pod_status != "ready" or not _pod_id:
        return
    if _active_jobs > 0:
        return
    if _upcoming_words:
        return
    if _upcoming_jobs:
        return
    idle_seconds = now - _last_activity
```

The new GC block (lines 687-696) is in the unconditional region — above the `_pod_status` guard. ✓ GC runs regardless of pod state, matching the word-level semantics.

**Guard ordering:** `_upcoming_jobs` guard (line 704-705) is placed after `_upcoming_words`. Order doesn't matter functionally (both are equal-priority early-returns) but placing it consistently with GC order is fine.

**Iteration safety:** both GC blocks use list-comprehension snapshots (`stale = [...]`, `stale_jobs = [...]`) before deleting. No mutation-during-iteration hazard. ✓

**Uses correct constant:** `POD_PREWARM_JOB_STALE_SECONDS` at lines 689 and 695 — not the word constant. ✓

### 1.5 — `_run_prewarm` early-out change — PASS

[pod_manager.py:644-663](cloud_engines/video_engine/pod_manager.py#L644-L663):

```python
def _run_prewarm() -> None:
    ...
    try:
        with _lock:
            if not _upcoming_words and not _upcoming_jobs:
                logger.info("RunPod: Pre-warm skipped - no upcoming work (already cancelled)")
                return
        ensure_pod_ready()
```

Original: `if not _upcoming_words`. New: `if not _upcoming_words and not _upcoming_jobs`.

- Word-only pre-warm: proceeds. ✓
- Job-only pre-warm: proceeds (new case). ✓
- Both populated: proceeds. ✓
- Neither: skips. ✓

**Could this fire more aggressively than before?** No. The only way `_run_prewarm` spawns is from a `notify_*` function that added to the corresponding dict. If both notifies raced, only one thread is spawned (gated by `_prewarm_in_flight`). The early-out relaxation only matters when `notify_upcoming_job` was the trigger and `_upcoming_words` is empty — which is the intended case. No false-positive cold-starts.

### 1.6 — `_reset_state` — PASS

[pod_manager.py:160-173](cloud_engines/video_engine/pod_manager.py#L160-L173):

```python
_upcoming_words.clear()
_upcoming_jobs.clear()
_prewarm_in_flight = False
```

`_upcoming_jobs.clear()` added on line 172. Matches prior cleanup semantics for `_upcoming_words`. ✓

### FINDING M1 — stale docstring on `_run_prewarm`

[pod_manager.py:644-649](cloud_engines/video_engine/pod_manager.py#L644-L649):

```python
def _run_prewarm() -> None:
    """Background thread body: call ensure_pod_ready. Exceptions logged, not raised.

    Re-checks _upcoming_words at entry to avoid a wasted cold-start if the word
    was already cancelled during thread spawn. ensure_pod_ready uses the module
    lock internally (existing pattern) and handles its own error recovery.
    """
```

Docstring still says "Re-checks `_upcoming_words`" and "the word was already cancelled" — but the code now checks both `_upcoming_words` and `_upcoming_jobs`. A future reader will conclude the docstring is authoritative and be wrong.

**Severity: MEDIUM.** Purely cosmetic, no runtime impact, but misleads anyone reading the code.

### FINDING M2 — stale docstring on `idle_check`

[pod_manager.py:666-672](cloud_engines/video_engine/pod_manager.py#L666-L672):

```python
def idle_check() -> None:
    """If pod is ready and idle past timeout, terminate it.

    Called periodically by start_cloud.py's background task. Considers
    _upcoming_words so that words traversing pre-video stages keep the pod
    alive across the 300s idle timer. Stale entries (e.g. from a crashed
    job_runner) are garbage-collected here.
    """
```

Mentions only `_upcoming_words`. Also still references "300s idle timer" — a hardcoded reference that was already drift-prone (`RUNPOD_IDLE_TIMEOUT` is configurable) but now compounded by the missing `_upcoming_jobs` reference.

**Severity: MEDIUM.**

---

## Section 2 — `config.py` changes — PASS

[config.py:49-50](cloud_engines/video_engine/config.py#L49-L50):

```python
POD_PREWARM_STALE_SECONDS: int = int(os.getenv("POD_PREWARM_STALE_SECONDS", "1200"))
POD_PREWARM_JOB_STALE_SECONDS: int = int(os.getenv("POD_PREWARM_JOB_STALE_SECONDS", "3600"))
```

- Read via `os.getenv`, default `"3600"`. ✓
- Parsed as `int`. ✓
- No clamp/validation — consistent with the sibling constant. ✓
- Imported in `pod_manager.py` at [pod_manager.py:30-44](cloud_engines/video_engine/pod_manager.py#L30-L44) (explicit import added, alphabetical within the from-block). ✓

---

## Section 3 — `job_runner.py` Hook B wiring — PASS (with H1)

### 3.1 — Try/finally placement — PASS

[job_runner.py:981-994](job_runner.py#L981-L994):

```python
job = job_resp.data[0]
if job.get("job_type") == "suno_retry":
    # Suno retries run assembly + bookend only (CPU, Railway);
    # no pod needed, so skip pre-warm.
    await process_suno_retry_job(job)
else:
    # Hook B: job-level pre-warm. Keeps the pod alive across
    # the runner's poll-interval gap and cold-starts it in
    # parallel with enrichment/settings/workspace setup.
    notify_upcoming_job(job["id"])
    try:
        await process_job(job)
    finally:
        cancel_upcoming_job(job["id"])
```

Control-flow analysis against the outer loop ([job_runner.py:943-987](job_runner.py#L943-L987) — which wraps in `try/except KeyboardInterrupt / except Exception`):

- `process_job` raises → inner `finally` runs `cancel_upcoming_job` → exception propagates to outer `except Exception` which logs + sleeps. ✓
- `process_job` returns normally → inner `finally` runs `cancel_upcoming_job` → loop continues. ✓
- asyncio task cancelled (e.g., SIGTERM) → `finally` is guaranteed to run before `CancelledError` propagates in Python asyncio semantics. ✓
- `notify_upcoming_job` itself raises BEFORE the `try` block opens → no `cancel` fires. See "edge case" below. No test covers this but the function is a no-op when `_prewarm_applicable()` is false, and otherwise only does dict assignment + thread spawn under a lock. Realistic failures: `threading.Thread.start()` raising `RuntimeError` (e.g., process out of threads). In that pathological case, `_upcoming_jobs[job_id]` remains populated until stale GC at the 1h threshold. This matches the existing `notify_upcoming_video` failure mode — no regression.

**Important:** the `notify_upcoming_job(job["id"])` is placed OUTSIDE the `try`. This means the `finally` would not run a matching cancel if notify raised. I considered flagging this as H/M but:
1. This mirrors the standard `try/finally` discipline where the notify *precedes* the work.
2. If notify is inside the try block, a failing notify would fire cancel against an unpopulated dict — harmless but noisy. The current placement is cleaner.
3. The stale GC safety net catches this pathological case.

Keeping this as PASS.

### 3.2 — `suno_retry` exclusion — PASS

[job_runner.py:982-985](job_runner.py#L982-L985) — suno_retry branch does NOT call `notify_upcoming_job`. Correctly paired: no notify → no cancel needed. ✓

Justified by `src/services/suno_bakein.py` invoking only `run_stage("assembly")` and `run_stage("bookend")` — verified in the Phase 1 plan and author's investigation.

### 3.3 — Imports — PASS (with L1)

[job_runner.py:43-48](job_runner.py#L43-L48):

```python
from cloud_engines.video_engine.pod_manager import (
    notify_upcoming_video,
    cancel_upcoming_video,
    notify_upcoming_job,
    cancel_upcoming_job,
)
```

Both old imports preserved. Both new imports added. ✓

**L1 (style only):** Order is `notify_video, cancel_video, notify_job, cancel_job` — paired by type (video pair, job pair). Not alphabetical. Trivial; does not affect correctness.

### 3.4 — Job ID extraction — PASS

`job["id"]` — matches the existing access pattern in `process_job` itself ([job_runner.py:727](job_runner.py#L727): `job_id = job["id"]`), in `process_suno_retry_job` ([623](job_runner.py#L623): `job_id = job["id"]`), and in SQL updates throughout. The DB column is `id uuid primary key`. Dict value is a str UUID from supabase-py. ✓

### FINDING H1 — no integration test for Hook B wiring

The 8 new tests ([test_pod_prewarm.py:tests 15-22](tests/manual/test_pod_prewarm.py)) are all pure `pod_manager` unit tests. **None exercise the `job_runner.main()` try/finally wiring.**

This matters because the whole point of this PR is the runner-side hook. A future refactor that accidentally changes:

```python
notify_upcoming_job(job["id"])
try:
    await process_job(job)
finally:
    cancel_upcoming_job(job["id"])
```

into:

```python
notify_upcoming_job(job["id"])
try:
    await process_job(job)
except Exception:
    pass
cancel_upcoming_job(job["id"])
```

...would pass all 22 tests but silently break exception handling (the current outer `except Exception: log.error(...)` path would no longer fire because the inner except would swallow it). Similarly, replacing `finally` with a trailing call outside the `try` would break the exception path.

At minimum, a test that mocks `process_job` to raise and verifies:
1. `cancel_upcoming_job` fires (dict empties).
2. The exception propagates (caller sees it).

Would catch the above refactor bugs.

**Severity: HIGH coverage gap.** Not blocking production correctness today, but the PR's primary invariant is untested.

---

## Section 4 — Test coverage (`test_pod_prewarm.py`)

### 4.1 — Test quality — PASS

All 8 tests cited in the spec are present ([test_pod_prewarm.py:tests 15-22](tests/manual/test_pod_prewarm.py)). Spot checks:

- **Test 15** (`test_15_notify_job_adds_to_upcoming_jobs`): brings pod to "ready" manually, calls `notify_upcoming_job("job-1")`, asserts `"job-1" in _upcoming_jobs` AND `_upcoming_words == {}` AND `len(handler.calls) == 0` (no HTTP — because pod is already ready). **Non-trivial: verifies the dict is populated, the word dict is unaffected, and no cold-start fires when pod is already ready.** ✓
- **Test 16** (guard): patches `VIDEO_BACKEND="fal"`, verifies dict stays empty + `_last_activity` unchanged + no HTTP. Asserts all four invariants. ✓
- **Test 17** (cold-start trigger): uses the canonical successful `make_successful_ensure_handler`, asserts pod reaches "ready" state, asserts exactly 3 HTTP calls (POST + 2 GETs). **Non-trivial: verifies the daemon thread actually spun up and ran `ensure_pod_ready` to completion.** ✓
- **Test 18** (cancel + activity bump): pre-populates `_upcoming_jobs["job-1"]` with an old timestamp, sets `_last_activity = 0.0`, calls cancel, asserts dict empty and `_last_activity > 0.0`. ✓
- **Test 19** (idempotent cancel): fresh state, calls cancel with unknown key, asserts no exception + `_last_activity` NOT bumped. **Non-trivial: verifies the guard inside cancel that only bumps activity when a pop actually removed something.** ✓
- **Test 20** (idle_check respects _upcoming_jobs): sets `_last_activity = now - 3600` (far past idle timeout), puts "job-1" in `_upcoming_jobs`, uses empty HTTP handler (any call = test failure), asserts pod stays "ready". **Non-trivial: verifies the new guard blocks termination.** ✓
- **Test 21** (stale GC): patches `POD_PREWARM_JOB_STALE_SECONDS` to 5, inserts one 10-s-old entry and one fresh entry, runs idle_check, asserts only the old one is removed. **Non-trivial: tests both the threshold and that fresh entries survive.** ✓
- **Test 22** (independence): populates both dicts, calls `cancel_upcoming_video("w1")`, verifies `_upcoming_words` empty but `_upcoming_jobs` still has "j1"; then `cancel_upcoming_job("j1")` and verifies `_upcoming_jobs` empty. ✓

All 8 tests are non-trivial and would catch a mangled implementation.

### 4.2 — Existing test integrity — PASS

Existing tests 1-14 were not modified in the implementation diff (verified by reading the diff). All still pass (22/22 including new). No existing test short-circuits via the new code: the only shared code change is `_run_prewarm`'s early-out now checking two dicts instead of one, and `_reset_state` clearing both dicts. Both are strict supersets of prior behavior for the word-only tests.

Specifically, test 5 (stale GC for words) and test 4 (idle_check terminates) continue to work because `_upcoming_jobs` is empty in their fixtures (cleared by `reset_module_state`). ✓

### 4.3 — Hook B integration test — See H1

See finding H1 above.

---

## Section 5 — Concurrency and race conditions

### 5.1 — Lock ordering — PASS

All `_upcoming_jobs` mutations ([line 172](cloud_engines/video_engine/pod_manager.py#L172), [615](cloud_engines/video_engine/pod_manager.py#L615), [640](cloud_engines/video_engine/pod_manager.py#L640), [682-692](cloud_engines/video_engine/pod_manager.py#L682-L692)) occur inside `with _lock:` blocks. The sole read outside an explicit lock is in `_run_prewarm` ([line 654](cloud_engines/video_engine/pod_manager.py#L654)) — which IS inside `with _lock:`. ✓

### 5.2 — `_run_prewarm` daemon thread — PASS

`_prewarm_in_flight` guard at [line 617](cloud_engines/video_engine/pod_manager.py#L617) prevents double-spawn.

Scenario: `notify_upcoming_job("j1")` fires at T=0, spawns thread, sets `_prewarm_in_flight=True`. Then `notify_upcoming_video("w1")` fires at T=100ms (process_word reached inside process_job). Second notify sees `_prewarm_in_flight=True`, does NOT spawn a second thread. Dict `_upcoming_words["w1"]` still populated. `_run_prewarm` thread continues, calls `ensure_pod_ready()` which is idempotent against concurrent calls (uses `_lock` internally). ✓

### 5.3 — Stale GC during active job — PASS

If a job runs >1 hour (very slow multi-word deck), GC removes `"j1"` from `_upcoming_jobs` at 1h. But:
- If any word is currently between `notify_upcoming_video` and `cancel_upcoming_video`, `_upcoming_words` has that entry (its own 20-min GC is per-word, resetting on each word's `notify`).
- If any word is in the video stage (scene in flight), `_active_jobs > 0` keeps the pod alive.
- Between words (post-bookend of word A, pre-images of word B): there's a narrow window where all three are clear. In the current pre-PR code, that window was already vulnerable; the 1h job GC is strictly better than no job-level signal at all.

No new hazard introduced. The author's trade-off (job GC at 1h is a safety net, not a primary guard) is sound. ✓

### 5.4 — Race: cancel_upcoming_job vs idle_check — PASS

Scenario: `main()` `finally` fires `cancel_upcoming_job` at T. `_pod_idle_loop` wakes at T.

Order A: cancel acquires lock first, empties dict, bumps `_last_activity` to T. idle_check acquires lock next, GC runs (nothing stale), sees `_upcoming_jobs == {}`, checks `idle_seconds = now - _last_activity ≈ 0 < RUNPOD_IDLE_TIMEOUT`, returns. Pod survives. ✓

Order B: idle_check acquires lock first, GC runs, sees `_upcoming_jobs != {}`, returns early at line 705. cancel acquires lock next, empties dict. Pod survives this tick; next tick (60s later) may terminate. ✓

Both orderings safe.

---

## Section 6 — Production readiness

### 6.1 — Logging

- `notify_upcoming_job` logs at INFO when pre-warm triggers ([line 621](cloud_engines/video_engine/pod_manager.py#L621)): `"RunPod: Pre-warming pod for upcoming job %s"`. ✓
- `cancel_upcoming_job` does NOT log. Matches existing `cancel_upcoming_video`. See M3 below.
- Stale GC logs WARNING ([line 693-696](cloud_engines/video_engine/pod_manager.py#L693-L696)): `"RunPod: Stale _upcoming_jobs entry removed: %s (age >= %ds)"`. ✓ Greppable by `_upcoming_jobs`.

### FINDING M3 — cancel paths are silent

[pod_manager.py:629-641](cloud_engines/video_engine/pod_manager.py#L629-L641) `cancel_upcoming_job` emits no log. Mirrors existing `cancel_upcoming_video`. In production, there is no way to distinguish from logs alone whether a pod termination followed a clean cancel or a stale-GC sweep. For ops debugging this matters.

**Severity: MEDIUM.** Pre-existing pattern but worth noting.

### FINDING M4 — thread name doesn't distinguish job from word

[pod_manager.py:625](cloud_engines/video_engine/pod_manager.py#L625):

```python
name=f"pod-prewarm-{str(job_id)[:8]}",
```

Word version ([line 578](cloud_engines/video_engine/pod_manager.py#L578)):

```python
name=f"pod-prewarm-{str(word_id)[:8]}",
```

Both yield `pod-prewarm-XXXXXXXX`. When reading thread dumps or `threading.enumerate()`, you can't tell which trigger spawned it. The tests compound this: `wait_for_prewarm_threads` matches both via `t.name.startswith("pod-prewarm-")` — works fine for tests, but in prod there's no way to map a zombie thread back to its trigger.

**Severity: MEDIUM.** Observability gap only.

### 6.2 — Failure modes

- **Supabase down, `process_job` raises immediately:** `cancel_upcoming_job` still fires via `finally`. ✓
- **RunPod API fails during pre-warm:** `_run_prewarm` catches the exception at [line 659-660](cloud_engines/video_engine/pod_manager.py#L659-L660), logs warning, clears `_prewarm_in_flight`. `_upcoming_jobs["j1"]` persists until cancel (from `finally`) or stale GC. No leak beyond the current job's lifetime. ✓
- **`threading.Thread.start()` fails** (OS out of threads, pathological): `_prewarm_in_flight=True` stuck, `_upcoming_jobs[job_id]` populated but cold-start never ran. `cancel_upcoming_job` at end of `process_job` still clears the dict entry. But `_prewarm_in_flight` remains True forever, permanently disabling async pre-warm for subsequent jobs (sync ensure_pod_ready still works). **This hazard was pre-existing for `notify_upcoming_video` and is inherited, not introduced.** No regression.

### 6.3 — Backward compatibility — PASS

Verified against the diff:
- `_upcoming_words`, `notify_upcoming_video`, `cancel_upcoming_video`: untouched. ✓
- `_active_jobs`, `acquire_use`, `release_use`: untouched (zero diff in those functions). ✓
- `idle_check`: only additions (new GC block + new guard); existing guards and GC unchanged. ✓

### 6.4 — Conflict surface with parallel Suno reorder work — PASS

This PR touches:
- `pod_manager.py` — not a Suno concern.
- `config.py` — added one constant; no risk of overlap.
- `job_runner.py` only at lines 43-48 (import block) and 981-994 (outer `main()` loop).

Suno reorder will touch `src/pipeline.py`, `process_word` internals, and song-stage code. **No overlap with the outer `main()` poll loop or with `pod_manager.py`.** Zero expected conflict.

---

## Section 7 — Spec compliance — PASS

Cross-referenced against `IMPLEMENTATION_PLAN_JOB_PREWARM.md` "Out of scope":

| Constraint | Verified |
|---|---|
| Did not modify `_upcoming_words` / `notify_upcoming_video` / `cancel_upcoming_video` | ✓ |
| Did not modify `_active_jobs` / `acquire_use` / `release_use` | ✓ |
| Did not touch LTX adapter | ✓ (zero diff in `adapters/ltx_selfhosted.py`) |
| Did not touch assembly / bookend / pipeline stage code | ✓ (zero diff in `src/pipeline.py`) |
| Did not add Supabase client to `pod_manager.py` | ✓ (imports unchanged besides adding `POD_PREWARM_JOB_STALE_SECONDS`) |
| Did not change `RUNPOD_IDLE_TIMEOUT` default | ✓ |
| Did not change pipeline stage order / smart-retry / `stages_to_run` | ✓ |
| Did not add new dependencies | ✓ (no changes to `pyproject.toml` / `requirements.cloud.txt`) |

One scope observation: the author extended `_run_prewarm`'s early-out check — this was flagged in the Phase 1 plan (IP-Q2) as a necessary correctness fix for the new code path, not a gratuitous refactor. The change is minimal (one boolean term added) and the Phase 1 plan documents the rationale. Acceptable.

---

## Findings table

| ID | Severity | Summary | File:line |
|---|---|---|---|
| H1 | HIGH | No integration test for `job_runner.main()` Hook B `try/finally`. A refactor from `finally` → `except: pass` would pass all 22 tests. | [test_pod_prewarm.py](tests/manual/test_pod_prewarm.py) (absent test); relates to [job_runner.py:990-994](job_runner.py#L990-L994) |
| M1 | MEDIUM | `_run_prewarm` docstring still only mentions `_upcoming_words` / "word"; code checks both dicts. | [pod_manager.py:644-649](cloud_engines/video_engine/pod_manager.py#L644-L649) |
| M2 | MEDIUM | `idle_check` docstring mentions only `_upcoming_words`; references hardcoded "300s" instead of `RUNPOD_IDLE_TIMEOUT`. | [pod_manager.py:666-672](cloud_engines/video_engine/pod_manager.py#L666-L672) |
| M3 | MEDIUM | `cancel_upcoming_job` emits no log — no way to distinguish clean cancel from stale-GC in prod logs. (Pre-existing pattern, worth noting.) | [pod_manager.py:629-641](cloud_engines/video_engine/pod_manager.py#L629-L641) |
| M4 | MEDIUM | Thread name `pod-prewarm-{id[:8]}` identical for word- and job-triggered pre-warms; can't distinguish in thread dumps. | [pod_manager.py:625](cloud_engines/video_engine/pod_manager.py#L625) vs [578](cloud_engines/video_engine/pod_manager.py#L578) |
| L1 | LOW | Import order in `job_runner.py` is paired (video pair, job pair) rather than alphabetical. Style only. | [job_runner.py:43-48](job_runner.py#L43-L48) |

No CRITICAL findings. No scope violations.

---

## Recommended action

**Must fix before merge:**

- **H1** — add at least one test that asserts `cancel_upcoming_job` fires when `process_job` raises. Even a small pytest-style async test or a hand-rolled asyncio runner in `test_pod_prewarm.py` style would do. This protects the PR's primary invariant against future refactors.

**Recommended for this PR but deferrable:**

- **M1, M2** — doc drift. Two-line fix each. Ship with H1's test or as a trailing cleanup commit.

**Defer to follow-up:**

- **M3** — logging on cancel paths. Warrants a broader "pod lifecycle observability" pass covering both `cancel_upcoming_video` and `cancel_upcoming_job`. Out of scope for a small PR.
- **M4** — thread name disambiguation. Low-impact; requires coordination if any monitoring scripts grep for `pod-prewarm-` prefixes.
- **L1** — style; ignore or fix during a separate import-sort sweep.

**Verdict:** NEEDS CHANGES for H1 (minor — one test). Everything else is defer-friendly. Post H1 fix, this is ready to merge.
