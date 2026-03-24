# Resonance Orchestrator — Complete Architecture Investigation Report

> Generated 2026-03-22 for the Resonance Cloud migration project.

---

## Step 1: File Inventory

### Project Root (`orchestrator/`)

```
orchestrator/
├── main.py                          (17 lines)   Entry point: uvicorn launcher
├── pyproject.toml                   (15 lines)   Python deps (FastAPI, httpx, pydantic, uvicorn, dotenv)
├── sample_words.csv                 (7 lines)    Example CSV: 5 German humor words
├── recent-workspaces.json           (auto)       MRU workspace paths (managed by backend)
├── start.bat                        (4 lines)    Production: uv run python main.py
├── start-dev.bat                    (14 lines)   Dev: backend + Vite frontend in parallel
├── start-all-engines.bat            (33 lines)   Launch all 5 engines + orchestrator
│
├── src/                             Python backend
│   ├── __init__.py                  (0 lines)    Package marker
│   ├── app.py                       (1467 lines) FastAPI routes — THE largest file
│   ├── pipeline.py                  (701 lines)  Stage sequencing, payload building
│   ├── csv_import.py                (210 lines)  CSV parsing → word folders + manifests
│   ├── settings.py                  (182 lines)  DEFAULT_SETTINGS, merge logic, art style presets
│   ├── manifest.py                  (160 lines)  Manifest CRUD (read/write/update/lineage)
│   ├── models.py                    (137 lines)  Pydantic models (Manifest, Selected, Enrichment, etc.)
│   ├── dispatcher.py                (131 lines)  HTTP engine calls + health checks
│   ├── workspace.py                 (104 lines)  Folder creation, version dirs, workspace meta
│   ├── presets.py                   (97 lines)   Named settings presets (save/load/delete)
│   ├── slugify.py                   (92 lines)   Unicode → ASCII slug (German umlauts, hex fallback)
│   └── voices.py                    (71 lines)   ElevenLabs voice registry (CRUD on voices.json)
│
├── frontend/                        React frontend
│   ├── package.json                 React 19, Vite 7, Tailwind 4, Radix UI, Lucide icons
│   ├── vite.config.ts               Dev proxy /api → localhost:8090
│   ├── index.html                   SPA entry
│   ├── src/
│   │   ├── main.tsx                 React root mount
│   │   ├── App.tsx                  (495 lines)  Main layout: toolbar + word list + pipeline + stage panel
│   │   ├── App.css                  (unused/empty)
│   │   ├── api.ts                   (457 lines)  All REST client functions + TypeScript interfaces
│   │   ├── index.css                (127 lines)  CSS variables (dark theme), custom scrollbars, animations
│   │   ├── lib/
│   │   │   └── stageColors.ts       (46 lines)   Version box color theming per stage
│   │   └── components/
│   │       ├── WordList.tsx          (211 lines)  Left sidebar: word list with stage dots, mute, approve
│   │       ├── PipelineView.tsx      (235 lines)  Horizontal stage boxes: IMAGE→CONCEPT→SONG→VIDEO→ASSEMBLY→BOOKEND
│   │       ├── StagePanel.tsx        (139 lines)  Stage detail wrapper: Generate button + settings toggle
│   │       ├── BatchSettings.tsx     (333 lines)  Modal: batch default settings for all stages
│   │       ├── AutopilotPanel.tsx    (218 lines)  Modal: batch run with progress log
│   │       ├── WorkspaceManager.tsx  (328 lines)  Modal: create/switch/rename/delete workspaces
│   │       ├── WorkspaceChooser.tsx  (180 lines)  Initial workspace selection screen
│   │       ├── AddWordModal.tsx      (237 lines)  Modal: add word + language picker
│   │       ├── VoiceManager.tsx      (304 lines)  Modal: CRUD for ElevenLabs voices
│   │       ├── EngineStatus.tsx      (41 lines)   Toolbar: engine health dots
│   │       ├── AudioPlayer.tsx       (125 lines)  Custom audio player with waveform
│   │       ├── ImageLightbox.tsx     (36 lines)   Fullscreen image viewer
│   │       ├── CollapsibleRun.tsx    (59 lines)   Expandable version row
│   │       ├── Toast.tsx             (54 lines)   Toast notification system
│   │       ├── settings/
│   │       │   ├── fieldConfigs.ts   (222 lines)  Field definitions for ALL engine settings
│   │       │   ├── StageSettings.tsx (115 lines)  Per-word settings panel (overrides)
│   │       │   └── SettingsControls.tsx (528 lines) Renders field defs as UI controls
│   │       └── stages/
│   │           ├── ConceptPanel.tsx  (153 lines)  Concept viewer/editor (lyrics, caption, visual hint)
│   │           ├── SongPanel.tsx     (160 lines)  Song takes with audio players
│   │           ├── ImagePanel.tsx    (238 lines)  Image grid + storyboard viewer
│   │           ├── VideoPanel.tsx    (107 lines)  Video clips viewer
│   │           ├── AssemblyPanel.tsx (147 lines)  Final MP4 viewer + trim
│   │           ├── BookendPanel.tsx  (112 lines)  Bookend MP4 viewer
│   │           ├── TrimEditor.tsx    (279 lines)  Assembly trim UI (start/end markers)
│   │           └── shared.tsx        (14 lines)   EmptyStage placeholder component
│
├── docs/
│   └── superpowers/specs/           Design docs
│
└── *.md                             Various investigation/design docs
```

---

## Step 2: Pipeline Architecture

### STAGE_ORDER

Defined in `src/pipeline.py:25`:

```python
STAGE_ORDER = ['images', 'concept', 'song', 'video', 'assembly', 'bookend']
```

**This is the storyboard-first rewiring.** Images run FIRST (stage 1), then concept reads the storyboard's `music_caption` to generate lyrics informed by the visual direction.

### Stage Execution Flow

| Order | Stage      | Engine Port | Endpoint   | Timeout | Depends On                  |
|-------|------------|-------------|------------|---------|----------------------------|
| 1     | `images`   | 8082        | POST /run  | 300s    | None (first stage)          |
| 2     | `concept`  | 8080        | POST /run  | 30s     | images (storyboard.json)    |
| 3     | `song`     | 8000        | POST /run  | 300s    | concept (lyrics + caption)  |
| 4     | `video`    | 8086        | POST /run  | 600s    | images (scene images)       |
| 5     | `assembly` | 8085        | POST /run  | 120s    | song + video                |
| 6     | `bookend`  | 8087        | POST /run  | 120s    | assembly (final.mp4)        |

Additional endpoint: Assembly Engine also has `POST /trim` for trimming existing assemblies.

### Storyboard-First Flow (Detailed)

1. **Images stage runs first** — the Image Engine generates a `storyboard.json` (containing `music_caption`, scene descriptions, camera motions, transition prompts, frame_narrative) plus N scene images (001.png, 002.png, ...).

2. **Concept stage reads storyboard** — `build_concept_payload()` reads `images/{version}/storyboard.json` and extracts `music_caption` as `external_music_caption`. The Concept Engine uses this to generate lyrics and a refined `music_caption` that align with the visual direction.

3. **Song stage reads concept** — Uses `lyrics` and `music_caption` from the concept JSON.

4. **Video stage reads storyboard + images** — Builds one payload PER scene image. Reads `video_prompt`, `transition_prompt`, `camera_motion`, `suggested_duration` from storyboard scenes. Resolves transition modes (morph vs cut) per boundary.

5. **Assembly combines song + video clips** — Takes the selected song file + all `scene_*.mp4` clips from the video version.

6. **Bookend wraps assembly** — Takes `final/version/final.mp4` and adds TTS pronunciation intro/outro cards.

### How Stages Are Dispatched

**Sequential, one at a time.** Both autopilot and word pipeline iterate stages in `STAGE_ORDER` and `await` each `run_stage()` call. Video is the only stage that makes multiple engine calls (one per scene image), but these are also sequential (`for vp in payloads: vresult = await call_engine('video', vp)`).

### `start_from` Parameter

In `start_word_pipeline()` (app.py:1153):
```python
if body.start_from and body.start_from in STAGE_ORDER:
    idx = STAGE_ORDER.index(body.start_from)
    stages = STAGE_ORDER[idx:]
else:
    stages = _get_incomplete_stages(word_dir, m)
```
When `start_from` is provided, it slices STAGE_ORDER from that index forward. Otherwise, `_get_incomplete_stages()` returns only stages without a selected version.

### Autopilot vs Studio Mode

- **Studio mode (single stage)**: `POST /api/words/{slug}/run/{stage}` — runs one stage, returns result. User manually selects versions and triggers next stage.

- **Word pipeline (single-word autopilot)**: `POST /api/words/{slug}/pipeline/start` — background task runs all incomplete stages sequentially. Pauses at song if `batch_size > 1` (multiple takes produced) to let user select. Frontend polls `GET /pipeline/status` every 1.5s.

- **Batch autopilot**: `POST /api/autopilot/run` — iterates multiple words, running all incomplete stages per word. Filters out muted words. Has `pause_at_song` option. Stops processing a word on first error, moves to next. Frontend polls every 2s.

Both pipeline modes are `asyncio.create_task()` background tasks with in-memory state dicts (`autopilot_state`, `word_pipeline_state`).

---

## Step 3: Payload Construction

### Concept Payload (`build_concept_payload`, pipeline.py:89)

```json
{
  "content": {
    "word": "Klobrille",
    "translation": "toilet seat",
    "language": "German",
    "language_code": "de",
    "external_music_caption": "<from storyboard.json music_caption>",
    "mnemonic": "<from manifest enrichment>",
    "pos": "<from manifest enrichment>"
  },
  "settings": { "<merged concept settings>" },
  "output_dir": "<word_dir>/concept",
  "metadata": {
    "word": "Klobrille",
    "language": "German",
    "timestamp": "2026-03-22T10:00:00Z"
  }
}
```

**Data sources:**
- `word`, `translation`, `language`, `language_code` → manifest
- `external_music_caption` → `images/{selected_images}/storyboard.json` → `.music_caption`
- `mnemonic`, `pos` → `manifest.enrichment`
- `settings` → `resolve_settings('concept', manifest.settings, defaults)`
- Special: if `use_art_style` is enabled, resolves art_style from image settings and injects `art_style_hint`

### Song Payload (`build_song_payload`, pipeline.py:126)

```json
{
  "content": {
    "word": "Klobrille",
    "translation": "toilet seat",
    "language": "German",
    "language_code": "de",
    "lyrics": "<from concept JSON>",
    "music_caption": "<from concept JSON>"
  },
  "settings": { "<merged song settings with lora_path resolved>" },
  "output_dir": "<word_dir>/songs/<version>",
  "metadata": {
    "word": "Klobrille",
    "language": "German",
    "translation": "toilet seat",
    "timestamp": "...",
    "concept_version": "reliable_20260322T100000.json"
  }
}
```

**Data sources:**
- `lyrics`, `music_caption` → read from `concept/{selected_concept}` JSON file
- LoRA path resolution: `resolve_lora_path()` converts `lora_id` + `lora_checkpoint` → `lora_path` filesystem path, then strips orchestrator-internal keys

### Image Payload (`build_image_payload`, pipeline.py:158)

```json
{
  "content": {
    "word": "Klobrille",
    "translation": "toilet seat",
    "language": "German",
    "language_code": "de"
  },
  "context": null,
  "settings": { "<merged image settings with vocal_gender injected>" },
  "output_dir": "<word_dir>/images/<version>",
  "metadata": { "..." }
}
```

**Data sources:**
- `vocal_gender` → injected from concept settings (cross-stage flow)
- `art_style` → if "random", resolved to a random preset from `ART_STYLE_PRESETS` (21 presets)
- `creative_direction` → if "auto", resolved via `_resolve_creative_direction()` using POS-based weighted random

### Video Payloads (`build_video_payloads`, pipeline.py:183)

Returns **one payload per scene image** (N payloads for N images).

```json
{
  "content": {
    "word": "Klobrille",
    "translation": "toilet seat",
    "language": "German",
    "language_code": "de",
    "image_path": "<full path to 001.png>",
    "scene_number": 1,
    "video_prompt": "<from storyboard scene>",
    "camera_motion": { "type": "slow_zoom_in", "speed": "slow" },
    "end_image_path": "<002.png, only for morph boundaries>"
  },
  "settings": {
    "<merged video settings>",
    "video_prompt": "<per-scene override>",
    "duration": "<per-scene from storyboard suggested_duration>",
    "motion_type": "<per-scene from storyboard camera_motion>",
    "_target_duration": 20
  },
  "output_dir": "<word_dir>/videos/<version>",
  "metadata": { "...", "image_version": "editorial-001_...", "scene_number": 1 }
}
```

**Complex resolution chain:**
1. `_target_duration` → from concept settings `duration` (for scene duration rebalancing)
2. `creative_direction` → from images settings (for transition mode override). If "auto", read actual direction from storyboard.json
3. `transition_mode` → `_resolve_transition_mode()` with priority: explicit setting > movie force > LLM suggestion > frame_narrative auto-pick > legacy boolean > "all_cut"
4. Per-scene durations → `_resolve_scene_durations()` with rebalancing to target duration
5. Per-scene camera motion → from storyboard when `motion_type == "auto"`
6. Video prompt → `_resolve_video_prompt()`: for morph boundaries: transition_prompt > video_prompt > description; for standalone: video_prompt > description > generic
7. Morph boundaries → determined by transition_mode (all_morph, morph_then_cut, cut_then_morph, all_cut)

### Assembly Payload (`build_assembly_payload`, pipeline.py:428)

```json
{
  "content": {
    "song_path": "<full path to selected take FLAC>",
    "video_clips": ["<scene_001.mp4>", "<scene_002.mp4>", "..."],
    "word": "Klobrille",
    "translation": "toilet seat",
    "language": "German",
    "language_code": "de"
  },
  "settings": { "<merged assembly settings>" },
  "output_dir": "<word_dir>/final/<version>",
  "metadata": { "...", "song_version": "run-001_.../take_002.flac", "video_version": "ltx-fast-001_..." }
}
```

**Song path resolution**: If `song_version` contains `/` (e.g. `run-001_ts/take_002.flac`), use directly. Otherwise, find first FLAC/WAV/MP3 in the folder.

**Bookend override**: When bookend is enabled, forces `assembly_mode = 'clean'` (bookend handles word cards).

### Bookend Payload (`build_bookend_payload`, pipeline.py:470)

```json
{
  "content": {
    "assembled_video": "<word_dir>/final/<selected_final>/final.mp4",
    "word": "Klobrille",
    "translation": "toilet seat",
    "language": "German",
    "language_code": "de"
  },
  "settings": { "<merged bookend settings>" },
  "output_dir": "<word_dir>/bookend/<version>",
  "metadata": { "...", "assembly_version": "clean-001_..." }
}
```

### Settings Merge (Exact Structure)

```python
# resolve_settings(stage, manifest_settings, defaults)
batch = defaults.get(stage, {})        # from settings-defaults.json (or DEFAULT_SETTINGS)
word = {k: v for k, v in manifest_settings.get(stage, {}).items() if v is not None}
return {**batch, **word}               # word overrides win, null values dropped
```

`load_defaults()`:
```python
# settings-defaults.json on disk merged with hardcoded DEFAULT_SETTINGS
for stage, stage_defaults in DEFAULT_SETTINGS.items():
    merged[stage] = {**stage_defaults, **data.get(stage, {})}
```

So the full chain is: `DEFAULT_SETTINGS (hardcoded) → settings-defaults.json (per-workspace) → manifest.settings[stage] (per-word)`.

---

## Step 4: Settings System

### Where Defaults Are Defined

**Hardcoded** in `src/settings.py:34` as `DEFAULT_SETTINGS` dict. A workspace-level override file `settings-defaults.json` is created in the workspace folder and loaded by `load_defaults()`. The hardcoded defaults are always the base; the JSON file overlays on top.

### Frontend Settings Flow

1. **Batch Settings modal** (`BatchSettings.tsx`) → `GET /api/settings/defaults` → user edits → `PUT /api/settings/defaults` → saves to `settings-defaults.json` in workspace
2. **Per-word overrides** (`StageSettings.tsx`) → `GET /api/words/{slug}/settings/{stage}` (returns effective + overrides + defaults) → user edits → `PUT /api/words/{slug}/settings/{stage}` → saves into `manifest.json .settings[stage]`
3. **Reset overrides** → `DELETE /api/words/{slug}/settings/{stage}` → clears per-word overrides

### Complete Settings Catalog

#### Concept Engine
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `vocal_gender` | dropdown | `"female"` | male, female, any |
| `lyric_mode` | dropdown | `"reliable"` | reliable, minimal, standard, dramatic, contextual, creative |
| `genre` | combo | `"auto"` | Free text with "auto" preset |
| `caption_style` | dropdown | `"production"` | vocal_forward, production |
| `syllable_chop` | toggle | `false` | |
| `duration` | dropdown | `20` | 15, 20, 30, 60 seconds |
| `visual_hint` | toggle | `false` | |
| `use_art_style` | toggle | `false` | Pass art_style_hint to concept |
| `llm_model` | dropdown | `"deepseek/deepseek-v3.2"` | Advanced |
| `llm_temperature` | slider | `0.7` | 0–1, step 0.05. Advanced |

#### Song Engine
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `duration` | dropdown | `20` | 15, 20, 30, 60 |
| `batch_size` | slider | `4` | 1–8 takes per run |
| `inference_steps` | slider | `50` | 32–100 |
| `guidance_scale` | slider | `8.0` | 5–10 |
| `thinking` | toggle | `true` | |
| `seed` | number | `-1` | -1 = random |
| `bpm` | number | `null` | null = auto |
| `lora_id` | lora picker | `""` | LoRA adapter selection |
| `lora_id_base_path` | (internal) | `""` | Set by LoRA picker |
| `lora_checkpoint` | (internal) | `""` | Set by LoRA picker |
| `lora_path` | (internal) | `""` | Resolved by orchestrator |
| `lora_strength` | slider | `0.75` | 0–1. Advanced, visible when LoRA selected |
| `lora_trigger_phrase` | text | `""` | Advanced, visible when LoRA selected |

#### Image Engine
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `creative_direction` | dropdown | `"auto"` | auto, literal, editorial, cinematic, provocative, minimal, movie, movie_remix |
| `visual_reference` | dropdown | `"auto"` | auto, etymology, mnemonic, none |
| `frame_narrative` | dropdown | `"auto"` | auto, perspective, action, environment, narrative, character, collection |
| `image_count` | dropdown | `"auto"` | auto, 1–8 |
| `aspect_ratio` | dropdown | `"16:9"` | |
| `art_style` | combo | `"photorealistic"` | 70+ presets in groups + none/auto/random |
| `word_in_image` | toggle | `true` | Render word text into image |
| `image_model` | dropdown | `"fast"` | fast, quality |
| `llm_model` | dropdown | `"deepseek/deepseek-v3.2"` | Advanced |
| `movie_override` | text | (empty) | Only visible when creative_direction is movie/movie_remix |

#### Video Engine
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `video_mode` | dropdown | `"ltx_fast"` | ken_burns, ltx_fast, ltx_pro, kling_standard, kling_pro |
| `duration` | slider/dropdown | `6` | Mode-dependent: ken_burns 3–30, ltx 6–10, kling "5"/"10" |
| `resolution` | dropdown | `"1080p"` | LTX only: 1080p, 1440p, 2160p |
| `fps` | readonly | `24`/`25` | Mode-dependent |
| `transition_mode` | dropdown | `"all_cut"` | LTX only: all_cut, morph_then_cut, cut_then_morph, all_morph, auto |
| `motion_type` | dropdown | `"auto"` | auto + 16 camera types |
| `motion_speed` | dropdown | `"slow"` | very_slow, slow, medium, fast |
| `frame_transitions` | toggle | `false` | Legacy boolean |
| `negative_prompt` | text | `"blur, distort, and low quality"` | Advanced |
| `cfg_scale` | slider | `0.5` | Kling only. Advanced |
| `seed` | number | `-1` | Advanced |

#### Assembly Engine
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `assembly_mode` | dropdown | `"clean"` | clean, pedagogic |
| `gap_strategy` | dropdown | `"ping_pong"` | ping_pong, loop, fade_black, freeze_ken_burns, word_card |
| `overflow_strategy` | dropdown | `"video_full"` | trim, fade_audio_black, video_full |
| `transition` | dropdown | `"cut"` | cut, crossfade, dip_black |
| `transition_duration` | slider | `0.5` | 0.1–2.0s |
| `silence_trim` | toggle | `true` | |
| `lufs_normalize` | toggle | `true` | |
| `target_lufs` | slider | `-14.0` | -24 to -8 |
| `output_resolution` | dropdown | `"1080p"` | 480p, 720p, 1080p |
| `output_fps` | dropdown | `24` | 24, 25, 30 |
| `word_card_duration` | slider | `2.0` | Pedagogic only |
| `word_card_show_translation` | toggle | `false` | Pedagogic only |
| `word_card_color` | combo | `"auto"` | Pedagogic only |
| `silence_threshold_db` | slider | `-40.0` | Advanced |
| `word_card_font` | text | `"Noto Sans"` | Advanced |
| `word_card_font_size` | number | `72` | Advanced |
| `video_codec` | dropdown | `"libx264"` | Advanced |
| `video_preset` | dropdown | `"slow"` | Advanced |
| `video_crf` | slider | `18` | Advanced |
| `audio_codec` | dropdown | `"aac"` | Advanced |
| `audio_bitrate` | dropdown | `"320k"` | Advanced |

#### Bookend Engine
| Setting | Type | Default | Notes |
|---------|------|---------|-------|
| `enabled` | toggle | `true` | Master switch |
| `voice_id` | voice picker | `""` | ElevenLabs voice ID |
| `model_id` | dropdown | `"eleven_flash_v2_5"` | TTS model selection |
| `display_duration_min` | slider | `2.0` | 1–5s |
| `display_duration_max` | slider | `4.0` | 2–10s |
| `display_buffer_pct` | slider | `1.0` | 0–2 (percentage of TTS duration) |
| `fade_duration` | slider | `0.5` | 0–1s |
| `font` | dropdown | `"Noto Sans"` | 7 font options. Advanced |
| `font_size` | slider | `144` | 24–200. Advanced |
| `text_color` | combo | `"auto"` | Advanced |
| `background_color` | text | `"#000000"` | Advanced |
| `show_translation` | toggle | `true` | |
| `show_phonetic` | toggle | `false` | Not yet implemented in engine |

### Auto-Picker: Creative Direction

`_resolve_creative_direction()` in pipeline.py uses POS-based weighted random:

| POS Category | Weights |
|-------------|---------|
| noun_concrete | literal:30, editorial:20, cinematic:15, movie:15, provocative:10, minimal:5, movie_remix:5 |
| noun_abstract | movie:25, cinematic:25, editorial:15, provocative:15, minimal:10, movie_remix:5, literal:5 |
| adjective | cinematic:25, movie:20, editorial:20, provocative:15, literal:10, minimal:5, movie_remix:5 |
| verb | cinematic:25, literal:20, movie:20, editorial:15, provocative:10, movie_remix:5, minimal:5 |
| default | editorial:20, cinematic:20, movie:20, literal:15, provocative:15, minimal:5, movie_remix:5 |

### Transition Mode Resolution

Priority chain in `_resolve_transition_mode()`:
1. Explicit `transition_mode` setting (not "auto") → use it
2. Movie/movie_remix creative direction → force `all_cut`
3. LLM's `suggested_transition_mode` from storyboard
4. Auto-picker: `frame_narrative` → mapping (collection→all_cut, perspective→all_morph, narrative→morph_then_cut, etc.)
5. Legacy `frame_transitions` boolean → all_morph / all_cut
6. Default → `"all_cut"`

### Vocal Gender Routing

- Defined in **concept settings** as `vocal_gender` (male/female/any)
- **Injected into image payload** by orchestrator: `settings['vocal_gender'] = concept_settings.get('vocal_gender', 'female')` (pipeline.py:587)
- This allows the Image Engine to adjust visual character depiction based on vocal gender

---

## Step 5: Frontend Architecture

### Stack
- **React 19** + **TypeScript 5.9** + **Vite 7**
- **Tailwind CSS 4** (via @tailwindcss/vite plugin)
- **Radix UI** primitives (dialog, scroll-area, separator, tabs, tooltip)
- **Lucide React** for icons
- No router — single page app

### Communication
- **REST only** — all API calls via `fetch()` in `api.ts`
- **Polling** for real-time state: word pipeline status polled every 1.5s, autopilot every 2s
- No WebSocket

### State Management
- **React useState** throughout — no global state library
- State lives in `App.tsx` and flows down via props
- `localStorage` used only for batch settings lock state

### Layout Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ TOOLBAR: Logo | Workspace | Import CSV | Add Word | Batch       │
│          Settings | Voices | Run All | Refresh | Engine Health   │
├──────────┬────────────────────────────────────────┬─────────────┤
│ WORD     │ PIPELINE VIEW (horizontal stage boxes) │             │
│ LIST     │ IMAGE → CONCEPT → SONG → VIDEO →       │ WORD INFO   │
│ (left    │ ASSEMBLY → BOOKEND                     │ (right      │
│ sidebar) │ [Run Word] button                      │ sidebar)    │
│ 208px    ├────────────────────────────────────────┤ 208px       │
│          │ STAGE PANEL                            │             │
│          │ (settings + stage-specific content)    │             │
│          │ - ConceptPanel / SongPanel / etc.      │             │
└──────────┴────────────────────────────────────────┴─────────────┘
```

### Views
1. **WorkspaceChooser** — shown on startup, pick or create workspace
2. **Main app** — toolbar + 3-column layout (word list | pipeline+stage | word info)
3. **Modals**: BatchSettings, AutopilotPanel, AddWordModal, LanguagePickerModal, WorkspaceManager, VoiceManager

### fieldConfigs

`fieldConfigs.ts` exports typed field definition arrays (`CONCEPT_FIELDS`, `SONG_FIELDS`, etc.) used by both `BatchSettings` and `StageSettings`. Each `FieldDef` specifies:
- `key`, `label`, `type` (dropdown/combo/slider/toggle/number/text/readonly/lora/voice)
- `options`, `min`/`max`/`step` for sliders
- `condition` function for conditional visibility
- `advanced` flag for collapsible advanced section
- `optionLabels` for display names
- `comboPresetGroups` for grouped preset menus (e.g., art styles)

`SettingsControls.tsx` (528 lines) is the generic renderer that maps these definitions to actual UI controls.

---

## Step 6: Workspace & File Management

### CSV Import Flow

1. `POST /api/workspace/import` with multipart file upload
2. `import_csv()` in csv_import.py:
   - Parses CSV with column alias resolution (word/headword, translation/definition)
   - For each row: `slugify(word)` → `create_word_folder()` → `create_manifest()`
   - Skips existing slugs
   - Non-canonical columns become enrichment data
   - Writes/updates `workspace-meta.json`

### Word Folder Structure

```
workspace/
├── workspace-meta.json          # Name, created_at, source_csv, word_count, languages
├── settings-defaults.json       # Batch settings overrides
├── presets/                     # Named settings presets
│   └── *.json
├── voices.json                  # ElevenLabs voice registry (lives at WORKSPACE_ROOT level)
│
├── klobrille/                   # One folder per word (slug name)
│   ├── manifest.json            # THE manifest — orchestrator owns exclusively
│   ├── concept/
│   │   ├── reliable_20260322T100000.json      # Concept artifacts (files, not dirs)
│   │   └── standard_20260322T100500.json
│   ├── songs/
│   │   └── run-001_20260322T101000/
│   │       ├── take_001.flac
│   │       ├── take_002.flac
│   │       ├── take_003.flac
│   │       ├── take_004.flac
│   │       └── generation-meta.json
│   ├── images/
│   │   └── editorial-001_20260322T100000/
│   │       ├── storyboard.json
│   │       ├── 001.png
│   │       ├── 002.png
│   │       ├── 003.png
│   │       ├── thumb_001.png (thumbnails)
│   │       └── generation-meta.json
│   ├── videos/
│   │   └── ltx-fast-001_20260322T102000/
│   │       ├── scene_001.mp4
│   │       ├── scene_002.mp4
│   │       ├── scene_003.mp4
│   │       ├── scene_001_thumb.jpg
│   │       └── generation-meta.json
│   ├── final/
│   │   └── clean-001_20260322T103000/
│   │       ├── final.mp4
│   │       └── generation-meta.json
│   └── bookend/
│       └── bookend-001_20260322T104000/
│           ├── final.mp4
│           └── generation-meta.json
```

### Manifest Structure

```json
{
  "word_original": "Klobrille",
  "word_slug": "klobrille",
  "translation": "toilet seat",
  "language": "German",
  "language_code": "de",
  "created_at": "2026-03-22T10:00:00Z",
  "updated_at": "2026-03-22T10:40:00Z",
  "enrichment": {
    "pos": "noun",
    "ipa": "/ˈkloːˌʁɪlə/",
    "example": "...",
    "example_gloss": "...",
    "synonyms": "Toilettenbrille",
    "etymology": "...",
    "mnemonic": "...",
    "tags": ["humor", "everyday", "funny"],
    "extra": {}
  },
  "selected": {
    "concept": "reliable_20260322T100000.json",
    "song": "run-001_20260322T101000/take_002.flac",
    "images": "editorial-001_20260322T100000",
    "video": "ltx-fast-001_20260322T102000",
    "final": "clean-001_20260322T103000",
    "bookend": "bookend-001_20260322T104000"
  },
  "settings": {
    "concept": {},
    "song": {},
    "images": { "art_style": "watercolor" },
    "video": {},
    "assembly": {},
    "bookend": {}
  },
  "lineage": [
    {
      "stage": "images",
      "version": "editorial-001_20260322T100000",
      "from": {},
      "settings_snapshot": { "creative_direction": "editorial", "..." : "..." },
      "timestamp": "2026-03-22T10:00:00Z",
      "status": "success"
    }
  ],
  "muted": false,
  "approved": false
}
```

### Version Management

**Version naming** (`make_version_label()` in workspace.py):
- concept: `{lyric_mode}_{timestamp}.json` (files, not dirs)
- song: `run-{NNN}_{timestamp}/`
- images: `{creative_direction}-{NNN}_{timestamp}/`
- video: `{video_mode}-{NNN}_{timestamp}/`
- assembly: `{assembly_mode}-{NNN}_{timestamp}/`
- bookend: `bookend-{NNN}_{timestamp}/`

NNN is auto-incremented per prefix within the stage dir.

**Selection** is stored in `manifest.selected.*`. Song selection includes the take filename: `run-001_ts/take_002.flac`.

**Lineage** records every generation attempt with: stage, version, from_versions (dependencies), settings_snapshot, timestamp, status (success/failed/partial).

### generation-meta.json

Written **by engines**, not by the orchestrator. The orchestrator reads it via `GET /api/words/{slug}/stages/{stage}/{version}/meta`. It contains engine-specific metadata (duration, resolution, file sizes, models used, timing, etc.).

---

## Step 7: Bookend Engine Integration

**Yes, bookend is stage 6 (final stage) in STAGE_ORDER.**

- **Port**: 8087
- **Endpoint**: POST /run
- **Timeout**: 120 seconds
- **Purpose**: Wraps the assembled MP4 with TTS pronunciation intro/outro cards using ElevenLabs
- **Payload**: Takes `assembled_video` (path to final.mp4), word info, and bookend settings (voice_id, model_id, display durations, fonts, colors)
- **Dependencies**: Requires `selected.final` (assembly must be complete)
- **Enable/disable**: Controlled by `bookend.enabled` setting (default true)
- **When bookend is enabled**: assembly_mode is forced to `"clean"` (pipeline.py:661) because bookend handles word cards
- **Approval check**: When bookend is enabled, all 6 stages including bookend must have selections to approve a word

---

## Step 8: Error Handling & Recovery

### Engine Call Failures

In `dispatcher.py`:
1. **Pre-flight health check**: `GET /health` with 5s timeout before every payload dispatch. Fails → `EngineUnreachableError`
2. **Connection error** during POST → `EngineUnreachableError`
3. **Timeout** → `TimeoutError` (per-engine: concept 30s, song/images 300s, video 600s, assembly/bookend 120s)
4. **HTTP 422** → `PayloadError` (orchestrator bug)
5. **HTTP 200 with status=failed** → engine returns error in response body, NOT as HTTP error

### Pipeline Error Handling

In `run_stage()`:
- Catches `EngineUnreachableError`, `PayloadError`, `TimeoutError` → wraps as `PipelineError`
- Records `status='failed'` in lineage on any exception
- API endpoint returns HTTP 400 for `PipelineError`, 500 for unexpected errors

### Autopilot Recovery

- On error during a word: logs error, **breaks (stops remaining stages for that word)**, moves to next word
- On cancel: checks `cancelled` flag before each stage
- **No automatic retry** — user must manually re-run failed stages

### UI Error Display

- `StagePanel` shows error message as red text next to the Generate button
- `PipelineView` shows "Failed at {stage}" with Retry button
- `AutopilotPanel` accumulates errors in progress log
- `WordList` shows red dot for failed stages

### Resume

- Word pipeline: if `start_from` is provided, starts from that stage. Otherwise `_get_incomplete_stages()` skips stages with selections.
- Stages can be re-run individually at any time via the Generate button.

---

## Step 9: External Dependencies

### External APIs (Called by Engines, NOT by Orchestrator)

The orchestrator itself makes NO external API calls. It only calls engine HTTP endpoints. The engines call:

| Service | Used By | Purpose |
|---------|---------|---------|
| OpenRouter API | Concept Engine, Image Engine | LLM calls (DeepSeek, Gemini, Claude, etc.) |
| fal.ai | Image Engine, Video Engine (LTX) | Image generation, video generation |
| Kling API | Video Engine | Alternative video generation |
| ACE-Step Gradio (port 7860) | Song Engine | Music generation (local) |
| ElevenLabs API | Bookend Engine | TTS pronunciation |

### Python Dependencies (from pyproject.toml)

| Package | Purpose |
|---------|---------|
| `fastapi` | Web framework |
| `httpx` | Async HTTP client for engine calls |
| `pydantic` | Data validation / models |
| `pydantic-settings` | Settings management |
| `python-dotenv` | .env file loading |
| `python-multipart` | File upload handling |
| `uvicorn` | ASGI server |

### Frontend Dependencies (from package.json)

| Package | Purpose |
|---------|---------|
| `react` / `react-dom` 19 | UI framework |
| `@radix-ui/*` | Accessible UI primitives |
| `lucide-react` | Icons |
| `clsx` | Class name composition |
| `tailwindcss` 4 | Utility CSS |
| `vite` 7 | Build tool |

### Uvicorn Configuration (main.py)

```python
uvicorn.run(
    "src.app:app",
    host="0.0.0.0",
    port=int(os.getenv("PORT", 8090)),
    reload=True,
    reload_dirs=["src"],
)
```

---

## Step 10: Configuration & Environment

### .env Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `8090` | Orchestrator HTTP port |
| `WORKSPACE_ROOT` | `D:/CODING/ResonanceWorkspace` | Parent dir for all workspaces |
| `WORKSPACE_PATH` | `{WORKSPACE_ROOT}/workspace` | Active workspace (overridden at runtime) |
| `LORA_LIBRARY_PATH` | `D:/CODING/RESONANCE/loras` | LoRA adapter library path |
| `CONCEPT_ENGINE_URL` | `http://localhost:8080` | Override engine URLs |
| `SONG_ENGINE_URL` | `http://localhost:8000` | |
| `IMAGE_ENGINE_URL` | `http://localhost:8082` | |
| `VIDEO_ENGINE_URL` | `http://localhost:8086` | |
| `ASSEMBLY_ENGINE_URL` | `http://localhost:8085` | |
| `BOOKEND_ENGINE_URL` | `http://localhost:8087` | |

### Config Files

| File | Location | Purpose |
|------|----------|---------|
| `.env` | project root | Environment variables |
| `settings-defaults.json` | workspace root | Batch default settings |
| `manifest.json` | each word dir | Per-word state + settings |
| `workspace-meta.json` | workspace root | Workspace metadata |
| `voices.json` | WORKSPACE_ROOT | ElevenLabs voice registry |
| `recent-workspaces.json` | project root | MRU workspace list |
| `presets/*.json` | WORKSPACE_ROOT | Named settings presets |

### Startup Scripts

| Script | Purpose |
|--------|---------|
| `start.bat` | Production: `uv run python main.py` |
| `start-dev.bat` | Dev: spawns backend + Vite frontend in separate terminals |
| `start-all-engines.bat` | Launches all 5 engines + orchestrator. Note: ACE-Step (7860) must be started manually. |

---

## Cloud Migration Notes

### Filesystem → Cloud Storage

| Local Pattern | Cloud Replacement | Notes |
|--------------|-------------------|-------|
| `D:/CODING/ResonanceWorkspace/workspace/` | Supabase Storage bucket | Each workspace = bucket prefix |
| Word folders (`klobrille/concept/`, etc.) | Storage paths | Same hierarchy, just in object storage |
| `manifest.json` per word | **Database row** (Supabase/Postgres) | Most critical change — manifest data becomes relational |
| `settings-defaults.json` | Database row per workspace | |
| `workspace-meta.json` | Database row per workspace | |
| `voices.json` | Database table | |
| `presets/*.json` | Database table | |
| `storyboard.json` | Keep in storage | Engine writes it, orchestrator reads it |
| `generation-meta.json` | Keep in storage | Engine writes it |
| `.env` | Vercel env vars / Supabase secrets | |
| `recent-workspaces.json` | Not needed (DB query) | |

### Engine Communication

| Local Pattern | Cloud Replacement | Notes |
|--------------|-------------------|-------|
| `http://localhost:{port}/run` | **Same HTTP calls** but engines deployed as services | Engines can be containerized, same /run API |
| Engine health checks | Health endpoint monitoring | Same /health pattern |
| Pre-flight health check | Could add retry/queue | Currently no retry on engine calls |
| 600s video timeout | May need async queue | Long-running jobs need queue pattern in cloud |

### State Management

| Local Pattern | Cloud Replacement | Notes |
|--------------|-------------------|-------|
| In-memory `autopilot_state` | **Database + message queue** | In-memory state dies on restart |
| In-memory `word_pipeline_state` | Database job table | |
| `asyncio.create_task()` | **Background job worker** (Bull/BullMQ, Vercel Queues) | Critical: long pipelines can't be in-memory tasks |
| File-based lineage | Database lineage table | |
| Polling (1.5s/2s intervals) | **WebSocket or Server-Sent Events** | Reduce polling overhead |
| Global `WORKSPACE_PATH` variable | Per-user/session workspace ID | Current design has single global workspace |

### Multi-User Considerations

| Local Assumption | Cloud Change Needed |
|-----------------|---------------------|
| Single user | Auth + user scoping on all resources |
| Global WORKSPACE_PATH | Per-user workspace bindings |
| No concurrency control | Optimistic locking on manifest writes |
| Local file locking (none currently) | Database transactions |
| One autopilot at a time (global lock) | Per-user job queues |

### Path Resolution

| Local Pattern | Cloud Change |
|--------------|--------------|
| `word_dir / "images" / version / "storyboard.json"` | Storage download + parse |
| `word_dir / "songs" / version / "take_002.flac"` | Storage URL |
| `word_dir / "concept" / version` | Storage download + parse |
| All `Path()` / `pathlib` operations | Storage SDK operations |
| `output_dir` passed to engines | Engines must upload to storage (or write to temp + upload) |

### Media Serving

| Local Pattern | Cloud Replacement |
|--------------|-------------------|
| `FileResponse(str(file_path))` | Signed storage URLs |
| `/api/media/{slug}/{path}` | Direct Supabase/S3 signed URLs |
| Video/audio streaming | CDN-backed storage URLs |

### Settings Presets & LoRA Library

| Local Pattern | Cloud Replacement |
|--------------|-------------------|
| `LORA_LIBRARY_PATH` filesystem scan | Database + storage for LoRA files |
| `presets/*.json` | Database table |
| LoRA `adapter_model.safetensors` discovery | Pre-registered in database |

### Critical Architecture Decisions for Cloud

1. **Manifest as database**: The manifest is read/written ~20+ times per pipeline run. Must be a database row, not a file. Schema: word table + lineage table + selected table.

2. **Output path handling**: Engines currently write directly to `output_dir`. In cloud, engines need to either: (a) write to temp disk then orchestrator uploads to storage, or (b) engines get storage credentials and upload directly.

3. **Cross-stage data flow**: Several stages read files from previous stages (concept reads storyboard, song reads concept JSON, video reads images, assembly reads songs+clips). In cloud, the orchestrator must download these or pass signed URLs.

4. **Job durability**: `asyncio.create_task()` dies on restart. Need persistent job queue (Vercel Queues, Redis-backed queue, or database-backed jobs).

5. **Video stage parallelization opportunity**: Currently scenes are processed sequentially. Cloud version could dispatch scene payloads in parallel since they're independent.

6. **Song take selection pause**: The pipeline pauses for user input. In cloud, this becomes a job state machine with "awaiting_input" status.

7. **Workspace isolation**: Current design uses filesystem paths as workspace identity. Cloud needs workspace IDs, user ownership, and access control.
