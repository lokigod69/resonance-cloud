"""Pod access — thin env-var client.

Design ref: §10. Pod is always-on. This module reads POD_URL and
POD_AUTH_TOKEN from env vars at each call and returns them.

Public surface matches what the existing LTXSelfHostedAdapter imports:
  ensure_pod_ready() -> (url, token)
  acquire_use()      -> no-op (VideoDispatcher semaphore enforces concurrency)
  release_use()      -> no-op

Design §10 explicitly deletes all pre-warm / heartbeat / idle-check /
orphan-cleanup / notify-upcoming code. Those functions are gone.
"""

from __future__ import annotations

import logging
import os
from typing import Tuple

logger = logging.getLogger(__name__)


def _read_env() -> Tuple[str, str]:
    url = os.getenv("POD_URL", "")
    token = os.getenv("POD_AUTH_TOKEN", "")
    if not url or not token:
        missing = []
        if not url:
            missing.append("POD_URL")
        if not token:
            missing.append("POD_AUTH_TOKEN")
        raise RuntimeError(
            "pod_manager: missing env var(s): " + ", ".join(missing) +
            ". The orchestrator expects an always-on pod (see §10)."
        )
    return url, token


def ensure_pod_ready() -> Tuple[str, str]:
    """Return (pod_url, worker_auth_token) from env. Raises on missing config."""
    return _read_env()


def acquire_use() -> None:
    """No-op. Concurrency is enforced by VideoDispatcher.Semaphore(1)."""
    return None


def release_use() -> None:
    """No-op. Matches acquire_use signature."""
    return None
