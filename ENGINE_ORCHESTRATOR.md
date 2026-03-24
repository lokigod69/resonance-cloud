# ENGINE_ORCHESTRATOR.md — The Resonance Orchestrator

**Version:** 1.0  
**Date:** March 4, 2026  
**Status:** Ready for development  
**Companion to:** RESONANCE_MASTER_ABSTRACT_v1.md (read that first)  
**Engine abstracts:** ENGINE_CONCEPT.md, ENGINE_SONG_v1.1.md, ENGINE_IMAGE.md, ENGINE_VIDEO.md, ENGINE_ASSEMBLY.md  

---

## 1. What the Orchestrator Is

The orchestrator is the DAW interface for the Resonance Workspace. It is the only component the user interacts with during production. It owns the workspace: creating word folders, importing CSVs, writing manifests, dispatching engine calls, and tracking versions.

It is a **FastAPI web application** with a browser-based UI. The user opens it in their browser, imports a word list, configures settings, and runs the pipeline. The orchestrator calls each engine over HTTP via their `POST /run` endpoints.

### 1.1 What the Orchestrator Is NOT

- It is NOT an engine. It does not generate content (no audio, no images, no video).
- It does not contain any AI/ML models or make any LLM calls.
- It does not process or transform engine outputs (no audio normalization, no image editing).
- It does not replace the engine test UIs — those continue to work independently for development.

### 1.2 What the Orchestrator Owns Exclusively

- Workspace folder creation and structure
- CSV import and word registration
- `manifest.json` read/write (engines never touch manifests)
- `settings-defaults.json` management
- `workspace-meta.json` creation
- Settings inheritance (merge batch defaults + per-word overrides)
- Engine dispatch sequencing (which engine to call, in what order)
- Version registration and selection tracking
- Lineage recording (what produced what)

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────┐
│               ORCHESTRATOR (port 8090)           │
│  FastAPI + Browser UI                            │
│                                                  │
│  ┌──────────┐  ┌──────────┐  ┌───────────────┐  │
│  │ CSV      │  │ Manifest │  │ Engine        │  │
│  │ Import   │  │ Manager  │  │ Dispatcher    │  │
│  └──────────┘  └──────────┘  └───────┬───────┘  │
│                                      │           │
└──────────────────────────────────────┼───────────┘
                                       │ HTTP POST /run
                     ┌─────────────────┼─────────────────┐
                     │                 │                  │
              ┌──────▼──────┐   ┌──────▼──────┐   ┌──────▼──────┐
              │ Concept     │   │ Song Engine │   │ Image       │
              │ Engine      │   │ port 8000   │   │ Engine      │
              │ port 8080   │   │             │   │ port 8082   │
              └─────────────┘   └─────────────┘   └─────────────┘
              ┌──────▼──────┐   ┌──────▼──────┐
              │ Video       │   │ Assembly    │
              │ Engine      │   │ Engine      │
              │ port 8086   │   │ port 8085   │
              └─────────────┘   └─────────────┘
```

### 2.1 Engine Registry

| Engine    | Port | Endpoint      | Timeout | Notes                                    |
|-----------|------|---------------|---------|------------------------------------------|
| Concept   | 8080 | POST /run     | 30s     | Single LLM call, fast                    |
| Song      | 8000 | POST /run     | 300s    | 60-180s per call depending on batch_size |
| Image     | 8082 | POST /run     | 120s    | LLM storyboard + image rendering         |
| Video     | 8086 | POST /run     | 180s    | Ken Burns is fast; cloud modes are slow  |
| Assembly  | 8085 | POST /run     | 120s    | FFMPEG encoding                          |

The orchestrator checks engine health at startup by calling `GET /health` on each engine (where available). Engines that are unreachable are flagged in the UI but don't prevent the orchestrator from starting — the user may only need some engines for their current task.

---

## 3. The Pipeline — Step by Step

The orchestrator processes one word at a time through five stages. The stages run **sequentially** (no parallelism in the MVP).

```
CSV Import
    │
    ▼
┌─────────────────┐
│ STAGE 1: CONCEPT │  Concept Engine (port 8080)
│ Input: word +    │  Output: concept artifact JSON
│ language +       │  (lyrics + music_caption + visual_hint)
│ settings         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ STAGE 2: SONG   │  Song Engine (port 8000)
│ Input: lyrics +  │  Output: 1-8 FLAC takes
│ music_caption    │  ★ USER SELECTS BEST TAKE ★
│ from concept     │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ STAGE 3: IMAGE  │  Image Engine (port 8082)
│ Input: word +    │  Output: PNG images + storyboard.json
│ context from     │
│ concept          │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ STAGE 4: VIDEO  │  Video Engine (port 8086)
│ Input: image     │  Output: MP4 clip per image
│ path + video     │  Called ONCE PER IMAGE
│ prompt from      │
│ storyboard       │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ STAGE 5: FINAL  │  Assembly Engine (port 8085)
│ Input: song path │  Output: final.mp4
│ + video clips    │
│ + word info      │
└─────────────────┘
```

### 3.1 Stage 1 → Stage 2: Concept to Song

The orchestrator reads the selected concept artifact JSON file and extracts `lyrics` and `music_caption`. These become the Song Engine's required input fields.

```python
# Pseudocode
concept = read_json(f"{word_dir}/concept/{selected_concept_file}")
song_payload = {
    "content": {
        "word": manifest["word_original"],
        "translation": manifest["translation"],
        "language": manifest["language"],
        "language_code": manifest["language_code"],
        "lyrics": concept["lyrics"],           # from concept artifact
        "music_caption": concept["music_caption"]  # from concept artifact
    },
    "settings": merged_settings["song"],
    "output_dir": f"{word_dir}/songs/{version_label}/",
    "metadata": {
        "word": manifest["word_original"],
        "language": manifest["language"],
        "translation": manifest["translation"],
        "timestamp": now_iso(),
        "concept_version": selected_concept_version
    }
}
```

**After Song Engine returns:** The response contains `output_paths` listing the FLAC takes (e.g., `["take_001.flac", "take_002.flac", "take_003.flac", "take_004.flac"]`). The orchestrator registers these in the manifest and **pauses for user selection**. The UI shows audio players for each take. The user listens and selects the best one. The pipeline does not continue until a take is selected.

### 3.2 Stage 1 → Stage 3: Concept to Image

The orchestrator reads the concept artifact and passes relevant fields as context. The Image Engine also receives enrichment data (mnemonic, etymology) from the manifest if available.

```python
# Pseudocode
image_payload = {
    "content": {
        "word": manifest["word_original"],
        "translation": manifest["translation"],
        "language": manifest["language"],
        "language_code": manifest["language_code"]
    },
    "context": {
        "visual_hint": concept.get("visual_hint"),
        "lyrics": concept.get("lyrics"),
        "music_caption": concept.get("music_caption"),
        "mnemonic": manifest["enrichment"].get("mnemonic"),
        "etymology": manifest["enrichment"].get("etymology")
    },
    "settings": merged_settings["images"],
    "output_dir": f"{word_dir}/images/{version_label}/",
    "metadata": {
        "word": manifest["word_original"],
        "language": manifest["language"],
        "translation": manifest["translation"],
        "timestamp": now_iso(),
        "concept_version": selected_concept_version
    }
}
```

### 3.3 Stage 3 → Stage 4: Image to Video

The orchestrator reads `storyboard.json` from the Image Engine output. For each scene in the storyboard, it makes a **separate** Video Engine call with that scene's image and video prompt.

```python
# Pseudocode
storyboard = read_json(f"{word_dir}/images/{selected_images}/storyboard.json")
image_files = sorted(glob(f"{word_dir}/images/{selected_images}/scene_*.png"))

for i, (scene, image_path) in enumerate(zip(storyboard["scenes"], image_files)):
    video_payload = {
        "content": {
            "word": manifest["word_original"],
            "translation": manifest["translation"],
            "language": manifest["language"],
            "language_code": manifest["language_code"],
            "image_path": str(image_path),  # absolute path on disk
            "scene_number": i + 1
        },
        "settings": {
            **merged_settings["video"],
            "video_prompt": scene.get("video_prompt", ""),
        },
        "output_dir": f"{word_dir}/videos/{version_label}/",
        "metadata": {
            "word": manifest["word_original"],
            "language": manifest["language"],
            "translation": manifest["translation"],
            "timestamp": now_iso(),
            "image_version": selected_images_version,
            "scene_number": i + 1
        }
    }
    # Call Video Engine for this scene
    response = http_post("http://localhost:8086/run", video_payload)
```

**Note:** All scenes for one word write to the same `output_dir`. The Video Engine names them `scene_001.mp4`, `scene_002.mp4`, etc., based on `content.scene_number`.

### 3.4 Stage 2 + Stage 4 → Stage 5: Song + Video to Assembly

The orchestrator gathers the selected song take and all video clips, then calls the Assembly Engine.

```python
# Pseudocode
selected_song = f"{word_dir}/songs/{selected_song_version}"
video_clips = sorted(glob(f"{word_dir}/videos/{selected_video_version}/scene_*.mp4"))

assembly_payload = {
    "content": {
        "song_path": str(selected_song),
        "video_clips": [str(p) for p in video_clips],
        "word": manifest["word_original"],
        "translation": manifest["translation"],
        "language": manifest["language"],
        "language_code": manifest["language_code"]
    },
    "settings": merged_settings["assembly"],
    "output_dir": f"{word_dir}/final/{version_label}/",
    "metadata": {
        "word": manifest["word_original"],
        "language": manifest["language"],
        "translation": manifest["translation"],
        "timestamp": now_iso(),
        "song_version": selected_song_version,
        "video_version": selected_video_version
    }
}
```

---

## 4. The Workspace Structure

### 4.1 Folder Layout

When the user imports a CSV, the orchestrator creates this structure:

```
D:/CODING/ResonanceWorkspace/workspace/
├── .env                         ← API keys (NEVER in manifests)
├── workspace-meta.json          ← batch metadata
├── settings-defaults.json       ← batch-level default settings
│
├── klobrille/                   ← one folder per word (slug)
│   ├── manifest.json            ← the word's manifest (see Section 5)
│   ├── concept/                 ← Stage 1 outputs
│   ├── songs/                   ← Stage 2 outputs
│   ├── images/                  ← Stage 3 outputs
│   ├── videos/                  ← Stage 4 outputs
│   └── final/                   ← Stage 5 outputs
│
├── kaffeefahrt/
│   └── ...
├── erbsenzaehler/
│   └── ...
└── warmduscher/
    └── ...
```

### 4.2 Workspace Metadata

`workspace-meta.json`:
```json
{
  "name": "German Humor & Wordplay",
  "created_at": "2026-03-04T12:00:00Z",
  "source_csv": "German_Humor___Wordplay_export.csv",
  "word_count": 5,
  "languages": ["German"],
  "workspace_version": "1.0"
}
```

### 4.3 Word Slug Generation

Word folders use ASCII slugs. The orchestrator converts:
- Lowercase: "Klobrille" → "klobrille"
- Umlauts: ä→ae, ö→oe, ü→ue, ß→ss (German-specific)
- Non-Latin scripts: romanization or numeric prefix
- Spaces/special chars: replaced with hyphens
- Max 50 characters
- The original Unicode word is preserved in `manifest.json`

### 4.4 Version Folder Naming

Each engine call creates a version folder:
```
{label}_{ISO-timestamp}/
```

The label is derived from key settings to make it human-readable:
- Concept: `{lyric_mode}` → `standard_20260304T120000`
- Song: `run-{NNN}` → `run-001_20260304T123000`
- Images: `{creative_direction}-{NNN}` → `editorial-001_20260304T130000`
- Videos: `{video_mode}-{NNN}` → `ken-burns-001_20260304T133000`
- Assembly: `{assembly_mode}-{NNN}` → `clean-001_20260304T140000`

The NNN counter is per-stage, per-word (e.g., first song run is 001, second is 002).

---

## 5. The Manifest Schema

Each word folder contains a `manifest.json`. This is the word's complete state.

```json
{
  "word_original": "Klobrille",
  "word_slug": "klobrille",
  "translation": "toilet seat",
  "language": "German",
  "language_code": "de",
  "created_at": "2026-03-04T12:00:00Z",
  "updated_at": "2026-03-04T14:30:00Z",

  "enrichment": {
    "pos": "noun",
    "ipa": "/ˈkloːˌʁɪlə/",
    "example": "Ich habe vergessen, die Klobrille runterzuklappen.",
    "example_gloss": "I forgot to put the toilet seat down.",
    "synonyms": "Toilettenbrille, Toilettendeckel, Klobürste",
    "etymology": "Klo (toilet) + Brille (glasses) - looks like glasses for your toilet",
    "mnemonic": "Germans joke about the 'Klobrille' being the most important seat in the house",
    "tags": ["humor", "everyday", "funny"]
  },

  "selected": {
    "concept": null,
    "song": null,
    "images": null,
    "video": null,
    "final": null
  },

  "settings": {
    "concept": {},
    "song": {},
    "images": {},
    "video": {},
    "assembly": {}
  },

  "lineage": []
}
```

### 5.1 Field Reference

**Identity fields** — set once at CSV import, never change:
- `word_original`: The word exactly as it appears in the CSV (Unicode preserved)
- `word_slug`: The ASCII folder name
- `translation`: English translation from CSV
- `language`: Full language name ("German", "Korean", etc.)
- `language_code`: ISO 639-1 code (derived by orchestrator: German→de, Korean→ko, etc.)
- `created_at`: When this word was imported

**Enrichment** — optional CSV data, stored at import, never modified:
- All fields from the CSV that aren't word/translation/language
- Passed to engines as `context` when available
- `tags` is split from comma-separated string to array at import

**Selected** — which version is active at each stage:
- `null` = nothing generated yet
- For concept: the filename of the selected concept JSON (e.g., `"standard_20260304T120000.json"`)
- For song: the version folder + take file (e.g., `"run-001_20260304T123000/take_002.flac"`)
- For images: the version folder name (e.g., `"editorial-001_20260304T130000"`)
- For video: the version folder name (e.g., `"ken-burns-001_20260304T133000"`)
- For final: the version folder name (e.g., `"clean-001_20260304T140000"`)

**Settings** — per-word overrides (empty = use batch defaults):
- Each key corresponds to a stage
- Contains only the fields that differ from `settings-defaults.json`
- The orchestrator merges: `batch_defaults[stage] | word_settings[stage]` (word wins)

**Lineage** — generation history (append-only):
```json
{
  "stage": "song",
  "version": "run-001_20260304T123000",
  "from": {
    "concept": "standard_20260304T120000.json"
  },
  "settings_snapshot": {
    "duration": 30,
    "batch_size": 4,
    "inference_steps": 50,
    "guidance_scale": 7.5,
    "thinking": true,
    "seed": -1,
    "bpm": null
  },
  "timestamp": "2026-03-04T12:30:00Z",
  "status": "success"
}
```

### 5.2 Updated_at

The `updated_at` field changes whenever:
- A new version is generated at any stage
- A selection changes
- Per-word settings are modified

---

## 6. Settings Defaults Schema

`settings-defaults.json` at the workspace root defines batch-level defaults. These are the settings used for every word unless overridden in the word's manifest.

```json
{
  "concept": {
    "vocal_gender": "female",
    "lyric_mode": "standard",
    "genre": "auto",
    "syllable_chop": false,
    "duration": 30,
    "visual_hint": false,
    "llm_model": "deepseek/deepseek-chat-v3-0324",
    "llm_temperature": 0.7
  },
  "song": {
    "duration": 30,
    "batch_size": 4,
    "inference_steps": 50,
    "guidance_scale": 7.5,
    "thinking": true,
    "seed": -1,
    "bpm": null
  },
  "images": {
    "creative_direction": "editorial",
    "frame_narrative": "series",
    "image_count": 1,
    "aspect_ratio": "16:9",
    "art_style": "",
    "word_in_image": true,
    "image_model": "fast"
  },
  "video": {
    "video_mode": "ken_burns",
    "duration": 5,
    "resolution": "720p",
    "fps": 25,
    "negative_prompt": "blur, distort, and low quality",
    "cfg_scale": 0.5,
    "seed": -1,
    "motion_type": "slow_zoom_in",
    "motion_speed": "slow"
  },
  "assembly": {
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
    "output_resolution": "1080p",
    "output_fps": 25
  }
}
```

Every field in this file corresponds exactly to a parameter accepted by the respective engine's `POST /run` endpoint. The orchestrator reads this file, merges it with per-word overrides from the manifest, and sends the result to the engine.

---

## 7. CSV Import

### 7.1 Required Columns

| Column | Required | Maps To |
|--------|----------|---------|
| `word` | Yes | `word_original` in manifest |
| `translation` | Yes | `translation` in manifest |
| `language` | Yes | `language` in manifest |

### 7.2 Auto-Derived Fields

The orchestrator derives these automatically:
- `language_code`: From language name → ISO 639-1 mapping
  - German → de, Korean → ko, Japanese → ja, Italian → it, Spanish → es
- `word_slug`: From word_original → ASCII slug (see Section 4.3)

### 7.3 Enrichment Columns (Optional)

All other CSV columns are stored in the manifest's `enrichment` block:
- `pos`, `ipa`, `example`, `example_gloss`, `synonyms`, `etymology`, `mnemonic`, `tags`
- The `tags` column is split from comma-separated string to array
- Unknown columns are preserved as-is (forward-compatible)

### 7.4 Import Behavior

When the user imports a CSV:
1. Parse CSV, validate required columns exist
2. For each row:
   a. Generate word_slug
   b. Create word folder: `{workspace}/klobrille/`
   c. Create stage subfolders: `concept/`, `songs/`, `images/`, `videos/`, `final/`
   d. Write initial `manifest.json` with identity + enrichment, all selections null
3. Write `workspace-meta.json` with batch metadata
4. Write `settings-defaults.json` with default settings (or preserve existing if re-importing)
5. Report import results in UI (how many words imported, any issues)

**Re-import behavior:** If a word folder already exists, skip it (don't overwrite). New words are added. This allows incremental CSV imports.

---

## 8. Engine Dispatch Protocol

### 8.1 Making Engine Calls

Every engine call follows the same pattern:

```python
import httpx

async def call_engine(engine_name: str, port: int, payload: dict, timeout: int) -> dict:
    url = f"http://localhost:{port}/run"
    async with httpx.AsyncClient(timeout=timeout) as client:
        response = await client.post(url, json=payload)
        # All engines return 200 for both success and engine-level failure
        # 422 = bad payload (our bug)
        if response.status_code == 422:
            raise PayloadError(f"Invalid payload for {engine_name}: {response.json()}")
        result = response.json()
        return result
```

### 8.2 Response Handling

All engines return the same structure:
```json
{
  "status": "success" | "failed" | "partial",
  "output_paths": ["file1.ext", "file2.ext"],
  "error": null | { "message": "...", "retryable": true/false, "type": "..." }
}
```

The orchestrator checks `status`, not HTTP status code (engines return 200 even on failure).

### 8.3 Error Handling Policy

- **status: "success"** — register version in manifest, update selections, record lineage, continue pipeline
- **status: "partial"** (Image Engine only) — register what succeeded, warn user, continue pipeline with available outputs
- **status: "failed"** — record failure in lineage with error details, mark stage as failed in UI, do NOT continue to downstream stages for this word
- **HTTP 422** — this is a bug in the orchestrator's payload construction. Log full details. Do not retry.
- **Connection refused** — engine is not running. Show clear message: "Song Engine is not reachable at localhost:8000. Is it running?"
- **Timeout** — show message with duration: "Song Engine timed out after 300s. The generation may still be running."

**No automatic retries in the MVP.** The user can manually retry from the UI.

### 8.4 Pre-Flight Checks

Before calling an engine, the orchestrator verifies:
1. The engine is reachable (quick GET /health or TCP connect)
2. The output_dir has been created
3. The required upstream outputs exist (e.g., concept artifact exists before calling Song Engine)
4. The selected upstream version is still valid (file exists on disk)

---

## 9. Settings Inheritance

The orchestrator resolves settings for each engine call using a two-layer merge:

```python
def resolve_settings(stage: str, manifest: dict, defaults: dict) -> dict:
    """Merge batch defaults with per-word overrides. Word settings win."""
    batch = defaults.get(stage, {})
    word = manifest.get("settings", {}).get(stage, {})
    # Shallow merge — word overrides take priority
    merged = {**batch, **word}
    return merged
```

Example:
- `settings-defaults.json` has `"song": { "duration": 30, "batch_size": 4, "bpm": null }`
- Manifest has `"song": { "bpm": 130 }`
- Merged result: `{ "duration": 30, "batch_size": 4, "bpm": 130 }`

The merged settings are sent to the engine as the `settings` field in the payload. They are also recorded in the lineage entry as `settings_snapshot`.

---

## 10. User Interface

### 10.1 Layout

The UI has three main areas:

```
┌───────────────────────────────────────────────────────────────┐
│  TOOLBAR: [Import CSV] [Batch Settings] [Engine Status]       │
├──────────────┬────────────────────────────────────────────────┤
│              │                                                │
│  WORD LIST   │           PIPELINE VIEW                       │
│              │                                                │
│  ● Klobrille │  ┌─────────┐ ┌──────┐ ┌───────┐ ┌─────┐ ┌───┐│
│  ○ Kaffee... │  │ CONCEPT │→│ SONG │→│ IMAGE │→│VIDEO│→│ASM││
│  ○ Erbsen... │  │ ✅ done  │ │⏳pick│ │ —     │ │ —   │ │ — ││
│  ○ Warmdu... │  └─────────┘ └──────┘ └───────┘ └─────┘ └───┘│
│  ○ Schatzi   │                                                │
│              │  ┌─────────────────────────────────────────┐   │
│  Status:     │  │         STAGE DETAIL PANEL              │   │
│  1/5 done    │  │                                         │   │
│              │  │  (shows controls and outputs for the    │   │
│              │  │   currently selected stage)              │   │
│              │  │                                         │   │
│              │  └─────────────────────────────────────────┘   │
└──────────────┴────────────────────────────────────────────────┘
```

### 10.2 Word List Panel (Left)

- Shows all imported words
- Each word shows its pipeline progress (icons or dots per stage: empty, in-progress, done, failed)
- Click a word to see its pipeline in the main panel
- Bulk selection for batch operations

### 10.3 Pipeline View (Top of Main Panel)

- Five stage boxes in a row: CONCEPT → SONG → IMAGE → VIDEO → ASSEMBLY
- Each box shows: stage name, status (empty/done/failed/in-progress), version count
- Click a stage box to expand its detail panel below
- Visual arrows showing the flow

### 10.4 Stage Detail Panel (Bottom of Main Panel)

This panel changes based on which stage is selected. Each stage has:

**Common elements:**
- Settings controls for that stage (matching engine parameters)
- "Generate" button to trigger the engine
- Version list showing all generated versions for this stage
- "Select" button on each version to make it active
- Status/error display

**Stage-specific elements:**

**Concept stage:**
- Text display showing lyrics, music_caption, visual_hint
- Editable text fields to manually modify lyrics/caption before passing to Song Engine

**Song stage:**
- Audio player for each take (play/pause, waveform optional)
- "Select" button per take
- Visual indicator of which take is selected
- Display of generation settings used (BPM, duration, etc.)

**Image stage:**
- Image gallery showing all generated images
- Storyboard data display
- Delete button per image (to remove bad ones before video generation)

**Video stage:**
- Video player per clip
- Thumbnail display
- Cost indicator for cloud modes (Ken Burns = free, LTX = $0.20, etc.)

**Assembly stage:**
- Final video player
- Download button for the MP4
- Display of assembly settings used

### 10.5 Batch Settings Panel

Opened from toolbar. Shows all settings from `settings-defaults.json` organized by stage. Changes here affect all future generations for all words (unless overridden per-word).

### 10.6 Engine Status Panel

Shows connection status for each engine:
- Green dot = reachable
- Red dot = unreachable
- Shows port and last-checked time
- "Refresh" button to re-check

### 10.7 Autopilot Mode

A button in the toolbar: "Run All" or "Run Selected Words."

Behavior:
1. For each word (or selected words):
   a. Run any incomplete stages in order
   b. Auto-select first version at each stage (per autopilot selection policy)
   c. **Pause at Song stage if `autopilot_song_pause` is enabled** — wait for user to select take
   d. On failure: log error, skip remaining stages for this word, continue to next word
2. Progress bar showing: current word, current stage, overall progress
3. Cancel button to stop after the current engine call completes

---

## 11. Orchestrator Project Structure

```
D:/CODING/ResonanceWorkspace/orchestrator/
├── CLAUDE.md                    ← Agent instructions
├── README.md                    ← Setup and usage
├── requirements.txt             ← Dependencies
├── .env                         ← Orchestrator-specific config (workspace path, etc.)
├── src/
│   ├── __init__.py
│   ├── app.py                   ← FastAPI application + routes
│   ├── workspace.py             ← Workspace creation, folder management
│   ├── csv_import.py            ← CSV parsing, word registration
│   ├── manifest.py              ← Manifest read/write/update
│   ├── settings.py              ← Settings inheritance, merge logic
│   ├── dispatcher.py            ← Engine HTTP calls, response handling
│   ├── pipeline.py              ← Pipeline sequencing logic (stage flow)
│   ├── models.py                ← Pydantic models for all data structures
│   └── slugify.py               ← Word slug generation (Unicode → ASCII)
├── ui/
│   ├── static/                  ← CSS, JS
│   └── templates/               ← HTML templates (or single-page app)
└── tests/
    ├── test_workspace.py
    ├── test_csv_import.py
    ├── test_manifest.py
    ├── test_settings.py
    ├── test_dispatcher.py
    ├── test_pipeline.py
    └── test_slugify.py
```

### 11.1 Dependencies

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `uvicorn` | ASGI server |
| `httpx` | Async HTTP client for engine calls |
| `pydantic` | Data validation and models |
| `jinja2` | HTML templating (if using templates) |
| `python-multipart` | File upload handling (CSV import) |

Minimal dependencies. No ML libraries, no heavy frameworks.

### 11.2 Configuration

The orchestrator reads from `.env` in its own folder:

```env
# Where the workspace lives (the word folders, manifests, outputs)
WORKSPACE_PATH=D:/CODING/ResonanceWorkspace/workspace

# Engine URLs (defaults shown — only override if engines run on different hosts/ports)
CONCEPT_ENGINE_URL=http://localhost:8080
SONG_ENGINE_URL=http://localhost:8000
IMAGE_ENGINE_URL=http://localhost:8082
VIDEO_ENGINE_URL=http://localhost:8086
ASSEMBLY_ENGINE_URL=http://localhost:8085

# Orchestrator port
PORT=8090
```

---

## 12. CLAUDE.md for the Orchestrator Agent

This is the instruction file for the coding agent building the orchestrator.

```markdown
# Orchestrator Agent Instructions

You are building the Resonance Orchestrator — the DAW interface that 
ties together five content generation engines.

## Your Scope

You work ONLY in the `orchestrator/` folder. You do NOT modify any 
engine code in `engines/`. You do NOT modify any docs in `docs/`.

## Key Documents (read before coding)

1. RESONANCE_MASTER_ABSTRACT_v1.md — Architecture rules (especially 
   Sections 5-10)
2. ENGINE_ORCHESTRATOR.md — THIS document. Your primary specification.
3. All five ENGINE_*.md abstracts — to understand each engine's payload 
   format and behavior

## Architecture Rules You Must Follow

1. The orchestrator OWNS manifests — engines never touch them
2. The orchestrator creates ALL output directories before calling engines
3. Engines are called via HTTP POST to /run endpoints — never import 
   engine code directly
4. Settings inheritance: batch defaults merged with per-word overrides
5. All engine calls use httpx with appropriate timeouts
6. Sequential pipeline execution (no parallelism needed)
7. Every engine call result is recorded in lineage

## What To Build (Priority Order)

1. Workspace creation from CSV import
2. Manifest management (create, read, update)
3. Settings management (defaults file, merge logic)
4. Engine dispatcher (HTTP calls with error handling)
5. Pipeline sequencer (stage-by-stage execution)
6. Web UI (FastAPI + HTML/JS)

## How Engines Respond

All engines return HTTP 200 for both success and failure. Check the 
`status` field in the response body, not the HTTP status code.
A 422 response means your payload was malformed.
```

---

## 13. What Is NOT Defined Yet

| Item | Reason | When to Define |
|---|---|---|
| UI framework details (React? plain HTML? Jinja2?) | Agent should pick the fastest approach | During build |
| Workspace path configuration UI | May want a "choose folder" dialog | During build |
| Multi-workspace support | Not needed for MVP — one workspace at a time | Post-MVP |
| Export/share functionality | Not needed for testing phase | Post-MVP |
| Undo/revert for selections | Nice-to-have, not critical | Post-MVP |
| Autopilot resume after crash | Just re-run — it skips completed stages | Post-MVP |

---

## 14. Testing Strategy

### 14.1 Unit Tests (No Engines Needed)

Test workspace creation, CSV import, manifest operations, settings 
merge, slug generation, version naming — all without running engines.

### 14.2 Integration Tests (Mock Engines)

Mock HTTP responses from engines. Test the full pipeline flow: 
dispatch → response handling → manifest update → next stage.

### 14.3 End-to-End Test

With all engines running:
1. Import a CSV with one German word
2. Run the full pipeline (Concept → Song → Image → Video → Assembly)
3. Verify: all folders created, all files present, manifest correct, 
   final.mp4 exists and is playable

---

*This document defines the orchestrator completely enough for a coding 
agent to build it without ambiguity. All engine payloads, response 
formats, and behavior are specified. The master abstract defines the 
architectural rules this orchestrator must follow.*
