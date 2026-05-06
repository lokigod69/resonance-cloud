"""Best-effort display translation for generated song lyrics."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
import re
from typing import Any

import httpx


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "anthropic/claude-haiku-4.5"
DEFAULT_TIMEOUT_SECONDS = 12.0


def _env_flag(name: str, *, default: bool = False) -> bool:
    value = os.getenv(name)
    if value is None:
        return default
    return value.strip().casefold() in {"1", "true", "yes", "on"}


def _timeout_seconds() -> float:
    raw = os.getenv("LYRICS_TRANSLATION_TIMEOUT_SECONDS", "")
    if not raw.strip():
        return DEFAULT_TIMEOUT_SECONDS
    try:
        value = float(raw)
    except ValueError:
        return DEFAULT_TIMEOUT_SECONDS
    return max(1.0, value)


def _model_name(model: str | None) -> str:
    return os.getenv("OPENROUTER_LYRICS_TRANSLATION_MODEL", "").strip() or model or DEFAULT_MODEL


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _same_language(source_language: str, target_language: str) -> bool:
    return source_language.strip().casefold() == target_language.strip().casefold()


def _strip_markdown_fence(text: str) -> str:
    value = text.strip()
    match = re.fullmatch(r"```(?:json)?\s*(.*?)\s*```", value, flags=re.DOTALL | re.IGNORECASE)
    return match.group(1).strip() if match else value


def _section_tags(text: str) -> list[str]:
    return re.findall(r"^\s*(\[[^\]\n]+\])\s*$", text, flags=re.MULTILINE)


def _messages(
    *,
    lyrics: str,
    source_language: str,
    target_language: str,
    word: str,
    translation: str,
) -> list[dict[str, str]]:
    system_prompt = (
        "Translate song lyrics for display/read-along only. Preserve line order, "
        "blank lines, and section tags such as [Verse] or [Chorus] internally. "
        "Do not add commentary. Output valid JSON only with this shape: "
        '{"translation":"..."}'
    )
    user_prompt = (
        f"Source language: {source_language}\n"
        f"Target language: {target_language}\n"
        f"Vocabulary word: {word}\n"
        f"Vocabulary translation: {translation}\n\n"
        f"Lyrics:\n{lyrics}"
    )
    return [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ]


def translate_song_lyrics(
    lyrics: str,
    source_language: str,
    target_language: str,
    word: str,
    translation: str,
    model: str = DEFAULT_MODEL,
) -> dict[str, Any]:
    """Translate lyrics for display only.

    This function never talks to KIE/Suno and returns structured failure or
    skip status instead of raising for expected external/API failures.
    """
    source = lyrics or ""
    if not source.strip():
        return {"status": "skipped", "reason": "empty_source"}
    if not _env_flag("ENABLE_LYRICS_TRANSLATION", default=False):
        return {"status": "skipped", "reason": "translation_disabled"}
    if _same_language(source_language or "", target_language or ""):
        return {"status": "skipped", "reason": "target_equals_base"}

    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return {"status": "skipped", "reason": "no_api_key"}

    effective_model = _model_name(model)
    attempted_at = _now_iso()
    try:
        body = {
            "model": effective_model,
            "temperature": 0.3,
            "response_format": {"type": "json_object"},
            "max_tokens": 2000,
            "messages": _messages(
                lyrics=source,
                source_language=source_language,
                target_language=target_language,
                word=word,
                translation=translation,
            ),
        }
        with httpx.Client(timeout=_timeout_seconds()) as client:
            response = client.post(
                OPENROUTER_URL,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json=body,
            )
            response.raise_for_status()
            payload = response.json()

        content = ((payload.get("choices") or [{}])[0].get("message") or {}).get("content")
        parsed = json.loads(_strip_markdown_fence(str(content or "")))
        translated = str(parsed.get("translation") or "").strip()
        if not translated:
            return {
                "status": "failed",
                "language": target_language,
                "error": "empty_translation",
                "attempted_at": attempted_at,
            }

        warnings = []
        if len(_section_tags(source)) != len(_section_tags(translated)):
            warnings.append("section_tag_count_mismatch")

        result: dict[str, Any] = {
            "status": "ok",
            "language": target_language,
            "lyrics": translated,
            "model": effective_model,
            "translated_at": _now_iso(),
        }
        if warnings:
            result["warnings"] = warnings
        return result
    except Exception as exc:
        return {
            "status": "failed",
            "language": target_language,
            "error": str(exc),
            "attempted_at": attempted_at,
        }
