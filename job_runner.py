"""
Resonance Cloud Job Runner

Polls Supabase for approved generation jobs and processes them
through the local pipeline. Runs as a separate process from the
orchestrator HTTP server.

CRITICAL: Never import from src.app — only from src.pipeline,
src.settings, src.manifest, src.workspace, src.slugify, src.dispatcher,
src.models, src.suno.
"""

from __future__ import annotations

import asyncio
import logging
import os
import re
import sys
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
from src.workspace import create_word_folder
from src.slugify import slugify, language_to_code
from src.dispatcher import check_all_engines
from src.services.enrichment import run_enrichment
from src.services.metadata import collect_word_metadata
from src.services.publishing import upload_ab_results
from src.services.stage_helpers import get_fallback_overrides, get_incomplete_stages
from src.services.suno_bakein import bake_suno_into_word
from src.suno import read_concept_data, submit_song
from src.storage import STORAGE_MODE, create_job_workspace, get_job_workspace_path, get_workspace_root
import httpx
from src.cost_logger import set_word_context, clear_word_context
from cloud_engines.video_engine.pod_manager import notify_upcoming_video, cancel_upcoming_video
from supabase import create_client, Client

# ─── Configuration ────────────────────────────────────────────────────────────

SUPABASE_URL = os.getenv("SUPABASE_URL", "")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_KEY", "")
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


# Maps wizard settings_override keys to their (stage, field) location in the
# per-engine settings tree. Keys not in this map are ignored (forward-compat
# for future wizard fields — unknown keys must not crash the runner).
SETTINGS_OVERRIDE_MAP: dict[str, tuple[str, str]] = {
    "genre": ("concept", "genre"),
    "creative_direction": ("images", "creative_direction"),
    "art_style": ("images", "art_style"),
    "visual_reference": ("images", "visual_reference"),
    "frame_narrative": ("images", "frame_narrative"),
}


def merge_settings(
    profile_settings: dict[str, Any],
    art_style: str | None,
    movie_override: str | None,
    settings_override: dict[str, Any] | None = None,
) -> dict[str, dict[str, Any]]:
    """
    Three-layer merge (lowest priority → highest priority):
      Layer 1: Hardcoded DEFAULT_SETTINGS + active language profile
      Layer 2: settings_override from the frontend wizard (user's engine picks)
      Layer 3: Legacy top-level art_style / movie_override fields (backward compat)
    Result is written once as settings-defaults.json for the deck workspace.
    """
    # Layer 1: Start with hardcoded defaults, overlay active profile
    merged: dict[str, dict[str, Any]] = {}
    for stage, defaults in DEFAULT_SETTINGS.items():
        profile_stage = profile_settings.get(stage, {})
        merged[stage] = {**defaults, **profile_stage}

    # Layer 2: Apply frontend wizard overrides (genre, creative_direction, ...)
    if settings_override:
        for key, value in settings_override.items():
            if value is None or value == "":
                continue
            mapping = SETTINGS_OVERRIDE_MAP.get(key)
            if mapping is None:
                log.debug("Unknown settings_override key %r — ignored", key)
                continue
            stage, field = mapping
            merged.setdefault(stage, {})[field] = value

    # Layer 3: Legacy user overrides (highest priority for backward compat)
    if art_style:
        merged.setdefault("images", {})["art_style"] = art_style
    if movie_override:
        merged.setdefault("images", {})["movie_override"] = movie_override
        # movie_override implies movie creative direction
        merged["images"]["creative_direction"] = "movie"

    return merged


# A/B Dual-Take Helpers


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



async def process_word(
    job: dict[str, Any],
    word_record: dict[str, Any],
    workspace_path: Path,
    enrichment: dict[str, Any],
) -> bool:
    """Process a single word (or short phrase) through the full pipeline. Returns True on success."""
    # For phrases, always use the original word from the DB, not the enrichment target
    # (enrichment may have extracted a single word from a phrase)
    original_word = word_record["word"]
    is_phrase = " " in original_word.strip()
    if is_phrase:
        raw_word_text = original_word
    else:
        raw_word_text = enrichment.get("word_target", original_word)
    # Normalize whitespace: strip ends, collapse internal runs (NBSP, tabs, double-space) to single space
    word_text = re.sub(r'\s+', ' ', raw_word_text.strip()) if isinstance(raw_word_text, str) else raw_word_text
    input_type = "phrase" if " " in word_text else "word"
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

    # Set cost tracking context for this word
    set_word_context(
        user_id=job["user_id"],
        deck_id=job["deck_id"],
        word_slug=word_slug_val,
        word_id=word_record.get("id"),
    )

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
                input_type=input_type,
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
            input_type=input_type,
        )

    # Run shared pipeline stages (images, concept, song, video) with retry
    AB_STAGES = {'assembly', 'bookend'}
    pipeline_start = time.monotonic()

    suno_settings = load_defaults(workspace_path).get("suno", {})
    suno_enabled = suno_settings.get("enabled", False)

    # Pipeline-driven pod pre-warm: trigger cold-start if video stage is
    # scheduled, so the pod warms in parallel with images/concept/song.
    # No-op when POD_PREWARM_ENABLED is false or in local storage mode.
    if "video" in stages_to_run:
        notify_upcoming_video(word_record["id"])

    for stage in stages_to_run:
        if stage in AB_STAGES:
            continue  # Handled by A/B loop below

        # Hand off pre-warm tracking to acquire_use (fired inside the video
        # adapter). Idempotent, safe if notify was never called.
        if stage == "video":
            cancel_upcoming_video(word_record["id"])

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
            # Release pre-warm tracking. Idempotent: no-op if already cancelled
            # at video-stage entry or never notified.
            cancel_upcoming_video(word_record["id"])

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
            clear_word_context()
            return False

        # After images: extract storyboard-generated mnemonic and write back to manifest + Supabase
        if stage == "images":
            try:
                images_manifest = read_manifest(word_dir)
                images_version = images_manifest.selected.images
                if images_version:
                    storyboard_path = word_dir / "images" / images_version / "storyboard.json"
                    if storyboard_path.exists():
                        import json as _json
                        storyboard_data = _json.loads(storyboard_path.read_text(encoding="utf-8"))
                        storyboard_mnemonic = storyboard_data.get("mnemonic_text")
                        if storyboard_mnemonic and isinstance(storyboard_mnemonic, str) and len(storyboard_mnemonic.strip()) > 10:
                            storyboard_mnemonic = storyboard_mnemonic.strip()
                            log.info("  Storyboard mnemonic: %s", storyboard_mnemonic[:80])
                            images_manifest.enrichment.mnemonic = storyboard_mnemonic
                            from src.manifest import write_manifest
                            write_manifest(word_dir, images_manifest)
                            sb.table("words").update({
                                "mnemonic": storyboard_mnemonic,
                            }).eq("id", word_record["id"]).execute()
            except Exception as _e:
                log.warning("  Failed to extract storyboard mnemonic: %s", _e)

        # After song: clear the batch_size=1 override so re-runs without Suno use the
        # workspace default (typically 2 takes).
        if stage == "song" and suno_enabled:
            from src.manifest import update_settings
            update_settings(word_dir, "song", {"batch_size": None})

        # After song: submit Suno task in parallel with video generation.
        # Bake-in's 3-state guard (completed / in-flight / not-started) picks
        # up whatever state this leaves behind, so this is safe to skip on
        # any error path (bake-in will fall back to fresh submit).
        if (
            stage == "song"
            and STORAGE_MODE == "cloud"
            and suno_enabled
            and success
        ):
            word_record_for_suno: dict[str, Any] = {}
            try:
                word_record_for_suno = (
                    sb.table("words")
                    .select("id, suno_task_id, suno_audio_url")
                    .eq("deck_id", job["deck_id"])
                    .eq("word_slug", word_slug_val)
                    .single()
                    .execute()
                    .data
                ) or {}
                if word_record_for_suno.get("suno_task_id"):
                    log.info(
                        "  [Song] Suno task %s already submitted for %s; skipping",
                        word_record_for_suno["suno_task_id"], word_slug_val,
                    )
                elif word_record_for_suno.get("suno_audio_url"):
                    log.info(
                        "  [Song] Suno already complete for %s; skipping submit",
                        word_slug_val,
                    )
                else:
                    log.info(
                        "  [Song] Submitting Suno task for %s (parallel generation)",
                        word_slug_val,
                    )
                    try:
                        concept_data = read_concept_data(word_dir)
                    except FileNotFoundError as _ce:
                        log.warning(
                            "  [Song] Concept file missing for %s (%s); bake-in will submit fresh",
                            word_slug_val, _ce,
                        )
                        concept_data = None
                    if concept_data is not None:
                        new_task_id = await submit_song(
                            job["deck_id"], word_slug_val, concept_data,
                        )
                        log.info(
                            "  [Song] Submitted Suno task %s for %s",
                            new_task_id, word_slug_val,
                        )
            except (httpx.TimeoutException, httpx.RequestError) as _e:
                log.warning(
                    "  [Song] Suno submit timeout/network error for %s; queueing suno_retry: %s",
                    word_slug_val, _e,
                )
                try:
                    sb.table("generation_jobs").insert({
                        "user_id": job["user_id"],
                        "deck_id": job["deck_id"],
                        "job_type": "suno_retry",
                        "target_word_id": word_record_for_suno.get("id") or word_record["id"],
                        "priority": -2,  # Below manual retries
                        "status": "approved",
                    }).execute()
                except Exception as _qe:
                    log.warning("  [Song] Failed to queue suno_retry: %s", _qe)
            except Exception as _e:
                log.warning(
                    "  [Song] Suno submit failed for %s (bake-in will fall back): %s",
                    word_slug_val, _e,
                )

    # ── Suno bake-in ─────────────────────────────────────────────────────────
    suno_ab_manifests: dict[str, Any] = {}

    if suno_enabled:
        _bake_result = await bake_suno_into_word(
            sb,
            workspace_path=workspace_path,
            word_dir=word_dir,
            word_slug=word_slug_val,
            word_record=word_record,
            suno_settings=suno_settings,
            bookend_defaults=load_defaults(workspace_path).get("bookend", {}),
            skip_suno_guard=False,
            max_retries=MAX_RETRIES,
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
        sb,
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
        clear_word_context()
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

    clear_word_context()
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
        workspace_path = get_job_workspace_path(user_id=user_id, deck_id=deck_id)
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
            sb,
            workspace_path=workspace_path,
            word_dir=word_dir,
            word_slug=word_slug,
            word_record=word,
            suno_settings=suno_settings,
            bookend_defaults=bookend_defaults,
            skip_suno_guard=True,  # Retry: always re-generate even if suno_audio_url exists
            max_retries=MAX_RETRIES,
        )

        if not bake_result["success"]:
            raise RuntimeError(bake_result.get("error") or "Suno bake-in failed")

        # Upload results
        suno_ab = bake_result["suno_ab_manifests"]
        manifest_a = suno_ab.get("a", read_manifest(word_dir))
        manifest_b = suno_ab.get("b")

        uploaded = await upload_ab_results(
            sb,
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

    # Merge settings. settings_override carries the wizard's engine-specific
    # picks (genre, creative_direction, ...) that the user chose on the frontend.
    settings_override = job.get("settings_override") or {}
    if settings_override:
        log.info("User settings_override: %s", settings_override)
    merged = merge_settings(
        profile_settings,
        job.get("art_style"),
        job.get("movie_override"),
        settings_override=settings_override,
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
        original_word = word_rec["word"]
        is_phrase = " " in original_word.strip()

        raw_tags = e.get("tags", "")
        if isinstance(raw_tags, list):
            tags_str = ", ".join(str(t) for t in raw_tags)
        else:
            tags_str = raw_tags or ""

        update_data: dict[str, Any] = {
            "translation": e.get("translation", ""),
            "mnemonic": e.get("mnemonic", ""),
            "etymology": e.get("etymology", ""),
            "pos": e.get("pos", ""),
            "article": e.get("article"),
            "synonyms": e.get("synonyms", "") or "",
            "ipa": e.get("ipa", "") or "",
            "example": e.get("example", "") or "",
            "example_gloss": e.get("example_gloss", "") or "",
            "tags": tags_str,
        }

        # Only overwrite the word column for single words
        # (spelling correction, target-language mapping).
        # Phrases must remain untouched to avoid the LLM
        # extracting a single word from a multi-word input.
        if not is_phrase:
            update_data["word"] = e.get("word_target", original_word)

        sb.table("words").update(update_data).eq("id", word_rec["id"]).execute()

    # Create workspace
    workspace_path = create_job_workspace(user_id=user_id, deck_id=deck_id)
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
    if STORAGE_MODE == "cloud":
        # Cloud cleanup deferred - suno retry may still need this workspace.
        pass
    elif CLEANUP_WORKSPACES and workspace_path.exists():
        import shutil
        shutil.rmtree(workspace_path, ignore_errors=True)
        log.info("Cleaned up workspace: %s", workspace_path)


# ─── Main Loop ────────────────────────────────────────────────────────────────

async def main() -> None:
    log.info("Resonance Job Runner starting")
    log.info("Supabase: %s", SUPABASE_URL)
    log.info("Workspace root: %s", get_workspace_root())
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
