from __future__ import annotations

from types import SimpleNamespace

import pytest

from cloud_engines.concept_engine.level_song import (
    GENERIC_INSTRUMENTAL_TAGS,
    LevelSongEntry,
    build_level_song_prompt,
    generate_level_song_lyrics,
)


def _sung_lines(lyrics: str) -> list[str]:
    return [
        line.strip()
        for line in lyrics.splitlines()
        if line.strip() and not line.strip().startswith("[")
    ]


def test_simple_level_song_uses_only_targets_and_generic_instrumental_tags():
    entries = [
        LevelSongEntry(target="Krokodil", gloss="crocodile"),
        LevelSongEntry(target="Nilpferd", gloss="hippopotamus"),
        LevelSongEntry(target="Krokodil", gloss="crocodile"),
    ]

    lyrics = generate_level_song_lyrics(
        entries=entries,
        language="German",
        language_code="de",
        depth="simple",
    )

    assert any(tag in lyrics for tag in GENERIC_INSTRUMENTAL_TAGS)
    assert lyrics.count("Krokodil") == 2
    assert lyrics.count("Nilpferd") == 1
    assert set(_sung_lines(lyrics)) == {"Krokodil", "Nilpferd"}


def test_level_song_prompts_are_positive_and_generic():
    entries = [
        LevelSongEntry(target="Krokodil", gloss="crocodile"),
        LevelSongEntry(target="Nilpferd", gloss="hippopotamus"),
    ]

    for depth in ("phrase", "story", "long"):
        prompt = build_level_song_prompt(
            entries=entries,
            language="German",
            language_code="de",
            depth=depth,
        )

        assert "German" in prompt
        assert "Krokodil = crocodile" in prompt
        assert "Nilpferd = hippopotamus" in prompt
        assert "[Interlude]" in prompt
        assert "[Instrumental Break]" in prompt
        assert "[Instrumental Solo]" in prompt
        assert "Do NOT" not in prompt
        assert "Never" not in prompt
        assert "avoid" not in prompt
        assert "Example outputs" not in prompt


def test_llm_depth_calls_model_without_generation_overrides():
    class FakeClient:
        def __init__(self) -> None:
            self.calls: list[dict[str, str]] = []

        def generate(self, **kwargs):
            self.calls.append(kwargs)
            return SimpleNamespace(
                content="[Verse]\nKrokodil tanzt\nNilpferd lacht\n[Interlude]",
                tokens_in=None,
                tokens_out=None,
                cost_usd=None,
                request_id=None,
                reasoning_tokens=None,
            )

    client = FakeClient()

    lyrics = generate_level_song_lyrics(
        entries=[
            LevelSongEntry(target="Krokodil", gloss="crocodile"),
            LevelSongEntry(target="Nilpferd", gloss="hippopotamus"),
        ],
        language="German",
        language_code="de",
        depth="phrase",
        llm_client=client,
        llm_model="test/model",
    )

    assert "Krokodil" in lyrics
    assert "Nilpferd" in lyrics
    assert len(client.calls) == 1
    assert set(client.calls[0]) == {"prompt", "model"}
    assert client.calls[0]["model"] == "test/model"


def test_llm_depth_requires_each_target_term():
    class FakeClient:
        def generate(self, **kwargs):
            return SimpleNamespace(
                content="[Verse]\nKrokodil tanzt\n[Interlude]",
                tokens_in=None,
                tokens_out=None,
                cost_usd=None,
                request_id=None,
                reasoning_tokens=None,
            )

    with pytest.raises(ValueError, match="missing target"):
        generate_level_song_lyrics(
            entries=[
                LevelSongEntry(target="Krokodil", gloss="crocodile"),
                LevelSongEntry(target="Nilpferd", gloss="hippopotamus"),
            ],
            language="German",
            language_code="de",
            depth="story",
            llm_client=FakeClient(),
            llm_model="test/model",
        )


def test_llm_depth_adds_generic_instrumental_tag_when_needed():
    class FakeClient:
        def generate(self, **kwargs):
            return SimpleNamespace(
                content="[Verse]\nKrokodil tanzt\nNilpferd lacht",
                tokens_in=None,
                tokens_out=None,
                cost_usd=None,
                request_id=None,
                reasoning_tokens=None,
            )

    lyrics = generate_level_song_lyrics(
        entries=[
            LevelSongEntry(target="Krokodil", gloss="crocodile"),
            LevelSongEntry(target="Nilpferd", gloss="hippopotamus"),
        ],
        language="German",
        language_code="de",
        depth="long",
        llm_client=FakeClient(),
        llm_model="test/model",
    )

    assert lyrics.endswith("[Interlude]")
