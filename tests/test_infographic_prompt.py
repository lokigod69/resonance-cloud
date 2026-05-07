from __future__ import annotations

import sys
import types
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.card_models import CardImageContent  # noqa: E402
from cloud_engines.image_engine.infographic_prompt import (  # noqa: E402
    BANNED_VISIBLE_TERMS,
    INFOGRAPHIC_BACKEND_TEMPLATE,
    INFOGRAPHIC_TEMPLATES,
    INFOGRAPHIC_TEMPLATE_OPTIONS,
    build_infographic_compiler_prompt,
    build_infographic_planner_system_prompt,
    build_infographic_planner_user_prompt,
    compile_infographic_prompt,
    infographic_prompt_metadata,
    infographic_template_reference,
    infographic_template_reference_for_render,
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
        "infographic_language_atlas_v3_reference",
        "infographic_study_knowledge_v3_reference",
        "infographic_museum_exhibit_v3_reference",
    ]
    assert infographic_template_label("infographic_museum_exhibit_v2") == "V2 · Museum Exhibit"
    assert infographic_template_label("infographic_language_atlas_v3_reference") == "V3 · Language Atlas Reference"


def test_v3_template_registry_has_skeleton_references_and_assets_exist():
    expected = {
        "infographic_language_atlas_v3_reference": "language_atlas_reference_v3a.png",
        "infographic_study_knowledge_v3_reference": "study_knowledge_reference_v3a.png",
        "infographic_museum_exhibit_v3_reference": "museum_exhibit_reference_v3a.png",
    }

    for template_value, filename in expected.items():
        template = INFOGRAPHIC_TEMPLATES[template_value]
        reference = infographic_template_reference(template_value)

        assert template.version == "v3"
        assert template.reference_mode == "skeleton"
        assert template.compatible_planner_template == "infographic_prompt_v1"
        assert reference is not None
        assert reference["reference_asset_path"].endswith(filename)
        assert reference["reference_mode"] == "skeleton"
        assert reference["fallback_style_description"]
        assert (ORCH_ROOT / reference["reference_asset_path"]).exists()


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


def test_compiler_forces_target_word_headword_and_base_translation_subtitle_orientation():
    examples = [
        ("chess", "Schach"),
        ("failure", "Scheitern"),
        ("winner", "Gewinner"),
    ]

    for word, translation in examples:
        content = CardImageContent(
            word=word,
            translation=translation,
            language="English",
            language_code="en",
            base_language="German",
            pos="noun",
        )
        reversed_plan = {
            **_plan(),
            "title": translation,
            "translation": word,
            "base_language": "German",
            "target_language": "English",
            "panels": [
                {
                    "header": "Bedeutung",
                    "type": "meaning",
                    "text": [f"Deutsche Erklaerung fuer {word}."],
                    "visual_note": "Lernsymbol.",
                }
            ],
        }

        prompt = compile_infographic_prompt(
            content=content,
            plan=reversed_plan,
            infographic_template="infographic_knowledge_guide_v1",
        )

        assert f"Large title/headword, spelled exactly: {word}." in prompt
        assert f"Translation/subtitle, spelled exactly: {translation}." in prompt
        assert f"Large title/headword, spelled exactly: {translation}." not in prompt
        assert f"Translation/subtitle, spelled exactly: {word}." not in prompt
        assert "All explanatory text, panel headers, captions, labels, and descriptions must be in German" in prompt
        assert "Only the target word, target-language forms, and target-language example sentences may appear in English" in prompt

        v3_prompt = compile_infographic_prompt(
            content=content,
            plan={**reversed_plan, "infographic_template": "infographic_language_atlas_v3_reference"},
            infographic_template="infographic_language_atlas_v3_reference",
        )

        assert f"TARGET WORD: {word}" in v3_prompt
        assert f"TRANSLATION: {translation}" in v3_prompt
        assert f"TARGET WORD: {translation}" not in v3_prompt
        assert f"TRANSLATION: {word}" not in v3_prompt


def test_planner_prompts_state_target_word_translation_orientation():
    system_prompt = build_infographic_planner_system_prompt("infographic_language_atlas_v3_reference")
    user_prompt = build_infographic_planner_user_prompt(
        content=CardImageContent(
            word="chess",
            translation="Schach",
            language="English",
            language_code="en",
            base_language="German",
            pos="noun",
        ),
        infographic_template="infographic_language_atlas_v3_reference",
    )

    assert "title/headword must exactly equal the target word from the user prompt" in system_prompt
    assert "translation/subtitle must exactly equal the base-language gloss" in system_prompt
    assert "Target word/headword (English): chess" in user_prompt
    assert "Translation/subtitle (German): Schach" in user_prompt


def test_infographic_prompts_include_vocabulary_first_rule_and_template_lexical_requirements():
    planner_prompt = build_infographic_planner_system_prompt("infographic_language_atlas_v3_reference")
    compiler_prompt = compile_infographic_prompt(
        content=CardImageContent(
            word="chess",
            translation="Schach",
            language="English",
            language_code="en",
            base_language="German",
            pos="noun",
        ),
        plan={
            **_plan(),
            "title": "chess",
            "translation": "Schach",
            "base_language": "German",
            "target_language": "English",
            "infographic_template": "infographic_language_atlas_v3_reference",
        },
        infographic_template="infographic_language_atlas_v3_reference",
    )

    for prompt in (planner_prompt, compiler_prompt):
        assert "language-learning infographic about the target word, not a general encyclopedia article about the topic" in prompt
        assert "At least 70% of the card content must teach the word as language" in prompt
        assert "At most 30% may be world/topic knowledge" in prompt
    assert "Language Atlas must include at least 4 lexical-learning sections" in planner_prompt
    assert "meaning region / core sense" in planner_prompt
    assert "Do not turn the card into a subject encyclopedia" in planner_prompt


def test_template_specific_planner_rules_cover_study_museum_and_visual_dictionary():
    study = build_infographic_planner_system_prompt("infographic_study_knowledge_v3_reference")
    museum = build_infographic_planner_system_prompt("infographic_museum_exhibit_v3_reference")
    visual_dictionary = build_infographic_planner_system_prompt("infographic_visual_dictionary_v2")

    assert "Study / Knowledge Poster must include meaning, pronunciation if available" in study
    assert "target-language examples with base-language glosses" in study
    assert "Museum Exhibit must still teach the word as language" in museum
    assert "Do not turn plain words into over-poetic fake museum exhibits" in museum
    assert "Visual Dictionary must distinguish senses, synonyms/near-misses, grammar/usage, examples, and word family" in visual_dictionary
    assert "Dictionary Header" not in visual_dictionary
    assert "Visual Sense Callouts" not in visual_dictionary


def test_compiler_keeps_examples_from_planner_and_adds_natural_example_guard_without_inventing():
    prompt = compile_infographic_prompt(
        content=CardImageContent(
            word="winner",
            translation="Gewinner",
            language="English",
            language_code="en",
            base_language="German",
            pos="noun",
        ),
        plan={
            **_plan(),
            "title": "winner",
            "translation": "Gewinner",
            "base_language": "German",
            "target_language": "English",
            "panels": [
                {
                    "header": "Beispiel",
                    "type": "example",
                    "text": ["She was the clear winner of the race. = Sie war die klare Gewinnerin des Rennens."],
                    "visual_note": "Ziellinie.",
                }
            ],
        },
        infographic_template="infographic_study_poster_v2",
    )

    assert "Examples must be idiomatic and common" in prompt
    assert "She was the clear winner of the race" in prompt
    assert "Hard work is often the winner in the end" not in prompt
    assert "always with article" not in prompt.lower()
    assert "Im Singular meist mit Artikel: a winner / the winner. Im Plural auch ohne Artikel: winners." in prompt


def test_compiler_filters_internal_visual_dictionary_section_names_from_visible_headers():
    prompt = compile_infographic_prompt(
        content=_content(),
        plan={
            **_plan(),
            "title": "threshold",
            "translation": "Schwelle",
            "panels": [
                {
                    "header": "Dictionary Header",
                    "type": "meaning",
                    "text": ["Der Punkt, an dem etwas beginnt."],
                    "visual_note": "Visual Sense Callouts",
                }
            ],
        },
        infographic_template="infographic_visual_dictionary_v2",
    )

    assert "Dictionary Header" not in prompt
    assert "Visual Sense Callouts" not in prompt
    assert "Der Punkt, an dem etwas beginnt." in prompt


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


def test_v3_compiler_includes_reference_text_and_content_safety_rules():
    prompt = compile_infographic_prompt(
        content=_content(),
        plan={**_plan(), "infographic_template": "infographic_language_atlas_v3_reference"},
        infographic_template="infographic_language_atlas_v3_reference",
    )

    assert "Use the attached reference image only as visual scaffolding." in prompt
    assert "If the reference contains any readable text, treat it as placeholder only and ignore it." in prompt
    assert "All visible text must come from the planner content." in prompt
    assert "All explanations, panel headers, captions, warnings, glosses, and footer text must be in German." in prompt
    assert "target word, target-language forms, target-language example sentences, and collocations may remain in English" in prompt
    assert "Never invent fake facts. Never invent quotes. Never invent etymologies. Never invent mnemonics." in prompt
    assert "Do not copy text from the reference image." in prompt
    assert len(prompt) < 3500
    assert prompt.count("Use the attached reference image only as visual scaffolding.") == 1
    assert prompt.count("No fake facts") <= 1


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


def test_v3_metadata_records_reference_fields_and_missing_asset_fallback():
    prompt = build_infographic_compiler_prompt(
        content=_content(),
        plan=_plan(),
        infographic_template="infographic_museum_exhibit_v3_reference",
    )
    metadata = infographic_prompt_metadata(
        final_prompt=prompt,
        planner_model="test-planner",
        planner_plan=_plan(),
        infographic_template="infographic_museum_exhibit_v3_reference",
        base_language_intended="German",
        target_language="English",
    )

    assert metadata["infographic_template"] == "infographic_museum_exhibit_v3_reference"
    assert metadata["reference_mode"] == "skeleton"
    assert metadata["template_reference_id"] == "museum_exhibit_reference_v3a"
    assert metadata["template_reference_asset_path"].endswith("museum_exhibit_reference_v3a.png")
    assert metadata["reference_attached"] is False
    assert metadata["reference_fallback_used"] is True
    assert metadata["reference_fallback_reason"] == "reference_url_unavailable"
    assert metadata["final_prompt_hash"] == metadata["final_prompt_sha256"]

    missing = infographic_prompt_metadata(
        final_prompt=prompt,
        planner_model="test-planner",
        planner_plan=_plan(),
        infographic_template="infographic_museum_exhibit_v3_reference",
        base_language_intended="German",
        target_language="English",
        reference_asset_exists=False,
    )
    assert missing["reference_attached"] is False
    assert missing["reference_fallback_used"] is True
    assert missing["reference_fallback_reason"] == "reference_asset_missing"


def test_v3_reference_for_render_uploads_local_asset_to_supabase_storage(monkeypatch):
    uploads: list[dict[str, object]] = []

    class FakeBucket:
        def upload(self, storage_key, payload, file_options=None):
            uploads.append(
                {
                    "storage_key": storage_key,
                    "payload": payload,
                    "file_options": file_options,
                }
            )

        def get_public_url(self, storage_key):
            return f"https://cdn.example.invalid/{storage_key}"

    class FakeStorage:
        def from_(self, bucket):
            uploads.append({"bucket": bucket})
            return FakeBucket()

    class FakeClient:
        storage = FakeStorage()

    fake_supabase = types.SimpleNamespace(create_client=lambda *_args, **_kwargs: FakeClient())

    monkeypatch.delenv("INFOGRAPHIC_REFERENCE_BASE_URL", raising=False)
    monkeypatch.setenv("SUPABASE_URL", "https://project.example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setitem(sys.modules, "supabase", fake_supabase)

    reference = infographic_template_reference_for_render("infographic_language_atlas_v3_reference")

    assert reference is not None
    assert reference["reference_url"] == "https://cdn.example.invalid/infographic-references/language_atlas_reference_v3a.png"
    assert reference["reference_url_error"] is None
    assert reference["reference_bucket"] == "videos"
    assert reference["reference_storage_key"] == "infographic-references/language_atlas_reference_v3a.png"
    assert reference["asset_exists"] is True
    assert uploads[0] == {"bucket": "videos"}
    assert uploads[1]["storage_key"] == "infographic-references/language_atlas_reference_v3a.png"
    assert uploads[1]["file_options"] == {"content-type": "image/png", "upsert": "true"}
    assert uploads[1]["payload"].startswith(b"\x89PNG")
