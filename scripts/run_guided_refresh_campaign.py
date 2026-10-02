"""English A1/A2 refresh into the existing local campaign; dry-run by default.

Supply the reviewed plan, reference inventory and rate evidence. A dry-run freshly
imports the source modules and prints the fingerprint to inspect. Commit requires
that fingerprint and the adapter's checked-in-code gate before provider creation.
The campaign cap, output directory and process lock are shared with the B1 run.
Credentials come only from ELEVENLABS_API_KEY; never pass them as CLI arguments.
"""
import argparse
import json
import os
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts import guided_refresh_api_adapter as adapter

campaign = adapter.campaign


def positive_limit(value):
    number = int(value)
    if number < 1:
        raise argparse.ArgumentTypeError("limit must be positive")
    return number


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--plan", type=Path, required=True, help="Reviewed saved refresh plan")
    parser.add_argument("--inventory", type=Path, required=True, help="Reference source inventory")
    parser.add_argument("--rates", type=Path, required=True, help="Reviewed model/voice upper-rate evidence")
    parser.add_argument("--expected-input-sha256", help="Fingerprint inspected with these same inputs")
    parser.add_argument("--commit", action="store_true")
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--limit", type=positive_limit, help="Maximum new dispatches")
    selection.add_argument("--sample-per-voice", action="store_true", help="One representative core phrase per voice")
    args = parser.parse_args(argv)
    root = Path(repo_root).resolve() if repo_root else adapter.DEFAULT_REPO.resolve()
    exporter = Path(adapter.__file__).with_name("export_guided_refresh_source.mjs")
    saved = json.loads(args.plan.read_bytes())
    rates = json.loads(args.rates.read_bytes())
    if args.commit:
        plan, fingerprint = adapter.revalidate_for_dispatch(saved, root, args.inventory,
            exporter, rates, args.expected_input_sha256)
    else:
        plan = adapter.load_fresh_plan(root, args.inventory, exporter, saved["scope"]["targetLanguage"])
        if saved != plan:
            raise ValueError("rebuilt_refresh_plan_mismatch")
        fingerprint = adapter.input_fingerprint(plan, rates)
        if args.expected_input_sha256 is not None and args.expected_input_sha256 != fingerprint:
            raise ValueError("reviewed_input_fingerprint_required")
    # All source/code/rate checks precede provider construction and local mutations.
    output = root / "review-artifacts/guided-audio-20261003/api"
    factory = provider_factory or campaign.ElevenLabsTransport
    provider = factory(os.getenv("ELEVENLABS_API_KEY")) if args.commit else None
    try:
        result = campaign.execute(plan, fingerprint, output, provider=provider,
            rate_evidence=rates, commit=args.commit, limit=args.limit,
            sample_per_voice=args.sample_per_voice,
            lock_path=root / "review-artifacts/.guided-audio-api.lock")
        print(json.dumps(result, ensure_ascii=False, indent=2))
        return 0
    finally:
        if provider is not None:
            provider.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except campaign.CampaignError as error:
        print(json.dumps({"status": "stopped", "reason": str(error)}), file=sys.stderr)
        raise SystemExit(2)
    except (ValueError, KeyError, OSError):
        print(json.dumps({"status": "stopped", "reason": "refresh_inputs_invalid_or_stale"}), file=sys.stderr)
        raise SystemExit(2)
