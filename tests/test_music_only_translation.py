from __future__ import annotations

import asyncio

from tests.fake_supabase import FakeSupabase


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _seed_music_only_job(sb: FakeSupabase) -> dict:
    job = {
        "id": "job-1",
        "user_id": "user-1",
        "word_id": "word-1",
        "deck_id": "deck-1",
        "status": "pending",
        "lyric_mode": "contextual",
        "genre": "pop",
        "vocal_gender": "female",
        "suno_task_id": None,
        "concept_artifact": None,
        "attempts": 1,
    }
    sb._tables["music_generation_jobs"] = [job]
    sb._tables["words"] = [
        {
            "id": "word-1",
            "user_id": "user-1",
            "deck_id": "deck-1",
            "word": "bonjour",
            "translation": "hello",
            "metadata": {},
        }
    ]
    sb._tables["decks"] = [{"id": "deck-1", "target_language": "French"}]
    sb._tables["profiles"] = [{"id": "user-1", "base_language": "English"}]
    return job


def test_song_only_worker_writes_music_lyrics_and_keeps_translation_out_of_suno(monkeypatch, tmp_path):
    from src.orchestration import music_only_worker
    from src.orchestration.music_only_worker import MusicOnlyWorker

    sb = FakeSupabase()
    job = _seed_music_only_job(sb)
    submitted: dict = {}

    async def fake_submit(concept_data, **_kwargs):
        submitted["concept_data"] = dict(concept_data)
        return "task-1"

    async def fake_poll(*_args, **_kwargs):
        return {"status": "pending", "task_id": "task-1", "audio_url": None, "error": None}

    async def fake_mark_submitted(_job_id, task_id):
        sb._tables["music_generation_jobs"][0]["status"] = "submitted"
        sb._tables["music_generation_jobs"][0]["suno_task_id"] = task_id

    monkeypatch.setattr(
        music_only_worker,
        "build_song_only_concept",
        lambda **_kwargs: {
            "concept_artifact": {
                "word": "bonjour",
                "translation": "hello",
                "language": "French",
                "language_code": "fr",
                "lyrics": "display lyrics",
                "suno_lyrics": "provider lyrics",
                "music_caption": "bright pop",
            },
            "concept_data": {
                "word": "bonjour",
                "translation": "hello",
                "lyrics": "provider lyrics",
                "music_caption": "bright pop",
                "language": "French",
                "vocal_gender": "female",
            },
        },
    )
    monkeypatch.setattr(music_only_worker, "submit_song_only_task", fake_submit)
    monkeypatch.setattr(music_only_worker, "fetch_existing_task", fake_poll)
    monkeypatch.setattr(
        music_only_worker,
        "translate_song_lyrics",
        lambda **_kwargs: {
            "status": "ok",
            "language": "English",
            "lyrics": "DO NOT SEND THIS TO SUNO",
            "model": "model-1",
            "translated_at": "2026-05-06T00:00:00+00:00",
        },
        raising=False,
    )

    worker = MusicOnlyWorker(sb, poll_interval=0.01, concurrency=1, workspace_root=tmp_path)
    monkeypatch.setattr(worker, "_fetch_candidate_jobs", lambda: asyncio.sleep(0, [job]))
    monkeypatch.setattr(worker, "_claim", lambda _job_id: asyncio.sleep(0, {**job, "status": "processing"}))
    monkeypatch.setattr(worker, "_mark_submitted", fake_mark_submitted)
    _run(worker.process_once())

    row = sb._tables["music_lyrics"][0]
    assert row["source_type"] == "song_only"
    assert row["source_job_id"] == job["id"]
    assert row["lyrics"] == "provider lyrics"
    assert row["suno_lyrics"] == "provider lyrics"
    assert row["translated_lyrics"] == "DO NOT SEND THIS TO SUNO"
    assert submitted["concept_data"]["lyrics"] == "provider lyrics"
    assert "translated_lyrics" not in submitted["concept_data"]
    assert "display_translation" not in submitted["concept_data"]


def test_song_only_worker_translation_failure_does_not_fail_song(monkeypatch, tmp_path):
    from src.orchestration import music_only_worker
    from src.orchestration.music_only_worker import MusicOnlyWorker

    sb = FakeSupabase()
    job = _seed_music_only_job(sb)
    submitted = {"called": False}

    async def fake_submit(*_args, **_kwargs):
        submitted["called"] = True
        return "task-1"

    async def fake_poll(*_args, **_kwargs):
        return {"status": "pending", "task_id": "task-1", "audio_url": None, "error": None}

    async def fake_mark_submitted(_job_id, task_id):
        sb._tables["music_generation_jobs"][0]["status"] = "submitted"
        sb._tables["music_generation_jobs"][0]["suno_task_id"] = task_id

    def raise_translation(**_kwargs):
        raise RuntimeError("translation down")

    monkeypatch.setattr(
        music_only_worker,
        "build_song_only_concept",
        lambda **_kwargs: {
            "concept_artifact": {
                "word": "bonjour",
                "translation": "hello",
                "language": "French",
                "language_code": "fr",
                "lyrics": "lyrics",
                "suno_lyrics": "lyrics",
                "music_caption": "bright pop",
            },
            "concept_data": {
                "word": "bonjour",
                "translation": "hello",
                "lyrics": "lyrics",
                "music_caption": "bright pop",
                "language": "French",
                "vocal_gender": "female",
            },
        },
    )
    monkeypatch.setattr(music_only_worker, "submit_song_only_task", fake_submit)
    monkeypatch.setattr(music_only_worker, "fetch_existing_task", fake_poll)
    monkeypatch.setattr(music_only_worker, "translate_song_lyrics", raise_translation, raising=False)

    worker = MusicOnlyWorker(sb, poll_interval=0.01, concurrency=1, workspace_root=tmp_path)
    monkeypatch.setattr(worker, "_fetch_candidate_jobs", lambda: asyncio.sleep(0, [job]))
    monkeypatch.setattr(worker, "_claim", lambda _job_id: asyncio.sleep(0, {**job, "status": "processing"}))
    monkeypatch.setattr(worker, "_mark_submitted", fake_mark_submitted)
    _run(worker.process_once())

    assert submitted["called"] is True
    assert sb._tables["music_generation_jobs"][0]["status"] in {"submitted", "polling"}


def test_song_only_unexpected_lyrics_persist_exception_does_not_block_submit(monkeypatch, tmp_path):
    from src.orchestration import music_only_worker
    from src.orchestration.music_only_worker import MusicOnlyWorker

    sb = FakeSupabase()
    job = _seed_music_only_job(sb)
    submitted = {"called": False}

    async def fake_submit(*_args, **_kwargs):
        submitted["called"] = True
        return "task-1"

    async def fake_poll(*_args, **_kwargs):
        return {"status": "pending", "task_id": "task-1", "audio_url": None, "error": None}

    async def fake_mark_submitted(_job_id, task_id):
        sb._tables["music_generation_jobs"][0]["status"] = "submitted"
        sb._tables["music_generation_jobs"][0]["suno_task_id"] = task_id

    monkeypatch.setattr(
        music_only_worker,
        "build_song_only_concept",
        lambda **_kwargs: {
            "concept_artifact": {"lyrics": "lyrics", "music_caption": "pop", "language": "English"},
            "concept_data": {
                "word": "labyrinth",
                "translation": "Labyrinth",
                "lyrics": "lyrics",
                "music_caption": "pop",
                "language": "English",
                "vocal_gender": "female",
            },
        },
    )
    monkeypatch.setattr(music_only_worker, "submit_song_only_task", fake_submit)
    monkeypatch.setattr(music_only_worker, "fetch_existing_task", fake_poll)

    worker = MusicOnlyWorker(sb, poll_interval=0.01, concurrency=1, workspace_root=tmp_path)
    monkeypatch.setattr(worker, "_fetch_candidate_jobs", lambda: asyncio.sleep(0, [job]))
    monkeypatch.setattr(worker, "_claim", lambda _job_id: asyncio.sleep(0, {**job, "status": "processing"}))
    monkeypatch.setattr(worker, "_mark_submitted", fake_mark_submitted)

    async def raise_unexpected(*_args, **_kwargs):
        raise RuntimeError("unexpected persist bug")

    monkeypatch.setattr(worker, "_persist_generated_lyrics", raise_unexpected)

    _run(worker.process_once())

    assert submitted["called"] is True
    assert sb._tables["music_generation_jobs"][0]["status"] in {"submitted", "polling"}


def test_song_only_worker_fetches_profile_base_language_as_translation_target(monkeypatch, tmp_path):
    from src.orchestration import music_only_worker
    from src.orchestration.music_only_worker import MusicOnlyWorker

    sb = FakeSupabase()
    job = _seed_music_only_job(sb)
    sb._tables["profiles"] = [{"id": "user-1", "base_language": "French"}]
    captured: dict = {}

    async def fake_submit(*_args, **_kwargs):
        return "task-1"

    async def fake_poll(*_args, **_kwargs):
        return {"status": "pending", "task_id": "task-1", "audio_url": None, "error": None}

    async def fake_mark_submitted(_job_id, task_id):
        sb._tables["music_generation_jobs"][0]["status"] = "submitted"
        sb._tables["music_generation_jobs"][0]["suno_task_id"] = task_id

    def fake_translate_song_lyrics(**kwargs):
        captured.update(kwargs)
        return {"status": "skipped", "reason": "translation_disabled"}

    monkeypatch.setattr(
        music_only_worker,
        "build_song_only_concept",
        lambda **_kwargs: {
            "concept_artifact": {
                "word": "labyrinth",
                "translation": "Labyrinth",
                "language": "English",
                "language_code": "en",
                "lyrics": "lyrics",
                "suno_lyrics": "lyrics",
                "music_caption": "pop",
            },
            "concept_data": {
                "word": "labyrinth",
                "translation": "Labyrinth",
                "lyrics": "lyrics",
                "music_caption": "pop",
                "language": "English",
                "vocal_gender": "female",
            },
        },
    )
    monkeypatch.setattr(music_only_worker, "translate_song_lyrics", fake_translate_song_lyrics)
    monkeypatch.setattr(music_only_worker, "submit_song_only_task", fake_submit)
    monkeypatch.setattr(music_only_worker, "fetch_existing_task", fake_poll)

    worker = MusicOnlyWorker(sb, poll_interval=0.01, concurrency=1, workspace_root=tmp_path)
    monkeypatch.setattr(worker, "_fetch_candidate_jobs", lambda: asyncio.sleep(0, [job]))
    monkeypatch.setattr(worker, "_claim", lambda _job_id: asyncio.sleep(0, {**job, "status": "processing"}))
    monkeypatch.setattr(worker, "_mark_submitted", fake_mark_submitted)

    _run(worker.process_once())

    assert captured["source_language"] == "English"
    assert captured["target_language"] == "French"
    assert sb._tables["music_lyrics"][0]["translation_language"] == "French"
    assert sb._tables["music_lyrics"][0]["translation_language_code"] == "fr"
