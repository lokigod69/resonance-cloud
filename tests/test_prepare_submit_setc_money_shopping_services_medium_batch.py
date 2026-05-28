from __future__ import annotations

import importlib.util
import json
import sys
from pathlib import Path


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "prepare_submit_setc_money_shopping_services_medium_batch.py"


def load_script_module():
    spec = importlib.util.spec_from_file_location("prepare_submit_setc_money_shopping_services_medium_batch", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_money_specs_cover_approved_static_category() -> None:
    script = load_script_module()

    specs = script.build_specs()

    assert len(specs) == 100
    assert specs[0].word == "money"
    assert specs[-1].word == "bond"
    assert {item.level for item in specs} == set(range(1, 11))
    assert len({item.word_id for item in specs}) == 100
    assert next(item for item in specs if item.word == "cheap").part_of_speech == "adjective"
    assert next(item for item in specs if item.word == "discount").part_of_speech == "noun"


def test_prompts_use_money_shopping_v1_1_routes() -> None:
    script = load_script_module()
    specs = script.build_specs()

    cash = next(item for item in specs if item.word == "cash")
    pay = next(item for item in specs if item.word == "pay")
    checkout = next(item for item in specs if item.word == "checkout")
    electricity_bill = next(item for item in specs if item.word == "electricity bill")
    budget = next(item for item in specs if item.word == "budget")
    inflation = next(item for item in specs if item.word == "inflation")

    cash_prompt = script.build_prompt(cash)
    pay_prompt = script.build_prompt(pay)
    checkout_prompt = script.build_prompt(checkout)
    electricity_prompt = script.build_prompt(electricity_bill)
    budget_prompt = script.build_prompt(budget)
    inflation_prompt = script.build_prompt(inflation)

    assert "premium symbolic commerce editorial" in cash_prompt
    assert "premium commerce object-study route" in cash_prompt
    assert "stacked generic banknotes" in cash_prompt
    assert "symbolic transaction/action scene" in pay_prompt
    assert "card or phone tapping a payment terminal" in pay_prompt
    assert "minimal retail interaction route" in checkout_prompt
    assert "scanner/register/terminal" in checkout_prompt
    assert "bills and household expenses route" in electricity_prompt
    assert "one bill object plus one electricity cue only" in electricity_prompt
    assert "personal/business finance route" in budget_prompt
    assert "money divided into planned categories" in budget_prompt
    assert "advanced finance metaphor route" in inflation_prompt
    assert "rising price-tag/coin stacks/upward arrow" in inflation_prompt


def test_prepare_batch_writes_100_jsonl_lines(tmp_path: Path) -> None:
    script = load_script_module()
    args = script.parse_args(["--prepare-only", "--out-root", str(tmp_path)])
    out = tmp_path / "money"
    out.mkdir()

    manifest = script.prepare_batch(args, out)
    script.validate_prepared_folder(out, manifest)

    lines = (out / "batch_input.jsonl").read_text(encoding="utf-8").splitlines()
    assert len(lines) == 100
    first = json.loads(lines[0])
    assert first["custom_id"] == "money_shopping_services_l01_money"
    assert first["method"] == "POST"
    assert first["url"] == "/v1/images/generations"
    assert first["body"]["model"] == "gpt-image-2"
    assert first["body"]["quality"] == "medium"
    assert first["body"]["size"] == "1680x944"
    assert first["body"]["output_format"] == "png"
    assert manifest["route_name"] == "money_shopping_services_v1_1_premium_symbolic_object_commerce_editorial"
    assert manifest["set_id"] == "en_setC_money_shopping_services_medium_v1"
    assert manifest["batch_submitted"] is False
    assert manifest["batch_materialized"] is False
    assert manifest["direct_live_calls"] == 0
    assert manifest["category_id"] == "money_shopping_services"
    assert "visual_route_note" in manifest["requests"][0]
