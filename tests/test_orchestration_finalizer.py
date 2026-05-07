"""Tests for per-job finalization ownership."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import feeder  # noqa: E402
from src.orchestration.finalizer import Finalizer  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_finalizer_completes_owned_job_while_next_job_pre_bootstrap_waits():
    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "deck-1", "status": "generating"})
    j1 = sb.add_job(id="job-1", deck_id="deck-1", status="processing")
    j2 = sb.add_job(id="job-2", deck_id="deck-1", status="approved")
    sb.add_word(
        id="word-1",
        deck_id="deck-1",
        generation_job_id=j1["id"],
        current_stage="complete",
        status="complete",
    )
    sb.add_word(
        id="word-2",
        deck_id="deck-1",
        generation_job_id=j2["id"],
        current_stage="pre_bootstrap",
        status="pending",
    )

    _run(Finalizer(sb)._maybe_finalize_job(dict(j1)))

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert jobs[j1["id"]]["status"] == "complete"
    assert jobs[j1["id"]]["words_completed"] == 1
    assert jobs[j1["id"]]["words_failed"] == 0
    assert jobs[j2["id"]]["status"] == "approved"
    assert sb._tables["words"][1]["current_stage"] == "pre_bootstrap"
    assert sb._tables["decks"][0]["status"] == "generating"


def test_finalizer_counts_only_owned_words_not_whole_deck():
    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "deck-1", "status": "generating"})
    job = sb.add_job(id="job-1", deck_id="deck-1", status="processing")
    other = sb.add_job(id="job-2", deck_id="deck-1", status="approved")
    sb.add_word(
        deck_id="deck-1",
        generation_job_id=job["id"],
        current_stage="complete",
        status="complete",
    )
    sb.add_word(
        deck_id="deck-1",
        generation_job_id=job["id"],
        current_stage="failed",
        status="failed",
    )
    sb.add_word(
        deck_id="deck-1",
        generation_job_id=other["id"],
        current_stage="complete",
        status="complete",
    )

    _run(Finalizer(sb)._maybe_finalize_job(dict(job)))

    row = next(r for r in sb._tables["generation_jobs"] if r["id"] == job["id"])
    assert row["status"] == "partial"
    assert row["words_completed"] == 1
    assert row["words_failed"] == 1


def test_finalizer_legacy_null_generation_job_id_falls_back_to_deck_scope():
    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "deck-1", "status": "generating"})
    job = sb.add_job(id="job-legacy", deck_id="deck-1", status="processing")
    sb.add_word(
        deck_id="deck-1",
        generation_job_id=None,
        current_stage="complete",
        status="complete",
    )

    _run(Finalizer(sb)._maybe_finalize_job(dict(job)))

    row = sb._tables["generation_jobs"][0]
    assert row["status"] == "complete"
    assert row["words_completed"] == 1
    assert sb._tables["decks"][0]["status"] == "complete"


def test_finalizer_fails_one_word_job_when_status_failed_but_stage_stuck_active():
    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "deck-1", "status": "generating"})
    job = sb.add_job(id="job-stuck", deck_id="deck-1", status="processing")
    sb.add_word(
        id="word-stuck",
        deck_id="deck-1",
        generation_job_id=job["id"],
        current_stage="pending_image",
        status="failed",
        failed_stage="pending_image",
    )

    _run(Finalizer(sb)._maybe_finalize_job(dict(job)))

    row = sb._tables["generation_jobs"][0]
    assert row["status"] == "failed"
    assert row["words_completed"] == 0
    assert row["words_failed"] == 1
    assert sb._tables["decks"][0]["status"] == "failed"


def test_same_deck_approved_job_can_start_after_prior_failed_card_job_finalizes():
    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "deck-1", "deck_type": "card", "status": "generating"})
    j1 = sb.add_job(id="job-1", deck_id="deck-1", status="processing")
    j2 = sb.add_job(id="job-2", deck_id="deck-1", status="approved")
    sb.add_word(
        id="word-failed",
        deck_id="deck-1",
        generation_job_id=j1["id"],
        current_stage="pending_image",
        status="failed",
        failed_stage="pending_image",
    )
    sb.add_word(
        id="word-waiting",
        deck_id="deck-1",
        generation_job_id=j2["id"],
        current_stage="pre_bootstrap",
        status="pending",
    )
    bootstrap_calls: list[str] = []

    async def _bootstrap(job):
        bootstrap_calls.append(job["id"])

    f = feeder.Feeder(
        sb,
        upstream_queue=asyncio.Queue(maxsize=8),
        video_queue=asyncio.Queue(maxsize=8),
        post_video_queue=asyncio.Queue(maxsize=8),
        card_queue=asyncio.Queue(maxsize=8),
        bootstrap=_bootstrap,
    )

    _run(Finalizer(sb)._maybe_finalize_job(dict(j1)))
    _run(f._source1_new_jobs())

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert jobs[j1["id"]]["status"] == "failed"
    assert jobs[j2["id"]]["status"] == "processing"
    assert bootstrap_calls == [j2["id"]]
