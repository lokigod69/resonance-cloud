"""Upload generated artifacts to Supabase Storage and update word records."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)


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


def _resolve_final_video(word_dir: Path, manifest_data: Any) -> Path | None:
    """Resolve the final video path from a manifest (bookend > assembly fallback)."""
    bookend_settings = manifest_data.settings.get("bookend", {})
    bookend_enabled = bookend_settings.get("enabled", True)

    if bookend_enabled and manifest_data.selected.bookend:
        return word_dir / "bookend" / manifest_data.selected.bookend / "final.mp4"
    elif manifest_data.selected.final:
        return word_dir / "final" / manifest_data.selected.final / "final.mp4"
    return None


def _upload_video_and_thumb(
    sb_client,
    video_path: Path,
    word_dir: Path,
    storage_video_key: str,
    storage_thumb_key: str,
    thumb_suffix: str = "",
) -> tuple[str | None, str | None]:
    """Upload a video + extracted thumbnail to Supabase Storage.

    Returns (video_url, thumb_url) or (None, None) on failure.
    """
    if not video_path.exists():
        log.error("Video file missing: %s", video_path)
        return None, None

    thumb_path = word_dir / f"thumb{thumb_suffix}.jpg"
    extract_thumbnail(video_path, thumb_path)

    try:
        with open(video_path, "rb") as f:
            sb_client.storage.from_("videos").upload(
                storage_video_key, f.read(),
                file_options={"content-type": "video/mp4", "upsert": "true"},
            )
        if thumb_path.exists():
            with open(thumb_path, "rb") as f:
                sb_client.storage.from_("videos").upload(
                    storage_thumb_key, f.read(),
                    file_options={"content-type": "image/jpeg", "upsert": "true"},
                )
    except Exception as e:
        log.error("Upload failed for %s: %s", storage_video_key, e)
        return None, None

    video_url = sb_client.storage.from_("videos").get_public_url(storage_video_key)
    thumb_url = (
        sb_client.storage.from_("videos").get_public_url(storage_thumb_key)
        if thumb_path.exists() else None
    )
    return video_url, thumb_url


async def upload_ab_results(
    sb_client,
    word_record: dict[str, Any],
    word_dir: Path,
    user_id: str,
    deck_id: str,
    word_slug: str,
    manifest_a: Any,
    manifest_b: Any | None = None,
) -> bool:
    """Upload A/B video versions to Supabase Storage and update the word record.

    Version A uploads to ``video.mp4`` / ``thumb.jpg`` (backward compatible).
    Version B uploads to ``video_b.mp4`` / ``thumb_b.jpg`` (new).
    """
    prefix = f"{user_id}/{deck_id}/{word_slug}"

    # —— Version A (required) ——
    video_a = _resolve_final_video(word_dir, manifest_a)
    if not video_a:
        log.error("No final video for version A (%s)", word_slug)
        return False

    video_url_a, thumb_url_a = _upload_video_and_thumb(
        sb_client,
        video_a,
        word_dir,
        f"{prefix}/video.mp4",
        f"{prefix}/thumb.jpg",
    )
    if not video_url_a:
        return False

    # —— Version B (optional) ——
    video_url_b, thumb_url_b = None, None
    if manifest_b is not None:
        video_b = _resolve_final_video(word_dir, manifest_b)
        if video_b:
            video_url_b, thumb_url_b = _upload_video_and_thumb(
                sb_client,
                video_b,
                word_dir,
                f"{prefix}/video_b.mp4",
                f"{prefix}/thumb_b.jpg",
                thumb_suffix="_b",
            )
            if not video_url_b:
                log.warning("Version B upload failed for %s — continuing with A only", word_slug)

    # —— Update word record ——
    update_data: dict[str, Any] = {
        "video_url": video_url_a,
    }
    if thumb_url_a:
        update_data["thumbnail_url"] = thumb_url_a
    # Always write B fields: set URLs if B exists, null them out if not
    # (prevents stale B URLs persisting from a previous generation)
    update_data["video_url_b"] = video_url_b
    update_data["thumbnail_url_b"] = thumb_url_b

    sb_client.table("words").update(update_data).eq("id", word_record["id"]).execute()
    return True
