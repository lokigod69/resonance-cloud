"""Tests for src.orchestration.state — atomic guarded transitions via RPC.

Covers (against the upgraded fake_supabase that mirrors the SQL RPC
functions in 20260418_transition_rpc.sql):
- transition_stage: single UPDATE with counter increment atomic in one call
- transition_stage: cancelling guard enforced unconditionally (CRIT-1)
- transition_stage: strict by default (no implicit same-stage admission)
- transition_stage: opt-in idempotent re-entry by including new_stage in allowed_prior
- mark_failed: rowcount=1 exactly once across replicas (§7.5)
- claim_retry: fires only on retry_requested=true AND terminal current_stage (CRIT-4, HIGH-4)
- mark_music_state: guarded variant
- map_stage_to_status: §17.1 mapping
"""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import state  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# ---------------------------------------------------------------------------
# transition_stage via RPC
# ---------------------------------------------------------------------------

def test_transition_increments_counters_in_single_call():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="pending", stage_attempts=0, total_stage_attempts=0)

    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="images",
        allowed_prior=["pending"],
        increment_attempts=True,
    ))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["current_stage"] == "images"
    assert row["status"] == "processing"
    assert row["stage_attempts"] == 1
    assert row["total_stage_attempts"] == 1


def test_cross_stage_transition_resets_stage_attempts_to_first_attempt():
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="images",
        stage_attempts=2,
        total_stage_attempts=2,
    )

    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="concept",
        allowed_prior=["images"],
        increment_attempts=True,
    ))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["current_stage"] == "concept"
    assert row["stage_attempts"] == 1
    assert row["total_stage_attempts"] == 3


def test_same_stage_retry_reentry_increments_stage_attempts_in_place():
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="images",
        stage_attempts=1,
        total_stage_attempts=1,
    )

    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="images",
        allowed_prior=["images"],
        increment_attempts=True,
    ))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["current_stage"] == "images"
    assert row["stage_attempts"] == 2
    assert row["total_stage_attempts"] == 2


def test_stage_attempts_do_not_carry_retry_budget_across_stages():
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="images",
        stage_attempts=2,
        total_stage_attempts=2,
    )

    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="concept",
        allowed_prior=["images"],
        increment_attempts=True,
    ))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["stage_attempts"] == 1
    assert row["total_stage_attempts"] == 3

    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="concept",
        allowed_prior=["concept"],
        increment_attempts=True,
    ))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["stage_attempts"] == 2
    assert row["total_stage_attempts"] == 4


def test_transition_refuses_when_prior_not_allowed():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="concept")
    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="images",
        allowed_prior=["pending"],
        increment_attempts=True,
    ))
    assert ok is False
    assert sb._tables["words"][0]["current_stage"] == "concept"


def test_transition_strict_by_default():
    """CRIT-1 / replica-overlap regression: by default new_stage is NOT in
    allowed_prior. Word already at 'images' cannot be re-transitioned."""
    sb = FakeSupabase()
    word = sb.add_word(current_stage="images", total_stage_attempts=5)
    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="images",
        allowed_prior=["pending"],
        increment_attempts=True,
    ))
    assert ok is False
    assert sb._tables["words"][0]["current_stage"] == "images"
    assert sb._tables["words"][0]["total_stage_attempts"] == 5


def test_transition_idempotent_reentry_opt_in():
    """Idempotent re-entry is opt-in via explicit allowed_prior."""
    sb = FakeSupabase()
    word = sb.add_word(current_stage="images", total_stage_attempts=5)
    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="images",
        allowed_prior=["pending", "images"],
        increment_attempts=True,
    ))
    assert ok is True
    assert sb._tables["words"][0]["total_stage_attempts"] == 6


# ---------------------------------------------------------------------------
# CRIT-1: cancelling guard unconditionally blocks transitions
# ---------------------------------------------------------------------------

def test_transition_blocks_on_cancelling_even_when_in_allowed_prior():
    """Explicit CRIT-1 regression: even if a caller puts 'cancelling' in
    allowed_prior, the RPC's unconditional cancelling guard blocks the move."""
    sb = FakeSupabase()
    word = sb.add_word(current_stage="cancelling")
    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="images",
        # Pathological caller includes cancelling in allowed_prior:
        allowed_prior=["pending", "cancelling"],
        increment_attempts=True,
    ))
    assert ok is False
    assert sb._tables["words"][0]["current_stage"] == "cancelling"


def test_transition_cancelling_blocks_standard_call():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="cancelling")
    # Even the normal "images, allowed=[pending]" path cannot sneak past.
    ok = _run(state.transition_stage(
        sb, word["id"],
        new_stage="images",
        allowed_prior=["pending"],
        increment_attempts=True,
    ))
    assert ok is False


# ---------------------------------------------------------------------------
# CRIT-1: counter atomicity under concurrency
# ---------------------------------------------------------------------------

def test_concurrent_retry_bumps_preserve_total_stage_attempts():
    """N idempotent re-entries (allowed_prior includes new_stage) each bump
    total_stage_attempts by exactly 1. Counter cannot lose increments because
    the RPC does SET total_stage_attempts = total_stage_attempts + 1 in a
    single UPDATE (row-level atomic).
    """
    sb = FakeSupabase()
    word = sb.add_word(current_stage="images", total_stage_attempts=0)

    async def _one():
        return await state.transition_stage(
            sb, word["id"],
            new_stage="images",
            allowed_prior=["images"],
            increment_attempts=True,
        )

    async def _main():
        return await asyncio.gather(*(_one() for _ in range(10)))

    results = _run(_main())
    # Every call targets an allowed prior state that the row actually has,
    # so all ten must succeed (modelled as row-level atomic in the fake).
    assert all(r is True for r in results)
    assert sb._tables["words"][0]["total_stage_attempts"] == 10


# ---------------------------------------------------------------------------
# mark_failed
# ---------------------------------------------------------------------------

def test_mark_failed_fires_once_across_replica_overlap():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="images")
    first = _run(state.mark_failed(sb, word["id"], failed_stage="images"))
    second = _run(state.mark_failed(sb, word["id"], failed_stage="images"))
    assert first is True
    assert second is False
    assert sb._tables["words"][0]["current_stage"] == "failed"


# ---------------------------------------------------------------------------
# claim_retry — CRIT-4 + HIGH-4
# ---------------------------------------------------------------------------

def test_claim_retry_requires_terminal_current_stage():
    """CRIT-4 regression: a LIVE word (current_stage='images') with
    retry_requested=true accidentally set must NOT be claimed.
    """
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="images",                # live word
        retry_requested=True,
        retry_requested_at="2026-04-18T00:00:00+00:00",
    )
    ok = _run(state.claim_retry(sb, word["id"], target_stage="pending"))
    assert ok is False
    row = sb._tables["words"][0]
    assert row["current_stage"] == "images"    # unchanged
    assert row["retry_requested"] is True      # unchanged


def test_claim_retry_bumps_total_stage_attempts():
    """HIGH-4 regression: retry pickup increments total_stage_attempts."""
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="failed",
        failed_stage="video",
        retry_requested=True,
        stage_attempts=3,
        total_stage_attempts=3,
    )
    ok = _run(state.claim_retry(sb, word["id"], target_stage="video_queued"))
    assert ok is True
    row = sb._tables["words"][0]
    assert row["current_stage"] == "video_queued"
    assert row["retry_requested"] is False
    assert row["failed_stage"] is None
    assert row["stage_attempts"] == 0            # reset
    assert row["total_stage_attempts"] == 4      # bumped


def test_claim_retry_double_claim_second_loses():
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="complete",
        retry_requested=True,
        total_stage_attempts=7,
    )
    a = _run(state.claim_retry(sb, word["id"], target_stage="post_video_queued"))
    b = _run(state.claim_retry(sb, word["id"], target_stage="post_video_queued"))
    assert a is True
    assert b is False
    # Counter bumped exactly once — no lost increment, no double bump.
    assert sb._tables["words"][0]["total_stage_attempts"] == 8


# ---------------------------------------------------------------------------
# music_state guard
# ---------------------------------------------------------------------------

def test_mark_music_state_honors_expected_stages():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="pending", music_state="disabled")
    ok = _run(state.mark_music_state(
        sb, word["id"], music_state="submitted",
        expected_stages=["post_video_queued"],
    ))
    assert ok is False
    assert sb._tables["words"][0]["music_state"] == "disabled"

    ok = _run(state.mark_music_state(sb, word["id"], music_state="submitted"))
    assert ok is True
    assert sb._tables["words"][0]["music_state"] == "submitted"


# ---------------------------------------------------------------------------
# transition_stage extras merge (music_state packed with stage change)
# ---------------------------------------------------------------------------

def test_transition_packs_music_state_in_same_update():
    """§6.4 bake-failed fall-through: music_state + current_stage in ONE UPDATE."""
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
# fetch_words_by_stage -- per-job ownership with legacy fallback
# ---------------------------------------------------------------------------

def test_fetch_words_by_stage_uses_processing_job_ids_with_legacy_fallback():
    sb = FakeSupabase()
    processing = sb.add_job(id="job-processing", deck_id="deck-1", status="processing")
    approved = sb.add_job(id="job-approved", deck_id="deck-1", status="approved")
    other_processing = sb.add_job(id="job-other", deck_id="deck-2", status="processing")

    owned_live = sb.add_word(
        id="owned-live",
        deck_id=processing["deck_id"],
        generation_job_id=processing["id"],
        current_stage="pending",
    )
    sb.add_word(
        id="owned-approved",
        deck_id=approved["deck_id"],
        generation_job_id=approved["id"],
        current_stage="pending",
    )
    legacy_live = sb.add_word(
        id="legacy-live",
        deck_id=processing["deck_id"],
        generation_job_id=None,
        current_stage="pending",
    )
    pre_bootstrap = sb.add_word(
        id="pre-bootstrap",
        deck_id=other_processing["deck_id"],
        generation_job_id=other_processing["id"],
        current_stage="pre_bootstrap",
    )

    rows = _run(state.fetch_words_by_stage(
        sb, ("pending", "video_queued", "post_video_queued"),
        processing_jobs_only=True,
    ))

    row_ids = {row["id"] for row in rows}
    assert row_ids == {owned_live["id"], legacy_live["id"]}
    assert pre_bootstrap["id"] not in row_ids


# ---------------------------------------------------------------------------
# Status mapping (§17.1)
# ---------------------------------------------------------------------------

def test_status_mapping():
    assert state.map_stage_to_status("pre_bootstrap") == "pending"
    assert state.map_stage_to_status("pending") == "pending"
    assert state.map_stage_to_status("enrichment") == "pending"
    assert state.map_stage_to_status("images") == "processing"
    assert state.map_stage_to_status("video") == "processing"
    assert state.map_stage_to_status("post_video_queued") == "processing"
    assert state.map_stage_to_status("complete") == "complete"
    assert state.map_stage_to_status("failed") == "failed"
    assert state.map_stage_to_status("cancelled") == "failed"


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
