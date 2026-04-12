import logging
import os
import subprocess
from pathlib import Path
from typing import Optional

from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

LOCAL_FONTS_DIR = Path(__file__).resolve().parent / "fonts"
WINDOWS_FONTS_DIR = Path("C:/Windows/Fonts")
LINUX_FONT_DIRS = [
    Path("/usr/share/fonts"),
    Path("/usr/local/share/fonts"),
    Path("/usr/share/fonts/truetype"),
]

# Map font names to likely TTF filenames (checked in order)
FONT_MAP = {
    "Bebas Neue": ["BebasNeue-Regular.ttf"],
    "Montserrat": ["Montserrat-Bold.ttf", "Montserrat-Regular.ttf"],
    "Poppins": ["Poppins-Bold.ttf", "Poppins-Regular.ttf"],
    "Raleway": ["Raleway-Bold.ttf", "Raleway-Regular.ttf"],
    "Inter": ["Inter-Bold.ttf", "Inter_28pt-Bold.ttf", "Inter-Regular.ttf"],
    "Playfair Display": ["PlayfairDisplay-Bold.ttf", "PlayfairDisplay-Regular.ttf"],
    "Noto Sans": ["NotoSans-Bold.ttf", "NotoSans-Regular.ttf"],
    "Arial": ["arialbd.ttf", "arial.ttf"],
    "Segoe UI": ["segoeuib.ttf", "segoeui.ttf"],
}

FALLBACK_CHAIN = ["Noto Sans", "Arial", "Segoe UI"]


def get_api_key() -> str:
    key = os.getenv("ELEVENLABS_API_KEY")
    if not key:
        raise RuntimeError("ELEVENLABS_API_KEY not set in .env")
    return key


def get_ffmpeg_version() -> str:
    result = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
    first_line = result.stdout.split("\n")[0] if result.stdout else "unknown"
    return first_line


def find_font(requested_font: str) -> str:
    """
    Find the font file path for the requested font name.

    Search order:
    1. Local bundled fonts directory
    2. fc-list / fontconfig
    3. Direct system font directory search
    4. Fallback chain (Noto Sans -> Arial -> Segoe UI)
    5. RuntimeError

    Returns the full path to the .ttf or .otf file.
    """
    path = _find_font_path(requested_font)
    if path:
        return path

    for fallback in FALLBACK_CHAIN:
        if fallback == requested_font:
            continue
        path = _find_font_path(fallback)
        if path:
            logger.info("Font '%s' not found, using fallback '%s' -> %s", requested_font, fallback, path)
            return path

    raise RuntimeError(
        f"No suitable font found. Tried: {requested_font}, {', '.join(FALLBACK_CHAIN)}"
    )


def _find_font_path(font_name: str) -> Optional[str]:
    local_dirs = [LOCAL_FONTS_DIR]
    path = _search_known_filenames(font_name, local_dirs)
    if path:
        return path

    path = _search_partial(font_name, local_dirs)
    if path:
        return path

    path = _find_font_fc_list(font_name)
    if path:
        return path

    system_dirs = _get_system_font_dirs()
    path = _search_known_filenames(font_name, system_dirs)
    if path:
        return path

    return _search_partial(font_name, system_dirs)


def _get_system_font_dirs() -> list[Path]:
    directories = [WINDOWS_FONTS_DIR]
    if not _has_fontconfig():
        directories.extend(LINUX_FONT_DIRS)
    return [directory for directory in directories if directory.exists()]


def _search_known_filenames(font_name: str, directories: list[Path]) -> Optional[str]:
    filenames = FONT_MAP.get(font_name, [])
    for directory in directories:
        if not directory.exists():
            continue
        for filename in filenames:
            path = directory / filename
            if path.exists():
                return str(path)
    return None


def _search_partial(font_name: str, directories: list[Path]) -> Optional[str]:
    normalized = _normalize_font_name(font_name)
    for directory in directories:
        if not directory.exists():
            continue
        for ext in ("*.ttf", "*.otf"):
            for font_file in directory.rglob(ext):
                if normalized in _normalize_font_name(font_file.name):
                    return str(font_file)
    return None


def _normalize_font_name(value: str) -> str:
    return value.lower().replace(" ", "").replace("-", "").replace("_", "")


def _has_fontconfig() -> bool:
    try:
        result = subprocess.run(
            ["fc-list", "--version"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        return result.returncode == 0
    except (FileNotFoundError, subprocess.TimeoutExpired):
        return False


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
            for line in result.stdout.strip().split("\n"):
                path = line.split(":")[0].strip()
                if path and Path(path).is_file():
                    if "Bold" in path and "Italic" not in path:
                        return path
            first_line = result.stdout.strip().split("\n")[0]
            path = first_line.split(":")[0].strip()
            if path and Path(path).is_file():
                return path
    except (FileNotFoundError, subprocess.TimeoutExpired):
        pass
    return None
