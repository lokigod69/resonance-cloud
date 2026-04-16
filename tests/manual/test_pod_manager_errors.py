"""Standalone runnable tests for pod_manager error handling.

Covers the items in fix/pod-manager-cleanup:
    1. POST body includes gpuTypePriority="custom".
    2. 429 with Retry-After triggers retry; repeated 429 skips the volume.
    3. HTTP 400 is split from the generic capacity bucket and skips the volume.
    5. Assigned-GPU log line appears on successful creation.

Uses httpx.MockTransport (built-in) + unittest.mock to intercept HTTP calls
and time.sleep. No pytest required.

Run:
    cd orchestrator
    .venv/Scripts/python.exe -m tests.manual.test_pod_manager_errors
"""
from __future__ import annotations

import logging
import os
import sys
from typing import Callable, List
from unittest.mock import patch

# Set required env BEFORE importing pod_manager (config loads env at import).
os.environ.setdefault("RUNPOD_API_KEY", "test-api-key")
os.environ.setdefault("RUNPOD_VOLUME_IDS", "vol-a,vol-b")
os.environ.setdefault("RUNPOD_GPU_TYPE", "NVIDIA A40")
os.environ.setdefault("RUNPOD_FALLBACK_GPU_TYPES", "NVIDIA L40S,NVIDIA A100 80GB PCIe")

import httpx  # noqa: E402

from cloud_engines.video_engine import pod_manager  # noqa: E402


# ---------- mock infrastructure ----------

def make_handler(responses: List[Callable[[httpx.Request], httpx.Response]]):
    """Build a MockTransport handler that iterates through `responses`.

    Each entry is a callable (Request) -> Response. Exhausting the list raises
    so tests fail loudly rather than hanging on unexpected extra calls.
    """
    calls: List[httpx.Request] = []
    idx = {"i": 0}

    def handler(request: httpx.Request) -> httpx.Response:
        i = idx["i"]
        if i >= len(responses):
            raise AssertionError(
                f"Unexpected extra HTTP call #{i + 1} to {request.url}; "
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


_REAL_HTTPX_CLIENT = httpx.Client  # capture before any patching


class MockClientFactory:
    """Callable that substitutes httpx.Client; ignores timeout kwargs."""
    def __init__(self, handler):
        self.handler = handler

    def __call__(self, *_args, **_kwargs):
        return _REAL_HTTPX_CLIENT(transport=httpx.MockTransport(self.handler))


def patched_pod_create(handler, fn, *args, **kwargs):
    """Run fn() with httpx.Client and time.sleep patched inside pod_manager."""
    with patch.object(pod_manager.httpx, "Client", MockClientFactory(handler)):
        with patch.object(pod_manager.time, "sleep", lambda _s: None):
            return fn(*args, **kwargs)


def reset_module_state() -> None:
    pod_manager._reset_state()


# ---------- individual tests ----------

def test_item1_gpu_type_priority_custom():
    """POST body contains gpuTypePriority='custom' and gpuTypeIds ordered."""
    reset_module_state()
    handler = make_handler([
        ok(200, {
            "id": "pod-xyz",
            "portMappings": {"8080": 12345},
            "machine": {"gpuDisplayName": "NVIDIA A40"},
        }),
    ])
    pod_id, token = patched_pod_create(handler, pod_manager._create_pod)
    assert pod_id == "pod-xyz", pod_id
    assert token
    req = handler.calls[0]
    body = __import__("json").loads(req.content)
    assert body["gpuTypePriority"] == "custom", body["gpuTypePriority"]
    assert body["gpuTypeIds"][0] == "NVIDIA A40", body["gpuTypeIds"]
    assert "NVIDIA L40S" in body["gpuTypeIds"]
    print("  [PASS] item 1: gpuTypePriority='custom', gpuTypeIds ordered")


def test_item2_429_retry_then_success(caplog_records):
    """429 once -> retry -> 200. One volume used, two POSTs."""
    reset_module_state()
    handler = make_handler([
        ok(429, headers={"Retry-After": "5"}),
        ok(200, {"id": "pod-abc", "machine": {"gpuDisplayName": "NVIDIA L40S"}}),
    ])
    pod_id, _ = patched_pod_create(handler, pod_manager._create_pod)
    assert pod_id == "pod-abc"
    assert len(handler.calls) == 2
    messages = [r.getMessage() for r in caplog_records]
    assert any("Rate limited (429)" in m and "retry 1/3" in m for m in messages), messages
    print("  [PASS] item 2: 429 Retry-After triggers exactly one retry, then success")


def test_item2_429_exhausts_then_skips_volume(caplog_records):
    """429 x4 on vol-a exhausts retries -> skip to vol-b -> success."""
    reset_module_state()
    handler = make_handler([
        ok(429, headers={"Retry-After": "2"}),  # vol-a initial
        ok(429, headers={"Retry-After": "2"}),  # vol-a retry 1
        ok(429, headers={"Retry-After": "2"}),  # vol-a retry 2
        ok(429, headers={"Retry-After": "2"}),  # vol-a retry 3
        ok(200, {"id": "pod-def", "machine": {"gpuTypeId": "NVIDIA A100 80GB PCIe"}}),  # vol-b
    ])
    pod_id, _ = patched_pod_create(handler, pod_manager._create_pod)
    assert pod_id == "pod-def"
    assert len(handler.calls) == 5
    messages = [r.getMessage() for r in caplog_records]
    assert any("rate-limit persisted after 3 retries" in m for m in messages), messages
    print("  [PASS] item 2: 3 consecutive 429s exhaust, volume skipped, next volume used")


def test_item3_http_400_splits_and_skips(caplog_records):
    """400 on vol-a logs ERROR + skips; vol-b succeeds."""
    reset_module_state()
    handler = make_handler([
        ok(400, {"error": "invalid gpuTypeIds"}),  # vol-a
        ok(200, {"id": "pod-ghi", "machine": {"gpuDisplayName": "NVIDIA L40S"}}),  # vol-b
    ])
    pod_id, _ = patched_pod_create(handler, pod_manager._create_pod)
    assert pod_id == "pod-ghi"
    error_records = [r for r in caplog_records if r.levelno == logging.ERROR]
    assert any("Invalid pod config (400)" in r.getMessage() for r in error_records), [
        r.getMessage() for r in error_records
    ]
    print("  [PASS] item 3: HTTP 400 logs ERROR, skips volume, next volume used")


def test_item3_http_500_still_warning(caplog_records):
    """500 still classified as GPU unavailable -> WARNING (not ERROR)."""
    reset_module_state()
    handler = make_handler([
        ok(500, {"error": "no instances available"}),  # vol-a
        ok(200, {"id": "pod-jkl", "machine": {"gpuDisplayName": "NVIDIA A40"}}),  # vol-b
    ])
    pod_id, _ = patched_pod_create(handler, pod_manager._create_pod)
    assert pod_id == "pod-jkl"
    messages = [(r.levelname, r.getMessage()) for r in caplog_records]
    assert any(
        lvl == "WARNING" and "GPU unavailable" in msg and "HTTP 500" in msg
        for lvl, msg in messages
    ), messages
    print("  [PASS] item 3: HTTP 500 remains WARNING 'GPU unavailable' (unchanged)")


def test_item5_gpu_logged_on_create(caplog_records):
    """Success log includes gpu=<name>."""
    reset_module_state()
    handler = make_handler([
        ok(200, {"id": "pod-mno", "machine": {"gpuDisplayName": "NVIDIA RTX 6000 Ada"}}),
    ])
    pod_manager._reset_state()
    pod_id, _ = patched_pod_create(handler, pod_manager._create_pod)
    assert pod_id == "pod-mno"
    messages = [r.getMessage() for r in caplog_records]
    assert any("gpu=NVIDIA RTX 6000 Ada" in m for m in messages), messages
    print("  [PASS] item 5: successful create log includes gpu=<name>")


def test_extract_gpu_type_fallbacks():
    """_extract_gpu_type handles all shapes and returns None otherwise."""
    assert pod_manager._extract_gpu_type(
        {"machine": {"gpuDisplayName": "Display"}}
    ) == "Display"
    assert pod_manager._extract_gpu_type(
        {"machine": {"gpuTypeId": "TypeId"}}
    ) == "TypeId"
    assert pod_manager._extract_gpu_type({"gpuTypeId": "Top"}) == "Top"
    assert pod_manager._extract_gpu_type({"gpuTypeIds": ["First", "Second"]}) == "First"
    assert pod_manager._extract_gpu_type({"unrelated": 1}) is None
    assert pod_manager._extract_gpu_type({"machine": None}) is None
    print("  [PASS] helper: _extract_gpu_type fallback chain")


def test_parse_retry_after():
    """_parse_retry_after respects bounds and default."""
    assert pod_manager._parse_retry_after(None, 30) == 30
    assert pod_manager._parse_retry_after("", 30) == 30
    assert pod_manager._parse_retry_after("0", 30) == 1  # lower bound
    assert pod_manager._parse_retry_after("9999", 30) == 300  # upper bound
    assert pod_manager._parse_retry_after("45", 30) == 45
    assert pod_manager._parse_retry_after("Wed, 21 Oct 2015 07:28:00 GMT", 30) == 30
    print("  [PASS] helper: _parse_retry_after bounds + fallbacks")


# ---------- runner ----------

class ListHandler(logging.Handler):
    def __init__(self):
        super().__init__()
        self.records: list[logging.LogRecord] = []

    def emit(self, record: logging.LogRecord) -> None:
        self.records.append(record)


def main() -> int:
    logging.basicConfig(level=logging.DEBUG, format="%(levelname)s %(name)s: %(message)s")
    pm_logger = logging.getLogger(pod_manager.__name__)
    pm_logger.setLevel(logging.DEBUG)

    tests = [
        ("item 1: gpuTypePriority=custom", test_item1_gpu_type_priority_custom, False),
        ("item 2: 429 single retry -> success", test_item2_429_retry_then_success, True),
        ("item 2: 429 exhausts -> skip volume", test_item2_429_exhausts_then_skips_volume, True),
        ("item 3: 400 splits to ERROR + skip", test_item3_http_400_splits_and_skips, True),
        ("item 3: 500 stays WARNING", test_item3_http_500_still_warning, True),
        ("item 5: gpu= log on create", test_item5_gpu_logged_on_create, True),
        ("helper: _extract_gpu_type", test_extract_gpu_type_fallbacks, False),
        ("helper: _parse_retry_after", test_parse_retry_after, False),
    ]

    failures: list[tuple[str, BaseException]] = []
    for name, fn, wants_log in tests:
        print(f"[RUN] {name}")
        handler = ListHandler()
        pm_logger.addHandler(handler)
        try:
            if wants_log:
                fn(handler.records)
            else:
                fn()
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
