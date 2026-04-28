"""Static checks for canonical duration controls in the frontend settings UI."""

from __future__ import annotations

from pathlib import Path


FIELD_CONFIGS = (
    Path(__file__).resolve().parents[1]
    / "frontend"
    / "src"
    / "components"
    / "settings"
    / "fieldConfigs.ts"
)


def test_frontend_removes_legacy_toggle_and_duration_options():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")

    assert ("short" + "_mode") not in source
    assert "options: [15, 20, 30, 60]" not in source
    assert "options: ['auto', 1, 2, 3, 4, 5, 6, 7, 8]" not in source


def test_frontend_exposes_single_canonical_clip_duration_control():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")

    assert "key: 'clip_duration'" in source
    assert "label: 'Clip Duration'" in source
    assert "min: 6" in source
    assert "max: 30" in source
    assert "default: 15" in source
    assert "Concept, song, storyboard, and video timing derive from this." in source


def test_frontend_removes_ltx_duration_slider():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")

    assert "{ key: 'duration', label: 'Duration', type: 'slider', min: 6, max: 10" not in source
