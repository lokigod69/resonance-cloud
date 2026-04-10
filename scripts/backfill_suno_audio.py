"""
Backfill script: Upload existing Suno audio to Supabase Storage.

Downloads audio from active CDN URLs (or reads from local disk if available),
uploads to Supabase Storage, and updates the words table with permanent URLs.

Usage:
    cd orchestrator
    python -m scripts.backfill_suno_audio [--dry-run] [--local-first]

Options:
    --dry-run      Preview what would be done without uploading or updating
    --local-first  Check local workspace disk before trying CDN (recommended)
"""

from __future__ import annotations

import argparse
import asyncio
import logging
import os
import sys
import time
from pathlib import Path

import httpx
from dotenv import load_dotenv
from supabase import create_client

load_dotenv()

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
log = logging.getLogger("backfill_suno")

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "")
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceTEST"))

# Detect Supabase host for skipping already-migrated URLs
SUPABASE_HOST = ""
if SUPABASE_URL:
    from urllib.parse import urlparse
    SUPABASE_HOST = urlparse(SUPABASE_URL).hostname or ""


def is_supabase_url(url: str | None) -> bool:
    """Check if a URL already points to Supabase Storage."""
    if not url or not SUPABASE_HOST:
        return False
    return SUPABASE_HOST in url


def find_local_mp3(user_id: str, deck_id: str, word_slug: str, track: str) -> Path | None:
    """Try to find a locally cached Suno MP3 on disk.

    The workspace directory pattern is: cloud_{user_id}_{deck_id}/{word_slug}/songs/suno/
    """
    workspace_dir = WORKSPACE_ROOT / f"cloud_{user_id}_{deck_id}"
    local_path = workspace_dir / word_slug / "songs" / "suno" / f"suno_{track}.mp3"
    if local_path.exists():
        return local_path

    # Also try the raw download name
    alt_path = workspace_dir / word_slug / "songs" / "suno" / f"{track}.mp3"
    if alt_path.exists():
        return alt_path

    return None


async def download_from_cdn(url: str) -> bytes | None:
    """Download audio from CDN. Returns None if expired/unreachable."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.get(url)
            resp.raise_for_status()
            if len(resp.content) < 1000:
                log.warning("  CDN response too small (%d bytes) — likely expired", len(resp.content))
                return None
            return resp.content
    except httpx.HTTPStatusError as e:
        if e.response.status_code in (403, 404, 410):
            return None  # Expired
        log.warning("  CDN error: %s", e)
        return None
    except Exception as e:
        log.warning("  CDN download failed: %s", e)
        return None


async def main():
    parser = argparse.ArgumentParser(description="Backfill Suno audio to Supabase Storage")
    parser.add_argument("--dry-run", action="store_true", help="Preview without uploading")
    parser.add_argument("--local-first", action="store_true", help="Check local disk before CDN")
    args = parser.parse_args()

    if not SUPABASE_URL or not SUPABASE_KEY:
        log.error("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(1)

    sb = create_client(SUPABASE_URL, SUPABASE_KEY)

    # Fetch all words with suno_audio_url
    log.info("Fetching words with suno_audio_url...")
    result = sb.table("words") \
        .select("id, user_id, deck_id, word_slug, suno_audio_url, suno_audio_url_b, created_at") \
        .not_.is_("suno_audio_url", "null") \
        .order("created_at", desc=True) \
        .execute()

    words = result.data or []
    log.info("Found %d words with suno_audio_url", len(words))

    stats = {
        "already_migrated": 0,
        "uploaded_cdn": 0,
        "uploaded_local": 0,
        "expired": 0,
        "errors": 0,
        "skipped_dry": 0,
    }

    for i, word in enumerate(words, 1):
        word_id = word["id"]
        user_id = word["user_id"]
        deck_id = word["deck_id"]
        word_slug = word.get("word_slug") or word_id[:8]
        log.info("[%d/%d] %s (user=%s, deck=%s)", i, len(words), word_slug, user_id[:8], deck_id[:8])

        storage_prefix = f"{user_id}/{deck_id}/{word_slug}"
        perm_update: dict[str, str] = {}

        for track_label, url_col in [("a", "suno_audio_url"), ("b", "suno_audio_url_b")]:
            url = word.get(url_col)
            if not url:
                continue

            # Skip if already a Supabase URL
            if is_supabase_url(url):
                stats["already_migrated"] += 1
                log.info("  Track %s: already migrated", track_label)
                continue

            if args.dry_run:
                log.info("  Track %s: would upload (dry run)", track_label)
                stats["skipped_dry"] += 1
                continue

            audio_data: bytes | None = None
            source = ""

            # Try local disk first
            if args.local_first:
                local_path = find_local_mp3(user_id, deck_id, word_slug, track_label)
                if local_path:
                    audio_data = local_path.read_bytes()
                    source = "local"
                    log.info("  Track %s: found on local disk (%d bytes)", track_label, len(audio_data))

            # Try CDN download
            if audio_data is None:
                audio_data = await download_from_cdn(url)
                if audio_data:
                    source = "cdn"
                    log.info("  Track %s: downloaded from CDN (%d bytes)", track_label, len(audio_data))
                else:
                    # Last resort: check local disk even if --local-first wasn't set
                    if not args.local_first:
                        local_path = find_local_mp3(user_id, deck_id, word_slug, track_label)
                        if local_path:
                            audio_data = local_path.read_bytes()
                            source = "local_fallback"
                            log.info("  Track %s: CDN expired, found on local disk (%d bytes)",
                                     track_label, len(audio_data))

            if audio_data is None:
                stats["expired"] += 1
                log.warning("  Track %s: CDN expired, no local copy — LOST", track_label)
                continue

            # Upload to Supabase Storage
            try:
                storage_key = f"{storage_prefix}/suno_{track_label}.mp3"
                sb.storage.from_("videos").upload(
                    storage_key, audio_data,
                    file_options={"content-type": "audio/mpeg", "upsert": "true"},
                )
                perm_url = sb.storage.from_("videos").get_public_url(storage_key)
                perm_update[url_col] = perm_url

                if source == "cdn":
                    stats["uploaded_cdn"] += 1
                else:
                    stats["uploaded_local"] += 1
                log.info("  Track %s: uploaded to storage (%s)", track_label, source)
            except Exception as e:
                stats["errors"] += 1
                log.error("  Track %s: upload failed: %s", track_label, e)

        # Update DB with permanent URLs
        if perm_update and not args.dry_run:
            try:
                sb.table("words").update(perm_update).eq("id", word_id).execute()
                log.info("  Updated DB with %d permanent URL(s)", len(perm_update))
            except Exception as e:
                stats["errors"] += 1
                log.error("  DB update failed: %s", e)

        # Rate limit: avoid overwhelming CDN and Supabase
        await asyncio.sleep(0.3)

    # Summary
    log.info("")
    log.info("=" * 60)
    log.info("BACKFILL COMPLETE")
    log.info("  Already migrated: %d", stats["already_migrated"])
    log.info("  Uploaded (CDN):   %d", stats["uploaded_cdn"])
    log.info("  Uploaded (local): %d", stats["uploaded_local"])
    log.info("  Expired/lost:     %d", stats["expired"])
    log.info("  Errors:           %d", stats["errors"])
    if args.dry_run:
        log.info("  Skipped (dry):    %d", stats["skipped_dry"])
    log.info("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
