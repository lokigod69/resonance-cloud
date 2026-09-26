"""Retry fallbacks must switch to a model that exists (grok-4.1-fast left OpenRouter)."""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.services.stage_helpers import (  # noqa: E402
    FALLBACK_LLM_MODEL,
    PRIMARY_LLM_MODEL,
    get_fallback_overrides,
)


def test_first_attempt_keeps_settings():
    assert get_fallback_overrides("concept", 0, {"llm_model": PRIMARY_LLM_MODEL}) == {}


def test_concept_retry_switches_provider_and_back():
    assert get_fallback_overrides("concept", 1, {"llm_model": PRIMARY_LLM_MODEL}) == {"llm_model": FALLBACK_LLM_MODEL}
    assert get_fallback_overrides("concept", 2, {"llm_model": FALLBACK_LLM_MODEL}) == {"llm_model": PRIMARY_LLM_MODEL}


def test_images_retry_uses_literal_direction_and_fallback_model():
    assert get_fallback_overrides("images", 1, {}) == {"creative_direction": "literal", "llm_model": FALLBACK_LLM_MODEL}


def test_no_retired_model_ids():
    assert "grok-4.1-fast" not in (PRIMARY_LLM_MODEL + FALLBACK_LLM_MODEL)
