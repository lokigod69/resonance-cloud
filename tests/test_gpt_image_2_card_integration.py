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
    }

    result = card_engine.generate_card_image(payload)

    assert result.status == "success"
    assert calls["writer_kwargs"]["template"] == "direct_prompt_v2"
    metadata = result.gpt_image_2_card_metadata
    assert metadata is not None
    assert metadata["backend_template"] == "direct_prompt_v2"
    assert metadata["direct_prompt_writer_model"] == "test-writer-model"
    assert any(
        response.get("prompt_chars") == len(calls["provider_kwargs"]["prompt_text"])
        for response in calls["record_responses"]
    )


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
