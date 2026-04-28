# Investigation: short_mode Duration Constraints and Storyboard Composition

Date: 2026-04-28
Workspace: `D:\CODING\ResonanceTEST`

This was a read-only code investigation except for creating this report file.

## Executive Summary

Current `short_mode` is mostly shipped end-to-end, but not exactly as described in the handoff.

- `images.short_mode` exists in defaults, backend image settings, frontend profile settings, the storyboard prompt call, video-stage duration normalization, video settings, RunPod/self-hosted LTX adapter bypasses, and Suno bake-in overflow handling.
- The visible contradictory prompt block is the non-short duration branch rendered with `total_duration=15`, not the current short branch. That can happen when normal mode uses a 15-second `clip_duration`, or if `short_mode` is false by the time the prompt is built.
- Short mode currently branches only `_image_count_instruction` and `_duration_allocation_block`. The broader composition/mode/motion blocks do not branch on `short_mode`.
- Short-mode downstream duration enforcement is deterministic normalization, not rejection. It clamps to 3-10 and nudges by 1s until the total is 15.
- RunPod and self-hosted LTX adapters bypass enum snapping when `short_mode=True`, but the fal.ai `LTXAdapter` still snaps durations internally and has no short-mode bypass.
- The handoff statement about `job_runner.py` passing `short_mode` to Suno bake-in is stale. The current code does it in `orchestrator/src/orchestration/downstream_worker.py`.
- There is unit coverage for `_normalize_short_mode_durations`, but no test coverage for prompt branch rendering or end-to-end short-mode generation.

## Question 0: What is actually shipped right now?

### Shipped and present

- Prompt builder accepts `short_mode`: `orchestrator/cloud_engines/image_engine/prompts.py:17-28`.
- `_image_count_instruction` accepts and uses `short_mode`: `prompts.py:789-811`.
- `_duration_allocation_block` accepts and branches on `short_mode`: `prompts.py:1626-1659`.
- `ImageSettings.short_mode` exists with default `False`: `orchestrator/cloud_engines/image_engine/models.py:131-134`.
- Storyboard passes `settings.short_mode` to `build_system_prompt`: `orchestrator/cloud_engines/image_engine/storyboard.py:75-88`.
- `DEFAULT_SETTINGS["images"]["short_mode"] = False`: `orchestrator/src/settings.py:48-55`.
- Pipeline helper `_short_mode_from_images` exists: `orchestrator/src/pipeline.py:27-30`.
- Pipeline normalizer `_normalize_short_mode_durations` exists: `orchestrator/src/pipeline.py:650-682`.
- Concept and song stages are forced to 15s when short mode is resolved from images: `orchestrator/src/pipeline.py:890-892`, `orchestrator/src/pipeline.py:915-917`.
- Images stage forces `clip_duration=15` and `image_count` to auto unless already 2 or 3: `orchestrator/src/pipeline.py:952-956`.
- Video stage injects `_target_duration=15` and `short_mode=True`: `orchestrator/src/pipeline.py:993-998`.
- `VideoSettings.short_mode` exists with default `False`: `orchestrator/cloud_engines/video_engine/models.py:79-82`.
- RunPod LTX bypasses snapping when `short_mode=True`: `orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py:75-76`.
- Self-hosted LTX bypasses snapping when `short_mode=True`: `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:63-64`.
- Suno bake-in has a `short_mode` parameter and uses `overflow_strategy="video_full"` for short mode: `orchestrator/src/services/suno_bakein.py:105-115`, `orchestrator/src/services/suno_bakein.py:427-432`.
- Frontend Admin Profiles page writes the profile `settings` object back to `language_profiles`: `orchestrator/frontend/src/pages/admin/Profiles.tsx:73-80`, with a shared setting field for `short_mode`: `orchestrator/frontend/src/components/settings/fieldConfigs.ts:64-70`.

### Missing or mismatched vs handoff

- Handoff says `job_runner.py` reads `images.short_mode` and passes it to `bake_suno_into_word`. Current `job_runner.py` has no direct `short_mode`/`bake_suno_into_word` references. The current code path is `orchestrator/src/orchestration/downstream_worker.py:333-347` and `363-373`.
- Handoff says the LTX adapter enum snap was bypassed in RunPod and self-hosted adapters. That is true for those two adapters, but the fal.ai `orchestrator/cloud_engines/video_engine/adapters/ltx.py` still snaps in `validate_settings` and again in `generate`: `ltx.py:81-88`, `ltx.py:156-162`.
- The short-mode prompt branch is not the contradictory 6/8/10 block. The contradiction comes from the normal branch when rendered with `total_duration=15`.

Current short branch, verbatim from `prompts.py:1634-1641`:

```text
=== SCENE DURATION ALLOCATION ===

For short mode, choose 2 or 3 scenes and assign each scene a "suggested_duration" between 3 and 10 seconds so the total is exactly 15 seconds, giving less time to quick beats and more time to shots that need to breathe.
```

Current normal branch, verbatim from `prompts.py:1642-1658`:

```text
=== SCENE DURATION ALLOCATION ===

Your scenes will be animated as video clips to accompany a {total_duration}-second song.
Allocate clip durations across your scenes that serve the emotional arc:
- Total of all suggested_duration values should be close to {total_duration} seconds (within +/-2s is fine)
- Valid per-scene durations: 6, 8, or 10 seconds ONLY (video model constraint)
- Consider pacing: quick establishing shots (6s), lingering atmospheric moments (10s),
  standard scenes (8s)
- The duration should match what's happening: static/contemplative scenes can be longer,
  dynamic/busy scenes can be shorter

Duration examples:
- 2 scenes at {total_duration}s: 10+10={min(20, total_duration)}s works well
- 3 scenes at {total_duration}s: 6+6+8=20s or 6+8+8=22s

For each scene, include:
  "suggested_duration": <integer seconds - must be 6, 8, or 10>,
  "duration_rationale": "<why this duration serves the scene>"
```

The source contains a Unicode plus/minus and em dash; shown here normalized to ASCII for readability. The semantic contradiction is exact: if `total_duration=15`, the normal branch says close to 15 within +/-2s, then gives 20s and 22s examples.

## Question 1: Where does `short_mode` originate?

Source of truth in current code is `images.short_mode` after settings resolution:

- Hardcoded default: `orchestrator/src/settings.py:48-55` has `"short_mode": False`.
- Profile UI field: `orchestrator/frontend/src/components/settings/fieldConfigs.ts:64-70`.
- Admin Profiles page stores arbitrary stage settings into `language_profiles.settings`: `orchestrator/frontend/src/pages/admin/Profiles.tsx:73-80`.
- Job bootstrap reads the active language profile and merges profile settings into workspace defaults: `orchestrator/src/orchestration/feeder.py:469-494`, then writes `settings-defaults.json`: `feeder.py:614-616`.
- `merge_settings` merges `DEFAULT_SETTINGS` with profile stage settings: `orchestrator/job_runner.py:171-182`.
- `load_defaults` later merges `settings-defaults.json` back over hardcoded defaults: `orchestrator/src/settings.py:126-137`.
- Per-word overrides can win at stage runtime because `resolve_settings` merges `manifest_data.settings[stage]` over defaults: `orchestrator/src/settings.py:147-159`.

Per-job override does not currently include `short_mode`. `SETTINGS_OVERRIDE_MAP` only maps `genre`, `lyric_mode`, `creative_direction`, `art_style`, `visual_reference`, and `frame_narrative`: `orchestrator/job_runner.py:158-168`.

Transit to storyboard:

- `ImageSettings.short_mode` declares the field: `orchestrator/cloud_engines/image_engine/models.py:131-134`.
- Storyboard reads `settings.short_mode` and passes it to `build_system_prompt`: `orchestrator/cloud_engines/image_engine/storyboard.py:75-88`.

Transit to video duration resolution:

- Video stage resolves `_short = _short_mode_from_images(manifest_data, defaults)` and injects it into settings: `orchestrator/src/pipeline.py:993-998`.
- `_resolve_scene_durations` checks `settings.get("short_mode", False)`: `orchestrator/src/pipeline.py:542-555`.

I did not find a current gateway/model drop for `short_mode` in the inspected path. The only missing path is per-job `settings_override`, which does not map `short_mode`.

## Question 2: What is short_mode supposed to mean - code vs intent?

The code aligns with Sir Robert's stated duration intent in the model descriptions, prompt branch, normalizer, frontend helper, and tests:

- `ImageSettings.short_mode` description: "Short mode: force 15s total across 2-3 scenes with per-scene durations in [3, 10]" at `orchestrator/cloud_engines/image_engine/models.py:131-134`.
- Frontend helper: "15-second cards with 2-3 scenes instead of 20 seconds" at `orchestrator/frontend/src/components/settings/fieldConfigs.ts:70`.
- Short prompt: "choose 2 or 3 scenes" and "between 3 and 10 seconds so the total is exactly 15 seconds" at `prompts.py:1636-1640`.
- Normalizer enforces exact target with `target=15`, `min_dur=3`, `max_dur=10`: `orchestrator/src/pipeline.py:650-682`.
- Tests assert examples such as `[7,8]`, `[5,5,5]`, and rebalanced out-of-range/missing values: `orchestrator/tests/test_short_mode_durations.py:20-59`.

Mismatch: composition intent is only weakly represented. The short duration block says "less time to quick beats and more time to shots that need to breathe" (`prompts.py:1637-1640`), but the mode, auto-picker, generation, transition, and camera-motion blocks do not branch on `short_mode` and do not explicitly tell the LLM to use asymmetrical rhythmic composition.

## Question 3: Where in the storyboard prompt does `short_mode` currently branch?

Only two blocks branch on `short_mode`:

1. `_image_count_instruction`, called from `build_system_prompt` at `prompts.py:64-67` and `75-77`.
2. `_duration_allocation_block`, called from `build_system_prompt` at `prompts.py:109-110`.

### `_image_count_instruction`

Auto-count branch, normal behavior plus short additions, from `prompts.py:795-811`:

```text
recommended = "2-3" if short_mode else _RECOMMENDED_RANGE.get(clip_duration, "2-3")

Also choose the image count (the "scene_count" field). Consider:
- The clip duration is {clip_duration} seconds.
- For a {clip_duration}s clip, {recommended} images is the sweet spot.
- Choose the MINIMUM count needed to communicate the word effectively in your
  chosen mode. More frames is not better - each frame must earn its place.
- 2 scenes work well for words with strong motion or clear before/after contrast
  (running, fighting, transforming). PERSPECTIVE rarely needs more than 2.
- 3 scenes work well for abstract words, collections of meanings, or full
  narrative arcs. NARRATIVE benefits from 3 for setup + action + result.
  COLLECTION can use 2-3 depending on how many distinct meanings the word has.
- Short mode: the card is exactly 15 seconds total across 2 or 3 scenes.
```

Fixed-count branch does not branch on short mode, from `prompts.py:812-818`:

```text
You must design exactly {image_count} scene(s). Do not suggest a different count.
If this count feels limiting for your chosen mode, adapt your creative approach -
compress the concept into fewer frames rather than changing your mode choice.
If the count is 1, you are designing a single powerful image. Choose the mode that
produces the strongest single frame (PERSPECTIVE or COLLECTION work well with 1 frame;
NARRATIVE with 1 frame means capturing the most pivotal moment of the story).
```

### `_duration_allocation_block`

Quoted in Question 0. Short branch is exact 15s with integer 3-10. Normal branch is 6/8/10 and target-parameterized.

### Blocks that do not branch but contain relevant composition/pacing/motion text

- `_mode_block` / `_MODE_BLOCKS`: no short-mode parameter (`prompts.py:726-728`).
- `_auto_picker_block`: no short-mode parameter except embedded image-count text (`prompts.py:731-777`).
- `_single_frame_block`: no short-mode parameter (`prompts.py:822-830`).
- `_generation_instructions`: no short-mode parameter (`prompts.py:1421-1435`).
- `_transition_prompt_block`: no short-mode parameter (`prompts.py:1438-1487`).
- Output schema and camera motion instructions: no short-mode parameter (`prompts.py:1662-1790`).
- `build_user_prompt`: no short-mode parameter; auto count says 2 or 3 scenes independent of short mode (`prompts.py:141-153`).

## Question 4: What are the exact valid per-scene durations in each mode?

Prompt:

- Normal prompt branch: `6, 8, or 10 seconds ONLY` at `prompts.py:1648` and schema instruction at `prompts.py:1657`.
- Short prompt branch: integer 3-10 seconds at `prompts.py:1637-1640`.
- Output schema always says `"suggested_duration": "<integer seconds 3-10, how long this scene should animate>"` for image-to-video: `prompts.py:1747-1750`. Text-to-video schema says `"integer seconds 3-10"` too: `prompts.py:1594-1596`. This conflicts with the normal branch's 6/8/10-only instruction.

LTX shared enum constants, from `orchestrator/cloud_engines/video_engine/adapters/ltx_shared.py:62-66`:

```python
_I2V_DURATIONS = (6, 8, 10, 12, 14, 16, 18, 20)
_T2V_PRO_DURATIONS = (6, 8, 10)
_T2V_FAST_DURATIONS = (6, 8, 10, 12, 14, 16, 18, 20)
```

Pipeline normal-mode duration resolver has a narrower internal set:

```python
_LTX_PRO_DURATIONS = sorted([6, 8, 10])
_LTX_FAST_DURATIONS = sorted([6, 8, 10, 12, 14, 16, 18, 20])
```

at `orchestrator/src/pipeline.py:623-635`.

Short mode:

- `_resolve_scene_durations` returns before enum snap when `settings.short_mode` is true: `orchestrator/src/pipeline.py:542-555`.
- RunPod adapter returns before `_snap_duration`: `orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py:75-76`.
- Self-hosted adapter returns before `_snap_duration`: `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:63-64`.
- RunPod payload sends `"duration": settings.duration`: `ltx_runpod.py:170-175`.
- Self-hosted payload sends `"duration": str(settings.duration)`: `ltx_selfhosted.py:147-151`.

So for RunPod/self-hosted LTX short mode, the pipeline passes arbitrary integers in 3-10 through to the worker. In that path, the 3-10 limit is editorial plus Pydantic `VideoSettings.duration` bounds (`ge=3, le=20`) rather than an adapter enum constraint.

Residual snap:

- fal.ai `LTXAdapter` still snaps in `validate_settings` and again in `generate`: `orchestrator/cloud_engines/video_engine/adapters/ltx.py:81-88`, `ltx.py:156-162`. If `VIDEO_BACKEND` routes to fal (`orchestrator/cloud_engines/video_engine/router.py:40-42`), arbitrary short-mode integers will not pass through.

## Question 5: What is the exact total target duration in each mode?

Default normal-mode target is 20 seconds:

- `DEFAULT_SETTINGS["concept"]["duration"] = 20`: `orchestrator/src/settings.py:21-29`.
- `DEFAULT_SETTINGS["song"]["duration"] = 20`: `orchestrator/src/settings.py:33-34`.
- `DEFAULT_SETTINGS["images"]["clip_duration"] = 20`: `orchestrator/src/settings.py:48-54`.
- Frontend short-mode helper says "instead of 20 seconds": `orchestrator/frontend/src/components/settings/fieldConfigs.ts:70`.

Normal mode is not hardcoded to 20. The duration block uses `settings.clip_duration` as `total_duration`: `prompts.py:109-110`, `prompts.py:1626-1658`. The image stage syncs `clip_duration` from concept duration: `orchestrator/src/pipeline.py:945-950`. Video stage target is concept duration unless short mode: `orchestrator/src/pipeline.py:993-998`.

Short mode target is hardcoded to 15 in multiple stages:

- Concept stage: `settings["duration"] = 15`: `pipeline.py:890-892`.
- Song stage: `settings["duration"] = 15`: `pipeline.py:915-917`.
- Images stage: `settings["clip_duration"] = 15`: `pipeline.py:952-954`.
- Video stage: `_target = 15 if _short else concept_settings.get("duration", 20)`: `pipeline.py:993-998`.
- Normalizer default target is `15`: `pipeline.py:650-653`.

Regression shape: if normal mode is configured for 15 seconds, the normal duration block renders "close to 15 seconds" while retaining 20/22s examples and 6/8/10-only durations. That is likely the prompt contradiction that prompted this investigation.

## Question 6: What does downstream code do when storyboard durations do not match the target?

Short mode:

- `_resolve_scene_durations` extracts raw `suggested_duration` values: `pipeline.py:529-540`.
- If `short_mode` and at least 2 scenes, it calls `_normalize_short_mode_durations(raw_durations, target=(target or 15))` and returns immediately: `pipeline.py:542-555`.
- The normalizer clamps each value to 3-10, substitutes missing values with midpoint 6, then nudges one second at a time until the sum equals target: `pipeline.py:650-682`.
- It does not reject, truncate whole scenes, or scale proportionally. It mutates durations by one-second increments, increasing the current shortest candidate when under target and decreasing the current largest candidate when over target.

Normalizer logic, actual code from `pipeline.py:650-682`:

```python
def _normalize_short_mode_durations(
    raw_durations: list[int | None],
    target: int = 15,
    min_dur: int = 3,
    max_dur: int = 10,
) -> list[int]:
    """Normalize storyboard durations so they sum to exactly `target`.

    Clamps each value to [min_dur, max_dur] (None -> midpoint), then nudges
    the smallest/largest in-bounds scene by 1s until the sum equals target.
    """
    midpoint = (min_dur + max_dur) // 2  # 6
    durations = [
        max(min_dur, min(max_dur, int(d) if d is not None else midpoint))
        for d in raw_durations
    ]

    while sum(durations) != target:
        delta = target - sum(durations)
        step = 1 if delta > 0 else -1
        if step > 0:
            candidates = [i for i, v in enumerate(durations) if v < max_dur]
            if not candidates:
                break
            idx = min(candidates, key=lambda i: durations[i])
        else:
            candidates = [i for i, v in enumerate(durations) if v > min_dur]
            if not candidates:
                break
            idx = max(candidates, key=lambda i: durations[i])
        durations[idx] += step

    return durations
```

The adapter receives the normalized duration through per-scene settings:

- Standard image-to-video path sets `scene_settings["duration"] = scene_durations[i]`: `pipeline.py:433-450`.
- Text-to-video path does the same: `pipeline.py:350-356`.

Normal mode:

- LTX modes snap/greedy-fill using valid enum durations and never exceed target when target is present: `pipeline.py:575-620`.
- Ken Burns/Kling/no-valid-set path clamps to 3-10 and may scale/rebalance if total differs from target by more than 2: `pipeline.py:557-573`.

Assembly and music:

- Normal concept/song generation is forced to 15 only in short mode; otherwise it follows concept duration (default 20): `pipeline.py:890-917`.
- Assembly uses actual probed audio duration as master clock and actual probed clip durations: `orchestrator/cloud_engines/assembly_engine/engine.py:123-129`, `orchestrator/cloud_engines/assembly_engine/timing.py:42-64`.
- If video overflows audio and strategy is `trim`, clips are trimmed/discarded: `orchestrator/cloud_engines/assembly_engine/engine.py:185-197`.
- If strategy is `video_full`, final mux fades audio, pads with silence, and lets video play fully: `orchestrator/cloud_engines/assembly_engine/video.py:267-336`.
- Suno bake-in probes actual video duration and trims/fades Suno audio based on that actual duration: `orchestrator/src/services/suno_bakein.py:248-276`, `suno_bakein.py:288-364`.
- Suno bake-in does not pass a duration into `suno_generate_song`; it generates/re-polls audio, then trims against probed video duration: `suno_bakein.py:199-207`, `suno_bakein.py:253-254`.

Silent failure modes:

- If normal mode is set to 15s with LTX durations, the prompt may invite 20/22s examples. Pipeline LTX greedy fill will not exceed a target of 15, so it may produce 12/14-ish totals depending mode/count rather than the LLM's requested rhythm.
- If `VIDEO_BACKEND` falls back to fal.ai, short-mode arbitrary integers are snapped by `LTXAdapter`, so 3/5/7/9-style rhythm can be lost.
- If short mode uses morph/crossfade transitions, assembly's effective total subtracts transition overlap (`timing.py:52-64`), so exact scene duration sum of 15 may not equal exact final video runtime unless transition mode is all-cut or no overlap is applied.
- Suno bake-in protects short-mode video fullness via `video_full`, but it may pad audio with silence if video runs longer than audio after fade.

## Question 7: Is there a scene composition / pacing block that prescribes equal-weight pacing?

I did not find a direct "equal duration" instruction. I did find several blocks that imply canonical multi-beat structures or equal-importance scenes. These are candidates for short-mode branching if the goal is rhythmic dynamism.

`_image_count_instruction`, `prompts.py:798-807`:

```text
- Choose the MINIMUM count needed to communicate the word effectively in your
  chosen mode. More frames is not better - each frame must earn its place.
- 2 scenes work well for words with strong motion or clear before/after contrast
  (running, fighting, transforming). PERSPECTIVE rarely needs more than 2.
- 3 scenes work well for abstract words, collections of meanings, or full
  narrative arcs. NARRATIVE benefits from 3 for setup + action + result.
  COLLECTION can use 2-3 depending on how many distinct meanings the word has.
```

`_auto_picker_block`, `prompts.py:752-755`:

```text
NARRATIVE - A mini-story told in sequential frames.
Each frame advances a cause-and-effect chain. The subject remains
recognizable but both subject and setting can evolve as the story
demands. Think of it as a comic strip - setup, development, payoff.
```

`_mode_block` narrative mode, `prompts.py:665-677`:

```text
A mini-story told in sequential frames. Cause and effect.

PRIMARY CHANGE: The story advances. Both subject and setting can evolve as the
narrative demands - this is the most flexible mode. Think of it as a comic strip
or a short film told in stills: setup -> development -> payoff.

SCENE DESIGN:
- Each frame must advance the story - no two frames should feel like the same moment
- The final frame should feel like a resolution or punchline, not just another beat
```

`_mode_block` collection mode, `prompts.py:708-719`:

```text
Independent interpretations of the word. No visual continuity between frames.

PRIMARY CHANGE: Everything. Each frame is a standalone creative interpretation of the
word's meaning. Different subjects, different settings, different compositions.
The only thread connecting them is the word itself and a shared art style / color palette.

SCENE DESIGN:
- Each scene should explore a DIFFERENT facet or association of the word
- Each frame should stand alone as a compelling image
```

`_generation_instructions`, `prompts.py:1427-1435`:

```text
Each scene must work as a standalone {aspect_ratio} {medium} that would be compelling without any other context.
Generate exactly {scene_count} scene(s). Each scene must work as a standalone {aspect_ratio} {medium} that would be compelling without any other context.
```

`build_user_prompt`, `prompts.py:141-153`:

```text
Create 2 or 3 scenes based on what best serves the word. Use 2 scenes for words with strong motion, clear before/after, or simple concepts. Use 3 scenes for abstract words, collections of meanings, or full narrative arcs.
```

These blocks do not force equal-weight pacing, but "each frame must earn its place", "setup/development/payoff", "full narrative arcs", and "each scene standalone compelling" can bias the LLM toward evenly important scenes unless short mode explicitly permits punchy minor beats plus longer anchors.

## Question 8: Does motion guidance currently scale with `suggested_duration`?

No. Motion guidance is uniform. It is not parameterized by per-scene `suggested_duration`.

Relevant motion text:

- `_transition_prompt_block` says `video_prompt` should feel complete "within its duration", but does not define different motion budgets for 3s vs 9s: `prompts.py:1443-1453`.
- It limits standalone motion to "Maximum two motion events per video_prompt": `prompts.py:1478-1486`.
- Text-to-video guidance asks for rich full-scene motion and examples such as "wind in hair, steam rising, light shifting, rain falling": `prompts.py:1498-1506`.
- Output schema camera-motion section tells the LLM to choose motion based on composition/emotion/frame narrative, not duration: `prompts.py:1764-1786`.

Quoted from `_transition_prompt_block`, `prompts.py:1443-1452`:

```text
"video_prompt" - For STANDALONE animation (hard cut, no morphing).
Write as a self-contained motion description. The scene should feel complete
within its duration. Describe:
- What the subject DOES (specific, constrained actions)
- One ambient quality that fills the scene - pick ONE: wind animating everything uniformly, OR rain texturing the frame, OR shifting light. Do not enumerate multiple environmental elements.
- Camera movement if specified in camera_motion
- The scene should LOOP well - end state similar to start state
KEEP the subject anchored - it should not transform, change species,
or dramatically change pose. Subtle, naturalistic motion.
```

Quoted from motion budget, `prompts.py:1483-1486`:

```text
- Describe only motion that could realistically occur within a single static shot
- Prefer ambient environmental motion over subject transformation
- MOTION BUDGET: Maximum two motion events per video_prompt - one primary subject motion plus one ambient field. Camera movement is separate and does not count. If you find yourself listing more than two competing motions, choose the strongest one and drop the others.
- If camera_motion is "static", emphasize subtle environmental animation only
```

## Question 9: Could short mode support per-scene-duration motion guidance within the existing storyboard call?

Yes, structurally it can fit inside the existing single storyboard LLM call.

Reason: the same response schema already asks the LLM to generate `video_prompt`, `transition_prompt`, `camera_motion`, and `suggested_duration` per scene in one JSON object: `prompts.py:1741-1750`. The system prompt can conditionally tell the LLM to allocate duration first conceptually, then calibrate each scene's `video_prompt`/`transition_prompt`/`camera_motion` density to that scene's own `suggested_duration`.

Natural locations for conditional text:

- `_duration_allocation_block`, because it already owns per-scene duration intent and could mention downstream motion calibration.
- `_transition_prompt_block`, because it owns `video_prompt` and `transition_prompt` motion writing.
- Output-schema camera-motion section, because it already tells the LLM how to choose `camera_motion` values.

No schema change is required for basic guidance, because `suggested_duration` already exists per scene. A structural change would only be needed if downstream code wanted a separate explicit `motion_density` field or if durations were assigned deterministically after the LLM call.

## Question 10: Is there test coverage?

File: `orchestrator/tests/test_short_mode_durations.py`.

Tests:

- `test_exact_two_scene_sum_unchanged`: `[7, 8]` stays `[7, 8]`: lines 20-21.
- `test_exact_three_scene_sum_unchanged`: `[5, 5, 5]` stays `[5, 5, 5]`: lines 24-25.
- `test_two_scene_clamp_reduces_to_target`: `[10, 10]` becomes a 15s sum, all values 3-10: lines 28-31.
- `test_three_scene_minimum_increases_to_target`: `[3, 3, 3]` becomes a 15s sum, all values 3-10: lines 34-37.
- `test_two_scene_missing_value_substituted`: `[None, 8]` becomes a 15s sum, preserves explicit `8`: lines 40-45.
- `test_three_scene_all_missing_substituted`: all `None` becomes a 15s sum, all values 3-10: lines 48-52.
- `test_two_scene_out_of_range_clamp_then_rebalance`: `[15, 2]` becomes a 15s sum, all values 3-10: lines 55-59.

Gaps:

- No test verifies prompt text for `short_mode=True`.
- No test verifies prompt text for `short_mode=False` and `clip_duration=15`, which is the contradiction case.
- No test verifies `_image_count_instruction` short-mode text.
- No integration test verifies settings flow from profile/defaults to storyboard prompt to video payload.
- No test verifies RunPod/self-hosted adapter pass-through for arbitrary short-mode durations.
- No test verifies fal.ai adapter behavior under `short_mode=True`.
- No end-to-end short-mode generation test.

## Options

### Option A: Fix the contradiction in the duration block only

Change list:

- Edit `_duration_allocation_block` normal branch so examples match `total_duration`.
- If normal mode `total_duration=15` is supported, either provide 6+8 style examples within tolerance or remove examples for unsupported totals.
- Add prompt unit tests for normal `clip_duration=20`, normal `clip_duration=15`, and `short_mode=True`.

Risk to normal mode:

- Low if the normal 20s prompt remains semantically the same.
- Does not address short-mode rhythm/composition beyond duration allocation.

### Option B: Branch additional composition/pacing blocks on `short_mode`

Change list:

- Keep shared creative-direction/art-style/schema blocks.
- Add `short_mode` parameters to selected structural blocks:
  - `_mode_block` or a wrapper for narrative/action/collection guidance.
  - `_auto_picker_block` or its embedded image-count/pacing language.
  - `_generation_instructions`.
  - Potentially `_transition_prompt_block` for duration-aware motion budget language, without redesigning motion prompts.
- Add prompt-rendering tests that snapshot or assert critical lines for both modes.

Risk to normal mode:

- Low to medium. Normal branch can remain unchanged, but changing function signatures and prompt assembly touches more surface.
- Best fit for Sir Robert's intent because it explicitly separates rhythmic short composition from normal multi-scene composition without duplicating the whole prompt.

### Option C: Fully separate short-mode prompt

Change list:

- Create `build_short_mode_system_prompt` or equivalent.
- Route `build_system_prompt(... short_mode=True)` to the separate builder.
- Duplicate or share common blocks intentionally.
- Add prompt tests for both full prompt paths.

Risk to normal mode:

- Low if routed cleanly, but maintenance risk is high. Future creative-direction fixes must be applied in two places or consciously shared.
- Gives maximum design freedom for short mode.

### Option D: Push duration decisions out of the LLM

Change list:

- Remove or downgrade LLM duration allocation instructions.
- Add deterministic duration allocator based on `scene_count`, target total, mode, and maybe storyboard metadata.
- Keep `suggested_duration` as optional rationale-only or overwrite it downstream.
- Add allocator unit tests and integration tests for video payload durations.

Risk to normal mode:

- Medium. It changes creative responsibility and may reduce the LLM's ability to choose rhythm from word meaning.
- Strongly reduces duration mismatch bugs.

### Option E: Fix backend pass-through consistency

Change list:

- Add `short_mode` bypass to fal.ai `LTXAdapter`, or explicitly block short-mode arbitrary durations unless `VIDEO_BACKEND` is RunPod/self-hosted.
- Add adapter tests for RunPod, self-hosted, and fal behavior.
- Consider logging when short mode is active and backend cannot honor arbitrary integers.

Risk to normal mode:

- Low if the bypass is gated only on `short_mode`.
- Important because current router can still choose fal.ai for LTX modes when `VIDEO_BACKEND` is neither `runpod` nor `self_hosted`.

## Recommendation

Recommend Option B plus Option E.

Rationale:

- Option A fixes the immediate contradictory text, but it leaves short mode as mostly "normal prompt with shorter duration math."
- Option B matches the stated intent: short mode needs rhythmic composition guidance, not just a different duration menu.
- Option E closes a real downstream inconsistency: RunPod/self-hosted honor arbitrary short-mode durations, while fal.ai still snaps them.
- Avoid Option C for now because full prompt duplication is high maintenance.
- Avoid Option D for now because it removes LLM rhythm selection, which is part of the intended short-mode behavior.

Minimum test additions for the recommended path:

- Prompt tests for `short_mode=True` verifying 2-3 scenes, integer 3-10, exact 15s, and no 6/8/10-only language.
- Prompt test for normal `clip_duration=15` verifying no 20/22s contradiction.
- Prompt tests for short-mode composition guidance lines if added.
- Adapter tests that short-mode `duration=3/5/7/9` is not snapped in every enabled LTX backend or is explicitly rejected/logged when unsupported.

## Things Broken or Inconsistent but Out of Scope

- Output schema says `suggested_duration` is integer 3-10 even in normal mode, while normal duration block says 6/8/10 only: `prompts.py:1747-1750` vs `prompts.py:1648-1657`.
- Text-to-video output schema also says integer 3-10, while LTX text-to-video enum support is 6/8/10 for Pro and 6-20 even values for Fast: `prompts.py:1594-1596`, `ltx_shared.py:64-66`.
- `_resolve_scene_durations` docstring says Pro supports 6/8/10 and Fast supports 6-20 evens, but the prompt normal branch says 6/8/10 for all normal video model use: `pipeline.py:513-517`, `prompts.py:1648`.
- The short-mode prompt says "choose 2 or 3 scenes" inside `_duration_allocation_block`, but fixed image count may already be exactly 2 or 3 by settings. This is not fatal, but duration allocation is partially repeating count authority.
- `AUTO_IMAGE_COUNT_MAP[15] = 2` (`models.py:581-585`), while short-mode copy repeatedly says 2-3 scenes. The user prompt for auto still says "Create 2 or 3 scenes" when `image_count == "auto"` and resolved count is at least 2 (`prompts.py:141-153`), so this may be intentional max/default behavior, but it is worth clarifying.
- `job_runner.py` owns `merge_settings`, but the active Suno bake-in call path is now `downstream_worker.py`; the handoff reference to `job_runner.py` is stale.
