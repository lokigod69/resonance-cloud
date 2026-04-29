"""Tier-conditional conditioning_strength mapping for LTX i2v.

scene_tier is set by the LLM per scene (calm | standard | tense). This module
maps tier to the i2v conditioning_strength sent to the worker.

Higher strength = tighter adherence to input frame, less motion freedom.
Lower strength = looser adherence, more motion freedom, potential identity drift.

Calm scenes want tight adherence to preserve subtle motion intent.
Tense scenes want looser adherence to allow reactive subject motion that high
adherence was suppressing (the original "mannequin effect" failure mode).

Values are starting points pending empirical A/B tuning. To tune, change
TIER_TO_CONDITIONING_STRENGTH and redeploy the orchestrator. Worker image
does not need rebuilding.

Note on user-supplied conditioning_strength: when tier mapping is applied in
the pipeline payload builder, the resolved value overwrites any explicit
conditioning_strength previously set on the per-scene settings dict. This is
intentional — scene_tier is currently the authoritative signal. If user
override should win in the future, gate the assignment in the pipeline on
"value not explicitly provided"; do not change this module.
"""

from __future__ import annotations

from typing import Literal

SceneTier = Literal["calm", "standard", "tense"]

TIER_TO_CONDITIONING_STRENGTH: dict[SceneTier, float] = {
    "calm": 0.95,
    "standard": 0.85,
    "tense": 0.75,
}

# Used when scene_tier is missing, unknown, or the storyboard predates the
# scene_tier field. Matches VideoSettings.conditioning_strength field default.
DEFAULT_CONDITIONING_STRENGTH: float = 0.85


def conditioning_strength_for_tier(scene_tier: str | None) -> float:
    """Look up conditioning_strength for a given scene_tier.

    Returns DEFAULT_CONDITIONING_STRENGTH for None, empty string, or any
    value not in the mapping. Never raises.
    """
    if scene_tier is None:
        return DEFAULT_CONDITIONING_STRENGTH
    return TIER_TO_CONDITIONING_STRENGTH.get(scene_tier, DEFAULT_CONDITIONING_STRENGTH)
