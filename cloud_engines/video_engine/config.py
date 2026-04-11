"""Environment variable loading and system checks for the Video Engine.

Reads API keys from .env, provides FFMPEG availability checks,
and defines resolution constants.
"""

from __future__ import annotations

import logging
import os
import subprocess

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# --- API Keys ---

FAL_KEY: str = os.environ.get("FAL_KEY", "")

# --- Resolution Map ---

RESOLUTION_MAP: dict[str, tuple[int, int]] = {
    "480p": (854, 480),
    "720p": (1280, 720),
    "1080p": (1920, 1080),
}


# --- FFMPEG Checks ---


def check_ffmpeg() -> str:
    """Check that ffmpeg is available and return its version string.

    Raises:
        RuntimeError: If ffmpeg is not found or not functional.
    """
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode != 0:
            raise RuntimeError(f"ffmpeg returned exit code {result.returncode}")
        # Extract version from first line, e.g. "ffmpeg version 6.1.1 ..."
        first_line = result.stdout.strip().split("\n")[0]
        return first_line
    except FileNotFoundError:
        raise RuntimeError(
            "ffmpeg not found on PATH. Install ffmpeg and ensure it is accessible."
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("ffmpeg version check timed out")


def posix_path(path: str) -> str:
    """Convert a Windows path to forward-slash format for FFMPEG compatibility."""
    return path.replace("\\", "/")
