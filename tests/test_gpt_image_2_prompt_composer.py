from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.gpt_card_prompts import (  # noqa: E402
    NO_TEXT_RULE,
    PROMPT_HARD_CAP,
    build_gpt_image_2_prompt,
)


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


def test_gpt_composer_sanitizes_readable_sign_and_screen_text_requests():
    prompt = _prompt(
        mnemonic=(
            "A driver approaches a readable street sign that says LEFT TURN, "
            "with visible words on a poster and UI text on a phone screen."
        ),
    )
    lowered = prompt.lower()

    assert "left turn" not in lowered
    assert "readable street sign" not in lowered
    assert "sign that says" not in lowered
    assert "visible words" not in lowered
    assert "ui text" not in lowered
    assert "phone screen" not in lowered
    assert "blank street sign shape" in lowered or "unlabeled sign shape" in lowered
    assert "non-readable phone interface" in lowered
    assert NO_TEXT_RULE in prompt


def test_gpt_composer_sanitizes_german_visible_text_requests():
    prompt = _prompt(
        word="Worte der Bestätigung",
        translation="words of affirmation",
        mnemonic=(
            "Ein lesbares Schild mit 'Worte der Bestätigung' steht neben "
            "einer Sprechblase und Text auf dem Bildschirm."
        ),
        dominant_emotional_reading="warm reassurance",
    )
    lowered = prompt.lower()

    assert "schild mit" not in lowered
    assert "worte der bestätigung' steht" not in lowered
    assert "sprechblase" not in lowered
    assert "text auf dem bildschirm" not in lowered
    assert "ein unbeschriftetes schild" in lowered
    assert "eine nicht lesbare smartphone-oberfläche" in lowered
    assert NO_TEXT_RULE in prompt


def test_gpt_composer_sanitizes_labeled_mailbox_dms():
    prompt = _prompt(
        word="to slide into someone's D.M.s",
        translation="jemandem privat schreiben, um zu flirten",
        mnemonic='A mailbox labeled "DMs" opens beside a chat message that says hello.',
        dominant_emotional_reading="flirtatious hesitation",
    )
    lowered = prompt.lower()

    assert "mailbox labeled" not in lowered
    assert "dms" not in lowered
    assert "chat message that says" not in lowered
    assert "hello" not in lowered
    assert "unlabeled mailbox shape" in lowered
    assert "two adults" in lowered
    assert NO_TEXT_RULE in prompt


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

    assert len(prompt) <= PROMPT_HARD_CAP
    assert "ausweichen" in prompt
    assert "to dodge" in prompt
    assert "alert avoidance" in prompt
    assert NO_TEXT_RULE in prompt


def test_gpt_composer_preserves_no_text_rule_for_pathological_fixed_fields():
    prompt = _prompt(
        word="x" * 260,
        translation="y" * 260,
        mnemonic=" ".join("scene detail" for _ in range(200)),
        dominant_emotional_reading=" ".join("emotiondetail" for _ in range(120)),
        composition_hint="split",
        treatment_hint="contrast",
    )

    assert NO_TEXT_RULE in prompt
    assert "No visible text" in prompt


def test_gpt_composer_does_not_romance_coerce_unrelated_date_or_dm_substrings():
    for word in ["update", "candidate", "medium", "admin"]:
        prompt = _prompt(
            word=word,
            translation="ordinary meaning",
            mnemonic="A neutral workspace scene showing the concept plainly.",
            dominant_emotional_reading="focused clarity",
        )

        assert "two adults" not in prompt.lower()
