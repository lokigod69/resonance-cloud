"""Tests for the unified duration policy and scene duration normalizer."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from cloud_engines.duration_policy import auto_scene_count  # noqa: E402
from cloud_engines.video_engine.adapters import ltx as ltx_module  # noqa: E402
from cloud_engines.video_engine.adapters.ltx_runpod import LTXRunPodAdapter  # noqa: E402
from cloud_engines.video_engine.adapters.ltx_selfhosted import LTXSelfHostedAdapter  # noqa: E402
from cloud_engines.video_engine.models import VideoSettings  # noqa: E402
from types import SimpleNamespace
from src.pipeline import _normalize_scene_durations  # noqa: E402
from src.pipeline import build_video_payloads  # noqa: E402
from src.settings import load_defaults, sanitize_duration_settings, save_defaults  # noqa: E402

LEGACY_COMPACT_DURATION_KEY = "short" + "_mode"


def _assert_exact(values: list[int], target: int) -> None:
    assert sum(values) == target
    assert all(3 <= value <= 10 for value in values)


def test_normalize_one_scene_target_6():
    assert _normalize_scene_durations([None], target=6) == [6]


@pytest.mark.parametrize(
    ("raw", "target"),
    [
        ([4, 5], 9),
        ([6, 6], 12),
        ([4, 4, 4], 12),
        ([7, 8], 15),
        ([6, 6, 6], 18),
        ([9, 8, 8], 25),
        ([None, None, None], 30),
    ],
)
def test_normalize_exact_sum_for_supported_targets(raw: list[int | None], target: int):
    result = _normalize_scene_durations(raw, target=target)
    _assert_exact(result, target)


def test_normalize_three_scene_target_30_caps_at_ten_each():
    assert _normalize_scene_durations([12, 12, 12], target=30) == [10, 10, 10]


@pytest.mark.parametrize(
    ("raw", "target"),
    [
        ([None, None], 25),
        ([None, None, None], 6),
        ([], 15),
    ],
)
def test_normalize_infeasible_target_count_raises(raw: list[int | None], target: int):
    with pytest.raises(ValueError):
        _normalize_scene_durations(raw, target=target)


@pytest.mark.parametrize(
    ("duration", "expected"),
    [
        (6, 1),
        (7, 2),
        (8, 2),
        (9, 2),
        (10, "auto"),
        (12, "auto"),
        (15, "auto"),
        (18, "auto"),
        (19, 3),
        (20, 3),
        (25, 3),
        (30, 3),
    ],
)
def test_auto_scene_count(duration: int, expected: int | str):
    assert auto_scene_count(duration) == expected


@pytest.mark.parametrize("duration", [5, 31])
def test_auto_scene_count_rejects_outside_range(duration: int):
    with pytest.raises(ValueError):
        auto_scene_count(duration)


@pytest.mark.parametrize("duration", [3, 5, 7, 9, 10])
def test_runpod_adapter_passes_duration_without_snapping(duration: int):
    settings = VideoSettings(duration=duration, resolution="1080p")
    assert LTXRunPodAdapter().validate_settings(settings).duration == duration


@pytest.mark.parametrize("duration", [3, 5, 7, 9, 10])
def test_selfhosted_adapter_passes_duration_without_snapping(duration: int):
    settings = VideoSettings(duration=duration, resolution="1080p")
    assert LTXSelfHostedAdapter().validate_settings(settings).duration == duration


def test_video_settings_accepts_conditioning_strength_backend_tunable():
    settings = VideoSettings(conditioning_strength=0.85)
    assert settings.conditioning_strength == 0.85


@pytest.mark.parametrize("value", [0.49, 1.01])
def test_video_settings_rejects_conditioning_strength_outside_worker_range(value: float):
    with pytest.raises(ValueError):
        VideoSettings(conditioning_strength=value)


def test_video_payloads_preserve_conditioning_strength_gateway_field(tmp_path):
    word_dir = tmp_path / "word"
    images_dir = word_dir / "images" / "run-001"
    output_dir = word_dir / "videos" / "run-001"
    images_dir.mkdir(parents=True)
    output_dir.mkdir(parents=True)
    (images_dir / "001.png").write_bytes(b"png")
    (images_dir / "002.png").write_bytes(b"png")
    (images_dir / "storyboard.json").write_text(
        """
        {
          "frame_narrative": "action",
          "suggested_transition_mode": "morph_then_cut",
          "scenes": [
            {
              "video_prompt": "standalone motion",
              "transition_prompt": "morph to next",
              "suggested_duration": 5,
              "camera_motion": {"type": "push_in", "speed": "medium"}
            },
            {
              "video_prompt": "second scene",
              "transition_prompt": null,
              "suggested_duration": 5,
              "camera_motion": {"type": "static", "speed": "slow"}
            }
          ]
        }
        """,
        encoding="utf-8",
    )
    manifest = SimpleNamespace(
        word_original="Sturm",
        translation="storm",
        language="German",
        language_code="de",
        identity={},
    )
    settings = {
        "video_mode": "ltx_fast",
        "transition_mode": "auto",
        "_target_duration": 10,
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

    assert payloads[0]["settings"]["conditioning_strength"] == 0.85
    assert payloads[0]["content"]["end_image_path"].endswith("002.png")


def test_ltx_adapters_send_conditioning_strength_to_worker_payloads():
    adapters_dir = _ORCH_ROOT / "cloud_engines" / "video_engine" / "adapters"
    selfhosted_source = (adapters_dir / "ltx_selfhosted.py").read_text(encoding="utf-8")
    runpod_source = (adapters_dir / "ltx_runpod.py").read_text(encoding="utf-8")

    assert '"conditioning_strength": str(settings.conditioning_strength)' in selfhosted_source
    assert '"conditioning_strength": settings.conditioning_strength' in runpod_source


def test_fal_adapter_keeps_private_snap_behavior():
    snap = getattr(ltx_module, "_snap" + "_duration")
    assert snap(7, (6, 8, 10)) == 8


def test_settings_sanitizer_removes_legacy_duration_knobs():
    sanitized = sanitize_duration_settings(
        {
            "images": {"clip_duration": 25, LEGACY_COMPACT_DURATION_KEY: True},
            "concept": {"duration": 60, "lyric_mode": "reliable"},
            "song": {"duration": 60, "batch_size": 2},
        }
    )

    assert LEGACY_COMPACT_DURATION_KEY not in sanitized["images"]
    assert sanitized["images"]["clip_duration"] == 25
    assert sanitized["concept"]["duration"] == 25
    assert sanitized["song"]["duration"] == 25


def test_save_and_load_defaults_sanitize_duration_drift(tmp_path):
    save_defaults(
        tmp_path,
        {
            "images": {"clip_duration": 31, LEGACY_COMPACT_DURATION_KEY: True},
            "concept": {"duration": 60},
            "song": {"duration": 60},
        },
    )

    loaded = load_defaults(tmp_path)
    assert LEGACY_COMPACT_DURATION_KEY not in loaded["images"]
    assert loaded["images"]["clip_duration"] == 15
    assert loaded["concept"]["duration"] == 15
    assert loaded["song"]["duration"] == 15
