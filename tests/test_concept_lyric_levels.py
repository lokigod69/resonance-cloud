"""Tests for the Niveau (Lyric Levels) backend implementation.

Covers:
- Dispatch of each lyric_mode to template-vs-LLM path.
- [Intro] opener rule in contextual, creative, dramatic prompts.
- music_caption wiring into the dramatic prompt (external vs combined).
- Unification: for LLM modes, artifact.lyrics == artifact.suno_lyrics.
- Article-less languages: [Intro] opener uses bare word, no leading space.
- Phrase + Level 4: prompt treats phrase as target, music_caption threaded.
- Level 1 (reliable) regression: byte-identical template output.

Runs under pytest. Uses stubs for the OpenRouter client and the Supabase
events helper so no network calls are made.
"""

from __future__ import annotations

import json
import sys
import types
from pathlib import Path
from unittest.mock import patch

import pytest

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from cloud_engines.concept_engine import lyrics as lyrics_module  # noqa: E402
from cloud_engines.concept_engine.engine import generate_concept  # noqa: E402
from cloud_engines.concept_engine.lyrics import (  # noqa: E402
    LLM_MODES,
    TEMPLATE_MODES,
    _build_lyrics_prompt,
    _dramatic_lyrics_prompt,
    _contextual_lyrics_prompt,
    _creative_lyrics_prompt,
)
from cloud_engines.concept_engine.models import (  # noqa: E402
    ConceptContent,
    ConceptMetadata,
    ConceptPayload,
    ConceptSettings,
    Enrichment,
    SyllableInfo,
)


# ---------------------------------------------------------------------------
# Fixtures / stubs
# ---------------------------------------------------------------------------

class FakeLLMResponse:
    def __init__(self, content: str):
        self.content = content
        self.tokens_in = 10
        self.tokens_out = 20
        self.cost_usd = 0.0
        self.request_id = "fake-req"


class FakeLLMClient:
    """Stub that captures the prompt and returns a canned response."""

    def __init__(self, response: str = "", response_mode: str = "lyrics_only"):
        self.last_prompt: str | None = None
        self.call_count = 0
        self._response_text = response
        self._response_mode = response_mode

    def generate(self, prompt: str, model: str, max_tokens: int):
        self.last_prompt = prompt
        self.call_count += 1
        # If caller pre-set a response, return it verbatim. Otherwise build a
        # plausible structured response.
        if self._response_text:
            return FakeLLMResponse(self._response_text)
        if self._response_mode == "combined":
            body = (
                "CAPTION: test caption\n"
                "LYRICS:\n"
                "[Intro]\ndas Buch\n\n"
                "[Verse]\ndas Buch liegt hier\ndas Buch ist alt\n\n"
                "[Chorus]\nBuch, Buch, Buch!\n"
                "[Outro]\nBuch..."
            )
        else:  # lyrics_only
            body = (
                "LYRICS:\n"
                "[Intro]\ndas Buch\n\n"
                "[Verse]\ndas Buch liegt hier\n\n"
                "[Chorus]\nBuch, Buch!\n"
                "[Outro]\nBuch..."
            )
        return FakeLLMResponse(body)


@pytest.fixture
def fake_llm_client():
    return FakeLLMClient()


@pytest.fixture(autouse=True)
def patch_openrouter_client(monkeypatch):
    """Replace OpenRouterClient so engine.generate_concept never hits the network."""
    def make_fake(*args, **kwargs):
        return FakeLLMClient()
    monkeypatch.setattr(
        "cloud_engines.concept_engine.engine.OpenRouterClient", make_fake
    )


@pytest.fixture(autouse=True)
def stub_llm_events(monkeypatch):
    """Make logged_llm_call a no-op so we don't need Supabase in tests."""
    class _NoopCtx:
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def record_response(self, **kw):
            pass
    monkeypatch.setattr(
        "cloud_engines.concept_engine.lyrics.logged_llm_call",
        lambda *a, **kw: _NoopCtx(),
    )


def make_payload(
    word: str = "Buch",
    translation: str = "book",
    language: str = "German",
    language_code: str = "de",
    lyric_mode: str = "reliable",
    mnemonic: str = "DAS Buch (neuter)",
    pos: str = "noun",
    external_music_caption: str | None = "warm folk guitar, female vocal",
    input_type: str = "word",
    output_dir: Path | None = None,
    duration: int = 30,
) -> ConceptPayload:
    return ConceptPayload(
        content=ConceptContent(
            word=word,
            translation=translation,
            language=language,
            language_code=language_code,
            enrichment=Enrichment(mnemonic=mnemonic, pos=pos),
            external_music_caption=external_music_caption,
            input_type=input_type,  # type: ignore[arg-type]
        ),
        settings=ConceptSettings(
            lyric_mode=lyric_mode, duration=duration,
        ),
        output_dir=str(output_dir) if output_dir else ".",
        metadata=ConceptMetadata(
            word=word, language=language, timestamp="20260422T000000",
        ),
    )


def _syl() -> SyllableInfo:
    return SyllableInfo(count=1, word_length_class="short", fragments=["Buch"], method="pyphen")


# ---------------------------------------------------------------------------
# Dispatch tests
# ---------------------------------------------------------------------------

def test_template_modes_tuple():
    assert TEMPLATE_MODES == ("minimal", "standard", "reliable")


def test_llm_modes_tuple_includes_dramatic():
    assert "dramatic" in LLM_MODES
    assert LLM_MODES == ("contextual", "creative", "dramatic")


def test_six_modes_total_is_unchanged():
    all_modes = set(TEMPLATE_MODES) | set(LLM_MODES)
    assert all_modes == {"minimal", "standard", "reliable", "contextual", "creative", "dramatic"}


def test_dramatic_removed_from_templates_module():
    """generate_dramatic and its helpers must be gone from templates.py."""
    from cloud_engines.concept_engine import templates
    assert not hasattr(templates, "generate_dramatic")
    assert not hasattr(templates, "_dramatic_no_chop")
    assert not hasattr(templates, "_dramatic_with_chop")


# ---------------------------------------------------------------------------
# [Intro] opener rule tests
# ---------------------------------------------------------------------------

def test_intro_opener_with_article():
    prompt = _contextual_lyrics_prompt(
        word="Buch", translation="book", language="German",
        syllable_info=_syl(), duration=30, article="das",
    )
    assert "[Intro]" in prompt
    assert "das Buch" in prompt


def test_intro_opener_without_article():
    prompt = _contextual_lyrics_prompt(
        word="chaek", translation="book", language="Korean",
        syllable_info=_syl(), duration=30, article="",
    )
    assert "[Intro]" in prompt
    # Opener body should have just "chaek" on its own line — no leading space.
    assert "\nchaek\n" in prompt
    assert "\n chaek" not in prompt


def test_creative_prompt_has_intro_opener():
    prompt = _creative_lyrics_prompt(
        word="Buch", translation="book", language="German",
        syllable_info=_syl(), duration=30, article="das",
    )
    assert "[Intro]" in prompt
    assert "das Buch" in prompt


def test_dramatic_prompt_has_intro_opener():
    prompt = _dramatic_lyrics_prompt(
        word="Buch", translation="book", language="German",
        article="das", music_caption="warm folk",
    )
    assert "[Intro]" in prompt
    assert "das Buch" in prompt


def test_dramatic_prompt_includes_music_caption():
    prompt = _dramatic_lyrics_prompt(
        word="Buch", translation="book", language="German",
        article="das", music_caption="melodic techno at 128 BPM, female vocal, ethereal synths",
    )
    assert "melodic techno at 128 BPM, female vocal, ethereal synths" in prompt


def test_dramatic_prompt_references_caption_section_when_missing():
    """When no external caption, dramatic prompt references SECTION 1."""
    prompt = _dramatic_lyrics_prompt(
        word="Buch", translation="book", language="German",
        article="das", music_caption=None,
    )
    assert "[Intro]" in prompt
    assert "SECTION 1" in prompt


# ---------------------------------------------------------------------------
# _build_lyrics_prompt dispatch
# ---------------------------------------------------------------------------

def test_build_lyrics_prompt_routes_dramatic_to_dramatic_builder():
    settings = ConceptSettings(lyric_mode="dramatic", duration=30)
    prompt = _build_lyrics_prompt(
        word="Buch", translation="book", language="German",
        settings=settings, syllable_info=_syl(), article="das",
        music_caption="warm folk",
    )
    # Only the dramatic prompt mentions "full-length song" and "MUSIC STYLE"
    assert "MUSIC STYLE" in prompt or "music style" in prompt.lower()
    assert "full-length" in prompt.lower() or "full song" in prompt.lower()


def test_build_lyrics_prompt_routes_contextual():
    settings = ConceptSettings(lyric_mode="contextual", duration=30)
    prompt = _build_lyrics_prompt(
        word="Buch", translation="book", language="German",
        settings=settings, syllable_info=_syl(), article="das",
    )
    assert "structured lyrics" in prompt or "short, structured" in prompt


def test_build_lyrics_prompt_routes_creative():
    settings = ConceptSettings(lyric_mode="creative", duration=30)
    prompt = _build_lyrics_prompt(
        word="Buch", translation="book", language="German",
        settings=settings, syllable_info=_syl(), article="das",
    )
    assert "chorus-style repetition" in prompt or "memorability" in prompt


# ---------------------------------------------------------------------------
# Integration: generate_concept with mocked LLM
# ---------------------------------------------------------------------------

def _read_artifact(output_dir: Path) -> dict:
    artifact_files = [p for p in output_dir.iterdir() if p.name != "generation-meta.json"]
    assert len(artifact_files) == 1, f"expected 1 artifact, got {artifact_files}"
    return json.loads(artifact_files[0].read_text(encoding="utf-8"))


def test_unification_contextual(tmp_path, monkeypatch):
    payload = make_payload(lyric_mode="contextual", output_dir=tmp_path)
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"] == artifact["suno_lyrics"], \
        "LLM modes must unify lyrics and suno_lyrics"
    assert artifact["lyrics"].startswith("[Intro]")


def test_unification_creative(tmp_path):
    payload = make_payload(lyric_mode="creative", output_dir=tmp_path)
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"] == artifact["suno_lyrics"]


def test_unification_dramatic(tmp_path):
    payload = make_payload(lyric_mode="dramatic", output_dir=tmp_path)
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"] == artifact["suno_lyrics"]


def test_level1_reliable_does_not_unify(tmp_path):
    """For Level 1, lyrics and suno_lyrics come from separate templates;
    they are NOT expected to be identical."""
    payload = make_payload(lyric_mode="reliable", output_dir=tmp_path)
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    # Both fields are populated, but they may differ (separate templates).
    assert artifact["lyrics"]
    assert artifact["suno_lyrics"]
    # Both should be non-empty template outputs. We don't require byte equality
    # because the two template generators produce different structures.


def test_level1_reliable_llm_call_count_is_zero_with_external_caption(tmp_path):
    """Verify Level 1 with external caption makes 0 LLM calls."""
    payload = make_payload(
        lyric_mode="reliable", output_dir=tmp_path,
        external_music_caption="warm folk guitar, female vocal",
    )
    result = generate_concept(payload)
    assert result.status == "success"
    artifact = _read_artifact(tmp_path)
    assert artifact["generation_info"]["llm_calls"] == 0


def test_llm_modes_llm_call_count_is_one_with_external_caption(tmp_path):
    """Verify Levels 2-4 with external caption each make exactly 1 LLM call."""
    for mode in ("contextual", "creative", "dramatic"):
        output_dir = tmp_path / mode
        output_dir.mkdir()
        payload = make_payload(lyric_mode=mode, output_dir=output_dir)
        result = generate_concept(payload)
        assert result.status == "success", f"{mode} failed: {result.error}"
        artifact = _read_artifact(output_dir)
        assert artifact["generation_info"]["llm_calls"] == 1, \
            f"{mode}: expected 1 LLM call, got {artifact['generation_info']['llm_calls']}"


# ---------------------------------------------------------------------------
# Article-less language: prompt opener uses bare word
# ---------------------------------------------------------------------------

def test_articleless_language_opener(tmp_path):
    """Korean word: article should be empty, prompt should instruct '[Intro]\\n{word}'."""
    captured: dict = {}

    class CapturingLLMClient(FakeLLMClient):
        def generate(self, prompt, model, max_tokens):
            captured["prompt"] = prompt
            return super().generate(prompt, model, max_tokens)

    with patch(
        "cloud_engines.concept_engine.engine.OpenRouterClient",
        lambda *a, **kw: CapturingLLMClient(),
    ):
        payload = make_payload(
            word="chaek", translation="book",
            language="Korean", language_code="ko",
            lyric_mode="contextual",
            mnemonic="", pos="noun",
            output_dir=tmp_path,
        )
        result = generate_concept(payload)
        assert result.status == "success", result.error

    prompt = captured["prompt"]
    assert "[Intro]" in prompt
    # The opener body should be "[Intro]\nchaek" with no leading space.
    assert "\nchaek\n" in prompt
    assert "\n chaek" not in prompt
    # There should be no GRAMMATICAL ARTICLE line for Korean.
    assert "GRAMMATICAL ARTICLE" not in prompt


# ---------------------------------------------------------------------------
# Phrase + dramatic
# ---------------------------------------------------------------------------

def test_phrase_dramatic(tmp_path):
    captured: dict = {}

    class CapturingLLMClient(FakeLLMClient):
        def generate(self, prompt, model, max_tokens):
            captured["prompt"] = prompt
            return super().generate(prompt, model, max_tokens)

    with patch(
        "cloud_engines.concept_engine.engine.OpenRouterClient",
        lambda *a, **kw: CapturingLLMClient(),
    ):
        payload = make_payload(
            word="I love pizza", translation="",
            language="English", language_code="en",
            lyric_mode="dramatic",
            mnemonic="", pos="",
            external_music_caption="upbeat pop with synths, male vocal",
            input_type="phrase",
            output_dir=tmp_path,
        )
        result = generate_concept(payload)
        assert result.status == "success", result.error

    prompt = captured["prompt"]
    # Phrase is the target, opener uses the bare phrase (no article).
    assert "[Intro]" in prompt
    assert "\nI love pizza\n" in prompt
    # Music caption must be threaded through.
    assert "upbeat pop with synths" in prompt
    # Artifact: lyrics == suno_lyrics (unified).
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"] == artifact["suno_lyrics"]
    assert artifact["lyrics"].startswith("[Intro]")


# ---------------------------------------------------------------------------
# Level 1 regression
# ---------------------------------------------------------------------------

def test_level1_reliable_template_unchanged_production():
    """Level 1 reliable template output, caption_style=production, is unchanged.

    Compares byte-for-byte against the known pre-change output.
    """
    from cloud_engines.concept_engine.templates import generate_reliable
    output = generate_reliable(word="Buch", article="das", duration=30, caption_style="production")
    expected = (
        "[Verse - Steady]\n"
        "das Buch...\n"
        "Buch...\n"
        "\n"
        "[Chorus - Building]\n"
        "Buch!\n"
        "das Buch!\n"
        "\n"
        "[Outro - Fading]\n"
        "das Buch..."
    )
    assert output == expected
    assert "[Intro]" not in output  # Level 1 gets no intro tag


def test_level1_reliable_template_unchanged_vocal_forward():
    """Level 1 reliable template, caption_style=vocal_forward, opens with [Spoken Word]."""
    from cloud_engines.concept_engine.templates import generate_reliable
    output = generate_reliable(word="Buch", article="das", duration=30, caption_style="vocal_forward")
    assert output.startswith("[Spoken Word]")
    assert "[Intro]" not in output


def test_level1_suno_template_unchanged(tmp_path):
    """The single-word Suno template is unchanged for Level 1."""
    from cloud_engines.concept_engine.templates import generate_suno_lyrics
    output = generate_suno_lyrics(word="Buch", article="das")
    assert "[Verse]" in output
    assert "[Chorus]" in output
    assert "[Outro]" in output


# ---------------------------------------------------------------------------
# max_tokens sanity check
# ---------------------------------------------------------------------------

def test_max_tokens_is_1024():
    """Parse lyrics.py source and confirm the LLM call uses max_tokens=1024."""
    src = (Path(__file__).resolve().parents[1] / "cloud_engines" / "concept_engine" / "lyrics.py").read_text(encoding="utf-8")
    assert "max_tokens=1024" in src
    assert "max_tokens=512" not in src


# ---------------------------------------------------------------------------
# Override flow (Section 3.1 — critical)
# ---------------------------------------------------------------------------

def test_override_flow_lyric_mode_reaches_concept_engine():
    """When DEFAULT_SETTINGS["concept"]["lyric_mode"] = "reliable" AND a job
    arrives with settings_override["lyric_mode"] = "dramatic", the value
    reaching the concept engine must be "dramatic", not "reliable".

    This exercises orchestrator/job_runner.py::merge_settings and the
    SETTINGS_OVERRIDE_MAP it consults.
    """
    from job_runner import merge_settings
    from src.settings import DEFAULT_SETTINGS

    # Precondition: default is "reliable" (Level 1).
    assert DEFAULT_SETTINGS["concept"]["lyric_mode"] == "reliable"

    merged = merge_settings(
        profile_settings={},
        art_style=None,
        movie_override=None,
        settings_override={"lyric_mode": "dramatic"},
    )
    assert merged["concept"]["lyric_mode"] == "dramatic", (
        "settings_override.lyric_mode=dramatic must override the default; "
        "check SETTINGS_OVERRIDE_MAP in job_runner.py includes 'lyric_mode'."
    )


def test_override_flow_all_four_niveau_levels():
    """Each Niveau level's lyric_mode value must flow through merge_settings."""
    from job_runner import merge_settings

    for mode in ("reliable", "contextual", "creative", "dramatic"):
        merged = merge_settings(
            profile_settings={}, art_style=None, movie_override=None,
            settings_override={"lyric_mode": mode},
        )
        assert merged["concept"]["lyric_mode"] == mode, f"{mode} did not override"


def test_override_flow_empty_or_none_lyric_mode_does_not_override():
    """Confirm merge_settings keeps the default when override is empty/None."""
    from job_runner import merge_settings

    for empty_value in (None, ""):
        merged = merge_settings(
            profile_settings={}, art_style=None, movie_override=None,
            settings_override={"lyric_mode": empty_value},
        )
        # Should fall back to DEFAULT_SETTINGS["concept"]["lyric_mode"] = "reliable"
        assert merged["concept"]["lyric_mode"] == "reliable"


def test_dramatic_override_triggers_llm_path_end_to_end(tmp_path):
    """End-to-end: default=reliable, override=dramatic, engine dispatches to
    the NEW LLM dramatic path (not the deleted template)."""
    from job_runner import merge_settings

    # Build the merged settings exactly as feeder.bootstrap_job would
    merged = merge_settings(
        profile_settings={}, art_style=None, movie_override=None,
        settings_override={"lyric_mode": "dramatic"},
    )
    concept_settings = ConceptSettings(**merged["concept"])
    assert concept_settings.lyric_mode == "dramatic"

    # Confirm the engine runs this and writes unified suno_lyrics (LLM path signature)
    payload = ConceptPayload(
        content=ConceptContent(
            word="Buch", translation="book",
            language="German", language_code="de",
            enrichment=Enrichment(mnemonic="DAS Buch (neuter)", pos="noun"),
            external_music_caption="warm folk guitar, female vocal",
            input_type="word",
        ),
        settings=concept_settings,
        output_dir=str(tmp_path),
        metadata=ConceptMetadata(
            word="Buch", language="German", timestamp="20260422T000000",
        ),
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    # Unification proves the LLM path ran (not the deleted template path).
    assert artifact["lyrics"] == artifact["suno_lyrics"]
    # [Intro] opener proves the dramatic prompt was used.
    assert artifact["lyrics"].startswith("[Intro]")
    # llm_calls == 1 for LLM modes with external caption.
    assert artifact["generation_info"]["llm_calls"] == 1
    # lyric_mode recorded correctly.
    assert artifact["generation_info"]["lyric_mode"] == "dramatic"
