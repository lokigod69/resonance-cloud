from __future__ import annotations

from fastapi import APIRouter, HTTPException
from fastapi.responses import FileResponse

from .. import state
from ..state import WORKSPACE_ROOT
from ..workspace import get_word_dir

router = APIRouter()


@router.get("/api/media/ws/{workspace_name}/{word_slug}/{rest_path:path}")
async def serve_media_workspace(workspace_name: str, word_slug: str, rest_path: str):
    ws_path = WORKSPACE_ROOT / workspace_name
    if not (ws_path / "workspace-meta.json").exists():
        raise HTTPException(404, f"Workspace '{workspace_name}' not found")
    file_path = ws_path / word_slug / rest_path
    try:
        file_path.resolve().relative_to(ws_path.resolve())
    except ValueError:
        raise HTTPException(400, "Invalid path")
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(file_path))


@router.get("/api/media/{word_slug}/{rest_path:path}")
async def serve_media(word_slug: str, rest_path: str):
    file_path = get_word_dir(state.WORKSPACE_PATH, word_slug) / rest_path
    if not file_path.exists():
        raise HTTPException(404, "File not found")
    return FileResponse(str(file_path))
