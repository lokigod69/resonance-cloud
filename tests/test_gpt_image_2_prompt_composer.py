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


def test_layer2_image_bridge_appears_between_scene_and_answer_hidden_sentence():
    image_bridge = "Memory logic: one absurd scene makes the meaning stick."
    prompt = _prompt(image_bridge=image_bridge)

    scene_index = prompt.index("Scene:")
    bridge_index = prompt.index(image_bridge)
    answer_index = prompt.index("Do not write the target word")
    assert scene_index < bridge_index < answer_index


def test_layer2_text_directive_follows_image_bridge_for_word_object_design():
    image_bridge = 'Memory logic: render "Heimweh" as a sculptural object.'
    text_directive = "Render the target word as physical material; never write the translation."
    prompt = _prompt(
        word="Heimweh",
        translation="homesickness",
        image_bridge=image_bridge,
        text_directive=text_directive,
        allow_target_word_in_prompt=True,
    )

    assert prompt.index(image_bridge) < prompt.index(text_directive)
    assert "Heimweh" in prompt
    assert "You may render the target word as instructed" in prompt
    assert "Do not write the target word" not in prompt
    assert "direct answer/translation" in prompt


def test_layer2_prompt_still_bans_target_word_except_word_object_design():
    prompt = _prompt(
        word="Heimweh",
        translation="homesickness",
        image_scene="A suitcase with Heimweh written on it waits by the door.",
        image_bridge="Memory logic: Heimweh should feel like longing for home.",
        allow_target_word_in_prompt=False,
    )
    embedded_prompt = _prompt(
        word="Heimweh",
        translation="homesickness",
        image_scene="A suitcase waits by the door.",
        image_bridge='Memory logic: render "Heimweh" as a sculptural object.',
        allow_target_word_in_prompt=True,
    )

    assert "Heimweh" not in prompt
    assert "Heimweh" in embedded_prompt
    assert "direct answer/translation" in embedded_prompt


def test_layer2_bridge_target_word_removal_falls_back_to_meaning():
    prompt = _prompt(
        word="viral",
        translation="viral",
        image_scene="A glowing post spreads rapidly through a crowd of phones.",
        image_bridge="Memory logic: keep one direct visual moment focused on viral.",
        allow_target_word_in_prompt=False,
    )

    assert "focused on ." not in prompt
    assert "focused on the meaning" in prompt
    assert "viral." not in prompt.lower().split("memory logic:", 1)[1]


def test_layer2_prompt_with_bridge_style_and_long_scene_stays_under_cap():
    long_scene = " ".join(
        f"detail{i} with elaborate visual texture and background action"
        for i in range(120)
    )
    prompt = _prompt(
        word="ausweichen",
        translation="to dodge",
        image_scene=long_scene,
        image_bridge="Memory logic: a split-panel contrast makes the dodge readable.",
        style_directive="Style: dreamlike surreal composition but still readable.",
    )

    assert len(prompt) <= PROMPT_HARD_CAP
    assert "Memory logic:" in prompt
    assert "Style:" in prompt
    assert "direct answer/translation" in prompt


def test_layer2_non_realistic_style_prompt_does_not_start_with_photorealistic():
    prompt = _prompt(
        card_image_style="rick_and_morty_style",
        image_bridge="Memory logic: absurd animated contrast makes the meaning memorable.",
        style_directive="Style: sharp animated sci-fi comedy look.",
    )

    first_sentence = prompt.split(". ", 1)[0]
    assert not first_sentence.startswith("Photorealistic")
    assert "Rick-and-Morty-inspired" in first_sentence
    assert "language-learning image" not in first_sentence


def test_layer2_style_opening_tracks_selected_art_style():
    cases = [
        ("pixar_3d", "Pixar-like polished 3D animated"),
        ("pen_and_ink", "Pen-and-ink"),
        ("realistic", "Photorealistic"),
    ]
    for art_style, expected_opening in cases:
        prompt = _prompt(
            card_image_style=art_style,
            image_bridge="Memory logic: one direct visual moment teaches the meaning.",
            style_directive=f"Style: {expected_opening} look.",
        )

        first_sentence = prompt.split(". ", 1)[0]
        assert first_sentence.startswith(expected_opening)
        assert "vocabulary memory" in first_sentence


def test_word_object_design_prompt_requires_visible_central_target_word():
    prompt = _prompt(
        word="prejudice",
        translation="preconceived bias",
        card_image_style="pixar_3d",
        image_bridge='Memory logic: make "prejudice" the visual subject, formed from biased shapes.',
        style_directive="Style: polished 3D animated look.",
        text_directive=(
            'Make the target word "prejudice" visibly readable as a large physical '
            "typographic object in the scene, constructed from material or shape tied "
            "to the meaning. The word must be central to the composition, not a small label."
        ),
        allow_target_word_in_prompt=True,
    )

    assert "prejudice" in prompt
    assert "visibly readable" in prompt
    assert "central to the composition" in prompt
    assert "not a small label" in prompt
    assert "never write the direct answer/translation" in prompt
    assert "Do not write the target word" not in prompt


def test_word_object_design_prompt_stays_under_hard_cap_with_strong_directive():
    prompt = _prompt(
        word="prejudice",
        translation="preconceived bias",
        card_image_style="rick_and_morty_style",
        image_scene="A courtroom-like room where one side of a scale is loaded before anyone speaks.",
        image_bridge='Memory logic: make "prejudice" the visual subject, formed from material or shapes tied to preconceived bias.',
        style_directive="Style: Rick-and-Morty-inspired animated sci-fi comedy look.",
        text_directive=(
            'Make the target word "prejudice" visibly readable as a large physical '
            "typographic object in the scene, constructed from material tied to the "
            "meaning. The word must be central to the composition, not a small label."
        ),
        allow_target_word_in_prompt=True,
    )

    assert len(prompt) <= PROMPT_HARD_CAP
    assert "prejudice" in prompt
    assert "visibly readable" in prompt
    assert "never write the direct answer/translation" in prompt


def test_layer2_mini_story_beats_become_primary_scene_source():
    prompt = _prompt(
        word="freedom",
        translation="freedom",
        card_image_style="surrealism",
        image_scene="A generic person stands on a cliff.",
        image_bridge="Memory logic: three compact beats make the meaning memorable.",
        mini_story_beats=[
            "a person trapped behind bars",
            "the door opening",
            "the person stepping into a wide open landscape",
        ],
        layer2_planning_version="layer2_planning_v1",
    )

    assert "Mini story: three visible beats" in prompt
    assert "first, a person trapped behind bars" in prompt
    assert "second, the door opening" in prompt
    assert "third, the person stepping into a wide open landscape" in prompt
    assert "generic person stands on a cliff" not in prompt


def test_layer2_split_panel_brief_becomes_primary_scene_source():
    prompt = _prompt(
        word="freedom",
        translation="freedom",
        card_image_style="illustration",
        image_bridge="Memory logic: split-panel contrast makes the meaning readable.",
        split_panel_brief={
            "left": "a locked cage and visible constraint",
            "right": "open landscape and free movement",
            "divider": "soft visual transition",
        },
        layer2_planning_version="layer2_planning_v1",
    )

    assert "Split-panel contrast:" in prompt
    assert "left side shows a locked cage" in prompt
    assert "right side shows open landscape" in prompt
    assert "soft visual transition" in prompt


def test_layer2_word_design_brief_prioritizes_word_subject():
    prompt = _prompt(
        word="flowers",
        translation="flowers",
        card_image_style="realistic",
        image_bridge='Memory logic: make "flowers" the visual subject.',
        word_design_brief={
            "word_design_mode": "word_as_matter",
            "primary_subject": "The word FLOWERS is visibly readable as a large physical typographic object.",
            "material_logic": "Build the letters from actual flowers and stems.",
            "background_context": "a simple garden table",
        },
        allow_target_word_in_prompt=True,
        layer2_planning_version="layer2_planning_v1",
    )

    assert "Word as design:" in prompt
    assert "FLOWERS" in prompt
    assert "large physical typographic object" in prompt
    assert "central to the composition" in prompt
    assert "simple garden table" in prompt
    assert "never write the direct answer/translation" in prompt


def test_layer2_prompt_cleanup_repairs_broken_target_stripping_fragments():
    prompt = _prompt(
        word="viral",
        translation="viral",
        image_scene="A visible hook should lead into a clear scene of viral.",
        image_bridge="Memory logic: () teaching viral.",
        allow_target_word_in_prompt=False,
    )

    assert "lead into a clear scene of." not in prompt
    assert "teaching ." not in prompt
    assert "()" not in prompt
    assert "lead into a clear scene of the meaning" in prompt
    assert "teaching the meaning" in prompt


def test_layer2_hard_cap_preserves_structured_mini_story():
    long_scene = " ".join(
        f"background detail {i} with extra descriptive clutter"
        for i in range(120)
    )
    prompt = _prompt(
        word="freedom",
        translation="freedom",
        card_image_style="cinematic",
        image_scene=long_scene,
        image_bridge="Memory logic: three compact beats make the meaning memorable.",
        mini_story_beats=[
            "a locked cage",
            "a door opening",
            "a figure entering a wide open landscape",
        ],
        layer2_planning_version="layer2_planning_v1",
    )

    assert len(prompt) <= PROMPT_HARD_CAP
    assert "Mini story: three visible beats" in prompt
    assert "a locked cage" in prompt
    assert "a door opening" in prompt
    assert "wide open landscape" in prompt


def test_layer2_metadata_records_user_choices_resolution_notes_and_bridge():
    prompt = _prompt(image_bridge="Memory logic: a compact bridge.")
    metadata = build_gpt_image_2_card_metadata(
        final_provider_prompt=prompt,
        renderer_profile="balanced_teaching",
        renderer_profile_source="user_override",
        image_scene="A clean scene.",
        mnemonic="A mnemonic.",
        mnemonic_confidence="helpful",
        composition="multi_panel",
        treatment="absurd",
        creative_mode="multi_panel_sequence",
        text_embedding_mode="none",
        layer2_user_choices={
            "meaning_strategy": "absurd_hook",
            "presentation_form": "mini_story",
            "visual_intensity": "balanced",
        },
        layer2_resolved={
            "meaning_strategy": "absurd_hook",
            "presentation_form": "mini_story",
            "renderer_profile": "balanced_teaching",
        },
        layer2_snap_notes=["example note"],
        image_bridge="Memory logic: a compact bridge.",
    )

    assert metadata["layer2_user_choices"]["meaning_strategy"] == "absurd_hook"
    assert metadata["layer2_resolved"]["presentation_form"] == "mini_story"
    assert metadata["layer2_snap_notes"] == ["example note"]
    assert metadata["image_bridge"] == "Memory logic: a compact bridge."


def test_quick_generate_default_prompt_unchanged_when_card_layer2_absent():
    base = _prompt(card_image_style="Photorealistic")
    absent_layer2 = _prompt(
        card_image_style="surrealism",
        card_layer2=None,
        image_bridge=None,
        style_directive=None,
        text_directive=None,
    )

    assert absent_layer2 == base
    metadata = build_gpt_image_2_card_metadata(
        final_provider_prompt=absent_layer2,
        renderer_profile="balanced_teaching",
        renderer_profile_source="auto",
        image_scene="A clean scene.",
        mnemonic=None,
        mnemonic_confidence=None,
        composition="single",
        treatment="literal",
        creative_mode="clean_iconic",
        text_embedding_mode="none",
    )
    assert metadata["renderer_profile"] == "balanced_teaching"
    assert "layer2_user_choices" not in metadata
