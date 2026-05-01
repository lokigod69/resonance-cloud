"""Observability helpers (§13).

Queue-depth + worker-active metrics, slow-stage detection, retry wait alerts.
"""

from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone
from typing import Any, Callable, Optional, Sequence

from . import state

log = logging.getLogger(__name__)

REPORT_INTERVAL = 60.0
SLOW_STAGE_THRESHOLDS_SECONDS = {
    "suno_bake": 300.0,
    "pending_image": 180.0,
}
RETRY_WAIT_ALERT_SECONDS = 30 * 60


class MetricsReporter:
    def __init__(
        self,
        sb,
        *,
        upstream_queue: asyncio.Queue,
        video_queue: asyncio.Queue,
        post_video_queue: asyncio.Queue,
        card_queue: asyncio.Queue,
        upstream_worker=None,            # UpstreamWorker instance or None
        video_dispatcher=None,           # VideoDispatcher instance or None
        card_workers: Sequence = (),
        downstream_workers: Sequence = (),
        interval: float = REPORT_INTERVAL,
    ):
        self.sb = sb
        self.upstream_queue = upstream_queue
        self.video_queue = video_queue
        self.post_video_queue = post_video_queue
        self.card_queue = card_queue
        self.upstream_worker = upstream_worker
        self.video_dispatcher = video_dispatcher
        self.card_workers = card_workers
        self.downstream_workers = downstream_workers
        self.interval = interval
        self._stopped = asyncio.Event()

    def stop(self) -> None:
        self._stopped.set()

    async def run(self) -> None:
        log.info("metrics: starting (interval=%.1fs)", self.interval)
        while not self._stopped.is_set():
            try:
                await self._report_once()
            except Exception as e:
                log.debug("metrics: report failed: %s", e)
            try:
                await asyncio.wait_for(
                    self._stopped.wait(), timeout=self.interval,
                )
            except asyncio.TimeoutError:
                pass
        log.info("metrics: stopped")

    async def _report_once(self) -> None:
        upstream_busy = bool(getattr(self.upstream_worker, "busy", False))
        video_active = int(getattr(self.video_dispatcher, "active", 0))
        downstream_busy = sum(
            1 for w in self.downstream_workers if bool(getattr(w, "busy", False))
        )
        card_busy = sum(
            1 for w in self.card_workers if bool(getattr(w, "busy", False))
        )

        log.info(
            "metrics: queues up=%d video=%d post_video=%d card=%d | "
            "active upstream=%d video=%d card=%d/%d downstream=%d/%d | "
            "stage_timers=%d",
            self.upstream_queue.qsize(),
            self.video_queue.qsize(),
            self.post_video_queue.qsize(),
            self.card_queue.qsize(),
            1 if upstream_busy else 0,
            video_active,
            card_busy,
            len(self.card_workers),
            downstream_busy,
            len(self.downstream_workers),
            state.active_timer_count(),
        )
        await self._report_retry_wait()
        await self._report_slow_stages(SLOW_STAGE_THRESHOLDS_SECONDS)

    async def _report_retry_wait(self) -> None:
        def _do():
            return (
                self.sb.table("words")
                  .select("id, retry_requested_at")
                  .eq("retry_requested", True)
                  .order("retry_requested_at")
                  .limit(1)
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_do)
        except Exception:
            return
        rows = list(getattr(resp, "data", None) or [])
        if not rows:
            return
        ts = rows[0].get("retry_requested_at")
        if not ts:
            return
        try:
            dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
        except ValueError:
            return
        age = (datetime.now(timezone.utc) - dt).total_seconds()
        if age >= RETRY_WAIT_ALERT_SECONDS:
            log.error("metrics: oldest retry waited %.0fs (>= %ds)",
                      age, RETRY_WAIT_ALERT_SECONDS)
        else:
            log.info("metrics: oldest retry age=%.0fs", age)

    async def _report_slow_stages(self, thresholds: dict[str, float]) -> None:
        now = datetime.now(timezone.utc)
        for stage, threshold in thresholds.items():
            def _do():
                return (
                    self.sb.table("words")
                      .select("id, stage_started_at")
                      .eq("current_stage", stage)
                      .execute()
                )
            try:
                resp = await asyncio.to_thread(_do)
            except Exception:
                continue
            rows = list(getattr(resp, "data", None) or [])
            for row in rows:
                ts = row.get("stage_started_at")
                if not ts:
                    continue
                try:
                    dt = datetime.fromisoformat(ts.replace("Z", "+00:00"))
                except ValueError:
                    continue
                age = (now - dt).total_seconds()
                if age >= threshold:
                    log.warning(
                        "metrics: word=%s stuck in %s %.0fs (>= %ds)",
                        row.get("id"), stage, age, threshold,
                    )
