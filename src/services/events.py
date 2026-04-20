"""Pipeline events — append-only observability writes.

Two context managers (`logged_llm_call`, `logged_api_call`) wrap outbound calls
and insert one row per call into `public.pipeline_events`. A lower-level
`write_event_row(...)` handles post-hoc events (e.g. audio-probe results) where
there is no call to wrap.

Non-blocking contract
---------------------
Supabase insert failures log a warning and return. They never re-raise. If the
wrapped code itself raises, the event row records ``status="failed"`` and the
exception propagates normally.

Circular-call exclusion
-----------------------
This module must not import from ``cloud_engines/*`` or
``src.services.metadata``. No event write emits events of its own.

Large payload handling
----------------------
If ``response_body`` exceeds 256 KiB, the body is uploaded to the
``pipeline-events`` Supabase Storage bucket as ``{event_id}/response.txt``.
``response_body`` is then set to NULL and ``response_ref`` holds the storage
path.
"""

from __future__ import annotations

import logging
import os
import time
import uuid
from typing import Any

from supabase import create_client

logger = logging.getLogger(__name__)

RESPONSE_OFFLOAD_THRESHOLD_BYTES = 256 * 1024
STORAGE_BUCKET = "pipeline-events"


def _get_client():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "")
    if not url or not key:
        return None
    try:
        return create_client(url, key)
    except Exception as e:  # pragma: no cover — defensive
        logger.warning("events: supabase client init failed: %s", e)
        return None


class logged_llm_call:
    """Context manager wrapping an outbound LLM call.

    Usage::

        with logged_llm_call(stage=..., sub_step=..., ...) as ev:
            response = llm_client.generate(...)
            ev.record_response(response_body=response.content,
                               tokens_in=response.tokens_in,
                               ...)
    """

    def __init__(
        self,
        *,
        stage: str,
        sub_step: str,
        event_source: str = "engine",
        word_id: str | None = None,
        deck_id: str | None = None,
        user_id: str | None = None,
        job_id: str | None = None,
        attempt: int | None = None,
        model_provider: str | None = None,
        model_name: str | None = None,
        system_prompt: str | None = None,
        user_prompt: str | None = None,
        cost_usd: float | None = None,
        metadata: dict | None = None,
    ):
        self._stage = stage
        self._sub_step = sub_step
        self._event_source = event_source
        self._word_id = word_id
        self._deck_id = deck_id
        self._user_id = user_id
        self._job_id = job_id
        self._attempt = attempt
        self._model_provider = model_provider
        self._model_name = model_name
        self._system_prompt = system_prompt
        self._user_prompt = user_prompt
        self._cost_usd = cost_usd
        self._metadata: dict[str, Any] = dict(metadata) if metadata else {}

        self._response_body: str | None = None
        self._tokens_in: int | None = None
        self._tokens_out: int | None = None
        self._request_id: str | None = None
        self._start: float = 0.0

    def record_response(
        self,
        *,
        response_body: str | None = None,
        tokens_in: int | None = None,
        tokens_out: int | None = None,
        cost_usd: float | None = None,
        request_id: str | None = None,
        **metadata_extras: Any,
    ) -> None:
        self._response_body = response_body
        self._tokens_in = tokens_in
        self._tokens_out = tokens_out
        if cost_usd is not None:
            self._cost_usd = cost_usd
        self._request_id = request_id
        if metadata_extras:
            self._metadata.update(metadata_extras)

    def __enter__(self):
        self._start = time.monotonic()
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        latency_ms = int((time.monotonic() - self._start) * 1000)
        if exc_type is None:
            status = "success"
            error_message: str | None = None
            error_type: str | None = None
        else:
            status = "failed"
            error_message = str(exc_val) if exc_val is not None else exc_type.__name__
            error_type = exc_type.__name__

        row = self._build_row(
            status=status,
            error_message=error_message,
            error_type=error_type,
            latency_ms=latency_ms,
        )

        try:
            _write_event(row)
        except Exception as e:  # pragma: no cover — defensive belt
            logger.warning(
                "events: write failed (stage=%s sub_step=%s): %s",
                self._stage, self._sub_step, e,
            )
        # Return False so exceptions propagate normally.
        return False

    def _build_row(
        self,
        *,
        status: str,
        error_message: str | None,
        error_type: str | None,
        latency_ms: int,
    ) -> dict[str, Any]:
        return {
            "event_source": self._event_source,
            "stage": self._stage,
            "sub_step": self._sub_step,
            "word_id": self._word_id,
            "deck_id": self._deck_id,
            "user_id": self._user_id,
            "job_id": self._job_id,
            "attempt": self._attempt,
            "model_provider": self._model_provider,
            "model_name": self._model_name,
            "status": status,
            "error_message": error_message,
            "error_type": error_type,
            "latency_ms": latency_ms,
            "cost_usd": self._cost_usd,
            "tokens_in": self._tokens_in,
            "tokens_out": self._tokens_out,
            "system_prompt": self._system_prompt,
            "user_prompt": self._user_prompt,
            "response_body": self._response_body,
            "response_ref": None,
            "request_id": self._request_id,
            "metadata": self._metadata,
        }


class logged_api_call(logged_llm_call):
    """Context manager wrapping an outbound non-LLM API call (Suno, kie.ai, etc.).

    Same lifecycle as ``logged_llm_call``. tokens_in/tokens_out are usually
    None. Use ``system_prompt`` for the "style / system" part of the request
    payload and ``user_prompt`` for the "user-submitted" part (e.g. lyrics).
    Pass ``request_body`` to ``record_response()`` to store the full request
    JSON under ``metadata.request_body``.
    """

    def record_response(
        self,
        *,
        response_body: str | None = None,
        request_body: str | None = None,
        tokens_in: int | None = None,
        tokens_out: int | None = None,
        cost_usd: float | None = None,
        request_id: str | None = None,
        **metadata_extras: Any,
    ) -> None:
        super().record_response(
            response_body=response_body,
            tokens_in=tokens_in,
            tokens_out=tokens_out,
            cost_usd=cost_usd,
            request_id=request_id,
            **metadata_extras,
        )
        if request_body is not None:
            self._metadata["request_body"] = request_body


def write_event_row(
    *,
    stage: str,
    sub_step: str,
    status: str,
    event_source: str = "orchestrator",
    word_id: str | None = None,
    deck_id: str | None = None,
    user_id: str | None = None,
    job_id: str | None = None,
    attempt: int | None = None,
    model_provider: str | None = None,
    model_name: str | None = None,
    error_message: str | None = None,
    error_type: str | None = None,
    latency_ms: int | None = None,
    cost_usd: float | None = None,
    tokens_in: int | None = None,
    tokens_out: int | None = None,
    system_prompt: str | None = None,
    user_prompt: str | None = None,
    response_body: str | None = None,
    request_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    """Post-hoc event write for results where there is no call to wrap."""
    row: dict[str, Any] = {
        "event_source": event_source,
        "stage": stage,
        "sub_step": sub_step,
        "word_id": word_id,
        "deck_id": deck_id,
        "user_id": user_id,
        "job_id": job_id,
        "attempt": attempt,
        "model_provider": model_provider,
        "model_name": model_name,
        "status": status,
        "error_message": error_message,
        "error_type": error_type,
        "latency_ms": latency_ms,
        "cost_usd": cost_usd,
        "tokens_in": tokens_in,
        "tokens_out": tokens_out,
        "system_prompt": system_prompt,
        "user_prompt": user_prompt,
        "response_body": response_body,
        "response_ref": None,
        "request_id": request_id,
        "metadata": metadata or {},
    }
    try:
        _write_event(row)
    except Exception as e:  # pragma: no cover — defensive belt
        logger.warning(
            "events: write_event_row failed (stage=%s sub_step=%s): %s",
            stage, sub_step, e,
        )


def _write_event(row: dict[str, Any]) -> None:
    """Internal — insert a row, offloading large response bodies to Storage first.

    Never raises. Any failure is logged as a warning.
    """
    sb = _get_client()
    if sb is None:
        logger.warning(
            "events: supabase creds missing — event dropped (stage=%s sub_step=%s)",
            row.get("stage"), row.get("sub_step"),
        )
        return

    response_body = row.get("response_body")
    if isinstance(response_body, str):
        body_bytes = response_body.encode("utf-8")
        if len(body_bytes) > RESPONSE_OFFLOAD_THRESHOLD_BYTES:
            event_id = uuid.uuid4()
            storage_key = f"{event_id}/response.txt"
            try:
                sb.storage.from_(STORAGE_BUCKET).upload(
                    storage_key,
                    body_bytes,
                    file_options={
                        "content-type": "text/plain; charset=utf-8",
                        "upsert": "true",
                    },
                )
                row["id"] = str(event_id)
                row["response_body"] = None
                row["response_ref"] = storage_key
            except Exception as e:
                logger.warning(
                    "events: offload upload failed (%s) — writing row without payload", e,
                )
                row["response_body"] = None
                row["response_ref"] = None
                meta = row.get("metadata") or {}
                meta["offload_failed"] = True
                row["metadata"] = meta

    try:
        sb.table("pipeline_events").insert(row).execute()
    except Exception as e:
        logger.warning(
            "events: insert failed (stage=%s sub_step=%s): %s",
            row.get("stage"), row.get("sub_step"), e,
        )
