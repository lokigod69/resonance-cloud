def calculate_display_duration(
    tts_duration: float,
    buffer_pct: float,
    min_duration: float,
    max_duration: float,
) -> float:
    """
    Calculate how long the word card should display.

    Formula: tts_duration * (1 + buffer_pct), clamped to [min, max].

    Examples:
        "Mut" (0.4s TTS, 50% buffer) -> 0.6s -> clamped to 1.5s (min)
        "Verzweiflung" (1.2s TTS, 50% buffer) -> 1.8s -> 1.8s
        "Geschwindigkeitsbegrenzung" (2.1s TTS, 50% buffer) -> 3.15s -> 3.15s
    """
    display = tts_duration * (1.0 + buffer_pct)
    display = max(display, min_duration)
    display = min(display, max_duration)
    return round(display, 2)


def calculate_segment_durations(
    tts_duration: float,
    settings_buffer_pct: float,
    settings_min: float,
    settings_max: float,
    settings_fade: float,
) -> dict:
    """
    Calculate all timing values for intro and outro segments.

    Returns dict with:
        card_display: how long the card content is shown
        intro_duration: total intro segment length (fade_in + card_display)
        outro_duration: total outro segment length (fade_in + card_display)
        tts_start_offset: when TTS audio starts within the segment (after fade)
        total_added: total seconds added to the assembled video
    """
    card_display = calculate_display_duration(
        tts_duration, settings_buffer_pct, settings_min, settings_max
    )

    intro_duration = settings_fade + card_display
    outro_duration = settings_fade + card_display

    return {
        "card_display": card_display,
        "intro_duration": round(intro_duration, 2),
        "outro_duration": round(outro_duration, 2),
        "tts_start_offset": round(settings_fade, 2),
        "total_added": round(intro_duration + outro_duration, 2),
    }
