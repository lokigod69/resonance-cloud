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


def _clean(value: object) -> str:
    """Normalize a value to a stripped string, removing trailing punctuation."""
    if not value:
        return ""
    s = " ".join(str(value).split())
    return s.rstrip(".;,")


def _add_section(parts: list[str], label: str, value: object) -> None:
    """Append a labeled section if the value is non-empty and meaningful."""
    cleaned = _clean(value)
    if cleaned and cleaned.lower() not in ("n/a", "none", "null", "auto"):
        parts.append(f"{label}: {cleaned}.")


def _trim_prompt(prompt: str, max_chars: int) -> str:
    """Hard-trim the prompt to max_chars, ending on a word boundary."""
    trimmed = prompt[:max_chars - 1].strip()
    last_space = trimmed.rfind(" ")
    if last_space > max_chars * 0.8:
        trimmed = trimmed[:last_space]
    return trimmed.rstrip(".;, ") + "."
