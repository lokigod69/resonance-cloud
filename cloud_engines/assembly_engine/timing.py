"""Duration calculations and timing plan for the Assembly Engine.

Per ENGINE_ASSEMBLY.md Sections 4–6:
- The song is the master clock
- Gap strategies fill time when video is shorter than song
- Overflow strategies handle video being longer than song
- Transitions reduce effective clip duration (crossfade/dip_black overlap)

This module contains pure functions — no file I/O, no FFMPEG calls.
"""

from __future__ import annotations

import logging

from .models import AssemblySettings, TimingPlan

logger = logging.getLogger(__name__)


def calculate_timing(
    song_duration: float,
    clip_durations: list[float],
    settings: AssemblySettings,
) -> TimingPlan:
    """Calculate the complete assembly timing plan.

    Per ENGINE_ASSEMBLY.md Section 4:
    - effective_song_duration is the master clock
    - Word card intro time is pre-allocated (pedagogic mode)
    - Gap/overflow determines which strategy to apply
    - Outro word card uses leftover gap time (min 1.0s, max word_card_duration)

    Args:
        song_duration: Duration of the (processed) song audio in seconds.
        clip_durations: Duration of each video clip in seconds.
        settings: Assembly settings.

    Returns:
        TimingPlan with all durations resolved.
    """
    effective_song_duration = song_duration

    # Word card intro allocation (pedagogic mode only)
    word_card_intro_duration = 0.0
    if settings.assembly_mode == "pedagogic":
        word_card_intro_duration = settings.word_card_duration

    # Available time for video content
    available_for_video = effective_song_duration - word_card_intro_duration

    # Transition time reduction: crossfade/dip_black reduce total clip time
    transition_time_reduction = _calculate_transition_reduction(
        num_clips=len(clip_durations),
        transition=settings.transition,
        transition_duration=settings.transition_duration,
    )

    # Total effective clip duration (accounting for transitions)
    raw_clip_total = sum(clip_durations)
    total_clip_duration = raw_clip_total - transition_time_reduction

    # Gap calculation
    gap = available_for_video - total_clip_duration

    # Determine strategy and outro word card allocation
    word_card_outro_duration = 0.0
    strategy_to_apply = "none"

    if gap > 0.01:  # epsilon for float comparison
        strategy_to_apply = settings.gap_strategy

        # In pedagogic mode, carve out outro word card time from the gap
        if settings.assembly_mode == "pedagogic":
            word_card_outro_duration = _calculate_outro_duration(
                gap=gap,
                max_duration=settings.word_card_duration,
            )

    elif gap < -0.01:  # overflow
        strategy_to_apply = settings.overflow_strategy

    plan = TimingPlan(
        effective_song_duration=effective_song_duration,
        total_clip_duration=total_clip_duration,
        transition_time_reduction=transition_time_reduction,
        word_card_intro_duration=word_card_intro_duration,
        word_card_outro_duration=word_card_outro_duration,
        available_for_video=available_for_video,
        gap=gap,
        strategy_to_apply=strategy_to_apply,
    )

    logger.info(
        f"Timing plan: song={effective_song_duration:.1f}s, "
        f"clips={total_clip_duration:.1f}s, "
        f"gap={gap:.1f}s, strategy={strategy_to_apply}"
    )
    return plan


def _calculate_transition_reduction(
    num_clips: int,
    transition: str,
    transition_duration: float,
) -> float:
    """Calculate how much transitions reduce total clip duration.

    Per ENGINE_ASSEMBLY.md Section 7.2:
    Crossfade reduces total video duration. With 3 clips and 0.5s crossfade,
    total = sum(durations) - (2 * 0.5) = sum - 1.0

    Hard cuts have no reduction.
    """
    if transition == "cut" or num_clips <= 1:
        return 0.0

    num_transitions = num_clips - 1
    return num_transitions * transition_duration


def _calculate_outro_duration(
    gap: float,
    max_duration: float,
) -> float:
    """Calculate outro word card duration from available gap time.

    Per ENGINE_ASSEMBLY.md Section 3.2:
    - Outro fills remaining time after gap strategy
    - Minimum 1.0s, maximum word_card_duration
    - If gap is too small for a meaningful outro, skip it

    The outro card time comes OUT of the gap, so:
    - gap_strategy fills: gap - outro_duration
    - outro_card fills: outro_duration
    """
    if gap < 1.0:
        return 0.0

    # Use at most max_duration for the outro, leave the rest for gap strategy
    outro = min(gap, max_duration)

    # Ensure at least 1.0s (the minimum for the outro to be shown)
    if outro < 1.0:
        return 0.0

    return outro
