"""Retry budgets + refund helper.

Design refs:
- §2.5 video: 2 attempts
- §2.6 non-video: 3 attempts; infrastructure crashes don't consume budget
- §7.1 backoff: constant 5s
- §7.5 refund via atomic terminal transition
"""

from __future__ import annotations

import asyncio
import logging
from typing import Optional

from . import state

log = logging.getLogger(__name__)


STAGE_BUDGETS: dict[str, int] = {
    "images": 3,
    "pending_image": 3,
    "concept": 3,
    "song": 3,
    "video": 2,
    "assembly": 3,
    "bookend": 3,
    "suno_bake": 3,
    "uploading": 3,
}

RETRY_BACKOFF_SECONDS = 5.0


def total_budget(stage: str) -> int:
    return STAGE_BUDGETS.get(stage, 3)


async def backoff() -> None:
    await asyncio.sleep(RETRY_BACKOFF_SECONDS)


async def finalize_failure(
    sb,
    *,
    word_id: str,
    user_id: str,
    failed_stage: str,
    error_message: Optional[str] = None,
    expected_operation_id: Optional[str] = None,
) -> bool:
    """Atomically own terminal failure and refund its active charge operation.

    Returns True iff this replica owned the failure. Refund eligibility and the
    exactly-once credit update are resolved inside the same database transaction.
    """
    def _finalize():
        return sb.rpc("mark_word_failed_and_refund", {
            "p_word_id": word_id,
            "p_failed_stage": failed_stage,
            "p_error_message": error_message,
            "p_expected_operation_id": expected_operation_id,
        }).execute()

    try:
        response = await asyncio.to_thread(_finalize)
        result = response.data
        if isinstance(result, list):
            result = result[0] if result else None
        owned = bool(isinstance(result, dict) and result.get("owned") is True)
    except Exception as e:
        log.error("finalize_failure: atomic failure/refund failed for %s: %s", word_id, e)
        return False

    if not owned:
        log.info(
            "finalize_failure: %s already marked failed by another replica",
            word_id,
        )
        return False

    log.info(
        "finalize_failure: atomically finalized/refund-settled user=%s word=%s (%s)",
        user_id, word_id, failed_stage,
    )

    return True


class BudgetExhausted(Exception):
    """Raised when a stage's retry budget runs out."""


class RetryReleased(Exception):
    """Raised when a retry bump is rejected and the worker must release the word."""


async def bump_same_stage_or_release(
    sb,
    *,
    word_id: str,
    stage: str,
    logger: Optional[logging.Logger] = None,
) -> bool:
    """Attempt a same-stage retry bump.

    Returns True iff the guarded RPC landed. False means this replica no longer
    owns the word (cancel/race) and should stop work immediately.
    """
    target_log = logger or log
    bumped = await state.transition_stage(
        sb, word_id,
        new_stage=stage,
        allowed_prior=[stage],
        increment_attempts=True,
    )
    if not bumped:
        target_log.info(
            "retry bump rejected (cancel or race); releasing word=%s stage=%s",
            word_id, stage,
        )
        return False
    return True


async def run_stage_with_budget(
    *,
    stage: str,
    run_once,
    on_retry: Optional[callable] = None,
    bump_attempt_counter: Optional[callable] = None,
    start_attempt: int = 1,
    terminal_exceptions: tuple[type[BaseException], ...] = (),
) -> None:
    """Run `run_once` with constant backoff, bounded by the stage budget.

    run_once:               async callable(). Raises on failure.
    on_retry:               optional async (attempt, error) hook run before
                            each retry (not before the first attempt).
    bump_attempt_counter:   optional async hook to bump stage_attempts AND
                            total_stage_attempts before each retry.
    start_attempt:          1 by default; recovery may resume higher.
    """
    budget = total_budget(stage)
    last_exc: Optional[Exception] = None
    for attempt in range(start_attempt, budget + 1):
        if attempt > start_attempt:
            await backoff()
            if on_retry is not None:
                try:
                    await on_retry(attempt, last_exc)
                except Exception as e:
                    log.warning("on_retry hook failed: %s", e)
            if bump_attempt_counter is not None:
                try:
                    should_continue = await bump_attempt_counter()
                    if should_continue is False:
                        raise RetryReleased(
                            f"stage={stage} retry bump rejected; release word"
                        )
                except Exception as e:
                    if isinstance(e, RetryReleased):
                        raise
                    log.warning("bump_attempt_counter failed: %s", e)

        try:
            await run_once()
            return
        except terminal_exceptions:
            raise
        except Exception as e:
            last_exc = e
            log.warning(
                "stage=%s attempt %d/%d failed: %s",
                stage, attempt, budget, e,
            )

    raise BudgetExhausted(
        f"stage={stage} exhausted {budget} attempts; last error: {last_exc}"
    ) from last_exc
