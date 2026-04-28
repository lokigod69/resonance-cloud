"""Tests for src.orchestration.recovery — startup recovery pass.

Covers every crash-state in §8.3:
  pending, enrichment, images/concept/song, video_queued, video,
  post_video_queued, assembly/bookend/suno_bake/uploading, terminal.
Also tests the push-up-to-capacity rule (overflow remains in Supabase for
Source 3 to pick up).
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import recovery  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _fresh_queues():
    return (
        asyncio.Queue(maxsize=3),
        asyncio.Queue(maxsize=2),
        asyncio.Queue(maxsize=8),
    )


def test_pending_words_not_pushed_by_recovery():
    """§8.3: pending at crash is 'no action'. Feeder Source 3 picks it up."""
    sb = FakeSupabase()
    sb.add_job(status="processing")
    sb.add_word(current_stage="pending")
    up, v, pv = _fresh_queues()

    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))
    assert up.qsize() == 0
    assert sb._tables["words"][0]["current_stage"] == "pending"


def test_enrichment_recovery_reverts_words_and_job():
    sb = FakeSupabase()
    job = sb.add_job(status="processing")
    sb.add_word(deck_id=job["deck_id"], current_stage="enrichment")

    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))

    w = sb._tables["words"][0]
    assert w["current_stage"] == "pending"
    assert w["stage_attempts"] == 0

    j = sb._tables["generation_jobs"][0]
    assert j["status"] == "approved"
    # Enrichment revert does NOT push to queue — feeder re-runs bootstrap.
    assert up.qsize() == 0


def test_enrichment_recovery_reverts_only_words_owned_by_processing_job():
    sb = FakeSupabase()
    job = sb.add_job(id="job-1", deck_id="deck-1", status="processing")
    other = sb.add_job(id="job-2", deck_id="deck-1", status="approved")
    owned = sb.add_word(
        id="owned",
        deck_id="deck-1",
        generation_job_id=job["id"],
        current_stage="enrichment",
    )
    queued_other = sb.add_word(
        id="other",
        deck_id="deck-1",
        generation_job_id=other["id"],
        current_stage="enrichment",
    )

    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))

    rows = {row["id"]: row for row in sb._tables["words"]}
    assert rows[owned["id"]]["current_stage"] == "pending"
    assert rows[queued_other["id"]]["current_stage"] == "enrichment"
    assert sb._tables["generation_jobs"][0]["status"] == "approved"
    assert sb._tables["generation_jobs"][1]["status"] == "approved"


def test_upstream_stage_recovery_reverts_to_pending_and_pushes():
    sb = FakeSupabase()
    sb.add_job(status="processing")
    for stage in ("images", "concept", "song"):
        sb.add_word(current_stage=stage, stage_attempts=2)

    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))

    for row in sb._tables["words"]:
        assert row["current_stage"] == "pending"
        assert row["stage_attempts"] == 0
    assert up.qsize() == 3  # exactly the capacity


def test_video_recovery_reverts_to_video_queued_and_pushes():
    sb = FakeSupabase()
    sb.add_job(status="processing")
    sb.add_word(current_stage="video", stage_attempts=1)
    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))
    assert sb._tables["words"][0]["current_stage"] == "video_queued"
    assert v.qsize() == 1


def test_post_video_recovery_reverts_and_pushes():
    sb = FakeSupabase()
    sb.add_job(status="processing")
    for stage in ("assembly", "bookend", "suno_bake", "uploading"):
        sb.add_word(current_stage=stage, stage_attempts=2)
    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))
    for row in sb._tables["words"]:
        assert row["current_stage"] == "post_video_queued"
        assert row["stage_attempts"] == 0
    assert pv.qsize() == 4


def test_queued_states_not_reverted_only_pushed():
    """video_queued / post_video_queued don't need a stage change; they're
    already in their queued resting state."""
    sb = FakeSupabase()
    sb.add_job(status="processing")
    w1 = sb.add_word(current_stage="video_queued")
    w2 = sb.add_word(current_stage="post_video_queued")

    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))
    rows = {r["id"]: r for r in sb._tables["words"]}
    assert rows[w1["id"]]["current_stage"] == "video_queued"
    assert rows[w2["id"]]["current_stage"] == "post_video_queued"
    assert v.qsize() == 1
    assert pv.qsize() == 1


def test_overflow_stays_in_supabase_when_queue_full():
    """Push-up-to-capacity (§8.3): excess rows stay at their Supabase state
    for Source 3 to pick up later.

    Use `images` crash-state (which triggers a push) to exercise this rule.
    """
    sb = FakeSupabase()
    sb.add_job(status="processing")
    for _ in range(10):
        sb.add_word(current_stage="images")
    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))
    assert up.qsize() == 3  # capacity of upstream queue
    # All ten words reverted to pending — overflow awaits Source 3
    assert all(w["current_stage"] == "pending" for w in sb._tables["words"])


def test_cancelling_recovers_to_cancelled():
    """MED-5: a crash in 'cancelling' finalizes to 'cancelled'. Nothing to
    resume; user's intent was to cancel."""
    sb = FakeSupabase()
    sb.add_job(status="processing")
    word = sb.add_word(current_stage="cancelling", stage_attempts=1)

    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))
    assert sb._tables["words"][0]["current_stage"] == "cancelled"
    assert up.qsize() == v.qsize() == pv.qsize() == 0


def test_terminal_states_untouched():
    sb = FakeSupabase()
    sb.add_job(status="processing")
    complete = sb.add_word(current_stage="complete")
    failed = sb.add_word(current_stage="failed", failed_stage="images")
    cancelled = sb.add_word(current_stage="cancelled")

    up, v, pv = _fresh_queues()
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv,
    ))
    rows = {r["id"]: r for r in sb._tables["words"]}
    assert rows[complete["id"]]["current_stage"] == "complete"
    assert rows[failed["id"]]["current_stage"] == "failed"
    assert rows[cancelled["id"]]["current_stage"] == "cancelled"
    assert up.qsize() == v.qsize() == pv.qsize() == 0


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
