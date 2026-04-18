"""Startup recovery pass.

Design ref: §8.3.

Runs synchronously before feeder/workers/dispatcher start. Overflow handled
by §6.1 Source 3.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

from . import state

log = logging.getLogger(__name__)


# (revert_to_stage, reset_attempts, queue_kind)
# queue_kind ∈ {"upstream", "video", "post_video", None}.
_RECOVERY_ACTIONS: dict[str, tuple[Optional[str], bool, Optional[str]]] = {
    # pending at crash: no action. Feeder Source 3 picks it up.
    "pending":           (None,                True,  None),
    "enrichment":        ("pending",           True,  None),      # job revert below
    "images":            ("pending",           True,  "upstream"),
    "concept":           ("pending",           True,  "upstream"),
    "song":              ("pending",           True,  "upstream"),
    "video_queued":      (None,                False, "video"),
    "video":             ("video_queued",      True,  "video"),
    "post_video_queued": (None,                False, "post_video"),
    "assembly":          ("post_video_queued", True,  "post_video"),
    "bookend":           ("post_video_queued", True,  "post_video"),
    "suno_bake":         ("post_video_queued", True,  "post_video"),
    "uploading":         ("post_video_queued", True,  "post_video"),
    # MED-5: cancelling at crash finalizes to cancelled. User's intent was
    # to cancel; nothing to resume.
    "cancelling":        ("cancelled",         False, None),
    # terminal — no action
    "complete":          (None, False, None),
    "failed":            (None, False, None),
    "cancelled":         (None, False, None),
}


async def _revert_enrichment_jobs(sb) -> None:
    """For any generation_job in processing whose words are in enrichment,
    revert the words to pending and flip the job back to approved. Feeder
    Source 1 will re-run bootstrap.
    """
    def _read_jobs():
        return (
            sb.table("generation_jobs")
              .select("id, deck_id")
              .eq("status", "processing")
              .execute()
        )
    resp = await asyncio.to_thread(_read_jobs)
    jobs = list(getattr(resp, "data", None) or [])

    for job in jobs:
        job_id = job["id"]
        deck_id = job.get("deck_id")

        def _read_words():
            return (
                sb.table("words")
                  .select("id, current_stage")
                  .eq("deck_id", deck_id)
                  .eq("current_stage", "enrichment")
                  .execute()
            )
        wresp = await asyncio.to_thread(_read_words)
        stuck = list(getattr(wresp, "data", None) or [])
        if not stuck:
            continue

        log.info(
            "recovery: reverting %d words enrichment -> pending (deck=%s job=%s)",
            len(stuck), deck_id, job_id,
        )

        def _revert_words():
            return (
                sb.table("words")
                  .update({
                      "current_stage": "pending",
                      "status": "pending",
                      "stage_attempts": 0,
                  })
                  .eq("deck_id", deck_id)
                  .eq("current_stage", "enrichment")
                  .execute()
            )
        try:
            await asyncio.to_thread(_revert_words)
        except Exception as e:
            log.warning("recovery: enrichment revert failed deck=%s: %s", deck_id, e)
            continue

        def _revert_job():
            return (
                sb.table("generation_jobs")
                  .update({
                      "status": "approved",
                      "error_message": "recovered from enrichment mid-crash",
                  })
                  .eq("id", job_id)
                  .eq("status", "processing")
                  .execute()
            )
        try:
            await asyncio.to_thread(_revert_job)
        except Exception as e:
            log.warning("recovery: job revert failed %s: %s", job_id, e)


async def _revert_active_words(sb) -> dict[str, list[dict[str, Any]]]:
    """Revert active-stage words and return reverted rows grouped by queue kind.

    Returns dict {"upstream": [...], "video": [...], "post_video": [...]}.
    """
    active_stages = [s for s in _RECOVERY_ACTIONS.keys()
                     if s not in ("complete", "failed", "cancelled")]

    def _read():
        return (
            sb.table("words")
              .select("*")
              .in_("current_stage", active_stages)
              .execute()
        )

    resp = await asyncio.to_thread(_read)
    words = list(getattr(resp, "data", None) or [])

    grouped: dict[str, list[dict[str, Any]]] = {
        "upstream": [],
        "video": [],
        "post_video": [],
    }

    for word in words:
        stage = word.get("current_stage")
        action = _RECOVERY_ACTIONS.get(stage)
        if action is None:
            continue
        revert_to, reset_attempts, queue_kind = action
        if stage == "enrichment":
            continue  # Handled in _revert_enrichment_jobs

        if revert_to is not None and revert_to != stage:
            update = {
                "current_stage": revert_to,
                "status": state.map_stage_to_status(revert_to),
            }
            if reset_attempts:
                update["stage_attempts"] = 0
            word_id = word["id"]

            def _do(u=update, wid=word_id, s=stage):
                return (
                    sb.table("words")
                      .update(u)
                      .eq("id", wid)
                      .eq("current_stage", s)
                      .execute()
                )
            try:
                await asyncio.to_thread(_do)
                word["current_stage"] = revert_to
            except Exception as e:
                log.warning(
                    "recovery: revert %s -> %s failed for %s: %s",
                    stage, revert_to, word_id, e,
                )
                continue

        if queue_kind:
            grouped[queue_kind].append(word)

    return grouped


async def _push_up_to_capacity(
    queue: asyncio.Queue,
    items: list[dict[str, Any]],
    *,
    kind: str,
) -> int:
    pushed = 0
    for item in items:
        if queue.full():
            log.info(
                "recovery: %s queue at capacity (%d pushed, %d overflow -> Source 3)",
                kind, pushed, len(items) - pushed,
            )
            break
        try:
            queue.put_nowait(item)
            pushed += 1
        except asyncio.QueueFull:
            break
    if pushed > 0:
        log.info("recovery: pushed %d words onto %s queue", pushed, kind)
    return pushed


async def run_recovery_pass(
    sb,
    *,
    upstream_queue: asyncio.Queue,
    video_queue: asyncio.Queue,
    post_video_queue: asyncio.Queue,
) -> None:
    """Run the §8.3 startup recovery pass synchronously."""
    log.info("recovery: starting pass")

    try:
        await _revert_enrichment_jobs(sb)
    except Exception as e:
        log.error("recovery: enrichment revert failed: %s", e, exc_info=True)

    try:
        grouped = await _revert_active_words(sb)
    except Exception as e:
        log.error("recovery: active-word revert failed: %s", e, exc_info=True)
        grouped = {"upstream": [], "video": [], "post_video": []}

    await _push_up_to_capacity(upstream_queue, grouped["upstream"], kind="upstream")
    await _push_up_to_capacity(video_queue, grouped["video"], kind="video")
    await _push_up_to_capacity(post_video_queue, grouped["post_video"], kind="post_video")

    log.info("recovery: pass complete")
