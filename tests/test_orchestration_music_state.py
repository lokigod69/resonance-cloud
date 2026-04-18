"""Tests for downstream worker music_state branching + CRIT-2 exclusive claim.

Covers:
- CRIT-2: downstream claim transitions OUT of post_video_queued (true
  exclusivity). Two replicas racing the same post_video_queued word: one
  wins, one loses. Test does NOT manually mutate state between claims.
- baked branch target = 'uploading' directly
- submitted branch target = 'suno_bake' directly
- pending branch target = 'suno_bake' directly (inline submit happens inside)
- disabled/submit_failed/bake_failed target = 'assembly' directly
- CRIT-5: inline Suno submit failure reroutes suno_bake -> assembly
- HIGH-1: baked recovery reads disk manifest and uploads single-variant
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
from src.orchestration import state  # noqa: E402
from src.orchestration.downstream_worker import _branch_target_for  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


class _Selected:
    def __init__(self, *, final: str | None = "final-a", bookend: str | None = None):
        self.song = "take_a.wav"
        self.final = final
        self.bookend = bookend
        self.video = None
        self.images = None
        self.concept = None


class _Manifest:
    def __init__(self, *, settings: dict | None = None):
        self.selected = _Selected()
        self.settings = settings or {}


# ---------------------------------------------------------------------------
# _branch_target_for — the branch-decision function
# ---------------------------------------------------------------------------

def test_branch_target_baked():
    assert _branch_target_for("baked") == "uploading"


def test_branch_target_submitted():
    assert _branch_target_for("submitted") == "suno_bake"


def test_branch_target_pending():
    assert _branch_target_for("pending") == "suno_bake"


def test_branch_target_disabled():
    assert _branch_target_for("disabled") == "assembly"


def test_branch_target_submit_failed():
    assert _branch_target_for("submit_failed") == "assembly"


def test_branch_target_bake_failed():
    assert _branch_target_for("bake_failed") == "assembly"


# ---------------------------------------------------------------------------
# CRIT-2: exclusive claim via transition out of post_video_queued
# ---------------------------------------------------------------------------

def test_crit2_post_video_double_claim_single_winner():
    """Two replicas race the SAME post_video_queued word. No state mutation
    between calls — the claim's own transition must provide exclusivity.

    This test would FAIL under the v0 implementation (claim UPDATE that
    transitions post_video_queued -> post_video_queued and thus satisfies
    the WHERE predicate twice).
    """
    sb = FakeSupabase()
    word = sb.add_word(current_stage="post_video_queued", music_state="baked")

    async def _claim():
        return await state.transition_stage(
            sb, word["id"],
            new_stage="uploading",              # baked branch target
            allowed_prior=["post_video_queued"],
            increment_attempts=True,
        )

    async def _main():
        return await asyncio.gather(_claim(), _claim())

    results = _run(_main())
    assert results.count(True) == 1
    assert results.count(False) == 1
    row = sb._tables["words"][0]
    assert row["current_stage"] == "uploading"
    # Counter bumped exactly once — no lost increment from the losing claim
    # trying to retry after rowcount=0.
    assert row["total_stage_attempts"] == 1


def test_crit2_submitted_branch_claim_exclusive():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="post_video_queued", music_state="submitted")

    async def _claim():
        return await state.transition_stage(
            sb, word["id"],
            new_stage="suno_bake",
            allowed_prior=["post_video_queued"],
            increment_attempts=True,
        )

    async def _main():
        return await asyncio.gather(_claim(), _claim(), _claim())

    results = _run(_main())
    assert results.count(True) == 1
    assert results.count(False) == 2
    assert sb._tables["words"][0]["current_stage"] == "suno_bake"


def test_crit2_placeholder_branch_claim_exclusive():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="post_video_queued", music_state="disabled")

    async def _claim():
        return await state.transition_stage(
            sb, word["id"],
            new_stage="assembly",
            allowed_prior=["post_video_queued"],
            increment_attempts=True,
        )

    async def _main():
        return await asyncio.gather(_claim(), _claim())

    results = _run(_main())
    assert results.count(True) == 1
    assert results.count(False) == 1
    assert sb._tables["words"][0]["current_stage"] == "assembly"


def test_crit2_downstream_worker_process_word_claims_exclusively(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="post_video_queued",
        music_state="baked",
        status="processing",
    )

    calls = {"n": 0}

    async def _prepare(self, fresh, workspace_path, word_slug):
        calls["n"] += 1
        assert Path(workspace_path) == tmp_path
        assert word_slug == word["word_slug"]
        await asyncio.sleep(0)
        return False

    monkeypatch.setattr(DownstreamWorker, "_prepare_baked_upload", _prepare)

    w1 = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    w2 = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))

    async def _main():
        await asyncio.gather(
            w1._process_word({**word, "_workspace_path": str(tmp_path)}),
            w2._process_word({**word, "_workspace_path": str(tmp_path)}),
        )

    _run(_main())

    row = sb._tables["words"][0]
    assert calls["n"] == 1
    assert row["current_stage"] == "uploading"
    state.drop_timer(word["id"])


# ---------------------------------------------------------------------------
# CRIT-5: inline-submit failure reroutes
# ---------------------------------------------------------------------------

def test_crit5_submit_failed_reroutes_suno_bake_to_assembly():
    """After inline submit fails (music_state='submit_failed'), the worker
    must transition suno_bake -> assembly (single atomic UPDATE), not
    continue to bake on an empty task.
    """
    sb = FakeSupabase()
    # Word entered suno_bake via claim; inline submit then failed.
    word = sb.add_word(current_stage="suno_bake", music_state="submit_failed")

    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="assembly",
        allowed_prior=["suno_bake"],
        increment_attempts=True,
    ))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["current_stage"] == "assembly"
    assert row["music_state"] == "submit_failed"   # preserved for ops visibility


def test_crit5_inline_submit_failure_routes_through_placeholder_worker_path(
    monkeypatch, tmp_path,
):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="post_video_queued",
        music_state="pending",
        status="processing",
    )

    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_a, **_kw: {
            "suno": {"enabled": True},
            "bookend": {"enabled": False},
        },
        resolve_settings=lambda *_a, **_kw: {},
        DEFAULT_SETTINGS={},
        save_defaults=lambda *_a, **_kw: None,
        resolve_random_art_style=lambda s: (s, None),
    )
    _install_module(
        monkeypatch,
        "src.suno",
        read_concept_data=lambda *_a, **_kw: {},
        submit_song=(lambda *_a, **_kw: (_ for _ in ()).throw(RuntimeError("submit failed"))),
    )

    bake_calls = {"n": 0}

    async def _bake(*_a, **_kw):
        bake_calls["n"] += 1
        raise AssertionError("bake should not run after submit_failed reroute")

    _install_module(
        monkeypatch,
        "src.services.suno_bakein",
        bake_suno_into_word=_bake,
    )

    placeholder_calls = {"n": 0}

    async def _placeholder(self, fresh, workspace_path, word_slug, *, entered_at):
        placeholder_calls["n"] += 1
        assert entered_at == "assembly"
        assert Path(workspace_path) == tmp_path
        assert word_slug == word["word_slug"]
        return False

    monkeypatch.setattr(DownstreamWorker, "_run_ab_pipeline", _placeholder)

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    _run(worker._process_word({**word, "_workspace_path": str(tmp_path)}))

    row = sb._tables["words"][0]
    assert placeholder_calls["n"] == 1
    assert bake_calls["n"] == 0
    assert row["current_stage"] == "assembly"
    assert row["music_state"] == "submit_failed"
    state.drop_timer(word["id"])


# ---------------------------------------------------------------------------
# bake-failed fall-through: single atomic UPDATE
# ---------------------------------------------------------------------------

def test_bake_failed_fall_through_single_update():
    """§6.4: music_state=bake_failed AND current_stage=assembly must land in
    the SAME UPDATE. No intermediate state."""
    sb = FakeSupabase()
    word = sb.add_word(current_stage="suno_bake", music_state="submitted")

    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="assembly",
        allowed_prior=["suno_bake"],
        increment_attempts=True,
        extra={"music_state": "bake_failed"},
    ))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["current_stage"] == "assembly"
    assert row["music_state"] == "bake_failed"


# ---------------------------------------------------------------------------
# HIGH-1: baked recovery reads manifest from disk
# ---------------------------------------------------------------------------

def test_high1_baked_recovery_reads_manifest_from_disk(tmp_path=None):
    """When the downstream worker's claim transitions a baked word to
    'uploading' after recovery, `_prepare_baked_upload` must read the word's
    manifest.json off disk and populate `_suno_ab_manifests` (single-variant
    degradation per §6.4 support-recovery note).
    """
    import tempfile
    import types

    # Install stubs for src.manifest so we can exercise _prepare_baked_upload
    # without the real module's full Pydantic chain.
    class _StubManifest:
        selected = types.SimpleNamespace(song=None, final=None, video=None)
        settings = {}

    stub = types.ModuleType("src.manifest")
    stub.read_manifest = lambda word_dir: _StubManifest()
    sys.modules["src.manifest"] = stub

    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = sb.add_word(current_stage="uploading", music_state="baked")

    with tempfile.TemporaryDirectory() as td:
        workspace = Path(td)
        word_dir = workspace / word["word_slug"]
        word_dir.mkdir(parents=True)
        (word_dir / "manifest.json").write_text("{}", encoding="utf-8")

        w = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
        word_dict = dict(word)
        ok = _run(w._prepare_baked_upload(word_dict, workspace, word["word_slug"]))

        assert ok is True
        assert "a" in word_dict["_suno_ab_manifests"]
        # B is None by design (single-variant degradation)
        assert word_dict["_suno_ab_manifests"].get("b") is None


def test_high1_baked_recovery_manifest_missing_fails_word():
    """If manifest.json is unreadable (disk lost / workspace wiped), the word
    must terminally fail with failed_stage='uploading' per §6.4 runbook note.
    """
    import types

    stub = types.ModuleType("src.manifest")
    def _raise(*_a, **_kw):
        raise RuntimeError("manifest unreadable")
    stub.read_manifest = _raise
    sys.modules["src.manifest"] = stub

    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = sb.add_word(current_stage="uploading", music_state="baked")

    # Point at a nonexistent workspace
    workspace = Path("/nonexistent_workspace_xyz_999")

    w = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    ok = _run(w._prepare_baked_upload(dict(word), workspace, word["word_slug"]))

    assert ok is False
    assert sb._tables["words"][0]["current_stage"] == "failed"
    assert sb._tables["words"][0]["failed_stage"] == "uploading"


def test_upload_ab_results_updates_artifacts_without_setting_status(monkeypatch, tmp_path):
    from src.services import publishing

    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="uploading",
        status="processing",
    )

    video_a = tmp_path / "video-a.mp4"
    video_a.write_bytes(b"a")
    video_b = tmp_path / "video-b.mp4"
    video_b.write_bytes(b"b")

    manifest_a = _Manifest()
    manifest_b = _Manifest()

    calls = {"n": 0}

    def _resolve(word_dir, manifest):
        return video_a if manifest is manifest_a else video_b

    def _upload(sb_client, video_path, word_dir, storage_video_key, storage_thumb_key, thumb_suffix=""):
        calls["n"] += 1
        suffix = "_b" if video_path == video_b else ""
        return (
            f"https://example.invalid/video{suffix}.mp4",
            f"https://example.invalid/thumb{suffix}.jpg",
        )

    monkeypatch.setattr(publishing, "_resolve_final_video", _resolve)
    monkeypatch.setattr(publishing, "_upload_video_and_thumb", _upload)

    ok = _run(publishing.upload_ab_results(
        sb,
        word,
        tmp_path,
        word["user_id"],
        word["deck_id"],
        word["word_slug"],
        manifest_a=manifest_a,
        manifest_b=manifest_b,
    ))

    row = sb._tables["words"][0]
    assert ok is True
    assert calls["n"] == 2
    assert row["status"] == "processing"
    assert row["video_url"] == "https://example.invalid/video.mp4"
    assert row["thumbnail_url"] == "https://example.invalid/thumb.jpg"
    assert row["video_url_b"] == "https://example.invalid/video_b.mp4"
    assert row["thumbnail_url_b"] == "https://example.invalid/thumb_b.jpg"


def test_high6_crash_after_upload_keeps_status_processing_until_complete(
    monkeypatch, tmp_path,
):
    from src.orchestration import recovery
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    sb.add_job(status="processing", deck_id="d-1", words_completed=0)
    word = sb.add_word(
        deck_id="d-1",
        current_stage="uploading",
        music_state="baked",
        status="processing",
    )

    manifest = _Manifest()
    _install_module(
        monkeypatch,
        "src.manifest",
        read_manifest=lambda *_a, **_kw: manifest,
    )

    async def _upload(*_a, **_kw):
        sb._tables["words"][0]["video_url"] = "https://example.invalid/video.mp4"
        return True

    _install_module(
        monkeypatch,
        "src.services.publishing",
        upload_ab_results=_upload,
    )

    original_transition = state.transition_stage

    async def _crash_then_restore(*args, **kwargs):
        if kwargs.get("new_stage") == "complete":
            raise RuntimeError("simulated crash")
        return await original_transition(*args, **kwargs)

    monkeypatch.setattr(state, "transition_stage", _crash_then_restore)

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    try:
        _run(worker._upload_and_complete(
            {**word, "_suno_ab_manifests": {"a": manifest}},
            tmp_path,
            word["word_slug"],
        ))
    except RuntimeError:
        pass

    row = sb._tables["words"][0]
    assert row["current_stage"] == "uploading"
    assert row["status"] == "processing"
    assert row["video_url"] == "https://example.invalid/video.mp4"

    monkeypatch.setattr(state, "transition_stage", original_transition)

    up = asyncio.Queue(maxsize=1)
    v = asyncio.Queue(maxsize=1)
    pv = asyncio.Queue(maxsize=1)
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))

    row = sb._tables["words"][0]
    assert row["current_stage"] == "post_video_queued"
    assert row["status"] == "processing"
    assert pv.qsize() == 1

    async def _prepare(self, fresh, workspace_path, word_slug):
        return True

    monkeypatch.setattr(DownstreamWorker, "_prepare_baked_upload", _prepare)

    recovered = pv.get_nowait()
    _run(worker._process_word({**recovered, "_workspace_path": str(tmp_path)}))

    row = sb._tables["words"][0]
    assert row["current_stage"] == "complete"
    assert row["status"] == "complete"
    state.drop_timer(word["id"])


if __name__ == "__main__":
    failures = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS  {name}")
            except Exception as e:
                failures.append((name, e))
                print(f"FAIL  {name}: {e}")
    if failures:
        sys.exit(1)
