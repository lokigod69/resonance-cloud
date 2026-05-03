"""Feeder: three-source polling + per-job bootstrap.

Design refs:
- §6.1 three sources (orphans, new jobs, retries), priority per §2.7
- §4.6 retry routing table
- §4.7 music-page retry
- §8.3 push-up-to-capacity

Source 3 runs first each cycle. Source 1 drains before Source 2.
"""

from __future__ import annotations

import asyncio
import logging
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from . import state

log = logging.getLogger(__name__)


POLL_INTERVAL = 5.0  # §6.1


# ---------------------------------------------------------------------------
# Retry routing (§4.6, §4.7)
# ---------------------------------------------------------------------------

def _is_music_page_retry(word: dict[str, Any]) -> bool:
    """§4.7 — music-page retry shape.

    Frontend writes music_state=pending, suno_task_id=NULL, suno_audio_url=NULL,
    retry_requested=true ALL in one UPDATE on a complete (or post_video_queued
    recovery) word. There is no failed_stage because the word did not fail.
    """
    return (
        word.get("music_state") == "pending"
        and word.get("current_stage") in ("complete", "post_video_queued")
        and word.get("suno_task_id") is None
        and word.get("suno_audio_url") is None
    )


def _route_for_failed_stage(failed_stage: Optional[str]) -> tuple[str, str]:
    """Dashboard-retry routing (§4.6). Returns (target_current_stage, queue_kind)."""
    if failed_stage == "pending_image":
        return "pending_image", "card"
    if failed_stage in ("images", "concept", "song", "unknown", None):
        return "pending", "upstream"
    if failed_stage == "video":
        return "video_queued", "video"
    if failed_stage in ("assembly", "bookend", "suno_bake", "uploading"):
        return "post_video_queued", "post_video"
    return "pending", "upstream"


def _route_retry(word: dict[str, Any]) -> tuple[str, str]:
    """Determine (target_stage, queue_kind) for a retry-flagged word.

    Music-page retry (§4.7) always routes to post_video_queued, regardless of
    failed_stage. Dashboard retry follows §4.6 by failed_stage.
    """
    if _is_music_page_retry(word):
        return "post_video_queued", "post_video"
    return _route_for_failed_stage(word.get("failed_stage"))


# ---------------------------------------------------------------------------
# Feeder
# ---------------------------------------------------------------------------

class Feeder:
    def __init__(
        self,
        sb,
        *,
        upstream_queue: asyncio.Queue,
        video_queue: asyncio.Queue,
        post_video_queue: asyncio.Queue,
        card_queue: asyncio.Queue,
        bootstrap,
        poll_interval: float = POLL_INTERVAL,
    ):
        self.sb = sb
        self.upstream_queue = upstream_queue
        self.video_queue = video_queue
        self.post_video_queue = post_video_queue
        self.card_queue = card_queue
        self.bootstrap = bootstrap
        self.poll_interval = poll_interval
        self._stopped = asyncio.Event()

    def stop(self) -> None:
        self._stopped.set()

    async def run(self) -> None:
        log.info("feeder: starting")
        while not self._stopped.is_set():
            try:
                await self._poll_once()
            except Exception as e:
                log.error("feeder: poll cycle failed: %s", e, exc_info=True)
            try:
                await asyncio.wait_for(
                    self._stopped.wait(), timeout=self.poll_interval,
                )
            except asyncio.TimeoutError:
                pass
        log.info("feeder: stopped")

    async def _poll_once(self) -> None:
        settings = await self._read_system_settings()
        if settings.get("queue_paused"):
            log.debug("feeder: queue paused")
            return

        if settings.get("auto_approve"):
            await self._auto_approve_pending()

        # §2.7, §6.1: Source 3 first, Source 1 second, Source 2 last.
        await self._source3_orphans()
        await self._source1_new_jobs()
        await self._source2_retries()

    # -------------------------------------------------------------------
    async def _read_system_settings(self) -> dict[str, Any]:
        def _do():
            return (
                self.sb.table("system_settings")
                  .select("queue_paused, auto_approve")
                  .eq("id", 1)
                  .single()
                  .execute()
            )
        try:
            r = await asyncio.to_thread(_do)
            return getattr(r, "data", None) or {}
        except Exception as e:
            log.warning("feeder: system_settings read failed: %s", e)
            return {}

    async def _auto_approve_pending(self) -> None:
        def _do():
            return (
                self.sb.table("generation_jobs")
                  .update({"status": "approved"})
                  .eq("status", "pending")
                  .execute()
            )
        try:
            r = await asyncio.to_thread(_do)
            rows = getattr(r, "data", None) or []
            if rows:
                log.info("feeder: auto-approved %d job(s)", len(rows))
        except Exception as e:
            log.warning("feeder: auto-approve failed: %s", e)

    # -------------------------------------------------------------------
    # SOURCE 3 — orphan recovery (highest priority)
    # -------------------------------------------------------------------
    async def _source3_orphans(self) -> None:
        orphan_stages = ("pending", "video_queued", "post_video_queued", "pending_image")
        # MED-6: explicit keyword so a future default change can't silently
        # break Source 3 semantics (§6.1).
        words = await state.fetch_words_by_stage(
            self.sb, orphan_stages, processing_jobs_only=True,
        )
        if not words:
            return

        log.debug("feeder/source3: %d orphan words found", len(words))
        for word in words:
            stage = word.get("current_stage")
            queue, kind = self._queue_for_stage(stage)
            if queue is None:
                continue
            if queue.full():
                continue
            try:
                queue.put_nowait(word)
            except asyncio.QueueFull:
                continue
            log.debug(
                "feeder/source3: pushed word=%s to %s queue",
                word.get("id"), kind,
            )

    def _queue_for_stage(
        self, stage: Optional[str],
    ) -> tuple[Optional[asyncio.Queue], Optional[str]]:
        if stage == "pending":
            return self.upstream_queue, "upstream"
        if stage == "video_queued":
            return self.video_queue, "video"
        if stage == "post_video_queued":
            return self.post_video_queue, "post_video"
        if stage == "pending_image":
            return self.card_queue, "card"
        return None, None

    # -------------------------------------------------------------------
    # SOURCE 1 — new jobs
    # -------------------------------------------------------------------
    async def _source1_new_jobs(self) -> None:
        def _do_read():
            return (
                self.sb.table("generation_jobs")
                  .select("*")
                  .eq("status", "approved")
                  .order("priority", desc=True)
                  .order("created_at")
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_do_read)
        except Exception as e:
            log.warning("feeder/source1: read failed: %s", e)
            return

        jobs = list(getattr(resp, "data", None) or [])
        for job in jobs:
            job_id = job["id"]
            deck_id = job.get("deck_id")
            if await self._deck_has_other_processing(deck_id, job_id):
                log.debug(
                    "feeder/source1: deck=%s already processing -- skipping job=%s (queued)",
                    deck_id, job_id,
                )
                continue
            await self._try_start_job(job)

    async def _try_start_job(self, job: dict[str, Any]) -> None:
        job_id = job["id"]
        deck_id = job.get("deck_id")

        def _claim():
            return (
                self.sb.table("generation_jobs")
                  .update({
                      "status": "processing",
                      "started_at": datetime.now(timezone.utc).isoformat(),
                  })
                  .eq("id", job_id)
                  .eq("status", "approved")
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_claim)
        except Exception as e:
            log.warning("feeder/source1: claim failed for job=%s: %s", job_id, e)
            return
        if not (getattr(resp, "data", None) or []):
            log.debug("feeder/source1: job=%s already claimed elsewhere", job_id)
            return

        # Same-deck lock (§6.1, Source 1 only).
        if await self._deck_has_other_processing(deck_id, job_id):
            log.warning(
                "feeder/source1: deck=%s has another processing job — reverting job=%s",
                deck_id, job_id,
            )
            await self._revert_to_approved(
                job_id, error="deck already has a processing job",
            )
            return

        try:
            await self.bootstrap(job)
            log.info(
                "feeder/source1: bootstrap complete for job=%s deck=%s",
                job_id, deck_id,
            )
        except Exception as e:
            log.error(
                "feeder/source1: bootstrap failed for job=%s: %s",
                job_id, e, exc_info=True,
            )
            await self._revert_to_approved(job_id, error=str(e))

    async def _deck_has_other_processing(
        self, deck_id: Optional[str], self_id: str,
    ) -> bool:
        if not deck_id:
            return False

        def _do():
            return (
                self.sb.table("generation_jobs")
                  .select("id")
                  .eq("deck_id", deck_id)
                  .eq("status", "processing")
                  .neq("id", self_id)
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_do)
            rows = getattr(resp, "data", None) or []
            return len(rows) > 0
        except Exception as e:
            log.warning(
                "feeder/source1: deck-lock probe failed deck=%s: %s",
                deck_id, e,
            )
            return False

    async def _revert_to_approved(self, job_id: str, *, error: str) -> None:
        def _do():
            return (
                self.sb.table("generation_jobs")
                  .update({
                      "status": "approved",
                      "error_message": (error or "")[:500],
                  })
                  .eq("id", job_id)
                  .eq("status", "processing")
                  .execute()
            )
        try:
            await asyncio.to_thread(_do)
        except Exception as e:
            log.error("feeder: revert-to-approved failed %s: %s", job_id, e)

    # -------------------------------------------------------------------
    # SOURCE 2 — retries (lowest priority)
    # -------------------------------------------------------------------
    async def _source2_retries(self) -> None:
        # CRIT-4: filter to terminal current_stage values. Prevents a live
        # word with retry_requested accidentally set from being pulled.
        # 'complete' covers music-page retries (§4.7).
        def _do():
            return (
                self.sb.table("words")
                  .select("*")
                  .eq("retry_requested", True)
                  .in_("current_stage", ["failed", "complete", "cancelled"])
                  .order("retry_requested_at")
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_do)
        except Exception as e:
            log.warning("feeder/source2: read failed: %s", e)
            return

        words = list(getattr(resp, "data", None) or [])
        for word in words:
            await self._handle_retry_word(word)

    async def _handle_retry_word(self, word: dict[str, Any]) -> None:
        word_id = word["id"]
        target_stage, queue_kind = _route_retry(word)
        parent_job_id = word.get("generation_job_id")

        if await self._deck_has_other_processing(word.get("deck_id"), parent_job_id or ""):
            log.debug(
                "feeder/source2: deck=%s already processing -- skipping retry word=%s (queued)",
                word.get("deck_id"), word_id,
            )
            return

        # CRIT-4 + HIGH-4: claim via RPC. Guards retry_requested=true AND
        # current_stage IN terminal states. Atomically resets stage_attempts,
        # bumps total_stage_attempts, and rewrites current_stage.
        claimed = await state.claim_retry(
            self.sb, word_id, target_stage=target_stage,
        )
        if not claimed:
            log.debug(
                "feeder/source2: retry claim rejected (word=%s) — live/raced/stale",
                word_id,
            )
            return

        await self._maybe_flip_parent_job(word)

        queue = {
            "upstream": self.upstream_queue,
            "video": self.video_queue,
            "post_video": self.post_video_queue,
            "card": self.card_queue,
        }.get(queue_kind)
        if queue is None:
            log.error("feeder/source2: no queue for kind=%s", queue_kind)
            return

        fresh = await state.fetch_word(self.sb, word_id)
        if fresh is None:
            return

        await queue.put(fresh)
        log.info(
            "feeder/source2: retry routed word=%s music_page=%s failed_stage=%s -> %s",
            word_id, _is_music_page_retry(word),
            word.get("failed_stage"), queue_kind,
        )

    async def _maybe_flip_parent_job(self, word: dict[str, Any]) -> None:
        generation_job_id = word.get("generation_job_id")
        if generation_job_id:
            def _flip_owned():
                return (
                    self.sb.table("generation_jobs")
                      .update({"status": "processing"})
                      .eq("id", generation_job_id)
                      .in_("status", ["complete", "failed", "partial"])
                      .execute()
                )
            try:
                await asyncio.to_thread(_flip_owned)
            except Exception as e:
                log.warning(
                    "feeder/source2: parent-job flip failed %s: %s",
                    generation_job_id, e,
                )
            return

        deck_id = word.get("deck_id")
        if not deck_id:
            return

        def _read():
            return (
                self.sb.table("generation_jobs")
                  .select("id, status")
                  .eq("deck_id", deck_id)
                  .in_("status", ["complete", "failed", "partial"])
                  .order("created_at", desc=True)
                  .limit(1)
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_read)
        except Exception as e:
            log.warning(
                "feeder/source2: parent-job read failed deck=%s: %s", deck_id, e,
            )
            return

        rows = list(getattr(resp, "data", None) or [])
        if not rows:
            return

        job_id = rows[0]["id"]

        def _flip():
            return (
                self.sb.table("generation_jobs")
                  .update({"status": "processing"})
                  .eq("id", job_id)
                  .in_("status", ["complete", "failed", "partial"])
                  .execute()
            )
        try:
            await asyncio.to_thread(_flip)
        except Exception as e:
            log.warning("feeder/source2: parent-job flip failed %s: %s", job_id, e)


# ---------------------------------------------------------------------------
# Per-job bootstrap (§6.1 Source 1 step 3)
# ---------------------------------------------------------------------------

async def bootstrap_job(
    sb,
    job: dict[str, Any],
    *,
    upstream_queue: asyncio.Queue,
    card_queue: asyncio.Queue | None = None,
) -> None:
    """Prepare a job's words and push them onto the deck-type queue.

    Ordering invariant (HIGH-2): Supabase word rows are NOT set to
    current_stage='pending' until AFTER the workspace/manifest have been
    written to disk. This prevents Source 3 from observing a "ready" pending
    row with no manifest.

    Manifest overwrite (HIGH-2): if a manifest already exists on disk (from a
    previous bootstrap attempt that failed before pushing), it is removed
    first so the fresh enrichment data lands on disk.

    Enrichment transition (HIGH-3): the pre_bootstrap/pending -> enrichment
    transition goes through transition_stage, so a word in `cancelling` is
    left alone.
    """
    from src.settings import save_defaults
    from src.storage import create_job_workspace
    from src.services.enrichment import run_enrichment
    from src.manifest import create_manifest
    from src.workspace import create_word_folder
    from src.slugify import slugify, language_to_code

    job_id = job["id"]
    user_id = job["user_id"]
    deck_id = job["deck_id"]
    target_language = job["target_language"]

    log.info(
        "bootstrap: job=%s user=%s deck=%s lang=%s",
        job_id, user_id, deck_id, target_language,
    )

    def _read_deck():
        return (
            sb.table("decks")
              .select("deck_type")
              .eq("id", deck_id)
              .maybe_single()
              .execute()
        )
    try:
        deck_resp = await asyncio.to_thread(_read_deck)
        deck = getattr(deck_resp, "data", None) or {}
    except Exception as e:
        log.warning("bootstrap: deck_type read failed deck=%s: %s", deck_id, e)
        deck = {}
    deck_type = str(deck.get("deck_type") or "video").lower()

    # Profile + settings merge
    def _read_profile():
        return (
            sb.table("language_profiles")
              .select("*")
              .eq("language", target_language)
              .eq("is_active", True)
              .limit(1)
              .execute()
        )
    profile_resp = await asyncio.to_thread(_read_profile)
    profile_rows = list(getattr(profile_resp, "data", None) or [])
    profile_settings: dict[str, Any] = {}
    profile_name: Optional[str] = None
    if profile_rows:
        profile_settings = profile_rows[0].get("settings") or {}
        profile_name = profile_rows[0].get("name")

    from job_runner import merge_settings
    settings_override = job.get("settings_override") or {}
    merged = merge_settings(
        profile_settings,
        job.get("art_style"),
        job.get("movie_override"),
        settings_override=settings_override,
    )

    # Load words for this job. New rows have generation_job_id; legacy rows
    # remain NULL and fall back to the original deck-wide lookup.
    def _read_owned_words():
        return (
            sb.table("words")
              .select("*")
              .eq("generation_job_id", job_id)
              .eq("status", "pending")
              .order("created_at")
              .execute()
        )

    def _read_legacy_words():
        return (
            sb.table("words")
              .select("*")
              .eq("deck_id", deck_id)
              .is_("generation_job_id", "null")
              .eq("status", "pending")
              .order("created_at")
              .execute()
        )

    words_resp = await asyncio.to_thread(_read_owned_words)
    words = list(getattr(words_resp, "data", None) or [])
    if not words:
        words_resp = await asyncio.to_thread(_read_legacy_words)
        words = list(getattr(words_resp, "data", None) or [])
    if not words:
        raise RuntimeError("no pending words found for deck")

    # HIGH-3: transition pre_bootstrap/pending -> enrichment via
    # transition_stage so a word in `cancelling` is left alone. Phase 1B's
    # submit_generation RPC creates words in pre_bootstrap to keep Source 3
    # from observing them before bootstrap prepares disk state.
    eligible_words: list[dict[str, Any]] = []
    enrichment_word_ids: list[str] = []
    for w in words:
        ok = await state.transition_stage(
            sb, w["id"],
            new_stage="enrichment",
            allowed_prior=["pre_bootstrap", "pending"],
            increment_attempts=False,
        )
        if ok:
            eligible_words.append(w)
            enrichment_word_ids.append(w["id"])
        else:
            log.info(
                "bootstrap: skipping word=%s — not in pending (was %s)",
                w["id"], w.get("current_stage"),
            )

    if not eligible_words:
        raise RuntimeError("no words eligible for enrichment after guards")

    words = eligible_words

    # Base language
    def _read_base_lang():
        return (
            sb.table("profiles")
              .select("base_language")
              .eq("id", user_id)
              .single()
              .execute()
        )
    try:
        base_resp = await asyncio.to_thread(_read_base_lang)
        base_language = (getattr(base_resp, "data", None) or {}).get(
            "base_language", "English",
        )
    except Exception:
        base_language = "English"

    # Enrichment (single LLM call)
    llm_model = merged.get("concept", {}).get("llm_model", "deepseek/deepseek-v3.2")
    try:
        enrichment_results = await run_enrichment(
            words, target_language, base_language, llm_model,
        )
    except Exception:
        rolled_back = 0
        for word_id in enrichment_word_ids:
            try:
                ok = await state.transition_stage(
                    sb, word_id,
                    new_stage="pending",
                    allowed_prior=["enrichment"],
                    increment_attempts=False,
                )
                if ok:
                    rolled_back += 1
            except Exception as rollback_err:
                log.warning(
                    "feeder/source1: enrichment rollback failed for word=%s job=%s: %s",
                    word_id, job_id, rollback_err,
                )
        log.info(
            "feeder/source1: rolled back %d words from enrichment to pending for job=%s",
            rolled_back, job_id,
        )
        raise
    enrichment_map: dict[str, dict[str, Any]] = {}
    for e in enrichment_results or []:
        enrichment_map[(e.get("input_word") or "").lower()] = e

    # Write enrichment to Supabase
    for word_rec in words:
        e = enrichment_map.get((word_rec.get("word") or "").lower(), {})
        original_word = word_rec.get("word") or ""
        is_phrase = " " in original_word.strip()

        raw_tags = e.get("tags", "")
        tags_str = ", ".join(str(t) for t in raw_tags) if isinstance(raw_tags, list) else (raw_tags or "")

        update_data: dict[str, Any] = {
            "translation": e.get("translation", ""),
            "bridge_mnemonic": e.get("bridge_mnemonic", "") or "",
            "mnemonic": e.get("mnemonic", "") or "",
            "etymology": e.get("etymology", ""),
            "dominant_emotional_reading": e.get("dominant_emotional_reading", "") or "",
            "composition_hint": e.get("composition_hint") or None,
            "treatment_hint": e.get("treatment_hint") or None,
            "pos": e.get("pos", ""),
            "article": e.get("article"),
            "synonyms": e.get("synonyms", "") or "",
            "ipa": e.get("ipa", "") or "",
            "example": e.get("example", "") or "",
            "example_gloss": e.get("example_gloss", "") or "",
            "tags": tags_str,
        }
        if not is_phrase:
            update_data["word"] = e.get("word_target", original_word)

        def _write(u=update_data, wid=word_rec["id"]):
            return sb.table("words").update(u).eq("id", wid).execute()
        await asyncio.to_thread(_write)

    # Workspace + settings-defaults
    workspace_path = create_job_workspace(user_id=user_id, deck_id=deck_id)
    save_defaults(workspace_path, merged)

    def _mark_profile():
        return (
            sb.table("generation_jobs")
              .update({"profile_used": profile_name})
              .eq("id", job_id)
              .execute()
        )
    try:
        await asyncio.to_thread(_mark_profile)
    except Exception as e:
        log.warning("bootstrap: profile_used write failed: %s", e)

    lang_code = language_to_code(target_language)
    suno_settings = merged.get("suno", {})
    suno_enabled = bool(suno_settings.get("enabled", False))

    # HIGH-2 ordering invariant: disk FIRST, Supabase `pending` LAST.
    #
    # For each word:
    #   1. Compute slug.
    #   2. Write word_slug + music_state to Supabase (does NOT set
    #      current_stage='pending' yet).
    #   3. Create word dir + manifest on disk. If a stale manifest exists
    #      from a prior bootstrap attempt, delete it first so enrichment
    #      data on disk matches Supabase.
    #   4. Only after disk state is ready, transition current_stage to
    #      'pending'. Source 3 cannot observe a "ready pending" row until
    #      this final transition.
    prepared: list[tuple[dict[str, Any], Path, str]] = []

    for word_rec in words:
        original_word = word_rec.get("word") or ""
        is_phrase = " " in original_word.strip()
        e = enrichment_map.get(original_word.lower(), {})
        if is_phrase:
            raw_word_text = original_word
        else:
            raw_word_text = e.get("word_target", original_word)
        word_text = re.sub(r"\s+", " ", raw_word_text.strip()) if isinstance(raw_word_text, str) else raw_word_text
        input_type = "phrase" if " " in word_text else "word"
        word_slug = slugify(word_text)
        translation = e.get("translation", "")
        raw_tags = e.get("tags", "")
        tags_str = ", ".join(str(t) for t in raw_tags) if isinstance(raw_tags, list) else (raw_tags or "")

        # Step 2: slug + music_state to Supabase (NOT current_stage)
        def _save_slug(
            wid=word_rec["id"],
            ws=word_slug,
            ms=("pending" if suno_enabled else "disabled"),
        ):
            return (
                sb.table("words")
                  .update({
                      "word_slug": ws,
                      "music_state": ms,
                  })
                  .eq("id", wid)
                  .execute()
            )
        await asyncio.to_thread(_save_slug)
        word_rec["word_slug"] = word_slug
        word_rec["music_state"] = "pending" if suno_enabled else "disabled"

        # Step 3: disk. Overwrite stale manifest.
        word_dir = create_word_folder(workspace_path, word_slug)
        manifest_file = word_dir / "manifest.json"
        if manifest_file.exists():
            try:
                manifest_file.unlink()
            except OSError as _unlink_err:
                log.warning(
                    "bootstrap: failed to unlink stale manifest %s: %s",
                    manifest_file, _unlink_err,
                )

        enrichment_data = {
            "pos": e.get("pos"),
            "article": e.get("article"),
            "etymology": e.get("etymology"),
            "bridge_mnemonic": e.get("bridge_mnemonic", "") or "",
            "mnemonic": e.get("mnemonic", "") or "",
            "dominant_emotional_reading": e.get("dominant_emotional_reading", "") or "",
            "composition_hint": e.get("composition_hint") or None,
            "treatment_hint": e.get("treatment_hint") or None,
            "ipa": e.get("ipa", "") or "",
            "example": e.get("example", "") or "",
            "example_gloss": e.get("example_gloss", "") or "",
            "synonyms": e.get("synonyms", "") or "",
            "tags": tags_str,
        }
        identity = {
            "word_id": word_rec.get("id"),
            "deck_id": word_rec.get("deck_id"),
            "user_id": word_rec.get("user_id"),
            "job_id": word_rec.get("generation_job_id"),
            "attempt": None,
        }
        create_manifest(
            word_dir=word_dir,
            word_original=word_text,
            word_slug=word_slug,
            translation=translation,
            language=target_language,
            language_code=lang_code,
            enrichment_data=enrichment_data,
            input_type=input_type,
            identity=identity,
        )

        prepared.append((word_rec, word_dir, word_slug))

    # Step 4: transition each word to pending AFTER disk is ready.
    # Use transition_stage so we respect cancelling guard.
    exposed: list[dict[str, Any]] = []
    for word_rec, _word_dir, _slug in prepared:
        ok = await state.transition_stage(
            sb, word_rec["id"],
            new_stage="pending",
            allowed_prior=["enrichment"],
            increment_attempts=False,
        )
        if not ok:
            log.info(
                "bootstrap: word=%s could not exit enrichment (cancelling/raced)",
                word_rec["id"],
            )
            continue
        word_rec["current_stage"] = "pending"
        exposed.append(word_rec)

    if not exposed:
        raise RuntimeError("no words landed in pending after bootstrap")

    if deck_type == "card":
        if card_queue is None:
            raise RuntimeError("card deck requires card_queue")
        target_queue = card_queue
        queue_name = "card"
    else:
        if deck_type != "video":
            log.info(
                "bootstrap: deck=%s has deck_type=%r; falling back to video queue",
                deck_id, deck_type,
            )
        target_queue = upstream_queue
        queue_name = "upstream"

    # Push words in deck order. `put()` blocks on capacity.
    for word_rec in exposed:
        await target_queue.put(word_rec)

    log.info(
        "bootstrap: pushed %d words to %s queue (deck=%s type=%s)",
        len(exposed), queue_name, deck_id, deck_type,
    )


def make_bootstrap_callable(
    sb,
    *,
    upstream_queue: asyncio.Queue,
    card_queue: asyncio.Queue,
):
    async def _bootstrap(job: dict[str, Any]) -> None:
        await bootstrap_job(
            sb,
            job,
            upstream_queue=upstream_queue,
            card_queue=card_queue,
        )
    return _bootstrap
