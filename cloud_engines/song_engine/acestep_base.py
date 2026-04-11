"""Abstract base class for Ace-Step backends.

Per ENGINE_SONG.md Section 3 and 12.2:
Two backends (HTTP API and Gradio) share a common interface.
The factory function selects the right backend based on configuration.
"""

from __future__ import annotations

from abc import ABC, abstractmethod

from .models import AceStepParams, AceStepResponse


class AceStepBackend(ABC):
    """Abstract interface for communicating with Ace-Step."""

    @abstractmethod
    def generate(self, params: AceStepParams) -> AceStepResponse:
        """Send a generation request to Ace-Step and return audio data.

        Args:
            params: Complete Ace-Step parameter set.

        Returns:
            AceStepResponse with audio file paths, seeds, and timing.

        Raises:
            ConnectionError: If Ace-Step is unreachable.
            RuntimeError: If generation fails on the Ace-Step side.
        """

    @abstractmethod
    def health_check(self) -> bool:
        """Check if Ace-Step is reachable and ready.

        Returns:
            True if Ace-Step responds, False otherwise.
        """

    @property
    @abstractmethod
    def backend_name(self) -> str:
        """Return the backend type identifier ('http' or 'gradio')."""

    @property
    @abstractmethod
    def url(self) -> str:
        """Return the backend URL."""


def create_backend(backend_type: str, url: str) -> AceStepBackend:
    """Factory function to create the appropriate Ace-Step backend.

    Args:
        backend_type: "http" or "gradio".
        url: The Ace-Step server URL.

    Returns:
        An AceStepBackend instance.

    Raises:
        ValueError: If backend_type is not recognized.
    """
    if backend_type == "http":
        from .acestep_http import AceStepHTTP

        return AceStepHTTP(url)
    elif backend_type == "gradio":
        from .acestep_gradio import AceStepGradio

        return AceStepGradio(url)
    else:
        raise ValueError(f"Unknown backend type: '{backend_type}'. Must be 'http' or 'gradio'.")
