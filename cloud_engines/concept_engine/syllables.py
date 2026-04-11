"""Syllable analysis for the Concept Engine.

Analyzes target words to determine syllable count, word length class,
and choppable fragments. Supports pyphen for European languages,
character counting for CJK, and vowel-cluster fallback.
"""

from __future__ import annotations

import re
import unicodedata

import pyphen

from .models import SyllableInfo


def analyze_word(word: str, language_code: str) -> SyllableInfo:
    """Analyze a word for syllable count, length class, and fragments.

    Priority:
      1. CJK scripts (Korean, Japanese, Chinese) — character counting
      2. pyphen dictionary — linguistically accurate hyphenation
      3. Vowel-cluster fallback — heuristic counting

    Args:
        word: The target vocabulary word.
        language_code: ISO 639-1 code (e.g. 'de', 'ko').

    Returns:
        SyllableInfo with count, word_length_class, fragments, and method.
    """
    # Try CJK first
    if _is_cjk(word):
        return _analyze_cjk(word)

    # Try pyphen
    result = _analyze_pyphen(word, language_code)
    if result is not None:
        return result

    # Vowel-cluster fallback
    return _analyze_fallback(word)


def _classify(count: int) -> str:
    """Classify word length by syllable count."""
    if count <= 2:
        return "short"
    elif count <= 4:
        return "medium"
    else:
        return "long"


# ---------------------------------------------------------------------------
# CJK analysis
# ---------------------------------------------------------------------------

def _is_cjk(word: str) -> bool:
    """Check if the word contains CJK characters."""
    for ch in word:
        if _is_cjk_char(ch):
            return True
    return False


def _is_cjk_char(ch: str) -> bool:
    """Check if a single character is CJK (Hangul, Kana, CJK Ideograph)."""
    cp = ord(ch)
    # Hangul Syllables
    if 0xAC00 <= cp <= 0xD7AF:
        return True
    # Hangul Jamo
    if 0x1100 <= cp <= 0x11FF:
        return True
    # Hangul Compatibility Jamo
    if 0x3130 <= cp <= 0x318F:
        return True
    # Hiragana
    if 0x3040 <= cp <= 0x309F:
        return True
    # Katakana
    if 0x30A0 <= cp <= 0x30FF:
        return True
    # CJK Unified Ideographs
    if 0x4E00 <= cp <= 0x9FFF:
        return True
    # CJK Extension A
    if 0x3400 <= cp <= 0x4DBF:
        return True
    return False


def _analyze_cjk(word: str) -> SyllableInfo:
    """Count CJK characters as syllable proxy."""
    fragments = [ch for ch in word if _is_cjk_char(ch)]
    count = max(len(fragments), 1)
    return SyllableInfo(
        count=count,
        word_length_class=_classify(count),
        fragments=fragments,
        method="cjk",
    )


# ---------------------------------------------------------------------------
# pyphen analysis
# ---------------------------------------------------------------------------

def _analyze_pyphen(word: str, language_code: str) -> SyllableInfo | None:
    """Try to analyze using pyphen dictionary hyphenation.

    Returns None if no dictionary is available for the language.
    """
    try:
        dic = pyphen.Pyphen(lang=language_code)
    except KeyError:
        return None

    hyphenated = dic.inserted(word)
    # pyphen inserts soft hyphens (or regular hyphens) at syllable boundaries
    # Split on the hyphen character pyphen uses
    fragments = hyphenated.split("-")
    # Filter out empty strings from edge cases
    fragments = [f for f in fragments if f]
    count = max(len(fragments), 1)

    return SyllableInfo(
        count=count,
        word_length_class=_classify(count),
        fragments=fragments,
        method="pyphen",
    )


# ---------------------------------------------------------------------------
# Vowel-cluster fallback
# ---------------------------------------------------------------------------

# Vowels including common diacritics
_VOWEL_PATTERN = re.compile(r"[aeiouyàáâãäåæèéêëìíîïòóôõöùúûüýÿ]+", re.IGNORECASE)


def _analyze_fallback(word: str) -> SyllableInfo:
    """Count vowel clusters as a syllable heuristic."""
    # Normalize unicode to handle combining diacritics
    normalized = unicodedata.normalize("NFC", word)
    matches = _VOWEL_PATTERN.findall(normalized)
    count = max(len(matches), 1)

    return SyllableInfo(
        count=count,
        word_length_class=_classify(count),
        fragments=[],  # Fallback doesn't produce reliable fragments
        method="fallback",
    )
