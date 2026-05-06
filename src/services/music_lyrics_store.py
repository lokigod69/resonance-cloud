"""Persistence helpers for canonical generated song lyrics."""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
from typing import Any

from src.services.lyrics_translation import translate_song_lyrics
from src.slugify import language_to_code

log = logging.getLogger(__name__)


MUSIC_LYRICS_COLUMNS = (
    "user_id",
    "word_id",
    "deck_id",
    "source_type",
    "source_job_id",
    "generation_job_id",
    "provider_task_id",
    "attempt_number",
    "language",
    "language_code",
    "lyric_mode",
    "genre",
    "music_caption",
    "lyrics",
    "suno_lyrics",
    "display_lyrics",
    "translation_language",
    "translation_language_code",
    "translated_lyrics",
    "translation_status",
    "translation_model",
    "translation_attempted_at",
    "translation_warnings",
    "translation_error",
    "synced_lyrics",
)


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _response_data(response: Any) -> Any:
    return getattr(response, "data", response)


def _rows(data: Any) -> list[dict[str, Any]]:
    if data is None:
        return []
    if isinstance(data, list):
        return [dict(row) for row in data]
    if isinstance(data, dict):
        return [dict(data)]
    return []


def _metadata(row: dict[str, Any] | None) -> dict[str, Any]:
    value = (row or {}).get("metadata")
    return value if isinstance(value, dict) else {}


def _settings_override(row: dict[str, Any] | None) -> dict[str, Any]:
    direct = (row or {}).get("settings_override")
    if isinstance(direct, dict):
        return direct
    nested = _metadata(row).get("settings_override")
    return nested if isinstance(nested, dict) else {}


def _first_text(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


def _select_maybe_single(sb, table: str, select: str, key: str, value: Any) -> dict[str, Any] | None:
    if not value:
        return None
    response = (
        sb.table(table)
        .select(select)
        .eq(key, value)
        .maybe_single()
        .execute()
    )
    data = _response_data(response)
    return dict(data) if isinstance(data, dict) else None


def latest_music_lyrics_for_word(sb, word_id: str) -> dict[str, Any] | None:
    response = (
        sb.table("music_lyrics")
        .select("*")
        .eq("word_id", word_id)
        .order("created_at", desc=True)
        .limit(1)
        .maybe_single()
        .execute()
    )
    data = _response_data(response)
    return dict(data) if isinstance(data, dict) else None


def _find_existing_row_id(
    sb,
    *,
    source_type: str,
    source_job_id: str | None,
    word_id: str,
    generation_job_id: str | None,
) -> str | None:
    query = sb.table("music_lyrics").select("id").eq("source_type", source_type)
    if source_type == "song_only" and source_job_id:
        query = query.eq("source_job_id", source_job_id)
    elif source_type == "video_pipeline" and generation_job_id:
        query = query.eq("word_id", word_id).eq("generation_job_id", generation_job_id)
    else:
        return None

    data = _response_data(
        query.order("created_at", desc=True).limit(1).maybe_single().execute()
    )
    return str(data.get("id")) if isinstance(data, dict) and data.get("id") else None


def upsert_music_lyrics_row(
    sb,
    *,
    user_id: str,
    word_id: str,
    deck_id: str | None,
    source_type: str,
    source_job_id: str | None = None,
    generation_job_id: str | None = None,
    provider_task_id: str | None = None,
    attempt_number: int | None = None,
    language: str,
    language_code: str | None = None,
    lyric_mode: str | None = None,
    genre: str | None = None,
    music_caption: str | None = None,
    lyrics: str,
    suno_lyrics: str | None = None,
    display_lyrics: str | None = None,
    translation_language: str | None = None,
    translation_language_code: str | None = None,
    translated_lyrics: str | None = None,
    translation_status: str | None = None,
    translation_model: str | None = None,
    translation_attempted_at: str | None = None,
    translation_warnings: Any = None,
    translation_error: str | None = None,
    synced_lyrics: Any = None,
    raise_on_error: bool = False,
) -> bool:
    """Insert/update one canonical lyrics row.

    By default errors are logged and swallowed so callers can keep generation
    moving even if the lyrics side-write fails.
    """
    try:
        if source_type not in {"song_only", "video_pipeline"}:
            raise ValueError(f"invalid source_type: {source_type}")
        if not str(lyrics or "").strip():
            log.info("music_lyrics: skipping empty lyrics source_type=%s word=%s", source_type, word_id)
            return False

        row = {
            "user_id": user_id,
            "word_id": word_id,
            "deck_id": deck_id,
            "source_type": source_type,
            "source_job_id": source_job_id,
            "generation_job_id": generation_job_id,
            "provider_task_id": provider_task_id,
            "attempt_number": int(attempt_number or 1),
            "language": language or "English",
            "language_code": language_code,
            "lyric_mode": lyric_mode,
            "genre": genre,
            "music_caption": music_caption,
            "lyrics": lyrics,
            "suno_lyrics": suno_lyrics,
            "display_lyrics": display_lyrics,
            "translation_language": translation_language,
            "translation_language_code": translation_language_code,
            "translated_lyrics": translated_lyrics,
            "translation_status": translation_status,
            "translation_model": translation_model,
            "translation_attempted_at": translation_attempted_at,
            "translation_warnings": translation_warnings,
            "translation_error": translation_error,
            "synced_lyrics": synced_lyrics,
        }

        existing_id = _find_existing_row_id(
            sb,
            source_type=source_type,
            source_job_id=source_job_id,
            word_id=word_id,
            generation_job_id=generation_job_id,
        )
        if existing_id:
            update = dict(row)
            update["updated_at"] = _now_iso()
            sb.table("music_lyrics").update(update).eq("id", existing_id).execute()
        else:
            sb.table("music_lyrics").insert(row).execute()
        return True
    except Exception:
        if raise_on_error:
            raise
        log.warning(
            "music_lyrics: failed to persist source_type=%s word=%s",
            source_type,
            word_id,
            exc_info=True,
        )
        return False


def translation_result_to_columns(
    result: dict[str, Any],
    *,
    target_language_code: str | None = None,
) -> dict[str, Any]:
    status = result.get("status")
    if status == "ok":
        return {
            "translation_status": "ok",
            "translation_language": result.get("language"),
            "translation_language_code": target_language_code,
            "translated_lyrics": result.get("lyrics"),
            "translation_model": result.get("model"),
            "translation_attempted_at": result.get("translated_at"),
            "translation_warnings": result.get("warnings"),
            "translation_error": None,
        }
    if status == "failed":
        return {
            "translation_status": "failed",
            "translation_language": result.get("language"),
            "translation_language_code": target_language_code,
            "translated_lyrics": None,
            "translation_model": result.get("model"),
            "translation_attempted_at": result.get("attempted_at") or _now_iso(),
            "translation_warnings": None,
            "translation_error": result.get("error"),
        }
    if status == "skipped":
        return {
            "translation_status": "skipped",
            "translation_language": None,
            "translation_language_code": target_language_code,
            "translated_lyrics": None,
            "translation_model": result.get("model"),
            "translation_attempted_at": None,
            "translation_warnings": None,
            "translation_error": result.get("reason"),
        }
    return {}


async def persist_video_pipeline_lyrics_best_effort(
    sb,
    *,
    word: dict[str, Any],
    concept_data: dict[str, Any],
    provider_task_id: str | None = None,
) -> bool:
    """Best-effort canonical lyrics write for the full video pipeline."""
    try:
        lyrics = _first_text(concept_data.get("lyrics"))
        if not lyrics:
            return False

        generation_job = await asyncio.to_thread(
            _select_maybe_single,
            sb,
            "generation_jobs",
            "id, target_language, settings_override",
            "id",
            word.get("generation_job_id"),
        )
        deck = await asyncio.to_thread(
            _select_maybe_single,
            sb,
            "decks",
            "id, target_language",
            "id",
            word.get("deck_id"),
        )
        profile = await asyncio.to_thread(
            _select_maybe_single,
            sb,
            "profiles",
            "base_language",
            "id",
            word.get("user_id"),
        )

        language = _first_text(
            concept_data.get("language"),
            (generation_job or {}).get("target_language"),
            (deck or {}).get("target_language"),
            word.get("language"),
            _metadata(word).get("language"),
        ) or "English"
        language_code = _first_text(
            concept_data.get("language_code"),
            word.get("language_code"),
            _metadata(word).get("language_code"),
        ) or language_to_code(language)
        settings_override = _settings_override(generation_job)
        base_language = _first_text(
            settings_override.get("base_language"),
            (profile or {}).get("base_language"),
        ) or "English"
        base_language_code = language_to_code(base_language)

        try:
            translation_result = await asyncio.to_thread(
                translate_song_lyrics,
                lyrics=lyrics,
                source_language=language,
                target_language=base_language,
                word=_first_text(concept_data.get("word"), word.get("word")) or "",
                translation=_first_text(concept_data.get("translation"), word.get("translation")) or "",
            )
            translation_columns = translation_result_to_columns(
                translation_result,
                target_language_code=base_language_code,
            )
        except Exception as exc:
            log.warning(
                "music_lyrics: video translation failed word=%s: %s",
                word.get("id"),
                exc,
                exc_info=True,
            )
            translation_columns = {
                "translation_status": "failed",
                "translation_language": base_language,
                "translation_language_code": base_language_code,
                "translation_error": str(exc),
                "translation_attempted_at": _now_iso(),
            }

        return await asyncio.to_thread(
            upsert_music_lyrics_row,
            sb,
            user_id=str(word.get("user_id")),
            word_id=str(word.get("id")),
            deck_id=str(word.get("deck_id")) if word.get("deck_id") else None,
            source_type="video_pipeline",
            source_job_id=None,
            generation_job_id=str(word.get("generation_job_id")) if word.get("generation_job_id") else None,
            provider_task_id=provider_task_id,
            attempt_number=int(word.get("total_stage_attempts") or word.get("stage_attempts") or 1),
            language=language,
            language_code=language_code,
            lyric_mode=_first_text(settings_override.get("lyric_mode")),
            genre=_first_text(settings_override.get("genre")),
            music_caption=_first_text(concept_data.get("music_caption")),
            lyrics=lyrics,
            suno_lyrics=lyrics,
            **translation_columns,
        )
    except Exception:
        log.warning(
            "music_lyrics: video persist failed word=%s",
            word.get("id"),
            exc_info=True,
        )
        return False
