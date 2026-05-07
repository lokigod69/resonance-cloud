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
from .layer2_direct_prompt import (
    DIRECT_PROMPT_WRITER_MODEL,
    DIRECT_PROMPT_TEMPLATES,
    DIRECT_PROMPT_V2_TEMPLATE,
    DIRECT_PROMPT_V3_TEMPLATE,
    backend_template,
    direct_prompt_metadata,
    sanitize_direct_prompt,
    write_layer2_direct_prompt,
)
from .infographic_prompt import (
    INFOGRAPHIC_BACKEND_TEMPLATE,
    INFOGRAPHIC_PLANNER_MODEL,
    infographic_prompt_metadata,
    infographic_template_requires_reference,
    infographic_template_reference_for_render,
    write_infographic_prompt,
)
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
    if image_model == "gpt_image_2":
        return "gpt-image-2"
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
    raise ValueError(f"unknown card image_model: {image_model}")


def _render_gpt_card_image(payload: CardImagePayload, output_path: Path) -> dict:
    from .card_layer2 import resolve_layer2
    from .gpt_card_prompts import (
        build_gpt_image_2_card_metadata,
        build_gpt_image_2_prompt,
    )
    from .gpt_image_2_provider import render_scene_gpt_image_2

    image_scene = payload.content.image_scene or payload.content.mnemonic
    layer2 = resolve_layer2(
        payload.content.layer2_customization,
        word_facts={
            "word": payload.content.word,
            "translation": payload.content.translation,
            "image_scene": image_scene,
            "mnemonic": payload.content.mnemonic,
            "bridge_mnemonic": payload.content.bridge_mnemonic,
            "etymology": payload.content.etymology,
            "dominant_emotional_reading": payload.content.dominant_emotional_reading,
        },
        art_style=payload.card_image_style,
    )
    renderer_profile = (
        layer2.resolved["renderer_profile"] if layer2 else payload.content.renderer_profile
    )
    renderer_profile_source = (
        layer2.resolved["renderer_profile_source"]
        if layer2
        else payload.content.renderer_profile_source
    )
    composition = (
        layer2.resolved["composition"]
        if layer2
        else payload.content.composition or payload.content.composition_hint
    )
    treatment = (
        layer2.resolved["treatment"]
        if layer2
        else payload.content.treatment or payload.content.treatment_hint
    )
    creative_mode = layer2.resolved["creative_mode"] if layer2 else payload.content.creative_mode
    text_embedding_mode = (
        layer2.resolved["text_embedding_mode"] if layer2 else payload.content.text_embedding_mode
    )
    requested_backend_template = backend_template(payload.content.layer2_customization)
    selected_backend_template = requested_backend_template
    if (
        layer2
        and layer2.resolved.get("presentation_form") == "infographic_card"
        and selected_backend_template != INFOGRAPHIC_BACKEND_TEMPLATE
    ):
        if selected_backend_template not in {DIRECT_PROMPT_V2_TEMPLATE, DIRECT_PROMPT_V3_TEMPLATE}:
            layer2.snap_notes.append(
                "infographic_card uses direct_prompt_v2 instead of structured_plan_v1"
            )
            selected_backend_template = DIRECT_PROMPT_V2_TEMPLATE
    direct_prompt_meta: dict | None = None
    infographic_prompt_meta: dict | None = None
    infographic_reference_input_urls: list[str] | None = None
    infographic_reference_required = False
    infographic_reference_error: str | None = None
    provider_model = "gpt-image-2-text-to-image"
    allow_translation = layer2.allow_translation_in_prompt if layer2 else False
    if layer2 and selected_backend_template == INFOGRAPHIC_BACKEND_TEMPLATE:
        layer2_customization = (
            payload.content.layer2_customization
            if isinstance(payload.content.layer2_customization, dict)
            else {}
        )
        selected_infographic_template = layer2_customization.get("infographic_template")
        with logged_llm_call(
            stage="pending_image",
            sub_step="infographic_prompt_planner",
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            model_provider="openrouter",
            model_name=INFOGRAPHIC_PLANNER_MODEL,
            metadata={
                "backend_template": selected_backend_template,
                "infographic_template": selected_infographic_template,
            },
        ) as ev:
            try:
                infographic_result = write_infographic_prompt(
                    content=payload.content,
                    layer2=layer2_customization,
                    infographic_template=selected_infographic_template,
                )
            except Exception as exc:
                if selected_infographic_template == "infographic_dense_editorial_v4":
                    message = f"Infographic V4 prompt writer failed: {type(exc).__name__}: {exc}"
                    return {
                        "success": False,
                        "file_path": None,
                        "error_message": message,
                        "prompt_text": "",
                        "provider_name": "gpt_image_2",
                        "model_name": provider_model,
                        "gpt_image_2_card_metadata": {
                            "backend_template": selected_backend_template,
                            "infographic_template": selected_infographic_template,
                            "failure_origin": "prompt_writer",
                            "provider_reached": False,
                            "provider_model": provider_model,
                            "error_message": message,
                        },
                    }
                raise
            prompt_text = infographic_result.prompt
            reference_for_render = infographic_template_reference_for_render(
                infographic_result.infographic_template
            )
            infographic_reference_required = infographic_template_requires_reference(
                infographic_result.infographic_template
            )
            reference_asset_exists = (
                bool(reference_for_render.get("asset_exists"))
                if reference_for_render
                else None
            )
            reference_url = (
                str(reference_for_render.get("reference_url"))
                if reference_for_render and reference_for_render.get("reference_url")
                else None
            )
            if reference_for_render and reference_asset_exists and reference_url:
                infographic_reference_input_urls = [reference_url]
            if infographic_reference_required:
                provider_model = "gpt-image-2-image-to-image"
                if not reference_url:
                    infographic_reference_error = (
                        str(reference_for_render.get("reference_url_error"))
                        if reference_for_render and reference_for_render.get("reference_url_error")
                        else "reference URL unavailable"
                    )
            ev.record_response(
                response_body=infographic_result.raw_plan,
                tokens_in=(infographic_result.usage or {}).get("prompt_tokens"),
                tokens_out=(infographic_result.usage or {}).get("completion_tokens"),
                request_id=infographic_result.request_id,
                prompt_chars=len(prompt_text),
            )
            infographic_prompt_meta = infographic_prompt_metadata(
                final_prompt=prompt_text,
                planner_model=infographic_result.model,
                planner_plan=infographic_result.planner_plan,
                infographic_template=infographic_result.infographic_template,
                base_language_intended=payload.content.base_language,
                target_language=payload.content.language,
                reference_attached=bool(infographic_reference_input_urls),
                reference_fallback_used=(
                    reference_for_render is not None and not infographic_reference_input_urls
                ),
                reference_asset_exists=reference_asset_exists,
                template_reference_url=reference_url,
                reference_url_error=infographic_reference_error,
                provider_model=provider_model,
                validator_passed=infographic_result.validator_passed,
                validator_errors=infographic_result.validator_errors,
                validator_retry_count=infographic_result.validator_retry_count,
                prompt_rule_ratio_estimate=infographic_result.prompt_rule_ratio_estimate,
                dense_editorial_word_category=infographic_result.dense_editorial_word_category,
            )
    elif layer2 and selected_backend_template in DIRECT_PROMPT_TEMPLATES:
        with logged_llm_call(
            stage="pending_image",
            sub_step="layer2_direct_prompt_writer",
            event_source="engine",
            word_id=payload.metadata.word_id,
            deck_id=payload.metadata.deck_id,
            user_id=payload.metadata.user_id,
            job_id=payload.metadata.job_id,
            attempt=payload.metadata.attempt,
            model_provider="openrouter",
            model_name=DIRECT_PROMPT_WRITER_MODEL,
            metadata={
                "backend_template": selected_backend_template,
                "card_image_style": payload.card_image_style,
            },
        ) as ev:
            direct_result = write_layer2_direct_prompt(
                content=payload.content,
                layer2=payload.content.layer2_customization or {},
                art_style=payload.card_image_style,
                allow_target_word=layer2.allow_target_word_in_prompt,
                allow_translation=allow_translation,
                template=selected_backend_template,
            )
            prompt_text = sanitize_direct_prompt(
                direct_result.prompt,
                word=payload.content.word,
                translation=payload.content.translation,
                art_style=payload.card_image_style,
                allow_target_word=layer2.allow_target_word_in_prompt,
                allow_translation=allow_translation,
            )
            ev.record_response(
                response_body=direct_result.raw_prompt,
                tokens_in=(direct_result.usage or {}).get("prompt_tokens"),
                tokens_out=(direct_result.usage or {}).get("completion_tokens"),
                request_id=direct_result.request_id,
                prompt_chars=len(prompt_text),
            )
            direct_prompt_meta = direct_prompt_metadata(
                result=direct_result,
                prompt=prompt_text,
                allow_target_word=layer2.allow_target_word_in_prompt,
                allow_translation=allow_translation,
                template=selected_backend_template,
            )
    else:
        prompt_text = build_gpt_image_2_prompt(
            word=payload.content.word,
            translation=payload.content.translation,
            language=payload.content.language,
            pos=payload.content.pos,
            image_scene=image_scene,
            mnemonic=payload.content.mnemonic,
            mnemonic_confidence=payload.content.mnemonic_confidence,
            dominant_emotional_reading=payload.content.dominant_emotional_reading,
            composition_hint=composition,
            treatment_hint=treatment,
            card_image_style=payload.card_image_style,
            renderer_profile=renderer_profile,
            renderer_profile_source=renderer_profile_source,
            creative_mode=creative_mode,
            text_embedding_mode=text_embedding_mode,
            register_note=payload.content.register_note,
            image_bridge=layer2.image_bridge if layer2 else None,
            style_directive=layer2.style_directive if layer2 else None,
            text_directive=layer2.text_directive if layer2 else None,
            allow_target_word_in_prompt=layer2.allow_target_word_in_prompt if layer2 else False,
            layer2_planning_version=payload.content.layer2_planning_version,
            mini_story_beats=payload.content.mini_story_beats,
            split_panel_brief=payload.content.split_panel_brief,
            word_design_brief=payload.content.word_design_brief,
            word_design_mode=payload.content.word_design_mode,
            mnemonic_hook=payload.content.mnemonic_hook,
            hook_type=payload.content.hook_type,
            hook_quality=payload.content.hook_quality,
            fallback_reason=payload.content.fallback_reason,
        )
    card_metadata = build_gpt_image_2_card_metadata(
        final_provider_prompt=prompt_text,
        renderer_profile=renderer_profile,
        renderer_profile_source=renderer_profile_source,
        image_scene=image_scene,
        mnemonic=payload.content.mnemonic,
        mnemonic_confidence=payload.content.mnemonic_confidence,
        etymology=payload.content.etymology,
        usage_example=payload.content.usage_example,
        composition=composition,
        treatment=treatment,
        creative_mode=creative_mode,
        text_embedding_mode=text_embedding_mode,
        single_image_teachable=payload.content.single_image_teachable,
        dominant_emotional_reading=payload.content.dominant_emotional_reading,
        register_note=payload.content.register_note,
        rationale_summary=payload.content.rationale_summary,
        layer2_user_choices=layer2.user_choices if layer2 else None,
        layer2_resolved=layer2.resolved if layer2 else None,
        layer2_snap_notes=layer2.snap_notes if layer2 else None,
        image_bridge=layer2.image_bridge if layer2 else None,
        layer2_planning_version=payload.content.layer2_planning_version,
        mini_story_beats=payload.content.mini_story_beats,
        split_panel_brief=payload.content.split_panel_brief,
        word_design_brief=payload.content.word_design_brief,
        word_design_mode=payload.content.word_design_mode,
        mnemonic_hook=payload.content.mnemonic_hook,
        hook_type=payload.content.hook_type,
        hook_quality=payload.content.hook_quality,
        fallback_reason=payload.content.fallback_reason,
    )
    if layer2:
        card_metadata["backend_template"] = selected_backend_template
        if requested_backend_template != selected_backend_template:
            card_metadata["requested_backend_template"] = requested_backend_template
        layer2_customization = (
            payload.content.layer2_customization
            if isinstance(payload.content.layer2_customization, dict)
            else {}
        )
        premium_quick_mode = layer2_customization.get("premium_quick_mode")
        if premium_quick_mode:
            card_metadata["premium_quick_mode"] = str(premium_quick_mode)
        premium_generation_mode = layer2_customization.get("premium_generation_mode")
        if isinstance(premium_generation_mode, dict):
            card_metadata["premium_generation_mode"] = premium_generation_mode
    if direct_prompt_meta:
        card_metadata.update(direct_prompt_meta)
    if infographic_prompt_meta:
        card_metadata.update(infographic_prompt_meta)
    card_metadata["provider_model"] = provider_model
    if (
        card_metadata.get("infographic_template") == "infographic_dense_editorial_v4"
        and card_metadata.get("validator_passed") is False
    ):
        card_metadata["provider_reached"] = False
        card_metadata["failure_origin"] = "validator"
        validator_errors = card_metadata.get("validator_errors") or []
        error_message = "Infographic V4 validator failed: " + "; ".join(
            str(item) for item in validator_errors
        )
        return {
            "success": False,
            "file_path": None,
            "error_message": error_message,
            "prompt_text": prompt_text,
            "provider_name": "gpt_image_2",
            "model_name": provider_model,
            "gpt_image_2_card_metadata": card_metadata,
        }
    if infographic_reference_required and not infographic_reference_input_urls:
        card_metadata["provider_reached"] = False
        card_metadata["failure_origin"] = "reference_url"
        error_message = (
            "Infographic V3 reference URL unavailable; refusing to submit a "
            f"text-to-image fallback as reference-guided output: {infographic_reference_error}"
        )
        return {
            "success": False,
            "file_path": None,
            "error_message": error_message,
            "prompt_text": prompt_text,
            "provider_name": "gpt_image_2",
            "model_name": provider_model,
            "gpt_image_2_card_metadata": card_metadata,
        }
    provider_aspect_ratio = "auto" if infographic_reference_input_urls else "16:9"
    request_input: dict[str, object] = {
        "prompt": prompt_text,
        "aspect_ratio": provider_aspect_ratio,
    }
    if infographic_reference_input_urls:
        request_input["input_urls"] = infographic_reference_input_urls
    else:
        request_input["resolution"] = "1K"
    request_payload = {
        "model": provider_model,
        "input": request_input,
    }
    card_metadata["provider_reached"] = True
    with logged_api_call(
        stage="pending_image",
        sub_step="render_card_image",
        event_source="engine",
        word_id=payload.metadata.word_id,
        deck_id=payload.metadata.deck_id,
        user_id=payload.metadata.user_id,
        job_id=payload.metadata.job_id,
        attempt=payload.metadata.attempt,
        model_provider="gpt_image_2",
        model_name="gpt-image-2",
        metadata={
            "card_image_style": payload.card_image_style,
            "backend_template": selected_backend_template if layer2 else None,
            "reference_attached": bool(infographic_reference_input_urls),
        },
    ) as ev:
        try:
            result = render_scene_gpt_image_2(
                prompt_text=prompt_text,
                output_path=output_path,
                aspect_ratio=provider_aspect_ratio,
                resolution="1K",
                input_urls=infographic_reference_input_urls,
            )
        except Exception as exc:
            card_metadata["provider_error_summary"] = f"{type(exc).__name__}: {exc}"
            return {
                "success": False,
                "file_path": None,
                "error_message": f"Card image provider failed: {type(exc).__name__}: {exc}",
                "prompt_text": prompt_text,
                "provider_name": "gpt_image_2",
                "model_name": provider_model,
                "gpt_image_2_card_metadata": card_metadata,
            }
        ev._model_provider = result.get("provider_name") or "gpt_image_2"
        ev._model_name = result.get("model_name") or "gpt-image-2"
        ev.record_response(
            response_body=result.get("response_body"),
            request_body=json.dumps(request_payload, ensure_ascii=False),
            request_id=result.get("request_id"),
            cost_usd=result.get("cost_estimate_usd"),
        )
        if result.get("request_id"):
            card_metadata["provider_task_id"] = result.get("request_id")
            card_metadata["kie_task_id"] = result.get("request_id")
        if not result.get("success"):
            card_metadata["provider_error_summary"] = result.get("error_message") or "provider returned unsuccessful result"
        result["gpt_image_2_card_metadata"] = card_metadata
        return result


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

        request_payload = {
            "model": model_id,
            "aspect_ratio": image_prompt.aspect_ratio,
            "input_urls": None,
            "use_color_palette": False,
            "art_style": art_style,
            "image_prompt": prompt_payload,
        }
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
        ) as ev:
            result = render_scene_z_image_turbo(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                input_urls=None,
                use_color_palette=False,
                art_style=art_style,
            )
            ev._model_provider = result.get("provider_name") or "z_image_turbo"
            ev._model_name = result.get("model_name") or model_id
            ev.record_response(
                response_body=result.get("response_body"),
                request_body=json.dumps(request_payload, ensure_ascii=False),
                request_id=result.get("request_id"),
                cost_usd=result.get("cost_estimate_usd"),
            )
            return result

    if model_id.startswith("flux-2/"):
        from .kie_provider import render_scene_kie_flux

        request_payload = {
            "model": model_id,
            "aspect_ratio": image_prompt.aspect_ratio,
            "chain_instruction": None,
            "input_urls": None,
            "use_color_palette": False,
            "image_prompt": prompt_payload,
        }
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
        ) as ev:
            result = render_scene_kie_flux(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                chain_instruction=None,
                input_urls=None,
                use_color_palette=False,
            )
            ev._model_provider = result.get("provider_name") or "kie_ai"
            ev._model_name = result.get("model_name") or model_id
            ev.record_response(
                response_body=result.get("response_body"),
                request_body=json.dumps(request_payload, ensure_ascii=False),
                request_id=result.get("request_id"),
                cost_usd=result.get("cost_estimate_usd"),
            )
            return result

    if model_id.startswith("wan/"):
        from .wan_provider import render_scene_wan

        request_payload = {
            "model": model_id,
            "aspect_ratio": image_prompt.aspect_ratio,
            "input_urls": None,
            "use_color_palette": False,
            "art_style": art_style,
            "image_prompt": prompt_payload,
        }
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
        ) as ev:
            result = render_scene_wan(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                input_urls=None,
                use_color_palette=False,
                art_style=art_style,
            )
            ev._model_provider = result.get("provider_name") or "wan"
            ev._model_name = result.get("model_name") or model_id
            ev.record_response(
                response_body=result.get("response_body"),
                request_body=json.dumps(request_payload, ensure_ascii=False),
                request_id=result.get("request_id"),
                cost_usd=result.get("cost_estimate_usd"),
            )
            return result

    if model_id.startswith("seedream/"):
        from .seedream_provider import render_scene_seedream

        request_payload = {
            "model": model_id,
            "aspect_ratio": image_prompt.aspect_ratio,
            "input_urls": None,
            "use_color_palette": False,
            "art_style": art_style,
            "image_prompt": prompt_payload,
        }
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
        ) as ev:
            result = render_scene_seedream(
                image_prompt=prompt_payload,
                model_id=model_id,
                output_path=output_path,
                aspect_ratio=image_prompt.aspect_ratio,
                input_urls=None,
                use_color_palette=False,
                art_style=art_style,
            )
            ev._model_provider = result.get("provider_name") or "seedream"
            ev._model_name = result.get("model_name") or model_id
            ev.record_response(
                response_body=result.get("response_body"),
                request_body=json.dumps(request_payload, ensure_ascii=False),
                request_id=result.get("request_id"),
                cost_usd=result.get("cost_estimate_usd"),
            )
            return result

    raise RuntimeError(f"Unsupported card image model_id: {model_id}")


def generate_card_image(payload: CardImagePayload) -> CardImageResult:
    """Generate one card image: LLM call -> provider call -> file on disk.

    Does NOT upload to Supabase Storage (CardWorker handles that).
    Does NOT write to DB (CardWorker handles that).
    Does NOT transition stage (CardWorker handles that).

    Returns CardImageResult with status, image_path, image_prompt for logging.
    """
    output_dir = Path(payload.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)
    output_path = output_dir / "card.png"

    if _resolve_card_model_id(payload.image_model) == "gpt-image-2":
        try:
            render_result = _render_gpt_card_image(payload, output_path)
        except Exception as e:
            logger.error("GPT Image-2 card provider call failed: %s", e, exc_info=True)
            return CardImageResult(
                status="failed",
                error=ImageError(
                    message=f"Card image provider failed: {type(e).__name__}: {e}",
                    retryable=True,
                ),
            )
        if not render_result.get("success") or not output_path.exists():
            message = render_result.get("error_message") or "provider did not produce card.png"
            return CardImageResult(
                status="failed",
                error=ImageError(message=f"Card image render failed: {message}", retryable=True),
                gpt_image_2_card_metadata=render_result.get("gpt_image_2_card_metadata"),
            )
        return CardImageResult(
            status="success",
            image_path=str(output_path.resolve()),
            gpt_image_2_card_metadata=render_result.get("gpt_image_2_card_metadata"),
            displayed_mnemonic=(
                (render_result.get("gpt_image_2_card_metadata") or {}).get("displayed_mnemonic")
            ),
        )

    system_prompt = SYSTEM_PROMPT
    user_prompt = build_user_prompt(payload.content, payload.card_image_style)
    api_key = config.OPENROUTER_API_KEY
    if not api_key:
        return CardImageResult(
            status="failed",
            error=ImageError(
                message=(
                    "Card image generation failed: NoApiKey: "
                    "OPENROUTER_API_KEY missing from environment."
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
            error=ImageError(
                message=f"Card image LLM failed: {type(e).__name__}: {e}",
                retryable=True,
            ),
        )

    try:
        render_result = _render_card_image(payload, card_prompt_data, output_path)
    except Exception as e:
        logger.error("Card image provider call failed: %s", e, exc_info=True)
        return CardImageResult(
            status="failed",
            image_prompt=card_prompt_data,
            error=ImageError(
                message=f"Card image provider failed: {type(e).__name__}: {e}",
                retryable=True,
            ),
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
