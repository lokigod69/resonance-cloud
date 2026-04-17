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
# _prewarm_applicable guard requires self_hosted backend with empty
# GPU_WORKER_URL; set both so the feature is active under test.
os.environ.setdefault("VIDEO_BACKEND", "self_hosted")
os.environ.pop("GPU_WORKER_URL", None)
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


def test_11_prewarm_succeeds_then_word_fails_idle_terminates():
    """Item 9 coverage: prewarm -> cancel (images failure) -> idle_check terminates.

    Simulates the common real-world failure path: pod warms up, word fails in a
    pre-video stage, dict empties, idle timer elapses, pod is terminated.
    """
    reset_module_state()
    # Phase A: prewarm successfully creates a pod.
    create_handler = make_successful_ensure_handler("pod-wasted")
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(create_handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            pod_manager.notify_upcoming_video("w-fail-later")
            wait_for_prewarm_threads()
    assert pod_manager._pod_status == "ready", pod_manager._pod_status
    assert "w-fail-later" in pod_manager._upcoming_words

    # Phase B: simulate images-stage failure in job_runner -> cancel fires.
    pod_manager.cancel_upcoming_video("w-fail-later")
    assert pod_manager._upcoming_words == {}

    # Phase C: time passes (force _last_activity into the past), idle_check runs.
    pod_manager._last_activity = time.monotonic() - 10  # > RUNPOD_IDLE_TIMEOUT=1
    terminate_handler = make_handler([ok(200, {})])  # DELETE /pods/pod-wasted
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(terminate_handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            pod_manager.idle_check()

    assert pod_manager._pod_status == "idle", pod_manager._pod_status
    assert pod_manager._pod_id is None
    assert len(terminate_handler.calls) == 1
    assert terminate_handler.calls[0].method == "DELETE"


def test_12_guard_wrong_backend_is_noop():
    """VIDEO_BACKEND != self_hosted -> notify is a full no-op (no wasted pod)."""
    reset_module_state()
    handler = make_handler([])
    with patch.object(pod_manager, "VIDEO_BACKEND", "fal"):
        with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
            pod_manager.notify_upcoming_video("w-fal")
            wait_for_prewarm_threads(timeout=1.0)

    assert pod_manager._upcoming_words == {}
    assert pod_manager._prewarm_in_flight is False
    assert len(handler.calls) == 0


def test_13_guard_manual_worker_url_is_noop():
    """GPU_WORKER_URL set (manual override) -> notify is no-op, pod_manager unused."""
    reset_module_state()
    handler = make_handler([])
    with patch.object(pod_manager, "GPU_WORKER_URL", "http://my-gpu-box:8080"):
        with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
            pod_manager.notify_upcoming_video("w-manual")
            wait_for_prewarm_threads(timeout=1.0)

    assert pod_manager._upcoming_words == {}
    assert pod_manager._prewarm_in_flight is False
    assert len(handler.calls) == 0


def test_14_guard_no_api_key_is_noop():
    """RUNPOD_API_KEY empty (local mode) -> notify is no-op, no thread spawned."""
    reset_module_state()
    handler = make_handler([])
    with patch.object(pod_manager, "RUNPOD_API_KEY", ""):
        with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
            pod_manager.notify_upcoming_video("w-local")
            wait_for_prewarm_threads(timeout=1.0)

    assert pod_manager._upcoming_words == {}
    assert pod_manager._prewarm_in_flight is False
    assert len(handler.calls) == 0


# ---------- job-level pre-warm tests (Hook B) ----------

def test_15_notify_job_adds_to_upcoming_jobs():
    """notify_upcoming_job populates _upcoming_jobs when prewarm applicable."""
    reset_module_state()
    # Bring pod to "ready" so notify does not trigger a cold-start thread.
    pod_manager._pod_status = "ready"
    pod_manager._pod_id = "pod-ready"
    pod_manager._pod_url = "https://pod-ready-8080.proxy.runpod.net"
    pod_manager._worker_auth_token = "tok"
    pod_manager._last_activity = time.monotonic()

    handler = make_handler([])
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        pod_manager.notify_upcoming_job("job-1")
        wait_for_prewarm_threads(timeout=1.0)

    assert "job-1" in pod_manager._upcoming_jobs, pod_manager._upcoming_jobs
    assert pod_manager._upcoming_words == {}
    assert len(handler.calls) == 0


def test_16_notify_job_noop_when_not_applicable():
    """notify_upcoming_job is a full no-op when VIDEO_BACKEND != self_hosted."""
    reset_module_state()
    prior_activity = pod_manager._last_activity
    handler = make_handler([])
    with patch.object(pod_manager, "VIDEO_BACKEND", "fal"):
        with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
            pod_manager.notify_upcoming_job("job-fal")
            wait_for_prewarm_threads(timeout=1.0)

    assert pod_manager._upcoming_jobs == {}
    assert pod_manager._prewarm_in_flight is False
    assert pod_manager._last_activity == prior_activity
    assert len(handler.calls) == 0


def test_17_notify_job_triggers_prewarm_when_idle():
    """notify_upcoming_job on an idle pod spawns a prewarm thread that cold-starts."""
    reset_module_state()
    handler = make_successful_ensure_handler("pod-job-prewarm")

    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            pod_manager.notify_upcoming_job("job-warm")
            wait_for_prewarm_threads()

    assert pod_manager._pod_status == "ready", pod_manager._pod_status
    assert pod_manager._pod_id == "pod-job-prewarm"
    assert "job-warm" in pod_manager._upcoming_jobs
    assert pod_manager._upcoming_words == {}
    assert pod_manager._prewarm_in_flight is False
    assert len(handler.calls) == 3


def test_18_cancel_job_removes_and_bumps_activity():
    """cancel_upcoming_job removes entry and refreshes _last_activity."""
    reset_module_state()
    pod_manager._upcoming_jobs["job-1"] = time.monotonic() - 100
    pod_manager._last_activity = 0.0

    pod_manager.cancel_upcoming_job("job-1")

    assert "job-1" not in pod_manager._upcoming_jobs
    assert pod_manager._last_activity > 0.0


def test_19_cancel_job_idempotent():
    """cancel_upcoming_job for an unknown job_id is a no-op and does not raise."""
    reset_module_state()
    prior_activity = pod_manager._last_activity

    pod_manager.cancel_upcoming_job("never-seen-job")

    assert pod_manager._upcoming_jobs == {}
    assert pod_manager._last_activity == prior_activity


def test_20_idle_check_keeps_pod_alive_for_upcoming_jobs():
    """idle_check must not terminate while _upcoming_jobs is non-empty."""
    reset_module_state()
    pod_manager._pod_status = "ready"
    pod_manager._pod_id = "pod-stay-alive-job"
    pod_manager._pod_url = "https://pod-stay-alive-job-8080.proxy.runpod.net"
    pod_manager._worker_auth_token = "tok"
    pod_manager._last_activity = time.monotonic() - 3600
    pod_manager._upcoming_jobs["job-1"] = time.monotonic()
    # _upcoming_words intentionally empty

    handler = make_handler([])  # any HTTP call = termination attempt = fail
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        pod_manager.idle_check()

    assert pod_manager._pod_status == "ready"
    assert pod_manager._pod_id == "pod-stay-alive-job"
    assert len(handler.calls) == 0


def test_21_stale_jobs_gc():
    """idle_check GCs _upcoming_jobs entries past POD_PREWARM_JOB_STALE_SECONDS."""
    reset_module_state()
    # Override the job stale threshold to 5s for this test, matching the
    # test-env value already used for POD_PREWARM_STALE_SECONDS.
    with patch.object(pod_manager, "POD_PREWARM_JOB_STALE_SECONDS", 5):
        pod_manager._upcoming_jobs["stale-job"] = time.monotonic() - 10
        pod_manager._upcoming_jobs["fresh-job"] = time.monotonic()
        pod_manager._pod_status = "idle"

        handler = make_handler([])
        with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
            pod_manager.idle_check()

        assert "stale-job" not in pod_manager._upcoming_jobs
        assert "fresh-job" in pod_manager._upcoming_jobs


def test_22_word_and_job_dicts_are_independent():
    """cancel_upcoming_video does not affect _upcoming_jobs, and vice versa."""
    reset_module_state()
    pod_manager._upcoming_words["w1"] = time.monotonic()
    pod_manager._upcoming_jobs["j1"] = time.monotonic()

    pod_manager.cancel_upcoming_video("w1")
    assert pod_manager._upcoming_words == {}
    assert "j1" in pod_manager._upcoming_jobs

    pod_manager.cancel_upcoming_job("j1")
    assert pod_manager._upcoming_jobs == {}


# ---------- Hook B try/finally invariant (adversarial-review H1) ----------
#
# These tests guard the contract in job_runner.main()'s Hook B block:
#
#     notify_upcoming_job(job["id"])
#     try:
#         await process_job(job)
#     finally:
#         cancel_upcoming_job(job["id"])
#
# Specifically, they protect against a refactor from `try/finally` to
# `try/except Exception: pass` + trailing cancel — which would leave the
# dict correctly empty but silently swallow exceptions, breaking the outer
# main()'s error-logging path.
#
# Strategy: (a) an AST structural assertion that the try has no except
# handlers and has cancel_upcoming_job in its finally; (b) a runtime
# behavioral assertion that mirrors the block's semantics and verifies
# both "cancel fires on exception" AND "exception propagates".


def test_23_hook_b_is_pure_try_finally_in_source():
    """Structurally verify job_runner.main() wraps process_job in a pure try/finally.

    Reads job_runner.py source and walks its AST to find the try-block whose
    body calls process_job() and whose finally calls cancel_upcoming_job().
    Asserts that try has NO except handlers. A refactor to try/except:pass
    would add a handler and fail this assertion.
    """
    import ast
    from pathlib import Path

    orch_root = Path(__file__).resolve().parents[2]
    src = (orch_root / "job_runner.py").read_text(encoding="utf-8")
    tree = ast.parse(src)

    main_fn = None
    for node in ast.walk(tree):
        if isinstance(node, ast.AsyncFunctionDef) and node.name == "main":
            main_fn = node
            break
    assert main_fn is not None, "could not find async main() in job_runner.py"

    def _call_name(call: ast.Call) -> str:
        if isinstance(call.func, ast.Name):
            return call.func.id
        if isinstance(call.func, ast.Attribute):
            return call.func.attr
        return ""

    hook_b_try = None
    for node in ast.walk(main_fn):
        if not isinstance(node, ast.Try):
            continue
        body_call_names = {
            _call_name(c) for c in ast.walk(ast.Module(body=node.body, type_ignores=[]))
            if isinstance(c, ast.Call)
        }
        if "process_job" not in body_call_names:
            continue
        finally_call_names = {
            _call_name(c) for c in ast.walk(ast.Module(body=node.finalbody, type_ignores=[]))
            if isinstance(c, ast.Call)
        }
        if "cancel_upcoming_job" in finally_call_names:
            hook_b_try = node
            break

    assert hook_b_try is not None, (
        "Hook B invariant broken: expected a try-block in job_runner.main() whose body "
        "calls process_job() and whose finally calls cancel_upcoming_job()."
    )
    assert hook_b_try.handlers == [], (
        f"Hook B invariant broken: try-block must have NO except handlers "
        f"(pure try/finally). Found {len(hook_b_try.handlers)} handler(s). "
        "Do NOT replace `finally` with `except: pass + trailing cancel` — "
        "that would swallow exceptions and silence the outer main() error path."
    )
    # Also assert notify_upcoming_job fires BEFORE the try (sibling statement
    # immediately preceding it at the same block level).
    siblings = None
    for container in ast.walk(main_fn):
        for attr in ("body", "orelse", "finalbody"):
            block = getattr(container, attr, None)
            if isinstance(block, list) and hook_b_try in block:
                siblings = block
                break
        if siblings is not None:
            break
    assert siblings is not None, "could not locate hook_b_try's containing block"
    idx = siblings.index(hook_b_try)
    assert idx > 0, "Hook B try must be preceded by notify_upcoming_job(...)"
    prev = siblings[idx - 1]
    prev_calls = {
        _call_name(c) for c in ast.walk(ast.Module(body=[prev], type_ignores=[]))
        if isinstance(c, ast.Call)
    }
    assert "notify_upcoming_job" in prev_calls, (
        "Hook B invariant broken: statement immediately before the try-block "
        "must call notify_upcoming_job(...). Found calls: %s" % sorted(prev_calls)
    )


def test_24_hook_b_runtime_propagates_exception_and_cancels():
    """Runtime proof that Hook B's try/finally cancels on exception AND propagates.

    Mirrors the Hook B block literally with a raising stub in place of
    process_job. Async/await exception semantics are identical to sync for
    this shape; using sync keeps the test in the existing asyncio-free style
    and exercises the same CPython exception-unwinding machinery the
    production block relies on.
    """
    reset_module_state()
    # Bring pod to "ready" so notify_upcoming_job is a no-HTTP path.
    pod_manager._pod_status = "ready"
    pod_manager._pod_id = "pod-hookb"
    pod_manager._pod_url = "https://pod-hookb-8080.proxy.runpod.net"
    pod_manager._worker_auth_token = "tok"
    pod_manager._last_activity = time.monotonic()

    class _SimulatedProcessJobError(RuntimeError):
        pass

    def hook_b_block(job_id: str) -> None:
        # Literal mirror of job_runner.main()'s Hook B block.
        pod_manager.notify_upcoming_job(job_id)
        try:
            raise _SimulatedProcessJobError("simulated process_job failure")
        finally:
            pod_manager.cancel_upcoming_job(job_id)

    # Any HTTP call during this flow would indicate the pod state path is
    # wrong (cold-start attempt); handler raises if it sees one.
    handler = make_handler([])
    raised = False
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        try:
            hook_b_block("job-err")
        except _SimulatedProcessJobError:
            raised = True

    assert raised, "Hook B must propagate exceptions from the try body, not swallow them"
    assert "job-err" not in pod_manager._upcoming_jobs, pod_manager._upcoming_jobs
    assert pod_manager._upcoming_jobs == {}
    assert len(handler.calls) == 0


def test_25_hook_b_runtime_cancels_on_success():
    """Success path: Hook B's finally must fire cancel even on normal return."""
    reset_module_state()
    pod_manager._pod_status = "ready"
    pod_manager._pod_id = "pod-hookb-ok"
    pod_manager._pod_url = "https://pod-hookb-ok-8080.proxy.runpod.net"
    pod_manager._worker_auth_token = "tok"
    pod_manager._last_activity = time.monotonic()

    invocations: list[str] = []

    def hook_b_block(job_id: str) -> None:
        pod_manager.notify_upcoming_job(job_id)
        try:
            invocations.append("ran")  # simulated successful process_job
        finally:
            pod_manager.cancel_upcoming_job(job_id)

    handler = make_handler([])
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        hook_b_block("job-ok")

    assert invocations == ["ran"]
    assert "job-ok" not in pod_manager._upcoming_jobs
    assert pod_manager._upcoming_jobs == {}


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
        ("11: prewarm-then-fail -> idle terminates", test_11_prewarm_succeeds_then_word_fails_idle_terminates),
        ("12: guard - wrong backend -> noop", test_12_guard_wrong_backend_is_noop),
        ("13: guard - manual worker url -> noop", test_13_guard_manual_worker_url_is_noop),
        ("14: guard - no api key -> noop", test_14_guard_no_api_key_is_noop),
        ("15: notify_job adds to _upcoming_jobs", test_15_notify_job_adds_to_upcoming_jobs),
        ("16: notify_job noop when not applicable", test_16_notify_job_noop_when_not_applicable),
        ("17: notify_job triggers prewarm when idle", test_17_notify_job_triggers_prewarm_when_idle),
        ("18: cancel_job removes + bumps activity", test_18_cancel_job_removes_and_bumps_activity),
        ("19: cancel_job idempotent", test_19_cancel_job_idempotent),
        ("20: idle_check keeps alive for _upcoming_jobs", test_20_idle_check_keeps_pod_alive_for_upcoming_jobs),
        ("21: stale _upcoming_jobs GC", test_21_stale_jobs_gc),
        ("22: word and job dicts independent", test_22_word_and_job_dicts_are_independent),
        ("23: Hook B source is pure try/finally", test_23_hook_b_is_pure_try_finally_in_source),
        ("24: Hook B propagates exception + cancels", test_24_hook_b_runtime_propagates_exception_and_cancels),
        ("25: Hook B cancels on success", test_25_hook_b_runtime_cancels_on_success),
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
