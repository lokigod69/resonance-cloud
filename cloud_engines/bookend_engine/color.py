import json
import subprocess
import tempfile
from pathlib import Path

from PIL import Image

from .subprocess_limits import ENCODE_TIMEOUT_SECONDS, PROBE_TIMEOUT_SECONDS


def extract_dominant_color(
    video_path: str, sample_position_pct: float = 0.1
) -> tuple[str, str]:
    """
    Extract the dominant color suitable for text on a dark background.

    Tries the first scene image (richer palette) before falling back
    to a compressed video frame.

    Returns (hex_color, source_label) where source_label is one of:
    "scene_image", "video_frame", or "fallback".
    """
    # Try scene image first — richer, more intentional palette
    image_path = _find_first_scene_image(video_path)
    if image_path:
        try:
            img = Image.open(image_path).convert("RGB")
            color = _extract_color_from_pil_image(img)
            return color, "scene_image"
        except Exception:
            pass

    # Fall back to video frame extraction
    try:
        color = _extract_color_from_video_frame(video_path, sample_position_pct)
        return color, "video_frame"
    except Exception:
        return "#FFFFFF", "fallback"


def _find_first_scene_image(video_path: str) -> str | None:
    """
    Navigate from the assembled video path to find the first scene image.

    Path structure: .../content/<lang>/<word>/final/<version>/final.mp4
    Scene images:   .../content/<lang>/<word>/images/<version>/001.png

    Returns the path to 001.png from the most recent image version, or None.
    """
    try:
        video = Path(video_path)
        # Navigate: final.mp4 -> version dir -> final/ -> word dir
        word_dir = video.parent.parent.parent
        images_dir = word_dir / "images"

        if not images_dir.exists():
            return None

        # Sort version directories (contain timestamps, so lexicographic = chronological)
        version_dirs = sorted(
            [d for d in images_dir.iterdir() if d.is_dir()],
            key=lambda d: d.name,
        )
        if not version_dirs:
            return None

        # Check from most recent version backward
        for version_dir in reversed(version_dirs):
            scene_image = version_dir / "001.png"
            if scene_image.exists():
                return str(scene_image)

        return None
    except Exception:
        return None


def _extract_color_from_pil_image(img: Image.Image) -> str:
    """
    Extract the dominant non-dark color from a PIL image,
    lightened and desaturated for text on a dark background.
    """
    img = img.resize((100, 100), Image.LANCZOS)

    quantized = img.quantize(colors=16, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    color_counts = sorted(quantized.getcolors(), key=lambda x: -x[0])

    for _count, idx in color_counts:
        r, g, b = palette[idx * 3], palette[idx * 3 + 1], palette[idx * 3 + 2]
        brightness = (r + g + b) / 3
        if brightness > 40:
            original = (r, g, b)
            lightened = _lighten_for_text(r, g, b)
            r, g, b = _ensure_vibrant(lightened, original)
            return f"#{r:02x}{g:02x}{b:02x}"

    return "#FFFFFF"


def _extract_color_from_video_frame(
    video_path: str, sample_position_pct: float
) -> str:
    """Extract dominant color from a video frame (original fallback method)."""
    tmp_path = None
    try:
        duration = _probe_video_duration(video_path)
        sample_time = duration * sample_position_pct

        with tempfile.NamedTemporaryFile(suffix=".png", delete=False) as tmp:
            tmp_path = tmp.name

        subprocess.run(
            [
                "ffmpeg", "-y", "-ss", str(sample_time),
                "-i", video_path, "-frames:v", "1",
                "-q:v", "2", tmp_path,
            ],
            capture_output=True,
            check=True,
            timeout=ENCODE_TIMEOUT_SECONDS,
        )

        img = Image.open(tmp_path).convert("RGB")
        return _extract_color_from_pil_image(img)

    finally:
        if tmp_path:
            try:
                Path(tmp_path).unlink(missing_ok=True)
            except Exception:
                pass


def _rgb_to_hsl(r: int, g: int, b: int) -> tuple[float, float, float]:
    """Convert RGB (0-255) to HSL (h: 0-360, s: 0-1, l: 0-1)."""
    r1, g1, b1 = r / 255.0, g / 255.0, b / 255.0
    cmax, cmin = max(r1, g1, b1), min(r1, g1, b1)
    delta = cmax - cmin

    # Lightness
    l = (cmax + cmin) / 2.0

    if delta == 0:
        return (0.0, 0.0, l)

    # Saturation
    s = delta / (1.0 - abs(2.0 * l - 1.0)) if l != 0.5 else delta

    # Hue
    if cmax == r1:
        h = 60.0 * (((g1 - b1) / delta) % 6)
    elif cmax == g1:
        h = 60.0 * (((b1 - r1) / delta) + 2)
    else:
        h = 60.0 * (((r1 - g1) / delta) + 4)

    return (h, min(1.0, max(0.0, s)), l)


def _hsl_to_rgb(h: float, s: float, l: float) -> tuple[int, int, int]:
    """Convert HSL (h: 0-360, s: 0-1, l: 0-1) to RGB (0-255)."""
    c = (1.0 - abs(2.0 * l - 1.0)) * s
    x = c * (1.0 - abs((h / 60.0) % 2 - 1.0))
    m = l - c / 2.0

    if h < 60:
        r1, g1, b1 = c, x, 0.0
    elif h < 120:
        r1, g1, b1 = x, c, 0.0
    elif h < 180:
        r1, g1, b1 = 0.0, c, x
    elif h < 240:
        r1, g1, b1 = 0.0, x, c
    elif h < 300:
        r1, g1, b1 = x, 0.0, c
    else:
        r1, g1, b1 = c, 0.0, x

    return (
        min(255, max(0, int((r1 + m) * 255))),
        min(255, max(0, int((g1 + m) * 255))),
        min(255, max(0, int((b1 + m) * 255))),
    )


def _ensure_vibrant(
    lightened: tuple[int, int, int], original: tuple[int, int, int]
) -> tuple[int, int, int]:
    """
    Luminance floor: if the lightened color is too gray/white,
    boost the original color's saturation and set a readable lightness.

    This prevents dark scenes from producing dull gray text that has
    no visual connection to the scene's palette.
    """
    _h, s, l = _rgb_to_hsl(*lightened)
    if s < 0.15 and l > 0.40:
        # Result is essentially gray/white — boost the original instead
        h_orig, s_orig, _l_orig = _rgb_to_hsl(*original)
        # Only boost if the original has a meaningful hue to work with
        if s_orig < 0.05:
            return lightened  # Truly achromatic — nothing to boost
        s_new = max(s_orig, 0.40)
        l_new = 0.75
        return _hsl_to_rgb(h_orig, s_new, l_new)
    return lightened


def darken_for_background(r: int, g: int, b: int) -> tuple[int, int, int]:
    """Darken a color for use as a background tint.

    Keeps the hue but reduces lightness to 8-12% and clamps saturation to
    20-40% so the tint is visible but not garish. The result reads as
    "almost black with a hint of color." Truly achromatic inputs return a
    plain near-black gray to avoid a red-hue artifact (hue=0 is red in HSL).
    """
    h, s, l = _rgb_to_hsl(r, g, b)
    if s < 0.05:
        # Truly achromatic — no meaningful hue to tint with
        return (15, 15, 15)
    l = max(0.08, min(0.12, l * 0.15))
    s = max(0.20, min(0.40, s))
    return _hsl_to_rgb(h, s, l)


def extract_background_tint(video_path: str) -> tuple[str, str]:
    """Extract a darkened background tint color from scene images.

    Returns (hex_color, source_label). Same source logic as
    extract_dominant_color() but applies darken_for_background()
    instead of _lighten_for_text().
    """
    # Try scene image first — richer, more intentional palette
    image_path = _find_first_scene_image(video_path)
    if image_path:
        try:
            img = Image.open(image_path).convert("RGB")
            hex_color = _extract_color_from_pil_image(img).lstrip("#")
            r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
            r, g, b = darken_for_background(r, g, b)
            return f"#{r:02x}{g:02x}{b:02x}", "scene_image"
        except Exception:
            pass

    # Fall back to video frame extraction
    try:
        hex_color = _extract_color_from_video_frame(video_path, 0.1).lstrip("#")
        r, g, b = int(hex_color[0:2], 16), int(hex_color[2:4], 16), int(hex_color[4:6], 16)
        r, g, b = darken_for_background(r, g, b)
        return f"#{r:02x}{g:02x}{b:02x}", "video_frame"
    except Exception:
        return "#0a0a0a", "fallback"


def _lighten_for_text(r: int, g: int, b: int) -> tuple[int, int, int]:
    """
    Lighten and slightly desaturate a color to ensure readability on black.
    """
    target_lightness = 200
    factor = 0.6

    r = int(r + (target_lightness - r) * factor)
    g = int(g + (target_lightness - g) * factor)
    b = int(b + (target_lightness - b) * factor)

    # Desaturate slightly: pull toward gray
    gray = (r + g + b) // 3
    desat = 0.2
    r = int(r + (gray - r) * desat)
    g = int(g + (gray - g) * desat)
    b = int(b + (gray - b) * desat)

    return (min(255, max(0, r)), min(255, max(0, g)), min(255, max(0, b)))


def _probe_video_duration(video_path: str) -> float:
    """Get video duration via ffprobe."""
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet", "-print_format", "json",
            "-show_format", video_path,
        ],
        capture_output=True,
        text=True,
        timeout=PROBE_TIMEOUT_SECONDS,
    )
    data = json.loads(result.stdout)
    return float(data["format"]["duration"])
