"""Lyric generation for the Concept Engine.

Routes to template-based or LLM-based generation depending on lyric_mode.
For template modes (minimal/standard/reliable): generates lyrics locally,
then calls caption.py for the music caption (1 LLM call).
For LLM modes (contextual/creative/dramatic): builds a combined prompt
that returns both caption and lyrics in one call (1 LLM call).

When an external_music_caption is provided (from the image engine storyboard),
template modes skip the LLM call entirely (0 calls), and LLM modes only
generate lyrics (1 call, no caption in prompt).

Dramatic mode ("Song" level) is LLM-based and receives the resolved
music_caption in its prompt so the lyrics match the musical style.

Maximum LLM calls per generation: 0 or 1.
"""

from __future__ import annotations

import logging
import re

from src.services.events import logged_llm_call

from .caption import (
    build_caption_prompt_for_combined,
    generate_caption,
    generate_caption_with_article,
    parse_caption_from_combined,
)
from .llm_client import OpenRouterClient
from .models import CaptionResult, ConceptSettings, LyricsResult, SyllableInfo
from .templates import count_word_occurrences, generate_minimal, generate_reliable, generate_standard

logger = logging.getLogger(__name__)

# Template modes that use hardcoded lyrics (zero LLM cost for lyrics)
TEMPLATE_MODES = ("minimal", "standard", "reliable")
# LLM modes that combine caption + lyrics in one call
LLM_MODES = ("contextual", "creative", "dramatic")


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
    identity: dict | None = None,
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
        return _generate_template_path(word, translation, language, settings, syllable_info, llm_client, article, skip_article, language_code, external_music_caption, identity)
    return _generate_llm_path(word, translation, language, settings, syllable_info, llm_client, article, external_music_caption, identity)


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
    identity: dict | None = None,
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
                caption_result = generate_caption(word, translation, language, settings, llm_client, identity=identity)
        else:
            # No enrichment article, POS allows it — need LLM for article discovery
            article, llm_caption_result = generate_caption_with_article(
                word, translation, language, settings, llm_client, language_code, identity=identity,
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
        caption_result = generate_caption(word, translation, language, settings, llm_client, identity=identity)

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
    identity: dict | None = None,
) -> tuple[LyricsResult, CaptionResult]:
    """LLM call for lyrics (and caption if no external caption). Total: 1 LLM call."""
    prompt = _build_combined_prompt(
        word, translation, language, settings, syllable_info, article,
        external_caption=external_music_caption,
    )

    ident = identity or {}
    with logged_llm_call(
        stage="concept",
        sub_step="lyrics_combined_llm",
        word_id=ident.get("word_id"),
        deck_id=ident.get("deck_id"),
        user_id=ident.get("user_id"),
        job_id=ident.get("job_id"),
        attempt=ident.get("attempt"),
        model_provider="openrouter",
        model_name=settings.llm_model,
        system_prompt="",
        user_prompt=prompt,
        metadata={
            "lyric_mode": settings.lyric_mode,
            "has_external_caption": bool(external_music_caption),
        },
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

    if external_music_caption:
        # Parse lyrics-only response, use external caption
        lyrics_result = _parse_lyrics_only_response(result.content, word, settings, syllable_info, article)
        lyrics_result = _apply_intro_opener(lyrics_result, word, article)
        caption_result = CaptionResult(
            caption=external_music_caption, visual_hint=None,
            source="storyboard", language_injected=False,
        )
        return lyrics_result, caption_result

    lyrics_result, caption_result = _parse_combined_response(
        result.content, word, language, settings, syllable_info, article,
    )
    lyrics_result = _apply_intro_opener(lyrics_result, word, article)
    return lyrics_result, caption_result


def _apply_intro_opener(lyrics_result: LyricsResult, word: str, article: str) -> LyricsResult:
    """Return a new LyricsResult with the deterministic [Intro] opener prepended.

    Recounts word repetitions since the opener contributes one occurrence of
    the target word (article-prefixed when applicable).
    """
    new_lyrics = _prepend_intro_opener(lyrics_result.lyrics, word, article)
    new_reps = count_word_occurrences(new_lyrics, word)
    return LyricsResult(
        lyrics=new_lyrics,
        source=lyrics_result.source,
        word_repetitions=new_reps,
    )


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
    For dramatic mode, the external_caption (if provided) is threaded into the
    lyrics prompt as MUSIC STYLE context. When no external_caption is provided
    and mode is dramatic, the lyrics section references the caption being
    generated in SECTION 1 above.
    """
    lyrics_section = _build_lyrics_prompt(
        word, translation, language, settings, syllable_info, article,
        music_caption=external_caption,
    )

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
    music_caption: str | None = None,
) -> str:
    """Build the lyrics section of the combined prompt (Section 4.4).

    The music_caption parameter is used only by dramatic mode — when present,
    it describes the musical style so the LLM can match the song's structure.
    When dramatic mode runs without an external caption, the lyrics prompt
    references SECTION 1 (where the caption is being generated in the same call).
    """
    if settings.lyric_mode == "contextual":
        return _contextual_lyrics_prompt(word, translation, language, syllable_info, settings.duration, article)
    if settings.lyric_mode == "dramatic":
        return _dramatic_lyrics_prompt(word, translation, language, article, music_caption)
    return _creative_lyrics_prompt(word, translation, language, syllable_info, settings.duration, article)


def _contextual_lyrics_prompt(
    word: str, translation: str, language: str, syllable_info: SyllableInfo,
    duration: int = 30, article: str = "",
) -> str:
    """Contextual mode lyrics prompt (Phrase / Level 2)."""
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
    """Creative mode lyrics prompt (Story / Level 3)."""
    reps = "5-6" if duration == 15 else "6-8"
    word_info = f'TARGET WORD: {word} ({translation})' if translation else f'TARGET WORD: {word}'
    article_line = ""
    if article:
        article_line = (
            f'GRAMMATICAL ARTICLE: {article} — always use "{article} {word}" on the first mention in lyrics. '
            f'NEVER use any other article with this word.\n'
        )
    return (
        f'You are writing song lyrics for a vocabulary learning flashcard.\n'
        f'\n'
        f'{word_info}\n'
        f'LANGUAGE: {language}\n'
        f'SYLLABLE COUNT: {syllable_info.count}\n'
        f'{article_line}'
        f'\n'
        f'Write lyrics that follow these rules:\n'
        f'- Write several short verses or a verse+chorus structure\n'
        f'  that features the target word naturally throughout.\n'
        f'- Use chorus-style repetition: the chorus or hook should repeat the target\n'
        f'  word multiple times to aid memorability. The repetition should feel like\n'
        f'  a song hook, not a drill.\n'
        f'- Use Ace-Step section tags: [Verse], [Chorus], [Bridge], [Outro]\n'
        f'- You may add one energy descriptor per tag\n'
        f'- The target word must appear at least {reps} times across the full lyrics\n'
        f'- Use natural sentences in {language}, with idiomatic flavor\n'
        f'- Keep lines short: 2-8 words per line\n'
        f'- NEVER include translation or English words\n'
        f'- NEVER split the target word into parts\n'
        f'- Prioritize musicality — these should feel like real song lyrics, not a language drill\n'
        f'- Output ONLY the lyrics, no explanation'
    )


def _dramatic_lyrics_prompt(
    word: str, translation: str, language: str,
    article: str = "", music_caption: str | None = None,
) -> str:
    """Dramatic mode lyrics prompt (Song / Level 4).

    Repurposed from the old template-based dramatic. Full-length, genre-aware
    song whose structure adapts to the provided music_caption. If music_caption
    is None (no external caption + combined-prompt case), the prompt references
    SECTION 1 of the combined call where the caption is being generated.
    """
    word_info = f'TARGET WORD: {word} ({translation})' if translation else f'TARGET WORD: {word}'
    article_line = ""
    if article:
        article_line = (
            f'GRAMMATICAL ARTICLE: {article} — always use "{article} {word}" on the first mention. '
            f'NEVER use any other article with this word.\n'
        )
    if music_caption:
        music_style_line = f'MUSIC STYLE: {music_caption}\n'
        style_match_intro = 'Match the song\'s structure to the music style described above:\n'
    else:
        music_style_line = 'MUSIC STYLE: (see [SECTION 1: MUSIC CAPTION] above — match this lyrics structure to the caption you are generating there)\n'
        style_match_intro = 'Match the song\'s structure to the music caption you are generating in SECTION 1:\n'
    return (
        f'You are writing full song lyrics for a vocabulary learning music video.\n'
        f'\n'
        f'{word_info}\n'
        f'LANGUAGE: {language}\n'
        f'{article_line}'
        f'{music_style_line}'
        f'\n'
        f'Write a real, full-length song that follows these rules EXACTLY:\n'
        f'\n'
        f'1. Write a full song. The target word should be a thematic\n'
        f'   anchor, appearing multiple times across the song, but the lyrics should feel\n'
        f'   like a real song about that word\'s meaning — not a vocabulary drill.\n'
        f'\n'
        f'2. {style_match_intro}'
        f'   - Pop / rock / folk: tight verse + chorus + bridge structure.\n'
        f'   - Rap / hip-hop / techno: looser, denser flow with fewer hard section breaks.\n'
        f'   - Orchestral / cinematic / ambient: sparser lines, more breathing room.\n'
        f'   - Jazz / R&B: organic structure, hook-driven.\n'
        f'\n'
        f'3. Use Ace-Step section tags appropriate to the structure: [Verse], [Chorus],\n'
        f'   [Bridge], [Pre-Chorus], [Outro], etc.\n'
        f'\n'
        f'4. The target word must appear at least 8 times across the full lyrics.\n'
        f'\n'
        f'5. Use natural, song-like {language} lyrics.\n'
        f'\n'
        f'6. NEVER include translation, English words (unless target language is English),\n'
        f'   or words from any other language.\n'
        f'\n'
        f'7. Output ONLY the lyrics, no commentary.'
    )


# ---------------------------------------------------------------------------
# Deterministic [Intro] opener
# ---------------------------------------------------------------------------

# Matches a leading [Intro...] section (the tag line plus any following content
# lines that don't themselves open a new section), up to and including any
# trailing blank lines. Content lines are identified as lines that don't start
# with "[" — we stop when we hit either a blank line (consumed as part of the
# match) or the next section tag (not consumed).
_LEADING_INTRO_SECTION = re.compile(
    r"^\s*\[intro[^\]]*\]\s*\n(?:[^\[\n][^\n]*\n)*\n*",
    re.IGNORECASE,
)


def _prepend_intro_opener(lyrics: str, word: str, article: str) -> str:
    """Guarantee the lyrics begin with a deterministic [Intro] opener.

    Ensures the target word (article-prefixed when available) lands inside the
    first seconds of the generated song, regardless of what the LLM produced.

    If the LLM's output already begins with its own [Intro] section, that
    section is stripped first to avoid duplicate intros. Sections introduced
    by other tags ([Verse], [Chorus], etc.) are left in place.

    Pure: string in, string out, no side effects.
    """
    cleaned = _LEADING_INTRO_SECTION.sub("", lyrics.lstrip(), count=1)
    opener_line = f"{article} {word}" if article else word
    return f"[Intro]\n{opener_line}\n\n{cleaned}"


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
