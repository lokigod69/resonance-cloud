"""Data models for the Song Engine.

All models follow ENGINE_SONG.md specifications:
- Section 2: Input/output contract
- Section 4: Ace-Step parameter map
- Section 7: Settings schema
- Section 9: Generation metadata
"""

from __future__ import annotations

import hashlib
from datetime import datetime
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator


# --- Engine Input Models ---


class SongContent(BaseModel):
    """Content extracted from the concept artifact by the orchestrator."""

    lyrics: str = Field(..., min_length=1, description="Structured lyrics with [Verse]/[Chorus] tags")
    music_caption: str = Field(..., min_length=1, description="Genre, instruments, vocal style, mood")
    language_code: str = Field(..., min_length=2, max_length=5, description="ISO 639-1 language code (e.g., 'de', 'ko')")

    def lyrics_hash(self) -> str:
        """SHA-256 hash of lyrics for compact metadata storage."""
        return f"sha256:{hashlib.sha256(self.lyrics.encode()).hexdigest()}"


class SongSettings(BaseModel):
    """User-configurable settings for song generation.

    All fields have defaults per ENGINE_SONG.md Section 7.
    An empty settings object produces: 4 takes, 30s, 50 steps,
    guidance 7.5, thinking enabled, random seeds, FLAC output.
    """

    duration: int = Field(default=30, description="Song length in seconds")
    batch_size: int = Field(default=4, ge=1, le=8, description="Number of takes per call")
    inference_steps: int = Field(default=50, ge=32, le=100, description="DiT denoising steps")
    guidance_scale: float = Field(default=7.5, ge=5.0, le=10.0, description="Prompt adherence strength")
    thinking: bool = Field(default=True, description="LM audio code generation")
    seed: Union[int, list[int]] = Field(default=-1, description="Random seed. -1=random, int=fixed, list=per-take")
    bpm: Optional[int] = Field(default=None, ge=60, le=200, description="Beats per minute. None=auto")
    audio_format: str = Field(default="flac", description="Output format (hardcoded to FLAC)")

    # LoRA adapter settings
    lora_path: Optional[str] = Field(default=None, description="Path to LoRA adapter directory. None=no LoRA")
    lora_strength: float = Field(default=0.75, ge=0.0, le=1.0, description="LoRA influence scale")
    lora_trigger_phrase: Optional[str] = Field(default=None, description="Activation tag to prepend to caption")

    @field_validator("duration")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v not in (15, 20, 30):
            raise ValueError(f"Duration must be 15, 20, or 30, got {v}")
        return v

    @field_validator("audio_format")
    @classmethod
    def validate_audio_format(cls, v: str) -> str:
        if v != "flac":
            raise ValueError("Audio format is hardcoded to 'flac'")
        return v

    @field_validator("seed")
    @classmethod
    def validate_seed(cls, v: Union[int, list[int]]) -> Union[int, list[int]]:
        if isinstance(v, list):
            if not v:
                raise ValueError("Seed list cannot be empty")
            for s in v:
                if not isinstance(s, int) or s < 0:
                    raise ValueError(f"Each seed must be a non-negative integer, got {s}")
        elif isinstance(v, int) and v < -1:
            raise ValueError(f"Seed must be -1 (random) or a non-negative integer, got {v}")
        return v


class SongMetadata(BaseModel):
    """Context for generation-meta.json, provided by the orchestrator."""

    word: str
    language: str
    translation: str
    timestamp: str
    concept_version: Optional[str] = None


class SongPayload(BaseModel):
    """Complete engine input payload per engine contract."""

    content: SongContent
    settings: SongSettings = Field(default_factory=SongSettings)
    output_dir: str
    metadata: SongMetadata


# --- Ace-Step Communication Models ---


class AceStepParams(BaseModel):
    """Complete parameter set sent to Ace-Step.

    Includes both user-configurable and hardcoded parameters.
    Per ENGINE_SONG.md Section 4.1.
    """

    # From input (not settings)
    caption: str
    lyrics: str
    vocal_language: str
    task_type: str = "text2music"

    # User-configurable
    duration: int = 30
    inference_steps: int = 50
    guidance_scale: float = 7.5
    thinking: bool = True
    batch_size: int = 4
    seed: Union[int, list[int]] = -1
    bpm: Optional[int] = None

    # Hardcoded — per ENGINE_SONG.md Section 4.1
    shift: float = 2.5
    infer_method: str = "ode"
    use_cot_caption: bool = False
    use_cot_language: bool = False
    use_cot_metas: bool = False
    audio_format: str = "flac"
    enable_normalization: bool = True
    normalization_db: float = -1.0
    lm_temperature: float = 0.85
    lm_top_k: int = 0
    lm_top_p: float = 0.9
    lm_cfg_scale: float = 2.0

    # LoRA state — used by Gradio backend for ensure_lora_state(), NOT sent to generation call
    lora_path: Optional[str] = None
    lora_strength: float = 0.75

    def to_http_payload(self) -> dict[str, Any]:
        """Convert to the JSON payload for POST /release_task."""
        payload = {
            "caption": self.caption,
            "lyrics": self.lyrics,
            "vocal_language": self.vocal_language,
            "task_type": self.task_type,
            "duration": self.duration,
            "inference_steps": self.inference_steps,
            "guidance_scale": self.guidance_scale,
            "thinking": self.thinking,
            "batch_size": self.batch_size,
            "shift": self.shift,
            "infer_method": self.infer_method,
            "use_cot_caption": self.use_cot_caption,
            "use_cot_language": self.use_cot_language,
            "use_cot_metas": self.use_cot_metas,
            "audio_format": self.audio_format,
            "enable_normalization": self.enable_normalization,
            "normalization_db": self.normalization_db,
            "lm_temperature": self.lm_temperature,
            "lm_top_k": self.lm_top_k,
            "lm_top_p": self.lm_top_p,
            "lm_cfg_scale": self.lm_cfg_scale,
        }

        if self.bpm is not None:
            payload["bpm"] = self.bpm

        # Seed handling
        if isinstance(self.seed, list):
            payload["seeds"] = self.seed
            payload["use_random_seed"] = False
        elif self.seed == -1:
            payload["use_random_seed"] = True
        else:
            payload["seed"] = self.seed
            payload["use_random_seed"] = False

        return payload


class TakeInfo(BaseModel):
    """Information about a single generated take."""

    file: str
    seed: Optional[int] = None


class AceStepTiming(BaseModel):
    """Timing breakdown from Ace-Step generation."""

    total_seconds: Optional[float] = None
    lm_seconds: Optional[float] = None
    dit_seconds: Optional[float] = None
    vae_seconds: Optional[float] = None
    overhead_seconds: Optional[float] = None


class AceStepResponse(BaseModel):
    """Response from an Ace-Step backend after generation."""

    audio_paths: list[str] = Field(default_factory=list, description="Paths to generated audio files")
    seeds: list[int] = Field(default_factory=list, description="Seeds used for each take")
    timing: Optional[AceStepTiming] = None
    model_info: Optional[str] = None
    raw_response: Optional[dict[str, Any]] = None


# --- Engine Output Models ---


class SongError(BaseModel):
    """Error information for failed generations."""

    message: str
    retryable: bool = True
    type: str = "unknown_error"


class SongResult(BaseModel):
    """Engine contract return value."""

    status: Literal["success", "failed"]
    output_paths: list[str] = Field(default_factory=list)
    error: Optional[SongError] = None


# --- Generation Metadata ---


class GenerationMetaContext(BaseModel):
    """Word context in generation-meta.json."""

    word: str
    language: str
    translation: str


class GenerationMetaInputs(BaseModel):
    """Input record in generation-meta.json."""

    concept_version: Optional[str] = None
    lyrics_hash: str
    caption: str
    caption_modified: bool = False
    language_code: str
    language_tags_injected: bool = False
    tagged_lyrics_preview: Optional[str] = None
    settings_used: dict[str, Any] = Field(default_factory=dict)


class GenerationMetaOutputs(BaseModel):
    """Output record in generation-meta.json."""

    takes: list[TakeInfo] = Field(default_factory=list)
    format: str = "flac"
    sample_rate: int = 48000
    requested_duration: int = 30


class GenerationMetaAceStep(BaseModel):
    """Ace-Step configuration record in generation-meta.json."""

    backend: str
    url: str
    model: str = "acestep-v15-sft"
    infer_method: str = "ode"
    shift: float = 2.5
    thinking: bool = True
    use_cot_caption: bool = False
    use_cot_language: bool = False
    use_cot_metas: bool = False
    enable_normalization: bool = True
    normalization_db: float = -1.0
    lm_temperature: float = 0.85


class GenerationMetaLoraConstraints(BaseModel):
    """LoRA constraint overrides applied during generation."""

    thinking_forced_off: bool = False
    cot_forced_off: bool = False


class GenerationMetaLora(BaseModel):
    """LoRA adapter state in generation-meta.json."""

    path: Optional[str] = None
    strength: float = 0.75
    trigger_phrase: Optional[str] = None
    active: bool = False
    constraints_applied: GenerationMetaLoraConstraints = Field(
        default_factory=GenerationMetaLoraConstraints
    )


class GenerationMetaReproducibility(BaseModel):
    """Reproducibility record in generation-meta.json."""

    seeds: list[int] = Field(default_factory=list)
    deterministic: bool = False
    note: str = ""


class GenerationMeta(BaseModel):
    """Complete generation-meta.json schema per ENGINE_SONG.md Section 9.

    Written to output_dir with every engine call — success or failure.
    """

    status: Literal["success", "failed"]
    engine: str = "song-engine"
    engine_version: str = "0.1.0"
    timestamp: str = Field(default_factory=lambda: datetime.utcnow().isoformat(timespec="seconds") + "Z")
    duration_seconds: Optional[float] = None

    context: GenerationMetaContext
    inputs: GenerationMetaInputs
    outputs: Optional[GenerationMetaOutputs] = None
    acestep: Optional[GenerationMetaAceStep] = None
    lora: Optional[GenerationMetaLora] = None
    timing: Optional[AceStepTiming] = None
    reproducibility: Optional[GenerationMetaReproducibility] = None
    error: Optional[SongError] = None
    warning: Optional[str] = None
