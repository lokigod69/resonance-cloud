# Phase 1B SQL Verification

Date: 2026-04-29

Run these checks against local Supabase or disposable staging after applying Phase 1A and Phase 1B. Do not run against production without an explicit test window.

## Submit Generation

1. Submit generation with enough credits.
   - Create a normal authenticated user with at least two credits.
   - Call `public.submit_generation(...)` with two words and a fresh `p_idempotency_key`.
   - Expected: returns `success=true`, `deck_id`, and `job_id`.
   - Expected: credits decrease by exactly two.
   - Expected: deck exists with `status='generating'`.
   - Expected: two words exist with `status='pending'` and `current_stage='pre_bootstrap'`.
   - Expected: one `generation_jobs` row exists with `status='pending'`.

2. Submit generation with insufficient credits.
   - Use a normal authenticated user with fewer credits than the submitted word count.
   - Expected: returns `success=false` with an insufficient-credit error.
   - Expected: no deck, words, job, or credit mutation is committed.

3. Duplicate submit/idempotency behavior.
   - Call `public.submit_generation(...)` twice with the same `p_idempotency_key`.
   - Expected: second call returns `success=true` and `idempotent=true`.
   - Expected: no second credit deduction.
   - Expected: no duplicate deck/word/job set.

## Retry

4. Retry with enough credits.
   - Create an owned word with `current_stage='failed'` and a user with at least one credit.
   - Call `public.request_word_retry(word_id, 'word')`.
   - Expected: returns `success=true`.
   - Expected: credits decrease by exactly one.
   - Expected: word has `retry_requested=true`, `retry_requested_at` set, and `error_message=null`.
   - Expected: deck status becomes `generating`.

5. Retry with insufficient credits.
   - Use an owned retryable word and a user with zero credits.
   - Expected: returns `success=false` with an insufficient-credit error.
   - Expected: word retry fields are unchanged.
   - Expected: credits remain unchanged.

6. Retry duplicate click behavior.
   - Call `public.request_word_retry(word_id, 'word')` twice.
   - Expected: first call debits one credit and sets retry fields.
   - Expected: second call returns `already_requested=true`.
   - Expected: second call does not debit another credit.

7. Music retry.
   - Create an owned word with `current_stage='complete'` and Suno fields populated.
   - Call `public.request_word_retry(word_id, 'music')`.
   - Expected: clears Suno task/audio/storage fields, sets `music_state='pending'`, sets retry fields, and debits one credit.

## Privilege Checks

8. Normal users cannot update credits manually.
   - Attempt `update public.profiles set credits = credits + 1 where id = auth.uid();`.
   - Expected: rejected by Phase 1A trigger.

9. Normal users cannot update role manually.
   - Attempt `update public.profiles set role = 'admin' where id = auth.uid();`.
   - Expected: rejected by Phase 1A trigger.

## Frontend Smoke Checks

10. Submit from the generate wizard.
    - Expected: frontend calls `submit_generation`; it does not directly update `profiles.credits`.

11. Retry from deck view and music page.
    - Expected: frontend calls `request_word_retry`; it does not directly update `profiles.credits`.
