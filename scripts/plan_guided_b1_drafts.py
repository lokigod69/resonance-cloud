"""Build a local B1 audio manifest. No credentials, network, provider, or DB writes.

First export reviewed drafts from frontend/scripts/prepare-guided-b1-drafts.ts.
This command cannot generate audio. Proposed profiles retain the B1 rotation
except the verified es-ES voice correction; paid runs recheck provider access.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path
import re
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from src.services.guided_tts.inventory import (  # noqa: E402
    DEFAULT_OUTPUT_FORMAT, DEFAULT_VOICE_SETTINGS, VoiceProfile,
    build_inventory, voice_settings_hash,
)

PROPOSALS = {
    "English": ("en-US", "Serafina", "4tRn1lSkEn13EVTuqb0g"),
    # Verified 2026-10-03: the old Lia ID resolves to a Colombian voice.
    # The new B1 text is es-ES, so use the saved peninsular educational voice.
    "Spanish": ("es", "Emilio", "ZCh4e9eZSUf41K4cmCEL"),
    "French": ("fr", "Lilly", "z1rEShu1SmowIOAmbHl1"),
    # Roster label Samanta now resolves to Sami warm italian voice (GET 2026-10-03).
    "Italian": ("it", "Sami", "fQmr8dTaOQq116mo2X7F"),
    "Portuguese": ("pt", "Carla", "7eUAxNOneHxqfyRS77mW"),
}
SUPPORTED_SCOPES = (("English", "Spanish", "French"), ("Italian", "Portuguese"))
SOURCE_CODES = {"English": "en-US", "Spanish": "es-ES", "French": "fr-FR",
                "Italian": "it-IT", "Portuguese": "pt-BR"}
SURFACES = ["corePhrase", "chunks", "trophyWord", "dialogue", "pattern"]


def validate_audio_surfaces(lesson: dict) -> None:
    """Do not allow the inventory's permissive skips to hide incomplete drafts."""
    variant = lesson.get("vibeVariants", {}).get("bright", {})
    def has_text(value):
        return isinstance(value, str) and bool(value.strip())
    chunks = variant.get("chunks", [])
    dialogue = variant.get("dialogue", [])
    examples = variant.get("pattern", {}).get("examples", [])
    if not (has_text(variant.get("corePhrase", {}).get("targetText"))
            and has_text(variant.get("trophyWord", {}).get("word"))
            and len(dialogue) == 4 and all(has_text(turn.get("targetText")) for turn in dialogue)
            and examples and all(has_text(example.get("targetText")) for example in examples)
            and chunks and all(has_text(chunk.get("id")) and has_text(chunk.get("targetText")) for chunk in chunks)
            and len({chunk["id"] for chunk in chunks}) == len(chunks)
            and any("-item-" in chunk["id"] for chunk in chunks)
            and any("-item-" not in chunk["id"] for chunk in chunks)):
        raise ValueError(f"{lesson.get('id')}: incomplete audio surfaces")


def build_plan(snapshot: dict, *, model: str = "eleven_multilingual_v2") -> dict:
    if model not in {"eleven_multilingual_v2", "eleven_v4"}:
        raise ValueError("Unsupported campaign model")
    settings = ({"stability": 0.5, "similarity_boost": 0.75}
                if model == "eleven_v4" else dict(DEFAULT_VOICE_SETTINGS))
    model_label = "v4" if model == "eleven_v4" else "multiv2"
    if snapshot.get("schemaVersion") != 1 or snapshot.get("status") != "draft":
        raise ValueError("Expected a version 1 draft snapshot")
    languages = snapshot.get("languages", [])
    selected = sorted(group.get("targetLanguage", "") for group in languages)
    if not any(selected == sorted(scope) for scope in SUPPORTED_SCOPES):
        raise ValueError("Expected exactly English, Spanish, and French or exactly Italian and Portuguese")
    groups = []
    for group in languages:
        target = group["targetLanguage"]
        code, name, voice_id = PROPOSALS[target]
        slug = target.lower()
        path_id = f"{slug}-b1-practical-1"
        lessons = group["lessons"]
        if not re.fullmatch(r"[a-f0-9]{64}", group.get("sourceSha256", "")):
            raise ValueError(f"{target}: missing source fingerprint")
        expected_code = SOURCE_CODES[target]
        if group.get("targetLanguageCode") != expected_code:
            raise ValueError(f"{target}: language code mismatch")
        if len(lessons) != 10 or {lesson["lessonNumber"] for lesson in lessons} != set(range(1, 11)):
            raise ValueError(f"{target}: expected ten numbered lessons")
        if len({lesson["id"] for lesson in lessons}) != len(lessons):
            raise ValueError(f"{target}: duplicate lesson IDs")
        if any(lesson["pathId"] != path_id or not lesson["id"].startswith(f"{path_id}-") for lesson in lessons):
            raise ValueError(f"{target}: unexpected draft scope")
        for lesson in lessons:
            validate_audio_surfaces(lesson)
        profile = VoiceProfile(
            voice_profile_key=f"{slug}_b1_bright_p1_{model_label}_v1",
            target_language_code=code, vibe="bright", scope_path_id=path_id,
            provider_voice_id=voice_id, provider_model_id=model,
            output_format=DEFAULT_OUTPUT_FORMAT, voice_settings=dict(settings),
            voice_settings_hash=voice_settings_hash(settings),
            assignment_version=1, active=True, priority=90,
        )
        inventory = build_inventory(lessons=lessons, voice_profiles=[profile],
                                    existing_assets_by_cache_key={}, vibes=["bright"],
                                    surfaces=SURFACES, target_language_code=code)
        unique = {item["cache_key"]: item for item in inventory["items"]}
        if None in unique or inventory["totals"]["missing_voice_profile"]:
            raise ValueError(f"{target}: unresolved proposed voice")
        chars = sum(item["character_count"] for item in unique.values())
        # A failed cache key is not memoized by the existing runner: another
        # usage of that text may try again. Bound attempts by usage rows, not
        # only unique successful recordings. This is a single-run forecast.
        retry_ceiling = sum(item["character_count"] for item in inventory["items"]) * 3
        groups.append({
            "targetLanguage": target, "pathId": path_id, "sourceSha256": group["sourceSha256"],
            "proposedVoiceName": name, "proposedVoiceProfile": profile.__dict__,
            "lessonCount": len(lessons), "phraseCatalogRows": len(lessons),
            "usageRows": len(inventory["items"]), "uniqueAudioFiles": len(unique),
            "firstAttemptCharacters": chars,
            "existingRunnerSingleRunCharacterCeiling": retry_ceiling,
            "items": inventory["items"],
        })
    characters = sum(group["firstAttemptCharacters"] for group in groups)
    retry_ceiling = sum(group["existingRunnerSingleRunCharacterCeiling"] for group in groups)
    return {
        "schemaVersion": 1, "status": "draft-not-authorized-for-generation",
        "model": model, "providerAccessVerified": False,
        "voiceCreditMultipliersVerified": False,
        "existingAssetsQueried": False, "creditAssumption": "1 credit per character before unverified voice multipliers; no v4 promotional quota assumed",
        "creditBudgetCeiling": 200_000, "firstAttemptCharacters": characters,
        "existingRunnerSingleRunCharacterCeiling": retry_ceiling,
        "fitsBudgetAtOneCreditPerCharacterIncludingExistingRetries": retry_ceiling <= 200_000,
        "phraseCatalogRows": sum(group["phraseCatalogRows"] for group in groups),
        "usageRows": sum(group["usageRows"] for group in groups),
        "uniqueAudioFiles": sum(group["uniqueAudioFiles"] for group in groups),
        "groups": groups,
        "releaseGates": [
            "Fable content arbitration and independent review",
            "Twelve complete explanation editions per changed target",
            "Additive phrase-catalog/locale migration and rollback verification",
            "Fresh ElevenLabs account/model/voice access and voice credit multiplier verification",
            "Explicit production approval for the scoped profiles, assets, usages, run rows and storage objects",
            "Budget reservations for every provider attempt; no automatic retry after ambiguous charges",
            "Browser B1 flow and actual generated-audio checks",
        ],
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("snapshot", type=Path)
    parser.add_argument("--model", choices=["eleven_multilingual_v2", "eleven_v4"], default="eleven_multilingual_v2")
    parser.add_argument("--output", type=Path, help="Save the local manifest; otherwise print it")
    args = parser.parse_args()
    payload = args.snapshot.read_bytes()
    plan = build_plan(json.loads(payload), model=args.model)
    plan["snapshotSha256"] = hashlib.sha256(payload).hexdigest()
    rendered = json.dumps(plan, ensure_ascii=False, indent=2) + "\n"
    if args.output:
        args.output.write_text(rendered, encoding="utf-8", newline="\n")
        print(json.dumps({key: value for key, value in plan.items() if key != "groups"}, indent=2))
    else:
        print(rendered)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
