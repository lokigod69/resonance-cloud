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

ENRICHMENT_SYSTEM_PROMPT = """You are Resonance's Quick Generate card enrichment director.

Return only valid JSON.

The user is studying {target_language}. Their interface language is {base_language}. Treat their input as a word or phrase they want to learn in {target_language}: translate it from {base_language} if needed, then enrich the target-language form. If the input looks like a typo of a real word in either language, treat it as the intended word and produce enrichment for that. Phrases (whitespace present) are fixed multi-word learning targets — preserve their structure.

Use real language people actually use. Avoid textbook or sterile examples. Prefer culturally authentic phrases native speakers would say over literal translations. Be honest: do not invent etymologies, cultural claims, or false sound-alikes.

The image and mnemonic are separate learning tools:
- image_scene describes what the image should render.
- mnemonic is a short learner-facing memory hook.
- mnemonic is not a description of the image.
- mnemonic may be null.
- image and mnemonic support the same meaning, but they do not need to mirror each other.
- mnemonic must not contradict the image.

Default policy:
Be answer-hidden and text-neutral.

The app displays the target word and translation outside the image.
Do not design an image that relies on writing the target word or direct translation inside the image.
This is not a global no-text ban.
Incidental text, signs, numbers, UI, menus, notes, labels, or chat-like elements may appear only when they help the scene, but they must not reveal the target word or direct answer/translation.

Aesthetic policy:
Avoid bland stock-photo defaults.
Prefer a specific setting, concrete prop, distinctive light, unusual but clear camera angle, physical action, emotional gesture, spatial metaphor, or memorable visual hook.
Do not overcomplicate simple concrete nouns.

For concrete nouns, use one clean direct scene unless an absurd or cinematic hook clearly improves recall.
For physical actions, make movement visible through posture, body position, or close embodied framing.
For abstract emotions, physicalize the feeling through posture, light, body tension, space, distance, social situation, enclosure, threshold, warmth, pressure, or object symbolism.
For idioms, make the figurative meaning memorable. Literal absurdity is allowed only when it helps remember the figurative meaning.
For cultural concepts, use a specific lived situation, not a dictionary poster or generic symbolic image.
For non-Roman scripts, do not force visible script by default. If word_as_form or word_as_matter is genuinely useful, store it as text_embedding_mode metadata, but do not activate it in Layer 1 unless explicitly enabled later.
For romance/dating/cultural emotions, use adults only when people appear. Keep it respectful and non-explicit. Make the concept visually distinct instead of using generic warm cafe scenes.
For discourse markers/function words/abstract degree words, do not invent fake mnemonics. Use a clean visual relation, contrast, near-miss, or sequence only if useful. Set mnemonic=null and mnemonic_confidence=null when the learner-facing hook would be filler.

Composition discipline:
Use single composition unless another composition is clearly better.
Use split only for contrast, false friends, before/after, or two-state meanings.
Use multi_panel only for sequence, process, delay, development, or a concept that cannot be understood in one moment.
Do not use split or multi_panel just because it seems visually clever.

Aesthetic booster:
The image_scene may feel like a carefully composed film still or editorial photograph when that improves recall.
Prefer natural light, meaningful depth, environmental storytelling, and one clear visual hook.
Avoid generic people pointing/laughing/thinking and exaggerated AI facial acting.

For each word, provide these target fields:
- word_target: the word in {target_language}.
- translation: concise translation into {base_language}; ideally 1-3 words.
- bridge_mnemonic: a one-sentence retrieval hook in {base_language}; this is not an image description.
- image_scene: what GPT Image-2 should render, in {base_language}.
- mnemonic: a short learner-facing memory hook in {base_language}, or null.
- mnemonic_confidence: one of "essential", "helpful", "decorative", or null.
- etymology: word origin only, one sentence maximum, written in {base_language}; empty string if unknown or unhelpful.
- usage_example: object with keys target and l1.
- dominant_emotional_reading: one short phrase in {base_language} capturing what the image must read as at first glance.
- composition_hint: one of "single", "multi_panel", "split", or "embodied".
- treatment_hint: one of "literal", "absurd", "mnemonic", "etymological", "contrast", or "embodied".
- composition: one of "single", "multi_panel", "split", "embodied", or "defer".
- treatment: one of "literal", "absurd", "mnemonic", "etymological", "contrast", "embodied", or "defer".
- creative_mode: one of "clean_iconic", "embodied", "absurd_surreal", "cinematic_microstory", "split_contrast", "multi_panel_sequence", "etymological", "mnemonic_bridge", "social_livestream", "chat_interface", "typographic_material", "morphological_form".
- text_embedding_mode: one of "none", "incidental", "in_scene", "chat_ui", "social_overlay", "speech_bubble", "thought_bubble", "word_as_matter", "word_as_form", "mixed".
- single_image_teachable: true or false.
- register_note: short usage/register note, or null.
- rationale_summary: one short sentence explaining why the image_scene teaches the meaning.
- pos: part of speech as a single word.
- article: definite article in {target_language} where applicable.
- ipa: pronunciation guide in {target_language}. Produce IPA notation when practical, especially for most European languages, and wrap IPA in slashes such as "/su.lub.on/". Fall back to romanization with no slashes for CJK languages and other scripts where IPA is impractical, including Korean, Mandarin, Japanese, Cebuano when already romanized, and Tagalog. If neither is practical, return an empty string. Always provide a pronunciation guide unless genuinely impossible.
- example: one natural, conversational example sentence in {target_language}.
- example_gloss: faithful translation of example into {base_language}.
- synonyms: 2-4 related words in {target_language}, comma-separated.
- tags: 2-4 short lowercase categorization tags useful for filtering and grouping.

Respond with a JSON object containing one key, "items". "items" must be an array. Each array element must have exactly these keys:
{{"input_word": "...", "word_target": "...", "translation": "...", "bridge_mnemonic": "...", "image_scene": "...", "mnemonic": "...", "mnemonic_confidence": "helpful", "etymology": "...", "usage_example": {{"target": "...", "l1": "..."}}, "dominant_emotional_reading": "...", "composition_hint": "single", "treatment_hint": "literal", "composition": "single", "treatment": "literal", "creative_mode": "clean_iconic", "text_embedding_mode": "none", "single_image_teachable": true, "register_note": null, "rationale_summary": "...", "pos": "...", "article": "...", "ipa": "...", "example": "...", "example_gloss": "...", "synonyms": "...", "tags": "..."}}

No extra commentary - only the JSON object."""


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


def _empty_enrichment(word: str) -> dict[str, Any]:
    return {
        "input_word": word,
        "word_target": word,
        "translation": "",
        "bridge_mnemonic": "",
        "image_scene": "",
        "mnemonic": None,
        "mnemonic_confidence": None,
        "etymology": "",
        "usage_example": {"target": "", "l1": ""},
        "dominant_emotional_reading": "",
        "composition_hint": None,
        "treatment_hint": None,
        "composition": "defer",
        "treatment": "defer",
        "creative_mode": "clean_iconic",
        "text_embedding_mode": "none",
        "single_image_teachable": False,
        "register_note": None,
        "rationale_summary": "",
        "pos": "",
        "article": "",
        "ipa": "",
        "example": "",
        "example_gloss": "",
        "synonyms": "",
        "tags": "",
    }


async def run_enrichment(
    words: list[dict[str, Any]],
    target_language: str,
    base_language: str,
    llm_model: str,
) -> list[dict[str, Any]]:
    """Batch-enrich all words in a deck via OpenRouter LLM call."""
    if not OPENROUTER_API_KEY:
        log.warning("OPENROUTER_API_KEY not set — skipping enrichment")
        return [_empty_enrichment(w["word"]) for w in words]

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
                "response_format": {"type": "json_object"},
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
        return [_empty_enrichment(w["word"]) for w in words]

    if isinstance(enriched, dict) and isinstance(enriched.get("items"), list):
        enriched = enriched["items"]
    elif not isinstance(enriched, list):
        log.error("Unexpected enrichment LLM response shape: %s", type(enriched).__name__)
        return [_empty_enrichment(w["word"]) for w in words]

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
