from __future__ import annotations

import argparse
import ast
import hashlib
import json
import os
import re
import sys
import unicodedata
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import httpx


REPO_ROOT = Path(__file__).resolve().parents[1]
WORKSPACE_ROOT = REPO_ROOT.parent
CURRICULUM_ROOT = WORKSPACE_ROOT / "curriculum"
DEFAULT_BATCH_ROOT = CURRICULUM_ROOT / "batch_runs" / "en"
LOCAL_CA_BUNDLE = REPO_ROOT / "build" / "win-ca-bundle.pem"

CATEGORY_TS = REPO_ROOT / "frontend" / "src" / "data" / "categories.ts"
SCOUT_V2_REFERENCE_FOLDER = (
    CURRICULUM_ROOT
    / "test_renders"
    / "en"
    / "money_shopping_services_scout_v2_symbolic_object_commerce_editorial_2026_05_28_075424"
)

ENDPOINT_LABEL = "/v1/images/generations"
OPENAI_FILES_ENDPOINT = "https://api.openai.com/v1/files"
OPENAI_BATCHES_ENDPOINT = "https://api.openai.com/v1/batches"

DEFAULT_MODEL = "gpt-image-2"
DEFAULT_QUALITY = "medium"
DEFAULT_SIZE = "1680x944"
DEFAULT_OUTPUT_FORMAT = "png"
DEFAULT_ROUTE_NAME = "money_shopping_services_v1_1_premium_symbolic_object_commerce_editorial"
DEFAULT_SET_ID = "en_setC_money_shopping_services_medium_v1"
DEFAULT_SET_ROLE = "production_candidate_money_shopping_services_batch"
DEFAULT_BATCH_FILENAME = "batch_input.jsonl"
DEFAULT_MANIFEST_FILENAME = "manifest.json"
DEFAULT_SUBMIT_FILENAME = "batch_submit.json"
DEFAULT_STATUS_FILENAME = "batch_status.json"
DEFAULT_REPORT_FILENAME = "REPORT_BATCH_SUBMIT.md"
PROMPT_FAMILY = "Set C Money, Shopping & Services v1.1 premium symbolic object commerce editorial"

try:
    from zoneinfo import ZoneInfo

    MANILA_TZ = ZoneInfo("Asia/Manila")
except Exception:  # pragma: no cover
    MANILA_TZ = timezone(timedelta(hours=8))


@dataclass(frozen=True)
class MoneySpec:
    word: str
    normalized_word: str
    word_id: str
    level: int
    level_label: str
    part_of_speech: str
    category_id: str = "money_shopping_services"


COMMERCE_OBJECT_STUDY = {
    "money",
    "cash",
    "coin",
    "banknote",
    "wallet",
    "currency",
    "bank card",
    "product",
    "receipt",
    "barcode",
    "price tag",
    "coupon",
    "shopping bag",
    "package",
    "item",
    "stock",
    "bond",
}

TRANSACTION_ACTION = {
    "buy",
    "sell",
    "pay",
    "spend",
    "save",
    "cost",
    "charge",
    "borrow",
    "lend",
    "rent",
    "payment",
    "deposit",
    "withdrawal",
    "money transfer",
}

MINIMAL_RETAIL = {
    "shop",
    "shopping cart",
    "shopping basket",
    "checkout",
    "cash register",
    "display shelf",
    "price",
    "cheap",
    "expensive",
    "free",
    "discount",
    "sale",
    "bargain",
    "tax",
    "tip",
    "total",
}

BANKING_OBJECT_SERVICE = {
    "bank account",
    "savings account",
    "checking account",
    "ATM",
    "bank card",
    "loan",
    "interest",
    "deposit",
    "withdrawal",
    "money transfer",
}

ONLINE_DELIVERY = {
    "online store",
    "shopping app",
    "online order",
    "checkout page",
    "delivery",
    "shipping",
    "tracking number",
    "return",
    "refund",
    "review",
}

SERVICES_SUPPORT = {
    "service",
    "appointment",
    "repair service",
    "cleaning service",
    "laundry service",
    "delivery service",
    "customer support",
    "help desk",
    "warranty",
    "membership",
}

BILLS_EXPENSES = {
    "bill",
    "invoice",
    "rent payment",
    "electricity bill",
    "water bill",
    "phone bill",
    "internet bill",
    "service fee",
    "late fee",
    "fine",
}

PERSONAL_BUSINESS_FINANCE = {
    "salary",
    "wage",
    "income",
    "budget",
    "expense",
    "profit",
    "loss",
    "investment",
    "business",
    "contract",
}

ADVANCED_FINANCE = {
    "exchange rate",
    "inflation",
    "debt",
    "mortgage",
    "insurance",
    "premium",
    "pension",
}


def now_iso() -> str:
    return datetime.now(MANILA_TZ).isoformat(timespec="seconds")


def timestamp_slug() -> str:
    return datetime.now(MANILA_TZ).strftime("%Y_%m_%d_%H%M%S")


def normalize_path(path: Path) -> str:
    return str(path.resolve())


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def compute_prompt_hash(prompt: str) -> str:
    return hashlib.sha256(prompt.encode("utf-8")).hexdigest()


def normalize_word_id(term: str) -> str:
    normalized = unicodedata.normalize("NFKD", term.lower()).replace("'", "")
    normalized = "".join(ch for ch in normalized if not unicodedata.combining(ch))
    normalized = re.sub(r"[^a-z0-9]+", "-", normalized)
    return normalized.strip("-")


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


def extract_money_block() -> str:
    text = CATEGORY_TS.read_text(encoding="utf-8")
    start = text.index("const MONEY_SHOPPING_SERVICES_WORD_LEVELS")
    end = text.index("const THEMATIC_DUPLICATE_REPORT", start)
    return text[start:end]


def parse_helper_level_rows(block: str) -> list[tuple[int, str, list[str], str]]:
    pattern = re.compile(r"(nounLevel|wordLevel)\((\d+),\s*'([^']+)',\s*(\[[^\]]+\])(?:,\s*'[^']+')?(?:,\s*'([^']+)')?", re.S)
    rows: list[tuple[int, str, list[str], str]] = []
    for match in pattern.finditer(block):
        fn_name = match.group(1)
        level = int(match.group(2))
        label = match.group(3)
        words = ast.literal_eval(match.group(4))
        part = match.group(5) or ("noun" if fn_name == "nounLevel" else "word")
        rows.append((level, label, words, part))
    return rows


def parse_level_three(block: str) -> tuple[int, str, list[tuple[str, str]]]:
    match = re.search(r"level:\s*3,\s*label:\s*'([^']+)',\s*words:\s*(\[[^\]]+\])\.map", block, re.S)
    if not match:
        raise RuntimeError("Could not parse Money, Shopping & Services level 3 object literal")
    label = match.group(1)
    words = ast.literal_eval(match.group(2))
    word_parts = [(word, "adjective" if word in {"cheap", "expensive", "free"} else "noun") for word in words]
    return 3, label, word_parts


def build_specs() -> list[MoneySpec]:
    block = extract_money_block()
    specs: list[MoneySpec] = []
    for level, label, words, part in parse_helper_level_rows(block):
        for word in words:
            specs.append(
                MoneySpec(
                    word=word,
                    normalized_word=word,
                    word_id=normalize_word_id(word),
                    level=level,
                    level_label=label,
                    part_of_speech=part,
                )
            )
    level, label, word_parts = parse_level_three(block)
    for word, part in word_parts:
        specs.append(
            MoneySpec(
                word=word,
                normalized_word=word,
                word_id=normalize_word_id(word),
                level=level,
                level_label=label,
                part_of_speech=part,
            )
        )
    specs.sort(key=lambda item: item.level)
    word_ids = [spec.word_id for spec in specs]
    levels = {spec.level for spec in specs}
    if len(specs) != 100 or len(word_ids) != len(set(word_ids)) or levels != set(range(1, 11)):
        raise RuntimeError(f"Expected 100 unique Money, Shopping & Services specs across 10 levels, got {len(specs)} specs, {len(set(word_ids))} unique IDs, levels={sorted(levels)}")
    return specs


def subroute_for(word: str) -> str:
    if word in BILLS_EXPENSES:
        return "bills and household expenses route"
    if word in SERVICES_SUPPORT:
        return "services/support editorial interaction route"
    if word in ONLINE_DELIVERY:
        return "online shopping and delivery route"
    if word in BANKING_OBJECT_SERVICE:
        return "banking object/service route"
    if word in TRANSACTION_ACTION:
        return "symbolic transaction/action scene"
    if word in MINIMAL_RETAIL:
        return "minimal retail interaction route"
    if word in PERSONAL_BUSINESS_FINANCE:
        return "personal/business finance route"
    if word in ADVANCED_FINANCE:
        return "advanced finance metaphor route"
    return "premium commerce object-study route"


def word_specific_direction(spec: MoneySpec) -> str:
    directions = {
        "cash": "Make cash feel impressive and object-dominant: stacked generic banknotes, bundled bills, layered bills, maybe a few coins, premium surface, strong object presence. Avoid a person counting money. Avoid a tiny single bundle.",
        "money": "Use a generic money composition with bills and coins as iconic value objects. Avoid country-specific denominations, portraits, seals, flags, or real currency dependence.",
        "coin": "Show one or several coins as macro tactile metal objects with clear edge detail and reflective texture. No readable real currency markings.",
        "banknote": "Show a generic bill or banknote as the subject, no readable real denomination or country-specific markings.",
        "wallet": "Show a wallet with money or card partially visible, object dominant, premium leather texture, no clutter.",
        "currency": "Show generic international value/exchange objects with multiple abstract notes or coins, no readable denominations or country-specific dependence.",
        "bank card": "Show a clean card object with chip/contactless cue, no real numbers, no brand, no UI.",
        "receipt": "Show a paper receipt object with abstract lines only, no readable purchases or prices.",
        "barcode": "Show a clean barcode-like symbol on a product tag or package, no real readable data.",
        "price tag": "Show the tag as an object with abstract price marks only, no readable numbers unless generic symbols are unavoidable.",
        "buy": "Show product plus minimal payment handoff, clean and object-dominant.",
        "sell": "Show product/cash exchange with seller/buyer implied, clean and minimal.",
        "pay": "Show card or phone tapping a payment terminal as one elegant transaction moment, no readable amount and no store clutter.",
        "spend": "Show money leaving wallet or card toward product, a clear outflow cue without document clutter.",
        "save": "Show money going into a piggy bank, jar, or envelope, clean and positive.",
        "cost": "Show product plus abstract value symbol or coins, not a price-label mess.",
        "charge": "Show a card/payment terminal or fee cue being applied, clear but not UI-heavy.",
        "borrow": "Show one hand receiving money/card/object with obligation cue, no contracts or readable text.",
        "lend": "Show money or object being offered from one person to another, with giver/receiver action clear and minimal.",
        "rent": "Show house key, object, or vehicle with payment card/envelope cue, no lease text.",
        "payment": "Show a clean card/phone/cash payment moment with terminal or receiving surface, no UI text.",
        "cheap": "Show low-cost cue through small coin/tag/minimal item, not readable text.",
        "expensive": "Show premium object plus high-value cue, coins/card/luxury light, no real price.",
        "free": "Show open hand/gift/product with zero-cost symbol or blank tag; avoid readable FREE text if possible.",
        "discount": "Use the Scout V2 direction: one product plus a bold discount tag or percent symbol, clean and iconic.",
        "sale": "Show product/tag with sale-like color cue, no readable word SALE.",
        "coupon": "Show coupon/ticket object with abstract marks, scissors or product cue, no readable text.",
        "bargain": "Show product with appealing tag/coins as a value-deal cue, no readable prices.",
        "tax": "Show receipt/document plus coins or official-feeling calculator cue, no readable tax form.",
        "tip": "Show coins or small bills being left beside a cup/plate/service tray, no receipt text.",
        "total": "Show a calculator/receipt/payment terminal with final-sum cue but no readable numbers.",
        "shopping cart": "Show cart as subject with a few simple products, not supermarket chaos.",
        "shopping basket": "Show basket as subject with simple products, object-dominant.",
        "checkout": "Show scanner/register/terminal plus bag or product in tight clean framing. It should read as checkout, not just payment.",
        "cash register": "Show register as object with drawer/payment cue, no readable display.",
        "display shelf": "Show a clean shelf with product arrangement, no brand labels.",
        "product": "Show one generic product/package object, no brand or label.",
        "item": "Show a single purchasable item as the subject with subtle tag/counter cue.",
        "package": "Show a clean box/package object with abstract label marks only, no tracking text.",
        "bank account": "Use secure folder, vault, card, or abstract account object, no fake online banking UI.",
        "savings account": "Show savings jar/piggy bank plus bank card or secure folder, with future-growth cue.",
        "checking account": "Show everyday payment/checkbook/card/account folder cue, no readable checks.",
        "ATM": "The ATM machine itself should dominate. Minimal or no person. It should read as ATM, not withdrawal.",
        "deposit": "Show money/card entering bank, ATM, or envelope, clearly distinct from withdrawal.",
        "withdrawal": "Show cash emerging from ATM or wallet handoff, clearly distinct from ATM object study.",
        "money transfer": "Show two wallets/devices/accounts with clean arrow/light path, no app UI.",
        "loan": "Show money handed with collateral/key/abstract obligation cue, no contract text.",
        "interest": "Show money growing subtly with percent-like symbol or coin stack, no formula/chart overload.",
        "online store": "Show device with abstract product-grid blocks plus shopping bag/cart object, no readable UI.",
        "shopping app": "Show phone with abstract product tiles/cart icon shape, no real app UI.",
        "online order": "Show parcel plus phone/laptop confirmation cue, no text.",
        "checkout page": "Show abstract checkout form/window plus card/parcel, no readable UI.",
        "delivery": "Use the Scout V2 direction: clean parcel handoff or doorstep package, minimal and clear.",
        "shipping": "Show parcel in transit with box/abstract label and truck or route cue, no logo.",
        "tracking number": "Show parcel plus abstract tracking dots/path, no readable number.",
        "return": "Show package with return-arrow cue or product going back, no label text.",
        "refund": "Show money/card returning toward customer with return-arrow cue, no UI.",
        "review": "Show product with star-like abstract rating objects, no readable review text.",
        "service": "Show a generic helpful interaction with tool or counter, not office stock.",
        "appointment": "Show calendar/time object plus meeting cue, no readable dates.",
        "repair service": "Show tool plus device/appliance being repaired, clean workbench.",
        "cleaning service": "Show cleaning tool/surface/glove/spray, no brand.",
        "laundry service": "Show folded clothes/laundry basket/service counter, no text.",
        "delivery service": "Show courier/package/vehicle silhouette, no logos.",
        "customer support": "Show headset support person plus one customer/device, clean, warm, not call-center clutter.",
        "help desk": "Show support counter with helpful gesture and device, no readable ticket UI.",
        "warranty": "Show product protected by shield/check cue and abstract warranty paper, no text.",
        "membership": "Show membership card/token with abstract marks plus access/club cue, no readable data.",
        "bill": "Show simple bill paper with abstract lines plus wallet/coins, no readable text.",
        "invoice": "Show invoice-like document with abstract rows plus stamp/check cue, no readable text.",
        "rent payment": "Show house key plus envelope/card/payment cue, no readable lease.",
        "electricity bill": "Use one bill object plus one electricity cue only: bill paper with abstract lines plus light bulb, power meter, or outlet. Avoid calculator, lamp, socket, meter, and desk clutter all together.",
        "water bill": "Show bill paper plus water tap, drop, or meter cue, no readable text.",
        "phone bill": "Show bill paper plus phone cue, no readable screen or bill text.",
        "internet bill": "Show bill paper plus router/Wi-Fi cue, no readable UI.",
        "service fee": "Show small fee/payment object plus service tool or counter cue.",
        "late fee": "Show payment object plus overdue/time cue, no readable notices.",
        "fine": "Show official-feeling penalty/payment cue with abstract paper and coins, no readable legal text.",
        "salary": "Show regular payment envelope/card plus calendar/payday cue, no text.",
        "wage": "Show hourly/work payment cue, time-clock-like object plus cash/card, no text.",
        "income": "Show money flowing into wallet, jar, or account-like object, positive inflow.",
        "budget": "Make planned allocation clear: several clean envelopes, jars, or sections with coins divided into groups; calculator optional. The idea is money divided into planned categories, not just saving.",
        "expense": "Show money leaving wallet/envelope toward bill or product, outflow cue.",
        "profit": "Show money/coins rising from product or business object, positive growth.",
        "loss": "Show coins falling, empty wallet, or downward cue, no disaster.",
        "investment": "Show money/seed/plant/growth metaphor, clean and premium.",
        "business": "Show a premium business object arrangement, product/sample plus payment/account cue, no handshake stock.",
        "contract": "Show contract-like paper with abstract lines plus pen/card/key cue, no readable legal text.",
        "exchange rate": "Show two generic currency stacks or coins with balanced arrows/exchange symbol, no real values.",
        "inflation": "Use the Scout V2 direction: basket/groceries plus rising price-tag/coin stacks/upward arrow, clean and iconic.",
        "debt": "Show heavy weight, chain, stacked bills, or coins owed, serious but not dark.",
        "mortgage": "Show house model or key plus document/payment stack, no readable contract.",
        "insurance": "Show protective umbrella/shield over house, car, or health object, clean and symbolic.",
        "premium": "Show high-value fee or premium-quality payment context carefully; if insurance sense, use protected object plus payment cue.",
        "pension": "Show retirement jar or older-adult hands with savings, future security cue, no documents.",
        "stock": "Show generic share certificate or abstract market token with rising/falling cue, no readable company data.",
        "bond": "Show certificate-like object or secured note with abstract seals and money cue, no readable text.",
    }
    return directions.get(spec.word, visual_route_note(spec))


def visual_route_note(spec: MoneySpec) -> str:
    route = subroute_for(spec.word)
    if route == "premium commerce object-study route":
        return f"Dominant object: {spec.word}. Treat it like a premium commerce still-life with one object or small object group, tactile texture, clean negative space, and no clutter."
    if route == "symbolic transaction/action scene":
        return f"Action/metaphor: one clean {spec.word} action using card, cash, phone, wallet, terminal, or handoff only when essential; keep surrounding context minimal."
    if route == "minimal retail interaction route":
        return f"Dominant cue: one retail object or interaction for {spec.word}; no aisle clutter, no readable prices, no product-label dependence."
    if route == "banking object/service route":
        return f"Dominant cue: modern banking object or physical service metaphor for {spec.word}; no fake banking UI, no logos, no readable account data."
    if route == "online shopping and delivery route":
        return f"Dominant cue: platform-neutral device/parcel/cart cue for {spec.word}; no fake app UI, no tracking text, no logos."
    if route == "services/support editorial interaction route":
        return f"Dominant cue: one clean service moment for {spec.word}; use people only if useful, avoid generic office stock."
    if route == "bills and household expenses route":
        return f"Dominant cue: one abstract bill/document plus one specific utility or payment cue for {spec.word}; no readable document text."
    if route == "personal/business finance route":
        return f"Dominant cue: clean symbolic finance object composition for {spec.word}; use envelopes, coins, calculator, arrows, or jars sparingly."
    return f"Dominant metaphor: one strong physical finance metaphor for {spec.word}; symbolic but not infographic-heavy."


def route_prompt_block(spec: MoneySpec) -> str:
    route = subroute_for(spec.word)
    emphasis = {
        "premium commerce object-study route": "One object or small object group dominates. Treat it like a premium editorial still-life with dramatic but clean light, tactile detail, and no clutter.",
        "symbolic transaction/action scene": "One clear action with minimal hands or people. Use terminal, wallet, card, cash, phone, or transfer cue. Keep framing tight and clean.",
        "minimal retail interaction route": "Clean retail cue with object/interaction dominance. No cluttered aisles, no readable prices, no product-label dependence.",
        "banking object/service route": "Modern banking object or symbolic service cue. Avoid fake online banking UI and bank logos. Use physical metaphors: card, vault, ATM, envelopes, coins, arrows.",
        "online shopping and delivery route": "Platform-neutral device plus parcel/cart cue. No fake UI text, no app logos. Parcel/product object should dominate when possible.",
        "services/support editorial interaction route": "One clean service moment. Avoid generic office person. Tool, headset, package, counter, or service object must clarify the service.",
        "bills and household expenses route": "One abstract document plus one specific household/utility cue. Keep it simple. No readable document text and no dense paperwork desk.",
        "personal/business finance route": "Clean symbolic finance object composition. Avoid random charts and coffee desks. Abstract finance should be physical and readable.",
        "advanced finance metaphor route": "One strong metaphor. More symbolic than documentary. No dense chart dashboards and no readable finance documents.",
    }[route]
    return (
        f"Subroute: {route}.\n"
        f"Prompt emphasis: {emphasis}\n"
        f"Per-word visual route note: {visual_route_note(spec)}\n"
        f"Word-specific direction: {word_specific_direction(spec)}\n"
    )


def build_prompt(spec: MoneySpec) -> str:
    return (
        f"Create a premium educational vocabulary image for the English word or phrase: {spec.word}.\n\n"
        "Category: Money, Shopping & Services.\n\n"
        f"The image must make the meaning of '{spec.word}' immediately readable without readable text, labels, captions, brand names, logos, real prices, readable receipts, readable invoices, account numbers, real barcodes, readable UI, watermarks, or personal data.\n\n"
        "Visual direction:\n"
        "A realistic premium symbolic commerce editorial image designed like a high-end language-learning card. Use one dominant commerce object, transaction action, service cue, bill cue, or financial metaphor. "
        "The composition should be clean, elegant, tactile, and immediately readable at thumbnail size.\n\n"
        "Use restrained symbolic cues only when necessary. Avoid overexplaining the concept with many props. The word should feel like a premium object or symbolic moment, not a documentation scene.\n\n"
        "Composition:\n"
        "Use one dominant visual idea. Keep the main subject large, clear, and iconic. Prefer object dominance, clean negative space, strong foreground/background separation, and elegant editorial staging. "
        "Use hands or people only when the action cannot be understood without them.\n\n"
        "Style:\n"
        "Realistic, premium, tactile, clean, modern, editorial, symbolic, educational, memorable.\n\n"
        "Realism:\n"
        "Use believable paper, coins, banknotes, wallets, cards, parcels, terminals, shelves, counters, envelopes, calculators, utility objects, devices, and household materials. "
        "Avoid plastic AI surfaces, fake glossy renders, impossible hands, over-smooth objects, random desk clutter, and generic stock-photo staging.\n\n"
        f"{route_prompt_block(spec)}\n"
        "Core V1.1 style rules:\n"
        "Prefer one strong object over many explanatory objects. If a word can be shown as an object, show it as an object. If a word is an action, show the action with minimal surrounding context. "
        "If a word is abstract, use one clean physical metaphor. Avoid random coffee cups, plants, lamps, loose office props, or decorative objects unless they directly support the word. "
        "Do not use five cues when one or two cues are enough. Make the object feel valuable, designed, staged, and memorable. Maintain Set C premium consistency with Fruits, Home & Objects, Music object portraits, and Body symbolic clarity.\n\n"
        "V1.1 refinement philosophy:\n"
        "The final production route should feel like commerce objects staged like premium vocabulary icons, not people doing realistic paperwork. When uncertain, choose the simplest iconic object, add one symbolic cue, and stop there.\n\n"
        "Avoid:\n"
        "too many props, too many people, cluttered desks, generic business stock photo, fake banking UI, readable documents, readable prices, readable account data, fake websites, corporate blue finance wallpaper, infographic overload, cartoon style, illustration style.\n\n"
        "Negative constraints: No readable text, no labels, no captions, no logos, no brand names, no real prices, no readable receipts, no readable invoices, no readable account numbers, no readable bank UI, no fake website UI, no personal data, no country-specific denomination dependence, no cluttered accounting desk, no random coffee cups, no too-many-props composition, no generic business handshake, no corporate finance stock photo, no blue finance wallpaper, no infographic overload, no cartoon, no illustration.\n"
    )


def custom_id_for(spec: MoneySpec) -> str:
    return f"{spec.category_id}_l{spec.level:02d}_{spec.word_id}"


def build_batch_line(spec: MoneySpec, *, model: str, quality: str, size: str, output_format: str) -> dict[str, Any]:
    return {
        "custom_id": custom_id_for(spec),
        "method": "POST",
        "url": ENDPOINT_LABEL,
        "body": {
            "model": model,
            "prompt": build_prompt(spec),
            "n": 1,
            "quality": quality,
            "size": size,
            "output_format": output_format,
        },
    }


def build_manifest(args: argparse.Namespace, output_dir: Path, specs: list[MoneySpec]) -> dict[str, Any]:
    levels = sorted({spec.level for spec in specs})
    return {
        "route_name": args.route_name,
        "set_id": args.set_id,
        "set_role": DEFAULT_SET_ROLE,
        "provider": "OpenAI Batch API",
        "endpoint": ENDPOINT_LABEL,
        "model": args.model,
        "quality": args.quality,
        "size": args.size,
        "aspect": "16:9",
        "output_format": args.output_format,
        "category": "Money, Shopping & Services",
        "category_id": "money_shopping_services",
        "source_category_file": normalize_path(CATEGORY_TS),
        "prompt_family": PROMPT_FAMILY,
        "source_style": "approved Scout V2 refined into v1.1 premium symbolic object commerce editorial",
        "scout_v2_reference_folder": normalize_path(SCOUT_V2_REFERENCE_FOLDER),
        "batch_input_file": normalize_path(output_dir / DEFAULT_BATCH_FILENAME),
        "batch_submit_file": normalize_path(output_dir / DEFAULT_SUBMIT_FILENAME),
        "batch_status_file": normalize_path(output_dir / DEFAULT_STATUS_FILENAME),
        "batch_submitted": False,
        "batch_materialized": False,
        "direct_live_calls": 0,
        "total_request_count": len(specs),
        "word_count": len(specs),
        "unique_word_count": len({spec.word_id for spec in specs}),
        "levels_covered": levels,
        "level_counts": {str(level): sum(1 for spec in specs if spec.level == level) for level in levels},
        "subroute_counts": {
            route: sum(1 for spec in specs if subroute_for(spec.word) == route)
            for route in sorted({subroute_for(spec.word) for spec in specs})
        },
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
        "queue_internals_touched": False,
        "requests": [
            {
                "custom_id": custom_id_for(spec),
                "word": spec.word,
                "word_id": spec.word_id,
                "level": spec.level,
                "level_label": spec.level_label,
                "part_of_speech": spec.part_of_speech,
                "subroute": subroute_for(spec.word),
                "visual_route_note": visual_route_note(spec),
                "prompt_hash": compute_prompt_hash(build_prompt(spec)),
                "batch_submitted": False,
            }
            for spec in specs
        ],
    }


def write_report(output_dir: Path, manifest: dict[str, Any], submit_payload: dict[str, Any] | None = None) -> None:
    submit_payload = submit_payload or {}
    lines = [
        "# Money, Shopping & Services Medium Batch Submit Report",
        "",
        "- category: Money, Shopping & Services",
        f"- route: `{manifest['route_name']}`",
        f"- set id: `{manifest['set_id']}`",
        "- why the route was approved: Scout V2 corrected Scout V1's clutter and moved the category toward clean symbolic commerce object editorials. The final route preserves V2 but adds stronger premium object dominance, cleaner budget/bill metaphors, more impressive cash/currency staging, and fewer props/people.",
        "- scout verdict: Scout V1 was too busy and documentation-heavy. Scout V2 is batch-ready at roughly 80%, with refinements needed around cash scale/presence, budget clarity, electricity bill simplicity, and reduced AI/plastic feel.",
        "- key production guardrails: one dominant object or interaction, minimal props, no document text, no fake UI, no cluttered desks, no real brands, no country-specific currency dependence, symbolic but not infographic-heavy.",
        f"- scout V2 reference folder: `{manifest['scout_v2_reference_folder']}`",
        f"- source category file: `{manifest['source_category_file']}`",
        f"- model/quality/size/output: `{manifest['model']}` / `{manifest['quality']}` / `{manifest['size']}` / `{manifest['output_format']}`",
        f"- endpoint: `{manifest['endpoint']}`",
        f"- number of requests: `{manifest['total_request_count']}`",
        f"- levels covered: `{', '.join(str(level) for level in manifest['levels_covered'])}`",
        f"- level counts: `{manifest['level_counts']}`",
        f"- subroute counts: `{manifest['subroute_counts']}`",
        f"- output folder: `{normalize_path(output_dir)}`",
        f"- batch input jsonl: `{manifest['batch_input_file']}`",
        f"- manifest: `{normalize_path(output_dir / DEFAULT_MANIFEST_FILENAME)}`",
        f"- batch_submit.json: `{normalize_path(output_dir / DEFAULT_SUBMIT_FILENAME)}`",
        f"- batch_status.json: `{normalize_path(output_dir / DEFAULT_STATUS_FILENAME)}`",
        f"- batch submitted: `{str(bool(submit_payload.get('batch_submitted'))).lower()}`",
        "- direct live medium generation: `false`",
        "- materialized outputs: `false`",
        "- frontend import: `false`",
        "- production app asset overwrite: `false`",
        "- no Supabase changes, no generation_jobs changes, no CardWorker changes, no submit_generation/request_word_retry changes, no pricing/credits changes, no backend architecture changes, no frontend import.",
        "",
        "## Batch Submission",
        "",
    ]
    if submit_payload:
        lines.extend(
            [
                f"- submitted at: `{submit_payload.get('submitted_at', '')}`",
                f"- input_file_id: `{submit_payload.get('input_file_id', '')}`",
                f"- batch id: `{submit_payload.get('batch_id', '')}`",
                f"- batch status: `{submit_payload.get('batch_status', '')}`",
                f"- upload request id: `{submit_payload.get('upload_response_headers_request_id', '')}`",
                f"- batch create request id: `{submit_payload.get('batch_create_response_headers_request_id', '')}`",
                f"- status request id: `{submit_payload.get('latest_status_response_headers_request_id', '')}`",
            ]
        )
    else:
        lines.append("- not submitted")
    lines.extend(["", "## Words", ""])
    current_level = None
    for request in manifest["requests"]:
        if current_level != request["level"]:
            current_level = request["level"]
            words = [row["word"] for row in manifest["requests"] if row["level"] == current_level]
            lines.append(f"- Level {current_level} - {request['level_label']}: {', '.join(words)}")
    (output_dir / DEFAULT_REPORT_FILENAME).write_text("\n".join(lines) + "\n", encoding="utf-8")


def output_dir_for(args: argparse.Namespace, run_slug: str) -> Path:
    folder_name = f"{args.route_name}_{run_slug}"
    if args.out_root:
        return Path(args.out_root) / folder_name
    return DEFAULT_BATCH_ROOT / folder_name


def ensure_new_output_dir(output_dir: Path) -> None:
    if output_dir.exists() and any(output_dir.iterdir()):
        raise SystemExit(f"Output folder already exists and is not empty: {output_dir}")
    output_dir.mkdir(parents=True, exist_ok=True)


def prepare_batch(args: argparse.Namespace, output_dir: Path) -> dict[str, Any]:
    if not SCOUT_V2_REFERENCE_FOLDER.exists():
        raise RuntimeError(f"Missing Money, Shopping & Services Scout V2 reference folder: {SCOUT_V2_REFERENCE_FOLDER}")
    specs = build_specs()
    with (output_dir / DEFAULT_BATCH_FILENAME).open("w", encoding="utf-8", newline="\n") as handle:
        for spec in specs:
            handle.write(json.dumps(build_batch_line(spec, model=args.model, quality=args.quality, size=args.size, output_format=args.output_format), ensure_ascii=False) + "\n")
    manifest = build_manifest(args, output_dir, specs)
    write_json(output_dir / DEFAULT_MANIFEST_FILENAME, manifest)
    write_report(output_dir, manifest)
    return manifest


def openai_client() -> httpx.Client:
    verify: str | bool = str(LOCAL_CA_BUNDLE) if LOCAL_CA_BUNDLE.exists() else True
    return httpx.Client(timeout=300.0, verify=verify)


def submit_batch(args: argparse.Namespace, output_dir: Path, manifest: dict[str, Any]) -> dict[str, Any]:
    api_key = os.environ.get("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("OPENAI_API_KEY is not set. Refusing to submit OpenAI Batch.")
    submit_start = {
        "started_at": now_iso(),
        "route_name": args.route_name,
        "set_id": args.set_id,
        "api_mode": "OpenAI Batch API",
        "batch_input_file": manifest["batch_input_file"],
        "materialize_after_submit": False,
        "direct_live_calls": 0,
        "production_import": False,
        "frontend_wiring": False,
    }
    write_json(output_dir / "batch_submit_start.json", submit_start)
    headers = {"Authorization": f"Bearer {api_key}"}
    with openai_client() as client:
        with (output_dir / DEFAULT_BATCH_FILENAME).open("rb") as batch_file:
            upload_response = client.post(
                OPENAI_FILES_ENDPOINT,
                headers=headers,
                data={"purpose": "batch"},
                files={"file": (DEFAULT_BATCH_FILENAME, batch_file, "application/jsonl")},
            )
        upload_request_id = upload_response.headers.get("x-request-id", "")
        if upload_response.status_code >= 400:
            raise RuntimeError(f"OpenAI file upload failed status={upload_response.status_code} request_id={upload_request_id}: {upload_response.text[:2000]}")
        upload_json = upload_response.json()
        input_file_id = upload_json["id"]
        create_payload = {
            "input_file_id": input_file_id,
            "endpoint": ENDPOINT_LABEL,
            "completion_window": "24h",
            "metadata": {
                "route_name": args.route_name,
                "set_id": args.set_id,
                "category_id": "money_shopping_services",
                "quality": args.quality,
                "source": "ResonanceTEST Money, Shopping & Services Set C v1.1 batch manifest",
            },
        }
        create_response = client.post(OPENAI_BATCHES_ENDPOINT, headers={**headers, "Content-Type": "application/json"}, json=create_payload)
        create_request_id = create_response.headers.get("x-request-id", "")
        if create_response.status_code >= 400:
            raise RuntimeError(f"OpenAI batch create failed status={create_response.status_code} request_id={create_request_id}: {create_response.text[:2000]}")
        create_json = create_response.json()
        batch_id = create_json["id"]
        status_response = client.get(f"{OPENAI_BATCHES_ENDPOINT}/{batch_id}", headers=headers)
        status_request_id = status_response.headers.get("x-request-id", "")
        if status_response.status_code >= 400:
            raise RuntimeError(f"OpenAI batch status failed status={status_response.status_code} request_id={status_request_id}: {status_response.text[:2000]}")
        status_json = status_response.json()
    submit_payload = {
        "created_at": submit_start["started_at"],
        "submitted_at": now_iso(),
        "request": create_payload,
        "batch_submitted": True,
        "upload_attempted": True,
        "batch_create_attempted": True,
        "endpoint": ENDPOINT_LABEL,
        "completion_window": "24h",
        "upload_status_code": upload_response.status_code,
        "upload_response_headers_request_id": upload_request_id,
        "upload_response": upload_json,
        "input_file_id": input_file_id,
        "batch_create_status_code": create_response.status_code,
        "batch_create_response_headers_request_id": create_request_id,
        "batch_create_response": create_json,
        "batch_id": batch_id,
        "batch_status": create_json.get("status", ""),
        "latest_status_http_status": status_response.status_code,
        "latest_status_response_headers_request_id": status_request_id,
        "latest_status_response": status_json,
        "output_file_id": status_json.get("output_file_id"),
        "error_file_id": status_json.get("error_file_id"),
        "request_counts": status_json.get("request_counts"),
        "final_status": "BATCH_SUBMITTED",
        "ended_at": now_iso(),
        "materialized": False,
        "direct_live_calls": 0,
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
        "queue_internals_touched": False,
    }
    write_json(output_dir / DEFAULT_SUBMIT_FILENAME, submit_payload)
    write_json(output_dir / DEFAULT_STATUS_FILENAME, status_json)
    manifest["batch_submitted"] = True
    manifest["batch_materialized"] = False
    manifest["input_file_id"] = input_file_id
    manifest["batch_id"] = batch_id
    manifest["batch_status"] = create_json.get("status", "")
    manifest["latest_batch_status"] = status_json.get("status", "")
    manifest["output_file_id"] = status_json.get("output_file_id")
    manifest["error_file_id"] = status_json.get("error_file_id")
    manifest["request_counts"] = status_json.get("request_counts")
    for request in manifest["requests"]:
        request["batch_submitted"] = True
    write_json(output_dir / DEFAULT_MANIFEST_FILENAME, manifest)
    write_report(output_dir, manifest, submit_payload)
    return submit_payload


def validate_prepared_folder(output_dir: Path, manifest: dict[str, Any]) -> None:
    lines = (output_dir / DEFAULT_BATCH_FILENAME).read_text(encoding="utf-8").splitlines()
    if len(lines) != manifest["word_count"]:
        raise RuntimeError(f"{output_dir}: expected {manifest['word_count']} JSONL lines, found {len(lines)}")
    if manifest["word_count"] != 100 or manifest["unique_word_count"] != 100:
        raise RuntimeError(f"{output_dir}: expected 100 unique words")
    for index, line in enumerate(lines, 1):
        row = json.loads(line)
        if row.get("method") != "POST" or row.get("url") != ENDPOINT_LABEL:
            raise RuntimeError(f"{output_dir}: invalid method/url on line {index}")
        body = row.get("body", {})
        expected = {"model": DEFAULT_MODEL, "quality": DEFAULT_QUALITY, "size": DEFAULT_SIZE, "output_format": DEFAULT_OUTPUT_FORMAT}
        for key, value in expected.items():
            if body.get(key) != value:
                raise RuntimeError(f"{output_dir}: line {index} {key}={body.get(key)!r}, expected {value!r}")
        prompt = body.get("prompt", "")
        if "Category: Money, Shopping & Services." not in prompt or "Negative constraints:" not in prompt:
            raise RuntimeError(f"{output_dir}: line {index} missing prompt contract")
        if "premium symbolic commerce editorial" not in prompt or "one dominant visual idea" not in prompt.lower():
            raise RuntimeError(f"{output_dir}: line {index} missing route style contract")


def parse_args(argv: list[str]) -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Prepare and submit the Money, Shopping & Services Set C medium OpenAI Batch run.")
    parser.add_argument("--submit", action="store_true")
    parser.add_argument("--prepare-only", action="store_true")
    parser.add_argument("--provider", default="openai")
    parser.add_argument("--model", default=DEFAULT_MODEL)
    parser.add_argument("--quality", default=DEFAULT_QUALITY)
    parser.add_argument("--size", default=DEFAULT_SIZE)
    parser.add_argument("--output-format", default=DEFAULT_OUTPUT_FORMAT)
    parser.add_argument("--route-name", default=DEFAULT_ROUTE_NAME)
    parser.add_argument("--set-id", default=DEFAULT_SET_ID)
    parser.add_argument("--out-root", default="")
    return parser.parse_args(argv)


def main(argv: list[str] | None = None) -> int:
    args = parse_args(argv or sys.argv[1:])
    if args.submit == args.prepare_only:
        raise SystemExit("Choose exactly one of --submit or --prepare-only.")
    if args.provider != "openai":
        raise SystemExit("--provider must be openai.")
    if args.model != DEFAULT_MODEL or args.quality != DEFAULT_QUALITY or args.size != DEFAULT_SIZE or args.output_format != DEFAULT_OUTPUT_FORMAT:
        raise SystemExit("This run must use gpt-image-2 medium 1680x944 png.")
    if args.route_name != DEFAULT_ROUTE_NAME:
        raise SystemExit(f"--route-name must be {DEFAULT_ROUTE_NAME}.")
    loaded_env_files_count = load_local_env() if args.submit else 0
    output_dir = output_dir_for(args, timestamp_slug())
    ensure_new_output_dir(output_dir)
    manifest = prepare_batch(args, output_dir)
    validate_prepared_folder(output_dir, manifest)
    submit_payload = submit_batch(args, output_dir, manifest) if args.submit else None
    result = {
        "loaded_env_files_count": loaded_env_files_count,
        "direct_live_calls": 0,
        "materialized": False,
        "output_folder": normalize_path(output_dir),
        "batch_input_jsonl": normalize_path(output_dir / DEFAULT_BATCH_FILENAME),
        "manifest": normalize_path(output_dir / DEFAULT_MANIFEST_FILENAME),
        "batch_submit": normalize_path(output_dir / DEFAULT_SUBMIT_FILENAME),
        "report": normalize_path(output_dir / DEFAULT_REPORT_FILENAME),
        "word_count": manifest["word_count"],
        "batch_submitted": bool(submit_payload),
        "input_file_id": submit_payload.get("input_file_id") if submit_payload else None,
        "batch_id": submit_payload.get("batch_id") if submit_payload else None,
        "batch_status": submit_payload.get("batch_status") if submit_payload else None,
        "latest_batch_status": submit_payload.get("latest_status_response", {}).get("status") if submit_payload else None,
    }
    print(json.dumps(result, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
