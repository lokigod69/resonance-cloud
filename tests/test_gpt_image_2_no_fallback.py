from __future__ import annotations

import sys
import types
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from cloud_engines.image_engine.card_models import CardImageContent, CardImagePayload  # noqa: E402
from cloud_engines.image_engine.models import ImageMetadata  # noqa: E402


def _payload(tmp_path: Path) -> CardImagePayload:
    return CardImagePayload(
        content=CardImageContent(
            word="slow burn",
            translation="langsame Annaherung",
            language="English",
            language_code="en",
            pos="phrase",
            mnemonic="Two adults slowly notice each other in a quiet train compartment.",
            dominant_emotional_reading="patient longing",
            composition_hint="single",
            treatment_hint="mnemonic",
        ),
        card_image_style="Photorealistic",
        image_model="gpt_image_2",
        output_dir=str(tmp_path),
        metadata=ImageMetadata(
            word="slow burn",
            language="English",
            translation="langsame Annaherung",
            timestamp="2026-05-03T00:00:00Z",
            word_id="word-gpt",
            deck_id="deck-1",
            user_id="sir-robert",
            job_id="job-1",
            attempt=1,
        ),
    )


def test_gpt_image_2_failure_does_not_dispatch_non_gpt_provider(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine

    calls: list[str] = []

    class FakeEvent:
        def __enter__(self):
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

        def record_response(self, **_kwargs):
            return None

    def fake_gpt_render(**_kwargs):
        calls.append("gpt")
        return {
            "success": False,
            "file_path": None,
            "error_message": "generation failed: bad prompt",
            "prompt_text": "prompt",
            "response_body": "{}",
            "provider_name": "gpt_image_2",
            "model_name": "gpt-image-2-text-to-image",
            "request_id": "task-gpt",
            "cost_estimate_usd": 0.05,
        }

    def fail_non_gpt_provider(**_kwargs):
        raise AssertionError("GPT Image-2 failure must not dispatch a fallback provider")

    monkeypatch.setattr(card_engine, "logged_api_call", lambda **_kwargs: FakeEvent())
    monkeypatch.setattr(card_engine, "_call_openrouter_card", fail_non_gpt_provider)
    monkeypatch.setattr(card_engine, "_render_card_image", fail_non_gpt_provider)

    gpt_module = types.ModuleType("cloud_engines.image_engine.gpt_image_2_provider")
    gpt_module.render_scene_gpt_image_2 = fake_gpt_render
    monkeypatch.setitem(sys.modules, "cloud_engines.image_engine.gpt_image_2_provider", gpt_module)

    result = card_engine.generate_card_image(_payload(tmp_path))

    assert result.status == "failed"
    assert result.error is not None
    assert "bad prompt" in result.error.message
    assert calls == ["gpt"]
