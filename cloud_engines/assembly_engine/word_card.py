"""Word card generation for the Assembly Engine.

Per ENGINE_ASSEMBLY.md Section 10:
- Word cards show the target word on a black background
- Used in pedagogic mode (intro/outro) and word_card gap strategy
- Uses Pillow for text rendering (reliable CJK support) + FFMPEG for video

Design choice: Pillow renders text to a PNG frame, then FFMPEG converts
the still image to a video segment. This is more reliable for Korean/Japanese
text than FFMPEG's drawtext filter (spec Section 18 open question).
"""

from __future__ import annotations

import logging
import os
import subprocess
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

from . import ffmpeg_builder
from .config import RESOLUTION_MAP, discover_font
from .models import AssemblySettings

logger = logging.getLogger(__name__)

# Cache for discovered font paths
_font_cache: dict[str, Optional[str]] = {}


# ── CJK font fallback helpers ───────────────────────────────────────────────

# Search-by-name candidates for a CJK-capable fallback font. Tried in order
# via the existing discover_font() helper, which uses fontconfig on Linux/macOS
# and a name-based scan on Windows.
_CJK_FONT_NAMES = (
    "Noto Sans CJK KR",   # Korean-specific
    "Noto Sans CJK",      # Generic CJK
    "Noto Sans CJK SC",   # Simplified Chinese (also covers Hangul)
    "NotoSansCJK",        # No-space variant
    "Malgun Gothic",      # Windows Korean system font, always present on Windows
)

# Direct filename patterns scanned in font directories. This catches the .ttc
# format that discover_font()'s extension filter ignores.
_CJK_FILE_PATTERNS = (
    "NotoSansCJK-Bold.ttc",
    "NotoSansCJK-Regular.ttc",
    "NotoSansCJKkr-Bold.otf",
    "NotoSansCJKkr-Regular.otf",
    "NotoSansKR-Bold.otf",
    "NotoSansKR-Regular.otf",
    "malgunbd.ttf",       # Malgun Gothic Bold
    "malgun.ttf",         # Malgun Gothic Regular
)

# Unicode ranges that require a CJK-capable font.
_CJK_UNICODE_RANGES = (
    (0xAC00, 0xD7AF),  # Hangul Syllables (Korean)
    (0x1100, 0x11FF),  # Hangul Jamo
    (0x3130, 0x318F),  # Hangul Compatibility Jamo
    (0x4E00, 0x9FFF),  # CJK Unified Ideographs (Chinese, Japanese Kanji)
    (0x3040, 0x309F),  # Hiragana
    (0x30A0, 0x30FF),  # Katakana
    (0x3400, 0x4DBF),  # CJK Extension A
)


def _text_has_cjk(text: str) -> bool:
    """Return True if the string contains any CJK character."""
    if not text:
        return False
    for ch in text:
        cp = ord(ch)
        for lo, hi in _CJK_UNICODE_RANGES:
            if lo <= cp <= hi:
                return True
    return False


def _find_cjk_font_path() -> Optional[str]:
    """Locate a CJK-capable font on disk.

    Strategy:
      1. Try discover_font() with each CJK family name (handles Linux/macOS via
         fontconfig and Windows when the font ships as .ttf/.otf).
      2. Direct filesystem scan for known CJK filenames in user-local and
         system-wide font directories. This catches .ttc files that
         discover_font() filters out by extension.

    Returns absolute path to a font file, or None if nothing CJK-capable
    is available.
    """
    # Strategy 1: name-based search via existing discover_font helper.
    # discover_font has its own latin-only fallback chain, so sanity-check
    # that the result actually looks CJK-capable before trusting it.
    for name in _CJK_FONT_NAMES:
        path = discover_font(name)
        if path:
            stem = Path(path).name.lower()
            if any(token in stem for token in ("cjk", "malgun", "notosanskr", "notosansjp", "notosanssc", "notosanstc")):
                return path

    # Strategy 2: direct filesystem scan (catches .ttc which discover_font ignores).
    # Both per-user and system-wide font directories on Windows.
    font_dirs = []
    local_app = os.environ.get("LOCALAPPDATA")
    if local_app:
        font_dirs.append(Path(local_app) / "Microsoft" / "Windows" / "Fonts")
    font_dirs.append(Path("C:/Windows/Fonts"))
    for font_dir in font_dirs:
        if not font_dir.is_dir():
            continue
        for fname in _CJK_FILE_PATTERNS:
            candidate = font_dir / fname
            if candidate.is_file():
                return str(candidate)

    return None


def generate_word_card(
    word: str,
    translation: Optional[str],
    duration: float,
    settings: AssemblySettings,
    output_path: str,
    color_source_clip: Optional[str] = None,
) -> str:
    """Render a word card video segment (text on black background).

    Per ENGINE_ASSEMBLY.md Section 10:
    - Target word centered at 40% from top
    - Optional translation at 55% from top, 60% of word size, 60% opacity
    - Background: solid black
    - Color: auto (from clip), white, or hex

    Args:
        word: The target word to display.
        translation: L1 translation (shown only if provided).
        duration: Duration of the word card in seconds.
        settings: Assembly settings for styling.
        output_path: Path to write the MP4 segment.
        color_source_clip: Optional clip path for auto color extraction.

    Returns:
        Path to the generated MP4 segment.
    """
    target_w, target_h = RESOLUTION_MAP[settings.output_resolution]

    # Resolve text color
    text_color = _resolve_color(settings.word_card_color, color_source_clip)

    # Resolve font
    font_path = _get_font_path(settings.word_card_font)

    # Scale font size relative to resolution (base size is at 1080p)
    scale_factor = target_h / 1080
    word_size = int(settings.word_card_font_size * scale_factor)
    translation_size = int(word_size * 0.6)

    # Render the frame with Pillow
    frame_path = str(Path(output_path).parent / f"{Path(output_path).stem}_frame.png")
    _render_frame(
        word=word,
        translation=translation,
        width=target_w,
        height=target_h,
        text_color=text_color,
        font_path=font_path,
        word_font_size=word_size,
        translation_font_size=translation_size,
        output_path=frame_path,
    )

    # Convert still image to video segment
    ffmpeg_builder.run_ffmpeg(
        [
            "-loop", "1",
            "-i", ffmpeg_builder.posix_path(frame_path),
            "-t", str(duration),
            "-c:v", "libx264",
            "-pix_fmt", "yuv420p",
            "-r", str(settings.output_fps),
            "-tune", "stillimage",
            ffmpeg_builder.posix_path(output_path),
        ],
        description=f"Generating word card: '{word}' ({duration:.1f}s)",
    )

    # Clean up the intermediate PNG
    try:
        Path(frame_path).unlink()
    except OSError:
        pass

    return output_path


def extract_dominant_color(clip_path: str) -> str:
    """Extract the dominant color from the first frame of a video clip.

    Per ENGINE_ASSEMBLY.md Section 10.3:
    - Sample first frame, find dominant non-black color
    - Desaturate and lighten for text readability on black background

    Returns:
        Hex color string (e.g., "#E8C547").
    """
    try:
        # Extract first frame to raw bytes via pipe
        result = subprocess.run(
            [
                "ffmpeg", "-y",
                "-i", ffmpeg_builder.posix_path(clip_path),
                "-vframes", "1",
                "-f", "image2",
                "-pix_fmt", "rgb24",
                ffmpeg_builder.posix_path(str(Path(clip_path).parent / "_color_sample.png")),
            ],
            capture_output=True,
            timeout=10,
        )

        sample_path = Path(clip_path).parent / "_color_sample.png"
        if not sample_path.is_file():
            logger.warning("Failed to extract frame for color sampling")
            return "#FFFFFF"

        img = Image.open(sample_path).convert("RGB")
        sample_path.unlink(missing_ok=True)

        # Resize to small for fast processing
        img = img.resize((50, 50), Image.Resampling.LANCZOS)

        # Find dominant non-dark color
        pixels = list(img.getdata())
        # Filter out very dark pixels (near black)
        bright_pixels = [p for p in pixels if sum(p) > 60]
        if not bright_pixels:
            return "#FFFFFF"

        # Average the bright pixels
        avg_r = sum(p[0] for p in bright_pixels) // len(bright_pixels)
        avg_g = sum(p[1] for p in bright_pixels) // len(bright_pixels)
        avg_b = sum(p[2] for p in bright_pixels) // len(bright_pixels)

        # Desaturate and lighten for readability on black background
        r, g, b = _lighten_color(avg_r, avg_g, avg_b)
        return f"#{r:02X}{g:02X}{b:02X}"

    except Exception as e:
        logger.warning(f"Color extraction failed, falling back to white: {e}")
        return "#FFFFFF"


def _resolve_color(
    color_setting: str,
    color_source_clip: Optional[str],
) -> str:
    """Resolve the word card text color from settings.

    Per ENGINE_ASSEMBLY.md Section 10.3:
    - "auto": extract from first clip, fallback to white
    - "white": #FFFFFF
    - "#RRGGBB": use directly
    """
    if color_setting == "auto":
        if color_source_clip:
            return extract_dominant_color(color_source_clip)
        return "#FFFFFF"
    elif color_setting == "white":
        return "#FFFFFF"
    else:
        return color_setting


def _lighten_color(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Desaturate and lighten a color for text readability on black.

    Shifts the color toward white while preserving the hue.
    """
    # Blend with white (70% original, 30% white)
    r = min(255, int(r * 0.7 + 255 * 0.3))
    g = min(255, int(g * 0.7 + 255 * 0.3))
    b = min(255, int(b * 0.7 + 255 * 0.3))

    # Ensure minimum brightness
    brightness = (r + g + b) / 3
    if brightness < 160:
        boost = (160 - brightness) / 160
        r = min(255, int(r + (255 - r) * boost))
        g = min(255, int(g + (255 - g) * boost))
        b = min(255, int(b + (255 - b) * boost))

    return r, g, b


def _get_font_path(font_name: str) -> Optional[str]:
    """Get cached font path, discovering it on first call."""
    if font_name not in _font_cache:
        _font_cache[font_name] = discover_font(font_name)
    return _font_cache[font_name]


def _render_frame(
    word: str,
    translation: Optional[str],
    width: int,
    height: int,
    text_color: str,
    font_path: Optional[str],
    word_font_size: int,
    translation_font_size: int,
    output_path: str,
) -> None:
    """Render a word card frame as a PNG using Pillow.

    Layout per ENGINE_ASSEMBLY.md Section 10.1–10.2:
    - Black background
    - Word at 40% from top, horizontally centered
    - Translation at 55% from top, smaller, reduced opacity
    """
    img = Image.new("RGB", (width, height), color=(0, 0, 0))
    draw = ImageDraw.Draw(img)

    # Resolve a CJK fallback so Korean/Japanese/Chinese text doesn't render as tofu
    # if the primary font can't handle the script.
    cjk_fallback_path = _resolve_cjk_fallback()

    # Load fonts (with text-aware CJK fallback)
    word_font = _load_font(font_path, word_font_size, text=word, fallback_font_path=cjk_fallback_path)
    trans_font = _load_font(font_path, translation_font_size, text=translation or "", fallback_font_path=cjk_fallback_path)

    # Parse hex color
    color_rgb = _hex_to_rgb(text_color)

    # Dynamic font scaling for the main word: shrink until the text fits within
    # 85% of canvas width. If still too wide at the floor, truncate with an
    # ellipsis. This allows long words and short phrases (e.g. "guten Morgen")
    # to render cleanly without clipping.
    max_word_w = int(width * 0.85)
    min_word_font = 36
    size = word_font_size
    while size > min_word_font:
        if draw.textbbox((0, 0), word, font=word_font)[2] <= max_word_w:
            break
        size -= 4
        word_font = _load_font(font_path, size, text=word, fallback_font_path=cjk_fallback_path)
    # Clamp to floor: the step-down loop can overshoot when (start - 36) % 4 != 0
    if size < min_word_font:
        size = min_word_font
        word_font = _load_font(font_path, size, text=word, fallback_font_path=cjk_fallback_path)
    if draw.textbbox((0, 0), word, font=word_font)[2] > max_word_w:
        # At floor — truncate with ellipsis until it fits
        while len(word) > 1 and draw.textbbox((0, 0), word + "…", font=word_font)[2] > max_word_w:
            word = word[:-1].rstrip()
        word = word + "…"

    # Draw the target word — centered at 40% from top
    word_bbox = draw.textbbox((0, 0), word, font=word_font)
    word_w = word_bbox[2] - word_bbox[0]
    word_h = word_bbox[3] - word_bbox[1]
    word_x = (width - word_w) // 2
    word_y = int(height * 0.4) - word_h // 2
    draw.text((word_x, word_y), word, fill=color_rgb, font=word_font)

    # Draw translation if provided — centered at 55% from top, 60% opacity
    if translation:
        trans_color = tuple(int(c * 0.6) for c in color_rgb)
        # Truncate to fit within 75% of canvas width
        display = translation
        max_trans_w = int(width * 0.75)
        while draw.textbbox((0, 0), f"({display})", font=trans_font)[2] > max_trans_w and len(display) > 1:
            display = display[:-1].rstrip()
        if display != translation:
            display = display + "…"
        trans_text = f"({display})"
        trans_bbox = draw.textbbox((0, 0), trans_text, font=trans_font)
        trans_w = trans_bbox[2] - trans_bbox[0]
        trans_h = trans_bbox[3] - trans_bbox[1]
        trans_x = (width - trans_w) // 2
        trans_y = int(height * 0.55) - trans_h // 2
        draw.text(
            (trans_x, trans_y),
            trans_text,
            fill=trans_color,
            font=trans_font,
        )

    img.save(output_path, format="PNG")


def _font_can_render(font: ImageFont.FreeTypeFont, text: str) -> bool:
    """Check if a font can render every (non-whitespace) character in the text.

    Compares each character's rendered glyph mask to the font's `.notdef`
    glyph (referenced via a Unicode noncharacter codepoint that is guaranteed
    to never have a real glyph in any font). If they match, the font is
    rendering tofu (.notdef) for that character — i.e., it cannot render it.

    This is more reliable than checking glyph width, because `.notdef`
    glyphs typically have non-zero width, so a width-based check produces
    false positives like "Bebas Neue can render Hangul" when in reality
    it would render tofu boxes.

    U+FDD0 is a noncharacter per Unicode policy (the FDD0..FDEF range is
    permanently reserved for process-internal use and will never be assigned
    to a real glyph). This is safer than using U+E000 (Private Use Area),
    which icon/symbol fonts like Segoe UI Symbol populate with real glyphs.
    """
    if not text:
        return True
    try:
        notdef_mask = bytes(font.getmask(chr(0xFDD0)))
    except Exception:
        # If we can't even compute the reference, fall back to permissive
        return True
    for char in text:
        if char.isspace():
            continue
        try:
            if bytes(font.getmask(char)) == notdef_mask:
                return False
        except Exception:
            return False
    return True


# NOTE: Assembly uses a single fallback_font_path for both CJK and Latin fallback.
# This differs from bookend which has separate cjk_fallback_path and fallback_font_path.
# Since _resolve_cjk_fallback() returns a CJK-capable font (which also covers Latin),
# this works for all scripts. If a dedicated Latin fallback is ever needed, add a
# separate parameter matching bookend's signature.
def _load_font(
    font_path: Optional[str],
    size: int,
    text: str = "",
    fallback_font_path: Optional[str] = None,
) -> ImageFont.FreeTypeFont:
    """Load a font, falling back to a CJK font (if provided) when the primary
    can't render the given text, or to Pillow's default if nothing works."""
    if font_path:
        try:
            font = ImageFont.truetype(font_path, size)
            if text and fallback_font_path and not _font_can_render(font, text):
                fallback_name = "CJK" if _text_has_cjk(text) else "fallback"
                logger.info(
                    f"Font '{Path(font_path).name}' cannot render '{text}', "
                    f"falling back to {fallback_name} font '{Path(fallback_font_path).name}'"
                )
                try:
                    return ImageFont.truetype(fallback_font_path, size)
                except (OSError, IOError) as e:
                    logger.warning(f"Failed to load fallback font {fallback_font_path}: {e}")
            return font
        except (OSError, IOError) as e:
            logger.warning(f"Failed to load font {font_path}: {e}")

    if fallback_font_path:
        try:
            return ImageFont.truetype(fallback_font_path, size)
        except (OSError, IOError):
            pass

    # Pillow default font (bitmap, no CJK, but better than nothing)
    try:
        return ImageFont.truetype("arial.ttf", size)
    except (OSError, IOError):
        logger.warning("No TrueType font available, using Pillow default")
        return ImageFont.load_default()


def _resolve_cjk_fallback() -> Optional[str]:
    """Find a CJK-capable font on the system, cached.

    Tries multiple CJK family names in order, then a direct filesystem scan
    for known CJK filenames (including .ttc which discover_font ignores), and
    finally falls back to Windows Malgun Gothic. Returns None if nothing is
    found — _load_font then degrades gracefully.
    """
    if "__cjk__" in _font_cache:
        return _font_cache["__cjk__"]
    path = _find_cjk_font_path()
    _font_cache["__cjk__"] = path
    if path:
        logger.info(f"Resolved CJK fallback font: {path}")
    else:
        logger.warning("No CJK-capable font found on this system")
    return path


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert a hex color string to an RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
    )
