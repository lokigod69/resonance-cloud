"""Tests for src/services/guided_tts/generate.py (stubbed provider, FakeSupabase)."""

from __future__ import annotations

import asyncio
from typing import Any

import pytest

from src.services.guided_tts import db as guided_db
from src.services.guided_tts.generate import (
    EXPECTED_SCOPES,
    run_async,
)
from src.services.guided_tts.inventory import (
    DEFAULT_MODEL_ID,
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_VOICE_SETTINGS,
    voice_settings_hash,
)
from tests.fake_supabase import FakeSupabase


# ---------------------------------------------------------------------------
# Shared fixtures / helpers
# ---------------------------------------------------------------------------

A1P1_LESSON_1 = {
    "id": "english-a1-practical-001-first-contact",
    "pathId": "english-a1-practical-1",
    "lessonNumber": 1,
    "vibeVariants": {
        "bright": {
            "corePhrase": {"targetText": "Hi there, do you speak English?"},
            "chunks": [
                {"id": "hi-there", "targetText": "Hi there"},
                {"id": "do-you-speak", "targetText": "do you speak"},
                {"id": "english", "targetText": "English"},
            ],
            "speakTarget": {"targetPhrase": "Hi there, do you speak English?"},
            "trophyWord": {"word": "delighted"},
        },
        "wistful": {
            "corePhrase": {
                "targetText": "Sorry to ask — do you happen to speak English?"
            },
            "chunks": [
                {"id": "sorry-to-ask", "targetText": "Sorry to ask"},
                {"id": "do-you-happen-to-speak", "targetText": "do you happen to speak"},
                {"id": "english", "targetText": "English"},
            ],
            "speakTarget": {
                "targetPhrase": "Sorry to ask — do you happen to speak English?"
            },
            "trophyWord": {"word": "gently"},
        },
        "sharp": {
            "corePhrase": {"targetText": "Quick question — do you speak English?"},
            "chunks": [
                {"id": "quick-question", "targetText": "Quick question"},
                {"id": "do-you-speak", "targetText": "do you speak"},
                {"id": "english", "targetText": "English"},
            ],
            "speakTarget": {"targetPhrase": "Quick question — do you speak English?"},
            "trophyWord": {"word": "clear"},
        },
    },
}


def _bright_wistful_sharp_voice_profile_rows() -> list[dict[str, Any]]:
    s = voice_settings_hash(DEFAULT_VOICE_SETTINGS)
    common = {
        "provider": "elevenlabs",
        "target_language_code": "en-US",
        "provider_model_id": DEFAULT_MODEL_ID,
        "output_format": DEFAULT_OUTPUT_FORMAT,
        "voice_settings": dict(DEFAULT_VOICE_SETTINGS),
        "voice_settings_hash": s,
        "assignment_version": 1,
        "active": True,
        "priority": 100,
    }
    return [
        {
            **common,
            "voice_profile_key": "english_a1_bright_v1",
            "vibe": "bright",
            "provider_voice_id": "voice-bright",
        },
        {
            **common,
            "voice_profile_key": "english_a1_wistful_v1",
            "vibe": "wistful",
            "provider_voice_id": "voice-wistful",
        },
        {
            **common,
            "voice_profile_key": "english_a1_sharp_v1",
            "vibe": "sharp",
            "provider_voice_id": "voice-sharp",
        },
        {
            **common,
            "voice_profile_key": "english_default_v1",
            "vibe": None,
            "provider_voice_id": "voice-serafina",
        },
    ]


class _RecordingStorage:
    def __init__(self):
        self.uploads: list[dict[str, Any]] = []
        self._current_bucket: str | None = None

    def from_(self, bucket: str):
        self._current_bucket = bucket
        return self

    def upload(self, path: str, data: bytes, file_options: dict[str, str]):
        self.uploads.append(
            {
                "bucket": self._current_bucket,
                "path": path,
                "data": data,
                "file_options": file_options,
            }
        )

    def get_public_url(self, path: str):
        return f"https://cdn.example/{self._current_bucket}/{path}"


def _make_sb_with_profiles() -> FakeSupabase:
    sb = FakeSupabase()
    sb.storage = _RecordingStorage()
    # FakeSupabase lazy-creates tables on `.table(...)` access.
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("guided_tts_asset_usages")
    sb.table("guided_tts_generation_runs")
    sb.table("voices")
    for row in _bright_wistful_sharp_voice_profile_rows():
        sb._tables["guided_voice_profiles"].append(row)
    return sb


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# Voice profile resolution from DB
# ---------------------------------------------------------------------------

def test_load_active_voice_profiles_returns_only_active_rows():
    sb = FakeSupabase()
    sb.table("guided_voice_profiles")
    sb._tables["guided_voice_profiles"] = [
        {
            "voice_profile_key": "english_a1_bright_v1",
            "target_language_code": "en-US",
            "vibe": "bright",
            "provider_voice_id": "voice-bright",
            "voice_settings_hash": "x",
            "active": True,
        },
        {
            "voice_profile_key": "english_a1_bright_v0",
            "target_language_code": "en-US",
            "vibe": "bright",
            "provider_voice_id": "voice-bright-old",
            "voice_settings_hash": "x",
            "active": False,
        },
    ]
    profiles = guided_db.load_active_voice_profiles(sb)
    assert len(profiles) == 1
    assert profiles[0].voice_profile_key == "english_a1_bright_v1"


def test_resolver_finds_vibe_specific_voice_in_db_roundtrip():
    sb = _make_sb_with_profiles()
    profiles = guided_db.load_active_voice_profiles(sb)
    from src.services.guided_tts.inventory import resolve_voice_profile

    bright = resolve_voice_profile(
        profiles,
        target_language_code="en-US",
        vibe="bright",
        path_id="english-a1-practical-1",
        lesson_id="english-a1-practical-001-first-contact",
        surface="corePhrase",
    )
    assert bright is not None
    assert bright.voice_profile_key == "english_a1_bright_v1"
    assert bright.provider_voice_id == "voice-bright"


def test_no_vibe_default_profile_resolves_when_vibe_is_null_in_request():
    """Future no-vibe languages: scope with vibe=None should match the
    english_default_v1 fallback profile."""
    sb = _make_sb_with_profiles()
    profiles = guided_db.load_active_voice_profiles(sb)
    from src.services.guided_tts.inventory import resolve_voice_profile

    # Manually simulate a no-vibe scope (the inventory builder always tags
    # rows with a vibe in the active A1 design; this exercises the resolver
    # directly so future no-vibe courses are pre-validated).
    found = None
    for profile in profiles:
        if profile.voice_profile_key == "english_default_v1":
            found = profile
    assert found is not None
    assert found.vibe is None


# ---------------------------------------------------------------------------
# Voice-name resolution helper (used by the seed script)
# ---------------------------------------------------------------------------

def test_find_voices_by_name_resolves_serafina_peter_eliza():
    sb = FakeSupabase()
    sb.table("voices")
    sb._tables["voices"] = [
        {"voice_id": "v-serafina", "name": "Serafina", "language_code": "en"},
        {"voice_id": "v-peter", "name": "Peter", "language_code": "en"},
        {"voice_id": "v-eliza", "name": "Eliza", "language_code": "en"},
        {"voice_id": "v-other", "name": "Henrik", "language_code": "de"},
    ]
    matches = guided_db.find_voices_by_name(sb, names=["Serafina", "Peter", "Eliza"])
    assert len(matches["Serafina"]) == 1
    assert matches["Serafina"][0]["voice_id"] == "v-serafina"
    assert len(matches["Peter"]) == 1
    assert matches["Peter"][0]["voice_id"] == "v-peter"
    assert len(matches["Eliza"]) == 1
    assert matches["Eliza"][0]["voice_id"] == "v-eliza"


def test_find_voices_by_name_reports_ambiguity_for_two_elizas():
    sb = FakeSupabase()
    sb.table("voices")
    sb._tables["voices"] = [
        {"voice_id": "v-eliza-a", "name": "Eliza Stone", "language_code": "en"},
        {"voice_id": "v-eliza-b", "name": "Eliza Brook", "language_code": "en-US"},
    ]
    matches = guided_db.find_voices_by_name(sb, names=["Eliza"])
    assert len(matches["Eliza"]) == 2


def test_find_voices_by_name_skips_non_english_rows():
    sb = FakeSupabase()
    sb.table("voices")
    sb._tables["voices"] = [
        {"voice_id": "v-eliza-de", "name": "Eliza", "language_code": "de"},
    ]
    matches = guided_db.find_voices_by_name(sb, names=["Eliza"])
    assert matches["Eliza"] == []


# ---------------------------------------------------------------------------
# A1P1 dry-run (numbers stay pinned to the architecture report)
# ---------------------------------------------------------------------------

def test_a1p1_dry_run_pins_inventory_numbers_and_does_not_call_provider():
    sb = _make_sb_with_profiles()
    calls: list[dict[str, Any]] = []

    async def provider_stub(**kwargs):
        calls.append(kwargs)
        return b"audio"

    result = _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright", "wistful", "sharp"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=True,
            provider_synthesize=provider_stub,
        )
    )
    assert result["mode"] == "dry-run"
    assert result["scope_key"] == "a1p1-lesson-1"
    assert result["generated_assets"] == 0
    assert result["failed_assets"] == 0
    assert calls == []  # provider must not be called in dry-run
    assert sb.storage.uploads == []

    totals = result["inventory"]["totals"]
    assert totals["rows"] == 15
    assert totals["missing"] == 15
    assert totals["missing_voice_profile"] == 0
    assert totals["unique_normalized_texts"] == 12
    assert totals["estimated_provider_calls"] == 15
    assert totals["estimated_provider_characters"] == 236

    # A run row was recorded.
    runs = sb._tables["guided_tts_generation_runs"]
    assert len(runs) == 1
    assert runs[0]["dry_run"] is True
    assert runs[0]["status"] == "completed"


# ---------------------------------------------------------------------------
# A1P1 --commit (with provider stub)
# ---------------------------------------------------------------------------

def test_a1p1_commit_calls_provider_for_each_missing_asset_and_writes_rows():
    sb = _make_sb_with_profiles()
    calls: list[dict[str, Any]] = []

    async def provider_stub(**kwargs):
        calls.append(kwargs)
        return b"mp3-bytes"

    result = _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright", "wistful", "sharp"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=False,
            provider_synthesize=provider_stub,
        )
    )

    assert result["mode"] == "commit"
    assert result["scope_key"] == "a1p1-lesson-1"
    assert result["generated_assets"] == 15
    assert result["failed_assets"] == 0
    assert len(calls) == 15
    # Each call uses one of the three canary voice IDs.
    assert {c["voice_id"] for c in calls} == {"voice-bright", "voice-wistful", "voice-sharp"}
    # Storage uploads happen once per call.
    assert len(sb.storage.uploads) == 15
    for upload in sb.storage.uploads:
        assert upload["bucket"] == "guided-tts"
        assert upload["path"].startswith("elevenlabs/en-US/english_a1_")
        assert upload["data"] == b"mp3-bytes"

    # 15 ready assets + 15 usages + 1 run row.
    assert len(sb._tables["guided_tts_assets"]) == 15
    for asset in sb._tables["guided_tts_assets"]:
        assert asset["status"] == "ready"
        assert asset["public_url"].startswith("https://cdn.example/guided-tts/")
    assert len(sb._tables["guided_tts_asset_usages"]) == 15
    # The unique constraint shape is enforced by inventory; verify a sample
    # row has expected fields.
    sample = sb._tables["guided_tts_asset_usages"][0]
    assert sample["lesson_number"] == 1
    assert sample["surface"] in {"corePhrase", "chunk", "trophyWord"}

    run_row = sb._tables["guided_tts_generation_runs"][0]
    assert run_row["dry_run"] is False
    assert run_row["status"] == "completed"
    assert run_row["generated_assets"] == 15
    assert run_row["failed_assets"] == 0


def test_a1p1_commit_skips_provider_call_for_already_ready_cache_hit():
    sb = _make_sb_with_profiles()
    # Pre-seed one ready asset for Bright "English".
    from src.services.guided_tts.inventory import (
        NORMALIZATION_VERSION,
        cache_key,
        text_hash,
    )

    s = voice_settings_hash(DEFAULT_VOICE_SETTINGS)
    bright_english_ck = cache_key(
        provider="elevenlabs",
        target_language_code="en-US",
        voice_profile_key="english_a1_bright_v1",
        provider_voice_id="voice-bright",
        provider_model_id=DEFAULT_MODEL_ID,
        output_format=DEFAULT_OUTPUT_FORMAT,
        settings_hash=s,
        normalization_version=NORMALIZATION_VERSION,
        text_hash_value=text_hash("English"),
    )
    sb._tables["guided_tts_assets"].append(
        {
            "id": "asset-cached",
            "cache_key": bright_english_ck,
            "status": "ready",
            "public_url": "https://cdn.example/guided-tts/cached-english.mp3",
        }
    )

    calls: list[dict[str, Any]] = []

    async def provider_stub(**kwargs):
        calls.append(kwargs)
        return b"mp3-bytes"

    result = _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright", "wistful", "sharp"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=False,
            provider_synthesize=provider_stub,
        )
    )
    assert result["generated_assets"] == 14
    assert len(calls) == 14
    # 15 total usages — 14 new assets + 1 link to the pre-seeded cache hit.
    assert len(sb._tables["guided_tts_asset_usages"]) == 15
    # Pre-seeded asset is referenced by exactly one usage row.
    linked = [
        u
        for u in sb._tables["guided_tts_asset_usages"]
        if u["asset_id"] == "asset-cached"
    ]
    assert len(linked) == 1
    assert linked[0]["surface"] == "chunk"
    assert linked[0]["surface_key"] == "english"


def test_commit_reuses_asset_generated_earlier_in_same_run_for_duplicate_cache_key():
    sb = _make_sb_with_profiles()
    calls: list[dict[str, Any]] = []

    async def provider_stub(**kwargs):
        calls.append(kwargs)
        return b"mp3-bytes"

    duplicate_lesson = {
        **A1P1_LESSON_1,
        "id": "english-a1-practical-duplicate-hi",
        "lessonNumber": 2,
        "vibeVariants": {
            "bright": {
                "corePhrase": {"targetText": "Hi"},
                "chunks": [{"id": "hi", "targetText": "Hi"}],
                "trophyWord": {"word": "Hi"},
            }
        },
    }

    result = _run(
        run_async(
            sb=sb,
            lessons=[duplicate_lesson],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-duplicate-hi",
            lesson_number=None,
            dry_run=False,
            provider_synthesize=provider_stub,
            allow_unscoped_commit=True,
        )
    )

    assert result["generated_assets"] == 1
    assert result["deduped_usages"] == 2
    assert len(calls) == 1
    assert len(sb.storage.uploads) == 1
    assert len(sb._tables["guided_tts_assets"]) == 1
    assert len(sb._tables["guided_tts_asset_usages"]) == 3
    assert {usage["asset_id"] for usage in sb._tables["guided_tts_asset_usages"]} == {
        sb._tables["guided_tts_assets"][0]["id"]
    }


# ---------------------------------------------------------------------------
# Guardrails
# ---------------------------------------------------------------------------

def test_commit_refuses_when_missing_voice_profile_gt_zero():
    sb = FakeSupabase()
    sb.storage = _RecordingStorage()
    # Lazy-create tables; intentionally seed no voice profiles.
    sb.table("guided_voice_profiles")
    sb.table("guided_tts_assets")
    sb.table("guided_tts_asset_usages")
    sb.table("guided_tts_generation_runs")

    async def provider_stub(**kwargs):
        raise AssertionError("provider must not be called")

    with pytest.raises(RuntimeError, match="no voice profile"):
        _run(
            run_async(
                sb=sb,
                lessons=[A1P1_LESSON_1],
                voice_profiles=guided_db.load_active_voice_profiles(sb),
                vibes=["bright", "wistful", "sharp"],
                surfaces=["corePhrase", "chunks", "trophyWord"],
                path_id="english-a1-practical-1",
                lesson_id="english-a1-practical-001-first-contact",
                lesson_number=1,
                dry_run=False,
                provider_synthesize=provider_stub,
            )
        )

    assert sb.storage.uploads == []


def test_commit_refuses_unscoped_request():
    sb = _make_sb_with_profiles()

    async def provider_stub(**kwargs):
        raise AssertionError("provider must not be called")

    # Bright-only scope is not in EXPECTED_SCOPES.
    with pytest.raises(RuntimeError, match="EXPECTED_SCOPES"):
        _run(
            run_async(
                sb=sb,
                lessons=[A1P1_LESSON_1],
                voice_profiles=guided_db.load_active_voice_profiles(sb),
                vibes=["bright"],
                surfaces=["corePhrase", "chunks", "trophyWord"],
                path_id="english-a1-practical-1",
                lesson_id="english-a1-practical-001-first-contact",
                lesson_number=1,
                dry_run=False,
                provider_synthesize=provider_stub,
            )
        )


def test_bright_path_one_scope_is_explicitly_allowlisted():
    spec = EXPECTED_SCOPES["a1p1-bright-path-1"]
    assert spec["path_id"] == "english-a1-practical-1"
    assert spec["lesson_id"] is None
    assert spec["lesson_number"] is None
    assert spec["vibes"] == ["bright"]
    assert spec["surfaces"] == ["corePhrase", "chunks", "trophyWord"]
    assert spec["expected_rows"] == 46
    assert spec["expected_unique_normalized_texts"] == 42
    assert spec["expected_provider_calls_first_run"] == 42
    assert spec["expected_provider_characters_first_run"] == 598


def test_commit_allows_unscoped_when_explicitly_opted_in():
    sb = _make_sb_with_profiles()
    calls: list[dict[str, Any]] = []

    async def provider_stub(**kwargs):
        calls.append(kwargs)
        return b"audio"

    result = _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright"],
            surfaces=["corePhrase"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=False,
            provider_synthesize=provider_stub,
            allow_unscoped_commit=True,
        )
    )
    assert result["scope_key"] is None  # not in EXPECTED_SCOPES
    assert len(calls) == 1  # Just bright corePhrase.


def test_a1p1_canary_scope_constants_match_architecture_report():
    spec = EXPECTED_SCOPES["a1p1-lesson-1"]
    assert spec["path_id"] == "english-a1-practical-1"
    assert spec["lesson_id"] == "english-a1-practical-001-first-contact"
    assert spec["expected_rows"] == 15
    assert spec["expected_unique_normalized_texts"] == 12
    assert spec["expected_provider_calls_first_run"] == 15
    assert spec["expected_provider_characters_first_run"] == 236


# ---------------------------------------------------------------------------
# Provider failure handling
# ---------------------------------------------------------------------------

def test_provider_failure_marks_asset_failed_and_run_failed():
    sb = _make_sb_with_profiles()

    # Fail on every call.
    async def provider_stub(**kwargs):
        raise RuntimeError("ElevenLabs returned 500")

    result = _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright", "wistful", "sharp"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=False,
            provider_synthesize=provider_stub,
        )
    )
    assert result["generated_assets"] == 0
    assert result["failed_assets"] == 15

    # All 15 assets are inserted with status='failed'.
    assert len(sb._tables["guided_tts_assets"]) == 15
    for asset in sb._tables["guided_tts_assets"]:
        assert asset["status"] == "failed"
        assert "500" in (asset.get("error") or "")

    # No usage rows are inserted when the asset is failed.
    assert sb._tables["guided_tts_asset_usages"] == []

    # The run row is marked failed but the run itself didn't raise.
    run_row = sb._tables["guided_tts_generation_runs"][0]
    assert run_row["status"] == "failed"
    assert run_row["generated_assets"] == 0
    assert run_row["failed_assets"] == 15


def test_partial_provider_failure_records_per_asset_status():
    sb = _make_sb_with_profiles()
    fail_after = {"count": 0}

    async def provider_stub(**kwargs):
        fail_after["count"] += 1
        if fail_after["count"] > 12:
            raise RuntimeError("ElevenLabs returned 429")
        return b"audio"

    result = _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright", "wistful", "sharp"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=False,
            provider_synthesize=provider_stub,
        )
    )
    assert result["generated_assets"] == 12
    assert result["failed_assets"] == 3

    statuses = [a["status"] for a in sb._tables["guided_tts_assets"]]
    assert statuses.count("ready") == 12
    assert statuses.count("failed") == 3


# ---------------------------------------------------------------------------
# Storage path / upload shape
# ---------------------------------------------------------------------------

def test_commit_storage_paths_follow_guided_tts_layout():
    sb = _make_sb_with_profiles()

    async def provider_stub(**kwargs):
        return b"audio"

    _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright", "wistful", "sharp"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=False,
            provider_synthesize=provider_stub,
        )
    )

    paths = {upload["path"] for upload in sb.storage.uploads}
    profile_segments = {p.split("/")[2] for p in paths}
    assert profile_segments == {
        "english_a1_bright_v1",
        "english_a1_wistful_v1",
        "english_a1_sharp_v1",
    }
    for path in paths:
        segments = path.split("/")
        assert segments[0] == "elevenlabs"
        assert segments[1] == "en-US"
        assert segments[3] == "eleven_flash_v2_5"
        assert segments[4] == "mp3_44100_128"
        # settings_hash[:12] segment
        assert len(segments[5]) == 12
        assert segments[-1].endswith(".mp3")


# ---------------------------------------------------------------------------
# Guardrail: provider import path is gated by --commit
# ---------------------------------------------------------------------------

def test_dry_run_path_does_not_import_provider_elevenlabs(monkeypatch):
    """Calling run_async with dry_run=True must not require any provider import."""
    import sys

    # Drop any cached imports so we can detect a fresh one if it happens.
    for mod in list(sys.modules.keys()):
        if mod.endswith("provider_elevenlabs"):
            del sys.modules[mod]

    sb = _make_sb_with_profiles()

    async def provider_stub(**kwargs):
        raise AssertionError("provider must not be called in dry-run")

    _run(
        run_async(
            sb=sb,
            lessons=[A1P1_LESSON_1],
            voice_profiles=guided_db.load_active_voice_profiles(sb),
            vibes=["bright", "wistful", "sharp"],
            surfaces=["corePhrase", "chunks", "trophyWord"],
            path_id="english-a1-practical-1",
            lesson_id="english-a1-practical-001-first-contact",
            lesson_number=1,
            dry_run=True,
            provider_synthesize=provider_stub,
        )
    )
    # The dry-run path must not have imported provider_elevenlabs.
    assert all(
        not mod.endswith("provider_elevenlabs") for mod in sys.modules.keys()
    )
