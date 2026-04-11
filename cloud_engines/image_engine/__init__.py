"""Image Engine — Stage 3 of the Resonance pipeline.

Generates visual storyboards via LLM and renders images via Google Gemini.
"""

__version__ = "1.0.0"

from .engine import generate_images

__all__ = ["generate_images", "__version__"]
