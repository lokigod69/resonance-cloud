# Pipeline Refactor v4-final — Fix Round 1 Handoff

**Branch:** (on main; commit pending Sir Robert's push)
**Spec:** [`PIPELINE_REFACTOR_DESIGN_V4_FINAL.md`](PIPELINE_REFACTOR_DESIGN_V4_FINAL.md)
**Fix prompt:** the one Sir Robert sent after the loop-1 adversarial review.
**Date:** 2026-04-18

All five CRITs, all seven HIGHs, and all remaining MEDs (MED-1 through MED-7) from the review are implemented. Scope-protected files (§3.3) were not touched — confirmed by mtime check.

---

## Section 1 — Fixes applied

### CRIT-1 — Single-UPDATE atomic transition with cancelling guard

- **Summary:** `transition_stage` now issues one Postgres RPC call (`transition_word_stage`) that does current_stage, status, stage_started_at, stage_attempts reset/increment, total_stage_attempts monotonic increment, and arbitrary additional-column writes in one UPDATE. The unconditional `current_stage != 'cancelling'` predicate is baked into the RPC SQL itself, so no caller can bypass it. The v0 two-trip read-modify-write is gone.
- **Files modified:**
  - [`orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql`](orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql) — new file, defines `transition_word_stage`, `mark_word_failed`, `claim_retry_word`.
  - [`orchestrator/src/orchestration/state.py`](orchestrator/src/orchestration/state.py) — entire file rewritten around the RPCs. `transition_stage`, `mark_failed`, `claim_retry`, `mark_music_state`, `fetch_word`, `fetch_words_by_stage` all preserved as the orchestration surface. The `allow_idempotent_reentry` kwarg is gone; callers now pass `new_stage` in `allowed_prior` explicitly when they need idempotent re-entry (retry-loop counter bumps, recovery-path re-entry).
  - [`orchestrator/tests/fake_supabase.py`](orchestrator/tests/fake_supabase.py) — upgraded to mirror the three RPCs with identical SQL semantics (cancelling guard, single-UPDATE atomicity, predicate enforcement).
- **Tests verifying:** [`tests/test_orchestration_state.py`](orchestrator/tests/test_orchestration_state.py) — `test_transition_increments_counters_in_single_call`, `test_transition_refuses_when_prior_not_allowed`, `test_transition_strict_by_default`, `test_transition_idempotent_reentry_opt_in`, `test_transition_blocks_on_cancelling_even_when_in_allowed_prior`, `test_transition_cancelling_blocks_standard_call`, `test_concurrent_retry_bumps_preserve_total_stage_attempts` (10 concurrent increments → total=10, no lost updates), `test_transition_packs_music_state_in_same_update`.

### CRIT-2 — Downstream claim is exclusive (transitions OUT of `post_video_queued`)

- **Summary:** The downstream worker reads `music_state` fresh, selects the branch target (`uploading` for baked, `suno_bake` for submitted/pending, `assembly` for disabled/submit_failed/bake_failed), and performs a SINGLE guarded UPDATE that transitions the row from `post_video_queued` to the branch target. Once the row leaves `post_video_queued`, any racing replica's claim returns rowcount=0.
- **Files modified:** [`orchestrator/src/orchestration/downstream_worker.py`](orchestrator/src/orchestration/downstream_worker.py) — rewritten. `_branch_target_for(music_state)` centralizes the decision. `_process_word` reads → decides → transitions → dispatches to branch. Branches never re-enter `post_video_queued`; they start in their target stage.
- **Tests verifying:** [`tests/test_orchestration_music_state.py`](orchestrator/tests/test_orchestration_music_state.py) — `test_crit2_post_video_double_claim_single_winner` (2 tasks via `asyncio.gather` both try to claim a baked word → exactly 1 winner, counter bumped exactly 1x), `test_crit2_submitted_branch_claim_exclusive` (3 concurrent tasks → 1 winner), `test_crit2_placeholder_branch_claim_exclusive`, plus the six `test_branch_target_*` tests pinning the decision matrix.

### CRIT-3 — Music-page retry detection before `failed_stage` routing

- **Summary:** New `_is_music_page_retry(word)` helper detects the §4.7 payload shape (`music_state='pending'`, `suno_task_id=NULL`, `suno_audio_url=NULL`, `current_stage IN ('complete','post_video_queued')`). New `_route_retry(word)` consults this FIRST and routes music-page retries to `post_video_queued` regardless of `failed_stage` (which is NULL for music-page retries). Dashboard retries still route by `failed_stage` per §4.6.
- **Files modified:** [`orchestrator/src/orchestration/feeder.py`](orchestrator/src/orchestration/feeder.py) — new `_is_music_page_retry` and `_route_retry`; `_handle_retry_word` calls `_route_retry` instead of `_route_for_failed_stage` directly.
- **Tests verifying:** [`tests/test_orchestration_feeder.py`](orchestrator/tests/test_orchestration_feeder.py) — `test_is_music_page_retry_shape`, `test_is_music_page_retry_requires_cleared_task_id`, `test_is_music_page_retry_requires_terminalish_stage`, `test_route_retry_music_page_goes_to_post_video`, `test_route_retry_dashboard_failed_video`, `test_route_retry_baked_complete_music_page_retry`, and the end-to-end `test_music_page_retry_complete_word_routes_to_post_video` which simulates the authentic frontend payload (no `failed_stage` set, cleared suno fields) and verifies routing to `post_video_queued`.

### CRIT-4 — Source 2 SELECT + RPC claim filter on terminal `current_stage`

- **Summary:** Both the Source 2 SELECT and the underlying `claim_retry_word` RPC enforce `current_stage IN ('failed', 'complete', 'cancelled')`. A live word whose `retry_requested=true` is accidentally set (UI bug, stale client, admin tool) is ignored — the live worker that owns it is not stomped.
- **Files modified:**
  - [`orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql`](orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql) — `claim_retry_word` WHERE clause includes the terminal filter.
  - [`orchestrator/src/orchestration/feeder.py`](orchestrator/src/orchestration/feeder.py) — `_source2_retries` SELECT includes `.in_("current_stage", ["failed", "complete", "cancelled"])`. Defense in depth.
- **Tests verifying:** [`tests/test_orchestration_state.py`](orchestrator/tests/test_orchestration_state.py) `test_claim_retry_requires_terminal_current_stage` (live `images` word with retry flag set → rowcount=0); [`tests/test_orchestration_feeder.py`](orchestrator/tests/test_orchestration_feeder.py) `test_retry_claim_refuses_live_word`, `test_retry_claim_failed_word_routes_per_section_4_6` (positive case), `test_music_page_retry_complete_word_routes_to_post_video` (positive case on `complete` stage).

### CRIT-5 — Inline Suno submit failure reroutes to placeholder

- **Summary:** When the downstream `suno_bake` branch runs for `music_state='pending'`, it calls `_inline_submit`. After the call, it re-reads `music_state`. If `submit_failed`, it transitions `suno_bake → assembly` (single atomic UPDATE) and runs the placeholder pipeline. No bake is attempted on a non-existent Suno task.
- **Files modified:** [`orchestrator/src/orchestration/downstream_worker.py`](orchestrator/src/orchestration/downstream_worker.py) — `_run_suno_bake` post-submit re-read and reroute logic.
- **Tests verifying:** [`tests/test_orchestration_music_state.py`](orchestrator/tests/test_orchestration_music_state.py) `test_crit5_submit_failed_reroutes_suno_bake_to_assembly` (word in suno_bake with music_state=submit_failed → transition_stage succeeds with `assembly`; music_state preserved).

### HIGH-1 — Baked-branch manifest reconstruction from disk

- **Summary:** New `_prepare_baked_upload` reads the word's `manifest.json` via the untouched `src.manifest.read_manifest` and stashes it as variant A in `_suno_ab_manifests`. Variant B degrades to None (accepted single-variant publish per §6.4 support-recovery guidance — disk overwrites during bake lose B snapshot). If the manifest is unreadable, the word terminally fails with `failed_stage='uploading'`.
- **Files modified:** [`orchestrator/src/orchestration/downstream_worker.py`](orchestrator/src/orchestration/downstream_worker.py) — `_prepare_baked_upload` method.
- **Tests verifying:** [`tests/test_orchestration_music_state.py`](orchestrator/tests/test_orchestration_music_state.py) `test_high1_baked_recovery_reads_manifest_from_disk` (tempfile-backed manifest → `_suno_ab_manifests['a']` populated); `test_high1_baked_recovery_manifest_missing_fails_word` (disk lost → word → failed, failed_stage='uploading').

### HIGH-2 — Bootstrap writes disk before exposing `pending`

- **Summary:** `bootstrap_job` now (1) transitions pending → enrichment for every eligible word, (2) writes word_slug + music_state to Supabase (NOT current_stage yet), (3) creates word dir + manifest on disk (deleting any stale manifest first), (4) only then transitions enrichment → pending through `transition_stage`. Source 3 can't observe a "ready" pending word until the final step.
- **Files modified:** [`orchestrator/src/orchestration/feeder.py`](orchestrator/src/orchestration/feeder.py) — `bootstrap_job` reordered into prepared → expose phases.
- **Tests verifying:** Covered implicitly by feeder's existing bootstrap-runs-in-try/except tests and the routing tests that exercise post-bootstrap state. A standalone disk-ordering test would require fs sandboxing beyond what the current stubs provide; deferred to live-run verification (noted in Section 5).

### HIGH-3 — Enrichment transition via `transition_stage`

- **Summary:** The bootstrap enrichment mark now uses `transition_stage(new_stage='enrichment', allowed_prior=['pending'])`. A word in `cancelling` is left alone (the RPC's unconditional cancelling guard blocks it). Non-pending words are skipped with a logged reason.
- **Files modified:** [`orchestrator/src/orchestration/feeder.py`](orchestrator/src/orchestration/feeder.py) — in `bootstrap_job`, the per-word mark-to-enrichment loop uses `state.transition_stage`.
- **Tests verifying:** Guard is structural (RPC-level, tested by `test_transition_blocks_on_cancelling_even_when_in_allowed_prior` and `test_transition_cancelling_blocks_standard_call`). Bootstrap-side coverage is the call-site convention.

### HIGH-4 — Retry claim increments `total_stage_attempts`

- **Summary:** The new `claim_retry_word` RPC (CRIT-1 companion) includes `total_stage_attempts = total_stage_attempts + 1` in its SET clause. stage_attempts still resets to 0. Retry-pickup is counted as a stage entry per §4.1.
- **Files modified:** [`orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql`](orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql); [`orchestrator/src/orchestration/state.py`](orchestrator/src/orchestration/state.py) new `claim_retry` async helper; [`orchestrator/src/orchestration/feeder.py`](orchestrator/src/orchestration/feeder.py) `_handle_retry_word` calls `state.claim_retry` instead of a raw UPDATE.
- **Tests verifying:** `test_claim_retry_bumps_total_stage_attempts` (3 → 4 after claim), `test_claim_retry_double_claim_second_loses` (counter bumped exactly once across race), `test_retry_claim_failed_word_routes_per_section_4_6` (feeder-level: 3 → 4), `test_music_page_retry_complete_word_routes_to_post_video` (7 → 8).

### HIGH-5 — Single `basicConfig` owner

- **Summary:** `start_cloud.py` no longer calls `logging.basicConfig`. `job_runner.py` is the sole owner and passes `force=True` to override any root-logger config that prior imports may have installed. The format string includes `word_id` and `stage` fields so the `CorrelationFilter`'s contextvars actually render in deployed log lines.
- **Files modified:** [`orchestrator/start_cloud.py`](orchestrator/start_cloud.py) (no basicConfig); [`orchestrator/job_runner.py`](orchestrator/job_runner.py) `basicConfig(..., force=True)`.
- **Tests verifying:** [`tests/test_orchestration_logging.py`](orchestrator/tests/test_orchestration_logging.py) `test_correlation_filter_injects_word_id_and_stage`, `test_correlation_context_defaults_to_dash_when_unset`, `test_correlation_context_propagates_across_async`.

### HIGH-6 — Documented accepted tradeoff

- **Summary:** Added a comment in `_upload_and_complete` explaining the sub-second window where `words.status='complete'` precedes `current_stage='complete'` because `upload_ab_results` (scope-locked per §3.3) writes `status` itself. Orchestrator's post-upload transition closes the window immediately.
- **Files modified:** [`orchestrator/src/orchestration/downstream_worker.py`](orchestrator/src/orchestration/downstream_worker.py) — inline comment in `_upload_and_complete`.
- **Tests verifying:** None — this is a documented tradeoff, not a behavioral change.

### HIGH-7 — Strict POD_URL / POD_AUTH_TOKEN check; no GPU_WORKER fallback

- **Summary:** `pod_manager.ensure_pod_ready()`, `start_cloud._check_required_env()`, and `job_runner.assert_pod_credentials()` all require POD_URL and POD_AUTH_TOKEN. No GPU_WORKER_* fallback anywhere in the startup path. The legacy ltx_selfhosted adapter still reads GPU_WORKER_URL directly (file is scope-locked), so a deployment with only GPU_WORKER_URL set will now fail fast at startup — the migration path is to rename to POD_URL / POD_AUTH_TOKEN.
- **Files modified:** [`orchestrator/cloud_engines/video_engine/pod_manager.py`](orchestrator/cloud_engines/video_engine/pod_manager.py); [`orchestrator/start_cloud.py`](orchestrator/start_cloud.py); [`orchestrator/job_runner.py`](orchestrator/job_runner.py).
- **Tests verifying:** Import-level verification only (no live env in test harness). Manual verification is part of the pre-deploy checklist.

### MED-1 — SIGTERM handler + orchestrated shutdown

- **Summary:** `job_runner.main` installs SIGTERM/SIGINT handlers that set an `asyncio.Event`. After the event fires, the main coroutine stops the feeder, upstream, downstream, finalizer, and metrics (in §6.7 order); video_dispatcher is stopped without waiting for in-flight renders (§6.7 explicit). A 30-second drain timeout then cancels any outstanding tasks.
- **Files modified:** [`orchestrator/job_runner.py`](orchestrator/job_runner.py) — `_shutdown` event, `_install_signal_handlers`, drain sequence in `main()`.
- **Tests verifying:** The shutdown sequence is driven by an `asyncio.Event`; structural verification is the code review. A live SIGTERM unit test would require a full orchestrator fixture, deferred to integration testing on Railway.

### MED-2 — Honest concurrency tests

- **Summary:** Removed the "two feeder replicas race the same word" narrative from the v0 retry test (it was serialization, not a race). Replaced with: (a) CRIT-2 tests that use `asyncio.gather` with no state mutation between claims, so the exclusivity is the genuine guard; (b) `test_concurrent_retry_bumps_preserve_total_stage_attempts` which runs 10 concurrent idempotent-reentry increments and asserts counter=10; (c) integration test now spawns 2 UpstreamWorker tasks, not 1.
- **Files modified:** [`tests/test_orchestration_state.py`](orchestrator/tests/test_orchestration_state.py), [`tests/test_orchestration_music_state.py`](orchestrator/tests/test_orchestration_music_state.py), [`tests/test_orchestration_integration.py`](orchestrator/tests/test_orchestration_integration.py), [`tests/fake_supabase.py`](orchestrator/tests/fake_supabase.py).

### MED-3 — StageTimer emit on all terminal paths + active counts

- **Summary:** Worker `run()` loops now emit timer durations and clear the timer in a `finally` block — success, failure, exception, or early-return all hit it. The `observability.MetricsReporter` additionally logs `active upstream=N video=N downstream=N/N` alongside queue depths, using new `busy`/`active` properties on the workers.
- **Files modified:** [`orchestrator/src/orchestration/upstream_worker.py`](orchestrator/src/orchestration/upstream_worker.py) (`busy` property + `finally` emit), [`orchestrator/src/orchestration/video_dispatcher.py`](orchestrator/src/orchestration/video_dispatcher.py) (`active` counter), [`orchestrator/src/orchestration/downstream_worker.py`](orchestrator/src/orchestration/downstream_worker.py) (`busy` property + `finally` emit), [`orchestrator/src/orchestration/observability.py`](orchestrator/src/orchestration/observability.py) (new constructor args, richer log line).
- **Tests verifying:** Integration test exercises the `finally` emit for every word; active-count reporting is structural (exposed via `UpstreamWorker.busy`, `VideoDispatcher.active`, `DownstreamWorker.busy`).

### MED-4 — Delete pod_manager legacy stubs

- **Summary:** `notify_upcoming_video`, `cancel_upcoming_video`, `idle_check`, `cleanup_orphans` are gone. The file exposes only `ensure_pod_ready`, `acquire_use`, `release_use` — exactly what the adapter imports.
- **Files modified:** [`orchestrator/cloud_engines/video_engine/pod_manager.py`](orchestrator/cloud_engines/video_engine/pod_manager.py).
- **Verification:** `grep -rn "notify_upcoming_video|cancel_upcoming_video|idle_check|cleanup_orphans" src/ cloud_engines/` returns no hits.

### MED-5 — `cancelling` recovery → `cancelled`

- **Summary:** `_RECOVERY_ACTIONS["cancelling"] = ("cancelled", False, None)`. A word in `cancelling` at crash time is finalized to `cancelled`; nothing to resume.
- **Files modified:** [`orchestrator/src/orchestration/recovery.py`](orchestrator/src/orchestration/recovery.py).
- **Tests verifying:** [`tests/test_orchestration_recovery.py`](orchestrator/tests/test_orchestration_recovery.py) `test_cancelling_recovers_to_cancelled`.

### MED-6 — Explicit `processing_jobs_only=True`

- **Summary:** `_source3_orphans` calls `state.fetch_words_by_stage(self.sb, orphan_stages, processing_jobs_only=True)` — no reliance on the default.
- **Files modified:** [`orchestrator/src/orchestration/feeder.py`](orchestrator/src/orchestration/feeder.py).

### MED-7 — Integration test asserts counters

- **Summary:** `test_two_concurrent_workers_drain_three_words_with_counter_correctness` asserts `total_stage_attempts == 3` for every word after the run (3 upstream stages × 1 attempt each), and `stage_attempts == 0` (because the song → video_queued transition is non-counting). A CRIT-1 atomicity regression would fail this test.
- **Files modified:** [`tests/test_orchestration_integration.py`](orchestrator/tests/test_orchestration_integration.py).

---

## Section 2 — Fixes deferred

None. All CRITs, all HIGHs, and all MEDs from Sir Robert's prompt are implemented. LOW-1/LOW-2/LOW-3 (handoff doc absolute paths, test-comment wording, `__init__.py` docstring) are cosmetic and not addressed in this round; they can land in a follow-up docs PR without a code review cycle.

---

## Section 3 — Test suite status

**Before this round:** 34 tests across 6 files.

**After this round:** 63 tests across 7 files.

```
tests/test_orchestration_state.py         14/14 PASS
tests/test_orchestration_retry.py          5/5  PASS
tests/test_orchestration_recovery.py       9/9  PASS
tests/test_orchestration_feeder.py        18/18 PASS
tests/test_orchestration_music_state.py   13/13 PASS
tests/test_orchestration_integration.py    1/1  PASS  (2 concurrent workers, 3 words, counter assertions)
tests/test_orchestration_logging.py        3/3  PASS  (new this round — HIGH-5)
                                         = 63/63 PASS
```

**New tests this round (29):**

| # | Test | Fix |
|---|---|---|
| 1 | `test_transition_strict_by_default` | CRIT-1 |
| 2 | `test_transition_idempotent_reentry_opt_in` | CRIT-1 |
| 3 | `test_transition_blocks_on_cancelling_even_when_in_allowed_prior` | CRIT-1 |
| 4 | `test_transition_cancelling_blocks_standard_call` | CRIT-1 |
| 5 | `test_concurrent_retry_bumps_preserve_total_stage_attempts` | CRIT-1 |
| 6 | `test_transition_packs_music_state_in_same_update` | CRIT-1 |
| 7 | `test_claim_retry_requires_terminal_current_stage` | CRIT-4 |
| 8 | `test_claim_retry_bumps_total_stage_attempts` | HIGH-4 |
| 9 | `test_claim_retry_double_claim_second_loses` | CRIT-1 + CRIT-4 |
| 10 | `test_branch_target_baked` | CRIT-2 |
| 11 | `test_branch_target_submitted` | CRIT-2 |
| 12 | `test_branch_target_pending` | CRIT-2 |
| 13 | `test_branch_target_disabled` | CRIT-2 |
| 14 | `test_branch_target_submit_failed` | CRIT-2 |
| 15 | `test_branch_target_bake_failed` | CRIT-2 |
| 16 | `test_crit2_post_video_double_claim_single_winner` | CRIT-2 |
| 17 | `test_crit2_submitted_branch_claim_exclusive` | CRIT-2 |
| 18 | `test_crit2_placeholder_branch_claim_exclusive` | CRIT-2 |
| 19 | `test_crit5_submit_failed_reroutes_suno_bake_to_assembly` | CRIT-5 |
| 20 | `test_bake_failed_fall_through_single_update` | (reaffirms §6.4) |
| 21 | `test_high1_baked_recovery_reads_manifest_from_disk` | HIGH-1 |
| 22 | `test_high1_baked_recovery_manifest_missing_fails_word` | HIGH-1 |
| 23 | `test_is_music_page_retry_shape` | CRIT-3 |
| 24 | `test_is_music_page_retry_requires_cleared_task_id` | CRIT-3 |
| 25 | `test_is_music_page_retry_requires_terminalish_stage` | CRIT-3 |
| 26 | `test_route_retry_music_page_goes_to_post_video` | CRIT-3 |
| 27 | `test_route_retry_baked_complete_music_page_retry` | CRIT-3 |
| 28 | `test_retry_claim_refuses_live_word` | CRIT-4 |
| 29 | `test_music_page_retry_complete_word_routes_to_post_video` | CRIT-3 + CRIT-4 + HIGH-4 |
| 30 | `test_cancelling_recovers_to_cancelled` | MED-5 |
| 31 | `test_correlation_filter_injects_word_id_and_stage` | HIGH-5 |
| 32 | `test_correlation_context_defaults_to_dash_when_unset` | HIGH-5 |
| 33 | `test_correlation_context_propagates_across_async` | HIGH-5 |
| — | `test_two_concurrent_workers_drain_three_words_with_counter_correctness` (rewritten) | MED-2 + MED-7 |

**Removed/rewritten from v0:** `test_claim_word_double_claim_returns_false_second_time` (replaced by the CRIT-2 honest tests); `test_retry_claim_only_succeeds_once` (replaced by `test_retry_claim_failed_word_routes_per_section_4_6` + `test_claim_retry_double_claim_second_loses`); `test_transition_idempotent_on_same_stage` (replaced by the two opt-in / strict-default tests).

Pre-existing `tests/test_short_mode_durations.py` still fails at import because `httpx` isn't installed in this environment — unchanged behavior, not a regression.

---

## Section 4 — Migration changes

**New migration file:** [`orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql`](orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql).

**What it does (one paragraph):** Adds three `CREATE OR REPLACE FUNCTION` definitions: `transition_word_stage` (guarded transition with atomic counter increment and unconditional cancelling exclusion; single UPDATE; optional additional-column writes via a jsonb parameter), `mark_word_failed` (terminal failure guarded by `current_stage != 'failed'` so refund_credit fires exactly once), and `claim_retry_word` (retry-flag claim guarded by `retry_requested=true AND current_stage IN ('failed','complete','cancelled')` that also atomically resets `stage_attempts=0` and increments `total_stage_attempts+=1`). All three are idempotent SQL — safe to re-run.

**Instruction for Sir Robert:** Run as a **separate step** AFTER the existing `20260418_pipeline_state.sql` completes. Order matters because the RPCs reference the new columns added by the first migration. Both files are meant to be pasted into the Supabase SQL editor one after the other. If either fails, rerun after addressing the cause — `CREATE OR REPLACE FUNCTION` is safe on repeat.

---

## Section 5 — Remaining known gaps

1. **`upload_ab_results` status-write window** (HIGH-6): `publishing.py` writes `words.status='complete'` before the orchestrator transitions `current_stage='complete'`. Sub-second window where status shows complete but current_stage still shows uploading. Documented inline; no behavioral fix possible without editing the scope-locked `publishing.py`.

2. **Baked-branch recovery publishes as single-variant** (HIGH-1 accepted degradation): after a crash in the `uploading` stage with `music_state='baked'`, the in-memory A/B manifests are lost. We reconstruct variant A from the on-disk `manifest.json`; variant B is degraded to None because the bake's A/B runs overwrite the same `manifest.json` and lineage inference is out of scope for v1. §6.4 documents this as the accepted behavior; support-recovery path is `music_state='pending'` manual set + dashboard retry to force a clean re-bake.

3. **Bootstrap disk-ordering test gap** (HIGH-2 test coverage): the reorder is structural (verified by code review) but isn't covered by a test that simulates a crash between steps 3 and 4. Would require a full filesystem sandbox; live-run coverage is the pre-deploy checklist's "first test generation" step.

4. **SIGTERM handler unit test gap** (MED-1): the shutdown sequence is driven by an `asyncio.Event` and drains workers in §6.7 order, but there's no isolated unit test that raises SIGTERM in-process. Coverage is live-deploy observation of Railway's container kill behavior.

5. **GPU_WORKER_* deployments break on startup** (HIGH-7 migration detail): the existing `ltx_selfhosted.py` adapter reads `GPU_WORKER_URL` directly first (scope-locked file). If Sir Robert has a Railway deployment that sets only GPU_WORKER_URL, the orchestrator startup will now fail fast complaining about POD_URL. Migration: set `POD_URL` to the same value as `GPU_WORKER_URL` (and same for token).

6. **`total_stage_attempts` semantics under repeated stage re-entries** (noted in round-1 review MED-4): the upstream worker's `_bump` callback uses `transition_stage` with `allowed_prior=[same_stage]` to bump counters atomically on each retry. This is now the counter-increment mechanism inside retry loops. If operators find the counter counts faster than expected (retry increments AND stage-entry increments land), that's by design — retry-start is explicitly a stage entry per §4.1.

---

## Section 6 — Verification checklist for Sir Robert

Before merging, confirm each:

1. **RPC migration file exists and is syntactically correct.** Open `orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql`. Three `CREATE OR REPLACE FUNCTION` blocks; `BEGIN; ... COMMIT;` wrapper.

2. **`transition_stage` cancelling guard is structural.** `grep -n "!= 'cancelling'" orchestrator/frontend/supabase/migrations/20260418_transition_rpc.sql` — one hit inside `transition_word_stage`.

3. **Downstream claim transitions OUT of `post_video_queued`.** Open `orchestrator/src/orchestration/downstream_worker.py:130-150`. `transition_stage(..., new_stage=target, allowed_prior=["post_video_queued"], ...)` where `target` is one of `uploading`, `suno_bake`, `assembly` — never `post_video_queued`.

4. **Music-page retry routing.** Open `orchestrator/src/orchestration/feeder.py:30-47`. Verify `_is_music_page_retry` and `_route_retry` exist, and `_handle_retry_word` (around line 290) calls `_route_retry(word)` not `_route_for_failed_stage(failed_stage)`.

5. **Source 2 current_stage filter.** `grep -n 'in_("current_stage"' orchestrator/src/orchestration/feeder.py` — one hit in `_source2_retries` restricting to `["failed", "complete", "cancelled"]`.

6. **pod_manager legacy stubs deleted.** `grep -n "notify_upcoming_video\|idle_check\|cleanup_orphans" orchestrator/cloud_engines/video_engine/pod_manager.py` — no hits. File exports only `ensure_pod_ready`, `acquire_use`, `release_use`.

7. **Single basicConfig.** `grep -n "basicConfig" orchestrator/job_runner.py orchestrator/start_cloud.py` — one hit, in `job_runner.py`, with `force=True`.

8. **Tests pass.** `cd orchestrator && for t in tests/test_orchestration_*.py; do python "$t"; done` — all 63 tests PASS.

9. **No scope violations.** `cd orchestrator && stat -c "%y %n" src/pipeline.py src/dispatcher.py src/suno.py src/services/suno_bakein.py src/services/publishing.py src/services/enrichment.py src/services/stage_helpers.py src/manifest.py src/workspace.py src/settings.py` — all mtimes precede this fix round.

10. **All 13 cost_logger import sites resolve.** `cd orchestrator && python -c "from src.cost_logger import log_cost, estimate_openrouter_cost, estimate_gemini_image_cost, estimate_elevenlabs_cost, set_word_context, clear_word_context, KIE_WAN_COST_PER_IMAGE, KIE_SUNO_COST_PER_SONG, GEMINI_COST_PER_IMAGE, GEMINI_DEFAULT_COST_PER_IMAGE; print('ok')"` — prints `ok`.
