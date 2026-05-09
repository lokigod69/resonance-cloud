"""Pronunciation TTS cache for card target headwords."""

from __future__ import annotations

import asyncio
from collections.abc import Awaitable, Callable
from datetime import datetime, timezone
import hashlib
import json
import re
from typing import Any

import httpx

from cloud_engines.bookend_engine.config import get_api_key
from cloud_engines.bookend_engine.tts import to_elevenlabs_lang
from src.services.events import logged_api_call

ProviderGenerate = Callable[..., bytes | Awaitable[bytes]]

PROVIDER = "elevenlabs"
BUCKET = "tts-pronunciations"
CONTENT_TYPE = "audio/mpeg"

SMART_PUNCT_TRANSLATION = str.maketrans(
    {
        "\u2018": "'",
        "\u2019": "'",
        "\u201a": "'",
        "\u201b": "'",
        "\u2032": "'",
        "\u201c": '"',
        "\u201d": '"',
        "\u201e": '"',
        "\u201f": '"',
        "\u2033": '"',
        "\u2010": "-",
        "\u2011": "-",
        "\u2012": "-",
        "\u2013": "-",
        "\u2014": "-",
        "\u2015": "-",
        "\u2212": "-",
        "\u00a0": " ",
        "\u202f": " ",
    }
)


def normalize_spoken_text(text: str) -> str:
    """Normalize learner-facing headword text before TTS and hashing."""
    return re.sub(r"\s+", " ", str(text or "").translate(SMART_PUNCT_TRANSLATION)).strip()


def pre_hash_normalize(text: str) -> str:
    """Canonicalize punctuation and whitespace for stable cache hashes."""
    return normalize_spoken_text(text)


def spoken_text_hash(text: str) -> str:
    return hashlib.sha256(pre_hash_normalize(text).encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _asset_storage_path(
    *,
    language_code: str,
    provider_voice_id: str,
    text_hash: str,
) -> str:
    safe_language = re.sub(r"[^A-Za-z0-9_.-]+", "_", language_code or "und")
    safe_voice = re.sub(r"[^A-Za-z0-9_.-]+", "_", provider_voice_id or "voice")
    return f"{safe_language}/{safe_voice}/{text_hash}.mp3"


async def _maybe_await(value):
    if hasattr(value, "__await__"):
        return await value
    return value


async def _default_elevenlabs_generate(
    *,
    text: str,
    voice_id: str,
    model_id: str,
    language_code: str,
) -> bytes:
    api_key = get_api_key()
    body: dict[str, Any] = {
        "text": text,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.75,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        },
    }
    if language_code:
        body["language_code"] = to_elevenlabs_lang(language_code)

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": CONTENT_TYPE,
    }

    for retry_index in range(3):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}",
                    headers=headers,
                    json=body,
                )
        except httpx.TimeoutException:
            if retry_index < 2:
                await asyncio.sleep(2**retry_index)
                continue
            raise RuntimeError("ElevenLabs API timeout after retries")

        if response.status_code == 200:
            return response.content
        if response.status_code == 401:
            raise RuntimeError("ElevenLabs API key is invalid (401 Unauthorized)")
        if response.status_code == 429 or response.status_code >= 500:
            if retry_index < 2:
                await asyncio.sleep(2**retry_index)
                continue

        raise RuntimeError(f"ElevenLabs API error: {response.status_code} - {response.text[:200]}")

    raise RuntimeError("ElevenLabs API failed after retries")


async def get_or_create_tts_asset(
    sb,
    *,
    language_code: str,
    provider_voice_id: str,
    model_id: str,
    spoken_text: str,
    provider: str = PROVIDER,
    provider_generate: ProviderGenerate | None = None,
) -> dict[str, Any]:
    normalized_text = normalize_spoken_text(spoken_text)
    if not normalized_text:
        raise ValueError("spoken_text is required for pronunciation TTS")
    if not provider_voice_id:
        raise ValueError("provider_voice_id is required for pronunciation TTS")

    text_hash = spoken_text_hash(normalized_text)

    def _read_asset():
        return (
            sb.table("tts_assets")
            .select("*")
            .eq("language_code", language_code)
            .eq("provider", provider)
            .eq("provider_voice_id", provider_voice_id)
            .eq("spoken_text_hash", text_hash)
            .limit(1)
            .maybe_single()
            .execute()
        )

    cached = await asyncio.to_thread(_read_asset)
    if getattr(cached, "data", None):
        return cached.data

    generate = provider_generate or _default_elevenlabs_generate
    if provider_generate is not None:
        audio_bytes = await _maybe_await(
            generate(
                text=normalized_text,
                voice_id=provider_voice_id,
                model_id=model_id,
                language_code=language_code,
            )
        )
    else:
        with logged_api_call(
            stage="pending_image",
            sub_step="tts_pronunciation_provider",
            event_source="orchestrator",
            model_provider=provider,
            model_name=model_id,
            user_prompt=normalized_text,
            metadata={
                "language_code": language_code,
                "language_code_elevenlabs": to_elevenlabs_lang(language_code),
                "voice_id": provider_voice_id,
                "spoken_text_hash": text_hash,
            },
        ) as ev:
            audio_bytes = await _maybe_await(
                generate(
                    text=normalized_text,
                    voice_id=provider_voice_id,
                    model_id=model_id,
                    language_code=language_code,
                )
            )
            ev.record_response(
                request_body=json.dumps(
                    {
                        "text": normalized_text,
                        "model_id": model_id,
                        "voice_id": provider_voice_id,
                        "language_code": language_code,
                    },
                    ensure_ascii=False,
                ),
                response_body=json.dumps({"content_length": len(audio_bytes)}, ensure_ascii=False),
                characters_used=len(normalized_text),
            )

    storage_path = _asset_storage_path(
        language_code=language_code,
        provider_voice_id=provider_voice_id,
        text_hash=text_hash,
    )

    def _upload_and_insert():
        sb.storage.from_(BUCKET).upload(
            storage_path,
            audio_bytes,
            file_options={"content-type": CONTENT_TYPE, "upsert": "true"},
        )
        audio_url = sb.storage.from_(BUCKET).get_public_url(storage_path)
        inserted = (
            sb.table("tts_assets")
            .insert(
                {
                    "language_code": language_code,
                    "provider": provider,
                    "provider_voice_id": provider_voice_id,
                    "model_id": model_id,
                    "spoken_text": normalized_text,
                    "spoken_text_hash": text_hash,
                    "audio_url": audio_url,
                    "storage_bucket": BUCKET,
                    "storage_path": storage_path,
                    "content_type": CONTENT_TYPE,
                    "created_at": _now_iso(),
                }
            )
            .execute()
        )
        rows = getattr(inserted, "data", None) or []
        return rows[0] if rows else None

    asset = await asyncio.to_thread(_upload_and_insert)
    if not asset:
        raise RuntimeError("TTS asset insert returned no row")
    return asset


async def attach_tts_to_word(
    sb,
    *,
    word_id: str,
    asset: dict[str, Any],
    role: str = "target_headword",
) -> dict[str, Any]:
    asset_id = asset.get("id")
    if not asset_id:
        raise ValueError("asset.id is required to attach pronunciation TTS")

    def _read_existing_link():
        return (
            sb.table("word_tts_assets")
            .select("*")
            .eq("word_id", word_id)
            .eq("role", role)
            .limit(1)
            .maybe_single()
            .execute()
        )

    existing = await asyncio.to_thread(_read_existing_link)
    existing_data = getattr(existing, "data", None)
    if existing_data and existing_data.get("tts_asset_id") != asset_id:
        def _update_link():
            return (
                sb.table("word_tts_assets")
                .update({"tts_asset_id": asset_id})
                .eq("id", existing_data["id"])
                .execute()
            )

        await asyncio.to_thread(_update_link)
    elif not existing_data:
        def _insert_link():
            return (
                sb.table("word_tts_assets")
                .insert({"word_id": word_id, "tts_asset_id": asset_id, "role": role, "created_at": _now_iso()})
                .execute()
            )

        await asyncio.to_thread(_insert_link)

    generated_at = _now_iso()
    return {
        "tts_audio_url": asset.get("audio_url"),
        "tts_status": "ready",
        "tts_voice_id": asset.get("provider_voice_id"),
        "tts_generated_at": generated_at,
    }


async def generate_target_headword_for_card(
    sb,
    *,
    word_row: dict[str, Any],
    language_code: str,
    bookend_settings: dict[str, Any],
    provider_generate: ProviderGenerate | None = None,
) -> dict[str, Any]:
    voice_id = str(bookend_settings.get("voice_id") or "").strip()
    model_id = str(bookend_settings.get("model_id") or "eleven_flash_v2_5").strip()
    if not voice_id:
        raise ValueError("bookend.voice_id is required for pronunciation TTS")

    spoken_text = normalize_spoken_text(str(word_row.get("word") or ""))
    if not spoken_text:
        raise ValueError("target headword is required for pronunciation TTS")

    asset = await get_or_create_tts_asset(
        sb,
        language_code=language_code or "und",
        provider_voice_id=voice_id,
        model_id=model_id,
        spoken_text=spoken_text,
        provider_generate=provider_generate,
    )
    return await attach_tts_to_word(sb, word_id=str(word_row["id"]), asset=asset)
