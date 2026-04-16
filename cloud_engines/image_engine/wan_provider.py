"""Wan 2.7 Image provider for the Image Engine.

Uses kie.ai API (same provider as Suno music generation).
All HTTP calls are synchronous (httpx.Client) to match renderer.py's sync call chain.

API endpoints:
  Submit:  POST https://api.kie.ai/api/v1/jobs/createTask
  Poll:    GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<id>
  Auth:    Authorization: Bearer <KIE_API_KEY>
  States:  waiting → queuing → generating → success / fail
  Results: data.resultJson (JSON string) → {"resultUrls": ["https://..."]}
"""

from __future__ import annotations

import json
import logging
import os
import time
from io import BytesIO
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image as PILImage

from .prompt_compiler import compile_scene_to_text
from src.cost_logger import log_cost, KIE_WAN_COST_PER_IMAGE

logger = logging.getLogger(__name__)

KIE_API_BASE = "https://api.kie.ai/api/v1"

# Wan model IDs on kie.ai
WAN_MODEL_FAST = "wan/2-7-image"
WAN_MODEL_QUALITY = "wan/2-7-image-pro"

# Polling config (separate from Suno — images may complete faster than audio)
WAN_POLL_INTERVAL = 5.0   # seconds between polls
WAN_MAX_POLL_TIME = 180.0  # max seconds to wait
WAN_HTTP_TIMEOUT = 30.0   # per-request HTTP timeout
WAN_DOWNLOAD_TIMEOUT = 60.0  # image download timeout


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
    """
    api_key = os.environ.get("KIE_API_KEY", "")
    if not api_key:
        return _err("KIE_API_KEY not set in environment", "")

    # Compile natural language prompt from the scene dict
    prompt_text = compile_scene_to_text(
        image_prompt,
        chain_instruction=chain_instruction,
        use_color_palette=use_color_palette,
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
        return {**task_id, "prompt_text": prompt_text}

    logger.info("Wan task created: %s", task_id)

    # --- Poll until done ---
    result_data = _poll_task(task_id, headers)
    if isinstance(result_data, dict) and "error_message" in result_data:
        return {**result_data, "prompt_text": prompt_text}

    # --- Extract result URL ---
    image_url = _extract_image_url(result_data, task_id)
    if image_url is None:
        return _err(
            f"Wan task succeeded but no result URL found in: {json.dumps(result_data)[:300]}",
            prompt_text,
        )

    # --- Download and save as PNG ---
    save_result = _download_and_save(image_url, output_path)
    if save_result is not None:
        return {**save_result, "prompt_text": prompt_text}

    # Cost is tracked by renderer.py render_all_scenes() — no separate logging here

    return {
        "success": True,
        "file_path": output_path.name,
        "error_message": None,
        "prompt_text": prompt_text,
    }


def _upload_for_chaining(image_path: Path, api_key: str) -> Optional[str]:
    """Upload a PNG to kie.ai File Upload API for use as input_urls reference.

    Returns the public fileUrl on success, None on failure (caller degrades gracefully).
    Files auto-delete after 3 days; we need them for minutes.
    """
    import base64
    import uuid

    try:
        b64_data = base64.b64encode(image_path.read_bytes()).decode("utf-8")
        filename = f"chain_{uuid.uuid4().hex[:12]}.png"

        with httpx.Client(timeout=30.0) as client:
            resp = client.post(
                "https://kieai.redpandaai.co/api/file-base64-upload",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={"base64Data": b64_data, "fileName": filename, "uploadPath": "images"},
            )
            resp.raise_for_status()
            file_url = resp.json().get("data", {}).get("downloadUrl")
            if file_url:
                logger.info("Uploaded chain image: %s", file_url)
                return file_url
            logger.warning("Upload succeeded but no downloadUrl in response: %s", resp.text[:200])
            return None
    except Exception as e:
        logger.warning("Chain image upload failed: %s", e)
        return None


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _submit_task(payload: dict, headers: dict) -> str | dict:
    """POST to kie.ai createTask. Returns taskId string or error dict."""
    try:
        with httpx.Client(timeout=WAN_HTTP_TIMEOUT) as client:
            resp = client.post(
                f"{KIE_API_BASE}/jobs/createTask",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        if data.get("code") not in (200, None) and data.get("code") != 0:
            # kie.ai returns non-200 code in the JSON body on some errors
            return _err(f"kie.ai submit error code {data.get('code')}: {json.dumps(data)[:300]}", "")

        task_id = data.get("data", {}).get("taskId")
        if not task_id:
            return _err(f"kie.ai returned no taskId: {json.dumps(data)[:300]}", "")

        return task_id

    except httpx.HTTPStatusError as e:
        return _err(f"Wan submit HTTP error {e.response.status_code}: {e}", "")
    except Exception as e:
        return _err(f"Wan submit failed: {e}", "")


def _poll_task(task_id: str, headers: dict) -> dict:
    """Poll /jobs/recordInfo until success or failure. Returns full response dict or error dict."""
    start = time.monotonic()

    try:
        with httpx.Client(timeout=WAN_HTTP_TIMEOUT) as client:
            while True:
                elapsed = time.monotonic() - start
                if elapsed > WAN_MAX_POLL_TIME:
                    return _err(
                        f"Wan task {task_id} timed out after {WAN_MAX_POLL_TIME:.0f}s",
                        "",
                    )

                try:
                    resp = client.get(
                        f"{KIE_API_BASE}/jobs/recordInfo",
                        params={"taskId": task_id},
                        headers={"Authorization": headers["Authorization"]},
                    )
                    resp.raise_for_status()
                    result = resp.json()
                except httpx.HTTPError as e:
                    logger.warning(
                        "Wan poll HTTP error for %s (elapsed %.0fs): %s",
                        task_id, elapsed, e,
                    )
                    time.sleep(WAN_POLL_INTERVAL)
                    continue

                data = result.get("data", {})
                state = data.get("state", "")
                logger.info(
                    "Wan task %s state: %s (elapsed %.0fs)",
                    task_id, state, elapsed,
                )

                if state == "success":
                    return result

                if state == "fail":
                    fail_msg = (
                        data.get("failMsg")
                        or data.get("errorMessage")
                        or "unknown error"
                    )
                    return _err(f"Wan generation failed: {fail_msg}", "")

                # waiting / queuing / generating — keep polling
                time.sleep(WAN_POLL_INTERVAL)

    except Exception as e:
        return _err(f"Wan poll error: {e}", "")


def _extract_image_url(result_data: dict, task_id: str) -> Optional[str]:
    """Pull the first image URL out of the kie.ai task result.

    kie.ai market tasks return results in data.resultJson (JSON string):
        {"resultUrls": ["https://..."]}
    Falls back to data.response.resultUrls and data.resultUrls.
    """
    data = result_data.get("data", {})

    # Primary path: data.resultJson (JSON string)
    result_json_raw = data.get("resultJson")
    if result_json_raw:
        try:
            result_json = (
                json.loads(result_json_raw)
                if isinstance(result_json_raw, str)
                else result_json_raw
            )
            urls = result_json.get("resultUrls", [])
            if urls:
                return urls[0]
        except (json.JSONDecodeError, AttributeError):
            logger.warning("Wan task %s: could not parse resultJson: %s", task_id, result_json_raw)

    # Fallback: data.response.resultUrls
    urls = data.get("response", {}).get("resultUrls", [])
    if urls:
        return urls[0]

    # Fallback: data.resultUrls
    urls = data.get("resultUrls", [])
    if urls:
        return urls[0]

    return None


def _download_and_save(image_url: str, output_path: Path) -> Optional[dict]:
    """Download an image from image_url and save as PNG to output_path.

    Returns None on success, or an error dict on failure.
    """
    logger.info("Downloading Wan image: %s", image_url)
    try:
        with httpx.Client(timeout=WAN_DOWNLOAD_TIMEOUT) as client:
            resp = client.get(image_url)
            resp.raise_for_status()
            image_bytes = resp.content
            content_type = resp.headers.get("content-type", "").lower()

        output_path.parent.mkdir(parents=True, exist_ok=True)

        if "png" in content_type:
            output_path.write_bytes(image_bytes)
        else:
            # Convert JPEG / WebP / etc. to PNG
            img = PILImage.open(BytesIO(image_bytes))
            img.save(str(output_path), format="PNG")
            logger.info(
                "Wan image converted from %s to PNG (%d bytes)",
                content_type, len(image_bytes),
            )

        logger.info("Wan image saved: %s (%d bytes)", output_path.name, len(image_bytes))
        return None  # success

    except Exception as e:
        return _err(f"Wan image download/save failed: {e}", "")


def _err(message: str, prompt_text: str) -> dict:
    return {"success": False, "file_path": None, "error_message": message, "prompt_text": prompt_text}
