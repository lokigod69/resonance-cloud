"""Offline tests only: fake transport and local, generated decoder input."""
from dataclasses import asdict
from decimal import Decimal
import importlib.util
import json
from pathlib import Path
import shutil
import sqlite3
import subprocess

import httpx
import pytest

from src.services.guided_tts import campaign as c
from scripts import run_guided_audio_campaign as cli
from src.services.guided_tts.inventory import VoiceProfile, build_inventory, voice_settings_hash

FINGERPRINT = "a" * 64
EVIDENCE = {"mode": "receipt-verified", "models": {c.MODEL: {"modelCharacterCostMultiplier": "1", "voices": {
    "voice-test": {"sharingRate": None, "creditMultiplier": "1", "verification": "verified account rate"}}}}}


def plan(*texts, model=c.MODEL):
    settings = dict(c.V4_SETTINGS) if model == "eleven_v4" else {"stability": 0.75, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True}
    profile = VoiceProfile(voice_profile_key="test", provider_voice_id="voice-test",
        provider_model_id=model, output_format=c.FORMAT, voice_settings=settings,
        voice_settings_hash=voice_settings_hash(settings), vibe="bright")
    lessons = [{"id": f"lesson-{i}", "pathId": "path", "lessonNumber": i,
                "vibeVariants": {"bright": {"corePhrase": {"targetText": text}}}}
               for i, text in enumerate(texts, 1)]
    inventory = build_inventory(lessons=lessons, voice_profiles=[profile],
        existing_assets_by_cache_key={}, vibes=["bright"], surfaces=["corePhrase"])
    return {"model": model, "creditBudgetCeiling": c.API_CAP,
            "groups": [{"proposedVoiceProfile": asdict(profile), "items": inventory["items"]}]}


class FakeProvider:
    def __init__(self, *, failure=None, multiplier=1, actual=None, mime="audio/mpeg", payload=b"audio:valid"):
        self.failure, self.multiplier, self.actual = failure, Decimal(multiplier), actual
        self.mime, self.payload = mime, payload
        self.calls, self.preflights = [], 0

    def preflight(self, voices, evidence, receipts=()):
        self.preflights += 1
        return {voice: self.multiplier for voice in voices}

    def synthesize(self, request):
        self.calls.append(request)
        if self.failure:
            raise self.failure
        cost = Decimal(len(request["text"])) * self.multiplier if self.actual is None else Decimal(self.actual)
        return c.Receipt(self.payload, 200, f"request-{len(self.calls)}", cost, self.mime)


def fake_decoder(audio, mime):
    if mime != "audio/mpeg" or not audio or not audio.startswith(b"audio:"):
        raise ValueError("not audio")


def run(tmp_path, payload, provider, **kwargs):
    return c.execute(payload, FINGERPRINT, tmp_path / "campaign", provider=provider,
        rate_evidence=kwargs.pop("rate_evidence", EVIDENCE), commit=True, decoder=fake_decoder, **kwargs)


def row(tmp_path):
    with sqlite3.connect(tmp_path / "campaign/campaign.sqlite3") as db:
        db.row_factory = sqlite3.Row
        return db.execute("SELECT * FROM requests ORDER BY rowid").fetchone()


def test_default_dry_run_does_not_create_output_lock_ledger_or_call_provider(tmp_path):
    provider = FakeProvider()
    result = c.execute(plan("Bonjour."), FINGERPRINT, tmp_path / "absent", provider=provider)
    assert result["mode"] == "dry-run"
    assert list(tmp_path.iterdir()) == []
    assert provider.calls == [] and provider.preflights == 0


def test_sample_three_then_resume_all_deduplicates_and_preserves_cap(tmp_path):
    payload, provider = plan("One.", "Two.", "One.", "Three.", "Four."), FakeProvider()
    first = run(tmp_path, payload, provider, limit=3)
    second = run(tmp_path, payload, provider)
    third = run(tmp_path, payload, provider)
    assert [first["dispatched"], second["dispatched"], third["dispatched"]] == [3, 1, 0]
    assert len(provider.calls) == len({x["cache_key"] for x in provider.calls}) == 4
    assert first["cap"] == second["cap"] == third["cap"] == 200_000
    assert second["committedCredits"] == str(sum(len(x["text"]) for x in provider.calls))
    assert len(list((tmp_path / "campaign").glob("*.mp3"))) == 4


def test_progress_reader_cannot_block_paid_receipt_persistence(tmp_path):
    payload = plan("First.", "Second.")
    ledger = c.Campaign(tmp_path / "campaign", FINGERPRINT)
    assert ledger.db.execute("PRAGMA journal_mode").fetchone()[0] == "wal"
    assert ledger.db.execute("PRAGMA synchronous").fetchone()[0] == 2
    ledger.db.close()
    reader = sqlite3.connect(f"file:{tmp_path.as_posix()}/campaign/campaign.sqlite3?mode=ro", uri=True)
    provider = FakeProvider()
    original = provider.synthesize

    def synthesize(request):
        if not provider.calls:
            reader.execute("BEGIN")
            assert reader.execute("SELECT state FROM requests").fetchone()[0] == "in_flight"
        return original(request)

    provider.synthesize = synthesize
    try:
        result = run(tmp_path, payload, provider)
        assert result["ready"] == 2 and result["blocked"] == 0
        assert result["committedCredits"] == "13"
        assert len(provider.calls) == 2
        # Reader still holds the original snapshot across receipt and ready writes.
        assert reader.execute("SELECT state FROM requests").fetchall() == [("in_flight",)]
        assert len(list((tmp_path / "campaign").glob("*.mp3"))) == 2
    finally:
        reader.close()


def test_budget_reserved_before_request_and_next_request_refused(tmp_path):
    provider = FakeProvider(multiplier=100_000)
    with pytest.raises(c.CampaignError, match="campaign_cap_exceeded"):
        run(tmp_path, plan("aa", "b"), provider)
    assert len(provider.calls) == 1
    receipt = row(tmp_path)
    assert receipt["reserved"] == 200_000 and receipt["charged"] == "200000"
    assert receipt["state"] == "ready"
    with sqlite3.connect(tmp_path / "campaign/campaign.sqlite3") as db:
        assert db.execute("SELECT count(*) FROM requests").fetchone()[0] == 1


def test_timeout_holds_reservation_and_blocks_future_runs_without_provider_calls(tmp_path):
    provider, payload = FakeProvider(failure=TimeoutError("secret-key must not leak")), plan("Hello.", "Next.")
    with pytest.raises(c.CampaignError, match="^transport_ambiguous$"):
        run(tmp_path, payload, provider)
    assert row(tmp_path)["state"] == "blocked"
    assert row(tmp_path)["charged"] is None and row(tmp_path)["reserved"] == 6
    with pytest.raises(c.CampaignError, match="explicit_reconciliation_required"):
        run(tmp_path, payload, provider)
    assert len(provider.calls) == provider.preflights == 1


def test_in_flight_crash_record_blocks_new_process(tmp_path):
    payload = plan("Hello.")
    ledger = c.Campaign(tmp_path / "campaign", FINGERPRINT)
    ledger.reserve(c.unique_requests(payload)[0], 6)
    ledger.db.close()
    provider = FakeProvider()
    with pytest.raises(c.CampaignError, match="explicit_reconciliation_required"):
        run(tmp_path, payload, provider)
    assert provider.calls == [] and provider.preflights == 0


def test_non_audio_200_preserves_received_bytes_and_charge(tmp_path):
    provider = FakeProvider(mime="application/json", payload=b'{"private":"not logged"}')
    with pytest.raises(c.CampaignError, match="audio_validation_or_delivery_failed") as raised:
        run(tmp_path, plan("Hi."), provider)
    record = row(tmp_path)
    assert record["audio"] == provider.payload and record["charged"] == "3"
    assert record["request_id"] == "request-1" and record["state"] == "blocked"
    assert raised.value.receipt.audio == provider.payload
    assert "private" not in str(raised.value)
    assert not list((tmp_path / "campaign").glob("*.mp3"))


def test_disk_failure_preserves_receipt_then_explicit_reconciliation_reuses_audio(tmp_path):
    provider, payload = FakeProvider(), plan("First.", "Second.")
    def failing_writer(path, audio):
        assert row(tmp_path)["charged"] == "6"  # Receipt committed before output IO.
        assert row(tmp_path)["audio"] == audio
        raise OSError("disk full with sensitive filename")
    with pytest.raises(c.CampaignError, match="audio_validation_or_delivery_failed"):
        run(tmp_path, payload, provider, writer=failing_writer)
    assert len(provider.calls) == 1 and row(tmp_path)["charged"] == "6"
    with c.run_lock(tmp_path / ".guided-audio-api.lock"):
        ledger = c.Campaign(tmp_path / "campaign", FINGERPRINT)
        try:
            ledger.reconcile(row(tmp_path)["key"], 6, "receipt-reviewed-local-write-fixed",
                             accept_audio=True, decoder=fake_decoder)
        finally:
            ledger.db.close()
    result = run(tmp_path, payload, provider)
    assert result["ready"] == 2 and len(provider.calls) == 2


@pytest.mark.parametrize("actual,committed", [(4, "4"), (200001, "200001")])
def test_unexpected_charge_is_recorded_even_above_cap_and_halts(tmp_path, actual, committed):
    provider = FakeProvider(actual=actual)
    with pytest.raises(c.CampaignError, match="billed_amount_exceeds_reservation"):
        run(tmp_path, plan("Hi.", "Next."), provider)
    ledger = c.Campaign(tmp_path / "campaign", FINGERPRINT)
    try:
        assert ledger.summary()["committedCredits"] == committed
        assert ledger.summary()["receipts"][0]["charged"] == str(actual)
    finally:
        ledger.db.close()
    assert len(provider.calls) == 1


def test_lost_ready_file_stops_before_spend_and_can_be_restored_from_receipt(tmp_path):
    payload, provider = plan("One.", "Two."), FakeProvider()
    run(tmp_path, payload, provider, limit=1)
    key = row(tmp_path)["key"]
    (tmp_path / "campaign" / f"{key}.mp3").unlink()
    with pytest.raises(c.CampaignError, match="local_audio_missing_or_changed"):
        run(tmp_path, payload, provider)
    assert len(provider.calls) == 1 and provider.preflights == 1
    ledger = c.Campaign(tmp_path / "campaign", FINGERPRINT)
    try:
        ledger.reconcile(key, 4, "missing-file-recovered-from-receipt", accept_audio=True, decoder=fake_decoder)
    finally:
        ledger.db.close()
    assert run(tmp_path, payload, provider)["ready"] == 2
    assert len(provider.calls) == 2


def test_global_lock_prevents_second_campaign_dispatch(tmp_path):
    provider = FakeProvider()
    with c.run_lock(tmp_path / ".guided-audio-api.lock"):
        with pytest.raises(c.CampaignError, match="another_run_is_active"):
            run(tmp_path, plan("Hi."), provider)
    assert provider.calls == [] and provider.preflights == 0
    assert not (tmp_path / "campaign").exists()


def test_campaign_cap_cannot_change_and_manifest_registry_is_append_only(tmp_path):
    ledger = c.Campaign(tmp_path / "campaign", FINGERPRINT)
    try:
        with pytest.raises(sqlite3.IntegrityError, match="immutable_campaign"):
            with ledger.db:
                ledger.db.execute("UPDATE campaign SET cap=400000")
    finally:
        ledger.db.close()
    next_manifest = c.Campaign(tmp_path / "campaign", "b" * 64)
    try:
        assert next_manifest.summary()["registeredManifests"] == [FINGERPRINT, "b" * 64]
        with pytest.raises(sqlite3.IntegrityError, match="immutable_manifest"):
            with next_manifest.db:
                next_manifest.db.execute("DELETE FROM manifests")
    finally:
        next_manifest.db.close()


def test_new_manifest_shares_prior_spending_and_deduplication(tmp_path):
    provider = FakeProvider(multiplier=50_000)
    original = plan("aa")
    run(tmp_path, original, provider)
    new = plan("aa", "b", "cc")
    with pytest.raises(c.CampaignError, match="campaign_cap_exceeded"):
        c.execute(new, "b" * 64, tmp_path / "campaign", provider=provider,
                  rate_evidence=EVIDENCE, commit=True, decoder=fake_decoder)
    assert len(provider.calls) == 2  # Old key reused; new b costs 50k; cc cannot fit.
    ledger = c.Campaign(tmp_path / "campaign", "b" * 64)
    try:
        assert ledger.summary()["committedCredits"] == "150000"
        assert len(ledger.summary()["registeredManifests"]) == 2
    finally:
        ledger.db.close()


def test_representative_sample_covers_each_voice_then_resume_deduplicates(tmp_path):
    payload = plan("First.", "Second.", "Third.", "Fourth.")
    for voice in ("voice-spanish", "voice-french"):
        group = plan("First.", "Second.")["groups"][0]
        profile = group["proposedVoiceProfile"]
        profile["provider_voice_id"] = voice
        for item in group["items"]:
            item["provider_voice_id"] = voice
            item["cache_key"] = c.cache_key(provider="elevenlabs", target_language_code=profile["target_language_code"],
                voice_profile_key=profile["voice_profile_key"], provider_voice_id=voice,
                provider_model_id=c.MODEL, output_format=c.FORMAT, settings_hash=profile["voice_settings_hash"],
                normalization_version=c.NORMALIZATION_VERSION, text_hash_value=item["text_hash"])
        payload["groups"].append(group)
    provider = FakeProvider()
    sample = run(tmp_path, payload, provider, sample_per_voice=True)
    assert sample["dispatched"] == 3
    assert {r["voice_id"] for r in provider.calls} == {"voice-test", "voice-spanish", "voice-french"}
    assert {r["text"] for r in provider.calls} == {"First."}
    resumed = run(tmp_path, payload, provider)
    assert resumed["dispatched"] == 5 and resumed["ready"] == 8


def test_http_single_attempt_captures_safe_headers_and_exact_payload():
    calls = []
    def handler(request):
        calls.append(request)
        assert json.loads(request.content) == {"text": "Salut.", "model_id": c.MODEL, "voice_settings": {"stability": 0.75}}
        assert request.url.params["output_format"] == c.FORMAT
        return httpx.Response(503, headers={"character-cost": "8", "request-id": "safe-id", "content-type": "application/json"}, content=b"private provider error")
    provider = c.ElevenLabsTransport("not-a-real-key", httpx.MockTransport(handler))
    try:
        receipt = provider.synthesize({"voice_id": "voice-test", "model_id": c.MODEL, "text": "Salut.", "settings": {"stability": 0.75}})
    finally:
        provider.close()
    assert len(calls) == 1 and receipt.character_cost == 8 and receipt.status == 503
    assert receipt.request_id == "safe-id" and receipt.audio == b"private provider error"
    assert "private" not in repr(receipt)


def test_preflight_uses_model_multiplier_and_explicit_verified_voice_multiplier():
    calls = []
    def handler(request):
        calls.append(request.url.path)
        data = ([{"model_id": c.MODEL, "can_do_text_to_speech": True, "model_rates": {"character_cost_multiplier": 2}}]
                if request.url.path.endswith("/models") else {"voice_id": "voice-test", "sharing": {"rate": 0.05}})
        return httpx.Response(200, json=data)
    evidence = {"mode": "receipt-verified", "models": {c.MODEL: {"modelCharacterCostMultiplier": "2", "voices": {"voice-test": {
        "sharingRate": 0.05, "creditMultiplier": "3", "verification": "account-rate-screen-checked"}}}}}
    provider = c.ElevenLabsTransport("fake", httpx.MockTransport(handler))
    try:
        receipts = [{"voice_id": "voice-test", "model_id": c.MODEL, "text": "Hi.", "charged": "18"}]
        assert provider.preflight({("voice-test", c.MODEL)}, evidence, receipts) == {("voice-test", c.MODEL): Decimal(6)}
        evidence["models"][c.MODEL]["voices"]["voice-test"]["sharingRate"] = None
        with pytest.raises(c.CampaignError, match="voice_rate_unverified"):
            provider.preflight({("voice-test", c.MODEL)}, evidence, receipts)
    finally:
        provider.close()
    assert calls == ["/v1/models", "/v1/voices/voice-test"] * 2


@pytest.mark.parametrize("raw", [None, "NaN", "-1", "unknown"])
def test_unknown_model_rates_fail_before_synthesis(raw):
    def handler(request):
        assert request.url.path.endswith("/models")
        return httpx.Response(200, json=[{"model_id": c.MODEL, "can_do_text_to_speech": True,
                                         "model_rates": {"character_cost_multiplier": raw}}])
    provider = c.ElevenLabsTransport("fake", httpx.MockTransport(handler))
    try:
        with pytest.raises(c.CampaignError):
            provider.preflight({("voice-test", c.MODEL)}, EVIDENCE)
    finally:
        provider.close()


def test_decoder_accepts_real_mp3_and_rejects_mislabeled_bytes():
    ffmpeg = shutil.which("ffmpeg")
    if not ffmpeg:
        pytest.skip("ffmpeg is required for the real local decoder test")
    generated = subprocess.run([ffmpeg, "-hide_banner", "-loglevel", "error", "-f", "lavfi",
        "-i", "sine=frequency=440:duration=0.1", "-ar", "44100", "-b:a", "128k",
        "-f", "mp3", "pipe:1"], stdout=subprocess.PIPE, stderr=subprocess.PIPE, check=True)
    c.decode_mp3(generated.stdout, "audio/mpeg")
    with pytest.raises(c.CampaignError, match="audio_decode_failed"):
        c.decode_mp3(b"ID3this-is-not-decodable-audio", "audio/mpeg")


def test_v4_wire_settings_and_cache_are_isolated_from_multilingual_v2(tmp_path):
    payload = plan("Bonjour.", model="eleven_v4")
    request = c.unique_requests(payload)[0]
    assert request["cache_key"] != c.unique_requests(plan("Bonjour."))[0]["cache_key"]
    def handler(wire):
        assert json.loads(wire.content) == {"text": "Bonjour.", "model_id": "eleven_v4", "voice_settings": c.V4_SETTINGS}
        return httpx.Response(200, headers={"character-cost": "8", "request-id": "v4-id", "content-type": "audio/mpeg"}, content=b"audio:valid")
    provider = c.ElevenLabsTransport("fake", httpx.MockTransport(handler))
    try:
        assert provider.synthesize(request).character_cost == 8
    finally:
        provider.close()
    fake = FakeProvider()
    run(tmp_path, plan("Bonjour."), fake)
    result = c.execute(payload, "b" * 64, tmp_path / "campaign", provider=fake,
                       rate_evidence=EVIDENCE, commit=True, decoder=fake_decoder)
    assert result["ready"] == 2 and result["committedCredits"] == "16"
    assert {r["model_id"] for r in fake.calls} == {c.MODEL, "eleven_v4"}


@pytest.mark.parametrize("field,value", [("speed", 1), ("style", 0), ("use_speaker_boost", True), ("stability", 0.75)])
def test_v4_rejects_unapproved_or_unsupported_settings(field, value):
    payload = plan("Bonjour.", model="eleven_v4")
    profile = payload["groups"][0]["proposedVoiceProfile"]
    profile["voice_settings"][field] = value
    profile["voice_settings_hash"] = voice_settings_hash(profile["voice_settings"])
    with pytest.raises(c.CampaignError, match="unsupported_voice_profile"):
        c.unique_requests(payload)


def test_v4_ssml_is_rejected_before_any_mutation(tmp_path):
    with pytest.raises(c.CampaignError, match="request_identity_mismatch"):
        c.execute(plan('Bonjour <break time="1s"/>.', model="eleven_v4"), FINGERPRINT, tmp_path / "absent")
    assert list(tmp_path.iterdir()) == []


def test_pilot_reserves_ten_accepts_actual_cost_and_requires_sample_mode(tmp_path):
    payload, provider = plan("First.", "Second."), FakeProvider(multiplier=10, actual=6)
    pilot = {**EVIDENCE, "mode": "pilot"}
    with pytest.raises(c.CampaignError, match="pilot_requires_representative_sample"):
        run(tmp_path, payload, provider, rate_evidence=pilot)
    assert list(tmp_path.iterdir()) == [] and provider.preflights == 0
    result = run(tmp_path, payload, provider, rate_evidence=pilot, sample_per_voice=True)
    assert result["ready"] == 1 and result["committedCredits"] == "6"
    assert row(tmp_path)["reserved"] == 60 and row(tmp_path)["charged"] == "6"
    # A new reviewed rate fingerprint keeps the campaign cap and the pilot key.
    normal = FakeProvider()
    resumed = c.execute(payload, "b" * 64, tmp_path / "campaign", provider=normal,
                        rate_evidence=EVIDENCE, commit=True, decoder=fake_decoder)
    assert resumed["ready"] == 2 and [r["text"] for r in normal.calls] == ["Second."]


def test_pilot_receipt_above_conservative_reservation_blocks(tmp_path):
    provider = FakeProvider(multiplier=10, actual=31)
    with pytest.raises(c.CampaignError, match="billed_amount_exceeds_reservation"):
        run(tmp_path, plan("Hi."), provider, rate_evidence={**EVIDENCE, "mode": "pilot"}, sample_per_voice=True)
    assert row(tmp_path)["reserved"] == 30 and row(tmp_path)["charged"] == "31"


def test_real_preflight_requires_matching_receipt_per_voice_model_and_allows_bootstrap():
    def handler(request):
        if request.url.path.endswith("/models"):
            return httpx.Response(200, json=[{"model_id": m, "can_do_text_to_speech": True,
                "model_rates": {"character_cost_multiplier": 1}} for m in c.MODELS])
        return httpx.Response(200, json={"voice_id": "voice-test", "sharing": {"rate": 1}})
    approved = {"sharingRate": 1, "creditMultiplier": "1", "verification": "saved-preflight-reference"}
    model_evidence = {"modelCharacterCostMultiplier": "1", "voices": {"voice-test": approved}}
    evidence = {"mode": "receipt-verified", "models": {m: model_evidence for m in c.MODELS}}
    pairs = {("voice-test", m) for m in c.MODELS}
    receipts = [{"voice_id": "voice-test", "model_id": c.MODEL, "text": "Hi.", "charged": "3"}]
    provider = c.ElevenLabsTransport("fake", httpx.MockTransport(handler))
    try:
        with pytest.raises(c.CampaignError, match="matching_voice_model_receipt_required"):
            provider.preflight(pairs, evidence, receipts)
        receipts.append({**receipts[0], "model_id": "eleven_v4"})
        assert provider.preflight(pairs, evidence, receipts) == {p: Decimal(1) for p in pairs}
        receipts[1]["charged"] = "1"  # Discounted but positive: within the standard upper bound.
        assert provider.preflight(pairs, evidence, receipts) == {p: Decimal(1) for p in pairs}
        receipts[1]["charged"] = "0"
        with pytest.raises(c.CampaignError, match="matching_voice_model_receipt_required"):
            provider.preflight(pairs, evidence, receipts)
        receipts[1]["charged"] = "4"
        with pytest.raises(c.CampaignError, match="matching_voice_model_receipt_required"):
            provider.preflight(pairs, evidence, receipts)
        approved["creditMultiplier"] = "0.1"
        with pytest.raises(c.CampaignError, match="voice_upper_multiplier_below_standard"):
            provider.preflight(pairs, evidence, receipts)
        evidence["mode"] = "pilot"
        with pytest.raises(c.CampaignError, match="pilot_requires_conservative_multiplier_ten"):
            provider.preflight(pairs, evidence)
        approved["creditMultiplier"] = "10"
        assert provider.preflight(pairs, evidence) == {p: Decimal(10) for p in pairs}
    finally:
        provider.close()


def test_discounted_pilot_then_full_run_uses_standard_reservations_and_actual_headers(tmp_path):
    payload = plan("E" * 60, "short", model="eleven_v4")
    for voice, texts in (("voice-es", ["S" * 81]), ("voice-fr", ["F" * 65])):
        group = plan(*texts, model="eleven_v4")["groups"][0]
        profile = group["proposedVoiceProfile"]
        profile["provider_voice_id"] = voice
        for item in group["items"]:
            item["provider_voice_id"] = voice
            item["cache_key"] = c.cache_key(provider="elevenlabs", target_language_code=profile["target_language_code"],
                voice_profile_key=profile["voice_profile_key"], provider_voice_id=voice,
                provider_model_id="eleven_v4", output_format=c.FORMAT, settings_hash=profile["voice_settings_hash"],
                normalization_version=c.NORMALIZATION_VERSION, text_hash_value=item["text_hash"])
        payload["groups"].append(group)
    approved = {v: {"sharingRate": 1, "creditMultiplier": "10", "verification": "local GET evidence"}
                for v in ("voice-test", "voice-es", "voice-fr")}
    evidence = {"mode": "pilot", "models": {"eleven_v4": {
        "modelCharacterCostMultiplier": "1", "voices": approved}}}
    actual_by_length, posts = {60: 6, 81: 8, 65: 7, 5: 1}, []
    def handler(wire):
        if wire.url.path.endswith("/models"):
            return httpx.Response(200, json=[{"model_id": "eleven_v4", "can_do_text_to_speech": True,
                                             "model_rates": {"character_cost_multiplier": 1}}])
        if wire.method == "GET":
            return httpx.Response(200, json={"voice_id": wire.url.path.split("/")[-1], "sharing": {"rate": 1}})
        size = len(json.loads(wire.content)["text"])
        with sqlite3.connect(tmp_path / "campaign/campaign.sqlite3") as db:
            assert db.execute("SELECT reserved FROM requests WHERE state='in_flight'").fetchone()[0] == size * (10 if evidence["mode"] == "pilot" else 1)
        posts.append(size)
        return httpx.Response(200, headers={"character-cost": str(actual_by_length[size]),
            "request-id": f"receipt-{size}", "content-type": "audio/mpeg"}, content=b"audio:valid")
    provider = c.ElevenLabsTransport("fake", httpx.MockTransport(handler))
    try:
        pilot = run(tmp_path, payload, provider, rate_evidence=evidence, sample_per_voice=True)
        assert pilot["dispatched"] == 3 and pilot["committedCredits"] == "21"
        evidence["mode"] = "receipt-verified"
        for voice in approved.values():
            voice["creditMultiplier"] = "1"
        full = c.execute(payload, "b" * 64, tmp_path / "campaign", provider=provider,
                          rate_evidence=evidence, commit=True, decoder=fake_decoder)
        assert full["dispatched"] == 1 and full["committedCredits"] == "22"
        assert [(r["reserved"], r["charged"]) for r in full["receipts"]] == [(600, "6"), (810, "8"), (650, "7"), (5, "1")]
        assert posts == [60, 81, 65, 5] and full["ready"] == 4
        assert c.execute(payload, "b" * 64, tmp_path / "campaign", provider=provider,
                         rate_evidence=evidence, commit=True, decoder=fake_decoder)["dispatched"] == 0
    finally:
        provider.close()


@pytest.fixture
def staged_repo(tmp_path):
    import scripts.plan_guided_b1_drafts as planner
    original = Path(planner.__file__).resolve().parents[1] / "frontend/content-drafts/b1-2026-10"
    destination = tmp_path / "repo/frontend/content-drafts/b1-2026-10"
    destination.mkdir(parents=True)
    for name in ("english.json", "spanish.json", "french.json", "review-evidence.json", "tts-plan.json", "tts-plan-v4.json", "tts-snapshot.json"):
        shutil.copyfile(original / name, destination / name)
    return tmp_path / "repo", destination


def test_cli_dry_run_checks_reviewed_sources_and_does_not_construct_provider(staged_repo, capsys):
    root, _ = staged_repo
    def reject_provider(*args):
        pytest.fail("dry run created provider")
    assert cli.main([], repo_root=root, provider_factory=reject_provider) == 0
    assert json.loads(capsys.readouterr().out)["mode"] == "dry-run"
    assert not (root / "review-artifacts").exists()


def test_cli_v4_rebuilds_selected_saved_model_and_dry_run_is_pure(staged_repo, capsys):
    root, directory = staged_repo
    def reject_provider(*args):
        pytest.fail("dry run created provider")
    assert cli.main(["--model", "eleven_v4"], repo_root=root, provider_factory=reject_provider) == 0
    result = json.loads(capsys.readouterr().out)
    payload, fingerprint = cli.load_reviewed_inputs(directory, None, "eleven_v4")
    assert payload["model"] == "eleven_v4" and result["inputFingerprint"] == fingerprint
    assert result["uniqueKeys"] == 469 and not (root / "review-artifacts").exists()


@pytest.mark.parametrize("fault", ["source", "snapshot", "plan", "expected_fingerprint"])
def test_cli_stale_inputs_rejected_before_writes_or_provider(staged_repo, fault):
    root, directory = staged_repo
    args = []
    if fault == "source":
        with (directory / "french.json").open("ab") as handle:
            handle.write(b"\n")
    elif fault == "snapshot":
        path = directory / "tts-snapshot.json"
        data = json.loads(path.read_bytes()); data["languages"][0]["lessons"][0]["vibeVariants"]["bright"]["corePhrase"]["targetText"] = "changed"
        path.write_text(json.dumps(data), encoding="utf-8")
    elif fault == "plan":
        path = directory / "tts-plan.json"
        data = json.loads(path.read_bytes()); data["groups"][0]["proposedVoiceProfile"]["provider_voice_id"] = "other-voice"
        path.write_text(json.dumps(data), encoding="utf-8")
    else:
        rates_path = root / "rates.json"; rates_path.write_text(json.dumps(EVIDENCE), encoding="utf-8")
        args = ["--commit", "--rates", str(rates_path), "--expected-input-sha256", "f" * 64]
    def reject_provider(*args):
        pytest.fail("stale input created provider")
    with pytest.raises(c.CampaignError):
        cli.main(args, repo_root=root, provider_factory=reject_provider)
    assert not (root / "review-artifacts").exists()
