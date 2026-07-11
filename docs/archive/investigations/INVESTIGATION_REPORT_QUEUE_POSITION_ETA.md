# Investigation Report — Queue Position & ETA for Learner Generation UI

**Date:** 2026-04-20
**Scope:** Read-only investigation of the current `orchestrator` + `frontend` + Supabase schema for a learner-facing queue position and ETA feature after Quick Generate.
**Goal:** Determine what can be derived from existing data, choose an ETA/update strategy, define the UX flow, and identify the minimum backend work needed before implementation.

---

## Executive Summary

**Short answer:** per-word progress is available now, but **true learner-facing global queue position is not** from the current frontend alone.

The critical constraint is **RLS**:

- Learners can read only their own `generation_jobs` and `words` rows.
- The current learner frontend uses the Supabase anon client directly.
- Queue position across all users requires visibility into **other users' active jobs**.

So:

- **Per-word progress:** feasible now from `words.current_stage`, `words.status`, `stage_started_at`, and deck word ordering.
- **Global queue position:** **requires a backend/RPC surface** that computes the answer server-side.
- **Existing live queue metrics endpoint:** **does not exist** in the cloud-facing app today.
- **Recommended MVP:** server-side queue snapshot + frontend polling every 5s + static/stage-weighted ETA.
- **Recommended wording:** use job position plus active-word progress, and only say a word is “generating now” when its `current_stage` is actually `video` or `post_video_queued`/late-stage completion is imminent.

---

## Q1 — What does the current data model actually support?

## `generation_jobs`

Authoritative schema is in `frontend/supabase/migrations/20260322210000_phase2a_tables.sql`.

Relevant fields:

- `id`
- `user_id`
- `deck_id`
- `status` in `('pending', 'approved', 'processing', 'complete', 'partial', 'failed', 'rejected')`
- `priority`
- `words_total`
- `words_completed`
- `words_failed`
- `started_at`
- `completed_at`
- `created_at`
- `updated_at`

Current learner submission path:

- `frontend/src/components/generate/useWizardState.ts`
  - `jobPayload.status` is built as `pending`
- `frontend/src/components/generate/submitGeneration.ts`
  - inserts the `generation_jobs` row directly from the browser

Current orchestrator pickup path:

- `src/orchestration/feeder.py`
  - bulk auto-approves `pending -> approved` if `system_settings.auto_approve=true`
  - reads approved jobs ordered by:
    - `priority DESC`
    - `created_at ASC`
  - claims each job with `approved -> processing`

That ordering is the correct basis for **server-side** queue position.

## `words`

Relevant schema comes from:

- `frontend/supabase/migrations/20260322210000_phase2a_tables.sql`
- `frontend/supabase/migrations/20260418_pipeline_state.sql`
- `frontend/supabase/migrations/20260420_current_stage_default.sql`

Relevant fields:

- `deck_id`
- `user_id`
- `word`
- `status` in `('pending', 'processing', 'complete', 'failed')`
- `current_stage`
- `stage_started_at`
- `updated_at`
- `created_at`
- `failed_stage`
- `music_state`

Current stage values include:

- `pending`
- `enrichment`
- `images`
- `concept`
- `song`
- `video_queued`
- `video`
- `post_video_queued`
- `assembly`
- `bookend`
- `suno_bake`
- `uploading`
- `complete`
- `failed`
- `cancelling`
- `cancelled`

This is enough to power **per-word progress**, active-word labeling, and stall heuristics.

## Ordering inside a job

Word order is stable enough for learner progress UI:

- `feeder.bootstrap_job()` reads deck words ordered by `created_at ASC`
- then pushes them onto `upstream_queue` in that same deck order

Important nuance:

- the orchestrator is **job-concurrent but video-serial**
- multiple jobs can be in `processing` at once
- the single hard bottleneck is `video_dispatcher` with `VIDEO_CONCURRENCY=1`

So the system is **not** “one whole job at a time,” but it is still fair to present learner progress in deck order for the current user.

---

## Q2 — Can the frontend derive learner queue position directly from Supabase today?

**No, not for a global queue across all users.**

Reason:

- `generation_jobs` RLS policy is `user_id = auth.uid() or public.is_admin()`
- the learner frontend uses the anon client in `frontend/src/lib/supabase.ts`
- learner pages do not run through a privileged backend

That means a learner client can query:

- its own job row
- its own deck words
- public `system_settings`

It cannot query:

- other users' active jobs
- other users' words in the pipeline

This is the decisive finding for the feature brief.

## What *is* queryable from the learner client today?

The learner client can derive:

- whether its job exists
- whether it is `pending`, `approved`, `processing`, `complete`, `partial`, `failed`
- how many of its own words are complete/failed/pending
- the active stage of each of its own words
- whether the queue is paused, since `system_settings` is public-read

The learner client cannot derive:

- how many other jobs are ahead
- whether it is 3rd, 8th, or 12th globally
- how many other words are ahead at the single GPU bottleneck

## Implication

A frontend-only MVP can show **own-job progress** but **not truthful global queue position**.

If the feature requirement is:

- “You are 3rd in the queue”

then a backend addition is required.

---

## Q3 — What queue semantics should the design use?

## Job position is valid UX, but it is not the full latency model

The brief proposes counting jobs ahead. That is valid as a **user-facing position label**, because the feeder starts jobs by:

- `priority DESC`
- `created_at ASC`

But it is **not sufficient for first-word ETA accuracy**, because the real bottleneck is word-level video work:

- each job bootstraps **all its words** into the pipeline
- `upstream_worker` processes words sequentially
- `video_dispatcher` serializes the actual GPU-heavy video stage across all jobs and all words

So two truths coexist:

- **Position copy:** “3 jobs ahead” is a reasonable mental model for the user.
- **ETA math:** should account for **word-level pipeline work**, not just count jobs.

## Recommended mental model for the feature

Use two separate concepts:

- **Queue position:** job-based, human-readable
- **ETA to first word:** pipeline-based, approximate

That gives users a stable answer to “where am I?” without pretending the pipeline is a simple FIFO of entire jobs.

---

## Q4 — ETA strategy evaluation

## Option 1: Static estimate per stage

**Feasibility:** high
**Accuracy:** medium
**Backend dependency:** low once queue snapshot exists
**Recommendation:** **best MVP choice**

Why it works here:

- current schema exposes the live stage of the active word
- current schema does **not** preserve historical stage durations per completed word
- current cloud app does **not** expose live queue metrics over HTTP

A static model can still be made materially better than the current spinner by using:

- job position ahead
- active word stage
- elapsed time in current stage via `stage_started_at`
- own `words_completed / words_total`

Recommended shape:

- estimate remaining time for the active word based on current stage bucket
- estimate a fixed “first-word cost” for each queued job ahead
- subtract elapsed time already spent in the current stage

This is approximate, but it is implementable without new schema.

## Option 2: Historical moving average

**Feasibility today:** low
**Accuracy potential:** high
**Recommendation:** **not an MVP choice with the current data model**

This looks attractive in theory, but the current database does **not** store stage histories.

What the DB has:

- `stage_started_at` for the **current** stage only
- `updated_at`
- job-level `started_at` / `completed_at`

What it does **not** have:

- per-stage completion timestamps
- persisted `durations_ms` per stage per word

The orchestrator does log in-memory `StageTimer` breakdowns, but those timings are not written back to Supabase.

Therefore a true “moving average by stage over last N completed words” is **not currently available from Supabase alone**.

To make this real, you would need one of:

- persisted stage timing rows
- a metrics table
- log ingestion / analytics pipeline
- a backend service that computes and stores rolling durations

So this is a **v2+ telemetry project**, not a cheap follow-on.

## Option 3: Live pod throughput / queue depth endpoint

**Feasibility today:** low
**Accuracy potential:** high
**Recommendation:** good v2 candidate, not MVP

What exists now:

- `src/orchestration/observability.py` logs queue depths and active worker counts
- `src/app.py` in cloud mode only exposes `health.router`
- `src/routers/health.py` exposes engine health only

What does **not** exist now:

- learner-consumable HTTP endpoint for queue depth
- learner-consumable HTTP endpoint for orchestrator worker state
- learner-consumable HTTP endpoint for pod/video slot utilization

So live throughput is **not already exposed** despite internal logging existing.

## ETA recommendation

**Choose Option 1 for MVP:** a **static, stage-weighted ETA**.

Specifically:

- compute queue position server-side
- compute first-word ETA from a small static model plus live current stage
- keep the copy approximate: `~2 min`, `~5 min`, `~8 min`
- avoid pretending to the second

This has the best cost/benefit ratio and is the only strategy fully compatible with the current stored data.

---

## Q5 — Polling vs Realtime

## Polling

**Recommendation:** **use polling for MVP**

Why:

- the app already uses polling patterns in multiple places
  - admin queue: 10s polling
  - deck view while generating: 30s polling
- global queue position depends on server-side aggregation anyway
- polling is simpler to reason about and test
- a 5s interval is enough for this UX without feeling stale

Recommended MVP polling split:

- `queue snapshot` endpoint: every 5s while the deck/job is generating
- `own words` query: same cadence, or reuse snapshot if it includes active-word info

## Realtime subscriptions

**Recommendation:** do not use as the primary MVP transport

Reasons:

- no existing realtime subscription pattern is used for this feature area
- I found no publication setup in the migrations
- even if own-row realtime works, it does **not** solve cross-user queue position
- queue position changes when **other users' rows** change, which learners cannot subscribe to directly under current RLS

Realtime could still be useful later for:

- own-word stage changes
- instant deck refresh after first completion

But it is not the right first move for this feature.

## Update mechanism recommendation

**Use polling for MVP.**

If realtime is added later, treat it as an enhancement layered on top of the same server-side queue snapshot contract.

---

## Q6 — Proposed UX flow

## State 1: submit acknowledged

Immediately after Quick Generate succeeds:

- replace the current opaque spinner with:
  - `Joining the queue…`
  - then first snapshot result

If queue snapshot is not ready yet:

- `We’re checking your queue position…`

This avoids showing fake certainty before the first response arrives.

## State 2: queued, not yet processing

When the job is `pending` or `approved` and there are jobs ahead:

- primary line:
  - `You’re 3rd in the queue.`
- secondary line:
  - `Estimated: ~6 min until your first word is ready.`
- tertiary detail:
  - `3 words in this deck.`

If `queue_paused=true`:

- primary line:
  - `Generation queue is temporarily paused.`
- secondary line:
  - `Your job is saved and will start automatically when the queue resumes.`

## State 3: own job processing, first word not done yet

When the job is `processing` and no word is complete yet:

Use stage-aware copy.

Examples:

- earliest incomplete word in `images` / `concept` / `song`
  - `Preparing your first word…`
  - `You’re next after the current video slot clears.`
- earliest incomplete word in `video`
  - `Generating your first word now.`
- earliest incomplete word in `assembly` / `bookend` / `uploading`
  - `Finishing your first word…`

This is a better fit than always saying “generating now.”

## State 4: first word complete, more words remaining

When at least one word is complete and the deck is still generating:

- primary line:
  - `Word 1 of 3 complete.`
- secondary line:
  - `Working on word 2 of 3.`
- detail line:
  - `Current stage: video` or `Current stage: assembly`

Important wording recommendation:

- prefer **“Working on word 2 of 3”** as the generic label
- only use **“Word 2 generating now”** when that active word is actually in `video`

Why:

- word order is stable enough to present deck-order progress
- but downstream stages overlap, so “generating now” should be reserved for the actual video stage

## State 5: terminal states

- all words complete:
  - normal deck-ready state
- partial:
  - `2 of 3 words completed.`
  - `1 word needs retry.`
- failed:
  - `Generation did not complete.`
  - `You can retry from the deck.`

## State 6: degraded / stalled / orchestrator unavailable

Since there is no dedicated learner queue health endpoint today, use graceful fallback copy.

Recommended heuristics:

- queue snapshot endpoint fails, but own-word polling works:
  - hide position/ETA
  - show `Still working — live queue estimate unavailable right now.`
- job remains `pending`/`approved` far longer than expected:
  - `The queue is moving slower than usual.`
- job is `processing` but active word `updated_at` or `stage_started_at` is stale past a threshold:
  - `This is taking longer than usual, but your job is still in progress.`

Avoid strong failure copy unless the system can prove failure.

---

## Q7 — Backend changes needed

## Required for truthful global queue position

At least **one** privileged server-side surface is required.

Recommended options:

- **Option A:** security-definer Postgres RPC
- **Option B:** backend API endpoint using service role / server credentials

Either is acceptable. The contract matters more than the transport.

## Recommended minimum contract

A queue snapshot for the current learner job, e.g.:

- `job_id`
- `job_status`
- `queue_position`
- `jobs_ahead`
- `eta_seconds_to_first_word` or preformatted ETA bucket
- `active_word_index`
- `words_total`
- `words_completed`
- `active_word_stage`
- `queue_paused`
- `snapshot_time`
- optional `degraded_reason`

This keeps the frontend simple and prevents it from reimplementing queue logic.

## Recommended query/index work

No schema change is required for MVP, but one index is advisable.

Current indexes:

- `generation_jobs(status)`
- `generation_jobs(user_id)`
- `words(deck_id)`
- `words(current_stage)` partial active

Recommended additional index for queue-order reads/counts:

- partial index on active queue states ordered for precedence, e.g. active jobs only by:
  - `priority DESC`
  - `created_at ASC`
  - `id ASC`

Why:

- queue position calculation will repeatedly count or rank active jobs
- current `status` index is helpful but not ideal for ordered range/rank access
- adding `id` as the final tiebreaker makes ordering stable if timestamps collide

## Existing metrics/health endpoints

Current cloud HTTP exposure is insufficient for this feature:

- `src/app.py` in cloud mode includes only `health.router`
- `src/routers/health.py` exposes engine health only
- `MetricsReporter` logs internal queue depth but does not expose it over HTTP

So if you want learner-visible queue health beyond the basic snapshot, that is **new backend work**.

---

## Q8 — MVP vs v2 scope

## MVP

Recommended MVP scope:

- add one server-side queue snapshot surface
- keep learner updates on 5s polling
- use static, stage-weighted ETA
- show queue position by jobs ahead
- show own per-word progress using deck word order and `current_stage`
- add graceful degraded copy when estimate is unavailable

This delivers the core product win with minimal moving parts.

## V2

Good follow-ons after MVP proves useful:

- learner queue health / pod utilization endpoint
- realtime or SSE push instead of polling
- better stall classification using orchestrator heartbeat/metrics
- historical ETA calibration once stage durations are persisted
- word-level queue depth ahead of the GPU slot, not just job count

## Not recommended for MVP

- frontend-only global queue math
- stage-history moving averages without persisted timings
- full realtime-first architecture
- exposing raw admin queue tables directly to learners

---

## Final Recommendation

## Recommended implementation direction

Build the feature as:

- **server-side queue snapshot**
- **frontend polling every 5s**
- **static/stage-weighted ETA**
- **word-order-based progress inside the learner’s own deck**

## Why this is the right choice

It matches the real constraints of the current system:

- the learner frontend cannot see other users' jobs under current RLS
- the DB does not currently store historical stage timings needed for moving averages
- the orchestrator does not currently expose queue metrics over HTTP
- polling is already an established pattern in this codebase

## Bottom line

If the requirement is only:

- “show my own words progressing”

then frontend-only is enough.

If the requirement is truly:

- “You are 3rd in the queue”
- “Estimated until your first word is ready”

then **a small backend addition is required**, but **no schema change is required for MVP**.

That is the cleanest, lowest-risk path.
