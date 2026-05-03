from __future__ import annotations

import json
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
                "A driver grips the wheel at a city intersection while a bright "
                "green arrow bends left. The car noses into the left lane as the "
                "street sign points the same way."
            ),
            dominant_emotional_reading="decisive movement, NOT confusion",
            composition_hint="embodied",
            treatment_hint="literal",
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
        mnemonic="A driver turns left at an intersection marked by a green arrow.",
        dominant_emotional_reading="decisive movement, NOT hesitation",
        composition_hint="multi_panel",
        treatment_hint="absurd",
        card_image_style="Editorial",
    )

    assert full_prompt.startswith("Editorial 16:9 image.")
    assert 'German phrase "links abbiegen" = "turn left"' in full_prompt
    assert "left-to-right sequence" in full_prompt
    assert "unexpected visual motif" in full_prompt
    assert "No visible text, letters, captions" in full_prompt
    assert 'Render the word "links abbiegen"' not in full_prompt

    sparse_prompt = build_gpt_image_2_prompt(
        word="agua",
        translation="water",
        language="Spanish",
        pos=None,
        mnemonic=None,
        dominant_emotional_reading=None,
        composition_hint=None,
        treatment_hint=None,
        card_image_style="Photorealistic",
    )

    assert "None" not in sparse_prompt
    assert "Scene:" not in sparse_prompt
    assert "Composition:" not in sparse_prompt
    assert 'Spanish word "agua" = "water"' in sparse_prompt
    assert "No visible text" in sparse_prompt


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
        resolution="2K",
    )

    assert captured[0]["payload"] == {
        "model": "gpt-image-2-text-to-image",
        "input": {
            "prompt": "Create a card.",
            "aspect_ratio": "16:9",
            "resolution": "2K",
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
    assert calls["provider_kwargs"]["resolution"] == "2K"
    assert "links abbiegen" in calls["provider_kwargs"]["prompt_text"]
    request_body = json.loads(calls["record_response"]["request_body"])
    assert request_body == {
        "model": "gpt-image-2-text-to-image",
        "input": {
            "prompt": calls["provider_kwargs"]["prompt_text"],
            "aspect_ratio": "16:9",
            "resolution": "2K",
        },
    }


def test_card_image_model_validator_accepts_known_values_and_rejects_typos():
    assert ImageSettings(card_image_model=None).card_image_model is None
    assert ImageSettings().card_image_model is None
    assert ImageSettings(card_image_model="gpt_image_2").card_image_model == "gpt_image_2"
    assert ImageSettings(card_image_model="wan_pro").card_image_model == "wan_pro"

    with pytest.raises(ValidationError):
        ImageSettings(card_image_model="typo_value")

    with pytest.raises(ValidationError):
        _card_payload(tmp_path=Path("."), image_model="typo_value")


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
            "mnemonic": "A clear glass of water catches sunlight on a kitchen table.",
            "dominant_emotional_reading": "refreshment",
            "composition_hint": "single",
            "treatment_hint": "literal",
        },
    )

    manifest = read_manifest(word_dir)
    assert manifest.enrichment.mnemonic == "A clear glass of water catches sunlight on a kitchen table."
    assert manifest.enrichment.dominant_emotional_reading == "refreshment"
    assert manifest.enrichment.composition_hint == "single"
    assert manifest.enrichment.treatment_hint == "literal"
    assert "dominant_emotional_reading" not in manifest.enrichment.extra
