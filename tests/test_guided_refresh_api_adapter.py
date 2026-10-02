"""Offline coverage using current TS sources, with no saved tmp inventory."""
from collections import Counter
import copy
import json
from pathlib import Path
import subprocess
import sys

import pytest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from scripts import guided_refresh_api_adapter as a
from scripts import run_guided_refresh_campaign as cli


def inventory_from_projection(projection):
    entries = {}
    for ordinal, row in enumerate(projection["rows"]):
        entry = entries.setdefault(row["text"], {"targetLanguage": "English", "text": row["text"],
            "textSha256": a.sha(row["text"]), "coordinates": []})
        entry["coordinates"].append({**{k: v for k, v in row.items() if k != "text"}, "ordinal": ordinal})
    return {"sourceCorpusSha256": projection["sourceProjectionSha256"], "entries": list(entries.values())}


@pytest.fixture(scope="module")
def corpus():
    exporter = Path(a.__file__).with_name("export_guided_refresh_source.mjs")
    projection = a.export_current_source(a.DEFAULT_REPO, exporter)
    inventory = inventory_from_projection(projection)
    raw = (a.canonical(inventory) + "\n").encode("utf-8")
    evidence = a.code_evidence(a.DEFAULT_REPO, exporter)
    plan = a.build_plan(projection, inventory, inventory_sha256=a.sha(raw), evidence=evidence)
    return {"projection": projection, "inventory": inventory, "raw": raw, "evidence": evidence,
            "plan": plan, "exporter": exporter}


def build(corpus, *, projection=None, inventory=None):
    return a.build_plan(projection if projection is not None else corpus["projection"],
        inventory if inventory is not None else corpus["inventory"],
        inventory_sha256=a.sha(corpus["raw"]), evidence=corpus["evidence"])


def test_real_module_projection_has_pinned_complete_english_scope(corpus):
    p, plan = corpus["projection"], corpus["plan"]
    assert (p["lessonCount"], p["pathCount"], len(p["rows"])) == (200, 20, 2045)
    assert Counter(r["sourceKind"] for r in p["rows"]) == {"utterances": 200, "chunks": 539, "vocabulary": 1306}
    assert sum("lessonItems[" in r["sourceField"] for r in p["rows"]) == 1106
    assert len(plan["speakTargetAliases"]) == 200
    assert plan["groups"][0]["pathIds"][0] == "english-a1-practical-1"
    assert plan["groups"][0]["items"][0]["lesson_id"] == "english-a1-practical-001-first-contact"


def test_every_source_coordinate_and_text_survives_projection(corpus):
    restored = [{**item["sourceCoordinate"], "text": item["source_text"]}
                for item in corpus["plan"]["groups"][0]["items"]]
    assert Counter(map(a.canonical, restored)) == Counter(map(a.canonical, corpus["projection"]["rows"]))


def test_executor_deduplicates_across_paths_without_losing_usage(corpus):
    plan = corpus["plan"]
    profile = plan["groups"][0]["proposedVoiceProfile"]
    assert profile["scope_path_id"] is None
    assert profile["provider_voice_id"] == "4tRn1lSkEn13EVTuqb0g"
    assert profile["voice_profile_key"] == "english_bright_v4_v1"
    requests = a.campaign.unique_requests(plan)
    assert len(requests) == plan["uniqueAudioFiles"] < plan["usageRows"]
    assert sum(len(r["text"]) for r in requests) == plan["firstAttemptCharacters"]
    aliases = [x for x in plan["groups"][0]["items"] if x["source_text"] == "Hi there"]
    assert len({x["path_id"] for x in aliases}) > 1
    assert len({x["cache_key"] for x in aliases}) == 1
    assert all("\n" not in r["text"] for r in requests)


@pytest.mark.parametrize("mutation", ["text", "drop_vocabulary", "drop_core", "duplicate_coordinate"])
def test_stale_or_dropped_inventory_coordinates_are_rejected(corpus, mutation):
    inventory = copy.deepcopy(corpus["inventory"])
    if mutation == "text":
        entry = inventory["entries"][0]
        entry["text"] += " Changed."
        entry["textSha256"] = a.sha(entry["text"])
    else:
        field = "vocabularyItem" if mutation == "drop_vocabulary" else "playbackSurface"
        def selected(c):
            return c.get(field) is True if field == "vocabularyItem" else c.get(field) == "corePhrase"
        entry = next(x for x in inventory["entries"] if any(selected(c) for c in x["coordinates"]))
        index = next(i for i, c in enumerate(entry["coordinates"]) if selected(c))
        if mutation == "duplicate_coordinate":
            entry["coordinates"].append(copy.deepcopy(entry["coordinates"][index]))
        else:
            entry["coordinates"].pop(index)
    with pytest.raises(ValueError, match="saved_inventory_does_not_match_current_sources"):
        build(corpus, inventory=inventory)


def test_changed_current_source_with_valid_self_digest_is_rejected(corpus):
    projection = copy.deepcopy(corpus["projection"])
    projection["rows"][0]["text"] += " Changed."
    projection["sourceProjectionSha256"] = a.sha(a.canonical(projection["rows"]))
    with pytest.raises(ValueError, match="saved_inventory_does_not_match_current_sources"):
        build(corpus, projection=projection)


def test_case_aliases_remain_explicit_separate_cache_keys(corpus):
    plan = corpus["plan"]
    assert len(plan["playbackCoordinateCaseVariants"]) == 10
    case = plan["playbackCoordinateCaseVariants"][0]
    assert set(case["textVariants"]) == {"Hi there", "hi there"}
    items = [x for x in plan["groups"][0]["items"]
             if x["lesson_id"] == case["lessonId"] and x["surface_key"] == case["surfaceKey"]]
    assert len({x["cache_key"] for x in items}) == 2


def test_paid_code_gate_rejects_outside_checkout(tmp_path):
    root = tmp_path / "repo"
    with pytest.raises(ValueError, match="adapter_code_not_inside_app_checkout"):
        a.assert_checked_in_code(root, [{"path": str(tmp_path / "outside.py"), "sha256": "a" * 64}])


@pytest.mark.parametrize("head", [b"original\n", None])
def test_paid_code_gate_rejects_modified_or_untracked_code(tmp_path, monkeypatch, head):
    source = tmp_path / "adapter.py"
    source.write_bytes(b"modified\n")
    monkeypatch.setattr(a.subprocess, "run", lambda *args, **kwargs: subprocess.CompletedProcess(
        args[0], 1 if head is None else 0, stdout=head or b"", stderr=b""))
    with pytest.raises(ValueError, match="adapter_code_not_checked_in_or_changed"):
        a.assert_checked_in_code(tmp_path, [{"path": "adapter.py", "sha256": a.sha(source.read_bytes())}])


@pytest.fixture
def cli_inputs(corpus, tmp_path):
    plan_path, inventory_path, rates_path = [tmp_path / name for name in ("plan.json", "inventory.json", "rates.json")]
    plan_path.write_text(json.dumps(corpus["plan"]), encoding="utf-8")
    inventory_path.write_bytes(corpus["raw"])
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": "1", "voices": {
        "4tRn1lSkEn13EVTuqb0g": {"sharingRate": 1, "creditMultiplier": "1", "verification": "offline-test-evidence"}}}}}
    rates_path.write_text(json.dumps(rates), encoding="utf-8")
    return {"argv": ["--plan", str(plan_path), "--inventory", str(inventory_path), "--rates", str(rates_path)],
        "plan": plan_path, "inventory": inventory_path, "rates": rates, "rates_path": rates_path,
        "fingerprint": a.input_fingerprint(corpus["plan"], rates)}


def reject_provider(*args):
    pytest.fail("provider constructed before input validation or during dry-run")


@pytest.mark.parametrize("head", [b"changed CLI\n", None])
def test_modified_or_untracked_cli_stops_before_provider(corpus, cli_inputs, monkeypatch, head):
    name = "scripts/run_guided_refresh_campaign.py"
    assert name in {item["path"] for item in corpus["evidence"]}
    monkeypatch.setattr(a, "load_fresh_plan", lambda *args: corpus["plan"])
    def git_show(command, **kwargs):
        assert command[:2] == ["git", "show"]
        relative = command[2].removeprefix("HEAD:")
        content = head if relative == name else (a.DEFAULT_REPO / relative).read_bytes()
        return subprocess.CompletedProcess(command, 1 if content is None else 0,
            stdout=content or b"", stderr=b"")
    monkeypatch.setattr(a.subprocess, "run", git_show)
    monkeypatch.setattr(cli.campaign, "execute", lambda *args, **kwargs: pytest.fail("modified CLI reached executor"))
    with pytest.raises(ValueError, match="adapter_code_not_checked_in_or_changed"):
        cli.main([*cli_inputs["argv"], "--commit", "--expected-input-sha256", cli_inputs["fingerprint"]],
                 provider_factory=reject_provider)


def test_cli_dry_run_rebuilds_current_sources_without_provider_or_ledger(corpus, cli_inputs, tmp_path, monkeypatch, capsys):
    calls = []
    execute = a.campaign.execute
    def dry_execute(plan, fingerprint, directory, **kwargs):
        calls.append((directory, kwargs))
        assert kwargs["commit"] is False and kwargs["provider"] is None
        return execute(plan, fingerprint, tmp_path / "never-created", **kwargs)
    monkeypatch.setattr(cli.campaign, "execute", dry_execute)
    assert cli.main(cli_inputs["argv"], provider_factory=reject_provider) == 0
    result = json.loads(capsys.readouterr().out)
    assert result["mode"] == "dry-run" and result["inputFingerprint"] == cli_inputs["fingerprint"]
    assert result["uniqueKeys"] == corpus["plan"]["uniqueAudioFiles"]
    assert not (tmp_path / "never-created").exists()
    assert calls[0][0] == a.DEFAULT_REPO / "review-artifacts/guided-audio-20261003/api"
    assert calls[0][1]["lock_path"] == a.DEFAULT_REPO / "review-artifacts/.guided-audio-api.lock"


@pytest.mark.parametrize("fault", ["plan", "inventory", "fingerprint", "rates", "missing_fingerprint"])
def test_cli_stale_inputs_never_construct_provider_or_execute(corpus, cli_inputs, monkeypatch, fault):
    args = [*cli_inputs["argv"], "--commit"]
    if fault != "missing_fingerprint":
        args += ["--expected-input-sha256", cli_inputs["fingerprint"] if fault != "fingerprint" else "f" * 64]
    if fault == "plan":
        plan = copy.deepcopy(corpus["plan"])
        plan["groups"][0]["items"][0]["source_text"] = "Changed."
        cli_inputs["plan"].write_text(json.dumps(plan), encoding="utf-8")
    elif fault == "inventory":
        inventory = json.loads(cli_inputs["inventory"].read_bytes())
        inventory["entries"][0]["coordinates"].pop()
        cli_inputs["inventory"].write_text(json.dumps(inventory), encoding="utf-8")
    elif fault == "rates":
        rates = copy.deepcopy(cli_inputs["rates"])
        rates["mode"] = "pilot"
        cli_inputs["rates_path"].write_text(json.dumps(rates), encoding="utf-8")
    monkeypatch.setattr(a, "assert_checked_in_code", lambda *args: None)
    monkeypatch.setattr(cli.campaign, "execute", lambda *args, **kwargs: pytest.fail("invalid inputs reached executor"))
    with pytest.raises(ValueError):
        cli.main(args, provider_factory=reject_provider)


@pytest.mark.parametrize("selection", [["--limit", "3"], ["--sample-per-voice"]])
def test_cli_valid_commit_revalidates_before_provider_and_keeps_shared_root(corpus, cli_inputs, monkeypatch, capsys, selection):
    events, captured = [], {}
    monkeypatch.setattr(a, "assert_checked_in_code", lambda *args: events.append("checked-in"))
    class Provider:
        def close(self):
            events.append("closed")
    def factory(key):
        assert events == ["checked-in"]
        events.append("provider")
        return Provider()
    def fake_execute(plan, fingerprint, directory, **kwargs):
        assert events == ["checked-in", "provider"]
        captured.update(plan=plan, fingerprint=fingerprint, directory=directory, **kwargs)
        return {"mode": "commit", "dispatched": 0}
    monkeypatch.setattr(cli.campaign, "execute", fake_execute)
    args = [*cli_inputs["argv"], "--commit", "--expected-input-sha256", cli_inputs["fingerprint"], *selection]
    assert cli.main(args, provider_factory=factory) == 0
    assert events == ["checked-in", "provider", "closed"]
    assert captured["fingerprint"] == cli_inputs["fingerprint"] and captured["plan"] == corpus["plan"]
    assert captured["directory"] == a.DEFAULT_REPO / "review-artifacts/guided-audio-20261003/api"
    assert captured["lock_path"] == a.DEFAULT_REPO / "review-artifacts/.guided-audio-api.lock"
    assert captured["commit"] is True and captured["rate_evidence"] == cli_inputs["rates"]
    assert captured["sample_per_voice"] is (selection[0] == "--sample-per-voice")
    assert captured["limit"] == (3 if selection[0] == "--limit" else None)
    assert json.loads(capsys.readouterr().out)["mode"] == "commit"
