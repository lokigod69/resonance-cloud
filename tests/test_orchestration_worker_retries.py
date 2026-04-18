"""Worker-path retry tests for round 2.

Covers the actual retry-bump call sites:
- upstream images retry
- video retry
- downstream suno_bake retry
- downstream assembly retry (shared helper also covers bookend call site)
- downstream upload retry
"""

from __future__ import annotations

import asyncio
import sys
import types
from pathlib import Path

import pytest

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import state  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


class _Selected:
    def __init__(
        self,
        *,
        song: str | None = "take_a.wav",
        final: str | None = "final-a",
        bookend: str | None = None,
    ):
        self.song = song
        self.final = final
        self.bookend = bookend
        self.video = None
        self.images = None
        self.concept = None


class _Manifest:
    def __init__(
        self,
        *,
        song: str | None = "take_a.wav",
        final: str | None = "final-a",
        bookend: str | None = None,
        settings: dict | None = None,
    ):
        self.selected = _Selected(song=song, final=final, bookend=bookend)
        self.settings = settings or {}
        self.enrichment = None
        self.input_type = "word"
        self.language = "es"
        self.language_code = "es"
        self.translation = ""
        self.word_original = ""
        self.lineage = []


def _install_storage(monkeypatch, tmp_path: Path) -> None:
    _install_module(
        monkeypatch,
        "src.storage",
        STORAGE_MODE="local",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
        get_job_workspace_path=lambda user_id, deck_id: tmp_path,
        get_workspace_root=lambda: tmp_path,
    )


def _install_settings(
    monkeypatch,
    *,
    suno_enabled: bool = False,
    bookend_enabled: bool = False,
) -> None:
    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_a, **_kw: {
            "suno": {"enabled": suno_enabled},
            "bookend": {"enabled": bookend_enabled},
        },
        resolve_settings=lambda *_a, **_kw: {},
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
        resolve_random_art_style=lambda s: (s, None),
    )


def _install_manifest(monkeypatch, manifest: _Manifest | None = None) -> _Manifest:
    manifest_obj = manifest or _Manifest()
    _install_module(
        monkeypatch,
        "src.manifest",
        read_manifest=lambda *_a, **_kw: manifest_obj,
        update_selection=lambda *_a, **_kw: None,
        update_settings=lambda *_a, **_kw: None,
        create_manifest=lambda *_a, **_kw: None,
        write_manifest=lambda *_a, **_kw: None,
        add_lineage=lambda *_a, **_kw: None,
        now_iso=lambda: "2026-04-18T00:00:00Z",
    )
    return manifest_obj


def _install_stage_helpers(monkeypatch) -> None:
    _install_module(
        monkeypatch,
        "src.services.stage_helpers",
        get_incomplete_stages=lambda *_a, **_kw: [
            "images", "concept", "song", "video", "assembly", "bookend",
        ],
    )


def _make_word(sb: FakeSupabase, **overrides):
    row = sb.add_word(
        deck_id=overrides.get("deck_id", "d-1"),
        word_slug=overrides.get("word_slug", "hola"),
        **{k: v for k, v in overrides.items() if k not in {"deck_id", "word_slug"}},
    )
    return row


def test_upstream_retry_bump_releases_when_word_cancelled(monkeypatch, tmp_path):
    from src.orchestration.upstream_worker import UpstreamWorker

    sb = FakeSupabase()
    word = _make_word(sb, current_stage="pending")

    _install_storage(monkeypatch, tmp_path)
    _install_settings(monkeypatch, suno_enabled=False, bookend_enabled=False)
    _install_manifest(monkeypatch)
    _install_stage_helpers(monkeypatch)

    calls = {"n": 0}

    async def _run_stage(_workspace_path, _word_slug, stage):
        calls["n"] += 1
        assert stage == "images"
        sb._tables["words"][0]["current_stage"] = "cancelling"
        raise RuntimeError("boom")

    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=_run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )

    worker = UpstreamWorker(
        sb,
        upstream_queue=asyncio.Queue(maxsize=1),
        video_queue=asyncio.Queue(maxsize=1),
    )
    _run(worker._process_word({**word, "_workspace_path": str(tmp_path)}))

    row = sb._tables["words"][0]
    assert calls["n"] == 1
    assert row["current_stage"] == "cancelling"
    assert row["failed_stage"] is None
    assert worker.video_queue.qsize() == 0
    state.drop_timer(word["id"])


def test_upstream_retry_happy_path_continues_after_bump(monkeypatch, tmp_path):
    from src.orchestration.upstream_worker import UpstreamWorker

    sb = FakeSupabase()
    word = _make_word(sb, current_stage="pending")

    _install_storage(monkeypatch, tmp_path)
    _install_settings(monkeypatch, suno_enabled=False, bookend_enabled=False)
    _install_manifest(monkeypatch)
    _install_stage_helpers(monkeypatch)

    calls: dict[str, int] = {}

    async def _run_stage(_workspace_path, _word_slug, stage):
        calls[stage] = calls.get(stage, 0) + 1
        if stage == "images" and calls[stage] == 1:
            raise RuntimeError("retry images once")

    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=_run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )

    worker = UpstreamWorker(
        sb,
        upstream_queue=asyncio.Queue(maxsize=1),
        video_queue=asyncio.Queue(maxsize=1),
    )
    _run(worker._process_word({**word, "_workspace_path": str(tmp_path)}))

    row = sb._tables["words"][0]
    assert row["current_stage"] == "video_queued"
    assert row["total_stage_attempts"] == 4
    assert worker.video_queue.qsize() == 1
    assert calls == {"images": 2, "concept": 1, "song": 1}
    state.drop_timer(word["id"])


def test_video_retry_bump_releases_when_word_cancelled(monkeypatch, tmp_path):
    from src.orchestration.video_dispatcher import VideoDispatcher

    sb = FakeSupabase()
    word = _make_word(sb, current_stage="video_queued")

    _install_storage(monkeypatch, tmp_path)
    calls = {"n": 0}

    async def _run_stage(_workspace_path, _word_slug, stage):
        calls["n"] += 1
        assert stage == "video"
        sb._tables["words"][0]["current_stage"] = "cancelling"
        raise RuntimeError("boom")

    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=_run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )

    worker = VideoDispatcher(
        sb,
        video_queue=asyncio.Queue(maxsize=1),
        post_video_queue=asyncio.Queue(maxsize=1),
    )
    _run(worker._process_word({**word, "_workspace_path": str(tmp_path)}))

    row = sb._tables["words"][0]
    assert calls["n"] == 1
    assert row["current_stage"] == "cancelling"
    assert worker.post_video_queue.qsize() == 0
    state.drop_timer(word["id"])


def test_video_retry_happy_path_continues_after_bump(monkeypatch, tmp_path):
    from src.orchestration.video_dispatcher import VideoDispatcher

    sb = FakeSupabase()
    word = _make_word(sb, current_stage="video_queued")

    _install_storage(monkeypatch, tmp_path)
    calls = {"n": 0}

    async def _run_stage(_workspace_path, _word_slug, stage):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("retry video once")

    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=_run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )

    worker = VideoDispatcher(
        sb,
        video_queue=asyncio.Queue(maxsize=1),
        post_video_queue=asyncio.Queue(maxsize=1),
    )
    _run(worker._process_word({**word, "_workspace_path": str(tmp_path)}))

    row = sb._tables["words"][0]
    assert row["current_stage"] == "post_video_queued"
    assert row["total_stage_attempts"] == 2
    assert worker.post_video_queue.qsize() == 1
    assert calls["n"] == 2
    state.drop_timer(word["id"])


def test_downstream_suno_bake_retry_bump_releases_when_word_cancelled(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = _make_word(
        sb,
        current_stage="suno_bake",
        music_state="submitted",
        stage_attempts=1,
        total_stage_attempts=1,
    )

    _install_settings(monkeypatch, suno_enabled=True, bookend_enabled=False)
    manifest = _install_manifest(monkeypatch)

    calls = {"n": 0}

    async def _bake(*_a, **_kw):
        calls["n"] += 1
        sb._tables["words"][0]["current_stage"] = "cancelling"
        return {"success": False, "error": "boom"}

    _install_module(
        monkeypatch,
        "src.services.suno_bakein",
        bake_suno_into_word=_bake,
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    ok = _run(worker._run_suno_bake(
        dict(word), tmp_path, word["word_slug"], inline_submit=False,
    ))

    row = sb._tables["words"][0]
    assert ok is False
    assert calls["n"] == 1
    assert row["current_stage"] == "cancelling"
    assert row["total_stage_attempts"] == 1
    assert manifest.selected.final == "final-a"


def test_downstream_suno_bake_retry_happy_path_continues_after_bump(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = _make_word(
        sb,
        current_stage="suno_bake",
        music_state="submitted",
        stage_attempts=1,
        total_stage_attempts=1,
    )

    manifest = _install_manifest(monkeypatch)
    _install_settings(monkeypatch, suno_enabled=True, bookend_enabled=False)

    calls = {"n": 0}

    async def _bake(*_a, **_kw):
        calls["n"] += 1
        if calls["n"] == 1:
            return {"success": False, "error": "retry"}
        return {"success": True, "suno_ab_manifests": {"a": manifest}}

    _install_module(
        monkeypatch,
        "src.services.suno_bakein",
        bake_suno_into_word=_bake,
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    ok = _run(worker._run_suno_bake(
        dict(word), tmp_path, word["word_slug"], inline_submit=False,
    ))

    row = sb._tables["words"][0]
    assert ok is True
    assert calls["n"] == 2
    assert row["current_stage"] == "uploading"
    assert row["music_state"] == "baked"
    assert row["stage_attempts"] == 1
    assert row["total_stage_attempts"] == 3


def test_downstream_assembly_retry_bump_releases_when_word_cancelled(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = _make_word(
        sb,
        current_stage="assembly",
        music_state="disabled",
        stage_attempts=1,
        total_stage_attempts=1,
    )

    _install_settings(monkeypatch, suno_enabled=False, bookend_enabled=False)
    _install_manifest(monkeypatch)

    calls = {"n": 0}

    async def _run_stage(_workspace_path, _word_slug, stage):
        calls["n"] += 1
        assert stage == "assembly"
        sb._tables["words"][0]["current_stage"] = "cancelling"
        raise RuntimeError("boom")

    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=_run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    ok = _run(worker._run_ab_pipeline(
        dict(word), tmp_path, word["word_slug"], entered_at="assembly",
    ))

    row = sb._tables["words"][0]
    assert ok is False
    assert calls["n"] == 1
    assert row["current_stage"] == "cancelling"
    assert row["failed_stage"] is None


def test_downstream_assembly_retry_happy_path_continues_after_bump(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = _make_word(
        sb,
        current_stage="assembly",
        music_state="disabled",
        stage_attempts=1,
        total_stage_attempts=1,
    )

    _install_settings(monkeypatch, suno_enabled=False, bookend_enabled=False)
    _install_manifest(monkeypatch)

    calls = {"n": 0}

    async def _run_stage(_workspace_path, _word_slug, stage):
        calls["n"] += 1
        if calls["n"] == 1:
            raise RuntimeError("retry")

    _install_module(
        monkeypatch,
        "src.pipeline",
        run_stage=_run_stage,
        STAGE_ORDER=["images", "concept", "song", "video", "assembly", "bookend"],
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    ok = _run(worker._run_ab_pipeline(
        dict(word), tmp_path, word["word_slug"], entered_at="assembly",
    ))

    row = sb._tables["words"][0]
    assert ok is True
    assert calls["n"] == 2
    assert row["current_stage"] == "uploading"
    assert row["stage_attempts"] == 1
    assert row["total_stage_attempts"] == 3


def test_downstream_upload_retry_bump_releases_when_word_cancelled(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = _make_word(
        sb,
        current_stage="uploading",
        stage_attempts=1,
        total_stage_attempts=1,
    )

    manifest = _install_manifest(monkeypatch)
    calls = {"n": 0}

    async def _upload(*_a, **_kw):
        calls["n"] += 1
        sb._tables["words"][0]["current_stage"] = "cancelling"
        return False

    _install_module(
        monkeypatch,
        "src.services.publishing",
        upload_ab_results=_upload,
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    ok = _run(worker._upload_and_complete(
        {**word, "_ab_manifests": {"a": manifest}},
        tmp_path,
        word["word_slug"],
    ))

    row = sb._tables["words"][0]
    assert ok is False
    assert calls["n"] == 1
    assert row["current_stage"] == "cancelling"
    assert row["status"] == "pending"


def test_downstream_upload_retry_happy_path_continues_after_bump(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    sb.add_job(status="processing", deck_id="d-1", words_completed=0)
    word = _make_word(
        sb,
        current_stage="uploading",
        stage_attempts=1,
        total_stage_attempts=1,
        status="processing",
    )

    manifest = _install_manifest(monkeypatch)
    calls = {"n": 0}

    async def _upload(_sb, _fresh, _word_dir, _user_id, _deck_id, _word_slug, **_kw):
        calls["n"] += 1
        if calls["n"] == 1:
            return False
        sb._tables["words"][0]["video_url"] = "https://example.invalid/video.mp4"
        return True

    _install_module(
        monkeypatch,
        "src.services.publishing",
        upload_ab_results=_upload,
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    ok = _run(worker._upload_and_complete(
        {**word, "_ab_manifests": {"a": manifest}},
        tmp_path,
        word["word_slug"],
    ))

    row = sb._tables["words"][0]
    job = sb._tables["generation_jobs"][0]
    assert ok is True
    assert calls["n"] == 2
    assert row["current_stage"] == "complete"
    assert row["status"] == "complete"
    assert row["total_stage_attempts"] == 2
    assert job["words_completed"] == 1


def test_upload_retry_race_releases_slow_replica(monkeypatch, tmp_path):
    from src.orchestration import retry
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = _make_word(
        sb,
        current_stage="uploading",
        stage_attempts=1,
        total_stage_attempts=1,
        status="processing",
    )

    manifest = _install_manifest(monkeypatch)
    released = asyncio.Event()
    attempts: dict[str, int] = {}

    async def _backoff():
        task_name = asyncio.current_task().get_name()
        if task_name == "slow":
            await released.wait()
        else:
            await asyncio.sleep(0)

    async def _upload(_sb, _fresh, _word_dir, _user_id, _deck_id, _word_slug, **_kw):
        task_name = asyncio.current_task().get_name()
        attempts[task_name] = attempts.get(task_name, 0) + 1
        if attempts[task_name] == 1:
            return False
        if task_name == "fast":
            return True
        pytest.fail("slow replica should be released before second upload")

    original_transition = state.transition_stage

    async def _transition(*args, **kwargs):
        ok = await original_transition(*args, **kwargs)
        if kwargs.get("new_stage") == "complete" and ok:
            released.set()
        return ok

    monkeypatch.setattr(retry, "backoff", _backoff)
    monkeypatch.setattr(state, "transition_stage", _transition)
    _install_module(
        monkeypatch,
        "src.services.publishing",
        upload_ab_results=_upload,
    )

    word_payload = {**word, "_ab_manifests": {"a": manifest}}
    fast = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    slow = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))

    async def _main():
        return await asyncio.gather(
            asyncio.create_task(
                fast._upload_and_complete(word_payload, tmp_path, word["word_slug"]),
                name="fast",
            ),
            asyncio.create_task(
                slow._upload_and_complete(word_payload, tmp_path, word["word_slug"]),
                name="slow",
            ),
        )

    results = _run(_main())

    row = sb._tables["words"][0]
    assert sorted(results) == [False, True]
    assert row["current_stage"] == "complete"
    assert attempts["fast"] == 2
    assert attempts["slow"] == 1
