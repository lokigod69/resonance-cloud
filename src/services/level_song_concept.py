"""Concept assembly for library level songs."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Mapping

from cloud_engines.concept_engine.caption import generate_caption
from cloud_engines.concept_engine.level_song import (
    LevelSongDepth,
    LevelSongEntry,
    generate_level_song_lyrics,
)
from cloud_engines.concept_engine.llm_client import OpenRouterClient
from cloud_engines.concept_engine.models import ConceptSettings

from src.slugify import language_to_code
from src.storage import get_workspace_root


LYRIC_MODE_TO_LEVEL_DEPTH: dict[str, LevelSongDepth] = {
    "reliable": "simple",
    "contextual": "phrase",
    "creative": "story",
    "dramatic": "long",
}


def _metadata(row: Mapping[str, Any] | None) -> dict[str, Any]:
    value = (row or {}).get("metadata")
    return value if isinstance(value, dict) else {}


def _first_text(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _level_depth(lyric_mode: str | None) -> LevelSongDepth:
    return LYRIC_MODE_TO_LEVEL_DEPTH.get((lyric_mode or "reliable").strip(), "simple")


def _word_list_entries(raw_word_list: Any) -> list[LevelSongEntry]:
    if not isinstance(raw_word_list, list):
        raise ValueError("level song word_list must be an array")

    entries: list[LevelSongEntry] = []
    for item in raw_word_list:
        if isinstance(item, str):
            target = item.strip()
            gloss = ""
        elif isinstance(item, Mapping):
            target = _first_text(item.get("target"), item.get("word"), item.get("term")) or ""
            gloss = _first_text(item.get("gloss"), item.get("translation"), item.get("meaning")) or ""
        else:
            target = ""
            gloss = ""

        if target:
            entries.append(LevelSongEntry(target=target, gloss=gloss))

    if not entries:
        raise ValueError("level song word_list requires at least one target")
    return entries


def _display_title(job: Mapping[str, Any]) -> str:
    metadata = _metadata(job)
    return _first_text(
        job.get("display_title"),
        metadata.get("display_title"),
        metadata.get("title"),
    ) or f"{job.get('category_slug') or 'Library'} Level {job.get('level_number') or ''}".strip()


def _target_language(job: Mapping[str, Any]) -> str:
    metadata = _metadata(job)
    return _first_text(
        job.get("target_language"),
        metadata.get("target_language"),
        metadata.get("language"),
    ) or "English"


def _caption_context(entries: list[LevelSongEntry]) -> str:
    lines = [
        f"{entry.target} = {entry.gloss}" if entry.gloss else entry.target
        for entry in entries
    ]
    return "Vocabulary level: " + "; ".join(lines)


def _artifact_path(output_dir: Path) -> Path:
    return output_dir / "level-song-concept.json"


def build_level_song_concept(*, job: Mapping[str, Any]) -> dict[str, Any]:
    job_id = str(job["id"])
    entries = _word_list_entries(job.get("word_list"))
    language = _target_language(job)
    language_code = _first_text(job.get("target_language_code"), _metadata(job).get("language_code")) or language_to_code(language)
    vocal_gender = _first_text(job.get("vocal_gender")) or "female"
    user_genre = _first_text(job.get("genre")) or "auto"
    lyric_mode = _first_text(job.get("lyric_mode")) or "reliable"
    depth = _level_depth(lyric_mode)
    title = _display_title(job)
    llm_client = OpenRouterClient()
    settings = ConceptSettings(
        vocal_gender=vocal_gender,
        lyric_mode=lyric_mode,
        genre=user_genre,
        caption_style="production",
    )
    identity = {
        "word_id": None,
        "deck_id": None,
        "user_id": str(job.get("user_id")) if job.get("user_id") else None,
        "job_id": job_id,
        "attempt": int(job.get("attempts") or 0) or None,
    }

    lyrics = generate_level_song_lyrics(
        entries=entries,
        language=language,
        language_code=language_code,
        depth=depth,
        llm_client=llm_client,
        llm_model=settings.llm_model,
    )
    caption = generate_caption(
        title,
        _caption_context(entries),
        language,
        settings,
        llm_client,
        identity=identity,
    )

    artifact = {
        "scope": "level",
        "word": title,
        "translation": _caption_context(entries),
        "language": language,
        "language_code": language_code,
        "lyrics": lyrics,
        "suno_lyrics": lyrics,
        "music_caption": caption.caption,
        "visual_hint": caption.visual_hint,
        "category_slug": job.get("category_slug"),
        "level_number": job.get("level_number"),
        "target_language": language,
        "word_list": [
            {"target": entry.target, "gloss": entry.gloss}
            for entry in entries
        ],
        "generation_info": {
            "lyric_mode": lyric_mode,
            "level_depth": depth,
            "genre_mode": "auto" if user_genre == "auto" else "manual",
            "llm_calls": 1 if depth == "simple" else 2,
            "lyrics_source": "template" if depth == "simple" else "llm",
            "caption_source": caption.source,
            "article_used": "",
            "created_at": datetime.now(timezone.utc).isoformat(),
        },
    }
    concept_data = {
        "word": title,
        "translation": artifact["translation"],
        "lyrics": lyrics,
        "music_caption": caption.caption,
        "language": language,
        "vocal_gender": vocal_gender,
    }

    output_dir = get_workspace_root() / "music_only" / job_id / "concept"
    output_dir.mkdir(parents=True, exist_ok=True)
    artifact_file = _artifact_path(output_dir)
    artifact_file.write_text(json.dumps(artifact, indent=2), encoding="utf-8")

    return {
        "concept_artifact": artifact,
        "concept_data": concept_data,
        "artifact_path": str(artifact_file),
        "output_dir": str(output_dir),
    }
