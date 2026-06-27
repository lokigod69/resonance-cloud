"""Music caption generation for the Concept Engine.

Builds caption prompts (auto-genre or manual-genre), calls the LLM,
and post-processes the response with language injection and length checks.
Prompts are from ENGINE_CONCEPT.md Sections 5.2 and 6.1.
"""

from __future__ import annotations

import logging
import random
import re

from src.services.events import logged_llm_call

from .article import KNOWN_ARTICLES
from .llm_client import OpenRouterClient
from .models import CaptionResult, ConceptSettings

logger = logging.getLogger(__name__)


RANDOM_GENRE_INSPIRATION_POOL: tuple[str, ...] = (
    "gypsy jazz",
    "bossa nova",
    "vintage soul",
    "folk singer-songwriter",
    "acoustic blues",
    "flamenco",
    "French chanson",
    "laid-back reggae",
    "Afrobeat",
    "samba",
    "country waltz",
    "bluegrass porch band",
    "Motown-inspired pop soul",
    "Cuban son",
    "calypso",
    "desert blues",
    "Nordic folk",
    "Andean folk",
    "tango nuevo",
    "swing big band",
    "chamber pop",
    "indie folk",
    "dream pop",
    "sophisti-pop",
    "acoustic funk",
    "Latin jazz",
    "gospel piano soul",
    "roots rock",
    "surf rock",
    "nylon-string bolero",
    "disco strings",
    "city pop",
    "lo-fi indie pop",
    "warm piano ballad",
    "klezmer dance band",
    "Mediterranean acoustic ensemble",
    "West African highlife",
    "Mariachi ranchera",
    "Appalachian fiddle tune",
    "Brazilian MPB",
)
_RANDOM_CHOOSER = random.SystemRandom()


def generate_caption(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
    llm_client: OpenRouterClient,
    identity: dict | None = None,
) -> CaptionResult:
    """Generate a music caption via LLM. Always makes one API call.

    Args:
        word: Target vocabulary word.
        translation: English meaning.
        language: Full language name (e.g. "German").
        settings: Concept settings (genre, vocal_gender, visual_hint, etc.).
        llm_client: OpenRouter client instance.
        identity: Optional dict with word_id/deck_id/user_id/job_id/attempt
            for observability correlation. Missing keys default to None.

    Returns:
        CaptionResult with caption, optional visual_hint, and metadata.
    """
    prompt = _build_caption_prompt(word, translation, language, settings)
    ident = identity or {}
    with logged_llm_call(
        stage="concept",
        sub_step="caption_llm",
        word_id=ident.get("word_id"),
        deck_id=ident.get("deck_id"),
        user_id=ident.get("user_id"),
        job_id=ident.get("job_id"),
        attempt=ident.get("attempt"),
        model_provider="openrouter",
        model_name=settings.llm_model,
        system_prompt="",
        user_prompt=prompt,
    ) as ev:
        result = llm_client.generate(prompt=prompt, model=settings.llm_model)
        ev.record_response(
            response_body=result.content,
            tokens_in=result.tokens_in,
            tokens_out=result.tokens_out,
            cost_usd=result.cost_usd,
            request_id=result.request_id,
            completion_tokens=result.tokens_out,
            reasoning_tokens=result.reasoning_tokens,
        )
    return _parse_caption_response(result.content, language, settings)


def build_caption_prompt_for_combined(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
) -> str:
    """Build just the caption section of a combined prompt (for contextual/creative modes).

    Returns the caption prompt text without the visual hint extension —
    the combined prompt builder in lyrics.py handles that.
    """
    return _select_caption_prompt(word, translation, language, settings)


def generate_caption_with_article(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
    llm_client: OpenRouterClient,
    language_code: str = "",
    identity: dict | None = None,
) -> tuple[str, CaptionResult]:
    """Generate article + caption via a single LLM call (reliable mode).

    Reuses the existing caption prompt with an article question prepended.

    Returns:
        Tuple of (article_string, CaptionResult).
        article_string is "" for articleless languages, otherwise e.g. "der", "la".
    """
    prompt = _build_reliable_prompt(word, translation, language, settings)
    ident = identity or {}
    with logged_llm_call(
        stage="concept",
        sub_step="caption_with_article_llm",
        word_id=ident.get("word_id"),
        deck_id=ident.get("deck_id"),
        user_id=ident.get("user_id"),
        job_id=ident.get("job_id"),
        attempt=ident.get("attempt"),
        model_provider="openrouter",
        model_name=settings.llm_model,
        system_prompt="",
        user_prompt=prompt,
    ) as ev:
        result = llm_client.generate(
            prompt=prompt,
            model=settings.llm_model,
        )
        ev.record_response(
            response_body=result.content,
            tokens_in=result.tokens_in,
            tokens_out=result.tokens_out,
            cost_usd=result.cost_usd,
            request_id=result.request_id,
            completion_tokens=result.tokens_out,
            reasoning_tokens=result.reasoning_tokens,
        )
    return _parse_reliable_response(result.content, language, settings, language_code)


def parse_caption_from_combined(
    caption_text: str,
    visual_text: str | None,
    language: str,
    settings: ConceptSettings,
) -> CaptionResult:
    """Post-process a caption extracted from a combined LLM response.

    Applies the same cleaning, language injection, and length checks
    as the standalone path.
    """
    caption = _clean_caption(caption_text)
    caption, injected = _ensure_language(caption, language, settings.vocal_gender)
    caption = _enforce_length(caption)

    visual_hint = None
    if visual_text:
        visual_hint = _parse_visual_hint(visual_text)

    source = "llm_auto" if settings.genre == "auto" else "llm_manual"

    return CaptionResult(
        caption=caption,
        visual_hint=visual_hint,
        source=source,
        language_injected=injected,
    )


# ---------------------------------------------------------------------------
# Prompt builders (from ENGINE_CONCEPT.md Section 5.2)
# ---------------------------------------------------------------------------

def _build_caption_prompt(
    word: str, translation: str, language: str, settings: ConceptSettings,
) -> str:
    """Build the full caption prompt including optional visual hint extension."""
    prompt = _select_caption_prompt(word, translation, language, settings)

    if settings.visual_hint:
        prompt += _visual_hint_extension()

    return prompt


def _select_caption_prompt(
    word: str, translation: str, language: str, settings: ConceptSettings,
) -> str:
    """Select the appropriate caption prompt based on caption_style and genre."""
    if settings.caption_style == "production":
        if settings.genre == "auto":
            return _auto_genre_production_prompt(
                word, translation, language, settings, _random_inspiration_seed()
            )
        return _manual_genre_production_prompt(word, translation, language, settings)
    # vocal_forward (original behavior)
    if settings.genre == "auto":
        return _auto_genre_prompt(
            word, translation, language, settings, _random_inspiration_seed()
        )
    return _manual_genre_prompt(word, translation, language, settings)


def _random_inspiration_seed() -> str:
    return _RANDOM_CHOOSER.choice(RANDOM_GENRE_INSPIRATION_POOL)


def _art_style_context(settings: ConceptSettings) -> str:
    """Build art style context string for caption prompts when enabled."""
    if settings.use_art_style and settings.art_style_hint:
        readable = settings.art_style_hint.replace("_", " ").title()
        return (
            f'\nVisual Art Style: {readable}\n'
            f'The music should complement this visual style — match the energy, era, and cultural feeling of this art direction.\n'
        )
    return ""


def _auto_genre_prompt(
    word: str, translation: str, language: str, settings: ConceptSettings, seed: str,
) -> str:
    """Auto-genre prompt from Section 5.2."""
    if translation:
        word_line = f'Word: "{word}" ({translation})'
    else:
        word_line = f'Word: "{word}"\nLanguage: {language}\nDetermine the meaning of this word from its language context.'
    return (
        f'You are a music curator shaping a clear, voice-forward vocabulary song caption.\n'
        f'\n'
        f'{word_line}\n'
        f'Language: {language}\n'
        f'Random inspiration seed: {seed}\n'
        f'{_art_style_context(settings)}'
        f'\n'
        f'Use the seed as inspiration; elaborate, blend, or extend this seed so the word has a memorable sonic identity.\n'
        f'Favor a clear, forward melodic {language} {settings.vocal_gender} vocal with enough space around the voice for pronunciation.\n'
        f'\n'
        f'Generate one single-line music caption with these dimensions:\n'
        f'voice placement, specific sub-style, instrumentation, production texture, tempo feel, and mood.\n'
        f'\n'
        f'Output one caption line only.'
    )


def _manual_genre_prompt(
    word: str, translation: str, language: str, settings: ConceptSettings,
) -> str:
    """Manual genre prompt from Section 5.2."""
    if translation:
        word_line = f'Word: "{word}" ({translation})'
    else:
        word_line = f'Word: "{word}"\nDetermine the meaning of this word from its language context.'
    return (
        f'You are a music production assistant generating a rich caption for Ace-Step AI music generation.\n'
        f'\n'
        f'Genre: {settings.genre}\n'
        f'Language: {language}\n'
        f'{word_line}\n'
        f'{_art_style_context(settings)}'
        f'\n'
        f'Create a specific {settings.genre} caption with a clear, forward melodic {language} {settings.vocal_gender} vocal.\n'
        f'When the genre names an artist, producer, band, or person, render it as a descriptive style label using genre family, era, arrangement, and sound character.\n'
        f'\n'
        f'Generate one single-line music caption with these dimensions:\n'
        f'voice placement, specific sub-style, instrumentation, production texture, tempo feel, and mood.\n'
        f'\n'
        f'Output one caption line only.'
    )


def _auto_genre_production_prompt(
    word: str, translation: str, language: str, settings: ConceptSettings, seed: str,
) -> str:
    """Production-style auto-genre prompt — music-first, fuller arrangement."""
    if translation:
        word_line = f'Word: "{word}" ({translation})'
    else:
        word_line = f'Word: "{word}"\nLanguage: {language}\nDetermine the meaning of this word from its language context.'
    return (
        f'You are a music producer creating a polished vocabulary song caption that makes a foreign word memorable through melody and arrangement.\n'
        f'\n'
        f'{word_line}\n'
        f'Language: {language}\n'
        f'Random inspiration seed: {seed}\n'
        f'{_art_style_context(settings)}'
        f'\n'
        f'Use the seed as inspiration; elaborate, blend, or extend this seed into a specific musical world for the word.\n'
        f'The word will be sung in a real arrangement with melody, rhythm, emotional arc, and a clear, forward vocal presence.\n'
        f'\n'
        f'Generate one single-line music caption with these dimensions:\n'
        f'specific sub-style, instrumentation, production texture, tempo feel, melodic {language} {settings.vocal_gender} vocal, vocal presence, and mood.\n'
        f'\n'
        f'Keep the line concise enough for a Suno style field while giving enough detail to shape a distinctive arrangement.\n'
        f'Output one caption line only.'
    )


def _manual_genre_production_prompt(
    word: str, translation: str, language: str, settings: ConceptSettings,
) -> str:
    """Production-style manual-genre prompt — music-first with pre-specified genre."""
    if translation:
        word_line = f'Word: "{word}" ({translation})'
    else:
        word_line = f'Word: "{word}"\nDetermine the meaning of this word from its language context.'
    return (
        f'You are a music producer arranging a polished {settings.genre} vocabulary song caption.\n'
        f'\n'
        f'{word_line}\n'
        f'Language: {language}\n'
        f'Genre: {settings.genre}\n'
        f'{_art_style_context(settings)}'
        f'\n'
        f'Create a music caption that describes a fully produced {settings.genre} arrangement with a clear, forward melodic {language} {settings.vocal_gender} vocal.\n'
        f'When the genre names an artist, producer, band, or person, render it as a descriptive style label using genre family, era, arrangement, and sound character.\n'
        f'\n'
        f'Generate one single-line music caption with these dimensions:\n'
        f'specific sub-style, instrumentation, production texture, tempo feel, melodic {language} {settings.vocal_gender} vocal, vocal presence, and mood.\n'
        f'\n'
        f'Keep the line concise enough for a Suno style field while giving enough detail to shape a distinctive arrangement.\n'
        f'Output one caption line only.'
    )


def _visual_hint_extension() -> str:
    """Visual hint extension appended to caption prompt (Section 6.1)."""
    return (
        '\n\n'
        'Also generate a visual mood tag (3-5 words) that captures the emotional\n'
        'atmosphere of this word. Format: mood1, mood2, mood3\n'
        '\n'
        'Output format:\n'
        'Line 1: The music caption\n'
        'Line 2: VISUAL: mood1, mood2, mood3'
    )


# ---------------------------------------------------------------------------
# Response parsing and post-processing (Section 5.3)
# ---------------------------------------------------------------------------

def _parse_caption_response(
    raw: str, language: str, settings: ConceptSettings,
) -> CaptionResult:
    """Parse the LLM response into caption + optional visual hint."""
    lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]

    caption_text = ""
    visual_hint = None

    if settings.visual_hint:
        # Look for VISUAL: marker
        visual_line = None
        caption_lines = []
        for line in lines:
            if line.upper().startswith("VISUAL:"):
                visual_line = line
            else:
                caption_lines.append(line)

        caption_text = caption_lines[0] if caption_lines else raw.strip()
        if visual_line:
            visual_hint = _parse_visual_hint(visual_line)
    else:
        # First non-empty line is the caption
        caption_text = lines[0] if lines else raw.strip()

    # Post-process
    caption = _clean_caption(caption_text)
    caption, injected = _ensure_language(caption, language, settings.vocal_gender)
    caption = _enforce_length(caption)

    source = "llm_auto" if settings.genre == "auto" else "llm_manual"

    return CaptionResult(
        caption=caption,
        visual_hint=visual_hint,
        source=source,
        language_injected=injected,
    )


def _clean_caption(text: str) -> str:
    """Strip surrounding quotes and whitespace from a caption."""
    text = text.strip()
    if len(text) >= 2 and text[0] == text[-1] and text[0] in ('"', "'"):
        text = text[1:-1].strip()
    return text


def _ensure_language(caption: str, language: str, vocal_gender: str) -> tuple[str, bool]:
    """Ensure the caption contains a language signal.

    If no language identifier is found, append "{language} {vocal_gender} vocal".
    Returns (caption, was_injected).
    """
    if not language:
        return caption, False

    caption_lower = caption.lower()
    lang_lower = language.lower()

    indicators = [
        f"{lang_lower} vocal",
        f"{lang_lower} singer",
        f"{lang_lower} singing",
        f"singing in {lang_lower}",
        f"{lang_lower} male vocal",
        f"{lang_lower} female vocal",
        f"{lang_lower} rap",
        lang_lower,
    ]

    for indicator in indicators:
        if indicator in caption_lower:
            return caption, False

    modified = f"{caption}, {language} {vocal_gender} vocal"
    return modified, True


def _enforce_length(caption: str, max_chars: int = 900) -> str:
    """Keep captions inside the Suno style field budget."""
    if len(caption) <= max_chars:
        return caption
    trimmed = caption[:max_chars].rstrip(" ,")
    comma_boundary = trimmed.rfind(",")
    if comma_boundary >= max_chars // 2:
        trimmed = trimmed[:comma_boundary].rstrip(" ,")
    return trimmed


def _build_reliable_prompt(
    word: str, translation: str, language: str, settings: ConceptSettings,
) -> str:
    """Build the reliable mode prompt: article question + existing caption prompt."""
    # Reuse the existing caption prompt as the core
    caption_prompt = _select_caption_prompt(word, translation, language, settings)

    article_section = (
        f'TASK 1 — ARTICLE\n'
        f'What is the grammatical article for "{word}" in {language}?\n'
        f'- For German: der, die, or das\n'
        f'- For Spanish: el or la\n'
        f'- For English: a or an\n'
        f'- For languages without articles (e.g. Korean, Japanese): respond "none"\n'
        f'\n'
        f'TASK 2 — MUSIC CAPTION\n'
    )

    no_brackets = (
        '\nBegin the caption with descriptive music language rather than bracket tags.'
    )

    output_format = (
        '\n\nOutput format (exactly):\n'
        'ARTICLE: [the article, or "none"]\n'
        'CAPTION: [your single-line music caption]'
    )

    if settings.visual_hint:
        output_format += '\nVISUAL: [3-5 mood words, comma-separated]'

    return article_section + caption_prompt + no_brackets + output_format


def _parse_reliable_response(
    raw: str, language: str, settings: ConceptSettings, language_code: str = "",
) -> tuple[str, CaptionResult]:
    """Parse the reliable mode LLM response into article + CaptionResult."""
    lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]

    article = ""
    caption_text = ""
    visual_hint = None

    for line in lines:
        upper = line.upper()
        if upper.startswith("ARTICLE:"):
            raw_article = line.split(":", 1)[1].strip().lower()
            # Take only the first word for robustness (handles "der (masculine)" etc.)
            first_word = raw_article.split()[0] if raw_article.split() else ""
            if first_word in ("none", "n/a", "-", ""):
                article = ""
            else:
                # Validate against known articles for this language
                valid = KNOWN_ARTICLES.get(language_code, set())
                if valid and first_word.upper() not in valid:
                    article = ""  # LLM returned invalid article for this language
                else:
                    article = first_word
        elif upper.startswith("CAPTION:"):
            caption_text = line.split(":", 1)[1].strip()
        elif upper.startswith("VISUAL:"):
            visual_hint = _parse_visual_hint(line)

    # Fallback if caption not found
    if not caption_text:
        caption_text = lines[0] if lines else f"{language} vocal, atmospheric"

    # Apply same post-processing as all other paths
    caption = _clean_caption(caption_text)
    caption, injected = _ensure_language(caption, language, settings.vocal_gender)
    caption = _enforce_length(caption)

    source = "llm_auto" if settings.genre == "auto" else "llm_manual"

    caption_result = CaptionResult(
        caption=caption,
        visual_hint=visual_hint,
        source=source,
        language_injected=injected,
    )

    return article, caption_result


def _parse_visual_hint(line: str) -> str | None:
    """Extract visual mood tag from a VISUAL: line."""
    match = re.match(r"(?i)^VISUAL:\s*(.+)$", line.strip())
    if match:
        hint = match.group(1).strip()
        if hint:
            return hint
    return None
