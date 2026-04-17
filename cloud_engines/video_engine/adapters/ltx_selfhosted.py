"""Self-hosted LTX GPU worker adapter (async job pattern)."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Optional

import httpx

from ..config import GPU_WORKER_POLL_INTERVAL, GPU_WORKER_TIMEOUT, GPU_WORKER_TOKEN, GPU_WORKER_URL
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
from src.cost_logger import log_cost

logger = logging.getLogger(__name__)


class LTXSelfHostedAdapter(VideoProviderAdapter):
    """Adapter that calls the self-hosted LTX GPU worker instead of fal.ai.

    Uses an async job pattern: submit -> poll -> download.
    """

    def __init__(self, tier: str = "ltx_fast") -> None:
        valid_tiers = {"ltx_fast", "ltx_pro", "ltx"}
        if tier not in valid_tiers:
            raise ValueError(f"Unknown LTX tier: {tier}. Valid: {sorted(valid_tiers)}")
        self.tier = tier
        self._quality = "pro" if tier == "ltx_pro" else "fast"

    @property
    def provider_name(self) -> str:
        return "self-hosted-ltx"

    @property
    def model_name(self) -> str:
        return f"ltx-2.3-{'pro' if self._quality == 'pro' else 'fast'}"

    def validate_settings(self, settings: VideoSettings) -> VideoSettings:
        """Clamp settings to the same constraints as LTXAdapter."""
        adjusted = settings.model_copy()
        if adjusted.resolution not in ("1080p", "1440p", "2160p"):
            adjusted.resolution = "1080p"

        # Short-mode bypass: mirror the RunPod adapter so self-hosted GPU
        # workers also accept arbitrary durations.
        if getattr(adjusted, "short_mode", False):
            return adjusted

        if adjusted.text_to_video and self.tier == "ltx_pro":
            valid = _T2V_PRO_DURATIONS
        elif adjusted.text_to_video:
            valid = _T2V_FAST_DURATIONS
        else:
            valid = _I2V_DURATIONS

        adjusted.duration = _snap_duration(adjusted.duration, valid)
        return adjusted

    def estimate_cost(self, settings: VideoSettings) -> float:
        """Return estimated self-hosted cost in USD.

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
        """Generate video via the self-hosted GPU worker.

        Uses async job pattern: submit job -> poll for completion -> download result.

        engine.py reads these keys from the result dict:
        - resolution
        - fps
        - duration_seconds
        - file_size_bytes
        - fal_request_id
        """
        # Resolve worker URL/token.
        # Level 1 (manual override): GPU_WORKER_URL env var set -> use it directly.
        # Level 2 (auto): GPU_WORKER_URL empty -> pod_manager creates/reuses a pod.
        worker_url = GPU_WORKER_URL
        worker_token = GPU_WORKER_TOKEN
        level2_release = None
        if not worker_url:
            from ..pod_manager import acquire_use, ensure_pod_ready, release_use
            worker_url, worker_token = ensure_pod_ready()
            level2_release = release_use
        elif not worker_token:
            raise RuntimeError("GPU_WORKER_URL set but GPU_WORKER_TOKEN missing")

        # End-to-end deadline — all phases (submit, poll, download) share this budget
        deadline = time.monotonic() + GPU_WORKER_TIMEOUT

        is_text_to_video = settings.text_to_video

        final_prompt = build_ltx_prompt(
            video_prompt=content.video_prompt,
            camera_motion=content.camera_motion,
            is_t2v=is_text_to_video,
            text_to_video_prompt=content.text_to_video_prompt,
        )
        final_negative = build_ltx_negative(settings.negative_prompt)

        form_data = {
            "prompt": final_prompt,
            "negative_prompt": final_negative,
            "duration": str(settings.duration),
            "resolution": settings.resolution,
            "seed": str(settings.seed),
            "quality": self._quality,
            "scene_number": str(content.scene_number),
        }

        files_to_close: list = []
        files_dict: dict = {}

        if level2_release is not None:
            acquire_use()

        try:
            if not is_text_to_video and image_path and Path(image_path).exists():
                fh = open(image_path, "rb")
                files_to_close.append(fh)
                files_dict["image"] = ("image.png", fh, "image/png")

            if (
                not is_text_to_video
                and content.end_image_path
                and Path(content.end_image_path).exists()
            ):
                fh2 = open(content.end_image_path, "rb")
                files_to_close.append(fh2)
                files_dict["end_image"] = ("end_image.png", fh2, "image/png")

            headers = {"Authorization": f"Bearer {worker_token}"}

            # ── Phase 1: Submit job ──────────────────────────────────────
            submit_response = None
            max_submit_retries = 5

            for attempt in range(max_submit_retries):
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    raise TimeoutError(
                        f"GPU worker timeout ({GPU_WORKER_TIMEOUT}s) exceeded before submit"
                    )

                for fh in files_to_close:
                    fh.seek(0)

                submit_timeout = min(60, remaining)
                with httpx.Client(
                    timeout=httpx.Timeout(submit_timeout, connect=min(30, remaining))
                ) as client:
                    submit_response = client.post(
                        f"{worker_url}/generate",
                        data=form_data,
                        files=files_dict if files_dict else None,
                        headers=headers,
                    )

                if submit_response.status_code == 503:
                    retry_after = int(submit_response.headers.get("Retry-After", "10"))
                    logger.warning(
                        "GPU worker busy on submit (attempt %s/%s), retrying in %ss",
                        attempt + 1,
                        max_submit_retries,
                        retry_after,
                    )
                    if attempt < max_submit_retries - 1:
                        remaining = deadline - time.monotonic()
                        if remaining <= 0:
                            raise TimeoutError(
                                f"GPU worker timeout ({GPU_WORKER_TIMEOUT}s) exceeded during submit retries"
                            )
                        time.sleep(min(retry_after, remaining))
                        continue
                    raise RuntimeError("GPU worker busy after max submit retries")

                if submit_response.status_code == 401:
                    raise RuntimeError(
                        "GPU worker auth failed - check GPU_WORKER_TOKEN"
                    )

                if submit_response.status_code == 422:
                    try:
                        detail = submit_response.json().get("error", "Validation error")
                    except Exception:
                        detail = submit_response.text
                    raise ValueError(f"GPU worker rejected request: {detail}")

                if submit_response.status_code != 202:
                    try:
                        err = submit_response.json().get("error", submit_response.text)
                    except Exception:
                        err = submit_response.text
                    raise RuntimeError(
                        f"GPU worker submit failed ({submit_response.status_code}): {err}"
                    )

                # 202 Accepted — job queued successfully
                break

            job_data = submit_response.json()
            job_id = job_data["job_id"]
            logger.info("Self-hosted LTX job submitted: %s", job_id)

            # ── Phase 2: Poll for completion ─────────────────────────────
            poll_start = time.monotonic()
            last_log_time = poll_start
            consecutive_errors = 0
            max_consecutive_errors = 10
            job_status: dict = {}

            while True:
                remaining = deadline - time.monotonic()
                if remaining <= 0:
                    elapsed = time.monotonic() - poll_start
                    raise TimeoutError(
                        f"Self-hosted LTX job {job_id} timed out after {int(elapsed)}s polling. "
                        f"GPU_WORKER_TIMEOUT={GPU_WORKER_TIMEOUT}s (end-to-end)."
                    )

                time.sleep(min(GPU_WORKER_POLL_INTERVAL, remaining))
                remaining = deadline - time.monotonic()

                if remaining <= 0:
                    elapsed = time.monotonic() - poll_start
                    raise TimeoutError(
                        f"Self-hosted LTX job {job_id} timed out after {int(elapsed)}s polling. "
                        f"GPU_WORKER_TIMEOUT={GPU_WORKER_TIMEOUT}s (end-to-end)."
                    )

                try:
                    poll_read_timeout = max(min(remaining, 30), 1.0)
                    poll_connect_timeout = max(min(remaining, 10), 1.0)
                    with httpx.Client(
                        timeout=httpx.Timeout(poll_read_timeout, connect=poll_connect_timeout)
                    ) as client:
                        poll_response = client.get(
                            f"{worker_url}/jobs/{job_id}",
                            headers=headers,
                        )
                except httpx.HTTPError as e:
                    consecutive_errors += 1
                    logger.warning(
                        "Poll request error for job %s (%s/%s): %s",
                        job_id,
                        consecutive_errors,
                        max_consecutive_errors,
                        e,
                    )
                    if consecutive_errors >= max_consecutive_errors:
                        raise ConnectionError(
                            f"Lost connection to GPU worker after "
                            f"{consecutive_errors} consecutive poll failures "
                            f"for job {job_id}: {e}"
                        ) from e
                    continue

                if poll_response.status_code != 200:
                    consecutive_errors += 1
                    logger.warning(
                        "Poll request failed (%s) for job %s (%s/%s), retrying...",
                        poll_response.status_code,
                        job_id,
                        consecutive_errors,
                        max_consecutive_errors,
                    )
                    if consecutive_errors >= max_consecutive_errors:
                        raise ConnectionError(
                            f"GPU worker returned {consecutive_errors} consecutive "
                            f"non-200 responses for job {job_id}"
                        )
                    continue

                # Successful poll — reset error counter
                consecutive_errors = 0
                job_status = poll_response.json()
                status = job_status.get("status")

                if status == "complete":
                    logger.info(
                        "Self-hosted LTX job %s complete (%.0fs)",
                        job_id,
                        time.monotonic() - poll_start,
                    )
                    break

                if status == "failed":
                    error_msg = job_status.get("error", "Unknown error")
                    raise RuntimeError(
                        f"Self-hosted LTX job {job_id} failed: {error_msg}"
                    )

                # Still queued or processing — log every ~30 seconds
                progress = job_status.get("progress", 0)
                now = time.monotonic()
                if now - last_log_time >= 30:
                    elapsed = now - poll_start
                    logger.info(
                        "Self-hosted LTX job %s: %s (%.0f%%, %.0fs elapsed)",
                        job_id,
                        status,
                        progress * 100,
                        elapsed,
                    )
                    last_log_time = now

            # ── Phase 3: Download result ─────────────────────────────────
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise TimeoutError(
                    f"GPU worker timeout ({GPU_WORKER_TIMEOUT}s) exceeded before download, "
                    f"job_id={job_id}"
                )

            dl_timeout = min(120, remaining)
            with httpx.Client(
                timeout=httpx.Timeout(dl_timeout, connect=min(30, remaining))
            ) as client:
                dl_response = client.get(
                    f"{worker_url}/jobs/{job_id}/result",
                    headers=headers,
                )

            if dl_response.status_code != 200:
                raise RuntimeError(
                    f"Failed to download result for job {job_id}: "
                    f"HTTP {dl_response.status_code}"
                )

            with open(output_path, "wb") as f:
                f.write(dl_response.content)

            # ── Post-processing ──────────────────────────────────────────
            thumb_path = output_path.replace(".mp4", "_thumb.jpg")
            try:
                extract_thumbnail(output_path, thumb_path)
            except RuntimeError as e:
                logger.warning(f"Thumbnail extraction failed (non-fatal): {e}")

            file_size = Path(output_path).stat().st_size

            # Extract metadata from the poll response
            meta = job_status.get("metadata") or {}

            # Cost tracking
            _gpu_seconds_est = (settings.duration / 6.0) * (540 if self._quality == "pro" else 90)
            log_cost(
                stage="video",
                provider="runpod",
                model=self.model_name,
                status="success",
                usage_metrics={
                    "duration_seconds": settings.duration,
                    "resolution": settings.resolution,
                    "video_mode": self.tier,
                    "quality": self._quality,
                    "job_id": job_id,
                    "gpu_seconds_estimated": _gpu_seconds_est,
                },
                estimated_cost_usd=self.estimate_cost(settings),
                duration_ms=int((time.monotonic() - deadline + GPU_WORKER_TIMEOUT) * 1000),
            )

            return {
                "resolution": meta.get("resolution", settings.resolution),
                "fps": meta.get("fps", 24),
                "duration_seconds": float(
                    meta.get("duration", settings.duration)
                ),
                "file_size_bytes": file_size,
                "fal_request_id": meta.get("request_id"),
            }

        finally:
            if level2_release is not None:
                level2_release()
            for fh in files_to_close:
                try:
                    fh.close()
                except Exception:
                    pass
