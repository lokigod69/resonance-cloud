"""Offline tests. Every PASS envelope and receipt here is a synthetic test fixture."""
import copy
import importlib.util
import json
from pathlib import Path
import sqlite3
import shutil
import subprocess
from decimal import Decimal

import pytest

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("native_candidate", HERE.parent / "scripts/run_guided_native_b1_batch.py")
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
campaign = runner.campaign


def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"file": path.name, "sha256": campaign.digest(path.read_bytes())}


def synthetic_source(target="Indonesian", number=1):
    """Structurally valid artificial lesson text; no linguistic approval is implied."""
    base = {"de": "Synthetischer Test", "en": "Synthetic fixture"}
    translated = lambda text: {"targetText": text, "baseText": dict(base)}
    token = lambda i: "nativefixture" + chr(97 + i // 26) + chr(97 + i % 26)
    specification = {"status": "architect-spec", "targetLanguage": target, "targetLanguageCode": runner.LOCALES[target],
        "paths": [{"pathNumber": p+1, "lessons": [{"number": n+1, "trophy": token(p*10+n), "beat": "Synthetic fixture"}
            for n in range(10)]} for p in range(10)]}
    lessons = []
    for i in range(10):
        trophy = token((number-1)*10+i)
        if target == "Indonesian":
            chunks = ["Aku menilai", trophy, "dengan tenang", "sebelum memilih", "jalan baru."]
            second = "Kita membahas rencana ini sambil mencari pilihan lain."
            cloze = ["Kita membahas ", {"kind": "choice", "answer": "rencana", "choices": ["rencana", "rumah", "pasar", "taman"]},
                " ini sambil mencari ", {"kind": "choice", "answer": "pilihan", "choices": ["pilihan", "jalan", "buku", "meja"]}, " lain."]
            required = [trophy, "menilai", "tenang"]
        else:
            chunks = ["Atong hisgutan", trophy, "uban sa higala", "aron makapili", "ug plano."]
            second = "Ato kining susihon aron makapili og laing plano."
            cloze = ["Ato kining ", {"kind": "choice", "answer": "susihon", "choices": ["susihon", "balay", "dalan", "libro"]},
                " aron makapili og laing ", {"kind": "choice", "answer": "plano", "choices": ["plano", "panahon", "tubig", "papel"]}, "."]
            required = [trophy, "higala", "plano"]
        first, opening = " ".join(chunks), "Synthetic opening."
        before, after = first.split(trophy)
        lessons.append({"slug": f"fixture-{chr(97+i)}", "title": dict(base), "situation": dict(base),
            "pedagogicalGoal": "Synthetic structural test", "register": "neutral",
            "dialogue": [translated(opening), translated(first), translated("Synthetic later turn."), translated(second)],
            "pattern": {"label": "Test", "rule": dict(base), "examples": [dict(translated(first), highlight=trophy), dict(translated(second), highlight="makapili" if target == "Cebuano" else "rencana")]},
            "cloze": cloze, "chunks": list(map(translated, chunks)),
            "terms": list(map(translated, [trophy, "alpha", "beta", "gamma", "delta", "epsilon"])),
            "recall": {"before": before, "answer": trophy, "after": after, "fallbackChoices": [trophy, "omega", "sigma", "theta"]},
            "speakRequired": required, "sceneCaption": {"de": f'Hier: "{opening}"', "en": f'Here: "{opening}"'},
            "trophyWord": {"word": trophy, "meaning": dict(base), "example": first, "whyThisWord": dict(base)},
            "distractors": ["discard alpha", "discard beta"], "placeholderCaption": dict(base), "songMood": "Test", "visualNotes": "Test"})
    return {"schemaVersion": 1, "status": "draft", "level": "B1", "targetLanguage": target,
        "targetLanguageCode": runner.LOCALES[target], "baseLanguage": "German", "pathNumber": number,
        "title": dict(base), "subtitle": dict(base), "anchor": "Synthetic fixture", "lessons": lessons}, specification


def voice_fixture(target):
    voice = {"requestedId": runner.VOICES[target], "voice_id": runner.VOICES[target], "status": 200, "name": "SYNTHETIC",
        "labels": {"language": runner.CODES[target], "gender": "female", "accent": "standard"}, "sharingRate": 1,
        "verified_languages": [{"language": runner.CODES[target], "locale": runner.LOCALES[target] if target == "Indonesian" else None}]}
    return {"method": "GET only", "providerVoices": [voice]} if target == "Indonesian" else {"method": "GET only", **voice}


@pytest.fixture
def bundle(tmp_path, monkeypatch):
    root = tmp_path
    entry_list, source_bindings, spec_bindings, voices = [], {}, {}, {}
    for target in runner.VOICES:
        for number in (1, 2):
            source, specification = synthetic_source(target, number)
            name = f"{runner.CONTENT_ROOT}/{target.lower()}/p{number}.json"
            source_binding = write_json(root / name, source); source_binding["file"] = name
            spec_name = f"{runner.CONTENT_ROOT}/{target.lower()}/specification.json"
            spec_binding = write_json(root / spec_name, specification); spec_binding["file"] = spec_name
            entry_list.append({**source_binding, "targetLanguage": target, "pathNumber": number,
                "reviewedVoiceId": runner.VOICES[target], "specification": spec_binding})
            source_bindings[name], spec_bindings[spec_name] = source_binding["sha256"], spec_binding["sha256"]
        voices[target] = write_json(root / f"{target}-voice.json", voice_fixture(target))
    manifest = {"schemaVersion": 1, "kind": "native-b1-content-manifest", "status": "reviewed-staged", "sources": entry_list, "voiceEvidence": voices}
    for name in ("fableReview", "independentReview"):
        envelope = {"schemaVersion": 1, "kind": name, "verdict": "PASS", "unresolvedFindings": 0,
            "coverage": "full-content-all-fields", "reviewedSources": source_bindings, "reviewedSpecifications": spec_bindings,
            "reviewer": {"id": "SYNTHETIC_TEST_ONLY", "kind": "independent-agent", "authorOfReviewedContent": False}}
        if name == "fableReview": envelope["model"] = "claude-fable-5-1"
        manifest[name] = write_json(root / f"{name}.json", envelope)
    path = root / "manifest.json"; write_json(path, manifest)
    monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "SYNTHETIC", "sha256": "0"*64}]})
    monkeypatch.setattr(runner, "code_evidence", lambda root: [{"path": "SYNTHETIC.py", "sha256": "0"*64}])
    def fake_export(root, inputs):
        return {"schemaVersion": 1, "projectionVersion": runner.VERSION,
            "rows": [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])],
            "sourceAuthority": [{"path": "SYNTHETIC.ts", "sha256": "0"*64}],
            "runtimeAuthority": {"files": [{"path": "SYNTHETIC", "sha256": "0"*64}]},
            "validation": {"validator": "frontend/scripts/lib/guidedNativeB1Drafts.ts", "fullNativeSpecification": True, "passed": len(inputs)}}
    monkeypatch.setattr(runner, "export_native", fake_export)
    return root, path, manifest


def seal_test_execution(bundle):
    root, manifest_path, _ = bundle
    plan, _ = runner.prepare_inputs(root, manifest_path)
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": "1", "voices": {
        voice: {"sharingRate": 1, "creditMultiplier": "1", "verification": "SYNTHETIC_TEST_ONLY"} for voice in runner.VOICES.values()}}}}
    plan_path, rates_path, review_path = [root / name for name in ("plan.json", "rates.json", "review.json")]
    write_json(plan_path, plan); write_json(rates_path, rates)
    review = {"schemaVersion": 1, "kind": "native-b1-execution-review", "verdict": "PASS", "unresolvedFindings": 0,
        "scope": "full-run-and-rates", "reviewer": {"id": "SYNTHETIC_TEST_ONLY", "kind": "independent-agent", "authorOfExecutionCode": False},
        **runner.review_bindings(plan, plan_path.read_bytes(), rates_path.read_bytes())}
    write_json(review_path, review)
    return plan_path, rates_path, review_path


def test_complete_native_rows_and_profile_identity(bundle):
    root, path, _ = bundle
    plan, _ = runner.prepare_inputs(root, path)
    assert plan["usageRows"] == 760
    assert len(plan["groups"]) == 4
    assert plan["publicationAuthorized"] is False
    for group in plan["groups"]:
        items = group["items"]
        assert len(items) == 190
        assert sum("/dialogue/" in r["sourceCoordinate"]["sourcePointer"] for r in items) == 40
        assert sum("/terms/" in r["sourceCoordinate"]["sourcePointer"] for r in items) == 60
        assert sum(r["surface"] == "trophyExample" for r in items) == 10
        assert all(r["provider_model_id"] == "eleven_v4" for r in items)
        assert all(r["surface_key"].startswith("fixture-item-") for r in items if "/terms/" in r["sourceCoordinate"]["sourcePointer"])
        if group["targetLanguage"] == "Cebuano":
            assert group["nativeVoiceVerification"]["verifiedLocale"] is None
            assert group["nativeVoiceVerification"]["localeVerified"] is False


@pytest.mark.parametrize("target", ["Indonesian", "Cebuano"])
def test_real_native_offline_gate_and_dependency_closure(target):
    source, specification = synthetic_source(target)
    entry = {"file": "SYNTHETIC.json", "sha256": "0"*64, "targetLanguage": target, "pathNumber": 1}
    result = runner.export_native(runner.ROOT, [{"entry": entry, "source": source, "specification": specification}])
    assert result["rows"] == runner.expected_rows(source, entry)
    paths = {item["path"] for item in result["sourceAuthority"]}
    assert {"frontend/scripts/lib/guidedNativeB1Drafts.ts", "frontend/scripts/lib/guidedB1Drafts.ts", "frontend/src/data/guidedLessonsAuthoring.ts", "frontend/package-lock.json"} <= paths
    assert len(result["runtimeAuthority"]["files"]) > 10
    assert {"frontend/node_modules/zod/package.json", "frontend/node_modules/@capacitor/core/package.json"} <= paths
    assert len(result["runtimeAuthority"]["validatorBundleSha256"]) == 64


def test_captured_bundle_binds_resolver_metadata_and_node_addons(tmp_path):
    frontend = tmp_path / "frontend"
    modules = frontend / "node_modules"
    modules.mkdir(parents=True)
    for name in ("esbuild", "@esbuild"):
        shutil.copytree(runner.ROOT / "frontend/node_modules" / name, modules / name)
    for name, value in (("package.json", {"type": "module"}), ("package-lock.json", {}),
                        ("tsconfig.json", {}), ("tsconfig.app.json", {})):
        write_json(frontend / name, value)
    dependency = modules / "conditional-fixture"
    metadata = {"type": "module", "exports": {"node-addons": "./native.js", "default": "./fallback.js"}}
    write_json(dependency / "package.json", metadata)
    (dependency / "native.js").write_text("export const selected = 'node-addons';", encoding="utf-8")
    (dependency / "fallback.js").write_text("export const selected = 'wrong-default';", encoding="utf-8")
    (frontend / "entry.ts").write_text("export { selected } from 'conditional-fixture';", encoding="utf-8")
    script = """
import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
const [exporter, root, metadata] = JSON.parse(process.env.NATIVE_CLOSURE_FIXTURE);
const { captureValidator } = await import(exporter);
const first = await captureValidator(root, 'frontend/entry.ts');
const evaluated = await import('data:text/javascript;base64,' + Buffer.from(first.bundle).toString('base64'));
assert.equal(evaluated.selected, 'node-addons');
assert(first.sources.some(row => row.path.endsWith('/conditional-fixture/native.js')));
assert(!first.sources.some(row => row.path.endsWith('/conditional-fixture/fallback.js')));
const packageRow = result => result.sources.find(row => row.path.endsWith('/conditional-fixture/package.json'));
assert(packageRow(first));
const spec = JSON.parse(await readFile(metadata, 'utf8'));
spec.description = 'Changed resolver metadata without changing the selected graph';
await writeFile(metadata, JSON.stringify(spec));
const second = await captureValidator(root, 'frontend/entry.ts');
assert.equal(first.bundleSha256, second.bundleSha256);
assert.notEqual(packageRow(first).sha256, packageRow(second).sha256);
spec.exports['node-addons'] = './fallback.js';
await writeFile(metadata, JSON.stringify(spec));
const third = await captureValidator(root, 'frontend/entry.ts');
assert.notEqual(second.bundleSha256, third.bundleSha256);
assert(third.sources.some(row => row.path.endsWith('/conditional-fixture/fallback.js')));
"""
    fixture = [(runner.HERE / "export_guided_native_b1.mjs").as_uri(), str(tmp_path), str(dependency / "package.json")]
    result = subprocess.run([shutil.which("node"), "--input-type=module", "-"], input=script, text=True,
        capture_output=True, env={**runner.os.environ, "NATIVE_CLOSURE_FIXTURE": json.dumps(fixture)}, timeout=60)
    assert result.returncode == 0, result.stderr


@pytest.mark.parametrize("mutation", ["bad_language", "terms_missing", "short_spec", "trophy_conflict", "native_rule", "extra_field"])
def test_real_gate_rejects_native_authoring_failures(mutation):
    source, specification = synthetic_source()
    if mutation == "bad_language": source["targetLanguage"] = "Italian"
    elif mutation == "terms_missing": source["lessons"][0]["terms"] = []
    elif mutation == "short_spec": specification["paths"] = specification["paths"][:2]
    elif mutation == "trophy_conflict": specification["paths"][9]["lessons"][9]["trophy"] = specification["paths"][0]["lessons"][0]["trophy"]
    elif mutation == "native_rule": source["lessons"][0]["speakRequired"][0] = "aku"
    else: source["lessons"][0]["surpriseSpokenText"] = "No silent unknown fields"
    with pytest.raises(campaign.CampaignError, match="native_offline_validation_failed"):
        runner.export_native(runner.ROOT, [{"entry": {"file": "SYNTHETIC", "sha256": "0"*64, "targetLanguage": "Indonesian", "pathNumber": 1}, "source": source, "specification": specification}])


@pytest.mark.parametrize("kind", ["fableReview", "independentReview"])
@pytest.mark.parametrize("mutation", ["verdict", "finding", "boolean_count", "source", "spec", "coverage", "kind", "model_or_author"])
def test_actual_review_envelope_checked_not_just_outer_hash(bundle, kind, mutation):
    root, path, manifest = bundle
    evidence_path = root / manifest[kind]["file"]
    envelope = json.loads(evidence_path.read_bytes())
    if mutation == "verdict": envelope["verdict"] = "REWORK"
    elif mutation == "finding": envelope["unresolvedFindings"] = 1
    elif mutation == "boolean_count": envelope["unresolvedFindings"] = False
    elif mutation == "source": envelope["reviewedSources"] = {}
    elif mutation == "spec": envelope["reviewedSpecifications"] = {}
    elif mutation == "coverage": envelope["coverage"] = "specification-only"
    elif mutation == "kind": envelope["kind"] = "otherReview"
    elif kind == "fableReview": envelope["model"] = "wrong-model"
    else: envelope["reviewer"]["authorOfReviewedContent"] = True
    manifest[kind] = write_json(evidence_path, envelope); write_json(path, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["duplicate", "scope", "voice", "path", "source_change", "spec_change"])
def test_exact_source_manifests(bundle, mutation):
    root, path, manifest = bundle
    first = manifest["sources"][0]
    if mutation == "duplicate": manifest["sources"][1] = copy.deepcopy(first)
    elif mutation == "scope": first["pathNumber"] = True
    elif mutation == "voice": first["reviewedVoiceId"] = "other"
    elif mutation == "path": first["file"] = "../source.json"
    elif mutation == "source_change": (root / first["file"]).write_text("{}", encoding="utf-8")
    else: (root / first["specification"]["file"]).write_text("{}", encoding="utf-8")
    write_json(path, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["missing_terms", "language_spoof", "wrong_text", "duplicate"])
def test_exported_projection_cannot_filter_or_spoof(bundle, monkeypatch, mutation):
    root, path, _ = bundle
    original = runner.export_native
    def export(root, inputs):
        result = original(root, inputs)
        if mutation == "missing_terms": result["rows"] = [r for r in result["rows"] if "/terms/" not in r["sourcePointer"]]
        elif mutation == "language_spoof": result["rows"][0]["targetLanguage"] = "Italian"
        elif mutation == "wrong_text": result["rows"][0]["text"] += " changed"
        else: result["rows"].append(result["rows"][0])
        return result
    monkeypatch.setattr(runner, "export_native", export)
    with pytest.raises(campaign.CampaignError, match="complete_native_projection_required"): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("target", ["Indonesian", "Cebuano"])
@pytest.mark.parametrize("mutation", ["language", "locale", "voice", "status"])
def test_exact_voice_evidence(bundle, target, mutation):
    root, path, manifest = bundle
    evidence = voice_fixture(target)
    voice = evidence["providerVoices"][0] if target == "Indonesian" else evidence
    if mutation == "language": voice["labels"]["language"] = "en"
    elif mutation == "locale": voice["verified_languages"][0]["locale"] = None if target == "Indonesian" else "ceb-PH"
    elif mutation == "voice": voice["voice_id"] = "other"
    else: voice["status"] = 201
    manifest["voiceEvidence"][target] = write_json(root / f"{target}-voice.json", evidence); write_json(path, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["plan", "rates", "review", "fingerprint", "no_expected", "head"])
def test_execution_bindings_fail_before_provider(bundle, monkeypatch, mutation):
    root, manifest, _ = bundle
    plan, rates, review = seal_test_execution(bundle)
    _, fingerprint, _ = runner.load_inputs(root, manifest, plan, rates, review)
    if mutation == "plan": plan.write_bytes(plan.read_bytes() + b" ")
    elif mutation == "rates": rates.write_bytes(rates.read_bytes() + b" ")
    elif mutation == "review":
        value = json.loads(review.read_bytes()); value["scope"] = "pilot-only"; write_json(review, value)
    elif mutation == "fingerprint": fingerprint = "0"*64
    elif mutation == "no_expected": fingerprint = None
    else: monkeypatch.setattr(runner.shared, "checked_in", lambda *a: (_ for _ in ()).throw(ValueError("source_or_code_not_checked_in")))
    monkeypatch.setattr(runner.ceb, "require_existing_campaign", lambda root: pytest.fail("ledger reached"))
    argv = ["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review), "--commit"]
    if fingerprint: argv += ["--expected-input-sha256", fingerprint]
    with pytest.raises((campaign.CampaignError, ValueError)):
        runner.main(argv, repo_root=root, provider_factory=lambda *a: pytest.fail("provider created"))


def test_dry_run_creates_no_ledger_lock_or_provider(bundle):
    root, manifest, _ = bundle
    plan, rates, review = seal_test_execution(bundle)
    assert runner.main(["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review)],
        repo_root=root, provider_factory=lambda *a: pytest.fail("provider created")) == 0
    assert not (root / runner.API_DIRECTORY).exists()
    assert not (root / runner.LOCK_PATH).exists()


def seed_campaign(root, *, anchor=runner.CAMPAIGN_ANCHOR, charged="1"):
    """Synthetic database only, under pytest temporary root."""
    directory = root / runner.API_DIRECTORY
    local = campaign.Campaign(directory, anchor)
    identity = {"cache_key": "synthetic-old", "voice_id": "test", "model_id": "eleven_v4", "text": "test", "settings": campaign.V4_SETTINGS}
    audio = b"SYNTHETIC OLD AUDIO"
    with local.db:
        local.db.execute("INSERT INTO requests(key,identity,manifest_fingerprint,state,reserved,charged,request_id,status,mime,audio,audio_hash) VALUES(?,?,?,'ready',1,?,'test',200,'audio/mpeg',?,?)",
            ("synthetic-old", campaign.canonical(identity), anchor, charged, audio, campaign.digest(audio)))
    (directory / "synthetic-old.mp3").write_bytes(audio)
    local.db.close()
    return directory


@pytest.mark.parametrize("condition", ["missing", "wrong_anchor", "no_positive"])
def test_existing_campaign_guard_never_bootstraps(tmp_path, condition):
    if condition != "missing": seed_campaign(tmp_path, anchor="0"*64 if condition == "wrong_anchor" else runner.CAMPAIGN_ANCHOR, charged="0" if condition == "no_positive" else "1")
    with pytest.raises(campaign.CampaignError): runner.ceb.require_existing_campaign(tmp_path)
    if condition == "missing": assert not (tmp_path / runner.API_DIRECTORY).exists()


def test_shared_single_dispatch_and_durable_receipt_before_decode(bundle):
    root, manifest, _ = bundle
    plan, _ = runner.prepare_inputs(root, manifest)
    directory = seed_campaign(root)
    runner.ceb.require_existing_campaign(root)
    calls = []
    class Provider:
        def preflight(self, pairs, evidence, receipts): return {pair: Decimal("1") for pair in pairs}
        def synthesize(self, request):
            calls.append(request)
            return campaign.Receipt(b"SYNTHETIC BAD AUDIO", 200, "synthetic-new", Decimal("1"), "audio/mpeg")
    def decoder(audio, mime):
        with sqlite3.connect(directory / "campaign.sqlite3") as db:
            assert db.execute("SELECT state,audio,charged FROM requests WHERE request_id='synthetic-new'").fetchone() == ("received", audio, "1")
        raise ValueError("synthetic decode failure")
    for expected in ("audio_validation_or_delivery_failed", "explicit_reconciliation_required"):
        with pytest.raises(campaign.CampaignError, match=expected):
            campaign.execute(plan, "f"*64, directory, provider=runner.ceb.ExistingCampaignProvider(root, Provider()),
                rate_evidence={"mode": "receipt-verified"}, commit=True, limit=1, decoder=decoder, lock_path=root / runner.LOCK_PATH)
    assert len(calls) == 1


@pytest.mark.parametrize("voice", list(runner.VOICES.values()))
def test_full_rates_need_real_matching_positive_receipt_at_shared_boundary(voice):
    class OfflineTransport(campaign.ElevenLabsTransport):
        def __init__(self): pass
        def _read(self, path):
            if path == "models": return [{"model_id": "eleven_v4", "can_do_text_to_speech": True, "model_rates": {"character_cost_multiplier": 1}}]
            return {"voice_id": voice, "sharing": {"rate": 1}}
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": 1, "voices": {voice: {"sharingRate": 1, "creditMultiplier": 1, "verification": "SYNTHETIC"}}}}}
    for receipts in ([], [{"voice_id": voice, "model_id": "eleven_v4", "text": "test", "charged": "0"}], [{"voice_id": "wrong", "model_id": "eleven_v4", "text": "test", "charged": "1"}]):
        with pytest.raises(campaign.CampaignError, match="matching_voice_model_receipt_required"):
            OfflineTransport().preflight({(voice, "eleven_v4")}, rates, receipts)
    assert OfflineTransport().preflight({(voice, "eleven_v4")}, rates, [{"voice_id": voice, "model_id": "eleven_v4", "text": "test", "charged": "1"}]) == {(voice, "eleven_v4"): Decimal("1")}


@pytest.mark.parametrize("mutation", ["pilot", "old_model", "extra_voice", "cheap_bound", "sharing_changed"])
def test_rate_modes_and_scope_are_narrow(bundle, mutation):
    root, manifest, _ = bundle
    plan, _ = runner.prepare_inputs(root, manifest)
    _, rates_path, _ = seal_test_execution(bundle)
    rates = json.loads(rates_path.read_bytes())
    model = rates["models"]["eleven_v4"]
    if mutation == "pilot": rates["mode"] = "pilot"
    elif mutation == "old_model": rates["models"]["eleven_multilingual_v2"] = model
    elif mutation == "extra_voice": model["voices"]["unexpected"] = copy.deepcopy(next(iter(model["voices"].values())))
    elif mutation == "cheap_bound": model["voices"][runner.ceb.VOICE_ID]["creditMultiplier"] = "0.5"
    else: model["voices"][runner.ceb.VOICE_ID]["sharingRate"] = 2
    with pytest.raises(campaign.CampaignError): runner.validate_rates(rates, plan)


def test_missing_campaign_blocks_before_provider_creation(bundle, monkeypatch):
    root, manifest, _ = bundle
    plan, rates, review = seal_test_execution(bundle)
    _, fingerprint, _ = runner.load_inputs(root, manifest, plan, rates, review)
    monkeypatch.setattr(runner.shared, "checked_in", lambda *args: None)
    with pytest.raises(campaign.CampaignError, match="existing_campaign_required"):
        runner.main(["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review),
            "--commit", "--expected-input-sha256", fingerprint], repo_root=root,
            provider_factory=lambda *args: pytest.fail("provider created"))
    assert not (root / runner.API_DIRECTORY).exists()


def test_os_lock_blocks_before_ledger_or_provider(bundle):
    root, manifest, _ = bundle
    plan, _ = runner.prepare_inputs(root, manifest)
    class Provider:
        def preflight(self, *args): pytest.fail("provider preflight while lock held")
    with campaign.run_lock(root / runner.LOCK_PATH):
        with pytest.raises(campaign.CampaignError, match="another_run_is_active"):
            campaign.execute(plan, "f"*64, root / runner.API_DIRECTORY, provider=Provider(),
                rate_evidence={"mode": "receipt-verified"}, commit=True, decoder=lambda *args: None, lock_path=root / runner.LOCK_PATH)
    assert not (root / runner.API_DIRECTORY).exists()


def test_existing_credits_count_against_same_cap(bundle):
    root, manifest, _ = bundle
    plan, _ = runner.prepare_inputs(root, manifest)
    directory = seed_campaign(root, charged="199999")
    class Provider:
        def preflight(self, pairs, *args): return {pair: Decimal("1") for pair in pairs}
        def synthesize(self, request): pytest.fail("dispatched beyond existing budget")
    with pytest.raises(campaign.CampaignError, match="campaign_cap_exceeded"):
        campaign.execute(plan, "f"*64, directory, provider=runner.ceb.ExistingCampaignProvider(root, Provider()),
            rate_evidence={"mode": "receipt-verified"}, commit=True, decoder=lambda *args: None, lock_path=root / runner.LOCK_PATH)
    with sqlite3.connect(directory / "campaign.sqlite3") as db:
        assert db.execute("SELECT cap FROM campaign").fetchone() == (200000,)
        assert db.execute("SELECT COUNT(*) FROM requests").fetchone() == (1,)


def test_shared_head_equality_checks_actual_bytes(tmp_path, monkeypatch):
    path = tmp_path / "source.json"
    path.write_bytes(b"reviewed bytes\n")
    authority = [{"path": "source.json", "sha256": campaign.digest(path.read_bytes())}]
    class Result:
        returncode = 0
        stdout = b"different HEAD bytes\n"
    monkeypatch.setattr(runner.shared.subprocess, "run", lambda *args, **kwargs: Result())
    with pytest.raises(ValueError, match="source_or_code_not_checked_in"):
        runner.shared.checked_in(tmp_path, authority)
    Result.stdout = b"reviewed bytes\n"
    runner.shared.checked_in(tmp_path, authority)
    path.write_bytes(b"changed after inspection\n")
    with pytest.raises(ValueError, match="authority_bytes_changed"):
        runner.shared.checked_in(tmp_path, authority)


def test_source_runtime_or_code_change_invalidates_saved_plan(bundle, monkeypatch):
    root, manifest, _ = bundle
    paths = seal_test_execution(bundle)
    monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "SYNTHETIC", "sha256": "1"*64}]})
    with pytest.raises(campaign.CampaignError, match="rebuilt_plan_mismatch"):
        runner.load_inputs(root, manifest, *paths)
