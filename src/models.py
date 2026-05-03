"""Pydantic models for the Resonance Orchestrator."""

from __future__ import annotations
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field


# --- Manifest models ---------------------------------------------------

class Enrichment(BaseModel):
    word_target: Optional[str] = ""
    translation: Optional[str] = ""
    bridge_mnemonic: Optional[str] = ""
    etymology: Optional[str] = ""
    pos: Optional[str] = ""
    article: Optional[str] = ""
    ipa: Optional[str] = ""
    example: Optional[str] = ""
    example_gloss: Optional[str] = ""
    synonyms: Optional[str] = ""
    tags: Optional[str] = ""
    mnemonic: Optional[str] = ""
    dominant_emotional_reading: Optional[str] = None
    composition_hint: Optional[str] = None
    treatment_hint: Optional[str] = None
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
    # Observability identity — populated by the cloud worker (feeder.py) from the
    # Supabase word record. Null in non-cloud code paths (router-created manifests).
    # Keys: word_id, deck_id, user_id, job_id (all str | None) and attempt (int | None).
    identity: Optional[dict[str, Any]] = None


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
