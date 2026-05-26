"""Generate static thematic TTS assets for the English Animals pilot.

Default mode is a dry run. The script only calls ElevenLabs when both
``--commit-db`` and ``--allow-provider-calls`` are present.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import subprocess
import sys
import tempfile
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Awaitable, Callable

REPO_ROOT = Path(__file__).resolve().parents[1]
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from src.services.guided_tts import db as guided_db
from src.services.guided_tts.inventory import (
    DEFAULT_MODEL_ID,
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_PROVIDER,
    DEFAULT_VOICE_SETTINGS,
    NORMALIZATION_VERSION,
    normalize_spoken_text,
    text_hash,
    voice_settings_hash,
)

ProviderCallable = Callable[..., bytes | Awaitable[bytes]]
AUDIO_VERSION = 1


@dataclass(frozen=True)
class StaticTtsConfig:
    target_language: str
    category: str
    voice_profile_key: str
    voice_name: str | None
    provider_voice_id: str | None
    commit_db: bool
    allow_provider_calls: bool
    skip_existing: bool
    force_regenerate: bool
    limit: int | None
    allow_raw_audio: bool
    report_out: str | None = None


def build_storage_path(
    *,
    target_language_code: str,
    voice_profile_key: str,
    category_slug: str,
    level_number: int,
    concept_id: str,
) -> str:
    safe = lambda value: re.sub(r"[^A-Za-z0-9_.-]+", "_", str(value or "")).strip("_")
    return (
        f"static/v{AUDIO_VERSION}/{safe(target_language_code)}/{safe(voice_profile_key)}/"
        f"{safe(category_slug)}/level-{int(level_number)}/{safe(concept_id)}.mp3"
    )


def build_cache_key(
    *,
    provider: str,
    target_language_code: str,
    voice_profile_key: str,
    provider_voice_id: str,
    provider_model_id: str,
    output_format: str,
    settings_hash: str,
    normalization_version: str,
    text_hash_value: str,
) -> str:
    import hashlib

    payload = "|".join(
        [
            provider,
            target_language_code,
            voice_profile_key,
            provider_voice_id,
            provider_model_id,
            output_format,
            settings_hash,
            normalization_version,
            text_hash_value,
        ]
    )
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _validate_scope(config: StaticTtsConfig) -> None:
    if config.target_language != "en":
        raise RuntimeError("Only --target-language en is supported for this pilot.")
    if config.category != "animals":
        raise RuntimeError("Only --category animals is supported for this pilot.")
    if config.force_regenerate and config.skip_existing:
        raise RuntimeError("Use either --skip-existing or --force-regenerate, not both.")
    if config.commit_db and not config.allow_provider_calls and config.force_regenerate:
        raise RuntimeError("--force-regenerate with --commit-db requires --allow-provider-calls.")


def _validate_inventory(items: list[dict[str, Any]], config: StaticTtsConfig) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for item in items:
        if item.get("target_language_code") != config.target_language:
            raise RuntimeError(f"Inventory item {item.get('concept_id')} is not target_language_code=en.")
        if item.get("category_slug") != config.category:
            raise RuntimeError(f"Inventory item {item.get('concept_id')} is not category_slug=animals.")
        concept_id = str(item.get("concept_id") or "").strip()
        spoken_text = str(item.get("spoken_text") or "").strip()
        if not concept_id:
            raise RuntimeError("Inventory item is missing concept_id.")
        if not spoken_text:
            raise RuntimeError(f"Inventory item {concept_id} is missing spoken_text.")
        if concept_id in seen:
            raise RuntimeError(f"Duplicate concept_id in inventory: {concept_id}")
        seen.add(concept_id)
        out.append(item)
    if config.limit is not None:
        return out[: max(0, config.limit)]
    return out


def _find_existing_voice_profile(sb, voice_profile_key: str) -> dict[str, Any] | None:
    rows = (
        sb.table("guided_voice_profiles")
        .select("*")
        .eq("voice_profile_key", voice_profile_key)
        .eq("active", True)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def _resolve_provider_voice_id(sb, config: StaticTtsConfig) -> tuple[str, str | None]:
    if config.provider_voice_id:
        return config.provider_voice_id, config.voice_name
    if not config.voice_name:
        raise RuntimeError(
            f"No guided_voice_profiles row exists for {config.voice_profile_key!r}. "
            "Pass --voice-name or --provider-voice-id."
        )
    matches = guided_db.find_voices_by_name(sb, names=[config.voice_name])
    rows = matches.get(config.voice_name) or []
    if not rows:
        raise RuntimeError(f"No English public.voices row matched --voice-name {config.voice_name!r}.")
    if len(rows) > 1:
        names = ", ".join(f"{row.get('name')} ({row.get('voice_id')})" for row in rows)
        raise RuntimeError(f"--voice-name {config.voice_name!r} is ambiguous in public.voices: {names}")
    return rows[0]["voice_id"], rows[0].get("name")


def resolve_or_upsert_voice_profile(sb, config: StaticTtsConfig) -> dict[str, Any]:
    existing = _find_existing_voice_profile(sb, config.voice_profile_key)
    if existing:
        return existing

    provider_voice_id, resolved_name = _resolve_provider_voice_id(sb, config)
    settings = dict(DEFAULT_VOICE_SETTINGS)
    settings_hash = voice_settings_hash(settings)
    payload = {
        "voice_profile_key": config.voice_profile_key,
        "provider": DEFAULT_PROVIDER,
        "target_language_code": config.target_language,
        "vibe": None,
        "provider_voice_id": provider_voice_id,
        "provider_model_id": DEFAULT_MODEL_ID,
        "output_format": DEFAULT_OUTPUT_FORMAT,
        "voice_settings": settings,
        "voice_settings_hash": settings_hash,
        "assignment_version": 1,
        "active": True,
        "priority": 100,
        "notes": f"Static thematic English Animals pilot voice{f' resolved from {resolved_name}' if resolved_name else ''}.",
    }

    if not config.commit_db:
        return {**payload, "id": None, "planned": True}

    return guided_db.upsert_voice_profile(
        sb,
        voice_profile_key=config.voice_profile_key,
        target_language_code=config.target_language,
        vibe=None,
        provider_voice_id=provider_voice_id,
        voice_settings_hash=settings_hash,
        provider=DEFAULT_PROVIDER,
        provider_model_id=DEFAULT_MODEL_ID,
        output_format=DEFAULT_OUTPUT_FORMAT,
        voice_settings=settings,
        assignment_version=1,
        active=True,
        priority=100,
        notes=payload["notes"],
    )


def _upsert_assignment(sb, config: StaticTtsConfig) -> None:
    existing = (
        sb.table("static_tts_voice_assignments")
        .select("*")
        .eq("target_language_code", config.target_language)
        .eq("category_slug", config.category)
        .eq("voice_profile_key", config.voice_profile_key)
        .eq("audio_version", AUDIO_VERSION)
        .execute()
        .data
        or []
    )
    payload = {
        "target_language_code": config.target_language,
        "category_slug": config.category,
        "voice_profile_key": config.voice_profile_key,
        "label": "English Animals static thematic TTS pilot",
        "active": True,
        "priority": 100,
        "audio_version": AUDIO_VERSION,
        "updated_at": _now_iso(),
    }
    if existing:
        sb.table("static_tts_voice_assignments").update(payload).eq("id", existing[0]["id"]).execute()
    else:
        sb.table("static_tts_voice_assignments").insert({**payload, "created_at": _now_iso()}).execute()


def _find_usage(
    sb,
    *,
    target_language_code: str,
    category_slug: str,
    concept_id: str,
    voice_profile_key: str,
) -> dict[str, Any] | None:
    rows = (
        sb.table("static_tts_asset_usages")
        .select("*")
        .eq("target_language_code", target_language_code)
        .eq("category_slug", category_slug)
        .eq("concept_id", concept_id)
        .eq("voice_profile_key", voice_profile_key)
        .eq("audio_version", AUDIO_VERSION)
        .execute()
        .data
        or []
    )
    return rows[0] if rows else None


def _upsert_static_usage(
    sb,
    *,
    asset_id: str,
    item: dict[str, Any],
    voice_profile_key: str,
    qa_status: str,
) -> dict[str, Any]:
    existing = _find_usage(
        sb,
        target_language_code=item["target_language_code"],
        category_slug=item["category_slug"],
        concept_id=item["concept_id"],
        voice_profile_key=voice_profile_key,
    )
    payload = {
        "asset_id": asset_id,
        "target_language_code": item["target_language_code"],
        "category_slug": item["category_slug"],
        "level_number": int(item["level_number"]),
        "concept_id": item["concept_id"],
        "spoken_text": item["spoken_text"],
        "part_of_speech": item.get("part_of_speech"),
        "sense": item.get("sense"),
        "voice_profile_key": voice_profile_key,
        "audio_version": AUDIO_VERSION,
        "qa_status": qa_status,
        "updated_at": _now_iso(),
    }
    if existing:
        rows = sb.table("static_tts_asset_usages").update(payload).eq("id", existing["id"]).execute().data or []
        return rows[0] if rows else {**existing, **payload}
    rows = sb.table("static_tts_asset_usages").insert({**payload, "created_at": _now_iso()}).execute().data or []
    if not rows:
        raise RuntimeError(f"static_tts_asset_usages insert returned no row for {item['concept_id']}")
    return rows[0]


def _maybe_await(value):
    if hasattr(value, "__await__"):
        loop = asyncio.new_event_loop()
        try:
            return loop.run_until_complete(value)
        finally:
            loop.close()
    return value


def _require_audio_tools() -> None:
    for tool in ("ffmpeg", "ffprobe"):
        try:
            subprocess.run([tool, "-version"], capture_output=True, check=True)
        except (OSError, subprocess.CalledProcessError) as exc:
            raise RuntimeError(f"{tool} is required for commit generation. Pass --allow-raw-audio to bypass.") from exc


def _probe_duration_ms(path: Path) -> int:
    result = subprocess.run(
        [
            "ffprobe",
            "-v",
            "error",
            "-show_entries",
            "format=duration",
            "-of",
            "default=noprint_wrappers=1:nokey=1",
            str(path),
        ],
        capture_output=True,
        text=True,
        check=True,
    )
    return int(float(result.stdout.strip()) * 1000)


def _detect_peak_db(path: Path) -> float | None:
    result = subprocess.run(
        ["ffmpeg", "-hide_banner", "-i", str(path), "-af", "volumedetect", "-f", "null", "-"],
        capture_output=True,
        text=True,
    )
    text = f"{result.stderr}\n{result.stdout}"
    match = re.search(r"max_volume:\s*(-?\d+(?:\.\d+)?) dB", text)
    return float(match.group(1)) if match else None


def postprocess_audio(audio_bytes: bytes, *, allow_raw_audio: bool) -> tuple[bytes, int | None, dict[str, Any]]:
    if allow_raw_audio:
        return audio_bytes, None, {"status": "raw_audio_bypass"}

    _require_audio_tools()
    with tempfile.TemporaryDirectory() as tmp:
        raw = Path(tmp) / "raw.mp3"
        trimmed = Path(tmp) / "trimmed.mp3"
        out = Path(tmp) / "processed.mp3"
        raw.write_bytes(audio_bytes)
        trim_command = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-i",
            str(raw),
            "-af",
            "silenceremove=start_periods=1:start_threshold=-45dB:start_silence=0.04:"
            "stop_periods=1:stop_threshold=-45dB:stop_silence=0.08,"
            "afade=t=in:st=0:d=0.008,"
            "afade=t=out:st=0:d=0.016",
            "-ar",
            "44100",
            "-b:a",
            "128k",
            str(trimmed),
        ]
        subprocess.run(trim_command, capture_output=True, check=True)
        peak_before = _detect_peak_db(trimmed)
        gain = 0.0 if peak_before is None else max(-12.0, min(12.0, -1.0 - peak_before))
        normalize_command = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-i",
            str(trimmed),
            "-af",
            f"volume={gain:.2f}dB",
            "-ar",
            "44100",
            "-b:a",
            "128k",
            str(out),
        ]
        subprocess.run(normalize_command, capture_output=True, check=True)
        duration_ms = _probe_duration_ms(out)
        size = out.stat().st_size
        peak_db = _detect_peak_db(out)
        if size < 512:
            raise RuntimeError(f"Processed audio is too small: {size} bytes")
        if duration_ms <= 150:
            raise RuntimeError(f"Processed audio is too short: {duration_ms}ms")
        if duration_ms >= 5000:
            raise RuntimeError(f"Processed audio is too long for a one-word pilot clip: {duration_ms}ms")
        if peak_db is not None and peak_db > -0.1:
            raise RuntimeError(f"Processed audio may be clipped: max_volume={peak_db}dB")
        return out.read_bytes(), duration_ms, {
            "status": "processed",
            "duration_ms": duration_ms,
            "size_bytes": size,
            "peak_before_db": peak_before,
            "applied_gain_db": gain,
            "peak_db": peak_db,
        }


def _git_commit_sha() -> str | None:
    try:
        result = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True, check=True)
        return result.stdout.strip()
    except Exception:
        return None


def run_inventory(
    *,
    sb,
    inventory: list[dict[str, Any]],
    config: StaticTtsConfig,
    provider_synthesize: ProviderCallable | None = None,
) -> dict[str, Any]:
    _validate_scope(config)
    items = _validate_inventory(inventory, config)
    profile = resolve_or_upsert_voice_profile(sb, config)

    if config.commit_db:
        _upsert_assignment(sb, config)

    report_items: list[dict[str, Any]] = []
    totals = {
        "items": len(items),
        "existing_ready_assets": 0,
        "existing_usages": 0,
        "skipped_existing": 0,
        "would_generate": 0,
        "generated": 0,
        "failed": 0,
    }
    generated_cache: dict[str, str] = {}

    for item in items:
        normalized = normalize_spoken_text(item["spoken_text"])
        th = text_hash(normalized)
        settings_hash = profile["voice_settings_hash"]
        cache_key = build_cache_key(
            provider=profile.get("provider") or DEFAULT_PROVIDER,
            target_language_code=item["target_language_code"],
            voice_profile_key=config.voice_profile_key,
            provider_voice_id=profile["provider_voice_id"],
            provider_model_id=profile.get("provider_model_id") or DEFAULT_MODEL_ID,
            output_format=profile.get("output_format") or DEFAULT_OUTPUT_FORMAT,
            settings_hash=settings_hash,
            normalization_version=NORMALIZATION_VERSION,
            text_hash_value=th,
        )
        storage_path = build_storage_path(
            target_language_code=item["target_language_code"],
            voice_profile_key=config.voice_profile_key,
            category_slug=item["category_slug"],
            level_number=int(item["level_number"]),
            concept_id=item["concept_id"],
        )
        existing_asset = guided_db.load_existing_assets_by_cache_key(sb, [cache_key]).get(cache_key)
        existing_usage = _find_usage(
            sb,
            target_language_code=item["target_language_code"],
            category_slug=item["category_slug"],
            concept_id=item["concept_id"],
            voice_profile_key=config.voice_profile_key,
        )
        asset_ready = existing_asset is not None and existing_asset.get("status") == "ready"
        if asset_ready:
            totals["existing_ready_assets"] += 1
        if existing_usage:
            totals["existing_usages"] += 1

        base_report = {
            "concept_id": item["concept_id"],
            "spoken_text": item["spoken_text"],
            "normalized_text": normalized,
            "cache_key": cache_key,
            "storage_path": storage_path,
            "asset_id": existing_asset.get("id") if existing_asset else None,
            "usage_id": existing_usage.get("id") if existing_usage else None,
        }

        if asset_ready and existing_usage and config.skip_existing and not config.force_regenerate:
            totals["skipped_existing"] += 1
            report_items.append({**base_report, "status": "skipped_existing"})
            continue

        if asset_ready and config.commit_db and not existing_usage and not config.force_regenerate:
            usage = _upsert_static_usage(
                sb,
                asset_id=existing_asset["id"],
                item=item,
                voice_profile_key=config.voice_profile_key,
                qa_status="ready",
            )
            totals["skipped_existing"] += 1
            report_items.append({**base_report, "status": "linked_existing_asset", "usage_id": usage["id"]})
            continue

        if not config.commit_db:
            totals["would_generate"] += 1
            report_items.append({**base_report, "status": "would_generate"})
            continue

        if not config.allow_provider_calls:
            raise RuntimeError("--allow-provider-calls is required before calling ElevenLabs.")
        if provider_synthesize is None:
            raise RuntimeError("Provider synthesize callable is required for commit generation.")

        try:
            if cache_key in generated_cache:
                usage = _upsert_static_usage(
                    sb,
                    asset_id=generated_cache[cache_key],
                    item=item,
                    voice_profile_key=config.voice_profile_key,
                    qa_status="ready",
                )
                totals["skipped_existing"] += 1
                report_items.append({**base_report, "status": "linked_generated_duplicate", "usage_id": usage["id"]})
                continue

            raw_audio = _maybe_await(
                provider_synthesize(
                    text=normalized,
                    voice_id=profile["provider_voice_id"],
                    model_id=profile.get("provider_model_id") or DEFAULT_MODEL_ID,
                    output_format=profile.get("output_format") or DEFAULT_OUTPUT_FORMAT,
                    voice_settings=profile.get("voice_settings") or dict(DEFAULT_VOICE_SETTINGS),
                    language_code=item["target_language_code"],
                    request_id=cache_key[:32],
                )
            )
            processed_audio, duration_ms, qa = postprocess_audio(raw_audio, allow_raw_audio=config.allow_raw_audio)
            public_url = guided_db.upload_asset_bytes(
                sb,
                storage_path=storage_path,
                audio_bytes=processed_audio,
            )
            asset = guided_db.upsert_ready_asset(
                sb,
                provider=profile.get("provider") or DEFAULT_PROVIDER,
                target_language_code=item["target_language_code"],
                voice_profile_key=config.voice_profile_key,
                provider_voice_id=profile["provider_voice_id"],
                provider_model_id=profile.get("provider_model_id") or DEFAULT_MODEL_ID,
                output_format=profile.get("output_format") or DEFAULT_OUTPUT_FORMAT,
                voice_settings_hash=settings_hash,
                normalization_version=NORMALIZATION_VERSION,
                text=item["spoken_text"],
                normalized_text=normalized,
                text_hash=th,
                cache_key=cache_key,
                storage_path=storage_path,
                public_url=public_url,
                character_count=len(normalized),
                duration_ms=duration_ms,
                provider_request_id=None,
                content_commit_sha=_git_commit_sha(),
            )
            usage = _upsert_static_usage(
                sb,
                asset_id=asset["id"],
                item=item,
                voice_profile_key=config.voice_profile_key,
                qa_status="ready",
            )
            generated_cache[cache_key] = asset["id"]
            totals["generated"] += 1
            report_items.append(
                {
                    **base_report,
                    "status": "generated",
                    "asset_id": asset["id"],
                    "usage_id": usage["id"],
                    "public_url": public_url,
                    "postprocess": qa,
                }
            )
        except Exception as exc:  # noqa: BLE001 - batch must continue and report item failure
            totals["failed"] += 1
            report_items.append({**base_report, "status": "failed", "error": str(exc)})

    return {
        "mode": "commit" if config.commit_db else "dry-run",
        "target_language": config.target_language,
        "category": config.category,
        "voice_profile": {
            "voice_profile_key": config.voice_profile_key,
            "target_language_code": profile.get("target_language_code"),
            "provider": profile.get("provider") or DEFAULT_PROVIDER,
            "provider_model_id": profile.get("provider_model_id") or DEFAULT_MODEL_ID,
            "output_format": profile.get("output_format") or DEFAULT_OUTPUT_FORMAT,
            "resolved_from_existing_profile": not profile.get("planned", False),
        },
        "totals": totals,
        "items": report_items,
    }


def _build_supabase_client():
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv()
    url = os.getenv("SUPABASE_URL", "")
    key = (
        os.getenv("SUPABASE_SERVICE_KEY", "")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        or os.getenv("SUPABASE_KEY", "")
    )
    if not url or not key:
        raise RuntimeError("SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
    return create_client(url, key)


def _load_inventory(path: str) -> list[dict[str, Any]]:
    data = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(data, list):
        raise RuntimeError("Inventory JSON must be a list.")
    return data


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Static thematic TTS generator for English Animals.")
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--target-language", default="en")
    parser.add_argument("--category", default="animals")
    parser.add_argument("--voice-profile-key", default="static_thematic_en_animals_v1")
    parser.add_argument("--voice-name", default=None)
    parser.add_argument("--provider-voice-id", default=None)
    parser.add_argument("--dry-run", action="store_true", help="Default. No DB writes or provider calls.")
    parser.add_argument("--commit-db", action="store_true", help="Write DB/storage and generate missing audio.")
    parser.add_argument("--allow-provider-calls", action="store_true", help="Required before ElevenLabs calls.")
    parser.add_argument("--skip-existing", dest="skip_existing", action="store_true", default=True)
    parser.add_argument("--no-skip-existing", dest="skip_existing", action="store_false")
    parser.add_argument("--force-regenerate", action="store_true", default=False)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--allow-raw-audio", action="store_true", default=False)
    parser.add_argument("--report-out", default="tmp/static-tts-en-animals-report.json")
    return parser


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)
    if args.dry_run and args.commit_db:
        parser.error("use either --dry-run or --commit-db, not both")

    config = StaticTtsConfig(
        target_language=args.target_language,
        category=args.category,
        voice_profile_key=args.voice_profile_key,
        voice_name=args.voice_name,
        provider_voice_id=args.provider_voice_id,
        commit_db=bool(args.commit_db),
        allow_provider_calls=bool(args.allow_provider_calls),
        skip_existing=bool(args.skip_existing),
        force_regenerate=bool(args.force_regenerate),
        limit=args.limit,
        allow_raw_audio=bool(args.allow_raw_audio),
        report_out=args.report_out,
    )
    inventory = _load_inventory(args.inventory)
    sb = _build_supabase_client()

    provider = None
    if config.commit_db and config.allow_provider_calls:
        from src.services.guided_tts.provider_elevenlabs import ElevenLabsGuidedTTSProvider

        provider = ElevenLabsGuidedTTSProvider().synthesize

    report = run_inventory(sb=sb, inventory=inventory, config=config, provider_synthesize=provider)
    payload = json.dumps(report, indent=2)
    if config.report_out:
        out = Path(config.report_out)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(payload + "\n", encoding="utf-8")
    sys.stdout.write(payload + "\n")
    return 0 if report["totals"]["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
