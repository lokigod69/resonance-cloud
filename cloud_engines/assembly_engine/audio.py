"""Audio processing for the Assembly Engine.

Handles silence trimming and LUFS loudness normalization.
Per ENGINE_ASSEMBLY.md Section 8:
- Processing order: trim first, then normalize
- Song Engine output gets audio processing deferred to here by design
"""

from __future__ import annotations

import json
import logging
import re
import shutil
from pathlib import Path
from typing import Optional

from . import ffmpeg_builder
from .models import AssemblySettings, AudioProcessingReport

logger = logging.getLogger(__name__)

# Safety guard: never trim below this duration (Section 8.1)
MIN_TRIMMED_DURATION = 5.0


def trim_silence(
    audio_path: str,
    threshold_db: float,
    output_path: str,
) -> tuple[str, float, float]:
    """Trim silence from the start and end of an audio file.

    Per ENGINE_ASSEMBLY.md Section 8.1:
    - Uses FFMPEG silencedetect filter
    - Trims start and end only (never middle — pauses may be intentional)
    - Minimum remaining duration: 5 seconds (safety guard)

    Args:
        audio_path: Path to the input audio file.
        threshold_db: Silence threshold in dB (e.g., -40).
        output_path: Path to write the trimmed audio.

    Returns:
        (output_path, trimmed_start_seconds, trimmed_end_seconds)
    """
    # Get original duration
    original_duration = ffmpeg_builder.get_duration(audio_path)

    # Run silencedetect to find silent regions
    stderr = ffmpeg_builder.run_ffmpeg_for_stderr(
        [
            "-i", ffmpeg_builder.posix_path(audio_path),
            "-af", f"silencedetect=noise={threshold_db}dB:d=0.1",
            "-f", "null", "-",
        ],
        description="Detecting silence in audio",
    )

    # Parse silence markers from stderr
    silence_starts = []
    silence_ends = []
    for line in stderr.split("\n"):
        start_match = re.search(r"silence_start:\s*([0-9.]+)", line)
        end_match = re.search(r"silence_end:\s*([0-9.]+)", line)
        if start_match:
            silence_starts.append(float(start_match.group(1)))
        if end_match:
            silence_ends.append(float(end_match.group(1)))

    # Determine trim points
    trim_start = 0.0
    trim_end = original_duration

    # Leading silence: if first silence starts at or near 0
    if silence_ends and silence_starts:
        if len(silence_starts) > 0 and silence_starts[0] < 0.1:
            trim_start = silence_ends[0]

    # Trailing silence: if last silence region reaches the end of the file
    if silence_starts and silence_ends:
        last_silence_end = silence_ends[-1]
        if last_silence_end >= original_duration - 0.1:
            trim_end = silence_starts[-1]

    trimmed_start = trim_start
    trimmed_end = original_duration - trim_end

    # Safety guard: don't over-trim
    new_duration = trim_end - trim_start
    if new_duration < MIN_TRIMMED_DURATION:
        logger.warning(
            f"Trimmed duration ({new_duration:.1f}s) below safety minimum "
            f"({MIN_TRIMMED_DURATION}s). Skipping silence trim."
        )
        shutil.copy2(audio_path, output_path)
        return output_path, 0.0, 0.0

    # No significant silence found
    if trimmed_start < 0.05 and trimmed_end < 0.05:
        logger.info("No significant silence detected, skipping trim")
        shutil.copy2(audio_path, output_path)
        return output_path, 0.0, 0.0

    # Perform the actual trim
    ffmpeg_builder.run_ffmpeg(
        [
            "-i", ffmpeg_builder.posix_path(audio_path),
            "-ss", str(trim_start),
            "-to", str(trim_end),
            "-c:a", "flac",
            ffmpeg_builder.posix_path(output_path),
        ],
        description=f"Trimming silence: start={trimmed_start:.2f}s, end={trimmed_end:.2f}s",
    )

    logger.info(
        f"Trimmed silence: {trimmed_start:.2f}s from start, "
        f"{trimmed_end:.2f}s from end "
        f"({original_duration:.2f}s -> {new_duration:.2f}s)"
    )
    return output_path, trimmed_start, trimmed_end


def normalize_lufs(
    audio_path: str,
    target_lufs: float,
    output_path: str,
) -> tuple[str, Optional[float], Optional[float]]:
    """Two-pass LUFS loudness normalization.

    Per ENGINE_ASSEMBLY.md Section 8.2:
    - Uses FFMPEG loudnorm filter in two-pass mode
    - Target: configurable LUFS (default -14.0 = streaming standard)
    - True peak limit: -1.0 dBTP

    Args:
        audio_path: Path to the input audio file.
        target_lufs: Target integrated loudness in LUFS.
        output_path: Path to write the normalized audio.

    Returns:
        (output_path, original_lufs, final_lufs)
    """
    # Pass 1: Measure current loudness
    stderr = ffmpeg_builder.run_ffmpeg_for_stderr(
        [
            "-i", ffmpeg_builder.posix_path(audio_path),
            "-af", f"loudnorm=I={target_lufs}:TP=-1.0:LRA=11:print_format=json",
            "-f", "null", "-",
        ],
        description="LUFS measurement (pass 1)",
    )

    # Parse loudnorm JSON from stderr
    # The JSON block appears at the end of stderr
    loudnorm_data = _parse_loudnorm_json(stderr)
    if loudnorm_data is None:
        logger.warning("Could not parse loudnorm measurement, skipping normalization")
        shutil.copy2(audio_path, output_path)
        return output_path, None, None

    input_i = loudnorm_data.get("input_i", "0")
    input_tp = loudnorm_data.get("input_tp", "0")
    input_lra = loudnorm_data.get("input_lra", "0")
    input_thresh = loudnorm_data.get("input_thresh", "0")
    target_offset = loudnorm_data.get("target_offset", "0")

    original_lufs = float(input_i)

    # Pass 2: Apply correction with measured values
    loudnorm_filter = (
        f"loudnorm=I={target_lufs}:TP=-1.0:LRA=11"
        f":measured_I={input_i}"
        f":measured_TP={input_tp}"
        f":measured_LRA={input_lra}"
        f":measured_thresh={input_thresh}"
        f":offset={target_offset}"
        f":linear=true"
    )

    ffmpeg_builder.run_ffmpeg(
        [
            "-i", ffmpeg_builder.posix_path(audio_path),
            "-af", loudnorm_filter,
            "-ar", "48000",
            ffmpeg_builder.posix_path(output_path),
        ],
        description=f"LUFS normalization (pass 2): {original_lufs:.1f} -> {target_lufs:.1f} LUFS",
    )

    logger.info(f"LUFS normalized: {original_lufs:.1f} -> {target_lufs:.1f} LUFS")
    return output_path, original_lufs, target_lufs


def _parse_loudnorm_json(stderr: str) -> Optional[dict]:
    """Extract the loudnorm JSON block from FFMPEG stderr.

    The loudnorm filter prints a JSON summary at the end of stderr like:
    {
        "input_i" : "-18.50",
        "input_tp" : "-3.42",
        ...
    }
    """
    # Find the last JSON block in stderr
    brace_depth = 0
    json_start = -1
    json_end = -1

    for i in range(len(stderr) - 1, -1, -1):
        if stderr[i] == "}":
            if brace_depth == 0:
                json_end = i + 1
            brace_depth += 1
        elif stderr[i] == "{":
            brace_depth -= 1
            if brace_depth == 0:
                json_start = i
                break

    if json_start < 0 or json_end < 0:
        return None

    try:
        return json.loads(stderr[json_start:json_end])
    except json.JSONDecodeError:
        return None


def process_audio(
    audio_path: str,
    settings: AssemblySettings,
    temp_dir: str,
) -> AudioProcessingReport:
    """High-level audio processing: optionally trim silence, then normalize LUFS.

    Per ENGINE_ASSEMBLY.md Section 8.3:
    - Silence trim first (to get accurate duration for the master clock)
    - LUFS normalization second (on the trimmed audio)

    Args:
        audio_path: Path to the original song audio file.
        settings: Assembly settings with audio processing flags.
        temp_dir: Directory for intermediate audio files.

    Returns:
        AudioProcessingReport with all processing details.
    """
    original_duration = ffmpeg_builder.get_duration(audio_path)
    current_path = audio_path
    trimmed_start = 0.0
    trimmed_end = 0.0
    original_lufs: Optional[float] = None
    normalized_lufs: Optional[float] = None

    # Step 1: Silence trimming
    if settings.silence_trim:
        trimmed_path = str(Path(temp_dir) / "trimmed_audio.flac")
        try:
            current_path, trimmed_start, trimmed_end = trim_silence(
                audio_path=current_path,
                threshold_db=settings.silence_threshold_db,
                output_path=trimmed_path,
            )
        except RuntimeError as e:
            logger.warning(f"Silence trimming failed, using original audio: {e}")
            current_path = audio_path
            trimmed_start = 0.0
            trimmed_end = 0.0

    # Step 2: LUFS normalization
    if settings.lufs_normalize:
        normalized_path = str(Path(temp_dir) / "normalized_audio.flac")
        try:
            current_path, original_lufs, normalized_lufs = normalize_lufs(
                audio_path=current_path,
                target_lufs=settings.target_lufs,
                output_path=normalized_path,
            )
        except RuntimeError as e:
            logger.warning(f"LUFS normalization failed, skipping: {e}")

    # Calculate effective duration
    effective_duration = ffmpeg_builder.get_duration(current_path)

    return AudioProcessingReport(
        original_duration=original_duration,
        trimmed_silence_start=trimmed_start,
        trimmed_silence_end=trimmed_end,
        effective_duration=effective_duration,
        original_lufs=original_lufs,
        normalized_lufs=normalized_lufs,
        processed_path=current_path,
    )
