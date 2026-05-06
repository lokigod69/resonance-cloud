from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.card_layer2 import (  # noqa: E402
    ART_STYLE_DIRECTIVES,
    EXPOSED_V1_MEANING_STRATEGIES,
    EXPOSED_V1_PRESENTATION_FORMS,
    resolve_layer2,
    resolve_style_directive,
)


WORD_FACTS = {
    "word": "Heimweh",
    "translation": "homesickness",
    "image_scene": "A traveler sits on an unpacked suitcase beside a quiet apartment door.",
    "mnemonic": "Home weighs on you from far away.",
    "bridge_mnemonic": "heim sounds like home, pulling the scene toward homesickness",
    "etymology": "German Heim means home and Weh means pain.",
    "dominant_emotional_reading": "quiet ache",
}


def _resolve(**layer2):
    return resolve_layer2(
        layer2,
        word_facts=WORD_FACTS,
        art_style="surrealism",
    )


def test_all_exposed_v1_cells_resolve_to_short_image_bridge():
    for meaning_strategy in EXPOSED_V1_MEANING_STRATEGIES:
        for presentation_form in EXPOSED_V1_PRESENTATION_FORMS:
            result = _resolve(
                meaning_strategy=meaning_strategy,
                presentation_form=presentation_form,
                visual_intensity="balanced",
            )

            assert result.image_bridge
            assert len(result.image_bridge) <= 220
            assert result.user_choices["meaning_strategy"] == meaning_strategy
            assert result.user_choices["presentation_form"] == presentation_form
            assert result.resolved["renderer_profile"] == "balanced_teaching"


def test_named_v1_cells_compile_expected_internal_modes():
    cases = [
        ("clear_meaning", "single_scene", "literal", "single", "clean_iconic"),
        ("exaggerated_meaning", "single_scene", "embodied", "single", "embodied"),
        ("absurd_hook", "single_scene", "absurd", "single", "absurd_surreal"),
        ("sound_mnemonic", "split_panel", "mnemonic", "split", "split_contrast"),
        ("absurd_hook", "mini_story", "absurd", "multi_panel", "multi_panel_sequence"),
    ]

    for meaning, presentation, treatment, composition, creative_mode in cases:
        result = _resolve(
            meaning_strategy=meaning,
            presentation_form=presentation,
            visual_intensity="balanced",
        )

        assert result.resolved["meaning_strategy"] == meaning
        assert result.resolved["presentation_form"] == presentation
        assert result.resolved["treatment"] == treatment
        assert result.resolved["composition"] == composition
        assert result.resolved["creative_mode"] == creative_mode
        assert result.resolved["text_embedding_mode"] == "none"


def test_word_object_design_forces_embedded_word_and_stores_text_embedding_mode():
    result = _resolve(
        meaning_strategy="absurd_hook",
        presentation_form="word_object_design",
        visual_intensity="balanced",
    )

    assert result.resolved["meaning_strategy"] == "embedded_word"
    assert result.resolved["presentation_form"] == "word_object_design"
    assert result.resolved["text_embedding_mode"] == "word_as_matter"
    assert result.resolved["effective_text_embedding_mode"] == "word_as_matter"
    assert "word_object_design forced meaning_strategy to embedded_word" in result.snap_notes
    assert "Heimweh" in result.image_bridge
    assert result.text_directive is not None
    assert '"Heimweh" visibly readable' in result.text_directive
    assert "central to the composition" in result.text_directive
    assert "not a small label" in result.text_directive


def test_infographic_card_resolves_to_teaching_text_mode_and_allows_answer_text():
    result = _resolve(
        meaning_strategy="absurd_hook",
        presentation_form="infographic_card",
        visual_intensity="balanced",
    )

    assert result.resolved["meaning_strategy"] == "absurd_hook"
    assert result.resolved["presentation_form"] == "infographic_card"
    assert result.resolved["composition"] == "infographic"
    assert result.resolved["creative_mode"] == "educational_infographic"
    assert result.resolved["text_embedding_mode"] == "infographic_text"
    assert result.resolved["answer_visibility"] == "teaching_text_allowed"
    assert result.allow_target_word_in_prompt is True
    assert result.allow_translation_in_prompt is True
    assert "educational infographic" in result.image_bridge
    assert result.text_directive is not None
    assert "target word" in result.text_directive
    assert "translation" in result.text_directive


def test_clear_meaning_word_object_design_snaps_unless_user_selected_word_object_design():
    auto_result = resolve_layer2(
        {
            "meaning_strategy": "clear_meaning",
            "presentation_form": "word_object_design",
            "visual_intensity": "balanced",
        },
        word_facts=WORD_FACTS,
        art_style="realistic",
        explicit_user_choices={"meaning_strategy"},
    )
    explicit_result = resolve_layer2(
        {
            "meaning_strategy": "clear_meaning",
            "presentation_form": "word_object_design",
            "visual_intensity": "balanced",
        },
        word_facts=WORD_FACTS,
        art_style="realistic",
        explicit_user_choices={"meaning_strategy", "presentation_form"},
    )

    assert auto_result.resolved["meaning_strategy"] == "clear_meaning"
    assert auto_result.resolved["presentation_form"] == "single_scene"
    assert "clear_meaning + word_object_design snapped presentation_form to single_scene" in auto_result.snap_notes
    assert explicit_result.resolved["meaning_strategy"] == "embedded_word"
    assert explicit_result.resolved["presentation_form"] == "word_object_design"


def test_sound_mnemonic_missing_bridge_falls_back_to_mnemonic_with_note():
    facts = {**WORD_FACTS, "bridge_mnemonic": ""}
    result = resolve_layer2(
        {
            "meaning_strategy": "sound_mnemonic",
            "presentation_form": "split_panel",
            "visual_intensity": "balanced",
        },
        word_facts=facts,
        art_style="realistic",
    )

    assert "Home weighs on you" in result.image_bridge
    assert "sound_mnemonic missing bridge_mnemonic; used mnemonic fallback" in result.snap_notes


def test_etymology_origin_without_etymology_falls_back_to_clear_meaning():
    facts = {**WORD_FACTS, "etymology": ""}
    result = resolve_layer2(
        {
            "meaning_strategy": "etymology_origin",
            "presentation_form": "single_scene",
            "visual_intensity": "balanced",
        },
        word_facts=facts,
        art_style="realistic",
    )

    assert result.resolved["meaning_strategy"] == "clear_meaning"
    assert "etymology_origin missing etymology; fell back to clear_meaning" in result.snap_notes


def test_simple_visual_with_text_heavy_mode_snaps_to_balanced():
    result = _resolve(
        meaning_strategy="absurd_hook",
        presentation_form="word_object_design",
        visual_intensity="simple",
    )

    assert result.resolved["renderer_profile"] == "balanced_teaching"
    assert result.resolved["visual_intensity"] == "balanced"
    assert "simple visual_intensity snapped to balanced for text-heavy presentation" in result.snap_notes


def test_each_visual_intensity_maps_to_renderer_profile():
    expected = {
        "simple": "simple_visual",
        "balanced": "balanced_teaching",
        "cinematic": "cinematic_memory",
    }
    for visual_intensity, renderer_profile in expected.items():
        result = _resolve(
            meaning_strategy="clear_meaning",
            presentation_form="single_scene",
            visual_intensity=visual_intensity,
        )
        assert result.resolved["renderer_profile"] == renderer_profile


def test_at_least_twelve_art_styles_compile_to_short_directives():
    assert len(ART_STYLE_DIRECTIVES) >= 12
    for style in list(ART_STYLE_DIRECTIVES)[:12]:
        directive = resolve_style_directive(style)
        assert directive
        assert len(directive) <= 100
        assert style not in directive


def test_animation_art_styles_from_premium_ui_compile_to_directives():
    for style in ["rick_and_morty_style", "south_park_style", "pixar_3d"]:
        directive = resolve_style_directive(style)
        assert directive
        assert len(directive) <= 100
        assert "Style:" in directive


def test_legacy_and_random_art_style_aliases_resolve():
    assert resolve_style_directive("Photorealistic") == resolve_style_directive("realistic")
    assert resolve_style_directive("surreal_dreamlike") == resolve_style_directive("surrealism")
    assert resolve_style_directive("sketch_monochrome") == resolve_style_directive("pen_and_ink")
    assert resolve_style_directive("random") == resolve_style_directive("realistic")


def test_absent_card_layer2_returns_none_to_preserve_quick_generate():
    assert resolve_layer2(None, word_facts=WORD_FACTS, art_style="surrealism") is None
