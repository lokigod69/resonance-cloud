# GPU Worker — Preservation & Clean Reinstall Plan

**Goal:** before repurposing the paid remote GPU for a new ComfyUI/image project,
fully preserve the LTX worker so it can be revived later, then clean the machine
in a controlled, two-phase, approval-gated way.

**Hard rules for this plan:** no destructive commands are run here. Every
delete/format/terminate step is listed as *requires explicit human approval*.
Backup and documentation happen first; deletion happens only after backup is
verified.

---

## Part B — Live deployment mapping checklist (human fills from dashboards)

The agent cannot and must not log into provider dashboards. Fill this in by hand
before any cleanup. Record **where** secrets live (e.g. "Railway → Variables"),
never the secret values.

| Item | Value (fill in) |
|------|-----------------|
| Provider (RunPod / Runware / custom VPS / Railway / other) | |
| Remote worker URL (the `POD_URL` target — record location, not the token) | |
| Auth token source (where `POD_AUTH_TOKEN` / `WORKER_AUTH_TOKEN` is stored) | |
| Container image : tag actually running | (repo default is `lokiii69/ltx-worker:diffusers-v1`, `config.py:48`) |
| Current running command | (repo default `uvicorn src.app:app --host 0.0.0.0 --port 8080`) |
| Mounted volume path(s) | (expected `/workspace`) |
| Model paths on volume | (expected `/workspace/models/ltx-2.3-diffusers`, `...-upsampler`, `.../loras`) |
| Exposed port(s) | (expected `8080`) |
| GPU type | (expected NVIDIA L40S 48GB per `POD_RESTORE.md`) |
| Remaining paid time / billing end | |
| Current disk usage (`du -sh /workspace`) | |
| Current model directory sizes (`du -sh` each) | |
| Worker reachable from Resonance (Railway)? | |
| Worker reachable from local MacBook? | |
| SSH available? | |
| Container shell available? | |
| Snapshot / image export available? | |

Cross-check the running config against `ltx-worker/POD_RESTORE.md` "Validated
Environment" so the recorded reality matches the documented baseline.

---

## Part D — Preservation (archive everything before touching the machine)

### D1. Repo + image identity to record

- **Repo commit:** from inside `ltx-worker/`, run `git rev-parse HEAD` (and
  `git status`, `git remote -v`). *(Note: at investigation time the workspace
  root is not a git repo; confirm `ltx-worker/` has its own `.git` or is a
  subtree of another repo before relying on this.)*
- **Dockerfile:** `ltx-worker/Dockerfile` — already in repo. Records base image
  `nvidia/cuda:12.8.0-runtime-ubuntu22.04`, Python 3.11, pinned torch
  `2.11.0+cu128`, diffusers git commit
  `77f8cf8bf557a0136d269baea773cef26eb5991a`, peft, `EXPOSE 8080`,
  `CMD uvicorn src.app:app --host 0.0.0.0 --port 8080`.
- **Pinned packages:** `ltx-worker/requirements.txt` (already in repo).
- **Container image:tag:** repo default `lokiii69/ltx-worker:diffusers-v1`
  (`orchestrator/cloud_engines/video_engine/config.py:48`). Confirm the *actual*
  running tag from the dashboard (Part B) — `POD_RESTORE.md` notes the final tag
  was "TBD after Phase 3 rebuild."

### D2. Env variable names to record (NOT values)

Worker side (`ltx-worker/src/config.py`): `WORKER_AUTH_TOKEN`,
`MAX_GENERATION_TIME`, `GPU_THREAD_DRAIN_TIMEOUT`, `JOB_TTL_SECONDS`,
`DIFFUSERS_MODEL_DIR`, `UPSAMPLER_MODEL_DIR`, `LORA_DIR`, `LTX_MODEL_DIR`,
`GEMMA_MODEL_DIR`, `DEVICE`, `LOADED_PIPELINES`.

Orchestrator side (must stay set for the orchestrator to boot — see disable
plan): `POD_URL`, `POD_AUTH_TOKEN`, plus optional `GPU_WORKER_URL`,
`GPU_WORKER_TOKEN`, `VIDEO_BACKEND`, and the `RUNPOD_*` family
(`config.py:33-52`).

### D3. Model directories + versions to record (on the remote volume)

From `ltx-worker/POD_RESTORE.md` "Network Volume Layout" (mount `/workspace`):

- `/workspace/models/ltx-2.3-diffusers/` — `transformer/` (BF16), `text_encoder/`,
  `vae/`, `audio_vae/`, `vocoder/`, `connectors/`, `scheduler/`, `tokenizer/`,
  `processor/`
- `/workspace/models/ltx-2.3-upsampler/latent_upsampler/`
- `/workspace/models/loras/ltx-2.3-22b-distilled-lora-384.safetensors` (orphaned
  in current code; archival only)

Record each size with `du -sh` (read-only) **before** any change. These are large
model weights — losing them means re-downloading/re-converting, which is the
expensive part of any future LTX revival.

Validated package versions to capture (already in `POD_RESTORE.md`): torch
2.11.0+cu128, torchaudio 2.11.0, torchvision 0.26.0, diffusers @ that git commit,
transformers 4.57.6, peft 0.19.1, accelerate 1.13.0; Python 3.11.10; CUDA 12.8
(driver 570.124.06); GPU L40S 48GB; Ubuntu 22.04.5.

### D4. API contract to record

Already captured in `GPU_WORKER_ACCESS_INVENTORY.md` §3. Source files:
`ltx-worker/src/app.py` (routes, auth, job store), `config.py`, `inference.py`,
`postprocess.py`, `rp_handler.py` (serverless variant).

### D5. Health check + smoke test commands (read-only, safe)

- Health (no auth required): `GET {POD_URL}/health` → expect `model_loaded:true`,
  GPU name, VRAM, `pipelines_loaded`. Server: `app.py:93-120`.
- Repo smoke tests: `ltx-worker/test_smoke.py` and `ltx-worker/test_http.sh`.
- These are diagnostic only and may be run against the existing pod **before**
  teardown to confirm a known-good baseline. Do not run generation load tests if
  paid GPU time is a concern.

### D6. How to restore LTX later

Follow `ltx-worker/POD_RESTORE.md` "Resurrection Workflow":
1. Spin a new L40S pod, attach the network volume at `/workspace`.
2. Pull the `lokiii69/ltx-worker` image (confirmed tag from Part B).
3. Run with `WORKER_AUTH_TOKEN` set.
4. Wait for `/health` → `model_loaded=true`.
5. Set the orchestrator's `POD_URL` (+ `POD_AUTH_TOKEN`) to the new pod URL.
   **Update for current code:** `POD_RESTORE.md` says `GPU_WORKER_URL`; the
   running orchestrator now requires `POD_URL`/`POD_AUTH_TOKEN` (see
   `GPU_WORKER_ACCESS_INVENTORY.md` §1). Set `POD_*`.
6. In the frontend, flip `VIDEO_GENERATION_ENABLED` back on (see
   `LTX_VIDEO_FEATURE_DISABLE_PLAN.md`).

**The cheapest possible revival** = keep the network volume (model weights)
intact. If you must reclaim disk, snapshot/export the volume first.

---

## Two-phase cleanup

### Phase 1 — Backup / document / snapshot (non-destructive)

Run/verify all of these and confirm success **before** Phase 2:

1. ✅ Repo (`ltx-worker/`) committed/pushed to its remote (code + Dockerfile +
   requirements + POD_RESTORE.md + README + smoke tests). Confirm `git status`
   clean and pushed.
2. ✅ Part B checklist filled from dashboards.
3. ✅ `du -sh` recorded for `/workspace` and each model directory.
4. ✅ Provider snapshot / volume export taken if available (this is the safety
   net for the model weights). Record snapshot ID + location.
5. ✅ Confirm the running Docker image:tag is published/pullable (so the image can
   be re-pulled later). If only running locally on the pod, `docker save` /
   push to a registry **first**.
6. ✅ Health baseline captured (`/health` JSON) and smoke test green.
7. ✅ Confirm Resonance video is disabled at the front of the funnel
   (`LTX_VIDEO_FEATURE_DISABLE_PLAN.md`) and `POD_URL`/`POD_AUTH_TOKEN` strategy
   chosen, so cleaning the pod does not break the live product.

### Phase 2 — Remove LTX/video files & install ComfyUI/image stack (DESTRUCTIVE — approval required)

Do **not** run any of these without explicit human approval, and only after Phase
1 is verified complete.

Candidate archive-before-delete (on the remote machine):
- `/workspace/models/ltx-2.3-diffusers/`, `/workspace/models/ltx-2.3-upsampler/`,
  `/workspace/models/loras/` — **archive (snapshot/export) before any deletion.**
- The running LTX container — stop only after a new image plan is ready.

Candidate safe-to-delete *after verified backup*:
- LTX model weights on the volume (only if you need the disk for ComfyUI models
  and you have a verified snapshot/export).
- Old job temp dirs (`/tmp/ltx_jobs_*`) — ephemeral, safe.

Install (new stack) — out of scope for this pass; do **not** install anything on
the remote GPU yet. When approved, the ComfyUI install lands on the same volume
(`/workspace`) with its own `models/` tree, separate from the archived LTX dirs.

---

## No-go list (must not happen without explicit approval)

- ❌ Deleting / formatting the network volume or any `/workspace/models/*` dir
  before a verified snapshot/export exists.
- ❌ Terminating the pod before Phase 1 backup is confirmed.
- ❌ `docker rmi` / removing the `lokiii69/ltx-worker` image before confirming it
  is pushed to a registry and re-pullable.
- ❌ Unsetting `POD_URL` / `POD_AUTH_TOKEN` on the orchestrator without first
  relaxing both startup gates (it crashes the whole orchestrator —
  `start_cloud.py:79-89`, `job_runner.py:142-158`).
- ❌ Deleting any LTX/video code in `ltx-worker/` or
  `orchestrator/cloud_engines/video_engine/` (we want dormant, not gone).
- ❌ Rerunning old Supabase migrations or altering schema.
- ❌ Any paid provider/generation call during cleanup beyond the read-only
  `/health` baseline.
