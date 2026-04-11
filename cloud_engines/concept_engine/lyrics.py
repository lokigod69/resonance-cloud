"""Lyric generation for the Concept Engine.

Routes to template-based or LLM-based generation depending on lyric_mode.
For template modes (minimal/standard/dramatic): generates lyrics locally,
then calls caption.py for the music caption (1 LLM call).
For LLM modes (contextual/creative): builds a combined prompt that returns
both caption and lyrics in one call (1 LLM call).

When an external_music_caption is provided (from the image engine storyboard),
template modes skip the LLM call entirely (0 calls), and LLM modes only
generate lyrics (1 call, no caption in prompt).

Maximum LLM calls per generation: 0 or 1.
"""

from __future__ import annotations

import logging
import re

from .caption import (
    build_caption_prompt_for_combined,
    generate_caption,
    generate_caption_with_article,
    parse_caption_from_combined,
)
from .llm_client import OpenRouterClient
from .models import CaptionResult, ConceptSettings, LyricsResult, SyllableInfo
from .templates import count_word_occurrences, generate_dramatic, generate_minimal, generate_reliable, generate_standard

logger = logging.getLogger(__name__)

# Template modes that use hardcoded lyrics (zero LLM cost for lyrics)
TEMPLATE_MODES = ("minimal", "standard", "dramatic", "reliable")
# LLM modes that combine caption + lyrics in one call
LLM_MODES = ("contextual", "creative")


_VOCAL_GENDER_RE = re.compile(
    r'\b(male or female|female|male)\s+vocal\b',
    re.IGNORECASE,
)


def _patch_vocal_gender(caption: str, target_gender: str) -> str:
    """Replace vocal gender in a storyboard caption to match current settings.

    If the caption already contains the correct gender, it is returned unchanged.
    """
    target = target_gender.lower()
    if target == "any":
        # "any" means don't constrain — leave whatever the storyboard chose
        return caption

    def _replace(m: re.Match) -> str:
        return f"{target} vocal"

    patched = _VOCAL_GENDER_RE.sub(_replace, caption)
    if patched != caption:
        logger.info("Patched vocal_gender in storyboard caption: %r → %r", caption, patched)
    return patched


def generate_lyrics(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    llm_client: OpenRouterClient,
    article: str = "",
    skip_article: bool = False,
    language_code: str = "",
    external_music_caption: str | None = None,
) -> tuple[LyricsResult, CaptionResult]:
    """Generate lyrics and caption for a word.

    Routes to template or LLM generation based on settings.lyric_mode.
    Results in 0 or 1 LLM calls depending on whether an external caption
    is provided and the lyric mode.

    Args:
        word: Target vocabulary word.
        translation: English meaning.
        language: Full language name.
        settings: Concept settings.
        syllable_info: Syllable analysis result.
        llm_client: OpenRouter client instance.
        article: Grammatical article from enrichment (e.g. "der"), or "" if none.
        skip_article: If True, never ask the LLM for an article.
        language_code: ISO 639-1 code for article validation.
        external_music_caption: Pre-generated caption from storyboard. When
            provided, skips LLM caption generation (0 calls for template modes).

    Returns:
        Tuple of (LyricsResult, CaptionResult).
    """
    # Treat empty string as no caption
    if not external_music_caption:
        external_music_caption = None

    # Patch vocal_gender in storyboard caption if it disagrees with current settings
    if external_music_caption:
        external_music_caption = _patch_vocal_gender(external_music_caption, settings.vocal_gender)

    if settings.lyric_mode in TEMPLATE_MODES:
        return _generate_template_path(word, translation, language, settings, syllable_info, llm_client, article, skip_article, language_code, external_music_caption)
    return _generate_llm_path(word, translation, language, settings, syllable_info, llm_client, article, external_music_caption)


# ---------------------------------------------------------------------------
# Template path: lyrics from templates, caption from LLM (1 call)
# ---------------------------------------------------------------------------

def _generate_template_path(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    llm_client: OpenRouterClient,
    article: str = "",
    skip_article: bool = False,
    language_code: str = "",
    external_music_caption: str | None = None,
) -> tuple[LyricsResult, CaptionResult]:
    """Template lyrics + caption. 0 LLM calls with external caption, 1 without."""
    if settings.lyric_mode == "reliable":
        if article or skip_article:
            # Article already known or not needed
            if external_music_caption:
                caption_result = CaptionResult(
                    caption=external_music_caption, visual_hint=None,
                    source="storyboard", language_injected=False,
                )
            else:
                caption_result = generate_caption(word, translation, language, settings, llm_client)
        else:
            # No enrichment article, POS allows it — need LLM for article discovery
            article, llm_caption_result = generate_caption_with_article(
                word, translation, language, settings, llm_client, language_code,
            )
            if external_music_caption:
                # Discard LLM caption, use external
                caption_result = CaptionResult(
                    caption=external_music_caption, visual_hint=None,
                    source="storyboard", language_injected=False,
                )
            else:
                caption_result = llm_caption_result
        lyrics = generate_reliable(word, article, settings.duration, caption_style=settings.caption_style)
        repetitions = count_word_occurrences(lyrics, word)
        lyrics_result = LyricsResult(lyrics=lyrics, source="template", word_repetitions=repetitions)
        return lyrics_result, caption_result

    # Generate lyrics locally (with article prefix on first occurrence)
    if settings.lyric_mode == "minimal":
        lyrics = generate_minimal(word, syllable_info, settings.duration, article=article, caption_style=settings.caption_style)
    elif settings.lyric_mode == "dramatic":
        lyrics = generate_dramatic(word, syllable_info, settings.syllable_chop, settings.duration, article=article, caption_style=settings.caption_style)
    else:  # standard
        lyrics = generate_standard(word, syllable_info, settings.duration, article=article, caption_style=settings.caption_style)

    repetitions = count_word_occurrences(lyrics, word)
    lyrics_result = LyricsResult(lyrics=lyrics, source="template", word_repetitions=repetitions)

    # Caption: use external if provided, otherwise generate via LLM (1 call)
    if external_music_caption:
        caption_result = CaptionResult(
            caption=external_music_caption, visual_hint=None,
            source="storyboard", language_injected=False,
        )
    else:
        caption_result = generate_caption(word, translation, language, settings, llm_client)

    return lyrics_result, caption_result


# ---------------------------------------------------------------------------
# LLM path: combined caption + lyrics in one call (1 call)
# ---------------------------------------------------------------------------

def _generate_llm_path(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    llm_client: OpenRouterClient,
    article: str = "",
    external_music_caption: str | None = None,
) -> tuple[LyricsResult, CaptionResult]:
    """LLM call for lyrics (and caption if no external caption). Total: 1 LLM call."""
    prompt = _build_combined_prompt(
        word, translation, language, settings, syllable_info, article,
        external_caption=external_music_caption,
    )

    raw_response = llm_client.generate(
        prompt=prompt,
        model=settings.llm_model,
        max_tokens=512,
    )

    if external_music_caption:
        # Parse lyrics-only response, use external caption
        lyrics_result = _parse_lyrics_only_response(raw_response, word, settings, syllable_info, article)
        caption_result = CaptionResult(
            caption=external_music_caption, visual_hint=None,
            source="storyboard", language_injected=False,
        )
        return lyrics_result, caption_result

    return _parse_combined_response(raw_response, word, language, settings, syllable_info, article)


def _build_combined_prompt(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    article: str = "",
    external_caption: str | None = None,
) -> str:
    """Build the lyrics prompt, optionally combined with caption (Section 8.3).

    When external_caption is provided, builds a lyrics-only prompt (no caption section).
    """
    lyrics_section = _build_lyrics_prompt(word, translation, language, settings, syllable_info, article)

    if external_caption:
        # Lyrics-only prompt — caption comes from storyboard
        return (
            f"{lyrics_section}\n"
            f"\n"
            f"Output format:\n"
            f"LYRICS:\n"
            f"[your structured lyrics]"
        )

    caption_section = build_caption_prompt_for_combined(word, translation, language, settings)

    prompt = (
        f"[SECTION 1: MUSIC CAPTION]\n"
        f"{caption_section}\n"
        f"\n"
        f"[SECTION 2: LYRICS]\n"
        f"{lyrics_section}\n"
        f"\n"
        f"Output format:\n"
        f"CAPTION: [your single-line music caption]\n"
        f"LYRICS:\n"
        f"[your structured lyrics]"
    )

    if settings.visual_hint:
        prompt += "\nVISUAL: mood1, mood2, mood3"

    return prompt


def _build_lyrics_prompt(
    word: str,
    translation: str,
    language: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    article: str = "",
) -> str:
    """Build the lyrics section of the combined prompt (Section 4.4)."""
    if settings.lyric_mode == "contextual":
        return _contextual_lyrics_prompt(word, translation, language, syllable_info, settings.duration, article)
    return _creative_lyrics_prompt(word, translation, language, syllable_info, settings.duration, article)


def _contextual_lyrics_prompt(
    word: str, translation: str, language: str, syllable_info: SyllableInfo,
    duration: int = 30, article: str = "",
) -> str:
    """Contextual mode lyrics prompt from Section 4.4."""
    reps = "2-3" if duration == 15 else "3-5"
    word_info = f'TARGET WORD: {word} ({translation})' if translation else f'TARGET WORD: {word}'
    article_line = ""
    if article:
        article_line = (
            f'GRAMMATICAL ARTICLE: {article} — always use "{article} {word}" on the first mention in lyrics. '
            f'NEVER use any other article with this word.\n'
        )
    return (
        f'You are writing lyrics for a {duration}-second vocabulary learning song.\n'
        f'\n'
        f'{word_info}\n'
        f'LANGUAGE: {language}\n'
        f'SYLLABLE COUNT: {syllable_info.count}\n'
        f'{article_line}'
        f'\n'
        f'Write short, structured lyrics following these rules:\n'
        f'- The target word MUST appear {reps} times\n'
        f'- Add 1-2 very short phrases (3-5 words) in {language} that USE the target word naturally\n'
        f'- Phrases must use simple, high-frequency vocabulary — no rare words\n'
        f'- Use Ace-Step section tags: [Verse], [Chorus], [Spoken Word], [Outro]\n'
        f'- You may add one energy descriptor per tag (e.g., [Verse - Gentle])\n'
        f'- Keep lines short: 1-4 words per line\n'
        f'- Use "..." for pauses and "!" for emphasis\n'
        f'- NEVER include translation or English words\n'
        f'- NEVER split the target word into parts\n'
        f'- This is a {duration}-second song — keep it brief\n'
        f'- Output ONLY the lyrics, no explanation'
    )


def _creative_lyrics_prompt(
    word: str, translation: str, language: str, syllable_info: SyllableInfo,
    duration: int = 30, article: str = "",
) -> str:
    """Creative mode lyrics prompt from Section 4.4."""
    reps = "2-3" if duration == 15 else "3-4"
    word_info = f'TARGET WORD: {word} ({translation})' if translation else f'TARGET WORD: {word}'
    article_line = ""
    if article:
        article_line = (
            f'GRAMMATICAL ARTICLE: {article} — always use "{article} {word}" on the first mention in lyrics. '
            f'NEVER use any other article with this word.\n'
        )
    return (
        f'You are writing lyrics for a {duration}-second vocabulary learning song.\n'
        f'\n'
        f'{word_info}\n'
        f'LANGUAGE: {language}\n'
        f'SYLLABLE COUNT: {syllable_info.count}\n'
        f'{article_line}'
        f'\n'
        f'Write short, poetic lyrics following these rules:\n'
        f'- The target word MUST appear {reps} times as the clear centerpiece\n'
        f'- Weave in 2-3 meaning-related words in {language} (synonyms, associated concepts)\n'
        f'- Use a maximum of 5 unique non-target words total\n'
        f'- Use Ace-Step section tags: [Verse], [Chorus], [Spoken Word], [Outro]\n'
        f'- You may add one energy descriptor per tag\n'
        f'- Keep lines short: 1-4 words per line\n'
        f'- Use "..." for pauses and "!" for emphasis\n'
        f'- NEVER include translation or English words\n'
        f'- NEVER split the target word into parts\n'
        f'- Prioritize musicality — these should feel like real song lyrics, not a language drill\n'
        f'- This is a {duration}-second song — keep it brief\n'
        f'- Output ONLY the lyrics, no explanation'
    )


# ---------------------------------------------------------------------------
# Combined response parsing
# ---------------------------------------------------------------------------

def _parse_lyrics_only_response(
    raw: str,
    word: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    article: str = "",
) -> LyricsResult:
    """Parse an LLM response that contains only lyrics (no caption section).

    Falls back to template lyrics if parsing fails.
    """
    lines = raw.split("\n")
    lyrics_idx = None
    for i, line in enumerate(lines):
        if line.strip().upper().startswith("LYRICS:"):
            lyrics_idx = i
            break

    if lyrics_idx is not None:
        lyrics_text = "\n".join(lines[lyrics_idx + 1:]).strip()
        if lyrics_text:
            repetitions = count_word_occurrences(lyrics_text, word)
            return LyricsResult(lyrics=lyrics_text, source="llm", word_repetitions=repetitions)

    # Try using entire response if it looks like lyrics (has section tags)
    stripped = raw.strip()
    if stripped and any(tag in stripped for tag in ("[Verse", "[Chorus", "[Spoken")):
        repetitions = count_word_occurrences(stripped, word)
        return LyricsResult(lyrics=stripped, source="llm", word_repetitions=repetitions)

    # Final fallback to template
    logger.warning("Failed to parse lyrics-only response. Falling back to template.")
    lyrics = generate_standard(word, syllable_info, settings.duration, article=article)
    repetitions = count_word_occurrences(lyrics, word)
    return LyricsResult(lyrics=lyrics, source="llm_fallback", word_repetitions=repetitions)


def _parse_combined_response(
    raw: str,
    word: str,
    language: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    article: str = "",
) -> tuple[LyricsResult, CaptionResult]:
    """Parse a combined LLM response into separate lyrics and caption.

    Looks for CAPTION:, LYRICS:, and optional VISUAL: markers.
    Falls back to template lyrics if parsing fails (Section 8.4).
    """
    caption_text, lyrics_text, visual_text = _extract_sections(raw)

    if caption_text and lyrics_text:
        # Successful parse
        caption_result = parse_caption_from_combined(caption_text, visual_text, language, settings)

        repetitions = count_word_occurrences(lyrics_text, word)
        lyrics_result = LyricsResult(lyrics=lyrics_text.strip(), source="llm", word_repetitions=repetitions)

        return lyrics_result, caption_result

    # Parsing failed — fallback (Section 8.4)
    logger.warning("Failed to parse combined LLM response. Falling back to template lyrics.")
    return _fallback(raw, word, language, settings, syllable_info, article)


def _extract_sections(raw: str) -> tuple[str | None, str | None, str | None]:
    """Extract CAPTION, LYRICS, and VISUAL sections from combined response.

    Uses string-based parsing instead of regex to avoid MULTILINE edge cases.
    Returns (caption_text, lyrics_text, visual_text). Any may be None.
    """
    caption_text = None
    lyrics_text = None
    visual_text = None

    lines = raw.split("\n")

    # Find marker positions
    caption_idx = None
    lyrics_idx = None
    visual_idx = None

    for i, line in enumerate(lines):
        stripped = line.strip().upper()
        if stripped.startswith("CAPTION:") and caption_idx is None:
            caption_idx = i
        elif stripped.startswith("LYRICS:") and lyrics_idx is None:
            lyrics_idx = i
        elif stripped.startswith("VISUAL:") and visual_idx is None:
            visual_idx = i

    # Extract CAPTION (single line, everything after "CAPTION:")
    if caption_idx is not None:
        caption_match = re.match(r"(?i)^CAPTION:\s*(.+)$", lines[caption_idx].strip())
        if caption_match:
            caption_text = caption_match.group(1).strip()

    # Extract LYRICS (everything from LYRICS: line to VISUAL: or end)
    if lyrics_idx is not None:
        end_idx = visual_idx if visual_idx is not None else len(lines)
        lyrics_lines = lines[lyrics_idx + 1 : end_idx]
        lyrics_text = "\n".join(lyrics_lines).strip()

    # Extract VISUAL (single line)
    if visual_idx is not None:
        visual_text = lines[visual_idx].strip()

    return caption_text, lyrics_text, visual_text


def _fallback(
    raw: str,
    word: str,
    language: str,
    settings: ConceptSettings,
    syllable_info: SyllableInfo,
    article: str = "",
) -> tuple[LyricsResult, CaptionResult]:
    """Fallback when combined response parsing fails.

    Uses standard template for lyrics and the raw first line as caption.
    """
    # Template lyrics (standard mode as fallback)
    lyrics = generate_standard(word, syllable_info, settings.duration, article=article)
    repetitions = count_word_occurrences(lyrics, word)
    lyrics_result = LyricsResult(lyrics=lyrics, source="llm_fallback", word_repetitions=repetitions)

    # Use raw first line as caption
    lines = [line.strip() for line in raw.strip().split("\n") if line.strip()]
    raw_caption = lines[0] if lines else f"{language} vocal, atmospheric"
    caption_result = parse_caption_from_combined(raw_caption, None, language, settings)

    return lyrics_result, caption_result
