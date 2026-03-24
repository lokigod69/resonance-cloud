# ENGINE_IMAGE.md — Image Engine Abstract

**Version:** 1.0
**Status:** Abstract finalized — ready for development
**Date:** March 1, 2026
**Parent Document:** MASTER_ABSTRACT.md v1.0
**Pipeline Stage:** Stage 3 (Image Generation)
**Purpose:** This document defines what the Image Engine does, what it accepts, what it produces, how it works internally, and what settings it exposes. Any agent building or modifying this engine reads this document alongside the Master Abstract.

---

## 1. Engine Purpose

The Image Engine is the third stage of the Resonance pipeline and the **visual creative brain** of the system. It takes a vocabulary word and produces a set of images — each with the target word artistically woven into the composition — plus video motion prompts that the Video Engine (Stage 4) will execute.

Unlike the Song Engine (which faithfully executes creative direction from Stage 1), the Image Engine **makes its own creative decisions**. It owns the visual direction entirely. The optional `visual_hint` from the Concept Engine (Stage 1) is a mood seed, not a directive — the Image Engine may use it, modify it, or ignore it.

The engine operates in two internal steps:

1. **Step A — Storyboard Generation (LLM call):** An LLM takes the word, settings, and optional context (visual hint, lyrics, music caption) and produces a structured JSON storyboard. The storyboard defines what each image depicts, how the word is integrated into the composition, and what camera/video motion to apply per scene.

2. **Step B — Image Rendering (Image model call):** Each scene's image prompt from the storyboard is sent to a Google Gemini image model (Nano Banana 2 / Nano Banana Pro) to produce the actual PNG files.

The storyboard JSON format serves double duty: it is both the creative plan AND the image generation prompt. The JSON is sent verbatim to the image model, which interprets the structured fields directly.

### 1.1 Core Creative Philosophy

The Image Engine exists to produce visuals that are **memorable, distinctive, and effective for vocabulary learning**. It does this through two primary mechanisms:

**The word is always in the composition.** By default, every generated image contains the target word as an artistic element of the scene — not as an overlay or subtitle, but integrated into the environment: written on surfaces, formed by objects, floating in space, carved into materials, displayed on signs. This is environmental text, not post-processing. The image model renders the word as part of the image itself. This is the engine's signature feature and primary learning mechanism — the visual word-form is permanently bound to the scene.

**Creative direction controls intensity, not content.** The engine does not tell the LLM "show a literal cow" or "show a metaphor for kindness." The LLM determines the appropriate content strategy based on the word type (concrete vs. abstract, single-meaning vs. polysemous). What the user controls is how aggressively creative the treatment is — from curated and elegant to wild and scroll-stopping.

### 1.2 What This Engine Is NOT

- It is NOT the Concept Engine. It does not generate lyrics or music captions. It receives an optional visual_hint.
- It is NOT the Video Engine. It produces still images and video motion prompts, not video clips.
- It is NOT the Assembly Engine. It does not composite text overlays, handle duration alignment, or produce final output.
- It is NOT the orchestrator. It does not read CSVs, create folders, or manage manifests.
- It does not handle settings inheritance, version selection, or workspace management. The orchestrator handles all of that.

---

## 2. Engine Contract Compliance

This engine follows the engine contract defined in Master Abstract Section 8.

### 2.1 Input

The engine receives a single payload:

```json
{
  "content": {
    "word": "Verzweiflung",
    "translation": "Desperation",
    "language": "German",
    "language_code": "de"
  },
  "context": {
    "visual_hint": "melancholic, urban, isolated",
    "lyrics": "[Spoken Word]\nVerzweiflung...\n\n[Verse - Steady]\nVerzweiflung...",
    "music_caption": "melancholic melodic techno, warm analog pads, deep sub-bass"
  },
  "settings": {
    "creative_direction": "editorial",
    "frame_narrative": "series",
    "image_count": "auto",
    "clip_duration": 30,
    "art_style": "auto",
    "word_in_image": true,
    "llm_model": "deepseek/deepseek-chat-v3-0324",
    "image_model": "quality"
  },
  "output_dir": "/path/to/workspace/verzweiflung/images/editorial-series_20260301T120000/",
  "metadata": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation",
    "timestamp": "2026-03-01T12:00:00Z",
    "concept_version": "standard_20260228T103000"
  }
}
```

**Key points about the input:**

- `content` contains the word data. `word`, `translation`, `language`, and `language_code` are required.
- `context` is entirely optional. All three fields (`visual_hint`, `lyrics`, `music_caption`) may be `null` or absent. The engine works with just the word. When present, these fields provide mood/tone context for the LLM's creative decisions.
- `settings` is the fully merged settings object (batch defaults + per-word overrides, resolved by the orchestrator). The engine does not perform any settings inheritance.
- `output_dir` is pre-created by the orchestrator. The engine writes output files here.
- `metadata` provides context for generation-meta.json. The `concept_version` field records which concept artifact was used as input (if any), enabling lineage tracking.

### 2.2 Output

The engine writes a set of image files, the storyboard, and generation metadata to the `output_dir`:

**Files written (3-image example):**
```
editorial-series_20260301T120000/
├── 001.png
├── 002.png
├── 003.png
├── storyboard.json
└── generation-meta.json
```

**storyboard.json** contains the complete storyboard with all scene data — descriptions, image prompts, video prompts, and word rendering instructions. This file is the creative record of what was generated and why.

**Return value:**
```json
{
  "status": "success",
  "output_paths": ["001.png", "002.png", "003.png", "storyboard.json"],
  "error": null
}
```

On partial failure (e.g., 2 of 3 images generated successfully):
```json
{
  "status": "partial",
  "output_paths": ["001.png", "003.png", "storyboard.json"],
  "error": "Scene 2 image generation failed: content policy block"
}
```

On complete failure:
```json
{
  "status": "error",
  "output_paths": [],
  "error": "LLM storyboard generation failed: API timeout"
}
```

**generation-meta.json is always written**, even on failure. This is an engine contract requirement.

### 2.3 What This Engine Must NOT Do

- Never read or write `manifest.json`
- Never create its own output directory
- Never communicate with other engines
- Never retain state between calls
- Never read `.env` for workspace data (only for API keys at startup)
- Never apply text overlays or post-processing to images — all text is rendered by the image model as part of the scene
- Never call the Video Engine — it produces video prompts but does not execute them

---

## 3. Two-Step Architecture

### 3.1 Overview

```
┌──────────────────────────────────────────────────────┐
│                    IMAGE ENGINE                       │
│                                                       │
│  ┌─────────────────┐         ┌─────────────────────┐ │
│  │  STEP A          │         │  STEP B              │ │
│  │  Storyboard LLM  │  JSON   │  Image Renderer      │ │
│  │  (OpenRouter)     │ ──────► │  (Nano Banana 2/Pro) │ │
│  │                   │         │                      │ │
│  │  IN: word +       │         │  IN: image_prompt    │ │
│  │      settings +   │         │      (per scene)     │ │
│  │      context      │         │  OUT: PNG file       │ │
│  │  OUT: storyboard  │         │      (per scene)     │ │
│  └─────────────────┘         └─────────────────────┘ │
│                                                       │
│  Writes: PNGs + storyboard.json + generation-meta.json│
└──────────────────────────────────────────────────────┘
```

### 3.2 Step A — Storyboard Generation

A single LLM call that takes the word, all settings, and optional context, then returns a complete storyboard as structured JSON.

**LLM Provider:** OpenRouter API (configurable model). The engine sends a system prompt + user prompt and receives a JSON response.

**One LLM call per generation.** The system prompt instructs the LLM to produce all scenes in one response. There is no separate "analysis" step, no per-scene refinement, no multi-turn conversation. One call, one storyboard. This keeps costs low and latency predictable.

**What the LLM decides:**
- What each scene depicts (content, subject, environment)
- How the word is integrated into each scene's composition
- The visual style and compositional details for each scene
- How scenes relate to each other (based on `frame_narrative` setting)
- Camera motion direction per scene (for Ken Burns / Video Engine Tier A)
- Full video motion prompt per scene (for AI video / Video Engine Tier D)

**What the LLM does NOT decide:**
- The number of scenes (set by `image_count`)
- The overall creative intensity (set by `creative_direction`)
- The relationship between frames (set by `frame_narrative`)
- The art style (set by `art_style`)
- Whether the word appears in the image (set by `word_in_image`)
- The aspect ratio (hardcoded 16:9)

### 3.3 Step B — Image Rendering

Each scene in the storyboard has an `image_prompt` field — a structured JSON object. This JSON is sent **verbatim** as the text prompt to the Gemini image model. The image model interprets the structured fields (subject, scene, style, lighting, composition, mood, colors, details, aspect_ratio, text_element) and generates an image.

**Image Model:** Google Gemini image generation models via the `@google/genai` SDK (Google AI Studio API).

**Two model options:**

| Setting Value | Model | Purpose |
|---|---|---|
| `"fast"` | Nano Banana 2 (gemini-2.5-flash-image or equivalent) | Fast iteration, testing, lower cost |
| `"quality"` | Nano Banana Pro (gemini-3-pro-image-preview or equivalent) | Best quality, production use |

Actual model IDs are configured via environment variables (see Section 9) to allow updates without code changes.

**Per-scene rendering:** Each scene is an independent API call to the image model. There is no cross-scene conditioning or style transfer — consistency between frames depends entirely on the storyboard prompt quality. The LLM (Step A) must generate prompts that produce coherent results when rendered independently.

**Output:** PNG files, one per scene. Named sequentially: `001.png`, `002.png`, etc.

**Word-in-image text rendering:** The word is rendered by the image model as part of the scene — not composited afterward. For Latin scripts, current Gemini image models achieve near-100% accuracy in text rendering, even for text integrated into complex scenes (clouds, surfaces, materials, neon signs). For Hangul (Korean), recent model updates have significantly improved reliability. For other non-Latin scripts (Japanese kanji, Arabic, etc.), reliability varies and should be tested per language.

If the image model fails to render text correctly (garbled characters, omitted text), the failure is visible in the output image. The user can delete the bad image and regenerate. There is no automatic retry or fallback to overlay text.

---

## 4. The Storyboard

### 4.1 Storyboard Structure

The storyboard is a JSON file containing analysis context and an array of scenes:

```json
{
  "word": "Verzweiflung",
  "translation": "Desperation",
  "language": "German",
  "creative_direction": "editorial",
  "frame_narrative": "series",
  "art_style": "auto",
  "scene_count": 3,
  "visual_concept": "A lone figure in a dark urban environment, seen across three cityscapes — each growing more oppressive. The word VERZWEIFLUNG appears as weathered graffiti, cracked neon, and rain-streaked window writing.",
  "shared_palette": ["charcoal", "deep blue", "amber"],
  "shared_motif": "Isolated figure against vast urban architecture",
  "scenes": [
    {
      "scene_number": 1,
      "description": "A lone figure stands beneath a massive concrete overpass at dusk. Rain-slicked pavement reflects amber streetlights. The word VERZWEIFLUNG is spray-painted in fading white across the concrete wall behind them, partially obscured by shadow.",
      "image_prompt": {
        "subject": "A lone figure in a dark coat, seen from behind, standing still",
        "scene": "Massive concrete overpass at dusk, rain-slicked pavement, empty urban landscape",
        "style": "Cinematic photography, shallow depth of field, desaturated with amber highlights",
        "lighting": "Low amber streetlights, overcast sky, wet reflections on pavement",
        "composition": "Wide shot, figure small in lower third, overpass dominating upper frame",
        "mood": "Isolation, weight, quiet desperation",
        "colors": ["charcoal", "deep blue", "amber", "concrete grey"],
        "details": "Rain mist, puddles with light reflections, distant blurred city lights",
        "aspect_ratio": "16:9",
        "text_element": {
          "text": "VERZWEIFLUNG",
          "rendering": "Fading white spray paint on rough concrete",
          "placement": "On the concrete wall behind the figure, large, partially in shadow"
        }
      },
      "word_render": {
        "enabled": true,
        "word": "VERZWEIFLUNG",
        "method": "spray-painted graffiti on concrete",
        "instruction": "The word VERZWEIFLUNG appears as fading white spray paint across the concrete wall, large enough to read clearly, partially obscured by shadow from the overpass"
      },
      "camera_motion": {
        "type": "slow_zoom_in",
        "direction": "toward the figure",
        "speed": "very slow",
        "description": "Slow push toward the figure, gradually revealing the graffiti text"
      },
      "video_prompt": "A lone figure stands motionless beneath a vast concrete overpass at dusk. Rain falls gently. Camera slowly pushes forward, revealing spray-painted text on the wall. Wet pavement reflects amber streetlights. Atmospheric, cinematic, melancholic."
    }
  ]
}
```

### 4.2 Scene Fields

Each scene in the storyboard contains:

| Field | Type | Purpose | Used By |
|---|---|---|---|
| `scene_number` | int | Sequential scene index (1-based) | Engine internal |
| `description` | string | Human-readable description of the scene | User review, debugging |
| `image_prompt` | object | Structured JSON sent verbatim to the image model | Step B (Image Renderer) |
| `word_render` | object | How the word is integrated into this scene | Step B (via image_prompt), User review |
| `camera_motion` | object | Simple motion direction for Ken Burns animation | Video Engine (Tier A) |
| `video_prompt` | string | Rich natural language video description | Video Engine (Tier D — AI video) |

### 4.3 The image_prompt Object

This is the creative core. Its fields are interpreted directly by the Gemini image model:

| Field | Type | Description |
|---|---|---|
| `subject` | string | The primary subject/focal point of the image |
| `scene` | string | The environment, setting, background |
| `style` | string | Visual/photographic style, rendering approach |
| `lighting` | string | Lighting conditions, direction, quality |
| `composition` | string | Camera angle, framing, spatial arrangement |
| `mood` | string | Emotional tone of the image |
| `colors` | array[string] | Dominant color palette |
| `details` | string | Additional environmental details, textures, elements |
| `aspect_ratio` | string | Always "16:9" |
| `text_element` | object or null | Word rendering instructions (null when `word_in_image` is false) |

The `text_element` sub-object:

| Field | Type | Description |
|---|---|---|
| `text` | string | The word to render (uppercase, in target language script) |
| `rendering` | string | How the text physically appears (material, style, technique) |
| `placement` | string | Where in the scene the text is located |

### 4.4 The camera_motion Object

Simple, structured motion instructions for Ken Burns-style animation (pan/zoom on a still image via FFMPEG). The Video Engine uses this for Tier A (no AI video model needed).

| Field | Type | Description |
|---|---|---|
| `type` | string | One of: `slow_zoom_in`, `slow_zoom_out`, `pan_left`, `pan_right`, `pan_up`, `pan_down`, `static` |
| `direction` | string | Natural language direction ("toward the subject", "across the landscape") |
| `speed` | string | One of: `very_slow`, `slow`, `medium` |
| `description` | string | Human-readable description of the motion |

### 4.5 The video_prompt Field

A natural language description of the scene with motion, suitable for AI video generation models (LTX, Kling, etc.). This is model-agnostic — the Video Engine adapts it to whatever model it uses.

### 4.6 Storyboard-Level Fields

These fields appear at the top level of the storyboard (outside the scenes array) and provide coherence guidance:

| Field | Description |
|---|---|
| `visual_concept` | One-paragraph summary of the overall visual approach for this set of images |
| `shared_palette` | Color palette shared across all scenes for visual consistency |
| `shared_motif` | Recurring visual element, subject, or compositional theme that ties scenes together |

These fields are generated by the LLM in Step A and are especially important when `frame_narrative` is `"series"` or `"angles"`, where visual coherence between frames matters.

---

## 5. Creative Direction Modes

The `creative_direction` setting controls **how aggressively creative** the visual treatment is. It does not dictate content (literal vs. metaphorical) — the LLM determines appropriate content based on the word type within the boundaries of the selected mode.

### 5.1 EDITORIAL (Default)

**Character:** Clean, intentional, curated. Magazine-quality art direction. Every element is considered and purposeful.

**LLM behavior:** Choose the most natural and effective visual representation of the word. For concrete nouns, this typically means a beautiful, well-composed depiction in an interesting setting. For abstract words, it means a clear metaphorical scene that communicates the meaning without ambiguity. The word is integrated elegantly — etched, printed, displayed, or written in a way that feels natural to the scene.

**Examples:**
- "Cow" → A cow in golden-hour light on a hillside, the word KUH written in morning dew on the grass in the foreground
- "Desperation" → A figure sitting alone in an empty subway station, VERZWEIFLUNG scratched into the bench surface
- "Freedom" → An open birdcage on a windowsill with curtains blowing, LIBERTÉ in peeling paint on the wall

**System prompt excerpt:**
```
You are creating a curated, magazine-quality visual for a vocabulary word. 
The image should feel intentional, well-composed, and art-directed — like 
a premium language learning experience. Choose the most natural and 
effective way to represent this word visually. Integrate the word into 
the scene elegantly and organically. Avoid cliché, stock-photo aesthetics. 
Every element should serve the composition.
```

### 5.2 CINEMATIC

**Character:** Dramatic, emotional, story-driven. Movie poster energy. The image implies a narrative even as a single frame.

**LLM behavior:** Create scenes with dramatic tension, emotional weight, and narrative implication. Use dramatic lighting, strong perspective, and compositional techniques that create a sense of story. The word appears as part of the drama — on a dramatic surface, in dramatic lighting, as part of the world's visual language.

**Examples:**
- "Cow" → A lone cow standing on an empty highway at dusk, headlights approaching from behind, KUH glowing on a distant road sign
- "Desperation" → Hands pressed against foggy glass from inside, VERZWEIFLUNG written backwards in the condensation, blurred city lights beyond
- "Kindness" → A hardened biker gently holding a kitten in a rainstorm, FREUNDLICHKEIT illuminated by a neon sign reflected in a puddle

**System prompt excerpt:**
```
You are creating a cinematic, emotionally charged visual for a vocabulary 
word. Think movie poster, film still, dramatic photography. The image 
should imply a story — something just happened or is about to happen. 
Use dramatic lighting, strong perspective, and emotional tension. The word 
is part of this dramatic world, appearing on surfaces, signs, or elements 
that feel native to the scene.
```

### 5.3 PROVOCATIVE

**Character:** Unexpected, jarring, funny, absurd, bold. Scroll-stopping content. The Von Restorff effect — things that stand out are remembered.

**LLM behavior:** Deliberately break expectations. Place objects in wrong contexts, violate physics, create absurd juxtapositions, use humor, surprise, or mild shock. A cow levitating above a field. A person standing on the ceiling. An object impossibly large or impossibly small. The goal is to create an image that makes the viewer stop, react, and remember. The word can be integrated in equally unexpected ways.

**Important constraint for the LLM:** The absurdity must still **serve the word's meaning**. An absurd image that has nothing to do with the word is just random — it needs to be meaningfully absurd, where the unexpected element either reinforces or playfully comments on the word's meaning. The viewer should be able to connect the surprising visual to the vocabulary concept.

**Examples:**
- "Cow" → A cow in a business suit sitting at a boardroom table, KUH embossed on its leather briefcase
- "Desperation" → A person in formal wear clinging to a giant clock hand as it ticks past midnight, VERZWEIFLUNG cracked into the clock face
- "Movement" → A fish swimming through a busy subway car, BEWEGUNG displayed on the train's destination sign

**System prompt excerpt:**
```
You are creating an unexpected, scroll-stopping visual for a vocabulary 
word. Break expectations. Use absurd juxtapositions, impossible physics, 
humor, surreal scenarios, or provocative compositions. The goal is to 
make the viewer stop and think "wait, what?" — and then connect the 
surprising visual to the word's meaning. The absurdity MUST serve the 
word — random weirdness is not the goal. The word appears in equally 
unexpected ways within the scene.
```

### 5.4 MINIMAL

**Character:** The word IS the image. Typographic-dominant composition where the scene serves the text, not the other way around.

**LLM behavior:** Make the word's letterforms the primary visual element. The environment, colors, materials, and energy of the scene support and amplify the word — but the word is the star. This ranges from serene (word floating in calm negative space) to intense (word rendered in molten metal, exploding with particles, shattered across the frame). The word's emotional weight determines the energy level.

**The word type influences the scene's energy and aesthetic:** A calm word like "détente" gets a calm MINIMAL treatment (soft colors, gentle environment). An intense word like "Verzweiflung" gets an intense MINIMAL treatment (dark palette, fractured letterforms, dramatic environment). The LLM reads the word's emotional register and matches the scene's intensity to it.

**Examples:**
- "Relaxation" → DÉTENTE in soft pink letters floating above still water, pastel gradient sky, everything serene
- "Desperation" → VERZWEIFLUNG in fractured, cracking metal letters against a dark storm sky, sparks falling
- "Cow" → KUH in massive three-dimensional letters made of grass and earth, standing in a field, with a small cow grazing at the base of the K

**System prompt excerpt:**
```
You are creating a typographic-dominant visual for a vocabulary word. 
The word's letterforms are the PRIMARY visual element — large, prominent, 
impossible to miss. The scene, environment, colors, and materials exist 
to support and amplify the word. Match the energy and aesthetic to the 
word's emotional register: calm words get serene treatments, intense words 
get dramatic treatments. The word should be visually stunning in its 
execution — the material, the lighting, the scale should make the 
typography itself compelling.
```

---

## 6. Frame Narrative Modes

The `frame_narrative` setting controls **how multiple frames relate to each other**. It is only meaningful when `image_count` > 1. For single-frame generations, this setting is ignored.

### 6.1 SERIES (Default)

**Same subject or concept, different environments.** Each frame features a recognizable recurring element (a character, an object, the word rendered the same way) placed in a different context. This is the car-ad approach: same car, different landscapes.

**Learning mechanism:** Reinforcement through repetition of the core visual concept. The viewer sees the same word-meaning mapping in multiple contexts, strengthening the association without introducing new concepts.

**Best at:** 3-6 frames. More frames = more environments = more reinforcement. This mode scales well with higher frame counts.

**LLM instructions:** Establish a clear recurring subject in scene 1. Carry it through all subsequent scenes. Vary the environment, time of day, weather, or setting — but keep the subject recognizable. The word should appear in a consistent style across scenes (same material/technique, adapted to each environment).

**Example for "Bewegung" (movement), 4 frames:**
1. A runner mid-stride on a mountain trail at dawn, BEWEGUNG carved into a trail marker
2. The same runner on a rain-soaked city street at night, BEWEGUNG in neon on a storefront
3. The same runner on a desert highway under blazing sun, BEWEGUNG written in the dust behind them
4. The same runner on a snowy forest path, BEWEGUNG imprinted in the snow

### 6.2 ANGLES

**Same scene, different perspectives.** A single moment or location explored from multiple viewpoints — close-up, wide shot, top-down, detail shot. This is the photography approach: one subject, many compositions.

**Learning mechanism:** Deep encoding through detailed visual exploration. The viewer builds a rich mental image of a single scene rather than multiple scenes.

**Best at:** 2-3 frames. More than 3 angles of the same scene risks feeling redundant.

**LLM instructions:** Design one compelling scene. Then create variations that show it from different distances and angles. Frame 1 is typically the establishing shot. Subsequent frames zoom in on details, shift perspective, or reveal hidden elements. The word should be visible from multiple viewpoints.

**Example for "Détente" (relaxation), 3 frames:**
1. Wide top-down view of two people on floating mattresses in a turquoise pool, DÉTENTE in pink letters on the water surface
2. Eye-level shot from the pool edge, one person sipping a cocktail, the word visible on a poolside towel
3. Close-up of hands trailing in the water, the word reflected in the pool surface

### 6.3 COLLECTION

**Each frame is a distinct interpretation.** Every scene is independently conceived — different subjects, different settings, different approaches to the word. They are thematically linked by meaning but visually independent.

**Learning mechanism:** Breadth of association. The viewer sees multiple facets of the word's meaning, building a richer semantic network. Effective for polysemous or abstract words where multiple interpretations exist.

**Best at:** 2-4 frames. More than 4 distinct interpretations risks cognitive overload — each new scene introduces new concepts the viewer must process. The science warns that this mode carries the highest "seductive details" risk.

**LLM instructions:** Generate independently conceived scenes, each exploring a different aspect or interpretation of the word. Maintain visual coherence through the shared palette and art style, but each scene should stand alone. Avoid repeating the same subject or setting. The word can be integrated differently in each scene.

**Example for "Sicherheit" (safety/security), 3 frames:**
1. A child sleeping peacefully in a blanket fort, SICHERHEIT stitched into the blanket
2. A massive vault door in a bank, SICHERHEIT engraved in the steel
3. A lighthouse beam cutting through fog, SICHERHEIT painted on the lighthouse base

---

## 7. Image Count and Clip Duration

### 7.1 Auto-Calculation

When `image_count` is set to `"auto"` (the default), the engine calculates the frame count from `clip_duration`:

| clip_duration | image_count | Rationale |
|---|---|---|
| 5 | 1 | Single stable image, looped or Ken Burns. Science: avoid scene cuts for short clips. |
| 10 | 2 | One cut at most. Timed with a potential example sentence shift. |
| 15 | 2 | Same as 10s — two scenes with slightly longer hold per scene. |
| 20 | 4 | Four scenes for medium-length clips. Good visual variety without overload. |
| 30 | 3 | 2-3 scenes max for a 30s clip. Enough for visual variety without overload. |

If `clip_duration` is not provided and `image_count` is `"auto"`, the engine defaults to `image_count: 1`.

### 7.2 Manual Override

In Studio mode, the user can set `image_count` to any integer from 1 to 8, regardless of `clip_duration`. This overrides the auto-calculation entirely.

Higher frame counts (5-8) are most effective with `frame_narrative: "series"`, where the repeating subject provides coherence across many frames. They are risky with `frame_narrative: "collection"`, where each additional frame introduces new visual concepts.

### 7.3 Interaction with Frame Narrative

| frame_narrative | Recommended image_count | Why |
|---|---|---|
| series | 1-8 (scales well) | Same subject in different environments — more frames = more reinforcement |
| angles | 2-3 (sweet spot) | Multiple angles of one scene — more than 3 risks redundancy |
| collection | 2-4 (caution above 4) | Distinct interpretations — each frame adds cognitive load |

The engine does not enforce these recommendations — the user can combine any frame count with any narrative mode. The LLM adapts its prompt to whatever combination is requested.

---

## 8. Settings Schema

The engine accepts a flat settings object. No nesting, no inheritance (the orchestrator resolves inheritance before calling the engine). Missing fields default gracefully.

### 8.1 Creative Settings

| Setting | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `creative_direction` | string | `"editorial"` | `"editorial"`, `"cinematic"`, `"provocative"`, `"minimal"` | How aggressively creative the visual treatment is |
| `frame_narrative` | string | `"series"` | `"series"`, `"angles"`, `"collection"` | How multiple frames relate to each other |
| `image_count` | string or int | `"auto"` | `"auto"` or `1`-`8` | Number of images to generate. `"auto"` calculates from `clip_duration` |
| `clip_duration` | int | `30` | `5`, `10`, `15`, `30` | Intended clip duration in seconds. Used for auto image_count calculation. Passed from manifest. |
| `art_style` | string | `"auto"` | `"auto"` or any style string | Visual aesthetic. `"auto"` = LLM picks what fits the word. Preset list + free text supported. |
| `word_in_image` | bool | `true` | `true`, `false` | Whether the word is artistically integrated into the scene composition |

### 8.2 Model Settings

| Setting | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `llm_model` | string | `"deepseek/deepseek-chat-v3-0324"` | Any OpenRouter model string | LLM used for storyboard generation (Step A) |
| `image_model` | string | `"quality"` | `"fast"`, `"quality"` | Image model for rendering (Step B) |

### 8.3 Art Style Presets

When `art_style` is not `"auto"`, the user can select from presets or provide free text:

**Presets:** `"photorealistic"`, `"watercolor"`, `"oil_painting"`, `"noir"`, `"studio_ghibli"`, `"comic_book"`, `"pixel_art"`, `"synthwave"`, `"ukiyo_e"`, `"renaissance"`, `"pen_and_ink"`, `"retro_90s"`, `"knitted"`, `"expressionist"`, `"vintage_film"`, `"chiaroscuro"`

**Free text:** Any string is accepted and injected into the LLM prompt as style direction. E.g., `"1970s Polaroid photography"`, `"Studio Ghibli meets cyberpunk"`, `"medical textbook illustration"`.

When `art_style` is `"auto"`, the LLM selects the most appropriate style for the word's emotional register and meaning. This is the recommended default — it gives the LLM maximum creative freedom to match style to content.

---

## 9. Environment and Configuration

### 9.1 Environment Variables

```python
# LLM Configuration (Step A)
OPENROUTER_API_KEY = ""          # API key for OpenRouter
IMAGE_LLM_DEFAULT = "deepseek/deepseek-chat-v3-0324"  # Default storyboard LLM

# Image Model Configuration (Step B)
GOOGLE_AI_API_KEY = ""           # Google AI Studio API key
IMAGE_MODEL_FAST = "gemini-2.5-flash-image"       # Fast/cheap image model
IMAGE_MODEL_QUALITY = "gemini-3-pro-image-preview" # Quality image model
```

### 9.2 Hardcoded Values

| Setting | Value | Rationale |
|---|---|---|
| Aspect ratio | 16:9 | Words are horizontal. Cinematic format. Consistent across all frames. |
| Image format | PNG | Lossless. Required for downstream Video Engine. |
| API response modality | IMAGE only | No text responses from the image model. |
| LLM temperature (storyboard) | 0.8 | Creative enough for variety, structured enough for valid JSON. |
| Max scenes | 8 | Upper bound on image_count. More than 8 is excessive for vocabulary content. |
| Min scenes | 1 | A single frame is valid for 5s clips. |

---

## 10. LLM System Prompt Design

### 10.1 Prompt Architecture

The system prompt is built dynamically from the settings. It has four sections:

1. **Role and task definition** — what the LLM is doing (generating a visual storyboard for a vocabulary word)
2. **Creative direction block** — injected based on `creative_direction` setting (see Section 5 for exact prompt excerpts)
3. **Frame narrative block** — injected based on `frame_narrative` setting (see Section 6 for instructions)
4. **Output schema** — the exact JSON structure the LLM must return

### 10.2 System Prompt Template

```
You are the visual creative director for a vocabulary learning system that 
produces music video-style clips for language learners. Your job is to 
create a visual storyboard for a single vocabulary word.

WORD: {word}
TRANSLATION: {translation}
LANGUAGE: {language}

{creative_direction_block}

{frame_narrative_block}

{art_style_block}

{word_in_image_block}

{context_block — if visual_hint, lyrics, or music_caption are provided}

Generate exactly {image_count} scenes. Each scene must work as a standalone 
16:9 image that would be compelling without any other context.

{output_schema}
```

### 10.3 Context Integration

When optional context fields are provided, they are injected as guidance:

```
CONTEXT (use as creative inspiration, not as strict requirements):
- Musical mood: {music_caption}
- Visual mood seed: {visual_hint}
- Song lyrics for reference: {lyrics}

Use this context to inform the emotional tone and atmosphere of your 
scenes. You are not required to follow it literally.
```

When no context is provided, the LLM works from the word alone.

### 10.4 Word-In-Image Block

When `word_in_image` is `true` (default):

```
WORD IN COMPOSITION (REQUIRED):
The word "{word}" must appear as readable text artistically integrated 
into every scene. It is NOT an overlay or subtitle — it is part of the 
scene's physical world.

The word must be:
- Large enough to read clearly at a glance
- Rendered in the target language script ({language})
- Integrated into the scene in a creative, organic way (written on 
  surfaces, formed by objects, displayed on signs, carved into materials, 
  floating in space, etc.)
- Never the same rendering technique twice across scenes (vary the 
  material and placement)

For each scene, specify the exact text, rendering technique, and 
placement in the text_element and word_render fields.
```

When `word_in_image` is `false`:

```
WORD IN COMPOSITION: DISABLED
Do not include any readable text in the scenes. Set text_element to null 
and word_render.enabled to false for all scenes.
```

### 10.5 Output Schema

The LLM is instructed to return a single JSON object matching the storyboard structure defined in Section 4. The prompt includes the exact field names, types, and descriptions to minimize parsing errors.

---

## 11. Image Rendering Pipeline

### 11.1 Per-Scene Rendering Flow

For each scene in the storyboard:

1. Extract the `image_prompt` JSON object
2. If `word_render.enabled` is `false`, set `text_element` to `null` in the image_prompt
3. Stringify the `image_prompt` object to a JSON string
4. Send the JSON string as the text prompt to the Gemini image model
5. Extract the base64 image data from the response
6. Save as `{scene_number:03d}.png` in the output directory
7. If the API returns no image data (content policy block, model refusal), log the error and continue to the next scene

### 11.2 API Call

```python
response = ai.models.generate_content(
    model=model_id,  # From IMAGE_MODEL_FAST or IMAGE_MODEL_QUALITY env var
    contents=[
        {
            "role": "user",
            "parts": [{"text": image_prompt_json_string}]
        }
    ],
    config={
        "responseModalities": ["IMAGE"]
    }
)
```

**No other parameters are set.** Resolution, dimensions, candidates, safety settings — all use model defaults. The aspect ratio is communicated through the prompt's `aspect_ratio` field, which the model interprets.

### 11.3 Error Handling

| Error | Handling |
|---|---|
| Content policy block (no image in response) | Log error, skip scene, continue. Report in return value as `"partial"` status. |
| API timeout | Retry once after 5 seconds. If second attempt fails, log and skip scene. |
| Rate limit (429) | Wait and retry with exponential backoff (max 3 retries). |
| Invalid API key | Fail immediately. Return `"error"` status. |
| LLM storyboard generation fails | Fail immediately. No images are generated. Return `"error"` status. |
| LLM returns invalid JSON | Attempt one repair (strip markdown fences, fix trailing commas). If still invalid, fail. |

---

## 12. Visual Science Integration

The following design decisions are grounded in the language learning science research (see deep-research-report-language-science.md):

### 12.1 Why the Word Is Always In The Image

**Dual coding theory** supports combining verbal and visual information for memory. The word in the composition creates a direct visual-verbal binding — the learner sees the word form AND its meaning simultaneously in a single integrated scene. This is stronger than showing them separately.

**On-screen text helps vocabulary learning** — meta-analyses find positive effects. The word rendered as environmental text is on-screen text with artistic enhancement.

**The target word should be visually distinct** — signaling/coherence principles recommend highlighting the learning target. Making the word large and prominent in the composition achieves this without a separate highlighting mechanism.

### 12.2 Why Frame Counts Are Conservative

**Seductive details impair learning** when they consume attention without serving the learning goal. Each additional frame is a potential seductive detail if it introduces visual complexity without reinforcing the word-meaning mapping.

**Cognitive load management** — fewer simultaneous elements, more progressive disclosure. 1-3 frames for most clips keeps the visual channel manageable.

**Exception: SERIES mode** scales well because additional frames reinforce the same concept rather than introducing new ones. The science supports this — repetition of the core mapping in varied contexts strengthens encoding.

### 12.3 Why PROVOCATIVE Is Not The Default

**Distinctiveness helps memory** (Von Restorff effect) but can also **increase confusion** when items are similar. Absurd imagery is best used selectively — for hard-to-learn or confusable items — not as the default for every word.

**Emotional arousal** strengthens memory for focal items but can **impair associative binding** (connecting the right meaning to the right word form). High-arousal visuals risk the learner remembering the cool image but forgetting which word it was for.

**EDITORIAL is the safe default** — effective, clear, memorable without being distracting. PROVOCATIVE is the power tool for specific situations.

### 12.4 Visual Strategy by Word Type

The LLM adapts its content approach based on word characteristics, regardless of creative direction:

| Word Type | Visual Approach | Rationale |
|---|---|---|
| Concrete, single-meaning (cow, house, apple) | Direct depiction in a compelling setting | High mapping accuracy. Pictures help most when the visual-meaning link is clear. |
| Abstract (kindness, freedom, desperation) | Metaphorical scene with culturally robust imagery + prominent word | Abstract mappings are fragile. The word in the composition provides the explicit meaning anchor the science recommends. |
| Polysemous (multiple meanings) | One sense per frame. Do not blend multiple meanings in one image. | Distinctiveness helps but similarity causes confusion. Separate senses into separate frames with clear visual differentiation. |
| Action verbs (run, fly, build) | Subject performing the action in context | Actions benefit from implied motion and context. |

---

## 13. generation-meta.json

Every engine call produces this file, even on failure:

```json
{
  "engine": "image",
  "engine_version": "1.0.0",
  "timestamp": "2026-03-01T12:00:00Z",
  "status": "success",
  "duration_seconds": 45.2,

  "input": {
    "word": "Verzweiflung",
    "language": "German",
    "language_code": "de",
    "concept_version": "standard_20260228T103000"
  },

  "settings": {
    "creative_direction": "editorial",
    "frame_narrative": "series",
    "image_count": 3,
    "image_count_source": "auto_from_clip_duration_30",
    "clip_duration": 30,
    "art_style": "auto",
    "word_in_image": true,
    "llm_model": "deepseek/deepseek-chat-v3-0324",
    "image_model": "quality"
  },

  "outputs": {
    "images_generated": 3,
    "images_requested": 3,
    "image_files": ["001.png", "002.png", "003.png"],
    "storyboard_file": "storyboard.json"
  },

  "steps": {
    "storyboard_generation": {
      "llm_model": "deepseek/deepseek-chat-v3-0324",
      "llm_provider": "openrouter",
      "prompt_tokens": 1250,
      "completion_tokens": 890,
      "duration_seconds": 3.4,
      "cost_estimate_usd": 0.002
    },
    "image_rendering": {
      "model": "gemini-3-pro-image-preview",
      "scenes_attempted": 3,
      "scenes_succeeded": 3,
      "scenes_failed": 0,
      "per_scene_seconds": [12.1, 14.5, 11.8],
      "total_duration_seconds": 38.4
    }
  },

  "error": null
}
```

---

## 14. Supported Languages

The Image Engine supports any language. Unlike the Song Engine (which depends on Ace-Step's language list), the Image Engine's language support is determined by:

1. **The storyboard LLM** — must understand the word and its meaning in context. Most modern LLMs handle all major languages.
2. **The image model's text rendering** — must render the word correctly in the target script.

| Script | Text Rendering Reliability | Notes |
|---|---|---|
| Latin (German, Spanish, Italian, French, etc.) | Very high (~100%) | Nano Banana Pro renders Latin text with near-perfect accuracy |
| Hangul (Korean) | High (improving) | Recent model updates significantly improved Korean text rendering |
| Hiragana/Katakana (Japanese) | Medium–High | Simpler characters render well; complex kanji less reliable |
| CJK (Chinese/Japanese kanji) | Medium | Complex characters may be garbled. Test per character. |
| Arabic | Low–Medium | Right-to-left rendering and connected script remain challenging |
| Cyrillic | High | Similar reliability to Latin scripts |

When the image model fails to render text correctly, the output image contains the error. The user deletes the bad image and regenerates. There is no automatic detection or retry for text rendering failures.

---

## 15. Project Structure

```
engine-image/
├── README.md
├── requirements.txt
├── .env.example
├── src/
│   ├── __init__.py
│   ├── engine.py              ← Main entry point: generate_images()
│   ├── storyboard.py          ← Step A: LLM storyboard generation
│   ├── renderer.py            ← Step B: Image model rendering
│   ├── prompts.py             ← System prompt builder (creative direction, frame narrative, etc.)
│   ├── models.py              ← Data models (ImagePayload, ImageResult, Storyboard, Scene, etc.)
│   └── config.py              ← Environment variable loading, model ID resolution
├── tests/
│   ├── test_engine.py         ← End-to-end engine tests
│   ├── test_storyboard.py     ← LLM prompt construction and response parsing tests
│   ├── test_renderer.py       ← Image model API tests (requires API key)
│   ├── test_prompts.py        ← Prompt builder unit tests
│   └── test_models.py         ← Data model validation tests
└── ui/
    └── app.py                 ← Standalone testing UI (FastAPI)
```

### 15.1 Key Function Signatures

```python
# engine.py — the engine contract entry point
def generate_images(payload: ImagePayload) -> ImageResult:
    """
    Main engine function. Receives a payload, generates storyboard via LLM,
    renders images via Gemini, writes output files to payload.output_dir,
    always writes generation-meta.json, returns status.
    """

# storyboard.py — Step A
def generate_storyboard(
    content: ImageContent,
    context: ImageContext,
    settings: ImageSettings
) -> Storyboard:
    """
    Build system prompt from settings, call LLM via OpenRouter,
    parse JSON response into Storyboard model.
    """

# renderer.py — Step B
def render_scene(
    image_prompt: dict,
    model_id: str,
    output_path: str
) -> RenderResult:
    """
    Send image_prompt JSON to Gemini image model,
    save PNG to output_path, return success/failure.
    """

# prompts.py — prompt construction
def build_system_prompt(
    word: str,
    translation: str,
    language: str,
    settings: ImageSettings,
    context: ImageContext | None
) -> str:
    """
    Assemble the complete system prompt from settings.
    Injects creative direction, frame narrative, art style,
    word-in-image, and context blocks.
    """
```

### 15.2 Dependencies

| Package | Purpose | Required |
|---|---|---|
| `httpx` | OpenRouter API client (LLM calls) | Yes |
| `google-genai` | Google AI Studio SDK (image generation) | Yes |
| `pydantic` | Data models and validation | Yes |
| `fastapi` + `uvicorn` | Standalone testing UI only | Testing only |

No heavy ML libraries. No image processing libraries (we don't touch the images post-generation). The Image Engine is a creative orchestration layer — LLM for planning, API for rendering.

---

## 16. Open Questions (To Be Resolved Through Testing)

### Storyboard LLM
- Which LLM produces the best storyboards for the cost? Compare DeepSeek Chat v3, Kimi 2.5, Qwen 3, Gemini 2.5 Flash via OpenRouter.
- Does the LLM reliably produce valid JSON storyboards, or does it need structured output / JSON mode?
- For PROVOCATIVE mode, which models produce genuinely creative/surprising scenes vs. generic "absurd" scenes?
- At what temperature does the LLM produce good variety without breaking JSON structure?
- Does providing lyrics and music_caption context measurably improve image quality/relevance, or is the word alone sufficient?

### Image Generation
- What is Nano Banana Pro's actual resolution output? (Not specified in API — model decides.)
- Is there a meaningful quality difference between Nano Banana 2 (fast) and Nano Banana Pro (quality) for vocabulary content specifically?
- For Hangul text rendering with the latest model update: what is the actual success rate? Test with 20+ Korean words.
- Content policy blocks: which types of words/scenes trigger blocks? How often does it happen for normal vocabulary content?
- Does the raw JSON prompt format produce better results than a natural language prompt for Gemini image models? (The JSON format is inherited from the existing engine and works well, but has it been compared?)

### Creative Modes
- Does EDITORIAL actually produce "curated, magazine-quality" results, or does it produce stock-photo-like images? What prompt refinements are needed?
- How reliably does PROVOCATIVE produce meaningfully absurd (connected to the word) vs. randomly absurd results? This is the hardest mode to get right.
- For MINIMAL mode: does the LLM correctly modulate intensity based on the word's emotional register (calm word = calm treatment, intense word = intense treatment)?
- Do the four modes produce sufficiently distinct results from each other, or do they converge?

### Frame Coherence
- For SERIES mode: does the LLM generate prompts that produce recognizably consistent subjects across independently rendered frames? (No cross-scene conditioning exists — consistency depends entirely on prompt quality.)
- For ANGLES mode: do different angles of the same scene render consistently without cross-scene conditioning?
- At what frame count does COLLECTION mode start producing incoherent or repetitive results?

### Word-In-Image
- For Latin scripts: confirm the ~100% text rendering accuracy claim across a variety of word lengths and rendering techniques.
- For Hangul: comprehensive testing with the latest model. What is the actual success rate?
- For Japanese: hiragana/katakana vs. kanji reliability comparison.
- Does the LLM generate sufficiently varied word rendering techniques across scenes (not repeating "neon sign" every time)?
- Do certain rendering techniques (carved in stone, written in clouds, painted on surfaces) produce more reliable text than others?

### Integration
- How does the storyboard quality affect downstream Video Engine results? Do better storyboard descriptions produce better AI video?
- Is the camera_motion field sufficient for Ken Burns animation, or does the Video Engine need additional parameters?
- What is the typical end-to-end generation time? (LLM call + N image renders.) Is it fast enough for Autopilot batch processing?

---

*This document is the build specification for the Image Engine. A coding agent building this engine should read this document alongside MASTER_ABSTRACT.md (for architecture rules and engine contract) and the deep-research-report-language-science.md (for understanding the learning science rationale behind design decisions).*

*When testing reveals answers to the open questions in Section 16, update this document. The abstract is a living specification.*
