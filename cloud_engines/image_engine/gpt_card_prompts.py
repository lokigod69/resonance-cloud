"""GPT Image-2 Quick Generate V1 prompt compiler."""

from __future__ import annotations

import hashlib
import re
from enum import StrEnum
from typing import Any, Optional


PROMPT_VERSION = "quick_generate_v1"
PROMPT_HARD_CAP = 700
ANSWER_VISIBILITY = "hidden"
ANSWER_HIDDEN_SENTENCE = (
    "Do not write the target word or direct answer/translation inside the image."
)
TARGET_WORD_EMBEDDED_SENTENCE = (
    "You may render the target word as instructed, but never write the direct answer/translation inside the image."
)
LAYER2_TEXT_MODES = {
    "word_as_matter",
    "word_as_form",
    "chat_ui",
    "social_overlay",
    "speech_bubble",
    "thought_bubble",
}


class RendererProfile(StrEnum):
    SIMPLE_VISUAL = "simple_visual"
    BALANCED_TEACHING = "balanced_teaching"
    CINEMATIC_MEMORY = "cinematic_memory"


class RendererProfileSource(StrEnum):
    AUTO = "auto"
    USER_OVERRIDE = "user_override"


def resolve_renderer_profile(
    renderer_profile: Optional[str],
    renderer_profile_source: Optional[str],
) -> RendererProfile:
    source = _clean(renderer_profile_source) or RendererProfileSource.AUTO
    profile = _clean(renderer_profile)
    if source == RendererProfileSource.USER_OVERRIDE and profile:
        try:
            return RendererProfile(profile)
        except ValueError:
            return RendererProfile.BALANCED_TEACHING
    if profile:
        try:
            return RendererProfile(profile)
        except ValueError:
            pass
    return RendererProfile.BALANCED_TEACHING


def resolve_renderer_profile_source(value: Optional[str]) -> RendererProfileSource:
    try:
        return RendererProfileSource(_clean(value))
    except ValueError:
        return RendererProfileSource.AUTO


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _sentence_trim(text: str, max_chars: int) -> str:
    text = _clean(text)
    if len(text) <= max_chars:
        return text
    clipped = text[:max_chars].rstrip()
    sentence_break = max(clipped.rfind(". "), clipped.rfind("; "), clipped.rfind(", "))
    if sentence_break > max_chars * 0.45:
        clipped = clipped[:sentence_break]
    else:
        clipped = clipped.rsplit(" ", 1)[0]
    return clipped.rstrip(" ,;:.") + "."


def _remove_target_word(text: str, word: str, *, strip_terminal_punctuation: bool = True) -> str:
    text = _clean(text)
    word = _clean(word)
    if not text or not word:
        return text
    patterns = {word}
    ascii_word = (
        word.replace("á", "a")
        .replace("Á", "A")
        .replace("é", "e")
        .replace("É", "E")
        .replace("í", "i")
        .replace("Í", "I")
        .replace("ó", "o")
        .replace("Ó", "O")
        .replace("ú", "u")
        .replace("Ú", "U")
    )
    patterns.add(ascii_word)
    for pattern_text in sorted(patterns, key=len, reverse=True):
        if not pattern_text:
            continue
        text = re.sub(re.escape(pattern_text), "", text, flags=re.IGNORECASE)
    cleaned = _clean(text)
    if strip_terminal_punctuation:
        return cleaned.strip(" ,;:.")
    return cleaned


def _fallback_scene(translation: str) -> str:
    meaning = _clean(translation) or "the meaning"
    return f"a specific, concrete scene that makes {meaning} visually clear"


def _extra_lines(
    *,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
) -> str:
    lines = [_clean(line) for line in (image_bridge, style_directive, text_directive) if _clean(line)]
    return (" ".join(lines) + " ") if lines else ""


def _assemble_balanced_prompt(
    translation: str,
    scene: str,
    *,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
    answer_sentence: str = ANSWER_HIDDEN_SENTENCE,
) -> str:
    meaning = _clean(translation) or "the meaning"
    scene = _clean(scene) or _fallback_scene(meaning)
    extras = _extra_lines(
        image_bridge=image_bridge,
        style_directive=style_directive,
        text_directive=text_directive,
    )
    if extras:
        return (
            "Photorealistic 16:9 language-learning image. "
            f"Visual meaning: {meaning}. "
            f"Scene: {scene}. "
            f"{extras}"
            "Clear, memorable, specific, teachable; not poster, infographic, or stock-photo cliche. "
            f"{answer_sentence}"
        )
    return (
        "Photorealistic 16:9 image for a language-learning memory card. "
        f"Visual meaning to depict: {meaning}. "
        f"Scene: {scene}. "
        f"{extras}"
        "Make it clear, memorable, specific, clean, and visually teachable at first glance, "
        "without looking like a poster, infographic, or stock-photo cliche. "
        f"{answer_sentence}"
    )


def _assemble_simple_prompt(
    translation: str,
    *,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
    answer_sentence: str = (
        "Do not write the target word or the direct answer/translation inside the image."
    ),
) -> str:
    meaning = _clean(translation) or "the meaning"
    extras = _extra_lines(
        image_bridge=image_bridge,
        style_directive=style_directive,
        text_directive=text_directive,
    )
    if extras:
        return (
            "Photorealistic 16:9 language-learning image. "
            f"Meaning: {meaning}. "
            f"{extras}"
            "One focused, believable, memorable moment with concrete action, emotion, contrast, or a subtle hook. "
            f"{answer_sentence}"
        )
    return (
        "Photorealistic 16:9 image. "
        f"Depict this meaning clearly: {meaning}. "
        f"{extras}"
        "Create one memorable, specific, believable moment that makes the meaning understandable from the image alone. "
        "Prefer natural light, strong composition, concrete action, meaningful body language, distinctive props, "
        "environment, emotion, contrast, humor, or a subtle absurd visual hook when helpful. "
        "Keep it focused, elegant, and teachable rather than like a bland stock photo, poster, infographic, or literal flashcard. "
        f"{answer_sentence}"
    )


def _assemble_cinematic_prompt(
    translation: str,
    scene: str,
    *,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
    answer_sentence: str = ANSWER_HIDDEN_SENTENCE,
) -> str:
    meaning = _clean(translation) or "the meaning"
    scene = _clean(scene) or _fallback_scene(meaning)
    extras = _extra_lines(
        image_bridge=image_bridge,
        style_directive=style_directive,
        text_directive=text_directive,
    )
    if extras:
        return (
            "Photorealistic cinematic 16:9 language-learning image. "
            f"Visual meaning: {meaning}. "
            f"Scene: {scene}. "
            f"{extras}"
            "One clear film-still moment with light, depth, composition, and a strong visual hook; no poster or infographic look. "
            f"{answer_sentence}"
        )
    return (
        "Photorealistic cinematic 16:9 image for a language-learning memory card. "
        f"Visual meaning to depict: {meaning}. "
        f"Scene: {scene}. "
        f"{extras}"
        "Render one specific, memorable film-still moment with distinctive natural light, strong composition, "
        "meaningful foreground/background depth, environmental storytelling, and one clear visual hook. "
        "Keep the meaning immediately understandable without clutter, poster design, infographic layout, or stock-photo posing. "
        f"{answer_sentence}"
    )


def _assemble_prompt(
    profile: RendererProfile,
    translation: str,
    scene: str,
    *,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
    answer_sentence: str = ANSWER_HIDDEN_SENTENCE,
) -> str:
    if profile == RendererProfile.SIMPLE_VISUAL:
        return _assemble_simple_prompt(
            translation,
            image_bridge=image_bridge,
            style_directive=style_directive,
            text_directive=text_directive,
            answer_sentence=answer_sentence,
        )
    if profile == RendererProfile.CINEMATIC_MEMORY:
        return _assemble_cinematic_prompt(
            translation,
            scene,
            image_bridge=image_bridge,
            style_directive=style_directive,
            text_directive=text_directive,
            answer_sentence=answer_sentence,
        )
    return _assemble_balanced_prompt(
        translation,
        scene,
        image_bridge=image_bridge,
        style_directive=style_directive,
        text_directive=text_directive,
        answer_sentence=answer_sentence,
    )


def build_gpt_image_2_prompt(
    word: str,
    translation: str,
    language: str | None = None,
    pos: Optional[str] = None,
    image_scene: Optional[str] = None,
    mnemonic: Optional[str] = None,
    mnemonic_confidence: Optional[str] = None,
    dominant_emotional_reading: Optional[str] = None,
    composition_hint: Optional[str] = None,
    treatment_hint: Optional[str] = None,
    card_image_style: str = "Photorealistic",
    renderer_profile: Optional[str] = None,
    renderer_profile_source: Optional[str] = None,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
    allow_target_word_in_prompt: bool = False,
    **_metadata: Any,
) -> str:
    """Compile the unified visual plan to a short GPT Image-2 provider prompt.

    The compiler is intentionally not the art director. It only chooses the
    render scene, removes accidental target-word leakage, trims, and formats.
    """
    del language, pos, mnemonic, mnemonic_confidence, dominant_emotional_reading
    del composition_hint, treatment_hint, card_image_style

    translation_text = _clean(translation)
    scene_text = _remove_target_word(_clean(image_scene), word)
    bridge_text = _clean(image_bridge)
    if bridge_text and not allow_target_word_in_prompt:
        bridge_text = _remove_target_word(
            bridge_text,
            word,
            strip_terminal_punctuation=False,
        )
    if not scene_text:
        scene_text = _fallback_scene(translation_text)

    profile = resolve_renderer_profile(renderer_profile, renderer_profile_source)
    answer_sentence = (
        TARGET_WORD_EMBEDDED_SENTENCE
        if allow_target_word_in_prompt
        else ANSWER_HIDDEN_SENTENCE
    )
    if profile == RendererProfile.SIMPLE_VISUAL and not allow_target_word_in_prompt:
        answer_sentence = "Do not write the target word or the direct answer/translation inside the image."
    prompt = _assemble_prompt(
        profile,
        translation_text,
        scene_text,
        image_bridge=bridge_text,
        style_directive=style_directive,
        text_directive=text_directive,
        answer_sentence=answer_sentence,
    )
    if len(prompt) <= PROMPT_HARD_CAP:
        return prompt

    if profile == RendererProfile.SIMPLE_VISUAL:
        return prompt[:PROMPT_HARD_CAP].rsplit(" ", 1)[0].rstrip(" ,;:.") + "."

    fixed_overhead = len(
        _assemble_prompt(
            profile,
            translation_text,
            "x",
            image_bridge=bridge_text,
            style_directive=style_directive,
            text_directive=text_directive,
            answer_sentence=answer_sentence,
        )
    ) - 1
    scene_budget = max(20, PROMPT_HARD_CAP - fixed_overhead)
    return _assemble_prompt(
        profile,
        translation_text,
        _sentence_trim(scene_text, scene_budget),
        image_bridge=bridge_text,
        style_directive=style_directive,
        text_directive=text_directive,
        answer_sentence=answer_sentence,
    )


def build_gpt_image_2_card_metadata(
    *,
    final_provider_prompt: str,
    image_scene: Optional[str],
    mnemonic: Optional[str],
    mnemonic_confidence: Optional[str],
    composition: Optional[str],
    treatment: Optional[str],
    creative_mode: Optional[str],
    text_embedding_mode: Optional[str],
    renderer_profile: Optional[str] = None,
    renderer_profile_source: Optional[str] = None,
    etymology: Optional[str] = None,
    usage_example: Optional[dict[str, Any]] = None,
    single_image_teachable: Optional[bool] = None,
    dominant_emotional_reading: Optional[str] = None,
    register_note: Optional[str] = None,
    rationale_summary: Optional[str] = None,
    layer2_user_choices: Optional[dict[str, Any]] = None,
    layer2_resolved: Optional[dict[str, Any]] = None,
    layer2_snap_notes: Optional[list[str]] = None,
    image_bridge: Optional[str] = None,
) -> dict[str, Any]:
    """Metadata persisted for GPT Image-2 card display alignment."""
    scene = _clean(image_scene)
    confidence = _clean(mnemonic_confidence) or None
    displayed_mnemonic = _clean(mnemonic) if confidence else None
    text_mode = _clean(text_embedding_mode) or "none"

    metadata = {
        "prompt_version": PROMPT_VERSION,
        "renderer_profile": resolve_renderer_profile(
            renderer_profile, renderer_profile_source
        ).value,
        "renderer_profile_source": resolve_renderer_profile_source(
            renderer_profile_source
        ).value,
        "image_scene": scene,
        "card_scene_displayed": scene,
        "mnemonic": displayed_mnemonic,
        "displayed_mnemonic": displayed_mnemonic,
        "mnemonic_confidence": confidence,
        "etymology": _clean(etymology) or None,
        "usage_example": usage_example if isinstance(usage_example, dict) else None,
        "composition": _clean(composition) or "single",
        "treatment": _clean(treatment) or "literal",
        "creative_mode": _clean(creative_mode) or "clean_iconic",
        "text_embedding_mode": text_mode,
        "layer2_candidate_text_mode": text_mode in LAYER2_TEXT_MODES,
        "single_image_teachable": bool(single_image_teachable)
        if single_image_teachable is not None
        else None,
        "dominant_emotional_reading": _clean(dominant_emotional_reading),
        "register_note": _clean(register_note) or None,
        "rationale_summary": _clean(rationale_summary),
        "final_provider_prompt_sha256": hashlib.sha256(
            final_provider_prompt.encode("utf-8")
        ).hexdigest(),
        "answer_visibility": ANSWER_VISIBILITY,
    }
    if layer2_user_choices:
        metadata["layer2_user_choices"] = layer2_user_choices
    if layer2_resolved:
        metadata["layer2_resolved"] = layer2_resolved
        metadata["answer_visibility"] = _clean(layer2_resolved.get("answer_visibility")) or ANSWER_VISIBILITY
    if layer2_snap_notes is not None:
        metadata["layer2_snap_notes"] = layer2_snap_notes
    if image_bridge:
        metadata["image_bridge"] = _clean(image_bridge)
    return metadata
