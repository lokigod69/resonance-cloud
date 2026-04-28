# Pipeline Refactor v4-final — Handoff Note

**Branch:** (to be pushed — code is on main in `orchestrator/` per the workspace convention)
**Design:** [`PIPELINE_REFACTOR_DESIGN_V4_FINAL.md`](PIPELINE_REFACTOR_DESIGN_V4_FINAL.md)
**Date:** 2026-04-18

---

## SQL to run

**File:** [`orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql`](orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql)

**What it does (one paragraph):** Adds 8 columns to the `words` table (`current_stage`, `stage_started_at`, `stage_attempts`, `total_stage_attempts`, `failed_stage`, `music_state`, `retry_requested`, `retry_requested_at`), plus two filtered indexes for active-stage polling and retry-flag lookup. It aborts with `RAISE EXCEPTION` if any row in `generation_jobs` or `words` is still `status='processing'` (operator must drain the queue first). A backfill sets sensible defaults for existing rows per §9.4: pending→`current_stage='pending', music_state='pending'`; complete-with-Suno→`current_stage='complete', music_state='baked'`; complete-without-Suno→`current_stage='complete', music_state='disabled'`; failed→`current_stage='failed', failed_stage='unknown', music_state='pending'`. CHECK constraints are added after the backfill so legacy values don't trip them. All additions are `IF NOT EXISTS` so the file is safe to re-run after a drain.

**How to run:** open Supabase SQL editor → paste entire file → execute. Expect either "Success" or a clear abort message listing the number of processing rows.

---

## Env vars to set in Railway

| Variable | Required | Default | Purpose |
|---|---|---|---|
| `POD_URL` | YES | — | GPU pod base URL (always-on pod per §10). Orchestrator fails fast if missing. |
| `POD_AUTH_TOKEN` | YES | — | Bearer token for the pod. Orchestrator fails fast if missing. |
| `SUPABASE_URL` | YES | — | (already set) |
| `SUPABASE_SERVICE_KEY` | YES | — | (already set; `SUPABASE_KEY` accepted as fallback) |
| `DOWNSTREAM_CONCURRENCY` | no | `2` | Number of downstream workers (assembly/bookend/upload lanes). |
| `VIDEO_CONCURRENCY` | no | `1` | Video dispatcher semaphore. Keep at 1 until §11 multi-pod lands. |
| `UPSTREAM_QUEUE_DEPTH` | no | `3` | §5.1 lookahead + 1. |
| `VIDEO_QUEUE_DEPTH` | no | `2` | §5.2 lookahead. |
| `POST_VIDEO_QUEUE_DEPTH` | no | `8` | §5.3 generous downstream buffer. |
| `FEEDER_POLL_INTERVAL` | no | `5` | Seconds between feeder cycles. |
| `FINALIZER_POLL_INTERVAL` | no | `30` | Seconds between job/deck finalization scans. |
| `METRICS_INTERVAL` | no | `60` | Queue depth + retry wait metric cadence (§13). |

**Also accepted** (backward-compat fallbacks): `GPU_WORKER_URL` / `GPU_WORKER_TOKEN` are read if `POD_URL` / `POD_AUTH_TOKEN` are unset. Remove the old `RUNPOD_*` pod-lifecycle vars from Railway — `pod_manager` no longer references them.

---

## Pre-deploy checklist

Run in this exact order. Steps 1-2 prevent mid-flight state from corrupting the migration; steps 3-6 perform the upgrade.

1. **Pause the queue**
   ```sql
   UPDATE system_settings SET queue_paused = true WHERE id = 1;
   ```
2. **Wait for drain** — poll until all `words` and `generation_jobs` leave `status='processing'`:
   ```sql
   SELECT
     (SELECT count(*) FROM words WHERE status='processing')       AS words_in_flight,
     (SELECT count(*) FROM generation_jobs WHERE status='processing') AS jobs_in_flight;
   ```
   Both must read 0 before proceeding. If jobs are stuck, use the existing 30-minute timeout (it resets to `approved`).
3. **Run the migration SQL** — paste [`orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql`](orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql) into Supabase SQL editor → execute.
4. **Set Railway env vars** — minimum `POD_URL` and `POD_AUTH_TOKEN`. Tune `DOWNSTREAM_CONCURRENCY` etc. if you want non-defaults.
5. **Deploy the branch** — Railway picks up the new orchestrator code and restarts.
6. **Unpause**
   ```sql
   UPDATE system_settings SET queue_paused = false WHERE id = 1;
   ```

---

## First test generation

Create a fresh deck with **one known-good word** (e.g., a basic noun that's worked reliably in the past), Suno enabled. Expected state transitions observable in Supabase:

```
words.current_stage:
  pending
  → enrichment          (during bootstrap, briefly)
  → pending             (after bootstrap writes manifest + slug)
  → images              (upstream_worker enters)
  → concept
  → song                (+ music_state: pending → submitted)
  → video_queued        (upstream_worker hands off)
  → video               (video_dispatcher claims)
  → post_video_queued   (video_dispatcher hands off)
  → suno_bake           (downstream_worker, music_state='submitted' branch)
  → uploading           (+ music_state: submitted → baked)
  → complete
```

And in `generation_jobs`: `approved → processing → complete`, `words_completed` increments, `completed_at` timestamps correctly.

**Correct log signatures to look for:**

- `feeder: queue paused` OR `feeder/source1: bootstrap complete for job=<id>`
- `upstream_worker: word=<id> -> video_queued`
- `video_dispatcher: word=<id> -> post_video_queued`
- `downstream_worker: word=<id> terminal=complete durations_ms={...}`
- `metrics: queue_depth upstream=N video=N post_video=N` every 60s
- `finalizer: job=<id> deck=<id> -> complete (completed=1 failed=0 total=1)`

Each line carries `word=<id> stage=<name>` prefix once contextvars are populated (`state.install_correlation_filter`).

---

## Known unverified behaviors

Cannot be tested locally without a live pod + Supabase. Watch for these on the first live run:

1. **`bake_suno_into_word(skip_suno_guard=True)` idempotency under crash-recovery-plus-replay.** Static read of `orchestrator/src/services/suno_bakein.py:140-163` confirms the re-poll short-circuit when `suno_task_id` is set and `suno_audio_url` is not. Design §6.4 verification note is satisfied. If the bake consumes Suno credits on a post-recovery re-run, check whether `suno_task_id` was cleared inadvertently.
2. **Pod HTTP contract.** The existing `LTXSelfHostedAdapter` consumes `(pod_url, token)` returned by `ensure_pod_ready()`. My thin-client `pod_manager` returns env vars directly. If the adapter assumed any particular URL shape from the old proxy (`https://<pod-id>-8080.proxy.runpod.net`), a bare `POD_URL` without that path structure may need adjustment. Recommend Sir Robert set `POD_URL` to the full base URL including scheme + port.
3. **Enrichment re-run determinism.** Design §8.3 labels enrichment "safely re-runnable" (not idempotent). Recovery from an `enrichment` crash will re-call the LLM and may produce slightly different translations/mnemonics. Acceptable per design, but watch for operator-visible diffs if a deck is restarted.
4. **`words.status` CHECK constraint compatibility.** Existing `words.status` CHECK is `IN ('pending','processing','complete','failed')`. My code only writes these four values (§17.1 maps `cancelled → failed` for display), so the constraint should hold. Verify with a test word that triggers each terminal state.
5. **Job `words_completed` bookkeeping under retries.** The downstream worker's `_bump_job_words_completed` bumps the latest processing job by deck. If a retry flips a terminal job back to `processing`, the counter continues from its previous value — not a bug, but operators should know: a 3-of-5 partial that retries will show 4/5, 5/5 on completion, not 1/5 → 2/5.
6. **Video-stage double-render under replica overlap.** Design §19.3 accepts: a word claimed for video, then orphaned by a killed replica, stays in `video` until the 30-minute safety net. Our tests exercise the claim path; the "pod render completes while orphan replica dies" path is not directly testable without live infra.
7. **`DISPATCH_MODE=direct` sync-wrap performance.** `cloud_dispatcher.call_engine_direct` now wraps sync engine calls in `asyncio.to_thread`. In-thread execution should be unchanged, but measure the first live job to confirm no regression on per-stage wall time.
8. **Supabase `words_completed` / `words_failed` concurrent bumps.** The downstream bump is a read-modify-write via `.update().eq(id,job_id).eq(status,'processing')`. Under very high throughput (multiple downstream workers finishing simultaneously) the counter could lose an increment. Finalizer's count-from-words pass is authoritative on terminal transition.

---

## File map (for the PR)

```
NEW     orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql
NEW     orchestrator/src/orchestration/__init__.py
NEW     orchestrator/src/orchestration/state.py
NEW     orchestrator/src/orchestration/retry.py
NEW     orchestrator/src/orchestration/recovery.py
NEW     orchestrator/src/orchestration/feeder.py
NEW     orchestrator/src/orchestration/upstream_worker.py
NEW     orchestrator/src/orchestration/video_dispatcher.py
NEW     orchestrator/src/orchestration/downstream_worker.py
NEW     orchestrator/src/orchestration/finalizer.py
NEW     orchestrator/src/orchestration/observability.py
NEW     orchestrator/tests/fake_supabase.py
NEW     orchestrator/tests/test_orchestration_state.py
NEW     orchestrator/tests/test_orchestration_retry.py
NEW     orchestrator/tests/test_orchestration_recovery.py
NEW     orchestrator/tests/test_orchestration_feeder.py
NEW     orchestrator/tests/test_orchestration_music_state.py
NEW     orchestrator/tests/test_orchestration_integration.py

REPLACE orchestrator/job_runner.py                           (rewrite: thin bootstrap + main loop)
REPLACE orchestrator/cloud_engines/video_engine/pod_manager.py  (thin env-var client)
REPLACE orchestrator/src/cost_logger.py                      (no-op stub)
REPLACE orchestrator/start_cloud.py                          (env-check + orchestrator wiring)

EDIT    orchestrator/src/cloud_dispatcher.py                 (asyncio.to_thread around sync engine calls)
```

No changes to engine code, Suno services, adapters, or frontend.

---

## Test results (local, pre-merge)

```
tests/test_orchestration_state.py        8/8 PASS
tests/test_orchestration_retry.py        5/5 PASS
tests/test_orchestration_recovery.py     8/8 PASS
tests/test_orchestration_feeder.py       9/9 PASS
tests/test_orchestration_music_state.py  3/3 PASS
tests/test_orchestration_integration.py  1/1 PASS  (3 concurrent words → video_queued)
                                       = 34/34 PASS
```

Pre-existing `tests/test_short_mode_durations.py` requires `httpx` at import time (unchanged behavior — environment issue, not a regression).
