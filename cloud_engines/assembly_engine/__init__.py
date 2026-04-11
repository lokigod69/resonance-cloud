"""Assembly Engine — Stage 5 of the Resonance Pipeline.

Combines song audio and video clips into a final assembled MP4 via FFMPEG.
Fully local — no cloud APIs, no LLM calls.
"""

__version__ = "0.1.0"

from .engine import assemble, trim_video
from .models import AssemblyPayload, AssemblyResult, TrimPayload

__all__ = [
    "assemble", "trim_video",
    "AssemblyPayload", "AssemblyResult", "TrimPayload",
    "__version__",
]
