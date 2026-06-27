"""Dedicated worker for isolated song-only generation jobs."""

from __future__ import annotations

import asyncio
from datetime import datetime, timedelta, timezone
import logging
import os
from pathlib import Path
from typing import Any

from src.services.lyrics_translation import translate_song_lyrics
from src.services.music_lyrics_store import (
    translation_result_to_columns,
    upsert_music_lyrics_row,
)
from src.services.level_song_concept import build_level_song_concept
from src.services.song_only_concept import build_song_only_concept
from src.services.song_only_suno import (
    download_and_upload_song_audio,
    submit_song_only_task,
)
from src.slugify import language_to_code
from src.storage import get_workspace_root
from src.suno import fetch_existing_task

log = logging.getLogger(__name__)

ACTIVE_STATUSES = ("pending", "processing", "submitted", "polling", "uploading")
MAX_ERROR_MESSAGE_CHARS = 2000


def _response_data(response: Any) -> Any:
    return getattr(response, "data", response)


def _rows(data: Any) -> list[dict[str, Any]]:
    if data is None:
        return []
    if isinstance(data, list):
        return [dict(row) for row in data]
    if isinstance(data, dict):
        return [dict(data)]
    return []


def _now_utc() -> datetime:
    return datetime.now(timezone.utc)


def _parse_timestamp(value: Any) -> datetime | None:
    if not isinstance(value, str) or not value:
        return None
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return None


def _bounded_error(step: str, error: BaseException | str) -> str:
    if isinstance(error, BaseException):
        message = f"{step}: {type(error).__name__}: {error}"
    else:
        message = f"{step}: {error}"
    return message[:MAX_ERROR_MESSAGE_CHARS]


def _metadata(row: dict[str, Any] | None) -> dict[str, Any]:
    value = (row or {}).get("metadata")
    return value if isinstance(value, dict) else {}


def _settings_override(row: dict[str, Any] | None) -> dict[str, Any]:
    direct = (row or {}).get("settings_override")
    if isinstance(direct, dict):
        return direct
    nested = _metadata(row).get("settings_override")
    return nested if isinstance(nested, dict) else {}


def _job_scope(job: dict[str, Any] | None) -> str:
    return "level" if (job or {}).get("scope") == "level" else "word"


def _first_text(*values: Any) -> str | None:
    for value in values:
        if isinstance(value, str) and value.strip():
            return value.strip()
    return None


class MusicOnlyWorker:
    """Poll and process public.music_generation_jobs without pipeline stages."""

    def __init__(
        self,
        sb,
        *,
        poll_interval: float | None = None,
        concurrency: int | None = None,
        workspace_root: Path | None = None,
    ):
        self.sb = sb
        self.poll_interval = (
            float(poll_interval)
            if poll_interval is not None
            else float(os.getenv("MUSIC_ONLY_POLL_INTERVAL", "5"))
        )
        self.concurrency = (
            int(concurrency)
            if concurrency is not None
            else int(os.getenv("MUSIC_ONLY_CONCURRENCY", "1"))
        )
        self.workspace_root = workspace_root or get_workspace_root()
        self._stopped = asyncio.Event()
        self._active: set[asyncio.Task] = set()

    def stop(self) -> None:
        self._stopped.set()

    async def run(self) -> None:
        log.info(
            "music_only: starting poll_interval=%s concurrency=%s",
            self.poll_interval,
            self.concurrency,
        )
        while not self._stopped.is_set():
            try:
                await self.process_once()
            except Exception as exc:
                log.error("music_only: poll loop error: %s", exc, exc_info=True)
            await asyncio.sleep(self.poll_interval)

        if self._active:
            await asyncio.gather(*self._active, return_exceptions=True)
        log.info("music_only: stopped")

    async def process_once(self) -> None:
        jobs = await self._fetch_candidate_jobs()
        if not jobs:
            return

        for job in jobs:
            if len(self._active) >= self.concurrency:
                break
            task = asyncio.create_task(self._process_job(job), name=f"music-only-{job.get('id')}")
            self._active.add(task)
            task.add_done_callback(self._active.discard)

        if self._active:
            await asyncio.gather(*list(self._active), return_exceptions=True)

    async def _fetch_candidate_jobs(self) -> list[dict[str, Any]]:
        def _query():
            return (
                self.sb.table("music_generation_jobs")
                .select("*")
                .in_("status", list(ACTIVE_STATUSES))
                .order("created_at")
                .limit(max(self.concurrency, 1))
                .execute()
            )

        response = await asyncio.to_thread(_query)
        candidates = _rows(_response_data(response))
        return [job for job in candidates if self._is_processable(job)]

    def _is_processable(self, job: dict[str, Any]) -> bool:
        status = job.get("status")
        if status == "pending":
            return True
        if status == "processing":
            if job.get("suno_task_id"):
                return True
            locked_at = _parse_timestamp(job.get("locked_at"))
            return locked_at is None or locked_at < _now_utc() - timedelta(minutes=15)
        if status in ("submitted", "polling"):
            return bool(job.get("suno_task_id"))
        if status == "uploading":
            return bool(job.get("suno_audio_url") or job.get("suno_storage_url"))
        return False

    async def _process_job(self, candidate: dict[str, Any]) -> None:
        job_id = str(candidate["id"])
        job = candidate
        try:
            if job.get("status") in ("pending", "processing") and not job.get("suno_task_id"):
                claimed = await self._claim(job_id)
                if claimed is None:
                    return
                job = claimed
                log.info("music_only: claimed job=%s", job_id)

                scope = _job_scope(job)
                context: dict[str, Any] = {}
                if scope == "level":
                    concept = await asyncio.to_thread(build_level_song_concept, job=job)
                else:
                    context = await self._fetch_context(job)
                    concept = await asyncio.to_thread(
                        build_song_only_concept,
                        job=job,
                        word=context["word"],
                        deck=context.get("deck"),
                    )
                await self._persist_concept(job_id, concept, scope=scope)
                log.info("music_only: concept generated job=%s", job_id)
                if scope == "word":
                    try:
                        await self._persist_generated_lyrics(job, context, concept)
                    except Exception as lyrics_exc:
                        log.warning(
                            "music_only: lyrics persist skipped job=%s word=%s: %s",
                            job_id,
                            job.get("word_id"),
                            lyrics_exc,
                            exc_info=True,
                        )

                task_id = await submit_song_only_task(
                    concept["concept_data"],
                    word_id=str(job.get("word_id")) if job.get("word_id") else None,
                    deck_id=str(job.get("deck_id")) if job.get("deck_id") else None,
                    user_id=str(job.get("user_id")) if job.get("user_id") else None,
                    job_id=job_id,
                )
                await self._mark_submitted(job_id, task_id)
                log.info("music_only: submitted task job=%s task=%s", job_id, task_id)
                job = {
                    **job,
                    "status": "submitted",
                    "suno_task_id": task_id,
                    "concept_artifact": concept["concept_artifact"],
                    "lyrics": _first_text(
                        concept["concept_artifact"].get("suno_lyrics"),
                        concept["concept_artifact"].get("lyrics"),
                        concept["concept_data"].get("lyrics"),
                    ),
                }

            task_id = job.get("suno_task_id")
            if not task_id:
                raise RuntimeError("Job has no suno_task_id after submit phase")

            poll = await fetch_existing_task(
                str(task_id),
                word_id=str(job.get("word_id")) if job.get("word_id") else None,
                deck_id=str(job.get("deck_id")) if job.get("deck_id") else None,
                user_id=str(job.get("user_id")) if job.get("user_id") else None,
                job_id=job_id,
            )
            log.info("music_only: poll job=%s task=%s status=%s", job_id, task_id, poll.get("status"))

            if poll.get("status") == "pending":
                job = {**job, "status": "polling"}
                await self._set_status(job_id, "polling")
                return

            if poll.get("status") != "success":
                await self._fail(job_id, "poll", poll.get("error") or "Suno task failed")
                return

            audio_url = poll.get("audio_url")
            if not audio_url:
                await self._fail(job_id, "poll", "Suno task succeeded without audio_url")
                return

            await self._set_status(
                job_id,
                "uploading",
                {
                    "suno_audio_url": audio_url,
                    "suno_audio_url_b": poll.get("audio_url_b"),
                },
            )
            job = {
                **job,
                "status": "uploading",
                "suno_audio_url": audio_url,
                "suno_audio_url_b": poll.get("audio_url_b"),
            }

            storage_urls = await download_and_upload_song_audio(
                self.sb,
                job=job,
                audio_url=audio_url,
                audio_url_b=poll.get("audio_url_b"),
                work_dir=self.workspace_root,
            )
            log.info("music_only: uploaded audio job=%s", job_id)

            latest = await self._fetch_job(job_id)
            concept_artifact = latest.get("concept_artifact") or job.get("concept_artifact") or {}
            music_caption = (
                latest.get("music_caption")
                or (concept_artifact.get("music_caption") if isinstance(concept_artifact, dict) else None)
                or ""
            )
            lyrics = _first_text(
                latest.get("lyrics"),
                concept_artifact.get("suno_lyrics") if isinstance(concept_artifact, dict) else None,
                concept_artifact.get("lyrics") if isinstance(concept_artifact, dict) else None,
            )
            await self._complete(
                job_id,
                scope=_job_scope(job),
                suno_audio_url=audio_url,
                suno_audio_url_b=poll.get("audio_url_b"),
                suno_storage_url=storage_urls.get("suno_storage_url"),
                suno_storage_url_b=storage_urls.get("suno_storage_url_b"),
                music_caption=music_caption,
                concept_artifact=concept_artifact,
                lyrics=lyrics,
            )
            log.info("music_only: completed job=%s", job_id)
        except Exception as exc:
            failed_step = self._infer_failed_step(locals().get("job", candidate))
            log.error("music_only: failed job=%s step=%s: %s", job_id, failed_step, exc, exc_info=True)
            try:
                await self._fail(job_id, failed_step, _bounded_error(failed_step, exc))
            except Exception as fail_exc:
                log.error("music_only: fail RPC failed job=%s: %s", job_id, fail_exc, exc_info=True)

    def _infer_failed_step(self, job: dict[str, Any]) -> str:
        status = job.get("status")
        if status == "uploading":
            return "upload"
        if job.get("suno_task_id"):
            return "poll"
        return "submit"

    async def _claim(self, job_id: str) -> dict[str, Any] | None:
        def _call():
            return self.sb.rpc("claim_music_only_job", {"p_job_id": job_id}).execute()

        data = _response_data(await asyncio.to_thread(_call)) or {}
        if not data.get("success"):
            return None
        return dict(data["job"])

    async def _mark_submitted(self, job_id: str, task_id: str) -> None:
        def _call():
            return self.sb.rpc(
                "mark_music_only_submitted",
                {"p_job_id": job_id, "p_suno_task_id": task_id},
            ).execute()

        data = _response_data(await asyncio.to_thread(_call)) or {}
        if not isinstance(data, dict) or data.get("success") is not True:
            raise RuntimeError(data.get("error") or "mark_music_only_submitted failed")

    async def _complete(self, job_id: str, **params: Any) -> None:
        scope = params.get("scope") or "word"
        rpc_name = "complete_level_music_only_job" if scope == "level" else "complete_music_only_job"
        rpc_params = {
            "p_job_id": job_id,
            "p_suno_audio_url": params.get("suno_audio_url"),
            "p_suno_audio_url_b": params.get("suno_audio_url_b"),
            "p_suno_storage_url": params.get("suno_storage_url"),
            "p_suno_storage_url_b": params.get("suno_storage_url_b"),
            "p_music_caption": params.get("music_caption"),
            "p_concept_artifact": params.get("concept_artifact") or {},
        }
        if scope == "level":
            rpc_params["p_lyrics"] = params.get("lyrics")

        def _call():
            return self.sb.rpc(rpc_name, rpc_params).execute()

        data = _response_data(await asyncio.to_thread(_call)) or {}
        if not isinstance(data, dict) or data.get("success") is not True:
            raise RuntimeError(data.get("error") or f"{rpc_name} failed")

    async def _fail(self, job_id: str, failed_step: str, error_message: str) -> None:
        def _call():
            return self.sb.rpc(
                "fail_music_only_job",
                {
                    "p_job_id": job_id,
                    "p_failed_step": failed_step,
                    "p_error_message": error_message[:MAX_ERROR_MESSAGE_CHARS],
                },
            ).execute()

        data = _response_data(await asyncio.to_thread(_call)) or {}
        if not isinstance(data, dict) or data.get("success") is not True:
            raise RuntimeError(data.get("error") or "fail_music_only_job failed")

    async def _set_status(
        self,
        job_id: str,
        status: str,
        extra: dict[str, Any] | None = None,
    ) -> None:
        values = {"status": status}
        if extra:
            values.update(extra)

        def _update():
            return (
                self.sb.table("music_generation_jobs")
                .update(values)
                .eq("id", job_id)
                .execute()
            )

        await asyncio.to_thread(_update)

    async def _persist_concept(
        self,
        job_id: str,
        concept: dict[str, Any],
        *,
        scope: str = "word",
    ) -> None:
        artifact = concept.get("concept_artifact") or {}
        values = {
            "concept_artifact": artifact,
            "music_caption": artifact.get("music_caption") if isinstance(artifact, dict) else None,
        }
        if scope == "level":
            concept_data = concept.get("concept_data") or {}
            values["lyrics"] = _first_text(
                artifact.get("suno_lyrics") if isinstance(artifact, dict) else None,
                artifact.get("lyrics") if isinstance(artifact, dict) else None,
                concept_data.get("lyrics") if isinstance(concept_data, dict) else None,
            )

        def _update():
            return (
                self.sb.table("music_generation_jobs")
                .update(values)
                .eq("id", job_id)
                .execute()
            )

        await asyncio.to_thread(_update)

    async def _fetch_job(self, job_id: str) -> dict[str, Any]:
        def _query():
            return (
                self.sb.table("music_generation_jobs")
                .select("*")
                .eq("id", job_id)
                .single()
                .execute()
            )

        return dict(_response_data(await asyncio.to_thread(_query)) or {})

    async def _fetch_context(self, job: dict[str, Any]) -> dict[str, Any]:
        word_id = str(job["word_id"])
        deck_id = job.get("deck_id")

        def _word_query():
            return (
                self.sb.table("words")
                .select("*")
                .eq("id", word_id)
                .single()
                .execute()
            )

        word = _response_data(await asyncio.to_thread(_word_query))
        if not word:
            raise RuntimeError(f"Word not found for song-only job {job.get('id')}")

        deck = None
        if deck_id:
            def _deck_query():
                return (
                    self.sb.table("decks")
                    .select("*")
                    .eq("id", deck_id)
                    .maybe_single()
                    .execute()
                )

            deck = _response_data(await asyncio.to_thread(_deck_query))

        return {
            "word": dict(word),
            "deck": dict(deck) if isinstance(deck, dict) else None,
            "profile": await self._fetch_profile(str(job.get("user_id"))) if job.get("user_id") else None,
        }

    async def _fetch_profile(self, user_id: str) -> dict[str, Any] | None:
        def _profile_query():
            return (
                self.sb.table("profiles")
                .select("base_language")
                .eq("id", user_id)
                .maybe_single()
                .execute()
            )

        try:
            profile = _response_data(await asyncio.to_thread(_profile_query))
            return dict(profile) if isinstance(profile, dict) else None
        except Exception:
            return None

    async def _persist_generated_lyrics(
        self,
        job: dict[str, Any],
        context: dict[str, Any],
        concept: dict[str, Any],
    ) -> None:
        artifact = concept.get("concept_artifact") or {}
        concept_data = concept.get("concept_data") or {}
        if not isinstance(artifact, dict):
            artifact = {}
        if not isinstance(concept_data, dict):
            concept_data = {}

        lyrics = _first_text(
            artifact.get("suno_lyrics"),
            artifact.get("lyrics"),
            concept_data.get("lyrics"),
        )
        if not lyrics:
            return

        word = context.get("word") or {}
        deck = context.get("deck") or {}
        profile = context.get("profile") or {}
        language = _first_text(
            artifact.get("language"),
            concept_data.get("language"),
            job.get("target_language"),
            _metadata(job).get("target_language"),
            word.get("language"),
            _metadata(word).get("language"),
            deck.get("target_language"),
        ) or "English"
        language_code = _first_text(
            artifact.get("language_code"),
            concept_data.get("language_code"),
            word.get("language_code"),
            _metadata(word).get("language_code"),
        ) or language_to_code(language)
        settings_override = _settings_override(job)
        profile_base_language = profile.get("base_language")
        settings_base_language = settings_override.get("base_language")
        base_language = _first_text(
            settings_base_language,
            profile_base_language,
        ) or "English"
        base_language_code = language_to_code(base_language)

        translation_columns: dict[str, Any] = {}
        try:
            log.info(
                "music_only: lyrics translation context job=%s word=%s user=%s source_language=%s base_language=%s profile_base_language=%s settings_base_language=%s",
                job.get("id"),
                job.get("word_id"),
                job.get("user_id"),
                language,
                base_language,
                profile_base_language,
                settings_base_language,
            )
            translation_result = await asyncio.to_thread(
                translate_song_lyrics,
                lyrics=lyrics,
                source_language=language,
                target_language=base_language,
                word=_first_text(artifact.get("word"), concept_data.get("word"), word.get("word")) or "",
                translation=_first_text(
                    artifact.get("translation"),
                    concept_data.get("translation"),
                    word.get("translation"),
                ) or "",
            )
            if not translation_result.get("language"):
                translation_result = {**translation_result, "language": base_language}
            log.info(
                "music_only: lyrics translation result job=%s word=%s user=%s source_language=%s base_language=%s profile_base_language=%s status=%s reason=%s",
                job.get("id"),
                job.get("word_id"),
                job.get("user_id"),
                language,
                base_language,
                profile_base_language,
                translation_result.get("status"),
                translation_result.get("reason") or translation_result.get("error"),
            )
            translation_columns = translation_result_to_columns(
                translation_result,
                target_language_code=base_language_code,
            )
        except Exception as exc:
            log.warning(
                "music_only: lyrics translation failed job=%s: %s",
                job.get("id"),
                exc,
                exc_info=True,
            )
            translation_columns = {
                "translation_status": "failed",
                "translation_language": base_language,
                "translation_language_code": base_language_code,
                "translation_error": str(exc),
                "translation_attempted_at": _now_utc().isoformat(),
            }

        await asyncio.to_thread(
            upsert_music_lyrics_row,
            self.sb,
            user_id=str(job.get("user_id")),
            word_id=str(job.get("word_id")),
            deck_id=str(job.get("deck_id")) if job.get("deck_id") else None,
            source_type="song_only",
            source_job_id=str(job.get("id")) if job.get("id") else None,
            generation_job_id=None,
            provider_task_id=str(job.get("suno_task_id")) if job.get("suno_task_id") else None,
            attempt_number=int(job.get("attempts") or 1),
            language=language,
            language_code=language_code,
            lyric_mode=_first_text(job.get("lyric_mode"), _metadata(job).get("lyric_mode")),
            genre=_first_text(job.get("genre"), _metadata(job).get("genre")),
            music_caption=_first_text(artifact.get("music_caption"), concept_data.get("music_caption")),
            lyrics=lyrics,
            suno_lyrics=_first_text(artifact.get("suno_lyrics"), concept_data.get("lyrics")),
            **translation_columns,
        )
