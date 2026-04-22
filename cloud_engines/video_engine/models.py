"""Data models for the Video Engine.

All models follow ENGINE_VIDEO_v1_1.md specifications:
- Section 2: Input/output contract
- Section 8: Settings schema
- Section 11: Generation metadata
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# --- Engine Input Models ---


class VideoContent(BaseModel):
    """Content provided by the orchestrator for video generation."""

    image_path: Optional[str] = Field(
        default=None, description="Absolute path to source PNG (None for text-to-video)"
    )
    video_prompt: str = Field(
        default="",
        description="Natural language video description for cloud AI modes (LTX/Kling)",
    )
    camera_motion: Optional[dict] = Field(
        default=None,
        description="Structured camera motion: {type, speed}. Used by Ken Burns (FFMPEG filter) and LTX (prompt injection).",
    )
    end_image_path: Optional[str] = Field(
        default=None,
        description="Absolute path to end-frame image for transitions (LTX 2.3 only)",
    )
    text_to_video_prompt: Optional[str] = Field(
        default=None, description="Enhanced unified prompt for text-to-video generation"
    )
    scene_number: int = Field(
        ..., ge=1, description="Scene number from the storyboard (for output naming)"
    )


class VideoSettings(BaseModel):
    """User-configurable settings for video generation.

    All fields have defaults per ENGINE_VIDEO_v1_1.md Section 8.
    An empty settings object uses LTX mode at 5s, 720p.
    """

    video_mode: Literal["ken_burns", "ltx_fast", "ltx_pro", "ltx", "kling_standard", "kling_pro"] = Field(
        default="ltx_fast", description="Which generation backend to use"
    )
    duration: int = Field(
        default=6, ge=3, le=20,
        description="Target clip duration in seconds (adapter snaps to provider's valid enum)",
    )
    resolution: Literal["1080p", "1440p", "2160p"] = Field(
        default="1080p", description="Output resolution (LTX mode only; Kling determines its own)"
    )
    fps: int = Field(
        default=25, ge=1, le=60, description="Frames per second (Ken Burns mode; LTX 2.3 default is 24fps)"
    )
    negative_prompt: str = Field(
        default="blur, distort, and low quality",
        description="Negative prompt (cloud modes only)",
    )
    cfg_scale: float = Field(
        default=0.5, ge=0.0, le=1.0, description="Guidance scale (Kling modes only)"
    )
    generate_audio: bool = Field(
        default=False, description="Always false — audio comes from Song Engine"
    )
    text_to_video: bool = Field(
        default=False, description="Use text-to-video endpoint (no source image needed)"
    )
    short_mode: bool = Field(
        default=False,
        description="Short-mode bypass: skip the legacy enum-snap in LTX adapters so arbitrary per-scene durations reach the worker",
    )
    seed: int = Field(
        default=-1, description="Generation seed: -1 for random, any positive int for reproducibility"
    )

    @field_validator("seed")
    @classmethod
    def validate_seed(cls, v: int) -> int:
        if v < -1:
            return -1
        return v


class VideoMetadata(BaseModel):
    """Context for generation-meta.json lineage tracking."""

    word: str
    language: str
    translation: str
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    word_id: str | None = None
    deck_id: str | None = None
    user_id: str | None = None
    job_id: str | None = None
    attempt: int | None = None
    image_version: Optional[str] = None
    scene_number: int = 1


class VideoPayload(BaseModel):
    """Complete engine input payload per engine contract (Master Abstract Section 8.1)."""

    content: VideoContent
    settings: VideoSettings = Field(default_factory=VideoSettings)
    output_dir: str
    metadata: VideoMetadata


# --- Engine Output Models ---


class VideoError(BaseModel):
    """Error information for failed video generation."""

    message: str
    retryable: bool = True
    type: str = "unknown_error"


class VideoResult(BaseModel):
    """Engine contract return value (Master Abstract Section 8.2)."""

    status: Literal["success", "failed"]
    output_paths: list[str] = Field(default_factory=list)
    error: Optional[VideoError] = None


# --- Generation Metadata Models (ENGINE_VIDEO_v1_1.md Section 11) ---


class GenerationMetaContext(BaseModel):
    word: str
    language: str
    translation: str


class GenerationMetaInputs(BaseModel):
    image_version: Optional[str] = None
    scene_number: int = 1
    video_prompt: Optional[str] = None
    settings_used: dict[str, Any] = Field(default_factory=dict)
    transition: Optional[bool] = None
    end_image_path: Optional[str] = None


class GenerationMetaOutputs(BaseModel):
    primary: str = ""
    thumbnail: Optional[str] = None
    format: str = "mp4"
    codec: str = "h264"
    resolution: Optional[str] = None
    fps: Optional[int] = None
    duration_seconds: Optional[float] = None
    file_size_bytes: Optional[int] = None


class GenerationMetaCost(BaseModel):
    estimated_usd: float = 0.0
    rate_per_second: Optional[float] = None
    duration_seconds: Optional[float] = None
    provider: str = "local/ffmpeg"
    model: str = "ffmpeg-zoompan"
    note: str = "Estimated based on published rates. Actual billing may differ."


class GenerationMetaReproducibility(BaseModel):
    seed: Optional[int] = None
    model_version: Optional[str] = None
    provider: str = "local/ffmpeg"
    fal_request_id: Optional[str] = None
    ffmpeg_version: Optional[str] = None
    note: Optional[str] = None


class GenerationMeta(BaseModel):
    """Complete generation metadata written to generation-meta.json."""

    status: Literal["success", "failed"]
    engine: str = "video-engine"
    engine_version: str
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    duration_seconds: Optional[float] = None

    context: GenerationMetaContext
    inputs: GenerationMetaInputs
    outputs: Optional[GenerationMetaOutputs] = None
    cost: Optional[GenerationMetaCost] = None
    reproducibility: Optional[GenerationMetaReproducibility] = None
    error: Optional[VideoError] = None
