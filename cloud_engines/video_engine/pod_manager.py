"""RunPod Pod Automation (Level 2).

Manages one GPU pod lifecycle (create -> health-check -> terminate) on behalf
of LTXSelfHostedAdapter. Synchronous module. Thread-safe via a module-level
lock.

State model:
    pod_status transitions: idle -> creating -> starting -> ready -> terminating -> idle
    (terminated or failed pods reset to idle)

Entry points:
    ensure_pod_ready()   - used by adapter before submit
    acquire_use()        - used by adapter immediately before job submit
    release_use()        - used by adapter in finally after job completes/fails
    idle_check()         - called periodically from start_cloud.py
    cleanup_orphans()    - called once at startup
"""
from __future__ import annotations

from datetime import datetime, timezone
import logging
import secrets
import threading
import time
from typing import Optional, Tuple

import httpx

from .config import (
    RUNPOD_API_KEY,
    RUNPOD_DOCKER_IMAGE,
    RUNPOD_FALLBACK_GPU_TYPES,
    RUNPOD_GPU_TYPE,
    RUNPOD_IDLE_TIMEOUT,
    RUNPOD_POD_NAME,
    RUNPOD_POD_STARTUP_TIMEOUT,
    RUNPOD_VOLUME_IDS,
)

logger = logging.getLogger(__name__)

_RUNPOD_API_BASE = "https://rest.runpod.io/v1"
_HEALTH_CHECK_INTERVAL = 10    # seconds between /health polls
_POD_STATUS_POLL_INTERVAL = 10 # seconds between GET /pods/{id} polls

# Module-level state (singleton)
_lock = threading.Lock()
_pod_id: Optional[str] = None
_pod_url: Optional[str] = None
_pod_status: str = "idle"  # idle | creating | starting | ready | terminating
_worker_auth_token: Optional[str] = None
_last_activity: float = 0.0
_active_jobs: int = 0


def _api_headers() -> dict[str, str]:
    if not RUNPOD_API_KEY:
        raise RuntimeError("RUNPOD_API_KEY not set - cannot use Level 2 pod automation")
    return {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json",
    }


def _reset_state() -> None:
    """Reset all pod state to idle. Caller must hold _lock."""
    global _pod_id, _pod_url, _pod_status, _worker_auth_token, _last_activity, _active_jobs
    _pod_id = None
    _pod_url = None
    _pod_status = "idle"
    _worker_auth_token = None
    _last_activity = 0.0
    _active_jobs = 0


def _create_pod() -> tuple[str, str]:
    """Create a pod. Returns (pod_id, worker_auth_token).

    Caller must hold _lock. Tries each volume with the full GPU list in one
    RunPod API call (gpuTypeIds array). On success, returns immediately -
    readiness polling is done by _wait_for_pod_ready.
    """
    global _pod_id, _pod_status, _worker_auth_token

    if not RUNPOD_VOLUME_IDS:
        raise RuntimeError("RUNPOD_VOLUME_IDS not set - at least one network volume ID required")

    gpu_types = [RUNPOD_GPU_TYPE] + [g for g in RUNPOD_FALLBACK_GPU_TYPES if g != RUNPOD_GPU_TYPE]
    auth_token = secrets.token_urlsafe(32)

    MAX_CREATE_RETRIES = 3
    RETRY_DELAY_SECONDS = 30
    last_error: Optional[str] = None
    for attempt in range(1, MAX_CREATE_RETRIES + 1):
        for volume_id in RUNPOD_VOLUME_IDS:
            payload = {
                "name": RUNPOD_POD_NAME,
                "imageName": RUNPOD_DOCKER_IMAGE,
                "gpuTypeIds": gpu_types,
                "gpuCount": 1,
                "gpuTypePriority": "availability",
                "containerDiskInGb": 10,
                "volumeInGb": 0,
                "networkVolumeId": volume_id,
                "ports": ["8080/http"],
                "dockerStartCmd": ["uvicorn", "src.app:app", "--host", "0.0.0.0", "--port", "8080"],
                "env": {
                    "WORKER_AUTH_TOKEN": auth_token,
                    "DIFFUSERS_MODEL_DIR": "/workspace/models/ltx-2.3-diffusers",
                    "UPSAMPLER_MODEL_DIR": "/workspace/models/ltx-2.3-upsampler",
                    "LORA_DIR": "/workspace/models/loras",
                },
                "interruptible": False,
            }
            logger.info(
                "RunPod: Creating pod (attempt=%d/%d, volume=%s, gpus=%s)",
                attempt, MAX_CREATE_RETRIES, volume_id, gpu_types,
            )
            try:
                with httpx.Client(timeout=httpx.Timeout(60.0, connect=15.0)) as client:
                    resp = client.post(
                        f"{_RUNPOD_API_BASE}/pods",
                        json=payload,
                        headers=_api_headers(),
                    )
            except httpx.HTTPError as e:
                last_error = f"network error: {e}"
                logger.warning("RunPod: Pod create failed (volume=%s): %s", volume_id, last_error)
                continue

            if resp.status_code in (200, 201):
                try:
                    data = resp.json()
                except ValueError:
                    raise RuntimeError(
                        f"RunPod create returned {resp.status_code} with non-JSON body: {resp.text[:200]}"
                    )
                pod_id = data.get("id")
                if not pod_id:
                    raise RuntimeError(f"RunPod create response missing 'id' field: {str(data)[:200]}")
                _pod_id = pod_id
                _worker_auth_token = auth_token
                _pod_status = "creating"
                logger.info(
                    "RunPod: Pod %s created (portMappings=%s), waiting for ready...",
                    pod_id, data.get("portMappings"),
                )
                return pod_id, auth_token

            # Availability-related rejections: try next volume
            body_text = resp.text
            last_error = f"HTTP {resp.status_code}: {body_text[:200]}"
            if resp.status_code in (400, 404, 409, 500, 503):
                logger.warning(
                    "RunPod: GPU unavailable in volume %s - %s. Trying next volume...",
                    volume_id, last_error,
                )
                continue
            if resp.status_code == 401:
                raise RuntimeError("RunPod auth failed - check RUNPOD_API_KEY")
            # Other errors: stop looping
            raise RuntimeError(f"RunPod create pod failed: {last_error}")

        if attempt < MAX_CREATE_RETRIES:
            logger.warning(
                "RunPod: No GPU available in any region (attempt %d/%d). Retrying in %ds...",
                attempt, MAX_CREATE_RETRIES, RETRY_DELAY_SECONDS,
            )
            time.sleep(RETRY_DELAY_SECONDS)

    logger.error("RunPod: No GPU available after %d attempts", MAX_CREATE_RETRIES)
    raise RuntimeError(f"No GPU available after {MAX_CREATE_RETRIES} attempts. Last error: {last_error}")


def _proxy_url_for_pod(pod_id: str) -> str:
    """RunPod public proxy URL for port 8080 on the pod."""
    return f"https://{pod_id}-8080.proxy.runpod.net"


def _wait_for_pod_ready(pod_id: str, auth_token: str, timeout: float) -> str:
    """Poll RunPod until pod is RUNNING, then worker /health until model_loaded.

    Returns the proxy URL. On timeout or failure, terminates the pod and raises.
    Caller must hold _lock.
    """
    global _pod_url, _pod_status, _last_activity

    deadline = time.monotonic() + timeout

    # Phase A: wait for desiredStatus == RUNNING with ports populated
    while True:
        if time.monotonic() > deadline:
            _terminate_pod_locked(pod_id)
            raise TimeoutError(f"Pod {pod_id} did not enter RUNNING state within {timeout}s")

        try:
            with httpx.Client(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
                resp = client.get(f"{_RUNPOD_API_BASE}/pods/{pod_id}", headers=_api_headers())
                resp.raise_for_status()
                try:
                    data = resp.json()
                except ValueError:
                    logger.warning("RunPod: Pod %s status response not valid JSON", pod_id)
                    time.sleep(_POD_STATUS_POLL_INTERVAL)
                    continue
        except httpx.HTTPError as e:
            logger.warning("RunPod: Poll pod %s failed: %s", pod_id, e)
            time.sleep(_POD_STATUS_POLL_INTERVAL)
            continue

        status = data.get("desiredStatus", "")
        ports = data.get("portMappings") or {}
        if status == "RUNNING" and ports:
            break
        logger.info("RunPod: Pod %s status=%s, waiting...", pod_id, status)
        time.sleep(_POD_STATUS_POLL_INTERVAL)

    proxy_url = _proxy_url_for_pod(pod_id)
    _pod_status = "starting"

    # Phase B: wait for worker /health to report model_loaded
    while True:
        if time.monotonic() > deadline:
            _terminate_pod_locked(pod_id)
            raise TimeoutError(f"Pod {pod_id} health check did not pass within {timeout}s")

        try:
            with httpx.Client(timeout=httpx.Timeout(15.0, connect=5.0)) as client:
                resp = client.get(
                    f"{proxy_url}/health",
                    headers={"Authorization": f"Bearer {auth_token}"},
                )
            if resp.status_code == 200:
                try:
                    health = resp.json()
                except ValueError:
                    logger.warning("RunPod: Pod %s health response not valid JSON", pod_id)
                    time.sleep(_HEALTH_CHECK_INTERVAL)
                    continue
                if health.get("model_loaded") is True and health.get("status") == "healthy":
                    logger.info("RunPod: Pod %s health check passed - worker ready", pod_id)
                    _pod_url = proxy_url
                    _pod_status = "ready"
                    _last_activity = time.monotonic()
                    return proxy_url
                logger.info(
                    "RunPod: Pod %s health: status=%s model_loaded=%s",
                    pod_id, health.get("status"), health.get("model_loaded"),
                )
        except httpx.HTTPError as e:
            logger.info("RunPod: Pod %s /health not yet reachable: %s", pod_id, e)

        time.sleep(_HEALTH_CHECK_INTERVAL)


def _terminate_pod_locked(pod_id: str) -> None:
    """DELETE pod via RunPod API. Caller must hold _lock. Idempotent."""
    global _pod_status
    _pod_status = "terminating"
    try:
        with httpx.Client(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
            resp = client.delete(f"{_RUNPOD_API_BASE}/pods/{pod_id}", headers=_api_headers())
        if resp.status_code in (200, 204, 404):
            logger.info("RunPod: Pod %s terminated", pod_id)
        else:
            logger.warning(
                "RunPod: Pod %s terminate returned HTTP %s: %s",
                pod_id, resp.status_code, resp.text[:200],
            )
    except httpx.HTTPError as e:
        logger.warning("RunPod: Pod %s terminate network error: %s", pod_id, e)
    finally:
        _reset_state()


def _terminate_orphan(pod_id: str) -> None:
    """DELETE an orphan pod without touching module state. Best-effort."""
    try:
        with httpx.Client(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
            resp = client.delete(f"{_RUNPOD_API_BASE}/pods/{pod_id}", headers=_api_headers())
        if resp.status_code in (200, 204, 404):
            logger.info("RunPod: Orphan pod %s terminated", pod_id)
        else:
            logger.warning(
                "RunPod: Orphan %s terminate returned HTTP %s: %s",
                pod_id, resp.status_code, resp.text[:200],
            )
    except httpx.HTTPError as e:
        logger.warning("RunPod: Orphan %s terminate error: %s", pod_id, e)


def _quick_health_check(url: str, token: str) -> bool:
    """Quick probe: is the worker still alive? Returns True if healthy."""
    try:
        with httpx.Client(timeout=httpx.Timeout(5.0, connect=3.0)) as client:
            resp = client.get(f"{url}/health", headers={"Authorization": f"Bearer {token}"})
        return resp.status_code == 200 and resp.json().get("model_loaded") is True
    except (httpx.HTTPError, ValueError):
        return False


def ensure_pod_ready() -> Tuple[str, str]:
    """Return (pod_url, worker_auth_token). Creates pod if necessary.

    Thread-safe: serialized by _lock. If a pod is already ready, returns
    immediately. If creating/starting, caller waits for the in-flight creation
    to complete (via the same lock).
    """
    global _last_activity
    with _lock:
        # Fast path: ready and healthy
        if _pod_status == "ready" and _pod_id and _pod_url and _worker_auth_token:
            if _quick_health_check(_pod_url, _worker_auth_token):
                return _pod_url, _worker_auth_token
            logger.warning(
                "RunPod: Ready pod %s failed health check - terminating and recreating",
                _pod_id,
            )
            _terminate_pod_locked(_pod_id)

        try:
            # Need to create
            pod_id, auth_token = _create_pod()
            url = _wait_for_pod_ready(pod_id, auth_token, RUNPOD_POD_STARTUP_TIMEOUT)
            _last_activity = time.monotonic()
        except Exception:
            # Best-effort terminate - pod may be running even if readiness failed
            if _pod_id and _pod_status != "idle":
                leaked_pod_id = _pod_id
                try:
                    _terminate_pod_locked(leaked_pod_id)
                except Exception:
                    logger.warning("RunPod: Failed to terminate pod %s during cleanup", leaked_pod_id)
                    _reset_state()
            raise
        assert _worker_auth_token is not None
        return url, _worker_auth_token


def acquire_use() -> None:
    """Mark pod as in-use. Called before job starts."""
    global _active_jobs
    with _lock:
        _active_jobs += 1


def release_use() -> None:
    """Mark job complete. Called in finally block after job ends."""
    global _active_jobs, _last_activity
    with _lock:
        _active_jobs = max(0, _active_jobs - 1)
        _last_activity = time.monotonic()


def idle_check() -> None:
    """If pod is ready and idle past timeout, terminate it.

    Called periodically by start_cloud.py's background task.
    """
    with _lock:
        if _pod_status != "ready" or not _pod_id:
            return
        if _active_jobs > 0:
            return
        idle_seconds = time.monotonic() - _last_activity
        if idle_seconds < RUNPOD_IDLE_TIMEOUT:
            return
        logger.info(
            "RunPod: Pod %s idle for %.0fs (timeout=%ds) - terminating",
            _pod_id, idle_seconds, RUNPOD_IDLE_TIMEOUT,
        )
        _terminate_pod_locked(_pod_id)


def cleanup_orphans() -> None:
    """Terminate any leftover 'resonance-gpu-worker' pods. Called at startup.

    Prevents billing leaks from crashed orchestrator instances. Never raises -
    best-effort. Acquires lock so it's safe to call concurrently with other
    entry points.

    NOTE: This cleanup assumes a single orchestrator replica (Railway's default).
    If running multiple replicas, pod ownership must be tracked via a durable
    store or pod labels/tags instead of pod name alone.
    """
    if not RUNPOD_API_KEY:
        logger.info("RunPod: RUNPOD_API_KEY not set, skipping orphan cleanup")
        return
    try:
        try:
            with httpx.Client(timeout=httpx.Timeout(30.0, connect=10.0)) as client:
                resp = client.get(f"{_RUNPOD_API_BASE}/pods", headers=_api_headers())
            if resp.status_code != 200:
                logger.warning(
                    "RunPod: List pods for orphan cleanup returned HTTP %s",
                    resp.status_code,
                )
                return
            pods = resp.json()
            # API may return list directly or wrap in {"pods": [...]} - handle both
            if isinstance(pods, dict):
                pods = pods.get("pods", pods.get("data", []))
        except httpx.HTTPError as e:
            logger.warning("RunPod: Orphan cleanup list failed: %s", e)
            return

        with _lock:
            for pod in pods:
                pod_id = pod.get("id")
                name = pod.get("name")
                if name != RUNPOD_POD_NAME or not pod_id or pod_id == _pod_id:
                    continue

                pod_age_seconds = None
                last_started_at = pod.get("lastStartedAt")
                if isinstance(last_started_at, str):
                    try:
                        started_at = datetime.fromisoformat(last_started_at.replace("Z", "+00:00"))
                        pod_age_seconds = max(
                            0.0,
                            (datetime.now(timezone.utc) - started_at).total_seconds(),
                        )
                    except ValueError:
                        pod_age_seconds = None

                if pod_age_seconds is None:
                    uptime_seconds = pod.get("uptimeSeconds")
                    if isinstance(uptime_seconds, (int, float)):
                        pod_age_seconds = float(uptime_seconds)

                if pod_age_seconds is None:
                    runtime = pod.get("runtime")
                    if isinstance(runtime, dict):
                        uptime_seconds = runtime.get("uptimeSecs")
                        if isinstance(uptime_seconds, (int, float)):
                            pod_age_seconds = float(uptime_seconds)

                if pod_age_seconds is not None and pod_age_seconds < 600:
                    logger.info(
                        "RunPod: Skipping recent pod %s (age=%.0fs) - may belong to an active startup",
                        pod_id,
                        pod_age_seconds,
                    )
                    continue

                logger.info("RunPod: Orphan pod %s found - terminating", pod_id)
                _terminate_orphan(pod_id)
    except Exception:
        logger.exception("RunPod: Orphan cleanup failed (non-fatal)")
