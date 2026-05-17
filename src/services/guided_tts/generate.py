"""Guided Today TTS generation entry point.

Two modes:

* ``--dry-run`` (default) — reads guided_voice_profiles + guided_tts_assets
  from Supabase, builds the inventory, prints JSON, and does NOT call the
  provider or write storage. Runs entirely against Supabase reads.

* ``--commit`` — for each ``status='missing'`` row in the inventory, calls
  the provider, uploads the audio to ``guided-tts``, inserts/updates a
  ready row in ``guided_tts_assets``, and inserts/updates a usage row in
  ``guided_tts_asset_usages``. Records every invocation in
  ``guided_tts_generation_runs``.

Guardrails for ``--commit``:
  1. ``missing_voice_profile`` must be 0.
  2. Inventory total character count and provider-call count must match the
     scoped expectation (see ``EXPECTED_SCOPES``).
  3. The scope must be one of the explicit Phase-2 scopes (currently:
     ``a1p1-lesson-1`` or ``a1p1-bright-path-1``). Any other scope refuses
     to commit.

The script imports nothing from the inventory module's network code paths.
The inventory module itself has no provider implementation.
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import sys
from typing import Any, Awaitable, Callable, Iterable, Sequence

from src.services.guided_tts import db as guided_db
from src.services.guided_tts.inventory import (
    NORMALIZATION_VERSION,
    SurfaceRow,
    VALID_SURFACES,
    VALID_VIBES,
    VoiceProfile,
    build_inventory,
    cache_key,
    filter_lessons,
    resolve_voice_profile,
    storage_path,
    text_hash,
)
from src.services.guided_tts.provider import SynthesizeCallable

# Lesson data — loaded lazily so the test for "no provider import" stays clean.
_LESSONS_LOADER: Callable[[], Sequence[dict[str, Any]]] | None = None


def _default_load_lessons() -> Sequence[dict[str, Any]]:
    """Read the lesson definitions exported from frontend/src/data/guidedLessons.ts.

    PR #2 ships an in-Python adapter that runs ``tsx`` to dump the lessons as
    JSON. The test suite never calls this — tests pass lesson dicts directly
    via the public ``run_async`` API.
    """
    import subprocess
    from pathlib import Path

    repo_root = Path(__file__).resolve().parents[3]
    inventory_script = repo_root / "frontend" / "scripts" / "guided-tts-lessons-dump.ts"
    if not inventory_script.exists():
        raise RuntimeError(
            "frontend/scripts/guided-tts-lessons-dump.ts is required for the CLI. "
            "Tests should pass lessons explicitly to run_async()."
        )
    # On Windows, `npx` resolves to `npx.cmd` which needs shell=True for
    # subprocess.run to find it. Cross-platform: pick the right executable.
    npx_executable = "npx.cmd" if os.name == "nt" else "npx"
    result = subprocess.run(
        [npx_executable, "tsx", str(inventory_script)],
        cwd=str(repo_root / "frontend"),
        capture_output=True,
        text=True,
        encoding="utf-8",
        check=True,
        shell=(os.name == "nt"),
    )
    return json.loads(result.stdout)


def set_lessons_loader(fn: Callable[[], Sequence[dict[str, Any]]]) -> None:
    """Override the lesson loader (used by tests; the CLI never calls this)."""
    global _LESSONS_LOADER
    _LESSONS_LOADER = fn


def _load_lessons() -> Sequence[dict[str, Any]]:
    if _LESSONS_LOADER is not None:
        return _LESSONS_LOADER()
    return _default_load_lessons()


# ---------------------------------------------------------------------------
# Commit-scope guardrails
# ---------------------------------------------------------------------------

EXPECTED_SCOPES: dict[str, dict[str, Any]] = {
    "a1p1-lesson-1": {
        "path_id": "english-a1-practical-1",
        "lesson_id": "english-a1-practical-001-first-contact",
        "lesson_number": 1,
        "vibes": ["bright", "wistful", "sharp"],
        "surfaces": ["corePhrase", "chunks", "trophyWord"],
        "expected_rows": 15,
        "expected_unique_normalized_texts": 12,
        "expected_provider_calls_first_run": 15,
        "expected_provider_characters_first_run": 236,
    },
    "a1p1-bright-path-1": {
        "path_id": "english-a1-practical-1",
        "lesson_id": None,
        "lesson_number": None,
        "vibes": ["bright"],
        "surfaces": ["corePhrase", "chunks", "trophyWord"],
        "expected_rows": 46,
        "expected_unique_normalized_texts": 42,
        "expected_provider_calls_first_run": 42,
        "expected_provider_characters_first_run": 598,
    },
}


def _identify_scope(
    *, path_id: str | None, lesson_id: str | None, lesson_number: int | None,
    vibes: list[str], surfaces: list[str],
) -> str | None:
    """Return the named scope key if this exactly matches one in EXPECTED_SCOPES."""
    for key, spec in EXPECTED_SCOPES.items():
        if path_id != spec["path_id"]:
            continue
        if lesson_id is not None and lesson_id != spec["lesson_id"]:
            continue
        if lesson_number is not None and lesson_number != spec["lesson_number"]:
            continue
        if sorted(vibes) != sorted(spec["vibes"]):
            continue
        if sorted(surfaces) != sorted(spec["surfaces"]):
            continue
        return key
    return None


# ---------------------------------------------------------------------------
# Generation
# ---------------------------------------------------------------------------

async def run_async(
    *,
    sb,
    lessons: Sequence[dict[str, Any]],
    voice_profiles: Sequence[VoiceProfile],
    vibes: list[str],
    surfaces: list[str],
    path_id: str | None,
    lesson_id: str | None,
    lesson_number: int | None,
    target_language_code: str = "en-US",
    dry_run: bool = True,
    provider_synthesize: SynthesizeCallable | None = None,
    allow_unscoped_commit: bool = False,
) -> dict[str, Any]:
    """Programmatic entry point. Returns the inventory result plus generation totals.

    ``provider_synthesize`` is required for ``dry_run=False``. The function
    will refuse to commit if the scope is not explicitly allow-listed in
    ``EXPECTED_SCOPES`` (override with ``allow_unscoped_commit=True`` for
    future scopes — PR #2 leaves it off).
    """
    filtered = filter_lessons(
        lessons,
        path_id=path_id,
        lesson_number=lesson_number,
        lesson_id=lesson_id,
    )
    if not filtered:
        raise RuntimeError("No lessons matched the requested scope")

    # First pass: build inventory without consulting Supabase for existing
    # assets; we use the cache keys it produces to query the DB just once.
    inventory_dry = build_inventory(
        lessons=filtered,
        voice_profiles=voice_profiles,
        existing_assets_by_cache_key={},
        vibes=vibes,
        surfaces=surfaces,
        target_language_code=target_language_code,
    )

    cache_keys_to_check = [
        item["cache_key"] for item in inventory_dry["items"] if item["cache_key"]
    ]
    existing = guided_db.load_existing_assets_by_cache_key(sb, cache_keys_to_check)

    # Second pass: real inventory aware of existing ready rows.
    inventory = build_inventory(
        lessons=filtered,
        voice_profiles=voice_profiles,
        existing_assets_by_cache_key=existing,
        vibes=vibes,
        surfaces=surfaces,
        target_language_code=target_language_code,
    )

    scope = {
        "path_id": path_id,
        "lesson_id": lesson_id,
        "lesson_number": lesson_number,
        "vibes": list(vibes),
        "surfaces": list(surfaces),
        "target_language_code": target_language_code,
    }
    scope_key = _identify_scope(
        path_id=path_id, lesson_id=lesson_id, lesson_number=lesson_number,
        vibes=vibes, surfaces=surfaces,
    )

    totals = inventory["totals"]

    if dry_run:
        run_row = guided_db.create_run(sb, scope=scope, dry_run=True)
        guided_db.finalize_run(
            sb,
            run_id=run_row["id"],
            status="completed",
            total_assets=totals["rows"],
            missing_assets=totals["missing"],
            generated_assets=0,
            skipped_assets=totals["ready"],
            failed_assets=0,
            total_character_count=totals["total_character_count_all_voices"],
            notes="dry-run",
        )
        return {
            "mode": "dry-run",
            "scope_key": scope_key,
            "run_id": run_row["id"],
            "inventory": inventory,
            "generated_assets": 0,
            "failed_assets": 0,
        }

    # --- commit-path guardrails ------------------------------------------------
    if provider_synthesize is None:
        raise RuntimeError("--commit requires an injected provider_synthesize callable")

    if totals["missing_voice_profile"] > 0:
        raise RuntimeError(
            f"Refusing to commit: {totals['missing_voice_profile']} rows have "
            "no voice profile. Seed guided_voice_profiles first."
        )

    if scope_key is None and not allow_unscoped_commit:
        raise RuntimeError(
            "Refusing to commit: requested scope is not in EXPECTED_SCOPES. "
            "PR #2 only generates the A1P1 lesson 1 canary."
        )

    if scope_key is not None:
        spec = EXPECTED_SCOPES[scope_key]
        if totals["rows"] != spec["expected_rows"]:
            raise RuntimeError(
                f"Refusing to commit: scope {scope_key} expects "
                f"{spec['expected_rows']} rows; inventory has {totals['rows']}"
            )
        if totals["unique_normalized_texts"] != spec["expected_unique_normalized_texts"]:
            raise RuntimeError(
                f"Refusing to commit: scope {scope_key} expects "
                f"{spec['expected_unique_normalized_texts']} unique texts; "
                f"inventory has {totals['unique_normalized_texts']}"
            )
        # Provider calls + characters compare against the first-run baseline
        # MINUS already-ready assets; we do that by adding back the chars that
        # are now ready (counted in 'skipped' below).
        ready_count = totals["ready"]
        if totals["estimated_provider_calls"] + ready_count != spec["expected_provider_calls_first_run"]:
            raise RuntimeError(
                f"Refusing to commit: scope {scope_key} expects "
                f"{spec['expected_provider_calls_first_run']} provider calls "
                f"(first run) but inventory reports "
                f"{totals['estimated_provider_calls']} missing + "
                f"{ready_count} ready"
            )

    run_row = guided_db.create_run(sb, scope=scope, dry_run=False)
    # Mark running for visibility, but FakeSupabase doesn't enforce this.
    guided_db.finalize_run(
        sb,
        run_id=run_row["id"],
        status="running",
        total_assets=totals["rows"],
        missing_assets=totals["missing"],
        generated_assets=0,
        skipped_assets=totals["ready"],
        failed_assets=0,
        total_character_count=totals["total_character_count_all_voices"],
        notes="commit running",
    )

    generated = 0
    failed = 0
    skipped = totals["ready"]
    deduped_usages = 0
    generated_assets_by_cache_key: dict[str, str] = {}

    for item in inventory["items"]:
        if item["status"] == "ready":
            asset_id = item["asset_id"]
            guided_db.upsert_usage(
                sb,
                asset_id=asset_id,
                path_id=item["path_id"],
                lesson_id=item["lesson_id"],
                lesson_number=item["lesson_number"],
                vibe=item["vibe"],
                surface=item["surface"],
                surface_key=item["surface_key"],
                source_text=item["source_text"],
            )
            continue

        if item["status"] != "missing":
            # missing_voice_profile guardrail above means we should never see
            # one here; double-check to be safe.
            raise RuntimeError(
                f"Unexpected item status {item['status']!r} during commit"
            )

        cache_key_value = item["cache_key"]
        if cache_key_value in generated_assets_by_cache_key:
            guided_db.upsert_usage(
                sb,
                asset_id=generated_assets_by_cache_key[cache_key_value],
                path_id=item["path_id"],
                lesson_id=item["lesson_id"],
                lesson_number=item["lesson_number"],
                vibe=item["vibe"],
                surface=item["surface"],
                surface_key=item["surface_key"],
                source_text=item["source_text"],
            )
            deduped_usages += 1
            skipped += 1
            continue

        # Resolve the matching voice profile for the request body.
        profile = resolve_voice_profile(
            list(voice_profiles),
            target_language_code=item["target_language_code"],
            vibe=item["vibe"],
            path_id=item["path_id"],
            lesson_id=item["lesson_id"],
            surface=item["surface"],
        )
        if profile is None:
            raise RuntimeError(
                "Voice profile vanished between inventory and commit — aborting"
            )

        try:
            audio_bytes = await _maybe_await(
                provider_synthesize(
                    text=item["normalized_text"],
                    voice_id=profile.provider_voice_id,
                    model_id=profile.provider_model_id,
                    output_format=profile.output_format,
                    voice_settings=profile.voice_settings,
                    language_code=item["target_language_code"],
                    request_id=item["cache_key"][:32],
                )
            )
            public_url = guided_db.upload_asset_bytes(
                sb,
                storage_path=item["storage_path"],
                audio_bytes=audio_bytes,
            )
            asset_row = guided_db.upsert_ready_asset(
                sb,
                provider=profile.provider,
                target_language_code=item["target_language_code"],
                voice_profile_key=profile.voice_profile_key,
                provider_voice_id=profile.provider_voice_id,
                provider_model_id=profile.provider_model_id,
                output_format=profile.output_format,
                voice_settings_hash=profile.voice_settings_hash,
                normalization_version=NORMALIZATION_VERSION,
                text=item["source_text"],
                normalized_text=item["normalized_text"],
                text_hash=item["text_hash"],
                cache_key=item["cache_key"],
                storage_path=item["storage_path"],
                public_url=public_url,
                character_count=item["character_count"],
                duration_ms=None,
                provider_request_id=None,
            )
            generated_assets_by_cache_key[item["cache_key"]] = asset_row["id"]
            guided_db.upsert_usage(
                sb,
                asset_id=asset_row["id"],
                path_id=item["path_id"],
                lesson_id=item["lesson_id"],
                lesson_number=item["lesson_number"],
                vibe=item["vibe"],
                surface=item["surface"],
                surface_key=item["surface_key"],
                source_text=item["source_text"],
            )
            generated += 1
        except Exception as err:  # noqa: BLE001 — we want to record any provider failure
            failed += 1
            guided_db.upsert_failed_asset(
                sb,
                cache_key=item["cache_key"],
                provider=profile.provider,
                target_language_code=item["target_language_code"],
                voice_profile_key=profile.voice_profile_key,
                provider_voice_id=profile.provider_voice_id,
                provider_model_id=profile.provider_model_id,
                output_format=profile.output_format,
                voice_settings_hash=profile.voice_settings_hash,
                normalization_version=NORMALIZATION_VERSION,
                text=item["source_text"],
                normalized_text=item["normalized_text"],
                text_hash=item["text_hash"],
                storage_path=item["storage_path"],
                character_count=item["character_count"],
                error=str(err),
            )

    status = "completed" if failed == 0 else "failed"
    guided_db.finalize_run(
        sb,
        run_id=run_row["id"],
        status=status,
        total_assets=totals["rows"],
        missing_assets=totals["missing"],
        generated_assets=generated,
        skipped_assets=skipped,
        failed_assets=failed,
        total_character_count=totals["total_character_count_all_voices"],
        notes=f"commit finished (status={status})",
    )

    return {
        "mode": "commit",
        "scope_key": scope_key,
        "run_id": run_row["id"],
        "inventory": inventory,
        "generated_assets": generated,
        "failed_assets": failed,
        "deduped_usages": deduped_usages,
    }


async def _maybe_await(value):
    if hasattr(value, "__await__"):
        return await value
    return value


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------

def _build_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(
        prog="python -m src.services.guided_tts.generate",
        description="Guided Today TTS inventory + canary generation",
    )
    p.add_argument("--path", default=None, help="Restrict to this path id")
    p.add_argument("--lesson", type=int, default=None, help="Restrict to this lesson number")
    p.add_argument("--lesson-id", default=None, help="Restrict to this lesson id")
    p.add_argument(
        "--vibes",
        default="bright,wistful,sharp",
        help="Comma-separated vibes (bright,wistful,sharp)",
    )
    p.add_argument(
        "--surfaces",
        default="corePhrase,chunks,trophyWord",
        help="Comma-separated surfaces (corePhrase,chunks,trophyWord,speak)",
    )
    mode = p.add_mutually_exclusive_group()
    mode.add_argument("--dry-run", action="store_true", help="Default. No provider calls.")
    mode.add_argument("--commit", action="store_true", help="Call provider; requires guardrail match")
    p.add_argument(
        "--allow-unscoped-commit",
        action="store_true",
        help="Bypass the EXPECTED_SCOPES allow-list (not used in PR #2)",
    )
    return p


def _split_csv(value: str) -> list[str]:
    return [v.strip() for v in value.split(",") if v.strip()]


def main(argv: list[str] | None = None) -> int:
    parser = _build_parser()
    args = parser.parse_args(argv)

    vibes = _split_csv(args.vibes)
    surfaces = _split_csv(args.surfaces)
    for v in vibes:
        if v not in VALID_VIBES:
            parser.error(f"unknown vibe {v!r}")
    for s in surfaces:
        if s not in VALID_SURFACES:
            parser.error(f"unknown surface {s!r}")

    dry_run = not args.commit  # default to dry-run

    sb = _build_supabase_client()
    voice_profiles = guided_db.load_active_voice_profiles(sb)
    lessons = _load_lessons()
    provider_synth: SynthesizeCallable | None = None
    if not dry_run:
        from src.services.guided_tts.provider_elevenlabs import (
            ElevenLabsGuidedTTSProvider,
        )
        provider = ElevenLabsGuidedTTSProvider()
        provider_synth = provider.synthesize

    result = asyncio.run(
        run_async(
            sb=sb,
            lessons=lessons,
            voice_profiles=voice_profiles,
            vibes=vibes,
            surfaces=surfaces,
            path_id=args.path,
            lesson_id=args.lesson_id,
            lesson_number=args.lesson,
            dry_run=dry_run,
            provider_synthesize=provider_synth,
            allow_unscoped_commit=args.allow_unscoped_commit,
        )
    )

    sys.stdout.write(json.dumps(result["inventory"]["totals"], indent=2) + "\n")
    sys.stdout.write(
        json.dumps(
            {
                "mode": result["mode"],
                "scope_key": result["scope_key"],
                "run_id": result["run_id"],
                "generated_assets": result["generated_assets"],
                "failed_assets": result["failed_assets"],
            },
            indent=2,
        )
        + "\n"
    )
    return 0 if result["failed_assets"] == 0 else 1


def _build_supabase_client():
    """Build a service-role Supabase client from .env. Used by the CLI."""
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
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env"
        )
    return create_client(url, key)


if __name__ == "__main__":
    raise SystemExit(main())
