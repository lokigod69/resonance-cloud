"""Suno audio generation, trimming, and re-assembly into word videos."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any

from src.manifest import read_manifest, update_selection
from src.pipeline import run_stage
from src.services.events import write_event_row
from src.path_safety import validate_word_slug, validate_workspace_component
from src.suno import (
    _write_to_supabase as suno_write_to_supabase,
    download_suno_audio,
    fetch_existing_task,
    generate_song as suno_generate_song,
)

log = logging.getLogger(__name__)

SUNO_MIN_USABLE_DURATION = 12.0
SUNO_MAX_USABLE_DURATION = 150.0  # 2.5 minutes — reject glitched ultra-long Suno tracks


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


def _upload_suno_to_storage(
    sb_client,
    user_id: str,
    deck_id: str,
    word_slug: str,
    word_id: str,
    path_a: Path,
    path_b: Path | None,
) -> None:
    """Upload raw Suno MP3s to Supabase Storage and write permanent URLs to words table."""
    storage_prefix = "/".join((
        validate_workspace_component(user_id, label="user_id"),
        validate_workspace_component(deck_id, label="deck_id"),
        validate_word_slug(word_slug),
    ))
    update: dict[str, str | None] = {}

    # Track A
    storage_key_a = f"{storage_prefix}/suno_a.mp3"
    with open(path_a, "rb") as f:
        sb_client.storage.from_("audio").upload(
            storage_key_a, f.read(),
            file_options={"content-type": "audio/mpeg", "upsert": "true"},
        )
    update["suno_storage_url"] = sb_client.storage.from_("audio").get_public_url(storage_key_a)

    # Track B (if present)
    if path_b and path_b.exists():
        storage_key_b = f"{storage_prefix}/suno_b.mp3"
        with open(path_b, "rb") as f:
            sb_client.storage.from_("audio").upload(
                storage_key_b, f.read(),
                file_options={"content-type": "audio/mpeg", "upsert": "true"},
            )
        update["suno_storage_url_b"] = sb_client.storage.from_("audio").get_public_url(storage_key_b)
    else:
        update["suno_storage_url_b"] = None

    sb_client.table("words").update(update).eq("id", word_id).execute()
    log.info("  [Suno] Uploaded permanent audio to Supabase Storage for %s", word_slug)


async def bake_suno_into_word(
    sb_client,
    workspace_path: Path,
    word_dir: Path,
    word_slug: str,
    word_record: dict[str, Any],
    suno_settings: dict[str, Any],
    bookend_defaults: dict[str, Any],
    skip_suno_guard: bool = False,
    max_retries: int = 2,
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
        write_event_row(
            stage="suno_bakein",
            sub_step="bake_suno",
            status="skipped",
            event_source="suno_bakein",
            word_id=word_record.get("id"),
            deck_id=deck_id,
            user_id=user_id,
            job_id=word_record.get("generation_job_id"),
            model_provider="kie_ai",
            model_name="suno_v5_5",
            metadata={"reason": "already_baked"},
        )
        return {"success": False, "suno_ab_manifests": {}, "error": "already_set"}

    # Step 1: Generate Suno audio (or re-poll an existing task from a previous timeout)
    existing_task_id = word_record.get("suno_task_id")
    suno_result: dict[str, Any] | None = None

    if existing_task_id and not word_record.get("suno_audio_url"):
        # A task ID is stored but no audio URL — the task may have completed after a timeout
        log.info("  [Suno] Re-polling existing task %s for %s", existing_task_id, word_slug)
        try:
            write_event_row(
                stage="suno_bakein",
                sub_step="poll_resumed",
                status="success",
                event_source="suno_bakein",
                word_id=word_record.get("id"),
                deck_id=deck_id,
                user_id=user_id,
                job_id=word_record.get("generation_job_id"),
                model_provider="kie_ai",
                model_name="suno_v5_5",
                request_id=existing_task_id,
                metadata={"reason": "existing_task_id", "task_id": existing_task_id},
            )
            repoll = await fetch_existing_task(
                existing_task_id,
                word_id=word_record.get("id"),
                deck_id=deck_id,
                user_id=user_id,
                job_id=word_record.get("generation_job_id"),
            )
            if repoll["status"] == "success":
                log.info("  [Suno] Existing task %s complete — skipping new generation", existing_task_id)
                suno_result = repoll
                # Persist CDN URLs to DB (fetch_existing_task does not write to Supabase)
                suno_write_to_supabase(
                    deck_id, word_slug,
                    repoll["audio_url"], existing_task_id,
                    repoll.get("audio_url_b"),
                )
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
                word_dir, deck_id, word_slug,
                word_id=word_record.get("id"),
                user_id=user_id,
                job_id=word_record.get("generation_job_id"),
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

        # Persist raw MP3s to Supabase Storage (permanent URLs)
        try:
            _upload_suno_to_storage(
                sb_client=sb_client,
                user_id=user_id,
                deck_id=deck_id,
                word_slug=word_slug,
                word_id=word_record["id"],
                path_a=path_a,
                path_b=path_b,
            )
        except Exception as _upload_err:
            log.warning("  [Suno] Storage upload failed (non-fatal): %s", _upload_err)

        manifest_snap = read_manifest(word_dir)
        video_version = manifest_snap.selected.video
        if not video_version:
            raise ValueError("No video version selected in manifest")

        clip_duration = _probe_clip_durations(word_dir / "videos" / video_version)
        suno_duration_a = _probe_audio_duration(path_a)
        # Populated by the fade_out branch below when path_b exists; stays None
        # for clean_cut mode or when Track B wasn't probed (audio_probe event
        # accepts null here).
        suno_duration_b: float | None = None
        if suno_duration_a < SUNO_MIN_USABLE_DURATION:
            msg = (f"Suno audio too short to be usable "
                   f"({suno_duration_a:.1f}s < {SUNO_MIN_USABLE_DURATION}s)")
            log.warning("  [Suno] %s", msg)
            return {"success": False, "suno_ab_manifests": {}, "error": msg}
        skip_track_a = False
        if suno_duration_a > SUNO_MAX_USABLE_DURATION:
            log.warning(
                "  [Suno] Track A rejected: %.1fs exceeds max %.1fs — will try Track B",
                suno_duration_a, SUNO_MAX_USABLE_DURATION,
            )
            skip_track_a = True

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

            if not skip_track_a:
                trim_to_a, fade_start_a, actual_fade_a = _fade_params(suno_duration_a)
                trimmed_a = _trim_suno_mp3(path_a, suno_dir / "take_suno_a.mp3",
                                           trim_to_a, fade_start_a, actual_fade_a)
            else:
                trimmed_a = None
            if path_b:
                suno_duration_b = _probe_audio_duration(path_b)
                if skip_track_a and suno_duration_b > SUNO_MAX_USABLE_DURATION:
                    # Both tracks oversized — pick shorter, force-truncate to clip_duration
                    log.warning(
                        "  [Suno] Both tracks oversized (A=%.1fs, B=%.1fs) — "
                        "truncating shorter to %.1fs with %.1fs fade",
                        suno_duration_a, suno_duration_b, clip_duration, fade_tail,
                    )
                    if suno_duration_a <= suno_duration_b:
                        force_src = path_a
                        force_out = suno_dir / "take_suno_a.mp3"
                        use_label_a = True
                    else:
                        force_src = path_b
                        force_out = suno_dir / "take_suno_b.mp3"
                        use_label_a = False

                    fstart = max(0.0, clip_duration - fade_tail) if fade_tail > 0 else clip_duration
                    forced = _trim_suno_mp3(force_src, force_out,
                                            clip_duration, fstart, fade_tail)
                    if not forced:
                        return {"success": False, "suno_ab_manifests": {},
                                "error": "Both Suno tracks oversized and truncation failed"}

                    if use_label_a:
                        trimmed_a = forced
                        skip_track_a = False   # A is now usable (force-truncated)
                        trimmed_b = None
                    else:
                        trimmed_b = forced
                        # skip_track_a stays True; B is the sole usable take
                elif suno_duration_b < SUNO_MIN_USABLE_DURATION:
                    log.info("  [Suno] Track B too short (%.1fs < %ss) — "
                             "skipping B", suno_duration_b, SUNO_MIN_USABLE_DURATION)
                    trimmed_b = None
                elif suno_duration_b > SUNO_MAX_USABLE_DURATION:
                    log.warning("  [Suno] Track B rejected: %.1fs exceeds max %.1fs",
                                suno_duration_b, SUNO_MAX_USABLE_DURATION)
                    trimmed_b = None
                else:
                    trim_to_b, fade_start_b, actual_fade_b = _fade_params(suno_duration_b)
                    trimmed_b = _trim_suno_mp3(path_b, suno_dir / "take_suno_b.mp3",
                                               trim_to_b, fade_start_b, actual_fade_b)
            else:
                trimmed_b = None

            if skip_track_a and not trimmed_b:
                return {"success": False, "suno_ab_manifests": {},
                        "error": "Track A oversized and no usable Track B"}
        else:  # clean_cut — trim to exact clip duration with micro-fade to avoid click
            _fade_start = max(0.0, clip_duration - 0.1)
            if not skip_track_a:
                trimmed_a = _trim_suno_mp3(path_a, suno_dir / "take_suno_a.mp3",
                                           clip_duration, _fade_start, 0.1)
            else:
                trimmed_a = None
            trimmed_b = _trim_suno_mp3(path_b, suno_dir / "take_suno_b.mp3",
                                       clip_duration, _fade_start, 0.1) \
                        if path_b else None
            if skip_track_a and not trimmed_b:
                return {"success": False, "suno_ab_manifests": {},
                        "error": "Track A oversized and no usable Track B"}
    except Exception as e:
        log.warning("  [Suno] Trim failed: %s — proceeding with ACE-Step", e)
        return {"success": False, "suno_ab_manifests": {}, "error": str(e)}

    # Emit audio_probe event now that storage upload succeeded, Track A duration
    # is known, and Track B duration is known when we probed it. Non-blocking.
    try:
        write_event_row(
            stage="suno_bakein",
            sub_step="audio_probe",
            event_source="suno_bakein",
            status="success",
            word_id=word_record.get("id"),
            deck_id=deck_id,
            user_id=user_id,
            job_id=word_record.get("generation_job_id"),
            metadata={
                "duration_seconds_a": suno_duration_a,
                "duration_seconds_b": suno_duration_b,
                "file_size_bytes_a": path_a.stat().st_size if path_a.exists() else None,
                "file_size_bytes_b": path_b.stat().st_size if path_b and path_b.exists() else None,
                "clip_duration_seconds": clip_duration,
            },
        )
    except Exception as _probe_err:
        log.warning("  [Suno] Audio probe event write failed (non-fatal): %s", _probe_err)

    suno_takes: list[tuple[str, Any]] = []
    if not skip_track_a and trimmed_a:
        suno_takes.append(("a", trimmed_a))
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
                "overflow_strategy": "video_full",
                "word_card_show_translation": True,
                "word_card_font": bookend_defaults.get("font", "Bebas Neue"),
                "word_card_font_size": min(144, int(bookend_defaults.get("font_size", 92))),
            }
            _update_settings(word_dir, "assembly", asm_overrides)

            asm_ok = False
            for attempt in range(max_retries + 1):
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
                if "a" in suno_assembled_labels or not skip_track_a:
                    log.warning("  [Suno] Version B assembly failed — falling back to A only")
                else:
                    log.warning("  [Suno] Version B assembly failed — no fallback available")

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
                for attempt in range(max_retries + 1):
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

    if not suno_assembled_labels:
        return {
            "success": False,
            "suno_ab_manifests": {},
            "error": "No Suno takes assembled successfully",
        }

    return {"success": True, "suno_ab_manifests": suno_ab_manifests, "error": None}
