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

# --- GPU Worker (self-hosted LTX backend) ---

VIDEO_BACKEND: str = os.getenv("VIDEO_BACKEND", "fal")
GPU_WORKER_URL: str = os.getenv("GPU_WORKER_URL", "")
GPU_WORKER_TOKEN: str = os.getenv("GPU_WORKER_TOKEN", "")
GPU_WORKER_TIMEOUT: int = int(os.getenv("GPU_WORKER_TIMEOUT", "600"))
GPU_WORKER_POLL_INTERVAL: int = int(os.getenv("GPU_WORKER_POLL_INTERVAL", "5"))

# --- RunPod Serverless ---

RUNPOD_API_KEY: str = os.getenv("RUNPOD_API_KEY", "")
RUNPOD_ENDPOINT_ID: str = os.getenv("RUNPOD_ENDPOINT_ID", "")

# --- RunPod Pod Automation (Level 2) ---
# When GPU_WORKER_URL is empty AND RUNPOD_API_KEY is set, pod_manager
# creates/terminates pods dynamically. When GPU_WORKER_URL is set, Level 2 is
# bypassed and the adapter uses that fixed URL (manual override).

RUNPOD_VOLUME_IDS: list[str] = [
    v.strip() for v in os.getenv("RUNPOD_VOLUME_IDS", "").split(",") if v.strip()
]
RUNPOD_GPU_TYPE: str = os.getenv("RUNPOD_GPU_TYPE", "NVIDIA L40S")
RUNPOD_FALLBACK_GPU_TYPES: list[str] = [
    g.strip() for g in os.getenv("RUNPOD_FALLBACK_GPU_TYPES", "").split(",") if g.strip()
]
RUNPOD_DOCKER_IMAGE: str = os.getenv("RUNPOD_DOCKER_IMAGE", "lokiii69/ltx-worker:diffusers-v1")
RUNPOD_IDLE_TIMEOUT: int = int(os.getenv("RUNPOD_IDLE_TIMEOUT", "300"))
RUNPOD_POD_STARTUP_TIMEOUT: int = int(os.getenv("RUNPOD_POD_STARTUP_TIMEOUT", "300"))
RUNPOD_POD_NAME: str = os.getenv("RUNPOD_POD_NAME", "resonance-gpu-worker")

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
