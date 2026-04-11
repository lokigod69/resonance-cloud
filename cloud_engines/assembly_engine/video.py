"""Video processing for the Assembly Engine.

Handles clip scaling, transitions, concatenation, and final muxing.
Per ENGINE_ASSEMBLY.md Sections 7, 9, and 11.
"""

from __future__ import annotations

import logging
from pathlib import Path

from . import ffmpeg_builder
from .models import AssemblySettings

logger = logging.getLogger(__name__)


def scale_clip(
    clip_path: str,
    target_width: int,
    target_height: int,
    target_fps: int,
    output_path: str,
) -> str:
    """Scale a video clip to the target resolution and frame rate.

    Per ENGINE_ASSEMBLY.md Section 9.2:
    - Aspect ratio preserved via padding (never crop or stretch)
    - Audio stripped (song audio is used instead)
    - Lanczos scaling for quality

    Args:
        clip_path: Path to the input video clip.
        target_width: Target width in pixels.
        target_height: Target height in pixels.
        target_fps: Target frame rate.
        output_path: Path to write the scaled clip.

    Returns:
        The output_path.
    """
    scale_filter = ffmpeg_builder.build_scale_filter(target_width, target_height)

    ffmpeg_builder.run_ffmpeg(
        [
            "-i", ffmpeg_builder.posix_path(clip_path),
            "-vf", f"{scale_filter},fps={target_fps}",
            "-an",  # Strip audio
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "18",
            "-preset", "fast",  # Fast for intermediates
            ffmpeg_builder.posix_path(output_path),
        ],
        description=f"Scaling clip to {target_width}x{target_height}@{target_fps}fps",
    )
    return output_path


def apply_overflow_trim(
    clips: list[str],
    available_duration: float,
    transition_duration: float,
    transition_type: str,
) -> list[str]:
    """Trim clips to fit within the available duration.

    Per ENGINE_ASSEMBLY.md Section 6.1:
    Play clips sequentially until time runs out. The clip playing when
    time runs out is trimmed at that point. Remaining clips are discarded.

    Args:
        clips: List of video clip paths.
        available_duration: Maximum total duration in seconds.
        transition_duration: Duration of each transition.
        transition_type: Type of transition being used.

    Returns:
        List of clip paths to use (last one may be trimmed).
    """
    result = []
    accumulated = 0.0

    for i, clip_path in enumerate(clips):
        clip_dur = ffmpeg_builder.get_duration(clip_path)

        # Account for transition time with previous clip
        trans_time = 0.0
        if i > 0 and transition_type != "cut":
            trans_time = transition_duration

        effective_add = clip_dur - trans_time
        remaining = available_duration - accumulated

        if effective_add <= remaining + 0.01:
            # Clip fits entirely
            result.append(clip_path)
            accumulated += effective_add
        else:
            # Need to trim this clip
            trim_dur = remaining + trans_time  # Add back transition overlap
            if trim_dur > 0.1:  # Minimum useful clip duration
                trimmed_path = str(
                    Path(clip_path).parent / f"{Path(clip_path).stem}_trimmed.mp4"
                )
                ffmpeg_builder.run_ffmpeg(
                    [
                        "-i", ffmpeg_builder.posix_path(clip_path),
                        "-t", str(trim_dur),
                        "-c", "copy",
                        ffmpeg_builder.posix_path(trimmed_path),
                    ],
                    description=f"Trimming overflow clip to {trim_dur:.1f}s",
                )
                result.append(trimmed_path)
            break  # Discard remaining clips

    logger.info(
        f"Overflow trim: using {len(result)}/{len(clips)} clips, "
        f"total ~{available_duration:.1f}s"
    )
    return result


def concatenate_with_transitions(
    segments: list[str],
    transition_type: str,
    transition_duration: float,
    output_path: str,
) -> str:
    """Concatenate video segments with the specified transition.

    Per ENGINE_ASSEMBLY.md Section 7:
    - "cut": Hard cut via concat demuxer
    - "crossfade": xfade filter with transition=fade
    - "dip_black": xfade filter with transition=fadeblack

    Args:
        segments: Ordered list of video segment paths.
        transition_type: Transition type ("cut", "crossfade", "dip_black").
        transition_duration: Duration of crossfade/dip_black transitions.
        output_path: Path to write the concatenated video.

    Returns:
        The output_path.
    """
    if not segments:
        raise ValueError("No video segments to concatenate")

    if len(segments) == 1:
        # Single segment — just copy
        ffmpeg_builder.run_ffmpeg(
            [
                "-i", ffmpeg_builder.posix_path(segments[0]),
                "-c", "copy",
                ffmpeg_builder.posix_path(output_path),
            ],
            description="Single segment copy",
        )
        return output_path

    if transition_type == "cut":
        return _concat_hard_cut(segments, output_path)
    else:
        xfade_transition = "fade" if transition_type == "crossfade" else "fadeblack"
        return _concat_xfade(segments, xfade_transition, transition_duration, output_path)


def _concat_hard_cut(segments: list[str], output_path: str) -> str:
    """Concatenate segments with hard cuts using the concat demuxer."""
    # Write concat list file
    list_path = str(Path(output_path).parent / "concat_list.txt")
    with open(list_path, "w", encoding="utf-8") as f:
        for seg in segments:
            # Escape single quotes in paths and use forward slashes
            safe_path = ffmpeg_builder.posix_path(seg).replace("'", "'\\''")
            f.write(f"file '{safe_path}'\n")

    ffmpeg_builder.run_ffmpeg(
        [
            "-f", "concat",
            "-safe", "0",
            "-i", ffmpeg_builder.posix_path(list_path),
            "-c", "copy",
            ffmpeg_builder.posix_path(output_path),
        ],
        description=f"Concatenating {len(segments)} segments (hard cut)",
    )

    # Clean up list file
    Path(list_path).unlink(missing_ok=True)

    return output_path


def _concat_xfade(
    segments: list[str],
    xfade_transition: str,
    duration: float,
    output_path: str,
) -> str:
    """Concatenate segments with xfade transitions.

    Builds a filter_complex chain for N-1 xfade operations.
    Offset calculation per ENGINE_ASSEMBLY.md Section 7.2:
    Each crossfade reduces total duration by transition_duration.
    """
    durations = [ffmpeg_builder.get_duration(seg) for seg in segments]

    # Build input arguments
    inputs = []
    for seg in segments:
        inputs.extend(["-i", ffmpeg_builder.posix_path(seg)])

    # Build xfade filter chain
    filter_parts = []
    n = len(segments)

    # Calculate offsets: the offset for xfade i is the cumulative duration
    # of segments 0..i minus the cumulative transition time
    # offset_i = sum(durations[0:i+1]) - (i+1) * duration
    cumulative = 0.0
    prev_label = "[0:v]"

    for i in range(n - 1):
        cumulative += durations[i]
        offset = cumulative - (i + 1) * duration

        # Ensure offset is not negative
        offset = max(0, offset)

        next_input = f"[{i + 1}:v]"
        if i < n - 2:
            out_label = f"[v{i}]"
        else:
            out_label = "[vout]"

        filter_parts.append(
            f"{prev_label}{next_input}xfade=transition={xfade_transition}"
            f":duration={duration}:offset={offset:.4f}{out_label}"
        )
        prev_label = out_label

    filter_complex = "; ".join(filter_parts)

    ffmpeg_builder.run_ffmpeg(
        inputs + [
            "-filter_complex", filter_complex,
            "-map", "[vout]",
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-crf", "18",
            "-preset", "fast",
            ffmpeg_builder.posix_path(output_path),
        ],
        description=f"Concatenating {n} segments with {xfade_transition} transitions",
    )

    return output_path


def assemble_final(
    video_path: str,
    audio_path: str,
    output_path: str,
    settings: AssemblySettings,
    song_duration: float,
    overflow_fade: bool = False,
    video_full: bool = False,
) -> str:
    """Mux video and audio into the final MP4 with encoding settings.

    Per ENGINE_ASSEMBLY.md Sections 9, 11:
    - Apply video codec/preset/CRF settings
    - Apply audio codec/bitrate settings
    - If overflow with fade_audio_black: fade audio in last 2 seconds
    - If video_full: fade audio, pad with silence, let video play fully

    Args:
        video_path: Path to the concatenated video-only file.
        audio_path: Path to the processed audio file.
        output_path: Path to write the final MP4.
        settings: Assembly settings for encoding.
        song_duration: Duration of the song (for -shortest or audio fade).
        overflow_fade: If True, apply audio fade for overflow strategy.
        video_full: If True, pad audio with silence to match video duration.

    Returns:
        The output_path.
    """
    # Get video duration for video_full mode's apad limit
    if video_full:
        video_duration = ffmpeg_builder.get_duration(video_path)

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
        if video_full:
            # Fade audio out, then pad with silence to match video length
            args.extend([
                "-af", f"afade=t=out:st={fade_start:.2f}:d=2.0,apad=whole_dur={video_duration:.2f}",
                "-c:a", settings.audio_codec,
                "-b:a", settings.audio_bitrate,
            ])
        else:
            # fade_audio_black: fade audio out in last 2 seconds
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
    if not video_full:
        # Song is master clock — use shorter of video/audio
        args.append("-shortest")
    # video_full: no -shortest, video plays fully; apad ensures audio
    # stream matches video length so FFMPEG doesn't truncate

    # Output
    args.extend([
        "-movflags", "+faststart",  # Enable streaming
        ffmpeg_builder.posix_path(output_path),
    ])

    ffmpeg_builder.run_ffmpeg(
        args,
        description="Final encode: muxing video + audio",
        timeout=600,  # Allow more time for final encode
    )

    return output_path
