"""Offline review/source/paid-boundary contracts; fixtures never authorize audio."""
import copy
import json
from pathlib import Path
import shutil
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts import run_guided_b1_path_batch as batch
from scripts.run_guided_audio_campaign import project_audio
from scripts.plan_guided_b1_drafts import build_plan


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    monkeypatch.setattr(batch, "runtime_evidence", lambda: {"testRuntime": "reviewed"})
    for name in batch.CODE_PATHS:
        target = tmp_path / name
        target.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(ROOT / name, target)
    source = json.loads((ROOT / "frontend/content-drafts/b1-2026-10/english.json").read_bytes())
    source["pathNumber"] = 2
    name = "frontend/content-drafts/synthetic/english-p2.json"
    path = tmp_path / name
    write(path, source)
    bindings = {name: batch.campaign.digest(path.read_bytes())}
    manifest = {"schemaVersion": 2, "status": "reviewed-staged", "level": "B1",
        "sources": [{"file": name, "sha256": bindings[name], "targetLanguage": "English", "pathNumber": 2,
            "reviewedVoiceId": "4tRn1lSkEn13EVTuqb0g"}],
        "fableReview": {"model": "claude-fable-5-1", "verdict": "PASS", "unresolvedFindings": 0,
            "evidenceSha256": "a" * 64, "reviewedSources": bindings},
        "independentReview": {"verdict": "PASS", "unresolvedFindings": 0,
            "evidenceSha256": "b" * 64, "reviewedSources": bindings}}
    manifest_path, plan_path, rates_path = [tmp_path / name for name in ("manifest.json", "plan.json", "rates.json")]
    write(manifest_path, manifest)
    plan, _ = batch.prepare_inputs(tmp_path, manifest_path)
    write(plan_path, plan)
    rates = {"mode": "receipt-verified", "models": {}}
    write(rates_path, rates)
    return tmp_path, manifest_path, plan_path, rates_path, manifest, plan, source


def forbidden_provider(*args):
    pytest.fail("Provider must not be constructed in a dry-run or with invalid inputs")


def test_later_path_uses_tier_global_ids_but_local_lesson_order(fixture):
    _, _, _, _, _, plan, source = fixture
    lessons = project_audio(source)
    assert lessons[0]["id"].startswith("english-b1-practical-2-011-")
    assert lessons[-1]["id"].startswith("english-b1-practical-2-020-")
    assert [x["lessonNumber"] for x in lessons] == list(range(1, 11))
    assert plan["groups"][0]["proposedVoiceProfile"]["voice_profile_key"] == "english_b1_bright_p2_v4_v1"
    source["pathNumber"] = 10
    assert project_audio(source)[-1]["id"].startswith("english-b1-practical-10-100-")


def test_dry_run_never_constructs_provider_or_ledger(fixture, capsys):
    root, manifest, plan, rates, *_ = fixture
    assert batch.main(["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates)],
                      repo_root=root, provider_factory=forbidden_provider) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["mode"] == "dry-run" and result["uniqueKeys"] > 100
    assert not (root / "review-artifacts").exists()


@pytest.mark.parametrize("fault", ["runtime", "src/__init__.py", "src/services/__init__.py",
    "src/services/guided_tts/__init__.py", "scripts/guided_refresh_v2.py"])
def test_execution_environment_changes_fail_before_provider(fixture, monkeypatch, fault):
    root, manifest, plan, rates, *_ = fixture
    _, fingerprint = batch.load_inputs(root, manifest, plan, json.loads(rates.read_bytes()))
    if fault == "runtime":
        monkeypatch.setattr(batch, "runtime_evidence", lambda: {"testRuntime": "changed"})
    else:
        with (root / fault).open("a", encoding="utf-8") as handle:
            handle.write("\n# changed imported execution code\n")
    with pytest.raises(batch.campaign.CampaignError, match="rebuilt_plan_mismatch"):
        batch.main(["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates),
                    "--expected-input-sha256", fingerprint, "--commit"],
                   repo_root=root, provider_factory=forbidden_provider)
    assert not (root / "review-artifacts").exists()


@pytest.mark.parametrize("fault", ["source", "fable", "independent", "review_bindings", "duplicate",
    "voice", "path", "level", "escape", "plan", "code", "fingerprint"])
def test_invalid_or_stale_inputs_fail_before_provider(fixture, fault):
    root, manifest_path, plan_path, rates_path, manifest, plan, source = fixture
    rates = json.loads(rates_path.read_bytes())
    _, fingerprint = batch.load_inputs(root, manifest_path, plan_path, rates)
    if fault == "source":
        source["lessons"][0]["dialogue"][1]["targetText"] += " Changed."
        write(root / manifest["sources"][0]["file"], source)
    elif fault in ("fable", "independent"):
        manifest[fault + "Review"]["verdict"] = "REWORK"
    elif fault == "review_bindings":
        manifest["fableReview"]["reviewedSources"] = {}
    elif fault == "duplicate":
        manifest["sources"].append(copy.deepcopy(manifest["sources"][0]))
    elif fault == "voice":
        manifest["sources"][0]["reviewedVoiceId"] = "other-voice"
    elif fault == "path":
        manifest["sources"][0]["pathNumber"] = 3
    elif fault == "level":
        manifest["level"] = "B2"
    elif fault == "escape":
        old_name = manifest["sources"][0]["file"]
        new_name = "../outside.json"
        manifest["sources"][0]["file"] = new_name
        for name in ("fableReview", "independentReview"):
            manifest[name]["reviewedSources"] = {new_name: manifest[name]["reviewedSources"][old_name]}
    elif fault == "plan":
        plan["groups"][0]["items"].pop()
        write(plan_path, plan)
    elif fault == "code":
        with (root / batch.CODE_PATHS[0]).open("a", encoding="utf-8") as handle:
            handle.write("\n# altered executor\n")
    else:
        fingerprint = "f" * 64
    write(manifest_path, manifest)
    with pytest.raises((batch.campaign.CampaignError, ValueError)):
        batch.main(["--manifest", str(manifest_path), "--plan", str(plan_path), "--rates", str(rates_path),
                    "--expected-input-sha256", fingerprint, "--commit"],
                   repo_root=root, provider_factory=forbidden_provider)
    assert not (root / "review-artifacts").exists()


def test_paid_path_requires_checked_in_code_before_provider(fixture):
    root, manifest, plan, rates, *_ = fixture
    _, fingerprint = batch.load_inputs(root, manifest, plan, json.loads(rates.read_bytes()))
    with pytest.raises(batch.campaign.CampaignError, match="not_checked_in"):
        batch.main(["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates),
                    "--expected-input-sha256", fingerprint, "--commit"],
                   repo_root=root, provider_factory=forbidden_provider)


def test_wrong_global_ordinal_and_duplicate_scope_are_rejected(fixture):
    *_, source = fixture
    group = {"targetLanguage": "English", "targetLanguageCode": "en-US", "pathNumber": 2,
             "sourceSha256": "c" * 64, "lessons": project_audio(source)}
    snapshot = {"schemaVersion": 2, "status": "draft", "languages": [group]}
    group["lessons"][0]["id"] = group["lessons"][0]["id"].replace("-011-", "-001-")
    with pytest.raises(ValueError, match="tier-global"):
        build_plan(snapshot, model="eleven_v4", reviewed_scopes=[("English", 2)])
    group["lessons"] = project_audio(source)
    snapshot["languages"].append(copy.deepcopy(group))
    with pytest.raises(ValueError, match="unique reviewed"):
        build_plan(snapshot, model="eleven_v4", reviewed_scopes=[("English", 2), ("English", 2)])
