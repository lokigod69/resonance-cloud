from __future__ import annotations

import asyncio
import sys
import types


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


def test_upstream_video_lyrics_write_is_best_effort_before_submit(monkeypatch, tmp_path):
    from src.orchestration import retry, state, upstream_worker
    from src.orchestration.upstream_worker import UpstreamWorker

    word = {
        "id": "word-1",
        "user_id": "user-1",
        "deck_id": "deck-1",
        "word_slug": "bonjour",
        "generation_job_id": "gen-1",
        "suno_task_id": None,
    }
    calls: list[str] = []

    async def fake_submit(*_args, **_kwargs):
        calls.append("submit")

    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_args, **_kwargs: {"suno": {"enabled": True}},
    )
    _install_module(
        monkeypatch,
        "src.suno",
        read_concept_data=lambda *_args, **_kwargs: {
            "word": "bonjour",
            "translation": "hello",
            "lyrics": "provider lyrics",
            "music_caption": "bright pop",
            "language": "French",
            "vocal_gender": "female",
        },
        submit_song=fake_submit,
    )

    async def fake_fetch_word(_sb, _word_id):
        return dict(word)

    async def fake_run_stage_with_budget(*, run_once, **_kwargs):
        await run_once()

    async def failing_lyrics_write(*_args, **_kwargs):
        calls.append("lyrics")
        raise RuntimeError("lyrics db down")

    monkeypatch.setattr(state, "fetch_word", fake_fetch_word)
    monkeypatch.setattr(retry, "run_stage_with_budget", fake_run_stage_with_budget)
    monkeypatch.setattr(
        upstream_worker,
        "persist_video_pipeline_lyrics_best_effort",
        failing_lyrics_write,
        raising=False,
    )

    worker = UpstreamWorker(
        object(),
        upstream_queue=asyncio.Queue(),
        video_queue=asyncio.Queue(),
    )

    _run(worker._post_song_suno_submit(word, tmp_path, "bonjour"))

    assert calls == ["lyrics", "submit"]


def test_downstream_inline_submit_swallows_lyrics_persist_failure(monkeypatch, tmp_path):
    from tests.fake_supabase import FakeSupabase
    from src.orchestration import downstream_worker
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = sb.add_word(
        id="word-1",
        user_id="user-1",
        deck_id="deck-1",
        word_slug="bonjour",
        current_stage="suno_bake",
        music_state="pending",
        generation_job_id="gen-1",
    )
    calls: list[str] = []

    async def fake_submit_song(*_args, **_kwargs):
        calls.append("submit")
        return "task-1"

    async def failing_lyrics_write(*_args, **_kwargs):
        calls.append("lyrics")
        raise RuntimeError("lyrics db down")

    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_args, **_kwargs: {"suno": {"enabled": True}},
    )
    _install_module(
        monkeypatch,
        "src.suno",
        read_concept_data=lambda *_args, **_kwargs: {
            "word": "bonjour",
            "translation": "hello",
            "lyrics": "provider lyrics",
            "music_caption": "bright pop",
            "language": "French",
            "vocal_gender": "female",
        },
        submit_song=fake_submit_song,
    )
    monkeypatch.setattr(
        downstream_worker,
        "persist_video_pipeline_lyrics_best_effort",
        failing_lyrics_write,
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue())

    _run(worker._inline_submit(dict(word), tmp_path, "bonjour"))

    assert calls == ["lyrics", "submit"]
    assert sb._tables["words"][0]["music_state"] == "submitted"
