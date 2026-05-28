from __future__ import annotations

import hashlib
import importlib.util
import sys
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "generate_setc_money_shopping_services_scout_v2.py"


def load_script_module():
    spec = importlib.util.spec_from_file_location("generate_setc_money_shopping_services_scout_v2", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_word_specs_match_requested_scout_words() -> None:
    script = load_script_module()

    assert [spec.word for spec in script.WORD_SPECS] == [
        "cash",
        "pay",
        "discount",
        "checkout",
        "ATM",
        "delivery",
        "customer support",
        "electricity bill",
        "budget",
        "inflation",
    ]
    assert script.LIVE_CALL_COUNT == 10


def test_route_contract_uses_low_openai_direct_not_batch() -> None:
    script = load_script_module()

    assert script.DEFAULT_ROUTE_NAME == "money_shopping_services_scout_v2_symbolic_object_commerce_editorial"
    assert script.DEFAULT_MODEL == "gpt-image-2"
    assert script.DEFAULT_QUALITY == "low"
    assert script.DEFAULT_SIZE == "1680x944"
    assert script.DEFAULT_OUTPUT_FORMAT == "png"
    assert script.ENDPOINT_LABEL == "/v1/images/generations"


def test_prompt_uses_money_shopping_route_constraints() -> None:
    script = load_script_module()
    prompt = script.build_prompt(script.WORD_SPECS[7])

    assert "English word or phrase: electricity bill" in prompt
    assert "Category: Money, Shopping & Services." in prompt
    assert "premium symbolic commerce editorial image" in prompt
    assert "premium commerce object-study" in prompt
    assert "electric meter, light bulb, or power outlet" in prompt
    assert "without readable text" in prompt
    assert "readable invoices" in prompt
    assert "too many props" in prompt
    assert "infographic overload" in prompt


def test_metadata_contract(tmp_path: Path) -> None:
    script = load_script_module()
    spec = script.WORD_SPECS[6]
    prompt = script.build_prompt(spec)

    meta = script.build_metadata(
        spec=spec,
        prompt=prompt,
        output_dir=tmp_path,
        request_id="req_test_123",
        created_at="2026-05-28T12:00:00+08:00",
        route_name=script.DEFAULT_ROUTE_NAME,
        set_id=script.DEFAULT_SET_ID,
        model=script.DEFAULT_MODEL,
        quality=script.DEFAULT_QUALITY,
        size=script.DEFAULT_SIZE,
        output_format=script.DEFAULT_OUTPUT_FORMAT,
    )

    assert meta["word"] == "customer support"
    assert meta["word_id"] == "customer-support"
    assert meta["category_id"] == "money_shopping_services"
    assert meta["provider"] == "OpenAI direct"
    assert meta["endpoint"] == "/v1/images/generations"
    assert meta["model"] == "gpt-image-2"
    assert meta["quality"] == "low"
    assert meta["size"] == "1680x944"
    assert meta["output_format"] == "png"
    assert meta["prompt_hash"] == hashlib.sha256(prompt.encode("utf-8")).hexdigest()
    assert meta["recommendation"] == "candidate"
