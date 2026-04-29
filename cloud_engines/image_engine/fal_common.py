"""Shared helpers for fal.ai image providers."""

from __future__ import annotations

import os
from typing import Any

import httpx

FAL_START_TIMEOUT = 60
FAL_CLIENT_TIMEOUT = 180


def _require_fal_key() -> None:
    if not os.environ.get("FAL_KEY"):
        raise RuntimeError("FAL_KEY not set in environment")


async def submit_fal_image(model_id: str, arguments: dict) -> dict:
    """Submit an image-generation request to fal via queue-backed subscribe_async."""
    _require_fal_key()
    try:
        import fal_client

        result: Any = await fal_client.subscribe_async(
            model_id,
            arguments=arguments,
            start_timeout=FAL_START_TIMEOUT,
            client_timeout=FAL_CLIENT_TIMEOUT,
        )
        if not isinstance(result, dict):
            raise RuntimeError(f"Fal returned non-dict result: {type(result).__name__}")
        return result
    except httpx.HTTPStatusError as e:
        status = e.response.status_code
        if status == 401:
            msg = "Fal auth failed (401): check FAL_KEY"
        elif status == 403:
            msg = "Fal billing or credits exhausted (403)"
        elif status == 422:
            msg = f"Fal validation error (422): {e.response.text[:200]}"
        elif status == 429:
            msg = "Fal rate limited (429): queue mode did not complete"
        elif 500 <= status < 600:
            msg = f"Fal upstream error ({status})"
        else:
            msg = f"Fal HTTP {status}: {e.response.text[:200]}"
        raise RuntimeError(msg) from e
    except httpx.TimeoutException as e:
        raise RuntimeError(f"Fal timed out: {e}") from e
    except RuntimeError:
        raise
    except Exception as e:
        raise RuntimeError(f"Fal call failed: {e}") from e


async def upload_image_to_fal(image_bytes: bytes, content_type: str = "image/png") -> str:
    """Upload image bytes to fal storage and return a public URL."""
    _require_fal_key()
    try:
        import fal_client

        return await fal_client.upload_async(image_bytes, content_type)
    except httpx.HTTPStatusError as e:
        raise RuntimeError(f"Fal upload HTTP {e.response.status_code}: {e.response.text[:200]}") from e
    except httpx.TimeoutException as e:
        raise RuntimeError(f"Fal upload timed out: {e}") from e
    except Exception as e:
        raise RuntimeError(f"Fal upload failed: {e}") from e
