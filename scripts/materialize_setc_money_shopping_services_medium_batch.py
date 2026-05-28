from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = REPO_ROOT.parent
CURRICULUM_ROOT = WORKSPACE_ROOT / "curriculum"
DEFAULT_BATCH_DIR = CURRICULUM_ROOT / "batch_runs" / "en" / "money_shopping_services_v1_1_premium_symbolic_object_commerce_editorial_2026_05_28_093034"
DEFAULT_RENDER_ROOT = CURRICULUM_ROOT / "test_renders" / "en"
LOCAL_CA_BUNDLE = REPO_ROOT / "build" / "win-ca-bundle.pem"

OPENAI_BATCHES_ENDPOINT = "https://api.openai.com/v1/batches"
OPENAI_FILES_ENDPOINT = "https://api.openai.com/v1/files"
ENDPOINT_LABEL = "/v1/images/generations"
DEFAULT_BATCH_OUTPUT_FILENAME = "batch_output.jsonl"
DEFAULT_BATCH_ERRORS_FILENAME = "batch_errors.jsonl"
EXPECTED_SIZE = (1680, 944)
CATEGORY_ID = "money_shopping_services"
CATEGORY_LABEL = "Money, Shopping & Services"

try:
    from zoneinfo import ZoneInfo

    MANILA_TZ = ZoneInfo("Asia/Manila")
except Exception:  # pragma: no cover
    MANILA_TZ = timezone(timedelta(hours=8))


def now_iso() -> str:
    return datetime.now(MANILA_TZ).isoformat(timespec="seconds")


def normalize_path(path: Path) -> str:
    return str(path.resolve())


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def load_env_file(path: Path) -> int:
    if not path.exists():
        return 0
    loaded = 0
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value
            loaded += 1
    return loaded


def load_local_env() -> int:
    return load_env_file(REPO_ROOT / ".env") + load_env_file(WORKSPACE_ROOT / "engines" / "image-engine" / ".env")


def openai_client() -> httpx.Client:
    verify: str | bool = str(LOCAL_CA_BUNDLE) if LOCAL_CA_BUNDLE.exists() else True
    return httpx.Client(timeout=300.0, verify=verify)


def default_output_dir(batch_dir: Path) -> Path:
    manifest = json.loads((batch_dir / "manifest.json").read_text(encoding="utf-8"))
    slug = batch_dir.name.removeprefix(f"{manifest['route_name']}_")
    return DEFAULT_RENDER_ROOT / f"{manifest['route_name']}_materialized_{manifest['quality']}_batch_{slug}"


def decode_image_from_body(body: dict[str, Any]) -> bytes:
    data = body.get("data") or []
    if not data:
        raise RuntimeError("response body has no image data")
    first = data[0]
    if first.get("b64_json"):
        return base64.b64decode(first["b64_json"])
    if first.get("url"):
        with openai_client() as client:
            response = client.get(first["url"])
            response.raise_for_status()
            return response.content
    raise RuntimeError("image response did not include b64_json or url")


def load_planned_records(batch_dir: Path) -> dict[str, dict[str, Any]]:
    manifest = json.loads((batch_dir / "manifest.json").read_text(encoding="utf-8"))
    request_meta = {item["custom_id"]: item for item in manifest["requests"]}
    records: dict[str, dict[str, Any]] = {}
    for raw in (batch_dir / "batch_input.jsonl").read_text(encoding="utf-8").splitlines():
        row = json.loads(raw)
        custom_id = row["custom_id"]
        meta = request_meta[custom_id]
        prompt = row["body"]["prompt"]
        records[custom_id] = {
            **meta,
            "prompt": prompt,
            "prompt_hash": prompt_hash(prompt),
            "route_name": manifest["route_name"],
            "set_id": manifest["set_id"],
            "set_role": "production_candidate_money_shopping_services_materialized",
            "provider": "OpenAI Batch API",
            "endpoint": ENDPOINT_LABEL,
            "model": manifest["model"],
            "quality": manifest["quality"],
            "size": manifest["size"],
            "output_format": manifest["output_format"],
            "prompt_family": manifest["prompt_family"],
            "source_batch_folder": normalize_path(batch_dir),
        }
    return records


def poll_batch_status(batch_dir: Path, api_key: str) -> dict[str, Any]:
    submit = json.loads((batch_dir / "batch_submit.json").read_text(encoding="utf-8"))
    batch_id = submit["batch_id"]
    with openai_client() as client:
        response = client.get(f"{OPENAI_BATCHES_ENDPOINT}/{batch_id}", headers={"Authorization": f"Bearer {api_key}"})
    request_id = response.headers.get("x-request-id", "")
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI batch poll failed status={response.status_code} request_id={request_id}: {response.text[:2000]}")
    status = response.json()
    status["_poll_response_headers_request_id"] = request_id
    write_json(batch_dir / "batch_status_latest.json", status)
    write_json(batch_dir / "batch_status.json", status)
    manifest = json.loads((batch_dir / "manifest.json").read_text(encoding="utf-8"))
    manifest["latest_batch_status"] = status.get("status")
    manifest["output_file_id"] = status.get("output_file_id")
    manifest["error_file_id"] = status.get("error_file_id")
    manifest["request_counts"] = status.get("request_counts")
    write_json(batch_dir / "manifest.json", manifest)
    return status


def download_file(file_id: str, target: Path, api_key: str) -> None:
    with openai_client() as client:
        response = client.get(f"{OPENAI_FILES_ENDPOINT}/{file_id}/content", headers={"Authorization": f"Bearer {api_key}"})
    request_id = response.headers.get("x-request-id", "")
    if response.status_code >= 400:
        raise RuntimeError(f"OpenAI file download failed file_id={file_id} status={response.status_code} request_id={request_id}: {response.text[:2000]}")
    target.write_bytes(response.content)


def ensure_new_output_dir(output_dir: Path) -> None:
    if output_dir.exists() and any(output_dir.iterdir()):
        raise SystemExit(f"Output folder already exists and is not empty: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)


def validate_png(path: Path) -> tuple[str, int, int]:
    with Image.open(path) as image:
        image.load()
        decoded_format = image.format or ""
        width, height = image.size
    if decoded_format != "PNG" or (width, height) != EXPECTED_SIZE:
        raise RuntimeError(f"{path.name} decoded as {decoded_format} {width}x{height}, expected PNG {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]}")
    return decoded_format, width, height


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    for name in ("arialbd.ttf" if bold else "arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def cover_image(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def create_contact_sheet(records: list[dict[str, Any]], output_path: Path, title: str, columns: int = 5) -> None:
    tile_w, tile_h, text_h = 260, 146, 62
    margin, gap = 26, 16
    header_h = 62
    rows = (len(records) + columns - 1) // columns
    sheet = Image.new("RGB", (margin * 2 + columns * tile_w + (columns - 1) * gap, header_h + margin + rows * (tile_h + text_h + gap)), "#0c0f14")
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 20), title, font=load_font(23, True), fill="#f4f7fb")
    for index, record in enumerate(records):
        col = index % columns
        row = index // columns
        x = margin + col * (tile_w + gap)
        y = header_h + row * (tile_h + text_h + gap)
        with Image.open(record["image_path"]) as image:
            fitted = cover_image(image, (tile_w, tile_h))
        sheet.paste(fitted, (x, y))
        draw.rectangle((x, y, x + tile_w, y + tile_h), outline="#5c6678", width=1)
        draw.text((x, y + tile_h + 7), record["word"], font=load_font(14, True), fill="#ffffff")
        draw.text((x, y + tile_h + 28), f"L{record['level']} | {record['subroute'][:31]}", font=load_font(10), fill="#aeb8c8")
        draw.text((x, y + tile_h + 45), f"{CATEGORY_ID} | candidate", font=load_font(10), fill="#7d8797")
    sheet.save(output_path)


def materialize(batch_dir: Path, output_dir: Path, status: dict[str, Any], api_key: str) -> dict[str, Any]:
    if status.get("status") != "completed":
        return {"materialized": False, "status": status.get("status"), "reason": "batch not completed"}
    output_file_id = status.get("output_file_id")
    if not output_file_id:
        raise RuntimeError("completed batch has no output_file_id")
    error_file_id = status.get("error_file_id")
    ensure_new_output_dir(output_dir)
    download_file(output_file_id, batch_dir / DEFAULT_BATCH_OUTPUT_FILENAME, api_key)
    if error_file_id:
        download_file(error_file_id, batch_dir / DEFAULT_BATCH_ERRORS_FILENAME, api_key)

    planned = load_planned_records(batch_dir)
    manifest = json.loads((batch_dir / "manifest.json").read_text(encoding="utf-8"))
    output_records: list[dict[str, Any]] = []
    failures: list[dict[str, Any]] = []
    seen: set[str] = set()
    for raw in (batch_dir / DEFAULT_BATCH_OUTPUT_FILENAME).read_text(encoding="utf-8").splitlines():
        row = json.loads(raw)
        custom_id = row.get("custom_id")
        seen.add(custom_id)
        plan = planned.get(custom_id)
        if not plan:
            failures.append({"custom_id": custom_id, "failure_reason": "unknown custom_id in batch output"})
            continue
        response = row.get("response") or {}
        error = row.get("error")
        if error or response.get("status_code") != 200:
            failures.append({"custom_id": custom_id, "word": plan.get("word"), "failure_reason": error or response})
            continue
        word_id = plan["word_id"]
        image_path = output_dir / f"{word_id}.png"
        prompt_path = output_dir / f"{word_id}.prompt.txt"
        meta_path = output_dir / f"{word_id}.meta.json"
        prompt = plan["prompt"]
        image_path.write_bytes(decode_image_from_body(response.get("body") or {}))
        prompt_path.write_text(prompt if prompt.endswith("\n") else prompt + "\n", encoding="utf-8")
        decoded_format, width, height = validate_png(image_path)
        if prompt_hash(prompt) != plan["prompt_hash"]:
            raise RuntimeError(f"prompt hash mismatch for {custom_id}")
        meta = {
            "word": plan["word"],
            "normalized_word": plan.get("normalized_word", plan["word"]),
            "word_id": word_id,
            "category_id": CATEGORY_ID,
            "level": plan["level"],
            "level_label": plan["level_label"],
            "route_name": manifest["route_name"],
            "set_id": manifest["set_id"],
            "set_role": "production_candidate_money_shopping_services_materialized",
            "provider": "OpenAI Batch API",
            "endpoint": ENDPOINT_LABEL,
            "model": manifest["model"],
            "quality": manifest["quality"],
            "size": manifest["size"],
            "output_format": manifest["output_format"],
            "prompt_family": manifest["prompt_family"],
            "subroute": plan["subroute"],
            "visual_route_note": plan.get("visual_route_note", ""),
            "dominant_visual_element": f"dominant {plan['word']} commerce object, transaction, service cue, bill cue, or finance metaphor",
            "image_path": normalize_path(image_path),
            "prompt_path": normalize_path(prompt_path),
            "prompt_hash": plan["prompt_hash"],
            "batch_id": manifest["batch_id"],
            "input_file_id": manifest["input_file_id"],
            "output_file_id": output_file_id,
            "custom_id": custom_id,
            "request_id": response.get("request_id") or row.get("id") or "",
            "created_at": now_iso(),
            "recommendation": "candidate",
            "meta_path": normalize_path(meta_path),
            "decoded_format": decoded_format,
            "decoded_width": width,
            "decoded_height": height,
        }
        write_json(meta_path, meta)
        output_records.append(meta)

    for custom_id, plan in planned.items():
        if custom_id not in seen:
            failures.append({"custom_id": custom_id, "word": plan.get("word"), "failure_reason": "missing from batch output"})

    output_records.sort(key=lambda item: (item["level"], item["custom_id"]))
    output_manifest = {
        "route_name": manifest["route_name"],
        "set_id": manifest["set_id"],
        "set_role": "production_candidate_money_shopping_services_materialized",
        "provider": "OpenAI Batch API",
        "endpoint": ENDPOINT_LABEL,
        "model": manifest["model"],
        "quality": manifest["quality"],
        "size": manifest["size"],
        "output_format": manifest["output_format"],
        "category": CATEGORY_LABEL,
        "category_id": CATEGORY_ID,
        "batch_id": manifest["batch_id"],
        "input_file_id": manifest["input_file_id"],
        "output_file_id": output_file_id,
        "batch_output_jsonl": normalize_path(batch_dir / DEFAULT_BATCH_OUTPUT_FILENAME),
        "materialized_at": now_iso(),
        "levels_materialized": sorted({record["level"] for record in output_records}),
        "images_materialized": len(output_records),
        "failed_records": len(failures),
        "request_ids_present": all(bool(record.get("request_id")) for record in output_records),
        "production_import": False,
        "frontend_wiring": False,
        "app_assets_overwritten": False,
        "supabase_touched": False,
        "backend_touched": False,
        "generation_jobs_touched": False,
        "cardworker_touched": False,
        "request_word_retry_touched": False,
        "submit_generation_touched": False,
        "pricing_touched": False,
        "credits_touched": False,
        "provider_auth_touched": False,
        "words": output_records,
    }
    write_json(output_dir / "manifest.json", output_manifest)
    write_json(output_dir / "failures.json", failures)
    create_contact_sheet(output_records, output_dir / "contact_sheet.png", f"{CATEGORY_LABEL} v1.1 - medium batch")
    for level in sorted({record["level"] for record in output_records}):
        level_records = [record for record in output_records if record["level"] == level]
        create_contact_sheet(level_records, output_dir / f"level_{level:02d}_contact_sheet.png", f"{CATEGORY_LABEL} - Level {level}", columns=5)

    subroute_counts = Counter(record["subroute"] for record in output_records)
    report = [
        "# Money, Shopping & Services Medium Materialized Report",
        "",
        f"materialized_at: {now_iso()}",
        "",
        f"- source batch folder: `{normalize_path(batch_dir)}`",
        f"- batch_id: `{manifest['batch_id']}`",
        f"- input_file_id: `{manifest['input_file_id']}`",
        f"- output_file_id: `{output_file_id}`",
        f"- error_file_id: `{error_file_id}`",
        f"- batch status: `{status.get('status')}`",
        f"- request counts: `{status.get('request_counts')}`",
        f"- materialized PNGs: {len(output_records)}",
        f"- failures: {len(failures)}",
        f"- output folder: `{normalize_path(output_dir)}`",
        f"- contact sheet: `{normalize_path(output_dir / 'contact_sheet.png')}`",
        f"- level contact sheets: `{len({record['level'] for record in output_records})}`",
        f"- subroute counts: `{dict(subroute_counts)}`",
        "- frontend import: `false`",
        "- app assets overwritten: `false`",
        "- Supabase/backend/generation_jobs/CardWorker/request_word_retry/submit_generation changes: `false`",
        "- pricing/credits/provider-auth changes: `false`",
        "",
        "## Review Expectations",
        "",
        "- Review contact sheets by level before broad import decisions.",
        "- Flag words where object dominance regressed into desk/document clutter.",
        "- Flag readable text, fake UI, real prices, logos, or country-specific currency dependence.",
        "- Flag abstract finance words whose metaphor is unclear at thumbnail size.",
    ]
    (output_dir / "REPORT.md").write_text("\n".join(report) + "\n", encoding="utf-8")

    manifest["batch_materialized"] = True
    manifest["materialized_output_folder"] = normalize_path(output_dir)
    manifest["materialized_images"] = len(output_records)
    manifest["materialized_failures"] = len(failures)
    write_json(batch_dir / "manifest.json", manifest)
    return {"materialized": True, "output_folder": normalize_path(output_dir), "images_materialized": len(output_records), "failures": len(failures)}


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Poll and materialize the Money, Shopping & Services Set C medium OpenAI Batch output.")
    parser.add_argument("--batch-dir", default=str(DEFAULT_BATCH_DIR))
    parser.add_argument("--out", default="")
    parser.add_argument("--poll-only", action="store_true")
    parser.add_argument("--materialize-if-complete", action="store_true")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or [])
    if args.poll_only == args.materialize_if_complete:
        raise SystemExit("Choose exactly one of --poll-only or --materialize-if-complete.")
    loaded_env_files_count = load_local_env()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not set.")
    batch_dir = Path(args.batch_dir)
    output_dir = Path(args.out) if args.out else default_output_dir(batch_dir)
    status = poll_batch_status(batch_dir, api_key)
    result = {
        "loaded_env_files_count": loaded_env_files_count,
        "batch_dir": normalize_path(batch_dir),
        "batch_id": status.get("id"),
        "status": status.get("status"),
        "request_counts": status.get("request_counts"),
        "output_file_id": status.get("output_file_id"),
        "error_file_id": status.get("error_file_id"),
        "materialized": False,
    }
    if args.materialize_if_complete:
        result.update(materialize(batch_dir, output_dir, status, api_key))
    print(json.dumps(result, indent=2))
    if args.materialize_if_complete and status.get("status") != "completed":
        return 2
    return 0


if __name__ == "__main__":
    import sys

    raise SystemExit(main(sys.argv[1:]))
