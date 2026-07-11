"""Seed the four Phase-2 English Guided voice profiles.

Reads provider voice IDs from the existing `public.voices` library by name
match (case-insensitive prefix) and inserts/updates one row per profile in
`public.guided_voice_profiles` via service-role.

Voice mapping (PR #2, English A1):

    english_default_v1  → Serafina   (no-vibe default for future no-vibe courses)
    english_a1_bright_v1 → Eliza or Elisa
    english_a1_wistful_v1 → Serafina
    english_a1_sharp_v1   → Peter

Usage:
    .venv/Scripts/python.exe scripts/seed_guided_voice_profiles.py
    .venv/Scripts/python.exe scripts/seed_guided_voice_profiles.py --dry-run

Idempotent: re-running updates existing profiles to match the intended state.

The script refuses to seed if any required voice is missing or ambiguous in
`public.voices`. It also refuses to seed if a `--bright-voice-name`
preference is supplied that does not match a row.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from typing import Any

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))

# Append orchestrator root so we can import src.services.guided_tts.*
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase import create_client  # noqa: E402

from src.services.guided_tts import db as guided_db  # noqa: E402
from src.services.guided_tts.inventory import (  # noqa: E402
    DEFAULT_MODEL_ID,
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_VOICE_SETTINGS,
    voice_settings_hash,
)

SETTINGS_HASH = voice_settings_hash(DEFAULT_VOICE_SETTINGS)


def build_client():
    url = os.getenv("SUPABASE_URL", "")
    key = (
        os.getenv("SUPABASE_SERVICE_KEY", "")
        or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
        or os.getenv("SUPABASE_KEY", "")
    )
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(2)
    return create_client(url, key)


def resolve_voice_rows(sb, *, bright_name: str) -> dict[str, dict[str, Any]]:
    """Find the four English voice rows required for the canary."""
    matches = guided_db.find_voices_by_name(
        sb,
        names=["Serafina", "Peter", bright_name],
    )

    problems: list[str] = []

    def pick(name: str) -> dict[str, Any] | None:
        rows = matches.get(name) or []
        if len(rows) == 0:
            problems.append(f"No English voice in public.voices matches {name!r}")
            return None
        if len(rows) > 1:
            preview = ", ".join(f"{r.get('name')} ({r.get('voice_id')[:8]}...)" for r in rows)
            problems.append(
                f"Ambiguous match for {name!r}: {len(rows)} rows ({preview})"
            )
            return None
        return rows[0]

    serafina = pick("Serafina")
    peter = pick("Peter")
    bright = pick(bright_name)

    if problems:
        for line in problems:
            print(f"  - {line}")
        print("\nResolve the above before re-running. Names are matched as a "
              "case-insensitive prefix against public.voices.name; English "
              "rows mean language_code in (en, en-US, en-GB).")
        sys.exit(1)

    return {
        "serafina": serafina,
        "peter": peter,
        "bright": bright,
    }


def seed(sb, *, dry_run: bool, voice_rows: dict[str, dict[str, Any]]) -> None:
    profiles = [
        {
            "voice_profile_key": "english_default_v1",
            "target_language_code": "en-US",
            "vibe": None,
            "provider_voice_id": voice_rows["serafina"]["voice_id"],
            "notes": "English no-vibe default — Serafina",
        },
        {
            "voice_profile_key": "english_a1_bright_v1",
            "target_language_code": "en-US",
            "vibe": "bright",
            "provider_voice_id": voice_rows["bright"]["voice_id"],
            "notes": f"A1 Bright — {voice_rows['bright']['name']}",
        },
        {
            "voice_profile_key": "english_a1_wistful_v1",
            "target_language_code": "en-US",
            "vibe": "wistful",
            "provider_voice_id": voice_rows["serafina"]["voice_id"],
            "notes": "A1 Wistful — Serafina",
        },
        {
            "voice_profile_key": "english_a1_sharp_v1",
            "target_language_code": "en-US",
            "vibe": "sharp",
            "provider_voice_id": voice_rows["peter"]["voice_id"],
            "notes": "A1 Sharp — Peter",
        },
    ]

    print(f"\nSeeding {len(profiles)} guided_voice_profiles "
          f"(dry_run={dry_run}, settings_hash={SETTINGS_HASH[:12]}...):")
    for spec in profiles:
        print(
            f"  - {spec['voice_profile_key']:24s} → vibe={spec['vibe'] or 'null':7s} "
            f"voice_id={spec['provider_voice_id'][:8]}... ({spec['notes']})"
        )
        if dry_run:
            continue
        result = guided_db.upsert_voice_profile(
            sb,
            voice_profile_key=spec["voice_profile_key"],
            target_language_code=spec["target_language_code"],
            vibe=spec["vibe"],
            provider_voice_id=spec["provider_voice_id"],
            provider_model_id=DEFAULT_MODEL_ID,
            output_format=DEFAULT_OUTPUT_FORMAT,
            voice_settings=DEFAULT_VOICE_SETTINGS,
            voice_settings_hash=SETTINGS_HASH,
            assignment_version=1,
            active=True,
            priority=100,
            notes=spec["notes"],
        )
        print(f"      → row id {result.get('id')} (active={result.get('active')})")

    if dry_run:
        print("\nDry run only — re-run without --dry-run to write rows.")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Resolve voices and print intended seed plan without writing.",
    )
    parser.add_argument(
        "--bright-voice-name",
        default="Eliza",
        choices=["Eliza", "Elisa"],
        help="Whether the Bright voice is named Eliza or Elisa in public.voices.",
    )
    args = parser.parse_args()

    sb = build_client()
    voice_rows = resolve_voice_rows(sb, bright_name=args.bright_voice_name)

    print("Resolved English voices from public.voices:")
    for label, row in voice_rows.items():
        print(
            f"  {label:8s} → name={row['name']!r:20s} "
            f"language_code={row.get('language_code')!r} "
            f"voice_id={row['voice_id'][:8]}..."
        )

    seed(sb, dry_run=args.dry_run, voice_rows=voice_rows)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
