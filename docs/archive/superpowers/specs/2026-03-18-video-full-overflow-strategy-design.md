# Design: `video_full` Overflow Strategy

## Problem

Current overflow strategies both sacrifice video content when video duration exceeds song duration:

- **`trim`** — Cuts video clips to match song duration. Expensive LTX-generated content is lost.
- **`fade_audio_black`** — Fades audio out at song end, but `-shortest` flag still truncates video at song boundary.

Movie mode and other creative directions produce valuable scene clips that cost $0.04-0.06/second to generate. Trimming or truncating them wastes money and creates jarring viewing experiences.

## Solution

Add a third overflow strategy: **`video_full`**.

**Behavior:** Video plays to completion. Audio fades out gracefully at its natural end, then silence fills the remaining video duration. The output duration equals the total video duration, not the song duration.

**Make it the new default** for both the assembly engine and orchestrator settings.

## Architecture

### Decision: Extend existing overflow pattern

The `fade_audio_black` strategy already handles 80% of the requirement — it keeps all clips and fades audio. `video_full` extends this by:

1. Removing the `-shortest` flag so video isn't truncated
2. Using FFMPEG's `apad` filter to pad audio with silence to match video duration

No new files. No restructuring. Minimal diff across 4 engine files + 2 orchestrator files.

### Decision: Get video duration via ffprobe

`assemble_final()` needs the total video duration for the `apad` filter. Rather than threading it through from the timing plan, probe the concatenated video file using the existing `ffmpeg_builder.get_duration()` helper. Self-contained, no parameter changes needed.

## Changes

### 1. Assembly Engine — models.py

**File:** `engines/assembly-engine/src/models.py` line 54

Add `"video_full"` to the overflow_strategy Literal type. Change default to `"video_full"`.

```python
# Before
overflow_strategy: Literal["trim", "fade_audio_black"] = "trim"

# After
overflow_strategy: Literal["trim", "fade_audio_black", "video_full"] = "video_full"
```

### 2. Assembly Engine — engine.py

**File:** `engines/assembly-engine/src/engine.py` lines 183-195

Add `video_full` to the overflow branch. Like `fade_audio_black`, it keeps all clips (no trimming). The distinction is handled in the final mux step.

```python
# Overflow branch (line 183+)
else:
    if timing_plan.strategy_to_apply == "trim":
        trimmed = video.apply_overflow_trim(...)
        segments.extend(trimmed)
    else:
        # fade_audio_black and video_full: use all clips, handle in final mux
        segments.extend(scaled_clips)
```

Update the `overflow_fade` flag (line 225) to also detect `video_full`:

```python
overflow_fade = (
    timing_plan.gap < -0.01
    and timing_plan.strategy_to_apply in ("fade_audio_black", "video_full")
)
```

Pass the strategy to `assemble_final()` so it can distinguish between `fade_audio_black` (use `-shortest`) and `video_full` (use `apad`, no `-shortest`):

```python
video.assemble_final(
    video_path=concat_path,
    audio_path=audio_report.processed_path,
    output_path=final_path,
    settings=payload.settings,
    song_duration=audio_report.effective_duration,
    overflow_fade=overflow_fade,
    overflow_strategy=timing_plan.strategy_to_apply if overflow_fade else None,
)
```

### 3. Assembly Engine — video.py

**File:** `engines/assembly-engine/src/video.py` lines 265-335

Update `assemble_final()` to accept `overflow_strategy` parameter. When `video_full`:

- Probe concatenated video for its duration
- Use `apad` filter to extend audio with silence after fade-out
- Do NOT use `-shortest` flag

```python
def assemble_final(
    video_path: str,
    audio_path: str,
    output_path: str,
    settings: AssemblySettings,
    song_duration: float,
    overflow_fade: bool = False,
    overflow_strategy: str | None = None,
) -> str:
    args = [
        "-i", ffmpeg_builder.posix_path(video_path),
        "-i", ffmpeg_builder.posix_path(audio_path),
    ]

    # Video encoding
    args.extend([
        "-c:v", settings.video_codec,
        "-preset", settings.video_preset,
        "-crf", str(settings.video_crf),
        "-pix_fmt", "yuv420p",
    ])

    # Audio encoding
    if overflow_fade:
        fade_start = max(0, song_duration - 2.0)
        if overflow_strategy == "video_full":
            # Fade audio, then pad with silence to match full video duration
            video_duration = ffmpeg_builder.get_duration(video_path)
            args.extend([
                "-af", (
                    f"afade=t=out:st={fade_start:.2f}:d=2.0,"
                    f"apad=whole_dur={video_duration:.2f}"
                ),
                "-c:a", settings.audio_codec,
                "-b:a", settings.audio_bitrate,
            ])
        else:
            # fade_audio_black: just fade, -shortest will truncate
            args.extend([
                "-af", f"afade=t=out:st={fade_start:.2f}:d=2.0",
                "-c:a", settings.audio_codec,
                "-b:a", settings.audio_bitrate,
            ])
    else:
        args.extend([
            "-c:a", settings.audio_codec,
            "-b:a", settings.audio_bitrate,
        ])

    # Duration control
    if overflow_strategy != "video_full":
        args.append("-shortest")

    args.extend([
        "-movflags", "+faststart",
        ffmpeg_builder.posix_path(output_path),
    ])

    ffmpeg_builder.run_ffmpeg(args, description="Final encode", timeout=600)
    return output_path
```

### 4. Orchestrator — settings.py

**File:** `orchestrator/src/settings.py` line 61

Change default from `"trim"` to `"video_full"`.

### 5. Orchestrator — fieldConfigs.ts

**File:** `orchestrator/frontend/src/components/settings/fieldConfigs.ts` line 101

Add `'video_full'` to the overflow_strategy options array. Update default.

```typescript
{ key: 'overflow_strategy', label: 'Overflow Strategy', type: 'dropdown',
  options: ['video_full', 'trim', 'fade_audio_black'], default: 'video_full' },
```

### 6. Timing — No changes

`timing.py` correctly calculates the gap and sets `strategy_to_apply = settings.overflow_strategy`. The `video_full` value flows through without any timing logic changes.

## What is NOT changed

- Existing `trim` and `fade_audio_black` strategies remain fully functional
- Gap strategies (ping_pong, loop, etc.) are unaffected
- Silence trim and LUFS normalization are unaffected
- Video clip generation and ordering are unaffected
- Bookend engine integration is unaffected (bookend wraps the final MP4 regardless of duration)

## Gap strategy interaction

When `video_full` is active and video > audio, the code naturally lands in the overflow branch (line 183 of engine.py, `gap < -0.01`). Gap strategies only run in the non-overflow branch (line 165, `gap >= -0.01`). No special handling needed.

When `video_full` is active but video < audio, the gap branch runs normally and gap strategies apply as usual.

## Verification

1. **video_full, video > audio:** Video plays fully, audio fades at song end, silence for remaining video
2. **video_full, video < audio:** Gap strategy applies normally (same as before)
3. **trim:** Still works as before (regression)
4. **fade_audio_black:** Still works as before (regression)
5. **Bookend:** Still wraps the output correctly with longer video
