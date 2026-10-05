"""Reviewed v2 source/voice assignments into the same 200k local campaign; dry-run default."""
import argparse
import json
import os
from pathlib import Path
import sys

HERE = Path(__file__).resolve().parent
if HERE.name == "scripts":
    sys.path.insert(0, str(HERE.parent))
    from scripts import guided_refresh_v2 as adapter
else:
    sys.path.insert(0, str(HERE))
    import guided_refresh_v2 as adapter


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("snapshot", "assignments", "voice-evidence", "review", "plan", "rates"):
        parser.add_argument(f"--{flag}", type=Path, required=True)
    parser.add_argument("--targets", required=True, help="Explicit comma-separated target languages bound by the review")
    parser.add_argument("--exclude-paths", default="", help="Explicit comma-separated known paths to hold; bound by the review")
    parser.add_argument("--expected-input-sha256")
    parser.add_argument("--commit", action="store_true")
    choice = parser.add_mutually_exclusive_group()
    choice.add_argument("--limit", type=int)
    choice.add_argument("--sample-per-voice", action="store_true")
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1:
        parser.error("limit must be positive")
    root = Path(repo_root).resolve() if repo_root else adapter.ROOT
    rates = json.loads(args.rates.read_bytes())
    if rates.get("mode") == "pilot" and not args.sample_per_voice:
        raise ValueError("pilot_requires_representative_sample")
    plan, fingerprint = adapter.load_reviewed_inputs(root, args.snapshot, args.assignments, args.voice_evidence,
        args.review, args.plan, rates, args.targets.split(","),
        excluded_paths=args.exclude_paths.split(",") if args.exclude_paths else (),
        commit=args.commit, expected=args.expected_input_sha256)
    # All source, mapping, review and HEAD gates complete before provider construction.
    factory = provider_factory or adapter.campaign.ElevenLabsTransport
    provider = factory(os.getenv("ELEVENLABS_API_KEY")) if args.commit else None
    try:
        result = adapter.campaign.execute(plan, fingerprint, root / "review-artifacts/guided-audio-20261003/api",
            provider=provider, rate_evidence=rates, commit=args.commit, limit=args.limit,
            sample_per_voice=args.sample_per_voice, lock_path=root / "review-artifacts/.guided-audio-api.lock")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    finally:
        if provider is not None:
            provider.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except adapter.campaign.CampaignError as error:
        print(json.dumps({"status": "stopped", "reason": str(error)}), file=sys.stderr)
        raise SystemExit(2)
    except (ValueError, KeyError, OSError):
        print(json.dumps({"status": "stopped", "reason": "refresh_inputs_invalid_or_stale"}), file=sys.stderr)
        raise SystemExit(2)
