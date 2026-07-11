# Resonance → Image Project Handoff

One-page decision record for: discontinuing Resonance video, preserving the LTX
worker, and repurposing the paid GPU for a new ComfyUI/image project. Companion
docs in this folder:

- `GPU_WORKER_ACCESS_INVENTORY.md` — how Resonance reaches the GPU worker (env,
  routes, payloads, timeouts).
- `LTX_VIDEO_FEATURE_DISABLE_PLAN.md` — exact files/order to disable video safely.
- `GPU_WORKER_CLEAN_REINSTALL_PLAN.md` — preserve + two-phase cleanup, live
  deployment checklist.
- `COMFYUI_IMAGE_WORKER_ADAPTER_SPEC.md` — the new image worker contract.

---

## Part F — Reuse options compared

| Criterion | Opt 1: mutate `ltx-worker` in place | Opt 2: fresh image-worker repo (copy auth/job patterns) | Opt 3: stock ComfyUI remote + thin local adapter |
|-----------|-------------------------------------|--------------------------------------------------------|--------------------------------------------------|
| Speed to implement | Medium (rip out LTX, wire ComfyUI) | Medium (scaffold, copy ~200 lines of pattern) | **Fastest** (run stock ComfyUI, write only client) |
| Risk to Resonance | **High** (LTX revival path damaged; shared repo) | **None** (separate repo) | **None** (separate) |
| Operational simplicity | Low (carries LTX baggage + GPU lock) | High (purpose-built) | Medium (must operate ComfyUI yourself) |
| Batch generation (100 variants) | Build it | Build it (first-class, see spec §9) | Native via ComfyUI batching + client loop |
| Custom ComfyUI workflows | Yes (you own the server) | Yes (you own the server) | Yes (stock ComfyUI is the workflow engine) |
| Easy to restore LTX later | **No** (you overwrote it) | **Yes** (LTX untouched) | **Yes** (LTX untouched) |
| Recommendation | ✗ avoid | ✓ best for a product surface | ✓ best for fastest v1 |

**Recommendation:** do **not** mutate `ltx-worker` in place until the old LTX
setup is archived (and even then, prefer keeping it). For the new project, start
with **Option 3** (stock ComfyUI remotely + a thin local adapter implementing
`COMFYUI_IMAGE_WORKER_ADAPTER_SPEC.md`) to get images on screen fastest, and
graduate to **Option 2** (a small dedicated image-worker repo) if/when you need a
hardened service, custom auth surface, or managed batching. Both keep LTX fully
revivable.

---

## Part I — Final answers

### 1. Active GPU worker access path

`POD_URL` / `POD_AUTH_TOKEN` is **canonical and enforced**.
`GPU_WORKER_URL` / `GPU_WORKER_TOKEN` is a still-honored **manual override /
legacy** path used only inside `adapters/ltx_selfhosted.py`. At runtime the
adapter uses `GPU_WORKER_URL` if set, otherwise falls back to `POD_URL` via
`pod_manager`. But the orchestrator **will not boot** unless `POD_URL` *and*
`POD_AUTH_TOKEN` are present (both startup gates require them). Net: *both names
exist; `POD_*` is the real one.* (Evidence: `start_cloud.py:79-82`,
`job_runner.py:142-158`, `pod_manager.py:25-37`, `ltx_selfhosted.py:112-121`,
`config.py:26-27`.)

### 2. Exact Resonance files to disable video exposure safely

Minimum (frontend only; no backend, no DB, no `submit_generation` change):
1. `frontend/src/lib/featureFlags.ts` *(new — `VIDEO_GENERATION_ENABLED = false`)*
2. `frontend/src/components/generate/steps/ProductLaneStep.tsx` *(filter the `video` tile, lines 50-55)*
3. `frontend/src/components/generate/useWizardState.ts` *(default-lane fallbacks at lines 813, 816 — never default to `video`)*
4. `frontend/src/components/generate/steps/ConfirmStep.tsx` *(verify only)*

Already done previously: `frontend/src/pages/StudyModeSelector.tsx` (video study
mode already hidden, see comment at line 26).

Do not unset `POD_URL`/`POD_AUTH_TOKEN` to disable — that crashes the whole
orchestrator. Keep them set, or relax both startup gates together (optional,
later).

### 3. Files that define the LTX worker API contract

`ltx-worker/src/app.py` (routes + auth + job store), `ltx-worker/src/config.py`
(env), `ltx-worker/src/inference.py`, `ltx-worker/src/postprocess.py`,
`ltx-worker/src/rp_handler.py` (serverless variant), `ltx-worker/Dockerfile`,
`ltx-worker/requirements.txt`, `ltx-worker/POD_RESTORE.md`. Client side:
`orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py` (+
`pod_manager.py`, `config.py`, `router.py`).

### 4. Safest cleanup sequence for the remote GPU

Phase 1 (non-destructive, verify all before Phase 2): push `ltx-worker` repo;
fill the live-deployment checklist; `du -sh` model dirs; **snapshot/export the
network volume**; confirm the Docker image:tag is pushed and re-pullable; capture
a `/health` baseline; confirm Resonance video is disabled and the
`POD_URL`/`POD_AUTH_TOKEN` strategy is chosen. Phase 2 (destructive, explicit
approval each step): only after verified backups — archive then remove LTX model
weights, stop/replace the container, install ComfyUI on `/workspace`. Full detail
in `GPU_WORKER_CLEAN_REINSTALL_PLAN.md`.

### 5. Recommended architecture for the new ComfyUI/image worker

Separate repo + separate env namespace (`IMAGE_WORKER_URL` / `IMAGE_WORKER_TOKEN`).
Reuse the LTX *pattern* (FastAPI, bearer auth, async submit→poll→result,
single-GPU lock awareness) — copied, not imported. Contract:
`GET /health`, `POST /generate-image`, `GET /jobs/{id}`, `GET /jobs/{id}/result`,
optional `POST /batch`; structured prompt JSON + human-readable summary;
server-side workflow templates + style-module table; seeds returned for
reproducibility; self-describing filenames; batch tracking by `batch_id`. Start
with stock ComfyUI + thin local adapter (Option 3). Full contract in
`COMFYUI_IMAGE_WORKER_ADAPTER_SPEC.md`.

### 6. Open questions requiring human dashboard access

- Provider + exact running container **image:tag** (repo default is
  `lokiii69/ltx-worker:diffusers-v1`; `POD_RESTORE.md` says final tag was "TBD").
- Where `POD_URL` points and where `POD_AUTH_TOKEN` / `WORKER_AUTH_TOKEN` are
  stored (which dashboard).
- Whether the deployment actually sets `GPU_WORKER_URL` (manual override) or
  relies on `POD_*` + Level-2 RunPod automation.
- Network volume present and persistent? Current `du -sh` of model dirs?
- Snapshot/export capability and remaining paid GPU time.
- Reachability from Resonance (Railway) and from the MacBook; SSH/container-shell
  availability.

### 7. No-go list (do not do without explicit approval)

- ❌ Delete/format the GPU volume or any `/workspace/models/*` before a verified
  snapshot/export.
- ❌ Terminate the pod or `docker rmi` the LTX image before Phase 1 backup is
  confirmed and the image is pushed to a registry.
- ❌ Unset `POD_URL`/`POD_AUTH_TOKEN` without relaxing both startup gates
  (`start_cloud.py:79-89`, `job_runner.py:142-158`) — crashes all generation.
- ❌ Delete any LTX/video code (`ltx-worker/**`,
  `orchestrator/cloud_engines/video_engine/**`) — keep dormant.
- ❌ Mutate `ltx-worker` in place for the image project before LTX is archived.
- ❌ Change `submit_generation` / `request_word_retry`, alter DB schema, or rerun
  old migrations.
- ❌ Any paid provider / GPU generation call beyond read-only `/health`.
- ❌ Print/commit/document raw secret values.

---

## Bottom line

Video in Resonance is already half-retired (study mode gone). Finish it with a
4-file frontend flag — no backend, schema, or `submit_generation` changes — and
**leave `POD_URL`/`POD_AUTH_TOKEN` set** so the orchestrator keeps running cards
and music. Preserve the LTX worker (repo is already self-documenting via
`POD_RESTORE.md`; the one irreplaceable asset is the model volume — snapshot it).
For the new image project, run stock ComfyUI remotely behind a thin local adapter
that copies the LTX worker's auth/job/result shape, in its own repo and env
namespace, so the two projects never interfere and LTX stays revivable.
