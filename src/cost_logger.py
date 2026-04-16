"""
Cost Logger — fire-and-forget cost event recording to Supabase.

Design principles:
    1. NEVER blocks the pipeline — all writes are best-effort
    2. Thread-safe — uses threading.local() for word context
    3. Batch-friendly — accumulates events, flushes on threshold or shutdown
    4. Import-safe — gracefully no-ops if Supabase is unconfigured

Usage in any engine or dispatcher:

    from src.cost_logger import log_cost

    log_cost(
        stage="concept",
        provider="openrouter",
        model="deepseek/deepseek-v3.2",
        status="success",
        usage_metrics={"prompt_tokens": 1200, "completion_tokens": 800},
        estimated_cost_usd=0.002,
        duration_ms=1500,
    )

Context (user_id, deck_id, word_slug, word_id) is set once per word by the
orchestrator via set_word_context() and read automatically by log_cost().
"""

from __future__ import annotations

import atexit
import logging
import os
import threading
import time
from typing import Any, Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Thread-local context: set by orchestrator, read by log_cost()
# ---------------------------------------------------------------------------

_context = threading.local()

# Module-level enable/disable
_ENABLED: bool = os.getenv("COST_TRACKING_ENABLED", "true").lower() in ("true", "1", "yes")


def set_word_context(
    user_id: str,
    deck_id: str,
    word_slug: str,
    word_id: Optional[str] = None,
) -> None:
    """Set the word context for the current thread.

    Called by the orchestrator at the start of process_word().
    All subsequent log_cost() calls on this thread will inherit these values.
    """
    _context.user_id = user_id
    _context.deck_id = deck_id
    _context.word_slug = word_slug
    _context.word_id = word_id


def clear_word_context() -> None:
    """Clear the word context for the current thread.

    Called by the orchestrator after process_word() completes.
    """
    _context.user_id = None
    _context.deck_id = None
    _context.word_slug = None
    _context.word_id = None


def _get_context() -> dict[str, Optional[str]]:
    """Read current thread's word context."""
    return {
        "user_id": getattr(_context, "user_id", None),
        "deck_id": getattr(_context, "deck_id", None),
        "word_slug": getattr(_context, "word_slug", None),
        "word_id": getattr(_context, "word_id", None),
    }


# ---------------------------------------------------------------------------
# Supabase client (lazy, singleton)
# ---------------------------------------------------------------------------

_supabase_client = None
_supabase_lock = threading.Lock()


def _get_supabase():
    """Lazy-initialize the Supabase client. Returns None if unconfigured."""
    global _supabase_client
    if _supabase_client is not None:
        return _supabase_client

    with _supabase_lock:
        if _supabase_client is not None:
            return _supabase_client

        url = os.getenv("SUPABASE_URL", "")
        key = os.getenv("SUPABASE_SERVICE_KEY", "")
        if not url or not key:
            logger.info("Cost tracking: Supabase credentials not set — disabled")
            return None

        try:
            from supabase import create_client
            _supabase_client = create_client(url, key)
            logger.info("Cost tracking: Supabase client initialized")
            return _supabase_client
        except Exception as e:
            logger.warning("Cost tracking: Failed to create Supabase client: %s", e)
            return None


# ---------------------------------------------------------------------------
# Event buffer with periodic flush
# ---------------------------------------------------------------------------

_buffer: list[dict[str, Any]] = []
_buffer_lock = threading.Lock()
_FLUSH_THRESHOLD = 10       # Flush after this many events
_FLUSH_INTERVAL = 30.0      # Flush every N seconds regardless
_last_flush_time: float = time.monotonic()


def _flush_buffer() -> None:
    """Flush accumulated cost events to Supabase. Best-effort, never raises."""
    global _last_flush_time

    with _buffer_lock:
        if not _buffer:
            return
        events = _buffer.copy()
        _buffer.clear()
        _last_flush_time = time.monotonic()

    sb = _get_supabase()
    if sb is None:
        logger.debug("Cost tracking: %d events dropped (no Supabase)", len(events))
        return

    try:
        sb.table("cost_events").insert(events).execute()
        logger.debug("Cost tracking: flushed %d events to Supabase", len(events))
    except Exception as e:
        logger.warning(
            "Cost tracking: failed to flush %d events: %s",
            len(events), e,
        )
        # Re-buffer failed events (capped to avoid memory leak)
        with _buffer_lock:
            if len(_buffer) < 200:
                _buffer.extend(events)


def _maybe_flush() -> None:
    """Flush if buffer is full or enough time has passed."""
    should_flush = False
    with _buffer_lock:
        if len(_buffer) >= _FLUSH_THRESHOLD:
            should_flush = True
        elif time.monotonic() - _last_flush_time > _FLUSH_INTERVAL and _buffer:
            should_flush = True

    if should_flush:
        # Flush in a background thread to avoid blocking
        t = threading.Thread(target=_flush_buffer, daemon=True)
        t.start()


# Flush on interpreter shutdown
atexit.register(_flush_buffer)


# ---------------------------------------------------------------------------
# Public API
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
    # Override context (for batch operations like enrichment)
    user_id: Optional[str] = None,
    deck_id: Optional[str] = None,
    word_slug: Optional[str] = None,
    word_id: Optional[str] = None,
) -> None:
    """Log a cost event. Fire-and-forget — never blocks, never raises.

    Context values (user_id, deck_id, word_slug, word_id) are read from
    thread-local state set by set_word_context(). Pass explicit values
    to override (e.g., for batch enrichment calls).

    Args:
        stage: Pipeline stage (concept, images_storyboard, images_rendering,
               song, video, video_infrastructure, bookend, enrichment).
        provider: API provider (openrouter, gemini, kie_ai, fal_ai,
                  runpod, elevenlabs, self_hosted).
        status: Call outcome (success, failed, skipped).
        model: Provider model identifier.
        usage_metrics: Provider-specific usage data (tokens, characters, etc.).
        estimated_cost_usd: Our calculated cost estimate.
        provider_cost_usd: Cost reported by provider, if available.
        duration_ms: Wall-clock time for the API call in milliseconds.
        attempt_number: Retry attempt number (1 = first try).
        error_message: Error description on failure.
        extra_metadata: Additional provider-specific data.
        user_id: Override thread-local user_id.
        deck_id: Override thread-local deck_id.
        word_slug: Override thread-local word_slug.
        word_id: Override thread-local word_id.
    """
    if not _ENABLED:
        return

    try:
        ctx = _get_context()

        resolved_user_id = user_id or ctx["user_id"]
        resolved_deck_id = deck_id or ctx["deck_id"]
        resolved_word_slug = word_slug or ctx["word_slug"]
        resolved_word_id = word_id or ctx["word_id"]

        if not resolved_user_id or not resolved_deck_id or not resolved_word_slug:
            logger.debug(
                "Cost tracking: skipping event (missing context) stage=%s provider=%s",
                stage, provider,
            )
            return

        event: dict[str, Any] = {
            "user_id": resolved_user_id,
            "deck_id": resolved_deck_id,
            "word_slug": resolved_word_slug,
            "stage": stage,
            "provider": provider,
            "status": status,
            "attempt_number": attempt_number,
        }

        if resolved_word_id:
            event["word_id"] = resolved_word_id
        if model:
            event["model"] = model
        if usage_metrics:
            event["usage_metrics"] = usage_metrics
        if estimated_cost_usd is not None:
            event["estimated_cost_usd"] = round(estimated_cost_usd, 6)
        if provider_cost_usd is not None:
            event["provider_cost_usd"] = round(provider_cost_usd, 6)
        if duration_ms is not None:
            event["duration_ms"] = duration_ms
        if error_message:
            event["error_message"] = error_message[:500]
        if extra_metadata:
            event["metadata"] = extra_metadata

        with _buffer_lock:
            _buffer.append(event)

        _maybe_flush()

    except Exception as e:
        # Absolute last resort — never let cost logging crash anything
        logger.debug("Cost tracking: unexpected error: %s", e)


# ---------------------------------------------------------------------------
# Pricing helpers
# ---------------------------------------------------------------------------

# OpenRouter pricing (USD per million tokens) — updated 2026-04
# Source: https://openrouter.ai/models
_OPENROUTER_RATES: dict[str, tuple[float, float]] = {
    # (input_per_M, output_per_M)
    "deepseek/deepseek-v3.2":     (0.26, 0.38),
    "deepseek/deepseek-chat":     (0.26, 0.38),
    "x-ai/grok-4.1-fast":        (0.20, 0.50),
    "x-ai/grok-3-mini":          (0.30, 0.50),
    "google/gemini-2.5-flash":    (0.15, 0.60),
}

# Fallback rate for unknown models
_OPENROUTER_DEFAULT_RATE = (1.0, 3.0)


def estimate_openrouter_cost(model: str, usage: dict[str, Any]) -> float:
    """Estimate cost for an OpenRouter LLM call from usage data.

    Args:
        model: OpenRouter model identifier.
        usage: Dict with prompt_tokens and completion_tokens.

    Returns:
        Estimated cost in USD.
    """
    input_rate, output_rate = _OPENROUTER_RATES.get(model, _OPENROUTER_DEFAULT_RATE)
    prompt_tokens = usage.get("prompt_tokens", 0) or 0
    completion_tokens = usage.get("completion_tokens", 0) or 0

    cost = (prompt_tokens * input_rate / 1_000_000) + (completion_tokens * output_rate / 1_000_000)
    return round(cost, 6)


# Gemini image generation pricing (per image, USD)
# Source: Google AI pricing page
GEMINI_COST_PER_IMAGE: dict[str, float] = {
    "gemini-2.5-flash-image":         0.04,
    "gemini-3-pro-image-preview":     0.08,
}
GEMINI_DEFAULT_COST_PER_IMAGE = 0.04


def estimate_gemini_image_cost(model_id: str) -> float:
    """Estimate cost for a single Gemini image generation."""
    return GEMINI_COST_PER_IMAGE.get(model_id, GEMINI_DEFAULT_COST_PER_IMAGE)


# ElevenLabs TTS pricing
# 100,000 characters for $30 → $0.0003/char.
# One word ≈ 0.5 characters → 200,000 words for $30 → $0.00015/word.
_ELEVENLABS_COST_PER_CHAR = 30.0 / 100_000  # $0.0003


def estimate_elevenlabs_cost(characters: int) -> float:
    """Estimate cost for ElevenLabs TTS from character count."""
    return round(characters * _ELEVENLABS_COST_PER_CHAR, 6)


# kie.ai pricing — confirmed production values
KIE_SUNO_COST_PER_SONG = 0.03     # $0.06 for 2 songs → $0.03 each
KIE_WAN_COST_PER_IMAGE = 0.024    # $0.024 per image call (2.4 cents)
