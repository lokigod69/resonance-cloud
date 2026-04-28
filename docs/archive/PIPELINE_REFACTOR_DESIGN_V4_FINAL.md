# Pipeline Refactor — Design v4-final

**Status:** FINAL. Ready for implementation.
**Date:** 2026-04-18
**Supersedes:** `PIPELINE_REFACTOR_DESIGN_V4.md`
**Based on:** Two loop-4 reviews (Codex, Anthropic) — both reviewers agreed no further design loops needed.
**Next step:** dispatch implementation.

---

## Changelog from v4

All changes trace to loop-4 review findings. Both reviewers converged on the same core issue (upstream overflow recovery) plus a cluster of mechanical fixes.

| # | Change | Reason |
|---|--------|--------|
| 1 | **Section 6.1 Source 3 locked**: orphan poll query explicit as `WHERE current_stage IN ('pending', 'video_queued', 'post_video_queued') AND job.status = 'processing'`. Source 3 runs first each cycle (highest priority). | Loop-4 critical: upstream overflow routing was ambiguous across three options in v4. Locked now. |
| 2 | **Section 8.3 upstream overflow language removed.** Recovery pushes up-to-capacity; overflow words stay at their current stage; Source 3 picks them up. No more "implementer chooses." | Same as #1. |
| 3 | **Section 6.1 retry ingestion uses conditional UPDATE** (`WHERE retry_requested = true`). | Prevents two replicas claiming the same retry-flagged word during Railway deploy overlap. |
| 4 | **Sections 6.2, 6.3, 6.4 transition UPDATEs include expected prior stage** in the WHERE predicate. | Defense-in-depth against out-of-order writes under replica overlap. |
| 5 | **Section 7.5 terminal-failed transition uses conditional UPDATE** (`WHERE current_stage != 'failed'`). `refund_credit` fires only on rowcount=1. | Refund idempotency under replica overlap. |
| 6 | **Section 17.2 music-page retry payload extended** to clear `suno_task_id` and `suno_audio_url` alongside setting `music_state = pending`. | Ensures `submit_song()` creates a clean new task; avoids ambiguity about which Suno task is current. |
| 7 | **Section 4.1 and 14.1 clarified**: `total_stage_attempts` increments **with** `stage_attempts` at stage-entry or retry-start, not on every UPDATE. | Codex caught that v4's 14.1 example literally read as a transition counter, not an attempt counter. |
| 8 | **Section 6.4 baked branch — support recovery note added**: if upload fails with file-not-found, support-level recovery is to set `music_state = pending` to force a re-bake. | Documentation polish. Handles the "lost disk, `baked` is a lie" edge case. |
| 9 | **Section 6.4 baked branch — implementation verification note added**: verify `bake_suno_into_word(skip_suno_guard=True)` idempotency (short-circuit on existing output vs. clean re-run). | Existing code is authoritative; note to implementer. |
| 10 | **Section 8.3 terminology**: "enrichment is idempotent" → "enrichment is safely re-runnable." | LLM output is non-deterministic; state is safely overwritable but output may differ. |
| 11 | **Section 19 removed.** Pod duplicate-dispatch behavior answered by Codex reading the LTX worker code: safe (serialized by async lock, distinct output paths per job_id). No probe needed. | Last open item closed. |
| 12 | **Section 20 renumbered to 19** (it's now the last section). |

---

## 1. What This Document Is

Authoritative target architecture. Section 2 decisions are locked. Sections 3–18 describe the architecture. Section 19 documents known v1 gaps (accepted deferrals). Implementation prompts reference this document as primary source of truth. **No open design questions remain.**

---

## 2. Locked Decisions

| # | Decision |
|---|----------|
| 2.1 | Cross-job pipelining: YES. Feeder is aggressive — starts next-job bootstrap as soon as upstream queue has capacity. |
| 2.2 | State machine shape: columns on `words`. |
| 2.3 | Deck order preserved under normal conditions, not strictly enforced. |
| 2.4 | Suno fallback: publish with silent placeholder; music-page retry is recovery path. |
| 2.5 | Video failure: one auto-retry on same pod, then fail. Two total attempts. Infrastructure crashes do not count against this budget. |
| 2.6 | Retry: automatic + manual. Per-stage budget 3 attempts; video is the exception at 2. Infrastructure crashes do not count against budgets. |
| 2.7 | Retry priority: new jobs beat retries. Within polling: orphans (Source 3) first, new jobs (Source 1) second, retries (Source 2) last. |
| 2.8 | Cost tracking: `cost_logger.py` stubbed to no-ops. Engines untouched. |
| 2.9 | Single pod, single orchestrator replica. |
| 2.10 | Lookahead depth: 2 prepared words. |
| 2.11 | Always-on pod. Orchestrator reads `POD_URL` and `POD_AUTH_TOKEN` from env vars. No dynamic lifecycle. |

---

## 3. The System Contract

### 3.1 What the orchestrator does

- Polls Supabase for approved jobs, retry-flagged words, and orphaned queued words.
- Runs per-job bootstrap with exception-safe revert.
- Maintains a pipelined flow of words through stages, keeping the GPU saturated.
- Tracks per-word state durably in Supabase via atomic single-UPDATE transitions guarded by expected-state predicates.
- Auto-retries transient failures per-stage (infrastructure crashes don't consume budget).
- Finalizes jobs and decks when all words reach terminal states.
- Protects against replica-overlap duplicate claims via conditional UPDATEs.

### 3.2 What the orchestrator does NOT do

- Does not own engine logic.
- Does not own Suno submit/poll/bake logic.
- Does not manage pod lifecycle (pod is always-on).
- Does not serve HTTP requests.
- Does not track costs.

### 3.3 Module layout

```
orchestrator/
├── job_runner.py                        ← rewritten: thin bootstrap + main loop
├── src/
│   ├── orchestration/                   ← NEW directory
│   │   ├── __init__.py
│   │   ├── feeder.py                    ← NEW: 3-source polling + bootstrap + retry + orphan
│   │   ├── upstream_worker.py           ← NEW: images → concept → song
│   │   ├── video_dispatcher.py          ← NEW: single-pod, pool-ready
│   │   ├── downstream_worker.py         ← NEW: branches on music_state
│   │   ├── finalizer.py                 ← NEW: job/deck status monitor
│   │   ├── state.py                     ← NEW: atomic guarded state transitions
│   │   ├── recovery.py                  ← NEW: startup recovery pass
│   │   └── retry.py                     ← NEW: budget + refund helper
│   ├── cloud_dispatcher.py              ← SMALL EDIT: asyncio.to_thread wraps ALL sync paths
│   ├── cost_logger.py                   ← REPLACED WITH NO-OP STUB
│   └── (everything else unchanged)
├── cloud_engines/video_engine/
│   ├── pod_manager.py                   ← MAJOR SIMPLIFICATION: thin client from env vars
│   └── (adapters unchanged)
├── start_cloud.py                       ← SMALL EDIT: recovery gate + orchestrator wiring
└── frontend/supabase/migrations/
    └── 20260418_pipeline_state.sql      ← NEW: column additions + safeguarded backfill
```

---

## 4. State Machine

### 4.1 Columns on the `words` table

| Column | Type | Purpose |
|--------|------|---------|
| `status` (existing) | text | Frontend-facing status. Mapped from `current_stage`, updated atomically. |
| `current_stage` | text | State machine value (see 4.2). |
| `stage_started_at` | timestamptz | When the word entered the current stage. |
| `stage_attempts` | integer NOT NULL default 0 | Attempts at current stage. Resets on stage transition (including crash-recovery revert). |
| `total_stage_attempts` | integer NOT NULL default 0 | Monotonic counter. **Increments only when `stage_attempts` increments** (i.e., at stage-entry and retry-start), NOT on every Supabase UPDATE. Diagnostic. |
| `failed_stage` | text nullable | Stage that caused terminal failure. |
| `music_state` | text NOT NULL default 'pending' | Suno track state (see 4.3). |
| `retry_requested` | boolean NOT NULL default false | Set by dashboard Retry or music-page retry. |
| `retry_requested_at` | timestamptz nullable | When retry was requested. For ordering. |

### 4.2 `current_stage` values

| Value | Category |
|-------|----------|
| `pending` | queued |
| `enrichment` | active (job-scoped) |
| `images`, `concept`, `song` | active (upstream) |
| `video_queued` | queued |
| `video` | active |
| `post_video_queued` | queued |
| `assembly`, `bookend`, `suno_bake`, `uploading` | active (downstream) |
| `complete`, `failed` | terminal |
| `cancelling` | transient (v1: placeholder) |
| `cancelled` | terminal (v1: placeholder) |

### 4.3 `music_state` values

| Value | Meaning |
|-------|---------|
| `pending` | Two contexts: (a) initial state before song stage runs, (b) music-page retry requested. Both treated identically at downstream (re-submit Suno, proceed with submitted path). |
| `disabled` | Job opted out of Suno. |
| `submitted` | Suno task created; awaiting bake. |
| `baked` | Bake complete; final video has Suno audio. |
| `submit_failed` | Suno POST exhausted retries. Ship silent. |
| `bake_failed` | Poll/bake exhausted retries. Ship silent. |

### 4.4 Happy-path transitions

```
pending
  → [feeder claims job, runs bootstrap]
enrichment
  → images → concept → song
  (song stage sets music_state: pending → submitted or submit_failed)
  → video_queued → video
  (downstream branches on music_state — see 6.4)
  ├── baked:             → uploading
  ├── submitted/pending: → suno_bake → uploading
  └── disabled/submit_failed/bake_failed: → assembly → bookend → uploading
  → complete
```

### 4.5 Failure transitions

Any active stage can transition to `failed` after its auto-retry budget is exhausted. Infrastructure crashes do not consume budget (7.1).

### 4.6 Retry resume — routing table

| `failed_stage` | Action |
|----------------|--------|
| `images`, `concept`, `song` | Push to upstream queue. `current_stage = images`. |
| `video` | Push to video-ready queue. `current_stage = video_queued`. |
| `assembly`, `bookend`, `suno_bake`, `uploading` | Push to post-video queue. `current_stage = post_video_queued`. |
| `'unknown'` (migration backfill) | Push to upstream queue. `current_stage = images`. Start from scratch. |

On retry pickup, feeder writes atomically: `retry_requested = false`, `failed_stage = null`, `stage_attempts = 0`, `status = processing`, plus the routed `current_stage`. If parent job is terminal (`complete`, `failed`, `partial`), feeder flips it back to `processing`.

### 4.7 Music-page retry flow

Frontend writes: `music_state = pending`, `retry_requested = true`, `retry_requested_at = now()`, `suno_task_id = NULL`, `suno_audio_url = NULL`. The task ID and audio URL are cleared so the downstream worker's inline `submit_song()` creates a clean new task without confusion about which Suno task is authoritative.

Feeder picks up, transitions `current_stage = post_video_queued`, pushes to post-video queue. Downstream handles per 6.4.

---

## 5. Queues

Three in-process asyncio queues. Not durable — Supabase is source of truth. Recovery reconstructs up to queue capacity; overflow handled by Source 3 polling.

### 5.1 Upstream queue

`asyncio.Queue(maxsize=3)` (lookahead + 1). Natural back-pressure via blocking `put()`.

### 5.2 Video-ready queue

`asyncio.Queue(maxsize=2)` (lookahead). Natural back-pressure.

### 5.3 Post-video queue

`asyncio.Queue(maxsize=8)`. Generous — downstream can lag.

---

## 6. Workers

All workers run on one asyncio event loop. All sync I/O wraps in `asyncio.to_thread(...)` at its single call point.

### 6.1 Job feeder

Single instance. Polls Supabase every 5s for **three sources, processed in priority order each cycle:**

**Source 3 (highest priority — orphan recovery):**
```
SELECT * FROM words
WHERE current_stage IN ('pending', 'video_queued', 'post_video_queued')
  AND job_id IN (SELECT id FROM generation_jobs WHERE status = 'processing')
```
For each word: push to the matching in-memory queue (`pending` → upstream queue, `video_queued` → video-ready queue, `post_video_queued` → post-video queue). `put()` blocks naturally when queue full; remaining orphans are picked up on the next poll cycle. No state transition — the word stays in its current stage; the worker that pulls it handles the transition via atomic conditional UPDATE.

Source 3 runs first each cycle because mid-pipeline work should be flushed before taking on new work.

**Source 1 (new jobs):**
```
SELECT * FROM generation_jobs WHERE status = 'approved'
ORDER BY priority DESC, created_at ASC
```
For each new job — **per-job bootstrap**:
1. Conditional claim: `UPDATE generation_jobs SET status='processing' WHERE id=$1 AND status='approved'`. Rowcount=0 → another replica got it, skip.
2. Same-deck lock check: if any other `generation_jobs` row with `status='processing'` exists for same `deck_id`, revert this job's status to `approved` and skip.
3. **Inside try/except**:
   - Create/locate workspace, merge settings, write `settings-defaults.json`.
   - Load word records.
   - Batch enrichment (single LLM call).
   - Write enrichment results to words.
   - Write per-word manifests, slugs, initial `current_stage = pending`.
   - Check `system_settings.queue_paused`.
   - Push words to upstream queue in deck order.
4. **On any exception in step 3**: `UPDATE generation_jobs SET status='approved', error_message='<exc>' WHERE id=$1 AND status='processing'`. Re-raise.

Aggressive cross-job: as soon as the current job's words are all pushed, feeder proceeds to the next approved job's bootstrap.

**Source 2 (retries — lowest priority):**
```
SELECT * FROM words
WHERE retry_requested = true
ORDER BY retry_requested_at ASC
```
For each retry-flagged word:
1. Apply routing from 4.6.
2. Conditional claim UPDATE:
   ```
   UPDATE words
   SET retry_requested = false, failed_stage = null, stage_attempts = 0,
       status = 'processing', current_stage = <routed>
   WHERE id = $1 AND retry_requested = true
   ```
   Rowcount=0 → another replica claimed; skip.
3. If parent job is in terminal state (`complete`, `failed`, `partial`), flip to `processing`.
4. Push to queue determined by routing.

Source 1 drains fully before Source 2 each cycle (hard drain per 2.7).

**Same-deck lock scope**: applies to Source 1 only. Retry words (Source 2) and orphans (Source 3) never trigger the block.

### 6.2 Upstream worker

Single instance. Pulls from upstream queue. For each word:

1. Re-read Supabase row.
2. For each upstream stage in order (`images`, `concept`, `song`):
   - **Atomic conditional transition**:
     ```
     UPDATE words
     SET current_stage = <stage>, status = 'processing',
         stage_started_at = now(), stage_attempts = 0,
         total_stage_attempts = total_stage_attempts + 1
     WHERE id = $1 AND current_stage IN (<expected_prior>, <stage>)
       AND current_stage != 'cancelling'
     ```
     The `IN (<expected_prior>, <stage>)` allows idempotent re-entry (e.g., crash recovery revert leaves word in same stage). Rowcount=0 → word cancelled or in unexpected state; transition to `cancelled` if applicable, or log and skip.
   - Call `get_incomplete_stages` on the word's disk manifest; if this stage's artifact already exists, skip the work (standard resume behavior).
   - Call `run_stage()` via `cloud_dispatcher.call_engine_direct` (wrapped in `asyncio.to_thread`).
   - Per-retry-attempt: increment `stage_attempts` AND `total_stage_attempts` together. Auto-retry budget = 3. On exhaustion: terminal `failed` (7.5 pattern).
3. Song stage specifics: create silent placeholder (wrapped in `to_thread`). If Suno enabled:
   - If `suno_task_id` already set (crash-recovery idempotency): set `music_state = submitted`, skip submit.
   - Else: call `submit_song()`. Success → `music_state = submitted`. Auto-retry exhaustion → `music_state = submit_failed`.
4. Atomic transition `current_stage = video_queued`. Push to video-ready queue.

### 6.3 Video dispatcher

Single instance. Holds `asyncio.Semaphore(1)`. For each word from video-ready queue:

1. Acquire video slot.
2. **Atomic conditional claim** (replica overlap + cancel check):
   ```
   UPDATE words
   SET current_stage = 'video', status = 'processing',
       stage_started_at = now(), stage_attempts = 0,
       total_stage_attempts = total_stage_attempts + 1
   WHERE id = $1 AND current_stage = 'video_queued'
   RETURNING id;
   ```
   Rowcount=0 → another replica claimed, OR word was cancelled. Release semaphore, move on.
3. Call `run_stage('video', ...)` via existing adapter.
4. On success: atomic transition to `post_video_queued`. Push to post-video queue.
5. On failure: one auto-retry (total 2 per 2.5). On exhaustion: terminal `failed` (7.5 pattern).
6. Release slot.

### 6.4 Downstream worker

Pool of 2 (env-configurable). Each worker pulls from post-video queue. For each word:

1. Re-read Supabase row. Read `music_state` and `current_stage`.
2. **Atomic claim** (replica overlap + cancel check):
   ```
   UPDATE words
   SET status = 'processing'
   WHERE id = $1 AND current_stage = 'post_video_queued'
   RETURNING id;
   ```
   Rowcount=0 → claimed elsewhere, cancelled, or in unexpected state; skip.
3. **Branch on `music_state`:**

   | `music_state` | Action |
   |---------------|--------|
   | **`baked`** | Bake already completed in a prior run (recovery from `uploading`, or retry at `failed_stage = uploading`). Atomic transition `current_stage = uploading`. Skip suno_bake, assembly, bookend. Go directly to upload. |
   | `submitted` or `pending` | If `pending`: call `submit_song()` inline, set `music_state = submitted`. Atomic transition `current_stage = suno_bake`. Call `bake_suno_into_word(..., skip_suno_guard=True)`. `skip_suno_guard=True` is mandatory. On success: atomic UPDATE `music_state = baked, current_stage = uploading`, proceed to upload. On auto-retry exhaustion: atomic UPDATE `music_state = bake_failed, current_stage = assembly`, run placeholder path. |
   | `disabled`, `submit_failed`, `bake_failed` | Atomic transition `current_stage = assembly`. Run existing A/B assembly loop. Atomic transition `current_stage = bookend`. Run existing A/B bookend loop. |

4. Atomic transition `current_stage = uploading`. Run `upload_ab_results()` (existing, unchanged).
5. Atomic transition `current_stage = complete`.

**Support recovery note (for the `baked` branch):** if upload fails with file-not-found (disk lost, workspace cleaned externally, etc.), the word transitions to `failed` with `failed_stage = uploading`. Support-level recovery is to set the word's `music_state = pending` manually before using the Retry button — this forces a re-bake on the retry pass. Not a runtime auto-recovery; a runbook note.

**Implementation verification note:** during implementation, verify that `bake_suno_into_word(skip_suno_guard=True)` is idempotent with respect to existing `suno_audio_url` and assembled A/B files on disk. If it short-circuits cleanly: safe. If it re-downloads and re-assembles: wasteful but still correct (existing code presumably overwrites cleanly). Existing code behavior is authoritative; no design-level assumption.

**A/B partial failure behavior (confirmed by loop-2 and loop-3 code traces, preserved):**
- A-stage failure: terminal word failure.
- B-stage failure: degraded success; word completes with A variant only; dashboard shows single video.
- Matches existing production behavior across both Suno path (`bake_suno_into_word`) and placeholder path.

### 6.5 Job finalizer

Single instance. Polls every 30s. For each `generation_jobs WHERE status = 'processing'`:

- Count word states for that `deck_id`.
- If all words terminal:
  - All `complete` → job `complete`.
  - All `failed`/`cancelled` → job `failed`.
  - Mixed → job `partial`.
- Update `decks.status`.

Finalizer is sole writer for `generation_jobs` out of `processing`. Feeder can flip a terminal job back to `processing` on retry pickup (6.1 Source 2).

### 6.6 Sync I/O handling

- Engine calls: single change in `cloud_dispatcher.call_engine_direct` wraps sync engine functions in `asyncio.to_thread`.
- `_create_song_placeholder` (sync subprocess): wrapped via same path.
- Supabase writes in orchestration: `state.py` wraps all writes in `asyncio.to_thread`.
- Pod HTTP (existing sync adapter): goes through `call_engine_direct`, wrapped.

### 6.7 Shutdown

On SIGTERM:
1. Feeder stops pulling.
2. Upstream worker finishes current stage, exits.
3. Video dispatcher does NOT wait for in-flight render. Word retains `current_stage = video`; recovery handles on restart.
4. Downstream worker finishes current stage, exits.
5. Finalizer exits on next iteration.

---

## 7. Retry

### 7.1 Automatic retry budgets

- **Video: 2 attempts** (1 initial + 1 auto-retry).
- **All other stages: 3 attempts.**

Budget tracked in `stage_attempts`, resets on stage transition. `total_stage_attempts` is monotonic and never resets.

**Crash-recovery carve-out (per 2.5 and 2.6):** when recovery reverts a word from an active stage to a queued state, `stage_attempts` resets to 0. Infrastructure crashes do not consume retry budget. `total_stage_attempts` still increments on each new attempt.

Backoff: constant 5s. Tunable.

### 7.2 Manual retry (dashboard)

User clicks "Retry" on a failed word. Frontend:
```
UPDATE words SET retry_requested = true, retry_requested_at = now() WHERE id = <id>;
```
Feeder applies 4.6 routing.

### 7.3 Music-page retry

Per 4.7. Frontend clears `suno_task_id` and `suno_audio_url`, sets `music_state = pending`, `retry_requested = true`, `retry_requested_at = now()`.

### 7.4 Priority: new jobs beat retries

Feeder source order per cycle: Source 3 (orphans) → Source 1 (new jobs) → Source 2 (retries). Source 1 drains fully before Source 2. Observability tracks max retry wait time; alert at 30 min.

### 7.5 Refund on terminal failure

`refund_credit` called exactly once per word. The terminal `failed` transition uses conditional UPDATE to guarantee idempotency under replica overlap:
```
UPDATE words
SET current_stage = 'failed', status = 'failed',
    failed_stage = $1, stage_started_at = now()
WHERE id = $2 AND current_stage != 'failed'
RETURNING id;
```
`refund_credit` fires only on rowcount=1. If rowcount=0, another replica already transitioned the word to failed and refunded.

No refund on `cancelled` (user intent).

### 7.6 Legacy `suno_retry` jobs

Preserved for backward compatibility. Retire legacy handler in a later cleanup PR.

---

## 8. Failure Handling

### 8.1 Stage failure (non-video)

Auto-retry per 7.1. Terminal `failed`, refund (7.5).

### 8.2 Video failure

Per 2.5: one auto-retry on same pod, then terminal `failed`, refund.

### 8.3 Crash recovery

**Startup gate:** `start_cloud.py` awaits `recovery.run_recovery_pass()` to completion before launching feeder, workers, dispatcher, or finalizer tasks.

| State at crash | Recovery action |
|----------------|----------------|
| `pending` | No action. |
| `enrichment` | Revert words to `pending`. Revert parent job from `processing` to `approved`. Feeder re-runs bootstrap (enrichment is safely re-runnable — output may differ slightly between runs due to LLM non-determinism, but state is safely overwritable). |
| `images`, `concept`, `song` | Revert to `pending`. Reset `stage_attempts = 0`. Push to upstream queue up to capacity. Overflow words stay at `pending`; feeder Source 3 picks them up. |
| `video_queued` | No state change. Push to video-ready queue up to capacity. Overflow handled by Source 3. |
| `video` | Revert to `video_queued`. Reset `stage_attempts = 0`. Push up to capacity. Accept that the pod may still be rendering the old job; its result is discarded. Bounded waste: one video render. |
| `post_video_queued` | No state change. Push to post-video queue up to capacity. Overflow handled by Source 3. |
| `assembly`, `bookend`, `suno_bake`, `uploading` | Revert to `post_video_queued`. Reset `stage_attempts = 0`. Push up to capacity. `get_incomplete_stages` handles sub-stage skipping at stage entry. |
| `complete`, `failed`, `cancelled` | No action. |

**Push-up-to-capacity rule:** recovery never blocks on queue puts. It pushes until each queue is full, then stops. Overflow words remain in their Supabase state; the feeder's Source 3 poll picks them up as queue capacity opens. This guarantees recovery completes in bounded time regardless of crash-time work volume.

Existing 30-minute stuck-job reset remains as a safety net.

### 8.4 Replica overlap

Railway zero-downtime deploys briefly run two replicas. Protections:
- Job claim: conditional UPDATE on `generation_jobs.status`.
- Retry claim: conditional UPDATE on `words.retry_requested = true` (6.1 Source 2).
- Video claim: conditional UPDATE on `words.current_stage = video_queued` (6.3).
- Downstream claim: conditional UPDATE on `words.current_stage = post_video_queued` (6.4).
- Stage transitions: include expected prior stage in WHERE predicate (6.2, 6.3, 6.4).
- Terminal transitions: include `current_stage != 'failed'` predicate (7.5).

These collectively close every meaningful duplicate-claim window. Documented worst case (19.3): a word claimed for video then orphaned by killed replica — stuck in `video` until the 30-minute safety net. Optional v2 mitigation: periodic stuck-state detector.

---

## 9. Supabase Migration

Single migration file: `20260418_pipeline_state.sql`.

### 9.1 Additions to `words`

- `current_stage` text with CHECK constraint enumerating 4.2 values.
- `stage_started_at` timestamptz.
- `stage_attempts` integer NOT NULL default 0.
- `total_stage_attempts` integer NOT NULL default 0.
- `failed_stage` text nullable.
- `music_state` text NOT NULL default 'pending' with CHECK constraint enumerating 4.3 values.
- `retry_requested` boolean NOT NULL default false.
- `retry_requested_at` timestamptz nullable.
- Index: `(current_stage)` filtered WHERE `current_stage NOT IN ('complete', 'failed', 'cancelled')`.
- Index: `(retry_requested, retry_requested_at)` filtered WHERE `retry_requested = true`.

### 9.2 No changes to `generation_jobs`

Existing columns sufficient.

### 9.3 Pre-migration safeguards

Migration aborts if any row has `status = 'processing'` in either `generation_jobs` or `words`. Operator must drain first.

### 9.4 Backfill rules

- `words.status = 'pending'` → `current_stage = 'pending'`, `music_state = 'pending'`.
- `words.status = 'complete'`:
  - If `suno_audio_url IS NOT NULL` → `current_stage = 'complete'`, `music_state = 'baked'`.
  - Else → `current_stage = 'complete'`, `music_state = 'disabled'`.
- `words.status = 'failed'` → `current_stage = 'failed'`, `failed_stage = 'unknown'`, `music_state = 'pending'`. Feeder routes `'unknown'` to upstream queue per 4.6.

### 9.5 Rollback

Drop added columns and indexes.

---

## 10. Pod Access

Per 2.11, pod is always-on.

- `pod_manager.py` becomes a thin client. Reads `POD_URL` and `POD_AUTH_TOKEN` from env vars at module init.
- All pre-warm, heartbeat, idle-check, sentinel, notify-upcoming code is deleted.
- Existing video adapter continues to call pod endpoints; only URL/token source changes.
- `feat/job-level-prewarm` branch abandoned.

---

## 11. Multi-Pod Seam

Not built in v1. Video dispatcher holds `Semaphore(1)`. v2 replaces with `PodPool`. Upstream, downstream, feeder, finalizer unchanged for multi-pod.

---

## 12. What Is NOT In v1

- No multi-pod.
- No multi-replica orchestrator.
- No durable queue.
- No new engine work.
- No Stripe.
- No iOS work.
- No engine code edits (cost_logger stubbed).
- No pod-side idempotency keys.
- No `video_dispatch_id` (accepted bounded waste on crash).
- No weighted-fairness retry scheduling.
- No user-facing cancel (states exist as schema placeholders).
- No automatic `suno_retry` job creation.
- No full async-supabase migration (sync wrapped in `to_thread`).
- No pod lifecycle management.
- No changes to Suno's 12-second song minimum (handled separately).
- No periodic stuck-state detector beyond existing 30-min reset.

---

## 13. Observability (Required, Ships With Refactor)

- **Correlation IDs**: every orchestration log line includes `word_id` and `current_stage` via `contextvars` + `logging.Filter`.
- **Queue depth metrics**: every 60s, log all queue sizes and worker active counts.
- **Stage-timing breakdown**: on every terminal transition, log per-stage durations and attempts from an in-memory `StageTimer`.
- **Retry wait time metric**: every 60s, log max age of `retry_requested_at`. Alert at 30 min.
- **Slow-stage alert**: warn if any word spends >5 min in `suno_bake`.

**StageTimer durability caveat:** in-memory only. Words recovered from crash lose pre-crash stage timings. Acceptable for v1.

Total: ~100–150 LOC in `state.py` and a logging adapter.

---

## 14. Cost Logger Stub

`src/cost_logger.py` replaced with no-op stub preserving all public signatures. Thirteen engine call-sites unchanged.

### 14.1 Atomic guarded state transitions

Every transition is a single UPDATE with an expected-state predicate:
```
UPDATE words
SET current_stage = <new>, status = <mapped>, stage_started_at = now(),
    stage_attempts = <reset or incremented>,
    total_stage_attempts = total_stage_attempts + <0 or 1>,
    <other fields as applicable>
WHERE id = $1
  AND current_stage IN (<allowed prior states>)
  AND current_stage != 'cancelling'
RETURNING id;
```

**`total_stage_attempts` increments only when `stage_attempts` increments** — i.e., at stage-entry (first attempt) or retry-start (within a stage). It does NOT increment on transitions to queued states (`video_queued`, `post_video_queued`, `post_video_queued`→`assembly` sub-flows within the same logical attempt). This preserves `total_stage_attempts` as an attempt counter, not a transition counter.

Rowcount=0 on a transition UPDATE means: word is cancelled (predicate failed on `current_stage != 'cancelling'`), or word is in an unexpected state (another replica acted, or corruption). Worker handles by transitioning to `cancelled` if applicable, else logs and skips.

This pattern replaces column-per-write and prevents inconsistent intermediate states observable by the dashboard.

---

## 15. Workspace Lifecycle

v1 preserves today's deferred-cleanup behavior. Same-deck lock applies to Source 1 only (6.1).

---

## 16. Module Responsibilities

| Module | Responsibility |
|--------|----------------|
| `feeder.py` | 3-source polling (orphans, new jobs, retries). Per-job bootstrap with try/except revert. Same-deck lock. Retry routing. Parent-job flip on retry. |
| `upstream_worker.py` | Images → concept → song. Suno submit idempotency. Writes `music_state`. `get_incomplete_stages` at stage entry. |
| `video_dispatcher.py` | Conditional claim. Dispatches video. One auto-retry. |
| `downstream_worker.py` | Branches on `music_state` (baked/submitted/pending/disabled/submit_failed/bake_failed). `skip_suno_guard=True`. Atomic transition on bake-failed fall-through. |
| `finalizer.py` | Transitions job/deck status when all words terminal. |
| `state.py` | Atomic guarded transitions with expected-state predicates. Wraps supabase-py in `to_thread`. |
| `retry.py` | Budget + refund helper. Refund via conditional terminal transition. |
| `recovery.py` | Startup pass per 8.3. Push-up-to-capacity. |

---

## 17. Dashboard / Frontend Contract

### 17.1 `status` mapping (atomic with `current_stage`)

| `current_stage` | `status` |
|-----------------|----------|
| `pending`, `enrichment` | `pending` |
| `images`, `concept`, `song`, `video_queued`, `video`, `post_video_queued`, `assembly`, `bookend`, `suno_bake`, `uploading` | `processing` |
| `complete` | `complete` |
| `failed` | `failed` |
| `cancelling` | `processing` |
| `cancelled` | `failed` (v1 shortcut) |

### 17.2 Dashboard changes required

- **Retry button**: visible when `status = 'failed' AND current_stage = 'failed'`. Writes `retry_requested = true`, `retry_requested_at = now()`.
- **Delete button**: enabled for `status IN ('pending', 'complete', 'failed')`. Disabled for `processing`.
- **Cancel button**: NOT in v1.
- **Progress display**: may optionally surface `current_stage`.
- **Music-page retry button**: payload writes `music_state = 'pending'`, `suno_task_id = NULL`, `suno_audio_url = NULL`, `retry_requested = true`, `retry_requested_at = now()`. All four fields in one UPDATE.

### 17.3 A/B partial-failure display

When A succeeds and B fails, word completes with single video, no A/B picker. Matches existing behavior.

---

## 18. Summary

v4-final closes all loop-4 findings. The orchestrator is fully specified:

- Three-source feeder with explicit priority (orphans > new > retries).
- Atomic guarded state transitions at every boundary.
- Replica-overlap safety via conditional UPDATEs on every claim point.
- Crash recovery with bounded time (push-up-to-capacity, overflow via Source 3).
- `music_state` branching including `baked` recovery path.
- Infrastructure crashes carved out of retry budgets.
- `refund_credit` guaranteed once per terminal failure.
- Music-page retry fully cleans Suno state.
- Observability locked as shipping requirement.
- Pod access simplified to env-var thin client (always-on pod).
- All engine code, Suno services, adapter code untouched.

---

## 19. Known V1 Gaps (Accepted Deferrals)

Three items deliberately not addressed in v1, documented here for transparency:

### 19.1 "Blocked" dashboard UX for queued-behind same-deck jobs

When same-deck lock skips a job, it stays `status = 'approved'`. Dashboard shows "queued" which is slightly misleading. v2 can add a `blocked` status with `blocked_reason` column. v1: feeder logs each skip for operator visibility.

### 19.2 Supabase connection pool sizing

Atomic single-UPDATE transitions cut write volume significantly versus column-per-write, but pipelined throughput is higher than serial baseline. Monitor Supabase connection pool and rate limits during rollout. Tune `supabase-py` client pool if needed. Not a blocker at single-pod scale.

### 19.3 30-minute stuck-state worst case on replica overlap

A word claimed for video then orphaned by a killed replica stays in `video` until the existing 30-minute safety net resets it. Acceptable worst case for v1. Optional v2: periodic stuck-state detector scanning `video` words with `stage_started_at` older than expected video duration.
