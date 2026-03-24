"""Resonance Orchestrator — Voice registry (ElevenLabs voice ID management)."""

from __future__ import annotations

import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


def voices_path(workspace_root: Path) -> Path:
    return workspace_root / "voices.json"


def load_voices(workspace_root: Path) -> list[dict[str, Any]]:
    """Load voices.json, returning empty list if missing."""
    p = voices_path(workspace_root)
    if p.exists():
        with open(p, "r", encoding="utf-8") as f:
            return json.load(f)
    return []


def save_voices(workspace_root: Path, voices: list[dict[str, Any]]) -> None:
    """Write voices.json."""
    p = voices_path(workspace_root)
    with open(p, "w", encoding="utf-8") as f:
        json.dump(voices, f, indent=2, ensure_ascii=False)


def add_voice(workspace_root: Path, data: dict[str, Any]) -> dict[str, Any]:
    """Add a new voice entry. Returns the created voice dict."""
    voices = load_voices(workspace_root)
    voice: dict[str, Any] = {
        "id": str(uuid.uuid4()),
        "voice_id": data["voice_id"],
        "name": data["name"],
        "language": data.get("language", ""),
        "notes": data.get("notes", ""),
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    voices.append(voice)
    save_voices(workspace_root, voices)
    return voice


def update_voice(
    workspace_root: Path, voice_id: str, updates: dict[str, Any]
) -> dict[str, Any]:
    """Update an existing voice entry by registry id. Raises KeyError if not found."""
    voices = load_voices(workspace_root)
    for voice in voices:
        if voice["id"] == voice_id:
            for key, value in updates.items():
                if key not in ("id", "created_at"):
                    voice[key] = value
            save_voices(workspace_root, voices)
            return voice
    raise KeyError(voice_id)


def delete_voice(workspace_root: Path, voice_id: str) -> None:
    """Remove a voice entry by registry id. Raises KeyError if not found."""
    voices = load_voices(workspace_root)
    for i, voice in enumerate(voices):
        if voice["id"] == voice_id:
            voices.pop(i)
            save_voices(workspace_root, voices)
            return
    raise KeyError(voice_id)
