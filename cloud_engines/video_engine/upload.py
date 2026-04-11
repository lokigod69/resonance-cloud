"""Image upload to Fal.ai storage for cloud API modes.

Wraps fal_client.upload_file() with error handling.
Per ENGINE_VIDEO_v1_1.md Section 5: Cloud APIs require a publicly
accessible URL for the source image.
"""

from __future__ import annotations

import logging
from pathlib import Path

logger = logging.getLogger(__name__)


def upload_image(image_path: str) -> str:
    """Upload a local image to Fal.ai storage and return the public URL.

    The uploaded file is temporary — Fal.ai manages cleanup.

    Args:
        image_path: Absolute path to the source PNG/JPG file.

    Returns:
        Public URL of the uploaded image (e.g., "https://fal.media/files/abc123/001.png").

    Raises:
        FileNotFoundError: If image_path doesn't exist.
        RuntimeError: If the upload fails.
    """
    path = Path(image_path)
    if not path.is_file():
        raise FileNotFoundError(f"Image not found: {image_path}")

    try:
        import fal_client

        url = fal_client.upload_file(str(path))
        logger.info(f"Uploaded image to Fal.ai: {url}")
        return url
    except ImportError:
        raise RuntimeError(
            "fal-client package not installed. Run: uv pip install fal-client"
        )
    except Exception as e:
        raise RuntimeError(f"Failed to upload image to Fal.ai: {e}")
