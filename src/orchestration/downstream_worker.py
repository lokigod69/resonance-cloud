"""Downstream worker: branches on music_state.

Design ref: §6.4

Exclusive claim (CRIT-2): the downstream worker does NOT claim into
post_video_queued — it transitions DIRECTLY to the branch target in a single
guarded UPDATE. This is the only way to enforce exclusivity, because a
self-edge (post_video_queued -> post_video_queued) leaves the WHERE predicate
satisfied for a second replica.

Branch target, selected from a freshly-read music_state:
    baked              -> uploading   (skip bake/assembly/bookend)
    submitted|pending  -> suno_bake   (run bake; if 'pending', inline submit first)
    disabled|submit_failed|bake_failed -> assembly  (placeholder path)

Submit-failure routing (CRIT-5): when music_state='pending', the worker calls
submit_song inline. If the inline submit fails, music_state becomes
'submit_failed' and the worker routes OUT of suno_bake to the placeholder
path before running any bake.

Baked-branch manifest reconstruction (HIGH-1): when crash-recovery lands a
baked word back in post_video_queued, the in-memory `_suno_ab_manifests`
is gone. The worker re-reads the word's manifest.json from disk and publishes
it as the A variant. B is best-effort (the disk state after a successful
bake reflects B by construction, so this degrades to single-variant publish
per §6.4 "support recovery" guidance).
"""

from __future__ import annotations

import asyncio
import logging
import os
from pathlib import Path
from typing import Any, Optional

from src.services.music_lyrics_store import persist_video_pipeline_lyrics_best_effort

from . import retry, state

log = logging.getLogger(__name__)


DOWNSTREAM_CONCURRENCY = int(os.getenv("DOWNSTREAM_CONCURRENCY", "2"))


def _branch_target_for(music_state: Optional[str]) -> str:
    """Select the current_stage the claim UPDATE will transition to."""
    if music_state == "baked":
        return "uploading"
    if music_state in ("submitted", "pending"):
        return "suno_bake"
    return "assembly"


class DownstreamWorker:
    def __init__(
        self,
        sb,
        *,
        post_video_queue: asyncio.Queue,
        worker_index: int = 0,
    ):
        self.sb = sb
        self.post_video_queue = post_video_queue
        self.worker_index = worker_index
        self._stopped = asyncio.Event()
        self._busy = False

    @property
    def busy(self) -> bool:
        """Metric: is this worker currently processing a word? (§13 MED-3)"""
        return self._busy

    def stop(self) -> None:
        self._stopped.set()

    async def run(self) -> None:
        log.info("downstream_worker[%d]: starting", self.worker_index)
        while not self._stopped.is_set():
            try:
                word = await asyncio.wait_for(
                    self.post_video_queue.get(), timeout=1.0,
                )
            except asyncio.TimeoutError:
                continue
            self._busy = True
            word_id = word.get("id")
            try:
                await self._process_word(word)
            except Exception as e:
                log.error(
                    "downstream_worker[%d]: unhandled error word=%s: %s",
                    self.worker_index, word_id, e, exc_info=True,
                )
            finally:
                # MED-3: emit StageTimer for every terminal path.
                timer = state.drop_timer(word_id) if word_id else None
                if timer and timer.entries:
                    log.info(
                        "downstream_worker[%d]: word=%s durations_ms=%s attempts=%s",
                        self.worker_index, word_id,
                        timer.durations_ms(), timer.attempts,
                    )
                self._busy = False
                self.post_video_queue.task_done()
        log.info("downstream_worker[%d]: stopped", self.worker_index)

    # -------------------------------------------------------------------
    async def _process_word(self, word: dict[str, Any]) -> None:
        word_id = word["id"]
        state.set_log_context(word_id=word_id, stage="post_video_queued")
        state.timer_for(word_id)

        # Re-read to get fresh music_state.
        fresh = await state.fetch_word(self.sb, word_id)
        if fresh is None:
            log.warning("downstream_worker: word=%s vanished", word_id)
            state.clear_log_context()
            return

        music_state = fresh.get("music_state", "pending")
        target = _branch_target_for(music_state)

        # CRIT-2: atomic claim transitions OUT of post_video_queued. Exclusive:
        # a second replica that reaches the same RPC call with the same
        # (expected_prior, new_stage) pair will see the row no longer in
        # post_video_queued and rowcount=0.
        claimed = await state.transition_stage(
            self.sb, word_id,
            new_stage=target,
            allowed_prior=["post_video_queued"],
            increment_attempts=True,
        )
        if not claimed:
            log.info(
                "downstream_worker: word=%s claim failed (raced/cancelled)",
                word_id,
            )
            state.clear_log_context()
            return

        state.set_log_context(stage=target)
        state.timer_for(word_id).enter(target)

        fresh = await state.fetch_word(self.sb, word_id) or fresh

        from src.storage import get_job_workspace_path
        workspace_path = get_job_workspace_path(
            user_id=fresh["user_id"], deck_id=fresh["deck_id"],
        )

        word_slug = fresh.get("word_slug")
        if not word_slug:
            await retry.finalize_failure(
                self.sb, word_id=word_id, user_id=fresh["user_id"],
                failed_stage=target,
            )
            state.clear_log_context()
            return

        import os
        log.info(
            "DIAG downstream_worker workspace resolution: "
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
                    "DIAG downstream_worker workspace listing: word_slug=%s contents=%s",
                    word_slug, os.listdir(workspace_path)[:30],
                )
                word_dir = workspace_path / word_slug
                log.info(
                    "DIAG downstream_worker word_dir: path=%s exists=%s",
                    word_dir, word_dir.exists(),
                )
                if word_dir.exists():
                    log.info(
                        "DIAG downstream_worker word_dir listing: contents=%s",
                        os.listdir(word_dir)[:30],
                    )
            except Exception as e:
                log.warning("DIAG downstream_worker listing error: %s", e)

        # Dispatch into the branch. Each branch is responsible for preparing
        # the word state up to `current_stage='uploading'`, after which
        # _upload_and_complete takes over.
        ok = False
        if music_state == "baked":
            # Word is already in 'uploading' (the claim transitioned it
            # directly). Reconstruct AB manifests from disk before upload.
            ok = await self._prepare_baked_upload(fresh, workspace_path, word_slug)
        elif music_state in ("submitted", "pending"):
            ok = await self._run_suno_bake(
                fresh, workspace_path, word_slug,
                inline_submit=(music_state == "pending"),
            )
        else:  # disabled, submit_failed, bake_failed
            ok = await self._run_placeholder_ab(fresh, workspace_path, word_slug)

        if not ok:
            state.clear_log_context()
            return

        await self._upload_and_complete(fresh, workspace_path, word_slug)
        state.clear_log_context()

    # -------------------------------------------------------------------
    # Branch: baked — reconstruct AB manifests from disk (HIGH-1)
    # -------------------------------------------------------------------
    async def _prepare_baked_upload(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
    ) -> bool:
        """After crash-recovery, in-memory suno_ab_manifests is lost.

        Reconstruct from disk: read the current manifest.json as variant A.
        Variant B is degraded to None — the manifest on disk only holds one
        snapshot after bake completes, and distinguishing A/B from lineage
        is out of scope for v1 (§6.4 support-recovery note).

        If the manifest file is unreadable (disk lost / workspace wiped),
        fail the word with failed_stage='uploading' — runbook note in §6.4.
        """
        from src.manifest import read_manifest

        word_dir = workspace_path / word_slug
        try:
            manifest = read_manifest(word_dir)
        except Exception as e:
            log.error(
                "downstream_worker: baked recovery — manifest unreadable "
                "word=%s dir=%s: %s",
                word["id"], word_dir, e,
            )
            await retry.finalize_failure(
                self.sb, word_id=word["id"], user_id=word["user_id"],
                failed_stage="uploading",
            )
            return False

        word["_suno_ab_manifests"] = {"a": manifest}
        log.info(
            "downstream_worker: baked recovery — reconstructed single-variant "
            "manifest for word=%s (A only; B degraded per §6.4)",
            word["id"],
        )
        return True

    # -------------------------------------------------------------------
    # Branch: suno_bake
    # -------------------------------------------------------------------
    async def _run_suno_bake(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
        *,
        inline_submit: bool,
    ) -> bool:
        """Run Suno bake. Returns True on success (word in 'uploading');
        False if the word was rerouted to the placeholder path (word now in
        'assembly') and has already run assembly+bookend via the placeholder
        path.
        """
        word_id = word["id"]

        # Inline submit first if music_state was 'pending'.
        if inline_submit:
            await self._inline_submit(word, workspace_path, word_slug)
            fresh = await state.fetch_word(self.sb, word_id) or word

            # CRIT-5: if submit failed, route OUT of suno_bake to the
            # placeholder path rather than running bake on a missing task.
            if fresh.get("music_state") == "submit_failed":
                log.info(
                    "downstream_worker: inline submit failed for word=%s; "
                    "rerouting suno_bake -> assembly (placeholder path)",
                    word_id,
                )
                ok = await state.transition_stage(
                    self.sb, word_id,
                    new_stage="assembly",
                    allowed_prior=["suno_bake"],
                    increment_attempts=True,
                )
                if not ok:
                    log.warning(
                        "downstream_worker: word=%s failed to reroute "
                        "suno_bake -> assembly",
                        word_id,
                    )
                    return False
                state.set_log_context(stage="assembly")
                state.timer_for(word_id).enter("assembly")
                word = fresh
                return await self._run_ab_pipeline(
                    word, workspace_path, word_slug, entered_at="assembly",
                )

            # Also treat any other terminal/invalid music_state as reroute.
            if fresh.get("music_state") not in ("submitted",):
                log.warning(
                    "downstream_worker: word=%s unexpected music_state after "
                    "inline submit: %s — rerouting to placeholder",
                    word_id, fresh.get("music_state"),
                )
                ok = await state.transition_stage(
                    self.sb, word_id,
                    new_stage="assembly",
                    allowed_prior=["suno_bake"],
                    increment_attempts=True,
                )
                if not ok:
                    return False
                state.set_log_context(stage="assembly")
                state.timer_for(word_id).enter("assembly")
                return await self._run_ab_pipeline(
                    fresh, workspace_path, word_slug, entered_at="assembly",
                )
            word = fresh

        # Run the bake. The budget is handled here (suno_bake RPC is not
        # retried by the pipeline layer; it's a multi-call helper).
        from src.services.suno_bakein import bake_suno_into_word
        from src.settings import load_defaults

        defaults = load_defaults(workspace_path)
        suno_settings = defaults.get("suno", {})
        bookend_defaults = defaults.get("bookend", {})
        word_dir = workspace_path / word_slug

        bake_result: dict[str, Any] = {}
        bake_ok = False
        budget = retry.total_budget("suno_bake")
        for attempt in range(1, budget + 1):
            if attempt > 1:
                await retry.backoff()
                bumped = await retry.bump_same_stage_or_release(
                    self.sb, word_id=word_id, stage="suno_bake", logger=log,
                )
                if not bumped:
                    return False
            try:
                bake_result = await bake_suno_into_word(
                    self.sb,
                    workspace_path=workspace_path,
                    word_dir=word_dir,
                    word_slug=word_slug,
                    word_record=word,
                    suno_settings=suno_settings,
                    bookend_defaults=bookend_defaults,
                    skip_suno_guard=True,
                    max_retries=0,
                )
                if bake_result.get("success"):
                    bake_ok = True
                    break
                log.warning(
                    "downstream_worker: bake attempt %d/%d failed word=%s: %s",
                    attempt, budget, word_id, bake_result.get("error"),
                )
            except Exception as e:
                log.warning(
                    "downstream_worker: bake attempt %d/%d raised word=%s: %s",
                    attempt, budget, word_id, e,
                )

        if bake_ok:
            word["_suno_ab_manifests"] = bake_result.get("suno_ab_manifests", {})
            ok = await state.transition_stage(
                self.sb, word_id,
                new_stage="uploading",
                allowed_prior=["suno_bake"],
                increment_attempts=True,
                extra={"music_state": "baked"},
            )
            if not ok:
                log.warning(
                    "downstream_worker: word=%s couldn't transition "
                    "suno_bake -> uploading",
                    word_id,
                )
                return False
            state.set_log_context(stage="uploading")
            state.timer_for(word_id).enter("uploading")
            return True

        # Bake exhausted → fall through to placeholder path. Single atomic
        # UPDATE sets both music_state=bake_failed AND current_stage=assembly.
        log.info(
            "downstream_worker: bake exhausted word=%s; falling through to assembly",
            word_id,
        )
        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage="assembly",
            allowed_prior=["suno_bake"],
            increment_attempts=True,
            extra={"music_state": "bake_failed"},
        )
        if not ok:
            return False
        state.set_log_context(stage="assembly")
        state.timer_for(word_id).enter("assembly")
        return await self._run_ab_pipeline(
            word, workspace_path, word_slug, entered_at="assembly",
        )

    # -------------------------------------------------------------------
    # Branch: placeholder (disabled/submit_failed/bake_failed already landed
    # the claim in 'assembly' directly).
    # -------------------------------------------------------------------
    async def _run_placeholder_ab(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
    ) -> bool:
        return await self._run_ab_pipeline(
            word, workspace_path, word_slug, entered_at="assembly",
        )

    # -------------------------------------------------------------------
    # Inline Suno submit (music_state=='pending')
    # -------------------------------------------------------------------
    async def _inline_submit(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
    ) -> None:
        from src.settings import load_defaults
        from src.suno import read_concept_data, submit_song

        defaults = load_defaults(workspace_path)
        suno_settings = defaults.get("suno", {})
        if not suno_settings.get("enabled", False):
            await state.mark_music_state(self.sb, word["id"], music_state="disabled")
            return

        word_dir = workspace_path / word_slug
        try:
            concept_data = read_concept_data(word_dir)
        except Exception as e:
            log.warning(
                "downstream_worker: inline submit — concept missing word=%s: %s",
                word["id"], e,
            )
            await state.mark_music_state(
                self.sb, word["id"], music_state="submit_failed",
            )
            return

        try:
            try:
                await persist_video_pipeline_lyrics_best_effort(
                    self.sb,
                    word=word,
                    concept_data=concept_data,
                )
            except Exception as lyrics_exc:
                log.warning(
                    "downstream_worker: music lyrics persist failed word=%s: %s",
                    word["id"],
                    lyrics_exc,
                    exc_info=True,
                )

            await submit_song(
                word["deck_id"],
                word_slug,
                concept_data,
                word_id=word["id"],
                user_id=word["user_id"],
                job_id=word.get("generation_job_id"),
            )
            await state.mark_music_state(self.sb, word["id"], music_state="submitted")
        except Exception as e:
            log.warning(
                "downstream_worker: inline submit failed word=%s: %s",
                word["id"], e,
            )
            await state.mark_music_state(
                self.sb, word["id"], music_state="submit_failed",
            )

    # -------------------------------------------------------------------
    # A/B assembly + bookend (placeholder / bake-failed / submit-failed path)
    # -------------------------------------------------------------------
    async def _run_ab_pipeline(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
        *,
        entered_at: str,  # 'assembly' — caller already transitioned us here
    ) -> bool:
        from src.manifest import read_manifest, update_selection
        from src.settings import load_defaults

        word_id = word["id"]
        word_dir = workspace_path / word_slug

        defaults = load_defaults(workspace_path)
        suno_settings = defaults.get("suno", {})
        suno_enabled = bool(suno_settings.get("enabled", False))

        manifest_data = read_manifest(word_dir)
        takes = self._get_song_takes(word_dir, manifest_data)
        take_a = takes[0] if takes else None
        take_b = None if suno_enabled else (takes[1] if len(takes) >= 2 else None)

        bookend_defaults = defaults.get("bookend", {})
        bookend_overrides = manifest_data.settings.get("bookend", {})
        bookend_on = {**bookend_defaults, **bookend_overrides}.get("enabled", True)

        assembled_labels: set[str] = set()
        assembly_finals: dict[str, str] = {}
        ab_manifests: dict[str, Any] = {}

        # Pass 1: assemblies
        for label, take in [("a", take_a), ("b", take_b)]:
            if take is None:
                continue
            update_selection(word_dir, "song", take)

            try:
                assembly_ok = await self._run_stage_with_budget(
                    workspace_path, word_slug, "assembly",
                    stage_key="assembly",
                    word_id=word_id,
                )
            except retry.RetryReleased:
                return False

            if assembly_ok:
                assembled_labels.add(label)
                assembly_finals[label] = read_manifest(word_dir).selected.final or ""
            elif label == "a":
                log.error("downstream_worker: A assembly failed word=%s", word_id)
                await retry.finalize_failure(
                    self.sb, word_id=word_id, user_id=word["user_id"],
                    failed_stage="assembly",
                )
                return False
            else:
                log.warning(
                    "downstream_worker: B assembly failed — continuing A only",
                )

        # Bookend pass
        if bookend_on:
            ok = await state.transition_stage(
                self.sb, word_id,
                new_stage="bookend",
                allowed_prior=["assembly"],
                increment_attempts=True,
            )
            if not ok:
                log.warning(
                    "downstream_worker: word=%s couldn't enter bookend", word_id,
                )
                return False
            state.set_log_context(stage="bookend")
            state.timer_for(word_id).enter("bookend")

            for label, take in [("a", take_a), ("b", take_b)]:
                if label not in assembled_labels:
                    continue
                if label in assembly_finals and assembly_finals[label]:
                    update_selection(word_dir, "final", assembly_finals[label])

                try:
                    bookend_ok = await self._run_stage_with_budget(
                        workspace_path, word_slug, "bookend",
                        stage_key="bookend",
                        word_id=word_id,
                    )
                except retry.RetryReleased:
                    return False
                if not bookend_ok:
                    log.warning(
                        "downstream_worker: bookend failed label=%s word=%s "
                        "— assembly fallback at upload",
                        label, word_id,
                    )
                ab_manifests[label] = read_manifest(word_dir)
        else:
            for label in assembled_labels:
                if label in assembly_finals and assembly_finals[label]:
                    update_selection(word_dir, "final", assembly_finals[label])
                ab_manifests[label] = read_manifest(word_dir)

        word["_ab_manifests"] = ab_manifests
        word["_take_a"] = take_a
        word["_take_b"] = take_b

        allowed_prior = ["bookend"] if bookend_on else ["assembly"]
        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage="uploading",
            allowed_prior=allowed_prior,
            increment_attempts=True,
        )
        if not ok:
            log.warning(
                "downstream_worker: word=%s couldn't enter uploading", word_id,
            )
            return False
        state.set_log_context(stage="uploading")
        state.timer_for(word_id).enter("uploading")
        return True

    async def _run_stage_with_budget(
        self,
        workspace_path: Path,
        word_slug: str,
        stage: str,
        *,
        stage_key: str,
        word_id: str,
    ) -> bool:
        from src.pipeline import run_stage

        async def _once():
            await run_stage(workspace_path, word_slug, stage)

        async def _bump():
            return await retry.bump_same_stage_or_release(
                self.sb, word_id=word_id, stage=stage_key, logger=log,
            )

        try:
            await retry.run_stage_with_budget(
                stage=stage_key, run_once=_once, bump_attempt_counter=_bump,
            )
            return True
        except retry.BudgetExhausted as e:
            log.warning(
                "downstream_worker: %s budget exhausted word=%s: %s",
                stage, word_id, e,
            )
            return False

    # -------------------------------------------------------------------
    # Upload + complete (shared across all branches)
    # -------------------------------------------------------------------
    async def _upload_and_complete(
        self,
        word: dict[str, Any],
        workspace_path: Path,
        word_slug: str,
    ) -> bool:
        from src.services.publishing import upload_ab_results
        from src.services.metadata import collect_word_metadata
        from src.manifest import read_manifest

        word_id = word["id"]
        state.set_log_context(stage="uploading")

        fresh = await state.fetch_word(self.sb, word_id) or word
        word_dir = workspace_path / word_slug

        suno_ab = word.get("_suno_ab_manifests") or {}
        ab_manifests = word.get("_ab_manifests") or {}

        if suno_ab:
            manifest_a = suno_ab.get("a") or read_manifest(word_dir)
            manifest_b = suno_ab.get("b")
        else:
            manifest_a = ab_manifests.get("a") or read_manifest(word_dir)
            manifest_b = ab_manifests.get("b")

        uploaded = False
        budget = retry.total_budget("uploading")
        for attempt in range(1, budget + 1):
            if attempt > 1:
                await retry.backoff()
                bumped = await retry.bump_same_stage_or_release(
                    self.sb, word_id=word_id, stage="uploading", logger=log,
                )
                if not bumped:
                    return False
            try:
                uploaded = await upload_ab_results(
                    self.sb,
                    fresh, word_dir, fresh["user_id"], fresh["deck_id"], word_slug,
                    manifest_a=manifest_a, manifest_b=manifest_b,
                )
                if uploaded:
                    break
                log.warning(
                    "downstream_worker: upload attempt %d/%d returned False word=%s",
                    attempt, budget, word_id,
                )
            except Exception as e:
                log.warning(
                    "downstream_worker: upload attempt %d/%d raised word=%s: %s",
                    attempt, budget, word_id, e,
                )

        if not uploaded:
            await retry.finalize_failure(
                self.sb, word_id=word_id, user_id=fresh["user_id"],
                failed_stage="uploading",
            )
            return False

        # Collect + write generation metadata (regression restoration:
        # pre-refactor 08e9726^:job_runner.py:627-680).
        word_metadata: Optional[dict[str, Any]] = None
        try:
            timer = state.timer_for(word_id)
            pipeline_duration = sum(timer.durations_ms().values()) / 1000.0
            profile_used = await self._read_profile_used(fresh)
            word_metadata = collect_word_metadata(
                word_dir, profile_used, pipeline_duration,
            )
        except Exception as e:
            log.warning(
                "downstream_worker: metadata collection failed word=%s: %s",
                word_id, e,
            )

        if word_metadata:
            suno_ab = word.get("_suno_ab_manifests") or {}
            ab_manifests_dict = word.get("_ab_manifests") or {}
            take_a = word.get("_take_a")
            take_b = word.get("_take_b")
            word_metadata["ab_takes"] = {
                "a": "suno_a" if suno_ab else take_a,
                "b": ("suno_b" if "b" in suno_ab else None)
                     if suno_ab
                     else (take_b if take_b and "b" in ab_manifests_dict else None),
            }

            def _meta_write(wid=word_id, m=word_metadata):
                return (
                    self.sb.table("words")
                      .update({"metadata": m})
                      .eq("id", wid)
                      .execute()
                )
            try:
                await asyncio.to_thread(_meta_write)
            except Exception as e:
                log.warning(
                    "downstream_worker: metadata write failed word=%s: %s",
                    word_id, e,
                )

        ok = await state.transition_stage(
            self.sb, word_id,
            new_stage="complete",
            allowed_prior=["uploading"],
            increment_attempts=False,
        )
        if not ok:
            log.warning(
                "downstream_worker: word=%s couldn't transition to complete",
                word_id,
            )
            return False

        await self._bump_job_words_completed(fresh)
        return True

    # -------------------------------------------------------------------
    def _get_song_takes(self, word_dir: Path, manifest_data: Any) -> list[str]:
        current_song = manifest_data.selected.song
        if not current_song or "/" not in current_song:
            return [current_song] if current_song else []
        run_dir_name = current_song.split("/")[0]
        run_dir = word_dir / "songs" / run_dir_name
        if not run_dir.exists():
            return [current_song]
        takes = sorted(
            f"{run_dir_name}/{f.name}"
            for f in run_dir.iterdir()
            if f.suffix in (".flac", ".wav", ".mp3") and f.name.startswith("take_")
        )
        return takes if takes else [current_song]

    async def _read_profile_used(self, word: Optional[dict[str, Any]]) -> Optional[str]:
        if not word:
            return None

        generation_job_id = word.get("generation_job_id")
        if generation_job_id:
            def _read_owned():
                return (
                    self.sb.table("generation_jobs")
                      .select("profile_used")
                      .eq("id", generation_job_id)
                      .execute()
                )
            try:
                resp = await asyncio.to_thread(_read_owned)
            except Exception:
                return None
            rows = list(getattr(resp, "data", None) or [])
            if not rows:
                return None
            return rows[0].get("profile_used")

        deck_id = word.get("deck_id")
        if not deck_id:
            return None

        def _read():
            return (
                self.sb.table("generation_jobs")
                  .select("profile_used")
                  .eq("deck_id", deck_id)
                  .eq("status", "processing")
                  .order("created_at", desc=True)
                  .limit(1)
                  .execute()
            )
        try:
            resp = await asyncio.to_thread(_read)
        except Exception:
            return None
        rows = list(getattr(resp, "data", None) or [])
        if not rows:
            return None
        return rows[0].get("profile_used")

    async def _bump_job_words_completed(self, word: Optional[dict[str, Any]]) -> None:
        if not word:
            return

        generation_job_id = word.get("generation_job_id")
        deck_id = word.get("deck_id")

        def _read_owned():
            return (
                self.sb.table("generation_jobs")
                  .select("id, words_completed")
                  .eq("id", generation_job_id)
                  .execute()
            )

        def _read_legacy():
            return (
                self.sb.table("generation_jobs")
                  .select("id, words_completed")
                  .eq("deck_id", deck_id)
                  .eq("status", "processing")
                  .order("created_at", desc=True)
                  .limit(1)
                  .execute()
            )
        try:
            if generation_job_id:
                resp = await asyncio.to_thread(_read_owned)
            elif deck_id:
                resp = await asyncio.to_thread(_read_legacy)
            else:
                return
        except Exception:
            return
        rows = list(getattr(resp, "data", None) or [])
        if not rows:
            return
        row = rows[0]
        job_id = row["id"]
        current = row.get("words_completed") or 0

        def _bump():
            return (
                self.sb.table("generation_jobs")
                  .update({"words_completed": current + 1})
                  .eq("id", job_id)
                  .eq("status", "processing")
                  .execute()
            )
        try:
            await asyncio.to_thread(_bump)
        except Exception as e:
            log.debug("downstream_worker: words_completed bump failed: %s", e)


def make_downstream_workers(
    sb, *, post_video_queue: asyncio.Queue,
) -> list["DownstreamWorker"]:
    return [
        DownstreamWorker(
            sb, post_video_queue=post_video_queue, worker_index=i,
        )
        for i in range(DOWNSTREAM_CONCURRENCY)
    ]
