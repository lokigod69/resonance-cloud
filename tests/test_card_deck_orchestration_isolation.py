"""Card-deck orchestration isolation regressions.

Card decks use ``pending`` as the post-bootstrap handoff state, but they must
never enter the video-oriented upstream pipeline from Source 3 recovery.
"""

from __future__ import annotations

import asyncio
import sys
import types
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import feeder, state  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _fresh_queues():
    return (
        asyncio.Queue(maxsize=8),
        asyncio.Queue(maxsize=8),
        asyncio.Queue(maxsize=8),
        asyncio.Queue(maxsize=8),
    )


def _make_feeder(sb: FakeSupabase, *, queue_size: int = 8) -> feeder.Feeder:
    upstream_q = asyncio.Queue(maxsize=queue_size)
    video_q = asyncio.Queue(maxsize=queue_size)
    post_video_q = asyncio.Queue(maxsize=queue_size)
    card_q = asyncio.Queue(maxsize=queue_size)
    return feeder.Feeder(
        sb,
        upstream_queue=upstream_q,
        video_queue=video_q,
        post_video_queue=post_video_q,
        card_queue=card_q,
        bootstrap=lambda _: asyncio.sleep(0),
    )


def _add_deck(sb: FakeSupabase, *, deck_id: str, deck_type: str) -> None:
    sb._tables["decks"].append(
        {
            "id": deck_id,
            "user_id": "u-1",
            "name": f"{deck_type} deck",
            "target_language": "English",
            "deck_type": deck_type,
            "status": "generating",
        }
    )


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


def _install_card_worker_stubs(monkeypatch, tmp_path: Path, *, settings: dict | None = None) -> None:
    _install_module(
        monkeypatch,
        "src.storage",
        get_job_workspace_path=lambda user_id, deck_id: tmp_path,
    )
    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_a, **_kw: settings or {"images": {}},
    )
    _install_module(
        monkeypatch,
        "src.manifest",
        read_manifest=lambda *_a, **_kw: types.SimpleNamespace(
            word_original="hello",
            translation="hola",
            language="Spanish",
            language_code="es",
            enrichment=types.SimpleNamespace(
                pos="noun",
                bridge_mnemonic=None,
                mnemonic="memory hook",
                dominant_emotional_reading="clear",
                composition_hint="single",
                treatment_hint="literal",
            ),
        ),
    )


def _install_upstream_stubs(monkeypatch, tmp_path: Path, *, run_stage_calls: list[str]) -> None:
    _install_module(
        monkeypatch,
        "src.storage",
        get_job_workspace_path=lambda user_id, deck_id: tmp_path,
    )
    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_a, **_kw: {
            "suno": {"enabled": False},
            "bookend": {"enabled": False},
        },
    )

    class _Selected:
        images = None
        concept = None
        song = None
        video = None
        final = None
        bookend = None

    class _Manifest:
        selected = _Selected()
        settings = {}

    _install_module(
        monkeypatch,
        "src.manifest",
        read_manifest=lambda *_a, **_kw: _Manifest(),
    )
    _install_module(
        monkeypatch,
        "src.services.stage_helpers",
        get_incomplete_stages=lambda *_a, **_kw: ["images", "concept", "song"],
    )

    async def _run_stage(_workspace_path, _word_slug, stage):
        run_stage_calls.append(stage)

    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=_run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )


def test_source3_routes_pending_card_words_to_card_queue():
    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    job = sb.add_job(id="job-card", deck_id="deck-card", status="processing")
    word = sb.add_word(
        id="word-card",
        deck_id="deck-card",
        generation_job_id=job["id"],
        current_stage="pending",
    )

    f = _make_feeder(sb)
    _run(f._source3_orphans())

    assert f.card_queue.qsize() == 1
    assert f.upstream_queue.qsize() == 0
    assert f.card_queue.get_nowait()["id"] == word["id"]


def test_source3_routes_pending_video_words_to_upstream_queue():
    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-video", deck_type="video")
    job = sb.add_job(id="job-video", deck_id="deck-video", status="processing")
    word = sb.add_word(
        id="word-video",
        deck_id="deck-video",
        generation_job_id=job["id"],
        current_stage="pending",
    )

    f = _make_feeder(sb)
    _run(f._source3_orphans())

    assert f.upstream_queue.qsize() == 1
    assert f.card_queue.qsize() == 0
    assert f.upstream_queue.get_nowait()["id"] == word["id"]


def test_source3_routes_pending_image_to_card_queue_regardless_of_deck_type():
    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-video", deck_type="video")
    job = sb.add_job(id="job-video", deck_id="deck-video", status="processing")
    word = sb.add_word(
        id="word-pending-image",
        deck_id="deck-video",
        generation_job_id=job["id"],
        current_stage="pending_image",
    )

    f = _make_feeder(sb)
    _run(f._source3_orphans())

    assert f.card_queue.qsize() == 1
    assert f.upstream_queue.qsize() == 0
    assert f.card_queue.get_nowait()["id"] == word["id"]


def test_source3_dm_style_card_word_cannot_route_to_upstream_queue():
    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    job = sb.add_job(id="job-card", deck_id="deck-card", status="processing")
    word = sb.add_word(
        id="word-dms",
        deck_id="deck-card",
        generation_job_id=job["id"],
        word="to slide into someone's D.M.s",
        current_stage="pending",
    )

    f = _make_feeder(sb)
    _run(f._source3_orphans())

    assert f.card_queue.qsize() == 1
    assert f.upstream_queue.qsize() == 0
    assert f.card_queue.get_nowait()["id"] == word["id"]


def test_upstream_worker_refuses_card_deck_words(monkeypatch, tmp_path):
    from src.orchestration.upstream_worker import UpstreamWorker

    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    word = sb.add_word(
        id="word-accidental-upstream",
        deck_id="deck-card",
        generation_job_id="job-card",
        current_stage="pending",
        word_slug="to-slide-into-someone-s-d-m-s",
    )

    run_stage_calls: list[str] = []
    _install_upstream_stubs(monkeypatch, tmp_path, run_stage_calls=run_stage_calls)

    worker = UpstreamWorker(
        sb,
        upstream_queue=asyncio.Queue(maxsize=1),
        video_queue=asyncio.Queue(maxsize=1),
    )
    _run(worker._process_word(dict(word)))

    row = sb._tables["words"][0]
    assert run_stage_calls == []
    assert row["current_stage"] == "pending"
    assert worker.video_queue.qsize() == 0
    transition_targets = [
        params["p_new_stage"]
        for name, params in sb.rpc_calls
        if name == "transition_word_stage"
    ]
    assert "images" not in transition_targets
    state.drop_timer(word["id"])


def test_retry_failed_gpt_card_word_returns_to_card_queue():
    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    sb.add_job(
        id="job-card",
        deck_id="deck-card",
        status="complete",
        settings_override={"card_image_model": "gpt_image_2"},
    )
    word = sb.add_word(
        id="word-gpt-retry",
        deck_id="deck-card",
        generation_job_id="job-card",
        current_stage="failed",
        failed_stage="pending_image",
        retry_requested=True,
        retry_requested_at="2026-05-03T09:00:00+00:00",
        total_stage_attempts=3,
    )

    f = _make_feeder(sb)
    _run(f._source2_retries())

    assert f.card_queue.qsize() == 1
    assert f.upstream_queue.qsize() == 0
    queued = f.card_queue.get_nowait()
    assert queued["id"] == word["id"]
    assert queued["current_stage"] == "pending_image"
    row = sb._tables["words"][0]
    assert row["current_stage"] == "pending_image"
    assert row["retry_requested"] is False


def test_card_worker_normal_pending_entry_reaches_generation(monkeypatch, tmp_path):
    from src.orchestration.card_worker import CardWorker

    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    word = sb.add_word(
        id="word-normal-card",
        deck_id="deck-card",
        generation_job_id="job-card",
        current_stage="pending",
        status="processing",
        stage_attempts=0,
        total_stage_attempts=0,
        word_slug="hello",
    )
    _install_card_worker_stubs(monkeypatch, tmp_path)

    calls: list[tuple[str, str]] = []

    async def _generate(self, latest, deck_context):
        calls.append((latest["id"], deck_context["word_slug"]))
        return True, None

    monkeypatch.setattr(CardWorker, "_generate_card_image", _generate)

    worker = CardWorker(sb, card_queue=asyncio.Queue(maxsize=1))
    _run(worker._process_word(dict(word)))

    row = sb._tables["words"][0]
    assert calls == [("word-normal-card", "hello")]
    assert row["current_stage"] == "pending_image"
    assert row["stage_attempts"] == 1
    transition_calls = [
        params
        for name, params in sb.rpc_calls
        if name == "transition_word_stage"
    ]
    assert transition_calls[0]["p_allowed_prior_stages"] == ["pending"]
    state.drop_timer(word["id"])


def test_card_worker_accepts_retry_claimed_pending_image_entry(monkeypatch, tmp_path):
    from src.orchestration.card_worker import CardWorker

    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    word = sb.add_word(
        id="word-retry-card",
        deck_id="deck-card",
        generation_job_id="job-card",
        current_stage="pending_image",
        status="processing",
        stage_attempts=0,
        total_stage_attempts=4,
        retry_requested=False,
        failed_stage=None,
        thumbnail_url=None,
        word_slug="hello",
    )
    _install_card_worker_stubs(monkeypatch, tmp_path)

    calls: list[str] = []

    async def _generate(self, latest, deck_context):
        calls.append(latest["id"])
        return True, None

    monkeypatch.setattr(CardWorker, "_generate_card_image", _generate)

    worker = CardWorker(sb, card_queue=asyncio.Queue(maxsize=1))
    _run(worker._process_word(dict(word)))

    row = sb._tables["words"][0]
    assert calls == ["word-retry-card"]
    assert row["current_stage"] == "pending_image"
    assert row["status"] == "processing"
    assert row["stage_attempts"] == 1
    assert row["total_stage_attempts"] == 4
    transition_calls = [
        params
        for name, params in sb.rpc_calls
        if name == "transition_word_stage"
    ]
    assert transition_calls == []
    state.drop_timer(word["id"])


def test_card_worker_refuses_active_pending_image_duplicate(monkeypatch, tmp_path):
    from src.orchestration.card_worker import CardWorker

    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    word = sb.add_word(
        id="word-active-card",
        deck_id="deck-card",
        generation_job_id="job-card",
        current_stage="pending_image",
        status="processing",
        stage_attempts=1,
        total_stage_attempts=4,
        retry_requested=False,
        thumbnail_url=None,
        word_slug="hello",
    )
    _install_card_worker_stubs(monkeypatch, tmp_path)

    calls: list[str] = []

    async def _generate(self, latest, deck_context):
        calls.append(latest["id"])
        return True, None

    monkeypatch.setattr(CardWorker, "_generate_card_image", _generate)

    worker = CardWorker(sb, card_queue=asyncio.Queue(maxsize=1))
    _run(worker._process_word(dict(word)))

    row = sb._tables["words"][0]
    assert calls == []
    assert row["current_stage"] == "pending_image"
    assert row["stage_attempts"] == 1
    assert all(
        params["p_new_stage"] != "images"
        for name, params in sb.rpc_calls
        if name == "transition_word_stage"
    )
    state.drop_timer(word["id"])


def test_failed_gpt_card_retry_reentry_uses_card_model_without_upstream(monkeypatch, tmp_path):
    from cloud_engines.image_engine.card_models import CardImageResult
    from src.orchestration.card_worker import CardWorker

    sb = FakeSupabase()
    _add_deck(sb, deck_id="deck-card", deck_type="card")
    sb.add_job(
        id="job-gpt-card",
        deck_id="deck-card",
        status="complete",
        settings_override={"card_image_model": "gpt_image_2"},
    )
    word = sb.add_word(
        id="word-gpt-card",
        deck_id="deck-card",
        generation_job_id="job-gpt-card",
        current_stage="failed",
        status="failed",
        failed_stage="pending_image",
        retry_requested=True,
        retry_requested_at="2026-05-03T09:00:00+00:00",
        total_stage_attempts=3,
        thumbnail_url=None,
        word_slug="hello",
    )

    f = _make_feeder(sb)
    _run(f._source2_retries())
    assert f.card_queue.qsize() == 1
    assert f.upstream_queue.qsize() == 0
    queued = f.card_queue.get_nowait()
    assert queued["id"] == word["id"]

    image_path = tmp_path / "card.png"
    image_path.write_bytes(b"png")
    payloads = []
    _install_card_worker_stubs(
        monkeypatch,
        tmp_path,
        settings={
            "images": {
                "card_image_model": "gpt_image_2",
                "card_image_style": "Photorealistic",
            },
        },
    )

    def _fake_generate_card_image(payload):
        payloads.append(payload)
        return CardImageResult(status="success", image_path=str(image_path))

    import cloud_engines.image_engine.card_engine as card_engine
    import src.orchestration.card_worker as card_worker

    monkeypatch.setattr(card_engine, "generate_card_image", _fake_generate_card_image)
    monkeypatch.setattr(card_worker, "write_event_row", lambda **_kw: None)

    worker = CardWorker(sb, card_queue=asyncio.Queue(maxsize=1))
    _run(worker._process_word(queued))

    row = sb._tables["words"][0]
    assert [payload.image_model for payload in payloads] == ["gpt_image_2"]
    assert row["current_stage"] == "complete"
    assert row["thumbnail_url"] == "https://example.invalid/x"
    assert f.upstream_queue.qsize() == 0
    assert f.video_queue.qsize() == 0
    state.drop_timer(word["id"])
