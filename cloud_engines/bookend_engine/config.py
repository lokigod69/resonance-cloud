import os
import subprocess
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()

LOCAL_FONTS_DIR = Path(__file__).resolve().parent / "fonts"

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
    1. Known filenames in local fonts/ directory
    2. Known filenames in C:/Windows/Fonts
    3. Partial name match in local fonts/
    4. Partial name match in C:/Windows/Fonts
    5. Fallback chain (Noto Sans -> Arial -> Segoe UI)

    Returns the full path to the .ttf file.
    """
    win_fonts = Path("C:/Windows/Fonts")
    search_dirs = [d for d in [LOCAL_FONTS_DIR, win_fonts] if d.exists()]

    # 1-2: Try known filenames for the requested font
    if requested_font in FONT_MAP:
        for directory in search_dirs:
            for fname in FONT_MAP[requested_font]:
                path = directory / fname
                if path.exists():
                    return str(path)

    # 3-4: Partial name match across both directories
    normalized = requested_font.lower().replace(" ", "")
    for directory in search_dirs:
        for f in directory.iterdir():
            if f.suffix.lower() in (".ttf", ".otf") and normalized in f.name.lower():
                return str(f)

    # 5: Fallback chain
    for fallback in FALLBACK_CHAIN:
        if fallback == requested_font:
            continue
        if fallback in FONT_MAP:
            for directory in search_dirs:
                for fname in FONT_MAP[fallback]:
                    path = directory / fname
                    if path.exists():
                        return str(path)

    # Last resort
    last_resort = win_fonts / "arial.ttf"
    if last_resort.exists():
        return str(last_resort)

    raise RuntimeError(
        f"No suitable font found. Tried: {requested_font}, {', '.join(FALLBACK_CHAIN)}"
    )
