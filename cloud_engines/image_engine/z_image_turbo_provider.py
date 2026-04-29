"""Hybrid Z-Image Turbo provider.

Routes text-to-image scenes to kie.ai's `z-image` endpoint and image-to-image
scenes to fal.ai's `fal-ai/z-image/turbo/image-to-image` endpoint.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from pathlib import Path
from typing import Optional

from src.cost_logger import (
    FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9,
    KIE_Z_IMAGE_COST_PER_IMAGE,
)

from .fal_common import submit_fal_image
from .kie_common import (
    _download_and_save,
    _err,
    _extract_image_url,
    _poll_task,
    _submit_task,
)
from .prompt_compiler import compile_scene_to_text

logger = logging.getLogger(__name__)

Z_IMAGE_TURBO_INTERNAL_MODEL = "z-image-turbo"
KIE_Z_IMAGE_MODEL = "z-image"
FAL_Z_IMAGE_TURBO_I2I_MODEL = "fal-ai/z-image/turbo/image-to-image"
KIE_Z_IMAGE_PROMPT_MAX_CHARS = 1000

__all__ = [
    "render_scene_z_image_turbo",
    "KIE_Z_IMAGE_MODEL",
    "FAL_Z_IMAGE_TURBO_I2I_MODEL",
    "Z_IMAGE_TURBO_INTERNAL_MODEL",
]


def _run_async(coro):
    return asyncio.run(coro)


def _truncate_for_kie_z_image(prompt_text: str) -> str:
    if len(prompt_text) <= KIE_Z_IMAGE_PROMPT_MAX_CHARS:
        return prompt_text
    truncated = prompt_text[:KIE_Z_IMAGE_PROMPT_MAX_CHARS]
    if "." in truncated:
        truncated = truncated.rsplit(".", 1)[0] + "."
    logger.warning(
        "Z-Image Turbo Kie prompt truncated from %d to %d chars",
        len(prompt_text),
        len(truncated),
    )
    return truncated


def render_scene_z_image_turbo(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    input_urls: Optional[list[str]] = None,
    use_color_palette: bool = False,
    art_style: str = "photorealistic",
) -> dict:
    """Render one scene through the cheapest viable Z-Image Turbo transport."""
    has_reference_image = bool(input_urls)
    prompt_text = compile_scene_to_text(
        {
            "art_style": art_style,
            "image_prompt": image_prompt,
        },
        use_color_palette=use_color_palette,
        has_reference_image=has_reference_image,
    )
    if has_reference_image:
        return _run_async(
            _render_via_fal_i2i(
                prompt_text=prompt_text,
                output_path=output_path,
                input_urls=input_urls or [],
            )
        )
    return _render_via_kie_t2i(
        prompt_text=_truncate_for_kie_z_image(prompt_text),
        output_path=output_path,
        aspect_ratio=aspect_ratio,
    )


def _render_via_kie_t2i(
    *,
    prompt_text: str,
    output_path: Path,
    aspect_ratio: str,
) -> dict:
    api_key = os.environ.get("KIE_API_KEY", "")
    if not api_key:
        return _err(
            "KIE_API_KEY not set in environment",
            prompt_text,
            provider_name="z_image_turbo_kie",
            cost_estimate_usd=KIE_Z_IMAGE_COST_PER_IMAGE,
            model_id=KIE_Z_IMAGE_MODEL,
        )

    logger.info("Z-Image Turbo Kie prompt (%d chars): %.120s...", len(prompt_text), prompt_text)
    payload = {
        "model": KIE_Z_IMAGE_MODEL,
        "input": {
            "prompt": prompt_text,
            "aspect_ratio": aspect_ratio,
            "nsfw_checker": False,
        },
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    task_id = _submit_task(payload, headers)
    if isinstance(task_id, dict):
        return {
            **task_id,
            "prompt_text": prompt_text,
            "model_name": KIE_Z_IMAGE_MODEL,
            "provider_name": "z_image_turbo_kie",
            "cost_estimate_usd": KIE_Z_IMAGE_COST_PER_IMAGE,
        }

    result_data = _poll_task(task_id, headers)
    if isinstance(result_data, dict) and "error_message" in result_data:
        return {
            **result_data,
            "prompt_text": prompt_text,
            "model_name": KIE_Z_IMAGE_MODEL,
            "provider_name": "z_image_turbo_kie",
            "request_id": task_id,
            "cost_estimate_usd": KIE_Z_IMAGE_COST_PER_IMAGE,
        }

    image_url = _extract_image_url(result_data, task_id)
    if image_url is None:
        return _err(
            f"Z-Image Turbo Kie task succeeded but no result URL found in: {json.dumps(result_data)[:300]}",
            prompt_text,
            provider_name="z_image_turbo_kie",
            cost_estimate_usd=KIE_Z_IMAGE_COST_PER_IMAGE,
            model_id=KIE_Z_IMAGE_MODEL,
            request_id=task_id,
        )

    save_result = _download_and_save(image_url, output_path)
    if save_result is not None:
        return {
            **save_result,
            "prompt_text": prompt_text,
            "model_name": KIE_Z_IMAGE_MODEL,
            "provider_name": "z_image_turbo_kie",
            "request_id": task_id,
            "cost_estimate_usd": KIE_Z_IMAGE_COST_PER_IMAGE,
        }

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
        "response_body": json.dumps(result_data, ensure_ascii=False),
        "provider_name": "z_image_turbo_kie",
        "model_name": KIE_Z_IMAGE_MODEL,
        "request_id": task_id,
        "cost_estimate_usd": KIE_Z_IMAGE_COST_PER_IMAGE,
    }


async def _render_via_fal_i2i(
    *,
    prompt_text: str,
    output_path: Path,
    input_urls: list[str],
) -> dict:
    if not input_urls:
        return _err(
            "Z-Image Turbo fal i2i requires input_urls",
            prompt_text,
            provider_name="z_image_turbo_fal",
            cost_estimate_usd=FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9,
            model_id=FAL_Z_IMAGE_TURBO_I2I_MODEL,
        )

    logger.info("Z-Image Turbo fal prompt (%d chars): %.120s...", len(prompt_text), prompt_text)
    arguments = {
        "prompt": prompt_text,
        "image_url": input_urls[0],
        "image_size": "landscape_16_9",
        "num_inference_steps": 8,
        "num_images": 1,
        "strength": 0.5,
        "enable_safety_checker": True,
        "output_format": "png",
    }
    try:
        result_data = await submit_fal_image(FAL_Z_IMAGE_TURBO_I2I_MODEL, arguments)
    except Exception as e:
        return _err(
            f"Z-Image Turbo fal i2i failed: {e}",
            prompt_text,
            provider_name="z_image_turbo_fal",
            cost_estimate_usd=FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9,
            model_id=FAL_Z_IMAGE_TURBO_I2I_MODEL,
        )

    images = result_data.get("images") or []
    image_url = images[0].get("url") if images else None
    if not image_url:
        return _err(
            f"Z-Image Turbo fal i2i succeeded but no result URL found in: {json.dumps(result_data)[:300]}",
            prompt_text,
            provider_name="z_image_turbo_fal",
            cost_estimate_usd=FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9,
            model_id=FAL_Z_IMAGE_TURBO_I2I_MODEL,
        )

    save_result = _download_and_save(image_url, output_path)
    if save_result is not None:
        return {
            **save_result,
            "prompt_text": prompt_text,
            "model_name": FAL_Z_IMAGE_TURBO_I2I_MODEL,
            "provider_name": "z_image_turbo_fal",
            "request_id": result_data.get("request_id"),
            "cost_estimate_usd": FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9,
        }

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
        "response_body": json.dumps(result_data, ensure_ascii=False),
        "provider_name": "z_image_turbo_fal",
        "model_name": FAL_Z_IMAGE_TURBO_I2I_MODEL,
        "request_id": result_data.get("request_id"),
        "cost_estimate_usd": FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9,
    }
