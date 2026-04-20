"""Data models for the Concept Engine.

All input/output types used by the engine, following the engine contract
from MASTER_ABSTRACT_v1.md Section 8 and settings from ENGINE_CONCEPT.md Section 7.
"""

from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field, field_validator


# ---------------------------------------------------------------------------
# Input models
# ---------------------------------------------------------------------------

class Enrichment(BaseModel):
    """Optional enrichment data from the orchestrator.

    Contains mnemonic and part-of-speech information used to extract
    the correct grammatical article for lyrics.
    """

    mnemonic: str = Field(default="", description="Mnemonic string, e.g. 'DER Arzt (masculine)'")
    pos: str = Field(default="", description="Part of speech, e.g. 'noun', 'verb', 'adjective'")


class ConceptContent(BaseModel):
    """Content payload — the vocabulary word (or short phrase) to generate a concept for."""

    word: str = Field(..., min_length=1, description="Target vocabulary word or short phrase in the target language")
    translation: str = Field(default="", description="English meaning of the word (optional, helps guide creative direction)")
    language: str = Field(..., min_length=1, description="Full language name (e.g. 'German', 'Korean')")
    language_code: str = Field(..., min_length=2, max_length=5, description="ISO 639-1 code (e.g. 'de', 'ko')")
    enrichment: Enrichment | None = Field(default=None, description="Optional enrichment data from orchestrator")
    external_music_caption: str | None = Field(
        default=None,
        description="Pre-generated music caption from storyboard. Skips LLM caption generation when provided.",
    )
    input_type: Literal["word", "phrase"] = Field(
        default="word",
        description='"word" for single words or "phrase" for short multi-word inputs. Phrases skip article discovery and syllable analysis.',
    )


class ConceptSettings(BaseModel):
    """User-configurable settings. Missing fields default per ENGINE_CONCEPT.md Section 7."""

    vocal_gender: str = Field(default="female", description="Vocal type for music caption")
    lyric_mode: str = Field(default="standard", description="Lyric generation strategy")
    genre: str | None = Field(default="auto", description="'auto' = LLM picks genre, or any genre string")
    caption_style: str = Field(default="production", description="Caption prompt style: 'vocal_forward' (voice-first) or 'production' (music-first)")
    use_art_style: bool = Field(default=False, description="Include art style in caption prompt for genre matching")
    art_style_hint: str = Field(default="", description="Art style value from orchestrator, used when use_art_style is True")
    syllable_chop: bool = Field(default=False, description="Experimental syllable chopping (dramatic mode only)")
    duration: int = Field(default=30, description="Song duration in seconds")
    visual_hint: bool = Field(default=False, description="Whether to generate a visual mood tag")
    llm_model: str = Field(default="deepseek/deepseek-v3.2", description="OpenRouter model ID")

    @field_validator("genre", mode="before")
    @classmethod
    def coerce_genre(cls, v: str | None) -> str:
        """Treat None or empty string as 'auto'."""
        return v if v else "auto"

    @field_validator("vocal_gender")
    @classmethod
    def validate_vocal_gender(cls, v: str) -> str:
        allowed = ("male", "female", "any")
        if v not in allowed:
            raise ValueError(f"vocal_gender must be one of {allowed}, got '{v}'")
        return v

    @field_validator("lyric_mode")
    @classmethod
    def validate_lyric_mode(cls, v: str) -> str:
        allowed = ("minimal", "standard", "dramatic", "contextual", "creative", "reliable")
        if v not in allowed:
            raise ValueError(f"lyric_mode must be one of {allowed}, got '{v}'")
        return v

    @field_validator("caption_style")
    @classmethod
    def validate_caption_style(cls, v: str) -> str:
        allowed = ("vocal_forward", "production")
        if v not in allowed:
            raise ValueError(f"caption_style must be one of {allowed}, got '{v}'")
        return v

    @field_validator("duration")
    @classmethod
    def validate_duration(cls, v: int) -> int:
        if v not in (15, 20, 30, 60):
            raise ValueError(f"duration must be 15, 20, 30, or 60, got {v}")
        return v



class ConceptMetadata(BaseModel):
    """Metadata included with the payload for traceability.

    Identity fields (word_id / deck_id / user_id / job_id / attempt) are optional
    and used by observability (pipeline_events). Missing values are fine —
    callers who don't have them pass None.
    """

    word: str
    language: str
    timestamp: str
    word_id: str | None = None
    deck_id: str | None = None
    user_id: str | None = None
    job_id: str | None = None
    attempt: int | None = None


class ConceptPayload(BaseModel):
    """Complete engine input payload per the engine contract."""

    content: ConceptContent
    settings: ConceptSettings = Field(default_factory=ConceptSettings)
    output_dir: str
    metadata: ConceptMetadata


# ---------------------------------------------------------------------------
# Internal result models
# ---------------------------------------------------------------------------

class SyllableInfo(BaseModel):
    """Result of syllable analysis for a word."""

    count: int = Field(..., ge=1, description="Number of syllables")
    word_length_class: Literal["short", "medium", "long"] = Field(..., description="Classification by syllable count")
    fragments: list[str] = Field(default_factory=list, description="Syllable fragments for chopping")
    method: str = Field(..., description="How syllables were counted (pyphen/cjk/fallback)")


class LyricsResult(BaseModel):
    """Result of lyric generation."""

    lyrics: str = Field(..., min_length=1)
    source: Literal["template", "llm", "llm_fallback"] = Field(..., description="How lyrics were generated")
    word_repetitions: int = Field(..., ge=0, description="Times the target word appears in lyrics")


class CaptionResult(BaseModel):
    """Result of music caption generation."""

    caption: str = Field(..., min_length=1)
    visual_hint: str | None = Field(default=None, description="Optional mood tag")
    source: str = Field(..., description="How the caption was generated (e.g. 'llm_auto', 'llm_manual')")
    language_injected: bool = Field(default=False, description="Whether language was appended to caption")


# ---------------------------------------------------------------------------
# Output models
# ---------------------------------------------------------------------------

class GenerationInfo(BaseModel):
    """Metadata about how a concept artifact was generated."""

    lyric_mode: str
    genre_mode: str
    syllable_count: int
    word_length_class: str
    llm_calls: int
    lyrics_source: str
    caption_source: str
    article_used: str = ""


class ConceptArtifact(BaseModel):
    """The concept artifact JSON written to disk."""

    word: str
    translation: str
    language: str
    language_code: str
    lyrics: str
    suno_lyrics: str | None = None
    music_caption: str
    visual_hint: str | None = None  # DEPRECATED — always None. Storyboard handles visuals.
    generation_info: GenerationInfo


class ConceptError(BaseModel):
    """Error information for failed generations."""

    message: str
    retryable: bool = True
    type: str = "unknown_error"


class ConceptResult(BaseModel):
    """Engine contract return value."""

    status: Literal["success", "failed"]
    output_paths: list[str] = Field(default_factory=list)
    error: ConceptError | None = None


# ---------------------------------------------------------------------------
# Generation metadata models (generation-meta.json)
# ---------------------------------------------------------------------------

class MetaContext(BaseModel):
    """Context section of generation-meta.json."""

    word: str
    language: str
    translation: str


class MetaInputs(BaseModel):
    """Inputs section of generation-meta.json."""

    settings_used: dict


class MetaOutputs(BaseModel):
    """Outputs section of generation-meta.json."""

    primary: str
    format: str = "json"
    lyrics_source: str
    caption_source: str
    llm_calls_made: int
    syllable_count: int
    word_length_class: str
    word_repetitions: int


class MetaReproducibility(BaseModel):
    """Reproducibility section of generation-meta.json."""

    llm_model: str
    note: str = "LLM output is non-deterministic. Template lyrics are deterministic for the same settings."


class GenerationMeta(BaseModel):
    """Full generation-meta.json structure per ENGINE_CONCEPT.md Section 9."""

    status: str
    engine: str = "concept-engine"
    engine_version: str
    timestamp: str
    duration_seconds: float

    context: MetaContext
    inputs: MetaInputs
    outputs: MetaOutputs | None = None
    reproducibility: MetaReproducibility | None = None
    error: ConceptError | None = None
