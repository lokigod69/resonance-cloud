"""Tests for the T2I/I2I routing heuristic in renderer.py."""
from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.renderer import (  # noqa: E402
    _change_request_is_large_delta,
)


def test_none_change_request_is_small():
    assert _change_request_is_large_delta(None) is False


def test_empty_change_request_is_small():
    assert _change_request_is_large_delta("") is False


def test_short_local_edit_is_small():
    assert _change_request_is_large_delta("shift to medium close-up of hands") is False


def test_setting_swap_is_small():
    assert _change_request_is_large_delta("change setting to dusk") is False


def test_twelve_word_request_without_keywords_is_small():
    text = "shift framing closer slightly with farmer leaning forward into the muddy soil"
    assert len(text.split()) == 12
    assert _change_request_is_large_delta(text) is False


def test_thirteen_word_request_without_keywords_is_large():
    text = "shift framing closer slightly with farmer leaning forward into the muddy soil quickly"
    assert len(text.split()) == 13
    assert _change_request_is_large_delta(text) is True


def test_short_request_with_transforms_keyword_is_large():
    assert _change_request_is_large_delta("desk transforms into airplane") is True


def test_short_request_with_becomes_keyword_is_large():
    assert _change_request_is_large_delta("the room becomes a meadow") is True


def test_short_request_with_morphs_keyword_is_large():
    assert _change_request_is_large_delta("scene morphs into ocean") is True


def test_short_request_with_dissolves_keyword_is_large():
    assert _change_request_is_large_delta("walls dissolves away") is True


def test_short_request_with_space_keyword_is_large():
    assert _change_request_is_large_delta("now floating in space") is True


def test_short_request_with_nebula_keyword_is_large():
    assert _change_request_is_large_delta("amid a nebula") is True


def test_short_request_with_now_in_keyword_is_large():
    assert _change_request_is_large_delta("now in another world") is True


def test_short_request_with_dimension_keyword_is_large():
    assert _change_request_is_large_delta("entered another dimension") is True


def test_short_request_with_different_planet_is_large():
    assert _change_request_is_large_delta("on a different planet") is True


def test_keyword_match_is_case_insensitive():
    assert _change_request_is_large_delta("Desk TRANSFORMS into airplane") is True


def test_two_semicolons_is_large():
    assert _change_request_is_large_delta("close up; new lighting; same pose") is True


def test_one_semicolon_short_is_small():
    assert _change_request_is_large_delta("close up; new lighting") is False


def test_three_commas_is_large():
    assert _change_request_is_large_delta("a, b, c, d") is True


def test_two_commas_short_is_small():
    assert _change_request_is_large_delta("a, b, c") is False


def test_dream_scene_three_example_is_large():
    text = (
        "clouds fully part to space vista, desk transforms to paper airplane, "
        "man shifts to dynamic surfing pose amid heightened motion"
    )
    assert _change_request_is_large_delta(text) is True


def test_bauer_style_small_delta_short_keyword_free_is_small():
    assert _change_request_is_large_delta("farmer harvests corn instead of tilling") is False
