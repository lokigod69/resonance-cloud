"""Generate or silently check Script Lab's local Supertonic recordings.

Run with the hub's engines/supertonic/.venv Python (numpy and soundfile).
The UTF-8 inventory is a JSON array of {scriptId, itemId, text}. Use --script
and --voice to choose a different built-in voice for each language.
From frontend, export the inventory first:
  npx tsx scripts/script-lab-local-inventory.ts <scratch>/inventory.json
Then run this script with --inventory <scratch>/inventory.json --public-scripts public/scripts
and either --hub <TTSHUB> --voice F1 --workers 4, or --check for offline verification.
Rebuild the browser index with npx tsx scripts/rebuild-script-lab-audio-manifest.ts.
"""
import argparse
import contextlib
import hashlib
import json
import math
import os
from pathlib import Path
import queue
import re
import shutil
import subprocess
import sys
import tempfile
import threading
from concurrent.futures import ThreadPoolExecutor

import numpy as np
import soundfile as sf


LANGUAGES = {"japanese-hiragana": "ja", "russian-cyrillic": "ru", "korean-hangul": "ko"}
MODEL_REVISION = "3cadd1ee6394adea1bd021217a0e650ede09a323"
PROCESSING = 2
VOICES = ("F1", "M1")


def read_json(path):
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path, value):
    path.write_text(json.dumps(value, ensure_ascii=False, separators=(",", ":"), allow_nan=False) + "\n",
                    encoding="utf-8")


def checksum(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def read_inventory(path):
    groups = {key: {} for key in LANGUAGES}
    rows = read_json(path)
    # A truncated export must never become a complete pack under public/.
    frontend = Path(__file__).resolve().parents[1]
    current = subprocess.run(["node", "--import", "tsx", "scripts/script-lab-local-inventory.ts"],
                             check=True, cwd=frontend, capture_output=True, encoding="utf-8")
    if rows != json.loads(current.stdout):
        raise ValueError("Inventory differs from the app. Export it again before generating or checking.")
    if not isinstance(rows, list) or not rows:
        raise ValueError("Expected a non-empty inventory array")
    for row in rows:
        script, key, text = row["scriptId"], row["itemId"], row["text"]
        if script not in groups or not isinstance(text, str) or not text.strip():
            raise ValueError(f"Invalid script or text: {row!r}")
        if script == "korean-hangul":
            valid = len(text) == 1 and 0xac00 <= ord(text) <= 0xd7a3 and key == f"composed-{ord(text):x}"
        else:
            valid = re.fullmatch(r"word-[a-z0-9]+(?:-[a-z0-9]+)*", key)
        if not valid or key in groups[script]:
            raise ValueError(f"Invalid or duplicate {script}/{key}")
        groups[script][key] = text
    return groups


def model_revision(hub, voice):
    """Verify the downloaded ONNX weights, tokenizer and style against their pinned HF metadata."""
    root = hub / "engines/supertonic/models/supertonic-3"
    names = ["onnx/" + n for n in ("duration_predictor.onnx", "text_encoder.onnx", "vector_estimator.onnx",
                                    "vocoder.onnx", "tts.json", "unicode_indexer.json")]
    names.append(f"voice_styles/{voice}.json")
    revisions = set()
    for name in names:
        metadata = (root / ".cache/huggingface/download" / (name + ".metadata")).read_text().splitlines()
        revision, expected = metadata[:2]
        if not re.fullmatch("[0-9a-f]{40}", revision):
            raise ValueError(f"Missing pinned revision for {name}")
        payload = (root / name).read_bytes()
        digest = (hashlib.sha1(f"blob {len(payload)}\0".encode() + payload).hexdigest()
                  if len(expected) == 40 else hashlib.sha256(payload).hexdigest())
        if digest != expected:
            raise ValueError(f"Local hub model checksum mismatch: {name}")
        revisions.add(revision)
    if revisions != {MODEL_REVISION}:
        raise ValueError("Model files and voice must match the pinned Supertonic 3 release")
    return MODEL_REVISION


def signature(script, revision, voice):
    return {"schemaVersion": 1, "scriptId": script, "language": LANGUAGES[script],
            "engine": "supertonic", "model": "supertonic-3", "modelRevision": revision,
            "voice": voice, "processingVersion": PROCESSING}


def waveform(samples, rate, language):
    if samples.ndim != 1 or rate < 16000 or not len(samples) or not np.isfinite(samples).all():
        raise ValueError("Expected finite mono speech at 16 kHz or above")
    if len(samples) > rate * 12:
        raise ValueError("Audio longer than 12 seconds")
    window = max(1, rate // 100)
    windows = np.pad(samples, (0, (-len(samples)) % window)).reshape(-1, window)
    energy = np.sqrt(np.mean(windows.astype(np.float64) ** 2, axis=1))
    # A relative threshold preserves quiet consonants on both sides of vowels.
    threshold = max(10 ** (-55 / 20), float(energy.max()) * 0.025)
    active = np.flatnonzero(energy >= threshold)
    if not len(active):
        raise ValueError("Silent audio")
    start, end = int(active[0] * window), min(len(samples), int((active[-1] + 1) * window))
    active_ms = round(len(active) * window * 1000 / rate)
    maximum_active = 1600 if language == "ko" else 6000
    if not 50 <= active_ms <= maximum_active:
        raise ValueError(f"Unusual active speech duration: {active_ms} ms")
    gap_ms = round(max(np.diff(active) - 1, default=0) * window * 1000 / rate)
    if gap_ms > (380 if language == "ko" else 1000):
        raise ValueError(f"Unexpected internal silence: {gap_ms} ms")
    peak = float(np.abs(samples).max())
    rms = float(np.sqrt(np.mean(samples.astype(np.float64) ** 2)))
    metrics = {
        "durationMs": round(len(samples) * 1000 / rate), "activeMs": active_ms,
        "leadingMs": round(start * 1000 / rate), "trailingMs": round((len(samples) - end) * 1000 / rate),
        "maxGapMs": gap_ms, "peakDbfs": round(20 * math.log10(peak), 2),
        "rmsDbfs": round(20 * math.log10(rms), 2),
        "clippedSamples": int(np.count_nonzero(np.abs(samples) >= 0.999)),
    }
    return metrics, start, end


def decoded_metrics(path, language, check_padding=True):
    info = sf.info(str(path))
    if info.subtype != "MPEG_LAYER_III" or info.channels != 1:
        raise ValueError(f"Expected mono MP3 in {path.name}")
    samples, rate = sf.read(str(path), dtype="float32")
    metrics, _, _ = waveform(samples, rate, language)
    if not -16 <= metrics["peakDbfs"] <= -2 or metrics["clippedSamples"]:
        raise ValueError(f"Unsafe or unusually quiet decoded level: {metrics}")
    if check_padding and (metrics["leadingMs"] > 170 or metrics["trailingMs"] > 200):
        raise ValueError(f"Unexpected exterior silence: {metrics}")
    return metrics


def encode(wav_path, mp3_path, language):
    samples, rate = sf.read(str(wav_path), dtype="float32")
    metrics, speech_start, speech_end = waveform(samples, rate, language)
    if metrics["peakDbfs"] < -36 or metrics["clippedSamples"] > max(3, len(samples) * 0.001):
        raise ValueError(f"Suspect source waveform: {metrics}")
    # Only trim exterior silence; retain the release and a margin before onset.
    start = max(0, speech_start - round(0.075 * rate))
    end = min(len(samples), speech_end + round(0.105 * rate))
    gain = 10 ** (min(18.0, -6.0 - metrics["peakDbfs"]) / 20)

    def write_clip():
        sf.write(str(mp3_path), samples[start:end] * gain, rate, format="MP3",
                 subtype="MPEG_LAYER_III", bitrate_mode="VARIABLE", compression_level=0.55)

    write_clip()
    decoded = decoded_metrics(mp3_path, language, check_padding=False)
    if decoded["leadingMs"] <= 170 and decoded["trailingMs"] <= 200:
        return decoded
    # A quiet edge may fall below the threshold only after MP3 encoding.
    # Keep at least 40/55 ms around all activity detected in the original WAV,
    # including weak final consonants. Re-encode from the original samples.
    if decoded["leadingMs"] > 170:
        start = min(max(0, speech_start - round(0.040 * rate)), start + round((decoded["leadingMs"] - 140) * rate / 1000))
    if decoded["trailingMs"] > 200:
        end = max(min(len(samples), speech_end + round(0.055 * rate)), end - round((decoded["trailingMs"] - 175) * rate / 1000))
    write_clip()
    return decoded_metrics(mp3_path, language)


@contextlib.contextmanager
def server(hub, language):
    env = {**os.environ, "HF_HUB_OFFLINE": "1", "TRANSFORMERS_OFFLINE": "1", "PYTHONUTF8": "1"}
    proc = subprocess.Popen([sys.executable, str(hub / "tts.py"), "--engine", "supertonic",
                             "--language", language, "--serve"], cwd=hub, env=env,
                            stdin=subprocess.PIPE, stdout=subprocess.PIPE, encoding="utf-8", bufsize=1)
    messages = queue.Queue()

    def drain():
        try:
            for line in proc.stdout:
                messages.put(line.rstrip())
        finally:
            messages.put(None)

    reader = threading.Thread(target=drain, daemon=True)
    reader.start()

    def receive(prefix):
        while True:
            try:
                line = messages.get(timeout=180)
            except queue.Empty as exc:
                raise TimeoutError("Local TTS hub timed out") from exc
            if line is None:
                raise RuntimeError("Local TTS hub exited before " + prefix)
            if line.startswith(prefix):
                return line[len(prefix):]
            print(line, file=sys.stderr, flush=True)

    def synth(text_path, wav_path, voice):
        request = {"text_file": str(text_path), "out": str(wav_path), "voice": voice}
        proc.stdin.write(json.dumps(request) + "\n")
        proc.stdin.flush()
        result = json.loads(receive("TTSHUB-SERVE-RESULT "))
        if not result.get("ok") or Path(result.get("out", "")).resolve() != wav_path or not wav_path.is_file():
            raise RuntimeError(f"Local TTS hub failed: {result}")

    try:
        receive("TTSHUB-SERVE-READY")
        yield synth
    finally:
        proc.stdin.close()
        try:
            proc.wait(timeout=30)
        except subprocess.TimeoutExpired:
            proc.kill()
            proc.wait()
        proc.stdout.close()


def verify_record(directory, record, key, text, language, decode):
    if record["itemId"] != key or record["text"] != text or record["file"] != key + ".mp3":
        raise ValueError(f"Recording does not match inventory: {key}")
    path = directory / (key + ".mp3")
    if path.is_symlink() or checksum(path) != record["outputSha256"]:
        raise ValueError(f"Recording has changed: {path}")
    if decode:
        measured = decoded_metrics(path, language)
        for field, value in measured.items():
            if abs(record[field] - value) > (0.05 if field in ("peakDbfs", "rmsDbfs") else 0):
                raise ValueError(f"Measurement mismatch for {key}: {field}")


def verify_pack(directory, expected, config, decode=True):
    data = read_json(directory / "provenance.json")
    if any(data.get(k) != v for k, v in config.items()):
        raise ValueError(f"Unexpected model or processing configuration in {directory}")
    if data["voice"] not in VOICES or not re.fullmatch("[0-9a-f]{40}", data["modelRevision"]):
        raise ValueError("Invalid model or voice provenance")
    if {p.name for p in directory.iterdir()} != {"provenance.json", *(k + ".mp3" for k in expected)}:
        raise ValueError(f"Incomplete pack or unrelated files in {directory}")
    records = {r["itemId"]: r for r in data["recordings"]}
    if set(records) != set(expected) or len(records) != len(data["recordings"]):
        raise ValueError(f"Duplicate/missing item in {directory}")
    for key, text in expected.items():
        verify_record(directory, records[key], key, text, config["language"], decode)
    return list(records.values())


def generate(hub, work, destination, entries, config, workers):
    if destination.exists():
        verify_pack(destination, entries, config)
        return
    cache = work / "items" / config["scriptId"] / config["modelRevision"] / config["voice"] / str(PROCESSING)
    cache.mkdir(parents=True, exist_ok=True)
    pending = []
    for key, text in entries.items():
        if (cache / key).exists():
            receipt = read_json(cache / key / "receipt.json")
            if receipt["config"] != config:
                raise ValueError("Cached voice/model differs: " + key)
            verify_record(cache / key, receipt["recording"], key, text, config["language"], False)
        else:
            pending.append((key, text))
    print(f"{config['scriptId']}: {len(entries) - len(pending)} verified in cache, {len(pending)} to generate", flush=True)
    stop = threading.Event()

    def run_worker(batch):
        try:
            with server(hub, config["language"]) as synth:
                for step, (key, text) in enumerate(batch, 1):
                    if stop.is_set():
                        return
                    with tempfile.TemporaryDirectory(dir=work, prefix="item-") as temp:
                        temp = Path(temp)
                        text_path, wav_path = temp / "input.txt", temp / "source.wav"
                        text_path.write_text(text, encoding="utf-8")
                        try:
                            synth(text_path, wav_path, config["voice"])
                            item = temp / key
                            item.mkdir()
                            mp3 = item / (key + ".mp3")
                            metrics = encode(wav_path, mp3, config["language"])
                        except Exception as exc:
                            raise RuntimeError(f"Failed {config['scriptId']}/{key} ({text!r}): {exc}") from exc
                        record = {"itemId": key, "text": text, "file": mp3.name, "outputSha256": checksum(mp3), **metrics}
                        write_json(item / "receipt.json", {"config": config, "recording": record})
                        item.rename(cache / key)
                    if step % 50 == 0:
                        print(f"{config['scriptId']} worker: {step}/{len(batch)} completed", flush=True)
        except BaseException:
            stop.set()
            raise

    if pending:
        with ThreadPoolExecutor(max_workers=workers) as pool:
            futures = [pool.submit(run_worker, pending[i::workers]) for i in range(min(workers, len(pending)))]
            for future in futures:
                future.result()

    # Build a complete pack outside public and publish it with one rename.
    destination.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(dir=work, prefix="publish-") as temp:
        pack = Path(temp) / "local-tts"
        pack.mkdir()
        records = []
        for key in sorted(entries):
            record = read_json(cache / key / "receipt.json")["recording"]
            records.append(record)
            shutil.copyfile(cache / key / record["file"], pack / record["file"])
        write_json(pack / "provenance.json", {**config, "recordings": records})
        verify_pack(pack, entries, config)
        pack.rename(destination)


def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--hub", type=Path)
    ap.add_argument("--inventory", required=True, type=Path)
    ap.add_argument("--public-scripts", required=True, type=Path)
    ap.add_argument("--work-dir", type=Path, help="Private resumable cache, same filesystem as public")
    ap.add_argument("--workers", type=int, choices=range(1, 5), default=1)
    ap.add_argument("--voice", choices=VOICES)
    ap.add_argument("--script", choices=LANGUAGES)
    ap.add_argument("--check", action="store_true", help="Verify all final files without starting the hub")
    opts = ap.parse_args()
    if not opts.check and (not opts.hub or not opts.voice):
        ap.error("generation requires --hub and --voice")
    root = opts.public_scripts.resolve()
    work = (opts.work_dir or opts.inventory.parent / "script-lab-local-tts-work").resolve()
    app_public = Path(__file__).resolve().parents[1] / "public"
    if any(work == directory or directory in work.parents for directory in (root, app_public)):
        ap.error("Use a private --work-dir outside the app public folder and release destination")
    inventory = read_inventory(opts.inventory)
    revision = None if opts.check else model_revision(opts.hub.resolve(), opts.voice)
    for script, entries in inventory.items():
        if (opts.script and script != opts.script) or not entries:
            continue
        destination = root / script / "local-tts"
        if destination.resolve() != destination:
            raise ValueError("Refusing redirected output directory: " + str(destination))
        if opts.check:
            meta = read_json(destination / "provenance.json")
            cfg = signature(script, MODEL_REVISION, opts.voice or meta["voice"])
            verify_pack(destination, entries, cfg)
        else:
            generate(opts.hub.resolve(), work, destination, entries, signature(script, revision, opts.voice), opts.workers)
        print(f"Verified {script}: {len(entries)} complete MP3s", flush=True)
    if opts.script and not inventory[opts.script]:
        raise ValueError(f"No inventory rows for {opts.script}")


if __name__ == "__main__":
    main()
