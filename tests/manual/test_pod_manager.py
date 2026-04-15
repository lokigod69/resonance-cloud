"""Manual verification for pod_manager (NOT a pytest test).

Usage:
    cd orchestrator
    python -m tests.manual.test_pod_manager

Requires RUNPOD_API_KEY and RUNPOD_VOLUME_IDS env vars set.
This WILL create and terminate a real pod - incurs cost (~$0.05 for a 3-min test).
"""
import logging
import os
import time

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")

# Force Level 2 mode
os.environ.pop("GPU_WORKER_URL", None)

from cloud_engines.video_engine import pod_manager  # noqa: E402
from cloud_engines.video_engine.config import RUNPOD_API_KEY, RUNPOD_VOLUME_IDS  # noqa: E402

assert RUNPOD_API_KEY, "RUNPOD_API_KEY env var required"
assert RUNPOD_VOLUME_IDS, "RUNPOD_VOLUME_IDS env var required"


def main() -> None:
    print("=== 1. First ensure_pod_ready: should create a pod ===")
    t0 = time.monotonic()
    url1, token1 = pod_manager.ensure_pod_ready()
    print(f"   Ready after {time.monotonic() - t0:.1f}s")
    print(f"   URL: {url1}")
    print(f"   Pod ID: {pod_manager._pod_id}")
    assert pod_manager._pod_status == "ready"

    print("\n=== 2. Second ensure_pod_ready: should return same URL ===")
    url2, token2 = pod_manager.ensure_pod_ready()
    assert url1 == url2, "Second call should return same URL (no new pod)"
    assert token1 == token2
    print(f"   Same URL returned: {url2}")

    print("\n=== 3. record_activity ===")
    pod_manager.record_activity()
    print(f"   Activity recorded at {pod_manager._last_activity:.1f}")

    print("\n=== 4. idle_check with last_activity forced to 0: should terminate ===")
    pod_id = pod_manager._pod_id
    # time.monotonic() is seconds since an arbitrary epoch - always a large
    # number for a running process, so (monotonic - 0.0) always exceeds the
    # 300s default timeout. No need to patch RUNPOD_IDLE_TIMEOUT.
    pod_manager._last_activity = 0.0
    pod_manager.idle_check()
    assert pod_manager._pod_status == "idle", "Should be terminated"
    print(f"   Pod {pod_id} terminated OK")

    print("\n=== All manual checks passed ===")


if __name__ == "__main__":
    main()
