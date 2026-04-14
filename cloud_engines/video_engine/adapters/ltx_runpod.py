"""RunPod Serverless LTX adapter (async run + poll pattern).

Submits video generation jobs to a RunPod Serverless endpoint,
polls for completion, and decodes the base64 MP4 result.

Uses async ``/run`` (NOT ``/runsync``) because pro-quality generation
can exceed the 300 s ``runsync`` default timeout.
"""

from __future__ import annotations

import base64
import logging
import time
from pathlib import Path
from typing import Any, Optional

import httpx

from ..config import (
    GPU_WORKER_POLL_INTERVAL,
    GPU_WORKER_TIMEOUT,
    RUNPOD_API_KEY,
    RUNPOD_ENDPOINT_ID,
)
from ..download import extract_thumbnail
from ..models import VideoContent, VideoSettings
from .base import VideoProviderAdapter
from .ltx_shared import (
    _I2V_DURATIONS,
    _T2V_FAST_DURATIONS,
    _T2V_PRO_DURATIONS,
    _snap_duration,
    build_ltx_negative,
    build_ltx_prompt,
)

logger = logging.getLogger(__name__)

_RUNPOD_API_BASE = "https://api.runpod.ai/v2"


class LTXRunPodAdapter(VideoProviderAdapter):
    """Adapter that calls a RunPod Serverless endpoint for LTX video generation.

    Uses the async job pattern: POST /run → GET /status/{id} → extract output.
    """

    def __init__(self, tier: str = "ltx_fast") -> None:
        valid_tiers = {"ltx_fast", "ltx_pro", "ltx"}
        if tier not in valid_tiers:
            raise ValueError(f"Unknown LTX tier: {tier}. Valid: {sorted(valid_tiers)}")
        self.tier = tier
        self._quality = "pro" if tier == "ltx_pro" else "fast"

    @property
    def provider_name(self) -> str:
        return "runpod-ltx"

    @property
    def model_name(self) -> str:
        return f"ltx-2.3-{'pro' if self._quality == 'pro' else 'fast'}"

    def validate_settings(self, settings: VideoSettings) -> VideoSettings:
        """Clamp settings to the same constraints as LTXAdapter."""
        adjusted = settings.model_copy()
        if adjusted.resolution not in ("1080p", "1440p", "2160p"):
            adjusted.resolution = "1080p"

        if adjusted.text_to_video and self.tier == "ltx_pro":
            valid = _T2V_PRO_DURATIONS
        elif adjusted.text_to_video:
            valid = _T2V_FAST_DURATIONS
        else:
            valid = _I2V_DURATIONS

        adjusted.duration = _snap_duration(adjusted.duration, valid)
        return adjusted

    def estimate_cost(self, settings: VideoSettings) -> float:
        """Return estimated self-hosted GPU cost in USD.

        NOTE: engine.py does not use this method for metadata. The same pricing
        logic must also exist in cost.py.
        """
        duration = settings.duration
        if self._quality == "pro":
            estimated_gpu_seconds = (duration / 6.0) * 540
        else:
            estimated_gpu_seconds = (duration / 6.0) * 90

        rate_per_second = 0.86 / 3600
        return round(estimated_gpu_seconds * rate_per_second, 4)

    def generate(
        self,
        image_path: Optional[str],
        content: VideoContent,
        settings: VideoSettings,
        output_path: str,
    ) -> dict[str, Any]:
        """Generate video via RunPod Serverless.

        Async job pattern: POST /run → poll /status/{id} → decode base64 result.
        The handler on the worker returns base64-encoded MP4 in the output field
        of the status response — no separate download phase.

        engine.py reads these keys from the result dict:
        - resolution
        - fps
        - duration_seconds
        - file_size_bytes
        - fal_request_id
        """
        if not RUNPOD_API_KEY:
            raise RuntimeError("RUNPOD_API_KEY not set")
        if not RUNPOD_ENDPOINT_ID:
            raise RuntimeError("RUNPOD_ENDPOINT_ID not set")

        # End-to-end deadline — all phases (submit, poll) share this budget
        deadline = time.monotonic() + GPU_WORKER_TIMEOUT

        is_text_to_video = settings.text_to_video

        final_prompt = build_ltx_prompt(
            video_prompt=content.video_prompt,
            camera_motion=content.camera_motion,
            is_t2v=is_text_to_video,
            text_to_video_prompt=content.text_to_video_prompt,
        )
        final_negative = build_ltx_negative(settings.negative_prompt)

        # ── Base64-encode images ─────────────────────────────────────
        image_base64 = None
        if not is_text_to_video and image_path and Path(image_path).exists():
            image_base64 = base64.b64encode(
                Path(image_path).read_bytes()
            ).decode("utf-8")

        end_image_base64 = None
        if (
            not is_text_to_video
            and content.end_image_path
            and Path(content.end_image_path).exists()
        ):
            end_image_base64 = base64.b64encode(
                Path(content.end_image_path).read_bytes()
            ).decode("utf-8")

        # ── Build RunPod payload ─────────────────────────────────────
        runpod_payload = {
            "input": {
                "prompt": final_prompt,
                "negative_prompt": final_negative,
                "duration": settings.duration,
                "resolution": settings.resolution,
                "seed": settings.seed,
                "quality": self._quality,
                "scene_number": content.scene_number,
                "image_base64": image_base64,
                "end_image_base64": end_image_base64,
            }
        }

        headers = {
            "Authorization": f"Bearer {RUNPOD_API_KEY}",
            "Content-Type": "application/json",
        }

        endpoint_url = f"{_RUNPOD_API_BASE}/{RUNPOD_ENDPOINT_ID}"

        # ── Phase 1: Submit job ──────────────────────────────────────
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            raise TimeoutError(
                f"RunPod timeout ({GPU_WORKER_TIMEOUT}s) exceeded before submit"
            )

        submit_timeout = min(60, remaining)
        with httpx.Client(
            timeout=httpx.Timeout(submit_timeout, connect=min(30, remaining))
        ) as client:
            submit_response = client.post(
                f"{endpoint_url}/run",
                json=runpod_payload,
                headers=headers,
            )

        if submit_response.status_code == 401:
            raise RuntimeError("RunPod auth failed — check RUNPOD_API_KEY")

        if submit_response.status_code == 400:
            try:
                detail = submit_response.json().get("error", submit_response.text)
            except Exception:
                detail = submit_response.text
            raise ValueError(f"RunPod rejected request: {detail}")

        if submit_response.status_code not in (200, 201):
            try:
                err = submit_response.json().get("error", submit_response.text)
            except Exception:
                err = submit_response.text
            raise RuntimeError(
                f"RunPod submit failed ({submit_response.status_code}): {err}"
            )

        submit_data = submit_response.json()
        job_id = submit_data["id"]
        logger.info("RunPod LTX job submitted: %s", job_id)

        # ── Phase 2: Poll for completion ─────────────────────────────
        poll_start = time.monotonic()
        last_log_time = poll_start
        consecutive_errors = 0
        max_consecutive_errors = 10
        job_output: dict = {}

        while True:
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                elapsed = time.monotonic() - poll_start
                raise TimeoutError(
                    f"RunPod job {job_id} timed out after {int(elapsed)}s polling. "
                    f"GPU_WORKER_TIMEOUT={GPU_WORKER_TIMEOUT}s (end-to-end)."
                )

            time.sleep(min(GPU_WORKER_POLL_INTERVAL, remaining))
            remaining = deadline - time.monotonic()

            if remaining <= 0:
                elapsed = time.monotonic() - poll_start
                raise TimeoutError(
                    f"RunPod job {job_id} timed out after {int(elapsed)}s polling. "
                    f"GPU_WORKER_TIMEOUT={GPU_WORKER_TIMEOUT}s (end-to-end)."
                )

            try:
                poll_read_timeout = max(min(remaining, 30), 1.0)
                poll_connect_timeout = max(min(remaining, 10), 1.0)
                with httpx.Client(
                    timeout=httpx.Timeout(
                        poll_read_timeout, connect=poll_connect_timeout
                    )
                ) as client:
                    poll_response = client.get(
                        f"{endpoint_url}/status/{job_id}",
                        headers=headers,
                    )
            except httpx.HTTPError as e:
                consecutive_errors += 1
                logger.warning(
                    "Poll request error for RunPod job %s (%s/%s): %s",
                    job_id,
                    consecutive_errors,
                    max_consecutive_errors,
                    e,
                )
                if consecutive_errors >= max_consecutive_errors:
                    raise ConnectionError(
                        f"Lost connection to RunPod API after "
                        f"{consecutive_errors} consecutive poll failures "
                        f"for job {job_id}: {e}"
                    ) from e
                continue

            if poll_response.status_code != 200:
                consecutive_errors += 1
                logger.warning(
                    "Poll request failed (%s) for RunPod job %s (%s/%s), retrying...",
                    poll_response.status_code,
                    job_id,
                    consecutive_errors,
                    max_consecutive_errors,
                )
                if consecutive_errors >= max_consecutive_errors:
                    raise ConnectionError(
                        f"RunPod API returned {consecutive_errors} consecutive "
                        f"non-200 responses for job {job_id}"
                    )
                continue

            # Successful poll — reset error counter
            consecutive_errors = 0
            status_data = poll_response.json()
            status = status_data.get("status")

            if status == "COMPLETED":
                job_output = status_data.get("output", {})
                logger.info(
                    "RunPod LTX job %s complete (%.0fs)",
                    job_id,
                    time.monotonic() - poll_start,
                )
                break

            if status == "FAILED":
                error_msg = status_data.get("error", "Unknown error")
                raise RuntimeError(
                    f"RunPod job {job_id} failed: {error_msg}"
                )

            elif status == "CANCELLED":
                raise RuntimeError(f"RunPod job {job_id} was cancelled")

            elif status == "TIMED_OUT":
                error_msg = status_data.get("error")
                if error_msg:
                    raise TimeoutError(
                        f"RunPod job {job_id} timed out: {error_msg}"
                    )
                raise TimeoutError(f"RunPod job {job_id} timed out on RunPod")

            # Still IN_QUEUE or IN_PROGRESS — log every ~30 seconds
            now = time.monotonic()
            if now - last_log_time >= 30:
                elapsed = now - poll_start
                logger.info(
                    "RunPod LTX job %s: %s (%.0fs elapsed)",
                    job_id,
                    status,
                    elapsed,
                )
                last_log_time = now

        # ── Phase 3: Extract result from completed job ───────────────
        # RunPod embeds the handler's return value in the status response's
        # "output" field — no separate download phase needed.

        # Check for handler-level errors
        if "error" in job_output:
            raise RuntimeError(
                f"GPU worker error on job {job_id}: {job_output['error']}"
            )

        video_base64 = job_output.get("video_base64")
        if not video_base64:
            raise RuntimeError(
                f"RunPod job {job_id} completed but output missing video_base64"
            )

        # Decode and write MP4
        video_bytes = base64.b64decode(video_base64)
        with open(output_path, "wb") as f:
            f.write(video_bytes)

        # Extract thumbnail
        thumb_path = output_path.replace(".mp4", "_thumb.jpg")
        try:
            extract_thumbnail(output_path, thumb_path)
        except RuntimeError as e:
            logger.warning(f"Thumbnail extraction failed (non-fatal): {e}")

        # Build return dict (same keys as ltx_selfhosted.py)
        meta = job_output.get("metadata", {})

        return {
            "resolution": meta.get("resolution", settings.resolution),
            "fps": meta.get("fps", 24),
            "duration_seconds": float(
                meta.get("duration", settings.duration)
            ),
            "file_size_bytes": Path(output_path).stat().st_size,
            "fal_request_id": meta.get("request_id"),
        }
