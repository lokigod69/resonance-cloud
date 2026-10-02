"""Local, single-dispatch ElevenLabs campaign. No Supabase and no automatic retry.

Billing headers: https://elevenlabs.io/docs/api-reference/introduction
Rates: https://elevenlabs.io/docs/api-reference/models/list and /voices/get
sharing.rate is NOT a documented credit multiplier. Require account-specific
upper-bound evidence for every voice, matched against its freshly fetched rate.
Full runs reserve at least the model's standard rate, never an inferred discount;
a positive ready receipt per voice/model must fit that bound. Actual charges can
be lower and only the character-cost header determines settled accounting.
SQLite retains received bytes and safe receipts before validation/file delivery.
An above-bound charge is recorded and stops the campaign; a client cannot
undo such a charge or guarantee a provider honors a preflight quote.
"""
from __future__ import annotations

from contextlib import contextmanager
from dataclasses import dataclass, field
from decimal import Decimal, ROUND_CEILING
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import sqlite3
import subprocess
import uuid

from src.services.guided_tts.inventory import (
    NORMALIZATION_VERSION, cache_key, normalize_spoken_text, text_hash,
    voice_settings_hash,
)

API_CAP = 200_000
MODEL = "eleven_multilingual_v2"
MODELS = {MODEL, "eleven_v4"}
V4_SETTINGS = {"stability": 0.5, "similarity_boost": 0.75}
FORMAT = "mp3_44100_128"


class CampaignError(RuntimeError):
    def __init__(self, reason, receipt=None):
        super().__init__(reason)  # Only fixed reason codes; never HTTP bodies/errors.
        self.receipt = receipt  # Last-resort in-memory recovery on ledger IO failure.


def digest(data):
    return hashlib.sha256(data).hexdigest()


def canonical(value):
    return json.dumps(value, sort_keys=True, separators=(",", ":"), ensure_ascii=False)


def amount(value):
    try:
        result = Decimal(str(value))
        if not result.is_finite() or result < 0:
            raise ValueError
        return result
    except Exception:
        raise CampaignError("invalid_credit_amount") from None


@dataclass(frozen=True)
class Receipt:
    audio: bytes = field(repr=False)
    status: int
    request_id: str | None
    character_cost: Decimal | None
    mime: str


class ElevenLabsTransport:
    """One HTTP attempt per method, redirects/retries/environment proxies disabled."""
    def __init__(self, api_key, transport=None):
        import httpx
        if not api_key:
            raise CampaignError("missing_api_key")
        self.client = httpx.Client(base_url="https://api.elevenlabs.io/v1/",
            headers={"xi-api-key": api_key}, timeout=60, follow_redirects=False,
            trust_env=False, transport=transport or httpx.HTTPTransport(retries=0))

    def close(self):
        self.client.close()

    def _read(self, path):
        try:
            response = self.client.get(path)
            if response.status_code != 200:
                raise ValueError
            return response.json()
        except Exception:
            raise CampaignError("preflight_read_failed") from None

    def preflight(self, voice_models, evidence, receipts=()):
        if evidence.get("mode") not in {"pilot", "receipt-verified"}:
            raise CampaignError("rate_evidence_mode_required")
        models = self._read("models")
        rates = {}
        for voice_id, model_id in sorted(voice_models):
            approved_model = evidence.get("models", {}).get(model_id, {})
            matches = [m for m in models if m.get("model_id") == model_id]
            if model_id not in MODELS or len(matches) != 1 or not matches[0].get("can_do_text_to_speech"):
                raise CampaignError("model_unavailable")
            model_rate = amount(matches[0].get("model_rates", {}).get("character_cost_multiplier"))
            if model_rate <= 0 or model_rate != amount(approved_model.get("modelCharacterCostMultiplier")):
                raise CampaignError("model_rate_changed")
            voice = self._read(f"voices/{voice_id}")
            sharing = voice.get("sharing")
            if (voice.get("voice_id") != voice_id or "sharing" not in voice
                    or (sharing is not None and "rate" not in sharing)):
                raise CampaignError("voice_rate_missing")
            observed = sharing["rate"] if sharing is not None else None
            approved = approved_model.get("voices", {}).get(voice_id, {})
            if ("sharingRate" not in approved or observed != approved["sharingRate"]
                    or not isinstance(approved.get("verification"), str) or not approved["verification"].strip()):
                raise CampaignError("voice_rate_unverified")
            voice_rate = amount(approved.get("creditMultiplier"))
            if voice_rate <= 0:
                raise CampaignError("voice_multiplier_invalid")
            total = model_rate * voice_rate
            if evidence["mode"] == "pilot":
                if voice_rate != 10:
                    raise CampaignError("pilot_requires_conservative_multiplier_ten")
            elif voice_rate < 1:
                raise CampaignError("voice_upper_multiplier_below_standard")
            elif not any(r["voice_id"] == voice_id and r["model_id"] == model_id
                    and 0 < amount(r["charged"]) <= (Decimal(len(r["text"])) * total).to_integral_value(rounding=ROUND_CEILING)
                    for r in receipts):
                raise CampaignError("matching_voice_model_receipt_required")
            rates[(voice_id, model_id)] = total
        return rates

    def synthesize(self, request):
        try:
            response = self.client.post(f"text-to-speech/{request['voice_id']}",
                params={"output_format": FORMAT}, headers={"Accept": "audio/mpeg"},
                json={"text": request["text"], "model_id": request["model_id"], "voice_settings": request["settings"]})
        except Exception:
            raise CampaignError("transport_ambiguous") from None
        raw_cost = response.headers.get("character-cost")
        try:
            cost = amount(raw_cost) if raw_cost is not None else None
        except CampaignError:
            cost = None  # Still return all received bytes for durable capture.
        request_id = response.headers.get("request-id")
        if not request_id or not re.fullmatch(r"[A-Za-z0-9_.:-]{1,200}", request_id):
            request_id = None
        mime = response.headers.get("content-type", "").split(";", 1)[0].strip().lower()
        return Receipt(response.content, response.status_code, request_id, cost,
                       mime if re.fullmatch(r"[a-z0-9.+-]+/[a-z0-9.+-]+", mime) else "")


def unique_requests(plan):
    requests = {}
    model_id = plan.get("model")
    if model_id not in MODELS or plan.get("creditBudgetCeiling") != API_CAP:
        raise CampaignError("unsupported_plan")
    for group in plan["groups"]:
        profile = group["proposedVoiceProfile"]
        settings = profile["voice_settings"]
        settings_hash = voice_settings_hash(settings)
        if (profile["provider"] != "elevenlabs" or profile["provider_model_id"] != model_id
                or profile["output_format"] != FORMAT or profile["voice_settings_hash"] != settings_hash
                or (model_id == "eleven_v4" and settings != V4_SETTINGS)
                or not re.fullmatch(r"[A-Za-z0-9_-]+", profile["provider_voice_id"])):
            raise CampaignError("unsupported_voice_profile")
        for item in group["items"]:
            text = normalize_spoken_text(item["source_text"])
            key = cache_key(provider="elevenlabs", target_language_code=profile["target_language_code"],
                voice_profile_key=profile["voice_profile_key"], provider_voice_id=profile["provider_voice_id"],
                provider_model_id=model_id, output_format=FORMAT, settings_hash=settings_hash,
                normalization_version=NORMALIZATION_VERSION, text_hash_value=text_hash(text))
            if (not text or (model_id == "eleven_v4" and re.search(r"<[^>]+>", text))
                    or item["normalized_text"] != text or item["cache_key"] != key
                    or item["character_count"] != len(text) or item["text_hash"] != text_hash(text)
                    or any(item[k] != profile[k] for k in ("provider_voice_id", "provider_model_id",
                       "output_format", "voice_profile_key", "target_language_code", "voice_settings_hash"))):
                raise CampaignError("request_identity_mismatch")
            request = {"cache_key": key, "text": text, "voice_id": profile["provider_voice_id"],
                       "model_id": model_id, "settings": settings}
            if key in requests and requests[key] != request:
                raise CampaignError("duplicate_key_conflict")
            requests[key] = request
    if not requests:
        raise CampaignError("empty_plan")
    return list(requests.values())


@contextmanager
def run_lock(path):
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("a+b") as handle:
        if handle.tell() == 0:
            handle.write(b"0"); handle.flush()
        handle.seek(0)
        try:
            if os.name == "nt":
                import msvcrt
                msvcrt.locking(handle.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(handle.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise CampaignError("another_run_is_active") from None
        try:
            yield
        finally:
            handle.seek(0)
            if os.name == "nt":
                msvcrt.locking(handle.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(handle.fileno(), fcntl.LOCK_UN)


def decode_mp3(audio, mime):
    if mime not in {"audio/mpeg", "audio/mp3"} or not audio:
        raise CampaignError("invalid_audio_mime")
    executable = shutil.which("ffmpeg")
    if not executable:
        raise CampaignError("ffmpeg_required")
    try:
        result = subprocess.run([executable, "-nostdin", "-hide_banner", "-loglevel", "error",
            "-xerror", "-f", "mp3", "-i", "pipe:0", "-vn", "-f", "s16le", "-ac", "1",
            "-ar", "16000", "pipe:1"], input=audio, stdout=subprocess.PIPE,
            stderr=subprocess.DEVNULL, timeout=30, check=False)
    except Exception:
        raise CampaignError("audio_decode_failed") from None
    if result.returncode or not result.stdout:
        raise CampaignError("audio_decode_failed")


def write_audio(path, audio):
    if path.exists():
        raise CampaignError("unexpected_output_exists")
    temporary = path.with_name(f"{path.name}.{uuid.uuid4().hex}.part")
    with temporary.open("xb") as handle:
        handle.write(audio); handle.flush(); os.fsync(handle.fileno())
    os.replace(temporary, path)
    if os.name != "nt":
        descriptor = os.open(path.parent, os.O_RDONLY)
        try:
            os.fsync(descriptor)
        finally:
            os.close(descriptor)


class Campaign:
    """Caller holds the global run lock for this connection's whole lifetime."""
    def __init__(self, directory, fingerprint):
        if not re.fullmatch(r"[a-f0-9]{64}", fingerprint):
            raise CampaignError("invalid_input_fingerprint")
        self.directory = Path(directory)
        self.fingerprint = fingerprint
        self.directory.mkdir(parents=True, exist_ok=True)
        self.db = sqlite3.connect(self.directory / "campaign.sqlite3", timeout=30)
        self.db.row_factory = sqlite3.Row
        # Progress readers must not prevent persistence of an already-paid receipt.
        self.db.execute("PRAGMA journal_mode=WAL")
        self.db.execute("PRAGMA synchronous=FULL")
        self.db.executescript("""
            CREATE TABLE IF NOT EXISTS campaign (id INTEGER PRIMARY KEY CHECK(id=1), cap INTEGER);
            CREATE TABLE IF NOT EXISTS manifests (fingerprint TEXT PRIMARY KEY, registered_at TEXT DEFAULT CURRENT_TIMESTAMP);
            CREATE TABLE IF NOT EXISTS requests (key TEXT PRIMARY KEY, identity TEXT, manifest_fingerprint TEXT, state TEXT,
                reserved INTEGER, charged TEXT, request_id TEXT, status INTEGER, mime TEXT,
                audio BLOB, audio_hash TEXT, reason TEXT, reconciliation TEXT);
            CREATE TRIGGER IF NOT EXISTS immutable_campaign BEFORE UPDATE ON campaign BEGIN SELECT RAISE(ABORT,'immutable_campaign'); END;
            CREATE TRIGGER IF NOT EXISTS undeletable_campaign BEFORE DELETE ON campaign BEGIN SELECT RAISE(ABORT,'immutable_campaign'); END;
            CREATE TRIGGER IF NOT EXISTS immutable_manifest BEFORE UPDATE ON manifests BEGIN SELECT RAISE(ABORT,'immutable_manifest'); END;
            CREATE TRIGGER IF NOT EXISTS undeletable_manifest BEFORE DELETE ON manifests BEGIN SELECT RAISE(ABORT,'immutable_manifest'); END;
        """)
        with self.db:
            self.db.execute("INSERT OR IGNORE INTO campaign VALUES(1,?)", (API_CAP,))
            self.db.execute("INSERT OR IGNORE INTO manifests(fingerprint) VALUES(?)", (fingerprint,))
        row = self.db.execute("SELECT * FROM campaign").fetchone()
        if row["cap"] != API_CAP:
            self.db.close()
            raise CampaignError("immutable_campaign_mismatch")

    def rows(self):
        return self.db.execute("SELECT key,state,reserved,charged,request_id,status,mime,audio_hash,reason FROM requests ORDER BY rowid").fetchall()

    def committed(self):
        return sum((max(Decimal(r["reserved"]), amount(r["charged"]))
                    if r["state"] not in {"ready", "settled"} and r["charged"] is not None
                    else amount(r["charged"] if r["charged"] is not None else r["reserved"]))
                   for r in self.rows())

    def check_clear(self):
        for row in self.rows():
            if row["state"] == "ready":
                path = self.directory / f"{row['key']}.mp3"
                if not path.is_file() or digest(path.read_bytes()) != row["audio_hash"]:
                    self.block(row["key"], "local_audio_missing_or_changed")
            elif row["state"] != "settled":
                raise CampaignError("explicit_reconciliation_required")

    def block(self, key, reason, receipt=None):
        with self.db:
            self.db.execute("UPDATE requests SET state='blocked',reason=? WHERE key=?", (reason, key))
        raise CampaignError(reason, receipt)

    def reserve(self, request, cost):
        self.db.execute("BEGIN IMMEDIATE")
        try:
            if self.db.execute("SELECT 1 FROM requests WHERE state NOT IN ('ready','settled') LIMIT 1").fetchone():
                raise CampaignError("explicit_reconciliation_required")
            existing = self.db.execute("SELECT identity FROM requests WHERE key=?", (request["cache_key"],)).fetchone()
            if existing:
                if existing[0] != canonical(request):
                    raise CampaignError("cached_identity_changed")
                self.db.rollback(); return False
            if cost <= 0 or self.committed() + cost > API_CAP:
                raise CampaignError("campaign_cap_exceeded")
            self.db.execute("INSERT INTO requests(key,identity,manifest_fingerprint,state,reserved) VALUES(?,?,?,'in_flight',?)",
                            (request["cache_key"], canonical(request), self.fingerprint, cost))
            self.db.commit(); return True
        except BaseException:
            self.db.rollback(); raise

    def save_receipt(self, key, receipt):
        try:
            with self.db:
                self.db.execute("UPDATE requests SET state='received',charged=?,request_id=?,status=?,mime=?,audio=?,audio_hash=? WHERE key=?",
                    (str(receipt.character_cost) if receipt.character_cost is not None else None,
                     receipt.request_id, receipt.status, receipt.mime, receipt.audio, digest(receipt.audio), key))
        except Exception:
            raise CampaignError("receipt_persistence_failed_run_blocked", receipt) from None

    def summary(self):
        rows = self.rows()
        return {"cap": API_CAP, "committedCredits": str(self.committed()),
            "registeredManifests": [r[0] for r in self.db.execute("SELECT fingerprint FROM manifests ORDER BY registered_at,rowid")],
            "ready": sum(r["state"] == "ready" for r in rows),
            "blocked": sum(r["state"] not in {"ready", "settled"} for r in rows),
            "settledWithoutAudio": sum(r["state"] == "settled" for r in rows),
            "receipts": [{k: r[k] for k in ("key", "state", "reserved", "charged", "request_id", "status", "audio_hash", "reason")} for r in rows]}

    def rate_receipts(self):
        return [{**json.loads(r["identity"]), "charged": r["charged"]} for r in self.db.execute(
            "SELECT identity,charged FROM requests WHERE state='ready' AND status=200 AND request_id IS NOT NULL AND charged IS NOT NULL")]

    def reconcile(self, key, final_cost, evidence, accept_audio=False, decoder=decode_mp3, writer=write_audio):
        """Explicit local reconciliation; never resubmits a key, even if unbilled.

        evidence is a local audit reference, not a secret. Accept reuses stored
        bytes; otherwise settle the charge and permanently skip this key.
        """
        cost = amount(final_cost)
        row = self.db.execute("SELECT * FROM requests WHERE key=?", (key,)).fetchone()
        if not row or row["state"] in {"ready", "settled"} or not evidence.strip():
            raise CampaignError("invalid_reconciliation")
        if accept_audio:
            decoder(row["audio"], row["mime"])
            path = self.directory / f"{key}.mp3"
            if path.exists():
                if digest(path.read_bytes()) != row["audio_hash"]:
                    raise CampaignError("existing_audio_mismatch")
            else:
                writer(path, row["audio"])
        audit = canonical({"evidence": evidence, "previousCharge": row["charged"], "finalCost": str(cost)})
        with self.db:
            self.db.execute("UPDATE requests SET state=?,charged=?,reason=NULL,reconciliation=? WHERE key=?",
                            ("ready" if accept_audio else "settled", str(cost), audit, key))


def execute(plan, fingerprint, directory, *, provider=None, rate_evidence=None,
            commit=False, limit=None, sample_per_voice=False, lock_path=None, decoder=decode_mp3, writer=write_audio):
    requests = unique_requests(plan)
    if sample_per_voice:
        if limit is not None:
            raise CampaignError("sample_per_voice_cannot_have_limit")
        representatives = {}
        for group in plan["groups"]:
            for item in group["items"]:
                if item["surface"] == "corePhrase":
                    representatives.setdefault(item["provider_voice_id"], item["cache_key"])
        if set(representatives) != {r["voice_id"] for r in requests}:
            raise CampaignError("missing_representative_core_phrase")
        requests = [r for r in requests if r["cache_key"] in representatives.values()]
    if limit is not None and (type(limit) is not int or limit < 1):
        raise CampaignError("invalid_sample_limit")
    if not commit:
        return {"mode": "dry-run", "cap": API_CAP, "inputFingerprint": fingerprint,
                "uniqueKeys": len(requests), "characters": sum(len(r["text"]) for r in requests)}
    if provider is None or rate_evidence is None:
        raise CampaignError("provider_and_rates_required")
    pilot = rate_evidence.get("mode") == "pilot"
    if pilot and not sample_per_voice:
        raise CampaignError("pilot_requires_representative_sample")
    if decoder is decode_mp3 and not shutil.which("ffmpeg"):
        raise CampaignError("ffmpeg_required")
    directory = Path(directory)
    with run_lock(Path(lock_path) if lock_path else directory.parent / ".guided-audio-api.lock"):
        campaign = Campaign(directory, fingerprint)
        try:
            campaign.check_clear()
            rates = provider.preflight({(r["voice_id"], r["model_id"]) for r in requests},
                                       rate_evidence, campaign.rate_receipts())
            dispatched = 0
            for request in requests:
                cost = int((Decimal(len(request["text"])) * amount(rates.get((request["voice_id"], request["model_id"])))).to_integral_value(rounding=ROUND_CEILING))
                if not campaign.reserve(request, cost):
                    continue
                key = request["cache_key"]
                try:
                    receipt = provider.synthesize(request)
                except BaseException:
                    campaign.block(key, "transport_ambiguous")
                campaign.save_receipt(key, receipt)  # Durable receipt BEFORE decode/delivery.
                if receipt.status != 200 or not receipt.request_id or receipt.character_cost is None:
                    campaign.block(key, "response_requires_reconciliation", receipt)
                if receipt.character_cost > cost:
                    campaign.block(key, "billed_amount_exceeds_reservation", receipt)
                try:
                    decoder(receipt.audio, receipt.mime)
                    writer(directory / f"{key}.mp3", receipt.audio)
                except Exception:
                    campaign.block(key, "audio_validation_or_delivery_failed", receipt)
                with campaign.db:
                    campaign.db.execute("UPDATE requests SET state='ready' WHERE key=?", (key,))
                dispatched += 1
                if limit is not None and dispatched >= limit:
                    break
            return {"mode": "commit", "dispatched": dispatched, **campaign.summary()}
        finally:
            campaign.db.close()
