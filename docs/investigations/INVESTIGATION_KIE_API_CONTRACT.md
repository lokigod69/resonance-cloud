# Investigation — Kie.ai Image API Contract Reference

Scope: full contract reference for four Kie.ai image endpoints, sufficient to implement `kie_provider.py` mirroring the existing `orchestrator/cloud_engines/image_engine/wan_provider.py` pattern.

Endpoints covered:
1. Flux 2 Pro — text-to-image
2. Flux 2 Pro — image-to-image
3. Z-Image-Turbo — text-to-image
4. Wan 2.7 Image & Image Pro — re-verification vs. live code

Source pages (verified 2026-04-23):
- https://docs.kie.ai/market/flux2/pro-text-to-image
- https://docs.kie.ai/market/flux2/pro-image-to-image (canonical URL — confirmed, matches the convention the user guessed)
- https://docs.kie.ai/market/z-image/z-image
- https://docs.kie.ai/market/wan/2-7-image
- https://docs.kie.ai/market/wan/2-7-image-pro
- https://docs.kie.ai/market/common/get-task-detail  ← **unified polling envelope, shared by all four**
- https://docs.kie.ai/  (Getting Started)

---

## 0. Shared envelope — applies to ALL four endpoints

The four image models live under Kie.ai's "Market" category. **They share one submit endpoint, one polling endpoint, one auth scheme, and one response envelope.** This is the same envelope `wan_provider.py` already targets, so a `kie_provider.py` that reuses its submit/poll helpers only needs to swap the payload shape per model.

### 0.1 Submit
- **URL:** `POST https://api.kie.ai/api/v1/jobs/createTask`
- **Headers:**
  - `Authorization: Bearer <KIE_API_KEY>`  (Bearer token; API key obtained at https://kie.ai/api-key)
  - `Content-Type: application/json`
- **Env var convention (resonance-cloud):** `KIE_API_KEY` — set in [wan_provider.py:72](orchestrator/cloud_engines/image_engine/wan_provider.py#L72). Reuse this exact name for kie_provider.
- **Body shape:** always `{ "model": "<model-id>", "callBackUrl"?: "<https-url>", "input": { ...model-specific fields... } }`
- **Success body:**
  ```json
  { "code": 200, "msg": "success", "data": { "taskId": "task_<model>_<epoch-ms>" } }
  ```
- **`code`:** integer. 200 = accepted. Non-200 is an application-level error even when HTTP is 200 — current `wan_provider.py` handles this at [wan_provider.py:195-197](orchestrator/cloud_engines/image_engine/wan_provider.py#L195-L197). Keep the same guard.
- **`callBackUrl` (optional):** webhook POSTed with the same record body when the task terminates. Docs recommend callback over polling for production but polling works. All resonance-cloud code today polls.

### 0.2 Poll — shared across all Market models
- **URL:** `GET https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<id>`
- **Header:** `Authorization: Bearer <KIE_API_KEY>`
- **Success body (state=success):**
  ```json
  {
    "code": 200,
    "msg": "success",
    "data": {
      "taskId": "task_12345678",
      "model": "wan/2-7-image",
      "state": "success",
      "param": "<JSON string of original request>",
      "resultJson": "{\"resultUrls\":[\"https://...\"]}",
      "failCode": "",
      "failMsg": "",
      "costTime": 15000,
      "completeTime": 1698765432000,
      "createTime": 1698765400000,
      "updateTime": 1698765432000,
      "progress": 100
    }
  }
  ```
- **States (enum):** `waiting`, `queuing`, `generating`, `success`, `fail`. Only `success` and `fail` are terminal. The current wan_provider checks exactly these two at [wan_provider.py:248-257](orchestrator/cloud_engines/image_engine/wan_provider.py#L248-L257) — correct.
- **`resultJson`:** is a **JSON string that must be re-parsed** (not a nested object). For images: `{"resultUrls": ["<url>", ...]}`. For text-model outputs Kie uses `{"resultObject": {...}}` instead, but none of the four endpoints in scope return that shape. wan_provider's [_extract_image_url](orchestrator/cloud_engines/image_engine/wan_provider.py#L266-L300) handles this correctly, including the two fallback paths (`data.response.resultUrls`, `data.resultUrls`) — those fallbacks are undocumented but historically observed, worth keeping.
- **Failure body:** `state: "fail"` plus populated `failCode` / `failMsg`. wan_provider reads `failMsg` / `errorMessage` at [wan_provider.py:252-256](orchestrator/cloud_engines/image_engine/wan_provider.py#L252-L256) — `errorMessage` is the older/less-documented key; `failMsg` matches current docs.
- **Polling guidance (docs):** exponential backoff starting 2–3s; stop after 10–15 minutes; result URLs expire 24h after completion. Current `WAN_MAX_POLL_TIME = 180s` is tighter than docs recommend — intentional for fast images (Flux 2 Pro / Z-Image / Wan are all sub-minute). Flag if you later plug in a slower model.
- **Error response (HTTP-level or code-level):**
  ```json
  { "code": 404, "msg": "Task not found", "data": null }
  ```
  Documented polling-endpoint codes: 400 ("taskId parameter is required"), 401 (Unauthorized), 404 (Task not found), 422 ("recordInfo is null"), 429 (Rate limit exceeded).

### 0.3 Error codes — shared across all submit endpoints
| Code | Meaning |
|------|---------|
| 200  | Success |
| 401  | Unauthorized |
| 402  | Insufficient Credits |
| 404  | Not Found |
| 408  | Upstream service issue / no result after ~10 min (Wan 2.7 pages only) |
| 422  | Validation Error |
| 429  | Rate Limited |
| 433  | Sub-key Usage Exceeds Limit |
| 455  | Service Unavailable / Maintenance |
| 500  | Server Error |
| 501  | Generation Failed |
| 505  | Feature Disabled |

### 0.4 Rate limits
Documented only abstractly (codes 429, 433). No concrete RPM/RPS figures on any of the four pages. Treat 429 / 433 as retry-after-backoff; treat 402 as hard-stop.

### 0.5 File upload (for i2i reference images that aren't already public URLs)
- **URL:** `POST https://kieai.redpandaai.co/api/file-base64-upload`  — **note: different host**, NOT `api.kie.ai`.
- **Auth:** same `Authorization: Bearer <KIE_API_KEY>`.
- **Body:** `{ "base64Data": "<b64>", "fileName": "<name>", "uploadPath": "images" }`
- **Response:** `data.downloadUrl` (public URL, auto-deletes after ~3 days).
- Pattern already implemented at [wan_provider.py:145-176](orchestrator/cloud_engines/image_engine/wan_provider.py#L145-L176). Reuse for Flux 2 Pro i2i unless the caller already has a hosted URL.

### 0.6 Shared helper pattern — recommended reuse
The submit → poll → extract → download flow at [wan_provider.py:109-142](orchestrator/cloud_engines/image_engine/wan_provider.py#L109-L142), plus helpers `_submit_task`, `_poll_task`, `_extract_image_url`, `_download_and_save`, `_err`, is **model-agnostic**. A kie_provider.py can either:
- import these helpers directly (preferred — one source of truth), or
- copy them and vary the payload builder per model.

Only the payload construction differs per model (sections 1–4 below).

---

## 1. Flux 2 Pro — Text-to-Image

Docs: https://docs.kie.ai/market/flux2/pro-text-to-image

### Submit
- **URL/Method/Auth/Envelope:** see §0.1 / §0.2.
- **`model`:** `"flux-2/pro-text-to-image"` (literal string, required).

### Request `input` schema

| Field | Type | Req | Default | Allowed values | Notes |
|-------|------|-----|---------|----------------|-------|
| `prompt` | string | ✓ | — | length 3–5000 | |
| `aspect_ratio` | string | ✓ | `1:1` | `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `3:2`, `2:3` | Note: docs reference an `auto` value in a prose sentence but it is **not** in the enum — treat as t2i-inapplicable. |
| `resolution` | string | ✓ | `1K` | `1K`, `2K` | |
| `nsfw_checker` | boolean | ✗ | `false` | — | When `false`, "all results will be returned directly by the model itself" (filter disabled). |

**Not in the schema (not documented):** `negative_prompt`, `seed`, `steps`, `guidance` / `cfg` / `guidance_scale`, `width`, `height`, `num_images` / `n`, `style`, `strength`. Any of these will likely be ignored or trigger a 422.

### Response
- Submit: `{code:200, msg:"success", data:{taskId:"task_flux-2_<epoch-ms>"}}`
- Poll success `resultJson` (JSON-string-encoded): `{"resultUrls": ["https://<cdn>/...jpg|png"]}`
- Image delivery: **URL only** — no base64 in response. Download over HTTP at the returned URL (24h expiry).

### Sync vs async
Async. Poll via `/jobs/recordInfo?taskId=<id>`. Completion time not quoted on the page; flux-2-pro typically sub-minute in practice.

### Resolution / 1920×1080
- Exposed knobs are categorical `1K` / `2K` — **no native 1920×1080 selector**.
- Exact pixel dimensions per `1K` / `2K` per aspect-ratio are not published. At `1K` + `16:9`, expect ≈1024-class output; at `2K` + `16:9`, expect ≈2048-class output. Either will need a downstream resize + center-crop to hit exactly 1920×1080. Recommend `resolution=2K` + `aspect_ratio=16:9` + PIL resize-and-crop in kie_provider, reusing the conversion pattern from [wan_provider.py:318-327](orchestrator/cloud_engines/image_engine/wan_provider.py#L318-L327).

### Seed / steps / CFG
All **not documented**. Flux 2 Pro appears to be a closed-param endpoint — no determinism lever exposed via this API.

### Rate limits / quirks
- Rate limits: only abstract (429). No numeric limit published.
- Quirk: `nsfw_checker=false` disables content filtering; default is already `false`. If that matters for compliance, set explicitly to `true`.
- Quirk: no negative prompt field. Pack negation into the main prompt.

---

## 2. Flux 2 Pro — Image-to-Image

Docs (confirmed): **https://docs.kie.ai/market/flux2/pro-image-to-image**
Convention matched — the user's guess was correct.

### Submit
- **URL/Method/Auth/Envelope:** see §0.1 / §0.2.
- **`model`:** `"flux-2/pro-image-to-image"`.

### Request `input` schema

| Field | Type | Req | Default | Notes |
|-------|------|-----|---------|-------|
| `prompt` | string | ✓ | — | 3–5000 chars |
| `input_urls` | array of strings (URIs) | ✓ | — | 1–8 images; JPEG / PNG / WebP; **≤10 MB each**. URL-only input. No base64 inline, no multipart. |
| `aspect_ratio` | string | ✓ | `1:1` | `1:1`, `4:3`, `3:4`, `16:9`, `9:16`, `3:2`, `2:3`, **`auto`** (here `auto` IS in the enum and means "match the first input image ratio") |
| `resolution` | string | ✓ | `1K` | `1K`, `2K` |
| `nsfw_checker` | boolean | ✗ | `false` | |

### Reference image — **critical details**
- **Field name:** `input.input_urls` (array, even for a single image).
- **Format:** **URL only**. Base64 and multipart are NOT accepted on this endpoint. To send a locally generated PNG, upload first via `https://kieai.redpandaai.co/api/file-base64-upload` (see §0.5) and pass the returned `downloadUrl` in `input_urls`. This is exactly the chaining pattern already in use at [wan_provider.py:145-176](orchestrator/cloud_engines/image_engine/wan_provider.py#L145-L176).
- **Strength / denoise / image_strength / `strength` parameter:** **NOT documented anywhere in the i2i schema.** Flux 2 Pro i2i does not expose a user-tunable denoise / conditioning-strength knob. Prompt adherence is implicit. If the caller needs to control "how much to keep vs. reinterpret," do it in-prompt (e.g. "preserve composition, lighting, camera angle" phrasing, as shown in the docs example).

### Response
- Submit: `{code:200, data:{taskId:"task_flux-2_<epoch-ms>"}}`
- Poll success `resultJson`: `{"resultUrls": ["https://..."]}`
- URL only, same 24h expiry.

### Seed / steps / CFG
**Not documented.** Same closed-param story as t2i.

### Sample request body (verbatim from docs)
```json
{
  "model": "flux-2/pro-image-to-image",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "input_urls": ["https://static.aiquickdraw.com/tools/example/1764235041265_kjJ2sTMR.png"],
    "prompt": "The jar in image 1 is filled with capsules",
    "aspect_ratio": "1:1",
    "resolution": "1K",
    "nsfw_checker": false
  }
}
```

### 1920×1080
Same story as §1: no native 1920×1080 selector. `resolution=2K` + `aspect_ratio=16:9` (or `auto` if input is already 16:9) → downstream resize+crop.

### Quirks
- `aspect_ratio: auto` — only valid on i2i, requires at least one `input_urls` entry.
- Up to 8 reference images per request.
- No strength knob. This is a behavioural constraint worth flagging in the kie_provider docstring.

---

## 3. Z-Image-Turbo — Text-to-Image

Docs: https://docs.kie.ai/market/z-image/z-image

### Submit
- **URL/Method/Auth/Envelope:** see §0.1 / §0.2.
- **`model`:** `"z-image"` (literal).

### Request `input` schema

| Field | Type | Req | Default | Allowed values | Notes |
|-------|------|-----|---------|----------------|-------|
| `prompt` | string | ✓ | — | **Max 1000 chars** (tighter than Flux 2's 5000) | |
| `aspect_ratio` | string | ✓ | `1:1` | `1:1`, `4:3`, `3:4`, `16:9`, `9:16` | **Smaller enum than Flux 2** — no `3:2`, `2:3`. |
| `nsfw_checker` | boolean | ✗ | `false` | — | |

**Not in schema:** `resolution`, `negative_prompt`, `seed`, `steps`, `cfg` / `guidance_scale`, `width`, `height`, `n`. Z-Image-Turbo on Kie is the **most locked-down** of the three t2i endpoints — only prompt + aspect ratio + nsfw toggle.

### Response
- Submit: `{code:200, data:{taskId:"task_z-image_<epoch-ms>"}}`
- Poll success `resultJson`: `{"resultUrls": ["https://..."]}`
- URL only.

### Resolution / 1920×1080
- **No `resolution` field at all.** Z-Image produces one fixed native size per aspect ratio (not published). 1920×1080 is **not** natively selectable; plan on resize+crop from whatever native 16:9 comes back (historically Z-Image-Turbo targets ~1024×576 or ~1280×720 — not documented here, verify empirically on first call).
- This is the biggest resolution caveat of the three models: lowest ceiling, no 2K knob.

### Seed / steps / CFG
- **All not documented.**
- Despite "Turbo" in the marketing name, the API does **not** expose a steps parameter — the few-step inference is fixed server-side.
- **CFG=0 quirk:** not documented on Kie's side. Z-Image-Turbo upstream does internally run CFG-free in turbo mode, but Kie does not expose that knob, so there's nothing to set. Treat as "no CFG control, don't try to pass `cfg`."
- **Negative prompt:** not exposed. Bake negations into `prompt`.

### Rate limits / quirks
- Documented error codes add `408` to the standard set (with 401, 402, 404, 422, 429, 455, 500, 501, 505).
- Callback security: Z-Image page mentions webhook signature verification is required for callback usage — not relevant if you poll.

### Sample request (from docs)
```json
{
  "model": "z-image",
  "callBackUrl": "https://your-domain.com/api/callback",
  "input": {
    "prompt": "Paris cafe terrace scene...",
    "aspect_ratio": "1:1",
    "nsfw_checker": true
  }
}
```

---

## 4. Wan 2.7 — re-verification vs. wan_provider.py

Docs (the user's `kie.ai/wan-2-7-image` marketing URL redirects mentally to two separate API pages):
- Standard: https://docs.kie.ai/market/wan/2-7-image
- Pro: https://docs.kie.ai/market/wan/2-7-image-pro

Both variants share **one schema** (with one constraint difference — see below). The live code at [wan_provider.py:34-36](orchestrator/cloud_engines/image_engine/wan_provider.py#L34-L36) already targets both model IDs.

### Request `input` schema (both variants)

| Field | Type | Req | Default | Range / allowed | Notes |
|-------|------|-----|---------|-----------------|-------|
| `prompt` | string | ✓ | — | ≤5000 chars; CN/EN | |
| `input_urls` | array[URI] | ✗ | — | ≤9 URLs; JPEG/PNG/WebP/JPG; ≤10 MB each | For image-editing / continuity chain |
| `aspect_ratio` | string | ✗ | — | `1:1`, `16:9`, `4:3`, `21:9`, `3:4`, `9:16`, `8:1`, `1:8` | Wider than Flux 2's enum; includes `21:9`, `8:1`, `1:8` |
| `enable_sequential` | boolean | ✗ | `false` | — | Gallery/sequential mode. Disables `thinking_mode` when true. |
| `n` | integer | ✗ | — (docs show "4 or 12" placeholder) | 1–4 if `enable_sequential=false`; 1–12 if true | |
| `resolution` | string | ✗ | `2K` | `1K`, `2K`, `4K` | **4K available only for text-to-image on the Pro model** (i.e. `wan/2-7-image-pro` with no `input_urls`). |
| `thinking_mode` | boolean | ✗ | `false` | — | Unavailable when `enable_sequential=true` or `input_urls` present. |
| `color_palette` | array | ✗ | — | 3–10 entries (8 recommended); each `{hex, ratio}`; ratios must sum to 100 | |
| `bbox_list` | array | ✗ | — | ≤2 boxes per image; `[x1,y1,x2,y2]` | Region-edit hint tied to `input_urls`. |
| `watermark` | boolean | ✗ | `false` | — | |
| `seed` | integer | ✗ | `0` | 0 – 2147483647 | **Seed IS supported here — the only seed-bearing endpoint of the four.** |
| `nsfw_checker` | boolean | ✗ | `false` | — | (Docs schema default is `false`; a marketing page states `true` — schema wins.) |

### Model IDs
- Standard: `"wan/2-7-image"`
- Pro: `"wan/2-7-image-pro"`
Both match live code at [wan_provider.py:35-36](orchestrator/cloud_engines/image_engine/wan_provider.py#L35-L36). No drift.

### Steps / CFG
Not documented for Wan 2.7 either. Like the other three, Kie does not expose step/CFG/guidance knobs.

### Drift report — wan_provider.py vs current docs

Method-by-method against [wan_provider.py](orchestrator/cloud_engines/image_engine/wan_provider.py):

| # | Area | Code state | Docs state (2026-04-23) | Verdict |
|---|------|------------|--------------------------|---------|
| 1 | Endpoint URL `/api/v1/jobs/createTask` | line 188 | matches | ✓ No drift |
| 2 | Polling URL `/api/v1/jobs/recordInfo?taskId=` | line 227-228 | matches | ✓ No drift |
| 3 | Auth `Authorization: Bearer ...` | line 105 | matches | ✓ No drift |
| 4 | Env var `KIE_API_KEY` | line 72 | matches convention | ✓ |
| 5 | Model IDs `wan/2-7-image`, `wan/2-7-image-pro` | lines 35-36 | matches exactly | ✓ |
| 6 | Payload shape `{model, input:{...}}` | lines 88-100 | matches | ✓ |
| 7 | `resolution = "2K" if pro else "1K"` | line 85 | Docs default `2K` for **both**; 4K is Pro-text-to-image only | ⚠ **Behavioral choice, not a break.** Standard model gets `1K` explicitly — valid value but below doc default. Consider whether caller wants `2K` on standard too. Pro: capped at `2K` even though `4K` is available for pure t2i (no `input_urls`). Not a contract break; flag for product decision. |
| 8 | `n: 1` | line 92 | valid range 1–4 | ✓ |
| 9 | `aspect_ratio` passthrough (`16:9`/`9:16`/`1:1`) | line 94 | all three are in enum | ✓ |
| 10 | `watermark: False` | line 95 | default `false` | ✓ (explicit, harmless) |
| 11 | `thinking_mode: False` | line 96 | default `false` | ✓ |
| 12 | `enable_sequential: False` | line 97 | default `false` | ✓ |
| 13 | `seed: 0` | line 98 | default `0`, range 0–2147483647 | ✓ |
| 14 | `nsfw_checker` — **not sent** | — | docs schema default `false`; Wan 2.7 marketing page says `true` | ⚠ Ambiguous upstream. Safer to send explicitly if behavior matters. Not currently a break. |
| 15 | `input_urls` passthrough | lines 101-102 | matches (array, ≤9) | ✓ |
| 16 | `bbox_list` / `color_palette` | not used | optional | ✓ no-op |
| 17 | Submit success parse `data.taskId` | line 199 | matches | ✓ |
| 18 | Poll state check `success` / `fail` | lines 248, 251 | matches (enum: waiting, queuing, generating, success, fail) | ✓ |
| 19 | Failure read `failMsg` then `errorMessage` fallback | lines 253-254 | `failMsg` is current; `errorMessage` is legacy / undocumented | ✓ kept for belt-and-braces |
| 20 | `resultJson` parse to `{"resultUrls":[...]}` | lines 276-286 | matches | ✓ |
| 21 | Fallbacks `data.response.resultUrls`, `data.resultUrls` | lines 291-298 | undocumented but observed historically | ✓ keep |
| 22 | `WAN_MAX_POLL_TIME = 180s` | line 40 | docs recommend 10–15 min timeout | ⚠ Intentional — Wan images are fast. Safe for current model; revisit if reused for slower models. |
| 23 | `WAN_POLL_INTERVAL = 5s` fixed | line 39 | docs recommend exponential backoff starting 2–3s | ⚠ Minor. No correctness impact. |
| 24 | File-upload endpoint `kieai.redpandaai.co/api/file-base64-upload` | lines 158-166 | confirmed alive; 3-day retention | ✓ |
| 25 | Upload response `data.downloadUrl` | line 168 | matches | ✓ |
| 26 | Error-code guard: treats `code ∈ {200, 0, None}` as success | line 195 | current docs specify `200` only; `0` and `None` are legacy tolerance | ✓ safe |
| 27 | No `callBackUrl` usage | — | optional; polling path valid | ✓ design choice |

**Bottom line on wan_provider:** zero contract breaks, zero hard drift. Two product-decision flags (rows 7 and 14) and three "safe but could be tighter" polish items (rows 22, 23, plus considering `nsfw_checker: False` explicit). No code change needed to stay functional.

---

## 5. Feature matrix across the four endpoints

| Feature | Flux 2 Pro t2i | Flux 2 Pro i2i | Z-Image-Turbo | Wan 2.7 (std & pro) |
|---------|----------------|----------------|---------------|----------------------|
| Submit URL | `/jobs/createTask` | `/jobs/createTask` | `/jobs/createTask` | `/jobs/createTask` |
| Poll URL | `/jobs/recordInfo?taskId=` | same | same | same |
| Auth | `Bearer KIE_API_KEY` | same | same | same |
| Model ID | `flux-2/pro-text-to-image` | `flux-2/pro-image-to-image` | `z-image` | `wan/2-7-image` / `wan/2-7-image-pro` |
| Prompt max chars | 5000 | 5000 | **1000** | 5000 |
| Negative prompt | — | — | — | — |
| Reference image | — | `input_urls` array (URL) | — | `input_urls` array (URL, optional) |
| Reference image format | n/a | **URL only** | n/a | **URL only** |
| Strength / denoise | — | — | — | — |
| Aspect ratios | 1:1, 4:3, 3:4, 16:9, 9:16, 3:2, 2:3 | same + `auto` | 1:1, 4:3, 3:4, 16:9, 9:16 | 1:1, 16:9, 4:3, 21:9, 3:4, 9:16, 8:1, 1:8 |
| Resolution tiers | 1K, 2K | 1K, 2K | — (fixed) | 1K, 2K, 4K (4K=Pro-t2i only) |
| 1920×1080 native | — (crop from 2K/16:9) | — (crop from 2K/16:9) | — (crop from native/16:9) | — (crop from 2K/16:9; or 4K-pro-t2i then downscale) |
| Seed | — | — | — | **integer 0–2147483647** |
| Steps / CFG / guidance | — | — | — | — |
| `n` (multi-image) | — | — | — | 1–4 (or 1–12 sequential) |
| NSFW toggle | `nsfw_checker` (default false) | same | same | same (schema false; marketing says true) |
| Callback support | `callBackUrl` | `callBackUrl` | `callBackUrl` | `callBackUrl` |
| Response delivery | URL only | URL only | URL only | URL only |
| Typical completion | not published | not published | not published | ≤60s empirical (180s poll cap) |
| Shared envelope? | **Yes** | **Yes** | **Yes** | **Yes** |

---

## 6. Implementation notes for kie_provider.py (reference only — not implementation)

Mirror the wan_provider shape. One module, one public function per model or one parametrized `render_scene_kie(model_id, …)`. Reuse `_submit_task`, `_poll_task`, `_extract_image_url`, `_download_and_save`, `_upload_for_chaining`, `_err` verbatim (consider hoisting them into a shared `kie_common.py` to avoid import cycles between wan_provider.py and kie_provider.py).

Per-model payload builders:

```text
flux-2/pro-text-to-image:
  input = {prompt, aspect_ratio, resolution, nsfw_checker}

flux-2/pro-image-to-image:
  input = {prompt, input_urls: [url], aspect_ratio, resolution, nsfw_checker}
  — upload local PNG via _upload_for_chaining → downloadUrl → input_urls

z-image:
  input = {prompt[≤1000], aspect_ratio∈{1:1,4:3,3:4,16:9,9:16}, nsfw_checker}
  — no resolution field; native size then PIL resize+crop for 1920×1080

wan/2-7-image[-pro]:
  (already implemented in wan_provider.py — reuse)
```

For 1920×1080 output across all four: request `aspect_ratio="16:9"` and the highest available resolution tier, then run the same PIL conversion at [wan_provider.py:318-327](orchestrator/cloud_engines/image_engine/wan_provider.py#L318-L327) with an added `img.resize((1920,1080), LANCZOS)` (or resize-to-cover-then-center-crop, depending on whether strict 1920×1080 aspect is guaranteed by `16:9`).

---

## 7. Claims NOT verified / flagged for empirical confirmation

1. Native pixel dimensions for `1K` / `2K` / `4K` on Flux 2 and Wan 2.7 — not in docs; confirm on first call and log.
2. Z-Image-Turbo native pixel size — not published; confirm on first call.
3. Wan 2.7 `nsfw_checker` true-vs-false default — docs schema says `false`, marketing page says `true`. Send explicitly to remove ambiguity.
4. Flux 2 Pro t2i `auto` aspect — mentioned in prose but absent from enum. Do not rely on it.
5. Typical completion times for Flux 2 Pro / Z-Image — not published. Current `WAN_MAX_POLL_TIME = 180s` should be fine but monitor first production runs.
6. Whether any of the four endpoints return base64 alongside URLs in `resultJson` — docs show URL-only for all four; spot-check first live response anyway.
