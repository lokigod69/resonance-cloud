"""Supabase read/write helpers for Guided Today TTS.

The DB shape mirrors the migration in
``frontend/supabase/migrations/20260517010000_guided_tts_v1.sql``.

Functions here all take an ``sb`` argument (supabase-py client or compatible
FakeSupabase) so tests can swap in an in-memory backend. None of these
helpers calls the provider; they only touch Supabase.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any, Iterable

from src.services.guided_tts.inventory import (
    DEFAULT_MODEL_ID,
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_PROVIDER,
    DEFAULT_VOICE_SETTINGS,
    VoiceProfile,
)

BUCKET = "guided-tts"
CONTENT_TYPE = "audio/mpeg"


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ---------------------------------------------------------------------------
# voices (raw provider voice library)
# ---------------------------------------------------------------------------

def find_voices_by_name(
    sb,
    *,
    names: Iterable[str],
    language_codes: Iterable[str] = ("en", "en-US", "en-GB"),
) -> dict[str, list[dict[str, Any]]]:
    """Return a name → list[voice] mapping for the requested names.

    Lookup is case-insensitive and matches when the candidate row's ``name``
    starts with the requested string. Returns lists so the caller can detect
    ambiguity and stop before seeding.
    """
    wanted = [n.strip() for n in names if n.strip()]
    lc_codes = {c.strip() for c in language_codes if c.strip()}

    rows = sb.table("voices").select("*").execute().data or []
    out: dict[str, list[dict[str, Any]]] = {n: [] for n in wanted}
    for row in rows:
        row_lang = (row.get("language_code") or "").strip()
        if lc_codes and row_lang not in lc_codes:
            continue
        row_name = (row.get("name") or "").strip()
        if not row_name:
            continue
        for name in wanted:
            if row_name.lower().startswith(name.lower()):
                out[name].append(row)
    return out


# ---------------------------------------------------------------------------
# guided_voice_profiles
# ---------------------------------------------------------------------------

def load_active_voice_profiles(sb) -> list[VoiceProfile]:
    """Load every active guided_voice_profile and return as VoiceProfile dataclasses."""
    rows = (
        sb.table("guided_voice_profiles")
        .select("*")
        .eq("active", True)
        .execute()
        .data
        or []
    )
    profiles: list[VoiceProfile] = []
    for row in rows:
        profiles.append(
            VoiceProfile(
                voice_profile_key=row["voice_profile_key"],
                provider=row.get("provider") or DEFAULT_PROVIDER,
                target_language_code=row["target_language_code"],
                vibe=row.get("vibe"),
                scope_path_id=row.get("scope_path_id"),
                scope_lesson_id=row.get("scope_lesson_id"),
                scope_surface=row.get("scope_surface"),
                provider_voice_id=row["provider_voice_id"],
                provider_model_id=row.get("provider_model_id") or DEFAULT_MODEL_ID,
                output_format=row.get("output_format") or DEFAULT_OUTPUT_FORMAT,
                voice_settings=row.get("voice_settings") or dict(DEFAULT_VOICE_SETTINGS),
                voice_settings_hash=row["voice_settings_hash"],
                assignment_version=row.get("assignment_version") or 1,
                active=bool(row.get("active", True)),
                priority=row.get("priority") or 100,
            )
        )
    return profiles


def upsert_voice_profile(
    sb,
    *,
    voice_profile_key: str,
    target_language_code: str,
    vibe: str | None,
    provider_voice_id: str,
    voice_settings_hash: str,
    provider: str = DEFAULT_PROVIDER,
    provider_model_id: str = DEFAULT_MODEL_ID,
    output_format: str = DEFAULT_OUTPUT_FORMAT,
    voice_settings: dict[str, Any] | None = None,
    assignment_version: int = 1,
    active: bool = True,
    priority: int = 100,
    notes: str | None = None,
    scope_path_id: str | None = None,
    scope_lesson_id: str | None = None,
    scope_surface: str | None = None,
) -> dict[str, Any]:
    """Idempotent upsert by ``voice_profile_key``.

    If an active row with the same key exists, it is updated; otherwise a new
    row is inserted. This is the seed-script path that runs under
    service-role and bypasses the admin RPC (we still want the audit value
    of a single dedicated seed entry point — see the report).
    """
    existing_resp = (
        sb.table("guided_voice_profiles")
        .select("*")
        .eq("voice_profile_key", voice_profile_key)
        .execute()
    )
    existing_rows = existing_resp.data or []

    payload: dict[str, Any] = {
        "voice_profile_key": voice_profile_key,
        "provider": provider,
        "target_language_code": target_language_code,
        "vibe": vibe,
        "scope_path_id": scope_path_id,
        "scope_lesson_id": scope_lesson_id,
        "scope_surface": scope_surface,
        "provider_voice_id": provider_voice_id,
        "provider_model_id": provider_model_id,
        "output_format": output_format,
        "voice_settings": voice_settings or dict(DEFAULT_VOICE_SETTINGS),
        "voice_settings_hash": voice_settings_hash,
        "assignment_version": assignment_version,
        "active": active,
        "priority": priority,
        "notes": notes,
        "updated_at": _now_iso(),
    }

    if existing_rows:
        row_id = existing_rows[0]["id"]
        updated = (
            sb.table("guided_voice_profiles")
            .update(payload)
            .eq("id", row_id)
            .execute()
            .data
            or []
        )
        return updated[0] if updated else dict(existing_rows[0], **payload)

    inserted = (
        sb.table("guided_voice_profiles")
        .insert({**payload, "created_at": _now_iso()})
        .execute()
        .data
        or []
    )
    if not inserted:
        raise RuntimeError(
            f"guided_voice_profiles insert returned no row for key {voice_profile_key!r}"
        )
    return inserted[0]


# ---------------------------------------------------------------------------
# guided_tts_assets
# ---------------------------------------------------------------------------

def load_existing_assets_by_cache_key(
    sb,
    cache_keys: Iterable[str],
    *,
    batch_size: int = 100,
) -> dict[str, dict[str, Any]]:
    """Fetch existing guided_tts_assets indexed by cache_key.

    Batched: PostgREST encodes ``in.(...)`` filters in the URL, and a few
    hundred 64-char cache keys exceed the server's URL length limit (400).
    """
    keys = sorted({k for k in cache_keys if k})
    if not keys:
        return {}
    out: dict[str, dict[str, Any]] = {}
    for start in range(0, len(keys), batch_size):
        rows = (
            sb.table("guided_tts_assets")
            .select("*")
            .in_("cache_key", keys[start : start + batch_size])
            .execute()
            .data
            or []
        )
        for row in rows:
            out[row["cache_key"]] = row
    return out


def upsert_ready_asset(
    sb,
    *,
    provider: str,
    target_language_code: str,
    voice_profile_key: str,
    provider_voice_id: str,
    provider_model_id: str,
    output_format: str,
    voice_settings_hash: str,
    normalization_version: str,
    text: str,
    normalized_text: str,
    text_hash: str,
    cache_key: str,
    storage_path: str,
    public_url: str,
    character_count: int,
    duration_ms: int | None,
    provider_request_id: str | None,
    content_commit_sha: str | None = None,
) -> dict[str, Any]:
    """Insert a ready asset row, or update an existing row to ready."""
    now = _now_iso()
    payload = {
        "provider": provider,
        "target_language_code": target_language_code,
        "voice_profile_key": voice_profile_key,
        "provider_voice_id": provider_voice_id,
        "provider_model_id": provider_model_id,
        "output_format": output_format,
        "voice_settings_hash": voice_settings_hash,
        "normalization_version": normalization_version,
        "text": text,
        "normalized_text": normalized_text,
        "text_hash": text_hash,
        "cache_key": cache_key,
        "storage_bucket": BUCKET,
        "storage_path": storage_path,
        "public_url": public_url,
        "content_type": CONTENT_TYPE,
        "duration_ms": duration_ms,
        "character_count": character_count,
        "status": "ready",
        "error": None,
        "provider_request_id": provider_request_id,
        "content_commit_sha": content_commit_sha,
        "generated_at": now,
        "updated_at": now,
    }

    existing_resp = (
        sb.table("guided_tts_assets")
        .select("id")
        .eq("cache_key", cache_key)
        .execute()
    )
    existing = existing_resp.data or []
    if existing:
        row_id = existing[0]["id"]
        updated = (
            sb.table("guided_tts_assets")
            .update(payload)
            .eq("id", row_id)
            .execute()
            .data
            or []
        )
        return updated[0] if updated else dict(existing[0], **payload)

    inserted = (
        sb.table("guided_tts_assets")
        .insert({**payload, "created_at": now})
        .execute()
        .data
        or []
    )
    if not inserted:
        raise RuntimeError(
            f"guided_tts_assets insert returned no row for cache_key {cache_key!r}"
        )
    return inserted[0]


def upsert_failed_asset(
    sb,
    *,
    cache_key: str,
    provider: str,
    target_language_code: str,
    voice_profile_key: str,
    provider_voice_id: str,
    provider_model_id: str,
    output_format: str,
    voice_settings_hash: str,
    normalization_version: str,
    text: str,
    normalized_text: str,
    text_hash: str,
    storage_path: str,
    character_count: int,
    error: str,
) -> dict[str, Any]:
    """Insert or update an asset row with ``status = 'failed'`` for diagnostics."""
    now = _now_iso()
    payload = {
        "provider": provider,
        "target_language_code": target_language_code,
        "voice_profile_key": voice_profile_key,
        "provider_voice_id": provider_voice_id,
        "provider_model_id": provider_model_id,
        "output_format": output_format,
        "voice_settings_hash": voice_settings_hash,
        "normalization_version": normalization_version,
        "text": text,
        "normalized_text": normalized_text,
        "text_hash": text_hash,
        "cache_key": cache_key,
        "storage_bucket": BUCKET,
        "storage_path": storage_path,
        "public_url": None,
        "content_type": CONTENT_TYPE,
        "duration_ms": None,
        "character_count": character_count,
        "status": "failed",
        "error": error[:500] if error else "unknown",
        "provider_request_id": None,
        "generated_at": None,
        "updated_at": now,
    }
    existing_resp = (
        sb.table("guided_tts_assets")
        .select("id")
        .eq("cache_key", cache_key)
        .execute()
    )
    existing = existing_resp.data or []
    if existing:
        row_id = existing[0]["id"]
        sb.table("guided_tts_assets").update(payload).eq("id", row_id).execute()
        return {**existing[0], **payload}

    inserted = (
        sb.table("guided_tts_assets")
        .insert({**payload, "created_at": now})
        .execute()
        .data
        or []
    )
    if not inserted:
        raise RuntimeError(
            f"guided_tts_assets failed-insert returned no row for cache_key {cache_key!r}"
        )
    return inserted[0]


# ---------------------------------------------------------------------------
# guided_tts_asset_usages
# ---------------------------------------------------------------------------

def upsert_usage(
    sb,
    *,
    asset_id: str,
    path_id: str,
    lesson_id: str,
    lesson_number: int,
    vibe: str,
    surface: str,
    surface_key: str,
    source_text: str,
) -> dict[str, Any]:
    """Idempotent insert on (path_id, lesson_id, vibe, surface, surface_key)."""
    existing_resp = (
        sb.table("guided_tts_asset_usages")
        .select("*")
        .eq("path_id", path_id)
        .eq("lesson_id", lesson_id)
        .eq("vibe", vibe)
        .eq("surface", surface)
        .eq("surface_key", surface_key)
        .execute()
    )
    existing = existing_resp.data or []
    if existing:
        row_id = existing[0]["id"]
        sb.table("guided_tts_asset_usages").update(
            {"asset_id": asset_id, "source_text": source_text}
        ).eq("id", row_id).execute()
        return {**existing[0], "asset_id": asset_id, "source_text": source_text}

    inserted = (
        sb.table("guided_tts_asset_usages")
        .insert(
            {
                "asset_id": asset_id,
                "path_id": path_id,
                "lesson_id": lesson_id,
                "lesson_number": lesson_number,
                "vibe": vibe,
                "surface": surface,
                "surface_key": surface_key,
                "source_text": source_text,
                "created_at": _now_iso(),
            }
        )
        .execute()
        .data
        or []
    )
    if not inserted:
        raise RuntimeError(
            f"guided_tts_asset_usages insert returned no row for "
            f"{path_id}/{lesson_id}/{vibe}/{surface}/{surface_key}"
        )
    return inserted[0]


# ---------------------------------------------------------------------------
# guided_tts_generation_runs
# ---------------------------------------------------------------------------

def create_run(
    sb,
    *,
    scope: dict[str, Any],
    dry_run: bool,
    requested_by: str | None = None,
    notes: str | None = None,
) -> dict[str, Any]:
    inserted = (
        sb.table("guided_tts_generation_runs")
        .insert(
            {
                "scope": scope,
                "dry_run": dry_run,
                "status": "pending",
                "requested_by": requested_by,
                "notes": notes,
                "created_at": _now_iso(),
                "updated_at": _now_iso(),
            }
        )
        .execute()
        .data
        or []
    )
    if not inserted:
        raise RuntimeError("guided_tts_generation_runs insert returned no row")
    return inserted[0]


def finalize_run(
    sb,
    *,
    run_id: str,
    status: str,
    total_assets: int,
    missing_assets: int,
    generated_assets: int,
    skipped_assets: int,
    failed_assets: int,
    total_character_count: int,
    notes: str | None = None,
) -> None:
    payload = {
        "status": status,
        "total_assets": total_assets,
        "missing_assets": missing_assets,
        "generated_assets": generated_assets,
        "skipped_assets": skipped_assets,
        "failed_assets": failed_assets,
        "total_character_count": total_character_count,
        "updated_at": _now_iso(),
    }
    if notes is not None:
        payload["notes"] = notes
    sb.table("guided_tts_generation_runs").update(payload).eq("id", run_id).execute()


# ---------------------------------------------------------------------------
# Storage
# ---------------------------------------------------------------------------

def upload_asset_bytes(sb, *, storage_path: str, audio_bytes: bytes) -> str:
    """Upload bytes to the guided-tts bucket and return the public URL."""
    sb.storage.from_(BUCKET).upload(
        storage_path,
        audio_bytes,
        file_options={"content-type": CONTENT_TYPE, "upsert": "true"},
    )
    return sb.storage.from_(BUCKET).get_public_url(storage_path)


__all__ = [
    "BUCKET",
    "CONTENT_TYPE",
    "find_voices_by_name",
    "load_active_voice_profiles",
    "upsert_voice_profile",
    "load_existing_assets_by_cache_key",
    "upsert_ready_asset",
    "upsert_failed_asset",
    "upsert_usage",
    "create_run",
    "finalize_run",
    "upload_asset_bytes",
]
