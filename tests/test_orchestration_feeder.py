"""Tests for src.orchestration.feeder — 3-source polling + routing.

Covers:
- _route_for_failed_stage for every §4.6 value (incl. 'unknown' backfill)
- _is_music_page_retry detection (§4.7 + CRIT-3)
- _route_retry: music-page retries route to post_video_queued regardless of failed_stage
- _handle_retry_word: honest idempotency test (pre-conditions verified)
- CRIT-4: retry SELECT + claim filter rejects live-stage words
- Source 3 orphan push-up-to-capacity
- Source 1 deck lock and job claim
"""

from __future__ import annotations

import asyncio
import importlib
import sys
import types
from pathlib import Path

import pytest

ORCH_ROOT = Path(__file__).resolve().parents[1]
if str(ORCH_ROOT) not in sys.path:
    sys.path.insert(0, str(ORCH_ROOT))

from tests.fake_supabase import FakeSupabase  # noqa: E402
from src.orchestration import feeder  # noqa: E402


def _run(coro):
    return asyncio.new_event_loop().run_until_complete(coro)


def _install_module(monkeypatch, name: str, **attrs):
    mod = types.ModuleType(name)
    for key, value in attrs.items():
        setattr(mod, key, value)
    monkeypatch.setitem(sys.modules, name, mod)
    return mod


def _install_job_runner_import_stubs(monkeypatch, sb):
    _install_module(monkeypatch, "dotenv", load_dotenv=lambda: None)
    _install_module(
        monkeypatch,
        "supabase",
        Client=object,
        create_client=lambda *_a, **_kw: sb,
    )
    monkeypatch.setenv("SUPABASE_URL", "https://example.invalid")
    monkeypatch.setenv("SUPABASE_SERVICE_KEY", "service-key")


def _fresh_queues():
    return (
        asyncio.Queue(maxsize=8),
        asyncio.Queue(maxsize=8),
        asyncio.Queue(maxsize=8),
        asyncio.Queue(maxsize=8),
    )


# ---------------------------------------------------------------------------
# _route_for_failed_stage (dashboard retries) — every §4.6 value
# ---------------------------------------------------------------------------

def test_routing_upstream_stages():
    for s in ("images", "concept", "song"):
        assert feeder._route_for_failed_stage(s) == ("pending", "upstream")


def test_routing_video():
    assert feeder._route_for_failed_stage("video") == ("video_queued", "video")


def test_routing_post_video_stages():
    for s in ("assembly", "bookend", "suno_bake", "uploading"):
        assert feeder._route_for_failed_stage(s) == ("post_video_queued", "post_video")


def test_route_for_failed_stage_pending_image_returns_card_queue():
    assert feeder._route_for_failed_stage("pending_image") == ("pending_image", "card")


def test_routing_unknown_backfill():
    assert feeder._route_for_failed_stage("unknown") == ("pending", "upstream")


def test_routing_none_defaults_to_upstream():
    assert feeder._route_for_failed_stage(None) == ("pending", "upstream")


def test_routing_unrecognized_defaults_to_upstream():
    assert feeder._route_for_failed_stage("wild_value") == ("pending", "upstream")


# ---------------------------------------------------------------------------
# CRIT-3: music-page retry detection and routing
# ---------------------------------------------------------------------------

def test_is_music_page_retry_shape():
    """§4.7 payload — music_state=pending, task_id/audio_url cleared, on a
    complete (or post_video_queued) word. No failed_stage set."""
    word = dict(
        current_stage="complete",
        music_state="pending",
        suno_task_id=None,
        suno_audio_url=None,
        failed_stage=None,
    )
    assert feeder._is_music_page_retry(word) is True


def test_is_music_page_retry_requires_cleared_task_id():
    """If suno_task_id is still set, it's NOT a music-page retry."""
    word = dict(
        current_stage="complete",
        music_state="pending",
        suno_task_id="abc-123",
        suno_audio_url=None,
    )
    assert feeder._is_music_page_retry(word) is False


def test_is_music_page_retry_requires_terminalish_stage():
    """A word in 'images' with music_state=pending is NOT a music-page
    retry — that's just a freshly-created word."""
    word = dict(
        current_stage="images",
        music_state="pending",
        suno_task_id=None,
        suno_audio_url=None,
    )
    assert feeder._is_music_page_retry(word) is False


def test_route_retry_music_page_goes_to_post_video():
    """CRIT-3: music-page retry routes to post_video_queued regardless of
    failed_stage. failed_stage is None on music-page retries (no failure)."""
    word = dict(
        current_stage="complete",
        music_state="pending",
        suno_task_id=None,
        suno_audio_url=None,
        failed_stage=None,
    )
    assert feeder._route_retry(word) == ("post_video_queued", "post_video")


def test_route_retry_dashboard_failed_video():
    """Dashboard retry with failed_stage=video routes to video queue."""
    word = dict(
        current_stage="failed",
        failed_stage="video",
        music_state="disabled",
    )
    assert feeder._route_retry(word) == ("video_queued", "video")


def test_route_retry_baked_complete_music_page_retry():
    """Edge: user clicks music-page retry on a complete baked word.
    Frontend sets music_state=pending + clears task/url.
    Feeder routes to post_video_queued; downstream inline-submits."""
    word = dict(
        current_stage="complete",
        music_state="pending",           # was 'baked' pre-click
        suno_task_id=None,               # cleared by frontend
        suno_audio_url=None,             # cleared by frontend
        failed_stage=None,
    )
    assert feeder._route_retry(word) == ("post_video_queued", "post_video")


# ---------------------------------------------------------------------------
# CRIT-4: retry claim refuses live-stage words
# ---------------------------------------------------------------------------

def test_retry_claim_refuses_live_word():
    """CRIT-4: a word in 'images' with retry_requested=true (UI bug) must NOT
    have its stage rewritten to 'pending' by the feeder."""
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="images",              # LIVE, worker owns it
        stage_attempts=1,
        retry_requested=True,                # accidentally set
        retry_requested_at="2026-04-18T00:00:00+00:00",
    )

    up, v, pv, c = _fresh_queues()

    async def _bootstrap(_): pass

    f = feeder.Feeder(
        sb,
        upstream_queue=up,
        video_queue=v,
        post_video_queue=pv,
        card_queue=c,
        bootstrap=_bootstrap,
    )
    _run(f._source2_retries())

    # Live word untouched.
    assert up.qsize() == v.qsize() == pv.qsize() == 0
    row = sb._tables["words"][0]
    assert row["current_stage"] == "images"
    assert row["retry_requested"] is True   # still flagged (worker didn't clear)
    assert row["stage_attempts"] == 1        # counter not reset


def test_retry_claim_failed_word_routes_per_section_4_6():
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="failed",
        failed_stage="video",
        retry_requested=True,
        retry_requested_at="2026-04-18T00:00:00+00:00",
        total_stage_attempts=3,
    )

    up, v, pv, c = _fresh_queues()
    f = feeder.Feeder(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
        bootstrap=lambda _: asyncio.sleep(0),
    )
    _run(f._source2_retries())

    assert v.qsize() == 1
    assert up.qsize() == pv.qsize() == 0
    row = sb._tables["words"][0]
    assert row["current_stage"] == "video_queued"
    assert row["retry_requested"] is False
    assert row["total_stage_attempts"] == 4   # HIGH-4


def test_source2_retry_failed_card_lands_in_card_queue():
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="failed",
        failed_stage="pending_image",
        retry_requested=True,
        retry_requested_at="2026-05-02T00:00:00+00:00",
        total_stage_attempts=2,
    )

    up, v, pv, c = _fresh_queues()
    f = feeder.Feeder(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
        bootstrap=lambda _: asyncio.sleep(0),
    )
    _run(f._source2_retries())

    assert c.qsize() == 1
    assert up.qsize() == v.qsize() == pv.qsize() == 0
    queued = c.get_nowait()
    assert queued["id"] == word["id"]
    assert queued["current_stage"] == "pending_image"
    row = sb._tables["words"][0]
    assert row["current_stage"] == "pending_image"
    assert row["retry_requested"] is False
    assert row["total_stage_attempts"] == 3


def test_music_page_retry_complete_word_routes_to_post_video():
    """CRIT-3 + CRIT-4 combined: music-page retry on a complete word,
    with failed_stage=NULL. Routes to post_video queue. Terminal filter
    passes because current_stage='complete'."""
    sb = FakeSupabase()
    word = sb.add_word(
        current_stage="complete",
        music_state="pending",
        suno_task_id=None,
        suno_audio_url=None,
        failed_stage=None,
        retry_requested=True,
        retry_requested_at="2026-04-18T00:00:00+00:00",
        total_stage_attempts=7,
    )

    up, v, pv, c = _fresh_queues()
    f = feeder.Feeder(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
        bootstrap=lambda _: asyncio.sleep(0),
    )
    _run(f._source2_retries())

    assert pv.qsize() == 1
    assert up.qsize() == v.qsize() == 0
    row = sb._tables["words"][0]
    assert row["current_stage"] == "post_video_queued"
    assert row["retry_requested"] is False
    assert row["total_stage_attempts"] == 8


# ---------------------------------------------------------------------------
# Source 3 orphan push-up-to-capacity
# ---------------------------------------------------------------------------

def test_source3_orphan_push_up_to_capacity():
    sb = FakeSupabase()
    job = sb.add_job(status="processing")
    for _ in range(5):
        sb.add_word(deck_id=job["deck_id"], current_stage="pending")
    for _ in range(2):
        sb.add_word(deck_id=job["deck_id"], current_stage="video_queued")

    upstream_q = asyncio.Queue(maxsize=3)
    video_q = asyncio.Queue(maxsize=2)
    post_video_q = asyncio.Queue(maxsize=8)
    card_q = asyncio.Queue(maxsize=8)

    f = feeder.Feeder(
        sb,
        upstream_queue=upstream_q,
        video_queue=video_q,
        post_video_queue=post_video_q,
        card_queue=card_q,
        bootstrap=lambda _: asyncio.sleep(0),
    )
    _run(f._source3_orphans())

    assert upstream_q.qsize() == 3
    assert video_q.qsize() == 2


# ---------------------------------------------------------------------------
# Source 1 deck lock
# ---------------------------------------------------------------------------

def test_deck_lock_blocks_second_job_same_deck():
    sb = FakeSupabase()
    sb.add_job(status="processing", deck_id="d-1")
    j2 = sb.add_job(status="approved", deck_id="d-1")

    up, v, pv, c = _fresh_queues()

    bootstrap_calls = {"n": 0}
    async def _bootstrap(job):
        bootstrap_calls["n"] += 1

    f = feeder.Feeder(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
        bootstrap=_bootstrap,
    )
    _run(f._try_start_job(dict(j2)))

    row = next(r for r in sb._tables["generation_jobs"] if r["id"] == j2["id"])
    assert row["status"] == "approved"
    assert bootstrap_calls["n"] == 0


def test_job_claim_failure_on_already_processing():
    sb = FakeSupabase()
    job = sb.add_job(status="processing")

    bootstrap_called = {"n": 0}
    async def _b(_): bootstrap_called["n"] += 1

    f = feeder.Feeder(
        sb,
        upstream_queue=asyncio.Queue(maxsize=8),
        video_queue=asyncio.Queue(maxsize=8),
        post_video_queue=asyncio.Queue(maxsize=8),
        card_queue=asyncio.Queue(maxsize=8),
        bootstrap=_b,
    )
    _run(f._try_start_job(dict(job)))
    assert bootstrap_called["n"] == 0


def test_bootstrap_writes_manifest_before_exposing_pending(monkeypatch, tmp_path):
    job = {
        "id": "job-1",
        "user_id": "u-1",
        "deck_id": "d-1",
        "target_language": "Spanish",
        "settings_override": {},
        "art_style": None,
        "movie_override": None,
    }

    sb = FakeSupabase()
    sb.add_word(
        id="w-1",
        deck_id="d-1",
        generation_job_id="job-1",
        word="hola",
        status="pending",
        current_stage="pre_bootstrap",
    )
    sb.add_word(
        id="w-2",
        deck_id="d-1",
        generation_job_id="job-2",
        word="adios",
        status="pending",
        current_stage="pre_bootstrap",
    )
    sb._tables["profiles"].append({"id": "u-1", "base_language": "English"})

    _install_module(
        monkeypatch,
        "src.settings",
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.storage",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
    )

    async def _run_enrichment(words, *_a, **_kw):
        return [
            {
                "input_word": words[0]["word"],
                "translation": "hello",
                "word_target": "hola",
                "mnemonic": "A neighbor waves hello from a sunlit doorway.",
                "dominant_emotional_reading": "friendly recognition",
                "composition_hint": "single",
                "treatment_hint": "literal",
            }
        ]

    _install_module(
        monkeypatch,
        "src.services.enrichment",
        run_enrichment=_run_enrichment,
    )
    _install_module(
        monkeypatch,
        "src.workspace",
        create_word_folder=lambda workspace_path, word_slug: (tmp_path / word_slug).mkdir(parents=True, exist_ok=True) or (tmp_path / word_slug),
    )
    _install_module(
        monkeypatch,
        "src.slugify",
        slugify=lambda text: "hola",
        language_to_code=lambda language: "es",
    )

    created = {"paths": [], "enrichment_data": []}

    def _create_manifest(*, word_dir, **_kw):
        created["paths"].append(word_dir / "manifest.json")
        created["enrichment_data"].append(_kw["enrichment_data"])
        (word_dir / "manifest.json").write_text("{}", encoding="utf-8")

    _install_module(
        monkeypatch,
        "src.manifest",
        create_manifest=_create_manifest,
    )

    _install_job_runner_import_stubs(monkeypatch, sb)
    import job_runner
    importlib.reload(job_runner)

    monkeypatch.setattr(job_runner, "merge_settings", lambda *_a, **_kw: {"concept": {"llm_model": "deepseek/deepseek-v4-flash"}, "suno": {"enabled": False}})

    original_transition = feeder.state.transition_stage
    pending_checks: list[Path] = []

    async def _transition(*args, **kwargs):
        if kwargs.get("new_stage") == "pending":
            manifest_path = tmp_path / "hola" / "manifest.json"
            pending_checks.append(manifest_path)
            assert manifest_path.exists()
        return await original_transition(*args, **kwargs)

    monkeypatch.setattr(feeder.state, "transition_stage", _transition)

    upstream_queue = asyncio.Queue(maxsize=2)
    _run(feeder.bootstrap_job(sb, job, upstream_queue=upstream_queue))

    row = sb._tables["words"][0]
    other = sb._tables["words"][1]
    assert created["paths"] == [tmp_path / "hola" / "manifest.json"]
    assert pending_checks == [tmp_path / "hola" / "manifest.json"]
    assert row["current_stage"] == "pending"
    assert row["word_slug"] == "hola"
    assert row["mnemonic"] == "A neighbor waves hello from a sunlit doorway."
    assert row["dominant_emotional_reading"] == "friendly recognition"
    assert row["composition_hint"] == "single"
    assert row["treatment_hint"] == "literal"
    assert created["enrichment_data"][0]["mnemonic"] == "A neighbor waves hello from a sunlit doorway."
    assert created["enrichment_data"][0]["dominant_emotional_reading"] == "friendly recognition"
    assert created["enrichment_data"][0]["composition_hint"] == "single"
    assert created["enrichment_data"][0]["treatment_hint"] == "literal"
    assert other["current_stage"] == "pre_bootstrap"
    assert other["word_slug"] == "hello"
    assert upstream_queue.qsize() == 1
    enrichment_calls = [
        params for name, params in sb.rpc_calls
        if name == "transition_word_stage" and params["p_new_stage"] == "enrichment"
    ]
    assert enrichment_calls[0]["p_allowed_prior_stages"] == ["pre_bootstrap", "pending"]


def test_layer2_lab_repeated_words_get_unique_variant_slugs(monkeypatch, tmp_path):
    jobs = [
        {
            "id": "job-1",
            "user_id": "u-1",
            "deck_id": "d-1",
            "target_language": "English",
            "art_style": None,
            "movie_override": None,
            "settings_override": {
                "layer2_eval": {
                    "source": "admin_layer2_lab_v1",
                    "script_index": 1,
                    "label": "realistic scene",
                    "meaning_strategy": "clear_meaning",
                    "presentation_form": "single_scene",
                    "art_style": "realistic",
                }
            },
        },
        {
            "id": "job-2",
            "user_id": "u-1",
            "deck_id": "d-1",
            "target_language": "English",
            "art_style": None,
            "movie_override": None,
            "settings_override": {
                "layer2_eval": {
                    "source": "admin_layer2_lab_v1",
                    "script_index": 2,
                    "label": "anime story",
                    "meaning_strategy": "absurd_hook",
                    "presentation_form": "mini_story",
                    "art_style": "anime",
                }
            },
        },
    ]

    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "d-1", "deck_type": "card"})
    sb._tables["profiles"].append({"id": "u-1", "base_language": "English"})
    sb.add_word(
        id="w-1",
        deck_id="d-1",
        generation_job_id="job-1",
        word="freedom",
        status="pending",
        current_stage="pre_bootstrap",
    )
    sb.add_word(
        id="w-2",
        deck_id="d-1",
        generation_job_id="job-2",
        word="freedom",
        status="pending",
        current_stage="pre_bootstrap",
    )

    _install_module(
        monkeypatch,
        "src.settings",
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.storage",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
    )

    async def _run_enrichment(words, *_a, **_kw):
        return [
            {
                "input_word": words[0]["word"],
                "translation": "liberty",
                "word_target": "freedom",
                "mnemonic": "A door opens onto a wide bright field.",
            }
        ]

    _install_module(
        monkeypatch,
        "src.services.enrichment",
        run_enrichment=_run_enrichment,
    )
    _install_module(
        monkeypatch,
        "src.workspace",
        create_word_folder=lambda workspace_path, word_slug: (tmp_path / word_slug).mkdir(parents=True, exist_ok=True) or (tmp_path / word_slug),
    )
    _install_module(
        monkeypatch,
        "src.slugify",
        slugify=lambda text, max_length=50: str(text).lower().replace(" ", "-")[:max_length],
        language_to_code=lambda language: "en",
    )

    manifests: list[dict[str, object]] = []

    def _create_manifest(**kwargs):
        manifests.append(kwargs)
        manifest_file = kwargs["word_dir"] / "manifest.json"
        manifest_file.write_text("{}", encoding="utf-8")

    _install_module(
        monkeypatch,
        "src.manifest",
        create_manifest=_create_manifest,
    )

    _install_job_runner_import_stubs(monkeypatch, sb)
    import job_runner
    importlib.reload(job_runner)

    monkeypatch.setattr(job_runner, "merge_settings", lambda *_a, **_kw: {"concept": {"llm_model": "deepseek/deepseek-v4-flash"}, "suno": {"enabled": False}})

    for current_job in jobs:
        _run(feeder.bootstrap_job(
            sb,
            current_job,
            upstream_queue=asyncio.Queue(maxsize=2),
            card_queue=asyncio.Queue(maxsize=2),
        ))

    first, second = sb._tables["words"]
    assert first["word"] == "freedom"
    assert second["word"] == "freedom"
    assert first["word_slug"] == "freedom-l2-001"
    assert second["word_slug"] == "freedom-l2-002"
    assert first["word_slug"] != second["word_slug"]
    assert first["metadata"]["layer2_eval"]["original_word"] == "freedom"
    assert second["metadata"]["layer2_eval"]["original_word"] == "freedom"
    assert first["metadata"]["layer2_eval"]["variant_slug"] == "freedom-l2-001"
    assert second["metadata"]["layer2_eval"]["variant_slug"] == "freedom-l2-002"
    assert [m["word_slug"] for m in manifests] == ["freedom-l2-001", "freedom-l2-002"]


def test_layer2_lab_same_word_infographic_variants_get_unique_slugs_and_metadata(monkeypatch, tmp_path):
    templates = [
        "infographic_knowledge_guide_v1",
        "infographic_language_atlas_v1",
        "infographic_study_poster_v1",
        "infographic_visual_dictionary_v1",
        "infographic_museum_exhibit_v1",
        "infographic_knowledge_guide_v2",
        "infographic_language_atlas_v2",
        "infographic_study_poster_v2",
        "infographic_visual_dictionary_v2",
        "infographic_museum_exhibit_v2",
        "infographic_language_atlas_v3_reference",
        "infographic_study_knowledge_v3_reference",
        "infographic_museum_exhibit_v3_reference",
    ]
    jobs = [
        {
            "id": f"job-{index}",
            "user_id": "u-1",
            "deck_id": "d-1",
            "target_language": "English",
            "art_style": None,
            "movie_override": None,
            "settings_override": {
                "layer2_eval": {
                    "source": "admin_layer2_lab_v1",
                    "script_index": index,
                    "lab_run_id": "safe1",
                    "original_word": "threshold",
                    "presentation_form": "infographic_card",
                    "backend_template": "infographic_prompt_v1",
                    "infographic_template": template,
                }
            },
        }
        for index, template in enumerate(templates, start=1)
    ]

    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "d-1", "deck_type": "card"})
    sb._tables["profiles"].append({"id": "u-1", "base_language": "German"})
    for index, job in enumerate(jobs, start=1):
        sb.add_word(
            id=f"w-{index}",
            deck_id="d-1",
            generation_job_id=job["id"],
            word="threshold",
            status="pending",
            current_stage="pre_bootstrap",
        )

    _install_module(
        monkeypatch,
        "src.settings",
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.storage",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
    )

    async def _run_enrichment(words, *_a, **_kw):
        return [
            {
                "input_word": words[0]["word"],
                "translation": "Schwelle",
                "word_target": "threshold",
                "mnemonic": "",
            }
        ]

    _install_module(
        monkeypatch,
        "src.services.enrichment",
        run_enrichment=_run_enrichment,
    )
    _install_module(
        monkeypatch,
        "src.workspace",
        create_word_folder=lambda workspace_path, word_slug: (tmp_path / word_slug).mkdir(parents=True, exist_ok=True) or (tmp_path / word_slug),
    )
    _install_module(
        monkeypatch,
        "src.slugify",
        slugify=lambda text, max_length=50: str(text).lower().replace(" ", "-")[:max_length],
        language_to_code=lambda language: "en",
    )

    manifests: list[dict[str, object]] = []

    def _create_manifest(**kwargs):
        manifests.append(kwargs)
        manifest_file = kwargs["word_dir"] / "manifest.json"
        manifest_file.write_text("{}", encoding="utf-8")

    _install_module(
        monkeypatch,
        "src.manifest",
        create_manifest=_create_manifest,
    )

    _install_job_runner_import_stubs(monkeypatch, sb)
    import job_runner
    importlib.reload(job_runner)

    monkeypatch.setattr(job_runner, "merge_settings", lambda *_a, **_kw: {"concept": {"llm_model": "deepseek/deepseek-v4-flash"}, "suno": {"enabled": False}})

    card_queue = asyncio.Queue(maxsize=20)
    for current_job in jobs:
        _run(feeder.bootstrap_job(
            sb,
            current_job,
            upstream_queue=asyncio.Queue(maxsize=2),
            card_queue=card_queue,
        ))

    slugs = [row["word_slug"] for row in sb._tables["words"]]
    expected_slugs = [f"threshold-l2-safe1-{index:03d}" for index in range(1, 14)]
    assert slugs == expected_slugs
    assert len(set(slugs)) == 13
    assert all(row["word"] == "threshold" for row in sb._tables["words"])
    assert [
        row["metadata"]["layer2_eval"]["original_word"]
        for row in sb._tables["words"]
    ] == ["threshold"] * 13
    assert [
        row["metadata"]["layer2_eval"]["backend_template"]
        for row in sb._tables["words"]
    ] == ["infographic_prompt_v1"] * 13
    assert [
        row["metadata"]["layer2_eval"]["infographic_template"]
        for row in sb._tables["words"]
    ] == templates
    assert [m["word_slug"] for m in manifests] == expected_slugs
    assert card_queue.qsize() == 13


def test_layer2_lab_append_runs_with_reset_indexes_do_not_collide(monkeypatch, tmp_path):
    jobs = [
        {
            "id": "job-1",
            "user_id": "u-1",
            "deck_id": "d-1",
            "target_language": "English",
            "art_style": None,
            "movie_override": None,
            "settings_override": {
                "layer2_eval": {
                    "source": "admin_layer2_lab_v1",
                    "script_index": 1,
                    "lab_run_id": "r7k3",
                    "variant_slug": "garage-l2-r7k3-001",
                    "original_word": "garage",
                    "label": "first append run",
                    "meaning_strategy": "clear_meaning",
                    "presentation_form": "single_scene",
                    "art_style": "realistic",
                }
            },
        },
        {
            "id": "job-2",
            "user_id": "u-1",
            "deck_id": "d-1",
            "target_language": "English",
            "art_style": None,
            "movie_override": None,
            "settings_override": {
                "layer2_eval": {
                    "source": "admin_layer2_lab_v1",
                    "script_index": 1,
                    "lab_run_id": "z9q2",
                    "variant_slug": "garage-l2-z9q2-001",
                    "original_word": "garage",
                    "label": "second append run",
                    "meaning_strategy": "absurd_hook",
                    "presentation_form": "mini_story",
                    "art_style": "cinematic",
                }
            },
        },
    ]

    sb = FakeSupabase()
    sb._tables["decks"].append({"id": "d-1", "deck_type": "card"})
    sb._tables["profiles"].append({"id": "u-1", "base_language": "English"})
    sb.add_word(
        id="w-1",
        deck_id="d-1",
        generation_job_id="job-1",
        word="garage",
        status="pending",
        current_stage="pre_bootstrap",
    )
    sb.add_word(
        id="w-2",
        deck_id="d-1",
        generation_job_id="job-2",
        word="garage",
        status="pending",
        current_stage="pre_bootstrap",
    )

    _install_module(
        monkeypatch,
        "src.settings",
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.storage",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
    )

    async def _run_enrichment(words, *_a, **_kw):
        return [
            {
                "input_word": words[0]["word"],
                "translation": "garage",
                "word_target": "garage",
                "mnemonic": "A garage door opens.",
            }
        ]

    _install_module(
        monkeypatch,
        "src.services.enrichment",
        run_enrichment=_run_enrichment,
    )
    _install_module(
        monkeypatch,
        "src.workspace",
        create_word_folder=lambda workspace_path, word_slug: (tmp_path / word_slug).mkdir(parents=True, exist_ok=True) or (tmp_path / word_slug),
    )
    _install_module(
        monkeypatch,
        "src.slugify",
        slugify=lambda text, max_length=50: str(text).lower().replace(" ", "-")[:max_length],
        language_to_code=lambda language: "en",
    )

    manifests: list[dict[str, object]] = []

    def _create_manifest(**kwargs):
        manifests.append(kwargs)
        manifest_file = kwargs["word_dir"] / "manifest.json"
        manifest_file.write_text("{}", encoding="utf-8")

    _install_module(
        monkeypatch,
        "src.manifest",
        create_manifest=_create_manifest,
    )

    _install_job_runner_import_stubs(monkeypatch, sb)
    import job_runner
    importlib.reload(job_runner)

    monkeypatch.setattr(job_runner, "merge_settings", lambda *_a, **_kw: {"concept": {"llm_model": "deepseek/deepseek-v4-flash"}, "suno": {"enabled": False}})

    for current_job in jobs:
        _run(feeder.bootstrap_job(
            sb,
            current_job,
            upstream_queue=asyncio.Queue(maxsize=2),
            card_queue=asyncio.Queue(maxsize=2),
        ))

    first, second = sb._tables["words"]
    assert first["word"] == "garage"
    assert second["word"] == "garage"
    assert first["word_slug"] == "garage-l2-r7k3-001"
    assert second["word_slug"] == "garage-l2-z9q2-001"
    assert first["word_slug"] != second["word_slug"]
    assert first["metadata"]["layer2_eval"]["lab_run_id"] == "r7k3"
    assert second["metadata"]["layer2_eval"]["lab_run_id"] == "z9q2"
    assert first["metadata"]["layer2_eval"]["original_word"] == "garage"
    assert second["metadata"]["layer2_eval"]["original_word"] == "garage"
    assert [m["word_slug"] for m in manifests] == [
        "garage-l2-r7k3-001",
        "garage-l2-z9q2-001",
    ]


def test_retry_flips_generation_job_id_parent_not_deck_latest():
    sb = FakeSupabase()
    parent = sb.add_job(
        id="job-parent",
        deck_id="d-1",
        status="complete",
        created_at="2026-04-18T00:00:00+00:00",
    )
    newer_same_deck = sb.add_job(
        id="job-newer",
        deck_id="d-1",
        status="failed",
        created_at="2026-04-19T00:00:00+00:00",
    )
    word = sb.add_word(
        id="w-retry",
        deck_id="d-1",
        generation_job_id=parent["id"],
        current_stage="failed",
        failed_stage="images",
        retry_requested=True,
        retry_requested_at="2026-04-20T00:00:00+00:00",
    )

    up, v, pv, c = _fresh_queues()
    f = feeder.Feeder(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
        bootstrap=lambda _: asyncio.sleep(0),
    )

    _run(f._handle_retry_word(dict(word)))

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert jobs[parent["id"]]["status"] == "processing"
    assert jobs[newer_same_deck["id"]]["status"] == "failed"
    assert up.qsize() == 1


def test_retry_waits_when_another_same_deck_job_is_processing():
    sb = FakeSupabase()
    parent = sb.add_job(
        id="job-parent",
        deck_id="d-1",
        status="complete",
        created_at="2026-04-18T00:00:00+00:00",
    )
    sb.add_job(
        id="job-active",
        deck_id="d-1",
        status="processing",
        created_at="2026-04-19T00:00:00+00:00",
    )
    word = sb.add_word(
        id="w-retry-blocked",
        deck_id="d-1",
        generation_job_id=parent["id"],
        current_stage="failed",
        failed_stage="images",
        retry_requested=True,
        retry_requested_at="2026-04-20T00:00:00+00:00",
    )

    up, v, pv, c = _fresh_queues()
    f = feeder.Feeder(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
        bootstrap=lambda _: asyncio.sleep(0),
    )

    _run(f._handle_retry_word(dict(word)))

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    row = next(row for row in sb._tables["words"] if row["id"] == word["id"])
    assert jobs[parent["id"]]["status"] == "complete"
    assert row["current_stage"] == "failed"
    assert row["retry_requested"] is True
    assert up.qsize() == 0


def test_retry_legacy_null_generation_job_id_flips_deck_latest_terminal_job():
    sb = FakeSupabase()
    older = sb.add_job(
        id="job-older",
        deck_id="d-1",
        status="complete",
        created_at="2026-04-18T00:00:00+00:00",
    )
    latest = sb.add_job(
        id="job-latest",
        deck_id="d-1",
        status="partial",
        created_at="2026-04-19T00:00:00+00:00",
    )
    word = sb.add_word(
        id="w-legacy-retry",
        deck_id="d-1",
        generation_job_id=None,
        current_stage="failed",
        failed_stage="images",
        retry_requested=True,
        retry_requested_at="2026-04-20T00:00:00+00:00",
    )

    up, v, pv, c = _fresh_queues()
    f = feeder.Feeder(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
        bootstrap=lambda _: asyncio.sleep(0),
    )

    _run(f._handle_retry_word(dict(word)))

    jobs = {row["id"]: row for row in sb._tables["generation_jobs"]}
    assert jobs[older["id"]]["status"] == "complete"
    assert jobs[latest["id"]]["status"] == "processing"
    assert up.qsize() == 1


def test_bootstrap_rolls_back_words_when_enrichment_fails(monkeypatch, tmp_path):
    job = {
        "id": "job-1",
        "user_id": "u-1",
        "deck_id": "d-1",
        "target_language": "Spanish",
        "settings_override": {},
        "art_style": None,
        "movie_override": None,
    }

    sb = FakeSupabase()
    sb.add_word(id="w-1", deck_id="d-1", word="hola", status="pending", current_stage="pending")
    sb.add_word(id="w-2", deck_id="d-1", word="agua", status="pending", current_stage="pending")
    sb._tables["profiles"].append({"id": "u-1", "base_language": "English"})

    _install_module(
        monkeypatch,
        "src.settings",
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.storage",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
    )

    async def _run_enrichment(*_a, **_kw):
        raise RuntimeError("openrouter 404")

    _install_module(
        monkeypatch,
        "src.services.enrichment",
        run_enrichment=_run_enrichment,
    )
    _install_module(
        monkeypatch,
        "src.workspace",
        create_word_folder=lambda workspace_path, word_slug: tmp_path / word_slug,
    )
    _install_module(
        monkeypatch,
        "src.slugify",
        slugify=lambda text: text,
        language_to_code=lambda language: "es",
    )
    _install_module(
        monkeypatch,
        "src.manifest",
        create_manifest=lambda *_a, **_kw: None,
    )

    _install_job_runner_import_stubs(monkeypatch, sb)
    import job_runner
    importlib.reload(job_runner)

    monkeypatch.setattr(job_runner, "merge_settings", lambda *_a, **_kw: {"concept": {"llm_model": "deepseek/deepseek-v4-flash"}, "suno": {"enabled": False}})
    info_logs: list[str] = []
    monkeypatch.setattr(
        feeder.log,
        "info",
        lambda msg, *args, **_kw: info_logs.append(msg % args if args else msg),
    )

    upstream_queue = asyncio.Queue(maxsize=2)
    with pytest.raises(RuntimeError, match="openrouter 404"):
        _run(feeder.bootstrap_job(sb, job, upstream_queue=upstream_queue))

    assert [row["current_stage"] for row in sb._tables["words"]] == ["pending", "pending"]
    assert [row["status"] for row in sb._tables["words"]] == ["pending", "pending"]
    assert upstream_queue.qsize() == 0
    assert "feeder/source1: rolled back 2 words from enrichment to pending for job=job-1" in info_logs


def test_bootstrap_crash_after_manifest_write_recovers_and_reruns(monkeypatch, tmp_path):
    from src.orchestration import recovery

    job = {
        "id": "job-1",
        "user_id": "u-1",
        "deck_id": "d-1",
        "target_language": "Spanish",
        "settings_override": {},
        "art_style": None,
        "movie_override": None,
    }

    sb = FakeSupabase()
    sb.add_job(id="job-1", deck_id="d-1", user_id="u-1", status="processing", target_language="Spanish")
    sb.add_word(id="w-1", deck_id="d-1", word="hola", status="pending", current_stage="pending")
    sb._tables["profiles"].append({"id": "u-1", "base_language": "English"})

    _install_module(
        monkeypatch,
        "src.settings",
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.storage",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
    )

    async def _run_enrichment(words, *_a, **_kw):
        return [
            {
                "input_word": words[0]["word"],
                "translation": "hello",
                "word_target": "hola",
            }
        ]

    _install_module(
        monkeypatch,
        "src.services.enrichment",
        run_enrichment=_run_enrichment,
    )
    _install_module(
        monkeypatch,
        "src.workspace",
        create_word_folder=lambda workspace_path, word_slug: (tmp_path / word_slug).mkdir(parents=True, exist_ok=True) or (tmp_path / word_slug),
    )
    _install_module(
        monkeypatch,
        "src.slugify",
        slugify=lambda text: "hola",
        language_to_code=lambda language: "es",
    )

    writes = {"n": 0}

    def _create_manifest(*, word_dir, **_kw):
        writes["n"] += 1
        (word_dir / "manifest.json").write_text(f"run={writes['n']}", encoding="utf-8")

    _install_module(
        monkeypatch,
        "src.manifest",
        create_manifest=_create_manifest,
    )

    _install_job_runner_import_stubs(monkeypatch, sb)
    import job_runner
    importlib.reload(job_runner)

    monkeypatch.setattr(job_runner, "merge_settings", lambda *_a, **_kw: {"concept": {"llm_model": "deepseek/deepseek-v4-flash"}, "suno": {"enabled": False}})

    original_transition = feeder.state.transition_stage
    crashed = {"done": False}

    async def _transition(*args, **kwargs):
        if kwargs.get("new_stage") == "pending" and not crashed["done"]:
            crashed["done"] = True
            raise RuntimeError("crash before pending exposure")
        return await original_transition(*args, **kwargs)

    monkeypatch.setattr(feeder.state, "transition_stage", _transition)

    upstream_queue = asyncio.Queue(maxsize=2)
    with pytest.raises(RuntimeError):
        _run(feeder.bootstrap_job(sb, job, upstream_queue=upstream_queue))

    row = sb._tables["words"][0]
    manifest_path = tmp_path / "hola" / "manifest.json"
    assert manifest_path.exists()
    assert row["current_stage"] == "enrichment"
    assert upstream_queue.qsize() == 0

    up = asyncio.Queue(maxsize=2)
    v = asyncio.Queue(maxsize=2)
    pv = asyncio.Queue(maxsize=2)
    c = asyncio.Queue(maxsize=2)
    _run(recovery.run_recovery_pass(
        sb, upstream_queue=up, video_queue=v, post_video_queue=pv, card_queue=c,
    ))

    job_row = sb._tables["generation_jobs"][0]
    row = sb._tables["words"][0]
    assert job_row["status"] == "approved"
    assert row["current_stage"] == "pending"

    monkeypatch.setattr(feeder.state, "transition_stage", original_transition)
    _run(feeder.bootstrap_job(sb, job, upstream_queue=upstream_queue))

    row = sb._tables["words"][0]
    assert writes["n"] == 2
    assert manifest_path.read_text(encoding="utf-8") == "run=2"
    assert row["current_stage"] == "pending"
    assert upstream_queue.qsize() == 1


def test_bootstrap_skips_cancelling_word_via_transition_stage(monkeypatch, tmp_path):
    job = {
        "id": "job-1",
        "user_id": "u-1",
        "deck_id": "d-1",
        "target_language": "Spanish",
        "settings_override": {},
        "art_style": None,
        "movie_override": None,
    }

    sb = FakeSupabase()
    sb.add_word(
        id="w-1",
        deck_id="d-1",
        word="hola",
        status="pending",
        current_stage="cancelling",
    )
    sb._tables["profiles"].append({"id": "u-1", "base_language": "English"})

    _install_module(
        monkeypatch,
        "src.settings",
        save_defaults=lambda *_a, **_kw: None,
        DEFAULT_SETTINGS={},
    )
    _install_module(
        monkeypatch,
        "src.storage",
        create_job_workspace=lambda user_id, deck_id: tmp_path,
    )
    _install_module(
        monkeypatch,
        "src.services.enrichment",
        run_enrichment=lambda *_a, **_kw: [],
    )
    _install_module(
        monkeypatch,
        "src.manifest",
        create_manifest=lambda *_a, **_kw: None,
    )
    _install_module(
        monkeypatch,
        "src.workspace",
        create_word_folder=lambda workspace_path, word_slug: tmp_path / word_slug,
    )
    _install_module(
        monkeypatch,
        "src.slugify",
        slugify=lambda text: "hola",
        language_to_code=lambda language: "es",
    )

    _install_job_runner_import_stubs(monkeypatch, sb)
    import job_runner
    importlib.reload(job_runner)

    monkeypatch.setattr(job_runner, "merge_settings", lambda *_a, **_kw: {"concept": {"llm_model": "deepseek/deepseek-v4-flash"}, "suno": {"enabled": False}})

    upstream_queue = asyncio.Queue(maxsize=1)
    with pytest.raises(RuntimeError, match="no words eligible for enrichment"):
        _run(feeder.bootstrap_job(sb, job, upstream_queue=upstream_queue))

    row = sb._tables["words"][0]
    assert row["current_stage"] == "cancelling"
    assert row["word_slug"] == "hello"
    assert upstream_queue.qsize() == 0


if __name__ == "__main__":
    failures = []
    for name, fn in sorted(globals().items()):
        if name.startswith("test_") and callable(fn):
            try:
                fn()
                print(f"PASS  {name}")
            except Exception as e:
                failures.append((name, e))
                print(f"FAIL  {name}: {e}")
    if failures:
        sys.exit(1)
