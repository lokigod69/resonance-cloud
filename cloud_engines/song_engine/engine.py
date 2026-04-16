"""Song Engine — main entry point.

Per ENGINE_SONG.md Section 12.2:
generate_song(payload) → SongResult

This is the engine contract entry point. It:
1. Validates input
2. Builds Ace-Step parameters
3. Calls the configured backend
4. Copies audio files to output_dir as take_NNN.flac
5. Writes generation-meta.json (always, even on failure)
6. Returns status
"""

from __future__ import annotations

import json
import logging
import os
import shutil
import time
from datetime import datetime, timezone
from pathlib import Path

from . import __version__
from .acestep_base import AceStepBackend, create_backend
from .language import inject_language_tags
from .models import (
    AceStepParams,
    AceStepTiming,
    GenerationMeta,
    GenerationMetaAceStep,
    GenerationMetaContext,
    GenerationMetaInputs,
    GenerationMetaLora,
    GenerationMetaLoraConstraints,
    GenerationMetaOutputs,
    GenerationMetaReproducibility,
    SongError,
    SongPayload,
    SongResult,
    TakeInfo,
)
from .params import build_acestep_params
from src.cost_logger import log_cost

logger = logging.getLogger(__name__)

# Environment variable defaults
DEFAULT_ACESTEP_URL = "http://127.0.0.1:8001"
DEFAULT_ACESTEP_BACKEND = "http"


def generate_song(payload: SongPayload) -> SongResult:
    """Main engine function — the engine contract entry point.

    Receives a payload, calls Ace-Step, writes output files to
    payload.output_dir, always writes generation-meta.json, returns status.

    Args:
        payload: Complete engine input (content, settings, output_dir, metadata).

    Returns:
        SongResult with status, output_paths, and error (if any).
    """
    start_time = time.monotonic()
    timestamp = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    output_dir = Path(payload.output_dir)

    # These will be populated as we go — used in the finally block for meta
    params: AceStepParams | None = None
    caption_modified = False
    backend: AceStepBackend | None = None
    output_paths: list[str] = []
    takes: list[TakeInfo] = []
    seeds: list[int] = []
    timing: AceStepTiming | None = None
    error: SongError | None = None
    status = "failed"
    warning: str | None = None

    try:
        # --- Step 1: Validate input ---
        _validate_input(payload, output_dir)

        # --- Step 2: Build Ace-Step parameters ---
        params, caption_modified = build_acestep_params(payload.content, payload.settings)

        if caption_modified:
            logger.info("Caption modified: language signal appended (Layer 2 safety net)")

        if payload.settings.lora_path:
            logger.info(
                f"LoRA active: {payload.settings.lora_path} at strength "
                f"{payload.settings.lora_strength}, thinking forced off"
            )

        # --- Step 2b: Inject inline language tags into lyrics ---
        params.lyrics = inject_language_tags(params.lyrics, payload.content.language_code)
        logger.info(f"Injected [{payload.content.language_code}] tags into lyrics")

        # --- Step 3: Create backend ---
        backend_type = os.environ.get("ACESTEP_BACKEND", DEFAULT_ACESTEP_BACKEND)
        backend_url = os.environ.get("ACESTEP_URL", DEFAULT_ACESTEP_URL)
        backend = create_backend(backend_type, backend_url)

        logger.info(f"Using {backend.backend_name} backend at {backend.url}")

        # --- Step 4: Call Ace-Step ---
        response = backend.generate(params)

        if not response.audio_paths:
            raise RuntimeError("Ace-Step returned no audio files")

        seeds = response.seeds
        timing = response.timing

        # --- Step 5: Copy audio files to output_dir ---
        output_paths, takes = _copy_audio_files(
            audio_paths=response.audio_paths,
            output_dir=output_dir,
            seeds=seeds,
            backend=backend,
        )

        # Check for partial batch
        if len(output_paths) < payload.settings.batch_size:
            warning = f"Requested {payload.settings.batch_size} takes, received {len(output_paths)}"
            logger.warning(warning)

        status = "success"

        # Cost tracking — ACE-Step is self-hosted, $0 variable cost
        log_cost(
            stage="song",
            provider="self_hosted",
            model="acestep-v15-sft",
            status="success",
            usage_metrics={
                "batch_size": len(output_paths),
                "inference_steps": params.inference_steps if params else None,
                "duration_seconds": params.duration if params else None,
                "backend": backend.backend_name if backend else "unknown",
            },
            estimated_cost_usd=0.0,
            duration_ms=int((time.monotonic() - start_time) * 1000),
        )

    except ValueError as e:
        # Validation errors — not retryable
        error = SongError(message=str(e), retryable=False, type="validation_error")
        logger.error(f"Validation error: {e}")

    except ConnectionError as e:
        # Ace-Step unreachable — retryable
        error = SongError(message=str(e), retryable=True, type="connection_error")
        logger.error(f"Connection error: {e}")

    except RuntimeError as e:
        # Generation failed — retryable
        error = SongError(message=str(e), retryable=True, type="generation_error")
        logger.error(f"Generation error: {e}")

    except Exception as e:
        # Unexpected error
        error = SongError(message=str(e), retryable=False, type="unexpected_error")
        logger.exception(f"Unexpected error: {e}")

    finally:
        # --- Step 6: Write generation-meta.json (ALWAYS) ---
        elapsed = time.monotonic() - start_time
        _write_generation_meta(
            output_dir=output_dir,
            status=status,
            timestamp=timestamp,
            elapsed=elapsed,
            payload=payload,
            params=params,
            caption_modified=caption_modified,
            backend=backend,
            takes=takes,
            seeds=seeds,
            timing=timing,
            error=error,
            warning=warning,
        )

    # --- Step 7: Return result ---
    return SongResult(
        status=status,
        output_paths=output_paths,
        error=error,
    )


def _validate_input(payload: SongPayload, output_dir: Path) -> None:
    """Validate the input payload. Fail fast on missing required fields.

    Per ENGINE_SONG.md Section 10.4.
    """
    if not payload.content.lyrics.strip():
        raise ValueError("Lyrics cannot be empty")

    if not payload.content.music_caption.strip():
        raise ValueError("Music caption cannot be empty")

    if not payload.content.language_code.strip():
        raise ValueError("Language code is required — never use 'unknown'")

    if payload.content.language_code.lower() == "unknown":
        raise ValueError("Language code 'unknown' is not allowed — set an explicit ISO 639-1 code")

    if not output_dir.exists():
        raise ValueError(f"Output directory does not exist: {output_dir}. The orchestrator must create it.")

    if not output_dir.is_dir():
        raise ValueError(f"Output path is not a directory: {output_dir}")


def _copy_audio_files(
    audio_paths: list[str],
    output_dir: Path,
    seeds: list[int],
    backend: AceStepBackend,
) -> tuple[list[str], list[TakeInfo]]:
    """Copy audio files from Ace-Step output to the workspace output_dir.

    Renames files to take_001.flac, take_002.flac, etc.
    Per ENGINE_SONG.md Section 6.3.
    """
    output_paths: list[str] = []
    takes: list[TakeInfo] = []

    for i, audio_path in enumerate(audio_paths):
        take_num = i + 1
        take_filename = f"take_{take_num:03d}.flac"
        dest = output_dir / take_filename

        # Try to copy the file
        src = Path(audio_path)
        if src.exists():
            shutil.copy2(src, dest)
        elif hasattr(backend, "download_file"):
            backend.download_file(audio_path, dest)
        else:
            logger.warning(f"Cannot access audio file: {audio_path}")
            continue

        if dest.exists():
            output_paths.append(take_filename)
            seed = seeds[i] if i < len(seeds) else None
            takes.append(TakeInfo(file=take_filename, seed=seed))
            logger.info(f"Written: {take_filename} (seed={seed})")

    return output_paths, takes


def _write_generation_meta(
    output_dir: Path,
    status: str,
    timestamp: str,
    elapsed: float,
    payload: SongPayload,
    params: AceStepParams | None,
    caption_modified: bool,
    backend: AceStepBackend | None,
    takes: list[TakeInfo],
    seeds: list[int],
    timing: AceStepTiming | None,
    error: SongError | None,
    warning: str | None,
) -> None:
    """Write generation-meta.json to output_dir.

    Per ENGINE_SONG.md Section 9: this is written ALWAYS, even on failure.
    """
    settings_used = {}
    if params:
        settings_used = {
            "duration": params.duration,
            "batch_size": params.batch_size,
            "inference_steps": params.inference_steps,
            "guidance_scale": params.guidance_scale,
            "thinking": params.thinking,
            "seed": params.seed,
            "bpm": params.bpm,
            "audio_format": params.audio_format,
        }

    meta = GenerationMeta(
        status=status,
        engine="song-engine",
        engine_version=__version__,
        timestamp=timestamp,
        duration_seconds=round(elapsed, 2),
        context=GenerationMetaContext(
            word=payload.metadata.word,
            language=payload.metadata.language,
            translation=payload.metadata.translation,
        ),
        inputs=GenerationMetaInputs(
            concept_version=payload.metadata.concept_version,
            lyrics_hash=payload.content.lyrics_hash(),
            caption=params.caption if params else payload.content.music_caption,
            caption_modified=caption_modified,
            language_code=payload.content.language_code,
            language_tags_injected=params is not None,
            tagged_lyrics_preview=params.lyrics[:200] if params else None,
            settings_used=settings_used,
        ),
        outputs=GenerationMetaOutputs(
            takes=takes,
            format="flac",
            sample_rate=48000,
            requested_duration=payload.settings.duration,
        ) if takes else None,
        acestep=GenerationMetaAceStep(
            backend=backend.backend_name if backend else "unknown",
            url=backend.url if backend else "unknown",
            model="acestep-v15-sft",
            infer_method=params.infer_method if params else "ode",
            shift=params.shift if params else 2.5,
            thinking=params.thinking if params else True,
            use_cot_caption=False,
            use_cot_language=False,
            use_cot_metas=False,
            enable_normalization=True,
            normalization_db=-1.0,
            lm_temperature=params.lm_temperature if params else 0.85,
        ) if backend or params else None,
        lora=GenerationMetaLora(
            path=payload.settings.lora_path,
            strength=payload.settings.lora_strength,
            trigger_phrase=payload.settings.lora_trigger_phrase,
            active=bool(payload.settings.lora_path),
            constraints_applied=GenerationMetaLoraConstraints(
                thinking_forced_off=bool(payload.settings.lora_path),
                cot_forced_off=bool(payload.settings.lora_path),
            ),
        ),
        timing=timing,
        reproducibility=GenerationMetaReproducibility(
            seeds=seeds,
            deterministic=bool(seeds and params and isinstance(params.seed, (int, list)) and params.seed != -1),
            note=_reproducibility_note(seeds, params),
        ) if seeds or params else None,
        error=error,
        warning=warning,
    )

    meta_path = output_dir / "generation-meta.json"
    try:
        meta_path.write_text(
            json.dumps(meta.model_dump(exclude_none=True), indent=2, ensure_ascii=False),
            encoding="utf-8",
        )
        logger.info(f"Written: generation-meta.json ({status})")
    except Exception as e:
        # Even if meta writing fails, don't crash the engine return
        logger.error(f"Failed to write generation-meta.json: {e}")


def _reproducibility_note(seeds: list[int], params: AceStepParams | None) -> str:
    """Generate the reproducibility note for generation-meta.json."""
    if not params:
        return "Generation failed before parameters were built."

    if isinstance(params.seed, list):
        return "Fixed seeds provided per take. To reproduce, use the same seeds with identical inputs."
    elif params.seed == -1:
        return "Seeds were randomly generated. To reproduce a specific take, use its seed with batch_size=1 and identical inputs."
    else:
        return f"Fixed seed {params.seed}. With ODE inference and identical inputs, output should be deterministic."
