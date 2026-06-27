from __future__ import annotations

from pathlib import Path
from types import SimpleNamespace
import asyncio
from contextlib import contextmanager


REPO_ROOT = Path(__file__).resolve().parents[1]


def test_fetch_existing_task_treats_empty_kie_data_as_pending(monkeypatch):
    from src import suno

    class FakeEvent:
        def record_response(self, **_kwargs):
            pass

    @contextmanager
    def fake_logged_api_call(**_kwargs):
        yield FakeEvent()

    class FakeResponse:
        def raise_for_status(self):
            pass

        def json(self):
            return {"code": 200, "msg": "success", "data": None}

    class FakeAsyncClient:
        def __init__(self, *_args, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, *_args, **_kwargs):
            return FakeResponse()

    monkeypatch.setattr(suno, "get_api_key", lambda: "key")
    monkeypatch.setattr(suno, "logged_api_call", fake_logged_api_call)
    monkeypatch.setattr(suno.httpx, "AsyncClient", FakeAsyncClient)

    result = asyncio.run(suno.fetch_existing_task("task-1"))

    assert result["status"] == "pending"
    assert result["task_id"] == "task-1"
    assert result["audio_url"] is None


def test_fetch_existing_task_treats_kie_intermediate_statuses_as_pending(monkeypatch):
    from src import suno

    class FakeEvent:
        def record_response(self, **_kwargs):
            pass

    @contextmanager
    def fake_logged_api_call(**_kwargs):
        yield FakeEvent()

    class FakeResponse:
        def __init__(self, status):
            self.status = status

        def raise_for_status(self):
            pass

        def json(self):
            return {"code": 200, "msg": "success", "data": {"status": self.status}}

    statuses = iter(["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"])

    class FakeAsyncClient:
        def __init__(self, *_args, **_kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *_args):
            return None

        async def get(self, *_args, **_kwargs):
            return FakeResponse(next(statuses))

    monkeypatch.setattr(suno, "get_api_key", lambda: "key")
    monkeypatch.setattr(suno, "logged_api_call", fake_logged_api_call)
    monkeypatch.setattr(suno.httpx, "AsyncClient", FakeAsyncClient)

    for expected_status in ["PENDING", "TEXT_SUCCESS", "FIRST_SUCCESS"]:
        result = asyncio.run(suno.fetch_existing_task("task-1"))
        assert result["status"] == "pending"
        assert expected_status in result["error"]


def test_music_only_worker_records_post_submit_exception_as_poll_failure(monkeypatch, tmp_path):
    from src.orchestration.music_only_worker import MusicOnlyWorker

    class Response:
        def __init__(self, data):
            self.data = data

    class Query:
        def __init__(self, sb, table, op, payload=None):
            self.sb = sb
            self.table = table
            self.op = op
            self.payload = payload
            self.filters = []
            self.limit_n = None

        def select(self, *_cols):
            return self

        def update(self, payload):
            self.op = "update"
            self.payload = payload
            return self

        def eq(self, key, value):
            self.filters.append(("eq", key, value))
            return self

        def in_(self, key, values):
            self.filters.append(("in", key, values))
            return self

        def order(self, *_args, **_kwargs):
            return self

        def limit(self, value):
            self.limit_n = value
            return self

        def single(self):
            return self

        def maybe_single(self):
            return self

        def execute(self):
            rows = self.sb.tables[self.table]
            if self.op == "select":
                matched = [dict(row) for row in rows if self._matches(row)]
                if self.limit_n is not None:
                    matched = matched[: self.limit_n]
                return Response(matched[0] if len(matched) == 1 else matched)
            if self.op == "update":
                updated = []
                for row in rows:
                    if self._matches(row):
                        row.update(self.payload)
                        updated.append(dict(row))
                return Response(updated)
            raise AssertionError(self.op)

        def _matches(self, row):
            for kind, key, value in self.filters:
                if kind == "eq" and row.get(key) != value:
                    return False
                if kind == "in" and row.get(key) not in value:
                    return False
            return True

    class Table:
        def __init__(self, sb, name):
            self.sb = sb
            self.name = name

        def select(self, *_cols):
            return Query(self.sb, self.name, "select")

        def update(self, payload):
            return Query(self.sb, self.name, "update", payload)

    class Rpc:
        def __init__(self, sb, name, params):
            self.sb = sb
            self.name = name
            self.params = params

        def execute(self):
            self.sb.rpc_calls.append((self.name, dict(self.params)))
            job = self.sb.tables["music_generation_jobs"][0]
            if self.name == "claim_music_only_job":
                job.update({"status": "processing", "attempts": job["attempts"] + 1})
                return Response({"success": True, "job": dict(job)})
            if self.name == "mark_music_only_submitted":
                job.update({"status": "submitted", "suno_task_id": self.params["p_suno_task_id"]})
                return Response({"success": True})
            if self.name == "fail_music_only_job":
                job.update({"status": "failed", "failed_step": self.params["p_failed_step"]})
                return Response({"success": True})
            raise AssertionError(self.name)

    class FakeSupabase:
        def __init__(self):
            self.tables = {
                "music_generation_jobs": [{
                    "id": "job-1",
                    "user_id": "user-1",
                    "word_id": "word-1",
                    "deck_id": "deck-1",
                    "status": "pending",
                    "suno_task_id": None,
                    "concept_artifact": None,
                    "attempts": 0,
                }],
                "words": [{
                    "id": "word-1",
                    "word": "flowers",
                    "translation": "flowers",
                    "status": "complete",
                    "current_stage": "complete",
                    "metadata": {},
                }],
                "decks": [{"id": "deck-1", "target_language": "English"}],
            }
            self.rpc_calls = []

        def table(self, name):
            return Table(self, name)

        def rpc(self, name, params):
            return Rpc(self, name, params)

    async def fake_submit(*_args, **_kwargs):
        return "task-1"

    async def fake_poll(*_args, **_kwargs):
        raise RuntimeError("record-info returned empty data")

    monkeypatch.setattr(
        "src.orchestration.music_only_worker.build_song_only_concept",
        lambda **_kwargs: {
            "concept_artifact": {"music_caption": "electronic"},
            "concept_data": {
                "lyrics": "flowers",
                "music_caption": "electronic",
                "word": "flowers",
                "vocal_gender": "female",
            },
        },
    )
    monkeypatch.setattr("src.orchestration.music_only_worker.submit_song_only_task", fake_submit)
    monkeypatch.setattr("src.orchestration.music_only_worker.fetch_existing_task", fake_poll)

    sb = FakeSupabase()
    worker = MusicOnlyWorker(sb, poll_interval=0.01, concurrency=1, workspace_root=tmp_path)
    asyncio.run(worker.process_once())

    fail_calls = [params for name, params in sb.rpc_calls if name == "fail_music_only_job"]
    assert fail_calls[-1]["p_failed_step"] == "poll"


def test_song_only_concept_builds_payload_and_prefers_suno_lyrics(tmp_path, monkeypatch):
    from cloud_engines.concept_engine.models import ConceptResult
    from src.services import song_only_concept

    captured = {}

    def fake_workspace_root():
        return tmp_path

    def fake_generate_concept(payload):
        captured["payload"] = payload
        output_dir = Path(payload.output_dir)
        output_dir.mkdir(parents=True, exist_ok=True)
        artifact_path = output_dir / "concept.json"
        artifact_path.write_text(
            """{
              "word": "bonjour",
              "translation": "hello",
              "language": "French",
              "language_code": "fr",
              "lyrics": "display lyrics",
              "suno_lyrics": "provider lyrics",
              "music_caption": "acoustic pop, female vocal",
              "generation_info": {
                "lyric_mode": "contextual",
                "genre_mode": "manual",
                "syllable_count": 2,
                "word_length_class": "short",
                "llm_calls": 1,
                "lyrics_source": "llm",
                "caption_source": "llm",
                "article_used": ""
              }
            }""",
            encoding="utf-8",
        )
        return ConceptResult(status="success", output_paths=["concept.json"], error=None)

    monkeypatch.setattr(song_only_concept, "get_workspace_root", fake_workspace_root)
    monkeypatch.setattr(song_only_concept, "generate_concept", fake_generate_concept)

    result = song_only_concept.build_song_only_concept(
        job={
            "id": "job-1",
            "user_id": "user-1",
            "word_id": "word-1",
            "deck_id": "deck-1",
            "lyric_mode": "contextual",
            "genre": "acoustic pop",
            "vocal_gender": "female",
            "attempts": 1,
        },
        word={
            "id": "word-1",
            "word": "bonjour",
            "translation": "hello",
            "mnemonic": "sounds like bon journey",
            "pos": "interjection",
            "metadata": {"visual_card_plan": {"music_caption": "existing caption"}},
        },
        deck={"id": "deck-1", "target_language": "French"},
    )

    payload = captured["payload"]
    assert payload.content.word == "bonjour"
    assert payload.content.translation == "hello"
    assert payload.content.language == "French"
    assert payload.content.language_code == "fr"
    assert payload.content.external_music_caption is None
    assert payload.settings.lyric_mode == "contextual"
    assert payload.settings.genre == "acoustic pop"
    assert result["concept_data"]["lyrics"] == "provider lyrics"
    assert result["concept_data"]["music_caption"] == "acoustic pop, female vocal"


def test_song_only_suno_uploads_audio_without_updating_words(tmp_path, monkeypatch):
    from src.services import song_only_suno

    downloaded = []

    async def fake_download(url, dest_path):
        downloaded.append((url, dest_path.name))
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(b"mp3")
        return dest_path

    monkeypatch.setattr(song_only_suno, "download_suno_audio", fake_download)

    class FakeBucket:
        def __init__(self):
            self.uploads = []

        def upload(self, key, content, file_options=None):
            self.uploads.append((key, content, file_options))

        def get_public_url(self, key):
            return f"https://audio.example/{key}"

    class FakeStorage:
        def __init__(self):
            self.bucket = FakeBucket()

        def from_(self, bucket):
            assert bucket == "audio"
            return self.bucket

    sb = SimpleNamespace(storage=FakeStorage())

    result = asyncio.run(
        song_only_suno.download_and_upload_song_audio(
            sb,
            job={
                "id": "job-1",
                "user_id": "user-1",
                "deck_id": "deck-1",
                "word_id": "word-1",
                "word_slug": "bonjour",
            },
            audio_url="https://cdn.example/a.mp3",
            audio_url_b="https://cdn.example/b.mp3",
            work_dir=tmp_path,
        )
    )

    assert downloaded == [
        ("https://cdn.example/a.mp3", "suno_a.mp3"),
        ("https://cdn.example/b.mp3", "suno_b.mp3"),
    ]
    assert result == {
        "suno_storage_url": "https://audio.example/user-1/deck-1/music_only/word-1/job-1/suno_a.mp3",
        "suno_storage_url_b": "https://audio.example/user-1/deck-1/music_only/word-1/job-1/suno_b.mp3",
    }
    assert len(sb.storage.bucket.uploads) == 2


def test_song_only_suno_uses_level_storage_prefix(tmp_path, monkeypatch):
    from src.services import song_only_suno

    async def fake_download(_url, dest_path):
        dest_path.parent.mkdir(parents=True, exist_ok=True)
        dest_path.write_bytes(b"mp3")
        return dest_path

    monkeypatch.setattr(song_only_suno, "download_suno_audio", fake_download)

    class FakeBucket:
        def __init__(self):
            self.uploads = []

        def upload(self, key, content, file_options=None):
            self.uploads.append((key, content, file_options))

        def get_public_url(self, key):
            return f"https://audio.example/{key}"

    class FakeStorage:
        def __init__(self):
            self.bucket = FakeBucket()

        def from_(self, bucket):
            assert bucket == "audio"
            return self.bucket

    sb = SimpleNamespace(storage=FakeStorage())

    result = asyncio.run(
        song_only_suno.download_and_upload_song_audio(
            sb,
            job={
                "id": "job-1",
                "scope": "level",
                "user_id": "user-1",
                "deck_id": None,
                "word_id": None,
                "category_slug": "animals",
                "level_number": 8,
                "target_language": "German",
            },
            audio_url="https://cdn.example/a.mp3",
            audio_url_b=None,
            work_dir=tmp_path,
        )
    )

    assert result == {
        "suno_storage_url": "https://audio.example/user-1/no-deck/music_only/levels/animals/level-8/german/job-1/suno_a.mp3",
        "suno_storage_url_b": None,
    }
    assert len(sb.storage.bucket.uploads) == 1


def test_level_song_concept_builds_level_artifact(tmp_path, monkeypatch):
    from cloud_engines.concept_engine.models import CaptionResult
    from src.services import level_song_concept

    captured: dict = {}

    monkeypatch.setattr(level_song_concept, "get_workspace_root", lambda: tmp_path)
    monkeypatch.setattr(level_song_concept, "OpenRouterClient", lambda: object())

    def fake_generate_lyrics(**kwargs):
        captured["lyrics"] = kwargs
        return "[Verse]\nKrokodil singt\nNilpferd tanzt\n[Interlude]"

    def fake_generate_caption(word, translation, language, settings, llm_client, identity=None):
        captured["caption"] = {
            "word": word,
            "translation": translation,
            "language": language,
            "settings": settings,
            "identity": identity,
            "llm_client": llm_client,
        }
        return CaptionResult(
            caption="acoustic pop, German female vocal",
            source="llm_auto",
            language_injected=False,
        )

    monkeypatch.setattr(level_song_concept, "generate_level_song_lyrics", fake_generate_lyrics)
    monkeypatch.setattr(level_song_concept, "generate_caption", fake_generate_caption)

    result = level_song_concept.build_level_song_concept(
        job={
            "id": "job-1",
            "user_id": "user-1",
            "scope": "level",
            "category_slug": "animals",
            "level_number": 8,
            "target_language": "German",
            "display_title": "Animals Level 8",
            "word_list": [
                {"target": "Krokodil", "gloss": "crocodile"},
                {"target": "Nilpferd", "gloss": "hippopotamus"},
            ],
            "lyric_mode": "creative",
            "genre": None,
            "vocal_gender": "female",
            "attempts": 1,
        }
    )

    assert captured["lyrics"]["depth"] == "story"
    assert captured["lyrics"]["language"] == "German"
    assert captured["caption"]["word"] == "Animals Level 8"
    assert "Krokodil = crocodile" in captured["caption"]["translation"]
    assert captured["caption"]["settings"].genre == "auto"
    assert result["concept_data"]["word"] == "Animals Level 8"
    assert result["concept_data"]["lyrics"].endswith("[Interlude]")
    assert result["concept_artifact"]["scope"] == "level"
    assert result["concept_artifact"]["generation_info"]["level_depth"] == "story"
    assert Path(result["artifact_path"]).exists()


def test_music_only_worker_level_path_skips_word_lyrics_and_completes_level(monkeypatch, tmp_path):
    from src.orchestration import music_only_worker
    from src.orchestration.music_only_worker import MusicOnlyWorker
    from tests.fake_supabase import FakeSupabase

    sb = FakeSupabase()
    job = {
        "id": "job-1",
        "scope": "level",
        "user_id": "user-1",
        "word_id": None,
        "deck_id": None,
        "status": "pending",
        "category_slug": "animals",
        "level_number": 8,
        "target_language": "German",
        "display_title": "Animals Level 8",
        "word_list": [{"target": "Krokodil", "gloss": "crocodile"}],
        "lyric_mode": "reliable",
        "genre": None,
        "vocal_gender": "female",
        "suno_task_id": None,
        "concept_artifact": None,
        "attempts": 1,
    }
    sb._tables["music_generation_jobs"] = [job]
    captured: dict = {}

    async def fake_submit(concept_data, **kwargs):
        captured["submit"] = {"concept_data": concept_data, "kwargs": kwargs}
        return "task-1"

    async def fake_poll(*_args, **_kwargs):
        return {
            "status": "success",
            "task_id": "task-1",
            "audio_url": "https://cdn.example/a.mp3",
            "audio_url_b": None,
            "error": None,
        }

    async def fake_upload(*_args, **_kwargs):
        return {
            "suno_storage_url": "https://audio.example/a.mp3",
            "suno_storage_url_b": None,
        }

    async def fail_persist(*_args, **_kwargs):
        raise AssertionError("level jobs skip word lyric persistence")

    monkeypatch.setattr(
        music_only_worker,
        "build_level_song_concept",
        lambda **_kwargs: {
            "concept_artifact": {
                "scope": "level",
                "word": "Animals Level 8",
                "lyrics": "Krokodil\n[Interlude]",
                "suno_lyrics": "Krokodil\n[Interlude]",
                "music_caption": "pop",
            },
            "concept_data": {
                "word": "Animals Level 8",
                "translation": "",
                "lyrics": "Krokodil\n[Interlude]",
                "music_caption": "pop",
                "language": "German",
                "vocal_gender": "female",
            },
        },
    )
    monkeypatch.setattr(music_only_worker, "submit_song_only_task", fake_submit)
    monkeypatch.setattr(music_only_worker, "fetch_existing_task", fake_poll)
    monkeypatch.setattr(music_only_worker, "download_and_upload_song_audio", fake_upload)

    worker = MusicOnlyWorker(sb, poll_interval=0.01, concurrency=1, workspace_root=tmp_path)
    monkeypatch.setattr(worker, "_fetch_candidate_jobs", lambda: asyncio.sleep(0, [job]))
    monkeypatch.setattr(worker, "_claim", lambda _job_id: asyncio.sleep(0, {**job, "status": "processing"}))
    monkeypatch.setattr(worker, "_mark_submitted", lambda _job_id, task_id: asyncio.sleep(0, None))
    monkeypatch.setattr(worker, "_persist_generated_lyrics", fail_persist)

    async def fake_complete(job_id, **params):
        captured["complete"] = {"job_id": job_id, "params": params}

    monkeypatch.setattr(worker, "_complete", fake_complete)

    asyncio.run(worker.process_once())

    assert captured["submit"]["kwargs"]["word_id"] is None
    assert captured["submit"]["kwargs"]["deck_id"] is None
    assert captured["complete"]["params"]["scope"] == "level"
    assert captured["complete"]["params"]["lyrics"] == "Krokodil\n[Interlude]"


def test_music_only_worker_happy_path_keeps_full_pipeline_state_untouched(monkeypatch, tmp_path):
    from src.orchestration.music_only_worker import MusicOnlyWorker

    class Response:
        def __init__(self, data):
            self.data = data

    class Query:
        def __init__(self, sb, table, op, payload=None):
            self.sb = sb
            self.table = table
            self.op = op
            self.payload = payload
            self.filters = []
            self.limit_n = None

        def select(self, *_cols):
            return self

        def update(self, payload):
            self.op = "update"
            self.payload = payload
            return self

        def eq(self, key, value):
            self.filters.append(("eq", key, value))
            return self

        def in_(self, key, values):
            self.filters.append(("in", key, values))
            return self

        def order(self, *_args, **_kwargs):
            return self

        def limit(self, value):
            self.limit_n = value
            return self

        def single(self):
            return self

        def maybe_single(self):
            return self

        def execute(self):
            rows = self.sb.tables[self.table]
            if self.op == "select":
                matched = [dict(row) for row in rows if self._matches(row)]
                if self.limit_n is not None:
                    matched = matched[: self.limit_n]
                return Response(matched[0] if len(matched) == 1 else matched)
            if self.op == "update":
                updated = []
                for row in rows:
                    if self._matches(row):
                        row.update(self.payload)
                        updated.append(dict(row))
                return Response(updated)
            raise AssertionError(self.op)

        def _matches(self, row):
            for kind, key, value in self.filters:
                if kind == "eq" and row.get(key) != value:
                    return False
                if kind == "in" and row.get(key) not in value:
                    return False
            return True

    class Table:
        def __init__(self, sb, name):
            self.sb = sb
            self.name = name

        def select(self, *_cols):
            return Query(self.sb, self.name, "select")

        def update(self, payload):
            return Query(self.sb, self.name, "update", payload)

    class Rpc:
        def __init__(self, sb, name, params):
            self.sb = sb
            self.name = name
            self.params = params

        def execute(self):
            self.sb.rpc_calls.append((self.name, dict(self.params)))
            job = self.sb.tables["music_generation_jobs"][0]
            word = self.sb.tables["words"][0]
            if self.name == "claim_music_only_job":
                job.update({"status": "processing", "attempts": job["attempts"] + 1})
                return Response({"success": True, "job": dict(job)})
            if self.name == "mark_music_only_submitted":
                job.update({"status": "submitted", "suno_task_id": self.params["p_suno_task_id"]})
                word.update({"suno_task_id": self.params["p_suno_task_id"], "music_state": "submitted"})
                return Response({"success": True})
            if self.name == "complete_music_only_job":
                job.update({
                    "status": "complete",
                    "credits_charged": 10,
                    "suno_audio_url": self.params["p_suno_audio_url"],
                    "suno_storage_url": self.params["p_suno_storage_url"],
                })
                word.update({
                    "suno_audio_url": self.params["p_suno_audio_url"],
                    "suno_storage_url": self.params["p_suno_storage_url"],
                    "music_state": "baked",
                })
                return Response({"success": True})
            raise AssertionError(self.name)

    class FakeSupabase:
        def __init__(self):
            self.tables = {
                "music_generation_jobs": [{
                    "id": "job-1",
                    "user_id": "user-1",
                    "word_id": "word-1",
                    "deck_id": "deck-1",
                    "status": "pending",
                    "lyric_mode": "reliable",
                    "genre": None,
                    "vocal_gender": "female",
                    "suno_task_id": None,
                    "concept_artifact": None,
                    "attempts": 0,
                }],
                "words": [{
                    "id": "word-1",
                    "user_id": "user-1",
                    "deck_id": "deck-1",
                    "word": "bonjour",
                    "word_slug": "bonjour",
                    "translation": "hello",
                    "status": "complete",
                    "current_stage": "complete",
                    "music_state": "pending",
                    "metadata": {},
                }],
                "decks": [{"id": "deck-1", "target_language": "French"}],
                "generation_jobs": [],
            }
            self.rpc_calls = []

        def table(self, name):
            return Table(self, name)

        def rpc(self, name, params):
            return Rpc(self, name, params)

    async def fake_submit(*_args, **_kwargs):
        return "task-1"

    async def fake_poll(*_args, **_kwargs):
        return {
            "status": "success",
            "task_id": "task-1",
            "audio_url": "https://cdn.example/a.mp3",
            "audio_url_b": None,
            "error": None,
        }

    async def fake_upload(*_args, **_kwargs):
        return {
            "suno_storage_url": "https://audio.example/a.mp3",
            "suno_storage_url_b": None,
        }

    monkeypatch.setattr(
        "src.orchestration.music_only_worker.build_song_only_concept",
        lambda **_kwargs: {
            "concept_artifact": {"music_caption": "pop"},
            "concept_data": {"lyrics": "bonjour", "music_caption": "pop", "word": "bonjour", "vocal_gender": "female"},
        },
    )
    monkeypatch.setattr("src.orchestration.music_only_worker.submit_song_only_task", fake_submit)
    monkeypatch.setattr("src.orchestration.music_only_worker.fetch_existing_task", fake_poll)
    monkeypatch.setattr("src.orchestration.music_only_worker.download_and_upload_song_audio", fake_upload)

    sb = FakeSupabase()
    worker = MusicOnlyWorker(sb, poll_interval=0.01, concurrency=1, workspace_root=tmp_path)

    asyncio.run(worker.process_once())

    word = sb.tables["words"][0]
    job = sb.tables["music_generation_jobs"][0]
    assert word["current_stage"] == "complete"
    assert word["music_state"] == "baked"
    assert word["suno_storage_url"] == "https://audio.example/a.mp3"
    assert job["status"] == "complete"
    assert sb.tables["generation_jobs"] == []


def test_music_only_submit_rpc_idempotency_and_active_word_guards_precede_credit_debit():
    sql = (
        REPO_ROOT
        / "frontend"
        / "supabase"
        / "migrations"
        / "20260506091000_music_generation_jobs.sql"
    ).read_text(encoding="utf-8")

    same_key_check = sql.index("where user_id = v_user_id")
    same_key_return = sql.index("'idempotent', true")
    active_word_check = sql.index("where word_id = v_word.id")
    credit_debit = sql.index("set credits = credits - v_cost")

    assert same_key_check < same_key_return < credit_debit
    assert active_word_check < credit_debit
    assert "idx_music_generation_jobs_submit_idempotency" in sql
    assert "idx_music_generation_jobs_active_word" in sql


def test_music_only_creative_mode_is_allowed_by_addendum_migration():
    sql = (
        REPO_ROOT
        / "frontend"
        / "supabase"
        / "migrations"
        / "20260506100000_music_generation_jobs_allow_creative.sql"
    ).read_text(encoding="utf-8")

    assert "check (lyric_mode in ('reliable', 'contextual', 'creative', 'dramatic'))" in sql
    assert "v_lyric_mode not in ('reliable', 'contextual', 'creative', 'dramatic')" in sql
    assert "claim_music_only_job" not in sql
    assert "complete_music_only_job" not in sql
    assert "fail_music_only_job" not in sql


def test_level_music_migration_adds_level_scope_and_submit_rpc():
    sql = (
        REPO_ROOT
        / "frontend"
        / "supabase"
        / "migrations"
        / "20260628090000_level_music_generation_jobs.sql"
    ).read_text(encoding="utf-8")

    assert "alter column word_id drop not null" in sql
    assert "add column if not exists scope text not null default 'word'" in sql
    assert "add column if not exists category_slug text" in sql
    assert "add column if not exists level_number integer" in sql
    assert "add column if not exists target_language text" in sql
    assert "add column if not exists word_list jsonb" in sql
    assert "add column if not exists display_title text" in sql
    assert "add column if not exists lyrics text" in sql
    assert "idx_music_generation_jobs_active_level" in sql
    assert "create or replace function public.submit_level_music_only_job" in sql
    assert "create or replace function public.complete_level_music_only_job" in sql
    assert "grant execute on function public.submit_level_music_only_job" in sql
    assert "grant execute on function public.complete_level_music_only_job" in sql

    submit_body = sql.split("create or replace function public.submit_level_music_only_job", 1)[1].split(
        "create or replace function public.mark_music_only_submitted",
        1,
    )[0]
    same_key_check = submit_body.index("where user_id = v_user_id")
    same_key_return = submit_body.index("'idempotent', true")
    active_level_check = submit_body.index("and scope = 'level'")
    credit_debit = submit_body.index("set credits = credits - v_cost")

    assert same_key_check < same_key_return < credit_debit
    assert active_level_check < credit_debit
    assert "update public.words" not in submit_body
    assert "insert into public.words" not in submit_body
    assert "insert into public.decks" not in submit_body
    assert "scope," in submit_body
    assert "'level'," in submit_body

    assert "if v_job.scope = 'word' then" in sql


def test_frontend_song_submit_is_single_flight_and_idempotency_key_tracks_settings():
    helper = (REPO_ROOT / "frontend" / "src" / "lib" / "songGeneration.ts").read_text(encoding="utf-8")
    modal = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "components"
        / "song-generation"
        / "GenerateSongModal.tsx"
    ).read_text(encoding="utf-8")

    assert "wordId," in helper
    assert "lyricMode," in helper
    assert "(genre?.trim() || 'auto').toLowerCase()," in helper
    assert "vocalGender," in helper
    assert "sessionStorage.getItem(storageKey)" in helper
    assert "sessionStorage.setItem(storageKey, generated)" in helper

    assert "if (!track || submitting || insufficientCredits) return" in modal
    assert "disabled={!track || insufficientCredits || submitting}" in modal


def test_frontend_song_genre_picker_commits_custom_text_while_typing():
    picker = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "components"
        / "song-generation"
        / "SongGenrePicker.tsx"
    ).read_text(encoding="utf-8")

    assert "function commitCustomGenre(rawValue: string)" in picker
    assert "const nextCustom = event.target.value" in picker
    assert "setCustom(nextCustom)" in picker
    assert "commitCustomGenre(nextCustom)" in picker
    assert "onChange(trimmed || null)" in picker


def test_frontend_song_controls_present_random_and_simple_labels():
    wizard_data = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "components"
        / "generate"
        / "wizardData.ts"
    ).read_text(encoding="utf-8")
    generate_go = (REPO_ROOT / "frontend" / "src" / "pages" / "GenerateGO.tsx").read_text(encoding="utf-8")
    translations = (REPO_ROOT / "frontend" / "src" / "lib" / "translations.ts").read_text(encoding="utf-8")

    assert "{ value: 'auto', label: 'Random' }" in wizard_data
    assert "{ value: 'auto', label: 'Random' }" in generate_go
    assert translations.count("'modal.generateSong.depth.short': 'Simple'") == 2
    assert translations.count("'music.lyrics.mode.reliable': 'Simple'") == 2
    assert translations.count("'generate.niveau.short': 'Simple'") == 2
    assert translations.count("'modal.generateSong.depth.short': 'Einfach'") == 1
    assert translations.count("'music.lyrics.mode.reliable': 'Einfach'") == 1
    assert "'generate.niveau.short': 'Einfach'" in translations


def test_frontend_music_track_has_audio_helper_accepts_storage_or_provider_url():
    player_hook = (REPO_ROOT / "frontend" / "src" / "hooks" / "useMusicPlayer.ts").read_text(encoding="utf-8")
    music_page = (REPO_ROOT / "frontend" / "src" / "pages" / "Music.tsx").read_text(encoding="utf-8")
    music_pg_page = (REPO_ROOT / "frontend" / "src" / "pages" / "MusicPG.tsx").read_text(encoding="utf-8")
    playlist_row = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "components"
        / "music"
        / "PlaylistRow.tsx"
    ).read_text(encoding="utf-8")
    orb_row = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "components"
        / "music"
        / "OrbThumbnailRow.tsx"
    ).read_text(encoding="utf-8")

    assert "export function trackHasAudio" in player_hook
    assert "track.suno_storage_url ?? track.suno_audio_url" in player_hook
    assert "&& !track.error" in player_hook
    assert "tracks.filter(trackHasAudio)" in player_hook
    assert "trackHasAudio(track)" in music_page
    assert "trackHasAudio(track)" in music_pg_page
    assert "trackHasAudio(track)" in playlist_row
    assert "trackHasAudio(track)" in orb_row


def test_frontend_music_pages_refetch_on_mount_and_bust_cache_on_completion():
    music_page = (REPO_ROOT / "frontend" / "src" / "pages" / "Music.tsx").read_text(encoding="utf-8")
    music_pg_page = (REPO_ROOT / "frontend" / "src" / "pages" / "MusicPG.tsx").read_text(encoding="utf-8")

    assert "fetchTracks(true)" in music_page
    assert "fetchTracks(true)" in music_pg_page
    assert "const justCompleted = [...songStatusMap.keys()].filter((id) => !newMap.has(id))" in music_page
    assert "const justCompleted = [...songStatusMap.keys()].filter((id) => !newMap.has(id))" in music_pg_page


def test_music_pg_orb_no_audio_generation_action_is_icon_only():
    orb_row = (
        REPO_ROOT
        / "frontend"
        / "src"
        / "components"
        / "music"
        / "OrbThumbnailRow.tsx"
    ).read_text(encoding="utf-8")

    assert "aria-label={isGenerating ? t('music.generatingSong') : t('music.generateSong')}" in orb_row
    assert "title={isGenerating ? t('music.generatingSong') : t('music.generateSong')}" in orb_row
    assert "sr-only" in orb_row
    assert "inline h-3 w-3 mr-1" not in orb_row
    assert "h-6 rounded-md px-2 text-[10px]" not in orb_row


def test_music_lyrics_read_path_prefers_job_suno_lyrics_then_word_metadata_fallback():
    helper = (REPO_ROOT / "frontend" / "src" / "lib" / "musicLyrics.ts").read_text(encoding="utf-8")

    assert "extractMusicLyrics" in helper
    assert "conceptArtifact?.suno_lyrics" in helper
    assert "conceptArtifact?.lyrics" in helper
    assert "songGeneration?.suno_lyrics" in helper
    assert "songGeneration?.lyrics" in helper
