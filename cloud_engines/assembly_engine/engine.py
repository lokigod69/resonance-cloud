"""Assembly Engine — main entry point.

Per ENGINE_ASSEMBLY.md Section 11:
assemble(payload) -> AssemblyResult

This is the engine contract entry point. It:
1. Validates input
2. Processes audio (silence trim + LUFS normalization)
3. Calculates timing (gap/overflow, word card allocations)
4. Scales video clips to target resolution
5. Builds segment list (word cards + clips + gap/overflow fill)
6. Concatenates segments with transitions
7. Muxes video + audio into final MP4
8. Writes generation-meta.json (always, even on failure)
9. Returns status
"""

from __future__ import annotations

import json
import logging
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from src.services.events import write_event_row

from . import __version__, audio, config, ffmpeg_builder, gaps, timing, video, word_card
from .models import (
    AssemblyError,
    AssemblyPayload,
    AssemblyReport,
    AssemblyResult,
    AudioProcessingReport,
    GenerationMeta,
    GenerationMetaContext,
    GenerationMetaInputs,
    GenerationMetaOutputs,
    GenerationMetaReproducibility,
    MediaInfo,
    TimingPlan,
    TrimPayload,
)

logger = logging.getLogger(__name__)


def assemble(payload: AssemblyPayload) -> AssemblyResult:
    """Main engine function — the engine contract entry point.

    Receives a payload with song audio, video clips, and assembly settings.
    Produces final.mp4 in the output_dir. Always writes generation-meta.json.

    Args:
        payload: Complete engine input (content, settings, output_dir, metadata).

    Returns:
        AssemblyResult with status, output_paths, and error (if any).
    """
    start_time = time.monotonic()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    output_dir = Path(payload.output_dir)

    # Track state for the finally block
    audio_report: Optional[AudioProcessingReport] = None
    timing_plan: Optional[TimingPlan] = None
    ffmpeg_version: Optional[str] = None
    output_paths: list[str] = []
    file_size: Optional[int] = None
    valid_clip_names: list[str] = []
    error: Optional[AssemblyError] = None
    status = "failed"

    try:
        # --- Step 1: Validate inputs ---
        _validate_input(payload, output_dir)

        # --- Step 2: Check FFMPEG availability ---
        ffmpeg_version = config.check_ffmpeg()
        config.check_ffprobe()

        # --- Step 3: Probe all media files ---
        song_info = ffmpeg_builder.probe_media(payload.content.song_path)
        logger.info(
            f"Song: {song_info.duration:.1f}s, "
            f"codec={song_info.audio_codec}"
        )

        clip_infos: list[MediaInfo] = []
        valid_clips: list[str] = []
        for clip_path in payload.content.video_clips:
            try:
                info = ffmpeg_builder.probe_media(clip_path)
                clip_infos.append(info)
                valid_clips.append(clip_path)
                logger.info(
                    f"Clip: {Path(clip_path).name} "
                    f"({info.duration:.1f}s, {info.width}x{info.height})"
                )
            except (ValueError, RuntimeError) as e:
                logger.warning(f"Skipping invalid clip {clip_path}: {e}")

        if not valid_clips:
            raise ValueError("No valid video clips found after probing all inputs")

        valid_clip_names = [Path(c).name for c in valid_clips]

        # --- Step 4: Process audio (trim + normalize) ---
        temp_dir = output_dir / "_temp"
        temp_dir.mkdir(exist_ok=True)

        audio_report = audio.process_audio(
            audio_path=payload.content.song_path,
            settings=payload.settings,
            temp_dir=str(temp_dir),
        )
        logger.info(
            f"Audio processed: {audio_report.original_duration:.1f}s -> "
            f"{audio_report.effective_duration:.1f}s"
        )

        # --- Step 5: Calculate timing ---
        clip_durations = [info.duration for info in clip_infos]
        timing_plan = timing.calculate_timing(
            song_duration=audio_report.effective_duration,
            clip_durations=clip_durations,
            settings=payload.settings,
        )

        # --- Step 6: Scale all clips to target resolution ---
        target_w, target_h = config.RESOLUTION_MAP[payload.settings.output_resolution]
        scaled_clips: list[str] = []
        for i, clip_path in enumerate(valid_clips):
            scaled_path = str(temp_dir / f"scaled_{i:03d}.mp4")
            video.scale_clip(
                clip_path, target_w, target_h,
                payload.settings.output_fps, scaled_path,
            )
            scaled_clips.append(scaled_path)

        # --- Step 7: Build segment list ---
        segments: list[str] = []

        # Intro word card (pedagogic mode)
        if (
            payload.settings.assembly_mode == "pedagogic"
            and timing_plan.word_card_intro_duration > 0
        ):
            intro_path = str(temp_dir / "word_card_intro.mp4")
            word_card.generate_word_card(
                word=payload.content.word,
                translation=(
                    payload.content.translation
                    if payload.settings.word_card_show_translation
                    else None
                ),
                duration=timing_plan.word_card_intro_duration,
                settings=payload.settings,
                output_path=intro_path,
                color_source_clip=valid_clips[0] if valid_clips else None,
            )
            segments.append(intro_path)

        # Main clips + gap/overflow handling
        if timing_plan.gap >= -0.01:
            # All clips fit (or gap to fill)
            segments.extend(scaled_clips)

            # Apply gap strategy if needed
            gap_fill_duration = timing_plan.gap - timing_plan.word_card_outro_duration
            if gap_fill_duration > 0.01:
                gap_segments = gaps.apply_gap_strategy(
                    strategy=timing_plan.strategy_to_apply,
                    clips=scaled_clips,
                    gap_seconds=gap_fill_duration,
                    word=payload.content.word,
                    translation=payload.content.translation,
                    output_dir=str(temp_dir),
                    settings=payload.settings,
                    color_source_clip=valid_clips[0] if valid_clips else None,
                )
                segments.extend(gap_segments)
        else:
            # Overflow: clips longer than available audio
            if timing_plan.strategy_to_apply == "trim":
                trimmed = video.apply_overflow_trim(
                    clips=scaled_clips,
                    available_duration=timing_plan.available_for_video,
                    transition_duration=payload.settings.transition_duration,
                    transition_type=payload.settings.transition,
                )
                segments.extend(trimmed)
            else:
                # fade_audio_black / video_full: use all clips, handle in final mux
                segments.extend(scaled_clips)

        # Outro word card (pedagogic mode, if time available)
        if timing_plan.word_card_outro_duration >= 1.0:
            outro_path = str(temp_dir / "word_card_outro.mp4")
            word_card.generate_word_card(
                word=payload.content.word,
                translation=(
                    payload.content.translation
                    if payload.settings.word_card_show_translation
                    else None
                ),
                duration=timing_plan.word_card_outro_duration,
                settings=payload.settings,
                output_path=outro_path,
                color_source_clip=valid_clips[0] if valid_clips else None,
            )
            segments.append(outro_path)

        # --- Step 8: Concatenate with transitions ---
        concat_path = str(temp_dir / "concat.mp4")
        video.concatenate_with_transitions(
            segments=segments,
            transition_type=payload.settings.transition,
            transition_duration=payload.settings.transition_duration,
            output_path=concat_path,
        )

        # --- Step 9: Mux with audio and encode final ---
        final_path = str(output_dir / "final.mp4")
        overflow_fade = (
            timing_plan.gap < -0.01
            and timing_plan.strategy_to_apply in ("fade_audio_black", "video_full")
        )
        video_full = (
            timing_plan.gap < -0.01
            and timing_plan.strategy_to_apply == "video_full"
        )
        video.assemble_final(
            video_path=concat_path,
            audio_path=audio_report.processed_path,
            output_path=final_path,
            settings=payload.settings,
            song_duration=audio_report.effective_duration,
            overflow_fade=overflow_fade,
            video_full=video_full,
        )

        output_paths.append("final.mp4")
        file_size = Path(final_path).stat().st_size
        status = "success"
        logger.info(
            f"Assembly complete: final.mp4 "
            f"({file_size / 1024 / 1024:.1f} MB)"
        )

    except ValueError as e:
        error = AssemblyError(
            message=str(e), retryable=False, type="validation_error"
        )
        logger.error(f"Validation error: {e}")

    except RuntimeError as e:
        error = AssemblyError(
            message=str(e), retryable=True, type="generation_error"
        )
        logger.error(f"Runtime error: {e}")

    except Exception as e:
        error = AssemblyError(
            message=str(e), retryable=False, type="unexpected_error"
        )
        logger.exception(f"Unexpected error: {e}")

    finally:
        # Clean up temp directory
        temp_dir = output_dir / "_temp"
        if temp_dir.exists():
            try:
                shutil.rmtree(temp_dir)
            except Exception:
                logger.warning("Failed to clean up temp directory")

        # Write generation-meta.json (ALWAYS — engine contract requirement)
        elapsed = time.monotonic() - start_time
        _write_generation_meta(
            output_dir=output_dir,
            status=status,
            timestamp=timestamp,
            elapsed=elapsed,
            payload=payload,
            audio_report=audio_report,
            timing_plan=timing_plan,
            ffmpeg_version=ffmpeg_version,
            output_paths=output_paths,
            file_size=file_size,
            valid_clip_names=valid_clip_names,
            error=error,
        )
        write_event_row(
            stage="assembly",
            sub_step="summary",
            status=status,
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            cost_usd=0.0,
            error_message=error.message if error else None,
            error_type=error.type if error else None,
            latency_ms=int(elapsed * 1000),
            metadata=_build_assembly_event_metadata(
                payload=payload,
                audio_report=audio_report,
                timing_plan=timing_plan,
                output_paths=output_paths,
                file_size=file_size,
                valid_clip_names=valid_clip_names,
            ),
        )

    return AssemblyResult(
        status=status,
        output_paths=output_paths,
        error=error,
    )


def trim_video(payload: TrimPayload) -> AssemblyResult:
    """Trim an existing MP4 to a start/end time range and re-encode.

    This is a simple FFMPEG wrapper. The orchestrator provides source path,
    output directory, and settings. Always writes generation-meta.json.

    Args:
        payload: Trim input (source_path, trim_start, trim_end, output_dir, settings, metadata).

    Returns:
        AssemblyResult with status, output_paths, and error (if any).
    """
    start_time = time.monotonic()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    output_dir = Path(payload.output_dir)

    error: Optional[AssemblyError] = None
    status = "failed"
    output_paths: list[str] = []
    ffmpeg_version: Optional[str] = None
    ffmpeg_cmd: Optional[str] = None
    source_duration: Optional[float] = None
    output_duration: Optional[float] = None
    output_resolution: Optional[str] = None
    file_size: Optional[int] = None

    try:
        # --- Validate inputs ---
        source = Path(payload.source_path)
        if not source.is_file():
            raise ValueError(f"Source file not found: {payload.source_path}")
        if not output_dir.is_dir():
            raise ValueError(
                f"Output directory does not exist: {payload.output_dir}. "
                "The orchestrator must create it before calling the engine."
            )
        if payload.trim_start >= payload.trim_end:
            raise ValueError(
                f"trim_start ({payload.trim_start}) must be less than "
                f"trim_end ({payload.trim_end})"
            )
        if payload.trim_end - payload.trim_start < 1.0:
            raise ValueError(
                f"Trim duration must be at least 1 second, got "
                f"{payload.trim_end - payload.trim_start:.2f}s"
            )

        # --- Check FFMPEG ---
        ffmpeg_version = config.check_ffmpeg()
        config.check_ffprobe()

        # --- Probe source ---
        source_info = ffmpeg_builder.probe_media(payload.source_path)
        source_duration = source_info.duration
        logger.info(
            f"Trim source: {source_info.duration:.1f}s, "
            f"{source_info.width}x{source_info.height}"
        )

        # --- Validate trim points against source duration ---
        trim_end = payload.trim_end
        tolerance = 0.1
        if trim_end > source_info.duration + tolerance:
            raise ValueError(
                f"trim_end ({trim_end}) exceeds source duration "
                f"({source_info.duration:.2f}s)"
            )
        if trim_end > source_info.duration:
            trim_end = source_info.duration

        # --- Run FFMPEG trim ---
        final_path = str(output_dir / "final.mp4")
        s = payload.settings
        ffmpeg_args = [
            "-ss", str(payload.trim_start),
            "-to", str(trim_end),
            "-i", ffmpeg_builder.posix_path(payload.source_path),
            "-c:v", s.video_codec,
            "-preset", s.video_preset,
            "-crf", str(s.video_crf),
            "-pix_fmt", "yuv420p",
            "-c:a", s.audio_codec,
            "-b:a", s.audio_bitrate,
            "-movflags", "+faststart",
            ffmpeg_builder.posix_path(final_path),
        ]
        ffmpeg_cmd = "ffmpeg -y " + " ".join(ffmpeg_args)
        ffmpeg_builder.run_ffmpeg(ffmpeg_args, description="Trim video")

        # --- Probe output ---
        output_info = ffmpeg_builder.probe_media(final_path)
        output_duration = output_info.duration
        output_resolution = (
            f"{output_info.width}x{output_info.height}"
            if output_info.width and output_info.height
            else None
        )
        file_size = Path(final_path).stat().st_size

        output_paths.append("final.mp4")
        status = "success"
        logger.info(
            f"Trim complete: final.mp4 "
            f"({file_size / 1024 / 1024:.1f} MB, {output_duration:.1f}s)"
        )

    except ValueError as e:
        error = AssemblyError(
            message=str(e), retryable=False, type="validation_error"
        )
        logger.error(f"Trim validation error: {e}")

    except RuntimeError as e:
        error = AssemblyError(
            message=str(e), retryable=True, type="generation_error"
        )
        logger.error(f"Trim runtime error: {e}")

    except Exception as e:
        error = AssemblyError(
            message=str(e), retryable=False, type="unexpected_error"
        )
        logger.exception(f"Trim unexpected error: {e}")

    finally:
        # Write generation-meta.json (ALWAYS — engine contract requirement)
        elapsed = time.monotonic() - start_time
        meta = {
            "status": status,
            "engine": "assembly-engine",
            "engine_version": __version__,
            "timestamp": timestamp,
            "duration_seconds": round(elapsed, 2),
            "context": {
                "word": payload.metadata.get("word", ""),
                "language": payload.metadata.get("language", ""),
                "translation": payload.metadata.get("translation", ""),
            },
            "source": "trim",
            "trim_info": {
                "source_version": payload.metadata.get("source_version", ""),
                "source_file": "final.mp4",
                "original_duration_seconds": (
                    round(source_duration, 2) if source_duration else None
                ),
                "trim_start_seconds": payload.trim_start,
                "trim_end_seconds": payload.trim_end,
                "trimmed_duration_seconds": (
                    round(output_duration, 2) if output_duration else None
                ),
                "cut_regions": [],
            },
            "inputs": {
                "source_version": payload.metadata.get("source_version", ""),
                "settings_used": payload.settings.model_dump(),
            },
            "outputs": {
                "primary": "final.mp4",
                "format": "mp4",
                "duration_seconds": (
                    round(output_duration, 2) if output_duration else None
                ),
                "resolution": output_resolution,
                "file_size_bytes": file_size,
            } if status == "success" else None,
            "reproducibility": {
                "ffmpeg_version": ffmpeg_version,
                "ffmpeg_command": ffmpeg_cmd,
            },
            "error": error.model_dump() if error else None,
        }

        meta_path = output_dir / "generation-meta.json"
        try:
            meta_path.write_text(
                json.dumps(
                    {k: v for k, v in meta.items() if v is not None},
                    indent=2,
                    ensure_ascii=False,
                ),
                encoding="utf-8",
            )
            logger.info(f"Written: generation-meta.json ({status})")
        except Exception as e:
            logger.error(f"Failed to write generation-meta.json: {e}")

    return AssemblyResult(
        status=status,
        output_paths=output_paths,
        error=error,
    )


def _validate_input(payload: AssemblyPayload, output_dir: Path) -> None:
    """Validate the input payload. Fail fast on critical issues.

    Per ENGINE_ASSEMBLY.md Section 14.1:
    - Song file not found -> fail immediately
    - Zero video clips -> fail immediately
    - Missing clip -> log warning, skip (fail if ALL missing, handled later)
    - Output dir must exist (orchestrator creates it)
    """
    # Check output directory
    if not output_dir.exists():
        raise ValueError(
            f"Output directory does not exist: {output_dir}. "
            "The orchestrator must create it before calling the engine."
        )
    if not output_dir.is_dir():
        raise ValueError(f"Output path is not a directory: {output_dir}")

    # Check song file
    song_path = Path(payload.content.song_path)
    if not song_path.is_file():
        raise ValueError(
            f"Song file not found: {payload.content.song_path}. "
            "Cannot assemble without audio."
        )

    # Check at least one video clip path is provided
    if not payload.content.video_clips:
        raise ValueError(
            "No video clips provided. Cannot assemble without video."
        )

    # Check content fields
    if not payload.content.word.strip():
        raise ValueError("Word cannot be empty")


def _write_generation_meta(
    output_dir: Path,
    status: str,
    timestamp: str,
    elapsed: float,
    payload: AssemblyPayload,
    audio_report: Optional[AudioProcessingReport],
    timing_plan: Optional[TimingPlan],
    ffmpeg_version: Optional[str],
    output_paths: list[str],
    file_size: Optional[int],
    valid_clip_names: list[str],
    error: Optional[AssemblyError],
) -> None:
    """Write generation-meta.json to output_dir.

    Per ENGINE_ASSEMBLY.md Section 12: this is written ALWAYS, even on failure.
    """
    # Build outputs section (only on success)
    outputs = None
    if output_paths:
        target_w, target_h = config.RESOLUTION_MAP.get(
            payload.settings.output_resolution, (1920, 1080)
        )
        outputs = GenerationMetaOutputs(
            primary="final.mp4",
            format="mp4",
            duration_seconds=(
                round(audio_report.effective_duration, 2) if audio_report else None
            ),
            resolution=f"{target_w}x{target_h}",
            file_size_bytes=file_size,
        )

    # Build assembly report
    assembly_report = _build_assembly_report(
        audio_report=audio_report,
        timing_plan=timing_plan,
    )

    # Build the complete meta object
    meta = GenerationMeta(
        status=status,
        engine="assembly-engine",
        engine_version=__version__,
        timestamp=timestamp,
        duration_seconds=round(elapsed, 2),
        context=GenerationMetaContext(
            word=payload.metadata.word,
            language=payload.metadata.language,
            translation=payload.metadata.translation,
        ),
        inputs=GenerationMetaInputs(
            song_version=payload.metadata.song_version,
            video_version=payload.metadata.video_version,
            video_clips_used=valid_clip_names,
            settings_used=payload.settings.model_dump(),
        ),
        outputs=outputs,
        assembly_report=assembly_report,
        reproducibility=GenerationMetaReproducibility(
            ffmpeg_version=ffmpeg_version,
        ),
        error=error,
    )

    # Write to disk
    meta_path = output_dir / "generation-meta.json"
    try:
        meta_path.write_text(
            json.dumps(
                meta.model_dump(exclude_none=True),
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        logger.info(f"Written: generation-meta.json ({status})")
    except Exception as e:
        # Even if meta writing fails, don't crash the engine
        logger.error(f"Failed to write generation-meta.json: {e}")


def _build_assembly_report(
    *,
    audio_report: Optional[AudioProcessingReport],
    timing_plan: Optional[TimingPlan],
) -> AssemblyReport | None:
    if not (audio_report or timing_plan):
        return None
    return AssemblyReport(
        original_song_duration=(
            round(audio_report.original_duration, 2) if audio_report else None
        ),
        trimmed_silence_start=(
            round(audio_report.trimmed_silence_start, 2) if audio_report else 0.0
        ),
        trimmed_silence_end=(
            round(audio_report.trimmed_silence_end, 2) if audio_report else 0.0
        ),
        effective_song_duration=(
            round(audio_report.effective_duration, 2) if audio_report else None
        ),
        total_clip_duration=(
            round(timing_plan.total_clip_duration, 2) if timing_plan else None
        ),
        gap_seconds=(
            round(timing_plan.gap, 2) if timing_plan else None
        ),
        gap_strategy_applied=(
            timing_plan.strategy_to_apply if timing_plan else None
        ),
        original_lufs=(
            round(audio_report.original_lufs, 2)
            if audio_report and audio_report.original_lufs is not None
            else None
        ),
        normalized_lufs=(
            round(audio_report.normalized_lufs, 2)
            if audio_report and audio_report.normalized_lufs is not None
            else None
        ),
        word_card_intro_duration=(
            round(timing_plan.word_card_intro_duration, 2) if timing_plan else 0.0
        ),
        word_card_outro_duration=(
            round(timing_plan.word_card_outro_duration, 2) if timing_plan else 0.0
        ),
        clips_trimmed=(
            timing_plan is not None
            and timing_plan.gap < -0.01
            and timing_plan.strategy_to_apply == "trim"
        ),
        clips_looped=(
            timing_plan is not None
            and timing_plan.gap > 0.01
            and timing_plan.strategy_to_apply in ("ping_pong", "loop")
        ),
    )


def _build_assembly_event_metadata(
    *,
    payload: AssemblyPayload,
    audio_report: Optional[AudioProcessingReport],
    timing_plan: Optional[TimingPlan],
    output_paths: list[str],
    file_size: Optional[int],
    valid_clip_names: list[str],
) -> dict[str, Any]:
    report = _build_assembly_report(audio_report=audio_report, timing_plan=timing_plan)
    metadata = report.model_dump(exclude_none=True) if report is not None else {}
    metadata.update(
        {
            "measured_lufs": (
                round(audio_report.normalized_lufs, 2)
                if audio_report and audio_report.normalized_lufs is not None
                else (
                    round(audio_report.original_lufs, 2)
                    if audio_report and audio_report.original_lufs is not None
                    else None
                )
            ),
            "target_lufs": payload.settings.target_lufs,
            "gap_strategy": timing_plan.strategy_to_apply if timing_plan else None,
            "final_video_duration": (
                round(audio_report.effective_duration, 2)
                if audio_report
                else None
            ),
            "output_files": output_paths,
            "file_size_bytes": file_size,
            "video_clips_used": valid_clip_names,
            "cost_estimation": "none",
        }
    )
    return metadata
