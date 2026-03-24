# Investigation Report: Assembly Trim / Post-Assembly Editor Feature

**Date:** March 17, 2026
**Type:** Investigation + Architectural Proposal
**Status:** NO CODE CHANGES — analysis only

---

## 1. Current Assembly Take Structure

### 1.1 Folder Structure on Disk

Assembly output lives at `workspace/{word_slug}/final/{version_folder}/`:

```
workspace/
└── frosch/
    └── final/
        └── clean-001_20260305T140406/
            ├── final.mp4          (6.62 MB — the assembled video)
            └── generation-meta.json
```

**Naming convention:** `{assembly_mode}-{NNN}_{ISO_timestamp}`
- `assembly_mode`: from settings (e.g., "clean", "pedagogic")
- `NNN`: auto-incrementing counter per mode per word
- Timestamp: UTC, format `YYYYMMDDTHHMMSS`

### 1.2 generation-meta.json Contents (Real Example)

From `frosch/final/clean-001_20260305T140406/generation-meta.json`:

```json
{
  "status": "success",
  "engine": "assembly-engine",
  "engine_version": "0.1.0",
  "timestamp": "2026-03-05T14:04:06Z",
  "duration_seconds": 6.52,
  "context": {
    "word": "Frosch",
    "language": "German",
    "translation": "terrible joke (literally: frog)"
  },
  "inputs": {
    "song_version": "run-003_20260305T110115/take_001.flac",
    "video_version": "ltx-003_20260305T124047",
    "video_clips_used": ["scene_001.mp4"],
    "settings_used": {
      "assembly_mode": "clean",
      "gap_strategy": "ping_pong",
      "overflow_strategy": "trim",
      "transition": "cut",
      "transition_duration": 0.5,
      "silence_trim": true,
      "silence_threshold_db": -40.0,
      "lufs_normalize": true,
      "target_lufs": -14.0,
      "word_card_duration": 2.0,
      "word_card_font": "Noto Sans",
      "word_card_font_size": 72,
      "word_card_color": "auto",
      "word_card_show_translation": false,
      "video_codec": "libx264",
      "video_preset": "slow",
      "video_crf": 18,
      "audio_codec": "aac",
      "audio_bitrate": "192k",
      "output_resolution": "720p",
      "output_fps": 25
    }
  },
  "outputs": {
    "primary": "final.mp4",
    "format": "mp4",
    "duration_seconds": 29.79,
    "resolution": "1280x720",
    "file_size_bytes": 6618819
  },
  "assembly_report": {
    "original_song_duration": 30.0,
    "trimmed_silence_start": 0.0,
    "trimmed_silence_end": 0.21,
    "effective_song_duration": 29.79,
    "total_clip_duration": 5.38,
    "gap_seconds": 24.41,
    "gap_strategy_applied": "ping_pong",
    "original_lufs": -13.68,
    "normalized_lufs": -14.0,
    "word_card_intro_duration": 0.0,
    "word_card_outro_duration": 0.0,
    "clips_trimmed": false,
    "clips_looped": true
  },
  "reproducibility": {
    "ffmpeg_version": "8.0-essentials_build-www.gyan.dev"
  }
}
```

### 1.3 How the Backend Registers a New Assembly Take

**Flow** (5 steps across 3 files):

1. **Label generation** — `workspace.py:make_version_label()` computes `clean-001` by scanning existing directories for the next counter.

2. **Directory creation** — `workspace.py:create_version_dir()` creates `final/clean-001_20260305T140406/` with timestamp.

3. **Payload building** — `pipeline.py:build_assembly_payload()` constructs the engine payload with `content`, `settings`, `output_dir`, and `metadata`.

4. **Engine call** — `pipeline.py` calls `await call_engine('assembly', payload)` which POSTs to `http://localhost:8085/run`.

5. **Manifest update** — On success: `add_lineage()` appends a lineage entry, then `update_selection()` sets `manifest.selected.final` to the new version name.

### 1.4 Manifest Tracking for Assembly

**Selection field:** `manifest.selected.final` (mapped from stage name "assembly" via `_STAGE_TO_SELECTED = {'assembly': 'final'}`).

**Lineage entry example** from `frosch/manifest.json`:
```json
{
  "stage": "assembly",
  "version": "clean-001_20260305T140406",
  "from": {
    "song": "run-003_20260305T110115/take_001.flac",
    "video": "ltx-003_20260305T124047"
  },
  "settings_snapshot": { "assembly_mode": "clean", "..." : "..." },
  "timestamp": "2026-03-05T14:04:13Z",
  "status": "success"
}
```

### 1.5 Frontend Assembly Display

**Component:** `frontend/src/components/stages/AssemblyPanel.tsx`

- Receives `detail.stages.final.versions` (array of `{version, files[], selected}`) from the parent `StagePanel`
- Fetches `generation-meta.json` for each version via `GET /api/words/{slug}/stages/assembly/{version}/meta`
- Renders each take as a card with metadata pills (mode, duration, resolution, file size), a video player, download button, and delete button

### 1.6 Download and Delete Wiring

| Button | Mechanism | Backend Endpoint |
|--------|-----------|------------------|
| **Download** | `<a href={mediaUrl(...)} download>` — native browser download | `GET /api/media/{slug}/final/{version}/final.mp4` → `FileResponse` |
| **Delete** | `deleteVersion(slug, 'assembly', version)` → `onRefresh()` | `DELETE /api/words/{slug}/versions/assembly/{version}` → removes folder + manifest entry |

Delete also clears `manifest.selected.final` if the deleted version was the selected one, and removes the corresponding lineage entry.

---

## 2. Assembly Engine API Surface

**Engine location:** `d:/CODING/ResonanceWorkspace/engines/assembly-engine/`
**Port:** 8085
**Framework:** FastAPI (via `ui/app.py`)

### 2.1 All Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/run` | Main assembly endpoint (orchestrator standard) |
| POST | `/assemble` | Alias for `/run` |
| POST | `/upload/song` | Upload song file (testing UI) |
| POST | `/upload/clip` | Upload video clip (testing UI) |
| POST | `/probe/fps` | Probe video file for frame rate |
| GET | `/` | HTML testing UI |
| GET | `/health` | FFMPEG availability check |
| GET | `/output/{filename}` | Serve files from last output (testing) |
| GET | `/download/final.mp4` | Download last assembled MP4 (testing) |
| GET | `/history` | In-memory assembly history |
| GET | `/history/{idx}/final.mp4` | Download from history entry |

### 2.2 `/run` Payload and Response Schema

**Request (AssemblyPayload):**
```json
{
  "content": {
    "song_path": "string — full path to audio file",
    "video_clips": ["string — list of MP4 paths"],
    "word": "string",
    "translation": "string",
    "language": "string",
    "language_code": "string"
  },
  "settings": {
    "assembly_mode": "clean|pedagogic",
    "gap_strategy": "ping_pong|loop|fade_black|freeze_ken_burns|word_card",
    "overflow_strategy": "trim|fade_audio_black",
    "transition": "cut|crossfade|dip_black",
    "transition_duration": 0.5,
    "silence_trim": true,
    "silence_threshold_db": -40.0,
    "lufs_normalize": true,
    "target_lufs": -14.0,
    "word_card_duration": 2.0,
    "word_card_font": "Noto Sans",
    "word_card_font_size": 72,
    "word_card_color": "auto",
    "word_card_show_translation": false,
    "video_codec": "libx264|libx265",
    "video_preset": "medium|slow|slower|veryslow",
    "video_crf": 18,
    "audio_codec": "aac|libopus",
    "audio_bitrate": "192k",
    "output_resolution": "720p|1080p|4k",
    "output_fps": 25
  },
  "output_dir": "string — directory to write output",
  "metadata": {
    "word": "string",
    "language": "string",
    "translation": "string",
    "timestamp": "string — ISO 8601",
    "song_version": "string|null",
    "video_version": "string|null"
  }
}
```

**Response (AssemblyResult):**
```json
{
  "status": "success|failed",
  "output_paths": ["final.mp4"],
  "error": null | { "message": "string", "retryable": true, "type": "validation_error|generation_error|unexpected_error" }
}
```

### 2.3 Existing Trim/Cut Functionality

The engine has **two internal trim functions** used during assembly, but **no external trim endpoint**:

- `video.py:apply_overflow_trim()` — trims video clips to fit within song duration (uses `ffmpeg -t` with stream copy)
- `gaps.py:_trim_clip()` — trims clips during gap-fill operations (also `ffmpeg -t` with stream copy)

Both use FFMPEG's `-t` flag with `-c copy` (no re-encode, fast).

### 2.4 FFMPEG Capabilities Already Available

The engine has extensive FFMPEG usage:

| Operation | FFMPEG Feature | Location |
|-----------|---------------|----------|
| Media probing | `ffprobe` | `ffmpeg_builder.py` |
| Silence detection | `silencedetect` filter | `audio.py` |
| Audio trimming | `-ss`, `-to` flags | `audio.py` |
| LUFS normalization | `loudnorm` filter (2-pass) | `audio.py` |
| Video scaling | `scale`, `pad`, `setsar` filters | `video.py` |
| Stream-copy trim | `-t` flag with `-c copy` | `video.py`, `gaps.py` |
| Concatenation | concat demuxer | `video.py` |
| Crossfade transitions | `xfade` filter | `video.py` |
| Video reversal | `reverse` filter | `gaps.py` |
| Fade to black | `fade` filter | `gaps.py` |
| Ken Burns zoom | `zoompan` filter | `gaps.py` |
| Still image → video | `-loop 1` | `word_card.py` |
| Final mux | `-shortest`, `-movflags +faststart` | `video.py` |

---

## 3. Orchestrator Backend API Surface (Assembly-Related)

### 3.1 All Assembly-Related Routes

| Method | Path | Purpose | File:Line |
|--------|------|---------|-----------|
| POST | `/api/words/{slug}/run/assembly` | Run assembly stage | `app.py:512` |
| PUT | `/api/words/{slug}/select/assembly` | Select assembly version | `app.py:311` |
| DELETE | `/api/words/{slug}/versions/assembly/{version}` | Delete assembly version | `app.py:541` |
| GET | `/api/words/{slug}/stages/assembly/{version}/meta` | Get generation-meta.json | `app.py:896` |
| GET | `/api/media/{slug}/final/{version}/final.mp4` | Serve assembled MP4 | `app.py:927` |
| GET | `/api/words/{slug}` | Full word detail (includes final versions) | `app.py:1050` |

### 3.2 Output Directory Creation

`workspace.py:create_version_dir()` creates the directory:
```python
def create_version_dir(stage_dir: Path, label: str) -> tuple[Path, str]:
    ts = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
    version_name = f"{label}_{ts}"
    version_dir = stage_dir / version_name
    version_dir.mkdir(parents=True, exist_ok=True)
    return version_dir, version_name
```

For assembly, `stage_dir` is `workspace/{slug}/final/`, and `label` comes from `make_version_label()` which computes `{assembly_mode}-{NNN}`.

### 3.3 Manifest Update After Assembly

Two operations in `pipeline.py:530-547`:
1. `add_lineage(word_dir, 'assembly', version_name, {"song": song_version, "video": video_version}, settings, status)` — always runs
2. `update_selection(word_dir, 'final', version_name)` — only on success

### 3.4 Existing Re-Run / Regenerate Pattern

**Yes — concept editing** (`app.py:571-599`) provides a model:
- Reads original version
- Creates new version with `-edit_{timestamp}` suffix
- Adds lineage entry with `{"edited_from": original_version}`
- Does NOT auto-select (user must select manually)

This pattern maps directly to a trim operation:
- Read original assembly take path
- Create new take folder with trim-specific naming
- Call engine to perform trim
- Add lineage entry with `{"trimmed_from": original_version}`
- Auto-select the new version

### 3.5 Dispatcher Pattern

`dispatcher.py:call_engine()`:
1. Health check: `GET http://localhost:8085/health` (5s timeout)
2. Payload POST: `POST http://localhost:8085/run` (120s timeout)
3. Returns `response.json()` — check `status` field, not HTTP code
4. 422 = bad payload (orchestrator bug), all other responses are 200

---

## 4. Orchestrator Frontend — Assembly Section

### 4.1 Component: AssemblyPanel.tsx

`frontend/src/components/stages/AssemblyPanel.tsx` (106 lines) renders the full assembly section. Each take is a card containing:
- Version label (e.g., `clean-001_20260305T140406`)
- Metadata pills (mode, duration, resolution, file size)
- Download link (`<a download>`)
- Delete button (hover-reveal, with spinner)
- HTML5 `<video>` player

### 4.2 Video Player

Native HTML5 `<video>` element with browser controls:
```tsx
<video
  controls
  className="w-full rounded border border-[var(--border)]"
  src={mediaUrl(slug, `final/${v.version}/final.mp4`)}
/>
```

- Exposes `currentTime` and `duration` via DOM API
- Can be controlled via `useRef<HTMLVideoElement>` (proven pattern in `AudioPlayer.tsx`)
- The existing `AudioPlayer.tsx` component implements a full custom seekbar with drag-to-seek using `setPointerCapture`, which can be adapted for video trim handles

### 4.3 State Management

- Takes list comes from parent props: `detail.stages.final.versions` (fetched in `App.tsx` via `getWord(slug)`)
- Local state: `meta` (generation-meta.json cache), `deletingVer` (loading indicator)
- No global state store — React props + useState throughout

### 4.4 Data Refresh Pattern

- **During pipeline run:** Polling every 1.5s via `setInterval` in `App.tsx`
- **After manual stage run:** `await runStage(slug, stage)` then `await onRefresh()` (which calls `loadWordDetail`)
- **After delete:** `await deleteVersion(...)` then `await onRefresh()`

New takes appear immediately after the API call completes — no WebSocket needed.

### 4.5 Available UI Patterns and Libraries

**Modal pattern** (from `AddWordModal.tsx`): Fixed overlay with `bg-black/60`, centered panel, close button, stop-propagation on inner click.

**Collapsible pattern** (from `CollapsibleRun.tsx`): Expand/collapse with chevron, hover-reveal actions.

**Libraries:**
- `@radix-ui/react-dialog` — Accessible modal (already installed)
- `lucide-react` — Icons (Scissors, Crop, etc. available)
- `clsx` — Conditional classnames
- No slider/range library — will need custom implementation (AudioPlayer.tsx provides the seekbar pattern)

---

## Architectural Proposal

### A. Where Does the Trim Logic Live?

**Recommendation: Option 3 — Hybrid (Assembly Engine `/trim` endpoint)**

Rationale:
- FFMPEG operations belong in the Assembly Engine. The orchestrator should not know about encoding settings, codec flags, or FFMPEG invocation. This is the separation of concerns established throughout the project.
- The engine already has `ffmpeg_builder.py` with `run_ffmpeg()`, `probe_media()`, and all the infrastructure for reliable FFMPEG execution (error handling, path normalization, logging).
- The engine already trims clips internally (`-t` with `-c copy`). A `/trim` endpoint is a thin wrapper around this proven capability.
- The orchestrator's role stays clean: create output directory, send payload, register result in manifest. Exactly the same pattern as normal assembly.
- The engine remains stateless: it receives source path, trim points, and output directory — processes — returns result. No manifest access needed.

**Why not Option 1 (pure engine)?** It IS Option 1. "Hybrid" just clarifies that the orchestrator still handles directory creation and manifest updates, which is already how everything works.

**Why not Option 2 (orchestrator FFMPEG)?** The orchestrator has zero FFMPEG code today. Adding FFMPEG to the orchestrator breaks architectural boundaries, requires FFMPEG installation verification in the orchestrator, duplicates the engine's FFMPEG wrapper, and creates a maintenance burden when encoding settings change.

### B. How Should the Trimmed Version Be Identified?

**Recommendation: `trim-001_20260317T100000/` (new prefix)**

Rationale:
- Preserves the existing `{mode}-{NNN}_{timestamp}` naming convention exactly
- `trim` becomes a pseudo-mode prefix, just like `clean` or `pedagogic`
- The counter auto-increments per word: `trim-001`, `trim-002`, etc.
- No changes needed to `create_version_dir()` or `make_version_label()` — just pass `"trim"` as the label prefix
- The version folder is distinguishable at a glance in file explorers and the UI
- Sorting, listing, selection, download, and deletion all work unchanged because they operate on folder names, not on mode prefixes

**Why not append `-trimmed`?** It breaks the `{mode}-{NNN}_{timestamp}` pattern. Code that parses the mode from the folder name (splitting on `-`) would get confused. It also makes the folder name longer and harder to read.

**Why not just use generation-meta.json?** The folder name should be self-documenting. Users browse workspace folders directly sometimes. `trim-001_*` is immediately clear.

### C. Proposed `generation-meta.json` for a Trim

```json
{
  "status": "success",
  "engine": "assembly-engine",
  "engine_version": "0.1.0",
  "timestamp": "2026-03-17T10:00:00Z",
  "duration_seconds": 1.23,
  "context": {
    "word": "Frosch",
    "language": "German",
    "translation": "terrible joke (literally: frog)"
  },
  "source": "trim",
  "trim_info": {
    "source_version": "clean-001_20260305T140406",
    "source_file": "final.mp4",
    "original_duration_seconds": 29.79,
    "trim_start_seconds": 0.0,
    "trim_end_seconds": 27.5,
    "trimmed_duration_seconds": 27.5,
    "cut_regions": []
  },
  "inputs": {
    "source_version": "clean-001_20260305T140406",
    "settings_used": {
      "video_codec": "libx264",
      "video_preset": "slow",
      "video_crf": 18,
      "audio_codec": "aac",
      "audio_bitrate": "192k"
    }
  },
  "outputs": {
    "primary": "final.mp4",
    "format": "mp4",
    "duration_seconds": 27.5,
    "resolution": "1280x720",
    "file_size_bytes": 5900000
  },
  "reproducibility": {
    "ffmpeg_version": "8.0-essentials_build-www.gyan.dev",
    "ffmpeg_command": "ffmpeg -y -ss 0.0 -to 27.5 -i source.mp4 -c:v libx264 -preset slow -crf 18 -c:a aac -b:a 192k -movflags +faststart output.mp4"
  }
}
```

**Key design decisions:**
- `"source": "trim"` at the top level distinguishes this from a normal assembly (`"source"` is absent or `"assembly"` in regular takes)
- `trim_info` records everything needed to understand and reproduce the trim
- `trim_start_seconds` / `trim_end_seconds` define the kept region (not the removed region)
- `cut_regions` is an empty array for v1 (reserved for v2 middle-cut feature)
- `inputs.source_version` records lineage
- `outputs` follows the same structure as regular assembly metadata
- `reproducibility.ffmpeg_command` records the exact command for debugging

### D. Frontend Trim UI Design

**Recommendation: Inline expansion (not modal)**

The assembly panel already renders each take as a card. The trim UI should expand inline below the video player when the user clicks Edit, keeping the user's context. A modal would hide the takes list and feel disconnected.

**V1 UI specification:**

1. **Edit button** — appears next to Download and Delete in the action bar:
   ```
   [Download] [✂ Edit] [🗑]
   ```
   Uses Scissors icon from lucide-react.

2. **Trim panel** — expands below the video when Edit is clicked:
   ```
   ┌─────────────────────────────────────────────┐
   │ [video player - native controls]             │
   ├─────────────────────────────────────────────┤
   │ Trim                                    [X] │
   │                                             │
   │  ┌──|████████████████████████|───────┐      │
   │  0:00  [drag handle]    [drag handle]  0:30 │
   │                                             │
   │  Start: [00:00.0]    End: [00:27.5]         │
   │  Duration: 00:27.5 (trimmed 2.3s)           │
   │                                             │
   │  [Preview Trim]  [Save as New Version]      │
   └─────────────────────────────────────────────┘
   ```

3. **Components of the trim panel:**
   - **Timeline bar** with two drag handles (start and end) — built using the same pointer-capture pattern from `AudioPlayer.tsx`
   - **Trimmed regions** shown as darker/grayed overlay on the timeline
   - **Numeric inputs** for precise timecode entry (seconds with 1 decimal)
   - **Preview Trim** button: seeks the video to `trim_start` and plays to `trim_end`, then pauses (uses `video.currentTime` and a `timeupdate` listener)
   - **Save as New Version** button: calls `POST /api/words/{slug}/trim/assembly` with trim points, shows spinner, refreshes takes list on completion
   - **Close button** (X): collapses the trim panel

4. **Video player integration:**
   - When trim panel is open, replace the native `<video controls>` with a controlled video player (ref-based, like AudioPlayer)
   - Clicking on the timeline seeks the video to that position
   - The trim handles sync with the video position for visual feedback
   - Grayed regions outside the trim handles indicate what will be removed

**Middle-cut feature: DEFER TO V2**

Rationale:
- Start/end trim covers the stated use cases (audio glitch at end, looping artifact at end, unwanted section at beginning)
- Middle-cut requires significantly more complex UI: adding/removing cut regions, visualizing multiple segments, handling edge cases where cuts overlap
- The data structure supports it (the `cut_regions` array in generation-meta.json), so the backend is ready when v2 comes
- The FFMPEG command for middle-cut is more complex (concat demuxer with multiple segments) but the engine already has concat infrastructure

### E. Impact Assessment

#### Assembly Engine Files

| File | Change | Type |
|------|--------|------|
| `ui/app.py` | Add `POST /trim` endpoint (and `/run` alias detection) | **Additive** |
| `src/models.py` | Add `TrimPayload` and `TrimSettings` Pydantic models | **Additive** |
| `src/engine.py` | Add `trim_video()` function | **Additive** |
| `src/video.py` | Add `trim_with_reencode()` function (FFMPEG trim with encoding settings) | **Additive** |

No existing code modified. All changes are new functions/endpoints.

#### Orchestrator Backend Files

| File | Change | Type |
|------|--------|------|
| `src/app.py` | Add `POST /api/words/{slug}/trim/assembly` endpoint | **Additive** |
| `src/pipeline.py` | Add `build_trim_payload()` function | **Additive** |
| `src/workspace.py` | No changes needed — `create_version_dir()` and `make_version_label()` already handle arbitrary label prefixes. The trim endpoint will pass `"trim"` as the assembly_mode, and the existing `get_next_run_number()` will find the right counter. | **None** |
| `src/manifest.py` | No changes needed — `add_lineage()` and `update_selection()` already work generically. The trim endpoint uses `from_versions={"trimmed_from": original_version}`. | **None** |
| `src/dispatcher.py` | Possibly add a `call_engine_endpoint()` variant that calls `/trim` instead of `/run`, OR add the trim endpoint as an alias on `/run` in the engine. | **Additive** (minor) |
| `src/settings.py` | No changes needed — trim settings come from the UI, not from batch defaults. | **None** |

#### Orchestrator Frontend Files

| File | Change | Type |
|------|--------|------|
| `frontend/src/components/stages/AssemblyPanel.tsx` | Add Edit button, trim panel state, and inline TrimEditor component | **Modification** |
| `frontend/src/components/stages/TrimEditor.tsx` | **New file** — trim panel with timeline, handles, inputs, and save button | **New** |
| `frontend/src/api.ts` | Add `trimAssembly(slug, version, trimStart, trimEnd)` function | **Additive** |

#### Documentation Files

| File | Change | Type |
|------|--------|------|
| `ENGINE_ASSEMBLY.md` | Add `/trim` endpoint specification | **Additive** |

### F. Edge Cases

| Edge Case | Handling |
|-----------|----------|
| **Trim to 0 seconds** | Frontend validation: minimum 1 second after trim. Disable Save button if `trim_end - trim_start < 1.0`. |
| **Trim of a trim** | Works naturally. The Edit button appears on all assembly takes including trimmed ones. `generation-meta.json` records `source_version` pointing to the previous trim. Lineage chain: `clean-001` → `trim-001` → `trim-002`. |
| **Delete original, keep trim** | Works. `remove_version()` clears selection if needed. The trim's `generation-meta.json` still references the original's name for lineage, but this is metadata — the trim is a standalone MP4. |
| **Manifest selection after trim** | Auto-select the new trim version (same behavior as normal assembly). User can switch back by selecting the original. |
| **Fractional seconds** | FFMPEG handles fractional seconds natively. Frontend inputs allow 1 decimal place (e.g., 27.5). Backend passes float values directly to FFMPEG's `-ss` and `-to` flags. |
| **Minimum duration** | 1 second. Enforced in both frontend (disable Save button) and backend (validation in trim endpoint returns 400). |
| **Trim start >= trim end** | Frontend: impossible due to handle constraints. Backend: validation returns 400. |
| **Source file missing** | Backend checks `source_path.exists()` before calling engine. Returns 404 if missing. |
| **Engine unreachable** | Same pattern as normal assembly — health check fails, returns clear error message. |
| **Concurrent trims** | Each trim creates its own output directory with a unique timestamp. No conflict possible. |

### G. FFMPEG Trim Command

For the engine's `/trim` endpoint, the core FFMPEG command:

**With re-encode (preserves quality settings, accurate to frame):**
```bash
ffmpeg -y -ss {trim_start} -to {trim_end} -i {source} \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p \
  -c:a aac -b:a 192k \
  -movflags +faststart \
  {output}
```

**With stream copy (fast, but cut points may be inaccurate on non-keyframes):**
```bash
ffmpeg -y -ss {trim_start} -to {trim_end} -i {source} \
  -c copy \
  -movflags +faststart \
  {output}
```

**Recommendation:** Default to re-encode for accuracy. The source is typically 20-30 seconds — re-encoding takes a few seconds with `libx264 -preset slow`. Offer stream-copy as an advanced option in v2 if speed becomes a concern.

### H. API Contract for Trim Endpoint

**Orchestrator → Engine:**

`POST http://localhost:8085/trim`

```json
{
  "source_path": "D:/CODING/ResonanceWorkspace/workspace/frosch/final/clean-001_20260305T140406/final.mp4",
  "trim_start": 0.0,
  "trim_end": 27.5,
  "output_dir": "D:/CODING/ResonanceWorkspace/workspace/frosch/final/trim-001_20260317T100000",
  "settings": {
    "video_codec": "libx264",
    "video_preset": "slow",
    "video_crf": 18,
    "audio_codec": "aac",
    "audio_bitrate": "192k"
  },
  "metadata": {
    "word": "Frosch",
    "language": "German",
    "translation": "terrible joke (literally: frog)",
    "timestamp": "2026-03-17T10:00:00Z",
    "source_version": "clean-001_20260305T140406"
  }
}
```

**Engine → Orchestrator (Response):**

```json
{
  "status": "success",
  "output_paths": ["final.mp4"],
  "error": null
}
```

Same response schema as the existing `/run` endpoint. Engine writes `final.mp4` + `generation-meta.json` to `output_dir`.

**Orchestrator Frontend → Backend:**

`POST /api/words/{slug}/trim/assembly`

```json
{
  "source_version": "clean-001_20260305T140406",
  "trim_start": 0.0,
  "trim_end": 27.5
}
```

**Backend → Frontend (Response):**

```json
{
  "stage": "assembly",
  "version": "trim-001_20260317T100000",
  "result": { "status": "success", "output_paths": ["final.mp4"], "error": null }
}
```

Same response shape as `run_stage()` returns, so the frontend can handle it identically.

---

## Summary

The trim feature fits cleanly into the existing architecture. It requires:
- **1 new engine endpoint** (`/trim`) with ~50 lines of code
- **1 new orchestrator endpoint** (`POST /api/words/{slug}/trim/assembly`) with ~40 lines
- **1 new React component** (`TrimEditor.tsx`) with ~150-200 lines
- **Minor modifications** to `AssemblyPanel.tsx` (add Edit button + state for trim panel visibility)
- **1 new API function** in `api.ts` (~5 lines)

All existing behavior is preserved. No existing code needs modification beyond adding the Edit button to the assembly panel's action bar.
