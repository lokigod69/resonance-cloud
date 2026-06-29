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
            "english_qa_label": "dog",
            "part_of_speech": "noun",
            "sense": "animals",
        }
    ]


def make_cebuano_inventory() -> list[dict[str, Any]]:
    return [
        {
            "target_language_code": "ceb",
            "category_slug": "animals",
            "level_number": 1,
            "order": 1,
            "concept_id": "animals.dog",
            "target_term": "iro",
            "spoken_text": "iro",
            "english_qa_label": "dog",
            "part_of_speech": "noun",
            "sense": "animals",
        }
    ]


def make_cebuano_all_category_inventory() -> list[dict[str, Any]]:
    return [
        make_cebuano_inventory()[0],
        {
            "target_language_code": "ceb",
            "category_slug": "fruits",
            "level_number": 2,
            "order": 3,
            "concept_id": "fruits.blueberry",
            "target_term": "blueberry",
            "spoken_text": "blueberry",
            "english_qa_label": "blueberry",
            "part_of_speech": "noun",
            "sense": "fruit",
            "target_translation_is_fallback": False,
        },
    ]


def make_indonesian_inventory() -> list[dict[str, Any]]:
    return [
        {
            "target_language_code": "id",
            "category_slug": "animals",
            "level_number": 1,
            "order": 1,
            "concept_id": "animals.dog",
            "target_term": "anjing",
            "spoken_text": "anjing",
            "english_qa_label": "dog",
            "part_of_speech": "noun",
            "sense": "animals",
        }
    ]


def make_german_inventory() -> list[dict[str, Any]]:
    return [
        {
            "target_language_code": "de",
            "category_slug": "animals",
            "level_number": 1,
            "order": 1,
            "concept_id": "animals.dog",
            "target_term": "Hund",
            "spoken_text": "Hund",
            "english_qa_label": "dog",
            "part_of_speech": "noun",
            "sense": "animals",
        }
    ]


def make_spanish_inventory() -> list[dict[str, Any]]:
    return [
        {
            "target_language_code": "es",
            "category_slug": "animals",
            "level_number": 1,
            "order": 1,
            "concept_id": "animals.dog",
            "target_term": "perro",
            "spoken_text": "perro",
            "english_qa_label": "dog",
            "part_of_speech": "noun",
            "sense": "animals",
        }
    ]


def make_config(**overrides) -> StaticTtsConfig:
    base = {
        "target_language": "en",
        "category": "animals",
        "voice_profile_key": "static_thematic_en_animals_v1",
        "profile_name": None,
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


def test_raw_mode_keeps_provider_bytes_when_ffprobe_fails(monkeypatch):
    monkeypatch.setattr(
        "scripts.generate_static_thematic_tts._probe_duration_ms",
        lambda _path: (_ for _ in ()).throw(RuntimeError("ffprobe failed")),
    )

    raw = b"provider-original-audio" * 32
    processed, duration_ms, qa = postprocess_audio(raw, postprocess_mode="raw")

    assert processed == raw
    assert duration_ms is None
    assert qa["raw_duration_ms"] is None
    assert qa["final_duration_ms"] is None
    assert "ffprobe_failed" in qa["warnings"]


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


def test_all_category_cebuano_inventory_allows_explicit_same_as_english_terms():
    sb = FakeSupabase()
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb._tables["language_profiles"] = [
        {"id": "profile-bisaya", "language": "Bisaya", "name": "Bisaya1", "is_active": True}
    ]

    report = run_inventory(
        sb=sb,
        inventory=make_cebuano_all_category_inventory(),
        config=make_config(
            target_language="ceb",
            category=None,
            voice_profile_key="static_thematic_ceb_yumi_raw_v1",
            profile_name="Bisaya",
            provider_voice_id="voice-yumi",
            voice_name=None,
            qa_status="ready",
        ),
    )

    assert report["category"] == "all"
    assert report["totals"]["items"] == 2
    assert report["totals"]["would_generate"] == 2


def test_candidate_qa_status_is_not_supported():
    sb = FakeSupabase()
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb._tables["language_profiles"] = [
        {"id": "profile-bisaya", "language": "Bisaya", "name": "Bisaya", "is_active": True}
    ]

    with pytest.raises(RuntimeError, match="--qa-status"):
        run_inventory(
            sb=sb,
            inventory=make_cebuano_inventory(),
            config=make_config(
                target_language="ceb",
                voice_profile_key="static_thematic_ceb_animals_yumi_raw_v1",
                profile_name="Bisaya",
                provider_voice_id="voice-yumi",
                voice_name=None,
                qa_status="candidate",
            ),
        )


def test_language_level_assignment_uses_null_category_slug():
    sb = FakeSupabase()
    settings_hash = voice_settings_hash(DEFAULT_VOICE_SETTINGS)
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb.table("static_tts_voice_assignments")
    sb._tables["language_profiles"] = [
        {"id": "profile-bisaya", "language": "Bisaya", "name": "Bisaya1", "is_active": True}
    ]
    sb._tables["guided_voice_profiles"] = [
        {
            "id": "profile-1",
            "voice_profile_key": "static_thematic_ceb_yumi_raw_v1",
            "provider": "elevenlabs",
            "target_language_code": "ceb",
            "provider_voice_id": "voice-yumi",
            "provider_model_id": "eleven_flash_v2_5",
            "output_format": "mp3_44100_128",
            "voice_settings": dict(DEFAULT_VOICE_SETTINGS),
            "voice_settings_hash": settings_hash,
            "assignment_version": 1,
            "active": True,
            "priority": 100,
        }
    ]

    report = run_inventory(
        sb=sb,
        inventory=[],
        config=make_config(
            target_language="ceb",
            category=None,
            voice_profile_key="static_thematic_ceb_yumi_raw_v1",
            profile_name="Bisaya",
            voice_name="Yumi",
            commit_db=True,
            allow_provider_calls=False,
            activate_assignment=True,
        ),
    )

    assert report["totals"]["items"] == 0
    assert sb._tables["static_tts_voice_assignments"][0]["category_slug"] is None
    assert sb._tables["static_tts_voice_assignments"][0]["voice_profile_key"] == "static_thematic_ceb_yumi_raw_v1"


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


def test_provider_call_cap_defers_remaining_items_without_failures(monkeypatch):
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    sb.table("voices")
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("static_tts_asset_usages")
    sb.table("static_tts_voice_assignments")
    sb._tables["voices"] = [{"voice_id": "voice-elisa", "name": "Elisa", "language_code": "en"}]

    calls = 0

    async def provider(**_kwargs):
        nonlocal calls
        calls += 1
        return b"raw-audio" * 128

    monkeypatch.setattr("scripts.generate_static_thematic_tts._probe_duration_ms", lambda _path: 740)

    second_item = {
        **make_inventory()[0],
        "order": 2,
        "concept_id": "animals.cat",
        "target_term": "cat",
        "spoken_text": "cat",
        "english_qa_label": "cat",
    }
    report = run_inventory(
        sb=sb,
        inventory=[make_inventory()[0], second_item],
        config=make_config(
            voice_profile_key="static_thematic_en_animals_elisa_raw_v1",
            voice_name="Elisa",
            commit_db=True,
            allow_provider_calls=True,
            max_provider_calls=1,
        ),
        provider_synthesize=provider,
    )

    assert calls == 1
    assert report["totals"]["provider_calls"] == 1
    assert report["totals"]["generated"] == 1
    assert report["totals"]["deferred_provider_cap"] == 1
    assert report["totals"]["failed"] == 0
    assert report["items"][1]["status"] == "deferred_provider_cap"


def test_cebuano_ready_commit_uses_bisaya_profile_and_yumi_voice(monkeypatch):
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    sb.table("voices")
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("static_tts_asset_usages")
    sb.table("static_tts_voice_assignments")
    sb._tables["language_profiles"] = [
        {"id": "profile-bisaya", "language": "Bisaya", "name": "Bisaya", "is_active": True}
    ]
    sb._tables["voices"] = [
        {
            "id": "voice-row-1",
            "voice_id": "voice-mayumi",
            "name": "Mayumi",
            "language": "Cebuano",
            "language_code": "fil",
        }
    ]

    raw_audio = b"raw-audio" * 128

    async def provider(**kwargs):
        assert kwargs["text"] == "iro"
        assert kwargs["voice_id"] == "voice-mayumi"
        assert kwargs["language_code"] == "fil"
        return raw_audio

    monkeypatch.setattr("scripts.generate_static_thematic_tts._probe_duration_ms", lambda _path: 740)

    report = run_inventory(
        sb=sb,
        inventory=make_cebuano_inventory(),
        config=make_config(
            target_language="ceb",
            voice_profile_key="static_thematic_ceb_animals_yumi_raw_v1",
            profile_name="Bisaya",
            voice_name="Yumi",
            commit_db=True,
            allow_provider_calls=True,
            postprocess_mode="raw",
            qa_status="ready",
            activate_assignment=False,
        ),
        provider_synthesize=provider,
    )

    assert report["totals"]["generated"] == 1
    assert report["voice_profile"]["resolved_profile_name"] == "Bisaya"
    assert report["voice_profile"]["resolved_voice_name"] == "Mayumi"
    assert report["voice_profile"]["resolved_voice_language_code"] == "fil"
    assert report["voice_profile"]["provider_voice_id_last4"] == "yumi"
    assert sb.storage.uploads[0]["path"] == (
        "static/v1/ceb/static_thematic_ceb_animals_yumi_raw_v1/animals/level-1/animals.dog.mp3"
    )
    assert sb.storage.uploads[0]["data"] == raw_audio
    assert sb._tables["static_tts_asset_usages"][0]["qa_status"] == "ready"
    assert sb._tables["static_tts_voice_assignments"] == []
    assert report["items"][0]["english_qa_label"] == "dog"
    assert report["items"][0]["spoken_text"] == "iro"
    assert report["items"][0]["postprocess_mode"] == "raw"
    assert report["items"][0]["raw_duration_ms"] == 740
    assert report["items"][0]["final_duration_ms"] == 740


def test_indonesian_ready_commit_uses_indo_profile_and_gavrila_voice(monkeypatch):
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    sb.table("voices")
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("static_tts_asset_usages")
    sb.table("static_tts_voice_assignments")
    sb._tables["language_profiles"] = [
        {"id": "profile-indo", "language": "Indonesian", "name": "Indo1", "is_active": True}
    ]
    sb._tables["voices"] = [
        {
            "id": "voice-row-id",
            "voice_id": "voice-gavrila",
            "name": "Gavrila",
            "language": "Indonesian",
            "language_code": "id",
        }
    ]

    raw_audio = b"raw-audio" * 128

    async def provider(**kwargs):
        assert kwargs["text"] == "anjing"
        assert kwargs["voice_id"] == "voice-gavrila"
        assert kwargs["language_code"] == "id"
        return raw_audio

    monkeypatch.setattr("scripts.generate_static_thematic_tts._probe_duration_ms", lambda _path: 680)

    report = run_inventory(
        sb=sb,
        inventory=make_indonesian_inventory(),
        config=make_config(
            target_language="id",
            voice_profile_key="static_thematic_id_animals_gavrila_raw_v1",
            profile_name="Indo1",
            voice_name="Gavrila",
            commit_db=True,
            allow_provider_calls=True,
            postprocess_mode="raw",
            qa_status="ready",
            activate_assignment=False,
        ),
        provider_synthesize=provider,
    )

    assert report["totals"]["generated"] == 1
    assert report["voice_profile"]["resolved_profile_name"] == "Indo1"
    assert report["voice_profile"]["resolved_voice_name"] == "Gavrila"
    assert report["voice_profile"]["resolved_voice_language_code"] == "id"
    assert sb.storage.uploads[0]["path"] == (
        "static/v1/id/static_thematic_id_animals_gavrila_raw_v1/animals/level-1/animals.dog.mp3"
    )
    assert sb.storage.uploads[0]["data"] == raw_audio
    assert sb._tables["static_tts_asset_usages"][0]["qa_status"] == "ready"
    assert sb._tables["static_tts_voice_assignments"] == []
    assert report["items"][0]["spoken_text"] == "anjing"
    assert report["items"][0]["postprocess_mode"] == "raw"
    assert report["items"][0]["raw_duration_ms"] == 680
    assert report["items"][0]["final_duration_ms"] == 680


def test_german_ready_commit_uses_german_profile_and_laura_voice(monkeypatch):
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    sb.table("voices")
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("static_tts_asset_usages")
    sb.table("static_tts_voice_assignments")
    sb._tables["language_profiles"] = [
        {"id": "profile-de", "language": "German", "name": "German_AB1", "is_active": True}
    ]
    sb._tables["voices"] = [
        {
            "id": "voice-row-de",
            "voice_id": "voice-laura",
            "name": "Laura",
            "language": "German",
            "language_code": "de",
        }
    ]

    raw_audio = b"raw-audio" * 128

    async def provider(**kwargs):
        assert kwargs["text"] == "Hund"
        assert kwargs["voice_id"] == "voice-laura"
        assert kwargs["language_code"] == "de"
        return raw_audio

    monkeypatch.setattr("scripts.generate_static_thematic_tts._probe_duration_ms", lambda _path: 720)

    report = run_inventory(
        sb=sb,
        inventory=make_german_inventory(),
        config=make_config(
            target_language="de",
            voice_profile_key="static_thematic_de_laura_raw_v1",
            profile_name="German_AB1",
            voice_name="Laura",
            commit_db=True,
            allow_provider_calls=True,
            postprocess_mode="raw",
            qa_status="ready",
            activate_assignment=False,
        ),
        provider_synthesize=provider,
    )

    assert report["totals"]["generated"] == 1
    assert report["voice_profile"]["resolved_profile_name"] == "German_AB1"
    assert report["voice_profile"]["resolved_voice_name"] == "Laura"
    assert report["voice_profile"]["resolved_voice_language_code"] == "de"
    assert sb.storage.uploads[0]["path"] == (
        "static/v1/de/static_thematic_de_laura_raw_v1/animals/level-1/animals.dog.mp3"
    )
    assert sb.storage.uploads[0]["data"] == raw_audio
    assert sb._tables["static_tts_asset_usages"][0]["qa_status"] == "ready"
    assert sb._tables["static_tts_voice_assignments"] == []
    assert report["items"][0]["spoken_text"] == "Hund"
    assert report["items"][0]["postprocess_mode"] == "raw"
    assert report["items"][0]["raw_duration_ms"] == 720
    assert report["items"][0]["final_duration_ms"] == 720


def test_spanish_ready_commit_uses_spanish_profile_and_lia_voice(monkeypatch):
    sb = FakeSupabase()
    sb.storage = RecordingStorage()
    sb.table("voices")
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("static_tts_asset_usages")
    sb.table("static_tts_voice_assignments")
    sb._tables["language_profiles"] = [
        {"id": "profile-es", "language": "Spanish", "name": "Spanish1", "is_active": True}
    ]
    sb._tables["voices"] = [
        {
            "id": "voice-row-es",
            "voice_id": "voice-lia",
            "name": "Lia",
            "language": "Spanish",
            "language_code": "es",
        }
    ]

    raw_audio = b"raw-audio" * 128

    async def provider(**kwargs):
        assert kwargs["text"] == "perro"
        assert kwargs["voice_id"] == "voice-lia"
        assert kwargs["language_code"] == "es"
        return raw_audio

    monkeypatch.setattr("scripts.generate_static_thematic_tts._probe_duration_ms", lambda _path: 710)

    report = run_inventory(
        sb=sb,
        inventory=make_spanish_inventory(),
        config=make_config(
            target_language="es",
            voice_profile_key="static_thematic_es_lia_raw_v1",
            profile_name="Spanish1",
            voice_name="Lia",
            commit_db=True,
            allow_provider_calls=True,
            postprocess_mode="raw",
            qa_status="ready",
            activate_assignment=False,
        ),
        provider_synthesize=provider,
    )

    assert report["totals"]["generated"] == 1
    assert report["voice_profile"]["resolved_profile_name"] == "Spanish1"
    assert report["voice_profile"]["resolved_voice_name"] == "Lia"
    assert report["voice_profile"]["resolved_voice_language_code"] == "es"
    assert sb.storage.uploads[0]["path"] == (
        "static/v1/es/static_thematic_es_lia_raw_v1/animals/level-1/animals.dog.mp3"
    )
    assert sb.storage.uploads[0]["data"] == raw_audio
    assert sb._tables["static_tts_asset_usages"][0]["qa_status"] == "ready"
    assert sb._tables["static_tts_voice_assignments"] == []
    assert report["items"][0]["spoken_text"] == "perro"
    assert report["items"][0]["postprocess_mode"] == "raw"
    assert report["items"][0]["raw_duration_ms"] == 710
    assert report["items"][0]["final_duration_ms"] == 710


def test_cebuano_inventory_rejects_english_spoken_text():
    sb = FakeSupabase()
    sb.table("language_profiles")
    sb.table("guided_voice_profiles")
    sb._tables["language_profiles"] = [
        {"id": "profile-bisaya", "language": "Bisaya", "name": "Bisaya", "is_active": True}
    ]

    bad_inventory = [{**make_cebuano_inventory()[0], "target_term": "dog", "spoken_text": "dog"}]

    with pytest.raises(RuntimeError, match="English spoken_text"):
        run_inventory(
            sb=sb,
            inventory=bad_inventory,
            config=make_config(
                target_language="ceb",
                voice_profile_key="static_thematic_ceb_animals_yumi_raw_v1",
                profile_name="Bisaya",
                provider_voice_id="voice-yumi",
                voice_name=None,
                qa_status="ready",
            ),
        )


def test_voice_profile_resolution_fails_without_name_or_provider_id():
    sb = FakeSupabase()
    sb.table("guided_voice_profiles")

    with pytest.raises(RuntimeError, match="voice-name"):
        resolve_or_upsert_voice_profile(sb, make_config(voice_name=None, provider_voice_id=None))
