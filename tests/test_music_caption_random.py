from __future__ import annotations

from cloud_engines.concept_engine import caption
from cloud_engines.concept_engine.models import ConceptSettings


def test_random_caption_prompt_draws_from_editable_seed_pool(monkeypatch):
    seeds = iter(["gypsy jazz", "bossa nova"])
    monkeypatch.setattr(caption._RANDOM_CHOOSER, "choice", lambda pool: next(seeds))

    settings = ConceptSettings(genre="auto", vocal_gender="female", caption_style="production")

    first = caption.build_caption_prompt_for_combined("Krokodil", "crocodile", "German", settings)
    second = caption.build_caption_prompt_for_combined("Krokodil", "crocodile", "German", settings)

    assert len(caption.RANDOM_GENRE_INSPIRATION_POOL) >= 30
    assert "gypsy jazz" in caption.RANDOM_GENRE_INSPIRATION_POOL
    assert "bossa nova" in caption.RANDOM_GENRE_INSPIRATION_POOL
    assert "Random inspiration seed: gypsy jazz" in first
    assert "Random inspiration seed: bossa nova" in second
    assert "elaborate, blend, or extend this seed" in first


def test_production_prompts_ask_for_rich_caption_dimensions_without_fixed_examples(monkeypatch):
    monkeypatch.setattr(caption._RANDOM_CHOOSER, "choice", lambda pool: "vintage soul")
    random_settings = ConceptSettings(genre="auto", vocal_gender="female", caption_style="production")
    manual_settings = ConceptSettings(genre="pop", vocal_gender="female", caption_style="production")

    random_prompt = caption.build_caption_prompt_for_combined("Krokodil", "crocodile", "German", random_settings)
    manual_prompt = caption.build_caption_prompt_for_combined("Krokodil", "crocodile", "German", manual_settings)

    for prompt in (random_prompt, manual_prompt):
        assert "specific sub-style" in prompt
        assert "instrumentation" in prompt
        assert "production texture" in prompt
        assert "tempo feel" in prompt
        assert "clear, forward" in prompt
        assert "Example outputs" not in prompt
        assert "clear diction" not in prompt
        assert "Do NOT" not in prompt
        assert "Under 25" not in prompt

    assert "melodic German female vocal" in random_prompt
    assert "melodic German female vocal" in manual_prompt


def test_rich_caption_is_preserved_inside_suno_style_budget():
    settings = ConceptSettings(genre="auto", vocal_gender="female", caption_style="production")
    rich_caption = (
        "vintage soul revue, brushed snare pocket, warm electric piano, upright bass, "
        "tight horn stabs, room-mic ambience, tape warmth, melodic German female vocal, "
        "clear forward lead, gospel-tinged chorus response, celebratory, intimate, live-band glow"
    )

    result = caption.parse_caption_from_combined(rich_caption, None, "German", settings)

    assert result.caption == rich_caption
    assert len(result.caption) < 1000


def test_manual_artist_name_prompt_keeps_explicit_omit_name_guard():
    settings = ConceptSettings(
        genre="Taylor Swift",
        vocal_gender="female",
        caption_style="production",
    )

    prompt = caption.build_caption_prompt_for_combined("Krokodil", "crocodile", "German", settings)

    assert "Treat the Genre value as user-provided inspiration" in prompt
    assert "leave the name out of the output" in prompt
    assert "descriptive style label" in prompt
    assert "melodic German female vocal" in prompt
