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
DEFAULT_ROUTE_NAME = "money_shopping_services_scout_v1_premium_symbolic_commerce_cards"
DEFAULT_SET_ID = "en_setC_money_shopping_services_low_v1"
DEFAULT_SET_ROLE = "category_specific_word_image_style_scout"
PROMPT_FAMILY = "Set C premium symbolic commerce cards"
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
        "money object still-life",
        "Generic banknotes and coins with wallet or hand context. Tactile, close, premium. No readable denominations, country-specific currency dependence, account numbers, or real bank marks.",
        "generic banknotes, coins, and wallet or hand context",
    ),
    MoneySpec(
        "pay",
        "pay",
        "transaction/action scene",
        "Clear payment action: card or phone tapping payment terminal, or simple cash handoff. No readable amount, receipt text, brand logo, or banking UI.",
        "card or phone payment action at a clean terminal",
    ),
    MoneySpec(
        "discount",
        "discount",
        "prices/deals symbolic retail",
        "Product with sale tag or percentage symbol in a clean retail setup. It must read as reduced price without readable prices, store branding, or cluttered shelf noise.",
        "product and reduced-price tag or abstract percent cue",
    ),
    MoneySpec(
        "checkout",
        "checkout",
        "store/checkout scene",
        "Retail checkout counter with basket, scanner, register, and payment terminal. It must read as checkout, not just a generic store. No readable prices, barcodes with real data, or receipt text.",
        "checkout counter with basket, scanner, register, and terminal",
    ),
    MoneySpec(
        "ATM",
        "atm",
        "banking scene",
        "ATM machine with card and cash cue. No bank logo, readable screen, account number, keypad numbers emphasized, or real institution design.",
        "ATM machine with card slot and cash withdrawal cue",
    ),
    MoneySpec(
        "delivery",
        "delivery",
        "online shopping / delivery",
        "Parcel arriving at door or courier handoff. No company logo, tracking number, readable label, or branded uniform. Must read as delivery, not just a box.",
        "parcel handoff or doorstep delivery scene",
    ),
    MoneySpec(
        "customer support",
        "customer-support",
        "services/support",
        "Support agent with headset, help desk, or warm service interaction. Use headset, laptop, service desk, and helpful posture, but avoid generic office worker and readable ticket UI.",
        "headset support agent or help-desk service moment",
    ),
    MoneySpec(
        "electricity bill",
        "electricity-bill",
        "bills and household expenses",
        "Abstract bill paper plus electricity-specific objects such as light bulb, outlet, electric meter, calculator, or desk lamp. Must read as electricity-specific bill without readable invoice text.",
        "abstract household bill with light bulb, outlet, meter, or calculator cue",
    ),
    MoneySpec(
        "budget",
        "budget",
        "business/personal finance",
        "Planning money: calculator, envelopes, coins, wallet, and notebook with abstract lines. Must read as planned spending, not just money. No readable spreadsheet or document text.",
        "calculator, envelopes, coins, and simple planning desk",
    ),
    MoneySpec(
        "inflation",
        "inflation",
        "advanced finance metaphor",
        "Rising prices through groceries or shopping basket with upward symbolic arrow, chart-like blocks, or ballooning price tags. No readable prices. Keep metaphor simple and not infographic-heavy.",
        "groceries or shopping basket with rising-price symbolic cue",
    ),
]


BASE_PROMPT_TEMPLATE = """Create a premium educational vocabulary image for the English word or phrase: {WORD}.

Category: Money, Shopping & Services.

The image must make the meaning of "{WORD}" immediately readable without readable text, labels, captions, logos, real brand names, readable prices, readable receipts, readable invoices, account numbers, barcodes with real data, UI text, watermarks, or personal data.

Visual direction:
A realistic premium practical-commerce card for a language-learning curriculum. Show the money object, shopping action, service moment, bill, or finance idea through clear objects, hands, simple retail/service context, and restrained symbolic visual cues.

The style should feel modern, tactile, clean, and trustworthy. Use realistic materials: paper, coins, wallet leather, card plastic, parcels, shelves, counters, terminals, bills, calculators, lamps, desks, and subtle digital light where useful.

Composition:
Use one dominant commerce idea. Keep the main object, action, or service moment large enough for strong thumbnail readability. Use supporting context only when it teaches the word: wallet, coins, card, phone, terminal, scanner, basket, parcel, headset, utility object, calculator, envelope, or simple symbolic arrow/percent cue.

Lighting:
Modern trustworthy editorial light, balanced exposure, readable midtones, protected highlights, tactile shadows, clean practical-life atmosphere. Avoid corporate-blue wallpaper and over-glossy finance advertising.

Style:
Realistic, premium, tactile, clean, practical, educational, modern, trustworthy, memorable.

Avoid:
cheap e-commerce stock photo, generic business handshake, fake bank website, readable documents, random charts, cluttered supermarket aisles, country-specific currency dependence, corporate blue finance wallpaper, cartoon icons, overdone infographic graphics, text-heavy layouts, brand logos, UI text, personal data, plastic CGI, fake HDR."""


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
        "Subroute system to test:\n"
        "1. Money object still-life for tactile cash, coins, wallets, and currency-like objects without readable denominations.\n"
        "2. Transaction/action scene for paying, buying, spending, charging, and payment actions.\n"
        "3. Prices/deals symbolic retail for discount, sale, coupon, bargain, tax, price, cheap, expensive, and free.\n"
        "4. Store/checkout scene for checkout, register, barcode, basket, shopping cart, shelf, and product words.\n"
        "5. Banking scene for ATM, account, deposit, withdrawal, transfer, and bank-card concepts.\n"
        "6. Online shopping / delivery for parcels, courier handoff, shipping, tracking, returns, and online orders.\n"
        "7. Services/support for service desks, help desk, customer support, repair, cleaning, and appointments.\n"
        "8. Bills and household expenses for utility bills with abstract documents plus specific utility-object cues.\n"
        "9. Business/personal finance for salary, income, budget, expenses, profit, loss, and investment planning.\n"
        "10. Advanced finance metaphor for inflation, debt, mortgage, insurance, pension, exchange rate, and premium.\n\n"
        "Negative constraints:\n"
        "No readable text, no labels, no captions, no logos, no real brand names, no readable prices, no readable receipts, no readable invoices, no account numbers, no real barcodes, no UI text, no watermarks, no personal data, no country-specific currency dependence, no corporate-blue finance wallpaper, no generic business handshake, no cluttered supermarket aisle, no cheap e-commerce stock photo, no cartoon icons, no overdone infographic graphics.\n"
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
    draw.text((margin, 22), "Money, Shopping & Services - Premium Symbolic Commerce Cards", font=load_font(20, True), fill="#f4f7fb")
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


def write_report(output_dir: Path, specs: list[MoneySpec], live_calls: int, recommendation: str = "review_money_shopping_services_scout_v1") -> None:
    lines = [
        "# Money, Shopping & Services Set C Scout v1 Report",
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
        "Prompt family used: Set C premium symbolic commerce cards.",
        "Core target: tactile real-world money, shopping, service, bill, and finance scenes with restrained symbolic cues, no readable documents, no platform branding, and no cheap business-stock look.",
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
            "## Strongest Route",
            "- Pending visual review. Compare object still-life, transaction/action, retail/deal, checkout, banking, delivery, support, bills, personal finance, and advanced finance metaphor routes.",
            "",
            "## Failed Semantics",
            "- Pending visual review.",
            "",
            "## Batch Readiness",
            "- Pending visual review. Do not prepare Batch API manifests until this route is explicitly approved.",
            "",
            "## Scout Questions",
            "- Can the category feel premium without becoming business stock?",
            "- Can abstract finance words be understood without text?",
            "- Can bills be clear without readable documents?",
            "- Can online/shopping/service words stay platform-neutral?",
            "- Does the category need object/action/document/service/abstract-finance subroutes?",
            "",
            "## Failure Modes To Check",
            "- cheap e-commerce stock photo",
            "- generic business-stock or handshake scene",
            "- fake banking UI or readable screen",
            "- readable receipt, invoice, price, barcode, account number, or personal data",
            "- country-specific currency dependence",
            "- cluttered supermarket aisle",
            "- corporate blue finance wallpaper",
            "- overdone infographic graphics",
            "- abstract finance concept unreadable",
            "- bill concept too generic",
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
    parser = argparse.ArgumentParser(description="Generate Set C Money, Shopping & Services scout images.")
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
