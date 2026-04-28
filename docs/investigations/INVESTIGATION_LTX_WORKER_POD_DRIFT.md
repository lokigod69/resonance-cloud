# LTX Worker Pod Drift Investigation

## Scope

Read-only investigation of drift between:

- Local repo: `d:\CODING\ResonanceTEST\ltx-worker`
- Expected repo commit: `22c837d3ec717687b740cdba70fe7e5b696d6d9c`
- Live pod target: `root@103.196.86.47:58335`

Constraints followed:

- No writes to the pod
n- No repo modifications
- No commits or git mutations in the repo
- No invented pod contents

## Access Result

Live pod capture was **blocked** because SSH to the provided endpoint failed with:

```text
ssh: connect to host 103.196.86.47 port 58335: Connection refused
```

This means the live worker filesystem, environment, installed packages, running uvicorn process environment, and model volume could **not** be inspected from this session.

Because the pod was unreachable, every live-side value below is marked **VERIFY** unless it comes from the local repo.

## Local Repo Baseline

Repo root inspected:

- `d:\CODING\ResonanceTEST\ltx-worker`

Local source files present under `src/`:

- `__init__.py`
- `app.py`
- `config.py`
- `inference.py`
- `postprocess.py`
- `rp_handler.py`

Local dependency sources inspected:

- `requirements.txt`
- `Dockerfile`

## Section 1: Files that exist on pod but differ from repo

**Status:** VERIFY - unable to capture pod file contents.

No file-by-file diff can be produced because `/workspace/ltx-worker/src/*.py` could not be read from the live pod.

### Local repo files that would have been compared

- `src/__init__.py`
- `src/app.py`
- `src/config.py`
- `src/inference.py`
- `src/postprocess.py`
- `src/rp_handler.py`

### Repo-side logic areas that are likely drift-sensitive

These are the specific local code paths that should be compared first once pod access is restored:

- `src/inference.py`
  - Scheduler reset and reconfiguration via `FlowMatchEulerDiscreteScheduler.from_config(...)`
  - LoRA loading via `load_lora_weights(...)` and `set_adapters(...)`
  - Layerwise casting via `apply_layerwise_casting(...)`
  - Two-stage generation using low-res latent generation + latent upsampler + second pass
  - Upsampler loading via `LTX2LatentUpsamplerModel.from_pretrained(...)`
  - Negative prompt threading in stage 1 and stage 2 calls
  - VAE decode/output dtype handling before `encode_video(...)`
- `src/config.py`
  - `DIFFUSERS_MODEL_DIR`
  - `UPSAMPLER_MODEL_DIR`
  - `LORA_DIR`
  - `WORKER_AUTH_TOKEN`
- `src/app.py`
  - Running uvicorn worker entrypoint and auth middleware
- `src/rp_handler.py`
  - Serverless entrypoint behavior and quality fallback logic

### Repo-side findings to verify against pod

From the local repo alone, the current code includes the following behaviors which should be explicitly checked on the pod once reachable:

- **Scheduler config**
  - Stage 1 resets to original scheduler config.
  - Stage 2 reconfigures scheduler with:
    - `use_dynamic_shifting=False`
    - `shift_terminal=None`
- **LoRA loading**
  - Local repo loads Stage 2 LoRA from `LORA_DIR`
  - Adapter name: `stage_2`
  - Adapter starts at weight `0.0`, then is enabled at `1.0` for stage 2
- **Layerwise casting**
  - Local repo enables `apply_layerwise_casting(...)` on the transformer with FP8 storage and BF16 compute
- **Two-stage pipeline**
  - Local repo constructs both `LTX2ImageToVideoPipeline` and shared-component `LTX2Pipeline`
  - Local repo performs stage 1 latent generation, then latent upsampling, then stage 2 denoise/decode
- **Upsampler loading**
  - Local repo loads `LTX2LatentUpsamplerModel` from `UPSAMPLER_MODEL_DIR/latent_upsampler`
- **Negative prompt handling**
  - Local repo passes `negative_prompt` in both stage 1 and stage 2 calls
  - Actual default negative prompt strength/value is not defined in repo code; it is caller-supplied
- **VAE decode dtype handling**
  - Local repo explicitly clips/casts returned frames to `uint8` before `encode_video(...)`
  - Inline note says decode may return `float32` in `[0, 255]` when layerwise casting is active

## Section 2: Files that exist in repo but not on pod (or vice versa)

**Status:** VERIFY - unable to list pod directory contents.

### Repo files known locally

- `src/__init__.py`
- `src/app.py`
- `src/config.py`
- `src/inference.py`
- `src/postprocess.py`
- `src/rp_handler.py`

### Pod-only or missing files

- **Pod-only files:** VERIFY
- **Repo-only files absent from pod:** VERIFY

No authoritative existence comparison is possible until `ls -la /workspace/ltx-worker/src/` succeeds on the live pod.

## Section 3: Dependency version drift table

**Status:** partial. Repo side is known; pod side is VERIFY because `pip freeze` and runtime version probes could not be executed.

| package | repo | pod | matches? |
|---|---|---|---|
| torch | `2.11.0` via Dockerfile | VERIFY | VERIFY |
| torchaudio | `2.11.0` via Dockerfile | VERIFY | VERIFY |
| torchvision | `0.26.0` via Dockerfile | VERIFY | VERIFY |
| diffusers | `git+https://github.com/huggingface/diffusers.git@71a6fd9f0df04d3764dfa999268a05d87903a85a` via Dockerfile | VERIFY | VERIFY |
| peft | installed via Dockerfile, version unpinned | VERIFY | VERIFY |
| transformers | `>=4.52,<5` via requirements.txt | VERIFY | VERIFY |
| accelerate | unpinned in requirements.txt | VERIFY | VERIFY |
| safetensors | unpinned in requirements.txt | VERIFY | VERIFY |
| huggingface-hub | unpinned in requirements.txt | VERIFY | VERIFY |
| sentencepiece | unpinned in requirements.txt | VERIFY | VERIFY |
| scipy | `>=1.14` via requirements.txt | VERIFY | VERIFY |
| einops | unpinned in requirements.txt | VERIFY | VERIFY |
| tqdm | unpinned in requirements.txt | VERIFY | VERIFY |
| triton | unpinned in requirements.txt | VERIFY | VERIFY |
| av | unpinned in requirements.txt | VERIFY | VERIFY |
| fastapi | unpinned in requirements.txt | VERIFY | VERIFY |
| uvicorn | `uvicorn[standard]` unpinned in requirements.txt | VERIFY | VERIFY |
| python-multipart | unpinned in requirements.txt | VERIFY | VERIFY |
| Pillow | unpinned in requirements.txt | VERIFY | VERIFY |
| runpod | unpinned in requirements.txt | VERIFY | VERIFY |

### Repo dependency notes

- The local repo explicitly expects:
  - CUDA base image: `nvidia/cuda:12.8.0-runtime-ubuntu24.04`
  - `ffmpeg`, `git`, `curl`, `python3`, `python3-pip`, `python3-venv`
- The local repo explicitly installs diffusers from git SHA `71a6fd9f0df04d3764dfa999268a05d87903a85a`
- Because the pod was unreachable, the following requested checks remain **VERIFY**:
  - full `pip freeze`
  - runtime import versions for `torch`, `diffusers`, `transformers`, `peft`
  - diffusers checkout commit hash
  - `python --version`
  - `ffmpeg -version | head -1`
  - `cat /etc/os-release`
  - `nvidia-smi`

## Section 4: Environment variables actually used by the running worker

**Status:** VERIFY - unable to inspect `/proc/<uvicorn_pid>/environ`.

### Variables referenced by local repo code

From local repo code, these env vars are consumed directly:

- `WORKER_AUTH_TOKEN`
- `LTX_MODEL_DIR`
- `GEMMA_MODEL_DIR`
- `DIFFUSERS_MODEL_DIR`
- `UPSAMPLER_MODEL_DIR`
- `LORA_DIR`
- `DEVICE`
- `MAX_GENERATION_TIME`
- `LOADED_PIPELINES`
- `JOB_TTL_SECONDS`
- `GPU_THREAD_DRAIN_TIMEOUT`

### Requested live env capture that could not be verified

The following live env subset could not be captured because the pod was unreachable:

- `DIFFUSERS_*`
- `UPSAMPLER_*`
- `LORA_*`
- `WORKER_*`
- `HF_*`

## Section 5: Model directory layout on the volume

**Status:** VERIFY - unable to read `/workspace/models`.

### Expected repo-referenced paths

The local repo expects these default model paths:

- `DIFFUSERS_MODEL_DIR=/workspace/models/ltx-2.3-diffusers`
- `UPSAMPLER_MODEL_DIR=/workspace/models/ltx-2.3-upsampler`
- `LORA_DIR=/workspace/models/loras`

### Requested live layout checks that could not be verified

- `find /workspace/models -maxdepth 3 -type d`
- `ls -la /workspace/models/ltx-2.3-diffusers/`
- `ls -la /workspace/models/ltx-2.3-upsampler/`

## Section 6: Anomalies, surprises, or things I couldn't verify

- **Primary blocker:** SSH endpoint `103.196.86.47:58335` returned `Connection refused`.
- **Pod data unavailable:** No live source files, environment, dependency list, or model directory listing could be captured.
- **No pod artifact files created:** Because no pod file contents were readable, no `pod_<filename>.py` dumps were generated.
- **No live-vs-repo diff possible:** The requested file-by-file modified/added/deleted line analysis requires actual pod source content.
- **No dependency mismatch list possible:** The pod-side package versions could not be collected.
- **Potential repo/runtime drift areas remain unverified:**
  - whether live pod still uses LoRA at all
  - whether live pod still uses layerwise FP8 casting at all
  - whether the live pod negative prompt default is hardcoded server-side
  - whether the live pod VAE decode path still requires explicit `uint8` conversion
  - whether the live pod code still matches the local two-stage latent-upsampler structure

## Recommended Next Step

Once SSH access is restored, rerun the investigation with the same target and collect:

1. `/workspace/ltx-worker/src/*.py`
2. `pip freeze`
3. runtime versions for `torch`, `diffusers`, `transformers`, `peft`
4. diffusers git SHA
5. running worker env subset from `/proc/<uvicorn_pid>/environ`
6. `/workspace/models` directory layout

After that, produce the final drift report with:

- exact file-by-file diffs
- repo vs pod dependency mismatch table
- confirmed env variables in use
- confirmed model volume layout
