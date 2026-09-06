import logging
import os
import subprocess
from functools import lru_cache
from pathlib import Path
from typing import Optional

from PIL import Image, ImageDraw, ImageFont

from .subprocess_limits import ENCODE_TIMEOUT_SECONDS

logger = logging.getLogger(__name__)


# ── CJK font fallback helpers ───────────────────────────────────────────────

# Search-by-name candidates for a CJK-capable fallback font. Tried in order
# via the existing find_font() helper, which uses fontconfig on Linux/macOS
# and a name-based scan on Windows.
_CJK_FONT_NAMES = (
    "Noto Sans CJK KR",   # Korean-specific
    "Noto Sans CJK",      # Generic CJK
    "Noto Sans CJK SC",   # Simplified Chinese (also covers Hangul)
    "NotoSansCJK",        # No-space variant
    "Malgun Gothic",      # Windows Korean system font, always present on Windows
)

# Direct filename patterns scanned in font directories. This catches the .ttc
# format that find_font()'s extension filter ignores.
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
      1. Try find_font() with each CJK family name (handles Linux/macOS via
         fontconfig and Windows when the font ships as .ttf/.otf).
      2. Direct filesystem scan for known CJK filenames in user-local and
         system-wide font directories. This catches .ttc files that
         find_font() filters out by extension.

    Returns absolute path to a font file, or None if nothing CJK-capable
    is available.
    """
    # Strategy 1: name-based search via existing find_font helper. find_font()
    # has its own latin-only fallback chain, so we sanity-check the result
    # actually looks CJK-capable before trusting it.
    from .config import find_font
    for name in _CJK_FONT_NAMES:
        try:
            path = find_font(name)
        except RuntimeError:
            continue
        if path:
            stem = Path(path).name.lower()
            if any(token in stem for token in ("cjk", "malgun", "notosanskr", "notosansjp", "notosanssc", "notosanstc")):
                return path

    # Strategy 2: direct filesystem scan (catches .ttc which find_font ignores).
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


@lru_cache(maxsize=1)
def get_cjk_font_path() -> Optional[str]:
    """Cached resolution of the CJK fallback font path."""
    return _find_cjk_font_path()


def _render_radial_gradient(
    width: int,
    height: int,
    center_color: tuple[int, int, int],
    edge_color: tuple[int, int, int] = (0, 0, 0),
    falloff: float = 1.8,
) -> Image.Image:
    """Render a radial gradient background using NumPy.

    Uses an elliptical distance metric so the gradient fills a 16:9 frame
    naturally (wider than tall). At falloff=1.8 the center glow is tight
    and reads as soft ambient light rather than a visible spotlight.
    """
    import numpy as np  # lazy import — only needed for gradient mode
    y_coords, x_coords = np.mgrid[0:height, 0:width]
    cx, cy = width / 2.0, height / 2.0
    dist = np.sqrt(((x_coords - cx) / cx) ** 2 + ((y_coords - cy) / cy) ** 2)
    dist = np.clip(dist, 0.0, 1.0)
    blend = dist ** falloff  # 0 at center → center_color, 1 at edge → edge_color

    img_array = np.zeros((height, width, 3), dtype=np.uint8)
    for i in range(3):
        img_array[:, :, i] = (
            center_color[i] * (1.0 - blend) + edge_color[i] * blend
        ).astype(np.uint8)

    return Image.fromarray(img_array, "RGB")


def render_word_card_image(
    word: str,
    translation: str | None,
    phonetic: str | None,
    width: int,
    height: int,
    font_path: str,
    font_size: int,
    text_color: str,
    background_color: str,
    output_path: str,
    fallback_font_path: str = "",
    cjk_fallback_path: str = "",
    gradient_background: bool = False,
    gradient_tint_color: str | None = None,
) -> str:
    """
    Render a word card as a PNG image using Pillow.

    Layout uses golden ratio vertical positioning, adaptive to line count:
        - 1 line:  word at 42%
        - 2 lines: word at 38%, translation at 55%
        - 3 lines: word at 33%, phonetic at 46%, translation at 58%

    Returns path to the rendered PNG.
    """
    if gradient_background and gradient_tint_color:
        tint = gradient_tint_color.lstrip("#")
        tint_rgb = (int(tint[0:2], 16), int(tint[2:4], 16), int(tint[4:6], 16))
        img = _render_radial_gradient(width, height, center_color=tint_rgb)
    else:
        img = Image.new("RGB", (width, height), background_color)
    draw = ImageDraw.Draw(img)

    text_rgb = _hex_to_rgb(text_color)

    # Scale font size proportionally to resolution (base: 72pt at 1080p)
    scale_factor = height / 1080
    word_font_size = int(font_size * scale_factor)
    translation_font_size = int(word_font_size * 0.55)
    phonetic_font_size = int(word_font_size * 0.45)

    word_font = _load_font(font_path, word_font_size, text=word, fallback_font_path=fallback_font_path, cjk_fallback_path=cjk_fallback_path)
    trans_font = _load_font(font_path, translation_font_size, text=translation or "", fallback_font_path=fallback_font_path, cjk_fallback_path=cjk_fallback_path)
    phonetic_font = _load_font(font_path, phonetic_font_size, text=phonetic or "", fallback_font_path=fallback_font_path, cjk_fallback_path=cjk_fallback_path)

    # Dynamic font scaling for the main word: shrink until the text fits within
    # 85% of canvas width. If still too wide at the floor, truncate with an
    # ellipsis. Lets long words and short phrases render cleanly.
    max_word_w = int(width * 0.85)
    min_word_font = 36
    size = word_font_size
    while size > min_word_font:
        if draw.textbbox((0, 0), word, font=word_font)[2] <= max_word_w:
            break
        size -= 4
        word_font = _load_font(font_path, size, text=word, fallback_font_path=fallback_font_path, cjk_fallback_path=cjk_fallback_path)
    # Clamp to floor: the step-down loop can overshoot when (start - 36) % 4 != 0
    if size < min_word_font:
        size = min_word_font
        word_font = _load_font(font_path, size, text=word, fallback_font_path=fallback_font_path, cjk_fallback_path=cjk_fallback_path)
    if draw.textbbox((0, 0), word, font=word_font)[2] > max_word_w:
        while len(word) > 1 and draw.textbbox((0, 0), word + "…", font=word_font)[2] > max_word_w:
            word = word[:-1].rstrip()
        word = word + "…"

    # Golden ratio adaptive vertical positioning
    has_translation = bool(translation)
    has_phonetic = bool(phonetic)

    if has_translation and has_phonetic:
        word_y_pct, phonetic_y_pct, translation_y_pct = 0.33, 0.46, 0.58
    elif has_translation:
        word_y_pct, translation_y_pct = 0.38, 0.55
    elif has_phonetic:
        word_y_pct, phonetic_y_pct = 0.38, 0.55
    else:
        word_y_pct = 0.42

    # Draw word
    word_bbox = draw.textbbox((0, 0), word, font=word_font)
    word_w = word_bbox[2] - word_bbox[0]
    word_h = word_bbox[3] - word_bbox[1]
    word_x = (width - word_w) // 2
    word_y = int(height * word_y_pct) - word_h // 2
    draw.text((word_x, word_y), word, font=word_font, fill=text_rgb)

    # Draw translation
    if translation:
        bg_rgb = _hex_to_rgb(background_color)
        trans_color = _blend_color(text_rgb, bg_rgb, 0.55)
        # Truncate to fit within 75% of canvas width
        display = translation
        max_trans_w = int(width * 0.75)
        while draw.textbbox((0, 0), display, font=trans_font)[2] > max_trans_w and len(display) > 1:
            display = display[:-1].rstrip()
        if display != translation:
            display = display + "…"
        trans_bbox = draw.textbbox((0, 0), display, font=trans_font)
        trans_w = trans_bbox[2] - trans_bbox[0]
        trans_h = trans_bbox[3] - trans_bbox[1]
        trans_x = (width - trans_w) // 2
        trans_y = int(height * translation_y_pct) - trans_h // 2
        draw.text((trans_x, trans_y), display, font=trans_font, fill=trans_color)

    # Draw phonetic
    if phonetic:
        bg_rgb = _hex_to_rgb(background_color)
        phonetic_color = _blend_color(text_rgb, bg_rgb, 0.70)
        ph_bbox = draw.textbbox((0, 0), phonetic, font=phonetic_font)
        ph_w = ph_bbox[2] - ph_bbox[0]
        ph_h = ph_bbox[3] - ph_bbox[1]
        ph_x = (width - ph_w) // 2
        ph_y = int(height * phonetic_y_pct) - ph_h // 2
        draw.text((ph_x, ph_y), phonetic, font=phonetic_font, fill=phonetic_color)

    img.save(output_path, "PNG")
    return output_path


def generate_word_card_segment(
    card_image_path: str,
    tts_audio_path: str | None,
    segment_duration: float,
    tts_start_offset: float,
    fps: int,
    output_path: str,
    fade_in_duration: float = 0.0,
    fade_out_duration: float = 0.0,
) -> str:
    """
    Create a video segment from a static card image + TTS audio.

    The card image is shown for segment_duration seconds.
    TTS audio starts at tts_start_offset (to account for fade-in).
    Optional fade in/out on the video track.

    Pass tts_audio_path=None to generate a silent segment (word card image
    with no voice — used for Suno clean_cut outro cards).

    Returns path to the generated MP4 segment.
    """
    # Use anullsrc for silence instead of apad to avoid waveform discontinuity
    # artifacts at the TTS→silence boundary. anullsrc generates proper silence
    # as a separate source, then we concat TTS + silence in the filter graph.
    cmd = [
        "ffmpeg", "-y",
        "-loop", "1", "-t", str(segment_duration),
        "-framerate", str(fps), "-i", card_image_path,
    ]
    if tts_audio_path:
        cmd += ["-i", tts_audio_path]
    # Generate silence source at 48kHz stereo to match target format
    cmd += ["-f", "lavfi", "-i", f"anullsrc=r=48000:cl=stereo:d={segment_duration}"]

    # Build filter graph
    filters = []

    video_filter = "[0:v]format=yuv420p"
    if fade_in_duration > 0:
        video_filter += f",fade=t=in:st=0:d={fade_in_duration}"
    if fade_out_duration > 0:
        fade_start = segment_duration - fade_out_duration
        video_filter += f",fade=t=out:st={fade_start}:d={fade_out_duration}"
    video_filter += "[vout]"
    filters.append(video_filter)

    if tts_audio_path:
        # inputs: [0]=image, [1]=tts, [2]=silence
        # Resample TTS to 48kHz stereo, delay it, then overlay onto the
        # anullsrc silence bed. This avoids apad's zero-sample discontinuity.
        delay_ms = int(tts_start_offset * 1000)
        audio_filter = (
            f"[1:a]aresample=48000,aformat=channel_layouts=stereo,"
            f"adelay={delay_ms}|{delay_ms}[tts];"
            f"[2:a][tts]amix=inputs=2:duration=first:normalize=0[aout]"
        )
    else:
        # inputs: [0]=image, [1]=silence — no TTS, no mixing needed
        audio_filter = "[1:a]aresample=48000,aformat=channel_layouts=stereo[aout]"
    filters.append(audio_filter)

    filter_complex = ";".join(filters)

    cmd.extend([
        "-filter_complex", filter_complex,
        "-map", "[vout]", "-map", "[aout]",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-t", str(segment_duration),
        "-movflags", "+faststart",
        output_path,
    ])

    result = subprocess.run(
        cmd, capture_output=True, text=True, timeout=ENCODE_TIMEOUT_SECONDS,
    )
    if result.returncode != 0:
        raise RuntimeError(
            f"FFMPEG word card segment failed: {result.stderr[-500:]}"
        )

    return output_path


def _load_font(
    font_path: str,
    size: int,
    text: str = "",
    fallback_font_path: str = "",
    cjk_fallback_path: str = "",
) -> ImageFont.FreeTypeFont:
    """Load a TrueType font with text-aware fallback.

    When the primary font cannot render the text, picks the right fallback:
      - If the text contains CJK characters → use cjk_fallback_path
      - Otherwise → use fallback_font_path (regular Noto Sans for extended Latin)
    """
    try:
        font = ImageFont.truetype(font_path, size)
        if text and not _font_can_render(font, text):
            # Pick the right fallback based on text content
            if _text_has_cjk(text) and cjk_fallback_path:
                logger.info(
                    f"Font '{Path(font_path).name}' cannot render '{text}', "
                    f"falling back to CJK font '{Path(cjk_fallback_path).name}'"
                )
                try:
                    return ImageFont.truetype(cjk_fallback_path, size)
                except Exception as e:
                    logger.warning(f"Failed to load CJK fallback {cjk_fallback_path}: {e}")
            if fallback_font_path:
                logger.info(
                    f"Font '{Path(font_path).name}' cannot render '{text}', "
                    f"falling back to '{Path(fallback_font_path).name}'"
                )
                try:
                    return ImageFont.truetype(fallback_font_path, size)
                except Exception:
                    pass
        return font
    except Exception:
        for path in (cjk_fallback_path, fallback_font_path):
            if path:
                try:
                    return ImageFont.truetype(path, size)
                except Exception:
                    pass
        return ImageFont.load_default()


def _font_can_render(font: ImageFont.FreeTypeFont, text: str) -> bool:
    """Check if a font can render every character in the text.

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


def _hex_to_rgb(hex_color: str) -> tuple[int, int, int]:
    """Convert hex color string to RGB tuple."""
    hex_color = hex_color.lstrip("#")
    return (
        int(hex_color[0:2], 16),
        int(hex_color[2:4], 16),
        int(hex_color[4:6], 16),
    )


def _blend_color(
    color: tuple[int, int, int],
    background: tuple[int, int, int],
    blend_factor: float,
) -> tuple[int, int, int]:
    """Blend a color toward the background by blend_factor (0=no blend, 1=full bg)."""
    return tuple(
        int(c + (b - c) * blend_factor)
        for c, b in zip(color, background)
    )
