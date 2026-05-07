"""Dedicated planner/compiler for GPT Image-2 vocabulary infographics."""

from __future__ import annotations

import hashlib
import json
import os
import re
from dataclasses import dataclass, field
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


@dataclass(frozen=True)
class InfographicPromptResult:
    prompt: str
    model: str
    raw_plan: str
    planner_plan: dict[str, Any]
    infographic_template: str
    usage: dict[str, Any] | None = None
    request_id: str | None = None


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
}

INFOGRAPHIC_TEMPLATE_OPTIONS = tuple(
    InfographicTemplateOption(value=item.value, label=item.label, version=item.version)
    for item in INFOGRAPHIC_TEMPLATES.values()
)


def infographic_template(value: str | None) -> InfographicTemplate:
    return INFOGRAPHIC_TEMPLATES.get(_clean(value), INFOGRAPHIC_TEMPLATES["infographic_knowledge_guide_v1"])


def infographic_template_label(value: str | None) -> str:
    return infographic_template(value).label


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
        "- Never invent facts, quotes, etymologies, or mnemonics. Omit weak mnemonics.",
        "- Prefer 6-8 compact panels unless the chosen template specifies fewer.",
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
    return "\n".join(
        [
            f"Target word: {content.word}",
            f"Translation: {content.translation}",
            f"Base language: {content.base_language or 'English'}",
            f"Target language: {content.language}",
            f"Part of speech: {content.pos or 'unknown'}",
            f"Known image scene / visual clue: {content.image_scene or 'none'}",
            f"Known mnemonic: {content.mnemonic or 'none'}",
            f"Known etymology: {content.etymology or 'none'}",
            f"Template value for backend metadata: {template.value}",
            "Use the known content only when it is reliable. Do not fabricate missing facts.",
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
    base_language = _clean(plan.get("base_language")) or _clean(content.base_language) or "English"
    target_language = _clean(plan.get("target_language")) or _clean(content.language) or "target language"
    title = _clean(plan.get("title")) or _clean(content.word)
    translation = _clean(plan.get("translation")) or _clean(content.translation)
    panels = _panel_lines(plan.get("panels"))
    hero = _clean(plan.get("hero_treatment"))
    lines = [
        "Create a horizontal 16:9 educational infographic poster for a vocabulary learner.",
        "Use the supplied content is the source of truth; do not add unprovided facts to fill space.",
        "Allow designer freedom in composition, spacing, icons, arrows, callouts, and visual hierarchy.",
        "Use short readable text, not paragraphs. Keep hierarchy premium, editorial, and uncluttered.",
        f"Large title/headword, spelled exactly: {title}.",
        f"Translation/subtitle, spelled exactly: {translation}.",
        f"All explanatory text, panel headers, captions, labels, and descriptions must be in {base_language}.",
        f"Only the target word, target-language forms, and target-language example sentences may appear in {target_language}.",
        "Never invent fake facts. Never invent quotes. Never invent etymologies. Never invent mnemonics. If a mnemonic is weak, omit it.",
        "Do not render internal engineering labels, model names, backend names, enum values, prompt labels, version labels, or implementation terms in the visible image.",
        f"Visual anchor: {_clean(plan.get('visual_anchor')) or 'a central word-specific visual anchor'}.",
    ]
    if hero:
        lines.append(f"Honour the planner-chosen hero treatment: {hero}.")
    lines.extend(["Planned panels:", panels])
    footer = _clean(plan.get("footer_line"))
    if footer:
        lines.append(f"Footer line: {footer}")
    avoid = _list_text(plan.get("avoid"))
    if avoid:
        lines.append(f"Also avoid: {avoid}.")
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
    return _remove_internal_terms("\n".join(lines))


def infographic_prompt_metadata(
    *,
    final_prompt: str,
    planner_model: str,
    planner_plan: Mapping[str, Any],
    infographic_template: str,
    base_language_intended: str | None,
    target_language: str | None,
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
    if template.pass_count > 1:
        metadata["planner_pass_count"] = template.pass_count
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


def _call_openrouter_infographic_planner(
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
        "max_tokens": INFOGRAPHIC_PLANNER_MAX_TOKENS,
        "temperature": 0.35,
        "response_format": {"type": "json_object"},
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


def _panel_lines(value: Any) -> str:
    if not isinstance(value, list) or not value:
        return "- Core panel: teach the word with short base-language text."
    lines: list[str] = []
    for index, raw in enumerate(value[:8], start=1):
        if not isinstance(raw, Mapping):
            continue
        header = _clean(raw.get("header")) or f"Panel {index}"
        text = _list_text(raw.get("text"))
        visual_note = _clean(raw.get("visual_note"))
        line = f"- {header}: {text or 'short base-language teaching text'}"
        if visual_note:
            line += f" Visual note: {visual_note}"
        lines.append(line)
    return "\n".join(lines) or "- Core panel: teach the word with short base-language text."


def _list_text(value: Any) -> str:
    if isinstance(value, list):
        return "; ".join(_clean(item) for item in value if _clean(item))
    return _clean(value)


def _compact_json_preview(value: Mapping[str, Any]) -> str:
    return json.dumps(value, ensure_ascii=False, separators=(",", ":"))[:900]


def _clean(value: Any) -> str:
    return re.sub(r"\s+", " ", str(value or "").strip())


def _remove_internal_terms(prompt: str) -> str:
    cleaned = prompt
    for term in BANNED_VISIBLE_TERMS:
        cleaned = re.sub(re.escape(term), "", cleaned, flags=re.IGNORECASE)
    return re.sub(r"\s+\n", "\n", cleaned).strip()
