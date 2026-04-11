from __future__ import annotations

import json
import re
import shutil
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, File, Form, HTTPException, UploadFile
from pydantic import BaseModel

from .. import state
from ..csv_import import import_csv
from ..manifest import now_iso, read_manifest
from ..models import WorkspaceMeta
from ..state import RECENTS_FILE, WORKSPACE_ROOT
from ..workspace import list_word_dirs, read_workspace_meta, write_workspace_meta

router = APIRouter()

MAX_RECENTS = 10


def _read_recents() -> list[str]:
    if not RECENTS_FILE.exists():
        return []
    try:
        data = json.loads(RECENTS_FILE.read_text(encoding="utf-8"))
        return data.get("recent", [])
    except (json.JSONDecodeError, OSError):
        return []


def _update_recents(path: str):
    recents = _read_recents()
    normalized = str(Path(path))
    recents = [normalized] + [r for r in recents if r != normalized]
    recents = recents[:MAX_RECENTS]
    RECENTS_FILE.write_text(json.dumps({"recent": recents}, indent=2), encoding="utf-8")


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


@router.get("/api/workspace/info")
async def workspace_info():
    meta = read_workspace_meta(state.WORKSPACE_PATH)
    word_dirs = list_word_dirs(state.WORKSPACE_PATH)
    return {
        "path": str(state.WORKSPACE_PATH),
        "exists": state.WORKSPACE_PATH.exists(),
        "meta": meta.model_dump() if meta else None,
        "word_count": len(word_dirs),
    }


@router.post("/api/workspace/import")
async def import_words(
    file: UploadFile = File(...),
    batch_name: Optional[str] = Form(None),
    language: Optional[str] = Form(None),
):
    content = (await file.read()).decode("utf-8-sig")
    result = import_csv(
        workspace_path=state.WORKSPACE_PATH,
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


@router.get("/api/workspaces")
async def list_workspaces():
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
                "active": str(d) == str(state.WORKSPACE_PATH),
                "language": meta.language if meta else None,
                "approved_count": approved_count,
            })
    return workspaces


@router.post("/api/workspaces/create")
async def create_workspace(body: CreateWorkspaceRequest):
    name = body.name.strip()
    if not name:
        raise HTTPException(400, "name required")
    safe_name = "".join(c for c in name if c.isalnum() or c in "-_ ").strip()
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
    state.WORKSPACE_PATH = new_path
    _update_recents(str(new_path))
    return {"ok": True, "path": str(new_path), "name": safe_name}


@router.post("/api/workspaces/switch")
async def switch_workspace(body: SwitchWorkspaceRequest):
    new_path = Path(body.path)
    if not new_path.exists():
        raise HTTPException(404, f"Workspace path not found: {body.path}")
    state.WORKSPACE_PATH = new_path
    _update_recents(str(new_path))
    return {"ok": True, "path": str(new_path)}


@router.post("/api/workspaces/rename")
async def rename_workspace(body: RenameWorkspaceRequest):
    old_path = Path(body.path)
    if not old_path.exists():
        raise HTTPException(404, f"Workspace not found: {body.path}")

    sanitized = body.new_name.strip().lower().replace(" ", "_")
    sanitized = re.sub(r"[^a-z0-9_-]", "", sanitized)
    if not sanitized:
        raise HTTPException(400, "Invalid workspace name after sanitization")

    new_path = old_path.parent / sanitized
    if new_path.exists():
        raise HTTPException(409, f"Workspace '{sanitized}' already exists")

    old_path.rename(new_path)

    meta = read_workspace_meta(new_path)
    if meta:
        meta.name = sanitized
        write_workspace_meta(new_path, meta)

    if str(old_path) == str(state.WORKSPACE_PATH):
        state.WORKSPACE_PATH = new_path

    recents = _read_recents()
    old_normalized = str(old_path)
    if old_normalized in recents:
        recents = [str(new_path) if r == old_normalized else r for r in recents]
        RECENTS_FILE.write_text(json.dumps({"recent": recents}, indent=2), encoding="utf-8")

    return {"ok": True, "new_path": str(new_path), "new_name": sanitized}


@router.delete("/api/workspaces")
async def delete_workspace(body: DeleteWorkspaceRequest):
    target = Path(body.path)
    if not target.exists():
        raise HTTPException(404, f"Workspace not found: {body.path}")
    if not (target / "workspace-meta.json").exists():
        raise HTTPException(400, "Target folder is not a workspace (no workspace-meta.json)")
    if str(target) == str(state.WORKSPACE_PATH):
        raise HTTPException(400, "Cannot delete the active workspace. Switch to a different workspace first.")
    shutil.rmtree(target)

    recents = _read_recents()
    target_normalized = str(target)
    if target_normalized in recents:
        recents = [r for r in recents if r != target_normalized]
        RECENTS_FILE.write_text(json.dumps({"recent": recents}, indent=2), encoding="utf-8")

    return {"ok": True}


@router.get("/api/workspaces/recent")
async def get_recent_workspaces():
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
    if len(result) < len(recents):
        RECENTS_FILE.write_text(
            json.dumps({"recent": [r["path"] for r in result]}, indent=2),
            encoding="utf-8",
        )
    return result


@router.post("/api/workspaces/open-folder")
async def open_workspace_folder(body: OpenFolderRequest):
    folder = Path(body.path)
    if not folder.exists():
        raise HTTPException(404, f"Folder not found: {body.path}")
    if not folder.is_dir():
        raise HTTPException(400, f"Path is not a directory: {body.path}")
    if not (folder / "workspace-meta.json").exists():
        raise HTTPException(400, "Not a valid workspace folder \u2014 missing workspace-meta.json")
    state.WORKSPACE_PATH = folder
    _update_recents(str(folder))
    meta = read_workspace_meta(folder)
    return {
        "ok": True,
        "path": str(folder),
        "name": meta.name if meta else folder.name,
    }
