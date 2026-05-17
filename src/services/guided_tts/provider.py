"""Provider abstraction for Guided Today TTS.

Concrete implementations live next to this module (e.g. provider_elevenlabs.py).
The inventory module (inventory.py) intentionally does not import this file —
PR #1 has no provider implementation; PR #2 is the first PR that gains one.
"""

from __future__ import annotations

from typing import Any, Awaitable, Callable, Protocol


class GuidedTTSProvider(Protocol):
    """Minimal contract every Guided TTS provider must satisfy."""

    name: str

    async def synthesize(
        self,
        *,
        text: str,
        voice_id: str,
        model_id: str,
        output_format: str,
        voice_settings: dict[str, Any],
        language_code: str | None,
        request_id: str | None = None,
    ) -> bytes:
        """Return the audio bytes for the supplied text.

        The provider is responsible for any retry policy. The caller is
        responsible for caching, deduplication, and storage uploads.
        """
        ...


# Inline callable form, useful for stub injection in tests.
SynthesizeCallable = Callable[..., Awaitable[bytes]]


__all__ = ["GuidedTTSProvider", "SynthesizeCallable"]
