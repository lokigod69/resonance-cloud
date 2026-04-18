"""End-to-end integration: three words pushed onto the upstream queue;
actual concurrent UpstreamWorker tasks drain them through images -> concept
-> song -> video_queued.

MED-2 honesty: spawns 2 worker tasks so the draining is concurrent (not
sequential). The fake Supabase's row-level atomicity prevents duplicate
processing.

MED-7: asserts per-word stage_attempts and total_stage_attempts after the
run, so a regression of the CRIT-1 counter atomicity would fail this test.
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


def _install_stubs():
    """Monkey-patch heavy src imports used by the upstream worker."""
    pipeline_mod = types.ModuleType("src.pipeline")
    async def _run_stage(*_a, **_kw):
        return None
    pipeline_mod.run_stage = _run_stage
    pipeline_mod.STAGE_ORDER = ["images", "concept", "song", "video", "assembly", "bookend"]
    sys.modules["src.pipeline"] = pipeline_mod

    helpers_mod = types.ModuleType("src.services.stage_helpers")
    helpers_mod.get_incomplete_stages = lambda *_a, **_kw: [
        "images", "concept", "song", "video", "assembly", "bookend",
    ]
    sys.modules["src.services.stage_helpers"] = helpers_mod

    manifest_mod = types.ModuleType("src.manifest")
    class _Sel:
        song = None
        final = None
        video = None
        images = None
        concept = None
        bookend = None
    class _Manifest:
        selected = _Sel()
        settings = {}
        enrichment = None
        input_type = "word"
        language = "es"
        language_code = "es"
        translation = ""
        word_original = ""
        lineage = []
    manifest_mod.read_manifest = lambda *_a, **_kw: _Manifest()
    manifest_mod.update_selection = lambda *_a, **_kw: None
    manifest_mod.update_settings = lambda *_a, **_kw: None
    manifest_mod.create_manifest = lambda *_a, **_kw: None
    manifest_mod.write_manifest = lambda *_a, **_kw: None
    manifest_mod.add_lineage = lambda *_a, **_kw: None
    manifest_mod.now_iso = lambda: "2026-04-18T00:00:00Z"
    sys.modules["src.manifest"] = manifest_mod

    settings_mod = types.ModuleType("src.settings")
    settings_mod.load_defaults = lambda *_a, **_kw: {
        "suno": {"enabled": False},
        "bookend": {"enabled": True},
    }
    settings_mod.save_defaults = lambda *_a, **_kw: None
    settings_mod.DEFAULT_SETTINGS = {}
    settings_mod.resolve_settings = lambda *_a, **_kw: {}
    settings_mod.resolve_random_art_style = lambda s: (s, None)
    sys.modules["src.settings"] = settings_mod

    suno_mod = types.ModuleType("src.suno")
    async def _submit(*_a, **_kw): return "fake-task-id"
    suno_mod.submit_song = _submit
    suno_mod.read_concept_data = lambda *_a, **_kw: {}
    sys.modules["src.suno"] = suno_mod

    storage_mod = types.ModuleType("src.storage")
    storage_mod.STORAGE_MODE = "local"
    storage_mod.create_job_workspace = lambda user_id, deck_id: Path("/tmp") / deck_id
    storage_mod.get_job_workspace_path = lambda user_id, deck_id: Path("/tmp") / deck_id
    storage_mod.get_workspace_root = lambda: Path("/tmp")
    sys.modules["src.storage"] = storage_mod


def test_two_concurrent_workers_drain_three_words_with_counter_correctness():
    _install_stubs()
    from src.orchestration.upstream_worker import UpstreamWorker

    sb = FakeSupabase()
    sb.add_job(status="processing")

    words = []
    for i in range(3):
        w = sb.add_word(
            id=f"w-{i}",
            current_stage="pending",
            word_slug=f"w-{i}",
            stage_attempts=0,
            total_stage_attempts=0,
        )
        words.append(w)

    upstream_q = asyncio.Queue(maxsize=3)
    video_q = asyncio.Queue(maxsize=3)

    async def _main():
        workers = [
            UpstreamWorker(sb, upstream_queue=upstream_q, video_queue=video_q)
            for _ in range(2)
        ]
        # Push all three before starting workers — ensures workers actually
        # contend on queue.get().
        for w in words:
            await upstream_q.put(dict(w))

        tasks = [asyncio.create_task(w.run()) for w in workers]

        deadline = asyncio.get_event_loop().time() + 5
        while video_q.qsize() < 3 and asyncio.get_event_loop().time() < deadline:
            await asyncio.sleep(0.05)

        for w in workers:
            w.stop()
        await asyncio.wait_for(
            asyncio.gather(*tasks, return_exceptions=True), timeout=3.0,
        )

    asyncio.new_event_loop().run_until_complete(_main())

    # All three words handed off to the video queue
    assert video_q.qsize() == 3
    assert all(w["current_stage"] == "video_queued" for w in sb._tables["words"])

    # MED-7: attempt counters verify CRIT-1 atomicity did not regress.
    # Each word entered 3 stages (images/concept/song) exactly once, so
    # total_stage_attempts must equal 3 per word. stage_attempts shows 0
    # because transitioning song -> video_queued uses increment_attempts=False.
    for w in sb._tables["words"]:
        assert w["total_stage_attempts"] == 3, (
            f"word={w['id']} total_stage_attempts={w['total_stage_attempts']} "
            f"expected=3 (CRIT-1 atomic counter regression)"
        )
        assert w["stage_attempts"] == 0, (
            f"word={w['id']} stage_attempts={w['stage_attempts']} expected=0 "
            "(video_queued is a non-counting transition)"
        )


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
