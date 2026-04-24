# Investigation — Renderer / Image-Provider Contract

Read-only contract capture. No files modified. No architectural proposals.

All line numbers refer to `HEAD` of `cloud_engines/image_engine/` on 2026-04-23.

---

## 0. Module topology

```
cloud_engines/image_engine/
├── __init__.py
├── config.py              ← env + constants (IMAGE_MODEL_FAST/QUALITY, GOOGLE_AI_API_KEY, KIE_API_KEY)
├── engine.py              ← generate_images() entry point — calls render_all_scenes()
├── models.py              ← Pydantic: ImagePayload, Storyboard, Scene, ImagePromptData, RenderResult, RenderingStepMeta
├── prompt_compiler.py     ← compile_scene_to_text() — used ONLY by wan_provider (text-prompt providers)
├── prompts.py             ← storyboard-LLM prompt text (not relevant to render contract)
├── renderer.py            ← resolve_model_id(), render_scene(), render_all_scenes(); Gemini logic INLINE (no gemini_provider.py)
├── storyboard.py          ← Step A (LLM → Storyboard); not relevant to render contract
└── wan_provider.py        ← Wan 2.7 via kie.ai; the only standalone provider module today
```

**Observation 0.1.** There is no `gemini_provider.py`. Gemini is called directly from inside `render_scene()` (lines 531–637 of renderer.py) via `google.genai.Client`. The Wan dispatch block (lines 489–529) is the only provider-level branch.

---

## 1. `resolve_model_id()` — full signature, enum, mapping

### Source (renderer.py:70–85)

```python
def resolve_model_id(image_model: str) -> str:
    """Resolve image_model setting value to an actual model ID.

    Args:
        image_model: 'fast', 'quality', 'wan_fast', or 'wan_quality'.

    Returns:
        Actual model ID string.
    """
    if image_model == "fast":
        return config.IMAGE_MODEL_FAST
    if image_model == "wan_fast":
        return "wan/2-7-image"
    if image_model == "wan_quality":
        return "wan/2-7-image-pro"
    return config.IMAGE_MODEL_QUALITY
```

### Enum values accepted

Defined by `IMAGE_MODELS` in [models.py:73](cloud_engines/image_engine/models.py#L73) and enforced by `ImageSettings.validate_image_model` ([models.py:174-180](cloud_engines/image_engine/models.py#L174-L180)):

```python
IMAGE_MODELS = ("fast", "quality", "wan_fast", "wan_quality")
```

### Mapping table

| `image_model` input | Returned `model_id` (string) | Source of literal | Dispatched provider branch |
|---|---|---|---|
| `"fast"` | `config.IMAGE_MODEL_FAST` (env `IMAGE_MODEL_FAST`, default `"gemini-2.5-flash-image"`) | config.py:21 | Gemini inline (no `wan/` prefix) |
| `"quality"` (and any unknown input — the default branch) | `config.IMAGE_MODEL_QUALITY` (env `IMAGE_MODEL_QUALITY`, default `"gemini-3-pro-image-preview"`) | config.py:22 | Gemini inline |
| `"wan_fast"` | hard-coded literal `"wan/2-7-image"` | renderer.py:82 | Wan branch (`model_id.startswith("wan/")`) |
| `"wan_quality"` | hard-coded literal `"wan/2-7-image-pro"` | renderer.py:84 | Wan branch |

**Metadata:** none. The function returns a bare string. There is no provider-name field, no cost field, no resolution field attached to the return value. Provider selection downstream is done by string-prefix check on `"wan/"`. Resolution is re-derived inside `wan_provider.render_scene_wan` from the literal model ID (`"2K"` if `WAN_MODEL_QUALITY`, else `"1K"`, wan_provider.py:85).

**Observation 1.1.** Any `image_model` value that passes the `IMAGE_MODELS` validator but is NOT `"fast"`, `"wan_fast"`, or `"wan_quality"` falls through to `IMAGE_MODEL_QUALITY`. In practice this is only `"quality"`, but the catch-all `return` is important: the function silently treats unknown strings as quality-Gemini.

**Observation 1.2.** The wan model ID literals (`"wan/2-7-image"`, `"wan/2-7-image-pro"`) are duplicated in wan_provider.py:35-36 as `WAN_MODEL_FAST` / `WAN_MODEL_QUALITY`.

---

## 2. `render_scene()` — signature, return type, dispatch

### Source (renderer.py:453–463 — full signature)

```python
def render_scene(
    image_prompt: ImagePromptData,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    reference_image_path: Optional[Path] = None,
    chain_instruction: Optional[str] = None,
    word: str = "",
    palette: Optional[list[str]] = None,
    use_color_palette: bool = False,
) -> RenderResult:
```

### Argument contract

| Arg | Type | Default | Purpose |
|---|---|---|---|
| `image_prompt` | `ImagePromptData` (Pydantic, models.py:253-265) | — | Structured scene JSON sent to provider. |
| `model_id` | `str` | — | Output of `resolve_model_id()`. Provider branch is chosen by `str.startswith("wan/")`. |
| `output_path` | `Path` | — | Destination PNG on local disk. `scene_number = int(output_path.stem)` — caller supplies `{scene_number:03d}.png`. |
| `aspect_ratio` | `str` | `"16:9"` | One of `"16:9"`, `"1:1"`, `"9:16"` (ASPECT_RATIOS). Gemini passes it via `types.ImageConfig.aspect_ratio`; Wan passes it via payload `input.aspect_ratio`. |
| `reference_image_path` | `Optional[Path]` | `None` | Local path to previous scene's PNG for i2i chaining. See Section 5. |
| `chain_instruction` | `Optional[str]` | `None` | Mode-specific continuity instruction (`CHAIN_INSTRUCTIONS[mode]` or `CHAIN_INSTRUCTIONS_WAN[mode]`). Used as a gate: reference is uploaded/used only if chain_instruction is truthy. |
| `word` | `str` | `""` | The target word; used only for the typographic fallback image (renderer.py:609). |
| `palette` | `Optional[list[str]]` | `None` | CSS color strings from `storyboard.shared_palette`; only used by the typographic fallback (renderer.py:609). |
| `use_color_palette` | `bool` | `False` | Wan-only: forwarded to `prompt_compiler.compile_scene_to_text` to include a "Color palette: …" section. Gemini branch ignores this. |

### Return type

`RenderResult` — models.py:438-446:

```python
class RenderResult(BaseModel):
    success: bool
    scene_number: int
    file_path: Optional[str] = None          # == output_path.name on success
    error_message: Optional[str] = None
    prompt_json: Optional[str] = None        # JSON string (Gemini) or compiled text (Wan), for debug.json
    safety_blocked: bool = False             # True if Gemini returned a near-black placeholder
```

### Literal dispatch block (renderer.py:489–529)

```python
    # --- Wan 2.7 route ---
    if model_id.startswith("wan/"):
        from .wan_provider import render_scene_wan, _upload_for_chaining

        wan_input_urls = None
        if reference_image_path and reference_image_path.exists() and chain_instruction:
            api_key = os.environ.get("KIE_API_KEY", "")
            if api_key:
                ref_url = _upload_for_chaining(reference_image_path, api_key)
                if ref_url:
                    wan_input_urls = [ref_url]
                    logger.info("Scene %d: Wan chaining via %s", scene_number, ref_url)
                else:
                    logger.warning("Scene %d: Wan upload failed, rendering without reference", scene_number)

        wan_result = render_scene_wan(
            image_prompt=image_prompt.model_dump(exclude_none=True),
            model_id=model_id,
            output_path=output_path,
            aspect_ratio=aspect_ratio,
            chain_instruction=chain_instruction,
            input_urls=wan_input_urls,
            use_color_palette=use_color_palette,
        )
        if wan_result["success"]:
            return RenderResult(
                success=True,
                scene_number=scene_number,
                file_path=output_path.name,
                prompt_json=wan_result.get("prompt_text", ""),
            )
        # Wan failed — fall back to Gemini quality for this scene
        logger.warning(
            "Scene %d: Wan render failed (%s), falling back to Gemini",
            scene_number, wan_result.get("error_message", "unknown"),
        )
        if model_id == "wan/2-7-image":
            model_id = config.IMAGE_MODEL_FAST
        else:
            model_id = config.IMAGE_MODEL_QUALITY
        # Fall through to Gemini code below
```

After this block, control falls through unconditionally into the Gemini path (renderer.py:531-637).

### Dispatch summary

- Branch predicate: **`model_id.startswith("wan/")`**. Single string check, no registry, no provider enum.
- On Wan success: build `RenderResult` from the dict returned by `render_scene_wan` and return immediately.
- On Wan failure: rewrite `model_id` to Gemini fast/quality and fall through — **Gemini is the hardcoded fallback** for every non-Gemini path.
- Gemini path: builds `types.Part` list (optional reference-image inline data + chain instruction text + scene JSON), calls `_call_gemini_with_retries`, extracts bytes, writes PNG.

**Observation 2.1.** The fallback from Wan → Gemini is silent except for a `logger.warning`. A new provider (e.g. Flux) would need to decide whether it inherits the same "fall through to Gemini on failure" behavior or returns its own failed `RenderResult` to the caller.

**Observation 2.2.** `reference_image_path` is consumed in **two different ways** depending on provider:
- Gemini path (renderer.py:553-568): reads `reference_image_path.read_bytes()` locally, inlines into the `Part` list as `types.Blob(mime_type="image/png")`.
- Wan path (renderer.py:494-502): uploads the local file to kie.ai's `file-base64-upload` endpoint, receives a public `downloadUrl`, passes that URL in `payload.input.input_urls: list[str]`.

---

## 3. `wan_provider.py` module contract

Public surface currently imported by renderer.py:

```python
from .wan_provider import render_scene_wan, _upload_for_chaining  # renderer.py:491
```

Note: `_upload_for_chaining` has an underscore prefix but is imported across module boundaries — it is de facto public.

### 3.1 `render_scene_wan()`

**Signature (wan_provider.py:45-53):**

```python
def render_scene_wan(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    chain_instruction: Optional[str] = None,
    input_urls: Optional[list[str]] = None,
    use_color_palette: bool = False,
) -> dict:
```

**Argument differences vs render_scene():**
- `image_prompt` arrives as a plain `dict` (already `model_dump(exclude_none=True)`'d by renderer.py:505), not as `ImagePromptData`. The provider never imports Pydantic models.
- `reference_image_path` / `word` / `palette` are absent. The provider only accepts a list of already-resolved remote URLs (`input_urls`) and never reads the local filesystem for references.
- Return is a plain `dict`, not `RenderResult`. The renderer adapts the dict into a `RenderResult`.

**Return shape (always this dict):**

```python
{
    "success": bool,
    "file_path": Optional[str],   # output_path.name on success, None on failure
    "error_message": Optional[str],
    "prompt_text": str,            # the compiled text prompt (whether success or fail)
}
```

Error-path constructor: `_err(message, prompt_text)` (wan_provider.py:336-337) produces `{"success": False, "file_path": None, "error_message": message, "prompt_text": prompt_text}`.

### 3.2 `_upload_for_chaining()`

**Signature (wan_provider.py:145):**

```python
def _upload_for_chaining(image_path: Path, api_key: str) -> Optional[str]:
```

Uploads `image_path` as base64 to `https://kieai.redpandaai.co/api/file-base64-upload`, returns the `data.downloadUrl` on success, `None` on any exception. Does not raise — caller (renderer.py:497-502) treats `None` as "render without reference."

### 3.3 Error classes raised

**None.** `wan_provider.py` raises no custom exception classes. All failure modes are converted to the error dict via `_err()`:
- `httpx.HTTPStatusError` → caught in `_submit_task` (wan_provider.py:205-206), converted to dict.
- Generic `Exception` → caught in `_submit_task` (line 207), `_poll_task` (line 262), `_upload_for_chaining` (line 174), `_download_and_save` (line 332), all converted to dict or `None`.
- `httpx.HTTPError` inside the poll loop → caught (line 233), logged as warning, loop continues polling.

Upstream, `renderer.render_scene` wraps `render_scene_wan`'s result into a `RenderResult(success=False, ...)` only on Gemini's fallback also failing. On Wan failure, the renderer switches model and retries via Gemini (renderer.py:520-529).

### 3.4 Logging pattern

Single module-level logger: `logger = logging.getLogger(__name__)` (wan_provider.py:30).

Log sites:
- `logger.info` — prompt preview on submit (wan_provider.py:82), task ID after submit (115), upload success (170), poll-state progress (243-246), image download URL (308), save confirmation (329), JPEG→PNG conversion (324-327).
- `logger.warning` — upload with no `downloadUrl` (172), upload exception (175), unparseable `resultJson` (288), poll HTTP error (234-237).
- No `logger.error` or `logger.exception` calls in this module.

### 3.5 Retry behaviour

- **Submit (`_submit_task`)**: no retries. Single POST, any exception → error dict. HTTPStatusError is caught; non-200 JSON `code` field is also treated as error (wan_provider.py:195-197).
- **Poll (`_poll_task`)**: polls every `WAN_POLL_INTERVAL = 5.0s`, max total `WAN_MAX_POLL_TIME = 180.0s`. On poll HTTP error: logs warning, sleeps `WAN_POLL_INTERVAL`, continues (no retry cap — polling itself is the retry). Terminal state `"success"` returns the full `result` dict; `"fail"` returns error dict with `failMsg`/`errorMessage`. Otherwise (`waiting`/`queuing`/`generating`) → keep polling.
- **Download (`_download_and_save`)**: no retries. Single GET with `WAN_DOWNLOAD_TIMEOUT = 60.0s`.
- **Upload (`_upload_for_chaining`)**: no retries. Single POST with hardcoded `timeout=30.0`.
- **No exponential backoff anywhere.** Wan has no equivalent of the Gemini `RATE_LIMIT_BASE_DELAY` / `RATE_LIMIT_MAX_RETRIES` logic.

### 3.6 Minimum public surface a new provider module must expose

Derived strictly from what renderer.py imports + how it uses the result:

```python
# Required import from .{new_provider} in renderer.py
def render_scene_{provider}(
    image_prompt: dict,                          # model_dump(exclude_none=True) of ImagePromptData
    model_id: str,                               # the provider-specific model ID string
    output_path: Path,                           # local file to write (must write PNG bytes here)
    aspect_ratio: str = "16:9",
    chain_instruction: Optional[str] = None,
    # Zero or more provider-specific reference-passing kwargs.
    # Current Wan uses `input_urls: Optional[list[str]]`.
    use_color_palette: bool = False,             # forwarded to prompt_compiler.compile_scene_to_text
) -> dict:
    # Returns:
    #   {"success": True,  "file_path": output_path.name, "error_message": None, "prompt_text": str}
    #   {"success": False, "file_path": None,             "error_message": str,  "prompt_text": str}
```

If the provider requires remote URLs for chaining (like Wan), it also needs an upload helper whose return type is `Optional[str]` (the resolvable URL), callable by the renderer's dispatch block.

**The renderer imposes no ABC or Protocol** — the "contract" is implicit and duck-typed: a function that accepts the seven-ish kwargs above and returns a dict with those four keys.

---

## 4. Scene dict shape at `render_scene()`

### How the dict is produced

At `render_scene()` the scene data arrives as a Pydantic **`ImagePromptData` instance** (renderer.py:454: `image_prompt: ImagePromptData`). It is then serialized via `image_prompt.model_dump(exclude_none=True)`:

- Gemini path: serialized to JSON via `json.dumps(prompt_dict, ensure_ascii=False)` (renderer.py:533).
- Wan path: dict passed directly to `render_scene_wan(image_prompt=image_prompt.model_dump(exclude_none=True), ...)` (renderer.py:505).

`render_all_scenes` (renderer.py:680-682) may mutate one field before calling `render_scene`:

```python
image_prompt = scene.image_prompt
if not scene.word_render.enabled:
    image_prompt = image_prompt.model_copy(update={"text_element": None})
```

I.e. if `scene.word_render.enabled == False`, `text_element` is nulled.

### Schema (models.py:253-265)

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

class TextElement(BaseModel):
    text: str
    rendering: str
    placement: str
```

### Per-field consumption

| Field | Gemini path | Wan path (via `compile_scene_to_text`) |
|---|---|---|
| `subject` | Serialized into JSON blob sent as `types.Part(text=…)`. The model reads the JSON directly. | Opening sentence: `"Create a high-quality image of {subject}"` (prompt_compiler.py:60). |
| `scene` | JSON field. | Appended to opening: `" in {scene}"` (prompt_compiler.py:62). |
| `style` | JSON field + **used for preamble selection** via `_get_style_preamble(prompt_dict.get("style", ""))` (renderer.py:536). | Folded into opening (`"In the style of {style}: …"`, prompt_compiler.py:65) AND emitted again as labeled `Style: …` section (prompt_compiler.py:81). Skipped if value is `"n/a"`/`"none"`/`"null"`/`"auto"`. |
| `lighting` | JSON field. | `Lighting: {lighting}.` section (prompt_compiler.py:88). |
| `composition` | JSON field. | `Composition: {composition}.` section (prompt_compiler.py:87). |
| `mood` | JSON field. | `Mood: {mood}.` section (prompt_compiler.py:89). |
| `colors` | JSON field. | Gated by `use_color_palette`. When true: `Color palette: c1, c2, …` section (prompt_compiler.py:92-100). When false: dropped. |
| `details` | JSON field. | `Details: {details}.` section (prompt_compiler.py:103). |
| `aspect_ratio` | **Ignored as a field** in the JSON (the real aspect comes from `render_scene`'s `aspect_ratio` kwarg → `types.ImageConfig.aspect_ratio`, renderer.py:790-792). | Same — the real aspect comes from `render_scene_wan`'s kwarg → `payload.input.aspect_ratio` (wan_provider.py:94). The field in the dict is effectively metadata. |
| `text_element` | JSON field. | `Text visible in scene: the text "…" rendered as … , {placement}` (prompt_compiler.py:106-117). |

**Fields that every provider consumes:** `subject`, `scene`, `style`, `lighting`, `composition`, `mood`, `details`, `text_element`.
**Field that providers may ignore:** `aspect_ratio` (duplicated by kwarg), `colors` (opt-in via `use_color_palette`).

### Realistic literal example

Reconstructed from `ImagePromptData` defaults + `Storyboard` JSON shape. An actual scene dict at `render_scene()` looks like this (after `model_dump(exclude_none=True)`):

```json
{
  "subject": "a solitary wanderer pausing at the edge of a cliff",
  "scene": "a vast twilight landscape with distant mountains",
  "style": "Gerhard Richter photorealistic painting, soft focus blur, muted palette",
  "lighting": "low-angle golden hour sunlight raking across the subject",
  "composition": "rule of thirds, subject placed on the left vertical line, deep background",
  "mood": "contemplative, awe, a hint of vertigo",
  "colors": ["#c9a66b", "#3d4a5f", "#e8e1d4", "#1a1f2e"],
  "details": "wind-tousled hair, textured fabric, visible grain in fabric weave",
  "aspect_ratio": "16:9",
  "text_element": {
    "text": "abgrund",
    "rendering": "small hand-inked lettering in the lower-right corner",
    "placement": "bottom-right, off-center, on the rock face"
  }
}
```

This matches both the Pydantic schema (models.py:253-265) and the storyboard-LLM prompt in prompts.py (which instructs the LLM to emit exactly these keys).

### Fields present on the parent `Scene` that DO NOT reach the provider

These live on `Scene` (models.py:350-363) but are consumed upstream of `render_scene` — the provider never sees them:

- `scene_number`, `description`, `word_render` (used by `render_all_scenes` for filename + text_element toggle)
- `camera_motion`, `video_prompt`, `transition_prompt`, `suggested_duration`, `duration_rationale` — consumed later by the video pipeline, not the image provider
- `movie_reference`, `remix_element` — used by storyboard generation only

Similarly fields on `Storyboard` (models.py:366-385) that don't reach the provider directly: `word`, `translation`, `language`, `creative_direction`, `frame_narrative`, `art_style`, `scene_count`, `visual_concept`, `shared_palette` (only forwarded as `palette` kwarg to the fallback image generator, not the provider), `shared_motif`, `movie_source_strategy`, `movies_referenced`, `suggested_transition_mode`, `transition_rationale`, `music_caption`, `mnemonic_text`.

---

## 5. How `reference_image_path` is populated (i2i trace)

### Populated by: `render_all_scenes` (renderer.py:640-709)

**There is no i2i decision made outside `render_all_scenes`.** The caller above (`engine.generate_images`, engine.py:113-119) does not pass any reference path — it only passes the `Storyboard`. `reference_image_path` is constructed **purely from local state within `render_all_scenes`**:

```
generate_images (engine.py:113)
      │
      ▼ passes Storyboard, image_model, output_dir, aspect_ratio, use_color_palette
render_all_scenes (renderer.py:640)
      │
      │  previous_image_path: Optional[Path] = None
      │  for each scene:
      │      output_path = output_dir / f"{scene.scene_number:03d}.png"       # local filesystem
      │      effective_reference = previous_image_path if use_chaining else None
      │      render_scene(..., reference_image_path=effective_reference, ...)
      │      # after call:
      │      if wan:    previous_image_path = scene-1 path (pinned)           # renderer.py:703-706
      │      else:      previous_image_path = just-rendered output_path       # renderer.py:707-709
      ▼
render_scene (renderer.py:453)
```

### The i2i decision

Made at renderer.py:663-673:

```python
resolved_mode = resolve_frame_narrative(storyboard.frame_narrative)
if model_id.startswith("wan/"):
    chain_instruction = CHAIN_INSTRUCTIONS_WAN.get(resolved_mode, _FALLBACK_CHAIN_INSTRUCTION_WAN)
else:
    chain_instruction = CHAIN_INSTRUCTIONS.get(resolved_mode, _FALLBACK_CHAIN_INSTRUCTION)
use_chaining = chain_instruction is not None  # collection mode skips chaining
```

Chaining is **ON** for modes: `scale`, `action`, `environment`, `narrative`, `context`.
Chaining is **OFF** for mode: `collection` (CHAIN_INSTRUCTIONS[*]["collection"] == `None`, renderer.py:114, 165).

Legacy aliases resolved via `resolve_frame_narrative` (models.py:69-71, MODE_ALIASES at 53-60): `angles`/`perspective`/`perspectives` → `scale`; `series`/`character`/`characters` → `context`.

### The path value at `render_scene` receipt

**Type:** `Optional[Path]` — `pathlib.Path` instance pointing at a **local filesystem path**.

**Exact form:** `output_dir / f"{N:03d}.png"` where `N` is the scene number of the previous rendered scene (Gemini chain) or always scene 1 (Wan chain).

**Examples:**
- Scene 2 of a Gemini render where `output_dir = /tmp/job_abc123/`: `reference_image_path = Path("/tmp/job_abc123/001.png")`.
- Scene 3 of the same Gemini render: `Path("/tmp/job_abc123/002.png")`.
- Scene 3 of a Wan render in the same dir: `Path("/tmp/job_abc123/001.png")` (pinned to scene 1 to avoid compound img2img drift, per comment at renderer.py:701-702).
- Scene 1 always receives `None` (no prior image).

**Explicitly NOT:**
- Not a Supabase storage URL.
- Not a signed URL.
- Not base64 bytes.
- Not an HTTP(S) URL of any kind.

The **only** conversion to a remote URL is internal to the Wan path: `_upload_for_chaining(reference_image_path, api_key)` inside the dispatch block (renderer.py:497) uploads the local PNG to kie.ai and returns a `downloadUrl`, which becomes `input_urls=[ref_url]` on the Wan payload. That remote URL never leaves the Wan branch.

**Collection mode caveat:** When `frame_narrative == "collection"`, `chain_instruction` is `None`, `use_chaining` is `False`, `effective_reference` is always `None`, and `previous_image_path` is never updated. Every scene renders independently without i2i.

**Text-to-video caveat:** When `settings.skip_rendering == True` (engine.py:112), `render_all_scenes` is not called at all. No i2i, no PNGs.

---

## 6. Failure-handling behaviour

### Inside `wan_provider.py`

See Section 3.5. Summary:
- No custom exceptions raised; every error becomes `{"success": False, "error_message": …}`.
- Submit: no retries.
- Poll: hard cap of 180s total; 5s interval. Poll-itself HTTP errors are swallowed as warnings and the loop continues.
- Download: no retries; single 60s timeout.
- Upload: no retries; single 30s timeout. Upload failure degrades silently (renderer falls back to rendering without reference, renderer.py:502).

### Inside `renderer.py`

#### Gemini retry (`_call_gemini_with_retries`, renderer.py:759-835)

- **Invalid API key** (`"api key" in error_str or "401" in error_str or "403" in error_str`) → `raise` immediately.
- **Rate limit** (`"429" in error_str or "rate" in error_str`) → exponential backoff: `RATE_LIMIT_BASE_DELAY * (2 ** attempt)` with `RATE_LIMIT_BASE_DELAY = 2.0` and `RATE_LIMIT_MAX_RETRIES = 3`. After exhaustion, returns `None`.
- **Timeout** (`"timeout" in error_str or "timed out" in error_str`) → retry **once** after `TIMEOUT_RETRY_DELAY = 5.0s`. Second timeout returns `None`.
- **Other exceptions** → log and return `None` (no retry).

#### Gemini safety-recovery ladder (render_scene body, renderer.py:595-617)

1. `_extract_image_data` returns `None` (no image part / policy block).
2. Retry with softened prompt via `_soften_prompt` (prepends safety preamble, replaces `_SENSITIVE_PATTERNS` keywords with `***`).
3. If still blocked and `word` is non-empty, generate typographic fallback image via `_generate_fallback_image(word, palette or [], output_path)`.
4. If fallback also fails: return `RenderResult(success=False, error_message="Content blocked by safety filter — all recovery attempts failed")`.

#### Near-black-placeholder detection (`_is_likely_refusal`, renderer.py:46-66)

Post-hoc check on the generated bytes. Flags `safety_blocked=True` on the RenderResult if `len(bytes) < _MIN_IMAGE_BYTES[aspect_ratio]` or the image is near-uniform dark (mean < 15, variance < 50). Does **not** cause `success=False` — the flag is advisory; the PNG is still saved.

#### Wan-to-Gemini cross-provider fallback (renderer.py:520-529)

When the Wan branch returns `{"success": False, ...}`, the renderer does NOT return failure. Instead:
- Logs a warning with the Wan error message.
- Rewrites `model_id`: `"wan/2-7-image" → config.IMAGE_MODEL_FAST`, else `→ config.IMAGE_MODEL_QUALITY`.
- Falls through to the Gemini code. The Gemini call then runs with the original `reference_image_path` (as a local file Part), the original `chain_instruction`, the original prompt — but no Wan-specific preamble injection.

This means a Wan failure always gets a second attempt on Gemini. A new provider implementation could either inherit this behavior (by falling through similarly) or terminate — the renderer imposes no pattern.

### Error surface to the orchestrator

At the `generate_images` level (engine.py:137-153):

- Per-scene `RenderResult.success` aggregated into a status:
  - all-succeeded → `"success"`
  - some-succeeded → `"partial"`
  - none-succeeded → `"failed"` with `ImageError(message=f"All {total} scenes failed to render", retryable=True)`
- Exception classes caught in `generate_images` (engine.py:162-176): `ValueError` (retryable=False), `ConnectionError` (retryable=True), `RuntimeError` (retryable=True), catch-all `Exception` (retryable=False).
- Final return is always `ImageResult(status, output_paths, error)` — never raises to the orchestrator.

The only exception that can escape `render_scene` → `render_all_scenes` → `generate_images` is the Gemini API-key raise inside `_call_gemini_with_retries` (renderer.py:803-804), which is caught by the catch-all `except Exception` in engine.py:174.

---

## 7. Config surface

### Env vars / constants consumed by `wan_provider.py`

Read directly at call time (not imported from `config.py`):

| Source | Value | Where |
|---|---|---|
| `os.environ.get("KIE_API_KEY", "")` | Bearer token for kie.ai | wan_provider.py:72 (inside `render_scene_wan`). Also used in `_upload_for_chaining` via the `api_key` parameter that renderer.py reads from the same env var at renderer.py:495. |

Hardcoded module-level constants (wan_provider.py:32-42):

| Constant | Value | Purpose |
|---|---|---|
| `KIE_API_BASE` | `"https://api.kie.ai/api/v1"` | Base URL for submit + poll |
| `WAN_MODEL_FAST` | `"wan/2-7-image"` | Literal used for resolution decision (line 85) and identity check |
| `WAN_MODEL_QUALITY` | `"wan/2-7-image-pro"` | Same |
| `WAN_POLL_INTERVAL` | `5.0` | Seconds between poll GETs |
| `WAN_MAX_POLL_TIME` | `180.0` | Total cap for polling |
| `WAN_HTTP_TIMEOUT` | `30.0` | Per-request (submit + poll) HTTPX timeout |
| `WAN_DOWNLOAD_TIMEOUT` | `60.0` | Image download timeout |

Upload endpoint is hardcoded inline at `_upload_for_chaining` (wan_provider.py:160): `"https://kieai.redpandaai.co/api/file-base64-upload"` — note this is a **different subdomain** from `KIE_API_BASE`.

### Env vars / constants consumed by the Gemini inline path

From `config.py`:

| Var | Default | Purpose |
|---|---|---|
| `GOOGLE_AI_API_KEY` | `""` | Required; checked at renderer.py:542-549 with explicit error if missing |
| `IMAGE_MODEL_FAST` | `"gemini-2.5-flash-image"` | Returned by `resolve_model_id("fast")` |
| `IMAGE_MODEL_QUALITY` | `"gemini-3-pro-image-preview"` | Returned by `resolve_model_id("quality")` and the default branch |

Inline retry constants (renderer.py:35-36, 67):
- `TIMEOUT_RETRY_DELAY = 5.0`
- `RATE_LIMIT_MAX_RETRIES = 3`
- `RATE_LIMIT_BASE_DELAY = 2.0`
- `_MIN_IMAGE_BYTES = {"16:9": 15_000, "1:1": 10_000, "9:16": 15_000}` (refusal detection thresholds, renderer.py:39-43)

Cost constants imported from `src.cost_logger`:
- `KIE_WAN_COST_PER_IMAGE` (flat cost per Wan image)
- `estimate_gemini_image_cost(model_id)` (variable by Gemini model)

### Where a new provider would register its equivalent config

Today there is **no central registry**. A new provider adds config in one of three places, pattern-matching on Wan:

1. **Env var read in the provider module itself** — Wan does this inline at wan_provider.py:72 for `KIE_API_KEY`. The config.py file also re-declares `KIE_API_KEY: str = os.environ.get("KIE_API_KEY", "")` at config.py:20, but that constant is **not actually read by wan_provider** — the provider uses `os.environ.get` directly. A new provider would similarly declare its env var at module top.

2. **Model ID literal in `resolve_model_id`** — renderer.py:79-85. A new branch added to the if/elif chain, plus a new value added to the `IMAGE_MODELS` tuple in models.py:73 (and thus the `ImageSettings.validate_image_model` validator will auto-accept it).

3. **Dispatch branch in `render_scene`** — a new `if model_id.startswith("new_provider/"):` block analogous to renderer.py:490-529. The branch must decide: (a) how it translates `reference_image_path` into provider-accepted references (Wan uploads; Gemini inlines as bytes), (b) whether to fall through to Gemini on failure.

4. **Cost logging** — `render_all_scenes` (renderer.py:714-733) currently has a two-way branch: `"kie_ai" if _is_wan else "gemini"`. A new provider would need a third branch with its own `estimated_cost_usd` expression.

There is no IoC container, no provider registry, no entry-point plugin pattern, no ABC. All additions are explicit edits to `resolve_model_id`, the dispatch block in `render_scene`, the cost branch in `render_all_scenes`, and the `IMAGE_MODELS` tuple.

---

## Appendix A — Caller chain summary

```
job_runner (out of scope for this investigation)
    ↓
engine.generate_images(payload: ImagePayload) -> ImageResult                  [engine.py:46]
    ↓  (builds Storyboard via storyboard.generate_storyboard)
    ↓
renderer.render_all_scenes(storyboard, image_model, output_dir, ...)          [engine.py:113 → renderer.py:640]
    ↓  (resolves model_id via resolve_model_id, picks chain_instruction table,
    ↓   manages previous_image_path across scenes)
    ↓
renderer.render_scene(image_prompt, model_id, output_path, aspect_ratio,      [renderer.py:691 → renderer.py:453]
                      reference_image_path, chain_instruction,
                      word, palette, use_color_palette) -> RenderResult
    │
    ├── if model_id.startswith("wan/"):
    │       wan_provider._upload_for_chaining(local_png_path, api_key)        [optional]
    │       wan_provider.render_scene_wan(dict, model_id, output_path, ...)
    │       on failure → rewrite model_id → fall through to Gemini
    │
    └── Gemini inline branch:
            _call_gemini_with_retries(client, model_id, parts, ...)           [renderer.py:586]
            _extract_image_data(response)
            [on None] _soften_prompt + retry
            [on None] _generate_fallback_image(word, palette, output_path)
            write PNG, return RenderResult
```

## Appendix B — Files read

- `cloud_engines/image_engine/renderer.py` — 854 lines, read in full
- `cloud_engines/image_engine/wan_provider.py` — 338 lines, read in full
- `cloud_engines/image_engine/config.py` — 32 lines, read in full
- `cloud_engines/image_engine/models.py` — 576 lines, read in full
- `cloud_engines/image_engine/engine.py` — 336 lines, read in full
- `cloud_engines/image_engine/prompt_compiler.py` — 152 lines, read in full

Directory listing confirmed no `gemini_provider.py`, no other `*_provider.py` module. The Gemini implementation is inline in renderer.py, not a separate module.
