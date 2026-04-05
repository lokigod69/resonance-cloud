"""Generic kie.ai async task client.

Shared utility for submitting and polling kie.ai tasks. Intended for use
by orchestrator-side integrations (currently Suno; future refactoring welcome).

Note: The Image Engine's Wan provider (engines/image-engine/src/wan_provider.py)
has its own synchronous HTTP calls since it runs in a separate process.

API base: https://api.kie.ai/api/v1
Auth:     Authorization: Bearer <KIE_API_KEY>
"""

from __future__ import annotations

import logging
import os
import asyncio

import httpx

logger = logging.getLogger(__name__)

KIE_API_BASE = "https://api.kie.ai/api/v1"

# Defaults tuned for image tasks; callers may override
_DEFAULT_POLL_INTERVAL = 5.0    # seconds
_DEFAULT_MAX_POLL_TIME = 180.0  # seconds
_DEFAULT_HTTP_TIMEOUT = 30.0    # per-request


def get_api_key() -> str:
    """Load KIE_API_KEY from environment. Raises ValueError if absent."""
    key = os.getenv("KIE_API_KEY", "")
    if not key:
        raise ValueError("KIE_API_KEY not set in environment")
    return key


async def submit_kie_task(
    api_key: str,
    model: str,
    input_params: dict,
    timeout: float = _DEFAULT_HTTP_TIMEOUT,
) -> str:
    """Submit a task to the kie.ai market endpoint.

    Args:
        api_key:      Bearer token.
        model:        kie.ai model identifier, e.g. "wan/2-7-image".
        input_params: Model-specific input dict (goes into the "input" field).
        timeout:      Per-request HTTP timeout.

    Returns:
        taskId string.

    Raises:
        httpx.HTTPError: On HTTP-level failure.
        ValueError:      If the response contains no taskId.
    """
    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{KIE_API_BASE}/jobs/createTask",
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
            json={"model": model, "input": input_params},
        )
        resp.raise_for_status()
        data = resp.json()

    task_id = data.get("data", {}).get("taskId")
    if not task_id:
        raise ValueError(f"kie.ai returned no taskId: {data}")

    return task_id


async def poll_kie_task(
    api_key: str,
    task_id: str,
    poll_interval: float = _DEFAULT_POLL_INTERVAL,
    max_poll_time: float = _DEFAULT_MAX_POLL_TIME,
    timeout: float = _DEFAULT_HTTP_TIMEOUT,
) -> dict:
    """Poll a kie.ai market task until completion.

    Task states: waiting → queuing → generating → success / fail

    Args:
        api_key:       Bearer token.
        task_id:       ID returned by submit_kie_task().
        poll_interval: Seconds between poll requests.
        max_poll_time: Maximum wait time before raising TimeoutError.
        timeout:       Per-request HTTP timeout.

    Returns:
        Full response dict on success (state == "success").

    Raises:
        RuntimeError:  If the task fails (state == "fail").
        TimeoutError:  If max_poll_time is exceeded.
    """
    import time
    start = time.monotonic()

    async with httpx.AsyncClient(timeout=timeout) as client:
        while True:
            elapsed = time.monotonic() - start
            if elapsed > max_poll_time:
                raise TimeoutError(
                    f"kie.ai task {task_id} timed out after {max_poll_time:.0f}s"
                )

            resp = await client.get(
                f"{KIE_API_BASE}/jobs/recordInfo",
                params={"taskId": task_id},
                headers={"Authorization": f"Bearer {api_key}"},
            )
            resp.raise_for_status()
            result = resp.json()

            state = result.get("data", {}).get("state", "")
            logger.info(
                "kie.ai task %s state: %s (elapsed %.0fs)", task_id, state, elapsed
            )

            if state == "success":
                return result

            if state == "fail":
                data = result.get("data", {})
                fail_msg = (
                    data.get("failMsg")
                    or data.get("errorMessage")
                    or "unknown error"
                )
                raise RuntimeError(f"kie.ai task {task_id} failed: {fail_msg}")

            await asyncio.sleep(poll_interval)
