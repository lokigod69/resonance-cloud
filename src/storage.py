"""
Storage backend for cloud/local dual-mode operation.

STORAGE_MODE=local (default): All paths use local filesystem. Zero behavioral change.
STORAGE_MODE=cloud: Workspaces under CLOUD_WORKSPACE_ROOT with same naming convention.
"""
from __future__ import annotations

import logging
import os
import shutil
from pathlib import Path

from dotenv import load_dotenv

from .path_safety import (
    UnsafePathComponentError,
    confined_child_path,
    validate_word_slug,
    validate_workspace_component,
)

load_dotenv()

logger = logging.getLogger(__name__)

STORAGE_MODE = os.getenv("STORAGE_MODE", "local")

logger.info("Storage mode: %s", STORAGE_MODE)

def get_workspace_root() -> Path:
    """
    Return the root directory where cloud_{user_id}_{deck_id} folders are created.

    This replaces job_runner.py's WORKSPACE_ROOT (default: D:/CODING/ResonanceTEST/content).
    NOT the same as state.py's WORKSPACE_ROOT (default: D:/CODING/ResonanceTEST).
    """
    if STORAGE_MODE == "cloud":
        root = Path(os.getenv("CLOUD_WORKSPACE_ROOT", "/tmp/resonance/workspaces"))
        root.mkdir(parents=True, exist_ok=True)
        return root

    return Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceTEST/content"))


def create_job_workspace(user_id: str, deck_id: str) -> Path:
    """
    Create/ensure a workspace directory for a generation job.

    Returns: Path to workspace (e.g., /tmp/resonance/workspaces/cloud_abc_xyz/)

    Uses cloud_{user_id}_{deck_id} naming in BOTH modes to preserve
    compatibility with suno retry and smart retry flows.
    """
    workspace = get_job_workspace_path(user_id=user_id, deck_id=deck_id)
    workspace.mkdir(parents=True, exist_ok=True)
    return workspace


def get_job_workspace_path(user_id: str, deck_id: str) -> Path:
    """
    Return the expected workspace path WITHOUT creating it.

    Use this for retry/validation flows where the workspace should
    already exist. If it doesn't exist, the caller can detect that
    and handle accordingly (e.g., skip retry, re-run from scratch).
    """
    safe_user_id = validate_workspace_component(user_id, label="user_id")
    safe_deck_id = validate_workspace_component(deck_id, label="deck_id")
    workspace_name = f"cloud_{safe_user_id}_{safe_deck_id}"
    return confined_child_path(get_workspace_root(), workspace_name)


def cleanup_job_workspace(
    user_id: str,
    deck_id: str,
    *,
    terminal_ownership_confirmed: bool = False,
) -> bool:
    """
    Delete workspace after ALL processing is confirmed complete.
    Only in cloud mode. Local mode preserves workspaces.

    The caller must hold an admission/cleanup lease spanning its terminal DB
    check and this deletion. A read-then-delete check is insufficient because
    workspaces are deck-shared and a retry can be admitted between those steps.
    """
    if STORAGE_MODE != "cloud":
        return False
    if not terminal_ownership_confirmed:
        logger.warning(
            "Refusing workspace cleanup without terminal ownership lease: user=%s deck=%s",
            user_id, deck_id,
        )
        return False

    workspace = get_job_workspace_path(user_id=user_id, deck_id=deck_id)
    if not workspace.exists():
        return False

    shutil.rmtree(workspace)
    logger.info("Cleaned up terminal workspace: %s", workspace)
    return True
