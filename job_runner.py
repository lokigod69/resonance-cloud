"""
Resonance Cloud Job Runner

Polls Supabase for approved generation jobs and processes them
through the local pipeline. Runs as a separate process from the
orchestrator HTTP server.

CRITICAL: Never import from src.app — only from src.pipeline,
src.settings, src.manifest, src.workspace, src.slugify, src.dispatcher,
src.models.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import subprocess
import sys
import tempfile
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load env BEFORE importing src modules so engine URLs are available
load_dotenv()

from src.pipeline import run_stage, STAGE_ORDER
from src.settings import save_defaults, load_defaults, DEFAULT_SETTINGS
from src.manifest import create_manifest, read_manifest
from src.workspace import create_word_folder, get_word_dir
from src.slugify import slugify, language_to_code
from src.dispatcher import check_all_engines
from src.models import Enrichment

import httpx
from supabase import create_client, Client

# ─── Configuration ────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceWorkspace/content"))
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
POLL_INTERVAL = int(os.getenv("JOB_RUNNER_POLL_INTERVAL", "30"))
MAX_RETRIES = int(os.getenv("JOB_RUNNER_MAX_RETRIES", "2"))
CLEANUP_WORKSPACES = os.getenv("JOB_RUNNER_CLEANUP", "false").lower() == "true"

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
log = logging.getLogger("job_runner")

# ─── Supabase Client ──────────────────────────────────────────────────────────

def get_supabase() -> Client:
    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_KEY must be set in .env")
        sys.exit(1)
    return create_client(SUPABASE_URL, SUPABASE_KEY)


sb: Client = get_supabase()

# ─── Enrichment ───────────────────────────────────────────────────────────────

ENRICHMENT_SYSTEM_PROMPT = """You are a language learning assistant. Given a list of vocabulary words,
produce enrichment data for each word. The user is learning {target_language} and speaks {base_language}.

For each word, provide:
- word_target: the word in {target_language} (correct it if the user typed it in {base_language})
- translation: translation into {base_language}
- mnemonic: a memorable connection between the word and its meaning (1–2 sentences)
- etymology: word origin and root connections (1 sentence)
- pos: part of speech (noun, verb, adjective, adverb, etc.)
- article: grammatical article if applicable (e.g., "der", "die", "das" for German; "le", "la" for French). null if the language has no articles or it doesn't apply.

Handle both directions: if the user typed a {base_language} word, figure out the {target_language} equivalent.

Respond with a JSON array. Each element must have exactly these keys:
{{"input_word": "...", "word_target": "...", "translation": "...", "mnemonic": "...", "etymology": "...", "pos": "...", "article": "..."}}

No extra commentary — only the JSON array."""


async def run_enrichment(
    words: list[dict[str, Any]],
    target_language: str,
    base_language: str,
    llm_model: str = "deepseek/deepseek-v3.2",
) -> list[dict[str, Any]]:
    """Batch-enrich all words in a deck via OpenRouter LLM call."""
    if not OPENROUTER_API_KEY:
        log.warning("OPENROUTER_API_KEY not set — skipping enrichment")
        return [{"input_word": w["word"], "word_target": w["word"],
                 "translation": "", "mnemonic": "", "etymology": "",
                 "pos": "", "article": None} for w in words]

    word_list = ", ".join(w["word"] for w in words)
    system_prompt = ENRICHMENT_SYSTEM_PROMPT.format(
        target_language=target_language, base_language=base_language
    )
    user_prompt = f"Enrich these {target_language} vocabulary words: {word_list}"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": llm_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
                "temperature": 0.3,
            },
        )
        resp.raise_for_status()
        data = resp.json()

    content = data["choices"][0]["message"]["content"]
    # Strip markdown code fences if present
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        # Remove first and last fence lines
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines)

    try:
        enriched = json.loads(content)
    except json.JSONDecodeError:
        log.error("Failed to parse enrichment LLM response: %s", content[:500])
        return [{"input_word": w["word"], "word_target": w["word"],
                 "translation": "", "mnemonic": "", "etymology": "",
                 "pos": "", "article": None} for w in words]

    # Build lookup by input_word for matching back to word records
    return enriched


# ─── Settings Merge ───────────────────────────────────────────────────────────

def merge_settings(
    profile_settings: dict[str, Any],
    art_style: str | None,
    movie_override: str | None,
) -> dict[str, dict[str, Any]]:
    """
    Three-layer merge:
      Layer 1: Active language profile (base)
      Layer 2: User preferences (art_style, movie_override)
    Result is written once as settings-defaults.json.
    """
    # Start with hardcoded defaults, overlay profile
    merged: dict[str, dict[str, Any]] = {}
    for stage, defaults in DEFAULT_SETTINGS.items():
        profile_stage = profile_settings.get(stage, {})
        merged[stage] = {**defaults, **profile_stage}

    # Apply user overrides into image settings
    if art_style:
        merged.setdefault("images", {})["art_style"] = art_style
    if movie_override:
        merged.setdefault("images", {})["movie_override"] = movie_override
        # movie_override implies movie creative direction
        merged["images"]["creative_direction"] = "movie"

    return merged


# ─── Retry Fallback Settings ──────────────────────────────────────────────────

def get_fallback_overrides(stage: str, attempt: int) -> dict[str, Any]:
    """Return per-word setting overrides for retry attempts."""
    if stage == "images" and attempt >= 1:
        return {"creative_direction": "literal"}
    if stage == "video" and attempt >= 1:
        return {"video_mode": "ken_burns"}
    if stage == "song" and attempt >= 1:
        return {"batch_size": 1}
    return {}


# ─── Thumbnail Extraction ────────────────────────────────────────────────────

def extract_thumbnail(video_path: Path, output_path: Path) -> bool:
    """Extract a JPEG thumbnail at ~33% of video duration using FFmpeg."""
    try:
        # Get duration
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(video_path)],
            capture_output=True, text=True, timeout=10,
        )
        duration = float(probe.stdout.strip())
        seek_time = duration * 0.33

        subprocess.run(
            ["ffmpeg", "-y", "-ss", str(seek_time), "-i", str(video_path),
             "-frames:v", "1", "-q:v", "2", str(output_path)],
            capture_output=True, timeout=30,
        )
        return output_path.exists()
    except Exception as e:
        log.warning("Thumbnail extraction failed: %s", e)
        return False


# ─── Upload Logic ─────────────────────────────────────────────────────────────

async def upload_results(
    word_record: dict[str, Any],
    word_dir: Path,
    manifest_data: Any,
    user_id: str,
    deck_id: str,
) -> bool:
    """Upload final video + thumbnail to Supabase Storage, update word record."""
    word_slug = word_record.get("word_slug", "")

    # Determine final video path
    bookend_settings = manifest_data.settings.get("bookend", {})
    bookend_enabled = bookend_settings.get("enabled", True)

    if bookend_enabled and manifest_data.selected.bookend:
        video_path = word_dir / "bookend" / manifest_data.selected.bookend / "final.mp4"
    elif manifest_data.selected.final:
        video_path = word_dir / "final" / manifest_data.selected.final / "final.mp4"
    else:
        log.error("No final video found for %s", word_slug)
        return False

    if not video_path.exists():
        log.error("Final video file missing: %s", video_path)
        return False

    # Extract thumbnail
    thumb_path = word_dir / "thumb.jpg"
    extract_thumbnail(video_path, thumb_path)

    # Upload video
    storage_video_path = f"{user_id}/{deck_id}/{word_slug}/video.mp4"
    storage_thumb_path = f"{user_id}/{deck_id}/{word_slug}/thumb.jpg"

    try:
        with open(video_path, "rb") as f:
            sb.storage.from_("videos").upload(
                storage_video_path, f.read(),
                file_options={"content-type": "video/mp4", "upsert": "true"},
            )

        if thumb_path.exists():
            with open(thumb_path, "rb") as f:
                sb.storage.from_("videos").upload(
                    storage_thumb_path, f.read(),
                    file_options={"content-type": "image/jpeg", "upsert": "true"},
                )
    except Exception as e:
        log.error("Upload failed for %s: %s", word_slug, e)
        return False

    # Get public URLs
    video_url = sb.storage.from_("videos").get_public_url(storage_video_path)
    thumb_url = sb.storage.from_("videos").get_public_url(storage_thumb_path) if thumb_path.exists() else None

    # Update word record
    update_data: dict[str, Any] = {
        "status": "complete",
        "video_url": video_url,
    }
    if thumb_url:
        update_data["thumbnail_url"] = thumb_url

    sb.table("words").update(update_data).eq("id", word_record["id"]).execute()
    return True


# ─── Word Processing ─────────────────────────────────────────────────────────

async def process_word(
    job: dict[str, Any],
    word_record: dict[str, Any],
    workspace_path: Path,
    enrichment: dict[str, Any],
) -> bool:
    """Process a single word through the full pipeline. Returns True on success."""
    word_text = enrichment.get("word_target", word_record["word"])
    word_slug_val = slugify(word_text)
    language = job["target_language"]
    lang_code = language_to_code(language)
    translation = enrichment.get("translation", "")

    # Update word record with slug
    sb.table("words").update({
        "word_slug": word_slug_val,
        "status": "processing",
    }).eq("id", word_record["id"]).execute()

    log.info("  Processing word: %s (%s)", word_text, word_slug_val)

    # Create word folder and manifest
    word_dir = create_word_folder(workspace_path, word_slug_val)
    enrichment_data = {
        "pos": enrichment.get("pos"),
        "article": enrichment.get("article"),
        "etymology": enrichment.get("etymology"),
        "mnemonic": enrichment.get("mnemonic"),
    }
    create_manifest(
        word_dir=word_dir,
        word_original=word_text,
        word_slug=word_slug_val,
        translation=translation,
        language=language,
        language_code=lang_code,
        enrichment_data=enrichment_data,
    )

    # Run pipeline stages with retry
    for stage in STAGE_ORDER:
        success = False
        for attempt in range(MAX_RETRIES + 1):
            try:
                log.info("    Stage %s (attempt %d)", stage, attempt + 1)
                await run_stage(workspace_path, word_slug_val, stage)
                success = True
                break
            except Exception as e:
                log.warning("    Stage %s attempt %d failed: %s", stage, attempt + 1, e)
                if attempt < MAX_RETRIES:
                    # Apply fallback settings for retry
                    overrides = get_fallback_overrides(stage, attempt + 1)
                    if overrides:
                        log.info("    Retrying with fallback: %s", overrides)
                        from src.manifest import update_settings
                        update_settings(word_dir, stage, overrides)

        if not success:
            log.error("  Word %s failed at stage %s after %d attempts",
                      word_slug_val, stage, MAX_RETRIES + 1)
            sb.table("words").update({
                "status": "failed",
                "error_message": f"Failed at stage {stage}",
                "retry_count": MAX_RETRIES + 1,
            }).eq("id", word_record["id"]).execute()

            # Refund 1 credit
            sb.rpc("refund_credit", {"user_id_param": job["user_id"]}).execute()

            # Increment words_failed on job
            sb.table("generation_jobs").update({
                "words_failed": job.get("words_failed", 0) + 1,
            }).eq("id", job["id"]).execute()
            return False

    # All stages complete — upload results
    manifest_data = read_manifest(word_dir)

    uploaded = await upload_results(
        word_record, word_dir, manifest_data, job["user_id"], job["deck_id"]
    )
    if not uploaded:
        sb.table("words").update({
            "status": "failed",
            "error_message": "Upload failed",
        }).eq("id", word_record["id"]).execute()
        sb.rpc("refund_credit", {"user_id_param": job["user_id"]}).execute()
        return False

    # Update job progress
    current_completed = sb.table("generation_jobs").select("words_completed") \
        .eq("id", job["id"]).single().execute().data.get("words_completed", 0)
    sb.table("generation_jobs").update({
        "words_completed": current_completed + 1,
    }).eq("id", job["id"]).execute()

    log.info("  Word %s complete", word_slug_val)
    return True


# ─── Job Processing ──────────────────────────────────────────────────────────

async def process_job(job: dict[str, Any]) -> None:
    """Process a single generation job end-to-end."""
    job_id = job["id"]
    user_id = job["user_id"]
    deck_id = job["deck_id"]
    target_language = job["target_language"]

    log.info("Processing job %s (user=%s, deck=%s, lang=%s)",
             job_id, user_id, deck_id, target_language)

    # Mark job as processing
    sb.table("generation_jobs").update({
        "status": "processing",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    # Check engine health
    try:
        health = await check_all_engines()
        unhealthy = [e for e in health if not e.reachable]
        if unhealthy:
            names = ", ".join(e.name for e in unhealthy)
            log.warning("Unhealthy engines: %s — proceeding anyway", names)
    except Exception as e:
        log.warning("Engine health check failed: %s", e)

    # Load active language profile
    profile_resp = sb.table("language_profiles") \
        .select("*") \
        .eq("language", target_language) \
        .eq("is_active", True) \
        .limit(1) \
        .execute()

    profile_settings: dict[str, Any] = {}
    profile_name = None
    if profile_resp.data:
        profile = profile_resp.data[0]
        profile_settings = profile.get("settings", {})
        profile_name = profile.get("name")
        log.info("Using language profile: %s", profile_name)
    else:
        log.warning("No active language profile for %s — using defaults", target_language)

    # Merge settings
    merged = merge_settings(
        profile_settings,
        job.get("art_style"),
        job.get("movie_override"),
    )

    # Get user's base language
    user_resp = sb.table("profiles").select("base_language") \
        .eq("id", user_id).single().execute()
    base_language = user_resp.data.get("base_language", "English") if user_resp.data else "English"

    # Load words for this deck
    words_resp = sb.table("words").select("*") \
        .eq("deck_id", deck_id) \
        .order("created_at") \
        .execute()
    words = words_resp.data or []

    if not words:
        log.error("No words found for deck %s", deck_id)
        sb.table("generation_jobs").update({
            "status": "failed",
            "error_message": "No words in deck",
        }).eq("id", job_id).execute()
        return

    # Run enrichment
    llm_model = merged.get("concept", {}).get("llm_model", "deepseek/deepseek-v3.2")
    enrichment_results = await run_enrichment(words, target_language, base_language, llm_model)

    # Build enrichment lookup by input word
    enrichment_map: dict[str, dict[str, Any]] = {}
    for e in enrichment_results:
        enrichment_map[e.get("input_word", "").lower()] = e

    # Write enrichment data to Supabase word records
    for word_rec in words:
        e = enrichment_map.get(word_rec["word"].lower(), {})
        sb.table("words").update({
            "translation": e.get("translation", ""),
            "mnemonic": e.get("mnemonic", ""),
            "etymology": e.get("etymology", ""),
            "pos": e.get("pos", ""),
            "article": e.get("article"),
        }).eq("id", word_rec["id"]).execute()

    # Create workspace
    workspace_path = WORKSPACE_ROOT / f"cloud_{user_id}_{deck_id}"
    workspace_path.mkdir(parents=True, exist_ok=True)
    log.info("Workspace: %s", workspace_path)

    # Write merged settings once
    save_defaults(workspace_path, merged)

    # Update job with profile info
    sb.table("generation_jobs").update({
        "profile_used": profile_name,
    }).eq("id", job_id).execute()

    # Process each word
    words_succeeded = 0
    words_failed_count = 0

    for word_rec in words:
        # Check if queue was paused
        settings_resp = sb.table("system_settings").select("queue_paused") \
            .eq("id", 1).single().execute()
        if settings_resp.data and settings_resp.data.get("queue_paused"):
            log.info("Queue paused — stopping after current word")
            break

        e = enrichment_map.get(word_rec["word"].lower(), {
            "word_target": word_rec["word"],
            "translation": "", "mnemonic": "", "etymology": "",
            "pos": "", "article": None,
        })

        success = await process_word(job, word_rec, workspace_path, e)
        if success:
            words_succeeded += 1
        else:
            words_failed_count += 1

    # Finalize job
    total = len(words)
    if words_succeeded == total:
        final_status = "complete"
    elif words_succeeded > 0:
        final_status = "partial"
    else:
        final_status = "failed"

    sb.table("generation_jobs").update({
        "status": final_status,
        "words_completed": words_succeeded,
        "words_failed": words_failed_count,
        "completed_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    # Update deck status
    deck_status = "complete" if final_status == "complete" else "partial"
    sb.table("decks").update({"status": deck_status}).eq("id", deck_id).execute()

    log.info("Job %s finished: %s (%d/%d succeeded)",
             job_id, final_status, words_succeeded, total)

    # Optional cleanup
    if CLEANUP_WORKSPACES and workspace_path.exists():
        import shutil
        shutil.rmtree(workspace_path, ignore_errors=True)
        log.info("Cleaned up workspace: %s", workspace_path)


# ─── Main Loop ────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("Resonance Job Runner starting")
    log.info("Supabase: %s", SUPABASE_URL)
    log.info("Workspace root: %s", WORKSPACE_ROOT)
    log.info("Poll interval: %ds", POLL_INTERVAL)

    # Ensure system_settings row exists before polling
    settings_check = sb.table("system_settings").select("*").eq("id", 1).maybe_single().execute()
    if not settings_check.data:
        log.warning("system_settings row missing — creating default (auto_approve=true, queue_paused=false)")
        sb.table("system_settings").insert({
            "id": 1,
            "auto_approve": True,
            "queue_paused": False,
        }).execute()
    elif not settings_check.data.get("auto_approve"):
        log.warning("auto_approve is OFF — jobs will stay 'pending' until manually approved via admin Queue page")

    while True:
        try:
            # Check system settings (queue_paused + auto_approve)
            settings_resp = sb.table("system_settings").select("queue_paused, auto_approve") \
                .eq("id", 1).single().execute()
            if settings_resp.data and settings_resp.data.get("queue_paused"):
                log.debug("Queue is paused")
                await asyncio.sleep(POLL_INTERVAL)
                continue

            # Auto-approve pending jobs if enabled
            if settings_resp.data and settings_resp.data.get("auto_approve"):
                approve_resp = sb.table("generation_jobs") \
                    .update({"status": "approved"}) \
                    .eq("status", "pending") \
                    .execute()
                if approve_resp.data:
                    log.info("Auto-approved %d pending job(s)", len(approve_resp.data))

            # Poll for next approved job
            job_resp = sb.table("generation_jobs") \
                .select("*") \
                .eq("status", "approved") \
                .order("priority") \
                .order("created_at") \
                .limit(1) \
                .execute()

            if not job_resp.data:
                log.debug("No approved jobs")
                await asyncio.sleep(POLL_INTERVAL)
                continue

            job = job_resp.data[0]
            await process_job(job)

        except KeyboardInterrupt:
            log.info("Shutting down")
            break
        except Exception as e:
            log.error("Error in main loop: %s", e, exc_info=True)
            await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
