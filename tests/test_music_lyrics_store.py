from __future__ import annotations

from tests.fake_supabase import FakeSupabase

from src.services.music_lyrics_store import latest_music_lyrics_for_word, upsert_music_lyrics_row


def test_upsert_music_lyrics_row_writes_expected_shape():
    sb = FakeSupabase()

    ok = upsert_music_lyrics_row(
        sb,
        user_id="user-1",
        word_id="word-1",
        deck_id="deck-1",
        source_type="song_only",
        source_job_id="job-1",
        generation_job_id=None,
        provider_task_id="task-1",
        attempt_number=2,
        language="French",
        language_code="fr",
        lyric_mode="contextual",
        genre="jazz",
        music_caption="jazz trio",
        lyrics="canonical lyrics",
        suno_lyrics="provider lyrics",
        translation_status="ok",
        translation_language="English",
        translation_language_code="en",
        translated_lyrics="translated lyrics",
        translation_model="model-1",
        translation_warnings=["section_tag_count_mismatch"],
    )

    assert ok is True
    row = sb._tables["music_lyrics"][0]
    assert row["user_id"] == "user-1"
    assert row["word_id"] == "word-1"
    assert row["source_type"] == "song_only"
    assert row["source_job_id"] == "job-1"
    assert row["provider_task_id"] == "task-1"
    assert row["lyrics"] == "canonical lyrics"
    assert row["suno_lyrics"] == "provider lyrics"
    assert row["translated_lyrics"] == "translated lyrics"
    assert row["translation_warnings"] == ["section_tag_count_mismatch"]
    assert row["synced_lyrics"] is None


def test_upsert_music_lyrics_row_updates_song_only_source_job():
    sb = FakeSupabase()

    kwargs = {
        "user_id": "user-1",
        "word_id": "word-1",
        "deck_id": "deck-1",
        "source_type": "song_only",
        "source_job_id": "job-1",
        "generation_job_id": None,
        "provider_task_id": None,
        "language": "French",
        "language_code": "fr",
        "lyric_mode": "reliable",
        "genre": None,
        "music_caption": "caption",
        "lyrics": "first",
        "suno_lyrics": "first",
    }
    assert upsert_music_lyrics_row(sb, **kwargs) is True
    assert upsert_music_lyrics_row(sb, **{**kwargs, "lyrics": "second"}) is True

    assert len(sb._tables["music_lyrics"]) == 1
    assert sb._tables["music_lyrics"][0]["lyrics"] == "second"


def test_latest_music_lyrics_for_word_uses_created_at_descending():
    sb = FakeSupabase()
    sb._tables["music_lyrics"] = [
        {"id": "old", "word_id": "word-1", "created_at": "2026-05-06T00:00:00+00:00"},
        {"id": "new", "word_id": "word-1", "created_at": "2026-05-06T01:00:00+00:00"},
    ]

    row = latest_music_lyrics_for_word(sb, "word-1")

    assert row["id"] == "new"
