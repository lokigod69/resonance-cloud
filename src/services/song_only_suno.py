"""Suno/KIE helpers for isolated song-only jobs."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any, Mapping

import httpx

from src.services.events import logged_api_call
from src.suno import (
    KIE_API_BASE,
    KIE_SUNO_COST_PER_SUBMIT,
    build_suno_payload,
    download_suno_audio,
    get_api_key,
)

log = logging.getLogger(__name__)


async def submit_song_only_task(
    concept_data: dict[str, Any],
    *,
    word_id: str | None = None,
    deck_id: str | None = None,
    user_id: str | None = None,
    job_id: str | None = None,
) -> str:
    """Submit KIE/Suno for a song-only job without word-row idempotency."""
    if not concept_data.get("lyrics"):
        raise RuntimeError("No lyrics found for song-only generation")

    payload = build_suno_payload(concept_data)
    api_key = get_api_key()

    with logged_api_call(
        stage="music_only",
        sub_step="submit",
        event_source="music_only_worker",
        word_id=word_id,
        deck_id=deck_id,
        user_id=user_id,
        job_id=job_id,
        model_provider="kie_ai",
        model_name="suno_v5_5",
        system_prompt=payload["style"],
        user_prompt=payload["prompt"],
        cost_usd=KIE_SUNO_COST_PER_SUBMIT,
        metadata={
            "model_variant": payload["model"],
            "lyrics_line_count": len(payload["prompt"].splitlines()),
            "music_caption": concept_data.get("music_caption", ""),
            "title": payload["title"],
            "vocal_gender": payload["vocalGender"],
        },
    ) as ev:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{KIE_API_BASE}/generate",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            response.raise_for_status()
            result = response.json()
        ev.record_response(
            response_body=json.dumps(result),
            request_body=json.dumps(payload),
            request_id=(result.get("data") or {}).get("taskId"),
        )

    if result.get("code") != 200:
        raise RuntimeError(f"Suno API returned code {result.get('code')}: {json.dumps(result)[:500]}")

    task_id = (result.get("data") or {}).get("taskId")
    if not task_id:
        raise RuntimeError(f"No taskId in response: {json.dumps(result)[:500]}")
    return str(task_id)


def _storage_prefix(job: Mapping[str, Any]) -> str:
    user_id = str(job["user_id"])
    deck_id = str(job.get("deck_id") or "no-deck")
    word_id = str(job["word_id"])
    job_id = str(job["id"])
    return f"{user_id}/{deck_id}/music_only/{word_id}/{job_id}"


def upload_suno_audio_to_storage(
    sb_client,
    *,
    job: Mapping[str, Any],
    path_a: Path,
    path_b: Path | None = None,
) -> dict[str, str | None]:
    """Upload raw Suno MP3s to the audio bucket and return public URLs.

    This intentionally does not update public.words; the terminal SQL RPC is
    responsible for idempotent DB finalization and credit state.
    """
    prefix = _storage_prefix(job)
    bucket = sb_client.storage.from_("audio")

    storage_key_a = f"{prefix}/suno_a.mp3"
    with open(path_a, "rb") as handle:
        bucket.upload(
            storage_key_a,
            handle.read(),
            file_options={"content-type": "audio/mpeg", "upsert": "true"},
        )
    url_a = bucket.get_public_url(storage_key_a)

    url_b = None
    if path_b and path_b.exists():
        storage_key_b = f"{prefix}/suno_b.mp3"
        with open(path_b, "rb") as handle:
            bucket.upload(
                storage_key_b,
                handle.read(),
                file_options={"content-type": "audio/mpeg", "upsert": "true"},
            )
        url_b = bucket.get_public_url(storage_key_b)

    log.info("music_only: uploaded audio job=%s prefix=%s", job.get("id"), prefix)
    return {
        "suno_storage_url": url_a,
        "suno_storage_url_b": url_b,
    }


async def download_and_upload_song_audio(
    sb_client,
    *,
    job: Mapping[str, Any],
    audio_url: str,
    audio_url_b: str | None,
    work_dir: Path,
) -> dict[str, str | None]:
    """Download provider audio A/B and upload permanent copies."""
    suno_dir = work_dir / "music_only" / str(job["id"]) / "suno"
    path_a = await download_suno_audio(audio_url, suno_dir / "suno_a.mp3")
    path_b = await download_suno_audio(audio_url_b, suno_dir / "suno_b.mp3") if audio_url_b else None
    return upload_suno_audio_to_storage(
        sb_client,
        job=job,
        path_a=path_a,
        path_b=path_b,
    )

