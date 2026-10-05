"""Isolated Korean B1 P1/P2 local v4 candidate. Exact reviewed bytes; no publication.

Real Korean validation permits digit-unit forms and never rewrites Hangul spacing.
The unchanged paid campaign retains its lock, budget, durable receipts and no retry.
"""
from __future__ import annotations

import argparse
from dataclasses import asdict
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import unicodedata

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/src").is_dir()), HERE.parent)
sys.path.insert(0, str(ROOT))
from scripts import run_guided_native_b1_batch as native

campaign, inventory, shared, ceb = native.campaign, native.inventory, native.shared, native.ceb
ERROR = campaign.CampaignError
local_path, read_binding, hashed = native.local_path, native.read_binding, native.hashed
API_DIRECTORY, LOCK_PATH, CAMPAIGN_ANCHOR = native.API_DIRECTORY, native.LOCK_PATH, native.CAMPAIGN_ANCHOR
VERSION = "korean-b1-four-turn-v1"
CONTENT_ROOT = "frontend/content-drafts/b1-native-2026-10/korean"
GATE = "frontend/scripts/lib/guidedKoreanB1Drafts.ts"
VOICE_ID = "0oqpliV6dVSr9XomngOW"


def code_evidence(root):
    root = Path(root).resolve()
    result = native.code_evidence(root)
    for path in (Path(__file__), HERE / "export_guided_korean_b1.mjs"):
        path = path.resolve()
        result.append({"path": path.relative_to(root).as_posix() if path.is_relative_to(root) else str(path),
            "sha256": campaign.digest(path.read_bytes())})
    if len({item["path"] for item in result}) != len(result): raise ERROR("duplicate_execution_authority")
    return result


def export_korean(root, inputs):
    node = shutil.which("node")
    if not node: raise ERROR("node_required")
    if any(os.environ.get(key) for key in ("NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH")):
        raise ERROR("unreviewed_node_runtime_override")
    result = subprocess.run([node, str(HERE / "export_guided_korean_b1.mjs"), "--repo", str(Path(root).resolve())],
        input=campaign.canonical(inputs).encode("utf-8"), cwd=Path(root) / "frontend", capture_output=True, timeout=120, check=False)
    if result.returncode: raise ERROR("korean_b1_offline_validation_failed")
    return json.loads(result.stdout)


def expected_rows(source, entry):
    """Independent coverage; the real Korean gate owns native exercise validation."""
    number = entry["pathNumber"]
    if (entry.get("targetLanguage") != "Korean" or type(number) is not int or number not in {1, 2}
            or source.get("targetLanguage") != "Korean" or source.get("targetLanguageCode") != "ko-KR"
            or type(source.get("schemaVersion")) is not int or source["schemaVersion"] != 1 or source.get("status") != "draft"
            or source.get("level") != "B1" or source.get("baseLanguage") != "German"
            or type(source.get("pathNumber")) is not int or source["pathNumber"] != number or len(source.get("lessons", [])) != 10):
        raise ERROR("korean_b1_source_scope_mismatch")
    path_id, rows, slugs = f"korean-b1-practical-{number}", [], set()
    for index, lesson in enumerate(source["lessons"]):
        slug = lesson.get("slug")
        if not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug in slugs:
            raise ERROR("invalid_korean_b1_lesson_identity")
        slugs.add(slug); prefix = slug.split("-")[0]
        if len(lesson.get("dialogue", [])) != 4: raise ERROR("four_korean_dialogue_turns_required")
        if (not 4 <= len(lesson.get("chunks", [])) <= 7 or not 6 <= len(lesson.get("terms", [])) <= 8
                or not 2 <= len(lesson.get("pattern", {}).get("examples", [])) <= 3
                or " ".join(chunk["targetText"] for chunk in lesson["chunks"]) != lesson["dialogue"][1]["targetText"]):
            raise ERROR("complete_korean_speech_surfaces_required")
        def add(pointer, kind, surface, key, text):
            # Korean's actual gate allows digit units. Do not apply the Latin digit ban.
            if (not isinstance(text, str) or unicodedata.normalize("NFC", text) != text
                    or not re.fullmatch(r"[가-힣0-9]+[.?,]?(?: [가-힣0-9]+[.?,]?)*", text)):
                raise ERROR("invalid_korean_spoken_text")
            rows.append({"pathId": path_id, "lessonId": f"{path_id}-{(number-1)*10+index+1:03}-{slug}",
                "lessonNumber": index + 1, "tierGlobalLessonNumber": (number-1)*10+index+1, "targetLanguage": "Korean",
                "targetLanguageCode": "ko-KR", "level": "B1", "vibe": "bright", "sourceFile": entry["file"],
                "sourceSha256": entry["sha256"], "sourcePointer": f"/lessons/{index}/{pointer}", "sourceKind": kind,
                "playbackSurface": surface, "playbackSurfaceKey": key, "text": text})
        for i, turn in enumerate(lesson["dialogue"]):
            add(f"dialogue/{i}/targetText", "utterances", "corePhrase" if i == 1 else "dialogue", "__self" if i == 1 else f"turn-{i+1}", turn["targetText"])
        for field, kind, key in (("chunks", "chunks", ""), ("terms", "vocabulary", "item-")):
            for i, item in enumerate(lesson[field]): add(f"{field}/{i}/targetText", kind, "chunk", f"{prefix}-{key}{i+1}", item["targetText"])
        add("trophyWord/word", "vocabulary", "trophyWord", "__self", lesson["trophyWord"]["word"])
        add("trophyWord/example", "utterances", "trophyExample", "__self", lesson["trophyWord"]["example"])
        for i, example in enumerate(lesson["pattern"]["examples"]):
            add(f"pattern/examples/{i}/targetText", "utterances", "pattern", f"ex-{i+1}", example["targetText"])
    return rows


def voice_evidence(root, manifest):
    bindings = manifest.get("voiceEvidence", {})
    if set(bindings) != {"Korean"}: raise ERROR("exact_korean_voice_evidence_required")
    value, authority = read_binding(root, bindings["Korean"])
    matches = [voice for voice in value.get("providerVoices", []) if voice.get("requestedId") == VOICE_ID]
    if value.get("method") != "GET only" or len(matches) != 1: raise ERROR("verified_jini_voice_evidence_required")
    voice = matches[0]
    if (type(voice.get("status")) is not int or voice["status"] != 200 or voice.get("voice_id") != VOICE_ID
            or any(voice.get("labels", {}).get(key) != expected for key, expected in {"language": "ko", "gender": "female", "accent": "standard"}.items())
            or type(voice.get("sharingRate")) not in {int, float} or voice["sharingRate"] != 1
            or not isinstance(voice.get("name"), str) or not voice["name"].strip()
            or not any(v.get("language") == "ko" and v.get("locale") == "ko-KR" and v.get("accent") == "standard" for v in voice.get("verified_languages", []))):
        raise ERROR("verified_jini_voice_evidence_required")
    return {"voiceId": VOICE_ID, "name": voice["name"], "providerLanguage": "ko", "sourceLocale": "ko-KR",
        "verifiedLocale": "ko-KR", "localeVerified": True, "verifiedGender": "female", "verifiedAccent": "standard",
        "verificationMethod": "authenticated-provider-get", "sharingRate": voice["sharingRate"]}, authority


def content_review(root, manifest, name, sources, specifications):
    authority = native.content_review(root, manifest, name, sources, specifications)
    envelope, current = read_binding(root, manifest[name])
    if current != authority:
        raise ERROR("korean_review_changed_during_validation")

    def zero(value):
        return (type(value) is int and value == 0) or (isinstance(value, list) and not value)

    findings = envelope.get("unresolvedPublicationFindings")
    verdict = envelope.get("publicationVerdict")
    if (envelope.get("localTtsContentVerdict") != "PASS" or not zero(envelope.get("unresolvedLocalTtsBlockers"))
            or not isinstance(findings, list) or verdict not in {"PASS", "REWORK"}
            or (verdict == "PASS") != (not findings)):
        raise ERROR("explicit_korean_spoken_approval_required")
    ids = []
    for finding in findings:
        if (not isinstance(finding, dict) or not isinstance(finding.get("id"), str) or not finding["id"].strip()
                or finding.get("severity") not in {"BLOCKER", "HIGH", "MEDIUM", "LOW"}):
            raise ERROR("complete_korean_publication_findings_required")
        ids.append(finding["id"])
    if len(set(ids)) != len(ids):
        raise ERROR("duplicate_korean_publication_finding")
    raw = envelope.get("rawReview", {})
    if name == "independentReview":
        if (raw.get("localTtsContentVerdict") != "PASS" or not zero(raw.get("unresolvedLocalTtsBlockers"))
                or raw.get("publicationVerdict") != verdict or raw.get("findings") != findings
                or raw.get("remainingPublicationFindings") != ids
                or raw.get("fullCoverage", {}).get("personallyReadEveryField") is not True):
            raise ERROR("embedded_korean_review_scope_mismatch")
    else:
        read_through = raw.get("readThrough", [])
        required = {f"korean-{Path(path).name}" for path in sources}
        if (raw.get("verdict") not in {"PASS", "APPLY_EXACT_EDITS"} or not isinstance(read_through, list)
                or not required <= {row.get("file") for row in read_through}
                or any(row.get("lessonsRead") != list(range(1, 11)) for row in read_through)
                or type(envelope.get("exactReplayEdits")) is not int
                or envelope["exactReplayEdits"] != len(raw.get("edits", []))):
            raise ERROR("complete_korean_fable_read_required")
    return authority, {"review": name, "evidence": authority, "localTtsContentVerdict": "PASS",
        "unresolvedLocalTtsBlockers": [], "publicationVerdict": verdict,
        "unresolvedPublicationFindings": findings}


def prepare_inputs(root, manifest_path):
    root, path = Path(root).resolve(), Path(manifest_path).resolve()
    if not path.is_relative_to(root): raise ERROR("manifest_outside_checkout")
    manifest_name = path.relative_to(root).as_posix(); raw = local_path(root, manifest_name).read_bytes(); manifest = json.loads(raw)
    entries = manifest.get("sources")
    if (type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1
            or manifest.get("kind") != "korean-b1-content-manifest" or manifest.get("status") != "reviewed-staged"
            or not isinstance(entries, list) or not 1 <= len(entries) <= 2): raise ERROR("reviewed_korean_b1_manifest_required")
    inputs, sources, specifications, scopes = [], {}, {}, set()
    authority = [{"path": manifest_name, "sha256": campaign.digest(raw)}]
    for entry in entries:
        number = entry.get("pathNumber")
        if (entry.get("targetLanguage") != "Korean" or type(number) is not int or number not in {1, 2} or number in scopes
                or entry.get("file") != f"{CONTENT_ROOT}/p{number}.json" or entry.get("reviewedVoiceId") != VOICE_ID):
            raise ERROR("unsupported_or_duplicate_korean_b1_scope")
        scopes.add(number); source, item = read_binding(root, entry); sources[item["path"]] = item["sha256"]; authority.append(item)
        binding = entry.get("specification", {})
        if binding.get("file") != f"{CONTENT_ROOT}/specification.json": raise ERROR("full_korean_specification_required")
        specification, item = read_binding(root, binding)
        if item["path"] in specifications and specifications[item["path"]] != item["sha256"]: raise ERROR("inconsistent_korean_specification")
        specifications[item["path"]] = item["sha256"]; authority.append(item)
        inputs.append({"entry": entry, "source": source, "specification": specification})
    content_scopes = []
    for name in ("fableReview", "independentReview"):
        item, scope = content_review(root, manifest, name, sources, specifications)
        authority.append(item); content_scopes.append(scope)
    if any(content_scopes[0][key] != content_scopes[1][key] for key in ("publicationVerdict", "unresolvedPublicationFindings")):
        raise ERROR("korean_review_publication_scope_disagrees")
    voice, voice_authority = voice_evidence(root, manifest); authority.append(voice_authority)
    snapshot = export_korean(root, inputs)
    expected = [row for item in inputs for row in expected_rows(item["source"], item["entry"])]
    runtime = snapshot.get("runtimeAuthority", {})
    if (type(snapshot.get("schemaVersion")) is not int or snapshot["schemaVersion"] != 1 or snapshot.get("projectionVersion") != VERSION
            or snapshot.get("validation") != {"validator": GATE, "fullKoreanSpecification": True, "passed": len(inputs)}
            or snapshot.get("rows") != expected or not snapshot.get("sourceAuthority") or not runtime.get("files")
            or not re.fullmatch(r"[a-f0-9]{64}", runtime.get("validatorBundleSha256", ""))): raise ERROR("complete_korean_projection_required")
    coordinates = [(row["lessonId"], row["playbackSurface"], row["playbackSurfaceKey"]) for row in expected]
    if len(set(coordinates)) != len(expected): raise ERROR("duplicate_korean_playback_coordinate")
    groups = []
    for item in inputs:
        entry = item["entry"]; number = entry["pathNumber"]
        path_id, settings = f"korean-b1-practical-{number}", dict(campaign.V4_SETTINGS)
        profile = asdict(inventory.VoiceProfile(voice_profile_key=f"korean_b1_bright_p{number}_v4_v1", target_language_code="ko",
            vibe="bright", scope_path_id=path_id, provider_voice_id=VOICE_ID, provider_model_id="eleven_v4", output_format=campaign.FORMAT,
            voice_settings=settings, voice_settings_hash=inventory.voice_settings_hash(settings), priority=90))
        items = []
        for row in (row for row in expected if row["sourceFile"] == entry["file"]):
            text = inventory.normalize_spoken_text(row["text"])
            # The allowed Korean alphabet/spacing already is canonical. Never join or rewrite it.
            if text != row["text"]: raise ERROR("korean_normalization_must_preserve_source")
            args = dict(provider="elevenlabs", target_language_code="ko", voice_profile_key=profile["voice_profile_key"],
                provider_voice_id=VOICE_ID, provider_model_id="eleven_v4", output_format=campaign.FORMAT, settings_hash=profile["voice_settings_hash"],
                normalization_version=inventory.NORMALIZATION_VERSION, text_hash_value=inventory.text_hash(text))
            items.append({"path_id": path_id, "lesson_id": row["lessonId"], "lesson_number": row["lessonNumber"], "vibe": "bright",
                "surface": row["playbackSurface"], "surface_key": row["playbackSurfaceKey"], "source_text": row["text"], "normalized_text": text,
                "text_hash": inventory.text_hash(text), "character_count": len(text),
                **{key: profile[key] for key in ("voice_profile_key", "target_language_code", "provider_voice_id", "provider_model_id", "output_format", "voice_settings_hash")},
                "cache_key": inventory.cache_key(**args), "storage_path": inventory.storage_path(**{k: v for k, v in args.items() if k not in {"provider", "normalization_version"}}),
                "sourceCoordinate": {k: v for k, v in row.items() if k != "text"}})
        groups.append({"targetLanguage": "Korean", "pathId": path_id, "lessonCount": 10,
            "proposedVoiceProfile": profile, "nativeVoiceVerification": voice, "items": items})
    code = code_evidence(root)
    plan = {"schemaVersion": 1, "projectionVersion": VERSION, "status": "reviewed-staged-local-audio-only", "publicationAuthorized": False,
        "publicationHolds": ["listening", "runtime-and-catalog-integration", "twelve-base-editions", "named-production-approval",
            *[finding["id"] for finding in content_scopes[1]["unresolvedPublicationFindings"]]],
        "contentReviewScopes": content_scopes,
        "level": "B1", "model": "eleven_v4", "creditBudgetCeiling": campaign.API_CAP, "normalizationVersion": inventory.NORMALIZATION_VERSION,
        "targets": ["Korean"], "groups": groups, "manifestSha256": campaign.digest(raw), "sourceEvidence": sources,
        "specificationEvidence": specifications, "reviewAndVoiceEvidence": authority, "sourceAuthority": snapshot["sourceAuthority"],
        "exporterRuntimeAuthority": runtime, "runtimeAuthority": shared.runtime_evidence(), "executionCode": code,
        "apiDirectory": API_DIRECTORY, "lockPath": LOCK_PATH, "existingCampaignAnchor": CAMPAIGN_ANCHOR}
    requests = campaign.unique_requests(plan)
    plan.update(usageRows=len(expected), uniqueAudioFiles=len(requests), firstAttemptCharacters=sum(len(r["text"]) for r in requests))
    tracked = [item for item in authority if item["path"] == manifest_name or item["path"] in sources or item["path"] in specifications]
    merged = {}
    for item in [*tracked, *snapshot["sourceAuthority"], *code]:
        if item["path"] in merged and item["sha256"] != merged[item["path"]]["sha256"]: raise ERROR("authority_changed_during_preparation")
        merged[item["path"]] = item
    return plan, list(merged.values())


def validate_rates(rates, plan):
    if rates.get("mode") != "receipt-verified" or set(rates.get("models", {})) != {"eleven_v4"}:
        raise ERROR("korean_full_run_requires_positive_voice_receipt")
    model = rates["models"]["eleven_v4"]
    if set(model.get("voices", {})) != {VOICE_ID} or campaign.amount(model.get("modelCharacterCostMultiplier")) <= 0:
        raise ERROR("exact_korean_rate_scope_required")
    voice = model["voices"][VOICE_ID]
    if (type(voice.get("sharingRate")) not in {int, float} or voice["sharingRate"] != 1
            or campaign.amount(voice.get("creditMultiplier")) < 1 or not isinstance(voice.get("verification"), str) or not voice["verification"].strip()):
        raise ERROR("reviewed_korean_upper_rate_required")


review_bindings = native.review_bindings


def load_inputs(root, manifest_path, plan_path, rates_path, review_path, *, commit=False, expected=None):
    plan_raw, rates_raw, review_raw = [Path(path).read_bytes() for path in (plan_path, rates_path, review_path)]
    saved, rates, review = [json.loads(raw) for raw in (plan_raw, rates_raw, review_raw)]
    plan, authority = prepare_inputs(root, manifest_path)
    if saved != plan: raise ERROR("rebuilt_plan_mismatch")
    validate_rates(rates, plan); bindings = review_bindings(plan, plan_raw, rates_raw); reviewer = review.get("reviewer", {})
    if (type(review.get("schemaVersion")) is not int or review["schemaVersion"] != 1 or review.get("kind") != "korean-b1-execution-review"
            or review.get("verdict") != "PASS" or type(review.get("unresolvedFindings")) is not int or review["unresolvedFindings"] != 0
            or reviewer.get("kind") != "independent-agent" or reviewer.get("authorOfExecutionCode") is not False
            or not isinstance(reviewer.get("id"), str) or not reviewer["id"].strip() or review.get("scope") != "full-run-and-rates"
            or any(review.get(key) != value for key, value in bindings.items())): raise ERROR("independent_exact_execution_and_rates_review_required")
    fingerprint = hashed({"plan": plan, "bindings": bindings, "reviewSha256": campaign.digest(review_raw)})
    if expected is not None and expected != fingerprint: raise ERROR("reviewed_input_fingerprint_required")
    if commit:
        if expected != fingerprint: raise ERROR("reviewed_input_fingerprint_required")
        shared.checked_in(root, authority)
    return plan, fingerprint, rates


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("manifest", "plan", "rates", "review"): parser.add_argument(f"--{flag}", type=Path, required=True)
    parser.add_argument("--expected-input-sha256"); parser.add_argument("--commit", action="store_true"); parser.add_argument("--limit", type=int)
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1: parser.error("limit must be positive")
    root = Path(repo_root).resolve() if repo_root else ROOT
    plan, fingerprint, rates = load_inputs(root, args.manifest, args.plan, args.rates, args.review, commit=args.commit, expected=args.expected_input_sha256)
    provider = None
    if args.commit:
        ceb.require_existing_campaign(root)
        provider = ceb.ExistingCampaignProvider(root, (provider_factory or campaign.ElevenLabsTransport)(os.getenv("ELEVENLABS_API_KEY")))
    try:
        result = campaign.execute(plan, fingerprint, root / API_DIRECTORY, provider=provider, rate_evidence=rates,
            commit=args.commit, limit=args.limit, lock_path=root / LOCK_PATH)
        print(json.dumps(result, ensure_ascii=False, indent=2)); return 0
    finally:
        if provider is not None: provider.close()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except campaign.CampaignError as error:
        print(json.dumps({"status": "stopped", "reason": str(error)}), file=sys.stderr); raise SystemExit(2)
    except (ValueError, KeyError, TypeError, AttributeError, OSError, subprocess.SubprocessError):
        print(json.dumps({"status": "stopped", "reason": "korean_inputs_invalid_or_stale"}), file=sys.stderr); raise SystemExit(2)
