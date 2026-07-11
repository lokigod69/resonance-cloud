# INVESTIGATION REPORT — Lyric Levels (Niveau)

**Scope:** strictly read-only. No files were modified, created, or deleted during this investigation.
**Repos in scope:** orchestrator + frontend + concept engine.
**Date:** 2026-04-22.
**Method:** Four parallel read-only agents (Concept Engine, Song Engine + Suno, Settings Flow, Frontend Wizard) plus direct verification of the production dispatch path.

---

## Verdict

The design described in Section 0 of the prompt **is feasible** but needs three adjustments before an implementation prompt is written:

1. **Two concept-engine directories exist and have drifted.** Production (the cloud Docker image with `DISPATCH_MODE=direct`) imports from [orchestrator/cloud_engines/concept_engine/](orchestrator/cloud_engines/concept_engine/), bypassing the HTTP gateway entirely. The HTTP gateway at [engines/concept-engine/ui/app.py](engines/concept-engine/ui/app.py) is only used in local dev (HTTP mode). A `level` field added to one directory but not the other will silently fall back to defaults in whichever dispatch mode uses the missing side. Both trees must be kept in sync.

2. **The "gateway pattern bug" is real but has moved.** The classic risk — an HTTP gateway Pydantic model ([`RunSettings` in engines/concept-engine/ui/app.py:99-116](engines/concept-engine/ui/app.py#L99-L116)) silently dropping unknown fields — still applies to local-dev HTTP traffic. In production (`DISPATCH_MODE=direct`), the gateway is bypassed; the risk becomes divergence between the two `ConceptSettings` models in the two directories. Both `ConceptSettings` classes must get the field; the `RunSettings` class must get the field too.

3. **The `dramatic` slot is safe to repurpose, but the current template is purely formulaic repetition** — not LLM-generated. Level 4's "full-length, genre-aware, music_caption-influenced" behavior is a **replacement, not an extension**. The current `dramatic` template at [templates.py:477](orchestrator/cloud_engines/concept_engine/templates.py#L477) must be either deleted, renamed (e.g. `generate_dramatic_legacy`), or rewritten. No production path currently requests `dramatic` (only the concept-engine dev UI at [engines/concept-engine/ui/app.py:534](engines/concept-engine/ui/app.py#L534) does), so repurposing won't break production traffic — but it will break the dev UI's dropdown if the new semantics expect different input.

Everything else — the 4-level bubble grid, the `[Intro]` opener rule, the article being available at lyric-generation time, the frontend wizard-step insertion between Kunststil and Musik, the `suno_lyrics` being the only field that actually reaches kie.ai — is feasible as designed.

One meaningful design decision remains for Sir Robert (see Open Questions): **for Level 4, do you want the music_caption to be passed INTO the lyrics LLM call, or left alongside it?** Today it is NOT passed to the lyrics LLM in any mode.

---

## Section 2 — Concept Engine

> **⚠️ Directory note.** Two parallel concept-engine trees exist. Line references below cite the **production path** (`orchestrator/cloud_engines/concept_engine/`) which is what `DISPATCH_MODE=direct` (set in [orchestrator/Dockerfile.cloud:48](orchestrator/Dockerfile.cloud#L48)) imports from. The near-duplicate at `engines/concept-engine/src/` is used for local HTTP-mode dev. Both have the same six lyric-mode values and the same template/LLM split. See **Risks & Surprises** for a list of observed drift points.

### 2.1 Lyric-mode enum

**File:** [orchestrator/cloud_engines/concept_engine/models.py:78](orchestrator/cloud_engines/concept_engine/models.py#L78)

```python
allowed = ("minimal", "standard", "dramatic", "contextual", "creative", "reliable")
```

Confirmed as the six values in Section 0 of the prompt. Same tuple in [engines/concept-engine/src/models.py:78](engines/concept-engine/src/models.py#L78).

### Mode-to-generator map

| Mode | Kind | File | Function | Line |
|---|---|---|---|---|
| `minimal` | Template | [templates.py](orchestrator/cloud_engines/concept_engine/templates.py) | `generate_minimal()` | 135 |
| `standard` | Template | templates.py | `generate_standard()` | 222 |
| `reliable` | Template | templates.py | `generate_reliable()` | 354 |
| `dramatic` | Template | templates.py | `generate_dramatic()` → `_dramatic_no_chop()` / `_dramatic_with_chop()` | 477, 507, 613 |
| `contextual` | LLM | [lyrics.py](orchestrator/cloud_engines/concept_engine/lyrics.py) | `_generate_llm_path()` + `_contextual_lyrics_prompt()` | 183, 277 |
| `creative` | LLM | lyrics.py | `_generate_llm_path()` + `_creative_lyrics_prompt()` | 183, 313 |

Mode-routing dispatch is at [lyrics.py:159](orchestrator/cloud_engines/concept_engine/lyrics.py#L159) and [lyrics.py:34](orchestrator/cloud_engines/concept_engine/lyrics.py#L34) (`TEMPLATE_MODES = ("minimal", "standard", "dramatic", "reliable")`).

### 2.2 Prompts and template samples

**`contextual` prompt** ([lyrics.py:277](orchestrator/cloud_engines/concept_engine/lyrics.py#L277)):

```
You are writing lyrics for a {duration}-second vocabulary learning song.

TARGET WORD: {word} ({translation})
LANGUAGE: {language}
SYLLABLE COUNT: {syllable_info.count}
GRAMMATICAL ARTICLE: {article} — always use "{article} {word}" on the first mention in lyrics. NEVER use any other article with this word.

Write short, structured lyrics following these rules:
- The target word MUST appear {reps} times (2-3 for 15s, 3-5 for 30s)
- Add 1-2 very short phrases (3-5 words) in {language} that USE the target word naturally
- Phrases must use simple, high-frequency vocabulary — no rare words
- Use Ace-Step section tags: [Verse], [Chorus], [Spoken Word], [Outro]
- You may add one energy descriptor per tag (e.g., [Verse - Gentle])
- Keep lines short: 1-4 words per line
- Use "..." for pauses and "!" for emphasis
- NEVER include translation or English words
- NEVER split the target word into parts
- This is a {duration}-second song — keep it brief
- Output ONLY the lyrics, no explanation
```

**`creative` prompt** ([lyrics.py:313](orchestrator/cloud_engines/concept_engine/lyrics.py#L313)):

```
You are writing lyrics for a {duration}-second vocabulary learning song.

TARGET WORD: {word} ({translation})
LANGUAGE: {language}
SYLLABLE COUNT: {syllable_info.count}
GRAMMATICAL ARTICLE: {article} — always use "{article} {word}" on the first mention in lyrics. NEVER use any other article with this word.

Write short, poetic lyrics following these rules:
- The target word MUST appear {reps} times (2-3 for 15s, 3-4 for 30s) as the clear centerpiece
- Weave in 2-3 meaning-related words in {language} (synonyms, associated concepts)
- Use a maximum of 5 unique non-target words total
- Use Ace-Step section tags: [Verse], [Chorus], [Spoken Word], [Outro]
- You may add one energy descriptor per tag
- Keep lines short: 1-4 words per line
- Use "..." for pauses and "!" for emphasis
- NEVER include translation or English words
- NEVER split the target word into parts
- Prioritize musicality — these should feel like real song lyrics, not a language drill
- This is a {duration}-second song — keep it brief
- Output ONLY the lyrics, no explanation
```

**Template outputs (representative):**

- `reliable` ([templates.py:354](orchestrator/cloud_engines/concept_engine/templates.py#L354)) — opens with `[Spoken Word]\n{article} {word}...`, then Verse / Chorus / Outro with repetition.
- `standard` — opens `[Spoken Word]\n{article} {word}...` then Verse / Chorus / Outro.
- `minimal` — opens `[Verse]\n{article} {word}...` then Chorus with single bangs.
- `dramatic` — opens `[Verse - Intense]\n{article} {word}!` then Chorus / Bridge (whispered) / Outro (building), always `!`-heavy, single-word repetition.

**No existing mode produces `[Intro]\n{article} {word}` as the very first section.** Every mode uses `[Verse]` or `[Spoken Word]` as the opener. See 2.6.

### 2.3 `lyrics` vs `suno_lyrics`

Both fields are generated per word on every concept run. The split:

- **`lyrics`** — produced by the mode-specific generator (`generate_minimal/standard/dramatic/reliable/_generate_llm_path`). Stored on the `ConceptArtifact` at [engine.py:184](orchestrator/cloud_engines/concept_engine/engine.py#L184).
- **`suno_lyrics`** — ALWAYS produced by a template, independent of `lyric_mode`:
  - Single words → `generate_suno_lyrics(word, article)` at [templates.py:658](orchestrator/cloud_engines/concept_engine/templates.py#L658).
  - Phrases → `generate_phrase_suno_lyrics(phrase, language_code)` at [templates.py:693](orchestrator/cloud_engines/concept_engine/templates.py#L693).
  - Dispatch: [engine.py:180-183](orchestrator/cloud_engines/concept_engine/engine.py#L180-L183):
    ```python
    if is_phrase:
        suno_lyrics = generate_phrase_suno_lyrics(payload.content.word, lang_code)
    else:
        suno_lyrics = generate_suno_lyrics(word=payload.content.word, article=article)
    ```

**Answer to the "critical question for implementation":** Only `suno_lyrics` needs to change for the Niveau feature. `lyrics` is still populated but downstream (see Section 3) it is **not consumed by any production path** — the Suno audio path reads `suno_lyrics` first and only falls back to `lyrics` if missing, which never happens because the engine always populates both. So the lyric-mode-specific templates/prompts continue to drive `lyrics` (backward-compat), and `suno_lyrics` is what actually reaches Suno.

**Implication for Niveau implementation:** The four-level logic can be implemented either (a) entirely in the `suno_lyrics` branch — new generator per level that returns the `[Intro]\n{article} {word}\n...` structured output — or (b) in both `lyrics` and `suno_lyrics` branches. Option (a) is cleaner because it changes only what reaches Suno. The `lyric_mode` continues to drive the (now-vestigial) `lyrics` field; the new `level` drives `suno_lyrics`.

### 2.4 `external_music_caption` interaction

Handled at [engine.py:155](orchestrator/cloud_engines/concept_engine/engine.py#L155) (passed into `generate_lyrics`). Behaviour per [lyrics.py:64-202](orchestrator/cloud_engines/concept_engine/lyrics.py#L64-L202):

- **Template modes** (`minimal/standard/dramatic/reliable`): If `external_music_caption` is provided, the caption LLM call is skipped entirely (0 LLM calls). The caption does NOT influence lyric generation — lyrics come from the template regardless.
- **LLM modes** (`contextual/creative`): If `external_music_caption` is provided, the combined prompt is split into a lyrics-only call ([lyrics.py:194-202](orchestrator/cloud_engines/concept_engine/lyrics.py#L194-L202)). The `external_music_caption` is **not passed into the lyrics prompt body** — it is only used as a flag that determines which prompt template to use.

**For Level 4 (Song), the prompt says lyrics should adapt to the music_caption** (verse/chorus for pop, sparse for orchestral, looser for rap/techno). This requires a **new behavior**: the lyrics prompt must receive the music_caption as context. This is a non-trivial change — the current split makes the lyrics prompt caption-blind. Recommendation: for the new Song (Level 4) generator, pass the resolved music_caption (external or LLM-generated) into the lyrics prompt so the LLM can match the lyrical structure to the musical style. See Open Questions.

### 2.5 What `dramatic` currently does (and where it's referenced)

Current template output (3-syllable word, 30s, no chop):

```
[Verse - Intense]
{article} {word}!
{word}! {word}!

[Chorus - Explosive]
{word}! {word}! {word}!
{word}!

[Bridge - Whispered]
{word}... {word}...

[Outro - Building]
{word}! {word}! {word}!
```

Source: [templates.py:507-606](orchestrator/cloud_engines/concept_engine/templates.py#L507-L606). Purely formulaic — no LLM call, no genre awareness, just the word with `!` emphasis patterns. There is also a `_dramatic_with_chop()` variant ([templates.py:613](orchestrator/cloud_engines/concept_engine/templates.py#L613)) gated on the experimental `syllable_chop` setting.

**All references to the string `"dramatic"` in the repo:**

| File | Line | Role |
|---|---|---|
| [orchestrator/cloud_engines/concept_engine/models.py](orchestrator/cloud_engines/concept_engine/models.py#L78) | 78 | enum value in validator |
| [orchestrator/cloud_engines/concept_engine/lyrics.py](orchestrator/cloud_engines/concept_engine/lyrics.py#L34) | 34 | `TEMPLATE_MODES` tuple |
| [orchestrator/cloud_engines/concept_engine/lyrics.py](orchestrator/cloud_engines/concept_engine/lyrics.py#L159) | 159 | `elif settings.lyric_mode == "dramatic":` dispatch |
| [orchestrator/cloud_engines/concept_engine/templates.py](orchestrator/cloud_engines/concept_engine/templates.py#L477) | 477 | `generate_dramatic()` definition |
| engines/concept-engine/src/* | mirror | same hits in the HTTP-mode copy |
| [engines/concept-engine/ui/app.py](engines/concept-engine/ui/app.py#L534) | 534 | `<option value="dramatic">Dramatic</option>` in the dev UI |
| Tests in engines/concept-engine/tests/ | various | unit tests covering `dramatic` template output |

**User-facing surfaces:** The only user-facing place the string `"dramatic"` is exposed today is the **dev UI** at [engines/concept-engine/ui/app.py:534](engines/concept-engine/ui/app.py#L534) — an HTML `<option>` in a developer dropdown. No production frontend (in `orchestrator/frontend/src/`) offers `dramatic` as an option. Grepping the frontend translations / data confirms this.

**Production callers of `dramatic`:** None. The orchestrator's defaults send `"lyric_mode": "reliable"` ([orchestrator/src/settings.py:25](orchestrator/src/settings.py#L25)). No language profile or preset requests `dramatic`. Repurposing the slot will not break any production traffic. It WILL break the dev UI's dropdown option unless the UI is updated or the mode is hidden from the UI. The unit tests for dramatic will also need updating.

### 2.6 The opener rule

**Does any existing mode produce `[Intro]\n{article} {word}`?** No. The closest is `standard`/`reliable`, which open with `[Spoken Word]\n{article} {word}...` — same intent (article-prefixed word at the top) but wrong section tag and not what Suno's tag vocabulary treats as an intro.

**Is `article` available at lyric-generation time?** Yes.

- Resolution: [engine.py:102](orchestrator/cloud_engines/concept_engine/engine.py#L102) calls `article = resolve_article(payload.content.enrichment, lang_code)`.
- Source: [article.py](orchestrator/cloud_engines/concept_engine/article.py) — extracts from `enrichment.mnemonic` (e.g. `"DER Arzt (masculine)"` → `"der"`).
- Phrases skip article ([engine.py:108-110](orchestrator/cloud_engines/concept_engine/engine.py#L108-L110): `if is_phrase: article = ""`).
- Enrichment is supplied by the orchestrator from the `language_profiles` table / profile JSON before the concept call — confirmed by Agent A.

**Article-less languages:** [article.py:25-28](orchestrator/cloud_engines/concept_engine/article.py#L25-L28):

```python
ARTICLELESS_LANGUAGES: set[str] = {
    "ko", "ja", "zh", "tr", "fi", "hu", "pl", "ru", "cs", "hr",
}
```

For these, `resolve_article()` returns `""`. Bisaya (`ceb`) and Tagalog (`tl`) are **not** in this set — they would fall through to the enrichment-mnemonic path, and if no mnemonic exists, `article = ""`. For the `[Intro]` opener this is safe: `"" + " " + word` still produces a clean opener (just the bare word), just not article-prefixed. For the implementation prompt, the Level 2-4 generators should emit `{article} {word}` if article is non-empty, else just `{word}`, without the trailing space.

---

## Section 3 — Song Engine Dead Code Audit

### 3.1 Song Engine in production

**The local ACE-Step Song Engine is effectively dead in production.** Verified:

- Cloud production sets `DISPATCH_MODE=direct` in [Dockerfile.cloud:48](orchestrator/Dockerfile.cloud#L48).
- In direct mode, [orchestrator/src/cloud_dispatcher.py:186-187](orchestrator/src/cloud_dispatcher.py#L186-L187) intercepts any call to the song stage:
  ```python
  if engine == "song" and MUSIC_MODE == "suno":
      return await asyncio.to_thread(_create_song_placeholder, payload)
  ```
- [cloud_dispatcher.py:108](orchestrator/src/cloud_dispatcher.py#L108): `MUSIC_MODE = os.getenv("MUSIC_MODE", "suno")  # "suno" (the only supported mode; "acestep" backend removed)`.
- `_create_song_placeholder()` at [cloud_dispatcher.py:108-187](orchestrator/src/cloud_dispatcher.py#L108-L187) generates ~30s of silent FLAC via ffmpeg. The real audio is produced later by the Suno path.

The only remaining call site of `call_engine('song', ...)` is [pipeline.py:888](orchestrator/src/pipeline.py#L888), which routes through the dispatcher and therefore through the placeholder short-circuit. The song engine's port (8000) is still declared at [dispatcher.py:16](orchestrator/src/dispatcher.py#L16) but is never hit in the production (`DISPATCH_MODE=direct`) flow.

### 3.2 Is the `lyrics` field consumed?

**No — not by any production audio path.**

- Suno reads `suno_lyrics` first, falling back to `lyrics` only if `suno_lyrics` is missing ([orchestrator/src/suno.py:102](orchestrator/src/suno.py#L102)): `lyrics = concept.get("suno_lyrics") or concept.get("lyrics", "")`. But the concept engine ALWAYS populates both, so the fallback never fires in practice.
- The old song payload still includes `"lyrics": concept.get("lyrics", "")` at [pipeline.py:245-274](orchestrator/src/pipeline.py#L245-L274), but that payload goes to the placeholder generator which doesn't read it.
- No other consumer: grep of `concept.get("lyrics")` / `concept["lyrics"]` across the repo only returns the two dead references above and the artifact's own build.

**Implication:** Niveau only needs to change `suno_lyrics`. The `lyrics` field is vestigial.

### 3.3 Dead code candidates (not deleted, only enumerated)

Files/functions that exist for the Song Engine but are unreferenced by any production path:

- [orchestrator/cloud_engines/song_engine/](orchestrator/cloud_engines/song_engine/) — entire directory. `SongPayload` is imported at [cloud_dispatcher.py:42](orchestrator/src/cloud_dispatcher.py#L42) but never instantiated in the `MUSIC_MODE=suno` branch.
- [orchestrator/src/dispatcher.py:16](orchestrator/src/dispatcher.py#L16) — `'song': {'port': 8000, ...}` config.
- [orchestrator/src/pipeline.py:245-274](orchestrator/src/pipeline.py#L245-L274) — `build_song_payload()` builds a payload that is then discarded by the placeholder.
- [engines/song-engine/](engines/song-engine/) — entire local dev directory (ACE-Step Gradio/HTTP integration).

Cleanup is out of scope for this investigation.

---

## Section 4 — Settings Flow

### 4.1 The 8-layer chain

Where a `level` field (int 1-4) must be threaded end-to-end:

| # | Layer | File : Line | Model / Dict / Function | Shape | Action needed |
|---|---|---|---|---|---|
| 1 | Wizard state (frontend) | [useWizardState.ts:4-14](orchestrator/frontend/src/components/generate/useWizardState.ts#L4-L14) | `WizardState` interface + `WizardAction` type ([useWizardState.ts:16-30](orchestrator/frontend/src/components/generate/useWizardState.ts#L16-L30)) | TS interface | Add `niveau: string \| null` to state; add `SET_NIVEAU` action; add reducer case |
| 2 | Payload construction | [submitGeneration.ts:8-114](orchestrator/frontend/src/components/generate/submitGeneration.ts#L8-L114) | `submitGeneration()` | Function | Include `level` in `jobPayload.settings_override` |
| 3 | Supabase row insert | [supabase/migrations/20260324000000_schema_fixes.sql:4](orchestrator/frontend/supabase/migrations/20260324000000_schema_fixes.sql#L4) | `generation_jobs.settings_override` JSONB | JSONB column | No schema change; field is untyped JSONB |
| 4 | Orchestrator pickup | [feeder.py:424-486](orchestrator/src/orchestration/feeder.py#L424-L486) | `bootstrap_job()` — `settings_override = job.get("settings_override") or {}` at L480 | Dict passthrough | Automatic (dict-based) |
| 5 | Settings merge + defaults | [job_runner.py:102-131](orchestrator/job_runner.py#L102-L131) + [orchestrator/src/settings.py:21-119](orchestrator/src/settings.py#L21-L119) | `merge_settings()` + `DEFAULT_SETTINGS` + `SETTINGS_OVERRIDE_MAP` ([job_runner.py:93-99](orchestrator/job_runner.py#L93-L99)) | Dict + mapping | Add `"level"` to `SETTINGS_OVERRIDE_MAP`; add `"level": <default>` to `DEFAULT_SETTINGS["concept"]` |
| 6 | Concept Engine HTTP gateway | [engines/concept-engine/ui/app.py:99-116](engines/concept-engine/ui/app.py#L99-L116) | `RunSettings` (Pydantic, separate from internal model) | **Silent-drop risk** | **Must add `level` field here**. Only exercised in local HTTP dev; not exercised in cloud prod. But still required for dev parity. |
| 7a | Concept Engine internal — HTTP tree | [engines/concept-engine/src/models.py:47-97](engines/concept-engine/src/models.py#L47-L97) | `ConceptSettings` | Pydantic | Add `level` field with validator (1-4) |
| 7b | Concept Engine internal — DIRECT tree | [orchestrator/cloud_engines/concept_engine/models.py:47-97](orchestrator/cloud_engines/concept_engine/models.py#L47-L97) | `ConceptSettings` (second copy) | Pydantic | **Must also add `level` field here**. This is the one production hits. |
| 8 | `generate_concept()` entry | [orchestrator/cloud_engines/concept_engine/engine.py:46](orchestrator/cloud_engines/concept_engine/engine.py#L46) (prod) + [engines/concept-engine/src/engine.py:46](engines/concept-engine/src/engine.py#L46) (dev) | `generate_concept(payload: ConceptPayload)` | Function | Consume `payload.settings.level`; branch into the new Niveau generator |

**The gateway is NOT the single biggest risk any more.** It was when the orchestrator called the concept engine over HTTP. Now that production uses `DISPATCH_MODE=direct`, the biggest silent-drop risk is **layer 7b** — the second `ConceptSettings` at `orchestrator/cloud_engines/concept_engine/models.py`. If `level` is added to `engines/concept-engine/src/models.py` but NOT to `orchestrator/cloud_engines/concept_engine/models.py`, **production will silently use the default**.

### 4.2 Defaults and settings-defaults.json

**`DEFAULT_SETTINGS["concept"]`** at [orchestrator/src/settings.py:21-32](orchestrator/src/settings.py#L21-L32):

```python
DEFAULT_SETTINGS = {
    "concept": {
        "vocal_gender": "female",
        "lyric_mode": "reliable",
        "genre": "auto",
        "caption_style": "production",
        "syllable_chop": False,
        "duration": 20,
        "visual_hint": False,
        "use_art_style": False,
        "llm_model": "deepseek/deepseek-v3.2",
    },
    # ...
}
```

Note: default `lyric_mode` is `"reliable"`, not `"standard"`. The Niveau Level 1 (Standard-label bubble → `reliable` backend mode) therefore matches the existing default, which is good — no migration needed for Level 1.

**Snapshot mechanics** — `load_defaults()` at [orchestrator/src/settings.py:122-137](orchestrator/src/settings.py#L122-L137):

- Loads workspace-relative `settings-defaults.json` if present (line 129).
- Falls back to the hardcoded `DEFAULT_SETTINGS` otherwise (line 137).
- Merges per-stage: `{**hardcoded_default, **file_overrides}` (line 135).
- Called once per job bootstrap at [feeder.py:481](orchestrator/src/orchestration/feeder.py#L481), then `merge_settings()` layers `settings_override` on top.

**Resolution of the memory-vs-handoff contradiction:** `settings-defaults.json` is a **per-workspace** snapshot (the workspace root folder holds one file). It is not snapshotted per-deck and not rewritten per-generation — `merge_settings()` at [job_runner.py:102](orchestrator/job_runner.py#L102) produces an **in-memory** merged dict each run but does not write the snapshot back. The handoff memo was describing the in-memory merge behavior; the actual file is stable per-workspace.

**Existing-deck scenario:** A deck created before Niveau ships has no `level` in any stored row (nothing in `settings_override`, nothing in the workspace snapshot). When a new job is bootstrapped after shipping:

1. `DEFAULT_SETTINGS["concept"]["level"] = <default>` is picked up (once the field is added to the dict in step 5 above).
2. `merge_settings()` yields the default unless `settings_override` supplies a value.
3. The default reaches the Niveau generator.

**No migration is required** — the default applies silently. Recommendation: set `DEFAULT_SETTINGS["concept"]["level"] = 1` so existing decks keep producing Standard lyrics (matching today's `reliable` output semantically).

### 4.3 The gateway risk — specifically

Yes, the Concept Engine's HTTP gateway has its own Pydantic model, and it does drift. [engines/concept-engine/ui/app.py:99-116](engines/concept-engine/ui/app.py#L99-L116):

```python
class RunSettings(BaseModel):
    vocal_gender: str = "female"
    lyric_mode: str = "standard"     # ← different default than ConceptSettings!
    genre: str | None = "auto"
    caption_style: str = "production"
    use_art_style: bool = False
    art_style_hint: str = ""
    syllable_chop: bool = False
    duration: int = 30               # ← also different default
    visual_hint: bool = False
    llm_model: str = "moonshotai/kimi-k2.5"
```

Already-existing drift vs the internal [ConceptSettings](orchestrator/cloud_engines/concept_engine/models.py#L47-L97): `lyric_mode` defaults to `"standard"` in the gateway, `"standard"` in the dev-tree `ConceptSettings`, but the orchestrator sends `"reliable"` as its own default. The gateway's default only takes effect if someone POSTs to the engine directly (dev UI traffic). Not a production issue, but evidence that the two models CAN drift silently.

**For the `level` field:** must be added to `RunSettings` too. Pydantic's default `extra="ignore"` would silently drop unknown fields from the HTTP body if only one side is updated.

---

## Section 5 — Frontend Wizard

### 5.1 Architecture and production routing

Frontend lives at [orchestrator/frontend/src/](orchestrator/frontend/src/). Routing at [App.tsx:103-156](orchestrator/frontend/src/App.tsx#L103-L156):

```tsx
{skin === 'glassy' ? (
  <Route element={<PolishGlassLayout />}>
    <Route path="/generate" element={<GenerateGO />} />
  </Route>
) : (
  <Route element={<AppLayout />}>
    <Route path="/generate" element={<Generate />} />
  </Route>
)}
```

Three `Generate*` files exist:

- [pages/GenerateGO.tsx](orchestrator/frontend/src/pages/GenerateGO.tsx) — used when `skin === 'glassy'` (the "Glassy" skin per the prompt's naming).
- [pages/Generate.tsx](orchestrator/frontend/src/pages/Generate.tsx) — used otherwise; appears to be a redirect stub / the "Classic" skin shell.
- [pages/GeneratePG.tsx](orchestrator/frontend/src/pages/GeneratePG.tsx) — a third alternate that exists in the tree but is **not routed** from `App.tsx`. Either dormant or invoked indirectly — worth confirming with Sir Robert before assuming it's live.

**Wizard state hook:** [components/generate/useWizardState.ts](orchestrator/frontend/src/components/generate/useWizardState.ts). State shape at lines 4-14:

```ts
export interface WizardState {
  step: 1 | 2 | 3 | 4 | 5 | 6
  path: 'undecided' | 'quick' | 'custom'
  language: string | null
  words: string[]
  vibe: string | null
  movieTitle: string | null
  artStyle: string | null
  genre: string | null
  deckName: string
}
```

Actions at lines 16-30 include `SET_GENRE`, `SET_ART_STYLE`, `NEXT_STEP`, `PREV_STEP`, `GO_TO_STEP`. No `SET_NIVEAU` yet.

**Step components folder:** [components/generate/steps/](orchestrator/frontend/src/components/generate/steps/):

- LanguageStep.tsx
- WordsStep.tsx
- VibeStep.tsx
- ArtStyleStep.tsx
- MusicStep.tsx
- ConfirmStep.tsx
- CategoryPicker.tsx (shared)

### 5.2 MusicStep as the template

**File:** [components/generate/steps/MusicStep.tsx](orchestrator/frontend/src/components/generate/steps/MusicStep.tsx). Options come from [components/generate/wizardData.ts:134-146](orchestrator/frontend/src/components/generate/wizardData.ts#L134-L146):

```ts
export const GENRES = [
  { value: 'auto', label: 'Auto' },
  { value: 'pop', label: 'Pop' },
  { value: 'rock', label: 'Rock' },
  { value: 'electronic', label: 'Electronic' },
  { value: 'jazz', label: 'Jazz' },
  { value: 'hip-hop', label: 'Hip-hop' },
  { value: 'classical', label: 'Classical' },
  { value: 'folk', label: 'Folk' },
  { value: 'r&b', label: 'R&B' },
  { value: 'reggae', label: 'Reggae' },
  { value: 'custom', label: 'Custom' },
] as const
```

**Dispatch pattern** at [MusicStep.tsx:34-37](orchestrator/frontend/src/components/generate/steps/MusicStep.tsx#L34-L37):

```ts
function selectPreset(value: string | null) {
  setShowCustomInput(false)
  dispatch({ type: 'SET_GENRE', genre: value })
  setTimeout(onNext, 400)
}
```

**"Auto" handling:** Default via `state.genre ?? 'auto'`; dispatch as `null` for Auto; buildPayload converts `null`/`'auto'` to `undefined` so the server default applies.

**Custom input:** Yes — a free-text field gated on `showCustomInput` state with animated expand/collapse. The prompt says Niveau does NOT need a custom input — so that whole sub-tree can be omitted from the NiveauStep copy.

### 5.3 Step ordering and progress chips

**Step labels** at [wizardData.ts:150-157](orchestrator/frontend/src/components/generate/wizardData.ts#L150-L157):

```ts
export const STEP_LABELS: Record<number, string> = {
  1: 'Language',
  2: 'Words',
  3: 'Vibe',
  4: 'Art Style',
  5: 'Music',
  6: 'Confirm',
}
```

**Rendering dispatch** — `renderStep()` in the wizard host component switches on `state.step` (1-6) and returns the corresponding step component. Inserting Niveau between Art Style (4) and Music (5) means:

- Expand the `step` type from `1 | 2 | 3 | 4 | 5 | 6` to `1 | 2 | 3 | 4 | 5 | 6 | 7`.
- Reshuffle `STEP_LABELS`: 5 = Niveau, 6 = Music, 7 = Confirm.
- Update every `renderStep` switch, `buildPills` conditional, and any `state.step > N` comparison.

**Progress-chip builder** at [components/generate/WizardProgress.tsx:buildPills()](orchestrator/frontend/src/components/generate/WizardProgress.tsx). Every existing pill uses `state.step > N` to decide whether to show the pill for step N's selection. The genre pill currently uses `state.step > 5`. After Niveau insertion: add a niveau pill guarded by `state.step > 5`, and shift the genre pill to `state.step > 6`.

**Localization** — [lib/translations.ts:116-121](orchestrator/frontend/src/lib/translations.ts#L116-L121) (EN), with DE/FR mirrors around L806-810:

```ts
'generate.stepLanguage': 'Language',
'generate.stepWords': 'Words',
'generate.stepVibe': 'Vibe',
'generate.stepArtStyle': 'Art Style',
'generate.stepMusic': 'Music',
'generate.stepReview': 'Review',
```

**⚠️ Translation bug spotted** (not in scope to fix): [translations.ts:806-810](orchestrator/frontend/src/lib/translations.ts#L806-L810) — the "German" translations are actually French strings (`'Langue'`, `'Mots'`, `'Ambiance'`, etc.). Worth flagging to Sir Robert but ignoring for this investigation.

New keys needed: `generate.stepNiveau`, plus one label per level (`generate.niveauStandard`, `.niveauPhrase`, `.niveauStory`, `.niveauSong`) if the labels aren't hardcoded in the `NIVEAUS` constant.

### 5.4 Both skins

**Wizard architecture is DUPLICATED across skins**, not shared:

- `GeneratePG.tsx` uses the centralized `useWizardState` hook and shared step components (WordsStep etc.). It has its own `STEP_LABELS` array at [GeneratePG.tsx:304-307](orchestrator/frontend/src/pages/GeneratePG.tsx#L304-L307).
- `GenerateGO.tsx` uses plain `useState` per field (language, words, vibe, artStyle, genre, customGenre, etc.) and a local `GO_GENRES` array at [GenerateGO.tsx:16-25](orchestrator/frontend/src/pages/GenerateGO.tsx#L16-L25) that may not include all `GENRES` options.

**Implication:** The Niveau step must be added to BOTH `GenerateGO.tsx` (the live Glassy entry) AND either `Generate.tsx` or `GeneratePG.tsx` (Classic — need Sir Robert's confirmation which is live). The shared `useWizardState.ts` / `wizardData.ts` / `WizardProgress.tsx` updates only help `GeneratePG`. For `GenerateGO` the `niveau` must be wired through its own local `useState` and step enum.

---

## Section 6 — Suno Lyric Volume

### 6.1 The Suno API path

Suno payload build at [orchestrator/src/suno.py:132-154](orchestrator/src/suno.py#L132-L154):

```python
def build_suno_payload(concept_data: dict) -> dict:
    # ...
    lyrics = concept_data["lyrics"] or concept_data["word"]
    return {
        "prompt": lyrics,
        "customMode": True,
        "instrumental": False,
        "model": "V5_5",
        "style": style[:1000],     # explicit 1000-char cap
        "title": title[:80],       # explicit 80-char cap
        # ...
    }
```

The lyrics go into the **`prompt`** field of the kie.ai Suno API. There is **no truncation** of `prompt` in orchestrator code — it is sent verbatim. Only `style` (1000) and `title` (80) have explicit caps. If kie.ai has a documented 5000-char limit, it is enforced server-side and will silently truncate or 4xx.

`concept_data["lyrics"]` here is the dict read at [suno.py:102](orchestrator/src/suno.py#L102): `lyrics = concept.get("suno_lyrics") or concept.get("lyrics", "")` — i.e., it is the `suno_lyrics` field (since the concept engine always populates it). So the Niveau-driven `suno_lyrics` output reaches Suno as-is.

**AGENT: Could not verify a documented kie.ai lyric limit from code alone** — no comment or constant in `suno.py` names a specific character count. Memory suggests 5000 chars. Level 4 output at 30-60 lines × ~30 chars/line ≈ 1000-2000 chars, well under any reasonable limit.

### 6.2 Concept Engine length controls

**LLM `max_tokens` settings:**

- Combined lyrics + caption call (used by `contextual` and `creative`): **512 tokens** at [lyrics.py:202](orchestrator/cloud_engines/concept_engine/lyrics.py#L202).
- Caption-only call (template modes): **256 tokens** at [caption.py:81](orchestrator/cloud_engines/concept_engine/caption.py#L81).
- No post-processing truncation — LLM output is parsed as-is.

**For 30-60 lines of Level 4 output:** 512 tokens ≈ ~400 words; 30-60 lines of lyric-style prose ≈ 200-500 words, **borderline**. Recommend raising to 1024+ tokens for the Level 4 path to avoid mid-song truncation. This is independent of Suno's limit; it's the upstream LLM generating the lyrics.

### 6.3 Clip duration

- **Default** `clip_duration: int = Field(default=30)` at [orchestrator/cloud_engines/image_engine/models.py:116](orchestrator/cloud_engines/image_engine/models.py#L116).
- **Valid values** `CLIP_DURATIONS = (5, 10, 15, 20, 30)` at [image_engine/models.py:72](orchestrator/cloud_engines/image_engine/models.py#L72).
- **Validator** at [image_engine/models.py:167-172](orchestrator/cloud_engines/image_engine/models.py#L167-L172) rejects anything else.
- **Short-mode override to 15** at [pipeline.py:918-919](orchestrator/src/pipeline.py#L918-L919):
  ```python
  if settings.get("short_mode", False):
      settings["clip_duration"] = 15
  ```
- **Assembly trim** at [orchestrator/cloud_engines/assembly_engine/engine.py:302-390](orchestrator/cloud_engines/assembly_engine/engine.py#L302-L390). Source duration is probed by ffprobe; `trim_end` is clamped to the actual source duration (line 370) if it overshoots. Safe regardless of how long the Suno audio is — no upper-bound assumption.

**The 15-second window holds**: long Level 4 Suno audio will be clipped to the user's `clip_duration` cleanly, preserving the first N seconds (which is where the `[Intro]` opener with the target word will land).

---

## Section 7 — Lyrics Display Candidates (identify only)

### 7.1 Music page

[orchestrator/frontend/src/pages/Music.tsx:91-94](orchestrator/frontend/src/pages/Music.tsx#L91-L94) — current SELECT:

```js
supabase.from('words').select(`
  id, deck_id, word, translation,
  thumbnail_url, suno_storage_url, suno_audio_url, metadata, created_at,
  decks(id, name)
`)
```

**No `lyrics` or `suno_lyrics` column is fetched.** `metadata` JSON is fetched and consumed for `music_caption` ([Music.tsx:31-41](orchestrator/frontend/src/pages/Music.tsx#L31-L41)). To display lyrics here, the page would need to either read from `metadata` (if lyrics were stored there) or SELECT a dedicated column (which doesn't exist — see 7.3).

### 7.2 Deck view info panel

[orchestrator/frontend/src/pages/DeckViewPG.tsx:848-921](orchestrator/frontend/src/pages/DeckViewPG.tsx#L848-L921) — the expandable info panel pattern. Collapsed by default (chevron toggle), showing rows for `etymology`, `pos`/`article`, `music_caption` conditionally. A lyrics row would fit naturally around line 915, using the same `justify-between` layout.

`DeckView.tsx` (Glassy equivalent) has the same panel in a different style — check its SELECT / rendering block; Agent D didn't paste it.

### 7.3 Data availability

**No `lyrics` or `suno_lyrics` column exists on the `words` table.** Migrations at `orchestrator/frontend/supabase/migrations/` include `20260331000000_suno_columns.sql` which adds `suno_audio_url` and `suno_task_id` only.

Backend `ConceptArtifact` at [orchestrator/frontend/src/api.ts:34-43](orchestrator/frontend/src/api.ts#L34-L43):

```ts
export interface ConceptArtifact {
  word: string
  translation: string
  language: string
  language_code: string
  lyrics: string
  music_caption: string
  visual_hint: string | null
  generation_info?: Record<string, unknown>
}
```

Note the TS interface doesn't include `suno_lyrics` — drift from the backend `ConceptArtifact` at [orchestrator/cloud_engines/concept_engine/models.py:173-182](orchestrator/cloud_engines/concept_engine/models.py#L173-L182) which does include it. Another minor silent-drop spot if the frontend ever tries to read `suno_lyrics`.

**Reach:** lyrics are written to a JSON artifact file on disk in the workspace (e.g. `{workspace}/concept/{word}.json`), then read by later pipeline stages. They are **not persisted to Supabase per-word**. Displaying them in the cloud frontend requires either (a) a schema change adding `lyrics TEXT` and/or `suno_lyrics TEXT` to `words`, with backend update on completion, or (b) adding lyrics into the existing `metadata` JSONB column. Schema change recommendation is out of scope for this investigation.

---

## Risks & Surprises

1. **Two concept-engine directories, drifted.** Same-named files in [engines/concept-engine/src/](engines/concept-engine/src/) and [orchestrator/cloud_engines/concept_engine/](orchestrator/cloud_engines/concept_engine/) are NOT byte-identical. Confirmed drift: `models.py` differs (file lengths 255 vs 245 lines). `engine.py` differs in at least one call signature (the prod tree passes `identity=identity` to `generate_caption`, the dev tree does not). This is a real maintenance risk — every Niveau-related change must land in BOTH trees. **A shared source-of-truth or CI parity check would be a reasonable follow-up.**

2. **Gateway drift exists today.** `RunSettings` at [engines/concept-engine/ui/app.py:99-116](engines/concept-engine/ui/app.py#L99-L116) already has different default values than `ConceptSettings` (e.g. `lyric_mode: str = "standard"` vs the orchestrator sending `"reliable"`). This confirms the silent-drift pattern is alive. Any `level` field must land in 3 Pydantic models (prod ConceptSettings + dev ConceptSettings + RunSettings).

3. **`dramatic` is referenced only by the dev UI** — repurposing its slot for Level 4 is safe for production but will rename a visible option in the concept-engine Gradio UI. The unit tests covering the current dramatic template output will break. Decide up-front whether to delete the current `generate_dramatic()` template, rename it (e.g. to `generate_dramatic_legacy()`), or keep it under a different enum value.

4. **Template `suno_lyrics` is ALWAYS produced regardless of `lyric_mode`.** Today, `suno_lyrics` is a fixed template (`generate_suno_lyrics()` for single words, `generate_phrase_suno_lyrics()` for phrases) — the Niveau feature needs to replace this single dispatch with a 4-way branch based on `level`. The new Level 4 path will need its own generator function that produces the full-song output (either LLM-based with music_caption context, or a much longer templated structure).

5. **`external_music_caption` is NOT passed into the lyrics LLM prompt today** (see 2.4). For Level 4 to adapt lyric structure to the music genre, this changes. It is a new wire-through, not a prompt edit.

6. **Translation file has a localization bug** ([translations.ts:806-810](orchestrator/frontend/src/lib/translations.ts#L806-L810)): the "German" section contains French strings. Out of scope to fix, but worth flagging.

7. **Third wizard page exists and isn't routed.** [pages/GeneratePG.tsx](orchestrator/frontend/src/pages/GeneratePG.tsx) is not referenced in [App.tsx](orchestrator/frontend/src/App.tsx)'s router. Either it's dead code (another cleanup target) or it's mounted somewhere Agent D didn't find. Confirm with Sir Robert before deciding whether to update it.

8. **`ConceptArtifact` TS type is missing `suno_lyrics`** ([api.ts:34-43](orchestrator/frontend/src/api.ts#L34-L43)). Not blocking, but another drift.

9. **No kie.ai lyric-length limit is enforced in code.** If the real limit is 5000 chars and a Level 4 generation exceeds it, the failure will be opaque (silent truncation or a generic API error). Recommend adding a check + log in `suno.py` once the Level 4 behavior is live, to catch surprises early. Out of scope to implement now.

---

## Open Questions for Sir Robert

1. **Level 4 lyrics: LLM or long template?** The prompt says "full song-length lyrics, genre-aware, no length cap beyond LLM token limits." That reads as LLM-based. Confirm — a long template is cheaper and more deterministic but cannot be genre-aware. LLM is richer but adds latency and cost per word.

2. **Pass `music_caption` into the Level 4 lyrics prompt?** Today no mode does this. For Level 4 to adapt verse/chorus vs orchestral sparsity vs rap looseness to the chosen genre, the prompt must see the music_caption. Approve the wiring.

3. **What to do with the current `dramatic` template?** (a) Delete it and its tests; (b) rename to `generate_dramatic_legacy()` and hide from the dev UI; (c) keep it under a new mode string like `"legacy_dramatic"`. The cheapest answer is (a), but deleting unit-tested code is a small habit change.

4. **Default `level` value for existing decks.** Recommend `1` (Standard, semantically matches today's `reliable` default). Confirm.

5. **Which Classic wizard is live?** [pages/Generate.tsx](orchestrator/frontend/src/pages/Generate.tsx) (routed), [pages/GeneratePG.tsx](orchestrator/frontend/src/pages/GeneratePG.tsx) (not routed but non-trivial), and [pages/GenerateGO.tsx](orchestrator/frontend/src/pages/GenerateGO.tsx) (routed under Glassy skin) all exist. Implementation needs to know whether GeneratePG requires a Niveau step too.

6. **Concept Engine `max_tokens` for Level 4.** Today 512 for combined lyrics+caption. Raise to 1024 for Level 4 specifically, or globally? Recommend per-level, since Levels 1-3 fit comfortably under 512.

7. **Lyrics display surface for later (out of scope now, just tracking).** Music.tsx row, DeckView info panel, or both? And is it acceptable to add a `lyrics TEXT` column to the `words` table when that feature lands, or should it go into the existing `metadata` JSONB?

---

## Discipline Notes

- No files were modified during this investigation. Repo state is unchanged.
- Every factual claim above cites a file path + line number, or states "Could not verify" with a reason.
- No implementation code was written.
- No git operations were performed.
