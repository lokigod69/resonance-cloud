"""Local German B2 P1/P2 audio projection into the existing 200k campaign.

Dry-run never constructs a provider or opens a ledger. The Python shape checks
protect the audio projection; they do not replace TypeScript/content review.
"""
import argparse
from dataclasses import asdict
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import unicodedata

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/src").is_dir()), HERE.parent)
sys.path.insert(0, str(ROOT))
from scripts.guided_refresh_v2 import runtime_evidence
from src.services.guided_tts import campaign
from src.services.guided_tts.inventory import (
    NORMALIZATION_VERSION, VoiceProfile, cache_key, normalize_spoken_text,
    storage_path, text_hash, voice_settings_hash,
)

VOICE_ID = "Qy4b2JlSGxY7I9M9Bqxb"
CONTRACT_PATH = "frontend/content-drafts/b2-2026-10/german/authoring-contract.json"
VALIDATOR_PATH = "frontend/scripts/lib/guidedB2Drafts.ts"
CODE_PATHS = (
    "scripts/run_guided_b2_path_batch.py", "scripts/guided_refresh_v2.py",
    "src/services/guided_tts/campaign.py", "src/services/guided_tts/inventory.py",
    "src/__init__.py", "src/services/__init__.py", "src/services/guided_tts/__init__.py",
    VALIDATOR_PATH,
)
ERROR = campaign.CampaignError


def hashed(value):
    return campaign.digest(campaign.canonical(value).encode("utf-8"))


def local_path(root, name, *, prefix=None, suffix=None):
    if not isinstance(name, str) or "\\" in name:
        raise ERROR("invalid_input_location")
    root = Path(root).resolve()
    path = (root / name).resolve()
    if (not path.is_relative_to(root) or name != path.relative_to(root).as_posix()
            or (prefix and not path.is_relative_to((root / prefix).resolve()))
            or (suffix and path.suffix != suffix)):
        raise ERROR("invalid_input_location")
    return path


def evidence_bytes(root, name, expected):
    if not isinstance(expected, str) or not re.fullmatch(r"[a-f0-9]{64}", expected):
        raise ERROR("evidence_hash_required")
    raw = local_path(root, name).read_bytes()
    if campaign.digest(raw) != expected:
        raise ERROR("reviewed_evidence_changed")
    return raw


def code_evidence(root):
    return [{"path": name, "sha256": campaign.digest(local_path(root, name).read_bytes())} for name in CODE_PATHS]


def checked_in(root, evidence):
    """Check exact inspected bytes against HEAD, including the review manifest."""
    if len({item["path"] for item in evidence}) != len(evidence):
        raise ERROR("duplicate_checked_in_authority")
    for item in evidence:
        path = local_path(root, item["path"])
        raw = path.read_bytes()
        if campaign.digest(raw) != item["sha256"]:
            raise ERROR("checked_in_authority_changed")
        result = subprocess.run(["git", "show", f"HEAD:{item['path']}"], cwd=root, capture_output=True, check=False)
        if result.returncode or result.stdout.replace(b"\r\n", b"\n") != raw.replace(b"\r\n", b"\n"):
            raise ERROR("source_or_execution_code_not_checked_in")


def spoken(value):
    if (not isinstance(value, str) or not value or value != value.strip()
            or unicodedata.normalize("NFC", value) != value or "  " in value
            or re.search(r"[\[\]<>0-9]|https?:", value, re.IGNORECASE)
            or any(unicodedata.category(char) in {"Cc", "Cf", "Cs", "So"} for char in value)):
        raise ERROR("invalid_b2_spoken_text")
    return value


def project_source(source, *, source_file, source_sha256):
    """Exact six-turn audio coverage, not semantic or linguistic certification."""
    number = source.get("pathNumber")
    if (type(source.get("schemaVersion")) is not int or source["schemaVersion"] != 1 or source.get("status") != "draft"
            or source.get("targetLanguage") != "German" or source.get("targetLanguageCode") != "de-DE"
            or source.get("authoredBaseLanguage") != "English" or source.get("level") != "B2"
            or type(number) is not int or number not in {1, 2}):
        raise ERROR("unsupported_b2_source_scope")
    lessons = source.get("lessons")
    if not isinstance(lessons, list) or len(lessons) != 10:
        raise ERROR("ten_b2_lessons_required")
    path_id = f"german-b2-practical-{number}"
    rows, slugs = [], set()
    for index, lesson in enumerate(lessons):
        slug = lesson.get("slug")
        if (type(lesson.get("lessonNumber")) is not int or lesson["lessonNumber"] != index + 1
                or not isinstance(slug, str) or not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", slug)
                or slug in slugs):
            raise ERROR("invalid_local_b2_lesson_identity")
        slugs.add(slug)
        lesson_id = f"{path_id}-{(number - 1) * 10 + index + 1:03}-{slug}"
        turns = lesson.get("dialogue")
        if (not isinstance(turns, list) or len(turns) != 6
                or any(not isinstance(turn, dict) or turn.get("speaker") != ("you" if i % 2 else "them")
                       for i, turn in enumerate(turns))):
            raise ERROR("six_alternating_b2_turns_required")
        speak = lesson.get("speak")
        if (not isinstance(speak, list) or len(speak) != 3
                or any(not isinstance(entry, dict) or type(entry.get("turnIndex")) is not int for entry in speak)
                or [entry.get("turnIndex") for entry in speak] != [1, 3, 5]):
            raise ERROR("three_b2_speak_targets_required")
        build = lesson.get("build", {})
        chunks = build.get("chunks")
        terms = lesson.get("terms")
        examples = lesson.get("pattern", {}).get("examples")
        trophy = lesson.get("trophy", {})
        if (not isinstance(chunks, list) or not 5 <= len(chunks) <= 8
                or not isinstance(terms, list) or not 8 <= len(terms) <= 10
                or not isinstance(examples, list) or not 2 <= len(examples) <= 3):
            raise ERROR("complete_b2_spoken_surfaces_required")
        def add(pointer, kind, surface, key, value, **extra):
            text = spoken(value)
            rows.append({"pathId": path_id, "lessonId": lesson_id, "lessonNumber": index + 1,
                "tierGlobalLessonNumber": (number - 1) * 10 + index + 1, "targetLanguage": "German",
                "targetLanguageCode": "de-DE", "level": "B2", "vibe": "bright",
                "sourceFile": source_file, "sourceSha256": source_sha256,
                "sourcePointer": f"/lessons/{index}/{pointer}", "sourceKind": kind,
                "playbackSurface": surface, "playbackSurfaceKey": key, "text": text, **extra})
        for i, turn in enumerate(turns):
            add(f"dialogue/{i}/targetText", "utterances", "corePhrase" if i == 1 else "dialogue",
                "__self" if i == 1 else f"turn-{i + 1}", turn.get("targetText"), dialogueSpeaker=turn["speaker"], dialoguePosition=i + 1)
        for i, chunk in enumerate(chunks):
            add(f"build/chunks/{i}", "chunks", "chunk", f"build-chunk-{i + 1}", chunk)
        if (not isinstance(build.get("framePrefix"), str) or not isinstance(build.get("frameSuffix"), str)
                or build["framePrefix"] + " ".join(chunks) + build["frameSuffix"] != turns[1]["targetText"]):
            raise ERROR("first_reply_build_reconstruction_mismatch")
        for i, term in enumerate(terms):
            add(f"terms/{i}/targetText", "vocabulary", "chunk", f"term-{i + 1}", term.get("targetText"))
        add("trophy/lemma", "vocabulary", "trophyWord", "__self", trophy.get("lemma"))
        add("trophy/example/targetText", "utterances", "trophyExample", "__self", trophy.get("example", {}).get("targetText"))
        for i, example in enumerate(examples):
            add(f"pattern/examples/{i}/targetText", "utterances", "pattern", f"ex-{i + 1}", example.get("targetText"))
    pointers = [(row["sourceFile"], row["sourcePointer"]) for row in rows]
    coordinates = [(row["lessonId"], row["playbackSurface"], row["playbackSurfaceKey"]) for row in rows]
    if len(set(pointers)) != len(rows) or len(set(coordinates)) != len(rows):
        raise ERROR("duplicate_b2_spoken_coordinate")
    return rows


def voice_evidence(root, manifest):
    binding = manifest.get("voiceEvidence", {})
    value = json.loads(evidence_bytes(root, binding.get("file"), binding.get("sha256")))
    matches = [voice for voice in value.get("providerVoices", []) if voice.get("requestedId") == VOICE_ID]
    if value.get("method") != "GET only" or len(matches) != 1:
        raise ERROR("verified_german_voice_evidence_required")
    voice = matches[0]
    if (voice.get("status") != 200 or voice.get("voice_id") != VOICE_ID or "sharingRate" not in voice
            or voice.get("labels", {}).get("language") != "de" or voice.get("labels", {}).get("gender") != "female"
            or not any(v.get("language") == "de" and v.get("locale") == "de-DE" for v in voice.get("verified_languages", []))):
        raise ERROR("verified_german_voice_evidence_required")
    return voice


def prepare_inputs(root, manifest_path):
    root = Path(root).resolve()
    path = Path(manifest_path).resolve()
    if not path.is_relative_to(root):
        raise ERROR("manifest_outside_checkout")
    manifest_name = path.relative_to(root).as_posix()
    raw = local_path(root, manifest_name, suffix=".json").read_bytes()
    manifest = json.loads(raw)
    entries = manifest.get("sources")
    if (manifest.get("schemaVersion") != 3 or manifest.get("status") != "reviewed-staged"
            or manifest.get("level") != "B2" or not isinstance(entries, list) or not 1 <= len(entries) <= 2):
        raise ERROR("reviewed_b2_manifest_required")
    bindings = {entry["file"]: entry["sha256"] for entry in entries}
    if len(bindings) != len(entries):
        raise ERROR("duplicate_b2_source_file")
    for name in ("fableReview", "independentReview", "structuralValidation"):
        review = manifest.get(name, {})
        if (review.get("verdict") != "PASS" or type(review.get("unresolvedFindings")) is not int
                or review["unresolvedFindings"] != 0 or review.get("reviewedSources") != bindings):
            raise ERROR("b2_review_incomplete_or_stale")
        envelope = json.loads(evidence_bytes(root, review.get("evidenceFile"), review.get("evidenceSha256")))
        if (not isinstance(envelope, dict) or envelope.get("schemaVersion") != 1
                or envelope.get("kind") != name or envelope.get("verdict") != "PASS"
                or type(envelope.get("unresolvedFindings")) is not int or envelope["unresolvedFindings"] != 0
                or envelope.get("reviewedSources") != bindings):
            raise ERROR("b2_evidence_verdict_or_source_bindings_stale")
        if name == "fableReview" and envelope.get("model") != "claude-fable-5-1":
            raise ERROR("fable_personal_review_required")
        if name == "structuralValidation" and any(envelope.get(field) != review.get(field)
                for field in ("validatorSha256", "contractSha256")):
            raise ERROR("b2_evidence_validation_authority_stale")
    if manifest["fableReview"].get("model") != "claude-fable-5-1":
        raise ERROR("fable_personal_review_required")
    validator = manifest["structuralValidation"]
    if (validator.get("validatorSha256") != campaign.digest((root / VALIDATOR_PATH).read_bytes())
            or validator.get("contractSha256") != campaign.digest((root / CONTRACT_PATH).read_bytes())):
        raise ERROR("b2_validation_authority_changed")
    voice = voice_evidence(root, manifest)
    groups, source_evidence, scopes = [], [], set()
    for entry in entries:
        name, number = entry["file"], entry["pathNumber"]
        if (entry.get("targetLanguage") != "German" or type(number) is not int or number not in {1, 2}
                or entry.get("reviewedVoiceId") != VOICE_ID or number in scopes):
            raise ERROR("unsupported_or_duplicate_b2_scope")
        scopes.add(number)
        source_path = local_path(root, name, prefix="frontend/content-drafts/b2-2026-10/german", suffix=".json")
        if name == CONTRACT_PATH:
            raise ERROR("contract_is_not_reviewed_source")
        source_raw = source_path.read_bytes()
        if campaign.digest(source_raw) != entry["sha256"]:
            raise ERROR("reviewed_b2_source_changed")
        source = json.loads(source_raw)
        if source.get("pathNumber") != number:
            raise ERROR("b2_source_scope_mismatch")
        rows = project_source(source, source_file=name, source_sha256=entry["sha256"])
        path_id = f"german-b2-practical-{number}"
        settings = dict(campaign.V4_SETTINGS)
        profile = asdict(VoiceProfile(voice_profile_key=f"german_b2_bright_p{number}_v4_v1", target_language_code="de",
            vibe="bright", scope_path_id=path_id, provider_voice_id=VOICE_ID, provider_model_id="eleven_v4",
            output_format=campaign.FORMAT, voice_settings=settings, voice_settings_hash=voice_settings_hash(settings), priority=90))
        items = []
        for row in rows:
            text = normalize_spoken_text(row["text"])
            args = dict(provider="elevenlabs", target_language_code="de", voice_profile_key=profile["voice_profile_key"],
                provider_voice_id=VOICE_ID, provider_model_id="eleven_v4", output_format=campaign.FORMAT,
                settings_hash=profile["voice_settings_hash"], normalization_version=NORMALIZATION_VERSION, text_hash_value=text_hash(text))
            items.append({"path_id": path_id, "lesson_id": row["lessonId"], "lesson_number": row["lessonNumber"], "vibe": "bright",
                "surface": row["playbackSurface"], "surface_key": row["playbackSurfaceKey"], "source_text": row["text"],
                "normalized_text": text, "text_hash": text_hash(text), "character_count": len(text),
                **{key: profile[key] for key in ("voice_profile_key", "target_language_code", "provider_voice_id", "provider_model_id", "output_format", "voice_settings_hash")},
                "cache_key": cache_key(**args), "storage_path": storage_path(**{k: v for k, v in args.items() if k not in {"provider", "normalization_version"}}),
                "sourceCoordinate": {k: v for k, v in row.items() if k != "text"}, "sourceTextSha256": campaign.digest(row["text"].encode("utf-8"))})
        source_evidence.append({"path": name, "sha256": entry["sha256"]})
        groups.append({"targetLanguage": "German", "pathId": path_id, "sourceSha256": entry["sha256"],
            "proposedVoiceName": voice.get("name"), "proposedVoiceProfile": profile, "lessonCount": 10, "items": items})
    code = code_evidence(root)
    plan = {"schemaVersion": 3, "status": "reviewed-staged-local-audio-only", "level": "B2", "model": "eleven_v4",
        "creditBudgetCeiling": 200000, "normalizationVersion": NORMALIZATION_VERSION,
        "projectionVersion": "german-b2-six-turn-audio-v1", "reviewManifestSha256": campaign.digest(raw),
        "voiceEvidenceSha256": manifest["voiceEvidence"]["sha256"], "verifiedVoiceSharingRate": voice["sharingRate"],
        "sourceEvidence": source_evidence,
        "executionCode": code, "runtimeAuthority": runtime_evidence(), "groups": groups,
        "projectionLimit": "Audio shape only. TypeScript validation and Fable/independent content reviews are separately bound. No production publication."}
    requests = campaign.unique_requests(plan)
    plan.update(usageRows=sum(len(g["items"]) for g in groups), uniqueAudioFiles=len(requests),
        firstAttemptCharacters=sum(len(request["text"]) for request in requests))
    authority = [*source_evidence, *code, {"path": CONTRACT_PATH, "sha256": validator["contractSha256"]},
        {"path": manifest_name, "sha256": campaign.digest(raw)}]
    return plan, authority


def load_inputs(root, manifest_path, plan_path, rates, *, commit=False, expected=None):
    plan, authority = prepare_inputs(root, manifest_path)
    plan_raw = Path(plan_path).read_bytes()
    if json.loads(plan_raw) != plan:
        raise ERROR("rebuilt_plan_mismatch")
    if rates.get("mode") != "receipt-verified":
        raise ERROR("b2_requires_existing_positive_voice_receipt")
    model = rates.get("models", {}).get("eleven_v4", {})
    rate = model.get("voices", {}).get(VOICE_ID, {})
    if (not rate or "sharingRate" not in rate or rate["sharingRate"] != plan["verifiedVoiceSharingRate"]
            or campaign.amount(model.get("modelCharacterCostMultiplier")) <= 0
            or not isinstance(rate.get("verification"), str)
            or not rate["verification"].strip() or campaign.amount(rate.get("creditMultiplier")) < 1):
        raise ERROR("b2_reviewed_voice_rate_required")
    fingerprint = hashed({"plan": plan, "savedPlanSha256": campaign.digest(plan_raw), "rateEvidence": rates})
    if expected is not None and expected != fingerprint:
        raise ERROR("reviewed_input_fingerprint_required")
    if commit:
        if expected != fingerprint:
            raise ERROR("reviewed_input_fingerprint_required")
        checked_in(root, authority)
    return plan, fingerprint


def main(argv=None, *, repo_root=None, provider_factory=None):
    parser = argparse.ArgumentParser(description=__doc__)
    for flag in ("manifest", "plan", "rates"):
        parser.add_argument(f"--{flag}", type=Path, required=True)
    parser.add_argument("--expected-input-sha256")
    parser.add_argument("--commit", action="store_true")
    parser.add_argument("--limit", type=int)
    args = parser.parse_args(argv)
    if args.limit is not None and args.limit < 1:
        parser.error("limit must be positive")
    root = Path(repo_root).resolve() if repo_root else ROOT
    plan, fingerprint = load_inputs(root, args.manifest, args.plan, json.loads(args.rates.read_bytes()),
        commit=args.commit, expected=args.expected_input_sha256)
    rates = json.loads(args.rates.read_bytes())
    # Avoid rates changing between validation and the provider boundary.
    if hashed({"plan": plan, "savedPlanSha256": campaign.digest(args.plan.read_bytes()), "rateEvidence": rates}) != fingerprint:
        raise ERROR("reviewed_input_fingerprint_required")
    factory = provider_factory or campaign.ElevenLabsTransport
    provider = factory(os.getenv("ELEVENLABS_API_KEY")) if args.commit else None
    try:
        result = campaign.execute(plan, fingerprint, root / "review-artifacts/guided-audio-20261003/api",
            provider=provider, rate_evidence=rates, commit=args.commit, limit=args.limit,
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
    except (ValueError, KeyError, TypeError, AttributeError, OSError):
        print(json.dumps({"status": "stopped", "reason": "b2_inputs_invalid_or_stale"}), file=sys.stderr)
        raise SystemExit(2)
