"""FFMPEG command construction and execution helpers.

All FFMPEG interaction in the Assembly Engine goes through this module.
This provides a single point for logging, error handling, and
reproducibility tracking (commands logged in generation-meta.json).
"""

from __future__ import annotations

import json
import logging
import subprocess
from pathlib import Path
from typing import Optional

from .models import MediaInfo

logger = logging.getLogger(__name__)


def run_ffmpeg(
    args: list[str],
    description: str = "",
    timeout: int = 300,
) -> subprocess.CompletedProcess[str]:
    """Execute an FFMPEG command.

    Args:
        args: FFMPEG arguments (without the leading "ffmpeg").
        description: Human-readable description for logging.
        timeout: Maximum execution time in seconds.

    Returns:
        The completed process.

    Raises:
        RuntimeError: If FFMPEG exits with a non-zero status.
    """
    cmd = ["ffmpeg", "-y"] + args
    cmd_str = " ".join(cmd)

    if description:
        logger.info(f"FFMPEG: {description}")
    logger.debug(f"FFMPEG command: {cmd_str}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            f"FFMPEG timed out after {timeout}s: {description or cmd_str}"
        )

    if result.returncode != 0:
        # Extract the most useful error lines from stderr
        stderr_lines = result.stderr.strip().split("\n")
        error_lines = [
            line for line in stderr_lines[-10:]
            if line.strip()
        ]
        error_msg = "\n".join(error_lines)
        raise RuntimeError(
            f"FFMPEG failed (exit {result.returncode}): {description}\n{error_msg}"
        )

    return result


def run_ffmpeg_for_stderr(
    args: list[str],
    description: str = "",
    timeout: int = 120,
) -> str:
    """Execute an FFMPEG command and return its stderr output.

    Useful for commands where FFMPEG writes analysis data to stderr
    (e.g., silencedetect, loudnorm measurement).

    Does NOT raise on non-zero exit since analysis commands use -f null.
    """
    cmd = ["ffmpeg"] + args
    cmd_str = " ".join(cmd)

    if description:
        logger.info(f"FFMPEG analysis: {description}")
    logger.debug(f"FFMPEG command: {cmd_str}")

    try:
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=timeout,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(
            f"FFMPEG analysis timed out after {timeout}s: {description or cmd_str}"
        )

    return result.stderr


def probe_media(path: str) -> MediaInfo:
    """Probe a media file for duration, resolution, and codec info.

    Args:
        path: Path to the media file.

    Returns:
        MediaInfo with probed metadata.

    Raises:
        ValueError: If the file does not exist.
        RuntimeError: If ffprobe fails.
    """
    p = Path(path)
    if not p.is_file():
        raise ValueError(f"Media file not found: {path}")

    try:
        result = subprocess.run(
            [
                "ffprobe",
                "-v", "quiet",
                "-print_format", "json",
                "-show_format",
                "-show_streams",
                p.as_posix(),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError(f"ffprobe timed out for: {path}")

    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed for {path}: {result.stderr.strip()}")

    try:
        data = json.loads(result.stdout)
    except json.JSONDecodeError:
        raise RuntimeError(f"ffprobe returned invalid JSON for: {path}")

    # Extract duration from format
    duration = 0.0
    fmt = data.get("format", {})
    if "duration" in fmt:
        duration = float(fmt["duration"])

    # Extract stream info
    width: Optional[int] = None
    height: Optional[int] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    has_audio = False
    has_video = False

    for stream in data.get("streams", []):
        codec_type = stream.get("codec_type")
        if codec_type == "video":
            has_video = True
            width = stream.get("width")
            height = stream.get("height")
            video_codec = stream.get("codec_name")
            # If format duration is missing, try stream duration
            if duration == 0.0 and "duration" in stream:
                duration = float(stream["duration"])
        elif codec_type == "audio":
            has_audio = True
            audio_codec = stream.get("codec_name")
            if duration == 0.0 and "duration" in stream:
                duration = float(stream["duration"])

    return MediaInfo(
        path=path,
        duration=duration,
        width=width,
        height=height,
        video_codec=video_codec,
        audio_codec=audio_codec,
        has_audio=has_audio,
        has_video=has_video,
    )


def get_duration(path: str) -> float:
    """Get the duration of a media file in seconds.

    Convenience wrapper around probe_media.
    """
    info = probe_media(path)
    return info.duration


def build_scale_filter(target_width: int, target_height: int) -> str:
    """Build an FFMPEG scale+pad filter for aspect-ratio-preserving scaling.

    Per ENGINE_ASSEMBLY.md Section 9.2:
    - Uses lanczos for downscaling (sharp)
    - Pads with black bars if aspect ratio doesn't match
    - Content is never distorted

    Returns:
        FFMPEG filter string for -vf or -filter_complex.
    """
    return (
        f"scale={target_width}:{target_height}"
        f":force_original_aspect_ratio=decrease"
        f":flags=lanczos,"
        f"pad={target_width}:{target_height}"
        f":(ow-iw)/2:(oh-ih)/2:color=black,"
        f"setsar=1"
    )


def posix_path(path: str) -> str:
    """Convert a path to forward slashes for FFMPEG compatibility on Windows."""
    return Path(path).as_posix()
