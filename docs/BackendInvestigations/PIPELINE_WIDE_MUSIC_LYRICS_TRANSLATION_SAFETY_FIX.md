# Pipeline-Wide Music Lyrics Translation Safety Fix

Date: 2026-05-06

## Summary

This change makes lyrics translation safe-by-default while preserving canonical original lyric storage.

Original lyrics are still written to `public.music_lyrics` for song-only and Video & Music pipeline generations. OpenRouter translation is now disabled unless explicitly enabled with an environment flag, uses a valid default model ID, and has a shorter configurable timeout.

## Environment Variables

- `ENABLE_LYRICS_TRANSLATION`
  - Default: `false`
  - When false or unset, OpenRouter is not called.
  - Stored translation state: `translation_status = 'skipped'`, `translation_error = 'translation_disabled'`.

- `OPENROUTER_LYRICS_TRANSLATION_MODEL`
  - Default: `anthropic/claude-haiku-4.5`
  - Used only when `ENABLE_LYRICS_TRANSLATION=true`.

- `LYRICS_TRANSLATION_TIMEOUT_SECONDS`
  - Default: `12`
  - Used only when `ENABLE_LYRICS_TRANSLATION=true`.
  - Invalid values fall back to 12 seconds.

- `OPENROUTER_API_KEY`
  - Required only when `ENABLE_LYRICS_TRANSLATION=true`.
  - If missing while translation is enabled, translation skips with `translation_error = 'no_api_key'`.

## Default Behavior

Default deployment behavior is:

1. Generate concept lyrics normally.
2. Write the original lyrics row to `public.music_lyrics`.
3. Mark translation as skipped with `translation_disabled`.
4. Submit to KIE/Suno without calling OpenRouter.

This keeps the music generation path independent of OpenRouter availability.

## Base-Language Source

The profile UI and backend use the same canonical column:

- Profile modal writes `public.profiles.base_language`.
- Settings page writes `public.profiles.base_language`.
- `useAuth` reads `public.profiles.base_language`.
- `MusicOnlyWorker._fetch_profile()` reads `public.profiles.base_language`.
- The video-pipeline helper reads `public.profiles.base_language`.

No alternate profile field was found.

For MVP, the worker uses the current profile language at worker time. It does not snapshot base language into `music_generation_jobs` at submit time. This is acceptable for now because song-only generation normally proceeds quickly, and using the current profile value matches the user-visible setting. If exact submit-time reproducibility becomes important, `submit_music_only_job` should snapshot `base_language` into `music_generation_jobs.metadata.request`.

## Observed `target_equals_base`

The observed row:

```text
language = English
translation_language_code = en
translation_status = skipped
translation_error = target_equals_base
```

means the worker resolved both the source lyrics language and the target/base language as English at processing time. Based on code inspection, that was not caused by the UI writing a different profile column. The likely causes are:

- the profile row still had `base_language = 'English'` when the worker processed the job,
- the worker processed the job before the profile update was visible,
- or Railway was still running an older worker build.

This fix adds debug-safe logging for source language, base language, word id, job id, translation status, and skip reason. It does not log full lyrics.

## Safety Fixes

- Translation disabled by default through `ENABLE_LYRICS_TRANSLATION=false`.
- Default model changed from likely-invalid `anthropic/claude-haiku-4-5-20251001` to `anthropic/claude-haiku-4.5`.
- Model can be overridden by `OPENROUTER_LYRICS_TRANSLATION_MODEL`.
- Timeout defaults to 12 seconds through `LYRICS_TRANSLATION_TIMEOUT_SECONDS`.
- Song-only lyrics persistence call is wrapped in a local try/except before KIE submit.
- Downstream inline submit has a regression test proving lyrics persistence failure is swallowed.

## Deployment Instructions

No SQL migration is required for this fix. The existing `public.music_lyrics` migration has already been applied.

Recommended Railway deployment sequence:

1. Deploy this commit with `ENABLE_LYRICS_TRANSLATION` unset or explicitly `false`.
2. Run one song-only generation and one normal Video & Music generation.
3. Confirm `public.music_lyrics` rows are written with `translation_status = 'skipped'` and `translation_error = 'translation_disabled'`.
4. Confirm KIE/Suno jobs still submit promptly.
5. If translation is desired, set:

```text
ENABLE_LYRICS_TRANSLATION=true
OPENROUTER_API_KEY=<key>
OPENROUTER_LYRICS_TRANSLATION_MODEL=anthropic/claude-haiku-4.5
LYRICS_TRANSLATION_TIMEOUT_SECONDS=12
```

Then run one non-English base-language smoke test and inspect the row.

## Tests Run

System Python still does not have `pytest`, so the requested `python -m pytest ...` commands fail before collection. The equivalent repo venv commands were used for real verification.

```bash
.\.venv\Scripts\python.exe -m pytest tests/test_suno_payload_excludes_translation.py tests/test_lyrics_translation.py tests/test_music_lyrics_store.py tests/test_music_only_translation.py tests/test_video_pipeline_lyrics_persistence.py -q
```

Result: `22 passed in 0.61s`

```bash
.\.venv\Scripts\python.exe -m pytest tests/test_music_only_worker.py tests/test_orchestration_music_state.py tests/test_orchestration_worker_retries.py -q
```

Result: `41 passed in 50.66s`

```bash
cd frontend && npm run build
```

Result: exit 0, with existing Vite chunk/dynamic-import warnings.

```bash
git diff --check
```

Result: exit 0.
