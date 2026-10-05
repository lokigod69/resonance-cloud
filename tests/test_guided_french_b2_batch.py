"""Offline French adapter tests. Real immutable lesson fixtures; all approval envelopes and receipts are synthetic. No provider calls."""
import copy
from decimal import Decimal
import importlib.util
import json
from pathlib import Path
import sqlite3
import subprocess

import pytest

HERE = Path(__file__).resolve().parent
CANDIDATE = HERE / "run_guided_french_b2_batch.py"
if not CANDIDATE.is_file():
    CANDIDATE = HERE.parent / "scripts/run_guided_french_b2_batch.py"
spec = importlib.util.spec_from_file_location("french_b2_candidate", CANDIDATE)
runner = importlib.util.module_from_spec(spec); spec.loader.exec_module(runner)
campaign = runner.campaign
REAL_EXPORT = runner.export_french


def save(root, name, value):
    path = root / name; path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes((json.dumps(value, ensure_ascii=False, indent=2) + "\n").encode("utf-8"))
    return {"file": name, "sha256": campaign.digest(path.read_bytes())}


@pytest.fixture(scope="session")
def real_reservations():
    # Exact committed authority bytes, never a generated or abbreviated substitute.
    name = "frontend/content-drafts/b1-2026-10/french-plan.json"
    raw = (runner.ROOT / name).read_bytes()
    prerequisites = json.loads((runner.ROOT / runner.LEDGER_PATH).read_bytes())
    return {"French": (raw, json.loads(raw))}, prerequisites


def synthetic_spec(target):
    assert target == "French"
    return json.loads((runner.ROOT / runner.CONTENT_ROOT / "french/specification.json").read_bytes())


def synthetic_source(entry, specification):
    assert entry["targetLanguage"] == "French"
    return json.loads((runner.ROOT / runner.CONTENT_ROOT / f"french/p{entry['pathNumber']}.json").read_bytes())


def voice_fixture(target):
    labels = runner.VOICE_LABELS[target]
    return {"method": "GET only", "providerVoices": [{"requestedId": runner.VOICES[target], "voice_id": runner.VOICES[target],
        "name": "SYNTHETIC TEST ONLY", "status": 200, "sharingRate": 1, "labels": dict(labels),
        "verified_languages": [{"language": labels["language"], "locale": runner.LOCALES[target], "accent": labels["accent"]}]}]}


@pytest.fixture
def bundle(tmp_path, monkeypatch, real_reservations):
    plans, prerequisites = real_reservations
    root = tmp_path; ledger = save(root, runner.LEDGER_PATH, prerequisites)
    entries, inputs, sources, specifications, voices = [], [], {}, {}, {}
    for target in runner.VOICES:
        specification = synthetic_spec(target)
        spec_binding = save(root, f"{runner.CONTENT_ROOT}/{target.lower()}/specification.json", specification)
        spec_binding["referenceName"] = "B2_FRENCH_P1_P2_AUTHORING_SPEC.json"
        name = f"frontend/content-drafts/b1-2026-10/{target.lower()}-plan.json"
        p = root / name; p.parent.mkdir(parents=True, exist_ok=True); p.write_bytes(plans[target][0])
        b1 = {"file": name, "sha256": campaign.digest(plans[target][0])}
        for binding in (spec_binding, b1, ledger): specifications[binding["file"]] = binding["sha256"]
        voices[target] = save(root, f"{target}-voice.json", voice_fixture(target))
        for number in (1, 2):
            entry = {"targetLanguage": target, "pathNumber": number, "reviewedVoiceId": runner.VOICES[target],
                "specification": spec_binding, "prerequisites": ledger, "b1Reservation": b1}
            source = synthetic_source(entry, specification)
            entry.update(save(root, f"{runner.CONTENT_ROOT}/{target.lower()}/p{number}.json", source))
            sources[entry["file"]] = entry["sha256"]; entries.append(entry)
            inputs.append({"entry": entry, "source": source, "specification": specification, "prerequisites": prerequisites, "b1Plan": plans[target][1],
                "specificationSource": (root / spec_binding["file"]).read_bytes().decode("utf-8"),
                "prerequisitesSource": (root / ledger["file"]).read_bytes().decode("utf-8")})
    manifest = {"schemaVersion": 1, "kind": "french-b2-content-manifest", "status": "reviewed-staged", "sources": entries, "voiceEvidence": voices}
    for name in ("fableReview", "independentReview"):
        review = {"schemaVersion": 1, "kind": name, "verdict": "PASS", "unresolvedFindings": 0, "coverage": "full-content-all-fields",
            "reviewedSources": sources, "reviewedSpecifications": specifications,
            "reviewer": {"id": "SYNTHETIC TEST ONLY", "kind": "independent-agent", "authorOfReviewedContent": False}}
        findings = [{"id": f"SYNTHETIC-{n}", "severity": "HIGH", "scope": "Synthetic publication-only hold"} for n in range(1, 4)]
        review.update(localTtsContentVerdict="PASS", unresolvedLocalTtsBlockers=[], publicationVerdict="REWORK", unresolvedPublicationFindings=findings)
        if name == "fableReview":
            review["model"] = "claude-fable-5-1"
            review["reviewChain"] = [{"exactEdits": 0, "rawReview": {"verdict": "PASS", "edits": [], "readThrough": [
                {"file": f"{Path(path).parent.name}-b2-{Path(path).name}", "lessonsRead": list(range(1, 11))} for path in sources]}}]
        else:
            review["rawReview"] = {"verdict": "REWORK", "localTtsContentVerdict": "PASS", "unresolvedLocalTtsBlockers": [],
                "publicationVerdict": "REWORK", "remainingPublicationFindings": findings}
        manifest[name] = save(root, f"{name}.json", review)
    path = root / "manifest.json"; save(root, path.name, manifest)
    monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "synthetic-runtime", "sha256": "0"*64}]})
    monkeypatch.setattr(runner, "code_evidence", lambda root: [{"path": "synthetic-code.py", "sha256": "0"*64}])
    def fake_export(root, inputs):
        return {"schemaVersion": 1, "projectionVersion": runner.VERSION,
            "rows": [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])],
            "sourceAuthority": [{"path": "synthetic-gate.ts", "sha256": "0"*64}],
            "runtimeAuthority": {"files": [{"path": "synthetic-node", "sha256": "0"*64}], "validatorBundleSha256": "a"*64, "corpusBundleSha256": "b"*64},
            "validation": {"validator": runner.GATE, "fullSpecification": True, "frozenAndReservedLedger": True, "passed": len(inputs)}}
    monkeypatch.setattr(runner, "export_french", fake_export)
    return root, path, manifest, inputs


def seal_execution(bundle):
    root, manifest, _, _ = bundle; plan, _ = runner.prepare_inputs(root, manifest)
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": 1, "voices": {
        voice: {"sharingRate": 1, "creditMultiplier": 1, "verification": "SYNTHETIC TEST ONLY"} for voice in runner.VOICES.values()}}}}
    save(root, "plan.json", plan); save(root, "rates.json", rates)
    review = {"schemaVersion": 1, "kind": "french-b2-execution-review", "verdict": "PASS", "unresolvedFindings": 0,
        "scope": "full-run-and-rates", "reviewer": {"id": "SYNTHETIC TEST ONLY", "kind": "independent-agent", "authorOfExecutionCode": False},
        **runner.review_bindings(plan, (root / "plan.json").read_bytes(), (root / "rates.json").read_bytes())}
    save(root, "review.json", review)
    return tuple(root / name for name in ("plan.json", "rates.json", "review.json"))


def test_real_two_path_gate_and_exact_projection(bundle):
    _, _, _, inputs = bundle
    result = REAL_EXPORT(runner.ROOT, inputs)
    assert len(result["rows"]) == 460
    assert result["rows"] == [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])]
    authority = {item["path"] for item in result["sourceAuthority"]}
    assert {runner.GATE, "frontend/src/data/guidedLessonsAuthoring.ts", "frontend/node_modules/zod/package.json", "frontend/package-lock.json"} <= authority
    assert len(result["runtimeAuthority"]["files"]) > 5
    assert len(result["runtimeAuthority"]["validatorBundleSha256"]) == 64
    assert len(result["runtimeAuthority"]["corpusBundleSha256"]) == 64


@pytest.mark.parametrize("mutation", ["language", "base_locale", "short_spec", "reserved_b1", "frozen_hash", "ledger_omission", "wrong_source_ledger", "wrong_ledger_label", "spec_disagrees", "terms", "all_turns", "speaker", "span", "french_punctuation", "extra_field"])
def test_real_gate_rejects_structural_or_authority_failure(bundle, mutation):
    inputs = copy.deepcopy(bundle[3]); item = inputs[0]
    lesson = item["source"]["lessons"][0]
    if mutation == "language": item["source"]["targetLanguage"] = "German"
    elif mutation == "base_locale": lesson["title"].pop("en")
    elif mutation == "short_spec": item["specification"]["paths"].pop()
    elif mutation == "reserved_b1": item["b1Plan"]["paths"].pop()
    elif mutation == "frozen_hash": item["prerequisites"][0]["activeCorpusSha256"] = "0"*64
    elif mutation == "ledger_omission": item["prerequisites"][0]["forbiddenTrophies"].pop()
    elif mutation == "wrong_source_ledger": item["source"]["specRef"]["ledgerSha256"] = item["entry"]["prerequisites"]["sha256"]
    elif mutation == "wrong_ledger_label": item["source"]["specRef"]["ledger"] = item["entry"]["prerequisites"]["file"]
    elif mutation == "spec_disagrees": item["specification"]["paths"][0]["lessons"][0]["trophyLemma"] = "different"
    elif mutation == "terms": lesson["terms"].pop()
    elif mutation == "all_turns": lesson["dialogue"].pop()
    elif mutation == "speaker": lesson["dialogue"][2]["speaker"] = "you"
    elif mutation == "span": lesson["build"]["framePrefix"] = lesson["build"]["framePrefix"].rstrip()
    elif mutation == "french_punctuation": lesson["dialogue"][2]["targetText"] += "!"
    else: lesson["unknownSpokenText"] = "No discarded field"
    with pytest.raises(campaign.CampaignError, match="french_b2_offline_validation_failed"):
        REAL_EXPORT(runner.ROOT, [item])


def test_complete_rows_and_actual_voice_profiles(bundle):
    root, manifest, _, _ = bundle; plan, authority = runner.prepare_inputs(root, manifest)
    assert plan["usageRows"] == 460 and len(plan["groups"]) == 2
    assert plan["publicationAuthorized"] is False and plan["level"] == "B2"
    assert runner.LEDGER_PATH in {item["path"] for item in authority}
    assert all(f"SYNTHETIC-{n}" in plan["publicationHolds"] for n in range(1, 4))
    assert [scope["review"] for scope in plan["contentReviewScopes"]] == ["fableReview", "independentReview"]
    assert all(len(scope["unresolvedPublicationFindings"]) == 3 and scope["evidence"]["sha256"] for scope in plan["contentReviewScopes"])
    for group in plan["groups"]:
        target = group["targetLanguage"]; profile = group["proposedVoiceProfile"]
        assert profile["provider_voice_id"] == runner.VOICES[target]
        assert profile["target_language_code"] == runner.CODES[target]
        assert profile["provider_model_id"] == "eleven_v4"
        assert "_b2_bright_p" in profile["voice_profile_key"]
        assert len(group["items"]) == 230
        assert sum("/dialogue/" in item["sourceCoordinate"]["sourcePointer"] for item in group["items"]) == 60
        assert sum("/terms/" in item["sourceCoordinate"]["sourcePointer"] for item in group["items"]) == 80
        assert sum(item["surface"] == "trophyExample" for item in group["items"]) == 10
        assert group["nativeVoiceVerification"]["verifiedGender"] == "female"


@pytest.mark.parametrize("kind", ["fableReview", "independentReview"])
@pytest.mark.parametrize("mutation", ["missing_local", "local_rework", "spoken_blockers", "boolean_zero", "missing_publication", "missing_findings", "bad_finding", "false_publication_pass", "raw_scope"])
def test_explicit_spoken_scope_and_publication_holds(bundle, kind, mutation):
    root, path, manifest, _ = bundle; name = manifest[kind]["file"]; review = json.loads((root / name).read_bytes())
    if mutation == "missing_local": review.pop("localTtsContentVerdict")
    elif mutation == "local_rework": review["localTtsContentVerdict"] = "REWORK"
    elif mutation == "spoken_blockers": review["unresolvedLocalTtsBlockers"] = ["SYNTHETIC BLOCKER"]
    elif mutation == "boolean_zero": review["unresolvedLocalTtsBlockers"] = False
    elif mutation == "missing_publication": review.pop("publicationVerdict")
    elif mutation == "missing_findings": review.pop("unresolvedPublicationFindings")
    elif mutation == "bad_finding": review["unresolvedPublicationFindings"] = ["SYNTHETIC"]
    elif mutation == "false_publication_pass": review["publicationVerdict"] = "PASS"
    elif kind == "fableReview": review["reviewChain"][0]["rawReview"]["readThrough"][0]["lessonsRead"] = [1]
    else: review["rawReview"]["localTtsContentVerdict"] = "REWORK"
    manifest[kind] = save(root, name, review); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["raw_blocker", "raw_boolean", "dropped_finding", "changed_finding", "raw_findings", "raw_publication"])
def test_independent_embedded_scope_matches_wrapper(bundle, mutation):
    root, path, manifest, _ = bundle; name = manifest["independentReview"]["file"]; review = json.loads((root / name).read_bytes())
    if mutation == "raw_blocker": review["rawReview"]["unresolvedLocalTtsBlockers"] = ["BLOCKER"]
    elif mutation == "raw_boolean": review["rawReview"]["unresolvedLocalTtsBlockers"] = False
    elif mutation == "dropped_finding": review["unresolvedPublicationFindings"].pop()
    elif mutation == "changed_finding": review["unresolvedPublicationFindings"][0]["scope"] = "Changed"
    elif mutation == "raw_findings": review["rawReview"]["remainingPublicationFindings"] = []
    else: review["rawReview"]["publicationVerdict"] = "PASS"
    manifest["independentReview"] = save(root, name, review); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("kind", ["fableReview", "independentReview"])
@pytest.mark.parametrize("mutation", ["verdict", "source", "spec", "coverage", "boolean_count", "model_or_author"])
def test_review_envelope_semantics_not_outer_hash(bundle, kind, mutation):
    root, path, manifest, _ = bundle
    name = manifest[kind]["file"]; envelope = json.loads((root / name).read_bytes())
    if mutation == "verdict": envelope["verdict"] = "REWORK"
    elif mutation == "source": envelope["reviewedSources"] = {}
    elif mutation == "spec": envelope["reviewedSpecifications"] = {}
    elif mutation == "coverage": envelope["coverage"] = "plan-only"
    elif mutation == "boolean_count": envelope["unresolvedFindings"] = False
    elif kind == "fableReview": envelope["model"] = "wrong-model"
    else: envelope["reviewer"]["authorOfReviewedContent"] = True
    manifest[kind] = save(root, name, envelope); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


def test_changed_publication_scope_invalidates_saved_plan(bundle):
    root, path, manifest, _ = bundle; plan_path, rates_path, review_path = seal_execution(bundle)
    for kind in ("fableReview", "independentReview"):
        name = manifest[kind]["file"]; review = json.loads((root / name).read_bytes())
        review["unresolvedPublicationFindings"][0]["scope"] = "Revised synthetic hold"
        if kind == "independentReview": review["rawReview"]["remainingPublicationFindings"] = copy.deepcopy(review["unresolvedPublicationFindings"])
        manifest[kind] = save(root, name, review)
    save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError, match="rebuilt_plan_mismatch"):
        runner.load_inputs(root, path, plan_path, rates_path, review_path)


@pytest.mark.parametrize("mutation", ["duplicate", "unknown", "path", "source", "spec", "ledger", "reservation"])
def test_exact_source_and_authority_manifest(bundle, mutation):
    root, path, manifest, _ = bundle; entry = manifest["sources"][0]
    if mutation == "duplicate": manifest["sources"][1] = copy.deepcopy(entry)
    elif mutation == "unknown": entry["targetLanguage"] = "German"
    elif mutation == "path": entry["file"] = "../outside.json"
    else:
        key = {"spec": "specification", "ledger": "prerequisites", "reservation": "b1Reservation"}.get(mutation)
        (root / (entry[key]["file"] if key else entry["file"])).write_bytes(b"{}")
    save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["drop_terms", "spoof_target", "duplicate", "wrong_text", "bundle_hash"])
def test_exporter_cannot_omit_or_spoof_speech(bundle, monkeypatch, mutation):
    root, path, _, _ = bundle; original = runner.export_french
    def export(root, inputs):
        result = original(root, inputs)
        if mutation == "drop_terms": result["rows"] = [row for row in result["rows"] if "/terms/" not in row["sourcePointer"]]
        elif mutation == "spoof_target": result["rows"][0]["targetLanguage"] = "German"
        elif mutation == "duplicate": result["rows"].append(result["rows"][0])
        elif mutation == "wrong_text": result["rows"][0]["text"] += " changed"
        else: result["runtimeAuthority"].pop("validatorBundleSha256")
        return result
    monkeypatch.setattr(runner, "export_french", export)
    with pytest.raises(campaign.CampaignError, match="complete_french_b2_projection_required"): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("target", ["French"])
@pytest.mark.parametrize("mutation", ["locale", "gender", "language", "id"])
def test_true_voice_locale_gender_and_identity(bundle, target, mutation):
    root, path, manifest, _ = bundle; evidence = voice_fixture(target); voice = evidence["providerVoices"][0]
    if mutation == "locale": voice["verified_languages"][0]["locale"] = "fr-CA"
    elif mutation == "gender": voice["labels"]["gender"] = "male"
    elif mutation == "language": voice["labels"]["language"] = "de"
    else: voice["voice_id"] = "wrong"
    manifest["voiceEvidence"][target] = save(root, f"{target}-voice.json", evidence); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError, match="verified_french_voice_evidence_required"): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["plan_bytes", "rates_bytes", "review", "fingerprint", "missing_expected", "head", "runtime"])
def test_execution_boundary_before_provider_or_ledger(bundle, monkeypatch, mutation):
    root, manifest, _, _ = bundle; plan, rates, review = seal_execution(bundle)
    _, fingerprint, _ = runner.load_inputs(root, manifest, plan, rates, review)
    if mutation == "plan_bytes": plan.write_bytes(plan.read_bytes() + b" ")
    elif mutation == "rates_bytes": rates.write_bytes(rates.read_bytes() + b" ")
    elif mutation == "review":
        value = json.loads(review.read_bytes()); value["scope"] = "pilot-only"; save(root, review.name, value)
    elif mutation == "fingerprint": fingerprint = "0"*64
    elif mutation == "missing_expected": fingerprint = None
    elif mutation == "head": monkeypatch.setattr(runner.shared, "checked_in", lambda *a: (_ for _ in ()).throw(ValueError("HEAD mismatch")))
    else: monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "changed", "sha256": "1"*64}]})
    monkeypatch.setattr(runner.ceb, "require_existing_campaign", lambda *a: pytest.fail("ledger reached"))
    argv = ["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review), "--commit"]
    if fingerprint: argv += ["--expected-input-sha256", fingerprint]
    with pytest.raises((campaign.CampaignError, ValueError)):
        runner.main(argv, repo_root=root, provider_factory=lambda *a: pytest.fail("provider constructed"))


def test_dry_run_has_no_provider_or_ledger(bundle):
    root, manifest, _, _ = bundle; plan, rates, review = seal_execution(bundle)
    assert runner.main(["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review)],
        repo_root=root, provider_factory=lambda *a: pytest.fail("provider constructed")) == 0
    assert not (root / runner.API_DIRECTORY).exists() and not (root / runner.LOCK_PATH).exists()


def seed(root, anchor=runner.CAMPAIGN_ANCHOR, charged="1"):
    directory = root / runner.API_DIRECTORY; local = campaign.Campaign(directory, anchor)
    audio = b"SYNTHETIC OLD AUDIO"; identity = {"cache_key": "old", "voice_id": "synthetic", "model_id": "eleven_v4", "text": "test", "settings": campaign.V4_SETTINGS}
    with local.db:
        local.db.execute("INSERT INTO requests(key,identity,manifest_fingerprint,state,reserved,charged,request_id,status,mime,audio,audio_hash) VALUES('old',?,?,'ready',1,?,'synthetic-old',200,'audio/mpeg',?,?)",
            (campaign.canonical(identity), anchor, charged, audio, campaign.digest(audio)))
    (directory / "old.mp3").write_bytes(audio); local.db.close(); return directory


@pytest.mark.parametrize("condition", ["missing", "anchor", "zero_charge"])
def test_established_campaign_guard(tmp_path, condition):
    if condition != "missing": seed(tmp_path, "0"*64 if condition == "anchor" else runner.CAMPAIGN_ANCHOR, "0" if condition == "zero_charge" else "1")
    with pytest.raises(campaign.CampaignError): runner.ceb.require_existing_campaign(tmp_path)
    if condition == "missing": assert not (tmp_path / runner.API_DIRECTORY).exists()


def test_shared_receipt_is_durable_before_decode_and_never_retried(bundle):
    root, manifest, _, _ = bundle; plan, _ = runner.prepare_inputs(root, manifest); directory = seed(root); calls = []
    class Provider:
        def preflight(self, pairs, *args): return {pair: Decimal(1) for pair in pairs}
        def synthesize(self, request):
            calls.append(request); return campaign.Receipt(b"SYNTHETIC BAD AUDIO", 200, "synthetic-new", Decimal(1), "audio/mpeg")
    def decoder(audio, mime):
        with sqlite3.connect(directory / "campaign.sqlite3") as db:
            assert db.execute("SELECT state,audio,charged FROM requests WHERE request_id='synthetic-new'").fetchone() == ("received", audio, "1")
        raise ValueError("synthetic decoder failure")
    for reason in ("audio_validation_or_delivery_failed", "explicit_reconciliation_required"):
        with pytest.raises(campaign.CampaignError, match=reason): campaign.execute(plan, "f"*64, directory,
            provider=runner.ceb.ExistingCampaignProvider(root, Provider()), rate_evidence={"mode": "receipt-verified"},
            commit=True, limit=1, decoder=decoder, lock_path=root / runner.LOCK_PATH)
    assert len(calls) == 1


def test_existing_cap_and_os_lock(bundle):
    root, manifest, _, _ = bundle; plan, _ = runner.prepare_inputs(root, manifest); directory = seed(root, charged="199999")
    class Provider:
        def preflight(self, pairs, *args): return {pair: Decimal(1) for pair in pairs}
        def synthesize(self, request): pytest.fail("cap exceeded")
    args = dict(provider=runner.ceb.ExistingCampaignProvider(root, Provider()), rate_evidence={"mode": "receipt-verified"}, commit=True, decoder=lambda *a: None, lock_path=root / runner.LOCK_PATH)
    with campaign.run_lock(root / runner.LOCK_PATH):
        with pytest.raises(campaign.CampaignError, match="another_run_is_active"): campaign.execute(plan, "f"*64, directory, **args)
    with pytest.raises(campaign.CampaignError, match="campaign_cap_exceeded"): campaign.execute(plan, "f"*64, directory, **args)
    with sqlite3.connect(directory / "campaign.sqlite3") as db:
        assert db.execute("SELECT cap FROM campaign").fetchone() == (200000,)
        assert db.execute("SELECT COUNT(*) FROM requests").fetchone() == (1,)


@pytest.mark.parametrize("mutation", ["pilot", "v2", "extra_voice", "discount"])
def test_full_run_rates_only(bundle, mutation):
    root, manifest, _, _ = bundle; _, rates_path, _ = seal_execution(bundle); plan, _ = runner.prepare_inputs(root, manifest)
    rates = json.loads(rates_path.read_bytes()); model = rates["models"]["eleven_v4"]
    if mutation == "pilot": rates["mode"] = "pilot"
    elif mutation == "v2": rates["models"]["eleven_multilingual_v2"] = model
    elif mutation == "extra_voice": model["voices"]["unexpected"] = {}
    else: model["voices"][runner.VOICES["French"]]["creditMultiplier"] = "0.5"
    with pytest.raises(campaign.CampaignError): runner.validate_rates(rates, plan)


@pytest.mark.parametrize("target", ["French"])
def test_positive_same_voice_model_receipt_required(target):
    voice = runner.VOICES[target]
    class Offline(campaign.ElevenLabsTransport):
        def __init__(self): pass
        def _read(self, path):
            return [{"model_id": "eleven_v4", "can_do_text_to_speech": True, "model_rates": {"character_cost_multiplier": 1}}] if path == "models" else {"voice_id": voice, "sharing": {"rate": 1}}
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": 1,
        "voices": {voice: {"sharingRate": 1, "creditMultiplier": 1, "verification": "SYNTHETIC TEST ONLY"}}}}}
    for receipt in ([], [{"voice_id": voice, "model_id": "eleven_v4", "text": "test", "charged": "0"}], [{"voice_id": "wrong", "model_id": "eleven_v4", "text": "test", "charged": "1"}]):
        with pytest.raises(campaign.CampaignError, match="matching_voice_model_receipt_required"): Offline().preflight({(voice, "eleven_v4")}, rates, receipt)
    assert Offline().preflight({(voice, "eleven_v4")}, rates, [{"voice_id": voice, "model_id": "eleven_v4", "text": "test", "charged": "1"}]) == {(voice, "eleven_v4"): Decimal(1)}


def test_actual_imported_helper_closure_is_bound():
    code = runner.code_evidence(runner.ROOT)
    paths = {item["path"] for item in code}
    assert {"scripts/run_guided_native_b1_batch.py", "scripts/export_guided_native_b1.mjs",
        "scripts/run_guided_cebuano_refresh_v4.py", "scripts/guided_refresh_v2.py", "scripts/plan_guided_b1_drafts.py",
        "src/services/guided_tts/campaign.py", "src/services/guided_tts/inventory.py"} <= paths
    assert str(CANDIDATE.resolve()) in paths or "scripts/run_guided_french_b2_batch.py" in paths
    assert all(len(item["sha256"]) == 64 for item in code)


def test_missing_campaign_stops_main_before_provider(bundle, monkeypatch):
    root, manifest, _, _ = bundle; paths = seal_execution(bundle)
    _, fingerprint, _ = runner.load_inputs(root, manifest, *paths)
    monkeypatch.setattr(runner.shared, "checked_in", lambda *args: None)
    argv = ["--manifest", str(manifest), "--plan", str(paths[0]), "--rates", str(paths[1]), "--review", str(paths[2]),
        "--commit", "--expected-input-sha256", fingerprint]
    with pytest.raises(campaign.CampaignError, match="existing_campaign_required"):
        runner.main(argv, repo_root=root, provider_factory=lambda *args: pytest.fail("provider constructed"))
    assert not (root / runner.API_DIRECTORY).exists()


def test_head_equality_uses_actual_authority_bytes(tmp_path, monkeypatch):
    path = tmp_path / "authority.json"; path.write_bytes(b"reviewed bytes\n")
    item = {"path": path.name, "sha256": campaign.digest(path.read_bytes())}
    class Result:
        returncode = 0
        stdout = b"different HEAD bytes\n"
    monkeypatch.setattr(runner.shared.subprocess, "run", lambda *args, **kwargs: Result())
    with pytest.raises(ValueError, match="source_or_code_not_checked_in"): runner.shared.checked_in(tmp_path, [item])
    Result.stdout = path.read_bytes(); runner.shared.checked_in(tmp_path, [item])
    path.write_bytes(b"changed after inspection\n")
    with pytest.raises(ValueError, match="authority_bytes_changed"): runner.shared.checked_in(tmp_path, [item])

@pytest.mark.parametrize("mutation", ["spec_bytes", "spec_parsed", "prerequisite_bytes", "prerequisite_parsed", "spec_hash", "reference_label", "original_hash", "fake_valid_spec"])
def test_exact_original_authority_survives_only_line_endings(bundle, mutation):
    inputs = copy.deepcopy(bundle[3]); item = inputs[0]
    if mutation == "spec_bytes": item["specificationSource"] += " "
    elif mutation == "spec_parsed": item["specification"]["status"] = "different"
    elif mutation == "prerequisite_bytes": item["prerequisitesSource"] += " "
    elif mutation == "prerequisite_parsed": item["prerequisites"][0]["frozenLessonCount"] += 1
    elif mutation == "spec_hash": item["entry"]["specification"]["sha256"] = "0"*64
    elif mutation == "reference_label": item["entry"]["specification"]["referenceName"] = "unrelated.json"
    elif mutation == "original_hash": item["source"]["specRef"]["pathSpecSha256"] = item["entry"]["specification"]["sha256"]
    else:
        item["specification"]["paths"][0]["title"] = "Invented same-shape authority"
        item["specificationSource"] = json.dumps(item["specification"], ensure_ascii=False)
        item["entry"]["specification"]["sha256"] = campaign.digest(item["specificationSource"].encode("utf-8"))
    with pytest.raises(campaign.CampaignError, match="french_b2_offline_validation_failed"):
        REAL_EXPORT(runner.ROOT, [item])


def test_crlf_original_and_lf_staging_have_identical_semantics(bundle):
    inputs = copy.deepcopy(bundle[3])
    for item in inputs:
        item["specificationSource"] = item["specificationSource"].replace("\r\n", "\n").replace("\n", "\r\n")
        item["entry"]["specification"]["sha256"] = campaign.digest(item["specificationSource"].encode("utf-8"))
    result = REAL_EXPORT(runner.ROOT, inputs)
    assert len(result["rows"]) == 460
