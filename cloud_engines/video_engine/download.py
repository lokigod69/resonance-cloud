"""Video download from cloud URL and thumbnail extraction.

Per ENGINE_VIDEO_v1_1.md Section 6:
- Download MP4 from returned URL
- Retry up to 3 times with exponential backoff
- Verify valid MP4 (basic header check)
- Extract first frame as JPEG thumbnail
"""

from __future__ import annotations

import logging
import subprocess
import time
from pathlib import Path

import httpx

from . import config

logger = logging.getLogger(__name__)

MAX_RETRIES = 3
RETRY_DELAYS = [1, 2, 4]  # exponential backoff in seconds


def download_video(url: str, output_path: str) -> str:
    """Download a video file from a URL with retry logic.

    Args:
        url: Public URL of the generated video.
        output_path: Local path to save the MP4 file.

    Returns:
        The output_path on success.

    Raises:
        RuntimeError: After all retries exhausted or invalid MP4.
    """
    for attempt in range(MAX_RETRIES):
        try:
            with httpx.stream(
                "GET", url, timeout=120.0, follow_redirects=True
            ) as resp:
                resp.raise_for_status()
                with open(output_path, "wb") as f:
                    for chunk in resp.iter_bytes(chunk_size=8192):
                        f.write(chunk)

            _validate_mp4(output_path)
            file_size = Path(output_path).stat().st_size
            logger.info(
                f"Downloaded video ({file_size / 1024 / 1024:.1f} MB): {output_path}"
            )
            return output_path

        except (httpx.HTTPError, ValueError) as e:
            logger.warning(
                f"Download attempt {attempt + 1}/{MAX_RETRIES} failed: {e}"
            )
            if attempt < MAX_RETRIES - 1:
                time.sleep(RETRY_DELAYS[attempt])
            else:
                raise RuntimeError(
                    f"Failed to download video after {MAX_RETRIES} attempts: {e}"
                )

    # Should not reach here, but satisfy type checker
    raise RuntimeError("Download failed unexpectedly")


def _validate_mp4(path: str) -> None:
    """Basic MP4 header validation — check for ftyp box in first 12 bytes."""
    with open(path, "rb") as f:
        header = f.read(12)
    if b"ftyp" not in header:
        raise ValueError(
            f"Downloaded file does not appear to be a valid MP4: {path}"
        )


def extract_thumbnail(video_path: str, thumb_path: str) -> str:
    """Extract the first frame of a video as a JPEG thumbnail.

    Args:
        video_path: Path to the source MP4 video.
        thumb_path: Path to save the JPEG thumbnail.

    Returns:
        The thumb_path on success.

    Raises:
        RuntimeError: If ffmpeg fails to extract the thumbnail.
    """
    try:
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", config.posix_path(video_path),
                "-frames:v", "1",
                "-q:v", "2",
                config.posix_path(thumb_path),
            ],
            capture_output=True,
            text=True,
            timeout=30,
        )
        if result.returncode != 0:
            raise RuntimeError(
                f"ffmpeg thumbnail extraction failed: {result.stderr[:500]}"
            )
        logger.info(f"Extracted thumbnail: {thumb_path}")
        return thumb_path
    except FileNotFoundError:
        raise RuntimeError("ffmpeg not found — cannot extract thumbnail")
    except subprocess.TimeoutExpired:
        raise RuntimeError("ffmpeg thumbnail extraction timed out")
