# Investigation: Farmer Scene 1 Image Quality

**Investigator:** Claude (read-only investigation + 2 of 4 allowed regenerations)
**Date:** 2026-04-28
**Subject generation:** `farmer` / `Bauer`, deck `bd7bf232-7347-4215-8bb7-91781d806513`, run 2026-04-27 15:00 UTC

## TL;DR

The artifacts are **introduced by Wan at the still-rendering stage**, **not** by LTX during animation. The cause is the combination of `wan/2-7-image` (fast tier, 1K resolution) plus a SCALE-mode wide-shot composition that places the subject at small pixel area in the frame, while the photorealistic style vocabulary asks for fine-detail rendering ("subtle pores, natural skin texture, fine grain"). At 1K, Wan can't reconcile the two — small subject + fine-detail instruction → soft / mushy face. Scenes 2 and 3 don't fail because their subjects fill the frame.

**Recommended fix: route SCALE-mode wide-shot scenes to `wan/2-7-image-pro` (2K). Cost increase: +$0.016 per word generation (one scene at 2K instead of 1K).**

A secondary, non-fatal finding: Wan **ignores** the "extreme wide aerial overhead shot, ultra-wide lens" instruction in both 1K and 2K. It renders a medium-wide eye-level shot instead. The 2K fix produces a clean image but does not deliver the aerial framing the SCALE mode intends. That's a prompt-engineering question for a separate sprint (out of scope here per the brief).

---

## Pipeline bisection

The exact bisection point is at the **boundary between Wan and LTX**: the PNG that Kie/Wan returns is already softer for scene 1 than for scenes 2/3. LTX preserves that quality (with mild upscale to 1080p). The drop happens upstream of LTX.

```
storyboard prompt        Wan @ 1K          self-hosted LTX 1080p     assembly
 ─────────────────  ───────────────────  ───────────────────────  ──────────
 [composition: wide]   FACE IS ALREADY      preserves quality       lanczos
 [style: photoreal]   SOFT IN PNG ◀── ART   (slight upscale only)   downscale
                      IFACTS START HERE
```

## Source data used

I did not need to spend a regeneration on Hypothesis 1 because:

- The original Wan response URL was preserved in the `pipeline_events` row for scene 1's `render_scene` event. Kie temp files persist ~3 days; the farmer ran 2026-04-27 and the URL was still live today.
- I downloaded the **exact PNGs that Wan returned for the failing run**, all three scenes:
  - `scene_001_original.png` (1280×720, 2,039,873 bytes)
  - `scene_002_original.png` (1280×720, 1,964,408 bytes)
  - `scene_003_original.png` (1280×720, 1,780,897 bytes)
- I also downloaded the assembled video (`farmer/video.mp4` from Supabase) to check Hypothesis 4.

The `scene_001.png` upload-to-Supabase path (Addendum 3) had not yet landed when the farmer ran, so the only canonical source for these PNGs is the Kie temp URL preserved in the events row. The pipeline records this exhaustively and the data is intact.

Local artifact tree: `investigation_tmp/originals/`, `investigation_tmp/regens/`, `investigation_tmp/face_crops/`, `investigation_tmp/video_frames/`, `investigation_tmp/videos/`.

The exact compiled Wan prompt that was sent for scene 1:

> middle-aged Caucasian man with weathered tanned skin, short salt-and-pepper hair, wearing a red plaid flannel shirt, faded blue jeans, leather work gloves, sturdy brown boots, and wide-brimmed straw hat standing centered in field holding a hoe at ready in rolling wheat farmlands at golden hour sunset, clear blue sky, distant barn and silos. Composition: **extreme wide aerial overhead shot, ultra-wide lens, subject small but distinct at center**, shallow depth of field on horizon. Lighting: warm golden sunlight from low west horizon, soft diffused rays, low angle casting long shadows, warm color temperature. Materials: golden wheat stalks with fine grain texture, clumpy loamy soil paths, weathered wooden fence posts, denim weave on jeans. Mood: serene expansive, warm golds with deep sky blues and earthy browns. **documentary photography, available light, natural skin texture, subtle pores, unretouched candid quality, fine grain**.

## Hypothesis-by-hypothesis findings

### H1 — The still PNG returned by Wan is already bad. **CONFIRMED.**

Direct visual inspection of the three downloaded PNGs from the failing run:

- **Scene 1 (1K, aerial-wide prompt):** Subject occupies ~half the frame width; **face is roughly 80–100 px tall in a 720-px frame**. Face shows mushy eyes, smeared stubble, plasticy skin, soft jawline. Plaid pattern on shirt is sharp; wheat is sharp; only the face/skin areas are degraded.
- **Scene 2 (1K, eye-level medium close):** Face occupies ~30% of frame height. Eyes are crisp with iris detail, individual stubble hairs visible, skin pores natural, eyebrow strokes defined. Wan rendering at its best.
- **Scene 3 (1K, macro hand on soil):** No face. Leather glove grain, soil aggregates, wheat in background — all crisp.

Same model (`wan/2-7-image` fast, 1K), same word, same generation. Scene 1 is the only soft one. The failure correlates with **subject-occupies-small-area-of-frame**, not with the LTX stage.

The face crops (in `investigation_tmp/face_crops/`):
- `scene1_face_240px.png` (Wan original) — failing
- `scene2_face_320px.png` (Wan original) — clean baseline

### H2 — 1K resolution is insufficient for distant face rendering. **CONFIRMED.**

Regeneration at `wan/2-7-image-pro` (2K, request_id `ee66b17d3d87586eb32071ec7ec0c659`), same prompt verbatim:

- Output: 2560×1440 PNG, ~3.6 MB.
- The face in the 2K regen is **dramatically cleaner**: visible iris detail, defined eyelid creases, individual stubble hairs, sharp eyebrow strokes, anatomically convincing brow line. Quality matches the scene-2/scene-3 baseline.
- Composition is still NOT aerial overhead — Wan rendered another medium-wide eye-level shot. Same composition mismatch as 1K, but with adequate resolution the small-subject + fine-detail conflict resolves.

The face crops `scene1_orig_face_v2.png` (1K original) vs `h2_scene1_face_v2.png` (2K regen) are dispositive. The lift from 1K to 2K closes the quality gap fully.

### H3 — Wan struggles with extreme aerial overhead camera angle. **PARTIALLY confirmed (composition only) — quality cause is different.**

Two findings here, separable:

**H3a — Wan ignores aerial overhead wording.** This is true. Both the original 1K and the 2K regen rendered medium-wide eye-level shots despite the prompt explicitly asking for "extreme wide aerial overhead shot, ultra-wide lens." Wan never delivered the aerial framing in any of the three runs (original 1K, H2 2K, and H3 1K-eye-level). This is a Wan capability/training-bias issue: aerial overhead is a weak point regardless of resolution.

**H3b — Aerial vs eye-level wording is not the *quality* root cause.** Regeneration at `wan/2-7-image` 1K with composition rewritten to "wide eye-level shot, standard 35mm lens, subject centered at human distance, shallow depth of field on horizon" (request_id `579d048ea4f2c58bdacac42d537736aa`) produced a **clean** result at 1K. Why? Because the eye-level wording brought the camera closer in Wan's interpretation, the face landed at ~140 px tall instead of ~80 px, and the photorealistic detail vocab rendered cleanly. The fix here is incidental — it's still about subject pixel coverage, not aerial-vs-eye-level per se.

So: the *composition mismatch* (Wan-can't-do-aerial) is real, but it's a separate concern from the *quality artifact*. The artifact is fundamentally a 1K resolution + small subject + fine-detail instructions issue.

### H4 — LTX is degrading the still during the i2v pipeline. **NOT confirmed; LTX is approximately quality-neutral.**

Comparison: `scene_001_original.png` (Wan input to LTX) vs the LTX-output frame extracted from `farmer/video.mp4` mid scene-1 (`investigation_tmp/video_frames/at_3s.png`):

- LTX upscales the 1280×720 input to 1920×1080. The output frame quality is roughly comparable to the input — softness is preserved, not amplified meaningfully. The face stays mushy in the same way it was mushy in the input.
- Self-hosted LTX adapter [orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:164-167](orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py#L164-L167) sends the saved PNG as-is via multipart upload. No resampling on the orchestrator side; transformations happen inside the GPU worker (1080p output).
- Conclusion: even if LTX adds some amount of perceptual softness during the i2v generation, it is **not** the originator of the artifacts. The Wan PNG was already soft on the face before LTX touched it.

Hypothesis 4 is therefore not the action item; do not change LTX adapter config to fix this symptom.

## Why scene 1 fails and 2/3 don't (root cause)

Three constraints collide for scene 1 specifically:

1. **SCALE-mode wide shot.** The composition prompt says "subject small but distinct at center" — Wan obeys "small" (even when it ignores "aerial overhead") and renders the man occupying only a portion of the frame.
2. **Photorealistic style vocabulary.** The renderer's compile_scene_to_text appends to every photorealistic prompt: "documentary photography, available light, natural skin texture, **subtle pores, unretouched candid quality, fine grain**." (See [orchestrator/cloud_engines/image_engine/prompt_compiler.py:9-12](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L9-L12).) This asks the model to render fine skin texture detail.
3. **1K resolution.** [orchestrator/cloud_engines/image_engine/wan_provider.py:93](orchestrator/cloud_engines/image_engine/wan_provider.py#L93) forces fast-tier to 1K. At 1K and 16:9, the canvas is 1280×720; a small-in-frame face lands at 80–100 px tall.

At 80×100 px, "subtle pores + fine grain" cannot render coherently — there are simply not enough pixels for the detail instruction. Wan compromises with a smeared, plasticy face. Scenes 2 and 3 don't hit this wall: scene 2's face is ~3× the linear pixel density, and scene 3 has no face.

The two empirical fixes confirm this read directly:
- **Increase the pixel budget** (H2: 2K) → enough pixels for the detail vocab, face cleans up.
- **Increase the subject's frame coverage** (H3: eye-level wording) → enough pixels on the face, face cleans up.

Both work for the *same underlying reason*. This is a resolution-vs-detail-instruction conflict, not an aerial-camera-angle limit.

## Recommended fix

**Route SCALE-mode wide-shot scenes to `wan/2-7-image-pro` (2K).** Specifically:

- In SCALE mode the storyboard generates an explicit aerial/wide scene per the SCALE-mode body in [orchestrator/cloud_engines/image_engine/prompts.py:600-619](orchestrator/cloud_engines/image_engine/prompts.py#L600-L619). That scene is the one that hits the artifact every time.
- Detect either by mode + scene index (the wide scene), or by a keyword scan on `image_prompt.composition` for "wide" / "aerial" / "panoramic" / "subject small". Bump that scene to `wan_pro`. Leave the human-level and macro scenes on `wan_fast`.

Why this fix and not the alternatives:

- **Don't widen the photoreal vocab.** Editing the photorealistic style vocabulary to drop "subtle pores / fine grain" would regress scene 2 and 3, which depend on those terms to deliver their excellent close-shot quality. The vocab is correct; it just over-reaches at 1K with small subjects.
- **Don't rewrite the SCALE-mode prompt.** The brief prohibits modifying the SCALE-mode body. Also, doing so would lose the "Powers of Ten" scale-shift that defines the mode — the wide shot is supposed to be wide.
- **Don't act on Hypothesis 4.** LTX is not the artifact source. Adapter changes there would not fix the symptom and could regress the working scenes.

### Cost implication

- `wan/2-7-image` (fast, 1K): $0.024 per image
- `wan/2-7-image-pro` (quality, 2K): $0.040 per image
- One additional 2K render per word generation: **+$0.016 per word**.

For a 3-scene SCALE-mode word, the per-word total moves from 3 × $0.024 = $0.072 to (1 × $0.040) + (2 × $0.024) = $0.088, a **+22% increase on the image-render line item only**. Negligible against full-pipeline cost (concept LLM, song, LTX video, assembly).

Routing all three scenes to wan_pro indiscriminately would cost +$0.048 per word (3 × $0.040 = $0.120) — also acceptable if simpler routing is preferred. Recommend the targeted version.

## Secondary observation (out of scope, but worth flagging)

Wan never produced an aerial overhead shot for scene 1 across three independent runs (original 1K, H2 2K, H3 1K-eye-level). The composition string "extreme wide aerial overhead shot, ultra-wide lens, subject small but distinct at center" was overridden every time to a medium-wide eye-level frame. The 2K fix delivers a *clean* image but **not** the aerial framing the SCALE mode intends.

If Sir Robert wants the actual top-down geometry the SCALE mode promises, that's a prompt-engineering question for a separate sprint (different phrasing — "drone shot from 100 m altitude," "bird's-eye view, perpendicular to ground," etc.). The brief explicitly excludes touching the SCALE-mode body in this investigation, so this stays as an observation, not a fix.

## Tests run / not run

- **Hypothesis 1 — PNG inspection.** Tested without spending a regeneration (Kie temp URL still live).
- **Hypothesis 2 — 2K resolution.** Tested via 1 regeneration (`wan/2-7-image-pro`, request_id `ee66b17d3d87586eb32071ec7ec0c659`). Cost ~$0.04.
- **Hypothesis 3 — eye-level wording at 1K.** Tested via 1 regeneration (`wan/2-7-image`, request_id `579d048ea4f2c58bdacac42d537736aa`). Cost ~$0.024.
- **Hypothesis 4 — LTX degradation.** Tested without spending a regeneration (compared the saved Wan PNG to a frame extracted from the assembled video).

Total: 2 regenerations of the 4-budget. ~$0.064 spent.

## Reproduction artifacts

All preserved under `investigation_tmp/`:
- `originals/scene_001_original.png`, `scene_002_original.png`, `scene_003_original.png` — exact PNGs from the failing run.
- `regens/scene1_h2_2k_pro.png` — H2 (2K, original wording) regen.
- `regens/scene1_h3_1k_eyelevel.png` — H3 (1K, eye-level wording) regen.
- `videos/farmer_assembled.mp4` — final assembled video for the failing run.
- `video_frames/at_*.png` — frames extracted from the assembled video.
- `face_crops/*` — apples-to-apples face-region crops at matching coordinates for direct visual comparison.
- `find_bauer_pngs.py`, `list_storage.py`, `fetch_farmer_event.py`, `fetch_original_pngs.py`, `regen_scene1.py` — investigation scripts (read-only against Supabase + Kie; the regen script invokes `render_scene_wan` directly without modifying any pipeline code).

## Stop point

Investigation complete per the brief. No code changes proposed beyond the recommended fix above. Awaiting direction before any implementation.
