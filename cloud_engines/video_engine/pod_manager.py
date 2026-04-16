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
from email.utils import parsedate_to_datetime
import logging
import secrets
import threading
import time
from typing import Optional, Tuple

import httpx

from .config import (
    GPU_WORKER_URL,
    POD_PREWARM_ENABLED,
    POD_PREWARM_STALE_SECONDS,
    RUNPOD_429_MAX_RETRIES,
    RUNPOD_API_KEY,
    RUNPOD_DOCKER_IMAGE,
    RUNPOD_FALLBACK_GPU_TYPES,
    RUNPOD_GPU_TYPE,
    RUNPOD_IDLE_TIMEOUT,
    RUNPOD_POD_NAME,
    RUNPOD_POD_STARTUP_TIMEOUT,
    RUNPOD_VOLUME_IDS,
    VIDEO_BACKEND,
)
from src.cost_logger import log_cost

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
_pod_gpu_type: Optional[str] = None  # Actual GPU assigned by RunPod
_pod_created_at: float = 0.0         # monotonic timestamp of pod creation

# Pipeline-driven pre-warm tracking. Keys are word_id strings; values are the
# time.monotonic() when the word entered processing. idle_check refuses to
# terminate while this dict is non-empty (keep-alive during upstream stages).
_upcoming_words: dict[str, float] = {}
_prewarm_in_flight: bool = False

# Per-GPU hourly rates (USD) — RunPod community cloud pricing
# Keys must match RunPod API gpuTypeId / displayName exactly.
# These are the GPUs in RUNPOD_GPU_TYPE + RUNPOD_FALLBACK_GPU_TYPES (48GB+ VRAM).
_GPU_HOURLY_RATES: dict[str, float] = {
    # Primary
    "NVIDIA L40S":                                      0.86,  # 48 GB
    # Fallback list (ordered cheapest-first in env var)
    "NVIDIA RTX A6000":                                 0.49,  # 48 GB
    "NVIDIA L40":                                       0.99,  # 48 GB
    "NVIDIA RTX 6000 Ada Generation":                   0.77,  # 48 GB
    "NVIDIA A100 80GB PCIe":                            1.39,  # 80 GB
    "NVIDIA A100-SXM4-80GB":                            1.39,  # 80 GB
    "NVIDIA RTX PRO 6000 Blackwell Server Edition":     1.89,  # 96 GB
    "NVIDIA RTX PRO 6000 Blackwell Workstation Edition": 1.89, # 96 GB
}
_GPU_RATE_DEFAULT = 1.89  # Fallback: assume RTX PRO 6000 rate to avoid undercount


def _api_headers() -> dict[str, str]:
    if not RUNPOD_API_KEY:
        raise RuntimeError("RUNPOD_API_KEY not set - cannot use Level 2 pod automation")
    return {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json",
    }


_RETRY_AFTER_MAX = 120  # Upper bound on a single Retry-After sleep (seconds)


def _parse_retry_after(header_value: Optional[str], default: int) -> int:
    """Parse the Retry-After header per RFC 7231 §7.1.3, bounded [1, 120].

    Accepts integer seconds OR HTTP-date. Cap of 120s prevents a pathological
    server value (e.g. Retry-After: 3600) from blocking for hours across the
    retry budget.
    """
    if not header_value:
        return default
    stripped = header_value.strip()
    try:
        return max(1, min(_RETRY_AFTER_MAX, int(stripped)))
    except ValueError:
        pass
    try:
        target = parsedate_to_datetime(stripped)
    except (TypeError, ValueError):
        return default
    if target is None:
        return default
    if target.tzinfo is None:
        target = target.replace(tzinfo=timezone.utc)
    delta = (target - datetime.now(timezone.utc)).total_seconds()
    return max(1, min(_RETRY_AFTER_MAX, int(delta)))


def _extract_gpu_type(response: dict) -> Optional[str]:
    """Best-effort GPU identifier from a RunPod pod payload.

    Per RunPod OpenAPI, pod responses may carry GPU info in three places:
        1. top-level `gpu` object with `displayName`
        2. `machine.gpuDisplayName` / `machine.gpuTypeId`
        3. `gpuTypeId` / `gpuTypeIds` (POST echo)
    Return None if nothing matches. On None, the diagnostic 'poll response
    keys=...' log still reveals the real field name for future tightening.
    """
    gpu = response.get("gpu")
    if isinstance(gpu, dict):
        if gpu.get("displayName"):
            return str(gpu["displayName"])
        if gpu.get("id"):
            return str(gpu["id"])
    machine = response.get("machine") or {}
    if isinstance(machine, dict):
        if machine.get("gpuDisplayName"):
            return str(machine["gpuDisplayName"])
        if machine.get("gpuTypeId"):
            return str(machine["gpuTypeId"])
    if response.get("gpuTypeId"):
        return str(response["gpuTypeId"])
    gpu_list = response.get("gpuTypeIds")
    if isinstance(gpu_list, list) and gpu_list:
        return str(gpu_list[0])
    return None


def _reset_state() -> None:
    """Reset all pod state to idle. Caller must hold _lock."""
    global _pod_id, _pod_url, _pod_status, _worker_auth_token, _last_activity, _active_jobs, _pod_gpu_type, _pod_created_at, _prewarm_in_flight
    _pod_id = None
    _pod_url = None
    _pod_status = "idle"
    _worker_auth_token = None
    _last_activity = 0.0
    _active_jobs = 0
    _pod_gpu_type = None
    _pod_created_at = 0.0
    _upcoming_words.clear()
    _prewarm_in_flight = False


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
                # "custom" honors gpuTypeIds ordering (cheapest-first); "availability"
                # would ignore our cost ordering. Enum per RunPod OpenAPI.
                "gpuTypePriority": "custom",
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
                    retry_count = 0
                    while resp.status_code == 429 and retry_count < RUNPOD_429_MAX_RETRIES:
                        retry_count += 1
                        retry_after = _parse_retry_after(
                            resp.headers.get("Retry-After"), default=30
                        )
                        logger.warning(
                            "RunPod: Rate limited (429), sleeping %ds before retry %d/%d (volume=%s)",
                            retry_after, retry_count, RUNPOD_429_MAX_RETRIES, volume_id,
                        )
                        time.sleep(retry_after)
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
                _pod_created_at = time.monotonic()
                assigned_gpu = _extract_gpu_type(data)
                _pod_gpu_type = assigned_gpu
                logger.info(
                    "RunPod: Pod %s created in volume %s (gpu=%s, portMappings=%s), waiting for ready...",
                    pod_id, volume_id, assigned_gpu or "unknown", data.get("portMappings"),
                )
                return pod_id, auth_token

            body_text = resp.text
            last_error = f"HTTP {resp.status_code}: {body_text[:200]}"
            if resp.status_code == 429:
                # Retries exhausted above
                logger.error(
                    "RunPod: 429 rate-limit persisted after %d retries for volume %s, skipping",
                    RUNPOD_429_MAX_RETRIES, volume_id,
                )
                continue
            if resp.status_code == 400:
                # TODO: consider alerting - 400 means RunPod rejected our payload
                # (bad GPU enum, invalid volume, malformed body). Not a capacity issue.
                # If ALL volumes return 400 it will fire once per (attempt, volume),
                # so up to MAX_CREATE_RETRIES × len(RUNPOD_VOLUME_IDS) ERROR lines
                # before the outer loop raises. Loud is intentional for config bugs.
                logger.error(
                    "RunPod: Invalid pod config (400) for volume %s: %s. "
                    "This is NOT a capacity issue - check payload/GPU enum/volume ID. Skipping.",
                    volume_id, last_error,
                )
                continue
            if resp.status_code == 404:
                # 404 on POST /v1/pods is anomalous - endpoint missing, account
                # issue, or API moved. Not a capacity issue; log loudly.
                logger.error(
                    "RunPod: Unexpected 404 on pod create for volume %s: %s. "
                    "This is NOT a capacity issue - check API base URL / account status.",
                    volume_id, last_error,
                )
                continue
            if resp.status_code in (409, 500, 503):
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
    gpu_logged = False

    # Phase A: wait for desiredStatus == RUNNING (portMappings is not populated
    # for HTTP-proxy pods; Phase B is the true readiness gate via /health)
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

        logger.info(
            "RunPod: Pod %s poll response keys=%s portMappings=%s status=%s desiredStatus=%s",
            pod_id, list(data.keys()), data.get("portMappings"),
            data.get("status"), data.get("desiredStatus"),
        )

        if not gpu_logged:
            gpu_hint = _extract_gpu_type(data)
            if gpu_hint:
                global _pod_gpu_type
                _pod_gpu_type = gpu_hint
                logger.info("RunPod: Pod %s assigned GPU: %s", pod_id, gpu_hint)
                gpu_logged = True

        status = data.get("desiredStatus", "")
        if status == "RUNNING":
            break
        logger.info(
            "RunPod: Pod %s desiredStatus=%s, runtime=%s, elapsed=%.0fs",
            pod_id, data.get("desiredStatus"), data.get("runtime"),
            time.monotonic() - (deadline - timeout),
        )
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
        # Log pod lifecycle cost before resetting state
        if _pod_created_at > 0:
            _approx_uptime = time.monotonic() - _pod_created_at
            _gpu_name = _pod_gpu_type or "unknown"
            _hourly_rate = _GPU_HOURLY_RATES.get(_gpu_name, _GPU_RATE_DEFAULT)
            _estimated_cost = round((_approx_uptime / 3600) * _hourly_rate, 4)
            log_cost(
                stage="video_infrastructure",
                provider="runpod",
                model="pod_lifecycle",
                status="terminated",
                usage_metrics={
                    "pod_id": pod_id,
                    "gpu_type": _gpu_name,
                    "gpu_hourly_rate": _hourly_rate,
                    "uptime_seconds": round(_approx_uptime, 1),
                },
                estimated_cost_usd=_estimated_cost,
            )
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


def _prewarm_applicable() -> bool:
    """True iff this deployment will actually use pod_manager for video.

    pod_manager is only active when VIDEO_BACKEND=="self_hosted" AND
    GPU_WORKER_URL is empty (auto-create path) AND RUNPOD_API_KEY is set.
    In every other configuration (fal, kling, runpod-serverless, manual
    GPU_WORKER_URL override, or local mode with no key) the pre-warm signal
    must be a no-op so we don't spin up pods the video stage will never call.
    """
    return (
        POD_PREWARM_ENABLED
        and VIDEO_BACKEND == "self_hosted"
        and not GPU_WORKER_URL
        and bool(RUNPOD_API_KEY)
    )


def notify_upcoming_video(word_id: str) -> None:
    """Signal that a word entered processing and will reach video stage.

    Called by job_runner at the start of process_word when "video" is in the
    scheduled stages. Triggers an async pod cold-start if the pod is idle, so
    creation overlaps upstream stages (images/concept/song). Also registers
    the word in _upcoming_words so idle_check will not terminate the pod
    mid-pipeline. Idempotent. Full no-op unless pod_manager will actually be
    used by the video stage (see _prewarm_applicable).
    """
    global _last_activity, _prewarm_in_flight
    if not _prewarm_applicable():
        return
    start_prewarm = False
    with _lock:
        _upcoming_words[word_id] = time.monotonic()
        _last_activity = time.monotonic()
        if _pod_status == "idle" and not _prewarm_in_flight:
            _prewarm_in_flight = True
            start_prewarm = True
    if start_prewarm:
        logger.info("RunPod: Pre-warming pod for upcoming word %s", word_id)
        threading.Thread(
            target=_run_prewarm,
            daemon=True,
            name=f"pod-prewarm-{str(word_id)[:8]}",
        ).start()


def cancel_upcoming_video(word_id: str) -> None:
    """Clear an expected video-stage entry.

    Called when a word either reaches video (acquire_use takes over) or fails
    in a pre-video stage. Idempotent - no-op if word_id is not tracked.
    Safe to call in any configuration: if notify was a no-op, the dict is
    empty and pop() returns None.
    """
    global _last_activity
    with _lock:
        if _upcoming_words.pop(word_id, None) is not None:
            _last_activity = time.monotonic()


def _run_prewarm() -> None:
    """Background thread body: call ensure_pod_ready. Exceptions logged, not raised.

    Re-checks _upcoming_words at entry to avoid a wasted cold-start if the word
    was already cancelled during thread spawn. ensure_pod_ready uses the module
    lock internally (existing pattern) and handles its own error recovery.
    """
    global _prewarm_in_flight
    try:
        with _lock:
            if not _upcoming_words:
                logger.info("RunPod: Pre-warm skipped - no upcoming words (already cancelled)")
                return
        ensure_pod_ready()
        logger.info("RunPod: Pre-warm complete - pod ready for upstream pipeline")
    except Exception as exc:
        logger.warning("RunPod: Pre-warm failed (non-fatal): %s", exc)
    finally:
        with _lock:
            _prewarm_in_flight = False


def idle_check() -> None:
    """If pod is ready and idle past timeout, terminate it.

    Called periodically by start_cloud.py's background task. Considers
    _upcoming_words so that words traversing pre-video stages keep the pod
    alive across the 300s idle timer. Stale entries (e.g. from a crashed
    job_runner) are garbage-collected here.
    """
    with _lock:
        # Stale-entry GC (runs regardless of pod state)
        now = time.monotonic()
        stale = [
            wid for wid, ts in _upcoming_words.items()
            if now - ts >= POD_PREWARM_STALE_SECONDS
        ]
        for wid in stale:
            del _upcoming_words[wid]
            logger.warning(
                "RunPod: Stale _upcoming_words entry removed: %s (age >= %ds)",
                wid, POD_PREWARM_STALE_SECONDS,
            )

        if _pod_status != "ready" or not _pod_id:
            return
        if _active_jobs > 0:
            return
        if _upcoming_words:
            return
        idle_seconds = now - _last_activity
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
