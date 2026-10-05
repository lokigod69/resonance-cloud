"""Offline Corazon adapter contracts; no network, real ledger or git commands."""
from collections import Counter
import copy
from decimal import Decimal
import hashlib
import importlib.util
import json
import sqlite3
from pathlib import Path
import subprocess
import sys

import pytest

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/src").is_dir()), HERE.parent)
SCRIPT = ROOT / "scripts/run_guided_cebuano_refresh_v4.py" if HERE.name == "tests" else HERE / "run_guided_cebuano_refresh_v4.py"
spec = importlib.util.spec_from_file_location("cebuano_adapter_under_test", SCRIPT)
a = importlib.util.module_from_spec(spec)
spec.loader.exec_module(a)


def wire(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode()).hexdigest()


def seal(snapshot):
    snapshot["projectionSha256"] = sha(wire({k: v for k, v in snapshot.items() if k not in {
        "schemaVersion", "projectionVersion", "projectionSha256", "sourceAuthority", "runtimeAuthority"}}))
    return snapshot


def authored_fixture():
    locales = {"English": "en-US", "Spanish": "es-ES", "Italian": "it-IT", "French": "fr-FR",
        "Portuguese": "pt-BR", "German": "de-DE", "Cebuano": "ceb-PH", "Indonesian": "id-ID",
        "Polish": "pl-PL", "Korean": "ko-KR", "Russian": "ru-RU", "Japanese": "ja-JP"}
    selectors, rows, aliases = [], [], []
    for target, locale in locales.items():
        for level in (["A1", "A2"] if target == "Cebuano" else ["A1"]):
            path = f"{target.lower()}-{level.lower()}-practical-1"
            selectors.append({"pathId": path, "vibe": "bright", "targetLanguage": target,
                "sourceLocale": locale, "level": level, "requiredGender": "female" if target in {"Russian", "Polish"} else None})
            base = {"targetLanguage": target, "targetLanguageCode": locale, "pathId": path,
                "lessonId": f"{path}-001-test", "lessonNumber": 1, "level": level, "vibe": "bright"}
            for field, kind, surface, key, text in [
                ("corePhrase.targetText", "utterances", "corePhrase", "__self", "Maayong buntag."),
                ("dialogue[1].targetText", "utterances", "corePhrase", "__self", "Maayong buntag."),
                ("chunks[0].targetText", "chunks", "chunk", "greeting", "Maayo"),
                ("lessonItems[0].targetText", "vocabulary", "chunk", "greeting", "maayo"),
                ("trophyWord.word", "vocabulary", "trophyWord", "__self", "buntag")]:
                rows.append({**base, "sourceField": f"vibeVariants.bright.{field}", "sourceKind": kind,
                    "playbackSurface": surface, "playbackSurfaceKey": key, "text": text})
            aliases.append({**base, "sourceField": "vibeVariants.bright.speakTarget.acceptedAnswers[0]",
                "canonicalField": "vibeVariants.bright.corePhrase.targetText", "kind": "accepted-input",
                "synthesize": False, "text": "An accepted alternative"})
    return seal({"schemaVersion": 2, "projectionVersion": "guided-refresh-all-authored-v2",
        "scope": "all-active-authored-variants", "targets": list(locales), "lessonCount": 13,
        "variantCount": 13, "pathCount": 13, "selectors": selectors, "rows": rows, "aliases": aliases,
        "sourceAuthority": [{"path": "frontend/fixture.ts", "sha256": sha(b"fixture source")}],
        "runtimeAuthority": {"files": [{"path": "fixture-node", "sha256": "a" * 64}]}})


def voice_fixture():
    return {"method": "GET only", "requestedId": "LR0CUgPwE0CmrIZg4enh", "status": 200,
        "voice_id": "LR0CUgPwE0CmrIZg4enh", "name": "Corazon - Curious Cebu Narrator",
        "labels": {"language": "ceb", "gender": "female", "accent": "standard"},
        "verified_languages": [{"language": "ceb", "locale": None, "accent": "standard"}], "sharingRate": 1.0}


def rates_fixture(mode="receipt-verified"):
    return {"mode": mode, "models": {"eleven_v4": {"modelCharacterCostMultiplier": "1",
        "voices": {"LR0CUgPwE0CmrIZg4enh": {"sharingRate": 1.0,
            "creditMultiplier": "10" if mode == "pilot" else "1", "verification": "Offline test evidence"}}}}}


def make_plan(snapshot=None, evidence=None, **kwargs):
    return a.build_plan(snapshot or authored_fixture(), evidence or voice_fixture(), snapshot_sha256="s" * 64,
        provider_evidence_sha256="e" * 64, code=[{"path": "fixture.py", "sha256": "c" * 64}],
        runtime={"files": [{"path": "fixture-python", "sha256": "p" * 64}]}, **kwargs)


def test_exact_rows_per_path_profiles_null_locale_and_cache_keys():
    snapshot = authored_fixture()
    plan = make_plan(snapshot)
    restored = [{**item["sourceCoordinate"], "text": item["source_text"]} for g in plan["groups"] for item in g["items"]]
    expected = [r for r in snapshot["rows"] if r["targetLanguage"] == "Cebuano"]
    assert Counter(map(wire, restored)) == Counter(map(wire, expected))
    assert plan["usageRows"] == 10 and plan["uniqueAudioFiles"] == 8
    assert len(plan["aliases"]) == 2 and len(plan["publicationHolds"]) == 2
    assert {r["sourceKind"] for r in restored} == {"utterances", "chunks", "vocabulary"}
    assert {r["targetLanguageCode"] for r in restored} == {"ceb-PH"}
    assert plan["nativeVoiceVerification"]["verifiedLocale"] is None
    assert plan["nativeVoiceVerification"]["localeVerified"] is False
    assert plan["publicationAuthorized"] is False and plan["creditBudgetCeiling"] == 200000
    settings_hash = sha(wire({"similarity_boost": 0.75, "stability": 0.5}))
    for group in plan["groups"]:
        p = group["proposedVoiceProfile"]
        assert p["scope_path_id"] == group["pathId"] and p["vibe"] == "bright"
        assert p["voice_profile_key"] == f"cebuano_{group['pathId'].split('-')[1]}_bright_p1_corazon_v4_v1"
        assert p["target_language_code"] == "ceb"
        for item in group["items"]:
            key = sha("|".join(["elevenlabs", "ceb", p["voice_profile_key"], "LR0CUgPwE0CmrIZg4enh",
                "eleven_v4", "mp3_44100_128", settings_hash, "v1", sha(item["normalized_text"])]))
            assert item["cache_key"] == key
    requests = a.campaign.unique_requests(plan)
    assert {r["text"] for r in requests} == {"Maayong buntag.", "Maayo", "maayo", "buntag"}
    assert not any("alternative" in r["text"] for r in requests)


@pytest.mark.parametrize("fault", ["requested_voice", "returned_voice", "status", "method", "native_language", "gender",
    "accent", "verified_language", "wrong_locale", "claimed_correct_locale", "missing_locale", "empty_verified", "mixed_language", "rate", "boolean_rate"])
def test_narrow_native_voice_policy_fails_closed(fault):
    voice = voice_fixture()
    if fault == "requested_voice": voice["requestedId"] = "other"
    if fault == "returned_voice": voice["voice_id"] = "other"
    if fault == "status": voice["status"] = 404
    if fault == "method": voice["method"] = "roster"
    if fault == "native_language": voice["labels"]["language"] = "fil"
    if fault == "gender": voice["labels"]["gender"] = "male"
    if fault == "accent": voice["labels"]["accent"] = "other"
    if fault == "verified_language": voice["verified_languages"][0]["language"] = "fil"
    if fault == "wrong_locale": voice["verified_languages"][0]["locale"] = "fil-PH"
    if fault == "claimed_correct_locale": voice["verified_languages"][0]["locale"] = "ceb-PH"
    if fault == "missing_locale": voice["verified_languages"][0].pop("locale")
    if fault == "empty_verified": voice["verified_languages"] = []
    if fault == "mixed_language": voice["verified_languages"].append({"language": "fil", "locale": None})
    if fault == "rate": voice.pop("sharingRate")
    if fault == "boolean_rate": voice["sharingRate"] = True
    with pytest.raises(a.ERROR): make_plan(evidence=voice)


def test_lexical_conflict_rejects_until_entire_path_explicitly_excluded():
    snapshot = authored_fixture()
    row = next(r for r in snapshot["rows"] if r["pathId"] == "cebuano-a1-practical-1" and r["sourceKind"] == "chunks")
    row["text"] = "Different lexical content"
    seal(snapshot)
    with pytest.raises(a.ERROR, match="lexical_conflict"): make_plan(snapshot)
    plan = make_plan(snapshot, excluded_paths=["cebuano-a1-practical-1"])
    assert plan["usageRows"] == 5 and len(plan["excludedCoordinateConflicts"]) == 1
    assert {g["pathId"] for g in plan["groups"]} == {"cebuano-a2-practical-1"}
    assert row["text"] == "Different lexical content"


@pytest.mark.parametrize("excluded", [["unknown"], ["english-a1-practical-1"],
    ["cebuano-a1-practical-1"] * 2, ["cebuano-a1-practical-1", "cebuano-a2-practical-1"]])
def test_inexact_or_empty_exclusion_scope_rejected(excluded):
    with pytest.raises(a.ERROR): make_plan(excluded_paths=excluded)


@pytest.fixture
def reviewed(tmp_path, monkeypatch):
    root = tmp_path / "repository"
    (root / "frontend").mkdir(parents=True)
    (root / "frontend/fixture.ts").write_bytes(b"fixture source")
    code_path = root / "fixture.py"
    code_path.write_bytes(b"fixture code")
    snapshot = authored_fixture()
    code = [{"path": "fixture.py", "sha256": sha(code_path.read_bytes())}]
    runtime = {"files": [{"path": "fixture-python", "sha256": "d" * 64}]}
    monkeypatch.setattr(a.source, "export_snapshot", lambda *args: copy.deepcopy(snapshot))
    monkeypatch.setattr(a, "code_evidence", lambda *args: copy.deepcopy(code))
    monkeypatch.setattr(a.source, "runtime_evidence", lambda: copy.deepcopy(runtime))
    files = {}
    def save(name, value):
        path = root / f"{name}.json"
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        files[name] = path
        return path.read_bytes()
    snapshot_raw = save("snapshot", snapshot)
    voice_raw = save("voice-evidence", voice_fixture())
    plan = a.build_plan(snapshot, voice_fixture(), snapshot_sha256=sha(snapshot_raw),
        provider_evidence_sha256=sha(voice_raw), code=code)
    plan_raw = save("plan", plan)
    def review_rates(mode="receipt-verified"):
        rates_raw = save("rates", rates_fixture(mode))
        bindings = a.review_bindings(plan, snapshot_raw=snapshot_raw, voice_raw=voice_raw, plan_raw=plan_raw, rates_raw=rates_raw)
        review = {"schemaVersion": 1, "kind": "cebuano-v4-refresh-independent-review", "status": "reviewed",
            "verdict": "PASS", "unresolvedFindings": 0,
            "reviewer": {"kind": "independent-agent", "id": "offline-fixture-reviewer"}, **bindings}
        review_raw = save("review", review)
        return sha(wire({"plan": plan, "reviewSha256": sha(review_raw), "bindings": bindings}))
    fingerprint = review_rates()
    return {"root": root, "files": files, "snapshot": snapshot, "code": code, "runtime": runtime,
        "plan": plan, "fingerprint": fingerprint, "save": save, "review_rates": review_rates,
        "argv": [v for name, path in files.items() for v in ("--" + name, str(path))]}


def forbid_provider(*args, **kwargs):
    pytest.fail("provider constructed before all gates passed")


def test_default_dry_run_never_constructs_provider_opens_ledger_or_lock(reviewed, monkeypatch, capsys):
    f = reviewed
    def forbid_ledger(*args, **kwargs): pytest.fail("ledger or lock opened during dry-run")
    monkeypatch.setattr(a.campaign, "Campaign", forbid_ledger)
    monkeypatch.setattr(a.campaign, "run_lock", forbid_ledger)
    assert a.main(f["argv"], repo_root=f["root"], provider_factory=forbid_provider) == 0
    result = json.loads(capsys.readouterr().out)
    assert result == {"mode": "dry-run", "cap": 200000, "inputFingerprint": f["fingerprint"],
            "uniqueKeys": 8, "characters": 62}
    assert not (f["root"] / "review-artifacts").exists()


@pytest.mark.parametrize("fault", ["snapshot_bytes", "snapshot_content", "voice_bytes", "voice_content", "plan_bytes", "review_bytes",
    "plan_row_missing", "review_status", "review_verdict", "review_findings", "review_boolean_findings", "review_identity", "review_binding",
    "code", "python_runtime", "exporter_runtime", "source_authority", "rates_bytes", "rates_content", "fingerprint"])
def test_stale_input_never_reaches_provider(reviewed, fault):
    f = reviewed
    if fault.endswith("_bytes"):
        name = {"snapshot_bytes": "snapshot", "voice_bytes": "voice-evidence", "plan_bytes": "plan", "rates_bytes": "rates", "review_bytes": "review"}[fault]
        path = f["files"][name]
        path.write_bytes(path.read_bytes() + b"\n")
    if fault == "snapshot_content": f["snapshot"]["rows"][0]["text"] = "Changed live source"
    if fault == "voice_content":
        voice = voice_fixture(); voice["name"] = "Changed evidence"; f["save"]("voice-evidence", voice)
    if fault == "plan_row_missing":
        plan = copy.deepcopy(f["plan"]); plan["groups"][0]["items"].pop(); f["save"]("plan", plan)
    if fault.startswith("review_") and fault != "review_bytes":
        review = json.loads(f["files"]["review"].read_bytes())
        if fault == "review_status": review["status"] = "draft"
        if fault == "review_verdict": review["verdict"] = "REWORK"
        if fault == "review_findings": review["unresolvedFindings"] = 1
        if fault == "review_boolean_findings": review["unresolvedFindings"] = False
        if fault == "review_identity": review.pop("reviewer")
        if fault == "review_binding": review["localePolicy"] = "unreviewed-locale"
        f["save"]("review", review)
    if fault == "code": f["code"][0]["sha256"] = "f" * 64
    if fault == "python_runtime": f["runtime"]["files"][0]["sha256"] = "f" * 64
    if fault == "exporter_runtime": f["snapshot"]["runtimeAuthority"]["files"][0]["sha256"] = "f" * 64
    if fault == "source_authority": f["snapshot"]["sourceAuthority"][0]["sha256"] = "f" * 64
    if fault == "rates_content":
        rates = rates_fixture(); rates["models"]["eleven_v4"]["voices"][a.VOICE_ID]["creditMultiplier"] = "2"; f["save"]("rates", rates)
    expected = "f" * 64 if fault == "fingerprint" else f["fingerprint"]
    with pytest.raises((a.ERROR, ValueError)):
        a.main([*f["argv"], "--commit", "--expected-input-sha256", expected],
            repo_root=f["root"], provider_factory=forbid_provider)
    assert not (f["root"] / "review-artifacts").exists()


@pytest.mark.parametrize("fault", ["uncommitted_source", "uncommitted_code", "changed_bytes"])
def test_real_head_gate_before_provider_without_running_git(reviewed, monkeypatch, fault):
    f = reviewed
    failing_name = "frontend/fixture.ts" if fault == "uncommitted_source" else "fixture.py"
    if fault == "changed_bytes": (f["root"] / failing_name).write_bytes(b"changed after plan")
    def git_show(args, **kwargs):
        assert args[:2] == ["git", "show"]
        name = args[2].removeprefix("HEAD:")
        return subprocess.CompletedProcess(args, 1 if name == failing_name else 0,
            stdout=b"" if name == failing_name else (f["root"] / name).read_bytes())
    monkeypatch.setattr(a.source.subprocess, "run", git_show)
    with pytest.raises(ValueError, match="authority_bytes_changed|not_checked_in"):
        a.main([*f["argv"], "--commit", "--expected-input-sha256", f["fingerprint"]],
            repo_root=f["root"], provider_factory=forbid_provider)


@pytest.mark.parametrize("fault", ["mode", "wrong_model", "extra_voice", "sharing_rate", "no_verification", "low_full", "low_pilot"])
def test_rate_gate_is_independent_of_valid_review_metadata(fault):
    rates = rates_fixture("pilot" if fault == "low_pilot" else "receipt-verified")
    if fault == "mode": rates["mode"] = "unverified"
    if fault == "wrong_model": rates["models"]["other"] = rates["models"].pop("eleven_v4")
    else:
        voices = rates["models"]["eleven_v4"]["voices"]
        if fault == "extra_voice": voices["other"] = copy.deepcopy(voices[a.VOICE_ID])
        if fault == "sharing_rate": voices[a.VOICE_ID]["sharingRate"] = 2
        if fault == "no_verification": voices[a.VOICE_ID]["verification"] = ""
        if fault == "low_full": voices[a.VOICE_ID]["creditMultiplier"] = "0.1"
        if fault == "low_pilot": voices[a.VOICE_ID]["creditMultiplier"] = "1"
    with pytest.raises(a.ERROR): a.validate_rates(rates, make_plan())


def test_pilot_cannot_dispatch_whole_plan(reviewed, monkeypatch):
    f = reviewed
    fingerprint = f["review_rates"]("pilot")
    monkeypatch.setattr(a.source, "checked_in", lambda *args: None)
    with pytest.raises(a.ERROR, match="pilot_requires_representative_sample"):
        a.main([*f["argv"], "--commit", "--expected-input-sha256", fingerprint],
            repo_root=f["root"], provider_factory=forbid_provider)
    assert not (f["root"] / "review-artifacts").exists()


class OfflineProvider(a.campaign.ElevenLabsTransport):
    """Real rate preflight logic with pure fixture reads; no HTTP client exists."""
    def __init__(self, posted): self.posted = posted
    def _read(self, path):
        if path == "models":
            return [{"model_id": "eleven_v4", "can_do_text_to_speech": True,
                "model_rates": {"character_cost_multiplier": 1}}]
        assert path == f"voices/{a.VOICE_ID}"
        return {"voice_id": a.VOICE_ID, "sharing": {"rate": 1.0}}
    def synthesize(self, request):
        self.posted.append(request)
        return a.campaign.Receipt(b"offline MP3 fixture", 200, "fixture-receipt", Decimal(1), "audio/mpeg")
    def close(self): pass


def test_existing_ledger_pilot_positive_receipt_followon_and_lock(reviewed, monkeypatch, capsys):
    f, posted, events = reviewed, [], []
    directory, lock = f["root"] / a.API_DIRECTORY, f["root"] / a.LOCK_PATH
    with a.campaign.run_lock(lock):
        prior = a.campaign.Campaign(directory, a.CAMPAIGN_ANCHOR)
        request = {"cache_key": "a" * 64, "text": "Existing other voice", "voice_id": "prior_voice", "model_id": "eleven_v4", "settings": a.campaign.V4_SETTINGS}
        assert prior.reserve(request, 7)
        prior.save_receipt(request["cache_key"], a.campaign.Receipt(b"prior", 200, "prior-receipt", Decimal(7), "audio/mpeg"))
        (directory / (request["cache_key"] + ".mp3")).write_bytes(b"prior")
        with prior.db: prior.db.execute("UPDATE requests SET state='ready'")
        prior.db.close()
    real_execute = a.campaign.execute
    def checked(root, authority):
        assert authority == [*f["snapshot"]["sourceAuthority"], *f["code"]]
        events.append("HEAD")
    def factory(*args):
        assert events[-1] == "HEAD"; events.append("provider"); return OfflineProvider(posted)
    def execute(plan, fingerprint, actual_directory, **kwargs):
        assert actual_directory == directory and kwargs["lock_path"] == lock
        assert plan["creditBudgetCeiling"] == 200000
        return real_execute(plan, fingerprint, actual_directory, **kwargs, decoder=lambda *args: None)
    monkeypatch.setattr(a.source, "checked_in", checked)
    monkeypatch.setattr(a.campaign, "execute", execute)
    def run(fingerprint, *extra):
        return a.main([*f["argv"], "--commit", "--expected-input-sha256", fingerprint, *extra],
            repo_root=f["root"], provider_factory=factory)
    with pytest.raises(a.ERROR, match="matching_voice_model_receipt_required"): run(f["fingerprint"])
    assert posted == []
    pilot = f["review_rates"]("pilot")
    assert run(pilot, "--sample-per-voice") == 0
    result = json.loads(capsys.readouterr().out)
    assert result["dispatched"] == 1 and result["ready"] == 2 and result["committedCredits"] == "8"
    assert posted[0]["text"] == "Maayong buntag."
    followon = f["review_rates"]()
    with a.campaign.run_lock(lock):
        with pytest.raises(a.ERROR, match="another_run_is_active"): run(followon)
    assert len(posted) == 1
    assert run(followon) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["cap"] == 200000 and result["dispatched"] == 7 and result["ready"] == 9
    assert result["committedCredits"] == "15" and a.CAMPAIGN_ANCHOR in result["registeredManifests"]
    assert pilot in result["registeredManifests"] and followon in result["registeredManifests"]
    assert run(followon) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["dispatched"] == 0 and len(posted) == 8


def test_zero_cost_pilot_cannot_authorize_full_run():
    provider = OfflineProvider([])
    with pytest.raises(a.ERROR, match="matching_voice_model_receipt_required"):
        provider.preflight({(a.VOICE_ID, "eleven_v4")}, rates_fixture(),
            [{"voice_id": a.VOICE_ID, "model_id": "eleven_v4", "text": "Maayong buntag.", "charged": "0"}])


@pytest.mark.parametrize("fault", ["missing", "empty", "malformed", "uninitialized", "wrong_cap", "no_anchor", "no_receipt"])
def test_missing_or_replaced_ledger_fails_before_provider(reviewed, monkeypatch, fault):
    f = reviewed
    directory = f["root"] / a.API_DIRECTORY
    path = directory / "campaign.sqlite3"
    if fault != "missing":
        directory.mkdir(parents=True)
        if fault in {"empty", "malformed"}:
            path.write_bytes(b"" if fault == "empty" else b"not sqlite")
        else:
            with sqlite3.connect(path) as db:
                db.execute("CREATE TABLE unrelated(value)")
                if fault != "uninitialized":
                    db.executescript("CREATE TABLE campaign(id,cap); CREATE TABLE manifests(fingerprint); CREATE TABLE requests(manifest_fingerprint,state,charged);")
                    db.execute("INSERT INTO campaign VALUES(1,?)", (1 if fault == "wrong_cap" else 200000,))
                    if fault != "no_anchor":
                        db.execute("INSERT INTO manifests VALUES(?)", (a.CAMPAIGN_ANCHOR,))
    before = {p.relative_to(f["root"]).as_posix(): p.read_bytes() for p in f["root"].rglob('*') if p.is_file()}
    monkeypatch.setattr(a.source, "checked_in", lambda *args: None)
    def forbidden_provider(*args):
        pytest.fail("Provider must not be constructed when the existing campaign is absent")
    with pytest.raises(a.ERROR, match="existing_campaign_required|established_campaign_.*required"):
        a.main([*f["argv"], "--commit", "--expected-input-sha256", f["fingerprint"]],
            repo_root=f["root"], provider_factory=forbidden_provider)
    after = {p.relative_to(f["root"]).as_posix(): p.read_bytes() for p in f["root"].rglob('*') if p.is_file()}
    assert before == after


def test_locked_preflight_rechecks_campaign_identity(tmp_path):
    class NeverCalled:
        def preflight(self, *args):
            pytest.fail("Missing established campaign must fail before provider GET/POST")
    wrapper = a.ExistingCampaignProvider(tmp_path, NeverCalled())
    with pytest.raises(a.ERROR, match="existing_campaign_required"):
        wrapper.preflight(set(), {}, [])
    assert not list(tmp_path.iterdir())


def test_actual_saved_source_and_corazon_evidence_preserve_all_cebuano_rows():
    snapshot_path = ROOT.parent / "tmp/V4_EXPANSION_20261003/pipeline/SOURCE_SNAPSHOT_V2.json"
    voice_path = ROOT / "review-artifacts/guided-audio-20261003/20261005-corazon-added-voice-evidence.json"
    if not snapshot_path.exists() or not voice_path.exists():
        pytest.skip("Local source/voice evidence is intentionally not committed")
    snapshot, voice = json.loads(snapshot_path.read_bytes()), json.loads(voice_path.read_bytes())
    plan = make_plan(snapshot, voice)
    expected = [row for row in snapshot["rows"] if row["targetLanguage"] == "Cebuano" and row["level"] in {"A1", "A2"}]
    actual = [{**item["sourceCoordinate"], "text": item["source_text"]} for group in plan["groups"] for item in group["items"]]
    assert Counter(map(wire, actual)) == Counter(map(wire, expected))
    assert {row["sourceKind"] for row in actual} == {"utterances", "chunks", "vocabulary"}
    assert {row["level"] for row in actual} == {"A1", "A2"}
    assert len(actual) == 1826 and len(plan["groups"]) == 20
