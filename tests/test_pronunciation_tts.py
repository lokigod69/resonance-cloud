from __future__ import annotations

import asyncio
from typing import Any

import pytest

from tests.fake_supabase import FakeSupabase


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


class RecordingStorage:
    def __init__(self):
        self.bucket: str | None = None
        self.uploads: list[dict[str, Any]] = []

    def from_(self, bucket: str):
        self.bucket = bucket
        return self

    def upload(self, path: str, data: bytes, file_options: dict[str, str]):
        self.uploads.append({"bucket": self.bucket, "path": path, "data": data, "file_options": file_options})

    def get_public_url(self, path: str):
        return f"https://cdn.example/{self.bucket}/{path}"


def test_normalize_and_hash_canonicalizes_smart_quotes_and_spacing():
    from src.services.pronunciation_tts import normalize_spoken_text, pre_hash_normalize, spoken_text_hash

    raw = "  \u201cL\u2019eau\u201d\u00a0\u2014  froide  "
    normalized = normalize_spoken_text(raw)

    assert normalized == "\"L'eau\" - froide"
    assert pre_hash_normalize(raw) == "\"L'eau\" - froide"
    assert spoken_text_hash(raw) == spoken_text_hash(" \"L'eau\" - froide ")


def test_cache_hit_does_not_call_elevenlabs():
    from src.services.pronunciation_tts import get_or_create_tts_asset, spoken_text_hash

    sb = FakeSupabase()
    sb._tables["tts_assets"].append(
        {
            "id": "asset-1",
            "language_code": "de",
            "provider": "elevenlabs",
            "provider_voice_id": "voice-a",
            "spoken_text_hash": spoken_text_hash("Hallo"),
            "audio_url": "https://cdn.example/tts-pronunciations/de/voice-a/hallo.mp3",
        }
    )
    sb.storage = RecordingStorage()

    async def provider_generate(**_kwargs):
        raise AssertionError("cache hit must not call ElevenLabs")

    asset = _run(
        get_or_create_tts_asset(
            sb,
            language_code="de",
            provider_voice_id="voice-a",
            model_id="eleven_flash_v2_5",
            spoken_text="Hallo",
            provider_generate=provider_generate,
        )
    )

    assert asset["id"] == "asset-1"
    assert sb.storage.uploads == []


def test_cache_miss_calls_provider_once_and_uploads_audio():
    from src.services.pronunciation_tts import get_or_create_tts_asset, spoken_text_hash

    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    calls: list[dict[str, Any]] = []

    async def provider_generate(**kwargs):
        calls.append(kwargs)
        return b"mp3-bytes"

    asset = _run(
        get_or_create_tts_asset(
            sb,
            language_code="de",
            provider_voice_id="voice-a",
            model_id="eleven_flash_v2_5",
            spoken_text="\u201eHallo\u201c",
            provider_generate=provider_generate,
        )
    )

    expected_hash = spoken_text_hash('"Hallo"')
    assert calls == [
        {
            "text": '"Hallo"',
            "voice_id": "voice-a",
            "model_id": "eleven_flash_v2_5",
            "language_code": "de",
        }
    ]
    assert len(sb.storage.uploads) == 1
    assert sb.storage.uploads[0]["bucket"] == "tts-pronunciations"
    assert sb.storage.uploads[0]["data"] == b"mp3-bytes"
    assert expected_hash in sb.storage.uploads[0]["path"]
    assert asset["spoken_text_hash"] == expected_hash
    assert asset["audio_url"].startswith("https://cdn.example/tts-pronunciations/")
    assert sb._tables["tts_assets"][0]["provider_voice_id"] == "voice-a"


def test_same_word_same_voice_dedups_across_decks():
    from src.services.pronunciation_tts import generate_target_headword_for_card

    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    calls: list[str] = []

    async def provider_generate(**kwargs):
        calls.append(kwargs["text"])
        return b"same-audio"

    first = _run(
        generate_target_headword_for_card(
            sb,
            word_row={"id": "word-1", "word": "bonjour", "deck_id": "deck-a", "user_id": "user-1"},
            language_code="fr",
            bookend_settings={"voice_id": "voice-fr", "model_id": "eleven_flash_v2_5"},
            provider_generate=provider_generate,
        )
    )
    second = _run(
        generate_target_headword_for_card(
            sb,
            word_row={"id": "word-2", "word": "bonjour", "deck_id": "deck-b", "user_id": "user-1"},
            language_code="fr",
            bookend_settings={"voice_id": "voice-fr", "model_id": "eleven_flash_v2_5"},
            provider_generate=provider_generate,
        )
    )

    assert calls == ["bonjour"]
    assert len(sb._tables["tts_assets"]) == 1
    assert len(sb._tables["word_tts_assets"]) == 2
    assert first["tts_audio_url"] == second["tts_audio_url"]
    assert first["tts_status"] == "ready"
    assert second["tts_status"] == "ready"


def test_different_voice_creates_different_asset():
    from src.services.pronunciation_tts import generate_target_headword_for_card

    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    calls: list[str] = []

    async def provider_generate(**kwargs):
        calls.append(kwargs["voice_id"])
        return b"audio"

    for voice_id in ("voice-a", "voice-b"):
        _run(
            generate_target_headword_for_card(
                sb,
                word_row={"id": f"word-{voice_id}", "word": "agua", "deck_id": "deck-1", "user_id": "user-1"},
                language_code="es",
                bookend_settings={"voice_id": voice_id, "model_id": "eleven_flash_v2_5"},
                provider_generate=provider_generate,
            )
        )

    assert calls == ["voice-a", "voice-b"]
    assert len(sb._tables["tts_assets"]) == 2
    assert {row["provider_voice_id"] for row in sb._tables["tts_assets"]} == {"voice-a", "voice-b"}


def test_generate_target_headword_requires_voice_id_without_provider_call():
    from src.services.pronunciation_tts import generate_target_headword_for_card

    sb = FakeSupabase()

    async def provider_generate(**_kwargs):
        raise AssertionError("missing voice must not call ElevenLabs")

    with pytest.raises(ValueError, match="voice_id"):
        _run(
            generate_target_headword_for_card(
                sb,
                word_row={"id": "word-1", "word": "ciao", "deck_id": "deck-1", "user_id": "user-1"},
                language_code="it",
                bookend_settings={"voice_id": "", "model_id": "eleven_flash_v2_5"},
                provider_generate=provider_generate,
            )
        )
