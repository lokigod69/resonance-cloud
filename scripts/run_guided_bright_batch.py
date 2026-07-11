"""Run the all-language guided bright TTS batch (owner-approved 2026-07-12).

Drives src.services.guided_tts.generate.run_async per language: dry-run
first, guardrail checks, then (with --commit) the paid generation in the
same process on the same loaded lesson snapshot — so the numbers the
guardrails approved are exactly the numbers that get committed. This
replaces per-language EXPECTED_SCOPES entries, which would only be copies
of the same dry-run output.

Guardrails per language before any provider call:
  * missing_voice_profile == 0
  * every resolved voice_profile_key matches {slug}_a1_bright_p<n>_multiv2_v1
    (catches a static-thematic or vibe-level profile winning the resolver)
  * estimated_provider_characters <= PER_LANGUAGE_CHAR_CAP
  * batch running total <= TOTAL_CHAR_CAP

Usage:
    python scripts/run_guided_bright_batch.py              # dry-run report
    python scripts/run_guided_bright_batch.py --commit     # paid generation
    python scripts/run_guided_bright_batch.py --languages korean --commit
"""

from __future__ import annotations

import argparse
import asyncio
import json
import os
import re
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from src.services.guided_tts import db as guided_db  # noqa: E402
from src.services.guided_tts.generate import (  # noqa: E402
    _build_supabase_client,
    _load_lessons,
    run_async,
)

SURFACES = ["corePhrase", "chunks", "trophyWord"]
VIBES = ["bright"]
PER_LANGUAGE_CHAR_CAP = 8_000
TOTAL_CHAR_CAP = 60_000

# language slug -> (target_language_code, path count)
LANGUAGES: dict[str, tuple[str, int]] = {
    "english": ("en-US", 10),
    "spanish": ("es", 10),
    "italian": ("it", 10),
    "french": ("fr", 10),
    "portuguese": ("pt", 10),
    "german": ("de", 10),
    "cebuano": ("ceb", 10),
    "indonesian": ("id", 10),
    "polish": ("pl", 10),
    "korean": ("ko", 1),
}


def path_ids(slug: str, count: int) -> list[str]:
    return [f"{slug}-a1-practical-{n}" for n in range(1, count + 1)]


def check_guardrails(slug: str, inventory: dict, chars_so_far: int) -> list[str]:
    problems: list[str] = []
    totals = inventory["totals"]
    if totals["missing_voice_profile"] > 0:
        problems.append(f"{totals['missing_voice_profile']} rows without a voice profile")
    pattern = re.compile(rf"^{slug}_a1_bright_p\d+_multiv2_v1$")
    for entry in inventory["per_voice"]:
        if not pattern.match(entry["voice_profile_key"]):
            problems.append(
                f"unexpected profile {entry['voice_profile_key']!r} resolved "
                f"({entry['unique_texts']} texts) — rotation profile did not win"
            )
        if entry["provider_model_id"] != "eleven_multilingual_v2":
            problems.append(
                f"profile {entry['voice_profile_key']!r} uses model "
                f"{entry['provider_model_id']!r}, expected eleven_multilingual_v2"
            )
    est = totals["estimated_provider_characters"]
    if est > PER_LANGUAGE_CHAR_CAP:
        problems.append(f"estimated {est} chars exceeds per-language cap {PER_LANGUAGE_CHAR_CAP}")
    if chars_so_far + est > TOTAL_CHAR_CAP:
        problems.append(f"batch total would exceed cap {TOTAL_CHAR_CAP}")
    return problems


async def main_async(args) -> int:
    sb = _build_supabase_client()
    voice_profiles = guided_db.load_active_voice_profiles(sb)
    print("Loading lesson snapshot (tsx dump)...")
    lessons = _load_lessons()
    print(f"  {len(lessons)} lessons loaded")

    provider_synth = None
    if args.commit:
        from src.services.guided_tts.provider_elevenlabs import (
            ElevenLabsGuidedTTSProvider,
        )
        provider_synth = ElevenLabsGuidedTTSProvider().synthesize

    slugs = [s.strip() for s in args.languages.split(",") if s.strip()]
    unknown = [s for s in slugs if s not in LANGUAGES]
    if unknown:
        print(f"ERROR: unknown slugs {unknown}")
        return 2

    chars_spent = 0
    grand = {"generated": 0, "failed": 0, "skipped_ready": 0, "chars": 0}
    for slug in slugs:
        lang_code, count = LANGUAGES[slug]
        paths = path_ids(slug, count)
        dry = await run_async(
            sb=sb,
            lessons=lessons,
            voice_profiles=voice_profiles,
            vibes=VIBES,
            surfaces=SURFACES,
            path_id=None,
            path_ids=paths,
            lesson_id=None,
            lesson_number=None,
            target_language_code=lang_code,
            dry_run=True,
        )
        totals = dry["inventory"]["totals"]
        print(f"\n=== {slug} ({lang_code}) — dry-run ===")
        print(json.dumps(totals, indent=2))
        for entry in dry["inventory"]["per_voice"]:
            print(f"  {entry['voice_profile_key']:44s} texts={entry['unique_texts']:4d} "
                  f"chars={entry['character_count']:5d} ready={entry['ready']} missing={entry['missing']}")
        problems = check_guardrails(slug, dry["inventory"], chars_spent)
        if problems:
            print(f"GUARDRAIL FAILURE for {slug}:")
            for p in problems:
                print(f"  - {p}")
            print("Skipping this language; fix and re-run.")
            continue

        if not args.commit:
            chars_spent += totals["estimated_provider_characters"]
            continue

        result = await run_async(
            sb=sb,
            lessons=lessons,
            voice_profiles=voice_profiles,
            vibes=VIBES,
            surfaces=SURFACES,
            path_id=None,
            path_ids=paths,
            lesson_id=None,
            lesson_number=None,
            target_language_code=lang_code,
            dry_run=False,
            provider_synthesize=provider_synth,
            allow_unscoped_commit=True,
        )
        gen = result["generated_assets"]
        failed = result["failed_assets"]
        chars_spent += totals["estimated_provider_characters"]
        grand["generated"] += gen
        grand["failed"] += failed
        grand["skipped_ready"] += totals["ready"]
        grand["chars"] += totals["estimated_provider_characters"]
        print(f"COMMIT {slug}: generated={gen} failed={failed} "
              f"deduped_usages={result.get('deduped_usages', 0)} run_id={result['run_id']}")
        if failed:
            print(f"  WARNING: {failed} failures recorded in guided_tts_assets (status=failed)")

    mode = "COMMIT" if args.commit else "DRY-RUN"
    print(f"\n=== BATCH {mode} SUMMARY ===")
    print(json.dumps(grand if args.commit else {"estimated_chars_total": chars_spent}, indent=2))
    return 0 if grand["failed"] == 0 else 1


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", action="store_true", help="Spend: call ElevenLabs and write assets")
    parser.add_argument("--languages", default=",".join(LANGUAGES),
                        help="Comma-separated language slugs (default: all)")
    args = parser.parse_args()
    return asyncio.run(main_async(args))


if __name__ == "__main__":
    raise SystemExit(main())
