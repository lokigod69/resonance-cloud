"""Pydantic models for the Resonance Orchestrator."""

from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# --- Manifest models ---------------------------------------------------

class Enrichment(BaseModel):
    pos: Optional[str] = None
    ipa: Optional[str] = None
    article: Optional[str] = None
    example: Optional[str] = None
    example_gloss: Optional[str] = None
    synonyms: Optional[str] = None
    etymology: Optional[str] = None
    mnemonic: Optional[str] = None
    tags: list[str] = []
    extra: dict[str, Any] = {}


class Selected(BaseModel):
    concept: Optional[str] = None
    song: Optional[str] = None
    images: Optional[str] = None
    video: Optional[str] = None
    final: Optional[str] = None
    bookend: Optional[str] = None


class LineageEntry(BaseModel):
    model_config = {"populate_by_name": True}

    stage: str
    version: str
    from_versions: dict[str, str] = Field(default={}, alias="from")
    settings_snapshot: dict[str, Any] = {}
    timestamp: str
    status: str


class Manifest(BaseModel):
    word_original: str
    word_slug: str
    translation: str
    language: str
    language_code: str
    created_at: str
    updated_at: str
    input_type: Literal["word", "phrase"] = "word"
    enrichment: Enrichment = Enrichment()
    selected: Selected = Selected()
    settings: dict[str, dict[str, Any]] = {
        "concept": {}, "song": {}, "images": {}, "video": {}, "assembly": {}, "bookend": {}
    }
    lineage: list[LineageEntry] = []
    muted: bool = False
    approved: bool = False


# --- Workspace / health models ------------------------------------------

class WorkspaceMeta(BaseModel):
    name: str
    created_at: str
    source_csv: Optional[str] = None
    word_count: int
    languages: list[str] = []
    language: Optional[str] = None
    workspace_version: str = "1.0"


class EngineHealthStatus(BaseModel):
    name: str
    port: int
    url: str
    reachable: bool
    last_checked: str
