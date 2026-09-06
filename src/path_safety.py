"""Validation and canonical confinement for worker path/key components."""

from __future__ import annotations

import re
from pathlib import Path


_WORKSPACE_COMPONENT_RE = re.compile(r"\A[A-Za-z0-9][A-Za-z0-9_-]{0,127}\Z")
_WORD_SLUG_RE = re.compile(r"\A[a-z0-9][a-z0-9-]{0,63}\Z")


class UnsafePathComponentError(ValueError):
    """Raised before an untrusted database value can become a path/key part."""


def _validated_component(value: object, *, label: str, pattern: re.Pattern[str]) -> str:
    component = str(value or "")
    if not pattern.fullmatch(component):
        raise UnsafePathComponentError(f"unsafe {label}")
    return component


def validate_workspace_component(value: object, *, label: str) -> str:
    """Validate a user/deck identifier used as one filesystem or object-key part."""
    return _validated_component(value, label=label, pattern=_WORKSPACE_COMPONENT_RE)


def validate_word_slug(value: object) -> str:
    """Return a canonical worker slug or reject it before any path/key use."""
    return _validated_component(value, label="word_slug", pattern=_WORD_SLUG_RE)


def confined_child_path(root: Path, *components: str) -> Path:
    """Resolve a child path and prove that it remains below ``root``."""
    canonical_root = root.resolve()
    candidate = canonical_root.joinpath(*components).resolve()
    if candidate == canonical_root or not candidate.is_relative_to(canonical_root):
        raise UnsafePathComponentError("path escapes canonical workspace root")
    return candidate
