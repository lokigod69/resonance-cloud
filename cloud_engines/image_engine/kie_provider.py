"""Kie.ai Flux 2 Pro image provider (text-to-image and image-to-image).

Same kie.ai Market envelope as wan_provider — submit/poll/extract/
download helpers come from .kie_common. Per
INVESTIGATION_KIE_API_CONTRACT.md §1/§2:

  t2i model: "flux-2/pro-text-to-image"
  i2i model: "flux-2/pro-image-to-image"
  input for t2i: {prompt, aspect_ratio, resolution: "2K", nsfw_checker: False}
  input for i2i: {prompt, input_urls, aspect_ratio, resolution: "2K", nsfw_checker: False}

Flux 2 Pro at resolution=2K + aspect_ratio=16:9 returns ~2048-class 16:9,
not exactly 1920×1080, so we post-process with PIL resize-to-cover +
center-crop + LANCZOS before saving.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from PIL import Image as PILImage

from .prompt_compiler import compile_scene_to_text
from .kie_common import (
    _submit_task,
    _poll_task,
    _extract_image_url,
    _download_and_save,
    _err,
)
from src.cost_logger import KIE_FLUX_PRO_COST_PER_IMAGE

logger = logging.getLogger(__name__)

FLUX_T2I_MODEL = "flux-2/pro-text-to-image"
FLUX_I2I_MODEL = "flux-2/pro-image-to-image"

TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080


def render_scene_kie_flux(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    chain_instruction: Optional[str] = None,
    input_urls: Optional[list[str]] = None,
    use_color_palette: bool = False,
) -> dict:
    """Render a single scene via Kie.ai Flux 2 Pro.

    Args:
        image_prompt: ImagePromptData dict (already model_dump()'d by caller).
        model_id: FLUX_T2I_MODEL or FLUX_I2I_MODEL.
        output_path: Where to save the output PNG.
        aspect_ratio: "16:9", "9:16", or "1:1" (Flux also supports 4:3, 3:4, 3:2, 2:3).
        chain_instruction: Optional continuity instruction injected into the prompt.
        input_urls: For i2i — public HTTPS URLs of reference images (already uploaded
            by the caller via kie_common._upload_for_chaining).
        use_color_palette: Forwarded to compile_scene_to_text.

    Returns:
        dict with the standard 9-key provider shape (success, file_path,
        error_message, prompt_text, response_body, provider_name,
        model_name, request_id, cost_estimate_usd).
    """
    api_key = os.environ.get("KIE_API_KEY", "")
    if not api_key:
        return _err(
            "KIE_API_KEY not set in environment",
            "",
            provider_name="kie_flux",
            cost_estimate_usd=KIE_FLUX_PRO_COST_PER_IMAGE,
            model_id=model_id,
        )

    # Compile the text prompt (same compiler Wan uses)
    prompt_text = compile_scene_to_text(
        image_prompt,
        chain_instruction=chain_instruction,
        use_color_palette=use_color_palette,
    )
    logger.info("Flux prompt (%d chars): %.120s...", len(prompt_text), prompt_text)

    # Build payload per §1/§2
    input_block: dict = {
        "prompt": prompt_text,
        "aspect_ratio": aspect_ratio,
        "resolution": "2K",
        "nsfw_checker": False,
    }
    if model_id == FLUX_I2I_MODEL:
        if not input_urls:
            return _err(
                "Flux i2i requires input_urls",
                prompt_text,
                provider_name="kie_flux",
                cost_estimate_usd=KIE_FLUX_PRO_COST_PER_IMAGE,
                model_id=model_id,
            )
        input_block["input_urls"] = input_urls

    payload = {"model": model_id, "input": input_block}
    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # --- Submit task ---
    task_id = _submit_task(payload, headers)
    if isinstance(task_id, dict):
        return {
            **task_id,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "kie_flux",
            "cost_estimate_usd": KIE_FLUX_PRO_COST_PER_IMAGE,
        }

    logger.info("Flux task created: %s", task_id)

    # --- Poll until done ---
    result_data = _poll_task(task_id, headers)
    if isinstance(result_data, dict) and "error_message" in result_data:
        return {
            **result_data,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "kie_flux",
            "request_id": task_id,
            "cost_estimate_usd": KIE_FLUX_PRO_COST_PER_IMAGE,
        }

    # --- Extract result URL ---
    image_url = _extract_image_url(result_data, task_id)
    if image_url is None:
        return _err(
            f"Flux task succeeded but no result URL found in: {json.dumps(result_data)[:300]}",
            prompt_text,
            provider_name="kie_flux",
            cost_estimate_usd=KIE_FLUX_PRO_COST_PER_IMAGE,
            model_id=model_id,
            request_id=task_id,
        )

    # --- Download and save as PNG ---
    save_result = _download_and_save(image_url, output_path)
    if save_result is not None:
        return {
            **save_result,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "kie_flux",
            "request_id": task_id,
            "cost_estimate_usd": KIE_FLUX_PRO_COST_PER_IMAGE,
        }

    # --- Post-process: resize-to-cover + center-crop to exactly 1920x1080 ---
    try:
        img = PILImage.open(output_path)
        src_w, src_h = img.size
        if (src_w, src_h) != (TARGET_WIDTH, TARGET_HEIGHT):
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
            logger.info(
                "Flux image resized %dx%d -> %dx%d (LANCZOS + center-crop)",
                src_w, src_h, TARGET_WIDTH, TARGET_HEIGHT,
            )
    except Exception as e:
        # Don't fail the render — keep the raw save and log a warning.
        logger.warning("Flux post-resize failed (keeping raw save): %s", e)

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
        "response_body": json.dumps(result_data, ensure_ascii=False),
        "provider_name": "kie_flux",
        "model_name": model_id,
        "request_id": task_id,
        "cost_estimate_usd": KIE_FLUX_PRO_COST_PER_IMAGE,
    }
