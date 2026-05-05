"""Static checks for admin GPT Image-2 card controls and metadata display."""

from __future__ import annotations

import re
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
FIELD_CONFIGS = ROOT / "frontend" / "src" / "components" / "settings" / "fieldConfigs.ts"
WORD_DETAIL = ROOT / "frontend" / "src" / "components" / "admin" / "WordDetailPanel.tsx"
CONTENT = ROOT / "frontend" / "src" / "pages" / "admin" / "Content.tsx"
OBSERVABILITY_AGGREGATE = ROOT / "frontend" / "src" / "pages" / "admin" / "ObservabilityAggregate.tsx"
WIZARD_ROOT = ROOT / "frontend" / "src" / "components" / "generate"


def _stage_section(source: str, export_name: str) -> str:
    start = source.index(f"export const {export_name}: FieldDef[] = [")
    end = source.index("\n]\n", start)
    return source[start:end]


def _field_line(section: str, key: str) -> str:
    match = re.search(r"\{ key: '" + re.escape(key) + r"'.*?\},", section, re.DOTALL)
    assert match, f"missing field {key}"
    return match.group(0)


def test_admin_profiles_have_separate_card_image_model_dropdown():
    source = FIELD_CONFIGS.read_text(encoding="utf-8")
    images = _stage_section(source, "IMAGE_FIELDS")

    image_model = _field_line(images, "image_model")
    card_image_model = _field_line(images, "card_image_model")

    assert images.index("key: 'card_image_model'") > images.index("key: 'image_model'")
    assert "options: ['flux_pro', 'zturbo', 'wan_fast', 'wan_pro', 'seedream_lite']" in image_model
    assert "default: 'flux_pro'" in image_model

    assert "label: 'Card Image Model'" in card_image_model
    assert "type: 'dropdown'" in card_image_model
    assert "options: ['zturbo', 'flux_pro', 'wan_fast', 'wan_pro', 'seedream_lite', 'gpt_image_2']" in card_image_model
    assert "default: 'zturbo'" in card_image_model
    assert "gpt_image_2: 'GPT Image 2 (Premium)'" in card_image_model


def test_admin_word_detail_surfaces_gpt_enrichment_and_cost():
    source = WORD_DETAIL.read_text(encoding="utf-8")

    for field in [
        "dominant_emotional_reading",
        "composition_hint",
        "treatment_hint",
        "card_image_model",
    ]:
        assert field in source

    assert "GPT Enrichment" in source
    assert "Mnemonic (visual scene)" in source
    assert "Emotional reading" in source
    assert "Composition" in source
    assert "Treatment" in source
    assert "Layer 2 Planning Version" in source
    assert "Mini Story Beats" in source
    assert "Split Panel Brief" in source
    assert "Word Design Brief" in source
    assert "Mnemonic Hook" in source
    assert "Backend Template" in source
    assert "Direct Prompt Writer Model" in source
    assert "Direct Prompt Preview" in source
    assert "Summary" in source
    assert "formatLayer2EvalSummary" in source
    assert "gptEnrichmentRows.length > 0" in source

    assert "COST_PER_CARD: Record<string, number>" in source
    assert "zturbo: 0.004" in source
    assert "flux_pro: 0.025" in source
    assert "wan_fast: 0.024" in source
    assert "wan_pro: 0.060" in source
    assert "seedream_lite: 0.0275" in source
    assert "gpt_image_2: 0.050" in source
    assert "Number.isInteger(cost * 1000) ? 3 : 4" in source
    assert "toFixed(precision)" in source
    assert "Cost" in source


def test_admin_content_keeps_star_select_and_can_enrich_cost_from_jobs():
    source = CONTENT.read_text(encoding="utf-8")

    assert ".select('*')" in source
    assert "generation_jobs" in source
    assert "settings_override" in source
    assert "card_image_model" in source


def test_observability_aggregate_surfaces_layer2_backend_template():
    source = OBSERVABILITY_AGGREGATE.read_text(encoding="utf-8")

    assert "backend_template" in source
    assert "backendTemplate(event)" in source
    assert "layer2BackendTemplateLabel" in source


def test_user_facing_wizard_exposes_gpt_image_2_only_as_controlled_card_tier():
    wizard_sources = "\n".join(
        path.read_text(encoding="utf-8")
        for path in WIZARD_ROOT.rglob("*")
        if path.suffix in {".ts", ".tsx"}
    )

    assert "gpt_image_2" in wizard_sources
    assert "Premium Card Customize" in wizard_sources
    assert "card_premium" in wizard_sources
    assert "card_image_model" in wizard_sources
    assert "cardImageModel" in wizard_sources
