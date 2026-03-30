"""
Suno API integration via kie.ai.
Generates full-length songs from word concept data.
"""

from __future__ import annotations

import json
import logging
import os
import asyncio
from pathlib import Path

import httpx

logger = logging.getLogger(__name__)

KIE_API_BASE = "https://api.kie.ai/api/v1"
POLL_INTERVAL = 10      # seconds between status checks
MAX_POLL_TIME = 180     # max seconds to wait (3 minutes)


def get_api_key() -> str:
    key = os.getenv("KIE_API_KEY", "")
    if not key:
        raise ValueError("KIE_API_KEY not set in environment")
    return key


def read_concept_data(workspace_root: str, user_id: str, deck_id: str, word_slug: str) -> dict:
    """
    Read concept data from local manifest and concept artifact files.
    Returns dict with: lyrics, music_caption, language, vocal_gender, word, translation.
    """
    word_dir = Path(workspace_root) / f"cloud_{user_id}_{deck_id}" / word_slug

    # Read manifest
    manifest_path = word_dir / "manifest.json"
    if not manifest_path.exists():
        raise FileNotFoundError(f"Manifest not found: {manifest_path}")

    with open(manifest_path, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    word = manifest.get("word_original", manifest.get("word", ""))
    translation = manifest.get("translation", "")
    language = manifest.get("language", "")

    # vocal_gender from concept settings (matches pipeline.py pattern)
    concept_settings = manifest.get("settings", {}).get("concept", {})
    vocal_gender = concept_settings.get("vocal_gender", "female")

    # Find selected concept artifact
    selected = manifest.get("selected", {})
    concept_filename = selected.get("concept")

    lyrics = ""
    music_caption = ""

    if concept_filename:
        concept_path = word_dir / "concept" / concept_filename
        if concept_path.exists():
            try:
                with open(concept_path, "r", encoding="utf-8") as f:
                    concept = json.load(f)
                lyrics = concept.get("suno_lyrics") or concept.get("lyrics", "")
                music_caption = concept.get("music_caption", "")
            except (json.JSONDecodeError, IOError) as e:
                logger.warning("Failed to read concept file %s: %s", concept_path, e)

    # Fallback: scan concept directory for any JSON with lyrics
    if not lyrics:
        concept_dir = word_dir / "concept"
        if concept_dir.exists():
            for json_file in sorted(concept_dir.glob("*.json"), reverse=True):
                try:
                    with open(json_file, "r", encoding="utf-8") as f:
                        concept = json.load(f)
                    if concept.get("suno_lyrics") or concept.get("lyrics"):
                        lyrics = concept.get("suno_lyrics") or concept.get("lyrics", "")
                        music_caption = concept.get("music_caption", music_caption)
                        break
                except (json.JSONDecodeError, IOError):
                    continue

    return {
        "word": word,
        "translation": translation,
        "lyrics": lyrics,
        "music_caption": music_caption,
        "language": language,
        "vocal_gender": vocal_gender,
    }


def build_suno_payload(concept_data: dict) -> dict:
    """Map concept data to kie.ai Suno API request payload."""
    gender = concept_data["vocal_gender"]
    suno_gender = "m" if gender.lower().startswith("m") else "f"

    style = concept_data["music_caption"] or "Pop"
    title = concept_data["word"]
    lyrics = concept_data["lyrics"] or concept_data["word"]

    return {
        "prompt": lyrics,
        "customMode": True,
        "instrumental": False,
        "model": "V5_5",
        "style": style[:1000],
        "title": title[:80],
        "vocalGender": suno_gender,
        "callBackUrl": "https://resonanz.pro/api/suno/callback",
    }


async def generate_song(
    workspace_root: str, user_id: str, deck_id: str, word_slug: str
) -> dict:
    """
    Full flow: read concept data → call Suno API → poll → return audio URL.
    Returns: { audio_url, task_id, status, error }
    """
    api_key = get_api_key()

    # Step 1: Read concept data
    try:
        concept_data = read_concept_data(workspace_root, user_id, deck_id, word_slug)
    except FileNotFoundError as e:
        return {"audio_url": None, "task_id": None, "status": "error", "error": str(e)}

    if not concept_data["lyrics"]:
        return {
            "audio_url": None, "task_id": None, "status": "error",
            "error": "No lyrics found in concept data. Generate the word video first.",
        }

    logger.info(
        "Generating Suno song for '%s' — style: %s",
        concept_data["word"],
        concept_data["music_caption"][:60] if concept_data["music_caption"] else "(none)",
    )

    # Step 2: Call Suno API
    payload = build_suno_payload(concept_data)

    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            resp = await client.post(
                f"{KIE_API_BASE}/generate",
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
            resp.raise_for_status()
            result = resp.json()
        except httpx.HTTPError as e:
            logger.error("Suno API call failed: %s", e)
            return {"audio_url": None, "task_id": None, "status": "error", "error": f"Suno API error: {e}"}

        logger.info("SUNO GENERATE RESPONSE: %s", json.dumps(result)[:1000])

        if result.get("code") != 200:
            return {
                "audio_url": None, "task_id": None, "status": "error",
                "error": f"Suno API returned code {result.get('code')}: {json.dumps(result)[:500]}",
            }

        task_id = result.get("data", {}).get("taskId")
        if not task_id:
            return {
                "audio_url": None, "task_id": None, "status": "error",
                "error": f"No taskId in response: {json.dumps(result)[:500]}",
            }

        logger.info("Suno task created: %s", task_id)

        # Step 3: Poll for completion
        elapsed = 0
        copyright_retried = False
        while elapsed < MAX_POLL_TIME:
            await asyncio.sleep(POLL_INTERVAL)
            elapsed += POLL_INTERVAL

            try:
                status_resp = await client.get(
                    f"{KIE_API_BASE}/generate/record-info",
                    params={"taskId": task_id},
                    headers={"Authorization": f"Bearer {api_key}"},
                )
                status_resp.raise_for_status()
                status_data = status_resp.json()
            except httpx.HTTPError as e:
                logger.warning("Poll failed (elapsed %ds): %s", elapsed, e)
                continue

            logger.info("SUNO POLL RESPONSE (elapsed %ds): %s", elapsed, json.dumps(status_data)[:1000])

            data = status_data.get("data", {})
            task_status = data.get("status", "")

            if task_status == "SUCCESS":
                # Extract audio URL from response.sunoData[0].audioUrl
                suno_data = data.get("response", {}).get("sunoData", [])
                if suno_data and isinstance(suno_data, list) and len(suno_data) > 0:
                    audio_url = suno_data[0].get("audioUrl")
                    if audio_url:
                        logger.info("Suno song ready: %s", audio_url)
                        return {"audio_url": audio_url, "task_id": task_id, "status": "success", "error": None}
                return {
                    "audio_url": None, "task_id": task_id, "status": "error",
                    "error": f"SUCCESS but no audioUrl in response: {json.dumps(status_data)[:500]}",
                }

            if task_status == "fail":
                error_msg = data.get("errorMessage", "Unknown error")
                if "copyright" in error_msg.lower() and not copyright_retried:
                    copyright_retried = True
                    logger.warning(
                        "Copyright rejection for '%s', retrying with bare word prompt",
                        concept_data["word"],
                    )
                    simplified_payload = {**payload, "prompt": concept_data["word"]}
                    try:
                        retry_resp = await client.post(
                            f"{KIE_API_BASE}/generate",
                            json=simplified_payload,
                            headers={
                                "Authorization": f"Bearer {api_key}",
                                "Content-Type": "application/json",
                            },
                        )
                        retry_resp.raise_for_status()
                        retry_result = retry_resp.json()
                    except httpx.HTTPError as retry_err:
                        logger.warning("Copyright retry API call failed: %s", retry_err)
                    else:
                        if retry_result.get("code") == 200:
                            new_task_id = retry_result.get("data", {}).get("taskId")
                            if new_task_id:
                                task_id = new_task_id
                                elapsed = 0
                                logger.info("Copyright retry task created: %s", task_id)
                                continue
                return {
                    "audio_url": None, "task_id": task_id, "status": "error",
                    "error": f"Suno generation failed: {error_msg}",
                }

            # "waiting", "queuing", "generating" — keep polling
            logger.info("Suno task %s status: %s (elapsed %ds)", task_id, task_status, elapsed)

        # Timeout
        return {
            "audio_url": None, "task_id": task_id, "status": "error",
            "error": f"Timed out after {MAX_POLL_TIME}s waiting for Suno generation",
        }


    return None
