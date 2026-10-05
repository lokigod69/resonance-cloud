"""French B2 P1/P2 local v4 candidate. No publication or retries.

Fresh captured TypeScript gate, full specifications, frozen/reserved trophy ledger,
exact content/execution reviews, HEAD equality, and the existing campaign required.
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
from scripts import plan_guided_b1_drafts as proposals

campaign, inventory, shared, ceb = native.campaign, native.inventory, native.shared, native.ceb
ERROR = campaign.CampaignError
local_path, read_binding, hashed = native.local_path, native.read_binding, native.hashed
API_DIRECTORY, LOCK_PATH, CAMPAIGN_ANCHOR = native.API_DIRECTORY, native.LOCK_PATH, native.CAMPAIGN_ANCHOR
VERSION = "french-b2-six-turn-v1"
CONTENT_ROOT = "frontend/content-drafts/b2-2026-10"
LEDGER_PATH = f"{CONTENT_ROOT}/latin-prerequisites.json"
VOICES = {"French": "z1rEShu1SmowIOAmbHl1"}
CODES = {"French": "fr"}
VOICE_LABELS = {"French": {"language": "fr", "gender": "female", "accent": "standard"}}
LOCALES = {"French": "fr-FR"}
GATE = "frontend/scripts/lib/guidedFrenchB2Drafts.ts"


def code_evidence(root):
    root = Path(root).resolve()
    result = native.code_evidence(root)
    for path in (Path(__file__), HERE / "export_guided_french_b2.mjs", Path(proposals.__file__)):
        path = path.resolve()
        result.append({"path": path.relative_to(root).as_posix() if path.is_relative_to(root) else str(path),
            "sha256": campaign.digest(path.read_bytes())})
    if len({item["path"] for item in result}) != len(result):
        raise ERROR("duplicate_execution_authority")
    return result


def export_french(root, inputs):
    node = shutil.which("node")
    if not node:
        raise ERROR("node_required")
    if any(os.environ.get(key) for key in ("NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH")):
        raise ERROR("unreviewed_node_runtime_override")
    result = subprocess.run([node, str(HERE / "export_guided_french_b2.mjs"), "--repo", str(Path(root).resolve())],
        input=campaign.canonical(inputs).encode("utf-8"), cwd=Path(root) / "frontend",
        capture_output=True, timeout=120, check=False)
    if result.returncode:
        raise ERROR("french_b2_offline_validation_failed")
    return json.loads(result.stdout)


def expected_rows(source, entry):
    """Independent speech enumeration; real TypeScript validates exercise semantics."""
    target, number = entry["targetLanguage"], entry["pathNumber"]
    if (source.get("targetLanguage") != target or source.get("targetLanguageCode") != LOCALES[target]
            or type(source.get("schemaVersion")) is not int or source["schemaVersion"] != 1 or source.get("status") != "draft"
            or source.get("level") != "B2" or source.get("authoredBaseLanguage") != "German"
            or type(source.get("pathNumber")) is not int or source["pathNumber"] != number
            or len(source.get("lessons", [])) != 10):
        raise ERROR("french_b2_source_scope_mismatch")
    path_id, rows, slugs = f"{target.lower()}-b2-practical-{number}", [], set()
    for index, lesson in enumerate(source["lessons"]):
        slug = lesson.get("slug")
        if (type(lesson.get("lessonNumber")) is not int or lesson["lessonNumber"] != index + 1
                or not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug) or slug in slugs):
            raise ERROR("invalid_french_b2_lesson_identity")
        slugs.add(slug)
        turns = lesson.get("dialogue", [])
        if len(turns) != 6 or any(turn.get("speaker") != ("you" if i % 2 else "them") for i, turn in enumerate(turns)):
            raise ERROR("six_alternating_french_b2_turns_required")
        if (len(lesson.get("speak", [])) != 3 or any(type(t.get("turnIndex")) is not int for t in lesson["speak"])
                or sorted(t["turnIndex"] for t in lesson["speak"]) != [1, 3, 5]):
            raise ERROR("three_french_b2_speech_targets_required")
        build = lesson["build"]
        if (not 5 <= len(build["chunks"]) <= 8 or not 8 <= len(lesson["terms"]) <= 10
                or not 2 <= len(lesson["pattern"]["examples"]) <= 3
                or build["framePrefix"] + " ".join(build["chunks"]) + build["frameSuffix"] != turns[1]["targetText"]):
            raise ERROR("complete_french_b2_speech_surfaces_required")
        def add(pointer, kind, surface, key, text):
            if (not isinstance(text, str) or not text or text != text.strip()
                    or unicodedata.normalize("NFC", text) != text or re.search(r"\s{2}|[\[\]<>0-9]|https?:", text, re.IGNORECASE)
                    or any(unicodedata.category(char) in {"Cc", "Cf", "Cs", "So"} for char in text)):
                raise ERROR("invalid_french_b2_spoken_text")
            rows.append({"pathId": path_id, "lessonId": f"{path_id}-{(number-1)*10+index+1:03}-{slug}",
                "lessonNumber": index + 1, "tierGlobalLessonNumber": (number-1)*10+index+1,
                "targetLanguage": target, "targetLanguageCode": LOCALES[target], "level": "B2", "vibe": "bright",
                "sourceFile": entry["file"], "sourceSha256": entry["sha256"], "sourcePointer": f"/lessons/{index}/{pointer}",
                "sourceKind": kind, "playbackSurface": surface, "playbackSurfaceKey": key, "text": text})
        for i, turn in enumerate(turns):
            add(f"dialogue/{i}/targetText", "utterances", "corePhrase" if i == 1 else "dialogue", "__self" if i == 1 else f"turn-{i+1}", turn["targetText"])
        for i, chunk in enumerate(build["chunks"]):
            add(f"build/chunks/{i}", "chunks", "chunk", f"build-chunk-{i+1}", chunk)
        for i, term in enumerate(lesson["terms"]):
            add(f"terms/{i}/targetText", "vocabulary", "chunk", f"term-{i+1}", term["targetText"])
        add("trophy/lemma", "vocabulary", "trophyWord", "__self", lesson["trophy"]["lemma"])
        add("trophy/example/targetText", "utterances", "trophyExample", "__self", lesson["trophy"]["example"]["targetText"])
        for i, example in enumerate(lesson["pattern"]["examples"]):
            add(f"pattern/examples/{i}/targetText", "utterances", "pattern", f"ex-{i+1}", example["targetText"])
    return rows


def voice_evidence(root, manifest, targets):
    bindings, voices, authority = manifest.get("voiceEvidence", {}), {}, []
    if set(bindings) != set(targets):
        raise ERROR("exact_french_voice_evidence_required")
    for target in targets:
        value, item = read_binding(root, bindings[target]); authority.append(item)
        matches = [voice for voice in value.get("providerVoices", []) if voice.get("requestedId") == VOICES[target]]
        if value.get("method") != "GET only" or len(matches) != 1:
            raise ERROR("verified_french_voice_evidence_required")
        voice, labels = matches[0], VOICE_LABELS[target]
        if (type(voice.get("status")) is not int or voice["status"] != 200 or voice.get("voice_id") != VOICES[target]
                or any(voice.get("labels", {}).get(key) != expected for key, expected in labels.items())
                or type(voice.get("sharingRate")) not in {int, float} or voice["sharingRate"] != 1
                or not isinstance(voice.get("name"), str) or not voice["name"].strip()
                or not any(v.get("language") == labels["language"] and v.get("locale") == LOCALES[target]
                    and v.get("accent") == labels["accent"] for v in voice.get("verified_languages", []))):
            raise ERROR("verified_french_voice_evidence_required")
        voices[target] = {"voiceId": VOICES[target], "name": voice["name"], "providerLanguage": labels["language"],
            "sourceLocale": LOCALES[target], "verifiedLocale": LOCALES[target], "localeVerified": True,
            "verifiedGender": labels["gender"], "verifiedAccent": labels["accent"],
            "verificationMethod": "authenticated-provider-get", "sharingRate": voice["sharingRate"]}
    return voices, authority


def content_review(root, manifest, name, sources, specifications):
    authority = native.content_review(root, manifest, name, sources, specifications)
    envelope, current = read_binding(root, manifest[name])
    if current != authority: raise ERROR("french_b2_review_changed_during_validation")
    def zero(value):
        return (type(value) is int and value == 0) or (isinstance(value, list) and not value)
    findings, verdict = envelope.get("unresolvedPublicationFindings"), envelope.get("publicationVerdict")
    if (envelope.get("localTtsContentVerdict") != "PASS" or not zero(envelope.get("unresolvedLocalTtsBlockers"))
            or not isinstance(findings, list) or verdict not in {"PASS", "REWORK"}
            or (verdict == "PASS") != (not findings)):
        raise ERROR("explicit_french_b2_spoken_approval_required")
    ids = []
    for finding in findings:
        if (not isinstance(finding, dict) or not isinstance(finding.get("id"), str) or not finding["id"].strip()
                or finding.get("severity") not in {"BLOCKER", "HIGH", "MEDIUM", "LOW"}):
            raise ERROR("complete_french_b2_publication_findings_required")
        ids.append(finding["id"])
    if len(set(ids)) != len(ids): raise ERROR("duplicate_french_b2_publication_finding")
    if name == "independentReview":
        raw = envelope.get("rawReview", {})
        if (raw.get("localTtsContentVerdict") != "PASS" or not zero(raw.get("unresolvedLocalTtsBlockers"))
                or raw.get("publicationVerdict") != verdict or raw.get("remainingPublicationFindings") != findings):
            raise ERROR("embedded_french_b2_review_scope_mismatch")
    else:
        chain = envelope.get("reviewChain")
        required = {f"{Path(path).parent.name}-b2-{Path(path).name}" for path in sources}
        if not isinstance(chain, list) or not chain: raise ERROR("complete_french_b2_fable_read_required")
        for review in chain:
            raw = review.get("rawReview", {}); read_through = raw.get("readThrough", [])
            if (raw.get("verdict") not in {"PASS", "APPLY_EXACT_EDITS"} or not isinstance(read_through, list)
                    or not required <= {Path(row.get("file", "")).name for row in read_through}
                    or any(row.get("lessonsRead") != list(range(1, 11)) for row in read_through)
                    or type(review.get("exactEdits")) is not int or review["exactEdits"] != len(raw.get("edits", []))):
                raise ERROR("complete_french_b2_fable_read_required")
    return authority, {"review": name, "evidence": authority, "localTtsContentVerdict": "PASS",
        "unresolvedLocalTtsBlockers": [], "publicationVerdict": verdict, "unresolvedPublicationFindings": findings}


def prepare_inputs(root, manifest_path):
    root, path = Path(root).resolve(), Path(manifest_path).resolve()
    if not path.is_relative_to(root):
        raise ERROR("manifest_outside_checkout")
    manifest_name = path.relative_to(root).as_posix()
    raw = local_path(root, manifest_name).read_bytes(); manifest = json.loads(raw)
    entries = manifest.get("sources")
    if (type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1
            or manifest.get("kind") != "french-b2-content-manifest" or manifest.get("status") != "reviewed-staged"
            or not isinstance(entries, list) or not 1 <= len(entries) <= 2):
        raise ERROR("reviewed_french_b2_manifest_required")
    inputs, sources, specifications, scopes = [], {}, {}, set()
    authority = [{"path": manifest_name, "sha256": campaign.digest(raw)}]
    for entry in entries:
        target, number = entry.get("targetLanguage"), entry.get("pathNumber")
        if (target not in VOICES or type(number) is not int or number not in {1, 2} or (target, number) in scopes
                or entry.get("file") != f"{CONTENT_ROOT}/{target.lower()}/p{number}.json"
                or entry.get("reviewedVoiceId") != VOICES[target]):
            raise ERROR("unsupported_or_duplicate_french_b2_scope")
        scopes.add((target, number))
        source, item = read_binding(root, entry); sources[item["path"]] = item["sha256"]; authority.append(item)
        loaded = {"entry": entry, "source": source}
        bindings = {"specification": f"{CONTENT_ROOT}/{target.lower()}/specification.json",
            "prerequisites": LEDGER_PATH, "b1Reservation": f"frontend/content-drafts/b1-2026-10/{target.lower()}-plan.json"}
        for key, expected_path in bindings.items():
            binding = entry.get(key, {})
            if binding.get("file") != expected_path:
                raise ERROR("full_french_b2_authority_required")
            value, item = read_binding(root, binding)
            if item["path"] in specifications and specifications[item["path"]] != item["sha256"]:
                raise ERROR("inconsistent_french_b2_authority")
            specifications[item["path"]] = item["sha256"]; authority.append(item)
            loaded["b1Plan" if key == "b1Reservation" else key] = value
            if key in {"specification", "prerequisites"}:
                exact_raw = local_path(root, binding["file"]).read_bytes()
                if campaign.digest(exact_raw) != item["sha256"]:
                    raise ERROR("french_authority_changed_during_read")
                loaded[key + "Source"] = exact_raw.decode("utf-8")
        inputs.append(loaded)
    content_scopes = []
    for name in ("fableReview", "independentReview"):
        item, scope = content_review(root, manifest, name, sources, specifications)
        authority.append(item); content_scopes.append(scope)
    if any(content_scopes[0][key] != content_scopes[1][key] for key in ("publicationVerdict", "unresolvedPublicationFindings")):
        raise ERROR("french_b2_review_publication_scope_disagrees")
    targets = [target for target in VOICES if any(scope[0] == target for scope in scopes)]
    voices, voice_authority = voice_evidence(root, manifest, targets); authority.extend(voice_authority)
    snapshot = export_french(root, inputs)
    expected = [row for item in inputs for row in expected_rows(item["source"], item["entry"])]
    runtime = snapshot.get("runtimeAuthority", {})
    if (type(snapshot.get("schemaVersion")) is not int or snapshot["schemaVersion"] != 1 or snapshot.get("projectionVersion") != VERSION
            or snapshot.get("validation") != {"validator": GATE, "fullSpecification": True, "frozenAndReservedLedger": True, "passed": len(inputs)}
            or snapshot.get("rows") != expected or not snapshot.get("sourceAuthority") or not runtime.get("files")
            or any(not re.fullmatch(r"[a-f0-9]{64}", runtime.get(key, "")) for key in ("validatorBundleSha256", "corpusBundleSha256"))):
        raise ERROR("complete_french_b2_projection_required")
    coordinates = [(r["lessonId"], r["playbackSurface"], r["playbackSurfaceKey"]) for r in expected]
    if len(set(coordinates)) != len(expected):
        raise ERROR("duplicate_french_b2_playback_coordinate")
    groups = []
    for item in inputs:
        entry = item["entry"]; target, number = entry["targetLanguage"], entry["pathNumber"]
        path_id, settings = f"{target.lower()}-b2-practical-{number}", dict(campaign.V4_SETTINGS)
        profile = asdict(inventory.VoiceProfile(voice_profile_key=f"{target.lower()}_b2_bright_p{number}_v4_v1",
            target_language_code=CODES[target], vibe="bright", scope_path_id=path_id,
            provider_voice_id=VOICES[target], provider_model_id="eleven_v4", output_format=campaign.FORMAT,
            voice_settings=settings, voice_settings_hash=inventory.voice_settings_hash(settings), priority=90))
        items = []
        for row in (row for row in expected if row["sourceFile"] == entry["file"]):
            text = inventory.normalize_spoken_text(row["text"])
            args = dict(provider="elevenlabs", target_language_code=CODES[target], voice_profile_key=profile["voice_profile_key"],
                provider_voice_id=VOICES[target], provider_model_id="eleven_v4", output_format=campaign.FORMAT,
                settings_hash=profile["voice_settings_hash"], normalization_version=inventory.NORMALIZATION_VERSION,
                text_hash_value=inventory.text_hash(text))
            items.append({"path_id": path_id, "lesson_id": row["lessonId"], "lesson_number": row["lessonNumber"], "vibe": "bright",
                "surface": row["playbackSurface"], "surface_key": row["playbackSurfaceKey"], "source_text": row["text"],
                "normalized_text": text, "text_hash": inventory.text_hash(text), "character_count": len(text),
                **{key: profile[key] for key in ("voice_profile_key", "target_language_code", "provider_voice_id", "provider_model_id", "output_format", "voice_settings_hash")},
                "cache_key": inventory.cache_key(**args), "storage_path": inventory.storage_path(**{k: v for k, v in args.items() if k not in {"provider", "normalization_version"}}),
                "sourceCoordinate": {k: v for k, v in row.items() if k != "text"}})
        groups.append({"targetLanguage": target, "pathId": path_id, "lessonCount": 10,
            "proposedVoiceProfile": profile, "nativeVoiceVerification": voices[target], "items": items})
    code = code_evidence(root)
    plan = {"schemaVersion": 1, "projectionVersion": VERSION, "status": "reviewed-staged-local-audio-only",
        "publicationAuthorized": False, "publicationHolds": ["listening", "runtime-and-catalog-integration", "twelve-base-editions", "named-production-approval",
            *[finding["id"] for finding in content_scopes[1]["unresolvedPublicationFindings"]]],
        "contentReviewScopes": content_scopes,
        "level": "B2", "model": "eleven_v4", "creditBudgetCeiling": campaign.API_CAP,
        "normalizationVersion": inventory.NORMALIZATION_VERSION, "targets": targets, "groups": groups,
        "manifestSha256": campaign.digest(raw), "sourceEvidence": sources, "specificationEvidence": specifications,
        "reviewAndVoiceEvidence": authority, "sourceAuthority": snapshot["sourceAuthority"],
        "exporterRuntimeAuthority": runtime, "runtimeAuthority": shared.runtime_evidence(),
        "executionCode": code, "apiDirectory": API_DIRECTORY, "lockPath": LOCK_PATH, "existingCampaignAnchor": CAMPAIGN_ANCHOR}
    requests = campaign.unique_requests(plan)
    plan.update(usageRows=len(expected), uniqueAudioFiles=len(requests), firstAttemptCharacters=sum(len(r["text"]) for r in requests))
    tracked = [item for item in authority if item["path"] == manifest_name or item["path"] in sources or item["path"] in specifications]
    merged = {}
    for item in [*tracked, *snapshot["sourceAuthority"], *code]:
        if item["path"] in merged and item["sha256"] != merged[item["path"]]["sha256"]:
            raise ERROR("authority_changed_during_preparation")
        merged[item["path"]] = item
    return plan, list(merged.values())


def validate_rates(rates, plan):
    if rates.get("mode") != "receipt-verified" or set(rates.get("models", {})) != {"eleven_v4"}:
        raise ERROR("french_b2_full_run_requires_positive_voice_receipts")
    model = rates["models"]["eleven_v4"]
    if set(model.get("voices", {})) != {VOICES[target] for target in plan["targets"]} or campaign.amount(model.get("modelCharacterCostMultiplier")) <= 0:
        raise ERROR("exact_french_b2_rate_scope_required")
    for group in plan["groups"]:
        value = model["voices"][group["proposedVoiceProfile"]["provider_voice_id"]]
        if (type(value.get("sharingRate")) not in {int, float}
                or value["sharingRate"] != group["nativeVoiceVerification"]["sharingRate"]
                or campaign.amount(value.get("creditMultiplier")) < 1
                or not isinstance(value.get("verification"), str) or not value["verification"].strip()):
            raise ERROR("reviewed_french_b2_upper_rate_required")


review_bindings = native.review_bindings


def load_inputs(root, manifest_path, plan_path, rates_path, review_path, *, commit=False, expected=None):
    plan_raw, rates_raw, review_raw = [Path(path).read_bytes() for path in (plan_path, rates_path, review_path)]
    saved, rates, review = [json.loads(raw) for raw in (plan_raw, rates_raw, review_raw)]
    plan, authority = prepare_inputs(root, manifest_path)
    if saved != plan: raise ERROR("rebuilt_plan_mismatch")
    validate_rates(rates, plan)
    bindings = review_bindings(plan, plan_raw, rates_raw)
    reviewer = review.get("reviewer", {})
    if (type(review.get("schemaVersion")) is not int or review["schemaVersion"] != 1
            or review.get("kind") != "french-b2-execution-review" or review.get("verdict") != "PASS"
            or type(review.get("unresolvedFindings")) is not int or review["unresolvedFindings"] != 0
            or reviewer.get("kind") != "independent-agent" or reviewer.get("authorOfExecutionCode") is not False
            or not isinstance(reviewer.get("id"), str) or not reviewer["id"].strip()
            or review.get("scope") != "full-run-and-rates" or any(review.get(k) != v for k, v in bindings.items())):
        raise ERROR("independent_exact_execution_and_rates_review_required")
    fingerprint = hashed({"plan": plan, "bindings": bindings, "reviewSha256": campaign.digest(review_raw)})
    if expected is not None and expected != fingerprint: raise ERROR("reviewed_input_fingerprint_required")
    if commit:
        if expected != fingerprint: raise ERROR("reviewed_input_fingerprint_required")
        shared.checked_in(root, authority)
    return plan, fingerprint, rates


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("manifest", "plan", "rates", "review"): parser.add_argument(f"--{flag}", type=Path, required=True)
    parser.add_argument("--expected-input-sha256")
    parser.add_argument("--commit", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1: parser.error("limit must be positive")
    root = Path(repo_root).resolve() if repo_root else ROOT
    plan, fingerprint, rates = load_inputs(root, args.manifest, args.plan, args.rates, args.review,
        commit=args.commit, expected=args.expected_input_sha256)
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
        print(json.dumps({"status": "stopped", "reason": "french_b2_inputs_invalid_or_stale"}), file=sys.stderr); raise SystemExit(2)
