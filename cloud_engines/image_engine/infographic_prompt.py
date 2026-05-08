"""Dedicated planner/compiler for GPT Image-2 vocabulary infographics."""

from __future__ import annotations

import hashlib
import json
import logging
import os
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Mapping

import httpx

from src.cost_logger import estimate_openrouter_cost, log_cost

from . import config
from .card_models import CardImageContent
from .storyboard import _repair_json


INFOGRAPHIC_BACKEND_TEMPLATE = "infographic_prompt_v1"
INFOGRAPHIC_PLANNER_MODEL = os.environ.get(
    "INFOGRAPHIC_PLANNER_MODEL",
    "deepseek/deepseek-v4-flash",
)
INFOGRAPHIC_PLANNER_MAX_TOKENS = 1500
INFOGRAPHIC_DENSE_PROMPT_WRITER_MAX_TOKENS = 3000
ORCH_ROOT = Path(__file__).resolve().parents[2]
INFOGRAPHIC_REFERENCE_ASSET_DIR = "cloud_engines/image_engine/assets/infographic_references"
INFOGRAPHIC_REFERENCE_BUCKET = os.environ.get("INFOGRAPHIC_REFERENCE_BUCKET", "videos")
INFOGRAPHIC_REFERENCE_STORAGE_PREFIX = os.environ.get(
    "INFOGRAPHIC_REFERENCE_STORAGE_PREFIX",
    "infographic-references",
)
V4_PROMPT_WARNING_CHARS = 6000
V4_PROMPT_HARD_FAIL_CHARS = 8000

logger = logging.getLogger(__name__)

BANNED_VISIBLE_TERMS = (
    "infographic_card",
    "clear meaning",
    "LLM V1",
    "LLM V2",
    "LLM V3",
    "backend template",
    "prompt template",
    "system prompt",
    "quick mode",
    "renderer profile",
    "metadata",
    "mode names",
    "internal enum values",
    "Knowledge Guide V1",
    "Language Atlas V1",
    "Study Poster V1",
    "Visual Dictionary V1",
    "Museum Exhibit V1",
)

INTERNAL_SAFETY_VISIBLE_PHRASES = (
    "no fake facts",
    "no fake quotes",
    "no fake etymologies",
    "no forced mnemonics",
    "info is verified",
    "this info is verified",
    "teaching real language",
    "no invented facts",
    "keine erfundenen fakten",
    "no invented quotes",
    "keine erfundenen zitate",
    "no fake mnemonics",
    "keine erfundenen mnemonics",
    "keine erfundenen mnemonik",
    "mnemonotechniken",
    "internal rule",
    "safety instruction",
)

INTERNAL_TEMPLATE_VISIBLE_PHRASES = (
    "dictionary header",
    "visual sense callouts",
)

VOCABULARY_FIRST_RULES = (
    "This is a language-learning infographic about the target word, not a general encyclopedia article about the topic.",
    "At least 70% of the card content must teach the word as language: meaning, pronunciation, part of speech, forms / grammar, example sentences, collocations, register, word family, synonyms / contrasts, false friends, common mistakes, usage notes, or learner warnings.",
    "At most 30% may be world/topic knowledge, and only when it directly helps the learner understand or use the word.",
    "Examples must be idiomatic and common. Avoid unnatural examples created only to fit the word.",
    "Use planner-provided examples; the compiler must not invent new example sentences.",
    "For singular countable nouns, avoid absolute article claims; use nuanced wording such as: Im Singular meist mit Artikel: a winner / the winner. Im Plural auch ohne Artikel: winners.",
)

V4_BANNED_VISIBLE_STRINGS = (
    "Zielsprache",
    "Basissprache",
    "target language",
    "base language",
    "backend template",
    "prompt template",
    "model",
    "enum",
    "V1",
    "V2",
    "V3",
    "V4",
    "infographic_card",
    "quick mode",
    "renderer profile",
)

V4_JSON_KEY_STRINGS = (
    "type",
    "style",
    "composition",
    "info_panels",
    "visual_elements",
    "design_goals",
)

V4_LEARNING_MODULE_TERMS = (
    "meaning",
    "bedeutung",
    "pronunciation",
    "aussprache",
    "grammar",
    "grammatik",
    "forms",
    "formen",
    "example",
    "beispiel",
    "collocation",
    "kollokation",
    "register",
    "synonym",
    "contrast",
    "kontrast",
    "word family",
    "wortfamilie",
    "false friend",
    "falsche freunde",
    "common mistake",
    "fehler",
    "usage",
    "gebrauch",
)


@dataclass(frozen=True)
class InfographicTemplate:
    value: str
    label: str
    version: str
    planner_identity: str
    goal: str
    panel_guidance: str
    visual_direction: str
    compiler_instruction: str
    pass_count: int = 1
    role: str | None = None
    two_pass_planning: str | None = None
    hero_options: tuple[str, ...] = ()
    text_budget: tuple[str, ...] = ()
    anti_pattern: str | None = None
    footer_requirement: str | None = None
    visual_frame: str | None = None
    extra_compiler_instruction: str | None = None
    categories_are_guidance_only: bool = False
    template_reference_id: str | None = None
    reference_asset_path: str | None = None
    reference_url: str | None = None
    reference_mode: str | None = None
    fallback_style_description: str | None = None
    compatible_planner_template: str | None = None


@dataclass(frozen=True)
class InfographicPromptResult:
    prompt: str
    model: str
    raw_plan: str
    planner_plan: dict[str, Any]
    infographic_template: str
    usage: dict[str, Any] | None = None
    request_id: str | None = None
    validator_passed: bool | None = None
    validator_errors: list[str] = field(default_factory=list)
    validator_hard_errors: list[str] = field(default_factory=list)
    validator_warnings: list[str] = field(default_factory=list)
    validator_retry_count: int = 0
    prompt_attempt_count: int = 1
    prompt_rule_ratio_estimate: float | None = None
    dense_editorial_word_category: str | None = None


@dataclass(frozen=True)
class InfographicTemplateOption:
    value: str
    label: str
    version: str


def _v1(
    value: str,
    label: str,
    identity: str,
    goal: str,
    panels: str,
    visual: str,
    compiler: str,
) -> InfographicTemplate:
    return InfographicTemplate(
        value=value,
        label=label,
        version="v1",
        planner_identity=identity,
        goal=goal,
        panel_guidance=panels,
        visual_direction=visual,
        compiler_instruction=compiler,
    )


def _v2(
    value: str,
    label: str,
    role: str,
    two_pass: str,
    hero_options: tuple[str, ...],
    panels: str,
    text_budget: tuple[str, ...],
    visual_frame: str,
    anti_pattern: str,
    footer_requirement: str,
    compiler: str,
) -> InfographicTemplate:
    return InfographicTemplate(
        value=value,
        label=label,
        version="v2",
        planner_identity=label,
        goal="Use two-pass adaptive planning for this word and learner pair.",
        panel_guidance=panels,
        visual_direction=visual_frame,
        compiler_instruction=compiler,
        pass_count=2,
        role=role,
        two_pass_planning=two_pass,
        hero_options=hero_options,
        text_budget=text_budget,
        anti_pattern=anti_pattern,
        footer_requirement=footer_requirement,
        visual_frame=visual_frame,
        categories_are_guidance_only=True,
    )


def _v3_reference(
    value: str,
    label: str,
    role: str,
    two_pass: str,
    hero_options: tuple[str, ...],
    panels: str,
    text_budget: tuple[str, ...],
    visual_frame: str,
    anti_pattern: str,
    footer_requirement: str,
    compiler: str,
    *,
    template_reference_id: str,
    reference_filename: str,
    fallback_style_description: str,
) -> InfographicTemplate:
    return InfographicTemplate(
        value=value,
        label=label,
        version="v3",
        planner_identity=label,
        goal="Use two-pass planning, then compile the result into the selected skeleton reference layout.",
        panel_guidance=panels,
        visual_direction=visual_frame,
        compiler_instruction=compiler,
        pass_count=2,
        role=role,
        two_pass_planning=two_pass,
        hero_options=hero_options,
        text_budget=text_budget,
        anti_pattern=anti_pattern,
        footer_requirement=footer_requirement,
        visual_frame=visual_frame,
        extra_compiler_instruction=REFERENCE_GUIDED_COMPILER_RULES,
        categories_are_guidance_only=True,
        template_reference_id=template_reference_id,
        reference_asset_path=f"{INFOGRAPHIC_REFERENCE_ASSET_DIR}/{reference_filename}",
        reference_mode="skeleton",
        fallback_style_description=fallback_style_description,
        compatible_planner_template=INFOGRAPHIC_BACKEND_TEMPLATE,
    )


def _v4_dense_editorial() -> InfographicTemplate:
    return InfographicTemplate(
        value="infographic_dense_editorial_v4",
        label="V4 · Dense Editorial",
        version="v4",
        planner_identity="Dense Editorial V4",
        goal="Write a rich provider-ready editorial prompt for a dense vocabulary encyclopedia infographic.",
        panel_guidance="Use 8-12 visible modules when the word supports them; use fewer larger modules for simple words. Prioritize practical lexical learning.",
        visual_direction="Horizontal 16:9 premium editorial encyclopedia infographic with high information density, central visual anchor, modular panels, icons, callouts, detail sections, and summary modules.",
        compiler_instruction="The final prompt is a dense provider-ready image prompt. The compiler only enforces orientation, vocabulary-first constraints, hard bans, and metadata.",
        pass_count=1,
        role="You are a senior editorial infographic prompt writer for language-learning vocabulary posters.",
        text_budget=(),
        anti_pattern="Avoid sparse fixed skeletons, generic topic encyclopedia pages, visible metadata labels, copied JSON keys, and filler panels.",
        footer_requirement="No generic AI-generated or educational-card footer.",
        compatible_planner_template=INFOGRAPHIC_BACKEND_TEMPLATE,
    )


REFERENCE_GUIDED_COMPILER_RULES = "\n".join(
    [
        "Use the attached reference image only as visual scaffolding.",
        "Preserve from the reference: overall composition, panel rhythm, palette, border style, typography mood, icon style, density level, and premium encyclopedia / handbook feel.",
        "Do not preserve from the reference: old word, old translation, old labels, old footer, old examples, old etymology, old mnemonic, or any readable reference text.",
        "If the reference contains any readable text, treat it as placeholder only and ignore it.",
        "All visible text must come from the planner content.",
        "Do not copy text from the reference image.",
        "Panel flexibility: preserve the reference style and rhythm, but panel sizes may expand or shrink to fit the planner content.",
        "If fewer panels are needed, use breathing room or enlarge the central visual area. Do not invent filler panels just to match the reference.",
    ]
)


INFOGRAPHIC_TEMPLATES: dict[str, InfographicTemplate] = {
    "infographic_knowledge_guide_v1": _v1(
        "infographic_knowledge_guide_v1",
        "V1 · Knowledge Guide",
        "Knowledge Guide V1",
        "Create the faithful vocabulary equivalent of a premium encyclopedia or field-guide page.",
        "Choose the most useful 6-8 panels from: Quick Profile, Core Meaning, Senses, Usage Behavior, Common Collocations, Synonyms / Contrasts, Word Anatomy, Origin Trail, Common Mistake, Cultural / Literary Note, Memory Cue, Why It Matters.",
        "Premium educational field-guide poster. Cream/off-white background, crisp panel grid, refined serif title, clean sans-serif panel text, restrained 3-color palette, consistent iconography, central visual anchor with callouts.",
        "The final image should feel like a beautiful encyclopedia spread about a word, with dense but readable panels surrounding a central metaphorical or typographic visual anchor.",
    ),
    "infographic_language_atlas_v1": _v1(
        "infographic_language_atlas_v1",
        "V1 · Language Atlas",
        "Language Atlas V1",
        "Treat the word as a territory on a map of the target language.",
        "Choose 5-7 map-like sections from: Territory of Meaning, Neighboring Words, Border Warnings, Trade Routes, Climate / Register, Origin Route, Modern Habitat, Sense Districts, Travel Advisory, Memory Landmark.",
        "Old-map or modern linguistic atlas aesthetic. Title as map cartouche, central map/territory metaphor, route lines, small legends, compass/gauge icons, readable labels.",
        "The final image should look like a language map or semantic atlas, not a geography lesson unless geography is actually relevant.",
    ),
    "infographic_study_poster_v1": _v1(
        "infographic_study_poster_v1",
        "V1 · Study Poster",
        "Study Poster V1",
        "Create a beautiful, practical classroom/reference poster that teaches how to understand and use the word.",
        "Use 5-7 practical sections from: Meaning, Pronunciation, Forms, Example Sentences, Collocations, Use It / Avoid It, Common Mistake, Mini Contrast, Memory Cue, 10-Second Review.",
        "Premium language textbook poster, clear, friendly but not childish. Strong section headers, clean color bands, icons, examples in neat cards, high readability.",
        "The final image should be the most practically useful version for a learner who wants to remember and use the word correctly tomorrow.",
    ),
    "infographic_visual_dictionary_v1": _v1(
        "infographic_visual_dictionary_v1",
        "V1 · Visual Dictionary",
        "Visual Dictionary V1",
        "Create a serious illustrated dictionary/lexicon entry, visually rich but authoritative.",
        "Choose relevant sections: Dictionary Header, Numbered Senses, Visual Sense Callouts, Etymology, Synonyms / Antonyms / Near-Misses, Usage Notes, Word Family, Collocations, Common Errors, Expert Note.",
        "Beautiful reference-book aesthetic: cream page, classic serif typography, precise editorial grid, small spot illustrations, thin rules, refined labels.",
        "The final image should feel trustworthy and reference-grade, like a premium illustrated dictionary page, not a playful mnemonic poster.",
    ),
    "infographic_museum_exhibit_v1": _v1(
        "infographic_museum_exhibit_v1",
        "V1 · Museum Exhibit",
        "Museum Exhibit V1",
        "Curate the word as if it were an artifact in a museum.",
        "Choose 4-6 exhibit-style sections from: Exhibit Title, Origin Story, Cultural Context, Meaning Today, Curator's Note, Related Artifacts, Usage Plaque, Warning Label, Memory Object.",
        "Elegant museum placard / exhibit board. Dark neutral or warm paper background, refined serif title, curated artifact-like central image, gold/warm accent, calm hierarchy.",
        "The final image should feel like a museum exhibit about the word's life, not a generic classroom poster. Use only reliable cultural/historical claims.",
    ),
    "infographic_knowledge_guide_v2": _v2(
        "infographic_knowledge_guide_v2",
        "V2 · Knowledge Guide",
        "You are a senior lexicographer at a fine reference publisher. You refuse to write a generic page.",
        "Pass 1 - Reflect on what makes the word specifically worth knowing for the base-language learner. Pass 2 - Select 4 to 8 panels and name each panel in the base language.",
        ("typographic_headword", "metaphorical_vignette", "diagrammatic_anchor"),
        "Guidance categories: Origin, Structure, Life, Kin, Traps, Music, Gravity. Name panels naturally for this word.",
        ("Panel header: 4 words maximum", "Panel body: 25 words maximum", "Footer line: 12 words maximum"),
        "Cream field-guide page with subtle paper grain, refined serif hero word, clean sans-serif panels, restrained 3-color palette plus white, consistent iconography.",
        'Avoid the "interchangeable encyclopedia entry" failure: every panel must feel specifically about this word.',
        "Footer requirement: one short evocative base-language line, 12 words or fewer, not a definition.",
        "The final image is a beautifully made field-guide page about a single word. Honour the planner's hero treatment choice, panel headers, panel content, and footer line as written.",
    ),
    "infographic_language_atlas_v2": _v2(
        "infographic_language_atlas_v2",
        "V2 · Language Atlas",
        "You are a cartographer of meaning. Every word is terrain to you.",
        "Pass 1 - Sketch the semantic terrain and choose the cartographic metaphor. Pass 2 - Select 5 to 7 features and write labels and micro-captions in the base language.",
        ("territorial_name", "celestial_naming", "network_node"),
        "Guidance categories: Sense regions, Border zones, Trade routes, Climate bands, Origin route, Modern habitat, Travel advisory, Memory landmark.",
        ("Feature label: 3 words maximum", "Feature caption: 15 words maximum", "Legend entry: 8 words maximum", "Footer line: 12 words maximum"),
        "Atlas-page aesthetic, either old-cartographic or modern linguistic atlas. Use a title cartouche or banner, legend, compass or scale.",
        "Avoid placing the word on a literal Earth map. The map metaphor must serve meaning; a word like threshold does not live in Switzerland.",
        "Footer requirement: a compass-rose or legend line in the base language summarising the territory.",
        "The final image is a semantic atlas, not a geography lesson. The cartographic metaphor organises meaning, usage, and word relationships.",
    ),
    "infographic_study_poster_v2": _v2(
        "infographic_study_poster_v2",
        "V2 · Study Poster",
        "You are a master language teacher who has taught the target language to base-language speakers for years.",
        "Pass 1 - Identify the specific learning challenges this word poses for the learner pair. Pass 2 - Build the poster around resolving those challenges with 4 to 6 sections.",
        ("top_banner", "centered_word"),
        "Guidance categories: Meaning, Pronunciation, Forms, Example sentences, Collocations, Use it / avoid it, Common mistake, Mini contrast, Memory cue.",
        ("Section header: 5 words maximum", "Body line: one or two short sentences, max 30 words total", "Example sentence: one per slot, plus its short gloss", "Footer line: 12 words maximum"),
        "Premium classroom wall-poster aesthetic. Bright but disciplined palette, three colors plus white, clear bands or grid, friendly without being childish.",
        'Avoid the "vocabulary list" feel. The poster must solve this specific learner problem.',
        "Footer requirement: a single base-language 'you will know it when...' line, 12 words or fewer.",
        "The final image is a beautifully designed teaching poster. Honour the planner's hero treatment, section headers, section content, and footer as written.",
    ),
    "infographic_visual_dictionary_v2": _v2(
        "infographic_visual_dictionary_v2",
        "V2 · Visual Dictionary",
        "You are a senior editor at a fine reference publisher. Restraint and precision are the highest editorial virtues.",
        "Pass 1 - Identify which senses are truly distinct. Pass 2 - Design the entry around actual sense structure or facets.",
        ("dictionary_headword", "illuminated_headword"),
        "Guidance categories: Numbered senses, Etymology, Synonyms / antonyms / near-misses, Word family, Collocations, Usage notes, Common errors, Editor's note.",
        ("Section header: 4 words maximum", "Sense definition: 15 words maximum per sense", "Example sentence: one per sense, with short gloss underneath", "Footer line: 18 words maximum"),
        "A single page from a beautifully made physical reference book. Cream paper, classic serif, hairline rules, one restrained accent, small line-art spot illustrations.",
        "Avoid the Wiktionary or Wikipedia screenshot aesthetic. Make it a restrained physical reference book page.",
        "Footer requirement: a single editor's note in the base language, 18 words or fewer.",
        "The final image is one page of a fine reference book. Honour the planner's hero treatment, sense structure, section content, and editor's note as written.",
    ),
    "infographic_museum_exhibit_v2": _v2(
        "infographic_museum_exhibit_v2",
        "V2 · Museum Exhibit",
        "You are a museum curator who chose this word because it deserves a wall.",
        "Pass 1 - Justify why the word merits exhibit treatment. Pass 2 - Design 4 to 6 placard sections; the curator's note is mandatory and written last.",
        ("engraved_name", "artifact_label"),
        "Guidance categories: Origin story, Cultural context, Historical voices, Modern habitat, Curator's note, Related artifacts, Visiting hours, Warning label.",
        ("Section header: 4 words maximum", "Section body: 2 to 3 short sentences, max 35 words", "Curator's note: 25 words maximum", "Footer line: 15 words maximum"),
        "Museum placard aesthetic. Dark warm neutral or aged-paper background, one accent, refined serif title, central artifact-like image if used, calm hierarchy.",
        'Avoid generic "old-looking" filters: sepia, scrolls, gothic letters, antique-shop styling.',
        "Footer requirement: a curator's signature insight in the base language, 15 words or fewer.",
        "The final image is a museum placard about a word's life. Honour the planner's hero treatment, section names, section content, curator's note, and footer as written.",
    ),
    "infographic_language_atlas_v3_reference": _v3_reference(
        "infographic_language_atlas_v3_reference",
        "V3 · Language Atlas Reference",
        "You are a cartographer of meaning adapting a clean semantic-atlas skeleton.",
        "Pass 1 - Sketch the semantic terrain and choose the cartographic metaphor. Pass 2 - Select 5 to 7 features and write labels and micro-captions in the base language.",
        ("territorial_name", "celestial_naming", "network_node"),
        "Guidance categories: Sense regions, Border zones, Trade routes, Climate bands, Origin route, Modern habitat, Travel advisory, Memory landmark.",
        ("Feature label: 3 words maximum", "Feature caption: 15 words maximum", "Legend entry: 8 words maximum", "Footer line: 12 words maximum"),
        "Reference-guided atlas page. Preserve title cartouche, central semantic map area, side panels, compass/legend style, parchment palette, and fine cartographic rhythm.",
        "Avoid placing the word on a literal Earth map. Regenerate the semantic territory for the new word; map regions may change shape and count.",
        "Footer requirement: a compass-rose or legend line in the base language summarising the territory.",
        "The final image is a semantic atlas using the skeleton as structure only. Regenerate the central semantic territory and all labels for the new word.",
        template_reference_id="language_atlas_reference_v3a",
        reference_filename="language_atlas_reference_v3a.png",
        fallback_style_description="Clean 16:9 language-atlas skeleton with a parchment background, large title cartouche, central semantic map territory, surrounding modular panels, compass rose, legend/footer band, route lines, and muted sepia/navy/sage/ochre ink accents.",
    ),
    "infographic_study_knowledge_v3_reference": _v3_reference(
        "infographic_study_knowledge_v3_reference",
        "V3 · Study / Knowledge Reference",
        "You are a master language teacher adapting a clean premium study-poster skeleton.",
        "Pass 1 - Identify the specific learning challenges this word poses for the learner pair. Pass 2 - Build the poster around resolving those challenges with 4 to 6 practical sections.",
        ("top_banner", "centered_word"),
        "Guidance categories: Meaning, Pronunciation, Forms, Example sentences, Collocations, Use it / avoid it, Common mistake, Mini contrast, Review.",
        ("Section header: 5 words maximum", "Body line: one or two short sentences, max 30 words total", "Example sentence: one per slot, plus its short gloss", "Footer line: 12 words maximum"),
        "Reference-guided premium study poster. Preserve clean title/subtitle area, central visual anchor, left/right learning panels, rounded cards, strong color bands, and footer review strip.",
        'Avoid the "vocabulary list" feel. Regenerate the central visual anchor for the new word and use practical learner sections from the planner.',
        "Footer requirement: a single base-language review line, 12 words or fewer.",
        "The final image is a premium study / knowledge poster using the skeleton as structure only. Regenerate the central visual anchor and all learning content for the new word.",
        template_reference_id="study_knowledge_reference_v3a",
        reference_filename="study_knowledge_reference_v3a.png",
        fallback_style_description="Clean 16:9 study / knowledge poster skeleton with off-white background, large hero word area, subtitle band, central visual anchor frame, left and right rounded learning panels, practical learner sections, strong muted color bands, soft shadows, refined icons, and footer review strip.",
    ),
    "infographic_museum_exhibit_v3_reference": _v3_reference(
        "infographic_museum_exhibit_v3_reference",
        "V3 · Museum Exhibit Reference",
        "You are a museum curator adapting a clean modern exhibit-placard skeleton.",
        "Pass 1 - Justify why the word merits exhibit treatment. Pass 2 - Design 4 to 6 placard sections; the curator's note is mandatory and written last.",
        ("engraved_name", "artifact_label"),
        "Guidance categories: Origin story, Cultural context, Modern habitat, Curator's note, Related artifacts, Usage plaque, Warning note.",
        ("Section header: 4 words maximum", "Section body: 2 to 3 short sentences, max 35 words", "Curator's note: 25 words maximum", "Footer line: 15 words maximum"),
        "Reference-guided museum placard. Preserve dark warm placard atmosphere, gold trim, central artifact frame, refined serif title zone, curated panels, and calm premium hierarchy.",
        'Avoid generic "old-looking" filters: sepia scrolls, gothic letters, antique-shop styling. Regenerate the central artifact for the new word.',
        "Footer requirement: a curator's signature insight in the base language, 15 words or fewer.",
        "The final image is a modern museum exhibit placard using the skeleton as structure only. Regenerate the artifact and all placard text for the new word.",
        template_reference_id="museum_exhibit_reference_v3a",
        reference_filename="museum_exhibit_reference_v3a.png",
        fallback_style_description="Clean 16:9 modern museum exhibit placard skeleton with dark warm matte background, refined serif title area, subtitle zone, central artifact frame, surrounding museum-label panels, gold/warm ink borders, icon medallions, subtle texture, and footer band.",
    ),
    "infographic_dense_editorial_v4": _v4_dense_editorial(),
}

INFOGRAPHIC_TEMPLATE_OPTIONS = tuple(
    InfographicTemplateOption(value=item.value, label=item.label, version=item.version)
    for item in INFOGRAPHIC_TEMPLATES.values()
)


def infographic_template(value: str | None) -> InfographicTemplate:
    return INFOGRAPHIC_TEMPLATES.get(_clean(value), INFOGRAPHIC_TEMPLATES["infographic_knowledge_guide_v1"])


def infographic_template_label(value: str | None) -> str:
    return infographic_template(value).label


USER_FACING_INFOGRAPHIC_TEMPLATE_LABELS = {
    "infographic_study_poster_v2": "Study Poster",
    "infographic_visual_dictionary_v2": "Visual Dictionary",
    "infographic_language_atlas_v2": "Language Atlas",
    "infographic_museum_exhibit_v2": "Museum Exhibit",
    "infographic_dense_editorial_v4": "Dense Encyclopedia",
}


def infographic_template_user_label(value: str | None) -> str:
    template = infographic_template(value)
    return USER_FACING_INFOGRAPHIC_TEMPLATE_LABELS.get(template.value, template.label)


def infographic_template_requires_reference(value: str | None) -> bool:
    template = infographic_template(value)
    return template.version == "v3" and template.reference_mode == "skeleton"


def infographic_template_reference(value: str | None) -> dict[str, Any] | None:
    template = infographic_template(value)
    if not template.template_reference_id or not template.reference_asset_path:
        return None
    reference_url = _template_reference_url(template)
    return {
        "template_reference_id": template.template_reference_id,
        "reference_asset_path": template.reference_asset_path,
        "reference_url": reference_url,
        "reference_mode": template.reference_mode,
        "fallback_style_description": template.fallback_style_description,
        "compatible_planner_template": template.compatible_planner_template,
    }


def infographic_template_reference_for_render(value: str | None) -> dict[str, Any] | None:
    reference = infographic_template_reference(value)
    if not reference:
        return None
    asset_path = _clean(reference.get("reference_asset_path"))
    asset_exists = bool(asset_path and (ORCH_ROOT / asset_path).exists())
    reference["asset_exists"] = asset_exists
    resolved_url = _clean(reference.get("reference_url"))
    if resolved_url and not resolved_url.startswith("https://"):
        reference["reference_url"] = None
        reference["reference_url_error"] = f"reference URL is not HTTPS: {resolved_url}"
    if asset_exists and not reference.get("reference_url"):
        url, error, bucket, storage_key = _upload_reference_asset_to_storage(asset_path)
        reference["reference_url"] = url
        reference["reference_url_error"] = error
        reference["reference_bucket"] = bucket
        reference["reference_storage_key"] = storage_key
    return reference


def _learning_value(value: Any) -> str | None:
    text = _clean(value)
    if not text or _is_internal_safety_text(text):
        return None
    return text


def _learning_first(*values: Any) -> str | None:
    for value in values:
        text = _learning_value(value)
        if text:
            return text
    return None


def _split_learning_items(value: Any) -> list[str]:
    items: list[str] = []
    for raw in _iter_list_items(value):
        text = _learning_value(raw)
        if not text:
            continue
        parts = [part.strip() for part in re.split(r";|\n", text) if part.strip()]
        items.extend(part for part in parts if not _is_internal_safety_text(part))
    return items


def _dedupe_strings(values: list[str], limit: int = 8) -> list[str]:
    result: list[str] = []
    seen: set[str] = set()
    for value in values:
        text = _learning_value(value)
        if not text:
            continue
        key = text.casefold()
        if key in seen:
            continue
        seen.add(key)
        result.append(text)
        if len(result) >= limit:
            break
    return result


def _strip_example_prefix(text: str) -> str:
    return re.sub(
        r"^\s*(?:english\s+example|example|beispiel|satz)\s*:\s*",
        "",
        text,
        flags=re.IGNORECASE,
    ).strip()


def _example_from_text(text: str) -> dict[str, str] | None:
    cleaned = _strip_example_prefix(text)
    if not cleaned:
        return None
    for separator in (" = ", " - "):
        if separator in cleaned:
            left, right = cleaned.split(separator, 1)
            target = _learning_value(left)
            gloss = _learning_value(right)
            if target or gloss:
                example: dict[str, str] = {}
                if target:
                    example["target"] = target
                if gloss:
                    example["gloss"] = gloss
                return example
    target = _learning_value(cleaned)
    return {"target": target} if target else None


def _planner_learning_entries(plan: Mapping[str, Any]) -> list[tuple[str, str]]:
    entries: list[tuple[str, str]] = []
    panels = plan.get("panels")
    if isinstance(panels, list):
        for raw in panels[:12]:
            if not isinstance(raw, Mapping):
                continue
            label = " ".join(
                value
                for value in (
                    _learning_value(raw.get("header") or raw.get("title")),
                    _learning_value(raw.get("type")),
                )
                if value
            )
            for text in _split_learning_items(raw.get("text")):
                entries.append((label, text))
    composition = plan.get("composition")
    if isinstance(composition, Mapping):
        for key in ("info_panels", "detail_sections", "summary_modules"):
            raw_items = composition.get(key)
            if not isinstance(raw_items, list):
                continue
            for raw in raw_items[:12]:
                if not isinstance(raw, Mapping):
                    continue
                label = _learning_first(raw.get("title"), raw.get("header"), raw.get("name")) or key
                for text in _split_learning_items(raw.get("content") or raw.get("text") or raw.get("body")):
                    entries.append((label, text))
    return entries


def _first_entry_text(entries: list[tuple[str, str]], *terms: str) -> str | None:
    lowered_terms = tuple(term.casefold() for term in terms)
    for label, text in entries:
        lowered_label = label.casefold()
        if any(term in lowered_label for term in lowered_terms):
            return text
    return None


def _examples_from_entries(entries: list[tuple[str, str]]) -> list[dict[str, str]]:
    examples: list[dict[str, str]] = []
    for label, text in entries:
        if "example" not in label.casefold() and "beispiel" not in label.casefold():
            continue
        example = _example_from_text(text)
        if example:
            examples.append(example)
    return examples[:4]


def _collocations_from_entries(entries: list[tuple[str, str]]) -> list[str]:
    values: list[str] = []
    for label, text in entries:
        label_lower = label.casefold()
        if "collocation" not in label_lower and "kollokation" not in label_lower:
            continue
        values.extend(_split_learning_items(text))
    return _dedupe_strings(values)


def build_infographic_learning_metadata(
    *,
    content: CardImageContent | None,
    planner_plan: Mapping[str, Any],
    infographic_template: str,
    base_language_intended: str | None,
    target_language: str | None,
) -> dict[str, Any]:
    template = globals()["infographic_template"](infographic_template)
    entries = _planner_learning_entries(planner_plan)
    summary: dict[str, Any] = {
        "template": template.value,
        "template_label": infographic_template_user_label(template.value),
    }
    headword = _learning_first(planner_plan.get("title"), getattr(content, "word", None))
    translation = _learning_first(planner_plan.get("translation"), getattr(content, "translation", None))
    base_language = _learning_first(
        planner_plan.get("base_language"),
        base_language_intended,
        getattr(content, "base_language", None),
    )
    target = _learning_first(planner_plan.get("target_language"), target_language, getattr(content, "language", None))
    fields = (
        ("headword", headword),
        ("translation", translation),
        ("base_language", base_language),
        ("target_language", target),
        ("part_of_speech", _learning_first(planner_plan.get("part_of_speech"), getattr(content, "pos", None))),
        ("pronunciation", _learning_first(planner_plan.get("pronunciation"), planner_plan.get("ipa"))),
        ("etymology", _learning_first(planner_plan.get("etymology"), getattr(content, "etymology", None))),
        ("usage_note", _first_entry_text(entries, "usage", "register", "context", "note")),
        ("common_mistake", _first_entry_text(entries, "common mistake", "mistake", "fehler", "false friend", "trap")),
        ("memory_cue", _first_entry_text(entries, "memory", "mnemonic", "merk")),
        (
            "footer_takeaway",
            _learning_first(planner_plan.get("footer_line"), _first_entry_text(entries, "takeaway", "summary", "footer")),
        ),
    )
    for key, value in fields:
        if value:
            summary[key] = value
    examples = _examples_from_entries(entries)
    if examples:
        summary["example_sentences"] = examples
    collocations = _collocations_from_entries(entries)
    if collocations:
        summary["collocations"] = collocations
    return summary


def _template_lexical_requirements(template_value: str) -> tuple[str, ...]:
    if "language_atlas" in template_value:
        return (
            "Language Atlas must include at least 4 lexical-learning sections from: meaning region / core sense, border zones / near-misses / false friends, trade routes / collocations, climate/register, modern habitat / where the word is used, origin route if reliable.",
            "For topic-like nouns such as chess, apple, or table: Do not turn the card into a subject encyclopedia. Teach the word first, topic second.",
        )
    if "study_poster" in template_value or "study_knowledge" in template_value:
        return (
            "Study / Knowledge Poster must include meaning, pronunciation if available/reliable, grammar/forms, 1-2 target-language examples with base-language glosses, collocations, and a common mistake or usage warning.",
        )
    if "museum_exhibit" in template_value:
        return (
            "Museum Exhibit must still teach the word as language: current usage, related words or contrasts, one example or usage plaque, and a curator note about nuance.",
            "Use origin or cultural notes only if reliable. Do not turn plain words into over-poetic fake museum exhibits.",
        )
    if "visual_dictionary" in template_value:
        return (
            "Visual Dictionary must distinguish senses, synonyms/near-misses, grammar/usage, examples, and word family.",
            "Avoid rendering internal section names such as dictionary scaffolding or visual callout labels as visible headers.",
        )
    return ()


def build_infographic_planner_system_prompt(infographic_template: str) -> str:
    template = globals()["infographic_template"](infographic_template)
    lines = [
        "You are the planning LLM for a GPT Image-2 vocabulary infographic.",
        "Create a compact JSON object only. No markdown.",
        "Global rules:",
        "- Horizontal 16:9 educational vocabulary knowledge poster.",
        "- Not a mnemonic card, dictionary screenshot, or hero image plus labels.",
        "- The learner should inspect it for 30 seconds.",
        "- Explanatory text, headers, labels, captions, notes, and descriptions must be in the learner's base language.",
        "- Only the target word, target-language forms, and target-language example sentences may appear in the target language.",
        "- The title/headword must exactly equal the target word from the user prompt. Do not swap it with the translation.",
        "- The translation/subtitle must exactly equal the base-language gloss from the user prompt. Do not swap it with the target word.",
        "- Never invent facts, quotes, etymologies, or mnemonics. Omit weak mnemonics.",
        "- Prefer 6-8 compact panels unless the chosen template specifies fewer.",
        "",
        "Vocabulary-first rule:",
        *VOCABULARY_FIRST_RULES,
        *_template_lexical_requirements(template.value),
        "",
        f"Planner identity: {template.planner_identity}",
        f"Goal: {template.goal}",
        f"Panel guidance: {template.panel_guidance}",
        f"Visual direction: {template.visual_direction}",
    ]
    if template.role:
        lines.append(f"Planner role: {template.role}")
    if template.two_pass_planning:
        lines.append(f"Two-pass planning: {template.two_pass_planning}")
    if template.hero_options:
        lines.append("Hero treatment options: " + ", ".join(template.hero_options))
        lines.append("Pick one hero treatment and record it in hero_treatment.")
    if template.categories_are_guidance_only:
        lines.append("Panel categories are guidance only. Write natural panel headers in the base language.")
    if template.text_budget:
        lines.append("Text budget:")
        lines.extend(f"- {item}" for item in template.text_budget)
    if template.anti_pattern:
        lines.append(f"Anti-pattern to avoid: {template.anti_pattern}")
    if template.footer_requirement:
        lines.append(template.footer_requirement)
    lines.extend(
        [
            "",
            "Return JSON with these keys:",
            "title, translation, base_language, target_language, infographic_template, visual_anchor, panels, footer_line, avoid.",
            "Each panel: header, type, text (array of short strings), visual_note.",
            "For two-pass templates also include analysis_summary and hero_treatment.",
        ]
    )
    return "\n".join(lines)


def build_infographic_planner_user_prompt(
    *,
    content: CardImageContent,
    infographic_template: str,
) -> str:
    template = globals()["infographic_template"](infographic_template)
    base_language = content.base_language or "English"
    return "\n".join(
        [
            f"Target word/headword ({content.language}): {content.word}",
            f"Translation/subtitle ({base_language}): {content.translation}",
            f"Base language: {base_language}",
            f"Target language: {content.language}",
            f"Part of speech: {content.pos or 'unknown'}",
            f"Known image scene / visual clue: {content.image_scene or 'none'}",
            f"Known mnemonic: {content.mnemonic or 'none'}",
            f"Known etymology: {content.etymology or 'none'}",
            f"Template value for backend metadata: {template.value}",
            "Use the known content only when it is reliable. Do not fabricate missing facts.",
        ]
    )


def build_dense_editorial_prompt_writer_system_prompt() -> str:
    return "\n".join(
        [
            "You are an editorial art director for a premium vocabulary-learning encyclopedia.",
            "Write one direct natural-language image prompt for a dense but readable 16:9 infographic.",
            "Make it beautiful, modular, and information-rich. Teach the target word as language first.",
            "Do not output JSON, markdown, code fences, or structural key names.",
            "Keep the prompt compact, usually 2500-4500 characters.",
            "Use only modules relevant to this word.",
            "Include common, idiomatic examples and practical collocations when useful.",
            "Avoid fake facts, fake quotes, fake etymologies, and forced mnemonics.",
        ]
    )


def build_dense_editorial_prompt_writer_user_prompt(
    *,
    content: CardImageContent,
    infographic_template: str,
) -> str:
    base_language = content.base_language or "English"
    return "\n".join(
        [
            f"Target word/headword ({content.language}): {content.word}",
            f"Translation/subtitle ({base_language}): {content.translation}",
            f"Base language for explanations: {base_language}",
            f"Target language: {content.language}",
            f"Part of speech: {content.pos or 'unknown'}",
            f"Known image scene / visual clue: {content.image_scene or 'none'}",
            f"Known mnemonic: {content.mnemonic or 'none'}",
            f"Known etymology: {content.etymology or 'none'}",
            f"Internal template id, do not mention visibly: {infographic_template}",
            "The final visible title must be the target word, and the visible subtitle must be the translation/gloss.",
            "For topic-like nouns, teach the word's usage first and include only small helpful topic context.",
            "Mention that at least 70% is word-as-language learning and at most 30% is topic context.",
        ]
    )


def build_infographic_compiler_prompt(
    *,
    content: CardImageContent,
    plan: Mapping[str, Any],
    infographic_template: str,
) -> str:
    return compile_infographic_prompt(
        content=content,
        plan=plan,
        infographic_template=infographic_template,
    )


def compile_infographic_prompt(
    *,
    content: CardImageContent,
    plan: Mapping[str, Any],
    infographic_template: str,
) -> str:
    template = globals()["infographic_template"](infographic_template)
    base_language = _clean(content.base_language) or _clean(plan.get("base_language")) or "English"
    target_language = _clean(content.language) or _clean(plan.get("target_language")) or "target language"
    title = _clean(content.word) or _clean(plan.get("title"))
    translation = _clean(content.translation) or _clean(plan.get("translation"))
    if template.version == "v4":
        return _compile_v4_dense_editorial_prompt(
            content=content,
            plan=plan,
            base_language=base_language,
            target_language=target_language,
            title=title,
            translation=translation,
        )
    if infographic_template_requires_reference(template.value):
        return _compile_v3_reference_prompt(
            content=content,
            plan=plan,
            template=template,
            base_language=base_language,
            target_language=target_language,
            title=title,
            translation=translation,
        )
    panels = _panel_lines(plan.get("panels"))
    hero = _clean(plan.get("hero_treatment"))
    lines = [
        "Create a horizontal 16:9 educational infographic poster for a vocabulary learner.",
        "Use the supplied content is the source of truth; do not add unprovided facts to fill space.",
        "Allow designer freedom in composition, spacing, icons, arrows, callouts, and visual hierarchy.",
        "Use short readable text, not paragraphs. Keep hierarchy premium, editorial, and uncluttered.",
        f"Large title/headword, spelled exactly: {title}.",
        f"Translation/subtitle, spelled exactly: {translation}.",
        "Orientation rule: the title/headword is the target-language word; the subtitle is the base-language gloss.",
        f"All explanatory text, panel headers, captions, labels, and descriptions must be in {base_language}.",
        f"Only the target word, target-language forms, and target-language example sentences may appear in {target_language}.",
        *VOCABULARY_FIRST_RULES,
        "Never invent fake facts. Never invent quotes. Never invent etymologies. Never invent mnemonics. If a mnemonic is weak, omit it.",
        f"All explanations, panel headers, captions, warnings, glosses, and footer text must be in {base_language}.",
        f"The target word, target-language forms, target-language example sentences, and collocations may remain in {target_language}.",
        "Internal safety rules are instructions only and must not be rendered as card text.",
        "Do not render internal engineering labels, model names, backend names, enum values, prompt labels, version labels, or implementation terms in the visible image.",
        f"Visual anchor: {_clean(plan.get('visual_anchor')) or 'a central word-specific visual anchor'}.",
    ]
    if hero:
        lines.append(f"Honour the planner-chosen hero treatment: {hero}.")
    lines.extend(["Planned panels:", panels])
    footer = _clean(plan.get("footer_line"))
    if footer and not _is_internal_safety_text(footer):
        lines.append(f"Footer line: {footer}")
    avoid = _list_text(
        item
        for item in _iter_list_items(plan.get("avoid"))
        if not _is_internal_safety_text(item)
    )
    if avoid:
        lines.append(f"Internal negative constraints, not visible text: {avoid}.")
    lines.extend(
        [
            template.compiler_instruction,
            f"Visual frame: {template.visual_frame or template.visual_direction}",
        ]
    )
    if template.text_budget:
        lines.append("Text budgets to honour: " + "; ".join(template.text_budget) + ".")
    if template.anti_pattern:
        lines.append(f"Specific anti-pattern to avoid: {template.anti_pattern}")
    if template.footer_requirement:
        lines.append(template.footer_requirement)
    if template.extra_compiler_instruction:
        lines.append(template.extra_compiler_instruction)
    if template.fallback_style_description:
        lines.append(
            "Blueprint fallback if no reference image is attached: "
            f"{template.fallback_style_description}"
        )
    return _remove_internal_terms("\n".join(lines))


def infographic_prompt_metadata(
    *,
    final_prompt: str,
    planner_model: str,
    planner_plan: Mapping[str, Any],
    infographic_template: str,
    base_language_intended: str | None,
    target_language: str | None,
    content: CardImageContent | None = None,
    reference_attached: bool | None = None,
    reference_fallback_used: bool | None = None,
    reference_asset_exists: bool | None = None,
    reference_fallback_reason: str | None = None,
    template_reference_url: str | None = None,
    reference_url_error: str | None = None,
    provider_model: str | None = None,
    validator_passed: bool | None = None,
    validator_errors: list[str] | None = None,
    validator_hard_errors: list[str] | None = None,
    validator_warnings: list[str] | None = None,
    validator_retry_count: int = 0,
    prompt_attempt_count: int = 1,
    prompt_rule_ratio_estimate: float | None = None,
    dense_editorial_word_category: str | None = None,
) -> dict[str, Any]:
    template = globals()["infographic_template"](infographic_template)
    panels = planner_plan.get("panels") if isinstance(planner_plan, Mapping) else None
    panel_count = len(panels) if isinstance(panels, list) else 0
    metadata: dict[str, Any] = {
        "premium_quick_mode": "infographic",
        "backend_template": INFOGRAPHIC_BACKEND_TEMPLATE,
        "infographic_template": template.value,
        "infographic_template_label": template.label,
        "planner_model": planner_model,
        "planner_panel_count": panel_count,
        "final_prompt_chars": len(final_prompt),
        "final_prompt_preview": final_prompt[:500],
        "final_prompt_sha256": hashlib.sha256(final_prompt.encode("utf-8")).hexdigest(),
        "base_language_intended": _clean(base_language_intended) or None,
        "target_language": _clean(target_language) or None,
        "planner_json_preview": _compact_json_preview(planner_plan),
    }
    if content is not None:
        metadata["infographic_learning"] = build_infographic_learning_metadata(
            content=content,
            planner_plan=planner_plan,
            infographic_template=template.value,
            base_language_intended=base_language_intended,
            target_language=target_language,
        )
    if provider_model:
        metadata["provider_model"] = provider_model
    if template.version == "v4":
        metadata.update(
            {
                "prompt_writer_model": planner_model,
                "dense_editorial": True,
                "vocabulary_first": True,
                "visible_module_count": _visible_module_count(planner_plan),
                "validator_passed": validator_passed,
                "validator_errors": validator_errors or [],
                "validator_hard_errors": validator_hard_errors or [],
                "validator_warnings": validator_warnings or [],
                "validator_retry_count": validator_retry_count,
                "prompt_attempt_count": max(1, int(prompt_attempt_count or 1)),
                "final_prompt": final_prompt,
                "prompt_rule_ratio_estimate": prompt_rule_ratio_estimate,
                "dense_editorial_word_category": dense_editorial_word_category,
            }
        )
        if len(final_prompt) > V4_PROMPT_WARNING_CHARS:
            metadata["prompt_length_warning"] = "over_6000_chars"
    metadata["final_prompt_hash"] = metadata["final_prompt_sha256"]
    if template.pass_count > 1:
        metadata["planner_pass_count"] = template.pass_count
    reference = infographic_template_reference(template.value)
    if reference:
        asset_exists = reference_asset_exists
        if asset_exists is None:
            asset_exists = bool((ORCH_ROOT / reference["reference_asset_path"]).exists())
        attached = bool(reference_attached)
        fallback = (not attached) if reference_fallback_used is None else bool(reference_fallback_used)
        resolved_reference_url = template_reference_url if template_reference_url is not None else reference.get("reference_url")
        if not asset_exists:
            fallback_reason = "reference_asset_missing"
        elif not resolved_reference_url and not attached:
            fallback_reason = "reference_url_unavailable"
        else:
            fallback_reason = reference_fallback_reason
        metadata.update(
            {
                "reference_mode": reference["reference_mode"],
                "template_reference_id": reference["template_reference_id"],
                "template_reference_asset_path": reference["reference_asset_path"],
                "template_reference_url": resolved_reference_url,
                "reference_url_error": reference_url_error,
                "reference_attached": attached,
                "reference_fallback_used": fallback,
                "reference_fallback_reason": fallback_reason if fallback else None,
                "reference_asset_exists": bool(asset_exists),
                "fallback_style_description": reference.get("fallback_style_description"),
            }
        )
    hero = _clean(planner_plan.get("hero_treatment") if isinstance(planner_plan, Mapping) else None)
    if hero:
        metadata["planner_hero_treatment"] = hero
    return metadata


def write_infographic_prompt(
    *,
    content: CardImageContent,
    layer2: Mapping[str, Any],
    infographic_template: str | None = None,
) -> InfographicPromptResult:
    selected_template = globals()["infographic_template"](
        infographic_template or layer2.get("infographic_template")
    )
    api_key = config.OPENROUTER_API_KEY
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY missing for infographic planner")
    if selected_template.version == "v4":
        return _write_dense_editorial_prompt(
            content=content,
            selected_template=selected_template,
            api_key=api_key,
        )
    system_prompt = build_infographic_planner_system_prompt(selected_template.value)
    user_prompt = build_infographic_planner_user_prompt(
        content=content,
        infographic_template=selected_template.value,
    )
    raw_plan, usage, request_id = _call_openrouter_infographic_planner(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        model=INFOGRAPHIC_PLANNER_MODEL,
        api_key=api_key,
    )
    planner_plan = _parse_planner_plan(raw_plan)
    prompt = compile_infographic_prompt(
        content=content,
        plan=planner_plan,
        infographic_template=selected_template.value,
    )
    return InfographicPromptResult(
        prompt=prompt,
        model=INFOGRAPHIC_PLANNER_MODEL,
        raw_plan=raw_plan,
        planner_plan=planner_plan,
        infographic_template=selected_template.value,
        usage=usage,
        request_id=request_id,
    )


def _write_dense_editorial_prompt(
    *,
    content: CardImageContent,
    selected_template: InfographicTemplate,
    api_key: str,
) -> InfographicPromptResult:
    system_prompt = build_dense_editorial_prompt_writer_system_prompt()
    base_user_prompt = build_dense_editorial_prompt_writer_user_prompt(
        content=content,
        infographic_template=selected_template.value,
    )
    usage_total: dict[str, Any] = {}
    last_request_id: str | None = None
    last_raw = ""
    last_plan: dict[str, Any] = {}
    last_prompt = ""
    last_validation: dict[str, Any] = {
        "passed": False,
        "errors": ["dense editorial writer did not run"],
        "prompt_rule_ratio_estimate": None,
    }
    validator_retry_count = 0
    for retry_count in range(2):
        validator_retry_count = retry_count
        feedback = ""
        if retry_count:
            feedback = "\n\nFix these validation errors and return a corrected natural-language image prompt only: " + "; ".join(
                str(item) for item in last_validation.get("errors", [])
            )
        raw_plan, usage, request_id = _call_openrouter_infographic_planner(
            system_prompt=system_prompt,
            user_prompt=base_user_prompt + feedback,
            model=INFOGRAPHIC_PLANNER_MODEL,
            api_key=api_key,
            max_tokens=INFOGRAPHIC_DENSE_PROMPT_WRITER_MAX_TOKENS,
            response_format_json=False,
        )
        usage_total = _merge_usage(usage_total, usage)
        last_request_id = request_id
        last_raw = raw_plan
        last_plan = _parse_v4_editorial_prompt(raw_plan)
        last_prompt = compile_infographic_prompt(
            content=content,
            plan=last_plan,
            infographic_template=selected_template.value,
        )
        last_validation = validate_dense_editorial_prompt(
            prompt=last_prompt,
            content=content,
            base_language=_clean(content.base_language) or "English",
            target_language=_clean(content.language) or "target language",
        )
        if not last_validation.get("hard_errors"):
            break
    last_plan["validator_errors"] = last_validation.get("errors", [])
    last_plan["validator_hard_errors"] = last_validation.get("hard_errors", [])
    last_plan["validator_warnings"] = last_validation.get("warnings", [])
    return InfographicPromptResult(
        prompt=last_prompt,
        model=INFOGRAPHIC_PLANNER_MODEL,
        raw_plan=last_raw,
        planner_plan=last_plan,
        infographic_template=selected_template.value,
        usage=usage_total,
        request_id=last_request_id,
        validator_passed=not bool(last_validation.get("hard_errors")),
        validator_errors=[str(item) for item in last_validation.get("errors", [])],
        validator_hard_errors=[str(item) for item in last_validation.get("hard_errors", [])],
        validator_warnings=[str(item) for item in last_validation.get("warnings", [])],
        validator_retry_count=validator_retry_count,
        prompt_attempt_count=validator_retry_count + 1,
        prompt_rule_ratio_estimate=last_validation.get("prompt_rule_ratio_estimate"),
        dense_editorial_word_category=_clean(last_plan.get("dense_editorial_word_category")) or None,
    )


def _call_openrouter_infographic_planner(
    *,
    system_prompt: str,
    user_prompt: str,
    model: str,
    api_key: str,
    max_tokens: int = INFOGRAPHIC_PLANNER_MAX_TOKENS,
    response_format_json: bool = True,
) -> tuple[str, dict[str, Any], str | None]:
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": max_tokens,
        "temperature": 0.35,
    }
    if response_format_json:
        payload["response_format"] = {"type": "json_object"}
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
        raise RuntimeError("OpenRouter returned empty infographic plan")
    log_cost(
        stage="images_card_infographic_planner",
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
    return content.strip(), usage, data.get("id")


def _parse_planner_plan(raw_plan: str) -> dict[str, Any]:
    data = json.loads(_repair_json(raw_plan))
    if not isinstance(data, dict):
        raise ValueError("infographic planner must return a JSON object")
    panels = data.get("panels")
    if not isinstance(panels, list):
        data["panels"] = []
    return data


def _merge_usage(current: dict[str, Any], update: dict[str, Any] | None) -> dict[str, Any]:
    merged = dict(current or {})
    for key, value in (update or {}).items():
        if isinstance(value, (int, float)) and isinstance(merged.get(key), (int, float)):
            merged[key] = merged[key] + value
        else:
            merged[key] = value
    return merged


def _parse_v4_editorial_prompt(raw_prompt: str) -> dict[str, Any]:
    text = raw_prompt.strip()
    if not text:
        raise ValueError("dense editorial prompt writer returned empty output")
    try:
        data = json.loads(_repair_json(text))
    except Exception:
        return {"prompt": text}
    if not isinstance(data, dict):
        return {"prompt": text}
    prompt_text = (
        _clean(data.get("prompt"))
        or _clean(data.get("image_prompt"))
        or _clean(data.get("final_prompt"))
        or _clean(data.get("brief"))
    )
    if prompt_text:
        data["prompt"] = prompt_text
    return data


def _compile_v4_dense_editorial_prompt_legacy_unused(
    *,
    content: CardImageContent,
    plan: Mapping[str, Any],
    base_language: str,
    target_language: str,
    title: str,
    translation: str,
) -> str:
    writer_payload = _compact_json_preview_full(plan)
    lines = [
        "Dense Editorial V4 provider-ready prompt.",
        "Create a horizontal 16:9 encyclopedia-style vocabulary infographic with maximum editorial information density.",
        f"TITLE / HEADWORD: {title}",
        f"SUBTITLE / GLOSS: {translation}",
        f"Explanation language for visible panel text: {base_language}",
        f"Target-language examples, collocations, forms, and quoted word forms may remain in {target_language}.",
        "",
        "Editorial density:",
        "Use a premium natural-history / modern editorial knowledge-card layout: central visual anchor, rounded editorial boxes, icons, callouts, zoom/detail sections, practical learner panels, and visual scoring or summary modules where useful.",
        "Use 8-12 visible modules if the word supports them. For simple words, use fewer and larger modules. For rich words, use more modules. High information density is desired, but keep the hierarchy uncluttered.",
        "",
        "Vocabulary-first:",
        VOCABULARY_FIRST_RULES[0],
        VOCABULARY_FIRST_RULES[1],
        VOCABULARY_FIRST_RULES[2],
        VOCABULARY_FIRST_RULES[3],
        VOCABULARY_FIRST_RULES[4],
        "For topic-like nouns such as chess, teach the target-language word first: play chess, chess board, chess piece, chess match, chess vs chest, pronunciation, and uncountable/singular usage before adding small topic context.",
        "",
        "Recommended visible modules:",
        "Meaning / Bedeutung; Quick Profile / Kurzprofil; Pronunciation / Aussprache; Grammar & Forms / Grammatik & Formen; Example Sentences / Beispielsätze; Collocations / Kollokationen; Common Mistake / Häufiger Fehler; False Friends / Falsche Freunde; Synonyms & Contrasts / Synonyme & Kontraste; Word Family / Wortfamilie; Origin / Herkunft only if reliable; Register & Context / Register & Kontext; Memory Cue / Merkhilfe only if genuinely strong; Topic/Culture Note only if useful.",
        "",
        "Hard bans:",
        "Never invent fake facts. Never invent fake etymologies. Never invent quotes. Never force mnemonics.",
        "Never render internal labels, backend/model/template names, enum values, V1/V2/V3/V4, quick mode, renderer profile, or internal system labels.",
        "Never render visible labels named Zielsprache, Basissprache, target language, or base language.",
        "Do not render JSON keys such as type, style, composition, info_panels, visual_elements, or design_goals as visible text.",
        "No filler panels. No generic AI-generated infographic or educational card footer.",
        "",
        "Writer content to follow. JSON keys are structural instructions only, not visible text:",
        writer_payload,
    ]
    return _remove_internal_terms("\n".join(lines))


def _compile_v4_dense_editorial_prompt(
    *,
    content: CardImageContent,
    plan: Mapping[str, Any],
    base_language: str,
    target_language: str,
    title: str,
    translation: str,
) -> str:
    writer_prompt = _extract_v4_writer_prompt(plan)
    module_list = _v4_module_list(plan)
    content_lines: list[str] = []
    if writer_prompt:
        content_lines.append(_sanitize_v4_writer_prompt(writer_prompt))
    topic_guard = _v4_topic_like_language_guard(title)
    if topic_guard:
        content_lines.append(topic_guard)
    if module_list:
        content_lines.append("Planned learning modules: " + "; ".join(module_list) + ".")
    lines = [
        "Create a horizontal 16:9 dense educational vocabulary infographic.",
        "",
        f"Target word/headword: {title}",
        f"Translation/gloss: {translation}",
        f"Explanation language: {base_language}",
        f"Useful word forms, collocations, and examples may remain in {target_language}.",
        "",
        "This is a language-learning infographic, not a general topic article.",
        "At least 70% of the card content must teach the word as language. At most 30% may be world/topic knowledge, and only when it helps the learner use or understand the word.",
        "Teach the word first: meaning, pronunciation, grammar/forms, examples, collocations, register, word family, false friends, common mistakes, synonyms/contrasts, and usage notes.",
        "Examples must be idiomatic and common.",
        "",
        "Design freely as a premium encyclopedia / natural-history / modern editorial knowledge card: central visual anchor, modular information panels, icons, callouts, detail boxes, summary modules, high information density, readable hierarchy, elegant palette.",
        "",
        "Use these planned content modules:",
        *(content_lines or ["Build dense useful learning modules from the target word and gloss."]),
        "",
        f"Language rule: explanations, panel headers, notes, warnings, glosses, and footer in {base_language}. {target_language} word forms, collocations, and examples may remain in {target_language}.",
        "Do not render internal technical labels, language-role metadata, raw structural key names, badges, watermarks, or verification notes. Omit unsupported claims, unsourced quotations, unsupported etymology, and weak memory tricks. All visible text must be useful learning content.",
    ]
    return _remove_internal_terms("\n".join(lines))


def _compile_v3_reference_prompt(
    *,
    content: CardImageContent,
    plan: Mapping[str, Any],
    template: InfographicTemplate,
    base_language: str,
    target_language: str,
    title: str,
    translation: str,
) -> str:
    lines = [
        "Create a horizontal 16:9 vocabulary infographic for:",
        f"TARGET WORD: {title}",
        f"TRANSLATION: {translation}",
        f"BASE LANGUAGE: {base_language}",
        f"TARGET LANGUAGE: {target_language}",
        "Orientation: TARGET WORD is the target-language headword; TRANSLATION is the base-language gloss.",
        "Vocabulary-first: " + VOCABULARY_FIRST_RULES[0],
        VOCABULARY_FIRST_RULES[1],
        VOCABULARY_FIRST_RULES[2],
        VOCABULARY_FIRST_RULES[3],
        VOCABULARY_FIRST_RULES[4],
        "",
        "Use the attached reference image only as visual scaffolding.",
        "Preserve layout, panel rhythm, palette, border style, icon style, typography mood, density, and premium infographic feel.",
        "Do not copy any text, labels, examples, footer, word, translation, etymology, mnemonic, or placeholder marks from the reference.",
        "If the reference contains any readable text, treat it as placeholder only and ignore it.",
        "",
        "All visible text must come from the planner content.",
        "All visible content must come from this planner content:",
        _planner_content_compact(plan, title=title, translation=translation),
        "",
        "Language rule:",
        f"All explanations, panel headers, captions, warnings, glosses, and footer text must be in {base_language}.",
        f"The target word, target-language forms, target-language example sentences, and collocations may remain in {target_language}.",
        "",
        "Panel flexibility:",
        "Preserve the reference style, but resize panels as needed.",
        "Regenerate the central map/artifact/hero visual for the new word.",
        "Do not invent filler panels.",
        "",
        "Bans:",
        "No internal labels.",
        "No backend/model/template names.",
        "Never invent fake facts. Never invent quotes. Never invent etymologies. Never invent mnemonics.",
        "No forced mnemonics.",
        "Do not copy text from the reference image.",
        "",
        "The planner content is the source of truth.",
    ]
    return _remove_internal_terms("\n".join(lines))


def validate_dense_editorial_prompt(
    *,
    prompt: str,
    content: CardImageContent,
    base_language: str,
    target_language: str,
) -> dict[str, Any]:
    hard_errors: list[str] = []
    warnings: list[str] = []
    text = _clean(prompt)
    lowered = text.lower()
    word = _clean(content.word)
    translation = _clean(content.translation)
    if not text:
        hard_errors.append("empty final prompt")
    if word and word.lower() not in lowered:
        hard_errors.append(f"target word missing: {word}")
    if translation and translation.lower() not in lowered:
        hard_errors.append(f"translation/gloss missing: {translation}")
    if word and translation and _looks_swapped(text, word, translation):
        hard_errors.append("target/translation appear swapped")
    if "16:9" not in lowered or "horizontal" not in lowered:
        warnings.append("horizontal 16:9 missing")
    for language in (base_language, target_language):
        if language and _clean(language).lower() not in lowered:
            warnings.append(f"concrete language name missing: {language}")
    banned = [item for item in V4_BANNED_VISIBLE_STRINGS if _contains_banned_token(lowered, item)]
    if banned:
        hard_errors.append("banned visible metadata: " + ", ".join(banned))
    raw_keys = [item for item in V4_JSON_KEY_STRINGS if _contains_json_key(text, item)]
    if raw_keys:
        hard_errors.append("raw JSON key visible: " + ", ".join(raw_keys))
    if _asks_for_visible_safety_text(lowered):
        hard_errors.append("visible safety text requested")
    if _asks_for_visible_ratio_guidance(lowered):
        hard_errors.append("visible ratio guidance requested")
    if not _has_vocabulary_first_language(lowered):
        warnings.append("vocabulary-first instruction missing")
    safety_groups = (
        ("facts", ("no fake facts", "avoid invented facts", "do not invent facts", "never invent facts")),
        ("quotes", ("no fake quotes", "avoid invented quotes", "do not invent quotes", "never invent quotes")),
        ("etymologies", ("no fake etymologies", "unsupported etymologies", "do not invent etymologies", "never invent etymologies")),
        ("mnemonics", ("no forced mnemonics", "forced memory tricks", "do not force mnemonics", "never force mnemonics")),
    )
    for label, variants in safety_groups:
        if not any(phrase in lowered for phrase in variants):
            warnings.append(f"missing safety guidance: {label}")
    module_hits = sum(1 for term in V4_LEARNING_MODULE_TERMS if term in lowered)
    if module_hits < 5:
        warnings.append("required learning modules missing")
    if len(text) > V4_PROMPT_HARD_FAIL_CHARS:
        hard_errors.append(f"prompt too long: {len(text)} chars")
    if len(text) > V4_PROMPT_WARNING_CHARS and len(text) <= V4_PROMPT_HARD_FAIL_CHARS:
        warnings.append(f"prompt over soft warning threshold: {len(text)} chars")
    return {
        "passed": not hard_errors,
        "errors": hard_errors,
        "hard_errors": hard_errors,
        "warnings": warnings,
        "prompt_rule_ratio_estimate": _estimate_prompt_rule_ratio(text),
    }


def _planner_content_compact(
    plan: Mapping[str, Any],
    *,
    title: str | None = None,
    translation: str | None = None,
) -> str:
    compact: dict[str, Any] = {}
    if _clean(title):
        compact["title"] = _clean(title)
    if _clean(translation):
        compact["translation"] = _clean(translation)
    for key in (
        "visual_anchor",
        "hero_treatment",
        "analysis_summary",
        "footer_line",
    ):
        value = _clean(plan.get(key))
        if value and not _is_internal_safety_text(value):
            compact[key] = value
    panel_items: list[dict[str, Any]] = []
    panels = plan.get("panels")
    if isinstance(panels, list):
        for raw in panels[:8]:
            if not isinstance(raw, Mapping):
                continue
            panel: dict[str, Any] = {}
            for key in ("header", "type", "text", "visual_note"):
                value = raw.get(key)
                if key == "text":
                    cleaned = [
                        _clean(item)
                        for item in _iter_list_items(value)
                        if _clean(item) and not _is_internal_safety_text(item)
                    ]
                    if cleaned:
                        panel[key] = cleaned
                    continue
                cleaned_value = _clean(value)
                if cleaned_value and not _is_internal_safety_text(cleaned_value):
                    panel[key] = cleaned_value
            if panel:
                panel_items.append(panel)
    compact["panels"] = panel_items
    return json.dumps(compact, ensure_ascii=False, separators=(",", ":"))


def _panel_lines(value: Any) -> str:
    if not isinstance(value, list) or not value:
        return "- Core panel: teach the word with short base-language text."
    lines: list[str] = []
    for index, raw in enumerate(value[:8], start=1):
        if not isinstance(raw, Mapping):
            continue
        header = _clean(raw.get("header")) or f"Panel {index}"
        if _is_internal_safety_text(header):
            header = f"Panel {index}"
        text = _list_text(
            item
            for item in _iter_list_items(raw.get("text"))
            if not _is_internal_safety_text(item)
        )
        visual_note = _clean(raw.get("visual_note"))
        if _is_internal_safety_text(visual_note):
            visual_note = ""
        line = f"- {header}: {text or 'short base-language teaching text'}"
        if visual_note:
            line += f" Visual note: {visual_note}"
        lines.append(line)
    return "\n".join(lines) or "- Core panel: teach the word with short base-language text."


def _list_text(value: Any) -> str:
    if isinstance(value, list):
        return "; ".join(_clean(item) for item in value if _clean(item))
    if not isinstance(value, (str, bytes, Mapping)):
        try:
            return "; ".join(_clean(item) for item in value if _clean(item))
        except TypeError:
            pass
    return _clean(value)


def _extract_v4_writer_prompt(plan: Mapping[str, Any]) -> str:
    for key in ("prompt", "image_prompt", "final_prompt", "brief"):
        value = _clean(plan.get(key))
        if value:
            return value
    return ""


def _sanitize_v4_writer_prompt(prompt: str) -> str:
    cleaned = _clean(prompt)
    for key in V4_JSON_KEY_STRINGS:
        cleaned = re.sub(rf'"?{re.escape(key)}"?\s*:', "", cleaned, flags=re.IGNORECASE)
    sentences = [item.strip() for item in re.split(r"(?<=[.!?])\s+", cleaned) if item.strip()]
    if not sentences:
        return cleaned
    return " ".join(item for item in sentences if not _is_internal_safety_text(item))


def _v4_topic_like_language_guard(title: str) -> str:
    if title.strip().lower() == "chess":
        return (
            "Required chess language content: play chess; chess board; chess piece; "
            "chess match; chess vs chest. Keep game-topic context small."
        )
    return ""


def _v4_module_list(plan: Mapping[str, Any]) -> list[str]:
    modules: list[str] = []
    composition = plan.get("composition")
    if isinstance(composition, Mapping):
        for key in ("info_panels", "detail_sections", "summary_modules"):
            raw_items = composition.get(key)
            if not isinstance(raw_items, list):
                continue
            for item in raw_items[:12]:
                if not isinstance(item, Mapping):
                    continue
                title = _clean(item.get("title") or item.get("header") or item.get("name"))
                content = _clean(item.get("content") or item.get("text") or item.get("body"))
                if title and content:
                    modules.append(f"{title}: {content}")
                elif title:
                    modules.append(title)
                elif content:
                    modules.append(content)
    panels = plan.get("panels")
    if not modules and isinstance(panels, list):
        for item in panels[:12]:
            if not isinstance(item, Mapping):
                continue
            title = _clean(item.get("header") or item.get("title"))
            text = _list_text(item.get("text"))
            if title and text:
                modules.append(f"{title}: {text}")
            elif title:
                modules.append(title)
            elif text:
                modules.append(text)
    return modules


def _iter_list_items(value: Any):
    if isinstance(value, list):
        return value
    if value is None:
        return []
    return [value]


def _is_internal_safety_text(value: Any) -> bool:
    text = _clean(value).lower()
    return any(phrase in text for phrase in INTERNAL_SAFETY_VISIBLE_PHRASES) or any(
        phrase in text for phrase in INTERNAL_TEMPLATE_VISIBLE_PHRASES
    )


def _asks_for_visible_safety_text(text: str) -> bool:
    if not any(phrase in text for phrase in INTERNAL_SAFETY_VISIBLE_PHRASES):
        return False
    visible_context_terms = (
        "footer",
        "watermark",
        "badge",
        "shield",
        "note",
        "label",
        "panel",
        "plaque",
        "stamp",
        "visible",
        "visibly",
        "render",
        "display",
        "says",
        "reads",
        "text",
    )
    return any(term in text for term in visible_context_terms)


def _asks_for_visible_ratio_guidance(text: str) -> bool:
    ratio_terms = (
        "70% language learning",
        "70 percent language learning",
        "70% language",
        "70 percent language",
        "30% topic context",
        "30 percent topic context",
        "30% topic",
        "30 percent topic",
    )
    if not any(term in text for term in ratio_terms):
        return False
    visible_context_terms = (
        "footer",
        "watermark",
        "badge",
        "shield",
        "note",
        "label",
        "panel",
        "plaque",
        "stamp",
        "visible",
        "visibly",
        "render",
        "display",
        "says",
        "reads",
        "text",
    )
    return any(term in text for term in visible_context_terms)


def _compact_json_preview(value: Mapping[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))[:900]


def _compact_json_preview_full(value: Mapping[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))


def _visible_module_count(value: Mapping[str, Any]) -> int | None:
    composition = value.get("composition") if isinstance(value, Mapping) else None
    if not isinstance(composition, Mapping):
        panels = value.get("panels") if isinstance(value, Mapping) else None
        return len(panels) if isinstance(panels, list) else None
    total = 0
    for key in ("info_panels", "detail_sections", "summary_modules"):
        item = composition.get(key)
        if isinstance(item, list):
            total += len(item)
    return total


def _contains_banned_token(lowered: str, token: str) -> bool:
    pattern = rf"(?<![a-z0-9_]){re.escape(token.lower())}(?![a-z0-9_])"
    return re.search(pattern, lowered) is not None


def _contains_json_key(text: str, key: str) -> bool:
    return re.search(rf'["\']{re.escape(key)}["\']\s*:', text, flags=re.IGNORECASE) is not None


def _has_vocabulary_first_language(lowered: str) -> bool:
    return (
        ("language-learning infographic" in lowered or "vocabulary-learning infographic" in lowered)
        and (
            "teach the word" in lowered
            or "teaches the word" in lowered
            or "word as language" in lowered
            or "word's usage" in lowered
        )
    )


def _looks_swapped(text: str, word: str, translation: str) -> bool:
    if not word or not translation:
        return False
    if _clean(word).casefold() == _clean(translation).casefold():
        return False
    swapped_title = re.search(
        rf"(title|headword|word|titled)\s*[:=]?\s*['\"]?{re.escape(translation)}['\"]?",
        text,
        flags=re.IGNORECASE,
    )
    swapped_gloss = re.search(
        rf"(translation|gloss|subtitle|glossed as)\s*[:=]?\s*['\"]?{re.escape(word)}['\"]?",
        text,
        flags=re.IGNORECASE,
    )
    return bool(swapped_title or swapped_gloss)


def _estimate_prompt_rule_ratio(text: str) -> float:
    if not text:
        return 0.0
    rule_markers = (
        "do not",
        "never",
        "must",
        "no fake",
        "at least",
        "at most",
        "rule",
        "avoid",
    )
    sentences = [item.strip().lower() for item in re.split(r"[.!?\n]+", text) if item.strip()]
    if not sentences:
        return 0.0
    rule_count = sum(1 for item in sentences if any(marker in item for marker in rule_markers))
    return round(rule_count / len(sentences), 2)


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _template_reference_url(template: InfographicTemplate) -> str | None:
    if template.reference_url:
        return template.reference_url
    base_url = _clean(os.environ.get("INFOGRAPHIC_REFERENCE_BASE_URL"))
    if not base_url or not template.reference_asset_path:
        return None
    return f"{base_url.rstrip('/')}/{Path(template.reference_asset_path).name}"


def _upload_reference_asset_to_storage(
    reference_asset_path: str,
) -> tuple[str | None, str | None, str | None, str | None]:
    asset_path = ORCH_ROOT / reference_asset_path
    if not asset_path.exists():
        return None, f"reference asset missing: {reference_asset_path}", None, None
    supabase_url = os.environ.get("SUPABASE_URL", "")
    supabase_key = os.environ.get("SUPABASE_SERVICE_KEY", "") or os.environ.get("SUPABASE_KEY", "")
    if not supabase_url or not supabase_key:
        return None, "supabase credentials missing", INFOGRAPHIC_REFERENCE_BUCKET, None
    storage_key = f"{INFOGRAPHIC_REFERENCE_STORAGE_PREFIX}/{asset_path.name}"
    try:
        from supabase import create_client as _create_supabase_client

        sb_client = _create_supabase_client(supabase_url, supabase_key)
        with open(asset_path, "rb") as f:
            sb_client.storage.from_(INFOGRAPHIC_REFERENCE_BUCKET).upload(
                storage_key,
                f.read(),
                file_options={"content-type": "image/png", "upsert": "true"},
            )
        public_url = str(
            sb_client.storage.from_(INFOGRAPHIC_REFERENCE_BUCKET).get_public_url(storage_key)
        )
    except Exception as exc:
        logger.warning("Infographic reference upload failed for %s: %s", storage_key, exc)
        return None, str(exc), INFOGRAPHIC_REFERENCE_BUCKET, storage_key
    if not public_url.startswith("https://"):
        return None, f"reference URL is not HTTPS: {public_url}", INFOGRAPHIC_REFERENCE_BUCKET, storage_key
    return public_url, None, INFOGRAPHIC_REFERENCE_BUCKET, storage_key


def _remove_internal_terms(prompt: str) -> str:
    cleaned = prompt
    for term in BANNED_VISIBLE_TERMS:
        cleaned = re.sub(re.escape(term), "", cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s+\n", "\n", cleaned).strip()
