"""Pydantic models for the Resonance Orchestrator."""

from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# ─── Manifest models ───────────────────────────────────────────────────────────

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


# ─── API request/response models ───────────────────────────────────────────────

class ImportCSVRequest(BaseModel):
    batch_name: Optional[str] = None


class UpdateSettingsRequest(BaseModel):
    settings: dict[str, Any]


class SelectVersionRequest(BaseModel):
    version: str  # e.g. "standard_20260304T120000.json" for concept, folder for others


class RunStageRequest(BaseModel):
    stage: str  # concept | song | images | video | assembly | bookend
    word_slug: Optional[str] = None  # if None, use all words (autopilot)


class AutopilotRequest(BaseModel):
    word_slugs: Optional[list[str]] = None  # None = all words
    pause_at_song: bool = False


# ─── Engine payload models ─────────────────────────────────────────────────────

class EngineResponse(BaseModel):
    status: str  # "success" | "failed" | "partial"
    output_paths: list[str] = []
    error: Optional[dict[str, Any]] = None


# ─── UI state models ───────────────────────────────────────────────────────────

class StageStatus(BaseModel):
    stage: str
    status: str  # "empty" | "running" | "done" | "failed"
    version_count: int = 0
    selected_version: Optional[str] = None
    error: Optional[str] = None


class WordSummary(BaseModel):
    word_original: str
    word_slug: str
    translation: str
    language: str
    stages: dict[str, StageStatus]
    updated_at: str
    muted: bool = False
    approved: bool = False


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


class DefaultSettings(BaseModel):
    concept: dict[str, Any]
    song: dict[str, Any]
    images: dict[str, Any]
    video: dict[str, Any]
    assembly: dict[str, Any]
    bookend: dict[str, Any]
