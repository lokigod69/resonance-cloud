"""Kling adapter (Standard + Pro) via Fal.ai.

Per ENGINE_VIDEO_v1_1.md Section 3.4:
- Standard: fal-ai/kling-video/v2.1/standard/image-to-video ($0.28/5s)
- Pro: fal-ai/kling-video/v2.1/pro/image-to-video ($0.49/5s)
- CRITICAL: Duration is STRING enum "5" or "10" ONLY (not int)
- Supports negative_prompt and cfg_scale (0.0–1.0)
"""

from __future__ import annotations

import logging
import time
from pathlib import Path
from typing import Any, Optional

from ..cost import estimate_cost
from ..download import download_video, extract_thumbnail
from ..models import VideoContent, VideoSettings
from ..upload import upload_image
from .base import VideoProviderAdapter
from src.cost_logger import log_cost

logger = logging.getLogger(__name__)

ENDPOINTS: dict[str, str] = {
    "kling_standard": "fal-ai/kling-video/v2.1/standard/image-to-video",
    "kling_pro": "fal-ai/kling-video/v2.1/pro/image-to-video",
}


class KlingAdapter(VideoProviderAdapter):
    """Kling image-to-video via Fal.ai — premium AI video mode."""

    def __init__(self, tier: str = "kling_standard") -> None:
        if tier not in ENDPOINTS:
            raise ValueError(f"Unknown Kling tier: {tier}. Valid: {list(ENDPOINTS.keys())}")
        self.tier = tier
        self.endpoint = ENDPOINTS[tier]

    @property
    def provider_name(self) -> str:
        return "fal.ai"

    @property
    def model_name(self) -> str:
        return f"kling-2.1-{'standard' if self.tier == 'kling_standard' else 'pro'}"

    def validate_settings(self, settings: VideoSettings) -> VideoSettings:
        """Clamp settings to Kling constraints.

        Duration is rounded to "5" or "10" (the only valid values).
        cfg_scale is clamped to 0.0–1.0.
        """
        adjusted = settings.model_copy()
        # cfg_scale is already validated by Pydantic (0.0–1.0)
        return adjusted

    def estimate_cost(self, settings: VideoSettings) -> float:
        return estimate_cost(self.tier, settings.duration)

    def _round_duration(self, duration: int) -> str:
        """Round requested duration to Kling's valid string enum.

        Kling only accepts "5" or "10". Anything ≤7 maps to "5",
        anything >7 maps to "10".

        Returns a STRING, not an int — this is critical.
        """
        return "5" if duration <= 7 else "10"

    def generate(
        self,
        image_path: Optional[str],
        content: VideoContent,
        settings: VideoSettings,
        output_path: str,
    ) -> dict[str, Any]:
        """Generate video via Kling on Fal.ai.

        Steps:
        1. Upload image to Fal.ai storage
        2. Round duration to "5" or "10" (string!)
        3. Submit generation request (blocking subscribe)
        4. Download result video
        5. Extract thumbnail
        """
        if image_path is None:
            raise ValueError(
                "Kling mode requires a source image (text-to-video is not supported)"
            )

        if content.end_image_path:
            logger.warning(
                "Kling mode does not support end_image_path (frame transitions). "
                "Ignoring end image and proceeding with single image generation."
            )

        import fal_client

        # Step 1: Upload
        image_url = upload_image(image_path)

        # Step 2: Round duration — MUST be string "5" or "10"
        kling_duration = self._round_duration(settings.duration)
        actual_duration = int(kling_duration)

        # Step 3: Build request
        arguments: dict[str, Any] = {
            "image_url": image_url,
            "prompt": content.video_prompt,
            "duration": kling_duration,  # STRING, not int!
            "aspect_ratio": "16:9",
            "negative_prompt": settings.negative_prompt,
            "cfg_scale": settings.cfg_scale,
        }

        logger.info(
            f"Kling ({self.tier}): submitting {kling_duration}s generation"
        )

        # Step 4: Submit and poll with reduced frequency (3s interval)
        MAX_POLL_SECONDS = 300  # 5 minutes max wait
        handle = fal_client.submit(self.endpoint, arguments=arguments)
        poll_start = time.time()
        for _event in handle.iter_events(with_logs=False, interval=3.0):
            elapsed = time.time() - poll_start
            if elapsed > MAX_POLL_SECONDS:
                raise TimeoutError(
                    f"Fal.ai job did not complete after {int(elapsed)}s. "
                    f"Request ID: {handle.request_id}. Retry or check Fal.ai dashboard."
                )
            if int(elapsed) % 30 < 4:
                logger.info(f"Kling: waiting for Fal.ai... {int(elapsed)}s elapsed")
        result = handle.get()

        # Step 5: Parse response
        video_url = result["video"]["url"]
        fal_request_id = result.get("request_id")

        # Cost tracking
        _poll_elapsed_ms = int((time.time() - poll_start) * 1000)
        log_cost(
            stage="video",
            provider="fal_ai",
            model=self.model_name,
            status="success",
            usage_metrics={
                "duration_seconds": actual_duration,
                "kling_duration": kling_duration,
                "video_mode": self.tier,
                "fal_request_id": fal_request_id,
            },
            estimated_cost_usd=estimate_cost(self.tier, settings.duration),
            duration_ms=_poll_elapsed_ms,
        )

        # Step 6: Download
        download_video(video_url, output_path)

        # Step 7: Extract thumbnail
        thumb_path = output_path.replace(".mp4", "_thumb.jpg")
        try:
            extract_thumbnail(output_path, thumb_path)
        except RuntimeError as e:
            logger.warning(f"Thumbnail extraction failed (non-fatal): {e}")

        file_size = Path(output_path).stat().st_size
        return {
            "duration_seconds": float(actual_duration),
            "kling_duration": kling_duration,
            "resolution": None,  # Kling determines its own resolution
            "file_size_bytes": file_size,
            "fal_request_id": fal_request_id,
            "video_url": video_url,
            "tier": self.tier,
        }
