"""
One-time repair script: fix word_slug /None/ in video/thumbnail URLs.

The bug: upload_results() used word_record.get("word_slug") which was None
because the word_record dict wasn't refreshed after the slug was set.
All uploaded files live at /{user_id}/{deck_id}/None/ in Supabase Storage.

Strategy: Copy storage objects from /None/ to /{word_slug}/, update URLs,
then remove the old /None/ objects. If copy fails, leave URLs unchanged.

Usage:
    cd orchestrator
    .venv/Scripts/python.exe scripts/fix_word_slug_urls.py

Safe to run multiple times — skips words that don't have /None/ in their URL.
"""

from __future__ import annotations

import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

from supabase import create_client

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    sys.exit(1)

sb = create_client(SUPABASE_URL, SUPABASE_KEY)
BUCKET = "videos"


def main():
    # Find words with /None/ in their video_url
    resp = sb.table("words").select(
        "id, word, word_slug, user_id, deck_id, video_url, thumbnail_url"
    ).not_.is_("video_url", "null").execute()

    words = resp.data or []
    affected = [w for w in words if w.get("video_url") and "/None/" in w["video_url"]]

    if not affected:
        print("No words with /None/ in video_url found. Nothing to fix.")
        return

    print(f"Found {len(affected)} word(s) with /None/ in video_url:\n")

    for w in affected:
        word_slug = w.get("word_slug")
        if not word_slug:
            print(f"  SKIP {w['word']} (id={w['id'][:8]}): word_slug is still None, cannot fix")
            continue

        user_id = w["user_id"]
        deck_id = w["deck_id"]

        old_video = f"{user_id}/{deck_id}/None/video.mp4"
        new_video = f"{user_id}/{deck_id}/{word_slug}/video.mp4"
        old_thumb = f"{user_id}/{deck_id}/None/thumb.jpg"
        new_thumb = f"{user_id}/{deck_id}/{word_slug}/thumb.jpg"

        print(f"  Fixing: {w['word']} ({word_slug})")
        print(f"    Old: {old_video}")
        print(f"    New: {new_video}")

        try:
            # Copy video to new path
            video_data = sb.storage.from_(BUCKET).download(old_video)
            sb.storage.from_(BUCKET).upload(
                new_video, video_data,
                file_options={"content-type": "video/mp4", "upsert": "true"},
            )

            # Copy thumbnail
            thumb_copied = False
            try:
                thumb_data = sb.storage.from_(BUCKET).download(old_thumb)
                sb.storage.from_(BUCKET).upload(
                    new_thumb, thumb_data,
                    file_options={"content-type": "image/jpeg", "upsert": "true"},
                )
                thumb_copied = True
            except Exception:
                print(f"    WARN: No thumbnail at old path, skipping thumb copy")

            # Update word record with new URLs
            new_video_url = sb.storage.from_(BUCKET).get_public_url(new_video)
            update_data: dict = {"video_url": new_video_url}
            if thumb_copied:
                new_thumb_url = sb.storage.from_(BUCKET).get_public_url(new_thumb)
                update_data["thumbnail_url"] = new_thumb_url

            sb.table("words").update(update_data).eq("id", w["id"]).execute()

            # Remove old files
            try:
                sb.storage.from_(BUCKET).remove([old_video])
                if thumb_copied:
                    sb.storage.from_(BUCKET).remove([old_thumb])
            except Exception as e:
                print(f"    WARN: Could not remove old files: {e}")

            print(f"    OK: URLs updated")

        except Exception as e:
            print(f"    ERROR: {e} — leaving this word unchanged")

    print("\nDone.")


if __name__ == "__main__":
    main()
