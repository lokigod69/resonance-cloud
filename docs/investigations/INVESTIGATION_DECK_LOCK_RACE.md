# Investigation: Deck-Lock Instant-Fail on New Word Submission

Date: 2026-04-27

Scope: read-only investigation of the same-deck generation-job lock, frontend submission/status behavior, retry behavior, and relevant Supabase schema/migrations. No app code was changed.

## Executive Summary

The same-deck lock is intentional in the feeder, not an accidental Supabase query side effect. The exact comment is `Same-deck lock (§6.1, Source 1 only)` in `orchestrator/src/orchestration/feeder.py:246`.

The failure mode is caused by how the lock is implemented: Source 1 first claims an `approved` job by changing it to `processing`, then checks whether the same deck already has another `processing` job. If it does, it logs the observed line and reverts the second job back to `approved` with `error_message = "deck already has a processing job"` (`feeder.py:222-255`, `feeder.py:296-311`). This means the second job is not marked `failed` or `cancelled`; it is repeatedly claimed and reverted on feeder ticks until the first job leaves `processing`.

From the code path inspected, the revert itself should leave the new job queued/approved, not terminal-failed. The user-facing "instant fail" is likely a frontend/status mismatch caused by the transient `processing` window and/or word-level failed UI, because the frontend does not surface `generation_jobs.error_message` and treats `processing` differently from `pending/approved`.

Admin profile changes do not participate in the lock check. However, active `language_profiles` settings are read at bootstrap time, after the deck lock passes, so a queued job can use whichever profile is active when it eventually starts, combined with that job's stored per-job overrides.

Recommendation: implement Option A, explicit same-deck queueing, with a small immediate Option D-style feeder change as the first step: stop claim/revert looping and leave same-deck blocked jobs visibly queued until the active job finishes.

## Exact Revert Code Path

1. `orchestrator/src/orchestration/feeder.py:120-123`
   - `_poll_once()` runs Source 3 orphans, Source 1 new jobs, then Source 2 retries.

2. `orchestrator/src/orchestration/feeder.py:142-148`
   - `_auto_approve_pending()` promotes all `generation_jobs.status = 'pending'` to `approved` when auto-approve is enabled.

3. `orchestrator/src/orchestration/feeder.py:202-220`
   - `_source1_new_jobs()` selects all `generation_jobs` with `status = 'approved'`, ordered by priority and creation time, then calls `_try_start_job(job)` for each.
   - It does not pre-filter out jobs whose deck already has a processing job.

4. `orchestrator/src/orchestration/feeder.py:222-235`
   - `_try_start_job()` claims the candidate by updating `status: approved -> processing`, guarded by `id` and `status = 'approved'`.
   - It also sets `started_at` during this transient claim.

5. `orchestrator/src/orchestration/feeder.py:246-255`
   - After the claim, Source 1 checks the same-deck lock:
     - `_deck_has_other_processing(deck_id, job_id)`
     - If true, it logs:
       - `feeder/source1: deck=%s has another processing job -- reverting job=%s`
     - Then calls `_revert_to_approved(job_id, error="deck already has a processing job")`.

6. `orchestrator/src/orchestration/feeder.py:270-288`
   - `_deck_has_other_processing()` queries `generation_jobs` for the same `deck_id`, `status = 'processing'`, and `id != current_job_id`.

7. `orchestrator/src/orchestration/feeder.py:296-311`
   - `_revert_to_approved()` updates the job from `processing` back to `approved`, guarded by `id` and `status = 'processing'`, and writes the error message.

The exact state transition is:

```text
pending -> approved -> processing -> approved -> processing -> approved ...
```

That loop continues while another job in the same deck remains `processing`.

## Answers

### 1. Is the "one processing job per deck" rule intentional?

Yes. The code labels it explicitly as a same-deck lock in `orchestrator/src/orchestration/feeder.py:246`.

The surrounding pipeline design also assumes that a `processing` generation job activates work for the deck:

- `orchestrator/src/orchestration/state.py:338-340` filters orphan-stage words to decks whose parent deck currently has a `generation_jobs.status = 'processing'`.
- `orchestrator/src/orchestration/finalizer.py:1-13` says the finalizer polls `generation_jobs.status = 'processing'` and moves them out of processing once all deck words are terminal.
- `orchestrator/frontend/supabase/migrations/20260418_pipeline_state.sql:6-9` describes the pipeline as a three-source feeder with guarded transitions.

Likely design intent: prevent two Source 1 bootstraps from operating on the same deck at once. That matters because bootstrap currently loads all pending words in the deck, not just words belonging to the newly claimed generation job (`feeder.py:488-501`). Running multiple same-deck bootstraps in parallel could mix job ownership, profiles, progress accounting, and finalizer decisions.

However, the current implementation enforces the lock after claiming the second job. That post-claim check creates a visible race window and a repeated claim/revert loop.

### 2. What is the exact revert behavior?

When Source 1 sees another processing job in the same deck:

- The second job has already been changed from `approved` to `processing` (`feeder.py:222-235`).
- The deck-lock probe finds another `processing` generation job in the same deck (`feeder.py:270-288`).
- The feeder logs the revert line and calls `_revert_to_approved()` (`feeder.py:246-255`).
- `_revert_to_approved()` changes the job back to `approved`, writes `error_message = "deck already has a processing job"`, and only succeeds if the job is still `processing` (`feeder.py:296-311`).

It does not mark the second job `failed`, `cancelled`, or `rejected`. There is no `cancelled` generation-job status in the schema. The allowed generation-job statuses are `pending`, `approved`, `processing`, `complete`, `partial`, `failed`, and `rejected` (`orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:57-75`).

Because the job remains `approved`, the next Source 1 tick selects it again (`feeder.py:202-220`) and the same sequence repeats until the first job leaves `processing`.

One important inconsistency: `orchestrator/src/orchestration/finalizer.py:12` says the finalizer is the sole writer that moves generation jobs out of `processing`, but `_revert_to_approved()` is another writer from `processing` to `approved`.

### 3. What does the user see?

The frontend does not surface the deck-lock error message from `generation_jobs.error_message`.

Submission path:

- Existing-deck submissions insert new `words` with `status = 'pending'`, then insert a `generation_jobs` row (`orchestrator/frontend/src/components/generate/submitGeneration.ts:52-69`).
- New-deck submissions do the same after creating the deck (`submitGeneration.ts:80-103`).
- Credits are deducted after the inserts (`submitGeneration.ts:106-111`).

Queue/status path:

- `useQueuePosition()` asks the RPC `get_my_queue_position` for the latest active job in a deck (`orchestrator/frontend/src/hooks/useQueuePosition.ts:63`).
- It treats only `pending` and `approved` as queue states (`useQueuePosition.ts:14`, `useQueuePosition.ts:176-178`).
- It treats `processing` as active but not as "show queue" (`useQueuePosition.ts:5`, `useQueuePosition.ts:108`, `useQueuePosition.ts:176-183`).
- `GeneratePG` navigates to the deck if the observed job status is `processing` (`orchestrator/frontend/src/pages/GeneratePG.tsx:89-94`).
- `QueuePositionDisplay` marks `jobsAhead > 0` as queued and otherwise calls the state "generating" (`orchestrator/frontend/src/components/QueuePositionDisplay.tsx:41-42`, `QueuePositionDisplay.tsx:79`).
- The queue-position RPC counts global active jobs ahead by `created_at`; it is not same-deck-lock aware (`orchestrator/frontend/supabase/migrations/20260420191500_queue_position_rpc.sql:32-57`).

Deck UI:

- Deck pages show the queue panel only when the deck is generating and `shouldShowQueue` is true (`orchestrator/frontend/src/pages/DeckView.tsx:386-397`, `orchestrator/frontend/src/pages/DeckViewPG.tsx:556-571`).
- Because `processing` makes `shouldShowQueue` false, a transient observation of the second job as `processing` can hide the queue UI and push the user into generic generation progress.
- Word cards show queued/processing/failed based on `words.status`, not `generation_jobs.error_message` (`DeckViewPG.tsx:760`, `DeckViewPG.tsx:855-865`).
- Failed word cards show a Retry button (`DeckView.tsx:559-563`, `DeckViewPG.tsx:857-865`).

Conclusion: during the revert loop, the second generation job is usually `approved`, with brief `processing` windows. The exact deck-lock error is stored on the job row but not shown. If the UI shows "Try Again", that is coming from word-level failed UI, not directly from `_revert_to_approved()`, because the deck-lock revert does not set the word or job to `failed`.

### 4. Is this a race condition?

Yes, in two ways.

First, there is a frontend-visible race window. The feeder claims the second job as `processing` before it checks the deck lock (`feeder.py:222-255`). A polling frontend can observe that transient `processing` status and navigate/hide queue UI (`GeneratePG.tsx:89-94`, `useQueuePosition.ts:176-183`) even though the feeder immediately reverts the job back to `approved`.

Second, the lock is not database-enforced before claim. If two same-deck jobs are claimed by concurrent feeders at nearly the same time, both can briefly be `processing`; each can then see the other as the "another processing job" and revert. In the common incident path, the first job is already in a real processing stage, so the second job loops `approved -> processing -> approved`.

The lock itself is sequential by design, but the claim-then-lock implementation creates racey observable states and potential livelock behavior under concurrency.

### 5. Does changing the admin profile mid-submission affect this?

No for the deck-lock decision. The deck-lock check only looks at `deck_id`, current job id, and other `generation_jobs.status = 'processing'` rows (`feeder.py:246-288`). Profile settings are not read before this check.

Profile settings do matter later:

- The submitted job stores per-job fields such as `art_style`, `movie_override`, and `settings_override` (`orchestrator/frontend/src/components/generate/useWizardState.ts:175-187`, `submitGeneration.ts:66-68`, `submitGeneration.ts:100-102`).
- `settings_override` was added specifically for generate-wizard overrides (`orchestrator/frontend/supabase/migrations/20260324000000_schema_fixes.sql:3-4`).
- Bootstrap reads the active language profile at bootstrap time and merges profile settings with job fields and `settings_override` (`orchestrator/src/orchestration/feeder.py:461-486`).

So the profile change did not trigger the instant deck-lock revert. But if the second job waits in `approved` and starts later, it can use whichever language profile is active when it actually bootstraps, plus the per-job overrides captured at submission.

### 6. What is the retry-button behavior?

The dashboard Retry button is implemented as word-level retry, not generation-job retry.

In `orchestrator/frontend/src/pages/DeckView.tsx:88-168` and `orchestrator/frontend/src/pages/DeckViewPG.tsx:108-186`, retry:

- Updates the failed `words` row to `retry_requested = true`.
- Sets `retry_requested_at`.
- Clears `error_message`.
- Guards the update with `current_stage = 'failed'` and `retry_requested IS NOT TRUE`.
- Deducts one credit.
- Sets the parent deck back to `generating`.

Feeder Source 2 then handles retry:

- `_source2_retries()` selects words with `retry_requested = true` and terminal `current_stage` values (`orchestrator/src/orchestration/feeder.py:316-333`).
- `_handle_retry_word()` routes the retry, calls `state.claim_retry()`, maybe flips the parent generation job, then puts the word onto the correct queue (`feeder.py:338-371`).
- `_route_retry()` sends Music-page retries to `post_video_queued`; dashboard retries follow `failed_stage` (`feeder.py:59-68`).

This does not create a new `generation_jobs` row and does not directly retry the reverted second job. If a user sees Retry/Try Again after this incident, they are interacting with a failed word card, not the generation job's deck-lock error.

## Schema and Index Notes

Relevant `generation_jobs` schema:

- `orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:57-75`
  - Status check allows `pending`, `approved`, `processing`, `complete`, `partial`, `failed`, `rejected`.
  - Includes `profile_used`, `started_at`, `completed_at`, and `error_message`.
- `orchestrator/frontend/supabase/migrations/20260322210000_phase2a_tables.sql:78-79`
  - Indexes exist on `status` and `user_id`.
- `orchestrator/frontend/supabase/migrations/20260420191500_queue_position_rpc.sql:66-68`
  - Adds a partial active queue index on `created_at` where status is `pending`, `approved`, or `processing`.

I did not find a `(deck_id, status)` index on `generation_jobs`.

Relevant word/job ownership note:

- The base `words` table does not contain `generation_job_id` (`20260322210000_phase2a_tables.sql:32-51`).
- No migration under `orchestrator/frontend/supabase/migrations/` adds `generation_job_id`.
- Yet bootstrap manifest code reads `word_rec.get("generation_job_id")` (`orchestrator/src/orchestration/feeder.py:694`).

Because current bootstrap loads all pending words in the deck (`feeder.py:488-501`), explicit same-deck queueing should also decide whether words need a durable `generation_job_id` relationship. Without that, a queued later job and an earlier job can be difficult to separate if both inserted pending words into the same deck.

## Options

### Option A: Queue

Allow multiple jobs per deck to sit in `approved` and process one at a time, in order. The user sees the later submission as queued.

Concrete changes:

- Backend feeder:
  - Check the same-deck lock before claiming a job as `processing`, or skip same-deck-blocked jobs without writing `started_at` or `error_message`.
  - Ensure Source 1 selects the next eligible approved job only when no job in that deck is currently `processing`.
  - Remove the repeated claim/revert loop.
- Data model:
  - Add `generation_jobs(deck_id, status, created_at)` or a partial active index for efficient deck-lock checks.
  - Strongly consider adding `words.generation_job_id` with a foreign key to `generation_jobs(id)` so bootstrap/finalizer can process the words belonging to a specific job instead of all pending words in the deck.
- Frontend:
  - Show `approved` same-deck-blocked jobs as queued, not failed or generic generating.
  - Make queue copy and progress same-deck aware.
  - Surface a clear queued state after existing-deck submissions.
- RPC:
  - Update `get_my_queue_position` or add a deck-aware status endpoint that understands same-deck blocking, not just global jobs ahead.

Pros: matches the desired validation workflow; preserves the resource-safety intent of one active job per deck; avoids silent failure.

Cons: requires schema and frontend work if true per-job word ownership is added.

### Option B: Parallel

Allow multiple jobs in the same deck to process simultaneously.

Concrete changes:

- Backend feeder:
  - Remove the same-deck lock.
  - Make bootstrap operate on words for the claimed job only, not all pending words in the deck.
  - Audit finalizer and Source 3 logic, because current processing-job status is used as a deck activation signal.
- Data model:
  - Add or verify durable `words.generation_job_id`.
  - Add indexes for per-job word lookups.
- Workers/finalizer:
  - Ensure progress counts, terminal checks, profile metadata, and failure aggregation are per job, not deck-wide.
- Frontend:
  - Display multiple active jobs in a deck and handle out-of-order completion.
- Operations:
  - Add concurrency/rate limits for Wan/video/GPU/API resources.

Pros: fastest user throughput.

Cons: largest blast radius; likely resource contention and correctness risks given current deck-wide bootstrap/finalizer assumptions.

### Option C: Reject Loudly

Keep the one-processing-job-per-deck rule and reject new submissions while a deck job is active.

Concrete changes:

- Frontend:
  - Before inserting words or deducting credits, check whether the deck has an active `pending`, `approved`, or `processing` job.
  - Show a clear message such as: "Another word in this deck is still generating. Please wait for it to finish before submitting the next."
  - Disable existing-deck submission when the deck is generating.
- Backend/RPC:
  - Prefer a Supabase RPC that atomically checks active deck jobs and creates the submission, to avoid a client-side time-of-check/time-of-use race.
- Feeder:
  - Keep the same-deck lock as a defensive backstop.
- Data model:
  - Add a `(deck_id, status)` active index.

Pros: smallest conceptual change and honest UX.

Cons: does not meet the back-to-back validation workflow; users still cannot queue words.

### Option D: Explicit Lock Release

Keep the one-active-job-per-deck rule but fix the claim/revert loop and misleading transient state.

Concrete changes:

- Backend feeder:
  - Perform same-deck lock detection before `approved -> processing`.
  - Leave blocked jobs in `approved` without updating `started_at` or `error_message` every tick.
  - Optionally write a stable queued reason once, but do not use an error field for normal queueing.
- Frontend:
  - Treat same-deck-blocked `approved` jobs as queued.
  - Do not show Retry/Try Again for a job that is merely blocked behind another deck job.
- Data model:
  - Add a partial active index on `(deck_id, status, created_at)`.

Pros: lower-risk feeder fix; stops the noisy loop and transient `processing` race.

Cons: still not a full user-facing queue unless the UI/RPC is adjusted; does not solve per-job word ownership if future queueing becomes richer.

## Recommended Option

Recommend Option A: explicit same-deck queueing.

Rationale:

- The user workflow requires submitting multiple words to the same deck back-to-back.
- The existing code already has `pending` and `approved` states, queue-position UI, and a feeder that can process jobs later.
- The current one-active-job-per-deck rule appears to protect real deck-wide assumptions, especially bootstrap loading all pending deck words and Source 3 using processing jobs as deck activation. Option A preserves that safety while making the blocked job a real queued job instead of a claim/revert loop.
- Option D is a good first patch inside Option A because it removes the immediate race window and log spam without changing resource concurrency.

The first implementation checkpoint should be: change the feeder so same-deck-blocked jobs are skipped before claim and remain `approved`, then update the frontend/RPC to show that as queued. The second checkpoint should decide whether to add `words.generation_job_id`; true per-job queue semantics are much cleaner with that relationship.
