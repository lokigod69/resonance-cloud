# Song-Only Generation Implementation Precheck

Date: 2026-05-06

## Branch And Status

- Canonical repo: `D:\CODING\ResonanceTEST\orchestrator`
- Branch: `main`
- Initial `git status --short`:

```text
?? docs/BackendInvestigations/
?? docs/FrontendInvestigations/CLASSIC_HEADER_GLASS_TARGET_INVESTIGATION.md
?? docs/FrontendInvestigations/SONG_ONLY_GENERATION_FRONTEND_DB_AUDIT.md
```

The frontend investigation files were pre-existing untracked files outside this implementation scope. The backend investigation directory already contained the prior audit doc.

## Required Search

Ran:

```bash
git grep -n "music_generation_jobs\|MusicOnlyWorker\|submit_music_only_job\|suno_storage_url\|suno_storage_url_b\|audio" -- frontend/supabase src frontend/src tests
```

Findings:

- No existing `music_generation_jobs` table or RPC.
- No existing `MusicOnlyWorker`.
- Existing audio storage upload logic appears in `src/services/suno_bakein.py`.
- `frontend/src/pages/Music.tsx` and `frontend/src/pages/MusicPG.tsx` already read `suno_storage_url` and `suno_audio_url`.
- `frontend/src/components/music/PlaylistRow.tsx` currently shows a no-audio `Retry` button.

## Audio Bucket Migration

Existing migrations create storage buckets for:

- `videos`: `frontend/supabase/migrations/20260322210000_phase2a_tables.sql`
- `voice-samples`: `frontend/supabase/migrations/20260418000000_voice_samples_table.sql`
- `pipeline-events`: `frontend/supabase/migrations/20260421000000_pipeline_events.sql`
- `profile-avatars`: `frontend/supabase/migrations/20260504000000_profile_avatar_upload.sql`

No migration was found that creates the `audio` bucket. The implementation needs a new idempotent audio bucket migration.

## Suno Storage URL Columns

Existing migrations explicitly add:

- `suno_audio_url`: `frontend/supabase/migrations/20260331000000_suno_columns.sql`
- `suno_audio_url_b`: `frontend/supabase/migrations/20260331000001_suno_audio_url_b.sql`

Existing retry RPC migrations reference and clear:

- `suno_storage_url`
- `suno_storage_url_b`

Those references appear in:

- `frontend/supabase/migrations/20260428130000_phase1b_atomic_generation_retry.sql`
- `frontend/supabase/migrations/20260502170000_phase1e_trusted_rpc_guard_fix.sql`

No standalone migration was found that adds `suno_storage_url` and `suno_storage_url_b`. The implementation should add both columns idempotently before using them.

## Concept Engine Call Surface

The isolated callable surface is:

- `cloud_engines.concept_engine.engine.generate_concept(payload: ConceptPayload) -> ConceptResult`
- `cloud_engines.concept_engine.models.ConceptPayload`
- `ConceptPayload.content: ConceptContent`
- `ConceptPayload.settings: ConceptSettings`
- `ConceptPayload.output_dir: str`
- `ConceptPayload.metadata: ConceptMetadata`

Required settings for song-only generation:

- `lyric_mode`: one of the MVP values `reliable`, `contextual`, `dramatic`
- `genre`: `auto` or a custom genre string
- `vocal_gender`: `female`, `male`, or `any`

The concept engine requires a filesystem `output_dir`; song-only generation should use a durable scratch directory under `CLOUD_WORKSPACE_ROOT/music_only/<music_job_id>/concept`.

## Reusable Suno Functions

Reusable safe functions in `src/suno.py`:

- `build_suno_payload(concept_data: dict) -> dict`
- `fetch_existing_task(task_id: str, ...) -> dict`
- `download_suno_audio(url: str, dest_path: Path) -> Path`

`submit_song(...)` is only partially reusable because it uses word-row idempotency and writes `words.suno_task_id`. For song-only generation, `music_generation_jobs.suno_task_id` must be the primary idempotency source. The implementation should either call `build_suno_payload` directly or adapt submit logic without routing through video pipeline assumptions.

The existing permanent audio upload helper is:

- `src/services/suno_bakein.py::_upload_suno_to_storage(...)`

It should be copied or extracted without calling `bake_suno_into_word`, because bake-in performs video duration probing, trimming, assembly, and bookend work.

## Music Page No-Audio Behavior

Current behavior:

- `Music.tsx` loads completed words and maps each row to `MusicTrack`.
- `PlaylistRow.tsx` treats no audio as non-playable and renders a `Retry` button with title `Retry Suno generation`.
- `Music.tsx` calls `request_word_retry` with `p_retry_scope: 'music'`.
- `MusicPG.tsx` loads the same audio URL fields but lacks the same retry polling flow.
- `OrbThumbnailRow.tsx` marks no-audio rows as non-playable but has no song generation affordance.

Required behavior:

- No-audio completed cards should show `Generate Song`.
- The Music page must call `submit_music_only_job`, not `request_word_retry`.
- Existing playable tracks must continue to use `suno_storage_url ?? suno_audio_url`.

## Chosen Architecture

Use an isolated song-only path:

```text
Music page
  -> Generate Song modal
  -> submit_music_only_job RPC
  -> music_generation_jobs row
  -> MusicOnlyWorker
  -> isolated concept generation
  -> KIE/Suno submit and poll
  -> audio bucket upload
  -> words.suno_* update
  -> music_generation_jobs complete/failed
```

Do not use:

- `request_word_retry`
- `generation_jobs`
- `post_video_queued`
- `bake_suno_into_word`
- assembly, bookend, image, or video stages

## Migration Names To Add

Use timestamps later than the current latest migration `20260505000000_canvas_study_mode.sql`:

- `frontend/supabase/migrations/20260506090000_song_only_audio_storage.sql`
- `frontend/supabase/migrations/20260506091000_music_generation_jobs.sql`

