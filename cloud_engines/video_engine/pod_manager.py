"""RunPod Pod Automation (Level 2).

Manages one GPU pod lifecycle (create -> health-check -> terminate) on behalf
of LTXSelfHostedAdapter. Synchronous module. Thread-safe via a module-level
lock.

State model:
    pod_status transitions: idle -> creating -> starting -> ready -> terminating -> idle
    (terminated or failed pods reset to idle)

Entry points:
    ensure_pod_ready()   - used by adapter before submit
    record_activity()    - used by adapter after successful job
    idle_check()         - called periodically from start_cloud.py
    cleanup_orphans()    - called once at startup
"""
from __future__ import annotations

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


def _api_headers() -> dict[str, str]:
    if not RUNPOD_API_KEY:
        raise RuntimeError("RUNPOD_API_KEY not set - cannot use Level 2 pod automation")
    return {
        "Authorization": f"Bearer {RUNPOD_API_KEY}",
        "Content-Type": "application/json",
    }


def _reset_state() -> None:
    """Reset all pod state to idle. Caller must hold _lock."""
    global _pod_id, _pod_url, _pod_status, _worker_auth_token, _last_activity
    _pod_id = None
    _pod_url = None
    _pod_status = "idle"
    _worker_auth_token = None
    _last_activity = 0.0
