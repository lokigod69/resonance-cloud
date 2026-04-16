"""Standalone runnable tests for pod_manager pre-warm / keep-alive.

Covers:
    1. notify_upcoming_video when idle spawns a prewarm thread
    2. notify when ready is a no-op (no thread, no HTTP)
    3. idle_check keeps pod alive while _upcoming_words non-empty
    4. idle_check terminates when _upcoming_words empty + timed out
    5. Stale-entry GC in idle_check
    6. cancel_upcoming_video removes the entry (idempotent pair with notify)
    7. Two rapid notifies only spawn a single prewarm thread
    8. Prewarm failure returns state to idle, swallows exception
    9. cancel is idempotent for unknown word_id
    10. POD_PREWARM_ENABLED=false makes notify a full no-op

Mock stack mirrors tests/manual/test_pod_manager_errors.py - httpx.MockTransport
+ patched time.sleep, no pytest.

Run:
    cd orchestrator
    .venv/Scripts/python.exe -m tests.manual.test_pod_prewarm
"""
from __future__ import annotations

import logging
import os
import sys
import threading
import time
from typing import Callable, List
from unittest.mock import patch

# Env setup BEFORE importing pod_manager (config reads env at import).
os.environ.setdefault("RUNPOD_API_KEY", "test-api-key")
os.environ.setdefault("RUNPOD_VOLUME_IDS", "vol-a,vol-b")
os.environ.setdefault("RUNPOD_GPU_TYPE", "NVIDIA L40S")
os.environ.setdefault("RUNPOD_FALLBACK_GPU_TYPES", "NVIDIA A40,NVIDIA A100 80GB PCIe")
# Pre-warm knobs: short stale window and idle timeout so tests run fast.
os.environ.setdefault("POD_PREWARM_ENABLED", "true")
os.environ.setdefault("POD_PREWARM_STALE_SECONDS", "5")
os.environ.setdefault("RUNPOD_IDLE_TIMEOUT", "1")

import httpx  # noqa: E402

from cloud_engines.video_engine import pod_manager  # noqa: E402


# ---------- mock infrastructure (mirrors test_pod_manager_errors.py) ----------

def make_handler(responses: List[Callable[[httpx.Request], httpx.Response]]):
    """Build a MockTransport handler that iterates through `responses`."""
    calls: List[httpx.Request] = []
    idx = {"i": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        i = idx["i"]
        if i >= len(responses):
            raise AssertionError(
                f"Unexpected extra HTTP call #{i + 1} to {request.method} {request.url}; "
                f"only {len(responses)} responses configured"
            )
        idx["i"] = i + 1
        calls.append(request)
        return responses[i](request)

    handler.calls = calls  # type: ignore[attr-defined]
    return handler


def ok(status: int, body: dict | None = None, headers: dict | None = None):
    def _fn(_request: httpx.Request) -> httpx.Response:
        return httpx.Response(status_code=status, json=body or {}, headers=headers or {})
    return _fn


_REAL_HTTPX_CLIENT = httpx.Client


class MockClientFactory:
    def __init__(self, handler):
        self.handler = handler

    def __call__(self, *_args, **_kwargs):
        return _REAL_HTTPX_CLIENT(transport=httpx.MockTransport(self.handler))


def reset_module_state() -> None:
    pod_manager._reset_state()


def wait_for_prewarm_threads(timeout: float = 10.0) -> None:
    """Join any pod-prewarm-* threads spawned by notify_upcoming_video."""
    for t in threading.enumerate():
        if t.name.startswith("pod-prewarm-"):
            t.join(timeout=timeout)
            if t.is_alive():
                raise AssertionError(f"Pre-warm thread {t.name} did not finish within {timeout}s")


# Canonical mock sequence for a successful ensure_pod_ready():
#   POST /pods           -> 201 {id, ...}          (_create_pod)
#   GET  /pods/{id}      -> 200 desiredStatus=RUNNING  (Phase A)
#   GET  /health         -> 200 healthy + model_loaded (Phase B)
#   GET  /health         -> 200 healthy (fast-path health check on re-entry) [optional]
def make_successful_ensure_handler(pod_id: str = "pod-test-1"):
    return make_handler([
        ok(201, {"id": pod_id, "machine": {"gpuDisplayName": "NVIDIA L40S"}}),
        ok(200, {"desiredStatus": "RUNNING", "machine": {"gpuDisplayName": "NVIDIA L40S"}}),
        ok(200, {"status": "healthy", "model_loaded": True}),
    ])


# ---------- individual tests ----------

def test_1_notify_when_idle_starts_prewarm():
    """notify_upcoming_video on an idle pod spawns a thread that completes the cold-start."""
    reset_module_state()
    handler = make_successful_ensure_handler("pod-prewarm-1")

    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            pod_manager.notify_upcoming_video("w1")
            wait_for_prewarm_threads()

    assert pod_manager._pod_status == "ready", pod_manager._pod_status
    assert pod_manager._pod_id == "pod-prewarm-1", pod_manager._pod_id
    assert "w1" in pod_manager._upcoming_words, pod_manager._upcoming_words
    assert pod_manager._prewarm_in_flight is False
    # Must have made exactly the 3 expected HTTP calls (POST + Phase A + Phase B)
    assert len(handler.calls) == 3, [str(r.url) for r in handler.calls]
    assert handler.calls[0].method == "POST"
    assert handler.calls[1].method == "GET"
    assert handler.calls[2].method == "GET"


def test_2_notify_when_ready_is_noop():
    """notify on a ready pod updates dict only - no thread, no HTTP."""
    reset_module_state()
    # Manually bring state to "ready"
    pod_manager._pod_status = "ready"
    pod_manager._pod_id = "pod-ready"
    pod_manager._pod_url = "https://pod-ready-8080.proxy.runpod.net"
    pod_manager._worker_auth_token = "tok"
    pod_manager._last_activity = time.monotonic()

    # Empty handler - any HTTP call will raise AssertionError
    handler = make_handler([])
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        pod_manager.notify_upcoming_video("w1")
        wait_for_prewarm_threads(timeout=1.0)

    assert pod_manager._pod_status == "ready"
    assert "w1" in pod_manager._upcoming_words
    assert pod_manager._prewarm_in_flight is False
    assert len(handler.calls) == 0


def test_3_idle_check_keeps_pod_alive_when_upcoming_nonempty():
    """idle_check must not terminate while a word is in _upcoming_words."""
    reset_module_state()
    pod_manager._pod_status = "ready"
    pod_manager._pod_id = "pod-stay-alive"
    pod_manager._pod_url = "https://pod-stay-alive-8080.proxy.runpod.net"
    pod_manager._worker_auth_token = "tok"
    pod_manager._last_activity = time.monotonic() - 3600  # effectively "very idle"
    pod_manager._upcoming_words["w1"] = time.monotonic()

    # Any HTTP call would be a termination attempt; handler raises if called.
    handler = make_handler([])
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        pod_manager.idle_check()

    assert pod_manager._pod_status == "ready", pod_manager._pod_status
    assert pod_manager._pod_id == "pod-stay-alive"
    assert len(handler.calls) == 0


def test_4_idle_check_terminates_when_empty():
    """idle_check terminates when _upcoming_words is empty and timeout elapsed."""
    reset_module_state()
    pod_manager._pod_status = "ready"
    pod_manager._pod_id = "pod-to-kill"
    pod_manager._pod_url = "https://pod-to-kill-8080.proxy.runpod.net"
    pod_manager._worker_auth_token = "tok"
    pod_manager._last_activity = time.monotonic() - 10  # > RUNPOD_IDLE_TIMEOUT=1
    # _upcoming_words is empty by default after reset

    handler = make_handler([ok(200, {})])  # DELETE /pods/pod-to-kill
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            pod_manager.idle_check()

    assert pod_manager._pod_status == "idle", pod_manager._pod_status
    assert pod_manager._pod_id is None
    assert len(handler.calls) == 1
    assert handler.calls[0].method == "DELETE"


def test_5_stale_entry_gc():
    """Stale entries are removed by idle_check when older than POD_PREWARM_STALE_SECONDS."""
    reset_module_state()
    # POD_PREWARM_STALE_SECONDS is 5s in test env; entry is 10s old
    pod_manager._upcoming_words["stale-word"] = time.monotonic() - 10
    pod_manager._upcoming_words["fresh-word"] = time.monotonic()
    # Pod is idle - idle_check will run GC then return at the status gate
    pod_manager._pod_status = "idle"

    handler = make_handler([])
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        pod_manager.idle_check()

    assert "stale-word" not in pod_manager._upcoming_words
    assert "fresh-word" in pod_manager._upcoming_words


def test_6_cancel_removes_word_and_bumps_last_activity():
    """cancel_upcoming_video removes entry and refreshes _last_activity."""
    reset_module_state()
    pod_manager._upcoming_words["w1"] = time.monotonic() - 100
    pod_manager._last_activity = 0.0

    pod_manager.cancel_upcoming_video("w1")

    assert "w1" not in pod_manager._upcoming_words
    assert pod_manager._last_activity > 0.0, pod_manager._last_activity


def test_7_concurrent_notify_single_prewarm():
    """Two rapid notifies on idle pod spawn exactly one prewarm thread."""
    reset_module_state()
    handler = make_successful_ensure_handler("pod-single")

    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            pod_manager.notify_upcoming_video("w1")
            pod_manager.notify_upcoming_video("w2")
            wait_for_prewarm_threads()

    assert pod_manager._pod_status == "ready"
    assert set(pod_manager._upcoming_words.keys()) == {"w1", "w2"}
    # Only ONE POST /pods should have been issued
    post_calls = [c for c in handler.calls if c.method == "POST"]
    assert len(post_calls) == 1, [str(c.url) for c in post_calls]


def test_8_prewarm_failure_returns_state_to_idle():
    """Prewarm cold-start failure leaves state clean, thread swallows exception."""
    reset_module_state()
    # All POST attempts return 500 → _create_pod raises after all retries.
    # 3 outer attempts × 2 volumes = 6 responses needed.
    handler = make_handler([ok(500, {}) for _ in range(6)])

    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            pod_manager.notify_upcoming_video("w-fail")
            wait_for_prewarm_threads(timeout=15.0)

    assert pod_manager._pod_status == "idle", pod_manager._pod_status
    assert pod_manager._pod_id is None
    assert pod_manager._prewarm_in_flight is False
    # Entry still tracked - cancel is the caller's responsibility
    assert "w-fail" in pod_manager._upcoming_words


def test_9_cancel_is_idempotent():
    """cancel_upcoming_video for an unknown word_id is a no-op and does not raise."""
    reset_module_state()
    prior_activity = pod_manager._last_activity

    pod_manager.cancel_upcoming_video("never-seen")

    assert pod_manager._upcoming_words == {}
    # _last_activity must NOT be bumped when nothing was popped
    assert pod_manager._last_activity == prior_activity


def test_10_disabled_is_full_noop():
    """POD_PREWARM_ENABLED=false makes notify a full no-op: no dict mutation, no thread."""
    reset_module_state()
    prior_activity = pod_manager._last_activity

    handler = make_handler([])
    with patch.object(pod_manager, "POD_PREWARM_ENABLED", False):
        with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
            pod_manager.notify_upcoming_video("w1")
            wait_for_prewarm_threads(timeout=1.0)

    assert pod_manager._upcoming_words == {}
    assert pod_manager._prewarm_in_flight is False
    assert pod_manager._last_activity == prior_activity
    assert len(handler.calls) == 0


# ---------- runner ----------

class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


def main() -> int:
    logging.basicConfig(level=logging.INFO, format="%(levelname)s %(name)s: %(message)s")
    pm_logger = logging.getLogger(pod_manager.__name__)
    pm_logger.setLevel(logging.DEBUG)

    tests = [
        ("1: notify when idle -> prewarm", test_1_notify_when_idle_starts_prewarm),
        ("2: notify when ready -> noop", test_2_notify_when_ready_is_noop),
        ("3: idle_check keeps alive", test_3_idle_check_keeps_pod_alive_when_upcoming_nonempty),
        ("4: idle_check terminates", test_4_idle_check_terminates_when_empty),
        ("5: stale entry GC", test_5_stale_entry_gc),
        ("6: cancel removes entry", test_6_cancel_removes_word_and_bumps_last_activity),
        ("7: concurrent notify -> single thread", test_7_concurrent_notify_single_prewarm),
        ("8: prewarm failure -> idle", test_8_prewarm_failure_returns_state_to_idle),
        ("9: cancel idempotent", test_9_cancel_is_idempotent),
        ("10: disabled -> full noop", test_10_disabled_is_full_noop),
    ]

    failures: list[tuple[str, BaseException]] = []
    for name, fn in tests:
        print(f"[RUN] {name}")
        handler = ListHandler()
        pm_logger.addHandler(handler)
        try:
            fn()
            print(f"  [PASS] {name}")
        except BaseException as e:  # noqa: BLE001
            failures.append((name, e))
            print(f"  [FAIL] {name}: {e!r}")
        finally:
            pm_logger.removeHandler(handler)

    print()
    print(f"{len(tests) - len(failures)}/{len(tests)} passed")
    return 0 if not failures else 1


if __name__ == "__main__":
    sys.exit(main())
