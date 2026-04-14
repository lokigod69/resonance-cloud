"""Cost estimation for video generation.

Pure hardcoded math — a dictionary of rates multiplied by duration.
No API calls, no dynamic rate fetching. Rates updated manually if
provider pricing changes. Per ENGINE_VIDEO_v1_1.md Section 9.
"""

from __future__ import annotations

from .config import VIDEO_BACKEND

RATES: dict[str, dict] = {
    "ken_burns": {"type": "free"},
    "ltx_fast": {"type": "flat", "cost": 0.20},
    "ltx_pro": {"type": "flat", "cost": 0.20},
    "ltx": {"type": "flat", "cost": 0.20},
    "kling_standard": {"type": "tiered", "base_5s": 0.28, "per_extra_s": 0.056},
    "kling_pro": {"type": "tiered", "base_5s": 0.49, "per_extra_s": 0.098},
}


def estimate_cost(video_mode: str, duration: int) -> float:
    """Return estimated cost in USD for a single clip generation.

    For Kling modes, the duration is rounded to the actual Kling duration
    (5 or 10 seconds) before calculating cost, since Kling only generates
    exactly 5s or 10s clips.

    Args:
        video_mode: One of "ken_burns", "ltx", "kling_standard", "kling_pro".
        duration: Requested duration in seconds.

    Returns:
        Estimated cost in USD. 0.0 for Ken Burns.
    """
    # Self-hosted LTX: RunPod L40S pricing (~$0.86/hr)
    if VIDEO_BACKEND in ("self_hosted", "runpod") and video_mode in ("ltx_fast", "ltx_pro", "ltx"):
        rate_per_second = 0.86 / 3600
        if video_mode == "ltx_pro":
            estimated_gpu_seconds = (duration / 6.0) * 540
        else:
            estimated_gpu_seconds = (duration / 6.0) * 90
        return round(estimated_gpu_seconds * rate_per_second, 4)

    r = RATES.get(video_mode, RATES["ltx"])

    if r["type"] == "free":
        return 0.0

    if r["type"] == "flat":
        return r["cost"]

    # Tiered (Kling): round to actual provider duration first
    actual_duration = 5 if duration <= 7 else 10
    extra = max(0, actual_duration - 5)
    return round(r["base_5s"] + extra * r["per_extra_s"], 4)


def estimate_batch_cost(
    video_mode: str, duration: int, clip_count: int
) -> float:
    """Return estimated total cost for a batch of clips.

    Args:
        video_mode: Generation mode.
        duration: Duration per clip in seconds.
        clip_count: Number of clips.

    Returns:
        Total estimated cost in USD.
    """
    return round(estimate_cost(video_mode, duration) * clip_count, 4)
