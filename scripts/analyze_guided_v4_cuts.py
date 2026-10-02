"""Offline cut candidates only: JSON on stdout; no files, network or audio edits.

Example: python scripts/analyze_guided_v4_cuts.py --batches batches.json --receipt receipt.json
    --audio full.mp3 --language English
Quiet waveform boundaries are evidence, not a pronunciation/listening sign-off.
"""
import argparse
import array
import hashlib
import json
import math
from pathlib import Path
import subprocess
import sys
import unicodedata

RATE = 16000
FRAME = 160  # 10 ms, complete frames only
RMS_LIMIT = 10 ** (-50 / 20)
PEAK_LIMIT = 10 ** (-38 / 20)
GAP_SAMPLES = 1600  # 100 ms, midpoint retains >=50 ms on each side
GUARD = 0.04
OVERFLOW_LIMIT = 0.15
SAFE = "waveform-verified-candidate"
REVIEW = "needs-listening-review"


def digest(value):
    return hashlib.sha256(value).hexdigest()


def utf16(text):
    return len(text.encode("utf-16-le")) // 2


def source_segments(data, language):
    segments, offset, offset16 = [], 0, 0
    for batch in data["batches"]:
        if (batch["targetLanguage"] != language or batch["kind"] != "utterances"
                or batch["level"] not in ("A1", "A2")):
            continue
        local, local16 = 0, 0
        if "\n".join(s["text"] for s in batch["segments"]) != batch["text"]:
            raise ValueError("Batch text/segment mismatch")
        if digest(batch["text"].encode("utf-8")) != batch["textSha256"]:
            raise ValueError("Stale batch text hash")
        for segment in batch["segments"]:
            text = segment["text"]
            expected = (local, local + len(text), local16, local16 + utf16(text))
            actual = tuple(segment[k] for k in (
                "textStartCodePoint", "textEndCodePoint", "textStartIndex", "textEndIndex"))
            if not text or "\n" in text or actual != expected:
                raise ValueError("Malformed source span")
            if digest(text.encode("utf-8")) != segment["textSha256"] or not segment["sourceCoordinates"]:
                raise ValueError("Stale phrase hash or missing source coordinates")
            segments.append({"batchId": batch["batchId"], "entryId": segment["entryId"],
                             "text": text, "textSha256": segment["textSha256"],
                             "sourceCoordinates": segment["sourceCoordinates"],
                             "startCodePoint": offset, "endCodePoint": offset + len(text),
                             "startUtf16": offset16, "endUtf16": offset16 + utf16(text)})
            local += len(text) + 1
            local16 += utf16(text) + 1
            offset += len(text) + 1
            offset16 += utf16(text) + 1
    if not segments:
        raise ValueError("No matching source phrases")
    return "\n".join(s["text"] for s in segments), segments


def validate_alignment(alignment, text, duration):
    chars = alignment.get("characters")
    starts = alignment.get("character_start_times_seconds")
    if not isinstance(chars, list) or any(not isinstance(c, str) or len(c) != 1 for c in chars):
        raise ValueError("Malformed alignment characters")
    if "".join(chars) != text or not text:
        raise ValueError("Stale alignment character text")
    if not isinstance(starts, list) or len(starts) != len(chars):
        raise ValueError("Malformed alignment start times")
    if any(isinstance(t, bool) or not isinstance(t, (int, float)) or not math.isfinite(t)
           or t < 0 for t in starts) or any(a > b for a, b in zip(starts, starts[1:])):
        raise ValueError("Nonfinite, negative or nonmonotonic alignment start time")
    spoken = [i for i, c in enumerate(chars) if c.isalnum()]
    if not spoken or not math.isfinite(duration) or duration <= 0:
        raise ValueError("Missing spoken text or audio duration")
    overruns = []
    for i, time in enumerate(starts):
        if time >= duration:
            trailing_punctuation = (i > spoken[-1] and all(
                c.isspace() or unicodedata.category(c).startswith("P") for c in chars[i:]))
            if not trailing_punctuation or time - duration > OVERFLOW_LIMIT:
                raise ValueError("Speech or excessive alignment overflow; do not clamp")
            overruns.append({"characterIndex": i, "character": chars[i], "startSeconds": time,
                             "overflowSeconds": time - duration, "action": "recorded-not-clamped"})
    return starts, overruns


def energy(samples):
    if not samples:
        return 1.0, 1.0
    return math.sqrt(sum(x * x for x in samples) / len(samples)) / 32768, max(abs(x) for x in samples) / 32768


def quiet_boundary(samples, lower, upper):
    result = {"status": REVIEW, "searchSeconds": [lower, upper], "cutSample": None}
    runs, run_start = [], None
    first, last = math.ceil(lower * RATE / FRAME) * FRAME, math.floor(upper * RATE / FRAME) * FRAME
    for pos in range(first, last, FRAME):
        rms, peak = energy(samples[pos:pos + FRAME])
        quiet = rms <= RMS_LIMIT and peak <= PEAK_LIMIT
        if quiet and run_start is None:
            run_start = pos
        if not quiet and run_start is not None:
            runs.append((run_start, pos))
            run_start = None
    if run_start is not None:
        runs.append((run_start, last))
    runs = [(a, b) for a, b in runs if b - a >= GAP_SAMPLES]
    result["qualifiedQuietRuns"] = len(runs)
    if len(runs) != 1:
        result["reason"] = "no sufficient quiet gap" if not runs else "multiple possible quiet gaps"
        return result
    a, b = runs[0]
    rms, peak = energy(samples[a:b])
    result.update(status=SAFE, cutSample=(a + b) // 2, quietSamples=[a, b],
                  rmsDbfs=20 * math.log10(max(rms, 1e-12)), peakDbfs=20 * math.log10(max(peak, 1e-12)))
    return result


def make_manifest(data, receipt, samples, language):
    text, segments = source_segments(data, language)
    duration = len(samples) / RATE
    starts, overruns = validate_alignment(receipt["alignments"]["alignment"], text, duration)
    if "\n".join(d["text"] for d in receipt["dialogue"]) != text:
        raise ValueError("Receipt dialogue differs from source")
    boundaries = []
    for index, sample in ((0, 0), (len(segments), len(samples))):
        edge = samples[:640] if index == 0 else samples[-640:]
        rms, peak = energy(edge)
        boundaries.append({"index": index, "status": SAFE if rms <= RMS_LIMIT and peak <= PEAK_LIMIT else REVIEW,
                           "cutSample": sample, "reason": "original source edge retained; 40 ms quiet check",
                           "rmsDbfs": 20 * math.log10(max(rms, 1e-12))})
    for i, (previous, following) in enumerate(zip(segments, segments[1:]), 1):
        left = previous["startCodePoint"] + max(j for j, c in enumerate(previous["text"]) if c.isalnum())
        right = following["startCodePoint"] + next(j for j, c in enumerate(following["text"]) if c.isalnum())
        punctuation = left + 1 if left + 1 < previous["endCodePoint"] else left
        lower = max(starts[left] + GUARD, starts[punctuation])
        boundary = quiet_boundary(samples, lower, starts[right] - GUARD)
        boundary.update(index=i, separatorCharacterIndex=previous["endCodePoint"],
                        alignmentSeparatorSeconds=starts[previous["endCodePoint"]],
                        previousLastSpokenCharacter=left, nextFirstSpokenCharacter=right)
        boundaries.append(boundary)
    boundaries.sort(key=lambda b: b["index"])
    for i, segment in enumerate(segments):
        before, after = boundaries[i:i + 2]
        segment.update(status=SAFE if before["status"] == after["status"] == SAFE else REVIEW,
                       startSample=before["cutSample"], endSample=after["cutSample"], boundaryIndices=[i, i + 1],
                       listeningRequired=True)
    safe = sum(s["status"] == SAFE for s in segments)
    return {"schemaVersion": 1, "status": "offline-candidates-not-listening-approved", "sampleRate": RATE,
            "durationSeconds": duration, "audioSamples": len(samples), "textCharacters": len(text),
            "textSha256": digest(text.encode("utf-8")), "ignoredProviderField": "character_end_times_seconds",
            "criteria": {"rmsDbfsMaximum": -50, "peakDbfsMaximum": -38, "minimumGapMs": 100,
                         "frameMs": 10, "alignmentGuardMs": 40, "punctuationOverflowLimitMs": 150},
            "limitations": "Waveform quietness cannot prove alignment accuracy or pronunciation. Every phrase requires listening before use; uncertain boundaries also require correction. Original audio and raw receipt remain untouched.",
            "trailingPunctuationOverruns": overruns, "summary": {"phrases": len(segments), "quietBoundaryCandidates": safe,
            "boundaryReviewRequired": len(segments) - safe, "listeningPending": len(segments),
            "quietInternalBoundaries": sum(b["status"] == SAFE for b in boundaries[1:-1])},
            "boundaries": boundaries, "phrases": segments}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    for arg in ("batches", "receipt", "audio", "language"):
        parser.add_argument("--" + arg, required=True)
    args = parser.parse_args()
    raw = {key: Path(getattr(args, key)).read_bytes() for key in ("batches", "receipt", "audio")}
    pcm = subprocess.run(["ffmpeg", "-nostdin", "-v", "error", "-i", "pipe:0",
                          "-map", "0:a:0", "-ac", "1", "-ar", str(RATE), "-f", "s16le", "pipe:1"],
                         input=raw["audio"], check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE).stdout
    samples = array.array("h")
    samples.frombytes(pcm)
    if sys.byteorder != "little":
        samples.byteswap()
    result = make_manifest(json.loads(raw["batches"]), json.loads(raw["receipt"]), samples, args.language)
    result["sources"] = {k: {"path": str(Path(getattr(args, k)).resolve()), "sha256": digest(v)} for k, v in raw.items()}
    result["decodedPcmSha256"] = digest(pcm)
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(result, ensure_ascii=False, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
