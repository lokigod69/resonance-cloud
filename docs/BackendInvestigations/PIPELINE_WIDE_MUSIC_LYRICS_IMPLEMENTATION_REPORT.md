# Pipeline-Wide Music Lyrics Implementation Report

Date: 2026-05-06

## Summary

Phase 1 is implemented as a backend/data-only change. New generated songs now get a best-effort canonical row in `public.music_lyrics` from both song-only generation and the full Video & Music pipeline. Translation is generated for display/read-along only and is stored in `music_lyrics`; it is never added to the concept payload sent to KIE/Suno.

## Files Changed

- `frontend/supabase/migrations/20260506170000_music_lyrics.sql`
- `src/services/music_lyrics_store.py`
- `src/services/lyrics_translation.py`
- `src/orchestration/music_only_worker.py`
- `src/orchestration/upstream_worker.py`
- `src/orchestration/downstream_worker.py`
- `tests/test_suno_payload_excludes_translation.py`
- `tests/test_lyrics_translation.py`
- `tests/test_music_lyrics_store.py`
- `tests/test_music_only_translation.py`
- `tests/test_video_pipeline_lyrics_persistence.py`

## Migration

Migration file: `frontend/supabase/migrations/20260506170000_music_lyrics.sql`

It creates `public.music_lyrics` with:

- canonical original/provider lyrics fields
- best-effort translation fields
- reserved `synced_lyrics jsonb`
- latest-row indexes
- partial unique indexes for clean source-row updates
- RLS allowing authenticated users to read only their own rows
- service-role-only mutation access
- `updated_at` trigger via `public.set_updated_at()`

SQL must be applied to the target Supabase database before worker deployment. Run the migration file with the project’s normal Supabase migration process, or apply:

```bash
psql "$DATABASE_URL" -f frontend/supabase/migrations/20260506170000_music_lyrics.sql
```

## Song-Only Write Path

`MusicOnlyWorker._process_job` now calls `MusicOnlyWorker._persist_generated_lyrics()` immediately after `build_song_only_concept()` and `_persist_concept()`, before `submit_song_only_task()`.

The write uses:

- `source_type = 'song_only'`
- `source_job_id = music_generation_jobs.id`
- `word_id`, `deck_id`, `user_id` from the song-only job
- lyric mode and genre from `music_generation_jobs`
- `lyrics = concept_artifact.suno_lyrics or concept_artifact.lyrics`
- `suno_lyrics = concept_artifact.suno_lyrics`

Translation or write errors are logged/swallowed and do not block Suno submission.

## Video Pipeline Write Path

Two Video & Music submit paths now call `persist_video_pipeline_lyrics_best_effort()` after `read_concept_data(word_dir)` and before `submit_song(...)`:

- `UpstreamWorker._post_song_suno_submit`
- `DownstreamWorker._inline_submit`

The write uses:

- `source_type = 'video_pipeline'`
- `generation_job_id = words.generation_job_id` when available
- `word_id`, `deck_id`, `user_id` from the word row
- `lyrics = concept_data["lyrics"]`
- `suno_lyrics = concept_data["lyrics"]`

The helper fetches `generation_jobs.settings_override`, `decks.target_language`, and `profiles.base_language` best-effort for translation context. If those reads fail, the helper falls back and returns `False` without affecting the pipeline.

## Translation

`src/services/lyrics_translation.py` calls OpenRouter only when all of these are true:

- source lyrics are non-empty
- source and target languages differ
- `OPENROUTER_API_KEY` exists

The prompt explicitly says translation is for display/read-along only, preserves line order, blank lines, and section tags, and returns JSON only:

```json
{ "translation": "..." }
```

HTTP errors, malformed output, empty output, missing API key, and same-language targets return structured `failed` or `skipped` statuses. Worker code stores those statuses best-effort and continues generation.

## Suno Privacy Invariant

`src/suno.py` was not changed.

The mandatory privacy test proves `build_suno_payload()` ignores extra translation keys and keeps `payload["prompt"]` byte-equal to the original lyrics. Translation is never added to `concept_data` before KIE/Suno submission.

## Remaining Risks

- If OpenRouter is slow and an API key is configured, the submit step can spend up to the 60s translation timeout before proceeding.
- Video pipeline rows generated before this migration are not backfilled.
- `provider_task_id` is nullable and is not guaranteed at the pre-submit write point.
- Frontend display is unchanged in this phase, so users will not see the canonical table until the read path is updated.

## Rollback Plan

1. Revert the worker/service code commit to stop writing lyrics rows.
2. Leave `public.music_lyrics` in place if already deployed; it is additive and unused by old code.
3. If schema rollback is required before any dependent frontend ships, drop the table:

```sql
drop table if exists public.music_lyrics;
```
