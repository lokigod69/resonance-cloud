from __future__ import annotations

import json
import asyncio
import sys
from pathlib import Path

import pytest
from pydantic import ValidationError

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.card_models import (  # noqa: E402
    CardImageContent,
    CardImagePayload,
)
from cloud_engines.image_engine.models import ImageMetadata, ImageSettings  # noqa: E402
from src.models import Manifest, Enrichment, Selected  # noqa: E402


def _run(coro):
    import asyncio

    return asyncio.new_event_loop().run_until_complete(coro)


def _card_payload(tmp_path: Path, image_model: str = "gpt_image_2") -> CardImagePayload:
    return CardImagePayload(
        content=CardImageContent(
            word="links abbiegen",
            translation="turn left",
            language="German",
            language_code="de",
            pos="phrase",
            mnemonic=(
                "Link a road turn to the left."
            ),
            image_scene=(
                "A driver grips the wheel at a city intersection while a bright "
                "green arrow bends left. The car noses into the left lane as the "
                "street sign points the same way."
            ),
            mnemonic_confidence="helpful",
            dominant_emotional_reading="decisive movement, NOT confusion",
            composition_hint="embodied",
            treatment_hint="literal",
            creative_mode="embodied",
            text_embedding_mode="none",
            renderer_profile="balanced_teaching",
            renderer_profile_source="auto",
        ),
        card_image_style="Photorealistic",
        image_model=image_model,
        output_dir=str(tmp_path),
        metadata=ImageMetadata(
            word="links abbiegen",
            language="German",
            translation="turn left",
            timestamp="2026-05-03T00:00:00Z",
            word_id="word-1",
            deck_id="deck-1",
            user_id="user-1",
            job_id="job-1",
            attempt=1,
        ),
    )


def test_gpt_card_prompt_handles_full_and_sparse_enrichment():
    from cloud_engines.image_engine.gpt_card_prompts import build_gpt_image_2_prompt

    full_prompt = build_gpt_image_2_prompt(
        word="links abbiegen",
        translation="turn left",
        language="German",
        pos="phrase",
        image_scene="A driver turns left at an intersection marked by a green arrow.",
        mnemonic="Link the turn to the left.",
        mnemonic_confidence="helpful",
        dominant_emotional_reading="decisive movement, NOT hesitation",
        composition_hint="multi_panel",
        treatment_hint="absurd",
        card_image_style="Editorial",
    )

    assert full_prompt.startswith("Photorealistic 16:9 image for a language-learning memory card.")
    assert "Visual meaning to depict: turn left." in full_prompt
    assert "Scene: A driver turns left" in full_prompt
    assert "links abbiegen" not in full_prompt
    assert "Composition:" not in full_prompt
    assert "Treatment:" not in full_prompt
    assert "No visible text, letters, captions" not in full_prompt

    sparse_prompt = build_gpt_image_2_prompt(
        word="agua",
        translation="water",
        language="Spanish",
        pos=None,
        image_scene=None,
        mnemonic=None,
        mnemonic_confidence=None,
        dominant_emotional_reading=None,
        composition_hint=None,
        treatment_hint=None,
        card_image_style="Photorealistic",
    )

    assert "None" not in sparse_prompt
    assert "Scene:" in sparse_prompt
    assert "Composition:" not in sparse_prompt
    assert "Visual meaning to depict: water." in sparse_prompt
    assert "agua" not in sparse_prompt
    assert "No visible text" not in sparse_prompt


def test_gpt_image_2_provider_sends_t2i_and_i2i_payloads(monkeypatch, tmp_path):
    from cloud_engines.image_engine import gpt_image_2_provider

    captured: list[dict[str, object]] = []

    def fake_submit(payload: dict, headers: dict) -> str:
        captured.append({"payload": payload, "headers": headers})
        return "task-gpt-123"

    monkeypatch.setenv("KIE_API_KEY", "test-key")
    monkeypatch.setattr(gpt_image_2_provider, "_submit_task", fake_submit)
    monkeypatch.setattr(
        gpt_image_2_provider,
        "_poll_task",
        lambda task_id, headers: {
            "code": 200,
            "data": {
                "state": "success",
                "resultJson": json.dumps({"resultUrls": ["https://example.invalid/gpt.png"]}),
            },
        },
    )
    monkeypatch.setattr(gpt_image_2_provider, "_download_and_save", lambda *_a, **_kw: None)

    result = gpt_image_2_provider.render_scene_gpt_image_2(
        prompt_text="Create a card.",
        output_path=tmp_path / "card.png",
        aspect_ratio="16:9",
    )

    assert captured[0]["payload"] == {
        "model": "gpt-image-2-text-to-image",
        "input": {
            "prompt": "Create a card.",
            "aspect_ratio": "16:9",
            "resolution": "1K",
        },
    }
    assert result["success"] is True
    assert result["provider_name"] == "gpt_image_2"

    gpt_image_2_provider.render_scene_gpt_image_2(
        prompt_text="Continue the card.",
        output_path=tmp_path / "card-i2i.png",
        input_urls=["https://example.invalid/ref.png"],
    )

    assert captured[1]["payload"]["model"] == "gpt-image-2-image-to-image"
    assert captured[1]["payload"]["input"]["input_urls"] == ["https://example.invalid/ref.png"]


def test_gpt_image_2_provider_uses_i2i_payload_shape_without_resolution(monkeypatch, tmp_path):
    from cloud_engines.image_engine import gpt_image_2_provider

    captured: list[dict[str, object]] = []

    def fake_submit(payload: dict, headers: dict) -> str:
        captured.append(payload)
        return "task-gpt-i2i"

    monkeypatch.setenv("KIE_API_KEY", "test-key")
    monkeypatch.setattr(gpt_image_2_provider, "_submit_task", fake_submit)
    monkeypatch.setattr(
        gpt_image_2_provider,
        "_poll_task",
        lambda task_id, headers: {
            "code": 200,
            "data": {
                "state": "success",
                "resultJson": json.dumps({"resultUrls": ["https://example.invalid/gpt.png"]}),
            },
        },
    )
    monkeypatch.setattr(gpt_image_2_provider, "_download_and_save", lambda *_a, **_kw: None)

    result = gpt_image_2_provider.render_scene_gpt_image_2(
        prompt_text="Create a reference-guided card.",
        output_path=tmp_path / "card-i2i.png",
        aspect_ratio="auto",
        input_urls=["https://example.invalid/reference.png"],
    )

    assert result["success"] is True
    assert captured[0] == {
        "model": "gpt-image-2-image-to-image",
        "input": {
            "prompt": "Create a reference-guided card.",
            "input_urls": ["https://example.invalid/reference.png"],
            "aspect_ratio": "auto",
        },
    }


def test_generate_card_image_gpt_path_skips_card_llm(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls["record_response"] = kwargs

    def fail_openrouter(*_args, **_kwargs):
        raise AssertionError("GPT Image-2 card path must not call the card prompt LLM")

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-gpt-456",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "_call_openrouter_card", fail_openrouter)
    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    result = card_engine.generate_card_image(_card_payload(tmp_path))

    assert result.status == "success"
    assert Path(result.image_path).exists()
    assert calls["provider_kwargs"]["aspect_ratio"] == "16:9"
    assert calls["provider_kwargs"]["resolution"] == "1K"
    assert "links abbiegen" not in calls["provider_kwargs"]["prompt_text"]
    assert "Visual meaning to depict: turn left." in calls["provider_kwargs"]["prompt_text"]
    assert "Scene:" in calls["provider_kwargs"]["prompt_text"]
    assert result.gpt_image_2_card_metadata is not None
    assert result.gpt_image_2_card_metadata["renderer_profile"] == "balanced_teaching"
    assert result.gpt_image_2_card_metadata["renderer_profile_source"] == "auto"
    assert result.gpt_image_2_card_metadata["image_scene"] == result.gpt_image_2_card_metadata["card_scene_displayed"]
    assert result.gpt_image_2_card_metadata["mnemonic"] == "Link a road turn to the left."
    request_body = json.loads(calls["record_response"]["request_body"])
    assert request_body == {
        "model": "gpt-image-2-text-to-image",
        "input": {
            "prompt": calls["provider_kwargs"]["prompt_text"],
            "aspect_ratio": "16:9",
            "resolution": "1K",
        },
    }


def test_generate_card_image_gpt_failure_does_not_fallback_to_zturbo(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine

    calls: list[str] = []

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_render_scene_gpt_image_2(**_kwargs):
        calls.append("gpt_image_2")
        return {
            "success": False,
            "file_path": None,
            "error_message": "generation failed: bad prompt",
            "prompt_text": _kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-gpt-failed",
            "cost_estimate_usd": 0.05,
        }

    def fail_fallback_provider(**_kwargs):
        raise AssertionError("GPT Image-2 failure must not fallback to Z-Turbo or any non-GPT provider")

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "_render_card_image", fail_fallback_provider)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    result = card_engine.generate_card_image(_card_payload(tmp_path))

    assert result.status == "failed"
    assert result.error is not None
    assert "bad prompt" in result.error.message
    assert calls == ["gpt_image_2"]


def test_direct_prompt_template_calls_writer_and_sends_returned_prompt(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.layer2_direct_prompt import DirectPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls["record_response"] = kwargs

    def fake_write_layer2_direct_prompt(**kwargs):
        calls["writer_kwargs"] = kwargs
        return DirectPromptResult(
            prompt=(
                "Surreal 16:9 image with three visible beats: first a phone post sprouts legs, "
                "second it races through a crowd, third everyone reacts in a wave. "
                "Do not write the target word or direct answer/translation inside the image."
            ),
            model="test-writer-model",
            raw_prompt="raw writer output",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-direct-1",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fake_write_layer2_direct_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "viral"
    payload.content.translation = "viral"
    payload.card_image_style = "surrealism"
    payload.content.layer2_customization = {
        "meaning_strategy": "absurd_hook",
        "presentation_form": "mini_story",
        "visual_intensity": "balanced",
        "backend_template": "direct_prompt_v1",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["writer_kwargs"]["content"].word == "viral"
    assert calls["writer_kwargs"]["layer2"]["presentation_form"] == "mini_story"
    assert "three visible beats" in calls["provider_kwargs"]["prompt_text"]
    assert calls["provider_kwargs"]["prompt_text"] == (
        "Surreal 16:9 image with three visible beats: first a phone post sprouts legs, "
        "second it races through a crowd, third everyone reacts in a wave. "
        "Do not write the target word or direct answer/translation inside the image."
    )
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["backend_template"] == "direct_prompt_v1"
    assert metadata["direct_prompt_writer_model"] == "test-writer-model"
    assert metadata["direct_prompt_chars"] == len(calls["provider_kwargs"]["prompt_text"])
    assert metadata["answer_visibility"] == "hidden"


def test_direct_prompt_v2_template_calls_writer_and_stores_v2_metadata(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.layer2_direct_prompt import DirectPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls.setdefault("record_responses", []).append(kwargs)

    def fake_write_layer2_direct_prompt(**kwargs):
        calls["writer_kwargs"] = kwargs
        return DirectPromptResult(
            prompt=(
                "Cinematic 16:9 image with one clean visual moment: a glass vial releases a visible "
                "trail through a cool blue room. Do not write the target word or direct answer/translation inside the image."
            ),
            model="test-writer-model",
            raw_prompt="raw writer output",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-direct-v2",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fake_write_layer2_direct_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "fragrance"
    payload.content.translation = "scent"
    payload.card_image_style = "cinematic"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "single_scene",
        "visual_intensity": "balanced",
        "backend_template": "direct_prompt_v2",
        "premium_quick_mode": "clear",
        "premium_generation_mode": {
            "premium_quick_mode": "clear",
            "backend_template": "direct_prompt_v2",
            "meaning_strategy": "clear_meaning",
            "presentation_form": "single_scene",
            "art_style": "cinematic",
            "prompt_version": "premium_quick_modes_v1",
        },
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["writer_kwargs"]["template"] == "direct_prompt_v2"
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["backend_template"] == "direct_prompt_v2"
    assert metadata["premium_quick_mode"] == "clear"
    assert metadata["premium_generation_mode"]["presentation_form"] == "single_scene"
    assert metadata["direct_prompt_writer_model"] == "test-writer-model"
    assert any(
        response.get("prompt_chars") == len(calls["provider_kwargs"]["prompt_text"])
        for response in calls["record_responses"]
    )


def test_direct_prompt_v3_template_calls_writer_and_stores_visual_craft_metadata(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.layer2_direct_prompt import DirectPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls.setdefault("record_responses", []).append(kwargs)

    def fake_write_layer2_direct_prompt(**kwargs):
        calls["writer_kwargs"] = kwargs
        return DirectPromptResult(
            prompt=(
                "Realistic 16:9 documentary close-up of fogged glass and a half-hidden note, "
                "low-key practical light, shallow depth of field, paper fibers sharp at the focal edge. "
                "Do not write the target word or direct answer/translation inside the image."
            ),
            model="test-writer-model",
            raw_prompt="raw writer output",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-direct-v3",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fake_write_layer2_direct_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "obfuscate"
    payload.content.translation = "make unclear"
    payload.card_image_style = "realistic"
    payload.content.layer2_customization = {
        "meaning_strategy": "absurd_hook",
        "presentation_form": "single_scene",
        "visual_intensity": "balanced",
        "backend_template": "direct_prompt_v3",
        "premium_quick_mode": "weird",
        "premium_generation_mode": {
            "premium_quick_mode": "weird",
            "backend_template": "direct_prompt_v3",
            "meaning_strategy": "absurd_hook",
            "presentation_form": "single_scene",
            "art_style": "realistic",
            "prompt_version": "premium_quick_modes_v1",
        },
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["writer_kwargs"]["template"] == "direct_prompt_v3"
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["backend_template"] == "direct_prompt_v3"
    assert metadata["premium_quick_mode"] == "weird"
    assert metadata["premium_generation_mode"]["backend_template"] == "direct_prompt_v3"
    assert metadata["direct_prompt_writer_model"] == "test-writer-model"
    assert any(
        response.get("prompt_chars") == len(calls["provider_kwargs"]["prompt_text"])
        for response in calls["record_responses"]
    )


def test_infographic_structured_template_falls_back_to_direct_prompt_v2(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.layer2_direct_prompt import DirectPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_layer2_direct_prompt(**kwargs):
        calls["writer_kwargs"] = kwargs
        return DirectPromptResult(
            prompt=(
                "Editorial infographic card for EPHEMERAL, translation short-lived, with a fading flower, "
                "a tiny timeline, and three compact callouts."
            ),
            model="test-writer-model",
            raw_prompt="raw writer output",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-infographic",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fake_write_layer2_direct_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "ephemeral"
    payload.content.translation = "short-lived"
    payload.card_image_style = "editorial"
    payload.content.layer2_customization = {
        "meaning_strategy": "absurd_hook",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "structured_plan_v1",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["writer_kwargs"]["template"] == "direct_prompt_v2"
    assert calls["writer_kwargs"]["allow_target_word"] is True
    assert calls["writer_kwargs"]["allow_translation"] is True
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["backend_template"] == "direct_prompt_v2"
    assert metadata["requested_backend_template"] == "structured_plan_v1"
    assert metadata["layer2_resolved"]["presentation_form"] == "infographic_card"
    assert metadata["layer2_resolved"]["answer_visibility"] == "teaching_text_allowed"
    assert metadata["translation_allowed"] is True
    assert any("infographic_card uses direct_prompt_v2" in note for note in metadata["layer2_snap_notes"])


def test_infographic_direct_prompt_v3_stays_on_v3(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.layer2_direct_prompt import DirectPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_layer2_direct_prompt(**kwargs):
        calls["writer_kwargs"] = kwargs
        return DirectPromptResult(
            prompt="Designed study poster for EPHEMERAL with a fading bubble, short-lived translation, and three readable callouts.",
            model="test-writer-model",
            raw_prompt="raw writer output",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-infographic-v3",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fake_write_layer2_direct_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "ephemeral"
    payload.content.translation = "short-lived"
    payload.card_image_style = "editorial"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "direct_prompt_v3",
        "premium_quick_mode": "infographic",
        "premium_generation_mode": {
            "premium_quick_mode": "infographic",
            "backend_template": "direct_prompt_v3",
            "meaning_strategy": "clear_meaning",
            "presentation_form": "infographic_card",
            "art_style": "editorial",
            "prompt_version": "premium_quick_modes_v1",
        },
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["writer_kwargs"]["template"] == "direct_prompt_v3"
    assert calls["writer_kwargs"]["allow_target_word"] is True
    assert calls["writer_kwargs"]["allow_translation"] is True
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["backend_template"] == "direct_prompt_v3"
    assert metadata["premium_quick_mode"] == "infographic"
    assert "requested_backend_template" not in metadata


def test_infographic_prompt_template_routes_through_dedicated_planner_and_stores_metadata(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.infographic_prompt import InfographicPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls.setdefault("record_responses", []).append(kwargs)

    def fail_direct_prompt(**_kwargs):
        raise AssertionError("infographic_prompt_v1 must not use direct_prompt_v1/v2/v3")

    def fake_write_infographic_prompt(**kwargs):
        calls["infographic_kwargs"] = kwargs
        return InfographicPromptResult(
            prompt=(
                "Create a horizontal 16:9 educational infographic poster for ephemeral. "
                "Use German explanatory text and only English for the target word/examples. "
                "Never invent mnemonics, quotes, etymologies, or fake facts."
            ),
            model="test-planner-model",
            raw_plan='{"panels":[]}',
            planner_plan={
                "title": "ephemeral",
                "translation": "kurzlebig",
                "base_language": "German",
                "target_language": "English",
                "infographic_template": "infographic_language_atlas_v2",
                "visual_anchor": "Eine verblassende Linie.",
                "hero_treatment": "network_node",
                "panels": [
                    {"header": "Kern", "type": "meaning", "text": ["Kurzlebig."], "visual_note": "Sanduhr."},
                ],
                "footer_line": "Schnell vorbei.",
                "avoid": [],
            },
            infographic_template="infographic_language_atlas_v2",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-infographic-v1",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fail_direct_prompt)
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "ephemeral"
    payload.content.translation = "kurzlebig"
    payload.content.base_language = "German"
    payload.content.language = "English"
    payload.card_image_style = "editorial"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "infographic_prompt_v1",
        "infographic_template": "infographic_language_atlas_v2",
        "premium_quick_mode": "infographic",
        "premium_generation_mode": {
            "premium_quick_mode": "infographic",
            "backend_template": "infographic_prompt_v1",
            "meaning_strategy": "clear_meaning",
            "presentation_form": "infographic_card",
            "art_style": "editorial",
            "prompt_version": "premium_quick_modes_v1",
        },
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["infographic_kwargs"]["infographic_template"] == "infographic_language_atlas_v2"
    assert calls["infographic_kwargs"]["content"].base_language == "German"
    assert "horizontal 16:9 educational infographic poster" in calls["provider_kwargs"]["prompt_text"]
    assert calls["provider_kwargs"]["aspect_ratio"] == "16:9"
    assert calls["provider_kwargs"]["input_urls"] is None
    request_body = json.loads(calls["record_responses"][-1]["request_body"])
    assert request_body["model"] == "gpt-image-2-text-to-image"
    assert request_body["input"]["aspect_ratio"] == "16:9"
    assert request_body["input"]["resolution"] == "1K"
    assert "input_urls" not in request_body["input"]
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["backend_template"] == "infographic_prompt_v1"
    assert metadata["provider_model"] == "gpt-image-2-text-to-image"
    assert metadata["premium_quick_mode"] == "infographic"
    assert metadata["infographic_template"] == "infographic_language_atlas_v2"
    assert metadata["infographic_template_label"] == "V2 · Language Atlas"
    assert metadata["planner_model"] == "test-planner-model"
    assert metadata["planner_pass_count"] == 2
    assert metadata["planner_hero_treatment"] == "network_node"
    assert metadata["planner_panel_count"] == 1
    learning = metadata["infographic_learning"]
    assert learning["template"] == "infographic_language_atlas_v2"
    assert learning["template_label"] == "Language Atlas"
    assert learning["headword"] == "ephemeral"
    assert learning["translation"] == "kurzlebig"
    assert learning["base_language"] == "German"
    assert learning["target_language"] == "English"
    assert learning["footer_takeaway"] == "Schnell vorbei."


def test_v3_infographic_reference_uses_i2i_payload_with_resolved_reference_url(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.infographic_prompt import InfographicPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls.setdefault("record_responses", []).append(kwargs)

    def fake_write_infographic_prompt(**kwargs):
        calls["infographic_kwargs"] = kwargs
        return InfographicPromptResult(
            prompt=(
                "Create a horizontal 16:9 educational infographic poster for threshold. "
                "Use the attached reference image only as visual scaffolding. "
                "If the reference contains any readable text, treat it as placeholder only and ignore it. "
                "All explanations, panel headers, captions, warnings, glosses, and footer text must be in German. "
                "Never invent fake facts. Never invent quotes. Never invent etymologies. Never invent mnemonics."
            ),
            model="test-planner-model",
            raw_plan='{"panels":[]}',
            planner_plan={
                "title": "threshold",
                "translation": "Schwelle",
                "base_language": "German",
                "target_language": "English",
                "infographic_template": "infographic_language_atlas_v3_reference",
                "visual_anchor": "semantic map",
                "hero_treatment": "network_node",
                "panels": [],
                "footer_line": "Schnell vorbei.",
                "avoid": [],
            },
            infographic_template="infographic_language_atlas_v3_reference",
        )

    def fake_reference_for_render(_value):
        return {
            "template_reference_id": "language_atlas_reference_v3a",
            "reference_mode": "skeleton",
            "reference_asset_path": "cloud_engines/image_engine/assets/infographic_references/language_atlas_reference_v3a.png",
            "reference_url": "https://example.invalid/language_atlas_reference_v3a.png",
            "fallback_style_description": "language atlas skeleton",
            "asset_exists": True,
        }

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-image-to-image",
            "request_id": "task-infographic-v3-reference",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)
    monkeypatch.setattr(card_engine, "infographic_template_reference_for_render", fake_reference_for_render)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "threshold"
    payload.content.translation = "Schwelle"
    payload.content.base_language = "German"
    payload.content.language = "English"
    payload.card_image_style = "editorial"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "infographic_prompt_v1",
        "infographic_template": "infographic_language_atlas_v3_reference",
        "premium_quick_mode": "infographic",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["provider_kwargs"]["aspect_ratio"] == "auto"
    assert calls["provider_kwargs"]["input_urls"] == ["https://example.invalid/language_atlas_reference_v3a.png"]
    request_body = json.loads(calls["record_responses"][-1]["request_body"])
    assert request_body["model"] == "gpt-image-2-image-to-image"
    assert request_body["input"] == {
        "prompt": calls["provider_kwargs"]["prompt_text"],
        "aspect_ratio": "auto",
        "input_urls": ["https://example.invalid/language_atlas_reference_v3a.png"],
    }
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["provider_model"] == "gpt-image-2-image-to-image"
    assert metadata["infographic_template"] == "infographic_language_atlas_v3_reference"
    assert metadata["reference_mode"] == "skeleton"
    assert metadata["template_reference_id"] == "language_atlas_reference_v3a"
    assert metadata["template_reference_asset_path"].endswith("language_atlas_reference_v3a.png")
    assert metadata["reference_attached"] is True
    assert metadata["reference_fallback_used"] is False


def test_v3_infographic_missing_reference_url_fails_before_provider(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.infographic_prompt import InfographicPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls.setdefault("record_responses", []).append(kwargs)

    def fake_write_infographic_prompt(**_kwargs):
        return InfographicPromptResult(
            prompt="Use the attached reference image only as visual scaffolding.",
            model="test-planner-model",
            raw_plan='{"panels":[]}',
            planner_plan={"panels": [], "base_language": "German", "target_language": "English"},
            infographic_template="infographic_museum_exhibit_v3_reference",
        )

    def fake_reference_for_render(_value):
        return {
            "template_reference_id": "museum_exhibit_reference_v3a",
            "reference_mode": "skeleton",
            "reference_asset_path": "cloud_engines/image_engine/assets/infographic_references/museum_exhibit_reference_v3a.png",
            "reference_url": None,
            "reference_url_error": "supabase credentials missing",
            "fallback_style_description": "museum skeleton",
            "asset_exists": True,
        }

    def fake_render_scene_gpt_image_2(**kwargs):
        raise AssertionError("missing V3 reference URL must fail before provider call")

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)
    monkeypatch.setattr(card_engine, "infographic_template_reference_for_render", fake_reference_for_render)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.base_language = "German"
    payload.content.language = "English"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "infographic_prompt_v1",
        "infographic_template": "infographic_museum_exhibit_v3_reference",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "failed"
    assert result.error is not None
    assert "reference URL" in result.error.message
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["provider_model"] == "gpt-image-2-image-to-image"
    assert metadata["reference_attached"] is False
    assert metadata["reference_fallback_used"] is True
    assert metadata["reference_fallback_reason"] == "reference_url_unavailable"


def test_v4_dense_editorial_infographic_uses_text_to_image_and_metadata(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.infographic_prompt import InfographicPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls.setdefault("record_responses", []).append(kwargs)

    def fake_write_infographic_prompt(**kwargs):
        calls["infographic_kwargs"] = kwargs
        return InfographicPromptResult(
            prompt=(
                "Dense Editorial V4 provider-ready prompt. TITLE / HEADWORD: chess. "
                "SUBTITLE / GLOSS: Schach. Use maximum editorial information density. "
                "At least 70% of the card content must teach the word as language."
            ),
            model="test-dense-writer-model",
            raw_plan='{"composition":{"info_panels":[{},{}],"detail_sections":[{}]}}',
            planner_plan={
                "composition": {
                    "info_panels": [{}, {}],
                    "detail_sections": [{}],
                    "summary_modules": [],
                }
            },
            infographic_template="infographic_dense_editorial_v4",
            validator_passed=True,
            validator_errors=[],
            validator_hard_errors=[],
            validator_warnings=["optional module count below ideal"],
            validator_retry_count=0,
            prompt_rule_ratio_estimate=0.22,
            dense_editorial_word_category="concrete",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-infographic-v4",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "chess"
    payload.content.translation = "Schach"
    payload.content.base_language = "German"
    payload.content.language = "English"
    payload.card_image_style = "editorial"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "infographic_prompt_v1",
        "infographic_template": "infographic_dense_editorial_v4",
        "premium_quick_mode": "infographic",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["infographic_kwargs"]["infographic_template"] == "infographic_dense_editorial_v4"
    assert calls["provider_kwargs"]["aspect_ratio"] == "16:9"
    assert calls["provider_kwargs"]["input_urls"] is None
    request_body = json.loads(calls["record_responses"][-1]["request_body"])
    assert request_body["model"] == "gpt-image-2-text-to-image"
    assert "input_urls" not in request_body["input"]
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["infographic_template"] == "infographic_dense_editorial_v4"
    assert metadata["provider_model"] == "gpt-image-2-text-to-image"
    assert metadata["prompt_writer_model"] == "test-dense-writer-model"
    assert metadata["dense_editorial"] is True
    assert metadata["vocabulary_first"] is True
    assert metadata["visible_module_count"] == 3
    assert metadata["validator_passed"] is True
    assert metadata["validator_retry_count"] == 0
    assert metadata["validator_errors"] == []
    assert metadata["validator_hard_errors"] == []
    assert metadata["validator_warnings"] == ["optional module count below ideal"]
    assert metadata["prompt_rule_ratio_estimate"] == 0.22
    assert metadata["dense_editorial_word_category"] == "concrete"
    assert metadata["provider_reached"] is True
    assert metadata["provider_task_id"] == "task-infographic-v4"


def test_v4_dense_editorial_validator_failure_stops_before_provider(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.infographic_prompt import InfographicPromptResult

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_infographic_prompt(**_kwargs):
        return InfographicPromptResult(
            prompt="Create a horizontal 16:9 card. Zielsprache: Englisch. backend template. chess Schach.",
            model="test-dense-writer-model",
            raw_plan="bad writer prompt",
            planner_plan={"prompt": "bad writer prompt"},
            infographic_template="infographic_dense_editorial_v4",
            validator_passed=False,
            validator_errors=["banned visible metadata: Zielsprache", "required learning modules missing"],
            validator_hard_errors=["banned visible metadata: Zielsprache"],
            validator_warnings=["required learning modules missing"],
            validator_retry_count=1,
            prompt_rule_ratio_estimate=0.75,
            dense_editorial_word_category="practical",
        )

    def fake_render_scene_gpt_image_2(**_kwargs):
        raise AssertionError("invalid V4 prompt must fail before provider call")

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "chess"
    payload.content.translation = "Schach"
    payload.content.base_language = "German"
    payload.content.language = "English"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "infographic_prompt_v1",
        "infographic_template": "infographic_dense_editorial_v4",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "failed"
    assert result.error is not None
    assert "V4 validator failed" in result.error.message
    assert result.error.retryable is False
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["validator_passed"] is False
    assert metadata["validator_retry_count"] == 1
    assert metadata["validator_errors"] == ["banned visible metadata: Zielsprache", "required learning modules missing"]
    assert metadata["validator_hard_errors"] == ["banned visible metadata: Zielsprache"]
    assert metadata["validator_warnings"] == ["required learning modules missing"]
    assert metadata["provider_reached"] is False
    assert metadata["failure_origin"] == "validator"


def test_v4_dense_editorial_warning_only_safe_words_reach_gpt_image_2(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.infographic_prompt import InfographicPromptResult

    calls: list[dict[str, object]] = []

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_infographic_prompt(**kwargs):
        content = kwargs["content"]
        return InfographicPromptResult(
            prompt=(
                f"Create a horizontal 16:9 vocabulary-learning infographic for the English word "
                f"'{content.word}', glossed in German as '{content.translation}'. Teach the word as language first."
            ),
            model="test-dense-writer-model",
            raw_plan="warning-only prompt",
            planner_plan={"prompt": "warning-only prompt"},
            infographic_template="infographic_dense_editorial_v4",
            validator_passed=True,
            validator_errors=[],
            validator_hard_errors=[],
            validator_warnings=["optional module count below ideal"],
            validator_retry_count=1,
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls.append(kwargs)
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": f"task-{len(calls)}",
            "cost_estimate_usd": 0.05,
        }

    def fail_z_image(**_kwargs):
        raise AssertionError("V4 Dense Editorial must not route to z-image")

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)
    monkeypatch.setattr(card_engine, "_render_card_image", fail_z_image)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    for word, translation in [("onomatopoeia", "Lautmalerei"), ("authority", "Autorität"), ("failure", "Scheitern")]:
        payload = _card_payload(tmp_path / word)
        payload.content.word = word
        payload.content.translation = translation
        payload.content.base_language = "German"
        payload.content.language = "English"
        payload.content.layer2_customization = {
            "meaning_strategy": "clear_meaning",
            "presentation_form": "infographic_card",
            "visual_intensity": "balanced",
            "backend_template": "infographic_prompt_v1",
            "infographic_template": "infographic_dense_editorial_v4",
        }

        result = card_engine.generate_card_image(payload)

        assert result.status == "success"
        assert result.gpt_image_2_card_metadata["provider_reached"] is True
        assert result.gpt_image_2_card_metadata["provider_model"] == "gpt-image-2-text-to-image"

    assert len(calls) == 3
    assert all(call["aspect_ratio"] == "16:9" for call in calls)
    assert all(call["resolution"] == "1K" for call in calls)
    assert all(call["input_urls"] is None for call in calls)


def test_v4_provider_retry_reuses_cached_final_prompt_without_writer_call(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.infographic_prompt import InfographicPromptResult

    writer_calls = 0
    provider_prompts: list[str] = []

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_infographic_prompt(**_kwargs):
        nonlocal writer_calls
        writer_calls += 1
        return InfographicPromptResult(
            prompt=(
                "Create a horizontal 16:9 dense educational vocabulary infographic for the English word "
                "'winner', glossed in German as 'Gewinner'. Use German explanations with English examples. "
                "Teach the word as language first with meaning, pronunciation, grammar/forms, example sentences, "
                "collocations, common mistakes, register, synonyms, word family, and practical usage notes. "
                "Keep all safety guidance internal and render only useful learning content."
            ),
            model="test-dense-writer-model",
            raw_plan="cached prompt",
            planner_plan={
                "prompt": "cached prompt",
                "composition": {
                    "info_panels": [{}, {}, {}],
                    "detail_sections": [{}],
                    "summary_modules": [{}],
                },
            },
            infographic_template="infographic_dense_editorial_v4",
            validator_passed=True,
            validator_errors=[],
            validator_hard_errors=[],
            validator_warnings=[],
            validator_retry_count=0,
            prompt_rule_ratio_estimate=0.12,
            dense_editorial_word_category="practical",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        provider_prompts.append(kwargs["prompt_text"])
        if len(provider_prompts) == 1:
            return {
                "success": False,
                "file_path": None,
                "error_message": "provider timeout",
                "prompt_text": kwargs["prompt_text"],
                "response_body": "{}",
                "provider_name": "gpt_image_2",
                "model_name": "gpt-image-2-text-to-image",
                "request_id": "task-provider-failed",
                "cost_estimate_usd": 0.05,
            }
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-provider-retry",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    def dense_payload(attempt: int) -> CardImagePayload:
        payload = _card_payload(tmp_path)
        payload.content.word = "winner"
        payload.content.translation = "Gewinner"
        payload.content.base_language = "German"
        payload.content.language = "English"
        payload.metadata.attempt = attempt
        payload.content.layer2_customization = {
            "meaning_strategy": "clear_meaning",
            "presentation_form": "infographic_card",
            "visual_intensity": "balanced",
            "backend_template": "infographic_prompt_v1",
            "infographic_template": "infographic_dense_editorial_v4",
        }
        return payload

    first = card_engine.generate_card_image(dense_payload(1))
    second = card_engine.generate_card_image(dense_payload(2))

    assert first.status == "failed"
    assert second.status == "success"
    assert writer_calls == 1
    assert provider_prompts[0] == provider_prompts[1]
    assert first.gpt_image_2_card_metadata["prompt_attempt_count"] == 1
    assert first.gpt_image_2_card_metadata["provider_attempt_count"] == 1
    assert first.gpt_image_2_card_metadata["reused_cached_prompt"] is False
    assert first.gpt_image_2_card_metadata["retry_used_cached_prompt"] is False
    assert second.gpt_image_2_card_metadata["prompt_attempt_count"] == 1
    assert second.gpt_image_2_card_metadata["provider_attempt_count"] == 2
    assert second.gpt_image_2_card_metadata["reused_cached_prompt"] is True
    assert second.gpt_image_2_card_metadata["retry_used_cached_prompt"] is True
    assert second.gpt_image_2_card_metadata["final_prompt"] == provider_prompts[1]
    assert second.gpt_image_2_card_metadata["final_prompt_hash"] == first.gpt_image_2_card_metadata["final_prompt_hash"]


def test_v4_dense_editorial_prompt_writer_failure_records_before_provider_metadata(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_infographic_prompt(**_kwargs):
        raise RuntimeError("dense editorial prompt writer returned empty output")

    def fake_render_scene_gpt_image_2(**_kwargs):
        raise AssertionError("prompt writer failure must fail before provider call")

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "logged_llm_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_infographic_prompt", fake_write_infographic_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "infographic_card",
        "visual_intensity": "balanced",
        "backend_template": "infographic_prompt_v1",
        "infographic_template": "infographic_dense_editorial_v4",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "failed"
    assert result.error is not None
    assert "prompt writer failed" in result.error.message
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["failure_origin"] == "prompt_writer"
    assert metadata["provider_reached"] is False


def test_direct_prompt_word_object_allows_target_word_and_bans_translation(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.layer2_direct_prompt import DirectPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_layer2_direct_prompt(**_kwargs):
        return DirectPromptResult(
            prompt=(
                "Pixar-like 16:9 image: make the word FLOWERS visibly readable as a huge central "
                "typographic object built from petals and stems. Never write the direct answer/translation."
            ),
            model="test-writer-model",
            raw_prompt="raw writer output",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["prompt"] = kwargs["prompt_text"]
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-direct-2",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fake_write_layer2_direct_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "flowers"
    payload.content.translation = "flowers"
    payload.card_image_style = "pixar_3d"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "word_object_design",
        "visual_intensity": "balanced",
        "backend_template": "direct_prompt_v1",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert "FLOWERS" in calls["prompt"]
    assert "direct answer/translation" in calls["prompt"]
    assert result.gpt_image_2_card_metadata["answer_visibility"] == "target_word_embedded"


def test_direct_prompt_non_word_object_safety_removes_target_word(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.layer2_direct_prompt import DirectPromptResult

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_write_layer2_direct_prompt(**_kwargs):
        return DirectPromptResult(
            prompt="Photorealistic anime 16:9 scene about viral spreading rapidly through phones.",
            model="test-writer-model",
            raw_prompt="Photorealistic anime 16:9 scene about viral spreading rapidly through phones.",
        )

    def fake_render_scene_gpt_image_2(**kwargs):
        calls["prompt"] = kwargs["prompt_text"]
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": kwargs["prompt_text"],
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-direct-3",
            "cost_estimate_usd": 0.05,
        }

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "write_layer2_direct_prompt", fake_write_layer2_direct_prompt)

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    provider_module.render_scene_gpt_image_2 = fake_render_scene_gpt_image_2
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", provider_module)

    payload = _card_payload(tmp_path)
    payload.content.word = "viral"
    payload.content.translation = "viral"
    payload.card_image_style = "anime"
    payload.content.layer2_customization = {
        "meaning_strategy": "clear_meaning",
        "presentation_form": "single_scene",
        "visual_intensity": "balanced",
        "backend_template": "direct_prompt_v1",
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert "viral" not in calls["prompt"].lower()
    assert "photorealistic" not in calls["prompt"].lower()
    assert "Do not write the target word or direct answer/translation" in calls["prompt"]


def test_card_image_model_validator_accepts_known_values_and_rejects_typos():
    assert ImageSettings(card_image_model=None).card_image_model is None
    assert ImageSettings().card_image_model is None
    assert ImageSettings(card_image_model="gpt_image_2").card_image_model == "gpt_image_2"
    assert ImageSettings(card_image_model="wan_pro").card_image_model == "wan_pro"

    with pytest.raises(ValidationError):
        ImageSettings(card_image_model="typo_value")

    with pytest.raises(ValidationError):
        _card_payload(tmp_path=Path("."), image_model="typo_value")


def test_structured_card_layer2_settings_route_to_images_settings():
    from job_runner import merge_settings

    layer2 = {
        "meaning_strategy": "absurd_hook",
        "presentation_form": "mini_story",
        "visual_intensity": "cinematic",
    }

    merged = merge_settings(
        profile_settings={},
        art_style=None,
        movie_override=None,
        settings_override={
            "card_image_model": "gpt_image_2",
            "card_layer2": layer2,
            "card_image_style": "surrealism",
        },
    )

    assert merged["images"]["card_image_model"] == "gpt_image_2"
    assert merged["images"]["card_layer2"] == layer2
    assert ImageSettings(card_layer2=layer2).card_layer2 == layer2


def test_resolve_card_model_id_rejects_unknown_values():
    from cloud_engines.image_engine.card_engine import _resolve_card_model_id

    with pytest.raises(ValueError):
        _resolve_card_model_id("typo_value")


def test_storyboard_mnemonic_writeback_does_not_clobber_enrichment_mnemonic(tmp_path):
    from src.manifest import write_manifest, read_manifest
    from src.orchestration.upstream_worker import UpstreamWorker

    class _Table:
        def __init__(self):
            self.updated: dict[str, object] | None = None

        def update(self, data):
            self.updated = data
            return self

        def eq(self, *_args):
            return self

        def execute(self):
            return type("Resp", (), {"data": [self.updated]})()

    class _Supabase:
        def __init__(self):
            self.words = _Table()

        def table(self, name):
            assert name == "words"
            return self.words

    word_dir = tmp_path / "hola"
    storyboard_dir = word_dir / "images" / "v1"
    storyboard_dir.mkdir(parents=True)
    (storyboard_dir / "storyboard.json").write_text(
        json.dumps({"mnemonic_text": "Storyboard caption for video visual_mnemonic."}),
        encoding="utf-8",
    )
    write_manifest(
        word_dir,
        Manifest(
            word_original="hola",
            word_slug="hola",
            translation="hello",
            language="Spanish",
            language_code="es",
            created_at="2026-05-03T00:00:00Z",
            updated_at="2026-05-03T00:00:00Z",
            enrichment=Enrichment(mnemonic="Original enrichment visual scene."),
            selected=Selected(images="v1"),
        ),
    )

    sb = _Supabase()
    worker = UpstreamWorker(
        sb,
        upstream_queue=object(),
        video_queue=object(),
    )

    _run(worker._post_images_mnemonic_writeback(
        {"id": "word-1"},
        tmp_path,
        "hola",
    ))

    manifest = read_manifest(word_dir)
    assert manifest.enrichment.mnemonic == "Original enrichment visual scene."
    assert sb.words.updated == {"visual_mnemonic": "Storyboard caption for video visual_mnemonic."}


def test_create_manifest_persists_gpt_enrichment_fields(tmp_path):
    from src.manifest import create_manifest, read_manifest

    word_dir = tmp_path / "agua"
    word_dir.mkdir()

    create_manifest(
        word_dir=word_dir,
        word_original="agua",
        word_slug="agua",
        translation="water",
        language="Spanish",
        language_code="es",
        enrichment_data={
            "image_scene": "A clear glass of water catches sunlight on a kitchen table.",
            "mnemonic": "Water is the clear refreshment you reach for.",
            "mnemonic_confidence": "helpful",
            "dominant_emotional_reading": "refreshment",
            "composition": "single",
            "treatment": "literal",
            "creative_mode": "clean_iconic",
            "text_embedding_mode": "none",
            "single_image_teachable": True,
            "register_note": None,
            "rationale_summary": "A direct glass of water is immediately teachable.",
        },
    )

    manifest = read_manifest(word_dir)
    assert manifest.enrichment.image_scene == "A clear glass of water catches sunlight on a kitchen table."
    assert manifest.enrichment.mnemonic == "Water is the clear refreshment you reach for."
    assert manifest.enrichment.mnemonic_confidence == "helpful"
    assert manifest.enrichment.dominant_emotional_reading == "refreshment"
    assert manifest.enrichment.composition == "single"
    assert manifest.enrichment.treatment == "literal"
    assert manifest.enrichment.creative_mode == "clean_iconic"
    assert manifest.enrichment.text_embedding_mode == "none"
    assert manifest.enrichment.single_image_teachable is True
    assert "dominant_emotional_reading" not in manifest.enrichment.extra


def test_card_worker_persists_gpt_scene_metadata_separately(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.card_models import CardImageResult
    from src.orchestration import card_worker as card_worker_mod
    from src.orchestration.card_worker import CardWorker
    from src.orchestration import state

    updates: list[dict[str, object]] = []

    class _Table:
        def update(self, data):
            updates.append(data)
            return self

        def eq(self, *_args):
            return self

        def execute(self):
            return type("Resp", (), {"data": updates[-1:]})()

    class _Supabase:
        def table(self, name):
            assert name == "words"
            return _Table()

    def fake_generate_card_image(payload):
        assert payload.content.image_scene == "A raincoat hangs by a door under cool morning light."
        assert payload.content.mnemonic == "Home pulls at you from far away."
        return CardImageResult(
            status="success",
            image_path=str(tmp_path / "card.png"),
            displayed_mnemonic="Home pulls at you from far away.",
            gpt_image_2_card_metadata={
                "prompt_version": "quick_generate_v1",
                "image_scene": "A raincoat hangs by a door under cool morning light.",
                "card_scene_displayed": "A raincoat hangs by a door under cool morning light.",
                "mnemonic": "Home pulls at you from far away.",
                "displayed_mnemonic": "Home pulls at you from far away.",
                "mnemonic_confidence": "helpful",
                "text_embedding_mode": "none",
                "layer2_candidate_text_mode": False,
                "final_provider_prompt_sha256": "abc123",
                "answer_visibility": "hidden",
                "renderer_profile": "balanced_teaching",
                "renderer_profile_source": "auto",
            },
        )

    monkeypatch.setattr(card_engine, "generate_card_image", fake_generate_card_image)
    async def fake_upload(self, **_kwargs):
        return "https://cdn/card.png", None

    monkeypatch.setattr(CardWorker, "_upload_card_image", fake_upload)

    async def _transition(*_args, **_kwargs):
        return True

    monkeypatch.setattr(state, "transition_stage", _transition)
    monkeypatch.setattr(card_worker_mod, "write_event_row", lambda **_kwargs: None)
    (tmp_path / "card.png").write_bytes(b"png")

    worker = CardWorker(_Supabase(), card_queue=asyncio.Queue())
    ok, error = _run(
        worker._generate_card_image(
            {
                "id": "word-1",
                "word": "Heimweh",
                "translation": "homesickness",
                "user_id": "user-1",
                "deck_id": "deck-1",
                "generation_job_id": "job-1",
                "stage_attempts": 1,
                "metadata": {
                    "visual_card_plan": {
                        "image_scene": "A raincoat hangs by a door under cool morning light.",
                        "mnemonic": "Home pulls at you from far away.",
                        "mnemonic_confidence": "helpful",
                        "text_embedding_mode": "none",
                        "renderer_profile": "balanced_teaching",
                        "renderer_profile_source": "auto",
                    }
                },
            },
            {
                "manifest": Manifest(
                    word_original="Heimweh",
                    word_slug="heimweh",
                    translation="homesickness",
                    language="German",
                    language_code="de",
                    created_at="2026-05-04T00:00:00Z",
                    updated_at="2026-05-04T00:00:00Z",
                ),
                "settings": {"images": {"card_image_model": "gpt_image_2"}},
                "word_slug": "heimweh",
                "word_dir": tmp_path,
            },
        )
    )

    assert ok is True
    assert error is None
    assert updates[-1]["thumbnail_url"] == "https://cdn/card.png"
    metadata = updates[-1]["metadata"]["gpt_image_2_card"]
    assert metadata["image_scene"] == metadata["card_scene_displayed"]
    assert metadata["mnemonic"] == "Home pulls at you from far away."
    assert updates[-1]["mnemonic"] == "Home pulls at you from far away."


def test_card_worker_persists_gpt_failure_metadata_for_retry(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.card_models import CardImageResult
    from cloud_engines.image_engine.models import ImageError
    from src.orchestration import card_worker as card_worker_mod
    from src.orchestration.card_worker import CardWorker

    updates: list[dict[str, object]] = []
    uploads: list[str] = []

    class _Table:
        def update(self, data):
            updates.append(data)
            return self

        def eq(self, *_args):
            return self

        def execute(self):
            return type("Resp", (), {"data": updates[-1:]})()

    class _Supabase:
        def table(self, name):
            assert name == "words"
            return _Table()

    def fake_generate_card_image(_payload):
        return CardImageResult(
            status="failed",
            error=ImageError(message="provider timeout", retryable=True),
            gpt_image_2_card_metadata={
                "infographic_template": "infographic_dense_editorial_v4",
                "final_prompt": "cached final prompt",
                "final_prompt_hash": "hash-1",
                "prompt_attempt_count": 1,
                "provider_attempt_count": 1,
                "failure_origin": "provider",
                "provider_reached": True,
            },
        )

    async def fake_upload(self, **_kwargs):
        uploads.append("upload")
        return "https://cdn/card.png", None

    monkeypatch.setattr(card_engine, "generate_card_image", fake_generate_card_image)
    monkeypatch.setattr(CardWorker, "_upload_card_image", fake_upload)
    monkeypatch.setattr(card_worker_mod, "write_event_row", lambda **_kwargs: None)

    worker = CardWorker(_Supabase(), card_queue=asyncio.Queue())
    ok, error = _run(
        worker._generate_card_image(
            {
                "id": "word-1",
                "word": "winner",
                "translation": "Gewinner",
                "user_id": "user-1",
                "deck_id": "deck-1",
                "generation_job_id": "job-1",
                "stage_attempts": 1,
                "metadata": {"visual_card_plan": {"base_language": "German"}},
            },
            {
                "manifest": Manifest(
                    word_original="winner",
                    word_slug="winner",
                    translation="Gewinner",
                    language="English",
                    language_code="en",
                    created_at="2026-05-04T00:00:00Z",
                    updated_at="2026-05-04T00:00:00Z",
                ),
                "settings": {"images": {"card_image_model": "gpt_image_2"}},
                "word_slug": "winner",
                "word_dir": tmp_path,
            },
        )
    )

    assert ok is False
    assert "provider timeout" in (error or "")
    assert uploads == []
    metadata = updates[-1]["metadata"]["gpt_image_2_card"]
    assert metadata["failure_origin"] == "provider"
    assert metadata["prompt_attempt_count"] == 1
    assert metadata["provider_attempt_count"] == 1


def test_card_worker_persists_v4_validator_failure_metadata(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.card_models import CardImageResult
    from cloud_engines.image_engine.models import ImageError
    from src.orchestration import card_worker as card_worker_mod
    from src.orchestration.card_worker import CardWorker

    updates: list[dict[str, object]] = []

    class _Table:
        def update(self, data):
            updates.append(data)
            return self

        def eq(self, *_args):
            return self

        def execute(self):
            return type("Resp", (), {"data": updates[-1:]})()

    class _Supabase:
        def table(self, name):
            assert name == "words"
            return _Table()

    def fake_generate_card_image(_payload):
        return CardImageResult(
            status="failed",
            error=ImageError(message="Infographic V4 validator failed: target/translation appear swapped", retryable=False),
            gpt_image_2_card_metadata={
                "backend_template": "infographic_prompt_v1",
                "infographic_template": "infographic_dense_editorial_v4",
                "validator_passed": False,
                "validator_errors": ["target/translation appear swapped"],
                "validator_hard_errors": ["target/translation appear swapped"],
                "validator_warnings": [],
                "validator_retry_count": 1,
                "provider_reached": False,
                "failure_origin": "validator",
                "final_prompt_chars": 3500,
                "final_prompt_preview": "Title: wishful thinking. Subtitle: wishful thinking.",
                "final_prompt_hash": "hash-validator-failed",
                "prompt_attempt_count": 2,
                "reused_cached_prompt": False,
                "retry_used_cached_prompt": False,
            },
        )

    monkeypatch.setattr(card_engine, "generate_card_image", fake_generate_card_image)
    monkeypatch.setattr(card_worker_mod, "write_event_row", lambda **_kwargs: None)

    worker = CardWorker(_Supabase(), card_queue=asyncio.Queue())
    ok, error = _run(
        worker._generate_card_image(
            {
                "id": "word-1",
                "word": "wishful thinking",
                "translation": "wishful thinking",
                "user_id": "user-1",
                "deck_id": "deck-1",
                "generation_job_id": "job-1",
                "stage_attempts": 3,
                "metadata": {"visual_card_plan": {"base_language": "English"}},
            },
            {
                "manifest": Manifest(
                    word_original="wishful thinking",
                    word_slug="wishful-thinking",
                    translation="wishful thinking",
                    language="English",
                    language_code="en",
                    created_at="2026-05-04T00:00:00Z",
                    updated_at="2026-05-04T00:00:00Z",
                ),
                "settings": {"images": {"card_image_model": "gpt_image_2"}},
                "word_slug": "wishful-thinking",
                "word_dir": tmp_path,
            },
        )
    )

    assert ok is False
    assert "target/translation appear swapped" in (error or "")
    metadata = updates[-1]["metadata"]
    assert metadata["visual_card_plan"] == {"base_language": "English"}
    gpt_metadata = metadata["gpt_image_2_card"]
    assert gpt_metadata["backend_template"] == "infographic_prompt_v1"
    assert gpt_metadata["infographic_template"] == "infographic_dense_editorial_v4"
    assert gpt_metadata["failure_origin"] == "validator"
    assert gpt_metadata["provider_reached"] is False
    assert gpt_metadata["validator_hard_errors"] == ["target/translation appear swapped"]
    assert gpt_metadata["prompt_attempt_count"] == 2


def test_user_dense_validator_failure_terminalizes_word_without_stage_retries(monkeypatch, tmp_path):
    from src.manifest import Manifest
    from src import manifest as manifest_mod
    from src import settings as settings_mod
    from src import storage as storage_mod
    from src.orchestration import card_worker as card_worker_mod
    from src.orchestration import retry
    from src.orchestration.card_worker import CardWorker
    from src.orchestration.finalizer import Finalizer
    from tests.fake_supabase import FakeSupabase

    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "deck-1", "deck_type": "card", "status": "generating"})
    job = sb.add_job(id="job-1", deck_id="deck-1", status="processing")
    word = sb.add_word(
        id="word-v4",
        user_id="user-1",
        deck_id="deck-1",
        generation_job_id=job["id"],
        word="wishful thinking",
        word_slug="wishful-thinking",
        translation="wishful thinking",
        current_stage="pending",
        status="pending",
        metadata={
            "visual_card_plan": {"base_language": "English"},
            "layer2_eval": {
                "backend_template": "infographic_prompt_v1",
                "infographic_template": "infographic_dense_editorial_v4",
                "presentation_form": "infographic_card",
            },
        },
    )
    calls: list[str] = []
    v4_metadata = {
        "backend_template": "infographic_prompt_v1",
        "infographic_template": "infographic_dense_editorial_v4",
        "validator_passed": False,
        "validator_errors": ["banned visible metadata: Zielsprache"],
        "validator_hard_errors": ["banned visible metadata: Zielsprache"],
        "validator_warnings": ["required learning modules missing"],
        "validator_retry_count": 1,
        "provider_reached": False,
        "failure_origin": "validator",
        "final_prompt_preview": "Title: wishful thinking. Subtitle: wishful thinking.",
        "prompt_attempt_count": 2,
    }

    async def fake_generate(self, latest, _deck_context):
        calls.append(latest["current_stage"])
        sb.table("words").update(
            {"metadata": {**(latest.get("metadata") or {}), "gpt_image_2_card": v4_metadata}}
        ).eq("id", latest["id"]).execute()
        return False, "card image generation: Infographic V4 validator failed: banned visible metadata: Zielsprache"

    async def no_sleep():
        return None

    monkeypatch.setattr(CardWorker, "_generate_card_image", fake_generate)
    monkeypatch.setattr(retry, "backoff", no_sleep)
    monkeypatch.setattr(card_worker_mod, "write_event_row", lambda **_kwargs: None)
    monkeypatch.setattr(storage_mod, "get_job_workspace_path", lambda **_kwargs: tmp_path)
    monkeypatch.setattr(settings_mod, "load_defaults", lambda _workspace_path: {"images": {"card_image_model": "gpt_image_2"}})
    monkeypatch.setattr(
        manifest_mod,
        "read_manifest",
        lambda _word_dir: Manifest(
            word_original="wishful thinking",
            word_slug="wishful-thinking",
            translation="wishful thinking",
            language="English",
            language_code="en",
            created_at="2026-05-08T00:00:00Z",
            updated_at="2026-05-08T00:00:00Z",
        ),
    )

    worker = CardWorker(sb, card_queue=asyncio.Queue())
    _run(worker._process_word(dict(word)))
    _run(Finalizer(sb)._maybe_finalize_job(dict(job)))

    row = sb._tables["words"][0]
    jobs = {item["id"]: item for item in sb._tables["generation_jobs"]}
    assert calls == ["pending_image"]
    assert row["current_stage"] == "failed"
    assert row["status"] == "failed"
    assert row["failed_stage"] == "pending_image"
    assert row["metadata"]["gpt_image_2_card"]["failure_origin"] == "validator"
    assert row["metadata"]["gpt_image_2_card"]["provider_reached"] is False
    assert row["metadata"]["gpt_image_2_card"]["validator_hard_errors"] == ["banned visible metadata: Zielsprache"]
    assert jobs[job["id"]]["status"] == "failed"


def test_same_deck_later_card_job_starts_after_user_dense_validator_failure(monkeypatch):
    from src.orchestration import feeder
    from src.orchestration.finalizer import Finalizer
    from tests.fake_supabase import FakeSupabase

    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "deck-1", "deck_type": "card", "status": "generating"})
    failed_job = sb.add_job(id="job-failed", deck_id="deck-1", status="processing")
    waiting_job = sb.add_job(id="job-waiting", deck_id="deck-1", status="approved")
    sb.add_word(
        id="word-failed",
        deck_id="deck-1",
        generation_job_id=failed_job["id"],
        current_stage="failed",
        status="failed",
        failed_stage="pending_image",
        metadata={
            "gpt_image_2_card": {
                "backend_template": "infographic_prompt_v1",
                "infographic_template": "infographic_dense_editorial_v4",
                "failure_origin": "validator",
                "provider_reached": False,
                "validator_hard_errors": ["banned visible metadata: Zielsprache"],
            }
        },
    )
    sb.add_word(
        id="word-waiting",
        deck_id="deck-1",
        generation_job_id=waiting_job["id"],
        current_stage="pre_bootstrap",
        status="pending",
    )
    bootstrap_calls: list[str] = []

    async def _bootstrap(job):
        bootstrap_calls.append(job["id"])

    f = feeder.Feeder(
        sb,
        upstream_queue=asyncio.Queue(maxsize=8),
        video_queue=asyncio.Queue(maxsize=8),
        post_video_queue=asyncio.Queue(maxsize=8),
        card_queue=asyncio.Queue(maxsize=8),
        bootstrap=_bootstrap,
    )

    _run(Finalizer(sb)._maybe_finalize_job(dict(failed_job)))
    _run(f._source1_new_jobs())

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert jobs[failed_job["id"]]["status"] == "failed"
    assert jobs[waiting_job["id"]]["status"] == "processing"
    assert bootstrap_calls == [waiting_job["id"]]


def test_card_worker_passes_layer2_settings_and_persists_layer2_metadata(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from cloud_engines.image_engine.card_models import CardImageResult
    from src.orchestration import card_worker as card_worker_mod
    from src.orchestration.card_worker import CardWorker
    from src.orchestration import state

    updates: list[dict[str, object]] = []
    layer2 = {
        "meaning_strategy": "absurd_hook",
        "presentation_form": "mini_story",
        "visual_intensity": "cinematic",
    }

    class _Table:
        def update(self, data):
            updates.append(data)
            return self

        def eq(self, *_args):
            return self

        def execute(self):
            return type("Resp", (), {"data": updates[-1:]})()

    class _Supabase:
        def table(self, name):
            assert name == "words"
            return _Table()

    def fake_generate_card_image(payload):
        assert payload.content.layer2_customization == layer2
        assert payload.card_image_style == "surrealism"
        assert payload.content.layer2_planning_version == "layer2_planning_v1"
        assert payload.content.mini_story_beats == [
            "a traveler far from home",
            "a doorway glowing with memory",
            "the ache of homesickness becomes clear",
        ]
        assert payload.content.mnemonic_hook["hook_type"] == "semantic_mnemonic"
        return CardImageResult(
            status="success",
            image_path=str(tmp_path / "card.png"),
            displayed_mnemonic="Home pulls at you from far away.",
            gpt_image_2_card_metadata={
                "prompt_version": "quick_generate_v1",
                "renderer_profile": "cinematic_memory",
                "renderer_profile_source": "user_override",
                "image_scene": "A raincoat hangs by a door under cool morning light.",
                "card_scene_displayed": "A raincoat hangs by a door under cool morning light.",
                "mnemonic": "Home pulls at you from far away.",
                "displayed_mnemonic": "Home pulls at you from far away.",
                "mnemonic_confidence": "helpful",
                "layer2_user_choices": layer2,
                "layer2_resolved": {
                    "meaning_strategy": "absurd_hook",
                    "presentation_form": "mini_story",
                    "renderer_profile": "cinematic_memory",
                },
                "layer2_snap_notes": [],
                "image_bridge": "Memory logic: three compact beats make homesickness memorable.",
                "layer2_planning_version": "layer2_planning_v1",
                "mini_story_beats": [
                    "a traveler far from home",
                    "a doorway glowing with memory",
                    "the ache of homesickness becomes clear",
                ],
                "mnemonic_hook": {
                    "hook_type": "semantic_mnemonic",
                    "hook_text": "home pulls",
                    "visual_translation": "A doorway glows with memory.",
                    "quality": "usable",
                },
                "hook_type": "semantic_mnemonic",
                "hook_quality": "usable",
                "text_embedding_mode": "none",
                "layer2_candidate_text_mode": False,
                "final_provider_prompt_sha256": "abc123",
                "answer_visibility": "hidden",
            },
        )

    monkeypatch.setattr(card_engine, "generate_card_image", fake_generate_card_image)

    async def fake_upload(self, **_kwargs):
        return "https://cdn/card.png", None

    monkeypatch.setattr(CardWorker, "_upload_card_image", fake_upload)

    async def _transition(*_args, **_kwargs):
        return True

    monkeypatch.setattr(state, "transition_stage", _transition)
    monkeypatch.setattr(card_worker_mod, "write_event_row", lambda **_kwargs: None)
    (tmp_path / "card.png").write_bytes(b"png")

    worker = CardWorker(_Supabase(), card_queue=asyncio.Queue())
    ok, error = _run(
        worker._generate_card_image(
            {
                "id": "word-1",
                "word": "Heimweh",
                "translation": "homesickness",
                "user_id": "user-1",
                "deck_id": "deck-1",
                "generation_job_id": "job-1",
                "stage_attempts": 1,
                "metadata": {
                    "visual_card_plan": {
                        "image_scene": "A raincoat hangs by a door under cool morning light.",
                        "mnemonic": "Home pulls at you from far away.",
                        "mnemonic_confidence": "helpful",
                        "text_embedding_mode": "none",
                        "renderer_profile": "balanced_teaching",
                        "renderer_profile_source": "auto",
                        "layer2_planning_version": "layer2_planning_v1",
                        "mini_story_beats": [
                            "a traveler far from home",
                            "a doorway glowing with memory",
                            "the ache of homesickness becomes clear",
                        ],
                        "mnemonic_hook": {
                            "hook_type": "semantic_mnemonic",
                            "hook_text": "home pulls",
                            "visual_translation": "A doorway glows with memory.",
                            "quality": "usable",
                        },
                    }
                },
            },
            {
                "manifest": Manifest(
                    word_original="Heimweh",
                    word_slug="heimweh",
                    translation="homesickness",
                    language="German",
                    language_code="de",
                    created_at="2026-05-04T00:00:00Z",
                    updated_at="2026-05-04T00:00:00Z",
                ),
                "settings": {
                    "images": {
                        "card_image_model": "gpt_image_2",
                        "card_image_style": "surrealism",
                        "card_layer2": layer2,
                    }
                },
                "word_slug": "heimweh",
                "word_dir": tmp_path,
            },
        )
    )

    assert ok is True
    assert error is None
    metadata = updates[-1]["metadata"]["gpt_image_2_card"]
    assert metadata["layer2_user_choices"] == layer2
    assert metadata["layer2_resolved"]["renderer_profile"] == "cinematic_memory"
    assert metadata["image_bridge"].startswith("Memory logic:")
    assert metadata["layer2_planning_version"] == "layer2_planning_v1"
    assert metadata["mini_story_beats"][0] == "a traveler far from home"
    assert metadata["mnemonic_hook"]["hook_type"] == "semantic_mnemonic"


def test_card_storage_key_uses_unique_lab_variant_slug():
    from src.orchestration.card_worker import _card_image_storage_key

    first = _card_image_storage_key(
        user_id="user-1",
        deck_id="deck-1",
        word_slug="freedom-l2-001",
    )
    second = _card_image_storage_key(
        user_id="user-1",
        deck_id="deck-1",
        word_slug="freedom-l2-002",
    )

    assert first == "user-1/deck-1/cards/freedom-l2-001.png"
    assert second == "user-1/deck-1/cards/freedom-l2-002.png"
    assert first != second


def test_card_storage_key_is_unique_for_thirteen_same_word_infographic_variants():
    from src.orchestration.card_worker import _card_image_storage_key

    slugs = [f"threshold-l2-safe1-{index:03d}" for index in range(1, 14)]
    keys = [
        _card_image_storage_key(
            user_id="user-1",
            deck_id="deck-1",
            word_slug=slug,
        )
        for slug in slugs
    ]

    assert len(keys) == 13
    assert len(set(keys)) == 13
    assert keys[0] == "user-1/deck-1/cards/threshold-l2-safe1-001.png"
    assert keys[-1] == "user-1/deck-1/cards/threshold-l2-safe1-013.png"
    assert "user-1/deck-1/cards/threshold.png" not in keys
