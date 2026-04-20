"""Unit tests for src/services/events.py.

Covers:
- Success path: row written with status='success'.
- Exception path: row written with status='failed' AND exception re-raised.
- Offload path: response_body >256 KiB moves to Storage; row has response_ref.
- Supabase creds missing: caller completes, no exception.
- Insert exception: caller completes, no exception (non-blocking contract).
- record_response metadata_extras merge into metadata dict.
- logged_api_call: request_body routes to metadata.request_body.
- write_event_row: direct post-hoc write.
"""

from __future__ import annotations

from unittest.mock import MagicMock, patch

import pytest

from src.services import events


# ---------------------------------------------------------------------------
# Fakes
# ---------------------------------------------------------------------------

class _FakeStorage:
    def __init__(self):
        self.uploads: list[tuple[str, bytes, dict]] = []

    def from_(self, bucket: str):
        self._bucket = bucket
        return self

    def upload(self, key: str, data: bytes, file_options: dict | None = None):
        self.uploads.append((key, data, file_options or {}))
        return {"Key": key}


class _FakeTable:
    def __init__(self, log: list[dict]):
        self._log = log

    def insert(self, row: dict):
        self._log.append(row)
        return self

    def execute(self):
        return MagicMock(data=None)


class _FakeSupabase:
    def __init__(self):
        self.inserts: list[dict] = []
        self.storage = _FakeStorage()

    def table(self, name: str):
        assert name == "pipeline_events"
        return _FakeTable(self.inserts)


@pytest.fixture
def fake_sb(monkeypatch):
    sb = _FakeSupabase()
    monkeypatch.setattr(events, "_get_client", lambda: sb)
    return sb


# ---------------------------------------------------------------------------
# Success path
# ---------------------------------------------------------------------------

def test_logged_llm_call_success_writes_row(fake_sb):
    with events.logged_llm_call(
        stage="concept",
        sub_step="caption_llm",
        word_id="w-1",
        model_provider="openrouter",
        model_name="deepseek/deepseek-v3.2",
        system_prompt="",
        user_prompt="prompt text",
    ) as ev:
        ev.record_response(
            response_body="the response",
            tokens_in=100,
            tokens_out=50,
            cost_usd=0.0001,
            request_id="req-xyz",
        )

    assert len(fake_sb.inserts) == 1
    row = fake_sb.inserts[0]
    assert row["status"] == "success"
    assert row["stage"] == "concept"
    assert row["sub_step"] == "caption_llm"
    assert row["word_id"] == "w-1"
    assert row["user_prompt"] == "prompt text"
    assert row["response_body"] == "the response"
    assert row["tokens_in"] == 100
    assert row["tokens_out"] == 50
    assert row["cost_usd"] == 0.0001
    assert row["request_id"] == "req-xyz"
    assert row["error_message"] is None
    assert row["error_type"] is None
    assert isinstance(row["latency_ms"], int) and row["latency_ms"] >= 0
    assert row["metadata"] == {}


# ---------------------------------------------------------------------------
# Exception path
# ---------------------------------------------------------------------------

def test_logged_llm_call_exception_writes_failed_row_and_reraises(fake_sb):
    class Boom(RuntimeError):
        pass

    with pytest.raises(Boom, match="kaboom"):
        with events.logged_llm_call(
            stage="concept",
            sub_step="caption_llm",
            model_name="test-model",
            user_prompt="p",
        ):
            raise Boom("kaboom")

    assert len(fake_sb.inserts) == 1
    row = fake_sb.inserts[0]
    assert row["status"] == "failed"
    assert row["error_type"] == "Boom"
    assert row["error_message"] == "kaboom"
    assert row["response_body"] is None


# ---------------------------------------------------------------------------
# Offload path
# ---------------------------------------------------------------------------

def test_response_offload_when_body_exceeds_threshold(fake_sb):
    big_body = "x" * (events.RESPONSE_OFFLOAD_THRESHOLD_BYTES + 1)
    with events.logged_llm_call(
        stage="concept",
        sub_step="lyrics_combined_llm",
        model_name="test-model",
        user_prompt="p",
    ) as ev:
        ev.record_response(response_body=big_body)

    assert len(fake_sb.storage.uploads) == 1
    storage_key, data_bytes, _opts = fake_sb.storage.uploads[0]
    assert storage_key.endswith("/response.txt")
    assert len(data_bytes) == events.RESPONSE_OFFLOAD_THRESHOLD_BYTES + 1

    assert len(fake_sb.inserts) == 1
    row = fake_sb.inserts[0]
    assert row["response_body"] is None
    assert row["response_ref"] == storage_key
    assert row["id"] == storage_key.split("/")[0]


def test_small_body_does_not_offload(fake_sb):
    small_body = "x" * 1024
    with events.logged_llm_call(
        stage="concept", sub_step="caption_llm",
        model_name="test-model", user_prompt="p",
    ) as ev:
        ev.record_response(response_body=small_body)

    assert fake_sb.storage.uploads == []
    assert fake_sb.inserts[0]["response_body"] == small_body
    assert fake_sb.inserts[0]["response_ref"] is None


# ---------------------------------------------------------------------------
# Non-blocking contract
# ---------------------------------------------------------------------------

def test_missing_creds_does_not_raise(monkeypatch):
    monkeypatch.setattr(events, "_get_client", lambda: None)

    # Caller completes normally.
    with events.logged_llm_call(
        stage="concept", sub_step="caption_llm",
        model_name="test-model", user_prompt="p",
    ) as ev:
        ev.record_response(response_body="x")
    # No assertion needed — test passes if no exception raised.


def test_insert_exception_does_not_propagate(monkeypatch):
    sb = _FakeSupabase()
    # Force insert().execute() to raise.
    def _boom_insert(self, row):
        raise RuntimeError("db-down")
    monkeypatch.setattr(_FakeTable, "insert", _boom_insert)
    monkeypatch.setattr(events, "_get_client", lambda: sb)

    # Must not raise.
    with events.logged_llm_call(
        stage="concept", sub_step="caption_llm",
        model_name="test-model", user_prompt="p",
    ) as ev:
        ev.record_response(response_body="x")


def test_offload_upload_failure_still_writes_row(monkeypatch):
    sb = _FakeSupabase()

    def _boom_upload(self, key, data, file_options=None):
        raise RuntimeError("storage-down")
    monkeypatch.setattr(_FakeStorage, "upload", _boom_upload)
    monkeypatch.setattr(events, "_get_client", lambda: sb)

    big_body = "x" * (events.RESPONSE_OFFLOAD_THRESHOLD_BYTES + 1)
    with events.logged_llm_call(
        stage="concept", sub_step="lyrics_combined_llm",
        model_name="test-model", user_prompt="p",
    ) as ev:
        ev.record_response(response_body=big_body)

    assert len(sb.inserts) == 1
    row = sb.inserts[0]
    assert row["response_body"] is None
    assert row["response_ref"] is None
    assert row["metadata"].get("offload_failed") is True


# ---------------------------------------------------------------------------
# Metadata merging
# ---------------------------------------------------------------------------

def test_record_response_merges_metadata_extras(fake_sb):
    with events.logged_llm_call(
        stage="concept", sub_step="caption_llm",
        model_name="test-model", user_prompt="p",
        metadata={"initial_key": "initial_val"},
    ) as ev:
        ev.record_response(response_body="x", extra_a=1, extra_b="two")

    row = fake_sb.inserts[0]
    assert row["metadata"] == {"initial_key": "initial_val", "extra_a": 1, "extra_b": "two"}


# ---------------------------------------------------------------------------
# logged_api_call: request_body goes to metadata.request_body
# ---------------------------------------------------------------------------

def test_logged_api_call_request_body_in_metadata(fake_sb):
    with events.logged_api_call(
        stage="suno_bakein",
        sub_step="submit",
        event_source="suno_bakein",
        model_provider="kie_ai",
        model_name="suno_v5_5",
        system_prompt="pop, female vocal",
        user_prompt="[Verse] lyrics here",
        cost_usd=0.06,
    ) as ev:
        ev.record_response(
            response_body='{"code":200,"data":{"taskId":"t-1"}}',
            request_body='{"prompt":"...","style":"pop"}',
            request_id="t-1",
        )

    assert len(fake_sb.inserts) == 1
    row = fake_sb.inserts[0]
    assert row["event_source"] == "suno_bakein"
    assert row["cost_usd"] == 0.06
    assert row["request_id"] == "t-1"
    assert row["metadata"]["request_body"] == '{"prompt":"...","style":"pop"}'


# ---------------------------------------------------------------------------
# write_event_row: direct post-hoc write
# ---------------------------------------------------------------------------

def test_write_event_row_direct(fake_sb):
    events.write_event_row(
        stage="suno_bakein",
        sub_step="audio_probe",
        event_source="suno_bakein",
        status="success",
        word_id="w-42",
        metadata={"duration_seconds_a": 32.5, "duration_seconds_b": 28.1},
    )

    assert len(fake_sb.inserts) == 1
    row = fake_sb.inserts[0]
    assert row["status"] == "success"
    assert row["sub_step"] == "audio_probe"
    assert row["word_id"] == "w-42"
    assert row["metadata"]["duration_seconds_a"] == 32.5


def test_write_event_row_missing_creds_swallows(monkeypatch):
    monkeypatch.setattr(events, "_get_client", lambda: None)
    events.write_event_row(
        stage="suno_bakein",
        sub_step="audio_probe",
        status="success",
    )
    # No exception → pass.
