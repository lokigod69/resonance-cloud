"""Regression tests for Wan storyboard schema and prompt compilation."""

from __future__ import annotations

import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from cloud_engines.image_engine.models import (  # noqa: E402
    CameraMotion,
    ImagePromptData,
    Scene,
    WordRender,
)
from cloud_engines.image_engine.prompt_compiler import compile_scene_to_text  # noqa: E402
from cloud_engines.image_engine.prompts import build_system_prompt  # noqa: E402
from cloud_engines.image_engine.models import ImageSettings  # noqa: E402
from cloud_engines.image_engine.storyboard import _parse_storyboard_json  # noqa: E402


def _image_prompt(**overrides: object) -> ImagePromptData:
    data = {
        "subject_identity": "young woman with fair skin, blue eyes, dark wavy hair, gentle smile",
        "action_state": "gently smiles",
        "environment": "expansive green meadow with distant hills under clear sky",
        "composition": "wide-angle panoramic framing, full body small in frame, eye-level perspective",
        "lighting": "golden hour sunlight from the side, warm and even, soft shadow falloff",
        "material_detail": (
            "natural skin texture even at distance, fine hair detail, soft cotton sweater fabric, "
            "dewy grass blades, distant atmospheric haze"
        ),
        "mood_palette": "peaceful and expansive, emerald green and sky blue with warm golden cast",
        "style_medium_override": None,
        "continuity_anchor": None,
        "change_request": None,
        "aspect_ratio": "16:9",
        "text_element": None,
    }
    data.update(overrides)
    return ImagePromptData(**data)


def _scene(scene_number: int, image_prompt: ImagePromptData) -> Scene:
    return Scene(
        scene_number=scene_number,
        description="test scene",
        image_prompt=image_prompt,
        word_render=WordRender(enabled=False),
        camera_motion=CameraMotion(
            type="static",
            direction="locked off",
            speed="slow",
            description="static camera",
        ),
        video_prompt="Subject remains visually consistent throughout the shot.",
        transition_prompt=None,
        suggested_duration=8,
        duration_rationale="standard scene pacing",
    )


def test_image_prompt_accepts_new_shape_and_ignores_legacy_extra_fields():
    prompt = ImagePromptData(
        subject_identity="same person",
        action_state="stands still",
        environment="plain studio",
        composition="medium shot, eye-level, standard lens, centered",
        lighting="soft window light, neutral, low contrast",
        material_detail="natural skin texture, cotton shirt, matte painted wall",
        mood_palette="calm, neutral gray and pale blue",
        style_medium_override=None,
        subject="legacy field should be ignored",
        scene="legacy field should be ignored",
        colors=["legacy"],
    )

    dumped = prompt.model_dump()
    assert "subject" not in dumped
    assert "scene" not in dumped
    assert "colors" not in dumped
    assert prompt.style_medium_override is None


def test_scene_one_requires_null_continuity_and_change_fields():
    with pytest.raises(ValidationError):
        _scene(
            1,
            _image_prompt(
                continuity_anchor="same person",
                change_request="different action",
            ),
        )


def test_scene_two_requires_continuity_and_change_fields():
    with pytest.raises(ValidationError):
        _scene(2, _image_prompt())

    scene = _scene(
        2,
        _image_prompt(
            continuity_anchor="same young woman in the same meadow setting",
            change_request="she is now seated examining a wildflower",
        ),
    )
    assert scene.image_prompt.continuity_anchor
    assert scene.image_prompt.change_request


def test_compile_t2i_uses_new_fields_and_style_lookup():
    scene = {
        "art_style": "photorealistic",
        "image_prompt": _image_prompt().model_dump(),
    }

    text = compile_scene_to_text(
        scene,
        has_reference_image=False,
        use_color_palette=True,
    )

    assert text.startswith(
        "young woman with fair skin, blue eyes, dark wavy hair, gentle smile gently smiles"
    )
    assert "Materials: natural skin texture even at distance" in text
    assert "documentary photography, available light" in text
    assert "Create a high-quality image of" not in text
    assert "In the style of" not in text
    assert "Style:" not in text
    assert "Avoid:" not in text
    assert "Reference context:" not in text
    assert "DO NOT" not in text


def test_compile_i2i_leads_with_affirmative_preserve_change_semantics():
    scene = {
        "art_style": "photorealistic",
        "image_prompt": _image_prompt(
            action_state="examines a wildflower",
            environment="softly blurred meadow background",
            continuity_anchor="same young woman in the same meadow setting wearing the same cream sweater",
            change_request="she is now seated examining a wildflower, framed in medium close-up instead of wide shot",
        ).model_dump(),
    }

    text = compile_scene_to_text(
        scene,
        has_reference_image=True,
        use_color_palette=False,
    )

    assert text.startswith(
        "Use image 1 as the identity anchor for young woman with fair skin, blue eyes, dark wavy hair, gentle smile."
    )
    assert "Keep the same same young woman in the same meadow setting" in text
    assert "Change: she is now seated examining a wildflower" in text
    assert text.count("young woman with fair skin, blue eyes, dark wavy hair, gentle smile") == 2
    assert "Mood: peaceful and expansive." in text
    assert "Reference context:" not in text
    assert "DO NOT" not in text


def test_system_prompt_uses_new_image_prompt_guidance_and_schema():
    prompt = build_system_prompt(
        word="Gesicht",
        translation="face",
        language="German",
        settings=ImageSettings(
            creative_direction="literal",
            frame_narrative="auto",
            image_count="auto",
            art_style="auto",
            word_in_image=False,
            image_model="wan_fast",
        ),
        context=None,
        scene_count=3,
        aspect_ratio="16:9",
        image_count_raw="auto",
    )

    assert "=== IMAGE PROMPT CONSTRUCTION GUIDANCE ===" in prompt
    assert '"subject_identity"' in prompt
    assert '"style_medium_override": null' in prompt
    assert '"style_medium"' not in prompt
    assert '"subject": "<primary subject/focal point>"' not in prompt
    assert "photorealistic ->" not in prompt


def test_system_prompt_requests_scene_tier_and_motion_tier_guidance():
    prompt = build_system_prompt(
        word="Sturm",
        translation="storm",
        language="German",
        settings=ImageSettings(
            creative_direction="cinematic",
            frame_narrative="auto",
            image_count="auto",
            art_style="auto",
            word_in_image=False,
            image_model="wan_fast",
        ),
        context=None,
        scene_count=3,
        aspect_ratio="16:9",
        image_count_raw="auto",
    )

    assert '"scene_tier": "<calm | standard | tense>"' in prompt
    assert "Pick `tense` when the scene depicts conflict" in prompt
    assert "MOTION BUDGET: Layered" in prompt
    assert "Subtle, naturalistic motion only" not in prompt
    assert "The scene should LOOP well" not in prompt
    assert "remain consistent throughout the shot" in prompt


def test_parse_storyboard_defaults_unknown_scene_tier_to_standard():
    raw = """
    {
      "word": "Sturm",
      "translation": "storm",
      "language": "German",
      "creative_direction": "cinematic",
      "frame_narrative": "action",
      "art_style": "photorealistic",
      "scene_count": 1,
      "visual_concept": "storm on a bridge",
      "shared_palette": ["gray", "yellow"],
      "shared_motif": "rain",
      "scenes": [
        {
          "scene_number": 1,
          "description": "worker braces in storm",
          "scene_tier": "hyper",
          "image_prompt": {
            "subject_identity": "worker in yellow hard hat",
            "action_state": "braces against wind",
            "environment": "rain-slick bridge",
            "composition": "medium wide shot",
            "lighting": "storm lightning",
            "material_detail": "wet steel, rough high-vis vest fabric",
            "mood_palette": "cold gray with yellow accent",
            "style_medium_override": null,
            "continuity_anchor": null,
            "change_request": null,
            "aspect_ratio": "16:9",
            "text_element": null
          },
          "word_render": {"enabled": false},
          "camera_motion": {
            "type": "push_in",
            "direction": "toward worker",
            "speed": "medium",
            "description": "pushes toward the worker"
          },
          "video_prompt": "The worker braces against the storm. His yellow hard hat remains consistent throughout the shot.",
          "transition_prompt": null,
          "suggested_duration": 6,
          "duration_rationale": "primary action beat"
        }
      ]
    }
    """

    storyboard = _parse_storyboard_json(raw)
    assert storyboard.scenes[0].scene_tier == "standard"


def test_auto_art_style_defaults_to_photorealistic():
    prompt = build_system_prompt(
        word="Gesicht",
        translation="face",
        language="German",
        settings=ImageSettings(
            creative_direction="literal",
            frame_narrative="auto",
            image_count="auto",
            art_style="auto",
            word_in_image=False,
            image_model="wan_fast",
        ),
        context=None,
        scene_count=3,
        aspect_ratio="16:9",
        image_count_raw="auto",
    )

    assert 'Default to "photorealistic"' in prompt
    assert "Choose ONE art style from this list" not in prompt
    assert "photorealistic, oil_painting, watercolor" not in prompt


def test_provocative_system_prompt_does_not_seed_artist_names():
    prompt = build_system_prompt(
        word="Kuh",
        translation="cow",
        language="German",
        settings=ImageSettings(
            creative_direction="provocative",
            frame_narrative="auto",
            image_count="auto",
            art_style="auto",
            word_in_image=False,
            image_model="wan_fast",
        ),
        context=None,
        scene_count=3,
        aspect_ratio="16:9",
        image_count_raw="auto",
    )
    prompt_lower = prompt.lower()

    assert "magritte" not in prompt_lower
    assert "dali" not in prompt_lower
    assert "dalí" not in prompt_lower
    assert "ernst" not in prompt_lower
    assert "think:" not in prompt_lower
    assert "examples of good visually arresting vocabulary scenes" not in prompt_lower
    assert '"cow" ->' not in prompt_lower
    assert "=== provocative ===" in prompt_lower


def test_disabled_word_in_composition_does_not_request_word_integration():
    prompt = build_system_prompt(
        word="Gesicht",
        translation="face",
        language="German",
        settings=ImageSettings(
            creative_direction="movie",
            frame_narrative="auto",
            image_count="auto",
            art_style="auto",
            word_in_image=False,
            image_model="wan_fast",
        ),
        context=None,
        scene_count=3,
        aspect_ratio="16:9",
        image_count_raw="auto",
    )

    prompt_lower = prompt.lower()
    assert "integrate the word" not in prompt_lower
    assert "word integration" not in prompt_lower
    assert "word integrated into the scene" not in prompt_lower
