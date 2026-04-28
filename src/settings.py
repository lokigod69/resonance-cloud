"""Settings inheritance: merge batch defaults with per-word overrides."""

from __future__ import annotations
import json
import random
from pathlib import Path
from typing import Any

from cloud_engines.duration_policy import CLIP_DURATION_DEFAULT, validate_clip_duration


ART_STYLE_PRESETS = [
    "photorealistic", "oil_painting", "watercolor", "surrealism", "pop_art",
    "chiaroscuro", "art_nouveau", "ukiyo_e", "van_gogh",
    "studio_ghibli", "anime", "comic_book", "disney_animation",
    "one_piece_style", "rick_and_morty_style",
    "pixel_art", "synthwave", "cyberpunk", "vaporwave", "glitch_art",
    "knitted", "claymation", "origami", "stained_glass",
    "noir", "vintage_film", "double_exposure",
    "pen_and_ink", "charcoal_sketch", "steampunk",
]

DEFAULT_SETTINGS = {
    "concept": {
        "vocal_gender": "female",
        "lyric_mode": "reliable",
        "genre": "auto",
        "caption_style": "production",
        "syllable_chop": False,
        "duration": 15,
        "visual_hint": False,
        "use_art_style": False,
        "llm_model": "deepseek/deepseek-v4-flash",
    },
    "song": {
        "duration": 15,
        "batch_size": 2,
        "inference_steps": 50,
        "guidance_scale": 8.0,
        "thinking": True,
        "seed": -1,
        "bpm": None,
        "lora_id": "",
        "lora_id_base_path": "",
        "lora_checkpoint": "",
        "lora_path": "",
        "lora_strength": 0.75,
        "lora_trigger_phrase": ""
    },
    "images": {
        "creative_direction": "auto",
        "visual_reference": "none",
        "frame_narrative": "auto",
        "image_count": "auto",
        "clip_duration": 15,
        "aspect_ratio": "16:9",
        "art_style": "auto",
        "word_in_image": True,
        "use_color_palette": True,
        "image_model": "flux_pro",
        "llm_model": "x-ai/grok-4.1-fast",
    },
    "video": {
        "video_mode": "ltx_fast",
        "duration": 6,
        "resolution": "1080p",
        "fps": 24,
        "frame_transitions": True,
        "transition_mode": "auto",
        "negative_prompt": "blur, distort, and low quality",
        "cfg_scale": 0.5,
        "seed": -1,
        "motion_type": "auto",
        "motion_speed": "slow"
    },
    "assembly": {
        "assembly_mode": "clean",
        "gap_strategy": "fade_black",
        "overflow_strategy": "video_full",
        "transition": "cut",
        "transition_duration": 0.5,
        "silence_trim": True,
        "silence_threshold_db": -40.0,
        "lufs_normalize": True,
        "target_lufs": -14.0,
        "word_card_duration": 2.0,
        "word_card_font": "Noto Sans",
        "word_card_font_size": 72,
        "word_card_color": "auto",
        "word_card_show_translation": False,
        "video_codec": "libx264",
        "video_preset": "slow",
        "video_crf": 18,
        "audio_codec": "aac",
        "audio_bitrate": "320k",
        "output_resolution": "1080p",
        "output_fps": 25
    },
    "bookend": {
        "enabled": True,
        "voice_id": "",
        "model_id": "eleven_flash_v2_5",
        "display_duration_min": 2.0,
        "display_duration_max": 4.0,
        "display_buffer_pct": 1.0,
        "fade_duration": 0.5,
        "font": "Bebas Neue",
        "font_size": 144,
        "text_color": "auto",
        "background_color": "#000000",
        "gradient_background": False,
        "show_translation": False,
        "show_phonetic": False,
    },
    "suno": {
        "enabled": False,
        "outro_mode": "fade_out",        # "fade_out" or "clean_cut"
        "fade_tail_duration": 2.5,       # seconds of Suno audio bleed in fade_out mode
    },
}


def defaults_path(workspace_path: Path) -> Path:
    return workspace_path / "settings-defaults.json"


def _resolve_clip_duration_for_settings(settings: dict[str, dict[str, Any]]) -> int:
    images = settings.get("images", {})
    try:
        return validate_clip_duration(int(images.get("clip_duration", CLIP_DURATION_DEFAULT)))
    except (TypeError, ValueError):
        return CLIP_DURATION_DEFAULT


def sanitize_duration_settings(
    settings: dict[str, dict[str, Any]],
) -> dict[str, dict[str, Any]]:
    """Remove deprecated duration knobs and mirror canonical clip duration.

    This keeps persisted defaults/presets from reintroducing hidden short-mode
    or independent concept/song durations while preserving unrelated settings.
    """
    sanitized = {
        stage: dict(values) if isinstance(values, dict) else {}
        for stage, values in settings.items()
    }
    images = sanitized.setdefault("images", {})
    images.pop("short" + "_mode", None)

    clip_duration = _resolve_clip_duration_for_settings(sanitized)
    images["clip_duration"] = clip_duration
    sanitized.setdefault("concept", {})["duration"] = clip_duration
    sanitized.setdefault("song", {})["duration"] = clip_duration
    return sanitized


def load_defaults(workspace_path: Path) -> dict[str, dict[str, Any]]:
    """Load settings-defaults.json, falling back to hardcoded defaults."""
    p = defaults_path(workspace_path)
    if p.exists():
        with open(p, 'r', encoding='utf-8') as f:
            data = json.load(f)
        data.pop('__doc', None)
        merged = {}
        for stage, stage_defaults in DEFAULT_SETTINGS.items():
            merged[stage] = {**stage_defaults, **data.get(stage, {})}
        return sanitize_duration_settings(merged)
    return sanitize_duration_settings(DEFAULT_SETTINGS)


def save_defaults(workspace_path: Path, settings: dict[str, dict[str, Any]]) -> None:
    """Save settings-defaults.json."""
    p = defaults_path(workspace_path)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(sanitize_duration_settings(settings), f, indent=2, ensure_ascii=False)


def resolve_settings(
    stage: str,
    manifest_settings: dict[str, dict[str, Any]],
    defaults: dict[str, dict[str, Any]],
) -> dict[str, Any]:
    """
    Merge batch defaults with per-word overrides. Word settings win.
    Returns a flat, complete settings object ready to send to an engine.
    Null overrides are dropped so the batch default is used instead.
    """
    batch = defaults.get(stage, {})
    word = {k: v for k, v in manifest_settings.get(stage, {}).items() if v is not None}
    return {**batch, **word}


def resolve_random_art_style(settings: dict[str, Any]) -> tuple[dict[str, Any], str | None]:
    """If art_style is 'random', replace with a random preset.

    Returns (updated_settings, resolved_style_or_None).
    """
    if settings.get("art_style") == "random":
        chosen = random.choice(ART_STYLE_PRESETS)
        return {**settings, "art_style": chosen}, chosen
    return settings, None


def init_defaults_if_missing(workspace_path: Path) -> None:
    """Write default settings-defaults.json if it doesn't exist."""
    p = defaults_path(workspace_path)
    if not p.exists():
        save_defaults(workspace_path, DEFAULT_SETTINGS)
