# Investigation Results: Video Engine Multi-Scene Dispatch & Frame Transitions

**Date:** 2026-03-09
**Status:** Read-only investigation — no code changes made

---

## Part A: Orchestrator Video Dispatch

### Q1: Where does the orchestrator dispatch to the Video Engine?

**File:** `src/pipeline.py:358-381`

The `run_stage()` function handles the video stage at line 358. It calls `build_video_payloads()` (line 362) to get a list of payloads, then loops through them sequentially (lines 367-369):

```python
payloads = build_video_payloads(word_dir, manifest_data, settings, output_dir, images_version)
if not payloads:
    raise PipelineError("No images found in selected image set.")

results = []
for vp in payloads:
    vresult = await call_engine('video', vp)
    results.append(vresult)
```

### Q2: How does the orchestrator read the storyboard?

**YES — it iterates all scenes.**

**File:** `src/pipeline.py:133-236` (`build_video_payloads()`)

The function:
1. Opens `storyboard.json` from the selected images version directory (lines 142-148)
2. Extracts `scenes = storyboard.get("scenes", [])`
3. Finds all PNG files via two glob passes: first `scene_*.png`, then `*.png` (deduplicating, excluding thumbs) (lines 151-160)
4. Iterates over **all** image files, pairing each with its corresponding scene from the storyboard (lines 206-234)

### Q3: Is there any early-exit logic?

**NO — there is no early exit.** The orchestrator correctly:
- Builds payloads for ALL images (line 208: `for i, image_path in enumerate(image_files)`)
- Dispatches ALL payloads sequentially (line 367-369: `for vp in payloads`)
- Tracks partial success (lines 372-374: `any_success` / `all_success`)

**The orchestrator multi-scene dispatch logic appears correct.** If only scene 1 gets a video, the bug is likely elsewhere (e.g., image files not being found, engine error on scene 2, or the image glob not matching the actual filenames).

### Q4: What payload does the orchestrator send per scene?

**Standard mode (no frame transitions) — `pipeline.py:206-234`:**

For scene 1 (i=0):
```python
content.image_path = str(image_files[0])  # e.g., ".../images/literal-001_.../001.png"
content.scene_number = 1
settings.video_prompt = scenes[0].get("video_prompt", "")
```

For scene 2 (i=1):
```python
content.image_path = str(image_files[1])  # e.g., ".../images/literal-001_.../002.png"
content.scene_number = 2
settings.video_prompt = scenes[1].get("video_prompt", "")
```

**Image path correctness:** The glob at lines 153-160 looks for `scene_*.png` first, then `*.png`. The Image Engine actually writes files as `001.png`, `002.png` (NOT `scene_001.png`). So:
- The `scene_*.png` glob matches **nothing** (the image engine uses `NNN.png` not `scene_NNN.png`)
- The `*.png` fallback glob correctly picks up `001.png`, `002.png`
- This works but is a minor naming inconsistency

**Missing field:** `camera_motion` from the storyboard is **NOT** passed in the payload `content` block. It only exists in `storyboard.json` but the orchestrator never extracts `scene.get("camera_motion")`. The `video_prompt` IS extracted, but `camera_motion` is silently dropped. This only matters for Ken Burns mode (which reads `content.camera_motion`).

### Q5: Parallelism or sequencing?

**Sequential.** The orchestrator dispatches one scene at a time:
```python
for vp in payloads:
    vresult = await call_engine('video', vp)  # awaits each before next
    results.append(vresult)
```
Scene 1 must complete before scene 2 starts. No parallelism.

---

## Part B: Frame Transitions (end_image_url)

### Q6: All occurrences of end_image / frame_transitions

| File | Lines | What |
|------|-------|------|
| `orchestrator/src/settings.py` | 43 | `"frame_transitions": False` in DEFAULT_SETTINGS |
| `orchestrator/src/pipeline.py` | 163, 170, 191 | Reads `frame_transitions`, gates `use_transitions`, sets `end_image_path` |
| `orchestrator/frontend/.../fieldConfigs.ts` | 83 | Toggle UI: `frame_transitions`, condition: LTX only |
| `engines/video-engine/src/models.py` | 34, 141 | `end_image_path: Optional[str]` on VideoContent and GenerationMetaInputs |
| `engines/video-engine/src/engine.py` | 282-283 | Records `transition` and `end_image_path` in generation-meta.json |
| `engines/video-engine/src/adapters/ltx.py` | 10, 90-92, 109-110 | Uploads end image, passes `end_image_url` to Fal.ai API |
| `engines/video-engine/src/adapters/ken_burns.py` | 81-83 | Warns and ignores `end_image_path` |
| `engines/video-engine/src/adapters/kling.py` | 87-89 | Warns and ignores `end_image_path` |
| `engines/video-engine/tests/test_models.py` | 114-226 | Tests for `end_image_path` field |
| `engines/video-engine/tests/test_ltx.py` | 98-123 | Tests for `end_image_url` inclusion/exclusion in Fal API call |

### Q7: LTX adapter end_image_url implementation

**YES — fully implemented.** File: `engines/video-engine/src/adapters/ltx.py:89-110`

```python
end_image_url = None
if content.end_image_path:
    end_image_url = upload_image(content.end_image_path)
# ... later ...
if end_image_url:
    arguments["end_image_url"] = end_image_url
```

The LTX adapter:
1. Checks if `content.end_image_path` is set (not None)
2. Uploads the end image to Fal.ai storage
3. Includes `end_image_url` in the Fal API arguments

### Q8: frame_transitions toggle

**YES — exists and is wired up.**

- **Default:** `False` — defined in `orchestrator/src/settings.py:43`
- **Frontend UI:** Toggle in `fieldConfigs.ts:83`, only shown for LTX modes
- **Passed to Video Engine:** Indirectly — the orchestrator uses `frame_transitions` to decide whether to add `end_image_path` to the payload content. The boolean itself is passed inside `settings` but is not used by the video engine; the engine only checks for `content.end_image_path`.

### Q9: Full trace when frame_transitions is ON

**The implementation is COMPLETE. Here's the full path:**

1. **Settings resolution** (`pipeline.py:163`): `frame_transitions = settings.get("frame_transitions", False)`
2. **Gate check** (`pipeline.py:169-173`):
   ```python
   use_transitions = (
       frame_transitions
       and video_mode in ("ltx_fast", "ltx_pro")
       and len(image_files) >= 2
   )
   ```
3. **Payload construction** (`pipeline.py:176-205`): When `use_transitions` is True, creates N-1 payloads (not N) pairing consecutive images:
   - Payload 1: `image_path=001.png`, `end_image_path=002.png`, `scene_number=1`
   - (If 3 images: Payload 2: `image_path=002.png`, `end_image_path=003.png`, `scene_number=2`)
4. **Dispatch** (`pipeline.py:367-369`): Each payload sent sequentially to Video Engine
5. **Video Engine receives** (`models.py:34`): `content.end_image_path` is an Optional[str] field
6. **LTX adapter** (`ltx.py:90-92`): Uploads end image to Fal storage
7. **Fal API call** (`ltx.py:109-110`): `arguments["end_image_url"] = end_image_url`

### Q10: What's missing?

**The `end_image_url` / frame transitions implementation is COMPLETE end-to-end.**

Nothing is missing in the code path. If it's "not working," the issue is likely:
- `frame_transitions` is defaulting to `False` and not being enabled in settings
- The video mode is not LTX (Ken Burns and Kling both warn and ignore `end_image_path`)
- There are fewer than 2 images (the gate requires `len(image_files) >= 2`)

---

## Part C: Video Engine Output

### Q11: Output filenames

**File:** `engines/video-engine/src/engine.py:87-89`

```python
scene_num = payload.content.scene_number
video_filename = f"scene_{scene_num:03d}.mp4"
thumb_filename = f"scene_{scene_num:03d}_thumb.jpg"
```

Output: `scene_001.mp4`, `scene_002.mp4`, `scene_001_thumb.jpg`, etc.

### Q12: Does Assembly correctly pick up multiple clips?

**YES — but the orchestrator, not the assembly engine, resolves clip paths.**

**Orchestrator** (`pipeline.py:257`):
```python
video_clips = sorted([str(f) for f in video_dir.glob("scene_*.mp4")])
```
This globs for `scene_*.mp4` in the video version directory and passes the sorted list to the Assembly Engine.

**Assembly Engine** (`assembly-engine/src/engine.py:90`, `models.py:27`):
```python
video_clips: list[str] = Field(..., min_length=1, description="Ordered list of MP4 clip paths")
# ...
for clip_path in payload.content.video_clips:
    info = ffmpeg_builder.probe_media(clip_path)
```

The assembly engine iterates ALL provided clip paths, probes each, skips invalid ones with a warning, and uses all valid clips for timing and concatenation.

---

## Summary & Assessment

### What's working correctly (in code):
1. **Multi-scene dispatch logic is correct.** `build_video_payloads()` iterates ALL images, builds a payload per image, and `run_stage()` dispatches ALL payloads sequentially.
2. **Frame transitions (end_image_url) are fully implemented** end-to-end: orchestrator → video engine → LTX adapter → Fal.ai API.
3. **Assembly engine correctly handles multiple clips** via the `video_clips` list provided by the orchestrator.

### Potential issues to investigate:

| # | Issue | Severity | Location |
|---|-------|----------|----------|
| 1 | **`camera_motion` not passed to video engine.** The storyboard contains per-scene `camera_motion` objects, but `build_video_payloads()` never extracts them into `content.camera_motion`. Ken Burns mode will always get `camera_motion=None` and fall back to `"static"` motion. | **Medium** | `pipeline.py:180-183, 210-213` |
| 2 | **`video_prompt` placed in `settings` not `content`.** The orchestrator puts `video_prompt` inside `scene_settings` (a dict merged into `settings`), but the Video Engine model expects it in `content.video_prompt`. The Video Engine's `VideoContent.video_prompt` defaults to `""`, so scenes may get empty prompts. | **HIGH — likely root cause of scene 2 failure** | `pipeline.py:182, 212` vs `models.py:26-29` |
| 3 | **`frame_transitions` defaults to False.** If users don't explicitly enable it, transitions won't activate even when using LTX with 2+ images. | Low (by design) | `settings.py:43` |
| 4 | **Transition mode produces N-1 clips, not N.** With 2 images: 1 transition clip. With 3 images: 2 transition clips. This is semantically correct for transitions but means fewer clips than images. | Info (correct behavior) | `pipeline.py:178` |
| 5 | **Image glob mismatch.** `build_video_payloads()` first tries `scene_*.png` (which the image engine never produces), then falls back to `*.png`. Works correctly due to the fallback, but the first glob is dead code. | Low | `pipeline.py:153` |

### Critical finding — Issue #2 deep dive:

The `video_prompt` is placed in `scene_settings` (which becomes `payload.settings`):
```python
scene_settings = {
    **settings,
    "video_prompt": scene.get("video_prompt", ""),
}
```

But the Video Engine's Pydantic model expects `video_prompt` in `payload.content`:
```python
class VideoContent(BaseModel):
    video_prompt: str = Field(default="", ...)
```

The `VideoSettings` model does NOT have a `video_prompt` field. Pydantic will silently ignore extra fields in `settings`, so **the video prompt from the storyboard is being silently discarded.** The engine receives `content.video_prompt = ""` for every scene.

For Ken Burns mode, this doesn't matter (it doesn't use `video_prompt`). But for LTX and Kling modes, the engine validates that `video_prompt` is non-empty (`engine.py:196-201`) and **raises a ValueError**, causing the scene to fail. This would explain why scene 1 might work (if something else provides a prompt) but scene 2 fails — though actually, this bug affects ALL scenes equally.

**Wait — re-reading the validation:**
```python
if payload.settings.video_mode in ("ltx_fast", "ltx_pro", ...):
    if not payload.content.video_prompt.strip():
        raise ValueError("video_prompt is required...")
```

This means **all LTX/Kling scenes should fail** with empty `video_prompt`, not just scene 2. If scene 1 is succeeding, there must be another source of `video_prompt` (possibly from the settings merge putting it in the Pydantic `settings` extras, or from a different code path). This needs runtime testing to confirm.
