"""Workspace creation, folder management, and metadata."""

from __future__ import annotations
import json
from datetime import datetime, timezone
from pathlib import Path

from .models import WorkspaceMeta
from .path_safety import confined_child_path, validate_word_slug


STAGE_FOLDERS = ['concept', 'songs', 'images', 'videos', 'final', 'bookend']


def create_word_folder(workspace_path: Path, word_slug: str) -> Path:
    """Create the folder structure for a single word."""
    word_dir = get_word_dir(workspace_path, word_slug)
    word_dir.mkdir(parents=True, exist_ok=True)
    for folder in STAGE_FOLDERS:
        (word_dir / folder).mkdir(exist_ok=True)
    return word_dir


def get_word_dir(workspace_path: Path, word_slug: str) -> Path:
    return confined_child_path(workspace_path, validate_word_slug(word_slug))


def list_word_dirs(workspace_path: Path) -> list[Path]:
    """List all word directories (folders containing manifest.json)."""
    if not workspace_path.exists():
        return []
    return sorted(
        [d for d in workspace_path.iterdir()
         if d.is_dir() and (d / 'manifest.json').exists()],
        key=lambda d: d.name
    )


def meta_path(workspace_path: Path) -> Path:
    return workspace_path / "workspace-meta.json"


def read_workspace_meta(workspace_path: Path) -> WorkspaceMeta | None:
    p = meta_path(workspace_path)
    if not p.exists():
        return None
    with open(p, 'r', encoding='utf-8') as f:
        return WorkspaceMeta(**json.load(f))


def write_workspace_meta(workspace_path: Path, meta: WorkspaceMeta) -> None:
    p = meta_path(workspace_path)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(meta.model_dump(), f, indent=2, ensure_ascii=False)


def create_version_dir(stage_dir: Path, label: str) -> tuple[Path, str]:
    """
    Create a versioned output directory with timestamp.
    Returns (dir_path, version_name).
    """
    ts = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
    version_name = f"{label}_{ts}"
    version_dir = stage_dir / version_name
    version_dir.mkdir(parents=True, exist_ok=True)
    return version_dir, version_name


def get_next_run_number(stage_dir: Path, prefix: str) -> int:
    """Get the next NNN counter for version naming (e.g. run-001, run-002)."""
    existing = [
        d.name for d in stage_dir.iterdir()
        if d.is_dir() and d.name.startswith(prefix)
    ] if stage_dir.exists() else []
    return len(existing) + 1


def make_version_label(stage: str, settings: dict, stage_dir: Path) -> str:
    """Generate a human-readable version label for a stage run."""
    if stage == 'concept':
        mode = settings.get('lyric_mode', 'creative')
        return mode
    elif stage == 'song':
        n = get_next_run_number(stage_dir, 'run-')
        return f"run-{n:03d}"
    elif stage == 'images':
        direction = settings.get('creative_direction', 'editorial')
        n = get_next_run_number(stage_dir, f"{direction}-")
        return f"{direction}-{n:03d}"
    elif stage == 'video':
        mode = settings.get('video_mode', 'ken-burns')
        mode_slug = mode.replace('_', '-')
        n = get_next_run_number(stage_dir, f"{mode_slug}-")
        return f"{mode_slug}-{n:03d}"
    elif stage == 'assembly' or stage == 'final':
        asm_mode = settings.get('assembly_mode', 'clean')
        n = get_next_run_number(stage_dir, f"{asm_mode}-")
        return f"{asm_mode}-{n:03d}"
    elif stage == 'bookend':
        n = get_next_run_number(stage_dir, "bookend-")
        return f"bookend-{n:03d}"
    return "run-001"
