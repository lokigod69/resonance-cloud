# Song-Only Generation Verification

Date: 2026-05-06

## Commands Run

Precheck:

```bash
git status --short
git grep -n "music_generation_jobs\|MusicOnlyWorker\|submit_music_only_job\|suno_storage_url\|suno_storage_url_b\|audio" -- frontend/supabase src frontend/src tests
```

Focused song-only tests:

```bash
.\.venv\Scripts\python.exe -m pytest tests/test_music_only_worker.py -q
```

Result:

```text
3 passed in 0.50s
```

Required orchestration regression tests:

```bash
.\.venv\Scripts\python.exe -m pytest tests/test_orchestration_state.py tests/test_orchestration_feeder.py tests/test_orchestration_music_state.py tests/test_orchestration_worker_retries.py -q
```

Result:

```text
74 passed, 1 warning in 51.02s
```

Frontend build:

```bash
cd frontend && npm run build
```

Result:

```text
tsc -b && vite build
✓ built
```

Frontend lint:

```bash
cd frontend && npm run lint
```

Result:

```text
Failed.
```

The lint failure is the existing repo-wide ESLint baseline. It reported many unrelated pre-existing errors in files such as `frontend/api/test.ts`, `src/components/AddWordModal.tsx`, `src/components/AutopilotPanel.tsx`, `src/components/BatchSettings.tsx`, `src/hooks/useStudySession.ts`, `src/pages/StudyAudio.tsx`, and admin pages. The build succeeded, so TypeScript integration for the new frontend code is valid.

## Coverage Added

`tests/test_music_only_worker.py` covers:

- song-only concept payload construction and `suno_lyrics` preference.
- audio download/upload helper returning storage URLs without updating `words`.
- worker happy path with mocked concept/KIE/upload that keeps `words.current_stage='complete'` and leaves `generation_jobs` untouched.

## Manual SQL Verification Still Needed

Apply these migrations in order on Supabase:

1. `frontend/supabase/migrations/20260506090000_song_only_audio_storage.sql`
2. `frontend/supabase/migrations/20260506091000_music_generation_jobs.sql`

After applying migrations, manually verify:

- `storage.buckets` has `audio`.
- `public.words` has `suno_storage_url` and `suno_storage_url_b`.
- `public.music_generation_jobs` exists and RLS is enabled.
- Authenticated users can call `submit_music_only_job`.
- Anonymous users cannot call the submit RPC.
- Service role can call claim/submit/complete/fail worker RPCs.

## Provider Safety

No paid KIE/Suno provider calls were made. Tests mock concept, KIE polling, and upload behavior where needed.

## Acceptance Criteria Status

- Existing image/card generation untouched by source changes.
- Existing video/music generation pipeline untouched by source changes.
- Existing word retry path untouched.
- Music no-audio rows show Generate Song instead of Retry.
- Generate Song modal submits `submit_music_only_job`.
- Duplicate submits use idempotency keys.
- Worker does not create `generation_jobs` rows.
- Worker does not change `words.current_stage`.
- Successful jobs write permanent storage URLs through `complete_music_only_job`.
- Failed jobs refund through `fail_music_only_job`.

