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
