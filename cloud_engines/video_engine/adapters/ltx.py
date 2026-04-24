"""LTX 2.3 adapter via Fal.ai.

Per ENGINE_VIDEO_v1_1.md Section 3.3:
- Endpoint: fal-ai/ltx-2.3/image-to-video  (or /text-to-video)
- Cost: ~$0.20/video flat rate
- CRITICAL: Uses duration enum (6,8,10,...20), NOT num_frames
- Resolution: 1080p (required for durations >10s at 25fps)
- Supports end_image_url for frame-to-frame transitions
"""

from __future__ import annotations

import json
import logging
import time
from pathlib import Path
from typing import Any, Optional

from src.services.events import logged_api_call
from ..cost import estimate_cost
from ..download import download_video, extract_thumbnail
from ..models import VideoContent, VideoSettings
from ..upload import upload_image
from .base import VideoProviderAdapter
from .ltx_shared import (
    _CAMERA_LANGUAGE,
    _CONSTRAINT_PREFIX,
    _I2V_DURATIONS,
    _NEGATIVE_SUFFIX,
    _SPEED_LANGUAGE,
    _T2V_FAST_DURATIONS,
    _T2V_PRO_DURATIONS,
    _TEXT_TO_VIDEO_PREFIX,
    _snap_duration,
    build_ltx_negative,
    build_ltx_prompt,
)
from src.cost_logger import log_cost

logger = logging.getLogger(__name__)

ENDPOINTS: dict[str, str] = {
    "ltx_fast": "fal-ai/ltx-2.3/image-to-video/fast",
    "ltx_pro": "fal-ai/ltx-2.3/image-to-video",
    "ltx": "fal-ai/ltx-2.3/image-to-video/fast",  # backward compat → fast
}
TEXT_TO_VIDEO_ENDPOINTS: dict[str, str] = {
    "ltx_fast": "fal-ai/ltx-2.3/text-to-video/fast",
    "ltx_pro": "fal-ai/ltx-2.3/text-to-video",
    "ltx": "fal-ai/ltx-2.3/text-to-video/fast",  # backward compat → fast
}


class LTXAdapter(VideoProviderAdapter):
    """LTX 2.3 via Fal.ai — default AI video mode."""

    def __init__(self, tier: str = "ltx_fast") -> None:
        if tier not in ENDPOINTS:
            raise ValueError(f"Unknown LTX tier: {tier}. Valid: {list(ENDPOINTS.keys())}")
        self.tier = tier
        self.endpoint = ENDPOINTS[tier]

    @property
    def provider_name(self) -> str:
        return "fal.ai"

    @property
    def model_name(self) -> str:
        return f"ltx-2.3-{'pro' if self.tier == 'ltx_pro' else 'fast'}"

    def validate_settings(self, settings: VideoSettings) -> VideoSettings:
        """Clamp settings to LTX 2.3 constraints.

        - Resolution must be 1080p, 1440p, or 2160p
        - Duration is snapped to the nearest valid fal.ai enum value
        """
        adjusted = settings.model_copy()
        if adjusted.resolution not in ("1080p", "1440p", "2160p"):
            adjusted.resolution = "1080p"

        # Snap duration to valid enum for the selected endpoint
        if adjusted.text_to_video and self.tier == "ltx_pro":
            valid = _T2V_PRO_DURATIONS
        elif adjusted.text_to_video:
            valid = _T2V_FAST_DURATIONS
        else:
            valid = _I2V_DURATIONS
        adjusted.duration = _snap_duration(adjusted.duration, valid)
        return adjusted

    def estimate_cost(self, settings: VideoSettings) -> float:
        return estimate_cost(self.tier, settings.duration)

    def generate(
        self,
        image_path: Optional[str],
        content: VideoContent,
        settings: VideoSettings,
        output_path: str,
        *,
        word_id: str | None = None,
        deck_id: str | None = None,
        user_id: str | None = None,
        job_id: str | None = None,
        attempt: int | None = None,
    ) -> dict[str, Any]:
        """Generate video via LTX on Fal.ai.

        Supports two modes:
        - Image-to-video (default): upload source image, animate it
        - Text-to-video: generate video from prompt alone (no source image)
        """
        import fal_client

        is_text_to_video = settings.text_to_video
        request_id: str | None = None

        with logged_api_call(
            stage="video",
            sub_step="generate_ltx_fal",
            event_source="engine",
            word_id=word_id,
            deck_id=deck_id,
            user_id=user_id,
            job_id=job_id,
            attempt=attempt,
            model_provider=self.provider_name,
            model_name=self.model_name,
            user_prompt=(
                content.text_to_video_prompt
                if is_text_to_video
                else content.video_prompt
            ),
            metadata={
                "scene_number": content.scene_number,
                "video_mode": self.tier,
                "source_image_path": image_path,
                "end_image_path": content.end_image_path,
                "text_to_video": is_text_to_video,
            },
        ) as ev:
            if is_text_to_video:
                endpoint = TEXT_TO_VIDEO_ENDPOINTS.get(
                    self.tier, TEXT_TO_VIDEO_ENDPOINTS["ltx_fast"]
                )
            else:
                endpoint = self.endpoint

            image_url = None
            end_image_url = None
            if not is_text_to_video:
                image_url = upload_image(image_path)
                if content.end_image_path:
                    end_image_url = upload_image(content.end_image_path)

            if is_text_to_video and self.tier == "ltx_pro":
                valid = _T2V_PRO_DURATIONS
            elif is_text_to_video:
                valid = _T2V_FAST_DURATIONS
            else:
                valid = _I2V_DURATIONS
            duration = _snap_duration(settings.duration, valid)

            final_prompt = build_ltx_prompt(
                video_prompt=content.video_prompt,
                camera_motion=content.camera_motion,
                is_t2v=is_text_to_video,
                text_to_video_prompt=content.text_to_video_prompt,
            )

            if is_text_to_video and content.camera_motion:
                motion_type_val = content.camera_motion.get("type", "")
                if motion_type_val and motion_type_val != "static":
                    logger.debug(
                        "T2V: camera instruction '%s' not appended (embedded in video_prompt)",
                        motion_type_val,
                    )

            enhanced_negative = build_ltx_negative(settings.negative_prompt)

            if is_text_to_video:
                arguments: dict[str, Any] = {
                    "prompt": final_prompt,
                    "negative_prompt": enhanced_negative,
                    "duration": duration,
                    "resolution": settings.resolution,
                    "aspect_ratio": "16:9",
                    "generate_audio": False,
                }
            else:
                arguments = {
                    "image_url": image_url,
                    "prompt": final_prompt,
                    "negative_prompt": enhanced_negative,
                    "duration": duration,
                    "resolution": settings.resolution,
                    "aspect_ratio": "auto",
                    "generate_audio": False,
                }
                if end_image_url:
                    arguments["end_image_url"] = end_image_url

            if settings.seed >= 0:
                arguments["seed"] = settings.seed

            mode_label = "text-to-video" if is_text_to_video else "image-to-video"
            logger.info(
                "LTX: submitting %s duration=%ss at %s via %s",
                mode_label,
                duration,
                settings.resolution,
                endpoint,
            )

            max_poll_seconds = 300
            handle = fal_client.submit(endpoint, arguments=arguments)
            request_id = handle.request_id
            ev.record_response(request_id=request_id)
            poll_start = time.time()
            for _event in handle.iter_events(with_logs=False, interval=2.0):
                elapsed = time.time() - poll_start
                if elapsed > max_poll_seconds:
                    raise TimeoutError(
                        f"Fal.ai job did not complete after {int(elapsed)}s. "
                        f"Request ID: {handle.request_id}. Retry or check Fal.ai dashboard."
                    )
                if int(elapsed) % 30 < 3:
                    logger.info("LTX: waiting for Fal.ai... %ss elapsed", int(elapsed))
            result = handle.get()

            video_url = result["video"]["url"]
            fal_request_id = result.get("request_id") or request_id
            request_id = fal_request_id

            poll_elapsed_ms = int((time.time() - poll_start) * 1000)
            cost_usd = estimate_cost(self.tier, duration)
            log_cost(
                stage="video",
                provider="fal_ai",
                model=self.model_name,
                status="success",
                usage_metrics={
                    "duration_seconds": duration,
                    "resolution": settings.resolution,
                    "video_mode": self.tier,
                    "fal_request_id": fal_request_id,
                    "text_to_video": is_text_to_video,
                },
                estimated_cost_usd=cost_usd,
                duration_ms=poll_elapsed_ms,
            )

            download_video(video_url, output_path)

            thumb_path = output_path.replace(".mp4", "_thumb.jpg")
            try:
                extract_thumbnail(output_path, thumb_path)
            except RuntimeError as e:
                logger.warning(f"Thumbnail extraction failed (non-fatal): {e}")

            result_metadata = {
                "duration_seconds": duration,
                "resolution": settings.resolution,
                "file_size_bytes": Path(output_path).stat().st_size,
                "fal_request_id": fal_request_id,
                "video_url": video_url,
                "seed": settings.seed if settings.seed >= 0 else None,
            }
            ev.record_response(
                response_body=json.dumps(result, ensure_ascii=False),
                request_body=json.dumps(arguments, ensure_ascii=False),
                request_id=request_id,
                cost_usd=cost_usd,
                **result_metadata,
            )
            return result_metadata
