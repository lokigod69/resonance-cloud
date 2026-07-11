# Smart Retry v2 Investigation — Intermediate Artifact Durability

## TL;DR

Smart retry does not reliably survive container death today. Current code still relies on local `manifest.json` and local stage artifacts for resuming, while only final videos and post-bake Suno MP3s are uploaded to Supabase Storage. The current Dockerfile intends cloud workspaces to live at `/data/resonance/workspaces`, but the live "wedding" `pipeline_events` show this run wrote artifacts under `/tmp/resonance/workspaces`, which is ephemeral on Railway unless a volume is explicitly mounted there. The current deck retry button is stale: it sets `words.status='pending'` and inserts a `generation_jobs` row, but it does not set `retry_requested=true` or reset `current_stage`, so it does not exercise the new retry router. Minimum viable fix for the specific redeploy-killed-after-video scenario is a Railway volume mounted at the actual workspace path; product-grade durable retry requires uploading intermediate artifacts, especially scene MP4s, to durable storage after each stage.

## Part 1 — Intermediate Artifact Storage Map

| Stage | Output artifact | Stored where? | Survives container death? | Retrievable for retry? |
|---|---|---|---|---|
| concept | concept JSON + generation-meta | Local only: `<workspace>/cloud_{user_id}_{deck_id}/{word_slug}/concept/<label>_<timestamp>.json`; raw LLM call bodies also go to `pipeline_events` | File survives only if workspace is on a persistent volume. DB event rows survive. | Automated retry needs the local file and manifest. Manual reconstruction from events may be possible but is not implemented. |
| images | `storyboard.json`, scene PNGs, generation-meta | Local only: `<workspace>/.../{word_slug}/images/<version>/storyboard.json` and `*.png`; provider responses/request IDs are in `pipeline_events` | Files survive only if workspace is on a persistent volume. Provider URLs may expire. | Automated retry needs local PNGs/storyboard. Re-fetch from provider event data is not reliable or implemented. |
| song | silent FLAC placeholder; later Suno task/audio | Song stage writes local placeholder `<workspace>/.../{word_slug}/songs/<version>/take_001.flac`. Post-song Suno submit writes `words.suno_task_id`. Suno bake later writes local MP3s and uploads raw MP3s to Supabase `audio` bucket. | Placeholder survives only with volume. `suno_task_id`, `suno_audio_url*`, `suno_storage_url*` survive if populated. | Placeholder can be regenerated. Suno can be re-polled using `suno_task_id` if Kie still has the task. |
| video | `scene_*.mp4`, `scene_*_thumb.jpg`, generation-meta | Local only: `<workspace>/.../{word_slug}/videos/<version>/scene_###.mp4`; Fal/Kling store `video_url` in `pipeline_events`; self-hosted/RunPod do not store a durable public video URL | Files survive only with volume. Fal/Kling event URLs may survive temporarily; self-hosted/RunPod scene files are gone if disk is gone. | Automated assembly retry needs local scene MP4s. Not reliably recoverable after ephemeral disk loss. |
| assembly | `final.mp4` | Local only: `<workspace>/.../{word_slug}/final/<version>/final.mp4` until publishing | Survives only with volume until uploaded. | Retry/upload needs local `final.mp4`; otherwise rerun assembly from local song+video artifacts. |
| bookend | `final.mp4` with TTS plus TTS/temp files | Local only: `<workspace>/.../{word_slug}/bookend/<version>/final.mp4` plus `tts_pronunciation.mp3` in the bookend output dir | Survives only with volume until uploaded. | Retry/upload needs local bookend or assembly output. |

Detailed findings:

- Workspace path shape is `get_workspace_root()/cloud_{user_id}_{deck_id}` (`orchestrator/src/storage.py:25-37`, `orchestrator/src/storage.py:54-63`).
- Stage folder mapping is `concept`, `songs`, `images`, `videos`, `final`, `bookend` (`orchestrator/src/pipeline.py:188-195`).
- `run_stage()` reads the local manifest and writes into local stage folders (`orchestrator/src/pipeline.py:850-866`).
- Concept writes a JSON artifact directly in `concept/` and updates `selected.concept` on success (`orchestrator/src/pipeline.py:869-904`; engine write at `orchestrator/cloud_engines/concept_engine/engine.py:221-260`).
- Images write `storyboard.json` and rendered PNGs into the image version folder (`orchestrator/src/pipeline.py:935-987`; engine write at `orchestrator/cloud_engines/image_engine/engine.py:103-145`, meta at `orchestrator/cloud_engines/image_engine/engine.py:188-208`).
- The Suno-mode song stage does not generate real music; it creates a valid silent FLAC placeholder (`orchestrator/src/cloud_dispatcher.py:111-151`, called at `orchestrator/src/cloud_dispatcher.py:183-187`).
- Video writes `scene_###.mp4` and thumbnails into the video version folder (`orchestrator/src/pipeline.py:989-1041`; engine file names at `orchestrator/cloud_engines/video_engine/engine.py:85-115`).
- Assembly writes `final.mp4` locally (`orchestrator/src/pipeline.py:1043-1066`; engine output at `orchestrator/cloud_engines/assembly_engine/engine.py:225-245`).
- Bookend writes `final.mp4` locally and records only metadata in events (`orchestrator/src/pipeline.py:1068-1084`; engine output at `orchestrator/cloud_engines/bookend_engine/engine.py:248-293`, event at `orchestrator/cloud_engines/bookend_engine/engine.py:318-360`).
- Publishing uploads only final videos and thumbnails to Supabase Storage bucket `videos` under `{user_id}/{deck_id}/{word_slug}/video.mp4`, `thumb.jpg`, and B variants (`orchestrator/src/services/publishing.py:48-88`, `orchestrator/src/services/publishing.py:91-153`). There is no comparable upload for concept JSON, images, placeholder song, scene videos, assembly output, or bookend output before the next stage.

Critical Suno timing:

- `words.suno_task_id` is persisted immediately after Suno submit (`orchestrator/src/suno.py:298-305`).
- `words.suno_audio_url` and `words.suno_audio_url_b` are written only after polling reaches `SUCCESS` in `generate_song()` (`orchestrator/src/suno.py:462-487`, writer at `orchestrator/src/suno.py:40-58`).
- `words.suno_storage_url` and `words.suno_storage_url_b` are written only after `suno_bakein` downloads the Suno MP3s and uploads them to Supabase Storage bucket `audio` (`orchestrator/src/services/suno_bakein.py:67-102`, `orchestrator/src/services/suno_bakein.py:226-244`).
- If the container dies after song placeholder + Suno submit but before Suno polling/bake, only `suno_task_id` is expected to be durable. Retry can re-poll with `fetch_existing_task()` if the external Kie task still exists (`orchestrator/src/services/suno_bakein.py:153-199`, `orchestrator/src/suno.py:604-686`).

Critical video timing:

- Fal LTX and Kling events include a provider `video_url` after completion (`orchestrator/cloud_engines/video_engine/adapters/ltx.py:231-253`, `orchestrator/cloud_engines/video_engine/adapters/ltx.py:261-275`; `orchestrator/cloud_engines/video_engine/adapters/kling.py:164-185`, `orchestrator/cloud_engines/video_engine/adapters/kling.py:193-208`).
- Self-hosted LTX downloads from the worker endpoint directly to the local output path and records only job/request IDs and file metadata, not a durable public URL (`orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:250-253`, `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:363-379`, `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py:411-426`).
- RunPod decodes `video_base64` to a local MP4 and records provider IDs/file metadata, not a durable URL (`orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py:225-227`, `orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py:347-355`, `orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py:363-379`).
- Ken Burns is local ffmpeg output only (`orchestrator/cloud_engines/video_engine/adapters/ken_burns.py:104-124`, `orchestrator/cloud_engines/video_engine/adapters/ken_burns.py:168-178`, `orchestrator/cloud_engines/video_engine/adapters/ken_burns.py:211-225`).

## Part 2 — Railway Workspace Persistence

Definitive code/config answer:

- `Dockerfile.cloud` sets `STORAGE_MODE=cloud` and `CLOUD_WORKSPACE_ROOT=/data/resonance/workspaces` (`orchestrator/Dockerfile.cloud:46-55`).
- The Dockerfile comment explicitly says the workspace root "MUST be backed by persistent storage (Railway volume)" and that `/data/` is the conventional volume mount point (`orchestrator/Dockerfile.cloud:52-55`).
- `get_workspace_root()` uses `CLOUD_WORKSPACE_ROOT` in cloud mode, but falls back to `/tmp/resonance/workspaces` if that env var is absent (`orchestrator/src/storage.py:32-35`).
- `railway.toml` only points Railway at `Dockerfile.cloud` and configures health/restart policy; it does not declare or mount a volume (`orchestrator/railway.toml:1-9`).

Definitive live evidence for the "wedding" run:

- The live `pipeline_events` rows for "wedding" recorded source image paths under `/tmp/resonance/workspaces/cloud_c50a22c5-a63b-4fb0-9d36-1bfe3e67fd1a_c5f8cbf0-6fce-4a7f-bb92-b4cba7502b62/wedding/...`.
- That means the actual worker that produced "wedding" was not writing to the Dockerfile's intended `/data/resonance/workspaces` path. It was writing to the `storage.py` fallback path, `/tmp/resonance/workspaces`.
- Railway's official deployment docs say every service deployment has ephemeral storage and that persistent data between deployments requires adding a volume: <https://docs.railway.com/deployments/reference>. Railway's volume docs say a volume mount path must be configured and is available as a service directory at runtime: <https://docs.railway.com/volumes>.

Conclusion:

- For the live "wedding" incident, the workspace path was ephemeral (`/tmp`). The local manifest and intermediate artifacts should be assumed gone after a Railway redeploy.
- For future deployments, the repo intends `/data/resonance/workspaces`, but the repo alone does not prove a Railway dashboard volume is attached there. A Railway volume must be mounted at `/data` or `CLOUD_WORKSPACE_ROOT` must be set to `RAILWAY_VOLUME_MOUNT_PATH`/a subdirectory of it.
- If the workspace is ephemeral, the manifest-based smart retry system is broken for cloud container-death scenarios. It can only work inside the lifetime of the same container.

## Part 3 — pipeline_events as Stage Completion Oracle

Schema:

- `pipeline_events` stores `stage`, `sub_step`, `status`, prompts, full `response_body` or a `response_ref`, provider `request_id`, and JSON `metadata` (`orchestrator/frontend/supabase/migrations/20260421000000_pipeline_events.sql:34-76`).
- Large `response_body` values are offloaded to Supabase Storage bucket `pipeline-events` (`orchestrator/frontend/supabase/migrations/20260421000000_pipeline_events.sql:21-23`; helper behavior at `orchestrator/src/services/events.py:19-24`, `orchestrator/src/services/events.py:306-360`).
- `logged_llm_call`, `logged_api_call`, and `write_event_row()` insert rows but never make event success authoritative for a pipeline stage (`orchestrator/src/services/events.py:76-112`, `orchestrator/src/services/events.py:213-244`, `orchestrator/src/services/events.py:246-296`).

What events contain:

| Stage | Success event signals | Artifact location in event? | Enough to skip regeneration? |
|---|---|---|---|
| concept | LLM events such as `concept:lyrics_combined_llm` and caption calls | Raw response bodies/prompts, not the final concept artifact path as a durable object | No. Maybe enough for manual reconstruction, not automated resume. |
| images | `images:storyboard_llm` and per-scene `images:render_scene` | Local output filenames (`output_path`, `output_file`) and provider response bodies/request IDs | No. It does not store durable Supabase image objects; provider URLs can expire. |
| song | External Suno events are under `suno_bakein`, not `song`; placeholder song stage has no meaningful third-party event | `suno_task_id` in DB and event request_id after submit; audio URLs only after poll success | Partially. Enough to re-poll Suno if task still exists; not enough for local trimmed takes. |
| video | Per-scene `video:generate_*` events | Fal/Kling include `video_url`; self-hosted/RunPod/ken-burns do not provide durable URL | Not generally. It depends on provider and URL retention; not automated. |
| assembly | `assembly:summary` | Local output filenames and timing metadata only (`output_files`) | No. No durable final MP4 location until publishing. |
| bookend | `bookend:tts_call`, `bookend:summary` | TTS metadata and local output summary only | No. No durable bookend MP4 until publishing. |

Examples:

- Image storyboard LLM event is written at `orchestrator/cloud_engines/image_engine/storyboard.py:107-142`.
- Image render events include output filenames and full provider response bodies (`orchestrator/cloud_engines/image_engine/renderer.py:559-599`, `orchestrator/cloud_engines/image_engine/renderer.py:650-686`, `orchestrator/cloud_engines/image_engine/renderer.py:737-778`).
- Kie/Wan/Fal image providers download provider URLs to local PNGs and return response bodies/request IDs, but no Supabase artifact key (`orchestrator/cloud_engines/image_engine/kie_provider.py:135-148`, `orchestrator/cloud_engines/image_engine/kie_provider.py:203-212`; `orchestrator/cloud_engines/image_engine/wan_provider.py:141-154`, `orchestrator/cloud_engines/image_engine/wan_provider.py:167-176`; `orchestrator/cloud_engines/image_engine/fal_provider.py:193-206`, `orchestrator/cloud_engines/image_engine/fal_provider.py:237-247`).
- Kie chain input uploads are explicitly temporary and auto-delete after 3 days (`orchestrator/cloud_engines/image_engine/kie_common.py:233-238`).
- Assembly summary events include `output_files`, `file_size_bytes`, and `video_clips_used`, not a storage URL (`orchestrator/cloud_engines/assembly_engine/engine.py:296-318`, `orchestrator/cloud_engines/assembly_engine/engine.py:700-730`).
- Bookend summary events similarly record metadata, not a durable MP4 URL (`orchestrator/cloud_engines/bookend_engine/engine.py:318-360`).

Can the orchestrator query `pipeline_events WHERE word_id = X AND stage = Y AND status = 'success'` to determine stage completion?

No, not safely. Events are observability facts about sub-steps and provider calls, not stage-completion records. There is no single "stage complete with durable artifact key" event for most stages, and success events can exist for a partial or later-failed stage. The live "wedding" row proves this: it has two successful `video:generate_ltx_selfhosted` events but `words.failed_stage='video'`, so treating successful video events as a completed video stage would be wrong.

## Part 4 — Current Smart Retry Path (Verified)

The previous investigation is stale.

- `orchestrator/job_runner.py` no longer contains `process_word()` or the old all-stage smart retry loop. It is now a queue launcher, signal handler, and shutdown coordinator (`orchestrator/job_runner.py:166-185`, `orchestrator/job_runner.py:276-300`).
- The current `get_incomplete_stages()` still exists and still validates local disk artifacts from the manifest (`orchestrator/src/services/stage_helpers.py:44-89`).
- That helper is only used in the upstream worker before `images`, `concept`, and `song` (`orchestrator/src/orchestration/upstream_worker.py:186-207`). It is not used by `video_dispatcher` or `downstream_worker`.
- `video_dispatcher` always calls `run_stage(..., "video")` when it owns a video-queued word (`orchestrator/src/orchestration/video_dispatcher.py:149-162`).
- `downstream_worker` reads the local manifest and runs assembly/bookend/upload from local artifacts; it does not use `get_incomplete_stages()` to skip based on durable DB state (`orchestrator/src/orchestration/downstream_worker.py:496-618`, `orchestrator/src/orchestration/downstream_worker.py:620-643`, upload at `orchestrator/src/orchestration/downstream_worker.py:674-716`).

Current intended retry router:

- New retry state columns are `current_stage`, `failed_stage`, `music_state`, `retry_requested`, and `retry_requested_at` (`orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql:74-81`).
- `failed_stage='video'` routes to `video_queued`; `failed_stage in ('assembly','bookend','suno_bake','uploading')` routes to `post_video_queued`; upstream failures route to `pending` (`orchestrator/src/orchestration/feeder.py:48-56`).
- Source 2 only claims rows with `retry_requested=true` and terminal `current_stage` in `failed`, `complete`, or `cancelled` (`orchestrator/src/orchestration/feeder.py:316-337`).
- The claim is atomic via `claim_retry_word`, which clears `retry_requested`, clears `failed_stage`, bumps attempts, and sets `current_stage` to the target (`orchestrator/src/orchestration/feeder.py:339-376`; SQL at `orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql:140-164`).

Current user-facing deck retry button:

- `frontend/src/pages/DeckViewPG.tsx` and `frontend/src/pages/DeckView.tsx` still set only `words.status='pending'`, clear `error_message`, insert an approved `generation_jobs` row, debit one credit, and mark the deck generating (`orchestrator/frontend/src/pages/DeckViewPG.tsx:108-157`; same logic at `orchestrator/frontend/src/pages/DeckView.tsx:89-139`).
- They do not set `retry_requested=true`, `retry_requested_at`, or `current_stage`.
- `bootstrap_job()` for Source 1 reads words with `status='pending'`, but it then transitions `current_stage` from `pending` to `enrichment` and skips rows that are not actually in current_stage `pending` (`orchestrator/src/orchestration/feeder.py:488-525`).
- A failed word has `current_stage='failed'` because failures are marked by `mark_word_failed` (`orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql:109-128`). Therefore the current deck retry button can create a pending-status row that Source 1 reads, but Source 1 rejects it because `current_stage` is still `failed`.

What happens if the manifest is missing:

- In the intended Source 2 path, the system does not fall back to `pipeline_events` or Supabase Storage. Upstream skip detection catches manifest-read errors and then `run_stage()` immediately attempts to read the local manifest anyway (`orchestrator/src/orchestration/upstream_worker.py:191-207`, `orchestrator/src/pipeline.py:859-861`). Missing manifest means failure, not durable recovery.
- In the downstream path, missing manifest fails even earlier because `_run_ab_pipeline()` calls `read_manifest(word_dir)` before assembly/bookend (`orchestrator/src/orchestration/downstream_worker.py:514-515`).
- In the stale Source 1 "new job" path, if someone also reset `current_stage='pending'`, `bootstrap_job()` would create a new manifest and can overwrite a stale local manifest (`orchestrator/src/orchestration/feeder.py:626-707`). That is a fresh/full rerun path, not a smart resume.

## Part 5 — The "Wedding" Case: What Survives?

I queried live Supabase read-only on 2026-04-26 using local environment credentials. I did not print credentials.

Live `words` row:

- `id`: `e9070631-a970-4267-acc8-2809da5418fa`
- `deck_id`: `c5f8cbf0-6fce-4a7f-bb92-b4cba7502b62`
- `user_id`: `c50a22c5-a63b-4fb0-9d36-1bfe3e67fd1a`
- `word` / `word_slug`: `wedding`
- `status`: `failed`
- `current_stage`: `failed`
- `failed_stage`: `video`
- `music_state`: `submitted`
- `suno_task_id`: present (`50206bd1c89fe2f9f4f64b17a125692e`)
- `suno_audio_url`, `suno_audio_url_b`, `suno_storage_url`, `suno_storage_url_b`: all null
- `video_url`, `video_url_b`, `thumbnail_url`, `thumbnail_url_b`: all null

Live `pipeline_events` inventory:

- `images:storyboard_llm:success`: 1
- `images:render_scene:success`: 3
- `concept:lyrics_combined_llm:success`: 1
- `suno_bakein:submit:success`: 1
- `video:generate_ltx_selfhosted:success`: 2

Important details:

- There are no `assembly`, `bookend`, or `publishing` events for this word.
- There are only two successful self-hosted video scene events, not three. The word is currently failed at `video`, not `assembly`.
- The video events contain local `source_image_path` values under `/tmp/resonance/workspaces/...` and `provider_request_id` values, but no durable `video_url`.
- The Suno submit event exists and the `words.suno_task_id` is durable. Because `suno_audio_url` is null, retry can try `fetch_existing_task()` before submitting a new Suno job (`orchestrator/src/services/suno_bakein.py:153-199`).

Live Supabase Storage inventory:

- Bucket `videos`, prefix `c50a22c5-a63b-4fb0-9d36-1bfe3e67fd1a/c5f8cbf0-6fce-4a7f-bb92-b4cba7502b62/wedding`: empty.
- Bucket `audio`, same prefix: empty.

Local disk:

- I searched local candidate roots `D:\CODING\ResonanceTEST\content`, `D:\CODING\ResonanceTEST\orchestrator\content`, `D:\tmp\resonance`, and data/tmp variants for a `wedding` folder or `wedding` manifest. No local workspace was found.
- The cloud workspace itself is not accessible from this local machine. The live event paths indicate the cloud files were under `/tmp/resonance/workspaces/...`, so they should be assumed gone after redeploy.

SQL/storage queries to reproduce:

```sql
select id, deck_id, user_id, word, word_slug, status, current_stage, failed_stage,
       music_state, retry_requested, retry_requested_at,
       suno_task_id, suno_audio_url, suno_audio_url_b,
       suno_storage_url, suno_storage_url_b,
       video_url, video_url_b, thumbnail_url, thumbnail_url_b,
       error_message, created_at, updated_at
from words
where lower(word) = 'wedding' or lower(word_slug) = 'wedding'
order by updated_at desc;
```

```sql
select created_at, stage, sub_step, status, request_id, response_ref, metadata, error_message
from pipeline_events
where word_id = 'e9070631-a970-4267-acc8-2809da5418fa'
order by created_at asc;
```

Storage prefixes to list:

```text
videos/c50a22c5-a63b-4fb0-9d36-1bfe3e67fd1a/c5f8cbf0-6fce-4a7f-bb92-b4cba7502b62/wedding
audio/c50a22c5-a63b-4fb0-9d36-1bfe3e67fd1a/c5f8cbf0-6fce-4a7f-bb92-b4cba7502b62/wedding
```

Conclusion for "wedding":

- The specific live row cannot resume from assembly, because it did not durably finish video. It has two self-hosted video scene successes and no durable scene MP4 URLs.
- Even if the prompt's assembly-after-video account was true for an earlier state, the current architecture would only resume assembly if the local workspace survived. With `/tmp` workspace storage, the scene MP4s are gone after redeploy.

## Part 6 — Architecture Options

### Option A: Persist Intermediate Artifacts to Supabase Storage

What it would do:

- Upload each stage's recoverable output after the stage succeeds: concept JSON, storyboard, scene PNGs, placeholder/Suno audio, scene MP4s, assembly MP4, and bookend MP4.
- Store keys under a structured prefix such as `intermediates/{user_id}/{deck_id}/{word_slug}/{stage}/...`.
- On retry, reconstruct the local workspace by downloading the manifest and required files, then resume at the failed stage.

Evaluation:

- Reliability: Highest. This is the only option that works across redeploys, host migrations, container loss, and provider URL expiry.
- Storage cost: Moderate but manageable with cleanup. Scene videos are the main cost. Roughly, each word can produce several MB to tens of MB of scene MP4s; multiplying by all failed/in-flight words matters. Successful-word cleanup keeps long-term cost low.
- Upload time: Adds time after images/video/assembly/bookend. Video upload is the main happy-path cost. It is still cheaper than re-generating paid video if a redeploy happens.
- Cleanup: Needs new cleanup hooks. Existing frontend deletion only removes final `videos` objects and misses audio/intermediates (`orchestrator/frontend/src/pages/DeckView.tsx:145-151`; admin deletion only removes `video_url`/`thumbnail_url`, not B/audio/intermediates, at `orchestrator/frontend/src/pages/admin/Content.tsx:294-304` and deck deletion at `orchestrator/frontend/src/pages/admin/Content.tsx:351-367`).
- Complexity: Medium-high. Requires storage schema/prefix conventions, upload/download helpers, manifest persistence, and cleanup jobs/RPCs.

### Option B: Use pipeline_events as Stage Completion Oracle + Re-fetch External Sources

What it would do:

- Query `pipeline_events` for successful sub-steps and try to re-download from provider URLs or re-poll provider task IDs.

Evaluation:

- Concept: Maybe reconstructable from raw LLM responses, but not the actual current artifact contract.
- Images: Provider response bodies/request IDs exist, but durable image URLs are not guaranteed. Kie chain upload URLs auto-delete after 3 days (`orchestrator/cloud_engines/image_engine/kie_common.py:233-238`).
- Song/Suno: This is the strongest case. `suno_task_id` survives after submit (`orchestrator/src/suno.py:298-305`), and `suno_bakein` can re-poll it (`orchestrator/src/services/suno_bakein.py:153-199`).
- Video: Weak. Fal/Kling expose `video_url` in events, but self-hosted/RunPod do not. The live "wedding" video provider was self-hosted and has no durable URL.
- Assembly/bookend: Not recoverable from events; events contain local filenames and metadata only.
- Reliability: Low-medium and provider-specific. It can reduce some rework, but it cannot make retry reliable.
- Complexity: Medium-high because it needs provider-specific recovery code and expiry handling.

### Option C: Persist Only the Manifest to Supabase

What it would do:

- Upload `manifest.json` after each stage update and download it on retry.

Evaluation:

- Useful as part of Option A, but not useful alone for the wedding scenario.
- A manifest can tell the orchestrator that `selected.video` was `auto-001_...`, but it cannot provide `scene_001.mp4`.
- If the actual files are gone, manifest-only retry still fails at assembly/bookend/upload.
- Complexity: Low.
- Reliability alone: Low.

### Option D: Railway Persistent Volume

What it would do:

- Mount a Railway volume at `/data`, keep `CLOUD_WORKSPACE_ROOT=/data/resonance/workspaces`, and ensure the deployed service actually uses that path.

Evaluation:

- Complexity: Lowest if done in Railway dashboard. Current code already expects `/data` in `Dockerfile.cloud` (`orchestrator/Dockerfile.cloud:52-55`).
- Reliability: Good for the exact "redeploy killed container but volume survives" scenario. Not as strong as Option A for multi-service/multi-region, accidental cleanup, provider migrations, or volume misconfiguration.
- Cost: Railway's official pricing page currently lists Hobby volume storage up to 5 GB and paid-plan ephemeral disk 100 GB; see <https://railway.com/pricing>. Official docs say volumes are persistent storage for services and must be mounted at a configured path: <https://docs.railway.com/volumes>.
- Timeline risk: Low, but there is one operational risk: the live "wedding" run used `/tmp`, so the deployment/env must be verified after mounting. Add a startup log/health diagnostic for `CLOUD_WORKSPACE_ROOT` and `RAILWAY_VOLUME_MOUNT_PATH`.

### Option E: Accept Full Re-run on Container Death, Optimize In-Container Retry Only

What it would do:

- Accept that ephemeral container death causes lost artifacts and re-run paid stages. Improve shutdown to reduce frequency.

Evaluation:

- Railway docs say a new deployment sends SIGTERM to the old deployment and by default gives 0 seconds before SIGKILL; this can be controlled with `RAILWAY_DEPLOYMENT_DRAINING_SECONDS` (<https://docs.railway.com/deployments/reference>).
- Current `job_runner.py` traps SIGTERM, stops feeding new work, stops workers, cancels the video dispatcher, and waits only 30 seconds (`orchestrator/job_runner.py:143-160`, `orchestrator/job_runner.py:276-300`). It explicitly does not wait for in-flight video renders (`orchestrator/job_runner.py:284-285`).
- This can reduce but not eliminate losses. Long video/Suno/assembly work can exceed graceful windows, and Railway can redeploy/migrate services for platform reasons.
- Reliability: Lowest. It still spends paid generation credits after redeploy.

## Part 7 — Cleanup Lifecycle

What exists today:

- Final video publish exists for bucket `videos` (`orchestrator/src/services/publishing.py:48-88`, `orchestrator/src/services/publishing.py:91-153`).
- Suno bake uploads raw MP3s to bucket `audio` and writes `suno_storage_url*` (`orchestrator/src/services/suno_bakein.py:67-102`).
- Large event bodies are stored in bucket `pipeline-events` (`orchestrator/src/services/events.py:319-360`).
- There is a `cleanup_job_workspace()` function that deletes the cloud workspace after all processing is complete, but I found no call site in current orchestration code (`orchestrator/src/storage.py:66-78`).
- User/admin delete flows remove only some final video objects. DeckView removes hard-coded `videos` paths built from `word.word`, not `word_slug`, and does not remove `audio` or intermediates (`orchestrator/frontend/src/pages/DeckView.tsx:145-151`). Admin deletion/deck deletion remove only `video_url` and `thumbnail_url`, not B variants/audio/intermediates (`orchestrator/frontend/src/pages/admin/Content.tsx:294-304`, `orchestrator/frontend/src/pages/admin/Content.tsx:351-367`).

What would be needed for Option A:

1. On successful word completion, delete `intermediates/{user_id}/{deck_id}/{word_slug}/` after final `video_url*` and `suno_storage_url*` are confirmed durable.
2. On word deletion, delete final videos, final audio, event/intermediate artifacts if appropriate, and all intermediate prefixes.
3. On retry, keep intermediate storage until the retry succeeds or the word is deleted/expired.
4. Add an expiry job for failed words, for example delete intermediates after N days with no retry request.
5. Add storage migrations/policies for an `intermediates` bucket or use an existing private bucket with service-role-only writes.

No complete cleanup lifecycle for intermediates exists today; it would be new work.

## Part 8 — Recommendation

Clear winner for the minimum viable "Railway redeploy killed the container" fix: Option D, Railway persistent volume, mounted at the actual workspace root.

Why:

- The code already wants `/data/resonance/workspaces` in cloud mode (`orchestrator/Dockerfile.cloud:52-55`).
- The current orchestration already has stage routing through `current_stage`/`failed_stage` and can route assembly/bookend/upload retries directly to `post_video_queued` if the local manifest and artifacts are still present (`orchestrator/src/orchestration/feeder.py:48-56`, `orchestrator/src/orchestration/recovery.py:22-35`).
- It is the smallest change that makes the existing local manifest/artifact model survive ordinary Railway redeploys.

Required minimum actions:

1. Mount a Railway volume at `/data` for the orchestrator service, or set `CLOUD_WORKSPACE_ROOT` to a subdirectory of `RAILWAY_VOLUME_MOUNT_PATH`.
2. Verify in production logs that `get_workspace_root()` resolves to `/data/resonance/workspaces`, not `/tmp/resonance/workspaces`.
3. Fix the deck retry button to use the new retry contract: set `retry_requested=true`, `retry_requested_at=now()`, and leave `current_stage='failed'` so Source 2 can route by `failed_stage`. Do not insert a fresh full `generation_jobs` row for dashboard retry unless Source 1 is also redesigned.
4. For "wedding" specifically, either set `retry_requested=true` after fixing the UI path or manually route it. Because it currently failed at `video` and only has two self-hosted video scenes, it cannot resume assembly. It will need to rerun video unless the cloud `/tmp` workspace still exists, which is unlikely after redeploy.

Clear winner for product-grade durable smart retry: Option A.

Why:

- Option D protects against normal redeploys only if the volume is mounted correctly and the same service path is used.
- Option A is the only option that makes intermediate artifacts durable independent of container lifecycle, provider URL expiry, and Railway volume mistakes.
- Option B is not reliable for self-hosted/RunPod video or assembly/bookend. Option C is incomplete without artifact storage. Option E intentionally accepts paid rework.

Ranking:

| Option | Implementation complexity | Reliability | Cost efficiency | Timeline risk |
|---|---:|---:|---:|---:|
| D: Railway volume | Low | High for same-service redeploys; medium overall | Good; cheap storage versus regeneration | Low, but requires dashboard/env verification |
| A: Persist intermediates | Medium-high | Highest | Good with cleanup; storage cost is cheaper than repeated video generation | Medium-high |
| C: Persist manifest only | Low | Low alone | Good but incomplete | Low, but does not solve the problem |
| B: Events + external re-fetch | Medium-high | Low-medium, provider-specific | Mixed; cheap when URLs work, expensive when they do not | High due provider edge cases |
| E: Accept full rerun | Low | Lowest | Poor for paid stages | Low implementation, high operational/business risk |

Final recommendation:

- Ship Option D immediately and fix the retry UI contract at the same time. This is the fastest path to stop Railway redeploys from destroying in-flight workspaces.
- Plan Option A next for true durable smart retry. Prioritize video scene MP4s first, because they are the expensive, least-recoverable artifacts in the "assembly after video" failure mode.

## Appendix — Files Read

- `INVESTIGATION_REPORT_SMART_RETRY.md`: previous stale report; it describes old `job_runner.process_word()` all-stage smart retry.
- `orchestrator/Dockerfile.cloud`: cloud env and intended workspace root.
- `orchestrator/railway.toml`: Railway build/deploy config; no volume declaration.
- `orchestrator/src/storage.py`: cloud/local workspace root and job workspace path.
- `orchestrator/job_runner.py`: current queue startup and SIGTERM handling.
- `orchestrator/src/orchestration/feeder.py`: Source 1 jobs, Source 2 retries, retry routing, bootstrap.
- `orchestrator/src/orchestration/state.py`: transition, failure, retry claim helpers.
- `orchestrator/src/orchestration/recovery.py`: crash recovery routing by stage.
- `orchestrator/src/orchestration/upstream_worker.py`: upstream stage execution and only current `get_incomplete_stages()` skip.
- `orchestrator/src/orchestration/video_dispatcher.py`: video stage execution.
- `orchestrator/src/orchestration/downstream_worker.py`: assembly/bookend/Suno bake/upload execution.
- `orchestrator/src/orchestration/retry.py`: retry budgets and failure finalization.
- `orchestrator/src/services/stage_helpers.py`: manifest/local-file stage validation.
- `orchestrator/src/services/events.py`: pipeline event writes and response offload.
- `orchestrator/src/services/publishing.py`: final video upload to Supabase Storage.
- `orchestrator/src/services/suno_bakein.py`: Suno repoll/download/upload/bake path.
- `orchestrator/src/suno.py`: Suno submit/poll/write/download helpers.
- `orchestrator/src/cloud_dispatcher.py`: Suno placeholder song stage.
- `orchestrator/src/pipeline.py`: stage order, stage output directories, per-stage selection updates.
- `orchestrator/cloud_engines/concept_engine/engine.py`: concept artifact write.
- `orchestrator/cloud_engines/image_engine/engine.py`: storyboard/image output write.
- `orchestrator/cloud_engines/image_engine/storyboard.py`: storyboard event write.
- `orchestrator/cloud_engines/image_engine/renderer.py`: image render event write.
- `orchestrator/cloud_engines/image_engine/kie_provider.py`: Kie image download/response.
- `orchestrator/cloud_engines/image_engine/wan_provider.py`: Wan image download/response.
- `orchestrator/cloud_engines/image_engine/fal_provider.py`: Fal image download/response.
- `orchestrator/cloud_engines/image_engine/kie_common.py`: temporary Kie file-upload behavior.
- `orchestrator/cloud_engines/video_engine/engine.py`: scene video output write.
- `orchestrator/cloud_engines/video_engine/adapters/ltx.py`: Fal LTX video event and URL.
- `orchestrator/cloud_engines/video_engine/adapters/kling.py`: Fal/Kling video event and URL.
- `orchestrator/cloud_engines/video_engine/adapters/ltx_selfhosted.py`: self-hosted LTX local download and event metadata.
- `orchestrator/cloud_engines/video_engine/adapters/ltx_runpod.py`: RunPod base64-to-local output and event metadata.
- `orchestrator/cloud_engines/video_engine/adapters/ken_burns.py`: local ffmpeg video output and event metadata.
- `orchestrator/cloud_engines/assembly_engine/engine.py`: assembly final output and summary event.
- `orchestrator/cloud_engines/bookend_engine/engine.py`: bookend final output and summary event.
- `orchestrator/cloud_engines/bookend_engine/tts.py`: ElevenLabs TTS event/local MP3 write.
- `orchestrator/frontend/src/pages/DeckViewPG.tsx`: current PG retry/delete handlers.
- `orchestrator/frontend/src/pages/DeckView.tsx`: current retry/delete handlers.
- `orchestrator/frontend/src/pages/Music.tsx`: current Suno retry job insertion.
- `orchestrator/frontend/src/pages/admin/Content.tsx`: admin delete cleanup behavior.
- `orchestrator/src/routers/suno.py`: admin Suno generate storage upload path.
- `orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql`: `videos` bucket.
- `orchestrator/frontend/supabase/migrations/20260329000000_ab_dual_take.sql`: B video columns.
- `orchestrator/frontend/supabase/migrations/20260331000000_suno_columns.sql`: Suno A URL/task columns.
- `orchestrator/frontend/supabase/migrations/20260331000001_suno_audio_url_b.sql`: Suno B URL column.
- `orchestrator/frontend/supabase/migrations/20260404000000_suno_retry_job_type.sql`: old `suno_retry` job type.
- `orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql`: current stage/retry state columns.
- `orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql`: transition/fail/claim retry RPCs.
- `orchestrator/frontend/supabase/migrations/20260421000000_pipeline_events.sql`: pipeline event schema and bucket.
- Official Railway docs: volumes (<https://docs.railway.com/volumes>), deployments/ephemeral storage/graceful shutdown (<https://docs.railway.com/deployments/reference>), pricing (<https://railway.com/pricing>).

## Discrepancies

- The prompt says the prior retry logic lives at `job_runner.py` lines 201-246. That was true for the earlier report, but not current code. Current `job_runner.py` has no `process_word()`; orchestration moved into `src/orchestration/*`.
- The prompt says the failure happened after video completion and before assembly. The current live "wedding" row says `failed_stage='video'`, and `pipeline_events` show only two successful self-hosted video scene events and no assembly events.
- The prompt says every upstream stage including video completed successfully via `pipeline_events`. Current live events do not show video stage completion; they show partial video sub-step success.
- The prompt says the frontend retry button creates a new `generation_jobs` row. That is still true for `DeckViewPG.tsx`/`DeckView.tsx`, but current orchestrator retry routing expects `words.retry_requested=true`. The UI and orchestrator retry contracts are inconsistent.
- The orchestrator comments say music-page retry writes `retry_requested=true` (`orchestrator/src/orchestration/feeder.py:33-45`), but `Music.tsx` still inserts `generation_jobs` rows with `job_type='suno_retry'` (`orchestrator/frontend/src/pages/Music.tsx:143-172`).
- Code writes and frontend reads `suno_storage_url` / `suno_storage_url_b`, but I did not find a repo migration adding those `words` columns or creating an `audio` bucket. The live database and storage API do have enough schema/bucket support for the read-only query to work, so this may exist outside the checked-in migrations.
