from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.card_models import CardImageContent  # noqa: E402
from cloud_engines.image_engine.infographic_prompt import (  # noqa: E402
    BANNED_VISIBLE_TERMS,
    INFOGRAPHIC_BACKEND_TEMPLATE,
    INFOGRAPHIC_TEMPLATE_OPTIONS,
    build_infographic_compiler_prompt,
    build_infographic_planner_system_prompt,
    compile_infographic_prompt,
    infographic_prompt_metadata,
    infographic_template_label,
)


def _content() -> CardImageContent:
    return CardImageContent(
        word="threshold",
        translation="Schwelle",
        language="English",
        language_code="en",
        base_language="German",
        pos="noun",
        image_scene="A person pauses at the line between a hallway and a bright room.",
        mnemonic="A threshold is the line you cross when entering.",
        etymology="Old English threscold.",
    )


def _plan() -> dict[str, object]:
    return {
        "title": "threshold",
        "translation": "Schwelle",
        "base_language": "German",
        "target_language": "English",
        "infographic_template": "infographic_knowledge_guide_v1",
        "visual_anchor": "Eine feine Linie zwischen zwei Raeumen.",
        "panels": [
            {
                "header": "Kernidee",
                "type": "meaning",
                "text": ["Die Grenze, ab der etwas beginnt.", "English example: cross the threshold."],
                "visual_note": "Linie am Eingang.",
            },
            {
                "header": "Typischer Kontext",
                "type": "usage",
                "text": ["Tuer, Entscheidung, Beginn."],
                "visual_note": "Drei kleine Symbole.",
            },
        ],
        "footer_line": "Ein Wort fuer den Moment davor.",
        "avoid": ["fake etymology", "fake mnemonic"],
    }


def test_infographic_template_registry_contains_v1_and_v2_variants_in_order():
    values = [option.value for option in INFOGRAPHIC_TEMPLATE_OPTIONS]

    assert values == [
        "infographic_knowledge_guide_v1",
        "infographic_language_atlas_v1",
        "infographic_study_poster_v1",
        "infographic_visual_dictionary_v1",
        "infographic_museum_exhibit_v1",
        "infographic_knowledge_guide_v2",
        "infographic_language_atlas_v2",
        "infographic_study_poster_v2",
        "infographic_visual_dictionary_v2",
        "infographic_museum_exhibit_v2",
    ]
    assert infographic_template_label("infographic_museum_exhibit_v2") == "V2 · Museum Exhibit"


def test_v2_planner_prompt_uses_two_pass_analysis_and_text_budgets():
    prompt = build_infographic_planner_system_prompt("infographic_study_poster_v2")

    assert "Pass 1" in prompt
    assert "Pass 2" in prompt
    assert "master language teacher" in prompt
    assert "Section header: 5 words maximum" in prompt
    assert "Body line: one or two short sentences, max 30 words total" in prompt
    assert "planner_pass_count" not in prompt


def test_compiler_output_has_infographic_requirements_without_internal_labels():
    prompt = compile_infographic_prompt(
        content=_content(),
        plan=_plan(),
        infographic_template="infographic_knowledge_guide_v1",
    )
    lower = prompt.lower()

    assert "horizontal 16:9 educational infographic poster" in prompt
    assert "All explanatory text, panel headers, captions, labels, and descriptions must be in German" in prompt
    assert "Only the target word, target-language forms, and target-language example sentences may appear in English" in prompt
    assert "Never invent mnemonics" in prompt
    assert "supplied content is the source of truth" in prompt
    assert "Kernidee" in prompt
    assert "threshold" in prompt
    for term in BANNED_VISIBLE_TERMS:
        assert term.lower() not in lower


def test_compiler_keeps_safety_rules_internal_and_out_of_visible_content():
    prompt = compile_infographic_prompt(
        content=_content(),
        infographic_template="infographic_language_atlas_v2",
        plan={
            "title": "threshold",
            "translation": "Schwelle",
            "base_language": "German",
            "target_language": "English",
            "visual_anchor": "a semantic doorway map",
            "panels": [
                {
                    "header": "Keine erfundenen Fakten",
                    "text": [
                        "Keine erfundenen Zitate, Etymologien oder Mnemonotechniken.",
                        "Use this reliable visible explanation instead.",
                    ],
                    "visual_note": "No fake mnemonics panel",
                },
                {
                    "header": "Grenze",
                    "text": ["Der Punkt, an dem ein neuer Bereich beginnt."],
                    "visual_note": "doorway line",
                },
            ],
            "footer_line": "Keine erfundenen Fakten, Zitate, Etymologien oder Mnemonotechniken.",
            "avoid": [
                "No invented facts",
                "Keine erfundenen Fakten",
                "No invented quotes",
                "Keine erfundenen Zitate",
                "No fake mnemonics",
                "internal rule",
                "safety instruction",
            ],
        },
    )

    lowered = prompt.lower()
    internal_instruction = (
        "internal safety rules are instructions only and must not be rendered as card text"
    )
    assert internal_instruction in lowered
    visible_prompt = lowered.replace(internal_instruction, "")
    for forbidden in (
        "No invented facts",
        "Keine erfundenen Fakten",
        "No invented quotes",
        "Keine erfundenen Zitate",
        "No fake mnemonics",
        "internal rule",
        "safety instruction",
    ):
        assert forbidden.lower() not in visible_prompt
    assert "Der Punkt, an dem ein neuer Bereich beginnt." in prompt


def test_v2_compiler_includes_hero_treatment_anti_pattern_and_footer_requirement():
    plan = {
        **_plan(),
        "infographic_template": "infographic_language_atlas_v2",
        "hero_treatment": "network_node",
    }
    prompt = compile_infographic_prompt(
        content=_content(),
        plan=plan,
        infographic_template="infographic_language_atlas_v2",
    )

    assert "Honour the planner-chosen hero treatment: network_node" in prompt
    assert "literal Earth map" in prompt
    assert "Footer requirement" in prompt
    assert "Feature label: 3 words maximum" in prompt
    assert INFOGRAPHIC_BACKEND_TEMPLATE == "infographic_prompt_v1"


def test_infographic_metadata_records_template_and_v2_pass_count():
    prompt = build_infographic_compiler_prompt(
        content=_content(),
        plan=_plan(),
        infographic_template="infographic_museum_exhibit_v2",
    )
    metadata = infographic_prompt_metadata(
        final_prompt=prompt,
        planner_model="test-planner",
        planner_plan={**_plan(), "hero_treatment": "artifact_label"},
        infographic_template="infographic_museum_exhibit_v2",
        base_language_intended="German",
        target_language="English",
    )

    assert metadata["premium_quick_mode"] == "infographic"
    assert metadata["backend_template"] == "infographic_prompt_v1"
    assert metadata["infographic_template"] == "infographic_museum_exhibit_v2"
    assert metadata["infographic_template_label"] == "V2 · Museum Exhibit"
    assert metadata["planner_model"] == "test-planner"
    assert metadata["planner_panel_count"] == 2
    assert metadata["planner_pass_count"] == 2
    assert metadata["planner_hero_treatment"] == "artifact_label"
    assert metadata["base_language_intended"] == "German"
    assert metadata["target_language"] == "English"
    assert metadata["final_prompt_chars"] == len(prompt)
    assert metadata["final_prompt_preview"] == prompt[:500]
