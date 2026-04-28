"""Resonance Orchestrator — Batch settings presets (save/load named configurations)."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import re

from .settings import DEFAULT_SETTINGS, sanitize_duration_settings
from .slugify import slugify

_SAFE_SLUG = re.compile(r'^[a-z0-9][a-z0-9_]*$')


def _validate_slug(slug: str) -> None:
    """Reject slugs that could escape the presets directory."""
    if not _SAFE_SLUG.match(slug):
        raise ValueError(f"Invalid preset slug: {slug}")


def presets_dir(workspace_root: Path) -> Path:
    """Return the presets directory, creating it if missing."""
    d = workspace_root / "presets"
    d.mkdir(exist_ok=True)
    return d


def list_presets(workspace_root: Path) -> list[dict[str, str]]:
    """List all saved presets (metadata only, no settings payload)."""
    d = workspace_root / "presets"
    if not d.exists():
        return []
    result = []
    for p in sorted(d.glob("*.json")):
        try:
            with open(p, "r", encoding="utf-8") as f:
                data = json.load(f)
            result.append({
                "slug": p.stem,
                "name": data.get("name", p.stem),
                "created_at": data.get("created_at", ""),
            })
        except (json.JSONDecodeError, OSError):
            continue
    result.sort(key=lambda x: x["name"].lower())
    return result


def load_preset(workspace_root: Path, slug: str) -> dict[str, Any]:
    """Load a preset and merge with DEFAULT_SETTINGS to fill missing fields."""
    _validate_slug(slug)
    p = workspace_root / "presets" / f"{slug}.json"
    if not p.exists():
        raise FileNotFoundError(slug)
    with open(p, "r", encoding="utf-8") as f:
        data = json.load(f)
    # Merge each stage with defaults so new fields get their default value
    raw_settings = data.get("settings", {})
    merged: dict[str, dict[str, Any]] = {}
    for stage, stage_defaults in DEFAULT_SETTINGS.items():
        merged[stage] = {**stage_defaults, **raw_settings.get(stage, {})}
    merged = sanitize_duration_settings(merged)
    return {
        "slug": slug,
        "name": data.get("name", slug),
        "created_at": data.get("created_at", ""),
        "settings": merged,
    }


def save_preset(
    workspace_root: Path, name: str, settings: dict[str, dict[str, Any]]
) -> dict[str, str]:
    """Save current settings as a named preset. Overwrites if slug already exists."""
    slug = slugify(name, max_length=80).replace("-", "_")
    if not slug:
        raise ValueError("Preset name produces an empty slug")
    d = presets_dir(workspace_root)
    payload = {
        "name": name.strip(),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "settings": sanitize_duration_settings(settings),
    }
    with open(d / f"{slug}.json", "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2, ensure_ascii=False)
    return {"slug": slug, "name": payload["name"], "created_at": payload["created_at"]}


def delete_preset(workspace_root: Path, slug: str) -> None:
    """Delete a preset file. Raises FileNotFoundError if missing."""
    _validate_slug(slug)
    p = workspace_root / "presets" / f"{slug}.json"
    if not p.exists():
        raise FileNotFoundError(slug)
    p.unlink()
