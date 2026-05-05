"""Direct final-prompt writer for Layer 2 card experiments."""

from __future__ import annotations

import hashlib
import logging
import os
import re
from dataclasses import dataclass
from typing import Any, Mapping

import httpx

from src.cost_logger import estimate_openrouter_cost, log_cost

from . import config
from .card_models import CardImageContent


logger = logging.getLogger(__name__)

DIRECT_PROMPT_TEMPLATE = "direct_prompt_v1"
STRUCTURED_PLAN_TEMPLATE = "structured_plan_v1"
DIRECT_PROMPT_WRITER_MODEL = os.environ.get(
    "LAYER2_DIRECT_PROMPT_MODEL",
    "deepseek/deepseek-v4-flash",
)
DIRECT_PROMPT_MAX_TOKENS = 700
DIRECT_PROMPT_PREFERRED_RANGE = "900-1400 characters"
DIRECT_PROMPT_HARD_CAP = 2000


@dataclass(frozen=True)
class DirectPromptResult:
    prompt: str
    model: str
    raw_prompt: str
    usage: dict[str, Any] | None = None
    request_id: str | None = None


def is_direct_prompt_template(card_layer2: Mapping[str, Any] | None) -> bool:
    if not isinstance(card_layer2, Mapping):
        return False
    return _clean(card_layer2.get("backend_template")) == DIRECT_PROMPT_TEMPLATE


def backend_template(card_layer2: Mapping[str, Any] | None) -> str:
    if not isinstance(card_layer2, Mapping):
        return STRUCTURED_PLAN_TEMPLATE
    value = _clean(card_layer2.get("backend_template"))
    if value == DIRECT_PROMPT_TEMPLATE:
        return DIRECT_PROMPT_TEMPLATE
    return STRUCTURED_PLAN_TEMPLATE


def write_layer2_direct_prompt(
    *,
    content: CardImageContent,
    layer2: Mapping[str, Any],
    art_style: str,
    allow_target_word: bool,
) -> DirectPromptResult:
    """Call OpenRouter to write a final GPT Image-2 provider prompt."""

    api_key = config.OPENROUTER_API_KEY
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY missing for Layer 2 direct prompt writer")

    system_prompt = build_direct_prompt_system_prompt()
    user_prompt = build_direct_prompt_user_prompt(
        content=content,
        layer2=layer2,
        art_style=art_style,
        allow_target_word=allow_target_word,
    )
    raw_prompt, usage, request_id = _call_openrouter_direct_prompt(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=DIRECT_PROMPT_WRITER_MODEL,
        api_key=api_key,
    )
    prompt = sanitize_direct_prompt(
        raw_prompt,
        word=content.word,
        translation=content.translation,
        art_style=art_style,
        allow_target_word=allow_target_word,
    )
    return DirectPromptResult(
        prompt=prompt,
        model=DIRECT_PROMPT_WRITER_MODEL,
        raw_prompt=raw_prompt,
        usage=usage,
        request_id=request_id,
    )


def build_direct_prompt_system_prompt() -> str:
    return (
        "You are writing the final image prompt for GPT Image-2. "
        "Create one visually precise prompt for a language-learning memory card. "
        "The image must make the word memorable through the selected strategy and presentation form. "
        "Write the final prompt only. No JSON. No analysis. No labels.\n\n"
        "Meaning Strategy definitions:\n"
        "- Clear Meaning: direct meaning.\n"
        "- Exaggerated Meaning: intensified but still clear.\n"
        "- Absurd Hook: strange, memorable, understandable.\n"
        "- Mnemonic Hook: best available memory bridge; phonetic, wordplay, morpheme, etymology, semantic, or fallback. Do not invent fake sound logic.\n\n"
        "Presentation Form definitions:\n"
        "- Single Scene: one visual moment.\n"
        "- Mini Story: 2-3 visible beats.\n"
        "- Split Panel: two contrasted states.\n"
        "- Word as Design: target word is the main visual object.\n\n"
        "Art Style: Use the selected style strongly and early. Do not contradict it. If the style is anime, do not write photorealistic. If the style is Rick and Morty, South Park, Pixar, pixel art, or pen-and-ink, make the entire prompt match that style.\n\n"
        "Answer policy: If presentation_form=word_object_design, the target word may be visible and central. Otherwise, do not render the target word as readable text. Never render the direct translation/answer unless explicitly allowed. Avoid labels, captions, flashcard text, or explanatory text unless the chosen form requires visible text."
    )


def build_direct_prompt_user_prompt(
    *,
    content: CardImageContent,
    layer2: Mapping[str, Any],
    art_style: str,
    allow_target_word: bool,
) -> str:
    presentation_form = _clean(layer2.get("presentation_form")) or "single_scene"
    answer_policy = (
        "Target word may appear visibly because this is word_object_design."
        if allow_target_word
        else "Target word must not appear as readable text."
    )
    spelling_rule = (
        f"\nSpelling rule: If the target word appears, spell it exactly: {_clean(content.word).upper()}."
        if presentation_form == "word_object_design"
        else ""
    )
    return (
        f"Target word: {content.word}\n"
        f"Meaning / direct translation: {content.translation}\n"
        f"Target language: {content.language}\n"
        f"Base language: {content.base_language or 'unknown'}\n"
        f"Part of speech: {content.pos or 'unknown'}\n"
        f"Etymology: {content.etymology or 'none'}\n"
        f"Existing mnemonic: {content.mnemonic or 'none'}\n"
        f"Bridge mnemonic: {content.bridge_mnemonic or 'none'}\n"
        f"Existing image scene: {content.image_scene or 'none'}\n"
        f"Meaning strategy: {_clean(layer2.get('meaning_strategy')) or 'clear_meaning'}\n"
        f"Presentation form: {presentation_form}\n"
        f"Art style: {art_style}\n"
        f"Answer policy: {answer_policy} Never render the direct translation/answer.\n"
        f"{spelling_rule}\n"
        f"Preferred prompt length: {DIRECT_PROMPT_PREFERRED_RANGE}. Hard maximum: {DIRECT_PROMPT_HARD_CAP} characters.\n"
        "Write one final provider prompt string only."
    )


def sanitize_direct_prompt(
    prompt: str,
    *,
    word: str,
    translation: str,
    art_style: str,
    allow_target_word: bool,
) -> str:
    text = _strip_wrapping(_clean(prompt))
    if not allow_target_word:
        text = _remove_term(text, word)
    if _clean(translation).lower() != _clean(word).lower():
        text = _remove_term(text, translation)
    text = _remove_photorealistic_contradiction(text, art_style)
    text = _repair_spacing(text)
    policy = (
        "Never write the direct answer/translation inside the image."
        if allow_target_word
        else "Do not write the target word or direct answer/translation inside the image."
    )
    if "direct answer/translation" not in text.lower():
        text = f"{text.rstrip(' .')}. {policy}"
    if len(text) > DIRECT_PROMPT_HARD_CAP:
        text = _trim_to_cap(text, DIRECT_PROMPT_HARD_CAP)
    return text


def direct_prompt_metadata(
    *,
    result: DirectPromptResult,
    prompt: str,
    allow_target_word: bool,
) -> dict[str, Any]:
    return {
        "backend_template": DIRECT_PROMPT_TEMPLATE,
        "direct_prompt_writer_model": result.model,
        "direct_prompt_chars": len(prompt),
        "direct_prompt_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "direct_prompt_preview": prompt[:500],
        "target_word_allowed": allow_target_word,
        "answer_visibility": "target_word_embedded" if allow_target_word else "hidden",
    }


def _call_openrouter_direct_prompt(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str,
    api_key: str,
) -> tuple[str, dict[str, Any], str | None]:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": DIRECT_PROMPT_MAX_TOKENS,
        "temperature": 0.75,
    }
    try:
        with httpx.Client(timeout=config.LLM_TIMEOUT) as client:
            resp = client.post(
                config.OPENROUTER_ENDPOINT,
                json=payload,
                headers={
                    "Authorization": f"Bearer {api_key}",
                    "Content-Type": "application/json",
                },
            )
    except httpx.ConnectError as e:
        raise ConnectionError(f"Failed to connect to OpenRouter: {e}") from e
    except httpx.TimeoutException as e:
        raise ConnectionError(f"OpenRouter request timed out: {e}") from e

    if resp.status_code != 200:
        raise RuntimeError(f"OpenRouter API error (HTTP {resp.status_code}): {resp.text}")

    data = resp.json()
    usage = data.get("usage", {})
    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError(f"OpenRouter returned no choices: {data}")
    content = choices[0].get("message", {}).get("content", "")
    if not content or not content.strip():
        raise RuntimeError("OpenRouter returned empty direct prompt content")

    log_cost(
        stage="images_card_direct_prompt",
        provider="openrouter",
        model=model,
        status="success",
        usage_metrics={
            "prompt_tokens": usage.get("prompt_tokens"),
            "completion_tokens": usage.get("completion_tokens"),
            "total_tokens": usage.get("total_tokens"),
        },
        estimated_cost_usd=estimate_openrouter_cost(model, usage),
    )
    logger.info("Layer 2 direct prompt writer completed (model=%s, tokens=%s)", model, usage)
    return content.strip(), usage, data.get("id")


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _strip_wrapping(text: str) -> str:
    text = text.strip()
    text = re.sub(r"^```(?:text)?\s*", "", text, flags=re.I)
    text = re.sub(r"\s*```$", "", text)
    text = re.sub(r"^(?:output|prompt|final prompt)\s*:\s*", "", text, flags=re.I)
    if (text.startswith('"') and text.endswith('"')) or (text.startswith("'") and text.endswith("'")):
        text = text[1:-1]
    return text.strip()


def _remove_term(text: str, term: str) -> str:
    term = _clean(term)
    if not term:
        return text
    return re.sub(re.escape(term), "", text, flags=re.IGNORECASE)


def _remove_photorealistic_contradiction(text: str, art_style: str) -> str:
    style = _clean(art_style).lower()
    if style in {"realistic", "photorealistic", "vintage_film"}:
        return text
    return re.sub(r"\bphotorealistic\b\s*", "", text, flags=re.IGNORECASE)


def _repair_spacing(text: str) -> str:
    text = re.sub(r"\s+([.;,])", r"\1", text)
    text = re.sub(r"\(\s*\)", "", text)
    return _clean(text).strip(" ,;")


def _trim_to_cap(text: str, cap: int) -> str:
    clipped = text[:cap].rstrip()
    sentence_break = max(clipped.rfind(". "), clipped.rfind("; "))
    if sentence_break > cap * 0.65:
        clipped = clipped[: sentence_break + 1]
    else:
        clipped = clipped.rsplit(" ", 1)[0].rstrip(" ,;:.") + "."
    return clipped
