"""Cost rate table — real per-call USD estimates for the usage/cost event log.

This module is the **single place to edit provider rates** for the Python
generation backend. Every engine call site already imports the estimator
functions and the per-image / per-song constants from here and forwards the
result into `pipeline_events.cost_usd` via `src/services/events.py`. Making the
estimates real here therefore wires real cost into every Python call site
(concept LLM, storyboard LLM, card LLM, image renders, Suno, TTS) without
touching those call sites.

Twin module: the Vercel frontend has its own rate table at
`frontend/api/_shared/usageCost.ts` for the four `/api/*` provider calls. The two
runtimes cannot share a module, so when a rate changes update **both**.

Rate hygiene
------------
Each rate carries a source + a "last verified" date. Rates that could not be
confirmed against a primary provider doc are marked ``UNVERIFIED`` — treat those
figures as best-effort estimates, not invoice-accurate facts.

Note: ``cost_usd`` recorded on an event is always the *estimate* computed here.
``real_cost_usd`` (a separate, nullable column) is reserved for providers that
report actual billed cost; this module does not populate it.

`log_cost()` remains a no-op: per-call rows are written by `src/services/events.py`
(the `logged_llm_call` / `logged_api_call` / `write_event_row` writers), not here.
The signature is preserved only so legacy call sites keep compiling.
"""

from __future__ import annotations

import logging
from typing import Any, Optional

logger = logging.getLogger(__name__)

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
    "KIE_WAN_PRO_COST_PER_IMAGE",
    "KIE_FLUX_PRO_COST_PER_IMAGE",
    "KIE_SEEDREAM_LITE_COST_PER_IMAGE",
    "KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K",
    "KIE_Z_IMAGE_COST_PER_IMAGE",
    "FAL_ZTURBO_COST_PER_IMAGE",
    "FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9",
    "FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_FULL_HD",
]


# ---------------------------------------------------------------------------
# Context helpers — retained no-ops (the orchestrator no longer calls these,
# but other modules may still import them).
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
# Legacy cost-logging entry point — no-op. Per-call rows are written by
# src/services/events.py. Kept only so existing call sites compile.
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
# Per-image / per-song constants (USD).
#
# Image rates carried over from the prior literals; re-confirmed where a public
# rate exists. Async image/song providers do not return per-call usage, so these
# are flat per-unit estimates by design.
# ---------------------------------------------------------------------------

# Gemini image generation — no public per-image figure confirmed for the image
# models used here. Default applies to any model not in the dict.
GEMINI_COST_PER_IMAGE: dict[str, float] = {}
GEMINI_DEFAULT_COST_PER_IMAGE: float = 0.039  # UNVERIFIED — best-effort estimate (no primary source confirmed 2026-06-19)

# Suno song bake-in records $0 to avoid double counting: the real charge is taken
# once at submit time in src/suno.py (KIE_SUNO_COST_PER_SUBMIT = 0.06, covers the
# 2 songs a submit produces). Source: kie.ai Suno pricing, verified 2026-06-19.
KIE_SUNO_COST_PER_SONG: float = 0.0

# kie.ai WAN — no confirmed public per-image rate; provider modules report their
# own estimate. Kept as a documented estimate so totals don't silently read $0.
KIE_WAN_COST_PER_IMAGE: float = 0.020          # UNVERIFIED — best-effort estimate 2026-06-19
KIE_WAN_PRO_COST_PER_IMAGE: float = 0.035      # carried-over literal; UNVERIFIED 2026-06-19
KIE_FLUX_PRO_COST_PER_IMAGE: float = 0.025     # carried-over literal; UNVERIFIED 2026-06-19
KIE_SEEDREAM_LITE_COST_PER_IMAGE: float = 0.027  # carried-over literal; UNVERIFIED 2026-06-19
KIE_GPT_IMAGE_2_COST_PER_IMAGE_2K: float = 0.050  # carried-over literal; UNVERIFIED 2026-06-19
KIE_Z_IMAGE_COST_PER_IMAGE: float = 0.004      # carried-over literal; UNVERIFIED 2026-06-19
FAL_ZTURBO_COST_PER_IMAGE: float = 0.010       # carried-over literal; UNVERIFIED 2026-06-19
FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_LANDSCAPE_16_9: float = 0.003  # carried-over literal; UNVERIFIED 2026-06-19
FAL_Z_IMAGE_TURBO_COST_PER_IMAGE_FULL_HD: float = 0.010  # carried-over literal; UNVERIFIED 2026-06-19


# ---------------------------------------------------------------------------
# Token / character rate tables (USD).
# ---------------------------------------------------------------------------

# OpenRouter LLM text — USD per 1M tokens, {"in": prompt, "out": completion}.
# deepseek-v4-flash via OpenRouter: $0.09 in / $0.18 out per 1M tokens.
# Source: https://openrouter.ai/deepseek/deepseek-v4-flash — verified 2026-06-19.
OPENROUTER_RATES_USD_PER_MTOKEN: dict[str, dict[str, float]] = {
    "deepseek/deepseek-v4-flash": {"in": 0.09, "out": 0.18},
}
# Fallback for any OpenRouter model not in the table above. Deliberately
# conservative so an unmapped model over- rather than under-estimates.
OPENROUTER_DEFAULT_RATE_USD_PER_MTOKEN: dict[str, float] = {"in": 0.50, "out": 1.50}  # UNVERIFIED fallback

# ElevenLabs TTS — USD per 1,000 characters. ElevenLabs is no longer a Speak
# provider but still backs Guided-lesson / bookend TTS. Rate varies by plan tier.
ELEVENLABS_USD_PER_1K_CHARS: float = 0.30  # UNVERIFIED — plan-dependent, estimate 2026-06-19


def estimate_openrouter_cost(model: str, usage: dict[str, Any] | None) -> float:
    """Estimate OpenRouter spend from the provider-reported ``usage`` block.

    ``usage`` is the OpenRouter response field: ``prompt_tokens`` /
    ``completion_tokens``. Returns 0.0 if usage is absent.
    """
    if not usage:
        return 0.0
    rate = OPENROUTER_RATES_USD_PER_MTOKEN.get(model)
    if rate is None:
        rate = OPENROUTER_DEFAULT_RATE_USD_PER_MTOKEN
        logger.warning("cost_logger: no rate for OpenRouter model %r — using fallback", model)
    prompt_tokens = float(usage.get("prompt_tokens") or 0)
    completion_tokens = float(usage.get("completion_tokens") or 0)
    return (prompt_tokens / 1_000_000.0) * rate["in"] + (completion_tokens / 1_000_000.0) * rate["out"]


def estimate_gemini_image_cost(model_id: str) -> float:
    """Flat per-image estimate for a Gemini image model."""
    return GEMINI_COST_PER_IMAGE.get(model_id, GEMINI_DEFAULT_COST_PER_IMAGE)


def estimate_elevenlabs_cost(characters: int) -> float:
    """Estimate ElevenLabs TTS spend from character count."""
    if not characters or characters < 0:
        return 0.0
    return (characters / 1000.0) * ELEVENLABS_USD_PER_1K_CHARS
