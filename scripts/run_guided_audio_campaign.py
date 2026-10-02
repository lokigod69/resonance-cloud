"""Reviewed-source CLI. Dry-run is the default and does not create a ledger.

Rates JSON: {"mode":"pilot", "models":{"eleven_v4":{
  "modelCharacterCostMultiplier":"1", "voices": {
  "VOICE_ID": {"sharingRate":null, "creditMultiplier":"10",
               "verification":"saved authenticated GET evidence reference"}}}}}
Pilot requires --sample-per-voice. Then inspect receipts and use receipt-verified
mode with conservative upper multipliers (at least 1), not a fitted discount.
Each requested voice/model needs a positive ready receipt within that upper bound.
Reserve model standard rate times voice upper multiplier; account using actual
character-cost headers. Lower charges are accepted; charges over the bound stop.
These values are examples, not verified rates.
"""
import argparse
import json
import os
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.services.guided_tts import campaign
from scripts.plan_guided_b1_drafts import build_plan

BATCHES = {
    "priority": {"languages": ("english", "spanish", "french"), "suffix": ""},
    "italian-portuguese": {"languages": ("italian", "portuguese"), "suffix": "-it-pt"},
}


def project_audio(draft):
    """Exact data projection used by frontend/scripts/lib/guidedB1Drafts.ts."""
    path_id = f"{draft['targetLanguage'].lower()}-b1-practical-1"
    projected = []
    for number, lesson in enumerate(draft["lessons"], 1):
        prefix = lesson["slug"].split("-")[0]
        projected.append({"id": f"{path_id}-{number:03}-{lesson['slug']}",
            "pathId": path_id, "lessonNumber": number, "vibeVariants": {"bright": {
                "corePhrase": {"targetText": lesson["dialogue"][1]["targetText"]},
                "chunks": [{"id": f"{prefix}-{i}", "targetText": x["targetText"]}
                           for i, x in enumerate(lesson["chunks"], 1)] +
                          [{"id": f"{prefix}-item-{i}", "targetText": x["targetText"]}
                           for i, x in enumerate(lesson["terms"], 1)],
                "trophyWord": {"word": lesson["trophyWord"]["word"]},
                "dialogue": [{"targetText": x["targetText"]} for x in lesson["dialogue"]],
                "pattern": {"examples": [{"targetText": x["targetText"]}
                                          for x in lesson["pattern"]["examples"]]},
            }}})
    return projected


def load_reviewed_inputs(directory, rate_evidence, model=campaign.MODEL, batch="priority"):
    if batch not in BATCHES:
        raise campaign.CampaignError("unsupported_batch")
    selection = BATCHES[batch]
    suffix = selection["suffix"]
    evidence_bytes = (directory / f"review-evidence{suffix}.json").read_bytes()
    evidence = json.loads(evidence_bytes)
    if (evidence.get("status") != "reviewed-staged"
            or evidence.get("independentReview", {}).get("finalVerdict") != "PASS"
            or evidence.get("independentReview", {}).get("unresolvedFindings") != 0):
        raise campaign.CampaignError("content_review_incomplete")
    languages = []
    for slug in selection["languages"]:
        source_bytes = (directory / f"{slug}.json").read_bytes()
        source_hash = campaign.digest(source_bytes)
        if evidence.get("reviewedSourceSha256", {}).get(slug) != source_hash:
            raise campaign.CampaignError("reviewed_source_changed")
        source = json.loads(source_bytes)
        if (source.get("schemaVersion") != 1 or source.get("status") != "draft"
                or source.get("pathNumber") != 1 or source.get("level") != "B1"
                or source.get("targetLanguage", "").lower() != slug):
            raise campaign.CampaignError("unsupported_source_scope")
        languages.append({"targetLanguage": source["targetLanguage"],
            "targetLanguageCode": source["targetLanguageCode"], "sourceSha256": source_hash,
            "lessons": project_audio(source)})
    snapshot_bytes = (directory / f"tts-snapshot{suffix}.json").read_bytes()
    snapshot = json.loads(snapshot_bytes)
    if snapshot != {"schemaVersion": 1, "status": "draft", "languages": languages}:
        raise campaign.CampaignError("snapshot_does_not_match_reviewed_sources")
    name = f"tts-plan{suffix}-v4.json" if model == "eleven_v4" else f"tts-plan{suffix}.json"
    saved_plan = json.loads((directory / name).read_bytes())
    if saved_plan.get("model") != model:
        raise campaign.CampaignError("selected_model_mismatch")
    expected_plan = build_plan(snapshot, model=saved_plan["model"])
    expected_plan["snapshotSha256"] = campaign.digest(snapshot_bytes)
    if saved_plan != expected_plan:
        raise campaign.CampaignError("rebuilt_plan_mismatch")
    fingerprint = campaign.digest(campaign.canonical({"plan": expected_plan,
        "reviewEvidenceSha256": campaign.digest(evidence_bytes), "rateEvidence": rate_evidence}).encode("utf-8"))
    return expected_plan, fingerprint


def main(argv=None, *, repo_root=None, provider_factory=campaign.ElevenLabsTransport):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--rates", type=Path, help="Account-specific, verified voice rate evidence")
    parser.add_argument("--model", choices=sorted(campaign.MODELS), default=campaign.MODEL)
    parser.add_argument("--batch", choices=sorted(BATCHES), default="priority")
    parser.add_argument("--commit", action="store_true")
    selection = parser.add_mutually_exclusive_group()
    selection.add_argument("--limit", type=int, help="Maximum NEW dispatches in manifest order")
    selection.add_argument("--sample-per-voice", action="store_true", help="Generate one representative core phrase per voice, then stop")
    parser.add_argument("--expected-input-sha256", help="Fingerprint from an inspected dry-run with the same rates file")
    args = parser.parse_args(argv)
    root = Path(repo_root) if repo_root else Path(__file__).resolve().parents[1]
    directory = root / "frontend/content-drafts/b1-2026-10"
    rates = json.loads(args.rates.read_bytes()) if args.rates else None
    # All freshness checks precede construction of a provider or any local write.
    plan, fingerprint = load_reviewed_inputs(directory, rates, args.model, args.batch)
    if args.commit and (rates is None or args.expected_input_sha256 != fingerprint):
        raise campaign.CampaignError("reviewed_input_fingerprint_required")
    output = root / "review-artifacts/guided-audio-20261003/api"
    provider = provider_factory(os.getenv("ELEVENLABS_API_KEY")) if args.commit else None
    try:
        result = campaign.execute(plan, fingerprint, output, provider=provider,
            rate_evidence=rates, commit=args.commit, limit=args.limit, sample_per_voice=args.sample_per_voice,
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
