"""Full-song lyric builder for per-card song-only generation.

Parallels :mod:`level_song` but for a single vocabulary word. The shared concept
engine binds per-card lyrics to the 15-second video-clip duration
(``CLIP_DURATION_DEFAULT``), so a per-card "Long" song came back as one verse and
one chorus (see INV-LONGSONG-001). This builder frees song-only generation from
that clip duration: every depth (Simple / Phrase / Story / Long) produces a
complete song with familiar section tags and generic instrumental sections,
scaled by depth. Long is the fullest — multiple verses and choruses, a bridge,
several instrumental sections, and an outro; the shorter depths scale down but
stay songs, not clips.

This module is used only by ``song_only_concept.build_song_only_concept``. The
shared clip lyric prompts in :mod:`lyrics`, the caption path, and the video
pipeline are left untouched.
"""

from __future__ import annotations

import re
from typing import Literal, Protocol

from .llm_client import OpenRouterClient

SongDepth = Literal["simple", "phrase", "story", "long"]

# Generic instrumental section tags only — never instrument-specific tags such
# as [Guitar Solo], which Suno can mishandle and which the house style forbids.
GENERIC_INSTRUMENTAL_TAGS: tuple[str, ...] = (
    "[Interlude]",
    "[Instrumental Break]",
    "[Instrumental Solo]",
)

# Per-card song depths map 1:1 from the four UI lyric modes.
LYRIC_MODE_TO_SONG_DEPTH: dict[str, SongDepth] = {
    "reliable": "simple",
    "contextual": "phrase",
    "creative": "story",
    "dramatic": "long",
}

# Depth briefs encode the structure each depth targets. Section tags named here
# scale the song up: Simple stays compact; Long gains a pre-chorus, bridge, and
# outro. Guidance is qualitative (no rigid section counts).
_DEPTH_BRIEFS: dict[SongDepth, str] = {
    "simple": (
        "A short but complete song: an [Intro], a [Verse], and a returning "
        "[Chorus], with a generic instrumental section."
    ),
    "phrase": (
        "A complete song built from simple natural phrases: an [Intro], one or "
        "more [Verse] sections, and a returning [Chorus], with generic "
        "instrumental sections."
    ),
    "story": (
        "A fuller song that tells a small story around the word: an [Intro], "
        "several [Verse] sections, a returning [Chorus], a [Bridge], and generic "
        "instrumental sections."
    ),
    "long": (
        "A long, full-length song: an [Intro], many [Verse] sections, a "
        "[Pre-Chorus] and a [Chorus] that return several times, a [Bridge], "
        "several generic instrumental sections, and an [Outro] — generous "
        "material from start to finish."
    ),
}


class _LLMClient(Protocol):
    def generate(self, *, prompt: str, model: str):
        ...


def generate_full_song_lyrics(
    *,
    word: str,
    translation: str = "",
    language: str,
    language_code: str,
    depth: SongDepth,
    article: str = "",
    music_caption: str | None = None,
    llm_client: _LLMClient | None = None,
    llm_model: str = "deepseek/deepseek-v4-flash",
) -> str:
    """Return Suno-ready full-song lyrics for a single vocabulary word."""
    word = word.strip()
    if not word:
        raise ValueError("full song requires a target word")

    if llm_client is None:
        llm_client = OpenRouterClient()

    prompt = build_full_song_prompt(
        word=word,
        translation=translation,
        language=language,
        language_code=language_code,
        depth=depth,
        article=article,
        music_caption=music_caption,
    )
    result = llm_client.generate(prompt=prompt, model=llm_model)
    lyrics = _ensure_generic_instrumental_tag(result.content.strip())
    lyrics = _prepend_intro_opener(lyrics, word, article)
    return lyrics


def build_full_song_prompt(
    *,
    word: str,
    translation: str = "",
    language: str,
    language_code: str,
    depth: SongDepth,
    article: str = "",
    music_caption: str | None = None,
) -> str:
    word_info = f"{word} ({translation})" if translation else word
    article_line = ""
    if article:
        article_line = (
            f'Grammatical article: {article} — sing "{article} {word}" on the '
            f"first mention and keep the word spelled exactly as written.\n"
        )
    style_line = f"Music style: {music_caption}\n" if music_caption else ""
    tag_lines = "\n".join(f"- {tag}" for tag in GENERIC_INSTRUMENTAL_TAGS)
    brief = _DEPTH_BRIEFS[depth]

    return (
        "Write Suno-ready lyrics for a vocabulary learning song built around one "
        "target word.\n\n"
        f"Target word: {word_info}\n"
        f"Target language: {language} ({language_code})\n"
        f"{article_line}"
        f"{style_line}"
        f"Depth: {depth.title()} - {brief}\n\n"
        "Write a complete, real song a listener would enjoy from start to finish. "
        "Build evocative, thematic imagery around the meaning of the target word so "
        "the song stays interesting across its full length; let the word recur "
        "naturally as the song's thematic anchor, woven through the lines rather "
        "than chanted on every line.\n"
        "Sing the target word clearly and correctly, spelled exactly as written. "
        f"Sing in {language} throughout (English is welcome only when the target "
        "language is English), using natural, singable lines and beginner-friendly "
        "grammar.\n"
        "Shape the song with the familiar section tags shown in the depth "
        "description above, matching the structure and mood to the music style when "
        "one is given. Place one or more generic instrumental sections from this set "
        "wherever they suit the music:\n"
        f"{tag_lines}\n\n"
        "Return only the lyric text."
    )


# ---------------------------------------------------------------------------
# Post-processing
# ---------------------------------------------------------------------------

def _ensure_generic_instrumental_tag(lyrics: str) -> str:
    if any(tag in lyrics for tag in GENERIC_INSTRUMENTAL_TAGS):
        return lyrics
    return f"{lyrics.rstrip()}\n[Interlude]"


# Matches a leading [Intro...] section (tag line plus any following content lines
# that don't open a new section), including trailing blank lines.
_LEADING_INTRO_SECTION = re.compile(
    r"^\s*\[intro[^\]]*\]\s*\n(?:[^\[\n][^\n]*\n)*\n*",
    re.IGNORECASE,
)


def _prepend_intro_opener(lyrics: str, word: str, article: str) -> str:
    """Guarantee the lyrics open with a clean [Intro] singing the target word.

    Ensures the target word (article-prefixed when available) lands clearly at
    the very start of the song. If the model already produced its own leading
    [Intro], that section is replaced to avoid a duplicate intro.
    """
    cleaned = _LEADING_INTRO_SECTION.sub("", lyrics.lstrip(), count=1)
    opener_line = f"{article} {word}" if article else word
    return f"[Intro]\n{opener_line}\n\n{cleaned}"
