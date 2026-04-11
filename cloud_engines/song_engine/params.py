"""Parameter mapping and validation for the Song Engine.

Maps SongContent + SongSettings → AceStepParams per ENGINE_SONG.md Section 4.
Applies hardcoded values, validates ranges, handles seed logic,
and triggers the caption language safety net.
"""

from __future__ import annotations

from .language import ensure_language_in_caption, remap_caption_language, remap_language_code, validate_language_code
from .models import AceStepParams, SongContent, SongSettings


def build_acestep_params(
    content: SongContent,
    settings: SongSettings,
) -> tuple[AceStepParams, bool]:
    """Build the complete Ace-Step parameter set from engine inputs.

    Maps user-configurable settings to Ace-Step params, applies all
    hardcoded values, and runs the caption language safety net.

    Args:
        content: Lyrics, music caption, and language code from concept artifact.
        settings: User-configurable generation settings (with defaults applied).

    Returns:
        Tuple of (AceStepParams, caption_was_modified).

    Raises:
        ValueError: If language_code is invalid or required fields are missing.
    """
    # Remap codes not natively supported by ACE-Step (e.g. ceb → tl)
    content.language_code = remap_language_code(content.language_code)

    # Remap caption language names ACE-Step doesn't recognize (e.g. "Bisaya" → "Filipino")
    content.music_caption = remap_caption_language(content.music_caption)

    # Validate language code — Layer 1 of language lock
    if not validate_language_code(content.language_code):
        raise ValueError(
            f"Invalid language code: '{content.language_code}'. "
            f"Must be a valid ISO 639-1 code supported by Ace-Step. "
            f"Never use 'unknown'."
        )

    # Language safety net — Layer 2 of language lock
    # This is the ONLY input modification the engine makes
    from .language import VALID_LANGUAGES

    language_name = VALID_LANGUAGES.get(content.language_code.lower(), content.language_code)
    caption, caption_modified = ensure_language_in_caption(
        caption=content.music_caption,
        language=language_name,
        language_code=content.language_code,
    )

    # LoRA overrides — when LoRA is active, force thinking and CoT off
    lora_active = bool(settings.lora_path)
    thinking = settings.thinking
    if lora_active:
        thinking = False

    # LoRA trigger phrase — prepend to caption before sending to Ace-Step
    if lora_active and settings.lora_trigger_phrase:
        caption = f"{settings.lora_trigger_phrase}, {caption}"

    params = AceStepParams(
        # From input
        caption=caption,
        lyrics=content.lyrics,
        vocal_language=content.language_code.lower(),
        task_type="text2music",
        # User-configurable
        duration=settings.duration,
        inference_steps=settings.inference_steps,
        guidance_scale=settings.guidance_scale,
        thinking=thinking,
        batch_size=settings.batch_size,
        seed=settings.seed,
        bpm=settings.bpm,
        # Hardcoded — Layer 3 of language lock (CoT flags all false)
        shift=2.5,
        infer_method="ode",
        use_cot_caption=False,
        use_cot_language=False,
        use_cot_metas=False,
        audio_format="flac",
        enable_normalization=True,
        normalization_db=-1.0,
        lm_temperature=0.85,
        lm_top_k=0,
        lm_top_p=0.9,
        lm_cfg_scale=2.0,
        # LoRA state — passed to Gradio backend for ensure_lora_state()
        lora_path=settings.lora_path,
        lora_strength=settings.lora_strength,
    )

    return params, caption_modified
