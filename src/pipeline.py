"""Pipeline sequencing: builds payloads and orchestrates stage execution."""

from __future__ import annotations
import json
import logging
import os
import random
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import httpx

logger = logging.getLogger(__name__)

from .manifest import (
    read_manifest, update_selection, add_lineage,
    now_iso
)
from .settings import resolve_settings, load_defaults, resolve_random_art_style
from .workspace import (
    get_word_dir, create_version_dir, make_version_label
)
from .dispatcher import call_engine, EngineUnreachableError, PayloadError


def _short_mode_from_images(manifest_data: Any, defaults: dict) -> bool:
    """Resolve images.short_mode from defaults + per-word overrides."""
    images_settings = resolve_settings("images", manifest_data.settings, defaults)
    return bool(images_settings.get("short_mode", False))


STAGE_ORDER = ['images', 'concept', 'song', 'video', 'assembly', 'bookend']

# ---------------------------------------------------------------------------
# Creative-direction auto-picker
# ---------------------------------------------------------------------------
_VALID_DIRECTIONS = {"literal", "editorial", "cinematic", "movie", "movie_remix", "provocative", "minimal"}

_DIRECTION_WEIGHTS: dict[str, dict[str, int]] = {
    "noun_concrete": {"literal": 30, "editorial": 20, "cinematic": 15, "movie": 15, "provocative": 10, "minimal": 5, "movie_remix": 5},
    "noun_abstract": {"movie": 25, "cinematic": 25, "editorial": 15, "provocative": 15, "minimal": 10, "movie_remix": 5, "literal": 5},
    "adjective":     {"cinematic": 25, "movie": 20, "editorial": 20, "provocative": 15, "literal": 10, "minimal": 5, "movie_remix": 5},
    "verb":          {"cinematic": 25, "literal": 20, "movie": 20, "editorial": 15, "provocative": 10, "movie_remix": 5, "minimal": 5},
    "default":       {"editorial": 20, "cinematic": 20, "movie": 20, "literal": 15, "provocative": 15, "minimal": 5, "movie_remix": 5},
}

_PICKER_SYSTEM_PROMPT = """\
You are choosing the visual treatment for a vocabulary-learning image set.

Goal: help the learner connect the image to the word's meaning instantly.

DIRECTIONS (pick ONE):
- literal: Show the meaning directly. Clear, immediate, flashcard-quality.
- editorial: Magazine-quality composition. Curated, intentional framing.
- cinematic: Dramatic lighting, atmosphere, implied narrative.
- movie: Recreate an iconic movie scene that embodies the word.
- movie_remix: Iconic movie scene with one absurd element swapped in.
- provocative: Surreal juxtaposition. Dreamlike. Unexpected but meaningful.
- minimal: Typography-dominant. The word's letterforms ARE the visual.

SELECTION PRINCIPLE:
- Concrete, physical things (animals, objects, food, places) → prefer directions that show the thing clearly (literal, editorial, cinematic).
- Abstract concepts (emotions, qualities, states) → prefer directions that use metaphor or narrative (cinematic, provocative, movie).
- Actions/verbs → prefer directions that imply motion or process (cinematic, movie, editorial).
- These are preferences, not rules. Any direction can work for any word if the connection to meaning is clear.

Respond with ONLY a JSON object, no markdown fences:
{"direction": "<direction>", "rationale": "<1 sentence>"}\
"""


def _resolve_creative_direction_random(manifest_data: Any) -> str:
    """Fallback: pick a creative direction based on POS using weighted random."""
    # Phrases have no meaningful POS — fall through to default category.
    is_phrase = getattr(manifest_data, "input_type", "word") == "phrase"
    pos = ""
    if not is_phrase and manifest_data.enrichment and manifest_data.enrichment.pos:
        pos = manifest_data.enrichment.pos.lower().strip()

    if pos == "noun":
        category = "noun_concrete"
    elif pos in ("adj", "adjective"):
        category = "adjective"
    elif pos in ("verb", "v"):
        category = "verb"
    else:
        category = "default"

    weights = _DIRECTION_WEIGHTS[category]
    directions = list(weights.keys())
    return random.choices(directions, weights=list(weights.values()), k=1)[0]


async def _resolve_creative_direction(manifest_data: Any, settings: dict) -> tuple[str, str]:
    """Pick a creative direction via LLM, falling back to weighted random on failure.

    Returns (direction, rationale).
    """
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        logger.warning("OPENROUTER_API_KEY not set — falling back to weighted random")
        return _resolve_creative_direction_random(manifest_data), "fallback: weighted random (no API key)"

    # Phrases skip enrichment in the LLM picker prompt — mnemonic/pos/tags are
    # word-only metadata and would mislead the picker for multi-word inputs.
    is_phrase = getattr(manifest_data, "input_type", "word") == "phrase"
    enrich = manifest_data.enrichment
    if is_phrase:
        pos = "unknown"
        tags = "none"
        mnemonic = "none provided"
    else:
        pos = (enrich.pos or "unknown") if enrich else "unknown"
        tags = (enrich.tags or "none") if enrich else "none"
        if isinstance(tags, list):
            tags = ", ".join(tags)
        mnemonic = (enrich.mnemonic or "none provided") if enrich else "none provided"

    user_prompt = (
        f"WORD: {manifest_data.word_original}\n"
        f"TRANSLATION: {manifest_data.translation}\n"
        f"LANGUAGE: {manifest_data.language}\n"
        f"PART OF SPEECH: {pos}\n"
        f"TAGS: {tags}\n"
        f"MNEMONIC: {mnemonic}\n\n"
        f"Pick the best creative direction."
    )

    model = settings.get("llm_model", "deepseek/deepseek-v3.2")

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(
                "https://openrouter.ai/api/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": model,
                    "max_tokens": 200,
                    "messages": [
                        {"role": "system", "content": _PICKER_SYSTEM_PROMPT},
                        {"role": "user", "content": user_prompt},
                    ],
                },
            )
            resp.raise_for_status()

        content = resp.json()["choices"][0]["message"]["content"]
        parsed = json.loads(content)
        direction = parsed["direction"]
        rationale = parsed.get("rationale", "")

        if direction not in _VALID_DIRECTIONS:
            logger.warning("LLM picker returned invalid direction '%s' — falling back", direction)
            return _resolve_creative_direction_random(manifest_data), "fallback: weighted random (invalid LLM direction)"

        return direction, rationale

    except Exception as e:
        logger.warning("LLM picker failed (%s) — falling back to weighted random", e)
        return _resolve_creative_direction_random(manifest_data), "fallback: weighted random"


def resolve_lora_path(settings: dict) -> dict:
    """Resolve lora_id + lora_checkpoint into lora_path for the Song Engine."""
    s = dict(settings)
    lora_id = s.get("lora_id")
    if lora_id and lora_id != "__custom__":
        base = Path(s.get("lora_id_base_path", ""))
        checkpoint = s.get("lora_checkpoint", "")
        if base.exists() and checkpoint:
            resolved = base / checkpoint
            if resolved.exists():
                s["lora_path"] = str(resolved)
    # Remove orchestrator-internal keys before sending to engine
    for k in ("lora_id", "lora_id_base_path", "lora_checkpoint"):
        s.pop(k, None)
    return s

STAGE_DIR_MAP = {
    'concept': 'concept',
    'song': 'songs',
    'images': 'images',
    'video': 'videos',
    'assembly': 'final',
    'bookend': 'bookend',
}


class PipelineError(Exception):
    pass


def build_concept_payload(
    word_dir: Path,
    manifest_data: Any,
    settings: dict,
    output_dir: Path,
    images_version: str | None = None,
) -> dict:
    # Read music_caption from storyboard if images have already run.
    # Only inherit storyboard music_caption when user hasn't specified a genre —
    # an explicit genre must override the storyboard's auto-generated caption.
    user_genre = settings.get("genre") or "auto"
    external_music_caption = None
    if images_version and user_genre == "auto":
        storyboard_file = word_dir / "images" / images_version / "storyboard.json"
        if storyboard_file.exists():
            with open(storyboard_file, 'r', encoding='utf-8') as f:
                storyboard = json.load(f)
            external_music_caption = storyboard.get("music_caption")

    enrich = manifest_data.enrichment
    is_phrase = manifest_data.input_type == "phrase"
    identity = manifest_data.identity or {}
    return {
        "content": {
            "word": manifest_data.word_original,
            "translation": manifest_data.translation,
            "language": manifest_data.language,
            "language_code": manifest_data.language_code,
            "external_music_caption": external_music_caption,
            "mnemonic": "" if is_phrase else (enrich.mnemonic or "" if enrich else ""),
            "pos": "" if is_phrase else (enrich.pos or "" if enrich else ""),
            "input_type": manifest_data.input_type,
        },
        "settings": settings,
        "output_dir": str(output_dir),
        "metadata": {
            "word": manifest_data.word_original,
            "language": manifest_data.language,
            "timestamp": now_iso(),
            "word_id": identity.get("word_id"),
            "deck_id": identity.get("deck_id"),
            "user_id": identity.get("user_id"),
            "job_id": identity.get("job_id"),
            "attempt": identity.get("attempt"),
        }
    }


def build_song_payload(
    word_dir: Path,
    manifest_data: Any,
    settings: dict,
    output_dir: Path,
    concept_version: str,
) -> dict:
    concept_file = word_dir / "concept" / concept_version
    with open(concept_file, 'r', encoding='utf-8') as f:
        concept = json.load(f)

    return {
        "content": {
            "word": manifest_data.word_original,
            "translation": manifest_data.translation,
            "language": manifest_data.language,
            "language_code": manifest_data.language_code,
            "lyrics": concept.get("lyrics", ""),
            "music_caption": concept.get("music_caption", ""),
        },
        "settings": settings,
        "output_dir": str(output_dir),
        "metadata": {
            "word": manifest_data.word_original,
            "language": manifest_data.language,
            "translation": manifest_data.translation,
            "timestamp": now_iso(),
            "concept_version": concept_version,
        }
    }


def build_image_payload(
    word_dir: Path,
    manifest_data: Any,
    settings: dict,
    output_dir: Path,
) -> dict:
    # Build context with mnemonic/etymology when visual_reference is not "none".
    # Phrases skip enrichment context — etymology/mnemonic are nonsensical for phrases.
    is_phrase = manifest_data.input_type == "phrase"
    context = None
    if not is_phrase and settings.get("visual_reference", "auto") != "none":
        enrich = manifest_data.enrichment
        mnemonic = (enrich.mnemonic or None) if enrich else None
        etymology = (enrich.etymology or None) if enrich else None
        if mnemonic or etymology:
            context = {"mnemonic": mnemonic, "etymology": etymology}

    return {
        "content": {
            "word": manifest_data.word_original,
            "translation": manifest_data.translation,
            "language": manifest_data.language,
            "language_code": manifest_data.language_code,
            "input_type": manifest_data.input_type,
        },
        "context": context,
        "settings": settings,
        "output_dir": str(output_dir),
        "metadata": {
            "word": manifest_data.word_original,
            "language": manifest_data.language,
            "translation": manifest_data.translation,
            "timestamp": now_iso(),
        }
    }


def build_video_payloads(
    word_dir: Path,
    manifest_data: Any,
    settings: dict,
    output_dir: Path,
    images_version: str,
    creative_direction: str = "",
) -> list[dict]:
    """Build one payload per scene in the storyboard."""
    images_dir = word_dir / "images" / images_version
    storyboard_file = images_dir / "storyboard.json"

    storyboard = {}
    scenes = []
    if storyboard_file.exists():
        with open(storyboard_file, 'r', encoding='utf-8') as f:
            storyboard = json.load(f)
        scenes = storyboard.get("scenes", [])

    # --- Text-to-video: build payloads from storyboard scenes (no images) ---
    is_text_to_video = settings.get("text_to_video", False)
    if is_text_to_video:
        payloads = []
        scene_durations = _resolve_scene_durations(scenes, len(scenes), settings)
        for i, scene in enumerate(scenes):
            video_prompt = scene.get("video_prompt", scene.get("description", ""))

            scene_settings = {**settings, "video_prompt": video_prompt}
            if i < len(scene_durations) and scene_durations[i] is not None:
                scene_settings["duration"] = scene_durations[i]
            # Force all_cut — no morph transitions without images
            scene_settings["transition_mode"] = "all_cut"

            # Resolve per-scene camera motion from storyboard
            if scene_settings.get("motion_type") == "auto":
                scene_camera = scene.get("camera_motion", {}) or {}
                scene_settings["motion_type"] = scene_camera.get("type", "slow_zoom_in")
                scene_settings["motion_speed"] = scene_camera.get("speed", scene_settings.get("motion_speed", "slow"))

            content = {
                "word": manifest_data.word_original,
                "translation": manifest_data.translation,
                "language": manifest_data.language,
                "language_code": manifest_data.language_code,
                "image_path": None,
                "scene_number": i + 1,
                "video_prompt": video_prompt,
                "text_to_video_prompt": video_prompt,
                "camera_motion": scene.get("camera_motion", None),
            }

            payload = {
                "content": content,
                "settings": scene_settings,
                "output_dir": str(output_dir),
                "metadata": {
                    "word": manifest_data.word_original,
                    "language": manifest_data.language,
                    "translation": manifest_data.translation,
                    "timestamp": now_iso(),
                    "image_version": images_version,
                    "scene_number": i + 1,
                },
            }
            payloads.append(payload)
            logger.info(
                "Text-to-video payload %d: prompt_preview=%.80s",
                i + 1, video_prompt,
            )
        logger.info("Built %d text-to-video payload(s)", len(payloads))
        return payloads

    # --- Standard image-to-video path (unchanged) ---

    # Find scene images (named 001.png, 002.png, etc.), excluding thumbnails
    image_files = sorted(
        f for f in images_dir.glob("*.png")
        if not f.name.startswith("thumb")
    )

    # Resolve transition mode (with backwards compat from boolean frame_transitions)
    video_mode = settings.get("video_mode", "ken_burns")
    if video_mode == "ltx":
        video_mode = "ltx_fast"
    ltx_modes = ("ltx_fast", "ltx_pro")
    supports_transitions = video_mode in ltx_modes and len(image_files) >= 2

    transition_mode = _resolve_transition_mode(settings, storyboard, supports_transitions, creative_direction)
    logger.info("Transition mode: %s (supports_transitions=%s)", transition_mode, supports_transitions)

    # Determine which boundaries get morphs (for N images: N-1 boundaries)
    n = len(image_files)
    morph_boundary = [False] * max(n - 1, 0)
    if supports_transitions and n >= 2:
        if transition_mode == "all_morph":
            morph_boundary = [True] * (n - 1)
        elif transition_mode == "morph_then_cut":
            morph_boundary[0] = True  # Only first boundary morphs
        elif transition_mode == "cut_then_morph" and n >= 3:
            morph_boundary[1] = True  # Only second boundary morphs

    # Resolve per-scene durations from storyboard (Tier 4)
    scene_durations = _resolve_scene_durations(scenes, n, settings)

    # Build one payload per image — ALL modes produce N clips
    payloads = []
    for i in range(n):
        scene = scenes[i] if i < len(scenes) else {}
        is_morph = i < len(morph_boundary) and morph_boundary[i]

        # Morph clips use transition_prompt; standalone clips use video_prompt
        video_prompt = _resolve_video_prompt(scene, use_transitions=is_morph)

        # Engine reads video_prompt from settings, not content — inject per-payload
        scene_settings = {**settings, "video_prompt": video_prompt}

        # Override duration with per-scene allocation if available
        if scene_durations[i] is not None:
            scene_settings["duration"] = scene_durations[i]

        # Resolve per-scene camera motion from storyboard when motion_type is "auto"
        if scene_settings.get("motion_type") == "auto":
            scene_camera = scene.get("camera_motion", {}) or {}
            scene_settings["motion_type"] = scene_camera.get("type", "slow_zoom_in")
            scene_settings["motion_speed"] = scene_camera.get("speed", scene_settings.get("motion_speed", "slow"))

        content = {
            "word": manifest_data.word_original,
            "translation": manifest_data.translation,
            "language": manifest_data.language,
            "language_code": manifest_data.language_code,
            "image_path": str(image_files[i]),
            "scene_number": i + 1,
            "video_prompt": video_prompt,
            "camera_motion": scene.get("camera_motion", None),
        }

        # Add end_image for morph boundaries
        if is_morph:
            content["end_image_path"] = str(image_files[i + 1])

        payload = {
            "content": content,
            "settings": scene_settings,
            "output_dir": str(output_dir),
            "metadata": {
                "word": manifest_data.word_original,
                "language": manifest_data.language,
                "translation": manifest_data.translation,
                "timestamp": now_iso(),
                "image_version": images_version,
                "scene_number": i + 1,
            }
        }
        payloads.append(payload)

        if is_morph:
            logger.info(
                "Morph payload %d: %s → %s, prompt_preview=%.80s",
                i + 1, image_files[i].name, image_files[i + 1].name, video_prompt,
            )
        else:
            logger.info(
                "Standalone payload %d: %s, prompt_preview=%.80s",
                i + 1, image_files[i].name, video_prompt,
            )

    logger.info("Built %d video payload(s) (transition_mode=%s)", len(payloads), transition_mode)
    return payloads


def _resolve_scene_durations(
    scenes: list[dict],
    num_images: int,
    settings: dict,
) -> list[int | None]:
    """Extract per-scene durations from storyboard and snap to valid fal.ai enum values.

    For LTX modes, durations are snapped to valid enum values (6, 8, 10 for Pro;
    6, 8, 10, 12, 14, 16, 18, 20 for Fast). Total never exceeds target duration.
    For Ken Burns and Kling modes, arbitrary integer durations are kept as before.

    Returns a list of durations (one per image). If the storyboard doesn't
    include suggested_duration, returns [None, ...] and the global setting
    is used.
    """
    video_mode = settings.get("video_mode", "ltx_fast")
    target = settings.get("_target_duration", None)

    # Determine valid duration enum set based on video mode
    valid_durations = _get_valid_durations(video_mode)

    # Extract raw durations from storyboard
    raw_durations: list[int | None] = []
    for i in range(num_images):
        scene = scenes[i] if i < len(scenes) else {}
        sd = scene.get("suggested_duration")
        if sd is not None:
            try:
                raw_durations.append(int(sd))
            except (TypeError, ValueError):
                raw_durations.append(None)
        else:
            raw_durations.append(None)

    # Short-mode: normalize to exactly target seconds across 2+ scenes.
    # Return before the legacy enum/clamp paths; the adapter bypass will
    # accept arbitrary per-scene durations downstream.
    if settings.get("short_mode", False) and num_images >= 2:
        normalized = _normalize_short_mode_durations(
            raw_durations,
            target=(target or 15),
        )
        logger.info(
            "Short-mode scene durations normalized to %s (sum=%ds)",
            normalized,
            sum(normalized),
        )
        return normalized

    # If no valid duration set (ken_burns, kling, etc.), use legacy clamping
    if valid_durations is None:
        durations = [max(3, min(10, d)) if d is not None else None for d in raw_durations]
        if all(d is not None for d in durations) and len(durations) > 1 and target:
            if abs(sum(durations) - target) > 2:
                scale = target / sum(durations)
                durations = [max(3, min(10, round(d * scale))) for d in durations]
                drift = sum(durations) - target
                if drift != 0:
                    if drift > 0:
                        idx = max(range(len(durations)), key=lambda j: durations[j])
                        durations[idx] = max(3, durations[idx] - drift)
                    else:
                        idx = min(range(len(durations)), key=lambda j: durations[j])
                        durations[idx] = min(10, durations[idx] - drift)
                logger.info("Rebalanced scene durations to %s (target=%ds)", durations, target)
        return durations

    # LTX modes: snap to valid enum values using greedy fill algorithm
    min_dur = min(valid_durations)
    max_dur = max(valid_durations)

    # Start every scene at minimum valid duration
    durations = [min_dur] * num_images

    if target and target > 0:
        # Build a priority list: scenes with higher storyboard-suggested durations
        # get upgraded first. Scenes without suggestions get lowest priority.
        scene_priorities = []
        for i in range(num_images):
            suggested = raw_durations[i] if raw_durations[i] is not None else 0
            scene_priorities.append((suggested, i))
        scene_priorities.sort(reverse=True)

        # Greedy fill: upgrade scenes to next valid duration step without exceeding target
        changed = True
        while changed:
            changed = False
            for _, i in scene_priorities:
                current = durations[i]
                # Find next valid step up
                next_up = None
                for v in sorted(valid_durations):
                    if v > current:
                        next_up = v
                        break
                if next_up is None:
                    continue
                new_total = sum(durations) - current + next_up
                if new_total <= target:
                    durations[i] = next_up
                    changed = True

        logger.info(
            "Resolved scene durations to %s (total=%ds, target=%ds, mode=%s)",
            durations, sum(durations), target, video_mode,
        )
    else:
        # No target — snap each storyboard suggestion down to nearest valid value
        for i in range(num_images):
            if raw_durations[i] is not None:
                durations[i] = _snap_down(raw_durations[i], valid_durations)

    return durations


# --- Valid fal.ai duration enums per video mode ---

_LTX_PRO_DURATIONS = sorted([6, 8, 10])
_LTX_FAST_DURATIONS = sorted([6, 8, 10, 12, 14, 16, 18, 20])


def _get_valid_durations(video_mode: str) -> list[int] | None:
    """Return sorted list of valid durations for the video mode, or None for unconstrained modes."""
    if video_mode in ("ltx_pro",):
        return _LTX_PRO_DURATIONS
    if video_mode in ("ltx_fast", "ltx"):
        return _LTX_FAST_DURATIONS
    # Ken Burns, Kling, and other modes: no enum constraint
    return None


def _snap_down(value: int, valid: list[int]) -> int:
    """Snap a value down to the nearest valid duration. Minimum is valid[0]."""
    result = valid[0]
    for v in valid:
        if v <= value:
            result = v
        else:
            break
    return result


def _normalize_short_mode_durations(
    raw_durations: list[int | None],
    target: int = 15,
    min_dur: int = 3,
    max_dur: int = 10,
) -> list[int]:
    """Normalize storyboard durations so they sum to exactly `target`.

    Clamps each value to [min_dur, max_dur] (None -> midpoint), then nudges
    the smallest/largest in-bounds scene by 1s until the sum equals target.
    """
    midpoint = (min_dur + max_dur) // 2  # 6
    durations = [
        max(min_dur, min(max_dur, int(d) if d is not None else midpoint))
        for d in raw_durations
    ]

    while sum(durations) != target:
        delta = target - sum(durations)
        step = 1 if delta > 0 else -1
        if step > 0:
            candidates = [i for i, v in enumerate(durations) if v < max_dur]
            if not candidates:
                break
            idx = min(candidates, key=lambda i: durations[i])
        else:
            candidates = [i for i, v in enumerate(durations) if v > min_dur]
            if not candidates:
                break
            idx = max(candidates, key=lambda i: durations[i])
        durations[idx] += step

    return durations


# --- Tier 7: Auto-picker mapping from frame_narrative → transition_mode ---
_TRANSITION_MODE_DEFAULTS: dict[str, str] = {
    "collection": "all_cut",
}


def _resolve_transition_mode(
    settings: dict,
    storyboard: dict,
    supports_transitions: bool,
    creative_direction: str = "",
) -> str:
    """Resolve the effective transition mode from settings + storyboard.

    Priority:
    1. Explicit transition_mode setting (not "auto") → use it
    2. Movie/movie_remix creative direction → force all_cut
    3. LLM's suggested_transition_mode (from storyboard)
    4. Auto-picker: frame_narrative → default mapping
    5. Legacy frame_transitions boolean → map to all_morph / all_cut
    6. Default → "all_cut"
    """
    mode = settings.get("transition_mode", None)

    if mode and mode not in ("auto", ""):
        return mode

    # Movie mode: force all_cut — LLM consistently suggests all_morph but
    # movie scenes have completely different compositions, making morphs ugly.
    if creative_direction in ("movie", "movie_remix"):
        logger.info("Movie mode creative_direction=%s → forcing all_cut", creative_direction)
        return "all_cut"

    # Auto mode: check LLM suggestion first, then frame_narrative mapping
    if mode == "auto" and supports_transitions:
        # LLM-suggested transition mode
        llm_suggestion = storyboard.get("suggested_transition_mode")
        if llm_suggestion in ("all_cut", "morph_then_cut", "cut_then_morph", "all_morph"):
            logger.info("Using LLM-suggested transition_mode=%s", llm_suggestion)
            return llm_suggestion

        # Fallback: derive from storyboard's frame_narrative
        narrative = storyboard.get("frame_narrative", "")
        auto_mode = _TRANSITION_MODE_DEFAULTS.get(narrative, "all_cut")
        logger.info("Auto-picked transition_mode=%s from frame_narrative=%s", auto_mode, narrative)
        return auto_mode

    # Legacy boolean fallback
    if settings.get("frame_transitions", False) and supports_transitions:
        return "all_morph"

    return "all_cut"


def _resolve_video_prompt(scene: dict, use_transitions: bool = False) -> str:
    """Extract video_prompt from a storyboard scene, with fallback.

    When use_transitions is True:
        Priority: transition_prompt → video_prompt → description → generic.
    When use_transitions is False:
        Priority: video_prompt → description → generic.
        (transition_prompt is ignored entirely)
    """
    if use_transitions:
        transition_prompt = scene.get("transition_prompt", None)
        if transition_prompt and transition_prompt.strip():
            return transition_prompt
    # Standard fallback chain: video_prompt → description → generic
    video_prompt = scene.get("video_prompt", "")
    if not video_prompt.strip():
        description = scene.get("description", "")
        if description:
            video_prompt = f"Cinematic motion: {description}"
        else:
            video_prompt = "Gentle cinematic motion of the scene, smooth and professional"
    return video_prompt


def build_assembly_payload(
    word_dir: Path,
    manifest_data: Any,
    settings: dict,
    output_dir: Path,
    song_version: str,
    video_version: str,
) -> dict:
    # song_version may be "run-001_20260304T123000/take_002.flac" or just folder
    if '/' in song_version:
        song_path = word_dir / "songs" / song_version
    else:
        # Find the first FLAC in the folder
        song_dir = word_dir / "songs" / song_version
        flacs = list(song_dir.glob("*.flac")) + list(song_dir.glob("*.wav")) + list(song_dir.glob("*.mp3"))
        song_path = flacs[0] if flacs else song_dir / "output.flac"

    video_dir = word_dir / "videos" / video_version
    video_clips = sorted([str(f) for f in video_dir.glob("scene_*.mp4")])

    return {
        "content": {
            "song_path": str(song_path),
            "video_clips": video_clips,
            "word": manifest_data.word_original,
            "translation": manifest_data.translation,
            "language": manifest_data.language,
            "language_code": manifest_data.language_code,
        },
        "settings": settings,
        "output_dir": str(output_dir),
        "metadata": {
            "word": manifest_data.word_original,
            "language": manifest_data.language,
            "translation": manifest_data.translation,
            "timestamp": now_iso(),
            "song_version": song_version,
            "video_version": video_version,
        }
    }


def build_bookend_payload(
    word_dir: Path,
    manifest_data: Any,
    settings: dict,
    output_dir: Path,
) -> dict:
    """Build the payload for the Bookend Engine (Stage 6)."""
    selected_final = manifest_data.selected.final
    if not selected_final:
        raise PipelineError("No assembly version selected — cannot run bookend")

    assembled_video = str(word_dir / "final" / selected_final / "final.mp4")

    return {
        "content": {
            "assembled_video": assembled_video,
            "word": manifest_data.word_original,
            "translation": manifest_data.translation,
            "language": manifest_data.language,
            "language_code": manifest_data.language_code,
        },
        "settings": settings,
        "output_dir": str(output_dir),
        "metadata": {
            "word": manifest_data.word_original,
            "language": manifest_data.language,
            "translation": manifest_data.translation,
            "assembly_version": selected_final,
            "timestamp": now_iso(),
        },
    }


async def run_stage(
    workspace_path: Path,
    word_slug: str,
    stage: str,
) -> dict[str, Any]:
    """
    Execute one pipeline stage for one word.
    Returns a result dict with status and details.
    """
    word_dir = get_word_dir(workspace_path, word_slug)
    manifest_data = read_manifest(word_dir)
    defaults = load_defaults(workspace_path)
    settings = resolve_settings(stage, manifest_data.settings, defaults)

    stage_folder = STAGE_DIR_MAP.get(stage, stage)
    stage_dir = word_dir / stage_folder
    from_versions: dict[str, str] = {}

    try:
        if stage == 'concept':
            # Concept artifacts are files in concept/, not subdirectories.
            # The engine writes e.g. standard_20260304T120000.json into output_dir.
            label = make_version_label(stage, settings, stage_dir)
            ts = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S')
            version_name = f"{label}_{ts}.json"
            output_dir = stage_dir  # engine writes file directly into concept/
            stage_dir.mkdir(parents=True, exist_ok=True)

            # Concept now depends on images (storyboard provides music_caption)
            images_version = manifest_data.selected.images
            if not images_version:
                raise PipelineError("No images selected. Run image stage first.")
            from_versions = {"images": images_version}

            # Resolve art_style_hint from image settings when use_art_style is enabled
            if settings.get("use_art_style", False):
                image_settings = resolve_settings('images', manifest_data.settings, defaults)
                image_settings, _ = resolve_random_art_style(image_settings)
                settings["art_style_hint"] = image_settings.get("art_style", "")

            # Short-mode: force concept duration to 15s
            if _short_mode_from_images(manifest_data, defaults):
                settings["duration"] = 15

            payload = build_concept_payload(word_dir, manifest_data, settings, output_dir, images_version)
            result = await call_engine('concept', payload)
            if result.get('status') == 'success':
                output_files = result.get('output_paths', [])
                if output_files:
                    selected = Path(output_files[0]).name
                    update_selection(word_dir, 'concept', selected)
                add_lineage(word_dir, 'concept', version_name, from_versions, settings, 'success')
            else:
                add_lineage(word_dir, 'concept', version_name, from_versions, settings, 'failed')
            return {"stage": stage, "version": version_name, "result": result}

        elif stage in ('song', 'images', 'video', 'assembly', 'bookend'):
            # All non-concept stages use versioned subdirectories
            label = make_version_label(stage, settings, stage_dir)
            output_dir, version_name = create_version_dir(stage_dir, label)
        else:
            raise PipelineError(f"Unknown stage: {stage}")

        if stage == 'song':
            settings = resolve_lora_path(settings)
            # Short-mode: force song duration to 15s
            if _short_mode_from_images(manifest_data, defaults):
                settings["duration"] = 15
            concept_version = manifest_data.selected.concept
            if not concept_version:
                raise PipelineError("No concept selected. Run concept stage first.")
            from_versions = {"concept": concept_version}
            payload = build_song_payload(word_dir, manifest_data, settings, output_dir, concept_version)
            result = await call_engine('song', payload)
            status = result.get('status', 'failed')
            add_lineage(word_dir, 'song', version_name, from_versions, settings, status)
            if status == 'success':
                # Auto-select first take if present
                output_paths = result.get('output_paths', [])
                if output_paths:
                    first_take = output_paths[0]
                    take_selection = f"{version_name}/{Path(first_take).name}"
                    update_selection(word_dir, 'song', take_selection)
            return {"stage": stage, "version": version_name, "result": result}

        elif stage == 'images':
            # Images is now stage 1 — no prior dependencies
            from_versions = {}

            # If video mode is text-to-video, tell image engine to skip rendering
            video_settings = resolve_settings('video', manifest_data.settings, defaults)
            if video_settings.get('text_to_video', False):
                settings['skip_rendering'] = True
                logger.info("text_to_video=True in video settings — injecting skip_rendering=True into image settings")

            # Inject vocal_gender and clip_duration from concept settings
            concept_settings = resolve_settings('concept', manifest_data.settings, defaults)
            settings['vocal_gender'] = concept_settings.get('vocal_gender', 'female')
            # Sync clip_duration with actual song duration so image count auto-calculation
            # and LLM duration prompts match the real song length
            settings['clip_duration'] = concept_settings.get('duration', 20)

            # Short-mode coercion: force 15s and image_count to auto unless already 2 or 3
            if settings.get("short_mode", False):
                settings["clip_duration"] = 15
                if settings.get("image_count") not in ("auto", 2, 3):
                    settings["image_count"] = "auto"

            # Resolve "random" art_style → concrete preset before dispatch
            art_style_original = settings.get("art_style")
            settings, art_style_resolved = resolve_random_art_style(settings)

            # Resolve "auto" creative_direction → concrete direction before dispatch
            cd_original = settings.get("creative_direction")
            cd_rationale = ""
            if cd_original == "auto":
                resolved_cd, cd_rationale = await _resolve_creative_direction(manifest_data, settings)
                settings["creative_direction"] = resolved_cd
                logger.info("Auto-picked creative_direction=%s for %s (rationale=%s)",
                            resolved_cd, manifest_data.word_original, cd_rationale)

            payload = build_image_payload(word_dir, manifest_data, settings, output_dir)
            result = await call_engine('images', payload)
            status = result.get('status', 'failed')

            # Record what was actually sent if random/auto was resolved
            lineage_settings = dict(settings)
            if art_style_resolved:
                lineage_settings["art_style_setting"] = art_style_original
                lineage_settings["art_style_resolved"] = art_style_resolved
            if cd_original == "auto":
                lineage_settings["creative_direction_setting"] = "auto"
                lineage_settings["creative_direction_resolved"] = resolved_cd
                lineage_settings["creative_direction_rationale"] = cd_rationale
            add_lineage(word_dir, 'images', version_name, from_versions, lineage_settings, status)
            if status in ('success', 'partial'):
                update_selection(word_dir, 'images', version_name)
            return {"stage": stage, "version": version_name, "result": result}

        elif stage == 'video':
            images_version = manifest_data.selected.images
            if not images_version:
                raise PipelineError("No images selected. Run image stage first.")
            # Inject target duration from concept settings for scene duration rebalancing.
            # Short-mode forces target to 15s and threads the flag through to the adapter.
            concept_settings = resolve_settings('concept', manifest_data.settings, defaults)
            _short = _short_mode_from_images(manifest_data, defaults)
            _target = 15 if _short else concept_settings.get("duration", 20)
            settings = {**settings, "_target_duration": _target, "short_mode": _short}
            # Resolve creative_direction from images settings for transition mode override
            images_settings = resolve_settings('images', manifest_data.settings, defaults)
            creative_direction = images_settings.get('creative_direction', 'literal')
            # If auto, read the resolved direction from manifest lineage (authoritative).
            # storyboard.json has LLM free-text; lineage settings_snapshot is the source of truth.
            if creative_direction == "auto":
                _resolved: str | None = None
                _images_entries = [e for e in manifest_data.lineage if e.stage == "images"]
                if _images_entries:
                    _latest = _images_entries[-1]  # lineage is append-only chronological
                    _resolved = (
                        _latest.settings_snapshot.get("creative_direction_resolved")
                        or _latest.settings_snapshot.get("creative_direction")
                    )
                # Last-resort: legacy storyboard.json read (for very old content without lineage data)
                if not _resolved:
                    sb_file = word_dir / "images" / images_version / "storyboard.json"
                    if sb_file.exists():
                        with open(sb_file, 'r', encoding='utf-8') as f:
                            sb_data = json.load(f)
                        _resolved = sb_data.get("creative_direction")
                creative_direction = _resolved or "literal"
            payloads = build_video_payloads(word_dir, manifest_data, settings, output_dir, images_version, creative_direction)
            if not payloads:
                if settings.get("text_to_video", False):
                    raise PipelineError("No scenes found in storyboard for text-to-video.")
                raise PipelineError("No images found in selected image set.")

            from_versions = {"images": images_version}
            results = []
            for vp in payloads:
                vresult = await call_engine('video', vp)
                results.append(vresult)

            # Consider partial success if any succeeded
            any_success = any(r.get('status') == 'success' for r in results)
            all_success = all(r.get('status') == 'success' for r in results)
            final_status = 'success' if all_success else ('partial' if any_success else 'failed')
            add_lineage(word_dir, 'video', version_name, from_versions, settings, final_status)
            if any_success:
                update_selection(word_dir, 'video', version_name)

            return {"stage": stage, "version": version_name, "result": {"status": final_status, "scene_results": results}}

        elif stage == 'assembly':
            # When bookend is enabled, force clean assembly mode (bookend handles word cards)
            bookend_defaults = defaults.get('bookend', {})
            bookend_word = manifest_data.settings.get('bookend', {})
            if {**bookend_defaults, **bookend_word}.get('enabled', True):
                settings['assembly_mode'] = 'clean'

            song_version = manifest_data.selected.song
            video_version = manifest_data.selected.video
            if not song_version:
                raise PipelineError("No song take selected. Select a song take first.")
            if not video_version:
                raise PipelineError("No video version selected. Run video stage first.")

            from_versions = {"song": song_version, "video": video_version}
            payload = build_assembly_payload(
                word_dir, manifest_data, settings, output_dir, song_version, video_version
            )
            result = await call_engine('assembly', payload)
            status = result.get('status', 'failed')
            add_lineage(word_dir, 'assembly', version_name, from_versions, settings, status)
            if status == 'success':
                update_selection(word_dir, 'final', version_name)
            return {"stage": stage, "version": version_name, "result": result}

        elif stage == 'bookend':
            # Check if bookend is enabled
            if not settings.get('enabled', True):
                return {"status": "skipped", "message": "Bookend disabled in settings"}

            # Verify assembly is complete
            if not manifest_data.selected.final:
                raise PipelineError("No assembly version selected. Run assembly stage first.")

            from_versions = {"assembly": manifest_data.selected.final}
            payload = build_bookend_payload(word_dir, manifest_data, settings, output_dir)
            result = await call_engine('bookend', payload)
            status = result.get('status', 'failed')
            add_lineage(word_dir, 'bookend', version_name, from_versions, settings, status)
            if status == 'success':
                update_selection(word_dir, 'bookend', version_name)
            return {"stage": stage, "version": version_name, "result": result}

    except (EngineUnreachableError, PayloadError, TimeoutError) as e:
        add_lineage(word_dir, stage, version_name, from_versions, settings, 'failed')
        raise PipelineError(str(e))
