"""LTX 2.3 adapter via Fal.ai.

Per ENGINE_VIDEO_v1_1.md Section 3.3:
- Endpoint: fal-ai/ltx-2.3/image-to-video  (or /text-to-video)
- Cost: ~$0.20/video flat rate
- CRITICAL: Uses duration enum (6,8,10,...20), NOT num_frames
- Resolution: 1080p (required for durations >10s at 25fps)
- Supports end_image_url for frame-to-frame transitions
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
# Valid duration enums accepted by fal.ai LTX 2.3 endpoints.
# Pro text-to-video only supports up to 10s; all others support up to 20s.
_I2V_DURATIONS = (6, 8, 10, 12, 14, 16, 18, 20)
_T2V_PRO_DURATIONS = (6, 8, 10)
_T2V_FAST_DURATIONS = (6, 8, 10, 12, 14, 16, 18, 20)


def _snap_duration(requested: int, valid: tuple[int, ...]) -> int:
    """Round a requested duration to the nearest valid fal.ai enum value.

    On ties (equidistant from two values), rounds UP so users get at least
    as much duration as they asked for.
    """
    return min(valid, key=lambda v: (abs(v - requested), -v))

# --- Tier 1: Constraint prefix to prevent LTX hallucination / subject drift ---
_CONSTRAINT_PREFIX = (
    "Maintain the exact subject, species, and scene composition shown in the image "
    "throughout. Do not introduce new characters, objects, or transform the subject. "
    "Subtle, naturalistic motion only. "
)
_TEXT_TO_VIDEO_PREFIX = (
    "Generate a high-quality cinematic scene with consistent visual style "
    "throughout. Maintain the subject's appearance, the environment, and "
    "all visual details exactly as described for the entire duration. "
)
_NEGATIVE_SUFFIX = (
    ", morphing, transformation, species change, subject replacement, sudden scene change"
)

# --- Tier 2: Camera motion → natural language for LTX prompt ---
_CAMERA_LANGUAGE: dict[str, str] = {
    # Basic Ken Burns types
    "slow_zoom_in": "Camera slowly pushes in closer to the subject",
    "slow_zoom_out": "Camera gradually pulls back to reveal the wider scene",
    "pan_left": "Camera pans smoothly from right to left across the scene",
    "pan_right": "Camera pans smoothly from left to right across the scene",
    "pan_up": "Camera tilts upward gradually",
    "pan_down": "Camera tilts downward gradually",
    "static": "",
    # Cinematic extended types
    "dolly_in": "The camera moves physically forward toward the subject, creating depth parallax",
    "dolly_out": "The camera pulls physically backward away from the subject, revealing the surroundings",
    "orbit_left": "The camera orbits around the subject in a clockwise arc, maintaining focus on center",
    "orbit_right": "The camera orbits around the subject in a counter-clockwise arc, maintaining focus on center",
    "tracking_left": "The camera tracks laterally to the left alongside the subject",
    "tracking_right": "The camera tracks laterally to the right alongside the subject",
    "crane_up": "The camera rises vertically upward in a crane movement, looking down as it ascends",
    "crane_down": "The camera descends vertically downward in a crane movement",
    "push_in": "The camera slowly and deliberately pushes in toward the subject with intent",
    "pull_out": "The camera slowly pulls away from the subject, creating emotional distance",
    "handheld": "The camera has subtle natural handheld movement with slight organic sway",
}
_SPEED_LANGUAGE: dict[str, str] = {
    "very_slow": "very slowly and subtly",
    "slow": "at a gentle, steady pace",
    "medium": "at a moderate, noticeable pace",
    "fast": "quickly and dynamically",
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
    ) -> dict[str, Any]:
        """Generate video via LTX on Fal.ai.

        Supports two modes:
        - Image-to-video (default): upload source image, animate it
        - Text-to-video: generate video from prompt alone (no source image)
        """
        import fal_client

        is_text_to_video = settings.text_to_video

        # Select endpoint
        if is_text_to_video:
            endpoint = TEXT_TO_VIDEO_ENDPOINTS.get(self.tier, TEXT_TO_VIDEO_ENDPOINTS["ltx_fast"])
        else:
            endpoint = self.endpoint

        # Step 1: Upload images (image-to-video only)
        image_url = None
        end_image_url = None
        if not is_text_to_video:
            image_url = upload_image(image_path)
            if content.end_image_path:
                end_image_url = upload_image(content.end_image_path)

        # Step 2: Snap duration to valid fal.ai enum (defensive — normally
        # already done by validate_settings, but guard against direct calls)
        if is_text_to_video and self.tier == "ltx_pro":
            valid = _T2V_PRO_DURATIONS
        elif is_text_to_video:
            valid = _T2V_FAST_DURATIONS
        else:
            valid = _I2V_DURATIONS
        duration = _snap_duration(settings.duration, valid)

        # Step 3: Build prompt with appropriate prefix + camera motion
        if is_text_to_video:
            base_prompt = (
                content.text_to_video_prompt
                if content.text_to_video_prompt
                else content.video_prompt
            )
            prompt_parts = [_TEXT_TO_VIDEO_PREFIX, base_prompt]
        else:
            prompt_parts = [_CONSTRAINT_PREFIX, content.video_prompt]

        # Append camera motion instruction if available (I2V only — T2V prompts
        # already contain camera direction baked in by the storyboard LLM)
        if not is_text_to_video and content.camera_motion:
            motion_type = content.camera_motion.get("type", "static")
            speed = content.camera_motion.get("speed", "slow")
            camera_instruction = _CAMERA_LANGUAGE.get(motion_type, "")
            if camera_instruction:
                speed_mod = _SPEED_LANGUAGE.get(speed, "at a gentle pace")
                prompt_parts.append(f"Camera movement: {camera_instruction} {speed_mod}.")

        if is_text_to_video and content.camera_motion:
            motion_type_val = content.camera_motion.get("type", "")
            if motion_type_val and motion_type_val != "static":
                logger.debug(
                    "T2V: camera instruction '%s' not appended (embedded in video_prompt)",
                    motion_type_val,
                )

        final_prompt = " ".join(prompt_parts)

        # Enhanced negative prompt
        base_negative = settings.negative_prompt or "blur, distort, and low quality"
        enhanced_negative = f"{base_negative}{_NEGATIVE_SUFFIX}"

        # Build request
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
            f"LTX: submitting {mode_label} duration={duration}s "
            f"at {settings.resolution} via {endpoint}"
        )

        # Step 4: Submit and poll with reduced frequency (2s interval)
        MAX_POLL_SECONDS = 300  # 5 minutes max wait
        handle = fal_client.submit(endpoint, arguments=arguments)
        poll_start = time.time()
        for _event in handle.iter_events(with_logs=False, interval=2.0):
            elapsed = time.time() - poll_start
            if elapsed > MAX_POLL_SECONDS:
                raise TimeoutError(
                    f"Fal.ai job did not complete after {int(elapsed)}s. "
                    f"Request ID: {handle.request_id}. Retry or check Fal.ai dashboard."
                )
            if int(elapsed) % 30 < 3:
                logger.info(f"LTX: waiting for Fal.ai... {int(elapsed)}s elapsed")
        result = handle.get()

        # Step 5: Parse response
        video_url = result["video"]["url"]
        fal_request_id = result.get("request_id")

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
            "duration_seconds": duration,
            "resolution": settings.resolution,
            "file_size_bytes": file_size,
            "fal_request_id": fal_request_id,
            "video_url": video_url,
            "seed": settings.seed if settings.seed >= 0 else None,
        }
