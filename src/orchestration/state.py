"""Atomic guarded state transitions for the `words` table.

All transitions route through Postgres RPC functions defined in
`orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql`:

  transition_word_stage  - guarded transition with cancelling exclusion and
                           atomic stage_attempts/total_stage_attempts update
                           (§14.1; replaces v0 two-trip read-modify-write that
                           could lose counter increments under concurrency).
  mark_word_failed       - terminal failure guarded by current_stage != 'failed'
                           (§7.5 refund-once-per-failure).
  claim_retry_word       - retry claim guarded by retry_requested=true AND
                           current_stage IN terminal states (CRIT-4 prevents
                           a live word from being rewritten if its
                           retry_requested flag is accidentally set).

All calls are wrapped in ``asyncio.to_thread`` so the orchestrator event loop
keeps draining queues (§6.6).
"""

from __future__ import annotations

import asyncio
import contextvars
import json
import logging
import time
from dataclasses import dataclass, field
from typing import Any, Iterable, Optional

log = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Correlation-ID plumbing (§13)
# ---------------------------------------------------------------------------

_word_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "orch_word_id", default=None,
)
_stage_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar(
    "orch_stage", default=None,
)


def set_log_context(word_id: Optional[str] = None, stage: Optional[str] = None) -> None:
    if word_id is not None:
        _word_id_ctx.set(word_id)
    if stage is not None:
        _stage_ctx.set(stage)


def clear_log_context() -> None:
    _word_id_ctx.set(None)
    _stage_ctx.set(None)


class CorrelationFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        record.word_id = _word_id_ctx.get() or "-"
        record.stage = _stage_ctx.get() or "-"
        return True


def install_correlation_filter(logger: Optional[logging.Logger] = None) -> None:
    """Attach CorrelationFilter to every handler on the target logger (or root)."""
    target = logger if logger is not None else logging.getLogger()
    # Attach to root logger itself so records get attributes at record creation.
    target.addFilter(CorrelationFilter())
    for handler in target.handlers:
        handler.addFilter(CorrelationFilter())


# ---------------------------------------------------------------------------
# Status mapping (§17.1)
# ---------------------------------------------------------------------------

_PROCESSING_STAGES = {
    "images", "concept", "song",
    "video_queued", "video",
    "post_video_queued", "assembly", "bookend", "suno_bake", "uploading",
    "cancelling",
}

_PENDING_STAGES = {"pre_bootstrap", "pending", "enrichment"}


def map_stage_to_status(stage: str) -> str:
    if stage in _PENDING_STAGES:
        return "pending"
    if stage in _PROCESSING_STAGES:
        return "processing"
    if stage == "complete":
        return "complete"
    if stage == "failed":
        return "failed"
    if stage == "cancelled":
        return "failed"  # §17.1 v1 shortcut
    return "processing"


# ---------------------------------------------------------------------------
# StageTimer — per-word duration tracking (§13)
# ---------------------------------------------------------------------------

@dataclass
class StageTimer:
    word_id: str
    entries: dict[str, float] = field(default_factory=dict)
    attempts: dict[str, int] = field(default_factory=dict)

    def enter(self, stage: str) -> None:
        self.entries[stage] = time.monotonic()
        self.attempts[stage] = self.attempts.get(stage, 0) + 1

    def durations_ms(self) -> dict[str, int]:
        now = time.monotonic()
        out: dict[str, int] = {}
        entries = list(self.entries.items())
        for i, (stage, start) in enumerate(entries):
            end = entries[i + 1][1] if i + 1 < len(entries) else now
            out[stage] = int((end - start) * 1000)
        return out


_stage_timers: dict[str, StageTimer] = {}
_stage_timers_lock = asyncio.Lock() if False else None  # placeholder; timers are asyncio-coop


def timer_for(word_id: str) -> StageTimer:
    t = _stage_timers.get(word_id)
    if t is None:
        t = StageTimer(word_id=word_id)
        _stage_timers[word_id] = t
    return t


def drop_timer(word_id: str) -> Optional[StageTimer]:
    return _stage_timers.pop(word_id, None)


def active_timer_count() -> int:
    """Diagnostic: how many StageTimers are currently tracked (memory-leak canary)."""
    return len(_stage_timers)


# ---------------------------------------------------------------------------
# Low-level RPC helpers
# ---------------------------------------------------------------------------

def _rowcount(resp: Any) -> int:
    data = getattr(resp, "data", None)
    if data is None:
        return 0
    if isinstance(data, list):
        return len(data)
    return 1


async def _execute(sb_call) -> Any:
    return await asyncio.to_thread(sb_call)


# ---------------------------------------------------------------------------
# Public: atomic transitions (RPC-backed)
# ---------------------------------------------------------------------------

async def transition_stage(
    sb,
    word_id: str,
    *,
    new_stage: str,
    allowed_prior: Iterable[str],
    increment_attempts: bool = False,
    extra: Optional[dict[str, Any]] = None,
) -> bool:
    """Single-UPDATE atomic transition via `transition_word_stage` RPC.

    Returns True iff the transition landed (rowcount=1). Returns False if the
    word is in `cancelling`, in an unexpected prior state, or was beaten by a
    replica.

    Args:
      new_stage:          destination stage.
      allowed_prior:      allowed current_stage values (pass a list). To allow
                          idempotent re-entry (e.g., recovery left the word at
                          new_stage), include new_stage in this list
                          explicitly — there is no implicit admission.
      increment_attempts: True at stage-entry or retry-start (§4.1). Gates BOTH
                          stage_attempts (cross-stage entry becomes 1; same-stage
                          re-entry bumps in place via the SAME UPDATE — no
                          read-modify-write) AND total_stage_attempts. When
                          False, stage_attempts resets to 0 but
                          total_stage_attempts does not advance.
      extra:              additional column updates packed into the same RPC
                          call. Supported keys: music_state, suno_task_id,
                          suno_audio_url, failed_stage.
    """
    allowed_list = list(allowed_prior)
    params = {
        "p_word_id": word_id,
        "p_allowed_prior_stages": allowed_list,
        "p_new_stage": new_stage,
        "p_new_status": map_stage_to_status(new_stage),
        "p_increment_attempts": bool(increment_attempts),
        "p_additional_updates": extra or {},
    }

    def _do():
        return sb.rpc("transition_word_stage", params).execute()

    try:
        resp = await _execute(_do)
    except Exception as e:
        log.error(
            "transition_stage RPC failed (word=%s new=%s allowed=%s): %s",
            word_id, new_stage, allowed_list, e,
        )
        return False

    result = getattr(resp, "data", None)
    ok = bool(result)
    if not ok:
        log.warning(
            "transition_stage rejected (word=%s new=%s allowed=%s) "
            "— word may be cancelling or in unexpected prior state",
            word_id, new_stage, allowed_list,
        )
    return ok


async def mark_failed(
    sb,
    word_id: str,
    *,
    failed_stage: str,
) -> bool:
    """Atomic terminal failure (§7.5) via `mark_word_failed` RPC.

    Returns True iff this replica owns the failure (safe to refund_credit).
    """
    def _do():
        return sb.rpc("mark_word_failed", {
            "p_word_id": word_id,
            "p_failed_stage": failed_stage,
        }).execute()

    try:
        resp = await _execute(_do)
    except Exception as e:
        log.error("mark_failed RPC failed (word=%s): %s", word_id, e)
        return False
    return bool(getattr(resp, "data", None))


async def claim_retry(
    sb,
    word_id: str,
    *,
    target_stage: str,
) -> bool:
    """Claim a retry-flagged word via `claim_retry_word` RPC.

    Guards:
      - retry_requested = true (replica-overlap idempotency, §6.1 Source 2)
      - current_stage IN ('failed','complete','cancelled') (CRIT-4: prevents
        rewriting a live word whose retry flag is accidentally set)

    Resets stage_attempts to 0 AND bumps total_stage_attempts atomically per
    §4.1 (retry-start counts as a stage entry).

    Returns True iff the claim landed (rowcount=1).
    """
    def _do():
        return sb.rpc("claim_retry_word", {
            "p_word_id": word_id,
            "p_target_stage": target_stage,
            "p_target_status": map_stage_to_status(target_stage),
        }).execute()

    try:
        resp = await _execute(_do)
    except Exception as e:
        log.error("claim_retry RPC failed (word=%s): %s", word_id, e)
        return False
    return bool(getattr(resp, "data", None))


async def mark_music_state(
    sb,
    word_id: str,
    *,
    music_state: str,
    expected_stages: Optional[Iterable[str]] = None,
) -> bool:
    """Update music_state atomically, optionally guarded by current_stage.

    For standalone music_state changes only. Transitions that also need to
    change current_stage should pack music_state into transition_stage(extra=).
    """
    def _do():
        q = sb.table("words").update({"music_state": music_state}).eq("id", word_id)
        if expected_stages is not None:
            q = q.in_("current_stage", list(expected_stages))
        return q.execute()

    try:
        resp = await _execute(_do)
    except Exception as e:
        log.error("mark_music_state failed (word=%s): %s", word_id, e)
        return False
    return _rowcount(resp) >= 1


# ---------------------------------------------------------------------------
# Row reads
# ---------------------------------------------------------------------------

async def fetch_word(sb, word_id: str) -> Optional[dict[str, Any]]:
    def _do():
        return sb.table("words").select("*").eq("id", word_id).single().execute()
    try:
        r = await _execute(_do)
    except Exception as e:
        log.warning("fetch_word(%s) failed: %s", word_id, e)
        return None
    return getattr(r, "data", None)


async def fetch_words_by_stage(
    sb,
    stages: Iterable[str],
    *,
    processing_jobs_only: bool = True,
) -> list[dict[str, Any]]:
    """Return words whose current_stage is in `stages`.

    With processing_jobs_only=True (the §6.1 Source 3 contract), filter to
    words whose parent deck has at least one generation_job with
    status='processing'.
    """
    stage_list = list(stages)

    def _do_jobs():
        return (
            sb.table("generation_jobs")
              .select("deck_id")
              .eq("status", "processing")
              .execute()
        )

    def _do_words(deck_ids: list[str]):
        q = sb.table("words").select("*").in_("current_stage", stage_list)
        if processing_jobs_only:
            if not deck_ids:
                return None
            q = q.in_("deck_id", deck_ids)
        return q.execute()

    if processing_jobs_only:
        jobs_resp = await _execute(_do_jobs)
        deck_ids = sorted({
            row["deck_id"] for row in (getattr(jobs_resp, "data", None) or [])
            if row.get("deck_id")
        })
        if not deck_ids:
            return []
        words_resp = await _execute(lambda: _do_words(deck_ids))
    else:
        words_resp = await _execute(lambda: _do_words([]))
    if words_resp is None:
        return []
    return list(getattr(words_resp, "data", None) or [])
