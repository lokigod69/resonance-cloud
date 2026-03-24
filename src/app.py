"""Resonance Orchestrator — FastAPI application."""

from __future__ import annotations
import asyncio
import json
import os
import re
import shutil
import glob as glob_module
from pathlib import Path
from typing import Any, Optional

from collections import Counter
from contextlib import asynccontextmanager

from fastapi import FastAPI, UploadFile, File, HTTPException, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv()

from .workspace import get_word_dir, list_word_dirs, read_workspace_meta
from .manifest import (
    read_manifest, write_manifest, update_selection,
    update_settings, get_stage_versions, now_iso, add_lineage, remove_version
)
from .settings import load_defaults, save_defaults, DEFAULT_SETTINGS
from .voices import load_voices, add_voice, update_voice, delete_voice
from .presets import (
    list_presets, load_preset, save_preset, delete_preset,
)
from .csv_import import import_csv
from .pipeline import run_stage, PipelineError, STAGE_ORDER, STAGE_DIR_MAP
from .dispatcher import check_all_engines, check_engine_health, call_engine, EngineUnreachableError
from .workspace import make_version_label, create_version_dir
from .slugify import slugify, language_to_code, SUPPORTED_LANGUAGES
from .workspace import create_word_folder, write_workspace_meta
from .manifest import create_manifest
from .models import (
    WorkspaceMeta, EngineHealthStatus, DefaultSettings
)

WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceWorkspace"))
WORKSPACE_PATH = Path(os.getenv("WORKSPACE_PATH", str(WORKSPACE_ROOT / "workspace")))

# Recent workspaces file lives in the orchestrator project directory
RECENTS_FILE = Path(__file__).resolve().parent.parent / "recent-workspaces.json"
MAX_RECENTS = 10


def _read_recents() -> list[str]:
    """Read the recent workspaces list from disk."""
    if not RECENTS_FILE.exists():
        return []
    try:
        data = json.loads(RECENTS_FILE.read_text(encoding="utf-8"))
        return data.get("recent", [])
    except (json.JSONDecodeError, OSError):
        return []


def _update_recents(path: str):
    """Prepend a workspace path to the recents list (dedup, truncate)."""
    recents = _read_recents()
    normalized = str(Path(path))
    recents = [normalized] + [r for r in recents if r != normalized]
    recents = recents[:MAX_RECENTS]
    RECENTS_FILE.write_text(json.dumps({"recent": recents}, indent=2), encoding="utf-8")


def _backfill_workspace_languages():
    """Startup backfill: detect primary language for existing workspaces missing it."""
    if not WORKSPACE_ROOT.exists():
        return
    for d in WORKSPACE_ROOT.iterdir():
        if not d.is_dir():
            continue
        meta_file = d / "workspace-meta.json"
        if not meta_file.exists():
            continue
        meta = read_workspace_meta(d)
        if meta is None or meta.language is not None:
            continue
        lang_counter: Counter[str] = Counter()
        for wd in list_word_dirs(d):
            try:
                m = read_manifest(wd)
                if m.language:
                    lang_counter[m.language] += 1
            except Exception:
                pass
        if lang_counter:
            meta.language = lang_counter.most_common(1)[0][0]
            write_workspace_meta(d, meta)


def _backfill_workspace_names():
    """Fix workspace display names that were set to CSV filenames instead of folder names."""
    if not WORKSPACE_ROOT.exists():
        return
    for d in WORKSPACE_ROOT.iterdir():
        if not d.is_dir():
            continue
        meta_file = d / "workspace-meta.json"
        if not meta_file.exists():
            continue
        meta = read_workspace_meta(d)
        if meta is None:
            continue
        if meta.name != d.name:
            meta.name = d.name
            write_workspace_meta(d, meta)


@asynccontextmanager
async def lifespan(app: FastAPI):
    _backfill_workspace_languages()
    _backfill_workspace_names()
    yield


app = FastAPI(title="Resonance Orchestrator", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://resonanz.pro",
        "https://www.resonanz.pro",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── Autopilot state (simple in-memory) ───────────────────────────────────────

autopilot_state = {
    "running": False,
    "cancelled": False,
    "progress": [],
    "current_word": None,
    "current_stage": None,
    "total": 0,
    "done": 0,
    "errors": [],
}

# ─── Word pipeline state (single-word autopilot) ─────────────────────────────

word_pipeline_state: dict[str, dict] = {}  # slug -> run state


# ─── Workspace ────────────────────────────────────────────────────────────────

@app.get("/api/workspace/info")
async def workspace_info():
    meta = read_workspace_meta(WORKSPACE_PATH)
    word_dirs = list_word_dirs(WORKSPACE_PATH)
    return {
        "path": str(WORKSPACE_PATH),
        "exists": WORKSPACE_PATH.exists(),
        "meta": meta.model_dump() if meta else None,
        "word_count": len(word_dirs),
    }


@app.post("/api/workspace/import")
async def import_words(
    file: UploadFile = File(...),
    batch_name: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
):
    content = (await file.read()).decode('utf-8-sig')  # handle BOM
    result = import_csv(
        workspace_path=WORKSPACE_PATH,
        csv_content=content,
        batch_name=batch_name,
        source_filename=file.filename or "import.csv",
        fallback_language=language,
    )
    return {
        "imported": result.imported,
        "skipped": result.skipped,
        "errors": result.errors,
        "total": result.total,
        "needs_language": result.needs_language,
    }


class CreateWorkspaceRequest(BaseModel):
    name: str
    language: str | None = None


class SwitchWorkspaceRequest(BaseModel):
    path: str


class RenameWorkspaceRequest(BaseModel):
    path: str
    new_name: str


class DeleteWorkspaceRequest(BaseModel):
    path: str

class OpenFolderRequest(BaseModel):
    path: str


@app.get("/api/workspaces")
async def list_workspaces():
    """List available workspace folders under WORKSPACE_ROOT."""
    workspaces = []
    if WORKSPACE_ROOT.exists():
        for d in sorted(WORKSPACE_ROOT.iterdir()):
            if not d.is_dir() or not (d / "workspace-meta.json").exists():
                continue
            meta = read_workspace_meta(d)
            word_dirs = list_word_dirs(d)
            word_count = len(word_dirs)
            approved_count = 0
            for wd in word_dirs:
                try:
                    m = read_manifest(wd)
                    if m.approved:
                        approved_count += 1
                except Exception:
                    pass
            workspaces.append({
                "name": d.name,
                "path": str(d),
                "word_count": word_count,
                "meta": meta.model_dump() if meta else None,
                "active": str(d) == str(WORKSPACE_PATH),
                "language": meta.language if meta else None,
                "approved_count": approved_count,
            })
    return workspaces


@app.post("/api/workspaces/create")
async def create_workspace(body: CreateWorkspaceRequest):
    """Create a new empty workspace folder."""
    global WORKSPACE_PATH
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "name required")
    # Sanitize name
    safe_name = "".join(c for c in name if c.isalnum() or c in '-_ ').strip()
    if not safe_name:
        raise HTTPException(400, "Invalid workspace name")

    new_path = WORKSPACE_ROOT / safe_name
    if new_path.exists():
        raise HTTPException(409, f"Workspace '{safe_name}' already exists")

    new_path.mkdir(parents=True)
    meta = WorkspaceMeta(
        name=safe_name,
        created_at=now_iso(),
        source_csv=None,
        word_count=0,
        languages=[body.language] if body.language else [],
        language=body.language,
    )
    write_workspace_meta(new_path, meta)
    WORKSPACE_PATH = new_path
    _update_recents(str(new_path))
    return {"ok": True, "path": str(new_path), "name": safe_name}


@app.post("/api/workspaces/switch")
async def switch_workspace(body: SwitchWorkspaceRequest):
    """Switch to a different workspace folder."""
    global WORKSPACE_PATH
    new_path = Path(body.path)
    if not new_path.exists():
        raise HTTPException(404, f"Workspace path not found: {body.path}")
    WORKSPACE_PATH = new_path
    _update_recents(str(new_path))
    return {"ok": True, "path": str(new_path)}


@app.post("/api/workspaces/rename")
async def rename_workspace(body: RenameWorkspaceRequest):
    """Rename a workspace folder."""
    global WORKSPACE_PATH
    old_path = Path(body.path)
    if not old_path.exists():
        raise HTTPException(404, f"Workspace not found: {body.path}")

    # Sanitize: strip, lowercase, replace spaces with underscores, keep only [a-z0-9_-]
    sanitized = body.new_name.strip().lower().replace(' ', '_')
    sanitized = re.sub(r'[^a-z0-9_-]', '', sanitized)
    if not sanitized:
        raise HTTPException(400, "Invalid workspace name after sanitization")

    new_path = old_path.parent / sanitized
    if new_path.exists():
        raise HTTPException(409, f"Workspace '{sanitized}' already exists")

    old_path.rename(new_path)

    # Update workspace-meta.json inside the renamed folder
    meta = read_workspace_meta(new_path)
    if meta:
        meta.name = sanitized
        write_workspace_meta(new_path, meta)

    # Update WORKSPACE_PATH if we just renamed the active workspace
    if str(old_path) == str(WORKSPACE_PATH):
        WORKSPACE_PATH = new_path

    # Update recents: replace old path with new path
    recents = _read_recents()
    old_normalized = str(old_path)
    if old_normalized in recents:
        recents = [str(new_path) if r == old_normalized else r for r in recents]
        RECENTS_FILE.write_text(json.dumps({"recent": recents}, indent=2), encoding="utf-8")

    return {"ok": True, "new_path": str(new_path), "new_name": sanitized}


@app.delete("/api/workspaces")
async def delete_workspace(body: DeleteWorkspaceRequest):
    """Delete a workspace folder."""
    target = Path(body.path)
    if not target.exists():
        raise HTTPException(404, f"Workspace not found: {body.path}")
    if not (target / "workspace-meta.json").exists():
        raise HTTPException(400, "Target folder is not a workspace (no workspace-meta.json)")
    if str(target) == str(WORKSPACE_PATH):
        raise HTTPException(400, "Cannot delete the active workspace. Switch to a different workspace first.")
    shutil.rmtree(target)

    # Remove from recents
    recents = _read_recents()
    target_normalized = str(target)
    if target_normalized in recents:
        recents = [r for r in recents if r != target_normalized]
        RECENTS_FILE.write_text(json.dumps({"recent": recents}, indent=2), encoding="utf-8")

    return {"ok": True}


@app.get("/api/workspaces/recent")
async def get_recent_workspaces():
    """Return enriched list of recently used workspaces."""
    recents = _read_recents()
    result = []
    for p in recents:
        ws_path = Path(p)
        if not ws_path.exists():
            continue
        meta = read_workspace_meta(ws_path)
        word_count = len(list(list_word_dirs(ws_path)))
        result.append({
            "path": str(ws_path),
            "name": meta.name if meta else ws_path.name,
            "language": meta.language if meta else None,
            "word_count": word_count,
        })
    # Clean stale entries from the file
    if len(result) < len(recents):
        RECENTS_FILE.write_text(
            json.dumps({"recent": [r["path"] for r in result]}, indent=2),
            encoding="utf-8",
        )
    return result


@app.post("/api/workspaces/open-folder")
async def open_workspace_folder(body: OpenFolderRequest):
    """Open an arbitrary folder as a workspace (must contain workspace-meta.json)."""
    global WORKSPACE_PATH
    folder = Path(body.path)
    if not folder.exists():
        raise HTTPException(404, f"Folder not found: {body.path}")
    if not folder.is_dir():
        raise HTTPException(400, f"Path is not a directory: {body.path}")
    if not (folder / "workspace-meta.json").exists():
        raise HTTPException(400, "Not a valid workspace folder — missing workspace-meta.json")
    WORKSPACE_PATH = folder
    _update_recents(str(folder))
    meta = read_workspace_meta(folder)
    return {
        "ok": True,
        "path": str(folder),
        "name": meta.name if meta else folder.name,
    }


# ─── Words ────────────────────────────────────────────────────────────────────

@app.get("/api/words")
async def list_words():
    """List all words with their pipeline status summary."""
    word_dirs = list_word_dirs(WORKSPACE_PATH)
    words = []
    for wd in word_dirs:
        try:
            m = read_manifest(wd)
            stages = _compute_stage_statuses(wd, m)
            words.append({
                "word_original": m.word_original,
                "word_slug": m.word_slug,
                "translation": m.translation,
                "language": m.language,
                "stages": stages,
                "updated_at": m.updated_at,
                "muted": m.muted,
                "approved": m.approved,
            })
        except Exception as e:
            words.append({"word_slug": wd.name, "error": str(e)})
    return words


@app.get("/api/words/{word_slug}")
async def get_word(word_slug: str):
    """Get full word details including manifest and stage versions."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")

    m = read_manifest(word_dir)
    stages_detail = _compute_stages_detail(word_dir, m)

    return {
        "manifest": m.model_dump(),
        "stages": stages_detail,
    }


@app.get("/api/words/{word_slug}/manifest")
async def get_manifest(word_slug: str):
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    m = read_manifest(word_dir)
    return m.model_dump()


@app.put("/api/words/{word_slug}/settings/{stage}")
async def put_word_settings(word_slug: str, stage: str, body: dict):
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404)
    m = update_settings(word_dir, stage, body)
    return {"ok": True, "settings": m.settings.get(stage, {})}


@app.get("/api/words/{word_slug}/settings/{stage}")
async def get_word_settings(word_slug: str, stage: str):
    """Return effective (merged), per-word overrides, and batch defaults for a stage."""
    from .settings import resolve_settings
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404)
    m = read_manifest(word_dir)
    defaults = load_defaults(WORKSPACE_PATH)
    overrides = m.settings.get(stage, {})
    effective = resolve_settings(stage, m.settings, defaults)
    return {
        "effective": effective,
        "overrides": overrides,
        "defaults": defaults.get(stage, {}),
    }


@app.delete("/api/words/{word_slug}/settings/{stage}")
async def delete_word_settings(word_slug: str, stage: str):
    """Clear all per-word overrides for a stage (reset to batch defaults)."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404)
    m = read_manifest(word_dir)
    if stage in m.settings:
        m.settings[stage] = {}
    write_manifest(word_dir, m)
    return {"ok": True}


@app.put("/api/words/{word_slug}/select/{stage}")
async def select_version(word_slug: str, stage: str, body: dict):
    version = body.get("version")
    if not version:
        raise HTTPException(400, "version required")
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404)
    m = update_selection(word_dir, stage, version)
    sel_field = 'final' if stage == 'assembly' else stage
    return {"ok": True, "selected": getattr(m.selected, sel_field, None)}


@app.get("/api/languages")
async def list_languages():
    """Return list of supported languages for dropdowns."""
    return SUPPORTED_LANGUAGES


# ─── LoRA library ─────────────────────────────────────────────────────────────

import logging
logger = logging.getLogger(__name__)

LORA_LIBRARY_PATH = Path(os.getenv("LORA_LIBRARY_PATH", "D:/CODING/RESONANCE/loras"))


@app.get("/api/loras")
async def list_loras():
    """List available LoRA adapters from the library."""
    loras = []
    if not LORA_LIBRARY_PATH.exists():
        return loras
    for entry in sorted(LORA_LIBRARY_PATH.iterdir()):
        if not entry.is_dir() or entry.name.startswith("_"):
            continue
        meta_file = entry / "metadata.json"
        if not meta_file.exists():
            continue
        try:
            meta = json.loads(meta_file.read_text(encoding="utf-8"))
        except Exception:
            logger.warning(f"Skipping malformed metadata: {meta_file}")
            continue
        # Discover checkpoints from filesystem
        checkpoints = []
        for cp_dir in sorted(entry.iterdir()):
            if cp_dir.is_dir() and cp_dir.name.startswith("epoch_"):
                if (cp_dir / "adapter_model.safetensors").exists():
                    checkpoints.append(cp_dir.name)
        if not checkpoints:
            continue
        inf = meta.get("inference_defaults", {})
        lang = meta.get("language", {})
        voice = meta.get("voice", {})
        trigger = meta.get("trigger", {})
        loras.append({
            "id": meta.get("lora_id", entry.name),
            "display_name": meta.get("display_name", entry.name),
            "language_code": lang.get("code", ""),
            "language_name": lang.get("name", ""),
            "trigger_phrase": trigger.get("phrase", ""),
            "recommended_strength": inf.get("recommended_strength", 0.4),
            "strength_range": inf.get("strength_range", [0.2, 0.8]),
            "recommended_checkpoint": inf.get("checkpoint", checkpoints[-1]),
            "checkpoints": checkpoints,
            "gender": voice.get("gender", ""),
            "base_path": str(entry),
        })
    loras.sort(key=lambda x: (x["language_code"], x["display_name"]))
    return loras


# ─── Voice registry ───────────────────────────────────────────────────────────

class VoiceCreateRequest(BaseModel):
    voice_id: str
    name: str
    language: str = ""
    notes: str = ""

class VoiceUpdateRequest(BaseModel):
    voice_id: Optional[str] = None
    name: Optional[str] = None
    language: Optional[str] = None
    notes: Optional[str] = None


@app.get("/api/voices")
async def list_voices():
    """List all saved voices, sorted by language then name."""
    voices = load_voices(WORKSPACE_ROOT)
    voices.sort(key=lambda v: (v.get("language", ""), v.get("name", "")))
    return voices


@app.post("/api/voices")
async def create_voice(body: VoiceCreateRequest):
    """Add a new voice to the registry."""
    voice = add_voice(WORKSPACE_ROOT, body.model_dump())
    return voice


@app.put("/api/voices/{voice_entry_id}")
async def edit_voice(voice_entry_id: str, body: VoiceUpdateRequest):
    """Update a voice registry entry."""
    try:
        return update_voice(WORKSPACE_ROOT, voice_entry_id, body.model_dump(exclude_none=True))
    except KeyError:
        raise HTTPException(404, f"Voice entry not found: {voice_entry_id}")


@app.delete("/api/voices/{voice_entry_id}")
async def remove_voice(voice_entry_id: str):
    """Remove a voice from the registry."""
    try:
        delete_voice(WORKSPACE_ROOT, voice_entry_id)
        return {"ok": True}
    except KeyError:
        raise HTTPException(404, f"Voice entry not found: {voice_entry_id}")


# ─── Settings presets ─────────────────────────────────────────────────────────

class PresetSaveRequest(BaseModel):
    name: str
    settings: dict[str, dict[str, Any]]


@app.get("/api/presets")
async def get_presets():
    """List all saved settings presets."""
    return list_presets(WORKSPACE_ROOT)


@app.get("/api/presets/{slug}")
async def get_preset(slug: str):
    """Load a settings preset (merged with defaults for schema drift)."""
    try:
        return load_preset(WORKSPACE_ROOT, slug)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError:
        raise HTTPException(404, f"Preset not found: {slug}")


@app.post("/api/presets")
async def create_preset(body: PresetSaveRequest):
    """Save current batch settings as a named preset."""
    try:
        return save_preset(WORKSPACE_ROOT, body.name, body.settings)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.delete("/api/presets/{slug}")
async def remove_preset(slug: str):
    """Delete a settings preset."""
    try:
        delete_preset(WORKSPACE_ROOT, slug)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError:
        raise HTTPException(404, f"Preset not found: {slug}")


class AddWordRequest(BaseModel):
    word: str
    translation: str
    language: str
    mnemonic: Optional[str] = None
    etymology: Optional[str] = None
    example: Optional[str] = None
    tags: Optional[str] = None


@app.post("/api/words")
async def add_word(body: AddWordRequest):
    """Add a single word manually."""
    word = body.word.strip()
    translation = body.translation.strip()
    language = body.language.strip()

    if not word or not translation or not language:
        raise HTTPException(400, "word, translation, and language are required")

    word_slug = slugify(word)
    lang_code = language_to_code(language)
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)

    if (word_dir / 'manifest.json').exists():
        raise HTTPException(409, f"Word '{word}' already exists as '{word_slug}'")

    enrichment = {}
    if body.mnemonic:
        enrichment['mnemonic'] = body.mnemonic
    if body.etymology:
        enrichment['etymology'] = body.etymology
    if body.example:
        enrichment['example'] = body.example
    if body.tags:
        enrichment['tags'] = body.tags

    create_word_folder(WORKSPACE_PATH, word_slug)
    create_manifest(
        word_dir=word_dir,
        word_original=word,
        word_slug=word_slug,
        translation=translation,
        language=language,
        language_code=lang_code,
        enrichment_data=enrichment if enrichment else None,
    )

    return {"ok": True, "word_slug": word_slug}


@app.delete("/api/words/{word_slug}")
async def delete_word(word_slug: str):
    """Delete a word and all its generated content."""
    import shutil
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not word_dir.exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    shutil.rmtree(word_dir)
    return {"ok": True, "deleted": word_slug}


# ─── Mute/unmute ──────────────────────────────────────────────────────────────

@app.post("/api/words/{word_slug}/mute")
async def toggle_mute(word_slug: str, body: dict):
    """Set muted state for a single word."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    m = read_manifest(word_dir)
    m.muted = bool(body.get("muted", False))
    m.updated_at = now_iso()
    write_manifest(word_dir, m)
    return {"ok": True}


@app.post("/api/words/mute-all")
async def mute_all(body: dict):
    """Set muted state for all words."""
    muted = bool(body.get("muted", False))
    word_dirs = list_word_dirs(WORKSPACE_PATH)
    count = 0
    for wd in word_dirs:
        if (wd / 'manifest.json').exists():
            m = read_manifest(wd)
            m.muted = muted
            m.updated_at = now_iso()
            write_manifest(wd, m)
            count += 1
    return {"ok": True, "count": count}


@app.put("/api/words/{word_slug}/approve")
async def toggle_approve(word_slug: str):
    """Toggle approved state. Approving requires all stages to have selections."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    m = read_manifest(word_dir)

    if m.approved:
        m.approved = False
        write_manifest(word_dir, m)
        return {"ok": True, "approved": False}

    # Check if bookend is enabled
    defaults = load_defaults(WORKSPACE_PATH)
    bookend_defaults = defaults.get('bookend', {})
    bookend_word = m.settings.get('bookend', {})
    bookend_enabled = {**bookend_defaults, **bookend_word}.get('enabled', True)

    # Validate all stages have selections before approving
    required_stages = [
        ('concept', 'concept'), ('song', 'song'), ('images', 'images'),
        ('video', 'video'), ('assembly', 'final'),
    ]
    if bookend_enabled:
        required_stages.append(('bookend', 'bookend'))

    missing = []
    for stage_name, field_name in required_stages:
        if not getattr(m.selected, field_name):
            missing.append(stage_name)

    if missing:
        raise HTTPException(
            400,
            f"Cannot approve: missing selections for {', '.join(missing)}"
        )

    m.approved = True
    write_manifest(word_dir, m)
    return {"ok": True, "approved": True}


# ─── Stage execution ──────────────────────────────────────────────────────────

@app.post("/api/words/{word_slug}/run/{stage}")
async def run_word_stage(word_slug: str, stage: str):
    """Run a pipeline stage for a specific word."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")
    try:
        result = await run_stage(WORKSPACE_PATH, word_slug, stage)
        return result
    except PipelineError as e:
        raise HTTPException(400, str(e))
    except Exception as e:
        raise HTTPException(500, str(e))


# ─── Stage file management ─────────────────────────────────────────────────────

@app.delete("/api/words/{word_slug}/images/{version}/{filename}")
async def delete_image(word_slug: str, version: str, filename: str):
    """Delete a specific image from an image set."""
    img_path = get_word_dir(WORKSPACE_PATH, word_slug) / "images" / version / filename
    if not img_path.exists():
        raise HTTPException(404, "Image not found")
    if not img_path.suffix.lower() in ('.png', '.jpg', '.jpeg', '.webp'):
        raise HTTPException(400, "Not an image file")
    img_path.unlink()
    return {"ok": True, "deleted": filename}


@app.delete("/api/words/{word_slug}/versions/{stage}/{version:path}")
async def delete_version(word_slug: str, stage: str, version: str):
    """Delete a generation run (version folder) and remove from manifest."""
    import shutil
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    stage_folder = STAGE_DIR_MAP.get(stage, stage)
    version_path = word_dir / stage_folder / version
    if not version_path.exists():
        raise HTTPException(404, "Version not found")
    try:
        if version_path.is_dir():
            shutil.rmtree(version_path)
        else:
            version_path.unlink()
        remove_version(word_dir, stage, version)
    except Exception as e:
        raise HTTPException(500, str(e))
    return {"ok": True, "deleted": version}


@app.get("/api/words/{word_slug}/concept/{version}")
async def get_concept_artifact(word_slug: str, version: str):
    """Read a concept artifact JSON."""
    path = get_word_dir(WORKSPACE_PATH, word_slug) / "concept" / version
    if not path.exists():
        raise HTTPException(404)
    with open(path, 'r', encoding='utf-8') as f:
        return json.load(f)


@app.put("/api/words/{word_slug}/concept/{version}")
async def save_concept_edit(word_slug: str, version: str, body: dict):
    """Save an edited concept as a new version."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    original_path = word_dir / "concept" / version

    if not original_path.exists():
        raise HTTPException(404, "Original concept not found")

    # Read original
    with open(original_path, 'r', encoding='utf-8') as f:
        original = json.load(f)

    # Merge edits
    original.update({k: v for k, v in body.items() if k in ('lyrics', 'music_caption', 'visual_hint')})

    # Save as new version with -edit suffix
    base = version.replace('.json', '')
    ts = now_iso().replace(':', '').replace('-', '').replace('Z', '').replace('T', 'T')
    new_name = f"{base}-edit_{ts[:15]}.json"
    new_path = word_dir / "concept" / new_name

    with open(new_path, 'w', encoding='utf-8') as f:
        json.dump(original, f, indent=2, ensure_ascii=False)

    # Add lineage entry
    add_lineage(word_dir, 'concept', new_name, {"edited_from": version}, {}, 'success')

    return {"ok": True, "new_version": new_name}


# ─── Assembly trim ───────────────────────────────────────────────────────────

class TrimRequest(BaseModel):
    source_version: str
    trim_start: float
    trim_end: float


@app.post("/api/words/{word_slug}/trim/assembly")
async def trim_assembly(word_slug: str, body: TrimRequest):
    """Trim an existing assembly take via the Assembly Engine's /trim endpoint."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)

    # Resolve source file
    stage_dir = word_dir / "final"
    source_file = stage_dir / body.source_version / "final.mp4"
    if not source_file.exists():
        raise HTTPException(404, f"Source file not found: {body.source_version}/final.mp4")

    # Validate trim points
    if body.trim_start < 0:
        raise HTTPException(400, "trim_start must be >= 0")
    if body.trim_end <= body.trim_start:
        raise HTTPException(400, "trim_end must be greater than trim_start")
    if body.trim_end - body.trim_start < 1.0:
        raise HTTPException(400, "Trimmed duration must be at least 1 second")

    # Create output directory using existing version label logic
    label = make_version_label('assembly', {"assembly_mode": "trim"}, stage_dir)
    output_dir, version_name = create_version_dir(stage_dir, label)

    # Read manifest for metadata
    manifest = read_manifest(word_dir)

    # Build engine payload
    payload = {
        "source_path": str(source_file),
        "trim_start": body.trim_start,
        "trim_end": body.trim_end,
        "output_dir": str(output_dir),
        "settings": {
            "video_codec": "libx264",
            "video_preset": "slow",
            "video_crf": 18,
            "audio_codec": "aac",
            "audio_bitrate": "320k",
        },
        "metadata": {
            "word": manifest.word_original,
            "language": manifest.language,
            "translation": manifest.translation,
            "timestamp": now_iso(),
            "source_version": body.source_version,
        },
    }

    # Call Assembly Engine /trim endpoint
    try:
        result = await call_engine('assembly', payload, endpoint="/trim")
    except EngineUnreachableError as e:
        raise HTTPException(503, str(e))
    except TimeoutError as e:
        raise HTTPException(504, str(e))

    status = result.get("status", "failed")

    # Update lineage
    from_versions = {"trimmed_from": body.source_version}
    settings_snapshot = {"trim_start": body.trim_start, "trim_end": body.trim_end}
    add_lineage(word_dir, 'assembly', version_name, from_versions, settings_snapshot, status)

    # Auto-select on success
    if status == "success":
        update_selection(word_dir, 'assembly', version_name)

    return {"stage": "assembly", "version": version_name, "result": result}


# ─── Settings defaults ────────────────────────────────────────────────────────

@app.get("/api/settings/defaults")
async def get_defaults():
    return load_defaults(WORKSPACE_PATH)


@app.put("/api/settings/defaults")
async def put_defaults(body: dict):
    save_defaults(WORKSPACE_PATH, body)
    return body


# ─── Engine health ────────────────────────────────────────────────────────────

@app.get("/api/engines/health")
async def engines_health():
    statuses = await check_all_engines()
    return [s.model_dump() for s in statuses]


@app.get("/api/engines/{engine}/health")
async def engine_health(engine: str):
    status = await check_engine_health(engine)
    return status.model_dump()


# ─── Autopilot ───────────────────────────────────────────────────────────────

@app.post("/api/autopilot/run")
async def start_autopilot(body: dict):
    global autopilot_state
    if autopilot_state["running"]:
        raise HTTPException(409, "Autopilot already running")
    if any(s.get("running") for s in word_pipeline_state.values()):
        raise HTTPException(409, "A word pipeline is running — wait for it to finish")

    word_slugs = body.get("word_slugs")
    pause_at_song = body.get("pause_at_song", False)

    if not word_slugs:
        word_dirs = list_word_dirs(WORKSPACE_PATH)
        word_slugs = [wd.name for wd in word_dirs]

    # Filter out muted words
    filtered = []
    for s in word_slugs:
        wd = get_word_dir(WORKSPACE_PATH, s)
        if (wd / 'manifest.json').exists():
            m = read_manifest(wd)
            if not m.muted:
                filtered.append(s)
        else:
            filtered.append(s)  # keep non-manifest slugs for error reporting
    word_slugs = filtered

    if not word_slugs:
        return JSONResponse(
            {"error": "All words are muted. Unmute some words before running."},
            status_code=400,
        )

    autopilot_state = {
        "running": True,
        "cancelled": False,
        "progress": [],
        "current_word": None,
        "current_stage": None,
        "total": len(word_slugs),
        "done": 0,
        "errors": [],
        "pause_at_song": pause_at_song,
        "paused_for_song_selection": False,
        "paused_word": None,
    }

    asyncio.create_task(_run_autopilot(word_slugs))
    return {"ok": True, "word_count": len(word_slugs)}


@app.post("/api/autopilot/cancel")
async def cancel_autopilot():
    autopilot_state["cancelled"] = True
    return {"ok": True}


@app.post("/api/autopilot/resume")
async def resume_autopilot():
    """Resume from song selection pause."""
    autopilot_state["paused_for_song_selection"] = False
    return {"ok": True}


@app.get("/api/autopilot/status")
async def autopilot_status():
    return autopilot_state


async def _run_autopilot(word_slugs: list[str]):
    global autopilot_state
    try:
        for slug in word_slugs:
            if autopilot_state["cancelled"]:
                break

            autopilot_state["current_word"] = slug
            word_dir = get_word_dir(WORKSPACE_PATH, slug)

            if not (word_dir / 'manifest.json').exists():
                autopilot_state["errors"].append(f"{slug}: no manifest")
                autopilot_state["done"] += 1
                continue

            m = read_manifest(word_dir)
            stages_to_run = _get_incomplete_stages(word_dir, m)

            word_errors = []
            for stage in stages_to_run:
                if autopilot_state["cancelled"]:
                    break

                # Pause at song stage if configured
                if stage == 'song' and autopilot_state.get("pause_at_song"):
                    autopilot_state["paused_for_song_selection"] = True
                    autopilot_state["paused_word"] = slug
                    while autopilot_state.get("paused_for_song_selection") and not autopilot_state["cancelled"]:
                        await asyncio.sleep(1)
                    if autopilot_state["cancelled"]:
                        break
                    # Re-read manifest to see if user selected something
                    m = read_manifest(word_dir)
                    if m.selected.song:
                        continue  # User already selected, skip running song

                autopilot_state["current_stage"] = stage
                msg = f"{slug}: running {stage}..."
                autopilot_state["progress"].append(msg)

                try:
                    await run_stage(WORKSPACE_PATH, slug, stage)
                except Exception as e:
                    err = f"{slug}/{stage}: {e}"
                    autopilot_state["errors"].append(err)
                    autopilot_state["progress"].append(f"  ✗ {err}")
                    word_errors.append(stage)
                    break  # Stop processing this word on error

                autopilot_state["progress"].append(f"  ✓ {slug}/{stage} done")

            autopilot_state["done"] += 1

    finally:
        autopilot_state["running"] = False
        autopilot_state["current_word"] = None
        autopilot_state["current_stage"] = None


def _get_incomplete_stages(word_dir: Path, m: Any) -> list[str]:
    """Return stages that haven't been successfully completed."""
    # Check if bookend is enabled
    defaults = load_defaults(word_dir.parent)
    bookend_defaults = defaults.get('bookend', {})
    bookend_word = m.settings.get('bookend', {})
    bookend_enabled = {**bookend_defaults, **bookend_word}.get('enabled', True)

    stages = []
    for stage in STAGE_ORDER:
        if stage == 'bookend' and not bookend_enabled:
            continue
        sel = getattr(m.selected, 'final' if stage == 'assembly' else stage, None)
        if sel is None:
            stages.append(stage)
    return stages


# ─── Word Pipeline (single-word autopilot) ───────────────────────────────────

class RunWordPipelineRequest(BaseModel):
    start_from: Optional[str] = None


@app.post("/api/words/{word_slug}/pipeline/start")
async def start_word_pipeline(word_slug: str, body: RunWordPipelineRequest = RunWordPipelineRequest()):
    """Start full pipeline for a single word as a background task."""
    if autopilot_state["running"]:
        raise HTTPException(409, "Batch autopilot is running — wait for it to finish")
    if word_pipeline_state.get(word_slug, {}).get("running"):
        raise HTTPException(409, "Pipeline already running for this word")

    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    if not (word_dir / 'manifest.json').exists():
        raise HTTPException(404, f"Word '{word_slug}' not found")

    m = read_manifest(word_dir)

    if body.start_from and body.start_from in STAGE_ORDER:
        idx = STAGE_ORDER.index(body.start_from)
        stages = STAGE_ORDER[idx:]
    else:
        stages = _get_incomplete_stages(word_dir, m)

    if not stages:
        return {"ok": True, "stages": [], "message": "All stages already complete"}

    word_pipeline_state[word_slug] = {
        "running": True,
        "cancelled": False,
        "current_stage": None,
        "completed_stages": [],
        "stages_remaining": list(stages),
        "paused_for_song": False,
        "error": None,
        "progress": [],
    }

    asyncio.create_task(_run_word_pipeline(word_slug))
    return {"ok": True, "stages": stages}


@app.get("/api/words/{word_slug}/pipeline/status")
async def get_word_pipeline_status(word_slug: str):
    return word_pipeline_state.get(word_slug, {"running": False})


@app.post("/api/words/{word_slug}/pipeline/cancel")
async def cancel_word_pipeline(word_slug: str):
    if word_slug in word_pipeline_state:
        word_pipeline_state[word_slug]["cancelled"] = True
        word_pipeline_state[word_slug]["paused_for_song"] = False  # wake pause loop
    return {"ok": True}


@app.post("/api/words/{word_slug}/pipeline/resume")
async def resume_word_pipeline(word_slug: str):
    """Resume pipeline after song take selection."""
    if word_slug in word_pipeline_state:
        word_pipeline_state[word_slug]["paused_for_song"] = False
    return {"ok": True}


async def _run_word_pipeline(word_slug: str):
    """Background task: run pipeline stages sequentially for one word."""
    from .settings import resolve_settings

    state = word_pipeline_state[word_slug]
    try:
        word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
        stages = list(state["stages_remaining"])

        for stage in stages:
            if state["cancelled"]:
                state["progress"].append("Cancelled")
                break

            state["current_stage"] = stage
            state["progress"].append(f"Running {stage}...")

            try:
                await run_stage(WORKSPACE_PATH, word_slug, stage)
            except Exception as e:
                state["error"] = {"stage": stage, "message": str(e)}
                state["progress"].append(f"Failed at {stage}: {e}")
                break

            state["completed_stages"].append(stage)
            state["progress"].append(f"{stage} done")

            # Song pause: check if multiple takes were produced
            if stage == "song":
                m = read_manifest(word_dir)
                defaults = load_defaults(WORKSPACE_PATH)
                song_settings = resolve_settings("song", m.settings, defaults)
                batch_size = song_settings.get("batch_size", 1)

                if batch_size > 1:
                    # Check actual take count in latest song version
                    songs_dir = word_dir / "songs"
                    if songs_dir.exists():
                        version_dirs = sorted([d for d in songs_dir.iterdir() if d.is_dir()])
                        if version_dirs:
                            latest = version_dirs[-1]
                            takes = list(latest.glob("*.flac")) + list(latest.glob("*.wav")) + list(latest.glob("*.mp3"))
                            if len(takes) > 1:
                                state["paused_for_song"] = True
                                state["progress"].append("Paused: select a song take, then continue")
                                while state["paused_for_song"] and not state["cancelled"]:
                                    await asyncio.sleep(1)
                                if state["cancelled"]:
                                    state["progress"].append("Cancelled")
                                    break

        # Mark completed if we got through all stages without error
        if not state["error"] and not state["cancelled"]:
            state["progress"].append("Pipeline complete")

    finally:
        state["running"] = False
        state["current_stage"] = None


# ─── Generation metadata ──────────────────────────────────────────────────────

@app.get("/api/words/{word_slug}/stages/{stage}/{version}/meta")
async def get_generation_meta(word_slug: str, stage: str, version: str):
    """Read generation-meta.json from any stage's version folder."""
    word_dir = get_word_dir(WORKSPACE_PATH, word_slug)
    stage_folder = STAGE_DIR_MAP.get(stage, stage)
    meta_path = word_dir / stage_folder / version / "generation-meta.json"
    if not meta_path.exists():
        return {"meta": None}
    with open(meta_path) as f:
        return {"meta": json.load(f)}


# ─── Media file serving ───────────────────────────────────────────────────────

@app.get("/api/media/ws/{workspace_name}/{word_slug}/{rest_path:path}")
async def serve_media_workspace(workspace_name: str, word_slug: str, rest_path: str):
    """Serve files from a specific workspace (for cross-workspace views)."""
    ws_path = WORKSPACE_ROOT / workspace_name
    if not (ws_path / "workspace-meta.json").exists():
        raise HTTPException(404, f"Workspace '{workspace_name}' not found")
    file_path = ws_path / word_slug / rest_path
    # Prevent path traversal
    try:
        file_path.resolve().relative_to(ws_path.resolve())
    except ValueError:
        raise HTTPException(400, "Invalid path")
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(file_path))


@app.get("/api/media/{word_slug}/{rest_path:path}")
async def serve_media(word_slug: str, rest_path: str):
    """Serve workspace files (audio, images, video) for the UI."""
    file_path = get_word_dir(WORKSPACE_PATH, word_slug) / rest_path
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(file_path))


# ─── Stage detail helpers ──────────────────────────────────────────────────────

def _compute_stage_statuses(word_dir: Path, m: Any) -> dict:
    statuses = {}
    stage_map = {
        'concept': ('concept', m.selected.concept),
        'song':    ('songs', m.selected.song),
        'images':  ('images', m.selected.images),
        'video':   ('videos', m.selected.video),
        'final':   ('final', m.selected.final),
        'bookend': ('bookend', m.selected.bookend),
    }
    for stage, (folder, selected) in stage_map.items():
        stage_dir = word_dir / folder
        if stage == 'concept':
            versions = list(stage_dir.glob('*.json')) if stage_dir.exists() else []
            versions = [v for v in versions if v.name != 'generation-meta.json']
        else:
            versions = [d for d in stage_dir.iterdir() if d.is_dir()] if stage_dir.exists() else []

        # Check for failures in lineage
        failed = any(e.stage == stage and e.status == 'failed' for e in m.lineage)
        has_success = any(e.stage == stage and e.status == 'success' for e in m.lineage)

        if selected:
            status = "done"
        elif has_success and not selected:
            status = "pending_selection"
        elif failed and not versions:
            status = "failed"
        elif versions:
            status = "pending_selection"
        else:
            status = "empty"

        statuses[stage] = {
            "status": status,
            "version_count": len(versions),
            "selected": selected,
        }
    return statuses


def _compute_stages_detail(word_dir: Path, m: Any) -> dict:
    detail = {}
    # Build version→status lookup from lineage (last entry wins for duplicates)
    lineage_status: dict[str, str] = {}
    for entry in m.lineage:
        lineage_status[entry.version] = entry.status

    # Concept versions
    concept_dir = word_dir / "concept"
    concept_versions = []
    if concept_dir.exists():
        for f in sorted(concept_dir.glob('*.json')):
            if f.name != 'generation-meta.json':
                concept_versions.append({
                    "name": f.name,
                    "selected": m.selected.concept == f.name,
                    "status": lineage_status.get(f.name, "unknown"),
                })
    detail['concept'] = {"versions": concept_versions, "selected": m.selected.concept}

    # Song versions
    songs_dir = word_dir / "songs"
    song_versions = []
    if songs_dir.exists():
        for vdir in sorted(songs_dir.iterdir()):
            if vdir.is_dir():
                takes = sorted([f.name for f in vdir.glob('*.flac')] +
                               [f.name for f in vdir.glob('*.wav')] +
                               [f.name for f in vdir.glob('*.mp3')])
                song_versions.append({
                    "version": vdir.name,
                    "takes": takes,
                    "selected": m.selected.song and m.selected.song.startswith(vdir.name),
                    "selected_take": m.selected.song,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail['song'] = {"versions": song_versions, "selected": m.selected.song}

    # Image versions
    images_dir = word_dir / "images"
    image_versions = []
    if images_dir.exists():
        for vdir in sorted(images_dir.iterdir()):
            if vdir.is_dir():
                images = sorted([f.name for f in vdir.glob('*.png')] +
                                [f.name for f in vdir.glob('*.jpg')])
                storyboard = None
                sb_file = vdir / "storyboard.json"
                if sb_file.exists():
                    with open(sb_file, 'r') as f:
                        try:
                            storyboard = json.load(f)
                        except Exception:
                            pass
                image_versions.append({
                    "version": vdir.name,
                    "images": images,
                    "storyboard": storyboard,
                    "selected": m.selected.images == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail['images'] = {"versions": image_versions, "selected": m.selected.images}

    # Video versions
    videos_dir = word_dir / "videos"
    video_versions = []
    if videos_dir.exists():
        for vdir in sorted(videos_dir.iterdir()):
            if vdir.is_dir():
                clips = sorted([f.name for f in vdir.glob('scene_*.mp4')])
                thumbs = sorted([f.name for f in vdir.glob('scene_*_thumb.jpg')])
                video_versions.append({
                    "version": vdir.name,
                    "clips": clips,
                    "thumbnails": thumbs,
                    "selected": m.selected.video == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail['video'] = {"versions": video_versions, "selected": m.selected.video}

    # Final versions
    final_dir = word_dir / "final"
    final_versions = []
    if final_dir.exists():
        for vdir in sorted(final_dir.iterdir()):
            if vdir.is_dir():
                mp4s = sorted([f.name for f in vdir.glob('*.mp4')])
                final_versions.append({
                    "version": vdir.name,
                    "files": mp4s,
                    "selected": m.selected.final == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail['final'] = {"versions": final_versions, "selected": m.selected.final}

    # Bookend versions
    bookend_dir = word_dir / "bookend"
    bookend_versions = []
    if bookend_dir.exists():
        for vdir in sorted(bookend_dir.iterdir()):
            if vdir.is_dir():
                mp4s = sorted([f.name for f in vdir.glob('*.mp4')])
                bookend_versions.append({
                    "version": vdir.name,
                    "files": mp4s,
                    "selected": m.selected.bookend == vdir.name,
                    "status": lineage_status.get(vdir.name, "unknown"),
                })
    detail['bookend'] = {"versions": bookend_versions, "selected": m.selected.bookend}

    return detail


# ─── Serve React frontend ─────────────────────────────────────────────────────

frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        index = frontend_dist / "index.html"
        if index.exists():
            return FileResponse(str(index))
        return JSONResponse({"error": "Frontend not built"}, status_code=404)
