"""Gap strategy implementations for the Assembly Engine.

Per ENGINE_ASSEMBLY.md Section 5:
When total video clip duration is less than the available song time,
the engine fills the remaining time using one of these strategies.

Each strategy function returns a list of video segment file paths
ready for concatenation after the main clips.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Optional

from . import ffmpeg_builder
from .models import AssemblySettings
from .word_card import generate_word_card

logger = logging.getLogger(__name__)


def apply_gap_strategy(
    strategy: str,
    clips: list[str],
    gap_seconds: float,
    word: str,
    translation: Optional[str],
    output_dir: str,
    settings: AssemblySettings,
    color_source_clip: Optional[str] = None,
) -> list[str]:
    """Dispatch to the appropriate gap strategy.

    Args:
        strategy: Gap strategy name from settings.
        clips: List of scaled video clip paths.
        gap_seconds: Seconds of gap to fill.
        word: Target word (for word_card strategy).
        translation: Translation (for word_card strategy).
        output_dir: Directory for intermediate files.
        settings: Assembly settings.
        color_source_clip: Original clip path for auto color (word_card strategy).

    Returns:
        List of video segment file paths that fill the gap.
    """
    if gap_seconds <= 0.01:
        return []

    dispatch = {
        "ping_pong": _apply_ping_pong,
        "loop": _apply_loop,
        "fade_black": _apply_fade_black,
        "freeze_ken_burns": _apply_freeze_ken_burns,
        "word_card": _apply_word_card,
    }

    handler = dispatch.get(strategy)
    if handler is None:
        logger.warning(f"Unknown gap strategy '{strategy}', falling back to ping_pong")
        handler = _apply_ping_pong

    if strategy == "word_card":
        return _apply_word_card(
            clips=clips,
            gap_seconds=gap_seconds,
            output_dir=output_dir,
            settings=settings,
            word=word,
            translation=translation,
            color_source_clip=color_source_clip,
        )

    return handler(
        clips=clips,
        gap_seconds=gap_seconds,
        output_dir=output_dir,
        settings=settings,
    )


def _apply_ping_pong(
    clips: list[str],
    gap_seconds: float,
    output_dir: str,
    settings: AssemblySettings,
    **kwargs,
) -> list[str]:
    """Ping-pong loop: play clips in reverse order, then forward again.

    Per ENGINE_ASSEMBLY.md Section 5.1:
    After all clips play, loop back in reverse (last clip backwards,
    second-to-last backwards, etc.), then forward again. The reverse
    creates smooth visual continuity.

    Example: 3 clips, 12s gap
    - Clip 3 reversed -> Clip 2 reversed -> Clip 1 reversed -> Clip 1 forward -> ...
    """
    segments = []
    clip_durations = [ffmpeg_builder.get_duration(c) for c in clips]
    filled = 0.0
    direction = "reverse"  # Start with reverse pass after forward clips
    idx = len(clips) - 1  # Start from last clip

    while filled < gap_seconds - 0.01:
        remaining = gap_seconds - filled
        clip_path = clips[idx]
        clip_dur = clip_durations[idx]
        seg_idx = len(segments)

        if direction == "reverse":
            # Create reversed version
            seg_path = str(Path(output_dir) / f"gap_pingpong_{seg_idx:03d}.mp4")
            use_dur = min(clip_dur, remaining)

            if use_dur < clip_dur - 0.01:
                # Need to trim the reversed clip
                _reverse_clip(clip_path, seg_path, settings, trim_duration=use_dur)
            else:
                _reverse_clip(clip_path, seg_path, settings)

            segments.append(seg_path)
            filled += use_dur

            # Move to next clip in reverse order
            idx -= 1
            if idx < 0:
                idx = 0
                direction = "forward"
        else:
            # Forward pass — just trim if needed
            seg_path = str(Path(output_dir) / f"gap_pingpong_{seg_idx:03d}.mp4")
            use_dur = min(clip_dur, remaining)

            if use_dur < clip_dur - 0.01:
                _trim_clip(clip_path, seg_path, use_dur)
            else:
                _copy_video(clip_path, seg_path)

            segments.append(seg_path)
            filled += use_dur

            # Move to next clip in forward order
            idx += 1
            if idx >= len(clips):
                idx = len(clips) - 1
                direction = "reverse"

    logger.info(f"Ping-pong gap fill: {len(segments)} segments, {filled:.1f}s")
    return segments


def _apply_loop(
    clips: list[str],
    gap_seconds: float,
    output_dir: str,
    settings: AssemblySettings,
    **kwargs,
) -> list[str]:
    """Simple loop: restart from first clip and play through sequentially.

    Per ENGINE_ASSEMBLY.md Section 5.2.
    """
    segments = []
    clip_durations = [ffmpeg_builder.get_duration(c) for c in clips]
    filled = 0.0
    clip_idx = 0

    while filled < gap_seconds - 0.01:
        remaining = gap_seconds - filled
        clip_path = clips[clip_idx]
        clip_dur = clip_durations[clip_idx]
        seg_idx = len(segments)

        seg_path = str(Path(output_dir) / f"gap_loop_{seg_idx:03d}.mp4")
        use_dur = min(clip_dur, remaining)

        if use_dur < clip_dur - 0.01:
            _trim_clip(clip_path, seg_path, use_dur)
        else:
            _copy_video(clip_path, seg_path)

        segments.append(seg_path)
        filled += use_dur

        clip_idx = (clip_idx + 1) % len(clips)

    logger.info(f"Loop gap fill: {len(segments)} segments, {filled:.1f}s")
    return segments


def _apply_fade_black(
    clips: list[str],
    gap_seconds: float,
    output_dir: str,
    settings: AssemblySettings,
    **kwargs,
) -> list[str]:
    """Fade to black: fade last frame to black, then hold black.

    Per ENGINE_ASSEMBLY.md Section 5.3:
    Fade over transition_duration (or 1.5s), hold black for remaining.
    """
    from .config import RESOLUTION_MAP

    target_w, target_h = RESOLUTION_MAP[settings.output_resolution]
    fade_dur = min(settings.transition_duration, gap_seconds)
    hold_dur = gap_seconds - fade_dur
    seg_path = str(Path(output_dir) / "gap_fade_black.mp4")

    # Extract last frame of last clip
    last_frame = str(Path(output_dir) / "last_frame.png")
    ffmpeg_builder.run_ffmpeg(
        [
            "-sseof", "-0.1",
            "-i", ffmpeg_builder.posix_path(clips[-1]),
            "-vframes", "1",
            "-q:v", "2",
            ffmpeg_builder.posix_path(last_frame),
        ],
        description="Extracting last frame for fade-to-black",
    )

    # Build video: last frame fading to black, then hold black
    # Using lavfi to create black, and blend with the last frame
    total_dur = gap_seconds
    frames = int(total_dur * settings.output_fps)
    fade_frames = int(fade_dur * settings.output_fps)

    ffmpeg_builder.run_ffmpeg(
        [
            "-loop", "1",
            "-i", ffmpeg_builder.posix_path(last_frame),
            "-t", str(total_dur),
            "-vf", (
                f"fade=t=out:st=0:d={fade_dur},"
                f"scale={target_w}:{target_h}:force_original_aspect_ratio=decrease,"
                f"pad={target_w}:{target_h}:(ow-iw)/2:(oh-ih)/2:color=black,"
                f"setsar=1"
            ),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-r", str(settings.output_fps),
            ffmpeg_builder.posix_path(seg_path),
        ],
        description=f"Fade to black: {fade_dur:.1f}s fade + {hold_dur:.1f}s hold",
    )

    # Clean up
    Path(last_frame).unlink(missing_ok=True)

    logger.info(f"Fade-to-black gap fill: {gap_seconds:.1f}s")
    return [seg_path]


def _apply_freeze_ken_burns(
    clips: list[str],
    gap_seconds: float,
    output_dir: str,
    settings: AssemblySettings,
    **kwargs,
) -> list[str]:
    """Freeze with Ken Burns: slow zoom on last frame.

    Per ENGINE_ASSEMBLY.md Section 5.4:
    Extract last frame, apply slow zoompan toward center.
    """
    from .config import RESOLUTION_MAP

    target_w, target_h = RESOLUTION_MAP[settings.output_resolution]
    seg_path = str(Path(output_dir) / "gap_ken_burns.mp4")

    # Extract last frame
    last_frame = str(Path(output_dir) / "last_frame_kb.png")
    ffmpeg_builder.run_ffmpeg(
        [
            "-sseof", "-0.1",
            "-i", ffmpeg_builder.posix_path(clips[-1]),
            "-vframes", "1",
            "-q:v", "2",
            ffmpeg_builder.posix_path(last_frame),
        ],
        description="Extracting last frame for Ken Burns",
    )

    # Apply zoompan: slow zoom toward center
    total_frames = int(gap_seconds * settings.output_fps)
    # Zoom from 1.0 to ~1.15 over the duration
    zoom_speed = 0.15 / total_frames if total_frames > 0 else 0

    ffmpeg_builder.run_ffmpeg(
        [
            "-loop", "1",
            "-i", ffmpeg_builder.posix_path(last_frame),
            "-vf", (
                f"zoompan=z='min(zoom+{zoom_speed:.6f},1.15)'"
                f":d={total_frames}"
                f":s={target_w}x{target_h}"
                f":fps={settings.output_fps},"
                f"setsar=1"
            ),
            "-t", str(gap_seconds),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            ffmpeg_builder.posix_path(seg_path),
        ],
        description=f"Ken Burns zoom: {gap_seconds:.1f}s",
    )

    # Clean up
    Path(last_frame).unlink(missing_ok=True)

    logger.info(f"Ken Burns gap fill: {gap_seconds:.1f}s")
    return [seg_path]


def _apply_word_card(
    clips: list[str],
    gap_seconds: float,
    output_dir: str,
    settings: AssemblySettings,
    word: str = "",
    translation: Optional[str] = None,
    color_source_clip: Optional[str] = None,
    **kwargs,
) -> list[str]:
    """Word card fill: display word card for remaining duration.

    Per ENGINE_ASSEMBLY.md Section 5.5:
    Same styling as pedagogic intro card. Works regardless of assembly_mode.
    """
    seg_path = str(Path(output_dir) / "gap_word_card.mp4")

    generate_word_card(
        word=word,
        translation=translation if settings.word_card_show_translation else None,
        duration=gap_seconds,
        settings=settings,
        output_path=seg_path,
        color_source_clip=color_source_clip,
    )

    logger.info(f"Word card gap fill: {gap_seconds:.1f}s")
    return [seg_path]


# --- Helper functions ---


def _reverse_clip(
    clip_path: str,
    output_path: str,
    settings: AssemblySettings,
    trim_duration: Optional[float] = None,
) -> None:
    """Create a reversed version of a video clip."""
    args = [
        "-i", ffmpeg_builder.posix_path(clip_path),
        "-vf", "reverse",
        "-an",
        "-c:v", "libx264",
        "-pix_fmt", "yuv420p",
        "-r", str(settings.output_fps),
    ]
    if trim_duration is not None:
        args.extend(["-t", str(trim_duration)])
    args.append(ffmpeg_builder.posix_path(output_path))

    ffmpeg_builder.run_ffmpeg(args, description="Reversing clip for ping-pong")


def _trim_clip(clip_path: str, output_path: str, duration: float) -> None:
    """Trim a video clip to a specific duration."""
    ffmpeg_builder.run_ffmpeg(
        [
            "-i", ffmpeg_builder.posix_path(clip_path),
            "-t", str(duration),
            "-c", "copy",
            ffmpeg_builder.posix_path(output_path),
        ],
        description=f"Trimming clip to {duration:.1f}s",
    )


def _copy_video(src: str, dst: str) -> None:
    """Copy a video file (stream copy, no re-encode)."""
    ffmpeg_builder.run_ffmpeg(
        [
            "-i", ffmpeg_builder.posix_path(src),
            "-c", "copy",
            ffmpeg_builder.posix_path(dst),
        ],
        description="Copying video segment",
    )
