"""Tests for src/services/guided_tts/provider_elevenlabs.py.

Uses httpx.MockTransport so no real network IO happens. The ElevenLabs API
key is injected via the constructor so .env is not consulted.
"""

from __future__ import annotations

import asyncio
from typing import Any

import httpx
import pytest

from src.services.guided_tts.provider_elevenlabs import (
    ElevenLabsGuidedTTSProvider,
    GuidedTTSProviderError,
    to_elevenlabs_language_code,
)


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _ok_response(content: bytes = b"audio-bytes") -> httpx.Response:
    return httpx.Response(200, content=content, headers={"content-type": "audio/mpeg"})


def test_synthesize_posts_to_correct_endpoint_with_expected_body():
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["url"] = str(request.url)
        captured["method"] = request.method
        captured["headers"] = dict(request.headers)
        captured["json"] = request.read().decode("utf-8")
        return _ok_response(b"mp3")

    provider = ElevenLabsGuidedTTSProvider(
        api_key="test-key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    audio = _run(
        provider.synthesize(
            text="Hi there, do you speak English?",
            voice_id="voice-bright",
            model_id="eleven_flash_v2_5",
            output_format="mp3_44100_128",
            voice_settings={
                "stability": 0.75,
                "similarity_boost": 0.75,
                "style": 0.0,
                "use_speaker_boost": True,
            },
            language_code="en-US",
        )
    )

    assert audio == b"mp3"
    assert captured["method"] == "POST"
    assert "https://api.elevenlabs.io/v1/text-to-speech/voice-bright" in captured["url"]
    assert "output_format=mp3_44100_128" in captured["url"]
    assert captured["headers"]["xi-api-key"] == "test-key"
    assert captured["headers"]["accept"] == "audio/mpeg"
    assert "Hi there, do you speak English?" in captured["json"]
    assert "eleven_flash_v2_5" in captured["json"]
    # The provider rewrites BCP47 codes to ISO 639-1 before sending — see
    # to_elevenlabs_language_code.
    assert '"language_code":"en"' in captured["json"]
    assert "use_speaker_boost" in captured["json"]


def test_synthesize_omits_language_code_for_multilingual_v2():
    # ElevenLabs rejects `language_code` on models without language
    # enforcement (only Turbo/Flash v2.5 support it), so the provider must
    # drop the field for eleven_multilingual_v2.
    captured: dict[str, Any] = {}

    def handler(request: httpx.Request) -> httpx.Response:
        captured["json"] = request.read().decode("utf-8")
        return _ok_response(b"mp3")

    provider = ElevenLabsGuidedTTSProvider(
        api_key="test-key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    audio = _run(
        provider.synthesize(
            text="Dzień dobry, czy mówi pan po angielsku?",
            voice_id="voice-pl",
            model_id="eleven_multilingual_v2",
            output_format="mp3_44100_128",
            voice_settings={},
            language_code="pl",
        )
    )

    assert audio == b"mp3"
    assert "language_code" not in captured["json"]
    assert "eleven_multilingual_v2" in captured["json"]


def test_synthesize_retries_on_429_then_succeeds():
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        if len(attempts) < 3:
            return httpx.Response(429, content=b"rate limited")
        return _ok_response(b"finally")

    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    audio = _run(
        provider.synthesize(
            text="hi",
            voice_id="voice-bright",
            model_id="eleven_flash_v2_5",
            output_format="mp3_44100_128",
            voice_settings={},
            language_code=None,
        )
    )
    assert audio == b"finally"
    assert len(attempts) == 3


def test_synthesize_rejects_non_audio_200_then_recovers():
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        if len(attempts) < 2:
            return httpx.Response(
                200,
                content=b'{"detail": "proxy error"}',
                headers={"content-type": "application/json"},
            )
        return _ok_response(b"real-audio")

    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    audio = _run(
        provider.synthesize(
            text="hi",
            voice_id="voice-bright",
            model_id="eleven_flash_v2_5",
            output_format="mp3_44100_128",
            voice_settings={},
            language_code=None,
        )
    )
    assert audio == b"real-audio"
    assert len(attempts) == 2


def test_synthesize_rejects_empty_200_body_then_fails():
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(200, content=b"", headers={"content-type": "audio/mpeg"})

    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    with pytest.raises(GuidedTTSProviderError, match="non-audio 200"):
        _run(
            provider.synthesize(
                text="hi",
                voice_id="voice-bright",
                model_id="eleven_flash_v2_5",
                output_format="mp3_44100_128",
                voice_settings={},
                language_code=None,
            )
        )


def test_synthesize_retries_on_500_then_fails():
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        return httpx.Response(500, content=b"oops")

    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    with pytest.raises(GuidedTTSProviderError, match="status=500"):
        _run(
            provider.synthesize(
                text="hi",
                voice_id="voice-bright",
                model_id="eleven_flash_v2_5",
                output_format="mp3_44100_128",
                voice_settings={},
                language_code=None,
            )
        )
    assert len(attempts) == 3


def test_synthesize_does_not_retry_on_401():
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        return httpx.Response(401, content=b"unauthorized")

    provider = ElevenLabsGuidedTTSProvider(
        api_key="bad-key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    with pytest.raises(GuidedTTSProviderError, match="401 Unauthorized"):
        _run(
            provider.synthesize(
                text="hi",
                voice_id="voice-bright",
                model_id="eleven_flash_v2_5",
                output_format="mp3_44100_128",
                voice_settings={},
                language_code=None,
            )
        )
    assert len(attempts) == 1


def test_synthesize_does_not_retry_on_400():
    attempts: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        attempts.append(1)
        return httpx.Response(400, content=b"bad request")

    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    with pytest.raises(GuidedTTSProviderError):
        _run(
            provider.synthesize(
                text="hi",
                voice_id="voice-bright",
                model_id="eleven_flash_v2_5",
                output_format="mp3_44100_128",
                voice_settings={},
                language_code=None,
            )
        )
    assert len(attempts) == 1


def test_synthesize_validates_required_inputs():
    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(lambda req: _ok_response()),
    )
    with pytest.raises(GuidedTTSProviderError, match="voice_id"):
        _run(
            provider.synthesize(
                text="hi", voice_id="", model_id="m",
                output_format="mp3_44100_128", voice_settings={}, language_code=None,
            )
        )
    with pytest.raises(GuidedTTSProviderError, match="model_id"):
        _run(
            provider.synthesize(
                text="hi", voice_id="v", model_id="",
                output_format="mp3_44100_128", voice_settings={}, language_code=None,
            )
        )
    with pytest.raises(GuidedTTSProviderError, match="text"):
        _run(
            provider.synthesize(
                text="", voice_id="v", model_id="m",
                output_format="mp3_44100_128", voice_settings={}, language_code=None,
            )
        )


def test_to_elevenlabs_language_code_strips_bcp47_region():
    assert to_elevenlabs_language_code("en-US") == "en"
    assert to_elevenlabs_language_code("en-GB") == "en"
    assert to_elevenlabs_language_code("de-DE") == "de"
    assert to_elevenlabs_language_code("en") == "en"
    assert to_elevenlabs_language_code("") is None
    assert to_elevenlabs_language_code(None) is None


def test_synthesize_sends_iso_639_1_language_code_for_bcp47_input():
    captured: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured.append(request.read().decode("utf-8"))
        return _ok_response()

    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    _run(
        provider.synthesize(
            text="hi",
            voice_id="voice-bright",
            model_id="eleven_flash_v2_5",
            output_format="mp3_44100_128",
            voice_settings={},
            language_code="en-US",
        )
    )
    assert '"language_code":"en"' in captured[0]
    assert '"language_code":"en-US"' not in captured[0]


def test_synthesize_omits_language_code_when_none():
    captured_bodies: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_bodies.append(request.read().decode("utf-8"))
        return _ok_response()

    provider = ElevenLabsGuidedTTSProvider(
        api_key="key",
        transport=httpx.MockTransport(handler),
        sleeper=lambda _: asyncio.sleep(0),
    )
    _run(
        provider.synthesize(
            text="hi",
            voice_id="voice-bright",
            model_id="eleven_flash_v2_5",
            output_format="mp3_44100_128",
            voice_settings={"stability": 0.5},
            language_code=None,
        )
    )
    assert "language_code" not in captured_bodies[0]


def test_synthesize_uses_explicit_api_key_over_factory():
    captured_keys: list[str] = []

    def handler(request: httpx.Request) -> httpx.Response:
        captured_keys.append(request.headers.get("xi-api-key", ""))
        return _ok_response()

    def factory():
        return "from-env"

    provider = ElevenLabsGuidedTTSProvider(
        api_key="explicit-key",
        api_key_factory=factory,
        transport=httpx.MockTransport(handler),
    )
    _run(
        provider.synthesize(
            text="hi",
            voice_id="v",
            model_id="m",
            output_format="mp3_44100_128",
            voice_settings={},
            language_code=None,
        )
    )
    assert captured_keys == ["explicit-key"]
