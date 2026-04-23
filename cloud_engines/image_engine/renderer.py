"""Step B: Image rendering via Google Gemini.

Per ENGINE_IMAGE.md Section 11: Send image_prompt JSON as text prompt,
receive PNG image, save to output directory.
"""

from __future__ import annotations

import io
import json
import logging
import os
import re
import time
from pathlib import Path
from typing import Optional

from google import genai
from google.genai import types
from PIL import Image, ImageDraw, ImageFont
from src.services.events import logged_api_call

from . import config
from .models import (
    ImagePromptData,
    RenderingStepMeta,
    RenderResult,
    Storyboard,
    resolve_frame_narrative,
)
from src.cost_logger import (
    estimate_gemini_image_cost,
    log_cost,
    KIE_WAN_COST_PER_IMAGE,
    KIE_FLUX_PRO_COST_PER_IMAGE,
    FAL_ZTURBO_COST_PER_IMAGE,
)

logger = logging.getLogger(__name__)


class _ProviderRenderError(RuntimeError):
    """Internal sentinel so provider failures log a failed event before fallback."""

# Retry constants
TIMEOUT_RETRY_DELAY = 5.0
RATE_LIMIT_MAX_RETRIES = 3

# Refusal detection thresholds (minimum expected bytes for a real image)
_MIN_IMAGE_BYTES: dict[str, int] = {
    "16:9": 15_000,
    "1:1": 10_000,
    "9:16": 15_000,
}


def _is_likely_refusal(image_data: bytes, aspect_ratio: str = "16:9") -> bool:
    """Detect near-black placeholder images from Gemini soft refusals.

    Checks file size against minimum threshold and pixel variance for
    near-uniform dark images that indicate content filtering.
    """
    min_bytes = _MIN_IMAGE_BYTES.get(aspect_ratio, 10_000)
    if len(image_data) < min_bytes:
        return True
    try:
        gray = Image.open(io.BytesIO(image_data)).convert("L")
        pixels = list(gray.getdata())
        if not pixels:
            return True
        mean_val = sum(pixels) / len(pixels)
        variance = sum((p - mean_val) ** 2 for p in pixels) / len(pixels)
        if mean_val < 15 and variance < 50:
            return True
    except Exception:
        pass
    return False
RATE_LIMIT_BASE_DELAY = 2.0


def resolve_model_id(image_model: str) -> str:
    """Resolve image_model setting value to an actual provider model ID.

    Args:
        image_model: 'flux_pro', 'zturbo', or 'wan_fallback'.

    Returns:
        Concrete provider model ID string. i2i variants are selected
        inside the dispatch block in render_scene when a reference image
        is provided.

    Raises:
        ValueError: on any value outside the whitelist. The Pydantic
            validator upstream guards the enum, so reaching this branch
            means a missing enum case here.
    """
    if image_model == "flux_pro":
        return "flux-2/pro-text-to-image"
    if image_model == "zturbo":
        return "fal-ai/z-image/turbo"
    if image_model == "wan_fallback":
        return "wan/2-7-image"
    raise ValueError(f"unknown image_model: {image_model}")


CHAIN_INSTRUCTIONS: dict[str, Optional[str]] = {
    "scale": (
        "Using the provided reference image, show the SAME subject at a dramatically "
        "different scale of observation. Preserve recognizable elements but change the "
        "distance, composition, and surrounding context completely."
    ),
    "action": (
        "Using the provided reference image, show the SAME subject doing something "
        "different. The subject's core identity stays consistent; the environment can "
        "shift naturally around them."
    ),
    "environment": (
        "Using the provided reference image, show the SAME subject with dramatically "
        "different surroundings. The subject stays recognizable but can react naturally "
        "to the new environment."
    ),
    "narrative": (
        "Using the provided reference image as the previous moment in the story, show "
        "what happens NEXT as described in the prompt. The subject should remain "
        "recognizable, but both subject and setting can evolve as the narrative demands."
    ),
    "context": (
        "Using the provided reference image, place the SAME recognizable subject into "
        "a completely different scene and context. The subject's defining features must "
        "be preserved; everything else changes."
    ),
    "collection": None,  # No chaining — each scene rendered independently
}

# Fallback for unrecognized modes (should not happen after sanitization)
_FALLBACK_CHAIN_INSTRUCTION = (
    "Using the provided reference image, generate a new image that maintains the same "
    "subject identity, visual style, and overall aesthetic, but apply the changes "
    "described in the scene prompt below."
)

# ---------------------------------------------------------------------------
# Wan-specific chain instructions
# ---------------------------------------------------------------------------
# Wan's input_urls parameter is img2img conditioning at full strength — no API
# knob to reduce it.  The Gemini instructions above say "SAME subject" and
# "stays consistent", which reinforces img2img dominance and causes Wan to
# reproduce the previous scene with only color shifts.  These Wan-specific
# instructions explicitly deprioritize the reference image and assert that
# the new composition described in the prompt must take precedence.

CHAIN_INSTRUCTIONS_WAN: dict[str, Optional[str]] = {
    "scale": (
        "The reference image shows the general subject and style. "
        "Use it ONLY for subject identity — generate a fresh composition at a "
        "completely different scale of observation. DO NOT reproduce the reference "
        "layout, framing, or camera distance. New framing, new context."
    ),
    "action": (
        "The reference image shows the general subject and style. "
        "Use it ONLY for subject identity — generate a fresh composition showing "
        "the subject in a different action and pose as described below. "
        "DO NOT reproduce the reference layout, framing, or body position."
    ),
    "environment": (
        "The reference image shows the general subject and style. "
        "Use it ONLY for subject identity — generate a fresh scene with "
        "dramatically different surroundings as described below. "
        "DO NOT reproduce the reference background, setting, or composition."
    ),
    "narrative": (
        "The reference image shows the previous moment in this story. "
        "Use it ONLY for subject identity — generate a fresh composition showing "
        "what happens NEXT as described below. DO NOT reproduce the reference "
        "layout, framing, or pose. Both subject and setting must evolve."
    ),
    "context": (
        "The reference image shows the general subject. "
        "Use it ONLY for subject identity — generate a completely different scene "
        "and context as described below. DO NOT reproduce any element of the "
        "reference except the subject's core recognizable identity."
    ),
    "collection": None,  # No chaining — each scene rendered independently
}

_FALLBACK_CHAIN_INSTRUCTION_WAN = (
    "The reference image shows the general subject and style. "
    "Use it ONLY for subject identity — generate a fresh composition as described "
    "in the prompt below. DO NOT reproduce the reference layout or framing."
)

# ---------------------------------------------------------------------------
# Flux 2 Pro / Z-Image-Turbo chain-instruction scaffolds (v1 = clones of
# the Gemini-flavoured table). Tuning is post-ship empirical work — see
# FU1 in docs/superpowers/plans/... for the follow-up.
# ---------------------------------------------------------------------------

CHAIN_INSTRUCTIONS_FLUX: dict[str, Optional[str]] = dict(CHAIN_INSTRUCTIONS)
_FALLBACK_CHAIN_INSTRUCTION_FLUX = _FALLBACK_CHAIN_INSTRUCTION

CHAIN_INSTRUCTIONS_ZTURBO: dict[str, Optional[str]] = dict(CHAIN_INSTRUCTIONS)
_FALLBACK_CHAIN_INSTRUCTION_ZTURBO = _FALLBACK_CHAIN_INSTRUCTION

# ---------------------------------------------------------------------------
# Art-style rendering preambles
# ---------------------------------------------------------------------------
# These are prepended to the image_prompt JSON before sending to Gemini.
# They prime the model for the specific visual quality of each style.

_PHOTOREALISTIC_PREAMBLE = """\
RENDERING DIRECTIVE — PHOTOREALISTIC PHOTOGRAPHY

You are generating a photograph indistinguishable from a high-end DSLR capture.
Apply ALL of the following characteristics:

CAMERA AND LENS:
- Standard focal length (35-85mm equivalent) unless the composition specifies otherwise
- Natural depth of field: sharp focus on the primary subject, gentle bokeh on background
- No wide-angle distortion, no fisheye, no tilt-shift unless explicitly requested
- Subtle natural lens effects: minimal chromatic aberration at edges, realistic vignetting

SKIN AND HUMAN SUBJECTS (when people are present):
- High-fidelity skin texture: visible pores, natural blemishes, fine hair, subsurface scattering
- No airbrushing, no plastic smoothing, no beauty filter effects
- Natural skin color variation: redder at extremities, subtle veins visible in thin-skinned areas
- Preserve all anatomical proportions exactly as described — do not normalize or average body types
- Eyes: realistic iris detail, natural catchlights from the described light source, visible scleral veins
- Hair: individual strand detail, natural flyaways, realistic shine and light interaction

LIGHTING:
- Physically accurate light behavior: correct shadow direction, shadow softness matches light source size
- Natural light falloff following the inverse square law
- Correct color temperature for the described lighting conditions
- Realistic ambient occlusion in tight spaces (under chin, behind ears, between fingers)
- Subsurface scattering on ears, nostrils, and thin skin when backlit

MATERIALS AND TEXTURES:
- Every surface has physically correct material properties
- Fabric: visible weave pattern, natural draping, correct weight behavior (silk vs cotton vs denim)
- Metal: accurate reflectivity, correct specular highlights
- Glass: refraction, accurate reflections, thickness visible at edges
- Wood: grain direction, surface finish (matte vs glossy)
- Water: correct reflection of surroundings, Fresnel effect, surface tension

ENVIRONMENT AND ATMOSPHERE:
- Atmospheric perspective: distant objects slightly hazed, color-shifted toward blue
- Natural color grading — no Instagram filters, no artificial color casts
- Correct scale relationships between all objects
- Realistic environmental details: dust motes in light beams, water droplets, worn surfaces

TECHNICAL OUTPUT:
- 4K sharpness and detail
- Natural film grain (subtle, not stylized)
- Medium-high contrast with rich shadows that still contain detail
- Highlight rolloff that preserves skin tone detail (no blown highlights on faces)

Now generate the following scene as described:"""

_NOIR_PREAMBLE = """\
RENDERING DIRECTIVE — FILM NOIR PHOTOGRAPHY

You are generating a high-contrast black-and-white photograph in the tradition
of classic film noir cinematography (1940s-1950s).

VISUAL CHARACTERISTICS:
- Pure black and white — no color, no sepia, no tinting
- Extreme contrast: deep blacks, bright whites, minimal midtones
- Hard, directional lighting creating dramatic shadows
- Venetian blind shadows, angular shadow patterns on walls and faces
- Light sources motivated by the scene: desk lamps, street lights, neon through windows
- Cigarette smoke, rain on windows, wet pavement reflections
- Low-key lighting: most of the frame is in shadow, light picks out key elements
- Characters partially obscured by shadow — mystery and tension in what's hidden

CAMERA:
- Classic focal lengths (50mm equivalent), slightly wide for establishing shots
- Deep focus when showing environments, shallow focus for intimate moments
- Slight dutch angle permitted for tension
- Film grain: heavier than modern photography, visible but not distracting

MOOD:
- Moody, atmospheric, suspenseful
- Urban nighttime aesthetic even in daytime scenes (blinds drawn, interiors)

Now generate the following scene as described:"""

_VINTAGE_FILM_PREAMBLE = """\
RENDERING DIRECTIVE — VINTAGE ANALOG PHOTOGRAPHY

You are generating an image that looks like it was shot on analog film stock
from the 1970s-1990s era.

VISUAL CHARACTERISTICS:
- Warm color cast: slightly yellow-orange tint, especially in highlights
- Lifted blacks: shadows don't go to pure black, they have a milky, faded quality
- Slight color channel bleed: reds and oranges slightly oversaturated, blues slightly muted
- Visible film grain: organic, random, more prominent in shadows and midtones
- Soft overall sharpness: detailed but without digital crispness
- Subtle light leaks permitted at frame edges (warm orange or magenta)
- Natural vignetting: corners slightly darker than center

CAMERA:
- Characteristic of consumer film cameras: 35-50mm focal length
- Slightly imperfect focus — sharp but not clinical
- Occasional lens flare from bright light sources

COLOR SCIENCE:
- Kodak Portra-like skin tones: warm, flattering, natural
- Greens slightly shifted toward yellow
- Blues retain their depth but with a warmer undertone
- Overall palette feels nostalgic, lived-in, comfortable

Now generate the following scene as described:"""

_CHIAROSCURO_PREAMBLE = """\
RENDERING DIRECTIVE — CHIAROSCURO LIGHTING

You are generating an image in the tradition of chiaroscuro painting and
Caravaggio-inspired dramatic lighting applied to photography.

VISUAL CHARACTERISTICS:
- Extreme contrast between light and dark
- Single strong directional light source, often from above-left
- Deep, rich shadows that consume most of the frame
- Subjects emerge from darkness, dramatically lit on one side
- Background is near-black or completely dark
- Warm light temperature (candle-like, golden)
- Painterly quality to the light falloff — not harsh, but deeply dramatic

SKIN AND MATERIALS:
- Skin glows where lit, with rich warm tones and visible texture
- Fabric catches light on folds and drapes into complete shadow
- Metal and glass create intense specular highlights against the darkness
- Every surface tells a story through how it interacts with the single light source

COMPOSITION:
- Subjects often off-center, partially consumed by shadow
- Negative space is darkness, not empty background
- The eye is guided entirely by where the light falls

Now generate the following scene as described:"""

STYLE_PREAMBLES: dict[str, str] = {
    "photorealistic": _PHOTOREALISTIC_PREAMBLE,
    "realistic photo": _PHOTOREALISTIC_PREAMBLE,
    "noir": _NOIR_PREAMBLE,
    "vintage_film": _VINTAGE_FILM_PREAMBLE,
    "chiaroscuro": _CHIAROSCURO_PREAMBLE,
}


def _get_style_preamble(art_style: str) -> str | None:
    """Return the rendering preamble for the given art style, or None.

    Matching strategy:
    1. Exact key match against STYLE_PREAMBLES.
    2. For short style strings (≤80 chars, i.e. LLM-generated labels from auto
       mode or custom styles), apply fuzzy keyword matching.
    3. For long descriptive strings (from ART_STYLE_DESCRIPTIONS), skip fuzzy
       matching entirely — those strings are authoritative and should not be
       keyword-scanned (e.g. "NOT photorealistic" in Richter's description
       must NOT trigger the photorealistic preamble).
    """
    if not art_style:
        return None
    # Exact match first
    if art_style in STYLE_PREAMBLES:
        return STYLE_PREAMBLES[art_style]
    # Only fuzzy-match short style strings (LLM labels, not full descriptions)
    if len(art_style) > 80:
        return None
    style_lower = art_style.lower()
    if any(term in style_lower for term in (
        "photorealistic", "photograph", "photo",
        "editorial photography", "cinematic photography",
    )):
        return STYLE_PREAMBLES["photorealistic"]
    if any(term in style_lower for term in ("noir", "black and white film")):
        return STYLE_PREAMBLES["noir"]
    if any(term in style_lower for term in ("vintage", "retro film", "analog", "polaroid")):
        return STYLE_PREAMBLES["vintage_film"]
    if "chiaroscuro" in style_lower:
        return STYLE_PREAMBLES["chiaroscuro"]
    return None


# --- Safety block recovery ---

_SAFETY_PREFIX = (
    "Create a tasteful, artistic, abstract interpretation of the following concept. "
    "Avoid any graphic, violent, sexual, or disturbing imagery. "
    "Use metaphor, symbolism, and artistic abstraction instead.\n\n"
)

_SENSITIVE_PATTERNS = re.compile(
    r'\b(blood|gore|naked|nude|corpse|dead body|weapon|gun|knife|'
    r'violent|explicit|gruesome|graphic|sexual|erotic|murder|kill|'
    r'drugs|injection|syringe|wound|injury)\b',
    re.IGNORECASE,
)


def _soften_prompt(parts: list[types.Part]) -> list[types.Part]:
    """Rewrite prompt parts to be less likely to trigger safety filters.

    Prepends a safety-conscious instruction and strips sensitive keywords
    from the text prompt while preserving composition/style instructions.
    """
    softened: list[types.Part] = []
    for part in parts:
        if part.text:
            cleaned = _SENSITIVE_PATTERNS.sub('***', part.text)
            softened.append(types.Part(text=_SAFETY_PREFIX + cleaned))
        else:
            softened.append(part)
    return softened


def _generate_fallback_image(
    word: str,
    colors: list[str],
    output_path: Path,
    width: int = 1920,
    height: int = 1080,
) -> Optional[bytes]:
    """Generate a minimal typographic fallback image when Gemini refuses.

    Creates the word in large text on a gradient background using the
    storyboard's color palette.
    """
    try:
        # Parse palette colors (use first two for gradient, or defaults)
        bg_color = _parse_color(colors[0]) if colors else (30, 25, 35)
        fg_color = _parse_color(colors[1]) if len(colors) > 1 else (180, 160, 150)

        img = Image.new("RGB", (width, height), bg_color)
        draw = ImageDraw.Draw(img)

        # Try to load a decent font, fall back to default
        font_size = min(width, height) // 4
        try:
            font = ImageFont.truetype("arial.ttf", font_size)
        except (OSError, IOError):
            try:
                font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", font_size)
            except (OSError, IOError):
                font = ImageFont.load_default()

        # Center the word
        bbox = draw.textbbox((0, 0), word, font=font)
        text_w = bbox[2] - bbox[0]
        text_h = bbox[3] - bbox[1]
        x = (width - text_w) // 2
        y = (height - text_h) // 2

        # Draw with slight shadow
        draw.text((x + 3, y + 3), word, fill=(0, 0, 0), font=font)
        draw.text((x, y), word, fill=fg_color, font=font)

        # Convert to bytes
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return buf.getvalue()

    except Exception as e:
        logger.error("Failed to generate fallback image: %s", e)
        return None


def _parse_color(color_str: str) -> tuple[int, int, int]:
    """Parse a CSS color string to RGB tuple. Handles hex (#RRGGBB) and named colors."""
    color_str = color_str.strip().lower()
    if color_str.startswith("#") and len(color_str) == 7:
        return (
            int(color_str[1:3], 16),
            int(color_str[3:5], 16),
            int(color_str[5:7], 16),
        )
    # Fallback for unparseable colors
    return (30, 25, 35)


def render_scene(
    image_prompt: ImagePromptData,
    model_id: str,
    output_path: Path,
    aspect_ratio: str = "16:9",
    reference_image_path: Optional[Path] = None,
    chain_instruction: Optional[str] = None,
    word: str = "",
    palette: Optional[list[str]] = None,
    use_color_palette: bool = False,
    *,
    word_id: str | None = None,
    deck_id: str | None = None,
    user_id: str | None = None,
    job_id: str | None = None,
    attempt: int | None = None,
) -> RenderResult:
    """Render a single scene to PNG via Gemini.

    Per Section 11.1-11.2: stringify image_prompt JSON, send to Gemini,
    extract image data, save as PNG.

    If Gemini blocks the content, retries once with a softened prompt.
    If still blocked, generates a typographic fallback image.

    Args:
        image_prompt: The structured image prompt data.
        model_id: Gemini model ID.
        output_path: Full path to save the PNG file.
        aspect_ratio: Target aspect ratio.
        reference_image_path: Optional path to previous scene's PNG for
            visual consistency chaining.
        chain_instruction: Mode-specific instruction to prepend when a
            reference image is provided.
        word: The word being rendered (for fallback image).
        palette: Color palette from storyboard (for fallback image).

    Returns:
        RenderResult indicating success or failure.
    """
    scene_number = int(output_path.stem)

    # --- Kie Flux 2 Pro route ---
    if model_id.startswith("flux-2/"):
        from .kie_provider import render_scene_kie_flux
        from .wan_provider import _upload_for_chaining

        flux_input_urls = None
        if reference_image_path and reference_image_path.exists() and chain_instruction:
            api_key = os.environ.get("KIE_API_KEY", "")
            if api_key:
                ref_url = _upload_for_chaining(reference_image_path, api_key)
                if ref_url:
                    flux_input_urls = [ref_url]
                    model_id = "flux-2/pro-image-to-image"
                    logger.info("Scene %d: Flux chaining via %s", scene_number, ref_url)
                else:
                    logger.warning(
                        "Scene %d: Flux upload failed, rendering without reference",
                        scene_number,
                    )

        prompt_payload = image_prompt.model_dump(exclude_none=True)
        request_payload = {
            "model": model_id,
            "aspect_ratio": aspect_ratio,
            "chain_instruction": chain_instruction,
            "input_urls": flux_input_urls,
            "use_color_palette": use_color_palette,
            "image_prompt": prompt_payload,
        }
        flux_result: Optional[dict] = None
        try:
            with logged_api_call(
                stage="images",
                sub_step="render_scene",
                event_source="engine",
                word_id=word_id,
                deck_id=deck_id,
                user_id=user_id,
                job_id=job_id,
                attempt=attempt,
                metadata={
                    "scene_number": scene_number,
                    "chained": reference_image_path is not None,
                    "reference_image": (
                        reference_image_path.name
                        if reference_image_path is not None
                        else None
                    ),
                    "output_path": output_path.name,
                },
            ) as ev:
                flux_result = render_scene_kie_flux(
                    image_prompt=prompt_payload,
                    model_id=model_id,
                    output_path=output_path,
                    aspect_ratio=aspect_ratio,
                    chain_instruction=chain_instruction,
                    input_urls=flux_input_urls,
                    use_color_palette=use_color_palette,
                )
                ev._model_provider = flux_result.get("provider_name")
                ev._model_name = flux_result.get("model_name")
                ev.record_response(
                    response_body=flux_result.get("response_body"),
                    request_body=json.dumps(request_payload, ensure_ascii=False),
                    request_id=flux_result.get("request_id"),
                    cost_usd=flux_result.get("cost_estimate_usd"),
                    scene_number=scene_number,
                    provider=flux_result.get("provider_name"),
                    output_file=flux_result.get("file_path"),
                    safety_blocked=False,
                )
                if not flux_result["success"]:
                    raise _ProviderRenderError(
                        flux_result.get("error_message") or "Provider render failed"
                    )
        except _ProviderRenderError:
            pass
        if flux_result and flux_result["success"]:
            return RenderResult(
                success=True,
                scene_number=scene_number,
                file_path=output_path.name,
                prompt_json=flux_result.get("prompt_text", ""),
                provider_name=flux_result.get("provider_name"),
                model_name=flux_result.get("model_name"),
                request_id=flux_result.get("request_id"),
                cost_estimate_usd=flux_result.get("cost_estimate_usd"),
                response_body=flux_result.get("response_body"),
            )
        # Flux failed — fall through to Wan fallback
        logger.warning(
            "Scene %d: Flux render failed (%s), falling back to Wan",
            scene_number, (flux_result or {}).get("error_message", "unknown"),
        )
        model_id = "wan/2-7-image"

    # --- Fal Z-Image-Turbo route ---
    if model_id.startswith("fal-ai/"):
        from .fal_provider import render_scene_fal_zturbo_sync

        if reference_image_path and reference_image_path.exists() and chain_instruction:
            model_id = "fal-ai/z-image/turbo/image-to-image"
            fal_ref = reference_image_path
            logger.info(
                "Scene %d: Fal chaining via local %s",
                scene_number, fal_ref.name,
            )
        else:
            fal_ref = None

        prompt_payload = image_prompt.model_dump(exclude_none=True)
        request_payload = {
            "model": model_id,
            "aspect_ratio": aspect_ratio,
            "chain_instruction": chain_instruction,
            "reference_image": fal_ref.name if fal_ref else None,
            "use_color_palette": use_color_palette,
            "image_prompt": prompt_payload,
        }
        fal_result: Optional[dict] = None
        try:
            with logged_api_call(
                stage="images",
                sub_step="render_scene",
                event_source="engine",
                word_id=word_id,
                deck_id=deck_id,
                user_id=user_id,
                job_id=job_id,
                attempt=attempt,
                metadata={
                    "scene_number": scene_number,
                    "chained": fal_ref is not None,
                    "reference_image": fal_ref.name if fal_ref else None,
                    "output_path": output_path.name,
                },
            ) as ev:
                fal_result = render_scene_fal_zturbo_sync(
                    image_prompt=prompt_payload,
                    model_id=model_id,
                    output_path=output_path,
                    aspect_ratio=aspect_ratio,
                    chain_instruction=chain_instruction,
                    reference_image_path=fal_ref,
                    use_color_palette=use_color_palette,
                )
                ev._model_provider = fal_result.get("provider_name")
                ev._model_name = fal_result.get("model_name")
                ev.record_response(
                    response_body=fal_result.get("response_body"),
                    request_body=json.dumps(request_payload, ensure_ascii=False),
                    request_id=fal_result.get("request_id"),
                    cost_usd=fal_result.get("cost_estimate_usd"),
                    scene_number=scene_number,
                    provider=fal_result.get("provider_name"),
                    output_file=fal_result.get("file_path"),
                    safety_blocked=False,
                )
                if not fal_result["success"]:
                    raise _ProviderRenderError(
                        fal_result.get("error_message") or "Provider render failed"
                    )
        except _ProviderRenderError:
            pass
        if fal_result and fal_result["success"]:
            return RenderResult(
                success=True,
                scene_number=scene_number,
                file_path=output_path.name,
                prompt_json=fal_result.get("prompt_text", ""),
                provider_name=fal_result.get("provider_name"),
                model_name=fal_result.get("model_name"),
                request_id=fal_result.get("request_id"),
                cost_estimate_usd=fal_result.get("cost_estimate_usd"),
                response_body=fal_result.get("response_body"),
            )
        # Fal failed — fall through to Wan fallback
        logger.warning(
            "Scene %d: Fal render failed (%s), falling back to Wan",
            scene_number, (fal_result or {}).get("error_message", "unknown"),
        )
        model_id = "wan/2-7-image"

    # --- Wan 2.7 route ---
    if model_id.startswith("wan/"):
        from .wan_provider import render_scene_wan, _upload_for_chaining

        wan_input_urls = None
        if reference_image_path and reference_image_path.exists() and chain_instruction:
            api_key = os.environ.get("KIE_API_KEY", "")
            if api_key:
                ref_url = _upload_for_chaining(reference_image_path, api_key)
                if ref_url:
                    wan_input_urls = [ref_url]
                    logger.info("Scene %d: Wan chaining via %s", scene_number, ref_url)
                else:
                    logger.warning("Scene %d: Wan upload failed, rendering without reference", scene_number)

        prompt_payload = image_prompt.model_dump(exclude_none=True)
        request_payload = {
            "model": model_id,
            "aspect_ratio": aspect_ratio,
            "chain_instruction": chain_instruction,
            "input_urls": wan_input_urls,
            "use_color_palette": use_color_palette,
            "image_prompt": prompt_payload,
        }
        try:
            with logged_api_call(
                stage="images",
                sub_step="render_scene",
                event_source="engine",
                word_id=word_id,
                deck_id=deck_id,
                user_id=user_id,
                job_id=job_id,
                attempt=attempt,
                metadata={
                    "scene_number": scene_number,
                    "chained": reference_image_path is not None,
                    "reference_image": (
                        reference_image_path.name
                        if reference_image_path is not None
                        else None
                    ),
                    "output_path": output_path.name,
                },
            ) as ev:
                wan_result = render_scene_wan(
                    image_prompt=prompt_payload,
                    model_id=model_id,
                    output_path=output_path,
                    aspect_ratio=aspect_ratio,
                    chain_instruction=chain_instruction,
                    input_urls=wan_input_urls,
                    use_color_palette=use_color_palette,
                )
                ev._model_provider = wan_result.get("provider_name")
                ev._model_name = wan_result.get("model_name")
                ev.record_response(
                    response_body=wan_result.get("response_body"),
                    request_body=json.dumps(request_payload, ensure_ascii=False),
                    request_id=wan_result.get("request_id"),
                    cost_usd=wan_result.get("cost_estimate_usd"),
                    scene_number=scene_number,
                    provider=wan_result.get("provider_name"),
                    output_file=wan_result.get("file_path"),
                    safety_blocked=False,
                )
                if not wan_result["success"]:
                    raise _ProviderRenderError(
                        wan_result.get("error_message") or "Provider render failed"
                    )
        except _ProviderRenderError:
            pass
        if wan_result["success"]:
            return RenderResult(
                success=True,
                scene_number=scene_number,
                file_path=output_path.name,
                prompt_json=wan_result.get("prompt_text", ""),
                provider_name=wan_result.get("provider_name"),
                model_name=wan_result.get("model_name"),
                request_id=wan_result.get("request_id"),
                cost_estimate_usd=wan_result.get("cost_estimate_usd"),
                response_body=wan_result.get("response_body"),
            )
        # Wan failed — typographic fallback (terminal; no cascade to Gemini).
        logger.warning(
            "Scene %d: Wan render failed (%s), using typographic fallback",
            scene_number, wan_result.get("error_message", "unknown"),
        )
        fallback_bytes = _generate_fallback_image(word, palette or [], output_path)
        if fallback_bytes is not None:
            output_path.write_bytes(fallback_bytes)
            return RenderResult(
                success=True,
                scene_number=scene_number,
                file_path=output_path.name,
                prompt_json=wan_result.get("prompt_text", ""),
                safety_blocked=True,
                model_name=model_id,
            )
        return RenderResult(
            success=False,
            scene_number=scene_number,
            error_message=(
                f"Wan render failed and typographic fallback failed: "
                f"{wan_result.get('error_message', 'unknown')}"
            ),
            prompt_json=wan_result.get("prompt_text", ""),
            model_name=model_id,
        )

    # Gemini path — retained but not reachable from current enum. Do not remove.
    # Stringify the image_prompt to JSON (sent verbatim per spec)
    prompt_dict = image_prompt.model_dump(exclude_none=True)
    prompt_json = json.dumps(prompt_dict, ensure_ascii=False)

    # Prepend art-style rendering preamble if applicable
    preamble = _get_style_preamble(prompt_dict.get("style", ""))
    if preamble:
        prompt_text = preamble + "\n\n" + prompt_json
    else:
        prompt_text = prompt_json

    api_key = config.GOOGLE_AI_API_KEY
    if not api_key:
        return RenderResult(
            success=False,
            scene_number=scene_number,
            error_message="Google AI API key is required. Set GOOGLE_AI_API_KEY.",
            prompt_json=prompt_json,
            model_name=model_id,
        )

    # Build parts list — optionally prepend reference image
    parts: list[types.Part] = []
    if reference_image_path and reference_image_path.exists():
        try:
            ref_bytes = reference_image_path.read_bytes()
            parts.append(
                types.Part(
                    inline_data=types.Blob(
                        data=ref_bytes, mime_type="image/png"
                    )
                )
            )
            instruction = chain_instruction or _FALLBACK_CHAIN_INSTRUCTION
            parts.append(types.Part(text=instruction))
            logger.info(
                "Scene %d: reference image from %s (%d bytes)",
                scene_number, reference_image_path.name, len(ref_bytes),
            )
        except OSError as e:
            logger.warning(
                "Scene %d: could not read reference image %s: %s",
                scene_number, reference_image_path.name, e,
            )
    else:
        if reference_image_path:
            logger.warning(
                "Scene %d: reference image %s not found, rendering without",
                scene_number, reference_image_path,
            )

    parts.append(types.Part(text=prompt_text))

    client = genai.Client(api_key=api_key)

    # Try to generate with retry logic
    response = _call_gemini_with_retries(client, model_id, parts, scene_number, aspect_ratio)
    if response is None:
        return RenderResult(
            success=False,
            scene_number=scene_number,
            error_message="All retry attempts exhausted",
            prompt_json=prompt_json,
            model_name=model_id,
        )

    # Extract image data from response
    image_data = _extract_image_data(response)

    # Safety retry: if blocked, try with softened prompt
    if image_data is None:
        logger.warning("Scene %d: Content blocked, retrying with softened prompt", scene_number)
        softened_parts = _soften_prompt(parts)
        response2 = _call_gemini_with_retries(client, model_id, softened_parts, scene_number, aspect_ratio)
        if response2 is not None:
            image_data = _extract_image_data(response2)

    # Fallback: generate typographic word image
    if image_data is None and word:
        logger.warning("Scene %d: Softened prompt also blocked, generating fallback image", scene_number)
        image_data = _generate_fallback_image(word, palette or [], output_path)

    if image_data is None:
        return RenderResult(
            success=False,
            scene_number=scene_number,
            error_message="Content blocked by safety filter — all recovery attempts failed",
            prompt_json=prompt_json,
            model_name=model_id,
        )

    # Save PNG
    output_path.write_bytes(image_data)
    logger.info("Rendered scene %d → %s", scene_number, output_path.name)

    # Check for likely refusal placeholder (near-black image)
    is_refusal = _is_likely_refusal(image_data, aspect_ratio)
    if is_refusal:
        logger.warning(
            "Scene %d: likely refusal placeholder (%d bytes). Flagging safety_blocked.",
            scene_number, len(image_data),
        )

    return RenderResult(
        success=True,
        scene_number=scene_number,
        file_path=output_path.name,
        prompt_json=prompt_json,
        safety_blocked=is_refusal,
        model_name=model_id,
    )


def render_all_scenes(
    storyboard: Storyboard,
    image_model: str,
    output_dir: Path,
    aspect_ratio: str = "16:9",
    use_color_palette: bool = False,
    *,
    word_id: str | None = None,
    deck_id: str | None = None,
    user_id: str | None = None,
    job_id: str | None = None,
    attempt: int | None = None,
) -> tuple[list[RenderResult], RenderingStepMeta]:
    """Render all scenes from a storyboard.

    Args:
        storyboard: The complete storyboard with scenes.
        image_model: 'fast' or 'quality'.
        output_dir: Directory to write PNG files.

    Returns:
        Tuple of (list of RenderResults, rendering step metadata).
    """
    start = time.monotonic()
    model_id = resolve_model_id(image_model)
    results: list[RenderResult] = []
    per_scene_seconds: list[float] = []
    previous_image_path: Optional[Path] = None

    # Resolve mode-specific chain instruction by provider family
    resolved_mode = resolve_frame_narrative(storyboard.frame_narrative)
    if model_id.startswith("wan/"):
        chain_instruction = CHAIN_INSTRUCTIONS_WAN.get(
            resolved_mode, _FALLBACK_CHAIN_INSTRUCTION_WAN
        )
    elif model_id.startswith("flux-2/"):
        chain_instruction = CHAIN_INSTRUCTIONS_FLUX.get(
            resolved_mode, _FALLBACK_CHAIN_INSTRUCTION_FLUX
        )
    elif model_id.startswith("fal-ai/"):
        chain_instruction = CHAIN_INSTRUCTIONS_ZTURBO.get(
            resolved_mode, _FALLBACK_CHAIN_INSTRUCTION_ZTURBO
        )
    else:
        chain_instruction = CHAIN_INSTRUCTIONS.get(
            resolved_mode, _FALLBACK_CHAIN_INSTRUCTION
        )
    use_chaining = chain_instruction is not None  # collection mode skips chaining

    for scene in storyboard.scenes:
        scene_start = time.monotonic()
        output_path = output_dir / f"{scene.scene_number:03d}.png"

        # Disable text_element if word_render is disabled
        image_prompt = scene.image_prompt
        if not scene.word_render.enabled:
            image_prompt = image_prompt.model_copy(update={"text_element": None})

        effective_reference = previous_image_path if use_chaining else None
        if use_chaining and effective_reference is not None:
            logger.info(
                "Scene %d referencing: %s",
                scene.scene_number, effective_reference,
            )

        result = render_scene(
            image_prompt, model_id, output_path, aspect_ratio,
            reference_image_path=effective_reference,
            chain_instruction=chain_instruction,
            word=storyboard.word,
            palette=storyboard.shared_palette,
            use_color_palette=use_color_palette,
            word_id=word_id,
            deck_id=deck_id,
            user_id=user_id,
            job_id=job_id,
            attempt=attempt,
        )
        results.append(result)

        # Chain: for Wan, anchor all scenes to scene 1 (avoids compounding
        # img2img drift). For Gemini, chain sequentially.
        if model_id.startswith("wan/"):
            if result.success and scene.scene_number == 1:
                previous_image_path = output_path
            # scenes 2+: previous_image_path stays pinned to scene 1
        else:
            if result.success:
                previous_image_path = output_path

        scene_elapsed = time.monotonic() - scene_start
        per_scene_seconds.append(round(scene_elapsed, 2))

        # ── Cost tracking ────────────────────────────────────────
        if model_id.startswith("wan/"):
            provider_label = "kie_ai"
            cost_usd = KIE_WAN_COST_PER_IMAGE
        elif model_id.startswith("flux-2/"):
            provider_label = "kie_ai"
            cost_usd = KIE_FLUX_PRO_COST_PER_IMAGE
        elif model_id.startswith("fal-ai/"):
            provider_label = "fal_ai"
            cost_usd = FAL_ZTURBO_COST_PER_IMAGE
        else:
            provider_label = "gemini"
            cost_usd = estimate_gemini_image_cost(model_id)

        log_cost(
            stage="images_rendering",
            provider=provider_label,
            model=model_id,
            status="success" if result.success else "failed",
            usage_metrics={
                "scene_number": scene.scene_number,
                "aspect_ratio": aspect_ratio,
                "safety_blocked": result.safety_blocked,
                "chained": effective_reference is not None,
            },
            estimated_cost_usd=cost_usd,
            duration_ms=int(scene_elapsed * 1000),
            error_message=result.error_message if not result.success else None,
        )

        if result.success:
            logger.info("Scene %d rendered in %.1fs", scene.scene_number, scene_elapsed)
        else:
            logger.warning(
                "Scene %d failed: %s", scene.scene_number, result.error_message
            )

    total_elapsed = time.monotonic() - start
    succeeded = sum(1 for r in results if r.success)
    failed = sum(1 for r in results if not r.success)

    meta = RenderingStepMeta(
        model=model_id,
        scenes_attempted=len(results),
        scenes_succeeded=succeeded,
        scenes_failed=failed,
        scenes_safety_blocked=sum(1 for r in results if r.safety_blocked),
        per_scene_seconds=per_scene_seconds,
        total_duration_seconds=round(total_elapsed, 2),
    )

    return results, meta


def _call_gemini_with_retries(
    client: genai.Client,
    model_id: str,
    parts: list[types.Part],
    scene_number: int,
    aspect_ratio: str = "16:9",
) -> Optional[types.GenerateContentResponse]:
    """Call Gemini with retry logic per Section 11.3.

    - Timeout: retry once after 5 seconds
    - Rate limit (429): exponential backoff, max 3 retries
    - Invalid API key: fail immediately

    Args:
        parts: Pre-built list of Part objects (text prompt, optionally
               preceded by a reference image and chaining instruction).
    """
    last_error = None

    for attempt in range(1 + RATE_LIMIT_MAX_RETRIES):
        try:
            response = client.models.generate_content(
                model=model_id,
                contents=[
                    types.Content(
                        role="user",
                        parts=parts,
                    )
                ],
                config=types.GenerateContentConfig(
                    response_modalities=["IMAGE"],
                    image_config=types.ImageConfig(
                        aspect_ratio=aspect_ratio,
                    ),
                ),
            )
            return response

        except Exception as e:
            error_str = str(e).lower()
            last_error = e

            # Invalid API key — fail immediately
            if "api key" in error_str or "401" in error_str or "403" in error_str:
                logger.error("Scene %d: Invalid API key — failing immediately", scene_number)
                raise

            # Rate limit — exponential backoff
            if "429" in error_str or "rate" in error_str:
                if attempt < RATE_LIMIT_MAX_RETRIES:
                    delay = RATE_LIMIT_BASE_DELAY * (2 ** attempt)
                    logger.warning(
                        "Scene %d: Rate limited (attempt %d/%d), retrying in %.1fs",
                        scene_number, attempt + 1, RATE_LIMIT_MAX_RETRIES, delay,
                    )
                    time.sleep(delay)
                    continue
                logger.error("Scene %d: Rate limit retries exhausted", scene_number)
                return None

            # Timeout — retry once after 5 seconds
            if "timeout" in error_str or "timed out" in error_str:
                if attempt == 0:
                    logger.warning(
                        "Scene %d: Timeout, retrying after %.1fs",
                        scene_number, TIMEOUT_RETRY_DELAY,
                    )
                    time.sleep(TIMEOUT_RETRY_DELAY)
                    continue
                logger.error("Scene %d: Timeout retry failed", scene_number)
                return None

            # Other errors — log and return None
            logger.error("Scene %d: Unexpected error: %s", scene_number, e)
            return None

    return None


def _extract_image_data(response: types.GenerateContentResponse) -> Optional[bytes]:
    """Extract image bytes from a Gemini response.

    Returns None if no image was generated (content policy block).
    """
    if not response.candidates:
        return None

    for candidate in response.candidates:
        if not candidate.content or not candidate.content.parts:
            continue
        for part in candidate.content.parts:
            if part.inline_data and part.inline_data.data:
                return part.inline_data.data

    return None
