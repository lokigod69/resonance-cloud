# Investigation — Storyboard Engine Contract

Read-only investigation. No files modified. Goal: capture the current storyboard LLM contract (system prompt, user prompt, output schema, parse code, scene→render call site) and identify the single branch point where a future per-image-model prompt variant would be injected.

**Important naming note.** The task mentioned image-model targets `flux_pro / zturbo / wan_fallback`. Those identifiers **do not yet exist** in this codebase. The current `IMAGE_MODELS` enum at [models.py:73](cloud_engines/image_engine/models.py#L73) is:

```python
IMAGE_MODELS = ("fast", "quality", "wan_fast", "wan_quality")
```

Where `fast`/`quality` route to Gemini image models and `wan_fast`/`wan_quality` route to Wan 2.7. When the new model targets land, they will plug into the same enum + resolver path described below.

---

## 1. Storyboard LLM Call Site

**File:** [cloud_engines/image_engine/storyboard.py](cloud_engines/image_engine/storyboard.py)

**Entry function:** `generate_storyboard()` at [storyboard.py:38](cloud_engines/image_engine/storyboard.py#L38) — called from the image-engine orchestrator at [engine.py:92](cloud_engines/image_engine/engine.py#L92).

**LLM invocation function:** `_call_openrouter()` at [storyboard.py:145-224](cloud_engines/image_engine/storyboard.py#L145).

Inside `generate_storyboard()`, the system prompt is assembled by `build_system_prompt()` ([prompts.py:17](cloud_engines/image_engine/prompts.py#L17)) and the user prompt by `build_user_prompt()` ([prompts.py:118](cloud_engines/image_engine/prompts.py#L118)). Both are passed to `_call_openrouter(system_prompt, user_prompt, model, api_key)`.

---

## 2. System Prompt — Assembly

The system prompt is **not one string** — it is `"\n\n".join([...])` of ~15 dynamically-selected blocks produced by `build_system_prompt()` at [prompts.py:17](cloud_engines/image_engine/prompts.py#L17). The final assembled form varies with:

- `word`, `translation`, `language` (content)
- `settings.creative_direction` — one of `editorial | cinematic | provocative | minimal | literal | movie | movie_remix | auto`
- `settings.frame_narrative` — `scale | action | environment | narrative | collection | single | auto`
- `settings.scene_count` / `image_count` (fixed vs auto)
- `settings.art_style` (one of ~150 canonical styles in `ART_STYLE_DESCRIPTIONS`)
- `settings.visual_reference` (etymology/mnemonic anchoring)
- `settings.word_in_image` (true/false)
- `settings.skip_rendering` (text-to-video variant picks a different schema + prompt block)
- `settings.clip_duration`

### Block order in `build_system_prompt()`

```
1.  Role definition (word / translation / language header)   [prompts.py ~156-165]
2.  Creative direction block (6 variants)                     [prompts.py ~426-512, plus _movie_direction_block 333-356, _movie_remix_direction_block 359-423]
3.  Frame-narrative / transformation mode block              [prompts.py _mode_block / _auto_picker_block / _single_frame_block (742-751)]
4.  Image-count instruction                                   [prompts.py 709-739]
5.  Art style block                                           [prompts.py _art_style_block, pulls from ART_STYLE_DESCRIPTIONS 767-1062]
6.  Style consistency block                                   [prompts.py _style_consistency_block]
7.  Word-in-image block                                       [prompts.py _word_in_image_block]
8.  Context block (visual hint / lyrics / caption)            [prompts.py _context_block]
9.  Visual reference block (etymology / mnemonic)             [prompts.py _visual_reference_block]
10. Music caption block                                       [prompts.py _music_caption_block]
11. Mnemonic text block                                       [prompts.py _mnemonic_text_block]
12. Generation instructions                                   [prompts.py _generation_instructions]
13. Transition-prompt OR text-to-video-prompt block           [prompts.py _transition_prompt_block / _text_to_video_prompt_block]
14. Duration allocation block                                 [prompts.py 1501-1534]
15. Output schema block (images) OR (text-to-video)           [prompts.py 1537-1663 / 1406-1498]
```

### Representative fragments (verbatim)

**Fragment 1 — Role (always present)** at [prompts.py:156-165](cloud_engines/image_engine/prompts.py#L156):

```
You are the visual creative director for a vocabulary learning system that produces music video-style clips for language learners. Your job is to create a visual storyboard for a single vocabulary word.

WORD: {word}
TRANSLATION: {translation}
LANGUAGE: {language}
```

**Fragment 2a — Creative direction `editorial`** at [prompts.py:432-442](cloud_engines/image_engine/prompts.py#L432):

```
CREATIVE DIRECTION: EDITORIAL
Your visual treatment should be clean, intentional, and curated. Think magazine-quality imagery.

Guidelines:
- Choose the most natural and effective visual representation for the word
- For concrete nouns: create a beautiful, compelling depiction in an interesting setting
- For abstract concepts: design a clear metaphorical scene that communicates the meaning
- Integrate the word elegantly into the composition
- Prioritize clarity and aesthetic quality over shock value
- The image should feel intentional, like it belongs in a curated collection
```

(Five other variants — `cinematic`, `provocative`, `minimal`, `literal`, `movie`, `movie_remix` — exist in the same function family.)

**Fragment 3 — Single-frame block** at [prompts.py:742-751](cloud_engines/image_engine/prompts.py#L742):

```
SINGLE IMAGE:
You are generating exactly 1 scene. This is a single standalone image, not part of a series. Keep your visual_concept to 1-2 sentences describing what the image shows and why. Do not reference "frames", "scenes", "each image", or narrative progression. Focus all creative energy on making this one image as clear and impactful as possible.
```

**Fragment 4 — Image-count instruction, auto mode** at [prompts.py:715-731](cloud_engines/image_engine/prompts.py#L715):

```
Also choose the image count (the "scene_count" field). Consider:
- The clip duration is {clip_duration} seconds.
- For a {clip_duration}s clip, {recommended} images is the sweet spot.
- Choose the MINIMUM count needed to communicate the word effectively in your
  chosen mode. More frames is not better — each frame must earn its place.
- 2 scenes work well for words with strong motion or clear before/after contrast
  (running, fighting, transforming). PERSPECTIVE rarely needs more than 2.
- 3 scenes work well for abstract words, collections of meanings, or full
  narrative arcs. NARRATIVE benefits from 3 for setup + action + result.
  COLLECTION can use 2-3 depending on how many distinct meanings the word has.
```

**Fragment 4b — Image-count, fixed mode** at [prompts.py:732-738](cloud_engines/image_engine/prompts.py#L732):

```
You must design exactly {image_count} scene(s). Do not suggest a different count.
If this count feels limiting for your chosen mode, adapt your creative approach —
compress the concept into fewer frames rather than changing your mode choice.
If the count is 1, you are designing a single powerful image. Choose the mode that
produces the strongest single frame (PERSPECTIVE or COLLECTION work well with 1 frame;
NARRATIVE with 1 frame means capturing the most pivotal moment of the story).
```

**Final block — Output JSON schema** (standard image mode) at [prompts.py:1574-1663](cloud_engines/image_engine/prompts.py#L1574). See §5 for the full JSON example.

Because assembly is conditional, there is **no single verbatim "the system prompt" string** — what the LLM receives is a concatenation of whichever of those 15 blocks apply for the current settings snapshot. For any single real call, the exact final string can be reproduced by invoking `build_system_prompt(...)` with the same settings — it is a pure function.

---

## 3. User Prompt Template (verbatim)

**File:** [cloud_engines/image_engine/prompts.py:118-150](cloud_engines/image_engine/prompts.py#L118)

```python
def build_user_prompt(
    word: str,
    translation: str,
    language: str,
    scene_count: int,
    is_auto_count: bool = False,
) -> str:
    if is_auto_count and scene_count >= 2:
        count_instruction = (
            f"Create 2 or 3 scenes based on what best serves the word. "
            f"Use 2 scenes for words with strong motion, clear before/after, or simple concepts. "
            f"Use 3 scenes for abstract words, collections of meanings, or full narrative arcs."
        )
    else:
        count_instruction = f"Create exactly {scene_count} scene(s)."
    return (
        f'Generate a visual storyboard for the {language} word "{word}" '
        f'(meaning: "{translation}"). '
        f"{count_instruction} "
        f"Return ONLY valid JSON matching the schema described in your instructions."
    )
```

### Concrete example (auto count, German "Fenster"):

```
Generate a visual storyboard for the German word "Fenster" (meaning: "window"). Create 2 or 3 scenes based on what best serves the word. Use 2 scenes for words with strong motion, clear before/after, or simple concepts. Use 3 scenes for abstract words, collections of meanings, or full narrative arcs. Return ONLY valid JSON matching the schema described in your instructions.
```

---

## 4. Model, Provider, Parameters

**Provider:** OpenRouter (HTTP, via `httpx.Client`).

**Endpoint:** `https://openrouter.ai/api/v1/chat/completions` — [config.py:29](cloud_engines/image_engine/config.py#L29).

**Model ID:** configurable per-call via `settings.llm_model`. Defaults:
- Hardcoded default in `ImageSettings`: `"deepseek/deepseek-v3.2"` — [models.py:121](cloud_engines/image_engine/models.py#L121)
- Current top-level runtime default in [src/settings.py:60](src/settings.py#L60): `"x-ai/grok-4.1-fast"`

**Payload** — [storyboard.py:166-174](cloud_engines/image_engine/storyboard.py#L166):

```python
payload = {
    "model": model,
    "messages": [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_prompt},
    ],
    "max_tokens": config.LLM_MAX_TOKENS,
    "response_format": {"type": "json_object"},
}
```

Where `config.LLM_MAX_TOKENS = 8192` ([config.py:31](cloud_engines/image_engine/config.py#L31)).

**Temperature:** **CONFIRMED ABSENT.** A full grep of [storyboard.py](cloud_engines/image_engine/storyboard.py) for `temperature|top_p` returns zero matches. No temperature, top_p, top_k, frequency_penalty, or presence_penalty is sent. Model defaults are used. This matches the codebase policy.

**Other params in payload:** none beyond `model`, `messages`, `max_tokens`, `response_format`. Authentication is via `Authorization: Bearer {api_key}` header.

---

## 5. Output JSON Schema

### Top-level Pydantic model

[models.py:366-390](cloud_engines/image_engine/models.py#L366):

```python
class Storyboard(BaseModel):
    """Complete storyboard returned by the LLM (Section 4.1)."""

    word: str
    translation: str
    language: str
    creative_direction: str
    frame_narrative: str
    art_style: str
    scene_count: int = Field(ge=1, le=8)
    visual_concept: str
    shared_palette: list[str]
    shared_motif: str
    movie_source_strategy: Optional[str] = None
    movies_referenced: Optional[list[str]] = None
    suggested_transition_mode: Optional[str] = None
    transition_rationale: Optional[str] = None
    music_caption: Optional[str] = None
    mnemonic_text: Optional[str] = None
    scenes: list[Scene]
```

### Scene model

[models.py:350-364](cloud_engines/image_engine/models.py#L350):

```python
class Scene(BaseModel):
    scene_number: int = Field(ge=1, le=8)
    description: str
    image_prompt: ImagePromptData
    word_render: WordRender
    camera_motion: CameraMotion
    video_prompt: str
    transition_prompt: Optional[str] = None
    suggested_duration: Optional[int] = Field(default=None, ge=3, le=10)
    duration_rationale: Optional[str] = None
    movie_reference: Optional[MovieReference] = None
    remix_element: Optional[RemixElement] = None
```

### ImagePromptData (this is what reaches the image model)

[models.py:253-266](cloud_engines/image_engine/models.py#L253):

```python
class ImagePromptData(BaseModel):
    subject: str
    scene: str
    style: str
    lighting: str
    composition: str
    mood: str
    colors: list[str]
    details: str
    aspect_ratio: str = "16:9"
    text_element: Optional[TextElement] = None
```

### Supporting models

- `TextElement` — `text`, `rendering`, `placement` ([models.py:245](cloud_engines/image_engine/models.py#L245))
- `WordRender` — `enabled`, `text?`, `technique?`, `placement?`, `integration_note?` ([models.py:268](cloud_engines/image_engine/models.py#L268))
- `CameraMotion` — `type`, `direction`, `speed`, `description` with validators against `CAMERA_MOTION_TYPES` and `CAMERA_SPEEDS` ([models.py:323](cloud_engines/image_engine/models.py#L323))
- `MovieReference` — `title`, `year?`, `scene_description`, `actors[]`, `color_signature` ([models.py:278](cloud_engines/image_engine/models.py#L278))
- `RemixElement` — `alteration_type`, `original`, `replacement`, `word_connection` ([models.py:288](cloud_engines/image_engine/models.py#L288))

### Text-to-video variant

When `settings.skip_rendering=True`, the schema switches to `StoryboardTextToVideo` + `SceneTextToVideo` where `image_prompt` and `word_render` are optional and a richer `video_prompt` / `text_to_video_prompt` takes their place. See [models.py:392-433](cloud_engines/image_engine/models.py#L392).

### Literal schema-example shown to the LLM

From [prompts.py:1574-1663](cloud_engines/image_engine/prompts.py#L1574), the LLM receives this example JSON inside the system prompt:

```json
{
  "word": "<the vocabulary word>",
  "translation": "<English translation>",
  "language": "<language name>",
  "creative_direction": "<MUST be exactly one of: literal|editorial|cinematic|provocative|minimal|movie|movie_remix — echo the mode you were given verbatim, do not paraphrase>",
  "frame_narrative": "<the transformation mode — when auto-picking, this is YOUR choice from the six options; otherwise echo the requested mode>",
  "art_style": "<the art style used or chosen>",
  "scene_count": "<number of scenes>",
  "visual_concept": "<one paragraph describing overall visual approach>",
  "shared_palette": ["<color1>", "<color2>", "<color3>"],
  "shared_motif": "<recurring visual element across scenes>",
  "music_caption": "<single-line music caption: genre, mood, instrumentation, vocal gender, language, clear diction>",
  "mnemonic_text": "<one sentence in the same language as 'translation': what the learner sees in the video and how it connects to the word's meaning — a concrete memory anchor>",
  "scenes": [
    {
      "scene_number": 1,
      "description": "<human-readable scene description>",
      "image_prompt": {
        "subject": "<primary subject/focal point>",
        "scene": "<environment, setting, background>",
        "style": "<visual/photographic style>",
        "lighting": "<lighting conditions, direction, quality>",
        "composition": "<camera angle, framing, spatial arrangement>",
        "mood": "<emotional tone>",
        "colors": ["<color1>", "<color2>"],
        "details": "<environmental details, textures>",
        "aspect_ratio": "16:9",
        "text_element": {
          "text": "<THE WORD IN TARGET LANGUAGE, UPPERCASE>",
          "rendering": "<how the text is physically rendered>",
          "placement": "<where in the scene the text appears>"
        }
      },
      "word_render": {
        "enabled": true,
        "text": "<the word>",
        "technique": "<rendering technique>",
        "placement": "<placement description>",
        "integration_note": "<how it connects to the scene>"
      },
      "camera_motion": {
        "type": "dolly_in",
        "direction": "toward the subject",
        "speed": "slow",
        "description": "deliberate push toward the character's face as emotion builds"
      },
      "video_prompt": "<natural language description of scene with motion for AI video generation>",
      "transition_prompt": "<cinematic description of the visual transformation from this scene to the next scene, or null for the last scene and all collection mode scenes>",
      "suggested_duration": "<integer seconds 3-10, how long this scene should animate>",
      "duration_rationale": "<why this duration serves the scene>"
    }
  ]
}
```

---

## 6. Parse Code — Storyboard JSON → Scene Dicts

**File:** [cloud_engines/image_engine/storyboard.py:383-425](cloud_engines/image_engine/storyboard.py#L383)

```python
def _parse_storyboard_json(
    raw: str, text_to_video: bool = False, art_style: str = "",
) -> Union[Storyboard, StoryboardTextToVideo]:
    cleaned = _repair_json(raw)
    model_cls = StoryboardTextToVideo if text_to_video else Storyboard

    try:
        data = json.loads(cleaned)
        data = _sanitize_storyboard(data, text_to_video=text_to_video, art_style=art_style)
        return model_cls(**data)
    except json.JSONDecodeError as e:
        logger.error("JSON parse failed. Full raw response:\n%s", raw)
        raise RuntimeError(
            f"LLM returned invalid JSON even after repair: {e}\n"
            f"Raw response (first 2000 chars): {raw[:2000]}"
        ) from e
    except Exception as e:
        logger.error("Storyboard schema validation failed. Full raw response:\n%s", raw)
        raise RuntimeError(
            f"LLM returned JSON that doesn't match storyboard schema: {e}\n"
            f"Raw response (first 2000 chars): {raw[:2000]}"
        ) from e
```

Supporting:
- `_repair_json()` — strips markdown fences and trailing commas before parse.
- `_sanitize_storyboard()` at [storyboard.py:255-380](cloud_engines/image_engine/storyboard.py#L255) — fuzzy-matches `frame_narrative` to canonical modes, normalizes `creative_direction`, validates camera_motion type/speed, filters invalid colors, **overwrites `scene.image_prompt.style` with authoritative ART_STYLE description when `art_style` is provided** (lines 335-338), clamps `suggested_duration` to [3, 10], forces last scene's `transition_prompt = null`.

The parsed `Storyboard` instance (a Pydantic model) is returned to `generate_storyboard()` and then flows into the renderer — scenes are **not** converted to plain dicts; they remain Pydantic `Scene` objects, and the renderer accesses `scene.image_prompt`, `scene.word_render`, etc. directly.

---

## 7. Scene → Renderer Branch Point

This is the single location where a future per-image-model prompt-variant switch would live for *downstream injection* of model-specific guidance into the rendered prompt. The storyboard is already parsed by this point, so the choice here would be whether to rewrite/augment `image_prompt` per model, or (better) feed model awareness back into the storyboard call (see §9).

**File:** [cloud_engines/image_engine/renderer.py](cloud_engines/image_engine/renderer.py)

**Function:** `render_all_scenes()` at [renderer.py:~640](cloud_engines/image_engine/renderer.py#L640)

**The loop + call site** at [renderer.py:675-698](cloud_engines/image_engine/renderer.py#L675):

```python
model_id = resolve_model_id(image_model)                          # line 658
# ...
for scene in storyboard.scenes:                                    # line 675
    scene_start = time.monotonic()
    output_path = output_dir / f"{scene.scene_number:03d}.png"

    image_prompt = scene.image_prompt
    if not scene.word_render.enabled:
        image_prompt = image_prompt.model_copy(update={"text_element": None})

    effective_reference = previous_image_path if use_chaining else None
    # ...

    result = render_scene(                                         # line 691  ← branch point
        image_prompt, model_id, output_path, aspect_ratio,
        reference_image_path=effective_reference,
        chain_instruction=chain_instruction,
        word=storyboard.word,
        palette=storyboard.shared_palette,
        use_color_palette=use_color_palette,
    )
```

**Single call site for per-scene render:** [renderer.py:691](cloud_engines/image_engine/renderer.py#L691).

**Model-id resolver (the hook for new models):** `resolve_model_id()` at [renderer.py:70-86](cloud_engines/image_engine/renderer.py#L70):

```python
def resolve_model_id(image_model: str) -> str:
    if image_model == "fast":
        return config.IMAGE_MODEL_FAST
    if image_model == "wan_fast":
        return "wan/2-7-image"
    if image_model == "wan_quality":
        return "wan/2-7-image-pro"
    return config.IMAGE_MODEL_QUALITY
```

When `flux_pro` / `zturbo` / `wan_fallback` are introduced they will be added to `IMAGE_MODELS` ([models.py:73](cloud_engines/image_engine/models.py#L73)) and `resolve_model_id()`, then routed inside `render_scene()` similarly to the existing `wan/` branch.

---

## 8. Pre-existing Model-Specific Branches

**In the storyboard LLM call:** **NONE.** The storyboard prompt is image-model-agnostic today. A grep of [prompts.py](cloud_engines/image_engine/prompts.py) and [storyboard.py](cloud_engines/image_engine/storyboard.py) for `wan|gemini|flux|image_model` inside prompt-assembly code returns no matches — `settings.image_model` is never read by `build_system_prompt()` or `build_user_prompt()`.

**In the renderer:** Yes, two places. Both are Gemini-vs-Wan branches, not full per-model prompt variants.

### 8a. Chain-instruction variants — `render_all_scenes()`

[renderer.py:665-672](cloud_engines/image_engine/renderer.py#L665):

```python
if model_id.startswith("wan/"):
    chain_instruction = CHAIN_INSTRUCTIONS_WAN.get(
        resolved_mode, _FALLBACK_CHAIN_INSTRUCTION_WAN
    )
else:
    chain_instruction = CHAIN_INSTRUCTIONS.get(
        resolved_mode, _FALLBACK_CHAIN_INSTRUCTION
    )
```

Wan gets a distinct `CHAIN_INSTRUCTIONS_WAN` dict at [renderer.py:134-172](cloud_engines/image_engine/renderer.py#L134) that tells the model **not** to reproduce the reference image's layout (because Wan does heavier img2img than Gemini). Example verbatim entry (the `"scale"` mode):

```python
CHAIN_INSTRUCTIONS_WAN: dict[str, Optional[str]] = {
    "scale": (
        "The reference image shows the general subject and style. "
        "Use it ONLY for subject identity — generate a fresh composition at a "
        "completely different scale of observation. DO NOT reproduce the reference "
        "layout, framing, or camera distance. New framing, new context."
    ),
    ...
}
```

### 8b. Render dispatch — `render_scene()`

Inside `render_scene()` around [renderer.py:489-529](cloud_engines/image_engine/renderer.py#L489), the Wan path delegates to `cloud_engines.image_engine.wan_provider.render_scene_wan`; otherwise the Gemini path is used. Chain-anchoring policy also differs — Wan anchors all scenes to scene 1 to avoid compounding drift ([renderer.py:703-709](cloud_engines/image_engine/renderer.py#L703)).

**Summary:** the renderer has a simple Wan-vs-Gemini branch today. The storyboard LLM call does not.

---

## 9. Is the Target Image Model Known at Storyboard Time?

**Yes.** `settings.image_model` is set on the settings snapshot before `generate_storyboard()` runs, so a future prompt-variant branch has full visibility.

### Evidence chain

1. **`ImageSettings` carries `image_model`** — [models.py:104-134](cloud_engines/image_engine/models.py#L104):

   ```python
   image_model: str = Field(default="fast")
   ```

   Validated against `IMAGE_MODELS = ("fast", "quality", "wan_fast", "wan_quality")` at [models.py:73](cloud_engines/image_engine/models.py#L73), [models.py:178-179](cloud_engines/image_engine/models.py#L178).

2. **Top-level defaults file** [src/settings.py:48-61](src/settings.py#L48) sets the snapshot before any engine runs:

   ```python
   "images": {
       "creative_direction": "auto",
       ...
       "image_model": "quality",
       "llm_model": "x-ai/grok-4.1-fast",
   },
   ```

3. **`settings` is passed into `generate_storyboard()`** at [engine.py:92-96](cloud_engines/image_engine/engine.py#L92):

   ```python
   storyboard, storyboard_meta, storyboard_debug = generate_storyboard(
       content=payload.content,
       context=payload.context,
       settings=payload.settings,
   )
   ```

4. **`generate_storyboard()` receives the full settings** at [storyboard.py:38](cloud_engines/image_engine/storyboard.py#L38) and builds the prompt with them — but **never reads `settings.image_model`** currently. A grep of [storyboard.py](cloud_engines/image_engine/storyboard.py) and [prompts.py](cloud_engines/image_engine/prompts.py) confirms: `image_model` is not referenced anywhere inside the LLM-call path.

### Where to thread in model awareness later

The cleanest single place to add the branch is:

- **`build_system_prompt()` signature** at [prompts.py:17](cloud_engines/image_engine/prompts.py#L17) — already receives the full `settings` via whatever caller passes in (currently receives individual fields). You'd either (a) start passing `settings.image_model` explicitly, or (b) have `generate_storyboard()` pass it as an additional kwarg.
- **Then** a new `_image_model_block(image_model: str) -> Optional[str]` helper (analogous to existing `_art_style_block`, `_word_in_image_block`, etc.) gets appended to the `"\n\n".join([...])` at the end of `build_system_prompt()`.
- **No upstream wiring change needed** — `settings.image_model` already exists in the settings snapshot when `generate_storyboard()` fires.

---

## 10. Scene Keying, Ordering, Typical Counts

### Keying

Scenes are keyed by `scene_number: int`, valid range `[1, 8]` — [models.py:353](cloud_engines/image_engine/models.py#L353). The `scenes` array in the JSON output is 1-indexed via the explicit `scene_number` field; output files are `{scene_number:03d}.png` (e.g., `001.png`) — [renderer.py:677](cloud_engines/image_engine/renderer.py#L677).

### Typical counts

From `AUTO_IMAGE_COUNT_MAP` at [models.py:564-576](cloud_engines/image_engine/models.py#L564):

| clip_duration | auto scene_count |
|---|---|
| 5s  | 1 |
| 10s | 2 |
| 15s | 2 |
| 20s | 3 |
| 30s | 3 |

Default `clip_duration = 20` → **3 scenes** is the typical case. Users can override `image_count` to any value in `[1, 8]`.

### Auto-count behavior

When `image_count="auto"`, the user-prompt says "Create 2 or 3 scenes" and the LLM picks based on the word's semantics. Single-frame mode is triggered by `clip_duration=5` or explicit `image_count=1`.

---

## Appendix — File map

| Purpose | File |
|---|---|
| Storyboard LLM entry | [cloud_engines/image_engine/storyboard.py](cloud_engines/image_engine/storyboard.py) |
| OpenRouter HTTP call | [storyboard.py:145](cloud_engines/image_engine/storyboard.py#L145) |
| Prompt assembly | [cloud_engines/image_engine/prompts.py](cloud_engines/image_engine/prompts.py) |
| Pydantic models | [cloud_engines/image_engine/models.py](cloud_engines/image_engine/models.py) |
| Engine orchestrator | [cloud_engines/image_engine/engine.py](cloud_engines/image_engine/engine.py) |
| Render dispatch | [cloud_engines/image_engine/renderer.py](cloud_engines/image_engine/renderer.py) |
| Wan provider | [cloud_engines/image_engine/wan_provider.py](cloud_engines/image_engine/wan_provider.py) |
| Config (endpoints, tokens) | [cloud_engines/image_engine/config.py](cloud_engines/image_engine/config.py) |
| Top-level settings defaults | [src/settings.py](src/settings.py) |

### Single-sentence answers to the brief

1. [storyboard.py:38](cloud_engines/image_engine/storyboard.py#L38) `generate_storyboard()`, HTTP call at [storyboard.py:145](cloud_engines/image_engine/storyboard.py#L145) `_call_openrouter()`.
2. Not one verbatim string — `build_system_prompt()` at [prompts.py:17](cloud_engines/image_engine/prompts.py#L17) assembles ~15 conditional blocks listed above.
3. User prompt verbatim reproduced in §3 (15-line function at [prompts.py:118](cloud_engines/image_engine/prompts.py#L118)).
4. OpenRouter, default `deepseek/deepseek-v3.2` or runtime default `x-ai/grok-4.1-fast`; `max_tokens=8192`, `response_format=json_object`. **Temperature confirmed absent.**
5. Pydantic `Storyboard` + `Scene` + `ImagePromptData` — full schema in §5.
6. `_parse_storyboard_json()` at [storyboard.py:383](cloud_engines/image_engine/storyboard.py#L383) with repair + `_sanitize_storyboard()` at [storyboard.py:255](cloud_engines/image_engine/storyboard.py#L255).
7. Single call site for per-scene render: `render_scene(...)` at [renderer.py:691](cloud_engines/image_engine/renderer.py#L691). For per-model *storyboard prompt* branching: append to `build_system_prompt()` at [prompts.py:17](cloud_engines/image_engine/prompts.py#L17).
8. No per-model branches in the LLM storyboard call. Gemini-vs-Wan branches exist only in the renderer (chain instructions at [renderer.py:665](cloud_engines/image_engine/renderer.py#L665), dispatch at [renderer.py:489](cloud_engines/image_engine/renderer.py#L489)).
9. Yes — `settings.image_model` is in the snapshot, reaches `generate_storyboard()`, and is simply not read by prompt assembly today. Thread it into `build_system_prompt()` to enable per-model prompting.
10. Keyed by `scene_number ∈ [1, 8]`, 1-indexed; typical count is **3** (20s default clip).
