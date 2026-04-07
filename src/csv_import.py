"""CSV parsing and word registration."""

from __future__ import annotations
import csv
import io
import logging
import re
from collections import Counter
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

from .slugify import slugify, language_to_code
from .workspace import create_word_folder, list_word_dirs, write_workspace_meta, meta_path
from .manifest import create_manifest, read_manifest, manifest_path, now_iso
from .settings import init_defaults_if_missing
from .models import WorkspaceMeta


# Column name aliases: canonical_name -> set of accepted aliases
COLUMN_ALIASES = {
    'word': {'word', 'headword'},
    'translation': {'translation', 'definition'},
    'language': {'language'},
}

ENRICHMENT_COLUMNS = {'pos', 'ipa', 'example', 'example_gloss', 'synonyms', 'etymology', 'mnemonic', 'tags'}


@dataclass
class ImportResult:
    imported: list[str]
    skipped: list[str]
    errors: list[str]
    total: int
    needs_language: bool = False


def _resolve_aliases(fieldnames: list[str]) -> dict[str, str]:
    """Map CSV column names to canonical names using aliases.

    Returns a dict of {csv_column_name: canonical_name} for matched columns.
    """
    mapping = {}
    for canonical, aliases in COLUMN_ALIASES.items():
        for fn in fieldnames:
            if fn in aliases:
                mapping[fn] = canonical
                break
    return mapping


def import_csv(
    workspace_path: Path,
    csv_content: str,
    batch_name: str | None = None,
    source_filename: str = "import.csv",
    fallback_language: str | None = None,
) -> ImportResult:
    """
    Parse a CSV, create word folders, write manifests.
    Skips words that already exist.

    If the CSV lacks a 'language' column, fallback_language is used.
    If neither exists, returns needs_language=True so the UI can prompt.
    """
    workspace_path.mkdir(parents=True, exist_ok=True)
    init_defaults_if_missing(workspace_path)

    reader = csv.DictReader(io.StringIO(csv_content))
    if reader.fieldnames is None:
        return ImportResult([], [], ["CSV has no headers"], 0)

    # Normalize fieldnames to lowercase stripped
    fieldnames = [f.strip().lower() for f in reader.fieldnames]

    # Resolve column aliases
    alias_map = _resolve_aliases(fieldnames)
    has_word = 'word' in alias_map.values()
    has_translation = 'translation' in alias_map.values()
    has_language = 'language' in alias_map.values()

    # Check required columns (word + translation are always required)
    missing = []
    if not has_word:
        missing.append('word (or headword)')
    if not has_translation:
        missing.append('translation (or definition)')
    if missing:
        return ImportResult([], [], [f"Missing required columns: {', '.join(missing)}"], 0)

    # If no language column and no fallback, signal the UI to prompt
    if not has_language and not fallback_language:
        return ImportResult([], [], [], 0, needs_language=True)

    imported = []
    skipped = []
    errors = []
    languages_seen = set()
    rows = list(reader)

    for row in rows:
        # Normalize keys
        norm = {k.strip().lower(): (v.strip() if isinstance(v, str) else v)
                for k, v in row.items() if k}

        # Extract canonical fields using alias mapping
        word = ''
        translation = ''
        language = fallback_language or ''

        for csv_col, canonical in alias_map.items():
            val = norm.get(csv_col, '').strip()
            if canonical == 'word':
                word = val
            elif canonical == 'translation':
                translation = val
            elif canonical == 'language':
                language = val

        if not word or not translation or not language:
            errors.append(f"Row missing required data: {norm}")
            continue

        # Normalize whitespace: collapse NBSP/tabs/double-space to single space
        word = re.sub(r'\s+', ' ', word.strip())

        # Enforce 50-char cap (matches HTTP add_word and slug max_length)
        if len(word) > 50:
            errors.append(f"Word exceeds 50-char limit (got {len(word)}): {word[:30]}...")
            continue

        word_slug = slugify(word)
        language_code = language_to_code(language)
        languages_seen.add(language)

        word_dir = workspace_path / word_slug

        # Skip if already exists
        if manifest_path(word_dir).exists():
            skipped.append(word_slug)
            continue

        # Build enrichment data from non-canonical columns
        enrichment = {}
        canonical_csv_cols = set(alias_map.keys())
        for col in fieldnames:
            if col in canonical_csv_cols:
                continue
            enrichment[col] = norm.get(col, '')

        try:
            input_type = "phrase" if " " in word else "word"
            create_word_folder(workspace_path, word_slug)
            create_manifest(
                word_dir=word_dir,
                word_original=word,
                word_slug=word_slug,
                translation=translation,
                language=language,
                language_code=language_code,
                enrichment_data=enrichment if enrichment else None,
                input_type=input_type,
            )
            imported.append(word_slug)
        except Exception as e:
            errors.append(f"Failed to import '{word}': {e}")

    # Write/update workspace-meta.json
    _update_workspace_meta(workspace_path, source_filename, batch_name, languages_seen)

    return ImportResult(
        imported=imported,
        skipped=skipped,
        errors=errors,
        total=len(rows),
    )


def _update_workspace_meta(
    workspace_path: Path,
    source_csv: str,
    batch_name: str | None,
    languages: set[str],
) -> None:
    existing = None
    p = meta_path(workspace_path)
    if p.exists():
        import json
        with open(p, 'r', encoding='utf-8') as f:
            try:
                existing = WorkspaceMeta(**json.load(f))
            except Exception:
                pass

    word_count = len(list_word_dirs(workspace_path))

    all_languages = set(languages)
    if existing:
        all_languages.update(existing.languages)

    # Detect primary language from all manifests
    lang_counter: Counter[str] = Counter()
    for wd in list_word_dirs(workspace_path):
        try:
            m = read_manifest(wd)
            if m.language:
                lang_counter[m.language] += 1
        except Exception:
            pass
    primary_language = lang_counter.most_common(1)[0][0] if lang_counter else None

    meta = WorkspaceMeta(
        name=batch_name or (existing.name if existing else workspace_path.name),
        created_at=existing.created_at if existing else now_iso(),
        source_csv=source_csv,
        word_count=word_count,
        languages=sorted(all_languages),
        language=primary_language,
        workspace_version="1.0",
    )
    write_workspace_meta(workspace_path, meta)
