"""Offline contracts. Fixtures and expected cache identities are independent of planner code."""
from collections import Counter
import copy
import hashlib
import json
from pathlib import Path
import subprocess
import shutil
import sys

import pytest

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/src").is_dir()), HERE.parent)
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(ROOT))
try:
    import guided_refresh_v2 as a
    import run_guided_refresh_v2 as cli
except ImportError:
    from scripts import guided_refresh_v2 as a
    from scripts import run_guided_refresh_v2 as cli


def wire(value):
    return json.dumps(value, ensure_ascii=False, sort_keys=True, separators=(",", ":"))


def sha(value):
    return hashlib.sha256(value if isinstance(value, bytes) else value.encode()).hexdigest()


LOCALES = {"English": "en-US", "Spanish": "es-ES", "Italian": "it-IT", "French": "fr-FR",
           "Portuguese": "pt-BR", "German": "de-DE", "Cebuano": "ceb-PH", "Indonesian": "id-ID",
           "Polish": "pl-PL", "Korean": "ko-KR", "Russian": "ru-RU", "Japanese": "ja-JP"}
LEGACY = {"English": ("english_bright_v4_v1", "en-US", "4tRn1lSkEn13EVTuqb0g", 1252),
          "Spanish": ("spanish_bright_v4_v1", "es", "ZCh4e9eZSUf41K4cmCEL", 1175),
          "French": ("french_bright_v4_v1", "fr", "z1rEShu1SmowIOAmbHl1", 1248)}


def seal(snapshot):
    payload = {k: v for k, v in snapshot.items() if k not in
               {"schemaVersion", "projectionVersion", "projectionSha256", "sourceAuthority", "runtimeAuthority"}}
    snapshot["projectionSha256"] = sha(wire(payload))
    return snapshot


def authored_fixture():
    selectors, rows = [], []
    for target, locale in LOCALES.items():
        for number in ([1, 2] if target in {"Russian", "Polish"} else [1]):
            path = f"{target.lower()}-a1-practical-{number}"
            selectors.append({"targetLanguage": target, "sourceLocale": locale, "pathId": path,
                "level": "A1", "vibe": "bright", "requiredGender":
                ("female" if number == 1 else "male") if target in {"Russian", "Polish"} else None})
            for field, kind, surface, key, text in [
                ("corePhrase.targetText", "utterances", "corePhrase", "__self", "Hello there."),
                ("chunks[0].targetText", "chunks", "chunk", "hello", "Hello"),
                ("lessonItems[0].targetText", "vocabulary", "chunk", "hello", "hello"),
                ("trophyWord.word", "vocabulary", "trophyWord", "__self", "there")]:
                rows.append({"targetLanguage": target, "targetLanguageCode": locale, "pathId": path,
                    "lessonId": path + "-lesson", "lessonNumber": 1, "level": "A1", "vibe": "bright",
                    "sourceField": "vibeVariants.bright." + field, "sourceKind": kind,
                    "playbackSurface": surface, "playbackSurfaceKey": key, "text": text})
    return seal({"schemaVersion": 2, "projectionVersion": "guided-refresh-all-authored-v2",
        "scope": "all-active-authored-variants", "targets": list(LOCALES), "lessonCount": 14,
        "variantCount": 14, "pathCount": 14, "selectors": selectors, "rows": rows, "aliases": [],
        "sourceAuthority": [{"path": "frontend/fixture.ts", "sha256": "a" * 64}],
        "runtimeAuthority": {"files": [{"path": "fixture-node", "sha256": "b" * 64}]}})


def assignments_for(snapshot, snapshot_hash="s" * 64, evidence_hash="e" * 64):
    assignments, profiles, voices = [], {}, {}
    for selector in snapshot["selectors"]:
        target, locale, vibe = selector["targetLanguage"], selector["sourceLocale"], selector["vibe"]
        gender = selector["requiredGender"] or "female"
        if target in LEGACY and vibe == "bright" and selector["level"] in {"A1", "A2"}:
            key, code, voice, _ = LEGACY[target]
        else:
            key, code, voice = f"{target.lower()}_{vibe}_{gender}_v4", locale, f"voice_{target}_{gender}"
        assignments.append({"pathId": selector["pathId"], "vibe": vibe, "profileKey": key})
        profiles[key] = {"profileKey": key, "targetLanguage": target, "languageCode": code, "voiceId": voice,
            "verifiedLocale": locale, "verifiedGender": gender, "verificationEvidenceSha256": evidence_hash,
            "verificationMethod": "authenticated-provider-get"}
        voices[voice] = {"requestedId": voice, "voice_id": voice, "status": 200, "name": "Fixture voice",
            "labels": {"language": locale.split("-")[0], "gender": gender}, "sharingRate": None,
            "verified_languages": [{"language": locale.split("-")[0], "locale": locale}]}
    return {"schemaVersion": 2, "status": "reviewed", "snapshotSha256": snapshot_hash,
            "profiles": list(profiles.values()), "assignments": assignments}, {"method": "GET only", "providerVoices": list(voices.values())}


def make_plan(snapshot, mapping=None, evidence=None, **kwargs):
    if mapping is None:
        mapping, evidence = assignments_for(snapshot)
    return a.build_plan(snapshot, mapping, evidence, snapshot_sha256="s" * 64,
        provider_evidence_sha256="e" * 64, code=[{"path": "scripts/code.py", "sha256": "c" * 64}],
        runtime={"files": [{"path": "fixture-python", "sha256": "d" * 64}]}, **kwargs)


def test_handwritten_fixture_preserves_every_selected_source_row():
    snapshot = authored_fixture()
    plan = make_plan(snapshot)
    restored = [{**i["sourceCoordinate"], "text": i["source_text"]} for g in plan["groups"] for i in g["items"]]
    assert Counter(map(wire, restored)) == Counter(map(wire, snapshot["rows"]))
    assert plan["creditBudgetCeiling"] == 200000
    assert plan["usageRows"] == 56
    assert len(plan["publicationHolds"]) == 14


@pytest.mark.parametrize("fault", ["pending", "missing", "extra", "duplicate", "unknown_profile", "wrong_snapshot"])
def test_unknown_or_inexact_assignments_fail_closed(fault):
    snapshot = authored_fixture()
    mapping, evidence = assignments_for(snapshot)
    if fault == "pending": mapping["assignments"][0]["profileKey"] = None
    if fault == "missing": mapping["assignments"].pop()
    if fault == "extra": mapping["assignments"].append({"pathId": "bogus", "vibe": "bright", "profileKey": None})
    if fault == "duplicate": mapping["assignments"].append(mapping["assignments"][0])
    if fault == "unknown_profile": mapping["assignments"][0]["profileKey"] = "bogus"
    if fault == "wrong_snapshot": mapping["snapshotSha256"] = "wrong"
    with pytest.raises(ValueError): make_plan(snapshot, mapping, evidence)


@pytest.mark.parametrize("fault", ["native", "locale", "unknown_gender", "mismatched_gender", "missing_gender",
    "status", "voice_id", "missing_voice", "duplicate_voice", "rate", "method", "evidence_hash", "profile_locale"])
def test_native_provider_evidence_fails_closed(fault):
    snapshot = authored_fixture()
    mapping, evidence = assignments_for(snapshot)
    voice, profile = evidence["providerVoices"][0], mapping["profiles"][0]
    if fault == "native": voice["labels"]["language"] = "fil"
    if fault == "locale": voice["verified_languages"][0]["locale"] = "en-GB"
    if fault == "unknown_gender": voice["labels"]["gender"] = profile["verifiedGender"] = "unknown"
    if fault == "mismatched_gender": profile["verifiedGender"] = "male"
    if fault == "missing_gender": voice["labels"].pop("gender"); profile["verifiedGender"] = None
    if fault == "status": voice["status"] = 404
    if fault == "voice_id": voice["voice_id"] = "other"
    if fault == "missing_voice": evidence["providerVoices"].pop(0)
    if fault == "duplicate_voice": evidence["providerVoices"].append(voice)
    if fault == "rate": voice.pop("sharingRate")
    if fault == "method": evidence["method"] = "roster"
    if fault == "evidence_hash": profile["verificationEvidenceSha256"] = "wrong"
    if fault == "profile_locale": profile["verifiedLocale"] = "en-GB"
    with pytest.raises(ValueError): make_plan(snapshot, mapping, evidence)


@pytest.mark.parametrize("target", ["Russian", "Polish"])
def test_gender_parity_is_independent_of_assignment_and_source_claim(target):
    snapshot = authored_fixture()
    mapping, evidence = assignments_for(snapshot)
    selected = [x for x in mapping["assignments"] if x["pathId"].startswith(target.lower())]
    selected[0]["profileKey"], selected[1]["profileKey"] = selected[1]["profileKey"], selected[0]["profileKey"]
    with pytest.raises(ValueError, match="canonical_path_gender_mismatch"):
        make_plan(snapshot, mapping, evidence, targets=[target])
    s = next(x for x in snapshot["selectors"] if x["targetLanguage"] == target)
    s["requiredGender"] = None
    seal(snapshot)
    with pytest.raises(ValueError, match="canonical_path_gender_rule_changed"):
        make_plan(snapshot, targets=[target])


@pytest.mark.parametrize("fault", ["voice", "key", "language_code"])
def test_completed_profile_identity_cannot_be_rebound(fault):
    snapshot = authored_fixture()
    mapping, evidence = assignments_for(snapshot)
    p, voice = mapping["profiles"][0], evidence["providerVoices"][0]
    if fault == "voice": p["voiceId"] = voice["voice_id"] = voice["requestedId"] = "replacement"
    if fault == "key": p["profileKey"] = mapping["assignments"][0]["profileKey"] = "replacement"
    if fault == "language_code": p["languageCode"] = "en"
    with pytest.raises(ValueError, match="completed_profile_identity_must_not_change"):
        make_plan(snapshot, mapping, evidence)


def test_lexical_conflict_blocks_selected_path_only_and_never_rewrites_text():
    snapshot = authored_fixture()
    conflict = [r for r in snapshot["rows"] if r["pathId"] == "polish-a1-practical-2" and r["playbackSurface"] == "chunk"]
    conflict[0]["text"], conflict[1]["text"] = "kartą?", "karta"
    seal(snapshot)
    with pytest.raises(ValueError, match="selected_scope_has_lexical_coordinate_hold"):
        make_plan(snapshot, targets=["Polish"])
    plan = make_plan(snapshot, targets=["Polish"], excluded_paths=["polish-a1-practical-2"])
    assert plan["usageRows"] == 4 and plan["excludedPaths"] == ["polish-a1-practical-2"]
    assert {r["text"] for r in conflict} == {"kartą?", "karta"}
    assert make_plan(snapshot, targets=["English"])["usageRows"] == 4


@pytest.mark.parametrize("targets,excludes", [([], []), (["English", "English"], []), (["Unknown"], []),
    (["English"], ["unknown"]), (["English"], ["polish-a1-practical-2"]),
    (["English"], ["english-a1-practical-1"]), (["Polish"], ["polish-a1-practical-2"] * 2)])
def test_invalid_or_empty_scope_rejected(targets, excludes):
    with pytest.raises(ValueError): make_plan(authored_fixture(), targets=targets, excluded_paths=excludes)


@pytest.fixture(scope="module")
def live_snapshot():
    return a.export_snapshot(ROOT)


def test_actual_authored_corpus_counts_and_dependency_closure(live_snapshot):
    s = live_snapshot
    assert (s["lessonCount"], s["variantCount"], len(s["selectors"]), len(s["rows"]), len(s["aliases"])) == (2500, 2700, 270, 26486, 35770)
    assert set(s["targets"]) == set(LOCALES)
    names = {x["path"] for x in s["sourceAuthority"]}
    assert "frontend/src/data/guidedLessonsAuthoring.ts" in names
    assert "frontend/package-lock.json" in names
    assert "frontend/src/data/guided/germanB1.ts" in names
    runtime_names = {x["path"].replace("\\", "/") for x in s["runtimeAuthority"]["files"]}
    assert any("tsx/dist/loader.mjs" in name for name in runtime_names)
    assert any("esbuild/lib/main.js" in name for name in runtime_names)
    assert any(name.lower().endswith("node.exe") or name.endswith("/node") for name in runtime_names)


def test_real_full_source_rows_survive_and_original_keys_are_reused(live_snapshot):
    plan = make_plan(live_snapshot, excluded_paths=["polish-a1-practical-2"])
    restored = [{**i["sourceCoordinate"], "text": i["source_text"]} for g in plan["groups"] for i in g["items"]]
    expected = [r for r in live_snapshot["rows"] if r["pathId"] != "polish-a1-practical-2"]
    assert Counter(map(wire, restored)) == Counter(map(wire, expected))
    settings_hash = sha(json.dumps({"similarity_boost": 0.75, "stability": 0.5}, sort_keys=True, separators=(",", ":")))
    for target, (profile, code, voice, count) in LEGACY.items():
        group = next(g for g in plan["groups"] if g["proposedVoiceProfile"]["voice_profile_key"] == profile)
        keys = set()
        for item in group["items"]:
            expected_key = sha("|".join(["elevenlabs", code, profile, voice, "eleven_v4", "mp3_44100_128",
                settings_hash, "v1", sha(item["normalized_text"])]))
            assert item["cache_key"] == expected_key
            keys.add(expected_key)
        assert len(keys) == count
        previous = ROOT / "review-artifacts/guided-audio-20261003" / f"{target.lower()}-refresh-plan.json"
        if previous.exists():
            old = json.loads(previous.read_bytes())
            assert keys == {i["cache_key"] for g in old["groups"] for i in g["items"]}


@pytest.fixture
def reviewed_files(tmp_path, monkeypatch):
    snapshot = authored_fixture()
    def save(name, value):
        path = tmp_path / f"{name}.json"
        path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        return path
    files = {"snapshot": save("snapshot", snapshot)}
    mapping, evidence = assignments_for(snapshot, sha(files["snapshot"].read_bytes()))
    files["voice-evidence"] = save("voice-evidence", evidence)
    for p in mapping["profiles"]: p["verificationEvidenceSha256"] = sha(files["voice-evidence"].read_bytes())
    files["assignments"] = save("assignments", mapping)
    code = [{"path": "scripts/code.py", "sha256": "c" * 64}]
    runtime = {"files": [{"path": "fixture-python", "sha256": "d" * 64}]}
    monkeypatch.setattr(a, "export_snapshot", lambda *args: copy.deepcopy(snapshot))
    monkeypatch.setattr(a, "code_evidence", lambda *args: copy.deepcopy(code))
    monkeypatch.setattr(a, "runtime_evidence", lambda: copy.deepcopy(runtime))
    plan = a.build_plan(snapshot, mapping, evidence, snapshot_sha256=sha(files["snapshot"].read_bytes()),
        provider_evidence_sha256=sha(files["voice-evidence"].read_bytes()), code=code, targets=["English"])
    files["plan"] = save("plan", plan)
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": "1",
        "voices": {"4tRn1lSkEn13EVTuqb0g": {"sharingRate": None, "creditMultiplier": "1", "verification": "fixture"}}}}}
    files["rates"] = save("rates", rates)
    review = {"schemaVersion": 2, "status": "reviewed", "verdict": "PASS", "unresolvedFindings": 0,
        "snapshotSha256": sha(files["snapshot"].read_bytes()), "assignmentsSha256": sha(files["assignments"].read_bytes()),
        "providerEvidenceSha256": sha(files["voice-evidence"].read_bytes()), "executionCodeSha256": sha(wire(code)),
        "runtimeAuthoritySha256": sha(wire(runtime)), "planSha256": sha(files["plan"].read_bytes()),
        "rateEvidenceSha256": sha(wire(rates)), "targets": ["English"], "excludedPaths": []}
    files["review"] = save("review", review)
    fingerprint = sha(wire({"plan": plan, "reviewSha256": sha(files["review"].read_bytes()), "rateEvidence": rates}))
    argv = [part for key, path in files.items() for part in ["--" + key, str(path)]] + ["--targets", "English"]
    return files, argv, fingerprint, snapshot


def reject_provider(*args):
    pytest.fail("invalid or dry-run input constructed a provider")


@pytest.mark.parametrize("fault", ["plan", "plan_bytes", "drop_source_row", "assignments", "voice-evidence", "rates", "review",
    "review_plan_binding", "review_rate_binding", "review_runtime_binding", "review_code_binding", "target", "exclusion",
    "source_authority", "runtime", "code", "fingerprint", "missing_fingerprint"])
def test_every_stale_input_stops_before_provider_or_campaign(reviewed_files, monkeypatch, fault):
    files, argv, fingerprint, snapshot = reviewed_files
    if fault == "plan_bytes": files["plan"].write_bytes(files["plan"].read_bytes() + b" ")
    if fault in {"plan", "assignments", "voice-evidence", "rates", "review"}:
        value = json.loads(files[fault].read_bytes()); value["unreviewed"] = True
        files[fault].write_text(json.dumps(value), encoding="utf-8")
    if fault == "drop_source_row":
        value = json.loads(files["snapshot"].read_bytes()); value["rows"].pop(); seal(value)
        files["snapshot"].write_text(json.dumps(value), encoding="utf-8")
    if fault.startswith("review_"):
        value = json.loads(files["review"].read_bytes())
        field = {"review_plan_binding": "planSha256", "review_rate_binding": "rateEvidenceSha256",
            "review_runtime_binding": "runtimeAuthoritySha256", "review_code_binding": "executionCodeSha256"}[fault]
        value.pop(field); files["review"].write_text(json.dumps(value), encoding="utf-8")
    if fault == "target": argv[-1] = "Spanish"
    if fault == "exclusion": argv += ["--exclude-paths", "english-a1-practical-1"]
    if fault == "source_authority": snapshot["sourceAuthority"][0]["sha256"] = "z" * 64
    if fault == "runtime": monkeypatch.setattr(a, "runtime_evidence", lambda: {"changed": True})
    if fault == "code": monkeypatch.setattr(a, "code_evidence", lambda *args: [{"changed": True}])
    if fault == "fingerprint": fingerprint = "wrong"
    monkeypatch.setattr(a, "checked_in", lambda *args: None)
    monkeypatch.setattr(a.campaign, "execute", lambda *args, **kwargs: pytest.fail("invalid inputs reached campaign"))
    if fault != "missing_fingerprint": argv += ["--expected-input-sha256", fingerprint]
    with pytest.raises(ValueError): cli.main([*argv, "--commit"], provider_factory=reject_provider)


def test_dry_run_has_no_provider_or_ledger(reviewed_files, tmp_path, monkeypatch, capsys):
    _, argv, fingerprint, _ = reviewed_files
    real_execute = a.campaign.execute
    def execute(plan, fingerprint, directory, **kwargs):
        assert directory == ROOT / "review-artifacts/guided-audio-20261003/api"
        assert kwargs["lock_path"] == ROOT / "review-artifacts/.guided-audio-api.lock"
        return real_execute(plan, fingerprint, tmp_path / "never-created", **kwargs)
    monkeypatch.setattr(a.campaign, "execute", execute)
    assert cli.main(argv, provider_factory=reject_provider) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["cap"] == 200000 and result["inputFingerprint"] == fingerprint
    assert not (tmp_path / "never-created").exists()


def test_valid_gate_precedes_provider_and_keeps_same_campaign(reviewed_files, monkeypatch):
    _, argv, fingerprint, _ = reviewed_files
    events = []
    monkeypatch.setattr(a, "checked_in", lambda *args: events.append("HEAD"))
    class Provider:
        def close(self): events.append("close")
    def factory(key):
        assert events == ["HEAD"]; events.append("provider"); return Provider()
    def execute(plan, actual, directory, **kwargs):
        assert actual == fingerprint and plan["creditBudgetCeiling"] == 200000
        assert directory == ROOT / "review-artifacts/guided-audio-20261003/api"
        assert kwargs["lock_path"] == ROOT / "review-artifacts/.guided-audio-api.lock"
        assert kwargs["commit"] is True and kwargs["limit"] == 1
        events.append("execute"); return {"mode": "stubbed"}
    monkeypatch.setattr(a.campaign, "execute", execute)
    assert cli.main([*argv, "--commit", "--limit", "1", "--expected-input-sha256", fingerprint], provider_factory=factory) == 0
    assert events == ["HEAD", "provider", "execute", "close"]


@pytest.mark.parametrize("head", [None, b"old contents\n"])
def test_HEAD_gate_rejects_untracked_or_modified_source(tmp_path, monkeypatch, head):
    (tmp_path / "code.py").write_bytes(b"new contents\n")
    monkeypatch.setattr(a.subprocess, "run", lambda *args, **kwargs: subprocess.CompletedProcess(args[0],
        1 if head is None else 0, stdout=head or b""))
    with pytest.raises(ValueError, match="source_or_code_not_checked_in"):
        a.checked_in(tmp_path, [{"path": "code.py", "sha256": sha(b"new contents\n")}])


def test_HEAD_gate_rejects_outside_checkout_and_changed_dependency(tmp_path):
    with pytest.raises(ValueError, match="authority_outside_checkout"):
        a.checked_in(tmp_path, [{"path": str(tmp_path.parent / "outside.py"), "sha256": "a" * 64}])
    path = tmp_path / "frontend/node_modules/dependency.js"
    path.parent.mkdir(parents=True); path.write_bytes(b"new")
    with pytest.raises(ValueError, match="authority_bytes_changed"):
        a.checked_in(tmp_path, [{"path": path.relative_to(tmp_path).as_posix(), "sha256": sha(b"old"), "tracked": False}])


@pytest.mark.parametrize("fault", ["none", "unknown_vibe", "missing_target", "duplicate_lesson", "speak_conflict", "newline"])
def test_exporter_uses_only_actual_variants_and_rejects_incomplete_or_ambiguous_sources(fault):
    exporter = Path(a.__file__).with_name("export_guided_refresh_v2.mjs")
    source = r'''
import { pathToFileURL } from 'node:url';
const {projectLessons} = await import(pathToFileURL(process.argv[2]).href);
const targets = ['English','Spanish','Italian','French','Portuguese','German','Cebuano','Indonesian','Polish','Korean','Russian','Japanese'];
const lessons = targets.map((target, i) => ({id:`lesson-${i}`,pathId:`${target.toLowerCase()}-a1-practical-1`,
  lessonNumber:1,status:'active',targetLanguage:target,level:'A1',vibeVariants:{sharp:{
  corePhrase:{targetText:'Canonical phrase'},chunks:[{id:'part',targetText:'Canonical'}],
  lessonItems:[{id:'part',targetText:'Canonical',acceptedAnswers:['canonical']}],trophyWord:{word:'phrase'},
  speakTarget:{language:'fixture',targetPhrase:'Canonical phrase',acceptedAnswers:['canonical phrase']},
  typeRecall:{acceptedAnswers:['canonical']}}}}));
const fault = process.argv[3];
if(fault==='unknown_vibe') lessons[0].vibeVariants.surprise = lessons[0].vibeVariants.sharp;
if(fault==='missing_target') lessons.pop();
if(fault==='duplicate_lesson') lessons.push(lessons[0]);
if(fault==='speak_conflict') lessons[0].vibeVariants.sharp.speakTarget.targetPhrase='Changed phrase';
if(fault==='newline') lessons[0].vibeVariants.sharp.chunks[0].targetText='First\nSecond';
try { const p=projectLessons(lessons,lessons.map(x=>({id:x.pathId}))); console.log(JSON.stringify({rows:p.rows.length,
  variants:p.variantCount,vibes:[...new Set(p.rows.map(x=>x.vibe))],aliases:p.aliases.length})); }
catch(e) { console.error(e.message); process.exitCode=1; }
'''
    result = subprocess.run([shutil.which("node"), "--input-type=module", "-", str(exporter), fault],
        input=source, text=True, capture_output=True, check=False)
    if fault == "none":
        assert result.returncode == 0, result.stderr
        assert json.loads(result.stdout) == {"rows": 48, "variants": 12, "vibes": ["sharp"], "aliases": 48}
    else:
        assert result.returncode == 1
