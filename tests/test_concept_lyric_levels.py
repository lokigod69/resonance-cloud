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
from pathlib import Path

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
def patch_openrouter_client(monkeypatch, fake_llm_client):
    """Replace OpenRouterClient so engine.generate_concept uses our fake.

    The engine instantiates one client per call to generate_concept(); the
    fixture hands it the same FakeLLMClient instance the test sees, so tests
    can inspect fake_llm_client.call_count and .last_prompt directly.
    """
    monkeypatch.setattr(
        "cloud_engines.concept_engine.engine.OpenRouterClient",
        lambda *a, **kw: fake_llm_client,
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
# Prompt-level checks — [Intro] instruction is GONE from all three prompts.
# The opener is now guaranteed by post-processing, not by asking the LLM.
# ---------------------------------------------------------------------------

def test_contextual_prompt_has_no_intro_instruction():
    prompt = _contextual_lyrics_prompt(
        word="Buch", translation="book", language="German",
        syllable_info=_syl(), duration=30, article="das",
    )
    assert "[Intro]" not in prompt
    assert "STRUCTURE RULE" not in prompt
    # Article line still present (separate concern, kept as-is).
    assert "das Buch" in prompt


def test_contextual_prompt_without_article_has_no_intro_instruction():
    prompt = _contextual_lyrics_prompt(
        word="chaek", translation="book", language="Korean",
        syllable_info=_syl(), duration=30, article="",
    )
    assert "[Intro]" not in prompt
    assert "STRUCTURE RULE" not in prompt
    assert "GRAMMATICAL ARTICLE" not in prompt


def test_creative_prompt_has_no_intro_instruction():
    prompt = _creative_lyrics_prompt(
        word="Buch", translation="book", language="German",
        syllable_info=_syl(), duration=30, article="das",
    )
    assert "[Intro]" not in prompt
    assert "STRUCTURE RULE" not in prompt
    assert "das Buch" in prompt


def test_dramatic_prompt_has_no_intro_instruction():
    prompt = _dramatic_lyrics_prompt(
        word="Buch", translation="book", language="German",
        article="das", music_caption="warm folk",
    )
    assert "[Intro]" not in prompt
    assert "STRUCTURE RULE" not in prompt
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
    assert "SECTION 1" in prompt
    assert "[Intro]" not in prompt


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


def test_level1_reliable_llm_call_count_is_zero_with_external_caption(tmp_path, fake_llm_client):
    """Verify Level 1 with external caption makes 0 LLM calls.

    Asserts both the engine's bookkeeping (llm_calls in generation_info) AND
    the actual invocation count on the fake client — they must agree.
    """
    payload = make_payload(
        lyric_mode="reliable", output_dir=tmp_path,
        external_music_caption="warm folk guitar, female vocal",
    )
    result = generate_concept(payload)
    assert result.status == "success"
    artifact = _read_artifact(tmp_path)
    assert artifact["generation_info"]["llm_calls"] == 0
    assert fake_llm_client.call_count == 0


def test_llm_modes_llm_call_count_is_one_with_external_caption(tmp_path, fake_llm_client):
    """Verify Levels 2-4 with external caption each make exactly 1 LLM call.

    Asserts both the engine's bookkeeping AND the actual invocation count
    on the fake client. Resets call_count between modes because the same
    fake client is shared within the test.
    """
    for mode in ("contextual", "creative", "dramatic"):
        output_dir = tmp_path / mode
        output_dir.mkdir()
        fake_llm_client.call_count = 0
        payload = make_payload(lyric_mode=mode, output_dir=output_dir)
        result = generate_concept(payload)
        assert result.status == "success", f"{mode} failed: {result.error}"
        artifact = _read_artifact(output_dir)
        assert artifact["generation_info"]["llm_calls"] == 1, \
            f"{mode}: expected 1 LLM call in bookkeeping, got {artifact['generation_info']['llm_calls']}"
        assert fake_llm_client.call_count == 1, \
            f"{mode}: expected 1 actual LLM invocation, got {fake_llm_client.call_count}"


# ---------------------------------------------------------------------------
# Article-less language: prompt opener uses bare word
# ---------------------------------------------------------------------------

def test_articleless_language_opener(tmp_path, fake_llm_client):
    """Korean word: no article → final artifact opens with '[Intro]\\nchaek\\n\\n'.

    The prompt no longer mentions [Intro] (that instruction was removed). The
    deterministic prepend is responsible for the opener.
    """
    payload = make_payload(
        word="chaek", translation="book",
        language="Korean", language_code="ko",
        lyric_mode="contextual",
        mnemonic="", pos="noun",
        output_dir=tmp_path,
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error

    prompt = fake_llm_client.last_prompt
    # Prompt-level checks: [Intro] instruction removed, no phantom article.
    assert "[Intro]" not in prompt
    assert "STRUCTURE RULE" not in prompt
    assert "GRAMMATICAL ARTICLE" not in prompt

    # Artifact-level check: opener is prepended with bare word, no leading space.
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"].startswith("[Intro]\nchaek\n\n")
    assert "[Intro]\n chaek" not in artifact["lyrics"]


# ---------------------------------------------------------------------------
# Phrase + dramatic
# ---------------------------------------------------------------------------

def test_phrase_dramatic(tmp_path, fake_llm_client):
    """Phrase + dramatic level: opener uses the bare phrase; caption is threaded.

    Prompt no longer mentions [Intro]; the deterministic prepend inserts
    '[Intro]\\nI love pizza\\n\\n' at the top of the final lyrics.
    """
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

    prompt = fake_llm_client.last_prompt
    # [Intro] instruction is gone from the prompt.
    assert "[Intro]" not in prompt
    assert "STRUCTURE RULE" not in prompt
    # Target phrase is referenced as the TARGET WORD; music caption threaded.
    assert "I love pizza" in prompt
    assert "upbeat pop with synths" in prompt

    # Artifact: lyrics == suno_lyrics (unified) and opens with the deterministic intro.
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"] == artifact["suno_lyrics"]
    assert artifact["lyrics"].startswith("[Intro]\nI love pizza\n\n")


# ---------------------------------------------------------------------------
# Level 1 regression — golden comparison of full generate_concept() output
# ---------------------------------------------------------------------------

_LEVEL1_GOLDEN_PATH = (
    Path(__file__).resolve().parent / "fixtures" / "level1_golden.json"
)


def _build_canonical_reliable_payload(output_dir: Path) -> ConceptPayload:
    """Canonical Level 1 payload used to capture and compare the golden."""
    return ConceptPayload(
        content=ConceptContent(
            word="Arzt",
            translation="doctor",
            language="German",
            language_code="de",
            enrichment=Enrichment(mnemonic="DER Arzt (masculine)", pos="noun"),
            external_music_caption="melodic indie pop at 120 BPM, female vocal, bright",
            input_type="word",
        ),
        settings=ConceptSettings(
            lyric_mode="reliable",
            duration=30,
        ),
        output_dir=str(output_dir),
        metadata=ConceptMetadata(
            word="Arzt", language="German", timestamp="20260422T000000",
        ),
    )


def test_level_1_regression_vs_main(tmp_path):
    """Level 1 full-engine output is byte-identical to the stored golden.

    Captures drift in any part of the reliable path: template text,
    suno template, article resolution, or engine bookkeeping. Seeded
    so generate_suno_lyrics's random article placement is deterministic.
    """
    import random as _random

    golden = json.loads(_LEVEL1_GOLDEN_PATH.read_text(encoding="utf-8"))
    _random.seed(42)
    payload = _build_canonical_reliable_payload(tmp_path)
    result = generate_concept(payload)
    assert result.status == "success", result.error

    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"] == golden["lyrics"], (
        "Level 1 lyrics drifted from golden — investigate before regenerating fixture."
    )
    assert artifact["suno_lyrics"] == golden["suno_lyrics"], (
        "Level 1 suno_lyrics drifted from golden."
    )
    # generation_info: compare the stable fields (llm_calls, sources, article_used)
    for key in ("llm_calls", "lyrics_source", "caption_source", "article_used", "lyric_mode"):
        assert artifact["generation_info"][key] == golden["generation_info"][key], (
            f"generation_info.{key} drifted: {artifact['generation_info'][key]!r} vs {golden['generation_info'][key]!r}"
        )


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


# ---------------------------------------------------------------------------
# Opener contract — the deterministic [Intro] prepend always fires
# ---------------------------------------------------------------------------
#
# These tests mock the LLM to return output that does NOT already start with
# the correct [Intro] block. They prove the post-processor guarantees the
# opener regardless of what the LLM emits.

def _set_raw_lyrics_response(fake_llm_client, raw_lyrics: str) -> None:
    """Make the fake client return a LYRICS:-prefixed response verbatim."""
    fake_llm_client._response_text = f"LYRICS:\n{raw_lyrics}"


def test_opener_prepended_when_llm_returns_verse_only(tmp_path, fake_llm_client):
    """LLM emits [Verse] with no [Intro] → opener is prepended."""
    _set_raw_lyrics_response(
        fake_llm_client,
        "[Verse]\nSomething else entirely\nMore lyrics",
    )
    payload = make_payload(
        word="Arzt", translation="doctor",
        language="German", language_code="de",
        mnemonic="DER Arzt (masculine)", pos="noun",
        lyric_mode="dramatic",
        output_dir=tmp_path,
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"].startswith("[Intro]\nder Arzt\n\n")
    assert "[Verse]\nSomething else entirely" in artifact["lyrics"]


def test_opener_overrides_llm_variant_intro_tag(tmp_path, fake_llm_client):
    """LLM emits '[Intro - Dramatic]' multi-line → defensive strip + prepend.

    The final output must contain exactly ONE [Intro] section, and it must
    be our deterministic form — not the LLM's variant-tagged intro.
    """
    _set_raw_lyrics_response(
        fake_llm_client,
        "[Intro - Dramatic]\nder Arzt\nsomething\n\n[Verse]\nbody",
    )
    payload = make_payload(
        word="Arzt", translation="doctor",
        language="German", language_code="de",
        mnemonic="DER Arzt (masculine)", pos="noun",
        lyric_mode="dramatic",
        output_dir=tmp_path,
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    lyrics = artifact["lyrics"]
    # Deterministic opener at the top.
    assert lyrics.startswith("[Intro]\nder Arzt\n\n")
    # LLM's variant tag and its extra content line are stripped.
    assert "[Intro - Dramatic]" not in lyrics
    assert "something" not in lyrics
    # Exactly one [Intro] section (case-insensitive count of "[intro").
    assert lyrics.lower().count("[intro") == 1


def test_opener_overrides_llm_intro_with_wrong_word(tmp_path, fake_llm_client):
    """LLM emits [Intro] with the WRONG word → our opener replaces it."""
    _set_raw_lyrics_response(
        fake_llm_client,
        "[Intro]\nDIFFERENT WORD\n\n[Verse]\nbody",
    )
    payload = make_payload(
        word="Arzt", translation="doctor",
        language="German", language_code="de",
        mnemonic="DER Arzt (masculine)", pos="noun",
        lyric_mode="dramatic",
        output_dir=tmp_path,
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    lyrics = artifact["lyrics"]
    assert lyrics.startswith("[Intro]\nder Arzt\n\n")
    assert "DIFFERENT WORD" not in lyrics
    assert lyrics.lower().count("[intro") == 1


def test_opener_articleless_korean_has_no_leading_space(tmp_path, fake_llm_client):
    """Korean (article="") → opener is '[Intro]\\nchaek\\n\\n' (no leading space)."""
    _set_raw_lyrics_response(
        fake_llm_client,
        "[Verse]\nchaek is a book\n",
    )
    payload = make_payload(
        word="chaek", translation="book",
        language="Korean", language_code="ko",
        mnemonic="", pos="noun",
        lyric_mode="contextual",
        output_dir=tmp_path,
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    assert artifact["lyrics"].startswith("[Intro]\nchaek\n\n")
    assert "[Intro]\n chaek" not in artifact["lyrics"]


def test_opener_phrase_uses_bare_phrase(tmp_path, fake_llm_client):
    """Phrase input (article="") → opener is '[Intro]\\n{phrase}\\n\\n'.

    Also exercises the defensive strip: the LLM's variant intro tag is
    stripped and replaced by the deterministic opener.
    """
    _set_raw_lyrics_response(
        fake_llm_client,
        "[Intro - Flowing]\nWrong\n\n[Verse]\nTest\n",
    )
    payload = make_payload(
        word="I love pizza", translation="",
        language="English", language_code="en",
        mnemonic="", pos="",
        lyric_mode="creative",
        input_type="phrase",
        output_dir=tmp_path,
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    lyrics = artifact["lyrics"]
    assert lyrics.startswith("[Intro]\nI love pizza\n\n")
    assert "[Intro - Flowing]" not in lyrics
    assert "Wrong" not in lyrics
    assert "[Verse]\nTest" in lyrics


def test_opener_single_intro_when_llm_already_correct(tmp_path, fake_llm_client):
    """LLM already emits '[Intro]\\nder Arzt\\n\\n[Verse]...' → exactly ONE [Intro]."""
    _set_raw_lyrics_response(
        fake_llm_client,
        "[Intro]\nder Arzt\n\n[Verse]\nbody",
    )
    payload = make_payload(
        word="Arzt", translation="doctor",
        language="German", language_code="de",
        mnemonic="DER Arzt (masculine)", pos="noun",
        lyric_mode="dramatic",
        output_dir=tmp_path,
    )
    result = generate_concept(payload)
    assert result.status == "success", result.error
    artifact = _read_artifact(tmp_path)
    lyrics = artifact["lyrics"]
    assert lyrics.startswith("[Intro]\nder Arzt\n\n")
    assert lyrics.lower().count("[intro") == 1
