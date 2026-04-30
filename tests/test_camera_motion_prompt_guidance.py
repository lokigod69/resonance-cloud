"""Regression tests for tier-aware camera_motion guidance and tense-vocabulary grounding.

Phase A — camera motion refinements: restrict static, tier-conditional camera
guidance, expanded examples, motion-from-one-source rule.

Phase B — tense vocabulary grounding: keep grounded dynamic verbs, drop
ballistic verbs, add explicit avoid-ballistic guidance.

Tests assert presence/absence in the assembled system prompt for both I2V and
T2V code paths. They are substring assertions on the final prompt text — the
substrings come from the spec, so the tests fail loudly if guidance regresses
or the I2V/T2V duplication drifts.
"""

from __future__ import annotations

import sys
from pathlib import Path

import pytest

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from cloud_engines.image_engine.models import ImageSettings  # noqa: E402
from cloud_engines.image_engine.prompts import (  # noqa: E402
    build_system_prompt,
    _transition_prompt_block,
    _output_schema_block,
    _output_schema_text_to_video_block,
)


def _settings(**overrides: object) -> ImageSettings:
    base = dict(
        creative_direction="cinematic",
        frame_narrative="auto",
        image_count="auto",
        art_style="auto",
        word_in_image=False,
        image_model="wan_fast",
    )
    base.update(overrides)
    return ImageSettings(**base)


def _build(text_to_video: bool) -> str:
    return build_system_prompt(
        word="Sturm",
        translation="storm",
        language="German",
        settings=_settings(),
        context=None,
        scene_count=3,
        aspect_ratio="16:9",
        image_count_raw="auto",
        text_to_video=text_to_video,
    )


# ─── Phase A1: restrict static guidance (both I2V and T2V) ────────────────


@pytest.mark.parametrize("text_to_video", [False, True])
def test_static_guidance_restricts_to_strong_subject_motion(text_to_video: bool) -> None:
    prompt = _build(text_to_video=text_to_video)

    # New restrictive sentence appears
    assert (
        'USE "static" ONLY when the subject provides strong, sustained motion'
        in prompt
    )
    # Explicit calm-tier ban appears
    assert 'NEVER use "static" with `scene_tier: "calm"`' in prompt
    # Old weak guidance is gone
    assert (
        'Only use "static" when absolute stillness serves the story'
        not in prompt
    )


# ─── Phase A2: tier-conditional camera guidance (both I2V and T2V) ────────


@pytest.mark.parametrize("text_to_video", [False, True])
def test_tier_conditional_camera_guidance_present(text_to_video: bool) -> None:
    prompt = _build(text_to_video=text_to_video)

    assert "Match camera energy to `scene_tier`" in prompt
    # Calm rule
    assert "calm: ALWAYS specify a non-static camera" in prompt
    # Tense cap on handheld speed
    assert "handheld at medium" in prompt
    assert "NEVER fast" in prompt


# ─── Phase A3: examples block (both I2V and T2V) ──────────────────────────


@pytest.mark.parametrize("text_to_video", [False, True])
def test_camera_examples_include_calm_tier_and_justified_static(
    text_to_video: bool,
) -> None:
    prompt = _build(text_to_video=text_to_video)

    assert "CAMERA MOTION EXAMPLES" in prompt
    # At least three calm-tier examples
    calm_lines = [
        line for line in prompt.splitlines() if "(calm tier)" in line
    ]
    assert len(calm_lines) >= 3, calm_lines
    # Justified static example present
    assert (
        "Vehicle driving past a locked composition (justified static)" in prompt
    )
    # Old generic example with "Wide establishing shot of a cityscape:" without tier
    # tag should be gone (the new version annotates it with "(calm tier)")
    assert (
        '- Wide establishing shot of a cityscape: type:' not in prompt
    )


# ─── Phase A4: motion-from-one-source rule (I2V only per spec) ────────────


def test_motion_from_one_source_rule_present_in_i2v() -> None:
    block = _transition_prompt_block()
    assert (
        "A scene MUST have motion from at least one source" in block
    )
    assert (
        "still photograph and fails the purpose of video" in block
    )


def test_motion_from_one_source_absent_in_t2v_block() -> None:
    """T2V has no parallel anti-hallucination block. Documented gap; rule
    intentionally not duplicated there. If a future change adds it to T2V,
    update this assertion."""
    from cloud_engines.image_engine.prompts import _text_to_video_prompt_block

    t2v = _text_to_video_prompt_block()
    assert "motion from at least one source" not in t2v


# ─── Duplication confirmation: I2V and T2V both received Phase A ──────────


def test_i2v_and_t2v_schema_blocks_both_carry_camera_changes() -> None:
    i2v = _output_schema_block(aspect_ratio="16:9", creative_direction="cinematic")
    t2v = _output_schema_text_to_video_block(
        aspect_ratio="16:9", creative_direction="cinematic"
    )

    for block in (i2v, t2v):
        assert (
            'USE "static" ONLY when the subject provides strong, sustained motion'
            in block
        )
        assert "Match camera energy to `scene_tier`" in block
        assert "CAMERA MOTION EXAMPLES" in block
        assert (
            "Vehicle driving past a locked composition (justified static)"
            in block
        )


# ─── Phase B1: tense-tier grounded verbs ──────────────────────────────────


def test_tense_tier_verbs_are_grounded() -> None:
    block = _transition_prompt_block()

    # Find the tense-tier verb line by its label
    assert "tense tier verbs:" in block
    # Locate the tense-tier list — it ends at the next bullet/paragraph
    tense_idx = block.find("tense tier verbs:")
    next_break = block.find(
        "For tense scenes, avoid ballistic", tense_idx
    )
    assert next_break > tense_idx, "could not locate tense verb list bounds"
    tense_section = block[tense_idx:next_break]

    # New grounded verbs present
    for verb in ("drives hard", "plants feet", "leans hard into", "surges forward"):
        assert verb in tense_section, (
            f"expected grounded verb {verb!r} in tense list, got: {tense_section!r}"
        )


# ─── Phase B2: ballistic verbs absent from tense-tier list ────────────────


def test_ballistic_verbs_absent_from_tense_tier_list() -> None:
    block = _transition_prompt_block()

    tense_idx = block.find("tense tier verbs:")
    next_break = block.find("For tense scenes, avoid ballistic", tense_idx)
    tense_section = block[tense_idx:next_break]

    # Banned verbs that previously encouraged unphysical motion. Note: the
    # generic "whips" is no longer in the tense list (replaced by "whips
    # around"); we check for the bare verb-as-token forms that used to appear.
    for verb in ("catapults", "lurches", "hurls", "plunges", "collapses", "shudders"):
        assert verb not in tense_section, (
            f"banned verb {verb!r} must not appear in tense-tier list: {tense_section!r}"
        )


# ─── Phase B2: explicit avoid-ballistic guidance present ──────────────────


def test_avoid_ballistic_guidance_present() -> None:
    block = _transition_prompt_block()

    assert "ballistic and unmoored language" in block
    # Sample of banned verbs explicitly enumerated in the avoid list
    for verb in ("catapults", "launches", "hurls", "lurches"):
        assert verb in block, (
            f"avoid-ballistic guidance should enumerate {verb!r}"
        )
    # Framing line
    assert "intense, not impossible" in block


# ─── Phase B3: tense worked example uses grounded verbs only ──────────────


def test_tense_worked_example_does_not_use_banned_verbs() -> None:
    block = _transition_prompt_block()

    # Locate the tense-tier video_prompt example
    start = block.find('- video_prompt (tense tier):')
    assert start >= 0, "tense-tier worked example missing"
    end = block.find('\n', start + 200)
    example = block[start:end]

    # Ensure the worked example does not itself contain banned ballistic verbs
    # (would teach exactly the failure we're trying to remove).
    for verb in ("catapults", "lurches", "hurls", "plunges", "collapses", "shudders"):
        assert verb not in example, (
            f"banned verb {verb!r} present in tense worked example: {example!r}"
        )


