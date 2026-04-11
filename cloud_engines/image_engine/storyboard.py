"""Step A: LLM storyboard generation via OpenRouter.

Per ENGINE_IMAGE.md Section 3: One LLM call per generation.
System prompt + user prompt → JSON storyboard.
"""

from __future__ import annotations

import json
import logging
import re
import time
from typing import Optional, Union

import httpx

from . import config
from .models import (
    CAMERA_MOTION_TYPES,
    CAMERA_SPEEDS,
    CANONICAL_MODES,
    ImageContent,
    ImageContext,
    ImageSettings,
    Storyboard,
    StoryboardTextToVideo,
    StoryboardStepMeta,
    resolve_frame_narrative,
    resolve_image_count,
)
from .prompts import ART_STYLE_DESCRIPTIONS, build_system_prompt, build_user_prompt

logger = logging.getLogger(__name__)


def generate_storyboard(
    content: ImageContent,
    context: Optional[ImageContext],
    settings: ImageSettings,
) -> tuple[Union[Storyboard, StoryboardTextToVideo], StoryboardStepMeta, dict]:
    """Generate a storyboard via LLM.

    Builds the system prompt from settings, calls OpenRouter,
    parses the JSON response into a Storyboard model.

    Args:
        content: Word, translation, language, language_code.
        context: Optional visual_hint, lyrics, music_caption.
        settings: Resolved image settings.

    Returns:
        Tuple of (parsed Storyboard, step metadata, debug dict).
        Debug dict contains: system_prompt, user_prompt, raw_llm_response.

    Raises:
        ValueError: If API key is missing.
        ConnectionError: If OpenRouter is unreachable.
        RuntimeError: If LLM returns invalid/unparseable JSON.
    """
    start = time.monotonic()

    # Resolve image count
    scene_count, _source = resolve_image_count(settings)

    # Build prompts
    text_to_video = settings.skip_rendering
    system_prompt = build_system_prompt(
        word=content.word,
        translation=content.translation,
        language=content.language,
        settings=settings,
        context=context,
        scene_count=scene_count,
        aspect_ratio=settings.aspect_ratio,
        image_count_raw=settings.image_count,
        text_to_video=text_to_video,
    )
    is_auto_count = settings.image_count == "auto"
    user_prompt = build_user_prompt(
        word=content.word,
        translation=content.translation,
        language=content.language,
        scene_count=scene_count,
        is_auto_count=is_auto_count,
    )

    # Call OpenRouter
    api_key = config.OPENROUTER_API_KEY
    if not api_key:
        raise ValueError(
            "OpenRouter API key is required. Set OPENROUTER_API_KEY environment variable."
        )

    raw_response, usage = _call_openrouter(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=settings.llm_model,
        api_key=api_key,
    )

    # Parse JSON response (pass art_style for post-process style overwrite)
    storyboard = _parse_storyboard_json(
        raw_response, text_to_video=text_to_video, art_style=settings.art_style,
    )

    # Post-parse: resolve frame_narrative based on settings
    resolved_setting = resolve_frame_narrative(settings.frame_narrative)
    if resolved_setting == "auto":
        # LLM chose the mode — resolve any aliases from LLM output
        llm_choice = resolve_frame_narrative(storyboard.frame_narrative)
        if llm_choice not in CANONICAL_MODES:
            logger.warning(
                "LLM returned invalid frame_narrative '%s', falling back to 'collection'",
                storyboard.frame_narrative,
            )
            llm_choice = "collection"
        storyboard = storyboard.model_copy(update={"frame_narrative": llm_choice})
    else:
        # User set a specific mode — override whatever the LLM echoed back
        storyboard = storyboard.model_copy(update={"frame_narrative": resolved_setting})

    elapsed = time.monotonic() - start

    meta = StoryboardStepMeta(
        llm_model=settings.llm_model,
        llm_provider="openrouter",
        prompt_tokens=usage.get("prompt_tokens"),
        completion_tokens=usage.get("completion_tokens"),
        duration_seconds=round(elapsed, 2),
    )

    debug = {
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "raw_llm_response": raw_response,
    }

    return storyboard, meta, debug


def _call_openrouter(
    system_prompt: str,
    user_prompt: str,
    model: str,
    api_key: str,
) -> tuple[str, dict]:
    """Call OpenRouter chat completions API.

    Args:
        system_prompt: The system message.
        user_prompt: The user message.
        model: OpenRouter model ID.
        api_key: API key.

    Returns:
        Tuple of (response content string, usage dict).

    Raises:
        ConnectionError: Network or connection issues.
        RuntimeError: API errors or empty responses.
    """
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": config.LLM_MAX_TOKENS,
        "response_format": {"type": "json_object"},
    }

    try:
        with httpx.Client(timeout=config.LLM_TIMEOUT) as client:
            resp = client.post(
                config.OPENROUTER_ENDPOINT,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
    except httpx.ConnectError as e:
        raise ConnectionError(f"Failed to connect to OpenRouter: {e}") from e
    except httpx.TimeoutException as e:
        raise ConnectionError(f"OpenRouter request timed out: {e}") from e

    if resp.status_code != 200:
        raise RuntimeError(
            f"OpenRouter API error (HTTP {resp.status_code}): {resp.text}"
        )

    data = resp.json()
    usage = data.get("usage", {})

    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError(f"OpenRouter returned no choices: {data}")

    content = choices[0].get("message", {}).get("content", "")
    if not content or not content.strip():
        raise RuntimeError("OpenRouter returned empty content")

    logger.info(
        "Storyboard LLM call completed (model=%s, tokens=%s)",
        model, usage,
    )
    return content.strip(), usage


_FUZZY_MODE_MAP: dict[str, str] = {
    "perspectives": "scale",
    "perspective": "scale",
    "angles": "scale",
    "scales": "scale",
    "actions": "action",
    "environments": "environment",
    "narratives": "narrative",
    "characters": "context",
    "character": "context",
    "series": "context",
    "contexts": "context",
    "collections": "collection",
}


def _sanitize_frame_narrative(value: str) -> str:
    """Fuzzy-match frame_narrative to a canonical mode, or fall back to 'collection'."""
    v = value.lower().strip()
    if v in CANONICAL_MODES or v == "auto":
        return v
    if v in _FUZZY_MODE_MAP:
        return _FUZZY_MODE_MAP[v]
    # Complete garbage — safest default (no chaining)
    logger.warning("Unrecognized frame_narrative '%s', falling back to 'collection'", value)
    return "collection"


def _sanitize_storyboard(
    data: dict, text_to_video: bool = False, art_style: str = "",
) -> dict:
    """Clean up LLM hallucinations before Pydantic validation.

    Args:
        data: Raw parsed JSON dict from the LLM.
        text_to_video: Whether this is a text-to-video storyboard.
        art_style: The user-selected art style token (e.g. 'gerhard_richter').
            When provided and found in ART_STYLE_DESCRIPTIONS, every scene's
            image_prompt.style is overwritten with the authoritative description
            to prevent hallucinated style strings from reaching the renderer.
    """
    # Sanitize frame_narrative
    if "frame_narrative" in data:
        data["frame_narrative"] = _sanitize_frame_narrative(data["frame_narrative"])

    # Lowercase creative_direction (Storyboard model has no validator)
    if "creative_direction" in data and isinstance(data["creative_direction"], str):
        data["creative_direction"] = data["creative_direction"].lower().strip()

    # Sanitize movie-specific top-level fields (optional, may not be present)
    _valid_strategies = ("single_movie", "multi_movie")
    strategy = data.get("movie_source_strategy")
    if strategy is not None and strategy not in _valid_strategies:
        data["movie_source_strategy"] = None

    _valid_transitions = ("all_cut", "morph_then_cut", "cut_then_morph", "all_morph")
    stm = data.get("suggested_transition_mode")
    if stm is not None and stm not in _valid_transitions:
        data["suggested_transition_mode"] = None
    # Force all_cut for text-to-video (no images for morph transitions)
    if text_to_video:
        data["suggested_transition_mode"] = "all_cut"

    mr = data.get("movies_referenced")
    if mr is not None and not isinstance(mr, list):
        data["movies_referenced"] = None

    # Sanitize music_caption: must be a string or None, truncate if excessive
    mc = data.get("music_caption")
    if mc is not None:
        if not isinstance(mc, str):
            data["music_caption"] = None
        elif len(mc) > 200:
            data["music_caption"] = mc[:200]

    # Sanitize mnemonic_text: must be a string or None, truncate if excessive
    mn = data.get("mnemonic_text")
    if mn is not None:
        if not isinstance(mn, str):
            data["mnemonic_text"] = None
        elif mn.strip():
            data["mnemonic_text"] = mn.strip()[:300]
        else:
            data["mnemonic_text"] = None

    scenes = data.get("scenes", [])
    for scene in scenes:
        cm = scene.get("camera_motion", {})
        if cm:
            if cm.get("type") not in CAMERA_MOTION_TYPES:
                cm["type"] = "static"
            if cm.get("speed") not in CAMERA_SPEEDS:
                cm["speed"] = "slow"
            if not cm.get("direction") or cm.get("direction") == "N/A":
                cm["direction"] = "neutral"
            if not cm.get("description") or cm.get("description") == "N/A":
                cm["description"] = "Subtle camera motion"

        ip = scene.get("image_prompt", {})
        if ip:
            colors = ip.get("colors", [])
            ip["colors"] = [c for c in colors if c and c != "N/A"] or ["neutral"]

            # ── Post-process art style overwrite (Option C) ──────────
            # Replace LLM-hallucinated style with authoritative description.
            # This is the safety net: even if the LLM paraphrased or
            # hallucinated the style (e.g. "photorealistic" for Richter),
            # the renderer will receive the controlled, accurate string.
            if art_style:
                authoritative = ART_STYLE_DESCRIPTIONS.get(art_style.lower())
                if authoritative:
                    ip["style"] = authoritative

            te = ip.get("text_element")
            if te and isinstance(te, dict):
                for key in ("text", "rendering", "placement"):
                    if te.get(key) == "N/A":
                        te[key] = ""

        # Sanitize transition_prompt: must be string or null
        tp = scene.get("transition_prompt")
        if tp is not None and not isinstance(tp, str):
            scene["transition_prompt"] = None
        elif isinstance(tp, str) and not tp.strip():
            scene["transition_prompt"] = None

        # Sanitize suggested_duration: clamp to 3–10 range
        sd = scene.get("suggested_duration")
        if sd is not None:
            try:
                sd = int(sd)
                scene["suggested_duration"] = max(3, min(10, sd))
            except (TypeError, ValueError):
                scene["suggested_duration"] = None

        # Sanitize movie_reference (optional nested object)
        movie_ref = scene.get("movie_reference")
        if movie_ref is not None:
            if not isinstance(movie_ref, dict) or "title" not in movie_ref:
                scene["movie_reference"] = None
            elif not isinstance(movie_ref.get("actors"), list):
                movie_ref["actors"] = []

        # Sanitize remix_element (optional nested object)
        remix = scene.get("remix_element")
        if remix is not None:
            if not isinstance(remix, dict) or "alteration_type" not in remix:
                scene["remix_element"] = None

    # Last scene's transition_prompt must always be null
    if scenes:
        scenes[-1]["transition_prompt"] = None

    return data


def _parse_storyboard_json(
    raw: str, text_to_video: bool = False, art_style: str = "",
) -> Union[Storyboard, StoryboardTextToVideo]:
    """Parse LLM response into a Storyboard model.

    Pre-cleans the response (strips markdown fences, fixes trailing commas),
    then parses as JSON and validates against the Storyboard schema.

    Args:
        raw: Raw LLM response string.
        text_to_video: If True, use StoryboardTextToVideo (relaxed scene schema).
        art_style: User-selected art style token, forwarded to _sanitize_storyboard
            for post-process style overwrite.

    Returns:
        Parsed Storyboard model (or StoryboardTextToVideo, which shares the interface).

    Raises:
        RuntimeError: If JSON is invalid even after repair.
    """
    # Pre-clean: strip markdown fences and trailing commas before first attempt
    cleaned = _repair_json(raw)

    model_cls = StoryboardTextToVideo if text_to_video else Storyboard

    # First attempt: parse pre-cleaned text
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


def _repair_json(raw: str) -> str:
    """Attempt to repair common JSON issues from LLM output.

    Handles:
    - Qwen-style <think>...</think> reasoning blocks
    - Markdown code fences (```json ... ```)
    - Trailing commas before } or ]
    - Non-ASCII characters between JSON structural elements (not inside strings)
    """
    text = raw.strip()

    # Strip Qwen-style <think>...</think> reasoning blocks (emitted before JSON output)
    text = re.sub(r'<think>.*?</think>', '', text, flags=re.DOTALL).strip()

    # Strip markdown code fences
    if text.startswith("```"):
        # Remove opening fence (with optional language tag)
        text = re.sub(r"^```(?:json)?\s*\n?", "", text)
        # Remove closing fence
        text = re.sub(r"\n?```\s*$", "", text)

    # Fix trailing commas: ,} or ,]
    text = re.sub(r",\s*([}\]])", r"\1", text)

    # Strip non-ASCII chars between JSON structural elements.
    # DeepSeek sometimes hallucinates Cyrillic/Unicode between fields.
    # We split into quoted vs unquoted segments to avoid corrupting string values.
    parts = re.split(r'("(?:[^"\\]|\\.)*")', text)
    for i, part in enumerate(parts):
        if i % 2 == 0:  # unquoted segment
            # Replace non-ASCII chars with spaces in structural regions
            parts[i] = re.sub(r'[^\x00-\x7F]+', ' ', part)
    text = ''.join(parts)

    return text.strip()
