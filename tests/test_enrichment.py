"""Tests for the enrichment post-processing helpers.

Covers defensive clean-up applied after the LLM JSON parse:
- Leading target-language article stripped from `translation`.
- Base-language articles and homograph content words preserved.
- German nouns force-capitalized; non-noun POS untouched.
- Defensive: empty strings, None, single characters, apostrophe contractions.
- Integration: run_enrichment wires the helpers into the full flow.
"""

from __future__ import annotations

import asyncio
import json
import sys
from pathlib import Path
from unittest.mock import AsyncMock, MagicMock, patch

import pytest

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from src.services import enrichment as enrichment_mod  # noqa: E402
from src.services.enrichment import (  # noqa: E402
    _capitalize_german_noun,
    _strip_target_article,
    run_enrichment,
)


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# --- _strip_target_article: legitimate stripping ----------------------------

class TestStripTargetArticleHappyPath:
    def test_strips_german_definite_article(self):
        assert _strip_target_article("der parrot", "de", "en") == "parrot"

    def test_strips_german_indefinite_article(self):
        assert _strip_target_article("eine Katze", "de", "en") == "Katze"

    def test_strips_case_insensitive(self):
        # Use `das` — unlike `die`/`der`, it does not homograph with any
        # base-language protected token, so the case-insensitive article
        # match is exercised in isolation from the protection logic.
        assert _strip_target_article("DAS Kind", "de", "en") == "Kind"
        assert _strip_target_article("Das Kind", "de", "en") == "Kind"
        assert _strip_target_article("das Kind", "de", "en") == "Kind"

    def test_strips_french_apostrophe_contraction(self):
        assert _strip_target_article("l'amour", "fr", "en") == "amour"

    def test_strips_italian_apostrophe_contraction(self):
        assert _strip_target_article("un'amica", "it", "en") == "amica"

    def test_strips_spanish_article(self):
        assert _strip_target_article("la casa", "es", "en") == "casa"

    def test_strips_italian_article(self):
        assert _strip_target_article("il gatto", "it", "en") == "gatto"

    def test_strips_french_article(self):
        assert _strip_target_article("le chat", "fr", "en") == "chat"

    def test_strips_german_prefix_before_capitalized_noun(self):
        assert _strip_target_article("der Papagei", "de", "en") == "Papagei"


# --- _strip_target_article: homograph / base-language protection ------------

class TestStripTargetArticleHomographProtection:
    """Target-language articles that collide with base-language content words
    must NOT be stripped. These are the BLOCK-severity cases from review."""

    # Italian `i` vs. English pronoun "I"
    def test_italian_i_does_not_strip_english_pronoun(self):
        assert _strip_target_article("I go", "it", "en") == "I go"

    def test_italian_i_does_not_strip_english_pronoun_run(self):
        assert _strip_target_article("I run", "it", "en") == "I run"

    def test_italian_i_does_not_strip_english_pronoun_think(self):
        assert _strip_target_article("I think", "it", "en") == "I think"

    # German `die` vs. English verb "die"
    def test_german_die_does_not_strip_english_verb_alone(self):
        assert _strip_target_article("die alone", "de", "en") == "die alone"

    def test_german_die_does_not_strip_english_verb_out(self):
        assert _strip_target_article("die out", "de", "en") == "die out"

    def test_german_die_does_not_strip_english_verb_hard(self):
        assert _strip_target_article("die hard", "de", "en") == "die hard"

    # Portuguese `a` vs. English article "a"
    def test_portuguese_a_does_not_strip_english_article_house(self):
        assert _strip_target_article("a house", "pt", "en") == "a house"

    def test_portuguese_a_does_not_strip_english_article_pear(self):
        assert _strip_target_article("a pear", "pt", "en") == "a pear"

    # Portuguese `as` vs. English conjunction "as"
    def test_portuguese_as_does_not_strip_english_conjunction_if(self):
        assert _strip_target_article("as if", "pt", "en") == "as if"

    def test_portuguese_as_does_not_strip_english_conjunction_soon(self):
        assert _strip_target_article("as soon as", "pt", "en") == "as soon as"

    def test_portuguese_as_does_not_strip_english_conjunction_well(self):
        assert _strip_target_article("as well", "pt", "en") == "as well"

    # Additional cross-collision probes
    def test_portuguese_o_does_not_strip_english_vocative(self):
        # English "o" is a rare vocative but still protected.
        assert _strip_target_article("o brother", "pt", "en") == "o brother"

    def test_italian_le_does_not_strip_french_article(self):
        # User learns Italian, speaks French. Translation "le chat" is the
        # correct French rendering. Italian article set contains `le`, but
        # French protected set also contains `le` — must stay.
        assert _strip_target_article("le chat", "it", "fr") == "le chat"

    def test_french_de_does_not_strip_spanish_preposition(self):
        # Spanish `de` is a preposition; French has no `de` article, so this
        # is really just confirming unrelated prepositions pass through.
        assert _strip_target_article("de casa", "fr", "es") == "de casa"


# --- _strip_target_article: base-language article preservation --------------

class TestStripTargetArticleBasePreserved:
    def test_preserves_base_language_articles_spanish_base_target_english(self):
        # User learns English, speaks Spanish. Translation "la casa" is in
        # Spanish. Target-language article set is English ({a, an, the});
        # `la` is not in that set, so it stays. Also `la` is in Spanish
        # protected tokens, so belt-and-braces preserved.
        assert _strip_target_article("la casa", "en", "es") == "la casa"

    def test_preserves_base_language_articles_english_base_target_portuguese(self):
        # Reviewer fix: previously this test used target="es" where `a` is
        # not in the Spanish article set, so it passed vacuously. Switching
        # to target="pt" makes `a` an actual Portuguese article candidate.
        # The English protected set must keep "a pear" intact.
        assert _strip_target_article("a pear", "pt", "en") == "a pear"

    def test_preserves_when_only_article_no_following_word(self):
        assert _strip_target_article("der", "de", "en") == "der"
        assert _strip_target_article("la", "it", "en") == "la"


# --- _strip_target_article: defensive + formatting edges --------------------

class TestStripTargetArticleDefensive:
    def test_handles_leading_whitespace(self):
        assert _strip_target_article("  der Hund", "de", "en") == "Hund"

    def test_handles_multi_space_between_article_and_noun(self):
        assert _strip_target_article("der  Hund", "de", "en") == "Hund"

    def test_returns_unchanged_when_no_article_prefix(self):
        assert _strip_target_article("parrot", "de", "en") == "parrot"
        assert _strip_target_article("hello world", "de", "en") == "hello world"

    def test_empty_string_returns_empty(self):
        assert _strip_target_article("", "de", "en") == ""

    def test_none_passthrough(self):
        assert _strip_target_article(None, "de", "en") is None

    def test_non_string_passthrough(self):
        assert _strip_target_article(123, "de", "en") == 123

    def test_unknown_target_language_no_op(self):
        assert _strip_target_article("der parrot", "xx", "en") == "der parrot"

    def test_unknown_base_language_still_strips_target(self):
        # Unknown base = empty protected set; target article strip still fires.
        assert _strip_target_article("der Hund", "de", "xx") == "Hund"

    def test_single_character_translation(self):
        assert _strip_target_article("a", "en", "es") == "a"

    def test_articleless_target_language_no_op(self):
        assert _strip_target_article("the bird", "ko", "en") == "the bird"

    def test_apostrophe_branch_non_empty_guard_bare_contraction(self):
        # Reviewer flagged: "l' " (article + trailing whitespace, nothing
        # after). Previously this returned empty string; must now return
        # the original input unchanged.
        result = _strip_target_article("l' ", "fr", "en")
        assert result == "l' " or (isinstance(result, str) and result.strip() != "")

    def test_apostrophe_preserves_when_no_content_after(self):
        # Pure bare article with no remainder.
        assert _strip_target_article("l'", "fr", "en") == "l'"

    @pytest.mark.parametrize(
        "translation,target,base",
        [
            ("der parrot", "de", "en"),
            ("I go", "it", "en"),
            ("die alone", "de", "en"),
            ("a house", "pt", "en"),
            ("as if", "pt", "en"),
            ("l'amour", "fr", "en"),
            ("l' ", "fr", "en"),
            ("der", "de", "en"),
            ("hello", "de", "en"),
            ("the bird", "ko", "en"),
            ("la casa", "en", "es"),
            (" ", "de", "en"),
        ],
    )
    def test_never_returns_empty_for_non_empty_input(self, translation, target, base):
        result = _strip_target_article(translation, target, base)
        # For non-empty input, the helper must never produce an empty string.
        assert result != ""
        if isinstance(result, str):
            # Result may be whitespace-only only if the original was.
            if translation.strip():
                assert result.strip() != ""


# --- _capitalize_german_noun ------------------------------------------------

class TestCapitalizeGermanNoun:
    def test_capitalizes_lowercase_german_noun(self):
        assert _capitalize_german_noun("papagei", "de", "noun") == "Papagei"

    def test_preserves_already_capitalized(self):
        assert _capitalize_german_noun("Papagei", "de", "noun") == "Papagei"

    def test_does_not_capitalize_german_verb(self):
        assert _capitalize_german_noun("laufen", "de", "verb") == "laufen"

    def test_does_not_capitalize_german_adjective(self):
        assert _capitalize_german_noun("schnell", "de", "adjective") == "schnell"

    def test_does_not_capitalize_non_german_noun(self):
        assert _capitalize_german_noun("parrot", "en", "noun") == "parrot"
        assert _capitalize_german_noun("casa", "es", "noun") == "casa"

    def test_pos_case_insensitive(self):
        assert _capitalize_german_noun("papagei", "de", "NOUN") == "Papagei"
        assert _capitalize_german_noun("papagei", "de", "Noun") == "Papagei"

    def test_target_lang_case_insensitive(self):
        assert _capitalize_german_noun("papagei", "DE", "noun") == "Papagei"

    def test_empty_word_passthrough(self):
        assert _capitalize_german_noun("", "de", "noun") == ""

    def test_none_passthrough(self):
        assert _capitalize_german_noun(None, "de", "noun") is None

    def test_empty_pos_no_op(self):
        assert _capitalize_german_noun("papagei", "de", "") == "papagei"

    def test_none_pos_no_op(self):
        assert _capitalize_german_noun("papagei", "de", None) == "papagei"

    def test_single_character_noun(self):
        assert _capitalize_german_noun("a", "de", "noun") == "A"

    def test_preserves_rest_of_string(self):
        assert _capitalize_german_noun("papagei-vogel", "de", "noun") == "Papagei-vogel"


# --- run_enrichment integration ---------------------------------------------

class TestRunEnrichmentIntegration:
    """End-to-end wiring: confirms the helpers actually run against the
    LLM response inside run_enrichment. Guards against regressions where
    the post-processing block is moved to the wrong branch or removed."""

    def test_integration_strips_article_and_capitalizes_noun(self, monkeypatch):
        llm_payload = [
            {
                "input_word": "papagei",
                "word_target": "papagei",
                "translation": "der parrot",
                "mnemonic": "",
                "etymology": "",
                "pos": "noun",
                "article": "der",
            },
            {
                "input_word": "sterben",
                "word_target": "sterben",
                "translation": "die alone",
                "mnemonic": "",
                "etymology": "",
                "pos": "verb",
                "article": None,
            },
        ]
        http_response = MagicMock()
        http_response.raise_for_status = MagicMock()
        http_response.json = MagicMock(return_value={
            "choices": [{"message": {"content": json.dumps(llm_payload)}}],
            "usage": {"prompt_tokens": 1, "completion_tokens": 1, "total_tokens": 2},
        })
        fake_client = MagicMock()
        fake_client.post = AsyncMock(return_value=http_response)
        fake_client.__aenter__ = AsyncMock(return_value=fake_client)
        fake_client.__aexit__ = AsyncMock(return_value=None)

        monkeypatch.setattr(enrichment_mod, "OPENROUTER_API_KEY", "test_key")

        with patch.object(enrichment_mod.httpx, "AsyncClient", return_value=fake_client):
            result = _run(run_enrichment(
                [{"word": "papagei"}, {"word": "sterben"}],
                target_language="German",
                base_language="English",
            ))

        # Article leak stripped, German noun capitalized.
        papagei = next(e for e in result if e["input_word"] == "papagei")
        assert papagei["translation"] == "parrot"
        assert papagei["word_target"] == "Papagei"

        # Homograph protection: English verb "die" preserved in the phrasal
        # translation "die alone" (German `die` article collides).
        sterben = next(e for e in result if e["input_word"] == "sterben")
        assert sterben["translation"] == "die alone"
        # word_target is a verb, not capitalized.
        assert sterben["word_target"] == "sterben"

    def test_logs_openrouter_status_error_body(self, monkeypatch, caplog):
        request = enrichment_mod.httpx.Request(
            "POST", "https://openrouter.ai/api/v1/chat/completions",
        )
        response = enrichment_mod.httpx.Response(
            404, request=request, text='{"error":"unknown model"}',
        )

        http_response = MagicMock()
        http_response.status_code = 404
        http_response.text = '{"error":"unknown model"}'
        http_response.raise_for_status = MagicMock(side_effect=enrichment_mod.httpx.HTTPStatusError(
            "not found", request=request, response=response,
        ))
        http_response.json = MagicMock()

        fake_client = MagicMock()
        fake_client.post = AsyncMock(return_value=http_response)
        fake_client.__aenter__ = AsyncMock(return_value=fake_client)
        fake_client.__aexit__ = AsyncMock(return_value=None)

        monkeypatch.setattr(enrichment_mod, "OPENROUTER_API_KEY", "test_key")
        caplog.set_level("ERROR")

        with patch.object(enrichment_mod.httpx, "AsyncClient", return_value=fake_client):
            with pytest.raises(enrichment_mod.httpx.HTTPStatusError):
                _run(run_enrichment(
                    [{"word": "agua"}],
                    target_language="Spanish",
                    base_language="English",
                ))

        assert "OpenRouter enrichment request failed: status=404" in caplog.text
        assert '{"error":"unknown model"}' in caplog.text
        http_response.json.assert_not_called()
