import asyncio
import json
import logging
import shutil
import subprocess
from pathlib import Path

import httpx

from .config import get_api_key
from .models import TtsResult

logger = logging.getLogger(__name__)

# ElevenLabs uses different language codes than ACE-Step for some languages.
# Map manifest/ACE-Step codes → ElevenLabs-accepted codes.
# Unmapped codes pass through as-is (de, en, it, fr, etc. work directly).
ELEVENLABS_LANG_MAP = {
    "tl": "fil",   # Tagalog → Filipino
    "ceb": "fil",  # Cebuano → Filipino
}


def to_elevenlabs_lang(code: str) -> str:
    """Map a manifest language code to ElevenLabs-compatible code."""
    return ELEVENLABS_LANG_MAP.get(code, code)


async def generate_pronunciation(
    word: str,
    voice_id: str,
    model_id: str,
    output_path: str,
    previous_tts_path: str | None = None,
    language_code: str | None = None,
) -> TtsResult:
    """
    Call ElevenLabs TTS API for the target word.
    Returns TtsResult with audio_path, duration, characters_used.
    Retries on rate limits. Skips if output_path already exists.
    Reuses previous TTS file if provided.
    """
    output = Path(output_path)

    # Skip if already generated in THIS output dir
    if output.exists() and output.stat().st_size > 0:
        duration = probe_audio_duration(str(output))
        return TtsResult(
            audio_path=str(output),
            duration_seconds=duration,
            characters_used=0,  # 0 because we didn't call the API
        )

    # Reuse TTS from a previous bookend version if available
    if previous_tts_path and Path(previous_tts_path).exists():
        output.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(previous_tts_path, str(output))
        duration = probe_audio_duration(str(output))
        return TtsResult(
            audio_path=str(output),
            duration_seconds=duration,
            characters_used=0,
        )

    logger.info(f"TTS: word='{word}', lang='{language_code}', model='{model_id}'")

    api_key = get_api_key()
    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"

    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }

    body = {
        "text": word,
        "model_id": model_id,
        "voice_settings": {
            "stability": 0.75,
            "similarity_boost": 0.75,
            "style": 0.0,
            "use_speaker_boost": True,
        },
    }

    if language_code:
        body["language_code"] = to_elevenlabs_lang(language_code)

    max_retries = 3
    for attempt in range(max_retries):
        try:
            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(url, headers=headers, json=body)

            if response.status_code == 200:
                output.parent.mkdir(parents=True, exist_ok=True)
                output.write_bytes(response.content)
                duration = probe_audio_duration(str(output))
                return TtsResult(
                    audio_path=str(output),
                    duration_seconds=duration,
                    characters_used=len(word),
                )

            elif response.status_code == 429:
                wait = 2**attempt  # 1s, 2s, 4s
                await asyncio.sleep(wait)
                continue

            elif response.status_code == 401:
                raise RuntimeError("ElevenLabs API key is invalid (401 Unauthorized)")

            elif response.status_code >= 500:
                if attempt < max_retries - 1:
                    await asyncio.sleep(2)
                    continue
                raise RuntimeError(
                    f"ElevenLabs server error: {response.status_code}"
                )

            else:
                raise RuntimeError(
                    f"ElevenLabs API error: {response.status_code} — "
                    f"{response.text[:200]}"
                )

        except httpx.TimeoutException:
            if attempt < max_retries - 1:
                await asyncio.sleep(2)
                continue
            raise RuntimeError("ElevenLabs API timeout after retries")

    raise RuntimeError("ElevenLabs API failed after all retries")


def normalize_tts_audio(tts_path: str, target_lufs: float = -14.0) -> str:
    """
    Two-pass loudnorm on TTS audio to match the assembled video's level.
    Returns path to the normalized file.
    """
    normalized_path = tts_path.replace(".mp3", "_normalized.mp3")

    # Pass 1: Measure current loudness
    measure_cmd = [
        "ffmpeg", "-i", tts_path,
        "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:print_format=json",
        "-f", "null", "-",
    ]
    result = subprocess.run(measure_cmd, capture_output=True, text=True)

    # Parse measured values from stderr (ffmpeg outputs loudnorm stats there)
    stderr = result.stderr
    json_start = stderr.rfind("{")
    json_end = stderr.rfind("}") + 1

    if json_start == -1 or json_end == 0:
        logger.warning("TTS LUFS: failed to parse measurements, using single-pass fallback")
        subprocess.run(
            [
                "ffmpeg", "-y", "-i", tts_path,
                "-af", f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11",
                normalized_path,
            ],
            capture_output=True,
            check=True,
        )
        return normalized_path

    measured = json.loads(stderr[json_start:json_end])
    input_lufs = measured.get("input_i", "?")
    logger.info(f"TTS LUFS: measured {input_lufs} LUFS, normalizing to {target_lufs} LUFS")

    # Pass 2: Apply normalization with measured values
    normalize_cmd = [
        "ffmpeg", "-y", "-i", tts_path,
        "-af", (
            f"loudnorm=I={target_lufs}:TP=-1.5:LRA=11:"
            f"measured_I={measured['input_i']}:"
            f"measured_TP={measured['input_tp']}:"
            f"measured_LRA={measured['input_lra']}:"
            f"measured_thresh={measured['input_thresh']}:"
            f"offset={measured['target_offset']}:"
            f"linear=true"
        ),
        normalized_path,
    ]
    result = subprocess.run(normalize_cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"TTS LUFS normalization failed: {result.stderr[-300:]}")

    logger.info(f"TTS LUFS: normalized {input_lufs} → {target_lufs} LUFS")
    return normalized_path


def probe_audio_duration(audio_path: str) -> float:
    """Probe audio file duration using ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", audio_path,
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed on {audio_path}: {result.stderr[:200]}")

    data = json.loads(result.stdout)
    return float(data["format"]["duration"])
