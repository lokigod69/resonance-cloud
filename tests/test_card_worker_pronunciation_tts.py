from __future__ import annotations

import asyncio
from pathlib import Path

from cloud_engines.image_engine.card_models import CardImageResult
from src.models import Manifest
from tests.fake_supabase import FakeSupabase


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _manifest() -> Manifest:
    return Manifest(
        word_original="Heimweh",
        word_slug="heimweh",
        translation="homesickness",
        language="German",
        language_code="de",
        created_at="2026-05-09T00:00:00Z",
        updated_at="2026-05-09T00:00:00Z",
    )


def _word_row() -> dict:
    return {
        "id": "word-1",
        "word": "Heimweh",
        "translation": "homesickness",
        "user_id": "user-1",
        "deck_id": "deck-1",
        "generation_job_id": "job-1",
        "stage_attempts": 1,
        "current_stage": "pending_image",
        "status": "processing",
        "metadata": {},
    }


def test_card_image_success_and_tts_success_completes_word_with_tts_url(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from src.orchestration import card_worker as card_worker_mod
    from src.orchestration.card_worker import CardWorker
    from src.services import pronunciation_tts

    image_path = tmp_path / "card.png"
    image_path.write_bytes(b"png")
    sb = FakeSupabase()
    sb.add_word(**_word_row())
    events: list[dict] = []
    tts_calls: list[dict] = []

    def fake_generate_card_image(_payload):
        return CardImageResult(status="success", image_path=str(image_path))

    async def fake_upload(self, **_kwargs):
        return "https://cdn.example/card.png", None

    async def fake_thumbnail_upload(self, **_kwargs):
        return "https://cdn.example/card.thumb.webp"

    async def fake_tts(**kwargs):
        tts_calls.append(kwargs)
        return {
            "tts_audio_url": "https://cdn.example/tts-pronunciations/de/voice-a/hash.mp3",
            "tts_status": "ready",
            "tts_voice_id": "voice-a",
            "tts_generated_at": "2026-05-09T00:00:00+00:00",
        }

    monkeypatch.setattr(card_engine, "generate_card_image", fake_generate_card_image)
    monkeypatch.setattr(CardWorker, "_upload_card_image", fake_upload)
    monkeypatch.setattr(CardWorker, "_upload_card_thumbnail", fake_thumbnail_upload)
    monkeypatch.setattr(pronunciation_tts, "generate_target_headword_for_card", fake_tts)
    monkeypatch.setattr(card_worker_mod, "write_event_row", lambda **kwargs: events.append(kwargs))

    worker = CardWorker(sb, card_queue=asyncio.Queue())
    ok, error = _run(
        worker._generate_card_image(
            _word_row(),
            {
                "manifest": _manifest(),
                "settings": {
                    "images": {"card_image_model": "gpt_image_2"},
                    "bookend": {"voice_id": "voice-a", "model_id": "eleven_flash_v2_5"},
                },
                "word_slug": "heimweh",
                "word_dir": tmp_path,
            },
        )
    )

    row = sb._tables["words"][0]
    assert ok is True
    assert error is None
    assert row["current_stage"] == "complete"
    assert row["thumbnail_url"] == "https://cdn.example/card.png"
    assert row["card_thumbnail_url"] == "https://cdn.example/card.thumb.webp"
    assert row["tts_audio_url"] == "https://cdn.example/tts-pronunciations/de/voice-a/hash.mp3"
    assert row["tts_status"] == "ready"
    assert row["tts_voice_id"] == "voice-a"
    assert tts_calls[0]["language_code"] == "de"
    assert tts_calls[0]["bookend_settings"]["voice_id"] == "voice-a"
    assert any(event["sub_step"] == "tts_pronunciation" and event["status"] == "success" for event in events)


def test_card_image_success_and_tts_failure_still_completes_word(monkeypatch, tmp_path):
    from cloud_engines.image_engine import card_engine
    from src.orchestration import card_worker as card_worker_mod
    from src.orchestration.card_worker import CardWorker
    from src.services import pronunciation_tts

    image_path = tmp_path / "card.png"
    image_path.write_bytes(b"png")
    sb = FakeSupabase()
    sb.add_word(**_word_row())
    events: list[dict] = []

    def fake_generate_card_image(_payload):
        return CardImageResult(status="success", image_path=str(image_path))

    async def fake_upload(self, **_kwargs):
        return "https://cdn.example/card.png", None

    async def fake_tts(**_kwargs):
        raise RuntimeError("provider exploded with a long diagnostic")

    monkeypatch.setattr(card_engine, "generate_card_image", fake_generate_card_image)
    monkeypatch.setattr(CardWorker, "_upload_card_image", fake_upload)
    monkeypatch.setattr(pronunciation_tts, "generate_target_headword_for_card", fake_tts)
    monkeypatch.setattr(card_worker_mod, "write_event_row", lambda **kwargs: events.append(kwargs))

    worker = CardWorker(sb, card_queue=asyncio.Queue())
    ok, error = _run(
        worker._generate_card_image(
            _word_row(),
            {
                "manifest": _manifest(),
                "settings": {
                    "images": {"card_image_model": "gpt_image_2"},
                    "bookend": {"voice_id": "voice-a", "model_id": "eleven_flash_v2_5"},
                },
                "word_slug": "heimweh",
                "word_dir": tmp_path,
            },
        )
    )

    row = sb._tables["words"][0]
    assert ok is True
    assert error is None
    assert row["current_stage"] == "complete"
    assert row["thumbnail_url"] == "https://cdn.example/card.png"
    assert row["card_thumbnail_url"] is None
    assert row["tts_audio_url"] is None
    assert row["tts_status"] == "failed"
    failure_events = [event for event in events if event["sub_step"] == "tts_pronunciation" and event["status"] == "failed"]
    assert failure_events
    assert "provider exploded" in failure_events[0]["error_message"]
