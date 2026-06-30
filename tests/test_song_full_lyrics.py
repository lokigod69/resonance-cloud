from __future__ import annotations

from types import SimpleNamespace

import pytest

from cloud_engines.concept_engine.song_full import (
    GENERIC_INSTRUMENTAL_TAGS,
    LYRIC_MODE_TO_SONG_DEPTH,
    build_full_song_prompt,
    generate_full_song_lyrics,
)


def _sung_lines(lyrics: str) -> list[str]:
    return [
        line.strip()
        for line in lyrics.splitlines()
        if line.strip() and not line.strip().startswith("[")
    ]


def test_lyric_mode_maps_each_depth():
    assert LYRIC_MODE_TO_SONG_DEPTH == {
        "reliable": "simple",
        "contextual": "phrase",
        "creative": "story",
        "dramatic": "long",
    }


def test_prompts_are_positive_and_generic():
    for depth in ("simple", "phrase", "story", "long"):
        prompt = build_full_song_prompt(
            word="gurita",
            translation="octopus",
            language="Indonesian",
            language_code="id",
            depth=depth,
        )

        assert "gurita" in prompt
        assert "Indonesian" in prompt
        assert "[Interlude]" in prompt
        assert "[Instrumental Break]" in prompt
        assert "[Instrumental Solo]" in prompt
        # House rule: positive prompting only — no prohibitions, no banned styles,
        # no example dumps.
        assert "Do NOT" not in prompt
        assert "Never" not in prompt
        assert "avoid" not in prompt
        assert "Example outputs" not in prompt


def test_prompt_never_suggests_instrument_specific_solo_tags():
    prompt = build_full_song_prompt(
        word="gurita",
        translation="octopus",
        language="Indonesian",
        language_code="id",
        depth="long",
    )
    assert "[Guitar Solo]" not in prompt
    assert "[Drum Solo]" not in prompt


def test_depth_structure_scales_up_to_long():
    simple = build_full_song_prompt(
        word="gurita", translation="octopus", language="Indonesian",
        language_code="id", depth="simple",
    )
    story = build_full_song_prompt(
        word="gurita", translation="octopus", language="Indonesian",
        language_code="id", depth="story",
    )
    long = build_full_song_prompt(
        word="gurita", translation="octopus", language="Indonesian",
        language_code="id", depth="long",
    )

    # Long is the fullest: bridge + outro structure. Simple stays a short song.
    assert "[Outro]" in long
    assert "[Bridge]" in long
    assert "[Outro]" not in simple
    assert "[Bridge]" not in simple
    # Story sits in between: gains a bridge but is not the full long structure.
    assert "[Bridge]" in story
    assert "[Outro]" not in story


def test_prompt_includes_article_and_style_when_present():
    prompt = build_full_song_prompt(
        word="Hund",
        translation="dog",
        language="German",
        language_code="de",
        depth="long",
        article="der",
        music_caption="warm acoustic folk, gentle female vocal",
    )
    assert "der" in prompt
    assert "warm acoustic folk, gentle female vocal" in prompt


def test_generate_calls_model_without_generation_overrides():
    class FakeClient:
        def __init__(self) -> None:
            self.calls: list[dict[str, str]] = []

        def generate(self, **kwargs):
            self.calls.append(kwargs)
            return SimpleNamespace(
                content="[Verse]\nDi laut gurita berenang\n[Chorus]\nGurita, gurita\n[Interlude]",
                tokens_in=None,
                tokens_out=None,
                cost_usd=None,
                request_id=None,
                reasoning_tokens=None,
            )

    client = FakeClient()
    lyrics = generate_full_song_lyrics(
        word="gurita",
        translation="octopus",
        language="Indonesian",
        language_code="id",
        depth="long",
        llm_client=client,
        llm_model="test/model",
    )

    assert "gurita" in lyrics
    assert len(client.calls) == 1
    # No max_tokens / temperature / other generation overrides.
    assert set(client.calls[0]) == {"prompt", "model"}
    assert client.calls[0]["model"] == "test/model"


def test_generate_prepends_intro_with_article_and_word():
    class FakeClient:
        def generate(self, **kwargs):
            return SimpleNamespace(
                content="[Verse]\nDer treue Hund\n[Chorus]\nHund, Hund\n[Interlude]",
                tokens_in=None, tokens_out=None, cost_usd=None,
                request_id=None, reasoning_tokens=None,
            )

    lyrics = generate_full_song_lyrics(
        word="Hund",
        translation="dog",
        language="German",
        language_code="de",
        depth="long",
        article="der",
        llm_client=FakeClient(),
        llm_model="test/model",
    )

    assert lyrics.startswith("[Intro]\nder Hund")


def test_generate_does_not_duplicate_a_leading_intro():
    class FakeClient:
        def generate(self, **kwargs):
            return SimpleNamespace(
                content="[Intro]\ngurita\n\n[Verse]\nDi laut\n[Interlude]",
                tokens_in=None, tokens_out=None, cost_usd=None,
                request_id=None, reasoning_tokens=None,
            )

    lyrics = generate_full_song_lyrics(
        word="gurita",
        translation="octopus",
        language="Indonesian",
        language_code="id",
        depth="long",
        llm_client=FakeClient(),
        llm_model="test/model",
    )

    assert lyrics.count("[Intro]") == 1


def test_generate_adds_generic_instrumental_tag_when_needed():
    class FakeClient:
        def generate(self, **kwargs):
            return SimpleNamespace(
                content="[Verse]\nDi laut gurita berenang\n[Chorus]\nGurita, gurita",
                tokens_in=None, tokens_out=None, cost_usd=None,
                request_id=None, reasoning_tokens=None,
            )

    lyrics = generate_full_song_lyrics(
        word="gurita",
        translation="octopus",
        language="Indonesian",
        language_code="id",
        depth="long",
        llm_client=FakeClient(),
        llm_model="test/model",
    )

    assert any(tag in lyrics for tag in GENERIC_INSTRUMENTAL_TAGS)


def test_generate_requires_target_word_present():
    class FakeClient:
        def generate(self, **kwargs):
            # LLM returns a song that never sings the target word.
            return SimpleNamespace(
                content="[Verse]\nDi laut yang biru\n[Chorus]\nLaut, laut\n[Interlude]",
                tokens_in=None, tokens_out=None, cost_usd=None,
                request_id=None, reasoning_tokens=None,
            )

    # The forced intro guarantees the word is present, so generation still
    # produces a lyric that contains the target word.
    lyrics = generate_full_song_lyrics(
        word="gurita",
        translation="octopus",
        language="Indonesian",
        language_code="id",
        depth="long",
        llm_client=FakeClient(),
        llm_model="test/model",
    )
    assert "gurita" in lyrics
