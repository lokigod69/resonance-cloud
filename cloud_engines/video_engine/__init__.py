"""Video Engine — Stage 4 of the Resonance pipeline.

Transforms still images into video clips via Ken Burns (FFMPEG),
LTX (Fal.ai cloud), or Kling (Fal.ai cloud) modes.
"""

__version__ = "0.1.0"

from .engine import generate_video
from .models import VideoPayload, VideoResult

__all__ = ["generate_video", "VideoPayload", "VideoResult", "__version__"]
