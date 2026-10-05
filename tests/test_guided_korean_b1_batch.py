"""Offline Korean adapter checks. Every approval/receipt fixture is synthetic."""
import copy
from decimal import Decimal
import importlib.util
import json
from pathlib import Path
import sqlite3

import pytest

HERE = Path(__file__).resolve().parent
CANDIDATE = HERE / "run_guided_korean_b1_batch.py"
if not CANDIDATE.is_file(): CANDIDATE = HERE.parent / "scripts/run_guided_korean_b1_batch.py"
spec = importlib.util.spec_from_file_location("korean_b1_candidate", CANDIDATE)
runner = importlib.util.module_from_spec(spec); spec.loader.exec_module(runner)
campaign = runner.campaign
REAL_EXPORT = runner.export_korean


def save(root, name, value):
    path = root / name; path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"file": name, "sha256": campaign.digest(path.read_bytes())}


def synthetic_spec():
    return {"status": "architect-spec", "targetLanguage": "Korean", "targetLanguageCode": "ko-KR", "paths": [
        {"pathNumber": p+1, "lessons": [{"number": n+1, "trophy": "실험단어" + chr(0xac00+p*10+n), "beat": "SYNTHETIC TEST ONLY"} for n in range(10)]} for p in range(10)]}


def synthetic_source(number, specification, *, digits=False):
    base = {"de": "Künstliche Testdaten", "en": "Synthetic test only"}
    translated = lambda text: {"targetText": text, "baseText": dict(base)}
    lessons = []
    for index in range(10):
        trophy = specification["paths"][number-1]["lessons"][index]["trophy"]
        day = "15일에" if digits else "오늘"
        chunks = [day, trophy, "내용을 다시 보면서", "천천히 설명했어요."]
        first = " ".join(chunks); second = "그래서 내용을 정리하고 내일 다시 확인하려고 해요."
        opening = "오늘 새로운 내용을 어떻게 정리했어요?"
        lessons.append({"slug": f"synthetic-{chr(97+index)}", "title": dict(base), "situation": dict(base), "pedagogicalGoal": "Synthetic test only",
            "register": "neutral", "dialogue": list(map(translated, [opening, first, "그다음에는 새로운 내용을 다시 확인했어요?", second])),
            "pattern": {"label": "Synthetic test only", "rule": dict(base), "examples": [dict(translated(first), highlight=trophy), dict(translated(second), highlight="정리하고")]},
            "cloze": [{"kind": "connector", "answer": "그래서", "choices": ["그래서", "그러면", "하지만", "그런데"]}, " 내용을 ",
                {"kind": "choice", "answer": "정리하고", "choices": ["정리하고", "확인하고", "연습하고", "선택하고"]}, " 내일 다시 확인하려고 해요."],
            "chunks": list(map(translated, chunks)), "terms": list(map(translated, [trophy, "내용", "오늘", "다시", "천천히", "설명"])),
            "recall": {"before": day + " ", "answer": trophy, "after": " 내용을 다시 보면서 천천히 설명했어요.", "fallbackChoices": [trophy, "다음", "설명", "연습"]},
            "speakRequired": [trophy, "내용을", "천천히"], "sceneCaption": {"de": f'Hier: „{opening}“', "en": f'Here: “{opening}”'},
            "trophyWord": {"word": trophy, "meaning": dict(base), "example": first, "whyThisWord": dict(base)},
            "distractors": ["먼저 가세요", "늦게 와요"], "placeholderCaption": dict(base), "songMood": "Synthetic", "visualNotes": "Synthetic"})
    return {"schemaVersion": 1, "status": "draft", "level": "B1", "targetLanguage": "Korean", "targetLanguageCode": "ko-KR",
        "baseLanguage": "German", "pathNumber": number, "title": dict(base), "subtitle": dict(base), "anchor": "SYNTHETIC TEST ONLY", "lessons": lessons}


def voice_fixture():
    return {"method": "GET only", "providerVoices": [{"requestedId": runner.VOICE_ID, "voice_id": runner.VOICE_ID,
        "name": "SYNTHETIC TEST ONLY", "status": 200, "sharingRate": 1,
        "labels": {"language": "ko", "gender": "female", "accent": "standard"},
        "verified_languages": [{"language": "ko", "locale": "ko-KR", "accent": "standard"}]}]}


@pytest.fixture
def bundle(tmp_path, monkeypatch):
    root = tmp_path; specification = synthetic_spec()
    spec_binding = save(root, f"{runner.CONTENT_ROOT}/specification.json", specification)
    sources, inputs, entries = {}, [], []
    for number in (1, 2):
        source = synthetic_source(number, specification, digits=True)
        entry = {**save(root, f"{runner.CONTENT_ROOT}/p{number}.json", source), "targetLanguage": "Korean", "pathNumber": number,
            "reviewedVoiceId": runner.VOICE_ID, "specification": spec_binding}
        sources[entry["file"]] = entry["sha256"]; entries.append(entry); inputs.append({"entry": entry, "source": source, "specification": specification})
    manifest = {"schemaVersion": 1, "kind": "korean-b1-content-manifest", "status": "reviewed-staged", "sources": entries,
        "voiceEvidence": {"Korean": save(root, "voice.json", voice_fixture())}}
    for name in ("fableReview", "independentReview"):
        review = {"schemaVersion": 1, "kind": name, "verdict": "PASS", "unresolvedFindings": 0, "coverage": "full-content-all-fields",
            "reviewedSources": sources, "reviewedSpecifications": {spec_binding["file"]: spec_binding["sha256"]},
            "reviewer": {"id": "SYNTHETIC TEST ONLY", "kind": "independent-agent", "authorOfReviewedContent": False}}
        findings = [{"id": f"SYNTHETIC-{n}", "severity": "MEDIUM", "scope": "Synthetic publication-only hold"} for n in range(1, 4)]
        review.update(localTtsContentVerdict="PASS", unresolvedLocalTtsBlockers=[], publicationVerdict="REWORK", unresolvedPublicationFindings=findings)
        if name == "fableReview":
            review["model"] = "claude-fable-5-1"
            review["exactReplayEdits"] = 0
            review["rawReview"] = {"verdict": "PASS", "edits": [], "readThrough": [
                {"file": f"korean-p{n}.json", "lessonsRead": list(range(1, 11))} for n in (1, 2)]}
        else:
            review["rawReview"] = {"verdict": "REWORK", "localTtsContentVerdict": "PASS", "unresolvedLocalTtsBlockers": [],
                "publicationVerdict": "REWORK", "findings": findings, "remainingPublicationFindings": [f["id"] for f in findings],
                "fullCoverage": {"personallyReadEveryField": True}}
        manifest[name] = save(root, f"{name}.json", review)
    path = root / "manifest.json"; save(root, path.name, manifest)
    monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "synthetic-runtime", "sha256": "0"*64}]})
    monkeypatch.setattr(runner, "code_evidence", lambda root: [{"path": "synthetic-code.py", "sha256": "0"*64}])
    def fake_export(root, inputs):
        return {"schemaVersion": 1, "projectionVersion": runner.VERSION,
            "rows": [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])],
            "sourceAuthority": [{"path": "synthetic-gate.ts", "sha256": "0"*64}],
            "runtimeAuthority": {"files": [{"path": "synthetic-node", "sha256": "0"*64}], "validatorBundleSha256": "a"*64},
            "validation": {"validator": runner.GATE, "fullKoreanSpecification": True, "passed": len(inputs)}}
    monkeypatch.setattr(runner, "export_korean", fake_export)
    return root, path, manifest, inputs


def seal_execution(bundle):
    root, manifest, _, _ = bundle; plan, _ = runner.prepare_inputs(root, manifest)
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": 1, "voices": {
        runner.VOICE_ID: {"sharingRate": 1, "creditMultiplier": 1, "verification": "SYNTHETIC TEST ONLY"}}}}}
    save(root, "plan.json", plan); save(root, "rates.json", rates)
    review = {"schemaVersion": 1, "kind": "korean-b1-execution-review", "verdict": "PASS", "unresolvedFindings": 0,
        "scope": "full-run-and-rates", "reviewer": {"id": "SYNTHETIC TEST ONLY", "kind": "independent-agent", "authorOfExecutionCode": False},
        **runner.review_bindings(plan, (root / "plan.json").read_bytes(), (root / "rates.json").read_bytes())}
    save(root, "review.json", review); return tuple(root / name for name in ("plan.json", "rates.json", "review.json"))


def test_actual_pending_drafts_and_full_spec_real_gate_without_content_approval():
    work = runner.ROOT / runner.CONTENT_ROOT
    specification = json.loads((work / "specification.json").read_bytes()); inputs = []
    for number in (1, 2):
        path = work / f"p{number}.json"; raw = path.read_bytes()
        inputs.append({"entry": {"file": path.name, "sha256": campaign.digest(raw), "targetLanguage": "Korean", "pathNumber": number},
            "source": json.loads(raw), "specification": specification})
    result = REAL_EXPORT(runner.ROOT, inputs)
    assert result["rows"] == [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])]
    assert len(result["rows"]) > 300
    assert sum("/dialogue/" in row["sourcePointer"] for row in result["rows"]) == 80
    assert sum(row["playbackSurface"] == "trophyExample" for row in result["rows"]) == 20
    paths = {item["path"] for item in result["sourceAuthority"]}
    assert {runner.GATE, "frontend/node_modules/zod/package.json", "frontend/src/data/guidedLessonsAuthoring.ts", "frontend/package-lock.json"} <= paths
    assert len(result["runtimeAuthority"]["validatorBundleSha256"]) == 64
    assert len(result["runtimeAuthority"]["files"]) > 5


def test_real_gate_synthetic_two_paths_permit_digits(bundle):
    inputs = bundle[3]; result = REAL_EXPORT(runner.ROOT, inputs)
    assert len(result["rows"]) == 360
    assert result["rows"] == [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])]
    assert any("15일에" in row["text"] for row in result["rows"])


@pytest.mark.parametrize("mutation", ["language", "locale", "short_spec", "allocation", "duplicates", "latin", "jamo", "spacing", "self_honorific", "dropped_terms", "cloze_fragment", "extra_field"])
def test_real_korean_gate_rejects_adversarial_source(bundle, mutation):
    item = copy.deepcopy(bundle[3][0]); source = item["source"]; lesson = source["lessons"][0]
    if mutation == "language": source["targetLanguage"] = "Indonesian"
    elif mutation == "locale": source["targetLanguageCode"] = "id-ID"
    elif mutation == "short_spec": item["specification"]["paths"].pop()
    elif mutation == "allocation": item["specification"]["paths"][0]["lessons"][0]["trophy"] = "다른단어"
    elif mutation == "duplicates": item["specification"]["paths"][9]["lessons"][9]["trophy"] = item["specification"]["paths"][0]["lessons"][0]["trophy"]
    elif mutation == "latin": lesson["terms"][0]["targetText"] = "romanization"
    elif mutation == "jamo": lesson["terms"][0]["targetText"] = "ㄱㅏ"
    elif mutation == "spacing": lesson["dialogue"][1]["targetText"] = lesson["dialogue"][1]["targetText"].replace(" ", "  ", 1)
    elif mutation == "self_honorific": lesson["pattern"]["examples"][1]["targetText"] = "제가 내일 가세요."
    elif mutation == "dropped_terms": lesson["terms"].pop()
    elif mutation == "cloze_fragment": lesson["cloze"][2]["answer"] = "리하고"
    else: lesson["unknownSpokenText"] = "알아요."
    with pytest.raises(campaign.CampaignError, match="korean_b1_offline_validation_failed"): REAL_EXPORT(runner.ROOT, [item])


def test_complete_plan_profiles_and_no_text_rewrite(bundle):
    root, manifest, _, _ = bundle; plan, authority = runner.prepare_inputs(root, manifest)
    assert plan["usageRows"] == 360 and len(plan["groups"]) == 2 and plan["publicationAuthorized"] is False
    for group in plan["groups"]:
        profile = group["proposedVoiceProfile"]
        assert profile["provider_voice_id"] == runner.VOICE_ID and profile["target_language_code"] == "ko" and profile["provider_model_id"] == "eleven_v4"
        assert profile["voice_profile_key"].startswith("korean_b1_bright_p")
        assert group["nativeVoiceVerification"]["verifiedLocale"] == "ko-KR"
        assert len(group["items"]) == 180
        assert sum("/terms/" in row["sourceCoordinate"]["sourcePointer"] for row in group["items"]) == 60
        assert all(row["source_text"] == row["normalized_text"] for row in group["items"])
    assert f"{runner.CONTENT_ROOT}/specification.json" in {item["path"] for item in authority}
    assert all(f"SYNTHETIC-{n}" in plan["publicationHolds"] for n in range(1, 4))
    assert [scope["review"] for scope in plan["contentReviewScopes"]] == ["fableReview", "independentReview"]
    assert all(len(scope["unresolvedPublicationFindings"]) == 3 and scope["evidence"]["sha256"] for scope in plan["contentReviewScopes"])


@pytest.mark.parametrize("kind", ["fableReview", "independentReview"])
@pytest.mark.parametrize("mutation", ["missing_local", "local_rework", "spoken_blockers", "boolean_zero", "missing_publication", "missing_findings", "bad_finding", "false_publication_pass", "raw_scope"])
def test_explicit_scoped_content_approval(bundle, kind, mutation):
    root, path, manifest, _ = bundle; name = manifest[kind]["file"]; review = json.loads((root / name).read_bytes())
    if mutation == "missing_local": review.pop("localTtsContentVerdict")
    elif mutation == "local_rework": review["localTtsContentVerdict"] = "REWORK"
    elif mutation == "spoken_blockers": review["unresolvedLocalTtsBlockers"] = ["SYNTHETIC BLOCKER"]
    elif mutation == "boolean_zero": review["unresolvedLocalTtsBlockers"] = False
    elif mutation == "missing_publication": review.pop("publicationVerdict")
    elif mutation == "missing_findings": review.pop("unresolvedPublicationFindings")
    elif mutation == "bad_finding": review["unresolvedPublicationFindings"] = ["SYNTHETIC"]
    elif mutation == "false_publication_pass": review["publicationVerdict"] = "PASS"
    elif kind == "fableReview": review["rawReview"]["readThrough"][0]["lessonsRead"] = [1]
    else: review["rawReview"]["localTtsContentVerdict"] = "REWORK"
    manifest[kind] = save(root, name, review); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["raw_blocker", "raw_boolean", "dropped_finding", "changed_finding", "raw_findings", "raw_ids", "raw_coverage"])
def test_independent_raw_scope_matches_wrapper(bundle, mutation):
    root, path, manifest, _ = bundle; name = manifest["independentReview"]["file"]; review = json.loads((root / name).read_bytes())
    if mutation == "raw_blocker": review["rawReview"]["unresolvedLocalTtsBlockers"] = ["BLOCKER"]
    elif mutation == "raw_boolean": review["rawReview"]["unresolvedLocalTtsBlockers"] = False
    elif mutation == "dropped_finding": review["unresolvedPublicationFindings"].pop()
    elif mutation == "changed_finding": review["unresolvedPublicationFindings"][0]["scope"] = "Changed"
    elif mutation == "raw_findings": review["rawReview"]["findings"] = []
    elif mutation == "raw_ids": review["rawReview"]["remainingPublicationFindings"] = []
    else: review["rawReview"]["fullCoverage"]["personallyReadEveryField"] = False
    manifest["independentReview"] = save(root, name, review); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


def test_changed_scoped_findings_invalidate_saved_plan(bundle):
    root, path, manifest, _ = bundle; plan_path, rates_path, review_path = seal_execution(bundle)
    for kind in ("fableReview", "independentReview"):
        name = manifest[kind]["file"]; review = json.loads((root / name).read_bytes())
        review["unresolvedPublicationFindings"][0]["scope"] = "Revised synthetic hold"
        if kind == "independentReview": review["rawReview"]["findings"] = copy.deepcopy(review["unresolvedPublicationFindings"])
        manifest[kind] = save(root, name, review)
    save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError, match="rebuilt_plan_mismatch"):
        runner.load_inputs(root, path, plan_path, rates_path, review_path)


@pytest.mark.parametrize("kind", ["fableReview", "independentReview"])
@pytest.mark.parametrize("mutation", ["verdict", "source", "spec", "coverage", "boolean_count", "model_or_author"])
def test_actual_review_envelope_required(bundle, kind, mutation):
    root, path, manifest, _ = bundle; name = manifest[kind]["file"]; review = json.loads((root / name).read_bytes())
    if mutation == "verdict": review["verdict"] = "REWORK"
    elif mutation == "source": review["reviewedSources"] = {}
    elif mutation == "spec": review["reviewedSpecifications"] = {}
    elif mutation == "coverage": review["coverage"] = "spoken-only"
    elif mutation == "boolean_count": review["unresolvedFindings"] = False
    elif kind == "fableReview": review["model"] = "wrong-model"
    else: review["reviewer"]["authorOfReviewedContent"] = True
    manifest[kind] = save(root, name, review); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["duplicate", "third_path", "boolean_scope", "traversal", "source_bytes", "spec_bytes"])
def test_exact_manifest_sources(bundle, mutation):
    root, path, manifest, _ = bundle; entry = manifest["sources"][0]
    if mutation == "duplicate": manifest["sources"][1] = copy.deepcopy(entry)
    elif mutation == "third_path": entry["pathNumber"] = 3
    elif mutation == "boolean_scope": entry["pathNumber"] = True
    elif mutation == "traversal": entry["file"] = "../outside.json"
    else: (root / (entry["file"] if mutation == "source_bytes" else entry["specification"]["file"])).write_bytes(b"{}")
    save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["drop_terms", "spoof_language", "rewrite_digits", "join_eojeol", "bundle_hash"])
def test_no_filtered_or_rewritten_projection(bundle, monkeypatch, mutation):
    root, path, _, _ = bundle; original = runner.export_korean
    def export(root, inputs):
        value = original(root, inputs)
        if mutation == "drop_terms": value["rows"] = [row for row in value["rows"] if "/terms/" not in row["sourcePointer"]]
        elif mutation == "spoof_language": value["rows"][0]["targetLanguage"] = "Indonesian"
        elif mutation == "rewrite_digits": value["rows"][1]["text"] = value["rows"][1]["text"].replace("15일에", "십오일에")
        elif mutation == "join_eojeol": value["rows"][1]["text"] = value["rows"][1]["text"].replace(" ", "", 1)
        else: value["runtimeAuthority"].pop("validatorBundleSha256")
        return value
    monkeypatch.setattr(runner, "export_korean", export)
    with pytest.raises(campaign.CampaignError, match="complete_korean_projection_required"): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["locale", "gender", "language", "id", "rate"])
def test_exact_jini_evidence(bundle, mutation):
    root, path, manifest, _ = bundle; evidence = voice_fixture(); voice = evidence["providerVoices"][0]
    if mutation == "locale": voice["verified_languages"][0]["locale"] = None
    elif mutation == "gender": voice["labels"]["gender"] = "male"
    elif mutation == "language": voice["labels"]["language"] = "ja"
    elif mutation == "id": voice["voice_id"] = "other"
    else: voice["sharingRate"] = True
    manifest["voiceEvidence"]["Korean"] = save(root, "voice.json", evidence); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError, match="verified_jini_voice_evidence_required"): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["plan_bytes", "rates_bytes", "review_kind", "fingerprint", "missing_expected", "head", "runtime"])
def test_execution_gate_precedes_provider_and_ledger(bundle, monkeypatch, mutation):
    root, manifest, _, _ = bundle; plan, rates, review = seal_execution(bundle); _, fingerprint, _ = runner.load_inputs(root, manifest, plan, rates, review)
    if mutation == "plan_bytes": plan.write_bytes(plan.read_bytes() + b" ")
    elif mutation == "rates_bytes": rates.write_bytes(rates.read_bytes() + b" ")
    elif mutation == "review_kind":
        value = json.loads(review.read_bytes()); value["kind"] = "native-b1-execution-review"; save(root, review.name, value)
    elif mutation == "fingerprint": fingerprint = "0"*64
    elif mutation == "missing_expected": fingerprint = None
    elif mutation == "head": monkeypatch.setattr(runner.shared, "checked_in", lambda *a: (_ for _ in ()).throw(ValueError("HEAD mismatch")))
    else: monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "changed", "sha256": "1"*64}]})
    monkeypatch.setattr(runner.ceb, "require_existing_campaign", lambda *a: pytest.fail("ledger reached"))
    argv = ["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review), "--commit"]
    if fingerprint: argv += ["--expected-input-sha256", fingerprint]
    with pytest.raises((campaign.CampaignError, ValueError)): runner.main(argv, repo_root=root, provider_factory=lambda *a: pytest.fail("provider created"))


def test_dry_run_is_read_only(bundle):
    root, manifest, _, _ = bundle; plan, rates, review = seal_execution(bundle)
    assert runner.main(["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review)],
        repo_root=root, provider_factory=lambda *a: pytest.fail("provider created")) == 0
    assert not (root / runner.API_DIRECTORY).exists() and not (root / runner.LOCK_PATH).exists()


def seed(root, anchor=runner.CAMPAIGN_ANCHOR, charged="1"):
    directory = root / runner.API_DIRECTORY; local = campaign.Campaign(directory, anchor)
    audio = b"SYNTHETIC OLD AUDIO"; identity = {"cache_key": "old", "voice_id": "synthetic", "model_id": "eleven_v4", "text": "test", "settings": campaign.V4_SETTINGS}
    with local.db:
        local.db.execute("INSERT INTO requests(key,identity,manifest_fingerprint,state,reserved,charged,request_id,status,mime,audio,audio_hash) VALUES('old',?,?,'ready',1,?,'synthetic-old',200,'audio/mpeg',?,?)",
            (campaign.canonical(identity), anchor, charged, audio, campaign.digest(audio)))
    (directory / "old.mp3").write_bytes(audio); local.db.close(); return directory


@pytest.mark.parametrize("condition", ["missing", "anchor", "zero_charge"])
def test_existing_campaign_required(tmp_path, condition):
    if condition != "missing": seed(tmp_path, "0"*64 if condition == "anchor" else runner.CAMPAIGN_ANCHOR, "0" if condition == "zero_charge" else "1")
    with pytest.raises(campaign.CampaignError): runner.ceb.require_existing_campaign(tmp_path)
    if condition == "missing": assert not (tmp_path / runner.API_DIRECTORY).exists()


def test_receipt_is_durable_before_decode_and_not_retried(bundle):
    root, manifest, _, _ = bundle; plan, _ = runner.prepare_inputs(root, manifest); directory = seed(root); calls = []
    class Provider:
        def preflight(self, pairs, *args): return {pair: Decimal(1) for pair in pairs}
        def synthesize(self, request):
            calls.append(request); return campaign.Receipt(b"SYNTHETIC BAD AUDIO", 200, "synthetic-new", Decimal(1), "audio/mpeg")
    def decoder(audio, mime):
        with sqlite3.connect(directory / "campaign.sqlite3") as db:
            assert db.execute("SELECT state,audio,charged FROM requests WHERE request_id='synthetic-new'").fetchone() == ("received", audio, "1")
        raise ValueError("synthetic decode failure")
    for reason in ("audio_validation_or_delivery_failed", "explicit_reconciliation_required"):
        with pytest.raises(campaign.CampaignError, match=reason): campaign.execute(plan, "f"*64, directory,
            provider=runner.ceb.ExistingCampaignProvider(root, Provider()), rate_evidence={"mode": "receipt-verified"}, commit=True,
            limit=1, decoder=decoder, lock_path=root / runner.LOCK_PATH)
    assert len(calls) == 1


def test_lock_and_prior_spending_preserved(bundle):
    root, manifest, _, _ = bundle; plan, _ = runner.prepare_inputs(root, manifest); directory = seed(root, charged="199999")
    class Provider:
        def preflight(self, pairs, *args): return {pair: Decimal(1) for pair in pairs}
        def synthesize(self, request): pytest.fail("exceeded cap")
    args = dict(provider=runner.ceb.ExistingCampaignProvider(root, Provider()), rate_evidence={"mode": "receipt-verified"}, commit=True,
        decoder=lambda *a: None, lock_path=root / runner.LOCK_PATH)
    with campaign.run_lock(root / runner.LOCK_PATH):
        with pytest.raises(campaign.CampaignError, match="another_run_is_active"): campaign.execute(plan, "f"*64, directory, **args)
    with pytest.raises(campaign.CampaignError, match="campaign_cap_exceeded"): campaign.execute(plan, "f"*64, directory, **args)
    with sqlite3.connect(directory / "campaign.sqlite3") as db:
        assert db.execute("SELECT cap FROM campaign").fetchone() == (200000,)
        assert db.execute("SELECT COUNT(*) FROM requests").fetchone() == (1,)


@pytest.mark.parametrize("mutation", ["pilot", "v2", "extra_voice", "discount"])
def test_receipt_verified_full_rate_scope(bundle, mutation):
    root, manifest, _, _ = bundle; _, rates_path, _ = seal_execution(bundle); plan, _ = runner.prepare_inputs(root, manifest)
    rates = json.loads(rates_path.read_bytes()); model = rates["models"]["eleven_v4"]
    if mutation == "pilot": rates["mode"] = "pilot"
    elif mutation == "v2": rates["models"]["eleven_multilingual_v2"] = model
    elif mutation == "extra_voice": model["voices"]["unexpected"] = {}
    else: model["voices"][runner.VOICE_ID]["creditMultiplier"] = "0.5"
    with pytest.raises(campaign.CampaignError): runner.validate_rates(rates, plan)


def test_real_jini_receipt_required_at_shared_boundary():
    class Offline(campaign.ElevenLabsTransport):
        def __init__(self): pass
        def _read(self, path):
            return [{"model_id": "eleven_v4", "can_do_text_to_speech": True, "model_rates": {"character_cost_multiplier": 1}}] if path == "models" else {"voice_id": runner.VOICE_ID, "sharing": {"rate": 1}}
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": 1,
        "voices": {runner.VOICE_ID: {"sharingRate": 1, "creditMultiplier": 1, "verification": "SYNTHETIC TEST ONLY"}}}}}
    for receipts in ([], [{"voice_id": runner.VOICE_ID, "model_id": "eleven_v4", "text": "테스트", "charged": "0"}], [{"voice_id": "wrong", "model_id": "eleven_v4", "text": "테스트", "charged": "1"}]):
        with pytest.raises(campaign.CampaignError, match="matching_voice_model_receipt_required"): Offline().preflight({(runner.VOICE_ID, "eleven_v4")}, rates, receipts)
    assert Offline().preflight({(runner.VOICE_ID, "eleven_v4")}, rates, [{"voice_id": runner.VOICE_ID, "model_id": "eleven_v4", "text": "테스트", "charged": "1"}]) == {(runner.VOICE_ID, "eleven_v4"): Decimal(1)}


def test_bound_imported_helper_closure():
    paths = {item["path"] for item in runner.code_evidence(runner.ROOT)}
    assert {"scripts/run_guided_native_b1_batch.py", "scripts/export_guided_native_b1.mjs", "scripts/run_guided_cebuano_refresh_v4.py",
        "scripts/guided_refresh_v2.py", "src/services/guided_tts/campaign.py", "src/services/guided_tts/inventory.py"} <= paths


def test_missing_campaign_blocks_main_before_provider(bundle, monkeypatch):
    root, manifest, _, _ = bundle; paths = seal_execution(bundle); _, fingerprint, _ = runner.load_inputs(root, manifest, *paths)
    monkeypatch.setattr(runner.shared, "checked_in", lambda *args: None)
    with pytest.raises(campaign.CampaignError, match="existing_campaign_required"):
        runner.main(["--manifest", str(manifest), "--plan", str(paths[0]), "--rates", str(paths[1]), "--review", str(paths[2]),
            "--commit", "--expected-input-sha256", fingerprint], repo_root=root, provider_factory=lambda *args: pytest.fail("provider created"))
    assert not (root / runner.API_DIRECTORY).exists()


def test_head_check_compares_reviewed_bytes(tmp_path, monkeypatch):
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
