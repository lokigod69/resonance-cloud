"""Environment variable loading and constants for the Image Engine.

Per ENGINE_IMAGE.md Section 9.
"""

from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()

# --- LLM Configuration (Step A) ---
OPENROUTER_API_KEY: str = os.environ.get("OPENROUTER_API_KEY", "")
IMAGE_LLM_DEFAULT: str = os.environ.get("IMAGE_LLM_DEFAULT", "deepseek/deepseek-v3.2")

# --- Image Model Configuration (Step B) ---
GOOGLE_AI_API_KEY: str = os.environ.get("GOOGLE_AI_API_KEY", "")
KIE_API_KEY: str = os.environ.get("KIE_API_KEY", "")
FAL_KEY: str = os.environ.get("FAL_KEY", "")
IMAGE_MODEL_FAST: str = os.environ.get("IMAGE_MODEL_FAST", "gemini-2.5-flash-image")
IMAGE_MODEL_QUALITY: str = os.environ.get("IMAGE_MODEL_QUALITY", "gemini-3-pro-image-preview")

# --- Hardcoded Values (Section 9.2) ---
ASPECT_RATIO: str = "16:9"
IMAGE_FORMAT: str = "png"
MAX_SCENES: int = 8
MIN_SCENES: int = 1
OPENROUTER_ENDPOINT: str = "https://openrouter.ai/api/v1/chat/completions"
LLM_TIMEOUT: float = 60.0
LLM_MAX_TOKENS: int = 8192
