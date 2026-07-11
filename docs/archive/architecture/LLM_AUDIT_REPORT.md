# Resonance Pipeline — Complete LLM Audit Report

> **Scope:** Read-only audit of every LLM and paid-API call across the orchestrator + all engines.  
> **Excludes:** `events.py`, `test_events_helper.py` (in-flight).  
> **Date:** 2026-04-23

---

## 1. Pipeline Overview — All Paid API Calls

| # | Stage | Call Site | Provider | Model | Call Type | Output |
|---|-------|-----------|----------|-------|-----------|--------|
| 1 | **Enrichment** | `feeder.py → enrichment.py` | OpenRouter | `deepseek/deepseek-v3.2` | LLM (JSON) | Word metadata array |
| 2 | **Concept — Lyrics** | `lyrics.py → generate_combined()` | OpenRouter | `deepseek/deepseek-v3.2` | LLM (JSON) | Lyrics + caption (LLM modes only) |
| 3 | **Concept — Caption** | `caption.py → generate_caption()` | OpenRouter | `deepseek/deepseek-v3.2` | LLM (JSON) | Music caption (template modes only) |
| 4 | **Image — Storyboard** | `storyboard.py → generate_storyboard()` | OpenRouter | `deepseek/deepseek-v3.2` | LLM (JSON) | Storyboard with scenes |
| 5 | **Image — Rendering** | `renderer.py → render_scene()` | Gemini / Wan (kie.ai) | `gemini-2.0-flash` / `wan/2-7-image` | Image Gen | PNG files |
| 6 | **Song (Suno)** | `suno.py → submit_song()` | kie.ai → Suno V5.5 | `suno_v5_5` | Music Gen | MP3 audio URLs |
| 7 | **Song (Ace-Step)** | Song Engine (RunPod) | Self-hosted | Ace-Step 1.5 | Music Gen | FLAC audio files |
| 8 | **Bookend — TTS** | `tts.py → generate_pronunciation()` | ElevenLabs | `eleven_flash_v2_5` | TTS | MP3 pronunciation |

> **Assembly & Bookend engines** make **zero LLM calls** — they are pure FFmpeg pipelines.  
> **Video engine** makes **zero LLM calls** — it consumes storyboard prompts via Ken Burns / LTX / Kling adapters.

---

## 2. Detailed Call-Site Analysis

### 2.1 Enrichment (Call #1)

**File:** [enrichment.py](file:///d:/CODING/ResonanceTEST/orchestrator/src/services/enrichment.py)  
**Caller:** [feeder.py](file:///d:/CODING/ResonanceTEST/orchestrator/src/orchestration/feeder.py) `bootstrap_job()` → `run_enrichment()`  
**Model:** `deepseek/deepseek-v3.2` (configurable via `llm_model` setting)  
**Batch:** Single call per job, batches all words in the deck  

#### Output Schema (per word)

| Field | Consumed By | Status |
|-------|------------|--------|
| `word_target` | Supabase `words.word`, manifest | ✅ **ACTIVE** — overwrites user input with normalized form |
| `translation` | Supabase, manifest, all engines, frontend cards | ✅ **ACTIVE** — critical path |
| `mnemonic` | Supabase, manifest, image engine context | ✅ **ACTIVE** — displayed on frontend cards |
| `etymology` | Supabase, manifest, image engine context | ✅ **ACTIVE** — displayed on frontend cards |
| `pos` | Supabase `words.pos` | ✅ **ACTIVE** — part-of-speech tag |
| `article` | Supabase `words.article` | ✅ **ACTIVE** — gendered articles (de/fr) |
| `synonyms` | Supabase `words.synonyms` | ✅ **ACTIVE** — displayed on frontend |
| `ipa` | Supabase `words.ipa` | ✅ **ACTIVE** — phonetic transcription |
| `example` | Supabase `words.example` | ✅ **ACTIVE** — example sentence |
| `example_gloss` | Supabase `words.example_gloss` | ✅ **ACTIVE** — translation of example |
| `tags` | Supabase `words.tags` | ✅ **ACTIVE** — topic/category tags |

> **Verdict:** ✅ Zero dead weight. Every field is consumed by Supabase and/or downstream engines.

#### Post-Processing Logic
- Article stripping from `word_target` (German der/die/das, French le/la/les)
- Noun capitalization for German
- These are good — they prevent the LLM's article from conflicting with the separate `article` field

---

### 2.2 Concept — Lyrics + Caption (Calls #2 & #3)

**Files:** [lyrics.py](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/concept_engine/lyrics.py), [caption.py](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/concept_engine/caption.py)  
**Model:** `deepseek/deepseek-v3.2` (fallback: Groq)  

#### Routing Logic
- **Template modes** (minimal/standard/reliable): 0 LLM calls for lyrics, 1 for caption → `generate_caption()`
- **LLM modes** (creative/storytelling): 1 combined call → `generate_combined()` (lyrics + caption together)
- **Maximum:** 1 LLM call per word for concept stage

#### Output Schema — Combined Call

| Field | Consumed By | Status |
|-------|------------|--------|
| `lyrics` / `suno_lyrics` | Song engine (Ace-Step/Suno), `generation-meta.json` | ✅ **ACTIVE** |
| `music_caption` | Song engine caption field, image engine context | ✅ **ACTIVE** |
| `visual_hint` | Image engine `ImageContext.visual_hint` | ✅ **ACTIVE** — feeds storyboard prompt |
| `genre` | Stored in concept artifact JSON | ⚠️ **PARTIALLY CONSUMED** — written to artifact, not directly used downstream |
| `mood` | Stored in concept artifact JSON | ⚠️ **PARTIALLY CONSUMED** — same as genre |
| `instruments` | Stored in concept artifact JSON | ⚠️ **PARTIALLY CONSUMED** — same |

> **Verdict:** The `genre`, `mood`, and `instruments` fields are baked INTO the `music_caption` string. They exist as separate parsed fields in the concept JSON but no downstream code reads them individually — they're redundant decompositions of the caption.

> [!TIP]
> **Quick win:** Stop requesting `genre`, `mood`, `instruments` as separate fields in the LLM prompt. They add ~50-80 completion tokens per call with zero downstream value. The `music_caption` already contains this information in natural language form.

---

### 2.3 Image Engine — Storyboard (Call #4)

**File:** [storyboard.py](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/image_engine/storyboard.py)  
**Model:** `deepseek/deepseek-v3.2` (configurable via `settings.llm_model`)  
**Provider:** OpenRouter  

This is the **most expensive LLM call** in the pipeline by token count — the system prompt alone is 2000-5000+ tokens depending on creative direction.

#### Top-Level Storyboard Output

| Field | Consumed By | Status |
|-------|------------|--------|
| `word`, `translation`, `language` | Echo-back for metadata | ⚠️ **ECHO — WASTE** |
| `creative_direction` | Sanitized and stored in meta | ⚠️ **ECHO — WASTE** (we already have it) |
| `frame_narrative` | Renderer chaining logic, `generation-meta.json` | ✅ **ACTIVE** (auto mode only — user-set mode is overwritten) |
| `art_style` | Overwritten by `_sanitize_storyboard()` if preset exists | ⚠️ **OVERWRITTEN** |
| `scene_count` | Pydantic validation, renderer loop | ✅ **ACTIVE** |
| `visual_concept` | `generation-meta.json` only | ⚠️ **META-ONLY** — never shown to users |
| `shared_palette` | Fallback image generator, `use_color_palette` gating | ✅ **CONDITIONALLY ACTIVE** |
| `shared_motif` | Not consumed anywhere | ❌ **DEAD WEIGHT** |
| `movie_source_strategy` | `generation-meta.json` only | ⚠️ **META-ONLY** |
| `movies_referenced` | `generation-meta.json` only | ⚠️ **META-ONLY** |
| `suggested_transition_mode` | Video engine transition routing | ✅ **ACTIVE** |
| `transition_rationale` | `generation-meta.json` only | ⚠️ **META-ONLY** |
| `music_caption` | Not consumed (already exists from concept) | ❌ **DEAD WEIGHT** |
| `mnemonic_text` | Not consumed downstream | ❌ **DEAD WEIGHT** |

#### Per-Scene Output

| Field | Consumed By | Status |
|-------|------------|--------|
| `scene_number` | File naming, renderer loop | ✅ **ACTIVE** |
| `description` | Not consumed by any engine | ❌ **DEAD WEIGHT** |
| `image_prompt.*` | Gemini/Wan renderer (JSON stringified) | ✅ **ACTIVE** — critical path |
| `word_render.*` | Renderer `text_element` gating | ✅ **ACTIVE** |
| `camera_motion.*` | Video engine Ken Burns / LTX adapter | ✅ **ACTIVE** |
| `video_prompt` | Video engine (LTX/Kling text prompt) | ✅ **ACTIVE** |
| `transition_prompt` | Video engine morphing logic | ✅ **ACTIVE** (non-collection modes) |
| `suggested_duration` | Video engine duration allocation | ✅ **ACTIVE** (short mode) |
| `duration_rationale` | Not consumed | ❌ **DEAD WEIGHT** |
| `movie_reference.*` | `generation-meta.json` only | ⚠️ **META-ONLY** |
| `remix_element.*` | `generation-meta.json` only | ⚠️ **META-ONLY** |

> [!WARNING]
> **Dead-weight fields in the storyboard call:** `shared_motif`, `music_caption` (duplicate), `mnemonic_text`, `description` (per-scene), `duration_rationale`. These collectively add **100-200 completion tokens per call** with zero functional impact.

> [!IMPORTANT]
> **Echo fields** (`word`, `translation`, `language`, `creative_direction`, `art_style`) add **~30-50 tokens** of pure waste. The orchestrator already has these values — asking the LLM to echo them back is paying for no information.

---

### 2.4 Image Engine — Rendering (Call #5)

**File:** [renderer.py](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/image_engine/renderer.py)  
**Models:** Gemini (`gemini-2.0-flash-preview-image-generation`) or Wan 2.7 (via kie.ai)  

This is **not an LLM call** — it's an image generation call. The `image_prompt` JSON from the storyboard is stringified and sent as the text prompt to Gemini's image generation endpoint.

**Cost drivers:**
- Per-image pricing (Gemini ~$0.04/image, Wan ~$0.03/image)
- 1-8 images per word (typically 2-3)
- Safety retry doubles cost on blocked scenes
- Fallback from Wan → Gemini doubles cost on Wan failures

> **No dead weight here** — the image_prompt fields are all consumed by the renderer.

---

### 2.5 Song — Suno via kie.ai (Call #6)

**File:** [suno.py](file:///d:/CODING/ResonanceTEST/orchestrator/src/suno.py)  
**Provider:** kie.ai → Suno V5.5  
**Cost:** $0.06 per submit (returns 2 songs A/B)

#### Input Fields

| Field | Source | Status |
|-------|--------|--------|
| `prompt` (lyrics) | Concept artifact `suno_lyrics` / `lyrics` | ✅ **ACTIVE** |
| `style` (music_caption) | Concept artifact `music_caption` | ✅ **ACTIVE** |
| `title` | Word text | ✅ **ACTIVE** |
| `vocalGender` | Concept settings | ✅ **ACTIVE** |
| `model` | Hardcoded `V5_5` | ✅ **ACTIVE** |

> **Verdict:** ✅ No waste on the input side. The copyright-retry path simplifies the payload (bare word + "pop" style), which is a good degradation strategy.

#### Output Consumption

| Field | Consumed By | Status |
|-------|------------|--------|
| `audioUrl` (track A) | Supabase `suno_audio_url`, bake-in pipeline | ✅ **ACTIVE** |
| `audioUrl` (track B) | Supabase `suno_audio_url_b` | ✅ **ACTIVE** |
| `taskId` | Supabase `suno_task_id`, polling | ✅ **ACTIVE** |

> **Verdict:** ✅ Clean consumption. Both tracks are stored and usable.

---

### 2.6 Song — Ace-Step (Call #7)

**Files:** [song_engine/models.py](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/song_engine/models.py), [song_engine/language.py](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/song_engine/language.py)  
**Provider:** Self-hosted RunPod (Ace-Step 1.5)  
**Cost:** GPU time (~$0.30-0.50/hr on A100, ~30s per batch of 4 takes)

#### Input Processing
- Language code validation against `VALID_LANGUAGES` (44 languages)
- Caption language remapping (Bisaya/Cebuano → Filipino)
- Language tag injection into lyrics (`[de] Hallo Welt`)

> **No dead weight** — this is a music generation model, not an LLM. All inputs are consumed.

---

### 2.7 Bookend — ElevenLabs TTS (Call #8)

**File:** [tts.py](file:///d:/CODING/ResonanceTEST/orchestrator/cloud_engines/bookend_engine/tts.py)  
**Provider:** ElevenLabs  
**Model:** `eleven_flash_v2_5` (configurable)  
**Cost:** ~$0.30/1000 characters (typically 3-15 chars per word = negligible)

#### Smart Caching
- Reuses TTS from previous bookend versions (copies file instead of API call)
- Skips if output already exists in current output dir
- **This is well-implemented** — avoids redundant API calls on retries

> **Verdict:** ✅ Minimal cost, good caching. No optimization needed.

---

## 3. Dead-Weight Summary

### Confirmed Dead Fields (Never Consumed)

| Stage | Field | Est. Tokens Wasted | Fix |
|-------|-------|--------------------|-----|
| Image Storyboard | `shared_motif` | 10-20 | Remove from schema |
| Image Storyboard | `music_caption` (top-level) | 15-30 | Remove — duplicate of concept |
| Image Storyboard | `mnemonic_text` | 10-25 | Remove from schema |
| Image Storyboard | `description` (per-scene × N) | 30-90 | Remove from schema |
| Image Storyboard | `duration_rationale` (per-scene × N) | 20-60 | Remove from schema |
| Concept | `genre` (separate field) | 5-10 | Stop requesting separately |
| Concept | `mood` (separate field) | 5-10 | Stop requesting separately |
| Concept | `instruments` (separate field) | 10-15 | Stop requesting separately |

**Total estimated waste:** ~105-260 completion tokens per word, per generation.

### Echo Fields (Information Already Available)

| Stage | Fields | Est. Tokens Wasted |
|-------|--------|--------------------|
| Image Storyboard | `word`, `translation`, `language`, `creative_direction` | 20-40 |
| Image Storyboard | `art_style` (overwritten post-parse) | 5-15 |

### Meta-Only Fields (Logged but Never Drive Logic)

| Stage | Fields | Risk of Removal |
|-------|--------|-----------------|
| Image Storyboard | `visual_concept`, `movie_source_strategy`, `movies_referenced`, `transition_rationale` | Low — useful for debugging, but could be trimmed |
| Image Storyboard | `movie_reference.*`, `remix_element.*` (per-scene) | Medium — useful for movie mode auditing |

---

## 4. Model Selection Analysis

### Current State

| Call Site | Model | Cost/1M tokens (in/out) | Assessment |
|-----------|-------|------------------------|------------|
| Enrichment | `deepseek-v3.2` | ~$0.14/$0.28 | ✅ Appropriate — structured JSON, batch |
| Concept (lyrics+caption) | `deepseek-v3.2` | ~$0.14/$0.28 | ✅ Appropriate — creative writing |
| Image Storyboard | `deepseek-v3.2` | ~$0.14/$0.28 | ⚠️ Overkill for structured JSON? |

### Observations

1. **DeepSeek V3.2 is used everywhere** — this is actually efficient. At $0.14/1M input tokens, it's among the cheapest capable models on OpenRouter.

2. **The storyboard system prompt is massive** (2000-5000+ tokens). This is the biggest cost driver on the LLM side. The prompt includes:
   - Full creative direction block (~500-1500 tokens depending on mode)
   - Mode explanation block (~200-400 tokens)
   - Art style descriptions (~100-200 tokens)
   - Word-in-image instructions (~150 tokens)
   - Output schema definition (~300-500 tokens)
   - Duration allocation rules (~100-200 tokens)
   - Movie-specific blocks (movie/remix modes add ~1500+ tokens)

3. **Groq fallback** exists in concept engine but is dormant — the code references it but current config uses DeepSeek exclusively.

> [!TIP]
> **The model choice is good.** DeepSeek V3.2 at $0.14/$0.28 per million tokens is already near the floor for models that can reliably produce structured JSON. Switching to a cheaper model risks JSON parsing failures that trigger retries, negating savings.

---

## 5. Prompt-Output Inconsistencies

| Issue | Location | Severity |
|-------|----------|----------|
| Schema asks for `music_caption` but concept already provides it | `prompts.py` `_music_caption_block()` | Low — wastes tokens |
| Schema asks for `mnemonic_text` but concept already provides mnemonic | `prompts.py` `_mnemonic_text_block()` | Low — wastes tokens |
| `art_style` is requested from LLM then overwritten by `_sanitize_storyboard()` | `storyboard.py:335-338` | Medium — wastes tokens and LLM effort |
| `frame_narrative` is requested then overwritten when user sets a specific mode | `storyboard.py:122-124` | Low — only wasteful in non-auto mode |
| Echo fields (word/translation/language) requested in output schema | `prompts.py` output schema block | Low — pure waste |

---

## 6. Cost Optimization — Prioritized Actions

### Tier 1: Quick Wins (No behavioral change)

| Action | Estimated Saving | Effort |
|--------|-----------------|--------|
| Remove dead fields from storyboard schema (`shared_motif`, `music_caption`, `mnemonic_text`, `description`, `duration_rationale`) | ~150 tokens/call | 1hr — edit prompt + relax Pydantic models |
| Remove echo fields from storyboard schema | ~30 tokens/call | 30min |
| Stop requesting `genre`/`mood`/`instruments` separately in concept | ~20 tokens/call | 30min |
| Skip `art_style` in LLM output when preset is set (don't ask LLM to generate what you'll overwrite) | ~10 tokens/call | 1hr |

**Combined Tier 1 saving:** ~210 completion tokens per word ≈ **$0.00006/word**. At 1000 words/month this saves ~$0.06/month. Small in absolute terms but reflects good engineering hygiene.

### Tier 2: Architectural Improvements

| Action | Estimated Saving | Effort |
|--------|-----------------|--------|
| Compress storyboard system prompt by 30% (remove redundant examples, tighten instructions) | ~1000 input tokens/call | 4hr |
| Cache storyboard system prompt hash → skip rebuild for identical settings | N/A (compute, not cost) | 2hr |
| Move movie mode blocks to separate template files (only load when needed) | ~1500 tokens saved for non-movie modes | 3hr |

### Tier 3: Strategic Changes (Require validation)

| Action | Estimated Saving | Effort |
|--------|-----------------|--------|
| Evaluate `deepseek-v3.2` vs `deepseek-chat` for enrichment (simpler task may work with cheaper model) | ~30% on enrichment calls | 4hr + testing |
| Wan-first rendering strategy (cheaper than Gemini, fall back on failure) | ~25% on image rendering | Already partially implemented |
| Reduce Suno A/B to single-track when B is never selected by user | 50% on Suno cost ($0.03/word) | 2hr + UX validation |

---

## 7. Cost-Logger Gap

> [!CAUTION]
> The `cost_logger.py` is currently a **complete no-op stub**. Every function returns `None` or `0.0`. All 13 call sites across all engines dutifully call `log_cost()` but no data is recorded.
> 
> This means you have **zero visibility** into actual per-word, per-stage costs in production. The cost estimation infrastructure exists (function signatures, Supabase table) but the implementation was removed.

This is the single biggest operational gap — you cannot optimize what you cannot measure.

---

## 8. Data Flow Summary

```
User submits deck
        │
        ▼
┌─────────────────┐
│  FEEDER         │  Source 1: new jobs
│  bootstrap_job()│  Source 2: retries
│                 │  Source 3: orphans
└───────┬─────────┘
        │
        ▼
┌─────────────────┐    LLM CALL #1
│  ENRICHMENT     │◄── DeepSeek V3.2 via OpenRouter
│  run_enrichment │    Batch: all words in deck
│                 │    Output: word_target, translation, mnemonic,
│                 │            etymology, pos, article, synonyms,
│                 │            ipa, example, example_gloss, tags
└───────┬─────────┘    ALL FIELDS → Supabase + manifest
        │
        ▼
┌─────────────────┐    LLM CALL #2 or #3 (mutually exclusive)
│  CONCEPT ENGINE │◄── DeepSeek V3.2 via OpenRouter
│  generate_concept│   Template mode: 1 call (caption only)
│                 │    LLM mode: 1 call (lyrics + caption combined)
│                 │    Output: lyrics, music_caption, visual_hint
└───────┬─────────┘    + genre/mood/instruments (DEAD WEIGHT)
        │
        ├──────────────────────────┐
        ▼                          ▼
┌─────────────────┐    ┌─────────────────┐
│  IMAGE ENGINE   │    │  SONG (Suno)    │
│                 │    │  OR             │
│  Step A:        │    │  SONG (Ace-Step) │
│  Storyboard LLM │◄── LLM CALL #4     │
│  (DeepSeek)     │    │                 │◄── API CALL #6/#7
│                 │    │  Suno: kie.ai   │
│  Step B:        │    │  Ace-Step: RunPod│
│  Image Render   │◄── API CALL #5     │
│  (Gemini/Wan)   │    └───────┬─────────┘
└───────┬─────────┘            │
        │                      │
        ▼                      ▼
┌─────────────────┐    ┌─────────────────┐
│  VIDEO ENGINE   │    │  ASSEMBLY       │
│  (0 LLM calls)  │    │  (0 LLM calls)  │
│  Ken Burns/LTX  │    │  FFmpeg only    │
│  /Kling adapter │    │                 │
└───────┬─────────┘    └───────┬─────────┘
        │                      │
        └──────────┬───────────┘
                   ▼
           ┌─────────────────┐
           │  BOOKEND ENGINE │
           │                 │◄── API CALL #8
           │  TTS: ElevenLabs│    (with smart caching)
           │  FFmpeg wrap    │
           └───────┬─────────┘
                   │
                   ▼
           ┌─────────────────┐
           │  PUBLISHING     │
           │  (0 LLM calls)  │
           │  Upload to      │
           │  Supabase Storage│
           └─────────────────┘
```

---

## 9. Key Findings

### ✅ What's Working Well

1. **Model selection is cost-efficient** — DeepSeek V3.2 is near the price floor for structured JSON
2. **Enrichment is clean** — zero dead-weight fields, all consumed
3. **Bookend TTS caching** — smart reuse across versions avoids redundant API calls
4. **Suno idempotency** — proper gate prevents double-submits
5. **Template modes** in concept engine eliminate LLM calls entirely for lyrics

### ⚠️ What Needs Attention

1. **Storyboard prompt bloat** — system prompt is 2000-5000 tokens, with movie modes pushing to 5000+
2. **Dead fields in storyboard schema** — 5 fields generate tokens that are never consumed
3. **Echo fields** — paying the LLM to repeat what we already know
4. **Cost logger is a no-op** — zero production cost visibility
5. **Concept engine generates `genre`/`mood`/`instruments` separately** but they're only useful as part of `music_caption`

### ❌ Critical Gap

**The cost_logger being a no-op means all the careful `log_cost()` instrumentation across 13 call sites is producing zero data.** Before optimizing individual tokens, restore the cost logger to get baseline measurements.
