from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def read_frontend(path: str) -> str:
    return (REPO_ROOT / "frontend" / "src" / path).read_text(encoding="utf-8")


def test_lyrics_sheet_lazy_loads_latest_complete_music_job_with_metadata_fallback():
    sheet = read_frontend("components/music/LyricsSheet.tsx")

    assert ".from('music_generation_jobs')" in sheet
    assert ".select('concept_artifact, genre, lyric_mode, vocal_gender, completed_at, created_at')" in sheet
    assert ".eq('word_id', track.id)" in sheet
    assert ".eq('status', 'complete')" in sheet
    assert ".order('completed_at', { ascending: false, nullsFirst: false })" in sheet
    assert ".order('created_at', { ascending: false })" in sheet
    assert ".limit(1)" in sheet
    assert "extractMusicLyrics" in sheet
    assert "songGeneration: track.song_generation" in sheet


def test_classic_music_has_row_level_lyrics_button_only_for_audio_tracks():
    row = read_frontend("components/music/PlaylistRow.tsx")
    music = read_frontend("pages/Music.tsx")

    assert "onShowLyrics?: () => void" in row
    assert "title={t('music.lyrics')}" in row
    assert "aria-label={t('music.lyrics')}" in row
    assert "onClick={(e) => { e.stopPropagation(); onShowLyrics?.() }}" in row
    assert "hasAudio ? (" in row
    assert "onShowLyrics={() => setLyricsTrack(track)}" in music
    assert "<LyricsSheet" in music
    assert "variant=\"classic\"" in music


def test_glassy_music_has_single_current_track_lyrics_button_not_orb_labels():
    music_pg = read_frontend("pages/MusicPG.tsx")
    orb_row = read_frontend("components/music/OrbThumbnailRow.tsx")

    assert "setLyricsTrack(currentTrack)" in music_pg
    assert "disabled={!currentTrack || !trackHasAudio(currentTrack)}" in music_pg
    assert "variant=\"glassy\"" in music_pg
    assert "music.lyrics" not in orb_row


def test_music_lyrics_labels_are_translated_for_en_de_fr():
    translations = read_frontend("lib/translations.ts")

    for key in [
        "music.lyrics",
        "music.lyrics.loading",
        "music.lyrics.empty",
        "music.lyrics.error",
        "music.lyrics.genre",
        "music.lyrics.lyricMode",
    ]:
        assert translations.count(f"'{key}'") == 3
