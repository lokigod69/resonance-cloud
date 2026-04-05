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
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from dotenv import load_dotenv

# Load env BEFORE importing src modules so engine URLs are available
load_dotenv()

from src.pipeline import run_stage, STAGE_ORDER
from src.settings import save_defaults, load_defaults, DEFAULT_SETTINGS
from src.manifest import create_manifest, read_manifest, update_selection
from src.workspace import create_word_folder, get_word_dir
from src.slugify import slugify, language_to_code
from src.dispatcher import check_all_engines
from src.models import Enrichment
from src.suno import generate_song as suno_generate_song, download_suno_audio, fetch_existing_task

import httpx
from supabase import create_client, Client

# ─── Configuration ────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceTEST/content"))
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
POLL_INTERVAL = int(os.getenv("JOB_RUNNER_POLL_INTERVAL", "30"))
MAX_RETRIES = int(os.getenv("JOB_RUNNER_MAX_RETRIES", "2"))
CLEANUP_WORKSPACES = os.getenv("JOB_RUNNER_CLEANUP", "false").lower() == "true"
SUNO_MIN_USABLE_DURATION = 12.0
SUNO_MAX_USABLE_DURATION = 150.0  # 2.5 minutes — reject glitched ultra-long Suno tracks

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

def get_fallback_overrides(
    stage: str, attempt: int, current_settings: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Return per-word setting overrides for retry attempts."""
    if stage == "images" and attempt >= 1:
        current_model = (current_settings or {}).get("llm_model", "")
        fallback_model = (
            "deepseek/deepseek-v3.2"
            if current_model == "x-ai/grok-4.1-fast"
            else "x-ai/grok-4.1-fast"
        )
        return {"creative_direction": "literal", "llm_model": fallback_model}
    if stage == "concept" and attempt >= 1:
        current_model = (current_settings or {}).get("llm_model", "")
        fallback_model = (
            "deepseek/deepseek-v3.2"
            if current_model == "x-ai/grok-4.1-fast"
            else "x-ai/grok-4.1-fast"
        )
        return {"llm_model": fallback_model}
    if stage == "video" and attempt >= 1:
        # Don't fall back to ken_burns in text-to-video mode — no source images exist
        if current_settings and current_settings.get("text_to_video", False):
            return {}
        return {"video_mode": "ken_burns"}
    if stage == "song" and attempt >= 1:
        return {"batch_size": 1}
    return {}


# ─── Smart Retry Helpers ─────────────────────────────────────────────────────

def _validate_artifacts(word_dir: Path, stage: str, selected: str) -> bool:
    """Check that a completed stage's output files actually exist on disk."""
    folder_map = {
        'concept': 'concept', 'song': 'songs', 'images': 'images',
        'video': 'videos', 'assembly': 'final', 'bookend': 'bookend',
    }
    base = word_dir / folder_map[stage]

    if stage == 'images':
        d = base / selected
        return d.is_dir() and any(d.glob("*.png"))
    elif stage == 'concept':
        return (base / selected).is_file()
    elif stage == 'song':
        # Format: "run-001_ts/take_001.flac"
        parts = selected.split('/')
        if len(parts) == 2:
            return (base / parts[0] / parts[1]).is_file()
        return (base / selected).is_dir()
    elif stage == 'video':
        d = base / selected
        return d.is_dir() and any(d.glob("scene_*.mp4"))
    elif stage == 'assembly':
        return (base / selected / "final.mp4").is_file()
    elif stage == 'bookend':
        return (base / selected / "final.mp4").is_file()
    return False


def get_incomplete_stages(
    word_dir: Path,
    manifest_data: Any,
    bookend_enabled: bool = True,
) -> list[str]:
    """Return stages that need (re-)running based on manifest selected fields + artifact existence."""
    stages: list[str] = []
    for stage in STAGE_ORDER:
        if stage == 'bookend' and not bookend_enabled:
            continue
        field = 'final' if stage == 'assembly' else stage
        selected = getattr(manifest_data.selected, field, None)
        if selected is None or not _validate_artifacts(word_dir, stage, selected):
            stages.append(stage)
    return stages


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


# ─── A/B Dual-Take Helpers ───────────────────────────────────────────────────

def get_song_takes(word_dir: Path, manifest_data: Any) -> list[str]:
    """Return available song take paths from the selected song run directory.

    Each entry is a relative path like ``"run-001_ts/take_001.flac"`` suitable
    for passing to ``update_selection(word_dir, 'song', ...)``.
    """
    current_song = manifest_data.selected.song
    if not current_song or "/" not in current_song:
        return [current_song] if current_song else []

    run_dir_name = current_song.split("/")[0]
    run_dir = word_dir / "songs" / run_dir_name
    if not run_dir.exists():
        return [current_song]

    takes = sorted(
        f"{run_dir_name}/{f.name}"
        for f in run_dir.iterdir()
        if f.suffix in (".flac", ".wav", ".mp3") and f.name.startswith("take_")
    )
    return takes if takes else [current_song]


# ─── Suno Audio Helpers ──────────────────────────────────────────────────────

def _probe_clip_durations(video_dir: Path) -> float:
    """Return total duration of all scene_*.mp4 clips in video_dir."""
    total = 0.0
    for clip in sorted(video_dir.glob("scene_*.mp4")):
        probe = subprocess.run(
            ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
             "-of", "csv=p=0", str(clip)],
            capture_output=True, text=True, timeout=10,
        )
        total += float(probe.stdout.strip())
    return total


def _probe_audio_duration(audio_path: Path) -> float:
    """Return duration of an audio file in seconds."""
    probe = subprocess.run(
        ["ffprobe", "-v", "quiet", "-show_entries", "format=duration",
         "-of", "csv=p=0", str(audio_path)],
        capture_output=True, text=True, timeout=10,
    )
    return float(probe.stdout.strip())


def _trim_suno_mp3(
    input_path: Path, output_path: Path,
    trim_to: float, fade_start: float, fade_duration: float,
) -> Path:
    """Trim and fade-out an MP3 file. fade_duration=0 skips the fade filter."""
    af = f"afade=t=out:st={fade_start}:d={fade_duration}" if fade_duration > 0 else "anull"
    cmd = [
        "ffmpeg", "-y", "-i", str(input_path),
        "-t", str(trim_to),
        "-af", af,
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg trim failed: {result.stderr[-300:]}")
    return output_path


# ─── Metadata Collection ─────────────────────────────────────────────────────

# Maps stage names to their filesystem directory names
_STAGE_DIRS = {
    "images": "images",
    "concept": "concept",
    "song": "songs",
    "video": "videos",
    "assembly": "final",
    "bookend": "bookend",
}


def _read_json(path: Path) -> dict[str, Any]:
    """Read a JSON file, returning empty dict on failure."""
    try:
        return json.loads(path.read_text(encoding="utf-8"))
    except Exception:
        return {}


def _find_latest_meta(stage_dir: Path) -> dict[str, Any]:
    """Find the latest generation-meta.json in a stage directory."""
    if not stage_dir.exists():
        return {}

    # Concept stage: generation-meta.json is directly in the concept/ folder
    direct = stage_dir / "generation-meta.json"
    if direct.exists():
        return _read_json(direct)

    # Other stages: inside timestamped version subdirectories
    version_dirs = sorted(
        [d for d in stage_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )
    if not version_dirs:
        return {}

    meta_path = version_dirs[-1] / "generation-meta.json"
    return _read_json(meta_path) if meta_path.exists() else {}


def _find_latest_storyboard(images_dir: Path) -> dict[str, Any]:
    """Find the latest storyboard.json from the images stage."""
    if not images_dir.exists():
        return {}
    version_dirs = sorted(
        [d for d in images_dir.iterdir() if d.is_dir()],
        key=lambda d: d.name,
    )
    if not version_dirs:
        return {}
    sb_path = version_dirs[-1] / "storyboard.json"
    return _read_json(sb_path) if sb_path.exists() else {}


def collect_word_metadata(
    word_dir: Path,
    profile_name: str | None,
    pipeline_duration: float,
) -> dict[str, Any]:
    """Collect generation metadata from filesystem into a summary dict."""
    # Read per-stage meta
    metas: dict[str, dict[str, Any]] = {}
    stages_completed = []
    for stage, folder in _STAGE_DIRS.items():
        meta = _find_latest_meta(word_dir / folder)
        if meta and meta.get("status") == "success":
            stages_completed.append(stage)
        metas[stage] = meta

    # Storyboard data
    sb = _find_latest_storyboard(word_dir / "images")

    # Image meta
    img = metas.get("images", {})
    img_outputs = img.get("outputs", {})
    img_steps = img.get("steps", {})
    img_rendering = img_steps.get("image_rendering", {})

    # Song meta
    song = metas.get("song", {})
    song_lora = song.get("lora", {})

    # Video meta
    vid = metas.get("video", {})

    # Assembly meta
    asm = metas.get("assembly", {})
    asm_report = asm.get("assembly_report", {})

    # Bookend meta
    bke = metas.get("bookend", {})
    bke_tts = bke.get("tts", {})

    return {
        "pipeline_duration_seconds": round(pipeline_duration, 2),
        "stages_completed": stages_completed,

        # Storyboard / creative
        "creative_direction": sb.get("creative_direction") or img.get("settings", {}).get("creative_direction"),
        "art_style": sb.get("art_style") or img.get("settings", {}).get("art_style"),
        "movie_reference": sb.get("movie"),
        "music_caption": sb.get("music_caption"),

        # Images
        "images": {
            "count": img_outputs.get("images_generated"),
            "refusals": img_rendering.get("scenes_failed", 0),
            "duration_seconds": img.get("duration_seconds"),
            "model": img_rendering.get("model") or img.get("settings", {}).get("image_model"),
        },

        # Concept
        "concept": {
            "duration_seconds": metas.get("concept", {}).get("duration_seconds"),
            "caption_source": metas.get("concept", {}).get("outputs", {}).get("caption_source"),
        },

        # Song
        "song": {
            "duration_seconds": song.get("duration_seconds"),
            "takes": len(song.get("outputs", {}).get("takes", [])) or None,
        },

        # Video
        "video": {
            "duration_seconds": vid.get("duration_seconds"),
            "mode": vid.get("inputs", {}).get("settings_used", {}).get("video_mode"),
        },

        # Assembly
        "assembly": {
            "duration_seconds": asm.get("duration_seconds"),
            "final_video_duration_seconds": asm.get("outputs", {}).get("duration_seconds"),
            "lufs": asm_report.get("normalized_lufs"),
        },

        # Bookend
        "bookend": {
            "duration_seconds": bke.get("duration_seconds"),
            "voice_id": bke_tts.get("voice_id"),
            "tts_language": bke_tts.get("language_code"),
        },

        # LoRA
        "lora": {
            "path": song_lora.get("path"),
            "strength": song_lora.get("strength"),
            "trigger_phrase": song_lora.get("trigger_phrase"),
        } if song_lora.get("active") else None,

        "profile_used": profile_name,
    }


# ─── Upload Logic ─────────────────────────────────────────────────────────────

async def upload_results(
    word_record: dict[str, Any],
    word_dir: Path,
    manifest_data: Any,
    user_id: str,
    deck_id: str,
    word_slug_override: str | None = None,
) -> bool:
    """Upload final video + thumbnail to Supabase Storage, update word record."""
    word_slug = word_slug_override or word_record.get("word_slug") or word_dir.name

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
            sb.storage.from_("videos").upload(
                storage_video_key, f.read(),
                file_options={"content-type": "video/mp4", "upsert": "true"},
            )
        if thumb_path.exists():
            with open(thumb_path, "rb") as f:
                sb.storage.from_("videos").upload(
                    storage_thumb_key, f.read(),
                    file_options={"content-type": "image/jpeg", "upsert": "true"},
                )
    except Exception as e:
        log.error("Upload failed for %s: %s", storage_video_key, e)
        return None, None

    video_url = sb.storage.from_("videos").get_public_url(storage_video_key)
    thumb_url = sb.storage.from_("videos").get_public_url(storage_thumb_key) if thumb_path.exists() else None
    return video_url, thumb_url


async def upload_ab_results(
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

    # ── Version A (required) ──
    video_a = _resolve_final_video(word_dir, manifest_a)
    if not video_a:
        log.error("No final video for version A (%s)", word_slug)
        return False

    video_url_a, thumb_url_a = _upload_video_and_thumb(
        video_a, word_dir,
        f"{prefix}/video.mp4", f"{prefix}/thumb.jpg",
    )
    if not video_url_a:
        return False

    # ── Version B (optional) ──
    video_url_b, thumb_url_b = None, None
    if manifest_b is not None:
        video_b = _resolve_final_video(word_dir, manifest_b)
        if video_b:
            video_url_b, thumb_url_b = _upload_video_and_thumb(
                video_b, word_dir,
                f"{prefix}/video_b.mp4", f"{prefix}/thumb_b.jpg",
                thumb_suffix="_b",
            )
            if not video_url_b:
                log.warning("Version B upload failed for %s — continuing with A only", word_slug)

    # ── Update word record ──
    update_data: dict[str, Any] = {
        "status": "complete",
        "video_url": video_url_a,
    }
    if thumb_url_a:
        update_data["thumbnail_url"] = thumb_url_a
    # Always write B fields: set URLs if B exists, null them out if not
    # (prevents stale B URLs persisting from a previous generation)
    update_data["video_url_b"] = video_url_b
    update_data["thumbnail_url_b"] = thumb_url_b

    sb.table("words").update(update_data).eq("id", word_record["id"]).execute()
    return True


# ─── Suno Bake-In ─────────────────────────────────────────────────────────────

async def bake_suno_into_word(
    workspace_path: Path,
    word_dir: Path,
    word_slug: str,
    word_record: dict[str, Any],
    suno_settings: dict[str, Any],
    bookend_defaults: dict[str, Any],
    skip_suno_guard: bool = False,
) -> dict[str, Any]:
    """
    Generate Suno audio, trim, run assembly+bookend for one word.

    Does NOT call upload_ab_results() — callers handle upload themselves.

    Args:
        skip_suno_guard: If False, skips generation when suno_audio_url already
            exists on the word record (prevents double billing on normal pipeline
            re-runs). Set True for explicit retry jobs.

    Returns:
        success (bool): True if Suno bake-in completed and produced manifests.
        suno_ab_manifests (dict): {"a": manifest, "b": manifest} on success.
        error (str | None): Human-readable error message on failure.
    """
    user_id = word_record["user_id"]
    deck_id = word_record["deck_id"]

    # Guard: skip if suno_audio_url already set (prevents double billing on re-runs)
    if not skip_suno_guard and word_record.get("suno_audio_url"):
        log.info("  [Suno] Skipping bake-in: suno_audio_url already set for %s", word_slug)
        return {"success": False, "suno_ab_manifests": {}, "error": "already_set"}

    # Step 1: Generate Suno audio (or re-poll an existing task from a previous timeout)
    existing_task_id = word_record.get("suno_task_id")
    suno_result: dict[str, Any] | None = None

    if existing_task_id and not word_record.get("suno_audio_url"):
        # A task ID is stored but no audio URL — the task may have completed after a timeout
        log.info("  [Suno] Re-polling existing task %s for %s", existing_task_id, word_slug)
        try:
            repoll = await fetch_existing_task(existing_task_id)
            if repoll["status"] == "success":
                log.info("  [Suno] Existing task %s complete — skipping new generation", existing_task_id)
                suno_result = repoll
            elif repoll["status"] == "pending":
                log.info("  [Suno] Task %s still in progress on kie.ai — generating fresh", existing_task_id)
            else:
                log.info("  [Suno] Task %s failed/expired (%s) — generating fresh",
                         existing_task_id, repoll.get("error", ""))
        except Exception as _rp_e:
            log.warning("  [Suno] Re-poll failed: %s — generating fresh", _rp_e)

    if suno_result is None or suno_result.get("status") != "success":
        log.info("  [Suno] Generating audio for %s", word_slug)
        try:
            suno_result = await suno_generate_song(
                str(workspace_path.parent), user_id, deck_id, word_slug
            )
        except Exception as _e:
            log.error("  [Suno] Generation failed: %s", _e)
            return {"success": False, "suno_ab_manifests": {}, "error": str(_e)}

    # Step 2: Download and validate audio
    if not (suno_result and suno_result.get("status") == "success"):
        error_msg = suno_result.get("error") if suno_result else "no result from Suno"
        log.warning("  [Suno] Generation failed: %s", error_msg)
        return {"success": False, "suno_ab_manifests": {}, "error": error_msg}

    audio_url_a = suno_result.get("audio_url")
    audio_url_b = suno_result.get("audio_url_b")

    if not audio_url_a:
        msg = "Suno API returned status=success but no audio URL"
        log.warning("  [Suno] %s", msg)
        return {"success": False, "suno_ab_manifests": {}, "error": msg}

    suno_dir = word_dir / "songs" / "suno"
    suno_dir.mkdir(parents=True, exist_ok=True)

    try:
        path_a = await download_suno_audio(audio_url_a, suno_dir / "suno_a.mp3")
        path_b = await download_suno_audio(audio_url_b, suno_dir / "suno_b.mp3") \
                 if audio_url_b else None

        manifest_snap = read_manifest(word_dir)
        video_version = manifest_snap.selected.video
        if not video_version:
            raise ValueError("No video version selected in manifest")

        clip_duration = _probe_clip_durations(word_dir / "videos" / video_version)
        suno_duration_a = _probe_audio_duration(path_a)
        if suno_duration_a < SUNO_MIN_USABLE_DURATION:
            msg = (f"Suno audio too short to be usable "
                   f"({suno_duration_a:.1f}s < {SUNO_MIN_USABLE_DURATION}s)")
            log.warning("  [Suno] %s", msg)
            return {"success": False, "suno_ab_manifests": {}, "error": msg}
        if suno_duration_a > SUNO_MAX_USABLE_DURATION:
            msg = (f"Track A rejected: {suno_duration_a:.1f}s exceeds max "
                   f"{SUNO_MAX_USABLE_DURATION}s")
            log.warning("  [Suno] %s", msg)
            return {"success": False, "suno_ab_manifests": {}, "error": msg}

        if suno_duration_a < clip_duration:
            log.info("  [Suno] Audio shorter than video (%.1fs < %.1fs) — "
                     "will trim video to match", suno_duration_a, clip_duration)

        log.info("  [Suno] Audio ready: %.1fs clips", clip_duration)

    except Exception as _dl_e:
        log.error("  [Suno] Download/probe failed: %s", _dl_e)
        return {"success": False, "suno_ab_manifests": {}, "error": str(_dl_e)}

    # Step 3: Trim audio
    outro_mode = suno_settings.get("outro_mode", "fade_out")
    fade_tail = float(suno_settings.get("fade_tail_duration", 2.5))

    from src.manifest import update_settings as _update_settings

    try:
        if outro_mode == "fade_out":
            def _fade_params(dur: float) -> tuple[float, float, float]:
                """Return (trim_to, fade_start, actual_fade) for a given duration.

                Three cases:
                - Normal: audio long enough for full fade tail beyond video end
                - Medium: audio covers the video but not the full fade tail
                - Short: audio shorter than the video itself
                """
                if fade_tail == 0:
                    # User explicitly wants no fade — respect it at all durations
                    return min(dur, clip_duration), min(dur, clip_duration), 0
                if dur >= clip_duration + fade_tail:
                    # Normal: full fade tail in the overflow zone
                    return clip_duration + fade_tail, clip_duration, fade_tail
                if dur >= clip_duration:
                    # Medium: covers video but not full tail — place short fade
                    # before clip_duration so it survives the assembly trim
                    micro = min(0.5, fade_tail, dur - clip_duration + 0.5)
                    return clip_duration, clip_duration - micro, micro
                # Short: audio shorter than video — assembly trims video to match
                actual = min(0.5, dur * 0.05)
                return dur, dur - actual, actual

            trim_to_a, fade_start_a, actual_fade_a = _fade_params(suno_duration_a)
            trimmed_a = _trim_suno_mp3(path_a, suno_dir / "take_suno_a.mp3",
                                       trim_to_a, fade_start_a, actual_fade_a)
            if path_b:
                suno_duration_b = _probe_audio_duration(path_b)
                if suno_duration_b < SUNO_MIN_USABLE_DURATION:
                    log.info("  [Suno] Track B too short (%.1fs < %ss) — "
                             "skipping B, using A only",
                             suno_duration_b, SUNO_MIN_USABLE_DURATION)
                    trimmed_b = None
                elif suno_duration_b > SUNO_MAX_USABLE_DURATION:
                    log.warning("  [Suno] Track B rejected: %.1fs exceeds max %.1fs — "
                                "using A only", suno_duration_b, SUNO_MAX_USABLE_DURATION)
                    trimmed_b = None
                else:
                    trim_to_b, fade_start_b, actual_fade_b = _fade_params(suno_duration_b)
                    trimmed_b = _trim_suno_mp3(path_b, suno_dir / "take_suno_b.mp3",
                                               trim_to_b, fade_start_b, actual_fade_b)
            else:
                trimmed_b = None
        else:  # clean_cut — trim to exact clip duration with micro-fade to avoid click
            _fade_start = max(0.0, clip_duration - 0.1)
            trimmed_a = _trim_suno_mp3(path_a, suno_dir / "take_suno_a.mp3",
                                       clip_duration, _fade_start, 0.1)
            trimmed_b = _trim_suno_mp3(path_b, suno_dir / "take_suno_b.mp3",
                                       clip_duration, _fade_start, 0.1) \
                        if path_b else None
    except Exception as e:
        log.warning("  [Suno] Trim failed: %s — proceeding with ACE-Step", e)
        return {"success": False, "suno_ab_manifests": {}, "error": str(e)}

    suno_takes = [("a", trimmed_a)]
    if trimmed_b:
        suno_takes.append(("b", trimmed_b))

    # Step 4: Assembly + Bookend
    suno_assembled_labels: set[str] = set()
    suno_assembly_finals: dict[str, str] = {}
    suno_ab_manifests: dict[str, Any] = {}
    _assembly_a_failed = False

    try:
        # Pass 1: Assemblies
        for label, mp3_path in suno_takes:
            song_version = f"suno/{mp3_path.name}"
            update_selection(word_dir, "song", song_version)

            asm_overrides: dict[str, Any] = {
                "silence_trim": False,
                "lufs_normalize": False,
                "gap_strategy": "word_card",
                "overflow_strategy": "trim",
                "word_card_show_translation": True,
                "word_card_font": bookend_defaults.get("font", "Bebas Neue"),
                "word_card_font_size": min(144, int(bookend_defaults.get("font_size", 92))),
            }
            _update_settings(word_dir, "assembly", asm_overrides)

            asm_ok = False
            for attempt in range(MAX_RETRIES + 1):
                try:
                    log.info("  === Suno %s assembly (attempt %d) ===",
                             label.upper(), attempt + 1)
                    await run_stage(workspace_path, word_slug, "assembly")
                    asm_ok = True
                    break
                except Exception as e:
                    log.warning("  [Suno %s] assembly attempt %d failed: %s",
                                label.upper(), attempt + 1, e)

            if asm_ok:
                suno_assembled_labels.add(label)
                suno_assembly_finals[label] = read_manifest(word_dir).selected.final or ""
            elif label == "a":
                log.error("  [Suno] Version A assembly failed")
                _assembly_a_failed = True
                break
            else:
                log.warning("  [Suno] Version B assembly failed — A only")

        # Pass 2: Bookends (only if Pass 1 version A succeeded)
        if not _assembly_a_failed:
            for label, _mp3 in suno_takes:
                if label not in suno_assembled_labels:
                    continue

                if label in suno_assembly_finals and suno_assembly_finals[label]:
                    update_selection(word_dir, "final", suno_assembly_finals[label])

                if outro_mode == "fade_out":
                    _update_settings(word_dir, "bookend", {"skip_outro": True})
                else:
                    _update_settings(word_dir, "bookend", {"outro_mode": "silent"})

                bk_ok = False
                for attempt in range(MAX_RETRIES + 1):
                    try:
                        log.info("  === Suno %s bookend (attempt %d) ===",
                                 label.upper(), attempt + 1)
                        await run_stage(workspace_path, word_slug, "bookend")
                        bk_ok = True
                        break
                    except Exception as e:
                        log.warning("  [Suno %s] bookend attempt %d failed: %s",
                                    label.upper(), attempt + 1, e)

                if not bk_ok:
                    log.warning("  [Suno %s] bookend failed — assembly fallback at upload",
                                label.upper())

                suno_ab_manifests[label] = read_manifest(word_dir)

    finally:
        # Always restore overrides — even if an exception occurred mid-loop
        _update_settings(word_dir, "assembly", {
            "silence_trim": None, "lufs_normalize": None, "gap_strategy": None,
            "overflow_strategy": None,
            "word_card_show_translation": None, "word_card_font": None, "word_card_font_size": None,
        })
        _update_settings(word_dir, "bookend", {"skip_outro": None, "outro_mode": None})

    if _assembly_a_failed:
        return {"success": False, "suno_ab_manifests": {}, "error": "Suno version A assembly failed"}

    return {"success": True, "suno_ab_manifests": suno_ab_manifests, "error": None}


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

    # Create word folder
    word_dir = create_word_folder(workspace_path, word_slug_val)
    enrichment_data = {
        "pos": enrichment.get("pos"),
        "article": enrichment.get("article"),
        "etymology": enrichment.get("etymology"),
        "mnemonic": enrichment.get("mnemonic"),
    }

    # Smart retry: check for existing manifest with completed stages
    manifest_file = word_dir / "manifest.json"
    is_smart_retry = False
    stages_to_run: list[str] = list(STAGE_ORDER)

    if manifest_file.exists():
        try:
            existing_manifest = read_manifest(word_dir)
            # Resolve bookend enabled from workspace defaults + word settings
            _defaults = load_defaults(workspace_path)
            _be = {**_defaults.get('bookend', {}), **existing_manifest.settings.get('bookend', {})}
            bookend_on = _be.get('enabled', True)

            incomplete = get_incomplete_stages(word_dir, existing_manifest, bookend_on)

            if incomplete and len(incomplete) < len(STAGE_ORDER):
                skipped = [s for s in STAGE_ORDER if s not in incomplete]
                log.info("  Smart retry: running %s, skipping %s", incomplete, skipped)
                stages_to_run = incomplete
                is_smart_retry = True
            else:
                log.info("  Manifest exists but all stages incomplete — full run")
                stages_to_run = list(STAGE_ORDER)
        except Exception as e:
            log.warning("  Failed to read existing manifest: %s — creating fresh", e)
            create_manifest(
                word_dir=word_dir,
                word_original=word_text,
                word_slug=word_slug_val,
                translation=translation,
                language=language,
                language_code=lang_code,
                enrichment_data=enrichment_data,
            )
    else:
        create_manifest(
            word_dir=word_dir,
            word_original=word_text,
            word_slug=word_slug_val,
            translation=translation,
            language=language,
            language_code=lang_code,
            enrichment_data=enrichment_data,
        )

    # Run shared pipeline stages (images, concept, song, video) with retry
    AB_STAGES = {'assembly', 'bookend'}
    pipeline_start = time.monotonic()

    suno_settings = load_defaults(workspace_path).get("suno", {})
    suno_enabled = suno_settings.get("enabled", False)

    for stage in stages_to_run:
        if stage in AB_STAGES:
            continue  # Handled by A/B loop below

        # When Suno is enabled, force ACE-Step to single take — it's now just a fallback
        if stage == "song" and suno_enabled:
            from src.manifest import update_settings
            update_settings(word_dir, "song", {"batch_size": 1})

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
                    # Read current settings (defaults + per-word overrides) to inform fallback
                    try:
                        _defaults = load_defaults(workspace_path)
                        _manifest = read_manifest(word_dir)
                        _stage_defaults = _defaults.get(stage, {})
                        _stage_overrides = _manifest.settings.get(stage, {})
                        _stage_settings = {**_stage_defaults, **_stage_overrides}
                    except Exception:
                        _stage_settings = None
                    overrides = get_fallback_overrides(stage, attempt + 1, _stage_settings)
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

        # After song: clear the batch_size=1 override so re-runs without Suno use the
        # workspace default (typically 2 takes).
        if stage == "song" and suno_enabled:
            from src.manifest import update_settings
            update_settings(word_dir, "song", {"batch_size": None})

    # ── Suno bake-in ─────────────────────────────────────────────────────────
    suno_ab_manifests: dict[str, Any] = {}

    if suno_enabled:
        _bake_result = await bake_suno_into_word(
            workspace_path=workspace_path,
            word_dir=word_dir,
            word_slug=word_slug_val,
            word_record=word_record,
            suno_settings=suno_settings,
            bookend_defaults=load_defaults(workspace_path).get("bookend", {}),
            skip_suno_guard=False,
        )
        suno_ab_manifests = _bake_result.get("suno_ab_manifests", {})
        if not _bake_result["success"]:
            log.info("  [Suno] Bake-in did not produce audio — proceeding with ACE-Step")
            if "timed out" in (_bake_result.get("error") or "").lower():
                # kie.ai may finish the task after the polling window — queue one deferred retry
                try:
                    sb.table("generation_jobs").insert({
                        "user_id": job["user_id"],
                        "deck_id": job["deck_id"],
                        "job_type": "suno_retry",
                        "target_word_id": word_record["id"],
                        "priority": -2,  # Below manual retries (-1)
                        "status": "approved",
                        "settings": {},
                    }).execute()
                    log.info("  [Suno] Auto-queued deferred retry for word %s", word_record["id"])
                except Exception as _q_e:
                    log.warning("  [Suno] Failed to auto-queue retry: %s", _q_e)

    # ── Assembly + Bookend (ACE-Step path) ───────────────────────────────────
    ab_manifests: dict[str, Any] = {}
    take_a: str | None = None
    take_b: str | None = None

    if not suno_ab_manifests:
        # ── ACE-STEP PATH (Suno disabled, failed, or Suno A assembly failed) ──
        # Standard two-pass A/B pipeline. When Suno is enabled, force single take
        # (take_b=None) — Suno is primary; generating 2 ACE-Step takes wastes GPU.
        manifest_data = read_manifest(word_dir)
        takes = get_song_takes(word_dir, manifest_data)
        take_a = takes[0] if takes else None
        take_b = None if suno_enabled else (takes[1] if len(takes) >= 2 else None)

        ab_stages_to_run = [s for s in ('assembly', 'bookend') if s in stages_to_run]

        # Resolve bookend-enabled for version B fallback (when smart retry skips A/B stages)
        _defaults_ab = load_defaults(workspace_path)
        _be_ab = {**_defaults_ab.get('bookend', {}), **manifest_data.settings.get('bookend', {})}
        _bookend_on = _be_ab.get('enabled', True)
        _full_ab_stages = ['assembly', 'bookend'] if _bookend_on else ['assembly']

        _assembled_labels: set[str] = set()     # labels with a successful assembly
        _assembly_finals: dict[str, str] = {}   # label -> selected.final version name

        # ── Pass 1: Assemblies ───────────────────────────────────────────────────
        for label, take in [('a', take_a), ('b', take_b)]:
            if take is None:
                continue

            # Determine which stages this label needs (mirrors original per-label logic)
            stages_for_label = list(ab_stages_to_run)
            if not stages_for_label and label == 'b':
                # B always needs assembly+bookend (never ran before)
                stages_for_label = list(_full_ab_stages)

            # Smart retry: A already complete — snapshot manifest and skip both passes
            if not stages_for_label and label == 'a':
                log.info("  === Version A: already complete (smart retry) ===")
                ab_manifests['a'] = read_manifest(word_dir)
                _assembled_labels.add('a')
                continue

            if 'assembly' not in stages_for_label:
                # Assembly already done for this label (smart retry, only bookend needed)
                _assembled_labels.add(label)
                continue

            log.info("  === Version %s assembly: %s ===", label.upper(), take)
            update_selection(word_dir, 'song', take)

            assembly_ok = False
            for attempt in range(MAX_RETRIES + 1):
                try:
                    log.info("    [%s] Stage assembly (attempt %d)", label.upper(), attempt + 1)
                    await run_stage(workspace_path, word_slug_val, 'assembly')
                    assembly_ok = True
                    break
                except Exception as e:
                    log.warning("    [%s] Stage assembly attempt %d failed: %s",
                                label.upper(), attempt + 1, e)
                    if attempt < MAX_RETRIES:
                        try:
                            _defaults = load_defaults(workspace_path)
                            _manifest = read_manifest(word_dir)
                            _stage_defaults = _defaults.get('assembly', {})
                            _stage_overrides = _manifest.settings.get('assembly', {})
                            _stage_settings = {**_stage_defaults, **_stage_overrides}
                        except Exception:
                            _stage_settings = None
                        overrides = get_fallback_overrides('assembly', attempt + 1, _stage_settings)
                        if overrides:
                            log.info("    [%s] Retrying assembly with fallback: %s",
                                     label.upper(), overrides)
                            from src.manifest import update_settings
                            update_settings(word_dir, 'assembly', overrides)

            if assembly_ok:
                _assembled_labels.add(label)
                # Snapshot selected.final immediately so Pass 2 can restore it before
                # running bookend (prevents take_b's assembly from overwriting take_a's).
                _assembly_finals[label] = read_manifest(word_dir).selected.final or ''
            elif label == 'a':
                log.error("  Word %s: version A assembly failed", word_slug_val)
                sb.table("words").update({
                    "status": "failed",
                    "error_message": "Failed at assembly (version A)",
                    "retry_count": MAX_RETRIES + 1,
                }).eq("id", word_record["id"]).execute()
                sb.rpc("refund_credit", {"user_id_param": job["user_id"]}).execute()
                sb.table("generation_jobs").update({
                    "words_failed": job.get("words_failed", 0) + 1,
                }).eq("id", job["id"]).execute()
                return False
            else:
                # Version B assembly failed — degrade gracefully, continue with A only
                log.warning("  Version B assembly failed for %s — continuing with A only",
                            word_slug_val)

        # ── Pass 2: Bookends ─────────────────────────────────────────────────────
        for label, take in [('a', take_a), ('b', take_b)]:
            if label not in _assembled_labels:
                continue  # take was None, or Version B assembly failed

            stages_for_label = list(ab_stages_to_run)
            if not stages_for_label and label == 'b':
                stages_for_label = list(_full_ab_stages)

            if not stages_for_label:
                # Smart retry: A already complete, manifest already snapshotted in Pass 1
                continue

            if 'bookend' not in stages_for_label:
                # Bookend disabled or not needed — snapshot manifest after assembly
                ab_manifests[label] = read_manifest(word_dir)
                continue

            # Restore selected.final to this label's assembly version before running
            # bookend. Required because Pass 1 leaves the manifest pointing to the
            # last assembly (take_b), which would cause take_a's bookend to use the
            # wrong assembled video. Only applies when assembly actually ran in Pass 1.
            if label in _assembly_finals and _assembly_finals[label]:
                update_selection(word_dir, 'final', _assembly_finals[label])

            log.info("  === Version %s bookend ===", label.upper())

            bookend_ok = False
            for attempt in range(MAX_RETRIES + 1):
                try:
                    log.info("    [%s] Stage bookend (attempt %d)", label.upper(), attempt + 1)
                    await run_stage(workspace_path, word_slug_val, 'bookend')
                    bookend_ok = True
                    break
                except Exception as e:
                    log.warning("    [%s] Stage bookend attempt %d failed: %s",
                                label.upper(), attempt + 1, e)
                    if attempt < MAX_RETRIES:
                        try:
                            _defaults = load_defaults(workspace_path)
                            _manifest = read_manifest(word_dir)
                            _stage_defaults = _defaults.get('bookend', {})
                            _stage_overrides = _manifest.settings.get('bookend', {})
                            _stage_settings = {**_stage_defaults, **_stage_overrides}
                        except Exception:
                            _stage_settings = None
                        overrides = get_fallback_overrides('bookend', attempt + 1, _stage_settings)
                        if overrides:
                            log.info("    [%s] Retrying bookend with fallback: %s",
                                     label.upper(), overrides)
                            from src.manifest import update_settings
                            update_settings(word_dir, 'bookend', overrides)

            if not bookend_ok:
                log.warning("    [%s] Bookend failed for %s — assembly fallback will be used at upload",
                            label.upper(), word_slug_val)

            # Snapshot manifest whether bookend succeeded or not.
            # _resolve_final_video() picks bookend if present, otherwise falls back to assembly.
            ab_manifests[label] = read_manifest(word_dir)

    # ── Collect metadata and upload ──────────────────────────────────────────
    pipeline_duration = time.monotonic() - pipeline_start
    word_metadata = None
    try:
        word_metadata = collect_word_metadata(
            word_dir, job.get("profile_used"), pipeline_duration,
        )
    except Exception as e:
        log.warning("  Metadata collection failed for %s: %s", word_slug_val, e)

    # Annotate metadata with smart retry and A/B info
    if word_metadata:
        if is_smart_retry:
            word_metadata["smart_retry"] = True
            word_metadata["stages_skipped"] = [s for s in STAGE_ORDER if s not in stages_to_run]
        word_metadata["ab_takes"] = {
            "a": "suno_a" if suno_ab_manifests else take_a,
            "b": ("suno_b" if "b" in suno_ab_manifests else None)
                 if suno_ab_manifests else (take_b if take_b and 'b' in ab_manifests else None),
        }

    # Determine which manifests to upload (Suno path or ACE-Step path)
    if suno_ab_manifests:
        _upload_manifest_a = suno_ab_manifests.get("a", read_manifest(word_dir))
        _upload_manifest_b = suno_ab_manifests.get("b")
    else:
        _upload_manifest_a = ab_manifests.get("a", read_manifest(word_dir))
        _upload_manifest_b = ab_manifests.get("b")

    # Upload A/B results
    uploaded = await upload_ab_results(
        word_record, word_dir, job["user_id"], job["deck_id"],
        word_slug_val,
        manifest_a=_upload_manifest_a,
        manifest_b=_upload_manifest_b,
    )
    if not uploaded:
        sb.table("words").update({
            "status": "failed",
            "error_message": "Upload failed",
        }).eq("id", word_record["id"]).execute()
        sb.rpc("refund_credit", {"user_id_param": job["user_id"]}).execute()
        return False

    # Write metadata to Supabase (after successful upload)
    if word_metadata:
        try:
            sb.table("words").update({
                "metadata": word_metadata,
            }).eq("id", word_record["id"]).execute()
        except Exception as e:
            log.warning("  Failed to write metadata for %s: %s", word_slug_val, e)

    # Update job progress
    current_completed = sb.table("generation_jobs").select("words_completed") \
        .eq("id", job["id"]).single().execute().data.get("words_completed", 0)
    sb.table("generation_jobs").update({
        "words_completed": current_completed + 1,
    }).eq("id", job["id"]).execute()

    log.info("  Word %s complete", word_slug_val)

    return True


# ─── Suno Retry Job ──────────────────────────────────────────────────────────

async def process_suno_retry_job(job: dict[str, Any]) -> None:
    """Process a suno_retry job from the queue.

    Looks up the target word, validates disk prerequisites, calls
    bake_suno_into_word(), uploads the result, and updates both the
    word record and the job record in Supabase.
    """
    job_id = job["id"]
    word_id = job.get("target_word_id")

    log.info("[SunoRetry] Processing job %s for word %s", job_id, word_id)

    sb.table("generation_jobs").update({
        "status": "processing",
        "started_at": datetime.now(timezone.utc).isoformat(),
    }).eq("id", job_id).execute()

    try:
        if not word_id:
            raise ValueError("Job has no target_word_id")

        # Fetch word record
        word_resp = sb.table("words").select("*").eq("id", word_id).single().execute()
        word = word_resp.data
        if not word:
            raise ValueError(f"Word {word_id} not found in Supabase")

        user_id = word["user_id"]
        deck_id = word["deck_id"]
        word_slug = word["word_slug"]

        if not word_slug:
            raise ValueError(f"Word {word_id} has no word_slug — cannot locate workspace directory")

        # Build workspace paths — must match process_word()/process_job() exactly
        workspace_path = WORKSPACE_ROOT / f"cloud_{user_id}_{deck_id}"
        word_dir = workspace_path / word_slug

        # Validate prerequisites
        if not word_dir.exists():
            raise FileNotFoundError(
                f"Word directory not found: {word_dir}. "
                "The workspace may have been cleaned up — re-generate the word to retry."
            )
        if not (word_dir / "manifest.json").exists():
            raise FileNotFoundError(f"Manifest not found in {word_dir}")
        if not (workspace_path / "settings-defaults.json").exists():
            raise FileNotFoundError(f"settings-defaults.json not found in {workspace_path}")

        # Load settings
        defaults = load_defaults(workspace_path)
        suno_settings = defaults.get("suno", {})
        bookend_defaults = defaults.get("bookend", {})

        if not suno_settings.get("enabled", False):
            raise ValueError(
                "Suno is not enabled in this workspace's settings-defaults.json. "
                "Enable suno.enabled before retrying."
            )

        # Run Suno bake-in
        bake_result = await bake_suno_into_word(
            workspace_path=workspace_path,
            word_dir=word_dir,
            word_slug=word_slug,
            word_record=word,
            suno_settings=suno_settings,
            bookend_defaults=bookend_defaults,
            skip_suno_guard=True,  # Retry: always re-generate even if suno_audio_url exists
        )

        if not bake_result["success"]:
            raise RuntimeError(bake_result.get("error") or "Suno bake-in failed")

        # Upload results
        suno_ab = bake_result["suno_ab_manifests"]
        manifest_a = suno_ab.get("a", read_manifest(word_dir))
        manifest_b = suno_ab.get("b")

        uploaded = await upload_ab_results(
            word, word_dir, user_id, deck_id, word_slug,
            manifest_a=manifest_a,
            manifest_b=manifest_b,
        )
        if not uploaded:
            raise RuntimeError("upload_ab_results() failed for Suno retry")

        sb.table("generation_jobs").update({
            "status": "complete",
            "words_completed": 1,
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", job_id).execute()
        log.info("[SunoRetry] Job %s completed successfully", job_id)

    except Exception as exc:
        log.error("[SunoRetry] Job %s failed: %s", job_id, exc, exc_info=True)
        sb.table("generation_jobs").update({
            "status": "failed",
            "words_failed": 1,
            "error_message": str(exc)[:500],
            "completed_at": datetime.now(timezone.utc).isoformat(),
        }).eq("id", job_id).execute()


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

    # Load only pending words for this deck (skip already-complete/failed ones)
    words_resp = sb.table("words").select("*") \
        .eq("deck_id", deck_id) \
        .eq("status", "pending") \
        .order("created_at") \
        .execute()
    words = words_resp.data or []

    if not words:
        log.error("No pending words found for deck %s", deck_id)
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
            "word": e.get("word_target", word_rec["word"]),
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

    # Update deck status based on ALL words in deck (not just this job's batch)
    all_words_resp = sb.table("words").select("status") \
        .eq("deck_id", deck_id).execute()
    all_statuses = [w["status"] for w in (all_words_resp.data or [])]

    if all(s == "complete" for s in all_statuses):
        deck_status = "complete"
    elif any(s == "complete" for s in all_statuses):
        deck_status = "partial"
    else:
        deck_status = "failed"
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
                .order("priority", desc=True) \
                .order("created_at") \
                .limit(1) \
                .execute()

            if not job_resp.data:
                log.debug("No approved jobs")
                await asyncio.sleep(POLL_INTERVAL)
                continue

            job = job_resp.data[0]
            if job.get("job_type") == "suno_retry":
                await process_suno_retry_job(job)
            else:
                await process_job(job)

        except KeyboardInterrupt:
            log.info("Shutting down")
            break
        except Exception as e:
            log.error("Error in main loop: %s", e, exc_info=True)
            await asyncio.sleep(POLL_INTERVAL)


if __name__ == "__main__":
    asyncio.run(main())
