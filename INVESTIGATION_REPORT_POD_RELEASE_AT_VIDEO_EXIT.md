# Investigation Report — Pod Lifecycle: Idle Timeout Env Var + Release-at-Video-Exit

**Date:** 2026-04-17
**Scope:** Read-only code investigation. No code changes proposed.
**Target branch/commits:** `main` (post-merge of `fix/pod-manager-cleanup` — commits `5703016`, `1767f5a`, `44c4da2`).

---

## Q1 — Is `RUNPOD_IDLE_TIMEOUT` read from env?

**Answer:** Yes. It is read via `os.getenv` with default `"300"`, parsed as `int`, no validation/clamp. If Railway supplies `RUNPOD_IDLE_TIMEOUT=30`, the running code will use `30` (seconds) as the timeout — **conditional** on the process having been restarted after the env var was set (the value is captured at module import time, never re-read).

**Evidence:**

[orchestrator/cloud_engines/video_engine/config.py:49](orchestrator/cloud_engines/video_engine/config.py#L49)

```python
RUNPOD_IDLE_TIMEOUT: int = int(os.getenv("RUNPOD_IDLE_TIMEOUT", "300"))
```

- Only one read site in production code (verified via repo-wide grep).
- Module-level constant — `int()` is applied once on import; there is no re-read loop and no clamp/minimum.
- `load_dotenv()` runs at [config.py:15](orchestrator/cloud_engines/video_engine/config.py#L15) before the constant is bound, so both `.env` and container env are honored.

Usage in the idle-check branch: [orchestrator/cloud_engines/video_engine/pod_manager.py:647-651](orchestrator/cloud_engines/video_engine/pod_manager.py#L647-L651)

```python
if idle_seconds < RUNPOD_IDLE_TIMEOUT:
    return
logger.info(
    "RunPod: Pod %s idle for %.0fs (timeout=%ds) - terminating",
    _pod_id, idle_seconds, RUNPOD_IDLE_TIMEOUT,
)
```

The log line includes `timeout=%ds` — a live log from the Railway run would reveal what value the running process actually has.

**INVESTIGATE FURTHER:** Whether the currently-running Railway container was restarted after `RUNPOD_IDLE_TIMEOUT=30` was set. I cannot verify live env state from code alone.

---

## Q2 — Where does the pod-release signal fire?

There are effectively **two** signals that together determine pod release:

1. `cancel_upcoming_video(word_id)` — removes the word from `_upcoming_words` (stops keep-alive)
2. `release_use()` — decrements `_active_jobs` and updates `_last_activity` (starts the idle countdown)

### Populate site — `notify_upcoming_video(word_id)`

**File:line:** [orchestrator/job_runner.py:259-260](orchestrator/job_runner.py#L259-L260)

```python
# Pipeline-driven pod pre-warm: trigger cold-start if video stage is
# scheduled, so the pod warms in parallel with images/concept/song.
# No-op when POD_PREWARM_ENABLED is false or in local storage mode.
if "video" in stages_to_run:
    notify_upcoming_video(word_record["id"])
```

Called **once per word, before the stage loop**, inside `process_word()` at [job_runner.py:154](orchestrator/job_runner.py#L154). So the word enters `_upcoming_words` *before* the first upstream stage (images) runs.

Exactly one call site in production code.

### Drain sites — `cancel_upcoming_video(word_id)`

There are **two** call sites, both in `job_runner.py`:

**Drain site #1 — at video-stage entry (success path):**
[orchestrator/job_runner.py:266-269](orchestrator/job_runner.py#L266-L269)

```python
# Hand off pre-warm tracking to acquire_use (fired inside the video
# adapter). Idempotent, safe if notify was never called.
if stage == "video":
    cancel_upcoming_video(word_record["id"])
```

This fires **at the start of the `video` iteration** of the `for stage in stages_to_run` loop ([job_runner.py:262](orchestrator/job_runner.py#L262)), *before* `run_stage` is awaited. So the word leaves `_upcoming_words` the moment the video stage begins, not when it ends. Keep-alive after this point is provided by `_active_jobs > 0`, incremented inside the video adapter.

**Drain site #2 — on pre-video-stage failure:**
[orchestrator/job_runner.py:301-304](orchestrator/job_runner.py#L301-L304)

```python
if not success:
    # Release pre-warm tracking. Idempotent: no-op if already cancelled
    # at video-stage entry or never notified.
    cancel_upcoming_video(word_record["id"])
```

Fires inside the shared pipeline-stage loop when any stage (images/concept/song/video) fails after all retries are exhausted. Idempotent — no-op if a prior successful video entry already drained the dict.

### Stage correspondence of drain sites

| Drain site | File:line | Pipeline stage it corresponds to |
|---|---|---|
| #1 Success path | job_runner.py:268-269 | **Entry of `video` stage** (dict emptied *before* `run_stage('video')` is awaited) |
| #2 Failure path | job_runner.py:301-304 | After **any** stage fails terminally in the shared pipeline loop (images/concept/song/video) |

Neither drain site fires at end-of-word, end-of-video-stage, or end-of-bookend. The `_upcoming_words` dict is cleared at video-stage **entry**, not exit. The `_active_jobs` counter then takes over as the keep-alive signal until `release_use()` is called.

### The actual "pod-release" trigger is `release_use()`

While `cancel_upcoming_video` drains `_upcoming_words`, the counter that gates termination during the video stage is `_active_jobs`, driven by `acquire_use` / `release_use` in the self-hosted adapter:

[orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:104-108](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L104-L108)

```python
level2_release = None
if not worker_url:
    from ..pod_manager import acquire_use, ensure_pod_ready, release_use
    worker_url, worker_token = ensure_pod_ready()
    level2_release = release_use
```

[orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:138-139](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L138-L139)

```python
if level2_release is not None:
    acquire_use()
```

[orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:398-400](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L398-L400)

```python
finally:
    if level2_release is not None:
        level2_release()
```

`acquire_use` increments `_active_jobs`; `release_use` decrements it and updates `_last_activity` to `time.monotonic()`:

[orchestrator/cloud_engines/video_engine/pod_manager.py:528-533](orchestrator/cloud_engines/video_engine/pod_manager.py#L528-L533)

```python
def release_use() -> None:
    """Mark job complete. Called in finally block after job ends."""
    global _active_jobs, _last_activity
    with _lock:
        _active_jobs = max(0, _active_jobs - 1)
        _last_activity = time.monotonic()
```

**Important detail:** `release_use` is called **per scene**, not once per video stage. The video stage iterates scenes here ([src/pipeline.py:915-918](orchestrator/src/pipeline.py#L915-L918)):

```python
results = []
for vp in payloads:
    vresult = await call_engine('video', vp)
    results.append(vresult)
```

Each `call_engine('video', vp)` goes through the adapter's `acquire_use → submit → poll → release_use` (finally) cycle. Between scenes, `_active_jobs` briefly drops to 0. The idle_check polls only every 60s ([start_cloud.py:149](orchestrator/start_cloud.py#L149)), so brief dips between scenes will not cause termination unless the gap exceeds `RUNPOD_IDLE_TIMEOUT`.

**Net effect of the current design:** The *de facto* pod-release trigger fires when the **last scene of the video stage finishes** (final `release_use` in the adapter's finally block). After that, `_active_jobs == 0`, `_upcoming_words` is already empty (drained at video-stage entry), and `_last_activity` is set to that moment. The pod is then eligible for idle-check termination on the next 60s tick, after `idle_seconds >= RUNPOD_IDLE_TIMEOUT`.

---

## Q3 — What triggers the idle countdown?

**Answer:** All three conditions must hold simultaneously for termination: `_pod_status == "ready"`, `_active_jobs == 0`, `_upcoming_words` empty. *Then* `idle_seconds >= RUNPOD_IDLE_TIMEOUT` (where `idle_seconds = now - _last_activity`) must hold. The countdown is not a separate timer — it is a `monotonic() - _last_activity` subtraction done inside `idle_check()` every 60s.

**Evidence:** [orchestrator/cloud_engines/video_engine/pod_manager.py:618-653](orchestrator/cloud_engines/video_engine/pod_manager.py#L618-L653)

```python
def idle_check() -> None:
    """If pod is ready and idle past timeout, terminate it.
    ...
    """
    with _lock:
        # Stale-entry GC (runs regardless of pod state)
        now = time.monotonic()
        stale = [
            wid for wid, ts in _upcoming_words.items()
            if now - ts >= POD_PREWARM_STALE_SECONDS
        ]
        for wid in stale:
            del _upcoming_words[wid]
            logger.warning(
                "RunPod: Stale _upcoming_words entry removed: %s (age >= %ds)",
                wid, POD_PREWARM_STALE_SECONDS,
            )

        if _pod_status != "ready" or not _pod_id:
            return
        if _active_jobs > 0:
            return
        if _upcoming_words:
            return
        idle_seconds = now - _last_activity
        if idle_seconds < RUNPOD_IDLE_TIMEOUT:
            return
        logger.info(
            "RunPod: Pod %s idle for %.0fs (timeout=%ds) - terminating",
            _pod_id, idle_seconds, RUNPOD_IDLE_TIMEOUT,
        )
        _terminate_pod_locked(_pod_id)
```

The function is called on a 60-second loop: [orchestrator/start_cloud.py:147-155](orchestrator/start_cloud.py#L147-L155)

```python
async def _pod_idle_loop() -> None:
    while True:
        await asyncio.sleep(60)
        try:
            await asyncio.to_thread(pod_manager.idle_check)
        except Exception:
            logger.exception("pod_manager.idle_check failed")

asyncio.create_task(_pod_idle_loop())
```

**Cross-reference with Q2:** Because `cancel_upcoming_video` drains `_upcoming_words` at video-stage *entry* and `release_use` in the adapter's finally block drops `_active_jobs` to 0 after the **last scene** finishes, the countdown effectively starts at **end-of-video-stage** already — not at end-of-word. Assembly and bookend stages do not touch `pod_manager` at all (verified: no `pod_manager` imports in [src/pipeline.py](orchestrator/src/pipeline.py) and no `acquire_use`/`release_use`/`notify_upcoming_video` calls in the assembly/bookend code paths).

**Expected termination latency after final scene of video stage, with `RUNPOD_IDLE_TIMEOUT=30`:**

- best case: ~30s (idle_check ticks right after the 30s threshold is crossed)
- worst case: ~30s + ~60s poll interval ≈ 90s + a few seconds for the RunPod DELETE round-trip

If the observed pod lived for **~180s** after video completion, the likely explanations are:
- the process was not restarted after `RUNPOD_IDLE_TIMEOUT=30` was set in Railway (still using `300` default), or
- the `time.monotonic()` baseline got refreshed during the post-video interval (see the "refresh" risk in Q5 below — but I cannot see one in the current code path), or
- some other reason not evident from code alone.

**INVESTIGATE FURTHER:** Check the `RunPod: Pod %s idle for %.0fs (timeout=%ds) - terminating` log line emitted when the pod was terminated — the `timeout=%d` in that log reveals the live value of `RUNPOD_IDLE_TIMEOUT`. This is the definitive test for whether `=30` was applied.

---

## Q4 — Pipeline stage hooks

### Stage list / order

**File:line:** [orchestrator/src/pipeline.py:27](orchestrator/src/pipeline.py#L27)

```python
STAGE_ORDER = ['images', 'concept', 'song', 'video', 'assembly', 'bookend']
```

### Stage invocation in the runner

The shared stage loop (for `images`, `concept`, `song`, `video`) is at [orchestrator/job_runner.py:262-305](orchestrator/job_runner.py#L262-L305):

```python
for stage in stages_to_run:
    if stage in AB_STAGES:
        continue  # Handled by A/B loop below

    # Hand off pre-warm tracking to acquire_use (fired inside the video
    # adapter). Idempotent, safe if notify was never called.
    if stage == "video":
        cancel_upcoming_video(word_record["id"])

    ...
    success = False
    for attempt in range(MAX_RETRIES + 1):
        try:
            log.info("    Stage %s (attempt %d)", stage, attempt + 1)
            await run_stage(workspace_path, word_slug_val, stage)
            success = True
            break
        except Exception as e:
            ...
    if not success:
        cancel_upcoming_video(word_record["id"])
        ...
        return False
```

`AB_STAGES = {'assembly', 'bookend'}` is skipped here and handled later by separate A/B loops (Suno path and ACE-Step path), starting at roughly [job_runner.py:386](orchestrator/job_runner.py#L386) onwards.

### Execution path of the `video` stage

- **Stage entry (runner side):** [job_runner.py:268-269](orchestrator/job_runner.py#L268-L269) — pre-cancels `_upcoming_words` for this word.
- **Stage entry (pipeline side):** [src/pipeline.py:879-914](orchestrator/src/pipeline.py#L879-L914) — the `elif stage == 'video':` branch in `run_stage`: resolves images version, target duration, creative direction; calls `build_video_payloads`.
- **Stage body:** [src/pipeline.py:915-918](orchestrator/src/pipeline.py#L915-L918) — loops over scene payloads, calling `call_engine('video', vp)` which dispatches to the LTX-selfhosted adapter per scene.
- **Adapter per scene:** [cloud_engines/video_engine/adapters/ltx_selfhosted.py:102-109](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L102-L109) (ensure_pod_ready on first scene) → [138-139](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L138-L139) (acquire_use) → submit/poll/download → [398-400](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L398-L400) (release_use in finally).
- **Stage exit (pipeline side):** [src/pipeline.py:920-928](orchestrator/src/pipeline.py#L920-L928) — aggregates scene results and returns.
- **Stage exit (runner side):** Control returns to the `for stage in stages_to_run` loop in `job_runner.py`. The next iteration is `assembly` (if in `stages_to_run`), which is `continue`d over because it's in `AB_STAGES`.

### Is there a post-stage hook at end-of-video?

The runner loop has no explicit post-stage hook at end-of-video. The `for stage in stages_to_run` loop simply advances to the next stage. There is no `if stage == "video": release_pod_if_idle()` or equivalent.

However, **there is already a de facto post-stage pod-release**: the final `release_use()` call in the adapter's finally block ([ltx_selfhosted.py:398-400](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L398-L400)) runs for the last scene. After that, all keep-alive signals are clear (`_upcoming_words` empty, `_active_jobs == 0`, `_last_activity` set to monotonic-now). The pod is eligible for `idle_check` termination from that point forward, bounded by the idle timeout + 60s polling cadence.

A post-stage hook added at the runner level (e.g., right after the `for stage` loop exits the `video` iteration) would add at most a few seconds of earliness versus the current design, because the adapter's per-scene `release_use` already sets `_last_activity` at essentially the same moment.

---

## Q5 — Isolation check: can pod-release be moved to video-stage exit?

**Nuance:** Based on the code as it stands, pod-release *already* effectively fires at video-stage exit (via the adapter's finally block). If the goal is **eager termination** — calling `_terminate_pod_locked(...)` immediately when the last scene finishes, bypassing the idle_check polling window entirely — that is a different change from "moving the signal". This section answers both framings.

### Framing A — Adding an eager-terminate signal at video-stage exit

**Files that would need to change (minimal set):**

- [orchestrator/cloud_engines/video_engine/pod_manager.py](orchestrator/cloud_engines/video_engine/pod_manager.py) — expose a new entry point (e.g., `release_pod_if_idle()` or similar) that wraps the current `idle_check` termination branch without the `_last_activity` idle-seconds gate.
- [orchestrator/job_runner.py](orchestrator/job_runner.py) — invoke that new entry point after the `video` stage succeeds. Either right after `await run_stage(..., 'video')` (inside the retry loop) or by re-introducing a post-stage hook.

That is a **2-file change**, self-contained. No pipeline-layer refactor required. The adapter already owns `release_use` / `ensure_pod_ready`; the new release signal would be at a higher layer (runner), which is where pipeline-stage-awareness already lives.

### Framing B — Merely moving `cancel_upcoming_video` from video-stage entry to video-stage exit

This would be worse, not better. Moving `cancel_upcoming_video` to after the video stage would keep `_upcoming_words` populated *during* the video stage — but the stage is already gated by `_active_jobs` during that window, so the dict entry is redundant protection. Worst case: if the video adapter somehow exits without calling `release_use` (bug), a stale `_upcoming_words` entry + still-counting `_active_jobs` could double-hold the pod until stale-entry GC clears it. Not recommended.

### Assembly / bookend dependency on the pod

**Answer: No dependency.** Searched entire `orchestrator/` tree for `pod_manager`, `ensure_pod_ready`, `acquire_use`, `release_use`, `notify_upcoming_video`, `cancel_upcoming_video`. The only production-code occurrences are in:

- `orchestrator/job_runner.py` (runner hooks)
- `orchestrator/cloud_engines/video_engine/pod_manager.py` (the module itself)
- `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py` (the video adapter)
- `orchestrator/start_cloud.py` (the idle loop + orphan cleanup)

None of the assembly or bookend engines (under `orchestrator/engines/...` or `orchestrator/cloud_engines/...`) reference the pod. They run on Railway CPU as expected.

### Retry path concern

**Question:** What happens if video succeeds but assembly fails and needs retry? Does the retry path need the pod?

**Answer:** No. Assembly retries at [orchestrator/job_runner.py:437-461](orchestrator/job_runner.py#L437-L461) call `await run_stage(workspace_path, word_slug_val, 'assembly')`. Assembly runs on Railway CPU and never touches pod_manager. Bookend is the same. Video itself retries within its own stage's attempt loop ([job_runner.py:277-299](orchestrator/job_runner.py#L277-L299)) **before** the video stage exits — so eager-terminate at video-stage exit happens after all video retries are exhausted (success or final failure). There is no "rerun video after assembly fails" code path.

**INVESTIGATE FURTHER:** Suno retry jobs. See `process_suno_retry_job` at [job_runner.py:616-720](orchestrator/job_runner.py#L616-L720). These re-enter via `bake_suno_into_word`, which I have not traced fully. If any retry job can trigger the video stage, then the pod would need to be re-warmed for it — but that's not "breakage", that's just a cold start. Flagging for verification.

---

## Q6 — Interaction with `_upcoming_words` in multi-word runs

### The serial model

The job runner processes words serially inside `process_job`:

[orchestrator/job_runner.py:861-875](orchestrator/job_runner.py#L861-L875)

```python
for word_rec in words:
    ...
    success = await process_word(job, word_rec, workspace_path, e)
```

Inside `process_word`, the sequence for each word is:

1. `notify_upcoming_video(word_id)` ([job_runner.py:260](orchestrator/job_runner.py#L260)) — **word added to `_upcoming_words`**
2. Images → Concept → Song stages (shared loop)
3. At video-stage entry: `cancel_upcoming_video(word_id)` ([job_runner.py:269](orchestrator/job_runner.py#L269)) — **word removed from `_upcoming_words`**
4. Video stage scenes (each: `acquire_use` → job → `release_use`)
5. Assembly + Bookend (A/B passes)
6. Upload, metadata, return

**Control does not return to the outer `for word_rec in words:` loop until all of steps 1-6 complete for the current word.** That means `notify_upcoming_video` for word B runs *after* `process_word` for word A has fully returned (post-bookend).

### Trace — Word A finishes video, Word B hasn't started

Let T₀ = moment word A's video stage's last scene finishes (last `release_use`).

| Time | State |
|---|---|
| T₀ (last scene finishes) | `_upcoming_words = {}`, `_active_jobs = 0`, `_last_activity = T₀` |
| T₀ + Δ (A's assembly runs) | unchanged — assembly does not touch `pod_manager` |
| T₀ + Δ + Δ′ (A's bookend runs) | unchanged |
| T₀ + word_A_post_video_duration (A's `process_word` returns) | unchanged |
| Immediately after — B's `process_word` starts | `notify_upcoming_video(B)` fires at [job_runner.py:260](orchestrator/job_runner.py#L260) → **word B added to `_upcoming_words`** |

**Gap-to-keep-warm-for-B problem:** During the interval `[T₀, T_B_notify]` (i.e. word A's assembly + bookend + upload + metadata time), neither `_upcoming_words` nor `_active_jobs` protects the pod. The pod survives only if `T_B_notify - T₀ < RUNPOD_IDLE_TIMEOUT` (modulo the 60s polling grace). With `=30`, any assembly+bookend run exceeding 30s kills the pod. With the `300` default, the pod usually survives.

### If the pod-release signal were moved to video-stage exit (Framing A, eager-terminate)

In the current code, **the signal is already effectively at video-stage exit** — `release_use` fires on the last scene, after which only the `RUNPOD_IDLE_TIMEOUT` window stands between video exit and termination. Adding an explicit eager-terminate hook would remove that window entirely, meaning the pod would terminate immediately at video exit **even if word B is 30s away from needing it**.

**Critical for Q6:** At T₀ (word A's video ends), word B is **not yet in `_upcoming_words`** — because word B's `notify_upcoming_video` is triggered from inside `process_word(B)`, which runs after word A's `process_word` fully returns (post-bookend). So a dict check at video-stage exit would find `_upcoming_words == {}` and see no reason to keep the pod alive for B.

**Concrete breakage scenario for eager-terminate:** Two-word deck. Word A's video finishes at T=0. An eager-terminate at video-stage exit kills the pod immediately. Word A's assembly+bookend+upload run for 60s. Word B's `process_word` starts at T=60 and calls `notify_upcoming_video(B)` — the pod is gone; full cold start required. This defeats the multi-word keep-warm intent that the current `_upcoming_words` + `RUNPOD_IDLE_TIMEOUT=300` design provides.

**INVESTIGATE FURTHER:** Whether the two-word test run cited in the prompt (red, accident) observed a second pod cold start for word B, or whether the single pod spanned both words. That would confirm or refute how often the keep-warm gap matters in practice.

### Current design vs alternatives — summary

| Design | Pod kept alive while A is between video-exit and word-end? | Pod kept alive for B's video? |
|---|---|---|
| **Current** (`cancel` at video-entry, idle_check w/ `RUNPOD_IDLE_TIMEOUT`) | Yes, up to `RUNPOD_IDLE_TIMEOUT` seconds | Yes, if B reaches `notify_upcoming_video` within `RUNPOD_IDLE_TIMEOUT` of A's video exit |
| **Eager-terminate at video-exit** | No (killed immediately) | No — requires cold start for B |
| **`cancel` moved to end-of-word (post-bookend)** | Yes (dict holds A's entry through bookend) | Yes, no gap; B's notify fires before A's cancel drains? — actually, A's cancel fires at end-of-A, B's notify fires at start-of-B; these are sequential in the serial runner, so dict briefly empty. Still better than current w/ `=30`. |

---

## Q7 — Any other pod-keepalive mechanisms

**Answer: None found.** Searched for:

- `terminate`, `keep.?alive`, `heartbeat`, `_last_activity`, `_active_jobs` (grep, `*.py`)

Production-code matches are confined to:
- `orchestrator/cloud_engines/video_engine/pod_manager.py` (core)
- `orchestrator/cloud_engines/video_engine/config.py` (just `RUNPOD_IDLE_TIMEOUT` declaration)
- `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py` (acquire/release only, no keepalive heartbeat)
- `orchestrator/start_cloud.py` (60s idle_check loop + orphan cleanup)

Other non-matches worth noting:
- **No heartbeat / keep-alive ping** to the RunPod API or the worker from the orchestrator side. `_quick_health_check` at [pod_manager.py:473-480](orchestrator/cloud_engines/video_engine/pod_manager.py#L473-L480) is only called from `ensure_pod_ready` as a sanity check before returning a cached pod URL — it does not reset `_last_activity` unless `ensure_pod_ready` itself is called.
- **No cron / scheduler** polling the pod from elsewhere in the codebase.
- **No GPU-worker-side self-termination code** in the orchestrator (the LTX worker at `ltx-worker/` is a separate repo/process; from the orchestrator, the only pod termination path is `_terminate_pod_locked` via `idle_check`, `ensure_pod_ready`'s recreate-on-failed-healthcheck, `_wait_for_pod_ready`'s timeout cleanup, or `cleanup_orphans`).
- **Orphan cleanup** at [pod_manager.py:656-730](orchestrator/cloud_engines/video_engine/pod_manager.py#L656-L730) terminates stray `resonance-gpu-worker` pods >600s old at orchestrator startup — not a keepalive.

The single source of truth for pod-keep-alive decisions is the combination `(_pod_status == "ready") && (_active_jobs > 0 || _upcoming_words != {} || (now - _last_activity) < RUNPOD_IDLE_TIMEOUT)`, as implemented in [pod_manager.py:640-648](orchestrator/cloud_engines/video_engine/pod_manager.py#L640-L648).

---

## Summary

- **Is `RUNPOD_IDLE_TIMEOUT=30` respected?** Yes — if the Railway process was restarted after the env var was set. The value is captured once at module import in [config.py:49](orchestrator/cloud_engines/video_engine/config.py#L49) with no clamp. The definitive live check is the `timeout=%d` field in the `RunPod: Pod %s idle for %.0fs (timeout=%ds) - terminating` log line at [pod_manager.py:649-651](orchestrator/cloud_engines/video_engine/pod_manager.py#L649-L651). If that log shows `timeout=300`, the env var did not take effect.

- **Where does pod-release currently fire?** Two coordinated signals:
  1. `cancel_upcoming_video` at **video-stage entry** ([job_runner.py:268-269](orchestrator/job_runner.py#L268-L269)) drains `_upcoming_words`.
  2. `release_use` at **end of each video scene** in the adapter's `finally` ([ltx_selfhosted.py:398-400](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L398-L400)) drops `_active_jobs` to 0 and sets `_last_activity`.
  Effective termination trigger: **end of the last video scene**, bounded by `RUNPOD_IDLE_TIMEOUT` + 60s `idle_check` poll. Assembly and bookend do not interact with pod_manager.

- **Is moving eager-terminate to video-stage exit isolated?** Yes — 2-file change: `pod_manager.py` (new exported entry point that terminates without the idle-seconds gate) + `job_runner.py` (invoke it after the `video` iteration of the stage loop succeeds). No entanglement with assembly/bookend. The only caller that assumes the pod is alive is the video adapter itself, which is called exclusively inside the `video` stage.

- **Risks flagged:**
  1. **Multi-word cold-start regression** (Q6): in the serial runner, word B's `notify_upcoming_video` does not fire until word A's `process_word` fully returns (post-bookend). Eager-terminate at video-stage exit will kill the pod before B gets a chance to keep it alive. Current design (`RUNPOD_IDLE_TIMEOUT=300` + `_upcoming_words`) absorbs A's assembly+bookend duration; eager-terminate removes that cushion entirely.
  2. **`RUNPOD_IDLE_TIMEOUT=30` interaction with normal word-boundary gaps**: A-to-B gap that exceeds 30s (plausible for assembly+bookend+upload) will cause cold starts *even without* any code change. Needs live verification from the terminate log to confirm what value is in effect.
  3. **Suno retry jobs** (Q5): I did not trace `process_suno_retry_job` → `bake_suno_into_word` deeply enough to rule out a code path that reaches the video stage. Flagged for follow-up. If such a path exists, eager-terminate could force an unnecessary cold start during retries.
  4. **Scene-boundary keep-alive**: between scenes within one video stage, `_active_jobs` briefly drops to 0 ([ltx_selfhosted.py:398-400](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L398-L400) fires per scene). With eager-terminate hooked at video-stage-exit only, this is fine — but any "eager-terminate when `_active_jobs == 0`" logic applied elsewhere would kill mid-stage.
