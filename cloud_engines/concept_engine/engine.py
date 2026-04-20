"""Main entry point for the Concept Engine.

Implements the engine contract: receives a payload, writes output files
to output_dir, always writes generation-meta.json, returns status.
"""

from __future__ import annotations

import json
import logging
import re
import time
from datetime import datetime, timezone
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

from . import __version__
from .article import resolve_article
from .llm_client import OpenRouterClient
from .lyrics import generate_lyrics, _patch_vocal_gender
from .caption import generate_caption
from .templates import count_word_occurrences, generate_phrase_suno_lyrics, generate_reliable, generate_suno_lyrics
from .models import (
    CaptionResult,
    ConceptArtifact,
    ConceptError,
    ConceptPayload,
    ConceptResult,
    GenerationInfo,
    GenerationMeta,
    LyricsResult,
    MetaContext,
    MetaInputs,
    MetaOutputs,
    MetaReproducibility,
    SyllableInfo,
)
from .syllables import analyze_word

logger = logging.getLogger(__name__)


def generate_concept(payload: ConceptPayload) -> ConceptResult:
    """Main engine function — the engine contract entry point.

    Receives a payload, produces a concept artifact.
    Follows the engine contract: writes output to payload.output_dir,
    always writes generation-meta.json, returns status.

    Args:
        payload: Complete engine input (content, settings, output_dir, metadata).

    Returns:
        ConceptResult with status, output_paths, and error (if any).
    """
    start_time = time.monotonic()
    output_dir = Path(payload.output_dir)
    timestamp = datetime.now(timezone.utc)
    timestamp_str = timestamp.strftime("%Y%m%dT%H%M%S")

    # Initialize tracking variables
    output_paths: list[str] = []
    error: ConceptError | None = None
    status = "failed"
    lyrics_source = ""
    caption_source = ""
    llm_calls = 0
    syllable_count = 0
    word_length_class = ""
    word_repetitions = 0

    try:
        # Step 1: Validate input
        _validate_input(payload, output_dir)

        is_phrase = payload.content.input_type == "phrase"
        lang_code = payload.content.language_code

        # Identity for observability (pipeline_events). Missing values are fine —
        # this is additive to ConceptMetadata and older callers pass None.
        identity = {
            "word_id": payload.metadata.word_id,
            "deck_id": payload.metadata.deck_id,
            "user_id": payload.metadata.user_id,
            "job_id": payload.metadata.job_id,
            "attempt": payload.metadata.attempt,
        }

        # Step 2: Analyze syllables — skipped for phrases (word-only concept)
        if is_phrase:
            # Placeholder values; word_length_class must satisfy Literal["short","medium","long"]
            # and count must be >= 1. These are dead data for reliable-mode phrase generation.
            syllable_info = SyllableInfo(count=1, word_length_class="short", fragments=[], method="phrase")
            syllable_count = 0
            word_length_class = "phrase"
        else:
            syllable_info = analyze_word(payload.content.word, lang_code)
            syllable_count = syllable_info.count
            word_length_class = syllable_info.word_length_class

        # Step 3: Create LLM client
        llm_client = OpenRouterClient()

        # Step 3.5: Resolve grammatical article — phrases never get a prepended article
        if is_phrase:
            article = ""
            skip_article = True
        else:
            article = resolve_article(payload.content.enrichment, lang_code)
            # Determine if articles should be skipped for reliable mode's LLM fallback
            enrichment = payload.content.enrichment
            pos = enrichment.pos.lower() if enrichment and enrichment.pos else ""
            if pos and pos != "noun":
                # POS explicitly says non-noun → no article in any language
                skip_article = True
            elif not pos and lang_code == "en":
                # No POS data + English → safest default is no article
                skip_article = True
            else:
                skip_article = False

        # Step 4: Generate lyrics + caption (0 or 1 LLM calls)
        # For phrases in reliable mode, intercept here to pass is_phrase
        # to generate_reliable() without modifying lyrics.py's call chain.
        if is_phrase and payload.settings.lyric_mode == "reliable":
            lyrics = generate_reliable(
                word=payload.content.word,
                article="",
                duration=payload.settings.duration,
                caption_style=payload.settings.caption_style,
                is_phrase=True,
                language_code=lang_code,
            )
            repetitions = count_word_occurrences(lyrics, payload.content.word)
            lyrics_result = LyricsResult(lyrics=lyrics, source="template", word_repetitions=repetitions)
            # Still need a caption — generate via LLM or use storyboard
            if payload.content.external_music_caption:
                # Patch vocal gender to match current settings (mirrors lyrics.py behaviour)
                patched_caption = _patch_vocal_gender(
                    payload.content.external_music_caption, payload.settings.vocal_gender
                )
                caption_result = CaptionResult(
                    caption=patched_caption, visual_hint=None,
                    source="storyboard", language_injected=False,
                )
            else:
                caption_result = generate_caption(
                    payload.content.word, payload.content.translation,
                    payload.content.language, payload.settings, llm_client,
                    identity=identity,
                )
        else:
            lyrics_result, caption_result = generate_lyrics(
                word=payload.content.word,
                translation=payload.content.translation,
                language=payload.content.language,
                language_code=lang_code,
                settings=payload.settings,
                syllable_info=syllable_info,
                llm_client=llm_client,
                article=article,
                skip_article=skip_article,
                external_music_caption=payload.content.external_music_caption,
                identity=identity,
            )

        lyrics_source = lyrics_result.source
        caption_source = caption_result.source
        word_repetitions = lyrics_result.word_repetitions

        # Infer LLM call count from sources
        if caption_source == "storyboard" and lyrics_source == "template":
            llm_calls = 0
        else:
            llm_calls = 1

        # Step 5: Build concept artifact
        genre_mode = "auto" if payload.settings.genre == "auto" else "manual"
        if is_phrase:
            suno_lyrics = generate_phrase_suno_lyrics(payload.content.word, lang_code)
        else:
            suno_lyrics = generate_suno_lyrics(word=payload.content.word, article=article)
        artifact = ConceptArtifact(
            word=payload.content.word,
            translation=payload.content.translation,
            language=payload.content.language,
            language_code=payload.content.language_code,
            lyrics=lyrics_result.lyrics,
            suno_lyrics=suno_lyrics,
            music_caption=caption_result.caption,
            visual_hint=None,  # DEPRECATED — storyboard handles visuals
            generation_info=GenerationInfo(
                lyric_mode=payload.settings.lyric_mode,
                genre_mode=genre_mode,
                syllable_count=syllable_count,
                word_length_class=word_length_class,
                llm_calls=llm_calls,
                lyrics_source=lyrics_source,
                caption_source=caption_source,
                article_used=article,
            ),
        )

        # Step 6: Generate filename
        filename = _generate_filename(
            lyric_mode=payload.settings.lyric_mode,
            genre=payload.settings.genre,
            caption=caption_result.caption,
            timestamp_str=timestamp_str,
        )

        # Step 7: Write artifact JSON
        artifact_path = output_dir / filename
        artifact_path.write_text(
            json.dumps(artifact.model_dump(), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        output_paths.append(filename)
        status = "success"

    except ValueError as e:
        error = ConceptError(message=str(e), retryable=False, type="validation_error")
        logger.error("Validation error: %s", e)

    except ConnectionError as e:
        error = ConceptError(message=str(e), retryable=True, type="connection_error")
        logger.error("Connection error: %s", e)

    except RuntimeError as e:
        error = ConceptError(message=str(e), retryable=True, type="generation_error")
        logger.error("Generation error: %s", e)

    except Exception as e:
        error = ConceptError(message=str(e), retryable=False, type="unexpected_error")
        logger.exception("Unexpected error: %s", e)

    finally:
        # Step 8: Always write generation-meta.json
        elapsed = time.monotonic() - start_time
        _write_generation_meta(
            output_dir=output_dir,
            status=status,
            timestamp=timestamp.isoformat(),
            elapsed=elapsed,
            payload=payload,
            output_paths=output_paths,
            lyrics_source=lyrics_source,
            caption_source=caption_source,
            llm_calls=llm_calls,
            syllable_count=syllable_count,
            word_length_class=word_length_class,
            word_repetitions=word_repetitions,
            error=error,
        )

    return ConceptResult(status=status, output_paths=output_paths, error=error)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _validate_input(payload: ConceptPayload, output_dir: Path) -> None:
    """Validate the input payload and output directory."""
    if not output_dir.exists():
        raise ValueError(f"Output directory does not exist: {output_dir}")
    if not output_dir.is_dir():
        raise ValueError(f"Output path is not a directory: {output_dir}")


def _generate_filename(
    lyric_mode: str,
    genre: str,
    caption: str,
    timestamp_str: str,
) -> str:
    """Generate the output filename per Section 13.2.

    Template modes: {lyric_mode}_{timestamp}.json
    Auto-genre: auto-{genre-slug}_{timestamp}.json
    Manual genre: {genre-slug}_{timestamp}.json
    """
    if genre == "auto":
        # Extract genre from the caption (first few words before the comma)
        genre_slug = _extract_genre_slug(caption)
        if genre_slug:
            label = f"auto-{genre_slug}"
        else:
            label = lyric_mode
    elif genre != "auto":
        label = _slugify(genre)

    return f"{label}_{timestamp_str}.json"


def _extract_genre_slug(caption: str) -> str:
    """Extract a genre slug from the first segment of a caption.

    E.g., "melodic techno, warm pads, ..." → "melodic-techno"
    """
    # Take text before the first comma
    first_segment = caption.split(",")[0].strip()
    return _slugify(first_segment)


def _slugify(text: str) -> str:
    """Convert text to a URL/filename-safe slug."""
    text = text.lower().strip()
    text = re.sub(r"[^a-z0-9\s-]", "", text)
    text = re.sub(r"[\s]+", "-", text)
    text = text.strip("-")
    # Limit length
    return text[:40] if text else "concept"


def _write_generation_meta(
    output_dir: Path,
    status: str,
    timestamp: str,
    elapsed: float,
    payload: ConceptPayload,
    output_paths: list[str],
    lyrics_source: str,
    caption_source: str,
    llm_calls: int,
    syllable_count: int,
    word_length_class: str,
    word_repetitions: int,
    error: ConceptError | None,
) -> None:
    """Write generation-meta.json. Always called, even on failure."""
    outputs = None
    reproducibility = None

    if output_paths:
        outputs = MetaOutputs(
            primary=output_paths[0],
            lyrics_source=lyrics_source,
            caption_source=caption_source,
            llm_calls_made=llm_calls,
            syllable_count=syllable_count,
            word_length_class=word_length_class,
            word_repetitions=word_repetitions,
        )
        reproducibility = MetaReproducibility(
            llm_model=payload.settings.llm_model,
        )

    meta = GenerationMeta(
        status=status,
        engine_version=__version__,
        timestamp=timestamp,
        duration_seconds=round(elapsed, 2),
        context=MetaContext(
            word=payload.content.word,
            language=payload.content.language,
            translation=payload.content.translation,
        ),
        inputs=MetaInputs(
            settings_used=payload.settings.model_dump(),
        ),
        outputs=outputs,
        reproducibility=reproducibility,
        error=error,
    )

    meta_path = output_dir / "generation-meta.json"
    try:
        meta_path.write_text(
            json.dumps(
                meta.model_dump(exclude_none=True),
                indent=2,
                ensure_ascii=False,
            ),
            encoding="utf-8",
        )
    except Exception as e:
        logger.error("Failed to write generation-meta.json: %s", e)
