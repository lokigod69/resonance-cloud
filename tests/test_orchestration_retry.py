"""Tests for src.orchestration.retry — budget, backoff, refund."""

from __future__ import annotations

import asyncio
import sys
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import retry  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


# --------------------------------------------------------------------------
# Budgets (§7.1)
# --------------------------------------------------------------------------

def test_budgets_match_design():
    assert retry.total_budget("video") == 2
    assert retry.total_budget("images") == 3
    assert retry.total_budget("concept") == 3
    assert retry.total_budget("song") == 3
    assert retry.total_budget("assembly") == 3
    assert retry.total_budget("bookend") == 3
    assert retry.total_budget("suno_bake") == 3
    assert retry.total_budget("uploading") == 3


def test_pending_image_budget_is_three():
    assert retry.total_budget("pending_image") == 3


# --------------------------------------------------------------------------
# run_stage_with_budget
# --------------------------------------------------------------------------

def test_run_stage_with_budget_succeeds_on_first_attempt():
    calls = {"n": 0}
    async def _once():
        calls["n"] += 1

    async def _main():
        await retry.run_stage_with_budget(stage="images", run_once=_once)
    _run(_main())
    assert calls["n"] == 1


def test_run_stage_with_budget_recovers_on_second_attempt(monkeypatch):
    monkeypatch.setattr(retry, "RETRY_BACKOFF_SECONDS", 0.0)
    calls = {"n": 0}
    async def _once():
        calls["n"] += 1
        if calls["n"] < 2:
            raise RuntimeError("nope")

    bumps = {"n": 0}
    async def _bump():
        bumps["n"] += 1

    async def _main():
        await retry.run_stage_with_budget(
            stage="images", run_once=_once, bump_attempt_counter=_bump,
        )
    _run(_main())
    assert calls["n"] == 2
    assert bumps["n"] == 1  # bump fires once (before the second attempt)


def test_run_stage_with_budget_exhausts_after_budget(monkeypatch):
    monkeypatch.setattr(retry, "RETRY_BACKOFF_SECONDS", 0.0)
    calls = {"n": 0}
    async def _once():
        calls["n"] += 1
        raise RuntimeError("always broken")

    async def _main():
        try:
            await retry.run_stage_with_budget(stage="video", run_once=_once)
        except retry.BudgetExhausted:
            return True
        return False
    assert _run(_main()) is True
    # video budget = 2: initial + 1 auto-retry = exactly 2 attempts
    assert calls["n"] == 2


# --------------------------------------------------------------------------
# finalize_failure + refund
# --------------------------------------------------------------------------

def test_finalize_failure_refunds_once():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="video", user_id="u-42")

    first = _run(retry.finalize_failure(
        sb, word_id=word["id"], user_id="u-42", failed_stage="video",
    ))
    second = _run(retry.finalize_failure(
        sb, word_id=word["id"], user_id="u-42", failed_stage="video",
    ))

    assert first is True
    assert second is False

    refund_calls = [r for r in sb.rpc_calls if r[0] == "refund_credit"]
    assert len(refund_calls) == 1
    assert refund_calls[0][1] == {"user_id_param": "u-42"}


def test_bump_same_stage_or_release_returns_false_when_word_no_longer_owned():
    sb = FakeSupabase()
    word = sb.add_word(current_stage="cancelling", stage_attempts=1, total_stage_attempts=1)

    ok = _run(retry.bump_same_stage_or_release(
        sb, word_id=word["id"], stage="images",
    ))
    assert ok is False
    row = sb._tables["words"][0]
    assert row["current_stage"] == "cancelling"
    assert row["stage_attempts"] == 1
    assert row["total_stage_attempts"] == 1


def test_run_stage_with_budget_raises_retry_released_on_false_bump(monkeypatch):
    monkeypatch.setattr(retry, "RETRY_BACKOFF_SECONDS", 0.0)
    calls = {"n": 0}

    async def _once():
        calls["n"] += 1
        raise RuntimeError("broken")

    async def _bump():
        return False

    async def _main():
        try:
            await retry.run_stage_with_budget(
                stage="images",
                run_once=_once,
                bump_attempt_counter=_bump,
            )
        except retry.RetryReleased:
            return True
        return False

    assert _run(_main()) is True
    assert calls["n"] == 1


if __name__ == "__main__":
    failures = []
    import types
    class _M:
        def setattr(self, *_a, **_kw):
            setattr(*_a, **_kw) if len(_a) >= 3 else None
    # Trivial fallback so this can run without pytest.
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                if fn.__code__.co_argcount == 0:
                    fn()
                else:
                    fn(_M())
                print(f"PASS  {name}")
            except Exception as e:
                failures.append((name, e))
                print(f"FAIL  {name}: {e}")
    if failures:
        sys.exit(1)
