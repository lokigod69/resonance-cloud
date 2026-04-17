"""Song Engine — Stage 2 of the Resonance Pipeline.

Wraps Ace-Step 1.5 to produce FLAC audio from lyrics + music caption.
"""

__version__ = "0.1.0"

from .models import SongPayload, SongResult

__all__ = ["SongPayload", "SongResult", "__version__"]
