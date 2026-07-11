# ComfyUI Image Worker — Adapter Spec (new project)

**Purpose:** define a clean, Resonance-independent HTTP contract for the new
image-generation project. It reuses the *access pattern* proven by the LTX worker
(bearer auth, async submit → poll → fetch result, single-GPU lock awareness) but
is a **separate service** and **separate repo** — no Resonance internals,
no Supabase coupling, no LTX inference.

**Design assumptions (from the brief)**
- Local web app first (MacBook); images shown in the local UI.
- No direct Ideogram dependency for v1; backends behind adapters.
- First backend: remote ComfyUI (RunPod-style). Future: local ComfyUI, hosted
  image APIs, Ideogram.
- Input = structured prompt JSON + human-readable summary.
- Batch generation of many variants (e.g. 100) within one coordinate region.
- Style modules: anti-plastic/anti-sterile, human silhouettes/traces,
  central-human modes, animals, nature.

This contract mirrors the LTX worker shape so the team already understands it:
`POST /generate`, `GET /jobs/{id}`, `GET /jobs/{id}/result`, `GET /health`,
bearer auth, 202-on-submit, poll for `complete`/`failed`.

---

## 1. Auth convention

- Header on every request except `GET /health`:
  `Authorization: Bearer <IMAGE_WORKER_TOKEN>`.
- Worker reads its expected token from env `IMAGE_WORKER_TOKEN` (analogous to
  `WORKER_AUTH_TOKEN`). If empty → auth disabled (dev only; never in a reachable
  deployment).
- Client reads `IMAGE_WORKER_URL` + `IMAGE_WORKER_TOKEN` from its own config.
  **Do not** reuse Resonance's `POD_URL`/`GPU_WORKER_*` names — keep namespaces
  separate so the two projects never collide.

---

## 2. Endpoints

| Method & path | Purpose | Sync/async |
|---------------|---------|-----------|
| `GET /health` | Liveness, GPU, VRAM, model/workflow availability, queue depth | sync |
| `POST /generate-image` | Submit one image job | async (returns 202 + `job_id`) |
| `GET /jobs/{id}` | Poll job status/progress | sync |
| `GET /jobs/{id}/result` | Fetch result manifest (JSON) or image bytes | sync |
| `POST /batch` *(optional)* | Submit N variants in one call | async (returns `batch_id` + child `job_id`s) |

A worker may also support a **synchronous** convenience: `POST /generate-image?wait=true`
returns the finished result inline when generation is fast. The client must
support both modes (see §10).

---

## 3. `POST /generate-image` — request schema

```jsonc
{
  "prompt": {                       // structured prompt JSON (machine-facing)
    "subject": "central-human",     // style-module selector
    "scene": { "setting": "forest", "time_of_day": "dusk" },
    "composition": {
      "coordinate_region": "A3",    // the region this variant belongs to
      "aspect_ratio": "1:1"
    },
    "style_modules": ["anti_plastic", "human_silhouette", "nature"],
    "positive_terms": ["..."],
    "negative_terms": ["plastic", "sterile", "cgi"]
  },
  "summary": "Dusk forest, lone human silhouette, painterly, anti-plastic.",
  "params": {
    "width": 1024,
    "height": 1024,
    "steps": 30,
    "cfg": 5.0,
    "sampler": "dpmpp_2m",
    "scheduler": "karras",
    "model": "sdxl-base",           // logical model name → workflow mapping
    "seed": 123456789               // -1 or null = random per job
  },
  "workflow": "default_txt2img",    // named ComfyUI workflow template (server-side)
  "client_job_id": "uuid-optional", // client idempotency hint
  "batch_id": "uuid-optional"       // set when part of a batch
}
```

Rules:
- `prompt` (structured) is **required**; `summary` (human-readable) is required
  and stored for UI display + later search/recall.
- `params` are optional with server defaults.
- `seed`: `null`/`-1` → server assigns a random seed and **returns it** so any
  image can be reproduced.
- `workflow` names a server-registered template; unknown name → 422.

### Response (async): HTTP 202

```json
{ "job_id": "img-ab12cd34", "status": "queued", "batch_id": null }
```

---

## 4. `GET /jobs/{id}` — status schema

```json
{
  "job_id": "img-ab12cd34",
  "batch_id": null,
  "status": "queued|processing|complete|failed",
  "progress": 0.0,
  "error": null,
  "seed": 123456789,
  "created_at": "...", "started_at": null, "completed_at": null,
  "metadata": {
    "width": 1024, "height": 1024, "model": "sdxl-base",
    "workflow": "default_txt2img", "steps": 30, "cfg": 5.0,
    "generation_time": 4.2,
    "coordinate_region": "A3"
  }
}
```

Mirrors the LTX worker status shape (`ltx-worker/src/app.py:413-422`) plus
`seed`, `batch_id`, and image-specific metadata.

---

## 5. `GET /jobs/{id}/result` — result

Two supported forms (client picks via `Accept` header or `?format=`):
- `?format=manifest` (default) → JSON:
  ```json
  {
    "job_id": "img-ab12cd34",
    "images": [
      { "filename": "img-ab12cd34_A3_s123456789_0.png",
        "url": "/files/img-ab12cd34_A3_s123456789_0.png",
        "width": 1024, "height": 1024, "seed": 123456789 }
    ],
    "summary": "Dusk forest, lone human silhouette ...",
    "prompt": { /* echo of the structured prompt JSON */ }
  }
  ```
- `?format=binary` → raw image bytes (`Content-Type: image/png`) for the first
  image (analogous to LTX `/jobs/{id}/result` returning the MP4).

`409` if not complete, `404` if unknown, `500` if files missing — same semantics
as the LTX worker.

---

## 6. Error schema (uniform)

Every error response (any endpoint):

```json
{ "status": "error", "error": "human message", "code": "validation|auth|busy|not_found|internal", "retryable": true }
```

HTTP status mapping (matches LTX worker conventions so the client logic is
reusable):
- `401` auth (`code: auth`)
- `422` validation (`code: validation`, not retryable)
- `503` busy / model loading (`code: busy`, retryable, `Retry-After` header)
- `404` job/result not found
- `500` internal

---

## 7. Prompt JSON → ComfyUI workflow inputs

The worker owns a registry of **workflow templates** (ComfyUI API-format graphs
with placeholder node inputs). Conversion:

1. Load the template named by `workflow` (e.g. `default_txt2img`).
2. Map structured fields onto node inputs:
   - `prompt.positive_terms` + style-module expansions → positive CLIP text node.
   - `prompt.negative_terms` + default anti-plastic/anti-sterile negatives →
     negative CLIP text node.
   - `params.width/height/steps/cfg/sampler/scheduler/seed` → KSampler + latent
     nodes.
   - `params.model` → checkpoint loader (logical name → on-disk checkpoint).
   - `style_modules` → optional LoRA loaders / prompt fragments (a server-side
     module table maps `anti_plastic`, `human_silhouette`, `central_human`,
     `animals`, `nature` to concrete prompt text and/or LoRAs).
3. Submit the assembled graph to ComfyUI (`POST /prompt` on the ComfyUI API),
   track via ComfyUI's `prompt_id`, poll ComfyUI history, collect output images.
4. The adapter translates ComfyUI's native progress/history into the uniform
   `/jobs/{id}` shape above — the local app never sees ComfyUI internals.

Keep the **style-module table and workflow templates server-side** so the local
app stays thin and backends are swappable.

---

## 8. Human-readable summary storage

- `summary` is stored alongside every job and echoed in the result manifest.
- Persist `{job_id, batch_id, prompt(json), summary, seed, filenames, params,
  created_at}` in a small local store (SQLite/JSON on the MacBook for v1) so the
  UI can list, filter, and reproduce. The summary is the human index; the
  structured prompt is the machine index.

---

## 9. File naming, seeds, batches

- **Filename:** `{job_id}_{coordinate_region}_s{seed}_{index}.png` — encodes job,
  region, seed, and variant index so files are self-describing and sortable.
- **Seeds:** request seed `null`/`-1` → server picks random, records it, returns
  it in status + manifest. Reproduction = resubmit with the recorded seed.
- **Batches:** `POST /batch` accepts a base prompt + a count (or an explicit list
  of per-variant overrides) and a shared `coordinate_region`. It creates N child
  jobs sharing one `batch_id`. `GET /batches/{batch_id}` returns the roster +
  per-child status. For 100 variants in one region, the client submits one batch
  and polls the batch, not 100 individual jobs.

---

## 10. Local app polling + sync/async support

- **Async (default):** submit → receive `job_id`/`batch_id` → poll
  `GET /jobs/{id}` (or the batch) every ~1-3s until `complete`/`failed` → fetch
  result manifest → render images from `url`s. This is the same loop the LTX
  client uses (`ltx_selfhosted.py:247-340`), minus Resonance plumbing.
- **Sync:** for fast single images, `POST /generate-image?wait=true` returns the
  finished manifest inline; the client should treat a 202 (async) and a 200
  (sync) interchangeably by branching on status code.
- The client should carry an end-to-end deadline (like `GPU_WORKER_TIMEOUT`) and
  a consecutive-poll-failure cap (like the LTX client's `max_consecutive_errors`)
  so a wedged worker fails cleanly.

---

## 11. Independence from Resonance

- Separate repo, separate env namespace (`IMAGE_WORKER_*`, not `POD_*`/`GPU_WORKER_*`).
- No Supabase, no `generation_jobs`, no Resonance schema. The local app owns its
  own store.
- The only thing borrowed from `ltx-worker` is the **shape** (FastAPI bearer
  auth + async job pattern + single-GPU lock awareness), copied, not imported.
- This guarantees that disabling/reviving Resonance video and evolving the image
  project never affect each other.
