"""GPT Image-2 provider for card-deck image generation via kie.ai."""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from src.cost_logger import KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K

from .kie_common import (
    _download_and_save,
    _err,
    _extract_image_url,
    _poll_task,
    _submit_task,
)

logger = logging.getLogger(__name__)

GPT_IMAGE_2_T2I_MODEL = "gpt-image-2-text-to-image"
GPT_IMAGE_2_I2I_MODEL = "gpt-image-2-image-to-image"

__all__ = [
    "render_scene_gpt_image_2",
    "GPT_IMAGE_2_T2I_MODEL",
    "GPT_IMAGE_2_I2I_MODEL",
]


def render_scene_gpt_image_2(
    prompt_text: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    resolution: str = "1K",
    input_urls: Optional[list[str]] = None,
) -> dict:
    """Render via kie.ai gpt-image-2 endpoints."""
    api_key = os.environ.get("KIE_API_KEY", "")
    model_id = GPT_IMAGE_2_I2I_MODEL if input_urls else GPT_IMAGE_2_T2I_MODEL
    if not api_key:
        return _err(
            "KIE_API_KEY not set in environment",
            prompt_text,
            provider_name="gpt_image_2",
            cost_estimate_usd=KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K,
            model_id=model_id,
        )

    input_block: dict = {
        "prompt": prompt_text,
        "aspect_ratio": aspect_ratio,
        "resolution": resolution,
    }
    if input_urls:
        input_block["input_urls"] = input_urls

    payload = {
        "model": model_id,
        "input": input_block,
    }
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    logger.info("GPT Image-2 prompt (%d chars): %.120s...", len(prompt_text), prompt_text)
    task_id = _submit_task(payload, headers)
    if isinstance(task_id, dict):
        return {
            **task_id,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "gpt_image_2",
            "cost_estimate_usd": KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K,
        }

    logger.info("GPT Image-2 task created: %s", task_id)
    result_data = _poll_task(task_id, headers)
    if isinstance(result_data, dict) and "error_message" in result_data:
        return {
            **result_data,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "gpt_image_2",
            "request_id": task_id,
            "cost_estimate_usd": KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K,
        }

    image_url = _extract_image_url(result_data, task_id)
    if image_url is None:
        return _err(
            f"GPT Image-2 task succeeded but no result URL found in: {json.dumps(result_data)[:300]}",
            prompt_text,
            provider_name="gpt_image_2",
            cost_estimate_usd=KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K,
            model_id=model_id,
            request_id=task_id,
        )

    save_result = _download_and_save(image_url, output_path)
    if save_result is not None:
        return {
            **save_result,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "gpt_image_2",
            "request_id": task_id,
            "cost_estimate_usd": KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K,
        }

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
        "response_body": json.dumps(result_data, ensure_ascii=False),
        "provider_name": "gpt_image_2",
        "model_name": model_id,
        "request_id": task_id,
        "cost_estimate_usd": KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K,
    }
