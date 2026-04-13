"""Self-hosted LTX GPU worker adapter."""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Optional

import httpx

from ..config import GPU_WORKER_TIMEOUT, GPU_WORKER_TOKEN, GPU_WORKER_URL
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


class LTXSelfHostedAdapter(VideoProviderAdapter):
    """Adapter that calls the self-hosted LTX GPU worker instead of fal.ai."""

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

        engine.py currently reads these keys from the result dict:
        - resolution
        - fps
        - duration_seconds
        - file_size_bytes
        - fal_request_id

        engine.py does not read seed from the result dict.
        """
        if not GPU_WORKER_URL:
            raise RuntimeError("GPU_WORKER_URL not set")
        if not GPU_WORKER_TOKEN:
            raise RuntimeError("GPU_WORKER_TOKEN not set")

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

            headers = {"Authorization": f"Bearer {GPU_WORKER_TOKEN}"}
            max_retries = 5
            response = None

            for attempt in range(max_retries):
                for fh in files_to_close:
                    fh.seek(0)

                with httpx.Client(
                    timeout=httpx.Timeout(GPU_WORKER_TIMEOUT, connect=30)
                ) as client:
                    response = client.post(
                        f"{GPU_WORKER_URL}/generate",
                        data=form_data,
                        files=files_dict if files_dict else None,
                        headers=headers,
                    )

                if response.status_code == 503:
                    retry_after = int(response.headers.get("Retry-After", "10"))
                    logger.warning(
                        "GPU worker busy (attempt %s/%s), retrying in %ss",
                        attempt + 1,
                        max_retries,
                        retry_after,
                    )
                    if attempt < max_retries - 1:
                        time.sleep(retry_after)
                        continue

                    raise RuntimeError("GPU worker busy after max retries")

                if response.status_code == 401:
                    raise RuntimeError(
                        "GPU worker auth failed - check GPU_WORKER_TOKEN"
                    )

                if response.status_code == 422:
                    detail = response.json().get("detail", "Validation error")
                    raise ValueError(f"GPU worker rejected request: {detail}")

                response.raise_for_status()
                break

            with open(output_path, "wb") as f:
                f.write(response.content)

            thumb_path = output_path.replace(".mp4", "_thumb.jpg")
            try:
                extract_thumbnail(output_path, thumb_path)
            except RuntimeError as e:
                logger.warning(f"Thumbnail extraction failed (non-fatal): {e}")

            file_size = Path(output_path).stat().st_size
            fps = int(response.headers.get("X-Fps", "24"))

            return {
                "resolution": settings.resolution,
                "fps": fps,
                "duration_seconds": float(
                    response.headers.get("X-Duration", settings.duration)
                ),
                "file_size_bytes": file_size,
                "fal_request_id": response.headers.get("X-Request-Id"),
            }

        finally:
            for fh in files_to_close:
                try:
                    fh.close()
                except Exception:
                    pass
