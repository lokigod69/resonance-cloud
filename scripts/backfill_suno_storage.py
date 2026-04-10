"""
One-time backfill: copy existing Suno CDN audio to Supabase Storage (audio bucket).

Populates suno_storage_url / suno_storage_url_b with permanent public URLs.
Does NOT modify suno_audio_url / suno_audio_url_b (CDN URLs kept as fallback).

Also re-polls task-id-only rows (suno_task_id set, suno_audio_url missing)
to recover audio that completed after pipeline timeouts.

Usage:
    cd orchestrator
    .venv/Scripts/python.exe scripts/backfill_suno_storage.py          # full run
    .venv/Scripts/python.exe scripts/backfill_suno_storage.py --dry-run # preview
"""

from __future__ import annotations

import argparse
import asyncio
import os
import sys
import time

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Append orchestrator root so we can import src.suno
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import httpx
from supabase import create_client

from src.suno import fetch_existing_task, _write_to_supabase

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET = "audio"
UPLOAD_DELAY = 0.5  # seconds between uploads to avoid rate limits


def upload_and_get_url(storage_key: str, data: bytes) -> str:
    """Upload audio bytes to Supabase Storage and return the public URL."""
    sb.storage.from_(BUCKET).upload(
        storage_key, data,
        file_options={"content-type": "audio/mpeg", "upsert": "true"},
    )
    return sb.storage.from_(BUCKET).get_public_url(storage_key)


def backfill_existing_urls(dry_run: bool) -> dict[str, int]:
    """Download CDN audio and re-upload to Supabase Storage for all rows with CDN URLs but no storage URL."""
    stats = {"processed": 0, "succeeded": 0, "failed": 0, "skipped": 0}

    # Fetch rows: have CDN URL but no storage URL
    resp = (
        sb.table("words")
        .select("id, user_id, deck_id, word_slug, suno_audio_url, suno_audio_url_b")
        .not_.is_("suno_audio_url", "null")
        .is_("suno_storage_url", "null")
        .execute()
    )
    rows = resp.data or []
    print(f"[Phase 1] Found {len(rows)} rows with CDN URLs but no storage URL")

    for row in rows:
        word_id = row["id"]
        user_id = row["user_id"]
        deck_id = row["deck_id"]
        word_slug = row["word_slug"]
        cdn_url_a = row["suno_audio_url"]
        cdn_url_b = row.get("suno_audio_url_b")
        prefix = f"{user_id}/{deck_id}/{word_slug}"

        stats["processed"] += 1

        if dry_run:
            print(f"  [DRY RUN] Would download {cdn_url_a} -> {prefix}/suno_a.mp3")
            if cdn_url_b:
                print(f"  [DRY RUN] Would download {cdn_url_b} -> {prefix}/suno_b.mp3")
            stats["succeeded"] += 1
            continue

        update: dict[str, str | None] = {}

        # Track A
        try:
            r = httpx.get(cdn_url_a, timeout=60, follow_redirects=True)
            if r.status_code == 200:
                url_a = upload_and_get_url(f"{prefix}/suno_a.mp3", r.content)
                update["suno_storage_url"] = url_a
            else:
                print(f"  SKIP {word_id} ({word_slug}): Track A returned HTTP {r.status_code}")
                stats["skipped"] += 1
                continue
        except Exception as e:
            print(f"  FAIL {word_id} ({word_slug}): Track A download error: {e}")
            stats["failed"] += 1
            continue

        # Track B
        if cdn_url_b:
            try:
                r = httpx.get(cdn_url_b, timeout=60, follow_redirects=True)
                if r.status_code == 200:
                    url_b = upload_and_get_url(f"{prefix}/suno_b.mp3", r.content)
                    update["suno_storage_url_b"] = url_b
                else:
                    print(f"  WARN {word_id} ({word_slug}): Track B returned HTTP {r.status_code}, skipping B only")
            except Exception as e:
                print(f"  WARN {word_id} ({word_slug}): Track B download error: {e}")
        else:
            update["suno_storage_url_b"] = None

        # Update DB
        try:
            sb.table("words").update(update).eq("id", word_id).execute()
            print(f"  OK {word_slug}: {update.get('suno_storage_url', '')[:80]}...")
            stats["succeeded"] += 1
        except Exception as e:
            print(f"  FAIL {word_id} ({word_slug}): DB update error: {e}")
            stats["failed"] += 1

        time.sleep(UPLOAD_DELAY)

    return stats


async def backfill_repoll_rows(dry_run: bool) -> dict[str, int]:
    """Re-poll task-id-only rows and persist audio if available."""
    stats = {"processed": 0, "succeeded": 0, "failed": 0, "skipped": 0}

    resp = (
        sb.table("words")
        .select("id, user_id, deck_id, word_slug, suno_task_id")
        .not_.is_("suno_task_id", "null")
        .is_("suno_audio_url", "null")
        .execute()
    )
    rows = resp.data or []
    print(f"\n[Phase 2] Found {len(rows)} task-id-only rows (no CDN URL)")

    for row in rows:
        word_id = row["id"]
        user_id = row["user_id"]
        deck_id = row["deck_id"]
        word_slug = row["word_slug"]
        task_id = row["suno_task_id"]
        prefix = f"{user_id}/{deck_id}/{word_slug}"

        stats["processed"] += 1

        if dry_run:
            print(f"  [DRY RUN] Would re-poll task {task_id} for {word_slug}")
            continue

        try:
            result = await fetch_existing_task(task_id)
        except Exception as e:
            print(f"  FAIL {word_id} ({word_slug}): re-poll error: {e}")
            stats["failed"] += 1
            continue

        if result["status"] != "success" or not result.get("audio_url"):
            print(f"  SKIP {word_id} ({word_slug}): task {task_id} status={result['status']}, error={result.get('error')}")
            stats["skipped"] += 1
            continue

        audio_url_a = result["audio_url"]
        audio_url_b = result.get("audio_url_b")

        # Download and upload Track A
        update: dict[str, str | None] = {}
        try:
            r = httpx.get(audio_url_a, timeout=60, follow_redirects=True)
            if r.status_code != 200:
                print(f"  SKIP {word_id} ({word_slug}): Track A HTTP {r.status_code}")
                stats["skipped"] += 1
                continue
            url_a = upload_and_get_url(f"{prefix}/suno_a.mp3", r.content)
            update["suno_storage_url"] = url_a
        except Exception as e:
            print(f"  FAIL {word_id} ({word_slug}): Track A error: {e}")
            stats["failed"] += 1
            continue

        # Track B
        if audio_url_b:
            try:
                r = httpx.get(audio_url_b, timeout=60, follow_redirects=True)
                if r.status_code == 200:
                    url_b = upload_and_get_url(f"{prefix}/suno_b.mp3", r.content)
                    update["suno_storage_url_b"] = url_b
            except Exception as e:
                print(f"  WARN {word_id} ({word_slug}): Track B error: {e}")

        # Persist CDN URLs (fixes the re-poll bug: these rows had no suno_audio_url)
        _write_to_supabase(deck_id, word_slug, audio_url_a, task_id, audio_url_b)

        # Persist storage URLs
        try:
            sb.table("words").update(update).eq("id", word_id).execute()
            print(f"  OK {word_slug}: recovered from task {task_id}")
            stats["succeeded"] += 1
        except Exception as e:
            print(f"  FAIL {word_id} ({word_slug}): DB update error: {e}")
            stats["failed"] += 1

        time.sleep(UPLOAD_DELAY)

    return stats


def main():
    parser = argparse.ArgumentParser(description="Backfill Suno audio to Supabase Storage")
    parser.add_argument("--dry-run", action="store_true", help="Preview without uploading or updating")
    args = parser.parse_args()

    if args.dry_run:
        print("=== DRY RUN MODE ===\n")

    # Phase 1: existing CDN URLs
    stats1 = backfill_existing_urls(args.dry_run)

    # Phase 2: task-id-only re-poll
    stats2 = asyncio.run(backfill_repoll_rows(args.dry_run))

    # Summary
    total_processed = stats1["processed"] + stats2["processed"]
    total_succeeded = stats1["succeeded"] + stats2["succeeded"]
    total_failed = stats1["failed"] + stats2["failed"]
    total_skipped = stats1["skipped"] + stats2["skipped"]

    print(f"\n{'=' * 50}")
    print(f"SUMMARY")
    print(f"  Phase 1 (CDN backfill):  {stats1['processed']} processed, {stats1['succeeded']} ok, {stats1['failed']} failed, {stats1['skipped']} skipped")
    print(f"  Phase 2 (re-poll):       {stats2['processed']} processed, {stats2['succeeded']} ok, {stats2['failed']} failed, {stats2['skipped']} skipped")
    print(f"  Total:                   {total_processed} processed, {total_succeeded} ok, {total_failed} failed, {total_skipped} skipped")
    print(f"{'=' * 50}")


if __name__ == "__main__":
    main()
