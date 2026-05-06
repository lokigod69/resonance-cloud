# Music Lyrics + Caption Display Fix Report

## Metadata Findings

The resolved `music_caption` is produced by the song-only concept step and stored in the concept artifact returned from `build_song_only_concept`. The worker persists it in two places:

- `music_generation_jobs.concept_artifact.music_caption`
- `music_generation_jobs.music_caption`

On completion, `complete_music_only_job` also writes the same caption into `words.metadata.song_generation.music_caption`.

## Completion Persistence

`music_generation_jobs.music_caption` is populated before and on completion:

- `MusicOnlyWorker._persist_concept()` updates `music_generation_jobs.music_caption` from `concept_artifact.music_caption`.
- `MusicOnlyWorker._complete()` passes that caption into `complete_music_only_job`.
- The SQL RPC stores it in `music_generation_jobs.music_caption`.

`concept_artifact.music_caption` is also populated by `song_only_concept.py` from the generated concept artifact and persisted by the worker.

## Why The Frontend Showed `auto`

The Classic and Glassy `mapToTrack()` functions only looked for a top-level `words.metadata.music_caption`, then fell back to `words.metadata.song_generation.genre`.

For song-only generation, the submit RPC stores the request mode as `words.metadata.song_generation.genre = "auto"` when the user lets the system pick the style. Completion adds `words.metadata.song_generation.music_caption`, but the frontend did not read that field. The UI therefore displayed the stale request mode instead of the generated caption.

`LyricsSheet` had the same display problem in its header metadata: it used `music_generation_jobs.genre` or `track.genre`, both of which could represent the request value rather than the resolved generated caption.

## Display Field Choice

The display genre/caption should come from the shared resolver in `frontend/src/lib/musicDisplayMetadata.ts`:

1. latest complete `music_generation_jobs.music_caption`
2. latest complete `music_generation_jobs.concept_artifact.music_caption`
3. `track.song_generation.music_caption`
4. `track.metadata.music_caption`
5. `track.genre` only when it is not `auto`
6. `null`

Compact badges use the first comma-separated segment of that resolved caption and hide `auto`.

## Classic And Glassy Resolver Use

Classic and Glassy now use the same display resolver:

- Classic row badge resolves through `compactMusicCaptionSegment(resolveTrackMusicCaption(track))`.
- Glassy title metadata resolves through `compactMusicCaptionSegment(resolveTrackMusicCaption(currentTrack))`.
- Both pages fetch the latest complete `music_generation_jobs` rows and attach the newest row to each track before rendering.
- `LyricsSheet` uses the same resolver for its genre/caption header.

## SQL Changes

No SQL changes were needed. Existing migrations already define `music_generation_jobs.music_caption`, `concept_artifact`, and the completion RPC persistence path.
