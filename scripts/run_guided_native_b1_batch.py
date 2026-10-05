"""Reviewed Indonesian/Cebuano B1 P1/P2, local v4 audio only.

Offline preparation executes the real native TypeScript gate with its full spec.
Commit requires exact content and execution reviews, HEAD equality and the existing
campaign. It never creates a separate budget, publishes, or retries a request.
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
from scripts import guided_refresh_v2 as shared
from scripts import run_guided_cebuano_refresh_v4 as ceb
from src.services.guided_tts import campaign
from src.services.guided_tts import inventory

ERROR = campaign.CampaignError
API_DIRECTORY, LOCK_PATH, CAMPAIGN_ANCHOR = ceb.API_DIRECTORY, ceb.LOCK_PATH, ceb.CAMPAIGN_ANCHOR
VERSION = "native-b1-four-turn-v1"
CONTENT_ROOT = "frontend/content-drafts/b1-native-2026-10"
VOICES = {"Indonesian": "gjhfBUoH6DHh0DG1X4u0", "Cebuano": ceb.VOICE_ID}
LOCALES = {"Indonesian": "id-ID", "Cebuano": "ceb-PH"}
CODES = {"Indonesian": "id", "Cebuano": "ceb"}
hashed = shared.hashed


def local_path(root, name):
    if not isinstance(name, str) or not name or "\\" in name:
        raise ERROR("invalid_input_location")
    root = Path(root).resolve()
    path = (root / name).resolve()
    if not path.is_relative_to(root) or name != path.relative_to(root).as_posix():
        raise ERROR("invalid_input_location")
    return path


def read_binding(root, binding):
    name, expected = binding.get("file"), binding.get("sha256")
    if not isinstance(expected, str) or not re.fullmatch(r"[a-f0-9]{64}", expected):
        raise ERROR("evidence_hash_required")
    raw = local_path(root, name).read_bytes()
    if campaign.digest(raw) != expected:
        raise ERROR("reviewed_evidence_changed")
    return json.loads(raw), {"path": name, "sha256": expected}


def code_evidence(root):
    paths = [Path(__file__), HERE / "export_guided_native_b1.mjs", Path(shared.__file__),
        Path(ceb.__file__), Path(campaign.__file__), Path(inventory.__file__),
        ROOT / "scripts/export_guided_refresh_v2.mjs",
        *[ROOT / name for name in ("src/__init__.py", "src/services/__init__.py", "src/services/guided_tts/__init__.py")]]
    scripts_init = getattr(sys.modules.get("scripts"), "__file__", None)
    if scripts_init:
        paths.append(Path(scripts_init))
    root = Path(root).resolve()
    return [{"path": path.resolve().relative_to(root).as_posix() if path.resolve().is_relative_to(root) else str(path.resolve()),
        "sha256": campaign.digest(path.read_bytes())} for path in paths]


def export_native(root, inputs):
    node = shutil.which("node")
    loader = Path(root) / "frontend/node_modules/tsx/dist/loader.mjs"
    if not node or not loader.is_file():
        raise ERROR("node_and_tsx_required")
    if any(os.environ.get(key) for key in ("NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH")):
        raise ERROR("unreviewed_node_runtime_override")
    result = subprocess.run([node, "--import", loader.resolve().as_uri(), str(HERE / "export_guided_native_b1.mjs"),
        "--repo", str(Path(root).resolve())], input=campaign.canonical(inputs).encode("utf-8"),
        cwd=Path(root) / "frontend", env={**os.environ, "TSX_DISABLE_CACHE": "1"},
        capture_output=True, timeout=120, check=False)
    if result.returncode:
        raise ERROR("native_offline_validation_failed")
    return json.loads(result.stdout)


def expected_rows(source, entry):
    """Independent coverage enumeration; native semantics come from the TS gate."""
    target, number = entry["targetLanguage"], entry["pathNumber"]
    if (source.get("targetLanguage") != target or source.get("targetLanguageCode") != LOCALES[target]
            or type(source.get("schemaVersion")) is not int or source["schemaVersion"] != 1 or source.get("status") != "draft"
            or source.get("level") != "B1" or type(source.get("pathNumber")) is not int or source["pathNumber"] != number
            or len(source.get("lessons", [])) != 10):
        raise ERROR("native_source_scope_mismatch")
    path_id, rows = f"{target.lower()}-b1-practical-{number}", []
    for index, lesson in enumerate(source["lessons"]):
        prefix = lesson["slug"].split("-")[0]
        if len(lesson["dialogue"]) != 4:
            raise ERROR("four_native_dialogue_turns_required")
        def add(pointer, kind, surface, key, text):
            if (not isinstance(text, str) or not text or text != text.strip()
                    or unicodedata.normalize("NFC", text) != text or re.search(r"\s{2}|[\[\]<>0-9]|https?:", text)
                    or any(unicodedata.category(char) in {"Cc", "Cf", "Cs", "So"} for char in text)):
                raise ERROR("invalid_native_spoken_text")
            rows.append({"pathId": path_id, "lessonId": f"{path_id}-{(number-1)*10+index+1:03}-{lesson['slug']}",
                "lessonNumber": index + 1, "tierGlobalLessonNumber": (number-1)*10+index+1,
                "targetLanguage": target, "targetLanguageCode": LOCALES[target], "level": "B1", "vibe": "bright",
                "sourceFile": entry["file"], "sourceSha256": entry["sha256"], "sourcePointer": f"/lessons/{index}/{pointer}",
                "sourceKind": kind, "playbackSurface": surface, "playbackSurfaceKey": key, "text": text})
        for i, turn in enumerate(lesson["dialogue"]):
            add(f"dialogue/{i}/targetText", "utterances", "corePhrase" if i == 1 else "dialogue", "__self" if i == 1 else f"turn-{i+1}", turn["targetText"])
        for field, kind, key in (("chunks", "chunks", ""), ("terms", "vocabulary", "item-")):
            for i, item in enumerate(lesson[field]):
                add(f"{field}/{i}/targetText", kind, "chunk", f"{prefix}-{key}{i+1}", item["targetText"])
        add("trophyWord/word", "vocabulary", "trophyWord", "__self", lesson["trophyWord"]["word"])
        add("trophyWord/example", "utterances", "trophyExample", "__self", lesson["trophyWord"]["example"])
        for i, example in enumerate(lesson["pattern"]["examples"]):
            add(f"pattern/examples/{i}/targetText", "utterances", "pattern", f"ex-{i+1}", example["targetText"])
    return rows


def content_review(root, manifest, name, sources, specifications):
    review = manifest.get(name, {})
    envelope, authority = read_binding(root, review)
    required = {"schemaVersion": 1, "kind": name, "verdict": "PASS", "unresolvedFindings": 0,
        "coverage": "full-content-all-fields", "reviewedSources": sources, "reviewedSpecifications": specifications}
    if (type(envelope.get("schemaVersion")) is not int or type(envelope.get("unresolvedFindings")) is not int
            or any(envelope.get(key) != value for key, value in required.items())):
        raise ERROR("native_content_review_incomplete_or_stale")
    reviewer = envelope.get("reviewer", {})
    if not isinstance(reviewer.get("id"), str) or not reviewer["id"].strip():
        raise ERROR("named_content_reviewer_required")
    if name == "fableReview" and envelope.get("model") != "claude-fable-5-1":
        raise ERROR("fable_full_content_review_required")
    if name == "independentReview" and (reviewer.get("kind") != "independent-agent"
            or reviewer.get("authorOfReviewedContent") is not False):
        raise ERROR("fresh_independent_content_review_required")
    return authority


def voice_evidence(root, manifest, targets):
    bindings, voices, authority = manifest.get("voiceEvidence", {}), {}, []
    if set(bindings) != set(targets):
        raise ERROR("exact_native_voice_evidence_required")
    for target in targets:
        value, item = read_binding(root, bindings[target])
        authority.append(item)
        if target == "Cebuano":
            voices[target] = {**ceb.validate_voice(value), "name": value["name"]}
            continue
        matches = [voice for voice in value.get("providerVoices", []) if voice.get("requestedId") == VOICES[target]]
        if value.get("method") != "GET only" or len(matches) != 1:
            raise ERROR("native_indonesian_voice_evidence_required")
        voice = matches[0]
        if (type(voice.get("status")) is not int or voice["status"] != 200 or voice.get("voice_id") != VOICES[target]
                or voice.get("labels", {}).get("language") != "id" or voice.get("labels", {}).get("gender") != "female"
                or voice.get("labels", {}).get("accent") != "standard"
                or type(voice.get("sharingRate")) not in {int, float} or voice["sharingRate"] != 1
                or not any(v.get("language") == "id" and v.get("locale") == "id-ID" for v in voice.get("verified_languages", []))):
            raise ERROR("native_indonesian_voice_evidence_required")
        voices[target] = {"voiceId": VOICES[target], "name": voice["name"], "providerLanguage": "id", "sourceLocale": "id-ID",
            "verifiedGender": "female", "verifiedLocale": "id-ID", "localeVerified": True,
            "verificationMethod": "authenticated-provider-get", "sharingRate": voice["sharingRate"]}
    return voices, authority


def prepare_inputs(root, manifest_path):
    root, path = Path(root).resolve(), Path(manifest_path).resolve()
    if not path.is_relative_to(root):
        raise ERROR("manifest_outside_checkout")
    manifest_name = path.relative_to(root).as_posix()
    raw = local_path(root, manifest_name).read_bytes()
    manifest = json.loads(raw)
    entries = manifest.get("sources")
    if (type(manifest.get("schemaVersion")) is not int or manifest["schemaVersion"] != 1 or manifest.get("kind") != "native-b1-content-manifest"
            or manifest.get("status") != "reviewed-staged" or not isinstance(entries, list) or not 1 <= len(entries) <= 4):
        raise ERROR("reviewed_native_manifest_required")
    inputs, sources, specifications, scopes = [], {}, {}, set()
    authority = [{"path": manifest_name, "sha256": campaign.digest(raw)}]
    for entry in entries:
        target, number = entry.get("targetLanguage"), entry.get("pathNumber")
        if (target not in VOICES or type(number) is not int or number not in {1, 2} or (target, number) in scopes
                or entry.get("file") != f"{CONTENT_ROOT}/{target.lower()}/p{number}.json"
                or entry.get("reviewedVoiceId") != VOICES[target]):
            raise ERROR("unsupported_or_duplicate_native_scope")
        scopes.add((target, number))
        source, item = read_binding(root, entry)
        sources[item["path"]] = item["sha256"]
        authority.append(item)
        spec_binding = entry.get("specification", {})
        if spec_binding.get("file") != f"{CONTENT_ROOT}/{target.lower()}/specification.json":
            raise ERROR("full_native_specification_required")
        spec, item = read_binding(root, spec_binding)
        if item["path"] in specifications and specifications[item["path"]] != item["sha256"]:
            raise ERROR("inconsistent_native_specification")
        specifications[item["path"]] = item["sha256"]
        authority.append(item)
        inputs.append({"entry": entry, "source": source, "specification": spec})
    for name in ("fableReview", "independentReview"):
        authority.append(content_review(root, manifest, name, sources, specifications))
    targets = [target for target in VOICES if any(scope[0] == target for scope in scopes)]
    voices, voice_authority = voice_evidence(root, manifest, targets)
    authority.extend(voice_authority)
    snapshot = export_native(root, inputs)
    expected = [row for item in inputs for row in expected_rows(item["source"], item["entry"])]
    if (snapshot.get("schemaVersion") != 1 or snapshot.get("projectionVersion") != VERSION
            or snapshot.get("validation") != {"validator": "frontend/scripts/lib/guidedNativeB1Drafts.ts", "fullNativeSpecification": True, "passed": len(inputs)}
            or snapshot.get("rows") != expected or not snapshot.get("sourceAuthority") or not snapshot.get("runtimeAuthority", {}).get("files")):
        raise ERROR("complete_native_projection_required")
    coordinates = [(r["lessonId"], r["playbackSurface"], r["playbackSurfaceKey"]) for r in expected]
    if len(set(coordinates)) != len(expected):
        raise ERROR("duplicate_native_playback_coordinate")
    groups = []
    for item in inputs:
        entry, source = item["entry"], item["source"]
        target, number = entry["targetLanguage"], entry["pathNumber"]
        path_id = f"{target.lower()}-b1-practical-{number}"
        settings = dict(campaign.V4_SETTINGS)
        profile = asdict(inventory.VoiceProfile(voice_profile_key=f"{target.lower()}_b1_bright_p{number}_v4_v1",
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
        "publicationAuthorized": False, "publicationHolds": ["listening", "runtime-and-catalog-integration", "twelve-base-editions", "named-production-approval"],
        "level": "B1", "model": "eleven_v4", "creditBudgetCeiling": campaign.API_CAP,
        "normalizationVersion": inventory.NORMALIZATION_VERSION, "targets": targets, "groups": groups,
        "manifestSha256": campaign.digest(raw), "sourceEvidence": sources, "specificationEvidence": specifications,
        "reviewAndVoiceEvidence": authority, "sourceAuthority": snapshot["sourceAuthority"],
        "exporterRuntimeAuthority": snapshot["runtimeAuthority"], "runtimeAuthority": shared.runtime_evidence(),
        "executionCode": code, "apiDirectory": API_DIRECTORY, "lockPath": LOCK_PATH, "existingCampaignAnchor": CAMPAIGN_ANCHOR}
    requests = campaign.unique_requests(plan)
    plan.update(usageRows=len(expected), uniqueAudioFiles=len(requests), firstAttemptCharacters=sum(len(r["text"]) for r in requests))
    # Reviews/voice evidence may be ignored artifacts; their exact hashes are in the HEAD-bound manifest.
    tracked = [item for item in authority if item["path"] == manifest_name or item["path"] in sources or item["path"] in specifications]
    merged = {item["path"]: item for item in [*tracked, *snapshot["sourceAuthority"], *code]}
    return plan, list(merged.values())


def validate_rates(rates, plan):
    if rates.get("mode") != "receipt-verified" or set(rates.get("models", {})) != {"eleven_v4"}:
        raise ERROR("native_full_run_requires_positive_voice_receipts")
    model = rates["models"]["eleven_v4"]
    expected = {VOICES[target] for target in plan["targets"]}
    if set(model.get("voices", {})) != expected or campaign.amount(model.get("modelCharacterCostMultiplier")) <= 0:
        raise ERROR("exact_native_rate_scope_required")
    for group in plan["groups"]:
        value = model["voices"][group["proposedVoiceProfile"]["provider_voice_id"]]
        if (value.get("sharingRate") != group["nativeVoiceVerification"]["sharingRate"]
                or campaign.amount(value.get("creditMultiplier")) < 1
                or not isinstance(value.get("verification"), str) or not value["verification"].strip()):
            raise ERROR("reviewed_native_upper_rate_required")


def review_bindings(plan, plan_raw, rates_raw):
    return {"planSha256": campaign.digest(plan_raw), "ratesSha256": campaign.digest(rates_raw),
        "manifestSha256": plan["manifestSha256"], "executionCodeSha256": hashed(plan["executionCode"]),
        "sourceAuthoritySha256": hashed(plan["sourceAuthority"]), "runtimeAuthoritySha256": hashed(plan["runtimeAuthority"]),
        "exporterRuntimeAuthoritySha256": hashed(plan["exporterRuntimeAuthority"]),
        "targets": plan["targets"], "apiDirectory": API_DIRECTORY, "lockPath": LOCK_PATH,
        "apiCreditCap": campaign.API_CAP, "existingCampaignAnchor": CAMPAIGN_ANCHOR}


def load_inputs(root, manifest_path, plan_path, rates_path, review_path, *, commit=False, expected=None):
    plan_raw, rates_raw, review_raw = [Path(path).read_bytes() for path in (plan_path, rates_path, review_path)]
    saved, rates, review = [json.loads(raw) for raw in (plan_raw, rates_raw, review_raw)]
    plan, authority = prepare_inputs(root, manifest_path)
    if saved != plan:
        raise ERROR("rebuilt_plan_mismatch")
    validate_rates(rates, plan)
    bindings = review_bindings(plan, plan_raw, rates_raw)
    reviewer = review.get("reviewer", {})
    if (type(review.get("schemaVersion")) is not int or review["schemaVersion"] != 1
            or review.get("kind") != "native-b1-execution-review" or review.get("verdict") != "PASS"
            or type(review.get("unresolvedFindings")) is not int or review["unresolvedFindings"] != 0
            or reviewer.get("kind") != "independent-agent" or reviewer.get("authorOfExecutionCode") is not False
            or not isinstance(reviewer.get("id"), str) or not reviewer["id"].strip()
            or review.get("scope") != "full-run-and-rates" or any(review.get(k) != v for k, v in bindings.items())):
        raise ERROR("independent_exact_execution_and_rates_review_required")
    fingerprint = hashed({"plan": plan, "bindings": bindings, "reviewSha256": campaign.digest(review_raw)})
    if expected is not None and expected != fingerprint:
        raise ERROR("reviewed_input_fingerprint_required")
    if commit:
        if expected != fingerprint:
            raise ERROR("reviewed_input_fingerprint_required")
        shared.checked_in(root, authority)
    return plan, fingerprint, rates


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("manifest", "plan", "rates", "review"):
        parser.add_argument(f"--{flag}", type=Path, required=True)
    parser.add_argument("--expected-input-sha256")
    parser.add_argument("--commit", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1:
        parser.error("limit must be positive")
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
    except (ValueError, KeyError, TypeError, AttributeError, OSError, subprocess.SubprocessError):
        print(json.dumps({"status": "stopped", "reason": "native_inputs_invalid_or_stale"}), file=sys.stderr)
        raise SystemExit(2)
