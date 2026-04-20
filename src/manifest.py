"""Manifest read/write/update. The orchestrator exclusively owns manifests."""

from __future__ import annotations
import json
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from .models import Manifest, LineageEntry, Enrichment

log = logging.getLogger(__name__)


def now_iso() -> str:
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%SZ')


def manifest_path(word_dir: Path) -> Path:
    return word_dir / "manifest.json"


def read_manifest(word_dir: Path) -> Manifest:
    """Read and parse manifest.json from a word directory."""
    mp = manifest_path(word_dir)
    if not mp.exists():
        import os
        log.error(
            "DIAG manifest.read failed: word_dir=%s is_absolute=%s exists=%s "
            "parent_exists=%s parent_listing=%s cwd=%s",
            word_dir, word_dir.is_absolute(), word_dir.exists(),
            word_dir.parent.exists() if word_dir.parent else False,
            os.listdir(word_dir.parent) if word_dir.parent.exists() else "N/A",
            os.getcwd(),
        )
        raise FileNotFoundError(f"No manifest.json in {word_dir}")
    with open(mp, 'r', encoding='utf-8') as f:
        data = json.load(f)
    return Manifest(**data)


def write_manifest(word_dir: Path, manifest: Manifest) -> None:
    """Write manifest.json to a word directory."""
    mp = manifest_path(word_dir)
    manifest.updated_at = now_iso()
    with open(mp, 'w', encoding='utf-8') as f:
        json.dump(manifest.model_dump(by_alias=True), f, indent=2, ensure_ascii=False)


def create_manifest(
    word_dir: Path,
    word_original: str,
    word_slug: str,
    translation: str,
    language: str,
    language_code: str,
    enrichment_data: dict[str, Any] | None = None,
    input_type: str = "word",
) -> Manifest:
    """Create and write a new manifest for a newly imported word or phrase."""
    ts = now_iso()

    enrichment = Enrichment()
    if enrichment_data:
        tags_raw = enrichment_data.pop('tags', '')
        if isinstance(tags_raw, str):
            tags = [t.strip() for t in tags_raw.split(',') if t.strip()]
        elif isinstance(tags_raw, list):
            tags = tags_raw
        else:
            tags = []
        extra = {}
        known_fields = {'pos', 'ipa', 'article', 'example', 'example_gloss', 'synonyms', 'etymology', 'mnemonic'}
        for k, v in enrichment_data.items():
            if k in known_fields:
                setattr(enrichment, k, str(v) if v is not None else None)
            else:
                extra[k] = v
        enrichment.tags = tags
        enrichment.extra = extra

    manifest = Manifest(
        word_original=word_original,
        word_slug=word_slug,
        translation=translation,
        language=language,
        language_code=language_code,
        created_at=ts,
        updated_at=ts,
        input_type=input_type,
        enrichment=enrichment,
    )
    write_manifest(word_dir, manifest)
    return manifest


_STAGE_TO_SELECTED = {'assembly': 'final', 'bookend': 'bookend'}

def update_selection(word_dir: Path, stage: str, version: str) -> Manifest:
    """Update the selected version for a stage."""
    m = read_manifest(word_dir)
    field = _STAGE_TO_SELECTED.get(stage, stage)
    setattr(m.selected, field, version)
    write_manifest(word_dir, m)
    return m


def update_settings(word_dir: Path, stage: str, settings: dict[str, Any]) -> Manifest:
    """Update per-word settings for a stage (merges, doesn't replace)."""
    m = read_manifest(word_dir)
    if stage not in m.settings:
        m.settings[stage] = {}
    m.settings[stage].update(settings)
    write_manifest(word_dir, m)
    return m


def add_lineage(
    word_dir: Path,
    stage: str,
    version: str,
    from_versions: dict[str, str],
    settings_snapshot: dict[str, Any],
    status: str = "success",
) -> Manifest:
    """Append a lineage entry."""
    m = read_manifest(word_dir)
    entry = LineageEntry(
        stage=stage,
        version=version,
        from_versions=from_versions,
        settings_snapshot=settings_snapshot,
        timestamp=now_iso(),
        status=status,
    )
    m.lineage.append(entry)
    write_manifest(word_dir, m)
    return m


def remove_version(word_dir: Path, stage: str, version: str) -> Manifest:
    """Remove a version from lineage and clear selection if it was selected."""
    m = read_manifest(word_dir)
    field = _STAGE_TO_SELECTED.get(stage, stage)
    if getattr(m.selected, field, None) == version:
        setattr(m.selected, field, None)
    m.lineage = [e for e in m.lineage if not (e.stage == stage and e.version == version)]
    write_manifest(word_dir, m)
    return m


def _stage_folder(stage: str) -> str:
    folder_map = {
        'concept': 'concept',
        'song': 'songs',
        'images': 'images',
        'video': 'videos',
        'assembly': 'final',
        'final': 'final',
        'bookend': 'bookend',
    }
    return folder_map.get(stage, stage)
