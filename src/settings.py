"""Settings inheritance: merge batch defaults with per-word overrides."""

from __future__ import annotations
import json
import random
from pathlib import Path
from typing import Any


ART_STYLE_PRESETS = [
    "photorealistic",
    "watercolor",
    "oil_painting",
    "noir",
    "studio_ghibli",
    "comic_book",
    "pixel_art",
    "synthwave",
    "ukiyo_e",
    "renaissance",
    "pen_and_ink",
    "retro_90s",
    "knitted",
    "expressionist",
    "vintage_film",
    "chiaroscuro",
    "disney_animation",
    "double_exposure",
    "blue_eyed_samurai",
    "invincible",
    "big_mouth",
]

DEFAULT_SETTINGS = {
    "concept": {
        "vocal_gender": "female",
        "lyric_mode": "reliable",
        "genre": "auto",
        "caption_style": "production",
        "syllable_chop": False,
        "duration": 20,
        "visual_hint": False,
        "use_art_style": False,
        "llm_model": "deepseek/deepseek-v3.2",
    },
    "song": {
        "duration": 20,
        "batch_size": 4,
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
        "visual_reference": "auto",
        "frame_narrative": "auto",
        "image_count": "auto",
        "clip_duration": 20,
        "aspect_ratio": "16:9",
        "art_style": "photorealistic",
        "word_in_image": True,
        "image_model": "quality",
        "llm_model": "deepseek/deepseek-v3.2",
    },
    "video": {
        "video_mode": "ltx_fast",
        "duration": 6,
        "resolution": "1080p",
        "fps": 24,
        "frame_transitions": False,
        "transition_mode": "all_cut",
        "negative_prompt": "blur, distort, and low quality",
        "cfg_scale": 0.5,
        "seed": -1,
        "motion_type": "auto",
        "motion_speed": "slow"
    },
    "assembly": {
        "assembly_mode": "clean",
        "gap_strategy": "ping_pong",
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
        "output_fps": 24
    },
    "bookend": {
        "enabled": True,
        "voice_id": "",
        "model_id": "eleven_flash_v2_5",
        "display_duration_min": 2.0,
        "display_duration_max": 4.0,
        "display_buffer_pct": 1.0,
        "fade_duration": 0.5,
        "font": "Noto Sans",
        "font_size": 144,
        "text_color": "auto",
        "background_color": "#000000",
        "show_translation": True,
        "show_phonetic": False,
    }
}


def defaults_path(workspace_path: Path) -> Path:
    return workspace_path / "settings-defaults.json"


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
        return merged
    return dict(DEFAULT_SETTINGS)


def save_defaults(workspace_path: Path, settings: dict[str, dict[str, Any]]) -> None:
    """Save settings-defaults.json."""
    p = defaults_path(workspace_path)
    with open(p, 'w', encoding='utf-8') as f:
        json.dump(settings, f, indent=2, ensure_ascii=False)


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
