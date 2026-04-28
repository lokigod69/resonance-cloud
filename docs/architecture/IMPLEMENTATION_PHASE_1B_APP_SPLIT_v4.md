# IMPLEMENTATION: Phase 1B — Split app.py Into Routers + State Module (v4)

**Codebase:** `orchestrator/` (git-tracked)  
**Target file:** `orchestrator/src/app.py` (~1,712 lines, 55 route handlers)  
**Goal:** Decompose `app.py` into 7 router modules + 1 shared state module. Zero behavioral change. Every endpoint must continue to work identically.

---

## Pre-Implementation Checklist

Before writing ANY code:

1. **Read `orchestrator/src/app.py` in full.** Every line. Do not trust this prompt over the actual code.
2. **Read `orchestrator/src/state.py`** — confirm it does NOT already exist.
3. **Read `orchestrator/src/routers/`** — confirm this directory does NOT already exist.
4. **Run the orchestrator** and hit `GET /api/engines/health` to confirm it starts. Record the response.
5. If anything in the actual code contradicts this prompt, **follow the actual code** and note the discrepancy.

---

## Step 1: Create `orchestrator/src/state.py`

This module holds ALL mutable module-level state that is shared across routers. It also holds immutable config paths that multiple routers need.

**Create `orchestrator/src/state.py`.**

**CRITICAL: Do NOT invent default values. Copy them EXACTLY from `app.py`.** The defaults below are approximate — verify each one against the actual lines in `app.py` before writing `state.py`.

```python
"""
Shared mutable state and config paths for the orchestrator.

All routers import the state MODULE, not individual names, for mutable state.
Writers: state.WORKSPACE_PATH = new_value
Readers: state.WORKSPACE_PATH (always current)
"""
from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

# --- Immutable config paths ---
# COPY THE EXACT DEFAULT VALUES FROM app.py lines 46, 626.
# At time of writing they are:
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceTEST"))
LORA_LIBRARY_PATH = Path(os.getenv("LORA_LIBRARY_PATH", "D:/CODING/RESONANCE/loras"))

# --- Active workspace pointer (mutable — 4 writers) ---
# COPY THE EXACT EXPRESSION FROM app.py line 47.
# At time of writing:
WORKSPACE_PATH = Path(os.getenv("WORKSPACE_PATH", str(WORKSPACE_ROOT / "workspace")))

# --- Recents file ---
# COPY THE EXACT EXPRESSION FROM app.py line 50.
# In the original this is: Path(__file__).resolve().parent.parent / "recent-workspaces.json"
# Since state.py is at orchestrator/src/state.py, parent.parent = orchestrator/
# VERIFY this resolves to the same path as the original.
RECENTS_FILE = Path(__file__).resolve().parent.parent / "recent-workspaces.json"

# --- Autopilot state (mutable — replaced wholesale by start_autopilot) ---
# COPY THE EXACT DICT FROM app.py lines 254-263. Do NOT add or change fields.
# At time of writing:
autopilot_state: dict = {
    "running": False,
    "cancelled": False,
    "progress": [],
    "current_word": None,
    "current_stage": None,
    "total": 0,
    "done": 0,
    "errors": [],
}

# --- Per-word pipeline state (mutable) ---
# COPY THE EXACT EXPRESSION FROM app.py line 267 (including any type annotation).
word_pipeline_state: dict[str, dict] = {}
```

### CRITICAL — Mutable State Import Pattern

`WORKSPACE_PATH`, `autopilot_state`, and `word_pipeline_state` are all **rebound** (reassigned to new objects) at runtime. This means:

```python
# WRONG — will go stale after first reassignment:
from ..state import WORKSPACE_PATH
# This creates a local name pointing to the original Path object.
# When another router does state.WORKSPACE_PATH = new_path, this local name still points to the old path.

# CORRECT — always current:
from .. import state
state.WORKSPACE_PATH  # attribute lookup on the module object, always gets the current value
```

**ALL routers MUST use `from .. import state` and access `state.WORKSPACE_PATH`, `state.autopilot_state`, `state.word_pipeline_state` as attributes.** No exceptions. No `from ..state import WORKSPACE_PATH` for any mutable/rebound variable.

Immutable config (`WORKSPACE_ROOT`, `LORA_LIBRARY_PATH`, `RECENTS_FILE`) can be imported directly since they never change: `from ..state import WORKSPACE_ROOT`.

### What does NOT go in state.py

- `_suggest_rate_limit` — private to `words.py` (only used by `suggest_words`)
- `_read_recents()` / `_update_recents()` / `MAX_RECENTS` — move to `workspace.py` router
- `_backfill_workspace_languages()` / `_backfill_workspace_names()` — stay in `app.py` lifespan
- `frontend_dist` — stays in `app.py` (only used for SPA mount)
- `_SUGGEST_SYSTEM_PROMPT_TEMPLATE` — private to `words.py`
- `load_dotenv()` is called **exactly once**, in `state.py`. Do NOT add it to `app.py` or any router.
- `logger` setup — each router that needs it creates its own

### Verification

After creating `state.py`:
1. Confirm `RECENTS_FILE` resolves to the same absolute path as the original `app.py` line 50
2. Confirm all default values match the originals character-for-character
3. Run `python -c "from src.state import WORKSPACE_ROOT; print(WORKSPACE_ROOT)"` and compare to original

---

## Step 2: Create `orchestrator/src/routers/` Directory

Create the directory `orchestrator/src/routers/` and an empty `__init__.py` inside it. Use whatever method works in your environment (PowerShell, cmd, file manager, or IDE).

---

## Step 3: Create Router Files

### Import Convention for ALL Routers

**EVERY new file** (`state.py` and all 7 router files) **MUST start with:**
```python
from __future__ import annotations
```
This is line 3 of the original `app.py`. The codebase uses Python 3.10+ type syntax (`str | None`, `dict[str, list[float]]`, etc.) that requires this import for Pydantic compatibility. Without it, type annotations will fail at runtime.

All router files are at `orchestrator/src/routers/something.py`. They import:

- **State module:** `from .. import state` (for mutable state — ALWAYS use `state.WORKSPACE_PATH`, never import the name directly)
- **Immutable config:** `from ..state import WORKSPACE_ROOT, LORA_LIBRARY_PATH, RECENTS_FILE` (OK for these since they never change)
- **Sibling utility modules:** `from ..workspace import get_word_dir`, `from ..manifest import read_manifest`, etc.
- **They NEVER import from each other** (no router-to-router imports)

**Two suno.py files exist — do NOT confuse them:**
- `orchestrator/src/suno.py` — utility module (do NOT touch). Routers import from it via `from ..suno import ...`
- `orchestrator/src/routers/suno.py` — new router (you create this). `app.py` imports it via `from .routers import suno`

**Logger setup:** Every router file that uses `logger` must include at the top:
```python
import logging
logger = logging.getLogger(__name__)
```
The routers that need this are: `settings.py` (for `list_loras`), `generation.py` (for `_maybe_trigger_suno`), and `suno.py` (for `suno_generate`).

### 3A: `routers/workspace.py` — 9 endpoints + 2 helpers + 1 constant

**Endpoints to move (copy the EXACT handler code, change only imports and global references):**

| # | Method | Path | Handler |
|---|--------|------|---------|
| 1 | GET | /api/workspace/info | `workspace_info` |
| 2 | POST | /api/workspace/import | `import_words` |
| 3 | GET | /api/workspaces | `list_workspaces` |
| 4 | POST | /api/workspaces/create | `create_workspace` |
| 5 | POST | /api/workspaces/switch | `switch_workspace` |
| 6 | POST | /api/workspaces/rename | `rename_workspace` |
| 7 | DELETE | /api/workspaces | `delete_workspace` |
| 8 | GET | /api/workspaces/recent | `get_recent_workspaces` |
| 9 | POST | /api/workspaces/open-folder | `open_workspace_folder` |

**Helper functions to move:**
- `_read_recents()`
- `_update_recents()`

**Constants to move:**
- `MAX_RECENTS = 10` (used by `_update_recents()`)

**Inline Pydantic models to move:**
- `CreateWorkspaceRequest`
- `SwitchWorkspaceRequest`
- `RenameWorkspaceRequest`
- `DeleteWorkspaceRequest`
- `OpenFolderRequest`

**Top-level imports needed (verify against actual code):**
- `from __future__ import annotations`
- `import json` (recents helpers, rename_workspace, delete_workspace)
- `import os` (if any handler uses os directly — check)
- `import re` (rename_workspace)
- `import shutil` (delete_workspace uses top-level shutil, NOT inline import)
- `from pathlib import Path`
- `from typing import Optional` (import_words parameters)
- `from fastapi import APIRouter, UploadFile, File, HTTPException, Form`
- `from pydantic import BaseModel`
- `from .. import state` (for mutable WORKSPACE_PATH)
- `from ..state import WORKSPACE_ROOT, RECENTS_FILE` (immutable)
- `from ..workspace import list_word_dirs, read_workspace_meta, write_workspace_meta`
- `from ..manifest import read_manifest, now_iso`
- `from ..csv_import import import_csv`
- `from ..models import WorkspaceMeta`

**State access pattern:**
```python
from .. import state

# Writers — these 4 handlers reassign WORKSPACE_PATH:
# create_workspace, switch_workspace, rename_workspace, open_workspace_folder
# Replace:  global WORKSPACE_PATH / WORKSPACE_PATH = new_path
# With:     state.WORKSPACE_PATH = new_path

# Readers — all other handlers:
# Replace:  WORKSPACE_PATH
# With:     state.WORKSPACE_PATH
```

**Router setup:**
```python
router = APIRouter()

@router.get("/api/workspace/info")
async def workspace_info():
    # ... exact same body, with import adjustments ...
```

### 3B: `routers/words.py` — 10 endpoints + 2 helpers + suggest_words private state

**Endpoints to move:**

| # | Method | Path | Handler |
|---|--------|------|---------|
| 1 | GET | /api/words | `list_words` |
| 2 | POST | /api/words | `add_word` |
| 3 | GET | /api/words/{word_slug} | `get_word` |
| 4 | GET | /api/words/{word_slug}/manifest | `get_manifest` |
| 5 | DELETE | /api/words/{word_slug} | `delete_word` |
| 6 | POST | /api/words/{word_slug}/mute | `toggle_mute` |
| 7 | POST | /api/words/mute-all | `mute_all` |
| 8 | PUT | /api/words/{word_slug}/approve | `toggle_approve` |
| 9 | GET | /api/languages | `list_languages` |
| 10 | POST | /api/suggest-words | `suggest_words` |

**Helper functions to move:**
- `_compute_stage_statuses()` — called only by `list_words`
- `_compute_stages_detail()` — called only by `get_word`

**Private state (stays in this file, NOT in state.py):**
- `_suggest_rate_limit = defaultdict(list)` — copy from app.py
- `SUGGEST_RATE_LIMIT` and `SUGGEST_RATE_WINDOW` constants — copy from app.py
- `_SUGGEST_SYSTEM_PROMPT_TEMPLATE` string — copy from app.py

**Inline Pydantic models to move:**
- `AddWordRequest` (including its `field_validator`)
- `SuggestWordsRequest`

**Top-level imports needed (verify against actual code):**
- `from __future__ import annotations`
- `import json`, `import os`, `import re`, `import time`
- `from pathlib import Path`
- `from typing import Any, Optional` (check actual usage)
- `from collections import defaultdict` (for _suggest_rate_limit)
- `import httpx` (for suggest_words LLM call)
- `from fastapi import APIRouter, HTTPException, Request`
- `from pydantic import BaseModel, Field, field_validator`
- `from .. import state`
- `from ..settings import load_defaults, DEFAULT_SETTINGS` (load_defaults used by toggle_approve, DEFAULT_SETTINGS used by suggest_words for LLM model selection)
- `from ..workspace import get_word_dir, list_word_dirs, create_word_folder`
- `from ..manifest import read_manifest, write_manifest, create_manifest, now_iso`
- `from ..slugify import slugify, language_to_code, SUPPORTED_LANGUAGES`

**Note:** `delete_word` has an inline `import shutil` (local import inside function body). Preserve it as inline — do NOT move to top-level.

### 3C: `routers/generation.py` — 19 endpoints + 5 background functions

**Endpoints to move:**

| # | Method | Path | Handler |
|---|--------|------|---------|
| 1 | PUT | /api/words/{word_slug}/settings/{stage} | `put_word_settings` |
| 2 | GET | /api/words/{word_slug}/settings/{stage} | `get_word_settings` |
| 3 | DELETE | /api/words/{word_slug}/settings/{stage} | `delete_word_settings` |
| 4 | PUT | /api/words/{word_slug}/select/{stage} | `select_version` |
| 5 | POST | /api/words/{word_slug}/run/{stage} | `run_word_stage` |
| 6 | DELETE | /api/words/{word_slug}/images/{version}/{filename} | `delete_image` |
| 7 | DELETE | /api/words/{word_slug}/versions/{stage}/{version:path} | `delete_version` |
| 8 | GET | /api/words/{word_slug}/concept/{version} | `get_concept_artifact` |
| 9 | PUT | /api/words/{word_slug}/concept/{version} | `save_concept_edit` |
| 10 | POST | /api/words/{word_slug}/trim/assembly | `trim_assembly` |
| 11 | POST | /api/autopilot/run | `start_autopilot` |
| 12 | POST | /api/autopilot/cancel | `cancel_autopilot` |
| 13 | POST | /api/autopilot/resume | `resume_autopilot` |
| 14 | GET | /api/autopilot/status | `autopilot_status` |
| 15 | POST | /api/words/{word_slug}/pipeline/start | `start_word_pipeline` |
| 16 | GET | /api/words/{word_slug}/pipeline/status | `get_word_pipeline_status` |
| 17 | POST | /api/words/{word_slug}/pipeline/cancel | `cancel_word_pipeline` |
| 18 | POST | /api/words/{word_slug}/pipeline/resume | `resume_word_pipeline` |
| 19 | GET | /api/words/{word_slug}/stages/{stage}/{version}/meta | `get_generation_meta` |

**Background task functions to move (module-level, NOT route handlers):**
- `_run_autopilot()`
- `_run_word_pipeline()`
- `_maybe_trigger_suno()`
- `_get_incomplete_stages()`
- `_parse_workspace_identity()`

**Inline Pydantic models to move:**
- `TrimRequest`
- `RunWordPipelineRequest`

**Top-level imports needed (verify against actual code):**
- `from __future__ import annotations`
- `import asyncio` (create_task, sleep)
- `import json` (concept artifacts, generation meta)
- `import logging` ← **REQUIRED — _maybe_trigger_suno uses logger**
- `from pathlib import Path`
- `from typing import Any, Optional` ← **REQUIRED — _get_incomplete_stages and RunWordPipelineRequest**
- `from fastapi import APIRouter, HTTPException`
- `from fastapi.responses import JSONResponse` ← **REQUIRED — start_autopilot returns JSONResponse**
- `from pydantic import BaseModel`
- `from .. import state`
- `from ..workspace import get_word_dir, list_word_dirs, make_version_label, create_version_dir`
- `from ..manifest import read_manifest, write_manifest, update_selection, update_settings, now_iso, add_lineage, remove_version`
- `from ..settings import load_defaults`
- `from ..pipeline import run_stage, PipelineError, STAGE_ORDER, STAGE_DIR_MAP`
- `from ..dispatcher import call_engine, EngineUnreachableError`
- `from ..suno import generate_song as suno_generate_song` ← the UTILITY module, not the suno router

```python
logger = logging.getLogger(__name__)
```

**Inline imports to preserve (do NOT move to top-level):**
- `from ..settings import resolve_settings` inside `get_word_settings` body
- `from ..settings import resolve_settings` inside `_run_word_pipeline` body
- `import shutil` inside `delete_version` body

**State access pattern:**
```python
from .. import state

# start_autopilot — replaces entire dict:
# Replace:  global autopilot_state / autopilot_state = { ... }
# With:     state.autopilot_state = { ... }
# COPY THE EXACT REPLACEMENT DICT FROM start_autopilot IN app.py.
# Do NOT invent field names — copy every key and value exactly as they appear.

# cancel_autopilot — mutates key:
state.autopilot_state["cancelled"] = True

# _run_autopilot — reads and mutates:
state.autopilot_state["current_word"] = word_slug

# start_word_pipeline — checks autopilot:
if state.autopilot_state.get("running"):
    raise HTTPException(...)

# start_word_pipeline — creates entry:
state.word_pipeline_state[word_slug] = { ... }
```

### 3D: `routers/settings.py` — 11 endpoints

**Endpoints to move:**

| # | Method | Path | Handler |
|---|--------|------|---------|
| 1 | GET | /api/settings/defaults | `get_defaults` |
| 2 | PUT | /api/settings/defaults | `put_defaults` |
| 3 | GET | /api/presets | `get_presets` |
| 4 | GET | /api/presets/{slug} | `get_preset` |
| 5 | POST | /api/presets | `create_preset` |
| 6 | DELETE | /api/presets/{slug} | `remove_preset` |
| 7 | GET | /api/voices | `list_voices` |
| 8 | POST | /api/voices | `create_voice` |
| 9 | PUT | /api/voices/{voice_entry_id} | `edit_voice` |
| 10 | DELETE | /api/voices/{voice_entry_id} | `remove_voice` |
| 11 | GET | /api/loras | `list_loras` |

**Inline Pydantic models to move:**
- `VoiceCreateRequest`
- `VoiceUpdateRequest`
- `PresetSaveRequest`

**Top-level imports needed (verify against actual code):**
- `from __future__ import annotations`
- `import json`
- `import logging` ← **REQUIRED — list_loras uses logger**
- `from pathlib import Path`
- `from typing import Any, Optional` ← **REQUIRED — VoiceUpdateRequest, PresetSaveRequest**
- `from fastapi import APIRouter, HTTPException`
- `from pydantic import BaseModel`
- `from .. import state`
- `from ..state import WORKSPACE_ROOT, LORA_LIBRARY_PATH`
- `from ..settings import load_defaults, save_defaults`
- `from ..voices import load_voices, add_voice, update_voice, delete_voice`
- `from ..presets import list_presets, load_preset, save_preset, delete_preset`

```python
logger = logging.getLogger(__name__)
```

### 3E: `routers/suno.py` — 1 endpoint

**Endpoint to move:**

| # | Method | Path | Handler |
|---|--------|------|---------|
| 1 | POST | /api/suno/generate | `suno_generate` |

**Inline Pydantic model to move:**
- `SunoGenerateRequest`

**Top-level imports needed (verify against actual code):**
- `from __future__ import annotations`
- `import logging` ← **REQUIRED — suno_generate uses logger**
- `import os` ← **REQUIRED — suno_generate reads SUPABASE_URL/KEY from env**
- `import httpx` ← **REQUIRED — suno_generate uses httpx.AsyncClient for audio download**
- `from fastapi import APIRouter, HTTPException`
- `from pydantic import BaseModel`
- `from .. import state`
- `from ..state import WORKSPACE_ROOT`
- `from ..suno import generate_song as suno_generate_song` ← the UTILITY module

```python
logger = logging.getLogger(__name__)
```

**Inline imports to preserve (do NOT move to top-level):**
```python
# Inside suno_generate body — conditional import
from supabase import create_client as _sb_create
```

### 3F: `routers/media.py` — 2 endpoints

**Endpoints to move:**

| # | Method | Path | Handler |
|---|--------|------|---------|
| 1 | GET | /api/media/ws/{workspace_name}/{word_slug}/{rest_path:path} | `serve_media_workspace` |
| 2 | GET | /api/media/{word_slug}/{rest_path:path} | `serve_media` |

**Top-level imports needed:**
- `from __future__ import annotations`
- `from pathlib import Path`
- `from fastapi import APIRouter, HTTPException`
- `from fastapi.responses import FileResponse`
- `from .. import state`
- `from ..state import WORKSPACE_ROOT`
- `from ..workspace import get_word_dir` ← **REQUIRED — serve_media uses it**

### 3G: `routers/health.py` — 2 endpoints

**Endpoints to move:**

| # | Method | Path | Handler |
|---|--------|------|---------|
| 1 | GET | /api/engines/health | `engines_health` |
| 2 | GET | /api/engines/{engine}/health | `engine_health` |

**Top-level imports needed:**
- `from __future__ import annotations`
- `from fastapi import APIRouter`
- `from ..dispatcher import check_all_engines, check_engine_health`

---

## Step 4: Rewrite `orchestrator/src/app.py`

After all routers are created, **rename `app.py` to `app.py.bak`** (keep as backup), then create a new `app.py`.

**CRITICAL RULES for the new app.py:**
- Imports from sibling modules use SINGLE dot: `from .workspace import ...`, `from . import state` (NOT double dot — app.py is inside `src/`, not inside `routers/`)
- `load_dotenv()` is NOT called here (already called in `state.py`)
- Copy `_backfill_workspace_languages()` and `_backfill_workspace_names()` EXACTLY from the original, only changing bare `WORKSPACE_ROOT` to `state.WORKSPACE_ROOT`
- These backfill functions use ONLY `state.WORKSPACE_ROOT` — they do NOT use `WORKSPACE_PATH`
- Copy the `serve_spa()` handler and `frontend_dist` computation EXACTLY from the original
- Use `str()` where the original uses `str()` (e.g., `str(frontend_dist / "assets")` for StaticFiles)
- Use `Path(__file__).parent.parent` (NO `.resolve()`) for `frontend_dist` — match the original exactly

**Backfill function imports needed (verify against actual code):**
- `from collections import Counter` (used by `_backfill_workspace_languages`)
- `from .workspace import read_workspace_meta, write_workspace_meta, list_word_dirs` (verify exact imports)
- `from .manifest import read_manifest` (verify)
- `from . import state`

**Structure of new app.py:**

```python
"""Resonance Orchestrator — FastAPI app setup and router mounting."""
from __future__ import annotations

# ... stdlib imports needed by backfills ...
from contextlib import asynccontextmanager
from pathlib import Path
from collections import Counter

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles

from . import state
# ... imports for backfill functions (from .workspace, .manifest, etc.) ...
from .routers import workspace, words, generation, settings, suno, media, health


# --- Copy _backfill_workspace_languages EXACTLY from original app.py ---
# Replace bare WORKSPACE_ROOT with state.WORKSPACE_ROOT
def _backfill_workspace_languages():
    # PASTE EXACT CODE HERE — only change WORKSPACE_ROOT → state.WORKSPACE_ROOT
    ...

# --- Copy _backfill_workspace_names EXACTLY from original app.py ---
def _backfill_workspace_names():
    # PASTE EXACT CODE HERE — only change WORKSPACE_ROOT → state.WORKSPACE_ROOT
    ...


@asynccontextmanager
async def lifespan(app: FastAPI):
    _backfill_workspace_languages()
    _backfill_workspace_names()
    yield


app = FastAPI(title="Resonance Orchestrator", version="1.0.0", lifespan=lifespan)

# --- CORS (copy EXACTLY from original) ---
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

# --- Mount routers ---
app.include_router(workspace.router)
app.include_router(words.router)
app.include_router(generation.router)
app.include_router(settings.router)
app.include_router(suno.router)
app.include_router(media.router)
app.include_router(health.router)

# --- Frontend static files + SPA catch-all ---
# COPY THIS BLOCK EXACTLY FROM ORIGINAL app.py (around lines 1703-1712)
# Do NOT modify the logic. Do NOT add file-serving. Do NOT remove the JSONResponse 404.
# Use Path(__file__).parent.parent (NO .resolve()) — match the original.
frontend_dist = Path(__file__).parent.parent / "frontend" / "dist"
if frontend_dist.exists():
    app.mount("/assets", StaticFiles(directory=str(frontend_dist / "assets")), name="assets")

    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        # PASTE THE EXACT BODY FROM ORIGINAL app.py — do not modify
        ...

# NOTE: One route handler (serve_spa) remains in app.py. This is intentional —
# it must be registered last, after all router includes.
```

### What stays in app.py
- FastAPI app creation
- CORS middleware
- Router mounting (7 `include_router` calls)
- `_backfill_workspace_languages()` and `_backfill_workspace_names()` (run once at startup)
- Lifespan context manager
- Frontend static mount + SPA catch-all (`serve_spa` — the ONE route handler that stays)
- `frontend_dist` path (only used here)

### What does NOT stay in app.py
- Zero Pydantic model definitions
- Zero helper functions (except the 2 backfills)
- Zero mutable global state
- No `load_dotenv()` call (handled by state.py)
- 54 route handlers moved to routers (1 remains: serve_spa)

---

## Step 5: Verify

### 5A: Import check
```bash
cd orchestrator
python -c "from src.app import app; print('OK')"
```

If this fails with ImportError, check:
- Are `..` imports correct in router files? (double dot from `routers/` to reach `src/`)
- Is `.` import correct in `app.py`? (single dot within `src/`)
- Does `routers/__init__.py` exist?

### 5B: Start the orchestrator
Start the orchestrator normally and verify these endpoints return the same responses as before:

1. `GET /api/engines/health` — compare to Step 0 baseline
2. `GET /api/workspaces` — should list workspaces
3. `GET /api/words` — should list words in active workspace
4. `GET /api/settings/defaults` — should return defaults
5. `GET /api/autopilot/status` — should return the initial state dict (running=False, done=0, progress=[], etc.)
6. `GET /api/languages` — should return language list
7. `GET /api/loras` — should return LoRA list
8. `GET /api/voices` — should return voice list
9. `POST /api/suggest-words` — should work (may need valid payload)
10. `POST /api/suno/generate` — should accept requests (may fail if no Suno API key, that's OK)

### 5C: Line count check
- `app.py` should be ~60-90 lines
- `state.py` should be ~30-40 lines
- Total lines across all routers + state.py + app.py ≈ original app.py line count

### 5D: Zero behavioral change confirmation
- No endpoint paths changed
- No response formats changed
- No error handling changed
- No default values changed
- SPA catch-all still works (if frontend dist exists)
- `/api/autopilot/status` returns identical JSON shape

---

## What NOT to Change

1. **Do NOT refactor any business logic.** Copy handler bodies exactly, changing only imports and global references.
2. **Do NOT rename any endpoints or change any URL paths.**
3. **Do NOT extract services.** Business logic stays inline in handlers. Service extraction is Phase 1C.
4. **Do NOT modify any file outside `orchestrator/src/`.** No engine changes, no job_runner changes.
5. **Do NOT change the `.pipeline`, `.workspace`, `.manifest`, `.settings`, `.voices`, `.presets`, `.csv_import`, `.dispatcher`, `.slugify`, `.suno`, `.models` utility modules.** They are not part of this refactor.
6. **Do NOT add type hints, docstrings, or code improvements** beyond what's needed for the split. This is a structural move, not a polish pass.
7. **Do NOT delete `app.py.bak`** until ALL verification steps pass.
8. **Do NOT add `load_dotenv()` to any file** — it's already in `state.py`.
9. **Do NOT import symbols speculatively.** Only import what the moved code actually uses. If unsure whether a handler uses a function, read the handler body first. Dead imports create confusion during review.
10. **When this document says "COPY EXACTLY" — it means EXACTLY.** Do not paraphrase, reorder keys, change types, or add fields. If the original dict has `"done": 0`, do not write `"done": False`. If the original has 8 keys, do not add a 9th.

---

## File Inventory (expected result)

```
orchestrator/src/
  app.py              ← ~70-90 lines (app factory + router mounting + backfills + SPA)
  app.py.bak          ← original (delete after full verification)
  state.py            ← ~30-40 lines (shared mutable state + config paths)
  routers/
    __init__.py       ← empty
    workspace.py      ← 9 endpoints + 2 helpers + 1 constant + 5 Pydantic models
    words.py          ← 10 endpoints + 2 helpers + 2 Pydantic models + suggest private state
    generation.py     ← 19 endpoints + 5 background functions + 2 Pydantic models
    settings.py       ← 11 endpoints + 3 Pydantic models
    suno.py           ← 1 endpoint + 1 Pydantic model
    media.py          ← 2 endpoints
    health.py         ← 2 endpoints
  services/           ← ALREADY EXISTS from Phase 1A (do not touch)
    __init__.py
    enrichment.py
    metadata.py
    stage_helpers.py
    publishing.py
    suno_bakein.py
```

---

## Summary of Changes From v1 → v2

| Finding | Fix Applied |
|---------|-------------|
| state.py default values fabricated | Replaced with exact values from app.py; added "COPY EXACTLY" instructions |
| autopilot_state wrong fields (done=False, progress=0, paused_at_song) | Fixed to match original (done=0, progress=[], no paused_at_song) |
| Mutable state import guidance unsafe | Eliminated `from ..state import X` for mutable vars; mandated `from .. import state` + attribute access |
| MAX_RECENTS missing | Added to workspace.py move list |
| logger missing from generation.py and suno.py | Added import logging + logger setup to all 3 routers that need it |
| SPA catch-all behavior changed | Replaced with "COPY EXACTLY" instruction |
| frontend_dist used .resolve() | Removed .resolve() to match original |
| StaticFiles str() cast dropped | Restored str() cast |
| Backfill import guidance wrong (double dot) | Corrected to single dot for app.py |
| Backfill incorrectly said to use WORKSPACE_PATH | Corrected: backfills use only WORKSPACE_ROOT |
| JSONResponse in wrong file | Moved to generation.py; kept in app.py only if serve_spa uses it |
| httpx missing from suno.py | Added to suno.py imports |
| os missing from words.py and suno.py | Added to both |
| DEFAULT_SETTINGS dependency undocumented | Added to words.py imports |
| words.py count said 12, table had 10 | Fixed header to 10 |
| "Zero route handlers" contradicted SPA catch-all | Corrected: 1 handler (serve_spa) remains |
| mkdir/touch Unix commands on Windows | Replaced with environment-neutral instruction |
| app.py template contradicted itself on load_dotenv | Added explicit "exactly once, in state.py" rule |
| shutil needed at top level in workspace.py | Added to workspace.py top-level imports |

## Summary of Changes From v3 → v4

| Finding | Fix Applied |
|---------|-------------|
| `paused_at_song` invented field name in generation.py state example | Removed — replaced with "copy every key exactly, do NOT invent field names" |
| JSONResponse conditional in app.py could cause agent to skip it | Made unconditional: `from fastapi.responses import FileResponse, JSONResponse` |
| workspace.py imported `get_word_dir` and `create_word_folder` — neither used there | Removed from workspace.py import list |
| words.py imported `WORKSPACE_ROOT` and `STAGE_ORDER/STAGE_DIR_MAP` speculatively | Removed — not used by any words.py handler |

| Finding | Fix Applied |
|---------|-------------|
| `from __future__ import annotations` missing from all new files | Added as mandatory first line in import convention; added to every router's import list |
| `get_word_dir` missing from media.py | Added to media.py imports |
| `from typing import Optional` missing from workspace.py | Added |
| `from typing import Any, Optional` missing from generation.py | Added |
| `from typing import Any, Optional` missing from settings.py | Added |
| `now_iso` not explicitly listed for words.py | Spelled out in manifest import line |
| workspace.py imports used `...` instead of explicit names | Replaced with full enumeration |
| `create_word_folder` not called out for words.py | Added to workspace import line |
| `import os` listed for settings.py but unused | Removed |
| `Field` listed for settings.py pydantic but unused | Removed |
| JSONResponse dead import in app.py | Removed (with check note) |
| `word_pipeline_state` type annotation didn't match original | Updated to `dict[str, dict]` |
