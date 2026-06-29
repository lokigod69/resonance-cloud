"""Generate static thematic TTS assets.

Default mode is a dry run. The script only calls ElevenLabs when both
``--commit-db`` and ``--allow-provider-calls`` are present.
"""

from __future__ import annotations

import argparse
import asyncio
import html
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
SUPPORTED_TARGET_LANGUAGES = {"en", "ceb"}
SUPPORTED_QA_STATUSES = {"pending", "ready", "approved", "rejected", "failed"}
CEBUANO_LANGUAGE_ALIASES = {"ceb", "cebuano", "sebuano", "bisaya"}
ENGLISH_ANIMALS_LEVEL_1_WORDS = {
    "dog",
    "cat",
    "bird",
    "fish",
    "horse",
    "cow",
    "pig",
    "sheep",
    "goat",
    "chicken",
}


@dataclass(frozen=True)
class StaticTtsConfig:
    target_language: str
    category: str | None
    voice_profile_key: str
    profile_name: str | None
    voice_name: str | None
    provider_voice_id: str | None
    commit_db: bool
    allow_provider_calls: bool
    skip_existing: bool
    force_regenerate: bool
    limit: int | None
    allow_raw_audio: bool
    postprocess_mode: str
    qa_status: str
    activate_assignment: bool
    max_provider_calls: int = 10
    report_out: str | None = None
    listening_html_out: str | None = None


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


def _normalize_label(value: str | None) -> str:
    return (value or "").strip().casefold()


def _validate_scope(config: StaticTtsConfig) -> None:
    if config.target_language not in SUPPORTED_TARGET_LANGUAGES:
        raise RuntimeError("Only --target-language en or ceb is supported.")
    if config.force_regenerate and config.skip_existing:
        raise RuntimeError("Use either --skip-existing or --force-regenerate, not both.")
    if config.commit_db and not config.allow_provider_calls and config.force_regenerate:
        raise RuntimeError("--force-regenerate with --commit-db requires --allow-provider-calls.")
    if config.postprocess_mode not in {"raw", "safe"}:
        raise RuntimeError("--postprocess-mode must be raw or safe.")
    if config.qa_status not in SUPPORTED_QA_STATUSES:
        raise RuntimeError("--qa-status must be pending, ready, approved, rejected, or failed.")
    if config.max_provider_calls < 0:
        raise RuntimeError("--max-provider-calls must be zero or greater.")


def _validate_inventory(items: list[dict[str, Any]], config: StaticTtsConfig) -> list[dict[str, Any]]:
    seen: set[str] = set()
    out: list[dict[str, Any]] = []
    for item in items:
        if item.get("target_language_code") != config.target_language:
            raise RuntimeError(
                f"Inventory item {item.get('concept_id')} is not target_language_code={config.target_language}."
            )
        category_slug = str(item.get("category_slug") or "").strip()
        if not category_slug:
            raise RuntimeError(f"Inventory item {item.get('concept_id')} is missing category_slug.")
        if config.category and category_slug != config.category:
            raise RuntimeError(f"Inventory item {item.get('concept_id')} is not category_slug={config.category}.")
        try:
            level_number = int(item.get("level_number") or 0)
        except (TypeError, ValueError):
            level_number = 0
        if level_number < 1:
            raise RuntimeError(f"Inventory item {item.get('concept_id')} is missing level_number.")
        concept_id = str(item.get("concept_id") or "").strip()
        spoken_text = str(item.get("spoken_text") or "").strip()
        english_qa_label = str(item.get("english_qa_label") or item.get("source_concept") or "").strip()
        if not concept_id:
            raise RuntimeError("Inventory item is missing concept_id.")
        if not spoken_text:
            raise RuntimeError(f"Inventory item {concept_id} is missing spoken_text.")
        if config.target_language != "en":
            if item.get("target_translation_is_fallback") is True:
                raise RuntimeError(f"Inventory item {concept_id} has fallback spoken_text for {config.target_language}.")
            normalized_spoken = _normalize_label(spoken_text)
            if (
                config.target_language == "ceb"
                and category_slug == "animals"
                and level_number == 1
                and normalized_spoken in ENGLISH_ANIMALS_LEVEL_1_WORDS
            ):
                raise RuntimeError(f"Inventory item {concept_id} has English spoken_text for Cebuano/Bisaya.")
        key = f"{config.target_language}|{category_slug}|{concept_id}"
        if key in seen:
            raise RuntimeError(f"Duplicate concept_id in inventory: {concept_id}")
        seen.add(key)
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


def _target_language_aliases(target_language: str) -> set[str]:
    if target_language == "ceb":
        return set(CEBUANO_LANGUAGE_ALIASES) | {"fil", "tl", "tagalog", "filipino"}
    if target_language == "en":
        return {"en", "en-us", "en-gb", "english"}
    return {_normalize_label(target_language)}


def _resolve_language_profile(sb, config: StaticTtsConfig) -> dict[str, Any] | None:
    if not config.profile_name:
        return None
    rows = sb.table("language_profiles").select("*").execute().data or []
    wanted = _normalize_label(config.profile_name)
    aliases = _target_language_aliases(config.target_language)
    matches: list[dict[str, Any]] = []
    for row in rows:
        row_name = _normalize_label(row.get("name"))
        row_language = _normalize_label(row.get("language"))
        if row_name != wanted and row_language != wanted:
            continue
        if config.target_language != "en" and row_language and row_language not in aliases:
            continue
        matches.append(row)

    if not matches:
        raise RuntimeError(
            f"No language_profiles row matched --profile-name {config.profile_name!r} "
            f"for target language {config.target_language!r}."
        )
    matches.sort(key=lambda row: (not bool(row.get("is_active", False)), str(row.get("name") or "")))
    return matches[0]


def _voice_matches_target_language(row: dict[str, Any], target_language: str) -> bool:
    aliases = _target_language_aliases(target_language)
    row_values = {
        _normalize_label(row.get("language_code")),
        _normalize_label(row.get("language")),
    }
    return any(value in aliases for value in row_values if value)


def _voice_name_rank(row_name: str, wanted: str) -> int | None:
    normalized = _normalize_label(row_name)
    if normalized == wanted:
        return 0
    if normalized.startswith(wanted):
        return 1
    if normalized.endswith(wanted):
        return 2
    if wanted in normalized:
        return 3
    return None


def _find_voice_by_id(sb, provider_voice_id: str | None) -> dict[str, Any] | None:
    if not provider_voice_id:
        return None
    rows = sb.table("voices").select("*").execute().data or []
    for row in rows:
        if row.get("voice_id") == provider_voice_id:
            return row
    return None


def _resolve_provider_voice_id(sb, config: StaticTtsConfig) -> tuple[str, str | None, str | None, str | None]:
    if config.provider_voice_id:
        row = _find_voice_by_id(sb, config.provider_voice_id)
        return (
            config.provider_voice_id,
            (row or {}).get("name") or config.voice_name,
            (row or {}).get("language_code"),
            (row or {}).get("language"),
        )
    if not config.voice_name:
        raise RuntimeError(
            f"No guided_voice_profiles row exists for {config.voice_profile_key!r}. "
            "Pass --voice-name or --provider-voice-id."
        )
    wanted = _normalize_label(config.voice_name)
    rows = sb.table("voices").select("*").execute().data or []
    ranked: list[tuple[int, dict[str, Any]]] = []
    for row in rows:
        if not _voice_matches_target_language(row, config.target_language):
            continue
        rank = _voice_name_rank(str(row.get("name") or ""), wanted)
        if rank is not None:
            ranked.append((rank, row))

    if not ranked:
        raise RuntimeError(
            f"No public.voices row matched --voice-name {config.voice_name!r} "
            f"for target language {config.target_language!r}."
        )

    ranked.sort(key=lambda entry: (entry[0], str(entry[1].get("name") or "")))
    best_rank = ranked[0][0]
    rows = [row for rank, row in ranked if rank == best_rank]
    if len(rows) > 1:
        names = ", ".join(f"{row.get('name')} ({row.get('voice_id')})" for row in rows)
        raise RuntimeError(f"--voice-name {config.voice_name!r} is ambiguous in public.voices: {names}")
    return rows[0]["voice_id"], rows[0].get("name"), rows[0].get("language_code"), rows[0].get("language")


def resolve_or_upsert_voice_profile(sb, config: StaticTtsConfig) -> dict[str, Any]:
    language_profile = _resolve_language_profile(sb, config)
    resolved_profile_name = language_profile.get("name") if language_profile else None
    existing = _find_existing_voice_profile(sb, config.voice_profile_key)
    if existing:
        voice_row = _find_voice_by_id(sb, existing.get("provider_voice_id")) or {}
        return {
            **existing,
            "resolved_profile_name": resolved_profile_name,
            "resolved_voice_name": voice_row.get("name"),
            "resolved_voice_language_code": voice_row.get("language_code"),
            "resolved_voice_language": voice_row.get("language"),
        }

    provider_voice_id, resolved_name, resolved_language_code, resolved_language = _resolve_provider_voice_id(sb, config)
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
        "notes": (
            f"Static thematic {config.target_language} voice"
            f"{f' resolved from {resolved_name}' if resolved_name else ''}."
        ),
        "resolved_profile_name": resolved_profile_name,
        "resolved_voice_name": resolved_name,
        "resolved_voice_language_code": resolved_language_code,
        "resolved_voice_language": resolved_language,
    }

    if not config.commit_db:
        return {**payload, "id": None, "planned": True}

    saved = guided_db.upsert_voice_profile(
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
    return {
        **saved,
        "resolved_profile_name": resolved_profile_name,
        "resolved_voice_name": resolved_name,
        "resolved_voice_language_code": resolved_language_code,
        "resolved_voice_language": resolved_language,
    }


def _upsert_assignment(sb, config: StaticTtsConfig) -> None:
    existing_query = (
        sb.table("static_tts_voice_assignments")
        .select("*")
        .eq("target_language_code", config.target_language)
        .eq("voice_profile_key", config.voice_profile_key)
        .eq("audio_version", AUDIO_VERSION)
    )
    if config.category is None:
        existing_query = existing_query.is_("category_slug", "null")
    else:
        existing_query = existing_query.eq("category_slug", config.category)
    existing = existing_query.execute().data or []
    payload = {
        "target_language_code": config.target_language,
        "category_slug": config.category,
        "voice_profile_key": config.voice_profile_key,
        "label": (
            f"{config.target_language} static thematic TTS"
            if config.category is None
            else f"{config.target_language} {config.category} static thematic TTS"
        ),
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


def _usage_lookup_key(target_language_code: str, category_slug: str, concept_id: str) -> str:
    return f"{target_language_code}|{category_slug}|{concept_id}"


def _load_existing_usages(
    sb,
    *,
    target_language_code: str,
    voice_profile_key: str,
    category_slug: str | None,
) -> dict[str, dict[str, Any]]:
    query = (
        sb.table("static_tts_asset_usages")
        .select("*")
        .eq("target_language_code", target_language_code)
        .eq("voice_profile_key", voice_profile_key)
        .eq("audio_version", AUDIO_VERSION)
    )
    if category_slug:
        query = query.eq("category_slug", category_slug)
    rows = query.execute().data or []
    return {
        _usage_lookup_key(row["target_language_code"], row["category_slug"], row["concept_id"]): row
        for row in rows
    }


def _load_existing_assets_by_cache_key_chunked(
    sb,
    cache_keys: list[str],
    *,
    chunk_size: int = 100,
) -> dict[str, dict[str, Any]]:
    out: dict[str, dict[str, Any]] = {}
    keys = [key for key in dict.fromkeys(cache_keys) if key]
    for start in range(0, len(keys), chunk_size):
        out.update(guided_db.load_existing_assets_by_cache_key(sb, keys[start : start + chunk_size]))
    return out


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


def postprocess_audio(audio_bytes: bytes, *, postprocess_mode: str) -> tuple[bytes, int | None, dict[str, Any]]:
    if postprocess_mode == "raw":
        warnings: list[str] = []
        if len(audio_bytes) == 0:
            raise RuntimeError("provider_returned_empty_audio")
        if len(audio_bytes) < 512:
            warnings.append("suspiciously_small_file")
        with tempfile.TemporaryDirectory() as tmp:
            raw = Path(tmp) / "raw.mp3"
            raw.write_bytes(audio_bytes)
            try:
                duration_ms = _probe_duration_ms(raw)
            except Exception:
                duration_ms = None
                warnings.append("ffprobe_failed")
        return audio_bytes, duration_ms, {
            "status": "raw",
            "postprocess_mode": "raw",
            "duration_ms": duration_ms,
            "raw_duration_ms": duration_ms,
            "final_duration_ms": duration_ms,
            "raw_file_size_bytes": len(audio_bytes),
            "final_file_size_bytes": len(audio_bytes),
            "warnings": warnings,
        }

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
            "afade=t=in:st=0:d=0.008",
            "-ar",
            "44100",
            "-b:a",
            "128k",
            str(trimmed),
        ]
        subprocess.run(trim_command, capture_output=True, check=True)
        trimmed_duration_ms = _probe_duration_ms(trimmed)
        fade_out_start = max(0.0, (trimmed_duration_ms / 1000.0) - 0.016)
        peak_before = _detect_peak_db(trimmed)
        gain = 0.0 if peak_before is None else max(-12.0, min(12.0, -1.0 - peak_before))
        normalize_command = [
            "ffmpeg",
            "-y",
            "-hide_banner",
            "-i",
            str(trimmed),
            "-af",
            f"afade=t=out:st={fade_out_start:.3f}:d=0.016,volume={gain:.2f}dB",
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
            "postprocess_mode": "safe",
            "duration_ms": duration_ms,
            "final_duration_ms": duration_ms,
            "size_bytes": size,
            "final_file_size_bytes": size,
            "trimmed_duration_ms": trimmed_duration_ms,
            "fade_out_start": fade_out_start,
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


def _unique_warnings(values: list[str]) -> list[str]:
    out: list[str] = []
    for value in values:
        if value and value not in out:
            out.append(value)
    return out


def _looks_multisyllable(text: str) -> bool:
    return len(re.findall(r"[aeiouyAEIOUY]+", text)) >= 2


def _item_warnings(spoken_text: str, qa: dict[str, Any]) -> list[str]:
    warnings = list(qa.get("warnings") or [])
    duration_ms = qa.get("final_duration_ms")
    if isinstance(duration_ms, int):
        if duration_ms < 500:
            warnings.append("duration_under_500ms")
        if duration_ms < 800 and _looks_multisyllable(spoken_text):
            warnings.append("duration_under_800ms_for_multisyllable")
        if duration_ms > 3000:
            warnings.append("duration_over_3000ms")
    final_size = qa.get("final_file_size_bytes") or qa.get("size_bytes")
    if isinstance(final_size, int) and final_size < 1024:
        warnings.append("suspiciously_small_file")
    return _unique_warnings(warnings)


def _flatten_postprocess_qa(qa: dict[str, Any]) -> dict[str, Any]:
    return {
        "postprocess_mode": qa.get("postprocess_mode"),
        "raw_duration_ms": qa.get("raw_duration_ms"),
        "final_duration_ms": qa.get("final_duration_ms"),
        "raw_file_size_bytes": qa.get("raw_file_size_bytes"),
        "final_file_size_bytes": qa.get("final_file_size_bytes") or qa.get("size_bytes"),
    }


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

    if config.commit_db and config.activate_assignment:
        _upsert_assignment(sb, config)

    settings_hash = profile["voice_settings_hash"]
    prepared_items: list[dict[str, Any]] = []
    for item in items:
        normalized = normalize_spoken_text(item["spoken_text"])
        th = text_hash(normalized)
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
        prepared_items.append(
            {
                "item": item,
                "normalized": normalized,
                "text_hash": th,
                "cache_key": cache_key,
                "storage_path": storage_path,
            }
        )

    existing_assets_by_cache_key = _load_existing_assets_by_cache_key_chunked(
        sb,
        [prepared["cache_key"] for prepared in prepared_items],
    )
    existing_usages_by_key = _load_existing_usages(
        sb,
        target_language_code=config.target_language,
        voice_profile_key=config.voice_profile_key,
        category_slug=config.category,
    )

    report_items: list[dict[str, Any]] = []
    totals = {
        "items": len(items),
        "existing_ready_assets": 0,
        "existing_usages": 0,
        "skipped_existing": 0,
        "would_generate": 0,
        "generated": 0,
        "failed": 0,
        "provider_calls": 0,
    }
    generated_cache: dict[str, str] = {}

    for prepared in prepared_items:
        item = prepared["item"]
        normalized = prepared["normalized"]
        th = prepared["text_hash"]
        cache_key = prepared["cache_key"]
        storage_path = prepared["storage_path"]
        existing_asset = existing_assets_by_cache_key.get(cache_key)
        existing_usage = existing_usages_by_key.get(
            _usage_lookup_key(item["target_language_code"], item["category_slug"], item["concept_id"])
        )
        asset_ready = existing_asset is not None and existing_asset.get("status") == "ready"
        if asset_ready:
            totals["existing_ready_assets"] += 1
        if existing_usage:
            totals["existing_usages"] += 1

        base_report = {
            "concept_id": item["concept_id"],
            "english_qa_label": item.get("english_qa_label") or item.get("source_concept"),
            "spoken_text": item["spoken_text"],
            "target_term": item.get("target_term") or item["spoken_text"],
            "target_language_code": item["target_language_code"],
            "category_slug": item["category_slug"],
            "level_number": int(item["level_number"]),
            "order": item.get("order"),
            "part_of_speech": item.get("part_of_speech"),
            "sense": item.get("sense"),
            "voice_profile_key": config.voice_profile_key,
            "resolved_voice_name": profile.get("resolved_voice_name"),
            "postprocess_mode": config.postprocess_mode,
            "raw_duration_ms": None,
            "final_duration_ms": None,
            "raw_file_size_bytes": None,
            "final_file_size_bytes": None,
            "normalized_text": normalized,
            "cache_key": cache_key,
            "storage_path": storage_path,
            "asset_id": existing_asset.get("id") if existing_asset else None,
            "usage_id": existing_usage.get("id") if existing_usage else None,
            "public_url": existing_asset.get("public_url") if existing_asset else None,
            "qa_status": config.qa_status,
            "warnings": [],
            "errors": [],
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
                qa_status=config.qa_status,
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
                    qa_status=config.qa_status,
                )
                totals["skipped_existing"] += 1
                report_items.append({**base_report, "status": "linked_generated_duplicate", "usage_id": usage["id"]})
                continue

            if totals["provider_calls"] >= config.max_provider_calls:
                raise RuntimeError(
                    f"Provider call cap exceeded: max {config.max_provider_calls} ElevenLabs calls for this run."
                )
            totals["provider_calls"] += 1
            raw_audio = _maybe_await(
                provider_synthesize(
                    text=normalized,
                    voice_id=profile["provider_voice_id"],
                    model_id=profile.get("provider_model_id") or DEFAULT_MODEL_ID,
                    output_format=profile.get("output_format") or DEFAULT_OUTPUT_FORMAT,
                    voice_settings=profile.get("voice_settings") or dict(DEFAULT_VOICE_SETTINGS),
                    language_code=profile.get("resolved_voice_language_code") or item["target_language_code"],
                    request_id=cache_key[:32],
                )
            )
            processed_audio, duration_ms, qa = postprocess_audio(raw_audio, postprocess_mode=config.postprocess_mode)
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
                qa_status=config.qa_status,
            )
            generated_cache[cache_key] = asset["id"]
            totals["generated"] += 1
            warnings = _item_warnings(item["spoken_text"], qa)
            report_items.append(
                {
                    **base_report,
                    "status": "generated",
                    "asset_id": asset["id"],
                    "usage_id": usage["id"],
                    "public_url": public_url,
                    "qa_status": config.qa_status,
                    **_flatten_postprocess_qa(qa),
                    "warnings": warnings,
                    "errors": [],
                    "postprocess": qa,
                }
            )
        except Exception as exc:  # noqa: BLE001 - batch must continue and report item failure
            totals["failed"] += 1
            report_items.append({**base_report, "status": "failed", "error": str(exc), "errors": [str(exc)]})

    return {
        "mode": "commit" if config.commit_db else "dry-run",
        "target_language": config.target_language,
        "category": config.category or "all",
        "voice_profile": {
            "voice_profile_key": config.voice_profile_key,
            "target_language_code": profile.get("target_language_code"),
            "provider": profile.get("provider") or DEFAULT_PROVIDER,
            "provider_model_id": profile.get("provider_model_id") or DEFAULT_MODEL_ID,
            "output_format": profile.get("output_format") or DEFAULT_OUTPUT_FORMAT,
            "resolved_from_existing_profile": not profile.get("planned", False),
            "resolved_profile_name": profile.get("resolved_profile_name"),
            "resolved_voice_name": profile.get("resolved_voice_name"),
            "resolved_voice_language": profile.get("resolved_voice_language"),
            "resolved_voice_language_code": profile.get("resolved_voice_language_code"),
            "provider_voice_id_last4": str(profile.get("provider_voice_id") or "")[-4:],
            "postprocess_mode": config.postprocess_mode,
            "qa_status": config.qa_status,
            "activate_assignment": config.activate_assignment,
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


def write_listening_html(report: dict[str, Any], out_path: str) -> None:
    rows: list[str] = []
    items = sorted(
        report.get("items") or [],
        key=lambda item: (
            str(item.get("category_slug") or ""),
            int(item.get("level_number") or 0),
            int(item.get("order") or 0),
            str(item.get("concept_id") or ""),
        ),
    )
    for item in items:
        public_url = str(item.get("public_url") or "")
        if not public_url:
            continue
        rows.append(
            "<tr>"
            f"<td>{html.escape(str(item.get('category_slug') or ''))}</td>"
            f"<td>{html.escape(str(item.get('level_number') or ''))}</td>"
            f"<td>{html.escape(str(item.get('concept_id') or ''))}</td>"
            f"<td>{html.escape(str(item.get('target_term') or ''))}</td>"
            f"<td>{html.escape(str(item.get('english_qa_label') or ''))}</td>"
            f"<td>{html.escape(str(item.get('spoken_text') or ''))}</td>"
            f"<td><audio controls preload=\"none\" src=\"{html.escape(public_url, quote=True)}\"></audio></td>"
            "</tr>"
        )

    payload = """<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Static Thematic TTS Listening Index</title>
  <style>
    body { font-family: system-ui, sans-serif; margin: 24px; color: #111827; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border-bottom: 1px solid #d1d5db; padding: 10px; text-align: left; vertical-align: middle; }
    th { font-size: 12px; text-transform: uppercase; letter-spacing: .04em; color: #4b5563; }
    audio { width: 320px; max-width: 100%; }
  </style>
</head>
<body>
  <h1>Static Thematic TTS Listening Index</h1>
  <table>
    <thead>
      <tr><th>Category</th><th>Level</th><th>Concept ID</th><th>Visible Term</th><th>English QA Label</th><th>Spoken Text</th><th>Audio</th></tr>
    </thead>
    <tbody>
      __ROWS__
    </tbody>
  </table>
</body>
</html>
"""
    out = Path(out_path)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(payload.replace("      __ROWS__", "\n      ".join(rows)), encoding="utf-8")


def _build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Static thematic TTS generator.")
    parser.add_argument("--inventory", required=True)
    parser.add_argument("--target-language", default="en")
    parser.add_argument("--category", default=None)
    parser.add_argument("--voice-profile-key", default="static_thematic_en_animals_v1")
    parser.add_argument("--profile-name", default=None)
    parser.add_argument("--voice-name", default=None)
    parser.add_argument("--provider-voice-id", default=None)
    parser.add_argument("--dry-run", action="store_true", help="Default. No DB writes or provider calls.")
    parser.add_argument("--commit-db", action="store_true", help="Write DB/storage and generate missing audio.")
    parser.add_argument("--allow-provider-calls", action="store_true", help="Required before ElevenLabs calls.")
    parser.add_argument("--skip-existing", dest="skip_existing", action="store_true", default=True)
    parser.add_argument("--no-skip-existing", dest="skip_existing", action="store_false")
    parser.add_argument("--force-regenerate", action="store_true", default=False)
    parser.add_argument("--limit", type=int, default=None)
    parser.add_argument("--allow-raw-audio", action="store_true", default=False, help="Deprecated alias for --postprocess-mode raw.")
    parser.add_argument("--postprocess-mode", choices=["raw", "safe"], default="raw")
    parser.add_argument("--qa-status", choices=sorted(SUPPORTED_QA_STATUSES), default="ready")
    parser.add_argument("--activate-assignment", action="store_true", default=False)
    parser.add_argument("--max-provider-calls", type=int, default=10)
    parser.add_argument("--report-out", default="tmp/static-tts-en-animals-report.json")
    parser.add_argument("--listening-html-out", default=None)
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
        profile_name=args.profile_name,
        voice_name=args.voice_name,
        provider_voice_id=args.provider_voice_id,
        commit_db=bool(args.commit_db),
        allow_provider_calls=bool(args.allow_provider_calls),
        skip_existing=bool(args.skip_existing),
        force_regenerate=bool(args.force_regenerate),
        limit=args.limit,
        allow_raw_audio=bool(args.allow_raw_audio),
        postprocess_mode="raw" if args.allow_raw_audio else args.postprocess_mode,
        qa_status=args.qa_status,
        activate_assignment=bool(args.activate_assignment),
        max_provider_calls=args.max_provider_calls,
        report_out=args.report_out,
        listening_html_out=args.listening_html_out,
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
    if config.listening_html_out:
        write_listening_html(report, config.listening_html_out)
    sys.stdout.write(payload + "\n")
    return 0 if report["totals"]["failed"] == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
