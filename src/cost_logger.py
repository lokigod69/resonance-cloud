"""Cost logger — no-op stub (§2.8, §14).

All public signatures preserved so the thirteen engine call-sites compile
and run without edits. Every function is a no-op. Pricing helpers return
constant zeros. Re-introduce real cost tracking in a later PR.
"""

from __future__ import annotations

from typing import Any, Optional

__all__ = [
    "set_word_context",
    "clear_word_context",
    "log_cost",
    "estimate_openrouter_cost",
    "estimate_gemini_image_cost",
    "estimate_elevenlabs_cost",
    "GEMINI_COST_PER_IMAGE",
    "GEMINI_DEFAULT_COST_PER_IMAGE",
    "KIE_SUNO_COST_PER_SONG",
    "KIE_WAN_COST_PER_IMAGE",
    "KIE_FLUX_PRO_COST_PER_IMAGE",
    "FAL_ZTURBO_COST_PER_IMAGE",
]


# ---------------------------------------------------------------------------
# Context helpers (orchestrator no longer calls these, but we keep the stubs
# because other modules may import them).
# ---------------------------------------------------------------------------

def set_word_context(
    user_id: str,
    deck_id: str,
    word_slug: str,
    word_id: Optional[str] = None,
) -> None:
    return None


def clear_word_context() -> None:
    return None


# ---------------------------------------------------------------------------
# Main cost-logging entry point (no-op).
# ---------------------------------------------------------------------------

def log_cost(
    *,
    stage: str,
    provider: str,
    status: str,
    model: Optional[str] = None,
    usage_metrics: Optional[dict[str, Any]] = None,
    estimated_cost_usd: Optional[float] = None,
    provider_cost_usd: Optional[float] = None,
    duration_ms: Optional[int] = None,
    attempt_number: int = 1,
    error_message: Optional[str] = None,
    extra_metadata: Optional[dict[str, Any]] = None,
    user_id: Optional[str] = None,
    deck_id: Optional[str] = None,
    word_slug: Optional[str] = None,
    word_id: Optional[str] = None,
) -> None:
    return None


# ---------------------------------------------------------------------------
# Pricing helpers — return 0.0 so callers that multiply by counts stay safe.
# ---------------------------------------------------------------------------

GEMINI_COST_PER_IMAGE: dict[str, float] = {}
GEMINI_DEFAULT_COST_PER_IMAGE: float = 0.0
KIE_SUNO_COST_PER_SONG: float = 0.0
KIE_WAN_COST_PER_IMAGE: float = 0.0
KIE_FLUX_PRO_COST_PER_IMAGE: float = 0.035
FAL_ZTURBO_COST_PER_IMAGE: float = 0.010


def estimate_openrouter_cost(model: str, usage: dict[str, Any]) -> float:
    return 0.0


def estimate_gemini_image_cost(model_id: str) -> float:
    return 0.0


def estimate_elevenlabs_cost(characters: int) -> float:
    return 0.0
