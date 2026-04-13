"""Video Engine — main entry point.

Per ENGINE_VIDEO_v1_1.md and Master Abstract Section 8:
generate_video(payload) -> VideoResult

This is the engine contract entry point. It:
1. Validates input
2. Routes to the appropriate adapter (Ken Burns / LTX / Kling)
3. Generates video clip
4. Extracts thumbnail
5. Writes generation-meta.json (always, even on failure)
6. Returns status
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from . import __version__, config
from .cost import estimate_cost
from .download import extract_thumbnail
from .models import (
    GenerationMeta,
    GenerationMetaContext,
    GenerationMetaCost,
    GenerationMetaInputs,
    GenerationMetaOutputs,
    GenerationMetaReproducibility,
    VideoError,
    VideoPayload,
    VideoResult,
    VideoSettings,
)
from .router import get_adapter

logger = logging.getLogger(__name__)


def generate_video(payload: VideoPayload) -> VideoResult:
    """Main engine function — the engine contract entry point.

    Receives a payload with image path, prompts, and settings.
    Routes to the appropriate adapter, generates a video clip,
    writes output to payload.output_dir, always writes
    generation-meta.json, and returns status.

    Args:
        payload: Complete engine input (content, settings, output_dir, metadata).

    Returns:
        VideoResult with status, output_paths, and error (if any).
    """
    start_time = time.monotonic()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    output_dir = Path(payload.output_dir)

    # Track state for the finally block
    output_paths: list[str] = []
    error: Optional[VideoError] = None
    status = "failed"
    adapter = None
    generation_result: Optional[dict[str, Any]] = None
    adjusted_settings: Optional[VideoSettings] = None
    ffmpeg_version: Optional[str] = None

    try:
        # --- Step 1: Validate inputs ---
        _validate_input(payload, output_dir)

        # --- Step 2: Check FFMPEG availability ---
        # Needed for Ken Burns mode and thumbnail extraction in all modes
        ffmpeg_version = config.check_ffmpeg()

        # --- Step 3: Get adapter for selected mode ---
        adapter = get_adapter(payload.settings.video_mode)

        # --- Step 4: Validate/adjust settings for this provider ---
        adjusted_settings = adapter.validate_settings(payload.settings)

        # --- Step 5: Build output filenames ---
        scene_num = payload.content.scene_number
        video_filename = f"scene_{scene_num:03d}.mp4"
        thumb_filename = f"scene_{scene_num:03d}_thumb.jpg"
        video_path = str(output_dir / video_filename)
        thumb_path = str(output_dir / thumb_filename)

        # --- Step 6: Generate video ---
        try:
            generation_result = adapter.generate(
                image_path=payload.content.image_path,
                content=payload.content,
                settings=adjusted_settings,
                output_path=video_path,
            )
        except Exception as e:
            if (
                config.VIDEO_BACKEND == "self_hosted"
                and payload.settings.video_mode in ("ltx_fast", "ltx_pro", "ltx")
            ):
                logger.warning(
                    f"Self-hosted LTX failed, falling back to fal.ai: {e}"
                )
                from .adapters.ltx import LTXAdapter

                fallback = LTXAdapter(tier=payload.settings.video_mode)
                fallback_settings = fallback.validate_settings(payload.settings)

                adapter = fallback
                adjusted_settings = fallback_settings
                generation_result = adapter.generate(
                    image_path=payload.content.image_path,
                    content=payload.content,
                    settings=adjusted_settings,
                    output_path=video_path,
                )
            else:
                raise

        # --- Step 7: Ensure thumbnail exists ---
        if not Path(thumb_path).exists():
            try:
                extract_thumbnail(video_path, thumb_path)
            except RuntimeError as e:
                logger.warning(f"Thumbnail extraction failed (non-fatal): {e}")

        # --- Step 8: Record output paths ---
        output_paths.append(video_filename)
        if Path(thumb_path).exists():
            output_paths.append(thumb_filename)

        status = "success"
        logger.info(
            f"Video generation complete: {video_filename} "
            f"({generation_result.get('duration_seconds', '?')}s)"
        )

    except ValueError as e:
        error = VideoError(
            message=str(e), retryable=False, type="validation_error"
        )
        logger.error(f"Validation error: {e}")

    except FileNotFoundError as e:
        error = VideoError(
            message=str(e), retryable=False, type="file_not_found"
        )
        logger.error(f"File not found: {e}")

    except ConnectionError as e:
        error = VideoError(
            message=str(e), retryable=True, type="connection_error"
        )
        logger.error(f"Connection error: {e}")

    except RuntimeError as e:
        error = VideoError(
            message=str(e), retryable=True, type="generation_error"
        )
        logger.error(f"Runtime error: {e}")

    except Exception as e:
        error = VideoError(
            message=str(e), retryable=False, type="unexpected_error"
        )
        logger.exception(f"Unexpected error: {e}")

    finally:
        # Write generation-meta.json (ALWAYS — engine contract requirement)
        elapsed = time.monotonic() - start_time
        _write_generation_meta(
            output_dir=output_dir,
            status=status,
            timestamp=timestamp,
            elapsed=elapsed,
            payload=payload,
            adapter=adapter,
            adjusted_settings=adjusted_settings,
            generation_result=generation_result,
            ffmpeg_version=ffmpeg_version,
            output_paths=output_paths,
            error=error,
        )

    return VideoResult(
        status=status,
        output_paths=output_paths,
        error=error,
    )


def _validate_input(payload: VideoPayload, output_dir: Path) -> None:
    """Validate the input payload. Fail fast on critical issues.

    Per engine contract:
    - Output dir must exist (orchestrator creates it)
    - Image file must exist
    - Scene number must be positive
    """
    if not output_dir.exists():
        raise ValueError(
            f"Output directory does not exist: {output_dir}. "
            "The orchestrator must create it before calling the engine."
        )
    if not output_dir.is_dir():
        raise ValueError(f"Output path is not a directory: {output_dir}")

    if payload.content.image_path is not None:
        image_path = Path(payload.content.image_path)
        if not image_path.is_file():
            raise FileNotFoundError(
                f"Source image not found: {payload.content.image_path}"
            )
    elif not payload.settings.text_to_video:
        raise ValueError(
            f"{payload.settings.video_mode} mode requires a source image "
            f"(set image_path or enable text_to_video)"
        )

    # Cloud modes require a video prompt (video_prompt or text_to_video_prompt)
    if payload.settings.video_mode in ("ltx_fast", "ltx_pro", "ltx", "kling_standard", "kling_pro"):
        has_prompt = (
            (payload.content.video_prompt and payload.content.video_prompt.strip())
            or (payload.content.text_to_video_prompt and payload.content.text_to_video_prompt.strip())
        )
        if not has_prompt:
            raise ValueError(
                f"video_prompt is required for {payload.settings.video_mode} mode "
                f"but was empty or missing"
            )


def _write_generation_meta(
    output_dir: Path,
    status: str,
    timestamp: str,
    elapsed: float,
    payload: VideoPayload,
    adapter: Any,
    adjusted_settings: Optional[VideoSettings],
    generation_result: Optional[dict[str, Any]],
    ffmpeg_version: Optional[str],
    output_paths: list[str],
    error: Optional[VideoError],
) -> None:
    """Write generation-meta.json to output_dir.

    Per ENGINE_VIDEO_v1_1.md Section 11: this is written ALWAYS, even on failure.
    """
    settings_for_meta = adjusted_settings or payload.settings
    settings_used = settings_for_meta.model_dump()
    # Include camera motion in settings_used for traceability (it lives on content, not settings)
    if payload.content.camera_motion:
        settings_used["camera_motion"] = payload.content.camera_motion
    video_mode = payload.settings.video_mode

    # Build outputs section (only on success)
    outputs = None
    if output_paths and generation_result:
        video_file = output_paths[0] if output_paths else ""
        thumb_file = output_paths[1] if len(output_paths) > 1 else None
        outputs = GenerationMetaOutputs(
            primary=video_file,
            thumbnail=thumb_file,
            format="mp4",
            codec="h264",
            resolution=generation_result.get("resolution"),
            fps=generation_result.get("fps"),
            duration_seconds=generation_result.get("duration_seconds"),
            file_size_bytes=generation_result.get("file_size_bytes"),
        )

    # Build cost section — use adjusted/snapped duration, not raw requested duration
    actual_duration = settings_for_meta.duration
    est_cost = estimate_cost(video_mode, actual_duration)
    cost = GenerationMetaCost(
        estimated_usd=est_cost,
        duration_seconds=float(actual_duration),
        provider=adapter.provider_name if adapter else "unknown",
        model=adapter.model_name if adapter else "unknown",
    )

    # Build reproducibility section
    reproducibility = GenerationMetaReproducibility(
        seed=payload.settings.seed if payload.settings.seed >= 0 else None,
        model_version=adapter.model_name if adapter else None,
        provider=adapter.provider_name if adapter else "unknown",
        fal_request_id=(
            generation_result.get("fal_request_id") if generation_result else None
        ),
        ffmpeg_version=ffmpeg_version,
        note=(
            "Non-deterministic — cloud API generation is not reproducible from seed"
            if video_mode != "ken_burns"
            else "Deterministic — FFMPEG Ken Burns is reproducible from the same input"
        ),
    )

    # Build the complete meta object
    meta = GenerationMeta(
        status=status,
        engine="video-engine",
        engine_version=__version__,
        timestamp=timestamp,
        duration_seconds=round(elapsed, 2),
        context=GenerationMetaContext(
            word=payload.metadata.word,
            language=payload.metadata.language,
            translation=payload.metadata.translation,
        ),
        inputs=GenerationMetaInputs(
            image_version=payload.metadata.image_version,
            scene_number=payload.metadata.scene_number,
            video_prompt=payload.content.video_prompt or None,
            settings_used=settings_used,
            transition=payload.content.end_image_path is not None,
            end_image_path=payload.content.end_image_path,
        ),
        outputs=outputs,
        cost=cost,
        reproducibility=reproducibility,
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
