"""Pydantic models for the card-image LLM call.

Card images use a focused single-image LLM prompt (NOT the multi-scene
storyboard prompt used by video decks). The LLM produces an
ImagePromptData-compatible structure that drops directly into the
existing per-provider renderers.
"""

from typing import Literal, Optional

from pydantic import BaseModel, field_validator

from .models import CARD_IMAGE_MODELS, ImageError, ImageMetadata


class CardImagePromptData(BaseModel):
    """LLM output for a single card image -- drop-in to existing renderers.

    Identical shape to ImagePromptData except:
    - continuity_anchor and change_request are forced null (single image)
    - text_element is None (no in-image text rendering for P4a; future option)
    - aspect_ratio defaults to 1:1 for cards
    """

    subject_identity: str
    action_state: str
    environment: str
    composition: str
    lighting: str
    material_detail: str
    mood_palette: str
    style_medium_override: Optional[str] = None
    continuity_anchor: None = None
    change_request: None = None
    aspect_ratio: Literal["1:1", "16:9", "9:16"] = "1:1"
    text_element: None = None  # NOT used in P4a; reserved for future


class CardImageContent(BaseModel):
    """Per-word content for the card-image LLM call.

    Populated from the enriched word row before CardWorker dispatches.
    """

    word: str
    translation: str
    language: str
    language_code: str
    pos: Optional[str] = None
    bridge_mnemonic: Optional[str] = None
    mnemonic: Optional[str] = None
    dominant_emotional_reading: Optional[str] = None
    composition_hint: Optional[str] = None
    treatment_hint: Optional[str] = None


class CardImagePayload(BaseModel):
    """Top-level payload for generate_card_image()."""

    content: CardImageContent
    card_image_style: str  # "Photorealistic" | "Editorial" | "Random" | custom freeform
    image_model: str = "zturbo"  # provider; configurable later via admin dashboard
    output_dir: str
    metadata: ImageMetadata

    @field_validator("image_model")
    @classmethod
    def validate_image_model(cls, v: str) -> str:
        v = v.lower()
        if v not in CARD_IMAGE_MODELS:
            raise ValueError(f"image_model must be one of {CARD_IMAGE_MODELS}, got '{v}'")
        return v


class CardImageResult(BaseModel):
    """Return value from generate_card_image()."""

    status: Literal["success", "failed"]
    image_path: Optional[str] = None  # absolute filesystem path on disk
    public_url: Optional[str] = None  # Supabase Storage public URL after upload
    image_prompt: Optional[CardImagePromptData] = None  # for debugging/logging
    error: Optional[ImageError] = None
