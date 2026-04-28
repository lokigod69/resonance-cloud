# IMPLEMENTATION: Phase 1A — job_runner.py Decomposition (v5)

**Type:** Implementation (structural refactoring — behavior must be identical)  
**Branch:** `refactor`  
**Scope:** `orchestrator/job_runner.py` → focused service modules  
**Risk level:** Medium — largest single refactor, but pure extraction (no logic changes)  
**Estimated time:** 6–8 hours  
**Depends on:** Phase 0 and Phase 2 complete (both done)  
**Revision:** v5 — incorporates six rounds of adversarial review (3× Codex, 3× Claude). All extraction boundaries confirmed correct across all reviews. v5 fixes over v4: `from __future__ import annotations` and `from typing import Any` added to every module scaffold, service imports explicitly placed below `load_dotenv()`, dead imports enumerated for cleanup, shared `src.manifest` imports clarified (stay in both files).

---

## Goal

Break `orchestrator/job_runner.py` (~1,873 lines) into focused service modules. After this refactor, `job_runner.py` should be a polling loop + orchestration functions that delegate to services.

**The cardinal rule: ZERO behavior change.** Every function keeps its exact logic, control flow, error handling, and side effects. We are moving code to new files and updating imports. Nothing else.

---

## Verified Function Map

Two independent reviewers confirmed this map against the current file. **Verify it still matches before starting.**

| Function | Lines | Destination |
|----------|-------|-------------|
| `get_supabase()` | 64-68 | STAYS |
| `run_enrichment()` | 99-156 | → services/enrichment.py |
| `SETTINGS_OVERRIDE_MAP` | 164-170 | STAYS (used by merge_settings) |
| `merge_settings()` | 173-212 | STAYS |
| `get_fallback_overrides()` | 217-244 | → services/stage_helpers.py |
| `_validate_artifacts()` | 249-275 | → services/stage_helpers.py |
| `get_incomplete_stages()` | 278-292 | → services/stage_helpers.py |
| `extract_thumbnail()` | 297-317 | → services/publishing.py |
| `get_song_takes()` | 322-342 | STAYS (used inline by process_word) |
| `_probe_clip_durations()` | 347-357 | → services/suno_bakein.py |
| `_probe_audio_duration()` | 360-367 | → services/suno_bakein.py |
| `_trim_suno_mp3()` | 370-385 | → services/suno_bakein.py |
| `_STAGE_DIRS` | 391-398 | → services/metadata.py |
| `_read_json()` | 401-406 | → services/metadata.py |
| `_find_latest_meta()` | 409-428 | → services/metadata.py |
| `_find_latest_storyboard()` | 431-442 | → services/metadata.py |
| `collect_word_metadata()` | 445-570 | → services/metadata.py |
| `_resolve_final_video()` | 575-584 | → services/publishing.py |
| `_upload_video_and_thumb()` | 587-623 | → services/publishing.py |
| `_upload_suno_to_storage()` | 626-660 | → services/suno_bakein.py |
| `upload_ab_results()` | 663-718 | → services/publishing.py |
| `bake_suno_into_word()` | 723-1065 | → services/suno_bakein.py |
| `process_word()` | 1070-1498 | STAYS |
| `process_suno_retry_job()` | 1503-1604 | STAYS |
| `process_job()` | 1609-1802 | STAYS |
| `main()` | 1807-1869 | STAYS |

---

## Shared Constants — How to Handle

These constants are used by BOTH staying and moving code. Each needs explicit handling.

| Constant | Line | Used by (stays) | Used by (moves) | Resolution |
|----------|------|-----------------|------------------|------------|
| `MAX_RETRIES` | 50 | `process_word()` retry loops | `bake_suno_into_word()` line ~1029 | **Keep in job_runner.py. Pass as parameter to `bake_suno_into_word()`.** |
| `SUNO_MIN_USABLE_DURATION` | 52 | — | `bake_suno_into_word()` | **Move to services/suno_bakein.py** |
| `SUNO_MAX_USABLE_DURATION` | 53 | — | `bake_suno_into_word()` | **Move to services/suno_bakein.py** |
| `OPENROUTER_API_KEY` | 48 | — | `run_enrichment()` | **Move to services/enrichment.py** (read via `os.getenv()` at module level) |
| `ENRICHMENT_SYSTEM_PROMPT` | ~80-97 | — | `run_enrichment()` | **Move to services/enrichment.py** |
| `STAGE_ORDER` | imported from `src.pipeline` | `process_word()` | `get_incomplete_stages()` | **Import from `src.pipeline` in both files** |
| `WORKSPACE_ROOT` | 47 | `process_job()`, `main()` | — | **Stays in job_runner.py** |
| `log` / logger | 61 | everywhere | everywhere | **Each new module creates its own: `log = logging.getLogger(__name__)` — use `log`, not `logger`, to match the existing code's variable name** |

---

## Duplicate Stage-Directory Mapping

Both `_validate_artifacts()` (line ~251-254) and `_STAGE_DIRS` (lines 391-398) define the same stage→directory mapping. They move to different modules (`stage_helpers.py` and `metadata.py`).

**Resolution:** Accept the duplication. Both are small dicts (~6 entries). Cross-importing between service modules adds coupling. Consolidating them is a Phase 3 task. Add a comment in both modules noting the duplication:
```python
# NOTE: This mapping is duplicated in services/metadata.py (or stage_helpers.py).
# Consolidation deferred to Phase 3.
```

---

## Target Structure

```
orchestrator/
├── job_runner.py                    ← Slimmed: polling + orchestration
├── src/
│   ├── services/                    ← NEW directory
│   │   ├── __init__.py              ← empty
│   │   ├── enrichment.py            ← run_enrichment()
│   │   ├── suno_bakein.py           ← bake_suno_into_word() + audio helpers
│   │   ├── stage_helpers.py         ← fallback overrides + stage completion
│   │   ├── metadata.py              ← collect_word_metadata() + JSON helpers
│   │   └── publishing.py            ← upload_ab_results() + storage helpers
│   ├── ... (all existing files unchanged)
```

---

## Extraction Plan

Work through these IN ORDER. After each step, the job runner should still start and function.

### Step 1: Create the services directory

On Windows (PowerShell):
```powershell
New-Item -ItemType Directory -Path "orchestrator/src/services" -Force
New-Item -ItemType File -Path "orchestrator/src/services/__init__.py" -Force
```

Or on Unix/WSL:
```bash
mkdir -p orchestrator/src/services
touch orchestrator/src/services/__init__.py
```

### Step 2: Extract enrichment → `services/enrichment.py`

**Cleanest extraction — start here to establish the pattern.**

**Move:**
- `OPENROUTER_API_KEY` (line 48) — re-declare as `os.getenv("OPENROUTER_API_KEY", "")` at module level
- `ENRICHMENT_SYSTEM_PROMPT` (lines ~80-97)
- `run_enrichment()` (lines 99-156)

**Module setup at top of enrichment.py:**
```python
"""LLM-based word enrichment via OpenRouter."""

from __future__ import annotations

import json
import logging
import os
from typing import Any

import httpx

log = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")
```

**Note on dotenv:** `job_runner.py` calls `load_dotenv()` at line 30 before importing from `src.services`. By the time `enrichment.py` is imported, env vars are already populated. No `load_dotenv()` needed in the service module.

**In job_runner.py after extraction:**
```python
from src.services.enrichment import run_enrichment
```

Remove the moved constant and function. Remove the `OPENROUTER_API_KEY` line (48). Remove the `ENRICHMENT_SYSTEM_PROMPT` block. Remove `run_enrichment()`.

**Call site:** `process_job()` around line 1686-1688. Verify it works with the import.

### Step 3: Extract metadata → `services/metadata.py`

**Move (all five items form a cohesive unit):**
- `_STAGE_DIRS` (lines 391-398)
- `_read_json()` (lines 401-406)
- `_find_latest_meta()` (lines 409-428) — calls `_read_json`
- `_find_latest_storyboard()` (lines 431-442) — calls `_read_json`
- `collect_word_metadata()` (lines 445-570) — calls the above three

**Module setup:**
```python
"""Artifact collection and metadata assembly for word uploads."""

from __future__ import annotations

import json
import logging
from pathlib import Path
from typing import Any

from src.manifest import read_manifest

log = logging.getLogger(__name__)
```

**Supabase client note:** `collect_word_metadata()` does NOT use the module-level `sb` Supabase client. The variable `sb` at line ~461 is a LOCAL variable for storyboard data that happens to shadow the module name. This extraction is clean — no `sb_client` parameter needed.

**In job_runner.py after extraction:**
```python
from src.services.metadata import collect_word_metadata
```

### Step 4: Extract stage helpers → `services/stage_helpers.py`

**Move:**
- `get_fallback_overrides()` (lines 217-244)
- `_validate_artifacts()` (lines 249-275) — has its own inline `folder_map` dict
- `get_incomplete_stages()` (lines 278-292) — calls `_validate_artifacts`

**Module setup:**
```python
"""Stage completion checking and fallback override logic."""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from src.pipeline import STAGE_ORDER

log = logging.getLogger(__name__)
```

**Note:** `STAGE_ORDER` is imported from `src.pipeline` (job_runner.py line 32), NOT defined locally. The new module imports it from the same source.

**In job_runner.py after extraction:**
```python
from src.services.stage_helpers import get_fallback_overrides, get_incomplete_stages
```

Keep `STAGE_ORDER` import in job_runner.py too — `process_word()` still uses it.

### Step 5: Extract publishing → `services/publishing.py`

**Move:**
- `extract_thumbnail()` (lines 297-317) — sync, uses `subprocess`
- `_resolve_final_video()` (lines 575-584) — sync, pure helper
- `_upload_video_and_thumb()` (lines 587-623) — sync, uses module-level `sb`
- `upload_ab_results()` (lines 663-718) — **async**, calls the above three

**Async/sync mix:** This module will contain both sync and async functions. That's fine — Python handles this naturally. Just note it for clarity.

**Supabase client threading — thread through ALL functions that use `sb`:**

```python
# _upload_video_and_thumb is SYNC (not async). Its actual signature (line ~587):
def _upload_video_and_thumb(sb_client, video_path, word_dir, 
                            storage_video_key, storage_thumb_key, 
                            thumb_suffix=""):
    # Add sb_client as first param. Keep everything else identical.
    # Replace all sb. calls with sb_client.

# upload_ab_results is ASYNC. Its actual signature (line ~663):
async def upload_ab_results(sb_client, word_record, word_dir, user_id, deck_id, 
                            word_slug, manifest_a, manifest_b=None):
    # Add sb_client as first param. Keep everything else identical.
    # Replace all sb. calls with sb_client.
    # Pass sb_client to _upload_video_and_thumb(sb_client, ...)
```

**Real signature of `upload_ab_results`** (verify against line 663):
```python
async def upload_ab_results(word_record, word_dir, user_id, deck_id, 
                            word_slug, manifest_a, manifest_b=None):
```
Add `sb_client` as the first parameter. Update ALL call sites in `process_word()` and `process_suno_retry_job()` to pass `sb` as the first argument.

**Module setup:**
```python
"""Upload generated artifacts to Supabase Storage and update word records."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)
```

### Step 6: Extract Suno bake-in → `services/suno_bakein.py`

**Largest extraction (~400+ lines with helpers).**

**Move:**
- `SUNO_MIN_USABLE_DURATION` (line 52)
- `SUNO_MAX_USABLE_DURATION` (line 53)
- `_probe_clip_durations()` (lines 347-357) — sync, uses `subprocess`
- `_probe_audio_duration()` (lines 360-367) — sync, uses `subprocess`
- `_trim_suno_mp3()` (lines 370-385) — sync, uses `subprocess`
- `_upload_suno_to_storage()` (lines 626-660) — sync, uses `sb`
- `bake_suno_into_word()` (lines 723-1065) — **async**

**What does NOT move with suno_bakein (previously listed incorrectly in v1/v2):**
- ~~`src.dispatcher`~~ — `bake_suno_into_word()` does NOT use `call_engine` or anything from dispatcher
- ~~`json`, `time`, `asyncio`~~ — verify actual usage before adding these imports

**External dependencies used by `bake_suno_into_word()` — confirmed by two reviewers:**
- `from src.pipeline import run_stage`
- `from src.manifest import read_manifest, update_selection`
- Inside the function body (lazy import, travels naturally): `from src.manifest import update_settings as _update_settings`
- `from src.suno import generate_song as suno_generate_song`
- `from src.suno import download_suno_audio`
- `from src.suno import fetch_existing_task`
- `from src.suno import _write_to_supabase as suno_write_to_supabase`

**Do NOT add:** `src.dispatcher` (not used), `json` (not used), `time` (not used), `asyncio` (not used).

**Supabase client threading:**
- `_upload_suno_to_storage()` uses `sb` for BOTH `.storage` and `.table("words").update()`. Add `sb_client` parameter.
- `bake_suno_into_word()` calls `_upload_suno_to_storage()` — pass `sb_client` through.
- Add `sb_client` as a parameter to `bake_suno_into_word()` itself.

**MAX_RETRIES handling:** `bake_suno_into_word()` uses `MAX_RETRIES` (line ~1029). Rather than duplicating the constant, add `max_retries` as a parameter with default:
```python
async def bake_suno_into_word(sb_client, ..., max_retries=2):
```
Update the call sites in `process_word()` and `process_suno_retry_job()` to pass `MAX_RETRIES`.

**`_fade_params()` stays nested.** It closes over `fade_tail` and `clip_duration`. Do not extract it.

**The 9 override keys restored in the `finally` block (lines ~1046-1053):**
1. `silence_trim`
2. `lufs_normalize`
3. `gap_strategy`
4. `overflow_strategy`
5. `word_card_show_translation`
6. `word_card_font`
7. `word_card_font_size`
8. `skip_outro`
9. `outro_mode`

**Verify this list against the actual finally block. Copy it exactly.**

**Module setup:**
```python
"""Suno audio generation, trimming, and re-assembly into word videos."""

from __future__ import annotations

import logging
import subprocess
from pathlib import Path
from typing import Any

from src.manifest import read_manifest, update_selection
from src.pipeline import run_stage
from src.suno import (
    generate_song as suno_generate_song,
    download_suno_audio,
    fetch_existing_task,
    _write_to_supabase as suno_write_to_supabase,
)

log = logging.getLogger(__name__)

SUNO_MIN_USABLE_DURATION = 12.0
SUNO_MAX_USABLE_DURATION = 150.0
```

### Step 7: Update call sites in job_runner.py

After all extractions, add the service imports to `job_runner.py` **BELOW the `load_dotenv()` call** (line ~30). The service modules read env vars at import time, so `load_dotenv()` must run first:

```python
# Line ~30: load_dotenv() ← must come first

# ... existing imports ...

# NEW — add below load_dotenv and existing imports:
from src.services.enrichment import run_enrichment
from src.services.metadata import collect_word_metadata
from src.services.publishing import upload_ab_results
from src.services.suno_bakein import bake_suno_into_word
from src.services.stage_helpers import get_fallback_overrides, get_incomplete_stages
```

**Imports that become DEAD in job_runner.py after extraction — REMOVE these:**
- `import httpx` (line 40) — only used by `run_enrichment` (now in enrichment.py)
- `import subprocess` (line 20) — only used by moved functions (extract_thumbnail, _probe_*, _trim_suno_mp3)
- `from src.suno import generate_song as suno_generate_song, download_suno_audio, fetch_existing_task, _write_to_supabase as suno_write_to_supabase` (line 38) — all four only used by `bake_suno_into_word` (now in suno_bakein.py)
- Top-level `import json` (line 16) — only used by moved functions (`_read_json`, `run_enrichment`). **NOTE:** `process_word()` has a lazy `import json as _json` at line ~1224 that still works independently. Safe to remove the top-level import.

**Imports that STAY in job_runner.py despite also being used by moved code:**
- `from src.pipeline import run_stage, STAGE_ORDER` — `run_stage` used at lines ~1177, 1331, 1406 (in `process_word`); `STAGE_ORDER` used at lines ~1113, 1126, 1132, 1450
- `from src.manifest import create_manifest, read_manifest, update_selection` — all three used by staying code in `process_word` and `process_suno_retry_job`
- `from src.settings import load_defaults, save_defaults` — used by staying code

**Do NOT accidentally remove `update_selection` or `read_manifest` from job_runner.py's `src.manifest` import** — they are used by both staying and moving code.

Update every call to `upload_ab_results()` and `bake_suno_into_word()` to pass `sb` as the first argument and (for bake_suno) `MAX_RETRIES`. The exact call sites:

```python
# upload_ab_results — 2 call sites:
#   process_word() line ~1466:      add sb as first arg
#   process_suno_retry_job() line ~1582:  add sb as first arg

# bake_suno_into_word — 2 call sites:
#   process_word() line ~1249:      add sb as first arg, max_retries=MAX_RETRIES
#   process_suno_retry_job() line ~1564:  add sb as first arg, max_retries=MAX_RETRIES
```

Remove all moved functions, constants, and helper functions from `job_runner.py`. Remove imports that were only used by moved code.

**What remains in job_runner.py:**
- Imports (updated)
- `load_dotenv()`, env var reads for WORKSPACE_ROOT, MAX_RETRIES, POLL_INTERVAL, etc.
- `get_supabase()`
- `SETTINGS_OVERRIDE_MAP`, `DEFAULT_SETTINGS` (if defined here)
- `merge_settings()`
- `get_song_takes()`
- `process_word()` (~428 lines — stays, with retry loops inline)
- `process_suno_retry_job()` (~101 lines)
- `process_job()` (~193 lines)
- `main()` (~62 lines)

**Realistic target: ~900-1,050 lines.** The moved code totals ~830 lines. After removing those and cleaning up now-unused imports, job_runner.py drops from 1,873 to roughly this range.

---

## What NOT to Change

- **Do NOT modify any function's internal logic.** Move code, don't rewrite it.
- **Do NOT modify `src/app.py`, `src/pipeline.py`, `src/suno.py`, or any engine code.**
- **Do NOT rename functions.** Keep original names.
- **Do NOT extract `_fade_params()`.** Keep it nested inside `bake_suno_into_word()`.
- **Do NOT try to unify the retry loops.** They're structurally different. Leave them inline in `process_word()`.
- **Do NOT change the settings override/restore logic.**
- **Do NOT change how the job runner is started.** Entry point stays the same.
- **Do NOT consolidate the duplicate stage-directory mappings** (`_validate_artifacts` folder_map and `_STAGE_DIRS`). That's Phase 3.

---

## Verification

### Test 1: Import Check
```python
from src.services.enrichment import run_enrichment
from src.services.suno_bakein import bake_suno_into_word
from src.services.stage_helpers import get_fallback_overrides, get_incomplete_stages
from src.services.metadata import collect_word_metadata
from src.services.publishing import upload_ab_results
print("All service imports successful ✓")
```

### Test 2: Job Runner Starts
Run `job_runner.py` normally. It should start polling without errors. Check logs for any import failures.

### Test 3: End-to-End Word Generation
Submit a word through the site. Full pipeline: enrichment → stages → Suno bake-in → upload. Verify result appears in frontend.

### Test 4: Suno Retry
If possible, trigger a Suno retry job. Verify `process_suno_retry_job()` completes.

### Test 5: Line Count
Report final line counts. Expected ranges:

| File | Expected lines |
|------|---------------|
| `job_runner.py` | ~900-1,050 (was 1,873) |
| `services/enrichment.py` | ~70-90 |
| `services/metadata.py` | ~190-210 |
| `services/stage_helpers.py` | ~90-110 |
| `services/publishing.py` | ~170-190 |
| `services/suno_bakein.py` | ~410-440 |
| **Total** | ~1,830-2,090 (slightly more than 1,873 due to new imports/headers) |

---

## Report Format

```markdown
# Phase 1A: job_runner.py Decomposition Report

## Function Map Verified
[Confirm map matches current code]

## Extraction Summary
| Module | Functions moved | Lines | Key dependencies |
|--------|----------------|-------|------------------|
| services/enrichment.py | run_enrichment, OPENROUTER_API_KEY, ENRICHMENT_SYSTEM_PROMPT | ... | httpx |
| services/metadata.py | collect_word_metadata, _read_json, _find_latest_meta, _find_latest_storyboard, _STAGE_DIRS | ... | src.manifest |
| services/stage_helpers.py | get_fallback_overrides, _validate_artifacts, get_incomplete_stages | ... | src.pipeline |
| services/publishing.py | upload_ab_results, _resolve_final_video, _upload_video_and_thumb, extract_thumbnail | ... | subprocess |
| services/suno_bakein.py | bake_suno_into_word, _probe_clip_durations, _probe_audio_duration, _trim_suno_mp3, _upload_suno_to_storage, SUNO_MIN/MAX constants | ... | src.manifest, src.pipeline, src.suno |

## Supabase Client Threading
[List every function that now takes sb_client, and every call site updated]

## Shared Constants
[Document how MAX_RETRIES, SUNO constants, OPENROUTER_API_KEY were handled]

## Final Line Counts
- job_runner.py: [N] lines (was 1,873)
- [each service module]: [N] lines
- TOTAL: [N] lines

## Tests Passed
- [ ] Import check
- [ ] Job runner starts  
- [ ] End-to-end word generation
- [ ] Suno retry
```
