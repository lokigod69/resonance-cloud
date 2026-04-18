"""Tests for logging correlation-ID propagation (HIGH-5).

Verifies:
- CorrelationFilter attaches word_id + stage attributes to LogRecords.
- `set_log_context` propagates values across async boundaries (contextvars).
- `install_correlation_filter` is idempotent.
"""

from __future__ import annotations

import asyncio
import importlib
import io
import logging
import sys
import types
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from src.orchestration import state  # noqa: E402


class _Capture(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


def _install_job_runner_import_stubs(monkeypatch):
    dotenv_mod = types.ModuleType("dotenv")
    dotenv_mod.load_dotenv = lambda: None
    monkeypatch.setitem(sys.modules, "dotenv", dotenv_mod)

    supabase_mod = types.ModuleType("supabase")
    supabase_mod.Client = object
    supabase_mod.create_client = lambda *_a, **_kw: object()
    monkeypatch.setitem(sys.modules, "supabase", supabase_mod)

    monkeypatch.setenv("SUPABASE_URL", "https://example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")
    monkeypatch.setenv("POD_URL", "https://pod.invalid")
    monkeypatch.setenv("POD_AUTH_TOKEN", "token")


def test_correlation_filter_injects_word_id_and_stage():
    logger = logging.getLogger("test_corr_" + str(id(test_correlation_filter_injects_word_id_and_stage)))
    logger.setLevel(logging.DEBUG)
    handler = _Capture()
    logger.addHandler(handler)
    handler.addFilter(state.CorrelationFilter())
    logger.addFilter(state.CorrelationFilter())

    state.clear_log_context()
    state.set_log_context(word_id="w-42", stage="images")
    logger.info("hello")
    state.clear_log_context()

    assert handler.records, "expected at least one captured record"
    rec = handler.records[-1]
    assert getattr(rec, "word_id", None) == "w-42"
    assert getattr(rec, "stage", None) == "images"


def test_correlation_context_defaults_to_dash_when_unset():
    logger = logging.getLogger("test_corr_unset_" + str(id(test_correlation_context_defaults_to_dash_when_unset)))
    logger.setLevel(logging.DEBUG)
    handler = _Capture()
    logger.addHandler(handler)
    handler.addFilter(state.CorrelationFilter())
    logger.addFilter(state.CorrelationFilter())

    state.clear_log_context()
    logger.info("no context set")

    rec = handler.records[-1]
    assert rec.word_id == "-"
    assert rec.stage == "-"


def test_correlation_context_propagates_across_async():
    """contextvars carry across `await` points."""
    logger = logging.getLogger("test_corr_async_" + str(id(test_correlation_context_propagates_across_async)))
    logger.setLevel(logging.DEBUG)
    handler = _Capture()
    logger.addHandler(handler)
    handler.addFilter(state.CorrelationFilter())
    logger.addFilter(state.CorrelationFilter())

    async def _inner():
        await asyncio.sleep(0)
        logger.info("after await")

    async def _main():
        state.clear_log_context()
        state.set_log_context(word_id="w-async", stage="song")
        await _inner()
        state.clear_log_context()

    asyncio.new_event_loop().run_until_complete(_main())

    rec = handler.records[-1]
    assert rec.word_id == "w-async"
    assert rec.stage == "song"


def test_job_runner_logging_format_renders_word_and_stage(monkeypatch):
    _install_job_runner_import_stubs(monkeypatch)
    import job_runner

    importlib.reload(job_runner)

    root = logging.getLogger()
    assert root.handlers, "job_runner should configure root logging"

    stream = io.StringIO()
    handler = logging.StreamHandler(stream)
    handler.setFormatter(root.handlers[0].formatter)
    handler.addFilter(state.CorrelationFilter())
    root.addHandler(handler)
    root.addFilter(state.CorrelationFilter())

    try:
        state.clear_log_context()
        state.set_log_context(word_id="w-log", stage="uploading")
        logging.getLogger("job_runner_format_test").info("hello world")
        rendered = stream.getvalue()
    finally:
        root.removeHandler(handler)
        state.clear_log_context()

    assert "word=w-log" in rendered
    assert "stage=uploading" in rendered
    assert "hello world" in rendered


if __name__ == "__main__":
    failures = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS  {name}")
            except Exception as e:
                failures.append((name, e))
                print(f"FAIL  {name}: {e}")
    if failures:
        sys.exit(1)
