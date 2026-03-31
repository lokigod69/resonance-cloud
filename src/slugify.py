"""Word slug generation: Unicode → ASCII folder names."""

import re
import unicodedata


# German umlaut mapping
UMLAUT_MAP = {
    'ä': 'ae', 'ö': 'oe', 'ü': 'ue',
    'Ä': 'Ae', 'Ö': 'Oe', 'Ü': 'Ue',
    'ß': 'ss',
}

# Language code mapping from full name
LANGUAGE_CODE_MAP = {
    'english': 'en',
    'german': 'de',
    'korean': 'ko',
    'japanese': 'ja',
    'italian': 'it',
    'spanish': 'es',
    'french': 'fr',
    'portuguese': 'pt',
    'chinese': 'zh',
    'russian': 'ru',
    'arabic': 'ar',
    'dutch': 'nl',
    'swedish': 'sv',
    'norwegian': 'no',
    'danish': 'da',
    'finnish': 'fi',
    'polish': 'pl',
    'turkish': 'tr',
    'greek': 'el',
    'hebrew': 'he',
    'hindi': 'hi',
    'thai': 'th',
    'vietnamese': 'vi',
    'indonesian': 'id',
    'bisaya': 'ceb',
    'cebuano': 'ceb',
    'tagalog': 'tl',
    'malay': 'ms',
}

SUPPORTED_LANGUAGES = sorted(LANGUAGE_CODE_MAP.keys())


def language_to_code(language: str) -> str:
    """Convert language name to ISO 639-1 code."""
    return LANGUAGE_CODE_MAP.get(language.lower(), language.lower()[:2])


def slugify(word: str, max_length: int = 50) -> str:
    """
    Convert a vocabulary word to an ASCII folder-safe slug.

    - Lowercase
    - German umlauts: ä→ae, ö→oe, ü→ue, ß→ss
    - Other non-ASCII: Unicode normalization → strip diacritics → keep ASCII
    - Non-Latin scripts: transliterate or use fallback
    - Spaces and special chars → hyphens
    - Max 50 characters
    """
    result = word

    # Apply German umlaut substitutions first
    for char, replacement in UMLAUT_MAP.items():
        result = result.replace(char, replacement)

    # Normalize to NFD (decompose accented chars) then strip combining chars
    result = unicodedata.normalize('NFD', result)
    result = ''.join(c for c in result if unicodedata.category(c) != 'Mn')

    # Lowercase
    result = result.lower()

    # Replace spaces and non-alphanumeric with hyphens
    result = re.sub(r'[^a-z0-9]+', '-', result)

    # Strip leading/trailing hyphens
    result = result.strip('-')

    # If result is empty (non-Latin script with no ASCII fallback), use hex encoding
    if not result:
        encoded = word.encode('utf-8').hex()[:max_length]
        return encoded

    # Truncate to max_length
    if len(result) > max_length:
        result = result[:max_length].rstrip('-')

    return result
