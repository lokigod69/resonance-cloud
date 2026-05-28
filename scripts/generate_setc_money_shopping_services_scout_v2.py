from __future__ import annotations

import argparse
import base64
import hashlib
import json
import os
import sys
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx
from PIL import Image, ImageDraw, ImageFont, ImageOps


REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = REPO_ROOT.parent
CURRICULUM_ROOT = WORKSPACE_ROOT / "curriculum"
DEFAULT_RENDER_ROOT = CURRICULUM_ROOT / "test_renders" / "en"
OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations"
ENDPOINT_LABEL = "/v1/images/generations"
LOCAL_CA_BUNDLE = REPO_ROOT / "build" / "win-ca-bundle.pem"

DEFAULT_MODEL = "gpt-image-2"
DEFAULT_QUALITY = "low"
DEFAULT_SIZE = "1680x944"
DEFAULT_OUTPUT_FORMAT = "png"
DEFAULT_ROUTE_NAME = "money_shopping_services_scout_v2_symbolic_object_commerce_editorial"
DEFAULT_SET_ID = "en_setC_money_shopping_services_low_v2"
DEFAULT_SET_ROLE = "category_specific_word_image_style_scout"
PROMPT_FAMILY = "Set C premium symbolic commerce object editorial"
LIVE_CALL_COUNT = 10


try:
    from zoneinfo import ZoneInfo

    MANILA_TZ = ZoneInfo("Asia/Manila")
except Exception:  # pragma: no cover
    MANILA_TZ = timezone(timedelta(hours=8))


@dataclass(frozen=True)
class MoneySpec:
    word: str
    word_id: str
    subroute: str
    direction: str
    dominant_visual_element: str


WORD_SPECS: list[MoneySpec] = [
    MoneySpec(
        "cash",
        "cash",
        "premium commerce object-study",
        "Primary object should be stacked generic cash, banknote-like paper, coins, or a wallet. Reduce table clutter. Avoid counting-money scenes and unnecessary hands. Treat money like a premium object-study. No readable denominations or country-specific currency dependence.",
        "stacked generic cash, coins, or wallet as premium object-study",
    ),
    MoneySpec(
        "pay",
        "pay",
        "symbolic transaction scene",
        "One elegant payment interaction only: card, phone, and payment terminal. Cleaner framing than V1. Avoid background clutter, receipt text, visible amount, and extra retail context.",
        "single clean card or phone payment interaction",
    ),
    MoneySpec(
        "discount",
        "discount",
        "minimal retail interaction",
        "One product plus one strong discount symbol or tag. Cleaner and more iconic than V1. Avoid retail clutter, shelf rows, readable prices, and multiple tags.",
        "single product with one strong discount symbol or tag",
    ),
    MoneySpec(
        "checkout",
        "checkout",
        "minimal retail interaction",
        "Focus on checkout station, register, scanner, or payment terminal. Simpler than V1 with less supermarket context. Keep one station dominant and avoid busy baskets or product piles.",
        "clean checkout station or register as dominant subject",
    ),
    MoneySpec(
        "ATM",
        "atm",
        "premium commerce object-study",
        "ATM machine itself should dominate. Minimal or no person required. Make the ATM iconic and readable, with card slot or cash cue only if needed. No bank logo, readable screen, or real institution design.",
        "iconic ATM machine as dominant object with minimal card or cash cue",
    ),
    MoneySpec(
        "delivery",
        "delivery",
        "clean service/editorial interaction",
        "One clean parcel-delivery interaction with door, package, or courier cue. Cleaner composition than V1. Avoid branded uniforms, readable labels, tracking numbers, and extra hallway clutter.",
        "single parcel delivery handoff or doorstep package cue",
    ),
    MoneySpec(
        "customer support",
        "customer-support",
        "clean service/editorial interaction",
        "Cleaner support interaction with headset, help gesture, or minimal support desk. Reduce glowing icons and visual clutter. Keep the support cue dominant and avoid generic office realism.",
        "minimal headset or support-desk interaction",
    ),
    MoneySpec(
        "electricity bill",
        "electricity-bill",
        "premium commerce object-study",
        "Use one abstract bill object plus one electricity cue only: utility bill plus electric meter, light bulb, or power outlet. Do not include calculator, socket, lamp, meter, coffee, and desk clutter all together.",
        "one abstract bill object plus one electricity cue",
    ),
    MoneySpec(
        "budget",
        "budget",
        "restrained finance metaphor",
        "Simple planning composition. Envelopes, calculator, or coins are allowed, but use fewer objects than V1. Avoid generic finance desk realism, spreadsheets, coffee mugs, and document clutter.",
        "minimal envelopes, calculator, or coins as planned-spending symbol",
    ),
    MoneySpec(
        "inflation",
        "inflation",
        "restrained finance metaphor",
        "Strong symbolic composition such as groceries rising upward, shrinking coins beside larger price-like blank tags, or stacked shopping bags increasing. Cleaner and more iconic than V1. Avoid infographic-chart overload.",
        "clean rising-cost metaphor with groceries, coins, or shopping bags",
    ),
]


BASE_PROMPT_TEMPLATE = """Create a premium educational vocabulary image for the English word or phrase: {WORD}.

Category: Money, Shopping & Services.

The image must make the meaning of "{WORD}" immediately readable without readable text, labels, captions, logos, real brand names, readable receipts, readable invoices, readable account numbers, readable UI, watermarks, or personal data.

Visual direction:
A realistic premium symbolic commerce editorial image designed like a high-end language-learning card. Use one dominant object or one dominant commercial interaction. Keep the composition clean, elegant, and immediately readable at thumbnail size.

Use restrained symbolic cues only when necessary. Avoid overexplaining the concept with many props.

The image should feel premium, tactile, clean, modern, object-focused, elegant, memorable, and educational.

The image should not feel like business stock photography, accounting desk clutter, generic office realism, infographic collage, retail documentary photography, or crowded checkout realism.

Composition:
Use one dominant visual idea. Prefer isolated commerce objects, symbolic still-life setups, elegant transaction moments, premium editorial framing, restrained negative space, and clean foreground/background separation.

Keep the subject large and readable. Every image should survive thumbnail reduction. If the meaning disappears when small, the composition is too busy.

Lighting:
Modern trustworthy editorial light, balanced exposure, readable midtones, protected highlights, tactile shadows, clean practical-life atmosphere. Avoid corporate-blue wallpaper, harsh retail lighting, and over-glossy finance advertising.

Style:
Realistic, premium, tactile, editorial, clean, restrained, educational, memorable.

Avoid:
too many props, too many people, cluttered desks, stock-photo realism, fake readable documents, fake banking UI, random office coffee mugs, excessive explanatory symbolism, cheap e-commerce stock photo, generic business handshake, fake bank website, readable documents, random charts, cluttered supermarket aisles, country-specific currency dependence, corporate blue finance wallpaper, cartoon icons, overdone infographic graphics, text-heavy layouts, brand logos, UI text, personal data, plastic CGI, fake HDR."""


def now_iso() -> str:
    return datetime.now(MANILA_TZ).isoformat(timespec="seconds")


def timestamp_slug() -> str:
    return datetime.now(MANILA_TZ).strftime("%Y_%m_%d_%H%M%S")


def compute_prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def normalize_path(path: Path) -> str:
    return str(path.resolve())


def parse_size(size: str) -> tuple[int, int]:
    width, height = size.lower().split("x", 1)
    return int(width), int(height)


def build_prompt(spec: MoneySpec) -> str:
    return (
        f"{BASE_PROMPT_TEMPLATE.format(WORD=spec.word)}\n\n"
        f"Subroute: {spec.subroute}.\n"
        f"Word-specific guidance: {spec.direction}\n\n"
        "V2 subroute hypotheses to test:\n"
        "1. Premium commerce object-study: one elegant object or object pair, strong silhouette, restrained negative space.\n"
        "2. Symbolic transaction scene: one clean payment or exchange action, minimal hands, no background clutter.\n"
        "3. Minimal retail interaction: one product, checkout station, tag, scanner, or terminal as the dominant cue.\n"
        "4. Restrained finance metaphor: one physical metaphor for abstract finance, not an infographic collage.\n"
        "5. Clean service/editorial interaction: one service cue such as headset, parcel, counter, or support gesture.\n\n"
        "Negative constraints:\n"
        "No readable text, no logos, no real banking UI, no fake website UI, no cluttered accounting desk, no infographic overload, no generic business stock photo, no too-many-props composition, no cartoon, no illustration, no readable prices, no readable receipts, no readable invoices, no account numbers, no real barcodes, no UI text, no watermarks, no personal data, no country-specific currency dependence.\n"
    )


def build_metadata(
    *,
    spec: MoneySpec,
    prompt: str,
    output_dir: Path,
    request_id: str,
    created_at: str,
    route_name: str,
    set_id: str,
    model: str,
    quality: str,
    size: str,
    output_format: str,
) -> dict[str, Any]:
    return {
        "word": spec.word,
        "normalized_word": spec.word.lower(),
        "word_id": spec.word_id,
        "category_id": "money_shopping_services",
        "route_name": route_name,
        "set_id": set_id,
        "set_role": DEFAULT_SET_ROLE,
        "provider": "OpenAI direct",
        "endpoint": ENDPOINT_LABEL,
        "model": model,
        "quality": quality,
        "size": size,
        "output_format": output_format,
        "prompt_family": PROMPT_FAMILY,
        "subroute": spec.subroute,
        "dominant_visual_element": spec.dominant_visual_element,
        "image_path": normalize_path(output_dir / f"{spec.word_id}.{output_format}"),
        "prompt_path": normalize_path(output_dir / f"{spec.word_id}.prompt.txt"),
        "prompt_hash": compute_prompt_hash(prompt),
        "request_id": request_id,
        "created_at": created_at,
        "recommendation": "candidate",
    }


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def load_env_file(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def load_local_env() -> None:
    load_env_file(REPO_ROOT / ".env")
    load_env_file(WORKSPACE_ROOT / "engines" / "image-engine" / ".env")


def resolve_output_dir(args: argparse.Namespace) -> Path:
    if args.out:
        return Path(args.out)
    return DEFAULT_RENDER_ROOT / f"{args.route_name}_{timestamp_slug()}"


def ensure_new_output_dir(output_dir: Path) -> None:
    if output_dir.exists() and any(output_dir.iterdir()):
        raise SystemExit(f"Output folder already exists and is not empty: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)


def request_openai_image(*, api_key: str, model: str, prompt: str, quality: str, size: str, output_format: str) -> tuple[bytes, str]:
    payload = {
        "model": model,
        "prompt": prompt,
        "n": 1,
        "quality": quality,
        "size": size,
        "output_format": output_format,
    }
    verify: str | bool = str(LOCAL_CA_BUNDLE) if LOCAL_CA_BUNDLE.exists() else True
    with httpx.Client(timeout=300.0, verify=verify) as client:
        response = client.post(
            OPENAI_IMAGE_ENDPOINT,
            headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
            json=payload,
        )
        request_id = response.headers.get("x-request-id", "")
        if response.status_code >= 400:
            raise RuntimeError(f"OpenAI image call failed status={response.status_code} request_id={request_id}: {response.text[:2000]}")
        data = response.json()
        item = data.get("data", [{}])[0]
        if not request_id:
            request_id = data.get("id") or data.get("request_id") or ""
        if item.get("b64_json"):
            return base64.b64decode(item["b64_json"]), request_id
        if item.get("url"):
            image_response = client.get(item["url"])
            image_response.raise_for_status()
            return image_response.content, request_id
    raise RuntimeError("OpenAI image response did not contain b64_json or url image data.")


def validate_image(path: Path, expected_size: tuple[int, int]) -> None:
    with Image.open(path) as image:
        image.load()
        if image.format != "PNG":
            raise RuntimeError(f"{path.name} decoded as {image.format}, expected PNG")
        if image.size != expected_size:
            raise RuntimeError(f"{path.name} has size {image.size}, expected {expected_size}")


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    for name in ("arialbd.ttf" if bold else "arial.ttf", "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"):
        try:
            return ImageFont.truetype(name, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def cover_image(image: Image.Image, size: tuple[int, int]) -> Image.Image:
    return ImageOps.fit(image.convert("RGB"), size, method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))


def create_contact_sheet(output_dir: Path, specs: list[MoneySpec]) -> None:
    columns = 5
    tile_w, tile_h, text_h = 260, 146, 64
    margin, gap = 26, 16
    header_h = 64
    rows = (len(specs) + columns - 1) // columns
    sheet = Image.new("RGB", (margin * 2 + columns * tile_w + (columns - 1) * gap, header_h + margin + rows * (tile_h + text_h + gap)), "#0c0f14")
    draw = ImageDraw.Draw(sheet)
    draw.text((margin, 22), "Money, Shopping & Services - Symbolic Object Commerce Editorial v2", font=load_font(20, True), fill="#f4f7fb")
    for index, spec in enumerate(specs):
        col = index % columns
        row = index // columns
        x = margin + col * (tile_w + gap)
        y = header_h + row * (tile_h + text_h + gap)
        with Image.open(output_dir / f"{spec.word_id}.png") as image:
            fitted = cover_image(image, (tile_w, tile_h))
        sheet.paste(fitted, (x, y))
        draw.rectangle((x, y, x + tile_w, y + tile_h), outline="#5c6678", width=1)
        draw.text((x, y + tile_h + 7), spec.word, font=load_font(14, True), fill="#ffffff")
        draw.text((x, y + tile_h + 29), spec.subroute, font=load_font(10), fill="#aeb8c8")
        draw.text((x, y + tile_h + 48), "money_shopping_services | candidate", font=load_font(10), fill="#7d8797")
    sheet.save(output_dir / "contact_sheet.png")


def write_report(output_dir: Path, specs: list[MoneySpec], live_calls: int, recommendation: str = "review_money_shopping_services_scout_v2") -> None:
    lines = [
        "# Money, Shopping & Services Set C Scout v2 Report",
        "",
        f"live_api_calls_completed: {live_calls}",
        "reused_images: 0",
        "copied_images: 0",
        "skip_if_exists_used: false",
        "report_only_update: false",
        "batch_submitted: false",
        "production_import: false",
        "frontend_wiring: false",
        "supabase_touched: false",
        "generation_jobs_touched: false",
        "",
        f"Output folder: {normalize_path(output_dir)}",
        "",
        "Prompt family used: Set C premium symbolic commerce object editorial.",
        "Core target: object-dominant commerce still lifes, elegant transaction moments, minimal retail cues, clean service interactions, and restrained finance metaphors with fewer props and less documentation-heavy explanatory clutter than Scout V1.",
        "",
        "Contact sheet: contact_sheet.png",
        "",
        "| word | subroute | dominant visual element | per-word notes | recommendation |",
        "|---|---|---|---|---|",
    ]
    for spec in specs:
        lines.append(f"| {spec.word} | {spec.subroute} | {spec.dominant_visual_element} | pending contact-sheet review | candidate |")
    lines.extend(
        [
            "",
            "## V1 vs V2 Comparison Notes",
            "- V1 was rejected as too busy, too documentation-heavy, too desk/table driven, too people/hands heavy, and too close to finance stock photography.",
            "- V2 intentionally reduces objects, people, desks, documents, and explanatory clutter.",
            "- V2 should be judged on object dominance, silhouette readability, elegance at thumbnail size, and whether a single symbolic cue is enough to teach the word.",
            "",
            "## Strongest V2 Improvements",
            "- Pending visual review. Look for clearer subject dominance, fewer props, stronger negative space, and less document-table realism compared with V1.",
            "",
            "## Weakest Remaining Semantics",
            "- Pending visual review.",
            "",
            "## Batch Readiness",
            "- Pending visual review. Do not prepare Batch API manifests until this route is explicitly approved.",
            "",
            "## Hybrid V1/V2 Route Question",
            "- Pending visual review. If V2 becomes too abstract, retain V2 object dominance but borrow V1's concrete context only for `checkout`, `delivery`, `customer support`, and utility-bill words.",
            "",
            "## Suggested Final Production Route If Approved",
            "- money_shopping_services_v1_1_symbolic_object_commerce_editorial",
            "",
            "## Scout Questions",
            "- Can the category feel premium without becoming business stock?",
            "- Can abstract finance words be understood without text?",
            "- Can bills be clear without readable documents?",
            "- Can online/shopping/service words stay platform-neutral?",
            "- Does the category need object/action/document/service/abstract-finance subroutes?",
            "",
            "## Failure Modes To Check",
            "- too many props",
            "- too many people or hands",
            "- cluttered desks or accounting-table realism",
            "- object not dominant enough",
            "- stock-photo realism",
            "- fake readable documents",
            "- fake banking UI",
            "- infographic overload",
            "- abstract finance concept unreadable",
            "- service/support cue too generic",
            "",
            "## V2 Refinements If Needed",
            "- Pending visual review.",
            "",
            f"Final recommendation: {recommendation}",
        ]
    )
    (output_dir / "REPORT.md").write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_manifest(args: argparse.Namespace, metadata: list[dict[str, Any]], live_calls: int) -> dict[str, Any]:
    return {
        "route_name": args.route_name,
        "set_id": args.set_id,
        "set_role": DEFAULT_SET_ROLE,
        "provider": "OpenAI direct",
        "endpoint": ENDPOINT_LABEL,
        "model": args.model,
        "quality": args.quality,
        "size": args.size,
        "output_format": args.output_format,
        "live_api_calls_required": LIVE_CALL_COUNT,
        "live_api_calls_completed": live_calls,
        "batch_submitted": False,
        "reused_images": 0,
        "copied_images": 0,
        "skip_if_exists_used": False,
        "report_only_update": False,
        "production_import": False,
        "frontend_wiring": False,
        "supabase_touched": False,
        "generation_jobs_touched": False,
        "category_id": "money_shopping_services",
        "words": metadata,
    }


def validate_outputs(output_dir: Path, expected_size: tuple[int, int], live_calls: int) -> list[str]:
    if live_calls != LIVE_CALL_COUNT:
        raise RuntimeError(f"Expected exactly {LIVE_CALL_COUNT} live API calls, got {live_calls}")
    checks: list[str] = []
    for spec in WORD_SPECS:
        image_path = output_dir / f"{spec.word_id}.png"
        prompt_path = output_dir / f"{spec.word_id}.prompt.txt"
        meta_path = output_dir / f"{spec.word_id}.meta.json"
        for path in (image_path, prompt_path, meta_path):
            if not path.exists():
                raise RuntimeError(f"Missing required file: {path.name}")
        validate_image(image_path, expected_size)
        prompt = prompt_path.read_text(encoding="utf-8")
        meta = json.loads(meta_path.read_text(encoding="utf-8"))
        if meta["prompt_hash"] != compute_prompt_hash(prompt):
            raise RuntimeError(f"Prompt hash mismatch for {spec.word_id}")
        if not meta.get("request_id"):
            raise RuntimeError(f"Missing request_id for {spec.word_id}")
        checks.append(f"{spec.word_id}.png decodes as PNG {expected_size[0]}x{expected_size[1]}")
    for required in ("contact_sheet.png", "manifest.json", "REPORT.md", "RUN_START.json", "RUN_END.json"):
        if not (output_dir / required).exists():
            raise RuntimeError(f"Missing required file: {required}")
    return checks


def dry_run(args: argparse.Namespace, output_dir: Path) -> dict[str, Any]:
    write_json(output_dir / "RUN_START.json", {"started_at": now_iso(), "mode": "dry-run", "words": [spec.word_id for spec in WORD_SPECS]})
    metadata: list[dict[str, Any]] = []
    for spec in WORD_SPECS:
        prompt = build_prompt(spec)
        (output_dir / f"{spec.word_id}.prompt.txt").write_text(prompt, encoding="utf-8")
        meta = build_metadata(spec=spec, prompt=prompt, output_dir=output_dir, request_id="dry_run", created_at=now_iso(), route_name=args.route_name, set_id=args.set_id, model=args.model, quality=args.quality, size=args.size, output_format=args.output_format)
        write_json(output_dir / f"{spec.word_id}.meta.json", meta)
        metadata.append(meta)
    write_json(output_dir / "manifest.json", build_manifest(args, metadata, 0))
    write_report(output_dir, WORD_SPECS, 0)
    write_json(output_dir / "RUN_END.json", {"ended_at": now_iso(), "status": "DRY_RUN", "output_folder": normalize_path(output_dir)})
    return {"output_folder": normalize_path(output_dir), "live_api_calls_completed": 0, "request_ids_present": False}


def live_run(args: argparse.Namespace, output_dir: Path) -> dict[str, Any]:
    load_local_env()
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not set. Refusing to call provider.")
    if args.provider != "openai":
        raise SystemExit("--provider must be openai.")
    if args.output_format != "png":
        raise SystemExit("This scout requires --output-format png.")
    expected_size = parse_size(args.size)
    write_json(
        output_dir / "RUN_START.json",
        {
            "started_at": now_iso(),
            "route_name": args.route_name,
            "set_id": args.set_id,
            "set_role": DEFAULT_SET_ROLE,
            "provider": "OpenAI direct",
            "endpoint": ENDPOINT_LABEL,
            "model": args.model,
            "quality": args.quality,
            "size": args.size,
            "output_format": args.output_format,
            "words": [spec.word_id for spec in WORD_SPECS],
            "batch_submitted": False,
            "production_import": False,
            "frontend_wiring": False,
        },
    )
    metadata: list[dict[str, Any]] = []
    live_calls = 0
    for spec in WORD_SPECS:
        prompt = build_prompt(spec)
        (output_dir / f"{spec.word_id}.prompt.txt").write_text(prompt, encoding="utf-8")
        image_bytes, request_id = request_openai_image(api_key=api_key, model=args.model, prompt=prompt, quality=args.quality, size=args.size, output_format=args.output_format)
        live_calls += 1
        image_path = output_dir / f"{spec.word_id}.png"
        image_path.write_bytes(image_bytes)
        validate_image(image_path, expected_size)
        meta = build_metadata(spec=spec, prompt=prompt, output_dir=output_dir, request_id=request_id, created_at=now_iso(), route_name=args.route_name, set_id=args.set_id, model=args.model, quality=args.quality, size=args.size, output_format=args.output_format)
        write_json(output_dir / f"{spec.word_id}.meta.json", meta)
        metadata.append(meta)
        print(f"generated money_shopping_services/{spec.word_id}: request_id={request_id or 'missing'}")
    create_contact_sheet(output_dir, WORD_SPECS)
    write_json(output_dir / "manifest.json", build_manifest(args, metadata, live_calls))
    write_report(output_dir, WORD_SPECS, live_calls)
    write_json(output_dir / "RUN_END.json", {"ended_at": now_iso(), "status": "PENDING_VALIDATION", "live_api_calls_completed": live_calls, "output_folder": normalize_path(output_dir)})
    checks = validate_outputs(output_dir, expected_size, live_calls)
    run_end = {
        "ended_at": now_iso(),
        "status": "PASS",
        "live_api_calls_completed": live_calls,
        "request_ids_present": all(row.get("request_id") for row in metadata),
        "validation_checks": checks,
        "output_folder": normalize_path(output_dir),
        "contact_sheet": normalize_path(output_dir / "contact_sheet.png"),
        "report": normalize_path(output_dir / "REPORT.md"),
        "batch_submitted": False,
        "production_import": False,
        "frontend_wiring": False,
        "supabase_touched": False,
        "generation_jobs_touched": False,
    }
    write_json(output_dir / "RUN_END.json", run_end)
    return run_end


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Generate Set C Money, Shopping & Services scout v2 images.")
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--dry-run", action="store_true")
    mode.add_argument("--live", action="store_true")
    parser.add_argument("--provider", default="openai")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--quality", default=DEFAULT_QUALITY)
    parser.add_argument("--size", default=DEFAULT_SIZE)
    parser.add_argument("--output-format", default=DEFAULT_OUTPUT_FORMAT)
    parser.add_argument("--route-name", default=DEFAULT_ROUTE_NAME)
    parser.add_argument("--set-id", default=DEFAULT_SET_ID)
    parser.add_argument("--out", default="")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    output_dir = resolve_output_dir(args)
    ensure_new_output_dir(output_dir)
    try:
        result = live_run(args, output_dir) if args.live else dry_run(args, output_dir)
    except Exception as exc:
        write_json(
            output_dir / "RUN_END.json",
            {
                "ended_at": now_iso(),
                "status": "FAIL",
                "error": str(exc),
                "output_folder": normalize_path(output_dir),
                "batch_submitted": False,
                "production_import": False,
                "frontend_wiring": False,
            },
        )
        print(f"FAILED: {exc}", file=sys.stderr)
        print(f"output_folder={normalize_path(output_dir)}", file=sys.stderr)
        return 1
    print(f"output_folder={result['output_folder']}")
    print(f"live_api_calls_completed={result['live_api_calls_completed']}")
    print(f"request_ids_present={'yes' if result.get('request_ids_present') else 'no'}")
    if args.live:
        print(f"contact_sheet={result['contact_sheet']}")
        print(f"report={result['report']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
