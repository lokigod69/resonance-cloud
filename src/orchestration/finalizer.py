"""Job + deck finalizer.

Design ref: §6.5

Polls every 30s. For each generation_job in processing, counts word states
for its deck. If all words are terminal:
  all complete -> job complete
  all failed/cancelled -> job failed
  mixed -> job partial
Also updates decks.status.

Finalizer is the sole writer that moves generation_jobs out of 'processing'.
Feeder may flip a terminal job back to 'processing' on retry pickup (§6.1 S2).
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any

log = logging.getLogger(__name__)


POLL_INTERVAL = 30.0

_TERMINAL_WORD_STAGES = {"complete", "failed", "cancelled"}


class Finalizer:
    def __init__(self, sb, *, poll_interval: float = POLL_INTERVAL):
        self.sb = sb
        self.poll_interval = poll_interval
        self._stopped = asyncio.Event()

    def stop(self) -> None:
        self._stopped.set()

    @property
    def stopped(self) -> bool:
        return self._stopped.is_set()

    async def run(self) -> None:
        log.info("finalizer: starting (interval=%.1fs)", self.poll_interval)
        while not self._stopped.is_set():
            try:
                await self._poll_once()
            except Exception as e:
                log.error("finalizer: pass failed: %s", e, exc_info=True)
            try:
                await asyncio.wait_for(
                    self._stopped.wait(), timeout=self.poll_interval,
                )
            except asyncio.TimeoutError:
                pass
        log.info("finalizer: stopped")

    async def _poll_once(self) -> None:
        def _read_jobs():
            return (
                self.sb.table("generation_jobs")
                  .select("id, deck_id")
                  .eq("status", "processing")
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_read_jobs)
        except Exception as e:
            log.warning("finalizer: jobs read failed: %s", e)
            return

        jobs = list(getattr(resp, "data", None) or [])
        for job in jobs:
            await self._maybe_finalize_job(job)

    async def _maybe_finalize_job(self, job: dict[str, Any]) -> None:
        job_id = job["id"]
        deck_id = job.get("deck_id")
        if not deck_id:
            return

        def _read_words():
            return (
                self.sb.table("words")
                  .select("current_stage, status")
                  .eq("deck_id", deck_id)
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_read_words)
        except Exception as e:
            log.warning("finalizer: words read failed deck=%s: %s", deck_id, e)
            return

        words = list(getattr(resp, "data", None) or [])
        if not words:
            return

        stages = [w.get("current_stage") for w in words]
        statuses = [w.get("status") for w in words]

        # If some rows have NULL current_stage (legacy / not yet backfilled),
        # fall back to status for those.
        effective = []
        for stage, status in zip(stages, statuses):
            if stage is None:
                effective.append(status or "pending")
            else:
                effective.append(stage)

        if not all(s in _TERMINAL_WORD_STAGES for s in effective):
            return  # still work in flight

        completed = sum(1 for s in effective if s == "complete")
        failed_or_cancelled = sum(
            1 for s in effective if s in ("failed", "cancelled")
        )
        total = len(effective)

        if completed == total:
            final_status = "complete"
        elif completed > 0:
            final_status = "partial"
        else:
            final_status = "failed"

        # Atomic job finalization guarded by status='processing'
        def _do_job():
            return (
                self.sb.table("generation_jobs")
                  .update({
                      "status": final_status,
                      "words_completed": completed,
                      "words_failed": failed_or_cancelled,
                      "completed_at": datetime.now(timezone.utc).isoformat(),
                  })
                  .eq("id", job_id)
                  .eq("status", "processing")
                  .execute()
            )
        try:
            jresp = await asyncio.to_thread(_do_job)
        except Exception as e:
            log.warning("finalizer: job update failed %s: %s", job_id, e)
            return

        if not (getattr(jresp, "data", None) or []):
            # Another replica beat us, or feeder flipped it during a retry.
            return

        log.info(
            "finalizer: job=%s deck=%s -> %s (completed=%d failed=%d total=%d)",
            job_id, deck_id, final_status, completed, failed_or_cancelled, total,
        )

        # Update deck status based on ALL deck words
        if all(s == "complete" for s in effective):
            deck_status = "complete"
        elif any(s == "complete" for s in effective):
            deck_status = "partial"
        else:
            deck_status = "failed"

        def _do_deck():
            return (
                self.sb.table("decks")
                  .update({"status": deck_status})
                  .eq("id", deck_id)
                  .execute()
            )
        try:
            await asyncio.to_thread(_do_deck)
        except Exception as e:
            log.warning("finalizer: deck update failed %s: %s", deck_id, e)
