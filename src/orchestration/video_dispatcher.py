"""Video dispatcher: single-pod, pool-ready.

Design refs:
- §6.3 video dispatcher
- §2.5 video budget 2 attempts
- §11 multi-pod seam (Semaphore(1) today, PodPool later)
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any

from . import retry, state

log = logging.getLogger(__name__)


class VideoDispatcher:
    def __init__(
        self,
        sb,
        *,
        video_queue: asyncio.Queue,
        post_video_queue: asyncio.Queue,
        concurrency: int = 1,
    ):
        self.sb = sb
        self.video_queue = video_queue
        self.post_video_queue = post_video_queue
        self.slot = asyncio.Semaphore(concurrency)
        self._concurrency = concurrency
        self._active = 0
        self._stopped = asyncio.Event()

    @property
    def active(self) -> int:
        """Metric: number of video dispatches in flight (§13 MED-3)."""
        return self._active

    def stop(self) -> None:
        self._stopped.set()

    async def run(self) -> None:
        log.info("video_dispatcher: starting (concurrency=%d)", self._concurrency)
        while not self._stopped.is_set():
            try:
                word = await asyncio.wait_for(self.video_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            try:
                await self._process_word(word)
            except Exception as e:
                log.error(
                    "video_dispatcher: unhandled error word=%s: %s",
                    word.get("id"), e, exc_info=True,
                )
            finally:
                self.video_queue.task_done()
        log.info("video_dispatcher: stopped")

    async def _process_word(self, word: dict[str, Any]) -> None:
        word_id = word["id"]
        state.set_log_context(word_id=word_id, stage="video_queued")

        async with self.slot:
            self._active += 1
            try:
                await self._process_claimed(word)
            finally:
                self._active -= 1

    async def _process_claimed(self, word: dict[str, Any]) -> None:
        word_id = word["id"]

        # §6.3: atomic claim `video_queued -> video`. Strict: new_stage NOT in
        # allowed_prior so a second replica loses on rowcount=0.
        claimed = await state.transition_stage(
            self.sb, word_id,
            new_stage="video",
            allowed_prior=["video_queued"],
            increment_attempts=True,
        )
        if not claimed:
            log.info(
                "video_dispatcher: word=%s claim failed (raced or cancelled)",
                word_id,
            )
            state.clear_log_context()
            return

        fresh = await state.fetch_word(self.sb, word_id)
        if fresh is None:
            log.warning("video_dispatcher: word=%s vanished", word_id)
            state.clear_log_context()
            return

        state.set_log_context(stage="video")
        state.timer_for(word_id).enter("video")

        from src.pipeline import run_stage
        from src.storage import get_job_workspace_path

        workspace_path = Path(word.get("_workspace_path") or "")
        if not workspace_path or not workspace_path.exists():
            workspace_path = get_job_workspace_path(
                user_id=fresh["user_id"], deck_id=fresh["deck_id"],
            )
        word_slug = fresh.get("word_slug")
        if not word_slug:
            await retry.finalize_failure(
                self.sb, word_id=word_id, user_id=fresh["user_id"],
                failed_stage="video",
            )
            state.clear_log_context()
            return

        import os
        log.info(
            "DIAG video_dispatcher workspace resolution: "
            "word_id=%s word_slug=%s "
            "_workspace_path_raw=%r "
            "workspace_path=%s is_absolute=%s exists=%s "
            "cwd=%s",
            word_id, word_slug,
            word.get("_workspace_path"),
            workspace_path, workspace_path.is_absolute(), workspace_path.exists(),
            os.getcwd(),
        )
        if workspace_path.exists():
            try:
                log.info(
                    "DIAG video_dispatcher workspace listing: word_slug=%s contents=%s",
                    word_slug, os.listdir(workspace_path)[:30],
                )
                word_dir = workspace_path / word_slug
                log.info(
                    "DIAG video_dispatcher word_dir: path=%s exists=%s",
                    word_dir, word_dir.exists(),
                )
                if word_dir.exists():
                    log.info(
                        "DIAG video_dispatcher word_dir listing: contents=%s",
                        os.listdir(word_dir)[:30],
                    )
            except Exception as e:
                log.warning("DIAG video_dispatcher listing error: %s", e)

        async def _once():
            await run_stage(workspace_path, word_slug, "video")

        async def _bump():
            return await retry.bump_same_stage_or_release(
                self.sb, word_id=word_id, stage="video", logger=log,
            )

        try:
            await retry.run_stage_with_budget(
                stage="video",
                run_once=_once,
                bump_attempt_counter=_bump,
            )
        except retry.RetryReleased:
            state.clear_log_context()
            return
        except retry.BudgetExhausted as e:
            log.error("video_dispatcher: budget exhausted word=%s: %s", word_id, e)
            await retry.finalize_failure(
                self.sb, word_id=word_id, user_id=fresh["user_id"],
                failed_stage="video",
            )
            state.clear_log_context()
            return

        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage="post_video_queued",
            allowed_prior=["video"],
            increment_attempts=False,
        )
        if not ok:
            log.warning(
                "video_dispatcher: word=%s couldn't transition to post_video_queued",
                word_id,
            )
            state.clear_log_context()
            return

        await self.post_video_queue.put(fresh)
        log.info("video_dispatcher: word=%s -> post_video_queued", word_id)
        state.clear_log_context()
