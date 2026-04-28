"""Seedream 5.0 Lite image provider for the Image Engine.

Uses kie.ai Market APIs and the shared kie_common transport helpers.
The public function mirrors wan_provider.render_scene_wan so renderer.py
can keep provider orchestration, event logging, and storage upload.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from src.cost_logger import KIE_SEEDREAM_LITE_COST_PER_IMAGE

from .kie_common import (
    _download_and_save,
    _err,
    _extract_image_url,
    _poll_task,
    _submit_task,
)
from .prompt_compiler import compile_scene_to_text

logger = logging.getLogger(__name__)

SEEDREAM_T2I_MODEL = "seedream/5-lite-text-to-image"
SEEDREAM_I2I_MODEL = "seedream/5-lite-image-to-image"

__all__ = [
    "render_scene_seedream",
    "SEEDREAM_T2I_MODEL",
    "SEEDREAM_I2I_MODEL",
]


def render_scene_seedream(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    input_urls: Optional[list[str]] = None,
    use_color_palette: bool = False,
    art_style: str = "photorealistic",
) -> dict:
    """Render a single scene using Seedream 5.0 Lite via kie.ai."""
    api_key = os.environ.get("KIE_API_KEY", "")
    if not api_key:
        return _err(
            "KIE_API_KEY not set in environment",
            "",
            provider_name="seedream",
            cost_estimate_usd=KIE_SEEDREAM_LITE_COST_PER_IMAGE,
            model_id=model_id,
        )

    prompt_text = compile_scene_to_text(
        {
            "art_style": art_style,
            "image_prompt": image_prompt,
        },
        use_color_palette=use_color_palette,
        has_reference_image=bool(input_urls),
    )
    logger.info("Seedream prompt (%d chars): %.120s...", len(prompt_text), prompt_text)

    effective_model_id = SEEDREAM_I2I_MODEL if input_urls else SEEDREAM_T2I_MODEL
    input_block: dict = {
        "prompt": prompt_text,
        "aspect_ratio": aspect_ratio,
        "quality": "basic",
        "nsfw_checker": False,
    }
    if input_urls:
        input_block["image_urls"] = input_urls

    payload = {
        "model": effective_model_id,
        "input": input_block,
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
            "model_name": effective_model_id,
            "provider_name": "seedream",
            "cost_estimate_usd": KIE_SEEDREAM_LITE_COST_PER_IMAGE,
        }

    logger.info("Seedream task created: %s", task_id)

    result_data = _poll_task(task_id, headers)
    if isinstance(result_data, dict) and "error_message" in result_data:
        return {
            **result_data,
            "prompt_text": prompt_text,
            "model_name": effective_model_id,
            "provider_name": "seedream",
            "request_id": task_id,
            "cost_estimate_usd": KIE_SEEDREAM_LITE_COST_PER_IMAGE,
        }

    image_url = _extract_image_url(result_data, task_id)
    if image_url is None:
        return _err(
            f"Seedream task succeeded but no result URL found in: {json.dumps(result_data)[:300]}",
            prompt_text,
            provider_name="seedream",
            cost_estimate_usd=KIE_SEEDREAM_LITE_COST_PER_IMAGE,
            model_id=effective_model_id,
            request_id=task_id,
        )

    save_result = _download_and_save(image_url, output_path)
    if save_result is not None:
        return {
            **save_result,
            "prompt_text": prompt_text,
            "model_name": effective_model_id,
            "provider_name": "seedream",
            "request_id": task_id,
            "cost_estimate_usd": KIE_SEEDREAM_LITE_COST_PER_IMAGE,
        }

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
        "response_body": json.dumps(result_data, ensure_ascii=False),
        "provider_name": "seedream",
        "model_name": effective_model_id,
        "request_id": task_id,
        "cost_estimate_usd": KIE_SEEDREAM_LITE_COST_PER_IMAGE,
    }
