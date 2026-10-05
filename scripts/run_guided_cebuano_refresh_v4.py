"""Isolated, reviewed Cebuano A1/A2 refresh in the existing local v4 campaign.

Dry-run is read-only. Corazon confirms provider language ceb, not locale ceb-PH.
The narrow null-locale policy below never upgrades that evidence to a locale claim.
No publication, new ledger, cap reset, request retry, or provider call at import.
"""
from __future__ import annotations

import argparse
from collections import Counter
from contextlib import closing
from dataclasses import asdict
import json
import os
from pathlib import Path
import re
import sqlite3
import sys

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/src").is_dir()), HERE.parent)
sys.path.insert(0, str(ROOT))
from scripts import guided_refresh_v2 as source
from src.services.guided_tts import campaign
from src.services.guided_tts.inventory import (
    NORMALIZATION_VERSION, VoiceProfile, cache_key, normalize_spoken_text,
    storage_path, text_hash, voice_settings_hash,
)

VOICE_ID = "LR0CUgPwE0CmrIZg4enh"
VERSION = "cebuano-a1-a2-corazon-v4-refresh-v1"
LOCALE_POLICY = "exact-corazon-ceb-confirmed-locale-unverified-v1"
REVIEW_KIND = "cebuano-v4-refresh-independent-review"
API_DIRECTORY = "review-artifacts/guided-audio-20261003/api"
LOCK_PATH = "review-artifacts/.guided-audio-api.lock"
CAMPAIGN_ANCHOR = "9e179954d1e38b956f7e439687c110a9d055f7c2ae10c32281beb11a04cdf1af"
ERROR = campaign.CampaignError
hashed = source.hashed


def require_existing_campaign(root):
    """Never let this continuation bootstrap or replace the established budget."""
    path = (Path(root) / API_DIRECTORY / "campaign.sqlite3").resolve()
    try:
        with path.open("rb") as handle:
            if handle.read(16) != b"SQLite format 3\x00":
                raise ERROR("existing_campaign_required")
        with closing(sqlite3.connect(path.as_uri() + "?mode=ro", uri=True, timeout=30)) as db:
            if db.execute("SELECT id,cap FROM campaign").fetchall() != [(1, campaign.API_CAP)]:
                raise ERROR("existing_campaign_required")
            if not db.execute("SELECT 1 FROM manifests WHERE fingerprint=?", (CAMPAIGN_ANCHOR,)).fetchone():
                raise ERROR("established_campaign_anchor_required")
            if not db.execute("SELECT 1 FROM requests WHERE manifest_fingerprint=? AND state='ready' AND CAST(charged AS REAL)>0 LIMIT 1", (CAMPAIGN_ANCHOR,)).fetchone():
                raise ERROR("established_campaign_receipt_required")
    except (OSError, sqlite3.Error) as error:
        raise ERROR("existing_campaign_required") from error


class ExistingCampaignProvider:
    """Repeat the identity guard during preflight while execute holds its lock."""
    def __init__(self, root, provider):
        self.root, self.provider = root, provider

    def preflight(self, *args, **kwargs):
        require_existing_campaign(self.root)
        return self.provider.preflight(*args, **kwargs)

    def synthesize(self, request):
        return self.provider.synthesize(request)

    def close(self):
        self.provider.close()


def code_evidence(root):
    """Bind actual imported bytes, including the shared source/export/runtime helpers."""
    root = Path(root).resolve()
    paths = [Path(__file__), Path(source.__file__), Path(campaign.__file__),
        root / "scripts/export_guided_refresh_v2.mjs", root / "src/services/guided_tts/inventory.py",
        *[root / name for name in ("src/__init__.py", "src/services/__init__.py", "src/services/guided_tts/__init__.py")]]
    return [{"path": path.resolve().relative_to(root).as_posix() if path.resolve().is_relative_to(root) else str(path.resolve()),
        "sha256": campaign.digest(path.read_bytes())} for path in paths]


def validate_voice(evidence):
    """Only this authenticated GET's native-language, explicitly null-locale shape."""
    labels = evidence.get("labels", {})
    verified = evidence.get("verified_languages")
    if (evidence.get("method") != "GET only" or type(evidence.get("status")) is not int or evidence["status"] != 200
            or evidence.get("requestedId") != VOICE_ID or evidence.get("voice_id") != VOICE_ID
            or labels.get("language") != "ceb" or labels.get("gender") != "female"
            or labels.get("accent") != "standard" or type(evidence.get("sharingRate")) not in {int, float}
            or evidence["sharingRate"] != 1
            or not isinstance(evidence.get("name"), str) or not evidence["name"].strip()
            or not isinstance(verified, list) or not verified):
        raise ERROR("exact_corazon_native_evidence_required")
    if any(not isinstance(entry, dict) or entry.get("language") != "ceb"
           or "locale" not in entry or entry["locale"] is not None
           or entry.get("accent", "standard") != "standard" for entry in verified):
        raise ERROR("corazon_locale_must_remain_explicitly_unverified")
    return {"voiceId": VOICE_ID, "providerLanguage": "ceb", "sourceLocale": "ceb-PH",
        "verifiedGender": "female", "verifiedLocale": None, "localeVerified": False,
        "localePolicy": LOCALE_POLICY, "verificationMethod": "authenticated-provider-get",
        "sharingRate": evidence["sharingRate"]}


def build_plan(snapshot, evidence, *, snapshot_sha256, provider_evidence_sha256, code,
               excluded_paths=(), runtime=None):
    selectors = source.validate_snapshot(snapshot)
    voice = validate_voice(evidence)
    eligible = {identity: selector for identity, selector in selectors.items()
        if selector["targetLanguage"] == "Cebuano" and selector["level"] in {"A1", "A2"}}
    known_paths = {selector["pathId"] for selector in eligible.values()}
    if (not eligible or len(set(excluded_paths)) != len(excluded_paths)
            or set(excluded_paths) - known_paths or set(excluded_paths) == known_paths):
        raise ERROR("invalid_or_empty_cebuano_path_scope")
    excluded = set(excluded_paths)
    selected = {identity: selector for identity, selector in eligible.items() if selector["pathId"] not in excluded}
    all_variants = [v for v in source.coordinate_variants(snapshot) if (v["pathId"], v["vibe"]) in eligible]
    if any(v["kind"] == "lexical-conflict" and v["pathId"] not in excluded for v in all_variants):
        raise ERROR("lexical_conflict_requires_explicit_path_exclusion")
    groups = []
    order = {"utterances": 0, "chunks": 1, "vocabulary": 2}
    for identity, selector in selected.items():
        path_id, vibe = identity
        match = re.fullmatch(r"cebuano-(a1|a2)-practical-([1-9][0-9]*)", path_id)
        if not match or selector["sourceLocale"] != "ceb-PH":
            raise ERROR("unsupported_cebuano_source_scope")
        profile_key = f"cebuano_{match[1]}_{vibe}_p{match[2]}_corazon_v4_v1"
        settings = dict(campaign.V4_SETTINGS)
        profile = asdict(VoiceProfile(voice_profile_key=profile_key, target_language_code="ceb",
            provider_voice_id=VOICE_ID, provider_model_id="eleven_v4", output_format=campaign.FORMAT,
            voice_settings=settings, voice_settings_hash=voice_settings_hash(settings),
            vibe=vibe, scope_path_id=path_id, priority=90))
        rows = [r for r in snapshot["rows"] if (r["pathId"], r["vibe"]) == identity]
        items = []
        for row in sorted(rows, key=lambda r: order[r["sourceKind"]]):
            text = normalize_spoken_text(row["text"])
            args = dict(provider="elevenlabs", target_language_code="ceb", voice_profile_key=profile_key,
                provider_voice_id=VOICE_ID, provider_model_id="eleven_v4", output_format=campaign.FORMAT,
                settings_hash=profile["voice_settings_hash"], normalization_version=NORMALIZATION_VERSION,
                text_hash_value=text_hash(text))
            items.append({"path_id": path_id, "lesson_id": row["lessonId"], "lesson_number": row["lessonNumber"],
                "vibe": vibe, "surface": row["playbackSurface"], "surface_key": row["playbackSurfaceKey"],
                "source_text": row["text"], "normalized_text": text, "text_hash": text_hash(text), "character_count": len(text),
                **{key: profile[key] for key in ("voice_profile_key", "target_language_code", "provider_voice_id",
                    "provider_model_id", "output_format", "voice_settings_hash")},
                "cache_key": cache_key(**args),
                "storage_path": storage_path(**{k: v for k, v in args.items() if k not in {"provider", "normalization_version"}}),
                "sourceCoordinate": {k: v for k, v in row.items() if k != "text"}})
        groups.append({"targetLanguage": "Cebuano", "pathId": path_id, "vibe": vibe,
            "verifiedProviderName": evidence["name"], "proposedVoiceProfile": profile, "items": items})
    plan = {"schemaVersion": 1, "projectionVersion": VERSION, "status": "local-audio-only-review-required",
        "model": "eleven_v4", "creditBudgetCeiling": campaign.API_CAP,
        "targets": ["Cebuano"], "levels": ["A1", "A2"], "excludedPaths": sorted(excluded),
        "omittedScopes": [s for identity, s in selectors.items() if identity not in selected],
        "excludedCoordinateConflicts": [v for v in all_variants if v["pathId"] in excluded],
        "publicationHolds": [v for v in all_variants if v["pathId"] not in excluded],
        "publicationAuthorized": False, "nativeVoiceVerification": voice,
        "snapshotSha256": snapshot_sha256, "sourceProjectionSha256": snapshot["projectionSha256"],
        "providerEvidenceSha256": provider_evidence_sha256, "executionCode": code,
        "sourceAuthority": snapshot["sourceAuthority"], "exporterRuntimeAuthority": snapshot["runtimeAuthority"],
        "runtimeAuthority": runtime if runtime is not None else source.runtime_evidence(),
        "normalizationVersion": NORMALIZATION_VERSION, "apiDirectory": API_DIRECTORY, "lockPath": LOCK_PATH,
        "existingCampaignAnchor": CAMPAIGN_ANCHOR,
        "groups": groups,
        "aliases": [a for a in snapshot["aliases"] if (a["pathId"], a["vibe"]) in selected]}
    expected_rows = [r for r in snapshot["rows"] if (r["pathId"], r["vibe"]) in selected]
    actual_rows = [{**item["sourceCoordinate"], "text": item["source_text"]} for group in groups for item in group["items"]]
    if Counter(map(campaign.canonical, expected_rows)) != Counter(map(campaign.canonical, actual_rows)):
        raise ERROR("selected_source_coordinates_not_preserved")
    requests = campaign.unique_requests(plan)
    plan.update(usageRows=len(actual_rows), uniqueAudioFiles=len(requests),
        firstAttemptCharacters=sum(len(request["text"]) for request in requests))
    return plan


def validate_rates(rates, plan):
    mode = rates.get("mode")
    models = rates.get("models", {})
    if mode not in {"pilot", "receipt-verified"} or set(models) != {"eleven_v4"}:
        raise ERROR("cebuano_reviewed_rate_mode_required")
    model = models["eleven_v4"]
    voices = model.get("voices", {})
    if set(voices) != {VOICE_ID} or campaign.amount(model.get("modelCharacterCostMultiplier")) <= 0:
        raise ERROR("exact_cebuano_model_voice_rates_required")
    voice = voices[VOICE_ID]
    if (voice.get("sharingRate") != plan["nativeVoiceVerification"]["sharingRate"]
            or not isinstance(voice.get("verification"), str) or not voice["verification"].strip()):
        raise ERROR("cebuano_voice_rate_evidence_required")
    multiplier = campaign.amount(voice.get("creditMultiplier"))
    if (mode == "pilot" and multiplier != 10) or (mode == "receipt-verified" and multiplier < 1):
        raise ERROR("cebuano_conservative_credit_bound_required")


def review_bindings(plan, *, snapshot_raw, voice_raw, plan_raw, rates_raw):
    return {"snapshotSha256": campaign.digest(snapshot_raw), "providerEvidenceSha256": campaign.digest(voice_raw),
        "executionCodeSha256": hashed(plan["executionCode"]),
        "sourceAuthoritySha256": hashed(plan["sourceAuthority"]),
        "exporterRuntimeAuthoritySha256": hashed(plan["exporterRuntimeAuthority"]),
        "runtimeAuthoritySha256": hashed(plan["runtimeAuthority"]), "planSha256": campaign.digest(plan_raw),
        "rateEvidenceSha256": campaign.digest(rates_raw), "targets": plan["targets"], "levels": plan["levels"],
        "excludedPaths": plan["excludedPaths"], "localePolicy": LOCALE_POLICY,
        "apiDirectory": API_DIRECTORY, "lockPath": LOCK_PATH, "apiCreditCap": campaign.API_CAP,
        "existingCampaignAnchor": CAMPAIGN_ANCHOR}


def load_reviewed_inputs(root, snapshot_path, voice_path, review_path, plan_path, rates_path, *,
                         excluded_paths=(), commit=False, expected=None):
    snapshot_raw, voice_raw, review_raw, plan_raw, rates_raw = [Path(p).read_bytes()
        for p in (snapshot_path, voice_path, review_path, plan_path, rates_path)]
    snapshot, voice, review, saved_plan, rates = [json.loads(raw)
        for raw in (snapshot_raw, voice_raw, review_raw, plan_raw, rates_raw)]
    fresh = source.export_snapshot(root)
    if snapshot != fresh:
        raise ERROR("fresh_source_snapshot_mismatch")
    code = code_evidence(root)
    plan = build_plan(fresh, voice, snapshot_sha256=campaign.digest(snapshot_raw),
        provider_evidence_sha256=campaign.digest(voice_raw), code=code, excluded_paths=excluded_paths)
    if saved_plan != plan:
        raise ERROR("rebuilt_plan_mismatch")
    validate_rates(rates, plan)
    bindings = review_bindings(plan, snapshot_raw=snapshot_raw, voice_raw=voice_raw, plan_raw=plan_raw, rates_raw=rates_raw)
    reviewer = review.get("reviewer", {})
    if (review.get("schemaVersion") != 1 or review.get("kind") != REVIEW_KIND
            or review.get("status") != "reviewed" or review.get("verdict") != "PASS"
            or type(review.get("unresolvedFindings")) is not int or review["unresolvedFindings"] != 0
            or reviewer.get("kind") != "independent-agent" or not isinstance(reviewer.get("id"), str)
            or not reviewer["id"].strip() or any(review.get(k) != v for k, v in bindings.items())):
        raise ERROR("independent_pass_review_of_exact_inputs_required")
    fingerprint = hashed({"plan": plan, "reviewSha256": campaign.digest(review_raw), "bindings": bindings})
    if expected is not None and expected != fingerprint:
        raise ERROR("reviewed_input_fingerprint_required")
    if commit:
        if expected != fingerprint:
            raise ERROR("reviewed_input_fingerprint_required")
        source.checked_in(root, [*fresh["sourceAuthority"], *code])
    return plan, fingerprint, rates


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("snapshot", "voice-evidence", "review", "plan", "rates"):
        parser.add_argument(f"--{flag}", type=Path, required=True)
    parser.add_argument("--exclude-paths", default="", help="Reviewed comma-separated Cebuano A1/A2 paths to hold")
    parser.add_argument("--expected-input-sha256")
    parser.add_argument("--commit", action="store_true")
    choice = parser.add_mutually_exclusive_group()
    choice.add_argument("--limit", type=int)
    choice.add_argument("--sample-per-voice", action="store_true")
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1:
        parser.error("limit must be positive")
    root = Path(repo_root).resolve() if repo_root else ROOT
    plan, fingerprint, rates = load_reviewed_inputs(root, args.snapshot, args.voice_evidence, args.review,
        args.plan, args.rates, excluded_paths=args.exclude_paths.split(",") if args.exclude_paths else (),
        commit=args.commit, expected=args.expected_input_sha256)
    if rates["mode"] == "pilot" and not args.sample_per_voice:
        raise ERROR("pilot_requires_representative_sample")
    # All reviewed byte, source, runtime and HEAD gates precede provider construction.
    factory = provider_factory or campaign.ElevenLabsTransport
    if args.commit:
        require_existing_campaign(root)
    provider = ExistingCampaignProvider(root, factory(os.getenv("ELEVENLABS_API_KEY"))) if args.commit else None
    try:
        result = campaign.execute(plan, fingerprint, root / API_DIRECTORY, provider=provider,
            rate_evidence=rates, commit=args.commit, limit=args.limit, sample_per_voice=args.sample_per_voice,
            lock_path=root / LOCK_PATH)
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
    except (ValueError, KeyError, TypeError, AttributeError, OSError):
        print(json.dumps({"status": "stopped", "reason": "cebuano_refresh_inputs_invalid_or_stale"}), file=sys.stderr)
        raise SystemExit(2)
