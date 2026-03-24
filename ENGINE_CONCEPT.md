# ENGINE_CONCEPT.md — Concept Engine Abstract

**Version:** 1.0
**Status:** Abstract finalized — ready for development
**Date:** February 28, 2026
**Parent Document:** MASTER_ABSTRACT.md v1.0
**Pipeline Stage:** Stage 1 (Concept)
**Purpose:** This document defines what the Concept Engine does, what it accepts, what it produces, how it works internally, and what settings it exposes. Any agent building or modifying this engine reads this document alongside the Master Abstract.

---

## 1. Engine Purpose

The Concept Engine is the first stage of the Resonance pipeline. It takes a vocabulary word and produces a **concept artifact** — a JSON file containing structured lyrics and a music caption optimized for the Ace-Step music generation model.

The engine makes two creative decisions that cascade through the entire pipeline:

1. **How the lyrics are structured** — which directly determines whether Ace-Step pronounces the target word correctly. The lyrics are the temporal script that Ace-Step follows.
2. **What the music caption says** — which determines the entire sonic character of the output (genre, mood, instrumentation, vocal style).

An optional third output, the **visual hint**, is a short mood tag derived from the music caption. It is off by default and exists as a convenience for downstream stages.

### 1.1 What This Engine Is NOT

- It is NOT the orchestrator. It does not read CSVs, create folders, or manage manifests.
- It is NOT the Song Engine. It produces the *inputs* for song generation, not audio.
- It is NOT the Image Engine. Visual creativity belongs to Stage 3. The visual hint is a lightweight seed, not a visual directive.
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
  "settings": {
    "vocal_gender": "female",
    "lyric_mode": "standard",
    "genre": "auto",
    "syllable_chop": false,
    "duration": 30,
    "visual_hint": false,
    "llm_model": "deepseek/deepseek-chat-v3-0324"
  },
  "output_dir": "/path/to/workspace/verzweiflung/concept/",
  "metadata": {
    "word": "Verzweiflung",
    "language": "German",
    "timestamp": "2026-02-28T10:30:00Z"
  }
}
```

### 2.2 Output

The engine writes to the `output_dir` provided by the orchestrator:

**Files written:**
- `[descriptive-label]_[timestamp].json` — the concept artifact
- `generation-meta.json` — generation metadata (always, even on failure)

**Return value:**
```json
{
  "status": "success",
  "output_paths": ["standard_20260228T103000.json"],
  "error": null
}
```

### 2.3 What This Engine Must NOT Do

- Never read or write `manifest.json`
- Never create its own output directory
- Never communicate with other engines
- Never retain state between calls
- Never read `.env` for workspace data (only for API keys at startup)

---

## 3. The Concept Artifact

Each generation produces a single atomic JSON file. One take = one creative concept. The lyrics and music caption are creatively interdependent and stay together in one file.

```json
{
  "word": "Verzweiflung",
  "translation": "Desperation",
  "language": "German",
  "language_code": "de",

  "lyrics": "[Spoken Word]\nVerzweiflung...\n\n[Verse - Steady]\nVerzweiflung...\nVerzweiflung...\n\n[Chorus - Building]\nVerzweiflung!\nVerzweiflung! Verzweiflung!\n\n[Outro - Fading]\nVerzweiflung...",

  "music_caption": "melancholic melodic techno, warm analog pads, deep sub-bass, clear close-mic German female vocal, isolated, clear diction",

  "visual_hint": null,

  "generation_info": {
    "lyric_mode": "standard",
    "genre_mode": "auto",
    "syllable_count": 3,
    "word_length_class": "medium",
    "llm_calls": 1,
    "lyrics_source": "template",
    "caption_source": "llm"
  }
}
```

**Field definitions:**

| Field | Type | Description |
|---|---|---|
| `word` | string | The target vocabulary word in the target language |
| `translation` | string | Meaning of the word (used by LLM for context, not included in lyrics) |
| `language` | string | Full language name ("German", "Korean", etc.) |
| `language_code` | string | ISO 639-1 code ("de", "ko", etc.) |
| `lyrics` | string | Structured lyrics with Ace-Step section tags |
| `music_caption` | string | Single-line music caption for Ace-Step |
| `visual_hint` | string or null | Optional mood tag (null when disabled) |
| `generation_info` | object | Metadata about how this concept was generated |

---

## 4. Lyric Generation

### 4.1 Overview

Lyrics are generated in one of five modes. Three are template-based (zero LLM cost), two are LLM-enhanced (one API call each). The mode is selected by the user via the `lyric_mode` setting.

All modes produce lyrics optimized for Ace-Step:
- Use official Ace-Step structural tags: `[Verse]`, `[Chorus]`, `[Spoken Word]`, `[Outro]`, `[Instrumental]`
- Optional energy descriptors per tag: `[Verse - Steady]`, `[Chorus - Building]`, `[Spoken Word - Whispered]`
- Keep lines short: 1–3 words per line
- Never split the target word across lines
- Never include translation or non-target-language words in the lyrics
- Total content must fit within the specified duration (30s or 15s)
- Use `...` for breath pauses and held notes
- Use `!` for emphasis and energy

### 4.2 Syllable Analysis

Before generating lyrics, the engine analyzes the target word:

**Alphabetic languages** (German, Italian, Spanish, etc.): Use the `pyphen` library for linguistically accurate syllable counting. "Schmetterling" → 3 syllables. "Erbsenzähler" → 4 syllables.

**CJK languages** (Korean, Japanese, Chinese): Count characters as syllable proxy. Each hangul block, hiragana/katakana character, or CJK ideograph ≈ one syllable. "사랑" → 2 syllables. "さくら" → 3 syllables.

**Fallback**: Vowel-cluster counting for languages without pyphen dictionary support.

The syllable count determines:
- **Word length class**: short (1–2 syllables), medium (3–4), long (5+)
- **Repetition density**: short words repeat more, long words repeat less
- **Template selection**: within each mode, templates adapt to word length
- **Syllable chop availability**: only available for words with 2+ syllables

### 4.3 Template Modes (Zero LLM Cost)

#### Mode: Minimal

**Purpose:** Encoding spark. Maximum phonological clarity, zero distractions.
**Best for:** 5–15 second clips, first exposure, very long words.
**Repetitions:** 3–4 times.
**Learning science basis:** First exposure should prioritize a clear form-meaning link. No competing linguistic content.

```
# Short word (1-2 syllables), e.g., "Stahl" (steel)
[Verse]
Stahl...
Stahl...

[Chorus]
Stahl!
Stahl!

# Medium word (3-4 syllables), e.g., "Verzweiflung"
[Verse]
Verzweiflung...
Verzweiflung...

[Chorus]
Verzweiflung!

# Long word (5+ syllables), e.g., "Geschwindigkeitsbegrenzung"
[Spoken Word]
Geschwindigkeitsbegrenzung...

[Verse]
Geschwindigkeitsbegrenzung...

[Chorus]
Geschwindigkeitsbegrenzung!
```

#### Mode: Standard

**Purpose:** Phonetic anchor. The default 30-second format with delivery variation.
**Best for:** Standard vocabulary learning, default mode.
**Repetitions:** 4–6 times, depending on word length.
**Learning science basis:** 2–4 high-quality intelligible repetitions per clip beat quantity. Energy contour provides variation without adding linguistic complexity.

```
# Short word, e.g., "Mut" (courage)
[Spoken Word]
Mut...

[Verse - Steady]
Mut...
Mut... Mut...

[Chorus - Building]
Mut! Mut!
Mut! Mut! Mut!

[Outro - Fading]
Mut...

# Medium word, e.g., "Erbsenzähler"
[Spoken Word]
Erbsenzähler...

[Verse - Steady]
Erbsenzähler...
Erbsenzähler...

[Chorus - Building]
Erbsenzähler!
Erbsenzähler! Erbsenzähler!

[Outro - Fading]
Erbsenzähler...

# Long word, e.g., "Freundschaftsbeziehung"
[Spoken Word]
Freundschaftsbeziehung...

[Verse - Steady]
Freundschaftsbeziehung...

[Chorus - Building]
Freundschaftsbeziehung!
Freundschaftsbeziehung!

[Outro - Fading]
Freundschaftsbeziehung...
```

#### Mode: Dramatic

**Purpose:** Strong energy contour with more repetitions. Rhythmic and catchy.
**Best for:** Short words that benefit from rhythmic repetition, electronic/energetic genres.
**Repetitions:** 5–8 times for short/medium words, 4–6 for long words.
**Experimental feature:** Syllable chopping (see Section 4.5).

```
# Short word, e.g., "Licht" (light)
[Verse - Intense]
Licht!
Licht! Licht!

[Chorus - Explosive]
Licht! Licht! Licht!
Licht!

[Bridge - Whispered]
Licht... Licht...

[Outro - Building]
Licht! Licht! Licht! Licht!

# With syllable_chop enabled, medium word, e.g., "Banana"
[Verse - Rhythmic]
Ba-na... Ba-na...
Banana!

[Chorus - Building]
Banana! Banana!
Ba-na-na-na!

[Outro]
Banana...
```

### 4.4 LLM-Enhanced Modes (One API Call)

#### Mode: Contextual

**Purpose:** The target word plus 1–2 short phrases in the target language that use the word in context. For learners who want more substance.
**Best for:** Intermediate learners, 30-second clips, words that benefit from usage context.
**LLM task:** Generate 1–2 short phrases (3–5 words each) in the target language that include the target word. Phrases must use high-frequency vocabulary and natural phrasing.
**Learning science basis:** Intermediate/advanced learners benefit from one short, high-frequency example phrase including the target word. Keeps competing linguistic content minimal — reinforces meaning, doesn't introduce new vocabulary burden.

```
# Example output for "Sehnsucht" (longing/yearning)
[Spoken Word]
Sehnsucht...

[Verse - Gentle]
Sehnsucht in mir...
Sehnsucht...

[Chorus - Building]
Sehnsucht! Sehnsucht!

[Bridge]
Tiefe Sehnsucht...

[Outro - Fading]
Sehnsucht...
```

**LLM prompt structure for contextual mode:**

```
You are writing lyrics for a 30-second vocabulary learning song.

TARGET WORD: {word} ({translation})
LANGUAGE: {language}
SYLLABLE COUNT: {syllable_count}

Write short, structured lyrics following these rules:
- The target word MUST appear 3-5 times
- Add 1-2 very short phrases (3-5 words) in {language} that USE the target word naturally
- Phrases must use simple, high-frequency vocabulary — no rare words
- Use Ace-Step section tags: [Verse], [Chorus], [Spoken Word], [Outro]
- You may add one energy descriptor per tag (e.g., [Verse - Gentle])
- Keep lines short: 1-4 words per line
- Use "..." for pauses and "!" for emphasis
- NEVER include translation or English words
- NEVER split the target word into parts
- This is a 30-second song — keep it brief
- Output ONLY the lyrics, no explanation
```

#### Mode: Creative

**Purpose:** Maximum LLM freedom. May include synonyms, related words, meaning-adjacent phrases. For variety and advanced learners.
**Best for:** Advanced learners, preventing content monotony across hundreds of words, words with rich semantic fields.
**LLM task:** Generate lyrics that weave the target word with 2–3 meaning-related words or short phrases. More poetic, more varied, but the target word remains the centerpiece.
**Constraint:** Maximum 5 unique non-target words to prevent cognitive overload.

```
# Example output for "Schmetterling" (butterfly)
[Spoken Word]
Schmetterling...

[Verse - Soft]
Schmetterling fliegt...
So leicht, so frei...

[Chorus - Catchy]
Schmetterling! Schmetterling!

[Outro - Fading]
Fliegt... Schmetterling...
```

**LLM prompt structure for creative mode:**

```
You are writing lyrics for a 30-second vocabulary learning song.

TARGET WORD: {word} ({translation})
LANGUAGE: {language}
SYLLABLE COUNT: {syllable_count}

Write short, poetic lyrics following these rules:
- The target word MUST appear 3-4 times as the clear centerpiece
- Weave in 2-3 meaning-related words in {language} (synonyms, associated concepts)
- Use a maximum of 5 unique non-target words total
- Use Ace-Step section tags: [Verse], [Chorus], [Spoken Word], [Outro]
- You may add one energy descriptor per tag
- Keep lines short: 1-4 words per line
- Use "..." for pauses and "!" for emphasis
- NEVER include translation or English words
- NEVER split the target word into parts
- Prioritize musicality — these should feel like real song lyrics, not a language drill
- This is a 30-second song — keep it brief
- Output ONLY the lyrics, no explanation
```

### 4.5 Syllable Chopping (Experimental)

**Availability:** Only in Dramatic mode, only when `syllable_chop: true`, only for words with 2+ syllables.

**How it works:**

1. The engine splits the word at syllable boundaries using the same analysis from Section 4.2.
2. It takes the first 1–2 syllables and creates rhythmic fragments.
3. The fragments are woven into the Dramatic template as lead-ins or rhythmic elements.
4. **The full, intact word must still appear at least 3 times.** Fragments are decorative; the complete word is the phonological anchor.

**Splitting rules:**
- Alphabetic languages: pyphen syllable boundaries. "Schmetterling" → ["Schmet", "ter", "ling"]
- Korean: hangul block boundaries. "사랑" → ["사", "랑"]
- Japanese: character boundaries. "さくら" → ["さ", "く", "ら"]
- Use only the first 1–2 syllable fragments for repetition (avoid fragments that are unrecognizable)

**Template pattern with chopping:**
```
[Verse - Rhythmic]
{first_syllables}... {first_syllables}...
{full_word}!

[Chorus - Building]
{full_word}! {full_word}!
{syllable_pattern}!

[Outro]
{full_word}...
```

**Auto-disable conditions:**
- Word has only 1 syllable (nothing to chop)
- Language/script where syllable boundaries are unreliable
- First syllable fragment is fewer than 2 characters (too short to be meaningful)

**This feature is experimental.** If testing shows it consistently degrades pronunciation quality or confuses Ace-Step's alignment, disable it globally and remove from the settings schema. The engine must function identically with this feature removed.

---

## 5. Music Caption Generation

### 5.1 Overview

The music caption is a single-line text directive that tells Ace-Step what the song should sound like: genre, instruments, vocal style, mood. This is where the creative magic lives — the LLM deduces a musical identity from the word's meaning, emotional weight, and cultural associations.

The caption always requires one LLM call. There is no template-based caption mode, because the whole point is that each word gets a unique sonic identity.

**Exception:** If the user provides a manual genre override (`genre` setting is not "auto"), the caption prompt is more constrained, using the specified genre as the foundation rather than letting the LLM choose freely.

### 5.2 Caption Modes

#### Auto-Genre Mode (`genre: "auto"`)

The LLM has full creative freedom to choose a genre that embodies the word. This is the default and produces the most varied, interesting results.

**Prompt structure (based on existing working prompt):**

```
You are a music curator who matches words to their perfect sonic identity.

Word: "{word}" ({translation})
Language: {language}

Based on this word's emotional weight, cultural associations, and energy,
choose a musical style that EMBODIES the word — not one that "teaches" it.

Generate a single-line music caption in this format:
[genre], [2-3 specific instruments], [vocal type] {language} {vocal_gender} vocal, [2-3 mood words]

Rules:
- Under 20 words total
- Use specific instrument names (not generic terms)
- For 30-second songs, limit to 2-3 instruments
- Do NOT include BPM, key, or duration — Ace-Step handles these
- Output ONLY the caption line. No explanation.
```

#### Manual Genre Mode (`genre: "melodic techno"` or any string)

The user specifies the genre. The LLM fills in the rest (instruments, mood) appropriate to that genre and the word.

**Prompt structure (based on existing working prompt):**

```
You are a music production assistant generating a caption for Ace-Step AI music generator.

Genre: {genre}
Language: {language}
Song duration: {duration} seconds
Word: "{word}" ({translation})

Generate a single-line music caption in this format:
{genre}, [2-3 specific instruments], [vocal type] {language} {vocal_gender} vocal, [2-3 mood words]

Rules:
- Under 20 words total
- Use specific instrument names (not "{genre} instruments")
- For 30-second songs, limit to 2-3 instruments
- Do NOT include BPM, key, or duration — Ace-Step handles these
- Output ONLY the caption line. No explanation.
```

### 5.3 Caption Post-Processing

After the LLM returns the caption:

1. **Extract:** Take the first non-empty, non-metadata line from the response.
2. **Clean:** Strip surrounding quotes if present.
3. **Language injection:** If the caption does not contain "singing in {language}" or "{language} vocal" or similar language identifier, append "{language} {vocal_gender} vocal" to the caption. This ensures Ace-Step always receives a language signal.
4. **Length check:** If the caption exceeds 30 words, truncate to the first 25 words (preserving complete phrases where possible). Ace-Step's official guidance recommends captions under ~20 words for best results.

### 5.4 Caption Design Philosophy

The music caption is NOT forced to include phrases like "dry vocal," "minimal effects," or "clear diction" by default. The creative freedom of the caption is what makes each word's song unique and emotionally resonant.

- If testing reveals that certain caption styles (e.g., heavy reverb, ethereal ambience) consistently degrade pronunciation, those can be added to a soft blocklist — words/phrases the post-processor removes or flags.
- The Song Engine's Ace-Step settings (inference steps, guidance scale, etc.) are the primary control for pronunciation quality, not the caption style.
- This is a deliberate design choice to preserve artistic range. It can be revisited based on testing data.

---

## 6. Visual Hint (Optional)

### 6.1 Behavior

When `visual_hint: false` (default): The concept artifact's `visual_hint` field is `null`. No additional LLM processing.

When `visual_hint: true`: The music caption LLM call is extended to also produce a short mood tag. This adds approximately one sentence to the prompt and ~10 tokens to the output. The visual hint is extracted from the same LLM response as the caption — it is NOT a separate API call.

**Extended prompt addition (appended to caption prompt when visual_hint is enabled):**

```
Also generate a visual mood tag (3-5 words) that captures the emotional 
atmosphere of this word. Format: mood1, mood2, mood3

Output format:
Line 1: The music caption
Line 2: VISUAL: mood1, mood2, mood3
```

**Post-processing:** Parse line 2 to extract the visual hint. If parsing fails, set `visual_hint: null` silently (never fail the generation over a hint).

### 6.2 How Downstream Stages Use the Hint

The visual hint is a starting point for the Image Engine (Stage 3). The Image Engine may use it, modify it, or ignore it entirely based on its own settings. In Autopilot mode, if the user hasn't configured custom Image Engine settings, the hint provides a default creative seed that naturally fits the musical mood.

---

## 7. Settings Schema

The engine accepts a flat settings object. No nesting, no inheritance (the orchestrator resolves inheritance before calling the engine). Missing fields default gracefully.

| Setting | Type | Default | Valid Values | Description |
|---|---|---|---|---|
| `language` | string | *required* | Any language name | Full language name ("German", "Korean", etc.) — used in LLM prompts |
| `language_code` | string | *required* | ISO 639-1 | Two-letter code ("de", "ko") — used for syllable analysis and Ace-Step |
| `vocal_gender` | string | `"female"` | `"male"`, `"female"`, `"any"` | Injected into music caption for vocal type |
| `lyric_mode` | string | `"standard"` | `"minimal"`, `"standard"`, `"dramatic"`, `"contextual"`, `"creative"` | Which lyric generation strategy to use |
| `genre` | string | `"auto"` | `"auto"` or any genre string | `"auto"` = LLM picks genre. Any other value = forced genre |
| `syllable_chop` | bool | `false` | `true`, `false` | Experimental. Only applies in dramatic mode |
| `duration` | int | `30` | `15`, `30` | Affects template density and LLM prompt constraints |
| `visual_hint` | bool | `false` | `true`, `false` | Whether to generate a visual mood tag |
| `llm_model` | string | `"deepseek/deepseek-chat-v3-0324"` | Any OpenRouter model ID | Which LLM to use for generation |
| `llm_temperature` | float | `0.7` | `0.0` – `1.5` | LLM sampling temperature |

### 7.1 Settings Defaults

When a setting is missing from the payload, the engine uses the defaults listed above. This means the absolute minimum viable payload is:

```json
{
  "content": { "word": "Stahl", "translation": "Steel", "language": "German", "language_code": "de" },
  "settings": {},
  "output_dir": "/path/to/output/",
  "metadata": { "word": "Stahl", "language": "German", "timestamp": "2026-02-28T10:30:00Z" }
}
```

This produces: Standard mode lyrics (template, no LLM cost for lyrics) + auto-genre caption (one LLM call) + no visual hint.

---

## 8. LLM Integration

### 8.1 API Configuration

The engine uses OpenRouter as its LLM provider. API key is read from environment variable `OPENROUTER_API_KEY` at startup.

**Endpoint:** `https://openrouter.ai/api/v1/chat/completions`

**Default model:** `deepseek/deepseek-chat-v3-0324` — fast, cheap, good at creative generation. Configurable via settings.

**Parameters:**
- `max_tokens`: 256 (captions are short; even creative lyrics for 30s are under 200 tokens)
- `temperature`: From settings (default 0.7)

### 8.2 LLM Call Matrix

| Lyric Mode | LLM Calls | What the call produces |
|---|---|---|
| Minimal | 1 | Music caption only. Lyrics are template-generated locally. |
| Standard | 1 | Music caption only. Lyrics are template-generated locally. |
| Dramatic | 1 | Music caption only. Lyrics are template-generated locally. |
| Contextual | 1 (combined) | Music caption + contextual lyrics in a single call. |
| Creative | 1 (combined) | Music caption + creative lyrics in a single call. |

**With `visual_hint: true`:** No additional call. The hint request is appended to whatever LLM call is already being made.

**Maximum LLM calls per generation: 1.** Always. This is a design constraint. We never make two separate calls for caption and lyrics — when LLM lyrics are needed, the prompt asks for both in one call and the response is parsed into separate fields.

### 8.3 Combined Prompt Structure (Contextual/Creative Modes)

When the lyric mode requires LLM generation, the prompt combines the caption request and lyrics request:

```
[SECTION 1: MUSIC CAPTION]
{caption prompt as defined in Section 5.2}

[SECTION 2: LYRICS]
{lyrics prompt as defined in Section 4.4}

Output format:
CAPTION: [your single-line music caption]
LYRICS:
[your structured lyrics]
{if visual_hint enabled: VISUAL: mood1, mood2, mood3}
```

**Parsing:** The engine splits the response by the `CAPTION:`, `LYRICS:`, and optional `VISUAL:` markers. If parsing fails, the engine attempts best-effort extraction. If that also fails, it falls back to template lyrics with the raw first line as caption.

### 8.4 Error Handling

- **LLM call fails (network/API error):** Return `status: "failed"` with `error.retryable: true`. Write `generation-meta.json` with the error.
- **LLM response unparseable:** Fall back to template lyrics (Standard mode) + use raw LLM response as caption. Log a warning in `generation-meta.json` but return `status: "success"` since usable output was produced.
- **LLM returns empty response:** Return `status: "failed"` with `error.retryable: true`.

---

## 9. Generation Metadata

Every call produces a `generation-meta.json` in the output directory, per the engine contract.

```json
{
  "status": "success",
  "engine": "concept-engine",
  "engine_version": "0.1.0",
  "timestamp": "2026-02-28T10:30:00Z",
  "duration_seconds": 1.2,

  "context": {
    "word": "Verzweiflung",
    "language": "German",
    "translation": "Desperation"
  },

  "inputs": {
    "settings_used": {
      "lyric_mode": "standard",
      "genre": "auto",
      "vocal_gender": "female",
      "duration": 30,
      "syllable_chop": false,
      "visual_hint": false,
      "llm_model": "deepseek/deepseek-chat-v3-0324",
      "llm_temperature": 0.7
    }
  },

  "outputs": {
    "primary": "standard_20260228T103000.json",
    "format": "json",
    "lyrics_source": "template",
    "caption_source": "llm",
    "llm_calls_made": 1,
    "syllable_count": 3,
    "word_length_class": "medium",
    "word_repetitions": 5
  },

  "reproducibility": {
    "llm_model": "deepseek/deepseek-chat-v3-0324",
    "llm_temperature": 0.7,
    "note": "LLM output is non-deterministic. Template lyrics are deterministic for the same settings."
  },

  "error": null
}
```

---

## 10. Standalone Testing UI

### 10.1 Scope

The engine is a Python module with a clean API function: `generate_concept(payload) → ConceptResult`. The standalone testing UI is a **separate script** that imports this module and wraps it with a web interface. It is NOT part of the engine contract and is NOT used in production — the orchestrator calls `generate_concept()` directly.

### 10.2 Testing UI Features

The standalone UI provides:

- **CSV import:** Upload a word list (columns: `word`/`headword`, `meaning`/`definition`, optional: `language`). Creates an in-memory word list for the session. This is a testing convenience only — in production, the orchestrator handles CSV import.
- **Word list view:** All imported words in a clean layout. Each word shows: the word, translation, language, and whether a concept has been generated.
- **Generation interface:** Click a word → see editable settings → generate → view the concept artifact (lyrics + caption displayed separately in editable text areas).
- **Edit + regenerate:** Edit lyrics or caption text → save as a new concept version (never overwrite). The UI creates a new JSON file with a descriptive label and timestamp.
- **Multiple versions:** View all concept versions for a word. Select which one is "active" for downstream testing.

### 10.3 Technical Implementation

- **Framework:** FastAPI + lightweight HTML frontend (consistent with existing engine UI patterns).
- **Storage:** In-memory word list + filesystem for concept artifacts. No database required (SQLite is optional for convenience but not architecturally required).
- **Separation:** The UI script imports the engine module. If the engine module works, the UI works. If the UI breaks, the engine is unaffected.

---

## 11. Code Architecture

### 11.1 Module Structure

```
concept-engine/
├── CLAUDE.md                  ← Agent instructions (per PROJECT_OPS.md)
├── README.md                  ← Setup, usage, changelog
├── requirements.txt           ← Dependencies
├── src/
│   ├── __init__.py
│   ├── engine.py              ← Main entry point: generate_concept()
│   ├── lyrics.py              ← Template generation + LLM lyric prompt building
│   ├── caption.py             ← Caption prompt building + post-processing
│   ├── syllables.py           ← Syllable analysis (pyphen + CJK + fallback)
│   ├── templates.py           ← Hardcoded lyric templates by mode and word length
│   ├── llm_client.py          ← OpenRouter API client
│   └── models.py              ← Data models (ConceptPayload, ConceptResult, Settings, etc.)
├── tests/
│   ├── test_engine.py         ← End-to-end engine tests
│   ├── test_lyrics.py         ← Lyric generation tests per mode
│   ├── test_caption.py        ← Caption generation tests
│   ├── test_syllables.py      ← Syllable counting tests across languages
│   └── test_templates.py      ← Template output validation
└── ui/
    └── app.py                 ← Standalone testing UI (FastAPI, imports src/engine.py)
```

### 11.2 Key Function Signatures

```python
# engine.py — the engine contract entry point
def generate_concept(payload: ConceptPayload) -> ConceptResult:
    """
    Main engine function. Receives a payload, produces a concept artifact.
    Follows the engine contract: writes output to payload.output_dir,
    always writes generation-meta.json, returns status.
    """

# lyrics.py
def generate_lyrics(word: str, settings: ConceptSettings, syllable_info: SyllableInfo) -> LyricsResult:
    """
    Generates lyrics using template or LLM based on settings.lyric_mode.
    Returns structured lyrics string + metadata about generation method.
    """

# caption.py
def generate_caption(word: str, translation: str, settings: ConceptSettings, lyrics_context: str | None = None) -> CaptionResult:
    """
    Generates music caption via LLM. Always makes one API call.
    Returns caption string + optional visual hint.
    """

# syllables.py
def analyze_word(word: str, language_code: str) -> SyllableInfo:
    """
    Analyzes word for syllable count, word length class, and choppable fragments.
    Returns SyllableInfo with count, class, and fragment list.
    """
```

### 11.3 Dependencies

| Package | Purpose | Required |
|---|---|---|
| `pyphen` | Syllable counting for European languages | Yes |
| `httpx` or `requests` | OpenRouter API calls | Yes |
| `pydantic` | Data models and validation | Yes |
| `fastapi` + `uvicorn` | Standalone testing UI only | Testing only |

Minimal dependency footprint. No heavy ML libraries, no database drivers in the core engine.

---

## 12. Supported Languages

The engine is designed to support any language that Ace-Step supports. The following are the primary target languages for initial testing:

| Language | Code | Script | Syllable Method | Notes |
|---|---|---|---|---|
| German | `de` | Latin | pyphen | Primary test language |
| Italian | `it` | Latin | pyphen | |
| Spanish | `es` | Latin | pyphen | |
| Korean | `ko` | Hangul | Character count | Each hangul block ≈ 1 syllable |
| Japanese | `ja` | Mixed | Character count (kana) | Hiragana/katakana only; kanji needs reading |

Adding a new language requires:
1. Confirming its ISO 639-1 code is in Ace-Step's `VALID_LANGUAGES`
2. Adding syllable counting support (pyphen dictionary or character-based rule)
3. Testing template outputs and LLM prompt behavior for that language

No code changes to the engine contract, settings schema, or output format are needed.

---

## 13. Editing and Versioning

### 13.1 How Editing Works

The Concept Engine produces immutable output files. It never modifies an existing concept artifact. When the user wants to edit:

**Scenario 1: Generate → edit lyrics → save**
1. Engine generates `standard_20260228T103000.json` (lyrics + caption)
2. User edits the lyrics in the UI
3. UI saves a new file: `standard-edit_20260228T104500.json` with edited lyrics + original caption
4. Both versions coexist. The orchestrator/UI tracks which is selected.

**Scenario 2: Generate → edit caption → regenerate song**
1. Engine generates `auto-techno_20260228T103000.json`
2. User changes the caption text
3. UI saves: `auto-techno-edit_20260228T104500.json` with original lyrics + edited caption
4. When the Song Engine is called, the orchestrator passes the selected concept version's caption — which is the edited one.

**Scenario 3: Regenerate lyrics with different mode**
1. User has `standard_20260228T103000.json` (Standard mode)
2. User switches to Creative mode and regenerates
3. Engine produces `creative_20260228T110000.json` — completely new file
4. Both versions coexist.

### 13.2 Naming Convention

Output files are named: `[descriptive-label]_[ISO-timestamp].json`

The descriptive label reflects how the concept was created:

| Source | Label Pattern | Example |
|---|---|---|
| Template mode | Mode name | `minimal_20260228T103000.json` |
| LLM mode | Mode name | `contextual_20260228T103000.json` |
| Auto-genre | `auto-{genre-slug}` | `auto-melodic-techno_20260228T103000.json` |
| Manual genre | Genre slug | `ambient_20260228T103000.json` |
| User edit | Original label + `-edit` | `standard-edit_20260228T104500.json` |
| Manual import | `manual-import` | `manual-import_20260228T120000.json` |

---

## 14. Open Questions (To Be Resolved Through Testing)

### Lyric Templates
- Are 3 template tiers (minimal/standard/dramatic) sufficient, or do we need more variation within each tier?
- Do energy descriptors in structural tags (e.g., `[Verse - Steady]`) meaningfully affect Ace-Step's vocal delivery, or are they ignored?
- What is the optimal repetition count per word length class? Current defaults are estimates — validate with Ace-Step output quality.
- Does `[Spoken Word]` as the first section consistently produce a clear spoken pronunciation before the singing starts?

### Syllable Chopping
- Does syllable chopping improve or degrade Ace-Step pronunciation quality? Test across 10+ words in German and Korean.
- Does Ace-Step treat hyphenated fragments (e.g., "Schmet-ter...") as intended, or does it mangle them?
- Is pyphen's syllable splitting accurate enough for rhythmic chopping, or do we need manual correction for certain languages?

### Music Caption
- Does the existing auto-genre prompt need any adjustment for the new pipeline, or can it be used as-is from the existing engine?
- Are there caption styles that consistently degrade Ace-Step pronunciation? If so, build a soft blocklist.
- Should "clear diction" be injected into every caption by default, or only in a "pronunciation priority" mode?

### LLM Integration
- Is the combined prompt (caption + lyrics in one call) reliable, or does it degrade quality compared to separate calls? Test parsing success rate.
- Is `deepseek-chat-v3-0324` still the best model for this task, or should we default to something else?
- What is the failure rate of LLM calls, and is the template fallback sufficient for graceful degradation?

### Cross-Language
- How does Korean lyric generation compare to German? Are the templates sufficient or do Korean words need different structural patterns?
- For Japanese, should lyrics use hiragana, katakana, kanji, or romanization? The Ace-Step research suggests testing both native script and romanized forms.
- Does the language injection in caption post-processing work reliably for all supported languages?

### Duration
- Is 15 seconds a viable song duration for Ace-Step, or does it produce low-quality output at that length?
- Do the Minimal templates work well for 15-second durations, or do they need separate 15-second variants?

---

*This document is the build specification for the Concept Engine. A coding agent building this engine should read this document alongside MASTER_ABSTRACT.md (for architecture rules and engine contract) and the Ace-Step deep research document (for understanding what Ace-Step expects as input).*

*When testing reveals answers to the open questions in Section 14, update this document. The abstract is a living specification.*
