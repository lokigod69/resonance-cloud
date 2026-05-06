"""Best-effort display translation for generated song lyrics."""

from __future__ import annotations

from datetime import datetime, timezone
import json
import os
import re
from typing import Any

import httpx


OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_MODEL = "anthropic/claude-haiku-4-5-20251001"


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
    if _same_language(source_language or "", target_language or ""):
        return {"status": "skipped", "reason": "target_equals_base"}

    api_key = os.getenv("OPENROUTER_API_KEY", "")
    if not api_key:
        return {"status": "skipped", "reason": "no_api_key"}

    attempted_at = _now_iso()
    try:
        body = {
            "model": model,
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
        with httpx.Client(timeout=60.0) as client:
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
            "model": model,
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
