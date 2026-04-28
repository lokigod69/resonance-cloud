# INVESTIGATION — Sibling `prompts.py` Files Audit

**Date:** 2026-04-28
**Scope:** Read-only audit of `prompts.py` files outside the active path `orchestrator/cloud_engines/image_engine/prompts.py`. No files modified.
**Active file (canonical, deployed):** `orchestrator/cloud_engines/image_engine/prompts.py` — 107,126 bytes, mtime 2026-04-28 20:20, hash `eb6829da090a9371dc93b7d14962db56`, tracked at HEAD `b486bd4` ("fix(image): tighten editorial and cinematic bodies, fix word-integration conflict") in the orchestrator git repo (`origin = github.com/lokigod69/resonance-cloud.git`).

---

## TL;DR

- **Scope correction:** The directories the prompt expected at `orchestrator/_spotcheck/` and `orchestrator/_review_async/` do **not** exist. They live at the **repo root** (`D:/CODING/ResonanceTEST/_spotcheck/`, `_review_async/`, plus `_review/` and `_inspect/`).
- **Five distinct `prompts.py` files** are in the original scope. All five have different hashes — they are not exact copies; they're frozen snapshots of the active file at different points in time.
- **None of them are imported or invoked by the deployed cloud orchestrator.** Production runs with `DISPATCH_MODE=direct` (set in `orchestrator/Dockerfile.cloud:48`), which short-circuits to `cloud_engines.image_engine.engine.generate_images`. The legacy HTTP path through port 8082 → `engines/image-engine/` exists in code but is unreachable in deployment.
- **No Gateway Pattern bug.** The recent `fix(image)` commits *are* reaching production. The shadow files are stale, not active.
- **The Stabilization plan already flagged this** (`orchestrator/docs/Stabilization/resonance_phase1_focus_stabilization_plan.md:101`): "Verify whether `phase2b_push/`, `_review/`, `_spotcheck/`, `tmp/`, and similar folders are inactive snapshots."
- **Disk impact:** the four suspect dirs at root consume **≈994 MB** combined. Cleanup is a hygiene/disambiguation win for future agents, not a correctness fix.

---

## 1. Inventory of Each Suspect Directory

### 1.1 `D:\CODING\ResonanceTEST\engines\image-engine\src\` (in original scope)

Local-era Image Engine source — the standalone Streamlit/FastAPI engine that ran on `localhost:8082` before cloud migration.

```
__init__.py             241 B    Mar 1 18:47
config.py               997 B    Apr 6 03:01
engine.py            11,045 B    Apr 7 11:49
models.py            17,294 B    Apr 8 04:26
prompt_compiler.py    5,817 B    Apr 9 21:14
prompts.py           96,307 B    Apr 10 08:20  ← suspect
renderer.py          32,270 B    Apr 11 14:41
storyboard.py        15,753 B    Apr 10 08:20
wan_provider.py      11,673 B    Apr 7 11:49
__pycache__/                     Apr 11 14:42
```

**Tracked in git?** No. The directory is outside any git repository — `engines/image-engine/.git/` does not exist, and the parent `engines/` is not under any `.git/` either (the repo root `D:/CODING/ResonanceTEST/` is not a git repo per environment metadata).

**Sibling files in `engines/image-engine/`** (parent dir): a full local-engine project — `ENGINE_IMAGE.md`, `README.md`, `tests/`, `ui/`, `start-ui.bat`, `requirements.txt`, `.env`, `.venv/`, `test_korean.py`, `test_live.py`. This is a complete legacy project tree, not just a prompts file.

**Total dir size:** ~98 MB (mostly `.venv/`).

---

### 1.2 `D:\CODING\ResonanceTEST\_spotcheck\` (found at repo root, not under orchestrator)

Two sub-clones:
- `ltx-worker/` — a clone of the LTX worker repo
- `resonance-cloud/` — a clone of `https://github.com/lokigod69/resonance-cloud.git` checked out to `main` at commit **816243f** (2026-04-22 05:24, "fix(speak): restore tutor.voice narrowing in State 3 dispatch")

The `resonance-cloud/` clone contains the full repo tree (job_runner.py, main.py, frontend/, cloud_engines/, docs/, etc.) — including:
- `cloud_engines/image_engine/prompts.py` — 98,715 B, mtime 2026-04-21 23:53, hash `d7ff41676d092885f5721c97b5e5fdf0`

**Tracked in git?** Yes — but in its **own independent `.git/` directory** (`_spotcheck/resonance-cloud/.git/`), not in the active orchestrator repo. From the standpoint of the active codebase, the clone is untracked external content.

**Total dir size:** ~384 MB.

---

### 1.3 `D:\CODING\ResonanceTEST\_review_async\` (found at repo root)

Identical structure: `ltx-worker/` + `resonance-cloud/`. The `resonance-cloud/` clone is checked out to branch `async-video-adapter` at commit **24fc656** (2026-04-14 18:39, "fix: enforce sub-second poll deadline floor"). Origin: same `lokigod69/resonance-cloud.git`.

- `cloud_engines/image_engine/prompts.py` — 97,948 B, mtime 2026-04-14 17:09, hash `9abda781ca561ee886bf943ae75e59ff`

**Tracked in git?** Yes, in its own independent `.git/`. Untracked from the active repo's perspective.

**Total dir size:** ~112 MB.

---

### 1.4 `D:\CODING\ResonanceTEST\_review\` (found at repo root, not in original prompt — added because same pattern)

Identical structure: `ltx-worker/` + `resonance-cloud/`. The `resonance-cloud/` clone is checked out to `main` at commit **16794e1** (2026-04-26 01:30, "fix(speak): resolve scroll authority and gem accents"). Origin: same `lokigod69/resonance-cloud.git`.

- `cloud_engines/image_engine/prompts.py` — 102,972 B, mtime 2026-04-24 22:02, hash `0535f869b31e6211bf09c77e76508264`

**Tracked in git?** Yes, in its own independent `.git/`. Untracked from the active repo.

**Total dir size:** ~398 MB.

---

### 1.5 `D:\CODING\ResonanceTEST\_inspect\` (found at repo root)

Only contains `ltx-worker/` — **no `resonance-cloud/` subdirectory and no `prompts.py`** anywhere in this tree. Out of scope for prompt drift, but listed here because it matches the `_*` underscore convention.

**Total dir size:** ~207 KB.

---

### 1.6 `D:\CODING\ResonanceTEST\investigation\_scratch_816243f\` (also `_*`-prefixed)

Found via the broader search. Contents are frontend TS/TSX patches, not prompts files. Out of scope for this audit. The suffix `816243f` matches the commit hash at the head of `_spotcheck/resonance-cloud/`, suggesting a coordinated review snapshot.

```
Speak.tsx, diff_54d7859_Speak.patch, grok-token.ts,
useGrokRealtime.ts, useVoiceTutor.ts, voice-chat.ts
```

---

### 1.7 Other shadow `prompts.py` files (not in original scope, surfaced for completeness)

`find` across the repo returned **18** `prompts.py` files (excluding `.venv/` and `__pycache__/`):

```
orchestrator/cloud_engines/image_engine/prompts.py             ← ACTIVE
engines/image-engine/src/prompts.py                            ← scope 1.1
_spotcheck/resonance-cloud/cloud_engines/image_engine/prompts.py   ← scope 1.2
_review_async/resonance-cloud/cloud_engines/image_engine/prompts.py ← scope 1.3
_review/resonance-cloud/cloud_engines/image_engine/prompts.py  ← scope 1.4
phase2b_push/cloud_engines/image_engine/prompts.py             ← out of scope
speak-scroll-fix-main/cloud_engines/image_engine/prompts.py    ← out of scope
watery-main/cloud_engines/image_engine/prompts.py              ← out of scope
tmp/lyric-levels-main-review/cloud_engines/image_engine/prompts.py
tmp/phase2a_push_main/cloud_engines/image_engine/prompts.py
tmp/phase2a_restore_main/cloud_engines/image_engine/prompts.py
tmp/phase2a_revert_main/cloud_engines/image_engine/prompts.py
tmp/voxtral_1b910e1/cloud_engines/image_engine/prompts.py
tmp/voxtral_33c15d1/cloud_engines/image_engine/prompts.py
tmp/voxtral_60f52f3/cloud_engines/image_engine/prompts.py
tmp/voxtral_93a0c05/cloud_engines/image_engine/prompts.py
tmp/voxtral_b379372/cloud_engines/image_engine/prompts.py
```

Same problem class — older clones of `resonance-cloud` from various review/push/restore moments. Cleanup decision should likely apply to all of them as a single hygiene pass; flagging here so Sir Robert can decide whether to fold them into the same sweep.

---

## 2. Question-by-Question Findings

### Q1 — Are any of these files imported or executed by deployed code?

**No. None of the suspect files are imported or invoked by deployed code.**

Verification:

- **Grep `engines/image-engine` or `engines.image-engine` from `orchestrator/src/`:** zero import matches. The only mentions are in three docs (`INVESTIGATION_MAGRITTE_HISTORY.md`, `CLAUDE_CODE_QUALITY_INVESTIGATION.md`, `CODEX_CODE_QUALITY_INVESTIGATION.md`) and in `start-all-engines.bat` (a legacy local-dev launcher). Zero matches in `orchestrator/src/` Python sources or `orchestrator/cloud_engines/`.
- **Grep `image-engine.src` / `image_engine.src`:** zero matches anywhere in `orchestrator/`.
- **Grep `_spotcheck` / `_review_async` / `_review/`:** matches in two docs only (`docs/Stabilization/resonance_phase1_focus_stabilization_plan.md:101`, `REVIEW_REPORT_STAGE_2A.md`). Zero in source code.
- **Production dispatch path:** `orchestrator/Dockerfile.cloud:48` sets `ENV DISPATCH_MODE=direct`. `src/dispatcher.py:62-64` short-circuits when `DISPATCH_MODE=direct` to `from src.cloud_dispatcher import call_engine_direct`. `src/cloud_dispatcher.py:40-41` then does `from cloud_engines.image_engine.engine import generate_images`. The HTTP fallback (port 8082, defined at `dispatcher.py:17`) is never reached in cloud deployment.
- **`start-all-engines.bat`** *does* launch `engines/image-engine` on port 8082 for **local dev only**. It hasn't been git-touched since `abd89a5` (2026-03-26, "Restructure: monorepo — backend + frontend in single repo"). It's a developer convenience script, not part of the deployed runtime.

**Conclusion:** in deployment, the only file rendered as the system prompt is `orchestrator/cloud_engines/image_engine/prompts.py`. The Gateway Pattern fear is unfounded for the current deployment pipeline. Confirmed by recent farmer/Bauer image renderings being clean of the old MJ preamble — the Apr 28 fix shipped.

### Q2 — Are any of these files identical or near-identical to the deployed `prompts.py`?

**None are identical.** All five files have distinct MD5 hashes:

| Path | Size | mtime | MD5 |
|---|---:|---|---|
| `orchestrator/cloud_engines/image_engine/prompts.py` (ACTIVE) | 107,126 | 2026-04-28 20:20 | `eb6829da…62db56` |
| `engines/image-engine/src/prompts.py` | 96,307 | 2026-04-10 08:20 | `da1fa74a…6c09` |
| `_spotcheck/resonance-cloud/.../prompts.py` | 98,715 | 2026-04-21 23:53 | `d7ff4167…dfd0` |
| `_review_async/resonance-cloud/.../prompts.py` | 97,948 | 2026-04-14 17:09 | `9abda781…59ff` |
| `_review/resonance-cloud/.../prompts.py` | 102,972 | 2026-04-24 22:02 | `0535f869…8264` |

Function-signature evidence of evolution (line 17 in each):

- `engines/image-engine/src/prompts.py` and `_review_async/.../prompts.py`: signature ends `text_to_video: bool = False` (oldest).
- `_spotcheck/.../prompts.py`: adds `short_mode: bool = False` (added in `IMPLEMENTATION_PROMPT_SHORT_MODE_v2`).
- `_review/.../prompts.py`: adds `image_model: str = ""` (post-multi-model router work).
- ACTIVE `orchestrator/.../prompts.py`: latest, with all the above plus the editorial/cinematic body tightening from `b486bd4`.

**Each suspect file is an older snapshot of the active file**, frozen at the commit each clone was checked out at. They are stale, not divergent fork lines.

### Q3 — Is there a `.gitignore` or `CODEOWNERS` clue?

- **Repo root has no `.gitignore`** and is not a git repo at all (env: "Is a git repository: false").
- `orchestrator/.gitignore` does NOT mention `_review*`, `_spotcheck`, `_inspect`, `tmp/`, or `engines/`. There is nothing to ignore — these directories live *outside* the orchestrator git repo entirely.
- No `CODEOWNERS` files were located.
- The four suspect directories are siblings of `orchestrator/` at `D:/CODING/ResonanceTEST/`, so they're outside any tracked working tree from the active repo's perspective.

**Implication:** these directories were never tracked by the active repo. They're scratch space at the workspace root, not "files that drifted out of tracking."

### Q4 — What does Git history say?

No file inside these suspect directories has any commit history in the **active** repo (orchestrator's `.git/`), because they're outside it.

Each clone *does* have its own git history, frozen at the commit the clone was checked out at:

| Clone | HEAD commit | HEAD branch | HEAD date |
|---|---|---|---|
| `_review_async/resonance-cloud` | 24fc656 | `async-video-adapter` | 2026-04-14 18:39 |
| `_spotcheck/resonance-cloud` | 816243f | `main` | 2026-04-22 05:24 |
| `_review/resonance-cloud` | 16794e1 | `main` | 2026-04-26 01:30 |

Each clone's `.git/refs/heads/main` (or branch ref) hasn't moved since the clone was made — these clones are not being kept up-to-date. They are stale review snapshots.

`engines/image-engine/` has no git tracking at all. The most recent file mtime in `src/` is `renderer.py` at 2026-04-11. Nothing in that tree has been touched since the cloud cutover landed (`c45dbd4`, "feat: add cloud engine modules + direct dispatch mode", 2026-04-11).

### Q5 — Are there cross-references in documentation?

- **`engines/image-engine`** — referenced in three orchestrator docs (`INVESTIGATION_MAGRITTE_HISTORY.md`, `CLAUDE_CODE_QUALITY_INVESTIGATION.md`, `CODEX_CODE_QUALITY_INVESTIGATION.md`) and in `start-all-engines.bat`. The doc references are historical context (describing the local-era engine), not pointers to live use. The .bat references are still functional for local dev.
- **`_review_async`, `_spotcheck`, `_review`** — referenced only in:
  - `orchestrator/docs/Stabilization/resonance_phase1_focus_stabilization_plan.md:101`: "Verify whether `phase2b_push/`, `_review/`, `_spotcheck/`, `tmp/`, and similar folders are inactive snapshots." (already on Sir Robert's todo list)
  - `orchestrator/REVIEW_REPORT_STAGE_2A.md`: a review-process artifact

No documentation treats these directories as load-bearing.

---

## 3. Summary Table

| File path | Tracked in active repo? | Last touched (mtime) | Imported by deployed code? | Recommended option |
|---|---|---|---|---|
| `orchestrator/cloud_engines/image_engine/prompts.py` (ACTIVE) | ✅ yes (orchestrator git, HEAD = `b486bd4`) | 2026-04-28 | ✅ yes — only this file is rendered in production | **Keep — do not touch** |
| `engines/image-engine/src/prompts.py` | ❌ no (no git anywhere) | 2026-04-10 | ❌ no (only via `start-all-engines.bat` for local dev) | **Option B (archive)** |
| `_spotcheck/resonance-cloud/cloud_engines/image_engine/prompts.py` | ❌ no (own clone's git only) | 2026-04-21 | ❌ no | **Option A (delete entire `_spotcheck/`)** |
| `_review_async/resonance-cloud/cloud_engines/image_engine/prompts.py` | ❌ no (own clone's git only) | 2026-04-14 | ❌ no | **Option A (delete entire `_review_async/`)** |
| `_review/resonance-cloud/cloud_engines/image_engine/prompts.py` | ❌ no (own clone's git only) | 2026-04-24 | ❌ no | **Option A (delete entire `_review/`)** |
| `_inspect/` (no prompts file, but same convention) | ❌ no | 2026-04-22 | ❌ no | **Option A (delete entire `_inspect/`)** |

---

## 4. Per-File Recommendations and Rationale

### 4.1 `engines/image-engine/` — Recommended: Option B (move to `archive/`)

This is **not just a stray prompts file** — it's a complete legacy engine implementation (`engine.py`, `models.py`, `renderer.py`, `storyboard.py`, `wan_provider.py`, `prompt_compiler.py`, `tests/`, `ui/`, `ENGINE_IMAGE.md`, `README.md`, etc.). It represents the local-era architecture before the cloud cutover.

**Why archive instead of delete:**
- It's referenced by a still-runnable launcher (`orchestrator/start-all-engines.bat`) for local development. Deleting it silently breaks that workflow even though no production code depends on it.
- It contains divergent prompt iterations (a different `prompt_compiler.py` and a different `prompts.py`) that may be useful as historical reference if Sir Robert ever wants to compare creative direction prose against an earlier era.
- ~98 MB of which most is `.venv/` (delete-able separately if disk reclaim matters). The code itself is tiny.

**Why not keep as-is:**
- Future agents reading the codebase find both `engines/image-engine/src/prompts.py` and `orchestrator/cloud_engines/image_engine/prompts.py` and risk editing the wrong one (this audit was triggered by exactly that worry).

**Suggested form:** move `engines/image-engine/` to `archive/legacy-local-engines/image-engine/` and add a one-line README explaining when it was retired and that `orchestrator/cloud_engines/image_engine/` superseded it. Update or remove the `start-all-engines.bat` reference at the same time.

### 4.2 `_spotcheck/`, `_review/`, `_review_async/` — Recommended: Option A (delete)

These are independent git clones of `lokigod69/resonance-cloud.git` made for one-off code review sessions. They:
- Are not imported by any active code.
- Are not maintained — each is frozen at the commit the clone was made.
- Are easily recreated on demand (`git clone https://github.com/lokigod69/resonance-cloud.git _review` takes one command).
- Combined consume **~894 MB** of disk in the workspace root, polluting `find` output and creating import-confusion risk.
- Already flagged by the Stabilization plan as "verify whether these are inactive snapshots."

**No archive needed** — there's nothing in these clones that isn't already on GitHub at the same commit. Archiving stale clones of a still-live remote repo just moves the problem.

### 4.3 `_inspect/` — Recommended: Option A (delete)

Only contains a 207 KB `ltx-worker/` subdirectory — same pattern, smaller. Same rationale.

### 4.4 Out-of-scope shadow clones (mentioned but not recommended on)

`phase2b_push/`, `speak-scroll-fix-main/`, `watery-main/`, and the various `tmp/voxtral_*`, `tmp/phase2a_*`, `tmp/lyric-levels-*` directories all contain their own `cloud_engines/image_engine/prompts.py` snapshots. They are likely safe to delete by the same reasoning, but Sir Robert should confirm scope before any sweep — they were not part of the original audit prompt and may have specific significance the user wants preserved (e.g., diffing against a known-good revert point).

---

## 5. Recommended Cleanup Plan (if Sir Robert approves)

If a cleanup pass is desired, suggested order:

1. **Verify nothing is mid-flight** — confirm no in-progress review session is depending on `_review/` or `_spotcheck/`.
2. **Delete `_inspect/`** first (smallest, no `prompts.py` involved, lowest risk).
3. **Delete `_review_async/`** (oldest, on a defunct branch).
4. **Delete `_review/`, `_spotcheck/`** (most recent stale clones).
5. **Move `engines/image-engine/` → `archive/legacy-local-engines/image-engine/`** with a README.
6. **Update `orchestrator/start-all-engines.bat`** to either point at the archive path or remove the `images` line entirely (it's already moot under cloud dispatch).
7. **Optional:** widen the sweep to `phase2b_push/`, `speak-scroll-fix-main/`, `watery-main/`, `tmp/voxtral_*`, `tmp/phase2a_*`, `tmp/lyric-levels-main-review/` after a separate confirmation.
8. **Update `orchestrator/docs/Stabilization/resonance_phase1_focus_stabilization_plan.md:101`** to mark this verification item complete (or hand the result back to whoever owns that doc).

**Estimated reclaim:** ~994 MB from the four `_*` directories alone, ~98 MB more from `engines/image-engine/.venv/` if archived without it, much more if the `tmp/` and `*-main/` clones are folded in.

**Risk profile:** essentially zero risk to production. The deployed image-engine path is `orchestrator/cloud_engines/image_engine/prompts.py` and that file is untouched. The only behavioral change is that the local-dev `start-all-engines.bat` workflow needs its image-engine line updated (or removed) — but that's already a vestigial workflow nobody invokes in cloud-mode dev.

---

## 6. Key Caveat / Active-vs-Stale Confirmation

The recent farmer/Bauer rendering quality (clean of the old MJ preamble that earlier fixes targeted) **confirms the cloud path renders the active file** — so the immediate concern that motivated this audit (a Gateway Pattern silently hiding fixes) is **not occurring**. Cleanup here is hygiene, not bug fix.

Where this could break in the future:
- If anyone re-enables `DISPATCH_MODE=http` (or unsets it, which falls back to `http` per `dispatcher.py:62`) and runs `start-all-engines.bat` locally, then the local Image Engine on port 8082 *would* be hit, using the older `engines/image-engine/src/prompts.py`. That's a local-dev divergence, not a production one — but the gap exists.
- If a reviewer or agent ever edits `_review*/resonance-cloud/cloud_engines/image_engine/prompts.py` thinking it's the active file, their changes would silently land in a frozen clone that nothing reads. Wasted work, no production impact.

Both risks resolve with the cleanup plan in §5.

---

## Out of Scope (Honored)

- No prompts files in non-image engines (concept_engine, song_engine, etc.) were investigated.
- No files were modified, moved, or deleted.
- The active `orchestrator/cloud_engines/image_engine/prompts.py` was not touched.
- No `.gitignore` was edited.

Awaiting direction before any cleanup is executed.
