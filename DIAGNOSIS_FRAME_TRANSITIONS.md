# Diagnosis: Frame Transitions & Standard Video Path

## Investigation A: Frame Transition Path — Why is video_prompt empty?

### Current code in `if use_transitions:` branch (pipeline.py:170-197)

```python
if use_transitions:
    # N-1 transition payloads pairing consecutive images
    for i in range(len(image_files) - 1):
        scene = scenes[i] if i < len(scenes) else {}
        payload = {
            "content": {
                "word": manifest_data.word_original,
                "translation": manifest_data.translation,
                "language": manifest_data.language,
                "language_code": manifest_data.language_code,
                "image_path": str(image_files[i]),
                "end_image_path": str(image_files[i + 1]),
                "scene_number": i + 1,
                "video_prompt": scene.get("video_prompt", ""),       # <-- HERE
                "camera_motion": scene.get("camera_motion", None),
            },
            "settings": settings,                                     # <-- SHARED
            "output_dir": str(output_dir),
            "metadata": { ... }
        }
        payloads.append(payload)
```

### Current code in standard (else) branch (pipeline.py:198-224)

```python
else:
    # Standard: one payload per image
    for i, image_path in enumerate(image_files):
        scene = scenes[i] if i < len(scenes) else {}
        payload = {
            "content": {
                "word": manifest_data.word_original,
                "translation": manifest_data.translation,
                "language": manifest_data.language,
                "language_code": manifest_data.language_code,
                "image_path": str(image_path),
                "scene_number": i + 1,
                "video_prompt": scene.get("video_prompt", ""),       # <-- HERE
                "camera_motion": scene.get("camera_motion", None),
            },
            "settings": settings,                                     # <-- SHARED
            "output_dir": str(output_dir),
            "metadata": { ... }
        }
        payloads.append(payload)
```

### Root Cause: Contract Mismatch

The Video Engine's `/run` endpoint has its OWN Pydantic models (in `engines/video-engine/ui/app.py`) that differ from the engine's internal models:

**`RunContent` (web layer — what the engine receives):**
```python
class RunContent(BaseModel):
    word: str
    translation: str
    language: str
    language_code: str = ""
    image_path: str
    scene_number: int = 1
    # NO video_prompt
    # NO end_image_path
    # NO camera_motion
```

**`RunSettings` (web layer):**
```python
class RunSettings(BaseModel):
    video_mode: str = "ken_burns"
    duration: int = 5
    resolution: str = "1080p"
    fps: int = 25
    video_prompt: str = ""           # <-- Engine reads it FROM HERE
    negative_prompt: str = "..."
    cfg_scale: float = 0.5
    seed: int = -1
    motion_type: str = "slow_zoom_in"
    motion_speed: str = "slow"
```

**The `/run` handler remaps fields:**
```python
payload = VideoPayload(
    content=VideoContent(
        image_path=str(image_path),
        video_prompt=req.settings.video_prompt,    # reads from SETTINGS
        camera_motion=camera_motion,                # built from settings.motion_type/speed
        scene_number=scene_num,
        # end_image_path was NEVER forwarded
    ),
    ...
)
```

**What happens:**
1. Orchestrator puts `video_prompt` in `content` (correct per storyboard design)
2. Pydantic's `RunContent` has no `video_prompt` field → **silently dropped**
3. Engine reads `req.settings.video_prompt` → empty string (orchestrator never put it there)
4. Validation rejects: "video_prompt is required for ltx_fast mode but was empty or missing"

**Three fields are silently dropped:**
- `video_prompt` in content → dropped (engine reads from settings)
- `camera_motion` in content → dropped (engine builds from settings.motion_type/speed)
- `end_image_path` in content → dropped (RunContent has no such field, /run never forwards it)

This means **frame transitions physically cannot work** even if video_prompt were fixed, because `end_image_path` never reaches the engine's internal `VideoContent`.

## Investigation B: Standard Path — Why only 1 video?

The orchestrator code is correct — `build_video_payloads()` builds one payload per image file found by the glob. The dispatch loop iterates all payloads sequentially.

Possible explanations for "only 1 video":
1. **If video_mode was LTX:** Both scenes should fail (video_prompt empty for both). Seeing scene_001.mp4 suggests it was from a prior run or the test actually used ken_burns mode.
2. **If video_mode was ken_burns:** No video_prompt validation — both should succeed. "Only 1 video" would mean only 1 image was found by the glob.
3. **Engine failure on scene 2:** The engine could return `{"status": "failed", ...}` for scene 2 (HTTP 200 but failed status). The orchestrator would mark the run as "partial" and still select the version.

The orchestrator handles partial success correctly (pipeline.py:362-364):
```python
any_success = any(r.get('status') == 'success' for r in results)
all_success = all(r.get('status') == 'success' for r in results)
final_status = 'success' if all_success else ('partial' if any_success else 'failed')
```

## Investigation C: Fix Document Assessment

The attached fix document's theory is **partially correct**:

| Claim | Correct? | Notes |
|-------|----------|-------|
| video_prompt needs to reach the engine | YES | Core issue identified correctly |
| Storyboard scenes have video_prompt | YES | Confirmed in all 4 storyboard.json files |
| Add fallback for empty video_prompt | YES | Good defensive measure |
| Put video_prompt in `content` | NO | Engine reads from `settings`, not `content` |
| Scene index matches image index | YES | `scenes[i]` for image `i` is correct |
| Missing `end_image_path` problem | MISSED | Not identified at all |
| Contract mismatch between web/internal models | MISSED | The actual root cause |

## Applied Fixes

### Fix 1: Orchestrator (`src/pipeline.py`)
- Extract video_prompt from scene with fallback via `_resolve_video_prompt()`
- Create per-payload `scene_settings = {**settings, "video_prompt": video_prompt}`
- Keep video_prompt in content too for forward compatibility
- Added logging for both transition and standard paths

### Fix 2: Video Engine (`ui/app.py`)
- Added `end_image_path: Optional[str] = None` to `RunContent`
- Forward `end_image_path=req.content.end_image_path` in `/run` handler's `VideoContent` construction

## Verification Steps

1. Restart both orchestrator backend and video engine
2. Pick a word with 2+ images (e.g., schenkelklopfer)
3. Enable `frame_transitions: true`, set `video_mode: ltx_fast`
4. Run the video stage
5. Check orchestrator logs — should see `video_prompt=SET` for each payload
6. Engine should no longer reject with "video_prompt is required"
7. For transition mode, `end_image_path` should now reach the engine
