import json
import logging
import time
from datetime import datetime, timezone
from pathlib import Path

import httpx
from src.services.events import write_event_row

from .color import extract_background_tint, extract_dominant_color
from .config import find_font, get_ffmpeg_version
from .ffmpeg_builder import (
    concatenate_segments,
    probe_media,
    re_encode_assembled_video,
)
from .models import (
    BookendError,
    BookendGenerationMeta,
    BookendPayload,
    BookendResult,
    GenerationMetaContext,
    TtsResult,
)
from .timing import calculate_segment_durations
from .tts import generate_pronunciation, normalize_tts_audio, to_elevenlabs_lang
from .word_card import generate_word_card_segment, get_cjk_font_path, render_word_card_image

logger = logging.getLogger(__name__)


async def wrap(payload: BookendPayload) -> BookendResult:
    """
    Main engine function. Wraps an assembled video with TTS-narrated
    intro and outro word card segments.

    Always writes generation-meta.json, even on failure.
    """
    output_dir = Path(payload.output_dir)
    start_time = time.monotonic()

    # Initialize tracking variables — default to failed, set success only on completion
    status = "failed"
    error: BookendError | None = None
    output_paths: list[str] = []
    tts_result: TtsResult | None = None
    assembled_duration: float | None = None
    timing: dict[str, float] | None = None
    final_info: dict | None = None

    meta = BookendGenerationMeta(
        status="failed",
        timestamp=datetime.now(timezone.utc).isoformat(),
        context=GenerationMetaContext(
            word=payload.content.word,
            language=payload.content.language,
            translation=payload.content.translation,
        ),
        inputs={
            "assembly_version": payload.metadata.assembly_version,
            "settings_used": payload.settings.model_dump(),
        },
        reproducibility={
            "ffmpeg_version": get_ffmpeg_version(),
            "elevenlabs_model": payload.settings.model_id,
        },
    )

    try:
        # ── STEP 1: VALIDATE INPUTS ──
        assembled_video = Path(payload.content.assembled_video)
        if not assembled_video.exists():
            raise FileNotFoundError(
                f"Assembled video not found: {assembled_video}"
            )

        video_info = probe_media(str(assembled_video))
        width = video_info["width"]
        height = video_info["height"]
        fps = int(video_info["fps"])
        assembled_duration = video_info["duration"]

        font_path = find_font(payload.settings.font)
        # Latin extended fallback — used when the primary font lacks coverage
        # for accented Latin characters but the text isn't CJK. find_font's
        # name-based scan returns the regular (Latin-only) Noto Sans here,
        # which is the right behavior for that case.
        try:
            latin_fallback_path = (
                find_font("Noto Sans")
                if payload.settings.font != "Noto Sans"
                else font_path
            )
        except RuntimeError:
            latin_fallback_path = ""
        # CJK fallback — used when the text contains Hangul/Hanzi/Kana that
        # the primary font cannot render. Resolved via dedicated finder that
        # handles .ttc fonts and Windows Malgun Gothic, which find_font misses.
        cjk_fallback_path = get_cjk_font_path() or ""

        # ── STEP 2: GENERATE TTS ──
        tts_output = output_dir / "tts_pronunciation.mp3"

        # Check for existing TTS from previous bookend versions
        previous_tts = None
        bookend_parent = output_dir.parent
        if bookend_parent.exists():
            for sibling in sorted(bookend_parent.iterdir()):
                if sibling.is_dir() and sibling != output_dir:
                    candidate = sibling / "tts_pronunciation.mp3"
                    if candidate.exists() and candidate.stat().st_size > 0:
                        previous_tts = str(candidate)
                        break

        tts_result = await generate_pronunciation(
            word=payload.content.word,
            voice_id=payload.settings.voice_id,
            model_id=payload.settings.model_id,
            output_path=str(tts_output),
            previous_tts_path=previous_tts,
            language_code=payload.content.language_code,
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
        )

        meta.tts = {
            "characters_used": tts_result.characters_used,
            "voice_id": payload.settings.voice_id,
            "model_id": payload.settings.model_id,
            "audio_duration_seconds": tts_result.duration_seconds,
            "audio_file": "tts_pronunciation.mp3",
            "language_code": payload.content.language_code,
            "language_code_elevenlabs": to_elevenlabs_lang(payload.content.language_code) if payload.content.language_code else None,
        }

        # ── STEP 2b: NORMALIZE TTS AUDIO ──
        normalized_tts = normalize_tts_audio(str(tts_output), target_lufs=-14.0)

        # ── STEP 3: CALCULATE TIMING ──
        timing = calculate_segment_durations(
            tts_duration=tts_result.duration_seconds,
            settings_buffer_pct=payload.settings.display_buffer_pct,
            settings_min=payload.settings.display_duration_min,
            settings_max=payload.settings.display_duration_max,
            settings_fade=payload.settings.fade_duration,
        )

        # ── STEP 4: RESOLVE TEXT COLOR ──
        if payload.settings.text_color == "auto":
            resolved_color, color_source = extract_dominant_color(
                str(assembled_video)
            )
        elif payload.settings.text_color == "white":
            resolved_color, color_source = "#FFFFFF", "preset_white"
        else:
            resolved_color, color_source = payload.settings.text_color, "manual"

        # ── STEP 4b: RESOLVE GRADIENT BACKGROUND TINT ──
        gradient_tint_color = None
        gradient_tint_source = None
        if payload.settings.gradient_background:
            gradient_tint_color, gradient_tint_source = extract_background_tint(
                str(assembled_video)
            )

        meta.visual = {
            "text_color_mode": payload.settings.text_color,
            "text_color_resolved": resolved_color,
            "text_color_source": color_source,
            "font_used": font_path,
            "word_displayed": payload.content.word,
            "translation_displayed": (
                payload.content.translation
                if payload.settings.show_translation
                else None
            ),
            "phonetic_displayed": None,  # Phonetic deferred
            "gradient_background": payload.settings.gradient_background,
            "gradient_tint_color": gradient_tint_color,
            "gradient_tint_source": gradient_tint_source,
        }

        # ── STEP 5: RENDER WORD CARD IMAGE ──
        card_image = output_dir / "_card_frame.png"
        render_word_card_image(
            word=payload.content.word,
            translation=(
                payload.content.translation
                if payload.settings.show_translation
                else None
            ),
            phonetic=None,  # Deferred
            width=width,
            height=height,
            font_path=font_path,
            font_size=payload.settings.font_size,
            text_color=resolved_color,
            background_color=payload.settings.background_color,
            output_path=str(card_image),
            fallback_font_path=latin_fallback_path,
            cjk_fallback_path=cjk_fallback_path,
            gradient_background=payload.settings.gradient_background,
            gradient_tint_color=gradient_tint_color,
        )

        # ── STEP 6: GENERATE INTRO SEGMENT ──
        intro_path = output_dir / "_intro.mp4"
        generate_word_card_segment(
            card_image_path=str(card_image),
            tts_audio_path=normalized_tts,
            segment_duration=timing["intro_duration"],
            tts_start_offset=timing["tts_start_offset"],
            fps=fps,
            output_path=str(intro_path),
            fade_in_duration=payload.settings.fade_duration,
            fade_out_duration=0,
        )

        # ── STEP 7: GENERATE OUTRO SEGMENT ──
        outro_path = None
        if not payload.settings.skip_outro:
            outro_path = output_dir / "_outro.mp4"
            tts_for_outro = normalized_tts if payload.settings.outro_mode != "silent" else None
            generate_word_card_segment(
                card_image_path=str(card_image),
                tts_audio_path=tts_for_outro,
                segment_duration=timing["outro_duration"],
                tts_start_offset=timing["tts_start_offset"],
                fps=fps,
                output_path=str(outro_path),
                fade_in_duration=payload.settings.fade_duration,
                fade_out_duration=0,
            )

        # ── STEP 8: RE-ENCODE ASSEMBLED VIDEO FOR COMPATIBILITY ──
        compat_video = output_dir / "_assembled_compat.mp4"
        re_encode_assembled_video(
            input_path=str(assembled_video),
            output_path=str(compat_video),
            target_width=width,
            target_height=height,
            target_fps=fps,
        )

        # ── STEP 9: CONCATENATE ──
        final_path = output_dir / "final.mp4"
        concatenate_segments(
            intro_path=str(intro_path),
            assembled_path=str(compat_video),
            outro_path=str(outro_path) if outro_path else None,
            output_path=str(final_path),
        )

        # ── STEP 10: PROBE FINAL OUTPUT ──
        final_info = probe_media(str(final_path))

        meta.outputs = {
            "primary": "final.mp4",
            "format": "mp4",
            "total_duration_seconds": final_info["duration"],
            "intro_duration_seconds": timing["intro_duration"],
            "outro_duration_seconds": timing["outro_duration"] if not payload.settings.skip_outro else 0.0,
            "assembled_video_duration_seconds": assembled_duration,
            "resolution": f"{final_info['width']}x{final_info['height']}",
            "file_size_bytes": final_info["file_size"],
        }

        # ── STEP 11: CLEAN UP TEMP FILES ──
        # TODO: Re-enable cleanup after confirming audio glitch fix.
        # Keeping intermediate files (_intro.mp4, _outro.mp4,
        # _assembled_compat.mp4) for inspection.
        # for tmp in [card_image, intro_path, outro_path, compat_video]:
        #     try:
        #         tmp.unlink(missing_ok=True)
        #     except Exception:
        #         pass
        # concat_list = output_dir / "_concat_list.txt"
        # try:
        #     concat_list.unlink(missing_ok=True)
        # except Exception:
        #     pass

        # Clean up normalized TTS temp file (not needed for inspection)
        try:
            Path(normalized_tts).unlink(missing_ok=True)
        except Exception:
            pass

        status = "success"
        output_paths = ["final.mp4"]

    except ValueError as e:
        logger.warning(f"Validation error: {e}")
        error = BookendError(message=str(e), retryable=False, type="validation_error")
    except (httpx.HTTPError, ConnectionError, OSError) as e:
        logger.error(f"Connection/IO error: {e}")
        error = BookendError(message=str(e), retryable=True, type="connection_error")
    except RuntimeError as e:
        logger.error(f"Runtime error: {e}")
        error = BookendError(message=str(e), retryable=True, type="generation_error")
    except Exception as e:
        logger.error(f"Unexpected error: {e}", exc_info=True)
        error = BookendError(message=str(e), retryable=False, type="unexpected_error")
    finally:
        try:
            meta.duration_seconds = round(time.monotonic() - start_time, 2)
            meta.status = status
            if error:
                meta.error = error.message
            meta_path = output_dir / "generation-meta.json"
            with open(meta_path, "w", encoding="utf-8") as f:
                json.dump(meta.model_dump(exclude_none=True), f, indent=2)
        except Exception as meta_err:
            logger.error(f"Failed to write generation-meta.json: {meta_err}")
        write_event_row(
            stage="bookend",
            sub_step="summary",
            status=status,
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            cost_usd=0.0,
            error_message=error.message if error else None,
            error_type=error.type if error else None,
            latency_ms=int((time.monotonic() - start_time) * 1000),
            metadata={
                "voice_id": payload.settings.voice_id,
                "model_id": payload.settings.model_id,
                "skip_outro": payload.settings.skip_outro,
                "outro_mode": payload.settings.outro_mode,
                "tts_characters_used": (
                    tts_result.characters_used if tts_result is not None else None
                ),
                "tts_duration_seconds": (
                    tts_result.duration_seconds if tts_result is not None else None
                ),
                "assembled_video_duration": assembled_duration,
                "intro_duration_seconds": (
                    timing.get("intro_duration") if timing is not None else None
                ),
                "outro_duration_seconds": (
                    timing.get("outro_duration") if timing is not None else None
                ),
                "total_duration_seconds": (
                    final_info.get("duration") if final_info is not None else None
                ),
                "resolution": (
                    f"{final_info['width']}x{final_info['height']}"
                    if final_info is not None
                    else None
                ),
                "cost_estimation": "none",
            },
        )

    return BookendResult(status=status, output_paths=output_paths, error=error)
