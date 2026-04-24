"""Image Engine — main entry point.

Per ENGINE_IMAGE.md Section 15.1:
generate_images(payload) → ImageResult

This is the engine contract entry point. It:
1. Validates input
2. Generates storyboard via LLM (Step A)
3. Writes storyboard.json
4. Renders images via Gemini (Step B)
5. Writes generation-meta.json (always, even on failure)
6. Returns status
"""

from __future__ import annotations

import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from . import __version__
from .models import (
    GenerationMeta,
    GenerationMetaInput,
    GenerationMetaOutputs,
    GenerationMetaSettings,
    GenerationMetaSteps,
    ImageError,
    ImagePayload,
    ImageResult,
    RenderingStepMeta,
    RenderResult,
    Storyboard,
    StoryboardStepMeta,
    resolve_image_count,
)
from .renderer import render_all_scenes
from .storyboard import generate_storyboard

logger = logging.getLogger(__name__)


def generate_images(payload: ImagePayload) -> ImageResult:
    """Main engine function — the engine contract entry point.

    Receives a payload, generates storyboard via LLM, renders images
    via Gemini, writes output files to payload.output_dir, always writes
    generation-meta.json, returns status.

    Args:
        payload: Complete engine input (content, context, settings, output_dir, metadata).

    Returns:
        ImageResult with status, output_paths, and error (if any).
    """
    start_time = time.monotonic()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    output_dir = Path(payload.output_dir)

    # Track state for finally block
    storyboard: Optional[Storyboard] = None
    storyboard_meta: Optional[StoryboardStepMeta] = None
    storyboard_debug: Optional[dict] = None
    rendering_meta: Optional[RenderingStepMeta] = None
    render_results: list[RenderResult] = []
    output_paths: list[str] = []
    error: Optional[ImageError] = None
    status = "failed"
    image_count: int = 0
    image_count_source: str = "unknown"

    try:
        # --- Step 1: Validate input ---
        _validate_input(payload, output_dir)

        # --- Step 2: Resolve image count ---
        image_count, image_count_source = resolve_image_count(payload.settings)

        # --- Step 3: Generate storyboard (Step A) ---
        logger.info(
            "Generating storyboard for '%s' (%s) — %d scenes, %s direction, %s narrative",
            payload.content.word,
            payload.content.language,
            image_count,
            payload.settings.creative_direction,
            payload.settings.frame_narrative,
        )

        storyboard, storyboard_meta, storyboard_debug = generate_storyboard(
            content=payload.content,
            context=payload.context,
            settings=payload.settings,
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
        )

        # --- Step 4: Write storyboard.json ---
        storyboard_path = output_dir / "storyboard.json"
        storyboard_path.write_text(
            json.dumps(
                storyboard.model_dump(exclude_none=True),
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
        output_paths.append("storyboard.json")
        logger.info("Written: storyboard.json")

        # --- Step 5: Render images (Step B) ---
        if not payload.settings.skip_rendering:
            render_results, rendering_meta = render_all_scenes(
                storyboard=storyboard,
                image_model=payload.settings.image_model,
                output_dir=output_dir,
                aspect_ratio=payload.settings.aspect_ratio,
                use_color_palette=payload.settings.use_color_palette,
                word_id=payload.metadata.word_id,
                deck_id=payload.metadata.deck_id,
                user_id=payload.metadata.user_id,
                job_id=payload.metadata.job_id,
                attempt=payload.metadata.attempt,
            )
        else:
            # Text-to-video mode: storyboard only, no image rendering
            logger.info("skip_rendering=True — skipping image generation (text-to-video mode)")
            render_results = []
            rendering_meta = RenderingStepMeta(
                model=payload.settings.image_model,
                scenes_attempted=0,
                scenes_succeeded=0,
                scenes_failed=0,
                skipped_rendering=True,
            )

        # Collect successful output paths
        for result in render_results:
            if result.success and result.file_path:
                output_paths.append(result.file_path)

        # --- Step 6: Determine status ---
        succeeded = sum(1 for r in render_results if r.success)
        total = len(render_results)

        if succeeded == total:
            status = "success"
        elif succeeded > 0:
            status = "partial"
            logger.warning(
                "Partial success: %d/%d scenes rendered", succeeded, total
            )
        else:
            status = "failed"
            error = ImageError(
                message=f"All {total} scenes failed to render",
                retryable=True,
            )

        # --- Step 6b: Write debug.json ---
        _write_debug_json(
            output_dir=output_dir,
            storyboard_debug=storyboard_debug,
            render_results=render_results,
        )

    except ValueError as e:
        error = ImageError(message=str(e), retryable=False)
        logger.error("Validation error: %s", e)

    except ConnectionError as e:
        error = ImageError(message=str(e), retryable=True)
        logger.error("Connection error: %s", e)

    except RuntimeError as e:
        error = ImageError(message=str(e), retryable=True)
        logger.error("Runtime error: %s", e)

    except Exception as e:
        error = ImageError(message=str(e), retryable=False)
        logger.exception("Unexpected error: %s", e)

    finally:
        # --- Step 7: Write generation-meta.json (ALWAYS) ---
        elapsed = time.monotonic() - start_time
        _write_generation_meta(
            output_dir=output_dir,
            status=status,
            timestamp=timestamp,
            elapsed=elapsed,
            payload=payload,
            image_count=image_count,
            image_count_source=image_count_source,
            storyboard_meta=storyboard_meta,
            rendering_meta=rendering_meta,
            render_results=render_results,
            output_paths=output_paths,
            error=error,
        )

    return ImageResult(
        status=status,
        output_paths=output_paths,
        error=error,
    )


def _validate_input(payload: ImagePayload, output_dir: Path) -> None:
    """Validate the input payload per engine contract."""
    if not payload.content.word.strip():
        raise ValueError("Word cannot be empty")

    if not payload.content.translation.strip():
        raise ValueError("Translation cannot be empty")

    if not payload.content.language.strip():
        raise ValueError("Language cannot be empty")

    if not payload.content.language_code.strip():
        raise ValueError("Language code is required")

    if not output_dir.exists():
        raise ValueError(
            f"Output directory does not exist: {output_dir}. "
            "The orchestrator must create it."
        )

    if not output_dir.is_dir():
        raise ValueError(f"Output path is not a directory: {output_dir}")


def _write_generation_meta(
    output_dir: Path,
    status: str,
    timestamp: str,
    elapsed: float,
    payload: ImagePayload,
    image_count: int,
    image_count_source: str,
    storyboard_meta: Optional[StoryboardStepMeta],
    rendering_meta: Optional[RenderingStepMeta],
    render_results: list[RenderResult],
    output_paths: list[str],
    error: Optional[ImageError],
) -> None:
    """Write generation-meta.json to output_dir.

    Per ENGINE_IMAGE.md Section 13: this is written ALWAYS, even on failure.
    """
    image_files = [r.file_path for r in render_results if r.success and r.file_path]
    images_requested = image_count
    images_generated = len(image_files)

    meta = GenerationMeta(
        engine="image",
        engine_version=__version__,
        timestamp=timestamp,
        status=status,
        duration_seconds=round(elapsed, 2),
        input=GenerationMetaInput(
            word=payload.content.word,
            language=payload.content.language,
            language_code=payload.content.language_code,
            concept_version=payload.metadata.concept_version,
        ),
        settings=GenerationMetaSettings(
            creative_direction=payload.settings.creative_direction,
            frame_narrative=payload.settings.frame_narrative,
            image_count=image_count,
            image_count_source=image_count_source,
            aspect_ratio=payload.settings.aspect_ratio,
            art_style=payload.settings.art_style,
            word_in_image=payload.settings.word_in_image,
            llm_model=payload.settings.llm_model,
            image_model=payload.settings.image_model,
            vocal_gender=payload.settings.vocal_gender,
        ),
        outputs=GenerationMetaOutputs(
            images_generated=images_generated,
            images_requested=images_requested,
            image_files=image_files,
            storyboard_file="storyboard.json" if "storyboard.json" in output_paths else "",
        ) if output_paths else None,
        steps=GenerationMetaSteps(
            storyboard_generation=storyboard_meta,
            image_rendering=rendering_meta,
        ),
        error=error,
    )

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
        logger.info("Written: generation-meta.json (%s)", status)
    except Exception as e:
        logger.error("Failed to write generation-meta.json: %s", e)


def _write_debug_json(
    output_dir: Path,
    storyboard_debug: Optional[dict],
    render_results: list[RenderResult],
) -> None:
    """Write debug.json with raw prompts and LLM responses for UI inspection.

    Contains: system_prompt, user_prompt, raw_llm_response, and per-scene
    image_prompt_json (the exact JSON string sent to Gemini).
    """
    if storyboard_debug is None:
        return

    scene_prompts = {
        r.scene_number: r.prompt_json
        for r in render_results
        if r.prompt_json is not None
    }

    debug_data = {
        "system_prompt": storyboard_debug.get("system_prompt", ""),
        "user_prompt": storyboard_debug.get("user_prompt", ""),
        "raw_llm_response": storyboard_debug.get("raw_llm_response", ""),
        "scene_image_prompts": scene_prompts,
    }

    debug_path = output_dir / "debug.json"
    try:
        debug_path.write_text(
            json.dumps(debug_data, indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        logger.info("Written: debug.json")
    except Exception as e:
        logger.error("Failed to write debug.json: %s", e)
