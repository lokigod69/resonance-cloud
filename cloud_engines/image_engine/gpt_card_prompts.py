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
    "environmental_typography",
    "chat_ui",
    "social_overlay",
    "speech_bubble",
    "thought_bubble",
    "infographic_text",
}
STYLE_OPENINGS = {
    "realistic": "Photorealistic 16:9 vocabulary memory image.",
    "photorealistic": "Photorealistic 16:9 vocabulary memory image.",
    "cinematic": "Cinematic film-still 16:9 vocabulary memory image.",
    "editorial": "Editorial magazine-style 16:9 vocabulary memory image.",
    "illustration": "High-end illustration 16:9 vocabulary memory image.",
    "anime": "Polished anime-style 16:9 vocabulary memory image.",
    "studio_ghibli_inspired": "Warm hand-painted fantasy-animation 16:9 vocabulary memory image.",
    "studio_ghibli": "Warm hand-painted fantasy-animation 16:9 vocabulary memory image.",
    "disney_animation_inspired": "Expressive family-animation 16:9 vocabulary memory image.",
    "disney_animation": "Expressive family-animation 16:9 vocabulary memory image.",
    "comic_book": "Dynamic comic-book 16:9 vocabulary memory illustration.",
    "pixel_art": "Retro pixel-art 16:9 vocabulary memory image.",
    "vintage_film": "Vintage analog-film 16:9 vocabulary memory image.",
    "oil_painting": "Oil painting 16:9 vocabulary memory image.",
    "surrealism": "Surrealist dreamlike 16:9 vocabulary memory image.",
    "surreal_dreamlike": "Surrealist dreamlike 16:9 vocabulary memory image.",
    "fantasy_art": "Mythic fantasy-art 16:9 vocabulary memory image.",
    "pen_and_ink": "Pen-and-ink 16:9 vocabulary memory illustration.",
    "sketch_monochrome": "Pen-and-ink 16:9 vocabulary memory illustration.",
    "charcoal_sketch": "Charcoal sketch 16:9 vocabulary memory image.",
    "claymation": "Claymation-style 16:9 vocabulary memory image.",
    "ukiyo_e": "Ukiyo-e-inspired 16:9 vocabulary memory image.",
    "chinese_ink_wash": "Chinese ink-wash 16:9 vocabulary memory image.",
    "art_deco": "Art Deco 16:9 vocabulary memory image.",
    "art_nouveau": "Art Nouveau 16:9 vocabulary memory image.",
    "rick_and_morty_style": "Rick-and-Morty-inspired animated 16:9 vocabulary memory image.",
    "south_park_style": "South-Park-inspired cutout-animation 16:9 vocabulary memory image.",
    "pixar_3d": "Pixar-like polished 3D animated 16:9 vocabulary memory image.",
    "random": "Photorealistic 16:9 vocabulary memory image.",
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


def _repair_bridge_after_target_removal(text: str) -> str:
    text = _clean(text)
    if not text:
        return text
    text = re.sub(r"\(\s*\)", "", text)
    text = re.sub(
        r"\blead into a clear scene of\s*([.;,]|$)",
        "lead into a clear scene of the meaning.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\bfocused on\s*([.;,]|$)",
        "focused on the meaning.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\btied to\s*([.;,]|$)",
        "tied to the meaning.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\bteaching\s*([.;,]|$)",
        "teaching the meaning.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r"\bof\s*([.;,]|$)",
        "of the meaning.",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"\s+([.;,])", r"\1", text)
    return _clean(text)


def _fallback_scene(translation: str) -> str:
    meaning = _clean(translation) or "the meaning"
    return f"a specific, concrete scene that makes {meaning} visually clear"


def _sentence_value(text: str) -> str:
    return _clean(text).rstrip(" .")


def _extra_lines(
    *,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
) -> str:
    lines = [_clean(line) for line in (image_bridge, style_directive, text_directive) if _clean(line)]
    return (" ".join(lines) + " ") if lines else ""


def _structured_layer2_scene(
    *,
    image_scene: Optional[str],
    mini_story_beats: Optional[list[Any]],
    split_panel_brief: Optional[dict[str, Any]],
    word_design_brief: Optional[dict[str, Any]],
    mnemonic_hook: Optional[dict[str, Any]],
) -> str:
    if isinstance(word_design_brief, dict) and word_design_brief:
        primary = _clean(word_design_brief.get("primary_subject"))
        material = _clean(word_design_brief.get("material_logic"))
        context = _clean(word_design_brief.get("background_context"))
        pieces = [
            "Word as design:",
        ]
        if primary:
            pieces.append(f"Subject: {primary}")
        if material:
            pieces.append(f"Material logic: {material}")
        pieces.append("The target word must be central to the composition, not a small label.")
        if context:
            pieces.append(f"Background context only: {context}")
        return " ".join(piece for piece in pieces if piece)

    if isinstance(mini_story_beats, list) and mini_story_beats:
        beats = [_clean(beat) for beat in mini_story_beats if _clean(beat)]
        while len(beats) < 3:
            beats.append("the meaning becomes visually clear")
        return _clean(
            "Mini story: three visible beats - "
            f"first, {beats[0]}; second, {beats[1]}; third, {beats[2]}."
        )

    if isinstance(split_panel_brief, dict) and split_panel_brief:
        left = _clean(split_panel_brief.get("left")) or "the hook or first state"
        right = _clean(split_panel_brief.get("right")) or "the meaning or second state"
        divider = _clean(split_panel_brief.get("divider")) or "soft visual transition"
        return (
            "Split-panel contrast: "
            f"left side shows {left}; right side shows {right}; use a {divider}."
        )

    if isinstance(mnemonic_hook, dict) and mnemonic_hook:
        visual = _clean(mnemonic_hook.get("visual_translation"))
        if visual:
            return f"One scene combines the mnemonic hook and meaning: {visual}"

    return _clean(image_scene)


def _layer2_opening(card_image_style: str, enabled: bool) -> str | None:
    if not enabled:
        return None
    normalized = _clean(card_image_style).lower()
    return STYLE_OPENINGS.get(
        normalized,
        f"{_clean(card_image_style) or 'Visual'} 16:9 vocabulary memory image.",
    )


def _assemble_balanced_prompt(
    translation: str,
    scene: str,
    *,
    image_bridge: Optional[str] = None,
    style_directive: Optional[str] = None,
    text_directive: Optional[str] = None,
    answer_sentence: str = ANSWER_HIDDEN_SENTENCE,
    opening_sentence: Optional[str] = None,
) -> str:
    meaning = _clean(translation) or "the meaning"
    scene = _clean(scene) or _fallback_scene(meaning)
    opening = _clean(opening_sentence)
    if opening:
        style_line = (_clean(style_directive) + " ") if _clean(style_directive) else ""
        extras = _extra_lines(
            image_bridge=image_bridge,
            text_directive=text_directive,
        )
        return (
            f"{opening} "
            f"{style_line}"
            f"Visual meaning: {meaning}. "
            f"Scene: {_sentence_value(scene)}. "
            f"{extras}"
            "Clear, memorable, specific, teachable; not poster, infographic, or stock-photo cliche. "
            f"{answer_sentence}"
        )
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
    opening_sentence: Optional[str] = None,
) -> str:
    meaning = _clean(translation) or "the meaning"
    opening = _clean(opening_sentence)
    if opening:
        style_line = (_clean(style_directive) + " ") if _clean(style_directive) else ""
        extras = _extra_lines(
            image_bridge=image_bridge,
            text_directive=text_directive,
        )
        return (
            f"{opening} "
            f"{style_line}"
            f"Meaning: {meaning}. "
            f"{extras}"
            "One focused, memorable moment with concrete action, emotion, contrast, or a subtle hook. "
            f"{answer_sentence}"
        )
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
    opening_sentence: Optional[str] = None,
) -> str:
    meaning = _clean(translation) or "the meaning"
    scene = _clean(scene) or _fallback_scene(meaning)
    opening = _clean(opening_sentence)
    if opening:
        style_line = (_clean(style_directive) + " ") if _clean(style_directive) else ""
        extras = _extra_lines(
            image_bridge=image_bridge,
            text_directive=text_directive,
        )
        return (
            f"{opening} "
            f"{style_line}"
            f"Visual meaning: {meaning}. "
            f"Scene: {_sentence_value(scene)}. "
            f"{extras}"
            "One clear film-still moment with light, depth, composition, and a strong visual hook; no poster or infographic look. "
            f"{answer_sentence}"
        )
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
    opening_sentence: Optional[str] = None,
) -> str:
    if profile == RendererProfile.SIMPLE_VISUAL:
        return _assemble_simple_prompt(
            translation,
            image_bridge=image_bridge,
            style_directive=style_directive,
            text_directive=text_directive,
            answer_sentence=answer_sentence,
            opening_sentence=opening_sentence,
        )
    if profile == RendererProfile.CINEMATIC_MEMORY:
        return _assemble_cinematic_prompt(
            translation,
            scene,
            image_bridge=image_bridge,
            style_directive=style_directive,
            text_directive=text_directive,
            answer_sentence=answer_sentence,
            opening_sentence=opening_sentence,
        )
    return _assemble_balanced_prompt(
        translation,
        scene,
        image_bridge=image_bridge,
        style_directive=style_directive,
        text_directive=text_directive,
        answer_sentence=answer_sentence,
        opening_sentence=opening_sentence,
    )


def _assemble_layer2_compact_prompt(
    profile: RendererProfile,
    translation: str,
    scene: str,
    *,
    image_bridge: Optional[str],
    style_directive: Optional[str],
    text_directive: Optional[str],
    answer_sentence: str,
    opening_sentence: str,
) -> str:
    meaning = _clean(translation) or "the meaning"
    opening = _clean(opening_sentence)
    style_line = (_clean(style_directive) + " ") if _clean(style_directive) else ""
    extras = _extra_lines(
        image_bridge=image_bridge,
        text_directive=text_directive,
    )
    if profile == RendererProfile.SIMPLE_VISUAL:
        return (
            f"{opening} "
            f"{style_line}"
            f"Meaning: {meaning}. "
            f"{extras}"
            f"{answer_sentence}"
        )
    return (
        f"{opening} "
        f"{style_line}"
        f"Meaning: {meaning}. "
        f"Scene: {_sentence_value(_clean(scene) or _fallback_scene(meaning))}. "
        f"{extras}"
        f"{answer_sentence}"
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
    layer2_planning_version: Optional[str] = None,
    mini_story_beats: Optional[list[Any]] = None,
    split_panel_brief: Optional[dict[str, Any]] = None,
    word_design_brief: Optional[dict[str, Any]] = None,
    word_design_mode: Optional[str] = None,
    mnemonic_hook: Optional[dict[str, Any]] = None,
    hook_type: Optional[str] = None,
    hook_quality: Optional[str] = None,
    fallback_reason: Optional[str] = None,
    **_metadata: Any,
) -> str:
    """Compile the unified visual plan to a short GPT Image-2 provider prompt.

    The compiler is intentionally not the art director. It only chooses the
    render scene, removes accidental target-word leakage, trims, and formats.
    """
    has_structured_layer2 = bool(
        layer2_planning_version
        or mini_story_beats
        or split_panel_brief
        or word_design_brief
        or mnemonic_hook
    )
    del language, pos, mnemonic, mnemonic_confidence, dominant_emotional_reading
    del composition_hint, treatment_hint
    del layer2_planning_version, word_design_mode, hook_type, hook_quality, fallback_reason

    translation_text = _clean(translation)
    structured_scene = _structured_layer2_scene(
        image_scene=image_scene,
        mini_story_beats=mini_story_beats,
        split_panel_brief=split_panel_brief,
        word_design_brief=word_design_brief,
        mnemonic_hook=mnemonic_hook,
    )
    scene_text = _clean(structured_scene)
    bridge_text = _clean(image_bridge)
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
    opening_sentence = _layer2_opening(
        card_image_style,
        bool(
            _clean(image_bridge)
            or _clean(style_directive)
            or _clean(text_directive)
            or has_structured_layer2
        ),
    )
    prompt = _assemble_prompt(
        profile,
        translation_text,
        scene_text,
        image_bridge=bridge_text,
        style_directive=style_directive,
        text_directive=text_directive,
        answer_sentence=answer_sentence,
        opening_sentence=opening_sentence,
    )
    if len(prompt) <= PROMPT_HARD_CAP:
        return prompt

    if opening_sentence:
        compact_prompt = _assemble_layer2_compact_prompt(
            profile,
            translation_text,
            scene_text,
            image_bridge=bridge_text,
            style_directive=style_directive,
            text_directive=text_directive,
            answer_sentence=answer_sentence,
            opening_sentence=opening_sentence,
        )
        if len(compact_prompt) <= PROMPT_HARD_CAP:
            return compact_prompt

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
            opening_sentence=opening_sentence,
        )
    ) - 1
    scene_budget = max(20, PROMPT_HARD_CAP - fixed_overhead)
    trimmed_prompt = _assemble_prompt(
        profile,
        translation_text,
        _sentence_trim(scene_text, scene_budget),
        image_bridge=bridge_text,
        style_directive=style_directive,
        text_directive=text_directive,
        answer_sentence=answer_sentence,
        opening_sentence=opening_sentence,
    )
    if len(trimmed_prompt) <= PROMPT_HARD_CAP:
        return trimmed_prompt
    if opening_sentence:
        compact_prompt = _assemble_layer2_compact_prompt(
            profile,
            translation_text,
            _sentence_trim(scene_text, scene_budget),
            image_bridge=bridge_text,
            style_directive=style_directive,
            text_directive=text_directive,
            answer_sentence=answer_sentence,
            opening_sentence=opening_sentence,
        )
        if len(compact_prompt) <= PROMPT_HARD_CAP:
            return compact_prompt
    return trimmed_prompt[:PROMPT_HARD_CAP].rsplit(" ", 1)[0].rstrip(" ,;:.") + "."


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
    layer2_planning_version: Optional[str] = None,
    mini_story_beats: Optional[list[str]] = None,
    split_panel_brief: Optional[dict[str, Any]] = None,
    word_design_brief: Optional[dict[str, Any]] = None,
    word_design_mode: Optional[str] = None,
    mnemonic_hook: Optional[dict[str, Any]] = None,
    hook_type: Optional[str] = None,
    hook_quality: Optional[str] = None,
    fallback_reason: Optional[str] = None,
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
    if layer2_planning_version:
        metadata["layer2_planning_version"] = _clean(layer2_planning_version)
    if mini_story_beats:
        metadata["mini_story_beats"] = mini_story_beats
    if split_panel_brief:
        metadata["split_panel_brief"] = split_panel_brief
    if word_design_brief:
        metadata["word_design_brief"] = word_design_brief
    if word_design_mode:
        metadata["word_design_mode"] = _clean(word_design_mode)
    if mnemonic_hook:
        metadata["mnemonic_hook"] = mnemonic_hook
    if hook_type:
        metadata["hook_type"] = _clean(hook_type)
    if hook_quality:
        metadata["hook_quality"] = _clean(hook_quality)
    if fallback_reason:
        metadata["fallback_reason"] = _clean(fallback_reason)
    return metadata
