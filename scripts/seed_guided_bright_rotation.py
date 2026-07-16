"""Seed per-path bright guided_voice_profiles for the 2026-07 all-language batch.

Owner decisions (2026-07-12): bright vibe only; model eleven_multilingual_v2
(quality over speed); each text generated ONCE — voice diversity comes from
rotating the language's hand-picked roster across paths (a path = 10 lessons
keeps one voice; the next path switches). Per-path profiles carry
specificity 12 (vibe+path) so they always beat the vibe-level English
profiles (8) and the scope-less static-thematic rows (0) in the resolver.

Indonesian deliberately uses Gavrila only: raw Blasto is ~16 dB quieter and
the guided pipeline has no gain post-processing step (the static pipeline
shipped a +8 dB boosted copy instead — see staticThematicAudio.ts notes).

A2 (2026-07-12, pilot): --level a2 seeds {slug}_a2_bright_p{n}_multiv2_v1 profiles
scoped to {slug}-a2-practical-{n}. The voice rotation CONTINUES past the language's
A1 paths (A2 P1 picks up where A1 P10 left off) so adjacent A1/A2 paths do not
repeat a voice. Use --paths to limit how many A2 paths exist so far (pilot: 1).

Usage:
    python scripts/seed_guided_bright_rotation.py            # dry-run (default)
    python scripts/seed_guided_bright_rotation.py --commit   # write profiles
    python scripts/seed_guided_bright_rotation.py --level a2 --languages spanish --paths 1
"""

from __future__ import annotations

import argparse
import os
import sys

from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from supabase import create_client  # noqa: E402

from src.services.guided_tts import db as guided_db  # noqa: E402
from src.services.guided_tts.inventory import (  # noqa: E402
    DEFAULT_OUTPUT_FORMAT,
    DEFAULT_VOICE_SETTINGS,
    voice_settings_hash,
)

MODEL_ID = "eleven_multilingual_v2"
SETTINGS_HASH = voice_settings_hash(DEFAULT_VOICE_SETTINGS)

# language slug -> (target_language_code, voices-table language_codes,
#                   rotation roster (gender-alternating where possible),
#                   number of paths)
ROSTERS: dict[str, tuple[str, tuple[str, ...], list[str], int]] = {
    "english": ("en-US", ("en", "en-US", "en-GB"), ["Elisa", "Peter", "Serafina"], 10),
    "spanish": ("es", ("es",), ["Lia", "David", "Veronica", "El Farao"], 10),
    "italian": ("it", ("it",), ["Rosanna", "Marco", "Samanta"], 10),
    "french": ("fr", ("fr",), ["Lilly", "Adam", "Stephyra", "Guilamme"], 10),
    "portuguese": ("pt", ("pt",), ["Raquel", "Lair", "Carla"], 10),
    "german": ("de", ("de",), ["Laura", "William", "Enniah", "Helmut"], 10),
    "cebuano": ("ceb", ("fil", "ceb"), ["Mayumi"], 10),
    "indonesian": ("id", ("id",), ["Gavrila"], 10),
    "polish": ("pl", ("pl",), ["Maria", "Rysard", "Marta", "Wojech"], 10),
    "korean": ("ko", ("ko",), ["Jini", "Yuna", "Selly", "Kanna", "Emily", "Sola"], 1),
    # ja gender-unconstrained (A1+A2 specs are gender-free); order alternates
    # F/M-leaning voices for variety: Akane(F) / Koichi(M) / Konoha(F) / ishibashi(M).
    "japanese": ("ja", ("ja",), ["Akane", "Koichi", "Konoha", "ishibashi"], 10),
    # NOTE russian is deliberately absent: public.voices has no ru rows yet and
    # tmp\A2_RUSSIAN_VOICE_GENDER_PLAN.md requires >=2F+2M mapped odd-F/even-M
    # for A2 before any seeding. Add the roster here once the owner picks voices.
}


def build_client():
    url = os.getenv("SUPABASE_URL", "")
    key = os.getenv("SUPABASE_SERVICE_KEY", "") or os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not url or not key:
        print("ERROR: SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env")
        sys.exit(2)
    return create_client(url, key)


def resolve_roster(sb, slug: str, language_codes: tuple[str, ...], names: list[str]) -> dict[str, dict]:
    matches = guided_db.find_voices_by_name(sb, names=names, language_codes=language_codes)
    resolved: dict[str, dict] = {}
    problems: list[str] = []
    for name in names:
        rows = matches.get(name) or []
        if len(rows) != 1:
            problems.append(f"{slug}: voice {name!r} matched {len(rows)} rows in public.voices {language_codes}")
            continue
        resolved[name] = rows[0]
    if problems:
        for p in problems:
            print(f"  ERROR - {p}")
        sys.exit(1)
    return resolved


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--commit", action="store_true", help="Write rows (default: dry-run)")
    parser.add_argument(
        "--languages",
        default=",".join(ROSTERS),
        help="Comma-separated language slugs to seed (default: all)",
    )
    parser.add_argument(
        "--level",
        choices=("a1", "a2"),
        default="a1",
        help="Curriculum level to seed profiles for (default: a1)",
    )
    parser.add_argument(
        "--paths",
        type=int,
        default=None,
        help="Number of paths to seed (default: the roster's full path count)",
    )
    args = parser.parse_args()
    dry_run = not args.commit

    slugs = [s.strip() for s in args.languages.split(",") if s.strip()]
    unknown = [s for s in slugs if s not in ROSTERS]
    if unknown:
        print(f"ERROR: unknown language slugs {unknown}; known: {list(ROSTERS)}")
        return 2

    sb = build_client()
    total = 0
    for slug in slugs:
        lang_code, voice_lang_codes, names, path_count = ROSTERS[slug]
        resolved = resolve_roster(sb, slug, voice_lang_codes, names)
        print(f"\n{slug} ({lang_code}) — roster: "
              + ", ".join(f"{n} ({resolved[n]['voice_id'][:8]}...)" for n in names))
        seed_path_count = args.paths if args.paths is not None else path_count
        # a2 continues the rotation after the language's a1 paths so adjacent
        # a1/a2 paths do not repeat a voice
        rotation_offset = path_count if args.level == "a2" else 0
        for n in range(1, seed_path_count + 1):
            voice_name = names[(rotation_offset + n - 1) % len(names)]
            row = resolved[voice_name]
            key = f"{slug}_{args.level}_bright_p{n}_multiv2_v1"
            path_id = f"{slug}-{args.level}-practical-{n}"
            print(f"  {key:44s} path={path_id:26s} voice={voice_name}")
            total += 1
            if dry_run:
                continue
            guided_db.upsert_voice_profile(
                sb,
                voice_profile_key=key,
                target_language_code=lang_code,
                vibe="bright",
                scope_path_id=path_id,
                provider_voice_id=row["voice_id"],
                provider_model_id=MODEL_ID,
                output_format=DEFAULT_OUTPUT_FORMAT,
                voice_settings=dict(DEFAULT_VOICE_SETTINGS),
                voice_settings_hash=SETTINGS_HASH,
                assignment_version=1,
                active=True,
                priority=90,
                notes=f"{args.level.upper()} bright per-path rotation — {voice_name} ({MODEL_ID})",
            )
    print(f"\n{'DRY-RUN: would seed' if dry_run else 'Seeded'} {total} profiles.")
    if dry_run:
        print("Re-run with --commit to write rows.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
