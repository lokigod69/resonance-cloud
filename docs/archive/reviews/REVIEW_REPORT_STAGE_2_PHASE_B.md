# Review Report: Stage 2 Phase B Engine Instrumentation

## Overall verdict: FAIL

I did not recognize this diff as my own work, so I proceeded with the adversarial review. The 15-file modified scope is correct under `git diff --name-only`, the engines import cleanly, and the test suite result matches the expected baseline (`218 passed, 2 failed`). However, merge should halt: the `poll_resumed` breadcrumb does not include `task_id` in `metadata` as required, local/stub cost semantics are inconsistent in at least Ken Burns and Wan, and the raw diff has line-ending/trailing-whitespace churn that contradicts the handoff's "whitespace-cleaned" claim.

## Scope verification (section 3)

- 3.1 PASS: `git diff --name-only` shows exactly these 15 modified paths and no others: `cloud_engines/assembly_engine/engine.py`, `cloud_engines/bookend_engine/engine.py`, `cloud_engines/bookend_engine/tts.py`, `cloud_engines/image_engine/engine.py`, the five video adapter files plus `video_engine/engine.py`, both workers, `src/services/suno_bakein.py`, and `src/suno.py`.
- 3.2 PASS: none of the forbidden paths appear in `git diff --name-only`; `src/services/events.py`, `src/services/metadata.py`, `src/orchestration/feeder.py`, `src/pipeline.py`, concept-engine files, frontend files, migrations, and engine `models.py` are unchanged in the tracked diff.
- 3.3 PASS: `git log HEAD --oneline -n 10 -- cloud_engines/image_engine/` shows `1914220` as the latest image-engine commit. `git show 1914220 --stat` includes `cloud_engines/image_engine/renderer.py` and `storyboard.py`. Existing wrappers are present at `cloud_engines/image_engine/storyboard.py:107` and `cloud_engines/image_engine/renderer.py:556`, `:647`, `:734`.
- Scope note: `git status --short` shows unrelated untracked files, including an untracked frontend migration and `tests/test_stage2_phaseb_instrumentation.py`. They are not part of `git diff --name-only`, but should not be accidentally included in the Phase 2B commit.
- Handoff mismatch: raw `git diff --stat` reports `4569 insertions(+), 4109 deletions(-)`, while `git diff --ignore-space-change --stat` reports `734 insertions(+), 274 deletions(-)`. `git diff --check` fails with thousands of trailing-whitespace reports caused by line-ending churn.
- UNVERIFIABLE: `IMPLEMENTATION_PROMPT_STAGE_2_PHASE_B_UPDATED.md` was not present in the repo root; `Get-ChildItem -Recurse -File -Include *IMPLEMENTATION_PROMPT*` found no prompt file. I reviewed against the prompt text supplied in the user request.

## Fifteen-point checklist (section 4)

- 4.1 PASS: image engine passes identity from `payload.metadata` into `generate_storyboard()` at `cloud_engines/image_engine/engine.py:92-100` and `render_all_scenes()` at `cloud_engines/image_engine/engine.py:118-128`. Existing wrappers receive those kwargs via `storyboard.py:44-48`, `storyboard.py:107-115`, `renderer.py:941-945`, and `renderer.py:1006-1010`.
- 4.2 PASS: Gemini is not wrapped. `renderer.py` has `logged_api_call` only at `:556`, `:647`, `:734`; Gemini references are at `renderer.py:877`, `:894`, `:1038-1039`, and `_call_gemini_with_retries` starts at `:1081`.
- 4.3 PASS: renderer wrappers capture provider/request dynamically: Flux uses `flux_result.get(...)` at `renderer.py:585-591`, Fal at `renderer.py:672-678`, and Wan at `renderer.py:763-769`.
- 4.4 PASS: `video_engine/engine.py:93-102` passes `word_id`, `deck_id`, `user_id`, `job_id`, and `attempt` into `adapter.generate()`. Base signature is extended at `adapters/base.py:32-43`; adapters accept identity at `ken_burns.py:83-94`, `kling.py:74-85`, `ltx.py:94-105`, `ltx_runpod.py:99-110`, `ltx_selfhosted.py:87-98`.
- 4.5 PASS: each video adapter has exactly one outer `logged_api_call`: Ken Burns `ken_burns.py:104-116`, Kling `kling.py:97-105`, Fal LTX `ltx.py:118-126`, RunPod `ltx_runpod.py:120-128`, self-hosted `ltx_selfhosted.py:103-111`. Poll loops are inside those contexts.
- 4.6 PASS for the video checklist: Ken Burns uses `cost_usd=0.0` at `ken_burns.py:116` and `:221`; Kling uses computed `cost_usd` at `kling.py:169`, `:181`, `:206`; Fal LTX at `ltx.py:236`, `:249`, `:273`; RunPod at `ltx_runpod.py:377`; self-hosted at `ltx_selfhosted.py:391`, `:405`, `:424`. See section 5.4 for a cost-semantics failure on `metadata.cost_estimation`.
- 4.7 PASS: request IDs are captured where available: Ken Burns has no request ID and records only local metadata at `ken_burns.py:218-221`; Kling captures `handle.request_id` and final request ID at `kling.py:150-166`; Fal LTX at `ltx.py:217-233`; RunPod job ID at `ltx_runpod.py:226-227`; self-hosted job ID at `ltx_selfhosted.py:251-252`.
- 4.8 PASS: assembly emits one summary row via the only `write_event_row` in the file at `assembly_engine/engine.py:296-310`. No `logged_*` wrappers or per-FFmpeg event writes appear in that file.
- 4.9 PASS: assembly metadata includes the required fields at `assembly_engine/engine.py:711-730`: `measured_lufs`, `target_lufs`, `gap_strategy`, `final_video_duration`, `output_files`, `file_size_bytes`, `video_clips_used`, and `cost_estimation="none"`.
- 4.10 PASS: normal bookend execution emits one TTS row via `bookend_engine/tts.py:80-99` and one summary row via `bookend_engine/engine.py:318-358`. The retry loop is inside the one TTS wrapper at `tts.py:141-220`, with retry metadata updates at `tts.py:186-214`.
- 4.11 PASS: `fetch_existing_task()` has additive identity kwargs at `src/suno.py:604-611` and is wrapped at `src/suno.py:625-635`. The backfill caller remains compatible because it still calls `fetch_existing_task(task_id)` at `scripts/backfill_suno_storage.py:164`.
- 4.12 FAIL: `poll_resumed` is emitted before `fetch_existing_task()` at `src/services/suno_bakein.py:161-176` and uses `status="success"` at `:164`, but it does not include `task_id` in `metadata`; it only sets `request_id=existing_task_id` at `:172` and `metadata={"reason": "existing_task_id"}` at `:173`.
- 4.13 PASS: Deferral B identity is threaded into both live submit sites: upstream passes `word_id=fresh["id"]`, `user_id=fresh["user_id"]`, and `job_id=fresh.get("generation_job_id")` at `src/orchestration/upstream_worker.py:338-345`; downstream passes `word_id=word["id"]`, `user_id=word["user_id"]`, and `job_id=word.get("generation_job_id")` at `src/orchestration/downstream_worker.py:475-481`.
- 4.14 PASS: skipped rows appear only at the provider gates: `src/suno.py:200-211` for `already_complete`, `src/suno.py:217-229` for `task_already_submitted`, and `src/services/suno_bakein.py:138-149` for `already_baked`. `git grep` found no skipped event rows in the two worker files.
- 4.15 PASS: concept dev-tree parity was not implemented; `engines/concept-engine/` does not appear in `git diff --name-only`, matching the handoff explanation.

## Implementation quality review (section 5)

- 5.1 PASS: identity sources are correct. Image and video read `payload.metadata.*` at `image_engine/engine.py:96-100`, `:124-128`, and `video_engine/engine.py:98-102`; assembly and bookend summary rows read `payload.metadata.*` at `assembly_engine/engine.py:301-305` and `bookend_engine/engine.py:323-327`; TTS reads from `bookend_engine/engine.py:122-126`; Suno workers use fresh/word rows at the two submit call sites cited in 4.13.
- 5.2 PASS: retry/poll wrappers are outer-level. Bookend has one `logged_api_call` before cache checks and retries at `tts.py:80-99`; video poll loops are inside one wrapper in each adapter; Suno submit short-circuits before the submit wrapper at `src/suno.py:200-246`.
- 5.3 PASS: image records one storyboard event plus one render event per rendered scene; scene number is included in image renderer metadata at `renderer.py:566`, `:657`, `:744`. Video emits one adapter event per engine scene payload through `video_engine/engine.py:93-102`, and scene number is in each adapter metadata (`ken_burns.py:118`, `kling.py:107`, `ltx.py:133`, `ltx_runpod.py:135`, `ltx_selfhosted.py:118`).
- 5.4 FAIL: cost semantics are inconsistent with the prompt. Ken Burns is local and has `cost_usd=0.0` at `ken_burns.py:116` and `:221`, but no `metadata.cost_estimation="none"` appears anywhere in the video adapters. Wan is called out by the prompt as stubbed, but `renderer.py:768-769` writes `cost_usd=wan_result.get("cost_estimate_usd")`; `wan_provider.py:79-80`, `:125-126`, and `:177-178` populate `KIE_WAN_COST_PER_IMAGE` instead of `NULL` plus `metadata.cost_estimation="stub"`. ElevenLabs correctly uses `metadata.cost_estimation="stub"` at `bookend_engine/tts.py:96` and does not pass event `cost_usd`.
- 5.5 PASS: wrapper sites preserve the non-blocking event-write contract. `src/services/events.py:168-175` and `:297-303` catch write failures and log warnings; wrapper call sites do not catch event-write exceptions and re-raise them. Wrapped business exceptions still propagate normally, as intended.
- 5.6 PASS-WITH-NOTES: semantic diffs show wrapper/identity additions rather than prompt/model/retry/timeout changes. Examples: image identity-only diff at `image_engine/engine.py:92-128`, video identity-only diff at `video_engine/engine.py:93-102`, assembly summary/helper addition at `assembly_engine/engine.py:296-310` and `:694-733`, bookend wrapper/summary additions at `tts.py:80-220` and `engine.py:318-358`, Suno deferral additions at `src/suno.py:200-260` and `:604-653`. The line-ending/trailing-whitespace churn is not a behavior change but is not clean for merge.

## Runtime verification (section 6)

- Import check PASS:

```text
imports ok
```

- Pytest result MATCHES EXPECTED BASELINE:

```text
FAILED tests/test_orchestration_music_state.py::test_crit2_downstream_worker_process_word_claims_exclusively
FAILED tests/test_orchestration_music_state.py::test_crit5_inline_submit_failure_routes_through_placeholder_worker_path
======================= 2 failed, 218 passed in 54.82s ========================
```

The failure tail shows the known Windows workspace-path assertion, e.g. `AssertionError: assert WindowsPath('/tmp/d-1') == WindowsPath('C:/Users/micha/AppData/Local/Temp/...')`.

- Handoff consistency: the 15 tracked files match exactly, Deferral B code matches the handoff, Gemini-not-wrapped is verified, and the cost claims mostly match. Divergences: the raw diff is not whitespace-cleaned, and the prompt file named in the instructions is absent from the repo.

## Risk register (section 7)

- 7.1 Adapter signature breakage: LOW. `git grep ".generate("` found only `cloud_engines/video_engine/engine.py:93` for video adapter generation, and it passes identity at `:98-102`. Defaults remain additive.
- 7.2 Per-scene identity sharing: LOW. `Select-String` found no `self.word_id`, `self.deck_id`, `self.user_id`, `self.job_id`, or `self.attempt` assignments in video adapters, so identity is not cached on adapter instances.
- 7.3 Backfill compatibility: LOW. `scripts/backfill_suno_storage.py:164` still calls `fetch_existing_task(task_id)`, and the new kwargs in `src/suno.py:604-611` are optional.
- 7.4 Storage growth: MEDIUM / UNVERIFIABLE FROM LOCAL. At ~14-16 events per word and a rough 2-4 KB non-offloaded row size, expect ~30-60 KB per word. A 50 MB/week threshold is crossed around ~850-1,700 generated words/week, lower if response bodies are large before offload. Current production word rate is not available in this environment; review one live week of `pipeline_events` row and table size growth before pushing high-volume traffic through this.
- 7.5 Deferral B identity non-nullness: LOW. `words.id` and `words.user_id` are `NOT NULL` in `frontend/supabase/migrations/20260322210000_phase2a_tables.sql:33-35`. The code uses row keys directly, so missing values would fail loudly instead of silently writing nulls.
- Additional risk: raw line-ending churn makes future review/merge conflict resolution harder and causes `git diff --check` to fail. Normalize before merge.

## Findings requiring fix before merge

1. HIGH: `poll_resumed` missing `metadata.task_id`. `src/services/suno_bakein.py:161-176` emits the breadcrumb before repolling, but `src/services/suno_bakein.py:173` only records `metadata={"reason": "existing_task_id"}`. The prompt requires task ID in metadata; `request_id=existing_task_id` is useful but not equivalent to the required metadata field.
2. MEDIUM: local/stub cost metadata does not match the specified shape. Ken Burns lacks `metadata.cost_estimation="none"` despite local `cost_usd=0.0` (`cloud_engines/video_engine/adapters/ken_burns.py:104-121`, `:218-221`). Wan is treated as a zero-cost numeric provider rather than `cost_usd=NULL` plus `metadata.cost_estimation="stub"` (`cloud_engines/image_engine/renderer.py:768-769`; `cloud_engines/image_engine/wan_provider.py:79-80`, `:177-178`).
3. MEDIUM: diff hygiene is not clean. Raw `git diff --stat` is `4569 insertions(+), 4109 deletions(-)` while `git diff --ignore-space-change --stat` is `734 insertions(+), 274 deletions(-)`, and `git diff --check` reports trailing whitespace across the rewritten files. This contradicts the handoff's whitespace-cleaned claim and should be fixed before merge.

## Minor notes for Sir Robert

1. `IMPLEMENTATION_PROMPT_STAGE_2_PHASE_B_UPDATED.md` was not present in the repo, so I could not independently read that file; I reviewed against the prompt text supplied in the request.
2. There are unrelated untracked files in the working tree, including a migration and a test file. They are not part of the 15-file diff, but `git add .` would expand the scope accidentally.
3. RunPod and self-hosted adapters return a key named `fal_request_id` from metadata even though the provider is not Fal (`ltx_runpod.py:382`, `ltx_selfhosted.py:429`). This appears pre-existing/compatibility-shaped and not a Phase 2B blocker because event `request_id` is correct.

## Adversarial self-review

1. I may be too strict on `metadata.task_id` because `request_id=existing_task_id` gives equivalent provider correlation. The prompt explicitly required `task_id` in metadata, so I did not waive it.
2. I may be over-attributing Wan cost semantics to this Phase 2B diff because Wan instrumentation is already on `main` from `1914220`. The review prompt still asked me to verify cost semantics across engines, and it specifically named Wan as stubbed, so I reported it.
3. I did not run live generation or inspect production row sizes, by design. The storage-growth section is therefore a threshold estimate rather than a measured production projection.
4. The raw line-ending churn may be harmless on Windows if the repo tolerates CRLF, but `git diff --check` failing and raw stat inflation are still merge-quality problems for a review gate that expected a whitespace-cleaned diff.
