# Song-Only Generation Implementation Report

Date: 2026-05-06

## Summary

Implemented an isolated song-only generation path for completed image/card words:

```text
Music page -> submit_music_only_job RPC -> music_generation_jobs
  -> MusicOnlyWorker -> concept-only artifact -> KIE/Suno submit/poll
  -> audio bucket upload -> words.suno_* update
```

The existing full video/card pipeline remains untouched except for `job_runner.py` starting the new worker only when `MUSIC_ONLY_ENABLED=true`.

## Files Changed

Backend:

- `src/services/song_only_concept.py`
- `src/services/song_only_suno.py`
- `src/orchestration/music_only_worker.py`
- `job_runner.py`
- `tests/test_music_only_worker.py`

Database:

- `frontend/supabase/migrations/20260506090000_song_only_audio_storage.sql`
- `frontend/supabase/migrations/20260506091000_music_generation_jobs.sql`

Frontend:

- `frontend/src/lib/songGeneration.ts`
- `frontend/src/components/song-generation/GenerateSongModal.tsx`
- `frontend/src/components/song-generation/SongGenrePicker.tsx`
- `frontend/src/components/song-generation/LyricDepthPicker.tsx`
- `frontend/src/hooks/useMusicPlayer.ts`
- `frontend/src/pages/Music.tsx`
- `frontend/src/pages/MusicPG.tsx`
- `frontend/src/components/music/PlaylistRow.tsx`
- `frontend/src/components/music/OrbThumbnailRow.tsx`
- `frontend/src/lib/translations.ts`

Docs:

- `docs/BackendInvestigations/SONG_ONLY_GENERATION_IMPLEMENTATION_PRECHECK.md`
- `docs/BackendInvestigations/SONG_ONLY_GENERATION_IMPLEMENTATION_REPORT.md`
- `docs/BackendInvestigations/SONG_ONLY_GENERATION_VERIFICATION.md`

## Migrations Added

Run these in order if not using Supabase CLI:

1. `frontend/supabase/migrations/20260506090000_song_only_audio_storage.sql`
2. `frontend/supabase/migrations/20260506091000_music_generation_jobs.sql`

The first migration creates the public `audio` bucket idempotently, adds `words.suno_storage_url` and `words.suno_storage_url_b` idempotently, allows public reads, and limits writes to service role.

The second migration creates `public.music_generation_jobs`, indexes active/idempotent jobs, enables RLS, grants user read access to own jobs, and defines the five RPCs:

- `submit_music_only_job`
- `claim_music_only_job`
- `mark_music_only_submitted`
- `complete_music_only_job`
- `fail_music_only_job`

## Credit Behavior

MVP behavior is debit/reservation:

- Submit: `submit_music_only_job` atomically debits 10 credits and stores `credits_reserved=10`, `credits_charged=0`.
- Success: `complete_music_only_job` sets `credits_charged=credits_reserved` without a second debit.
- Failure: `fail_music_only_job` refunds `credits_reserved` exactly once when `credits_charged=0` and `credits_refunded=0`.

Duplicate clicks are protected by `(user_id, submit_idempotency_key)` and the frontend stores a session idempotency key per word/genre/depth/vocal tuple. Concurrent jobs for the same word are blocked by the active partial unique index on `word_id`.

## Worker Behavior

`MusicOnlyWorker`:

- Polls `music_generation_jobs` active statuses.
- Claims pending jobs through `claim_music_only_job`.
- Calls `generate_concept` directly through `song_only_concept.py`.
- Submits KIE/Suno through song-only submit logic based on `build_suno_payload`.
- Polls existing KIE tasks through `fetch_existing_task`.
- Downloads provider audio through `download_suno_audio`.
- Uploads permanent audio into the `audio` bucket.
- Finalizes via `complete_music_only_job` or refunds via `fail_music_only_job`.

It does not touch:

- `generation_jobs`
- `words.current_stage`
- deck status
- feeder/downstream/finalizer
- image/video/assembly/bookend stages

Runtime flag:

- `MUSIC_ONLY_ENABLED=false` by default.
- Set `MUSIC_ONLY_ENABLED=true` to start the worker in `job_runner.py`.
- Optional: `MUSIC_ONLY_POLL_INTERVAL`, `MUSIC_ONLY_CONCURRENCY`.

## Frontend Behavior

No-audio completed rows now show `Generate Song`, not `Retry`.

The modal lets the user choose:

- Genre: auto, presets, or custom text.
- Lyric depth:
  - Reliable -> `reliable`
  - Phrase context -> `contextual`
  - Full song -> `dramatic`
- Vocal: female, male, any.

The Music page and MusicPG page:

- Query `music_state` and `retry_requested` in addition to audio fields.
- Poll active `music_generation_jobs`.
- Add filters for all / with music / without music.
- Keep existing playability based on `suno_storage_url ?? suno_audio_url`.

## Files Intentionally Not Touched

- `request_word_retry` RPC behavior
- `submit_generation` RPC behavior
- `generation_jobs` schema
- `src/orchestration/feeder.py`
- `src/orchestration/downstream_worker.py`
- `src/orchestration/upstream_worker.py`
- `src/orchestration/video_dispatcher.py`
- `src/orchestration/finalizer.py`
- `src/orchestration/retry.py`
- `src/orchestration/recovery.py`
- `src/orchestration/state.py`
- `src/pipeline.py`
- image, video, assembly, and bookend engines
- DeckView retry behavior

## Remaining Risks

- SQL RPCs were written as migrations and reviewed statically; no live Supabase migration run occurred in this environment.
- `npm run lint` is blocked by a broad pre-existing lint baseline in unrelated files. `npm run build` passes.
- Worker timeout/retry policy is intentionally simple for MVP: provider poll errors currently terminal-fail and refund.
- `MUSIC_ONLY_ENABLED` defaults false, so Railway must enable it after migrations are applied.

## Rollback Plan

1. Set `MUSIC_ONLY_ENABLED=false` and redeploy the worker.
2. Hide or revert the Music page Generate Song UI.
3. Leave completed `words.suno_*` values intact; playable songs remain usable.
4. If needed, pause/reconcile active `music_generation_jobs` rows manually and refund reservations where `credits_charged=0` and `credits_refunded=0`.

