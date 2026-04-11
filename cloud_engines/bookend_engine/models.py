from pydantic import BaseModel
from typing import Optional


class BookendError(BaseModel):
    """Structured error for bookend engine failures."""
    message: str
    retryable: bool = False
    type: str = "unknown_error"


class GenerationMetaContext(BaseModel):
    word: str
    language: str
    translation: str


class BookendGenerationMeta(BaseModel):
    """Complete generation metadata written to generation-meta.json."""
    status: str = "failed"
    engine: str = "bookend-engine"
    engine_version: str = "0.1.0"
    timestamp: str
    duration_seconds: float = 0
    context: GenerationMetaContext | None = None
    inputs: dict | None = None
    outputs: dict | None = None
    tts: dict | None = None
    visual: dict | None = None
    reproducibility: dict | None = None
    error: str | None = None


class BookendSettings(BaseModel):
    enabled: bool = True
    voice_id: str                          # Required — no default, must be provided
    model_id: str = "eleven_flash_v2_5"
    display_duration_min: float = 2.0      # seconds
    display_duration_max: float = 4.0      # seconds
    display_buffer_pct: float = 1.0        # 1.0 = 100% extra hold after TTS audio
    fade_duration: float = 0.5             # seconds, transition at boundaries
    font: str = "Bebas Neue"
    font_size: int = 92                    # points at 1080p, scales proportionally
    text_color: str = "auto"               # "auto", "white", or hex like "#E8C547"
    background_color: str = "#000000"
    gradient_background: bool = False
    show_translation: bool = True
    show_phonetic: bool = False
    skip_outro: bool = False          # When True: no outro segment (Suno fade_out mode)
    outro_mode: str = "normal"        # "normal" = TTS; "silent" = card + silence (Suno clean_cut mode)


class BookendContent(BaseModel):
    assembled_video: str                   # Full path to Stage 5 output MP4
    word: str                              # Target word (e.g., "Verzweiflung")
    translation: str                       # L1 translation (e.g., "Desperation")
    language: str                          # Language name (e.g., "German")
    language_code: str                     # ISO code (e.g., "de")


class BookendMetadata(BaseModel):
    word: str
    language: str
    translation: str
    assembly_version: str                  # Which assembly version was wrapped
    timestamp: str                         # ISO 8601


class BookendPayload(BaseModel):
    content: BookendContent
    settings: BookendSettings
    output_dir: str
    metadata: BookendMetadata


class BookendResult(BaseModel):
    status: str                            # "success" or "failed"
    output_paths: list[str] = []
    error: BookendError | None = None


class TtsResult(BaseModel):
    audio_path: str
    duration_seconds: float
    characters_used: int
