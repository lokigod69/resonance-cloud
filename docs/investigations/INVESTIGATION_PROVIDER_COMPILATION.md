# Provider Compilation Investigation

**Scope:** Map per-provider prompt compilation across all four image providers (`wan_provider`, `kie_provider` Flux 2 Pro, `fal_provider` Z-Turbo) inside `orchestrator/cloud_engines/image_engine/`. Identify the origin of three suspect additions observed in a Wan scene-1 generation: the hardcoded `Avoid:` list, the chain/reference language emitted with no reference image, and the `Create a high-quality image of` preamble. Read-only investigation. No code changes.

**TL;DR:**
- All three suspect additions in the Wan compiled prompt come from a **single file** the router work did NOT modify: [prompt_compiler.py](orchestrator/cloud_engines/image_engine/prompt_compiler.py). That file was introduced in commit `c45dbd4` (2026-04-11, "feat: add cloud engine modules + direct dispatch mode") and has not been touched since. Verified via `git log -p -S` pickaxe on each string and via `git show 1914220^:.../prompt_compiler.py` (byte-identical to HEAD).
- The chain-on-scene-1 emission is **not a router regression**. Pre-router `render_all_scenes` already passed `chain_instruction` unconditionally to every scene including scene 1; the prompt_compiler emits `Reference context: …` whenever `chain_instruction` is truthy, regardless of whether a reference image actually exists for that scene. The only thing the router work changed in this area was generalising the per-provider chain-instruction lookup from "Wan vs everything-else" to "Wan / Flux / Z-Turbo / fallback".
- The router work IS responsible for the systemic spread: it added `kie_provider.py` (Flux) and `fal_provider.py` (Z-Turbo), each with its own *separate* compilation function. Flux uses raw `json.dumps(image_prompt)`. Z-Turbo uses an in-file `_compile_zturbo_prompt()` that does not call into prompt_compiler. So Wan is the **only** provider that emits the hardcoded `Avoid:` list, the `In the style of … : Create a high-quality image of …` preamble, the duplicated `Style:` line, and the `Reference context:` block.
- Empirically the project has only generated against Wan recently, so Flux and Z-Turbo compilation issues are unobserved. They have **different** issues (Flux dumps the entire raw JSON dict including `colors` and `text_element` regardless of `use_color_palette`; Z-Turbo prepends the chain instruction with a blank-line break before the structured prompt and silently drops the `Avoid` list and the `Style:` duplication).
- No upstream provider exposes a real `negative_prompt` API field. Wan, Flux 2 Pro (t2i and i2i), and Z-Image-Turbo are all "no negative prompt" endpoints per [INVESTIGATION_KIE_API_CONTRACT.md §5](orchestrator/INVESTIGATION_KIE_API_CONTRACT.md) and [INVESTIGATION_FAL_API_CONTRACT.md](orchestrator/INVESTIGATION_FAL_API_CONTRACT.md). The `Avoid:` list is, by construction, only ever a substring of the main `prompt` field.

---

## Git hygiene

Repo root for the orchestrator codebase is `D:/CODING/ResonanceTEST/orchestrator` (the parent `D:/CODING/ResonanceTEST` is **not** a git repo). Per project memory, the git-connected frontend lives under `orchestrator/frontend/`.

`git pull --rebase origin main` could **not** be run cleanly — the working tree is dirty (24 modified files in `frontend/src/...` and 6 untracked top-level investigation reports / theme files). Per the user instructions ("If dirty, do NOT stash; halt and report"), the pull was halted. The unstaged changes are all in `frontend/src/**`, none touch `orchestrator/cloud_engines/image_engine/**`, so they cannot affect this read-only investigation. Branch state:

- HEAD branch: `codex/unify-generation-loaders-player-ui`
- HEAD commit: `b37b323 Unify generation loaders and player UI`
- Diverged 5/1 from `origin/codex/unify-generation-loaders-player-ui`
- Both router commits referenced in the brief — `1914220 feat(image): swap enum + add Kie Flux 2 Pro and Fal Z-Turbo providers` and `504635d feat(image): add four-model image router providers` — are in history; pre-router parent `1914220^` resolves cleanly.

Modified files (none in `cloud_engines/`):
```
frontend/src/components/AudioPlayer.tsx
frontend/src/components/ProfileModal.tsx
frontend/src/components/RedeemCodeDialog.tsx
frontend/src/components/VolumeControl.tsx
frontend/src/components/dashboard/WordLibrary.tsx
frontend/src/components/layout/AppHeader.tsx
frontend/src/components/layout/AppLayout.tsx
frontend/src/components/layout/PolishGlassLayout.tsx
frontend/src/contexts/SkinContext.tsx
frontend/src/index.css
frontend/src/lib/playerStyles.ts
frontend/src/main.tsx
frontend/src/pages/DashboardPG.tsx
frontend/src/pages/DecksPG.tsx
frontend/src/pages/GenerateGO.tsx
frontend/src/pages/MusicPG.tsx
frontend/src/pages/Speak.tsx
frontend/src/themes/{deep-blue,glass-orb,midnight,rainy-day,red-wine,slate,warm-linen}.css
```

---

## Provider module enumeration

Glob of `orchestrator/cloud_engines/image_engine/*.py`:

| File | Purpose |
|------|---------|
| [`__init__.py`](orchestrator/cloud_engines/image_engine/__init__.py) | Re-exports `generate_images` |
| [`engine.py`](orchestrator/cloud_engines/image_engine/engine.py) | Engine entry point (storyboard + render orchestration) |
| [`storyboard.py`](orchestrator/cloud_engines/image_engine/storyboard.py) | Storyboard LLM call |
| [`prompts.py`](orchestrator/cloud_engines/image_engine/prompts.py) | Storyboard LLM prompt strings |
| [`models.py`](orchestrator/cloud_engines/image_engine/models.py) | Pydantic models — `ImagePromptData`, `Storyboard`, etc. |
| [`config.py`](orchestrator/cloud_engines/image_engine/config.py) | API keys, Gemini model IDs |
| [`renderer.py`](orchestrator/cloud_engines/image_engine/renderer.py) | Per-scene dispatch into provider, chain-instruction tables, Gemini path |
| [`prompt_compiler.py`](orchestrator/cloud_engines/image_engine/prompt_compiler.py) | **Wan-only** structured-JSON → text prompt compiler |
| [`kie_common.py`](orchestrator/cloud_engines/image_engine/kie_common.py) | Shared kie.ai transport (submit/poll/extract/download/upload/_err) |
| [`wan_provider.py`](orchestrator/cloud_engines/image_engine/wan_provider.py) | Wan 2.7 provider — calls `compile_scene_to_text` |
| [`kie_provider.py`](orchestrator/cloud_engines/image_engine/kie_provider.py) | Flux 2 Pro provider — uses `json.dumps(image_prompt)` |
| [`fal_provider.py`](orchestrator/cloud_engines/image_engine/fal_provider.py) | Z-Image-Turbo provider — uses in-file `_compile_zturbo_prompt()` |

Three distinct compilation strategies. One shared LLM-output schema. Zero shared compiler.

---

## Section 1 — Compilation function inventory

### 1a. wan_provider — uses shared `compile_scene_to_text`

**Compilation entry:** [prompt_compiler.py:24-127 `compile_scene_to_text(scene, chain_instruction=None, use_color_palette=False)`](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L24-L127)

**Signature:**
```python
def compile_scene_to_text(
    scene: dict,
    chain_instruction: Optional[str] = None,
    use_color_palette: bool = False,
) -> str:
```

**Called from:** [wan_provider.py:83-87](orchestrator/cloud_engines/image_engine/wan_provider.py#L83-L87)
```python
prompt_text = compile_scene_to_text(
    image_prompt,
    chain_instruction=chain_instruction,
    use_color_palette=use_color_palette,
)
```

**Every f-string / template inside `compile_scene_to_text`:**

| Line | Template / literal | Purpose |
|------|-------------------|---------|
| [60](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L60) | `f"Create a high-quality image of {subject}"` | Opening (subject branch) |
| [62](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L62) | `f" in {scene_desc}"` | Appended when scene present |
| [63](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L63) | `opening += "."` | Period |
| [65](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L65) | `f"In the style of {style_desc}: {opening}"` | **Style prefix #1 (full sentence wrap)** |
| [68](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L68) | `f"Create a high-quality image of {scene_desc}."` | Opening (scene-only branch, no subject) |
| [70](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L70) | `f"In the style of {style_desc}: {opening}"` | Same prefix on scene-only branch |
| [81](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L81) | `_add_section(parts, "Style", scene.get("style"))` | **Style label #2 (duplication)** |
| [84](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L84) | `f"Reference context: {chain_instruction}"` | **Reference-context block** |
| [87](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L87) | `_add_section(parts, "Composition", scene.get("composition"))` | Labeled section |
| [88](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L88) | `_add_section(parts, "Lighting", scene.get("lighting"))` | Labeled section |
| [89](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L89) | `_add_section(parts, "Mood", scene.get("mood"))` | Labeled section |
| [100](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L100) | `_add_section(parts, "Color palette", color_text)` | Gated by `use_color_palette` |
| [103](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L103) | `_add_section(parts, "Details", scene.get("details"))` | Catch-all |
| [112-116](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L112-L116) | `f'the text "{text_val}"' …` | Text-element block |
| [117](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L117) | `_add_section(parts, "Text visible in scene", text_desc)` | Text-element label |
| **[120](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L120)** | **`f"Avoid: {', '.join(DEFAULT_NEGATIVE)}."`** | **Hardcoded negative — always emitted** |
| [142](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L142) | `f"{label}: {cleaned}."` (inside `_add_section`) | Label format |

**Module-level constants the function references:**

[prompt_compiler.py:11-19](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L11-L19)
```python
DEFAULT_NEGATIVE = [
    "low quality",
    "blurry eyes",
    "bad hands",
    "extra fingers",
    "deformed anatomy",
    "duplicate subject",
    "cluttered frame",
]

MAX_PROMPT_CHARS = 1200  # Wan handles longer prompts than SD-based models
```

### 1b. kie_provider (Flux 2 Pro) — inline `json.dumps`

**No dedicated compiler function.** The "compilation" is one statement at [kie_provider.py:81-83](orchestrator/cloud_engines/image_engine/kie_provider.py#L81-L83):

```python
prompt_text = json.dumps(image_prompt, ensure_ascii=False)
if chain_instruction:
    prompt_text = f"{chain_instruction}\n\n{prompt_text}"
```

**Function signature** (the rendering wrapper, no compilation logic): [kie_provider.py:45-53](orchestrator/cloud_engines/image_engine/kie_provider.py#L45-L53)
```python
def render_scene_kie_flux(
    image_prompt: dict,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    chain_instruction: Optional[str] = None,
    input_urls: Optional[list[str]] = None,
    use_color_palette: bool = False,
) -> dict:
```

**Templates / module constants used in compilation:**

| Line | Template / literal | Purpose |
|------|-------------------|---------|
| [81](orchestrator/cloud_engines/image_engine/kie_provider.py#L81) | `json.dumps(image_prompt, ensure_ascii=False)` | Whole `ImagePromptData` dict serialised verbatim |
| [83](orchestrator/cloud_engines/image_engine/kie_provider.py#L83) | `f"{chain_instruction}\n\n{prompt_text}"` | Chain instruction prepended unconditionally if truthy |

No hardcoded negative list. No "Create a high-quality image of" preamble. No "In the style of" prefix. No "Style:" duplication. No "Reference context:" wrapping (the chain text is dumped as-is). The `use_color_palette` flag is **ignored** ([kie_provider.py:64](orchestrator/cloud_engines/image_engine/kie_provider.py#L64): `Ignored for Flux; kept for signature symmetry`) — colors are always present in the JSON dump because they are an `ImagePromptData` required field.

### 1c. fal_provider (Z-Turbo) — in-file `_compile_zturbo_prompt`

**Compilation entry:** [fal_provider.py:42-86 `_compile_zturbo_prompt(image_prompt)`](orchestrator/cloud_engines/image_engine/fal_provider.py#L42-L86)

**Signature:**
```python
def _compile_zturbo_prompt(image_prompt: dict) -> str:
```

**Called from:** [fal_provider.py:122-124](orchestrator/cloud_engines/image_engine/fal_provider.py#L122-L124)
```python
prompt_text = _compile_zturbo_prompt(image_prompt)
if chain_instruction:
    prompt_text = f"{chain_instruction}\n\n{prompt_text}"
```

**Every f-string / template inside `_compile_zturbo_prompt`:**

| Line | Template / literal | Purpose |
|------|-------------------|---------|
| [46-50](orchestrator/cloud_engines/image_engine/fal_provider.py#L46-L50) | `f'The text "{te.get("text","")}" is written as {te.get("rendering","")}, {te.get("placement","")}.'` | Text-element block |
| [54](orchestrator/cloud_engines/image_engine/fal_provider.py#L54) | `f"A {subject} in {scene}."` | Opening (subject + scene) |
| [56](orchestrator/cloud_engines/image_engine/fal_provider.py#L56) | `f"A {subject}."` | Opening (subject only) |
| [59](orchestrator/cloud_engines/image_engine/fal_provider.py#L59) | `f"Composition: {composition}."` | Labeled |
| [62](orchestrator/cloud_engines/image_engine/fal_provider.py#L62) | `f"Lighting: {lighting}."` | Labeled |
| [66](orchestrator/cloud_engines/image_engine/fal_provider.py#L66) | `f"Style: {style}. Mood: {mood}."` | **Single Style emission** — no preamble duplication |
| [68](orchestrator/cloud_engines/image_engine/fal_provider.py#L68) | `f"Style: {style}."` | Same |
| [70](orchestrator/cloud_engines/image_engine/fal_provider.py#L70) | `f"Mood: {mood}."` | Same |
| [73-75](orchestrator/cloud_engines/image_engine/fal_provider.py#L73-L75) | `f'Color palette: {", ".join(str(c) for c in colors)}.'` | **Always emitted if colors present — no `use_color_palette` gate** |
| [78](orchestrator/cloud_engines/image_engine/fal_provider.py#L78) | `f"Details: {details}."` | Labeled |

**Module-level constants:** [fal_provider.py:34-39](orchestrator/cloud_engines/image_engine/fal_provider.py#L34-L39)
```python
ZTURBO_T2I_MODEL = "fal-ai/z-image/turbo"
ZTURBO_I2I_MODEL = "fal-ai/z-image/turbo/image-to-image"

FAL_HTTP_TIMEOUT = 60.0
TARGET_WIDTH = 1920
TARGET_HEIGHT = 1080
```

No `DEFAULT_NEGATIVE` import. No "Create a high-quality image of" preamble. No "In the style of" prefix. No `Avoid:` line. No "Reference context:" wrapper around chain instructions (chain is dumped raw with two newlines). No `use_color_palette` honoring (function signature accepts it but never references it; [fal_provider.py:116](orchestrator/cloud_engines/image_engine/fal_provider.py#L116) is the only place it appears, in the wrapper signature).

---

## Section 2 — Verbatim flow for scene_1 text-to-image (no reference image)

### 2a. wan_provider

When `render_all_scenes` runs Wan, [renderer.py:996-998](orchestrator/cloud_engines/image_engine/renderer.py#L996-L998) sets `chain_instruction` once for the whole loop:
```python
if model_id.startswith("wan/"):
    chain_instruction = CHAIN_INSTRUCTIONS_WAN.get(
        resolved_mode, _FALLBACK_CHAIN_INSTRUCTION_WAN
    )
```
That chain instruction is then passed to **every** scene at [renderer.py:1029-1041](orchestrator/cloud_engines/image_engine/renderer.py#L1029-L1041), including scene 1. The reference *image* is gated separately via `effective_reference = previous_image_path if use_chaining else None` ([renderer.py:1022](orchestrator/cloud_engines/image_engine/renderer.py#L1022)) — and on scene 1 `previous_image_path` is `None`, so no image goes upstream — but the `chain_instruction` string is still passed.

Inside `compile_scene_to_text`, the only condition guarding the reference block is the truthiness of `chain_instruction` itself ([prompt_compiler.py:83-84](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L83-L84)):
```python
if chain_instruction:
    parts.append(f"Reference context: {chain_instruction}")
```

So scene 1 — with no reference image, but with a non-`None` `chain_instruction` from the Wan table — receives the literal string.

#### Verbatim — opening prefix

[prompt_compiler.py:59-71](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L59-L71):
```python
if subject:
    opening = f"Create a high-quality image of {subject}"
    if scene_desc:
        opening += f" in {scene_desc}"
    opening += "."
    if style_desc:
        opening = f"In the style of {style_desc}: {opening}"
    parts.append(opening)
elif scene_desc:
    opening = f"Create a high-quality image of {scene_desc}."
    if style_desc:
        opening = f"In the style of {style_desc}: {opening}"
    parts.append(opening)
```

For a `noir` style scene where the LLM emitted `subject=man, scene=alley`, the opening becomes:
```
In the style of noir: Create a high-quality image of man in alley.
```

#### Verbatim — structural template

[prompt_compiler.py:81-103](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L81-L103):
```python
_add_section(parts, "Style", scene.get("style"))

if chain_instruction:
    parts.append(f"Reference context: {chain_instruction}")

# Labeled sections (scene-specific details come LAST for recency weight)
_add_section(parts, "Composition", scene.get("composition"))
_add_section(parts, "Lighting", scene.get("lighting"))
_add_section(parts, "Mood", scene.get("mood"))

# Colors as descriptive text (gated by use_color_palette setting)
if use_color_palette:
    colors = scene.get("colors")
    if colors:
        if isinstance(colors, list):
            color_text = ", ".join(c for c in colors if c and c.lower() not in ("n/a", "none"))
        else:
            color_text = str(colors)
        if color_text:
            _add_section(parts, "Color palette", color_text)

# Catch-all details field
_add_section(parts, "Details", scene.get("details"))
```

Order in the final string: `Opening` → `Style:` → `Reference context:` (if any) → `Composition:` → `Lighting:` → `Mood:` → `Color palette:` (gated) → `Details:` → text element (gated) → `Avoid:`.

#### Verbatim — reference-context block + conditional

[prompt_compiler.py:83-84](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L83-L84):
```python
if chain_instruction:
    parts.append(f"Reference context: {chain_instruction}")
```

Conditional is `if chain_instruction:` only. There is **no** "and reference image exists" check at this layer. The `chain_instruction` string for `narrative` mode (Wan flavour) is [renderer.py:174-179](orchestrator/cloud_engines/image_engine/renderer.py#L174-L179):
```python
"narrative": (
    "The reference image shows the previous moment in this story. "
    "Use it ONLY for subject identity — generate a fresh composition showing "
    "what happens NEXT as described below. DO NOT reproduce the reference "
    "layout, framing, or pose. Both subject and setting must evolve."
),
```

#### Verbatim — Avoid block + conditional

[prompt_compiler.py:119-120](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L119-L120):
```python
# Negative guidance
parts.append(f"Avoid: {', '.join(DEFAULT_NEGATIVE)}.")
```

**No conditional. Always emitted.** Renders as:
```
Avoid: low quality, blurry eyes, bad hands, extra fingers, deformed anatomy, duplicate subject, cluttered frame.
```

#### Three suspect-additions answers (Wan)

| Addition | Exists? | Conditional? | LLM override possible? |
|----------|---------|--------------|------------------------|
| `Avoid: …` list | **Yes** — literal: `Avoid: low quality, blurry eyes, bad hands, extra fingers, deformed anatomy, duplicate subject, cluttered frame.` | **Always emitted** ([prompt_compiler.py:120](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L120)). No gate. | **No.** `ImagePromptData` ([models.py:253-265](orchestrator/cloud_engines/image_engine/models.py#L253-L265)) has no `negative_prompt` or `avoid` field. The list is augmented onto whatever the LLM produced — never replaced. |
| `Reference context: …` chain block | **Yes** — for `narrative` mode the literal chain text is `The reference image shows the previous moment in this story. Use it ONLY for subject identity — generate a fresh composition showing what happens NEXT as described below. DO NOT reproduce the reference layout, framing, or pose. Both subject and setting must evolve.` | **Conditional on `chain_instruction` being truthy** ([prompt_compiler.py:83](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L83)). For all non-`collection` modes that string is **always non-empty** (table at [renderer.py:155-187](orchestrator/cloud_engines/image_engine/renderer.py#L155-L187) only returns `None` for `collection`). The chain instruction is resolved **once** before the per-scene loop and re-passed to every scene, including scene 1 ([renderer.py:996-998, 1032](orchestrator/cloud_engines/image_engine/renderer.py#L996-L998)). The fact that scene 1 has no reference image is not checked at the prompt_compiler boundary. | **No.** Storyboard schema has no field that opts a single scene out of the chain wording. |
| `Create a high-quality image of` preamble | **Yes** — literal: `Create a high-quality image of {subject}` (or `… of {scene_desc}.` if no subject). With `style_desc` set, prepended by `In the style of {style_desc}: `. | **Conditional on `subject` OR `scene_desc` being non-empty** ([prompt_compiler.py:59, 67](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L59-L71)) — i.e. always, in any storyboard scene. | **No.** No field controls preamble suppression. |

### 2b. kie_provider (Flux)

Compilation flow [kie_provider.py:81-83](orchestrator/cloud_engines/image_engine/kie_provider.py#L81-L83):
```python
prompt_text = json.dumps(image_prompt, ensure_ascii=False)
if chain_instruction:
    prompt_text = f"{chain_instruction}\n\n{prompt_text}"
```

For scene 1 with the same `narrative`-mode `chain_instruction` from [renderer.py:1000-1002](orchestrator/cloud_engines/image_engine/renderer.py#L1000-L1002) (which uses `CHAIN_INSTRUCTIONS_FLUX = dict(CHAIN_INSTRUCTIONS)` — i.e. the **Gemini-flavoured** strings, not the Wan-flavoured ones), the prompt becomes:

```
Using the provided reference image as the previous moment in the story, show what happens NEXT as described in the prompt. The subject should remain recognizable, but both subject and setting can evolve as the narrative demands.

{"subject":"...","scene":"...","style":"noir","lighting":"...","composition":"...","mood":"...","colors":["#…"],"details":"...","aspect_ratio":"16:9","text_element":null}
```

#### Three suspect-additions answers (Flux)

| Addition | Exists? | Conditional? | LLM override possible? |
|----------|---------|--------------|------------------------|
| `Avoid: …` list | **No.** Not emitted by Flux. | n/a | n/a |
| Chain/reference language | **Yes** — Gemini-flavoured chain text is prepended on every scene including scene 1 ([kie_provider.py:82-83](orchestrator/cloud_engines/image_engine/kie_provider.py#L82-L83)) for any non-`collection` mode. The text says *"Using the provided reference image as the previous moment in the story…"* even when no image is in `input_urls`. The `input_urls` gating happens upstream in [renderer.py:534-547](orchestrator/cloud_engines/image_engine/renderer.py#L534-L547) for the *image*, but the chain *string* is passed to `render_scene_kie_flux` regardless. | **Conditional on `chain_instruction` truthiness only** ([kie_provider.py:82](orchestrator/cloud_engines/image_engine/kie_provider.py#L82)). | **No** override field in storyboard schema. |
| `Create a high-quality image of` preamble | **No.** Flux receives the raw JSON dump. | n/a | n/a |

### 2c. fal_provider (Z-Turbo)

Compilation flow [fal_provider.py:122-124](orchestrator/cloud_engines/image_engine/fal_provider.py#L122-L124):
```python
prompt_text = _compile_zturbo_prompt(image_prompt)
if chain_instruction:
    prompt_text = f"{chain_instruction}\n\n{prompt_text}"
```

For scene 1 with same `narrative` mode (Z-Turbo uses `CHAIN_INSTRUCTIONS_ZTURBO = dict(CHAIN_INSTRUCTIONS)` — Gemini-flavoured), the prompt becomes:

```
Using the provided reference image as the previous moment in the story, show what happens NEXT as described in the prompt. The subject should remain recognizable, but both subject and setting can evolve as the narrative demands.

A {subject} in {scene}. Composition: {composition}. Lighting: {lighting}. Style: {style}. Mood: {mood}. Color palette: {c1}, {c2}, {c3}. Details: {details}.
```

#### Three suspect-additions answers (Z-Turbo)

| Addition | Exists? | Conditional? | LLM override possible? |
|----------|---------|--------------|------------------------|
| `Avoid: …` list | **No.** Not emitted by Z-Turbo. | n/a | n/a |
| Chain/reference language | **Yes** — same Gemini-flavoured chain text as Flux is prepended for every scene including scene 1 ([fal_provider.py:123-124](orchestrator/cloud_engines/image_engine/fal_provider.py#L123-L124)). | **Conditional on `chain_instruction` truthiness only**. | **No** override field. |
| `Create a high-quality image of` preamble | **No.** Z-Turbo opens with `f"A {subject} in {scene}."` ([fal_provider.py:54](orchestrator/cloud_engines/image_engine/fal_provider.py#L54)). | n/a | n/a |

---

## Section 3 — Reference-context emission gating

For each provider, identify where reference-context language is emitted and whether scene 1 (no reference image) ever sees it.

### 3a. wan_provider — bug confirmed

**Where chain text is emitted into the final prompt:** [prompt_compiler.py:83-84](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L83-L84)
```python
if chain_instruction:
    parts.append(f"Reference context: {chain_instruction}")
```

**Where chain text is selected and bound to the `chain_instruction` arg:** [renderer.py:996-998](orchestrator/cloud_engines/image_engine/renderer.py#L996-L998) (resolved once for the whole render, before the scene loop).

**Where the *reference image* is gated:** [renderer.py:716-725](orchestrator/cloud_engines/image_engine/renderer.py#L716-L725) (Wan branch in `render_scene`):
```python
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
```

That image-side gate works correctly: scene 1 has `reference_image_path = None` (because `previous_image_path` starts as `None` and is only set after a successful render — [renderer.py:991, 1046-1052](orchestrator/cloud_engines/image_engine/renderer.py#L991-L1052)), so `wan_input_urls` stays `None` and no `input_urls` field is added to the API payload at [wan_provider.py:107-108](orchestrator/cloud_engines/image_engine/wan_provider.py#L107-L108). **But the `chain_instruction` string is still passed verbatim to `render_scene_wan` at [renderer.py:758-766](orchestrator/cloud_engines/image_engine/renderer.py#L758-L766) and onward into `compile_scene_to_text`.**

**Confirmed bug.** Scene 1 receives the literal string:
> `Reference context: The reference image shows the previous moment in this story. Use it ONLY for subject identity — generate a fresh composition showing what happens NEXT as described below. DO NOT reproduce the reference layout, framing, or pose. Both subject and setting must evolve.`

The exact emission line is [prompt_compiler.py:84](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L84). The exact missing conditional that would prevent it: there is **no** `if reference_image_path` (or equivalent) guarding this emission. The `chain_instruction` parameter at the prompt_compiler layer has no awareness of whether the caller actually attached an image.

### 3b. kie_provider (Flux)

Same shape of bug. [kie_provider.py:82-83](orchestrator/cloud_engines/image_engine/kie_provider.py#L82-L83):
```python
if chain_instruction:
    prompt_text = f"{chain_instruction}\n\n{prompt_text}"
```

The reference *image* is gated at [renderer.py:534-547](orchestrator/cloud_engines/image_engine/renderer.py#L534-L547):
```python
flux_input_urls = None
if reference_image_path and reference_image_path.exists() and chain_instruction:
    api_key = os.environ.get("KIE_API_KEY", "")
    if api_key:
        ref_url = _upload_for_chaining(reference_image_path, api_key)
        if ref_url:
            flux_input_urls = [ref_url]
            model_id = "flux-2/pro-image-to-image"
            logger.info("Scene %d: Flux chaining via %s", scene_number, ref_url)
        else:
            logger.warning(
                "Scene %d: Flux upload failed, rendering without reference",
                scene_number,
            )
```

But the `chain_instruction` string is then unconditionally forwarded to `render_scene_kie_flux(..., chain_instruction=chain_instruction, ...)` at [renderer.py:579-587](orchestrator/cloud_engines/image_engine/renderer.py#L579-L587). Inside the provider, the chain text is prepended whenever truthy. **Scene 1 with no reference image will receive the literal Gemini-flavoured chain string.**

### 3c. fal_provider (Z-Turbo)

Same shape of bug. [fal_provider.py:123-124](orchestrator/cloud_engines/image_engine/fal_provider.py#L123-L124):
```python
if chain_instruction:
    prompt_text = f"{chain_instruction}\n\n{prompt_text}"
```

Reference image gating at [renderer.py:629-637](orchestrator/cloud_engines/image_engine/renderer.py#L629-L637):
```python
if reference_image_path and reference_image_path.exists() and chain_instruction:
    model_id = "fal-ai/z-image/turbo/image-to-image"
    fal_ref = reference_image_path
    logger.info(
        "Scene %d: Fal chaining via local %s",
        scene_number, fal_ref.name,
    )
else:
    fal_ref = None
```

Same forwarding pattern — `chain_instruction=chain_instruction` is passed to `render_scene_fal_zturbo` regardless of `fal_ref` ([renderer.py:666-674](orchestrator/cloud_engines/image_engine/renderer.py#L666-L674)). Inside the provider it is unconditionally prepended whenever truthy. **Same scene-1 bug.**

### Summary table

| Provider | Reference image attached on scene 1 | Reference *text* emitted on scene 1 | Bug? |
|----------|-------------------------------------|-------------------------------------|------|
| wan_provider | No (input_urls omitted from payload) | Yes — `Reference context: …` block | **Confirmed by user evidence** |
| kie_provider (Flux) | No (Flux uses t2i model, no input_urls) | Yes — chain text prepended verbatim | **Same shape, unobserved empirically** |
| fal_provider (Z-Turbo) | No (uses t2i model, no image_url) | Yes — chain text prepended verbatim | **Same shape, unobserved empirically** |

---

## Section 4 — `Avoid` / negative-prompt origin

### 4a. wan_provider

**Definition:** Module constant in [prompt_compiler.py:11-19](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L11-L19):
```python
DEFAULT_NEGATIVE = [
    "low quality",
    "blurry eyes",
    "bad hands",
    "extra fingers",
    "deformed anatomy",
    "duplicate subject",
    "cluttered frame",
]
```

**Emission:** [prompt_compiler.py:119-120](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L119-L120):
```python
# Negative guidance
parts.append(f"Avoid: {', '.join(DEFAULT_NEGATIVE)}.")
```
No conditional, no settings switch, no per-scene override. Always appended as the second-to-last (or last, if no `text_element`) part.

**Final concatenated string:**
```
Avoid: low quality, blurry eyes, bad hands, extra fingers, deformed anatomy, duplicate subject, cluttered frame.
```

**Real `negative_prompt` API field on Wan 2.7:** **No.** [INVESTIGATION_KIE_API_CONTRACT.md §4 schema table](orchestrator/INVESTIGATION_KIE_API_CONTRACT.md) and §5 feature matrix both list `Negative prompt | —` for Wan 2.7. The full Wan 2.7 input schema is `prompt`, `input_urls`, `aspect_ratio`, `enable_sequential`, `n`, `resolution`, `thinking_mode`, `color_palette`, `bbox_list`, `watermark`, `seed`, `nsfw_checker`. So the `Avoid:` clause is, structurally, just a substring of the main `prompt` field.

### 4b. kie_provider (Flux)

**Definition:** Not present. No `DEFAULT_NEGATIVE`, no `Avoid` clause anywhere in [kie_provider.py](orchestrator/cloud_engines/image_engine/kie_provider.py).

**Real `negative_prompt` API field on Flux 2 Pro:** **No.** [INVESTIGATION_KIE_API_CONTRACT.md:126](orchestrator/INVESTIGATION_KIE_API_CONTRACT.md#L126):
> Not in the schema (not documented): `negative_prompt`, `seed`, `steps`, `guidance` / `cfg` / `guidance_scale`, `width`, `height`, `num_images` / `n`, `style`, `strength`. Any of these will likely be ignored or trigger a 422.

And [INVESTIGATION_KIE_API_CONTRACT.md:146](orchestrator/INVESTIGATION_KIE_API_CONTRACT.md#L146): *"Quirk: no negative prompt field. Pack negation into the main prompt."*

### 4c. fal_provider (Z-Turbo)

**Definition:** Not present.

**Real `negative_prompt` API field on Z-Image-Turbo:** **No.**

Direct WebFetch on [https://fal.ai/models/fal-ai/z-image/turbo/api](https://fal.ai/models/fal-ai/z-image/turbo/api) confirmed: *"the API does not expose a negative_prompt parameter"*. Schema is `prompt`, `image_size`, `num_inference_steps`, `seed`, `sync_mode`, `num_images`, `enable_safety_checker`, `output_format`, `acceleration`, `enable_prompt_expansion`.

[INVESTIGATION_FAL_API_CONTRACT.md:118](orchestrator/INVESTIGATION_FAL_API_CONTRACT.md#L118) also confirms: *"`negative_prompt` — not exposed by Z-Turbo on Fal. Bake negations into `prompt`."*

### Provider-docs WebFetch results

| URL tried | Result |
|-----------|--------|
| `https://docs.kie.ai/wan-2-7-image` | 404 |
| `https://docs.kie.ai/wan-image-2-7` | 404 |
| `https://docs.kie.ai/wan-image/api-docs` | 404 |
| `https://docs.kie.ai/flux-2` | 404 |
| `https://docs.kie.ai/flux-2-pro` | 404 |
| `https://docs.kie.ai/` (root) | Could not enumerate model URLs |
| `https://kie.ai/market` | Could not enumerate URLs |
| `https://fal.ai/models/fal-ai/z-image/turbo/api` | **OK** — schema returned, no `negative_prompt` |

The kie.ai docs URLs given in the brief are not the canonical ones currently published; per the in-repo investigation report, the canonical paths under `docs.kie.ai/market/...` exist (e.g. `https://docs.kie.ai/market/wan/2-7-image`, `https://docs.kie.ai/market/flux2/pro-text-to-image`) but were not directly fetched because the in-repo audit ([INVESTIGATION_KIE_API_CONTRACT.md](orchestrator/INVESTIGATION_KIE_API_CONTRACT.md), dated 2026-04-23) already itemises every input field for all four kie.ai endpoints and explicitly states none expose `negative_prompt`. That report was authored from those same canonical pages and is the source of truth used here.

---

## Section 5 — Style duplication

### 5a. wan_provider

**Yes — duplication exists.**

**Emission #1 (full-sentence prefix):** [prompt_compiler.py:64-65, 69-70](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L64-L70)
```python
if style_desc:
    opening = f"In the style of {style_desc}: {opening}"
```

**Emission #2 (labeled-section repeat):** [prompt_compiler.py:81](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L81)
```python
_add_section(parts, "Style", scene.get("style"))
```

For `style="noir"`, the final prompt contains both:
- `In the style of noir: Create a high-quality image of …`
- `Style: noir.`

**Is it dead text?** Not strictly — the file's own block comment at [prompt_compiler.py:50-54](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L50-L54) describes the duplication as deliberate:
```
# Fold art style into subject so it anchors to the highest-attention slot
# in Wan's text encoder. The Style: line at position 2 below still repeats
# it for reinforcement. Style source is the LLM-expanded phrase from the
# storyboard (scene.image_prompt.style), not the raw settings token.
```
And again at [prompt_compiler.py:78-80](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L78-L80):
```
# Style goes immediately after the opening subject/scene line so the
# LLM-expanded art-style phrase (e.g. "Gerhard Richter photorealistic
# painting, soft focus blur...") lands in a high-attention slot for Wan.
```
So the duplication is documented as intentional reinforcement for Wan's cross-attention. Whether it is *desirable* (especially when the LLM emits a very long art-style description) is a product decision; mechanically it is not dead code.

### 5b. kie_provider (Flux)

**No duplication.** Flux dumps the entire `image_prompt` dict via `json.dumps`. The `style` key appears exactly once, as a JSON field. There is no "In the style of" preamble and no labeled "Style:" line.

### 5c. fal_provider (Z-Turbo)

**No duplication.** Style is emitted exactly once at [fal_provider.py:64-70](orchestrator/cloud_engines/image_engine/fal_provider.py#L64-L70):
```python
style = image_prompt.get("style", "")
mood = image_prompt.get("mood", "")
if style and mood:
    parts.append(f"Style: {style}. Mood: {mood}.")
elif style:
    parts.append(f"Style: {style}.")
elif mood:
    parts.append(f"Mood: {mood}.")
```

No "In the style of" preamble. No second `Style:` line.

---

## Section 6 — `Create a high-quality image of` preamble

### 6a. wan_provider

**Yes.** Two literal sites ([prompt_compiler.py:60](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L60) and [prompt_compiler.py:68](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L68)):
```python
opening = f"Create a high-quality image of {subject}"
```
and
```python
opening = f"Create a high-quality image of {scene_desc}."
```

### 6b. kie_provider (Flux) and 6c. fal_provider (Z-Turbo)

**No.** Neither provider's compilation contains the string `Create a high-quality image of`.

### Pickaxe — when introduced

```
$ git -C orchestrator log --all --oneline -S "Create a high-quality image of" -- cloud_engines/image_engine/
c45dbd4 feat: add cloud engine modules + direct dispatch mode
```

Single commit. **`c45dbd4`** — author lokigod69, date **2026-04-11 21:38:04 +0800**. This commit introduced the entire `prompt_compiler.py` file. The string has not been touched since (verified by re-running `git log --all -p -S "Create a high-quality image of"` — only one commit returned).

For comparison, the same commit also introduced the `Avoid:` line (pickaxe `git log -S "Avoid: "` and `git log -S "DEFAULT_NEGATIVE"` both return only `c45dbd4`) and the `In the style of` prefix (`git log -S "In the style of"` → only `c45dbd4`). All three "added" patterns landed simultaneously with the file.

---

## Section 7 — Pre-router baseline reconstruction

### 7a. `compile_scene_to_text` — pre-router (`1914220^` = `5703016`)

`git show 1914220^:cloud_engines/image_engine/prompt_compiler.py` is **byte-identical** to the current HEAD version. The compilation function did not change in either router commit. Quoted in full:

```python
"""Convert storyboard scene JSON (ImagePromptData) into natural language prompts.

Used by non-Gemini image providers (e.g. Wan 2.7) that expect text prompts rather
than structured JSON. The Gemini path continues to use json.dumps() of the raw dict.
"""

from __future__ import annotations

from typing import Optional

DEFAULT_NEGATIVE = [
    "low quality",
    "blurry eyes",
    "bad hands",
    "extra fingers",
    "deformed anatomy",
    "duplicate subject",
    "cluttered frame",
]

MAX_PROMPT_CHARS = 1200  # Wan handles longer prompts than SD-based models


def compile_scene_to_text(
    scene: dict,
    chain_instruction: Optional[str] = None,
    use_color_palette: bool = False,
) -> str:
    """Convert an ImagePromptData dict into a fluent natural language prompt.

    Expected scene keys (all optional except subject):
        subject, scene, style, lighting, composition, mood, colors,
        details, aspect_ratio, text_element

    Args:
        scene: ImagePromptData dict (from model_dump()).
        chain_instruction: Optional continuity text injected early in the prompt
            (after opening sentence, before scene-specific sections) so that
            composition/lighting/mood get recency weight in cross-attention.
        use_color_palette: When True, include the "Color palette: ..." section
            built from scene["colors"]. When False (default), omit it entirely.

    Returns:
        Prompt string suitable for Wan 2.7 or similar text-prompt models.
    """
    parts: list[str] = []

    # Primary sentence: subject + scene
    # Fold art style into subject so it anchors to the highest-attention slot
    # in Wan's text encoder. The Style: line at position 2 below still repeats
    # it for reinforcement. Style source is the LLM-expanded phrase from the
    # storyboard (scene.image_prompt.style), not the raw settings token.
    subject = _clean(scene.get("subject", ""))
    scene_desc = _clean(scene.get("scene", ""))
    style_desc = _clean(scene.get("style", ""))
    if style_desc.lower() in ("n/a", "none", "null", "auto"):
        style_desc = ""

    if subject:
        opening = f"Create a high-quality image of {subject}"
        if scene_desc:
            opening += f" in {scene_desc}"
        opening += "."
        if style_desc:
            opening = f"In the style of {style_desc}: {opening}"
        parts.append(opening)
    elif scene_desc:
        opening = f"Create a high-quality image of {scene_desc}."
        if style_desc:
            opening = f"In the style of {style_desc}: {opening}"
        parts.append(opening)

    # Chain instruction for visual continuity — injected EARLY so scene-specific
    # composition, lighting, mood, and details arrive AFTER and get recency bias
    # in Wan's cross-attention.  Label is "Reference context:" (not "Continuity:")
    # because "Continuity" semantically reinforces keeping the reference unchanged.
    # Style goes immediately after the opening subject/scene line so the
    # LLM-expanded art-style phrase (e.g. "Gerhard Richter photorealistic
    # painting, soft focus blur...") lands in a high-attention slot for Wan.
    # Source is scene.image_prompt.style, already expanded by the storyboard LLM.
    _add_section(parts, "Style", scene.get("style"))

    if chain_instruction:
        parts.append(f"Reference context: {chain_instruction}")

    # Labeled sections (scene-specific details come LAST for recency weight)
    _add_section(parts, "Composition", scene.get("composition"))
    _add_section(parts, "Lighting", scene.get("lighting"))
    _add_section(parts, "Mood", scene.get("mood"))

    # Colors as descriptive text (gated by use_color_palette setting)
    if use_color_palette:
        colors = scene.get("colors")
        if colors:
            if isinstance(colors, list):
                color_text = ", ".join(c for c in colors if c and c.lower() not in ("n/a", "none"))
            else:
                color_text = str(colors)
            if color_text:
                _add_section(parts, "Color palette", color_text)

    # Catch-all details field
    _add_section(parts, "Details", scene.get("details"))

    # Text element (word rendered in the image)
    text_el = scene.get("text_element")
    if text_el and isinstance(text_el, dict):
        text_val = text_el.get("text", "")
        if text_val:
            rendering = text_el.get("rendering", "")
            placement = text_el.get("placement", "")
            text_desc = f'the text "{text_val}"'
            if rendering:
                text_desc += f" rendered as {rendering}"
            if placement:
                text_desc += f", {placement}"
            _add_section(parts, "Text visible in scene", text_desc)

    # Negative guidance
    parts.append(f"Avoid: {', '.join(DEFAULT_NEGATIVE)}.")

    prompt = " ".join(parts)

    if len(prompt) > MAX_PROMPT_CHARS:
        prompt = _trim_prompt(prompt, MAX_PROMPT_CHARS)

    return prompt
```

The earliest commit to introduce this file is **`c45dbd4`** ("feat: add cloud engine modules + direct dispatch mode", 2026-04-11). Pickaxe of `c45dbd4:cloud_engines/image_engine/prompt_compiler.py` shows the same content. The file has not been modified between `c45dbd4` and current HEAD `b37b323`.

### 7b. `render_all_scenes` — pre-router (`1914220^` = `5703016`)

The chain-resolution logic before the router work was **only Wan vs everything-else**:

```python
# Resolve mode-specific chain instruction (Wan vs Gemini)
resolved_mode = resolve_frame_narrative(storyboard.frame_narrative)
if model_id.startswith("wan/"):
    chain_instruction = CHAIN_INSTRUCTIONS_WAN.get(
        resolved_mode, _FALLBACK_CHAIN_INSTRUCTION_WAN
    )
else:
    chain_instruction = CHAIN_INSTRUCTIONS.get(
        resolved_mode, _FALLBACK_CHAIN_INSTRUCTION
    )
use_chaining = chain_instruction is not None  # collection mode skips chaining
```

This is identical in structure to the current state ([renderer.py:993-1011](orchestrator/cloud_engines/image_engine/renderer.py#L993-L1011)) — the only change the router work made here was adding two more `elif` branches for `flux-2/` and `fal-ai/`. Critically, the same "resolve once → re-pass to every scene including scene 1" pattern was already present pre-router. The `chain_instruction` arg was passed unconditionally to scene 1 then too.

### 7c. Conclusion

The pre-router compilation function is **byte-identical** to the current one. Every observed Wan-side issue (`Avoid:` list, chain-on-t2i, style duplication, "Create" preamble, "In the style of" prefix, `Reference context:` block) was introduced wholesale by commit **`c45dbd4`** on **2026-04-11**, predating the router work by ~13 days. The router commits `1914220` (2026-04-24) and `504635d` (2026-04-24) did **not** modify `prompt_compiler.py` and did **not** introduce or alter any of the four suspect patterns in the Wan path.

What the router work *did* do that is relevant:
1. Hoisted the kie.ai transport helpers from `wan_provider.py` into [kie_common.py](orchestrator/cloud_engines/image_engine/kie_common.py).
2. Added two new providers ([kie_provider.py](orchestrator/cloud_engines/image_engine/kie_provider.py), [fal_provider.py](orchestrator/cloud_engines/image_engine/fal_provider.py)), each with **its own** compilation strategy that does not call into `prompt_compiler.py`.
3. Added two new chain-instruction tables ([renderer.py:201-205](orchestrator/cloud_engines/image_engine/renderer.py#L201-L205)) — `CHAIN_INSTRUCTIONS_FLUX = dict(CHAIN_INSTRUCTIONS)` and `CHAIN_INSTRUCTIONS_ZTURBO = dict(CHAIN_INSTRUCTIONS)`. Both copy the **Gemini-flavoured** wording, not the Wan-tuned wording. The "Using the provided reference image…" verbiage pre-existed in `CHAIN_INSTRUCTIONS` since `c45dbd4`.

---

## Section 8 — Cross-provider comparison

| Provider     | Has "Avoid" list | Has chain-on-t2i bug | Has style dup | Has "Create" preamble |
|--------------|------------------|----------------------|---------------|------------------------|
| wan_provider | **Yes** ([prompt_compiler.py:120](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L120)) | **Yes** — confirmed empirically; chain text emitted into prompt for scene 1 ([prompt_compiler.py:83-84](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L83-L84)) | **Yes** — `In the style of …:` prefix ([prompt_compiler.py:65, 70](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L65)) PLUS `Style: …` label ([prompt_compiler.py:81](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L81)) | **Yes** ([prompt_compiler.py:60, 68](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L60)) |
| kie_provider (Flux) | No | **Yes** — chain text prepended to JSON dump for scene 1 ([kie_provider.py:82-83](orchestrator/cloud_engines/image_engine/kie_provider.py#L82-L83)). Unobserved empirically. | No | No |
| fal_provider (Z-Turbo) | No | **Yes** — chain text prepended to compiled prompt for scene 1 ([fal_provider.py:123-124](orchestrator/cloud_engines/image_engine/fal_provider.py#L123-L124)). Unobserved empirically. | No | No |

Additional cross-provider notes:

| Concern | wan | kie (Flux) | fal (Z-Turbo) |
|---------|-----|------------|----------------|
| Honors `use_color_palette` | Yes ([prompt_compiler.py:92-100](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L92-L100)) | **No** — flag is ignored ([kie_provider.py:64](orchestrator/cloud_engines/image_engine/kie_provider.py#L64)); colors always present in JSON dump | **No** — flag is ignored ([fal_provider.py:71-75](orchestrator/cloud_engines/image_engine/fal_provider.py#L71-L75)); `Color palette: …` always emitted if `colors` non-empty |
| Honors `text_element` enable/disable | Yes ([prompt_compiler.py:106-117](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L106-L117)) | **Yes by side-effect** — caller sets `text_element=None` upstream ([renderer.py:1019-1020](orchestrator/cloud_engines/image_engine/renderer.py#L1019-L1020)) and Pydantic `model_dump(exclude_none=True)` then drops the key | **Yes by side-effect** — same upstream nullification + dump |
| Chain-text dialect | Wan-tuned ("The reference image shows…", `CHAIN_INSTRUCTIONS_WAN`) | Gemini-tuned ("Using the provided reference image…", `CHAIN_INSTRUCTIONS_FLUX = dict(CHAIN_INSTRUCTIONS)`) | Gemini-tuned (same `CHAIN_INSTRUCTIONS` clone) |
| Hard prompt-length cap | 1200 chars at `compile_scene_to_text` end ([prompt_compiler.py:124-125](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L124-L125)) | None (Flux upstream limit is 5000) | 950 chars at `_compile_zturbo_prompt` end ([fal_provider.py:80-86](orchestrator/cloud_engines/image_engine/fal_provider.py#L80-L86)). Z-Turbo upstream limit is 1000. |
| Newline before structured prompt when chain present | None (single space joiner) | `\n\n` ([kie_provider.py:83](orchestrator/cloud_engines/image_engine/kie_provider.py#L83)) | `\n\n` ([fal_provider.py:124](orchestrator/cloud_engines/image_engine/fal_provider.py#L124)) |
| Wraps chain in `Reference context:` label | Yes | No (raw chain text) | No (raw chain text) |
| Real upstream `negative_prompt` API field | No (per [INVESTIGATION_KIE_API_CONTRACT.md §4](orchestrator/INVESTIGATION_KIE_API_CONTRACT.md)) | No (per [INVESTIGATION_KIE_API_CONTRACT.md §1](orchestrator/INVESTIGATION_KIE_API_CONTRACT.md)) | No (per Fal docs WebFetch + [INVESTIGATION_FAL_API_CONTRACT.md:118](orchestrator/INVESTIGATION_FAL_API_CONTRACT.md#L118)) |

---

## Verdict

### Is the wan_provider compilation a regression introduced by the router work?

**No.** It is **inherited verbatim** from commit `c45dbd4` ("feat: add cloud engine modules + direct dispatch mode", 2026-04-11), which introduced [prompt_compiler.py](orchestrator/cloud_engines/image_engine/prompt_compiler.py) with all four observed patterns simultaneously. The router commits `1914220` and `504635d` on 2026-04-24 did not modify `prompt_compiler.py` and did not change the chain-instruction-passing pattern in `render_all_scenes`. `git show 1914220^:cloud_engines/image_engine/prompt_compiler.py` is byte-identical to current HEAD.

The user's empirical observation is real and the bug is real — but the router work is not where it landed; it has been latent for 13 days.

### For each issue — introducing commit and scope

| Issue | Introducing commit | Date | Provider scope |
|-------|-------------------|------|----------------|
| `Avoid: …` hardcoded list | `c45dbd4` | 2026-04-11 | **Wan-only.** Flux and Z-Turbo never emit it. |
| Chain text emitted on scene 1 (no reference image) | `c45dbd4` (the `if chain_instruction:` gate at [prompt_compiler.py:83](orchestrator/cloud_engines/image_engine/prompt_compiler.py#L83)). Provider-side chain-prepend in `kie_provider.py` and `fal_provider.py` was added by `1914220` and `504635d` and uses the same `if chain_instruction:` shape. | Wan: 2026-04-11. Flux/Z-Turbo: 2026-04-24. | **Systemic** across all three providers, with three different presentations: `Reference context: …` (Wan), raw chain text + `\n\n` + JSON dump (Flux), raw chain text + `\n\n` + structured prompt (Z-Turbo). |
| `In the style of …:` + `Style: …` duplication | `c45dbd4` | 2026-04-11 | **Wan-only.** Flux dumps style as a JSON field; Z-Turbo emits `Style:` once. |
| `Create a high-quality image of` preamble | `c45dbd4` | 2026-04-11 | **Wan-only.** Flux has no preamble; Z-Turbo opens with `A {subject} in {scene}.` |

### Are there compilation issues in kie_provider or fal_provider that we haven't yet observed empirically?

**Yes — three categories**, all introduced by the router commits `1914220` / `504635d`, none yet observed because all recent generations have hit Wan:

1. **Chain-on-t2i bug — same shape as Wan's, different surface text.** Both Flux and Z-Turbo prepend the **Gemini-flavoured** chain string ("Using the provided reference image as the previous moment in the story, show what happens NEXT…") to scene 1, where no reference image is attached. Source: `CHAIN_INSTRUCTIONS_FLUX = dict(CHAIN_INSTRUCTIONS)` and `CHAIN_INSTRUCTIONS_ZTURBO = dict(CHAIN_INSTRUCTIONS)` at [renderer.py:201-205](orchestrator/cloud_engines/image_engine/renderer.py#L201-L205). When generation switches to Flux or Z-Turbo as primary, scene 1 will land at the API with literal "Using the provided reference image…" prepended. The text is wrong (no image was provided) and tonally jarring (it talks about an image that doesn't exist).

2. **`use_color_palette` setting silently ignored on both Flux and Z-Turbo.** [kie_provider.py:64](orchestrator/cloud_engines/image_engine/kie_provider.py#L64) explicitly documents this: *"Ignored for Flux; kept for signature symmetry."* Z-Turbo never references the parameter. As a result, colors are emitted on every scene regardless of user setting — for Flux as a JSON field in the dump, for Z-Turbo as a `Color palette: …` line. Wan correctly gates the color palette on the user setting.

3. **`CHAIN_INSTRUCTIONS_FLUX` and `CHAIN_INSTRUCTIONS_ZTURBO` are unmodified Gemini clones.** [renderer.py:198-205](orchestrator/cloud_engines/image_engine/renderer.py#L198-L205) explicitly comments *"v1 = clones of the Gemini-flavoured table"* and refers to a "FU1" follow-up. The Wan table was rewritten ([renderer.py:155-187](orchestrator/cloud_engines/image_engine/renderer.py#L155-L187)) specifically because the Gemini wording ("SAME subject", "stays consistent") reinforced img2img dominance and caused Wan to reproduce the previous scene with only color shifts — see the explanatory comment at [renderer.py:148-154](orchestrator/cloud_engines/image_engine/renderer.py#L148-L154). The same risk applies to Flux i2i and Z-Turbo i2i; they currently inherit the Gemini wording without that tuning.

A fourth, smaller observation: Flux's `prompt_text` is a Python `dict` rendered by `json.dumps`, including JSON braces, quoted keys, escaped string values, and a numeric `aspect_ratio` value duplicating the API-level `aspect_ratio` field. Whether this is "good prompting" for Flux vs. natural-language compilation is an empirical question the project has not yet tested.
