"""Deterministic Layer 2 visual planning adapter.

This module reshapes the existing enrichment-time visual card plan only when
Layer 2 customization is present. It does not call an LLM; the normal
enrichment director remains the source for base facts and fallback scenes.
"""

from __future__ import annotations

import re
from typing import Any, Mapping


PLANNING_VERSION = "layer2_planning_v1"

_CONCRETE_WORDS = {
    "apple",
    "apples",
    "bird",
    "birds",
    "bread",
    "cage",
    "car",
    "door",
    "flower",
    "flowers",
    "forest",
    "house",
    "key",
    "rain",
    "river",
    "ship",
    "stone",
    "tree",
    "water",
    "wind",
}

_ABSTRACT_WORDS = {
    "freedom",
    "liberty",
    "prejudice",
    "pride",
    "remorse",
    "viral",
    "disease",
    "fragrance",
    "shipwreck",
}


def build_layer2_visual_plan(
    base_plan: dict[str, Any],
    *,
    card_layer2: Mapping[str, Any] | None,
    word: str,
    translation: str,
    bridge_mnemonic: str | None = None,
    mnemonic: str | None = None,
    etymology: str | None = None,
    pos: str | None = None,
) -> dict[str, Any]:
    """Return a Layer 2-shaped visual plan when customization is present."""

    if not isinstance(card_layer2, Mapping) or not card_layer2:
        return base_plan

    plan = dict(base_plan)
    meaning_strategy = _axis(card_layer2.get("meaning_strategy"), "clear_meaning")
    presentation_form = _axis(card_layer2.get("presentation_form"), "single_scene")
    meaning = _clean(translation) or _clean(word) or "the meaning"
    scene = _clean(plan.get("image_scene")) or _fallback_scene(meaning)
    hook = _mnemonic_hook(
        word=word,
        translation=translation,
        bridge_mnemonic=bridge_mnemonic,
        mnemonic=mnemonic or plan.get("mnemonic"),
        etymology=etymology or plan.get("etymology"),
        meaning_strategy=meaning_strategy,
    )

    notes: list[str] = []
    plan.update(
        {
            "layer2_planning_version": PLANNING_VERSION,
            "meaning_strategy": meaning_strategy,
            "presentation_form": presentation_form,
            "effective_planning_notes": notes,
        }
    )

    if meaning_strategy == "sound_mnemonic":
        plan["mnemonic_hook"] = hook
        plan["hook_type"] = hook["hook_type"]
        plan["hook_quality"] = hook["quality"]
        if hook.get("fallback_reason"):
            plan["fallback_reason"] = hook["fallback_reason"]

    if presentation_form == "mini_story":
        beats = _mini_story_beats(
            meaning=meaning,
            scene=scene,
            meaning_strategy=meaning_strategy,
            mnemonic_hook=hook,
        )
        plan["mini_story_beats"] = beats
        plan["image_scene"] = _mini_story_scene(beats)
        return plan

    if presentation_form == "split_panel":
        brief = _split_panel_brief(
            meaning=meaning,
            scene=scene,
            meaning_strategy=meaning_strategy,
            mnemonic_hook=hook,
        )
        plan["split_panel_brief"] = brief
        plan["image_scene"] = (
            "Split-panel contrast with a soft visual transition: "
            f"left side shows {brief['left']}; right side shows {brief['right']}."
        )
        return plan

    if presentation_form == "word_object_design":
        brief = _word_design_brief(
            word=word,
            translation=translation,
            scene=scene,
            pos=pos,
            mnemonic_hook=hook if meaning_strategy == "sound_mnemonic" else None,
        )
        plan["word_design_brief"] = brief
        plan["word_design_mode"] = brief["word_design_mode"]
        plan["text_embedding_mode"] = brief["word_design_mode"]
        plan["image_scene"] = _word_design_scene(brief)
        return plan

    if presentation_form == "infographic_card":
        plan["text_embedding_mode"] = "infographic_text"
        plan["image_scene"] = _infographic_scene(
            word=word,
            meaning=meaning,
            scene=scene,
            pos=pos,
            etymology=etymology or plan.get("etymology"),
            mnemonic_hook=hook,
        )
        return plan

    plan["image_scene"] = _single_scene(scene, meaning, meaning_strategy, hook)
    return plan


def _axis(value: Any, default: str) -> str:
    text = _clean(value).lower()
    return text or default


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _fallback_scene(meaning: str) -> str:
    return f"a concrete visual scene that makes {meaning} clear"


def _mnemonic_hook(
    *,
    word: str,
    translation: str,
    bridge_mnemonic: str | None,
    mnemonic: str | None,
    etymology: str | None,
    meaning_strategy: str,
) -> dict[str, str]:
    meaning = _clean(translation) or _clean(word) or "the meaning"
    word_l = _clean(word).lower()
    bridge = _clean(bridge_mnemonic)
    mnemonic_text = _clean(mnemonic)
    etymology_text = _clean(etymology)
    combined = " ".join(part for part in [bridge, mnemonic_text] if part).lower()

    if "disease" in word_l or "dis-ease" in combined or "not at ease" in combined:
        return {
            "hook_type": "wordplay_bridge",
            "hook_text": "dis-ease = not at ease",
            "visual_translation": "Show dis-ease as not at ease: a person visibly unable to relax, surrounded by discomfort.",
            "quality": "strong",
        }

    if "ebullient" in word_l or "bubble" in combined or "boil" in combined:
        return {
            "hook_type": "wordplay_bridge",
            "hook_text": "bubbling or boiling up",
            "visual_translation": "Show joy bubbling upward like boiling water.",
            "quality": "usable",
        }

    if "freedom" in word_l or word_l.startswith("free") or "free as a bird" in combined:
        return {
            "hook_type": "semantic_mnemonic",
            "hook_text": "free as a bird",
            "visual_translation": "Show release from confinement into open space, like a bird escaping a cage.",
            "quality": "usable",
        }

    if etymology_text and meaning_strategy == "sound_mnemonic":
        return {
            "hook_type": "etymology_bridge",
            "hook_text": etymology_text[:120],
            "visual_translation": f"Use the useful origin as a visual bridge into {meaning}.",
            "quality": "usable",
        }

    if bridge and re.search(r"\b(sounds? like|rhymes? with|pronounced like|homophone)\b", bridge, re.I):
        return {
            "hook_type": "phonetic_bridge",
            "hook_text": bridge[:120],
            "visual_translation": f"Show the sound-alike hook leading clearly into {meaning}.",
            "quality": "usable",
        }

    if bridge and meaning_strategy == "sound_mnemonic":
        return {
            "hook_type": "semantic_mnemonic",
            "hook_text": bridge[:120],
            "visual_translation": f"Use this memorable semantic hook to make {meaning} clear.",
            "quality": "usable",
        }

    if meaning_strategy == "sound_mnemonic":
        return {
            "hook_type": "fallback_clear_meaning",
            "hook_text": "",
            "visual_translation": f"Fall back to a clear visual scene for {meaning}.",
            "quality": "fallback",
            "fallback_reason": "no_phonetic_hook",
        }

    return {
        "hook_type": "semantic_mnemonic",
        "hook_text": "",
        "visual_translation": f"Show {meaning} clearly.",
        "quality": "usable",
    }


def _mini_story_beats(
    *,
    meaning: str,
    scene: str,
    meaning_strategy: str,
    mnemonic_hook: Mapping[str, str],
) -> list[str]:
    if meaning_strategy == "sound_mnemonic":
        return [
            f"mnemonic hook: {mnemonic_hook.get('visual_translation') or scene}",
            "connection: the hook visibly transforms into the meaning",
            f"meaning: a clear final beat showing {meaning}",
        ]
    if meaning.lower() == "freedom":
        return [
            "a person trapped behind bars",
            "the door opening",
            "the person stepping into a wide open landscape",
        ]
    if meaning_strategy == "absurd_hook":
        return [
            f"an elegant strange hook appears inside {scene}",
            "the hook escalates into a readable cause-and-effect moment",
            f"the final beat makes {meaning} obvious",
        ]
    return [
        f"the first visible state establishes {scene}",
        "the second visible state shows a clear change",
        f"the third visible state resolves into {meaning}",
    ]


def _mini_story_scene(beats: list[str]) -> str:
    first, second, third = (beats + ["", "", ""])[:3]
    return (
        "Three visible beats in one image: "
        f"first, {first}; second, {second}; third, {third}."
    )


def _split_panel_brief(
    *,
    meaning: str,
    scene: str,
    meaning_strategy: str,
    mnemonic_hook: Mapping[str, str],
) -> dict[str, str]:
    if meaning_strategy == "sound_mnemonic":
        left = mnemonic_hook.get("visual_translation") or "the mnemonic hook"
        right = f"the meaning, {meaning}, shown clearly"
    elif meaning.lower() == "freedom":
        left = "confinement, cage bars, or visible constraint"
        right = "open landscape, free movement, and release"
    else:
        left = f"the constrained or ordinary state from {scene}"
        right = f"the clarified meaning state: {meaning}"
    return {
        "left": _clean(left),
        "right": _clean(right),
        "divider": "soft visual transition",
    }


def _word_design_brief(
    *,
    word: str,
    translation: str,
    scene: str,
    pos: str | None,
    mnemonic_hook: Mapping[str, str] | None,
) -> dict[str, str]:
    visible_word = (_clean(word) or _clean(translation) or "WORD").upper()
    mode = _word_design_mode(word=word, translation=translation, pos=pos)
    if mode == "word_as_matter":
        material = f"Build the letters from physical material tied to {_clean(translation) or visible_word.lower()}."
    elif mode == "word_as_form":
        material = "Shape the scene architecture and major forms around the readable letters."
    else:
        material = "Form the letters from environmental elements such as light, shadows, paths, wind, or broken objects."
    if mnemonic_hook:
        context = mnemonic_hook.get("visual_translation") or scene
    else:
        context = scene
    return {
        "word_design_mode": mode,
        "primary_subject": f"The word {visible_word} is visibly readable as a large physical typographic object.",
        "material_logic": material,
        "background_context": _clean(context) or "simple meaning context",
    }


def _word_design_scene(brief: Mapping[str, str]) -> str:
    lines = ["Word as design:"]
    primary = _clean(brief.get("primary_subject"))
    material = _clean(brief.get("material_logic"))
    context = _clean(brief.get("background_context"))
    if primary:
        lines.append(f"Subject: {primary}")
    if material:
        lines.append(f"Material logic: {material}")
    if context:
        lines.append(f"Background context only: {context}")
    return "\n".join(lines)


def _word_design_mode(*, word: str, translation: str, pos: str | None) -> str:
    word_l = _clean(word).lower()
    translation_l = _clean(translation).lower()
    tokens = set(re.findall(r"[a-z]+", f"{word_l} {translation_l}"))
    if tokens & _CONCRETE_WORDS:
        return "word_as_matter"
    if tokens & _ABSTRACT_WORDS:
        return "environmental_typography"
    if _clean(pos).lower() in {"noun", "proper noun"} and tokens:
        return "word_as_matter"
    return "environmental_typography"


def _infographic_scene(
    *,
    word: str,
    meaning: str,
    scene: str,
    pos: str | None,
    etymology: str | None,
    mnemonic_hook: Mapping[str, str],
) -> str:
    facts = [
        f"meaning: {meaning}",
        f"grammar: {_clean(pos)}" if _clean(pos) else "",
        f"origin: {_clean(etymology)}" if _clean(etymology) else "",
        f"memory cue: {mnemonic_hook.get('visual_translation')}" if mnemonic_hook.get("visual_translation") else "",
    ]
    compact_facts = "; ".join(item for item in facts if item)
    return (
        f"Educational infographic card for {_clean(word) or 'the target word'}: "
        f"central visual anchor from {scene}; compact callouts for {compact_facts}."
    )


def _single_scene(
    scene: str,
    meaning: str,
    meaning_strategy: str,
    mnemonic_hook: Mapping[str, str],
) -> str:
    if meaning_strategy == "sound_mnemonic":
        if mnemonic_hook.get("hook_type") == "fallback_clear_meaning":
            return scene
        return (
            "One scene combines the mnemonic hook and meaning: "
            f"{mnemonic_hook.get('visual_translation') or scene}"
        )
    if meaning_strategy == "exaggerated_meaning":
        return f"One intensified scene: push body, action, or emotion in {scene} so {meaning} is unmistakable."
    if meaning_strategy == "absurd_hook":
        return f"One elegant strange memory hook inside a readable scene: {scene}"
    return scene
