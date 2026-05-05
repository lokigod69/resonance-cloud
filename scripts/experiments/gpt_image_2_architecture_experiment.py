from __future__ import annotations

import argparse
import csv
import hashlib
import json
import os
import re
import shutil
import sys
import time
import unicodedata
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any

import httpx


REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from cloud_engines.image_engine.gpt_image_2_provider import (  # noqa: E402
    render_scene_gpt_image_2,
)

try:  # Optional diagnostic baseline only.
    from cloud_engines.image_engine.gpt_card_prompts import (  # noqa: E402
        build_gpt_image_2_prompt,
    )
except Exception:  # pragma: no cover - B0 should degrade without breaking A/B/C.
    build_gpt_image_2_prompt = None  # type: ignore[assignment]


V6_ARCHITECTURES = (
    "A3_thin_meaning_only_hidden_answer",
    "D2_unified_short_hidden_answer",
    "D4_unified_cinematic_short_hidden_answer",
)
V5_ARCHITECTURES = (
    "A2_thin_text_neutral",
    "D2_unified_enrichment_short_compiler",
    "D3_unified_enrichment_template_compiler",
)
MAIN_ARCHITECTURES = V6_ARCHITECTURES
CURRENT_BASELINE_ARCHITECTURE = "B0_current_production_baseline"
OPEN_CREATIVE_POLICY = (
    "Use any visual device that makes the word memorable and understandable: "
    "objects, people, posture, environment, symbols, signs, labels, UI, chat "
    "surfaces, social-media overlays, numbers, books, maps, notes, speech "
    "bubbles, thought bubbles, typographic forms, or embedded words. Use text "
    "only when it genuinely improves the card. Do not force text into every "
    "image. The image should still work as a vocabulary-learning card at first "
    "glance. Avoid accidental watermarks, accidental brand logos or trademarked "
    "characters, and irrelevant clutter."
)
PROMPT_LENGTH_BUDGET = 1000
V6_TARGET_PROMPT_BUDGET = 700
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
DEFAULT_LLM_MODEL = "deepseek/deepseek-v3.2"
IMAGE_MODEL_LABEL = "gpt_image_2"
DEFAULT_IMAGE_RESOLUTION = "1K"
DEFAULT_IMAGE_ASPECT_RATIO = "16:9"
DEFAULT_RETRY_BACKOFFS_SECONDS = [60, 180]
PROVIDER_500_CONSECUTIVE_STOP_LIMIT = 5


B_SYSTEM_PROMPT = """You are Resonance's vocabulary-card image prompt writer.

Return only valid JSON. Do not use markdown.

Your job is to write the final GPT Image-2 prompt for one vocabulary-card image.

The image must help a learner remember the meaning of the word.

Write a concise, vivid, imageable prompt. Use specific visible objects, people, place, body posture, action, environment, symbolism, emotional reading, visual contrast, humor, absurdity, or modern UI/social framing when helpful.

Visible text is allowed when it genuinely improves the memory card. Signs, labels, numbers, books, notes, chat UI, social overlays, speech bubbles, thought bubbles, and embedded words are allowed. Do not force text into every image. Use it only when it helps.

Prefer memorable images over safe wallpaper. The scene may be literal, absurd, cinematic, social-media-like, typographic, embodied, split-screen, or multi-panel if that best teaches the word.

For concrete nouns, do not over-engineer unless an absurd or funny hook clearly improves recall.
For physical actions, make the action visible through body posture or first-person POV.
For cognates or obvious technical words, do not invent fake mnemonics. displayed_mnemonic may be null.
For abstract emotions, physicalize the feeling through posture, space, objects, light, body tension, distance, enclosure, or threshold.
For idioms, make the figurative meaning memorable. Literal absurdity is allowed if it helps the figurative meaning.
For romance/dating/slang concepts, use adults only, respectful, non-explicit framing, and visually differentiate the concept.
For discourse markers and grammar/function words, do not invent fake mnemonics. Use a restrained visual relation, contrast, or sequence if useful; otherwise set displayed_mnemonic to null.

Return this JSON shape:

{
  "final_provider_prompt": "string",
  "displayed_mnemonic": "string or null",
  "card_scene_displayed": "string or null",
  "composition": "single | multi_panel | split | embodied | model_directed",
  "treatment": "literal | absurd | mnemonic | etymological | contrast | embodied | model_directed",
  "creative_mode": "clean_iconic | embodied | absurd_surreal | cinematic_microstory | split_contrast | multi_panel_sequence | etymological | mnemonic_bridge | social_livestream | chat_interface | typographic_material | morphological_form",
  "text_embedding_mode": "none | incidental | in_scene | chat_ui | social_overlay | speech_bubble | thought_bubble | word_as_matter | word_as_form | mixed",
  "mnemonic_confidence": "essential | helpful | decorative | null",
  "rationale_summary": "string"
}
"""


C_SYSTEM_PROMPT = """You are Resonance's vocabulary-card visual teaching director.

Return only valid JSON. Do not use markdown.

Your job is to decide what one GPT Image-2 vocabulary card should depict.

Make the card memorable, teachable, and visually varied. GPT Image-2 can handle complex images, readable text, UI, chat, social overlays, speech bubbles, thought bubbles, typographic objects, and surreal scenes. Use those powers when they genuinely help the word. Do not force them.

Decide:
- what kind of word this is
- whether a mnemonic is useful or should be null
- what the image should depict
- whether text or UI should appear naturally in the image
- which composition, treatment, creative mode, and text embedding mode should be used

Rules:
1. The image must teach the meaning at first glance.
2. The image should be visually memorable, not generic wallpaper.
3. For concrete nouns, direct clear images are fine; absurdity is optional only if it improves recall.
4. For actions, show the body movement or first-person action.
5. For abstract emotions, physicalize the feeling through body, space, light, threshold, distance, pressure, enclosure, warmth, or objects.
6. For idioms, make the figurative meaning memorable; literal absurdity is allowed when useful.
7. For cognates, do not invent fake mnemonics.
8. For romance/dating/slang, use adults only, respectful non-explicit framing, and make each concept visually distinct.
9. For discourse markers/function words, defer when appropriate.
10. If text, UI, chat, signs, labels, bubbles, or overlays help, include them deliberately. If they do not help, leave them out.

Return this JSON shape:

{
  "word": "string",
  "language": "string",
  "translation": "string",
  "part_of_speech": "string",
  "word_category": "concrete | action | cognate | abstract_emotion | idiom | compound | romance_dating | slang | abstract_time | discourse_marker | false_friend | cultural | other",
  "final_image_scene": "string",
  "display_mnemonic": "string or null",
  "mnemonic_confidence": "essential | helpful | decorative | null",
  "composition": "single | multi_panel | split | embodied | defer",
  "treatment": "literal | absurd | mnemonic | etymological | contrast | embodied | defer",
  "creative_mode": "clean_iconic | embodied | absurd_surreal | cinematic_microstory | split_contrast | multi_panel_sequence | etymological | mnemonic_bridge | social_livestream | chat_interface | typographic_material | morphological_form",
  "text_embedding_mode": "none | incidental | in_scene | chat_ui | social_overlay | speech_bubble | thought_bubble | word_as_matter | word_as_form | mixed",
  "dominant_emotional_reading": "string",
  "register_note": "string or null",
  "single_image_teachable": true,
  "rationale_summary": "string"
}
"""


D_SYSTEM_PROMPT = """You are Resonance's Quick Generate card enrichment director.

Return only valid JSON. Do not use markdown.

You create structured content for one vocabulary card in a language-learning app.

The image and mnemonic are separate learning tools:
- image_scene describes what the image should render.
- mnemonic is a short learner-facing memory hook.
- mnemonic is not a description of the image.
- mnemonic may be null.
- image and mnemonic should support the same meaning, but they do not need to mirror each other.
- mnemonic must not contradict the image.

Default policy:
Be text-neutral. Do not globally ban text. Do not globally invite text.

Important answer-hidden policy:
The target word and direct translation will be shown separately in the app. Do not design an image that relies on writing the target word or direct translation inside the image. Incidental text, signs, numbers, UI, menus, notes, labels, or chat-like elements may appear only when they help the scene, but they must not reveal the answer by writing the target word or direct translation.

Aesthetic policy:
Avoid bland stock-photo defaults. Prefer a specific setting, concrete prop, distinctive light, unusual but clear camera angle, physical action, emotional gesture, or memorable visual hook. Do not overcomplicate simple concrete nouns.

For concrete nouns:
Use one clean direct scene unless an absurd or cinematic hook clearly improves recall.

For physical actions:
Make the movement visible through posture, body position, or first-person/close embodied framing.

For abstract emotions:
Physicalize the feeling through posture, light, body tension, space, distance, social situation, enclosure, threshold, warmth, pressure, or object symbolism.

For idioms:
Make the figurative meaning memorable. Literal absurdity is allowed only when it helps remember the figurative meaning.

For false friends:
Prefer contrast or a scene that makes the true target-language meaning impossible to confuse.

For non-Roman scripts:
Do not force visible text by default. If word_as_form or word_as_matter is genuinely useful, choose it in metadata. Otherwise use a normal visual scene.

For romance/dating/cultural emotions:
Use adults only when people appear. Keep it respectful and non-explicit. Make the concept visually distinct instead of using generic warm cafe scenes.

For discourse markers/function words/abstract degree words:
Do not invent fake mnemonics. Use a clean visual relation, contrast, near-miss, or sequence only if useful. Set mnemonic=null and mnemonic_confidence=null when the learner-facing hook would be filler.

Composition discipline:
Use single composition unless another composition is clearly better.
Use split only for contrast, false friends, before/after, or two-state meanings.
Use multi_panel only for sequence, process, delay, development, or a concept that cannot be understood in one moment.
Do not use split or multi_panel just because it seems visually clever.

Aesthetic discipline:
The image should not feel like generic stock photography. Make one concrete visual choice that gives the card memory: light, camera angle, prop, gesture, environment, spatial metaphor, or mild absurdity. Do not overcomplicate simple concrete nouns.

Answer-hidden discipline:
The app already displays the word and translation outside the image. The image must not write the target word or the direct answer/translation. This is not a ban on all incidental text; it is a ban on giving away the answer in the image.

Keep image_scene concrete, renderable, and visual.
Keep mnemonic short: one or two sentences.
Set mnemonic=null and mnemonic_confidence=null when a mnemonic would be filler.

Return this JSON shape:

{
  "word": "string",
  "language": "string",
  "l1_language": "string",
  "translation": "string",
  "part_of_speech": "string",
  "word_category": "concrete | action | cognate | abstract_emotion | idiom | compound | romance_dating | slang | abstract_time | discourse_marker | false_friend | cultural | other",
  "image_scene": "string",
  "mnemonic": "string or null",
  "mnemonic_confidence": "essential | helpful | decorative | null",
  "etymology": "string or null",
  "usage_example": {
    "target": "string",
    "l1": "string"
  },
  "composition": "single | multi_panel | split | embodied | defer",
  "treatment": "literal | absurd | mnemonic | etymological | contrast | embodied | defer",
  "creative_mode": "clean_iconic | embodied | absurd_surreal | cinematic_microstory | split_contrast | multi_panel_sequence | etymological | mnemonic_bridge | social_livestream | chat_interface | typographic_material | morphological_form",
  "text_embedding_mode": "none | incidental | in_scene | chat_ui | social_overlay | speech_bubble | thought_bubble | word_as_matter | word_as_form | mixed",
  "single_image_teachable": true,
  "dominant_emotional_reading": "string",
  "register_note": "string or null",
  "rationale_summary": "string"
}

For this experiment:
Set l1_language="English" unless the word record explicitly provides another L1 language.
Usage examples are saved for product evaluation but are not sent to KIE by default.
"""


D4_SYSTEM_PROMPT = D_SYSTEM_PROMPT + """

The image_scene should feel like a carefully composed film still or editorial photograph when that improves recall. Prefer:
- specific place
- concrete prop
- natural light
- physical gesture
- meaningful camera angle
- foreground/background depth
- environmental storytelling
- one memorable visual hook

Avoid:
- bland stock-photo setup
- generic people pointing or laughing
- exaggerated facial acting
- too many split screens
- too many multi-panel layouts
- poster/infographic design
- explaining the concept with visible labels
"""


@dataclass(frozen=True)
class WordSpec:
    word: str
    language: str
    translation: str
    part_of_speech: str
    category: str


@dataclass
class ArchitectureResult:
    architecture: str
    word: WordSpec
    slug: str
    final_prompt: str
    displayed_mnemonic: str | None
    card_scene_displayed: str | None
    composition: str
    treatment: str
    creative_mode: str
    text_embedding_mode: str
    mnemonic_confidence: str | None
    llm_called: bool
    image_provider_called: bool
    llm_system_prompt_path: str | None
    llm_user_prompt_path: str | None
    llm_raw_output_path: str | None
    visual_plan_json_path: str | None
    raw_prompt_path: str | None
    prompt_before_sanitize_path: str | None
    final_provider_prompt_path: str
    sanitization_applied: bool
    sanitization_notes: list[str]
    fallback_used: bool
    compliance: dict[str, bool]
    provider: dict[str, Any]
    enrichment: dict[str, Any] | None = None


FRESH_12_WORDS = [
    WordSpec("die Taschenlampe", "German", "flashlight", "noun", "concrete noun"),
    WordSpec("sich ducken", "German", "duck down / crouch", "verb phrase", "physical action"),
    WordSpec("das Update", "German", "update", "noun", "cognate / technical"),
    WordSpec("Beklemmung", "German", "tight anxious oppression", "noun", "abstract inner state"),
    WordSpec("Vorfreude", "German", "joyful anticipation", "noun", "abstract time-emotion"),
    WordSpec("der Ohrwurm", "German", "catchy song stuck in your head", "noun", "compound metaphor"),
    WordSpec("den Faden verlieren", "German", "lose the thread of thought", "idiom", "idiom"),
    WordSpec("to save face", "English", "preserve dignity", "idiom", "idiom / social concept"),
    WordSpec("slow burn", "English", "gradually developing attraction", "phrase", "romance / temporal development"),
    WordSpec("ghosting", "English", "suddenly cutting off communication", "noun / gerund", "dating slang"),
    WordSpec("in the meantime", "English", "during the interval", "phrase", "abstract time phrase"),
    WordSpec("nevertheless", "English", "despite that / discourse contrast", "discourse marker", "null mnemonic / discourse"),
]

FRESH_MULTILINGUAL_V5_18_WORDS = [
    WordSpec("der Regenschirm", "German", "umbrella", "noun", "concrete noun"),
    WordSpec("stolpern", "German", "to stumble", "verb", "physical action"),
    WordSpec("peinlich", "German", "embarrassing / awkward", "adjective", "social emotion"),
    WordSpec("Schwein haben", "German", "to be lucky", "idiom", "idiom"),
    WordSpec("to bite the bullet", "English", "to do something difficult bravely", "idiom", "idiom"),
    WordSpec("almost", "English", "nearly, but not quite", "adverb", "abstract degree / function word"),
    WordSpec("la ventana", "Spanish", "window", "noun", "concrete noun"),
    WordSpec("tener mariposas en el estómago", "Spanish", "to have butterflies in your stomach", "idiom", "romance / nervous anticipation idiom"),
    WordSpec("vergüenza", "Spanish", "shame / embarrassment", "noun", "abstract social emotion"),
    WordSpec("la chiave", "Italian", "key", "noun", "concrete noun"),
    WordSpec("prendere in giro", "Italian", "to tease / make fun of", "idiom", "social idiom"),
    WordSpec("la bibliothèque", "French", "library", "noun", "false-friend risk / concrete place"),
    WordSpec("avoir le cafard", "French", "to feel down / depressed", "idiom", "idiom / abstract mood"),
    WordSpec("나무", "Korean", "tree", "noun", "concrete noun / non-Roman script"),
    WordSpec("눈치", "Korean", "social tact / ability to read the room", "noun", "cultural abstract concept"),
    WordSpec("木漏れ日", "Japanese", "sunlight filtering through trees", "noun", "poetic cultural concept"),
    WordSpec("kilig", "Tagalog", "romantic flutter / thrilled butterflies feeling", "noun", "romance / cultural emotion"),
    WordSpec("deadpan", "English", "deliberately expressionless humor", "adjective / noun", "social expression / tone"),
]

FRESH_V6_LOCKIN_8_WORDS = [
    WordSpec("die Leiter", "German", "ladder", "noun", "concrete noun"),
    WordSpec("ausrutschen", "German", "to slip", "verb", "physical action"),
    WordSpec("Heimweh", "German", "homesickness", "noun", "abstract emotion / compound"),
    WordSpec("to spill the beans", "English", "to reveal a secret", "idiom", "idiom"),
    WordSpec("ojalá", "Spanish", "hopefully / I wish", "interjection", "wish / discourse-emotion"),
    WordSpec("la sobremesa", "Spanish", "lingering conversation after a meal", "noun", "cultural concept"),
    WordSpec("coup de foudre", "French", "love at first sight", "idiom", "romance idiom"),
    WordSpec("정", "Korean", "deep emotional bond / affection built over time", "noun", "cultural abstract concept / non-Roman script"),
]

WORD_SETS = {
    "fresh_12": FRESH_12_WORDS,
    "fresh_multilingual_v5_18": FRESH_MULTILINGUAL_V5_18_WORDS,
    "fresh_v6_lockin_8": FRESH_V6_LOCKIN_8_WORDS,
}

B_COMPOSITIONS = {"single", "multi_panel", "split", "embodied", "model_directed"}
B_TREATMENTS = {"literal", "absurd", "mnemonic", "etymological", "contrast", "embodied", "model_directed"}
CREATIVE_MODES = {
    "clean_iconic",
    "embodied",
    "absurd_surreal",
    "cinematic_microstory",
    "split_contrast",
    "multi_panel_sequence",
    "etymological",
    "mnemonic_bridge",
    "social_livestream",
    "chat_interface",
    "typographic_material",
    "morphological_form",
}
TEXT_EMBEDDING_MODES = {
    "none",
    "incidental",
    "in_scene",
    "chat_ui",
    "social_overlay",
    "speech_bubble",
    "thought_bubble",
    "word_as_matter",
    "word_as_form",
    "mixed",
}
C_WORD_CATEGORIES = {
    "concrete",
    "action",
    "cognate",
    "abstract_emotion",
    "idiom",
    "compound",
    "romance_dating",
    "slang",
    "abstract_time",
    "discourse_marker",
    "other",
}
D_WORD_CATEGORIES = C_WORD_CATEGORIES | {"false_friend", "cultural"}
C_COMPOSITIONS = {"single", "multi_panel", "split", "embodied", "defer"}
C_TREATMENTS = {"literal", "absurd", "mnemonic", "etymological", "contrast", "embodied", "defer"}
D_COMPOSITIONS = C_COMPOSITIONS
D_TREATMENTS = C_TREATMENTS
MNEMONIC_CONFIDENCE = {"essential", "helpful", "decorative", None}
LLM_MAX_ATTEMPTS = 2


def slugify_word(word: str) -> str:
    normalized = unicodedata.normalize("NFKD", word).encode("ascii", "ignore").decode("ascii")
    slug = re.sub(r"[^a-zA-Z0-9]+", "_", normalized.lower()).strip("_")
    if slug:
        return slug
    codepoints = "_".join(f"{ord(char):x}" for char in word)
    return f"u_{codepoints}" if codepoints else "word"


def default_output_root() -> Path:
    return Path("tmp") / "gpt_image_2_architecture_experiment" / datetime.now().strftime("%Y%m%d")


def experiment_id_for(output_root: Path) -> str:
    date_part = output_root.name if re.fullmatch(r"\d{8}", output_root.name) else datetime.now().strftime("%Y%m%d")
    return f"gpt_image_2_architecture_experiment_{date_part}"


def _rel(path: Path, output_root: Path) -> str:
    try:
        return path.relative_to(output_root).as_posix()
    except ValueError:
        return path.as_posix()


def _write_text(path: Path, text: str, overwrite: bool) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists() and not overwrite:
        return
    path.write_text(text, encoding="utf-8")


def _write_json(path: Path, data: Any, overwrite: bool) -> None:
    _write_text(path, json.dumps(data, ensure_ascii=False, indent=2) + "\n", overwrite)


def _sha256_text(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def _one_line(value: str | None) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


ANSWER_HIDDEN_SENTENCE = "Do not write the target word or the direct answer/translation inside the image."


def build_a3_prompt(word: WordSpec, style: str) -> str:
    return (
        f"{style} cinematic 16:9 image. "
        f"Depict this meaning clearly: {word.translation}. "
        "Create one memorable, specific, believable moment that makes the meaning understandable from the image alone. "
        "Prefer natural light, strong composition, concrete action, meaningful body language, distinctive props, environment, "
        "emotion, contrast, humor, or a subtle absurd visual hook when helpful. "
        "Keep it focused, elegant, and teachable rather than like a bland stock photo, poster, infographic, or literal flashcard. "
        f"{ANSWER_HIDDEN_SENTENCE}"
    )


def build_a2_prompt(word: WordSpec, style: str) -> str:
    return (
        f'{style} 16:9 vocabulary-card image for learning the {word.language} '
        f'{word.part_of_speech} "{word.word}" meaning "{word.translation}". '
        "Create one memorable image that makes the meaning clear at a glance. "
        "Use visual composition, objects, posture, environment, action, emotion, "
        "contrast, humor, or symbolism as needed. Make the scene specific, "
        "non-generic, and visually memorable rather than a bland stock-photo pose. "
        "Keep it clean and teachable."
    )


def build_a_prompt(word: WordSpec, style: str) -> str:
    return build_a3_prompt(word, style)


def build_direct_fallback_prompt(word: WordSpec, style: str) -> str:
    return build_a3_prompt(word, style)


def build_llm_user_prompt(word: WordSpec, style: str) -> str:
    payload = {
        "word": word.word,
        "language": word.language,
        "translation": word.translation,
        "part_of_speech": word.part_of_speech,
        "category": word.category,
        "style": style,
        "text_embedding_mode": "model_directed",
        "creative_mode": "model_directed",
    }
    return json.dumps(payload, ensure_ascii=False, indent=2)


def check_prompt_compliance(prompt: str) -> dict[str, bool]:
    lowered = prompt.lower().strip()
    empty_or_malformed = not lowered or len(lowered.split()) < 6
    over_length_budget = len(prompt) > PROMPT_LENGTH_BUDGET
    watermark_request = bool(re.search(r"\bwatermarks?\b|shutterstock|stock photo watermark", lowered))
    brand_logo_trademark_request = bool(
        re.search(
            r"\blogos?\b|\btrademarks?\b|\bnike\b|\badidas\b|\bdisney\b|\bmarvel\b|\bpixar\b|\bstar wars\b",
            lowered,
        )
    )
    provider_risk_request = bool(
        re.search(
            r"\bnude\b|\bexplicit sexual\b|\bminor\b|\bchild\b|\bself-harm\b|\bgore\b|\bgraphic violence\b",
            lowered,
        )
    )
    passed = not (
        empty_or_malformed
        or over_length_budget
        or watermark_request
        or brand_logo_trademark_request
        or provider_risk_request
    )
    return {
        "prompt_quality_pass": passed,
        "empty_or_malformed_prompt": empty_or_malformed,
        "over_length_budget": over_length_budget,
        "watermark_request": watermark_request,
        "brand_logo_trademark_request": brand_logo_trademark_request,
        "provider_risk_request": provider_risk_request,
    }


def sanitize_provider_prompt(prompt: str) -> tuple[str, list[str]]:
    return _one_line(prompt), []


def sanitize_no_text_requests(scene: str) -> str:
    return _one_line(scene)


def ensure_prompt_budget(prompt: str) -> str:
    prompt = _one_line(prompt)
    if len(prompt) <= PROMPT_LENGTH_BUDGET:
        return prompt
    clipped = prompt[:PROMPT_LENGTH_BUDGET].rsplit(" ", 1)[0].rstrip(" ,;:.")
    return f"{clipped}."


def ensure_v6_prompt_budget(prompt: str) -> str:
    prompt = _one_line(prompt)
    if len(prompt) <= V6_TARGET_PROMPT_BUDGET:
        return prompt
    if " Scene: " not in prompt:
        return ensure_prompt_budget(prompt)
    prefix, rest = prompt.split(" Scene: ", 1)
    suffix = f" {ANSWER_HIDDEN_SENTENCE}"
    scene = rest
    if rest.endswith(suffix):
        scene = rest[: -len(suffix)]
    available = max(120, V6_TARGET_PROMPT_BUDGET - len(prefix) - len(" Scene: ") - len(suffix))
    scene = scene[:available].rsplit(" ", 1)[0].rstrip(" ,;:.")
    return ensure_prompt_budget(f"{prefix} Scene: {scene}.{suffix}")


def normalize_v6_composition(composition: str | None, word: WordSpec, strongly_selected: bool = False) -> str:
    selected = composition if composition in D_COMPOSITIONS else "single"
    if selected not in {"split", "multi_panel"}:
        return selected
    if strongly_selected:
        return selected
    category_text = f"{word.category} {word.part_of_speech}".lower()
    if "concrete" in category_text and "idiom" not in category_text and "false" not in category_text:
        return "single"
    if selected == "split" and any(token in category_text for token in ["contrast", "false", "idiom"]):
        return selected
    if selected == "multi_panel" and any(token in category_text for token in ["sequence", "process", "delay", "development", "time"]):
        return selected
    return "single"


def finalize_provider_prompt(prompt: str) -> tuple[str, str, bool, list[str]]:
    before = ensure_prompt_budget(prompt)
    sanitized, notes = sanitize_provider_prompt(before)
    return before, sanitized, sanitized != before, notes


def parse_json_object(raw: str) -> dict[str, Any]:
    stripped = raw.strip()
    if stripped.startswith("```"):
        stripped = re.sub(r"^```(?:json)?\s*", "", stripped, flags=re.IGNORECASE)
        stripped = re.sub(r"\s*```$", "", stripped)
    return json.loads(stripped)


def validate_b_output(raw_data: dict[str, Any], word: WordSpec, style: str) -> tuple[dict[str, Any], bool]:
    fallback = False
    try:
        normalized = dict(raw_data)
        if normalized.get("mnemonic_confidence") == "null":
            normalized["mnemonic_confidence"] = None
        if normalized.get("text_embedding_mode") in (None, "", "null"):
            normalized["text_embedding_mode"] = "none"
        if normalized.get("creative_mode") in (None, "", "null"):
            normalized["creative_mode"] = "clean_iconic"
        prompt = str(normalized["final_provider_prompt"]).strip()
        composition = normalized.get("composition")
        treatment = normalized.get("treatment")
        creative_mode = normalized.get("creative_mode")
        if not prompt or composition not in B_COMPOSITIONS or treatment not in B_TREATMENTS:
            raise ValueError("required B fields missing or invalid")
        if creative_mode not in CREATIVE_MODES:
            raise ValueError("invalid creative_mode")
        confidence = normalized.get("mnemonic_confidence")
        if confidence not in MNEMONIC_CONFIDENCE:
            raise ValueError("invalid mnemonic_confidence")
        text_embedding_mode = normalized.get("text_embedding_mode")
        if text_embedding_mode not in TEXT_EMBEDDING_MODES:
            raise ValueError("invalid text_embedding_mode")
        prompt_before, final_prompt, sanitization_applied, sanitization_notes = finalize_provider_prompt(prompt)
        data = normalized
        data["prompt_before_sanitize"] = prompt_before
        data["final_provider_prompt"] = final_prompt
        data["sanitization_applied"] = sanitization_applied
        data["sanitization_notes"] = sanitization_notes
    except Exception as exc:
        fallback = True
        prompt_before, final_prompt, sanitization_applied, sanitization_notes = finalize_provider_prompt(
            build_direct_fallback_prompt(word, style)
        )
        data = {
            "prompt_before_sanitize": prompt_before,
            "final_provider_prompt": final_prompt,
            "displayed_mnemonic": None,
            "card_scene_displayed": None,
            "composition": "model_directed",
            "treatment": "model_directed",
            "creative_mode": "clean_iconic",
            "mnemonic_confidence": None,
            "rationale_summary": f"Fallback used because B LLM output was unavailable or invalid: {exc}",
            "text_embedding_mode": "none",
            "sanitization_applied": sanitization_applied,
            "sanitization_notes": sanitization_notes,
        }
    if data.get("mnemonic_confidence") is None:
        data["displayed_mnemonic"] = None
    return data, fallback


def validate_c_output(raw_data: dict[str, Any], word: WordSpec, style: str) -> tuple[dict[str, Any], bool]:
    fallback = False
    try:
        normalized = dict(raw_data)
        if normalized.get("text_embedding_mode") in (None, "", "null"):
            normalized["text_embedding_mode"] = "none"
        if normalized.get("creative_mode") in (None, "", "null"):
            normalized["creative_mode"] = "clean_iconic"
        if normalized.get("mnemonic_confidence") == "null":
            normalized["mnemonic_confidence"] = None
        required = [
            "word",
            "language",
            "translation",
            "part_of_speech",
            "word_category",
            "final_image_scene",
            "mnemonic_confidence",
            "composition",
            "treatment",
            "dominant_emotional_reading",
            "single_image_teachable",
            "rationale_summary",
            "creative_mode",
            "text_embedding_mode",
        ]
        for field in required:
            if field not in normalized:
                raise ValueError(f"missing {field}")
        if normalized["word_category"] not in C_WORD_CATEGORIES:
            raise ValueError("invalid word_category")
        if normalized["composition"] not in C_COMPOSITIONS:
            raise ValueError("invalid composition")
        if normalized["treatment"] not in C_TREATMENTS:
            raise ValueError("invalid treatment")
        if normalized["mnemonic_confidence"] not in MNEMONIC_CONFIDENCE:
            raise ValueError("invalid mnemonic_confidence")
        if normalized["creative_mode"] not in CREATIVE_MODES:
            raise ValueError("invalid creative_mode")
        if normalized["text_embedding_mode"] not in TEXT_EMBEDDING_MODES:
            raise ValueError("invalid text_embedding_mode")
        data = normalized
    except Exception as exc:
        fallback = True
        data = {
            "word": word.word,
            "language": word.language,
            "translation": word.translation,
            "part_of_speech": word.part_of_speech,
            "word_category": "other",
            "final_image_scene": (
                "A clean, concrete scene uses objects, posture, and visual contrast "
                "to suggest the meaning without readable symbols."
            ),
            "display_mnemonic": None,
            "mnemonic_confidence": None,
            "composition": "defer",
            "treatment": "defer",
            "creative_mode": "clean_iconic",
            "dominant_emotional_reading": "meaning-focused clarity",
            "register_note": f"Fallback used because C LLM output was unavailable or invalid: {exc}",
            "single_image_teachable": False,
            "rationale_summary": "Dry-run or invalid-output fallback; not a semantic scene replacement.",
            "text_embedding_mode": "none",
        }
    data["final_image_scene_before_sanitize"] = str(data["final_image_scene"])
    data["final_image_scene"] = sanitize_no_text_requests(str(data["final_image_scene"]))
    if data.get("mnemonic_confidence") is None:
        data["display_mnemonic"] = None
    return data, fallback


def build_c_prompt(word: WordSpec, style: str, plan: dict[str, Any]) -> str:
    register_note = _one_line(plan.get("register_note"))
    register = f" Register note: {register_note}." if register_note else ""
    prompt = (
        f'{style} 16:9 vocabulary-card image for learning the {word.language} '
        f'{word.part_of_speech} "{word.word}" meaning "{word.translation}". '
        f"Render this scene: {plan['final_image_scene']}. "
        f"Composition: {plan['composition']}. Treatment: {plan['treatment']}. "
        f"Creative mode: {plan['creative_mode']}. Text/embedding mode: {plan['text_embedding_mode']}. "
        f"First-glance emotional reading: {plan['dominant_emotional_reading']}.{register} "
        "Make the card memorable and teachable at first glance."
    )
    return ensure_prompt_budget(prompt)


def validate_d_output(raw_data: dict[str, Any], word: WordSpec, style: str) -> tuple[dict[str, Any], bool]:
    fallback = False
    try:
        normalized = dict(raw_data)
        if normalized.get("text_embedding_mode") in (None, "", "null"):
            normalized["text_embedding_mode"] = "none"
        if normalized.get("creative_mode") in (None, "", "null"):
            normalized["creative_mode"] = "clean_iconic"
        if normalized.get("mnemonic_confidence") == "null":
            normalized["mnemonic_confidence"] = None
        required = [
            "word",
            "language",
            "l1_language",
            "translation",
            "part_of_speech",
            "word_category",
            "image_scene",
            "mnemonic_confidence",
            "usage_example",
            "composition",
            "treatment",
            "creative_mode",
            "single_image_teachable",
            "dominant_emotional_reading",
            "text_embedding_mode",
            "rationale_summary",
        ]
        for field in required:
            if field not in normalized:
                raise ValueError(f"missing {field}")
        if normalized["word_category"] not in D_WORD_CATEGORIES:
            raise ValueError("invalid word_category")
        if normalized["composition"] not in D_COMPOSITIONS:
            raise ValueError("invalid composition")
        if normalized["treatment"] not in D_TREATMENTS:
            raise ValueError("invalid treatment")
        if normalized["mnemonic_confidence"] not in MNEMONIC_CONFIDENCE:
            raise ValueError("invalid mnemonic_confidence")
        if normalized["creative_mode"] not in CREATIVE_MODES:
            raise ValueError("invalid creative_mode")
        if normalized["text_embedding_mode"] not in TEXT_EMBEDDING_MODES:
            raise ValueError("invalid text_embedding_mode")
        usage = normalized.get("usage_example")
        if not isinstance(usage, dict) or "target" not in usage or "l1" not in usage:
            raise ValueError("usage_example must include target and l1")
        data = normalized
    except Exception as exc:
        fallback = True
        data = {
            "word": word.word,
            "language": word.language,
            "l1_language": "English",
            "translation": word.translation,
            "part_of_speech": word.part_of_speech,
            "word_category": "other",
            "image_scene": (
                "A clean, concrete scene uses objects, posture, and visual contrast "
                "to suggest the meaning without readable symbols."
            ),
            "mnemonic": None,
            "mnemonic_confidence": None,
            "etymology": None,
            "usage_example": {"target": word.word, "l1": word.translation},
            "composition": "defer",
            "treatment": "defer",
            "creative_mode": "clean_iconic",
            "single_image_teachable": False,
            "dominant_emotional_reading": "meaning-focused clarity",
            "register_note": f"Fallback used because D LLM output was unavailable or invalid: {exc}",
            "text_embedding_mode": "none",
            "rationale_summary": "Invalid-output fallback; not a semantic scene replacement.",
        }
    data["image_scene_before_sanitize"] = str(data["image_scene"])
    data["image_scene"] = sanitize_no_text_requests(str(data["image_scene"]))
    strongly_selected_composition = str(data.get("creative_mode") or "") in {
        "split_contrast",
        "multi_panel_sequence",
    }
    data["composition"] = normalize_v6_composition(
        str(data.get("composition") or "single"),
        word,
        strongly_selected=strongly_selected_composition,
    )
    data["layer2_candidate_text_mode"] = data.get("text_embedding_mode") in {
        "word_as_matter",
        "word_as_form",
        "chat_ui",
        "social_overlay",
        "speech_bubble",
        "thought_bubble",
    }
    if data.get("mnemonic_confidence") is None:
        data["mnemonic"] = None
    return data, fallback


TEXT_MODE_INSTRUCTIONS = {
    "in_scene": "A concise in-scene text detail may appear if it directly teaches the meaning.",
    "chat_ui": "A concise phone/chat interface may appear if it directly teaches the meaning.",
    "social_overlay": "A tasteful social-media overlay may appear if it directly teaches the meaning.",
    "speech_bubble": "One concise speech bubble may appear if it directly teaches the meaning.",
    "thought_bubble": "One concise thought bubble may appear if it directly teaches the meaning.",
    "word_as_matter": "If helpful, the target word may be formed from physical material connected to the meaning.",
    "word_as_form": "If helpful, the subject silhouette may echo the target script form.",
    "mixed": "Use one concise text treatment only if it directly teaches the meaning.",
}


def _targeted_text_instruction(plan: dict[str, Any]) -> str:
    mode = str(plan.get("text_embedding_mode") or "none")
    if mode in {"none", "incidental"}:
        return ""
    instruction = TEXT_MODE_INSTRUCTIONS.get(mode)
    return f" {instruction}" if instruction else ""


def build_d2_prompt(word: WordSpec, style: str, plan: dict[str, Any]) -> str:
    prompt = (
        f"{style} 16:9 image for a language-learning memory card. "
        f"Visual meaning to depict: {word.translation}. "
        f"Scene: {plan['image_scene']}. "
        "Make it clear, memorable, specific, clean, and visually teachable at first glance, "
        "without looking like a poster, infographic, or stock-photo cliché. "
        f"{ANSWER_HIDDEN_SENTENCE}"
    )
    return ensure_v6_prompt_budget(prompt)


def build_d4_prompt(word: WordSpec, style: str, plan: dict[str, Any]) -> str:
    prompt = (
        f"{style} cinematic 16:9 image for a language-learning memory card. "
        f"Visual meaning to depict: {word.translation}. "
        f"Scene: {plan['image_scene']}. "
        "Render one specific, memorable film-still moment with distinctive natural light, strong composition, "
        "meaningful foreground/background depth, environmental storytelling, and one clear visual hook. "
        "Keep the meaning immediately understandable without clutter, poster design, infographic layout, or stock-photo posing. "
        f"{ANSWER_HIDDEN_SENTENCE}"
    )
    return ensure_v6_prompt_budget(prompt)


D3_TEMPLATE_BY_MODE = {
    "clean_iconic": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Show one clean, direct, specific scene: {image_scene}. "
        "Make the meaning clear at first glance without bland stock-photo posing."
    ),
    "cinematic_microstory": (
        '{style} cinematic 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render one emotionally clear film-still moment: {image_scene}. "
        "Use distinctive natural light, strong composition, and a memorable visual hook without clutter."
    ),
    "absurd_surreal": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render this absurd but understandable scene: {image_scene}. "
        "The surreal element should make the meaning stick while remaining instantly readable."
    ),
    "embodied": (
        '{style} embodied 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render the body, posture, gesture, or physical sensation clearly: {image_scene}. "
        "The viewer should feel the meaning physically."
    ),
    "split_contrast": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Use a clean split or contrast composition: {image_scene}. "
        "The contrast should teach the meaning instantly."
    ),
    "multi_panel_sequence": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Use a clean 2-4 panel visual sequence: {image_scene}. "
        "The sequence should teach change, delay, contrast, or development without becoming an infographic."
    ),
    "etymological": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render a memorable scene based on the helpful word parts or origin: {image_scene}. "
        "Keep the etymology visual rather than explanatory."
    ),
    "mnemonic_bridge": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render a vivid memory-bridge scene: {image_scene}. "
        "The scene should make recall easier while still teaching the real meaning."
    ),
    "chat_interface": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render this scene: {image_scene}. "
        "A phone/chat interface may appear only if it directly teaches the meaning; keep it concise and visually elegant."
    ),
    "social_livestream": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render this energetic social-media/livestream-style scene: {image_scene}. "
        "Use overlays only if they improve the concept; avoid clutter."
    ),
    "typographic_material": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render this scene: {image_scene}. "
        "If helpful, the target word may be formed from physical material connected to the meaning."
    ),
    "morphological_form": (
        '{style} 16:9 vocabulary-card image for learning "{word}" meaning "{translation}". '
        "Render this scene: {image_scene}. "
        "If helpful, the object or subject silhouette may echo the target script form."
    ),
}


def _d3_template_mode(plan: dict[str, Any]) -> str:
    text_mode = str(plan.get("text_embedding_mode") or "none")
    if text_mode == "chat_ui":
        return "chat_interface"
    if text_mode == "social_overlay":
        return "social_livestream"
    if text_mode == "word_as_matter":
        return "typographic_material"
    if text_mode == "word_as_form":
        return "morphological_form"
    composition = str(plan.get("composition") or "")
    if composition == "split":
        return "split_contrast"
    if composition == "multi_panel":
        return "multi_panel_sequence"
    creative_mode = str(plan.get("creative_mode") or "")
    if creative_mode == "mnemonic_bridge":
        return "mnemonic_bridge"
    return creative_mode


def build_d3_prompt(word: WordSpec, style: str, plan: dict[str, Any]) -> str:
    mode = _d3_template_mode(plan)
    template = D3_TEMPLATE_BY_MODE.get(mode)
    if template is None:
        return build_d2_prompt(word, style, plan)
    prompt = template.format(
        style=style,
        word=word.word,
        translation=word.translation,
        image_scene=plan["image_scene"],
    )
    if mode not in {"chat_interface", "social_livestream", "typographic_material", "morphological_form"}:
        prompt += _targeted_text_instruction(plan)
    return ensure_prompt_budget(prompt)


def build_d_prompt(word: WordSpec, style: str, plan: dict[str, Any]) -> str:
    return build_d2_prompt(word, style, plan)


def call_openrouter_json(system_prompt: str, user_prompt: str, model: str) -> str:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set in environment")
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "response_format": {"type": "json_object"},
    }
    with httpx.Client(timeout=60.0) as client:
        response = client.post(
            OPENROUTER_ENDPOINT,
            json=payload,
            headers={
                "Authorization": f"Bearer {api_key}",
                "Content-Type": "application/json",
            },
        )
    if response.status_code != 200:
        raise RuntimeError(f"OpenRouter API error HTTP {response.status_code}: {response.text[:1000]}")
    data = response.json()
    choices = data.get("choices") or []
    if not choices:
        raise RuntimeError(f"OpenRouter returned no choices: {json.dumps(data)[:1000]}")
    content = choices[0].get("message", {}).get("content", "")
    if not content:
        raise RuntimeError("OpenRouter returned empty content")
    return content


def provider_not_called(status: str, error_body: str | None = None) -> dict[str, Any]:
    return {
        "called": False,
        "provider_name": "kie",
        "model": IMAGE_MODEL_LABEL,
        "task_id": None,
        "status": status,
        "error_body": error_body,
        "image_path": None,
        "retry_count": 0,
        "retry_reasons": [],
        "retry_attempts": [],
        "attempts": [],
        "image_reused_from_smoke": False,
    }


def _extract_fail_fields(result: dict[str, Any], error_body: str | None) -> tuple[Any, Any]:
    fail_code = result.get("fail_code") or result.get("failCode")
    fail_msg = result.get("fail_msg") or result.get("failMsg")
    for candidate in [result.get("response_body"), error_body]:
        if (fail_code is not None and fail_msg is not None) or not candidate:
            continue
        try:
            parsed = json.loads(str(candidate))
        except Exception:
            parsed = {}
        if isinstance(parsed, dict):
            data = parsed.get("data") if isinstance(parsed.get("data"), dict) else parsed
            fail_code = fail_code if fail_code is not None else data.get("failCode") or data.get("errorCode")
            fail_msg = fail_msg if fail_msg is not None else data.get("failMsg") or data.get("errorMessage")
    if fail_code is None and error_body:
        match = re.search(r"failCode=([A-Za-z0-9_-]+)", error_body)
        if match:
            raw = match.group(1)
            fail_code = int(raw) if raw.isdigit() else raw
    if fail_msg is None and error_body:
        match = re.search(r"failMsg=([^.;\n]+)", error_body)
        if match:
            fail_msg = match.group(1).strip()
    return fail_code, fail_msg


def transient_retry_reason(provider: dict[str, Any]) -> str | None:
    error = str(provider.get("error_body") or "").lower()
    status = str(provider.get("status") or "").lower()
    text = f"{status} {error}"
    if "failcode=500" in text or "failcode\":500" in text or "failcode': 500" in text:
        return "transient_provider_failcode_500"
    if re.search(r"http\s*429|\b429\b", text):
        return "transient_http_429"
    if re.search(r"http\s*408|\b408\b", text):
        return "transient_http_408"
    if re.search(r"http\s*5\d\d|\b5\d\d\b", text):
        return "transient_http_5xx"
    if "poll" in text and "timeout" in text:
        return "transient_provider_polling_timeout"
    if "timed out" in text or "timeout" in text:
        return "transient_network_timeout"
    return None


def provider_config_failure(provider: dict[str, Any]) -> bool:
    if not provider.get("called") or provider.get("status") == "succeeded":
        return False
    if transient_retry_reason(provider):
        return False
    parts = [
        provider.get("status"),
        provider.get("error_body"),
        provider.get("task_id"),
    ]
    for attempt in provider.get("attempts") or []:
        parts.extend([attempt.get("raw_failCode"), attempt.get("raw_failMsg"), attempt.get("error_body")])
    text = " ".join(str(part) for part in parts if part is not None).lower()
    config_terms = (
        "api key",
        "apikey",
        "unauthorized",
        "forbidden",
        "invalid model",
        "model not found",
        "invalid payload",
        "malformed",
        "bad request",
        "unsupported",
        "auth",
        "permission",
    )
    return any(term in text for term in config_terms)


def call_image_provider(
    *,
    prompt: str,
    image_path: Path,
    overwrite: bool,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
    retry_backoffs: list[int] | None = None,
) -> dict[str, Any]:
    if image_path.exists() and not overwrite:
        return {
            "called": False,
            "provider_name": "kie",
            "model": IMAGE_MODEL_LABEL,
            "task_id": None,
            "status": "skipped_existing_image",
            "error_body": None,
            "image_path": str(image_path),
            "retry_count": 0,
            "retry_reasons": [],
            "retry_attempts": [],
            "attempts": [],
        }
    image_path.parent.mkdir(parents=True, exist_ok=True)
    retry_backoffs = list(DEFAULT_RETRY_BACKOFFS_SECONDS if retry_backoffs is None else retry_backoffs)
    retry_reasons: list[str] = []
    attempts: list[dict[str, Any]] = []
    max_attempts = 1 + len(retry_backoffs)
    prompt_sha = _sha256_text(prompt)
    provider: dict[str, Any] = {}
    for attempt in range(1, max_attempts + 1):
        started_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        result = render_scene_gpt_image_2(prompt, image_path, aspect_ratio=aspect_ratio, resolution=resolution)
        completed_at = datetime.utcnow().isoformat(timespec="seconds") + "Z"
        success = bool(result.get("success")) and image_path.exists()
        error_body = None if success else sanitize_error_body(result.get("error_message") or result.get("response_body"))
        fail_code, fail_msg = _extract_fail_fields(result, error_body)
        attempt_record = {
            "attempt_number": attempt,
            "started_at": started_at,
            "completed_at": completed_at,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "prompt_sha256": prompt_sha,
            "task_id": result.get("request_id") or result.get("task_id"),
            "status": "succeeded" if success else "failed",
            "failCode": fail_code,
            "failMsg": fail_msg,
            "raw_failCode": fail_code,
            "raw_failMsg": fail_msg,
            "error_body": error_body,
            "retry_reason": None,
            "final_status": "succeeded" if success else "failed",
        }
        attempts.append(attempt_record)
        provider = {
            "called": True,
            "provider_name": "kie",
            "model": IMAGE_MODEL_LABEL,
            "task_id": result.get("request_id") or result.get("task_id"),
            "status": "succeeded" if success else "failed",
            "error_body": error_body,
            "image_path": str(image_path) if success else None,
            "retry_count": len(retry_reasons),
            "retry_reasons": retry_reasons,
            "retry_attempts": attempts,
            "attempts": attempts,
            "resolution": resolution,
            "aspect_ratio": aspect_ratio,
            "image_reused_from_smoke": False,
        }
        if success:
            return provider
        reason = transient_retry_reason(provider)
        if attempt < max_attempts and reason:
            attempts[-1]["retry_reason"] = reason
            retry_reasons.append(reason)
            time.sleep(retry_backoffs[attempt - 1])
            continue
        return provider
    return provider


def sanitize_error_body(error: Any) -> str | None:
    if error is None:
        return None
    text = str(error)
    text = re.sub(r"Bearer\s+[A-Za-z0-9._~+/=-]+", "Bearer [REDACTED]", text)
    text = re.sub(r"(api[_-]?key['\"]?\s*[:=]\s*['\"]?)[^'\"\s,}]+", r"\1[REDACTED]", text, flags=re.IGNORECASE)
    return text[:2000]


def build_metadata(
    *,
    experiment_id: str,
    result: ArchitectureResult,
    output_root: Path,
    style: str,
) -> dict[str, Any]:
    metadata = {
        "experiment_id": experiment_id,
        "source_prompt_root": result.provider.get("source_prompt_root"),
        "output_root": output_root.as_posix(),
        "architecture": result.architecture,
        "word": result.word.word,
        "language": result.word.language,
        "translation": result.word.translation,
        "part_of_speech": result.word.part_of_speech,
        "category": result.word.category,
        "style": style,
        "answer_visibility": "hidden" if result.architecture in MAIN_ARCHITECTURES else "diagnostic",
        "composition": result.composition,
        "treatment": result.treatment,
        "text_embedding_mode": result.text_embedding_mode,
        "creative_mode": result.creative_mode,
        "llm_called": result.llm_called,
        "image_provider_called": result.image_provider_called,
        "llm_system_prompt_path": result.llm_system_prompt_path,
        "llm_user_prompt_path": result.llm_user_prompt_path,
        "llm_raw_output_path": result.llm_raw_output_path,
        "visual_plan_json_path": result.visual_plan_json_path,
        "raw_prompt_path": result.raw_prompt_path,
        "prompt_before_sanitize_path": result.prompt_before_sanitize_path,
        "final_provider_prompt_path": result.final_provider_prompt_path,
        "final_provider_prompt_sha256": _sha256_text(result.final_prompt),
        "image_path": result.provider.get("image_path"),
        "flat_image_path": result.provider.get("flat_image_path"),
        "image_reused_from_smoke": bool(result.provider.get("image_reused_from_smoke")),
        "resolution": result.provider.get("resolution") or DEFAULT_IMAGE_RESOLUTION,
        "aspect_ratio": result.provider.get("aspect_ratio") or DEFAULT_IMAGE_ASPECT_RATIO,
        "attempt_count": len(result.provider.get("attempts") or []),
        "attempts": result.provider.get("attempts", []),
        "retry_count": result.provider.get("retry_count", 0),
        "retry_reasons": result.provider.get("retry_reasons", []),
        "provider_attempts": result.provider.get("attempts", []),
        "sanitization_applied": result.sanitization_applied,
        "sanitization_notes": result.sanitization_notes,
        "displayed_mnemonic": result.displayed_mnemonic,
        "card_scene_displayed": result.card_scene_displayed,
        "composition_used": result.composition,
        "treatment_used": result.treatment,
        "mnemonic_confidence": result.mnemonic_confidence,
        "fallback_used": result.fallback_used,
        "compliance": result.compliance,
        "provider": result.provider,
        "provider_run": {
            "llm_called": False,
            "kie_called": bool(result.provider.get("called")),
            "fallback_provider_used": False,
            "supabase_writes": False,
            "supabase_storage_uploads": False,
        },
    }
    if result.enrichment:
        for key in [
            "word_category",
            "image_scene",
            "mnemonic",
            "etymology",
            "usage_example",
            "single_image_teachable",
            "dominant_emotional_reading",
            "register_note",
            "rationale_summary",
            "layer2_candidate_text_mode",
        ]:
            if key in result.enrichment:
                metadata[key] = result.enrichment[key]
    return metadata


def create_a_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    experiment_id: str,
    overwrite: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    arch = "A3_thin_meaning_only_hidden_answer"
    slug = slugify_word(word.word)
    prompt = ensure_v6_prompt_budget(build_a3_prompt(word, style))
    prompt_path = output_root / arch / "prompts" / f"{slug}.txt"
    _write_text(prompt_path, prompt + "\n", overwrite)
    provider = provider_not_called(image_skip_status or "not_called_dry_run")
    if image_enabled:
        provider = call_image_provider(
            prompt=prompt,
            image_path=output_root / arch / "images" / f"{slug}.png",
            overwrite=overwrite,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
        )
    return ArchitectureResult(
        architecture=arch,
        word=word,
        slug=slug,
        final_prompt=prompt,
        displayed_mnemonic=None,
        card_scene_displayed=None,
        composition="model_directed",
        treatment="model_directed",
        creative_mode="model_directed",
        text_embedding_mode="model_directed",
        mnemonic_confidence=None,
        llm_called=False,
        image_provider_called=provider["called"],
        llm_system_prompt_path=None,
        llm_user_prompt_path=None,
        llm_raw_output_path=None,
        visual_plan_json_path=None,
        raw_prompt_path=None,
        prompt_before_sanitize_path=None,
        final_provider_prompt_path=_rel(prompt_path, output_root),
        sanitization_applied=False,
        sanitization_notes=[],
        fallback_used=False,
        compliance=check_prompt_compliance(prompt),
        provider=provider,
    )


def create_b_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    experiment_id: str,
    overwrite: bool,
    llm_enabled: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    llm_model: str,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    arch = "B_simple_llm_prompt_writer"
    slug = slugify_word(word.word)
    system_path = output_root / arch / "llm_prompts" / f"{slug}.system.txt"
    user_path = output_root / arch / "llm_prompts" / f"{slug}.user.txt"
    raw_path = output_root / arch / "llm_raw" / f"{slug}.json"
    validated_path = output_root / arch / "validated" / f"{slug}.json"
    prompt_before_path = output_root / arch / "prompts_before_sanitize" / f"{slug}.txt"
    _write_text(system_path, B_SYSTEM_PROMPT, overwrite)
    _write_text(user_path, build_llm_user_prompt(word, style), overwrite)
    raw_data: dict[str, Any]
    llm_called = False
    validated: dict[str, Any] | None = None
    fallback = True
    if llm_enabled:
        for attempt in range(1, LLM_MAX_ATTEMPTS + 1):
            try:
                raw_text = call_openrouter_json(B_SYSTEM_PROMPT, build_llm_user_prompt(word, style), llm_model)
                raw_data = parse_json_object(raw_text)
                raw_data["_attempt"] = attempt
                llm_called = True
                validated, fallback = validate_b_output(raw_data, word, style)
                if not fallback:
                    break
            except Exception as exc:
                raw_data = {"status": "llm_failed", "attempt": attempt, "error": sanitize_error_body(exc)}
                validated = None
                fallback = True
            if attempt < LLM_MAX_ATTEMPTS:
                continue
    else:
        raw_data = {"status": "not_called", "reason": "LLM gated by --run-llm and EXPERIMENT_LLM_RUN=true"}
    _write_json(raw_path, raw_data, overwrite)
    if validated is None:
        validated, fallback = validate_b_output(raw_data, word, style)
    if not llm_called:
        fallback = True
    validated["fallback_used"] = fallback
    _write_json(validated_path, validated, overwrite)
    prompt = validated["final_provider_prompt"]
    prompt_path = output_root / arch / "prompts" / f"{slug}.txt"
    _write_text(prompt_before_path, validated.get("prompt_before_sanitize", prompt) + "\n", overwrite)
    _write_text(prompt_path, prompt + "\n", overwrite)
    provider = provider_not_called(image_skip_status or "not_called_dry_run")
    if image_enabled:
        provider = call_image_provider(
            prompt=prompt,
            image_path=output_root / arch / "images" / f"{slug}.png",
            overwrite=overwrite,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
        )
    confidence = validated.get("mnemonic_confidence")
    displayed = validated.get("displayed_mnemonic")
    if confidence is None:
        displayed = None
    return ArchitectureResult(
        architecture=arch,
        word=word,
        slug=slug,
        final_prompt=prompt,
        displayed_mnemonic=displayed,
        card_scene_displayed=validated.get("card_scene_displayed"),
        composition=validated.get("composition") or "model_directed",
        treatment=validated.get("treatment") or "model_directed",
        creative_mode=validated.get("creative_mode") or "clean_iconic",
        text_embedding_mode=validated.get("text_embedding_mode") or "none",
        mnemonic_confidence=confidence,
        llm_called=llm_called,
        image_provider_called=provider["called"],
        llm_system_prompt_path=_rel(system_path, output_root),
        llm_user_prompt_path=_rel(user_path, output_root),
        llm_raw_output_path=_rel(raw_path, output_root),
        visual_plan_json_path=_rel(validated_path, output_root),
        raw_prompt_path=_rel(prompt_before_path, output_root),
        prompt_before_sanitize_path=_rel(prompt_before_path, output_root),
        final_provider_prompt_path=_rel(prompt_path, output_root),
        sanitization_applied=bool(validated.get("sanitization_applied")),
        sanitization_notes=list(validated.get("sanitization_notes") or []),
        fallback_used=fallback,
        compliance=check_prompt_compliance(prompt),
        provider=provider,
    )


def create_c_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    experiment_id: str,
    overwrite: bool,
    llm_enabled: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    llm_model: str,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    arch = "C_structured_scene_director_guard"
    slug = slugify_word(word.word)
    system_path = output_root / arch / "llm_prompts" / f"{slug}.system.txt"
    user_path = output_root / arch / "llm_prompts" / f"{slug}.user.txt"
    raw_path = output_root / arch / "llm_raw" / f"{slug}.json"
    plan_path = output_root / arch / "visual_plans" / f"{slug}.json"
    prompt_before_path = output_root / arch / "prompts_before_sanitize" / f"{slug}.txt"
    _write_text(system_path, C_SYSTEM_PROMPT, overwrite)
    _write_text(user_path, build_llm_user_prompt(word, style), overwrite)
    raw_data: dict[str, Any]
    llm_called = False
    plan: dict[str, Any] | None = None
    fallback = True
    if llm_enabled:
        for attempt in range(1, LLM_MAX_ATTEMPTS + 1):
            try:
                raw_text = call_openrouter_json(C_SYSTEM_PROMPT, build_llm_user_prompt(word, style), llm_model)
                raw_data = parse_json_object(raw_text)
                raw_data["_attempt"] = attempt
                llm_called = True
                plan, fallback = validate_c_output(raw_data, word, style)
                if not fallback:
                    break
            except Exception as exc:
                raw_data = {"status": "llm_failed", "attempt": attempt, "error": sanitize_error_body(exc)}
                plan = None
                fallback = True
            if attempt < LLM_MAX_ATTEMPTS:
                continue
    else:
        raw_data = {"status": "not_called", "reason": "LLM gated by --run-llm and EXPERIMENT_LLM_RUN=true"}
    _write_json(raw_path, raw_data, overwrite)
    if plan is None:
        plan, fallback = validate_c_output(raw_data, word, style)
    if not llm_called:
        fallback = True
    plan["fallback_used"] = fallback
    _write_json(plan_path, plan, overwrite)
    before_plan = dict(plan)
    before_plan["final_image_scene"] = plan.get("final_image_scene_before_sanitize", plan.get("final_image_scene", ""))
    prompt_before = build_c_prompt(word, style, before_plan)
    _prompt_before, prompt, sanitization_applied, sanitization_notes = finalize_provider_prompt(prompt_before)
    plan["prompt_before_sanitize"] = _prompt_before
    plan["final_provider_prompt"] = prompt
    plan["sanitization_applied"] = sanitization_applied
    plan["sanitization_notes"] = sanitization_notes
    _write_json(plan_path, plan, overwrite)
    prompt_path = output_root / arch / "prompts" / f"{slug}.txt"
    _write_text(prompt_before_path, _prompt_before + "\n", overwrite)
    _write_text(prompt_path, prompt + "\n", overwrite)
    provider = provider_not_called(image_skip_status or "not_called_dry_run")
    if image_enabled:
        provider = call_image_provider(
            prompt=prompt,
            image_path=output_root / arch / "images" / f"{slug}.png",
            overwrite=overwrite,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
        )
    confidence = plan.get("mnemonic_confidence")
    displayed = plan.get("display_mnemonic")
    if confidence is None:
        displayed = None
    return ArchitectureResult(
        architecture=arch,
        word=word,
        slug=slug,
        final_prompt=prompt,
        displayed_mnemonic=displayed,
        card_scene_displayed=plan.get("final_image_scene"),
        composition=plan.get("composition") or "defer",
        treatment=plan.get("treatment") or "defer",
        creative_mode=plan.get("creative_mode") or "clean_iconic",
        text_embedding_mode=plan.get("text_embedding_mode") or "none",
        mnemonic_confidence=confidence,
        llm_called=llm_called,
        image_provider_called=provider["called"],
        llm_system_prompt_path=_rel(system_path, output_root),
        llm_user_prompt_path=_rel(user_path, output_root),
        llm_raw_output_path=_rel(raw_path, output_root),
        visual_plan_json_path=_rel(plan_path, output_root),
        raw_prompt_path=_rel(prompt_before_path, output_root),
        prompt_before_sanitize_path=_rel(prompt_before_path, output_root),
        final_provider_prompt_path=_rel(prompt_path, output_root),
        sanitization_applied=sanitization_applied,
        sanitization_notes=sanitization_notes,
        fallback_used=fallback,
        compliance=check_prompt_compliance(prompt),
        provider=provider,
    )


def create_d_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    experiment_id: str,
    overwrite: bool,
    llm_enabled: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    llm_model: str,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
    architecture: str = "D2_unified_enrichment_short_compiler",
    compiler: str = "d2",
) -> ArchitectureResult:
    arch = architecture
    slug = slugify_word(word.word)
    system_path = output_root / arch / "llm_prompts" / f"{slug}.system.txt"
    user_path = output_root / arch / "llm_prompts" / f"{slug}.user.txt"
    raw_path = output_root / arch / "llm_raw" / f"{slug}.json"
    validated_path = output_root / arch / "validated" / f"{slug}.json"
    prompt_before_path = output_root / arch / "prompts_before_sanitize" / f"{slug}.txt"
    system_prompt = D4_SYSTEM_PROMPT if compiler == "d4" else D_SYSTEM_PROMPT
    _write_text(system_path, system_prompt, overwrite)
    _write_text(user_path, build_llm_user_prompt(word, style), overwrite)
    raw_data: dict[str, Any]
    llm_called = False
    validated: dict[str, Any] | None = None
    fallback = True
    if llm_enabled:
        for attempt in range(1, LLM_MAX_ATTEMPTS + 1):
            try:
                raw_text = call_openrouter_json(system_prompt, build_llm_user_prompt(word, style), llm_model)
                raw_data = parse_json_object(raw_text)
                raw_data["_attempt"] = attempt
                llm_called = True
                validated, fallback = validate_d_output(raw_data, word, style)
                if not fallback:
                    break
            except Exception as exc:
                raw_data = {"status": "llm_failed", "attempt": attempt, "error": sanitize_error_body(exc)}
                validated = None
                fallback = True
            if attempt < LLM_MAX_ATTEMPTS:
                continue
    else:
        raw_data = {"status": "not_called", "reason": "LLM gated by --run-llm and EXPERIMENT_LLM_RUN=true"}
    _write_json(raw_path, raw_data, overwrite)
    if validated is None:
        validated, fallback = validate_d_output(raw_data, word, style)
    if not llm_called:
        fallback = True
    validated["fallback_used"] = fallback
    before_plan = dict(validated)
    before_plan["image_scene"] = validated.get("image_scene_before_sanitize", validated.get("image_scene", ""))
    if compiler == "d4":
        prompt_before = build_d4_prompt(word, style, before_plan)
    elif compiler == "d3":
        prompt_before = build_d3_prompt(word, style, before_plan)
    else:
        prompt_before = build_d2_prompt(word, style, before_plan)
    _prompt_before, prompt, sanitization_applied, sanitization_notes = finalize_provider_prompt(prompt_before)
    validated["prompt_before_sanitize"] = _prompt_before
    validated["final_provider_prompt"] = prompt
    validated["sanitization_applied"] = sanitization_applied
    validated["sanitization_notes"] = sanitization_notes
    _write_json(validated_path, validated, overwrite)
    prompt_path = output_root / arch / "prompts" / f"{slug}.txt"
    _write_text(prompt_before_path, _prompt_before + "\n", overwrite)
    _write_text(prompt_path, prompt + "\n", overwrite)
    provider = provider_not_called(image_skip_status or "not_called_dry_run")
    if image_enabled:
        provider = call_image_provider(
            prompt=prompt,
            image_path=output_root / arch / "images" / f"{slug}.png",
            overwrite=overwrite,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
        )
    confidence = validated.get("mnemonic_confidence")
    displayed = validated.get("mnemonic")
    if confidence is None:
        displayed = None
    return ArchitectureResult(
        architecture=arch,
        word=word,
        slug=slug,
        final_prompt=prompt,
        displayed_mnemonic=displayed,
        card_scene_displayed=validated.get("image_scene"),
        composition=validated.get("composition") or "defer",
        treatment=validated.get("treatment") or "defer",
        creative_mode=validated.get("creative_mode") or "clean_iconic",
        text_embedding_mode=validated.get("text_embedding_mode") or "none",
        mnemonic_confidence=confidence,
        llm_called=llm_called,
        image_provider_called=provider["called"],
        llm_system_prompt_path=_rel(system_path, output_root),
        llm_user_prompt_path=_rel(user_path, output_root),
        llm_raw_output_path=_rel(raw_path, output_root),
        visual_plan_json_path=_rel(validated_path, output_root),
        raw_prompt_path=_rel(prompt_before_path, output_root),
        prompt_before_sanitize_path=_rel(prompt_before_path, output_root),
        final_provider_prompt_path=_rel(prompt_path, output_root),
        sanitization_applied=sanitization_applied,
        sanitization_notes=sanitization_notes,
        fallback_used=fallback,
        compliance=check_prompt_compliance(prompt),
        provider=provider,
        enrichment=validated,
    )


def create_d2_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    experiment_id: str,
    overwrite: bool,
    llm_enabled: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    llm_model: str,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    return create_d_result(
        word,
        output_root,
        style,
        experiment_id,
        overwrite,
        llm_enabled,
        image_enabled,
        image_skip_status,
        llm_model,
        resolution,
        aspect_ratio,
        architecture="D2_unified_short_hidden_answer",
        compiler="d2",
    )


def create_d4_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    experiment_id: str,
    overwrite: bool,
    llm_enabled: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    llm_model: str,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    return create_d_result(
        word,
        output_root,
        style,
        experiment_id,
        overwrite,
        llm_enabled,
        image_enabled,
        image_skip_status,
        llm_model,
        resolution,
        aspect_ratio,
        architecture="D4_unified_cinematic_short_hidden_answer",
        compiler="d4",
    )


def create_d3_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    experiment_id: str,
    overwrite: bool,
    llm_enabled: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    llm_model: str,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    return create_d_result(
        word,
        output_root,
        style,
        experiment_id,
        overwrite,
        llm_enabled,
        image_enabled,
        image_skip_status,
        llm_model,
        resolution,
        aspect_ratio,
        architecture="D3_unified_enrichment_template_compiler",
        compiler="d3",
    )


def create_b0_result(
    word: WordSpec,
    output_root: Path,
    style: str,
    overwrite: bool,
    image_enabled: bool,
    baseline_image_enabled: bool,
    image_skip_status: str | None,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    arch = CURRENT_BASELINE_ARCHITECTURE
    slug = slugify_word(word.word)
    enrichment_path = output_root / arch / "enrichment" / f"{slug}.json"
    enrichment = {
        "diagnostic_note": "current-broken-baseline; dry-run placeholder uses word fields only unless production enrichment is wired separately",
        "word_target": word.word,
        "translation": word.translation,
        "mnemonic": "",
        "dominant_emotional_reading": "",
        "composition_hint": None,
        "treatment_hint": None,
        "pos": word.part_of_speech,
    }
    _write_json(enrichment_path, enrichment, overwrite)
    if build_gpt_image_2_prompt is None:
        prompt = build_direct_fallback_prompt(word, style)
        fallback = True
    else:
        prompt = build_gpt_image_2_prompt(
            word=word.word,
            translation=word.translation,
            language=word.language,
            pos=word.part_of_speech,
            mnemonic="",
            dominant_emotional_reading="",
            composition_hint=None,
            treatment_hint=None,
            card_image_style=style,
        )
        fallback = False
    prompt = ensure_prompt_budget(prompt)
    prompt_path = output_root / arch / "prompts" / f"{slug}.txt"
    _write_text(prompt_path, prompt + "\n", overwrite)
    status = image_skip_status or "not_called_dry_run"
    if image_enabled and not baseline_image_enabled:
        status = "not_called_current_baseline_image_flag_missing"
    provider = provider_not_called(status)
    if image_enabled and baseline_image_enabled:
        provider = call_image_provider(
            prompt=prompt,
            image_path=output_root / arch / "images" / f"{slug}.png",
            overwrite=overwrite,
            resolution=resolution,
            aspect_ratio=aspect_ratio,
        )
    return ArchitectureResult(
        architecture=arch,
        word=word,
        slug=slug,
        final_prompt=prompt,
        displayed_mnemonic=enrichment["mnemonic"] or None,
        card_scene_displayed="not exposed",
        composition=enrichment["composition_hint"] or "not_exposed",
        treatment=enrichment["treatment_hint"] or "not_exposed",
        creative_mode="not_exposed",
        text_embedding_mode="not_exposed",
        mnemonic_confidence=None,
        llm_called=False,
        image_provider_called=provider["called"],
        llm_system_prompt_path=None,
        llm_user_prompt_path=None,
        llm_raw_output_path=None,
        visual_plan_json_path=_rel(enrichment_path, output_root),
        raw_prompt_path=None,
        prompt_before_sanitize_path=None,
        final_provider_prompt_path=_rel(prompt_path, output_root),
        sanitization_applied=False,
        sanitization_notes=[],
        fallback_used=fallback,
        compliance=check_prompt_compliance(prompt),
        provider=provider,
    )


def write_metadata(result: ArchitectureResult, output_root: Path, experiment_id: str, style: str, overwrite: bool) -> None:
    metadata_path = output_root / result.architecture / "metadata" / f"{result.slug}.json"
    _write_json(metadata_path, build_metadata(experiment_id=experiment_id, result=result, output_root=output_root, style=style), overwrite)


def mirror_existing_source(source_root: Path, output_root: Path, overwrite: bool) -> None:
    if not source_root.is_dir():
        raise FileNotFoundError(f"source root does not exist: {source_root}")
    for source_path in source_root.rglob("*"):
        if source_path.is_dir():
            continue
        relative = source_path.relative_to(source_root)
        dest_path = output_root / relative
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        if dest_path.exists() and not overwrite:
            continue
        shutil.copy2(source_path, dest_path)


def _resolve_artifact_path(path_value: str | None, base_root: Path) -> Path | None:
    if not path_value:
        return None
    candidate = Path(path_value)
    if candidate.is_absolute():
        return candidate
    direct = base_root / candidate
    if direct.exists():
        return direct
    return REPO_ROOT / candidate


def normalize_attempts(provider: dict[str, Any], prompt_sha: str, resolution: str, aspect_ratio: str) -> list[dict[str, Any]]:
    attempts = list(provider.get("attempts") or provider.get("retry_attempts") or [])
    normalized: list[dict[str, Any]] = []
    for index, attempt in enumerate(attempts, start=1):
        status = attempt.get("status") or attempt.get("final_status") or provider.get("status")
        fail_code = attempt.get("failCode", attempt.get("raw_failCode"))
        fail_msg = attempt.get("failMsg", attempt.get("raw_failMsg"))
        normalized.append({
            "attempt_number": attempt.get("attempt_number") or index,
            "started_at": attempt.get("started_at"),
            "completed_at": attempt.get("completed_at"),
            "resolution": attempt.get("resolution") or resolution,
            "aspect_ratio": attempt.get("aspect_ratio") or aspect_ratio,
            "prompt_sha256": attempt.get("prompt_sha256") or prompt_sha,
            "task_id": attempt.get("task_id") or provider.get("task_id"),
            "status": status,
            "failCode": fail_code,
            "failMsg": fail_msg,
            "raw_failCode": fail_code,
            "raw_failMsg": fail_msg,
            "error_body": attempt.get("error_body"),
            "retry_reason": attempt.get("retry_reason"),
            "final_status": status,
        })
    return normalized


def try_reuse_smoke_image(
    *,
    smoke_source_root: Path | None,
    output_root: Path,
    architecture: str,
    slug: str,
    prompt_sha: str,
    resolution: str,
    aspect_ratio: str,
    overwrite: bool,
) -> dict[str, Any] | None:
    if smoke_source_root is None:
        return None
    smoke_metadata_path = smoke_source_root / architecture / "metadata" / f"{slug}.json"
    if not smoke_metadata_path.is_file():
        return None
    smoke_metadata = json.loads(smoke_metadata_path.read_text(encoding="utf-8-sig"))
    if smoke_metadata.get("final_provider_prompt_sha256") != prompt_sha:
        return None
    smoke_provider = dict(smoke_metadata.get("provider") or {})
    if smoke_provider.get("status") != "succeeded":
        return None
    smoke_image_path = _resolve_artifact_path(smoke_metadata.get("image_path") or smoke_provider.get("image_path"), smoke_source_root)
    if smoke_image_path is None or not smoke_image_path.is_file():
        return None
    dest_image_path = output_root / architecture / "images" / f"{slug}.png"
    dest_image_path.parent.mkdir(parents=True, exist_ok=True)
    if not dest_image_path.exists() or overwrite:
        shutil.copy2(smoke_image_path, dest_image_path)
    smoke_provider["called"] = True
    smoke_provider["provider_name"] = "kie"
    smoke_provider["model"] = IMAGE_MODEL_LABEL
    smoke_provider["status"] = "succeeded"
    smoke_provider["error_body"] = None
    smoke_provider["image_path"] = str(dest_image_path)
    smoke_provider["resolution"] = resolution
    smoke_provider["aspect_ratio"] = aspect_ratio
    smoke_provider["image_reused_from_smoke"] = True
    smoke_provider["attempts"] = normalize_attempts(smoke_provider, prompt_sha, resolution, aspect_ratio)
    smoke_provider["retry_attempts"] = smoke_provider["attempts"]
    return smoke_provider


def provider_failed_after_500_retries(provider: dict[str, Any]) -> bool:
    if provider.get("status") != "failed":
        return False
    attempts = provider.get("attempts") or []
    if len(attempts) < 3:
        return False
    last_attempt = attempts[-1]
    fail_code = last_attempt.get("failCode", last_attempt.get("raw_failCode"))
    return str(fail_code) == "500"


def create_existing_prompt_result(
    *,
    source_root: Path,
    output_root: Path,
    architecture: str,
    word: WordSpec,
    overwrite: bool,
    image_enabled: bool,
    image_skip_status: str | None,
    smoke_source_root: Path | None = None,
    resolution: str = DEFAULT_IMAGE_RESOLUTION,
    aspect_ratio: str = DEFAULT_IMAGE_ASPECT_RATIO,
) -> ArchitectureResult:
    slug = slugify_word(word.word)
    metadata_path = source_root / architecture / "metadata" / f"{slug}.json"
    prompt_rel = Path(architecture) / "prompts" / f"{slug}.txt"
    if not metadata_path.is_file():
        raise FileNotFoundError(f"missing source metadata: {metadata_path}")
    metadata = json.loads(metadata_path.read_text(encoding="utf-8-sig"))
    prompt_path = source_root / (metadata.get("final_provider_prompt_path") or prompt_rel)
    if not prompt_path.is_file():
        prompt_path = source_root / prompt_rel
    prompt = prompt_path.read_text(encoding="utf-8").strip()
    provider = provider_not_called(image_skip_status or "not_called_dry_run")
    if image_enabled:
        provider = try_reuse_smoke_image(
            smoke_source_root=smoke_source_root,
            output_root=output_root,
            architecture=architecture,
            slug=slug,
            prompt_sha=_sha256_text(prompt),
            resolution=resolution,
            aspect_ratio=aspect_ratio,
            overwrite=overwrite,
        )
        if provider is None:
            provider = call_image_provider(
                prompt=prompt,
                image_path=output_root / architecture / "images" / f"{slug}.png",
                overwrite=overwrite,
                resolution=resolution,
                aspect_ratio=aspect_ratio,
            )
    provider["source_prompt_root"] = source_root.as_posix()
    default_text_mode = "model_directed" if architecture.startswith(("A2_", "A3_")) else "none"
    default_creative_mode = "model_directed" if architecture.startswith(("A2_", "A3_")) else "clean_iconic"
    return ArchitectureResult(
        architecture=architecture,
        word=word,
        slug=slug,
        final_prompt=prompt,
        displayed_mnemonic=metadata.get("displayed_mnemonic"),
        card_scene_displayed=metadata.get("card_scene_displayed"),
        composition=metadata.get("composition_used") or "model_directed",
        treatment=metadata.get("treatment_used") or "model_directed",
        creative_mode=metadata.get("creative_mode") or default_creative_mode,
        text_embedding_mode=metadata.get("text_embedding_mode") or default_text_mode,
        mnemonic_confidence=metadata.get("mnemonic_confidence"),
        llm_called=bool(metadata.get("llm_called")),
        image_provider_called=provider["called"],
        llm_system_prompt_path=metadata.get("llm_system_prompt_path"),
        llm_user_prompt_path=metadata.get("llm_user_prompt_path"),
        llm_raw_output_path=metadata.get("llm_raw_output_path"),
        visual_plan_json_path=metadata.get("visual_plan_json_path"),
        raw_prompt_path=metadata.get("raw_prompt_path"),
        prompt_before_sanitize_path=metadata.get("prompt_before_sanitize_path"),
        final_provider_prompt_path=Path(metadata.get("final_provider_prompt_path") or prompt_rel).as_posix(),
        sanitization_applied=bool(metadata.get("sanitization_applied")),
        sanitization_notes=list(metadata.get("sanitization_notes") or []),
        fallback_used=bool(metadata.get("fallback_used")),
        compliance=check_prompt_compliance(prompt),
        provider=provider,
    )


def write_score_sheet(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    path = output_root / "SCORE_SHEET.csv"
    if path.exists() and not overwrite:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "architecture",
            "word",
            "semantic_clarity_1_5",
            "memorability_1_5",
            "visual_diversity_1_5",
            "no_text_compliance_pass_fail",
            "displayed_mnemonic_alignment_pass_fail",
            "aesthetic_quality_1_5",
            "learning_usefulness_1_5",
            "notes",
        ])
        for result in results:
            writer.writerow([result.architecture, result.word.word, "", "", "", "", "", "", "", ""])


def write_contact_sheet_md(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    path = output_root / "CONTACT_SHEET.md"
    by_word: dict[str, dict[str, ArchitectureResult]] = {}
    architectures = [*MAIN_ARCHITECTURES]
    if any(result.architecture == CURRENT_BASELINE_ARCHITECTURE for result in results):
        architectures.append(CURRENT_BASELINE_ARCHITECTURE)
    for result in results:
        by_word.setdefault(result.word.word, {})[result.architecture] = result
    lines = [
        "# Contact Sheet",
        "",
        "Image cells show local image links when provider output exists; otherwise they show the provider status.",
        "",
        "| Word | " + " | ".join(architectures) + " |",
        "|---|" + "|".join("---" for _ in architectures) + "|",
    ]
    words = []
    seen_words = set()
    for result in results:
        if result.word.word not in seen_words:
            words.append(result.word)
            seen_words.add(result.word.word)
    for word in words:
        cells = [word.word]
        for arch in architectures:
            result = by_word.get(word.word, {}).get(arch)
            if not result:
                cells.append("")
                continue
            image_path = result.provider.get("image_path")
            if image_path:
                rel = _rel(Path(image_path), output_root)
                cells.append(f"![{arch} {word.word}]({rel})")
            else:
                status = result.provider.get("status") or "not_available"
                cells.append(f"**FAILED**<br>{arch}<br>{word.word}<br>`{status}`")
        lines.append("| " + " | ".join(cells) + " |")
    _write_text(path, "\n".join(lines) + "\n", overwrite)


def populate_images_flat(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    flat_root = output_root / "images_flat"
    flat_root.mkdir(parents=True, exist_ok=True)
    ordered_slugs: list[str] = []
    for result in results:
        if result.slug not in ordered_slugs:
            ordered_slugs.append(result.slug)
    word_order = {slug: index for index, slug in enumerate(ordered_slugs, start=1)}
    for result in results:
        image_path_value = result.provider.get("image_path")
        if not image_path_value:
            continue
        source_image = _resolve_artifact_path(str(image_path_value), output_root)
        if source_image is None or not source_image.is_file():
            continue
        row_number = word_order.get(result.slug, 99)
        flat_path = flat_root / f"{row_number:02d}_{result.slug}__{result.architecture}.png"
        if not flat_path.exists() or overwrite:
            shutil.copy2(source_image, flat_path)
        result.provider["flat_image_path"] = str(flat_path)


def write_provider_attempts_csv(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    path = output_root / "PROVIDER_ATTEMPTS.csv"
    if path.exists() and not overwrite:
        return
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow([
            "architecture",
            "word",
            "image_reused_from_smoke",
            "provider_status",
            "attempt_number",
            "started_at",
            "completed_at",
            "resolution",
            "aspect_ratio",
            "prompt_sha256",
            "task_id",
            "status",
            "failCode",
            "failMsg",
            "error_body",
            "retry_reason",
        ])
        for result in results:
            attempts = result.provider.get("attempts") or []
            if not attempts:
                writer.writerow([
                    result.architecture,
                    result.word.word,
                    bool(result.provider.get("image_reused_from_smoke")),
                    result.provider.get("status"),
                    "",
                    "",
                    "",
                    result.provider.get("resolution") or DEFAULT_IMAGE_RESOLUTION,
                    result.provider.get("aspect_ratio") or DEFAULT_IMAGE_ASPECT_RATIO,
                    _sha256_text(result.final_prompt),
                    result.provider.get("task_id"),
                    result.provider.get("status"),
                    "",
                    "",
                    result.provider.get("error_body"),
                    "",
                ])
                continue
            for attempt in attempts:
                writer.writerow([
                    result.architecture,
                    result.word.word,
                    bool(result.provider.get("image_reused_from_smoke")),
                    result.provider.get("status"),
                    attempt.get("attempt_number"),
                    attempt.get("started_at"),
                    attempt.get("completed_at"),
                    attempt.get("resolution") or result.provider.get("resolution"),
                    attempt.get("aspect_ratio") or result.provider.get("aspect_ratio"),
                    attempt.get("prompt_sha256") or _sha256_text(result.final_prompt),
                    attempt.get("task_id"),
                    attempt.get("status") or attempt.get("final_status"),
                    attempt.get("failCode", attempt.get("raw_failCode")),
                    attempt.get("failMsg", attempt.get("raw_failMsg")),
                    attempt.get("error_body"),
                    attempt.get("retry_reason"),
                ])


def write_contact_sheet_png(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    path = output_root / "CONTACT_SHEET.png"
    if path.exists() and not overwrite:
        return
    try:
        from PIL import Image, ImageDraw, ImageFont
    except Exception:
        return

    by_word: dict[str, dict[str, ArchitectureResult]] = {}
    for result in results:
        by_word.setdefault(result.word.word, {})[result.architecture] = result
    words = []
    seen_words = set()
    for result in results:
        if result.word.word not in seen_words:
            words.append(result.word)
            seen_words.add(result.word.word)
    architectures = list(MAIN_ARCHITECTURES)
    cell_w = 360
    label_h = 42
    image_h = 202
    header_h = 34
    margin = 12
    sheet_w = margin * 2 + cell_w * len(architectures)
    sheet_h = margin * 2 + header_h + (label_h + image_h) * len(words)
    canvas = Image.new("RGB", (sheet_w, sheet_h), "white")
    draw = ImageDraw.Draw(canvas)
    font = ImageFont.load_default()
    header_font = ImageFont.load_default()

    for col, arch in enumerate(architectures):
        x = margin + col * cell_w
        draw.text((x + 8, margin + 10), arch, fill=(20, 20, 20), font=header_font)

    for row, word in enumerate(words):
        y = margin + header_h + row * (label_h + image_h)
        for col, arch in enumerate(architectures):
            x = margin + col * cell_w
            result = by_word.get(word.word, {}).get(arch)
            label = f"{arch}\n{word.word}"
            draw.rectangle((x, y, x + cell_w - 8, y + label_h + image_h - 8), outline=(210, 210, 210), fill=(248, 248, 248))
            draw.text((x + 8, y + 6), label, fill=(20, 20, 20), font=font)
            image_box = (x + 8, y + label_h, x + cell_w - 16, y + label_h + image_h - 14)
            if result and result.provider.get("image_path"):
                source_image = _resolve_artifact_path(str(result.provider["image_path"]), output_root)
                if source_image and source_image.is_file():
                    try:
                        with Image.open(source_image) as img:
                            img = img.convert("RGB")
                            img.thumbnail((image_box[2] - image_box[0], image_box[3] - image_box[1]))
                            px = image_box[0] + ((image_box[2] - image_box[0]) - img.width) // 2
                            py = image_box[1] + ((image_box[3] - image_box[1]) - img.height) // 2
                            canvas.paste(img, (px, py))
                            continue
                    except Exception:
                        pass
            status = result.provider.get("status") if result else "missing"
            error = result.provider.get("error_body") if result else None
            draw.rectangle(image_box, fill=(90, 36, 36), outline=(120, 20, 20))
            draw.text((image_box[0] + 12, image_box[1] + 18), f"FAILED\n{word.word}\n{arch}\n{status}\n{str(error or '')[:90]}", fill=(255, 255, 255), font=font)
    path.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(path)


def write_preflight_hygiene(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    lines = [
        "# Preflight Prompt Quality",
        "",
        "Checks final provider prompts for provider-risk issues before any KIE image calls. Deliberate text, UI, signs, labels, numbers, chat messages, handwriting, speech bubbles, and thought bubbles are allowed.",
        "",
        "| Architecture | Word | Pass/Fail | Empty/malformed | Over length | Watermark request | Brand/logo/trademark request | Provider-risk request | Missing metadata |",
        "|---|---|---|---|---|---|---|---|---|",
    ]
    for result in results:
        compliance = result.compliance
        missing_metadata = not result.text_embedding_mode or not result.creative_mode
        lines.append(
            f"| {result.architecture} | {result.word.word} | {'PASS' if compliance['prompt_quality_pass'] and not missing_metadata else 'FAIL'} | "
            f"{compliance['empty_or_malformed_prompt']} | {compliance['over_length_budget']} | "
            f"{compliance['watermark_request']} | {compliance['brand_logo_trademark_request']} | "
            f"{compliance['provider_risk_request']} | {missing_metadata} |"
        )
    _write_text(output_root / "PREFLIGHT_PROMPT_QUALITY.md", "\n".join(lines) + "\n", overwrite)


def write_all_prompts(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    lines = ["# All Prompts", ""]
    by_word: dict[str, list[ArchitectureResult]] = {}
    for result in results:
        by_word.setdefault(result.word.word, []).append(result)
    order = {arch: idx for idx, arch in enumerate([*MAIN_ARCHITECTURES, CURRENT_BASELINE_ARCHITECTURE])}
    words = []
    seen_words = set()
    for result in results:
        if result.word.word not in seen_words:
            words.append(result.word)
            seen_words.add(result.word.word)
    for word in words:
        lines.extend([f"## {word.word}", ""])
        for result in sorted(by_word.get(word.word, []), key=lambda item: order.get(item.architecture, 99)):
            lines.extend([
                f"### {result.architecture}",
                "",
                f"- displayed_mnemonic: `{json.dumps(result.displayed_mnemonic, ensure_ascii=False)}`",
                f"- card_scene_displayed: `{json.dumps(result.card_scene_displayed, ensure_ascii=False)}`",
                f"- composition: `{result.composition}`",
                f"- treatment: `{result.treatment}`",
                f"- creative_mode: `{result.creative_mode}`",
                f"- text_embedding_mode: `{result.text_embedding_mode}`",
                f"- mnemonic_confidence: `{json.dumps(result.mnemonic_confidence, ensure_ascii=False)}`",
                f"- fallback_used: `{str(result.fallback_used).lower()}`",
                f"- sanitization_applied: `{str(result.sanitization_applied).lower()}`",
                f"- sanitization_notes: `{json.dumps(result.sanitization_notes, ensure_ascii=False)}`",
                "",
                "```text",
                result.final_prompt,
                "```",
                "",
            ])
    _write_text(output_root / "ALL_PROMPTS.md", "\n".join(lines), overwrite)


def write_index(results: list[ArchitectureResult], output_root: Path, overwrite: bool) -> None:
    lines = [
        "# GPT Image-2 Architecture Experiment",
        "",
        "Experiment compares three GPT Image-2 v6 hidden-answer lock-in prompt architectures across the fresh v6 word set.",
        "",
        "- `A3_thin_meaning_only_hidden_answer`: no enrichment or LLM planning; code builds one meaning-only hidden-answer GPT Image-2 prompt.",
        "- `D2_unified_short_hidden_answer`: experiment-only DeepSeek/OpenRouter unified enrichment with a short hidden-answer final provider prompt.",
        "- `D4_unified_cinematic_short_hidden_answer`: same unified enrichment shape with a more cinematic hidden-answer compiler.",
        f"- `{CURRENT_BASELINE_ARCHITECTURE}`: optional diagnostic current-production baseline only, not a future candidate.",
        "",
        "| Word | Architecture | Prompt | Metadata | Image | LLM Called | Image Called | Failure/Status |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for result in results:
        metadata_rel = f"{result.architecture}/metadata/{result.slug}.json"
        image_path = result.provider.get("image_path")
        image_cell = f"[image]({_rel(Path(image_path), output_root)})" if image_path else "not called"
        status = result.provider.get("status") or ""
        error = result.provider.get("error_body")
        if error:
            status = f"{status}: {error[:180]}"
        lines.append(
            f"| {result.word.word} | {result.architecture} | "
            f"[prompt]({result.final_provider_prompt_path}) | [metadata]({metadata_rel}) | "
            f"{image_cell} | {'yes' if result.llm_called else 'no'} | "
            f"{'yes' if result.image_provider_called else 'no'} | {status} |"
        )
    _write_text(output_root / "EXPERIMENT_INDEX.md", "\n".join(lines) + "\n", overwrite)


def write_run_summary(
    *,
    results: list[ArchitectureResult],
    output_root: Path,
    source_root: Path | None,
    smoke_source_root: Path | None,
    overwrite: bool,
    command: str,
    args: argparse.Namespace,
    llm_enabled: bool,
    image_enabled: bool,
) -> None:
    successes = [
        r for r in results
        if r.provider.get("status") == "succeeded"
        or (r.provider.get("status") == "skipped_existing_image" and r.provider.get("image_path"))
    ]
    failures = [r for r in results if r.provider.get("called") and r.provider.get("status") != "succeeded"]
    image_attempts = sum(
        len(r.provider.get("attempts") or []) or (1 + int(r.provider.get("retry_count", 0)))
        for r in results
        if r.provider.get("called")
    )
    retry_total = sum(int(r.provider.get("retry_count", 0)) for r in results)
    reused_from_smoke = [r for r in results if r.provider.get("image_reused_from_smoke")]
    newly_attempted = [
        r for r in results
        if r.provider.get("called") and not r.provider.get("image_reused_from_smoke") and r.provider.get("status") != "skipped_existing_image"
    ]
    skipped_existing = [r for r in results if r.provider.get("status") == "skipped_existing_image"]
    expected_rows = len({r.word.word for r in results}) * len(MAIN_ARCHITECTURES)
    stop_status = getattr(args, "consecutive_failure_stop_status", "not_triggered")
    llm_source_command = "not used"
    if source_root:
        source_summary = source_root / "RUN_SUMMARY.md"
        if source_summary.is_file():
            match = re.search(r"^Exact command: `(.+)`", source_summary.read_text(encoding="utf-8-sig"), flags=re.MULTILINE)
            if match:
                llm_source_command = match.group(1)
    lines = [
        "# Run Summary",
        "",
        f"Exact command: `{command}`",
        f"Exact LLM-only command: `{llm_source_command}`",
        f"Exact image-only command: `{command}`" if getattr(args, "run_images_from_existing_prompts", False) else "Exact image-only command: `not used`",
        f"Source prompt root: `{source_root.as_posix() if source_root else 'not used'}`",
        f"Smoke source root: `{smoke_source_root.as_posix() if smoke_source_root else 'not used'}`",
        f"Output image root: `{output_root.as_posix()}`",
        "",
        "Environment flags used:",
        f"- EXPERIMENT_LLM_RUN={'true' if os.environ.get('EXPERIMENT_LLM_RUN') == 'true' else 'not true or unset'}",
        f"- EXPERIMENT_IMAGE_RUN={'true' if os.environ.get('EXPERIMENT_IMAGE_RUN') == 'true' else 'not true or unset'}",
        f"- OPENROUTER_API_KEY={'set' if os.environ.get('OPENROUTER_API_KEY') else 'unset'}",
        f"- KIE_API_KEY={'set' if os.environ.get('KIE_API_KEY') else 'unset'}",
        "",
        "Command flags:",
        f"- dry_run={args.dry_run}",
        f"- run_llm={args.run_llm}",
        f"- run_images={args.run_images}",
        f"- run_images_from_existing_prompts={getattr(args, 'run_images_from_existing_prompts', False)}",
        f"- include_current_baseline={args.include_current_baseline}",
        f"- run_images_current_baseline={args.run_images_current_baseline}",
        f"- overwrite={args.overwrite}",
        "",
        f"LLM calls ran: {'yes' if llm_enabled else 'no'}",
        f"OpenRouter calls ran: {'yes' if llm_enabled else 'no'}",
        f"KIE calls ran: {'yes' if image_enabled else 'no'}",
        f"Image calls ran: {'yes' if image_enabled else 'no'}",
        f"Resolution used: {args.resolution}",
        f"Aspect ratio used: {DEFAULT_IMAGE_ASPECT_RATIO}",
        f"Number of image rows expected: {expected_rows}",
        f"Number reused from smoke: {len(reused_from_smoke)}",
        f"Number newly attempted: {len(newly_attempted)}",
        f"Number skipped existing: {len(skipped_existing)}",
        f"Number of provider attempts: {image_attempts}",
        f"Number of image attempts: {image_attempts}",
        f"Number of successful images: {len(successes)}",
        f"Number of failed images: {len(failures)}",
        f"Retry count total: {retry_total}",
        f"Consecutive-failure stop status: {stop_status}",
        "",
        "Files/functions used:",
        "- `scripts/experiments/gpt_image_2_architecture_experiment.py`",
        "- `cloud_engines.image_engine.gpt_image_2_provider.render_scene_gpt_image_2` for KIE GPT Image-2 image calls when enabled",
        "- `cloud_engines.image_engine.gpt_card_prompts.build_gpt_image_2_prompt` only for optional B0 diagnostic baseline",
        "- OpenRouter chat completions endpoint for D2/D3 LLM calls when enabled",
        "",
        "Failures:",
    ]
    if failures:
        for failure in failures:
            lines.append(
                f"- {failure.architecture} / {failure.word.word}: "
                f"{failure.provider.get('status')} / {failure.provider.get('error_body')}"
            )
    else:
        lines.append("- none")
    retry_lines = [
        r for r in results
        if int(r.provider.get("retry_count", 0)) > 0
    ]
    lines.extend(["", "Retries:"])
    if retry_lines:
        for result in retry_lines:
            lines.append(
                f"- {result.architecture} / {result.word.word}: "
                f"{result.provider.get('retry_count')} retry; reasons={result.provider.get('retry_reasons')}"
            )
    else:
        lines.append("- none")
    lines.extend([
        "",
        "Confirmations:",
        "- Confirmation: no Supabase writes occurred.",
        "- Confirmation: no Supabase Storage uploads occurred.",
        "- Confirmation: no fallback provider was used.",
        "",
        "Provider rerun command template:",
        "`$env:EXPERIMENT_IMAGE_RUN='true'; python scripts/experiments/gpt_image_2_architecture_experiment.py --run-images-from-existing-prompts --source-root "
        + (source_root.as_posix() if source_root else "SOURCE_ROOT")
        + " --output-root "
        + output_root.as_posix()
        + " --style "
        + args.style
        + f" --word-set {args.word_set} --resolution {args.resolution} --overwrite`",
        "",
        "No recommendations are included in this summary.",
    ])
    _write_text(output_root / "RUN_SUMMARY.md", "\n".join(lines) + "\n", overwrite)


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run the local GPT Image-2 architecture experiment.")
    parser.add_argument("--dry-run", action="store_true", help="Generate local artifacts without provider calls.")
    parser.add_argument("--run-llm", action="store_true", help="Run B/C OpenRouter LLM calls when EXPERIMENT_LLM_RUN=true.")
    parser.add_argument("--run-images", action="store_true", help="Run main A/B/C KIE GPT Image-2 image calls when EXPERIMENT_IMAGE_RUN=true.")
    parser.add_argument("--run-images-from-existing-prompts", action="store_true", help="Run KIE GPT Image-2 from a frozen prompt/metadata source root without LLM calls.")
    parser.add_argument("--source-root", type=Path, help="Frozen prompt root for --run-images-from-existing-prompts.")
    parser.add_argument("--smoke-source-root", type=Path, help="Optional prior smoke output root for prompt-hash-matched image reuse.")
    parser.add_argument("--run-images-current-baseline", action="store_true", help="Also spend image calls on optional B0 when included.")
    parser.add_argument("--include-current-baseline", action="store_true", help="Include optional B0 diagnostic baseline.")
    parser.add_argument("--output-root", type=Path, default=default_output_root())
    parser.add_argument("--style", default="Photorealistic")
    parser.add_argument("--word-set", default="fresh_v6_lockin_8", choices=sorted(WORD_SETS))
    parser.add_argument("--only-word", action="append", help="Restrict the run to one word; repeat to select multiple words.")
    parser.add_argument("--resolution", default=DEFAULT_IMAGE_RESOLUTION, choices=["1K", "2K"], help="KIE GPT Image-2 resolution for experiment image calls.")
    parser.add_argument("--overwrite", action="store_true")
    return parser.parse_args(argv)


def command_for_run(argv: list[str] | None) -> str:
    if argv is None:
        return " ".join([sys.executable, *sys.argv])
    return "python scripts/experiments/gpt_image_2_architecture_experiment.py " + " ".join(argv)


def selected_words(word_set: str, only_words: list[str] | None) -> list[WordSpec]:
    source_words = WORD_SETS[word_set]
    if not only_words:
        return source_words
    wanted = {word.casefold() for word in only_words}
    return [word for word in source_words if word.word.casefold() in wanted]


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv)
    if args.run_images_from_existing_prompts and args.run_llm:
        print("--run-llm must not be passed with --run-images-from-existing-prompts", file=sys.stderr)
        return 2
    if args.run_images_from_existing_prompts and args.source_root is None:
        print("--source-root is required with --run-images-from-existing-prompts", file=sys.stderr)
        return 2
    words = selected_words(args.word_set, args.only_word)
    if not words:
        print(f"no matching --only-word values: {args.only_word}", file=sys.stderr)
        return 2
    output_root = args.output_root
    output_root.mkdir(parents=True, exist_ok=True)
    experiment_id = experiment_id_for(output_root)
    llm_enabled = bool(args.run_llm and os.environ.get("EXPERIMENT_LLM_RUN") == "true" and os.environ.get("OPENROUTER_API_KEY"))
    image_flag_passed = bool(args.run_images or args.run_images_from_existing_prompts)
    requested_image_enabled = bool(image_flag_passed and os.environ.get("EXPERIMENT_IMAGE_RUN") == "true")
    image_enabled = bool(requested_image_enabled and os.environ.get("KIE_API_KEY"))
    image_skip_status = None
    if image_flag_passed and os.environ.get("EXPERIMENT_IMAGE_RUN") != "true":
        image_skip_status = "not_called_experiment_image_env_missing"
    elif requested_image_enabled and not os.environ.get("KIE_API_KEY"):
        image_skip_status = "not_called_missing_kie_api_key"
    baseline_image_enabled = bool(image_enabled and args.include_current_baseline and args.run_images_current_baseline)
    llm_model = os.environ.get("EXPERIMENT_LLM_MODEL", DEFAULT_LLM_MODEL)
    command = command_for_run(argv)
    args.consecutive_failure_stop_status = "not_triggered"

    results: list[ArchitectureResult] = []
    if args.run_images_from_existing_prompts:
        llm_enabled = False
        mirror_existing_source(args.source_root, output_root, args.overwrite)
        stop_image_loop = False
        stop_skip_status: str | None = None
        consecutive_provider_500_failures = 0
        for word in words:
            for architecture in MAIN_ARCHITECTURES:
                enabled_for_result = image_enabled and not stop_image_loop
                skip_status_for_result = stop_skip_status if stop_image_loop else image_skip_status
                result = create_existing_prompt_result(
                    source_root=args.source_root,
                    smoke_source_root=args.smoke_source_root,
                    output_root=output_root,
                    architecture=architecture,
                    word=word,
                    overwrite=args.overwrite,
                    image_enabled=enabled_for_result,
                    image_skip_status=skip_status_for_result,
                    resolution=args.resolution,
                    aspect_ratio=DEFAULT_IMAGE_ASPECT_RATIO,
                )
                results.append(result)
                if stop_image_loop:
                    continue
                if len(results) == 1 and provider_config_failure(result.provider):
                    stop_image_loop = True
                    args.consecutive_failure_stop_status = "stopped_after_first_config_failure"
                    stop_skip_status = args.consecutive_failure_stop_status
                    continue
                if provider_failed_after_500_retries(result.provider):
                    consecutive_provider_500_failures += 1
                elif result.provider.get("called"):
                    consecutive_provider_500_failures = 0
                if consecutive_provider_500_failures >= PROVIDER_500_CONSECUTIVE_STOP_LIMIT:
                    stop_image_loop = True
                    args.consecutive_failure_stop_status = (
                        f"stopped_after_{PROVIDER_500_CONSECUTIVE_STOP_LIMIT}_consecutive_provider_500_failures"
                    )
                    stop_skip_status = args.consecutive_failure_stop_status
                    continue
    else:
        for word in words:
            results.append(create_a_result(word, output_root, args.style, experiment_id, args.overwrite, image_enabled, image_skip_status, args.resolution, DEFAULT_IMAGE_ASPECT_RATIO))
            results.append(create_d2_result(word, output_root, args.style, experiment_id, args.overwrite, llm_enabled, image_enabled, image_skip_status, llm_model, args.resolution, DEFAULT_IMAGE_ASPECT_RATIO))
            results.append(create_d4_result(word, output_root, args.style, experiment_id, args.overwrite, llm_enabled, image_enabled, image_skip_status, llm_model, args.resolution, DEFAULT_IMAGE_ASPECT_RATIO))
            if args.include_current_baseline:
                results.append(create_b0_result(word, output_root, args.style, args.overwrite, requested_image_enabled, baseline_image_enabled, image_skip_status, args.resolution, DEFAULT_IMAGE_ASPECT_RATIO))

    report_overwrite = args.overwrite or args.run_images_from_existing_prompts
    populate_images_flat(results, output_root, args.overwrite)
    for result in results:
        write_metadata(result, output_root, experiment_id, args.style, report_overwrite)
    write_index(results, output_root, report_overwrite)
    write_all_prompts(results, output_root, report_overwrite)
    write_run_summary(
        results=results,
        output_root=output_root,
        source_root=args.source_root if args.run_images_from_existing_prompts else None,
        smoke_source_root=args.smoke_source_root,
        overwrite=report_overwrite,
        command=command,
        args=args,
        llm_enabled=llm_enabled,
        image_enabled=image_enabled,
    )
    write_score_sheet(results, output_root, report_overwrite)
    write_contact_sheet_md(results, output_root, report_overwrite)
    write_contact_sheet_png(results, output_root, report_overwrite)
    write_provider_attempts_csv(results, output_root, report_overwrite)
    write_preflight_hygiene(results, output_root, report_overwrite)
    print(f"wrote experiment artifacts to {output_root}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
