from __future__ import annotations

import argparse
import filecmp
import json
import shutil
from dataclasses import dataclass
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
WORKSPACE_ROOT = REPO_ROOT.parent
CANONICAL_CURRICULUM_ROOT = WORKSPACE_ROOT / "curriculum"
CONTENT_ROOT = CANONICAL_CURRICULUM_ROOT / "content"
ENRICHMENT_ROOT = CANONICAL_CURRICULUM_ROOT / "enrichment"
FRONTEND_CURRICULUM_ROOT = REPO_ROOT / "frontend" / "src" / "data" / "curriculum"
FRONTEND_ENRICHMENT_ROOT = FRONTEND_CURRICULUM_ROOT / "enrichment"


@dataclass
class SyncStats:
    copied: int = 0
    skipped: int = 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Vendor canonical curriculum content and enrichment into the frontend."
    )
    parser.add_argument(
        "--lang",
        dest="lang",
        help="Optional language ISO to sync. Defaults to every language present in canonical roots.",
    )
    return parser.parse_args()


def language_dirs(root: Path) -> set[str]:
    if not root.exists():
        return set()
    return {path.name for path in root.iterdir() if path.is_dir()}


def validate_json(path: Path) -> None:
    try:
        json.loads(path.read_text(encoding="utf-8"))
    except json.JSONDecodeError as exc:
        raise SystemExit(f"Malformed JSON: {path} ({exc.msg} at line {exc.lineno}, column {exc.colno})") from exc


def sync_tree(source_dir: Path, destination_dir: Path, label: str) -> SyncStats:
    stats = SyncStats()
    if not source_dir.exists():
        print(f"{label}: source missing, skipped {source_dir}")
        return stats

    destination_dir.mkdir(parents=True, exist_ok=True)
    for source_path in sorted(source_dir.glob("*.json")):
        validate_json(source_path)
        destination_path = destination_dir / source_path.name
        if destination_path.exists() and filecmp.cmp(source_path, destination_path, shallow=False):
            stats.skipped += 1
            print(f"{label}: skipped {source_path.name}")
            continue
        shutil.copyfile(source_path, destination_path)
        stats.copied += 1
        print(f"{label}: copied {source_path.name}")
    return stats


def main() -> int:
    args = parse_args()
    if args.lang:
        languages = {args.lang}
    else:
        languages = language_dirs(CONTENT_ROOT) | language_dirs(ENRICHMENT_ROOT)

    if not languages:
        raise SystemExit(f"No canonical language directories found under {CANONICAL_CURRICULUM_ROOT}")

    total = SyncStats()
    for lang in sorted(languages):
        content_stats = sync_tree(
            CONTENT_ROOT / lang,
            FRONTEND_CURRICULUM_ROOT / lang,
            f"content/{lang}",
        )
        enrichment_stats = sync_tree(
            ENRICHMENT_ROOT / lang,
            FRONTEND_ENRICHMENT_ROOT / lang,
            f"enrichment/{lang}",
        )
        total.copied += content_stats.copied + enrichment_stats.copied
        total.skipped += content_stats.skipped + enrichment_stats.skipped

    print(f"summary: copied {total.copied}, skipped {total.skipped}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
