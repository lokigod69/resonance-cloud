"""Timer emission tests for worker terminal paths."""

from __future__ import annotations

import asyncio
import logging
import sys
import types
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import retry, state  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


class _Manifest:
    settings = {}


def _install_upstream_stubs(monkeypatch, tmp_path: Path, run_stage):
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
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.manifest",
        read_manifest=lambda *_a, **_kw: _Manifest(),
    )
    _install_module(
        monkeypatch,
        "src.services.stage_helpers",
        get_incomplete_stages=lambda *_a, **_kw: [
            "images", "concept", "song", "video", "assembly", "bookend",
        ],
    )
    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )


def test_stage_timer_emits_and_clears_on_terminal_failure(monkeypatch, tmp_path, caplog):
    from src.orchestration.upstream_worker import UpstreamWorker

    monkeypatch.setattr(retry, "RETRY_BACKOFF_SECONDS", 0.0)
    state._stage_timers.clear()

    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="pending",
        status="pending",
        word_slug="hola",
    )

    async def _run_stage(_workspace_path, _word_slug, stage):
        raise RuntimeError(f"{stage} boom")

    _install_upstream_stubs(monkeypatch, tmp_path, _run_stage)

    upstream_q = asyncio.Queue(maxsize=1)
    video_q = asyncio.Queue(maxsize=1)
    worker = UpstreamWorker(sb, upstream_queue=upstream_q, video_queue=video_q)

    async def _main():
        task = asyncio.create_task(worker.run())
        await upstream_q.put({**word, "_workspace_path": str(tmp_path)})
        deadline = asyncio.get_event_loop().time() + 3.0
        while sb._tables["words"][0]["current_stage"] != "failed" and asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(0.05)
        worker.stop()
        await asyncio.wait_for(task, timeout=3.0)

    with caplog.at_level(logging.INFO):
        _run(_main())

    assert sb._tables["words"][0]["current_stage"] == "failed"
    assert any("durations_ms=" in rec.getMessage() for rec in caplog.records)
    assert state.active_timer_count() == 0


def test_stage_timer_emits_and_clears_on_retry_release(monkeypatch, tmp_path, caplog):
    from src.orchestration.upstream_worker import UpstreamWorker

    monkeypatch.setattr(retry, "RETRY_BACKOFF_SECONDS", 0.0)
    state._stage_timers.clear()

    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="pending",
        status="pending",
        word_slug="hola",
    )

    calls = {"n": 0}

    async def _run_stage(_workspace_path, _word_slug, stage):
        calls["n"] += 1
        sb._tables["words"][0]["current_stage"] = "cancelling"
        raise RuntimeError(f"{stage} boom")

    _install_upstream_stubs(monkeypatch, tmp_path, _run_stage)

    upstream_q = asyncio.Queue(maxsize=1)
    video_q = asyncio.Queue(maxsize=1)
    worker = UpstreamWorker(sb, upstream_queue=upstream_q, video_queue=video_q)

    async def _main():
        task = asyncio.create_task(worker.run())
        await upstream_q.put({**word, "_workspace_path": str(tmp_path)})
        deadline = asyncio.get_event_loop().time() + 3.0
        while calls["n"] < 1 and asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(0.05)
        worker.stop()
        await asyncio.wait_for(task, timeout=3.0)

    with caplog.at_level(logging.INFO):
        _run(_main())

    assert sb._tables["words"][0]["current_stage"] == "cancelling"
    assert any("durations_ms=" in rec.getMessage() for rec in caplog.records)
    assert state.active_timer_count() == 0
