"""Unit tests for the short-mode duration normalizer.

Runs as plain Python (exits non-zero on failure) and is also compatible
with pytest. No third-party dependency beyond stdlib; the module under
test is pure-Python.
"""

from __future__ import annotations

import sys
from pathlib import Path

_ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(_ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(_ORCH_ROOT))

from src.pipeline import _normalize_short_mode_durations  # noqa: E402


def test_exact_two_scene_sum_unchanged():
    assert _normalize_short_mode_durations([7, 8]) == [7, 8]


def test_exact_three_scene_sum_unchanged():
    assert _normalize_short_mode_durations([5, 5, 5]) == [5, 5, 5]


def test_two_scene_clamp_reduces_to_target():
    result = _normalize_short_mode_durations([10, 10])
    assert sum(result) == 15
    assert all(3 <= d <= 10 for d in result)


def test_three_scene_minimum_increases_to_target():
    result = _normalize_short_mode_durations([3, 3, 3])
    assert sum(result) == 15
    assert all(3 <= d <= 10 for d in result)


def test_two_scene_missing_value_substituted():
    # None -> midpoint (6); [6, 8] sums to 14, nudges +1 to min-value slot (the 6).
    result = _normalize_short_mode_durations([None, 8])
    assert sum(result) == 15
    assert all(3 <= d <= 10 for d in result)
    assert result[1] == 8  # explicit value preserved


def test_three_scene_all_missing_substituted():
    # All None -> midpoint 6 each; [6, 6, 6] sums to 18, reduces to 15.
    result = _normalize_short_mode_durations([None, None, None])
    assert sum(result) == 15
    assert all(3 <= d <= 10 for d in result)


def test_two_scene_out_of_range_clamp_then_rebalance():
    # 15 clamps to 10, 2 clamps to 3 -> [10, 3] sums to 13, nudges +2 on smallest.
    result = _normalize_short_mode_durations([15, 2])
    assert sum(result) == 15
    assert all(3 <= d <= 10 for d in result)


def _run_all():
    tests = [
        ("exact_two_scene_sum_unchanged", test_exact_two_scene_sum_unchanged),
        ("exact_three_scene_sum_unchanged", test_exact_three_scene_sum_unchanged),
        ("two_scene_clamp_reduces_to_target", test_two_scene_clamp_reduces_to_target),
        ("three_scene_minimum_increases_to_target", test_three_scene_minimum_increases_to_target),
        ("two_scene_missing_value_substituted", test_two_scene_missing_value_substituted),
        ("three_scene_all_missing_substituted", test_three_scene_all_missing_substituted),
        ("two_scene_out_of_range_clamp_then_rebalance", test_two_scene_out_of_range_clamp_then_rebalance),
    ]
    failures = 0
    for name, fn in tests:
        try:
            fn()
        except AssertionError as e:
            failures += 1
            print(f"FAIL {name}: {e}")
        except Exception as e:
            failures += 1
            print(f"ERROR {name}: {type(e).__name__}: {e}")
        else:
            print(f"PASS {name}")
    if failures:
        print(f"\n{failures} failure(s)")
        sys.exit(1)
    print(f"\nAll {len(tests)} tests passed.")


if __name__ == "__main__":
    _run_all()
