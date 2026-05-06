# Song-Only Live Finalization Bug Report

Date: 2026-05-06

## Scope

This investigation covers only the isolated song-only generation path:

- `src/orchestration/music_only_worker.py`
- `src/services/song_only_suno.py`
- `src/services/song_only_concept.py`
- `frontend/supabase/migrations/20260506091000_music_generation_jobs.sql`
- `frontend/supabase/migrations/20260506100000_music_generation_jobs_allow_creative.sql`
- `frontend/src/pages/Music.tsx`
- `frontend/src/pages/MusicPG.tsx`
- `frontend/src/hooks/useMusicPlayer.ts`
- `frontend/src/lib/songGeneration.ts`

The full generation pipeline, retry pipeline, feeder/downstream/finalizer, card generation, and submit_generation path were not changed.

## Live Flowers Rows

Latest observed `public.music_generation_jobs` row for Flowers:

| Field | Value |
| --- | --- |
| id | `7f66db15-8507-48f5-b192-a0afa90d8886` |
| status | `failed` |
| word_id | `6385db8c-a9cf-45a5-a1c3-37e93cb04f68` |
| lyric_mode | `dramatic` |
| genre | `electronic` |
| vocal_gender | `female` |
| credits_reserved | `10` |
| credits_charged | `0` |
| credits_refunded | `10` |
| suno_task_id | `178674fbbd84e2e381f917da029b16e6` |
| suno_audio_url | `NULL` |
| suno_audio_url_b | `NULL` |
| suno_storage_url | `NULL` |
| suno_storage_url_b | `NULL` |
| failed_step | `submit` |
| error_message | `submit: AttributeError: 'NoneType' object has no attribute 'get'` |
| created_at | `2026-05-06T03:40:57.405698+00:00` |
| completed_at | `2026-05-06T03:41:09.717+00:00` |

Latest observed `public.words` row for Flowers:

| Field | Value |
| --- | --- |
| id | `6385db8c-a9cf-45a5-a1c3-37e93cb04f68` |
| word | `flowers` |
| status | `complete` |
| current_stage | `complete` |
| music_state | `submit_failed` |
| suno_task_id | `178674fbbd84e2e381f917da029b16e6` |
| suno_audio_url | `NULL` |
| suno_audio_url_b | `NULL` |
| suno_storage_url | `NULL` |
| suno_storage_url_b | `NULL` |
| metadata.song_generation.status | `failed` |
| metadata.song_generation.failed_step | `submit` |
| metadata.song_generation.error_message | `submit: AttributeError: 'NoneType' object has no attribute 'get'` |

## Provider Status

The KIE task id exists.

Direct KIE `/api/v1/generate/record-info` lookup for task `178674fbbd84e2e381f917da029b16e6` returned:

- HTTP `200`
- KIE code `200`
- status `SUCCESS`
- `errorCode`: `NULL`
- `errorMessage`: `NULL`
- two `sunoData` tracks with `audioUrl` values
- durations: `59.76` and `54.96`

Therefore KIE completed successfully, but the local DB job had already been terminally marked failed before the worker could upload and finalize audio.

## Finalization State

- `music_generation_jobs.suno_audio_url`: null
- `music_generation_jobs.suno_storage_url`: null
- `words.suno_audio_url`: null
- `words.suno_storage_url`: null
- Job state: failed, not stuck active
- Credit state: refunded, not charged
- `complete_music_only_job`: did not run successfully for this job, because none of its terminal success effects are present
- `fail_music_only_job`: did run, because the row is failed, the word is `submit_failed`, and credits were refunded

## Root Cause

The worker submits the KIE task and immediately performs a single `fetch_existing_task` poll in the same `_process_job` call.

`src/suno.py::fetch_existing_task` assumed `response_json["data"]` was always a dictionary:

```python
data = response_json.get("data", {})
task_status = data.get("status")
```

Live KIE returned a successful HTTP/API response with `data = null` while the task record was not ready yet. That raised:

```text
AttributeError: 'NoneType' object has no attribute 'get'
```

The worker caught the exception and failed the music job immediately. A second bug made the failure look like a submit failure: `_process_job` inferred the failed step from the original candidate row, not the current post-submit job state. That is why the DB says `failed_step='submit'` even though the failure happened during the first poll.

KIE later reached `SUCCESS`, but `music_generation_jobs.status='failed'` is terminal and is not included in the worker candidate statuses, so the job never re-entered upload/finalization.

## Code Inspection Answers

1. Does MusicOnlyWorker call `complete_music_only_job` after storage upload? Yes.
2. Does `complete_music_only_job` update `public.words.suno_storage_url` and `public.words.suno_audio_url`? Yes, the migration function writes both job URLs to `public.words`.
3. Does `complete_music_only_job` correctly locate `word_id` from `music_generation_jobs`? Yes, it selects the job by `p_job_id` and updates `words` by `v_job.word_id`.
4. Does `complete_music_only_job` fail silently if execute permission is missing? The worker now requires an explicit `{"success": true}` RPC response for submit, complete, and fail RPCs.
5. Does `song_only_suno` upload to the audio bucket and return public URLs correctly? Yes, it uploads A/B MP3s to `audio/{user}/{deck}/music_only/{word}/{job}/` and returns public URLs.
6. Are URLs stored only on `music_generation_jobs` but not on `words`? No. The SQL RPC writes both tables on success. Flowers has neither because completion never ran.
7. Is the worker treating provider success as terminal before storage upload? No. It only calls `_complete` after `download_and_upload_song_audio`.
8. Is polling stuck because `fetch_existing_task` returns a status spelling the code does not handle? It was worse than stuck: null `data` crashed the poll. The fix also handles KIE uppercase intermediate statuses: `PENDING`, `TEXT_SUCCESS`, and `FIRST_SUCCESS`.
9. Is `Music.tsx` querying `suno_storage_url` / `suno_audio_url` from `words`? Yes.
10. Is `Music.tsx` cache busted when the job completes? Yes, and the code now uses the shared `trackHasAudio` helper.
11. Does hard refresh still use module-level cache? A true hard refresh creates a new JS runtime, but mount now explicitly calls `fetchTracks(true)` in both Music pages.
12. Is Vercel deployed at the new commit? At investigation time, Vercel production was Ready at `https://resonanz.pro`, latest deployment created `2026-05-06 12:01:46 +08:00`. This was before the fix commit in this report.

## Railway Logs

Railway CLI is not installed in this workspace (`railway` command not found), so live Railway log excerpts around Flowers were not available locally.

Expected log sequence from the live DB error:

```text
music_only: submitted task job=7f66db15-8507-48f5-b192-a0afa90d8886 task=178674fbbd84e2e381f917da029b16e6
music_only: failed job=7f66db15-8507-48f5-b192-a0afa90d8886 step=submit: AttributeError: 'NoneType' object has no attribute 'get'
```

## Fix Summary

- `fetch_existing_task` now treats null/empty KIE `data` as pending instead of raising.
- `fetch_existing_task` now normalizes KIE statuses and keeps documented intermediate statuses pending.
- `fetch_existing_task` now recognizes documented uppercase KIE failure statuses.
- `MusicOnlyWorker` now infers failure step from the current in-flight job state.
- `MusicOnlyWorker` now checks submit/complete/fail RPC responses for explicit success.
- Classic and Glassy Music pages now refetch from Supabase on mount and share one `trackHasAudio` helper.
- Glassy no-audio orbs now show icon-only generate actions.

## Current Flowers Repair Note

This code fix prevents new jobs from failing the same way. The existing Flowers row is already terminal `failed` and credits were refunded. It will not be picked up automatically by the worker without an explicit repair decision, because changing failed terminal jobs into completed charged jobs has credit implications.
