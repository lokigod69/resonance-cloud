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


def _install_seedream_transport_mocks(monkeypatch: pytest.MonkeyPatch, module):
    captured: dict[str, object] = {}

    def fake_submit(payload: dict, headers: dict) -> str:
        captured["payload"] = payload
        captured["headers"] = headers
        return "task-seedream-123"

    monkeypatch.setenv("KIE_API_KEY", "test-key")
    monkeypatch.setattr(module, "_submit_task", fake_submit)
    monkeypatch.setattr(
        module,
        "_poll_task",
        lambda task_id, headers: {
            "code": 200,
            "data": {
                "state": "success",
                "resultJson": json.dumps(
                    {"resultUrls": ["https://example.invalid/seedream.png"]}
                ),
            },
        },
    )
    monkeypatch.setattr(
        module,
        "_download_and_save",
        lambda image_url, output_path: None,
    )
    return captured


def test_seedream_provider_sends_t2i_kie_body(monkeypatch, tmp_path):
    from cloud_engines.image_engine import seedream_provider

    captured = _install_seedream_transport_mocks(monkeypatch, seedream_provider)
    prompt_payload = _image_prompt()

    result = seedream_provider.render_scene_seedream(
        image_prompt=prompt_payload,
        model_id=seedream_provider.SEEDREAM_T2I_MODEL,
        output_path=tmp_path / "001.png",
        aspect_ratio="16:9",
        input_urls=None,
        use_color_palette=False,
        art_style="photorealistic",
    )

    payload = captured["payload"]
    expected_prompt = compile_scene_to_text(
        {"art_style": "photorealistic", "image_prompt": prompt_payload},
        has_reference_image=False,
        use_color_palette=False,
    )
    assert payload == {
        "model": "seedream/5-lite-text-to-image",
        "input": {
            "prompt": expected_prompt,
            "aspect_ratio": "16:9",
            "quality": "basic",
            "nsfw_checker": False,
        },
    }
    assert result["success"] is True
    assert result["provider_name"] == "seedream"
    assert result["model_name"] == "seedream/5-lite-text-to-image"
    assert result["request_id"] == "task-seedream-123"


def test_seedream_provider_sends_i2i_kie_body(monkeypatch, tmp_path):
    from cloud_engines.image_engine import seedream_provider

    captured = _install_seedream_transport_mocks(monkeypatch, seedream_provider)
    prompt_payload = _image_prompt()
    input_urls = ["https://example.invalid/reference.png"]

    seedream_provider.render_scene_seedream(
        image_prompt=prompt_payload,
        model_id=seedream_provider.SEEDREAM_T2I_MODEL,
        output_path=tmp_path / "002.png",
        aspect_ratio="16:9",
        input_urls=input_urls,
        use_color_palette=True,
        art_style="photorealistic",
    )

    payload = captured["payload"]
    assert payload["model"] == "seedream/5-lite-image-to-image"
    assert payload["input"]["image_urls"] == input_urls
    assert isinstance(payload["input"]["image_urls"], list)
    assert payload["input"]["prompt"].startswith(
        "Use image 1 as the identity anchor for elderly farmer with weathered face."
    )
    assert payload["input"]["aspect_ratio"] == "16:9"
    assert payload["input"]["quality"] == "basic"
    assert payload["input"]["nsfw_checker"] is False


def test_seedream_and_wan_compiled_prompts_are_identical():
    scene = {"art_style": "photorealistic", "image_prompt": _image_prompt()}

    wan_prompt = compile_scene_to_text(
        scene,
        has_reference_image=True,
        use_color_palette=True,
    )
    seedream_prompt = compile_scene_to_text(
        scene,
        has_reference_image=True,
        use_color_palette=True,
    )

    assert seedream_prompt == wan_prompt


def test_seedream_lite_is_valid_image_setting_and_resolves_to_model_id():
    from cloud_engines.image_engine.renderer import resolve_model_id

    settings = ImageSettings(image_model="seedream_lite")

    assert settings.image_model == "seedream_lite"
    assert resolve_model_id(settings.image_model) == "seedream/5-lite-text-to-image"


def test_renderer_dispatches_seedream_branch(monkeypatch, tmp_path):
    from cloud_engines.image_engine import renderer

    calls: dict[str, object] = {}

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **kwargs):
            calls["record_response"] = kwargs

    def fake_render_scene_seedream(**kwargs):
        calls["provider_kwargs"] = kwargs
        Path(kwargs["output_path"]).write_bytes(b"png")
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": "compiled seedream prompt",
            "response_body": '{"state":"success"}',
            "provider_name": "seedream",
            "model_name": kwargs["model_id"],
            "request_id": "task-seedream-456",
            "cost_estimate_usd": None,
        }

    monkeypatch.setattr(renderer, "logged_api_call", lambda **kwargs: FakeEvent())
    monkeypatch.setattr(renderer, "_upload_scene_still_for_admin", lambda *a, **kw: {})

    import types

    provider_module = types.ModuleType("cloud_engines.image_engine.seedream_provider")
    provider_module.SEEDREAM_I2I_MODEL = "seedream/5-lite-image-to-image"
    provider_module.render_scene_seedream = fake_render_scene_seedream
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.seedream_provider", provider_module)

    result = renderer.render_scene(
        image_prompt=ImagePromptData(**_image_prompt()),
        model_id="seedream/5-lite-text-to-image",
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
    assert result.provider_name == "seedream"
    assert result.model_name == "seedream/5-lite-text-to-image"
    assert calls["provider_kwargs"]["input_urls"] is None
    assert calls["record_response"]["provider"] == "seedream"
    assert calls["record_response"]["request_id"] == "task-seedream-456"
