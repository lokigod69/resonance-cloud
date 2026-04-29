from __future__ import annotations

import json
import sys
from pathlib import Path

import pytest

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.models import ImagePromptData, ImageSettings  # noqa: E402
from cloud_engines.image_engine.prompt_compiler import compile_scene_to_text  # noqa: E402


def _image_prompt(**overrides: object) -> dict:
    data = {
        "subject_identity": "elderly farmer with weathered face",
        "action_state": "stands in a muddy field",
        "environment": "wide rural farmland after rain",
        "composition": "wide aerial view, farmer centered but small in frame",
        "lighting": "soft overcast morning light",
        "material_detail": "coarse linen shirt, wet soil, rough skin texture",
        "mood_palette": "earth brown, muted green, pale gray sky",
        "style_medium_override": None,
        "continuity_anchor": "weathered face, linen shirt, and muddy boots",
        "change_request": "move closer to a medium portrait while keeping the same farmer",
        "aspect_ratio": "16:9",
        "text_element": None,
    }
    data.update(overrides)
    return data


def _install_kie_transport_mocks(monkeypatch: pytest.MonkeyPatch, module):
    captured: dict[str, object] = {}

    def fake_submit(payload: dict, headers: dict) -> str:
        captured["payload"] = payload
        captured["headers"] = headers
        return "task-z-image-123"

    monkeypatch.setenv("KIE_API_KEY", "test-kie-key")
    monkeypatch.setattr(module, "_submit_task", fake_submit)
    monkeypatch.setattr(
        module,
        "_poll_task",
        lambda task_id, headers: {
            "code": 200,
            "data": {
                "state": "success",
                "resultJson": json.dumps(
                    {"resultUrls": ["https://example.invalid/z-image.png"]}
                ),
            },
        },
    )
    monkeypatch.setattr(module, "_download_and_save", lambda image_url, output_path: None)
    return captured


def test_zturbo_resolves_to_hybrid_internal_model_id():
    from cloud_engines.image_engine.renderer import resolve_model_id

    settings = ImageSettings(image_model="zturbo")

    assert settings.image_model == "zturbo"
    assert resolve_model_id(settings.image_model) == "z-image-turbo"


def test_zturbo_uses_base_storyboard_model_block():
    from cloud_engines.image_engine.prompts import _image_model_block

    assert _image_model_block("zturbo") is None


def test_z_image_turbo_provider_sends_kie_t2i_body(monkeypatch, tmp_path):
    from cloud_engines.image_engine import z_image_turbo_provider

    captured = _install_kie_transport_mocks(monkeypatch, z_image_turbo_provider)
    prompt_payload = _image_prompt()

    result = z_image_turbo_provider.render_scene_z_image_turbo(
        image_prompt=prompt_payload,
        model_id="z-image-turbo",
        output_path=tmp_path / "001.png",
        aspect_ratio="16:9",
        input_urls=None,
        use_color_palette=False,
        art_style="photorealistic",
    )

    expected_prompt = compile_scene_to_text(
        {"art_style": "photorealistic", "image_prompt": prompt_payload},
        has_reference_image=False,
        use_color_palette=False,
    )
    assert captured["payload"] == {
        "model": "z-image",
        "input": {
            "prompt": expected_prompt,
            "aspect_ratio": "16:9",
            "nsfw_checker": False,
        },
    }
    assert result["success"] is True
    assert result["provider_name"] == "z_image_turbo_kie"
    assert result["model_name"] == "z-image"
    assert result["request_id"] == "task-z-image-123"


def test_z_image_turbo_provider_sends_fal_i2i_arguments(monkeypatch, tmp_path):
    from cloud_engines.image_engine import z_image_turbo_provider

    captured: dict[str, object] = {}

    async def fake_submit(model_id: str, arguments: dict) -> dict:
        captured["model_id"] = model_id
        captured["arguments"] = arguments
        return {
            "images": [{"url": "https://example.invalid/fal-z-image.png"}],
            "seed": 123,
            "has_nsfw_concepts": [False],
            "prompt": arguments["prompt"],
            "request_id": "fal-request-123",
        }

    monkeypatch.setattr(z_image_turbo_provider, "submit_fal_image", fake_submit)
    monkeypatch.setattr(z_image_turbo_provider, "_download_and_save", lambda url, path: None)

    prompt_payload = _image_prompt()
    result = z_image_turbo_provider.render_scene_z_image_turbo(
        image_prompt=prompt_payload,
        model_id="z-image-turbo",
        output_path=tmp_path / "002.png",
        aspect_ratio="16:9",
        input_urls=["https://example.invalid/reference.png"],
        use_color_palette=True,
        art_style="photorealistic",
    )

    expected_prompt = compile_scene_to_text(
        {"art_style": "photorealistic", "image_prompt": prompt_payload},
        has_reference_image=True,
        use_color_palette=True,
    )
    assert captured["model_id"] == "fal-ai/z-image/turbo/image-to-image"
    assert captured["arguments"] == {
        "prompt": expected_prompt,
        "image_url": "https://example.invalid/reference.png",
        "image_size": "landscape_16_9",
        "num_inference_steps": 8,
        "num_images": 1,
        "strength": 0.5,
        "enable_safety_checker": True,
        "output_format": "png",
    }
    assert result["success"] is True
    assert result["provider_name"] == "z_image_turbo_fal"
    assert result["model_name"] == "fal-ai/z-image/turbo/image-to-image"


def test_renderer_dispatches_zturbo_hybrid_branch(monkeypatch, tmp_path):
    from cloud_engines.image_engine import renderer
    import types

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls["record_response"] = kwargs

    def fake_render_scene_z_image_turbo(**kwargs):
        calls["provider_kwargs"] = kwargs
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": "compiled z-image prompt",
            "response_body": '{"state":"success"}',
            "provider_name": "z_image_turbo_kie",
            "model_name": "z-image",
            "request_id": "task-z-image-456",
            "cost_estimate_usd": 0.004,
        }

    monkeypatch.setattr(renderer, "logged_api_call", lambda **kwargs: FakeEvent())
    monkeypatch.setattr(renderer, "_upload_scene_still_for_admin", lambda *a, **kw: {})

    provider_module = types.ModuleType("cloud_engines.image_engine.z_image_turbo_provider")
    provider_module.render_scene_z_image_turbo = fake_render_scene_z_image_turbo
    monkeypatch.setitem(
        sys.modules,
        "cloud_engines.image_engine.z_image_turbo_provider",
        provider_module,
    )

    result = renderer.render_scene(
        image_prompt=ImagePromptData(**_image_prompt()),
        model_id="z-image-turbo",
        output_path=tmp_path / "001.png",
        aspect_ratio="16:9",
        use_color_palette=False,
        art_style="photorealistic",
        word_id="word-1",
        deck_id="deck-1",
        user_id="user-1",
        job_id="job-1",
    )

    assert result.success is True
    assert result.provider_name == "z_image_turbo_kie"
    assert result.model_name == "z-image"
    assert calls["provider_kwargs"]["input_urls"] is None
    assert calls["record_response"]["provider"] == "z_image_turbo_kie"
    assert calls["record_response"]["cost_usd"] == 0.004
