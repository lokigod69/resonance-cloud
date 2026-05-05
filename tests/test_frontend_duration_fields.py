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

CLIP_DURATION_HELPER = (
    "Generated animated scene/video duration. Final uploaded video may be longer "
    "because Suno fade/card tail and bookend/pronunciation can add time."
)


def _stage_section(source: str, export_name: str) -> str:
    start = source.index(f"export const {export_name}: FieldDef[] = [")
    end = source.index("\n]\n", start)
    return source[start:end]


def test_frontend_removes_legacy_toggle_and_duration_options():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")

    assert ("short" + "_mode") not in source
    assert "options: [15, 20, 30, 60]" not in source
    assert "options: ['auto', 1, 2, 3, 4, 5, 6, 7, 8]" not in source


def test_frontend_exposes_single_canonical_clip_duration_control():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")
    images = _stage_section(source, "IMAGE_FIELDS")

    assert "key: 'clip_duration'" in images
    assert "label: 'Clip Duration'" in images
    assert "min: 6" in images
    assert "max: 30" in images
    assert "default: 15" in images
    assert CLIP_DURATION_HELPER in images


def test_frontend_removes_concept_and_song_duration_controls():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")
    concept = _stage_section(source, "CONCEPT_FIELDS")
    song = _stage_section(source, "SONG_FIELDS")

    assert "key: 'duration'" not in concept
    assert "key: 'duration'" not in song


def test_frontend_image_count_is_limited_to_supported_scene_counts():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")
    images = _stage_section(source, "IMAGE_FIELDS")

    assert "key: 'image_count'" in images
    assert "options: ['auto', 1, 2, 3]" in images
    assert "4, 5, 6, 7, 8" not in images


def test_frontend_removes_ltx_duration_slider():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")
    video = _stage_section(source, "VIDEO_FIELDS")

    assert "{ key: 'duration', label: 'Duration', type: 'slider', min: 6, max: 10" not in video
    assert "condition: isLtx" not in "".join(
        line for line in video.splitlines() if "key: 'duration'" in line
    )


def test_frontend_settings_saves_are_duration_sanitized():
    src_root = FIELD_CONFIGS.parents[2]
    sanitizer = src_root / "components" / "settings" / "durationSettings.ts"
    batch = src_root / "components" / "BatchSettings.tsx"
    profiles = src_root / "pages" / "admin" / "Profiles.tsx"

    assert "delete images['short' + '_mode']" in sanitizer.read_text(encoding="utf-8")
    assert "delete sanitized.concept.duration" in sanitizer.read_text(encoding="utf-8")
    assert "delete sanitized.song.duration" in sanitizer.read_text(encoding="utf-8")
    assert "sanitizeDurationSettings" in batch.read_text(encoding="utf-8")
    assert "sanitizeDurationSettings" in profiles.read_text(encoding="utf-8")
