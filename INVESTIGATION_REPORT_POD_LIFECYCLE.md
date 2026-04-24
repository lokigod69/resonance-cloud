# Investigation Report — Pipeline-Driven Pod Lifecycle (Video Engine)

## 1. Word lifecycle trace

The authoritative state machine lives in two places:

- **Filesystem state** (`manifest.json` on disk): The `Manifest` model (`orchestrator/src/models.py:43-58`) is the record of what has been produced. `manifest.selected` fields (`Selected`, `models.py:23-30`) track which version of each stage is "current." `manifest.lineage` (`LineageEntry`, `models.py:32-40`) is an append-only log of every stage run with status.
- **Supabase DB state** for cloud jobs: The `words` table `status` column transitions are driven entirely from `job_runner.py`.

There is no explicit state-machine enum or transition guard. "What stage a word is in" is inferred at runtime by `get_incomplete_stages()` (`orchestrator/src/services/stage_helpers.py:75-89`), which reads `manifest.selected` and checks artifact existence on disk.

**Stage progression (cloud / `job_runner` path):**

| Transition | Where | file:line |
|---|---|---|
| Word record created with `status=pending` | Frontend → Supabase | (insert outside this codebase) |
| Job auto-approved | `job_runner.py` main loop | `orchestrator/job_runner.py:926-932` |
| Job picked up, word set to `status=processing` | `process_word()` | `orchestrator/job_runner.py:176-179` |
| Enrichment written | `process_job()` | `orchestrator/job_runner.py:785-815` |
| Images stage runs | `process_word()` for loop | `orchestrator/job_runner.py:246-259` |
| Concept stage runs | same loop | `orchestrator/job_runner.py:246-259` |
| Song stage runs | same loop | `orchestrator/job_runner.py:246-259` |
| Video stage runs | same loop | `orchestrator/job_runner.py:246-259` |
| Assembly stage runs | A/B loop, Pass 1 | `orchestrator/job_runner.py:386-441` |
| Bookend stage runs | A/B loop, Pass 2 | `orchestrator/job_runner.py:460-518` |
| Video uploaded to Supabase Storage, word set to `status=complete` | `upload_ab_results()` | `orchestrator/src/services/publishing.py:141-153` |
| Word set to `status=failed` (stage failure) | `process_word()` | `orchestrator/job_runner.py:283-296` |

**Stage progression (manifest / filesystem level, inside `run_stage()`):**

Each call to `run_stage()` (`orchestrator/src/pipeline.py:753-975`) calls the engine, then calls `add_lineage()` and `update_selection()` if successful. No DB status is touched by `run_stage()` — only filesystem. The DB `status` is only updated by `job_runner.py`.

`run_stage()` is also reachable via the local FastAPI router endpoint `POST /api/words/{word_slug}/run/{stage}` (`orchestrator/src/routers/generation.py:96-107`), which is only active when `STORAGE_MODE != "cloud"` (`orchestrator/src/app.py:85-86`). In that path there is no Supabase word-status update at all.

---

## 2. Stage entry points

**Transition INTO images stage:**
`orchestrator/src/pipeline.py:831` — inside `run_stage()`, `elif stage == 'images':` block. Images is the first stage in `STAGE_ORDER` (`orchestrator/src/pipeline.py:27`: `['images', 'concept', 'song', 'video', 'assembly', 'bookend']`). Called by the `orchestrator/job_runner.py:259` loop or by the generation router `orchestrator/src/routers/generation.py:102`.

**Transition INTO concept stage:**
`orchestrator/src/pipeline.py:772` — `if stage == 'concept':` block inside `run_stage()`. Requires `manifest.selected.images` to be set (`orchestrator/src/pipeline.py:782-784`). Same callers.

**Transition INTO song stage:**
`orchestrator/src/pipeline.py:812` — `if stage == 'song':` block. Requires `manifest.selected.concept` (`orchestrator/src/pipeline.py:814-816`). Same callers.

**Transition INTO video stage:**
`orchestrator/src/pipeline.py:879` — `elif stage == 'video':` block. Requires `manifest.selected.images` (`orchestrator/src/pipeline.py:880-882`). Called by `orchestrator/job_runner.py:259` in the shared pipeline loop. Per-payload dispatch starts at `orchestrator/src/pipeline.py:916-918`: `for vp in payloads: vresult = await call_engine('video', vp)`.

---

## 3. Serialization model — serial vs parallel

**Globally serial, one word at a time, one stage at a time.**

Evidence:

- `orchestrator/job_runner.py:915-952`: The main loop picks **one job** via `.limit(1)` and `await`s it fully before looping again.
- `orchestrator/job_runner.py:833-848`: Inside `process_job()`, words within a deck are processed in a plain `for word_rec in words:` loop — no `asyncio.gather`, no thread pool.
- `orchestrator/job_runner.py:246-260`: Stages within a word are processed in a plain `for stage in stages_to_run:` loop. Each `await run_stage(...)` blocks until completion.

The only within-word parallelism opportunity is that the video stage calls `call_engine('video', vp)` sequentially in a `for vp in payloads:` loop (`orchestrator/src/pipeline.py:916-918`). There is no `gather` across scene payloads.

**Can two words be in video stage simultaneously today?** No. The job runner is single-process, single-asyncio-loop, processing one job → one word → one stage at a time. The `_lock` in `pod_manager.py` (`orchestrator/cloud_engines/video_engine/pod_manager.py:49`) also serializes pod creation itself. There is no mechanism that would allow two simultaneous video-stage executions today.

---

## 4. DB query "any words in concept/image/song stage across all decks"

**Does not exist today.**

There is no query in `job_runner.py`, `pipeline.py`, `state.py`, or any service that inspects the Supabase `words` table for words currently "in" a particular pipeline stage. The Supabase `words.status` field only transitions between `pending`, `processing`, `complete`, and `failed` — it has no per-stage granularity (e.g., no `status=in_video` value). The only finer granularity is the filesystem manifest and the `orchestrator/src/state.py:15-24` in-memory `autopilot_state` dict, which tracks the current word/stage for the local autopilot path but is not persisted to Supabase and is not queried by any pod lifecycle logic.

---

## 5. Every callsite of `get_or_create_pod()` or equivalent

The function is named `ensure_pod_ready()` in `pod_manager.py`. There is exactly **one callsite**:

- `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:106`: `worker_url, worker_token = ensure_pod_ready()`

This is only reached when `VIDEO_BACKEND == "self_hosted"` AND `GPU_WORKER_URL` is empty (the Level 2 path). The condition is checked at `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:101-108`:

```
worker_url = GPU_WORKER_URL
...
if not worker_url:
    from ..pod_manager import acquire_use, ensure_pod_ready, release_use
    worker_url, worker_token = ensure_pod_ready()
```

The `LTXRunPodAdapter` (`orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py`) does NOT call `ensure_pod_ready()` — it calls the RunPod Serverless API directly (stateless, no pod lifecycle).

`ensure_pod_ready()` itself is defined at `orchestrator/cloud_engines/video_engine/pod_manager.py:426-461`.

---

## 6. Every pod teardown path

All teardown paths ultimately call `_terminate_pod_locked()` (`orchestrator/cloud_engines/video_engine/pod_manager.py:380-397`) or `_terminate_orphan()` (`orchestrator/cloud_engines/video_engine/pod_manager.py:400-413`), both of which issue `DELETE /v1/pods/{id}` to the RunPod REST API and then call `_reset_state()` (`orchestrator/cloud_engines/video_engine/pod_manager.py:126-134`).

**Path 1 — Idle timeout:** `idle_check()` at `orchestrator/cloud_engines/video_engine/pod_manager.py:479-496`. Called in a 60-second loop from `orchestrator/start_cloud.py:147-155`. Terminates pod if `_active_jobs == 0` and `idle_seconds >= RUNPOD_IDLE_TIMEOUT` (default 300s from `orchestrator/cloud_engines/video_engine/config.py:49`).

**Path 2 — Pod failed health check during `ensure_pod_ready` (fast path):** `orchestrator/cloud_engines/video_engine/pod_manager.py:437-443`. If a "ready" pod fails the quick health probe, it is terminated immediately before re-creating.

**Path 3 — Readiness timeout during pod startup:** `_wait_for_pod_ready()` calls `_terminate_pod_locked(pod_id)` at `orchestrator/cloud_engines/video_engine/pod_manager.py:302` (Phase A timeout) and `orchestrator/cloud_engines/video_engine/pod_manager.py:349` (Phase B timeout).

**Path 4 — Exception during `ensure_pod_ready`:** `orchestrator/cloud_engines/video_engine/pod_manager.py:452-458`. Best-effort terminate of any leaked pod if `_pod_status != "idle"`.

**Path 5 — Orphan cleanup at startup:** `cleanup_orphans()` at `orchestrator/cloud_engines/video_engine/pod_manager.py:499-573`. Calls `_terminate_orphan()` for any pod named `RUNPOD_POD_NAME` that is not the current `_pod_id` and is older than 600 seconds. Called once from `orchestrator/start_cloud.py:145`.

`release_use()` (`orchestrator/cloud_engines/video_engine/pod_manager.py:464-476`) does NOT terminate the pod — it decrements `_active_jobs` and updates `_last_activity`. Termination is deferred to the idle timeout.

---

## 7. Pod reference across multiple words

**No. Every word re-enters `ensure_pod_ready()` on each video stage call.**

However, `ensure_pod_ready()` has a fast path: if `_pod_status == "ready"` and the pod passes a quick health check, it returns immediately without creating a new pod (`orchestrator/cloud_engines/video_engine/pod_manager.py:436-439`). So if the pod is still alive from a previous word's video stage (i.e., it hasn't hit the 300s idle timeout), the second word reuses it.

In practice, whether reuse occurs depends on the elapsed wall time between two words' video stages. If the gap exceeds `RUNPOD_IDLE_TIMEOUT` (300s default, `orchestrator/cloud_engines/video_engine/config.py:49`), the pod will have been terminated by `idle_check()` and a full cold start is required. Since words are processed serially, and earlier stages (images, concept, song) could easily take longer than 300s, pod reuse across words is not guaranteed and likely rare.

---

## 8. Pod state persistence — Railway redeploy scenario

**All pod state is ephemeral in-process memory.** The module-level globals in `orchestrator/cloud_engines/video_engine/pod_manager.py:50-57` are:

```python
_pod_id: Optional[str] = None
_pod_url: Optional[str] = None
_pod_status: str = "idle"
_worker_auth_token: Optional[str] = None
_last_activity: float = 0.0
_active_jobs: int = 0
```

These are never written to Supabase, Redis, or any file. A Railway redeploy creates a new process with all globals reset to `idle`/`None`. The only recovery mechanism is `cleanup_orphans()` in `orchestrator/start_cloud.py:145`, which on startup lists all RunPod pods named `resonance-gpu-worker` and terminates any that are older than 600 seconds — meaning a pod from a previous process gets cleaned up, not reattached.

The `orchestrator/src/state.py` module also holds `autopilot_state` and `word_pipeline_state` as in-process dicts (`orchestrator/src/state.py:15-26`), which are equally ephemeral.

**Persistence layers that exist today:**

- Supabase: `generation_jobs.status`, `words.status`, `words.video_url` — job-level and word-level status only, no pod state.
- Filesystem (Railway ephemeral disk or mounted volume): workspace directories with `manifest.json` — stage completion is recoverable. `orchestrator/start_cloud.py:78-123` resets stuck `processing` jobs on restart.
- RunPod itself: the pod continues running after an orchestrator crash. `cleanup_orphans()` finds and terminates it; it does not reattach.

No Redis, no external queue, no durable pod-state store exists today.

---

## 9. Natural function to emit "video pod needed in ~3-4 min"

The natural hook is in `run_stage()` in `orchestrator/src/pipeline.py`, immediately after a successful images stage completion. The callsite is at `orchestrator/src/pipeline.py:875-877`:

```python
if status in ('success', 'partial'):
    update_selection(word_dir, 'images', version_name)
return {"stage": stage, "version": version_name, "result": result}
```

The return statement at `orchestrator/src/pipeline.py:877` is the moment the images stage has just succeeded and the pipeline is about to move to concept. Injecting a signal there would have the correct timing: concept + song must still run before video begins, which is the 3-4 minute window.

A second candidate is the post-images block in `orchestrator/job_runner.py:299-319`:

```python
if stage == "images":
    try:
        images_manifest = read_manifest(word_dir)
        ...
```

This block already reads the storyboard after images completes. A signal here would be at the same lifecycle moment as the first candidate but inside the job runner, where Supabase credentials and job/word context (deck_id, word count) are all in scope.

---

## 10. "Is any other word upstream right now?" query from video engine

**Does not exist today.**

The video engine (`orchestrator/cloud_engines/video_engine/`) has no Supabase client, no job-runner state access, and no mechanism to query pipeline progress. `pod_manager.py` only tracks `_active_jobs` (count of in-flight video generation calls on the current pod, `orchestrator/cloud_engines/video_engine/pod_manager.py:54`), not upstream stage state for other words.

The `idle_check()` function (`orchestrator/cloud_engines/video_engine/pod_manager.py:479-496`) terminates on `_active_jobs == 0` after `RUNPOD_IDLE_TIMEOUT` — it has no awareness of whether another word is 2 minutes away from needing the pod.

The orchestrator's `orchestrator/src/state.py` has `autopilot_state["current_word"]` and `autopilot_state["current_stage"]` (`orchestrator/src/state.py:15-24`), but this is only populated by the local autopilot router (not by `job_runner.py`), is in-process memory, and is inaccessible to the video engine.

---

## 11. Existing pub/sub mechanisms

**What exists today:**

- **Supabase polling** (`orchestrator/job_runner.py:915-952`): The job runner polls `generation_jobs` every `POLL_INTERVAL` seconds (default 30s, `orchestrator/job_runner.py:48`). Pull-based, not push. No Supabase Realtime subscriptions are used.
- **Python asyncio** (`orchestrator/start_cloud.py:147-155`): `asyncio.create_task(_pod_idle_loop())` runs the pod idle check every 60s. Internal scheduling, not a signal bus.
- **In-process async/await**: All pipeline stages are `await`ed sequentially; there are no asyncio queues, events, or channels used for inter-component signaling.
- **No background tasks for signaling**: FastAPI `BackgroundTasks` are not used in any generation path.
- **No message broker**: No Redis pub/sub, no AMQP, no webhook delivery.

The only existing "signaling" primitive that crosses process boundaries is the Supabase `generation_jobs` table (via polling), and the `system_settings.queue_paused` flag (`orchestrator/job_runner.py:834-839`).

---

## 12. Pre-warm wasted if word fails before video stage

**No mechanism exists today. The pod simply idles and auto-terminates.**

If a word was pre-warmed (hypothetically) and then failed at images, concept, or song, the pod would enter idle with `_active_jobs == 0`. After `RUNPOD_IDLE_TIMEOUT` seconds (300s default), `idle_check()` would terminate it (`orchestrator/cloud_engines/video_engine/pod_manager.py:479-496`). The video engine has no callback, cancellation signal, or polling channel to learn the pre-warm is wasted before the timeout expires.

The only way the orchestrator currently "cancels" a pod is by not calling `ensure_pod_ready()` for the next word — the pod times out and terminates. No active abort-pod signal path exists.

---

## 13. Pod termination then new word arrives 2s later

**Full cold start. No grace period beyond the idle timeout already elapsed.**

If the pod was terminated (either by idle timeout, redeploy, or health failure), `_pod_status` is `"idle"` and `_pod_id` is `None` (after `_reset_state()`, `orchestrator/cloud_engines/video_engine/pod_manager.py:126-134`). The next call to `ensure_pod_ready()` will unconditionally call `_create_pod()` and then `_wait_for_pod_ready()` (`orchestrator/cloud_engines/video_engine/pod_manager.py:447-448`). There is no grace period, no "recently terminated" state, and no shortcut to reclaim a pod that was just terminated.

Startup time is bounded by `RUNPOD_POD_STARTUP_TIMEOUT` (default 600s, `orchestrator/cloud_engines/video_engine/config.py:50`). Phase A (RunPod RUNNING state) + Phase B (model loaded health check) both count against this budget.

---

## 14. Two decks requesting video stage simultaneously

**Serialized — second deck waits until first word in first deck is fully complete.**

The job runner picks one job at a time via `.limit(1)` (`orchestrator/job_runner.py:936-940`) and `await`s the entire `process_job()` call before looping. If two decks are in the `generation_jobs` table as `approved`, the second remains `approved` in Supabase until the first job's `process_job()` returns. There is no second-pod path, no parallel job processing, no queue with concurrency > 1.

The `pod_manager._lock` (`orchestrator/cloud_engines/video_engine/pod_manager.py:49`) is a threading lock (not asyncio), which would serialize concurrent `ensure_pod_ready()` calls within a single process anyway — but the serialization happens much earlier, at the job-runner level.

---

## 15. Per-stage timings and telemetry

The external prompt states "cold-start every word ~6min, warm ~7min/clip." These numbers are not in the code; see contradictions section below.

**What the code captures:**

Each engine writes a `generation-meta.json` with `duration_seconds` (wall-clock elapsed for that engine call). The orchestrator collects these in `collect_word_metadata()` (`orchestrator/src/services/metadata.py:71-196`) and writes the summary to `words.metadata` in Supabase (`orchestrator/job_runner.py:568-572`). The fields captured are:

- `images.duration_seconds` (`orchestrator/src/services/metadata.py:153`)
- `concept.duration_seconds` (`orchestrator/src/services/metadata.py:158`)
- `song.duration_seconds` (`orchestrator/src/services/metadata.py:163`)
- `video.duration_seconds` (`orchestrator/src/services/metadata.py:169`)
- `assembly.duration_seconds` (`orchestrator/src/services/metadata.py:174`)
- `bookend.duration_seconds` (`orchestrator/src/services/metadata.py:179`)
- `pipeline_duration_seconds` (total wall clock, `orchestrator/job_runner.py:521`, `orchestrator/src/services/metadata.py:135`)

**Timeouts configured in `orchestrator/src/dispatcher.py` (maximum allowed, not typical):**

- concept: 30s (`orchestrator/src/dispatcher.py:15`)
- song: 300s (`orchestrator/src/dispatcher.py:16`)
- images: 900s (`orchestrator/src/dispatcher.py:17`)
- video: 600s (`orchestrator/src/dispatcher.py:18`)
- assembly: 120s (`orchestrator/src/dispatcher.py:19`)
- bookend: 120s (`orchestrator/src/dispatcher.py:20`)

The video engine's `GPU_WORKER_TIMEOUT` defaults to 600s (`orchestrator/cloud_engines/video_engine/config.py:28`). Pod startup timeout is 600s (`orchestrator/cloud_engines/video_engine/config.py:50`). The 6-minute cold start and 7-minute warm clip numbers in the external prompt are not found in source; actual timings would need to be read from the `words.metadata` JSON in Supabase.

---

## 16. Pre-warm window — signal at image-stage entry vs video-stage start

From the timeout ceilings (not measured medians, which are not in the code):

- Images stage: up to 900s ceiling (`orchestrator/src/dispatcher.py:17`).
- Concept stage: up to 30s ceiling (`orchestrator/src/dispatcher.py:15`).
- Song stage: up to 300s ceiling (`orchestrator/src/dispatcher.py:16`).

If a signal is fired at **images stage entry** (before images even starts), the full images + concept + song budget precedes video. If fired at **images stage completion** (`orchestrator/src/pipeline.py:877` or `orchestrator/job_runner.py:299`), only concept + song remain.

The code contains no measured per-stage timing data that would allow a precise window calculation from source alone. The only data source is the `words.metadata` field in Supabase populated by `collect_word_metadata()`.

---

## 17. Max concurrent pods concept

**No "max concurrent pods" concept exists today.** There is no env var capping the number of pods, no queue depth limit, and no semaphore on pod creation.

`pod_manager.py` enforces at most one pod at a time implicitly: `_create_pod()` only runs if `_pod_status != "ready"` (via the `ensure_pod_ready()` guard at `orchestrator/cloud_engines/video_engine/pod_manager.py:436`), and the module-level `_lock` serializes concurrent callers. Since the job runner is single-process and single-word-at-a-time, there is only ever zero or one pod in practice. No `MAX_PODS` env var, no concurrency cap, no rate-limit queue exists.

---

## 18. "3 decks about to need video simultaneously" — today's response

Today's code would process them one at a time in strict priority order.

1. All three jobs exist in `generation_jobs` as `approved`.
2. The job runner picks the highest-priority/oldest job via `.limit(1)` (`orchestrator/job_runner.py:936-940`).
3. `process_job()` runs the entire deck — all words, all stages including video — synchronously.
4. Only after `process_job()` returns does the loop pick up the second job.
5. The third job waits further.

At the pod level: the first deck's video stage calls `ensure_pod_ready()`, which creates one pod. After that deck's video stage completes, `release_use()` is called and the pod goes idle. If the second deck's video stage starts within `RUNPOD_IDLE_TIMEOUT` (300s), the same pod is reused (fast path at `orchestrator/cloud_engines/video_engine/pod_manager.py:436-439`). Otherwise, a new pod is created. No second or third pod is ever created, and there is no mechanism today that would detect or respond to multi-deck demand.

---

## Design Seams Summary

1. **Stage-completion hook in `pipeline.py`** — `orchestrator/src/pipeline.py:875-877` (images success path in `run_stage()`). This is where images has just succeeded and control is about to return to the job runner. A pre-warm signal emitted here would have the maximum lead time before video stage starts.

2. **Post-images block in `job_runner.py`** — `orchestrator/job_runner.py:299-319`. Already reads the storyboard after images completes. A signal here would be at the same lifecycle moment as seam 1 but inside the job runner, where Supabase credentials and job/word context (deck_id, word count) are all in scope.

3. **`idle_check()` in `pod_manager.py`** — `orchestrator/cloud_engines/video_engine/pod_manager.py:479-496`. The only place pod keep-alive decisions are made today. It only knows `_active_jobs` and elapsed idle time; it has no channel for external signals.

4. **`ensure_pod_ready()` in `pod_manager.py`** — `orchestrator/cloud_engines/video_engine/pod_manager.py:426-461`. The single gate that any pre-warm implementation would need to call or bypass. Currently called exclusively from `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:106`.

5. **`words.status` column in Supabase** — `orchestrator/job_runner.py:176-179`, `orchestrator/job_runner.py:283-287`, `orchestrator/src/services/publishing.py:141-153`. The only cross-process-boundary state that records per-word progress. It currently has no per-stage granularity. Adding a `current_stage` field or stage-specific status values here is the natural place to expose upstream pipeline state to any consumer (video engine or a pre-warm scheduler).

---

## Contradictions / Surprises

1. **External prompt says "cold-start every word ~6min, warm ~7min/clip."** These numbers are not in the source code. The code sets `RUNPOD_POD_STARTUP_TIMEOUT` of 600s (10 min) as a ceiling, not a median. Actual timings live only in the `words.metadata` Supabase JSON column, populated by `collect_word_metadata()`. The "warm ~7min/clip" claim cannot be verified from source.

2. **`STAGE_ORDER` lists `images` first, not `concept`.** `orchestrator/src/pipeline.py:27`: `STAGE_ORDER = ['images', 'concept', 'song', 'video', 'assembly', 'bookend']`. The external prompt did not specify an order, but worth noting: images always runs before concept in this system.

3. **Pod lifecycle code lives inside `orchestrator/cloud_engines/video_engine/`**, not inside the orchestrator's `src/`. Pod management is an engine-side concern, not an orchestrator-side concern. The orchestrator (`pipeline.py`, `job_runner.py`) has no visibility into whether a pod exists, what its status is, or how long it has been idle.

4. **`LTXRunPodAdapter` (RunPod Serverless) has no pod lifecycle at all.** `orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py` calls `api.runpod.ai/v2/{endpoint_id}/run` — a fully managed serverless endpoint. It never calls `ensure_pod_ready()`, `idle_check()`, or any `pod_manager` function. The pod lifecycle described throughout `pod_manager.py` applies only to the `LTXSelfHostedAdapter` path (`VIDEO_BACKEND=self_hosted`). The RunPod Serverless path is cold-start-per-request by design; RunPod manages the worker lifecycle.

5. **There is no Supabase Realtime subscription anywhere in the orchestrator.** The external prompt asked about "Supabase realtime" as a potential signal carrier. No `supabase.channel()` or `.subscribe()` calls exist in this codebase. All Supabase interaction is synchronous REST calls.
