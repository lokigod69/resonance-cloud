# Investigation Report — Cross-Job Pod Visibility: Queue Pickup + Pending-Work Awareness

**Date:** 2026-04-17
**Scope:** Read-only follow-up to [INVESTIGATION_REPORT_POD_RELEASE_AT_VIDEO_EXIT.md](INVESTIGATION_REPORT_POD_RELEASE_AT_VIDEO_EXIT.md). Assumes the prior report's findings are correct.
**Target:** `main` post-merge of `fix/pod-manager-cleanup`.

---

## Q1 — How does the orchestrator discover new jobs?

**Answer:** Database polling (Supabase REST, not Realtime). One polling loop in `job_runner.main()` runs every `POLL_INTERVAL` seconds (default **30s**, env-configurable via `JOB_RUNNER_POLL_INTERVAL`). No webhooks, no Postgres LISTEN/NOTIFY, no Redis/RabbitMQ — just `SELECT ... ORDER BY priority DESC, created_at LIMIT 1` against `generation_jobs WHERE status = 'approved'`.

**Evidence:**

Poll interval definition: [orchestrator/job_runner.py:50](orchestrator/job_runner.py#L50)

```python
POLL_INTERVAL = int(os.getenv("JOB_RUNNER_POLL_INTERVAL", "30"))
```

Main loop: [orchestrator/job_runner.py:943-987](orchestrator/job_runner.py#L943-L987)

```python
while True:
    try:
        # Check system settings (queue_paused + auto_approve)
        settings_resp = sb.table("system_settings").select("queue_paused, auto_approve") \
            .eq("id", 1).single().execute()
        if settings_resp.data and settings_resp.data.get("queue_paused"):
            log.debug("Queue is paused")
            await asyncio.sleep(POLL_INTERVAL)
            continue

        # Auto-approve pending jobs if enabled
        if settings_resp.data and settings_resp.data.get("auto_approve"):
            approve_resp = sb.table("generation_jobs") \
                .update({"status": "approved"}) \
                .eq("status", "pending") \
                .execute()
            if approve_resp.data:
                log.info("Auto-approved %d pending job(s)", len(approve_resp.data))

        # Poll for next approved job
        job_resp = sb.table("generation_jobs") \
            .select("*") \
            .eq("status", "approved") \
            .order("priority", desc=True) \
            .order("created_at") \
            .limit(1) \
            .execute()

        if not job_resp.data:
            log.debug("No approved jobs")
            await asyncio.sleep(POLL_INTERVAL)
            continue

        job = job_resp.data[0]
        if job.get("job_type") == "suno_retry":
            await process_suno_retry_job(job)
        else:
            await process_job(job)
```

**Call chain** "word arrives → `process_job` runs":

1. Frontend inserts a row into `generation_jobs` with `status='pending'` (via Supabase REST from the client; not visible in this repo's orchestrator tree — frontend code not traced here).
2. `main()` loop wakes on its next tick (at most `POLL_INTERVAL` later, i.e., up to 30s delay).
3. If `auto_approve=true`, pending jobs are bulk-updated to `approved` ([job_runner.py:954-960](orchestrator/job_runner.py#L954-L960)).
4. Same loop iteration polls for the next `approved` job ([job_runner.py:962-974](orchestrator/job_runner.py#L962-L974)).
5. `process_job(job)` is awaited inline ([job_runner.py:976-980](orchestrator/job_runner.py#L976-L980)).

Orchestrator startup bootstraps this loop from [orchestrator/start_cloud.py:171-173](orchestrator/start_cloud.py#L171-L173):

```python
logger.info("Starting job runner polling loop...")
from job_runner import main as job_runner_main
await job_runner_main()
```

**INVESTIGATE FURTHER:** The frontend's actual insert pathway and whether `status='pending'` is always set on insert (vs. direct `approved`). I only see the orchestrator-side transitions.

---

## Q2 — Job queue state model

### Observable states

`generation_jobs.status` — **7 values**, from the CHECK constraint at [orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:61-62](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L61-L62):

```sql
status text not null default 'pending'
  check (status in ('pending', 'approved', 'processing', 'complete', 'partial', 'failed', 'rejected')),
```

`words.status` — **4 values**, at [phase2a_tables.sql:43-44](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L43-L44):

```sql
status text not null default 'pending'
  check (status in ('pending', 'processing', 'complete', 'failed')),
```

### State transitions (jobs)

| From | To | Where | File:line |
|---|---|---|---|
| (insert) | `pending` | Default on insert (frontend insert, implied) | phase2a_tables.sql:61-62 |
| `pending` | `approved` | Bulk update if `auto_approve=true` | [job_runner.py:955-958](orchestrator/job_runner.py#L955-L958) |
| `approved` | `processing` | At start of `process_job` | [job_runner.py:735-739](orchestrator/job_runner.py#L735-L739) |
| `approved` | `processing` (suno_retry variant) | At start of `process_suno_retry_job` | [job_runner.py:628-631](orchestrator/job_runner.py#L628-L631) |
| `processing` | `complete` / `partial` / `failed` | End of `process_job` | [job_runner.py:890-895](orchestrator/job_runner.py#L890-L895) |
| `processing` | `approved` (recovery) | Stuck-job recovery if `started_at` > 30 min old | [start_cloud.py:78-123](orchestrator/start_cloud.py#L78-L123) |
| `processing` | `complete` / `failed` (suno_retry) | End of `process_suno_retry_job` | [job_runner.py:706-710](orchestrator/job_runner.py#L706-L710), [job_runner.py:715-720](orchestrator/job_runner.py#L715-L720) |

`rejected` is declared in the CHECK constraint but I found no production-code write of that value in `orchestrator/`. Likely written by an admin UI action outside this repo.

### "Submitted but not yet picked up"

**Yes — it's `status='pending'` (before auto-approve) OR `status='approved'` (approved but not yet polled by the runner).** Both of these states represent queued-but-not-running jobs that `pod_manager` cannot see. With `auto_approve=true` (the default per [job_runner.py:934-939](orchestrator/job_runner.py#L934-L939)), `pending` is transient — it only persists between insert and the next `main` tick. `approved` is the dominant "waiting" state.

**INVESTIGATE FURTHER:** Whether the frontend ever inserts directly with `status='approved'` (skipping the `pending` hop). Orchestrator code doesn't prevent that.

---

## Q3 — Concurrency model across jobs

**Answer: Strictly serial.** One `job_runner` process, one asyncio event loop, one `main()` coroutine, one `await process_job(job)` at a time. There is no pool, no `asyncio.gather`, no worker count, and no lock on the queue — jobs are serialized by the fact that `main()` awaits `process_job` inline before looping back to poll.

**Evidence:**

The single `await` that processes a job: [orchestrator/job_runner.py:976-980](orchestrator/job_runner.py#L976-L980)

```python
job = job_resp.data[0]
if job.get("job_type") == "suno_retry":
    await process_suno_retry_job(job)
else:
    await process_job(job)
```

No `asyncio.create_task(process_job(job))`, no `asyncio.gather`, no `ThreadPoolExecutor`, no multiprocessing. The `main()` loop does not advance until the current job fully returns.

Startup spawns exactly **one** async task that is neither the runner nor a concurrency enhancer — it is the pod idle-check ticker: [orchestrator/start_cloud.py:147-155](orchestrator/start_cloud.py#L147-L155):

```python
async def _pod_idle_loop() -> None:
    while True:
        await asyncio.sleep(60)
        try:
            await asyncio.to_thread(pod_manager.idle_check)
        except Exception:
            logger.exception("pod_manager.idle_check failed")

asyncio.create_task(_pod_idle_loop())
```

That task is independent of the runner loop. It does not grant concurrency for jobs.

**Orphan-cleanup note in [pod_manager.py:663-665](orchestrator/cloud_engines/video_engine/pod_manager.py#L663-L665)** explicitly assumes a single orchestrator replica:

```
# NOTE: This cleanup assumes a single orchestrator replica (Railway's default).
# If running multiple replicas, pod ownership must be tracked via a durable
# store or pod labels/tags instead of pod name alone.
```

This corroborates "single serial runner" as the intended deployment shape.

**INVESTIGATE FURTHER:** Whether Railway is configured with multiple replicas in production. The code's assumption is single-replica; a misconfiguration would break pod ownership.

---

## Q4 — The gap window

### Trace: `process_job(A)` returning → `process_job(B)` being called

From `main()` at [orchestrator/job_runner.py:943-987](orchestrator/job_runner.py#L943-L987):

1. `await process_job(A)` returns (line 980).
2. `while True` branches back to line 944: `try:` block start.
3. Fetch `system_settings` row (one DB round-trip).
4. If `queue_paused`: `await asyncio.sleep(POLL_INTERVAL)` then `continue`. If **not** paused: fall through.
5. If `auto_approve`: bulk-update `pending → approved` (one DB round-trip).
6. `SELECT ... WHERE status = 'approved' ... LIMIT 1` (one DB round-trip).
7. If no approved job found: `await asyncio.sleep(POLL_INTERVAL)` then `continue`.
8. Else: `await process_job(B)` or `await process_suno_retry_job(B)`.

**Between-job gap (happy path, job B already approved and waiting):** three sequential Supabase REST calls — typically a few hundred ms. No sleep.

**Between-job gap (job B arrives after A finishes):** up to `POLL_INTERVAL` (30s) plus the three REST calls. If `auto_approve=true`, the auto-approve step will catch B's `pending` → `approved` transition on the next tick; if `auto_approve=false`, B sits in `pending` indefinitely until a human admin flips it.

### Is there any held knowledge of "next-in-line" ahead of pickup?

**No.** The runner is memoryless between job iterations. Each loop iteration re-queries `generation_jobs` from scratch. There is no in-memory cache, no "peek" at the next job, no event-driven notification from the DB. Nothing in the orchestrator tells `pod_manager` "there's an approved job waiting" before `process_job(B)` actually starts executing.

The only piece of pod-adjacent code that fires during this gap is `_pod_idle_loop` ([start_cloud.py:147-155](orchestrator/start_cloud.py#L147-L155)), which runs on its own 60s cadence and calls `pod_manager.idle_check` — a function that has zero awareness of the `generation_jobs` or `words` tables.

---

## Q5 — Visibility: can `pod_manager` see pending work?

**Answer: No, and there is no existing code path that gives it visibility.**

`pod_manager` holds three pieces of module-level state that gate termination: `_pod_status`, `_active_jobs`, `_upcoming_words` (plus `_last_activity` for the idle-seconds math). All three are mutated only by the per-word call sites identified in the prior report:

- `_upcoming_words`: `notify_upcoming_video` / `cancel_upcoming_video` from inside `process_word`
- `_active_jobs`: `acquire_use` / `release_use` from the LTX adapter
- `_last_activity`: refreshed by the above, plus `ensure_pod_ready` / `release_use`

**There is no Supabase client in `pod_manager.py`**. Verified:

```
orchestrator/cloud_engines/video_engine/pod_manager.py — imports are:
  datetime, email.utils.parsedate_to_datetime, logging, secrets, threading, time, typing.Optional/Tuple, httpx, .config, src.cost_logger
```

([pod_manager.py:18-47](orchestrator/cloud_engines/video_engine/pod_manager.py#L18-L47)). No `supabase`, no orchestrator-runner import.

### Natural hook point for pending-work visibility

If `idle_check` (or its predicate) were to query pending work, the natural call site is still `idle_check` itself at [pod_manager.py:618-653](orchestrator/cloud_engines/video_engine/pod_manager.py#L618-L653), specifically right before the `idle_seconds` comparison at line 646. The three early-return guards (`_pod_status`, `_active_jobs`, `_upcoming_words`) would get a fourth: *is there an approved-or-pending job with video in its pipeline?*

Such a query would:

- Need a Supabase client inside `pod_manager` (either a new one or plumbed through `idle_check(sb=...)`).
- Hit `SELECT 1 FROM generation_jobs WHERE status IN ('approved', 'pending') LIMIT 1` — cheap with the existing `idx_generation_jobs_status` index ([phase2a_tables.sql:78](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L78)).
- Fire at most once per 60s tick (the `_pod_idle_loop` cadence).

Cost: ~1 DB round-trip every 60s when the pod is idle — negligible.

**There is no in-memory cache of queue state** anywhere in the orchestrator that could be read without a DB hit. `main()` does not stash the last-observed job list; each tick does a fresh `LIMIT 1` SELECT.

**INVESTIGATE FURTHER:** Whether a job can be `approved` but not actually require the video stage. The shared pipeline loop filters stages via `stages_to_run`, which derives from smart-retry logic ([job_runner.py:202-224](orchestrator/job_runner.py#L202-L224)) and can exclude `video`. A visibility query based on "approved job exists" could therefore keep the pod alive for a word that will never reach video (rare edge case — smart retry of a word that already has video complete).

---

## Q6 — Alternative: queue-driven pre-warm

### Where does a new job arrive?

Two observable arrival points in the orchestrator:

1. **Auto-approve step** ([job_runner.py:954-960](orchestrator/job_runner.py#L954-L960)) — this is the first orchestrator code that *sees* newly inserted jobs (because pending jobs are only polled implicitly via this bulk update).
2. **Job pickup** ([job_runner.py:962-980](orchestrator/job_runner.py#L962-L980)) — the `SELECT ... WHERE status='approved' LIMIT 1` followed by `await process_job(job)`.

A Postgres trigger or Supabase Realtime subscription could push a third, earlier arrival signal — but **no such trigger is defined in this repo's migrations** (searched `20260322210000_phase2a_tables.sql` and the four migrations in `orchestrator/supabase/migrations/`; only `updated_at` triggers exist).

### Could `notify_upcoming_video` be called from the arrival path?

Yes, at two potential hook points, with different trade-offs:

**Hook A — at auto-approve** ([job_runner.py:957-960](orchestrator/job_runner.py#L957-L960)):

```python
approve_resp = sb.table("generation_jobs") \
    .update({"status": "approved"}) \
    .eq("status", "pending") \
    .execute()
if approve_resp.data:
    log.info("Auto-approved %d pending job(s)", len(approve_resp.data))
    # HOOK POINT A — notify pod_manager here
```

**Hook B — at job pickup** ([job_runner.py:976-980](orchestrator/job_runner.py#L976-L980)):

```python
job = job_resp.data[0]
# HOOK POINT B — notify pod_manager here, BEFORE awaiting process_job
if job.get("job_type") == "suno_retry":
    await process_suno_retry_job(job)
else:
    await process_job(job)
```

Hook B is closer to the current `notify_upcoming_video` call (still inside the runner process, still after the job is "ours") and provides the earliest possible pre-warm for a pending job without a DB trigger. Hook A is fractionally earlier but covers only the auto-approve path.

### What word ID?

The existing `_upcoming_words` dict is keyed by **word UUID** ([job_runner.py:260](orchestrator/job_runner.py#L260): `notify_upcoming_video(word_record["id"])`). A queue-driven pre-warm at job-arrival time does not yet have word IDs — the words are fetched via [job_runner.py:787-791](orchestrator/job_runner.py#L787-L791) inside `process_job`, after the job itself has been picked up.

Options (observed from code, not recommended by this report):

1. **Use `job_id` as the keep-alive key.** Requires `_upcoming_words` to accept either word or job IDs and `cancel_upcoming_video` to be called with `job_id` when the job finishes. The prior report noted that `cancel_upcoming_video` currently fires at video-stage entry — a job-level cancel would fire at process_job return.
2. **Use a synthetic placeholder key** (e.g., `f"job:{job_id}"`) that the per-word `notify_upcoming_video` calls displace/augment as words enter the loop. Messier.
3. **Extend `pod_manager` with a new "pending jobs" set** parallel to `_upcoming_words`. Clean API, but requires new methods and a mirror-cancel path.

**INVESTIGATE FURTHER:** Whether the current `_upcoming_words` type signature (`dict[str, float]`) accepting arbitrary string keys already admits option 1 without a type change. The type is string-keyed ([pod_manager.py:67](orchestrator/cloud_engines/video_engine/pod_manager.py#L67)), so technically yes — but semantic coupling is different.

### Does the queue entry indicate "this job needs a GPU pod"?

**No explicit flag.** The `generation_jobs` schema has no `requires_video` or equivalent column ([phase2a_tables.sql:57-76](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L57-L76)):

```sql
create table if not exists public.generation_jobs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  deck_id uuid not null references public.decks(id) on delete cascade,
  status text not null default 'pending' check (...),
  priority integer not null default 0,
  target_language text not null,
  art_style text,
  movie_override text,
  words_total integer not null default 0,
  words_completed integer not null default 0,
  words_failed integer not null default 0,
  profile_used text,
  started_at timestamptz,
  completed_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
```

Whether a job reaches the video stage depends on:
- Smart-retry `stages_to_run` ([job_runner.py:202-224](orchestrator/job_runner.py#L202-L224)) — *could* exclude `video` if video is already complete.
- `VIDEO_BACKEND` configuration ([config.py:25](orchestrator/cloud_engines/video_engine/config.py#L25)) — if not `"self_hosted"`, `notify_upcoming_video` is a no-op anyway ([pod_manager.py:536-550](orchestrator/cloud_engines/video_engine/pod_manager.py#L536-L550), verified in prior report).
- The `suno_retry` job type ([job_runner.py:616-720](orchestrator/job_runner.py#L616-L720)) — runs via `process_suno_retry_job`, not `process_job`. Does not enter `process_word` with the standard `stages_to_run`. **Not traced deeply enough here to rule out eventual video-stage execution.**

In practice: for the standard job type in the self-hosted backend deployment, **every job implicitly requires video**. An unconditional pre-warm at Hook B (`job.get("job_type") != "suno_retry"`) is a reasonable approximation.

**INVESTIGATE FURTHER:** `suno_retry`'s interaction with the video stage.

---

## Q7 — Multi-user / multi-account interactions

### Per-user partitioning

**None.** The runner processes all users' jobs through the same serial queue, prioritized by `priority` then `created_at` ([job_runner.py:966-968](orchestrator/job_runner.py#L966-L968)):

```python
.order("priority", desc=True) \
.order("created_at") \
.limit(1) \
```

There is no per-user worker, no fair-share scheduling, no account-level isolation. The `user_id` on the job is used only for credit refunds and RLS, not for scheduling.

### Shared pod, per-runner `_upcoming_words`

Since there is **one runner** (Q3), there is also **one `_upcoming_words` dict per process**. The dict is not shared across replicas — it's a module-level Python global in `pod_manager.py`. In single-replica deployments (the intended topology per [pod_manager.py:663-665](orchestrator/cloud_engines/video_engine/pod_manager.py#L663-L665)), the single dict serves the single pod, and users share both.

**Visibility across user boundaries:** because the dict is keyed by word UUID and is populated per-word regardless of user, there is no cross-user visibility *issue* — the issue is the same as within a single user: **the dict is only populated for the word currently being processed**. Pending jobs (whether from the same user or a different one) are invisible.

In a hypothetical multi-replica deployment, each replica would have its own `_upcoming_words` and would compete for one pod via `cleanup_orphans` — the code explicitly warns this isn't supported.

---

## Q8 — Observable states right now for a word in the queue

### words.status lifecycle

| From | To | Where | File:line |
|---|---|---|---|
| (insert) | `pending` | Default on frontend insert | [phase2a_tables.sql:43-44](orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql#L43-L44) |
| `pending` | `processing` | First line of `process_word`, sets `word_slug` and `status='processing'` | [job_runner.py:177-181](orchestrator/job_runner.py#L177-L181) |
| `processing` | `failed` | Mid-pipeline stage failure (terminal) | [job_runner.py:306-312](orchestrator/job_runner.py#L306-L312) |
| `processing` | `failed` | Version A assembly failure | [job_runner.py:468-474](orchestrator/job_runner.py#L468-L474) |
| `processing` | `failed` | Upload failure | [job_runner.py:583-587](orchestrator/job_runner.py#L583-L587) |
| `processing` | `complete` | *Implicit* via `upload_ab_results` — **not found by direct `status='complete'` grep in job_runner.py**; the status write must live inside `upload_ab_results` in `src/services/publishing.py`. Flag below. |

Also: the words query at [job_runner.py:787-791](orchestrator/job_runner.py#L787-L791) only picks up `status='pending'` words:

```python
words_resp = sb.table("words").select("*") \
    .eq("deck_id", deck_id) \
    .eq("status", "pending") \
    .order("created_at") \
    .execute()
```

So the queue-pickup view for words is: `pending` = queued and invisible to `pod_manager`; `processing` = being worked on (and, during a ~fraction of that window, also tracked in `_upcoming_words`); terminal states = done.

### Word status at the key transitions

- **User submits**: `words` row(s) inserted with default `status='pending'`, and a `generation_jobs` row inserted with default `status='pending'`.
- **`process_word` first touches**: word transitions `pending → processing` at [job_runner.py:177-181](orchestrator/job_runner.py#L177-L181).

The invisibility window for a word is everything between row-insert and the `status='processing'` write — i.e., from the user's submit until `process_word` begins for that specific word. If another word in the same job is currently being processed, this word's `pending` status can linger for the full length of the preceding word's pipeline (images through bookend, many minutes).

**INVESTIGATE FURTHER:** Where `words.status` is set to `'complete'` on success. Not present in `job_runner.py` (only failure paths write status). Likely in `src/services/publishing.py::upload_ab_results` — worth verifying for completeness but tangential to this investigation.

---

## Q9 — What does the current `idle_check` see?

Referencing [pod_manager.py:618-653](orchestrator/cloud_engines/video_engine/pod_manager.py#L618-L653) (idle_check body is quoted in the prior report Q3).

### Conditions under which `idle_check` terminates the pod while pending work exists

Given Q1-Q8, `idle_check` will terminate the pod **whenever all three intra-process guards are clear** (`_pod_status == "ready"`, `_active_jobs == 0`, `_upcoming_words == {}`) and `idle_seconds >= RUNPOD_IDLE_TIMEOUT`, **regardless of the `generation_jobs` or `words` table state**. Concrete scenarios:

1. **Between-job gap (single user, multi-job):** User A completes job 1 at T=0. `process_job` returns. `_upcoming_words` is empty, `_active_jobs` = 0, `_last_activity` is the moment of the final `release_use` for job 1. At T=30s (if `RUNPOD_IDLE_TIMEOUT=30`) and the next `_pod_idle_loop` tick, the pod is terminated. User A's (or any other user's) next job approved at T=31s now needs a cold start.

2. **Cross-user submission during another user's post-video tail:** User A's video finishes at T=0. Assembly + bookend + upload + metadata + DB writes all run on CPU (Railway). User B submits a job at T=10s. With `RUNPOD_IDLE_TIMEOUT=30`, the pod *may* survive until B is picked up; with `=30` and slow assembly (60s), the pod dies before B's `notify_upcoming_video` fires. With `=300`, the pod typically survives.

3. **Approved-but-unpicked due to poll interval:** Job B arrives and is auto-approved at T=5s, but the next `main()` tick doesn't happen until T=35s (because the previous tick ran at T=5s and slept 30s). During [T=5s, T=35s], `idle_check` has no visibility into B. If `RUNPOD_IDLE_TIMEOUT=30`, pod terminates at ~T=30s, cold start required at T=35s when B is picked up.

4. **Auto-approve disabled:** Job B sits in `pending` for minutes or hours until a human clicks "approve". The pod is long gone by then in any configuration. (Not a regression — this is expected behavior for manual gating.)

### Frequency estimate given realistic submission patterns

With `auto_approve=true` (the default) and `RUNPOD_IDLE_TIMEOUT=30`:

- **Single-user rapid submissions** (<30s apart): likely to reuse the pod if back-to-back within the idle window *and* the prior word's assembly+bookend+return is fast.
- **Single-user spaced submissions** (>30s between job-complete and next-job-submit): cold start every time.
- **Multi-user at any realistic rate where users aren't coordinated**: cold start likely every job, since the idle window has to cover the previous job's tail AND the gap to the next arrival.
- **Three DB round-trips + 30s sleep between iterations** means even a job arriving seconds after the previous finished is picked up with up to ~30s of runner-side latency. This 30s, combined with post-video assembly+bookend time for the previous word, reliably exceeds a 30s idle timeout.

With `RUNPOD_IDLE_TIMEOUT=300`, most of these scenarios keep the pod warm.

### Existing code preventing termination on queued-but-not-started work

**None found.** Verified by re-reading [pod_manager.py:618-653](orchestrator/cloud_engines/video_engine/pod_manager.py#L618-L653) and confirming the only keep-alive inputs are the three intra-process state variables. No DB query, no cache, no external signal.

---

## Cross-Job Visibility Summary

- **Current orchestrator job-pickup mechanism:** Supabase REST polling, single serial `main()` loop, 30s interval; `pending → approved → processing` lifecycle on `generation_jobs`.
- **Concurrency model:** Strictly serial. One replica, one asyncio loop, one `await process_job` at a time. No pool, no worker count. ([job_runner.py:976-980](orchestrator/job_runner.py#L976-L980))
- **Can `pod_manager` currently see pending-but-not-started work?** **No.** `pod_manager` has no Supabase client and no in-memory cache of queue state. The `_upcoming_words` dict is populated only by `notify_upcoming_video`, which is called only from inside `process_word`, which runs only after `process_job` has already picked up the job. ([pod_manager.py:553-594](orchestrator/cloud_engines/video_engine/pod_manager.py#L553-L594), [job_runner.py:260](orchestrator/job_runner.py#L260))
- **Natural hook points for queue-driven pre-warm:**
  - Hook A — inside the auto-approve branch at [job_runner.py:957-960](orchestrator/job_runner.py#L957-L960)
  - Hook B — right after job pickup at [job_runner.py:976-980](orchestrator/job_runner.py#L976-L980)
  - Hook C — inside `idle_check` itself, gated by a new DB query, at [pod_manager.py:640-648](orchestrator/cloud_engines/video_engine/pod_manager.py#L640-L648)
- **What would such a hook require?**
  - Hooks A/B: **no schema change, no new query** — rewiring existing calls only. Would need a new or extended `notify_*` API that accepts a job/deck-level ID if word IDs are not yet known (Q6 discusses options).
  - Hook C: **no schema change**, but **one new query per 60s idle tick** (cheap — `idx_generation_jobs_status` covers it) and a Supabase client inside `pod_manager` (either plumbed in or instantiated there).
- **Specific conditions under which current code causes unnecessary cold starts** (with `RUNPOD_IDLE_TIMEOUT=30`):
  1. Any job B arriving or being picked up more than ~30s after job A's final `release_use` (the poll interval alone — 30s — almost guarantees this).
  2. Multi-user submissions spaced more than 30s apart.
  3. Single-user jobs whose post-video assembly+bookend+upload tail exceeds 30s (likely in every realistic run) when followed by any other job.
  4. Any manual-approve workflow with any meaningful admin latency.

With `RUNPOD_IDLE_TIMEOUT=300`, scenarios 1-3 mostly avoid cold starts; scenario 4 still cold-starts.

### Discrepancies with the prior report

None observed. The prior report's claim that "pod-release effectively fires at end-of-video-stage (via `release_use`)" is consistent with what this investigation found. The new finding here is orthogonal: even granting that release-timing is correct, the **queue-pickup mechanism lacks any signal to `pod_manager` about jobs approved or pending beyond the currently-running one**. That gap, not the intra-job release point, is what causes cold starts under `RUNPOD_IDLE_TIMEOUT=30`.
