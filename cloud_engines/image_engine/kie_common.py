"""Shared helpers for kie.ai Market-tier image providers.

Hoisted from wan_provider.py so wan_provider, kie_provider (Flux 2 Pro),
and any future kie.ai Market image models share one implementation of
submit → poll → extract → download → upload plus the error-dict builder.

All four kie.ai Market image endpoints (Wan 2.7, Flux 2 Pro t2i/i2i,
Z-Image) share a single envelope:
  Submit:  POST https://api.kie.ai/api/v1/jobs/createTask
  Poll:    GET  https://api.kie.ai/api/v1/jobs/recordInfo?taskId=<id>
  Auth:    Authorization: Bearer <KIE_API_KEY>
  States:  waiting → queuing → generating → success / fail
  Results: data.resultJson (JSON string) → {"resultUrls": ["https://..."]}
"""

from __future__ import annotations

import base64
import json
import logging
import time
import uuid
from io import BytesIO
from pathlib import Path
from typing import Optional

import httpx
from PIL import Image as PILImage

logger = logging.getLogger(__name__)

KIE_API_BASE = "https://api.kie.ai/api/v1"

# Shared polling/timeout config across all kie.ai Market image models.
# Image generations are fast (sub-minute typical); revisit MAX_POLL_TIME
# if a slower model ever plugs in here.
KIE_POLL_INTERVAL = 5.0      # seconds between polls
KIE_MAX_POLL_TIME = 180.0    # max seconds to wait
KIE_HTTP_TIMEOUT = 30.0      # per-request HTTP timeout
KIE_DOWNLOAD_TIMEOUT = 60.0  # image download timeout


def _submit_task(payload: dict, headers: dict) -> str | dict:
    """POST to kie.ai createTask. Returns taskId string or error dict."""
    try:
        with httpx.Client(timeout=KIE_HTTP_TIMEOUT) as client:
            resp = client.post(
                f"{KIE_API_BASE}/jobs/createTask",
                headers=headers,
                json=payload,
            )
            resp.raise_for_status()
            data = resp.json()

        if data.get("code") not in (200, None) and data.get("code") != 0:
            # kie.ai returns non-200 code in the JSON body on some errors
            return _err(
                f"kie.ai submit error code {data.get('code')}: {json.dumps(data)[:300]}",
                "",
                provider_name="",
                cost_estimate_usd=0.0,
            )

        task_id = data.get("data", {}).get("taskId")
        if not task_id:
            return _err(
                f"kie.ai returned no taskId: {json.dumps(data)[:300]}",
                "",
                provider_name="",
                cost_estimate_usd=0.0,
            )

        return task_id

    except httpx.HTTPStatusError as e:
        return _err(
            f"submit HTTP error {e.response.status_code}: {e}",
            "",
            provider_name="",
            cost_estimate_usd=0.0,
        )
    except Exception as e:
        return _err(
            f"submit failed: {e}",
            "",
            provider_name="",
            cost_estimate_usd=0.0,
        )


def _poll_task(task_id: str, headers: dict) -> dict:
    """Poll /jobs/recordInfo until success or failure. Returns full response dict or error dict."""
    start = time.monotonic()

    try:
        with httpx.Client(timeout=KIE_HTTP_TIMEOUT) as client:
            while True:
                elapsed = time.monotonic() - start
                if elapsed > KIE_MAX_POLL_TIME:
                    return _err(
                        f"task {task_id} timed out after {KIE_MAX_POLL_TIME:.0f}s",
                        "",
                        provider_name="",
                        cost_estimate_usd=0.0,
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
                        "poll HTTP error for %s (elapsed %.0fs): %s",
                        task_id, elapsed, e,
                    )
                    time.sleep(KIE_POLL_INTERVAL)
                    continue

                data = result.get("data", {})
                state = data.get("state", "")
                logger.info(
                    "task %s state: %s (elapsed %.0fs)",
                    task_id, state, elapsed,
                )

                if state == "success":
                    return result

                if state == "fail":
                    fail_code = data.get("failCode") or data.get("errorCode")
                    fail_msg = (
                        data.get("failMsg")
                        or data.get("errorMessage")
                        or "unknown error"
                    )
                    err = _err(
                        (
                            f"generation failed: failCode={fail_code or 'unknown'} "
                            f"failMsg={fail_msg}"
                        ),
                        "",
                        provider_name="",
                        cost_estimate_usd=0.0,
                        request_id=task_id,
                    )
                    err["response_body"] = json.dumps(result, ensure_ascii=False)
                    err["task_id"] = task_id
                    if fail_code is not None:
                        err["fail_code"] = fail_code
                    return err

                # waiting / queuing / generating — keep polling
                time.sleep(KIE_POLL_INTERVAL)

    except Exception as e:
        return _err(
            f"poll error: {e}",
            "",
            provider_name="",
            cost_estimate_usd=0.0,
        )


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
            logger.warning("task %s: could not parse resultJson: %s", task_id, result_json_raw)

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
    logger.info("Downloading image: %s", image_url)
    try:
        with httpx.Client(timeout=KIE_DOWNLOAD_TIMEOUT) as client:
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
                "image converted from %s to PNG (%d bytes)",
                content_type, len(image_bytes),
            )

        logger.info("image saved: %s (%d bytes)", output_path.name, len(image_bytes))
        return None  # success

    except Exception as e:
        return _err(
            f"image download/save failed: {e}",
            "",
            provider_name="",
            cost_estimate_usd=0.0,
        )


def _upload_for_chaining(image_path: Path, api_key: str) -> Optional[str]:
    """Upload a PNG to kie.ai File Upload API for use as input_urls reference.

    Returns the public fileUrl on success, None on failure (caller degrades gracefully).
    Files auto-delete after 3 days; we need them for minutes.
    """
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


def _err(
    message: str,
    prompt_text: str,
    *,
    provider_name: str,
    cost_estimate_usd: float,
    model_id: str | None = None,
    request_id: str | None = None,
) -> dict:
    """Build a failure-result dict in the standard 9-key shape.

    `provider_name` and `cost_estimate_usd` are required kwargs so callers
    declare the provider identity at the boundary. Internal helpers in
    this module pass empty/zero defaults; the outer provider caller
    decorates with its real values before returning to the renderer.
    """
    return {
        "success": False,
        "file_path": None,
        "error_message": message,
        "prompt_text": prompt_text,
        "response_body": None,
        "provider_name": provider_name,
        "model_name": model_id,
        "request_id": request_id,
        "cost_estimate_usd": cost_estimate_usd,
    }
