"""LLM-based word enrichment via OpenRouter."""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import httpx

from src.cost_logger import estimate_openrouter_cost, log_cost

log = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

ENRICHMENT_SYSTEM_PROMPT = """You are a language learning assistant. Given a list of vocabulary words,
produce enrichment data for each word. The user is learning {target_language} and speaks {base_language}.

For each word, provide:
- word_target: the word in {target_language} (correct it if the user typed it in {base_language})
- translation: translation into {base_language}
- mnemonic: a memorable connection between the word and its meaning (1–2 sentences), written in {base_language}
- etymology: word origin and root connections (1 sentence), written in {base_language}
- pos: part of speech (noun, verb, adjective, adverb, etc.)
- article: grammatical article if applicable (e.g., "der", "die", "das" for German; "le", "la" for French). null if the language has no articles or it doesn't apply.

Handle both directions: if the user typed a {base_language} word, figure out the {target_language} equivalent.

If the input contains multiple words forming a phrase or sentence (e.g., "I love hot dogs",
"good morning", "thank you"), treat the ENTIRE input as the learning target. Do NOT extract
individual words from it. Set word_target to the full phrase translated into {target_language}.
Translate the complete phrase, not individual words.

Respond with a JSON array. Each element must have exactly these keys:
{{"input_word": "...", "word_target": "...", "translation": "...", "mnemonic": "...", "etymology": "...", "pos": "...", "article": "..."}}

No extra commentary — only the JSON array."""


async def run_enrichment(
    words: list[dict[str, Any]],
    target_language: str,
    base_language: str,
    llm_model: str = "deepseek/deepseek-v3.2",
) -> list[dict[str, Any]]:
    """Batch-enrich all words in a deck via OpenRouter LLM call."""
    if not OPENROUTER_API_KEY:
        log.warning("OPENROUTER_API_KEY not set — skipping enrichment")
        return [{"input_word": w["word"], "word_target": w["word"],
                 "translation": "", "mnemonic": "", "etymology": "",
                 "pos": "", "article": None} for w in words]

    word_list = ", ".join(w["word"] for w in words)
    system_prompt = ENRICHMENT_SYSTEM_PROMPT.format(
        target_language=target_language, base_language=base_language
    )
    user_prompt = f"Enrich these {target_language} vocabulary words: {word_list}"

    _call_start = time.monotonic()
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {OPENROUTER_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": llm_model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt},
                ],
            },
        )
        resp.raise_for_status()
        data = resp.json()

    _elapsed_ms = int((time.monotonic() - _call_start) * 1000)
    usage = data.get("usage", {})
    log_cost(
        stage="enrichment",
        provider="openrouter",
        model=llm_model,
        status="success",
        usage_metrics={
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "total_tokens": usage.get("total_tokens"),
            "words_in_batch": len(words),
        },
        estimated_cost_usd=estimate_openrouter_cost(llm_model, usage),
        duration_ms=_elapsed_ms,
    )

    content = data["choices"][0]["message"]["content"]
    # Strip markdown code fences if present
    content = content.strip()
    if content.startswith("```"):
        lines = content.split("\n")
        # Remove first and last fence lines
        lines = lines[1:] if lines[0].startswith("```") else lines
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        content = "\n".join(lines)

    try:
        enriched = json.loads(content)
    except json.JSONDecodeError:
        log.error("Failed to parse enrichment LLM response: %s", content[:500])
        return [{"input_word": w["word"], "word_target": w["word"],
                 "translation": "", "mnemonic": "", "etymology": "",
                 "pos": "", "article": None} for w in words]

    # Build lookup by input_word for matching back to word records
    return enriched
