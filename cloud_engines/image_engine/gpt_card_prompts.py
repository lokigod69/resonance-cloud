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

_ROMANCE_PATTERNS = (
    r"\bromance\b",
    r"\bromantic\b",
    r"\bdating\b",
    r"\bdate\b",
    r"\bflirt(?:ing|atious)?\b",
    r"\bd\.?\s?m\.?s?\b",
    r"\bdirect message\b",
    r"\bslow burn\b",
    r"\bslide into\b",
    r"\bcrush(?:es)?\b",
    r"\brelationship\b",
    r"\bpick-?up\b",
    r"\btinder\b",
    r"\bprofile\b",
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
    return any(re.search(pattern, text, flags=re.IGNORECASE) for pattern in _ROMANCE_PATTERNS)


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


def _compact_field(text: str, max_chars: int) -> str:
    text = _clean(text)
    if len(text) <= max_chars:
        return text
    return text[: max(1, max_chars - 3)].rstrip(" ,;:.") + "..."


def _remove_visible_text_requests(scene: str) -> str:
    replacements = [
        (r"\bmailbox\s+labeled\s+(?:['\"][^'\"]{1,120}['\"]|[A-Za-z0-9_.-]+)", "an unlabeled mailbox shape"),
        (r"\bbox\s+labeled\s+(?:['\"][^'\"]{1,120}['\"]|[A-Za-z0-9_.-]+)", "an unlabeled box shape"),
        (r"\blabeled\s+(?:['\"][^'\"]{1,120}['\"]|[A-Za-z0-9_.-]+)", "unlabeled"),
        (r"\blabel\s+reading\s+[^.,;]*", "an unlabeled sign shape"),
        (r"\bsign\s+reading\s+[^.,;]*", "an unlabeled sign shape"),
        (r"\bposter\s+reading\s+[^.,;]*", "an unlabeled poster shape"),
        (
            r"\breadable\s+(?:street\s+|road\s+)?sign(?:\s+(?:that\s+)?says|\s+reading|\s+with)?\s*[^.,;]*",
            "a blank street sign shape",
        ),
        (r"\b(?:street\s+|road\s+)?sign\s+(?:that\s+)?says\s+[^.,;]*", "a blank street sign shape"),
        (r"\blabel\s+(?:that\s+)?says\s+[^.,;]*", "an unlabeled sign shape"),
        (r"\bcard\s+(?:that\s+)?says\s+[^.,;]*", "a blank card shape"),
        (r"\bbillboard\s+(?:that\s+)?says\s+[^.,;]*", "an unlabeled sign shape"),
        (r"\bposter\s+(?:that\s+)?says\s+[^.,;]*", "an unlabeled poster shape"),
        (r"\bhandwritten\s+note\s+(?:that\s+)?says\s+[^.,;]*", "a blank note shape"),
        (r"\bnote\s+(?:that\s+)?says\s+[^.,;]*", "a blank note shape"),
        (r"\bchat\s+message\s+(?:that\s+)?says\s+[^.,;]*", "a quiet notification without readable words"),
        (r"\bmessage\s+(?:that\s+)?says\s+[^.,;]*", "a quiet notification without readable words"),
        (r"\bUI\s+text\s+on\s+a\s+phone\s+screen\b", "a non-readable phone interface"),
        (r"\bUI\s+text\b", "a non-readable phone interface"),
        (r"\bphone\s+screen\s+showing\s+readable\s+text\b", "a non-readable phone interface"),
        (r"\btext\s+on\s+(?:the\s+)?screen\b", "a non-readable phone interface"),
        (r"\bvisible\s+words\s+on\s+[^.,;]*?(?=\s+and\b|[.,;]|$)", "abstract markings without letters"),
        (r"\breadable\s+words\s+on\s+[^.,;]*?(?=\s+and\b|[.,;]|$)", "abstract markings without letters"),
        (r"\breadable\s+lettering\b", "abstract markings without letters"),
        (r"\blegible\s+writing\b", "abstract markings without letters"),
        (r"\blegible\s+text\b", "abstract markings without letters"),
        (r"\bchat\s+bubbles?\s+with\s+text\b", "quiet notifications without readable words"),
        (r"\brender\s+text\b", "show abstract markings without letters"),
        (r"\bdisplay\s+text\b", "show abstract markings without letters"),
        (r"\binclude\s+text\b", "show abstract markings without letters"),
        (r"\bwrite\s+the\s+word\b", "symbolize the concept without letters"),
        (r"\bwritten\s+words\b", "abstract markings without letters"),
        (r"\breadable\s+words\b", "abstract markings without letters"),
        (r"\bcaption\b", "silent visual cue"),
        (r"\bsign\s+text\b", "unlabeled sign shape"),
        (r"\blabel\s+text\b", "unlabeled sign shape"),
        (r"\bphone\s+screen\b", "non-readable phone interface"),
        (r"\bSchild\s+mit\s+[^.,;]*?(?=\s+und\b|[.,;]|$)", "ein unbeschriftetes Schild"),
        (r"\bSchild\s+auf\s+dem\s+[^.,;]*?(?=\s+und\b|[.,;]|$)", "ein unbeschriftetes Schild"),
        (r"\blesbares\s+Schild\b", "ein unbeschriftetes Schild"),
        (r"\bAufschrift\b", "abstrakte Markierungen ohne Buchstaben"),
        (r"\bBeschriftung\b", "abstrakte Markierungen ohne Buchstaben"),
        (r"\bNachricht:\s*[^.,;]*", "eine nicht lesbare Nachricht"),
        (r"\bNachricht\s+mit\s+[^.,;]*", "eine nicht lesbare Nachricht"),
        (r"\bText\s+auf\s+dem\s+Bildschirm\b", "eine nicht lesbare Smartphone-Oberfläche"),
        (r"\blesbarer\s+Text\b", "abstrakte Markierungen ohne Buchstaben"),
        (r"\bSprechblase\b", "eine nicht lesbare Nachricht"),
    ]
    for pattern, replacement in replacements:
        scene = re.sub(pattern, replacement, scene, flags=re.IGNORECASE)
    scene = re.sub(r"\ba\s+a\s+", "a ", scene, flags=re.IGNORECASE)
    return scene


def _sanitize_mnemonic_scene(mnemonic: Optional[str], *, romance_or_dating: bool) -> str:
    scene = _clean(mnemonic)
    if not scene:
        return ""

    scene = _remove_visible_text_requests(scene)
    scene = re.sub(r"“[^”]{1,180}”|‘[^’]{1,180}’", "a private message without readable words", scene)
    scene = re.sub(
        r"(['\"“”‘’])(?:\\.|(?!\1).){1,180}\1",
        "a private message without readable words",
        scene,
    )
    scene = _remove_visible_text_requests(scene)
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


def _build_meaning(
    *,
    language_text: str,
    word_kind: str,
    word_text: str,
    translation_text: str,
    field_limit: int,
) -> str:
    word_display = _compact_field(word_text, field_limit)
    translation_display = _compact_field(translation_text, field_limit)
    if translation_display:
        return (
            f'visualizing the meaning of the {language_text} {word_kind} '
            f'"{word_display}" = "{translation_display}"'
        )
    return f'visualizing the meaning of the {language_text} {word_kind} "{word_display}"'


def _assemble_prompt(
    *,
    style_part: str,
    meaning: str,
    scene: str,
    emotion_part: str,
    directive_part: str,
) -> str:
    scene_part = (
        f"A single self-contained scene {meaning}: {scene}."
        if scene
        else f"A single self-contained scene {meaning}."
    )
    parts = [
        style_part,
        scene_part,
        emotion_part,
        directive_part,
        "Keep the background simple and uncluttered.",
        NO_TEXT_RULE,
    ]
    prompt = " ".join(part for part in parts if part)
    if NO_TEXT_RULE not in prompt:
        raise AssertionError("GPT Image-2 no-text invariant missing from prompt")
    return prompt


def _within_budget(
    *,
    style_part: str,
    language_text: str,
    word_kind: str,
    word_text: str,
    translation_text: str,
    scene: str,
    emotion_part: str,
    directive_part: str,
) -> str:
    for field_limit in (180, 120, 80, 48, 24):
        meaning = _build_meaning(
            language_text=language_text,
            word_kind=word_kind,
            word_text=word_text,
            translation_text=translation_text,
            field_limit=field_limit,
        )
        scene_candidate = scene
        emotion_candidate = emotion_part
        directive_candidate = directive_part
        for scene_limit in (len(scene_candidate), 360, 220, 140, 80, 40, 0):
            trimmed_scene = _sentence_trim(scene_candidate, scene_limit) if scene_limit else ""
            prompt = _assemble_prompt(
                style_part=style_part,
                meaning=meaning,
                scene=trimmed_scene,
                emotion_part=emotion_candidate,
                directive_part=directive_candidate,
            )
            if len(prompt) <= PROMPT_HARD_CAP:
                return prompt

        directive_candidate = ""
        for emotion_limit in (180, 120, 80, 40, 0):
            trimmed_emotion = (
                _sentence_trim(emotion_candidate, emotion_limit) if emotion_limit else ""
            )
            prompt = _assemble_prompt(
                style_part=style_part,
                meaning=meaning,
                scene="",
                emotion_part=trimmed_emotion,
                directive_part=directive_candidate,
            )
            if len(prompt) <= PROMPT_HARD_CAP:
                return prompt

    return _assemble_prompt(
        style_part=style_part,
        meaning=_build_meaning(
            language_text=language_text,
            word_kind=word_kind,
            word_text=word_text,
            translation_text=translation_text,
            field_limit=24,
        ),
        scene="",
        emotion_part="",
        directive_part="",
    )


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

    return _within_budget(
        style_part=_style_prefix(card_image_style),
        language_text=language_text,
        word_kind=word_kind,
        word_text=word_text,
        translation_text=translation_text,
        scene=scene,
        emotion_part=emotion_part,
        directive_part=directive_part,
    )
