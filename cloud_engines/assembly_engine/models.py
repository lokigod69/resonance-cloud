"""Data models for the Assembly Engine.

All models follow ENGINE_ASSEMBLY.md specifications:
- Section 2: Input/output contract
- Section 13: Settings schema
- Section 12: Generation metadata
"""

from __future__ import annotations

import re
from datetime import datetime, timezone
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field, field_validator


# --- Engine Input Models ---


class AssemblyContent(BaseModel):
    """Content provided by the orchestrator for assembly."""

    song_path: str = Field(
        ..., min_length=1, description="Path to the selected audio file (FLAC)"
    )
    video_clips: list[str] = Field(
        ..., min_length=1, description="Ordered list of MP4 clip paths"
    )
    word: str = Field(..., min_length=1, description="Target word in the target language")
    translation: str = Field(default="", description="L1 translation of the word (empty for same-language phrases)")
    language: str = Field(..., min_length=1, description="Target language name (e.g., 'German')")
    language_code: str = Field(
        ..., min_length=2, max_length=5, description="ISO 639-1 code (e.g., 'de')"
    )


class AssemblySettings(BaseModel):
    """User-configurable settings for assembly.

    All fields have defaults per ENGINE_ASSEMBLY.md Section 13.
    An empty settings object produces: clean mode, ping-pong gap fill,
    trim overflow, hard cuts, silence trimming, LUFS normalization,
    1080p H.264 output at CRF 18.
    """

    # Assembly structure (Section 13.1)
    assembly_mode: Literal["clean", "pedagogic"] = "clean"

    # Time alignment (Section 13.2)
    gap_strategy: Literal[
        "ping_pong", "loop", "fade_black", "freeze_ken_burns", "word_card"
    ] = "ping_pong"
    overflow_strategy: Literal["trim", "fade_audio_black", "video_full"] = "video_full"

    # Transitions (Section 13.3)
    transition: Literal["cut", "crossfade", "dip_black"] = "cut"
    transition_duration: float = Field(
        default=0.5, ge=0.1, le=2.0,
        description="Transition duration in seconds (ignored for hard cuts)",
    )

    # Audio processing (Section 13.4)
    silence_trim: bool = Field(default=True, description="Trim silence from song start/end")
    silence_threshold_db: float = Field(
        default=-40.0, ge=-60.0, le=-20.0,
        description="Threshold below which audio is silence",
    )
    lufs_normalize: bool = Field(default=True, description="Apply LUFS loudness normalization")
    target_lufs: float = Field(
        default=-14.0, ge=-24.0, le=-8.0,
        description="Target integrated loudness (-14 LUFS = streaming standard)",
    )

    # Word card — pedagogic mode (Section 13.5)
    word_card_duration: float = Field(
        default=2.0, ge=1.0, le=5.0, description="Intro word card duration in seconds"
    )
    word_card_font: str = Field(
        default="Noto Sans", description="Font family for word card text"
    )
    word_card_font_size: int = Field(
        default=72, ge=24, le=144,
        description="Font size in points at 1080p (scales with resolution)",
    )
    word_card_color: str = Field(
        default="auto",
        description='Text color: "auto", "white", or hex "#RRGGBB"',
    )
    word_card_show_translation: bool = Field(
        default=False, description="Show L1 translation below the target word"
    )

    # Video encoding (Section 13.6)
    video_codec: Literal["libx264", "libx265"] = "libx264"
    video_preset: Literal["medium", "slow", "slower", "veryslow"] = "slow"
    video_crf: int = Field(
        default=18, ge=0, le=51,
        description="Constant Rate Factor (18 = visually lossless)",
    )
    audio_codec: Literal["aac", "libopus"] = "aac"
    audio_bitrate: Literal["128k", "192k", "256k", "320k"] = "192k"
    output_resolution: Literal["720p", "1080p", "4k"] = "1080p"
    output_fps: Literal[24, 25, 30] = 25

    @field_validator("word_card_color")
    @classmethod
    def validate_word_card_color(cls, v: str) -> str:
        v = v.strip()
        if v in ("auto", "white"):
            return v
        if re.match(r"^#[0-9A-Fa-f]{6}$", v):
            return v.upper()
        raise ValueError(
            f'word_card_color must be "auto", "white", or a hex color '
            f'like "#E8C547", got "{v}"'
        )


class AssemblyMetadata(BaseModel):
    """Context for generation-meta.json lineage tracking."""

    word: str
    language: str
    translation: str
    timestamp: str
    word_id: str | None = None
    deck_id: str | None = None
    user_id: str | None = None
    job_id: str | None = None
    attempt: int | None = None
    song_version: Optional[str] = None
    video_version: Optional[str] = None


class AssemblyPayload(BaseModel):
    """Complete engine input payload per engine contract (Master Abstract Section 8.1)."""

    content: AssemblyContent
    settings: AssemblySettings = Field(default_factory=AssemblySettings)
    output_dir: str
    metadata: AssemblyMetadata


# --- Trim Endpoint Models ---


class TrimSettings(BaseModel):
    """Encoding settings for the trim endpoint."""

    video_codec: str = "libx264"
    video_preset: str = "slow"
    video_crf: int = 18
    audio_codec: str = "aac"
    audio_bitrate: str = "192k"


class TrimPayload(BaseModel):
    """Input payload for the /trim endpoint."""

    source_path: str = Field(..., min_length=1, description="Full path to the source MP4")
    trim_start: float = Field(..., ge=0.0, description="Start time in seconds")
    trim_end: float = Field(..., gt=0.0, description="End time in seconds")
    output_dir: str = Field(..., min_length=1, description="Directory to write output")
    settings: TrimSettings = Field(default_factory=TrimSettings)
    metadata: dict = Field(default_factory=dict)


# --- Internal Processing Models ---


class MediaInfo(BaseModel):
    """Probed information about a media file from ffprobe."""

    path: str
    duration: float
    width: Optional[int] = None
    height: Optional[int] = None
    video_codec: Optional[str] = None
    audio_codec: Optional[str] = None
    has_audio: bool = False
    has_video: bool = False


class TimingPlan(BaseModel):
    """Result of timing calculations.

    Contains all resolved durations needed to assemble the video.
    The gap field is positive when video is shorter than song (need to fill),
    negative when video is longer (need to trim/overflow).
    """

    effective_song_duration: float
    total_clip_duration: float
    transition_time_reduction: float = 0.0
    word_card_intro_duration: float = 0.0
    word_card_outro_duration: float = 0.0
    available_for_video: float
    gap: float
    strategy_to_apply: str


class AudioProcessingReport(BaseModel):
    """Report from the audio processing step."""

    original_duration: float
    trimmed_silence_start: float = 0.0
    trimmed_silence_end: float = 0.0
    effective_duration: float
    original_lufs: Optional[float] = None
    normalized_lufs: Optional[float] = None
    processed_path: str


# --- Engine Output Models ---


class AssemblyError(BaseModel):
    """Error information for failed assemblies."""

    message: str
    retryable: bool = False
    type: str = "unknown_error"


class AssemblyResult(BaseModel):
    """Engine contract return value (Master Abstract Section 8.2)."""

    status: Literal["success", "failed"]
    output_paths: list[str] = Field(default_factory=list)
    error: Optional[AssemblyError] = None


# --- Generation Metadata Models (ENGINE_ASSEMBLY.md Section 12) ---


class GenerationMetaContext(BaseModel):
    word: str
    language: str
    translation: str


class GenerationMetaInputs(BaseModel):
    song_version: Optional[str] = None
    video_version: Optional[str] = None
    video_clips_used: list[str] = Field(default_factory=list)
    settings_used: dict[str, Any] = Field(default_factory=dict)


class GenerationMetaOutputs(BaseModel):
    primary: str = "final.mp4"
    format: str = "mp4"
    duration_seconds: Optional[float] = None
    resolution: Optional[str] = None
    file_size_bytes: Optional[int] = None


class AssemblyReport(BaseModel):
    """Detailed timing/processing breakdown unique to the Assembly Engine."""

    original_song_duration: Optional[float] = None
    trimmed_silence_start: float = 0.0
    trimmed_silence_end: float = 0.0
    effective_song_duration: Optional[float] = None
    total_clip_duration: Optional[float] = None
    gap_seconds: Optional[float] = None
    gap_strategy_applied: Optional[str] = None
    original_lufs: Optional[float] = None
    normalized_lufs: Optional[float] = None
    word_card_intro_duration: float = 0.0
    word_card_outro_duration: float = 0.0
    clips_trimmed: bool = False
    clips_looped: bool = False


class GenerationMetaReproducibility(BaseModel):
    ffmpeg_version: Optional[str] = None
    ffmpeg_command: Optional[str] = None


class GenerationMeta(BaseModel):
    """Complete generation metadata written to generation-meta.json."""

    status: Literal["success", "failed"]
    engine: str = "assembly-engine"
    engine_version: str
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    duration_seconds: Optional[float] = None

    context: GenerationMetaContext
    inputs: GenerationMetaInputs
    outputs: Optional[GenerationMetaOutputs] = None
    assembly_report: Optional[AssemblyReport] = None
    reproducibility: Optional[GenerationMetaReproducibility] = None
    error: Optional[AssemblyError] = None
