"""Offline synthetic contracts: these fixtures do not authorize content or paid calls."""
from collections import Counter
import copy
import hashlib
import importlib.util
import json
from pathlib import Path
import shutil
import subprocess
import sys

import pytest

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/src").is_dir()), HERE.parent)
sys.path.insert(0, str(ROOT))
# The same suite runs from scratch without creating or altering app modules.
script = HERE / "run_guided_b2_path_batch.py"
if not script.is_file():
    script = ROOT / "scripts/run_guided_b2_path_batch.py"
spec = importlib.util.spec_from_file_location("b2_batch_under_test", script)
batch = importlib.util.module_from_spec(spec)
spec.loader.exec_module(batch)


def digest(raw):
    return hashlib.sha256(raw).hexdigest()


def write(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read(path):
    return json.loads(path.read_bytes())


@pytest.fixture
def fixture(tmp_path, monkeypatch):
    monkeypatch.setattr(batch, "runtime_evidence", lambda: {"runtime": "synthetic-review"})
    for name in batch.CODE_PATHS:
        dest = tmp_path / name
        dest.parent.mkdir(parents=True, exist_ok=True)
        shutil.copyfile(script if name == "scripts/run_guided_b2_path_batch.py" else ROOT / name, dest)
    contract = tmp_path / batch.CONTRACT_PATH
    contract.parent.mkdir(parents=True, exist_ok=True)
    shutil.copyfile(ROOT / batch.CONTRACT_PATH, contract)
    source = copy.deepcopy(read(contract)["exemplar"])
    lesson = source["lessons"][0]
    source["lessons"] = []
    source["pathNumber"] = 2
    for i in range(10):
        value = copy.deepcopy(lesson)
        value["lessonNumber"] = i + 1
        value["slug"] = f"synthetic-{i + 1}"
        source["lessons"].append(value)
    name = "frontend/content-drafts/b2-2026-10/german/synthetic-p2.json"
    write(tmp_path / name, source)
    bindings = {name: digest((tmp_path / name).read_bytes())}
    voice_file = "review-artifacts/synthetic-voice.json"
    write(tmp_path / voice_file, {"method": "GET only", "providerVoices": [{"requestedId": batch.VOICE_ID,
        "voice_id": batch.VOICE_ID, "status": 200, "name": "Synthetic verified German voice", "sharingRate": 1,
        "labels": {"language": "de", "gender": "female"}, "verified_languages": [{"language": "de", "locale": "de-DE"}]}]})
    manifest = {"schemaVersion": 3, "status": "reviewed-staged", "level": "B2",
        "sources": [{"file": name, "sha256": bindings[name], "targetLanguage": "German", "pathNumber": 2,
                     "reviewedVoiceId": batch.VOICE_ID}],
        "voiceEvidence": {"file": voice_file, "sha256": digest((tmp_path / voice_file).read_bytes())}}
    for review in ("fableReview", "independentReview", "structuralValidation"):
        evidence_file = f"review-artifacts/{review}.json"
        envelope = {"schemaVersion": 1, "kind": review, "syntheticFixtureOnly": True,
            "verdict": "PASS", "unresolvedFindings": 0, "reviewedSources": bindings}
        if review == "fableReview": envelope["model"] = "claude-fable-5-1"
        if review == "structuralValidation":
            envelope.update(validatorSha256=digest((tmp_path / batch.VALIDATOR_PATH).read_bytes()), contractSha256=digest(contract.read_bytes()))
        write(tmp_path / evidence_file, envelope)
        manifest[review] = {"verdict": "PASS", "unresolvedFindings": 0, "reviewedSources": bindings,
            "evidenceFile": evidence_file, "evidenceSha256": digest((tmp_path / evidence_file).read_bytes())}
    manifest["fableReview"]["model"] = "claude-fable-5-1"
    manifest["structuralValidation"].update(validatorSha256=digest((tmp_path / batch.VALIDATOR_PATH).read_bytes()),
        contractSha256=digest(contract.read_bytes()))
    manifest_path = tmp_path / "frontend/content-drafts/b2-2026-10/german/synthetic-manifest.json"
    write(manifest_path, manifest)
    plan, authority = batch.prepare_inputs(tmp_path, manifest_path)
    plan_path, rates_path = tmp_path / "plan.json", tmp_path / "rates.json"
    write(plan_path, plan)
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": "1",
        "voices": {batch.VOICE_ID: {"sharingRate": 1, "creditMultiplier": "1", "verification": "synthetic fixture"}}}}}
    write(rates_path, rates)
    _, fingerprint = batch.load_inputs(tmp_path, manifest_path, plan_path, rates)
    return {"root": tmp_path, "manifest_path": manifest_path, "plan_path": plan_path, "rates_path": rates_path,
        "manifest": manifest, "source": source, "plan": plan, "authority": authority, "fingerprint": fingerprint,
        "argv": ["--manifest", str(manifest_path), "--plan", str(plan_path), "--rates", str(rates_path)]}


def forbid_provider(*args):
    pytest.fail("Invalid inputs or dry-run constructed a provider")


@pytest.mark.parametrize("stale_review", ["fableReview", "independentReview", "structuralValidation"])
def test_fresh_manifest_cannot_rebind_an_old_evidence_envelope(fixture, monkeypatch, stale_review):
    f = fixture
    manifest = copy.deepcopy(f["manifest"])
    source = copy.deepcopy(f["source"])
    source["lessons"][0]["dialogue"][5]["targetText"] += " Dieser neue Satz wurde nicht geprüft."
    name = manifest["sources"][0]["file"]
    write(f["root"] / name, source)
    bindings = {name: digest((f["root"] / name).read_bytes())}
    manifest["sources"][0]["sha256"] = bindings[name]
    for review in ("fableReview", "independentReview", "structuralValidation"):
        manifest[review]["reviewedSources"] = bindings
        if review != stale_review:
            evidence_path = f["root"] / manifest[review]["evidenceFile"]
            envelope = read(evidence_path); envelope["reviewedSources"] = bindings
            write(evidence_path, envelope)
            manifest[review]["evidenceSha256"] = digest(evidence_path.read_bytes())
    write(f["manifest_path"], manifest)
    monkeypatch.setattr(batch, "checked_in", lambda *args: None)
    monkeypatch.setattr(batch.campaign, "execute", lambda *args, **kwargs: pytest.fail("Stale review reached ledger"))
    # Rebuilding must fail, so no new plan/fingerprint can legitimize old evidence.
    with pytest.raises(batch.ERROR, match="evidence_verdict_or_source_bindings_stale"):
        batch.prepare_inputs(f["root"], f["manifest_path"])
    with pytest.raises(batch.ERROR, match="evidence_verdict_or_source_bindings_stale"):
        batch.main([*f["argv"], "--commit", "--expected-input-sha256", "f" * 64],
            repo_root=f["root"], provider_factory=forbid_provider)
    assert not (f["root"] / "review-artifacts/guided-audio-20261003").exists()


@pytest.mark.parametrize("review,field,value", [
    ("fableReview", "model", "other-model"), ("fableReview", "verdict", "REWORK"),
    ("independentReview", "unresolvedFindings", 1), ("independentReview", "unresolvedFindings", False),
    ("independentReview", "kind", "fableReview"), ("structuralValidation", "schemaVersion", 2),
    ("structuralValidation", "validatorSha256", "a" * 64), ("structuralValidation", "contractSha256", "b" * 64),
])
def test_evidence_metadata_cannot_be_overridden_by_manifest(fixture, review, field, value):
    f = fixture
    manifest = copy.deepcopy(f["manifest"])
    path = f["root"] / manifest[review]["evidenceFile"]
    envelope = read(path); envelope[field] = value
    write(path, envelope)
    manifest[review]["evidenceSha256"] = digest(path.read_bytes())
    write(f["manifest_path"], manifest)
    expected_error = ("fable_personal_review_required" if field == "model" else
        "b2_evidence_validation_authority_stale" if field in ("validatorSha256", "contractSha256") else
        "b2_evidence_verdict_or_source_bindings_stale")
    with pytest.raises(batch.ERROR, match=expected_error):
        batch.prepare_inputs(f["root"], f["manifest_path"])


def project(source):
    return batch.project_source(source, source_file="synthetic.json", source_sha256="a" * 64)


def test_six_turns_full_first_reply_and_all_new_audio_fields_survive(fixture):
    source, plan = fixture["source"], fixture["plan"]
    items = plan["groups"][0]["items"]
    assert plan["usageRows"] == 270
    assert plan["creditBudgetCeiling"] == 200000
    assert Counter(i["surface"] for i in items) == {"dialogue": 50, "corePhrase": 10, "chunk": 160,
        "trophyWord": 10, "trophyExample": 10, "pattern": 30}
    expected = {}
    for n, lesson in enumerate(source["lessons"]):
        for i, turn in enumerate(lesson["dialogue"]): expected[f"/lessons/{n}/dialogue/{i}/targetText"] = turn["targetText"]
        for i, text in enumerate(lesson["build"]["chunks"]): expected[f"/lessons/{n}/build/chunks/{i}"] = text
        for i, term in enumerate(lesson["terms"]): expected[f"/lessons/{n}/terms/{i}/targetText"] = term["targetText"]
        for i, example in enumerate(lesson["pattern"]["examples"]): expected[f"/lessons/{n}/pattern/examples/{i}/targetText"] = example["targetText"]
        expected[f"/lessons/{n}/trophy/lemma"] = lesson["trophy"]["lemma"]
        expected[f"/lessons/{n}/trophy/example/targetText"] = lesson["trophy"]["example"]["targetText"]
    actual = {i["sourceCoordinate"]["sourcePointer"]: i["source_text"] for i in items}
    assert actual == expected and len(actual) == len(items)
    assert items[1]["surface"] == "corePhrase" and items[1]["source_text"] == source["lessons"][0]["dialogue"][1]["targetText"]
    assert items[4]["surface_key"] == "turn-5" and items[5]["surface_key"] == "turn-6"


def test_tier_global_ids_and_independent_cache_formula(fixture):
    items = fixture["plan"]["groups"][0]["items"]
    assert items[0]["lesson_id"] == "german-b2-practical-2-011-synthetic-1"
    assert items[-1]["lesson_id"] == "german-b2-practical-2-020-synthetic-10"
    assert {i["lesson_number"] for i in items} == set(range(1, 11))
    settings = digest(b'{"similarity_boost":0.75,"stability":0.5}')
    for item in items:
        expected = digest("|".join(["elevenlabs", "de", "german_b2_bright_p2_v4_v1", "Qy4b2JlSGxY7I9M9Bqxb",
            "eleven_v4", "mp3_44100_128", settings, "v1", digest(item["normalized_text"].encode())]).encode())
        assert item["cache_key"] == expected
    keys = {item["cache_key"] for item in items}
    assert len(keys) == fixture["plan"]["uniqueAudioFiles"] < 27
    assert fixture["plan"]["firstAttemptCharacters"] == sum(len(r["text"]) for r in batch.campaign.unique_requests(fixture["plan"]))


@pytest.mark.parametrize("fault", ["fifth_turn", "third_reply", "speaker", "empty_reply", "missing_chunks", "missing_terms",
    "missing_patterns", "missing_trophy", "missing_trophy_example", "missing_speak", "build_reconstruction",
    "global_number_in_source", "duplicate_number", "duplicate_slug", "missing_lesson", "status", "level", "target", "locale", "path"])
def test_incomplete_or_invalid_projection_fails_closed(fixture, fault):
    source = copy.deepcopy(fixture["source"])
    lesson = source["lessons"][0]
    if fault == "fifth_turn": lesson["dialogue"].pop(4)
    if fault == "third_reply": lesson["dialogue"].pop(5)
    if fault == "speaker": lesson["dialogue"][4]["speaker"] = "you"
    if fault == "empty_reply": lesson["dialogue"][5]["targetText"] = ""
    if fault == "missing_chunks": lesson["build"]["chunks"] = []
    if fault == "missing_terms": lesson["terms"] = []
    if fault == "missing_patterns": lesson["pattern"]["examples"] = []
    if fault == "missing_trophy": lesson["trophy"].pop("lemma")
    if fault == "missing_trophy_example": lesson["trophy"].pop("example")
    if fault == "missing_speak": lesson["speak"].pop()
    if fault == "build_reconstruction": lesson["build"]["frameSuffix"] = " added"
    if fault == "global_number_in_source": lesson["lessonNumber"] = 11
    if fault == "duplicate_number": source["lessons"][1]["lessonNumber"] = 1
    if fault == "duplicate_slug": source["lessons"][1]["slug"] = lesson["slug"]
    if fault == "missing_lesson": source["lessons"].pop()
    if fault == "status": source["status"] = "active"
    if fault == "level": source["level"] = "B1"
    if fault == "target": source["targetLanguage"] = "English"
    if fault == "locale": source["targetLanguageCode"] = "de-AT"
    if fault == "path": source["pathNumber"] = 3
    with pytest.raises(batch.ERROR): project(source)


@pytest.mark.parametrize("field", ["third_reply", "fifth_turn", "trophy_example", "trophy_lemma", "pattern", "term", "chunk"])
@pytest.mark.parametrize("text", ["U\u0308berwiegen", "Text\nText", "Text\u200bText", "[laughs] Text", "<break/> Text", "Text  doppelt"])
def test_every_b2_surface_rejects_noncanonical_or_annotated_speech(fixture, field, text):
    source = copy.deepcopy(fixture["source"])
    lesson = source["lessons"][0]
    if field == "third_reply": lesson["dialogue"][5]["targetText"] = text
    if field == "fifth_turn": lesson["dialogue"][4]["targetText"] = text
    if field == "trophy_example": lesson["trophy"]["example"]["targetText"] = text
    if field == "trophy_lemma": lesson["trophy"]["lemma"] = text
    if field == "pattern": lesson["pattern"]["examples"][0]["targetText"] = text
    if field == "term": lesson["terms"][0]["targetText"] = text
    if field == "chunk": lesson["build"]["chunks"][0] = text
    with pytest.raises(batch.ERROR, match="invalid_b2_spoken_text"): project(source)


@pytest.mark.parametrize("fault", ["source", "dropped_plan_reply", "plan_bytes", "code", "runtime", "review", "review_bytes",
    "review_binding", "ts_validator", "contract", "voice_bytes", "manifest_status", "missing_fingerprint", "fingerprint", "rates"])
def test_stale_inputs_stop_before_provider_and_ledger(fixture, monkeypatch, fault):
    f = fixture
    manifest, plan = copy.deepcopy(f["manifest"]), copy.deepcopy(f["plan"])
    fingerprint = f["fingerprint"]
    if fault == "source":
        source = copy.deepcopy(f["source"]); source["lessons"][0]["dialogue"][5]["targetText"] += " Neuer Schluss."
        write(f["root"] / manifest["sources"][0]["file"], source)
    if fault == "dropped_plan_reply":
        plan["groups"][0]["items"].pop(5); write(f["plan_path"], plan)
    if fault == "plan_bytes": f["plan_path"].write_bytes(f["plan_path"].read_bytes() + b" ")
    if fault == "code": (f["root"] / "scripts/guided_refresh_v2.py").write_bytes(b"changed runtime helper")
    if fault == "runtime": monkeypatch.setattr(batch, "runtime_evidence", lambda: {"runtime": "changed"})
    if fault == "review": manifest["fableReview"]["verdict"] = "REWORK"
    if fault == "review_bytes": write(f["root"] / manifest["independentReview"]["evidenceFile"], {"changed": True})
    if fault == "review_binding": manifest["independentReview"]["reviewedSources"] = {}
    if fault == "ts_validator": (f["root"] / batch.VALIDATOR_PATH).write_bytes(b"changed validator")
    if fault == "contract": (f["root"] / batch.CONTRACT_PATH).write_bytes(b"changed contract")
    if fault == "voice_bytes": write(f["root"] / manifest["voiceEvidence"]["file"], {"changed": True})
    if fault == "manifest_status": manifest["status"] = "draft"
    if fault == "fingerprint": fingerprint = "f" * 64
    if fault == "rates":
        rates = read(f["rates_path"]); rates["models"]["eleven_v4"]["voices"][batch.VOICE_ID]["creditMultiplier"] = "2"
        write(f["rates_path"], rates)
    write(f["manifest_path"], manifest)
    monkeypatch.setattr(batch, "checked_in", lambda *args: None)
    monkeypatch.setattr(batch.campaign, "execute", lambda *args, **kwargs: pytest.fail("invalid input reached campaign"))
    argv = [*f["argv"], "--commit"]
    if fault != "missing_fingerprint": argv += ["--expected-input-sha256", fingerprint]
    with pytest.raises(batch.ERROR): batch.main(argv, repo_root=f["root"], provider_factory=forbid_provider)
    assert not (f["root"] / "review-artifacts/guided-audio-20261003").exists()


@pytest.mark.parametrize("fault", ["outside", "wrong_directory", "duplicate_file", "duplicate_scope", "voice", "target", "unknown_path"])
def test_manifest_scope_and_path_controls(fixture, fault):
    f = fixture
    manifest = copy.deepcopy(f["manifest"])
    entry = manifest["sources"][0]
    if fault in {"outside", "wrong_directory"}:
        old = entry["file"]
        entry["file"] = "../outside.json" if fault == "outside" else "frontend/content-drafts/b1-2026-10/german.json"
        for name in ("fableReview", "independentReview", "structuralValidation"):
            manifest[name]["reviewedSources"] = {entry["file"]: manifest[name]["reviewedSources"][old]}
    if fault == "duplicate_file": manifest["sources"].append(copy.deepcopy(entry))
    if fault == "duplicate_scope":
        duplicate = copy.deepcopy(entry); duplicate["file"] = entry["file"].replace("synthetic-p2", "second-p2")
        write(f["root"] / duplicate["file"], f["source"]); manifest["sources"].append(duplicate)
        for name in ("fableReview", "independentReview", "structuralValidation"):
            manifest[name]["reviewedSources"][duplicate["file"]] = duplicate["sha256"]
    if fault == "voice": entry["reviewedVoiceId"] = "replacement"
    if fault == "target": entry["targetLanguage"] = "Russian"
    if fault == "unknown_path": entry["pathNumber"] = 3
    write(f["manifest_path"], manifest)
    with pytest.raises(batch.ERROR): batch.prepare_inputs(f["root"], f["manifest_path"])


def test_dry_run_constructs_nothing_and_uses_same_campaign(fixture, monkeypatch, capsys):
    f, captured = fixture, {}
    execute = batch.campaign.execute
    def dry(plan, fingerprint, directory, **kwargs):
        captured.update(directory=directory, **kwargs)
        return execute(plan, fingerprint, directory, **kwargs)
    monkeypatch.setattr(batch.campaign, "execute", dry)
    assert batch.main(f["argv"], repo_root=f["root"], provider_factory=forbid_provider) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["mode"] == "dry-run" and result["cap"] == 200000
    assert result["inputFingerprint"] == f["fingerprint"]
    assert captured["directory"] == f["root"] / "review-artifacts/guided-audio-20261003/api"
    assert captured["lock_path"] == f["root"] / "review-artifacts/.guided-audio-api.lock"
    assert not captured["commit"] and captured["provider"] is None
    assert not captured["directory"].exists() and not captured["lock_path"].exists()


def test_commit_refuses_uncommitted_manifest_before_provider(fixture, monkeypatch):
    f = fixture
    manifest_name = f["manifest_path"].relative_to(f["root"]).as_posix()
    assert manifest_name in {x["path"] for x in f["authority"]}
    def git_result(args, **kwargs):
        assert args[:2] == ["git", "show"]
        name = args[2].removeprefix("HEAD:")
        # No git process is actually launched by this test.
        return subprocess.CompletedProcess(args, 1 if name == manifest_name else 0,
            stdout=b"" if name == manifest_name else (f["root"] / name).read_bytes())
    monkeypatch.setattr(batch.subprocess, "run", git_result)
    with pytest.raises(batch.ERROR, match="not_checked_in"):
        batch.main([*f["argv"], "--commit", "--expected-input-sha256", f["fingerprint"]],
            repo_root=f["root"], provider_factory=forbid_provider)


def test_valid_commit_checks_source_code_and_manifest_before_provider(fixture, monkeypatch):
    f, events = fixture, []
    def check(root, evidence):
        assert {e["path"] for e in evidence} == {*batch.CODE_PATHS, batch.CONTRACT_PATH,
            f["manifest"]["sources"][0]["file"], f["manifest_path"].relative_to(f["root"]).as_posix()}
        events.append("HEAD")
    monkeypatch.setattr(batch, "checked_in", check)
    class Provider:
        def close(self): events.append("closed")
    def factory(key):
        assert events == ["HEAD"]; events.append("provider"); return Provider()
    def execute(plan, fingerprint, directory, **kwargs):
        assert plan["creditBudgetCeiling"] == 200000 and fingerprint == f["fingerprint"]
        assert directory == f["root"] / "review-artifacts/guided-audio-20261003/api"
        assert kwargs["lock_path"] == f["root"] / "review-artifacts/.guided-audio-api.lock"
        assert kwargs["commit"] and kwargs["limit"] == 1
        events.append("execute"); return {"mode": "stubbed"}
    monkeypatch.setattr(batch.campaign, "execute", execute)
    assert batch.main([*f["argv"], "--commit", "--limit", "1", "--expected-input-sha256", f["fingerprint"]],
        repo_root=f["root"], provider_factory=factory) == 0
    assert events == ["HEAD", "provider", "execute", "closed"]
