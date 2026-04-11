"""System configuration for the Assembly Engine.

Handles FFMPEG/ffprobe detection, font discovery, and resolution mapping.
"""

from __future__ import annotations

import logging
import os
import platform
import re
import subprocess
from pathlib import Path
from typing import Optional

logger = logging.getLogger(__name__)

# Resolution presets per ENGINE_ASSEMBLY.md Section 9.2
RESOLUTION_MAP: dict[str, tuple[int, int]] = {
    "720p": (1280, 720),
    "1080p": (1920, 1080),
    "4k": (3840, 2160),
}


def check_ffmpeg() -> str:
    """Verify FFMPEG is installed and return its version string.

    Raises:
        RuntimeError: If FFMPEG is not found or cannot be executed.
    """
    try:
        result = subprocess.run(
            ["ffmpeg", "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        first_line = result.stdout.split("\n")[0]
        # Example: "ffmpeg version 6.1.1 Copyright ..."
        match = re.search(r"ffmpeg version (\S+)", first_line)
        version = match.group(1) if match else first_line.strip()
        logger.info(f"FFMPEG found: {version}")
        return version
    except FileNotFoundError:
        raise RuntimeError(
            "FFMPEG not found. Install FFMPEG and ensure it is on the PATH."
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("FFMPEG version check timed out.")
    except Exception as e:
        raise RuntimeError(f"Failed to check FFMPEG: {e}")


def check_ffprobe() -> str:
    """Verify ffprobe is installed and return its version string.

    Raises:
        RuntimeError: If ffprobe is not found or cannot be executed.
    """
    try:
        result = subprocess.run(
            ["ffprobe", "-version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        first_line = result.stdout.split("\n")[0]
        match = re.search(r"ffprobe version (\S+)", first_line)
        version = match.group(1) if match else first_line.strip()
        logger.info(f"ffprobe found: {version}")
        return version
    except FileNotFoundError:
        raise RuntimeError(
            "ffprobe not found. Install FFMPEG (includes ffprobe) and ensure it is on the PATH."
        )
    except subprocess.TimeoutExpired:
        raise RuntimeError("ffprobe version check timed out.")
    except Exception as e:
        raise RuntimeError(f"Failed to check ffprobe: {e}")


def discover_font(font_name: str) -> Optional[str]:
    """Find a font file path on the system.

    Tries multiple strategies:
    1. fc-list (Linux/macOS, Windows with fontconfig)
    2. Direct search in Windows font directories
    3. Fallback chain: requested font -> Noto Sans -> any sans-serif

    Args:
        font_name: Font family name (e.g., "Noto Sans").

    Returns:
        Absolute path to a .ttf or .otf font file, or None if nothing found.
    """
    # Try the requested font first
    path = _find_font(font_name)
    if path:
        logger.info(f"Font found: {font_name} -> {path}")
        return path

    # Fallback to Noto Sans if requested font wasn't found
    if font_name.lower() != "noto sans":
        logger.warning(f"Font '{font_name}' not found, trying Noto Sans fallback")
        path = _find_font("Noto Sans")
        if path:
            logger.info(f"Fallback font: Noto Sans -> {path}")
            return path

    # Last resort: any sans-serif font
    logger.warning("Noto Sans not found, searching for any sans-serif font")
    path = _find_any_sans_serif()
    if path:
        logger.info(f"Last-resort font: {path}")
        return path

    logger.error("No suitable font found on the system")
    return None


def _find_font(font_name: str) -> Optional[str]:
    """Search for a specific font by name."""
    # Strategy 1: fc-list (cross-platform if fontconfig is installed)
    path = _find_font_fc_list(font_name)
    if path:
        return path

    # Strategy 2: Direct filesystem search (Windows)
    if platform.system() == "Windows":
        path = _find_font_windows(font_name)
        if path:
            return path

    return None


def _find_font_fc_list(font_name: str) -> Optional[str]:
    """Find a font using fc-list (fontconfig)."""
    try:
        result = subprocess.run(
            ["fc-list", f":family={font_name}", "file"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if result.returncode == 0 and result.stdout.strip():
            # fc-list output: "/path/to/font.ttf: " (colon-separated)
            for line in result.stdout.strip().split("\n"):
                path = line.split(":")[0].strip()
                if path and Path(path).is_file():
                    # Prefer Bold variant for word cards
                    if "Bold" in path and "Italic" not in path:
                        return path
            # If no Bold, return the first valid path
            first_line = result.stdout.strip().split("\n")[0]
            path = first_line.split(":")[0].strip()
            if path and Path(path).is_file():
                return path
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None


def _find_font_windows(font_name: str) -> Optional[str]:
    """Search Windows font directories for a font."""
    font_dirs = [
        Path(os.environ.get("WINDIR", "C:/Windows")) / "Fonts",
        Path.home() / "AppData" / "Local" / "Microsoft" / "Windows" / "Fonts",
    ]

    # Build search patterns from font name
    # "Noto Sans" -> ["NotoSans", "Noto-Sans", "noto-sans", "notosans"]
    name_no_spaces = font_name.replace(" ", "")
    name_hyphen = font_name.replace(" ", "-")
    patterns = [name_no_spaces, name_hyphen, name_no_spaces.lower(), name_hyphen.lower()]

    for font_dir in font_dirs:
        if not font_dir.is_dir():
            continue
        for pattern in patterns:
            # Look for Bold variant first, then Regular
            for suffix in ["-Bold.ttf", "-Bold.otf", "-Regular.ttf", "-Regular.otf", ".ttf", ".otf"]:
                candidate = font_dir / f"{pattern}{suffix}"
                if candidate.is_file():
                    return str(candidate)
            # Also try glob for partial matches
            for ext in ("*.ttf", "*.otf"):
                for f in font_dir.glob(ext):
                    if pattern.lower() in f.stem.lower():
                        return str(f)

    return None


def _find_any_sans_serif() -> Optional[str]:
    """Find any available sans-serif font as a last resort."""
    sans_fonts = ["Arial", "Helvetica", "DejaVu Sans", "Liberation Sans", "Segoe UI"]
    for font_name in sans_fonts:
        path = _find_font(font_name)
        if path:
            return path
    return None
