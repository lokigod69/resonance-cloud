"""Offline batch forecasts count cache keys, not duplicate playback usages."""
import copy
import hashlib
import json
from pathlib import Path

import pytest

from scripts.plan_guided_b1_drafts import build_plan


def snapshot():
    return {"schemaVersion": 1, "status": "draft", "languages": [
        {
            "targetLanguage": target, "targetLanguageCode": code, "sourceSha256": "a" * 64,
            "lessons": [
                {
                    "id": f"{target.lower()}-b1-practical-1-{number:03}-test",
                    "pathId": f"{target.lower()}-b1-practical-1", "lessonNumber": number,
                    "vibeVariants": {"bright": {
                        "corePhrase": {"targetText": "A repeated phrase."},
                        "chunks": [{"id": "test-1", "targetText": "A repeated phrase."},
                                   {"id": "test-item-1", "targetText": "vocabulary"}],
                        "trophyWord": {"word": "phrase"},
                        "dialogue": [{"targetText": text} for text in
                                     ["The opening.", "A repeated phrase.", "The reaction.", "The response."]],
                        "pattern": {"examples": [{"targetText": "A repeated phrase."}]},
                    }},
                } for number in range(1, 11)
            ],
        } for target, code in [("English", "en-US"), ("Spanish", "es-ES"), ("French", "fr-FR")]
    ]}


def test_forecast_deduplicates_across_surfaces_and_lessons_but_not_voices():
    plan = build_plan(snapshot())
    expected = sum(map(len, ["A repeated phrase.", "vocabulary", "phrase", "The opening.", "The reaction.", "The response."]))
    assert plan["uniqueAudioFiles"] == 6 * 3
    assert plan["usageRows"] == 8 * 10 * 3
    assert plan["firstAttemptCharacters"] == expected * 3
    # Failed duplicate usages could each retry; use the larger row sum.
    assert plan["existingRunnerSingleRunCharacterCeiling"] == (expected + 2 * len("A repeated phrase.")) * 10 * 3 * 3
    assert plan["providerAccessVerified"] is False
    assert plan["existingAssetsQueried"] is False
    assert all(any(item["surface_key"] == "test-item-1" for item in group["items"]) for group in plan["groups"])


def test_saved_manifest_matches_current_snapshot_and_inventory():
    directory = Path(__file__).resolve().parents[1] / "frontend/content-drafts/b1-2026-10"
    payload = (directory / "tts-snapshot.json").read_bytes()
    expected = build_plan(json.loads(payload))
    expected["snapshotSha256"] = hashlib.sha256(payload).hexdigest()
    assert json.loads((directory / "tts-plan.json").read_text(encoding="utf-8")) == expected


@pytest.mark.parametrize("surface", ["corePhrase", "chunks", "trophyWord", "dialogue", "pattern", "all", "terms"])
def test_plan_rejects_missing_audio_surfaces(surface):
    data = snapshot()
    variant = data["languages"][0]["lessons"][0]["vibeVariants"]["bright"]
    if surface == "all":
        variant.clear()
    elif surface == "terms":
        variant["chunks"] = [chunk for chunk in variant["chunks"] if "-item-" not in chunk["id"]]
    else:
        del variant[surface]
    with pytest.raises(ValueError, match="incomplete audio surfaces"):
        build_plan(data)


@pytest.mark.parametrize("fault", ["duplicate-target", "wrong-code", "wrong-scope", "duplicate-lesson", "missing-hash"])
def test_plan_rejects_ambiguous_or_incomplete_scope(fault):
    data = snapshot()
    if fault == "duplicate-target":
        data["languages"][1] = copy.deepcopy(data["languages"][0])
    elif fault == "wrong-code":
        data["languages"][0]["targetLanguageCode"] = "de-DE"
    elif fault == "wrong-scope":
        data["languages"][0]["lessons"][0]["pathId"] = "english-a1-practical-1"
    elif fault == "duplicate-lesson":
        data["languages"][0]["lessons"][1]["id"] = data["languages"][0]["lessons"][0]["id"]
    else:
        del data["languages"][0]["sourceSha256"]
    with pytest.raises(ValueError):
        build_plan(data)
