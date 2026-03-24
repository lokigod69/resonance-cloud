# The Resonance Workspace — Master Architecture Abstract

**Version:** 1.0
**Status:** Architecture finalized — ready for engine development
**Date:** February 28, 2026
**Author:** Saya + Claude (Anthropic), validated by GPT, Grok, Gemini
**Purpose:** This is the single source of truth for the Resonance Project's content generation pipeline. Any AI agent working on any component of this system must read this document first.

---

## 1. What We Are Building

The Resonance Project is a language learning system that generates multimedia content — songs, images, videos — from vocabulary words. A user provides a list of words in a target language (e.g., German), and the system produces finished video content where each word is embedded in a custom-generated song with accompanying visuals.

This document describes the **Resonance Workspace** — the production pipeline that transforms words into finished content. It does not describe the end-user learning app; it describes the creator's tooling for generating that content.

**Scope of this build:** This is an experimental/testing build. One user, running locally on a single PC, generating content for a few hundred words. No cloud deployment, no multi-user scenarios, no production infrastructure. Architecture decisions are optimized for flexibility and rapid iteration, not scale.

### 1.1 The Core Metaphor

The Resonance Workspace is a **Digital Audio Workstation (DAW) for content generation.** This is not just an analogy — it is the design principle driving every architectural decision.

| DAW Concept | Resonance Equivalent |
|---|---|
| Session file (the .als / .logicx project) | **Workspace** — folder structure + manifest files |
| Plugins / synthesizers (Serum, Massive) | **Engines** — stateless processors (Lyrics, Song, Image, Video, Assembly) |
| Channel strip (shows plugin knobs in the DAW) | **Orchestrator UI** — surfaces each engine's settings |
| Takes / comp lanes | **Versions** — multiple outputs coexist per stage per word |
| Preset data (saved with the project) | **Manifest** — settings + selections stored in the workspace |
| Transport bar (play / pause / solo) | **Orchestrator modes** — Studio (manual) and Autopilot (batch) |
| Bouncing / exporting | **Assembly Engine** — combines song + video into final .mp4 |

---

## 2. System Components

There are exactly four types of components in this system.

### 2.1 The Workspace (= the session file)

A folder structure on disk that serves as the project database. Contains all generated content, all settings, all version history. The workspace is the single source of truth. Every other component reads from and writes to it. The workspace is portable — it contains no secrets, no API keys, no system-specific paths.

### 2.2 The Engines (= the plugins/synthesizers)

Standalone, stateless processors. Each engine does one thing: receives an input payload (content + settings), produces output files, writes them to the workspace, and forgets everything. Engines have no memory between calls. Engines never read or write the manifest. Engines may have their own standalone UI for development and testing, but during production the user interacts with engines only through the orchestrator.

### 2.3 The Orchestrator (= the DAW interface)

The user-facing application. It owns the workspace: creating word folders, writing manifests, reading engine outputs, and dispatching engine calls. It surfaces each engine's settings as editable controls. It operates in two modes: Studio (manual experimentation) and Autopilot (batch processing). The orchestrator is the exclusive owner of workspace initialization, manifest management, and CSV import.

### 2.4 The Manifest (= the preset/routing data)

JSON files within the workspace that track: which version is selected at each stage for each word, what settings to use for each engine, and lineage (which input produced which output with what settings).

---

## 3. The Pipeline

### 3.1 Stage Overview

Content flows through five stages. Each stage corresponds to one engine.

```
STAGE 1: CONCEPT (Lyrics + Music Caption + Visual Hint)
  Engine:  Concept Engine (LLM API call)
  Input:   Word + language + settings
  Output:  Single JSON containing:
           - lyrics (structured text for the Song Engine)
           - music_caption (genre/mood/tempo for the Song Engine)
           - visual_hint (optional mood tag for the Image Engine — e.g., "melancholic, urban, isolated")

STAGE 2: SONG GENERATION  ──┐
  Engine:  Song Engine       │  CAN RUN IN PARALLEL
  Input:   lyrics +          │  (both depend only on Stage 1)
           music_caption +   │
           settings           │
  Output:  Audio file (.wav) │
                              │
STAGE 3: IMAGE GENERATION ───┘
  Engine:  Image Engine (visual creative brain — has its own LLM step)
  Input:   Word + visual_hint (optional) + engine settings (art style, image count, narrative mode, etc.)
  Output:  Set of images (1-8 per word) + video motion prompts per image

STAGE 4: VIDEO GENERATION
  Engine:  Video Engine
  Input:   Images + motion settings
  Output:  Video clips

STAGE 5: ASSEMBLY
  Engine:  Assembly Engine (FFMPEG)
  Input:   Song + video clips + assembly settings
  Output:  Final .mp4
```

### 3.2 Pipeline Flow Diagram

```
                    ┌──────────────────┐
                    │   CSV + WORDS    │
                    └────────┬─────────┘
                             │
                    ┌────────▼─────────┐
                    │  STAGE 1         │
                    │  Concept Engine  │
                    │  OUT: lyrics     │
                    │       music_cap  │
                    │       visual_hint│
                    └───┬─────────┬────┘
                        │         │
              ┌─────────▼──┐  ┌──▼──────────────┐
              │ STAGE 2    │  │ STAGE 3          │
              │ Song Engine│  │ Image Engine     │
              │ OUT: .wav  │  │ (creative brain) │
              └─────┬──────┘  │ OUT: images +    │
                    │         │      video prompts│
                    │         └──────┬───────────┘
                    │         ┌──────▼──────┐
                    │         │ STAGE 4     │
                    │         │ Video Engine│
                    │         │ OUT: clips  │
                    │         └──────┬──────┘
                    └────────┬───────┘
                    ┌────────▼─────────┐
                    │  STAGE 5         │
                    │  Assembly Engine │
                    │  OUT: final .mp4 │
                    └──────────────────┘
```

### 3.3 Key Pipeline Rules

**Parallel execution:** Stages 2 and 3 both depend only on Stage 1 output. They can run simultaneously. Stage 4 depends on Stage 3. Stage 5 depends on Stages 2 and 4.

**Stage 1 defines the musical direction.** It generates lyrics, a music caption (which together define what the song sounds like), and an optional visual_hint (a short mood tag like "melancholic, urban, isolated"). The visual_hint is a starting point for the Image Engine — like a reference track in music production. It can be used, modified, or ignored entirely. The Image Engine owns the visual creative direction.

**The Image Engine is a creative engine, not just a generator.** It has its own internal LLM step that takes the word, the optional visual_hint, and its own settings (art style, narrative mode, image count, etc.) and creates the actual visual concept: what each image depicts, compositions, and video motion prompts per scene. This is where creative decisions like "Studio Ghibli style" or "realistic photo" or "absurd juxtaposition" get made — in the Image Engine's settings, not in Stage 1.

**Stage 5 is the time boss.** Song duration and total video clip duration will rarely match exactly. Stage 4 produces fixed-duration clips based on its settings. Stage 5 (Assembly/FFMPEG) handles all time alignment: looping video if the song is longer, trimming or fading audio if video is shorter, crossfading between clips. No other stage worries about duration matching.

**Video is not audio-reactive by design.** Because Stage 4 depends on images (not the song), the video clips won't be synced to musical beats or moments. This is acceptable for vocabulary learning content and is a constraint of current video models (LTX/Kling don't do native audio-reactive generation). Stage 5 handles alignment.

### 3.4 Stage 1 Output: The Concept Artifact

This is architecturally important. Stage 1 produces a single atomic JSON file per version — not three separate files. One take = one creative concept. The lyrics and music_caption are creatively interdependent and must stay together. The visual_hint is derived from them and included for convenience — it gives the Image Engine a starting point without requiring it to re-analyze the word's mood from scratch.

```json
{
  "word": "Verzweiflung",
  "translation": "Desperation",
  "language": "German",

  "lyrics": "[Verse]\nVer-zweif-lung, Ver-zweif-lung\n...",
  "music_caption": "melancholic melodic techno, minor key, 120 BPM, warm analog pads, deep sub-bass, female vocal processing",
  "visual_hint": "melancholic, urban, isolated"
}
```

The manifest selects one concept version, and the orchestrator extracts the relevant fields when dispatching to downstream engines: lyrics + music_caption go to the Song Engine; visual_hint + word go to the Image Engine (alongside the Image Engine's own settings, which control the actual visual creative direction).

The visual_hint serves as a default creative seed for Autopilot mode — when the user hasn't specified custom Image Engine settings, the Image Engine uses the hint to generate something that naturally fits the musical mood. In Studio mode, the user can override, modify, or disable the hint entirely through the Image Engine's settings.

The workspace folder for Stage 1 is named `concept/` to reflect that it contains more than just lyrics.

### 3.5 Stage 3 → Stage 4: Handling Bad Images

AI image models always produce some duds. The handling follows the DAW metaphor: if a take is bad, you delete it. Generate 6 images, 2 are terrible — delete the 2 bad .png files from the image set folder. The orchestrator passes the folder to Stage 4, and Stage 4 animates whatever images remain. No complex sub-selection UI needed.

### 3.6 Stage 2: Multi-Take Per Call

Ace-Step has a batch size parameter and can generate multiple song variations in one call. When Stage 2 returns multiple outputs, the orchestrator registers each as a separate version in the manifest. The user listens and selects the best one.

---

## 4. The Workspace Structure

### 4.1 Folder Layout

```
resonance-workspace/
├── .env                         ← API keys, model paths (NEVER committed/shared)
├── workspace-meta.json          ← workspace metadata (batch name, creation date)
├── settings-defaults.json       ← default engine settings for this batch
│
├── verzweiflung/                ← one folder per word
│   ├── manifest.json            ← selected versions + per-word settings + lineage
│   ├── concept/                 ← Stage 1 outputs
│   │   ├── phonetic-repeat_20260228T103000.json
│   │   ├── phonetic-repeat-edit_20260228T104500.json
│   │   └── semantic-story_20260228T110000.json
│   ├── songs/                   ← Stage 2 outputs
│   │   ├── 30s-techno_20260228T113000/
│   │   │   ├── output.wav
│   │   │   └── generation-meta.json
│   │   └── 30s-melodic_20260228T114500/
│   │       ├── output.wav
│   │       └── generation-meta.json
│   ├── images/                  ← Stage 3 outputs
│   │   ├── setA-cinematic_20260228T120000/
│   │   │   ├── 001.png
│   │   │   ├── 002.png
│   │   │   ├── ... (user deletes bad ones)
│   │   │   └── generation-meta.json
│   │   └── setB-noir_20260228T121500/
│   │       └── ...
│   ├── videos/                  ← Stage 4 outputs
│   │   └── smooth-pan_20260228T130000/
│   │       ├── clip_001.mp4
│   │       ├── clip_002.mp4
│   │       └── generation-meta.json
│   └── final/                   ← Stage 5 outputs
│       └── assembled_20260228T140000/
│           ├── output.mp4
│           └── generation-meta.json
│
├── schmetterling/
│   └── ...
└── sehnsucht/
    └── ...
```

### 4.2 Naming Conventions

- **Word folders:** Lowercase ASCII slug, max 50 characters. Non-Latin scripts use romanization or a numeric prefix. The manifest stores the original Unicode word.
  - "Verzweiflung" → `verzweiflung/`
  - "Gemütlichkeit" → `gemuetlichkeit/`
  - "한국어" → `hangugeo/` or `001-hangugeo/`
- **Version folders/files:** `[descriptive-label]_[ISO-timestamp]`
- **Timestamps** ensure uniqueness and chronological ordering

### 4.3 The Manifest (per word)

```json
{
  "word_original": "Verzweiflung",
  "word_slug": "verzweiflung",
  "translation": "Desperation",
  "language": "German",
  "created_at": "2026-02-28T10:00:00Z",
  "updated_at": "2026-02-28T14:30:00Z",

  "selected": {
    "concept": "phonetic-repeat-edit_20260228T104500",
    "songs": "30s-melodic_20260228T114500",
    "images": "setA-cinematic_20260228T120000",
    "videos": "smooth-pan_20260228T130000",
    "final": null
  },

  "settings": {
    "concept": { "__note": "TBD — defined when Concept Engine is designed" },
    "songs": { "__note": "TBD — defined after Ace-Step Gradio validation" },
    "images": { "__note": "TBD — defined when Image Engine is designed" },
    "videos": { "__note": "TBD — defined when Video Engine is designed" },
    "final": { "__note": "TBD — FFMPEG assembly settings" }
  },

  "lineage": [
    {
      "output": "songs/30s-melodic_20260228T114500/output.wav",
      "from_concept": "concept/phonetic-repeat-edit_20260228T104500.json",
      "settings_snapshot": {}
    }
  ]
}
```

### 4.4 Settings Defaults (batch level)

```json
{
  "__doc": "Default settings for all words. Per-word manifest settings override these.",
  "concept": { "__note": "TBD" },
  "songs": { "__note": "TBD" },
  "images": { "__note": "TBD" },
  "videos": { "__note": "TBD" },
  "final": { "__note": "TBD" }
}
```

### 4.5 Settings Are Intentionally Undefined

The exact settings schema for each engine depends on what the underlying models actually accept and what meaningfully affects output quality — both of which are discovered through testing. Settings will be defined engine-by-engine as each one is designed and validated.

The architecture is settings-agnostic: the manifest stores whatever JSON blob each engine needs. Adding a new setting later never breaks the workspace, the orchestrator, or other engines. Missing fields default gracefully inside the engine.

---

## 5. How Settings Work — Inheritance

```
Layer 1: BATCH DEFAULTS (settings-defaults.json)
    ↓ inherited by all words unless overridden
Layer 2: PER-WORD OVERRIDES (word manifest → settings)
    ↓ orchestrator merges: word settings take priority
Layer 3: ORCHESTRATOR SENDS MERGED SETTINGS TO ENGINE
    ↓ engine receives a flat, complete settings object
ENGINE: stateless — executes, writes output, forgets
```

The user changes settings in the orchestrator UI. The orchestrator saves them to the manifest. The engines read nothing — they receive everything they need in the call payload. Just like how Serum's knobs appear in Ableton's channel strip, and the preset is saved with the project, not with Serum.

---

## 6. Versioning and Branching

### 6.1 Versions Are Takes

Every generation creates a new version. Previous versions are never deleted or modified. This is identical to recording multiple takes in a DAW.

### 6.2 Branching Is Just Selection

There is no formal "branch" concept. You select a different version at any stage, generate new downstream content, and both paths coexist. Switch between them by changing the selection in the manifest.

### 6.3 Autopilot Selection Policy

In Autopilot mode, the orchestrator needs a rule for which version to select when multiple exist. The rule: **first generated becomes selected unless the user intervenes.** This applies to all stages. The one exception is song selection, which can optionally pause for manual listening if configured.

### 6.4 Lineage Tracking

The manifest's `lineage` array records which input produced which output, including settings used. Each generation-meta.json also records its inputs and settings independently, so every output is understandable in isolation.

---

## 7. The Orchestrator

### 7.1 Studio Mode (Manual / Experimental)

The user works with one word at a time. For each word they can: view all stages and versions, change settings for any stage, trigger generation for a specific stage, select versions, and move freely forward or backward in the pipeline.

### 7.2 Autopilot Mode (Batch / Automated)

The user sets batch defaults and hits "run." The orchestrator processes all words sequentially:
1. For each word, check what stages are incomplete
2. Generate missing stages using merged settings (batch defaults + per-word overrides)
3. Auto-select the first version at each stage (per the selection policy)
4. On engine failure: log the error in generation-meta.json, skip to the next word, flag it in the UI
5. Continue until all words are processed

### 7.3 Orchestrator Responsibilities (Exclusive)

The orchestrator exclusively owns:
- **Workspace initialization** — creating the workspace folder structure from a CSV
- **Manifest management** — all reads and writes to manifest.json files
- **CSV import** — parsing word lists and creating word folders
- **Engine dispatch** — calling engines with the correct payload
- **Version registration** — reading engine output and updating the manifest
- **Settings UI** — surfacing engine settings as editable controls
- **Preview helpers** — one-click play/open for songs, images, videos from the version list (critical for the "listen and pick best take" DAW workflow)

### 7.4 Progress Visibility

- Studio mode: per-stage status indicator (idle / generating / success / failed)
- Autopilot mode: simple progress output (e.g., "Word 23/87: generating song... done")

---

## 8. Engine Contract

Every engine follows this contract regardless of what it does.

### 8.1 Input

The engine receives a single payload containing:
- `content` — the actual input data (concept JSON, audio file path, image paths, etc.)
- `settings` — the complete, merged settings object (no inheritance — fully resolved by the orchestrator)
- `output_dir` — the workspace path where output should be written (created by the orchestrator before the call)
- `metadata` — word, language, timestamp, and context (so each output is understandable in isolation)

### 8.2 Output

The engine:
- Writes output file(s) to the `output_dir` it was given
- Writes a `generation-meta.json` alongside the output — **always, even on failure**
- Returns a response: `{ status: "success"|"failed", output_paths: [...], error: null|{...} }`

### 8.3 generation-meta.json

```json
{
  "status": "success",
  "engine": "song-engine",
  "engine_version": "0.1.0",
  "timestamp": "2026-02-28T14:30:00Z",
  "duration_seconds": 42.5,

  "context": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation"
  },

  "inputs": {
    "concept_version": "phonetic-repeat-edit_20260228T104500",
    "settings_used": { }
  },

  "outputs": {
    "primary": "output.wav",
    "format": "wav",
    "sample_rate": 44100
  },

  "reproducibility": {
    "seed": 42,
    "model_version": "ace-step-1.5",
    "note": "Non-deterministic — seed is best-effort"
  },

  "error": null
}
```

On failure, `outputs` is null and `error` contains `{ "message": "...", "retryable": true|false }`.

### 8.4 What Engines Must NOT Do

- Never read or write manifest.json
- Never create their own output directory (orchestrator creates it)
- Never communicate with other engines
- Never retain state between calls
- Never read .env directly for workspace data (only for their own API keys / model paths at startup)

---

## 9. Environment and Secrets

**Rule: No secrets or system paths in the workspace.**

The workspace is portable. If you zip it and move it to another machine, it should work (minus re-pointing to local model paths). Therefore:

- API keys (Google AI, LLM providers) → `.env` file at workspace root
- Local model paths (Ace-Step weights) → `.env` file
- Hardware settings (GPU allocation) → `.env` file

The `.env` file is gitignored and never shared. Engines and the orchestrator read it at startup. The manifest and settings files contain only creative/generation parameters, never credentials or system paths.

---

## 10. Architecture Rules

These are the invariants. If any change violates these, the architecture is broken.

1. **Engines never communicate with each other.** All data flows through the workspace.
2. **Engines are stateless.** They receive everything they need per call. They remember nothing.
3. **The workspace is the single source of truth.** If it's not in the workspace, it doesn't exist.
4. **Versions are never overwritten.** New content is always a new file. Selection is tracked in the manifest.
5. **Settings live in the workspace, not in the engines.** The manifest stores all configuration.
6. **The orchestrator is the only UI the user needs during production.** Engine UIs are for development/testing only.
7. **Adding a new setting to an engine never breaks other components.** Missing fields default gracefully.
8. **Adding a new engine or stage never breaks existing components.** The workspace is extensible.
9. **The folder structure is the database.** No external database, no server state, no hidden configuration.
10. **Each word is fully independent.** Processing, settings, and versions for one word never affect another.
11. **Engines never touch the manifest.** They write output files + generation-meta.json only. The orchestrator exclusively owns the manifest.
12. **Every engine call produces a generation-meta.json**, even on failure.
13. **External files can be imported** into any stage. The orchestrator registers them with `engine: "manual-import"` lineage.
14. **Stage 1 defines the musical direction** (lyrics + music_caption) and provides an optional visual mood hint. **The Image Engine owns the visual creative direction** and may use, modify, or ignore the hint based on its own settings.
15. **Stage 5 is the time boss.** It handles all duration alignment between song and video. No other stage worries about time matching.
16. **No secrets or system paths in the workspace.** API keys, model paths, and hardware config live in `.env`, never in manifests or settings files.
17. **The orchestrator exclusively owns workspace initialization, manifest management, and CSV import.**

---

## 11. What Is NOT Defined Yet (And Why)

| Item | Reason | When to Define |
|---|---|---|
| Concept Engine settings schema | Depends on LLM testing — which prompt styles work best for Ace-Step | When building the Concept Engine |
| Song Engine settings schema | Depends on Gradio validation — which Ace-Step params affect German pronunciation | After manual Ace-Step testing |
| Image Engine settings schema | Depends on which model and what creative options matter | When building the Image Engine |
| Video Engine settings schema | Depends on LTX/Kling param space (frames, motion types) | When building the Video Engine |
| Assembly Engine settings schema | Depends on FFMPEG options + creative decisions on time alignment | When building the Assembly Engine |
| Audio output format | Ace-Step outputs MP3 or FLAC (not WAV). Confirm preferred format during testing | After Gradio validation |
| Orchestrator UI framework | Doesn't matter for architecture — pick whatever is fastest to build | When building the orchestrator |
| Lyrics structural tags | Ace-Step docs recommend [Verse] [Chorus] tags — test whether they improve pronunciation | During Concept Engine testing |

---

## 12. Open Design Questions

These are answered through testing and experimentation, not architecture discussions. Listed here so they're tracked.

### Stage 1 (Concept Engine)
- What lyric structure produces the best Ace-Step pronunciation?
- Does the music caption significantly affect pronunciation quality, or mainly style?
- For non-Latin scripts: lyrics in native script, romanized, or both?
- Lyrics should include Ace-Step structural tags like [Verse], [Chorus] (docs recommend this — validate through testing)
- Visual hint generation: should it be derived from the music_caption, from the word's meaning, or both? (For Autopilot defaults)
- Can the visual_hint be disabled entirely for words where the user wants full manual control over visuals?

### Stage 2 (Song Engine)
- What exact Ace-Step parameters produce correct German pronunciation? (First thing to test)
- Ace-Step outputs MP3 or FLAC (not WAV). Confirm which format and sample rate to use as default
- Best inference step count for maximum quality (speed is not a concern — quality is priority)
- Does cfg_strength affect pronunciation or mainly musical coherence? (Unknown — requires testing)
- Ace-Step cannot handle mixed-language lyrics — one language per generation. This is a known constraint
- How does Ace-Step's batch size parameter work for multi-take generation? How does the orchestrator register N outputs from one call?

### Stage 3 (Image Engine — Visual Creative Brain)
- The Image Engine has its own LLM step for generating visual concepts, storyboards, and video motion prompts. What LLM works best for this? (Already tested with Gemini — confirm it still works)
- How many images per word? Depends on content: 1 frame for simple words (looped), 3-6 for narrative words
- Art style presets to support: realistic photo, illustrated, anime/Ghibli, surreal, minimal/text-only, others?
- Should the engine have complexity modes (simple/intermediate/advanced) or just expose all settings?
- Word rendering in images: always, never, or per-setting? (neon signs, graffiti, environmental text)
- Video motion prompts: generated per image by the Image Engine's LLM step, passed to Stage 4
- When visual_hint is present: use as mood seed for the LLM analysis. When absent or disabled: the engine works from the word + its own settings alone
- For single-frame outputs (short clips): what makes a single image compelling enough to carry a 5-10 second video?

### Stage 4 (Video Engine)
- LTX frame counts: default ~257 frames at 25fps ≈ ~10s. What frame count works best?
- What motion prompts produce the best results for this content type?
- LTX vs. Kling vs. Runway for quality?

### Stage 5 (Assembly Engine)
- **Duration mismatch problem (critical):** Song is 28s, video clips total 30s. Loop? Trim? Fade? This is a creative decision needed before building.
- FFMPEG quality/size tradeoff for final MP4?
- Should video loop to match song, or song fade to match video?
- Subtitle/word overlay burned into video?

### Orchestrator
- UI framework? (Next.js / Flask / Electron — pick whatever is fastest)
- Minimum viable Studio mode interface?
- Should Autopilot song selection be auto or pause-and-pick?
- How to surface progress when Song + Image run in parallel?

---

## 13. Documentation Strategy

### Document Hierarchy

```
resonance-docs/
├── MASTER_ABSTRACT.md              ← THIS DOCUMENT (read by every agent)
├── ENGINE_CONCEPT.md               ← Concept Engine abstract (when written)
├── ENGINE_SONG.md                  ← Song Engine abstract (when written)
├── ENGINE_IMAGE.md                 ← Image Engine abstract (when written)
├── ENGINE_VIDEO.md                 ← Video Engine abstract (when written)
├── ENGINE_ASSEMBLY.md              ← Assembly Engine abstract (when written)
├── WORKSPACE_SPEC.md               ← detailed folder/JSON spec (when written)
├── OPEN_QUESTIONS.md               ← living document of unanswered questions
├── TESTING_NOTES.md                ← findings from manual testing
├── AI_FEEDBACK.md                  ← stress test results for reference
└── CHANGELOG.md                    ← what changed and when
```

### How to Use This Documentation

When starting a new chat to work on any component:
1. **Always** provide MASTER_ABSTRACT.md (this document)
2. Provide the relevant Engine Abstract(s)
3. Provide TESTING_NOTES.md if the work depends on empirical findings
4. Provide any existing code you want the agent to reference or refactor

No agent works in the dark. No agent makes assumptions that contradict the architecture.

---

## 14. Build Sequence

**Phase 1: Validation + First Engine Abstracts**
- [ ] Ace-Step Gradio validation: find optimal settings for German pronunciation
- [ ] Write ENGINE_CONCEPT.md (Concept/Lyrics Engine abstract)
- [ ] Write ENGINE_SONG.md (Song Engine abstract, informed by Gradio findings)

**Phase 2: Core Engines**
- [ ] Build Concept Engine (standalone, follows engine contract)
- [ ] Build Song Engine (standalone, follows engine contract)
- [ ] Validate: does a concept → song pipeline produce correct German pronunciation?

**Phase 3: Workspace + Minimal Orchestrator**
- [ ] Finalize WORKSPACE_SPEC.md
- [ ] Build workspace scaffolding (folder creation from CSV)
- [ ] Build minimal orchestrator: reads CSV, creates workspace, calls Concept Engine then Song Engine, writes manifests
- [ ] End-to-end test: 5 German words → songs with correct pronunciation

**Phase 4: Visual Pipeline**
- [ ] Write ENGINE_IMAGE.md and ENGINE_VIDEO.md
- [ ] Build Image Engine + Video Engine
- [ ] Build Assembly Engine (FFMPEG)
- [ ] End-to-end test: 5 words → finished .mp4 files

**Phase 5: Orchestrator UI**
- [ ] Build Studio mode UI (view words, stages, versions, settings, generate, select)
- [ ] Build Autopilot mode (batch processing with progress)
- [ ] Build preview helpers (play song, view images, play clips)

**Phase 6: Production Testing**
- [ ] Batch test: 20+ words in Autopilot
- [ ] Quality review: are outputs good enough for test users?
- [ ] Iterate on engine settings and prompts based on output quality

---

*This is a living document. It will be updated as engine abstracts are written and testing reveals new information. The version number tracks major revisions.*

*Architecture validated by: Claude (Anthropic), GPT 5.2, Grok, Gemini 3.1 Pro — February 2026.*
