"""Pure v2 planning and paid-boundary validation. No provider or ledger construction."""
from __future__ import annotations

import argparse
from collections import Counter, defaultdict
from dataclasses import asdict
import json
import importlib.metadata
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys
import sysconfig

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/src").is_dir()), HERE.parent)
sys.path.insert(0, str(ROOT))
from src.services.guided_tts import campaign
from src.services.guided_tts.inventory import NORMALIZATION_VERSION, VoiceProfile, cache_key, normalize_spoken_text, storage_path, text_hash, voice_settings_hash

TARGETS = ("English", "Spanish", "Italian", "French", "Portuguese", "German", "Cebuano", "Indonesian", "Polish", "Korean", "Russian", "Japanese")
SOURCE_LOCALES = dict(zip(TARGETS, ("en-US", "es-ES", "it-IT", "fr-FR", "pt-BR", "de-DE", "ceb-PH", "id-ID", "pl-PL", "ko-KR", "ru-RU", "ja-JP")))
RESERVED = {"English": ("english_bright_v4_v1", "en-US", "4tRn1lSkEn13EVTuqb0g"),
            "Spanish": ("spanish_bright_v4_v1", "es", "ZCh4e9eZSUf41K4cmCEL"),
            "French": ("french_bright_v4_v1", "fr", "z1rEShu1SmowIOAmbHl1")}
VERSION = "guided-refresh-all-authored-v2"
canonical, digest = campaign.canonical, campaign.digest


def hashed(value):
    return digest(canonical(value).encode("utf-8"))


def selected_targets(targets):
    if not targets or len(set(targets)) != len(targets) or set(targets) - set(TARGETS):
        raise ValueError("explicit_known_unique_targets_required")
    return [target for target in TARGETS if target in targets]


def export_snapshot(root, exporter=None):
    root = Path(root).resolve()
    loader = root / "frontend/node_modules/tsx/dist/loader.mjs"
    node = shutil.which("node")
    if not node or not loader.is_file():
        raise ValueError("node_and_tsx_required")
    result = subprocess.run([node, "--import", loader.as_uri(), str(exporter or HERE / "export_guided_refresh_v2.mjs"),
        "--repo", str(root)], cwd=root / "frontend", env={**os.environ, "TSX_DISABLE_CACHE": "1"},
        capture_output=True, timeout=120, check=False)
    if result.returncode:
        raise ValueError("fresh_export_failed")
    return json.loads(result.stdout)


def validate_snapshot(snapshot):
    payload = {k: v for k, v in snapshot.items() if k not in {"schemaVersion", "projectionVersion", "projectionSha256", "sourceAuthority", "runtimeAuthority"}}
    if (snapshot.get("schemaVersion") != 2 or snapshot.get("projectionVersion") != VERSION
            or snapshot.get("scope") != "all-active-authored-variants" or not snapshot.get("sourceAuthority")
            or not snapshot.get("runtimeAuthority", {}).get("files")
            or snapshot.get("projectionSha256") != hashed(payload) or set(snapshot["targets"]) != set(TARGETS)):
        raise ValueError("invalid_full_source_snapshot")
    selectors = {(s["pathId"], s["vibe"]): s for s in snapshot["selectors"]}
    if len(selectors) != len(snapshot["selectors"]) or set(selectors) != {(r["pathId"], r["vibe"]) for r in snapshot["rows"]}:
        raise ValueError("source_selectors_mismatch")
    if (snapshot["lessonCount"] != len({r["lessonId"] for r in snapshot["rows"]})
            or snapshot["variantCount"] != len({(r["lessonId"], r["vibe"]) for r in snapshot["rows"]})
            or snapshot["pathCount"] != len({r["pathId"] for r in snapshot["rows"]})):
        raise ValueError("source_count_mismatch")
    source_fields = [(r["lessonId"], r["vibe"], r["sourceField"]) for r in snapshot["rows"]]
    if len(set(source_fields)) != len(source_fields):
        raise ValueError("duplicate_source_coordinate")
    for selector in selectors.values():
        match = re.fullmatch(r"[a-z]+-(a1|a2|b1|b2)-practical-([1-9][0-9]*)", selector["pathId"])
        if not match or match[1].upper() != selector["level"] or selector["vibe"] not in {"bright", "wistful", "sharp"}:
            raise ValueError("invalid_source_selector")
        required = ("female" if int(match[2]) % 2 else "male") if selector["targetLanguage"] in {"Russian", "Polish"} else None
        if selector.get("requiredGender") != required:
            raise ValueError("canonical_path_gender_rule_changed")
    for row in snapshot["rows"]:
        selector = selectors[(row["pathId"], row["vibe"])]
        if (row["targetLanguageCode"] != selector["sourceLocale"] or row["targetLanguage"] != selector["targetLanguage"]
                or row["level"] != selector["level"] or row["targetLanguageCode"] != SOURCE_LOCALES[row["targetLanguage"]]):
            raise ValueError("source_locale_or_selector_mismatch")
        if (not isinstance(row["text"], str) or not normalize_spoken_text(row["text"])
                or re.search(r"[\r\n]", row["text"]) or row["sourceKind"] not in {"utterances", "chunks", "vocabulary"}):
            raise ValueError("invalid_individual_spoken_text")
    return selectors


def coordinate_variants(snapshot):
    grouped = defaultdict(dict)
    for row in snapshot["rows"]:
        key = tuple(row[k] for k in ("targetLanguage", "pathId", "lessonId", "vibe", "playbackSurface", "playbackSurfaceKey"))
        grouped[key].setdefault(normalize_spoken_text(row["text"]), []).append(row["sourceField"])
    result = []
    for key, variants in grouped.items():
        if len(variants) < 2:
            continue
        identities = {text.strip(".,!?¿¡;:… ").casefold() for text in variants}
        result.append(dict(zip(("targetLanguage", "pathId", "lessonId", "vibe", "surface", "surfaceKey"), key))
                      | {"texts": variants, "kind": "lexical-conflict" if len(identities) > 1 else "formatting-alias"})
    return result


def assignment_template(snapshot, snapshot_sha256):
    """Explicit pending rows, never guessed roster labels or inferred voice IDs."""
    validate_snapshot(snapshot)
    assignments = []
    for selector in snapshot["selectors"]:
        legacy = RESERVED.get(selector["targetLanguage"]) if selector["vibe"] == "bright" and selector["level"] in {"A1", "A2"} else None
        assignments.append({"pathId": selector["pathId"], "vibe": selector["vibe"], "profileKey": legacy[0] if legacy else None})
    profiles = [{"profileKey": key, "targetLanguage": target, "languageCode": code, "voiceId": voice,
        "verifiedLocale": None, "verifiedGender": None, "verificationEvidenceSha256": None,
        "verificationMethod": "authenticated-provider-get"} for target, (key, code, voice) in RESERVED.items()]
    return {"schemaVersion": 2, "status": "draft", "snapshotSha256": snapshot_sha256,
            "profiles": profiles, "assignments": assignments}


def coverage_report(snapshot, mapping):
    conflicts = coordinate_variants(snapshot)
    assigned = {(a["pathId"], a["vibe"]): a.get("profileKey") for a in mapping.get("assignments", [])}
    return {"lessonCount": snapshot["lessonCount"], "variantCount": snapshot["variantCount"],
        "selectorCount": len(snapshot["selectors"]), "spokenRows": len(snapshot["rows"]),
        "inputAliasesNotSynthesized": len(snapshot["aliases"]), "coordinateVariants": conflicts,
        "pendingSelectors": [s for s in snapshot["selectors"] if not assigned.get((s["pathId"], s["vibe"]))]}


def checked_in(root, evidence):
    root = Path(root).resolve()
    if not evidence or len({item["path"] for item in evidence}) != len(evidence):
        raise ValueError("empty_or_duplicate_authority")
    for item in evidence:
        path = (root / item["path"]).resolve()
        try:
            name = path.relative_to(root).as_posix()
        except ValueError:
            raise ValueError("authority_outside_checkout") from None
        raw = path.read_bytes()
        if digest(raw) != item["sha256"]:
            raise ValueError("authority_bytes_changed")
        if item.get("tracked", True) is False:
            # Dependency bytes are snapshot-bound; their lockfile is HEAD-checked.
            if not name.startswith("frontend/node_modules/"):
                raise ValueError("untracked_source_not_allowed")
            continue
        head = subprocess.run(["git", "show", f"HEAD:{name}"], cwd=root, capture_output=True, check=False)
        if head.returncode or head.stdout.replace(b"\r\n", b"\n") != raw.replace(b"\r\n", b"\n"):
            raise ValueError("source_or_code_not_checked_in")


def code_evidence(root):
    root = Path(root).resolve()
    paths = [HERE / "export_guided_refresh_v2.mjs", Path(__file__), HERE / "run_guided_refresh_v2.py",
             Path(campaign.__file__), root / "src/services/guided_tts/inventory.py",
             *[root / name for name in ("src/__init__.py", "src/services/__init__.py", "src/services/guided_tts/__init__.py")]]
    return [{"path": path.resolve().relative_to(root).as_posix() if path.resolve().is_relative_to(root) else str(path.resolve()),
             "sha256": digest(path.read_bytes())} for path in paths]


def runtime_evidence():
    """Fresh bytes for Python, stdlib, native DLLs, and the HTTP dependency closure."""
    from packaging.requirements import Requirement
    paths = {Path(sys.executable).resolve()}
    decoder = shutil.which("ffmpeg")
    if not decoder:
        raise ValueError("ffmpeg_required_for_runtime_fingerprint")
    decoder = Path(decoder).resolve()
    paths.add(decoder)
    # Chocolatey's PATH executable is a shim; bind its installed target as well.
    chocolatey_decoder = decoder.parent.parent / "lib/ffmpeg/tools/ffmpeg/bin/ffmpeg.exe"
    if decoder.parent.name.lower() == "bin" and chocolatey_decoder.is_file():
        paths.add(chocolatey_decoder)
        paths.update(chocolatey_decoder.parent.glob("*.dll"))
    stdlib = Path(sysconfig.get_path("stdlib"))
    for directory in (stdlib, Path(sys.base_prefix) / "DLLs"):
        if directory.exists():
            for current, directories, names in os.walk(directory):
                directories[:] = [d for d in directories if d not in {"site-packages", "__pycache__"}]
                paths.update(Path(current) / name for name in names if Path(name).suffix in {".py", ".pyd", ".dll", ".so", ".zip"})
    paths.update(Path(sys.base_prefix).glob("*.dll"))
    pending, seen = ["httpx", "packaging"], set()
    for optional in ("brotli", "brotlicffi", "zstandard", "socksio"):
        try:
            importlib.metadata.distribution(optional)
            pending.append(optional)
        except importlib.metadata.PackageNotFoundError:
            pass
    while pending:
        name = pending.pop().lower().replace("_", "-")
        if name in seen:
            continue
        seen.add(name)
        dist = importlib.metadata.distribution(name)
        if not dist.files:
            raise ValueError("runtime_distribution_files_missing")
        for file in dist.files:
            path = Path(dist.locate_file(file)).resolve()
            if path.suffix != ".pyc" and "__pycache__" not in path.parts and path.is_file():
                paths.add(path)
        for declaration in dist.requires or []:
            requirement = Requirement(declaration)
            if requirement.marker is None or requirement.marker.evaluate({"extra": ""}):
                pending.append(requirement.name)
    return {"pythonVersion": sys.version, "distributions": sorted(seen),
        "files": [{"path": str(path), "sha256": digest(path.read_bytes())} for path in sorted(paths)]}


def build_plan(snapshot, mapping, provider_evidence, *, snapshot_sha256, provider_evidence_sha256, code, targets=TARGETS, excluded_paths=(), runtime=None):
    selected = selected_targets(targets)
    selectors = validate_snapshot(snapshot)
    known_paths = {s["pathId"] for s in selectors.values() if s["targetLanguage"] in selected}
    if len(set(excluded_paths)) != len(excluded_paths) or set(excluded_paths) - known_paths:
        raise ValueError("invalid_explicit_path_exclusion")
    excluded = set(excluded_paths)
    for target in selected:
        if not any(s["targetLanguage"] == target and s["pathId"] not in excluded for s in selectors.values()):
            raise ValueError("selected_target_has_no_included_paths")
    if mapping.get("schemaVersion") != 2 or mapping.get("snapshotSha256") != snapshot_sha256:
        raise ValueError("assignment_snapshot_mismatch")
    assignments = {(a["pathId"], a["vibe"]): a.get("profileKey") for a in mapping["assignments"]}
    if len(assignments) != len(mapping["assignments"]) or set(assignments) != set(selectors):
        raise ValueError("exact_assignment_coverage_required")
    profiles = {p["profileKey"]: p for p in mapping["profiles"]}
    if len(profiles) != len(mapping["profiles"]):
        raise ValueError("duplicate_profile_binding")
    voices = {v["requestedId"]: v for v in provider_evidence["providerVoices"]}
    if len(voices) != len(provider_evidence["providerVoices"]) or provider_evidence.get("method") != "GET only":
        raise ValueError("invalid_provider_get_evidence")
    variants = [x for x in coordinate_variants(snapshot) if x["targetLanguage"] in selected and x["pathId"] not in excluded]
    if any(x["kind"] == "lexical-conflict" for x in variants):
        raise ValueError("selected_scope_has_lexical_coordinate_hold")
    used = {}
    for identity, selector in selectors.items():
        if selector["targetLanguage"] not in selected or selector["pathId"] in excluded:
            continue
        key = assignments[identity]
        p = profiles.get(key)
        if not p or not p.get("voiceId"):
            raise ValueError("selected_voice_assignment_pending")
        voice = voices.get(p["voiceId"], {})
        locale = selector["sourceLocale"]
        native = voice.get("labels", {}).get("language")
        if (p["targetLanguage"] != selector["targetLanguage"] or p.get("verifiedLocale") != locale
                or p.get("verificationMethod") != "authenticated-provider-get"
                or p.get("verificationEvidenceSha256") != provider_evidence_sha256
                or voice.get("status") != 200 or voice.get("voice_id") != p["voiceId"]
                or native != locale.split("-")[0] or "sharingRate" not in voice
                or not any(v.get("language") == native and v.get("locale") == locale for v in voice.get("verified_languages", []))
                or p.get("verifiedGender") not in {"female", "male"}
                or p.get("verifiedGender") != voice.get("labels", {}).get("gender")):
            raise ValueError("native_voice_evidence_mismatch")
        if selector["requiredGender"] and p["verifiedGender"] != selector["requiredGender"]:
            raise ValueError("canonical_path_gender_mismatch")
        if p["languageCode"] not in {locale, locale.split("-")[0]}:
            raise ValueError("invalid_profile_language_code")
        legacy = RESERVED.get(selector["targetLanguage"]) if selector["vibe"] == "bright" and selector["level"] in {"A1", "A2"} else None
        if legacy and (key, p["languageCode"], p["voiceId"]) != legacy:
            raise ValueError("completed_profile_identity_must_not_change")
        for target, binding in RESERVED.items():
            if key == binding[0] and (p["targetLanguage"], p["languageCode"], p["voiceId"]) != (target, *binding[1:]):
                raise ValueError("reserved_profile_rebound")
            if key == binding[0] and selector["vibe"] != "bright":
                raise ValueError("reserved_bright_profile_used_for_other_vibe")
        used[key] = p
    groups = []
    order = {"utterances": 0, "chunks": 1, "vocabulary": 2}
    for key, p in used.items():
        rows = [r for r in snapshot["rows"] if r["targetLanguage"] in selected and r["pathId"] not in excluded
                and assignments[(r["pathId"], r["vibe"])] == key]
        vibes = {r["vibe"] for r in rows}
        settings = dict(campaign.V4_SETTINGS)
        profile = asdict(VoiceProfile(voice_profile_key=key, target_language_code=p["languageCode"],
            provider_voice_id=p["voiceId"], provider_model_id="eleven_v4", output_format=campaign.FORMAT,
            voice_settings=settings, voice_settings_hash=voice_settings_hash(settings),
            vibe=next(iter(vibes)) if len(vibes) == 1 else None, priority=90))
        items = []
        for row in sorted(rows, key=lambda r: order[r["sourceKind"]]):
            text = normalize_spoken_text(row["text"])
            args = dict(provider="elevenlabs", target_language_code=p["languageCode"], voice_profile_key=key,
                provider_voice_id=p["voiceId"], provider_model_id="eleven_v4", output_format=campaign.FORMAT,
                settings_hash=profile["voice_settings_hash"], normalization_version=NORMALIZATION_VERSION, text_hash_value=text_hash(text))
            items.append({"path_id": row["pathId"], "lesson_id": row["lessonId"], "lesson_number": row["lessonNumber"],
                "vibe": row["vibe"], "surface": row["playbackSurface"], "surface_key": row["playbackSurfaceKey"],
                "source_text": row["text"], "normalized_text": text, "text_hash": text_hash(text), "character_count": len(text),
                **{field: profile[field] for field in ("voice_profile_key", "provider_voice_id", "provider_model_id", "output_format", "voice_settings_hash", "target_language_code")},
                "cache_key": cache_key(**args), "storage_path": storage_path(**{k: v for k, v in args.items() if k not in {"provider", "normalization_version"}}),
                "sourceCoordinate": {k: v for k, v in row.items() if k != "text"}})
        groups.append({"targetLanguage": p["targetLanguage"], "proposedVoiceProfile": profile,
            "verifiedProviderName": voices[p["voiceId"]]["name"], "items": items})
    plan = {"schemaVersion": 2, "status": "offline-reviewed-inputs-required", "model": "eleven_v4", "creditBudgetCeiling": campaign.API_CAP,
        "targets": selected, "excludedPaths": sorted(excluded),
        "omittedScopes": [s for s in snapshot["selectors"] if s["targetLanguage"] not in selected or s["pathId"] in excluded],
        "snapshotSha256": snapshot_sha256, "mappingSha256": hashed(mapping),
        "providerEvidenceSha256": provider_evidence_sha256, "executionCode": code,
        "runtimeAuthority": runtime if runtime is not None else runtime_evidence(),
        "sourceProjectionSha256": snapshot["projectionSha256"],
        "normalizationVersion": NORMALIZATION_VERSION,
        "groups": groups, "publicationHolds": variants,
        "aliases": [a for a in snapshot["aliases"] if a["targetLanguage"] in selected and a["pathId"] not in excluded]}
    requests = campaign.unique_requests(plan)
    plan.update(uniqueAudioFiles=len(requests), firstAttemptCharacters=sum(len(r["text"]) for r in requests),
                usageRows=sum(len(g["items"]) for g in groups))
    expected_rows = [r for r in snapshot["rows"] if r["targetLanguage"] in selected and r["pathId"] not in excluded]
    actual_rows = [{**item["sourceCoordinate"], "text": item["source_text"]} for group in groups for item in group["items"]]
    if Counter(map(canonical, expected_rows)) != Counter(map(canonical, actual_rows)):
        raise ValueError("selected_source_rows_not_preserved")
    return plan


def load_reviewed_inputs(root, snapshot_path, mapping_path, provider_evidence_path, review_path, plan_path, rates, targets, *, excluded_paths=(), commit=False, expected=None):
    raw, mapping_raw, voice_raw, review_raw, plan_raw = [Path(p).read_bytes() for p in (snapshot_path, mapping_path, provider_evidence_path, review_path, plan_path)]
    snapshot, mapping, voice, review = [json.loads(data) for data in (raw, mapping_raw, voice_raw, review_raw)]
    fresh = export_snapshot(root)
    if snapshot != fresh:
        raise ValueError("fresh_source_snapshot_mismatch")
    code = code_evidence(root)
    plan = build_plan(fresh, mapping, voice, snapshot_sha256=digest(raw), provider_evidence_sha256=digest(voice_raw),
                      code=code, targets=targets, excluded_paths=excluded_paths)
    if json.loads(plan_raw) != plan:
        raise ValueError("rebuilt_plan_mismatch")
    bindings = {"snapshotSha256": digest(raw), "assignmentsSha256": digest(mapping_raw),
        "providerEvidenceSha256": digest(voice_raw), "executionCodeSha256": hashed(code),
        "runtimeAuthoritySha256": hashed(plan["runtimeAuthority"]), "planSha256": digest(plan_raw),
        "rateEvidenceSha256": hashed(rates),
        "targets": plan["targets"], "excludedPaths": plan["excludedPaths"]}
    if (review.get("schemaVersion") != 2 or review.get("status") != "reviewed" or review.get("verdict") != "PASS"
            or review.get("unresolvedFindings") != 0 or any(review.get(k) != v for k, v in bindings.items())):
        raise ValueError("explicit_review_of_exact_inputs_required")
    fingerprint = hashed({"plan": plan, "reviewSha256": digest(review_raw), "rateEvidence": rates})
    if commit:
        if mapping.get("status") != "reviewed" or not rates or expected != fingerprint:
            raise ValueError("reviewed_input_fingerprint_required")
        checked_in(root, [*fresh["sourceAuthority"], *code])
    elif expected is not None and expected != fingerprint:
        raise ValueError("reviewed_input_fingerprint_required")
    return plan, fingerprint


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, required=True)
    parser.add_argument("--assignments", type=Path, required=True)
    parser.add_argument("--voice-evidence", type=Path, required=True)
    parser.add_argument("--targets", default=",".join(TARGETS))
    parser.add_argument("--exclude-paths", default="")
    args = parser.parse_args()
    raw, mapping, evidence_raw = args.snapshot.read_bytes(), json.loads(args.assignments.read_bytes()), args.voice_evidence.read_bytes()
    plan = build_plan(json.loads(raw), mapping, json.loads(evidence_raw), snapshot_sha256=digest(raw),
        provider_evidence_sha256=digest(evidence_raw), code=code_evidence(ROOT), targets=args.targets.split(","),
        excluded_paths=args.exclude_paths.split(",") if args.exclude_paths else ())
    print(json.dumps(plan, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
