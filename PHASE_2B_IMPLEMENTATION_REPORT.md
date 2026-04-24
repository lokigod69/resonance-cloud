# Phase 2B Implementation Report

## Files Modified (15)

1. `cloud_engines/assembly_engine/engine.py` — emits one `assembly/summary` event per invocation and reuses a shared assembly-report builder for both generation metadata and event metadata.
2. `cloud_engines/bookend_engine/engine.py` — emits one `bookend/summary` event per invocation and threads Phase 2A identity into the summary row.
3. `cloud_engines/bookend_engine/tts.py` — wraps the outer ElevenLabs call in one `bookend/tts_call` event, including retries and cache-hit paths.
4. `cloud_engines/image_engine/engine.py` — passes `payload.metadata` identity into the pre-existing storyboard and render instrumentation already present on `main`.
5. `cloud_engines/video_engine/adapters/base.py` — extends every adapter `generate()` signature with optional identity kwargs.
6. `cloud_engines/video_engine/adapters/ken_burns.py` — wraps the local Ken Burns render in one `video/generate_ken_burns` event with `cost_usd=0.0`.
7. `cloud_engines/video_engine/adapters/kling.py` — wraps the Kling provider call in one `video/generate_kling` event and records provider request metadata.
8. `cloud_engines/video_engine/adapters/ltx.py` — wraps the Fal LTX provider call in one `video/generate_ltx_fal` event and records Fal request and cost data.
9. `cloud_engines/video_engine/adapters/ltx_runpod.py` — wraps the RunPod provider call in one `video/generate_ltx_runpod` event and records the RunPod job id as the request id.
10. `cloud_engines/video_engine/adapters/ltx_selfhosted.py` — wraps the self-hosted LTX provider call in one `video/generate_ltx_selfhosted` event and records the self-hosted job id as the request id.
11. `cloud_engines/video_engine/engine.py` — passes `payload.metadata` identity into each adapter call so provider-local wrappers have `word_id`, `deck_id`, `user_id`, `job_id`, and `attempt`.
12. `src/orchestration/downstream_worker.py` — threads identity into inline Suno submit calls for Deferral B.
13. `src/orchestration/upstream_worker.py` — threads identity into post-song Suno submit calls for Deferral B.
14. `src/services/suno_bakein.py` — emits the `poll_resumed` breadcrumb and the `already_baked` skipped row, and forwards identity into `fetch_existing_task()`.
15. `src/suno.py` — wraps `fetch_existing_task()`, emits submit-skip rows at the two provider gates, and carries identity through Suno submit and poll events.

## Identity Plumbing

Phase 2A already threaded `word_id`, `deck_id`, `user_id`, `job_id`, and `attempt` into engine payloads via `payload.metadata`.

- Image engine: `cloud_engines/image_engine/engine.py` now passes `payload.metadata.*` into `generate_storyboard()` and `render_all_scenes()`.
- Video engine: `cloud_engines/video_engine/engine.py` now passes `payload.metadata.*` into each adapter `generate()` call.
- Assembly engine: `cloud_engines/assembly_engine/engine.py` reads `payload.metadata.*` directly when writing the summary row.
- Bookend engine: `cloud_engines/bookend_engine/engine.py` and `tts.py` read `payload.metadata.*` directly when writing the TTS and summary rows.
- Suno deferrals: the two worker submit call sites pass `word_id`, `user_id`, and `job_id` from the live word row into `submit_song()`, while `deck_id` already comes from the call signature.

## Gemini Paths Are Not Instrumented

Gemini paths are not wrapped by Phase 2B instrumentation.

- The storyboard instrumentation is the OpenRouter LLM call only.
- The render instrumentation in `renderer.py` is on the provider-dispatch blocks for Flux, Turbo/FAL, and Wan.
- Gemini fallback code remains unwrapped, per the Phase 2B scope decision.

## Image Engine Clarification

Storyboard and renderer instrumentation were already present on `main` from commit `1914220`.

- `storyboard.py` already contains the `logged_llm_call(stage="images", sub_step="storyboard_llm")` wrapper.
- `renderer.py` already contains provider-level `logged_api_call(stage="images", sub_step="render_scene")` wrappers for Flux, Turbo/FAL, and Wan.
- `wan_provider.py` and `models.py` already expose provider metadata fields such as `provider_name`, `request_id`, `model_name`, `response_body`, and `cost_estimate_usd`.

The Phase 2B local delta in `image_engine/engine.py` is the identity handoff that connects the existing wrappers to Phase 2A correlation fields.

## Deferral A

Deferral A is implemented in two places.

- `src/suno.py`: `fetch_existing_task()` now accepts optional identity kwargs and wraps the single GET with `logged_api_call(stage="suno_bakein", sub_step="fetch_existing_task")`.
- `src/services/suno_bakein.py`: the existing-task recovery branch emits `write_event_row(stage="suno_bakein", sub_step="poll_resumed", status="success")` immediately before calling `fetch_existing_task()`.

## Deferral B

Deferral B is implemented at the two worker submit sites that previously omitted identity.

- `src/orchestration/upstream_worker.py` — the post-song submit call now passes `word_id=fresh["id"]`, `user_id=fresh["user_id"]`, and `job_id=fresh.get("generation_job_id")`.
- `src/orchestration/downstream_worker.py` — the inline submit call now passes `word_id=word["id"]`, `user_id=word["user_id"]`, and `job_id=word.get("generation_job_id")`.

This is the fix for the previously observed production gap where `suno_bakein/submit` landed with `word_id` and `user_id` as null.

## Deferral C

Deferral C emits skipped rows only at the provider gates, not at orchestration-state branches.

- `src/suno.py` `submit_song()`:
  - `stage="suno_bakein"`, `sub_step="submit"`, `status="skipped"`, `reason="already_complete"` when `suno_audio_url` is already present.
  - `stage="suno_bakein"`, `sub_step="submit"`, `status="skipped"`, `reason="task_already_submitted"` when `suno_task_id` is already present.
- `src/services/suno_bakein.py` `bake_suno_into_word()`:
  - `stage="suno_bakein"`, `sub_step="bake_suno"`, `status="skipped"`, `reason="already_baked"` when `suno_audio_url` is already present and the guard is not bypassed.

## Assembly Summary Row Shape

`cloud_engines/assembly_engine/engine.py` writes one `assembly/summary` row with:

- `stage="assembly"`
- `sub_step="summary"`
- `event_source="engine"`
- identity fields from `payload.metadata`
- `cost_usd=0.0`
- `latency_ms`
- `error_message` and `error_type` on failure
- metadata built from the shared assembly report plus:
  - `measured_lufs`
  - `target_lufs`
  - `gap_strategy`
  - `final_video_duration`
  - `output_files`
  - `file_size_bytes`
  - `video_clips_used`
  - `cost_estimation="none"`

## Bookend Row Shapes

`cloud_engines/bookend_engine/tts.py` writes one `bookend/tts_call` row with:

- `stage="bookend"`
- `sub_step="tts_call"`
- `event_source="engine"`
- identity fields
- `model_provider="elevenlabs"`
- `model_name=payload.settings.model_id`
- `user_prompt=word`
- `cost_usd=NULL`
- metadata including:
  - `voice_id`
  - `language_code`
  - `language_code_elevenlabs`
  - `cost_estimation="stub"`
  - `retry_count`

Its response records capture request body, response/request ids when available, retry counts, character count, duration, and cache-hit markers for reused output paths.

`cloud_engines/bookend_engine/engine.py` writes one `bookend/summary` row with:

- `stage="bookend"`
- `sub_step="summary"`
- `event_source="engine"`
- identity fields
- `cost_usd=0.0`
- `latency_ms`
- metadata including:
  - `voice_id`
  - `model_id`
  - `skip_outro`
  - `outro_mode`
  - `tts_characters_used`
  - `tts_duration_seconds`
  - `assembled_video_duration`
  - `intro_duration_seconds`
  - `outro_duration_seconds`
  - `total_duration_seconds`
  - `resolution`
  - `cost_estimation="none"`

## Video Adapter Wrap Pattern

Every video adapter now follows the same Phase 2B pattern.

- `base.py` adds `word_id`, `deck_id`, `user_id`, `job_id`, and `attempt` as optional keyword-only args to `generate()`.
- `video_engine/engine.py` passes `payload.metadata.*` into the adapter call.
- Each adapter wraps its outer provider call once with `logged_api_call(stage="video", sub_step=...)`.
- Each event includes at minimum:
  - `scene_number`
  - `video_mode`
  - `source_image_path`
  - identity fields
- Provider-specific request ids are captured inside the adapter where they are actually known:
  - Ken Burns: local render, no external provider request id, `cost_usd=0.0`
  - Fal LTX: Fal request id
  - RunPod LTX: RunPod job id
  - Self-hosted LTX: self-hosted job id
  - Kling: Kling request id

## Concept Dev-Tree Parity

Concept dev-tree parity was intentionally skipped per the earlier gate decision.

- No changes were made under `engines/concept-engine/`.
- Reason: the standalone dev tree cannot currently import `src.services.events`, which is a packaging problem outside Phase 2B scope.

## Known Gaps / Follow-Ups

1. Adversarial review is still pending; this report is a handoff document only.
2. The local suite currently lands at `218 passed, 2 failed`; the two failures remain the known pre-existing `tests/test_orchestration_music_state.py` workspace-path issues.
3. Local live image-engine execution is environment-sensitive because the local runtime is missing the `google` package used by the existing Gemini import path; this is an environment issue, not a Phase 2B code change.
4. The four image-engine wrapper files (`models.py`, `renderer.py`, `storyboard.py`, `wan_provider.py`) are not part of the local 15-file diff because their instrumentation already exists on `main` from `1914220`.
5. If Sir Robert wants a single adversarial-review packet, this report should be provided alongside the 15-file diff so the reviewer understands why image-engine wrapper files are not locally modified.
