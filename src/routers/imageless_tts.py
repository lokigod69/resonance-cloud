from __future__ import annotations

import asyncio
import os
import re
from typing import Any
from uuid import UUID

from fastapi import APIRouter, HTTPException, Request
from supabase import ClientOptions, create_client

from cloud_engines.bookend_engine.tts import to_elevenlabs_lang
from src.services import pronunciation_tts
from src.settings import DEFAULT_SETTINGS

router = APIRouter()

MAX_WORD_IDS = 100
TTS_CONCURRENCY = 5


def _bearer_token(request: Request) -> str:
    auth_header = request.headers.get("Authorization", "")
    match = re.match(r"^Bearer\s+(.+)$", auth_header, flags=re.IGNORECASE)
    token = match.group(1).strip() if match else ""
    if not token:
        raise HTTPException(status_code=401, detail="Missing authentication")
    return token


def _validate_body(payload: Any) -> list[str]:
    if not isinstance(payload, dict):
        raise HTTPException(status_code=400, detail="Request body must be an object")
    raw_word_ids = payload.get("word_ids")
    if not isinstance(raw_word_ids, list):
        raise HTTPException(status_code=400, detail="word_ids must be an array")
    if len(raw_word_ids) == 0:
        raise HTTPException(status_code=400, detail="word_ids must contain at least one item")
    if len(raw_word_ids) > MAX_WORD_IDS:
        raise HTTPException(status_code=400, detail=f"word_ids must contain at most {MAX_WORD_IDS} items")

    normalized: list[str] = []
    for item in raw_word_ids:
        try:
            normalized.append(str(UUID(str(item))))
        except (TypeError, ValueError, AttributeError):
            raise HTTPException(status_code=400, detail="word_ids must contain only UUID strings")
    return normalized


def _supabase_url() -> str:
    url = os.getenv("SUPABASE_URL", "") or os.getenv("VITE_SUPABASE_URL", "")
    if not url:
        raise HTTPException(status_code=500, detail="Supabase URL is not configured")
    return url


def _anon_key() -> str:
    key = os.getenv("SUPABASE_ANON_KEY", "") or os.getenv("VITE_SUPABASE_ANON_KEY", "")
    if not key:
        raise HTTPException(status_code=500, detail="Supabase anon key is not configured")
    return key


def _service_key() -> str:
    key = (
        os.getenv("SUPABASE_SERVICE_KEY", "")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        or os.getenv("SUPABASE_KEY", "")
    )
    if not key:
        raise HTTPException(status_code=500, detail="Supabase service key is not configured")
    return key


def _create_user_client(token: str):
    return create_client(
        _supabase_url(),
        _anon_key(),
        ClientOptions(
            headers={"Authorization": f"Bearer {token}"},
            auto_refresh_token=False,
            persist_session=False,
        ),
    )


def _create_service_client():
    return create_client(
        _supabase_url(),
        _service_key(),
        ClientOptions(auto_refresh_token=False, persist_session=False),
    )


def _unique_in_order(values: list[str]) -> list[str]:
    seen: set[str] = set()
    unique: list[str] = []
    for value in values:
        if value in seen:
            continue
        seen.add(value)
        unique.append(value)
    return unique


def _read_owned_words(user_client, word_ids: list[str]) -> list[dict[str, Any]]:
    response = (
        user_client.table("words")
        .select("id,deck_id,user_id,word,decks!inner(id,deck_type,target_language)")
        .in_("id", word_ids)
        .execute()
    )
    rows = getattr(response, "data", None)
    if not isinstance(rows, list):
        raise HTTPException(status_code=403, detail="One or more words are not owned by user")
    return rows


def _deck_from_word(row: dict[str, Any]) -> dict[str, Any]:
    deck = row.get("decks")
    if isinstance(deck, list):
        deck = deck[0] if deck else {}
    return deck if isinstance(deck, dict) else {}


def _voice_language_candidates(language_code: str) -> list[str]:
    candidates: list[str] = []
    for candidate in (
        language_code,
        to_elevenlabs_lang(language_code),
        language_code.split("-", 1)[0],
    ):
        cleaned = str(candidate or "").strip()
        if cleaned and cleaned not in candidates:
            candidates.append(cleaned)
    return candidates


def _resolve_bookend_settings(service_client, language_code: str) -> dict[str, Any]:
    settings = dict(DEFAULT_SETTINGS.get("bookend", {}))
    for candidate in _voice_language_candidates(language_code):
        response = (
            service_client.table("voices")
            .select("voice_id")
            .eq("language_code", candidate)
            .order("created_at")
            .limit(1)
            .execute()
        )
        rows = getattr(response, "data", None) or []
        if rows and rows[0].get("voice_id"):
            settings["voice_id"] = rows[0]["voice_id"]
            return settings

    fallback = (
        service_client.table("voices")
        .select("voice_id")
        .order("created_at")
        .limit(1)
        .execute()
    )
    fallback_rows = getattr(fallback, "data", None) or []
    if fallback_rows and fallback_rows[0].get("voice_id"):
        settings["voice_id"] = fallback_rows[0]["voice_id"]
    return settings


async def _generate_one(row: dict[str, Any]) -> dict[str, Any]:
    word_id = str(row.get("id") or "")
    deck = _deck_from_word(row)
    if deck.get("deck_type") != "card_text":
        return {
            "word_id": word_id,
            "status": "failed",
            "error": "Word is not in a card_text deck",
        }

    language_code = str(deck.get("target_language") or "und")
    service_client = _create_service_client()
    bookend_settings = await asyncio.to_thread(
        _resolve_bookend_settings,
        service_client,
        language_code,
    )

    word_row = dict(row)
    word_row["target_language"] = language_code

    try:
        updates = await pronunciation_tts.generate_target_headword_for_card(
            service_client,
            word_row=word_row,
            language_code=language_code,
            bookend_settings=bookend_settings,
        )

        def _update_word():
            return (
                service_client.table("words")
                .update(updates)
                .eq("id", word_id)
                .execute()
            )

        await asyncio.to_thread(_update_word)
        return {
            "word_id": word_id,
            "status": "ready",
            "tts_audio_url": updates.get("tts_audio_url"),
        }
    except Exception as exc:
        return {
            "word_id": word_id,
            "status": "failed",
            "error": str(exc),
        }


@router.post("/api/generate-imageless-tts")
async def generate_imageless_tts(request: Request):
    token = _bearer_token(request)
    try:
        payload = await request.json()
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid JSON body")

    word_ids = _unique_in_order(_validate_body(payload))
    user_client = _create_user_client(token)

    try:
        rows = await asyncio.to_thread(_read_owned_words, user_client, word_ids)
    except HTTPException:
        raise
    except Exception:
        raise HTTPException(status_code=401, detail="Invalid session")

    if len(rows) != len(word_ids):
        raise HTTPException(status_code=403, detail="One or more words are not owned by user")

    rows_by_id = {str(row["id"]): row for row in rows}
    ordered_rows = [rows_by_id[word_id] for word_id in word_ids]
    semaphore = asyncio.Semaphore(TTS_CONCURRENCY)

    async def _guarded(row: dict[str, Any]) -> dict[str, Any]:
        async with semaphore:
            return await _generate_one(row)

    results = await asyncio.gather(*(_guarded(row) for row in ordered_rows))
    generated = sum(1 for result in results if result.get("status") == "ready")
    failed = len(results) - generated
    return {
        "generated": generated,
        "failed": failed,
        "results": results,
    }
