"""System prompt builder for the Image Engine.

Dynamically assembles LLM prompts from settings per ENGINE_IMAGE.md Section 10.
No hardcoded creative direction — each block is injected based on settings.
"""

from __future__ import annotations

import logging
from typing import Optional, Union

from .models import ImageContext, ImageSettings, resolve_frame_narrative

logger = logging.getLogger(__name__)


def build_system_prompt(
    word: str,
    translation: str,
    language: str,
    settings: ImageSettings,
    context: Optional[ImageContext],
    scene_count: int,
    aspect_ratio: str = "16:9",
    image_count_raw: Union[str, int] = 1,
    text_to_video: bool = False,
    short_mode: bool = False,
    image_model: str = "",
) -> str:
    """Assemble the complete system prompt from settings.

    Args:
        word: The vocabulary word.
        translation: English translation.
        language: Full language name.
        settings: Resolved image settings.
        context: Optional context (visual_hint, lyrics, music_caption).
        scene_count: Number of scenes to generate (already resolved from auto).
        aspect_ratio: Target aspect ratio.
        image_count_raw: Original image_count before resolution ("auto" or int).
        text_to_video: If True, generate text-to-video prompts instead of image prompts.

    Returns:
        Complete system prompt string.
    """
    resolved_narrative = resolve_frame_narrative(settings.frame_narrative)
    is_auto_mode = resolved_narrative == "auto"
    is_auto_count = image_count_raw == "auto"

    logger.info(f"movie_override={settings.movie_override!r}, direction={settings.creative_direction!r}")
    blacklist = settings.movies_blacklist if settings.movies_blacklist else None
    direction_block = _creative_direction_block(settings.creative_direction, blacklist)
    if (settings.movie_override and settings.movie_override.strip()
            and settings.creative_direction in ("movie", "movie_remix")):
        direction_block = _movie_override_block(settings.movie_override.strip()) + "\n\n" + direction_block

    parts = [
        _role_block(word, translation, language),
        direction_block,
    ]

    # Frame narrative: auto-picker preamble OR specific mode block
    if is_auto_mode:
        image_count_instruction = _image_count_instruction(
            image_count_raw, settings.clip_duration, short_mode=short_mode
        )
        parts.append(_auto_picker_block(image_count_instruction))
    elif scene_count > 1:
        parts.append(_mode_block(resolved_narrative))
    else:
        parts.append(_single_frame_block())

    # Image count instruction (when NOT auto-picking — auto-picker embeds its own)
    if not is_auto_mode:
        parts.append(_image_count_instruction(
            image_count_raw, settings.clip_duration, short_mode=short_mode
        ))

    parts.extend([
        _art_style_block(settings.art_style),
        _style_consistency_block(scene_count),
    ])

    # Word-in-image block — skip for text-to-video (no image rendering)
    if not text_to_video:
        parts.append(_word_in_image_block(settings.word_in_image, word, language))

    parts.append(_image_model_block(image_model))

    parts.extend([
        _context_block(context),
        _visual_reference_block(
            settings.visual_reference,
            context.etymology if context else None,
            context.mnemonic if context else None,
        ),
        _music_caption_block(settings, language),
        _mnemonic_text_block(translation),
        _generation_instructions(scene_count, aspect_ratio, is_auto_count, text_to_video),
    ])

    # Prompt writing instructions — swap for text-to-video
    if text_to_video:
        parts.append(_text_to_video_prompt_block())
    else:
        parts.append(_transition_prompt_block())

    parts.extend([
        _duration_allocation_block(settings.clip_duration, scene_count, short_mode=short_mode),
    ])

    # Output schema — swap for text-to-video
    if text_to_video:
        parts.append(_output_schema_text_to_video_block(aspect_ratio, settings.creative_direction))
    else:
        parts.append(_output_schema_block(aspect_ratio, settings.creative_direction))

    return "\n\n".join(p for p in parts if p)


def build_user_prompt(
    word: str,
    translation: str,
    language: str,
    scene_count: int,
    is_auto_count: bool = False,
) -> str:
    """Build the user message sent alongside the system prompt.

    Args:
        word: The vocabulary word.
        translation: English translation.
        language: Full language name.
        scene_count: Number of scenes to generate (used as default/max for auto mode).
        is_auto_count: If True, let the LLM choose between 2 and scene_count scenes.

    Returns:
        User prompt string.
    """
    if is_auto_count and scene_count >= 2:
        count_instruction = (
            f"Create 2 or 3 scenes based on what best serves the word. "
            f"Use 2 scenes for words with strong motion, clear before/after, or simple concepts. "
            f"Use 3 scenes for abstract words, collections of meanings, or full narrative arcs."
        )
    else:
        count_instruction = f"Create exactly {scene_count} scene(s)."
    return (
        f'Generate a visual storyboard for the {language} word "{word}" '
        f'(meaning: "{translation}"). '
        f"{count_instruction} "
        f"Return ONLY valid JSON matching the schema described in your instructions."
    )


# --- Internal Block Builders ---


def _role_block(word: str, translation: str, language: str) -> str:
    """Section 10.2: Role and task definition."""
    return (
        "You are the visual creative director for a vocabulary learning system that "
        "produces music video-style clips for language learners. Your job is to "
        "create a visual storyboard for a single vocabulary word.\n\n"
        f"WORD: {word}\n"
        f"TRANSLATION: {translation}\n"
        f"LANGUAGE: {language}"
    )


def _image_model_block(image_model: str) -> Optional[str]:
    """Per-target-image-model guidance for the storyboard LLM.

    Emitted in the system prompt so the LLM shapes each scene's
    image_prompt fields to match the downstream model's parser
    preferences. wan_fast and wan_pro use the base storyboard
    shape (compile_scene_to_text flattens identically for both).
    """
    if image_model == "flux_pro":
        return (
            "TARGET IMAGE MODEL: Flux 2 Pro.\n"
            "Downstream is Flux 2 Pro — a flow-matching model "
            "whose internal text encoder natively parses "
            "structured JSON and hex color codes. Shape each "
            "scene's image_prompt fields accordingly:\n"
            "- Keep total content dense but focused across all "
            "8 fields (aim roughly 100–250 words combined).\n"
            "- colors[]: emit hex codes like '#c9a66b'. Flux "
            "parses hex into exact RGB — use them.\n"
            "- style: reference specific artists, films, or "
            "cinematographers when fitting (e.g. 'Gerhard "
            "Richter photorealistic', 'Deakins-style warm key "
            "light'). Be granular: 'impasto oil with "
            "palette-knife texture in umber and ochre' not "
            "'oil painting'.\n"
            "- lighting and composition: use photographic and "
            "cinematographic terminology (e.g. '85mm lens, "
            "shallow DOF', 'rim lighting', 'chiaroscuro', "
            "'dutch angle', 'volumetric light beams').\n"
            "- text_element: use explicit quote syntax. "
            "Example rendering field: \"The text 'abgrund' "
            "appears as small hand-inked lettering\".\n"
            "- details: never use negations ('no blur', "
            "'avoid extra fingers'). Translate to positive "
            "presence ('razor-sharp focus on facial features', "
            "'anatomically correct hands with five distinct "
            "fingers')."
        )
    if image_model == "zturbo":
        return (
            "TARGET IMAGE MODEL: Z-Image-Turbo.\n"
            "Downstream is Z-Image-Turbo (Tongyi-MAI), a "
            "distilled S3-DiT running at CFG=0 with a Qwen3-4B "
            "text encoder. It architecturally IGNORES negation "
            "tokens (CFG=0 means there is no mechanism to "
            "steer away from negatives) and has an attention "
            "drop-off near 512 tokens. Strict rules:\n"
            "- NEVER emit negative phrasing in any field. "
            "Words like 'no', 'without', 'avoid', 'except', "
            "'not' cause Z-Turbo to render the forbidden "
            "element. Always translate to positive presence: "
            "'crisp focus' not 'no blur'; 'plain seamless "
            "backdrop' not 'no watermark'; 'fully clothed "
            "modest attire' not 'no nudity'.\n"
            "- colors[]: emit NAMED colors only (e.g. 'warm "
            "amber', 'deep slate', 'bone white'), NEVER hex "
            "codes. Z-Turbo maps hex approximately and "
            "produces off-brand results.\n"
            "- text_element.text: keep to 1–3 short words. "
            "Longer strings corrupt in Z-Turbo's glyph "
            "rendering.\n"
            "- style: reference realistic photographic "
            "terminology ('amateur photography', 'handheld "
            "iPhone snapshot', 'disposable camera aesthetic', "
            "'shot on Leica M6 with Kodak Portra 400 grain'). "
            "Z-Turbo defaults to a plastic overly-polished "
            "aesthetic — gritty phrasing grounds it.\n"
            "- lighting: directional and specific ('warm "
            "street-lamp glow', 'dappled sunlight through "
            "leaves', 'harsh on-board flash falloff').\n"
            "- composition: standard framing terms "
            "('medium-shot portrait', 'ultra-wide landscape', "
            "'eye-level shot').\n"
            "- Keep each field concise. The final compiled "
            "prompt is truncated at ~950 chars downstream."
        )
    if image_model in ("wan_fast", "wan_pro"):
        return None
    return None


def _movie_override_block(movie_name: str) -> str:
    """Constraint block injected when the user specifies a movie override."""
    return (
        f"MOVIE CONSTRAINT — MANDATORY:\n\n"
        f'You MUST use the movie "{movie_name}" for ALL scenes. Do not use any other movie.\n'
        f'Set movie_source_strategy to "single_movie" and movies_referenced to ["{movie_name}"].\n\n'
        f'Find scenes from "{movie_name}" that connect to the vocabulary word. Be creative —\n'
        f"even if the connection seems indirect, make it work. Every movie has scenes that can\n"
        f"represent almost any concept if you think abstractly enough.\n\n"
        f"Examples of creative connections:\n"
        f'- A word like "fast" → find a scene with urgency, machinery, or speed\n'
        f'- A word like "small" → find a scene focused on a tiny but pivotal detail\n'
        f'- A word like "love" → find a scene of sacrifice, devotion, or tenderness\n'
        f'- A word like "music" → find a scene with celebration, rhythm, or instruments\n'
        f'- A word like "danger" → find a scene of tension, threat, or survival\n\n'
        f"Do NOT say this movie doesn't fit this word. Make it fit. There is always a scene."
    )


def _movie_shared_blocks(blacklist: list[str] | None = None) -> str:
    """Prompt sections shared between movie and movie_remix modes."""
    diversity_block = (
        "=== MOVIE DIVERSITY — CRITICAL ===\n\n"
        "Choose a movie that is SURPRISING and UNEXPECTED for this word. Avoid the most\n"
        "obvious association. The best mnemonic connections come from unexpected pairings\n"
        "that make the learner think 'I would never have connected those!'\n\n"
        "Avoid defaulting to the single most obvious film for a word, but stay within\n"
        "the realm of widely recognized movies. Do not dig so deep that the audience has\n"
        "never heard of the film. If choosing between an obscure perfect match and a\n"
        "well-known good match, always choose the well-known one. The mnemonic only works\n"
        "if the learner has seen or heard of the movie.\n\n"
        "Choose movies that a broad international audience aged 18-40 would recognize.\n"
        "This includes Hollywood blockbusters, major award winners with real cultural\n"
        "impact, beloved animated films, well-known foreign blockbusters, and cult\n"
        "classics with large fanbases. Genre films (horror, sci-fi, action, comedy) are\n"
        "great if they are widely known. Do not choose arthouse films, festival-only\n"
        "releases, or deep cuts that only cinephiles would recognize. A film being\n"
        "\"critically acclaimed\" is not enough — the audience must actually know it.\n\n"
        "ERA PREFERENCE: Strongly prefer movies released from 1975 onward. Movies from\n"
        "before 1975 are only acceptable if they are genuinely iconic to a mainstream\n"
        "audience — not just \"classic\" in a film studies sense. When in doubt, choose a\n"
        "newer film.\n\n"
    )

    blacklist_block = ""
    if blacklist:
        blacklist_block = (
            f"DO NOT use any of these movies (already used for other words in this batch): "
            f"{', '.join(blacklist)}\n\n"
        )

    return (
        diversity_block
        + blacklist_block
        + "=== MOVIE SELECTION STRATEGY ===\n\n"
        "DEFAULT: Use ONE movie for all scenes. Choose the film with the strongest,\n"
        "most universally recognizable connection to the vocabulary word.\n\n"
        "DESIGNING YOUR SCENES FROM ONE MOVIE:\n\n"
        "You have full creative freedom in how you use the movie. Consider ALL of\n"
        "these approaches — do not default to always picking different locations:\n\n"
        "A) THREE DISTINCT SCENES — Different iconic moments from the film.\n"
        "   Good for: words that connect to the movie's overall story arc.\n\n"
        "B) ONE SCENE, THREE PERSPECTIVES — The same iconic moment shown from\n"
        "   different camera angles and distances.\n"
        "   Good for: words with a single overwhelmingly iconic movie moment.\n\n"
        "C) ONE CHARACTER'S JOURNEY — Three beats of a character arc.\n"
        "   Good for: verbs, personality traits, life-stage words.\n\n"
        "D) ESCALATING DRAMA — Three moments of increasing intensity from the same\n"
        "   sequence. The quiet before, the moment, the aftermath.\n"
        "   Good for: emotional words, action words, transformation words.\n\n"
        "E) MIX OF THE ABOVE — One establishing shot, one close-up detail, one\n"
        "   dramatic moment. Combine approaches if it serves the word.\n\n"
        "The goal is NOT variety for variety's sake. The goal is: what arrangement\n"
        "of scenes from this movie creates the strongest, most memorable association\n"
        "with the vocabulary word? Trust your judgment.\n\n"
        "MULTI-MOVIE EXCEPTION:\n\n"
        "Use scenes from different movies ONLY when:\n"
        "- The word is abstract and benefits from showing different interpretations\n"
        "  (e.g., three different films each showing a different FACET of the concept)\n"
        "- No single movie has enough strong scenes to fill your scene count for this word\n"
        "- The word's meaning is so broad that one movie would feel limiting\n\n"
        "Declare your choice:\n"
        '"movie_source_strategy": "single_movie" (default) or "multi_movie"\n\n'
        "=== MOVIE SCENE SELECTION ===\n\n"
        "For each scene, choose one iconic movie moment. Prioritize by connection strength:\n\n"
        "1. LITERAL ACTION — The word directly describes an action performed in an iconic movie scene.\n"
        "2. LITERAL OBJECT — The word names a physical object central to a famous movie.\n"
        "3. THEMATIC/EMOTIONAL — The word captures the dominant emotion or theme of a well-known film.\n"
        "4. PHONETIC/WORDPLAY — The word sounds like or puns on a movie title or character name.\n"
        "   Use sparingly but don't exclude — phonetic links can be the strongest.\n\n"
        "Selection rules:\n"
        "- The scene MUST be identifiable from a single still frame\n"
        "- Prefer cultural touchstones over obscure films\n"
        "- Name actual actors: use full name and character name, not generic descriptions\n"
        "- Specify the movie's color grading signature in the lighting/style fields\n"
        "- Vary genres, eras, visual styles when using multiple movies\n"
        "- You may use 2-3 scenes from ONE movie if it has an overwhelmingly strong\n"
        "  connection to the word — but each scene must be visually distinct\n\n"
        "=== WORD INTEGRATION IN MOVIE SCENES ===\n\n"
        "The vocabulary word appears as readable text WITHIN the movie's physical world:\n"
        "- On props: engraved on a weapon, printed on a book, written on a screen\n"
        "- On set pieces: signs, banners, storefronts, vehicle livery, posters\n"
        "- In the environment: carved in stone, written in sand, glowing in neon\n"
        "- On worn items: badges, nameplates, t-shirts, tattoos, headbands\n"
        "- In the action: spelled in bullet holes, written in steam, formed by debris,\n"
        "  visible on a computer screen\n\n"
        "Rules:\n"
        "- The placement must be PLAUSIBLE within the movie's universe and time period\n"
        "- The word should be large enough to read at a glance but not dominate the frame\n"
        "- Vary the rendering technique across scenes\n"
        "- The word is in the TARGET LANGUAGE (the language being learned)\n\n"
        "=== TRANSITION DECISION ===\n\n"
        "After designing your scenes, decide how they should be animated and connected.\n"
        "Think like a film editor, not a tech demo. Movies are built on CUTS. Morphing\n"
        "is a special technique — powerful when earned, cheap when overused.\n\n"
        '"suggested_transition_mode": one of "all_cut", "morph_then_cut", "cut_then_morph", "all_morph"\n'
        '"transition_rationale": why this transition approach serves these specific scenes\n\n'
        "FAVOR CUTS WHEN:\n"
        "- Scenes have dramatically different tone, color, or energy\n"
        "- The movie genre is horror, thriller, or action (tension comes from sudden shifts)\n"
        "- You're showing independent iconic moments (each scene is its own punch)\n"
        "- The scenes are from different movies (multi-movie always uses cuts)\n\n"
        "FAVOR MORPHING WHEN:\n"
        "- Scenes share strong visual continuity (same location, lighting, palette)\n"
        "- You're showing perspective shifts on one scene (the morph acts as camera movement)\n"
        "- The word implies transformation, passage, or flow\n"
        "- The emotional arc is continuous (calm → building → climax)\n"
        "- The movie itself is known for dreamlike or fluid visuals\n\n"
        "MIXING (morph_then_cut / cut_then_morph):\n"
        "- Build smoothly into a climax, then CUT to the payoff — classic editing rhythm\n"
        "- Start with a jarring cut, then let the rest flow — subverts expectation\n\n"
        "There is no wrong answer. But ask yourself: would a skilled film editor morph\n"
        "here, or would they cut? Usually, they'd cut. Cuts are the default language\n"
        "of cinema. Morph when it genuinely adds something.\n\n"
        "=== CREATIVE DEPTH ===\n\n"
        "Do not pick the most obvious scene. Pick the most MEMORABLE scene.\n\n"
        "For any movie you choose, consider:\n"
        "- OBVIOUS: The most famous action set-piece (everyone picks this)\n"
        "- BETTER: A quieter moment that ANTICIPATES the word's meaning — tension, buildup\n"
        "- BEST: A subtle, emotionally precise moment that carries the most weight for this word\n\n"
        "The best scene is often NOT the most famous one — it's the one that carries\n"
        "the most emotional weight for the specific word. The famous scene is the safe\n"
        "choice. The emotionally precise scene is the powerful choice.\n\n"
        "VISUAL PRECISION:\n\n"
        "When describing the scene for image generation, you are a cinematographer\n"
        "giving exact instructions to recreate a shot:\n\n"
        '- COMPOSITION: "Medium close-up, slightly below eye level, subject fills the\n'
        '  right two-thirds of frame, negative space on the left with blurred rain"\n'
        '- LIGHTING: "Low-key, single hard light source from upper left creating deep\n'
        '  facial shadows, warm amber key with cool blue fill"\n'
        '- COLOR: "Desaturated with crushed blacks, teal in the shadows, orange in the\n'
        '  highlights, overall color temperature 4500K"\n'
        '- DETAIL: "Visible pores, sweat beading at the hairline, fabric texture on the\n'
        '  worn collar, dust particles in the light beam"\n\n'
        "Vague prompts produce vague images. Precise prompts produce frames that look\n"
        "like they were pulled directly from the film.\n\n"
        "ACTOR LIKENESS PROMPTING:\n\n"
        "Always describe actors with enough physical detail that the image model can\n"
        "render them even without recognizing the name. For each actor include:\n"
        "age, build, hair (color, style, length), eye color, distinguishing\n"
        "facial features, expression, exact clothing with colors and condition, any\n"
        "props they're holding or wearing."
    )


def _movie_direction_block(blacklist: list[str] | None = None) -> str:
    """Creative direction block for movie mode — faithful recreation of iconic scenes."""
    return (
        "CREATIVE DIRECTION: ICONIC MOVIE RECREATION\n\n"
        "You are recreating iconic, universally recognizable movie scenes that connect\n"
        "to the vocabulary word. Your goal: the viewer sees the image and IMMEDIATELY\n"
        "thinks of the movie, then sees the word integrated into the scene, creating\n"
        "an instant mnemonic link.\n\n"
        + _movie_shared_blocks(blacklist) + "\n\n"
        "=== FAITHFULNESS ===\n\n"
        "Recreate the scene as close to the original film as possible:\n"
        "- Exact character appearances (face, hair, costume, expression, posture)\n"
        "- Correct environment and set design\n"
        "- Movie-accurate color grading and lighting mood\n"
        "- Iconic composition and camera angle from the most recognizable shot\n"
        "- Period-accurate props and background details\n\n"
        "=== OUTPUT FIELDS ===\n\n"
        "For each scene, include a movie_reference object with:\n"
        "title, year, scene_description, actors (with physical descriptions),\n"
        "color_signature.\n\n"
        "At the top level, include:\n"
        'movie_source_strategy, movies_referenced, suggested_transition_mode,\n'
        "transition_rationale."
    )


def _movie_remix_direction_block(blacklist: list[str] | None = None) -> str:
    """Creative direction block for movie_remix mode — iconic scenes with one absurd alteration."""
    return (
        "CREATIVE DIRECTION: ICONIC MOVIE REMIX\n\n"
        "You are recreating iconic movie scenes with ONE absurd alteration per scene.\n"
        "The viewer should INSTANTLY recognize the movie AND instantly notice what's\n"
        "hilariously wrong. The vocabulary word is integrated into the scene.\n\n"
        + _movie_shared_blocks(blacklist) + "\n\n"
        "=== THE ONE-ELEMENT RULE ===\n\n"
        "Change EXACTLY ONE element per scene. Everything else stays faithful to the\n"
        "original film. The viewer should instantly recognize the movie AND instantly\n"
        "notice what's wrong.\n\n"
        "Alteration types (vary across scenes when using multi-movie):\n\n"
        "1. OBJECT SWAP — Iconic prop replaced with absurd equivalent.\n"
        "   A legendary weapon becomes a rubber toy. A precious artifact becomes food.\n\n"
        "2. SCALE ABSURDITY — Something comically large or small.\n"
        "   A terrifying giant creature shrunk to pet size. A massive vehicle is a bath toy.\n\n"
        "3. ANACHRONISM — Wrong-era element inserted.\n"
        "   An ancient warrior checking a smartphone. A medieval character wearing earbuds.\n\n"
        "4. ANIMAL SUBSTITUTION — Character replaced by an animal in their costume.\n"
        "   A penguin in the hero's outfit. A cat in the villain's signature look.\n\n"
        "5. MATERIAL SWAP — Scene made of wrong material.\n"
        "   A space station is a disco ball. A dinosaur made of gummy bears.\n\n"
        "6. EMOTIONAL MISMATCH — Wildly wrong reaction for the scene.\n"
        "   A character casually snacking during the film's most dramatic revelation.\n\n"
        "RULES:\n"
        "- The scene MUST still be immediately recognizable after the alteration\n"
        "- If possible, connect the absurd element to the vocabulary word\n"
        '  (word is "small" → a giant creature shrunk to kitten size)\n'
        "- But NEVER force a connection that kills the humor — natural comedy wins\n"
        "- The humor is VISUAL. No text jokes, no dialogue, no puns in captions.\n"
        "- Play it straight. The altered element exists as if it's normal.\n"
        "  The characters don't react to the absurdity. Deadpan > slapstick.\n\n"
        "=== SINGLE-MOVIE RUNNING GAG ===\n\n"
        "When all scenes are from the same movie, your ONE altered element should\n"
        "be the SAME alteration carried across all scenes. This creates a running gag.\n\n"
        "The same absurd alteration appears in every scene — a character is always\n"
        "replaced by the same animal, or the same iconic prop is always swapped for\n"
        "the same ridiculous substitute. Consistency IS the joke.\n\n"
        "The escalation comes from seeing the SAME absurd element in increasingly\n"
        "dramatic contexts. The repetition IS the joke.\n\n"
        "=== MULTI-MOVIE TRAVELING ABSURDITY ===\n\n"
        "When using scenes from different movies, the altered element TRAVELS across\n"
        "movie worlds. The same absurd object, animal, or modification appears in\n"
        "each movie as if it naturally belongs there.\n\n"
        "The same absurd object, animal, or modification appears in each movie world\n"
        "as if it naturally belongs there. The altered element travels across genres\n"
        "and eras — that visual continuity across wildly different films IS the joke.\n\n"
        "For multi-movie remix: the altered element should BE the vocabulary word\n"
        "whenever possible (if the word is a noun or concrete concept). The word\n"
        "literally travels through cinema.\n\n"
        "=== WORD INTEGRATION IN REMIX ===\n\n"
        "Same rules as standard movie mode. In remix mode, the word can also\n"
        "appear ON the absurd element:\n"
        "- Written on the rubber balloon lightsaber\n"
        "- Printed on the wrong-era smartphone case\n"
        "- On the animal substitute's collar or costume\n\n"
        "=== OUTPUT FIELDS ===\n\n"
        "For each scene, include:\n"
        "- movie_reference: title, year, scene_description, actors, color_signature\n"
        "- remix_element: alteration_type, original, replacement, word_connection\n\n"
        "At the top level, include:\n"
        "movie_source_strategy, movies_referenced, suggested_transition_mode,\n"
        "transition_rationale."
    )


def _creative_direction_block(mode: str, blacklist: list[str] | None = None) -> str:
    """Section 5: Creative direction modes.

    Each mode defines HOW AGGRESSIVELY CREATIVE the visual treatment is.
    """
    blocks = {
        "editorial": (
            "CREATIVE DIRECTION: EDITORIAL\n"
            "Your visual treatment should be clean, intentional, and curated. "
            "Think magazine-quality imagery.\n\n"
            "Guidelines:\n"
            "- Choose the most natural and effective visual representation for the word\n"
            "- For concrete nouns: create a beautiful, compelling depiction in an interesting setting\n"
            "- For abstract concepts: design a clear metaphorical scene that communicates the meaning\n"
            "- Integrate the word elegantly into the composition\n"
            "- Prioritize clarity and aesthetic quality over shock value\n"
            "- The image should feel intentional, like it belongs in a curated collection"
        ),
        "cinematic": (
            "CREATIVE DIRECTION: CINEMATIC\n"
            "Your visual treatment should be dramatic, emotional, and story-driven. "
            "Think movie poster energy.\n\n"
            "Guidelines:\n"
            "- Create scenes with dramatic tension, emotional weight, and narrative implication\n"
            "- Use dramatic lighting, strong perspective, and cinematic compositional techniques\n"
            "- The word should appear as part of the drama — not just placed, but integrated into the story\n"
            "- Every scene should feel like a still from an emotionally powerful film\n"
            "- Lean into atmosphere: fog, rain, golden hour, harsh shadows, silhouettes"
        ),
        "provocative": (
            "CREATIVE DIRECTION: VISUALLY ARRESTING\n\n"
            "You are creating an unexpected, scroll-stopping visual for a vocabulary "
            "word. Your goal is to make the viewer stop, react, and remember.\n\n"
            "Break expectations. Use:\n"
            "- Surreal juxtapositions (objects in wrong contexts, impossible combinations)\n"
            "- Dreamlike or fantastical physics (levitation, impossible scale, melting reality)\n"
            "- Whimsical humor (animals in human roles, absurd situations played straight)\n"
            "- Dramatic visual irony (contrast between expectation and reality)\n"
            "- Bold, arresting compositions that demand attention\n\n"
            "THE KEY RULE: The unexpected element must SERVE the word's meaning. "
            "An absurd image that has nothing to do with the word is just random. "
            "The surreal or fantastical element should reinforce, playfully comment on, "
            "or create a memorable association with the vocabulary concept. The viewer "
            "should connect the surprising visual to the word.\n\n"
            "Think: Magritte, not Dali. Purposeful strangeness, not random weirdness.\n"
            "Think: a cow in a business suit at a boardroom table, not a cow melting "
            "into a clock. The first is funny AND communicates something about the cow. "
            "The second is just weird.\n\n"
            "EXAMPLES of good visually arresting vocabulary scenes:\n"
            "- \"Cow\" -> A cow in a tailored suit sitting at a corporate boardroom table, "
            "hooves on a laptop, other executives don't notice anything unusual\n"
            "- \"Desperation\" -> A person in evening wear clinging to a giant clock hand "
            "as it ticks past midnight, city far below\n"
            "- \"Movement\" -> A tropical fish swimming calmly through a crowded subway car, "
            "commuters ignoring it completely\n"
            "- \"Kitchen\" -> A fully equipped kitchen floating on a calm lake at sunrise, "
            "a chef cooking as if nothing is unusual\n\n"
            "Integrate the word into the scene in equally unexpected ways — the text "
            "itself can be part of the surreal world."
        ),
        "minimal": (
            "CREATIVE DIRECTION: MINIMAL\n"
            "The word IS the image. Create typographic-dominant compositions.\n\n"
            "Guidelines:\n"
            "- Make the word's letterforms the primary visual element\n"
            "- Environment, colors, and materials should support and amplify the word\n"
            "- Match intensity to the word's emotional register:\n"
            "  - Calm, peaceful words → serene, gentle treatment\n"
            "  - Intense, dramatic words → bold, dramatic treatment\n"
            "- The word should be massive, dominant, and impossible to miss\n"
            "- Think typography as art: 3D letters, environmental typography, material exploration"
        ),
        "literal": (
            "CREATIVE DIRECTION: LITERAL\n"
            "You are creating the clearest, most immediately recognizable visual depiction "
            "of a vocabulary word. Your goal is maximum instant comprehension — a learner "
            "should glance at this image and immediately understand what the word means.\n\n"
            "Rules:\n"
            "- Show the most obvious, literal interpretation of the word's meaning\n"
            "- For concrete nouns: show the thing itself, clearly and beautifully composed\n"
            "- For verbs: show the action being performed, mid-action, unmistakable\n"
            "- For adjectives: show a subject that unmistakably embodies the quality\n"
            "- For abstract concepts: use the single most universal visual symbol "
            "(love = heart, freedom = open door/wings, danger = fire/cliff edge)\n"
            "- Do NOT use metaphor, editorial narrative, or cinematic storytelling\n"
            "- Do NOT describe a \"visual exploration\" or \"editorial study\" — describe "
            "one clear scene\n"
            "- Keep the visual_concept to ONE sentence: what we see and why it "
            "communicates the word\n"
            "- The image should work like a flashcard: word + image = instant meaning\n\n"
            "The composition should still be beautiful and well-crafted — literal does "
            "not mean boring. A literal photo of a dog can still have gorgeous lighting "
            "and composition. But clarity of meaning always wins over artistic ambition."
        ),
        "movie": _movie_direction_block(blacklist),
        "movie_remix": _movie_remix_direction_block(blacklist),
    }
    return blocks[mode]


_MODE_BLOCKS: dict[str, str] = {
    "scale": (
        "=== SCALE MODE ===\n\n"
        "Each frame shows the subject at a RADICALLY different scale of observation.\n"
        "Think Powers of Ten — the same subject seen from completely different distances.\n\n"
        "PRIMARY CHANGE: Distance and scale (aerial/panoramic → human-level → macro/extreme close-up).\n"
        "The subject must be present and recognizable at every scale, but the composition,\n"
        "surrounding context, and mood shift naturally with the change in distance.\n\n"
        "SCENE DESIGN:\n"
        "- Each frame must feel like a genuinely different photograph, not just a crop/zoom\n"
        "- Aerial/wide: show the subject in its broader context (landscape, cityscape, ecosystem)\n"
        "- Human-level: the natural viewing distance, how you'd encounter the subject in life\n"
        "- Macro: intimate details invisible at normal distance (textures, patterns, moisture, grain)\n"
        "- The scale progression does NOT have to go in order — macro first, then wide, then human is fine\n"
        "- Vary composition dramatically: overhead geometry at wide, eye-level framing at human, abstract patterns at macro\n\n"
        "CHAINING: Use reference images. Each subsequent frame shows the same subject/location\n"
        "but at a dramatically different scale. Preserve recognizable elements across scales.\n\n"
        "TRANSITION PROMPTS: For each scene (except the last), write a transition_prompt that\n"
        "describes the scale shift between frames.\n"
        'Example: "Camera pulls back dramatically, rising above the rooftops to reveal the full\n'
        'city block, the subject shrinking to a speck in the urban landscape"'
    ),
    "action": (
        "=== ACTION MODE ===\n\n"
        "The subject does something different in each frame.\n\n"
        "PRIMARY CHANGE: The subject's behavior, pose, expression, gesture, or physical state.\n"
        "The environment can shift naturally as a consequence of the action — a runner moves\n"
        "through different parts of a park, a chef moves between prep station and stove.\n"
        "Don't freeze the world artificially.\n\n"
        "SCENE DESIGN:\n"
        "- Choose actions that are visually DISTINCT — not subtle expression changes\n"
        "- Show the subject at meaningfully different moments or stages of activity\n"
        "- Each frame should tell you something new about the word's meaning through what the subject is DOING\n"
        "- Motion and energy should vary between frames (calm → intense, or vice versa)\n\n"
        "CHAINING: Use reference images. Show the same subject — change what they're doing.\n"
        "The subject's core identity stays consistent; the world can shift naturally around them.\n\n"
        "TRANSITION PROMPTS: For each scene (except the last), write a transition_prompt that\n"
        "describes the subject's movement between states.\n"
        'Example: "The person\'s arms slowly rise from their sides to a full embrace"'
    ),
    "environment": (
        "=== ENVIRONMENT MODE ===\n\n"
        "The world transforms around the subject.\n\n"
        "PRIMARY CHANGE: Surroundings, time of day, season, weather, lighting mood, or atmosphere.\n"
        "The subject stays recognizable but can react naturally to the environment — they're not\n"
        "a mannequin. A person can hold an umbrella in rain, shield eyes from sun, bundle up in snow.\n\n"
        "SCENE DESIGN:\n"
        "- Make environmental changes DRAMATIC, not subtle — different season, different time of day,\n"
        "  different weather, or even different setting entirely (indoors → outdoors)\n"
        "- The subject grounds the viewer: \"same thing, different world\"\n"
        "- Use the environment to evoke different emotional associations with the word\n"
        "- Lighting shifts should be pronounced (warm golden hour vs cold blue twilight vs harsh noon)\n\n"
        "CHAINING: Use reference images. Show the same subject — transform everything around them.\n"
        "The subject's identity and rough positioning stay consistent; the world changes.\n\n"
        "TRANSITION PROMPTS: For each scene (except the last), write a transition_prompt that\n"
        "describes the environmental transformation.\n"
        'Example: "Daylight gradually fades to twilight, warm tones shift to cool blues,\n'
        'stars begin appearing in the sky"'
    ),
    "narrative": (
        "=== NARRATIVE MODE ===\n\n"
        "A mini-story told in sequential frames. Cause and effect.\n\n"
        "PRIMARY CHANGE: The story advances. Both subject and setting can evolve as the\n"
        "narrative demands — this is the most flexible mode. Think of it as a comic strip\n"
        "or a short film told in stills: setup → development → payoff.\n\n"
        "SCENE DESIGN:\n"
        "- Each frame must advance the story — no two frames should feel like the same moment\n"
        "- The subject should be recognizable across frames but can change state (clean → dirty,\n"
        "  calm → panicked, empty-handed → carrying something)\n"
        "- Settings can change if the story moves locations\n"
        "- The final frame should feel like a resolution or punchline, not just another beat\n"
        "- The narrative should connect to the WORD'S MEANING, not just be any random story\n\n"
        "CHAINING: Use reference images. Show the story progressing — subject should remain\n"
        "recognizable, but both subject and setting can evolve as the narrative demands.\n\n"
        "TRANSITION PROMPTS: For each scene (except the last), write a transition_prompt that\n"
        "describes the narrative action that connects one moment to the next.\n"
        'Example: "The person reaches for the apple on the shelf, hand extending upward,\n'
        'fingers closing around the fruit"'
    ),
    "context": (
        "=== CONTEXT MODE ===\n\n"
        "Same recognizable subject placed in completely different worlds.\n\n"
        "PRIMARY CHANGE: The setting, activity, scenario, or usage context changes entirely.\n"
        "The subject's core identity is preserved — same face, same shape, same defining features.\n"
        "Everything else (background, lighting, other characters, activity) is different.\n\n"
        "This mode works for BOTH people AND objects:\n"
        "- Person: same individual in completely different life situations\n"
        "- Object: same item used in completely different contexts or environments\n"
        "- Animal: same creature in completely different habitats or interactions\n\n"
        "SCENE DESIGN:\n"
        "- Each scene should feel like it's from a different movie, a different life, a different world\n"
        "- The subject must be IMMEDIATELY recognizable across all scenes\n"
        "- For people: preserve face, body type, distinctive features. Clothing CAN change to fit context.\n"
        "- For objects: preserve shape, color, defining details. Scale can shift slightly for context.\n"
        "- Maximize the contrast between scenes — the bigger the gap, the more memorable the result\n\n"
        "CHAINING: Use reference images. Place the same recognizable subject into a completely\n"
        "different scene. Subject features must be preserved; everything else changes.\n\n"
        "TRANSITION PROMPTS: For each scene (except the last), write a transition_prompt that\n"
        "describes the scene dissolving from one context into the next.\n"
        'Example: "The scene dissolves from the hospital corridor into a sunlit park, the\n'
        'same person now jogging along a tree-lined path"'
    ),
    "collection": (
        "=== COLLECTION MODE ===\n\n"
        "Independent interpretations of the word. No visual continuity between frames.\n\n"
        "PRIMARY CHANGE: Everything. Each frame is a standalone creative interpretation of the\n"
        "word's meaning. Different subjects, different settings, different compositions.\n"
        "The only thread connecting them is the word itself and a shared art style / color palette.\n\n"
        "SCENE DESIGN:\n"
        "- Each scene should explore a DIFFERENT facet or association of the word\n"
        "- Avoid repeating the same subject or setting across scenes\n"
        "- Think of it as a gallery exhibition on the theme of this word\n"
        "- Each frame should stand alone as a compelling image\n"
        "- Use the shared palette and style to create visual cohesion despite different content\n\n"
        "NO CHAINING: Each scene is rendered independently. No reference images are used.\n\n"
        "TRANSITION PROMPTS: Set transition_prompt to null for ALL scenes in collection mode."
    ),
}


def _mode_block(mode: str) -> str:
    """Return the mode-specific frame design block."""
    return _MODE_BLOCKS[mode]


_AUTO_PICKER_PREAMBLE = (
    "=== TRANSFORMATION MODE SELECTION ===\n\n"
    "Choose the mode that will make this word most MEMORABLE — not most obvious.\n\n"
    "THE MODES:\n\n"
    "1. SCALE — Explore the subject at radically different distances.\n"
    "   Each frame shows the same subject at a completely different scale of\n"
    "   observation: aerial/panoramic, human-level, or extreme macro/close-up.\n"
    "   The primary change is distance and scale. The subject is always present\n"
    "   and recognizable, but the composition, surrounding context, and mood\n"
    "   shift naturally with the change in scale.\n"
    "   EXAMPLES: aerial crop fields → dinner table → water droplets on a leaf\n\n"
    "2. ACTION — The subject does something different in each frame.\n"
    "   The primary change is the subject's behavior, pose, or state.\n"
    "   The environment can shift naturally as a consequence of the action\n"
    "   (a runner moves through space, a chef moves between stations).\n"
    "   EXAMPLES: mixing ingredients → plating → serving with a flourish\n\n"
    "3. ENVIRONMENT — The world transforms around the subject.\n"
    "   The primary change is the surroundings: time of day, season, weather,\n"
    "   setting, or mood. The subject stays recognizable but can react naturally\n"
    "   to the environment (holding an umbrella in rain, squinting in sun).\n"
    "   EXAMPLES: same bridge at dawn mist → summer noon → snowy evening\n\n"
    "4. NARRATIVE — A mini-story told in sequential frames.\n"
    "   Each frame advances a cause-and-effect chain. The subject remains\n"
    "   recognizable but both subject and setting can evolve as the story\n"
    "   demands. Think of it as a comic strip — setup, development, payoff.\n"
    "   EXAMPLES: empty pot → bubbling stew → family gathered around table\n\n"
    "5. CONTEXT — Same subject, completely different worlds.\n"
    "   The subject appears in entirely different settings, activities, or\n"
    "   usage scenarios. Works for both people and objects. The subject's\n"
    "   core identity is preserved; everything else changes.\n"
    "   EXAMPLES (person): scientist in lab → same person hiking → cooking dinner\n"
    "   EXAMPLES (object): hammer on construction site → in art studio → in kitchen\n\n"
    "6. COLLECTION — Independent interpretations with no visual continuity.\n"
    "   Each frame is a standalone take on the word's meaning. Different\n"
    "   subjects, different settings, different approaches. Linked only by\n"
    "   the word's meaning and a shared art style.\n"
    "   EXAMPLES for \"freedom\": bird soaring → child on a swing → open road at sunset\n\n"
    "=== YOUR DECISION ===\n\n"
    'State your chosen mode in the "frame_narrative" field of your output JSON.\n'
    "{image_count_instruction}\n\n"
    "Design your scenes following your chosen mode's primary axis of variation."
)


def _auto_picker_block(image_count_instruction: str) -> str:
    """Return the auto-picker preamble with image count instruction embedded."""
    return _AUTO_PICKER_PREAMBLE.format(image_count_instruction=image_count_instruction)


_RECOMMENDED_RANGE: dict[int, str] = {
    5: "1",
    10: "1-2",
    15: "2-3",
    20: "2-3",
    30: "2-3",
}


def _image_count_instruction(
    image_count: Union[str, int],
    clip_duration: int,
    short_mode: bool = False,
) -> str:
    """Return image count instruction — auto (LLM picks) or fixed."""
    if image_count == "auto":
        recommended = "2-3" if short_mode else _RECOMMENDED_RANGE.get(clip_duration, "2-3")
        body = (
            'Also choose the image count (the "scene_count" field). Consider:\n'
            f"- The clip duration is {clip_duration} seconds.\n"
            f"- For a {clip_duration}s clip, {recommended} images is the sweet spot.\n"
            "- Choose the MINIMUM count needed to communicate the word effectively in your\n"
            "  chosen mode. More frames is not better — each frame must earn its place.\n"
            "- 2 scenes work well for words with strong motion or clear before/after contrast\n"
            "  (running, fighting, transforming). PERSPECTIVE rarely needs more than 2.\n"
            "- 3 scenes work well for abstract words, collections of meanings, or full\n"
            "  narrative arcs. NARRATIVE benefits from 3 for setup + action + result.\n"
            "  COLLECTION can use 2-3 depending on how many distinct meanings the word has."
        )
        if short_mode:
            body += "\n- Short mode: the card is exactly 15 seconds total across 2 or 3 scenes."
        return body
    return (
        f"You must design exactly {image_count} scene(s). Do not suggest a different count.\n"
        "If this count feels limiting for your chosen mode, adapt your creative approach —\n"
        "compress the concept into fewer frames rather than changing your mode choice.\n"
        "If the count is 1, you are designing a single powerful image. Choose the mode that\n"
        "produces the strongest single frame (PERSPECTIVE or COLLECTION work well with 1 frame;\n"
        "NARRATIVE with 1 frame means capturing the most pivotal moment of the story)."
    )


def _single_frame_block() -> str:
    """Injected instead of frame_narrative when scene_count is 1."""
    return (
        "SINGLE IMAGE:\n"
        "You are generating exactly 1 scene. This is a single standalone image, "
        "not part of a series. Keep your visual_concept to 1-2 sentences describing "
        "what the image shows and why. Do not reference \"frames\", \"scenes\", \"each "
        "image\", or narrative progression. Focus all creative energy on making this "
        "one image as clear and impactful as possible."
    )


# ---------------------------------------------------------------------------
# ART_STYLE_DESCRIPTIONS — authoritative visual definitions for every style.
#
# The storyboard LLM used to receive only the raw token (e.g. "gerhard_richter")
# and had to guess the visual characteristics, often hallucinating contradictory
# traits ("photorealistic" for an abstract painter).  This dictionary provides
# curated, factually accurate descriptions so the LLM understands the exact
# aesthetic it must design scenes around.
#
# If a style is missing from this dict the prompt falls back to passing the raw
# token, which is acceptable for self-explanatory styles but may hallucinate for
# niche or artist-inspired ones — add a description whenever possible.
# ---------------------------------------------------------------------------
ART_STYLE_DESCRIPTIONS: dict[str, str] = {
    # ── Photographic ──────────────────────────────────────────────────────
    "photorealistic": (
        "Photorealistic digital rendering — indistinguishable from a high-end "
        "photograph. Sharp focus, natural lighting with realistic shadows, "
        "accurate skin textures, lifelike materials, and cinematic depth-of-field."
    ),
    "noir": (
        "Classic film noir — high-contrast black-and-white with deep shadows "
        "and stark highlights. Low-key lighting, dramatic silhouettes, rain-slicked "
        "surfaces, Venetian blind shadow patterns, and a moody, suspenseful atmosphere."
    ),
    "vintage_film": (
        "Vintage analog film — warm color cast with lifted blacks, visible film grain, "
        "slight vignetting, muted saturation, and soft halation around highlights. "
        "Evokes 1960s–70s Kodachrome / Ektachrome nostalgia."
    ),
    "double_exposure": (
        "Double exposure photography — two superimposed exposures blended together. "
        "Silhouette of a subject filled with a landscape, texture, or pattern. "
        "Translucent layering, surreal juxtaposition, and dreamy visual poetry."
    ),
    "polaroid": (
        "Polaroid instant photo — square frame with thick white border, slightly "
        "washed-out colors, soft focus, warm tint, and the casual intimacy of a "
        "snapshot moment captured on instant film."
    ),
    # ── Classic Fine Art ──────────────────────────────────────────────────
    "oil_painting": (
        "Traditional oil painting — visible brushstrokes with rich impasto texture, "
        "luminous glazing, deep saturated colors, and the dimensional quality of "
        "paint built up on canvas. Classical composition and chiaroscuro lighting."
    ),
    "watercolor": (
        "Watercolor painting — transparent washes of pigment on textured paper. "
        "Soft bleeding edges, granulation in washes, white paper showing through "
        "for highlights, and a delicate luminous quality unique to water-based media."
    ),
    "impressionism": (
        "French Impressionism — loose, visible brushstrokes capturing light and "
        "atmosphere over detail. Vibrant broken color, en plein air natural lighting, "
        "soft edges, and the fleeting quality of a moment. Inspired by Monet, Renoir, Degas."
    ),
    "expressionism": (
        "Expressionism — bold distortion of form and color to convey raw emotion. "
        "Intense, non-naturalistic colors, angular or exaggerated shapes, visible "
        "agitated brushwork, and psychological intensity over realistic representation."
    ),
    "surrealism": (
        "Surrealism — dreamlike imagery with impossible juxtapositions rendered in "
        "hyper-precise detail. Melting forms, impossible architecture, symbolic objects "
        "in unexpected contexts, and uncanny atmospheres. Inspired by Dalí, Magritte, Ernst."
    ),
    "cubism": (
        "Cubism — fragmented geometric forms showing multiple perspectives simultaneously. "
        "Flattened picture plane, angular facets, muted earth tones with occasional bold "
        "accents, and the deconstruction of objects into abstract planes. Inspired by Picasso, Braque."
    ),
    "renaissance": (
        "Renaissance painting — balanced classical composition with mathematical perspective, "
        "sfumato shading, rich but naturalistic colors, idealized human forms, and "
        "meticulous attention to anatomy and drapery. Inspired by Leonardo, Raphael, Botticelli."
    ),
    "pop_art": (
        "Pop Art — bold primary colors, heavy black outlines, Ben-Day dot patterns, "
        "flat graphic shapes, and commercial/comic-book aesthetics. High contrast, "
        "repetition, and mass-media visual language. Inspired by Warhol, Lichtenstein."
    ),
    "chiaroscuro": (
        "Chiaroscuro — extreme contrast between light and dark. A single dramatic light "
        "source sculpts forms out of deep shadow. Rich, warm skin tones against near-black "
        "backgrounds. Inspired by Caravaggio, Rembrandt, Georges de La Tour."
    ),
    # ── Decorative & Regional ────────────────────────────────────────────
    "art_nouveau": (
        "Art Nouveau — flowing organic curves, whiplash lines, botanical motifs, "
        "ornamental borders, and elegant decorative patterns. Jewel-toned colors, "
        "sinuous female figures, and the integration of art with design. Inspired by Mucha, Klimt."
    ),
    "art_deco": (
        "Art Deco — bold geometric shapes, symmetrical patterns, metallic gold and "
        "silver accents, stepped forms, sunburst motifs, and luxurious materials. "
        "Sleek, glamorous, and modern with strong vertical lines and zigzag patterns."
    ),
    "ukiyo_e": (
        "Ukiyo-e Japanese woodblock print — flat areas of color with precise black "
        "outlines, asymmetric composition, nature motifs (waves, mountains, cherry "
        "blossoms), subtle color gradations, and elegant calligraphic line quality. "
        "Inspired by Hokusai, Hiroshige, Utamaro."
    ),
    "chinese_ink_wash": (
        "Chinese ink wash painting (shuǐ-mò) — monochrome or limited-palette ink on "
        "rice paper with expressive brushwork, atmospheric perspective through empty "
        "space, misty mountains, flowing water, and the philosophical balance of "
        "presence and absence. Emphasis on qi (vital energy) in every stroke."
    ),
    # ── Animation & Shows ────────────────────────────────────────────────
    "studio_ghibli": (
        "Studio Ghibli animation — lush hand-painted watercolor backgrounds, warm "
        "natural lighting, soft pastel palette, detailed environmental storytelling, "
        "expressive character animation, and a sense of wonder and nostalgia. "
        "Inspired by Hayao Miyazaki's films."
    ),
    "disney_animation": (
        "Classic Disney animation — clean rounded character designs, vibrant saturated "
        "colors, smooth flowing motion, expressive facial features, painterly "
        "backgrounds, and a polished storybook quality with dramatic lighting."
    ),
    "pixar_3d": (
        "Pixar 3D animation — stylized 3D rendering with subsurface scattering on skin, "
        "rich material textures, cinematic lighting, slightly exaggerated proportions, "
        "and photorealistic environmental detail combined with appealing character design."
    ),
    "anime": (
        "Japanese anime — cel-shaded characters with large expressive eyes, dynamic "
        "action poses, speed lines, dramatic lighting with bold rim lights, vibrant "
        "hair colors, and detailed urban or fantasy backgrounds."
    ),
    "comic_book": (
        "Western comic book art — bold ink outlines, flat cel-shaded colors, dynamic "
        "panel-style composition, dramatic foreshortening, action lines, halftone dot "
        "shading, and heroic figure proportions."
    ),
    "one_piece_style": (
        "One Piece anime/manga style — exaggerated proportions, wild dynamic poses, "
        "bold outlines, vibrant saturated colors, dramatic action effects (speed lines, "
        "impact bursts), expressive faces, and Eiichiro Oda's distinctive character design."
    ),
    "dragon_ball_style": (
        "Dragon Ball anime style — muscular character proportions, spiky hair, intense "
        "energy auras, power-up glow effects, dynamic martial arts poses, bold outlines, "
        "and Akira Toriyama's distinctive clean character design."
    ),
    "south_park_style": (
        "South Park animation — simple geometric cutout-style characters with minimal "
        "detail, flat bold colors, paper-craft aesthetic, crude but expressive shapes, "
        "and the show's distinctive wobbly construction-paper look."
    ),
    "rick_and_morty_style": (
        "Rick and Morty animation — wobbly hand-drawn outlines, simple character shapes "
        "with large eyes and small pupils, flat bright colors, sci-fi backgrounds with "
        "retro-futuristic tech, and the show's characteristic loose sketchy line quality."
    ),
    "blue_eyed_samurai": (
        "Blue Eye Samurai animation — cinematic widescreen composition, painterly "
        "backgrounds inspired by traditional Japanese art, dramatic lighting with "
        "rich shadows, muted earth-tone palette with selective color accents, and "
        "detailed period-accurate Edo-era costumes and architecture."
    ),
    "invincible": (
        "Invincible animation — Western superhero comic style with bold clean outlines, "
        "flat cel-shaded colors, dramatic perspective, dynamic action poses, strong "
        "shadows, and the show's distinctive graphic-novel-inspired character design."
    ),
    # ── Digital & Retro ──────────────────────────────────────────────────
    "pixel_art": (
        "Pixel art — low-resolution blocky graphics with limited color palette, visible "
        "individual pixels, dithering for gradients, retro 8-bit/16-bit video game "
        "aesthetic, and clean deliberate pixel placement."
    ),
    "synthwave": (
        "Synthwave / retrowave — neon pink, cyan, and purple color palette, chrome "
        "reflections, laser grid perspective lines, sunset gradient backgrounds, "
        "retro-futuristic 1980s aesthetics, glowing wireframe shapes, and palm tree silhouettes."
    ),
    "cyberpunk": (
        "Cyberpunk — rain-soaked neon-lit urban dystopia, holographic advertisements, "
        "dense vertical cityscapes, augmented humans, glowing circuit patterns, "
        "atmospheric fog with colored light scatter, and a gritty high-tech/low-life aesthetic."
    ),
    "vaporwave": (
        "Vaporwave — pastel pink and teal color palette, Greek marble busts, "
        "retro computer interfaces, glitch effects, palm trees, geometric grid "
        "patterns, Japanese text overlays, and a nostalgic early-internet/90s aesthetic "
        "with deliberate visual distortion."
    ),
    "retro_90s": (
        "Retro 1990s aesthetic — bright neon colors, geometric Memphis-style patterns, "
        "squiggly lines, bold typography, splatter effects, radical/extreme visual "
        "language, and the energetic visual culture of 90s advertising and media."
    ),
    "glitch_art": (
        "Glitch art — intentional digital corruption with pixel sorting, data moshing, "
        "color channel splitting, scan-line distortion, compression artifacts, "
        "fragmented imagery, and the aesthetic beauty of digital errors."
    ),
    # ── Craft & Tactile ──────────────────────────────────────────────────
    "knitted": (
        "Knitted textile art — entire scene rendered as if made from yarn and wool. "
        "Visible knit stitch texture, chunky fiber quality, warm cozy colors, "
        "soft rounded forms, and the tactile handmade quality of knitted crafts."
    ),
    "claymation": (
        "Claymation / stop-motion clay animation — characters and environments sculpted "
        "from modeling clay with visible fingerprints, slightly imperfect surfaces, "
        "warm studio lighting, and the charming handcrafted quality of stop-motion animation."
    ),
    "origami": (
        "Origami paper art — entire scene constructed from folded paper. Clean geometric "
        "creases, angular faceted surfaces, visible paper texture and translucency, "
        "cast shadows from paper folds, and the elegant precision of Japanese paper folding."
    ),
    "stained_glass": (
        "Stained glass window art — bold black leading lines separating flat areas of "
        "jewel-toned translucent color. Radiant light shining through colored glass, "
        "geometric and organic patterns, and the luminous quality of cathedral windows."
    ),
    # ── Illustration & Drawing ───────────────────────────────────────────
    "pen_and_ink": (
        "Pen and ink illustration — precise line work with cross-hatching for shading, "
        "stippling for texture, clean black lines on white paper, fine detail, and "
        "the controlled elegance of traditional ink drawing."
    ),
    "charcoal_sketch": (
        "Charcoal sketch — soft smudged tones, dramatic value range from deep black to "
        "paper white, textured paper grain visible through marks, loose expressive "
        "strokes, and the raw immediacy of charcoal on paper."
    ),
    "engraving": (
        "Engraving / etching — fine parallel lines carved into metal plate, dense "
        "cross-hatching for tonal variation, high contrast black and white, intricate "
        "detail, and the precise mechanical quality of intaglio printmaking."
    ),
    "botanical_illustration": (
        "Botanical illustration — scientifically accurate plant rendering with precise "
        "detail, delicate watercolor washes, fine line work showing leaf veins and "
        "petal structure, neutral backgrounds, and the elegant tradition of natural "
        "history illustration."
    ),
    "storybook": (
        "Storybook illustration — warm, inviting, and slightly whimsical. Soft edges, "
        "gentle lighting, rich but not harsh colors, hand-painted quality, charming "
        "character proportions, and the cozy narrative quality of children's book art."
    ),
    # ── Artist-Inspired ──────────────────────────────────────────────────
    "van_gogh": (
        "Vincent van Gogh post-impressionist painting — thick impasto brushstrokes "
        "with visible paint texture, energetic swirling movement, vivid complementary "
        "colors (cobalt blue against chrome yellow), expressive night skies, and the "
        "emotional intensity of paint applied with passionate urgency."
    ),
    "banksy": (
        "Banksy street art — stencil-sprayed monochrome figures on urban walls, "
        "satirical or political imagery, the contrast of precise stencil edges "
        "against rough concrete/brick textures, occasional selective color accents, "
        "and guerrilla art aesthetics."
    ),
    "escher": (
        "M.C. Escher impossible geometry — tessellations, recursive structures, "
        "impossible staircases, metamorphosis sequences, mathematical precision, "
        "high-contrast lithographic line work, and mind-bending spatial paradoxes "
        "rendered with meticulous technical draftsmanship."
    ),
    "klimt": (
        "Gustav Klimt decorative painting — ornamental gold leaf patterns, intricate "
        "mosaic-like backgrounds, sensual figure rendering, Byzantine-inspired "
        "flat decorative surfaces contrasting with realistic faces and hands, "
        "and the opulent richness of the Vienna Secession movement."
    ),
    "gerhard_richter": (
        "Gerhard Richter abstract painting — squeegee-dragged paint layers creating "
        "vibrant smeared color fields, gestural abstraction with visible horizontal "
        "drag marks, thick impasto paint built up and scraped back, luminous layered "
        "color emerging through translucent veils of pigment. NOT photorealistic — "
        "this is pure abstract expressionism with bold, physical paint manipulation."
    ),
    # ── Genre & Fantasy ──────────────────────────────────────────────────
    "steampunk": (
        "Steampunk — Victorian-era industrial aesthetic with brass gears, copper pipes, "
        "steam-powered machinery, clockwork mechanisms, leather and rivets, ornate "
        "mechanical detail, warm amber/sepia tones, and retro-futuristic 19th-century technology."
    ),
    "fantasy_art": (
        "Epic fantasy art — dramatic cinematic lighting, rich detailed environments "
        "(ancient forests, towering castles, mystical landscapes), heroic figure poses, "
        "magical glow effects, ornate armor and costumes, and the grand scale of "
        "high fantasy illustration."
    ),
    "collage": (
        "Mixed-media collage — torn paper edges, layered textures from different sources "
        "(newspaper, fabric, photographs), visible glue and overlap, eclectic material "
        "combinations, and the raw handmade quality of cut-and-paste assemblage art."
    ),
    "lego_voxel": (
        "Lego / voxel art — entire scene constructed from small interlocking plastic "
        "bricks or 3D cubic voxels. Blocky stepped surfaces, visible brick studs, "
        "primary-color palette, miniature scale, and the playful constructive quality "
        "of building-brick models."
    ),
}


def _art_style_block(style: str) -> str:
    """Section 8.3: Art style instructions.

    Three modes:
    - Empty/blank (default): Say nothing. Let creative direction + LLM judgment decide.
    - "auto": LLM picks ONE style, states it clearly, applies identically to all scenes.
    - Specific value: That style is enforced across all scenes, no overriding.
    """
    if not style or not style.strip():
        return ""
    style_lower = style.lower()
    if style_lower in ("none", "random"):
        return ""
    if style_lower == "auto":
        return (
            "ART STYLE: AUTO\n"
            "Choose ONE art style from this list that best fits this word's meaning, "
            "mood, and cultural context:\n"
            "photorealistic, oil_painting, watercolor, surrealism, pop_art, chiaroscuro, "
            "art_nouveau, ukiyo_e, van_gogh, studio_ghibli, anime, comic_book, "
            "disney_animation, one_piece_style, rick_and_morty_style, pixel_art, "
            "synthwave, cyberpunk, vaporwave, glitch_art, knitted, claymation, origami, "
            "stained_glass, noir, vintage_film, double_exposure, pen_and_ink, "
            "charcoal_sketch, steampunk\n\n"
            "If none of these fit well, you may create a concise custom style "
            "(3-4 words max, e.g. 'wildlife photography' or 'neon graffiti').\n"
            "State your choice in the art_style field. Apply it to ALL scenes "
            "identically. Do not mix styles between scenes."
        )
    # Look up authoritative description; fall back to raw token for unknown styles
    desc = ART_STYLE_DESCRIPTIONS.get(style_lower)
    if desc:
        return (
            f"ART STYLE: {style.upper()}\n"
            f"Style description: {desc}\n\n"
            f"Render all scenes in this exact style. This is a hard constraint — "
            f"do not deviate or reinterpret it. Every compositional choice — lighting, "
            f"color, texture, detail level — must be consistent with the description "
            f"above across all scenes.\n"
            f"The style field in image_prompt MUST be exactly: \"{desc}\""
        )
    return (
        f"ART STYLE: {style.upper()}\n"
        f"Render all scenes in a {style} visual style. This is a hard constraint — "
        f"do not deviate or reinterpret it. Every compositional choice — lighting, "
        f"color, texture, detail level — must be consistent with {style} aesthetics "
        f"across all scenes."
    )


def _style_consistency_block(scene_count: int) -> str:
    """Enforce visual style consistency across all scenes."""
    if scene_count <= 1:
        return ""
    return (
        "STYLE CONSISTENCY (REQUIRED):\n"
        "All scenes in this generation MUST use the same visual style / rendering "
        "approach. Do not mix illustration with photography or switch art styles "
        "between scenes. The style field in image_prompt must be identical or "
        "near-identical across all scenes."
    )


def _word_in_image_block(enabled: bool, word: str, language: str) -> str:
    """Section 10.4: Word-in-image instructions."""
    if enabled:
        return (
            "WORD IN COMPOSITION (REQUIRED):\n"
            f'The word "{word}" must appear as readable text artistically integrated '
            "into every scene. It is NOT an overlay or subtitle — it is part of the "
            "scene's physical world.\n\n"
            "The word must be:\n"
            "- Large enough to read clearly at a glance\n"
            f"- Rendered in the target language script ({language})\n"
            "- Integrated into the scene in a creative, organic way (written on "
            "surfaces, formed by objects, displayed on signs, carved into materials, "
            "floating in space, etc.)\n"
            "- Never the same rendering technique twice across scenes (vary the "
            "material and placement)\n\n"
            "For each scene, specify the exact text, rendering technique, and "
            "placement in the text_element and word_render fields."
        )
    return (
        "WORD IN COMPOSITION: DISABLED\n"
        "Do not include any readable text in the scenes. Set text_element to null "
        "and word_render.enabled to false for all scenes."
    )


def _context_block(context: Optional[ImageContext]) -> str:
    """Section 10.3: Context integration (only when provided)."""
    if context is None:
        return ""

    lines = []
    if context.music_caption:
        lines.append(f"- Musical mood: {context.music_caption}")
    if context.visual_hint:
        lines.append(f"- Visual mood seed: {context.visual_hint}")
    if context.lyrics:
        lines.append(f"- Song lyrics for reference: {context.lyrics}")
    if context.mnemonic:
        lines.append(f"- Learner mnemonic: {context.mnemonic} (a memory aid the learner reads alongside the video — if it suggests something concrete and visual, consider weaving it into your scenes)")

    if not lines:
        return ""

    return (
        "CONTEXT (use as creative inspiration, not strict requirements):\n"
        + "\n".join(lines)
        + "\n\nUse this context to inform the emotional tone and atmosphere of your "
        "scenes. You are not required to follow it literally."
    )


def _music_caption_block(settings: ImageSettings, language: str) -> str:
    """Instruct the LLM to generate a music caption that matches the visual scenes."""
    vocal = settings.vocal_gender if settings.vocal_gender != "any" else "male or female"

    # Light art-style-to-music hints for select styles
    art_hint = ""
    style = (settings.art_style or "").lower()
    hints = {
        "ghibli": "Consider: Studio Ghibli films use gentle piano, strings, and woodwinds.",
        "cyberpunk": "Consider: Cyberpunk aesthetics pair with synthwave, electronic, dark beats.",
        "watercolor": "Consider: Watercolor aesthetics pair with acoustic, gentle, organic sounds.",
        "anime": "Consider: Anime soundtracks range from J-pop to orchestral — match the scene mood.",
        "noir": "Consider: Film noir pairs with smoky jazz, muted brass, and sultry vocals.",
    }
    for key, hint in hints.items():
        if key in style:
            art_hint = f"\n{hint}"
            break

    return (
        "MUSIC CAPTION (REQUIRED):\n"
        "Generate a single-line music caption that describes the ideal soundtrack for these scenes. "
        "This caption will be used by a music generation AI to create a short song.\n\n"
        "The caption must:\n"
        "- Lead with the genre, mood, and musical style\n"
        f"- Include \"{vocal} vocal\" and \"singing in {language}\" early in the caption (2nd or 3rd position)\n"
        "- Keep instrumentation focused — name 1-2 specific instruments, not a full production\n"
        "- End with \"clear diction\" for vocal clarity\n"
        "- Match the emotional tone and atmosphere of the scenes you designed\n"
        "- Be 15-30 words, single line, no line breaks\n"
        "- Do NOT include BPM, tempo, or numeric values — describe energy through mood words instead\n"
        f"{art_hint}\n\n"
        "Examples of good captions:\n"
        f'- "melancholic melodic techno, {vocal} vocal singing in {language}, warm analog pad, clear diction"\n'
        f'- "playful acoustic pop, {vocal} vocal singing in {language}, gentle fingerpicked guitar, clear diction"'
    )


def _visual_reference_block(
    visual_reference: str,
    etymology: Optional[str],
    mnemonic: Optional[str],
) -> str:
    """Build prompt block that anchors visual decisions on etymology/mnemonic data."""
    if visual_reference == "none":
        return ""

    if visual_reference == "etymology":
        if not etymology:
            return ""
        return (
            "VISUAL ANCHOR — ETYMOLOGY:\n"
            f"This word breaks down as: {etymology}\n\n"
            "Use this etymological breakdown as your primary visual anchor. "
            "Design the scene to literally or metaphorically depict the component meanings. "
            "The viewer should be able to 'see' the word's roots in the image. "
            "Maintain the selected art style and creative direction while grounding "
            "the visual concept in the etymology."
        )

    if visual_reference == "mnemonic":
        if not mnemonic:
            return ""
        return (
            "VISUAL REFERENCE — MNEMONIC:\n"
            f'The learner has this memory device for the word: "{mnemonic}"\n\n'
            "This mnemonic is a BRIDGE — it connects the word's sound to its meaning "
            "through an image or association. Your visual design should make this bridge visible.\n\n"
            "If the mnemonic describes something concrete (an object, action, physical setting, "
            "or creature), use it as a primary visual element in your scenes. A viewer who has "
            "read the mnemonic should immediately recognize the connection.\n\n"
            "If the mnemonic is purely phonetic (a sound-alike without a clear visual), you may "
            "reference it subtly or let the word's actual meaning drive the visual instead. Not "
            "every mnemonic translates to a strong image — use your judgment.\n\n"
            "The mnemonic should INFORM your creative vision, not constrain it. You are still "
            "the art director. A mnemonic about a \"ball\" in a cinematic direction means a "
            "dramatically lit, emotionally charged ball scene — not a flat photograph of a ball."
        )

    if visual_reference == "auto":
        parts = []
        if etymology:
            parts.append(f"Etymology: \"{etymology}\"")
        if mnemonic:
            parts.append(f"Mnemonic: \"{mnemonic}\"")
        if not parts:
            return ""
        return (
            "VISUAL REFERENCE — AUTO:\n"
            "You have two memory anchors available for this word:\n\n"
            + "\n".join(parts)
            + "\n\n"
            "Examine both. Choose whichever provides a stronger, more visually depictable "
            "anchor for your scenes — or use elements from both if they complement each other. "
            "If neither provides useful visual material, design freely based on the word's "
            "meaning alone.\n\n"
            "State your choice briefly in your visual_concept field."
        )

    return ""


def _mnemonic_text_block(translation: str) -> str:
    """Instruct the LLM to generate a learner-facing mnemonic from the storyboard."""
    return (
        "MNEMONIC FOR THE LEARNER:\n"
        "Generate a 'mnemonic_text' field — one sentence that tells the learner "
        "what they will see in the video and how it helps them remember the word.\n\n"
        "Rules:\n"
        f"- Write in the same language as the translation field (e.g. if translation is '{translation}', "
        "write in that language)\n"
        "- Describe the key visual action or image from YOUR storyboard\n"
        "- Connect it explicitly to the word's meaning\n"
        "- Be concrete and visual, not abstract\n"
        "- 1-2 sentences maximum\n\n"
        'Example for "Fumble" (German translation: "verpatzen"): '
        '"Stell dir einen Quarterback vor, der den Ball fallen lässt — dieses '
        'Versagen im entscheidenden Moment ist ein FUMBLE."\n'
        'Example for "Sever" (German translation: "trennen"): '
        '"Jemand schneidet mit einem Messer ein Foto durch — die Verbindung wird '
        'durchtrennt, genau wie SEVER bedeutet."'
    )


def _generation_instructions(
    scene_count: int, aspect_ratio: str = "16:9", is_auto_count: bool = False,
    text_to_video: bool = False,
) -> str:
    """Instructions on scene count and format."""
    medium = "video clip" if text_to_video else "image"
    if is_auto_count:
        return (
            f"Each scene must work as a standalone "
            f"{aspect_ratio} {medium} that would be compelling without any other context."
        )
    return (
        f"Generate exactly {scene_count} scene(s). Each scene must work as a standalone "
        f"{aspect_ratio} {medium} that would be compelling without any other context."
    )


def _transition_prompt_block() -> str:
    """Instruction block for video_prompt and transition_prompt per scene."""
    return (
        "=== VIDEO PROMPT WRITING — TWO MODES PER SCENE ===\n\n"
        "Each scene needs TWO distinct prompts for video animation:\n\n"
        '1. "video_prompt" — For STANDALONE animation (hard cut, no morphing).\n'
        "   Write as a self-contained motion description. The scene should feel complete\n"
        "   within its duration. Describe:\n"
        "   - What the subject DOES (specific, constrained actions)\n"
        "   - What environmental elements move (wind, steam, light flicker)\n"
        "   - Camera movement if specified in camera_motion\n"
        "   - The scene should LOOP well — end state similar to start state\n"
        "   DO NOT describe transitions to other scenes.\n"
        "   KEEP the subject anchored — it should not transform, change species,\n"
        "   or dramatically change pose. Subtle, naturalistic motion.\n"
        '   Include explicit constraints: "The [subject] remains [description] throughout."\n\n'
        '2. "transition_prompt" — For MORPH animation (frame-to-frame to next scene).\n'
        "   Write as a cinematic transformation FROM this scene TO the next.\n"
        "   Describe the visual journey between the two images.\n"
        "   This prompt guides an AI video model that receives both start and end images.\n"
        "   - Describe what dissolves, what emerges, what moves\n"
        "   - Create visual momentum TOWARD the next scene's composition\n"
        "   - Under 80 words\n"
        "   - If this is the LAST scene, set to null (nothing follows it)\n"
        "   - If frame_narrative is COLLECTION, set ALL to null (scenes are independent)\n"
        "   - The transition should be consistent with the transformation mode:\n"
        "     - SCALE: describe the scale shift — zooming in, pulling back, or cutting between distances\n"
        "     - ACTION: describe the subject's physical movement or state change between frames\n"
        "     - ENVIRONMENT: describe the environmental transformation between frames\n"
        "     - NARRATIVE: describe the story beat connecting two moments\n"
        "     - CONTEXT: describe the scene dissolving or transforming between completely different settings\n"
        '   - Write in present tense, cinematically: "The camera orbits..." not "The camera will orbit..."\n\n'
        "CRITICAL DIFFERENCE:\n"
        '- video_prompt: "Marmot sleeps peacefully, chest rising and falling gently,\n'
        "  aurora shimmers overhead. The marmot remains curled in the nest throughout the shot.\"\n"
        '- transition_prompt: "The nest dissolves into swirling snow, the sleeping\n'
        "  marmot uncurls and rises, the cliffside transforms into a woodland clearing\n"
        '  as warm lantern light replaces cold moonlight."\n\n'
        "The video_prompt must NEVER describe transition to the next scene.\n"
        "The transition_prompt must ALWAYS describe transformation to the next scene.\n\n"
        "ANTI-HALLUCINATION RULES FOR video_prompt:\n"
        "- End every video_prompt with an explicit anchor statement:\n"
        '  "The [subject] remains [key identifying features] throughout the shot."\n'
        '  Example: "The brown marmot with red scarf remains sleeping in the nest throughout the shot."\n'
        "- Never mention elements from OTHER scenes in a video_prompt\n"
        "- Describe only motion that could realistically occur within a single static shot\n"
        "- Prefer environmental motion (wind, light, particles) over subject transformation\n"
        '- If camera_motion is "static", emphasize subtle environmental animation only'
    )


def _text_to_video_prompt_block() -> str:
    """Instruction block for text-to-video mode — rich, self-contained scene prompts."""
    return (
        "=== TEXT-TO-VIDEO SCENE PROMPTS ===\n\n"
        "For each scene, write a `video_prompt` that is the COMPLETE, SELF-CONTAINED "
        "description of the video clip. This prompt will be sent directly to an AI video "
        "generation model with NO source image — the model must create everything from "
        "your text alone.\n\n"
        "Each video_prompt MUST include ALL of the following in a single flowing paragraph:\n\n"
        "1. SCENE ESTABLISHMENT: Describe the subject, environment, setting, and "
        "atmosphere in vivid detail. Include clothing, colors, materials, textures, "
        "lighting conditions, time of day, weather. The video model has nothing to "
        "look at — you must paint the complete picture in words.\n\n"
        "2. ACTION & MOTION: Describe what moves and how. Be specific about the speed "
        "and nature of movement (gentle breathing, violent shaking, slow drift, "
        "sudden burst). Include environmental motion (wind in hair, steam rising, "
        "light shifting, rain falling).\n\n"
        "3. CAMERA DIRECTION: Incorporate camera movement naturally into the prose. "
        'Instead of relying solely on the camera_motion object, weave it in: "The camera slowly '
        'dollies forward through the rain..." or "A crane shot rises to reveal..." '
        "Use cinematic language: dolly, orbit, tracking shot, crane, push in, "
        "pull out, handheld, static wide.\n\n"
        "4. MOOD & STYLE: Describe the visual style (photorealistic, cinematic, "
        "editorial), color grading (warm amber tones, cool blue cast, desaturated), "
        "and emotional atmosphere.\n\n"
        "video_prompt guidelines:\n"
        "- 60-120 words per scene (rich enough for full scene establishment)\n"
        "- Write in present tense, describing what IS happening\n"
        '- End with an anchor: "The [subject] remains [key visual feature] throughout."\n'
        "- Each scene is independently generated — no references to other scenes\n"
        "- Do NOT describe text, words, or typography in the scene\n"
        "- Think like a cinematographer writing a shot description for a crew "
        "that has never seen the location\n\n"
        "IMPORTANT: You are still generating a structured `camera_motion` object per scene. "
        "This is used for metadata and downstream processing. The camera direction should "
        "appear BOTH in the video_prompt prose AND in the camera_motion object.\n\n"
        "Do NOT generate `transition_prompt` — set it to null for all scenes. "
        "All scenes will be independently generated and cut together."
    )


def _output_schema_text_to_video_block(aspect_ratio: str = "16:9", creative_direction: str = "") -> str:
    """Output schema for text-to-video mode — no image_prompt or word_render."""
    is_movie = creative_direction in ("movie", "movie_remix")
    is_remix = creative_direction == "movie_remix"

    movie_top_fields = ""
    if is_movie:
        movie_top_fields = (
            '  "movie_source_strategy": "<single_movie|multi_movie>",\n'
            '  "movies_referenced": ["<Movie Title 1>", "<Movie Title 2>"],\n'
        )

    movie_scene_fields = ""
    if is_movie:
        movie_scene_fields = (
            '      "movie_reference": {\n'
            '        "title": "<movie title>",\n'
            '        "year": <release year>,\n'
            '        "scene_description": "<which specific scene/moment this recreates>",\n'
            '        "actors": ["<Actor Name as Character Name — full physical description>"],\n'
            '        "color_signature": "<the film\'s visual color grading signature>"\n'
            "      },\n"
        )
    if is_remix:
        movie_scene_fields += (
            '      "remix_element": {\n'
            '        "alteration_type": "<object_swap|scale_absurdity|anachronism|animal_substitution|material_swap|emotional_mismatch>",\n'
            '        "original": "<what was originally in the scene>",\n'
            '        "replacement": "<what it has been replaced with>",\n'
            '        "word_connection": "<how this connects to the vocabulary word, or \'visual humor only\'>"\n'
            "      },\n"
        )

    return (
        "OUTPUT FORMAT:\n"
        "Return ONLY valid JSON (no markdown fences, no commentary) matching this exact structure:\n\n"
        "{\n"
        '  "word": "<the vocabulary word>",\n'
        '  "translation": "<English translation>",\n'
        '  "language": "<language name>",\n'
        '  "creative_direction": "<MUST be exactly one of: literal|editorial|cinematic|provocative|minimal|movie|movie_remix — echo the mode you were given verbatim, do not paraphrase>",\n'
        '  "frame_narrative": "<the transformation mode>",\n'
        '  "art_style": "<the visual style used or chosen>",\n'
        '  "scene_count": <number of scenes>,\n'
        '  "visual_concept": "<one paragraph describing overall visual approach>",\n'
        '  "shared_palette": ["<color1>", "<color2>", "<color3>"],\n'
        '  "shared_motif": "<recurring visual element across scenes>",\n'
        '  "music_caption": "<single-line music caption: genre, mood, instrumentation, vocal gender, language, clear diction>",\n'
        '  "mnemonic_text": "<one sentence in the same language as \'translation\': what the learner sees in the video and how it connects to the word\'s meaning — a concrete memory anchor>",\n'
        '  "suggested_transition_mode": "all_cut",\n'
        '  "transition_rationale": "Text-to-video scenes are independently generated and cut together",\n'
        + movie_top_fields +
        '  "scenes": [\n'
        "    {\n"
        '      "scene_number": 1,\n'
        '      "description": "<human-readable scene summary>",\n'
        '      "video_prompt": "<THE PRIMARY OUTPUT — rich, self-contained 60-120 word video scene description>",\n'
        '      "camera_motion": {\n'
        '        "type": "dolly_in",\n'
        '        "direction": "toward the subject",\n'
        '        "speed": "slow",\n'
        '        "description": "deliberate push toward the character\'s face as emotion builds"\n'
        "      },\n"
        '      "transition_prompt": null,\n'
        '      "suggested_duration": "<integer seconds 3-10>",\n'
        '      "duration_rationale": "<why this duration serves the scene>",\n'
        + movie_scene_fields +
        "    }\n"
        "  ]\n"
        "}\n\n"
        "IMPORTANT:\n"
        '- suggested_transition_mode MUST be "all_cut" for text-to-video\n'
        "- transition_prompt MUST be null for ALL scenes\n"
        "- Do NOT include image_prompt or word_render fields\n"
        f'- All scenes target {aspect_ratio} aspect ratio\n'
        "- Return ONLY the JSON object, nothing else\n\n"
        "CAMERA MOTION (choose the motion that best serves the scene's emotion and energy):\n"
        "- camera_motion.type options:\n"
        '  BASIC: "slow_zoom_in", "slow_zoom_out", "pan_left", "pan_right", "pan_up", "pan_down", "static"\n'
        '  CINEMATIC: "dolly_in", "dolly_out", "orbit_left", "orbit_right", "tracking_left", '
        '"tracking_right", "crane_up", "crane_down", "push_in", "pull_out", "handheld"\n'
        "  \n"
        "  Choose motion types based on the scene's composition, emotion, and the frame_narrative mode.\n"
        "  CINEMATIC motions create depth and immersion — prefer them over basic zoom/pan.\n"
        '  Only use "static" when absolute stillness serves the story.\n'
        '  Do NOT invent new values. Do NOT use "N/A".\n\n'
        '- camera_motion.speed: "very_slow", "slow", "medium", "fast"\n'
        '  Match speed to scene energy.\n\n'
        "- camera_motion.direction and camera_motion.description: write brief natural language.\n\n"
        "VARY YOUR CHOICES. Do NOT use the same camera motion type for all scenes.\n\n"
        "CRITICAL: Every field in your JSON output must have a real value. "
        'Never use "N/A", "none", or empty strings for any field.'
    )


def _duration_allocation_block(
    total_duration: int,
    scene_count: int,
    short_mode: bool = False,
) -> str:
    """Instruct the LLM to allocate per-scene durations for video animation."""
    if scene_count <= 1:
        return ""
    if short_mode:
        return (
            "=== SCENE DURATION ALLOCATION ===\n\n"
            "For short mode, choose 2 or 3 scenes and assign each scene a "
            '"suggested_duration" between 3 and 10 seconds so the total is exactly '
            "15 seconds, giving less time to quick beats and more time to shots "
            "that need to breathe."
        )
    return (
        "=== SCENE DURATION ALLOCATION ===\n\n"
        f"Your scenes will be animated as video clips to accompany a {total_duration}-second song.\n"
        "Allocate clip durations across your scenes that serve the emotional arc:\n"
        f"- Total of all suggested_duration values should be close to {total_duration} seconds "
        f"(within ±2s is fine)\n"
        "- Valid per-scene durations: 6, 8, or 10 seconds ONLY (video model constraint)\n"
        "- Consider pacing: quick establishing shots (6s), lingering atmospheric moments (10s),\n"
        "  standard scenes (8s)\n"
        "- The duration should match what's happening: static/contemplative scenes can be longer,\n"
        "  dynamic/busy scenes can be shorter\n\n"
        "Duration examples:\n"
        f"- 2 scenes at {total_duration}s: 10+10={min(20, total_duration)}s works well\n"
        f"- 3 scenes at {total_duration}s: 6+6+8=20s or 6+8+8=22s\n\n"
        "For each scene, include:\n"
        '  "suggested_duration": <integer seconds — must be 6, 8, or 10>,\n'
        '  "duration_rationale": "<why this duration serves the scene>"'
    )


def _output_schema_block(aspect_ratio: str = "16:9", creative_direction: str = "") -> str:
    """Section 10.5: Output schema the LLM must return."""
    is_movie = creative_direction in ("movie", "movie_remix")
    is_remix = creative_direction == "movie_remix"

    # Top-level movie fields (inserted after shared_motif)
    movie_top_fields = ""
    if is_movie:
        movie_top_fields = (
            '  "movie_source_strategy": "<single_movie|multi_movie>",\n'
            '  "movies_referenced": ["<Movie Title 1>", "<Movie Title 2>"],\n'
            '  "suggested_transition_mode": "<all_cut|morph_then_cut|cut_then_morph|all_morph>",\n'
            '  "transition_rationale": "<why this transition approach serves these scenes>",\n'
        )

    # Per-scene movie fields (inserted after duration_rationale)
    movie_scene_fields = ""
    if is_movie:
        movie_scene_fields = (
            '      "movie_reference": {\n'
            '        "title": "<movie title>",\n'
            '        "year": <release year>,\n'
            '        "scene_description": "<which specific scene/moment this recreates>",\n'
            '        "actors": ["<Actor Name as Character Name — full physical description>"],\n'
            '        "color_signature": "<the film\'s visual color grading signature>"\n'
            "      },\n"
        )
    if is_remix:
        movie_scene_fields += (
            '      "remix_element": {\n'
            '        "alteration_type": "<object_swap|scale_absurdity|anachronism|animal_substitution|material_swap|emotional_mismatch>",\n'
            '        "original": "<what was originally in the scene>",\n'
            '        "replacement": "<what it has been replaced with>",\n'
            '        "word_connection": "<how this connects to the vocabulary word, or \'visual humor only\'>"\n'
            "      },\n"
        )

    return (
        "OUTPUT FORMAT:\n"
        "Return ONLY valid JSON (no markdown fences, no commentary) matching this exact structure:\n\n"
        "{\n"
        '  "word": "<the vocabulary word>",\n'
        '  "translation": "<English translation>",\n'
        '  "language": "<language name>",\n'
        '  "creative_direction": "<MUST be exactly one of: literal|editorial|cinematic|provocative|minimal|movie|movie_remix — echo the mode you were given verbatim, do not paraphrase>",\n'
        '  "frame_narrative": "<the transformation mode — when auto-picking, this is YOUR choice from the six options; otherwise echo the requested mode>",\n'
        '  "art_style": "<the art style used or chosen>",\n'
        '  "scene_count": <number of scenes>,\n'
        '  "visual_concept": "<one paragraph describing overall visual approach>",\n'
        '  "shared_palette": ["<color1>", "<color2>", "<color3>"],\n'
        '  "shared_motif": "<recurring visual element across scenes>",\n'
        '  "music_caption": "<single-line music caption: genre, mood, instrumentation, vocal gender, language, clear diction>",\n'
        '  "mnemonic_text": "<one sentence in the same language as \'translation\': what the learner sees in the video and how it connects to the word\'s meaning — a concrete memory anchor>",\n'
        + movie_top_fields +
        '  "scenes": [\n'
        "    {\n"
        '      "scene_number": 1,\n'
        '      "description": "<human-readable scene description>",\n'
        '      "image_prompt": {\n'
        '        "subject": "<primary subject/focal point>",\n'
        '        "scene": "<environment, setting, background>",\n'
        '        "style": "<visual/photographic style>",\n'
        '        "lighting": "<lighting conditions, direction, quality>",\n'
        '        "composition": "<camera angle, framing, spatial arrangement>",\n'
        '        "mood": "<emotional tone>",\n'
        '        "colors": ["<color1>", "<color2>"],\n'
        '        "details": "<environmental details, textures>",\n'
        f'        "aspect_ratio": "{aspect_ratio}",\n'
        '        "text_element": {\n'
        '          "text": "<THE WORD IN TARGET LANGUAGE, UPPERCASE>",\n'
        '          "rendering": "<how the text is physically rendered>",\n'
        '          "placement": "<where in the scene the text appears>"\n'
        "        }\n"
        "      },\n"
        '      "word_render": {\n'
        '        "enabled": true,\n'
        '        "text": "<the word>",\n'
        '        "technique": "<rendering technique>",\n'
        '        "placement": "<placement description>",\n'
        '        "integration_note": "<how it connects to the scene>"\n'
        "      },\n"
        '      "camera_motion": {\n'
        '        "type": "dolly_in",\n'
        '        "direction": "toward the subject",\n'
        '        "speed": "slow",\n'
        '        "description": "deliberate push toward the character\'s face as emotion builds"\n'
        "      },\n"
        '      "video_prompt": "<natural language description of scene with motion for AI video generation>",\n'
        '      "transition_prompt": "<cinematic description of the visual transformation from this scene to the next scene, or null for the last scene and all collection mode scenes>",\n'
        '      "suggested_duration": "<integer seconds 3-10, how long this scene should animate>",\n'
        '      "duration_rationale": "<why this duration serves the scene>",\n'
        + movie_scene_fields +
        "    }\n"
        "  ]\n"
        "}\n\n"
        "IMPORTANT:\n"
        "- text_element should be null and word_render.enabled should be false "
        "if word-in-image is disabled\n"
        f'- aspect_ratio must always be "{aspect_ratio}"\n'
        "- Return ONLY the JSON object, nothing else\n\n"
        "CAMERA MOTION (choose the motion that best serves the scene's emotion and energy):\n"
        "- camera_motion.type options:\n"
        '  BASIC: "slow_zoom_in", "slow_zoom_out", "pan_left", "pan_right", "pan_up", "pan_down", "static"\n'
        '  CINEMATIC: "dolly_in", "dolly_out", "orbit_left", "orbit_right", "tracking_left", '
        '"tracking_right", "crane_up", "crane_down", "push_in", "pull_out", "handheld"\n'
        "  \n"
        "  Choose motion types based on the scene's composition, emotion, and the frame_narrative mode.\n"
        "  CINEMATIC motions create depth and immersion — prefer them over basic zoom/pan.\n"
        '  Only use "static" when absolute stillness serves the story (e.g., a frozen moment of shock).\n'
        '  Do NOT invent new values. Do NOT use "N/A".\n\n'
        '- camera_motion.speed: "very_slow", "slow", "medium", "fast"\n'
        '  Match speed to scene energy. Action = "medium" or "fast". Drama = "slow". '
        'Contemplation = "very_slow".\n'
        '  Do NOT use "N/A", "gentle", or any other value.\n\n'
        "- camera_motion.direction and camera_motion.description: write brief natural "
        'language. Never use "N/A".\n\n'
        "VARY YOUR CHOICES. Do NOT use the same camera motion type for all scenes. Each scene should "
        "have a DIFFERENT motion type that serves its specific composition and emotion.\n\n"
        "CAMERA MOTION EXAMPLES (showing variety — do not copy these rigidly):\n"
        '- Wide establishing shot of a cityscape: type: "crane_up", speed: "very_slow"\n'
        '- Character running through a corridor: type: "tracking_right", speed: "fast"\n'
        '- Emotional close-up building tension: type: "push_in", speed: "medium"\n'
        '- Chaotic kitchen disaster unfolding: type: "handheld", speed: "medium"\n\n'
        "CRITICAL: Every field in your JSON output must have a real value. "
        'Never use "N/A", "none", "null", or empty strings for any field. '
        "If a field doesn't apply, use the most sensible default from the allowed options."
    )
