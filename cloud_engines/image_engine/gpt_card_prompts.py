"""GPT Image-2 prompt composer for card-deck mode."""

from __future__ import annotations

import re
from typing import Optional


COMPOSITION_DIRECTIVES = {
    "single": "Use one clear scene.",
    "multi_panel": "Use a brief left-to-right sequence only if needed for the meaning.",
    "split": "Show two contrasted sides in one frame.",
    "embodied": "Use a first-person or over-the-shoulder view.",
}

TREATMENT_DIRECTIVES = {
    "literal": "Depict the meaning directly through recognizable action.",
    "absurd": "Include one unexpected visual motif.",
    "mnemonic": "Make the memory scene concrete and easy to recall.",
    "etymological": "Represent word roots through concrete objects.",
    "contrast": "Make the contrast visually clear.",
    "embodied": "Emphasize posture, gesture, and bodily sensation.",
}

NO_TEXT_RULE = (
    "No visible text, letters, captions, signage, UI labels, speech bubbles, "
    "readable handwriting, typography, logos, trademarks, or watermarks."
)
PROMPT_HARD_CAP = 1000

_ROMANCE_TERMS = (
    "romance",
    "romantic",
    "dating",
    "date",
    "flirt",
    "flirting",
    "dm",
    "d.m.",
    "direct message",
    "slow burn",
    "slide into",
    "crush",
    "relationship",
    "pickup",
    "pick-up",
    "tinder",
    "profile",
)

_MINOR_OR_SCHOOL_PATTERNS = (
    r"\bschoolyard\b",
    r"\bschool\b",
    r"\bclassroom\b",
    r"\bafter class\b",
    r"\bteenagers?\b",
    r"\bteens?\b",
    r"\bminors?\b",
    r"\bkids?\b",
    r"\bchildren\b",
    r"\byouth\b",
    r"\bunderage\b",
    r"\bhigh school\b",
    r"\bmiddle school\b",
    r"\bpass(?:ing)? notes?\b",
)

_INTIMATE_PATTERNS = (
    r"\bsexual(?:ly)?\b",
    r"\bintimate(?:ly| intimacy)?\b",
    r"\bseduce[sd]?\b",
    r"\bmake out\b",
    r"\bbedroom\b",
    r"\bundress(?:ed|ing)?\b",
)


def _clean(value: Optional[str]) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _is_romance_or_dating(*values: Optional[str]) -> bool:
    text = " ".join(_clean(value).lower() for value in values)
    return any(term in text for term in _ROMANCE_TERMS)


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


def _sanitize_mnemonic_scene(mnemonic: Optional[str], *, romance_or_dating: bool) -> str:
    scene = _clean(mnemonic)
    if not scene:
        return ""

    scene = re.sub(r"“[^”]{1,180}”|‘[^’]{1,180}’", "a private message without readable words", scene)
    scene = re.sub(
        r"(['\"“”‘’])(?:\\.|(?!\1).){1,180}\1",
        "a private message without readable words",
        scene,
    )
    replacements = [
        (r"\bDMs?\s+label\b", "private message area"),
        (r"\bD\.M\.s?\s+label\b", "private message area"),
        (r"\bDMs?\b", "private message area"),
        (r"\bsmartphone UI text\b", "non-readable phone interface"),
        (r"\bphone UI text\b", "non-readable phone interface"),
        (r"\bchat text\b", "non-readable phone interface"),
        (r"\bchat bubble\b", "quiet notification"),
        (r"\bspeech bubble\b", "silent facial expression"),
        (r"\bpickup-line quote\b", "hesitant opening gesture"),
        (r"\bpick-up line\b", "hesitant opening gesture"),
        (r"\bvisible message\b", "non-readable message"),
        (r"\breadable message\b", "non-readable message"),
        (r"\bmessage says\b[^.]*", "message is implied without readable words"),
        (r"\bsign says\b[^.]*", "sign shape is present without readable words"),
        (r"\blabel says\b[^.]*", "label shape is present without readable words"),
        (r"\bbillboard says\b[^.]*", "billboard shape is present without readable words"),
        (r"\bcard says\b[^.]*", "card shape is present without readable words"),
    ]
    for pattern, replacement in replacements:
        scene = re.sub(pattern, replacement, scene, flags=re.IGNORECASE)

    if romance_or_dating:
        for pattern in _MINOR_OR_SCHOOL_PATTERNS:
            scene = re.sub(pattern, "", scene, flags=re.IGNORECASE)
        for pattern in _INTIMATE_PATTERNS:
            scene = re.sub(pattern, "warm emotional distance", scene, flags=re.IGNORECASE)
        scene = re.sub(r"\bcrush(?:es)?\b", "hesitant attraction", scene, flags=re.IGNORECASE)

    return _clean(scene).strip(" ,;:.")


def _fallback_scene(word: str, translation: str, romance_or_dating: bool) -> str:
    if romance_or_dating:
        return (
            "two adults in a quiet public setting exchange a warm expression, "
            "with hesitant body language, a symbolic glow, and emotional distance"
        )
    meaning = translation or word
    return f"a clear real-world scene showing {meaning} through concrete action"


def _romance_scene(scene: str) -> str:
    base = (
        "two adults with warm expression and hesitant body language in a non-sexual "
        "public moment, supported by a symbolic glow"
    )
    if scene:
        base = f"{base}, {scene}"
    if "phone" in base.lower() or "message" in base.lower() or "private message" in base.lower():
        base = f"{base}, with a non-readable phone interface"
    return base


def _style_prefix(card_image_style: str) -> str:
    style = _clean(card_image_style).lower()
    if style == "editorial":
        return "Editorial 16:9 image."
    if style == "random":
        return "Cinematic 16:9 image."
    if style:
        return f"{_clean(card_image_style)} 16:9 image."
    return "Photorealistic 16:9 image."


def _within_budget(parts: list[str]) -> str:
    prompt = " ".join(part for part in parts if part)
    if len(prompt) <= PROMPT_HARD_CAP:
        return prompt

    fixed_len = len(" ".join(part for index, part in enumerate(parts) if index != 1 and part))
    scene_budget = max(120, PROMPT_HARD_CAP - fixed_len - 8)
    parts[1] = _sentence_trim(parts[1], scene_budget)
    prompt = " ".join(part for part in parts if part)
    if len(prompt) <= PROMPT_HARD_CAP:
        return prompt

    parts[3] = ""
    fixed_len = len(" ".join(part for index, part in enumerate(parts) if index != 1 and part))
    scene_budget = max(80, PROMPT_HARD_CAP - fixed_len - 8)
    parts[1] = _sentence_trim(parts[1], scene_budget)
    prompt = " ".join(part for part in parts if part)
    if len(prompt) <= PROMPT_HARD_CAP:
        return prompt

    overage = len(prompt) - PROMPT_HARD_CAP
    parts[1] = _sentence_trim(parts[1], max(60, len(parts[1]) - overage - 4))
    return " ".join(part for part in parts if part)[:PROMPT_HARD_CAP].rstrip()


def build_gpt_image_2_prompt(
    word: str,
    translation: str,
    language: str,
    pos: Optional[str],
    mnemonic: Optional[str],
    dominant_emotional_reading: Optional[str],
    composition_hint: Optional[str],
    treatment_hint: Optional[str],
    card_image_style: str,
) -> str:
    """Compose a short direct GPT Image-2 image description."""
    word_text = _clean(word)
    translation_text = _clean(translation)
    language_text = _clean(language) or "target language"
    pos_text = _clean(pos)
    emotional_text = _clean(dominant_emotional_reading)
    composition_key = _clean(composition_hint)
    treatment_key = _clean(treatment_hint)
    romance_or_dating = _is_romance_or_dating(
        word_text,
        translation_text,
        mnemonic,
        emotional_text,
    )

    scene = _sanitize_mnemonic_scene(mnemonic, romance_or_dating=romance_or_dating)
    if not scene:
        scene = _fallback_scene(word_text, translation_text, romance_or_dating)
    if romance_or_dating:
        scene = _romance_scene(scene)

    if romance_or_dating and composition_key == "multi_panel":
        composition_key = "single"

    word_kind = "phrase" if " " in word_text else "word"
    if pos_text:
        word_kind = pos_text

    if translation_text:
        meaning = (
            f'visualizing the meaning of the {language_text} {word_kind} '
            f'"{word_text}" = "{translation_text}"'
        )
    else:
        meaning = f'visualizing the meaning of the {language_text} {word_kind} "{word_text}"'

    scene_part = f"A single self-contained scene {meaning}: {scene}."
    emotion_part = ""
    if emotional_text:
        emotion_part = (
            f"The first-glance emotion should read as {emotional_text}, "
            "shown through expression, posture, light, and color."
        )

    composition_directive = COMPOSITION_DIRECTIVES.get(composition_key)
    treatment_directive = TREATMENT_DIRECTIVES.get(treatment_key)
    directive_part = " ".join(
        directive for directive in (composition_directive, treatment_directive) if directive
    )

    return _within_budget([
        _style_prefix(card_image_style),
        scene_part,
        emotion_part,
        directive_part,
        "Keep the background simple and uncluttered.",
        NO_TEXT_RULE,
    ])
