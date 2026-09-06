"""Focused regressions for the 2026-09-07 Railway runner hardening."""

from __future__ import annotations

import ast
import asyncio
from datetime import datetime, timedelta, timezone
import importlib
from pathlib import Path
import sys
import types

import pytest

from src.orchestration import feeder
from src.pipeline import PipelineError, _require_engine_status
from src.storage import (
    UnsafePathComponentError,
    get_job_workspace_path,
    validate_word_slug,
)
from src.workspace import get_word_dir
from tests.fake_supabase import FakeSupabase


ROOT = Path(__file__).resolve().parents[1]


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _queues() -> tuple[asyncio.Queue, asyncio.Queue, asyncio.Queue, asyncio.Queue]:
    return tuple(asyncio.Queue(maxsize=4) for _ in range(4))  # type: ignore[return-value]


def test_generated_slug_contract_and_canonical_confinement(monkeypatch, tmp_path):
    monkeypatch.setattr("src.storage.get_workspace_root", lambda: tmp_path)

    workspace = get_job_workspace_path("user-1", "deck_2")
    word_dir = get_word_dir(workspace, "die-kuh-melken-l2-r7k3-001")

    assert workspace.parent == tmp_path.resolve()
    assert word_dir.parent == workspace
    assert validate_word_slug("e38193e38293e381abe381a1e381af")

    for unsafe in (
        "../victim",
        "nested/word",
        "nested\\word",
        "/absolute",
        "quote'file",
        "under_score",
        "Übung",
        "a" * 65,
    ):
        with pytest.raises(UnsafePathComponentError):
            get_word_dir(workspace, unsafe)

    with pytest.raises(UnsafePathComponentError):
        get_job_workspace_path("../victim", "deck-1")


def test_cleanup_refuses_read_then_delete_without_ownership_lease(monkeypatch, tmp_path):
    from src import storage

    monkeypatch.setattr(storage, "STORAGE_MODE", "cloud")
    monkeypatch.setattr(storage, "get_workspace_root", lambda: tmp_path)
    workspace = storage.create_job_workspace("user-1", "deck-1")
    artifact = workspace / "retry-manifest.json"
    artifact.write_text("keep", encoding="utf-8")

    assert storage.cleanup_job_workspace("user-1", "deck-1") is False
    assert artifact.read_text(encoding="utf-8") == "keep"


def test_structured_engine_failure_raises_with_provider_detail():
    with pytest.raises(PipelineError, match="images engine failed: provider timeout"):
        _require_engine_status(
            {"status": "failed", "error": {"message": "provider timeout"}},
            stage="images",
            accepted=("success", "partial"),
        )

    assert _require_engine_status(
        {"status": "partial"},
        stage="video",
        accepted=("success", "partial"),
    ) == "partial"


def test_card_worker_terminalizes_traversal_slug_before_disk_read(monkeypatch, tmp_path):
    from src import storage
    from src.orchestration.card_worker import CardWorker

    sb = FakeSupabase()
    word = sb.add_word(word_slug="../victim", current_stage="pending")
    monkeypatch.setattr(storage, "get_job_workspace_path", lambda **_kwargs: tmp_path)
    worker = CardWorker(sb, card_queue=asyncio.Queue(maxsize=1))

    _run(worker._process_word(dict(word)))

    persisted = sb._tables["words"][0]
    assert persisted["current_stage"] == "failed"
    assert persisted["failed_stage"] == "pending_image"
    assert not (tmp_path.parent / "victim").exists()


def test_bootstrap_failure_persists_backoff_and_rolls_back_all_words(monkeypatch):
    sb = FakeSupabase()
    job = sb.add_job(bootstrap_attempt_count=1, bootstrap_retry_after=None)
    word_a = sb.add_word(generation_job_id=job["id"], current_stage="pending")
    word_b = sb.add_word(generation_job_id=job["id"], current_stage="pending")
    calls = 0

    async def failing_bootstrap(_job):
        nonlocal calls
        calls += 1
        for row in sb._tables["words"]:
            row["current_stage"] = "enrichment"
            row["status"] = "processing"
        raise RuntimeError("enrichment shape rejected")

    upstream, video, post_video, card = _queues()
    worker = feeder.Feeder(
        sb,
        upstream_queue=upstream,
        video_queue=video,
        post_video_queue=post_video,
        card_queue=card,
        bootstrap=failing_bootstrap,
    )
    monkeypatch.setattr(feeder, "BOOTSTRAP_MAX_ATTEMPTS", 5)
    monkeypatch.setattr(feeder, "BOOTSTRAP_RETRY_BASE_SECONDS", 1.0)
    monkeypatch.setattr(feeder, "BOOTSTRAP_RETRY_MAX_SECONDS", 10.0)

    _run(worker._try_start_job(dict(job)))

    persisted = sb._tables["generation_jobs"][0]
    assert calls == 1
    assert persisted["status"] == "approved"
    assert persisted["bootstrap_attempt_count"] == 2
    assert datetime.fromisoformat(persisted["bootstrap_retry_after"]) > datetime.now(timezone.utc)
    assert {word_a["id"], word_b["id"]} == {
        row["id"] for row in sb._tables["words"] if row["current_stage"] == "pending"
    }


def test_bootstrap_retry_deadline_skips_call_and_cap_terminalizes(monkeypatch):
    sb = FakeSupabase()
    future = (datetime.now(timezone.utc) + timedelta(minutes=5)).isoformat()
    deferred = sb.add_job(
        id="job-deferred",
        deck_id="deck-deferred",
        bootstrap_attempt_count=2,
        bootstrap_retry_after=future,
    )
    capped = sb.add_job(
        id="job-capped",
        deck_id="deck-capped",
        bootstrap_attempt_count=4,
        bootstrap_retry_after=None,
    )
    sb.add_word(generation_job_id=capped["id"], deck_id=capped["deck_id"])
    called: list[str] = []

    async def failing_bootstrap(job):
        called.append(job["id"])
        for row in sb._tables["words"]:
            if row.get("generation_job_id") == job["id"]:
                row["current_stage"] = "enrichment"
        raise RuntimeError("permanent bootstrap failure")

    upstream, video, post_video, card = _queues()
    worker = feeder.Feeder(
        sb,
        upstream_queue=upstream,
        video_queue=video,
        post_video_queue=post_video,
        card_queue=card,
        bootstrap=failing_bootstrap,
    )
    monkeypatch.setattr(feeder, "BOOTSTRAP_MAX_ATTEMPTS", 5)

    _run(worker._source1_new_jobs())

    rows = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert called == [capped["id"]]
    assert rows[deferred["id"]]["status"] == "approved"
    assert rows[capped["id"]]["status"] == "failed"
    assert rows[capped["id"]]["bootstrap_attempt_count"] == 5
    assert rows[capped["id"]]["completed_at"]
    assert not any(name == "refund_credit" for name, _params in sb.rpc_calls)


def test_every_bookend_subprocess_has_a_timeout():
    files = list((ROOT / "cloud_engines" / "bookend_engine").glob("*.py"))
    calls: list[tuple[Path, ast.Call]] = []
    for path in files:
        tree = ast.parse(path.read_text(encoding="utf-8"), filename=str(path))
        for node in ast.walk(tree):
            if not isinstance(node, ast.Call) or not isinstance(node.func, ast.Attribute):
                continue
            if (
                isinstance(node.func.value, ast.Name)
                and node.func.value.id == "subprocess"
                and node.func.attr == "run"
            ):
                calls.append((path, node))

    assert calls
    missing = [
        f"{path.name}:{node.lineno}"
        for path, node in calls
        if not any(keyword.arg == "timeout" for keyword in node.keywords)
    ]
    assert missing == []


def test_unexpected_worker_exit_cancels_peers_and_raises(monkeypatch):
    supabase_stub = types.ModuleType("supabase")
    supabase_stub.Client = object
    supabase_stub.create_client = lambda *_args, **_kwargs: FakeSupabase()
    monkeypatch.setitem(sys.modules, "supabase", supabase_stub)
    monkeypatch.setenv("SUPABASE_URL", "https://example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")

    import job_runner

    importlib.reload(job_runner)

    async def scenario():
        async def returned():
            return None

        async def sleeping():
            await asyncio.Event().wait()

        exited = asyncio.create_task(returned(), name="exited-worker")
        peer = asyncio.create_task(sleeping(), name="peer-worker")
        await exited
        with pytest.raises(RuntimeError, match="exited-worker: returned"):
            await job_runner._surface_unexpected_task_exit(
                tasks=[exited, peer],
                done={exited},
                pending={peer},
            )
        assert peer.cancelled()

    _run(scenario())


def test_bootstrap_retry_migration_contract():
    sql = (
        ROOT
        / "frontend"
        / "supabase"
        / "migrations"
        / "20260907102000_generation_job_bootstrap_retry_state.sql"
    ).read_text(encoding="utf-8").lower()

    assert "bootstrap_attempt_count integer not null default 0" in sql
    assert "bootstrap_retry_after timestamptz" in sql
    assert "check (bootstrap_attempt_count >= 0)" in sql
    assert "where status = 'approved'" in sql
