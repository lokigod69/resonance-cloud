"""Mode router — dispatches to the correct video provider adapter.

Per ENGINE_VIDEO_v1_1.md Section 3.1: The mode router reads
video_mode from settings and returns the appropriate adapter.
"""

from __future__ import annotations

from .adapters.base import VideoProviderAdapter
from .config import VIDEO_BACKEND


def get_adapter(video_mode: str) -> VideoProviderAdapter:
    """Return the appropriate adapter for the selected video mode.

    Uses lazy imports to avoid loading cloud dependencies (fal_client)
    when only Ken Burns mode is needed.

    Args:
        video_mode: One of "ken_burns", "ltx_fast", "ltx_pro", "ltx", "kling_standard", "kling_pro".

    Returns:
        A VideoProviderAdapter instance.

    Raises:
        ValueError: If video_mode is not recognized.
    """
    if video_mode == "ken_burns":
        from .adapters.ken_burns import KenBurnsAdapter
        return KenBurnsAdapter()

    elif VIDEO_BACKEND == "self_hosted" and video_mode in ("ltx_fast", "ltx_pro", "ltx"):
        from .adapters.ltx_selfhosted import LTXSelfHostedAdapter
        return LTXSelfHostedAdapter(tier=video_mode)

    elif video_mode in ("ltx_fast", "ltx_pro", "ltx"):
        from .adapters.ltx import LTXAdapter
        return LTXAdapter(tier=video_mode)

    elif video_mode in ("kling_standard", "kling_pro"):
        from .adapters.kling import KlingAdapter
        return KlingAdapter(tier=video_mode)

    else:
        valid = ["ken_burns", "ltx_fast", "ltx_pro", "ltx", "kling_standard", "kling_pro"]
        raise ValueError(
            f"Unknown video_mode: '{video_mode}'. Valid modes: {valid}"
        )
