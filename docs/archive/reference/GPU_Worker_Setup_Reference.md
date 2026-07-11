# GPU Worker Setup Reference

> Generated from source code analysis of `lokigod69/ltx-worker` (branch: main)
> Date: 2026-04-14

---

## 1. Model Directory Structure

### LTX Model Directory

| Environment Variable | Default Value |
|---------------------|---------------|
| `LTX_MODEL_DIR` | `/models/ltx-2.3` |

**Source:** `src/config.py:10`

### Gemma Model Directory

| Environment Variable | Default Value |
|---------------------|---------------|
| `GEMMA_MODEL_DIR` | `/models/gemma` |

**Source:** `src/config.py:11`

### Expected Files in LTX Model Directory (`/models/ltx-2.3/`)

| Filename | Used By | Purpose |
|----------|---------|---------|
| `ltx-2.3-22b-distilled.safetensors` | `DistilledPipeline` constructor (`distilled_checkpoint_path`) | Main distilled checkpoint |
| `ltx-2.3-22b-dev.safetensors` | `TI2VidTwoStagesPipeline` and `KeyframeInterpolationPipeline` (`checkpoint_path`) | Full 22B dev checkpoint |
| `ltx-2.3-22b-distilled-lora-384.safetensors` | `LoraPathStrengthAndSDOps` (`path`) | Distilled LoRA adapter |
| `ltx-2.3-spatial-upscaler-x2-1.1.safetensors` | All three pipelines (`spatial_upsampler_path`) | 2x spatial upscaler |

**Source:** `src/inference.py:72-96`

### Expected Files in Gemma Model Directory (`/models/gemma/`)

The Gemma directory is passed as `gemma_root` to all pipeline constructors. It contains a full HuggingFace model snapshot from **`Lightricks/gemma-3-12b-it-qat-q4_0-unquantized`** (ungated, no HF auth needed). This is a Gemma 3 12B parameter text encoder.

Expected contents (standard HuggingFace snapshot structure):
- `config.json`
- `tokenizer.json` / `tokenizer_config.json`
- `model*.safetensors` (sharded weight files)
- `special_tokens_map.json`
- `generation_config.json`
- Other standard HF model files

**Source:** `README.md:74-78`, `src/inference.py:91`

---

## 2. Model File Inventory

| File | Expected Path (relative to model dir) | What Loads It | Approximate Size |
|------|---------------------------------------|---------------|------------------|
| 22B Dev Checkpoint | `ltx-2.3/ltx-2.3-22b-dev.safetensors` | `TI2VidTwoStagesPipeline`, `KeyframeInterpolationPipeline` | ~38 GB BF16 / ~19 GB FP8 in VRAM |
| 22B Distilled Checkpoint | `ltx-2.3/ltx-2.3-22b-distilled.safetensors` | `DistilledPipeline` | Similar to dev checkpoint |
| Distilled LoRA | `ltx-2.3/ltx-2.3-22b-distilled-lora-384.safetensors` | `LoraPathStrengthAndSDOps` → passed to Pro/Keyframe pipelines | Small (LoRA adapter) |
| Spatial Upscaler | `ltx-2.3/ltx-2.3-spatial-upscaler-x2-1.1.safetensors` | All pipelines (`spatial_upsampler_path`) | UNABLE TO DETERMINE FROM CODE -- needs manual verification |
| Gemma 3 12B Text Encoder | `gemma/` (full HF snapshot) | All pipelines (`gemma_root`) | ~24.5 GB in VRAM; disk size varies |

**Note:** The README states the local LTX model dir has "11 files" but only 4 specific filenames are referenced in code. The other files may be configs or alternative checkpoints. The 4 listed above are the ones the code actually loads.

---

## 3. Download Sources

### No Download Scripts in Repo

The repository contains **no download scripts**. There is no `download_models.sh` or equivalent. The Dockerfile does **not** download model weights -- it only installs code and dependencies. Models must be pre-placed on a network volume or downloaded manually.

### HuggingFace Repositories Referenced

| Model | HuggingFace Repo | Notes |
|-------|-------------------|-------|
| Gemma 3 12B Text Encoder | `Lightricks/gemma-3-12b-it-qat-q4_0-unquantized` | **Ungated** -- no HF auth needed |
| LTX 2.3 Checkpoints | UNABLE TO DETERMINE FROM CODE | Not explicitly referenced in code; likely `Lightricks/LTX-Video-2.3` or similar -- needs manual verification |

### Download Commands

#### Gemma Text Encoder (confirmed from README)

```bash
pip install huggingface-hub

# Download Gemma (ungated, no auth needed)
huggingface-cli download Lightricks/gemma-3-12b-it-qat-q4_0-unquantized \
    --local-dir /models/gemma
```

Or via Python:
```python
from huggingface_hub import snapshot_download
snapshot_download('Lightricks/gemma-3-12b-it-qat-q4_0-unquantized', local_dir='/models/gemma')
```

#### LTX Checkpoints

The exact HuggingFace repo for LTX weights is **not specified in the code**. Based on the file naming convention (`ltx-2.3-*`), try:

```bash
# VERIFY THIS REPO ID -- not confirmed in code
huggingface-cli download Lightricks/LTX-Video-2.3 \
    --local-dir /models/ltx-2.3 \
    --include "ltx-2.3-22b-dev.safetensors" \
              "ltx-2.3-22b-distilled.safetensors" \
              "ltx-2.3-22b-distilled-lora-384.safetensors" \
              "ltx-2.3-spatial-upscaler-x2-1.1.safetensors"
```

> **ACTION REQUIRED:** Verify the correct HuggingFace repo for LTX model weights. Check `https://huggingface.co/Lightricks` for the exact repository name.

---

## 4. Environment Variables

| Variable | Default | Purpose | Source |
|----------|---------|---------|--------|
| `WORKER_AUTH_TOKEN` | `""` (empty = auth disabled) | Bearer token for `/generate` endpoint authentication | `config.py:4` |
| `LTX_MODEL_DIR` | `/models/ltx-2.3` | Path to LTX model checkpoint directory | `config.py:10` |
| `GEMMA_MODEL_DIR` | `/models/gemma` | Path to Gemma text encoder directory | `config.py:11` |
| `DEVICE` | `cuda` | PyTorch device string | `config.py:14` |
| `FP8_POLICY` | `fp8-cast` | Quantization policy: `"none"`, `"fp8-cast"`, or `"fp8-scaled-mm"` | `config.py:15` |
| `MAX_GENERATION_TIME` | `600` (seconds) | Timeout for a single generation request | `config.py:18` |
| `LOADED_PIPELINES` | `distilled` | Which pipelines to eagerly load: `"distilled"`, `"pro"`, `"keyframe"`, or `"all"` | `config.py:25` |
| `PYTORCH_CUDA_ALLOC_CONF` | `expandable_segments:True` | CUDA memory allocator config (set automatically) | `config.py:28` |

### Constants (not configurable via env)

| Constant | Value | Purpose |
|----------|-------|---------|
| `FIXED_FPS` | `24` | Output video frame rate |
| `RESOLUTION_DIVISOR` | `64` | Height padding alignment for two-stage pipelines |

---

## 5. Python Dependencies

### From `requirements.txt`

```
ltx-pipelines>=1.0.0
torchaudio>=2.11.0
transformers>=4.52,<5
accelerate
safetensors
huggingface-hub
sentencepiece
scipy>=1.14
einops
tqdm
triton
av
fastapi
uvicorn[standard]
python-multipart
Pillow
```

### Special Install Commands (from Dockerfile)

PyTorch and torchaudio require CUDA 12.8 wheels -- they must be installed from a specific index URL **before** other dependencies:

```bash
pip install torch==2.11.0 torchaudio==2.11.0 --index-url https://download.pytorch.org/whl/cu128
```

Then `ltx-pipelines` (which pulls `ltx-core` as a dependency):

```bash
pip install ltx-pipelines==1.0.0
```

Then remaining dependencies:

```bash
pip install -r requirements.txt
```

### System Dependencies (from Dockerfile)

- `ffmpeg` -- required by `postprocess.py` for video cropping/trimming
- `git` -- needed for pip installs from git repos
- `curl` -- used in health check

### Python Version

**Python 3.12** (Ubuntu 24.04 ships with it; confirmed in README)

### Critical Version Constraints

- `transformers>=4.52,<5` -- version 5.x breaks `Gemma3TextConfig.rope_local_base_freq`
- `triton` on Linux, `triton-windows` on Windows (Linux is the deployment target)

---

## 6. Startup Command

```bash
uvicorn src.app:app --host 0.0.0.0 --port 8080
```

**Source:** `Dockerfile:39`

- **App object:** `src.app:app` (FastAPI instance)
- **Default port:** `8080`
- **Model loading:** Happens automatically in a background thread on startup via the `lifespan` handler (`src/app.py:27-43`)
- The worker accepts requests at `/generate` only after model loading completes

### Required Environment Variables for Production

```bash
export WORKER_AUTH_TOKEN="your-secret-token"   # Required for security
export LTX_MODEL_DIR="/models/ltx-2.3"         # Default; set if models are elsewhere
export GEMMA_MODEL_DIR="/models/gemma"          # Default; set if models are elsewhere
export FP8_POLICY="fp8-cast"                    # Required for <=32GB VRAM GPUs
export LOADED_PIPELINES="distilled"             # Or "all" to preload everything
```

---

## 7. Health Check

**Endpoint:** `GET /health` (no authentication required)

**Response fields:**

```json
{
    "status": "healthy | loading",
    "gpu": "NVIDIA ...",
    "vram_total_gb": 32.0,
    "vram_free_gb": 8.5,
    "model_loaded": true,
    "pipelines_loaded": ["Distilled", "TI2VidTwoStages", "KeyframeInterpolation"],
    "queue_depth": 0,
    "uptime_seconds": 120
}
```

| Field | Type | Description |
|-------|------|-------------|
| `status` | string | `"healthy"` if models loaded, `"loading"` if still initializing |
| `gpu` | string | GPU device name from CUDA |
| `vram_total_gb` | float | Total VRAM in GB |
| `vram_free_gb` | float | Available VRAM (total minus allocated) |
| `model_loaded` | bool | Whether `LTXInference.load()` completed |
| `pipelines_loaded` | list[str] | Names of currently loaded pipelines |
| `queue_depth` | int | `1` if a generation is in progress, else `0` |
| `uptime_seconds` | int | Seconds since worker started |

**Dockerfile health check:** `curl -f http://localhost:8080/health || exit 1` (every 30s, 10s timeout, 3 retries)

---

## 8. Complete Setup Script

```bash
#!/bin/bash
# ============================================================================
# GPU Worker Setup Script
# Generated from lokigod69/ltx-worker source code analysis (2026-04-14)
# Run this on a fresh RunPod pod with a network volume mounted at /workspace
# ============================================================================
set -euo pipefail

echo "=== LTX GPU Worker Setup ==="
echo "Started: $(date)"

# ----------------------------------------------------------------------------
# Step 0: Configuration
# ----------------------------------------------------------------------------
REPO_URL="https://github.com/lokigod69/ltx-worker.git"
REPO_DIR="/workspace/ltx-worker"
MODEL_BASE="/workspace/models"
LTX_MODEL_DIR="${MODEL_BASE}/ltx-2.3"
GEMMA_MODEL_DIR="${MODEL_BASE}/gemma"

# Set your auth token (change this!)
WORKER_AUTH_TOKEN="${WORKER_AUTH_TOKEN:-changeme}"

# ----------------------------------------------------------------------------
# Step 1: System Dependencies
# ----------------------------------------------------------------------------
echo ""
echo "=== Step 1: System Dependencies ==="
apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    git \
    curl \
    python3 \
    python3-pip \
    python3-venv \
    && rm -rf /var/lib/apt/lists/*

# ----------------------------------------------------------------------------
# Step 2: Clone Repository
# ----------------------------------------------------------------------------
echo ""
echo "=== Step 2: Clone Repository ==="
if [ -d "$REPO_DIR" ]; then
    echo "Repo already exists at $REPO_DIR, pulling latest..."
    cd "$REPO_DIR" && git pull
else
    git clone "$REPO_URL" "$REPO_DIR"
fi

# ----------------------------------------------------------------------------
# Step 3: Install Python Dependencies
# ----------------------------------------------------------------------------
echo ""
echo "=== Step 3: Python Dependencies ==="

# PyTorch with CUDA 12.8 (must be installed first)
pip install --break-system-packages \
    torch==2.11.0 \
    torchaudio==2.11.0 \
    --index-url https://download.pytorch.org/whl/cu128

# ltx-pipelines (pulls ltx-core as dependency)
pip install --break-system-packages ltx-pipelines==1.0.0

# Remaining dependencies
pip install --no-cache-dir --break-system-packages -r "${REPO_DIR}/requirements.txt"

# ----------------------------------------------------------------------------
# Step 4: Download Models
# ----------------------------------------------------------------------------
echo ""
echo "=== Step 4: Download Models ==="

mkdir -p "$LTX_MODEL_DIR"
mkdir -p "$GEMMA_MODEL_DIR"

# 4a. Gemma Text Encoder (ungated, no auth needed)
echo "Downloading Gemma 3 12B text encoder..."
huggingface-cli download \
    Lightricks/gemma-3-12b-it-qat-q4_0-unquantized \
    --local-dir "$GEMMA_MODEL_DIR"

# 4b. LTX Model Checkpoints
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
# ACTION REQUIRED: Verify the correct HuggingFace repo ID below.
# The repo ID is NOT specified in the worker code.
# Check https://huggingface.co/Lightricks for the exact repo.
# !!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!
LTX_HF_REPO="Lightricks/LTX-Video-2.3"  # <-- VERIFY THIS

echo "Downloading LTX 2.3 checkpoints from ${LTX_HF_REPO}..."
echo "WARNING: This is approximately 80-100+ GB. Ensure sufficient disk space."

huggingface-cli download "$LTX_HF_REPO" \
    --local-dir "$LTX_MODEL_DIR" \
    --include "ltx-2.3-22b-dev.safetensors" \
              "ltx-2.3-22b-distilled.safetensors" \
              "ltx-2.3-22b-distilled-lora-384.safetensors" \
              "ltx-2.3-spatial-upscaler-x2-1.1.safetensors"

# ----------------------------------------------------------------------------
# Step 5: Verify Model Files Exist
# ----------------------------------------------------------------------------
echo ""
echo "=== Step 5: Verify Model Files ==="
MISSING=0
for f in \
    "${LTX_MODEL_DIR}/ltx-2.3-22b-dev.safetensors" \
    "${LTX_MODEL_DIR}/ltx-2.3-22b-distilled.safetensors" \
    "${LTX_MODEL_DIR}/ltx-2.3-22b-distilled-lora-384.safetensors" \
    "${LTX_MODEL_DIR}/ltx-2.3-spatial-upscaler-x2-1.1.safetensors" \
    "${GEMMA_MODEL_DIR}/config.json"
do
    if [ -f "$f" ]; then
        SIZE=$(du -sh "$f" | cut -f1)
        echo "  OK: $f ($SIZE)"
    else
        echo "  MISSING: $f"
        MISSING=$((MISSING + 1))
    fi
done

if [ "$MISSING" -gt 0 ]; then
    echo ""
    echo "ERROR: $MISSING model file(s) missing. Fix downloads before starting."
    exit 1
fi

# ----------------------------------------------------------------------------
# Step 6: Set Environment Variables
# ----------------------------------------------------------------------------
echo ""
echo "=== Step 6: Environment Variables ==="
export WORKER_AUTH_TOKEN="$WORKER_AUTH_TOKEN"
export LTX_MODEL_DIR="$LTX_MODEL_DIR"
export GEMMA_MODEL_DIR="$GEMMA_MODEL_DIR"
export DEVICE="cuda"
export FP8_POLICY="fp8-cast"
export MAX_GENERATION_TIME="600"
export LOADED_PIPELINES="distilled"

echo "  WORKER_AUTH_TOKEN=****"
echo "  LTX_MODEL_DIR=$LTX_MODEL_DIR"
echo "  GEMMA_MODEL_DIR=$GEMMA_MODEL_DIR"
echo "  DEVICE=$DEVICE"
echo "  FP8_POLICY=$FP8_POLICY"
echo "  MAX_GENERATION_TIME=$MAX_GENERATION_TIME"
echo "  LOADED_PIPELINES=$LOADED_PIPELINES"

# ----------------------------------------------------------------------------
# Step 7: Launch Worker
# ----------------------------------------------------------------------------
echo ""
echo "=== Step 7: Launch Worker ==="
echo "Starting uvicorn on port 8080..."
cd "$REPO_DIR"
uvicorn src.app:app --host 0.0.0.0 --port 8080
```

---

## API Quick Reference

### POST `/generate` (multipart form)

**Headers:** `Authorization: Bearer <WORKER_AUTH_TOKEN>`

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `prompt` | string | Yes | -- | Text prompt for generation |
| `negative_prompt` | string | Yes | -- | Negative prompt (ignored by Distilled pipeline) |
| `duration` | int | Yes | -- | Video duration in seconds (3-20) |
| `resolution` | string | No | `1080p` | `1080p`, `1440p`, or `2160p` |
| `seed` | int | No | `-1` | Random seed (-1 = random) |
| `quality` | string | No | `pro` | `fast` (Distilled) or `pro` (TI2VidTwoStages) |
| `job_id` | string | No | `""` | Tracking ID |
| `scene_number` | int | No | `0` | Scene tracking number |
| `image` | file | No | None | Start frame image (enables I2V mode) |
| `end_image` | file | No | None | End frame image (enables keyframe interpolation; requires `image`) |

**Success:** `200` with `video/mp4` stream + metadata in `X-*` response headers.
**Busy:** `503` with `Retry-After` header.
**Error:** `4xx`/`5xx` JSON with `status`, `error`, `generation_time_seconds`, `retryable` fields.

---

## GPU Recommendations

| GPU | VRAM | FP8 Viable | Notes |
|-----|------|------------|-------|
| A100 80GB | 80 GB | Yes | Best fit, all pipelines comfortable |
| A6000 / L40S | 48 GB | Yes | Recommended minimum for reliability |
| RTX 5090 | 32 GB | Yes | Confirmed working; Gemma (24.5GB) is tight |
| RTX 4090 | 24 GB | Marginal | Gemma alone uses 24.5GB; may OOM |

**FP8 quantization is REQUIRED on GPUs with <=32GB VRAM.** Set `FP8_POLICY=fp8-cast`.

---

## Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `/health` returns `"status": "loading"` indefinitely | Model files missing or corrupt | Check logs; verify all 4 LTX files + Gemma dir exist |
| CUDA OOM on generation | Insufficient VRAM | Use `FP8_POLICY=fp8-cast`; reduce resolution; use `quality=fast` |
| `transformers` import error about `rope_local_base_freq` | transformers 5.x installed | Pin to `transformers>=4.52,<5` |
| `triton` import error | Wrong triton package | Linux: `pip install triton`; Windows: `pip install triton-windows` |
| ffmpeg crop/trim failed | ffmpeg not installed | `apt-get install ffmpeg` |
