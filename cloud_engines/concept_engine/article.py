"""Grammatical article extraction and resolution for the Concept Engine.

Extracts the correct article from enrichment mnemonic strings (e.g. "DER Arzt" → "der")
and resolves whether an article should be used based on language and part of speech.
"""

from __future__ import annotations

from typing import TYPE_CHECKING

if TYPE_CHECKING:
    from .models import Enrichment

# Known articles by language code. Uppercase for matching against mnemonics.
# Each set contains all valid definite articles for that language.
KNOWN_ARTICLES: dict[str, set[str]] = {
    "de": {"DER", "DIE", "DAS"},
    "en": {"A", "AN"},
    "es": {"EL", "LA", "LOS", "LAS"},
    "fr": {"LE", "LA", "LES"},
    "it": {"IL", "LO", "LA", "I", "GLI", "LE"},
    "pt": {"O", "A", "OS", "AS"},
}

# Languages that never use articles — no extraction attempted.
ARTICLELESS_LANGUAGES: set[str] = {
    "ko", "ja", "zh", "tr", "fi", "hu", "pl", "ru", "cs", "hr",
}


def extract_article_from_mnemonic(mnemonic: str, language_code: str = "") -> str:
    """Extract a grammatical article from the start of a mnemonic string.

    Mnemonics from the orchestrator's enrichment follow the pattern:
        "DER Arzt (masculine)" or "DIE Freiheit (feminine)"

    The first word is checked against known articles for the language.
    If no language_code is given, all known articles across languages are checked.

    Returns:
        Lowercase article string (e.g. "der"), or "" if none found.
    """
    if not mnemonic or not mnemonic.strip():
        return ""

    first_word = mnemonic.strip().split()[0].upper()

    if language_code:
        valid = KNOWN_ARTICLES.get(language_code, set())
        if first_word in valid:
            return first_word.lower()
        return ""

    # No language code — check all known article sets
    for articles in KNOWN_ARTICLES.values():
        if first_word in articles:
            return first_word.lower()
    return ""


def resolve_article(enrichment: Enrichment | None, language_code: str) -> str:
    """Resolve the grammatical article to use in lyrics.

    This is the main entry point called by the engine before lyric generation.

    Rules:
        1. Articleless languages (Korean, Japanese, etc.) → ""
        2. No enrichment data → ""
        3. POS is set and is not "noun" → ""
        4. Otherwise → extract from mnemonic

    Returns:
        Lowercase article string (e.g. "der"), or "" if no article applies.
    """
    if language_code in ARTICLELESS_LANGUAGES:
        return ""

    if enrichment is None:
        return ""

    # If POS is explicitly set and it's not a noun, no article
    if enrichment.pos and enrichment.pos.lower() != "noun":
        return ""

    return extract_article_from_mnemonic(enrichment.mnemonic, language_code)
