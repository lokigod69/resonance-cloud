"""Song Engine — Stage 2 of the Resonance Pipeline.

Wraps Ace-Step 1.5 to produce FLAC audio from lyrics + music caption.
"""

__version__ = "0.1.0"

from .engine import generate_song
from .models import SongPayload, SongResult

__all__ = ["generate_song", "SongPayload", "SongResult", "__version__"]
