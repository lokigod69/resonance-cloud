"""Stage completion checking and fallback override logic."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from src.pipeline import STAGE_ORDER

log = logging.getLogger(__name__)


def get_fallback_overrides(
    stage: str, attempt: int, current_settings: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return per-word setting overrides for retry attempts."""
    if stage == "images" and attempt >= 1:
        current_model = (current_settings or {}).get("llm_model", "")
        fallback_model = (
            "deepseek/deepseek-v4-flash"
            if current_model == "x-ai/grok-4.1-fast"
            else "x-ai/grok-4.1-fast"
        )
        return {"creative_direction": "literal", "llm_model": fallback_model}
    if stage == "concept" and attempt >= 1:
        current_model = (current_settings or {}).get("llm_model", "")
        fallback_model = (
            "deepseek/deepseek-v4-flash"
            if current_model == "x-ai/grok-4.1-fast"
            else "x-ai/grok-4.1-fast"
        )
        return {"llm_model": fallback_model}
    if stage == "video" and attempt >= 1:
        # Don't fall back to ken_burns in text-to-video mode — no source images exist
        if current_settings and current_settings.get("text_to_video", False):
            return {}
        return {"video_mode": "ken_burns"}
    if stage == "song" and attempt >= 1:
        return {"batch_size": 1}
    return {}


def _validate_artifacts(word_dir: Path, stage: str, selected: str) -> bool:
    """Check that a completed stage's output files actually exist on disk."""
    # NOTE: This mapping is duplicated in services/metadata.py.
    # Consolidation deferred to Phase 3.
    folder_map = {
        "concept": "concept", "song": "songs", "images": "images",
        "video": "videos", "assembly": "final", "bookend": "bookend",
    }
    base = word_dir / folder_map[stage]

    if stage == "images":
        d = base / selected
        return d.is_dir() and any(d.glob("*.png"))
    elif stage == "concept":
        return (base / selected).is_file()
    elif stage == "song":
        # Format: "run-001_ts/take_001.flac"
        parts = selected.split("/")
        if len(parts) == 2:
            return (base / parts[0] / parts[1]).is_file()
        return (base / selected).is_dir()
    elif stage == "video":
        d = base / selected
        return d.is_dir() and any(d.glob("scene_*.mp4"))
    elif stage == "assembly":
        return (base / selected / "final.mp4").is_file()
    elif stage == "bookend":
        return (base / selected / "final.mp4").is_file()
    return False


def get_incomplete_stages(
    word_dir: Path,
    manifest_data: Any,
    bookend_enabled: bool = True,
) -> list[str]:
    """Return stages that need (re-)running based on manifest selected fields + artifact existence."""
    stages: list[str] = []
    for stage in STAGE_ORDER:
        if stage == "bookend" and not bookend_enabled:
            continue
        field = "final" if stage == "assembly" else stage
        selected = getattr(manifest_data.selected, field, None)
        if selected is None or not _validate_artifacts(word_dir, stage, selected):
            stages.append(stage)
    return stages
