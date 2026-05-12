"""Hardcoded lyric templates for the Concept Engine.

Template modes (minimal, standard, reliable) × three word length classes
(short, medium, long). The `dramatic` mode was repurposed as the
"Song" level and moved to an LLM-based path in lyrics.py; its former
template lives only in git history.

Phrase-specific templates (generate_phrase_suno_lyrics) use stop-word-based
fragment extraction and 5 randomised templates of varying length to give Suno
enough material for 60+ second songs.
"""

from __future__ import annotations

import random

from cloud_engines.duration_policy import CLIP_DURATION_DEFAULT, duration_band

from .models import SyllableInfo


# ---------------------------------------------------------------------------
# Phrase lyric utilities — stop-word filtering & fragment extraction
# ---------------------------------------------------------------------------

_STOP_WORDS: dict[str, set[str]] = {
    "en": {"i", "you", "he", "she", "we", "they", "it",
           "the", "a", "an", "is", "are", "was", "were",
           "be", "been", "being", "have", "has", "had",
           "do", "does", "did", "that", "this", "these",
           "those", "in", "on", "at", "to", "for", "of",
           "and", "or", "but", "so", "yet", "with", "from"},
    "de": {"ich", "du", "er", "sie", "wir", "ihr", "es",
           "der", "die", "das", "ein", "eine", "einen",
           "ist", "sind", "war", "waren", "sein", "hab",
           "habe", "hat", "haben", "in", "an", "auf",
           "mit", "von", "zu", "und", "oder", "aber",
           "für", "aus", "bei", "nach", "durch"},
    "fr": {"je", "tu", "il", "elle", "nous", "vous", "ils",
           "le", "la", "les", "un", "une", "des",
           "est", "sont", "être", "avoir", "ai", "a",
           "en", "à", "de", "du", "au", "aux",
           "et", "ou", "mais", "que", "qui", "dans",
           "sur", "par", "avec", "pour"},
    "it": {"io", "tu", "lui", "lei", "noi", "voi", "loro",
           "il", "la", "lo", "le", "un", "una",
           "è", "sono", "essere", "avere", "ha", "ho",
           "in", "a", "di", "da", "su", "per",
           "e", "o", "ma", "che", "chi", "con"},
    "es": {"yo", "tú", "él", "ella", "nosotros", "vosotros", "ellos",
           "el", "la", "los", "las", "un", "una", "unos", "unas",
           "es", "son", "ser", "estar", "estoy", "está",
           "en", "a", "de", "del", "al", "con", "por", "para",
           "y", "o", "pero", "que", "quien", "como", "sin",
           "me", "te", "se", "nos", "lo", "le"},
    "pt": {"eu", "tu", "ele", "ela", "nós", "eles", "elas",
           "o", "a", "os", "as", "um", "uma", "uns", "umas",
           "é", "são", "ser", "estar", "está", "tem", "tenho",
           "em", "de", "do", "da", "ao", "por", "para",
           "e", "ou", "mas", "que", "com", "sem"},
    "tl": {"ako", "ikaw", "siya", "kami", "tayo", "kayo", "sila",
           "ang", "ng", "sa", "na", "at", "o", "pero",
           "ay", "nang", "kung", "para", "dahil"},
    "ceb": {"ako", "ikaw", "siya", "kami", "kita", "kamo", "sila",
            "ang", "sa", "og", "ug", "o", "apan",
            "mao", "nga", "kay", "para"},
}

_FILLER_WORDS: dict[str, list[str]] = {
    "en": ["yeah", "oh", "ah", "mmm", "hey", "woah", "ooh"],
    "de": ["ja", "oh", "ah", "hey", "ach", "hmm", "ooh"],
    "fr": ["oui", "oh", "ah", "mmm", "allez", "hé", "ooh"],
    "it": ["sì", "oh", "ah", "dai", "mmm", "hey", "ooh"],
    "es": ["sí", "oh", "ay", "eh", "oye", "mmm", "ah"],
    "tl": ["oo", "ay", "hay", "naman", "oh", "ah"],
    "ceb": ["oo", "ay", "hay", "man", "oh", "ah"],
}
_FILLER_DEFAULT = ["oh", "ah", "mmm", "yeah", "hey"]


def _get_stop_words(language_code: str) -> set[str]:
    """Return stop word set for the given language, falling back to English."""
    return _STOP_WORDS.get(language_code, _STOP_WORDS["en"])


def _get_filler_pool(language_code: str) -> list[str]:
    """Return filler word pool for the given language."""
    return _FILLER_WORDS.get(language_code, _FILLER_DEFAULT)


def _extract_fragments(phrase: str, language_code: str) -> dict:
    """
    Extract musically useful fragments from a phrase using stop-word filtering.

    Returns a dict with:
      - full: the complete phrase
      - content: list of all content words (stop words removed)
      - first: first content word (or first word if all are stop words)
      - last: last content word (or last word if all are stop words)
      - joined: content words joined with spaces
    """
    if not phrase or not phrase.strip():
        return {"full": phrase, "content": [], "first": "", "last": "", "joined": ""}
    words = phrase.strip().split()
    stop = _get_stop_words(language_code)
    content = [w for w in words if w.lower() not in stop]

    # Fallback: if stop words remove everything, use all words
    if not content:
        content = words

    return {
        "full": phrase,
        "content": content,
        "first": content[0],
        "last": content[-1],
        "joined": " ".join(content),
    }


def _maybe_filler(pool: list[str], probability: float = 0.35) -> str:
    """Return a random filler word with given probability, else empty string."""
    if random.random() < probability:
        return random.choice(pool)
    return ""


def _filler_prefix(pool: list[str], probability: float = 0.35) -> str:
    """Return 'filler, ' prefix or empty string."""
    f = _maybe_filler(pool, probability)
    return f"{f}, " if f else ""


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def generate_minimal(word: str, syllable_info: SyllableInfo, duration: int = CLIP_DURATION_DEFAULT, article: str = "", caption_style: str = "vocal_forward") -> str:
    """Generate minimal mode lyrics. Maximum phonological clarity, zero distractions.

    Repetitions scale with the unified clip-duration band.
    """
    ap = f"{article} " if article else ""
    wlc = syllable_info.word_length_class
    production = caption_style == "production"
    compact = duration_band(duration) in ("very_sparse", "sparse")

    if wlc == "short":
        if compact:
            return (
                f"[Verse]\n"
                f"{ap}{word}...\n"
                f"\n"
                f"[Chorus]\n"
                f"{word}!"
            )
        return (
            f"[Verse]\n"
            f"{ap}{word}...\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus]\n"
            f"{word}!\n"
            f"{word}!"
        )

    elif wlc == "medium":
        if compact:
            return (
                f"[Verse]\n"
                f"{ap}{word}...\n"
                f"\n"
                f"[Chorus]\n"
                f"{word}!"
            )
        return (
            f"[Verse]\n"
            f"{ap}{word}...\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus]\n"
            f"{word}!"
        )

    else:  # long
        if production:
            if compact:
                return (
                    f"[Verse]\n"
                    f"{ap}{word}...\n"
                    f"\n"
                    f"[Chorus]\n"
                    f"{word}!"
                )
            return (
                f"[Verse]\n"
                f"{ap}{word}...\n"
                f"\n"
                f"[Verse]\n"
                f"{word}...\n"
                f"\n"
                f"[Chorus]\n"
                f"{word}!"
            )
        # vocal_forward
        if compact:
            return (
                f"[Spoken Word]\n"
                f"{ap}{word}...\n"
                f"\n"
                f"[Chorus]\n"
                f"{word}!"
            )
        return (
            f"[Spoken Word]\n"
            f"{ap}{word}...\n"
            f"\n"
            f"[Verse]\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus]\n"
            f"{word}!"
        )


def generate_standard(word: str, syllable_info: SyllableInfo, duration: int = CLIP_DURATION_DEFAULT, article: str = "", caption_style: str = "vocal_forward") -> str:
    """Generate standard mode lyrics with delivery variation.

    Repetitions scale with the unified clip-duration band.
    """
    ap = f"{article} " if article else ""
    wlc = syllable_info.word_length_class
    production = caption_style == "production"
    compact = duration_band(duration) in ("very_sparse", "sparse")

    if wlc == "short":
        if compact:
            return (
                f"[Verse - Steady]\n"
                f"{ap}{word}...\n"
                f"{word}...\n"
                f"\n"
                f"[Chorus - Building]\n"
                f"{word}!\n"
                f"{word}!"
            )
        if production:
            return (
                f"[Verse - Steady]\n"
                f"{ap}{word}...\n"
                f"{word}... {word}...\n"
                f"\n"
                f"[Chorus - Building]\n"
                f"{word}! {word}!\n"
                f"{word}! {word}! {word}!\n"
                f"\n"
                f"[Outro - Fading]\n"
                f"{word}..."
            )
        return (
            f"[Spoken Word]\n"
            f"{ap}{word}...\n"
            f"\n"
            f"[Verse - Steady]\n"
            f"{word}...\n"
            f"{word}... {word}...\n"
            f"\n"
            f"[Chorus - Building]\n"
            f"{word}! {word}!\n"
            f"{word}! {word}! {word}!\n"
            f"\n"
            f"[Outro - Fading]\n"
            f"{word}..."
        )

    elif wlc == "medium":
        if compact:
            return (
                f"[Verse - Steady]\n"
                f"{ap}{word}...\n"
                f"\n"
                f"[Chorus - Building]\n"
                f"{word}!\n"
                f"{word}!"
            )
        if production:
            return (
                f"[Verse - Steady]\n"
                f"{ap}{word}...\n"
                f"{word}...\n"
                f"\n"
                f"[Chorus - Building]\n"
                f"{word}!\n"
                f"{word}! {word}!\n"
                f"\n"
                f"[Outro - Fading]\n"
                f"{word}..."
            )
        return (
            f"[Spoken Word]\n"
            f"{ap}{word}...\n"
            f"\n"
            f"[Verse - Steady]\n"
            f"{word}...\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus - Building]\n"
            f"{word}!\n"
            f"{word}! {word}!\n"
            f"\n"
            f"[Outro - Fading]\n"
            f"{word}..."
        )

    else:  # long
        if compact:
            if production:
                return (
                    f"[Chorus - Building]\n"
                    f"{ap}{word}!\n"
                    f"{word}!"
                )
            return (
                f"[Spoken Word]\n"
                f"{ap}{word}...\n"
                f"\n"
                f"[Chorus - Building]\n"
                f"{word}!\n"
                f"{word}!"
            )
        if production:
            return (
                f"[Verse - Steady]\n"
                f"{ap}{word}...\n"
                f"\n"
                f"[Chorus - Building]\n"
                f"{word}!\n"
                f"{word}!\n"
                f"\n"
                f"[Outro - Fading]\n"
                f"{word}..."
            )
        return (
            f"[Spoken Word]\n"
            f"{ap}{word}...\n"
            f"\n"
            f"[Verse - Steady]\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus - Building]\n"
            f"{word}!\n"
            f"{word}!\n"
            f"\n"
            f"[Outro - Fading]\n"
            f"{word}..."
        )


def generate_reliable(word: str, article: str, duration: int = CLIP_DURATION_DEFAULT,
                      caption_style: str = "vocal_forward",
                      is_phrase: bool = False,
                      language_code: str = "en") -> str:
    """Generate reliable mode lyrics. Fixed template with grammatical article.

    The article is determined by the LLM. Templates are word-length-agnostic.
    When is_phrase is True, uses fragment-based variation instead of pure repetition.
    """
    article_prefix = f"{article} " if article else ""
    production = caption_style == "production"
    band = duration_band(duration)
    compact = band in ("very_sparse", "sparse")
    dense = band == "dense"

    # --- Phrase branch: fragment-based template for ACE-Step ---
    if is_phrase:
        f = _extract_fragments(word, language_code)
        last = f["last"]
        if production:
            return (
                f"[Chorus - Building]\n"
                f"{last}!\n"
                f"{word}!\n"
                f"{word}!"
            )
        return (
            f"[Spoken Word]\n"
            f"{word}...\n"
            f"\n"
            f"[Verse - Steady]\n"
            f"{last}...\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus - Building]\n"
            f"{word}!\n"
            f"{word}!\n"
            f"\n"
            f"[Outro - Fading]\n"
            f"{word}..."
        )

    # --- Existing word logic ---
    if compact:
        if production:
            return (
                f"[Chorus - Building]\n"
                f"{article_prefix}{word}!\n"
                f"{article_prefix}{word}!"
            )
        return (
            f"[Spoken Word]\n"
            f"{article_prefix}{word}...\n"
            f"\n"
            f"[Chorus - Building]\n"
            f"{word}!\n"
            f"{article_prefix}{word}!\n"
            f"\n"
            f"[Spoken Word]\n"
            f"{article_prefix}{word}..."
        )

    if dense:
        if production:
            return (
                f"[Verse - Steady]\n"
                f"{article_prefix}{word}...\n"
                f"{word}...\n"
                f"\n"
                f"[Chorus - Building]\n"
                f"{word}!\n"
                f"{article_prefix}{word}!\n"
                f"\n"
                f"[Outro - Fading]\n"
                f"{article_prefix}{word}..."
            )
        return (
            f"[Spoken Word]\n"
            f"{article_prefix}{word}...\n"
            f"\n"
            f"[Verse - Steady]\n"
            f"{word}...\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus - Building]\n"
            f"{word}!\n"
            f"{article_prefix}{word}!\n"
            f"\n"
            f"[Spoken Word]\n"
            f"{article_prefix}{word}...\n"
            f"\n"
            f"[Outro - Fading]\n"
            f"{article_prefix}{word}..."
        )

    # Middle-density duration band.
    if production:
        return (
            f"[Verse - Steady]\n"
            f"{article_prefix}{word}...\n"
            f"{word}...\n"
            f"\n"
            f"[Chorus - Building]\n"
            f"{word}!\n"
            f"{article_prefix}{word}!\n"
            f"\n"
            f"[Outro - Fading]\n"
            f"{article_prefix}{word}..."
        )
    return (
        f"[Spoken Word]\n"
        f"{article_prefix}{word}...\n"
        f"\n"
        f"[Verse - Steady]\n"
        f"{word}...\n"
        f"{word}...\n"
        f"\n"
        f"[Chorus - Building]\n"
        f"{word}!\n"
        f"{article_prefix}{word}!\n"
        f"\n"
        f"[Outro - Fading]\n"
        f"{article_prefix}{word}..."
    )


# ---------------------------------------------------------------------------
# Suno template — single words
# ---------------------------------------------------------------------------

def generate_suno_lyrics(word: str, article: str = "") -> str:
    """Generate multi-section lyrics for Suno API.

    Produces a syllable-aware repetition pattern; Suno typically renders
    45-90s depending on genre and word length.
    Article (if present) is placed on 2 randomly chosen lines.

    For phrases, use generate_phrase_suno_lyrics() instead.
    """
    from .syllables import analyze_word

    has_article = article and article.lower() != "none"
    word_with_article = f"{article} {word}" if has_article else word

    syllable_info = analyze_word(word, "de")
    if syllable_info.count <= 2:
        sections = (
            ("Intro", 1),
            ("Verse", 2),
            ("Pre-Chorus", 2),
            ("Chorus", 3),
            ("Bridge", 2),
            ("Verse 2", 2),
            ("Outro", 2),
        )
    elif syllable_info.count <= 4:
        sections = (
            ("Intro", 1),
            ("Verse", 2),
            ("Pre-Chorus", 2),
            ("Chorus", 3),
            ("Outro", 2),
        )
    else:
        sections = (
            ("Intro", 1),
            ("Verse", 2),
            ("Chorus", 2),
            ("Outro", 1),
        )

    repetition_count = sum(line_count for _, line_count in sections)
    lines = [word] * repetition_count
    if has_article:
        positions = random.sample(range(repetition_count), 2)
        for pos in positions:
            lines[pos] = word_with_article

    rendered_sections = []
    offset = 0
    for section_name, line_count in sections:
        section_lines = lines[offset:offset + line_count]
        rendered_sections.append(f"[{section_name}]\n" + "\n".join(section_lines))
        offset += line_count

    return "\n\n".join(rendered_sections)


# ---------------------------------------------------------------------------
# Suno template — phrases (5 templates, varied length/energy)
# ---------------------------------------------------------------------------

def generate_phrase_suno_lyrics(phrase: str, language_code: str = "en") -> str:
    """
    Generate Suno lyrics for a phrase input.

    Selects randomly from 5 templates of varying length and energy:
      A — Jingle (~5-6 lines, ~20-25s)
      B — Compact build (~8 lines, ~30-35s)
      C — Object-first medium (~10 lines, ~40-45s)
      D — Full extended (~12 lines, ~55-60s)
      E — Chant rhythmic (~8 lines, ~30-35s)

    Fragment extraction uses language-aware stop-word filtering.
    Filler words are injected randomly from a per-language pool.
    """
    f = _extract_fragments(phrase, language_code)
    pool = _get_filler_pool(language_code)
    full = f["full"]
    first = f["first"]
    last = f["last"]
    joined = f["joined"]

    template = random.choice(["A", "B", "C", "D", "E"])

    # ------------------------------------------------------------------
    # Template A — Jingle (short, ~5-6 content lines)
    # Energy: punchy, minimal. Good for simple phrases.
    # ------------------------------------------------------------------
    if template == "A":
        fp = _filler_prefix(pool, 0.4)
        return (
            f"[Verse]\n"
            f"{last}\n"
            f"{full}\n"
            f"\n"
            f"[Chorus]\n"
            f"{fp}{full}!\n"
            f"{full}!\n"
            f"\n"
            f"[Outro]\n"
            f"{last}...\n"
            f"{full}..."
        )

    # ------------------------------------------------------------------
    # Template B — Compact build (~8 content lines)
    # Energy: fragments build toward the full phrase, then resolve.
    # ------------------------------------------------------------------
    if template == "B":
        fp = _filler_prefix(pool, 0.3)
        return (
            f"[Verse]\n"
            f"{first}... {last}\n"
            f"{full}\n"
            f"{full}\n"
            f"\n"
            f"[Chorus]\n"
            f"{fp}{full}!\n"
            f"{full}!\n"
            f"\n"
            f"[Bridge]\n"
            f"{joined}\n"
            f"\n"
            f"[Outro]\n"
            f"{full}..."
        )

    # ------------------------------------------------------------------
    # Template C — Object-first medium (~10 content lines)
    # Energy: key content word leads as hook, phrase resolves.
    # ------------------------------------------------------------------
    if template == "C":
        fp = _filler_prefix(pool, 0.35)
        return (
            f"[Verse]\n"
            f"{last}, {last}\n"
            f"{full}\n"
            f"{full}\n"
            f"\n"
            f"[Pre-Chorus]\n"
            f"{first}... {last}\n"
            f"{full}\n"
            f"\n"
            f"[Chorus]\n"
            f"{fp}{full}!\n"
            f"{full}!\n"
            f"{last}!\n"
            f"\n"
            f"[Outro]\n"
            f"{full}...\n"
            f"{last}..."
        )

    # ------------------------------------------------------------------
    # Template D — Full extended (~12 content lines)
    # Energy: maximum Suno duration, multi-section, varied repetition.
    # ------------------------------------------------------------------
    if template == "D":
        fp1 = _filler_prefix(pool, 0.4)
        fp2 = _filler_prefix(pool, 0.3)
        return (
            f"[Verse]\n"
            f"{last}\n"
            f"{last}, {last}\n"
            f"{full}\n"
            f"{full}\n"
            f"\n"
            f"[Pre-Chorus]\n"
            f"{first}... {last}\n"
            f"{full}\n"
            f"\n"
            f"[Chorus]\n"
            f"{fp1}{full}!\n"
            f"{full}!\n"
            f"{full}!\n"
            f"\n"
            f"[Bridge]\n"
            f"{joined}...\n"
            f"{fp2}{full}\n"
            f"\n"
            f"[Outro]\n"
            f"{full}...\n"
            f"{last}..."
        )

    # ------------------------------------------------------------------
    # Template E — Chant rhythmic (~8 content lines)
    # Energy: staccato, repetitive hook with rhythmic fragment stacking.
    # ------------------------------------------------------------------
    # template == "E"
    fp = _filler_prefix(pool, 0.25)
    return (
        f"[Verse]\n"
        f"{last}, {last}, {last}\n"
        f"{full}\n"
        f"\n"
        f"[Chorus]\n"
        f"{fp}{full}!\n"
        f"{last}!\n"
        f"{full}!\n"
        f"\n"
        f"[Bridge]\n"
        f"{first}, {last}\n"
        f"{full}\n"
        f"\n"
        f"[Outro]\n"
        f"{full}..."
    )


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def count_word_occurrences(lyrics: str, word: str) -> int:
    """Count how many times the target word appears in the lyrics."""
    # Count whole-word occurrences (the word may appear with punctuation)
    count = 0
    # Strip section tags and count word occurrences
    for line in lyrics.split("\n"):
        if line.startswith("["):
            continue
        # Count occurrences of the word (may be followed by !, ..., or space)
        count += line.count(word)
    return count
