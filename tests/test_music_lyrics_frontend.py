from __future__ import annotations

from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[1]


def read_frontend(path: str) -> str:
    return (REPO_ROOT / "frontend" / "src" / path).read_text(encoding="utf-8")


def test_music_display_metadata_prefers_latest_complete_caption_over_auto_genre():
    helper = read_frontend("lib/musicDisplayMetadata.ts")

    assert "resolveTrackMusicCaption" in helper
    assert "latestMusicJob?.status === 'complete'" in helper
    assert "latestMusicJob?.music_caption" in helper
    assert "latestMusicJob?.concept_artifact?.music_caption" in helper
    assert "track.song_generation?.music_caption" in helper
    assert "track.metadata?.music_caption" in helper
    assert "track.genre?.toLowerCase() !== 'auto'" in helper


def test_compact_music_caption_segment_excludes_auto():
    helper = read_frontend("lib/musicDisplayMetadata.ts")

    assert "compactMusicCaptionSegment" in helper
    assert ".split(',')[0].trim()" in helper
    assert "normalized.toLowerCase() === 'auto'" in helper
    assert "return null" in helper


def test_lyrics_sheet_lazy_loads_latest_complete_music_job_with_metadata_fallback():
    sheet = read_frontend("components/music/LyricsSheet.tsx")

    assert ".from('music_generation_jobs')" in sheet
    assert ".select('concept_artifact, music_caption, genre, lyric_mode, vocal_gender, completed_at, created_at')" in sheet
    assert ".eq('word_id', track.id)" in sheet
    assert ".eq('status', 'complete')" in sheet
    assert ".order('completed_at', { ascending: false, nullsFirst: false })" in sheet
    assert ".order('created_at', { ascending: false })" in sheet
    assert ".limit(1)" in sheet
    assert "extractMusicLyrics" in sheet
    assert "songGeneration: track.song_generation" in sheet


def test_lyrics_extractor_prefers_concept_artifact_suno_lyrics():
    helper = read_frontend("lib/musicLyrics.ts")

    suno_idx = helper.index("const sunoLyrics = cleanText(conceptArtifact?.suno_lyrics)")
    concept_idx = helper.index("const conceptLyrics = cleanText(conceptArtifact?.lyrics)")
    metadata_suno_idx = helper.index("const metadataSunoLyrics = cleanText(songGeneration?.suno_lyrics)")
    assert suno_idx < concept_idx < metadata_suno_idx


def test_clean_display_lyrics_hides_raw_section_tags_without_mutating_extraction():
    helper = read_frontend("lib/musicLyrics.ts")
    sheet = read_frontend("components/music/LyricsSheet.tsx")

    assert "cleanDisplayLyrics" in helper
    for tag in ["Intro", "Verse", "Chorus", "Bridge", "Outro", "Hook", "Pre-Chorus"]:
        assert tag in helper
    assert "lyrics: sunoLyrics" in helper
    assert "cleanDisplayLyrics(state.lyrics)" in sheet


def test_clean_display_lyrics_preserves_stanzas_and_limits_excess_blank_lines():
    helper = read_frontend("lib/musicLyrics.ts")

    assert "lines.push('')" in helper
    assert ".replace(/\\n{3,}/g, '\\n\\n')" in helper
    assert ".trim()" in helper


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
    assert "compactMusicCaptionSegment(resolveTrackMusicCaption(track))" in row


def test_glassy_music_has_single_current_track_lyrics_button_not_orb_labels():
    music_pg = read_frontend("pages/MusicPG.tsx")
    orb_row = read_frontend("components/music/OrbThumbnailRow.tsx")

    assert "setLyricsTrack(currentTrack)" in music_pg
    assert "disabled={!currentTrack || !trackHasAudio(currentTrack)}" in music_pg
    assert "variant=\"glassy\"" in music_pg
    assert "compactMusicCaptionSegment(resolveTrackMusicCaption(currentTrack))" in music_pg
    assert "music.lyrics" not in orb_row
    assert "<span className=\"sr-only\">" in orb_row
    assert "<span className=\"sr-only\">\n                      {isGenerating ? t('music.generatingSong') : t('music.generateSong')}\n                    </span>" in orb_row


def test_lyrics_sheet_uses_centered_reading_overlay_with_internal_scroll():
    sheet = read_frontend("components/music/LyricsSheet.tsx")

    assert "DialogContent" in sheet
    assert "max-w-[min(900px,calc(100vw-2rem))]" in sheet
    assert "max-h-[70dvh]" in sheet
    assert "overflow-y-auto" in sheet
    assert "before:absolute before:inset-x-0 before:top-0" in sheet
    assert "after:absolute after:inset-x-0 after:bottom-0" in sheet
    assert "grid-cols-1" in sheet


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


def test_classic_player_bar_shows_current_track_thumbnail_without_playback_changes():
    player_bar = read_frontend("components/music/PlayerBar.tsx")

    assert "currentTrack?.thumbnail_url" in player_bar
    assert "alt={currentTrack.word}" in player_bar
    assert "hidden sm:flex h-10 w-10" in player_bar
    assert "<Music size={16}" in player_bar
    assert "audio.src" not in player_bar
