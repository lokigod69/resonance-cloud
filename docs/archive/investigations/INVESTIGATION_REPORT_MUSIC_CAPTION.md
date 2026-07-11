# Music Caption Pipeline Investigation

**Scope:** Trace the `music_caption` string from LLM generation through every transformation to (a) the kie.ai Suno HTTP request and (b) the user-facing WordCard "Music" row. Read-only investigation. No code changes.

**TL;DR:**
- Captions are generated in **two places**: the Image Engine's storyboard LLM call ([prompts.py:1278](orchestrator/cloud_engines/image_engine/prompts.py#L1278)) and the Concept Engine ([caption.py:22](orchestrator/cloud_engines/concept_engine/caption.py#L22)). When storyboard has run first, its caption wins and the Concept Engine does not generate one.
- BPM is **explicitly primed** in both prompts via verbatim example captions and rule text. It is **never stripped** anywhere in the pipeline — it lands in the Suno `style` field and in the WordCard.
- The frontend card is `music_caption.split(',')[0]` ([WordInfoPanel.tsx:110](orchestrator/frontend/src/components/WordInfoPanel.tsx#L110)). Removing BPM at source automatically fixes the card; no separate derivation to touch.
- Lyric-mode does not influence the caption prompt content — only orchestration (separate vs combined LLM call). The caption is identical regardless of mode.

---

## 1. Generator

There are **two** LLM call sites that can produce `music_caption`. Which one wins depends on whether the Image Engine (storyboard) ran before the Concept Engine.

### 1a. Image Engine (storyboard) — dominant in current pipeline

**Call site:** Storyboard generation in the Image Engine. Caption is one field of the storyboard JSON output.

**Prompt section, file:** [orchestrator/cloud_engines/image_engine/prompts.py:1278-1292](orchestrator/cloud_engines/image_engine/prompts.py#L1278-L1292)

Verbatim:

```
MUSIC CAPTION (REQUIRED):
Generate a single-line music caption that describes the ideal soundtrack for these scenes. This caption will be used by a music generation AI to create a short song.

The caption must:
- Lead with the genre, mood, and musical style
- Include "{vocal} vocal" and "singing in {language}" early in the caption (2nd or 3rd position)
- Keep instrumentation focused — name 1-2 specific instruments, not a full production
- End with "clear diction" for vocal clarity
- Match the emotional tone and atmosphere of the scenes you designed
- Be 15-30 words, single line, no line breaks
{art_hint}

Examples of good captions:
- "melancholic melodic techno, {vocal} vocal singing in {language}, warm analog pad, 85 BPM, clear diction"
- "playful acoustic pop, {vocal} vocal singing in {language}, gentle fingerpicked guitar, 95 BPM, clear diction"
```

**BPM priming:** YES — both example captions include literal BPM values (`85 BPM`, `95 BPM`). The instruction text does not require BPM, but the examples make it the de facto pattern.

This is the prompt visible in the user's screenshot ("MUSIC CAPTION (REQUIRED)").

### 1b. Concept Engine — fallback when no storyboard caption is present

**Entry function:** [caption.py:22 `generate_caption()`](orchestrator/cloud_engines/concept_engine/caption.py#L22)
**LLM call:** [caption.py:59](orchestrator/cloud_engines/concept_engine/caption.py#L59)
**Prompt selector:** [caption.py:179 `_select_caption_prompt()`](orchestrator/cloud_engines/concept_engine/caption.py#L179) — branches on `settings.caption_style` ("production" vs "vocal_forward") and `settings.genre` ("auto" vs manual). Four prompt variants total.

**Production-style auto-genre prompt (most BPM-heavy), [caption.py:267-302](orchestrator/cloud_engines/concept_engine/caption.py#L267-L302):**

```
You are a music producer creating a {duration}-second track that makes a single foreign word unforgettable through melody and arrangement.

Word: "{word}" ({translation})
Language: {language}
{art_style_context}

Create a music caption that describes a PRODUCED SONG — not spoken word with light accompaniment.
The word will be sung within a real musical arrangement with melody, rhythm, and emotional arc.

Generate a single-line music caption in this format:
[genre at BPM], [2-3 instruments], melodic {language} {vocal_gender} vocal, [2-3 emotional descriptors], clear diction

Example outputs:
- upbeat indie pop at 120 BPM, bright acoustic guitar, punchy drums, melodic Italian female vocal, playful, sunny, clear diction
- cinematic orchestral waltz at 90 BPM, sweeping strings, gentle harp, soaring German male vocal, bittersweet, nostalgic, clear diction
- groovy funk at 105 BPM, slap bass, wah-wah guitar, smooth Korean female vocal, cheeky, confident, clear diction

Rules:
- Lead with genre and BPM — this sets the song's energy
- BPM range: 80-140 (match the word's emotional energy)
- 2-3 instruments maximum (this is a {duration}-second track — keep it focused)
- Vocal style should be melodic singing, not "speech-sung" or "spoken"
- End with "clear diction" to ensure vocal clarity
- Under 25 words total
- Do NOT include key signature or time signature
- Output ONLY the caption line. No explanation.
```

**BPM priming:** YES, **strongly**. The format spec (`[genre at BPM]`) makes BPM the lead element, all three examples include BPM, and Rule 1 is literally "Lead with genre and BPM". This is the most aggressive BPM priming in the codebase.

The vocal-forward auto-genre prompt ([caption.py:204-264](orchestrator/cloud_engines/concept_engine/caption.py#L204-L264)) is softer: `Optionally include BPM if the genre implies a specific tempo (e.g., "120 BPM" for techno)` ([line 261](orchestrator/cloud_engines/concept_engine/caption.py#L261)) — still primes BPM via example.

Manual-genre production prompt ([caption.py:305-333](orchestrator/cloud_engines/concept_engine/caption.py#L305-L333)) hardcodes the format `{genre} at [BPM], …` and rule `Choose a BPM appropriate for {genre} (80-140 range)`.

### Which generator runs in practice?

[orchestrator/src/pipeline.py:209-219](orchestrator/src/pipeline.py#L209-L219) — pipeline reads `storyboard.json` from disk before calling the Concept Engine and passes its caption as `external_music_caption`. In [lyrics.py:138-157](orchestrator/cloud_engines/concept_engine/lyrics.py#L138-L157) and [lyrics.py:172-179](orchestrator/cloud_engines/concept_engine/lyrics.py#L172-L179), if `external_music_caption` is set, the Concept Engine wraps it in a `CaptionResult` with `source="storyboard"` and **never calls its own LLM**. So in any pipeline where Image Engine runs before Concept Engine (the standard ordering), **the Image Engine prompt is the source of truth for the caption**.

---

## 2. Transformations to Suno style

The `music_caption` is read from the concept artifact and transformed in **one place** before becoming the Suno `style` field.

**File:** [orchestrator/src/suno.py:132-154](orchestrator/src/suno.py#L132-L154)

```python
def build_suno_payload(concept_data: dict) -> dict:
    """Map concept data to kie.ai Suno API request payload."""
    gender = concept_data["vocal_gender"]
    suno_gender = "m" if gender.lower().startswith("m") else "f"

    style = concept_data["music_caption"] or "Pop"
    # Strip "clear diction" — helpful for ACE-Step but may trigger kie.ai copyright filter
    style = style.replace(", clear diction", "").replace("clear diction, ", "").replace("clear diction", "")
    # Remap language names Suno may not recognize
    style = re.sub(r"(?i)\b(bisaya|cebuano)\b", "Filipino", style)
    title = concept_data["word"]
    lyrics = concept_data["lyrics"] or concept_data["word"]

    return {
        "prompt": lyrics,
        "customMode": True,
        "instrumental": False,
        "model": "V5_5",
        "style": style[:1000],
        "title": title[:80],
        "vocalGender": suno_gender,
        "callBackUrl": "https://resonanz.pro/api/suno/callback",
    }
```

**Ordered transformations applied to `music_caption` between LLM output and the kie.ai POST body:**

| # | Transformation | File:Line | Notes |
|---|----------------|-----------|-------|
| 1 | Read `music_caption` from concept artifact, fallback to literal `"Pop"` | [suno.py:137](orchestrator/src/suno.py#L137) | No-op if non-empty |
| 2 | Strip `"clear diction"` (3 forms) | [suno.py:139](orchestrator/src/suno.py#L139) | Reason in comment: kie.ai copyright filter |
| 3 | Regex: `bisaya`/`cebuano` → `Filipino` (case-insensitive, word-bounded) | [suno.py:141](orchestrator/src/suno.py#L141) | Suno doesn't recognize the names |
| 4 | Truncate to 1000 chars | [suno.py:150](orchestrator/src/suno.py#L150) | `style[:1000]` |

**Final field name in kie.ai HTTP body:** `style` ([suno.py:150](orchestrator/src/suno.py#L150)).

**BPM is not touched anywhere.** It is generated, persisted to artifact, read back here, and emitted to Suno verbatim.

There is a separate vocal-gender patch applied earlier in [lyrics.py:60-66 `_patch_vocal_gender()`](orchestrator/cloud_engines/concept_engine/lyrics.py#L60-L66) when a storyboard caption is consumed — it rewrites `"male vocal"` ↔ `"female vocal"` to match current settings. Not relevant to BPM.

---

## 3. User-facing card derivation

**Component:** [orchestrator/frontend/src/components/WordInfoPanel.tsx:106-113](orchestrator/frontend/src/components/WordInfoPanel.tsx#L106-L113)

```tsx
{word.metadata?.music_caption && (
  <div className="flex justify-between gap-4">
    <span className="text-gray-500 shrink-0">Music</span>
    <span className="text-gray-300 text-right">
      {word.metadata.music_caption.split(',')[0]}
    </span>
  </div>
)}
```

**Field read:** `word.metadata.music_caption` (the raw caption from the concept artifact, served via API).

**Derivation:** Split on `,`, take element `[0]`. So a caption `"electronica at 120 BPM, bright synthesizers, German female vocal, energetic, clear diction"` renders as `"electronica at 120 BPM"`.

**No separate `genre` field, no client-side BPM extraction, no second derivation.**

**Implication:** Removing BPM from the source caption automatically fixes the WordCard. The card has no independent BPM rendering to maintain.

---

## 4. Lyric-mode awareness

**The caption prompt does not branch on lyric mode.** What changes by mode is the *orchestration* of when/how the caption LLM call is made, not the prompt text.

Routing in [orchestrator/cloud_engines/concept_engine/lyrics.py:69-114 `generate_lyrics()`](orchestrator/cloud_engines/concept_engine/lyrics.py#L69-L114):

```python
if settings.lyric_mode in TEMPLATE_MODES:
    return _generate_template_path(...)
return _generate_llm_path(...)
```

- **Template path** ([lyrics.py:121-181](orchestrator/cloud_engines/concept_engine/lyrics.py#L121-L181)): caption generated in a separate LLM call via `generate_caption()`. Lyrics come from templates (no LLM).
- **LLM path** ([lyrics.py:188+](orchestrator/cloud_engines/concept_engine/lyrics.py#L188)): caption is built into a combined prompt with the lyrics, single LLM call. Caption section comes from [caption.py:72 `build_caption_prompt_for_combined()`](orchestrator/cloud_engines/concept_engine/caption.py#L72), which calls the **same** `_select_caption_prompt()` as the standalone path.

**Conclusion:** Caption prompt text is identical for `template` / `contextual` / `creative` / `dramatic`. Branching is purely on `caption_style` (`production` vs `vocal_forward`) and `genre` (`auto` vs manual) at [caption.py:179-190](orchestrator/cloud_engines/concept_engine/lyrics.py#L179-L190).

---

## 5. Regeneration points

**None.** The caption is generated once per pipeline run and never rewritten in the artifact.

Verified flow:
- Storyboard caption written to `storyboard.json` by Image Engine.
- Pipeline reads it ([pipeline.py:209-219](orchestrator/src/pipeline.py#L209-L219)) and either passes it through as `external_music_caption` or lets the Concept Engine generate one.
- Concept Engine writes the final caption to its artifact and never modifies it.
- Song Engine consumes the artifact for Suno submission via `build_suno_payload()` (read-only).

The two downstream "modifications" — `_patch_vocal_gender()` ([lyrics.py:60-66](orchestrator/cloud_engines/concept_engine/lyrics.py#L60-L66)) and the `clear diction` strip ([suno.py:139](orchestrator/src/suno.py#L139)) — are **read-time transformations**, not artifact rewrites. They do not persist back.

No post-Concept stage rewrites or augments the caption based on final lyrics.

---

## 6. Length budget

**Both explicit and emergent. Explicit caps exist at the prompt level and at a hard post-processing step.**

| Layer | Limit | Where |
|-------|-------|-------|
| Image Engine prompt (storyboard) | "Be 15-30 words, single line" | [prompts.py:1287](orchestrator/cloud_engines/image_engine/prompts.py#L1287) |
| Concept vocal-forward auto/manual | "Under 20 words total" | [caption.py:227, :258](orchestrator/cloud_engines/concept_engine/caption.py#L227) |
| Concept production auto/manual | "Under 25 words total" | [caption.py:299, :331](orchestrator/cloud_engines/concept_engine/caption.py#L299) |
| Concept post-processing hard cap | `_enforce_length(max_words=30, truncate_to=25)` | [caption.py:433-438](orchestrator/cloud_engines/concept_engine/caption.py#L433-L438) |
| Suno payload safety | `style[:1000]` chars | [suno.py:150](orchestrator/src/suno.py#L150) |

Soft prompt guidance + a hard truncation in `_enforce_length`. The observed ~15-word output is consistent with prompt examples; the 30-word cap is a safety net.

Note: `_enforce_length` only runs in the Concept Engine post-processing path. Storyboard-sourced captions skip it (they go straight from `storyboard.json` into a `CaptionResult` in [lyrics.py:138-142](orchestrator/cloud_engines/concept_engine/lyrics.py#L138-L142) with no length check), but the storyboard prompt has its own "15-30 words" instruction.

---

## 7. Storyboard influence

**Yes — storyboard is currently the dominant caption source in any pipeline where Image Engine runs first.**

Flow:
1. Image Engine emits `storyboard.json` with `music_caption` field via its own LLM call ([prompts.py:1278](orchestrator/cloud_engines/image_engine/prompts.py#L1278)).
2. Pipeline reads it ([pipeline.py:209-219](orchestrator/src/pipeline.py#L209-L219)):
   ```python
   external_music_caption = None
   if not override_concept:
       storyboard_file = word_dir / "images" / images_version / "storyboard.json"
       if storyboard_file.exists():
           with open(storyboard_file, 'r', encoding='utf-8') as f:
               storyboard = json.load(f)
           external_music_caption = storyboard.get("music_caption")
   ```
3. Pipeline passes `external_music_caption` into `generate_lyrics()`.
4. Concept Engine wraps it as `CaptionResult(source="storyboard", …)` and **skips its own caption LLM call** ([lyrics.py:138-142](orchestrator/cloud_engines/concept_engine/lyrics.py#L138-L142), [lyrics.py:150-157](orchestrator/cloud_engines/concept_engine/lyrics.py#L150-L157), [lyrics.py:172-177](orchestrator/cloud_engines/concept_engine/lyrics.py#L172-L177)).

**Reverse direction (does any storyboard scene content feed *into* the caption prompt?):** Yes — the Image Engine builds the caption from the same scene context it just generated, so scene mood/atmosphere are already implicit in the storyboard LLM's working memory. The Concept Engine prompt does **not** receive scene content — it only sees `word`, `translation`, `language`, `vocal_gender`, `genre`, and optional `art_style_hint` ([caption.py:204-263](orchestrator/cloud_engines/concept_engine/caption.py#L204), [caption.py:267-302](orchestrator/cloud_engines/concept_engine/caption.py#L267)). For enrichment, this is a candidate seam: feeding scene digests into the Concept caption prompt would only matter in storyboard-skipped flows, since the Image Engine already has scenes in-context.

---

## 8. Candidate fix points

### BPM removal — surgical, ranked by impact

| Rank | File:Line | Change shape | Coverage |
|------|-----------|--------------|----------|
| **1** | [orchestrator/cloud_engines/image_engine/prompts.py:1278-1292](orchestrator/cloud_engines/image_engine/prompts.py#L1278-L1292) | Remove BPM from the two example captions; optionally add explicit `Do NOT include BPM` rule | **Highest impact.** This is the dominant caption source in production (every pipeline with storyboard). One-file fix covers most user-visible captions. |
| **2** | [orchestrator/cloud_engines/concept_engine/caption.py:267-333](orchestrator/cloud_engines/concept_engine/caption.py#L267-L333) (production prompts) and [caption.py:204-264](orchestrator/cloud_engines/concept_engine/caption.py#L204-L264) (vocal-forward prompts) | Remove `[genre at BPM]` from format string, drop BPM examples, drop "Lead with genre and BPM" rule, add explicit "no BPM" rule | Covers Concept-Engine fallback path (storyboard-skipped or override flows). Four prompt variants — all need BPM scrubbed for consistency. |
| **3** | [orchestrator/src/suno.py:139](orchestrator/src/suno.py#L139) | Add a defensive regex strip alongside `clear diction`: `re.sub(r',?\s*\d{1,3}\s*BPM\s*,?', '', style, flags=re.IGNORECASE)` | Belt-and-suspenders. Catches BPM in any pre-existing artifacts and prevents regression if a future prompt edit reintroduces BPM. **Also fixes the WordCard immediately** if you want to ship a card-only fix without retroactively reprocessing artifacts — but note: card reads `music_caption` directly from the artifact, not the Suno-bound `style`, so suno.py alone won't fix the card. |
| **4** | (no-op) Frontend [WordInfoPanel.tsx:110](orchestrator/frontend/src/components/WordInfoPanel.tsx#L110) | None needed | Card derives entirely from source caption. Fixes 1+2 propagate automatically. |

**Recommended combination:** Fix #1 + #2 to remove the priming, then add #3 as a defensive net for both pre-existing artifacts and future drift. The card needs no touch.

**Caveat for already-stored artifacts:** Old `music_caption` values in existing artifacts will still contain BPM. Either accept stale captions on already-processed words, add #3 to strip BPM at read-time everywhere the caption is consumed (Suno **and** the API endpoint that serves `word.metadata.music_caption` to the frontend), or backfill the artifacts. Decide based on how much old content is in the wild.

### Enrichment for higher-level lyric modes — candidate seams

| Seam | Where | Why it's interesting |
|------|-------|----------------------|
| Pass scene digests into Concept caption prompt | [caption.py:179-190](orchestrator/cloud_engines/concept_engine/caption.py#L179-L190) prompt builders accept richer context | Currently Concept prompts only see `word`, `translation`, `language`, `genre`, `vocal_gender`, `art_style`. Adding 1-2 scene mood lines would let the fallback caption be storyboard-aware in flows where storyboard ran but Concept regenerates. Low value if storyboard always dominates — see seam below. |
| Pass `music_caption` into creative/dramatic lyric prompts | [lyrics.py LLM-path prompts](orchestrator/cloud_engines/concept_engine/lyrics.py#L188) | Lyrics are generated alongside the caption in LLM modes but the lyric prompt does not currently reference the resolved music style, so lyrics can drift from the song's energy. Injecting "lyrics will be set to a {caption}" explicitly aligns them. |
| Make Image Engine caption consume scenes more deeply | [prompts.py:1278-1292](orchestrator/cloud_engines/image_engine/prompts.py#L1278-L1292) | Already implicit (LLM has scenes in-context), but the prompt could explicitly require the caption to reflect a specific scene's mood arc, not just genre. Higher-leverage than scene-feeding the Concept caption since this is the dominant source. |
| Mode-aware caption prompts | [caption.py:179 `_select_caption_prompt`](orchestrator/cloud_engines/concept_engine/caption.py#L179) | Currently no `lyric_mode` branch. For `dramatic` mode, you might want a richer, narrative-driven caption ("cinematic build, sparse → full"); for `template`, the current minimal caption is fine. Adding a third axis (mode) to the prompt selector is a real change but cleanly localized. |

---

## Appendix: file/line index

| Concern | File | Line |
|---------|------|------|
| Storyboard caption prompt (dominant source) | orchestrator/cloud_engines/image_engine/prompts.py | 1278-1292 |
| Concept Engine caption entry | orchestrator/cloud_engines/concept_engine/caption.py | 22 |
| Concept LLM call | orchestrator/cloud_engines/concept_engine/caption.py | 59 |
| Prompt selector (caption_style × genre) | orchestrator/cloud_engines/concept_engine/caption.py | 179 |
| Vocal-forward auto-genre prompt | orchestrator/cloud_engines/concept_engine/caption.py | 204-264 |
| Production auto-genre prompt | orchestrator/cloud_engines/concept_engine/caption.py | 267-302 |
| Production manual-genre prompt | orchestrator/cloud_engines/concept_engine/caption.py | 305-333 |
| Length enforcement (Concept only) | orchestrator/cloud_engines/concept_engine/caption.py | 433-438 |
| Combined prompt builder for LLM modes | orchestrator/cloud_engines/concept_engine/caption.py | 72 |
| Storyboard caption pull-through | orchestrator/src/pipeline.py | 209-219 |
| Lyric-mode router | orchestrator/cloud_engines/concept_engine/lyrics.py | 69-114 |
| External caption wrapping | orchestrator/cloud_engines/concept_engine/lyrics.py | 138-142, 150-157, 172-177 |
| Vocal-gender patch on storyboard caption | orchestrator/cloud_engines/concept_engine/lyrics.py | 60-66 |
| Suno payload builder (clear diction strip) | orchestrator/src/suno.py | 132-154 |
| `clear diction` strip line | orchestrator/src/suno.py | 139 |
| Suno `style` field emit | orchestrator/src/suno.py | 150 |
| Frontend Music row | orchestrator/frontend/src/components/WordInfoPanel.tsx | 106-113 |
| Card derivation: `split(',')[0]` | orchestrator/frontend/src/components/WordInfoPanel.tsx | 110 |
