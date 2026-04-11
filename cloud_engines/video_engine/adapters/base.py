"""Abstract base class for video provider adapters.

Per ENGINE_VIDEO_v1_1.md Section 4.1: every adapter implements
the same interface for settings validation, generation, and cost estimation.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Any, Optional

from ..models import VideoContent, VideoSettings


class VideoProviderAdapter(ABC):
    """Base interface for all video generation backends.

    Cloud adapters (LTX, Kling) handle: upload → API call → download.
    Local adapters (Ken Burns) handle: FFMPEG subprocess.
    All adapters produce an MP4 video file at the given output_path.
    """

    @abstractmethod
    def validate_settings(self, settings: VideoSettings) -> VideoSettings:
        """Clamp/round settings to this provider's constraints.

        Returns a (possibly adjusted) copy of the settings.
        The actual values used are recorded in generation-meta.json.
        """

    @abstractmethod
    def generate(
        self,
        image_path: Optional[str],
        content: VideoContent,
        settings: VideoSettings,
        output_path: str,
    ) -> dict[str, Any]:
        """Generate a video clip and save it to output_path.

        For cloud adapters: upload image, call API, download result.
        For Ken Burns: run FFMPEG directly on the local file.
        For text-to-video: image_path is None, generate from prompt only.

        Returns a metadata dict with keys like:
            - duration_seconds: actual output duration
            - resolution: e.g. "1280x720"
            - file_size_bytes: output file size
            - provider-specific fields (fal_request_id, etc.)
        """

    @abstractmethod
    def estimate_cost(self, settings: VideoSettings) -> float:
        """Return estimated cost in USD for this generation."""

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Provider identifier, e.g. 'fal.ai' or 'local/ffmpeg'."""

    @property
    @abstractmethod
    def model_name(self) -> str:
        """Model identifier, e.g. 'ltx-2.3' or 'ffmpeg-zoompan'."""
