"""Offline Japanese adapter contracts; every approval and receipt is synthetic.

Works from this scratch directory or orchestrator/tests after explicit staging.
Use pytest -p no:cacheprovider with bytecode disabled and a scratch --basetemp.
No provider, real campaign ledger, app source or sealed queue is written.
"""
import copy
from decimal import Decimal
import importlib.util
import json
from pathlib import Path

import pytest

HERE = Path(__file__).resolve().parent
ROOT = next((p / "orchestrator" for p in HERE.parents if (p / "orchestrator/scripts/run_guided_japanese_b1_batch.py").is_file()), HERE.parent)
CANDIDATE = ROOT / "scripts/run_guided_japanese_b1_batch.py"
spec = importlib.util.spec_from_file_location("japanese_b1_candidate", CANDIDATE)
runner = importlib.util.module_from_spec(spec)
spec.loader.exec_module(runner)
campaign = runner.campaign
REAL_EXPORT = runner.export_japanese


def save(root, name, value):
    path = root / name
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return {"file": name, "sha256": campaign.digest(path.read_bytes())}


PARTICLES = "を が は に で の と も へ から まで より か ね よ には では とは からは までは にも でも とも のは のが のも"
COPULAS = "です でした ですか ですね ですよ ですが でしたか なんです なんですが"
SURU = "する します しました しません して した しています していました しましたか してしまって してしまいました"
KANA = "アイウエオカキクケコ"


def trophy_of(path, lesson):
    return "トロ" + KANA[path - 1] + KANA[lesson - 1]


def synthetic_material():
    """Independent Python fixture, including the complete nonspoken reading sheet."""
    base = {"de": "Künstliche Prüfdaten", "en": "Synthetic test only"}
    translated = lambda text: {"targetText": text, "baseText": dict(base)}
    specification = {
        "status": "architect-spec", "targetLanguage": "Japanese", "targetLanguageCode": "ja-JP",
        "baseLocales": ["de", "en"], "baseLanguage": "German", "registerPolicy": "Synthetic",
        "genderSafety": "Synthetic", "orthography": "Synthetic", "mechanicalValidationRules": ["Synthetic"],
        "segmentation": {"trophyAnchoring": f"Closed tails {PARTICLES} {COPULAS}; (suruNoun trophies: {trophy_of(1, 2)}, {trophy_of(2, 2)}): {SURU}."},
        "paths": [{"pathNumber": p, "lessons": [{"number": n, "trophy": trophy_of(p, n), "beat": "SYNTHETIC ONLY"} for n in range(1, 11)]} for p in range(1, 11)],
    }
    drafts, sheet_paths = [], []
    for p in (1, 2):
        lessons, sheet_lessons = [], []
        for n in range(1, 11):
            trophy = trophy_of(p, n)
            tail, tail_kind = ("しました", "suru") if n == 2 else ("ですが", "copula") if n == 3 else ("", "none") if n == 4 else ("が", "particle")
            unit = trophy + tail
            opening = "山田さん、 昨日の 会議は どうでしたか。"
            first = f"昨日 {unit} 友達と 駅前で 二時間 待ちました。"
            first_kana = f"きのう {unit} ともだちと えきまえで にじかん まちました。"
            followup = "それは 大変ですね。 何時に 帰りましたか。"
            second = "結局、 夜 十時に 家に 帰りました。"
            example = f"{trophy}は 駅の 近くに あります。"
            chunks = [("昨日", "きのう"), (unit, unit), ("友達と", "ともだちと"), ("駅前で", "えきまえで"), ("二時間", "にじかん"), ("待ちました。", "まちました。")]
            terms = [("遅れる", "おくれる"), ("友達", "ともだち"), ("駅", "えき"), ("二時間", "にじかん"), ("待つ", "まつ"), ("結局", "けっきょく")]
            lesson = {
                "slug": f"ja-fixture-p{p}-l{n}", "title": dict(base), "situation": dict(base), "pedagogicalGoal": "Synthetic only", "register": "neutral",
                "dialogue": list(map(translated, [opening, first, followup, second])),
                "pattern": {"label": "Synthetic", "rule": dict(base), "examples": [dict(translated(first), highlight="待ちました"), dict(translated("昨日 買った 本を 読みました。"), highlight="買った")]},
                "cloze": ["結局、 夜 ", {"kind": "choice", "answer": "十時に", "choices": ["十時に", "九時に", "八時に", "七時に"]}, " 家に ", {"kind": "form", "answer": "帰りました", "cue": "Synthetic form", "choices": ["帰りました", "帰ります", "帰って", "帰りたい"]}, "。"],
                "chunks": [translated(x) for x, _ in chunks], "terms": [translated(x) for x, _ in terms],
                "recall": {"before": f"昨日 {unit} ", "answer": "友達と", "after": " 駅前で 二時間 待ちました。", "fallbackChoices": ["友達と", "先生と", "家族と", "同僚と"]},
                "speakRequired": [unit, "友達と", "待ちました"],
                "sceneCaption": {"de": f'Hier: „{opening}“', "en": f'Here: “{opening}”'},
                "trophyWord": {"word": trophy, "meaning": dict(base), "example": example, "whyThisWord": dict(base)},
                "distractors": ["電車で", "今日"], "placeholderCaption": dict(base), "songMood": "Synthetic", "visualNotes": "Synthetic",
            }
            rows = [
                ("/dialogue/0/targetText", opening, "やまださん、 きのうの かいぎは どうでしたか。"),
                ("/dialogue/1/targetText", first, first_kana),
                ("/dialogue/2/targetText", followup, "それは たいへんですね。 なんじに かえりましたか。"),
                ("/dialogue/3/targetText", second, "けっきょく、 よる じゅうじに いえに かえりました。"),
                ("/pattern/examples/0/targetText", first, first_kana),
                ("/pattern/examples/1/targetText", "昨日 買った 本を 読みました。", "きのう かった ほんを よみました。"),
                ("/trophyWord/word", trophy, trophy), ("/trophyWord/example", example, f"{trophy}は えきの ちかくに あります。"),
                *[(f"/chunks/{i}/targetText", x, kana) for i, (x, kana) in enumerate(chunks)],
                *[(f"/terms/{i}/targetText", x, kana) for i, (x, kana) in enumerate(terms)],
                ("/recall/answer", "友達と", "ともだちと"), ("/cloze/1/answer", "十時に", "じゅうじに"), ("/cloze/3/answer", "帰りました", "かえりました"),
                ("/distractors/0", "電車で", "でんしゃで"), ("/distractors/1", "今日", "きょう"),
            ]
            lessons.append(lesson)
            sheet_lessons.append({"slug": lesson["slug"], "readings": [{"jsonPointer": ptr, "canonical": text, "kana": kana} for ptr, text, kana in rows],
                "speakTokens": [{"canonical": unit, "kana": unit}, {"canonical": "友達と", "kana": "ともだちと"}, {"canonical": "待ちました", "kana": "まちました"}],
                "trophySurfaces": {"firstReply": {"canonical": trophy, "surfaceUnit": unit, "tail": tail, "tailKind": tail_kind}, "example": {"canonical": trophy, "surfaceUnit": trophy + "は", "tail": "は", "tailKind": "particle"}}})
        drafts.append({"schemaVersion": 1, "status": "draft", "level": "B1", "targetLanguage": "Japanese", "targetLanguageCode": "ja-JP", "baseLanguage": "German", "pathNumber": p,
            "title": dict(base), "subtitle": dict(base), "anchor": "SYNTHETIC ONLY", "lessons": lessons})
        sheet_paths.append({"pathNumber": p, "lessons": sheet_lessons})
    return specification, drafts, {"schemaVersion": 1, "targetLanguage": "Japanese", "paths": sheet_paths}


def voice_fixture():
    return {"method": "GET only", "providerVoices": [{"requestedId": runner.VOICE_ID, "voice_id": runner.VOICE_ID, "name": "SYNTHETIC ONLY", "status": 200, "sharingRate": 1,
        "labels": {"language": "ja", "gender": "female", "accent": "standard"}, "verified_languages": [{"language": "ja", "locale": "ja-JP", "accent": "standard"}]}]}


def sidecar_counts(sheet):
    lessons = [l for p in sheet["paths"] for l in p["lessons"]]
    return {"readings": sum(len(l["readings"]) for l in lessons), "tokens": sum(len(l["speakTokens"]) for l in lessons), "surfaces": sum(len(l["trophySurfaces"]) for l in lessons)}


@pytest.fixture
def bundle(tmp_path, monkeypatch):
    root = tmp_path
    specification, drafts, sheet = synthetic_material()
    spec_binding = save(root, f"{runner.CONTENT_ROOT}/specification.json", specification)
    reading_binding = save(root, f"{runner.CONTENT_ROOT}/reading-sheet.json", sheet)
    entries, inputs, sources = [], [], {}
    for source in drafts:
        n = source["pathNumber"]
        entry = {**save(root, f"{runner.CONTENT_ROOT}/p{n}.json", source), "targetLanguage": "Japanese", "pathNumber": n, "reviewedVoiceId": runner.VOICE_ID, "specification": spec_binding, "readingSheet": reading_binding}
        entries.append(entry); sources[entry["file"]] = entry["sha256"]
        inputs.append({"entry": entry, "source": source, "specification": specification, "readingSheet": sheet})
    manifest = {"schemaVersion": 1, "kind": "japanese-b1-content-manifest", "status": "reviewed-staged", "sources": entries, "voiceEvidence": {"Japanese": save(root, "voice.json", voice_fixture())}}
    counts = sidecar_counts(sheet)
    findings = [{"id": "SYNTHETIC-HOLD", "severity": "MEDIUM", "issue": "Synthetic unspoken exercise hold", "affectsLocalTts": False}]
    for name in ("fableReview", "independentReview"):
        review = {"schemaVersion": 1, "kind": name, "verdict": "PASS", "unresolvedFindings": 0, "coverage": "full-content-all-fields", "reviewedSources": sources,
            "reviewedSpecifications": {spec_binding["file"]: spec_binding["sha256"]}, "reviewedReadingSheets": {reading_binding["file"]: reading_binding["sha256"]},
            "reviewer": {"id": "SYNTHETIC ONLY", "kind": "independent-agent", "authorOfReviewedContent": False},
            "localTtsContentVerdict": "PASS", "unresolvedLocalTtsBlockers": [], "publicationVerdict": "REWORK", "unresolvedPublicationFindings": copy.deepcopy(findings)}
        if name == "fableReview":
            review.update(model="claude-fable-5-1", exactReplayEdits=0, rawReview={"verdict": "PASS", "edits": [], "readThrough": [{"file": f"japanese-p{n}.json", "lessonsRead": list(range(1, 11))} for n in (1, 2)],
                "readingSheetRead": {"file": "japanese-p1-p2-reading-review.json", "pathNumbers": [1, 2], "lessonsReadByPath": {str(n): list(range(1, 11)) for n in (1, 2)},
                    "readingsCount": counts["readings"], "speakTokenPairsCount": counts["tokens"], "trophySurfaceRecordsCount": counts["surfaces"]}})
        else:
            review["rawReview"] = {"verdict": "REWORK", "localTtsContentVerdict": "PASS", "unresolvedLocalTtsBlockers": [], "publicationVerdict": "REWORK",
                "remainingPublicationFindings": copy.deepcopy(findings), "fullCoverage": {"personallyReadEveryField": True},
                "reviewedReadingSheetSha256": reading_binding["sha256"], "readingSheetCoverage": {"personallyReadEveryRow": True, **counts}}
        manifest[name] = save(root, f"{name}.json", review)
    path = root / "manifest.json"; save(root, path.name, manifest)
    monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "synthetic-python", "sha256": "0" * 64}]})
    monkeypatch.setattr(runner, "code_evidence", lambda root: [{"path": "synthetic-code.py", "sha256": "0" * 64}])
    def fake_export(root, inputs):
        return {"schemaVersion": 1, "projectionVersion": runner.VERSION, "rows": [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])],
            "sourceAuthority": [{"path": "synthetic-gate.ts", "sha256": "0" * 64}], "runtimeAuthority": {"files": [{"path": "synthetic-node", "sha256": "0" * 64}], "validatorBundleSha256": "a" * 64},
            "validation": {"validator": runner.GATE, "fullJapaneseSpecification": True, "fullReadingSheet": True, "passed": len(inputs)}}
    monkeypatch.setattr(runner, "export_japanese", fake_export)
    return root, path, manifest, inputs


def seal_execution(bundle):
    root, manifest, _, _ = bundle
    plan, _ = runner.prepare_inputs(root, manifest)
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": 1, "voices": {runner.VOICE_ID: {"sharingRate": 1, "creditMultiplier": 10, "verification": "SYNTHETIC ONLY"}}}}}
    save(root, "plan.json", plan); save(root, "rates.json", rates)
    review = {"schemaVersion": 1, "kind": "japanese-b1-execution-review", "verdict": "PASS", "unresolvedFindings": 0, "scope": "full-run-and-rates",
        "reviewer": {"id": "SYNTHETIC ONLY", "kind": "independent-agent", "authorOfExecutionCode": False},
        **runner.review_bindings(plan, (root / "plan.json").read_bytes(), (root / "rates.json").read_bytes())}
    save(root, "review.json", review)
    return tuple(root / name for name in ("plan.json", "rates.json", "review.json"))


def replace_review(bundle, kind, mutate):
    root, path, manifest, _ = bundle
    name = manifest[kind]["file"]
    review = json.loads((root / name).read_bytes()); mutate(review)
    manifest[kind] = save(root, name, review); save(root, path.name, manifest)


def test_real_gate_two_paths_and_canonical_only_export(bundle):
    inputs = bundle[3]
    result = REAL_EXPORT(runner.ROOT, inputs)
    assert len(result["rows"]) == 400
    assert result["rows"] == [row for item in inputs for row in runner.expected_rows(item["source"], item["entry"])]
    assert sum("/dialogue/" in row["sourcePointer"] for row in result["rows"]) == 80
    assert sum(row["playbackSurface"] == "trophyExample" for row in result["rows"]) == 20
    assert all(not any(x in row["sourcePointer"] for x in ("readings", "kana", "speakTokens", "distractors", "cloze", "recall")) for row in result["rows"])
    canonical = inputs[0]["source"]["lessons"][0]["dialogue"][1]["targetText"]
    kana = inputs[0]["readingSheet"]["paths"][0]["lessons"][0]["readings"][1]["kana"]
    assert canonical != kana and canonical in [row["text"] for row in result["rows"]] and kana not in [row["text"] for row in result["rows"]]
    paths = {item["path"] for item in result["sourceAuthority"]}
    assert {runner.GATE, "frontend/node_modules/zod/package.json", "frontend/src/data/guidedLessonsAuthoring.ts", "frontend/package-lock.json"} <= paths
    assert len(result["runtimeAuthority"]["validatorBundleSha256"]) == 64 and len(result["runtimeAuthority"]["files"]) > 5


@pytest.mark.parametrize("mutation", ["language", "locale", "short_spec", "allocation", "duplicate_trophy", "latin", "digits", "spacing", "plain_final", "missing_terms", "unknown_field", "sheet_path_missing", "reading_missing", "reading_duplicate", "reading_canonical", "reading_kanji", "reading_joined", "speak_order", "surface_tail"])
def test_real_gate_rejects_native_or_sidecar_failure(bundle, mutation):
    inputs = copy.deepcopy(bundle[3]); item = inputs[0]; lesson = item["source"]["lessons"][0]; sheet = item["readingSheet"]; sl = sheet["paths"][0]["lessons"][0]
    if mutation == "language": item["source"]["targetLanguage"] = "Korean"
    elif mutation == "locale": item["source"]["targetLanguageCode"] = "ko-KR"
    elif mutation == "short_spec": item["specification"]["paths"].pop()
    elif mutation == "allocation": item["specification"]["paths"][0]["lessons"][0]["trophy"] = "ベツコトバ"
    elif mutation == "duplicate_trophy": item["specification"]["paths"][9]["lessons"][9]["trophy"] = trophy_of(1, 1)
    elif mutation == "latin": lesson["terms"][0]["targetText"] = "romaji"
    elif mutation == "digits": lesson["terms"][3]["targetText"] = "2時間"
    elif mutation == "spacing": lesson["dialogue"][1]["targetText"] = lesson["dialogue"][1]["targetText"].replace(" ", "  ", 1)
    elif mutation == "plain_final": lesson["dialogue"][3]["targetText"] = "結局、 夜 十時に 家に 帰った。"
    elif mutation == "missing_terms": lesson["terms"].pop()
    elif mutation == "unknown_field": lesson["unknownSpokenText"] = "昨日。"
    elif mutation == "sheet_path_missing": sheet["paths"].pop()
    elif mutation == "reading_missing": sl["readings"].pop()
    elif mutation == "reading_duplicate": sl["readings"].append(copy.deepcopy(sl["readings"][0]))
    elif mutation == "reading_canonical": sl["readings"][0]["canonical"] = "違います。"
    elif mutation == "reading_kanji": sl["readings"][0]["kana"] = sl["readings"][0]["canonical"]
    elif mutation == "reading_joined": sl["readings"][1]["kana"] = sl["readings"][1]["kana"].replace(" ", "", 1)
    elif mutation == "speak_order": sl["speakTokens"].reverse()
    else: sl["trophySurfaces"]["firstReply"]["tail"] = "なんて"
    with pytest.raises(campaign.CampaignError, match="japanese_b1_offline_validation_failed"):
        REAL_EXPORT(runner.ROOT, inputs)


@pytest.mark.parametrize("text,accepted", [("昨日 駅で 待ちました。", True), ("が", True), ("トロアアが", True), ("", False), (None, False), (" 駅", False), ("駅 ", False), ("駅  前", False), ("駅\t前", False), ("2時間", False), ("romaji", False), ("。", False), ("駅。。。", False), ("か\u3099", False), ("駅\u200b", False), ("<break/>", False)])
def test_spoken_alphabet_is_total_and_preserves_segmentation(text, accepted):
    assert runner.japanese_spoken(text) is accepted


def test_complete_plan_binds_reading_sheet_without_synthesizing_it(bundle):
    root, manifest, _, inputs = bundle
    plan, authority = runner.prepare_inputs(root, manifest)
    assert plan["usageRows"] == 400 and len(plan["groups"]) == 2 and plan["publicationAuthorized"] is False
    sheet_name = f"{runner.CONTENT_ROOT}/reading-sheet.json"
    assert plan["readingSheetEvidence"] == {sheet_name: campaign.digest((root / sheet_name).read_bytes())}
    assert sheet_name in {row["path"] for row in authority}  # Must reach HEAD guard, not just a wrapper.
    assert "SYNTHETIC-HOLD" in plan["publicationHolds"]
    for p, group in enumerate(plan["groups"], 1):
        assert len(group["items"]) == 200
        assert group["proposedVoiceProfile"]["provider_voice_id"] == runner.VOICE_ID
        assert group["proposedVoiceProfile"]["target_language_code"] == "ja"
        assert group["nativeVoiceVerification"]["verifiedLocale"] == "ja-JP"
        assert all(row["source_text"] == row["normalized_text"] for row in group["items"])
        assert all(row["sourceCoordinate"]["targetLanguageCode"] == "ja-JP" for row in group["items"])
        assert all(row["lesson_id"].startswith(f"japanese-b1-practical-{p}-") for row in group["items"])
    assert sidecar_counts(inputs[0]["readingSheet"]) == {"readings": 500, "tokens": 60, "surfaces": 40}


@pytest.mark.parametrize("kind", ["fableReview", "independentReview"])
@pytest.mark.parametrize("mutation", ["outer_rework", "wrong_sources", "wrong_spec", "wrong_reading", "partial_coverage", "boolean_count", "wrong_author", "missing_local", "local_rework", "local_blocker", "boolean_zero", "missing_findings", "false_publication_pass", "bad_finding", "duplicate_finding"])
def test_content_guard_checks_resealed_envelope_semantics(bundle, kind, mutation):
    def mutate(review):
        if mutation == "outer_rework": review["verdict"] = "REWORK"
        elif mutation == "wrong_sources": review["reviewedSources"] = {}
        elif mutation == "wrong_spec": review["reviewedSpecifications"] = {}
        elif mutation == "wrong_reading": review["reviewedReadingSheets"] = {}
        elif mutation == "partial_coverage": review["coverage"] = "spoken-only"
        elif mutation == "boolean_count": review["unresolvedFindings"] = False
        elif mutation == "wrong_author":
            if kind == "fableReview": review["model"] = "other"
            else: review["reviewer"]["authorOfReviewedContent"] = True
        elif mutation == "missing_local": review.pop("localTtsContentVerdict")
        elif mutation == "local_rework": review["localTtsContentVerdict"] = "REWORK"
        elif mutation == "local_blocker": review["unresolvedLocalTtsBlockers"] = ["blocked"]
        elif mutation == "boolean_zero": review["unresolvedLocalTtsBlockers"] = False
        elif mutation == "missing_findings": review.pop("unresolvedPublicationFindings")
        elif mutation == "false_publication_pass": review["publicationVerdict"] = "PASS"
        elif mutation == "bad_finding": review["unresolvedPublicationFindings"] = ["not a full finding"]
        else: review["unresolvedPublicationFindings"] *= 2
    replace_review(bundle, kind, mutate)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(bundle[0], bundle[1])


@pytest.mark.parametrize("mutation", ["missing_path", "partial_lessons", "wrong_edit_count", "boolean_edit_count", "reading_file", "reading_paths", "reading_lessons", "reading_rows", "reading_tokens", "reading_surfaces"])
def test_fable_raw_full_content_and_reading_coverage_required(bundle, mutation):
    def mutate(review):
        raw = review["rawReview"]; reading = raw["readingSheetRead"]
        if mutation == "missing_path": raw["readThrough"].pop()
        elif mutation == "partial_lessons": raw["readThrough"][0]["lessonsRead"].pop()
        elif mutation == "wrong_edit_count": review["exactReplayEdits"] = 1
        elif mutation == "boolean_edit_count": review["exactReplayEdits"] = False
        elif mutation == "reading_file": reading["file"] = "another.json"
        elif mutation == "reading_paths": reading["pathNumbers"] = [1]
        elif mutation == "reading_lessons": reading["lessonsReadByPath"]["2"].pop()
        elif mutation == "reading_rows": reading["readingsCount"] -= 1
        elif mutation == "reading_tokens": reading["speakTokenPairsCount"] -= 1
        else: reading["trophySurfaceRecordsCount"] -= 1
    replace_review(bundle, "fableReview", mutate)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(bundle[0], bundle[1])


@pytest.mark.parametrize("mutation", ["spoken_rework", "spoken_blocker", "boolean_zero", "finding_changed", "finding_removed", "remaining_ids_only", "publication_pass", "no_full_read", "reading_hash", "no_reading_read", "reading_rows", "reading_tokens", "reading_surfaces"])
def test_independent_raw_exact_findings_and_sidecar_coverage_required(bundle, mutation):
    def mutate(review):
        raw = review["rawReview"]
        if mutation == "spoken_rework": raw["localTtsContentVerdict"] = "REWORK"
        elif mutation == "spoken_blocker": raw["unresolvedLocalTtsBlockers"] = ["blocked"]
        elif mutation == "boolean_zero": raw["unresolvedLocalTtsBlockers"] = False
        elif mutation == "finding_changed": raw["remainingPublicationFindings"][0]["issue"] = "different"
        elif mutation == "finding_removed": raw["remainingPublicationFindings"] = []
        elif mutation == "remaining_ids_only": raw["remainingPublicationFindings"] = ["SYNTHETIC-HOLD"]
        elif mutation == "publication_pass": raw["publicationVerdict"] = "PASS"
        elif mutation == "no_full_read": raw["fullCoverage"]["personallyReadEveryField"] = False
        elif mutation == "reading_hash": raw["reviewedReadingSheetSha256"] = "0" * 64
        elif mutation == "no_reading_read": raw["readingSheetCoverage"]["personallyReadEveryRow"] = False
        else: raw["readingSheetCoverage"][{"reading_rows": "readings", "reading_tokens": "tokens", "reading_surfaces": "surfaces"}[mutation]] -= 1
    replace_review(bundle, "independentReview", mutate)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(bundle[0], bundle[1])


@pytest.mark.parametrize("mutation", ["duplicate_path", "third_path", "boolean_path", "source_bytes", "spec_bytes", "sidecar_bytes", "sidecar_path", "sidecar_omitted"])
def test_manifest_source_and_sidecar_authority_fail_closed(bundle, mutation):
    root, path, manifest, _ = bundle; entry = manifest["sources"][0]
    if mutation == "duplicate_path": manifest["sources"][1] = copy.deepcopy(entry)
    elif mutation == "third_path": entry["pathNumber"] = 3
    elif mutation == "boolean_path": entry["pathNumber"] = True
    elif mutation == "sidecar_path": entry["readingSheet"]["file"] = "../reading-sheet.json"
    elif mutation == "sidecar_omitted": entry.pop("readingSheet")
    else:
        name = entry["file"] if mutation == "source_bytes" else entry["specification"]["file"] if mutation == "spec_bytes" else entry["readingSheet"]["file"]
        (root / name).write_bytes((root / name).read_bytes() + b" ")
    save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["drop_terms", "add_reading_audio", "replace_with_kana", "join_units", "spoof_language", "missing_bundle", "missing_runtime", "wrong_validation"])
def test_export_projection_cannot_rewrite_or_add_nonspoken_rows(bundle, monkeypatch, mutation):
    root, path, _, inputs = bundle; original = runner.export_japanese
    def changed(root, records):
        result = original(root, records)
        if mutation == "drop_terms": result["rows"] = [row for row in result["rows"] if "/terms/" not in row["sourcePointer"]]
        elif mutation == "add_reading_audio": result["rows"].append(dict(result["rows"][0], sourcePointer="/readings/0/kana"))
        elif mutation == "replace_with_kana": result["rows"][1]["text"] = inputs[0]["readingSheet"]["paths"][0]["lessons"][0]["readings"][1]["kana"]
        elif mutation == "join_units": result["rows"][1]["text"] = result["rows"][1]["text"].replace(" ", "", 1)
        elif mutation == "spoof_language": result["rows"][0]["targetLanguage"] = "Korean"
        elif mutation == "missing_bundle": result["runtimeAuthority"].pop("validatorBundleSha256")
        elif mutation == "missing_runtime": result["runtimeAuthority"]["files"] = []
        else: result["validation"]["fullReadingSheet"] = False
        return result
    monkeypatch.setattr(runner, "export_japanese", changed)
    with pytest.raises(campaign.CampaignError, match="complete_japanese_projection_required"): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("variable", ["NODE_OPTIONS", "NODE_PATH", "ESBUILD_BINARY_PATH", "TSX_TSCONFIG_PATH"])
def test_unreviewed_node_override_rejected_before_subprocess(bundle, monkeypatch, variable):
    monkeypatch.setenv(variable, "SYNTHETIC OVERRIDE")
    monkeypatch.setattr(runner.subprocess, "run", lambda *a, **k: pytest.fail("subprocess reached"))
    with pytest.raises(campaign.CampaignError, match="unreviewed_node_runtime_override"): REAL_EXPORT(runner.ROOT, bundle[3])


@pytest.mark.parametrize("mutation", ["locale", "gender", "language", "accent", "voice_id", "requested_id", "boolean_rate"])
def test_exact_akane_provider_evidence(bundle, mutation):
    root, path, manifest, _ = bundle; evidence = voice_fixture(); voice = evidence["providerVoices"][0]
    if mutation == "locale": voice["verified_languages"][0]["locale"] = None
    elif mutation in {"gender", "language", "accent"}: voice["labels"][mutation] = "wrong"
    elif mutation == "voice_id": voice["voice_id"] = "wrong"
    elif mutation == "requested_id": voice["requestedId"] = "wrong"
    else: voice["sharingRate"] = True
    manifest["voiceEvidence"]["Japanese"] = save(root, "voice.json", evidence); save(root, path.name, manifest)
    with pytest.raises(campaign.CampaignError, match="verified_akane_voice_evidence_required"): runner.prepare_inputs(root, path)


@pytest.mark.parametrize("mutation", ["plan_bytes", "rates_bytes", "review_kind", "review_boolean", "review_author", "fingerprint", "missing_expected", "head", "runtime", "exporter_runtime"])
def test_execution_guard_precedes_provider_ledger_and_lock(bundle, monkeypatch, mutation):
    root, manifest, _, _ = bundle; plan, rates, review = seal_execution(bundle)
    _, fingerprint, _ = runner.load_inputs(root, manifest, plan, rates, review)
    monkeypatch.setattr(runner.shared, "checked_in", lambda *a: pytest.fail("HEAD reached before changed-input rejection"))
    if mutation == "plan_bytes": plan.write_bytes(plan.read_bytes() + b" ")
    elif mutation == "rates_bytes": rates.write_bytes(rates.read_bytes() + b" ")
    elif mutation.startswith("review_"):
        value = json.loads(review.read_bytes())
        if mutation == "review_kind": value["kind"] = "korean-b1-execution-review"
        elif mutation == "review_boolean": value["unresolvedFindings"] = False
        else: value["reviewer"]["authorOfExecutionCode"] = True
        save(root, review.name, value)
    elif mutation == "fingerprint": fingerprint = "0" * 64
    elif mutation == "missing_expected": fingerprint = None
    elif mutation == "head": monkeypatch.setattr(runner.shared, "checked_in", lambda *a: (_ for _ in ()).throw(ValueError("HEAD mismatch")))
    elif mutation == "runtime": monkeypatch.setattr(runner.shared, "runtime_evidence", lambda: {"files": [{"path": "changed", "sha256": "1" * 64}]})
    else:
        original = runner.export_japanese
        def changed(root, inputs):
            value = original(root, inputs); value["runtimeAuthority"]["files"][0]["sha256"] = "1" * 64; return value
        monkeypatch.setattr(runner, "export_japanese", changed)
    monkeypatch.setattr(runner.ceb, "require_existing_campaign", lambda *a: pytest.fail("ledger reached"))
    monkeypatch.setattr(campaign, "run_lock", lambda *a: pytest.fail("lock reached"))
    argv = ["--manifest", str(manifest), "--plan", str(plan), "--rates", str(rates), "--review", str(review), "--commit"]
    if fingerprint: argv += ["--expected-input-sha256", fingerprint]
    reason = ("HEAD mismatch" if mutation == "head" else "rebuilt_plan_mismatch" if mutation in {"runtime", "exporter_runtime"}
              else "reviewed_input_fingerprint_required" if mutation in {"fingerprint", "missing_expected"}
              else "independent_exact_execution_and_rates_review_required")
    with pytest.raises((campaign.CampaignError, ValueError), match=reason):
        runner.main(argv, repo_root=root, provider_factory=lambda *a: pytest.fail("provider constructed"))


def test_dry_run_and_missing_campaign_do_not_create_state(bundle, monkeypatch):
    root, manifest, _, _ = bundle; paths = seal_execution(bundle)
    args = ["--manifest", str(manifest), "--plan", str(paths[0]), "--rates", str(paths[1]), "--review", str(paths[2])]
    assert runner.main(args, repo_root=root, provider_factory=lambda *a: pytest.fail("provider constructed")) == 0
    assert not (root / runner.API_DIRECTORY).exists() and not (root / runner.LOCK_PATH).exists()
    _, fingerprint, _ = runner.load_inputs(root, manifest, *paths)
    monkeypatch.setattr(runner.shared, "checked_in", lambda *a: None)
    with pytest.raises(campaign.CampaignError, match="existing_campaign_required"):
        runner.main(args + ["--commit", "--expected-input-sha256", fingerprint], repo_root=root, provider_factory=lambda *a: pytest.fail("provider constructed"))
    assert not (root / runner.API_DIRECTORY).exists() and not (root / runner.LOCK_PATH).exists()


def test_reading_sheet_reaches_mandatory_head_check(bundle, monkeypatch):
    root, manifest, _, _ = bundle; paths = seal_execution(bundle); _, fingerprint, _ = runner.load_inputs(root, manifest, *paths)
    seen = []
    def inspect(root, authority):
        seen.extend(authority)
        assert f"{runner.CONTENT_ROOT}/reading-sheet.json" in {x["path"] for x in authority}
        raise ValueError("uncommitted reading sidecar")
    monkeypatch.setattr(runner.shared, "checked_in", inspect)
    with pytest.raises(ValueError, match="uncommitted reading sidecar"):
        runner.load_inputs(root, manifest, *paths, commit=True, expected=fingerprint)
    assert seen


def test_head_guard_compares_working_and_committed_reading_bytes(tmp_path, monkeypatch):
    path = tmp_path / "reading-sheet.json"; path.write_bytes(b"synthetic reviewed reading sheet\n")
    authority = [{"path": path.name, "sha256": campaign.digest(path.read_bytes())}]
    class Result:
        returncode = 0
        stdout = b"different HEAD reading sheet\n"
    monkeypatch.setattr(runner.shared.subprocess, "run", lambda *a, **k: Result())
    with pytest.raises(ValueError, match="source_or_code_not_checked_in"):
        runner.shared.checked_in(tmp_path, authority)
    Result.stdout = path.read_bytes()
    runner.shared.checked_in(tmp_path, authority)
    path.write_bytes(b"modified after plan was sealed\n")
    with pytest.raises(ValueError, match="authority_bytes_changed"):
        runner.shared.checked_in(tmp_path, authority)


@pytest.mark.parametrize("condition,reason", [("exact", None), ("cap_lowered", "existing_campaign_required"), ("cap_raised", "existing_campaign_required"),
    ("extra_campaign", "existing_campaign_required"), ("anchor_missing", "established_campaign_anchor_required"), ("positive_receipt_missing", "established_campaign_receipt_required")])
def test_existing_campaign_guard_is_read_only_and_keeps_fixed_anchor(tmp_path, monkeypatch, condition, reason):
    """The real guard reads a fake connection; no SQLite file is created."""
    import io
    events = []
    expected = (tmp_path / runner.API_DIRECTORY / "campaign.sqlite3").resolve()
    def open_header(path, mode):
        assert path == expected and mode == "rb"
        return io.BytesIO(b"SQLite format 3\x00")
    class Rows:
        def __init__(self, rows): self.rows = rows
        def fetchall(self): return self.rows
        def fetchone(self): return self.rows[0] if self.rows else None
    class ReadOnlyDatabase:
        def execute(self, query, parameters=()):
            assert query.startswith("SELECT ")
            events.append(query)
            if "FROM campaign" in query:
                cap = 199999 if condition == "cap_lowered" else 200001 if condition == "cap_raised" else 200000
                return Rows([(1, cap), (2, cap)] if condition == "extra_campaign" else [(1, cap)])
            assert parameters == ("9e179954d1e38b956f7e439687c110a9d055f7c2ae10c32281beb11a04cdf1af",)
            if "FROM manifests" in query: return Rows([] if condition == "anchor_missing" else [(1,)])
            assert "state='ready'" in query and "CAST(charged AS REAL)>0" in query
            return Rows([] if condition == "positive_receipt_missing" else [(1,)])
        def close(self): events.append("closed")
    def connect_readonly(location, **kwargs):
        assert location == expected.as_uri() + "?mode=ro" and kwargs == {"uri": True, "timeout": 30}
        return ReadOnlyDatabase()
    monkeypatch.setattr(Path, "open", open_header)
    monkeypatch.setattr(runner.ceb.sqlite3, "connect", connect_readonly)
    if reason:
        with pytest.raises(campaign.CampaignError, match=reason): runner.ceb.require_existing_campaign(tmp_path)
    else:
        runner.ceb.require_existing_campaign(tmp_path)
        assert len(events) == 4
    assert events[-1] == "closed"


@pytest.mark.parametrize("mutation", ["pilot", "old_model", "extra_voice", "discount", "sharing", "boolean_sharing"])
def test_full_rate_scope_is_exact(bundle, mutation):
    root, manifest, _, _ = bundle; _, path, _ = seal_execution(bundle); plan, _ = runner.prepare_inputs(root, manifest)
    rates = json.loads(path.read_bytes()); model = rates["models"]["eleven_v4"]
    if mutation == "pilot": rates["mode"] = "pilot"
    elif mutation == "old_model": rates["models"]["eleven_multilingual_v2"] = model
    elif mutation == "extra_voice": model["voices"]["other"] = {}
    elif mutation == "discount": model["voices"][runner.VOICE_ID]["creditMultiplier"] = "0.5"
    else: model["voices"][runner.VOICE_ID]["sharingRate"] = True if mutation == "boolean_sharing" else 2
    with pytest.raises(campaign.CampaignError): runner.validate_rates(rates, plan)


def test_positive_akane_v4_receipt_required_without_network():
    class Offline(campaign.ElevenLabsTransport):
        def __init__(self): pass
        def _read(self, path):
            return [{"model_id": "eleven_v4", "can_do_text_to_speech": True, "model_rates": {"character_cost_multiplier": 1}}] if path == "models" else {"voice_id": runner.VOICE_ID, "sharing": {"rate": 1}}
        def synthesize(self, request): pytest.fail("not a synthesis test")
    rates = {"mode": "receipt-verified", "models": {"eleven_v4": {"modelCharacterCostMultiplier": 1, "voices": {runner.VOICE_ID: {"sharingRate": 1, "creditMultiplier": 10, "verification": "SYNTHETIC ONLY"}}}}}
    receipt = {"voice_id": runner.VOICE_ID, "model_id": "eleven_v4", "text": "昨日", "charged": "1"}
    for receipts in ([], [dict(receipt, charged="0")], [dict(receipt, voice_id="wrong")], [dict(receipt, model_id="eleven_multilingual_v2")], [dict(receipt, charged="21")]):
        with pytest.raises(campaign.CampaignError, match="matching_voice_model_receipt_required"):
            Offline().preflight({(runner.VOICE_ID, "eleven_v4")}, rates, receipts)
    assert Offline().preflight({(runner.VOICE_ID, "eleven_v4")}, rates, [receipt]) == {(runner.VOICE_ID, "eleven_v4"): Decimal(10)}


def test_budget_exhaustion_rolls_back_before_reservation_without_a_ledger():
    """Exercise actual reserve() control flow using a nonpersisting DB spy."""
    class Empty:
        def fetchone(self): return None
    class Database:
        def __init__(self): self.statements = []; self.rolled_back = False
        def execute(self, query, parameters=()):
            self.statements.append(query)
            if query.startswith("INSERT"): pytest.fail("over-cap reservation inserted")
            return Empty()
        def rollback(self): self.rolled_back = True
        def commit(self): pytest.fail("over-cap reservation committed")
    local = object.__new__(campaign.Campaign); local.db = Database(); local.committed = lambda: Decimal(199999)
    with pytest.raises(campaign.CampaignError, match="campaign_cap_exceeded"):
        local.reserve({"cache_key": "synthetic"}, 2)
    assert local.db.statements[0] == "BEGIN IMMEDIATE" and local.db.rolled_back


def test_shared_lock_and_anchor_are_used_before_synthesis(bundle, monkeypatch):
    """Run actual execute() sequencing with inert campaign/provider boundaries."""
    from contextlib import contextmanager
    root, manifest, _, _ = bundle; plan, _ = runner.prepare_inputs(root, manifest); events = []
    @contextmanager
    def locked(path):
        assert path == root / runner.LOCK_PATH
        events.append("lock")
        try: yield
        finally: events.append("unlock")
    class NoDatabase:
        def close(self): events.append("close")
    class InertCampaign:
        def __init__(self, directory, fingerprint):
            assert events == ["lock"]; events.append("campaign"); self.db = NoDatabase()
        def check_clear(self): events.append("clear")
        def rate_receipts(self): return []
        def reserve(self, request, cost):
            assert events[-2:] == ["anchor", "preflight"]; events.append("reserve"); raise campaign.CampaignError("campaign_cap_exceeded")
    class Provider:
        def preflight(self, pairs, *args): events.append("preflight"); return {p: Decimal(10) for p in pairs}
        def synthesize(self, request): pytest.fail("synthesis reached after exhausted budget")
    monkeypatch.setattr(campaign, "run_lock", locked); monkeypatch.setattr(campaign, "Campaign", InertCampaign)
    monkeypatch.setattr(runner.ceb, "require_existing_campaign", lambda root: events.append("anchor"))
    with pytest.raises(campaign.CampaignError, match="campaign_cap_exceeded"):
        campaign.execute(plan, "a" * 64, root / runner.API_DIRECTORY, commit=True, provider=runner.ceb.ExistingCampaignProvider(root, Provider()), rate_evidence={"mode": "receipt-verified"}, decoder=lambda *a: None, lock_path=root / runner.LOCK_PATH)
    assert events[:6] == ["lock", "campaign", "clear", "anchor", "preflight", "reserve"]
    assert events[-2:] == ["close", "unlock"]


def test_bound_imported_helper_closure():
    paths = {item["path"] for item in runner.code_evidence(runner.ROOT)}
    assert {"scripts/run_guided_japanese_b1_batch.py", "scripts/export_guided_japanese_b1.mjs", "scripts/run_guided_native_b1_batch.py", "scripts/export_guided_native_b1.mjs", "scripts/run_guided_cebuano_refresh_v4.py", "scripts/guided_refresh_v2.py", "src/services/guided_tts/campaign.py", "src/services/guided_tts/inventory.py"} <= paths
