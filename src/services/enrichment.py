"""LLM-based word enrichment via OpenRouter."""

from __future__ import annotations

import json
import logging
import os
import time
from typing import Any

import httpx

from src.cost_logger import estimate_openrouter_cost, log_cost
from src.slugify import language_to_code

log = logging.getLogger(__name__)

OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY", "")

ENRICHMENT_SYSTEM_PROMPT = """You are a language learning assistant. Given a list of vocabulary words,
produce enrichment data for each word. The user is learning {target_language} and speaks {base_language}.

For each word, provide:
- word_target: the word in {target_language} (correct it if the user typed it in {base_language}; preserve target-language orthography — e.g., capitalize German nouns, keep Romance-language nouns lowercase unless they are proper nouns)
- translation: translation into {base_language} — the bare translated word or phrase only, with no leading articles, no part-of-speech markers, and no quotation marks
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


# Target-language articles used to strip accidental article leakage from the
# translation field. Extends concept_engine.article.KNOWN_ARTICLES with
# indefinite articles and Romance contractions (l', un', d'). Kept local to
# avoid coupling the orchestrator service layer to the concept engine.
# All tokens lowercase; matching is case-insensitive.
_TARGET_LANGUAGE_ARTICLES: dict[str, set[str]] = {
    "de": {"der", "die", "das", "den", "dem", "des",
           "ein", "eine", "einen", "einem", "einer", "eines"},
    "fr": {"le", "la", "les", "un", "une", "des",
           "l'", "d'"},
    "it": {"il", "lo", "la", "i", "gli", "le",
           "un", "uno", "una", "l'", "un'"},
    "es": {"el", "la", "los", "las", "un", "una", "unos", "unas"},
    "pt": {"o", "a", "os", "as", "um", "uma", "uns", "umas"},
    "nl": {"de", "het", "een"},
    "en": {"a", "an", "the"},
}


# Tokens that must NEVER be stripped from a translation whose base language
# matches the key, regardless of the target-language article set. This defeats
# homograph collisions where a target-language article spells identically to a
# base-language content word (e.g. Italian `i` vs. English pronoun "I",
# German `die` vs. English verb "die", Portuguese `a` vs. English article "a").
# False negatives here are cheap; false positives would corrupt translations.
# All tokens lowercase; matching is case-insensitive.
_BASE_LANGUAGE_PROTECTED_TOKENS: dict[str, set[str]] = {
    "en": {"a", "an", "the", "i", "die", "as", "den", "o", "no",
           "be", "to", "in", "on", "at", "of", "is", "it", "or",
           "so", "we", "he", "un"},
    "de": {"die", "der", "das", "den", "dem", "des",
           "ein", "eine", "einen", "einem", "einer", "eines",
           "ich", "du", "er", "sie", "es", "wir", "ihr"},
    "fr": {"le", "la", "les", "un", "une", "des", "l'",
           "je", "tu", "il", "elle", "on", "nous", "vous", "ils", "elles",
           "a", "as", "de", "d'"},
    "it": {"il", "lo", "la", "i", "gli", "le", "un", "uno", "una", "un'",
           "io", "tu", "lui", "lei", "noi", "voi", "loro",
           "a", "e", "o", "di", "da", "in"},
    "es": {"el", "la", "los", "las", "un", "una", "unos", "unas",
           "yo", "tú", "él", "ella", "nosotros", "vosotros", "ellos", "ellas",
           "a", "de", "en", "o", "y"},
    "pt": {"o", "a", "os", "as", "um", "uma", "uns", "umas",
           "eu", "tu", "ele", "ela", "nós", "vós", "eles", "elas",
           "de", "em", "e", "ou"},
    "nl": {"de", "het", "een",
           "ik", "jij", "hij", "zij", "wij", "jullie"},
}


def _strip_target_article(
    translation: Any,
    target_lang_code: str,
    base_lang_code: str,
) -> Any:
    """Strip a leading target-language article from a translation string.

    Strips only when the leading token is in the *target*-language article
    set AND not in the *base*-language protected-token set. The protected
    set blocks homograph collisions where an article in the target language
    spells like a content word in the base language (English "I" collides
    with Italian `i`; English "die" collides with German `die`; etc.).

    Handles two shapes:
      - Space-separated: "der parrot" -> "parrot"
      - Apostrophe contraction (Romance): "l'amour" -> "amour"

    Never returns an empty string for a non-empty input — if stripping would
    produce an empty or whitespace-only remainder, the original is returned.
    """
    if not isinstance(translation, str) or not translation:
        return translation
    articles = _TARGET_LANGUAGE_ARTICLES.get(target_lang_code.lower(), set())
    if not articles:
        return translation
    protected = _BASE_LANGUAGE_PROTECTED_TOKENS.get(base_lang_code.lower(), set())

    s = translation.lstrip()
    if not s:
        return translation
    lower = s.lower()

    # Apostrophe-contraction articles must be tried first — they bind directly
    # to the next token with no whitespace.
    for art in articles:
        if not art.endswith("'"):
            continue
        if not lower.startswith(art) or len(s) <= len(art):
            continue
        if art in protected:
            continue
        remainder = s[len(art):].lstrip()
        if not remainder:
            return translation
        return remainder

    head, sep, rest = s.partition(" ")
    if not sep:
        return translation
    head_lower = head.lower()
    if head_lower not in articles:
        return translation
    if head_lower in protected:
        return translation
    remainder = rest.lstrip()
    if not remainder:
        return translation
    return remainder


def _capitalize_german_noun(word_target: Any, target_lang_code: str, pos: Any) -> Any:
    """Force first-character uppercase for German nouns.

    German orthography capitalizes all nouns. The LLM occasionally returns
    lowercase forms (e.g. "papagei"); this restores the expected casing while
    leaving non-noun parts of speech and non-German languages untouched.
    """
    if not isinstance(word_target, str) or not word_target:
        return word_target
    if target_lang_code.lower() != "de":
        return word_target
    if not isinstance(pos, str) or pos.strip().lower() != "noun":
        return word_target
    if word_target[0].isupper():
        return word_target
    return word_target[0].upper() + word_target[1:]


async def run_enrichment(
    words: list[dict[str, Any]],
    target_language: str,
    base_language: str,
    llm_model: str = "deepseek/deepseek-v4-flash",
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
        try:
            resp.raise_for_status()
        except httpx.HTTPStatusError:
            log.error(
                "OpenRouter enrichment request failed: status=%s body=%s",
                resp.status_code,
                resp.text,
            )
            raise
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

    # Defensive clean-up: the prompt already instructs the model to emit bare
    # translations and correct orthography, but models occasionally leak the
    # source-language article into `translation` (e.g. "der parrot") or
    # lowercase German nouns. Strip and normalize deterministically. The
    # base-language code gates the strip against homograph collisions (e.g.,
    # Italian `i` vs. English pronoun "I") — see _strip_target_article.
    target_lang_code = language_to_code(target_language) if target_language else ""
    base_lang_code = language_to_code(base_language) if base_language else ""
    if isinstance(enriched, list):
        for item in enriched:
            if not isinstance(item, dict):
                continue
            item["translation"] = _strip_target_article(
                item.get("translation", ""), target_lang_code, base_lang_code,
            )
            item["word_target"] = _capitalize_german_noun(
                item.get("word_target", ""), target_lang_code, item.get("pos", ""),
            )

    # Build lookup by input_word for matching back to word records
    return enriched
