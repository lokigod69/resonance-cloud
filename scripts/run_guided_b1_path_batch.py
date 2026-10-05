"""Record exact reviewed B1 paths into the existing campaign. Dry-run by default.

The manifest binds every source and both content reviews. The saved plan is rebuilt
from those bytes. Commit additionally requires checked-in sources/execution code
and the fingerprint from a dry-run with the same rate evidence. No publication.
"""
import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts.plan_guided_b1_drafts import PROPOSALS, SOURCE_CODES, build_plan
from scripts.run_guided_audio_campaign import project_audio
from scripts.guided_refresh_v2 import runtime_evidence
from src.services.guided_tts import campaign

CODE_PATHS = (
    "scripts/run_guided_b1_path_batch.py", "scripts/run_guided_audio_campaign.py",
    "scripts/plan_guided_b1_drafts.py", "src/services/guided_tts/campaign.py",
    "src/services/guided_tts/inventory.py", "frontend/scripts/lib/guidedB1Drafts.ts",
    "scripts/guided_refresh_v2.py", "src/__init__.py", "src/services/__init__.py",
    "src/services/guided_tts/__init__.py",
)


def code_evidence(root):
    return [{"path": name, "sha256": campaign.digest((root / name).read_bytes())} for name in CODE_PATHS]


def checked_in(root, names):
    for name in names:
        result = subprocess.run(["git", "show", f"HEAD:{name}"], cwd=root, capture_output=True, check=False)
        if result.returncode or result.stdout.replace(b"\r\n", b"\n") != (root / name).read_bytes().replace(b"\r\n", b"\n"):
            raise campaign.CampaignError("source_or_execution_code_not_checked_in")


def prepare_inputs(root, manifest_path):
    """Pure projection; incomplete content review fails before any provider exists."""
    root = Path(root).resolve()
    raw = Path(manifest_path).read_bytes()
    manifest = json.loads(raw)
    if (manifest.get("schemaVersion") != 2 or manifest.get("status") != "reviewed-staged"
            or manifest.get("level") != "B1" or not manifest.get("sources")):
        raise campaign.CampaignError("reviewed_path_manifest_required")
    for review_name in ("fableReview", "independentReview"):
        review = manifest.get(review_name, {})
        if review.get("verdict") != "PASS" or review.get("unresolvedFindings") != 0:
            raise campaign.CampaignError("content_review_incomplete")
        if not re.fullmatch(r"[a-f0-9]{64}", review.get("evidenceSha256", "")):
            raise campaign.CampaignError("review_evidence_hash_required")
    if manifest["fableReview"].get("model") != "claude-fable-5-1":
        raise campaign.CampaignError("fable_personal_review_required")
    bindings = {entry["file"]: entry["sha256"] for entry in manifest["sources"]}
    if len(bindings) != len(manifest["sources"]):
        raise campaign.CampaignError("duplicate_source_file")
    if any(manifest[name].get("reviewedSources") != bindings for name in ("fableReview", "independentReview")):
        raise campaign.CampaignError("review_source_bindings_mismatch")
    groups, scopes, names = [], [], []
    for entry in manifest["sources"]:
        name, target, path_number = entry["file"], entry["targetLanguage"], entry["pathNumber"]
        path = (root / name).resolve()
        allowed = (root / "frontend/content-drafts").resolve()
        if (not path.is_relative_to(allowed) or path.suffix != ".json" or "\\" in name
                or name != path.relative_to(root).as_posix()):
            raise campaign.CampaignError("invalid_source_location")
        source_bytes = path.read_bytes()
        if campaign.digest(source_bytes) != entry["sha256"]:
            raise campaign.CampaignError("reviewed_source_changed")
        source = json.loads(source_bytes)
        if (target not in PROPOSALS or type(path_number) is not int or not 1 <= path_number <= 10
                or source.get("targetLanguage") != target or source.get("targetLanguageCode") != SOURCE_CODES[target]
                or source.get("level") != "B1" or source.get("pathNumber") != path_number
                or source.get("schemaVersion") != 1 or source.get("status") != "draft"):
            raise campaign.CampaignError("unsupported_source_scope")
        if entry.get("reviewedVoiceId") != PROPOSALS[target][2]:
            raise campaign.CampaignError("reviewed_voice_binding_mismatch")
        scopes.append((target, path_number))
        names.append(name)
        groups.append({"targetLanguage": target, "targetLanguageCode": source["targetLanguageCode"],
            "pathNumber": path_number, "sourceSha256": entry["sha256"], "lessons": project_audio(source)})
    snapshot = {"schemaVersion": 2, "status": "draft", "languages": groups}
    plan = build_plan(snapshot, model="eleven_v4", reviewed_scopes=scopes)
    plan["reviewManifestSha256"] = campaign.digest(raw)
    plan["executionCode"] = code_evidence(root)
    plan["runtimeAuthority"] = runtime_evidence()
    return plan, names


def load_inputs(root, manifest_path, plan_path, rates, *, commit=False, expected=None):
    plan, names = prepare_inputs(root, manifest_path)
    if json.loads(Path(plan_path).read_bytes()) != plan:
        raise campaign.CampaignError("rebuilt_plan_mismatch")
    fingerprint = campaign.digest(campaign.canonical({"plan": plan, "rateEvidence": rates}).encode("utf-8"))
    if expected is not None and expected != fingerprint:
        raise campaign.CampaignError("reviewed_input_fingerprint_required")
    if commit:
        if not rates or expected != fingerprint:
            raise campaign.CampaignError("reviewed_input_fingerprint_required")
        checked_in(root, [*names, *CODE_PATHS])
    return plan, fingerprint


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--manifest", type=Path, required=True)
    parser.add_argument("--plan", type=Path, required=True)
    parser.add_argument("--rates", type=Path, required=True)
    parser.add_argument("--expected-input-sha256")
    parser.add_argument("--commit", action="store_true")
    choice = parser.add_mutually_exclusive_group()
    choice.add_argument("--limit", type=int)
    choice.add_argument("--sample-per-voice", action="store_true")
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1:
        parser.error("limit must be positive")
    root = Path(repo_root).resolve() if repo_root else ROOT
    rates = json.loads(args.rates.read_bytes())
    if rates.get("mode") == "pilot" and not args.sample_per_voice:
        raise campaign.CampaignError("pilot_requires_representative_sample")
    plan, fingerprint = load_inputs(root, args.manifest, args.plan, rates,
        commit=args.commit, expected=args.expected_input_sha256)
    factory = provider_factory or campaign.ElevenLabsTransport
    provider = factory(os.getenv("ELEVENLABS_API_KEY")) if args.commit else None
    try:
        result = campaign.execute(plan, fingerprint, root / "review-artifacts/guided-audio-20261003/api",
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
    except campaign.CampaignError as error:
        print(json.dumps({"status": "stopped", "reason": str(error)}), file=sys.stderr)
        raise SystemExit(2)
    except (ValueError, KeyError, OSError):
        print(json.dumps({"status": "stopped", "reason": "path_inputs_invalid_or_stale"}), file=sys.stderr)
        raise SystemExit(2)
