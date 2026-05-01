"""Card worker: card-deck handoff point for single-image generation.

P3 only claims card words into the existing ``images`` stage. P4 wires the
Image Engine single-image call and completion.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any

from . import retry, state

log = logging.getLogger(__name__)


class CardWorker:
    def __init__(
        self,
        sb,
        *,
        card_queue: asyncio.Queue,
    ):
        self.sb = sb
        self.card_queue = card_queue
        self._stopped = asyncio.Event()
        self._busy = False

    @property
    def busy(self) -> bool:
        return self._busy

    def stop(self) -> None:
        self._stopped.set()

    async def run(self) -> None:
        log.info("card_worker: starting")
        while not self._stopped.is_set():
            try:
                word = await asyncio.wait_for(self.card_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            self._busy = True
            word_id = word.get("id")
            try:
                await self._process_word(word)
            except Exception as e:
                log.error(
                    "card_worker: unhandled error word=%s: %s",
                    word_id, e, exc_info=True,
                )
            finally:
                timer = state.drop_timer(word_id) if word_id else None
                if timer and timer.entries:
                    log.info(
                        "card_worker: word=%s durations_ms=%s attempts=%s",
                        word_id, timer.durations_ms(), timer.attempts,
                    )
                self._busy = False
                self.card_queue.task_done()
        log.info("card_worker: stopped")

    async def _process_word(self, word: dict[str, Any]) -> None:
        word_id = word["id"]
        state.set_log_context(word_id=word_id, stage="pending")
        state.timer_for(word_id)

        fresh = await state.fetch_word(self.sb, word_id)
        if fresh is None:
            log.warning("card_worker: word=%s vanished", word_id)
            state.clear_log_context()
            return

        word_slug = fresh.get("word_slug")
        if not word_slug:
            log.error("card_worker: word=%s has no word_slug", word_id)
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="images",
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return

        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage="images",
            allowed_prior=["pending"],
            increment_attempts=True,
        )
        if not ok:
            log.warning(
                "card_worker: word=%s could not enter images (cancelled or raced)",
                word_id,
            )
            state.clear_log_context()
            return

        state.set_log_context(stage="images")
        state.timer_for(word_id).enter("images")

        try:
            await retry.run_stage_with_budget(
                stage="images",
                run_once=self._park_for_p4,
            )
        except retry.BudgetExhausted as e:
            log.error("card_worker: budget exhausted word=%s stage=images: %s", word_id, e)
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="images",
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return

        await self._refresh_deck_status(fresh.get("deck_id"))
        log.info("card_worker: word=%s parked at images for P4", word_id)
        state.clear_log_context()

    async def _park_for_p4(self) -> None:
        return None

    async def _refresh_deck_status(self, deck_id: str | None) -> None:
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
            log.warning("card_worker: deck words read failed deck=%s: %s", deck_id, e)
            return

        words = list(getattr(resp, "data", None) or [])
        if not words:
            return

        stages = [
            word.get("current_stage") if word.get("current_stage") is not None
            else word.get("status", "pending")
            for word in words
        ]

        if any(stage not in {"complete", "failed", "cancelled", "images"} for stage in stages):
            deck_status = "generating"
        elif all(stage == "complete" for stage in stages):
            deck_status = "complete"
        elif any(stage == "complete" for stage in stages):
            deck_status = "partial"
        elif all(stage == "images" for stage in stages):
            deck_status = "generating"
        else:
            deck_status = "failed"

        def _update_deck():
            return (
                self.sb.table("decks")
                  .update({"status": deck_status})
                  .eq("id", deck_id)
                  .execute()
            )

        try:
            await asyncio.to_thread(_update_deck)
        except Exception as e:
            log.warning("card_worker: deck update failed deck=%s: %s", deck_id, e)
