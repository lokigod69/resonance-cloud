"""Ken Burns adapter — FFMPEG zoompan-based image animation.

Per ENGINE_VIDEO_v1_1.md Section 3.2:
- No cloud API, no cost, fully local
- Uses FFMPEG zoompan filter for pan/zoom animation
- Scales input image 2x before applying motion (prevents hitting edges)
- Supports: slow_zoom_in, slow_zoom_out, pan_left/right/up/down, static
- Duration is fully flexible (any number of seconds)
"""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any, Optional

from .. import config
from ..cost import estimate_cost
from ..download import extract_thumbnail
from ..models import VideoContent, VideoSettings
from .base import VideoProviderAdapter

logger = logging.getLogger(__name__)

# Speed mapping: camera_motion.speed -> zoom increment per frame
# These values work well for a 2x-scaled image where the viewport
# is half the image size, giving ~50% room for movement.
SPEED_MAP: dict[str, float] = {
    "very_slow": 0.5,
    "slow": 1.0,
    "medium": 2.0,
}

# Default zoom factor for zoom motions (total zoom over the clip)
# 0.0015 per frame at 25fps for 5s = ~19% total zoom
ZOOM_INCREMENT_MAP: dict[str, float] = {
    "very_slow": 0.0008,
    "slow": 0.0015,
    "medium": 0.0025,
}

# Map cinematic extended types to the closest basic Ken Burns equivalent.
# Ken Burns can only do zoom and pan (FFMPEG zoompan on a still image).
_EXTENDED_TO_BASIC: dict[str, str] = {
    "dolly_in": "slow_zoom_in",
    "dolly_out": "slow_zoom_out",
    "orbit_left": "pan_left",
    "orbit_right": "pan_right",
    "tracking_left": "pan_left",
    "tracking_right": "pan_right",
    "crane_up": "pan_up",
    "crane_down": "pan_down",
    "push_in": "slow_zoom_in",
    "pull_out": "slow_zoom_out",
    "handheld": "slow_zoom_in",
}


class KenBurnsAdapter(VideoProviderAdapter):
    """FFMPEG Ken Burns animation adapter.

    Takes a still image and produces a pan/zoom animated MP4 clip.
    No API calls, no cost, instant generation.
    """

    @property
    def provider_name(self) -> str:
        return "local/ffmpeg"

    @property
    def model_name(self) -> str:
        return "ffmpeg-zoompan"

    def validate_settings(self, settings: VideoSettings) -> VideoSettings:
        """Ken Burns accepts any duration and fps. Minimal validation."""
        return settings.model_copy()

    def estimate_cost(self, settings: VideoSettings) -> float:
        return estimate_cost("ken_burns", settings.duration)

    def generate(
        self,
        image_path: Optional[str],
        content: VideoContent,
        settings: VideoSettings,
        output_path: str,
    ) -> dict[str, Any]:
        """Generate a Ken Burns animated clip using FFMPEG.

        Steps:
        1. Scale input image 2x (provides room for pan/zoom)
        2. Build zoompan filter from camera_motion
        3. Encode as H.264 MP4
        4. Extract thumbnail
        """
        if image_path is None:
            raise ValueError(
                "Ken Burns mode requires a source image (text-to-video is not supported)"
            )

        if content.end_image_path:
            logger.warning(
                "Ken Burns mode does not support end_image_path (frame transitions). "
                "Ignoring end image and proceeding with single image animation."
            )

        image_path_p = Path(image_path)
        if not image_path_p.is_file():
            raise FileNotFoundError(f"Source image not found: {image_path}")

        output_path_p = Path(output_path)
        temp_dir = output_path_p.parent
        scaled_path = str(temp_dir / f"_scaled_{output_path_p.stem}.png")

        # Step 1: Scale image 2x
        _scale_image(image_path, scaled_path)

        # Step 2: Get image dimensions after scaling
        width, height = _probe_image_size(scaled_path)

        # Step 3: Build zoompan filter
        motion = content.camera_motion or {}
        motion_type = motion.get("type", "static")
        motion_speed = motion.get("speed", "slow")
        # Map extended cinematic types to basic Ken Burns equivalents
        if motion_type in _EXTENDED_TO_BASIC:
            motion_type = _EXTENDED_TO_BASIC[motion_type]
        # Ken Burns doesn't support fast speed; clamp to medium
        if motion_speed == "fast":
            motion_speed = "medium"
        total_frames = settings.duration * settings.fps

        # Output dimensions (half of scaled = original size)
        out_w = width // 2
        out_h = height // 2

        zoompan_filter = _build_zoompan_filter(
            motion_type=motion_type,
            motion_speed=motion_speed,
            total_frames=total_frames,
            src_w=width,
            src_h=height,
            out_w=out_w,
            out_h=out_h,
        )

        # Step 4: Run FFMPEG
        cmd = [
            "ffmpeg", "-y",
            "-loop", "1",
            "-i", config.posix_path(scaled_path),
            "-vf", zoompan_filter,
            "-t", str(settings.duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-preset", "medium",
            config.posix_path(output_path),
        ]

        logger.info(f"Ken Burns: {motion_type} ({motion_speed}), {settings.duration}s @ {settings.fps}fps")
        result = subprocess.run(
            cmd,
            capture_output=True,
            text=True,
            timeout=120,
        )

        if result.returncode != 0:
            raise RuntimeError(
                f"FFMPEG Ken Burns generation failed (exit {result.returncode}): "
                f"{result.stderr[:500]}"
            )

        # Step 5: Extract thumbnail
        thumb_path = output_path.replace(".mp4", "_thumb.jpg")
        try:
            extract_thumbnail(output_path, thumb_path)
        except RuntimeError as e:
            logger.warning(f"Thumbnail extraction failed (non-fatal): {e}")

        # Step 6: Cleanup scaled image
        try:
            Path(scaled_path).unlink(missing_ok=True)
        except Exception:
            pass

        # Build result metadata
        file_size = Path(output_path).stat().st_size
        return {
            "duration_seconds": float(settings.duration),
            "resolution": f"{out_w}x{out_h}",
            "fps": settings.fps,
            "file_size_bytes": file_size,
            "motion_type": motion_type,
            "motion_speed": motion_speed,
        }


def _scale_image(input_path: str, output_path: str) -> None:
    """Scale an image 2x using FFMPEG (provides room for Ken Burns movement)."""
    cmd = [
        "ffmpeg", "-y",
        "-i", config.posix_path(input_path),
        "-vf", "scale=iw*2:ih*2:flags=lanczos",
        config.posix_path(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(
            f"Failed to scale image: {result.stderr[:300]}"
        )


def _probe_image_size(image_path: str) -> tuple[int, int]:
    """Get image dimensions using ffprobe."""
    cmd = [
        "ffprobe", "-v", "quiet",
        "-select_streams", "v:0",
        "-show_entries", "stream=width,height",
        "-of", "csv=p=0:s=x",
        config.posix_path(image_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=10)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed on {image_path}: {result.stderr[:300]}")

    parts = result.stdout.strip().split("x")
    if len(parts) != 2:
        raise RuntimeError(f"Unexpected ffprobe output: {result.stdout.strip()}")

    return int(parts[0]), int(parts[1])


def _build_zoompan_filter(
    motion_type: str,
    motion_speed: str,
    total_frames: int,
    src_w: int,
    src_h: int,
    out_w: int,
    out_h: int,
) -> str:
    """Build the FFMPEG zoompan filter string for the given motion type.

    The zoompan filter operates on a scaled-up (2x) image. The output
    viewport (out_w x out_h) is the original image size, centered on
    the 2x image. Motion is achieved by shifting x/y offsets or
    changing the zoom level over time.

    Args:
        motion_type: One of slow_zoom_in, slow_zoom_out, pan_left, etc.
        motion_speed: One of very_slow, slow, medium.
        total_frames: Total output frames (duration * fps).
        src_w: Width of the scaled (2x) source image.
        src_h: Height of the scaled (2x) source image.
        out_w: Output viewport width (= original image width).
        out_h: Output viewport height (= original image height).

    Returns:
        A zoompan filter string for use in -vf.
    """
    speed_px = SPEED_MAP.get(motion_speed, 1.0)
    zoom_inc = ZOOM_INCREMENT_MAP.get(motion_speed, 0.0015)

    # Center coordinates (default position)
    cx = (src_w - out_w) // 2
    cy = (src_h - out_h) // 2

    # Default: static (no motion)
    zoom_expr = "1"
    x_expr = str(cx)
    y_expr = str(cy)

    if motion_type == "slow_zoom_in":
        zoom_expr = f"min(zoom+{zoom_inc},1.5)"
        x_expr = f"(iw-iw/zoom)/2"
        y_expr = f"(ih-ih/zoom)/2"

    elif motion_type == "slow_zoom_out":
        zoom_expr = f"if(eq(on,1),1.5,max(zoom-{zoom_inc},1.0))"
        x_expr = f"(iw-iw/zoom)/2"
        y_expr = f"(ih-ih/zoom)/2"

    elif motion_type == "pan_left":
        # Start right of center, pan left
        start_x = cx + int(speed_px * total_frames / 2)
        x_expr = f"if(eq(on,1),{start_x},max(x-{speed_px},{cx - int(speed_px * total_frames / 2)}))"
        y_expr = str(cy)

    elif motion_type == "pan_right":
        # Start left of center, pan right
        start_x = cx - int(speed_px * total_frames / 2)
        x_expr = f"if(eq(on,1),{start_x},min(x+{speed_px},{cx + int(speed_px * total_frames / 2)}))"
        y_expr = str(cy)

    elif motion_type == "pan_up":
        # Start below center, pan up
        start_y = cy + int(speed_px * total_frames / 2)
        x_expr = str(cx)
        y_expr = f"if(eq(on,1),{start_y},max(y-{speed_px},{cy - int(speed_px * total_frames / 2)}))"

    elif motion_type == "pan_down":
        # Start above center, pan down
        start_y = cy - int(speed_px * total_frames / 2)
        x_expr = str(cx)
        y_expr = f"if(eq(on,1),{start_y},min(y+{speed_px},{cy + int(speed_px * total_frames / 2)}))"

    elif motion_type == "static":
        pass  # defaults are fine

    else:
        logger.warning(
            f"Unknown camera_motion type '{motion_type}', defaulting to static"
        )

    fps = max(1, total_frames // max(1, total_frames // 25))  # approximate fps
    # Use the actual output dimensions from the original image
    filter_str = (
        f"zoompan=z='{zoom_expr}':"
        f"x='{x_expr}':"
        f"y='{y_expr}':"
        f"d={total_frames}:"
        f"s={out_w}x{out_h}:"
        f"fps={fps}"
    )
    return filter_str
