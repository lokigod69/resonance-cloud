# Investigation — Fal.ai Z-Image-Turbo API Contract Reference

Scope: full contract reference for Fal.ai's two Z-Image-Turbo endpoints (t2i and i2i), plus the Fal Python SDK integration pattern for the resonance-cloud FastAPI orchestrator. Companion to [INVESTIGATION_KIE_API_CONTRACT.md](INVESTIGATION_KIE_API_CONTRACT.md) — same structure so the two can be synthesised into a routing decision for Z-Turbo (Fal-only vs. Kie-t2i + Fal-i2i).

Endpoints covered:
1. Z-Image-Turbo — text-to-image (`fal-ai/z-image/turbo`)
2. Z-Image-Turbo — image-to-image (`fal-ai/z-image/turbo/image-to-image`)

Source pages (verified 2026-04-24):
- https://fal.ai/models/fal-ai/z-image/turbo/api
- https://fal.ai/models/fal-ai/z-image/turbo/image-to-image/api
- https://fal.ai/models/fal-ai/z-image/turbo  (pricing / marketing page)
- https://fal.ai/models/fal-ai/z-image/turbo/image-to-image  (pricing / marketing page)
- https://fal.ai/docs/api-reference/client-libraries/python/fal_client  (Python SDK surface)
- https://fal.ai/docs/documentation/model-apis/inference/synchronous  (subscribe pattern)
- https://fal.ai/docs/documentation/development/calling-your-endpoints  (submit / queue pattern)
- https://fal.ai/docs/documentation/model-apis/fal-cdn  (upload + retention)
- https://fal.ai/docs/documentation/model-apis/media-expiration  (per-request expiration)
- https://fal.ai/docs/documentation/model-apis/common-parameters  (`X-Fal-Object-Lifecycle-Preference`)
- https://docs.fal.ai/model-apis/model-endpoints/reliability  (auto-retry behaviour, 429 handling)

---

## 0. Shared envelope — applies to BOTH Z-Turbo endpoints

Like Kie, Fal exposes a single invocation envelope that is model-agnostic. Unlike Kie, there is no "shared polling URL"; each model has its own queue endpoint derived from its model ID. The Fal Python SDK (`fal_client`) abstracts this so callers only ever pass the model ID string.

### 0.1 Auth
- **Env var:** `FAL_KEY` is the documented canonical name; `FAL_API_KEY` is also accepted by the client (the SDK checks both). Use `FAL_KEY` in `.env` files and Railway config for consistency with the docs.
- **Header (raw HTTP):** `Authorization: Key <FAL_KEY>` — note `Key`, **not** `Bearer` (different from Kie).
- **SDK:** reads the env var automatically. No explicit init needed unless you want to override: `fal_client.SyncClient(key="...")` / `fal_client.AsyncClient(key="...")`.

### 0.2 Two transport modes
Fal offers **queue-backed** (recommended — auto-retries on 429) and **direct sync** (no retry). The SDK exposes four entry points per mode:

| SDK call | Mode | Blocking? | Retries on 429? | Use when |
|----------|------|-----------|-----------------|----------|
| `fal_client.run(model, args)` | Direct sync | Blocks | **No** | Short-lived, you want fast-fail |
| `fal_client.subscribe(model, args)` | Queue, poll-to-result | Blocks | Yes (≤10×, backoff) | Simple blocking wait |
| `fal_client.submit(model, args) → handle` | Queue, fire-and-forget | Non-blocking | Yes | Poll later / webhook |
| `fal_client.run_async / subscribe_async / submit_async` | Same but `await`able | Non-blocking | Same | **Use from FastAPI** |

**FastAPI guidance:** use `fal_client.subscribe_async` (simplest) or `submit_async` + poll. The sync variants block the event loop — if you must use them, wrap in `asyncio.to_thread(...)`. See §5 for the concrete pattern.

### 0.3 Raw HTTP endpoints (for reference — usually not called directly)
- **Queue submit:** `POST https://queue.fal.run/<model-id>` → `{ "request_id": "<uuid>" }`
- **Queue status:** `GET https://queue.fal.run/<model-id>/requests/<request_id>/status` → `{"status":"IN_QUEUE"|"IN_PROGRESS"|"COMPLETED", ...}`
- **Queue result:** `GET https://queue.fal.run/<model-id>/requests/<request_id>` → full response body
- **Direct sync:** `POST https://fal.run/<model-id>` (no queue, no retry)
- **Cancel:** `PUT https://queue.fal.run/<model-id>/requests/<request_id>/cancel`
- All require `Authorization: Key <FAL_KEY>`.

### 0.4 Webhooks (alternative to polling)
Pass `webhook_url="https://..."` to `submit()` / `submit_async()`. Fal POSTs the full result JSON to that URL on completion. Webhook signatures are documented but optional — verify only if the endpoint is public.

### 0.5 CDN & output URLs
- Generated images are returned as URLs on `https://v3.fal.media/files/<repo>/<id>.<ext>`.
- **Default retention:** not explicitly stated, but files are **not** short-lived by default (no 24h expiry like Kie). They can be configured per-request via header `X-Fal-Object-Lifecycle-Preference: {"expiration_duration_seconds": <int | null>}`. Passing `null` means "no expiration". For resonance-cloud, download-and-save immediately after the call (the existing pattern in `wan_provider.py`) and don't rely on CDN longevity.
- User-uploaded inputs (§0.6) and generated outputs are **public URLs** — anyone with the URL can fetch. Do not upload secret content.

### 0.6 File upload (for i2i reference images that aren't already public URLs)
- **Endpoint (raw):** `POST https://rest.alpha.fal.ai/storage/upload/initiate` (multi-step; SDK hides this — use the SDK).
- **SDK sync:** `fal_client.upload_file(path)` → URL | `fal_client.upload(bytes, content_type)` → URL | `fal_client.upload_image(PIL.Image, format="jpeg")` → URL
- **SDK async:** `fal_client.upload_file_async(path)` | `fal_client.upload_async(bytes, content_type)` — all three have async variants. Use these from FastAPI.
- **Accepted inputs:** local filesystem path, raw `bytes`, a `str` (base64/data URI), a PIL image.
- **Does NOT accept a pre-existing HTTP URL for re-hosting** — if you have a URL, either (a) pass it directly as `image_url` (Fal fetches it server-side) or (b) download the bytes yourself and call `upload`.
- **Auto-upload behaviour:** the SDK does **not** auto-upload local paths embedded in `arguments`. You must upload first, then pass the returned URL as `image_url`. (Contrast: some Fal JS helpers auto-upload; the Python SDK requires explicit upload.)
- **Size limits:** not published on the docs page. Practical ceiling is ~100 MB per file.
- **Repositories:** optional `repository` kwarg — `"fal_v3"` (default, newest), `"cdn"`, `"fal"` (legacy). Default is fine.

### 0.7 Auto-retry & rate limits
- **429 handling:** queue-backed requests (`subscribe`, `submit`) are **auto-retried up to 10 times with intelligent backoff** — this is a Fal platform guarantee, not client-side logic.
- **Direct `run()` does NOT auto-retry** — a 429 surfaces as an exception immediately.
- **`start_timeout` kwarg:** caps total time a request can wait (including retries). Default unlimited; set this to avoid hung requests.
- **Hard rate limits:** not published as RPM/RPS numbers. Limits scale with account tier; the queue smooths bursts.
- **Concurrency:** not documented; observed ceiling is high enough that resonance-cloud workloads won't hit it.

### 0.8 Exceptions raised by the SDK
The `fal_client` SDK builds on `httpx`. The documented/exported exception surface:
- **`fal_client.FalClientError`** — base class for SDK-raised errors
- **`httpx.HTTPStatusError`** — raised for non-2xx HTTP responses. Inspect `.response.status_code`:
  - `401` → bad / missing `FAL_KEY`
  - `403` → insufficient credits or suspended account
  - `422` → validation error on payload (bad enum, missing required field)
  - `429` → rate limit (queue mode auto-retries; direct mode surfaces)
  - `5xx` → upstream Fal infrastructure error
- **`httpx.TimeoutException`** — raised when `timeout` / `start_timeout` / `client_timeout` elapses
- **`asyncio.CancelledError`** — async client passes through cooperative cancellation
- **Application-level failures** (model crashed, NSFW rejection surfaced as an error): raised as `FalClientError` with a message from the queue.

No dedicated `AuthenticationError` / `RateLimitError` subclasses are exposed — branch on `.response.status_code` inside an `except httpx.HTTPStatusError` block.

---

## 1. Z-Image-Turbo — Text-to-Image

Docs: https://fal.ai/models/fal-ai/z-image/turbo/api

### Model ID
`"fal-ai/z-image/turbo"` — literal string, passed as the first positional arg to `fal_client.subscribe` / `run` / `submit`.

### Request schema (`arguments` dict)

| Field | Type | Req | Default | Allowed / range | Notes |
|-------|------|-----|---------|-----------------|-------|
| `prompt` | string | ✓ | — | length not documented | Tongyi-MAI 6B model; CN+EN both supported |
| `image_size` | enum string OR `{width, height}` | ✗ | `"landscape_4_3"` | Enum: `square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`. Custom: `{"width": int, "height": int}` where both are multiples of 16, max edge 3840, total MP ∈ [0.66, 4.0] on Z-Turbo (platform-wide max is 8.3, Z-Turbo caps at 4) | |
| `num_inference_steps` | integer | ✗ | `8` | Range not published; practical 1–16 | Fixed low-step "turbo" inference; exposed but defaults are optimal |
| `seed` | integer | ✗ | — (randomised if omitted) | any int | Same prompt + seed = same image |
| `num_images` | integer | ✗ | `1` | 1–4 (based on pricing-page "Up to 4 images") | |
| `sync_mode` | boolean | ✗ | `false` | — | When `true`, response returns data URI (base64) instead of a URL. Otherwise URL only. |
| `enable_safety_checker` | boolean | ✗ | `true` | — | |
| `output_format` | enum string | ✗ | `"png"` | `"jpeg"`, `"png"`, `"webp"` | |
| `acceleration` | enum string | ✗ | `"regular"` | `"none"`, `"regular"`, `"high"` | Tradeoff between latency and quality; `regular` is the default sweet spot |
| `enable_prompt_expansion` | boolean | ✗ | `false` | — | Adds a prompt-rewrite step. **Costs +$0.0025 per request.** |

**NOT in the schema (verified absent):**
- `negative_prompt` — not exposed by Z-Turbo on Fal. Bake negations into `prompt`.
- `guidance_scale` / `cfg` — not exposed. Z-Image-Turbo's upstream model runs CFG-free by design ("CFG=0" in the Tongyi paper); there is nothing to set.
- `width` / `height` (as top-level fields) — must be passed via `image_size: {width, height}`.
- `prompt max length` — no explicit cap documented (contrast Kie's 1000-char cap). Practical ceiling is the upstream model's token limit.

### Response schema

```json
{
  "images": [
    {
      "url": "https://v3.fal.media/files/.../image.png",
      "content_type": "image/png",
      "file_name": "output.png",
      "file_size": 123456,
      "width": 1024,
      "height": 576
    }
  ],
  "timings": { "inference": 0.42 },
  "seed": 1234567890,
  "has_nsfw_concepts": [false],
  "prompt": "<echo of input prompt, possibly expanded if enable_prompt_expansion=true>"
}
```

- **Delivery:** URL by default; **base64 data URI if `sync_mode=true`** (image is embedded directly in `images[0].url` as `data:image/png;base64,...`). This is the only way to get base64 from Fal without a separate download.
- **Dimensions:** echoed back in `images[i].width` / `.height`.
- **Seed:** always echoed (even when omitted — Fal fills in the random value it used).

### Native resolutions — image_size enum mappings

Fal does not publish per-model pixel mappings, but the standard platform-wide mappings (verified in the response example on the docs page, which shows `landscape_4_3` → 1024×768) are:

| image_size | Pixels | MP | Price @ $0.005/MP |
|------------|--------|-----|-------------------|
| `square_hd` | 1024×1024 | 1.05 | $0.00524 |
| `square` | 512×512 | 0.26 | $0.00131 |
| `portrait_4_3` | 768×1024 | 0.79 | $0.00393 |
| `portrait_16_9` | 576×1024 | 0.59 | $0.00295 |
| `landscape_4_3` | 1024×768 | 0.79 | $0.00393 |
| `landscape_16_9` | 1024×576 | 0.59 | $0.00295 |

- **1920×1080 support:** NOT a named preset. Achievable via `image_size: {"width": 1920, "height": 1080}` (both multiples of 16 ✓, within 4MP cap at 2.07MP ✓). **Cost at that size: ~$0.0104 per image.**
- **Max resolution:** Z-Turbo caps at **4 MP** output (platform-wide max is 8.3 MP, Z-Turbo is the stricter constraint). 1920×1080 (2.07 MP) is comfortably inside this.

### Pricing
- **$0.005 per megapixel** (output).
- **Commercial use: permitted** (stated on model page).
- Prompt expansion: +$0.0025/request (flat).
- No free tier; pay-as-you-go from account credits.
- At `landscape_16_9` (1024×576): **~$0.003/image**
- At `square_hd` (1024×1024): **~$0.005/image**
- At custom 1920×1080: **~$0.010/image**

### Rate limits
- No published RPM/RPS numbers.
- 429s are auto-retried ≤10× with backoff on queue-backed calls.
- Hard concurrency ceiling scales with account tier.

### Z-Image-Turbo–specific quirks
1. **CFG-free inference**: no `guidance_scale` field exists because the model runs at CFG=0 by design. Do not try to pass it — the API will reject with a 422.
2. **No negative prompt**: not exposed; fold negations into the main prompt.
3. **Step count is exposed but should usually be left at 8**: Turbo was trained for few-step inference; higher counts don't reliably improve quality.
4. **`enable_prompt_expansion` rewrites the prompt** using an LLM before generation. When set, the `prompt` field in the response echoes the *expanded* prompt. Log it if you want determinism for re-runs.
5. **`acceleration="high"` may silently reduce quality** — fastest but trades off against visual fidelity. Default `"regular"` is the safe pick.
6. **`sync_mode=true` forces base64 delivery** — useful for short-lived use (avoid a second HTTP hop to fetch the URL) but balloons response payload. Current resonance-cloud pattern (download-then-save) argues for `sync_mode=false` + separate fetch.

---

## 2. Z-Image-Turbo — Image-to-Image

Docs: https://fal.ai/models/fal-ai/z-image/turbo/image-to-image/api

### Model ID
`"fal-ai/z-image/turbo/image-to-image"` — distinct from the t2i endpoint; pass this exact string to the SDK.

(Note: a third sibling exists, `fal-ai/z-image/turbo/image-to-image/lora`, which adds LoRA support. Out of scope for this investigation but worth knowing.)

### Request schema (`arguments` dict)

| Field | Type | Req | Default | Allowed / range | Notes |
|-------|------|-----|---------|-----------------|-------|
| `prompt` | string | ✓ | — | length not documented | |
| `image_url` | string | ✓ | — | public HTTPS URL, OR base64 data URI (`data:image/...;base64,...`) | **The ONE reference-image field. No `start_image`/`end_image` distinction.** |
| `image_size` | enum string OR `{width, height}` | ✗ | **`"auto"`** | Same enum as t2i + `"auto"` (matches input aspect). Custom dims must be multiples of 16. | Default differs from t2i — here `"auto"` means "preserve input ratio". |
| `strength` | float | ✗ | **`0.6`** | Range not explicitly stated; de-facto 0.0–1.0 (0 = output = input; 1 = fully rewritten per prompt) | **This is the denoise / conditioning knob.** Lower = closer to input, higher = more creative. |
| `num_inference_steps` | integer | ✗ | `8` | — | Same turbo constraints as t2i |
| `seed` | integer | ✗ | — | any int | |
| `num_images` | integer | ✗ | `1` | 1–4 | |
| `sync_mode` | boolean | ✗ | `false` | — | Returns data URI when `true` |
| `enable_safety_checker` | boolean | ✗ | `true` | — | |
| `output_format` | enum string | ✗ | `"png"` | `"jpeg"`, `"png"`, `"webp"` | |
| `acceleration` | enum string | ✗ | `"regular"` | `"none"`, `"regular"`, `"high"` | |
| `enable_prompt_expansion` | boolean | ✗ | `false` | — | +$0.0025/request |

**NOT in the schema:**
- `negative_prompt` — not exposed
- `guidance_scale` / `cfg` — not exposed (same CFG=0 architecture)
- `start_image` / `end_image` — no such distinction; single `image_url` field only
- `init_image` / `source_image` — Fal calls the field `image_url`; aliases are not accepted

### Reference image — critical details

- **Field name:** `image_url` (singular; contrast Kie's `input_urls` which is an array).
- **Accepted formats:**
  - **Public HTTPS URL** — Fal fetches server-side. Recommended for images you already host.
  - **Base64 data URI** — embed directly as `"data:image/png;base64,..."`. Works but inflates request size. Practical ceiling ~10 MB.
  - **Multipart / raw binary upload**: NOT accepted on this endpoint. If you have bytes, either base64-encode or upload via `fal_client.upload_file` / `upload_bytes` first (§0.6) and pass the returned URL.
- **Only one reference image** — multi-image editing requires a different endpoint.
- **Strength semantics:** `strength=0.6` default means "about 60% rewritten, 40% preserved" — tuned for creative i2i. For subtle edits try 0.3–0.5; for full reinterpretation try 0.8–0.95.

### Response schema

Identical to t2i (§1):
```json
{
  "images": [{ "url": "...", "width": 1024, "height": 576, "content_type": "...", "file_name": "...", "file_size": 0 }],
  "timings": { "inference": 0.5 },
  "seed": 42,
  "has_nsfw_concepts": [false],
  "prompt": "..."
}
```

### Native resolutions
Same `image_size` enum as t2i with identical pixel mappings. Default `"auto"` means "match the input image's aspect ratio at a sensible native resolution" — usually ≤1 MP. For 1920×1080 specifically, **always pass `image_size: {"width": 1920, "height": 1080}` explicitly** — don't rely on `"auto"` unless the input is already 16:9 at ≥1920×1080.

### Pricing
Same as t2i: **$0.005/MP**, commercial use permitted, +$0.0025/request for prompt expansion.

### Rate limits
Same shared platform behaviour (§0.7).

### Z-Image-Turbo i2i quirks
1. **`strength=0.6` is a notably high default** — i2i outputs diverge substantially from the input unless you lower it. For "subtle refinement" product flows, always override to `0.3–0.5`.
2. **`image_size="auto"` can surprise** — if the input is 16:9 but Fal outputs at its native ~1 MP, you'll get ~1344×752, not 1920×1080. Always explicitly set `image_size` when you need exact dimensions downstream.
3. **Base64 inline input works but is inefficient** — for images ≳1 MB, upload first and pass URL.
4. **Same CFG-free / no-negative-prompt / turbo-step constraints as t2i.**

---

## 3. Fal Python SDK (`fal_client`) — integration reference

### Install
```bash
pip install fal-client
```
Add to `requirements.txt`:
```
fal-client>=0.4.0
```

### Authentication
```python
# Canonical env var (used by SDK automatically)
export FAL_KEY="<your-api-key>"

# Alternative, also recognised by the SDK
export FAL_API_KEY="<your-api-key>"
```

For Railway deployment, set `FAL_KEY` in the project's environment variables (same mechanism as `KIE_API_KEY` in `wan_provider.py:72`).

In code, the SDK picks this up automatically — no explicit init needed:
```python
import fal_client
# fal_client is ready to use; reads FAL_KEY from env
```

Explicit client construction (only if overriding key, or using `AsyncClient`):
```python
client = fal_client.SyncClient(key="...", default_timeout=120.0)
async_client = fal_client.AsyncClient(key="...", default_timeout=120.0)
```

### Public API surface (module-level functions mirror `SyncClient` methods; `*_async` variants mirror `AsyncClient`)

```python
# Direct sync inference (no queue, no auto-retry)
fal_client.run(application: str, arguments: dict, *, path: str = "",
               timeout: float | None = None, start_timeout: float | None = None,
               hint: str | None = None, headers: dict = {}) -> dict

# Queue-backed, blocks until done (recommended for sync flows; auto-retries)
fal_client.subscribe(application: str, arguments: dict, *, path: str = "",
                     hint: str | None = None, with_logs: bool = False,
                     on_enqueue: Callable[[str], None] | None = None,
                     on_queue_update: Callable[[Status], None] | None = None,
                     priority: Literal["normal", "low"] | None = None,
                     headers: dict = {}, start_timeout: float | None = None,
                     client_timeout: float | None = None) -> dict

# Queue-backed, returns handle for later polling / webhook
fal_client.submit(application: str, arguments: dict, *, path: str = "",
                  hint: str | None = None, webhook_url: str | None = None,
                  priority: Literal["normal", "low"] | None = None,
                  headers: dict = {}, start_timeout: float | None = None) -> SyncRequestHandle

# Async equivalents (preferred from FastAPI)
fal_client.run_async(...)       -> Coroutine[..., dict]
fal_client.subscribe_async(...) -> Coroutine[..., dict]
fal_client.submit_async(...)    -> Coroutine[..., AsyncRequestHandle]

# Polling / result retrieval on a handle
handle.status(*, with_logs: bool = False) -> Status   # Queued | InProgress | Completed
handle.get() -> dict                                  # blocks until Completed
handle.cancel() -> None
handle.iter_events(*, with_logs: bool = False, interval: float = 0.1) -> Iterator[Status]

# File upload (all have async variants — *_async suffix)
fal_client.upload_file(path: PathLike, *, repository=None, fallback_repository=None) -> str
fal_client.upload(data: str | bytes, content_type: str, file_name: str | None = None, ...) -> str
fal_client.upload_image(image: PIL.Image.Image, format: str = "jpeg", ...) -> str
```

### Status discriminated union
```python
fal_client.Queued(position: int)        # in queue
fal_client.InProgress(logs: list | None) # generating
fal_client.Completed(logs, metrics)     # done
```
Match with `isinstance(status, fal_client.Completed)`.

### FastAPI integration — recommended pattern

Fal's sync functions (`run`, `subscribe`, `submit`, `upload_file`) use blocking `httpx.Client`. From an `async def` FastAPI route, they would block the event loop. **Three options**, in order of preference:

**1. (Preferred) Use async variants directly — native non-blocking**
```python
from fastapi import FastAPI
import fal_client

app = FastAPI()

@app.post("/generate")
async def generate(prompt: str):
    # No thread-offload needed — AsyncClient uses httpx.AsyncClient internally
    result = await fal_client.subscribe_async(
        "fal-ai/z-image/turbo",
        arguments={"prompt": prompt, "image_size": {"width": 1920, "height": 1080}},
    )
    return {"url": result["images"][0]["url"]}
```

**2. Wrap sync calls with `asyncio.to_thread` — legacy / bridging**
```python
import asyncio, fal_client

@app.post("/generate")
async def generate(prompt: str):
    result = await asyncio.to_thread(
        fal_client.subscribe,
        "fal-ai/z-image/turbo",
        {"prompt": prompt},
    )
    return result
```
Use this only if you're bridging existing sync code that you can't easily convert. `asyncio.to_thread` requires Python ≥3.9 (resonance-cloud runs on 3.11+, so fine).

**3. Webhook mode (fire-and-forget)**
```python
handle = await fal_client.submit_async(
    "fal-ai/z-image/turbo",
    {"prompt": prompt},
    webhook_url="https://your-app.railway.app/api/fal-webhook",
)
return {"request_id": handle.request_id}
```
Reserve for jobs where the HTTP request that triggers generation shouldn't wait for the result (long videos, batch work).

### File upload — recommended pattern for i2i

```python
# Case A: caller already has a public URL
args = {"prompt": p, "image_url": "https://.../input.png"}

# Case B: caller has local bytes (e.g. a previously generated PIL image → PNG bytes)
url = await fal_client.upload_async(png_bytes, "image/png")
args = {"prompt": p, "image_url": url}

# Case C: caller has a local filesystem path
url = await fal_client.upload_file_async("/tmp/ref.png")
args = {"prompt": p, "image_url": url}

# Then:
result = await fal_client.subscribe_async(
    "fal-ai/z-image/turbo/image-to-image", arguments=args
)
```

**Upload quirks:**
- Uploaded files are **public URLs** on `v3.fal.media`. Don't upload sensitive imagery.
- Default retention is not short-term (unlike Kie's 3-day expiry), but it is not guaranteed indefinite either — download outputs immediately.
- To force expiration on *generated* outputs, pass `headers={"X-Fal-Object-Lifecycle-Preference": '{"expiration_duration_seconds": 3600}'}` to the `subscribe`/`submit` call.

### Error handling pattern

```python
import httpx, fal_client

try:
    result = await fal_client.subscribe_async(
        "fal-ai/z-image/turbo", arguments={"prompt": "..."},
        start_timeout=60, client_timeout=180,
    )
except httpx.HTTPStatusError as e:
    status = e.response.status_code
    if status == 401:   raise FalAuthError("bad FAL_KEY")
    if status == 403:   raise FalBillingError("credits exhausted")
    if status == 422:   raise FalValidationError(e.response.json())
    if status == 429:   raise FalRateLimitError("unexpected — queue mode should have retried")
    raise FalUpstreamError(status)
except httpx.TimeoutException:
    raise FalTimeoutError("timed out")
except fal_client.FalClientError as e:
    raise FalClientError(str(e))   # application-level (model crashed etc.)
```

### Minimal runnable examples

**t2i — minimal:**
```python
import os
import fal_client

os.environ.setdefault("FAL_KEY", "<your-key>")

result = fal_client.subscribe(
    "fal-ai/z-image/turbo",
    arguments={
        "prompt": "A cinematic 16:9 landscape of a misty pine forest at dawn",
        "image_size": {"width": 1920, "height": 1080},
        "num_inference_steps": 8,
        "num_images": 1,
        "enable_safety_checker": True,
        "output_format": "png",
    },
)
print(result["images"][0]["url"])
```

**i2i — minimal:**
```python
import os
import fal_client

os.environ.setdefault("FAL_KEY", "<your-key>")

# Either: pass an existing public URL...
image_url = "https://storage.googleapis.com/falserverless/example_inputs/z-image-turbo-i2i-input.png"

# ...or upload local bytes first:
# with open("ref.png", "rb") as f:
#     image_url = fal_client.upload(f.read(), "image/png")

result = fal_client.subscribe(
    "fal-ai/z-image/turbo/image-to-image",
    arguments={
        "prompt": "repaint in the style of a Studio Ghibli watercolour",
        "image_url": image_url,
        "strength": 0.55,
        "image_size": {"width": 1920, "height": 1080},
        "num_inference_steps": 8,
        "output_format": "png",
    },
)
print(result["images"][0]["url"])
```

---

## 4. Comparison — Fal Z-Turbo vs. Kie Z-Image

Decision input for Synthesis A. Both hosts run the same Tongyi-MAI Z-Image-Turbo 6B weights, but the provider surface around them diverges significantly.

| Dimension | Fal `fal-ai/z-image/turbo` (t2i) | Fal `fal-ai/z-image/turbo/image-to-image` | Kie `z-image` (t2i only) |
|-----------|----------------------------------|-------------------------------------------|--------------------------|
| **i2i available?** | n/a | **✓** | **✗** (Kie Z-Image is t2i-only) |
| **Transport** | Queue / direct / async (SDK) | Queue / direct / async (SDK) | Queue only (submit → poll via shared Market envelope) |
| **Auth header** | `Authorization: Key <FAL_KEY>` | same | `Authorization: Bearer <KIE_API_KEY>` |
| **Env var** | `FAL_KEY` (or `FAL_API_KEY`) | same | `KIE_API_KEY` |
| **SDK** | Official `fal-client` (Python, sync+async) | same | No official SDK — httpx calls hand-rolled in `wan_provider.py` |
| **Request body shape** | Flat `arguments` dict passed to `subscribe(model, arguments)` | same | Wrapped: `{model, input: {...}}` |
| **Prompt max length** | **Not published** (upstream model token limit applies) | same | **1000 chars** (enforced) |
| **Aspect ratios** | Via `image_size` enum (`square_hd`, `square`, `portrait_4_3`, `portrait_16_9`, `landscape_4_3`, `landscape_16_9`) OR custom `{w, h}` (multiples of 16) | Same + `"auto"` | Enum only: `1:1`, `4:3`, `3:4`, `16:9`, `9:16` — no custom pixel dims |
| **1920×1080 native** | **✓** via `image_size: {width:1920, height:1080}` (exact) | **✓** same | **✗** — no pixel-dimension control; must request `16:9` at native size and resize+crop downstream |
| **Max resolution** | **4 MP** (Z-Turbo cap) | same | Not published — observed ~1 MP native |
| **Reference image field** | n/a | `image_url` (singular string) | `input_urls` (array, even for single) — i2i endpoint doesn't exist on Kie for Z-Image |
| **Reference image format** | n/a | URL **or** base64 data URI | URL only (must pre-upload local bytes via separate CDN call) |
| **Strength/denoise** | n/a | **`strength` (default 0.6)** | n/a (no i2i) |
| **Seed** | ✓ (int, echoed in response) | ✓ | **✗** (not exposed) |
| **Steps** | ✓ (`num_inference_steps`, default 8) | ✓ | **✗** (fixed server-side) |
| **CFG / guidance_scale** | **✗** (CFG=0 architecture; field doesn't exist) | **✗** same | **✗** same |
| **Negative prompt** | **✗** | **✗** | **✗** |
| **num_images** | ✓ 1–4 | ✓ 1–4 | **✗** (one per call) |
| **Response delivery** | URL by default; **base64 data URI if `sync_mode=true`** | same | URL only |
| **Response dimensions echoed?** | ✓ `width`/`height` per image | ✓ | ✓ (via downstream fetch, not in envelope) |
| **Pricing @ 1024×1024** | **~$0.005** | **~$0.005** | **~$0.004** flat per image |
| **Pricing @ landscape_16_9 (1024×576)** | **~$0.003** | **~$0.003** | **~$0.004** |
| **Pricing @ 1920×1080** | **~$0.010** | **~$0.010** | **not natively supported** |
| **Pricing model** | Per megapixel ($0.005/MP) | same | Flat per call |
| **Rate limits (published)** | None published; 429s auto-retried ≤10× on queue | same | Only abstract (codes 429, 433) |
| **Auto-retry on 429?** | **✓** (queue mode, platform-managed) | same | **✗** (client-side only) |
| **Webhook** | `webhook_url` kwarg | same | `callBackUrl` in body |
| **Typical completion** | ~1–3 s (turbo, few-step) | ~1–3 s | not published, sub-minute empirical |
| **Output retention** | Configurable header; default ≈long-lived | same | 24 h on Kie CDN |

### Bottom-line implications (for Synthesis A to act on, not for this document to decide)

1. **Z-Turbo i2i is Fal-only.** Kie does not ship a Z-Image i2i endpoint. If the product needs Z-Turbo i2i at all, Fal is the only path.
2. **At landscape_16_9 / ~1 MP scenes, Kie is cheaper ($0.004 vs $0.003 on Fal — Kie loses here, actually).** Correction: at low MP, **Fal is cheaper per image**. Kie's flat $0.004/call is cheaper only when you'd otherwise be rendering > 0.8 MP on Fal.
3. **At 1920×1080, Fal is ~$0.010 vs. Kie's $0.004 + downstream resize+crop** — Kie is cheaper, but requires post-processing and may not hit exactly 1920×1080 without quality loss.
4. **Fal exposes knobs Kie hides** (seed, steps, num_images, custom dims, sync_mode/base64, strength on i2i). If any of those matter for the product, Fal wins on flexibility.
5. **Fal is more FastAPI-idiomatic** — native async client, proper exception types, platform-managed 429 retry.
6. **Kie is more unified** — one envelope across 4 models (Flux 2, Z-Image, Wan 2.7 std/pro) which makes a single `kie_provider.py` straightforward.
7. **Pricing axis is non-trivial at scale** — 100k images/month at 1920×1080 is $1,000 on Fal vs. $400 on Kie (assuming Kie's flat price scales and its ~1 MP output meets the product quality bar after resize+crop).

---

## 5. Claims NOT verified / flagged for empirical confirmation

1. **Exact pixel mapping of `image_size` enum on Z-Turbo** — the 1024×768 for `landscape_4_3` is confirmed (response example on the t2i docs page). Other enum values follow the platform-wide Fal convention (landscape_16_9 = 1024×576) but are inferred, not quoted in the Z-Turbo docs. Confirm on first call.
2. **`prompt` maximum length on Z-Turbo (Fal)** — not published. Practical ceiling is the upstream model's token limit. Kie enforces 1000 chars explicitly; Fal does not appear to.
3. **`num_inference_steps` allowed range** — default 8, but min/max not stated. Empirical: 1–16 is safe.
4. **`strength` exact range** — docs show default 0.6 but no explicit [min, max]. 0.0–1.0 is the universal convention.
5. **Upload size limits** — not documented for the Python SDK upload endpoint. Practical ceiling ~100 MB based on platform norms.
6. **Default CDN retention duration** — docs describe per-request override (`X-Fal-Object-Lifecycle-Preference`) but do not state the account-default value. Treat outputs as long-lived but download-and-save on receipt.
7. **Exact exception subclasses beyond `FalClientError`** — the SDK leans on `httpx` exception types; the docs do not enumerate a `FalAuthError`/`FalRateLimitError`. Branch on `response.status_code` instead of on subclass.
8. **Rate-limit numbers (RPM/RPS)** — not published; scales with account tier. Empirical observation needed for load planning.
9. **Whether `num_images > 1` multiplies cost linearly vs. batch-discounted** — pricing says "$0.005/MP" and response returns N images; implied linear scaling but not explicitly confirmed.
10. **Behaviour of `image_size="auto"` on i2i** — docs say "match input" but no statement of the resolution it normalises to. Empirical test needed.
