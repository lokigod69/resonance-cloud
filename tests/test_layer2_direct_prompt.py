from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.card_models import CardImageContent  # noqa: E402
from cloud_engines.image_engine.layer2_direct_prompt import (  # noqa: E402
    build_direct_prompt_system_prompt,
    build_direct_prompt_user_prompt,
)


def _content(word: str = "freedom", translation: str = "liberty") -> CardImageContent:
    return CardImageContent(
        word=word,
        translation=translation,
        language="English",
        language_code="en",
        base_language="English",
        pos="noun",
        mnemonic="A dove leaves a cage.",
        image_scene="A dove flies out of a cage toward mountains.",
    )


def test_word_object_design_direct_prompt_uses_one_concise_spelling_rule():
    prompt = build_direct_prompt_user_prompt(
        content=_content(),
        layer2={
            "meaning_strategy": "absurd_hook",
            "presentation_form": "word_object_design",
            "backend_template": "direct_prompt_v1",
        },
        art_style="oil_painting",
        allow_target_word=True,
    )

    assert "If the target word appears, spell it exactly: FREEDOM." in prompt
    assert "F R E E D O M" not in prompt
    assert "two E" not in prompt


def test_non_word_object_direct_prompt_keeps_target_word_forbidden():
    prompt = build_direct_prompt_user_prompt(
        content=_content(word="viral", translation="viral"),
        layer2={
            "meaning_strategy": "clear_meaning",
            "presentation_form": "single_scene",
            "backend_template": "direct_prompt_v1",
        },
        art_style="anime",
        allow_target_word=False,
    )

    assert "Target word must not appear as readable text." in prompt
    assert "spell it exactly" not in prompt


def test_direct_prompt_system_prompt_uses_compact_mode_definitions():
    prompt = build_direct_prompt_system_prompt()

    assert "Clear Meaning: direct meaning." in prompt
    assert "Mnemonic Hook: best available memory bridge" in prompt
    assert "Mini Story: 2-3 visible beats." in prompt
    assert "Word as Design: target word is the main visual object." in prompt
    assert "fake sound" in prompt
