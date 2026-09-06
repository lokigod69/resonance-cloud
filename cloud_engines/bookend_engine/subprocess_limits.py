"""Shared hard ceilings for local media subprocesses."""

from __future__ import annotations

import os


def _positive_seconds(name: str, default: float) -> float:
    try:
        value = float(os.getenv(name, str(default)))
    except (TypeError, ValueError):
        return default
    return value if value > 0 else default


PROBE_TIMEOUT_SECONDS = _positive_seconds("BOOKEND_PROBE_TIMEOUT_SECONDS", 30.0)
ENCODE_TIMEOUT_SECONDS = _positive_seconds("BOOKEND_ENCODE_TIMEOUT_SECONDS", 300.0)
