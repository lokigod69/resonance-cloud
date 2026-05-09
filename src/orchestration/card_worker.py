"""Card worker: card-deck handoff point for single-image generation.

P3.5 parks card words at the ``pending_image`` stage, distinct from the
video pipeline's ``images`` stage which means active multi-scene Image
Engine work. P4 wires the single-image generation and completion.
"""

from __future__ import annotations

import asyncio
import json
from datetime import datetime, timezone
import logging
import os
from pathlib import Path
import time
from typing import Any

from src.services.events import write_event_row

from . import retry, state

log = logging.getLogger(__name__)
MAX_ERROR_MESSAGE_CHARS = 500
DEFAULT_CARD_IMAGE_RENDER_TIMEOUT_SECONDS = 360.0


def _card_image_storage_key(
    *, user_id: str, deck_id: str, word_slug: str, word_id: str
) -> str:
    return f"{user_id}/{deck_id}/cards/{word_slug}_{word_id}.png"


def _bounded_error_message(step: str, error: BaseException | str) -> str:
    if isinstance(error, BaseException):
        message = f"{step}: {type(error).__name__}: {error}"
    else:
        message = f"{step}: {error}"
    return message[:MAX_ERROR_MESSAGE_CHARS]


def _card_generation_error_message(message: str) -> str:
    lowered = message.lower()
    if "llm" in lowered:
        step = "LLM"
    elif "provider" in lowered or "render" in lowered:
        step = "provider"
    else:
        step = "card image generation"
    return _bounded_error_message(step, message)


def _is_terminal_card_image_failure(message: str | None) -> bool:
    lowered = (message or "").lower()
    return (
        "validator failed before provider" in lowered
        or "infographic v4 validator failed" in lowered
        or "prompt writer failed before provider" in lowered
        or "infographic v4 prompt writer failed" in lowered
    )


def _card_image_render_timeout_seconds() -> float:
    raw = os.getenv("CARD_IMAGE_RENDER_TIMEOUT_SECONDS", "")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return DEFAULT_CARD_IMAGE_RENDER_TIMEOUT_SECONDS
    return value if value > 0 else DEFAULT_CARD_IMAGE_RENDER_TIMEOUT_SECONDS


class TerminalCardImageFailure(Exception):
    """Non-retryable card image failure that should terminalize the word now."""


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
            error_message = _bounded_error_message("bootstrap", "missing word_slug")
            log.error("card_worker: word=%s has no word_slug", word_id)
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="pending_image",
                error_message=error_message,
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return

        current_stage = fresh.get("current_stage")
        stage_attempts = int(fresh.get("stage_attempts") or 0)
        if current_stage == "pending":
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
        elif current_stage == "pending_image" and stage_attempts == 0:
            ok = await state.claim_pending_image_retry_entry(self.sb, word_id)
            if not ok:
                log.info(
                    "card_worker: word=%s pending_image retry entry already claimed or ineligible",
                    word_id,
                )
                state.clear_log_context()
                return
        elif current_stage == "pending_image":
            log.info(
                "card_worker: word=%s already active at pending_image (stage_attempts=%s); releasing duplicate",
                word_id, stage_attempts,
            )
            state.clear_log_context()
            return
        else:
            log.warning(
                "card_worker: word=%s unexpected card stage=%s; releasing",
                word_id, current_stage,
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
            error_message = _bounded_error_message("manifest", e)
            log.error(
                "card_worker: manifest unreadable word=%s dir=%s: %s",
                word_id, word_dir, e,
            )
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="pending_image",
                error_message=error_message,
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
        last_error_message: str | None = None

        async def _once() -> None:
            nonlocal last_error_message
            latest = await state.fetch_word(self.sb, word_id)
            if latest is None:
                last_error_message = _bounded_error_message(
                    "DB readback", f"word {word_id} vanished"
                )
                raise RuntimeError(last_error_message)
            ok, error_message = await self._generate_card_image(latest, deck_context)
            if not ok:
                last_error_message = (
                    error_message
                    or _bounded_error_message(
                        "card image generation", "flow returned false"
                    )
                )
                if _is_terminal_card_image_failure(last_error_message):
                    raise TerminalCardImageFailure(last_error_message)
                raise RuntimeError(last_error_message)

        async def _bump() -> bool:
            return await retry.bump_same_stage_or_release(
                self.sb, word_id=word_id, stage="pending_image", logger=log,
            )

        try:
            await retry.run_stage_with_budget(
                stage="pending_image",
                run_once=_once,
                bump_attempt_counter=_bump,
                terminal_exceptions=(TerminalCardImageFailure,),
            )
        except retry.RetryReleased:
            state.clear_log_context()
            return
        except TerminalCardImageFailure as e:
            error_message = str(e)
            log.error("card_worker: terminal card image failure word=%s stage=pending_image: %s", word_id, e)
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="pending_image",
                error_message=error_message,
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return
        except retry.BudgetExhausted as e:
            error_message = (
                last_error_message
                or _bounded_error_message("pending_image", e)
            )
            log.error("card_worker: budget exhausted word=%s stage=pending_image: %s", word_id, e)
            await retry.finalize_failure(
                self.sb,
                word_id=word_id,
                user_id=fresh["user_id"],
                failed_stage="pending_image",
                error_message=error_message,
            )
            await self._refresh_deck_status(fresh.get("deck_id"))
            state.clear_log_context()
            return

        await self._refresh_deck_status(fresh.get("deck_id"))
        log.info("card_worker: word=%s completed card image generation", word_id)
        state.clear_log_context()

    async def _generate_card_image(
        self,
        word: dict[str, Any],
        deck_context: dict[str, Any],
    ) -> tuple[bool, str | None]:
        """Generate, upload, and persist one card image."""
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
        word_metadata = word.get("metadata") if isinstance(word.get("metadata"), dict) else {}
        visual_card_plan = (
            word_metadata.get("visual_card_plan")
            if isinstance(word_metadata.get("visual_card_plan"), dict)
            else {}
        )

        payload = CardImagePayload(
            content=CardImageContent(
                word=str(word.get("word") or manifest.word_original),
                translation=str(word.get("translation") or manifest.translation or ""),
                language=str(getattr(manifest, "language", "") or "Unknown"),
                language_code=str(getattr(manifest, "language_code", "") or "und"),
                base_language=visual_card_plan.get("base_language"),
                pos=word.get("pos") or getattr(manifest.enrichment, "pos", None),
                bridge_mnemonic=(
                    word.get("bridge_mnemonic")
                    or getattr(manifest.enrichment, "bridge_mnemonic", None)
                ),
                mnemonic=(
                    visual_card_plan.get("mnemonic")
                    or word.get("mnemonic")
                    or getattr(manifest.enrichment, "mnemonic", None)
                ),
                image_scene=(
                    visual_card_plan.get("image_scene")
                    or word.get("image_scene")
                    or getattr(manifest.enrichment, "image_scene", None)
                    or word.get("mnemonic")
                    or getattr(manifest.enrichment, "mnemonic", None)
                ),
                mnemonic_confidence=(
                    visual_card_plan.get("mnemonic_confidence")
                    or word.get("mnemonic_confidence")
                    or getattr(manifest.enrichment, "mnemonic_confidence", None)
                ),
                etymology=(
                    visual_card_plan.get("etymology")
                    or word.get("etymology")
                    or getattr(manifest.enrichment, "etymology", None)
                ),
                usage_example=(
                    visual_card_plan.get("usage_example")
                    if isinstance(visual_card_plan.get("usage_example"), dict)
                    else None
                ),
                dominant_emotional_reading=(
                    visual_card_plan.get("dominant_emotional_reading")
                    or
                    word.get("dominant_emotional_reading")
                    or getattr(manifest.enrichment, "dominant_emotional_reading", None)
                ),
                composition_hint=(
                    word.get("composition_hint")
                    or getattr(manifest.enrichment, "composition_hint", None)
                ),
                treatment_hint=(
                    word.get("treatment_hint")
                    or getattr(manifest.enrichment, "treatment_hint", None)
                ),
                composition=(
                    visual_card_plan.get("composition")
                    or word.get("composition")
                    or getattr(manifest.enrichment, "composition", None)
                ),
                treatment=(
                    visual_card_plan.get("treatment")
                    or word.get("treatment")
                    or getattr(manifest.enrichment, "treatment", None)
                ),
                creative_mode=(
                    visual_card_plan.get("creative_mode")
                    or word.get("creative_mode")
                    or getattr(manifest.enrichment, "creative_mode", None)
                ),
                text_embedding_mode=(
                    visual_card_plan.get("text_embedding_mode")
                    or word.get("text_embedding_mode")
                    or getattr(manifest.enrichment, "text_embedding_mode", None)
                ),
                renderer_profile=(
                    visual_card_plan.get("renderer_profile")
                    or word.get("renderer_profile")
                    or getattr(manifest.enrichment, "renderer_profile", None)
                    or "balanced_teaching"
                ),
                renderer_profile_source=(
                    visual_card_plan.get("renderer_profile_source")
                    or word.get("renderer_profile_source")
                    or getattr(manifest.enrichment, "renderer_profile_source", None)
                    or "auto"
                ),
                layer2_customization=(
                    images_settings.get("card_layer2")
                    if isinstance(images_settings.get("card_layer2"), dict)
                    else None
                ),
                layer2_planning_version=visual_card_plan.get("layer2_planning_version"),
                mini_story_beats=(
                    visual_card_plan.get("mini_story_beats")
                    if isinstance(visual_card_plan.get("mini_story_beats"), list)
                    else None
                ),
                split_panel_brief=(
                    visual_card_plan.get("split_panel_brief")
                    if isinstance(visual_card_plan.get("split_panel_brief"), dict)
                    else None
                ),
                word_design_brief=(
                    visual_card_plan.get("word_design_brief")
                    if isinstance(visual_card_plan.get("word_design_brief"), dict)
                    else None
                ),
                word_design_mode=visual_card_plan.get("word_design_mode"),
                mnemonic_hook=(
                    visual_card_plan.get("mnemonic_hook")
                    if isinstance(visual_card_plan.get("mnemonic_hook"), dict)
                    else None
                ),
                hook_type=visual_card_plan.get("hook_type"),
                hook_quality=visual_card_plan.get("hook_quality"),
                fallback_reason=visual_card_plan.get("fallback_reason"),
                single_image_teachable=(
                    visual_card_plan.get("single_image_teachable")
                    if visual_card_plan.get("single_image_teachable") is not None
                    else getattr(manifest.enrichment, "single_image_teachable", None)
                ),
                register_note=(
                    visual_card_plan.get("register_note")
                    or word.get("register_note")
                    or getattr(manifest.enrichment, "register_note", None)
                ),
                rationale_summary=(
                    visual_card_plan.get("rationale_summary")
                    or word.get("rationale_summary")
                    or getattr(manifest.enrichment, "rationale_summary", None)
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

        async def _persist_gpt_card_metadata(metadata: dict[str, Any] | None) -> None:
            if image_model != "gpt_image_2" or not metadata:
                return
            update_data = {
                "metadata": {
                    **word_metadata,
                    "gpt_image_2_card": metadata,
                }
            }

            def _write_metadata():
                return (
                    self.sb.table("words")
                      .update(update_data)
                      .eq("id", word["id"])
                      .execute()
                )

            try:
                await asyncio.to_thread(_write_metadata)
            except Exception:
                log.warning(
                    "card_worker: failed to persist GPT card metadata word=%s",
                    word.get("id"),
                    exc_info=True,
                )

        timeout_seconds = _card_image_render_timeout_seconds()
        loop = asyncio.get_running_loop()
        render_future = loop.run_in_executor(None, generate_card_image, payload)
        try:
            result = await asyncio.wait_for(
                render_future,
                timeout=timeout_seconds,
            )
        except asyncio.TimeoutError:
            render_future.cancel()
            error_message = _bounded_error_message(
                "card image generation",
                f"timed out after {timeout_seconds:.1f}s",
            )
            write_event_row(
                stage="pending_image",
                sub_step="generate_card_image",
                status="failed",
                event_source="orchestrator",
                word_id=word.get("id"),
                deck_id=word.get("deck_id"),
                user_id=word.get("user_id"),
                job_id=word.get("generation_job_id"),
                attempt=word.get("stage_attempts"),
                error_message=error_message,
                error_type="TimeoutError",
                metadata={"timeout_seconds": timeout_seconds},
            )
            cache_path = output_dir / "gpt_image_2_v4_prompt_cache.json"
            try:
                cached_metadata = json.loads(cache_path.read_text(encoding="utf-8"))
            except (OSError, json.JSONDecodeError):
                cached_metadata = None
            if isinstance(cached_metadata, dict):
                cached_metadata = {
                    **cached_metadata,
                    "failure_origin": "provider",
                    "provider_reached": True,
                    "provider_error_summary": error_message,
                }
                await _persist_gpt_card_metadata(cached_metadata)
            log.error("card_worker: card image generation timed out word=%s", word.get("id"))
            return False, error_message
        if result.status != "success" or not result.image_path:
            message = result.error.message if result.error else "unknown card image error"
            log.warning("card_worker: card image generation failed word=%s: %s", word.get("id"), message)
            await _persist_gpt_card_metadata(result.gpt_image_2_card_metadata)
            return False, _card_generation_error_message(message)

        public_url, upload_error = await self._upload_card_image(
            image_path=Path(result.image_path),
            word=word,
            user_id=str(word["user_id"]),
            deck_id=str(word["deck_id"]),
            word_slug=word_slug,
        )
        if not public_url:
            return False, upload_error

        update_data: dict[str, Any] = {"thumbnail_url": public_url}
        tts_started = time.monotonic()
        try:
            from src.settings import resolve_settings
            from src.services import pronunciation_tts

            bookend_settings = resolve_settings(
                "bookend",
                getattr(manifest, "settings", {}) or {},
                deck_context.get("settings") or {},
            )
            tts_updates = await pronunciation_tts.generate_target_headword_for_card(
                sb=self.sb,
                word_row=word,
                language_code=str(getattr(manifest, "language_code", "") or "und"),
                bookend_settings=bookend_settings,
            )
            update_data.update(tts_updates)
            write_event_row(
                stage="pending_image",
                sub_step="tts_pronunciation",
                status="success",
                event_source="orchestrator",
                word_id=word.get("id"),
                deck_id=word.get("deck_id"),
                user_id=word.get("user_id"),
                job_id=word.get("generation_job_id"),
                attempt=word.get("stage_attempts"),
                model_provider="elevenlabs",
                model_name=str(bookend_settings.get("model_id") or ""),
                latency_ms=int((time.monotonic() - tts_started) * 1000),
                metadata={
                    "language_code": str(getattr(manifest, "language_code", "") or "und"),
                    "voice_id": bookend_settings.get("voice_id"),
                    "tts_audio_url": tts_updates.get("tts_audio_url"),
                },
            )
        except Exception as e:
            error_message = _bounded_error_message("tts_pronunciation", e)
            update_data.update(
                {
                    "tts_audio_url": None,
                    "tts_status": "failed",
                    "tts_voice_id": None,
                    "tts_generated_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            write_event_row(
                stage="pending_image",
                sub_step="tts_pronunciation",
                status="failed",
                event_source="orchestrator",
                word_id=word.get("id"),
                deck_id=word.get("deck_id"),
                user_id=word.get("user_id"),
                job_id=word.get("generation_job_id"),
                attempt=word.get("stage_attempts"),
                model_provider="elevenlabs",
                error_message=error_message,
                error_type=type(e).__name__,
                latency_ms=int((time.monotonic() - tts_started) * 1000),
            )
            log.warning(
                "card_worker: pronunciation TTS failed word=%s: %s",
                word.get("id"),
                e,
            )
        if image_model == "gpt_image_2" and result.gpt_image_2_card_metadata:
            update_data["metadata"] = {
                **word_metadata,
                "gpt_image_2_card": result.gpt_image_2_card_metadata,
            }
            update_data["mnemonic"] = result.displayed_mnemonic

        def _write_thumbnail():
            return (
                self.sb.table("words")
                  .update(update_data)
                  .eq("id", word["id"])
                  .execute()
            )

        db_started = time.monotonic()
        try:
            await asyncio.to_thread(_write_thumbnail)
        except Exception as e:
            error_message = _bounded_error_message("DB writeback", e)
            write_event_row(
                stage="pending_image",
                sub_step="thumbnail_db_write",
                status="failed",
                event_source="orchestrator",
                word_id=word.get("id"),
                deck_id=word.get("deck_id"),
                user_id=word.get("user_id"),
                job_id=word.get("generation_job_id"),
                attempt=word.get("stage_attempts"),
                error_message=error_message,
                error_type=type(e).__name__,
                latency_ms=int((time.monotonic() - db_started) * 1000),
                metadata={"thumbnail_url": public_url},
            )
            log.error("card_worker: thumbnail_url write failed word=%s: %s", word.get("id"), e)
            return False, error_message
        write_event_row(
            stage="pending_image",
            sub_step="thumbnail_db_write",
            status="success",
            event_source="orchestrator",
            word_id=word.get("id"),
            deck_id=word.get("deck_id"),
            user_id=word.get("user_id"),
            job_id=word.get("generation_job_id"),
            attempt=word.get("stage_attempts"),
            latency_ms=int((time.monotonic() - db_started) * 1000),
            metadata={"thumbnail_url": public_url},
        )

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
            return (
                False,
                _bounded_error_message(
                    "stage transition", "pending_image -> complete rejected"
                ),
            )

        log.info("card_worker: thumbnail_url populated word=%s url=%s", word.get("id"), public_url)
        return True, None

    async def _upload_card_image(
        self,
        *,
        image_path: Path,
        word: dict[str, Any],
        user_id: str,
        deck_id: str,
        word_slug: str,
    ) -> tuple[str | None, str | None]:
        """Upload a card PNG to the existing videos bucket and return its public URL."""
        if not image_path.exists():
            error_message = _bounded_error_message(
                "upload", f"card image missing: {image_path}"
            )
            write_event_row(
                stage="pending_image",
                sub_step="card_image_upload",
                status="failed",
                event_source="orchestrator",
                word_id=word.get("id"),
                deck_id=word.get("deck_id"),
                user_id=word.get("user_id"),
                job_id=word.get("generation_job_id"),
                attempt=word.get("stage_attempts"),
                error_message=error_message,
                error_type="FileNotFoundError",
                metadata={"image_path": str(image_path)},
            )
            log.error("card_worker: card image missing: %s", image_path)
            return None, error_message

        storage_key = _card_image_storage_key(
            user_id=user_id,
            deck_id=deck_id,
            word_slug=word_slug,
            word_id=str(word["id"]),
        )

        def _upload() -> str:
            with open(image_path, "rb") as f:
                self.sb.storage.from_("videos").upload(
                    storage_key,
                    f.read(),
                    file_options={"content-type": "image/png", "upsert": "true"},
                )
            return self.sb.storage.from_("videos").get_public_url(storage_key)

        upload_started = time.monotonic()
        try:
            public_url = await asyncio.to_thread(_upload)
        except Exception as e:
            error_message = _bounded_error_message("upload", e)
            write_event_row(
                stage="pending_image",
                sub_step="card_image_upload",
                status="failed",
                event_source="orchestrator",
                word_id=word.get("id"),
                deck_id=word.get("deck_id"),
                user_id=word.get("user_id"),
                job_id=word.get("generation_job_id"),
                attempt=word.get("stage_attempts"),
                error_message=error_message,
                error_type=type(e).__name__,
                latency_ms=int((time.monotonic() - upload_started) * 1000),
                metadata={"storage_key": storage_key, "bucket": "videos"},
            )
            log.error("card_worker: card image upload failed key=%s: %s", storage_key, e)
            return None, error_message
        write_event_row(
            stage="pending_image",
            sub_step="card_image_upload",
            status="success",
            event_source="orchestrator",
            word_id=word.get("id"),
            deck_id=word.get("deck_id"),
            user_id=word.get("user_id"),
            job_id=word.get("generation_job_id"),
            attempt=word.get("stage_attempts"),
            latency_ms=int((time.monotonic() - upload_started) * 1000),
            metadata={
                "storage_key": storage_key,
                "bucket": "videos",
                "public_url": public_url,
                "image_size_bytes": image_path.stat().st_size,
            },
        )
        return public_url, None

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
