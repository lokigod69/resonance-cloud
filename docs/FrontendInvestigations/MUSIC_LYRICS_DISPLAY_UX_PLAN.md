# Music Lyrics Display UX Plan

Date: 2026-05-06

## Current Storage

Lyrics are currently saved in `public.music_generation_jobs.concept_artifact`.

The live Flowers job `7f66db15-8507-48f5-b192-a0afa90d8886` has these concept artifact keys:

- `word`
- `translation`
- `language`
- `language_code`
- `lyrics`
- `suno_lyrics`
- `music_caption`
- `visual_hint`
- `generation_info`

For Flowers, `concept_artifact.suno_lyrics` exists and should be preferred over `concept_artifact.lyrics` for display because it is the provider-ready lyric text passed to Suno.

`words.metadata.song_generation` currently stores request/status fields, including genre, lyric mode, vocal gender, task id, failed/completed status, timestamps, and error state. The observed Flowers metadata does not store lyrics.

## Extra DB Storage

No extra DB storage is required for a first lyrics display pass.

Recommended read order:

1. Latest complete `music_generation_jobs` row for the word, ordered by `completed_at desc nulls last, created_at desc`.
2. `music_generation_jobs.concept_artifact.suno_lyrics`.
3. `music_generation_jobs.concept_artifact.lyrics`.
4. Fallback to `words.metadata.song_generation.suno_lyrics`.
5. Fallback to `words.metadata.song_generation.lyrics`.

A small helper now exists at `frontend/src/lib/musicLyrics.ts` to define this read preference without adding UI yet.

## Classic Music Proposal

Add a compact Lyrics icon/button only on rows that have music:

- Show the button when `trackHasAudio(track)` is true.
- Place it near the existing duration/genre controls, not in the no-audio generation area.
- Clicking opens a modal or side sheet.
- Audio playback should continue while the lyrics view is open.
- The lyrics view should show word, translation, genre, lyric mode, and lyrics text.

The Classic page can query lyrics lazily when the user clicks the button. That avoids loading concept artifacts for every row on initial page load.

## Glassy Music Proposal

Do not add Lyrics text under every orb.

Add one Lyrics button near the central player controls for the currently selected track:

- Hide or disable it when there is no current track.
- Hide or disable it when the selected track has no audio.
- Open a side sheet or bottom drawer so the central orb/player remains visible.
- Keep the orb thumbnail row icon-only for no-audio generation actions.

This keeps the Glassy page visually quiet and avoids repeating labels under every bubble.

## Files To Change Later

Likely files:

- `frontend/src/pages/Music.tsx`
- `frontend/src/pages/MusicPG.tsx`
- `frontend/src/components/music/PlaylistRow.tsx`
- `frontend/src/components/music/PlayerBar.tsx` if the Classic button belongs in the player bar
- `frontend/src/components/music/LyricsSheet.tsx` or `LyricsModal.tsx` as a new component
- `frontend/src/lib/musicLyrics.ts`
- `frontend/src/hooks/useMusicPlayer.ts` only if selected-track state needs additional helper fields
- `frontend/src/lib/translations.ts` for button labels and empty/error text

## Implementation Recommendation

Do not implement the full lyrics UI in this fix. The finalization bug is backend-critical, and the Glassy cleanup is already a targeted UI change.

Implement lyrics display in a follow-up with:

- Lazy Supabase query by current/selected word id.
- A focused modal/sheet component.
- Loading, empty, and error states.
- Tests for `concept_artifact.suno_lyrics` preference and metadata fallback.
