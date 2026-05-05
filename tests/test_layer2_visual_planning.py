from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.layer2_visual_planning import build_layer2_visual_plan  # noqa: E402


BASE_PLAN = {
    "prompt_version": "quick_generate_v1",
    "image_scene": "A person opens a cage door and steps into a wide sunlit field.",
    "mnemonic": "Free as a bird.",
    "mnemonic_confidence": "helpful",
    "etymology": "",
    "usage_example": {"target": "", "l1": ""},
    "composition": "single",
    "treatment": "literal",
    "creative_mode": "clean_iconic",
    "text_embedding_mode": "none",
    "renderer_profile": "balanced_teaching",
    "renderer_profile_source": "auto",
    "single_image_teachable": True,
    "dominant_emotional_reading": "release from constraint",
    "register_note": None,
    "rationale_summary": "A cage opening makes freedom visually clear.",
    "answer_visibility": "hidden",
}


def test_absent_card_layer2_keeps_visual_card_plan_unchanged():
    result = build_layer2_visual_plan(
        dict(BASE_PLAN),
        card_layer2=None,
        word="freedom",
        translation="freedom",
        bridge_mnemonic="",
        etymology="",
        pos="noun",
    )

    assert result == BASE_PLAN
    assert "layer2_planning_version" not in result


def test_mini_story_produces_visible_beats_and_scene_sequence():
    result = build_layer2_visual_plan(
        dict(BASE_PLAN),
        card_layer2={
            "meaning_strategy": "absurd_hook",
            "presentation_form": "mini_story",
            "visual_intensity": "balanced",
        },
        word="freedom",
        translation="freedom",
        bridge_mnemonic="",
        etymology="",
        pos="noun",
    )

    assert result["layer2_planning_version"] == "layer2_planning_v1"
    assert result["presentation_form"] == "mini_story"
    assert len(result["mini_story_beats"]) == 3
    assert "Three visible beats" in result["image_scene"]
    assert "first" in result["image_scene"].lower()
    assert "second" in result["image_scene"].lower()
    assert "third" in result["image_scene"].lower()


def test_split_panel_produces_left_right_brief_and_soft_contrast_scene():
    result = build_layer2_visual_plan(
        dict(BASE_PLAN),
        card_layer2={
            "meaning_strategy": "clear_meaning",
            "presentation_form": "split_panel",
            "visual_intensity": "balanced",
        },
        word="freedom",
        translation="freedom",
        bridge_mnemonic="",
        etymology="",
        pos="noun",
    )

    brief = result["split_panel_brief"]
    assert brief["left"]
    assert brief["right"]
    assert brief["divider"] == "soft visual transition"
    assert "soft visual transition" in result["image_scene"]
    assert "left side" in result["image_scene"].lower()
    assert "right side" in result["image_scene"].lower()


def test_word_object_design_prioritizes_typographic_brief_and_mode():
    result = build_layer2_visual_plan(
        dict(BASE_PLAN),
        card_layer2={
            "meaning_strategy": "clear_meaning",
            "presentation_form": "word_object_design",
            "visual_intensity": "balanced",
        },
        word="freedom",
        translation="freedom",
        bridge_mnemonic="",
        etymology="",
        pos="noun",
    )

    assert result["presentation_form"] == "word_object_design"
    assert result["word_design_mode"] in {"environmental_typography", "word_as_matter"}
    assert result["word_design_brief"]["primary_subject"].startswith("The word FREEDOM")
    assert result["image_scene"].startswith("Word as design:")
    assert "primary subject" in result["image_scene"]


def test_mnemonic_hook_wordplay_bridge_for_disease():
    result = build_layer2_visual_plan(
        {
            **BASE_PLAN,
            "image_scene": "A person lies awake in discomfort.",
            "mnemonic": "Dis-ease means not at ease.",
        },
        card_layer2={
            "meaning_strategy": "sound_mnemonic",
            "presentation_form": "single_scene",
            "visual_intensity": "balanced",
        },
        word="disease",
        translation="illness",
        bridge_mnemonic="dis-ease = not at ease",
        etymology="",
        pos="noun",
    )

    hook = result["mnemonic_hook"]
    assert hook["hook_type"] == "wordplay_bridge"
    assert "dis-ease" in hook["hook_text"]
    assert hook["quality"] == "strong"
    assert result["hook_type"] == "wordplay_bridge"
    assert result["hook_quality"] == "strong"
    assert "not at ease" in result["image_scene"]


def test_mnemonic_hook_for_freedom_is_not_fake_phonetic():
    result = build_layer2_visual_plan(
        dict(BASE_PLAN),
        card_layer2={
            "meaning_strategy": "sound_mnemonic",
            "presentation_form": "split_panel",
            "visual_intensity": "balanced",
        },
        word="freedom",
        translation="freedom",
        bridge_mnemonic="free as a bird",
        etymology="",
        pos="noun",
    )

    hook = result["mnemonic_hook"]
    assert hook["hook_type"] in {"semantic_mnemonic", "morpheme_bridge"}
    assert hook["hook_type"] != "phonetic_bridge"
    assert result["split_panel_brief"]["left"]
    assert result["split_panel_brief"]["right"]


def test_mnemonic_hook_records_clear_meaning_fallback_instead_of_forcing_sound():
    result = build_layer2_visual_plan(
        {
            **BASE_PLAN,
            "image_scene": "A small neutral object sits on a table.",
            "mnemonic": "",
        },
        card_layer2={
            "meaning_strategy": "sound_mnemonic",
            "presentation_form": "single_scene",
            "visual_intensity": "balanced",
        },
        word="the",
        translation="the",
        bridge_mnemonic="",
        etymology="",
        pos="article",
    )

    hook = result["mnemonic_hook"]
    assert hook["hook_type"] == "fallback_clear_meaning"
    assert hook["quality"] == "fallback"
    assert hook["fallback_reason"] == "no_phonetic_hook"
