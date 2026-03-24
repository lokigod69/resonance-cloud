# Investigation Report: Workspace Management Improvements

**Date:** March 17, 2026
**Scope:** Orchestrator only (`d:/CODING/ResonanceWorkspace/orchestrator/`)
**Status:** Investigation complete — no code changes made

---

## Issue 1: Workspace Display Names

### Current State

The display name shown in the workspace modal comes from **two different sources** depending on the code path:

**Backend (`src/app.py:149-177`)** — The `/api/workspaces` endpoint returns `d.name` (the **folder name**):
```python
workspaces.append({
    "name": d.name,          # <-- folder name (e.g. "italian1")
    "path": str(d),
    ...
    "meta": meta.model_dump() if meta else None,
})
```

**Frontend (`frontend/src/components/WorkspaceManager.tsx:174-175`)** — Displays `ws.name`:
```tsx
<span className={...}>{ws.name}</span>
```

**Frontend API type (`frontend/src/api.ts:168-176`)**:
```ts
export interface WorkspaceEntry {
  name: string       // <-- this comes from backend's d.name (folder name)
  path: string
  word_count: number
  meta: any | null
  language: string | null
  approved_count: number
}
```

So the **backend already returns the folder name** as `name`. However, the `meta` field also contains the workspace-meta.json `name`, which is different.

**The real problem** is in `workspace-meta.json` — the `name` field is set during CSV import:

**`src/csv_import.py:201-202`**:
```python
meta = WorkspaceMeta(
    name=batch_name or (existing.name if existing else source_csv.replace('.csv', '')),
    ...
)
```

If no `batch_name` is provided and no existing meta exists, the name is set to the **CSV filename minus `.csv`**. For example:
- CSV file: `Beautiful_Advanced_Italian_export.csv`
- workspace-meta.json `name`: `"Beautiful_Advanced_Italian_export"`

**Evidence from disk:**
- Folder: `italian1/` → meta name: `"Beautiful_Advanced_Italian_export"`
- Folder: `German1/` → meta name: `"Everyday_German_Essentials_export"`

**Key finding:** The WorkspaceManager frontend actually uses `ws.name` which comes from `d.name` (the folder name), NOT from meta. **So the modal should already show the folder name.** If the user is seeing CSV names, it might be an older version of the code, or the `meta.name` is being used somewhere else (e.g., the toolbar/header displaying the active workspace name).

**Action needed:** Verify where the active workspace name is shown in the toolbar. The `/api/workspace/info` endpoint returns `meta.name`, which IS the CSV-derived name. If the toolbar shows the active workspace via that endpoint, that's the bug.

### Proposed Fix

1. **During CSV import** (`csv_import.py:202`): Change the default name to use the folder name instead of the CSV filename:
   ```python
   name=batch_name or (existing.name if existing else workspace_path.name),
   ```

2. **Backfill existing workspaces**: Add a startup backfill (similar to `_backfill_workspace_languages()`) that sets `meta.name = folder_name` for any workspace where the meta name doesn't match the folder name. OR: simply always use the folder name in the API response and ignore meta.name for display purposes.

3. **`/api/workspace/info`**: Ensure it returns the folder name, not just meta.name, for the active workspace display.

### Impact
- `src/csv_import.py` — modify `_update_workspace_meta()` default name logic
- `src/app.py` — optionally add backfill, or override meta.name in `/api/workspace/info`
- No frontend changes needed (it already uses `ws.name` = folder name)

---

## Issue 2: Content Folder Structure

### Current State

**Configuration** is in `.env`:
```
WORKSPACE_PATH=D:/CODING/ResonanceWorkspace/workspace
```

**`src/app.py:40-41`** reads it:
```python
WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceWorkspace"))
WORKSPACE_PATH = Path(os.getenv("WORKSPACE_PATH", str(WORKSPACE_ROOT / "workspace")))
```

Two env vars control workspace location:
- `WORKSPACE_ROOT` — parent directory scanned for all workspaces (default: `D:/CODING/ResonanceWorkspace`)
- `WORKSPACE_PATH` — the currently active workspace folder (default: `WORKSPACE_ROOT/workspace`)

**Workspace discovery** (`src/app.py:149-177`) scans `WORKSPACE_ROOT`:
```python
for d in sorted(WORKSPACE_ROOT.iterdir()):
    if not d.is_dir() or not (d / "workspace-meta.json").exists():
        continue
```

This means every folder in `D:/CODING/ResonanceWorkspace/` with a `workspace-meta.json` is treated as a workspace. Crucially, it filters out non-workspace folders (engines, orchestrator, docs) because they lack `workspace-meta.json`.

**Current disk layout:**
```
D:/CODING/ResonanceWorkspace/
├── engines/              (no workspace-meta.json — ignored)
├── orchestrator/         (no workspace-meta.json — ignored)
├── docs/                 (no workspace-meta.json — ignored)
├── German1/              ← workspace
├── italian1/             ← workspace
├── english1/             ← workspace
├── workspace/            ← workspace
├── ceeb/                 ← workspace?
├── german nature/        ← workspace (space in name!)
├── test-output/          ← unknown
└── ...
```

**Are absolute paths stored in manifests?** The manifest model (`src/models.py`) does NOT store absolute paths. Paths are computed at runtime from `WORKSPACE_PATH + word_slug`. Engine responses store `output_paths` but these are relative. **No migration breakage from moving folders.**

### Proposed Fix

1. **Change `WORKSPACE_ROOT`** to point to a `content/` subfolder:
   - `.env`: `WORKSPACE_ROOT=D:/CODING/ResonanceWorkspace/content`
   - Or add a new env var: `CONTENT_DIR=D:/CODING/ResonanceWorkspace/content`

2. **Create the `content/` folder** and move all workspace folders into it.

3. **Update `.env`**:
   ```
   WORKSPACE_ROOT=D:/CODING/ResonanceWorkspace/content
   WORKSPACE_PATH=D:/CODING/ResonanceWorkspace/content/workspace
   ```

4. **Migration script** (recommended): A simple batch/shell script that:
   - Creates `content/` if it doesn't exist
   - Moves all folders containing `workspace-meta.json` from the project root into `content/`
   - Updates `.env`

5. **Transition period** (optional): The orchestrator could check both locations. But since this is a single-user tool, a clean migration is simpler.

### Impact
- `.env` — change `WORKSPACE_ROOT` and `WORKSPACE_PATH`
- `src/app.py` — no code changes needed (env vars drive everything)
- Physical disk — move ~10 workspace folders into `content/`
- `start.bat`, `start-dev.bat` — check if they reference workspace paths (likely not, they just start the server)

---

## Issue 3: Rename Workspace

### Current State

**No rename functionality exists** — not in the backend, not in the frontend.

**What happens if a folder is renamed on disk while the server is running:**
- The global `WORKSPACE_PATH` variable holds the old path as a `Path` object
- All operations (list words, run stages, etc.) use `WORKSPACE_PATH` directly
- Renaming the active workspace folder on disk would cause **all API calls to fail** with file-not-found errors
- The workspace list (`/api/workspaces`) would show the new folder name on next scan (since it re-scans `WORKSPACE_ROOT`)
- But the active workspace indicator would still point to the old path

**Cached paths:**
- Backend: `WORKSPACE_PATH` is a global variable — only updated by `/api/workspaces/switch`
- Frontend: Stores `ws.path` from the API response — would become stale after rename

**What rename needs to do:**
1. Rename the folder on disk
2. Update `workspace-meta.json` name field (if we decide meta.name should match folder name)
3. If renaming the active workspace: update `WORKSPACE_PATH` global
4. Return the new path to the frontend

### Proposed Implementation

**Backend** — new endpoint in `src/app.py`:
```python
@app.post("/api/workspaces/rename")
async def rename_workspace(body: RenameWorkspaceRequest):
    old_path = Path(body.path)
    new_name = sanitize(body.new_name)
    new_path = old_path.parent / new_name
    old_path.rename(new_path)
    # Update meta
    meta = read_workspace_meta(new_path)
    if meta:
        meta.name = new_name
        write_workspace_meta(new_path, meta)
    # Update active path if needed
    if WORKSPACE_PATH == old_path:
        WORKSPACE_PATH = new_path
    return {"ok": True, "path": str(new_path)}
```

**Frontend** — add rename button/inline-edit to each workspace entry in `WorkspaceManager.tsx`.

### Impact
- `src/app.py` — add endpoint + request model
- `frontend/src/api.ts` — add `renameWorkspace()` function
- `frontend/src/components/WorkspaceManager.tsx` — add rename UI (inline edit or modal)

---

## Issue 4: Delete Workspace

### Current State

**No delete functionality exists** anywhere in the codebase.

**What deletion needs to do:**
1. Delete the entire workspace folder tree (word folders, manifests, generated content, settings, meta)
2. Prevent deleting the currently active workspace (or auto-switch first)
3. Confirmation dialog in the frontend

### Proposed Implementation

**Backend** — new endpoint:
```python
@app.delete("/api/workspaces")
async def delete_workspace(body: DeleteWorkspaceRequest):
    target = Path(body.path)
    if str(target) == str(WORKSPACE_PATH):
        raise HTTPException(400, "Cannot delete the active workspace")
    if not target.exists():
        raise HTTPException(404)
    shutil.rmtree(target)
    return {"ok": True}
```

**Frontend** — add trash icon button per workspace in `WorkspaceManager.tsx`, with a confirmation dialog ("Delete workspace 'X'? This will permanently delete all generated content.").

**Safety:**
- Cannot delete the active workspace
- Confirmation dialog required
- Consider a "move to trash" approach instead of permanent deletion (OS recycle bin via `send2trash` package), but this adds a dependency

### Impact
- `src/app.py` — add endpoint + request model + `import shutil`
- `frontend/src/api.ts` — add `deleteWorkspace()` function
- `frontend/src/components/WorkspaceManager.tsx` — add delete button + confirmation dialog

---

## Issue 5: "Untagged" Category

### Current State

**Language grouping** in the frontend (`WorkspaceManager.tsx:64-76`):
```tsx
const groups = useMemo(() => {
    const map = new Map<string, WorkspaceEntry[]>()
    for (const ws of workspaces) {
      const key = ws.language || 'Untagged'    // <-- null/undefined language = "Untagged"
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(ws)
    }
    ...
})
```

The `ws.language` comes from the backend `/api/workspaces` response (`src/app.py:175`):
```python
"language": meta.language if meta else None,
```

Which comes from `workspace-meta.json`'s `language` field. This field is set:
- During CSV import (`csv_import.py:199`): detected as the most common language across all word manifests
- During startup backfill (`app.py:44-67`): fills in `language` for workspaces missing it

**What causes "Untagged":**
1. A workspace with no words (empty, just created) → no language to detect → `language: null`
2. A workspace where the backfill didn't run or the language field wasn't written
3. A workspace created manually without importing a CSV

**Evidence:** The `workspace/` folder's meta has `"language": "German"` and `languages: ["German", "Unknown"]` — so it's tagged. The "untagged" workspace is likely an empty workspace or one created via "New Workspace" (which sets `language: None`).

### Proposed Fix

Two options:
1. **Allow setting language on empty workspaces**: Add a language field to the "Create Workspace" form, and/or allow editing the language in the workspace modal.
2. **Auto-detect after first import**: Already happens via `_update_workspace_meta()`. The issue is only for empty workspaces.

Simplest fix: Add a language dropdown to the create workspace form. The model already supports it.

### Impact
- `src/app.py` — add `language` field to `CreateWorkspaceRequest`, set it in workspace meta on create
- `frontend/src/components/WorkspaceManager.tsx` — add language selector to create form

---

## Issue 6: Batch Settings Bleed-Through

### Current State

**Settings storage:** Each workspace has its own `settings-defaults.json` file inside the workspace folder. This is loaded by `load_defaults(WORKSPACE_PATH)` in `src/settings.py:103-114`.

**The "Lock" mechanism** is entirely in the frontend (`BatchSettings.tsx:7-8, 23-83`):
```tsx
const LS_LOCKED_KEY = 'batchSettingsLocked'
const LS_DATA_KEY = 'batchSettingsData'
```

When locked:
- Settings are saved to `localStorage` (browser storage, NOT per-workspace)
- On open, settings are loaded from localStorage instead of the API
- On save, settings are written to BOTH the API (current workspace's file) AND localStorage

When unlocked:
- Settings are loaded from the API (current workspace's `settings-defaults.json`)
- localStorage is cleared

**The bleed-through scenario:**
1. User opens BatchSettings in German1 → loads German1's `settings-defaults.json`
2. User changes a setting and saves → writes to German1's file
3. User clicks Lock → settings saved to localStorage
4. User switches to german_nature_1 → `WORKSPACE_PATH` changes on the backend
5. User opens BatchSettings → **locked, so loads from localStorage** (German1's settings!)
6. User saves → writes German1's settings to german_nature_1's `settings-defaults.json`

**This is the bug.** The lock feature is designed to persist settings across workspace switches (that's its stated purpose in the tooltip: "Lock: settings persist across workspace switches"), but the user experiences it as unwanted bleed-through.

**Additionally**, even WITHOUT locking:
- The frontend `BatchSettings` component fetches settings on mount via `getDefaults()`
- This calls `GET /api/settings/defaults` which reads `load_defaults(WORKSPACE_PATH)`
- Since `WORKSPACE_PATH` is updated by the switch endpoint, unlocked settings should correctly load from the new workspace

**Conclusion:** Settings bleed-through only happens when the Lock is engaged. If the user didn't intentionally lock, the settings should load correctly per-workspace. However, the lock state persists in localStorage indefinitely — the user may have locked once and forgotten.

### Proposed Fix

1. **Make the lock workspace-aware**: Store the lock state per-workspace path in localStorage (e.g., `batchSettingsLocked:D:/CODING/ResonanceWorkspace/German1`), so locking in one workspace doesn't affect another.

2. **Or remove the lock entirely**: If the use case is "I want the same settings everywhere", a better approach is a "Copy settings to workspace..." action rather than a global lock.

3. **Quick win**: Clear the lock state on workspace switch. Add an event listener in `BatchSettings` or handle it in the switch callback.

### Impact
- `frontend/src/components/BatchSettings.tsx` — modify lock key to include workspace path, or clear on switch
- `frontend/src/App.tsx` — possibly clear localStorage lock on workspace switch callback

---

## Migration Plan (Issue 2: Content Folder)

### Steps

1. **Create** `D:/CODING/ResonanceWorkspace/content/`
2. **Move** all workspace folders (those containing `workspace-meta.json`):
   ```
   German1, italian1, italian2, english1, workspace, ceeb,
   "german nature", german_nature_1, moregerman, "new words",
   Italian_test1
   ```
3. **Update** `.env`:
   ```
   WORKSPACE_ROOT=D:/CODING/ResonanceWorkspace/content
   WORKSPACE_PATH=D:/CODING/ResonanceWorkspace/content/workspace
   ```
4. **Restart** the orchestrator
5. **Verify** the workspace modal shows all workspaces

### Risks
- None for manifests (no absolute paths stored)
- `settings-defaults.json` — no absolute paths, just settings values ✓
- `workspace-meta.json` — no absolute paths ✓
- Engine output references in lineage — relative paths only ✓
- localStorage in browser may have stale workspace paths for the lock feature — clear localStorage batch settings data after migration

### Migration script
A batch file would suffice:
```bat
@echo off
mkdir "D:\CODING\ResonanceWorkspace\content" 2>nul
for /d %%D in ("D:\CODING\ResonanceWorkspace\*") do (
    if exist "%%D\workspace-meta.json" (
        echo Moving %%D...
        move "%%D" "D:\CODING\ResonanceWorkspace\content\"
    )
)
echo Done. Update .env WORKSPACE_ROOT and WORKSPACE_PATH.
```

---

## Execution Order (Recommended)

| Priority | Issue | Effort | Rationale |
|----------|-------|--------|-----------|
| 1 | **Issue 1: Display Names** | Small | Quick win, high-visibility fix. One line in csv_import.py + optional backfill. |
| 2 | **Issue 5: Untagged Category** | Small | Add language field to create workspace form. |
| 3 | **Issue 6: Settings Bleed** | Small | Fix lock to be workspace-scoped or clear on switch. Frontend-only change. |
| 4 | **Issue 2: Content Folder** | Medium | Highest structural impact. Requires migration script + .env change. No code changes. |
| 5 | **Issue 3: Rename** | Medium | New endpoint + frontend UI. Nice-to-have. |
| 6 | **Issue 4: Delete** | Medium | New endpoint + frontend UI + safety logic. Nice-to-have. |

Issues 1, 5, and 6 can be done in parallel (independent changes). Issue 2 should be done before 3 and 4 since rename/delete paths depend on the workspace root location.

---

## Files That Would Change

| File | Issues | Type |
|------|--------|------|
| `src/csv_import.py` | 1 | Modify (default name logic) |
| `src/app.py` | 1, 3, 4, 5 | Modify (backfill + new endpoints + create form) |
| `src/models.py` | 3, 4, 5 | Modify (new request models, CreateWorkspaceRequest language field) |
| `frontend/src/api.ts` | 3, 4 | Modify (new API functions) |
| `frontend/src/components/WorkspaceManager.tsx` | 3, 4, 5 | Modify (rename/delete UI, language on create) |
| `frontend/src/components/BatchSettings.tsx` | 6 | Modify (workspace-scoped lock) |
| `.env` | 2 | Modify (WORKSPACE_ROOT path) |
| Migration script (new) | 2 | New file |
