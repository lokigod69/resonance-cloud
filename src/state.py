from __future__ import annotations

import os
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

WORKSPACE_ROOT = Path(os.getenv("WORKSPACE_ROOT", "D:/CODING/ResonanceTEST"))
WORKSPACE_PATH = Path(os.getenv("WORKSPACE_PATH", str(WORKSPACE_ROOT / "workspace")))
RECENTS_FILE = Path(__file__).resolve().parent.parent / "recent-workspaces.json"
LORA_LIBRARY_PATH = Path(os.getenv("LORA_LIBRARY_PATH", "D:/CODING/RESONANCE/loras"))

autopilot_state = {
    "running": False,
    "cancelled": False,
    "progress": [],
    "current_word": None,
    "current_stage": None,
    "total": 0,
    "done": 0,
    "errors": [],
}

word_pipeline_state: dict[str, dict] = {}
