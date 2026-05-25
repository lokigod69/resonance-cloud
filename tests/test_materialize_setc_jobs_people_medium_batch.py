from __future__ import annotations

import base64
import importlib.util
import json
import sys
from io import BytesIO
from pathlib import Path

from PIL import Image


SCRIPT_PATH = Path(__file__).resolve().parents[1] / "scripts" / "materialize_setc_jobs_people_medium_batch.py"


def load_script_module():
    spec = importlib.util.spec_from_file_location("materialize_setc_jobs_people_medium_batch", SCRIPT_PATH)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    sys.modules[spec.name] = module
    spec.loader.exec_module(module)
    return module


def test_decode_image_from_body_accepts_b64_png() -> None:
    script = load_script_module()
    buffer = BytesIO()
    Image.new("RGB", (4, 3), "#332211").save(buffer, format="PNG")
    body = {"data": [{"b64_json": base64.b64encode(buffer.getvalue()).decode("ascii")}]}

    image_bytes = script.decode_image_from_body(body)

    with Image.open(BytesIO(image_bytes)) as image:
        assert image.format == "PNG"
        assert image.size == (4, 3)


def test_planned_records_read_existing_jobs_batch() -> None:
    script = load_script_module()
    batch_dir = Path(r"D:\CODING\ResonanceTEST\curriculum\batch_runs\en\jobs_people_v1_1_contextual_role_portrait_2026_05_25_151305")

    records = script.load_planned_records(batch_dir)

    assert len(records) == 100
    assert records["jobs_people_l01_person"]["word"] == "person"
    assert records["jobs_people_l10_poet"]["word"] == "poet"
    assert records["jobs_people_l08_judge"]["subroute"] == "business, law, and public roles"
    assert records["jobs_people_l01_person"]["prompt_hash"]


def test_materialized_output_folder_uses_route_and_submit_timestamp() -> None:
    script = load_script_module()
    batch_dir = Path(r"D:\CODING\ResonanceTEST\curriculum\batch_runs\en\jobs_people_v1_1_contextual_role_portrait_2026_05_25_151305")

    out = script.default_output_dir(batch_dir)

    assert out.name == "jobs_people_v1_1_contextual_role_portrait_materialized_medium_batch_2026_05_25_151305"
    assert out.parent == Path(r"D:\CODING\ResonanceTEST\curriculum\test_renders\en")


def test_materialize_writes_jobs_people_metadata(tmp_path: Path) -> None:
    script = load_script_module()
    batch_dir = tmp_path / "batch"
    out_dir = tmp_path / "out"
    batch_dir.mkdir()
    prompt = "Create a premium educational vocabulary image for the English word or phrase: teacher.\n"
    prompt_hash = script.prompt_hash(prompt)
    manifest = {
        "route_name": "jobs_people_v1_1_contextual_role_portrait",
        "set_id": "en_setC_jobs_people_medium_v1",
        "model": "gpt-image-2",
        "quality": "medium",
        "size": "1680x944",
        "output_format": "png",
        "prompt_family": "test family",
        "batch_id": "batch_test",
        "input_file_id": "file_input",
        "requests": [
            {
                "custom_id": "jobs_people_l03_teacher",
                "word": "teacher",
                "word_id": "teacher",
                "level": 3,
                "level_label": "Education and learning roles",
                "part_of_speech": "noun",
                "subroute": "education and learning roles",
                "prompt_hash": prompt_hash,
            }
        ],
    }
    (batch_dir / "manifest.json").write_text(json.dumps(manifest), encoding="utf-8")
    batch_line = {
        "custom_id": "jobs_people_l03_teacher",
        "method": "POST",
        "url": "/v1/images/generations",
        "body": {"model": "gpt-image-2", "prompt": prompt, "quality": "medium", "size": "1680x944", "output_format": "png"},
    }
    (batch_dir / "batch_input.jsonl").write_text(json.dumps(batch_line) + "\n", encoding="utf-8")
    buffer = BytesIO()
    Image.new("RGB", (1680, 944), "#332211").save(buffer, format="PNG")
    output_line = {
        "id": "batch_req_test",
        "custom_id": "jobs_people_l03_teacher",
        "response": {
            "status_code": 200,
            "request_id": "req_test",
            "body": {"data": [{"b64_json": base64.b64encode(buffer.getvalue()).decode("ascii")}]},
        },
    }

    def fake_download_file(_file_id: str, target: Path, _api_key: str) -> None:
        target.write_text(json.dumps(output_line) + "\n", encoding="utf-8")

    script.download_file = fake_download_file

    result = script.materialize(
        batch_dir,
        out_dir,
        {"status": "completed", "output_file_id": "file_output", "error_file_id": None, "request_counts": {"total": 1, "completed": 1, "failed": 0}},
        "test-key",
    )

    meta = json.loads((out_dir / "teacher.meta.json").read_text(encoding="utf-8"))
    assert result["materialized"] is True
    assert result["images_materialized"] == 1
    assert meta["category_id"] == "jobs_people"
    assert meta["set_role"] == "production_candidate_jobs_people_materialized"
    assert meta["prompt_hash"] == prompt_hash
