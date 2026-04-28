from __future__ import annotations

from typing import Literal

CLIP_DURATION_MIN = 6
CLIP_DURATION_MAX = 30
CLIP_DURATION_DEFAULT = 15

SCENE_DURATION_MIN = 3
SCENE_DURATION_MAX = 10

DurationBand = Literal["very_sparse", "sparse", "standard", "dense"]


def validate_clip_duration(value: int) -> int:
    if not isinstance(value, int):
        raise TypeError("clip_duration must be an integer")
    if not CLIP_DURATION_MIN <= value <= CLIP_DURATION_MAX:
        raise ValueError(
            f"clip_duration {value} outside supported range "
            f"{CLIP_DURATION_MIN}-{CLIP_DURATION_MAX}"
        )
    return value


def duration_band(duration: int) -> DurationBand:
    validate_clip_duration(duration)
    if duration <= 9:
        return "very_sparse"
    if duration <= 15:
        return "sparse"
    if duration <= 22:
        return "standard"
    return "dense"


def auto_scene_count(clip_duration: int) -> int | str:
    validate_clip_duration(clip_duration)

    if clip_duration <= 6:
        return 1
    if clip_duration <= 9:
        return 2
    if clip_duration <= 18:
        return "auto"
    return 3


def is_scene_count_feasible(
    scene_count: int,
    clip_duration: int,
    *,
    min_scene_duration: int = SCENE_DURATION_MIN,
    max_scene_duration: int = SCENE_DURATION_MAX,
) -> bool:
    return (
        scene_count >= 1
        and scene_count * min_scene_duration <= clip_duration <= scene_count * max_scene_duration
    )
