"""Upstream worker: runs images → concept → song for each word.

Design refs:
- §6.2 upstream worker
- §6.2 Suno submit idempotency
"""

from __future__ import annotations

import asyncio
import logging
from pathlib import Path
from typing import Any, Optional

from . import retry, state

log = logging.getLogger(__name__)


UPSTREAM_STAGES = ("images", "concept", "song")


class UpstreamWorker:
    def __init__(
        self,
        sb,
        *,
        upstream_queue: asyncio.Queue,
        video_queue: asyncio.Queue,
    ):
        self.sb = sb
        self.upstream_queue = upstream_queue
        self.video_queue = video_queue
        self._stopped = asyncio.Event()
        self._busy = False

    @property
    def busy(self) -> bool:
        """Metric: is this worker currently processing a word? (§13 MED-3)"""
        return self._busy

    def stop(self) -> None:
        self._stopped.set()

    async def run(self) -> None:
        log.info("upstream_worker: starting")
        while not self._stopped.is_set():
            try:
                word = await asyncio.wait_for(self.upstream_queue.get(), timeout=1.0)
            except asyncio.TimeoutError:
                continue
            self._busy = True
            word_id = word.get("id")
            try:
                await self._process_word(word)
            except Exception as e:
                log.error(
                    "upstream_worker: unhandled error word=%s: %s",
                    word_id, e, exc_info=True,
                )
            finally:
                # MED-3: emit StageTimer breakdown for EVERY terminal path
                # (success, failure, early-bail). Clear to prevent leak.
                timer = state.drop_timer(word_id) if word_id else None
                if timer and timer.entries:
                    log.info(
                        "upstream_worker: word=%s durations_ms=%s attempts=%s",
                        word_id, timer.durations_ms(), timer.attempts,
                    )
                self._busy = False
                self.upstream_queue.task_done()
        log.info("upstream_worker: stopped")

    async def _process_word(self, word: dict[str, Any]) -> None:
        word_id = word["id"]
        state.set_log_context(word_id=word_id, stage="pending")
        state.timer_for(word_id)

        fresh = await state.fetch_word(self.sb, word_id)
        if fresh is None:
            log.warning("upstream_worker: word=%s vanished", word_id)
            return

        from src.storage import get_job_workspace_path
        workspace_path = get_job_workspace_path(
            user_id=fresh["user_id"], deck_id=fresh["deck_id"],
        )

        word_slug = fresh.get("word_slug")
        if not word_slug:
            log.error("upstream_worker: word=%s has no word_slug", word_id)
            await retry.finalize_failure(
                self.sb, word_id=word_id, user_id=fresh["user_id"],
                failed_stage="images",
            )
            state.clear_log_context()
            return

        import os
        log.info(
            "DIAG upstream_worker workspace resolution: "
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
                    "DIAG upstream_worker workspace listing: word_slug=%s contents=%s",
                    word_slug, os.listdir(workspace_path)[:30],
                )
                word_dir = workspace_path / word_slug
                log.info(
                    "DIAG upstream_worker word_dir: path=%s exists=%s",
                    word_dir, word_dir.exists(),
                )
                if word_dir.exists():
                    log.info(
                        "DIAG upstream_worker word_dir listing: contents=%s",
                        os.listdir(word_dir)[:30],
                    )
            except Exception as e:
                log.warning("DIAG upstream_worker listing error: %s", e)

        for stage in UPSTREAM_STAGES:
            ok = await self._run_upstream_stage(
                fresh, workspace_path, word_slug, stage,
            )
            if not ok:
                state.clear_log_context()
                return
            fresh = await state.fetch_word(self.sb, word_id) or fresh

        # Hand off to video queue
        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage="video_queued",
            allowed_prior=["song"],
            increment_attempts=False,
        )
        if not ok:
            log.warning(
                "upstream_worker: word=%s could not transition to video_queued",
                word_id,
            )
            state.clear_log_context()
            return

        await self.video_queue.put(fresh)
        log.info("upstream_worker: word=%s -> video_queued", word_id)
        state.clear_log_context()

    async def _run_upstream_stage(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
        stage: str,
    ) -> bool:
        word_id = word["id"]
        state.set_log_context(stage=stage)

        prev_stage_map = {"images": "pending", "concept": "images", "song": "concept"}
        allowed_prior = [prev_stage_map[stage]]

        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage=stage,
            allowed_prior=allowed_prior,
            increment_attempts=True,
        )
        if not ok:
            log.warning(
                "upstream_worker: word=%s could not enter %s (cancelled or raced)",
                word_id, stage,
            )
            return False

        state.timer_for(word_id).enter(stage)

        # Smart-retry skip
        from src.services.stage_helpers import get_incomplete_stages
        from src.manifest import read_manifest
        from src.settings import load_defaults

        word_dir = workspace_path / word_slug
        try:
            manifest = read_manifest(word_dir)
            defaults = load_defaults(workspace_path)
            bookend_on = {
                **defaults.get("bookend", {}),
                **manifest.settings.get("bookend", {}),
            }.get("enabled", True)
            incomplete = get_incomplete_stages(word_dir, manifest, bookend_on)
            if stage not in incomplete:
                log.info(
                    "upstream_worker: skipping %s for word=%s (already complete)",
                    stage, word_id,
                )
                return True
        except Exception:
            pass

        from src.pipeline import run_stage

        async def _once():
            await run_stage(workspace_path, word_slug, stage)

        async def _bump():
            return await retry.bump_same_stage_or_release(
                self.sb, word_id=word_id, stage=stage, logger=log,
            )

        try:
            await retry.run_stage_with_budget(
                stage=stage,
                run_once=_once,
                bump_attempt_counter=_bump,
            )
        except retry.RetryReleased:
            return False
        except retry.BudgetExhausted as e:
            log.error(
                "upstream_worker: budget exhausted word=%s stage=%s: %s",
                word_id, stage, e,
            )
            await retry.finalize_failure(
                self.sb, word_id=word_id, user_id=word["user_id"],
                failed_stage=stage,
            )
            return False

        if stage == "images":
            await self._post_images_mnemonic_writeback(word, workspace_path, word_slug)

        if stage == "song":
            await self._post_song_suno_submit(word, workspace_path, word_slug)

        return True

    async def _post_images_mnemonic_writeback(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
    ) -> None:
        """Overwrite words.mnemonic with the storyboard's `mnemonic_text`.

        The storyboard writes mnemonic_text in base_language (matches
        `translation`); enrichment's mnemonic has no language anchor.
        Restores pre-refactor behavior from 08e9726^:job_runner.py:326-347.
        """
        import json as _json
        from src.manifest import read_manifest, write_manifest

        word_dir = workspace_path / word_slug
        try:
            images_manifest = read_manifest(word_dir)
            images_version = images_manifest.selected.images
            if not images_version:
                return
            storyboard_path = word_dir / "images" / images_version / "storyboard.json"
            if not storyboard_path.exists():
                return
            storyboard_data = _json.loads(storyboard_path.read_text(encoding="utf-8"))
            storyboard_mnemonic = storyboard_data.get("mnemonic_text")
            if not (
                storyboard_mnemonic
                and isinstance(storyboard_mnemonic, str)
                and len(storyboard_mnemonic.strip()) > 10
            ):
                return
            storyboard_mnemonic = storyboard_mnemonic.strip()
            log.info(
                "upstream_worker: storyboard mnemonic word=%s: %s",
                word["id"], storyboard_mnemonic[:80],
            )
            images_manifest.enrichment.mnemonic = storyboard_mnemonic
            write_manifest(word_dir, images_manifest)

            def _write(wid=word["id"], mn=storyboard_mnemonic):
                return (
                    self.sb.table("words")
                      .update({"mnemonic": mn})
                      .eq("id", wid)
                      .execute()
                )
            await asyncio.to_thread(_write)
        except Exception as e:
            log.warning(
                "upstream_worker: storyboard mnemonic extract failed word=%s: %s",
                word["id"], e,
            )

    async def _post_song_suno_submit(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
    ) -> None:
        from src.settings import load_defaults
        from src.suno import read_concept_data, submit_song

        suno_settings = load_defaults(workspace_path).get("suno", {})
        if not suno_settings.get("enabled", False):
            return

        fresh = await state.fetch_word(self.sb, word["id"]) or word

        if fresh.get("suno_task_id"):
            await state.mark_music_state(
                self.sb, fresh["id"], music_state="submitted",
            )
            log.info(
                "upstream_worker: suno_task_id already set for word=%s — music_state=submitted",
                fresh["id"],
            )
            return

        word_dir = workspace_path / word_slug
        try:
            concept_data = read_concept_data(word_dir)
        except FileNotFoundError as e:
            log.warning(
                "upstream_worker: concept file missing word=%s — Suno submit deferred: %s",
                fresh["id"], e,
            )
            await state.mark_music_state(
                self.sb, fresh["id"], music_state="pending",
            )
            return

        async def _once():
            await submit_song(
                fresh["deck_id"],
                word_slug,
                concept_data,
                word_id=fresh["id"],
                user_id=fresh["user_id"],
                job_id=fresh.get("generation_job_id"),
            )

        try:
            await retry.run_stage_with_budget(stage="song", run_once=_once)
            await state.mark_music_state(
                self.sb, fresh["id"], music_state="submitted",
            )
            log.info("upstream_worker: Suno submitted for word=%s", fresh["id"])
        except retry.BudgetExhausted as e:
            log.warning(
                "upstream_worker: Suno submit exhausted for word=%s: %s",
                fresh["id"], e,
            )
            await state.mark_music_state(
                self.sb, fresh["id"], music_state="submit_failed",
            )
