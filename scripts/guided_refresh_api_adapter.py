"""Offline existing-corpus adapter; NO provider construction or dispatch capability.

Paid callers must use revalidate_for_dispatch BEFORE constructing a provider.
"""
from __future__ import annotations

import argparse
from collections import Counter
from dataclasses import asdict
import hashlib
import json
from pathlib import Path
import shutil
import subprocess
import sys

HERE = Path(__file__).resolve().parent
DEFAULT_REPO = HERE.parent
sys.path.insert(0, str(DEFAULT_REPO))
from src.services.guided_tts import campaign
from src.services.guided_tts.inventory import (
    NORMALIZATION_VERSION, VoiceProfile, cache_key, normalize_spoken_text,
    storage_path, text_hash, voice_settings_hash,
)

SCOPES = {"English": {"levels": ["A1", "A2"], "code": "en-US", "name": "Serafina",
    "voice": "4tRn1lSkEn13EVTuqb0g", "profile": "english_bright_v4_v1"}}
PROJECTION_VERSION = "guided-refresh-spoken-coordinates-v1"


def canonical(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    return hashlib.sha256(value.encode("utf-8") if isinstance(value, str) else value).hexdigest()


def export_current_source(repo_root, exporter, language="English"):
    """Fresh process and actual TS module import on every invocation; no stale dump fallback."""
    root, exporter = Path(repo_root).resolve(), Path(exporter).resolve()
    node = shutil.which("node")
    loader = root / "frontend/node_modules/tsx/dist/loader.mjs"
    if not node or not loader.is_file():
        raise ValueError("local_node_and_tsx_required")
    result = subprocess.run([node, "--import", loader.as_uri(), str(exporter),
        "--repo", str(root), "--language", language,
        "--levels", ",".join(SCOPES[language]["levels"])],
        cwd=root / "frontend", capture_output=True, check=False, timeout=120)
    if result.returncode:
        raise ValueError("fresh_source_module_import_failed")
    return json.loads(result.stdout)


def verify_source_inventory(projection, inventory, language):
    scope = SCOPES[language]
    if (projection.get("schemaVersion") != 1 or projection.get("projectionVersion") != PROJECTION_VERSION
            or projection.get("scope") != {"targetLanguage": language, "levels": scope["levels"],
                                           "vibe": "bright", "status": "active"}):
        raise ValueError("unexpected_source_projection_scope")
    rows = projection["rows"]
    if not rows or projection["sourceProjectionSha256"] != sha(canonical(rows)):
        raise ValueError("invalid_source_projection_digest")
    aliases = projection["speakTargetAliases"]
    if projection["speakTargetAliasesSha256"] != sha(canonical(aliases)):
        raise ValueError("invalid_speak_alias_digest")
    saved = []
    for entry in inventory["entries"]:
        if entry["targetLanguage"] != language:
            continue
        if entry["textSha256"] != sha(entry["text"]):
            raise ValueError("inventory_entry_digest_mismatch")
        for coordinate in entry["coordinates"]:
            if coordinate["level"] in scope["levels"]:
                saved.append({**{k: v for k, v in coordinate.items() if k != "ordinal"}, "text": entry["text"]})
    if Counter(map(canonical, rows)) != Counter(map(canonical, saved)):
        raise ValueError("saved_inventory_does_not_match_current_sources")
    if any(row["targetLanguageCode"] != scope["code"] for row in rows):
        raise ValueError("source_language_code_mismatch")
    return rows


def code_evidence(repo_root, exporter):
    root = Path(repo_root).resolve()
    files = [Path(exporter).resolve(), Path(__file__).resolve(),
             root / "scripts/run_guided_refresh_campaign.py",
             Path(campaign.__file__).resolve(),
             root / "src/services/guided_tts/inventory.py"]
    evidence = []
    for path in files:
        try:
            name = path.relative_to(root).as_posix()
        except ValueError:
            name = str(path)
        evidence.append({"path": name, "sha256": sha(path.read_bytes())})
    return evidence


def assert_checked_in_code(repo_root, evidence):
    """Reject tmp, untracked or modified CLI/exporter/adapter/cache/executor code."""
    root = Path(repo_root).resolve()
    for item in evidence:
        path = (root / item["path"]).resolve()
        try:
            relative = path.relative_to(root).as_posix()
        except ValueError:
            raise ValueError("adapter_code_not_inside_app_checkout") from None
        result = subprocess.run(["git", "show", f"HEAD:{relative}"], cwd=root,
                                capture_output=True, check=False)
        # Git may normalize CRLF. Compare logical UTF-8 source bytes, not checkout EOL policy.
        disk = path.read_bytes()
        if (sha(disk) != item["sha256"] or result.returncode
                or result.stdout.replace(b"\r\n", b"\n") != disk.replace(b"\r\n", b"\n")):
            raise ValueError("adapter_code_not_checked_in_or_changed")


def build_plan(projection, inventory, *, inventory_sha256, evidence, language="English"):
    rows = verify_source_inventory(projection, inventory, language)
    spec = SCOPES[language]
    settings = dict(campaign.V4_SETTINGS)
    profile = asdict(VoiceProfile(voice_profile_key=spec["profile"], target_language_code=spec["code"],
        vibe="bright", scope_path_id=None, scope_lesson_id=None, scope_surface=None,
        provider_voice_id=spec["voice"], provider_model_id="eleven_v4", output_format=campaign.FORMAT,
        voice_settings=settings, voice_settings_hash=voice_settings_hash(settings), priority=90))
    items, identity_texts = [], {}
    order = {"utterances": 0, "chunks": 1, "vocabulary": 2}
    for row in sorted(rows, key=lambda row: order[row["sourceKind"]]):
        text = normalize_spoken_text(row["text"])
        if not text or "\n" in row["text"] or "\r" in row["text"]:
            raise ValueError("invalid_individual_utterance")
        usage = tuple(row[k] for k in ("pathId", "lessonId", "vibe", "playbackSurface", "playbackSurfaceKey"))
        variants = identity_texts.setdefault(usage, {})
        if variants and next(iter(variants)).casefold() != text.casefold():
            raise ValueError("conflicting_text_for_playback_coordinate")
        variants.setdefault(text, []).append(row["sourceField"])
        arguments = dict(provider="elevenlabs", target_language_code=spec["code"],
            voice_profile_key=profile["voice_profile_key"], provider_voice_id=profile["provider_voice_id"],
            provider_model_id="eleven_v4", output_format=campaign.FORMAT,
            settings_hash=profile["voice_settings_hash"], normalization_version=NORMALIZATION_VERSION,
            text_hash_value=text_hash(text))
        path_arguments = {k: v for k, v in arguments.items() if k not in {"provider", "normalization_version"}}
        items.append({"path_id": row["pathId"], "lesson_id": row["lessonId"],
            "lesson_number": row["lessonNumber"], "vibe": row["vibe"],
            "surface": row["playbackSurface"], "surface_key": row["playbackSurfaceKey"],
            "source_text": row["text"], "normalized_text": text, "text_hash": text_hash(text),
            **{k: profile[k] for k in ("voice_profile_key", "provider_voice_id", "provider_model_id",
                                    "output_format", "voice_settings_hash", "target_language_code")},
            "cache_key": cache_key(**arguments), "storage_path": storage_path(**path_arguments),
            "status": "missing", "asset_id": None, "character_count": len(text),
            "sourceCoordinate": {k: v for k, v in row.items() if k != "text"},
            "sourceTextSha256": sha(row["text"])})
    unique = {item["cache_key"]: item for item in items}
    characters = sum(item["character_count"] for item in unique.values())
    plan = {"schemaVersion": 1, "status": "offline-refresh-plan", "model": "eleven_v4",
        "creditBudgetCeiling": campaign.API_CAP, "normalizationVersion": NORMALIZATION_VERSION,
        "providerAccessVerified": False, "existingAssetsQueried": False,
        "sourceEvidence": {"projectionVersion": PROJECTION_VERSION,
            "sourceProjectionSha256": projection["sourceProjectionSha256"],
            "speakTargetAliasesSha256": projection["speakTargetAliasesSha256"],
            "referenceInventoryFileSha256": inventory_sha256,
            "referenceInventoryCorpusSha256": inventory["sourceCorpusSha256"],
            "savedInventoryMatchesCurrentSelectedSources": True, "code": evidence},
        "scope": projection["scope"], "usageRows": len(items), "playbackCoordinates": len(identity_texts),
        "uniqueAudioFiles": len(unique), "firstAttemptCharacters": characters,
        "normalizationChangedUsageRows": sum(item["source_text"] != item["normalized_text"] for item in items),
        "playbackCoordinateCaseVariants": [{"pathId": key[0], "lessonId": key[1], "vibe": key[2],
            "surface": key[3], "surfaceKey": key[4], "textVariants": variants}
            for key, variants in identity_texts.items() if len(variants) > 1],
        "publicationPolicy": "Resolve enumerated capitalization aliases before usage publication; never last-write-wins. Original source fields and texts are all retained.",
        "creditAssumption": "No forecasted credit rate. Reuse authenticated rate evidence and actual receipts; never pad.",
        "speakTargetAliases": projection["speakTargetAliases"],
        "groups": [{"targetLanguage": language, "pathId": None,
            "pathIds": list(dict.fromkeys(row["pathId"] for row in rows)),
            "proposedVoiceName": spec["name"], "proposedVoiceProfile": profile,
            "lessonCount": projection["lessonCount"], "usageRows": len(items),
            "uniqueAudioFiles": len(unique), "firstAttemptCharacters": characters, "items": items}]}
    # Executor compatibility is checked without constructing a transport or ledger.
    requests = campaign.unique_requests(plan)
    if len(requests) != len(unique):
        raise ValueError("executor_request_count_mismatch")
    return plan


def load_fresh_plan(repo_root, inventory_path, exporter, language="English"):
    projection = export_current_source(repo_root, exporter, language)
    raw = Path(inventory_path).read_bytes()
    return build_plan(projection, json.loads(raw), inventory_sha256=sha(raw),
                      evidence=code_evidence(repo_root, exporter), language=language)


def input_fingerprint(plan, rate_evidence):
    return sha(canonical({"plan": plan, "rateEvidence": rate_evidence}))


def revalidate_for_dispatch(saved_plan, repo_root, inventory_path, exporter, rate_evidence,
                            expected_input_sha256):
    """Pure preparation gate. Caller alone constructs transport after this returns."""
    current = load_fresh_plan(repo_root, inventory_path, exporter, saved_plan["scope"]["targetLanguage"])
    if current != saved_plan:
        raise ValueError("rebuilt_refresh_plan_mismatch")
    assert_checked_in_code(repo_root, current["sourceEvidence"]["code"])
    fingerprint = input_fingerprint(current, rate_evidence)
    if not rate_evidence or expected_input_sha256 != fingerprint:
        raise ValueError("reviewed_input_fingerprint_required")
    return current, fingerprint


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--repo", type=Path, default=DEFAULT_REPO)
    parser.add_argument("--inventory", type=Path, required=True)
    parser.add_argument("--exporter", type=Path, default=HERE / "export_guided_refresh_source.mjs")
    parser.add_argument("--language", choices=sorted(SCOPES), default="English")
    parser.add_argument("--rates", type=Path)
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    plan = load_fresh_plan(args.repo, args.inventory, args.exporter, args.language)
    rates = json.loads(args.rates.read_bytes()) if args.rates else None
    if args.output:
        args.output.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({k: v for k, v in plan.items() if k not in {"groups", "speakTargetAliases"}}
        | {"inputFingerprint": input_fingerprint(plan, rates)}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
