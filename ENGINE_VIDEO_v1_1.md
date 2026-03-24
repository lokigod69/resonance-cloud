# ENGINE_VIDEO.md — Video Engine Abstract

**Version:** 1.1
**Status:** Abstract updated with confirmed API parameters — ready for development
**Date:** March 4, 2026
**Changelog v1.1:** Corrected LTX endpoint and parameters from confirmed Fal.ai API docs. LTX uses `num_frames` (not `duration`), 480p/720p resolution (not 1080p+), endpoint is `fal-ai/ltx-video-13b-distilled/image-to-video`. Confirmed Kling uses `duration` string enum "5"/"10". Ken Burns clarified as a primary mode (not just fallback) for short-duration songs.
**Parent Document:** MASTER_ABSTRACT.md v1.0
**Pipeline Stage:** Stage 4 (Video Generation)
**Purpose:** This document defines what the Video Engine does, what it accepts, what it produces, how it works internally, and what settings it exposes. Any agent building or modifying this engine reads this document alongside the Master Abstract.

---

## 1. Engine Purpose

The Video Engine is the fourth stage of the Resonance pipeline. It takes still images produced by the Image Engine (Stage 3) and transforms them into video clips — either through simple FFMPEG-based Ken Burns animation or through AI video generation via cloud APIs.

This is the simplest engine in the pipeline. It makes **no creative decisions**. The Image Engine (Stage 3) already defined what each scene looks like, what motion to apply, and wrote both a structured `camera_motion` object (for Ken Burns) and a natural language `video_prompt` (for AI video). The Video Engine is a pure executor — it reads those instructions and routes them to the appropriate backend.

The engine operates in one of three modes per call:

1. **Ken Burns (FFMPEG)** — Free, local, instant. Applies pan/zoom animation to a still image using FFMPEG. Uses the `camera_motion` object from the storyboard. **This is a primary mode, not just a fallback** — it is the right choice for short-duration songs (5–15 seconds total) where the clip will be held or looped, and where preserving embedded text in the image is critical (no AI distortion risk).

2. **LTX Distilled (Cloud API via Fal.ai)** — The default AI video mode. Image-to-video generation using Lightricks' LTX-Video 0.9.7 13B Distilled model. Uses the `video_prompt` from the storyboard. ~$0.20/video flat rate. Max ~5.4 seconds per clip.

3. **Kling (Cloud API via Fal.ai)** — Premium AI video option. Higher quality motion at higher cost. Uses the same `video_prompt` from the storyboard. Confirmed 5s or 10s only. Cost: $0.28–$0.49 for 5s depending on tier.

All three modes produce the same output: an MP4 video clip file + generation-meta.json.

### 1.1 Why Cloud APIs Instead of Local Generation

The Resonance pipeline is designed for batch processing — generating content for hundreds of words. A single word with 3 images at 5 seconds each takes ~75 seconds of local GPU time on an RTX 5090. For 100 words, that's over 6 hours of sequential GPU time just for video generation, and the GPU is also needed for Ace-Step (Song Engine).

Cloud APIs solve this: requests run in parallel on remote infrastructure, generation is fast (~10-30 seconds per clip), and costs are predictable ($0.04–$0.06/second for LTX-2). For a 100-word batch with 3 clips each at 5 seconds, the total cost is approximately $60-90 — reasonable for a production pipeline.

The Ken Burns mode exists as a free fallback for testing, budget runs, and cases where subtle camera motion on a still image is sufficient.

### 1.2 What This Engine Is NOT

- It is NOT the Image Engine. It does not generate images or decide what scenes look like.
- It is NOT the Assembly Engine. It does not stitch clips together, align video to audio, or produce final output.
- It is NOT the Concept Engine. It does not generate prompts or creative direction.
- It is NOT the orchestrator. It does not read CSVs, create folders, or manage manifests.
- It does not handle settings inheritance, version selection, or workspace management. The orchestrator handles all of that.

---

## 2. Engine Contract Compliance

This engine follows the engine contract defined in Master Abstract Section 8.

### 2.1 Input

The engine receives a single payload per scene. The orchestrator calls the Video Engine once per image in the storyboard. If an image set has 3 images, the orchestrator makes 3 separate Video Engine calls (or batches them — see Section 10).

```json
{
  "content": {
    "image_path": "/path/to/workspace/verzweiflung/images/editorial-series_20260301T120000/001.png",
    "video_prompt": "A lone figure stands motionless beneath a vast concrete overpass at dusk. Rain falls gently. Camera slowly pushes forward, revealing spray-painted text on the wall. Wet pavement reflects amber streetlights. Atmospheric, cinematic, melancholic.",
    "camera_motion": {
      "type": "slow_zoom_in",
      "direction": "toward the figure",
      "speed": "very_slow",
      "description": "Slow push toward the figure, gradually revealing the graffiti text"
    },
    "scene_number": 1
  },
  "settings": {
    "video_mode": "ltx",
    "duration": 5,
    "resolution": "1080p",
    "fps": 25,
    "generate_audio": false,
    "negative_prompt": "worst quality, inconsistent motion, blurry, jittery, distorted",
    "seed": -1
  },
  "output_dir": "/path/to/workspace/verzweiflung/video/editorial-series_20260301T130000/",
  "metadata": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation",
    "timestamp": "2026-03-01T13:00:00Z",
    "image_version": "editorial-series_20260301T120000",
    "scene_number": 1
  }
}
```

**Key points about the input:**

- `content.image_path` is the absolute path to the source PNG from the Image Engine. For cloud API modes, the engine uploads this image to Fal.ai storage and receives a URL. For Ken Burns mode, it reads the file directly.
- `content.video_prompt` is the natural language video description generated by the Image Engine's storyboard LLM. This is passed directly to LTX-2 or Kling as the generation prompt. It is NOT used by Ken Burns mode.
- `content.camera_motion` is the structured motion object from the storyboard. This is used ONLY by Ken Burns mode. It is ignored by LTX-2 and Kling modes.
- `content.scene_number` identifies which scene from the storyboard this call corresponds to. Used for output file naming.
- `settings` is the fully merged settings object (batch defaults + per-word overrides, resolved by the orchestrator). The engine does not perform any settings inheritance.
- `output_dir` is pre-created by the orchestrator. The engine writes output files here.
- `metadata` provides context for generation-meta.json. The `image_version` field records which image set was used as input, enabling lineage tracking.

### 2.2 Output

The engine writes a single video clip and generation metadata to the `output_dir`:

**Files written:**
```
editorial-series_20260301T130000/
├── scene_001.mp4
├── scene_001_thumb.jpg
├── scene_002.mp4
├── scene_002_thumb.jpg
├── scene_003.mp4
├── scene_003_thumb.jpg
└── generation-meta.json
```

Note: Each scene is a separate engine call, but all scenes for one image set write to the same output_dir. The generation-meta.json is written/updated with each call. A thumbnail (first frame of the clip, saved as JPEG) is always generated alongside each MP4 for orchestrator preview.

**Return value:**
```json
{
  "status": "success",
  "output_paths": ["scene_001.mp4", "scene_001_thumb.jpg"],
  "error": null
}
```

On failure:
```json
{
  "status": "error",
  "output_paths": [],
  "error": "Fal.ai API error: content policy block"
}
```

**generation-meta.json is always written**, even on failure. This is an engine contract requirement.

### 2.3 What This Engine Must NOT Do

- Never read or write `manifest.json`
- Never create its own output directory
- Never communicate with other engines
- Never retain state between calls
- Never read `.env` for workspace data (only for API keys at startup)
- Never modify or re-prompt the `video_prompt` — it passes it through as-is
- Never call the Image Engine or the Assembly Engine
- Never generate audio (always `generate_audio: false` for cloud APIs — audio comes from the Song Engine)

---

## 3. Three-Mode Architecture

### 3.1 Overview

```
┌──────────────────────────────────────────────────────────┐
│                      VIDEO ENGINE                         │
│                                                           │
│  ┌──────────────────┐                                     │
│  │  Mode Router      │                                     │
│  │  reads video_mode │                                     │
│  └───┬────┬────┬─────┘                                     │
│      │    │    │                                           │
│  ┌───▼──┐ ┌▼────┐ ┌▼──────┐                               │
│  │ Ken  │ │ LTX │ │ Kling │                               │
│  │Burns │ │ API │ │ API   │                               │
│  │FFMPEG│ │Fal  │ │ Fal   │                               │
│  └──┬───┘ └──┬──┘ └──┬────┘                               │
│     └────────┼────────┘                                    │
│              │                                             │
│       ┌──────▼──────┐                                      │
│       │ scene_N.mp4 │                                      │
│       └─────────────┘                                      │
│                                                            │
│  Writes: scene_N.mp4 + generation-meta.json                │
└──────────────────────────────────────────────────────────┘
```

### 3.2 Mode A — Ken Burns (FFMPEG)

**No cloud API. No cost. Instant.**

Takes the source image and applies a pan/zoom animation using FFMPEG's `zoompan` filter. The `camera_motion` object from the storyboard defines what motion to apply.

**Motion type mapping:**

| camera_motion.type | FFMPEG behavior |
|---|---|
| `slow_zoom_in` | Gradual zoom toward center or specified direction |
| `slow_zoom_out` | Start zoomed in, gradually pull back |
| `pan_left` | Slow horizontal pan from right to left |
| `pan_right` | Slow horizontal pan from left to right |
| `pan_up` | Slow vertical pan from bottom to top |
| `pan_down` | Slow vertical pan from top to bottom |
| `static` | No motion — still image held for the clip duration |

**Speed mapping:**

| camera_motion.speed | Pixels/frame (approx) |
|---|---|
| `very_slow` | ~0.5px/frame |
| `slow` | ~1px/frame |
| `medium` | ~2px/frame |

**FFMPEG implementation notes:**
- Input image is scaled up (e.g., 2x) to provide "room" for the camera to move without hitting edges.
- The `zoompan` filter generates frames at the target FPS and duration.
- Output is encoded as H.264 MP4 at the configured resolution and FPS.
- Duration is fully flexible — any number of seconds works.

**Ken Burns mode ignores:** `video_prompt`, `negative_prompt`, `generate_audio`, `seed`, `resolution` (output matches input image resolution or configured target).

**Ken Burns mode uses:** `camera_motion`, `duration`, `fps`.

### 3.3 Mode B — LTX Video 13B Distilled via Fal.ai

**Cloud API. Image-to-video generation. Confirmed from live API docs (March 4, 2026).**

The engine uploads the source image to Fal.ai storage, then submits an image-to-video generation request.

**LTX Distilled** (`video_mode: "ltx"` — default)
- Fal.ai endpoint: `fal-ai/ltx-video-13b-distilled/image-to-video`
- Cost: ~$0.20/video (flat rate, approximately $0.04–0.05/second)
- Duration: controlled via `num_frames` — **the API does NOT accept a duration in seconds**
- Frame rate: **30 fps** (fixed)
- Resolution: **`480p` or `720p`** (not 1080p — this endpoint tops out at 720p)
- Max frames: ~161 (≈5.4 seconds at 30fps); default 121 (≈4 seconds at 30fps)
- Aspect ratio: `auto`, `16:9`, `9:16`, `1:1` — use `auto` to match source image
- Supports `negative_prompt` and `seed`

**Duration → num_frames conversion (handled by adapter):**
```
num_frames = min(round(duration_seconds * 30), 161)
# Examples:
# duration=3  → 90 frames  (~3.0s)
# duration=4  → 120 frames (~4.0s)  ← close to default
# duration=5  → 150 frames (~5.0s)  ← recommended
# duration=6  → 161 frames (~5.4s)  ← clamped to max
```
The actual duration rendered is always recorded in generation-meta.json.

**API call structure:**
```json
{
  "image_url": "<uploaded image URL>",
  "prompt": "<video_prompt from storyboard>",
  "negative_prompt": "worst quality, inconsistent motion, blurry, jittery, distorted",
  "num_frames": 150,
  "resolution": "720p",
  "aspect_ratio": "auto",
  "seed": null
}
```

**Response:**
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4",
    "content_type": "video/mp4"
  }
}
```

The engine downloads the video from the returned URL and saves it to the output_dir as `scene_N.mp4`.

**LTX mode uses:** `video_prompt`, `duration` (converted to `num_frames`), `resolution` (480p/720p), `negative_prompt`, `seed`.

**LTX mode ignores:** `camera_motion`, `fps` (30fps fixed), `generate_audio`.

### 3.4 Mode C — Kling via Fal.ai

**Cloud API. Premium image-to-video generation. Confirmed from live API docs (March 4, 2026).**

Higher cost but significantly better motion quality, especially for complex scenes. Kling consistently outperforms LTX in motion realism and handling of detailed imagery — if embedded word text surviving animation is a priority, test Kling first.

**Kling 2.1 Standard** (`video_mode: "kling_standard"`)
- Fal.ai endpoint: `fal-ai/kling-video/v2.1/standard/image-to-video`
- Cost: $0.28 for 5s, $0.056/additional second
- Duration: `"5"` or `"10"` only (string enum, not int)

**Kling 2.1 Pro** (`video_mode: "kling_pro"`)
- Fal.ai endpoint: `fal-ai/kling-video/v2.1/pro/image-to-video`
- Cost: $0.49 for 5s, $0.098/additional second
- Duration: `"5"` or `"10"` only (string enum, not int)

**Note on version currency:** Kling versions advance frequently (2.1 → 2.6 → 3.x). The adapter pattern makes upgrading easy — just update the endpoint string and pricing. Kling 2.6 Pro is available at $0.07–$0.14/second as of March 2026; consider it as an upgrade path if 2.1 Pro is insufficient.

**⚠ Kling duration is ONLY "5" or "10" seconds (string, not int).** The adapter MUST round any requested duration to the nearest valid value: anything ≤7s → `"5"`, anything >7s → `"10"`. This is a hard provider constraint.

**API call structure:**
```json
{
  "image_url": "<uploaded image URL>",
  "prompt": "<video_prompt from storyboard>",
  "duration": "5",
  "aspect_ratio": "16:9",
  "negative_prompt": "blur, distort, and low quality",
  "cfg_scale": 0.5
}
```

**Response:**
```json
{
  "video": {
    "url": "https://v3.fal.media/files/.../output.mp4"
  }
}
```

**Kling mode uses:** `video_prompt`, `duration` (rounded to "5"/"10"), `negative_prompt`, `cfg_scale`.

**Kling mode ignores:** `camera_motion`, `resolution` (Kling determines resolution), `fps`, `generate_audio`, `seed`.

### 3.5 Lightricks Direct API (Optional Future Provider)

Lightricks offers a direct API at `docs.ltx.video`. As the LTX model family evolves (0.9.7 → future versions), a direct Lightricks API provider adapter can be added alongside the Fal.ai adapter. For v1, Fal.ai is the single cloud provider for both LTX and Kling, keeping integration simple.

---

## 4. Provider Adapter Pattern

Each cloud provider has its own adapter that translates our internal payload into the provider's API format. This is a simple mapping layer — no LLM, no prompt rewriting, no creative decisions.

### 4.1 Adapter Interface

Every adapter implements the same interface:

```python
class VideoProviderAdapter:
    def validate_settings(self, settings: VideoSettings) -> VideoSettings:
        """Clamp/round settings to provider constraints. Return adjusted settings."""

    def build_request(self, image_url: str, video_prompt: str, settings: VideoSettings) -> dict:
        """Build the provider-specific API request payload."""

    def parse_response(self, response: dict) -> str:
        """Extract the video download URL from the provider's response."""

    def get_endpoint(self) -> str:
        """Return the Fal.ai endpoint string for this provider."""

    def estimate_cost(self, settings: VideoSettings) -> float:
        """Return estimated cost in USD for this generation."""
```

### 4.2 Settings Validation Per Provider

Each provider has different constraints on duration, resolution, etc. The adapter validates and adjusts:

| Setting | LTX Distilled | Kling Standard | Kling Pro | Ken Burns |
|---|---|---|---|---|
| Duration values | 3–10s (converted to num_frames, capped at 161) | 5 or 10 only | 5 or 10 only | Any (continuous) |
| Duration default | 5 | 5 | 5 | 5 |
| Resolution | 480p, 720p | Provider-determined | Provider-determined | Input image |
| FPS | 30 (fixed) | Provider-determined | Provider-determined | Configurable |
| Negative prompt | Supported | Supported | Supported | N/A |
| cfg_scale | Not supported | 0.0–1.0 | 0.0–1.0 | N/A |
| seed | Supported | Not supported | Not supported | N/A |
| Audio | Not applicable | Not applicable | Not applicable | N/A |

When the user requests a duration that doesn't match a provider's valid values, the adapter rounds to the nearest valid value. For example: `duration: 7` → `6` for LTX-2, `5` for Kling. The actual duration used is recorded in generation-meta.json.

---

## 5. Image Upload Flow (Cloud API Modes)

Cloud APIs require a publicly accessible URL for the source image. The engine handles this automatically:

1. Read the source PNG from `content.image_path`
2. Upload to Fal.ai storage using their upload API
3. Receive a public URL
4. Include that URL in the generation request

```python
from fal_client import upload_file

image_url = upload_file(content.image_path)
# Returns something like: "https://fal.media/files/abc123/001.png"
```

The uploaded file is temporary — Fal.ai manages cleanup. The engine does not need to delete it.

For Ken Burns mode, no upload is needed. FFMPEG reads the local file directly.

---

## 6. Video Download Flow (Cloud API Modes)

After generation completes, the API returns a URL to the output video. The engine:

1. Downloads the MP4 from the returned URL
2. Saves it to `output_dir/scene_NNN.mp4`
3. Extracts the first frame and saves it as `output_dir/scene_NNN_thumb.jpg` (using FFMPEG: one frame at t=0)
4. Verifies the file is a valid MP4 (basic header check)
5. Records the download URL, file size, and duration in generation-meta.json

If the download fails, the engine retries up to 3 times with exponential backoff before reporting failure.

---

## 7. Queue-Based API Calls

Both Fal.ai LTX-2 and Kling use a queue-based API pattern:

1. **Submit** — POST the request, receive a `request_id`
2. **Poll** — Check status periodically until complete
3. **Result** — Fetch the completed output

The Fal.ai Python client handles this automatically via `fal_client.subscribe()`, which blocks until the result is ready and handles status polling internally. For batch processing (Section 10), the engine uses `fal_client.submit()` for async submission.

**Timeout:** If a generation hasn't completed within 5 minutes, the engine reports failure. This is generous — typical LTX-2 generation takes 10-30 seconds, Kling takes 2-5 minutes.

---

## 8. Settings Schema

The engine accepts a flat settings object. No nesting, no inheritance (the orchestrator resolves inheritance before calling the engine). Missing fields default gracefully.

### 8.1 Core Settings

| Setting | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `video_mode` | string | `"ltx"` | `"ken_burns"`, `"ltx"`, `"kling_standard"`, `"kling_pro"` | Which generation backend to use |
| `duration` | int | `5` | `3`–`10` (adapter clamps to provider's valid set) | Target clip duration in seconds |
| `resolution` | string | `"720p"` | `"480p"`, `"720p"` | Output resolution (LTX mode only; Kling determines its own) |
| `fps` | int | `25` | `25` | Frames per second (Ken Burns mode; LTX is fixed at 30fps) |

### 8.2 Provider-Specific Settings

| Setting | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `negative_prompt` | string | `"blur, distort, and low quality"` | Any string | Negative prompt (Kling modes only) |
| `cfg_scale` | float | `0.5` | `0.0`–`1.0` | Guidance scale (Kling modes only) |
| `generate_audio` | bool | `false` | `true`, `false` | Whether to generate audio (always false — our audio comes from Song Engine) |
| `seed` | int | `-1` | `-1` (random) or any positive int | Generation seed for reproducibility (where supported) |

### 8.3 Settings Philosophy

The Video Engine exposes minimal settings because the creative decisions were already made upstream. The user's main choices are:

- **Which backend?** Ken Burns (free, instant) vs LTX-2 (affordable, good) vs Kling (premium, better motion)
- **How long?** 5-6 seconds is the sweet spot. Longer clips risk quality degradation.
- **What resolution?** 1080p is the default and usually sufficient.

Everything else — what the scene looks like, what motion to apply, the visual style — was decided by the Image Engine's storyboard.

---

## 9. Cost Tracking

Because this engine uses paid APIs, every generation tracks estimated cost. **This is purely hardcoded math** — a dictionary of rates in the code multiplied by duration. No API calls to check pricing, no dynamic rate fetching. The rates are updated manually if provider pricing changes. Cost tracking is metadata only — it never affects generation logic.

### 9.1 Cost Estimation

Before making an API call, the engine calculates the estimated cost:

```python
def estimate_cost(video_mode: str, duration: int, resolution: str = "720p") -> float:
    # LTX: flat rate per video regardless of duration (up to max ~5.4s)
    # Kling: per-second billing with a base cost for the first 5s
    rates = {
        "ken_burns":      {"type": "free"},
        "ltx":            {"type": "flat",       "cost": 0.20},   # ~$0.20/video
        "kling_standard": {"type": "tiered",     "base_5s": 0.28, "per_extra_s": 0.056},
        "kling_pro":      {"type": "tiered",     "base_5s": 0.49, "per_extra_s": 0.098},
    }
    r = rates.get(video_mode, rates["ltx"])
    if r["type"] == "free":
        return 0.0
    if r["type"] == "flat":
        return r["cost"]
    # tiered: base covers first 5s, extra seconds billed beyond that
    extra = max(0, duration - 5)
    return r["base_5s"] + extra * r["per_extra_s"]
```

### 9.2 Cost in generation-meta.json

```json
{
  "cost": {
    "estimated_usd": 0.20,
    "rate_per_second": null,
    "duration_seconds": 5,
    "provider": "fal.ai",
    "model": "ltx-13b-distilled",
    "note": "Estimated based on published rates. Actual billing may differ."
  }
}
```

### 9.3 Batch Cost Preview

The orchestrator can call the engine's `estimate_batch_cost()` function before running a batch to display a confirmation: "This batch of 100 words (300 clips × 5s each) will cost approximately $60.00 at LTX rates (~$0.20/video). Proceed?" This is just a function call — not a separate engine mode.

---

## 10. Batch Processing and Parallelism

### 10.1 Per-Scene vs Per-Word

The orchestrator calls the Video Engine once per scene (image). A word with 3 images = 3 calls. This is by design — each scene is independent and can be processed in parallel.

### 10.2 Concurrent API Calls

For cloud API modes, the engine supports concurrent generation. Multiple scenes can be submitted to Fal.ai simultaneously using async submission:

```python
# Submit all scenes
request_ids = []
for scene in scenes:
    request_id = fal_client.submit(endpoint, input=payload)
    request_ids.append(request_id)

# Collect results
for request_id in request_ids:
    result = fal_client.result(endpoint, request_id)
    download_video(result)
```

The maximum concurrency is configurable (default: 5 simultaneous requests) to respect Fal.ai rate limits.

### 10.3 Ken Burns Parallelism

Ken Burns generation is CPU-bound (FFMPEG). Multiple FFMPEG processes can run in parallel. Default concurrency: 4.

---

## 11. Generation Metadata

Every call produces or updates a `generation-meta.json` in the output directory, per the engine contract.

```json
{
  "status": "success",
  "engine": "video-engine",
  "engine_version": "0.1.0",
  "timestamp": "2026-03-01T13:05:00Z",
  "duration_seconds": 12.3,

  "context": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation"
  },

  "inputs": {
    "image_version": "editorial-series_20260301T120000",
    "scene_number": 1,
    "video_prompt": "A lone figure stands motionless beneath a vast concrete overpass...",
    "settings_used": {
      "video_mode": "ltx",
      "duration": 5,
      "resolution": "1080p",
      "fps": 25,
      "generate_audio": false
    }
  },

  "outputs": {
    "primary": "scene_001.mp4",
    "thumbnail": "scene_001_thumb.jpg",
    "format": "mp4",
    "codec": "h264",
    "resolution": "1920x1080",
    "fps": 25,
    "duration_seconds": 5.0,
    "file_size_bytes": 2450000
  },

  "cost": {
    "estimated_usd": 0.20,
    "rate_per_second": null,
    "duration_seconds": 5,
    "provider": "fal.ai",
    "model": "ltx-13b-distilled"
  },

  "reproducibility": {
    "seed": null,
    "model_version": "ltx-13b-distilled",
    "provider": "fal.ai",
    "fal_request_id": "764cabcf-b745-4b3e-ae38-1200304cf45b",
    "note": "Non-deterministic — cloud API generation is not reproducible from seed"
  },

  "error": null
}
```

On failure, `outputs` is null and `error` contains `{ "message": "...", "retryable": true|false }`.

For Ken Burns mode, `cost` shows `0.00` and `provider` shows `"local/ffmpeg"`.

---

## 12. Error Handling

### 12.1 Retryable Errors

| Error | Retryable | Action |
|---|---|---|
| API timeout (>5 min) | Yes | Retry up to 2 times |
| Rate limit (429) | Yes | Wait and retry with exponential backoff |
| Network error | Yes | Retry up to 3 times |
| Video download failure | Yes | Retry download up to 3 times |
| Content policy block | No | Report failure, user regenerates with different prompt |
| Invalid image format | No | Report failure |
| API authentication error | No | Report failure, check API key |
| Insufficient funds | No | Report failure, user tops up account |

### 12.2 Partial Failure (Multi-Scene)

When the orchestrator submits multiple scenes for one word, each scene is an independent engine call. If scene 2 of 3 fails, scenes 1 and 3 still succeed. The orchestrator handles partial results.

---

## 13. Prompt Pass-Through

The Video Engine does NOT rewrite, enhance, or modify the `video_prompt` from the storyboard. It passes it through verbatim to the cloud API.

**Why:** The Image Engine's storyboard LLM already wrote prompts optimized for video generation — detailed, chronological descriptions of actions and scenes with specific movements, appearances, camera angles, and environmental details. This matches LTX-2's recommended prompting style ("think like a cinematographer describing a shot list"). Kling similarly accepts natural language scene descriptions.

If testing reveals that a specific provider needs different prompting, the adapter can prepend/append provider-specific boilerplate (e.g., a quality suffix or style prefix). But the core prompt content is never rewritten. This keeps the engine simple and predictable.

**Prompt length:** LTX-2 recommends prompts under 200 words. The Image Engine's `video_prompt` field is typically 30-80 words — well within limits.

---

## 14. Relationship to Other Stages

### 14.1 Input From Stage 3 (Image Engine)

The Image Engine produces, per scene:
- A PNG image file → becomes `content.image_path`
- A `camera_motion` object → used by Ken Burns mode
- A `video_prompt` string → used by LTX-2 and Kling modes

The orchestrator reads the storyboard.json from the selected image set and extracts these fields when dispatching to the Video Engine.

### 14.2 Output To Stage 5 (Assembly Engine)

The Video Engine produces MP4 clip files. The Assembly Engine (Stage 5) receives:
- The video clips (scene_001.mp4, scene_002.mp4, etc.)
- The song audio file from Stage 2

Stage 5 handles all time alignment — looping video if the song is longer, trimming or crossfading between clips, burning in subtitles. The Video Engine does not worry about duration matching.

---

## 15. Environment Variables

```
# Required for cloud API modes
FAL_KEY=your-fal-ai-api-key

# Optional — future providers
LTX_API_KEY=your-lightricks-api-key
```

The engine reads these at startup. They are NOT stored in the workspace (engine contract rule).

---

## 16. Project Structure

```
engine-video/
├── README.md
├── requirements.txt
├── .env.example
├── src/
│   ├── __init__.py
│   ├── engine.py              ← Main entry point: generate_video()
│   ├── router.py              ← Mode selection and dispatch
│   ├── adapters/
│   │   ├── __init__.py
│   │   ├── base.py            ← VideoProviderAdapter interface
│   │   ├── ken_burns.py       ← FFMPEG Ken Burns implementation
│   │   ├── ltx.py             ← LTX-Video 13B Distilled via Fal.ai
│   │   └── kling.py           ← Kling Standard + Pro via Fal.ai
│   ├── upload.py              ← Image upload to Fal.ai storage
│   ├── download.py            ← Video download from cloud URL
│   ├── cost.py                ← Cost estimation per provider
│   ├── models.py              ← Data models (VideoPayload, VideoResult, VideoSettings, etc.)
│   └── config.py              ← Environment variable loading
├── tests/
│   ├── test_engine.py         ← End-to-end engine tests
│   ├── test_ken_burns.py      ← FFMPEG animation tests (no API key needed)
│   ├── test_ltx.py            ← LTX-2 API tests (requires API key)
│   ├── test_kling.py          ← Kling API tests (requires API key)
│   ├── test_adapters.py       ← Adapter unit tests (mock API)
│   ├── test_cost.py           ← Cost estimation tests
│   └── test_models.py         ← Data model validation tests
└── ui/
    └── app.py                 ← Standalone testing UI (FastAPI)
```

### 16.1 Key Function Signatures

```python
# engine.py — the engine contract entry point
def generate_video(payload: VideoPayload) -> VideoResult:
    """
    Main engine function. Receives a payload, routes to the appropriate
    backend (Ken Burns / LTX-2 / Kling), generates video clip, writes
    output to payload.output_dir, always writes generation-meta.json,
    returns status.
    """

# router.py — mode selection
def get_adapter(video_mode: str) -> VideoProviderAdapter:
    """
    Return the appropriate adapter for the selected video mode.
    """

# adapters/ken_burns.py
def generate_ken_burns(
    image_path: str,
    camera_motion: dict,
    duration: int,
    fps: int,
    output_path: str
) -> VideoResult:
    """
    Use FFMPEG to create a Ken Burns animation from a still image.
    """

# adapters/ltx.py
def generate_ltx(
    image_path: str,
    video_prompt: str,
    settings: VideoSettings,
    output_path: str
) -> VideoResult:
    """
    Upload image to Fal.ai, submit LTX-2 generation request,
    download result, save to output_path.
    """

# adapters/kling.py
def generate_kling(
    image_path: str,
    video_prompt: str,
    settings: VideoSettings,
    output_path: str
) -> VideoResult:
    """
    Upload image to Fal.ai, submit Kling generation request,
    download result, save to output_path.
    """

# cost.py
def estimate_cost(video_mode: str, duration: int, resolution: str = "1080p") -> float:
    """
    Return estimated cost in USD for a single clip generation.
    """

def estimate_batch_cost(
    video_mode: str, duration: int, resolution: str, clip_count: int
) -> float:
    """
    Return estimated total cost for a batch of clips.
    """
```

---

## 17. Open Questions (To Be Resolved Through Testing)

### Provider Quality
- Does LTX-Video 13B Distilled produce acceptable quality for vocabulary learning content at 720p? Is 480p + Ken Burns an acceptable budget fallback?
- How does Kling 2.1 Standard (~$0.28/5s) compare to LTX (~$0.20/video) for subtle scene animation? Is the 40% cost premium worth it?
- Do any providers struggle with images that contain embedded text (our word-in-image feature)? Does the text get distorted during animation?

### Ken Burns Quality
- Does FFMPEG zoompan produce smooth enough results? If not, try pillow-based frame generation as an alternative — both are free and run locally. Start with FFMPEG (one shell command) and only switch if quality is insufficient.
- What zoom percentage looks natural for a 5-second clip? (Likely 5-10% total zoom)
- Do combined motions (zoom + pan simultaneously) look good, or should we stick to single-axis motion?

### Duration Sweet Spot
- Is 6 seconds (LTX-2 default) too long for vocabulary learning clips? The language science research suggests shorter exposures (5-10s total) for initial encoding. If each word has 3 clips at 6s each, that's 18s of video before Stage 5 handles timing.
- Does LTX-2 quality degrade noticeably at 10+ seconds?
- For Kling, is 5s or 10s the better default?

### Batch Processing
- What is Fal.ai's actual rate limit for concurrent requests? The engine defaults to 5 concurrent — is this conservative or aggressive?
- How reliable is Fal.ai for batch runs of 100+ requests? What failure rate should we expect?

### Integration
- Does the video clip quality look good when Assembly Engine (Stage 5) crossfades between clips from the same word?
- For Ken Burns clips followed by AI video clips in the same word — does the quality mismatch look jarring?

---

*This document is the build specification for the Video Engine. A coding agent building this engine should read this document alongside MASTER_ABSTRACT.md (for architecture rules and engine contract) and ENGINE_IMAGE.md (for understanding the storyboard format that produces the video prompts and camera motion objects this engine consumes).*

*When testing reveals answers to the open questions in Section 17, update this document. The abstract is a living specification.*
