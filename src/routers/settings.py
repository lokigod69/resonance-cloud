from __future__ import annotations

import json
import logging
from typing import Any, Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from .. import state
from ..presets import delete_preset, list_presets, load_preset, save_preset
from ..settings import load_defaults, save_defaults
from ..state import LORA_LIBRARY_PATH, WORKSPACE_ROOT
from ..voices import add_voice, delete_voice, load_voices, update_voice

logger = logging.getLogger(__name__)

router = APIRouter()


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


class PresetSaveRequest(BaseModel):
    name: str
    settings: dict[str, dict[str, Any]]


@router.get("/api/settings/defaults")
async def get_defaults():
    return load_defaults(state.WORKSPACE_PATH)


@router.put("/api/settings/defaults")
async def put_defaults(body: dict):
    save_defaults(state.WORKSPACE_PATH, body)
    return body


@router.get("/api/presets")
async def get_presets():
    return list_presets(WORKSPACE_ROOT)


@router.get("/api/presets/{slug}")
async def get_preset(slug: str):
    try:
        return load_preset(WORKSPACE_ROOT, slug)
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError:
        raise HTTPException(404, f"Preset not found: {slug}")


@router.post("/api/presets")
async def create_preset(body: PresetSaveRequest):
    try:
        return save_preset(WORKSPACE_ROOT, body.name, body.settings)
    except ValueError as e:
        raise HTTPException(400, str(e))


@router.delete("/api/presets/{slug}")
async def remove_preset(slug: str):
    try:
        delete_preset(WORKSPACE_ROOT, slug)
        return {"ok": True}
    except ValueError as e:
        raise HTTPException(400, str(e))
    except FileNotFoundError:
        raise HTTPException(404, f"Preset not found: {slug}")


@router.get("/api/voices")
async def list_voices():
    voices = load_voices(WORKSPACE_ROOT)
    voices.sort(key=lambda v: (v.get("language", ""), v.get("name", "")))
    return voices


@router.post("/api/voices")
async def create_voice(body: VoiceCreateRequest):
    voice = add_voice(WORKSPACE_ROOT, body.model_dump())
    return voice


@router.put("/api/voices/{voice_entry_id}")
async def edit_voice(voice_entry_id: str, body: VoiceUpdateRequest):
    try:
        return update_voice(WORKSPACE_ROOT, voice_entry_id, body.model_dump(exclude_none=True))
    except KeyError:
        raise HTTPException(404, f"Voice entry not found: {voice_entry_id}")


@router.delete("/api/voices/{voice_entry_id}")
async def remove_voice(voice_entry_id: str):
    try:
        delete_voice(WORKSPACE_ROOT, voice_entry_id)
        return {"ok": True}
    except KeyError:
        raise HTTPException(404, f"Voice entry not found: {voice_entry_id}")


@router.get("/api/loras")
async def list_loras():
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
