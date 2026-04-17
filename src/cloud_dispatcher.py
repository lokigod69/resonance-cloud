"""
Cloud dispatcher — calls engine functions directly instead of HTTP.
Drop-in replacement for call_engine() when DISPATCH_MODE=direct.

This module replicates what each engine's ui/app.py /run endpoint does:
1. Apply per-engine payload adaptations (where ui/app.py transforms fields)
2. Construct the engine's typed Pydantic payload from the raw dict
3. Call the engine's core function
4. Convert the result back to a dict matching the HTTP response format

Engine result status values are "success" or "failed" — never "error".
(Exceptions: Image engine also uses "partial", Bookend uses str.)
"""
import copy
import inspect
import logging
import os
import subprocess
from pathlib import Path

logger = logging.getLogger(__name__)

# Lazy-loaded engine references
_engines = {}
_payload_classes = {}
_trim_fn = None
_trim_payload_class = None
_loaded = False


def _ensure_engines_loaded():
    """Lazy-load all engine modules on first use."""
    global _loaded, _trim_fn, _trim_payload_class
    if _loaded:
        return

    from cloud_engines.concept_engine.engine import generate_concept
    from cloud_engines.concept_engine.models import ConceptPayload
    from cloud_engines.image_engine.engine import generate_images
    from cloud_engines.image_engine.models import ImagePayload
    from cloud_engines.song_engine.engine import generate_song
    from cloud_engines.song_engine.models import SongPayload
    from cloud_engines.video_engine.engine import generate_video
    from cloud_engines.video_engine.models import VideoPayload
    from cloud_engines.assembly_engine.engine import assemble, trim_video
    from cloud_engines.assembly_engine.models import AssemblyPayload, TrimPayload
    from cloud_engines.bookend_engine.engine import wrap
    from cloud_engines.bookend_engine.models import BookendPayload

    _engines.update({
        "concept": generate_concept,
        "images": generate_images,      # key is "images", NOT "image"
        "song": generate_song,
        "video": generate_video,
        "assembly": assemble,
        "bookend": wrap,
    })

    _payload_classes.update({
        "concept": ConceptPayload,
        "images": ImagePayload,
        "song": SongPayload,
        "video": VideoPayload,
        "assembly": AssemblyPayload,
        "bookend": BookendPayload,
    })

    _trim_fn = trim_video
    _trim_payload_class = TrimPayload
    _loaded = True


# ---------------------------------------------------------------------------
# Per-engine payload adapters
# ---------------------------------------------------------------------------

def _adapt_concept_payload(payload: dict) -> dict:
    """
    Concept Engine adapter.

    The /run handler nests flat mnemonic/pos fields into an enrichment object.
    pipeline.py sends: content.mnemonic, content.pos (flat)
    ConceptPayload expects: content.enrichment.mnemonic, content.enrichment.pos (nested)

    See: engines/concept-engine/ui/app.py:267-278
    """
    payload = copy.deepcopy(payload)
    content = payload.get("content", {})

    mnemonic = content.pop("mnemonic", "") or ""
    pos = content.pop("pos", "") or ""

    if mnemonic or pos:
        content["enrichment"] = {"mnemonic": mnemonic, "pos": pos}

    payload["content"] = content
    return payload


_PAYLOAD_ADAPTERS = {
    "concept": _adapt_concept_payload,
}


# ---------------------------------------------------------------------------
# Song placeholder for Suno-only mode
# ---------------------------------------------------------------------------

MUSIC_MODE = os.getenv("MUSIC_MODE", "suno")  # "suno" (the only supported mode; "acestep" backend removed)


def _create_song_placeholder(payload: dict) -> dict:
    """
    Create a silent audio file as a placeholder for the Song stage.
    Suno bake-in will replace this with real music later.

    The placeholder must be a valid audio file (not zero bytes) because
    Assembly probes it with ffprobe and will crash on invalid audio.
    """
    output_dir = payload.get("output_dir")
    if not output_dir:
        return {"status": "failed", "error": "No output_dir in song payload",
                "output_paths": []}

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    duration = payload.get("settings", {}).get("duration", 30)
    placeholder_path = output_dir / "take_001.flac"

    try:
        subprocess.run([
            "ffmpeg", "-y",
            "-f", "lavfi", "-i", "anullsrc=r=48000:cl=stereo",
            "-t", str(duration),
            "-c:a", "flac",
            str(placeholder_path)
        ], capture_output=True, timeout=30, check=True)
    except Exception as e:
        logger.error(f"[cloud] Failed to create song placeholder: {e}")
        return {"status": "failed",
                "error": f"Song placeholder creation failed: {e}",
                "output_paths": []}

    logger.info(f"[cloud] Song placeholder created: {placeholder_path} "
                f"({duration}s silent FLAC at 48kHz)")

    return {
        "status": "success",
        "output_paths": ["take_001.flac"],
        "error": None,
    }


# ---------------------------------------------------------------------------
# Main dispatch function
# ---------------------------------------------------------------------------

async def call_engine_direct(
    engine: str,
    payload: dict,
    endpoint: str = "/run"
) -> dict:
    """
    Call an engine's core function directly.

    Matches the signature of call_engine() in dispatcher.py:
        async def call_engine(engine, payload, endpoint="/run") -> dict

    Args:
        engine: One of "concept", "images", "song", "video", "assembly", "bookend"
        payload: The raw dict payload (same shape as what pipeline.py produces)
        endpoint: "/run" (default) or "/trim" (Assembly only)

    Returns:
        dict with at minimum {"status": "success"|"failed", ...}
    """
    _ensure_engines_loaded()

    # --- Handle Assembly /trim endpoint ---
    if endpoint == "/trim" and engine == "assembly":
        return await _handle_assembly_trim(payload)

    # --- Handle Song stage in Suno-only mode ---
    if engine == "song" and MUSIC_MODE == "suno":
        return _create_song_placeholder(payload)

    # --- Validate engine name ---
    if engine not in _engines:
        raise ValueError(
            f"Unknown engine: {engine!r}. "
            f"Valid engines: {list(_engines.keys())}"
        )

    engine_fn = _engines[engine]
    PayloadClass = _payload_classes[engine]

    logger.info(f"[cloud] Calling {engine} engine directly")

    try:
        # Step 1: Apply per-engine payload adaptation
        adapted = payload
        if engine in _PAYLOAD_ADAPTERS:
            adapted = _PAYLOAD_ADAPTERS[engine](payload)

        # Step 2: Construct typed Pydantic model from raw dict
        typed_payload = PayloadClass.model_validate(adapted)

        # Step 3: Call the engine function
        result = engine_fn(typed_payload)

        # Step 4: If the function is async (Bookend), await it
        if inspect.isawaitable(result):
            result = await result

        # Step 5: Convert result to dict
        if hasattr(result, 'model_dump'):
            result_dict = result.model_dump()
        elif hasattr(result, 'dict'):
            result_dict = result.dict()
        elif isinstance(result, dict):
            result_dict = result
        else:
            result_dict = {"status": "success", "raw": str(result)}

        logger.info(
            f"[cloud] {engine} engine returned status: "
            f"{result_dict.get('status', 'unknown')}"
        )
        return result_dict

    except Exception as e:
        logger.error(f"[cloud] {engine} engine error: {e}", exc_info=True)
        return {
            "status": "failed",
            "error": str(e),
            "output_paths": []
        }


async def _handle_assembly_trim(payload: dict) -> dict:
    """
    Handle the Assembly engine's /trim endpoint.

    TrimPayload fields: source_path, trim_start, trim_end, output_dir, settings, metadata.
    """
    _ensure_engines_loaded()

    try:
        typed_payload = _trim_payload_class.model_validate(payload)
        result = _trim_fn(typed_payload)

        if inspect.isawaitable(result):
            result = await result

        if hasattr(result, 'model_dump'):
            return result.model_dump()
        return result if isinstance(result, dict) else {"status": "success"}

    except Exception as e:
        logger.error(f"[cloud] assembly trim error: {e}", exc_info=True)
        return {"status": "failed", "error": str(e)}
