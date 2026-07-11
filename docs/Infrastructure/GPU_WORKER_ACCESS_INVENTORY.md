# GPU Worker Access Inventory

**Scope:** Non-destructive investigation of how Resonance reaches the remote GPU
worker that produces LTX video. No secret values are recorded — only variable
**names** and presence. No code was changed.

**Repos inspected**
- Orchestrator (canonical): `D:\CODING\ResonanceTEST\orchestrator`
- LTX worker: `D:\CODING\ResonanceTEST\ltx-worker`

**Git state at investigation time:** the workspace root `D:\CODING\ResonanceTEST`
is *not* a git repository; `orchestrator/` is a git repo (has `.git`). All
git-based verification (`git status`, `git branch`, `git diff --check`) must be
run from inside `orchestrator/`.

---

## 1. Executive answer: which access path is canonical?

**Both variable families exist, but `POD_URL` / `POD_AUTH_TOKEN` is the
canonical, enforced path today.** `GPU_WORKER_URL` / `GPU_WORKER_TOKEN` is a
still-honored *manual override / legacy* path used only inside one adapter.

The split is deliberate (commented "§10" / "HIGH-7" in the code):

| Layer | File | Reads | Behavior |
|-------|------|-------|----------|
| Startup gate (cloud entry) | `start_cloud.py:79-82` | `POD_URL`, `POD_AUTH_TOKEN` | `sys.exit(1)` if missing |
| Startup gate (runner) | `job_runner.py:142-158` (`assert_pod_credentials`, called at `job_runner.py:250`) | `POD_URL`, `POD_AUTH_TOKEN` | `raise SystemExit` if missing |
| Pod access helper | `cloud_engines/video_engine/pod_manager.py:25-37` | `POD_URL`, `POD_AUTH_TOKEN` | `RuntimeError` if missing |
| Self-hosted adapter | `cloud_engines/video_engine/adapters/ltx_selfhosted.py:112-121` | `GPU_WORKER_URL`, `GPU_WORKER_TOKEN` | falls back to `pod_manager` (→ `POD_*`) when `GPU_WORKER_URL` is empty |

Runtime resolution inside the adapter (`ltx_selfhosted.py:112-121`):

```python
worker_url = GPU_WORKER_URL
worker_token = GPU_WORKER_TOKEN
level2_release = None
if not worker_url:
    from ..pod_manager import acquire_use, ensure_pod_ready, release_use
    worker_url, worker_token = ensure_pod_ready()   # reads POD_URL / POD_AUTH_TOKEN
    level2_release = release_use
elif not worker_token:
    raise RuntimeError("GPU_WORKER_URL set but GPU_WORKER_TOKEN missing")
```

So:
- If `GPU_WORKER_URL` is set → adapter uses `GPU_WORKER_URL` + `GPU_WORKER_TOKEN` directly (manual override). Level-2 pod automation is bypassed.
- If `GPU_WORKER_URL` is empty → adapter uses `POD_URL` + `POD_AUTH_TOKEN` via `pod_manager.ensure_pod_ready()`.
- **Regardless of either**, the orchestrator will refuse to boot unless `POD_URL` *and* `POD_AUTH_TOKEN` are present (both startup gates require them).

**Known doc drift:** `ltx-worker/POD_RESTORE.md` step 5 says "Update Railway env
var `GPU_WORKER_URL`" — that predates the §10/HIGH-7 change to `POD_*`. The
running orchestrator now requires `POD_URL`/`POD_AUTH_TOKEN`. `orchestrator/docs/archive/PIPELINE_REFACTOR_FIX_ROUND1_HANDOFF.md:87`
confirms the migration: "The legacy `ltx_selfhosted` adapter still reads
`GPU_WORKER_URL` directly (file is scope-locked), so a deployment with only
`GPU_WORKER_URL` set will now fail fast at startup — the migration path is to
rename to `POD_URL` / `POD_AUTH_TOKEN`."

---

## 2. Every env var related to GPU / pod / video worker access

Recorded as **names only** (no values). "Required" = process exits if missing.

### Orchestrator side

| Variable | Where read | Default | Required? |
|----------|-----------|---------|-----------|
| `POD_URL` | `start_cloud.py:79`, `job_runner.py:143`, `pod_manager.py:25` | `""` | **Yes** (startup gate) |
| `POD_AUTH_TOKEN` | `start_cloud.py:81`, `job_runner.py:144`, `pod_manager.py:26` | `""` | **Yes** (startup gate) |
| `VIDEO_BACKEND` | `cloud_engines/video_engine/config.py:25` | `"self_hosted"` | No (defaulted) |
| `GPU_WORKER_URL` | `config.py:26` | `""` | No (manual override) |
| `GPU_WORKER_TOKEN` | `config.py:27` | `""` | No (required only if `GPU_WORKER_URL` set) |
| `GPU_WORKER_TIMEOUT` | `config.py:28` | `600` | No |
| `GPU_WORKER_POLL_INTERVAL` | `config.py:29` | `5` | No |
| `RUNPOD_API_KEY` | `config.py:33` | `""` | No (Level-2 pod automation) |
| `RUNPOD_ENDPOINT_ID` | `config.py:34` | `""` | No (serverless) |
| `RUNPOD_VOLUME_IDS` | `config.py:41` | `""` | No |
| `RUNPOD_GPU_TYPE` | `config.py:44` | `"NVIDIA L40S"` | No |
| `RUNPOD_FALLBACK_GPU_TYPES` | `config.py:45` | `""` | No |
| `RUNPOD_DOCKER_IMAGE` | `config.py:48` | `"lokiii69/ltx-worker:diffusers-v1"` | No |
| `RUNPOD_IDLE_TIMEOUT` | `config.py:49` | `300` | No |
| `RUNPOD_POD_STARTUP_TIMEOUT` | `config.py:50` | `600` | No |
| `RUNPOD_POD_NAME` | `config.py:51` | `"resonance-gpu-worker"` | No |
| `RUNPOD_429_MAX_RETRIES` | `config.py:52` | `3` | No |
| `POD_PREWARM_ENABLED` | `config.py:58` | `"true"` | No (Level-2 only) |
| `POD_PREWARM_STALE_SECONDS` | `config.py:59` | `1200` | No |
| `FAL_KEY` | `config.py:21` | `""` | No (legacy `fal` backend) |

Note: `MAX_GENERATION_TIME` and `GPU_THREAD_DRAIN_TIMEOUT` are **worker-side**
vars (see below); the orchestrator does not read them. The orchestrator's
equivalent end-to-end budget is `GPU_WORKER_TIMEOUT`.

### LTX worker side (`ltx-worker/src/config.py`)

| Variable | Line | Default | Notes |
|----------|------|---------|-------|
| `WORKER_AUTH_TOKEN` | `config.py:5` | `""` | Bearer token the worker enforces. **Optional in code** — if empty, auth middleware is a no-op (all requests accepted). See `app.py:65-68`. |
| `MAX_GENERATION_TIME` | `config.py:20` | `600` | Per-job inference timeout |
| `GPU_THREAD_DRAIN_TIMEOUT` | `config.py:29` | `900` | Wait for wedged GPU thread before releasing lock |
| `JOB_TTL_SECONDS` | `config.py:28` | `1800` | In-memory job retention |
| `DIFFUSERS_MODEL_DIR` | `config.py:12` | `/workspace/models/ltx-2.3-diffusers` | Model path |
| `UPSAMPLER_MODEL_DIR` | `config.py:13` | `/workspace/models/ltx-2.3-upsampler` | (config value currently unused — paths hardcoded in `inference.py`) |
| `LORA_DIR` | `config.py:14` | `/workspace/models/loras` | (currently unused) |
| `LTX_MODEL_DIR` / `GEMMA_MODEL_DIR` | `config.py:8-9` | `/models/...` | Legacy, unused by diffusers path |
| `DEVICE` | `config.py:17` | `"cuda"` | |
| `LOADED_PIPELINES` | `config.py:25` | `"distilled"` | Retained for `rp_handler` import |

**Is `WORKER_AUTH_TOKEN` required?** No — optional in current worker code. When
unset, the worker accepts unauthenticated requests. It must be set to a real
secret in any reachable deployment. The orchestrator always sends
`Authorization: Bearer <token>` (the value of `GPU_WORKER_TOKEN`/`POD_AUTH_TOKEN`),
so the worker's `WORKER_AUTH_TOKEN` must match that for requests to succeed when
auth is enforced.

### Env example files (names only — no values present; all commented samples)

`orchestrator/.env.cloud.example` contains commented examples for:
`VIDEO_BACKEND`, `GPU_WORKER_URL` (lines 22-33). It documents the Level-2 logic:
"If `GPU_WORKER_URL` is set, Level 2 is bypassed (Level 1 manual mode). If
`GPU_WORKER_URL` is empty AND `RUNPOD_API_KEY` is set, Level 2 activates."

---

## 3. Worker HTTP contract (as called by Resonance)

Source of truth (client): `cloud_engines/video_engine/adapters/ltx_selfhosted.py`.
Source of truth (server): `ltx-worker/src/app.py`.

Base URL = `worker_url` (from `GPU_WORKER_URL` or `POD_URL`). Auth header on
every non-health call: `Authorization: Bearer <worker_token>`.

### Routes

| Method & path | Client code | Server code | Purpose |
|---------------|-------------|-------------|---------|
| `GET /health` | (worker exposes; not polled in main generate loop) | `app.py:93-120` | Liveness + model-loaded + VRAM + queue depth. **No auth required** (`app.py:63-64`). |
| `POST /generate` | `ltx_selfhosted.py:182-187` | `app.py:123-268` | Submit a job (multipart form + optional image files) |
| `GET /jobs/{job_id}` | `ltx_selfhosted.py:274-277` | `app.py:406-422` | Poll job status |
| `GET /jobs/{job_id}/result` | `ltx_selfhosted.py:353-356` | `app.py:425-442` | Download finished MP4 (binary) |

### `POST /generate` request shape (multipart/form-data)

Built at `ltx_selfhosted.py:132-141` (form fields) + `:150-162` (files):

```python
form_data = {
    "prompt": final_prompt,                 # str
    "negative_prompt": final_negative,      # str
    "duration": str(settings.duration),     # int-as-str (worker validates 3..20)
    "resolution": settings.resolution,      # "1080p" | "1440p" | "2160p"
    "seed": str(settings.seed),             # int-as-str; -1 = random
    "quality": self._quality,               # "fast" | "pro"
    "scene_number": str(content.scene_number),
    "conditioning_strength": str(settings.conditioning_strength),  # 0.5..1.0
}
files_dict = {
    "image":     ("image.png", <fh>, "image/png"),       # optional (i2v)
    "end_image": ("end_image.png", <fh>, "image/png"),   # optional; requires image
}
```

Worker form contract (`app.py:124-136`): same field names; also accepts an
optional `job_id` form field (the worker generates its own `new_job_id`
regardless). `end_image` without `image` → HTTP 422 (`app.py:161-167`).

### `POST /generate` response shape

Success → **HTTP 202** with JSON (`app.py:261-268`):

```json
{ "job_id": "job-xxxxxxxx", "status": "queued", "message": "Job queued for processing" }
```

Client reads `job_data["job_id"]` at `ltx_selfhosted.py:236-237`.

Error statuses the client handles (`ltx_selfhosted.py:189-232`):
- `503` busy / model loading → honors `Retry-After` header, up to `max_submit_retries = 5`
- `401` → `RuntimeError("GPU worker auth failed - check GPU_WORKER_TOKEN")`
- `422` → `ValueError` with worker's `error` field (validation)
- any other non-202 → `RuntimeError`

### `GET /jobs/{job_id}` response shape

`app.py:413-422`:

```json
{
  "job_id": "...", "status": "queued|processing|complete|failed",
  "progress": 0.0, "error": null,
  "created_at": "...", "started_at": null, "completed_at": null,
  "metadata": { "duration", "resolution", "fps", "seed", "model",
                "pipeline", "mode", "generation_time", "request_id",
                "conditioning_strength" }   // populated only when complete
}
```

Client polling loop (`ltx_selfhosted.py:247-340`): `status == "complete"` →
break; `status == "failed"` → `RuntimeError` with `error`; otherwise sleep and
re-poll. 404 → counts as a poll error.

### `GET /jobs/{job_id}/result` response shape

Binary MP4 (`FileResponse`, `media_type="video/mp4"`, `app.py:442`). `409` if job
not complete; `404` if unknown; `500` if result file missing.

---

## 4. Timeouts, retries, concurrency

| Concern | Value / behavior | Source |
|---------|------------------|--------|
| End-to-end budget (submit→download) | `GPU_WORKER_TIMEOUT` (default 600s) via `deadline = monotonic() + GPU_WORKER_TIMEOUT` | `ltx_selfhosted.py:123` |
| Poll interval | `GPU_WORKER_POLL_INTERVAL` (default 5s) | `ltx_selfhosted.py:256` |
| Submit retries | `max_submit_retries = 5`, only on HTTP 503, honoring `Retry-After` | `ltx_selfhosted.py:166-207` |
| Submit HTTP timeout | `min(60, remaining)` read, `min(30, remaining)` connect | `ltx_selfhosted.py:178-181` |
| Poll HTTP timeout | read `min(remaining,30)`, connect `min(remaining,10)` | `ltx_selfhosted.py:267-272` |
| Consecutive poll-failure cap | `max_consecutive_errors = 10` → `ConnectionError` | `ltx_selfhosted.py:243-309` |
| Download HTTP timeout | `min(120, remaining)` read, `min(30, remaining)` connect | `ltx_selfhosted.py:349-351` |
| Stage-level retry budget | video stage = **2 attempts** | `src/orchestration/retry.py:26` |
| Worker GPU concurrency | single GPU lock `asyncio.Lock()`; one job at a time | `ltx-worker/src/app.py:24,279` |
| Orchestrator video concurrency | `VideoDispatcher` `Semaphore(1)` | `src/orchestration/video_dispatcher.py:33` |
| Worker per-job inference timeout | `MAX_GENERATION_TIME` (600s) | `ltx-worker/src/app.py:311` |
| Worker GPU drain on timeout | `GPU_THREAD_DRAIN_TIMEOUT` (900s) | `ltx-worker/src/app.py:352` |
| Worker job retention | `JOB_TTL_SECONDS` (1800s); finished jobs only | `ltx-worker/src/app.py:72-90` |

**The LTX worker is not a durable queue.** Jobs live in an in-memory dict
(`_jobs`, `app.py:32`) on a single-GPU, single-lock process. A worker restart
loses all in-flight and recently-finished jobs. Treat it as ephemeral
single-tenant compute, not a general job queue.

---

## 5. Where video files move

| Step | What happens | Source |
|------|--------------|--------|
| Download | `GET /jobs/{id}/result` → bytes | `ltx_selfhosted.py:353-365` |
| Write local | `open(output_path, "wb").write(dl_response.content)` | `ltx_selfhosted.py:364-365` |
| Thumbnail | `extract_thumbnail(output_path, output_path.replace(".mp4","_thumb.jpg"))` | `ltx_selfhosted.py:367-371` |
| `output_path` origin | passed into adapter `generate()` by the video stage runner | `video_dispatcher.py:149-150` → `src/pipeline.run_stage(..., "video")` |
| Upload to Supabase | happens in the **post-video** lane (assembly / bookend / suno_bake / uploading stages), not in the adapter | `src/orchestration/downstream_worker.py`, `recovery.py:45-51` |

The adapter only produces a local MP4 + thumbnail and returns metadata
(`resolution`, `fps`, `duration_seconds`, `file_size_bytes`,
`provider_request_id`). Storage/upload to Supabase is a later stage owned by the
downstream worker.

---

## 6. Pipeline stages that depend on video

Stage machine (from `src/orchestration/`):

```
enrichment → pending → [images → concept → song]   (upstream_worker, UPSTREAM_STAGES)
           → video_queued → video                   (video_dispatcher)
           → post_video_queued → assembly|bookend|suno_bake|uploading  (downstream_worker)
           → complete
```

Key references:
- `upstream_worker.py:22` `UPSTREAM_STAGES = ("images", "concept", "song")`
- `upstream_worker.py:152-167` unconditionally transitions `song → video_queued` for **video-type decks**
- `video_dispatcher.py:80-85` claims `video_queued → video`; `:175-180` transitions `video → post_video_queued`
- `recovery.py:45-51` recovery map ties `video`, `video_queued`, `post_video_queued`, and all post-video stages together
- `state.py:79-83` `_PROCESSING_STAGES` includes `video_queued`, `video`, `post_video_queued`, `assembly`, `bookend`, `suno_bake`, `uploading`

### Two product lanes already exist

`feeder.py:583` reads `deck_type = str(deck.get("deck_type") or "video").lower()`.
At `feeder.py:959-971`:
- `deck_type == "card"` → routed to **card_queue** (`card_worker`), which **never enters the video stage**.
- anything else (default `"video"`) → routed to the upstream→video→post-video lane.

This is the most important structural fact for disabling video: **card decks
already bypass video entirely.** Disabling video for users is primarily a matter
of not creating new `video` decks (a frontend lane choice), not a pipeline
rewrite.

### What breaks if video is disabled *incorrectly*

1. **Startup**: removing `POD_URL`/`POD_AUTH_TOKEN` without changing the startup
   gates (`start_cloud.py:66-89`, `job_runner.py:142-158`) → orchestrator
   `sys.exit(1)` and **all** generation (cards, music, everything) stops. This is
   the #1 hazard.
2. **In-flight `video` decks**: any deck already created with `deck_type='video'`
   that is mid-pipeline still needs the video stage to reach `complete`. Hiding
   the lane in the UI does not retire existing rows.
3. **Existing completed videos**: viewing old videos uses stored URLs
   (`/deck/:id/word/:wordId` → `VideoPlayer`, `App.tsx:203`); this does not call
   the worker and stays working as long as the rows/URLs exist.

---

## 7. Files that define the LTX worker API contract

| File | Role |
|------|------|
| `ltx-worker/src/app.py` | FastAPI app: `/health`, `/generate`, `/jobs/{id}`, `/jobs/{id}/result`, auth middleware, in-memory job store, single GPU lock |
| `ltx-worker/src/config.py` | Env var names + defaults (auth, timeouts, model dirs) |
| `ltx-worker/src/inference.py` | LTX diffusers inference (`LTXInference.generate`, `:228`) |
| `ltx-worker/src/postprocess.py` | ffmpeg crop/trim |
| `ltx-worker/src/rp_handler.py` | Alternative RunPod **serverless** handler (base64 in/out, no FastAPI, no job store) |
| `ltx-worker/Dockerfile` | CUDA 12.8 / py3.11 / torch 2.11 / diffusers@git image; `CMD uvicorn src.app:app --host 0.0.0.0 --port 8080`; `EXPOSE 8080` |
| `ltx-worker/requirements.txt` | Pinned package set |
| `ltx-worker/POD_RESTORE.md` | Validated env, volume layout, resurrection workflow |
| `ltx-worker/README.md` | Phase-0 findings, hardware, performance, VRAM |
| `ltx-worker/test_smoke.py`, `test_http.sh` | Smoke tests |

Client-side contract consumers (orchestrator):
`cloud_engines/video_engine/adapters/ltx_selfhosted.py`,
`cloud_engines/video_engine/pod_manager.py`,
`cloud_engines/video_engine/config.py`,
`cloud_engines/video_engine/router.py`.

There is also a RunPod **serverless** adapter (`adapters/ltx_runpod.py`,
selected when `VIDEO_BACKEND == "runpod"`, `router.py:33-35`) and a legacy
`fal` adapter (`adapters/ltx.py`, `VIDEO_BACKEND == "fal"`).

---

## 8. Verification commands run (safe, read-only)

```
git status / git branch / git diff --check   → workspace root is not a git repo;
                                                 run inside orchestrator/ instead
grep POD_URL|POD_AUTH_TOKEN|GPU_WORKER_*|WORKER_AUTH_TOKEN|VIDEO_BACKEND
grep video_queued|post_video_queued|current_stage|ken_burns|video_mode
grep (frontend) deck_type|Video & Music|study/video|product lane
```

No remote worker calls, no provider calls, no code changes were made.
