"""Concept generation for isolated song-only jobs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from cloud_engines.concept_engine.engine import generate_concept
from cloud_engines.concept_engine.models import (
    ConceptContent,
    ConceptMetadata,
    ConceptPayload,
    ConceptSettings,
    Enrichment,
)

from src.slugify import language_to_code
from src.storage import get_workspace_root


def _metadata(row: Mapping[str, Any] | None) -> dict[str, Any]:
    value = (row or {}).get("metadata")
    return value if isinstance(value, dict) else {}


def _first_text(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _external_music_caption(word: Mapping[str, Any]) -> str | None:
    metadata = _metadata(word)
    visual_card_plan = metadata.get("visual_card_plan")
    if not isinstance(visual_card_plan, dict):
        visual_card_plan = {}
    return _first_text(
        metadata.get("music_caption"),
        visual_card_plan.get("music_caption"),
        visual_card_plan.get("musicCaption"),
    )


def _target_language(
    job: Mapping[str, Any],
    word: Mapping[str, Any],
    deck: Mapping[str, Any] | None,
) -> str:
    job_metadata = _metadata(job)
    word_metadata = _metadata(word)
    deck = deck or {}
    return _first_text(
        job.get("target_language"),
        job_metadata.get("target_language"),
        word.get("language"),
        word_metadata.get("language"),
        deck.get("target_language"),
    ) or "English"


def _language_code(language: str, word: Mapping[str, Any], deck: Mapping[str, Any] | None) -> str:
    word_metadata = _metadata(word)
    deck_metadata = _metadata(deck)
    return _first_text(
        word.get("language_code"),
        word_metadata.get("language_code"),
        deck_metadata.get("language_code"),
    ) or language_to_code(language)


def _artifact_path(output_dir: Path, output_paths: list[str]) -> Path:
    if not output_paths:
        raise RuntimeError("Concept engine did not return an artifact path")
    return output_dir / output_paths[0]


def _concept_data_from_artifact(
    artifact: dict[str, Any],
    *,
    word: Mapping[str, Any],
    vocal_gender: str,
) -> dict[str, Any]:
    return {
        "word": artifact.get("word") or word.get("word") or "",
        "translation": artifact.get("translation") or word.get("translation") or "",
        "lyrics": artifact.get("suno_lyrics") or artifact.get("lyrics") or "",
        "music_caption": artifact.get("music_caption") or "",
        "language": artifact.get("language") or "",
        "vocal_gender": vocal_gender,
    }


def build_song_only_concept(
    *,
    job: Mapping[str, Any],
    word: Mapping[str, Any],
    deck: Mapping[str, Any] | None,
) -> dict[str, Any]:
    """Generate a concept artifact for one existing complete word/card.

    Returns a dictionary with the raw concept artifact and the compact
    concept_data shape expected by src.suno.build_suno_payload.
    """
    job_id = str(job["id"])
    word_text = _first_text(word.get("word")) or ""
    if not word_text:
        raise ValueError("word is required for song-only concept generation")

    language = _target_language(job, word, deck)
    language_code = _language_code(language, word, deck)
    vocal_gender = _first_text(job.get("vocal_gender")) or "female"
    genre = _first_text(job.get("genre")) or "auto"
    lyric_mode = _first_text(job.get("lyric_mode")) or "reliable"
    output_dir = get_workspace_root() / "music_only" / job_id / "concept"
    output_dir.mkdir(parents=True, exist_ok=True)

    payload = ConceptPayload(
        content=ConceptContent(
            word=word_text,
            translation=_first_text(word.get("translation")) or "",
            language=language,
            language_code=language_code,
            enrichment=Enrichment(
                mnemonic=_first_text(word.get("mnemonic"), word.get("article")) or "",
                pos=_first_text(word.get("pos")) or "",
            ),
            external_music_caption=_external_music_caption(word),
            input_type="phrase" if " " in word_text.strip() else "word",
        ),
        settings=ConceptSettings(
            vocal_gender=vocal_gender,
            lyric_mode=lyric_mode,
            genre=genre,
            caption_style="production",
        ),
        output_dir=str(output_dir),
        metadata=ConceptMetadata(
            word=word_text,
            language=language,
            timestamp=datetime.now(timezone.utc).isoformat(),
            word_id=str(word.get("id")) if word.get("id") else None,
            deck_id=str(job.get("deck_id")) if job.get("deck_id") else None,
            user_id=str(job.get("user_id")) if job.get("user_id") else None,
            job_id=job_id,
            attempt=int(job.get("attempts") or 0) or None,
        ),
    )

    result = generate_concept(payload)
    if result.status != "success":
        message = result.error.message if result.error else "Concept generation failed"
        raise RuntimeError(message)

    artifact_file = _artifact_path(output_dir, result.output_paths)
    artifact = json.loads(artifact_file.read_text(encoding="utf-8"))
    concept_data = _concept_data_from_artifact(
        artifact,
        word=word,
        vocal_gender=vocal_gender,
    )
    return {
        "concept_artifact": artifact,
        "concept_data": concept_data,
        "artifact_path": str(artifact_file),
        "output_dir": str(output_dir),
    }

