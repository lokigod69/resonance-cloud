"""Tests for downstream worker generation_job_id ownership."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration.downstream_worker import DownstreamWorker  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def test_downstream_reads_profile_and_bumps_word_owned_job():
    sb = FakeSupabase()
    owned = sb.add_job(
        id="job-owned",
        deck_id="deck-1",
        status="processing",
        profile_used="owned-profile",
        words_completed=2,
        created_at="2026-04-18T00:00:00+00:00",
    )
    newer_same_deck = sb.add_job(
        id="job-newer",
        deck_id="deck-1",
        status="processing",
        profile_used="newer-profile",
        words_completed=7,
        created_at="2026-04-19T00:00:00+00:00",
    )
    word = sb.add_word(
        id="word-1",
        deck_id="deck-1",
        generation_job_id=owned["id"],
    )
    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))

    assert _run(worker._read_profile_used(dict(word))) == "owned-profile"
    _run(worker._bump_job_words_completed(dict(word)))

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert jobs[owned["id"]]["words_completed"] == 3
    assert jobs[newer_same_deck["id"]]["words_completed"] == 7


def test_downstream_legacy_null_generation_job_id_uses_latest_processing_deck_job():
    sb = FakeSupabase()
    older = sb.add_job(
        id="job-older",
        deck_id="deck-1",
        status="processing",
        profile_used="older-profile",
        words_completed=2,
        created_at="2026-04-18T00:00:00+00:00",
    )
    latest = sb.add_job(
        id="job-latest",
        deck_id="deck-1",
        status="processing",
        profile_used="latest-profile",
        words_completed=7,
        created_at="2026-04-19T00:00:00+00:00",
    )
    word = sb.add_word(
        id="word-legacy",
        deck_id="deck-1",
        generation_job_id=None,
    )
    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))

    assert _run(worker._read_profile_used(dict(word))) == "latest-profile"
    _run(worker._bump_job_words_completed(dict(word)))

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert jobs[older["id"]]["words_completed"] == 2
    assert jobs[latest["id"]]["words_completed"] == 8
