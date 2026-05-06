from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.card_models import CardImageContent  # noqa: E402
from cloud_engines.image_engine.layer2_direct_prompt import (  # noqa: E402
    backend_template,
    build_direct_prompt_system_prompt,
    build_direct_prompt_user_prompt,
    direct_prompt_metadata,
    DirectPromptResult,
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


def test_backend_template_accepts_direct_prompt_v2_without_changing_existing_values():
    assert backend_template({"backend_template": "structured_plan_v1"}) == "structured_plan_v1"
    assert backend_template({"backend_template": "direct_prompt_v1"}) == "direct_prompt_v1"
    assert backend_template({"backend_template": "direct_prompt_v2"}) == "direct_prompt_v2"
    assert backend_template({"backend_template": "direct_prompt_v3"}) == "direct_prompt_v3"
    assert backend_template({"backend_template": "typo"}) == "structured_plan_v1"


def test_direct_prompt_v2_system_prompt_adds_controlled_creative_guidance():
    prompt = build_direct_prompt_system_prompt("direct_prompt_v2")

    assert "Reduce repetitive golden-hour" in prompt
    assert "make the selected meaning strategy visibly distinct" in prompt
    assert "Mini Story: one image containing 2-3 readable beats" in prompt
    assert "Word as Design: target word may appear visibly" in prompt
    assert "Incidental environmental text is allowed" in prompt
    assert "Never render the direct translation/answer" in prompt
    assert "no text ever" not in prompt.lower()


def test_direct_prompt_v3_system_prompt_adds_visual_craft_guidance_without_dumping_checklist():
    prompt = build_direct_prompt_system_prompt("direct_prompt_v3")

    assert "LLM V3" in prompt
    assert "visual-director layer" in prompt
    assert "choose 2-4 visual craft decisions" in prompt
    assert "Do not dump the whole checklist" in prompt
    assert "concise final prompt" in prompt
    assert "Do not add photography jargon" in prompt
    assert "orange sunset" in prompt
    assert "generic cinematic haze" in prompt
    assert "Realistic should feel like a plausible photograph" in prompt
    assert "Infographic: visual craft means layout design" in prompt


def test_direct_prompt_v2_user_prompt_keeps_incidental_text_allowed_but_translation_forbidden():
    prompt = build_direct_prompt_user_prompt(
        content=_content(word="fragrance", translation="scent"),
        layer2={
            "meaning_strategy": "clear_meaning",
            "presentation_form": "single_scene",
            "backend_template": "direct_prompt_v2",
        },
        art_style="cinematic",
        allow_target_word=False,
    )

    assert "Backend template: direct_prompt_v2" in prompt
    assert "Do not casually place the target word as a label" in prompt
    assert "Incidental environmental text is allowed when natural" in prompt
    assert "Never render the direct translation/answer" in prompt
    assert "Target word must not appear as readable text." not in prompt


def test_direct_prompt_v3_user_prompt_marks_visual_craft_backend():
    prompt = build_direct_prompt_user_prompt(
        content=_content(word="obfuscate", translation="make unclear"),
        layer2={
            "meaning_strategy": "absurd_hook",
            "presentation_form": "single_scene",
            "backend_template": "direct_prompt_v3",
        },
        art_style="realistic",
        allow_target_word=False,
    )

    assert "Backend template: direct_prompt_v3" in prompt
    assert "Concise V3 prompt target: 700-1100 characters" in prompt
    assert "Do not add visual craft jargon unless it improves the image" in prompt
    assert "Meaning strategy: absurd_hook" in prompt
    assert "Presentation form: single_scene" in prompt
    assert "Never render the direct translation/answer" in prompt


def test_direct_prompt_v2_infographic_allows_target_word_and_translation_with_guidance():
    prompt = build_direct_prompt_user_prompt(
        content=_content(word="ephemeral", translation="short-lived"),
        layer2={
            "meaning_strategy": "absurd_hook",
            "presentation_form": "infographic_card",
            "backend_template": "direct_prompt_v2",
        },
        art_style="editorial",
        allow_target_word=True,
        allow_translation=True,
    )

    assert "Presentation form: infographic_card" in prompt
    assert "Design a premium educational infographic card" in prompt
    assert "target word and translation may appear as text" in prompt
    assert "Spell visible target word exactly: ephemeral." in prompt
    assert "Spell visible translation exactly: short-lived." in prompt
    assert "Never render the direct translation/answer" not in prompt


def test_direct_prompt_v2_metadata_stores_v2_template_value():
    result = DirectPromptResult(
        prompt="Cinematic scene.",
        model="test-model",
        raw_prompt="raw",
    )

    metadata = direct_prompt_metadata(
        result=result,
        prompt="Cinematic scene.",
        allow_target_word=False,
        template="direct_prompt_v2",
    )

    assert metadata["backend_template"] == "direct_prompt_v2"


def test_direct_prompt_metadata_stores_v3_template_value():
    result = DirectPromptResult(
        prompt="Documentary close-up with intentional focus.",
        model="test-model",
        raw_prompt="raw",
    )

    metadata = direct_prompt_metadata(
        result=result,
        prompt="Documentary close-up with intentional focus.",
        allow_target_word=False,
        template="direct_prompt_v3",
    )

    assert metadata["backend_template"] == "direct_prompt_v3"


def test_direct_prompt_metadata_marks_infographic_answer_visibility():
    result = DirectPromptResult(
        prompt="Editorial infographic.",
        model="test-model",
        raw_prompt="raw",
    )

    metadata = direct_prompt_metadata(
        result=result,
        prompt="Editorial infographic.",
        allow_target_word=True,
        allow_translation=True,
        template="direct_prompt_v2",
    )

    assert metadata["target_word_allowed"] is True
    assert metadata["translation_allowed"] is True
    assert metadata["answer_visibility"] == "teaching_text_allowed"
