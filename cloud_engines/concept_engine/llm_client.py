"""OpenRouter LLM client for the Concept Engine.

Simple, single-method client for chat completions via OpenRouter.
No retries — the orchestrator handles retry logic.
"""

from __future__ import annotations

import logging
import os

import httpx

logger = logging.getLogger(__name__)

OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_TIMEOUT = 30.0


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
        max_tokens: int = 256,
    ) -> str:
        """Send a chat completion request and return the response content.

        Args:
            prompt: The user message to send.
            model: OpenRouter model ID.
            max_tokens: Maximum tokens in the response.

        Returns:
            The text content of the first choice.

        Raises:
            ConnectionError: Network or connection issues.
            RuntimeError: API errors, empty responses, or unexpected formats.
        """
        payload = {
            "model": model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": max_tokens,
        }

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
            raise ConnectionError(f"Failed to connect to OpenRouter: {e}") from e
        except httpx.TimeoutException as e:
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

        logger.info("LLM call completed (model=%s, tokens=%s)", model, data.get("usage", {}))
        return content.strip()
