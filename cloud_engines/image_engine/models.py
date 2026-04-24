"""Data models for the Image Engine.

All models follow ENGINE_IMAGE.md specifications:
- Section 2: Input/output contract
- Section 4: Storyboard schema
- Section 8: Settings schema
- Section 13: Generation metadata
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Literal, Optional, Union

from pydantic import BaseModel, Field, field_validator


# --- Engine Input Models (Section 2.1) ---


class ImageContent(BaseModel):
    """Required content fields from the orchestrator."""

    word: str = Field(..., min_length=1)
    translation: str = Field(default="")
    language: str = Field(..., min_length=1)
    language_code: str = Field(..., min_length=2, max_length=5)


class ImageContext(BaseModel):
    """Optional context fields — all may be null/absent."""

    visual_hint: Optional[str] = None
    lyrics: Optional[str] = None
    music_caption: Optional[str] = None
    etymology: Optional[str] = None
    mnemonic: Optional[str] = None


# Valid values for settings enums
CREATIVE_DIRECTIONS = (
    "editorial", "cinematic", "provocative", "minimal", "literal",
    "movie", "movie_remix",
)
FRAME_NARRATIVES = (
    "auto", "collection", "scale", "action", "environment",
    "narrative", "context",
    # Legacy aliases accepted for backward compat:
    "perspective", "character", "angles", "series",
)

# Legacy mode names → new canonical names
MODE_ALIASES: dict[str, str] = {
    "angles": "scale",
    "series": "context",
    "perspective": "scale",
    "character": "context",
    "perspectives": "scale",
    "characters": "context",
}

# Canonical modes (excludes "auto" and legacy aliases)
CANONICAL_MODES = (
    "collection", "scale", "action", "environment",
    "narrative", "context",
)


def resolve_frame_narrative(frame_narrative: str) -> str:
    """Resolve legacy mode names to new names. Pass-through for new names and 'auto'."""
    return MODE_ALIASES.get(frame_narrative, frame_narrative)
CLIP_DURATIONS = (5, 10, 15, 20, 30)
IMAGE_MODELS = ("flux_pro", "zturbo", "wan_fast", "wan_pro")
ASPECT_RATIOS = ("16:9", "1:1", "9:16")
VISUAL_REFERENCES = ("auto", "etymology", "mnemonic", "none")

# Art style presets (Section 8.3) — free text also accepted
ART_STYLE_PRESETS = (
    "auto",
    # Photographic
    "photorealistic", "noir", "vintage_film", "double_exposure", "polaroid",
    # Classic Fine Art
    "oil_painting", "watercolor", "impressionism", "expressionism", "surrealism",
    "cubism", "renaissance", "pop_art", "chiaroscuro",
    # Decorative & Regional
    "art_nouveau", "art_deco", "ukiyo_e", "chinese_ink_wash",
    # Animation & Shows
    "studio_ghibli", "disney_animation", "pixar_3d", "anime", "comic_book",
    "one_piece_style", "dragon_ball_style", "south_park_style",
    "rick_and_morty_style", "blue_eyed_samurai", "invincible",
    # Digital & Retro
    "pixel_art", "synthwave", "cyberpunk", "vaporwave", "retro_90s", "glitch_art",
    # Craft & Tactile
    "knitted", "claymation", "origami", "stained_glass",
    # Illustration & Drawing
    "pen_and_ink", "charcoal_sketch", "engraving", "botanical_illustration", "storybook",
    # Artist-Inspired
    "van_gogh", "banksy", "escher", "klimt", "gerhard_richter",
    # Genre & Fantasy
    "steampunk", "fantasy_art", "collage", "lego_voxel",
)


class ImageSettings(BaseModel):
    """User-configurable settings per ENGINE_IMAGE.md Section 8.

    All fields have defaults. An empty settings object produces:
    editorial direction, auto narrative (LLM picks), auto image count from 30s clip,
    no art style constraint (LLM decides freely), word in image enabled,
    DeepSeek V3 LLM, fast image model.
    """

    creative_direction: str = Field(default="editorial")
    frame_narrative: str = Field(default="auto")
    image_count: Union[str, int] = Field(default=1)
    clip_duration: int = Field(default=30)
    aspect_ratio: str = Field(default="16:9")
    art_style: Optional[str] = Field(default="")
    word_in_image: bool = Field(default=True)
    use_color_palette: bool = Field(default=False)
    llm_model: str = Field(default="deepseek/deepseek-v3.2")
    image_model: str = Field(default="flux_pro")
    visual_reference: str = Field(default="none")
    movie_override: Optional[str] = None
    movies_blacklist: list[str] = Field(default_factory=list)
    vocal_gender: str = Field(default="female")
    skip_rendering: bool = Field(
        default=False,
        description="Skip image rendering (storyboard-only mode for text-to-video)",
    )
    short_mode: bool = Field(
        default=False,
        description="Short mode: force 15s total across 2-3 scenes with per-scene durations in [3, 10]",
    )

    @field_validator("creative_direction")
    @classmethod
    def validate_creative_direction(cls, v: str) -> str:
        v = v.lower()
        if v not in CREATIVE_DIRECTIONS:
            raise ValueError(
                f"creative_direction must be one of {CREATIVE_DIRECTIONS}, got '{v}'"
            )
        return v

    @field_validator("frame_narrative")
    @classmethod
    def validate_frame_narrative(cls, v: str) -> str:
        v = v.lower()
        if v not in FRAME_NARRATIVES:
            raise ValueError(
                f"frame_narrative must be one of {FRAME_NARRATIVES}, got '{v}'"
            )
        return v

    @field_validator("image_count")
    @classmethod
    def validate_image_count(cls, v: Union[str, int]) -> Union[str, int]:
        if isinstance(v, str):
            if v != "auto":
                raise ValueError(f"image_count string must be 'auto', got '{v}'")
        elif isinstance(v, int):
            if not (1 <= v <= 8):
                raise ValueError(f"image_count must be 1-8, got {v}")
        return v

    @field_validator("clip_duration")
    @classmethod
    def validate_clip_duration(cls, v: int) -> int:
        if v not in CLIP_DURATIONS:
            raise ValueError(f"clip_duration must be one of {CLIP_DURATIONS}, got {v}")
        return v

    @field_validator("image_model")
    @classmethod
    def validate_image_model(cls, v: str) -> str:
        v = v.lower()
        if v not in IMAGE_MODELS:
            raise ValueError(f"image_model must be one of {IMAGE_MODELS}, got '{v}'")
        return v

    @field_validator("aspect_ratio")
    @classmethod
    def validate_aspect_ratio(cls, v: str) -> str:
        if v not in ASPECT_RATIOS:
            raise ValueError(f"aspect_ratio must be one of {ASPECT_RATIOS}, got '{v}'")
        return v

    @field_validator("art_style", mode="before")
    @classmethod
    def coerce_art_style_none(cls, v: Any) -> str:
        if v is None:
            return ""
        return v

    @field_validator("visual_reference")
    @classmethod
    def validate_visual_reference(cls, v: str) -> str:
        v = v.lower()
        if v not in VISUAL_REFERENCES:
            raise ValueError(
                f"visual_reference must be one of {VISUAL_REFERENCES}, got '{v}'"
            )
        return v

    @field_validator("vocal_gender")
    @classmethod
    def validate_vocal_gender(cls, v: str) -> str:
        v = v.lower()
        if v not in ("male", "female", "any"):
            raise ValueError(
                f"vocal_gender must be 'male', 'female', or 'any', got '{v}'"
            )
        return v


class ImageMetadata(BaseModel):
    """Context for generation-meta.json, provided by the orchestrator."""

    word: str
    language: str
    translation: str
    timestamp: str
    word_id: str | None = None
    deck_id: str | None = None
    user_id: str | None = None
    job_id: str | None = None
    attempt: int | None = None
    concept_version: Optional[str] = None


class ImagePayload(BaseModel):
    """Complete engine input payload per engine contract."""

    content: ImageContent
    context: Optional[ImageContext] = None
    settings: ImageSettings = Field(default_factory=ImageSettings)
    output_dir: str
    metadata: ImageMetadata


# --- Storyboard Models (Section 4) ---


class TextElement(BaseModel):
    """Word rendering instructions for the image model (Section 4.3)."""

    text: str
    rendering: str
    placement: str


class ImagePromptData(BaseModel):
    """Structured JSON sent verbatim to the image model (Section 4.3)."""

    subject: str
    scene: str
    style: str
    lighting: str
    composition: str
    mood: str
    colors: list[str]
    details: str
    aspect_ratio: str = "16:9"
    text_element: Optional[TextElement] = None


class WordRender(BaseModel):
    """How the word integrates into the scene (Section 4.2)."""

    enabled: bool
    text: Optional[str] = None
    technique: Optional[str] = None
    placement: Optional[str] = None
    integration_note: Optional[str] = None


class MovieReference(BaseModel):
    """Movie scene reference metadata for movie/movie_remix directions."""

    title: str
    year: Optional[int] = None
    scene_description: str
    actors: list[str] = Field(default_factory=list)
    color_signature: str = ""


class RemixElement(BaseModel):
    """Describes the single altered element in a movie_remix scene."""

    alteration_type: str
    original: str
    replacement: str
    word_connection: str = "visual humor only"


# Basic (compatible with all backends including Ken Burns)
CAMERA_MOTION_BASIC = (
    "slow_zoom_in", "slow_zoom_out",
    "pan_left", "pan_right", "pan_up", "pan_down",
    "static",
)

# Extended (for AI video backends like LTX — Ken Burns adapter will map these to basic equivalents)
CAMERA_MOTION_EXTENDED = (
    "dolly_in",        # camera physically moves toward subject
    "dolly_out",       # camera physically moves away from subject
    "orbit_left",      # camera circles subject clockwise
    "orbit_right",     # camera circles subject counter-clockwise
    "tracking_left",   # camera moves alongside subject leftward
    "tracking_right",  # camera moves alongside subject rightward
    "crane_up",        # camera rises vertically
    "crane_down",      # camera descends vertically
    "push_in",         # slow deliberate move toward subject (like dolly but more intentional)
    "pull_out",        # slow deliberate move away from subject
    "handheld",        # subtle natural handheld shake/sway
)

CAMERA_MOTION_TYPES = CAMERA_MOTION_BASIC + CAMERA_MOTION_EXTENDED
CAMERA_SPEEDS = ("very_slow", "slow", "medium", "fast")


class CameraMotion(BaseModel):
    """Camera motion direction for video animation (Section 4.4)."""

    type: str
    direction: str
    speed: str
    description: str

    @field_validator("type")
    @classmethod
    def validate_type(cls, v: str) -> str:
        if v not in CAMERA_MOTION_TYPES:
            raise ValueError(
                f"camera_motion type must be one of {CAMERA_MOTION_TYPES}, got '{v}'"
            )
        return v

    @field_validator("speed")
    @classmethod
    def validate_speed(cls, v: str) -> str:
        if v not in CAMERA_SPEEDS:
            raise ValueError(
                f"camera_motion speed must be one of {CAMERA_SPEEDS}, got '{v}'"
            )
        return v


class Scene(BaseModel):
    """A single scene in the storyboard (Section 4.2)."""

    scene_number: int = Field(ge=1, le=8)
    description: str
    image_prompt: ImagePromptData
    word_render: WordRender
    camera_motion: CameraMotion
    video_prompt: str
    transition_prompt: Optional[str] = None
    suggested_duration: Optional[int] = Field(default=None, ge=3, le=10)
    duration_rationale: Optional[str] = None
    movie_reference: Optional[MovieReference] = None
    remix_element: Optional[RemixElement] = None


class Storyboard(BaseModel):
    """Complete storyboard returned by the LLM (Section 4.1)."""

    word: str
    translation: str
    language: str
    creative_direction: str
    frame_narrative: str
    art_style: str
    scene_count: int = Field(ge=1, le=8)
    visual_concept: str
    shared_palette: list[str]
    shared_motif: str
    movie_source_strategy: Optional[str] = None
    movies_referenced: Optional[list[str]] = None
    suggested_transition_mode: Optional[str] = None
    transition_rationale: Optional[str] = None
    music_caption: Optional[str] = None
    mnemonic_text: Optional[str] = None
    scenes: list[Scene]


class SceneTextToVideo(BaseModel):
    """Text-to-video scene — image_prompt and word_render are optional.

    Used when skip_rendering=True. The LLM generates rich video_prompt
    descriptions instead of image rendering instructions.
    """

    scene_number: int = Field(ge=1, le=8)
    description: str
    camera_motion: CameraMotion
    video_prompt: str
    text_to_video_prompt: Optional[str] = None
    transition_prompt: Optional[str] = None
    suggested_duration: Optional[int] = Field(default=None, ge=3, le=10)
    duration_rationale: Optional[str] = None
    movie_reference: Optional[MovieReference] = None
    remix_element: Optional[RemixElement] = None
    image_prompt: Optional[ImagePromptData] = None
    word_render: Optional[WordRender] = None


class StoryboardTextToVideo(BaseModel):
    """Storyboard variant for text-to-video mode.

    Same top-level fields as Storyboard, but scenes use SceneTextToVideo
    which does not require image_prompt or word_render.
    """

    word: str
    translation: str
    language: str
    creative_direction: str
    frame_narrative: str
    art_style: str
    scene_count: int = Field(ge=1, le=8)
    visual_concept: str
    shared_palette: list[str]
    shared_motif: str
    movie_source_strategy: Optional[str] = None
    movies_referenced: Optional[list[str]] = None
    suggested_transition_mode: Optional[str] = None
    transition_rationale: Optional[str] = None
    music_caption: Optional[str] = None
    mnemonic_text: Optional[str] = None
    scenes: list[SceneTextToVideo]


# --- Engine Output Models (Section 2.2) ---


class RenderResult(BaseModel):
    """Result of rendering a single scene."""

    success: bool
    scene_number: int
    file_path: Optional[str] = None
    error_message: Optional[str] = None
    prompt_json: Optional[str] = None
    safety_blocked: bool = False
    provider_name: Optional[str] = None
    model_name: Optional[str] = None
    request_id: Optional[str] = None
    cost_estimate_usd: Optional[float] = None
    response_body: Optional[str] = None


class ImageError(BaseModel):
    """Error information for failed generations."""

    message: str
    retryable: bool = True


class ImageResult(BaseModel):
    """Engine contract return value."""

    status: Literal["success", "partial", "failed"]
    output_paths: list[str] = Field(default_factory=list)
    error: Optional[ImageError] = None


# --- Generation Metadata Models (Section 13) ---


class StoryboardStepMeta(BaseModel):
    """Metadata from Step A (storyboard generation)."""

    llm_model: str
    llm_provider: str = "openrouter"
    prompt_tokens: Optional[int] = None
    completion_tokens: Optional[int] = None
    duration_seconds: Optional[float] = None
    cost_estimate_usd: Optional[float] = None


class RenderingStepMeta(BaseModel):
    """Metadata from Step B (image rendering)."""

    model: str
    scenes_attempted: int
    scenes_succeeded: int
    scenes_failed: int
    scenes_safety_blocked: int = 0
    skipped_rendering: bool = False
    per_scene_seconds: list[float] = Field(default_factory=list)
    total_duration_seconds: Optional[float] = None


class GenerationMetaInput(BaseModel):
    """Input record in generation-meta.json."""

    word: str
    language: str
    language_code: str
    concept_version: Optional[str] = None


class GenerationMetaSettings(BaseModel):
    """Settings record in generation-meta.json."""

    creative_direction: str
    frame_narrative: str
    image_count: int
    image_count_source: str
    aspect_ratio: str
    art_style: str
    word_in_image: bool
    llm_model: str
    image_model: str
    vocal_gender: str = "female"


class GenerationMetaOutputs(BaseModel):
    """Output record in generation-meta.json."""

    images_generated: int
    images_requested: int
    image_files: list[str] = Field(default_factory=list)
    storyboard_file: str = "storyboard.json"


class GenerationMetaSteps(BaseModel):
    """Step timing records in generation-meta.json."""

    storyboard_generation: Optional[StoryboardStepMeta] = None
    image_rendering: Optional[RenderingStepMeta] = None


class GenerationMeta(BaseModel):
    """Complete generation-meta.json schema per ENGINE_IMAGE.md Section 13.

    Written to output_dir with every engine call — success or failure.
    """

    engine: str = "image"
    engine_version: str = "1.0.0"
    timestamp: str = Field(
        default_factory=lambda: datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    )
    status: Literal["success", "partial", "failed"]
    duration_seconds: Optional[float] = None

    input: Optional[GenerationMetaInput] = None
    settings: Optional[GenerationMetaSettings] = None
    outputs: Optional[GenerationMetaOutputs] = None
    steps: Optional[GenerationMetaSteps] = None

    error: Optional[ImageError] = None


# --- Helper: Auto image count resolution (Section 7.1) ---

AUTO_IMAGE_COUNT_MAP: dict[int, int] = {
    5: 1,
    10: 2,
    15: 2,
    20: 3,
    30: 3,
}


def resolve_image_count(settings: ImageSettings) -> tuple[int, str]:
    """Resolve image_count from settings.

    Returns:
        Tuple of (resolved count, source description).
    """
    if isinstance(settings.image_count, int):
        return settings.image_count, "manual_override"

    # "auto" — calculate from clip_duration
    count = AUTO_IMAGE_COUNT_MAP.get(settings.clip_duration, 1)
    return count, f"auto_from_clip_duration_{settings.clip_duration}"
