# Investigation Report: Stage 2 Pipeline Events Instrumentation

## Scope

This report is a read-only audit of `d:/CODING/ResonanceTEST/orchestrator` as the live resonance-cloud repo for Stage 2 observability work. I followed the repo-root/path-divergence constraint from the prior Stage 2 investigation memory: the prompt-referenced workflow docs are not present at this repo root, so the closest ops reference is outside the repo at `d:/CODING/ResonanceTEST/docs/RESONANCE_PROJECT_OPS.md`; that divergence should be called out explicitly rather than papered over.

The target of this audit is the current mapping of outbound calls, routing decisions, payload identity, and `generation-meta.json` capture for:

- `cloud_engines/image_engine`
- `cloud_engines/video_engine`
- `cloud_engines/assembly_engine`
- `cloud_engines/bookend_engine`
- the orchestrator production concept engine and the standalone concept dev tree

I also traced the worker-layer Suno submit / re-poll / bake paths because they are the current Stage 2 code that already writes `pipeline_events` rows.

## Executive summary

- The `pipeline_events` table and storage bucket exist in `frontend/supabase/migrations/20260421000000_pipeline_events.sql`, with append-only intent, admin-read RLS, and optional offload of large responses to the `pipeline-events` storage bucket. `public.pipeline_events` stores `word_id`, `deck_id`, `user_id`, `job_id`, `attempt`, prompts, response bodies, latency, cost, and provider request IDs. Citations: `frontend/supabase/migrations/20260421000000_pipeline_events.sql:18-29`, `frontend/supabase/migrations/20260421000000_pipeline_events.sql:34-76`, `frontend/supabase/migrations/20260421000000_pipeline_events.sql:108-116`.
- The write helper in `src/services/events.py` is non-blocking by contract, never re-raises on Supabase failures, and provides two wrappers: `logged_llm_call` and `logged_api_call`. Those wrappers write stage, sub-step, identity, provider/model, prompts, response, latency, cost, token counts, request ID, and arbitrary metadata. Citations: `src/services/events.py:1-25`, `src/services/events.py:62-77`, `src/services/events.py:79-179`, `src/services/events.py:181-247`.
- **Critical current-state finding:** the four target engines under `cloud_engines/image_engine`, `video_engine`, `assembly_engine`, and `bookend_engine` do **not** currently import or call `logged_llm_call`, `logged_api_call`, or `write_event_row`. Negative searches returned no matches for all four trees. Citations: negative grep over `cloud_engines/image_engine`, `cloud_engines/video_engine`, `cloud_engines/assembly_engine`, `cloud_engines/bookend_engine` (no results).
- The only production engine already wired to `pipeline_events` is `cloud_engines/concept_engine`, where both caption and combined-lyrics LLM calls are wrapped and correlated with `word_id`, `deck_id`, `user_id`, `job_id`, and `attempt`. Citations: `cloud_engines/concept_engine/models.py:100-116`, `cloud_engines/concept_engine/engine.py:82-90`, `cloud_engines/concept_engine/caption.py:22-67`, `cloud_engines/concept_engine/caption.py:84-120`, `cloud_engines/concept_engine/lyrics.py:196-244`.
- The worker/service Suno bake-in path is also instrumented today. Submit is wrapped by `logged_api_call`, and post-download duration/file-size facts are written through `write_event_row(sub_step="audio_probe")`. Citations: `src/suno.py:157-256`, `src/services/suno_bakein.py:140-177`, `src/services/suno_bakein.py:220-239`, `src/services/suno_bakein.py:353-374`.
- Result: Stage 2 observability is currently **mixed-mode**. Concept and Suno bake-in produce `pipeline_events`; image/video/assembly/bookend still rely on local logs and `generation-meta.json`, with uneven identity propagation.

## 1. Observability substrate already present

### 1.1 Migration and storage contract

The migration creates a private `pipeline-events` storage bucket for large-response offload, then creates `public.pipeline_events` with append-only semantics. The table includes:

- provenance fields: `event_source`, `stage`, `sub_step`
- identity fields: `word_id`, `deck_id`, `user_id`, `job_id`, `attempt`
- provider/model fields: `model_provider`, `model_name`
- outcome/metrics fields: `status`, `error_message`, `error_type`, `latency_ms`, `cost_usd`, `tokens_in`, `tokens_out`
- payload fields: `system_prompt`, `user_prompt`, `response_body`, `response_ref`
- external correlation: `request_id`
- free-form `metadata`

Citations: `frontend/supabase/migrations/20260421000000_pipeline_events.sql:18-29`, `frontend/supabase/migrations/20260421000000_pipeline_events.sql:34-76`.

RLS is admin-read only; service-role writes bypass RLS. Citations: `frontend/supabase/migrations/20260421000000_pipeline_events.sql:104-116`.

### 1.2 Write helper behavior

`src/services/events.py` defines the write path and explicitly states:

- Supabase insert failures are warnings only and never re-raised.
- If called inside an event loop, writes are offloaded to a thread so sync Supabase I/O does not block async poll paths.
- `logged_llm_call` and `logged_api_call` capture lifecycle timing and write a row on exit.

Citations: `src/services/events.py:8-25`, `src/services/events.py:62-77`, `src/services/events.py:79-179`.

The emitted row shape is built in `_build_row()` and includes the identity tuple plus prompts, response, request ID, and metadata. Citations: `src/services/events.py:181-213`.

## 2. Identity seeding in the orchestrator

The earliest authoritative identity write in the orchestrator path is in `src/orchestration/feeder.py`, where `create_manifest(...)` is called with:

- `word_id`
- `deck_id`
- `user_id`
- `job_id` from `generation_job_id`
- `attempt` currently set to `None`

Citations: `src/orchestration/feeder.py:659-682`.

That manifest identity is only threaded into the **concept** payload today. `build_concept_payload()` reads `manifest_data.identity` and writes those values into `metadata.word_id`, `metadata.deck_id`, `metadata.user_id`, `metadata.job_id`, and `metadata.attempt`. Citations: `src/pipeline.py:197-242`.

By contrast:

- `build_image_payload()` emits only `word`, `language`, `translation`, `timestamp` in metadata. Citations: `src/pipeline.py:277-311`.
- `build_video_payloads()` emits only `word`, `language`, `translation`, `timestamp`, `image_version`, `scene_number`. Citations: `src/pipeline.py:365-378`, `src/pipeline.py:455-467`.
- `build_assembly_payload()` emits only `word`, `language`, `translation`, `timestamp`, `song_version`, `video_version`. Citations: `src/pipeline.py:740-779`.
- `build_bookend_payload()` emits only `word`, `language`, `translation`, `assembly_version`, `timestamp`. Citations: `src/pipeline.py:782-812`.

**Implication:** concept already has the identity tuple required by `pipeline_events`; image/video/assembly/bookend do not.

## 3. Current worker-layer Stage 2 instrumentation already in production

### 3.1 Suno submit

`src/suno.py:submit_song()` uses an idempotency gate against the `words` row, then wraps the outbound kie.ai submit call in `logged_api_call(stage="suno_bakein", sub_step="submit")`. The event carries `word_id`, `deck_id`, `user_id`, `job_id`, `attempt=1`, provider/model metadata, `style` as `system_prompt`, lyrics as `user_prompt`, request-body JSON in metadata, and provider `taskId` as `request_id`. Citations: `src/suno.py:157-256`.

### 3.2 Suno bake-in re-poll and audio-probe facts

When bake-in sees a stored `suno_task_id` with no `suno_audio_url`, it re-polls via `fetch_existing_task()`; on success it persists the CDN URLs to Supabase because `fetch_existing_task()` itself does not write to Supabase. Citations: `src/services/suno_bakein.py:140-177`, `src/suno.py:577-633`.

After download/probe succeeds, `src/services/suno_bakein.py` emits `write_event_row(stage="suno_bakein", sub_step="audio_probe")` containing Track A/B durations, file sizes, and target clip duration in `metadata`. Citations: `src/services/suno_bakein.py:220-239`, `src/services/suno_bakein.py:353-374`.

### 3.3 Worker routing around submit/bake failures

The upstream worker defers Suno submit when concept is missing and marks `music_state="pending"`; otherwise it retries submit with budget and marks `submitted` or `submit_failed`. Citations: `src/orchestration/upstream_worker.py:300-355`.

The downstream worker inlines submit when needed, reroutes failed submit or exhausted bake to the placeholder assembly path, and runs `bake_suno_into_word()` with its own retry budget. Citations: `src/orchestration/downstream_worker.py:261-427`, `src/orchestration/downstream_worker.py:446-485`.

## 4. Engine mapping: concept (production) vs concept dev tree

### 4.1 Production concept engine is already instrumented

The production concept engine extends `ConceptMetadata` with optional `word_id`, `deck_id`, `user_id`, `job_id`, and `attempt`. Citations: `cloud_engines/concept_engine/models.py:100-116`.

`generate_concept()` immediately builds an `identity` dict from those metadata fields and passes it into downstream LLM call sites. Citations: `cloud_engines/concept_engine/engine.py:82-90`, `cloud_engines/concept_engine/engine.py:125-168`.

`generate_caption()` wraps the OpenRouter caption call in `logged_llm_call(stage="concept", sub_step="caption_llm")`, recording the full user prompt, model name, token counts, cost, and provider request ID. Citations: `cloud_engines/concept_engine/caption.py:22-67`.

`generate_caption_with_article()` does the same for the reliable-mode combined article+caption call. Citations: `cloud_engines/concept_engine/caption.py:84-120`.

The combined lyrics path also wraps its OpenRouter request in `logged_llm_call(stage="concept", sub_step="lyrics_combined_llm")`, with metadata for `lyric_mode` and whether an external storyboard caption was used. Citations: `cloud_engines/concept_engine/lyrics.py:196-244`.

Despite that, production concept still writes only ordinary `generation-meta.json` for local artifacts; the event rows are additive. Citations: `cloud_engines/concept_engine/engine.py:240-257`, `cloud_engines/concept_engine/engine.py:319-382`.

### 4.2 Standalone concept dev tree is near-code-parity but not runtime-parity

The standalone dev tree at `engines/concept-engine/src/engine.py` is nearly identical in business logic, but it lacks the production identity plumbing and event wrappers:

- `ConceptMetadata` in the dev tree contains only `word`, `language`, `timestamp`. Citations: `engines/concept-engine/src/models.py:100-115`.
- Its `generate_concept()` has no `identity` dict and does not pass identity into caption/lyrics calls. Citations: `engines/concept-engine/src/engine.py:75-167`.
- Its `caption.py` directly calls `llm_client.generate(...)` with no `logged_llm_call`. Citations: `engines/concept-engine/src/caption.py:20-44`, `engines/concept-engine/src/caption.py:61-83`.
- Its `lyrics.py` also directly calls `llm_client.generate(...)` with no event wrapper. Citations: `engines/concept-engine/src/lyrics.py:183-214`.
- Its `llm_client.py` is a minimal synchronous OpenRouter wrapper with no retry/event/cost structure beyond logging. Citations: `engines/concept-engine/src/llm_client.py:20-99`.

The standalone FastAPI test UI also builds payload metadata without any identity tuple, both for `/generate` and `/run`. Citations: `engines/concept-engine/ui/app.py:193-218`, `engines/concept-engine/ui/app.py:271-298`.

**Verdict:** the dev tree is useful for logic parity, but it is **not** equivalent to orchestrator production for Stage 2 observability validation.

## 5. Engine mapping: image engine

### 5.1 Entry point and metadata contract

`generate_images()` validates input, resolves scene count, generates a storyboard, writes `storyboard.json`, optionally renders images, and always writes `generation-meta.json` in `finally`. Citations: `cloud_engines/image_engine/engine.py:46-110`, `cloud_engines/image_engine/engine.py:111-194`.

The image `generation-meta.json` contains:

- input: `word`, `language`, `language_code`, `concept_version`
- settings: creative direction, narrative mode, image count/source, aspect ratio, art style, LLM/image models, vocal gender
- outputs: image count and file list plus `storyboard.json`
- step metadata: storyboard-generation and image-rendering summaries

Citations: `cloud_engines/image_engine/engine.py:227-298`.

### 5.2 Routing decisions

The engine has two high-level routes:

- normal image generation: storyboard + render scenes
- text-to-video prepass: `skip_rendering=True`, storyboard only

Citations: `cloud_engines/image_engine/engine.py:111-130`.

Inside storyboard generation, `skip_rendering` is treated as `text_to_video`, which changes the prompt and parsing path. Citations: `cloud_engines/image_engine/storyboard.py:67-81`, `cloud_engines/image_engine/storyboard.py:98-108`.

### 5.3 Outbound calls

#### LLM / OpenRouter

`generate_storyboard()` builds a system prompt and user prompt, then calls `_call_openrouter(...)`. Citations: `cloud_engines/image_engine/storyboard.py:64-103`.

The module header explicitly states one LLM call per generation via OpenRouter. Citations: `cloud_engines/image_engine/storyboard.py:1-5`.

#### Image rendering / Gemini

`render_scene()` serializes `image_prompt` to JSON, optionally prepends a style preamble, creates a Gemini client, and calls `_call_gemini_with_retries(...)`. It can prepend a previous scene image and chain instruction to the parts list for continuity. Citations: `cloud_engines/image_engine/renderer.py:531-587`, `cloud_engines/image_engine/renderer.py:551-581`.

#### Image rendering / Wan via kie.ai

The Wan provider is explicitly documented as using synchronous kie.ai HTTP endpoints:

- `POST /jobs/createTask`
- `GET /jobs/recordInfo?taskId=...`
- optional upload via `https://kieai.redpandaai.co/api/file-base64-upload`

Citations: `cloud_engines/image_engine/wan_provider.py:1-12`, `cloud_engines/image_engine/wan_provider.py:109-142`, `cloud_engines/image_engine/wan_provider.py:145-176`, `cloud_engines/image_engine/wan_provider.py:183-220`.

### 5.4 Current observability gap

The image engine has strong local trace artifacts (`storyboard.json`, `debug.json`, `generation-meta.json`) but **no** `pipeline_events` writes. Negative grep for `logged_api_call|logged_llm_call|write_event_row` over `cloud_engines/image_engine` returned no matches.

### 5.5 Payload identity

The orchestrator passes no `word_id`, `deck_id`, `user_id`, `job_id`, or `attempt` into image payload metadata. Citations: `src/pipeline.py:277-311`.

As a result, image-engine code has no identity tuple available even if instrumentation were added later without payload changes.

## 6. Engine mapping: video engine

### 6.1 Entry point and metadata contract

`generate_video()` validates input, checks FFmpeg, routes by `video_mode`, validates/adjusts settings through the adapter, generates the clip, extracts a thumbnail, and always writes `generation-meta.json`. Citations: `cloud_engines/video_engine/engine.py:44-116`, `cloud_engines/video_engine/engine.py:154-169`.

The resulting metadata includes:

- context: `word`, `language`, `translation`
- inputs: `image_version`, `scene_number`, `video_prompt`, full adjusted settings, transition flag, `end_image_path`
- outputs: video filename, thumbnail, codec, resolution, fps, duration, size
- cost: estimated USD using adjusted/snapped duration
- reproducibility: seed, provider/model, request ID, FFmpeg version

Citations: `cloud_engines/video_engine/engine.py:219-326`.

### 6.2 Routing decisions

`get_adapter(video_mode)` dispatches to:

- `KenBurnsAdapter` for `ken_burns`
- `LTXRunPodAdapter` when `VIDEO_BACKEND == "runpod"` and mode is LTX
- `LTXSelfHostedAdapter` when `VIDEO_BACKEND == "self_hosted"` and mode is LTX
- `LTXAdapter` otherwise for LTX on Fal.ai
- `KlingAdapter` for Kling modes

Citations: `cloud_engines/video_engine/router.py:13-53`.

The orchestrator builds one payload per scene, threading `scene_number`, `image_version`, per-scene prompt, optional `end_image_path` for morph boundaries, and per-scene duration overrides. Citations: `src/pipeline.py:314-384`, `src/pipeline.py:418-482`.

### 6.3 Outbound calls by adapter

#### Fal.ai LTX

The Fal.ai adapter uploads source/end images, snaps duration to valid enums, builds a prompt, then submits with `fal_client.submit(endpoint, arguments=arguments)` and polls via `handle.iter_events(...)` before downloading the returned video URL. Citations: `cloud_engines/video_engine/adapters/ltx.py:115-176`, `cloud_engines/video_engine/adapters/ltx.py:183-220`.

#### RunPod LTX

The RunPod adapter base64-encodes input images, builds a JSON payload, and submits to `https://api.runpod.ai/v2/{endpoint}/run`, then polls status as an async job pattern. Citations: `cloud_engines/video_engine/adapters/ltx_runpod.py:1-8`, `cloud_engines/video_engine/adapters/ltx_runpod.py:43-47`, `cloud_engines/video_engine/adapters/ltx_runpod.py:155-215`.

#### Self-hosted LTX

The self-hosted adapter resolves `GPU_WORKER_URL` / pod-manager fallback, sends form-data to `POST {worker_url}/generate`, then uses async submit/poll/download semantics. Citations: `cloud_engines/video_engine/adapters/ltx_selfhosted.py:29-33`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:104-115`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:130-186`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:227-240`.

#### Kling via Fal.ai

The Kling adapter uploads one image, rounds duration to string enum `"5"` or `"10"`, then submits to Fal.ai and polls until completion before downloading the video URL. Citations: `cloud_engines/video_engine/adapters/kling.py:26-29`, `cloud_engines/video_engine/adapters/kling.py:62-70`, `cloud_engines/video_engine/adapters/kling.py:101-176`.

#### Ken Burns local path

Ken Burns is fully local: scale source image 2x, build a zoompan filter, run FFmpeg, then extract a thumbnail. No cloud API is involved. Citations: `cloud_engines/video_engine/adapters/ken_burns.py:1-9`, `cloud_engines/video_engine/adapters/ken_burns.py:82-197`.

### 6.4 Current observability gap

The video engine tree has **no** `logged_api_call`, `logged_llm_call`, or `write_event_row` usage. Negative grep over `cloud_engines/video_engine` returned no matches.

### 6.5 Payload identity

The orchestrator does not pass `word_id`, `deck_id`, `user_id`, `job_id`, or `attempt` to video payload metadata. Citations: `src/pipeline.py:365-378`, `src/pipeline.py:455-467`.

## 7. Engine mapping: assembly engine

### 7.1 Entry point and routing behavior

`assemble()` validates inputs, checks FFmpeg/ffprobe, probes song and clips, processes audio, calculates timing, scales clips, builds segments, concatenates, muxes final output, and always writes `generation-meta.json`. Citations: `cloud_engines/assembly_engine/engine.py:48-59`, `cloud_engines/assembly_engine/engine.py:74-139`, `cloud_engines/assembly_engine/engine.py:141-249`, `cloud_engines/assembly_engine/engine.py:269-293`.

Routing is internal, not provider-based:

- timing plan chooses gap vs overflow handling
- gap strategies dispatch to ping-pong / loop / fade-black / freeze-Ken-Burns / word-card
- overflow chooses trim vs fade-audio-black vs video-full

Citations: `cloud_engines/assembly_engine/timing.py:21-99`, `cloud_engines/assembly_engine/gaps.py:24-81`, `cloud_engines/assembly_engine/engine.py:164-195`, `cloud_engines/assembly_engine/video.py:60-122`, `cloud_engines/assembly_engine/video.py:262-350`.

### 7.2 Outbound calls

There are **no network outbound calls** in assembly. All side effects are local FFmpeg/ffprobe subprocesses via `ffmpeg_builder.run_ffmpeg(...)`, `run_ffmpeg_for_stderr(...)`, and `probe_media(...)`. Citations: `cloud_engines/assembly_engine/ffmpeg_builder.py:21-70`, `cloud_engines/assembly_engine/ffmpeg_builder.py:73-104`, `cloud_engines/assembly_engine/ffmpeg_builder.py:107-188`.

This includes:

- silence detection and trim via FFmpeg filters
- two-pass loudnorm measurement and normalization
- clip scaling, xfade/hard-cut concatenation, and final mux

Citations: `cloud_engines/assembly_engine/audio.py:27-123`, `cloud_engines/assembly_engine/audio.py:125-193`, `cloud_engines/assembly_engine/video.py:18-57`, `cloud_engines/assembly_engine/video.py:125-259`, `cloud_engines/assembly_engine/video.py:262-350`.

### 7.3 Metadata capture

Assembly `generation-meta.json` captures:

- context: `word`, `language`, `translation`
- inputs: `song_version`, `video_version`, actual clip filenames, full settings
- outputs: final duration/resolution/size
- `assembly_report`: original/effective song duration, silence-trim stats, gap/strategy, LUFS, word-card durations, clip trimming/looping flags
- reproducibility: FFmpeg version

Citations: `cloud_engines/assembly_engine/models.py:232-293`, `cloud_engines/assembly_engine/engine.py:532-659`.

### 7.4 Current observability gap

The assembly engine tree has **no** `pipeline_events` helper usage. Negative grep over `cloud_engines/assembly_engine` returned no matches.

### 7.5 Payload identity

Assembly payload metadata contains only `word`, `language`, `translation`, `timestamp`, `song_version`, and `video_version`. Citations: `src/pipeline.py:740-779`, `cloud_engines/assembly_engine/models.py:120-138`.

## 8. Engine mapping: bookend engine

### 8.1 Entry point and timing behavior

`wrap()` validates the assembled video, probes width/height/fps/duration, resolves fonts, generates TTS, normalizes TTS loudness, calculates intro/outro timing, renders a card image, builds intro/outro segments, re-encodes the assembled video for concat compatibility, concatenates, probes final output, and always writes `generation-meta.json`. Citations: `cloud_engines/bookend_engine/engine.py:31-62`, `cloud_engines/bookend_engine/engine.py:64-127`, `cloud_engines/bookend_engine/engine.py:129-175`, `cloud_engines/bookend_engine/engine.py:176-259`, `cloud_engines/bookend_engine/engine.py:297-309`.

Timing is deterministic from TTS duration and settings:

- display duration = `tts_duration * (1 + buffer_pct)` clamped to `[min, max]`
- intro duration = fade + card display
- outro duration = fade + card display
- TTS starts after `fade_duration`

Citations: `cloud_engines/bookend_engine/timing.py:1-20`, `cloud_engines/bookend_engine/timing.py:23-53`.

### 8.2 Outbound calls

#### ElevenLabs TTS

`generate_pronunciation()` calls `POST https://api.elevenlabs.io/v1/text-to-speech/{voice_id}` with `text`, `model_id`, voice settings, and optional language code, retrying rate-limit and timeout cases. Citations: `cloud_engines/bookend_engine/tts.py:30-147`.

#### Local FFmpeg/ffprobe

The rest of bookend is local:

- `normalize_tts_audio()` uses two-pass FFmpeg loudnorm. Citations: `cloud_engines/bookend_engine/tts.py:150-206`.
- `probe_audio_duration()` uses ffprobe. Citations: `cloud_engines/bookend_engine/tts.py:209-225`.
- `generate_word_card_segment()` uses FFmpeg with image + optional TTS + `anullsrc` silence bed. Citations: `cloud_engines/bookend_engine/word_card.py:263-343`.
- `probe_media()`, `re_encode_assembled_video()`, and `concatenate_segments()` are local subprocess wrappers. Citations: `cloud_engines/bookend_engine/ffmpeg_builder.py:6-57`, `cloud_engines/bookend_engine/ffmpeg_builder.py:60-130`.

#### Palette/background extraction

Color extraction prefers the first scene image under the word’s `images/` tree, otherwise samples a video frame via FFmpeg. Citations: `cloud_engines/bookend_engine/color.py:9-36`, `cloud_engines/bookend_engine/color.py:39-73`, `cloud_engines/bookend_engine/color.py:99-129`, `cloud_engines/bookend_engine/color.py:224-250`.

### 8.3 Metadata capture

Bookend metadata is less structured than image/video/assembly. The engine builds a `BookendGenerationMeta` model with:

- context
- inputs: `assembly_version`, `settings_used`
- reproducibility: FFmpeg version, ElevenLabs model
- `tts` section: characters used, voice/model IDs, duration, output filename, language codes
- `visual` section: resolved text color, source, font, translation/phonetic flags, gradient settings
- outputs: total/final durations, intro/outro durations, assembled duration, resolution, file size

Citations: `cloud_engines/bookend_engine/models.py:18-31`, `cloud_engines/bookend_engine/engine.py:46-62`, `cloud_engines/bookend_engine/engine.py:119-127`, `cloud_engines/bookend_engine/engine.py:159-174`, `cloud_engines/bookend_engine/engine.py:250-259`, `cloud_engines/bookend_engine/engine.py:297-305`.

### 8.4 Current observability gap

The bookend engine tree has **no** `pipeline_events` helper usage. Negative grep over `cloud_engines/bookend_engine` returned no matches.

### 8.5 Payload identity

Bookend payload metadata carries only `word`, `language`, `translation`, `assembly_version`, and `timestamp`. Citations: `src/pipeline.py:782-812`, `cloud_engines/bookend_engine/models.py:61-73`.

## 9. Exact current-state verdict on Stage 2 instrumentation readiness

### 9.1 What is already instrumentable without schema changes

The following code paths already have enough identity and helper access to produce full `pipeline_events` rows now:

- production concept-engine LLM calls
- worker/service Suno submit and bake-in probe paths

Citations: `cloud_engines/concept_engine/models.py:100-116`, `cloud_engines/concept_engine/engine.py:82-90`, `src/suno.py:157-256`, `src/services/suno_bakein.py:353-374`.

### 9.2 What is blocked by missing identity plumbing

The following engines currently lack the `word_id/deck_id/user_id/job_id/attempt` tuple in their payload metadata, so even if wrappers were inserted immediately they could only emit unattributed rows or rely on ad-hoc reconstruction:

- image
- video
- assembly
- bookend

Citations: `src/pipeline.py:277-311`, `src/pipeline.py:365-378`, `src/pipeline.py:455-467`, `src/pipeline.py:740-779`, `src/pipeline.py:782-812`.

### 9.3 What is already covered by `generation-meta.json` but not by `pipeline_events`

The four target engines already capture useful local artifact metadata, but this capture is:

- file-local rather than queryable centrally
- not consistently correlated to `word_id/deck_id/user_id/job_id`
- uneven in request/response fidelity

Examples:

- image stores scene outputs and step summaries, plus `debug.json` with prompts/raw LLM response, but no central event rows. Citations: `cloud_engines/image_engine/engine.py:227-336`.
- video stores provider/model/seed/request ID in `generation-meta.json`, but not the actual provider request/response payloads. Citations: `cloud_engines/video_engine/engine.py:259-326`.
- assembly captures timing/LUFS/gap strategy details, but only as a file beside outputs. Citations: `cloud_engines/assembly_engine/engine.py:566-659`.
- bookend captures TTS and visual choices, but its error field is a string and the structure is looser than the other engines. Citations: `cloud_engines/bookend_engine/models.py:18-31`, `cloud_engines/bookend_engine/engine.py:297-305`.

## 10. Risks and edge conditions surfaced by the audit

### 10.1 Path divergence risk

The active live repo for this investigation is `d:/CODING/ResonanceTEST/orchestrator`, not a separate resonance-cloud root with the workflow docs referenced elsewhere. That path divergence should be reported explicitly in any Stage 2 planning or implementation notes.

### 10.2 Mixed observability model

Today the system is split between:

- centralized append-only `pipeline_events` for concept + Suno bake-in
- local `generation-meta.json` / `debug.json` / logs for image/video/assembly/bookend

This means any admin dashboard or audit workflow built only on `pipeline_events` would currently show an incomplete story for four of the six downstream engines.

### 10.3 Identity loss after concept

The feeder seeds identity into the manifest, but only `build_concept_payload()` consumes it. Every later stage drops the identity tuple when building engine payload metadata. Citations: `src/orchestration/feeder.py:665-682`, `src/pipeline.py:197-242`, `src/pipeline.py:277-311`, `src/pipeline.py:740-812`.

### 10.4 Bookend metadata shape mismatch

Bookend’s metadata model uses largely untyped `dict` fields and a string `error`, unlike the stronger structured models in video and assembly. Citations: `cloud_engines/bookend_engine/models.py:18-31`.

### 10.5 Dev-tree false confidence risk

The standalone concept dev tree is not a faithful proxy for production observability because it lacks the identity fields and event wrappers that production concept already uses. Citations: `engines/concept-engine/src/models.py:100-115`, `engines/concept-engine/src/caption.py:20-44`, `engines/concept-engine/src/lyrics.py:183-214`.

## 11. Final conclusion

The current Stage 2 instrumentation baseline is:

- **Implemented and live:** `pipeline_events` schema/storage, generic event writers, production concept-engine LLM events, Suno submit events, Suno bake-in audio probe events.
- **Not yet implemented in the four target engines:** image, video, assembly, bookend direct `pipeline_events` emission.
- **Main blocker to consistent rollout:** orchestrator payload builders for image/video/assembly/bookend do not currently propagate the identity tuple already seeded in the manifest.
- **Current fallback source of truth for those engines:** their per-run `generation-meta.json` files, plus image `debug.json`.

That is the exact current state of outbound-call mapping, routing, payload identity, and metadata capture in the live `orchestrator` repo at the time of this audit.

## 12. Addendum: implementation-scoping sections requested before Stage 2

### 12.1 Sync vs async pattern per engine

The dispatcher distinction matters here: in direct-dispatch mode, sync engine functions are run through `asyncio.to_thread(...)`, while coroutine engines are awaited directly. Citations: `src/cloud_dispatcher.py:210-217`.

- **Image engine**
  The engine entrypoint is synchronous (`def generate_images(...)`), storyboard generation is synchronous, OpenRouter calls use `httpx.Client`, Gemini rendering is synchronous, and the Wan provider is explicitly synchronous. Verdict: image instrumentation should be added at synchronous call sites; use the normal helper form inside `def`, not an `await`-based wrapper. Citations: `cloud_engines/image_engine/engine.py:46-47`, `cloud_engines/image_engine/storyboard.py:145-224`, `cloud_engines/image_engine/renderer.py:453-640`, `cloud_engines/image_engine/renderer.py:640-756`, `cloud_engines/image_engine/wan_provider.py:45-54`.
- **Video engine**
  The engine entrypoint is synchronous (`def generate_video(...)`), and all provider adapters expose synchronous `generate(...)` methods. Fal.ai polling is synchronous iterator/poll logic, and the RunPod / self-hosted adapters use blocking `httpx.Client` plus `time.sleep(...)` loops. Verdict: video instrumentation is a synchronous-wrap job at the adapter call boundaries. Citations: `cloud_engines/video_engine/engine.py:44-45`, `cloud_engines/video_engine/adapters/ltx.py:92-99`, `cloud_engines/video_engine/adapters/ltx_runpod.py:100-119`, `cloud_engines/video_engine/adapters/ltx_runpod.py:224-371`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:86-103`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:241-410`, `cloud_engines/video_engine/adapters/kling.py:72-87`, `cloud_engines/video_engine/adapters/ken_burns.py:82-97`.
- **Assembly engine**
  The entrypoint is synchronous (`def assemble(...)`) and all outbound work is local subprocess/file I/O. There is no `await` path anywhere inside the engine itself. Verdict: any assembly instrumentation is synchronous-only. Citations: `cloud_engines/assembly_engine/engine.py:48-59`, `cloud_engines/assembly_engine/ffmpeg_builder.py:21-70`, `cloud_engines/assembly_engine/ffmpeg_builder.py:107-188`.
- **Bookend engine**
  This is the only one of the four whose entrypoint is `async def wrap(...)`. Its external ElevenLabs call site is also `async def generate_pronunciation(...)` and uses `await client.post(...)`, but most of the rest of the engine is still synchronous subprocess work executed from inside that async function. Verdict: bookend is mixed: the TTS provider call runs under `async def`/`await`, while media/color/concat helpers are synchronous. The helper form still remains ordinary `with ... as ev:`; the difference is that the wrapped call body contains `await`. Citations: `cloud_engines/bookend_engine/engine.py:31-37`, `cloud_engines/bookend_engine/tts.py:30-147`, `cloud_engines/bookend_engine/word_card.py:263-343`, `cloud_engines/bookend_engine/ffmpeg_builder.py:6-130`.

### 12.2 Per-provider cost estimation verdict

The cost baseline is uneven. `src/cost_logger.py` is currently a no-op stub and all three generic pricing helpers return `0.0`; the Wan and Suno constants are also stubbed to `0.0`. Citations: `src/cost_logger.py:1-6`, `src/cost_logger.py:48-88`.

Per requested provider:

- **Wan via kie.ai**
  A placeholder constant exists as `KIE_WAN_COST_PER_IMAGE = 0.0`, and image rendering passes that through to `log_cost(...)`. There is no real pricing helper or provider-specific calculator. Stage 2 should treat Wan cost as a gap and leave `cost_usd = NULL` rather than writing misleading `0.0` rows. Citations: `src/cost_logger.py:73-76`, `cloud_engines/image_engine/renderer.py:714-733`.
- **Google Gemini image**
  A helper exists (`estimate_gemini_image_cost(model_id)`), but it is a stub returning `0.0`; image rendering already calls it via `log_cost(...)`. Stage 2 should also ship Gemini image provider rows with `cost_usd = NULL` unless a real pricing source is restored. Citations: `src/cost_logger.py:73-84`, `cloud_engines/image_engine/renderer.py:714-733`.
- **Fal.ai LTX fast**
  Real estimation exists in `cloud_engines/video_engine/cost.py` as a flat `$0.20` rate for `ltx_fast`; the Fal.ai LTX adapter already uses `estimate_cost(...)` when logging local cost events. Stage 2 can populate `cost_usd` for these rows. Citations: `cloud_engines/video_engine/cost.py:12-18`, `cloud_engines/video_engine/cost.py:22-56`, `cloud_engines/video_engine/adapters/ltx.py:202-218`.
- **Fal.ai LTX pro**
  Real estimation also exists and is currently modeled as flat `$0.20` for `ltx_pro`. Whether that number is commercially accurate is a separate pricing-governance question, but there is live non-stub code to populate `cost_usd`. Citations: `cloud_engines/video_engine/cost.py:12-18`, `cloud_engines/video_engine/cost.py:22-56`, `cloud_engines/video_engine/adapters/ltx.py:202-218`.
- **Fal.ai Kling**
  Real estimation exists with tiered formulas for `kling_standard` and `kling_pro`, and the adapter logs against the rounded provider duration (`"5"` or `"10"`). Stage 2 can populate `cost_usd` for Kling rows. Citations: `cloud_engines/video_engine/cost.py:17-18`, `cloud_engines/video_engine/cost.py:53-56`, `cloud_engines/video_engine/adapters/kling.py:62-70`, `cloud_engines/video_engine/adapters/kling.py:141-156`.
- **RunPod LTX**
  Real estimation exists in two places: the backend-sensitive branch in `video_engine/cost.py`, and `LTXRunPodAdapter.estimate_cost()`. The adapter itself does not currently call `log_cost(...)`, but Stage 2 has enough live math to populate `cost_usd` if instrumentation is added there. Citations: `cloud_engines/video_engine/cost.py:36-43`, `cloud_engines/video_engine/adapters/ltx_runpod.py:85-98`.
- **Self-hosted LTX worker**
  Real estimation exists both in `video_engine/cost.py` and in `LTXSelfHostedAdapter.estimate_cost()`, and the adapter already passes that estimate to `log_cost(...)`. Stage 2 can populate `cost_usd` here. Citations: `cloud_engines/video_engine/cost.py:36-43`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:71-84`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:374-391`.
- **ElevenLabs TTS**
  A helper exists (`estimate_elevenlabs_cost(characters)`), and bookend TTS already calls it via `log_cost(...)`, but the helper is a stub returning `0.0`. Stage 2 should treat ElevenLabs as another cost gap and emit `cost_usd = NULL` unless real pricing is reinstated first. Citations: `src/cost_logger.py:83-88`, `cloud_engines/bookend_engine/tts.py:12-13`, `cloud_engines/bookend_engine/tts.py:101-112`.

**Bottom line:** Stage 2 can populate `cost_usd` now for Fal.ai LTX, Fal.ai Kling, RunPod LTX, and self-hosted LTX. It should leave `cost_usd = NULL` for Wan, Gemini image, and ElevenLabs until the stubbed pricing layer is replaced. The same caveat continues to apply to Suno (`KIE_SUNO_COST_PER_SONG = 0.0`). Citations: `src/cost_logger.py:73-88`, `cloud_engines/video_engine/cost.py:22-56`.

### 12.3 Stage 1 deferrals — implementability

#### Deferral A: `fetch_existing_task()` instrumentation + `poll_resumed` breadcrumb

Current lines:

- helper definition: `src/suno.py:577-633`
- current baked-in re-poll call site: `src/services/suno_bakein.py:144-164`
- existing poll-summary helper for the main live poll loop: `src/suno.py:286-320`

Exact change needed:

- extend `fetch_existing_task(...)` to accept optional `word_id`, `deck_id`, `user_id`, `job_id` kwargs
- wrap the single GET request in a `logged_api_call(...)` or emit a direct `write_event_row(...)` around the helper outcome
- add a separate `write_event_row(stage="suno_bakein", sub_step="poll_resumed", ...)` breadcrumb at the production caller in `services/suno_bakein.py` before or immediately after the resumed re-poll branch

Structural complications:

- `fetch_existing_task()` is also used by `scripts/backfill_suno_storage.py`, so any identity-bearing instrumentation must remain optional and additive. Citations: `src/suno.py:577-633`, `src/services/suno_bakein.py:144-164`.
- the resumed-poll semantic is caller-specific, not helper-specific. Emitting `poll_resumed` from inside the generic helper would blur production bake-in with the backfill script. That breadcrumb is cleaner at the `services/suno_bakein.py` call site.

Verdict: **implementable with low-to-moderate plumbing.** The helper instrumentation itself is straightforward; the breadcrumb should be attached at the resumed-branch caller, not hidden in the generic helper.

#### Deferral B: identity threading at song-stage submit sites

Live repo verification:

- upstream worker direct submit site remains at `src/orchestration/upstream_worker.py:338-343`
- downstream worker inline submit site remains at `src/orchestration/downstream_worker.py:474-476`
- the earlier `generation.py:394` citation is stale in the live tree; the current UI/router path is `src/routers/generation.py:368-395`, and it calls `generate_song(...)`, not `submit_song(...)`

Identity in scope:

- **upstream worker**: `fresh` is in scope and is already used for `fresh["id"]`, `fresh["deck_id"]`, and state transitions; the same word record is the natural source for `word_id`, `user_id`, and `generation_job_id`. `attempt` is not obviously in scope there. Citations: `src/orchestration/upstream_worker.py:313-345`.
- **downstream worker**: `word` is in scope and is already used for `word["id"]`, `word["deck_id"]`, and `music_state`; this is likewise a shallow add for `word_id`, `user_id`, and `generation_job_id`. `attempt` is again not obviously present. Citations: `src/orchestration/downstream_worker.py:446-477`.
- **router/generation path**: `_maybe_trigger_suno()` only has `user_id` and `deck_id` from workspace naming plus `word_slug`; it does not have `word_id` or `job_id` in scope when it calls `generate_song(...)`. Citations: `src/routers/generation.py:361-395`.

Plumbing depth estimate:

- upstream worker: **shallow**
- downstream worker: **shallow**
- router path: **moderate**, because it needs either a DB lookup or a manifest/row bridge if full identity parity is required

Verdict: **ship for the two worker submit sites; re-baseline the stale generation-site citation to the current router path and treat it as a separate moderate-plumbing item.**

#### Deferral C: skipped-event emission at idempotency gates

Relevant gates in the live repo:

- `submit_song()` returns early when `suno_audio_url` already exists or when `suno_task_id` already exists. Citations: `src/suno.py:181-205`.
- `generate_song()` returns the persisted success result when `submit_song()` returns an empty task ID. Citations: `src/suno.py:357-396`.
- `bake_suno_into_word()` exits early when `suno_audio_url` is already present and `skip_suno_guard` is false. Citations: `src/services/suno_bakein.py:135-138`.
- upstream worker also short-circuits when `fresh.get("suno_task_id")` is already present. Citations: `src/orchestration/upstream_worker.py:315-323`.

Judgment:

- for the explicit Suno idempotency gates in `submit_song()` and `bake_suno_into_word()`, this is close to a **one-line addition per return path** using `write_event_row(status="skipped", ...)` plus a short reason in metadata
- for the upstream-worker `suno_task_id already set` branch, it is still small, but it is no longer purely a provider idempotency gate; it starts to broaden the semantic scope of the table into orchestration-state skips

Recommendation: **ship the skipped-event rows only for the explicit provider/idempotency gates in `src/suno.py` and `src/services/suno_bakein.py`; drop the broader orchestration-state skip expansion for now.** That keeps the table useful for explaining missing submit rows without turning it into a generic control-flow exhaust log.

### 12.4 Storage growth projection delta

The Stage 1 baseline was approximately **25 rows/word at ~4-5 KB average per row**, or roughly **100-125 MB per 1000 words**.

For Stage 2, the cleanest summary-granularity estimate is:

- **image**: `+1` storyboard/OpenRouter row plus `+N` render rows
- **video**: `+N` provider rows
- **assembly**: `+1` row if instrumented as a single engine-summary/local-processing row rather than per-FFmpeg call
- **bookend**: `+1` ElevenLabs row

Using the live auto-count map, default/long-form words with `clip_duration` 20s or 30s resolve to **3 scenes**, and short mode at 15s resolves to **2 scenes**. Citations: `cloud_engines/image_engine/models.py:550-570`, `src/pipeline.py:917-921`, `src/pipeline.py:960-986`.

That yields:

- **typical long-form (3 scenes)**: baseline `25` + image `4` + video `3` + assembly `1` + bookend `1` = **34 rows/word**
- **short-mode (2 scenes)**: baseline `25` + image `3` + video `2` + assembly `1` + bookend `1` = **32 rows/word**

At the Stage 1 row-size assumption of `~4-5 KB`, the revised long-form storage footprint is:

- **34 rows/word** → **136-170 KB per word**
- **per 1000 words** → **136-170 MB**

If Stage 2 instead instruments assembly/bookend at per-subprocess granularity, this estimate stops being trustworthy and could climb materially above that band. That is exactly why I recommend summary-granularity rows for those two engines.

Verdict on 90-day retention:

- **still reasonable at summary granularity**
- **should be revisited** if implementation expands to per-FFmpeg/per-ffprobe events, or if large prompt/response bodies force frequent offload usage beyond the current assumptions

Dev-tree parity has **no production storage impact** by itself; it is an audit/scoping concern, not an event-volume source.

### 12.5 Risk register for engine instrumentation

- **Image engine**
  The high-risk mistake is wrapping too high or too low in the render path. `render_all_scenes()` loops once per scene and can fall back from Wan to Gemini after a Wan failure, so a poorly placed wrapper can either collapse two providers into one row or emit duplicate rows on fallback/retry branches. Overhead itself is low because the whole sync engine already runs off the main event loop via `asyncio.to_thread(...)`. Citations: `src/cloud_dispatcher.py:210-217`, `cloud_engines/image_engine/renderer.py:520-529`, `cloud_engines/image_engine/renderer.py:675-733`.
- **Video engine**
  Each adapter contains long poll loops and, in some cases, retry-like poll error recovery. Wrapping inside the poll loop would explode row volume and misrepresent one generation as many calls. The correct granularity is one row per provider submission/poll lifecycle per scene, with an understanding that the orchestrator already calls the video engine once per scene. Citations: `src/pipeline.py:992-1006`, `cloud_engines/video_engine/adapters/ltx.py:183-221`, `cloud_engines/video_engine/adapters/ltx_runpod.py:224-371`, `cloud_engines/video_engine/adapters/ltx_selfhosted.py:241-401`.
- **Assembly engine**
  Assembly has no external network provider; its "outbound" work is a dense series of local FFmpeg/ffprobe subprocesses, some in loops over clips. Instrumenting every subprocess call would be noisy, storage-heavy, and could add measurable overhead in a stage that is already media-bound. It is also the engine where helper wrapping is least semantically aligned with the original `pipeline_events` purpose. Citations: `cloud_engines/assembly_engine/engine.py:82-116`, `cloud_engines/assembly_engine/engine.py:132-195`, `cloud_engines/assembly_engine/ffmpeg_builder.py:21-70`, `cloud_engines/assembly_engine/ffmpeg_builder.py:107-188`.
- **Bookend engine**
  Bookend mixes an async HTTP call with synchronous local subprocess work inside one `async def` function. The TTS call itself contains retries and skip/reuse shortcuts (`output exists`, `previous_tts_path` reuse), so careless wrapping could emit one row per retry or miss the important skipped/reused branches entirely. There is also a separate risk that the stage already blocks on local subprocess calls from within the async function; event wrapping will not fix that blocking, so implementation must not assume the stage is "fully async" just because `wrap()` is `async def`. Citations: `cloud_engines/bookend_engine/engine.py:31-37`, `cloud_engines/bookend_engine/tts.py:46-64`, `cloud_engines/bookend_engine/tts.py:91-147`, `cloud_engines/bookend_engine/word_card.py:263-343`.

### 12.6 Identity plumbing precursor verdict

I confirm the identity-plumbing pass is a **clean precursor** and should be landable as its own small diff **provided it includes both sides of the contract in the same change**:

- extend `build_image_payload()`, `build_video_payloads()`, `build_assembly_payload()`, and `build_bookend_payload()` in `src/pipeline.py`
- add optional `word_id`, `deck_id`, `user_id`, `job_id`, and `attempt` fields with defaults to the four engine metadata models

Why this is additive-safe:

- image metadata currently already has one optional field (`concept_version`), so adding more optional fields follows the same pattern. Citations: `cloud_engines/image_engine/models.py:217-235`.
- video metadata already includes optional defaults (`image_version`, `scene_number` with defaults), so additive optional identity fields are likewise safe. Citations: `cloud_engines/video_engine/models.py:95-115`.
- assembly metadata already has optional `song_version` / `video_version`, so optional identity fields fit the existing model shape. Citations: `cloud_engines/assembly_engine/models.py:120-138`.
- bookend metadata is the loosest of the four and is also additive-safe if the new identity fields are optional with defaults. Citations: `cloud_engines/bookend_engine/models.py:61-73`.

Why the precursor should be its own diff:

- today the payload builders drop identity after concept. Citations: `src/pipeline.py:277-311`, `src/pipeline.py:365-378`, `src/pipeline.py:455-467`, `src/pipeline.py:740-812`.
- today the typed payload models would silently discard those extra metadata keys if the models were not updated alongside the pipeline change, because the extra fields are not declared. The precursor diff therefore needs both the pipeline builders and the four metadata models together.
- the engines’ existing logic reads only the current metadata fields they care about (`concept_version`, `image_version`, `song_version`, `video_version`, `assembly_version`, etc.), so adding optional identity fields does not force downstream behavior changes.

Verdict: **yes — landable as a small, clean precursor diff across `src/pipeline.py` plus the four engine `models.py` files before any instrumentation diffs land.**

### 12.7 Adversarial self-review

- **Possible overengineering of assembly/bookend**
  A stricter reviewer could argue that `pipeline_events` should stay limited to true LLM/API traffic and that assembly/bookend local subprocesses belong only in `generation-meta.json`, not in a central observability table.
- **Potentially too eager on the identity precursor**
  Another reviewer might say the precursor is only necessary if the implementation truly wants per-engine central rows; if Stage 2 were narrowed back to concept/Suno parity work, this diff could be premature.
- **Cost recommendations may hide useful semantics**
  I recommend `cost_usd = NULL` for providers backed by stubbed helpers. A different reviewer might prefer explicit `0.0` for intentionally free providers and a separate metadata flag for "pricing unknown", to avoid conflating unknown with absent.
- **Storage estimate is only as good as row granularity**
  My revised projection assumes summary-granularity assembly/bookend rows and a typical scene count of 3. If implementation drifts toward per-subprocess rows or manual `image_count` overrides up to 8, the estimate could materially understate growth.
- **Bookend sync/async verdict is easy to misread**
  Saying bookend is "async" at the engine level can obscure the more important fact that most of its heavy work is still synchronous subprocess work. A reviewer could fairly ask for the implementation prompt to specify per-call-site wrapping, not merely per-engine wrapping.
- **Deferral C may be too chatty even in its reduced form**
  I recommended shipping skipped-event rows at explicit provider idempotency gates. A skeptical reviewer might argue that these rows add clutter and that missing submit rows are already inferable from persisted task/audio state.

These objections do not invalidate the scope recommendation, but they do argue for a tighter implementation prompt: summary-granularity for assembly/bookend, explicit `NULL` semantics for unknown cost, and exact call-site scoping instead of broad per-engine language.
