"""Offline explicit-batch tests; fixtures are synthetic and never authorize audio."""
import copy
import json
from pathlib import Path
import shutil
import sys

import pytest

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent
sys.path.insert(0, str(ROOT))
from scripts import plan_guided_b1_drafts as planner
from scripts import run_guided_audio_campaign as cli

PACKAGE = ROOT / "frontend/content-drafts/b1-2026-10"
MODELS = ("eleven_multilingual_v2", "eleven_v4")


def source(target, code):
    return {"schemaVersion": 1, "status": "draft", "pathNumber": 1, "level": "B1",
        "targetLanguage": target, "targetLanguageCode": code, "lessons": [
            {"slug": f"sample-{n}", "dialogue": [{"targetText": text} for text in
                [f"{target} opening {n}.", f"{target} first turn {n}.", f"{target} reply {n}.", f"{target} followup {n}."]],
             "chunks": [{"targetText": f"{target} chunk"}], "terms": [{"targetText": f"{target} term"}],
             "trophyWord": {"word": f"{target} trophy {n}"},
             "pattern": {"examples": [{"targetText": f"{target} first turn {n}."}]}}
            for n in range(1, 11)]}


def snapshot_from_sources(sources):
    return {"schemaVersion": 1, "status": "draft", "languages": [
        {"targetLanguage": d["targetLanguage"], "targetLanguageCode": d["targetLanguageCode"],
         "sourceSha256": "a" * 64, "lessons": cli.project_audio(d)} for d in sources]}


@pytest.fixture
def new_snapshot():
    return snapshot_from_sources([source("Italian", "it-IT"), source("Portuguese", "pt-BR")])


@pytest.mark.parametrize("model", MODELS)
def test_priority_plans_remain_exactly_equal_to_saved(model):
    raw = (PACKAGE / "tts-snapshot.json").read_bytes()
    snapshot = json.loads(raw)
    actual = planner.build_plan(snapshot, model=model)
    actual["snapshotSha256"] = cli.campaign.digest(raw)
    name = "tts-plan-v4.json" if model == "eleven_v4" else "tts-plan.json"
    assert actual == json.loads((PACKAGE / name).read_bytes())
    assert actual["phraseCatalogRows"] == 30


@pytest.mark.parametrize("model", MODELS)
def test_new_batch_has_exact_two_native_voice_profiles_and_twenty_lessons(new_snapshot, model):
    plan = planner.build_plan(new_snapshot, model=model)
    assert plan["phraseCatalogRows"] == 20 and plan["creditBudgetCeiling"] == 200_000
    assert plan["status"] == "draft-not-authorized-for-generation"
    assert plan["providerAccessVerified"] is False and plan["voiceCreditMultipliersVerified"] is False
    expected = [("Italian", "it", "Sami", "fQmr8dTaOQq116mo2X7F"),
                ("Portuguese", "pt", "Carla", "7eUAxNOneHxqfyRS77mW")]
    for group, (target, code, name, voice_id) in zip(plan["groups"], expected):
        profile = group["proposedVoiceProfile"]
        assert (group["targetLanguage"], profile["target_language_code"], group["proposedVoiceName"], profile["provider_voice_id"]) == (target, code, name, voice_id)
        assert group["lessonCount"] == group["phraseCatalogRows"] == 10
        assert profile["provider_model_id"] == model
        label = "v4" if model == "eleven_v4" else "multiv2"
        assert profile["voice_profile_key"] == f"{target.lower()}_b1_bright_p1_{label}_v1"
        assert all(item["target_language_code"] == code for item in group["items"])
    assert len(cli.campaign.unique_requests(plan)) == plan["uniqueAudioFiles"]


def test_models_and_batches_have_disjoint_cache_keys(new_snapshot):
    priority = json.loads((PACKAGE / "tts-snapshot.json").read_bytes())
    def keys(snapshot, model):
        return {r["cache_key"] for r in cli.campaign.unique_requests(planner.build_plan(snapshot, model=model))}
    new_v4 = keys(new_snapshot, "eleven_v4")
    assert new_v4.isdisjoint(keys(new_snapshot, "eleven_multilingual_v2"))
    assert new_v4.isdisjoint(keys(priority, "eleven_v4"))


@pytest.mark.parametrize("targets", [[], ["Italian"], ["Portuguese"], ["Italian", "Italian"],
    ["English", "Italian"], ["Italian", "Portuguese", "French"],
    ["English", "Spanish", "French", "Italian", "Portuguese"]])
def test_arbitrary_or_ambiguous_language_subsets_are_rejected(targets):
    codes = {"English": "en-US", "Spanish": "es-ES", "French": "fr-FR", "Italian": "it-IT", "Portuguese": "pt-BR"}
    snapshot = snapshot_from_sources([source(target, codes[target]) for target in targets])
    with pytest.raises(ValueError, match="Expected exactly"):
        planner.build_plan(snapshot)


@pytest.mark.parametrize("target,code", [(0, "it"), (0, "es-ES"), (1, "pt"), (1, "pt-PT")])
def test_sources_require_native_regional_codes(new_snapshot, target, code):
    new_snapshot["languages"][target]["targetLanguageCode"] = code
    with pytest.raises(ValueError, match="language code mismatch"):
        planner.build_plan(new_snapshot)


@pytest.fixture
def staged(tmp_path):
    root = tmp_path / "repo"
    directory = root / "frontend/content-drafts/b1-2026-10"
    directory.mkdir(parents=True)
    for name in ("english.json", "spanish.json", "french.json", "review-evidence.json", "tts-snapshot.json", "tts-plan.json", "tts-plan-v4.json"):
        shutil.copyfile(PACKAGE / name, directory / name)
    sources = [source("Italian", "it-IT"), source("Portuguese", "pt-BR")]
    snapshot = snapshot_from_sources(sources)
    hashes = {}
    for draft, group in zip(sources, snapshot["languages"]):
        slug = draft["targetLanguage"].lower()
        raw = (json.dumps(draft, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
        (directory / f"{slug}.json").write_bytes(raw)
        hashes[slug] = group["sourceSha256"] = cli.campaign.digest(raw)
    evidence = {"status": "reviewed-staged", "reviewedSourceSha256": hashes,
                "independentReview": {"finalVerdict": "PASS", "unresolvedFindings": 0}}
    (directory / "review-evidence-it-pt.json").write_text(json.dumps(evidence), encoding="utf-8")
    snapshot_raw = (json.dumps(snapshot, ensure_ascii=False, indent=2) + "\n").encode("utf-8")
    (directory / "tts-snapshot-it-pt.json").write_bytes(snapshot_raw)
    for model in MODELS:
        plan = planner.build_plan(snapshot, model=model)
        plan["snapshotSha256"] = cli.campaign.digest(snapshot_raw)
        name = "tts-plan-it-pt-v4.json" if model == "eleven_v4" else "tts-plan-it-pt.json"
        (directory / name).write_text(json.dumps(plan, ensure_ascii=False), encoding="utf-8")
    rates = {"mode": "pilot", "models": {"eleven_v4": {"modelCharacterCostMultiplier": "1", "voices": {
        "fQmr8dTaOQq116mo2X7F": {"sharingRate": 1, "creditMultiplier": "10", "verification": "synthetic-test"},
        "7eUAxNOneHxqfyRS77mW": {"sharingRate": 3, "creditMultiplier": "10", "verification": "synthetic-test"}}}}}
    rate_path = root / "rates.json"
    rate_path.write_text(json.dumps(rates), encoding="utf-8")
    return root, directory, rates, rate_path


@pytest.mark.parametrize("model", MODELS)
def test_priority_fingerprint_and_default_files_remain_unchanged(staged, model):
    _, directory, rates, _ = staged
    default = cli.load_reviewed_inputs(directory, rates, model)
    assert default == cli.load_reviewed_inputs(directory, rates, model, "priority")
    # Preserve the original fingerprint contract even after both modules are installed.
    name = "tts-plan-v4.json" if model == "eleven_v4" else "tts-plan.json"
    expected_fingerprint = cli.campaign.digest(cli.campaign.canonical({
        "plan": json.loads((directory / name).read_bytes()),
        "reviewEvidenceSha256": cli.campaign.digest((directory / "review-evidence.json").read_bytes()),
        "rateEvidence": rates}).encode("utf-8"))
    assert default[1] == expected_fingerprint
    new = cli.load_reviewed_inputs(directory, rates, model, "italian-portuguese")
    assert new[1] != default[1]
    assert new[0]["phraseCatalogRows"] == 20


def reject_provider(*args):
    pytest.fail("provider constructed before validation or in dry-run")


@pytest.mark.parametrize("batch,model", [(batch, model) for batch in ("priority", "italian-portuguese") for model in MODELS])
def test_cli_explicit_batches_dry_run_without_output_or_provider(staged, capsys, batch, model):
    root, directory, rates, rate_path = staged
    assert cli.main(["--batch", batch, "--model", model, "--rates", str(rate_path)],
                    repo_root=root, provider_factory=reject_provider) == 0
    result = json.loads(capsys.readouterr().out)
    plan, fingerprint = cli.load_reviewed_inputs(directory, rates, model, batch)
    assert result["mode"] == "dry-run" and result["inputFingerprint"] == fingerprint
    assert result["uniqueKeys"] == plan["uniqueAudioFiles"]
    assert not (root / "review-artifacts").exists()


@pytest.mark.parametrize("fault", ["unreviewed", "open_findings", "source", "snapshot", "plan", "model", "fingerprint"])
def test_new_batch_stale_or_unapproved_inputs_stop_before_provider(staged, fault, monkeypatch):
    root, directory, rates, rate_path = staged
    _, fingerprint = cli.load_reviewed_inputs(directory, rates, "eleven_v4", "italian-portuguese")
    if fault in {"unreviewed", "open_findings"}:
        path = directory / "review-evidence-it-pt.json"
        data = json.loads(path.read_bytes())
        if fault == "unreviewed":
            data["status"] = "draft"
        else:
            data["independentReview"]["unresolvedFindings"] = 1
        path.write_text(json.dumps(data), encoding="utf-8")
    elif fault == "source":
        with (directory / "portuguese.json").open("ab") as handle:
            handle.write(b"\n")
    elif fault == "snapshot":
        path = directory / "tts-snapshot-it-pt.json"
        data = json.loads(path.read_bytes())
        data["languages"][0]["lessons"][0]["vibeVariants"]["bright"]["corePhrase"]["targetText"] = "Changed."
        path.write_text(json.dumps(data), encoding="utf-8")
    elif fault in {"plan", "model"}:
        path = directory / "tts-plan-it-pt-v4.json"
        data = json.loads(path.read_bytes())
        if fault == "plan":
            data["groups"][0]["proposedVoiceProfile"]["provider_voice_id"] = "different"
        else:
            data["model"] = "eleven_multilingual_v2"
        path.write_text(json.dumps(data), encoding="utf-8")
    else:
        fingerprint = "f" * 64
    monkeypatch.setattr(cli.campaign, "execute", lambda *args, **kwargs: pytest.fail("invalid input reached executor"))
    with pytest.raises(cli.campaign.CampaignError):
        cli.main(["--batch", "italian-portuguese", "--model", "eleven_v4", "--rates", str(rate_path),
            "--commit", "--expected-input-sha256", fingerprint], repo_root=root, provider_factory=reject_provider)
    assert not (root / "review-artifacts").exists()


def test_new_batch_dispatch_parameters_reuse_existing_campaign_and_sample_gate(staged, monkeypatch, capsys):
    root, directory, rates, rate_path = staged
    plan, fingerprint = cli.load_reviewed_inputs(directory, rates, "eleven_v4", "italian-portuguese")
    events, captured = [], {}
    original = cli.load_reviewed_inputs
    def revalidate(*args, **kwargs):
        result = original(*args, **kwargs)
        events.append("validated")
        return result
    monkeypatch.setattr(cli, "load_reviewed_inputs", revalidate)
    class FakeProvider:
        def close(self):
            events.append("closed")
    def factory(key):
        assert events == ["validated"]
        events.append("provider")
        return FakeProvider()
    def execute(plan, fingerprint, directory, **kwargs):
        captured.update(plan=plan, fingerprint=fingerprint, directory=directory, **kwargs)
        return {"mode": "commit", "dispatched": 0}
    monkeypatch.setattr(cli.campaign, "execute", execute)
    assert cli.main(["--batch", "italian-portuguese", "--model", "eleven_v4", "--rates", str(rate_path),
        "--commit", "--sample-per-voice", "--expected-input-sha256", fingerprint], repo_root=root, provider_factory=factory) == 0
    assert events == ["validated", "provider", "closed"]
    assert captured["plan"] == plan and captured["fingerprint"] == fingerprint
    assert captured["directory"] == root / "review-artifacts/guided-audio-20261003/api"
    assert captured["lock_path"] == root / "review-artifacts/.guided-audio-api.lock"
    assert captured["rate_evidence"] == rates and captured["sample_per_voice"] is True
    assert captured["commit"] is True and captured["limit"] is None
    assert not (root / "review-artifacts").exists()
    assert json.loads(capsys.readouterr().out)["mode"] == "commit"
