"""Level-song lyric builders for grouped vocabulary."""

from __future__ import annotations

from collections import Counter
from dataclasses import dataclass
from typing import Literal, Protocol

from .llm_client import OpenRouterClient

LevelSongDepth = Literal["simple", "phrase", "story", "long"]

GENERIC_INSTRUMENTAL_TAGS: tuple[str, ...] = (
    "[Interlude]",
    "[Instrumental Break]",
    "[Instrumental Solo]",
)

_DEPTH_BRIEFS: dict[LevelSongDepth, str] = {
    "simple": "Word-only chant for clear target-term drilling.",
    "phrase": "Short sung phrases that repeat the target terms with simple surrounding language.",
    "story": "A compact scene that links the target terms through a memorable image.",
    "long": "A fuller chant with verse, hook, and bridge movement across the full target list.",
}


@dataclass(frozen=True)
class LevelSongEntry:
    target: str
    gloss: str = ""


class _LLMClient(Protocol):
    def generate(self, *, prompt: str, model: str):
        ...


def generate_level_song_lyrics(
    *,
    entries: list[LevelSongEntry],
    language: str,
    language_code: str,
    depth: LevelSongDepth,
    llm_client: _LLMClient | None = None,
    llm_model: str = "deepseek/deepseek-v4-flash",
) -> str:
    """Return Suno-ready lyrics for a vocabulary level."""
    clean_entries = _normalize_entries(entries)

    if depth == "simple":
        lyrics = _build_simple_lyrics(clean_entries)
        _validate_targets_present(lyrics, clean_entries)
        return lyrics

    if llm_client is None:
        llm_client = OpenRouterClient()

    prompt = build_level_song_prompt(
        entries=clean_entries,
        language=language,
        language_code=language_code,
        depth=depth,
    )
    result = llm_client.generate(prompt=prompt, model=llm_model)
    lyrics = _ensure_generic_instrumental_tag(result.content.strip())
    _validate_targets_present(lyrics, clean_entries)
    return lyrics


def build_level_song_prompt(
    *,
    entries: list[LevelSongEntry],
    language: str,
    language_code: str,
    depth: LevelSongDepth,
) -> str:
    clean_entries = _normalize_entries(entries)
    if depth == "simple":
        return _build_simple_prompt(clean_entries, language, language_code)

    word_lines = "\n".join(
        f"- {entry.target} = {entry.gloss}" if entry.gloss else f"- {entry.target}"
        for entry in clean_entries
    )
    tag_lines = "\n".join(f"- {tag}" for tag in GENERIC_INSTRUMENTAL_TAGS)
    brief = _DEPTH_BRIEFS[depth]

    return (
        "Write Suno-ready lyrics for a vocabulary level song.\n\n"
        f"Target language: {language} ({language_code})\n"
        f"Depth: {depth.title()} - {brief}\n\n"
        "Vocabulary list:\n"
        f"{word_lines}\n\n"
        "Use every target term in the sung lyrics with spelling unchanged. "
        "Glosses are private meaning context for imagery and phrasing.\n"
        "Write sung lines mainly in the target language, using beginner-friendly "
        "grammar and natural repetition. Keep lines short enough for clear diction.\n"
        "Shape the lyric as a song with familiar section tags such as [Verse], "
        "[Chorus], [Bridge], or [Outro]. Include one or more generic instrumental "
        "section tags from this set:\n"
        f"{tag_lines}\n\n"
        "Return only the lyric text."
    )


def _build_simple_prompt(
    entries: list[LevelSongEntry],
    language: str,
    language_code: str,
) -> str:
    word_lines = "\n".join(f"- {entry.target}" for entry in entries)
    return (
        "Build a word-only vocabulary chant from this list.\n\n"
        f"Target language: {language} ({language_code})\n"
        f"{word_lines}\n\n"
        "Place each target term on its own sung line and add generic section tags."
    )


def _build_simple_lyrics(entries: list[LevelSongEntry]) -> str:
    lines = ["[Verse]"]
    lines.extend(entry.target for entry in entries)
    lines.extend(["[Interlude]", "[Instrumental Break]"])
    return "\n".join(lines)


def _normalize_entries(entries: list[LevelSongEntry]) -> list[LevelSongEntry]:
    clean_entries: list[LevelSongEntry] = []
    for entry in entries:
        target = entry.target.strip()
        gloss = entry.gloss.strip()
        if target:
            clean_entries.append(LevelSongEntry(target=target, gloss=gloss))
    if not clean_entries:
        raise ValueError("level song requires at least one target term")
    return clean_entries


def _ensure_generic_instrumental_tag(lyrics: str) -> str:
    if any(tag in lyrics for tag in GENERIC_INSTRUMENTAL_TAGS):
        return lyrics
    return f"{lyrics.rstrip()}\n[Interlude]"


def _validate_targets_present(lyrics: str, entries: list[LevelSongEntry]) -> None:
    expected = Counter(entry.target for entry in entries)
    missing = [
        target
        for target, required_count in expected.items()
        if lyrics.count(target) < required_count
    ]
    if missing:
        raise ValueError(f"level song lyrics missing target terms: {', '.join(missing)}")
