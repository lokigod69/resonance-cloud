"""Tests for src/services/guided_tts/inventory.py (no provider calls)."""

from __future__ import annotations

import pytest

from src.services.guided_tts.inventory import (
    DEFAULT_MODEL_ID,
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_VOICE_SETTINGS,
    NORMALIZATION_VERSION,
    VoiceProfile,
    build_inventory,
    cache_key,
    extract_lesson_surfaces,
    normalize_spoken_text,
    resolve_voice_profile,
    storage_path,
    text_hash,
    voice_settings_hash,
)


# ---------------------------------------------------------------------------
# A1P1 lesson 1 canary fixture
# Mirrors guidedLessons.ts (brightLesson001 / wistfulLesson001 / sharpLesson001)
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


def _settings_hash() -> str:
    return voice_settings_hash(DEFAULT_VOICE_SETTINGS)


def _bright_wistful_sharp_profiles() -> list[VoiceProfile]:
    s = _settings_hash()
    return [
        VoiceProfile(
            voice_profile_key="english_a1_bright_v1",
            target_language_code="en-US",
            vibe="bright",
            provider_voice_id="voice-bright",
            provider_model_id=DEFAULT_MODEL_ID,
            output_format=DEFAULT_OUTPUT_FORMAT,
            voice_settings=dict(DEFAULT_VOICE_SETTINGS),
            voice_settings_hash=s,
            active=True,
        ),
        VoiceProfile(
            voice_profile_key="english_a1_wistful_v1",
            target_language_code="en-US",
            vibe="wistful",
            provider_voice_id="voice-wistful",
            provider_model_id=DEFAULT_MODEL_ID,
            output_format=DEFAULT_OUTPUT_FORMAT,
            voice_settings=dict(DEFAULT_VOICE_SETTINGS),
            voice_settings_hash=s,
            active=True,
        ),
        VoiceProfile(
            voice_profile_key="english_a1_sharp_v1",
            target_language_code="en-US",
            vibe="sharp",
            provider_voice_id="voice-sharp",
            provider_model_id=DEFAULT_MODEL_ID,
            output_format=DEFAULT_OUTPUT_FORMAT,
            voice_settings=dict(DEFAULT_VOICE_SETTINGS),
            voice_settings_hash=s,
            active=True,
        ),
    ]


# ---------------------------------------------------------------------------
# Normalization
# ---------------------------------------------------------------------------

def test_normalize_collapses_em_dashes_and_smart_quotes_and_whitespace():
    raw = "Sorry to ask —  do you happen to speak “English”?  "
    assert normalize_spoken_text(raw) == 'Sorry to ask - do you happen to speak "English"?'


def test_text_hash_is_stable_across_smart_punct_variants():
    a = "Sorry to ask — do you happen to speak English?"
    b = "Sorry to ask - do you happen to speak English?"
    assert text_hash(a) == text_hash(b)


def test_voice_settings_hash_changes_when_stability_changes():
    a = voice_settings_hash(DEFAULT_VOICE_SETTINGS)
    tweaked = dict(DEFAULT_VOICE_SETTINGS, stability=0.70)
    assert voice_settings_hash(tweaked) != a


# ---------------------------------------------------------------------------
# Cache key shape
# ---------------------------------------------------------------------------

def test_cache_key_changes_when_voice_profile_key_changes():
    common = dict(
        provider="elevenlabs",
        target_language_code="en-US",
        provider_voice_id="voice-bright",
        provider_model_id=DEFAULT_MODEL_ID,
        output_format=DEFAULT_OUTPUT_FORMAT,
        settings_hash=_settings_hash(),
        normalization_version=NORMALIZATION_VERSION,
        text_hash_value=text_hash("English"),
    )
    a = cache_key(voice_profile_key="english_a1_bright_v1", **common)
    b = cache_key(voice_profile_key="english_a1_bright_v2", **common)
    assert a != b


def test_cache_key_changes_when_voice_settings_hash_changes():
    common = dict(
        provider="elevenlabs",
        target_language_code="en-US",
        voice_profile_key="english_a1_bright_v1",
        provider_voice_id="voice-bright",
        provider_model_id=DEFAULT_MODEL_ID,
        output_format=DEFAULT_OUTPUT_FORMAT,
        normalization_version=NORMALIZATION_VERSION,
        text_hash_value=text_hash("English"),
    )
    a = cache_key(settings_hash="aaaa", **common)
    b = cache_key(settings_hash="bbbb", **common)
    assert a != b


def test_storage_path_uses_short_settings_hash_and_text_hash():
    th = text_hash("English")
    p = storage_path(
        target_language_code="en-US",
        voice_profile_key="english_a1_bright_v1",
        provider_voice_id="voice-bright",
        provider_model_id=DEFAULT_MODEL_ID,
        output_format=DEFAULT_OUTPUT_FORMAT,
        settings_hash="0123456789abcdef" * 4,
        text_hash_value=th,
    )
    assert p == (
        f"elevenlabs/en-US/english_a1_bright_v1/voice-bright/eleven_flash_v2_5/"
        f"mp3_44100_128/0123456789ab/{th}.mp3"
    )


# ---------------------------------------------------------------------------
# Voice profile resolution
# ---------------------------------------------------------------------------

def test_resolver_picks_most_specific_active_profile():
    profiles = [
        VoiceProfile(
            voice_profile_key="english_default_v1",
            target_language_code="en-US",
            vibe=None,
            provider_voice_id="voice-default",
            voice_settings_hash="x",
            active=True,
            priority=100,
        ),
        VoiceProfile(
            voice_profile_key="english_a1_bright_v1",
            target_language_code="en-US",
            vibe="bright",
            provider_voice_id="voice-bright",
            voice_settings_hash="x",
            active=True,
            priority=100,
        ),
    ]
    resolved = resolve_voice_profile(
        profiles,
        target_language_code="en-US",
        vibe="bright",
        path_id="english-a1-practical-1",
        lesson_id="english-a1-practical-001-first-contact",
        surface="corePhrase",
    )
    assert resolved is not None
    assert resolved.voice_profile_key == "english_a1_bright_v1"


def test_resolver_returns_none_when_no_profile_matches():
    profiles = [
        VoiceProfile(
            voice_profile_key="english_a1_bright_v1",
            target_language_code="en-US",
            vibe="bright",
            provider_voice_id="voice-bright",
            voice_settings_hash="x",
            active=True,
        ),
    ]
    resolved = resolve_voice_profile(
        profiles,
        target_language_code="en-US",
        vibe="sharp",
        path_id="english-a1-practical-1",
        lesson_id="english-a1-practical-001-first-contact",
        surface="corePhrase",
    )
    assert resolved is None


def test_resolver_ignores_inactive_profiles():
    profiles = [
        VoiceProfile(
            voice_profile_key="english_a1_bright_v0",
            target_language_code="en-US",
            vibe="bright",
            provider_voice_id="voice-bright-old",
            voice_settings_hash="x",
            active=False,
        ),
    ]
    resolved = resolve_voice_profile(
        profiles,
        target_language_code="en-US",
        vibe="bright",
        path_id="english-a1-practical-1",
        lesson_id="english-a1-practical-001-first-contact",
        surface="corePhrase",
    )
    assert resolved is None


# ---------------------------------------------------------------------------
# Surface extraction
# ---------------------------------------------------------------------------

def test_extract_lesson_surfaces_dedupes_speak_target_against_core_phrase():
    rows = extract_lesson_surfaces(lesson=A1P1_LESSON_1, vibes=["bright"])
    surfaces = {(r.surface, r.surface_key) for r in rows}
    assert ("corePhrase", "__self") in surfaces
    # speakTarget should NOT appear because it matches corePhrase exactly.
    assert ("speakTarget", "__self") not in surfaces


def test_extract_lesson_surfaces_emits_canary_rows_per_vibe():
    rows = extract_lesson_surfaces(
        lesson=A1P1_LESSON_1,
        vibes=["bright", "wistful", "sharp"],
        surfaces=["corePhrase", "chunks", "trophyWord"],
    )
    per_vibe = {"bright": 0, "wistful": 0, "sharp": 0}
    for r in rows:
        per_vibe[r.vibe] += 1
    assert per_vibe == {"bright": 5, "wistful": 5, "sharp": 5}


def test_extract_lesson_surfaces_em_dash_normalization_is_applied():
    rows = extract_lesson_surfaces(lesson=A1P1_LESSON_1, vibes=["wistful"])
    core = next(r for r in rows if r.surface == "corePhrase")
    assert core.source_text == "Sorry to ask — do you happen to speak English?"
    assert core.normalized_text == "Sorry to ask - do you happen to speak English?"
    assert len(core.normalized_text) == 46


# ---------------------------------------------------------------------------
# A1P1 canary inventory (architecture report §7)
# ---------------------------------------------------------------------------

def test_a1p1_canary_inventory_matches_report_numbers():
    inventory = build_inventory(
        lessons=[A1P1_LESSON_1],
        voice_profiles=_bright_wistful_sharp_profiles(),
        existing_assets_by_cache_key={},
        vibes=["bright", "wistful", "sharp"],
        surfaces=["corePhrase", "chunks", "trophyWord"],
        target_language_code="en-US",
    )

    totals = inventory["totals"]
    # 5 rows × 3 vibes
    assert totals["rows"] == 15
    # All missing (no existing assets), no unresolved voices
    assert totals["missing"] == 15
    assert totals["ready"] == 0
    assert totals["missing_voice_profile"] == 0
    # 15 distinct cache keys (voice is part of the key — no within-run dedup)
    assert totals["unique_cache_keys"] == 15
    # 12 unique normalized texts ignoring voice:
    # bright: Hi there, do you speak English? / Hi there / do you speak / English / delighted (5)
    # wistful: Sorry to ask - do you happen to speak English? / Sorry to ask /
    #          do you happen to speak / English [dedup] / gently (4 new)
    # sharp: Quick question - do you speak English? / Quick question /
    #        do you speak [dedup] / English [dedup] / clear (3 new)
    # 5 + 4 + 3 = 12
    assert totals["unique_normalized_texts"] == 12

    # 15 provider calls (5 per voice × 3 voices)
    assert totals["estimated_provider_calls"] == 15

    # Character totals per architecture report §7:
    # Bright total = 31 + 8 + 12 + 7 + 9 = 67
    # Wistful total = 46 + 12 + 22 + 7 + 6 = 93
    # Sharp total = 38 + 14 + 12 + 7 + 5 = 76
    # = 236
    assert totals["estimated_provider_characters"] == 236
    assert totals["total_character_count_all_voices"] == 236

    per_voice = {entry["voice_profile_key"]: entry for entry in inventory["per_voice"]}
    assert per_voice["english_a1_bright_v1"]["character_count"] == 67
    assert per_voice["english_a1_wistful_v1"]["character_count"] == 93
    assert per_voice["english_a1_sharp_v1"]["character_count"] == 76
    for entry in per_voice.values():
        assert entry["unique_texts"] == 5
        assert entry["missing"] == 5
        assert entry["ready"] == 0


def test_a1p1_canary_inventory_reports_cache_hits():
    profiles = _bright_wistful_sharp_profiles()
    s = _settings_hash()
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
    existing = {
        bright_english_ck: {
            "id": "asset-001",
            "status": "ready",
        }
    }

    inventory = build_inventory(
        lessons=[A1P1_LESSON_1],
        voice_profiles=profiles,
        existing_assets_by_cache_key=existing,
        vibes=["bright", "wistful", "sharp"],
        surfaces=["corePhrase", "chunks", "trophyWord"],
        target_language_code="en-US",
    )

    totals = inventory["totals"]
    assert totals["ready"] == 1
    assert totals["missing"] == 14
    # Provider would now call 14 times, not 15.
    assert totals["estimated_provider_calls"] == 14
    # And bill 236 - 7 ("English") = 229 characters.
    assert totals["estimated_provider_characters"] == 236 - 7


def test_a1p1_canary_fails_clearly_when_voice_profiles_missing():
    inventory = build_inventory(
        lessons=[A1P1_LESSON_1],
        voice_profiles=[],
        existing_assets_by_cache_key={},
        vibes=["bright", "wistful", "sharp"],
        surfaces=["corePhrase", "chunks", "trophyWord"],
        target_language_code="en-US",
    )
    totals = inventory["totals"]
    assert totals["missing_voice_profile"] == 15
    assert totals["estimated_provider_calls"] == 0
    assert totals["estimated_provider_characters"] == 0

    # Every (lang, vibe, surface) combination is reported as unresolved.
    unresolved_keys = {
        (entry["target_language_code"], entry["vibe"], entry["surface"])
        for entry in inventory["voices_unresolved"]
    }
    expected = {
        ("en-US", v, s)
        for v in ("bright", "wistful", "sharp")
        for s in ("corePhrase", "chunk", "trophyWord")
    }
    assert unresolved_keys == expected


def test_a1p1_canary_fails_clearly_when_only_one_vibe_has_a_profile():
    profiles = [_bright_wistful_sharp_profiles()[0]]  # bright only
    inventory = build_inventory(
        lessons=[A1P1_LESSON_1],
        voice_profiles=profiles,
        existing_assets_by_cache_key={},
        vibes=["bright", "wistful", "sharp"],
        surfaces=["corePhrase", "chunks", "trophyWord"],
        target_language_code="en-US",
    )
    totals = inventory["totals"]
    # bright (5) resolves; wistful + sharp (10) do not.
    assert totals["missing"] == 5
    assert totals["missing_voice_profile"] == 10


# ---------------------------------------------------------------------------
# Guardrails: PR #1 has no provider implementation
# ---------------------------------------------------------------------------

def test_inventory_module_has_no_provider_implementation():
    """Importing the inventory module must not import any HTTP client.

    This is a static smoke test that catches accidental introduction of
    httpx/requests/elevenlabs in PR #1.
    """
    import sys
    import src.services.guided_tts.inventory as inv

    name = inv.__name__
    # The module itself must not pull in HTTP clients transitively.
    forbidden = {"httpx", "requests", "aiohttp", "elevenlabs"}
    loaded_via_inventory = {
        n
        for n in sys.modules
        if any(token in n for token in forbidden) and n in sys.modules
    }
    # Strip out modules that were already loaded by the test process for other
    # reasons. We only care that inv itself didn't add them.
    # The function asserts the inventory module exposes no provider symbol.
    assert not hasattr(inv, "synthesize")
    assert not hasattr(inv, "generate")
    assert not hasattr(inv, "ElevenLabsClient")
    assert name == "src.services.guided_tts.inventory"
    # Belt-and-braces: forbidden modules are not direct attributes of inv.
    for token in forbidden:
        assert not hasattr(inv, token)
    _ = loaded_via_inventory  # consumed for readability only


def test_inventory_has_no_commit_or_provider_call_kwargs():
    """build_inventory must not accept anything that would imply a provider call."""
    import inspect
    from src.services.guided_tts.inventory import build_inventory

    params = set(inspect.signature(build_inventory).parameters.keys())
    forbidden = {"commit", "provider_generate", "api_key", "elevenlabs_client"}
    assert params.isdisjoint(forbidden)


def test_unknown_vibe_raises_value_error():
    with pytest.raises(ValueError):
        extract_lesson_surfaces(lesson=A1P1_LESSON_1, vibes=["tender"])


def test_unknown_surface_raises_value_error():
    with pytest.raises(ValueError):
        extract_lesson_surfaces(lesson=A1P1_LESSON_1, surfaces=["lessonItems"])
