"""Tests for the static thematic TTS pilot CLI helpers."""

from __future__ import annotations

from typing import Any

import pytest

from scripts.generate_static_thematic_tts import (
    StaticTtsConfig,
    build_cache_key,
    build_storage_path,
    postprocess_audio,
    resolve_or_upsert_voice_profile,
    run_inventory,
)
from src.services.guided_tts.inventory import DEFAULT_VOICE_SETTINGS, text_hash, voice_settings_hash
from tests.fake_supabase import FakeSupabase


class RecordingStorage:
    def __init__(self) -> None:
        self.uploads: list[dict[str, Any]] = []
        self._bucket: str | None = None

    def from_(self, bucket: str):
        self._bucket = bucket
        return self

    def upload(self, path: str, data: bytes, file_options: dict[str, str]):
        self.uploads.append(
            {"bucket": self._bucket, "path": path, "data": data, "file_options": file_options}
        )

    def get_public_url(self, path: str):
        return f"https://cdn.example/{self._bucket}/{path}"


def make_inventory() -> list[dict[str, Any]]:
    return [
        {
            "target_language_code": "en",
            "category_slug": "animals",
            "level_number": 1,
            "order": 1,
            "concept_id": "animals.dog",
            "target_term": "dog",
            "spoken_text": "dog",
            "part_of_speech": "noun",
            "sense": "animals",
        }
    ]


def make_config(**overrides) -> StaticTtsConfig:
    base = {
        "target_language": "en",
        "category": "animals",
        "voice_profile_key": "static_thematic_en_animals_v1",
        "voice_name": "Eliza",
        "provider_voice_id": None,
        "commit_db": False,
        "allow_provider_calls": False,
        "skip_existing": True,
        "force_regenerate": False,
        "limit": None,
        "allow_raw_audio": True,
        "postprocess_mode": "raw",
        "qa_status": "ready",
        "activate_assignment": False,
    }
    base.update(overrides)
    return StaticTtsConfig(**base)


def test_storage_path_is_stable_static_layout():
    assert build_storage_path(
        target_language_code="en",
        voice_profile_key="static_thematic_en_animals_v1",
        category_slug="animals",
        level_number=1,
        concept_id="animals.dog",
    ) == "static/v1/en/static_thematic_en_animals_v1/animals/level-1/animals.dog.mp3"


def test_storage_path_differs_by_voice_profile_key():
    elisa = build_storage_path(
        target_language_code="en",
        voice_profile_key="static_thematic_en_animals_elisa_raw_v1",
        category_slug="animals",
        level_number=1,
        concept_id="animals.dog",
    )
    serafina = build_storage_path(
        target_language_code="en",
        voice_profile_key="static_thematic_en_animals_serafina_raw_v1",
        category_slug="animals",
        level_number=1,
        concept_id="animals.dog",
    )
    assert elisa != serafina
    assert elisa.endswith("/static_thematic_en_animals_elisa_raw_v1/animals/level-1/animals.dog.mp3")
    assert serafina.endswith("/static_thematic_en_animals_serafina_raw_v1/animals/level-1/animals.dog.mp3")


def test_cache_key_is_deterministic_and_changes_by_voice():
    first = build_cache_key(
        provider="elevenlabs",
        target_language_code="en",
        voice_profile_key="static_thematic_en_animals_v1",
        provider_voice_id="voice-a",
        provider_model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128",
        settings_hash="settings",
        normalization_version="v1",
        text_hash_value="text",
    )
    second = build_cache_key(
        provider="elevenlabs",
        target_language_code="en",
        voice_profile_key="static_thematic_en_animals_v1",
        provider_voice_id="voice-a",
        provider_model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128",
        settings_hash="settings",
        normalization_version="v1",
        text_hash_value="text",
    )
    third = build_cache_key(
        provider="elevenlabs",
        target_language_code="en",
        voice_profile_key="static_thematic_en_animals_v1",
        provider_voice_id="voice-b",
        provider_model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128",
        settings_hash="settings",
        normalization_version="v1",
        text_hash_value="text",
    )
    assert first == second
    assert first != third


def test_dry_run_never_calls_provider_or_writes():
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    sb.table("voices")
    sb.table("guided_voice_profiles")
    sb._tables["voices"] = [{"voice_id": "voice-eliza", "name": "Eliza", "language_code": "en"}]
    calls = 0

    async def provider(**_kwargs):
        nonlocal calls
        calls += 1
        return b"audio"

    report = run_inventory(
        sb=sb,
        inventory=make_inventory(),
        config=make_config(),
        provider_synthesize=provider,
    )

    assert calls == 0
    assert report["mode"] == "dry-run"
    assert report["totals"]["would_generate"] == 1
    assert sb._tables.get("static_tts_asset_usages", []) == []
    assert sb.storage.uploads == []


def test_raw_mode_preserves_provider_bytes_without_ffmpeg_filters(monkeypatch):
    calls: list[list[str]] = []

    def fake_run(command, **_kwargs):
        calls.append(command)
        raise AssertionError("raw mode must not invoke subprocess audio tools")

    monkeypatch.setattr("scripts.generate_static_thematic_tts.subprocess.run", fake_run)
    monkeypatch.setattr("scripts.generate_static_thematic_tts._probe_duration_ms", lambda _path: 720)

    raw = b"provider-original-audio" * 32
    processed, duration_ms, qa = postprocess_audio(raw, postprocess_mode="raw")

    assert processed == raw
    assert duration_ms == 720
    assert qa["status"] == "raw"
    assert qa["postprocess_mode"] == "raw"
    assert qa["raw_duration_ms"] == 720
    assert qa["final_duration_ms"] == 720
    assert qa["raw_file_size_bytes"] == len(raw)
    assert calls == []


def test_commit_without_allow_provider_calls_refuses_generation():
    sb = FakeSupabase()
    sb.table("voices")
    sb.table("guided_voice_profiles")
    sb._tables["voices"] = [{"voice_id": "voice-eliza", "name": "Eliza", "language_code": "en"}]

    with pytest.raises(RuntimeError, match="--allow-provider-calls"):
        run_inventory(
            sb=sb,
            inventory=make_inventory(),
            config=make_config(commit_db=True, allow_provider_calls=False),
            provider_synthesize=lambda **_kwargs: b"audio",
        )


def test_skips_existing_ready_asset_and_usage():
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    settings_hash = voice_settings_hash(DEFAULT_VOICE_SETTINGS)
    profile = {
        "id": "profile-1",
        "voice_profile_key": "static_thematic_en_animals_v1",
        "provider": "elevenlabs",
        "target_language_code": "en",
        "provider_voice_id": "voice-eliza",
        "provider_model_id": "eleven_flash_v2_5",
        "output_format": "mp3_44100_128",
        "voice_settings": dict(DEFAULT_VOICE_SETTINGS),
        "voice_settings_hash": settings_hash,
        "assignment_version": 1,
        "active": True,
        "priority": 100,
    }
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("static_tts_asset_usages")
    sb._tables["guided_voice_profiles"] = [profile]
    cache_key = build_cache_key(
        provider="elevenlabs",
        target_language_code="en",
        voice_profile_key="static_thematic_en_animals_v1",
        provider_voice_id="voice-eliza",
        provider_model_id="eleven_flash_v2_5",
        output_format="mp3_44100_128",
        settings_hash=settings_hash,
        normalization_version="v1",
        text_hash_value=text_hash("dog"),
    )
    sb._tables["guided_tts_assets"] = [
        {"id": "asset-1", "cache_key": cache_key, "status": "ready", "public_url": "https://cdn/dog.mp3"}
    ]
    sb._tables["static_tts_asset_usages"] = [
        {
            "id": "usage-1",
            "asset_id": "asset-1",
            "target_language_code": "en",
            "category_slug": "animals",
            "level_number": 1,
            "concept_id": "animals.dog",
            "spoken_text": "dog",
            "voice_profile_key": "static_thematic_en_animals_v1",
            "audio_version": 1,
            "qa_status": "ready",
        }
    ]
    calls = 0

    async def provider(**_kwargs):
        nonlocal calls
        calls += 1
        return b"audio"

    report = run_inventory(
        sb=sb,
        inventory=make_inventory(),
        config=make_config(commit_db=True, allow_provider_calls=True),
        provider_synthesize=provider,
    )

    assert calls == 0
    assert report["items"][0]["status"] == "skipped_existing"
    assert report["totals"]["skipped_existing"] == 1


def test_commit_uses_configured_qa_status_and_does_not_activate_assignment_by_default(monkeypatch):
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    sb.table("voices")
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("static_tts_asset_usages")
    sb.table("static_tts_voice_assignments")
    sb._tables["voices"] = [{"voice_id": "voice-elisa", "name": "Elisa", "language_code": "en"}]

    raw_audio = b"raw-audio" * 128

    async def provider(**_kwargs):
        return raw_audio

    monkeypatch.setattr("scripts.generate_static_thematic_tts._probe_duration_ms", lambda _path: 740)

    report = run_inventory(
        sb=sb,
        inventory=make_inventory(),
        config=make_config(
            voice_profile_key="static_thematic_en_animals_elisa_raw_v1",
            voice_name="Elisa",
            commit_db=True,
            allow_provider_calls=True,
            postprocess_mode="raw",
            qa_status="ready",
            activate_assignment=False,
        ),
        provider_synthesize=provider,
    )

    assert report["totals"]["generated"] == 1
    assert sb.storage.uploads[0]["data"] == raw_audio
    assert sb._tables["static_tts_asset_usages"][0]["qa_status"] == "ready"
    assert sb._tables["static_tts_voice_assignments"] == []
    assert report["items"][0]["postprocess"]["postprocess_mode"] == "raw"


def test_voice_profile_resolution_fails_without_name_or_provider_id():
    sb = FakeSupabase()
    sb.table("guided_voice_profiles")

    with pytest.raises(RuntimeError, match="voice-name"):
        resolve_or_upsert_voice_profile(sb, make_config(voice_name=None, provider_voice_id=None))
