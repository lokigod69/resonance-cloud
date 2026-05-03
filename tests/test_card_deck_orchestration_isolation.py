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
