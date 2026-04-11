import json
import subprocess
from pathlib import Path


def probe_media(file_path: str) -> dict:
    """
    Probe a media file for format and stream information.

    Returns dict with:
        duration: float (seconds)
        width: int (video width)
        height: int (video height)
        fps: float (video frame rate)
        file_size: int (bytes)
    """
    result = subprocess.run(
        [
            "ffprobe", "-v", "quiet",
            "-print_format", "json",
            "-show_format", "-show_streams",
            file_path,
        ],
        capture_output=True,
        text=True,
    )

    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr[:300]}")

    data = json.loads(result.stdout)

    fmt = data.get("format", {})
    duration = float(fmt.get("duration", 0))
    file_size = int(fmt.get("size", 0))

    # Find video stream
    width, height, fps = 0, 0, 25.0
    for stream in data.get("streams", []):
        if stream.get("codec_type") == "video":
            width = int(stream.get("width", 0))
            height = int(stream.get("height", 0))
            fps_str = stream.get("r_frame_rate", "25/1")
            if "/" in fps_str:
                num, den = fps_str.split("/")
                fps = float(num) / float(den) if float(den) != 0 else 25.0
            else:
                fps = float(fps_str)
            break

    return {
        "duration": duration,
        "width": width,
        "height": height,
        "fps": fps,
        "file_size": file_size,
    }


def concatenate_segments(
    intro_path: str,
    assembled_path: str,
    outro_path: str | None,
    output_path: str,
) -> str:
    """
    Concatenate two or three video segments using FFMPEG concat demuxer.

    All segments must have the same resolution, FPS, and codec settings.
    Pass outro_path=None to produce a two-segment output (intro + assembled only).

    Returns path to the concatenated output.
    """
    concat_file = Path(output_path).parent / "_concat_list.txt"
    with open(concat_file, "w") as f:
        f.write(f"file '{intro_path}'\n")
        f.write(f"file '{assembled_path}'\n")
        if outro_path:
            f.write(f"file '{outro_path}'\n")

    # Stream copy — all three segments are already encoded with matching
    # codecs (libx264 + AAC 48kHz stereo) so no re-encode needed here.
    cmd = [
        "ffmpeg", "-y",
        "-f", "concat", "-safe", "0",
        "-i", str(concat_file),
        "-c", "copy",
        "-movflags", "+faststart",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)

    try:
        concat_file.unlink(missing_ok=True)
    except Exception:
        pass

    if result.returncode != 0:
        raise RuntimeError(f"FFMPEG concat failed: {result.stderr[-500:]}")

    return output_path


def re_encode_assembled_video(
    input_path: str,
    output_path: str,
    target_width: int,
    target_height: int,
    target_fps: int,
) -> str:
    """
    Re-encode the assembled video to ensure codec/resolution/fps compatibility
    with the word card segments for concat.
    """
    cmd = [
        "ffmpeg", "-y",
        "-i", input_path,
        "-vf", f"scale={target_width}:{target_height},fps={target_fps},format=yuv420p",
        "-c:v", "libx264", "-preset", "slow", "-crf", "18",
        "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
        "-movflags", "+faststart",
        output_path,
    ]

    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"FFMPEG re-encode failed: {result.stderr[-500:]}")

    return output_path
