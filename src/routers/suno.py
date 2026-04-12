from __future__ import annotations

import logging
import os

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import state
from ..suno import generate_song as suno_generate_song

logger = logging.getLogger(__name__)

router = APIRouter()


class SunoGenerateRequest(BaseModel):
    word_slug: str
    deck_id: str
    user_id: str


@router.post("/api/suno/generate")
async def suno_generate(req: SunoGenerateRequest):
    word_dir = state.WORKSPACE_ROOT / f"cloud_{req.user_id}_{req.deck_id}" / req.word_slug
    result = await suno_generate_song(word_dir, req.deck_id, req.word_slug)
    if result["status"] == "error":
        raise HTTPException(status_code=500, detail=result["error"])

    audio_url = result.get("audio_url")
    audio_url_b = result.get("audio_url_b")
    if audio_url:
        try:
            from supabase import create_client as _sb_create

            sb_url = os.getenv("SUPABASE_URL", "")
            sb_key = os.getenv("SUPABASE_SERVICE_KEY", "")
            if sb_url and sb_key:
                _sb = _sb_create(sb_url, sb_key)
                prefix = f"{req.user_id}/{req.deck_id}/{req.word_slug}"
                perm_update: dict[str, str] = {}

                async with httpx.AsyncClient(timeout=60.0) as dl:
                    resp_a = await dl.get(audio_url)
                    resp_a.raise_for_status()
                _sb.storage.from_("audio").upload(
                    f"{prefix}/suno_a.mp3", resp_a.content,
                    file_options={"content-type": "audio/mpeg", "upsert": "true"},
                )
                storage_url_a = _sb.storage.from_("audio").get_public_url(f"{prefix}/suno_a.mp3")
                perm_update["suno_storage_url"] = storage_url_a
                result["storage_url"] = storage_url_a

                if audio_url_b:
                    async with httpx.AsyncClient(timeout=60.0) as dl:
                        resp_b = await dl.get(audio_url_b)
                        resp_b.raise_for_status()
                    _sb.storage.from_("audio").upload(
                        f"{prefix}/suno_b.mp3", resp_b.content,
                        file_options={"content-type": "audio/mpeg", "upsert": "true"},
                    )
                    storage_url_b = _sb.storage.from_("audio").get_public_url(f"{prefix}/suno_b.mp3")
                    perm_update["suno_storage_url_b"] = storage_url_b
                    result["storage_url_b"] = storage_url_b

                _sb.table("words").update(perm_update) \
                    .eq("deck_id", req.deck_id).eq("word_slug", req.word_slug).execute()
                logger.info("[Suno] Admin generate: uploaded permanent audio for %s", req.word_slug)
        except Exception as _upload_err:
            logger.warning("[Suno] Admin generate: storage upload failed (CDN URL preserved): %s", _upload_err)

    return result
