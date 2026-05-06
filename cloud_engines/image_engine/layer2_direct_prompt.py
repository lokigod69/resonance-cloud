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
DIRECT_PROMPT_V2_TEMPLATE = "direct_prompt_v2"
DIRECT_PROMPT_V3_TEMPLATE = "direct_prompt_v3"
STRUCTURED_PLAN_TEMPLATE = "structured_plan_v1"
DIRECT_PROMPT_TEMPLATES = frozenset({
    DIRECT_PROMPT_TEMPLATE,
    DIRECT_PROMPT_V2_TEMPLATE,
    DIRECT_PROMPT_V3_TEMPLATE,
})
BACKEND_TEMPLATES = frozenset({STRUCTURED_PLAN_TEMPLATE, *DIRECT_PROMPT_TEMPLATES})
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
    return _clean(card_layer2.get("backend_template")) in DIRECT_PROMPT_TEMPLATES


def backend_template(card_layer2: Mapping[str, Any] | None) -> str:
    if not isinstance(card_layer2, Mapping):
        return STRUCTURED_PLAN_TEMPLATE
    value = _clean(card_layer2.get("backend_template"))
    if value in BACKEND_TEMPLATES:
        return value
    return STRUCTURED_PLAN_TEMPLATE


def write_layer2_direct_prompt(
    *,
    content: CardImageContent,
    layer2: Mapping[str, Any],
    art_style: str,
    allow_target_word: bool,
    allow_translation: bool = False,
    template: str | None = None,
) -> DirectPromptResult:
    """Call OpenRouter to write a final GPT Image-2 provider prompt."""

    api_key = config.OPENROUTER_API_KEY
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY missing for Layer 2 direct prompt writer")

    selected_template = template if template in DIRECT_PROMPT_TEMPLATES else backend_template(layer2)
    system_prompt = build_direct_prompt_system_prompt(selected_template)
    user_prompt = build_direct_prompt_user_prompt(
        content=content,
        layer2=layer2,
        art_style=art_style,
        allow_target_word=allow_target_word,
        allow_translation=allow_translation,
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
        allow_translation=allow_translation,
    )
    return DirectPromptResult(
        prompt=prompt,
        model=DIRECT_PROMPT_WRITER_MODEL,
        raw_prompt=raw_prompt,
        usage=usage,
        request_id=request_id,
    )


def build_direct_prompt_system_prompt(template: str = DIRECT_PROMPT_TEMPLATE) -> str:
    if template == DIRECT_PROMPT_V2_TEMPLATE:
        return build_direct_prompt_v2_system_prompt()
    if template == DIRECT_PROMPT_V3_TEMPLATE:
        return build_direct_prompt_v3_system_prompt()
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


def build_direct_prompt_v2_system_prompt() -> str:
    return (
        "You are writing the final image prompt for GPT Image-2. "
        "Create one compact, provider-friendly prompt for a Premium language-learning memory card. "
        "Preserve a strong visual concept, but keep the composition readable: one dominant memory idea, "
        "clean focal hierarchy, no overloaded piles of symbols. Write the final prompt only. No JSON. No analysis.\n\n"
        "Global creative guidance:\n"
        "- Reduce repetitive golden-hour / orange sunset defaults; choose lighting that fits the word and selected style.\n"
        "- Respect the selected art style strongly and early. If realistic, avoid unwanted illustration/cartoon language.\n"
        "- make the selected meaning strategy visibly distinct and make the selected presentation form visibly distinct.\n"
        "- For violent or taboo words, use symbolic-safe visual metaphors such as aftermath, shadow, broken objects, extinguished light, or a toppled chess king.\n\n"
        "Meaning Strategy guidance:\n"
        "- Clear Meaning: immediately recognizable core meaning, minimal surrealism, strong clean scene.\n"
        "- Exaggerated Meaning: intensify scale, emotion, action, consequence, or contrast while keeping the meaning obvious.\n"
        "- Absurd Hook: strange, memorable, elegant, and understandable; absurdity serves memory, never randomness.\n"
        "- Mnemonic Hook: use the best available memory bridge: phonetic, wordplay, morpheme, etymology, semantic metaphor, or clear visual association. Never force fake wordplay; fall back to a strong metaphor or clear scene.\n\n"
        "Presentation Form guidance:\n"
        "- Single Scene: one coherent visual moment with one dominant memory idea.\n"
        "- Mini Story: one image containing 2-3 readable beats, such as cause/effect, before/during/after, attempt/result, or transformation. Avoid chaotic comic strips unless the style supports it.\n"
        "- Split Panel: use only when contrast helps the word, with tasteful separation for before/after, despite/result, less/more, obstacle/continuation, or cause/effect.\n"
        "- Word as Design: target word may appear visibly and should be the main visual object. Choose naturally among meaningful material lettering, letters becoming an object, place, architecture, or symbol, natural in-world text, symbolic letter fragments, or language/script-aware form; do not always use the same approach.\n\n"
        "- Infographic: design a premium educational infographic card with a central visual anchor and a few compact callouts. Choose useful word-specific angles such as meaning, translation, grammar, usage, origin, cultural nuance, memory cue, example phrase, or surprising fact. Use short readable labels, not paragraphs; keep it elegant, spacious, image-first, and memorable.\n\n"
        "Text policy: Visible target word is allowed and expected in Word as Design. "
        "In Infographic, the target word and translation may appear as visible study-card text, along with short explanatory labels. "
        "In other forms, do not casually place the target word as a label unless it clearly helps the scene. "
        "Incidental environmental text is allowed when natural, such as signs, calendar, phone screen, book title, interface, warning label. "
        "If any readable target word appears, spell it exactly. Never render the direct translation/answer unless a future explicit teaching/infographic mode asks for it."
    )


def build_direct_prompt_v3_system_prompt() -> str:
    return (
        build_direct_prompt_v2_system_prompt()
        + "\n\n"
        "LLM V3 · Visual Craft layer: keep all LLM V2 learning-mode behavior, then add a visual-director layer. "
        "The final provider prompt should choose 2-4 visual craft decisions that fit the specific word, strategy, "
        "presentation form, and art style. Do not dump the whole checklist into the final image prompt.\n\n"
        "Visual craft decision space:\n"
        "- Camera distance: macro, close-up, medium shot, wide shot.\n"
        "- Lens and depth: shallow depth of field, telephoto compression, wide-angle scale, natural perspective.\n"
        "- Focus design: what is sharp, what is blurred, what is hidden, cropped, or partially obscured.\n"
        "- Composition: negative space, leading lines, symmetry/asymmetry, foreground/background layers, rule of thirds, central iconic framing.\n"
        "- Lighting: soft window light, overcast daylight, practical indoor light, low-key or high-key lighting, harsh flash, moonlight, clinical light, natural documentary light.\n"
        "- Motion and texture: stillness, motion blur, drifting smoke, falling particles, speed streaks, dust, paper, skin, metal, glass, fabric, stone, water, grain.\n"
        "- Mood: quiet, clinical, playful, ominous, reverent, absurd, intimate, documentary.\n\n"
        "Visual craft constraints:\n"
        "- Avoid defaulting to orange sunset, golden-hour glow, generic cinematic haze, or stock-photo polish unless it truly fits.\n"
        "- Cinematic means intentional composition and visual storytelling, not merely warm light.\n"
        "- Realistic should feel like a plausible photograph, not a glossy AI advertisement.\n"
        "- Clear: clean, legible, direct, visually intentional, often realistic or documentary; avoid unnecessary metaphor.\n"
        "- Memorable: support the memory hook through composition, focus, and visual hierarchy; do not force fake wordplay.\n"
        "- Weird: surreal or absurd but readable; use composition and atmosphere instead of random clutter.\n"
        "- Word as Design: spell visible target word exactly; choose material, form, environmental typography, symbolic letter scene, or script-aware design as appropriate.\n"
        "- Infographic: visual craft means layout design, hierarchy, spacing, icons, central anchor, readable labels, and uncluttered information design."
    )


def build_direct_prompt_user_prompt(
    *,
    content: CardImageContent,
    layer2: Mapping[str, Any],
    art_style: str,
    allow_target_word: bool,
    allow_translation: bool = False,
) -> str:
    presentation_form = _clean(layer2.get("presentation_form")) or "single_scene"
    selected_template = backend_template(layer2)
    if presentation_form == "infographic_card":
        answer_policy = (
            "the target word and translation may appear as text. "
            "Use short readable labels and compact callouts, not paragraphs."
        )
    elif selected_template in {DIRECT_PROMPT_V2_TEMPLATE, DIRECT_PROMPT_V3_TEMPLATE} and not allow_target_word:
        answer_policy = (
            "Do not casually place the target word as a label unless it clearly helps the scene. "
            "Incidental environmental text is allowed when natural."
        )
    else:
        answer_policy = (
            "Target word may appear visibly because this is word_object_design."
            if allow_target_word
            else "Target word must not appear as readable text."
        )
    if presentation_form == "infographic_card":
        spelling_rule = (
            f"\nInfographic guidance: Design a premium educational infographic card for the target word. "
            "Use a central visual anchor and a few compact callouts. Choose the most useful and interesting "
            "information for this specific word: meaning, translation, grammar, usage, word origin, cultural "
            "nuance, memory cue, example phrase, or surprising fact. Use short readable labels, not paragraphs. "
            "Make it elegant, spacious, and memorable. The target word and translation may appear as text. "
            "Spell all visible text carefully."
            f"\nSpelling rule: Spell visible target word exactly: {_clean(content.word)}. "
            f"Spell visible translation exactly: {_clean(content.translation)}."
        )
    elif presentation_form == "word_object_design":
        spelling_rule = (
            f"\nSpelling rule: If the target word appears, spell it exactly: {_clean(content.word).upper()}."
        )
    else:
        spelling_rule = ""
    backend_line = (
        f"Backend template: {selected_template}\n"
        if selected_template in {DIRECT_PROMPT_V2_TEMPLATE, DIRECT_PROMPT_V3_TEMPLATE}
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
        f"{backend_line}"
        f"Art style: {art_style}\n"
        f"Answer policy: {answer_policy}"
        f"{'' if allow_translation else ' Never render the direct translation/answer.'}\n"
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
    allow_translation: bool = False,
) -> str:
    text = _strip_wrapping(_clean(prompt))
    if not allow_target_word:
        text = _remove_term(text, word)
    if not allow_translation and _clean(translation).lower() != _clean(word).lower():
        text = _remove_term(text, translation)
    text = _remove_photorealistic_contradiction(text, art_style)
    text = _repair_spacing(text)
    if allow_translation:
        policy = "Use only short, carefully spelled visible study-card text."
    elif allow_target_word:
        policy = "Never write the direct answer/translation inside the image."
    else:
        policy = "Do not write the target word or direct answer/translation inside the image."
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
    allow_translation: bool = False,
    template: str = DIRECT_PROMPT_TEMPLATE,
) -> dict[str, Any]:
    return {
        "backend_template": template if template in DIRECT_PROMPT_TEMPLATES else DIRECT_PROMPT_TEMPLATE,
        "direct_prompt_writer_model": result.model,
        "direct_prompt_chars": len(prompt),
        "direct_prompt_prompt_sha256": hashlib.sha256(prompt.encode("utf-8")).hexdigest(),
        "direct_prompt_preview": prompt[:500],
        "target_word_allowed": allow_target_word,
        "translation_allowed": allow_translation,
        "answer_visibility": "teaching_text_allowed"
        if allow_translation
        else "target_word_embedded"
        if allow_target_word
        else "hidden",
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
