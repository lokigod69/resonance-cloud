"""Artifact collection and metadata assembly for word uploads."""

from __future__ import annotations

import json
import logging
import re
from pathlib import Path
from typing import Any

from src.manifest import read_manifest

log = logging.getLogger(__name__)


# Strip BPM/tempo phrases from served music_caption so already-stored artifacts
# don't surface "at 120 BPM" on the WordCard. Mirrors the Suno-bound strip in
# src/suno.py:build_suno_payload — keep both in sync if either is updated.
_BPM_AT_RE = re.compile(r"\s*\bat\s+\d{1,3}(?:\s*-\s*\d{1,3})?\s*BPM\b", re.IGNORECASE)
_BPM_BARE_RE = re.compile(r"\s*\b\d{1,3}(?:\s*-\s*\d{1,3})?\s*BPM\b", re.IGNORECASE)
_DOUBLED_COMMA_RE = re.compile(r",\s*,")


def _strip_bpm(caption: str | None) -> str | None:
    if not caption:
        return caption
    out = _BPM_AT_RE.sub("", caption)
    out = _BPM_BARE_RE.sub("", out)
    out = _DOUBLED_COMMA_RE.sub(",", out)
    return out.strip(" ,") or None

# Maps stage names to their filesystem directory names
# NOTE: This mapping is duplicated in services/stage_helpers.py.
# Consolidation deferred to Phase 3.
_STAGE_DIRS = {
    "images": "images",
    "concept": "concept",
    "song": "songs",
    "video": "videos",
    "assembly": "final",
    "bookend": "bookend",
}


def _read_json(path: Path) -> dict[str, Any]:
    """Read a JSON file, returning empty dict on failure."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _find_latest_meta(stage_dir: Path) -> dict[str, Any]:
    """Find the latest generation-meta.json in a stage directory."""
    if not stage_dir.exists():
        return {}

    # Concept stage: generation-meta.json is directly in the concept/ folder
    direct = stage_dir / "generation-meta.json"
    if direct.exists():
        return _read_json(direct)

    # Other stages: inside timestamped version subdirectories
    version_dirs = sorted(
        [d for d in stage_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )
    if not version_dirs:
        return {}

    meta_path = version_dirs[-1] / "generation-meta.json"
    return _read_json(meta_path) if meta_path.exists() else {}


def _find_latest_storyboard(images_dir: Path) -> dict[str, Any]:
    """Find the latest storyboard.json from the images stage."""
    if not images_dir.exists():
        return {}
    version_dirs = sorted(
        [d for d in images_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )
    if not version_dirs:
        return {}
    sb_path = version_dirs[-1] / "storyboard.json"
    return _read_json(sb_path) if sb_path.exists() else {}


def collect_word_metadata(
    word_dir: Path,
    profile_name: str | None,
    pipeline_duration: float,
) -> dict[str, Any]:
    """Collect generation metadata from filesystem into a summary dict."""
    # Read per-stage meta
    metas: dict[str, dict[str, Any]] = {}
    stages_completed = []
    for stage, folder in _STAGE_DIRS.items():
        meta = _find_latest_meta(word_dir / folder)
        if meta and meta.get("status") == "success":
            stages_completed.append(stage)
        metas[stage] = meta

    # Storyboard data
    sb = _find_latest_storyboard(word_dir / "images")

    # Image meta
    img = metas.get("images", {})
    img_outputs = img.get("outputs", {})
    img_steps = img.get("steps", {})
    img_rendering = img_steps.get("image_rendering", {})

    # Song meta
    song = metas.get("song", {})
    song_lora = song.get("lora", {})

    # Video meta
    vid = metas.get("video", {})

    # Assembly meta
    asm = metas.get("assembly", {})
    asm_report = asm.get("assembly_report", {})

    # Bookend meta
    bke = metas.get("bookend", {})
    bke_tts = bke.get("tts", {})

    # Resolved creative_direction from manifest lineage (authoritative).
    # storyboard.json has LLM free-text; lineage settings_snapshot is the source of truth.
    creative_direction_resolved: str | None = None
    concept_music_caption: str | None = None
    try:
        _manifest = read_manifest(word_dir)
        _images_entries = [e for e in _manifest.lineage if e.stage == "images"]
        if _images_entries:
            _latest = _images_entries[-1]  # lineage is append-only chronological
            creative_direction_resolved = (
                _latest.settings_snapshot.get("creative_direction_resolved")
                or _latest.settings_snapshot.get("creative_direction")
            )
        # Read music_caption from concept file (authoritative — reflects actual genre used by Suno)
        _concept_version = _manifest.selected.concept
        if _concept_version:
            _concept_file = word_dir / "concept" / _concept_version
            if _concept_file.exists():
                _concept_data = json.loads(_concept_file.read_text(encoding="utf-8"))
                concept_music_caption = _concept_data.get("music_caption")
    except (FileNotFoundError, Exception):
        # Manifest missing or unreadable — fall back to legacy sources below.
        pass

    return {
        "pipeline_duration_seconds": round(pipeline_duration, 2),
        "stages_completed": stages_completed,

        # Storyboard / creative
        "creative_direction": (
            creative_direction_resolved
            or sb.get("creative_direction")
            or img.get("settings", {}).get("creative_direction")
        ),
        "art_style": sb.get("art_style") or img.get("settings", {}).get("art_style"),
        "movie_reference": sb.get("movie"),
        "music_caption": _strip_bpm(concept_music_caption or sb.get("music_caption")),

        # Images
        "images": {
            "count": img_outputs.get("images_generated"),
            "refusals": img_rendering.get("scenes_failed", 0),
            "duration_seconds": img.get("duration_seconds"),
            "model": img_rendering.get("model") or img.get("settings", {}).get("image_model"),
        },

        # Concept
        "concept": {
            "duration_seconds": metas.get("concept", {}).get("duration_seconds"),
            "caption_source": metas.get("concept", {}).get("outputs", {}).get("caption_source"),
        },

        # Song
        "song": {
            "duration_seconds": song.get("duration_seconds"),
            "takes": len(song.get("outputs", {}).get("takes", [])) or None,
        },

        # Video
        "video": {
            "duration_seconds": vid.get("duration_seconds"),
            "mode": vid.get("inputs", {}).get("settings_used", {}).get("video_mode"),
        },

        # Assembly
        "assembly": {
            "duration_seconds": asm.get("duration_seconds"),
            "final_video_duration_seconds": asm.get("outputs", {}).get("duration_seconds"),
            "lufs": asm_report.get("normalized_lufs"),
        },

        # Bookend
        "bookend": {
            "duration_seconds": bke.get("duration_seconds"),
            "voice_id": bke_tts.get("voice_id"),
            "tts_language": bke_tts.get("language_code"),
        },

        # LoRA
        "lora": {
            "path": song_lora.get("path"),
            "strength": song_lora.get("strength"),
            "trigger_phrase": song_lora.get("trigger_phrase"),
        } if song_lora.get("active") else None,

        "profile_used": profile_name,
    }
