from __future__ import annotations

import argparse
import base64
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from dataclasses import dataclass
from datetime import datetime, timezone
from io import BytesIO
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

import httpx
from PIL import Image


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = REPO_ROOT.parent
CURRICULUM_PATH = WORKSPACE_ROOT / "curriculum" / "content" / "en" / "familie_beziehungen.json"
ENRICHMENT_DIR = WORKSPACE_ROOT / "curriculum" / "content" / "en" / "enrichment"
ENRICHMENT_PATH = ENRICHMENT_DIR / "familie_beziehungen.json"
ENRICHMENT_README_PATH = ENRICHMENT_DIR / "README.md"
ASSET_ROOT = REPO_ROOT / "frontend" / "public" / "curriculum" / "categories" / "en" / "familie_beziehungen"
ENTRY_ASSET_DIR = ASSET_ROOT / "entries"

OPENROUTER_MODEL = os.environ.get("PILOT_ASSET_LLM_MODEL", "deepseek/deepseek-chat-v3-0324")
OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions"
OPENAI_IMAGE_ENDPOINT = "https://api.openai.com/v1/images/generations"
OPENAI_IMAGE_MODEL = os.environ.get("PILOT_ASSET_OPENAI_IMAGE_MODEL", "gpt-image-1-mini")
OPENAI_IMAGE_QUALITY = os.environ.get("PILOT_ASSET_OPENAI_IMAGE_QUALITY", "low")
KIE_PROVIDER_MODEL_LABEL = "gpt_image_2"
KIE_COST_PER_IMAGE_USD = 0.050
OPENAI_IMAGE_OUTPUT_USD_PER_1M = float(os.environ.get("PILOT_ASSET_OPENAI_IMAGE_OUTPUT_USD_PER_1M", "30.0"))
OPENAI_TEXT_INPUT_USD_PER_1M = float(os.environ.get("PILOT_ASSET_OPENAI_TEXT_INPUT_USD_PER_1M", "5.0"))
MAX_WEBP_BYTES = 600_000
CURL_EXE = shutil.which("curl.exe") or shutil.which("curl")
HTTP_BACKEND = os.environ.get("PILOT_ASSET_HTTP_BACKEND", "curl" if os.name == "nt" and CURL_EXE else "httpx")
KIE_API_BASE = "https://api.kie.ai/api/v1"
KIE_POLL_INTERVAL_SECONDS = 5.0
KIE_MAX_POLL_SECONDS = 180.0


@dataclass(frozen=True)
class Entry:
    entry_id: str
    term: str
    pos: str
    gloss_de: str
    id_source: str


@dataclass
class CostTracker:
    image_calls: int = 0
    image_cost_usd: float = 0.0
    llm_calls: int = 0
    llm_cost_usd: float = 0.0
    llm_prompt_tokens: int = 0
    llm_completion_tokens: int = 0


def load_dotenv(path: Path) -> None:
    if not path.exists():
        return
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        key = key.strip()
        if not key or key in os.environ:
            continue
        value = value.strip().strip('"').strip("'")
        os.environ[key] = value


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Generate Familie & Beziehungen Level 1 pilot images and enrichment."
    )
    parser.add_argument("--force", action="store_true", help="Regenerate existing target files.")
    parser.add_argument(
        "--image-provider",
        choices=("auto", "openai", "kie"),
        default="auto",
        help="Use direct OpenAI Images when available, or the existing KIE GPT Image provider.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Validate curriculum, paths, and environment without making provider calls or writing outputs.",
    )
    return parser.parse_args()


def load_level_one_entries() -> tuple[dict[str, Any], list[Entry], list[str]]:
    data = json.loads(CURRICULUM_PATH.read_text(encoding="utf-8"))
    levels = data.get("levels")
    if not isinstance(levels, list):
        raise ValueError("Curriculum JSON has no levels array.")
    level_one = next((level for level in levels if level.get("level") == 1), None)
    if level_one is None:
        raise ValueError("Curriculum JSON has no Level 1.")
    raw_entries = level_one.get("entries")
    if not isinstance(raw_entries, list):
        raise ValueError("Curriculum Level 1 has no entries array.")

    warnings: list[str] = []
    entries: list[Entry] = []
    seen: set[str] = set()
    for index, raw in enumerate(raw_entries, start=1):
        if not isinstance(raw, dict):
            raise ValueError(f"Level 1 entry {index} is not an object.")
        term = require_string(raw, "term", f"entry {index}")
        pos = require_string(raw, "pos", f"entry {index}")
        glosses = raw.get("glosses")
        if not isinstance(glosses, dict):
            raise ValueError(f"Level 1 entry {term!r} has no glosses object.")
        gloss_de = require_string(glosses, "de", f"entry {term!r}.glosses")
        if isinstance(raw.get("id"), str) and raw["id"].strip():
            entry_id = raw["id"].strip()
            id_source = "id"
        else:
            entry_id = term
            id_source = "term_fallback"
            warnings.append(
                f"Entry {term!r} has no id field in live curriculum; using raw term as pilot entry key."
            )
        if entry_id in seen:
            raise ValueError(f"Duplicate Level 1 entry key {entry_id!r}.")
        seen.add(entry_id)
        entries.append(Entry(entry_id=entry_id, term=term, pos=pos, gloss_de=gloss_de, id_source=id_source))
    return data, entries, warnings


def require_string(mapping: dict[str, Any], key: str, label: str) -> str:
    value = mapping.get(key)
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{label} is missing non-empty {key!r}.")
    return value.strip()


def choose_image_provider(requested: str) -> str:
    if requested == "openai":
        if not os.environ.get("OPENAI_API_KEY"):
            raise RuntimeError("OPENAI_API_KEY is required for --image-provider openai.")
        return "openai"
    if requested == "kie":
        if not os.environ.get("KIE_API_KEY"):
            raise RuntimeError("KIE_API_KEY is required for --image-provider kie.")
        return "kie"
    if os.environ.get("OPENAI_API_KEY"):
        return "openai"
    if os.environ.get("KIE_API_KEY"):
        return "kie"
    raise RuntimeError("No image API key found. Set OPENAI_API_KEY or KIE_API_KEY.")


def openrouter_json(prompt: str, cost: CostTracker, max_tokens: int = 2400) -> dict[str, Any]:
    api_key = os.environ.get("OPENROUTER_API_KEY", "")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY is required for prompt/enrichment generation.")
    payload = {
        "model": OPENROUTER_MODEL,
        "messages": [{"role": "user", "content": prompt}],
        "max_tokens": max_tokens,
        "temperature": 0.4,
        "response_format": {"type": "json_object"},
    }
    data = post_json(
        OPENROUTER_ENDPOINT,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        payload=payload,
        timeout=90.0,
        label="OpenRouter",
    )
    choices = data.get("choices")
    if not choices:
        raise RuntimeError(f"OpenRouter returned no choices: {json.dumps(data)[:1000]}")
    content = choices[0].get("message", {}).get("content", "")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError("OpenRouter returned empty content.")
    usage = data.get("usage") or {}
    prompt_tokens = int(usage.get("prompt_tokens") or 0)
    completion_tokens = int(usage.get("completion_tokens") or 0)
    cost.llm_calls += 1
    cost.llm_prompt_tokens += prompt_tokens
    cost.llm_completion_tokens += completion_tokens
    if isinstance(usage.get("cost"), (int, float)):
        cost.llm_cost_usd += float(usage["cost"])
    parsed = parse_json_object(content)
    if not isinstance(parsed, dict):
        raise RuntimeError("OpenRouter content was not a JSON object.")
    return parsed


def parse_json_object(text: str) -> Any:
    stripped = text.strip()
    if stripped.startswith("```"):
        stripped = stripped.strip("`")
        if stripped.lower().startswith("json"):
            stripped = stripped[4:].strip()
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        start = stripped.find("{")
        end = stripped.rfind("}")
        if start == -1 or end == -1 or end <= start:
            raise
        return json.loads(stripped[start : end + 1])


def build_generation_prompt(entries: list[Entry]) -> str:
    entry_payload = [
        {"id": entry.entry_id, "term": entry.term, "gloss_de": entry.gloss_de, "pos": entry.pos}
        for entry in entries
    ]
    return f"""
You are writing image prompts for a language-learning curriculum pilot.
Return only valid JSON, no markdown.

Task:
- Write one final image prompt for each Level 1 entry.
- Write one category hero image prompt for Familie & Beziehungen.
- The prompts are for warm cinematic lifestyle photography.

Entry image requirements:
- 16:9 landscape frame, filled meaningfully.
- Environmental and relational composition, not centered single-subject portraits.
- No visible text, no signage, no logos, no watermarks, no recognizable real people.
- Warm domestic or outdoor scene, soft natural light, shallow depth of field, neutral domestic palette.
- Father/mother: parent-with-child moment where the role is visible through interaction.
- Son/daughter: child-with-parent moment from the child's framing.
- Brother/sister: two siblings interacting, age-appropriate, warm and casual.

Hero requirements:
- 4:5 portrait-friendly category tile mood image.
- Broader editorial family scene than any single entry, evocative and warm, not literal vocabulary labeling.
- Same visual tone and constraints.

Entries:
{json.dumps(entry_payload, ensure_ascii=False, indent=2)}

Return this shape exactly:
{{
  "entry_prompts": {{
    "<entry id>": "prompt string"
  }},
  "hero_prompt": "prompt string"
}}
""".strip()


def build_enrichment_prompt(entries: list[Entry]) -> str:
    entry_payload = [
        {"id": entry.entry_id, "term": entry.term, "gloss_de": entry.gloss_de, "pos": entry.pos}
        for entry in entries
    ]
    return f"""
You create concise enrichment metadata for German-speaking learners studying English.
Return only valid JSON, no markdown.

Rules:
- Generate enrichment only for the provided Level 1 entries.
- mnemonic is one short German sentence that helps remember the English word.
- etymology is one concise factual English sentence about the English word origin.
- usage_example.target is a short natural English sentence using the exact term.
- usage_example.base is a German translation of the example sentence.
- Avoid fake etymology. If the origin is complex, keep the sentence conservative.

Entries:
{json.dumps(entry_payload, ensure_ascii=False, indent=2)}

Return this shape exactly:
{{
  "entries": {{
    "<entry id>": {{
      "mnemonic": "German sentence.",
      "etymology": "English sentence.",
      "usage_example": {{
        "target": "English sentence.",
        "base": "German translation."
      }}
    }}
  }}
}}
""".strip()


def validate_prompt_payload(payload: dict[str, Any], entries: list[Entry]) -> tuple[dict[str, str], str]:
    expected_ids = {entry.entry_id for entry in entries}
    prompts = payload.get("entry_prompts")
    hero_prompt = payload.get("hero_prompt")
    if not isinstance(prompts, dict):
        raise ValueError("Prompt payload missing entry_prompts object.")
    if not isinstance(hero_prompt, str) or not hero_prompt.strip():
        raise ValueError("Prompt payload missing hero_prompt string.")
    if set(prompts) != expected_ids:
        raise ValueError(f"Prompt IDs mismatch. expected={sorted(expected_ids)} actual={sorted(prompts)}")
    cleaned: dict[str, str] = {}
    for entry_id, prompt in prompts.items():
        if not isinstance(prompt, str) or len(prompt.strip()) < 40:
            raise ValueError(f"Prompt for {entry_id!r} is missing or too short.")
        cleaned[entry_id] = prompt.strip()
    return cleaned, hero_prompt.strip()


def validate_enrichment_payload(payload: dict[str, Any], entries: list[Entry]) -> dict[str, Any]:
    expected_ids = {entry.entry_id for entry in entries}
    raw_entries = payload.get("entries")
    if not isinstance(raw_entries, dict):
        raise ValueError("Enrichment payload missing entries object.")
    if set(raw_entries) != expected_ids:
        raise ValueError(f"Enrichment IDs mismatch. expected={sorted(expected_ids)} actual={sorted(raw_entries)}")
    cleaned: dict[str, Any] = {}
    for entry in entries:
        raw = raw_entries[entry.entry_id]
        if not isinstance(raw, dict):
            raise ValueError(f"Enrichment for {entry.entry_id!r} is not an object.")
        mnemonic = require_string(raw, "mnemonic", f"enrichment {entry.entry_id!r}")
        etymology = require_string(raw, "etymology", f"enrichment {entry.entry_id!r}")
        usage_example = raw.get("usage_example")
        if not isinstance(usage_example, dict):
            raise ValueError(f"Enrichment {entry.entry_id!r} missing usage_example object.")
        target = require_string(usage_example, "target", f"usage_example {entry.entry_id!r}")
        base = require_string(usage_example, "base", f"usage_example {entry.entry_id!r}")
        if entry.term.casefold() not in target.casefold():
            raise ValueError(f"Usage example for {entry.entry_id!r} does not include term {entry.term!r}.")
        cleaned[entry.entry_id] = {
            "mnemonic": mnemonic,
            "etymology": etymology,
            "usage_example": {"target": target, "base": base},
        }
    return cleaned


def render_image(prompt: str, output_webp: Path, provider: str, aspect: str, size: str, target_ratio: float, cost: CostTracker) -> str:
    with tempfile.TemporaryDirectory(prefix="pilot_asset_") as tmp_dir:
        tmp_path = Path(tmp_dir) / "source.png"
        if provider == "openai":
            provider_model = render_image_openai(prompt, tmp_path, size, cost)
        elif provider == "kie":
            provider_model = render_image_kie(prompt, tmp_path, aspect, cost)
        else:
            raise ValueError(f"Unknown image provider {provider!r}.")
        crop_and_save_webp(tmp_path, output_webp, target_ratio)
        return provider_model


def render_image_openai(prompt: str, output_path: Path, size: str, cost: CostTracker) -> str:
    api_key = os.environ.get("OPENAI_API_KEY", "")
    payload = {
        "model": OPENAI_IMAGE_MODEL,
        "prompt": prompt,
        "size": size,
        "quality": OPENAI_IMAGE_QUALITY,
        "output_format": "png",
        "background": "opaque",
        "n": 1,
    }
    data = post_json(
        OPENAI_IMAGE_ENDPOINT,
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        payload=payload,
        timeout=180.0,
        label="OpenAI image",
    )
    images = data.get("data")
    if not images or not isinstance(images, list):
        raise RuntimeError(f"OpenAI returned no image data: {json.dumps(data)[:1000]}")
    b64 = images[0].get("b64_json")
    if not isinstance(b64, str) or not b64:
        raise RuntimeError("OpenAI response missing data[0].b64_json.")
    output_path.write_bytes(base64.b64decode(b64))
    cost.image_calls += 1
    image_tokens = 408 if size == "1024x1536" else 400
    approx_text_tokens = max(1, len(prompt) // 4)
    cost.image_cost_usd += (image_tokens * OPENAI_IMAGE_OUTPUT_USD_PER_1M / 1_000_000)
    cost.image_cost_usd += (approx_text_tokens * OPENAI_TEXT_INPUT_USD_PER_1M / 1_000_000)
    return f"{OPENAI_IMAGE_MODEL}:{OPENAI_IMAGE_QUALITY}"


def render_image_kie(prompt: str, output_path: Path, aspect: str, cost: CostTracker) -> str:
    api_key = os.environ.get("KIE_API_KEY", "")
    model_id = "gpt-image-2-text-to-image"
    payload = {
        "model": model_id,
        "input": {
            "prompt": prompt,
            "aspect_ratio": aspect,
            "resolution": "1K",
        },
    }
    submit = post_json(
        f"{KIE_API_BASE}/jobs/createTask",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        payload=payload,
        timeout=30.0,
        label="KIE submit",
    )
    if submit.get("code") not in (0, 200, None):
        raise RuntimeError(f"KIE submit error: {json.dumps(submit)[:1000]}")
    task_id = (submit.get("data") or {}).get("taskId")
    if not isinstance(task_id, str) or not task_id:
        raise RuntimeError(f"KIE submit returned no taskId: {json.dumps(submit)[:1000]}")

    result = poll_kie_task(task_id, api_key)
    image_url = extract_kie_image_url(result)
    if not image_url:
        raise RuntimeError(f"KIE task succeeded but no image URL was found: {json.dumps(result)[:1000]}")
    output_path.write_bytes(get_bytes(image_url, timeout=60.0, label="KIE image download"))
    cost.image_calls += 1
    cost.image_cost_usd += KIE_COST_PER_IMAGE_USD
    return model_id


def poll_kie_task(task_id: str, api_key: str) -> dict[str, Any]:
    start = time.monotonic()
    while True:
        if time.monotonic() - start > KIE_MAX_POLL_SECONDS:
            raise RuntimeError(f"KIE task {task_id} timed out after {KIE_MAX_POLL_SECONDS:.0f}s")
        result = get_json(
            f"{KIE_API_BASE}/jobs/recordInfo",
            headers={"Authorization": f"Bearer {api_key}"},
            params={"taskId": task_id},
            timeout=30.0,
            label="KIE poll",
        )
        data = result.get("data") or {}
        state = data.get("state")
        print(f"KIE task {task_id}: {state}")
        if state == "success":
            return result
        if state == "fail":
            fail_code = data.get("failCode") or data.get("errorCode")
            fail_msg = data.get("failMsg") or data.get("errorMessage") or "unknown error"
            raise RuntimeError(f"KIE task {task_id} failed: failCode={fail_code} failMsg={fail_msg}")
        time.sleep(KIE_POLL_INTERVAL_SECONDS)


def extract_kie_image_url(result: dict[str, Any]) -> str | None:
    data = result.get("data") or {}
    result_json_raw = data.get("resultJson")
    if result_json_raw:
        try:
            result_json = json.loads(result_json_raw) if isinstance(result_json_raw, str) else result_json_raw
            urls = result_json.get("resultUrls") or []
            if urls:
                return urls[0]
        except (json.JSONDecodeError, AttributeError):
            pass
    response_urls = ((data.get("response") or {}).get("resultUrls") or [])
    if response_urls:
        return response_urls[0]
    urls = data.get("resultUrls") or []
    return urls[0] if urls else None


def post_json(url: str, *, headers: dict[str, str], payload: dict[str, Any], timeout: float, label: str) -> dict[str, Any]:
    if HTTP_BACKEND == "curl":
        return curl_json("POST", url, headers=headers, payload=payload, timeout=timeout, label=label)
    with httpx.Client(timeout=timeout) as client:
        response = client.post(url, headers=headers, json=payload)
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(f"{label} HTTP {response.status_code}: {response.text[:1000]}")
    return response.json()


def get_json(
    url: str,
    *,
    headers: dict[str, str],
    params: dict[str, str],
    timeout: float,
    label: str,
) -> dict[str, Any]:
    if HTTP_BACKEND == "curl":
        query = urlencode(params)
        full_url = f"{url}?{query}" if query else url
        return curl_json("GET", full_url, headers=headers, payload=None, timeout=timeout, label=label)
    with httpx.Client(timeout=timeout) as client:
        response = client.get(url, headers=headers, params=params)
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(f"{label} HTTP {response.status_code}: {response.text[:1000]}")
    return response.json()


def get_bytes(url: str, *, timeout: float, label: str) -> bytes:
    if HTTP_BACKEND == "curl":
        return curl_bytes(url, timeout=timeout, label=label)
    with httpx.Client(timeout=timeout) as client:
        response = client.get(url)
    if response.status_code < 200 or response.status_code >= 300:
        raise RuntimeError(f"{label} HTTP {response.status_code}: {response.text[:1000]}")
    return response.content


def curl_base_args(timeout: float) -> list[str]:
    if not CURL_EXE:
        raise RuntimeError("curl transport requested but curl is not available.")
    args = [CURL_EXE, "--silent", "--show-error", "--location", "--max-time", str(int(timeout))]
    if os.name == "nt":
        args.append("--ssl-no-revoke")
    return args


def curl_json(
    method: str,
    url: str,
    *,
    headers: dict[str, str],
    payload: dict[str, Any] | None,
    timeout: float,
    label: str,
) -> dict[str, Any]:
    with tempfile.NamedTemporaryFile("w", encoding="utf-8", suffix=".json", delete=False) as payload_file:
        payload_path = Path(payload_file.name)
        if payload is not None:
            json.dump(payload, payload_file, ensure_ascii=False)
        else:
            payload_file.write("")
    try:
        args = curl_base_args(timeout)
        args.extend(["--request", method])
        for key, value in headers.items():
            args.extend(["--header", f"{key}: {value}"])
        if payload is not None:
            args.extend(["--data-binary", f"@{payload_path}"])
        args.extend(["--write-out", "\n%{http_code}", url])
        completed = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", timeout=timeout + 10)
    finally:
        try:
            payload_path.unlink()
        except FileNotFoundError:
            pass
    if completed.returncode != 0:
        raise RuntimeError(f"{label} curl failed: {completed.stderr.strip()[:1000]}")
    body, _, status_text = completed.stdout.rpartition("\n")
    status = int(status_text.strip() or "0")
    if status < 200 or status >= 300:
        raise RuntimeError(f"{label} HTTP {status}: {body[:1000]}")
    try:
        return json.loads(body)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{label} returned non-JSON: {body[:1000]}") from exc


def curl_bytes(url: str, *, timeout: float, label: str) -> bytes:
    with tempfile.NamedTemporaryFile(delete=False) as output_file:
        output_path = Path(output_file.name)
    try:
        args = curl_base_args(timeout)
        args.extend(["--output", str(output_path), "--write-out", "\n%{http_code}", url])
        completed = subprocess.run(args, capture_output=True, text=True, encoding="utf-8", timeout=timeout + 10)
        if completed.returncode != 0:
            raise RuntimeError(f"{label} curl failed: {completed.stderr.strip()[:1000]}")
        status_text = completed.stdout.strip().splitlines()[-1] if completed.stdout.strip() else "0"
        status = int(status_text)
        if status < 200 or status >= 300:
            raise RuntimeError(f"{label} HTTP {status}")
        return output_path.read_bytes()
    finally:
        try:
            output_path.unlink()
        except FileNotFoundError:
            pass


def crop_and_save_webp(source_path: Path, output_path: Path, target_ratio: float) -> None:
    with Image.open(source_path) as img:
        img = flatten_to_rgb(img)
        cropped = center_crop(img, target_ratio)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        save_webp_under_limit(cropped, output_path)


def flatten_to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("RGBA", "LA") or (img.mode == "P" and "transparency" in img.info):
        background = Image.new("RGB", img.size, (255, 255, 255))
        rgba = img.convert("RGBA")
        background.paste(rgba, mask=rgba.getchannel("A"))
        return background
    return img.convert("RGB")


def center_crop(img: Image.Image, target_ratio: float) -> Image.Image:
    width, height = img.size
    current_ratio = width / height
    if abs(current_ratio - target_ratio) < 0.001:
        return img.copy()
    if current_ratio > target_ratio:
        new_width = int(height * target_ratio)
        left = (width - new_width) // 2
        box = (left, 0, left + new_width, height)
    else:
        new_height = int(width / target_ratio)
        top = (height - new_height) // 2
        box = (0, top, width, top + new_height)
    return img.crop(box)


def save_webp_under_limit(img: Image.Image, output_path: Path) -> None:
    working = img
    for scale_round in range(4):
        for quality in (80, 76, 72, 68, 64, 60, 56, 52):
            buffer = BytesIO()
            working.save(buffer, format="WEBP", quality=quality, method=6, exif=b"")
            data = buffer.getvalue()
            if len(data) <= MAX_WEBP_BYTES or quality == 52 and scale_round == 3:
                output_path.write_bytes(data)
                return
        new_size = (max(320, int(working.width * 0.9)), max(320, int(working.height * 0.9)))
        working = working.resize(new_size, Image.Resampling.LANCZOS)


def existing_or_generate_image(
    label: str,
    prompt: str,
    path: Path,
    provider: str,
    aspect: str,
    size: str,
    ratio: float,
    force: bool,
    dry_run: bool,
    cost: CostTracker,
) -> str | None:
    if path.exists() and not force:
        print(f"{label}: {path} exists, skipping")
        return None
    if dry_run:
        print(f"{label}: dry-run would generate {path}")
        return None
    print(f"{label}: generating {path}")
    return render_image(prompt, path, provider, aspect, size, ratio, cost)


def write_enrichment(entries: list[Entry], enriched_entries: dict[str, Any], model_id: str, force: bool, dry_run: bool) -> None:
    generated_at = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
    payload = {
        "source_curriculum": "familie_beziehungen.json",
        "target_language": "en",
        "base_language": "de",
        "generated_at": generated_at,
        "generator_model": model_id,
        "entries": {entry.entry_id: enriched_entries[entry.entry_id] for entry in entries},
    }
    if ENRICHMENT_PATH.exists() and not force:
        print(f"enrichment: {ENRICHMENT_PATH} exists, skipping")
        return
    if dry_run:
        print(f"enrichment: dry-run would write {ENRICHMENT_PATH}")
        return
    ENRICHMENT_DIR.mkdir(parents=True, exist_ok=True)
    ENRICHMENT_README_PATH.write_text(
        "Pilot enrichment sidecars paired with curriculum content.\n"
        "These files are local curriculum assets and are not integrated with any Supabase enrichment pipeline yet.\n",
        encoding="utf-8",
    )
    ENRICHMENT_PATH.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"enrichment: wrote {ENRICHMENT_PATH}")


def validate_output_files(entries: list[Entry]) -> None:
    expected = [(ASSET_ROOT / "hero.webp", 4 / 5)]
    expected.extend((ENTRY_ASSET_DIR / f"{entry.entry_id}.webp", 16 / 9) for entry in entries)
    for path, ratio in expected:
        if not path.exists():
            raise FileNotFoundError(f"Expected image missing: {path}")
        if path.stat().st_size > MAX_WEBP_BYTES:
            raise ValueError(f"{path} exceeds {MAX_WEBP_BYTES} bytes.")
        with Image.open(path) as img:
            actual = img.width / img.height
            if abs(actual - ratio) > 0.002:
                raise ValueError(f"{path} has ratio {actual:.4f}, expected {ratio:.4f}.")
            if img.mode not in ("RGB", "P"):
                raise ValueError(f"{path} is not opaque RGB/WebP-compatible mode: {img.mode}")
    if not ENRICHMENT_PATH.exists():
        raise FileNotFoundError(f"Expected enrichment missing: {ENRICHMENT_PATH}")
    data = json.loads(ENRICHMENT_PATH.read_text(encoding="utf-8"))
    expected_ids = {entry.entry_id for entry in entries}
    if set(data.get("entries", {})) != expected_ids:
        raise ValueError("Written enrichment entries do not match Level 1 entry keys.")


def print_summary(entries: list[Entry], provider: str, model_names: list[str], warnings: list[str], cost: CostTracker) -> None:
    print("\nSummary")
    print("-------")
    print(f"category: familie_beziehungen")
    print(f"level: 1")
    print(f"entry_count: {len(entries)}")
    print(f"entry_keys: {', '.join(entry.entry_id for entry in entries)}")
    print(f"image_provider: {provider}")
    print(f"image_models: {', '.join(sorted(set(model_names))) if model_names else 'none (all skipped or dry-run)'}")
    print(f"llm_model: {OPENROUTER_MODEL}")
    print(f"image_calls: {cost.image_calls}")
    print(f"llm_calls: {cost.llm_calls}")
    print(f"llm_tokens: prompt={cost.llm_prompt_tokens} completion={cost.llm_completion_tokens}")
    print(f"estimated_cost_usd: ${cost.image_cost_usd + cost.llm_cost_usd:.4f}")
    print(f"assets: {ASSET_ROOT}")
    print(f"enrichment: {ENRICHMENT_PATH}")
    for warning in warnings:
        print(f"WARNING: {warning}")


def main() -> int:
    load_dotenv(REPO_ROOT / ".env")
    args = parse_args()
    cost = CostTracker()
    curriculum, entries, warnings = load_level_one_entries()
    if curriculum.get("category_slug") != "familie_beziehungen":
        raise ValueError("Loaded curriculum is not familie_beziehungen.")
    if curriculum.get("target_language") != "en":
        raise ValueError("Loaded curriculum target_language is not en.")
    provider = choose_image_provider(args.image_provider)
    if args.dry_run:
        print(f"dry-run: provider={provider}, entries={', '.join(entry.entry_id for entry in entries)}")
        print_summary(entries, provider, [], warnings, cost)
        return 0

    image_targets = [ASSET_ROOT / "hero.webp"]
    image_targets.extend(ENTRY_ASSET_DIR / f"{entry.entry_id}.webp" for entry in entries)
    needs_images = args.force or any(not path.exists() for path in image_targets)
    needs_enrichment = args.force or not ENRICHMENT_PATH.exists()

    entry_prompts: dict[str, str] = {}
    hero_prompt = ""
    if needs_images:
        prompt_payload = openrouter_json(build_generation_prompt(entries), cost)
        entry_prompts, hero_prompt = validate_prompt_payload(prompt_payload, entries)
    else:
        print("images: all targets exist, skipping prompt generation")

    enriched_entries: dict[str, Any] = {}
    if needs_enrichment:
        enrichment_payload = openrouter_json(build_enrichment_prompt(entries), cost)
        enriched_entries = validate_enrichment_payload(enrichment_payload, entries)
    else:
        print(f"enrichment: {ENRICHMENT_PATH} exists, skipping enrichment generation")

    model_names: list[str] = []
    hero_model = existing_or_generate_image(
        "hero",
        hero_prompt,
        ASSET_ROOT / "hero.webp",
        provider,
        "3:4",
        "1024x1536",
        4 / 5,
        args.force,
        args.dry_run,
        cost,
    )
    if hero_model:
        model_names.append(hero_model)
    for entry in entries:
        model_name = existing_or_generate_image(
            f"entry {entry.entry_id}",
            entry_prompts.get(entry.entry_id, ""),
            ENTRY_ASSET_DIR / f"{entry.entry_id}.webp",
            provider,
            "16:9",
            "1536x1024",
            16 / 9,
            args.force,
            args.dry_run,
            cost,
        )
        if model_name:
            model_names.append(model_name)
        time.sleep(0.5)

    if needs_enrichment:
        write_enrichment(entries, enriched_entries, OPENROUTER_MODEL, args.force, args.dry_run)
    validate_output_files(entries)
    print_summary(entries, provider, model_names, warnings, cost)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
