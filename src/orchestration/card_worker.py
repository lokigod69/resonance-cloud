"""Card worker: card-deck handoff point for single-image generation.

P3.5 parks card words at the ``pending_image`` stage, distinct from the
video pipeline's ``images`` stage which means active multi-scene Image
Engine work. P4 wires the single-image generation and completion.
"""

from __future__ import annotations

import asyncio
from datetime import datetime, timezone
import logging
from pathlib import Path
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
                failed_stage="pending_image",
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return

        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage="pending_image",
            allowed_prior=["pending"],
            increment_attempts=True,
        )
        if not ok:
            log.warning(
                "card_worker: word=%s could not enter pending_image (cancelled or raced)",
                word_id,
            )
            state.clear_log_context()
            return

        state.set_log_context(stage="pending_image")
        state.timer_for(word_id).enter("pending_image")

        from src.manifest import read_manifest
        from src.settings import load_defaults
        from src.storage import get_job_workspace_path

        workspace_path = get_job_workspace_path(
            user_id=fresh["user_id"],
            deck_id=fresh["deck_id"],
        )
        word_dir = workspace_path / word_slug
        try:
            manifest = read_manifest(word_dir)
        except Exception as e:
            log.error(
                "card_worker: manifest unreadable word=%s dir=%s: %s",
                word_id, word_dir, e,
            )
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="pending_image",
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return

        settings = load_defaults(workspace_path)
        deck_context = {
            "workspace_path": workspace_path,
            "word_dir": word_dir,
            "word_slug": word_slug,
            "manifest": manifest,
            "settings": settings,
        }

        async def _once() -> None:
            latest = await state.fetch_word(self.sb, word_id)
            if latest is None:
                raise RuntimeError(f"word {word_id} vanished")
            ok = await self._generate_card_image(latest, deck_context)
            if not ok:
                raise RuntimeError("card image generation flow returned false")

        async def _bump() -> bool:
            return await retry.bump_same_stage_or_release(
                self.sb, word_id=word_id, stage="pending_image", logger=log,
            )

        try:
            await retry.run_stage_with_budget(
                stage="pending_image",
                run_once=_once,
                bump_attempt_counter=_bump,
            )
        except retry.RetryReleased:
            state.clear_log_context()
            return
        except retry.BudgetExhausted as e:
            log.error("card_worker: budget exhausted word=%s stage=pending_image: %s", word_id, e)
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="pending_image",
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return

        await self._refresh_deck_status(fresh.get("deck_id"))
        log.info("card_worker: word=%s completed card image generation", word_id)
        state.clear_log_context()

    async def _generate_card_image(self, word: dict[str, Any], deck_context: dict[str, Any]) -> bool:
        """Generate, upload, and persist one card image. Return True on success."""
        from cloud_engines.image_engine.card_engine import generate_card_image
        from cloud_engines.image_engine.card_models import (
            CardImageContent,
            CardImagePayload,
        )
        from cloud_engines.image_engine.models import ImageMetadata

        manifest = deck_context["manifest"]
        images_settings = (deck_context.get("settings") or {}).get("images", {})
        word_slug = str(deck_context["word_slug"])
        word_dir = Path(deck_context["word_dir"])
        output_dir = word_dir / "card_image"

        card_image_style = str(
            images_settings.get("card_image_style")
            or "Photorealistic"
        )
        image_model = str(images_settings.get("card_image_model") or "zturbo")

        payload = CardImagePayload(
            content=CardImageContent(
                word=str(word.get("word") or manifest.word_original),
                translation=str(word.get("translation") or manifest.translation or ""),
                language=str(getattr(manifest, "language", "") or "Unknown"),
                language_code=str(getattr(manifest, "language_code", "") or "und"),
                pos=word.get("pos") or getattr(manifest.enrichment, "pos", None),
                bridge_mnemonic=(
                    word.get("bridge_mnemonic")
                    or getattr(manifest.enrichment, "bridge_mnemonic", None)
                ),
            ),
            card_image_style=card_image_style,
            image_model=image_model,
            output_dir=str(output_dir),
            metadata=ImageMetadata(
                word=str(word.get("word") or manifest.word_original),
                language=str(getattr(manifest, "language", "") or "Unknown"),
                translation=str(word.get("translation") or manifest.translation or ""),
                timestamp=datetime.now(timezone.utc).isoformat(),
                word_id=word.get("id"),
                deck_id=word.get("deck_id"),
                user_id=word.get("user_id"),
                job_id=word.get("generation_job_id"),
                attempt=word.get("stage_attempts"),
            ),
        )

        result = await asyncio.to_thread(generate_card_image, payload)
        if result.status != "success" or not result.image_path:
            message = result.error.message if result.error else "unknown card image error"
            log.warning("card_worker: card image generation failed word=%s: %s", word.get("id"), message)
            return False

        public_url = await self._upload_card_image(
            image_path=Path(result.image_path),
            user_id=str(word["user_id"]),
            deck_id=str(word["deck_id"]),
            word_slug=word_slug,
        )
        if not public_url:
            return False

        def _write_thumbnail():
            return (
                self.sb.table("words")
                  .update({"thumbnail_url": public_url})
                  .eq("id", word["id"])
                  .execute()
            )

        try:
            await asyncio.to_thread(_write_thumbnail)
        except Exception as e:
            log.error("card_worker: thumbnail_url write failed word=%s: %s", word.get("id"), e)
            return False

        transitioned = await state.transition_stage(
            self.sb, word["id"],
            new_stage="complete",
            allowed_prior=["pending_image"],
            increment_attempts=False,
        )
        if not transitioned:
            log.warning(
                "card_worker: word=%s could not transition pending_image -> complete",
                word.get("id"),
            )
            return False

        log.info("card_worker: thumbnail_url populated word=%s url=%s", word.get("id"), public_url)
        return True

    async def _upload_card_image(
        self,
        *,
        image_path: Path,
        user_id: str,
        deck_id: str,
        word_slug: str,
    ) -> str | None:
        """Upload a card PNG to the existing videos bucket and return its public URL."""
        if not image_path.exists():
            log.error("card_worker: card image missing: %s", image_path)
            return None

        storage_key = f"{user_id}/{deck_id}/cards/{word_slug}.png"

        def _upload() -> str:
            with open(image_path, "rb") as f:
                self.sb.storage.from_("videos").upload(
                    storage_key,
                    f.read(),
                    file_options={"content-type": "image/png", "upsert": "true"},
                )
            return self.sb.storage.from_("videos").get_public_url(storage_key)

        try:
            return await asyncio.to_thread(_upload)
        except Exception as e:
            log.error("card_worker: card image upload failed key=%s: %s", storage_key, e)
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

        terminal_stages = {"complete", "failed", "cancelled"}
        if any(stage not in terminal_stages for stage in stages):
            deck_status = "generating"
        elif all(stage == "complete" for stage in stages):
            deck_status = "complete"
        elif any(stage == "complete" for stage in stages):
            deck_status = "partial"
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
