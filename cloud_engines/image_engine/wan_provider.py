"""Wan 2.7 Image provider for the Image Engine.

Uses kie.ai API (same provider as Suno music generation).
All HTTP calls are synchronous (httpx.Client) to match renderer.py's sync call chain.

Shared transport helpers (submit/poll/extract/download/upload/_err) live
in .kie_common and are imported here to keep one source of truth.
"""

from __future__ import annotations

import json
import logging
import os
from pathlib import Path
from typing import Optional

from .prompt_compiler import compile_scene_to_text
from .kie_common import (
    _submit_task,
    _poll_task,
    _extract_image_url,
    _download_and_save,
    _upload_for_chaining,
    _err,
)
logger = logging.getLogger(__name__)

# Wan model IDs on kie.ai
WAN_MODEL_FAST = "wan/2-7-image"
WAN_MODEL_QUALITY = "wan/2-7-image-pro"


# Re-export _upload_for_chaining so existing `from .wan_provider import
# _upload_for_chaining` imports (e.g. renderer.py) keep working after the
# hoist.
__all__ = ["render_scene_wan", "_upload_for_chaining", "WAN_MODEL_FAST", "WAN_MODEL_QUALITY"]


def render_scene_wan(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    chain_instruction: Optional[str] = None,
    input_urls: Optional[list[str]] = None,
    use_color_palette: bool = False,
) -> dict:
    """Render a single scene using Wan 2.7 via kie.ai (synchronous).

    Args:
        image_prompt: ImagePromptData dict (already model_dump()'d by caller).
        model_id: "wan/2-7-image" or "wan/2-7-image-pro".
        output_path: Where to save the output PNG.
        aspect_ratio: "16:9", "9:16", or "1:1".
        chain_instruction: Optional continuity instruction injected into the prompt.
        use_color_palette: When True, include the storyboard's "Color palette:"
            section in the compiled text prompt.

    Returns:
        dict with keys:
            success (bool)
            file_path (str | None)  — output_path.name on success
            error_message (str | None)
            prompt_text (str)       — compiled prompt, for logging
            response_body (str | None)
            provider_name (str)
            model_name (str)
            request_id (str | None)
            cost_estimate_usd (float | None)
    """
    api_key = os.environ.get("KIE_API_KEY", "")
    if not api_key:
        return _err(
            "KIE_API_KEY not set in environment",
            "",
            provider_name="wan",
            cost_estimate_usd=None,
            model_id=model_id,
        )

    # Compile natural language prompt from the scene dict
    prompt_text = compile_scene_to_text(
        image_prompt,
        chain_instruction=chain_instruction,
        use_color_palette=use_color_palette,
        has_reference_image=bool(input_urls),
    )
    logger.info("Wan prompt (%d chars): %.120s...", len(prompt_text), prompt_text)

    # Resolution based on model tier
    resolution = "2K" if model_id == WAN_MODEL_QUALITY else "1K"

    # Build API payload
    payload = {
        "model": model_id,
        "input": {
            "prompt": prompt_text,
            "n": 1,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "watermark": False,
            "thinking_mode": False,
            "enable_sequential": False,
            "seed": 0,
        },
    }
    if input_urls:
        payload["input"]["input_urls"] = input_urls

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    # --- Submit task ---
    task_id = _submit_task(payload, headers)
    if isinstance(task_id, dict):
        # _submit_task returned an error dict
        return {
            **task_id,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "wan",
            "cost_estimate_usd": None,
        }

    logger.info("Wan task created: %s", task_id)

    # --- Poll until done ---
    result_data = _poll_task(task_id, headers)
    if isinstance(result_data, dict) and "error_message" in result_data:
        return {
            **result_data,
            "prompt_text": prompt_text,
            "model_name": model_id,
            "provider_name": "wan",
            "request_id": task_id,
            "cost_estimate_usd": None,
        }

    # --- Extract result URL ---
    image_url = _extract_image_url(result_data, task_id)
    if image_url is None:
        return _err(
            f"Wan task succeeded but no result URL found in: {json.dumps(result_data)[:300]}",
            prompt_text,
            provider_name="wan",
            cost_estimate_usd=None,
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
            "provider_name": "wan",
            "request_id": task_id,
            "cost_estimate_usd": None,
        }

    # Cost is tracked by renderer.py render_all_scenes() — no separate logging here

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
        "response_body": json.dumps(result_data, ensure_ascii=False),
        "provider_name": "wan",
        "model_name": model_id,
        "request_id": task_id,
        "cost_estimate_usd": None,
    }
