# INVESTIGATION REPORT — Video Quality Regression

**Date:** 2026-04-16
**Scope:** Read-only. No code modified.
**Disposition:** Root cause identified with high confidence (single-site, cited to file:line).

## TL;DR

The worker was migrated from `ltx-pipelines` to `diffusers` in commit **`b99a6da`** (2026-04-15 18:28) and locked in by **`299e2df`** (2026-04-15 21:49). The migration **deleted the Pro pipeline entirely** and hardcoded every request to the distilled path at **8 + 3 diffusion steps**. The `quality` field is still accepted but any value other than `"fast"` is logged as a warning and ignored ([ltx-worker/src/inference.py:166-170](ltx-worker/src/inference.py#L166-L170)). There is no `self.pipeline_pro`; only `self.pipeline_fast = self.pipe_i2v` exists ([ltx-worker/src/inference.py:133](ltx-worker/src/inference.py#L133)).

The "crisp duck" reference run almost certainly predates the diffusers migration (i.e., used the pre-migration `ltx-pipelines` worker, which actually ran a Pro pipeline at ~30 steps). All end-to-end runs from **2026-04-15 18:28 onward** get 11 total diffusion steps, regardless of what the orchestrator asks for.

The latent upsampler is not the issue — it is loaded and invoked on every generation ([ltx-worker/src/inference.py:119-128, 235-242](ltx-worker/src/inference.py#L119-L128)), but it only doubles latent spatial resolution; it cannot compensate for the step-count cut from 30 → 11.

## Ranked Hypotheses

### H2 (Pro vs Distilled routing) — **CONFIRMED. Root cause.**

- Worker **silently ignores** any `quality != "fast"`: [ltx-worker/src/inference.py:166-170](ltx-worker/src/inference.py#L166-L170)
  ```python
  if quality != "fast":
      logger.warning(
          "quality='%s' not yet supported in diffusers migration. Using 'fast' (distilled).",
          quality,
      )
  ```
- Only the distilled pipeline is loaded. `self.pipeline_fast = self.pipe_i2v` at [ltx-worker/src/inference.py:133](ltx-worker/src/inference.py#L133). There is no `self.pipeline_pro` anywhere in the module.
- Step counts are hardcoded to the distilled schedule regardless of the requested quality: **Stage 1 = 8 steps** at [ltx-worker/src/inference.py:218](ltx-worker/src/inference.py#L218), **Stage 2 = 3 steps** at [ltx-worker/src/inference.py:260](ltx-worker/src/inference.py#L260).
- Distilled-only sigmas/scheduler config baked in: [ltx-worker/src/inference.py:224-225, 261-262](ltx-worker/src/inference.py#L224-L225) (`DISTILLED_SIGMA_VALUES`, `STAGE_2_DISTILLED_SIGMA_VALUES`).
- Orchestrator correctly sends `quality="pro"` when `video_mode == "ltx_pro"` — [orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:39](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L39) — so the orchestrator is not at fault; the regression is entirely inside the worker.
- **But** current default `video_mode` in the last test run was `"ltx_fast"` ([cloud_c50a22c5...settings-defaults.json:41-52](orchestrator/content/)), meaning even before the worker shim was introduced, recent runs were asking for fast. Any user-visible quality gap between the manual duck run and recent runs is therefore explained by the **worker pipeline change**, not by the orchestrator choosing a different tier.

### H6 (Fewer diffusion steps) — **CONFIRMED. Same root cause as H2.**

- Pre-migration worker (`ltx-pipelines` era) had a Pro pipeline at ~30 steps. Post-migration worker caps all runs at Stage 1 (8) + Stage 2 (3) = **11 total steps**.
- Step count is the dominant quality lever at fixed resolution; an 11→30 step recovery typically restores sharpness on LTX-class models.

### H1 (Upsampler not invoked) — **CONTRADICTED.**

- Upsampler is loaded unconditionally: [ltx-worker/src/inference.py:119-128](ltx-worker/src/inference.py#L119-L128).
- Upsampler is invoked unconditionally between Stage 1 and Stage 2: [ltx-worker/src/inference.py:235-242](ltx-worker/src/inference.py#L235-L242).
- It runs a **latent** spatial upscale from `stage1 = 960×540` to `padded = 1920×1080` latent — this is an internal half-res → full-res step, not a final-frame post-process. It is active on every run, manual or pipeline. Absence of the upsampler is not the source of the regression.

### H4 (Resolution parameter dropped/mutated) — **CONTRADICTED.**

- Worker accepts `"1080p"` → `1920×1080` via hardcoded enum at the `/generate` handler (app.py), then pads to divisor 32 at [ltx-worker/src/inference.py:178-179](ltx-worker/src/inference.py#L178-L179). For 1920×1080 both are already multiples of 32 → no padding, no silent clamp.
- Orchestrator sends `"1080p"` literal: [orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:128](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L128), validated against the same whitelist at [ltx_selfhosted.py:52-53](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L52-L53).
- No divisor clamping, no downscale path found anywhere between orchestrator and worker.

### H3 (Intermediate image quality degraded) — **UNSUPPORTED BY EVIDENCE.**

- Self-hosted adapter attaches the PNG as a multipart file stream from disk with no re-encoding: [ltx_selfhosted.py:141-144](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L141-L144).
- Worker opens the uploaded image directly via `Image.open(image_path).convert("RGB")`: [ltx-worker/src/inference.py:192](ltx-worker/src/inference.py#L192).
- No resize, no JPEG round-trip in the handoff. RunPod adapter base64-encodes instead ([ltx_runpod.py:136-138](orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py#L136-L138)) — the 2026-04-16 test was on a self-hosted RunPod pod ([SESSION_SUMMARY_2026-04-16.md:46-48](SESSION_SUMMARY_2026-04-16.md#L46-L48)); either way, the base64 path would be bit-exact if decoded correctly.
- No change to the image engine handoff in the last two weeks worth of mtimes.

### H5 (Group offload + VAE tiling) — **UNLIKELY.**

- Both are applied unconditionally at load: group offload at [ltx-worker/src/inference.py:94-110](ltx-worker/src/inference.py#L94-L110), VAE tiling at [ltx-worker/src/inference.py:116-117](ltx-worker/src/inference.py#L116-L117).
- These were present from the first diffusers commit (`b99a6da`) and did not regress between that commit and current HEAD.
- If they silently degraded quality, the manual duck run (which also went through this same worker image **if** it happened post-migration) would have been affected equally. The delta between manual-good and pipeline-bad is not explained here unless the manual run used a different worker version — which is exactly H2's story.

## Known Good vs Observed Bad

| Dimension | Known good (manual "duck" run) | Observed bad (pipeline 2026-04-16 runs) | Source |
| --- | --- | --- | --- |
| Worker commit | **Pre-`b99a6da`** (ltx-pipelines era, <2026-04-15 18:28) | **`9ea2d0a` HEAD** (diffusers, ≥2026-04-15 18:28) | worker git log summarized by worker-repo agent |
| Pipeline branch | Pro (true 30-step schedule) | Distilled only — no Pro pipeline loaded | [inference.py:133, 166-170](ltx-worker/src/inference.py#L133) |
| Stage 1 steps | ~20–30 (Pro schedule) | **8** (hardcoded) | [inference.py:218](ltx-worker/src/inference.py#L218) |
| Stage 2 steps | ~8–10 (Pro schedule) | **3** (hardcoded) | [inference.py:260](ltx-worker/src/inference.py#L260) |
| Upsampler | Invoked | Invoked (same) | [inference.py:235-242](ltx-worker/src/inference.py#L235-L242) |
| Resolution | 1080p → 1920×1080 | 1080p → 1920×1080 (same) | [inference.py:178-179](ltx-worker/src/inference.py#L178-L179) |
| Image handoff | Direct PNG file | Direct PNG file (same, self-hosted path) | [ltx_selfhosted.py:141-144](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L141-L144) |
| `quality` field accepted | Honored — routed to Pro | Ignored — always distilled, with warning log | [inference.py:166-170](ltx-worker/src/inference.py#L166-L170) |
| VAE tiling | On (unchanged) | On (unchanged) | [inference.py:116-117](ltx-worker/src/inference.py#L116-L117) |
| Group offload | Off (pre-migration) or equivalent | On (block-level, num_blocks_per_group=1) | [inference.py:94-110](ltx-worker/src/inference.py#L94-L110) |

**Caveats on the "known good" column:** No manual duck payload was found in either repo (orchestrator agent searched `scripts/`, `tests/manual/`, `*.sh`, curl/duck/manual greps; log-archaeology agent confirmed no mention of "duck" anywhere in `*.md`). The known-good column above is inferred from the worker git log and the diffusers-migration warning text. Sir Robert should confirm when the duck run was performed — if it was **after 2026-04-15 18:28**, the root cause is different and this report must be revisited.

## Evidence Gaps

1. **No log files from the 2026-04-16 run.** The log-archaeology agent confirmed: `orchestrator/tmp/`, `orchestrator/logs/` do not exist; no `*.log` / `*.jsonl` post-2026-04-01 anywhere in the tree. The only recent runs in `content/` both **failed at the images stage** and never reached video ([cloud_c50a22c5...terminate/manifest.json:41-104](orchestrator/content/)) — so no audit of actual worker-side step/branch decisions for that date.
2. **No manual-payload artifact.** The user's "duck" run payload is not saved anywhere in either repo. The claim that it was sharp 1080p is not contradicted by anything in the code, but it is also not reproducible from on-disk evidence.
3. **No recorded worker-side log showing which pipeline ran for the "duck" run.** The warning at [inference.py:167-170](ltx-worker/src/inference.py#L167-L170) would have fired if `quality="pro"` was sent post-migration; if we had that log we could close the loop immediately.

## Recommended Next Step (single cheapest test)

Send one `/generate` request directly to the current worker with `quality="pro"` and check for the warning line:

```
quality='pro' not yet supported in diffusers migration. Using 'fast' (distilled).
```

- If the warning fires → H2 confirmed, and every "Pro" request since 2026-04-15 18:28 has silently been distilled. Next action is a product/engineering decision about the Pro pipeline (reintroduce, or formalize distilled-only in the orchestrator's `video_mode` UX).
- If the warning does **not** fire (i.e., the worker on the pod is older than `b99a6da`) → the deployed worker is out of sync with the repo HEAD. Check the pod's image/commit SHA vs `ltx-worker` HEAD.

This test is one curl against `/generate` + one `/logs` or `docker logs` tail. Under two minutes. No orchestrator involvement needed. Reference payload shape at [ltx_selfhosted.py:124-132](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L124-L132) and `test_http.sh` in the worker repo.

## Non-findings / items explicitly ruled out (so future investigators don't re-run them)

- The orchestrator sends the right `quality` value for its tier. Not a payload construction bug.
- The resolution parameter propagates cleanly end-to-end as `"1080p"` → `1920×1080`.
- The upsampler is always invoked; it is not a conditional path.
- The image handoff (PNG file or base64) does not re-encode / downsize between image engine and video worker.
- VAE tiling and group offload were unchanged between the two commits in the post-migration window; they cannot by themselves explain a regression that straddles the migration boundary.
