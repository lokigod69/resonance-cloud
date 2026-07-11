"""ElevenLabs implementation of GuidedTTSProvider.

The retry policy and request body shape mirror the existing pronunciation
TTS implementation in src/services/pronunciation_tts.py — kept here as a
small, focused client so the Guided generation path does not import the
card-level cache machinery.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx

from cloud_engines.bookend_engine.config import get_api_key

ENDPOINT_TEMPLATE = "https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
DEFAULT_TIMEOUT_SECONDS = 30.0
MAX_RETRIES = 3
ACCEPT_HEADER = "audio/mpeg"

# ElevenLabs only accepts `language_code` on models with language enforcement
# (Turbo/Flash v2.5); Multilingual v2/v3 reject the field with a 400.
MODELS_WITH_LANGUAGE_ENFORCEMENT = ("eleven_flash_v2_5", "eleven_turbo_v2_5")


def supports_language_enforcement(model_id: str | None) -> bool:
    return (model_id or "") in MODELS_WITH_LANGUAGE_ENFORCEMENT


def to_elevenlabs_language_code(code: str | None) -> str | None:
    """Map Guided Today's BCP47 codes to ElevenLabs' ISO-639-1 wire format.

    ElevenLabs' text-to-speech models accept short codes (`en`, `de`, `fr`)
    and reject region-tagged BCP47 forms (`en-US`, `en-GB`). Strip the
    region; pass through codes that are already ISO 639-1.
    """
    if not code:
        return None
    base = code.split("-", 1)[0].strip().lower()
    return base or None


class GuidedTTSProviderError(RuntimeError):
    """Raised when the provider call fails after all retries."""


class ElevenLabsGuidedTTSProvider:
    """Concrete GuidedTTSProvider for ElevenLabs.

    The class is stateless aside from the optional injected API-key resolver.
    Tests pass a stub instead of using this class (see GuidedTTSProvider
    protocol in provider.py).
    """

    name = "elevenlabs"

    def __init__(
        self,
        *,
        api_key: str | None = None,
        api_key_factory: callable | None = None,
        endpoint_template: str = ENDPOINT_TEMPLATE,
        timeout_seconds: float = DEFAULT_TIMEOUT_SECONDS,
        max_retries: int = MAX_RETRIES,
        transport: httpx.AsyncBaseTransport | None = None,
        sleeper: callable | None = None,
    ) -> None:
        self._api_key = api_key
        self._api_key_factory = api_key_factory or get_api_key
        self._endpoint_template = endpoint_template
        self._timeout_seconds = timeout_seconds
        self._max_retries = max_retries
        self._transport = transport
        self._sleeper = sleeper or asyncio.sleep

    def _resolve_api_key(self) -> str:
        if self._api_key:
            return self._api_key
        key = self._api_key_factory()
        if not key:
            raise GuidedTTSProviderError("ELEVENLABS_API_KEY is not set")
        return key

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
        if not voice_id:
            raise GuidedTTSProviderError("voice_id is required")
        if not model_id:
            raise GuidedTTSProviderError("model_id is required")
        if not text:
            raise GuidedTTSProviderError("text is required")

        api_key = self._resolve_api_key()
        url = self._endpoint_template.format(voice_id=voice_id)
        params = {"output_format": output_format} if output_format else None

        body: dict[str, Any] = {
            "text": text,
            "model_id": model_id,
            "voice_settings": dict(voice_settings or {}),
        }
        wire_language_code = to_elevenlabs_language_code(language_code)
        if wire_language_code and supports_language_enforcement(model_id):
            body["language_code"] = wire_language_code

        headers = {
            "xi-api-key": api_key,
            "Content-Type": "application/json",
            "Accept": ACCEPT_HEADER,
        }
        if request_id:
            headers["X-Request-Id"] = request_id

        client_kwargs: dict[str, Any] = {"timeout": self._timeout_seconds}
        if self._transport is not None:
            client_kwargs["transport"] = self._transport

        last_error: str | None = None
        for attempt in range(self._max_retries):
            try:
                async with httpx.AsyncClient(**client_kwargs) as client:
                    response = await client.post(
                        url,
                        headers=headers,
                        params=params,
                        json=body,
                    )
            except httpx.TimeoutException:
                last_error = "timeout"
                if attempt < self._max_retries - 1:
                    await self._sleeper(2 ** attempt)
                    continue
                raise GuidedTTSProviderError(
                    f"ElevenLabs timeout after {self._max_retries} attempts"
                )

            if response.status_code == 200:
                return response.content

            if response.status_code == 401:
                raise GuidedTTSProviderError(
                    "ElevenLabs returned 401 Unauthorized — check ELEVENLABS_API_KEY"
                )

            if response.status_code == 429 or response.status_code >= 500:
                last_error = (
                    f"status={response.status_code} body={response.text[:200]!r}"
                )
                if attempt < self._max_retries - 1:
                    await self._sleeper(2 ** attempt)
                    continue

            raise GuidedTTSProviderError(
                f"ElevenLabs error: status={response.status_code} "
                f"body={response.text[:200]!r}"
            )

        raise GuidedTTSProviderError(
            f"ElevenLabs failed after {self._max_retries} attempts ({last_error})"
        )


__all__ = [
    "ElevenLabsGuidedTTSProvider",
    "GuidedTTSProviderError",
    "supports_language_enforcement",
]
