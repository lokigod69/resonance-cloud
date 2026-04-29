"""Tests for tier-conditional conditioning_strength mapping."""

from __future__ import annotations

import sys
from pathlib import Path
from types import SimpleNamespace

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from cloud_engines.video_engine.tier_mapping import (  # noqa: E402
    DEFAULT_CONDITIONING_STRENGTH,
    TIER_TO_CONDITIONING_STRENGTH,
    conditioning_strength_for_tier,
)
from src.pipeline import build_video_payloads  # noqa: E402


def test_calm_tier_maps_to_high_strength():
    assert conditioning_strength_for_tier("calm") == 0.95


def test_standard_tier_maps_to_default_strength():
    assert conditioning_strength_for_tier("standard") == 0.85


def test_tense_tier_maps_to_low_strength():
    assert conditioning_strength_for_tier("tense") == 0.75


def test_none_tier_returns_default():
    assert conditioning_strength_for_tier(None) == DEFAULT_CONDITIONING_STRENGTH
    assert conditioning_strength_for_tier(None) == 0.85


def test_empty_string_tier_returns_default():
    assert conditioning_strength_for_tier("") == DEFAULT_CONDITIONING_STRENGTH


def test_unknown_tier_returns_default_without_raising():
    assert conditioning_strength_for_tier("chaotic") == DEFAULT_CONDITIONING_STRENGTH
    assert conditioning_strength_for_tier("CALM") == DEFAULT_CONDITIONING_STRENGTH


def test_tier_mapping_dict_shape():
    assert TIER_TO_CONDITIONING_STRENGTH == {
        "calm": 0.95,
        "standard": 0.85,
        "tense": 0.75,
    }


def test_default_matches_videosettings_field_default():
    from cloud_engines.video_engine.models import VideoSettings

    assert DEFAULT_CONDITIONING_STRENGTH == VideoSettings.model_fields[
        "conditioning_strength"
    ].default


def _write_three_tier_storyboard(images_dir: Path) -> None:
    (images_dir / "storyboard.json").write_text(
        """
        {
          "frame_narrative": "tiered",
          "suggested_transition_mode": "all_cut",
          "scenes": [
            {
              "scene_number": 1,
              "scene_tier": "calm",
              "video_prompt": "calm scene",
              "transition_prompt": null,
              "suggested_duration": 5,
              "camera_motion": {"type": "static", "speed": "slow"}
            },
            {
              "scene_number": 2,
              "scene_tier": "standard",
              "video_prompt": "standard scene",
              "transition_prompt": null,
              "suggested_duration": 5,
              "camera_motion": {"type": "push_in", "speed": "medium"}
            },
            {
              "scene_number": 3,
              "scene_tier": "tense",
              "video_prompt": "tense scene",
              "transition_prompt": null,
              "suggested_duration": 5,
              "camera_motion": {"type": "shake", "speed": "fast"}
            }
          ]
        }
        """,
        encoding="utf-8",
    )


def test_build_video_payloads_applies_per_tier_conditioning_strength(tmp_path):
    word_dir = tmp_path / "word"
    images_dir = word_dir / "images" / "run-001"
    output_dir = word_dir / "videos" / "run-001"
    images_dir.mkdir(parents=True)
    output_dir.mkdir(parents=True)
    (images_dir / "001.png").write_bytes(b"png")
    (images_dir / "002.png").write_bytes(b"png")
    (images_dir / "003.png").write_bytes(b"png")
    _write_three_tier_storyboard(images_dir)

    manifest = SimpleNamespace(
        word_original="Sturm",
        translation="storm",
        language="German",
        language_code="de",
        identity={},
    )
    settings = {
        "video_mode": "ltx_fast",
        "transition_mode": "all_cut",
        "_target_duration": 15,
        "conditioning_strength": 0.85,
    }

    payloads = build_video_payloads(
        word_dir,
        manifest,
        settings,
        output_dir,
        "run-001",
        creative_direction="cinematic",
    )

    assert len(payloads) == 3
    assert payloads[0]["settings"]["conditioning_strength"] == 0.95
    assert payloads[1]["settings"]["conditioning_strength"] == 0.85
    assert payloads[2]["settings"]["conditioning_strength"] == 0.75


def test_build_video_payloads_old_storyboard_without_tier_uses_default(tmp_path):
    word_dir = tmp_path / "word"
    images_dir = word_dir / "images" / "run-002"
    output_dir = word_dir / "videos" / "run-002"
    images_dir.mkdir(parents=True)
    output_dir.mkdir(parents=True)
    (images_dir / "001.png").write_bytes(b"png")
    (images_dir / "storyboard.json").write_text(
        """
        {
          "frame_narrative": "legacy",
          "suggested_transition_mode": "all_cut",
          "scenes": [
            {
              "scene_number": 1,
              "video_prompt": "legacy scene with no tier",
              "suggested_duration": 6,
              "camera_motion": {"type": "static", "speed": "slow"}
            }
          ]
        }
        """,
        encoding="utf-8",
    )

    manifest = SimpleNamespace(
        word_original="legacy",
        translation="legacy",
        language="English",
        language_code="en",
        identity={},
    )
    settings = {
        "video_mode": "ltx_fast",
        "transition_mode": "all_cut",
        "_target_duration": 6,
        "conditioning_strength": 0.85,
    }

    payloads = build_video_payloads(
        word_dir,
        manifest,
        settings,
        output_dir,
        "run-002",
        creative_direction="cinematic",
    )

    assert len(payloads) == 1
    assert payloads[0]["settings"]["conditioning_strength"] == 0.85


def test_build_video_payloads_text_to_video_applies_tier_mapping(tmp_path):
    word_dir = tmp_path / "word"
    images_dir = word_dir / "images" / "run-003"
    output_dir = word_dir / "videos" / "run-003"
    images_dir.mkdir(parents=True)
    output_dir.mkdir(parents=True)
    _write_three_tier_storyboard(images_dir)

    manifest = SimpleNamespace(
        word_original="Sturm",
        translation="storm",
        language="German",
        language_code="de",
        identity={},
    )
    settings = {
        "video_mode": "ltx_fast",
        "text_to_video": True,
        "transition_mode": "all_cut",
        "_target_duration": 15,
        "conditioning_strength": 0.85,
        "motion_type": "auto",
    }

    payloads = build_video_payloads(
        word_dir,
        manifest,
        settings,
        output_dir,
        "run-003",
        creative_direction="cinematic",
    )

    assert len(payloads) == 3
    assert payloads[0]["settings"]["conditioning_strength"] == 0.95
    assert payloads[1]["settings"]["conditioning_strength"] == 0.85
    assert payloads[2]["settings"]["conditioning_strength"] == 0.75
