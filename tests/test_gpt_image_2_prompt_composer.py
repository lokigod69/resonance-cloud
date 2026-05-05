from __future__ import annotations

import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.gpt_card_prompts import (  # noqa: E402
    PROMPT_HARD_CAP,
    RendererProfile,
    build_gpt_image_2_card_metadata,
    build_gpt_image_2_prompt,
    resolve_renderer_profile,
)


FORBIDDEN_LEAKS = [
    "vocabulary-card image for learning",
    "Target word:",
    "Translation:",
    "Composition:",
    "Treatment:",
    "Creative mode:",
    "Text/embedding mode:",
    "Register note:",
    "No visible text, letters, captions, signage, UI labels",
    "speech bubbles, thought bubbles",
]


def _prompt(**overrides: object) -> str:
    data = {
        "word": "links abbiegen",
        "translation": "turn left",
        "language": "German",
        "pos": "phrase",
        "image_scene": "A compact car turns through a rainy city intersection, its front wheels angled left under a green traffic arrow.",
        "mnemonic": "Left links to a leftward link in the road.",
        "mnemonic_confidence": "helpful",
        "dominant_emotional_reading": "decisive movement",
        "composition_hint": "single",
        "treatment_hint": "literal",
        "card_image_style": "Photorealistic",
        "renderer_profile": "balanced_teaching",
    }
    data.update(overrides)
    return build_gpt_image_2_prompt(**data)


def test_auto_renderer_profile_defaults_to_balanced_teaching():
    assert resolve_renderer_profile(None, None) == RendererProfile.BALANCED_TEACHING


def test_balanced_teaching_prompt_uses_d2_shape_and_image_scene():
    prompt = _prompt(
        composition_hint="multi_panel",
        treatment_hint="absurd",
        card_image_style="Editorial",
    )

    assert prompt.startswith("Photorealistic 16:9 image for a language-learning memory card.")
    assert "Visual meaning to depict: turn left." in prompt
    assert "Scene:" in prompt
    assert "front wheels angled left" in prompt
    assert "Do not write the target word or direct answer/translation inside the image." in prompt
    assert len(prompt) <= PROMPT_HARD_CAP
    for phrase in FORBIDDEN_LEAKS:
        assert phrase not in prompt


def test_simple_visual_prompt_is_meaning_only_and_omits_image_scene():
    prompt = _prompt(
        word="ausrutschen",
        translation="to slip",
        renderer_profile="simple_visual",
        image_scene=(
            "A commuter's boot skids on glossy wet train-platform tile while "
            "their arms fly outward to regain balance."
        ),
        mnemonic="A sudden skid makes the meaning stick.",
    )

    assert prompt.startswith("Photorealistic 16:9 image.")
    assert "Depict this meaning clearly: to slip." in prompt
    assert "ausrutschen" not in prompt
    assert "commuter's boot skids" not in prompt
    assert "Do not write the target word or the direct answer/translation inside the image." in prompt


def test_cinematic_memory_prompt_uses_d4_shape_and_image_scene():
    prompt = _prompt(
        word="Heimweh",
        translation="homesickness",
        renderer_profile="cinematic_memory",
        image_scene="A traveler sits on an unpacked suitcase in a dim apartment, holding a mug while morning light falls on an untouched bed.",
        mnemonic="Home weighs on you when you are away.",
    )

    assert prompt.startswith("Photorealistic cinematic 16:9 image for a language-learning memory card.")
    assert "Visual meaning to depict: homesickness." in prompt
    assert "Scene: A traveler sits on an unpacked suitcase" in prompt
    assert "film-still moment" in prompt
    assert "Heimweh" not in prompt
    for phrase in FORBIDDEN_LEAKS:
        assert phrase not in prompt


def test_final_prompt_uses_image_scene_not_mnemonic_as_scene_source():
    prompt = _prompt(
        word="Heimweh",
        translation="homesickness",
        image_scene="A traveler sits on an unpacked suitcase in a dim apartment, holding a mug while morning light falls on an untouched bed.",
        mnemonic="Home weighs on you when you are away.",
    )

    assert "unpacked suitcase" in prompt
    assert "Home weighs" not in prompt


def test_all_renderer_profiles_include_answer_hidden_instruction():
    for profile in ["simple_visual", "balanced_teaching", "cinematic_memory"]:
        prompt = _prompt(renderer_profile=profile)
        assert "Do not write the target word" in prompt
        assert "No visible text, letters, captions" not in prompt
        assert "speech bubbles, thought bubbles" not in prompt


def test_final_prompt_strips_target_word_if_scene_leaks_it():
    prompt = _prompt(
        word="ojala",
        translation="hopefully / I wish",
        image_scene="A person looks upward and silently wishes for ojalá as rain clouds part above a bus stop.",
        mnemonic=None,
        mnemonic_confidence=None,
    )

    assert "ojala" not in prompt.lower()
    assert "hopefully / I wish" in prompt


def test_final_prompt_remains_short_by_trimming_unusually_long_scene():
    long_scene = " ".join(
        f"detail{i} with elaborate visual texture and background action"
        for i in range(120)
    )
    prompt = _prompt(
        word="ausweichen",
        translation="to dodge",
        image_scene=long_scene,
    )

    assert len(prompt) <= PROMPT_HARD_CAP
    assert "ausweichen" not in prompt
    assert "Visual meaning to depict:" in prompt
    assert "Scene:" in prompt


def test_card_metadata_separates_scene_mnemonic_and_layer2_text_modes():
    prompt = _prompt(
        word="정",
        translation="deep emotional bond / affection built over time",
        image_scene="Two elderly neighbors exchange a repaired bowl across a sunlit apartment hallway.",
        mnemonic="Care accumulates into a bond.",
        mnemonic_confidence="essential",
        text_embedding_mode="word_as_form",
    )

    metadata = build_gpt_image_2_card_metadata(
        final_provider_prompt=prompt,
        renderer_profile="cinematic_memory",
        renderer_profile_source="auto",
        image_scene="Two elderly neighbors exchange a repaired bowl across a sunlit apartment hallway.",
        mnemonic="Care accumulates into a bond.",
        mnemonic_confidence="essential",
        composition="single",
        treatment="embodied",
        creative_mode="embodied",
        text_embedding_mode="word_as_form",
    )

    assert metadata["prompt_version"] == "quick_generate_v1"
    assert metadata["renderer_profile"] == "cinematic_memory"
    assert metadata["renderer_profile_source"] == "auto"
    assert metadata["image_scene"] == metadata["card_scene_displayed"]
    assert metadata["mnemonic"] == "Care accumulates into a bond."
    assert metadata["layer2_candidate_text_mode"] is True
    assert metadata["answer_visibility"] == "hidden"
    assert metadata["final_provider_prompt_sha256"]
    assert "word_as_form" not in prompt


def test_null_mnemonic_confidence_suppresses_displayed_mnemonic():
    metadata = build_gpt_image_2_card_metadata(
        final_provider_prompt=_prompt(mnemonic=None, mnemonic_confidence=None),
        renderer_profile="balanced_teaching",
        renderer_profile_source="auto",
        image_scene="A clean scene.",
        mnemonic="Filler hook that should not display.",
        mnemonic_confidence=None,
        composition="single",
        treatment="literal",
        creative_mode="clean_iconic",
        text_embedding_mode="none",
    )

    assert metadata["mnemonic"] is None
    assert metadata["displayed_mnemonic"] is None
