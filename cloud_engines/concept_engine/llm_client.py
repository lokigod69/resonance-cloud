"""OpenRouter LLM client for the Concept Engine.

Simple, single-method client for chat completions via OpenRouter.
No retries — the orchestrator handles retry logic.
"""

from __future__ import annotations

import logging
import os
import time
from dataclasses import dataclass
from typing import Any

import httpx

from src.cost_logger import estimate_openrouter_cost, log_cost

logger = logging.getLogger(__name__)

OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_TIMEOUT = 30.0


@dataclass
class LLMCallResult:
    """Result of one OpenRouter chat-completion call.

    `content` is the assistant's reply text. The other fields carry the
    provider's usage/cost accounting so the caller can forward them to
    observability (pipeline_events) without re-parsing the response.
    """

    content: str
    tokens_in: int | None
    tokens_out: int | None
    cost_usd: float | None
    latency_ms: int
    request_id: str | None
    reasoning_tokens: int | None
    usage: dict[str, Any]


class OpenRouterClient:
    """Minimal OpenRouter API client.

    Reads API key from the ``OPENROUTER_API_KEY`` environment variable
    unless one is provided directly.
    """

    def __init__(self, api_key: str | None = None):
        self._api_key = api_key or os.environ.get("OPENROUTER_API_KEY", "")
        if not self._api_key:
            raise ValueError(
                "OpenRouter API key is required. Set OPENROUTER_API_KEY "
                "environment variable or pass api_key to OpenRouterClient."
            )
        self._client = httpx.Client(timeout=DEFAULT_TIMEOUT)

    def generate(
        self,
        prompt: str,
        model: str = "deepseek/deepseek-v3.2",
        max_tokens: int | None = None,
    ) -> LLMCallResult:
        """Send a chat completion request and return content + usage.

        Args:
            prompt: The user message to send.
            model: OpenRouter model ID.
            max_tokens: Optional maximum tokens in the response. Leave unset
                for provider/model defaults, especially reasoning-capable models.

        Returns:
            LLMCallResult with content and per-call usage/cost accounting.

        Raises:
            ConnectionError: Network or connection issues.
            RuntimeError: API errors, empty responses, or unexpected formats.
        """
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
        }
        if max_tokens is not None:
            payload["max_tokens"] = max_tokens

        _call_start = time.monotonic()
        try:
            resp = self._client.post(
                OPENROUTER_ENDPOINT,
                json=payload,
                headers={
                    "Authorization": f"Bearer {self._api_key}",
                    "Content-Type": "application/json",
                },
            )
        except httpx.ConnectError as e:
            log_cost(
                stage="concept", provider="openrouter", model=model,
                status="failed", error_message=str(e),
                duration_ms=int((time.monotonic() - _call_start) * 1000),
            )
            raise ConnectionError(f"Failed to connect to OpenRouter: {e}") from e
        except httpx.TimeoutException as e:
            log_cost(
                stage="concept", provider="openrouter", model=model,
                status="failed", error_message=str(e),
                duration_ms=int((time.monotonic() - _call_start) * 1000),
            )
            raise ConnectionError(f"OpenRouter request timed out: {e}") from e

        if resp.status_code != 200:
            raise RuntimeError(
                f"OpenRouter API error (HTTP {resp.status_code}): {resp.text}"
            )

        try:
            data = resp.json()
        except Exception as e:
            raise RuntimeError(
                f"OpenRouter returned non-JSON response (HTTP {resp.status_code}): "
                f"{resp.text[:500]}"
            ) from e

        # Extract content from response
        choices = data.get("choices", [])
        if not choices:
            raise RuntimeError(f"OpenRouter returned no choices: {data}")

        content = choices[0].get("message", {}).get("content", "")
        if not content or not content.strip():
            raise RuntimeError("OpenRouter returned empty content")

        usage = data.get("usage", {})
        reasoning_tokens = _extract_reasoning_tokens(usage)
        _elapsed_ms = int((time.monotonic() - _call_start) * 1000)
        estimated_cost = estimate_openrouter_cost(model, usage)
        log_cost(
            stage="concept",
            provider="openrouter",
            model=model,
            status="success",
            usage_metrics={
                "prompt_tokens": usage.get("prompt_tokens"),
                "completion_tokens": usage.get("completion_tokens"),
                "reasoning_tokens": reasoning_tokens,
                "total_tokens": usage.get("total_tokens"),
            },
            estimated_cost_usd=estimated_cost,
            duration_ms=_elapsed_ms,
        )

        logger.info("Concept LLM call completed (model=%s, tokens=%s)", model, usage)
        return LLMCallResult(
            content=content.strip(),
            tokens_in=usage.get("prompt_tokens"),
            tokens_out=usage.get("completion_tokens"),
            cost_usd=estimated_cost,
            latency_ms=_elapsed_ms,
            request_id=data.get("id"),
            reasoning_tokens=reasoning_tokens,
            usage=usage,
        )


def _extract_reasoning_tokens(usage: dict[str, Any]) -> int | None:
    """Return reasoning token count across OpenRouter usage shapes."""
    direct = usage.get("reasoning_tokens")
    if direct is not None:
        return direct
    details = usage.get("completion_tokens_details")
    if isinstance(details, dict):
        return details.get("reasoning_tokens")
    return None
