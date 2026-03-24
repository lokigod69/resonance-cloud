# ENGINE_SONG.md — Song Engine Abstract

**Version:** 1.1
**Status:** Updated with testing results
**Date:** March 2, 2026
**Parent Document:** MASTER_ABSTRACT.md v1.0
**Pipeline Stage:** Stage 2 (Song Generation)
**Purpose:** This document defines what the Song Engine does, what it accepts, what it produces, how it connects to Ace-Step, and what settings it exposes. Any agent building or modifying this engine reads this document alongside the Master Abstract.

### Changelog (v1.0 → v1.1)

- **Section 3.2:** Gradio is now primary backend; HTTP REST API is secondary. Corrected `--enable-api` behavior (adds endpoints to Gradio, does not start separate server on 8001). Added `uv run acestep-api` as the actual separate HTTP API command.
- **Section 3.3:** Default connection is now Gradio at port 7860.
- **Section 3.4:** Replaced "Hybrid Mode" with "Startup Behavior" explaining lazy vs eager model loading.
- **Section 4.1:** `shift` default changed from `1.0` to `2.5`. Rationale updated based on testing.
- **Section 5:** Added **Layer 0: Inline Language Tags** — the critical `[de]` prefix discovery. This is now the strongest language lock mechanism. Reordered layers accordingly.
- **Section 12.1:** Added `language.py` function `inject_language_tags()`.
- **Section 14.1:** SFT remains the required model, but turbo is no longer prohibited — it's documented as a fallback for pronunciation-critical cases.
- **Section 14.2:** LM updated from `acestep-5Hz-lm-1.7B` to `acestep-5Hz-lm-4B`. Turbo checkpoint retained on disk (do not delete).
- **Section 15:** Open questions updated with answers from testing.
- **Section 16 (NEW):** Confirmed working configuration from live testing.

---

## 1. Engine Purpose

The Song Engine is the second stage of the Resonance pipeline. It takes structured lyrics and a music caption from a selected concept artifact (Stage 1 output) and produces audio files by calling Ace-Step 1.5, a locally-running music generation model.

The engine makes no creative decisions. All creative direction — what the song sounds like, what the lyrics say, what language it's in — is determined by the Concept Engine (Stage 1). The Song Engine's job is to faithfully execute that creative direction through optimal Ace-Step parameter configuration and reliable audio delivery.

The core challenge this engine solves is **language fidelity**: ensuring Ace-Step sings target vocabulary words with correct pronunciation in the target language (German, Korean, Japanese, Italian, Spanish, etc.) rather than Americanizing them. Every default parameter and design choice in this engine is oriented toward maximizing pronunciation accuracy.

### 1.1 What This Engine Is NOT

- It is NOT the Concept Engine. It does not generate lyrics, captions, or visual hints. It receives them.
- It is NOT the Assembly Engine. It does not normalize audio, trim silence, or handle duration alignment. It produces raw audio.
- It is NOT the orchestrator. It does not read CSVs, create folders, or manage manifests.
- It does not handle settings inheritance, version selection, or workspace management. The orchestrator handles all of that.
- It does not contain or manage Ace-Step's model weights. Ace-Step runs as a separate process; this engine communicates with it.

---

## 2. Engine Contract Compliance

This engine follows the engine contract defined in Master Abstract Section 8.

### 2.1 Input

The engine receives a single payload:

```json
{
  "content": {
    "lyrics": "[Spoken Word]\nVerzweiflung...\n\n[Verse - Steady]\nVerzweiflung...\nVerzweiflung...\n\n[Chorus - Building]\nVerzweiflung!\nVerzweiflung! Verzweiflung!\n\n[Outro - Fading]\nVerzweiflung...",
    "music_caption": "melancholic melodic techno, warm analog pads, deep sub-bass, clear close-mic German female vocal, isolated, clear diction",
    "language_code": "de"
  },
  "settings": {
    "duration": 30,
    "batch_size": 4,
    "inference_steps": 50,
    "guidance_scale": 7.5,
    "thinking": true,
    "seed": -1,
    "audio_format": "flac"
  },
  "output_dir": "/path/to/workspace/verzweiflung/songs/melodic-techno_20260228T113000/",
  "metadata": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation",
    "timestamp": "2026-02-28T11:30:00Z",
    "concept_version": "standard_20260228T103000"
  }
}
```

**Key points about the input:**

- `content.lyrics` and `content.music_caption` are extracted from the selected concept artifact by the orchestrator. The Song Engine receives them as plain strings.
- `content.language_code` is the ISO 639-1 language code (e.g., "de", "ko", "ja"). This is critical — it maps directly to Ace-Step's `vocal_language` parameter AND is used for inline language tag injection (see Section 5, Layer 0).
- `settings` is the fully merged settings object (batch defaults + per-word overrides, resolved by the orchestrator). The engine does not perform any settings inheritance.
- `output_dir` is pre-created by the orchestrator. The engine writes output files here.
- `metadata` provides context for generation-meta.json. The `concept_version` field records which concept artifact was used as input, enabling lineage tracking.

### 2.2 Output

When `batch_size` is 1, the engine writes a single audio file and generation-meta.json to the `output_dir`.

When `batch_size` is greater than 1, the engine produces **multiple takes from a single Ace-Step call**. Each take is a separate audio file within the same `output_dir`:

**Files written (batch_size=4 example):**
```
melodic-techno_20260228T113000/
├── take_001.flac
├── take_002.flac
├── take_003.flac
├── take_004.flac
└── generation-meta.json
```

**Important architectural note:** The Master Abstract states that each take from a batch becomes a separate version registered by the orchestrator. However, the Song Engine writes all takes from one batch call into a single output_dir with a single generation-meta.json. The **orchestrator** is responsible for deciding how to register these — either as sub-items within one version, or by splitting them into separate version folders after the engine returns. This decision belongs to the orchestrator, not the engine. The engine simply writes what it produces to the directory it was given.

**Return value:**
```json
{
  "status": "success",
  "output_paths": ["take_001.flac", "take_002.flac", "take_003.flac", "take_004.flac"],
  "error": null
}
```

### 2.3 What This Engine Must NOT Do

- Never read or write `manifest.json`
- Never create its own output directory
- Never communicate with other engines
- Never retain state between calls
- Never read `.env` for workspace data (only for Ace-Step connection URL at startup)
- Never modify or post-process the audio files Ace-Step produces (no normalization, no trimming, no re-encoding)

---

## 3. Ace-Step Integration

### 3.1 Architecture Overview

Ace-Step 1.5 runs as a separate process on the same machine. The Song Engine communicates with it via the Gradio client on localhost. The engine does not manage Ace-Step's lifecycle — the user starts Ace-Step before using the Song Engine.

```
┌─────────────────┐         ┌──────────────────────┐
│   Song Engine    │ Gradio  │   Ace-Step 1.5       │
│   (Python)       │ ──────► │   (separate process)  │
│                  │ Client  │   localhost:7860      │
│                  │ ◄────── │                       │
│  Writes FLAC to  │  Audio  │   GPU: RTX 5090 32GB │
│  output_dir      │  files  │   Model: SFT + 4B LM │
└─────────────────┘         └──────────────────────┘
```

### 3.2 Connection Methods

The engine supports two connection backends, configurable at startup:

#### Gradio Client (Primary — Recommended)

Uses `gradio_client.Client` to call Ace-Step's Gradio UI endpoint at `localhost:7860`.

**How it works:**

1. Engine calls `client.predict()` with all 45 positional parameters mapped to Gradio's `/generation_wrapper` endpoint
2. Ace-Step processes synchronously and returns a result tuple
3. Engine extracts audio file paths from the result (batch download list at index 8)
4. Engine copies audio files to `output_dir` as `take_001.flac`, `take_002.flac`, etc.

**Advantages:** Works with the standard Gradio UI launch (`uv run acestep`), no separate API server needed. The user can also experiment manually in the browser UI at `http://127.0.0.1:7860` while the Song Engine sends programmatic requests via the same endpoint.

**Important note on parameter fragility:** The Gradio interface uses positional parameters (45 as of March 2026). If Ace-Step updates the Gradio interface, positions may shift. The `acestep_gradio.py` backend must be verified against the current Ace-Step version when updating. The parameter positions are documented in the backend source code with comments referencing the Ace-Step source.

#### HTTP REST API (Secondary)

Ace-Step's built-in REST API server, launched with `uv run acestep-api` (separate process on port 8001).

**Important correction from v1.0:** The `--enable-api` flag on `uv run acestep` does NOT start a separate HTTP server on port 8001. It adds REST-style API endpoints (`/health`, `/v1/models`, `/release_task`, `/query_result`) to the Gradio server on port 7860. For a true separate HTTP API on port 8001, use `uv run acestep-api` instead.

**How it works:**

1. Engine sends `POST /release_task` with a JSON payload containing all generation parameters
2. Ace-Step returns a `job_id`
3. Engine polls `GET /query_result/{job_id}` until the job completes
4. Engine downloads the audio file(s) from the result URL
5. Engine copies audio files to `output_dir` as `take_001.flac`, `take_002.flac`, etc.

**Advantages:** Named JSON parameters (no positional fragility), proper async handling, survives Ace-Step UI updates, designed for programmatic integration.

### 3.3 Connection Configuration

```python
# Environment variables (read at startup)
ACESTEP_URL = "http://127.0.0.1:7860"  # Default: Gradio
ACESTEP_BACKEND = "gradio"               # "gradio" or "http"

# If backend is "http", URL should be "http://127.0.0.1:8001"
# and Ace-Step must be started with "uv run acestep-api"
```

The engine reads these from environment variables or from the workspace `.env` file. The connection is lazy-initialized on first use (not at import time).

### 3.4 Startup Behavior

Ace-Step has two startup modes that affect how models load:

**Eager loading (via CLI args or .env):** When Ace-Step is started with `uv run acestep` and the `.env` file specifies `ACESTEP_CONFIG_PATH` and `ACESTEP_LM_MODEL_PATH`, it attempts to initialize the specified models at startup. If successful, the models are loaded into VRAM before the Gradio UI appears.

**Lazy loading (no .env or first run):** When no `.env` exists (or only `.env.example` is found), Ace-Step starts the Gradio UI without loading models. The user must then go to the Service Configuration panel in the Gradio UI, select the DiT model and LM model, and click "Initialize Service" to load models into VRAM. The Song Engine will fail with a connection/generation error until models are initialized.

**Recommendation for development:** Create a proper `.env` file in the Ace-Step installation directory for consistent startup. See Section 14 for the recommended model configuration.

---

## 4. Ace-Step Parameter Map

### 4.1 Complete Parameter Table

Every parameter the engine sends to Ace-Step, with defaults, ranges, and rationale.

| Parameter | Default | Range | Configurable | What It Affects | Rationale |
|---|---|---|---|---|---|
| `caption` | From concept | — | No (from input) | Genre, instruments, vocal style, mood | Creative direction from Stage 1 |
| `lyrics` | From concept (with language tags injected) | — | No (from input) | Temporal vocal script with inline `[lang]` tags | Creative direction from Stage 1, language tags auto-injected by engine |
| `vocal_language` | From input `language_code` | ISO 639-1 codes | No (from input) | **Language lock parameter** — tells Ace-Step which language phonology to use | Works in combination with inline language tags for reliable pronunciation |
| `task_type` | `"text2music"` | — | No | Generation mode | Always text2music for our use case |
| `duration` | `30` | 15, 30 | Yes | Song length in seconds | 30s is standard vocabulary clip length |
| `inference_steps` | `50` | 32–100 | Yes | DiT denoising iterations. More steps = more detail but risk of error accumulation | SFT model recommended range is 32-64. Default 50 balances quality and language fidelity |
| `guidance_scale` | `7.5` | 5.0–10.0 | Yes | How strictly DiT follows the caption/lyrics prompt. Higher = more adherence | Higher values improve lyric adherence but risk artifacts. 7.5 is a balanced starting point |
| `shift` | `2.5` | 1.0–5.0 | Yes | Timestep shift factor for the denoising schedule. Higher = more effort on early semantic structure | **Changed from 1.0 in v1.0.** Testing confirmed that shift 2.5 significantly improves non-English pronunciation. Higher shift forces the model to prioritize semantic/language tokens early in the denoising process, reducing drift toward Americanized phonetics |
| `infer_method` | `"ode"` | — | No | Diffusion solver. ODE = deterministic, SDE = stochastic | ODE for reproducibility. SDE has reported bugs with SFT models |
| `thinking` | `true` | true, false | Yes | Whether Ace-Step's LM generates audio semantic codes to guide the DiT | True improves musical quality/coherence. If pronunciation Americanizes despite other controls, test with false |
| `use_cot_caption` | `false` | — | No | Whether LM can rewrite the caption | Always false — we provide exact captions from the Concept Engine. LM rewrites can remove language signals |
| `use_cot_language` | `false` | — | No | Whether LM can override the vocal_language setting | Always false — we set language explicitly |
| `use_cot_metas` | `false` | — | No | Whether LM can auto-generate BPM/duration/key | Always false — we provide these ourselves or let Ace-Step use its defaults |
| `batch_size` | `4` | 1–8 | Yes | Number of takes generated per call | 4 provides good selection variety without excessive listening burden |
| `seed` | `-1` | -1 or any positive int | Yes | Random noise initialization. -1 = random per take | Random for exploration. Fixed for reproduction |
| `bpm` | `null` | null or 60-200 | Yes | Beats per minute. Null = Ace-Step decides based on caption | Usually left null to let the caption drive tempo. Can force slower BPM for clearer enunciation |
| `audio_format` | `"flac"` | — | No | Output audio codec | FLAC: lossless, high quality, no generation artifacts from lossy encoding |
| `enable_normalization` | `true` | — | No | Ace-Step's built-in peak normalization | Prevents clipping. Does not affect perceived loudness (that's Assembly Engine's job) |
| `normalization_db` | `-1.0` | — | No | Peak normalization target in dB | -1.0 dB headroom is standard practice |
| `lm_temperature` | `0.85` | — | No | LM sampling temperature (when thinking=true) | Ace-Step default. Not a pronunciation lever — leave at default |
| `lm_top_k` | `0` | — | No | LM top-k sampling | Ace-Step default |
| `lm_top_p` | `0.9` | — | No | LM top-p (nucleus) sampling | Ace-Step default |
| `lm_cfg_scale` | `2.0` | — | No | LM classifier-free guidance | Ace-Step default |

### 4.2 Parameter Design Philosophy

Parameters fall into three categories:

**From input (not settings):** `caption`, `lyrics`, `vocal_language`. These come from the concept artifact via the orchestrator. The Song Engine passes them through with one modification: inline language tags are injected into lyrics before sending to Ace-Step (see Section 5, Layer 0). The user changes these by changing the concept, not by tweaking Song Engine settings.

**User-configurable (in settings):** `duration`, `inference_steps`, `guidance_scale`, `shift`, `thinking`, `batch_size`, `seed`, `bpm`. These affect generation quality and behavior. They appear in the orchestrator UI as adjustable controls.

**Hardcoded (not exposed):** Everything else. These are either Ace-Step internals that should not be changed for our use case (`infer_method`, CoT flags, audio format) or parameters where the default is correct and changing them would likely cause problems. Hardcoded parameters can be promoted to configurable later if testing reveals a reason — adding a new setting never breaks the architecture (Master Abstract Rule 7).

---

## 5. Language Lock Strategy

Pronunciation accuracy is the Song Engine's primary quality metric. The engine uses a multi-layer defense against Americanization:

### Layer 0: Inline Language Tags (Strongest Signal — CRITICAL)

**Added in v1.1 based on testing.** This is the single most impactful mechanism for correct pronunciation.

The engine automatically prepends `[{language_code}]` to every lyric line before sending to Ace-Step. This places the language hint directly inside the lyrics text, which Ace-Step uses for phonological mapping. Without these tags, Ace-Step sees Roman characters and assumes English — even when `vocal_language` is correctly set.

**How it works:** The `inject_language_tags()` function in `language.py` processes lyrics line by line:
- Structure tags (`[Verse]`, `[Chorus - Building]`, `[Spoken Word]`, etc.) pass through untouched
- Empty/whitespace lines pass through untouched
- All other lines get `[{language_code}] ` prepended

**Example transformation (language_code = "de"):**

Input from Concept Engine:
```
[Spoken Word]
Verzweiflung...

[Verse - Steady]
Verzweiflung...
Verzweiflung...

[Chorus - Building]
Verzweiflung!
Verzweiflung! Verzweiflung!
```

What gets sent to Ace-Step:
```
[Spoken Word]
[de] Verzweiflung...

[Verse - Steady]
[de] Verzweiflung...
[de] Verzweiflung...

[Chorus - Building]
[de] Verzweiflung!
[de] Verzweiflung! Verzweiflung!
```

**Implementation note:** The injection happens after `build_acestep_params()` (so the original lyrics hash in `generation-meta.json` reflects the user's input, not the tagged version) but before `backend.generate(params)` (so Ace-Step receives the tagged lyrics). This is a minimal, targeted mutation right before dispatch.

**Why this works:** Ace-Step's official prompt guide and ComfyUI workflow documentation confirm that the model requires language codes placed directly inside the lyrics text. The `vocal_language` parameter alone is not sufficient — it's a hint, but the inline tags are what actually steer phonological mapping. For Roman-script languages like German, this is especially critical because the model defaults to English phonology when it sees Roman text without explicit language markers.

### Layer 1: Explicit vocal_language (Reinforcement)

The `vocal_language` parameter is set to the exact ISO 639-1 code from the concept artifact (`"de"`, `"ko"`, `"ja"`, `"es"`, `"it"`). This is Ace-Step's parameter-level language selection mechanism. It works in combination with Layer 0 but is not sufficient on its own.

**The engine must NEVER send `vocal_language: "unknown"`.** If the language code is missing from the input, the engine fails with a clear error rather than falling back to auto-detection.

### Layer 2: Language in Caption (Reinforcement)

The Concept Engine (Stage 1) is responsible for including language identifiers in the music caption (e.g., "German female vocal", "singing in Korean"). The Song Engine does NOT modify the caption — but it verifies that a language signal is present. If the caption does not contain the language name or a recognized language phrase, the engine appends `", {language} vocal"` to the caption as a safety net. This is the only modification the engine makes to any input from Stage 1.

### Layer 3: CoT Flags Disabled (Prevention)

All three Chain-of-Thought flags are hardcoded to false:

- `use_cot_caption=false` — prevents the LM from rewriting the caption (which could remove language signals)
- `use_cot_language=false` — prevents the LM from overriding the explicit vocal_language
- `use_cot_metas=false` — prevents the LM from changing duration/BPM/key

This ensures that what the Concept Engine crafted is exactly what the DiT receives.

### Layer 4: Higher Shift Value (Structural)

**Added in v1.1.** Setting `shift=2.5` (instead of the SFT default of 1.0) forces the DiT to allocate more effort to early denoising, building semantic and language structure first. Testing confirmed this significantly reduces drift toward Americanized phonetics that occurs with lower shift values. A shift of 1.0 allows the model to distribute attention evenly, which causes non-English phonetics to degrade in later denoising steps.

### Layer 5: Thinking as Escape Hatch

If Layers 0-4 are insufficient and pronunciation is still Americanized, the user can set `thinking=false`. This disables the LM entirely — no audio code generation, no semantic planning. The DiT works directly from text embeddings only. This may reduce musical quality but can improve language fidelity by removing the LM's English-biased code generation.

**Thinking is true by default** because the LM's audio codes significantly improve musical coherence and structure. The escape hatch exists for languages or words where the LM consistently steers toward English phonology despite all other controls.

### Additional Tips for Difficult Words

**Umlaut romanization:** For German words with umlauts, the Concept Engine can provide romanized alternatives (ä→ae, ö→oe, ü→ue, ß→ss) in the lyrics. Testing showed mixed results — try both native and romanized forms and compare.

**Caption style:** Simple, vocal-forward captions produce clearer pronunciation than complex production descriptions. "Male singing in German, clear diction, simple piano" outperformed "melancholic melodic techno, warm analog pads, deep sub-bass" for pronunciation clarity. The Concept Engine should prioritize vocal clarity in its caption generation.

**Non-Roman scripts (Korean, Japanese):** Test both native script and romanized forms (romaji, RR romanization). Ace-Step's training includes partial romanization/phonemic representations for non-Roman scripts, so romanized input may produce better pronunciation in some cases.

---

## 6. Multi-Take Strategy

### 6.1 How Batch Generation Works

Ace-Step's `batch_size` parameter generates multiple audio variations in a single GPU pass. With `batch_size=4`, one call to Ace-Step produces 4 audio files, each initialized with a different random seed but using the same lyrics, caption, and parameters.

This is architecturally equivalent to recording multiple takes in a DAW. Some takes will be better than others — different vocal timing, slightly different melodic interpretation, varying pronunciation clarity. The user listens and picks the best one.

### 6.2 Seed Management

**Random mode (default, `seed: -1`):**

Ace-Step generates a random seed for each take internally. The engine records the actual seeds used (parsed from Ace-Step's response or logs) in generation-meta.json. Every take's seed is captured so it can be reproduced later if desired.

**Fixed mode (`seed: [101, 202, 303, 404]`):**

The user (or orchestrator) provides an explicit list of seeds, one per take. Ace-Step uses these exact seeds. With ODE inference and identical inputs, this produces identical output — useful for A/B testing parameter changes while controlling for random variation.

**Single deterministic mode (`seed: 42`):**

A single integer seed with `batch_size=1`. Produces one deterministic take. Useful for regression testing — "does changing guidance_scale from 7.0 to 8.0 improve this specific word?"

### 6.3 Take File Naming

Takes are numbered sequentially within the output directory:

```
take_001.flac
take_002.flac
take_003.flac
take_004.flac
```

The numbering corresponds to the order Ace-Step returns them, which corresponds to the seed order. The mapping between take number and seed is recorded in generation-meta.json.

---

## 7. Settings Schema

The engine accepts a flat settings object. No nesting, no inheritance (the orchestrator resolves inheritance before calling the engine). Missing fields default gracefully.

| Setting | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `duration` | int | `30` | `15`, `30` | Song length in seconds |
| `batch_size` | int | `4` | `1`–`8` | Number of takes per generation call |
| `inference_steps` | int | `50` | `32`–`100` | DiT denoising steps. Lower may improve language accuracy |
| `guidance_scale` | float | `7.5` | `5.0`–`10.0` | Prompt adherence strength |
| `shift` | float | `2.5` | `1.0`–`5.0` | Timestep shift. Higher = stronger semantic structure, better non-English pronunciation |
| `thinking` | bool | `true` | `true`, `false` | LM audio code generation. False = escape hatch for pronunciation issues |
| `seed` | int or list | `-1` | `-1` or positive int(s) | Random noise seed. -1 = random |
| `bpm` | int or null | `null` | `null`, `60`–`200` | Beats per minute. Null = auto from caption |
| `audio_format` | string | `"flac"` | `"flac"` | Output format. Hardcoded to FLAC for lossless quality |

### 7.1 Settings Defaults

The absolute minimum viable payload:

```json
{
  "content": {
    "lyrics": "[Verse]\nStahl...\nStahl...\n\n[Chorus]\nStahl!\nStahl!",
    "music_caption": "industrial ambient, metallic textures, German male vocal",
    "language_code": "de"
  },
  "settings": {},
  "output_dir": "/path/to/output/",
  "metadata": {
    "word": "Stahl",
    "language": "German",
    "translation": "Steel",
    "timestamp": "2026-02-28T11:30:00Z"
  }
}
```

This produces: 4 takes at 50 steps, guidance 7.5, shift 2.5, thinking enabled, random seeds, 30 seconds, FLAC output. Inline `[de]` language tags are automatically injected into lyrics before sending to Ace-Step.

---

## 8. Output Format

### 8.1 Audio Specification

| Property | Value | Notes |
|---|---|---|
| Format | FLAC | Lossless audio compression |
| Sample rate | 48,000 Hz | Ace-Step's native output rate |
| Channels | Stereo | Ace-Step produces stereo output |
| Bit depth | 16 or 24 bit | Ace-Step's output depth (engine does not convert) |
| Duration | As requested (15 or 30s) | Actual duration may vary slightly from requested |
| Post-processing | None | Raw Ace-Step output with built-in peak normalization only |

### 8.2 No Post-Processing Policy

The Song Engine performs **zero** audio processing on Ace-Step's output. Files are copied from Ace-Step's output location to the workspace `output_dir` without modification. This is a deliberate design choice:

- **Silence trimming** → Assembly Engine (Stage 5)
- **LUFS loudness normalization** → Assembly Engine (Stage 5)
- **Format conversion** → Not needed (FLAC throughout)
- **Artifact cleanup** → Not feasible algorithmically; the user picks the best take instead

The only audio processing that occurs is Ace-Step's built-in peak normalization (`enable_normalization=true`, `normalization_db=-1.0`), which is part of Ace-Step's generation pipeline, not a Song Engine post-processing step.

---

## 9. Generation Metadata

Every call produces a `generation-meta.json` in the output directory, per the engine contract. This file is written **always**, even on failure.

```json
{
  "status": "success",
  "engine": "song-engine",
  "engine_version": "0.2.0",
  "timestamp": "2026-03-02T13:15:00Z",
  "duration_seconds": 11.08,

  "context": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation"
  },

  "inputs": {
    "concept_version": "standard_20260228T103000",
    "lyrics_hash": "sha256:abc123...",
    "caption": "male singing in German, clear diction, simple piano",
    "caption_modified": false,
    "language_code": "de",
    "language_tags_injected": true,
    "settings_used": {
      "duration": 30,
      "batch_size": 4,
      "inference_steps": 50,
      "guidance_scale": 7.5,
      "shift": 2.5,
      "thinking": true,
      "seed": -1,
      "bpm": null,
      "audio_format": "flac"
    }
  },

  "outputs": {
    "takes": [
      { "file": "take_001.flac", "seed": 3527980329 },
      { "file": "take_002.flac", "seed": 1365260420 },
      { "file": "take_003.flac", "seed": 239938416 },
      { "file": "take_004.flac", "seed": 46757148 }
    ],
    "format": "flac",
    "sample_rate": 48000,
    "requested_duration": 30
  },

  "acestep": {
    "backend": "gradio",
    "url": "http://127.0.0.1:7860",
    "model": "acestep-v15-sft",
    "infer_method": "ode",
    "shift": 2.5,
    "thinking": true,
    "use_cot_caption": false,
    "use_cot_language": false,
    "use_cot_metas": false,
    "enable_normalization": true,
    "normalization_db": -1.0,
    "lm_temperature": 0.85
  },

  "timing": {
    "total_seconds": 11.08,
    "lm_seconds": 1.57,
    "dit_seconds": 6.83,
    "vae_seconds": 0.75,
    "overhead_seconds": 1.93
  },

  "reproducibility": {
    "seeds": [3527980329, 1365260420, 239938416, 46757148],
    "deterministic": false,
    "note": "Seeds were randomly generated. To reproduce a specific take, use its seed with batch_size=1 and identical inputs."
  },

  "error": null
}
```

**On failure:**
```json
{
  "status": "failed",
  "engine": "song-engine",
  "engine_version": "0.2.0",
  "timestamp": "2026-03-02T13:15:00Z",
  "duration_seconds": 2.1,
  "context": { "word": "Verzweiflung", "language": "German", "translation": "Desperation" },
  "inputs": { "...": "..." },
  "outputs": null,
  "acestep": { "...": "..." },
  "timing": null,
  "reproducibility": null,
  "error": {
    "message": "Ace-Step Gradio generation failed: No value provided for required argument: param_43",
    "retryable": true,
    "type": "generation_error"
  }
}
```

### 9.1 Metadata Design Notes

- `inputs.lyrics_hash` is a SHA-256 hash of the **original** lyrics text (before language tag injection), not the tagged version. This keeps lineage tied to the Concept Engine's output.
- `inputs.language_tags_injected` indicates whether inline language tags were added to the lyrics (should always be true in normal operation).
- `inputs.caption_modified` indicates whether the engine appended a language safety net to the caption (see Section 5, Layer 2). True means the original caption lacked a language signal and was modified.
- `acestep` section records ALL Ace-Step parameters, including hardcoded ones. This makes every output fully reproducible — you can see exactly what was sent to Ace-Step without consulting the engine's source code.
- `timing` section captures Ace-Step's internal timing breakdown (LM, DiT, VAE). Useful for performance monitoring and identifying bottlenecks.

---

## 10. Error Handling

### 10.1 Connection Errors

If Ace-Step is not running or unreachable:
- Write generation-meta.json with `status: "failed"`, `error.type: "connection_error"`, `error.retryable: true`
- Return `{ status: "failed", output_paths: [], error: { message: "...", retryable: true } }`

The engine does NOT retry automatically. The orchestrator decides retry policy.

### 10.2 Generation Errors

If Ace-Step accepts the job but fails during generation (e.g., out of memory, model error):
- Write generation-meta.json with `status: "failed"`, `error.type: "generation_error"`, `error.retryable: true`
- Include any error message from Ace-Step in the error details

### 10.3 Partial Batch Completion

If Ace-Step was asked for `batch_size=4` but only produced 3 audio files (rare but possible):
- Write whatever files were produced (`take_001.flac`, `take_002.flac`, `take_003.flac`)
- Write generation-meta.json with `status: "success"` (partial success is still success)
- `output_paths` lists only the files that were actually written
- `outputs.takes` lists only the takes that were produced
- A warning note is added to generation-meta.json: `"warning": "Requested 4 takes, received 3"`

### 10.4 Invalid Input

If required fields are missing from the payload (no lyrics, no language_code, no output_dir):
- Write generation-meta.json with `status: "failed"`, `error.type: "validation_error"`, `error.retryable: false`
- Do NOT call Ace-Step — fail fast

If `language_code` is not in Ace-Step's supported languages list:
- Write generation-meta.json with `status: "failed"`, a warning that the language may not be supported, but `error.retryable: true` (user might want to try anyway with a corrected code)

### 10.5 Language Safety Net Failure

If the caption language injection (Section 5, Layer 2) fails for any reason, the engine proceeds with the original caption. This is a best-effort safety net, not a hard requirement. A warning is logged in generation-meta.json.

---

## 11. Standalone Testing UI

### 11.1 Scope

The engine is a Python module with a clean API function: `generate_song(payload) → SongResult`. The standalone testing UI is a **separate script** that wraps this function with a minimal web interface. It is NOT part of the engine contract and is NOT used in production.

### 11.2 Testing UI Features

- **Single-word test:** Enter a word + language + lyrics + caption → generate → listen to all takes inline
- **Settings panel:** All configurable settings (duration, steps, guidance, shift, thinking, batch_size, seed, bpm) as sliders/inputs
- **Language tag preview:** Shows how inline `[lang]` tags will be injected into lyrics before sending to Ace-Step
- **Take comparison:** Audio players for each take side-by-side, with seed displayed
- **Connection status:** Shows whether Ace-Step is reachable and which backend (Gradio/HTTP) is active
- **Generation log:** Real-time display of timing info, seeds, and any warnings

### 11.3 Technical Implementation

- **Framework:** FastAPI + lightweight HTML frontend
- **Storage:** Filesystem only — writes to a temp directory or a user-specified output path
- **Dependencies:** Requires a virtual environment with `requirements.txt` installed (`uv venv && uv pip install -r requirements.txt`)
- **Launch:** `.venv\Scripts\uvicorn ui.app:app --host 127.0.0.1 --port 8000 --reload`
- **Separation:** The UI script imports the engine module. If the engine works, the UI works. If the UI breaks, the engine is unaffected.

---

## 12. Code Architecture

### 12.1 Module Structure

```
song-engine/
├── CLAUDE.md                  ← Agent instructions (per PROJECT_OPS.md)
├── README.md                  ← Setup, usage, changelog
├── requirements.txt           ← Dependencies
├── .venv/                     ← Virtual environment (created with uv venv)
├── src/
│   ├── __init__.py
│   ├── song_engine/
│   │   ├── __init__.py
│   │   ├── engine.py              ← Main entry point: generate_song()
│   │   ├── backends/
│   │   │   ├── acestep_http.py    ← HTTP API client (secondary backend)
│   │   │   ├── acestep_gradio.py  ← Gradio client (primary backend, 45 positional params)
│   │   │   └── acestep_base.py    ← Abstract base class for backends
│   │   ├── params.py              ← Parameter mapping, validation, defaults
│   │   ├── language.py            ← Language code validation, caption safety net, inline tag injection
│   │   └── models.py              ← Data models (SongPayload, SongResult, Settings, etc.)
├── tests/
│   ├── test_engine.py         ← End-to-end engine tests (requires running Ace-Step)
│   ├── test_params.py         ← Parameter mapping and validation tests
│   ├── test_language.py       ← Language lock, caption safety net, and inline tag injection tests
│   └── test_models.py         ← Data model validation tests
└── ui/
    └── app.py                 ← Standalone testing UI (FastAPI)
```

### 12.2 Key Function Signatures

```python
# engine.py — the engine contract entry point
def generate_song(payload: SongPayload) -> SongResult:
    """
    Main engine function. Receives a payload, calls Ace-Step,
    writes output files to payload.output_dir, always writes
    generation-meta.json, returns status.
    
    Step 2b: After build_acestep_params(), injects inline language
    tags into params.lyrics via inject_language_tags() before
    dispatching to the backend.
    """

# acestep_base.py — backend interface
class AceStepBackend(ABC):
    @abstractmethod
    def generate(self, params: AceStepParams) -> AceStepResponse:
        """Send generation request to Ace-Step, return audio data."""

    @abstractmethod
    def health_check(self) -> bool:
        """Check if Ace-Step is reachable."""

# acestep_gradio.py — Gradio client implementation (primary)
class AceStepGradio(AceStepBackend):
    def generate(self, params: AceStepParams) -> AceStepResponse:
        """client.predict() with 45 positional params → extract audio from result index 8."""

# acestep_http.py — HTTP API implementation (secondary)
class AceStepHTTP(AceStepBackend):
    def generate(self, params: AceStepParams) -> AceStepResponse:
        """POST /release_task → poll /query_result → download audio."""

# params.py — parameter handling
def build_acestep_params(content: SongContent, settings: SongSettings) -> AceStepParams:
    """
    Maps Song Engine settings to Ace-Step parameters.
    Applies defaults for hardcoded params, validates ranges,
    handles language safety net for caption.
    Note: Does NOT inject language tags — that happens in engine.py after this.
    """

# language.py — language utilities
def validate_language_code(code: str) -> bool:
    """Check if language code is in Ace-Step's VALID_LANGUAGES."""

def ensure_language_in_caption(caption: str, language: str, language_code: str) -> tuple[str, bool]:
    """
    If caption doesn't contain a language signal, append one.
    Returns (modified_caption, was_modified).
    """

def inject_language_tags(lyrics: str, language_code: str) -> str:
    """
    Prepend [{language_code}] to every non-empty, non-structure-tag line in lyrics.
    Structure tags ([Verse], [Chorus - Building], etc.) and blank lines pass through.
    Returns the modified lyrics string.
    """
```

### 12.3 Dependencies

| Package | Purpose | Required |
|---|---|---|
| `httpx` | HTTP API client (async-capable) | Yes |
| `gradio_client` | Gradio backend (primary) | Yes |
| `pydantic` | Data models and validation | Yes |
| `fastapi` + `uvicorn` | Standalone testing UI only | Testing only |

No heavy ML libraries. No audio processing libraries (we don't touch the audio). No database drivers. The Song Engine is a thin, focused wrapper around Ace-Step communication.

---

## 13. Supported Languages

The engine supports any language that Ace-Step supports via its `vocal_language` parameter. The following are confirmed valid codes from Ace-Step's `VALID_LANGUAGES`:

| Language | Code | Primary Test Target | Notes |
|---|---|---|---|
| German | `de` | Yes | Primary test language. Inline `[de]` tags critical for pronunciation. Tested with: Verzweiflung, Entschuldigung, Überwältigung, Geschwindigkeit |
| Italian | `it` | Yes | |
| Spanish | `es` | Yes | |
| Korean | `ko` | Yes | Non-Latin script — test native vs romanized lyrics with `[ko]` tags |
| Japanese | `ja` | Yes | Mixed scripts — test hiragana/katakana vs romanized with `[ja]` tags |
| English | `en` | No | Supported but not the primary use case |
| Chinese | `zh` | No | Supported by Ace-Step but not in initial test set |
| French | `fr` | No | |

Adding a new language requires only confirming its ISO 639-1 code is in Ace-Step's supported list. No engine code changes needed — the inline tag injection automatically uses whatever language code is provided.

---

## 14. Model Configuration

### 14.1 Required Model: SFT (Primary)

The Song Engine is designed for and tested with the **SFT (Supervised Fine-Tuned) base model** (`acestep-v15-sft`). This is the model variant that supports:

- Variable inference steps (32-100+) for quality tuning
- Classifier-free guidance (guidance_scale) for prompt adherence
- ODE inference for deterministic generation
- Higher shift values (2.5) for improved non-English phonological structure

**The Turbo model is available as a fallback** for cases where faster generation is needed or where specific words prove difficult with SFT. Turbo is clamped to 8 steps maximum and does not support guidance_scale. Turbo requires `shift=3.0` (not 2.5). Keep turbo checkpoints on disk — do NOT delete them, as the Ace-Step auto-downloader treats them as part of the main model bundle and will re-download the entire bundle if they are missing.

### 14.2 Required Components

Ace-Step requires these model components to be present:

```
checkpoints/
├── acestep-v15-sft/           ← DiT model (primary)
├── acestep-v15-turbo/         ← DiT model (fallback — do not delete)
├── vae/                       ← Audio encoder/decoder (required)
├── Qwen3-Embedding-0.6B/     ← Text encoder (required)
├── acestep-5Hz-lm-4B/        ← Language Model (required when thinking=true)
└── acestep-5Hz-lm-1.7B/      ← Smaller LM (optional, included in main bundle)
```

The 4B LM (`acestep-5Hz-lm-4B`) is recommended for maximum quality. It requires approximately 18 GB total VRAM (SFT DiT + 4B LM + KV cache), well within the RTX 5090's 32 GB capacity. The 1.7B LM is included in the main download bundle and can be used as a lighter alternative.

**Important:** All three LM sizes (0.6B, 1.7B, 4B) have identical training data — the difference is knowledge capacity and planning quality, not language coverage. The 4B LM did produce fake German gibberish when CoT caption rewriting was enabled, but this is prevented by our CoT flags being set to false.

### 14.3 Recommended .env Configuration

Place this file at `D:\CODING\RESONANCE\ACE-Step-1.5\.env`:

```
ACESTEP_CONFIG_PATH=acestep-v15-sft
ACESTEP_LM_MODEL_PATH=acestep-5Hz-lm-4B
ACESTEP_DEVICE=auto
ACESTEP_LM_BACKEND=vllm
ACESTEP_INIT_LLM=auto
PORT=7860
LANGUAGE=en
```

This ensures eager model loading at startup with the correct models.

---

## 15. Testing Results and Answered Questions

### Pronunciation Quality (ANSWERED)

- **Baseline pronunciation at defaults (50 steps, guidance 7.5, thinking=true, CoT off) WITHOUT inline tags:** Poor. German words consistently Americanized regardless of parameter tweaking. The `vocal_language` parameter alone is not sufficient.
- **With inline `[de]` tags + shift 2.5:** Excellent. Tested with Entschuldigung (near-perfect), Überwältigung (near-perfect across all takes), Geschwindigkeit (good, 3/4 takes excellent), Verzweiflung (1/4 excellent, others acceptable). This is the confirmed working configuration.
- **Inference steps below 50:** 32 steps produced acceptable results. 50 steps produced slightly better musical quality with comparable pronunciation. Steps above 55 introduced vocal artifacts on some takes.
- **`thinking=false`:** Reduces musical quality but does not consistently improve pronunciation when inline tags are used. Thinking=true is the better default.
- **Guidance scale:** 7.5 is the sweet spot. 9.0 reduced lyric adherence (fewer word repetitions) in testing.

### Caption Influence (ANSWERED)

- **Caption style matters significantly for vocal prominence.** "Male singing in German, clear diction, simple piano" produced much clearer vocals than "melancholic melodic techno, warm analog pads, deep sub-bass." Dense production captions bury the vocal.
- **The language safety net is useful but not critical** when inline tags are present. The inline tags are the primary pronunciation mechanism.
- **"Clear diction" in the caption helps** — it tells the model to prioritize vocal intelligibility.

### Batch Generation (ANSWERED)

- With batch_size=4, typically 2-3 out of 4 takes have acceptable pronunciation. 1 take is usually excellent. This is a good selection ratio.
- There is meaningful variation between takes — different melodic interpretation, varying pronunciation clarity, sometimes different vocal timbre.

### Duration (NOT YET TESTED)
- 15 seconds has not yet been tested with the confirmed working configuration.

### Connection Backend (ANSWERED)
- Gradio backend is confirmed working and is the primary integration path.
- HTTP API has not been tested but is documented as secondary.

### Cross-Language (PARTIALLY ANSWERED)
- German is confirmed working with the inline tag strategy.
- Korean, Japanese, Italian, and Spanish have not yet been tested with inline tags.
- For Korean and Japanese, both native script and romanized forms should be tested.

### Open Questions Remaining
- Is 15 seconds a viable duration?
- Do Korean `[ko]` and Japanese `[ja]` inline tags work as well as German `[de]`?
- Should the Concept Engine romanize umlauts in German lyrics, or is native text better?
- Is there a meaningful quality difference between the 4B and 1.7B LM for pronunciation?
- Would a German vocal LoRA eliminate the remaining ~25% of takes that have suboptimal pronunciation?

---

## 16. Confirmed Working Configuration (March 2, 2026)

This is the tested, verified configuration that produces good German pronunciation:

```
Model:              acestep-v15-sft
LM:                 acestep-5Hz-lm-4B (vllm backend)
Shift:              2.5
Inference Steps:    50
Guidance Scale:     7.5
Thinking:           true
CoT Caption:        false
CoT Language:       false
CoT Metas:          false
Infer Method:       ode
Audio Format:       flac
Duration:           30 seconds
Batch Size:         4

Lyrics:             Inline [de] tags on every lyric line
Caption:            English, vocal-forward (e.g., "male singing in German, clear diction, simple piano")
Language:           de (explicit, never "unknown")

Connection:         Gradio client → localhost:7860
```

**Words tested and confirmed:**
- Entschuldigung — near-perfect pronunciation across takes
- Überwältigung — near-perfect across all takes  
- Geschwindigkeit — excellent on 3/4 takes
- Verzweiflung — 1/4 excellent, others acceptable (hard tsv cluster)

---

*This document is the build specification for the Song Engine. A coding agent building this engine should read this document alongside MASTER_ABSTRACT.md (for architecture rules and engine contract) and the Ace-Step deep research document (for understanding Ace-Step's parameter space and behavior).*

*When testing reveals answers to the remaining open questions in Section 15, update this document. The abstract is a living specification.*
