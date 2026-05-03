"""GPT Image-2 prompt composer for card-deck mode."""

from __future__ import annotations

from typing import Optional


COMPOSITION_DIRECTIVES = {
    "single": "Use one clear scene with one readable focal moment.",
    "multi_panel": "Use 3 panels arranged left-to-right showing a temporal sequence.",
    "split": "Use a split composition with two clearly contrasted sides.",
    "embodied": "Use an embodied first-person or over-the-shoulder viewpoint.",
}

TREATMENT_DIRECTIVES = {
    "literal": "Depict the meaning directly with instantly recognizable objects and action.",
    "absurd": "Render with one unexpected, memorable visual element.",
    "mnemonic": "Make the memory-bridge scene visually specific and easy to recall.",
    "etymological": "Visualize the word parts or roots through concrete objects.",
    "contrast": "Make the contrast explicit without adding extra text.",
    "embodied": "Emphasize bodily sensation, posture, and physical action.",
}


def _clean(value: Optional[str]) -> str:
    return (value or "").strip()


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
    """Compose a GPT Image-2 prompt following production-brief structure."""
    word_text = _clean(word)
    translation_text = _clean(translation)
    language_text = _clean(language) or "target-language"
    style_text = _clean(card_image_style) or "Clean educational illustration"
    pos_text = _clean(pos)
    mnemonic_text = _clean(mnemonic)
    emotional_text = _clean(dominant_emotional_reading)
    composition_key = _clean(composition_hint)
    treatment_key = _clean(treatment_hint)

    lines = [
        "Create an educational language-learning card illustration.",
        "",
        f'Goal: Teach the learner the {language_text} word "{word_text}" (meaning: "{translation_text}").',
    ]
    if pos_text:
        lines.append(f"Part of speech: {pos_text}.")
    if mnemonic_text:
        lines.extend(["", f"Scene: {mnemonic_text}"])
    if emotional_text:
        lines.extend([
            "",
            (
                "Emotional reading: "
                f"{emotional_text}. Convey this through facial expression, "
                "posture, lighting, and color."
            ),
        ])
    composition_directive = COMPOSITION_DIRECTIVES.get(composition_key)
    if composition_directive and composition_key != "single":
        lines.extend(["", f"Composition: {composition_directive}"])
    treatment_directive = TREATMENT_DIRECTIVES.get(treatment_key)
    if treatment_directive:
        lines.extend(["", f"Treatment: {treatment_directive}"])

    lines.extend([
        "",
        f"Style: {style_text}. Clean educational illustration, readable, uncluttered.",
        "",
        (
            f'Text in image: Render the word "{word_text}" exactly once as clean '
            "bold sans-serif white type with a soft drop shadow, placed in the "
            "lower-left third, large enough to read instantly."
        ),
        "",
        "Constraints:",
        f'- No extra text beyond the single word "{word_text}"',
        "- No watermarks, logos, or trademarks",
        "- No duplicate subjects",
        "- Background simple enough for instant recognition",
    ])
    return "\n".join(lines)
