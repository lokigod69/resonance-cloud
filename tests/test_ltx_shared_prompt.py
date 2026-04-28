"""Regression tests for shared LTX prompt assembly."""

from __future__ import annotations

import sys
from pathlib import Path

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from cloud_engines.video_engine.adapters.ltx_shared import build_ltx_prompt  # noqa: E402


def test_ltx_i2v_prompt_prefix_preserves_identity_without_motion_clamp():
    prompt = build_ltx_prompt(
        video_prompt="The worker braces against the storm.",
        camera_motion=None,
    )

    assert "Maintain the exact subject, species, and clothing shown in the image" in prompt
    assert "Do not introduce new characters, objects, or transform the subject" in prompt
    assert "Subtle, naturalistic motion only" not in prompt
