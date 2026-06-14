from __future__ import annotations

from collections import Counter
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import state
from .manifest import read_manifest
from .routers import health, imageless_tts
from .storage import STORAGE_MODE
from .workspace import list_word_dirs, read_workspace_meta, write_workspace_meta


def _backfill_workspace_languages():
    if not state.WORKSPACE_ROOT.exists():
        return
    for d in state.WORKSPACE_ROOT.iterdir():
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
    if not state.WORKSPACE_ROOT.exists():
        return
    for d in state.WORKSPACE_ROOT.iterdir():
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
    if STORAGE_MODE != "cloud":
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
        "https://lingwave.ai",
        "https://www.lingwave.ai",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(imageless_tts.router)

if STORAGE_MODE != "cloud":
    from .routers import generation, media, settings, suno, words, workspace

    app.include_router(workspace.router)
    app.include_router(words.router)
    app.include_router(generation.router)
    app.include_router(settings.router)
    app.include_router(suno.router)
    app.include_router(media.router)

    frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
    if frontend_dist.exists():
        app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

        @app.get("/{full_path:path}")
        async def serve_spa(full_path: str):
            index = frontend_dist / "index.html"
            if index.exists():
                return FileResponse(str(index))
            return JSONResponse({"error": "Frontend not built"}, status_code=404)
