"""Fal.ai Z-Image-Turbo provider (text-to-image and image-to-image).

Uses the `fal_client` SDK with FAL_KEY read from the environment by the
SDK automatically. Per INVESTIGATION_FAL_API_CONTRACT.md §1/§2:

  t2i model: "fal-ai/z-image/turbo"
  i2i model: "fal-ai/z-image/turbo/image-to-image"

Always pass image_size={width:1920, height:1080} explicitly — never rely
on "auto" or named presets (§2 quirk 2).

The renderer calls us synchronously (see INVESTIGATION_RENDERER_CONTRACT.md
§Appendix A), so both an async primary (`render_scene_fal_zturbo`) and a
thin sync wrapper (`render_scene_fal_zturbo_sync`) are exposed.
"""

from __future__ import annotations

import asyncio
import json
import logging
from io import BytesIO
from pathlib import Path
from typing import Optional

import fal_client
import httpx
from PIL import Image as PILImage

from .prompt_compiler import compile_scene_to_text
from src.cost_logger import FAL_ZTURBO_COST_PER_IMAGE

logger = logging.getLogger(__name__)

ZTURBO_T2I_MODEL = "fal-ai/z-image/turbo"
ZTURBO_I2I_MODEL = "fal-ai/z-image/turbo/image-to-image"

FAL_HTTP_TIMEOUT = 60.0
TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080


def _err_fal(
    message: str,
    prompt_text: str,
    *,
    model_id: str | None = None,
) -> dict:
    """Build a failure-result dict matching the shared 9-key provider shape."""
    return {
        "success": False,
        "file_path": None,
        "error_message": message,
        "prompt_text": prompt_text,
        "response_body": None,
        "provider_name": "fal_zturbo",
        "model_name": model_id,
        "request_id": None,
        "cost_estimate_usd": FAL_ZTURBO_COST_PER_IMAGE,
    }


async def render_scene_fal_zturbo(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    chain_instruction: Optional[str] = None,
    reference_image_path: Optional[Path] = None,
    use_color_palette: bool = False,
) -> dict:
    """Render a single scene via Fal.ai Z-Image-Turbo (async).

    Uses fal_client.subscribe_async (queue-backed, auto-retries on 429).
    """
    prompt_text = compile_scene_to_text(
        image_prompt,
        chain_instruction=chain_instruction,
        use_color_palette=use_color_palette,
    )
    logger.info("Z-Turbo prompt (%d chars): %.120s...", len(prompt_text), prompt_text)

    # Per §1/§2 — always pass explicit 1920x1080 image_size.
    arguments: dict = {
        "prompt": prompt_text,
        "image_size": {"width": TARGET_WIDTH, "height": TARGET_HEIGHT},
        "num_inference_steps": 8,
        "num_images": 1,
        "output_format": "png",
        "enable_safety_checker": True,
    }

    if model_id == ZTURBO_I2I_MODEL:
        if not reference_image_path:
            return _err_fal(
                "Z-Turbo i2i requires reference_image_path",
                prompt_text,
                model_id=model_id,
            )
        try:
            image_url = await fal_client.upload_file_async(str(reference_image_path))
        except Exception as e:
            return _err_fal(
                f"Z-Turbo reference upload failed: {e}",
                prompt_text,
                model_id=model_id,
            )
        arguments["image_url"] = image_url
        arguments["strength"] = 0.6  # Fal default; keep for v1

    try:
        result = await fal_client.subscribe_async(model_id, arguments=arguments)
    except httpx.HTTPStatusError as e:
        # Per §0.8 — branch on status_code rather than custom exception classes.
        status = e.response.status_code
        return _err_fal(
            f"Fal HTTP {status}: {e}",
            prompt_text,
            model_id=model_id,
        )
    except httpx.TimeoutException as e:
        return _err_fal(
            f"Fal timed out: {e}",
            prompt_text,
            model_id=model_id,
        )
    except Exception as e:
        return _err_fal(
            f"Fal call failed: {e}",
            prompt_text,
            model_id=model_id,
        )

    images = result.get("images") or []
    if not images:
        return _err_fal(
            f"Fal succeeded but no images in result: {json.dumps(result)[:300]}",
            prompt_text,
            model_id=model_id,
        )

    result_url = images[0].get("url")
    if not result_url:
        return _err_fal(
            "Fal first image missing url",
            prompt_text,
            model_id=model_id,
        )

    # --- Download + save as PNG, resize+crop defensively ---
    try:
        async with httpx.AsyncClient(timeout=FAL_HTTP_TIMEOUT) as client:
            resp = await client.get(result_url)
            resp.raise_for_status()
            image_bytes = resp.content

        output_path.parent.mkdir(parents=True, exist_ok=True)
        img = PILImage.open(BytesIO(image_bytes))

        if img.size != (TARGET_WIDTH, TARGET_HEIGHT):
            src_w, src_h = img.size
            src_ratio = src_w / src_h
            target_ratio = TARGET_WIDTH / TARGET_HEIGHT
            if src_ratio > target_ratio:
                new_h = TARGET_HEIGHT
                new_w = int(round(src_w * (TARGET_HEIGHT / src_h)))
            else:
                new_w = TARGET_WIDTH
                new_h = int(round(src_h * (TARGET_WIDTH / src_w)))
            img = img.resize((new_w, new_h), PILImage.LANCZOS)
            left = (new_w - TARGET_WIDTH) // 2
            top = (new_h - TARGET_HEIGHT) // 2
            img = img.crop((left, top, left + TARGET_WIDTH, top + TARGET_HEIGHT))

        if img.mode != "RGB":
            img = img.convert("RGB")
        img.save(str(output_path), format="PNG")
        logger.info("Z-Turbo image saved: %s", output_path.name)
    except Exception as e:
        return _err_fal(
            f"Fal download/save failed: {e}",
            prompt_text,
            model_id=model_id,
        )

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
        "response_body": json.dumps(result, ensure_ascii=False),
        "provider_name": "fal_zturbo",
        "model_name": model_id,
        "request_id": result.get("request_id"),
        "cost_estimate_usd": FAL_ZTURBO_COST_PER_IMAGE,
    }


def render_scene_fal_zturbo_sync(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    chain_instruction: Optional[str] = None,
    reference_image_path: Optional[Path] = None,
    use_color_palette: bool = False,
) -> dict:
    """Sync wrapper for use from the synchronous render_scene() dispatch."""
    return asyncio.run(render_scene_fal_zturbo(
        image_prompt=image_prompt,
        model_id=model_id,
        output_path=output_path,
        aspect_ratio=aspect_ratio,
        chain_instruction=chain_instruction,
        reference_image_path=reference_image_path,
        use_color_palette=use_color_palette,
    ))
