"""Language utilities for the Song Engine.

Implements the Language Lock Strategy from ENGINE_SONG.md Section 5:
- Layer 1: Validate language codes against Ace-Step's VALID_LANGUAGES
- Layer 2: Ensure caption contains a language signal (safety net)
"""

from __future__ import annotations

import re

# Language codes that ACE-Step doesn't natively support.
# Remapped to the closest supported code before validation, tag injection,
# and vocal_language dispatch.
ACESTEP_LANG_REMAP: dict[str, str] = {
    "ceb": "tl",  # Cebuano → Tagalog (closest supported code; LoRA trained with tl)
}


def remap_language_code(code: str) -> str:
    """Remap unsupported language codes to their ACE-Step equivalents."""
    return ACESTEP_LANG_REMAP.get(code.lower(), code)


# Caption language name remap — replaces language names in the music caption
# with names ACE-Step recognizes from its training data.
# Separate from ACESTEP_LANG_REMAP (which remaps codes).
ACESTEP_CAPTION_LANG_REMAP: dict[str, str] = {
    "bisaya": "Filipino",
    "cebuano": "Filipino",
}


def remap_caption_language(caption: str) -> str:
    """Replace language names in the caption that ACE-Step doesn't recognize."""
    result = caption
    for old_name, new_name in ACESTEP_CAPTION_LANG_REMAP.items():
        result = re.sub(re.escape(old_name), new_name, result, flags=re.IGNORECASE)
    return result


# Ace-Step's supported languages from VALID_LANGUAGES in the codebase.
# Per ENGINE_SONG.md Section 13.
VALID_LANGUAGES: dict[str, str] = {
    "ar": "Arabic",
    "az": "Azerbaijani",
    "bn": "Bengali",
    "bg": "Bulgarian",
    "yue": "Cantonese",
    "ca": "Catalan",
    "zh": "Chinese",
    "hr": "Croatian",
    "cs": "Czech",
    "da": "Danish",
    "nl": "Dutch",
    "en": "English",
    "fi": "Finnish",
    "fr": "French",
    "de": "German",
    "el": "Greek",
    "ht": "Haitian Creole",
    "he": "Hebrew",
    "hi": "Hindi",
    "hu": "Hungarian",
    "is": "Icelandic",
    "id": "Indonesian",
    "it": "Italian",
    "ja": "Japanese",
    "ko": "Korean",
    "la": "Latin",
    "lt": "Lithuanian",
    "ms": "Malay",
    "ne": "Nepali",
    "no": "Norwegian",
    "fa": "Persian",
    "pl": "Polish",
    "pt": "Portuguese",
    "pa": "Punjabi",
    "ro": "Romanian",
    "ru": "Russian",
    "sa": "Sanskrit",
    "sr": "Serbian",
    "sk": "Slovak",
    "es": "Spanish",
    "sw": "Swahili",
    "sv": "Swedish",
    "tl": "Tagalog",
    "ta": "Tamil",
    "te": "Telugu",
    "th": "Thai",
    "tr": "Turkish",
    "uk": "Ukrainian",
    "ur": "Urdu",
    "vi": "Vietnamese",
}

# Reverse mapping: full name → code
LANGUAGE_NAMES: dict[str, str] = {name.lower(): code for code, name in VALID_LANGUAGES.items()}


def validate_language_code(code: str) -> bool:
    """Check if a language code is in Ace-Step's VALID_LANGUAGES.

    Per ENGINE_SONG.md Section 5, Layer 1:
    The engine must NEVER send vocal_language: "unknown".
    If the code is invalid, the engine fails with a clear error.
    """
    return code.lower() in VALID_LANGUAGES


def ensure_language_in_caption(
    caption: str,
    language: str,
    language_code: str,
) -> tuple[str, bool]:
    """Ensure the caption contains a language signal.

    Per ENGINE_SONG.md Section 5, Layer 2:
    If the caption doesn't contain the language name or a recognized
    language phrase, append ", {language} vocal" as a safety net.
    This is the ONLY modification the engine makes to any Stage 1 input.

    Args:
        caption: The music caption from the concept artifact.
        language: Full language name (e.g., "German").
        language_code: ISO 639-1 code (e.g., "de").

    Returns:
        Tuple of (possibly_modified_caption, was_modified).
    """
    caption_lower = caption.lower()

    # Check for language name in caption (case-insensitive)
    if language.lower() in caption_lower:
        return caption, False

    # Check for common language phrases
    language_phrases = [
        f"{language.lower()} vocal",
        f"{language.lower()} singer",
        f"{language.lower()} singing",
        f"singing in {language.lower()}",
        f"sung in {language.lower()}",
        f"in {language.lower()}",
        f"{language_code} vocal",
    ]

    for phrase in language_phrases:
        if phrase in caption_lower:
            return caption, False

    # No language signal found — append safety net
    modified = f"{caption}, {language} vocal"
    return modified, True


# Regex matching structure tags: lines like [Verse], [Chorus - Building], [Spoken Word], etc.
_STRUCTURE_TAG_RE = re.compile(r"^\[.*\]\s*$")


def inject_language_tags(lyrics: str, language_code: str) -> str:
    """Prepend [{language_code}] to every non-empty, non-structure-tag lyric line.

    Structure tags are lines that consist entirely of a bracketed tag
    (e.g., [Verse], [Chorus - Building], [Spoken Word]).
    Blank lines are preserved as-is.

    Example:
        >>> inject_language_tags("[Verse]\\nHello world\\n\\nGoodbye", "en")
        '[Verse]\\n[en] Hello world\\n\\n[en] Goodbye'
    """
    lines = lyrics.split("\n")
    result: list[str] = []
    tag = f"[{language_code.lower()}]"

    for line in lines:
        stripped = line.strip()
        if not stripped:
            # Blank line — keep as-is
            result.append(line)
        elif _STRUCTURE_TAG_RE.match(stripped):
            # Structure tag — keep as-is
            result.append(line)
        else:
            # Lyric line — prepend language tag
            result.append(f"{tag} {line}")

    return "\n".join(result)
