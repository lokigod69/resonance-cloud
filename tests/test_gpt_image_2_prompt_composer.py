from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.gpt_card_prompts import build_gpt_image_2_prompt  # noqa: E402


def _prompt(**overrides: object) -> str:
    data = {
        "word": "links abbiegen",
        "translation": "turn left",
        "language": "German",
        "pos": "phrase",
        "mnemonic": "A driver turns left at a quiet city intersection.",
        "dominant_emotional_reading": "decisive movement",
        "composition_hint": "single",
        "treatment_hint": "literal",
        "card_image_style": "Photorealistic",
    }
    data.update(overrides)
    return build_gpt_image_2_prompt(**data)


def test_gpt_composer_removes_spec_prompt_and_forced_typography():
    prompt = _prompt(
        composition_hint="multi_panel",
        treatment_hint="absurd",
        card_image_style="Editorial",
    )

    forbidden = [
        "Text in image",
        "lower-left",
        "bold sans-serif",
        "drop shadow",
        "Create an educational language-learning card illustration",
        "Goal:",
        "Scene:",
        "Constraints:",
    ]
    for phrase in forbidden:
        assert phrase not in prompt

    assert "No visible text, letters, captions, signage, UI labels" in prompt
    assert "typography" in prompt


def test_gpt_composer_strips_visible_message_text_from_dms_prompt():
    prompt = _prompt(
        word="to slide into someone's D.M.s",
        translation="jemandem privat schreiben, um zu flirten",
        mnemonic=(
            "A guy opens a smartphone DMs label and sends 'Hey, ich hab dein "
            "Profil gesehen...' as a pickup-line quote in a chat bubble."
        ),
        dominant_emotional_reading="flirtatious hesitation",
        composition_hint="embodied",
        treatment_hint="mnemonic",
    )
    lowered = prompt.lower()

    assert "hey" not in lowered
    assert "profil gesehen" not in lowered
    assert "pickup-line" not in lowered
    assert "dms label" not in lowered
    assert "chat text" not in lowered
    assert "visible chat" not in lowered
    assert "two adults" in lowered
    assert "non-readable phone interface" in lowered


def test_gpt_composer_forces_adult_safe_slow_burn_scene():
    prompt = _prompt(
        word="slow burn",
        translation="langsame Annaherung",
        mnemonic="A schoolyard crush grows slowly as teenagers pass notes after class.",
        dominant_emotional_reading="patient longing",
        composition_hint="multi_panel",
        treatment_hint="mnemonic",
    )
    lowered = prompt.lower()

    assert "two adults" in lowered
    assert "schoolyard" not in lowered
    assert "teenagers" not in lowered
    assert "crush" not in lowered
    assert "after class" not in lowered
    assert "multi-panel" not in lowered
    assert "panels" not in lowered


def test_gpt_composer_enforces_prompt_length_cap():
    long_scene = " ".join(
        f"detail{i} with elaborate visual texture and background action"
        for i in range(120)
    )
    prompt = _prompt(
        word="ausweichen",
        translation="to dodge",
        mnemonic=long_scene,
        dominant_emotional_reading="alert avoidance",
        composition_hint="split",
        treatment_hint="contrast",
        card_image_style="Photorealistic",
    )

    assert len(prompt) <= 1000
    assert "ausweichen" in prompt
    assert "to dodge" in prompt
    assert "alert avoidance" in prompt
    assert "No visible text" in prompt
