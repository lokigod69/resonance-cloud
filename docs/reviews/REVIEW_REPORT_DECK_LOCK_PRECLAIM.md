# Verdict

BLOCK. The Source 1 pre-claim patch is mechanically correct, but it does not actually guarantee that a second submitted word stays queued: Source 3 can still pick up the newly inserted `pending` word in a deck that already has any `processing` job.

# Commit Verification

- `git log --oneline origin/main -5` shows `origin/main` at `7ec9231`, with `c401688` three commits behind the current tip:
  - `7ec9231 Merge branch 'main' of https://github.com/lokigod69/resonance-cloud into HEAD`
  - `f1a5d40 fix(image): update provocative prompt and persist scene stills`
  - `4b46ecb Fix generation loader and admin defaults`
  - `c401688 fix(feeder): check same-deck lock before claim to stop revert loop`
  - `9f960f0 fix(image): purge artist anchors from provocative body and art_style descriptions`
- `git show c401688 --stat` confirms the commit touches only `src/orchestration/feeder.py`, with `10` changed lines: `9` insertions and `1` deletion.
- `git show --no-patch --pretty=raw c401688` shows parent `9f960f0`; no orphan-parent issue.
- `git merge-base --is-ancestor c401688 origin/main` succeeds.
- `git diff c401688..origin/main -- src/orchestration/feeder.py` is empty, so later commits did not alter the feeder patch.

# Findings

1. **BLOCKING** — `src/orchestration/feeder.py:120`, `src/orchestration/feeder.py:161`, `src/orchestration/state.py:338`, `frontend/src/components/generate/submitGeneration.ts:56`

   Source 3 can bypass the intended queue and process the second word before its generation job is claimed. `_poll_once()` runs Source 3 before Source 1 (`feeder.py:120-123`). Source 3 selects `pending`, `video_queued`, and `post_video_queued` words (`feeder.py:161-167`). `fetch_words_by_stage(..., processing_jobs_only=True)` only checks whether the word's deck has at least one `generation_jobs.status = 'processing'` (`state.py:338-340`, `state.py:344-368`). Existing-deck submissions insert new words immediately as `status: 'pending'` and `current_stage: 'pending'` before inserting the new generation job (`submitGeneration.ts:56-68`).

   Result: if Word A is processing in deck X and Word B is submitted to deck X, Word B is a `pending` word in a deck with a processing job. On the next tick, Source 3 can push Word B to the upstream queue before Source 1 ever reaches the new job and skips it as `approved`. This violates the implementation goal that "the job sits cleanly in `approved` until the prior deck job leaves `processing`." It can also explain failed-looking behavior, because the upstream worker expects bootstrapped workspace/manifest state, while frontend-submitted words do not yet have Source 1 bootstrap output.

   Suggested fix: make Source 3 distinguish bootstrapped orphan words from freshly submitted unbootstrapped words. Possible approaches include a durable `generation_job_id`/job ownership link, a `bootstrapped` or `manifest_ready` flag, a distinct pre-bootstrap word stage, or making Source 3 filter to words belonging to the active processing generation job. This needs design care because `bootstrap_job()` currently loads all pending words in a deck (`feeder.py:496-504`).

2. **NON-BLOCKING** — `tests/test_orchestration_feeder.py:295`

   The committed 22 feeder tests do not exercise the new pre-claim path in `_source1_new_jobs()`. The existing deck-lock test calls `_try_start_job(dict(j2))` directly (`tests/test_orchestration_feeder.py:295-314`), so it only covers the preserved post-claim revert backstop. It does not assert that `_source1_new_jobs()` leaves a locked candidate untouched, and it does not check absence of `started_at` or `error_message` writes.

   Suggested fix: add a committed regression test for `_source1_new_jobs()` with one `processing` job and one `approved` job in the same deck, asserting that the approved job remains approved and has no `started_at` or deck-lock `error_message`. Add a three-job same-deck ordering test if queue ordering is a product requirement.

3. **NON-BLOCKING** — `src/orchestration/feeder.py:347`, `src/orchestration/feeder.py:386`

   Source 2 retries bypass the same-deck lock entirely. `_handle_retry_word()` claims retry words and then calls `_maybe_flip_parent_job()` (`feeder.py:347-365`). `_maybe_flip_parent_job()` selects the latest terminal generation job for the deck and flips it to `processing` (`feeder.py:386-424`) without checking whether another generation job in the same deck is already processing. This was out of scope for the Source 1 patch, but it is a real hole in the broader "one active processing job per deck" rule.

   Suggested fix: define whether retries are allowed to run concurrently with same-deck new jobs. If not, Source 2 needs equivalent deck-lock awareness or a separate retry queue state.

4. **OBSERVATION** — `src/orchestration/feeder.py:220`, `src/orchestration/feeder.py:255`

   The multi-feeder race still has the expected both-revert outcome. Two feeder instances can both pass the pre-claim check (`feeder.py:220-228`), both claim different approved jobs in the same deck (`feeder.py:234-244`), then both observe another processing job after claim and call `_revert_to_approved()` (`feeder.py:254-263`, `feeder.py:304-319`). In a multi-feeder deployment this can cause both candidates to return to `approved` for that tick. Current deployment is understood to be single-feeder, so this is a future concurrency concern rather than a blocker for the one-feeder case.

5. **OBSERVATION** — `src/orchestration/feeder.py:469`

   The patch does not introduce profile snapshot drift, but it can extend the time a job waits in `approved` before bootstrap reads the active language profile. Per-job overrides are still captured in the job row, but the base language profile is read live during bootstrap (`feeder.py:469-494`). If admins change the active profile while a job is queued, the queued job can use the later profile.

# Frontend Behavior Verification

- `frontend/src/hooks/useQueuePosition.ts:14` treats `pending` and `approved` as active queue states.
- `frontend/src/hooks/useQueuePosition.ts:106-109` keeps polling while the job status is `pending` or `approved`.
- `frontend/src/hooks/useQueuePosition.ts:176-183` returns `shouldShowQueue = true` for `pending` and `approved`, and not for `processing`.
- `frontend/src/components/QueuePositionDisplay.tsx:39-42` treats `jobsAhead > 0` as queued and otherwise labels the state as generating.
- `frontend/src/components/QueuePositionDisplay.tsx:70-79` renders the queued/generating copy and `jobsAhead` details.
- `frontend/src/pages/GeneratePG.tsx:88-94` navigates to the deck on `jobStatus === 'processing'`, not on `approved`. `frontend/src/pages/GenerateGO.tsx:98-104` has the same behavior.
- `frontend/src/pages/DeckView.tsx:75-77` enables queue polling when the deck status is `generating`, and `DeckView.tsx:386-390` displays the queue panel when `!hasChecked || shouldShowQueue`.
- `frontend/src/pages/DeckViewPG.tsx:93-95` and `DeckViewPG.tsx:556-565` do the same for the PG deck view.
- The queue RPC includes `approved` jobs in the target-job set (`frontend/supabase/migrations/20260420191500_queue_position_rpc.sql:32-39`) and counts earlier active jobs globally (`20260420191500_queue_position_rpc.sql:54-57`).

For the intended "A processing, then B submitted" case, the frontend assumptions are mostly compatible: B's job should be selected as the latest active deck job, `approved` should keep the queue panel visible, and A should count as a job ahead because it has an earlier `created_at`. The blocking problem is backend Source 3, not the frontend queue hook.

# Test Coverage Assessment

- Verified command: `uv run pytest tests/test_orchestration_feeder.py -q`
- Result: `22 passed in 0.07s`

Coverage gap: no committed test covers the new Source 1 pre-claim skip. The deck-lock test at `tests/test_orchestration_feeder.py:295-314` calls `_try_start_job()` directly, so it exercises the post-claim backstop, not `_source1_new_jobs()` lines `202-228`.

There is also no committed test for:

- "approved same-deck candidate is skipped without `started_at` or `error_message` writes";
- "A finishes, then older B is picked before C";
- "Source 3 must not pick newly submitted pending words for a deck whose older job is processing."

The last missing test is the important one because it exposes the blocking Source 3 bypass.

# Race / Concurrency Analysis

Single-feeder normal path after `c401688`:

1. Source 3 runs first.
2. Source 1 reads all `approved` jobs ordered by priority descending, then `created_at`.
3. For each approved job, Source 1 sets local `job_id = job["id"]` and `deck_id = job.get("deck_id")`.
4. Source 1 calls `_deck_has_other_processing(deck_id, job_id)` before `_try_start_job()`.
5. If locked, the candidate is skipped with a DEBUG log and no mutation.
6. If unlocked, `_try_start_job()` performs the guarded `approved -> processing` claim and bootstraps.

This part is correct.

Multi-feeder theoretical race:

1. Feeder A checks deck X for job B and sees no other processing job.
2. Feeder B checks deck X for job C and sees no other processing job.
3. Both call `_try_start_job()`.
4. Both claims can succeed because the update guard is only `id = job_id AND status = 'approved'`.
5. A's post-claim check sees C processing; B's post-claim check sees B processing.
6. Both log the WARN backstop and call `_revert_to_approved()`.
7. Both jobs return to `approved`; neither bootstraps that tick.

This is acceptable only if deployment remains single-feeder or if occasional all-revert ticks are acceptable. A database-level deck lock or atomic claim RPC would be needed for robust multi-feeder behavior.

# What Was Not In Scope But Worth A Follow-Up Ticket

- Fix Source 3's inability to distinguish bootstrapped orphan `pending` words from newly submitted unbootstrapped `pending` words.
- Add durable per-job word ownership (`words.generation_job_id`) or an equivalent bootstrap-readiness signal.
- Decide whether Source 2 retries must honor the same-deck lock.
- Snapshot the active base language profile into the job at submission time, or explicitly document that base profile is read at bootstrap time.
- Add committed regression tests for Source 1 pre-claim skip and Source 3 locked-deck behavior.
- Consider replacing claim-plus-backstop with an atomic database RPC if more than one feeder can run in production.
