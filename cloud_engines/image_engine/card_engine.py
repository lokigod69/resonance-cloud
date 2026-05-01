"""Card image generation entry point.

Bypasses the multi-scene storyboard pipeline. One LLM call -> one provider call ->
one image file. Caller (CardWorker) handles upload and DB writeback.

Key decisions:
- DeepSeek V4 Flash, temp 0.4 (settled in pre-investigation)
- Reuse the existing OpenRouter call pattern from storyboard.py
- Reuse existing per-provider renderer modules
- Default provider: zturbo (Z-Image-Turbo via Kie.ai)
- Default aspect ratio: 1:1
"""

from __future__ import annotations

import json
import logging
from pathlib import Path

import httpx
from pydantic import ValidationError

from src.cost_logger import estimate_openrouter_cost, log_cost
from src.services.events import logged_api_call, logged_llm_call

from . import config
from .card_models import CardImagePayload, CardImagePromptData, CardImageResult
from .card_prompts import SYSTEM_PROMPT, build_user_prompt
from .models import ImageError
from .storyboard import _repair_json


logger = logging.getLogger(__name__)

CARD_IMAGE_LLM_MODEL = "deepseek/deepseek-v4-flash"
CARD_IMAGE_LLM_TEMPERATURE = 0.4
CARD_IMAGE_LLM_MAX_TOKENS = 900


def _call_openrouter_card(
    system_prompt: str,
    user_prompt: str,
    model: str,
    api_key: str,
) -> tuple[str, dict, str | None]:
    """Call OpenRouter using the same transport pattern as storyboard.py."""
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt},
        ],
        "max_tokens": CARD_IMAGE_LLM_MAX_TOKENS,
        "temperature": CARD_IMAGE_LLM_TEMPERATURE,
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
        raise RuntimeError(
            f"OpenRouter API error (HTTP {resp.status_code}): {resp.text}"
        )

    data = resp.json()
    usage = data.get("usage", {})
    choices = data.get("choices", [])
    if not choices:
        raise RuntimeError(f"OpenRouter returned no choices: {data}")

    content = choices[0].get("message", {}).get("content", "")
    if not content or not content.strip():
        raise RuntimeError("OpenRouter returned empty content")

    log_cost(
        stage="images_card_prompt",
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

    logger.info("Card image LLM call completed (model=%s, tokens=%s)", model, usage)
    return content.strip(), usage, data.get("id")


def _parse_card_prompt(raw_response: str) -> CardImagePromptData:
    data = json.loads(_repair_json(raw_response))
    return CardImagePromptData.model_validate(data)


def _resolve_card_model_id(image_model: str) -> str:
    if image_model == "flux_pro":
        return "flux-2/pro-text-to-image"
    if image_model in {"zturbo", "z-image-turbo"}:
        return "z-image-turbo"
    if image_model == "wan_fast":
        return "wan/2-7-image"
    if image_model == "wan_pro":
        return "wan/2-7-image-pro"
    if image_model == "seedream_lite":
        return "seedream/5-lite-text-to-image"
    logger.warning("Unknown card image_model=%r; defaulting to zturbo", image_model)
    return "z-image-turbo"


def _provider_art_style(card_image_style: str, image_prompt: CardImagePromptData) -> str:
    normalized = (card_image_style or "").strip().lower()
    if normalized == "photorealistic":
        return "photorealistic"
    if normalized == "editorial":
        return (
            "magazine-style editorial illustration, clean intentional composition, "
            "selective color palette, printed-page aesthetic"
        )
    return image_prompt.style_medium_override or card_image_style or "photorealistic"


def _render_card_image(
    payload: CardImagePayload,
    image_prompt: CardImagePromptData,
    output_path: Path,
) -> dict:
    model_id = _resolve_card_model_id(payload.image_model)
    prompt_payload = image_prompt.model_dump(exclude_none=True)
    art_style = _provider_art_style(payload.card_image_style, image_prompt)

    if model_id == "z-image-turbo":
        from .z_image_turbo_provider import render_scene_z_image_turbo

        with logged_api_call(
            stage="pending_image",
            sub_step="render_card_image",
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            model_provider="z_image_turbo",
            model_name=model_id,
            metadata={"card_image_style": payload.card_image_style},
        ):
            return render_scene_z_image_turbo(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                input_urls=None,
                use_color_palette=False,
                art_style=art_style,
            )

    if model_id.startswith("flux-2/"):
        from .kie_provider import render_scene_kie_flux

        with logged_api_call(
            stage="pending_image",
            sub_step="render_card_image",
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            model_provider="kie_ai",
            model_name=model_id,
            metadata={"card_image_style": payload.card_image_style},
        ):
            return render_scene_kie_flux(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                chain_instruction=None,
                input_urls=None,
                use_color_palette=False,
            )

    if model_id.startswith("wan/"):
        from .wan_provider import render_scene_wan

        with logged_api_call(
            stage="pending_image",
            sub_step="render_card_image",
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            model_provider="wan",
            model_name=model_id,
            metadata={"card_image_style": payload.card_image_style},
        ):
            return render_scene_wan(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                input_urls=None,
                use_color_palette=False,
                art_style=art_style,
            )

    if model_id.startswith("seedream/"):
        from .seedream_provider import render_scene_seedream

        with logged_api_call(
            stage="pending_image",
            sub_step="render_card_image",
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            model_provider="seedream",
            model_name=model_id,
            metadata={"card_image_style": payload.card_image_style},
        ):
            return render_scene_seedream(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                input_urls=None,
                use_color_palette=False,
                art_style=art_style,
            )

    raise RuntimeError(f"Unsupported card image model_id: {model_id}")


def generate_card_image(payload: CardImagePayload) -> CardImageResult:
    """Generate one card image: LLM call -> provider call -> file on disk.

    Does NOT upload to Supabase Storage (CardWorker handles that).
    Does NOT write to DB (CardWorker handles that).
    Does NOT transition stage (CardWorker handles that).

    Returns CardImageResult with status, image_path, image_prompt for logging.
    """
    system_prompt = SYSTEM_PROMPT
    user_prompt = build_user_prompt(payload.content, payload.card_image_style)
    api_key = config.OPENROUTER_API_KEY
    if not api_key:
        return CardImageResult(
            status="failed",
            error=ImageError(
                message=(
                    "OpenRouter API key is required. Set OPENROUTER_API_KEY "
                    "environment variable."
                ),
                retryable=True,
            ),
        )

    try:
        with logged_llm_call(
            stage="pending_image",
            sub_step="card_image_prompt_llm",
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            model_provider="openrouter",
            model_name=CARD_IMAGE_LLM_MODEL,
            system_prompt=system_prompt,
            user_prompt=user_prompt,
            metadata={
                "card_image_style": payload.card_image_style,
                "image_model": payload.image_model,
            },
        ) as ev:
            raw_response, usage, request_id = _call_openrouter_card(
                system_prompt=system_prompt,
                user_prompt=user_prompt,
                model=CARD_IMAGE_LLM_MODEL,
                api_key=api_key,
            )
            ev.record_response(
                response_body=raw_response,
                tokens_in=usage.get("prompt_tokens"),
                tokens_out=usage.get("completion_tokens"),
                cost_usd=estimate_openrouter_cost(CARD_IMAGE_LLM_MODEL, usage),
                request_id=request_id,
            )
        card_prompt_data = _parse_card_prompt(raw_response)
    except (json.JSONDecodeError, ValidationError, ValueError, RuntimeError, ConnectionError) as e:
        logger.error("Card image prompt generation failed: %s", e, exc_info=True)
        return CardImageResult(
            status="failed",
            error=ImageError(message=f"Card image LLM failed: {e}", retryable=True),
        )

    output_dir = Path(payload.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "card.png"

    try:
        render_result = _render_card_image(payload, card_prompt_data, output_path)
    except Exception as e:
        logger.error("Card image provider call failed: %s", e, exc_info=True)
        return CardImageResult(
            status="failed",
            image_prompt=card_prompt_data,
            error=ImageError(message=f"Card image provider failed: {e}", retryable=True),
        )

    if not render_result.get("success") or not output_path.exists():
        message = render_result.get("error_message") or "provider did not produce card.png"
        return CardImageResult(
            status="failed",
            image_prompt=card_prompt_data,
            error=ImageError(message=f"Card image render failed: {message}", retryable=True),
        )

    return CardImageResult(
        status="success",
        image_path=str(output_path.resolve()),
        image_prompt=card_prompt_data,
    )
