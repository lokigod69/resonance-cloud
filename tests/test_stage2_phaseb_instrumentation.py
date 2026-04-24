from __future__ import annotations

import asyncio
import importlib
import sys
import types
from pathlib import Path

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


def _import_real_module(name: str, *, clear: tuple[str, ...] = ()) -> types.ModuleType:
    for module_name in clear:
        sys.modules.pop(module_name, None)
    sys.modules.pop(name, None)
    importlib.invalidate_caches()
    return importlib.import_module(name)


def _install_fake_google_genai(monkeypatch):
    google_mod = types.ModuleType("google")
    genai_mod = types.ModuleType("google.genai")
    types_mod = types.ModuleType("google.genai.types")

    class _FakeClient:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

    class _Dummy:
        def __init__(self, *args, **kwargs):
            self.args = args
            self.kwargs = kwargs

    genai_mod.Client = _FakeClient
    types_mod.Part = _Dummy
    types_mod.Blob = _Dummy
    types_mod.Content = _Dummy
    types_mod.GenerateContentConfig = _Dummy
    types_mod.ImageConfig = _Dummy

    google_mod.genai = genai_mod
    genai_mod.types = types_mod

    monkeypatch.setitem(sys.modules, "google", google_mod)
    monkeypatch.setitem(sys.modules, "google.genai", genai_mod)
    monkeypatch.setitem(sys.modules, "google.genai.types", types_mod)

    pil_mod = types.ModuleType("PIL")
    image_mod = types.ModuleType("PIL.Image")
    image_draw_mod = types.ModuleType("PIL.ImageDraw")
    image_font_mod = types.ModuleType("PIL.ImageFont")

    class _DummyImage:
        @staticmethod
        def open(*_a, **_kw):
            raise RuntimeError("PIL open should not be called in this test")

    image_mod.open = _DummyImage.open
    image_draw_mod.Draw = _Dummy
    image_font_mod.truetype = lambda *_a, **_kw: _Dummy()
    image_font_mod.load_default = lambda: _Dummy()

    pil_mod.Image = image_mod
    pil_mod.ImageDraw = image_draw_mod
    pil_mod.ImageFont = image_font_mod

    monkeypatch.setitem(sys.modules, "PIL", pil_mod)
    monkeypatch.setitem(sys.modules, "PIL.Image", image_mod)
    monkeypatch.setitem(sys.modules, "PIL.ImageDraw", image_draw_mod)
    monkeypatch.setitem(sys.modules, "PIL.ImageFont", image_font_mod)


class _FakeEvent:
    def __init__(self, sink: dict, **kwargs):
        self._sink = sink
        self._sink["init"] = kwargs

    def __enter__(self):
        return self

    def record_response(self, **kwargs):
        self._sink.setdefault("records", []).append(kwargs)

    def __exit__(self, exc_type, exc, tb):
        self._sink["exit"] = (exc_type, exc)
        return False


def test_generate_storyboard_logs_event_with_identity(monkeypatch):
    _install_fake_google_genai(monkeypatch)
    from cloud_engines.image_engine import storyboard as module
    from cloud_engines.image_engine.models import ImageContent, ImageSettings

    calls: dict = {}

    class DummyStoryboard:
        def __init__(self, frame_narrative: str):
            self.frame_narrative = frame_narrative

        def model_copy(self, update):
            self.frame_narrative = update["frame_narrative"]
            return self

    monkeypatch.setattr(
        module,
        "logged_llm_call",
        lambda **kwargs: _FakeEvent(calls, **kwargs),
    )
    monkeypatch.setattr(module, "build_system_prompt", lambda **_: "system prompt")
    monkeypatch.setattr(module, "build_user_prompt", lambda **_: "user prompt")
    monkeypatch.setattr(module, "estimate_openrouter_cost", lambda *_: 0.123)
    monkeypatch.setattr(module.config, "OPENROUTER_API_KEY", "test-key")
    monkeypatch.setattr(
        module,
        "_call_openrouter",
        lambda **_: (
            '{"storyboard":"ok"}',
            {"prompt_tokens": 11, "completion_tokens": 7},
            "req-storyboard",
        ),
    )
    monkeypatch.setattr(
        module,
        "_parse_storyboard_json",
        lambda *_a, **_kw: DummyStoryboard("collection"),
    )

    storyboard, meta, _debug = module.generate_storyboard(
        content=ImageContent(
            word="hallo",
            translation="hello",
            language="German",
            language_code="de",
        ),
        context=None,
        settings=ImageSettings(frame_narrative="collection"),
        word_id="word-1",
        deck_id="deck-1",
        user_id="user-1",
        job_id="job-1",
        attempt=3,
    )

    assert storyboard.frame_narrative == "collection"
    assert calls["init"]["stage"] == "images"
    assert calls["init"]["sub_step"] == "storyboard_llm"
    assert calls["init"]["word_id"] == "word-1"
    assert calls["init"]["deck_id"] == "deck-1"
    assert calls["init"]["user_id"] == "user-1"
    assert calls["init"]["job_id"] == "job-1"
    assert calls["records"][-1]["request_id"] == "req-storyboard"
    assert calls["records"][-1]["tokens_in"] == 11
    assert calls["records"][-1]["tokens_out"] == 7
    assert meta.cost_estimate_usd == 0.123


def test_render_scene_logs_wan_provider_metadata(monkeypatch, tmp_path):
    _install_fake_google_genai(monkeypatch)
    from cloud_engines.image_engine import renderer
    from cloud_engines.image_engine import wan_provider
    from cloud_engines.image_engine.models import ImagePromptData

    calls: dict = {}

    monkeypatch.setattr(
        renderer,
        "logged_api_call",
        lambda **kwargs: _FakeEvent(calls, **kwargs),
    )
    monkeypatch.setattr(wan_provider, "_upload_for_chaining", lambda *_a, **_kw: None)

    def _fake_render_scene_wan(**kwargs):
        return {
            "success": True,
            "file_path": Path(kwargs["output_path"]).name,
            "error_message": None,
            "prompt_text": "compiled prompt",
            "response_body": '{"state":"success"}',
            "provider_name": "wan",
            "model_name": kwargs["model_id"],
            "request_id": "task-123",
            "cost_estimate_usd": 0.04,
        }

    monkeypatch.setattr(wan_provider, "render_scene_wan", _fake_render_scene_wan)

    result = renderer.render_scene(
        image_prompt=ImagePromptData(
            subject="cat",
            scene="on a wall",
            style="photorealistic",
            lighting="daylight",
            composition="close-up",
            mood="calm",
            colors=["#ffffff", "#000000"],
            details="high detail",
        ),
        model_id="wan/2-7-image",
        output_path=tmp_path / "001.png",
        word_id="word-2",
        deck_id="deck-2",
        user_id="user-2",
        job_id="job-2",
        attempt=4,
    )

    assert calls["init"]["stage"] == "images"
    assert calls["init"]["sub_step"] == "render_scene"
    assert calls["init"]["word_id"] == "word-2"
    assert calls["records"][-1]["request_id"] == "task-123"
    assert calls["records"][-1]["provider"] == "wan"
    assert result.provider_name == "wan"
    assert result.request_id == "task-123"
    assert result.model_name == "wan/2-7-image"


def test_submit_song_emits_skipped_event_when_already_complete(monkeypatch):
    suno = _import_real_module("src.suno")

    class FakeQuery:
        def __init__(self, data):
            self._data = data

        def select(self, *_a, **_kw):
            return self

        def eq(self, *_a, **_kw):
            return self

        def single(self):
            return self

        def execute(self):
            return types.SimpleNamespace(data=self._data)

    class FakeSb:
        def __init__(self, data):
            self._data = data

        def table(self, _name):
            return FakeQuery(self._data)

    events: list[dict] = []
    monkeypatch.setattr(
        suno,
        "_get_sb_client",
        lambda: FakeSb({"suno_audio_url": "https://example.invalid/a.mp3"}),
    )
    monkeypatch.setattr(suno, "write_event_row", lambda **kwargs: events.append(kwargs))

    result = _run(
        suno.submit_song(
            "deck-1",
            "hallo",
            {
                "lyrics": "Hallo",
                "music_caption": "Pop",
                "word": "Hallo",
                "vocal_gender": "female",
            },
            word_id="word-3",
            user_id="user-3",
            job_id="job-3",
        )
    )

    assert result == ""
    assert events[0]["status"] == "skipped"
    assert events[0]["metadata"]["reason"] == "already_complete"
    assert events[0]["word_id"] == "word-3"


def test_submit_song_emits_skipped_event_when_task_already_submitted(monkeypatch):
    suno = _import_real_module("src.suno")

    class FakeQuery:
        def __init__(self, data):
            self._data = data

        def select(self, *_a, **_kw):
            return self

        def eq(self, *_a, **_kw):
            return self

        def single(self):
            return self

        def execute(self):
            return types.SimpleNamespace(data=self._data)

    class FakeSb:
        def __init__(self, data):
            self._data = data

        def table(self, _name):
            return FakeQuery(self._data)

    events: list[dict] = []
    monkeypatch.setattr(
        suno,
        "_get_sb_client",
        lambda: FakeSb({"suno_task_id": "task-abc", "suno_audio_url": None}),
    )
    monkeypatch.setattr(suno, "write_event_row", lambda **kwargs: events.append(kwargs))

    result = _run(
        suno.submit_song(
            "deck-2",
            "ciao",
            {
                "lyrics": "Ciao",
                "music_caption": "Pop",
                "word": "Ciao",
                "vocal_gender": "female",
            },
            word_id="word-4",
            user_id="user-4",
            job_id="job-4",
        )
    )

    assert result == "task-abc"
    assert events[0]["status"] == "skipped"
    assert events[0]["metadata"]["reason"] == "task_already_submitted"
    assert events[0]["request_id"] == "task-abc"


def test_fetch_existing_task_logs_event_with_identity(monkeypatch):
    suno = _import_real_module("src.suno")

    calls: dict = {}

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {"data": {"status": "waiting"}}

    class FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, *_a, **_kw):
            return FakeResponse()

    monkeypatch.setattr(
        suno,
        "logged_api_call",
        lambda **kwargs: _FakeEvent(calls, **kwargs),
    )
    monkeypatch.setattr(suno.httpx, "AsyncClient", lambda timeout: FakeClient())
    monkeypatch.setattr(suno, "get_api_key", lambda: "kie-key")

    result = _run(
        suno.fetch_existing_task(
            "task-fetch",
            word_id="word-5",
            deck_id="deck-5",
            user_id="user-5",
            job_id="job-5",
        )
    )

    assert result["status"] == "pending"
    assert calls["init"]["sub_step"] == "fetch_existing_task"
    assert calls["init"]["word_id"] == "word-5"
    assert calls["records"][-1]["request_id"] == "task-fetch"


def test_bake_suno_into_word_emits_already_baked_skip(monkeypatch, tmp_path):
    suno_bakein = _import_real_module(
        "src.services.suno_bakein",
        clear=("src.manifest", "src.pipeline", "src.suno"),
    )

    events: list[dict] = []
    monkeypatch.setattr(
        suno_bakein, "write_event_row", lambda **kwargs: events.append(kwargs)
    )

    result = _run(
        suno_bakein.bake_suno_into_word(
            sb_client=None,
            workspace_path=tmp_path,
            word_dir=tmp_path / "word",
            word_slug="word",
            word_record={
                "id": "word-6",
                "user_id": "user-6",
                "deck_id": "deck-6",
                "generation_job_id": "job-6",
                "suno_audio_url": "https://example.invalid/a.mp3",
            },
            suno_settings={},
            bookend_defaults={},
            skip_suno_guard=False,
        )
    )

    assert result["error"] == "already_set"
    assert events[0]["sub_step"] == "bake_suno"
    assert events[0]["status"] == "skipped"
    assert events[0]["metadata"]["reason"] == "already_baked"


def test_bake_suno_into_word_emits_poll_resumed(monkeypatch, tmp_path):
    suno_bakein = _import_real_module(
        "src.services.suno_bakein",
        clear=("src.manifest", "src.pipeline", "src.suno"),
    )

    events: list[dict] = []
    fetch_calls: list[dict] = []

    async def _fake_fetch(task_id, **kwargs):
        fetch_calls.append({"task_id": task_id, **kwargs})
        return {
            "status": "pending",
            "task_id": task_id,
            "audio_url": None,
            "audio_url_b": None,
            "error": "still running",
        }

    async def _fake_generate_song(*_a, **_kw):
        return {"status": "error", "error": "fresh submit failed"}

    monkeypatch.setattr(
        suno_bakein, "write_event_row", lambda **kwargs: events.append(kwargs)
    )
    monkeypatch.setattr(suno_bakein, "fetch_existing_task", _fake_fetch)
    monkeypatch.setattr(suno_bakein, "suno_generate_song", _fake_generate_song)

    result = _run(
        suno_bakein.bake_suno_into_word(
            sb_client=None,
            workspace_path=tmp_path,
            word_dir=tmp_path / "word",
            word_slug="word",
            word_record={
                "id": "word-7",
                "user_id": "user-7",
                "deck_id": "deck-7",
                "generation_job_id": "job-7",
                "suno_task_id": "task-7",
            },
            suno_settings={},
            bookend_defaults={},
            skip_suno_guard=False,
        )
    )

    assert result["success"] is False
    assert events[0]["sub_step"] == "poll_resumed"
    assert fetch_calls[0]["word_id"] == "word-7"
    assert fetch_calls[0]["deck_id"] == "deck-7"
    assert fetch_calls[0]["user_id"] == "user-7"
    assert fetch_calls[0]["job_id"] == "job-7"


def test_upstream_post_song_submit_passes_identity(monkeypatch, tmp_path):
    from src.orchestration.upstream_worker import UpstreamWorker

    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="song",
        generation_job_id="job-upstream",
        user_id="user-upstream",
        deck_id="deck-upstream",
        word_slug="hallo",
    )

    submit_calls: list[dict] = []
    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_a, **_kw: {"suno": {"enabled": True}},
    )
    _install_module(
        monkeypatch,
        "src.suno",
        read_concept_data=lambda *_a, **_kw: {"lyrics": "Hallo"},
        submit_song=lambda deck_id, word_slug, concept_data, **kwargs: submit_calls.append(
            {
                "deck_id": deck_id,
                "word_slug": word_slug,
                "concept_data": concept_data,
                **kwargs,
            }
        ) or asyncio.sleep(0),
    )

    worker = UpstreamWorker(
        sb,
        upstream_queue=asyncio.Queue(maxsize=1),
        video_queue=asyncio.Queue(maxsize=1),
    )
    _run(worker._post_song_suno_submit(word, tmp_path, "hallo"))

    assert submit_calls[0]["word_id"] == word["id"]
    assert submit_calls[0]["user_id"] == "user-upstream"
    assert submit_calls[0]["job_id"] == "job-upstream"


def test_downstream_inline_submit_passes_identity(monkeypatch, tmp_path):
    from src.orchestration.downstream_worker import DownstreamWorker

    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="suno_bake",
        generation_job_id="job-downstream",
        user_id="user-downstream",
        deck_id="deck-downstream",
        word_slug="ciao",
    )

    submit_calls: list[dict] = []
    _install_module(
        monkeypatch,
        "src.settings",
        load_defaults=lambda *_a, **_kw: {"suno": {"enabled": True}},
    )
    _install_module(
        monkeypatch,
        "src.suno",
        read_concept_data=lambda *_a, **_kw: {"lyrics": "Ciao"},
        submit_song=lambda deck_id, word_slug, concept_data, **kwargs: submit_calls.append(
            {
                "deck_id": deck_id,
                "word_slug": word_slug,
                "concept_data": concept_data,
                **kwargs,
            }
        ) or asyncio.sleep(0),
    )

    worker = DownstreamWorker(sb, post_video_queue=asyncio.Queue(maxsize=1))
    _run(worker._inline_submit(word, tmp_path, "ciao"))

    assert submit_calls[0]["word_id"] == word["id"]
    assert submit_calls[0]["user_id"] == "user-downstream"
    assert submit_calls[0]["job_id"] == "job-downstream"
