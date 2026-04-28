# Resonance Phase 1 Focus Stabilization Plan

## Purpose

This document is a portable continuation brief for a new implementation chat or coding agent with repository access.

The goal is **not** to redesign Resonance, rewrite the app, integrate Stripe, build iOS, or clean every messy file. The goal is to make the existing working project safer and less fragile so it can move toward a controlled private beta.

Plain-English goal:

> Protect the money-like things, protect the admin things, protect the expensive AI calls, and make generation requests all-or-nothing.

## Current working assumption

Use the existing audit documents as a roadmap, but verify the live repository before changing code. The docs are static snapshots and the project may have changed.

Assume the intended production shape is:

- `orchestrator/` = active main app repository.
- `ltx-worker/` = active GPU worker repository.
- Vercel = frontend plus `frontend/api/*` serverless functions.
- Supabase = Auth, database, storage, RLS, RPCs.
- Railway/Docker = Python cloud job runner.
- LTX/RunPod/self-hosted worker = GPU video generation.
- Local FastAPI workspace routes = local/dev only, not public production.

Before implementation, verify whether this is still true.

## Non-negotiable safety rules

1. Work on a branch, not the main branch.
2. Do not apply migrations to production directly.
3. Do not print, copy, or expose `.env` secret values.
4. Do not delete old folders or duplicate UI variants during Phase 1.
5. Do not refactor the whole pipeline yet.
6. Do not integrate Stripe yet.
7. Do not make iOS decisions yet.
8. Do not rely on frontend route guards for security.
9. Do not trust browser-side credit or admin checks.
10. Make one small patch at a time and report the changed files.

## Recommended chat/agent structure

Use one lead chat to coordinate. Do not let multiple agents modify the same migration files at the same time.

Best structure:

### Lead chat

Owns the roadmap, acceptance criteria, and merge order. It reviews what each implementation chat changed.

### Implementation Chat A: Database/RLS/Auth

Owns:

- profile role/credit protection
- admin role model
- invite-code boundary
- direct pipeline field permissions
- storage path policy investigation
- RLS tests

### Implementation Chat B: Paid API Protection

Owns:

- `/api/voice-chat`
- `/api/suggest-words`
- `/api/grok-token`
- auth helper
- CORS allowlist
- payload limits
- rate limits
- API typechecking

### Implementation Chat C: Generation and Retry Transactions

Owns:

- `submit_generation` RPC/API command
- `request_word_retry` RPC/API command
- idempotency key
- frontend wrapper changes
- concurrency tests

Recommended order:

1. Chat A starts first.
2. Chat B can run in parallel if it avoids migrations except optional rate-limit table/RPC.
3. Chat C should wait until Chat A has decided the migration source of truth and profile/credit permissions.

## Phase 1 scope

### P1.0 Define production and verify repo state

Outcome: a coder can tell which files are active production, which are dev-only, and which migration directory is canonical.

Tasks:

- Verify active repo root: likely `orchestrator/`.
- Verify whether `phase2b_push/`, `_review/`, `_spotcheck/`, `tmp/`, and similar folders are inactive snapshots.
- Verify canonical Supabase migration path.
- Create or update a short production boundary doc.
- Confirm whether local FastAPI is ever deployed publicly.
- Confirm whether Vercel `frontend/api/*` is the production API surface.
- Add/verify `frontend/api/**/*.ts` is typechecked.

Suggested file:

- `orchestrator/docs/PRODUCTION_BOUNDARY.md`

Acceptance criteria:

- The doc clearly says what production is.
- The doc clearly says local FastAPI workspace routes are local-only.
- The doc names the canonical migration folder.
- The doc names the active deployment surfaces.

### P1.1 Profile, role, credit, and permission lockdown

Plain-English problem:

> A normal user must not be able to make themselves admin or give themselves credits.

Tasks:

- Inspect current `profiles` policies.
- Inspect `admin_roles` and `is_admin()`.
- Check whether `profiles.role` still syncs into `admin_roles`.
- Remove broad self-update ability for privileged profile fields.
- Keep safe user-editable fields working, such as display name, base language, theme, and skin.
- Make `credits`, `role`, admin flags, billing fields, and internal flags server/admin-only.
- Prefer narrow RPCs or safe column grants over broad table updates.
- Add tests proving self-admin and self-credit edits fail.

Likely files:

- `orchestrator/frontend/supabase/migrations/*`
- `orchestrator/frontend/src/hooks/useAuth.ts`
- `orchestrator/frontend/src/components/AdminRoute.tsx`
- `orchestrator/frontend/src/pages/admin/Users.tsx`

Acceptance criteria:

- Non-admin user cannot update `profiles.role`.
- Non-admin user cannot update `profiles.credits`.
- Non-admin user cannot create an admin role for themselves.
- Normal profile preference updates still work.
- Existing admin route check still works.
- Admin/service-approved code path can still grant admin or credits.

### P1.2 Invite code boundary

Plain-English problem:

> Invite codes should have one safe door. The browser should not manually read codes and edit credits.

Tasks:

- Inspect `redeem_invite_code` RPC.
- Remove frontend fallback logic that directly reads `invite_codes` and updates `profiles.credits`.
- Remove broad authenticated read access to invite codes unless there is a strong reason to keep it.
- Harden the RPC with explicit `search_path` and row locking/concurrency safety if missing.
- Make admin invite management still work.

Likely files:

- `orchestrator/frontend/src/components/RedeemCodeDialog.tsx`
- `orchestrator/frontend/src/pages/Onboarding.tsx`
- `orchestrator/frontend/supabase/migrations/*invite*`
- `orchestrator/frontend/supabase/migrations/20260329100000_phase1_foundation.sql` or newer equivalent

Acceptance criteria:

- Redeeming a valid code works through RPC only.
- Non-admin users cannot list invite codes.
- Two concurrent redemptions cannot exceed `max_uses`.
- Direct profile credit update remains denied.

### P1.3 Paid API protection and rate limits

Plain-English problem:

> If an endpoint can cost money, it must know who is calling it, how often they call it, and whether they are allowed.

Protect these endpoints first:

- `/api/voice-chat`
- `/api/suggest-words`
- `/api/grok-token`

Tasks:

- Add a shared serverless auth helper that verifies Supabase JWT.
- Require auth for all three endpoints.
- Add per-user and per-IP rate limits.
- Use a durable limiter where possible. Do not rely only on Vercel in-memory state.
- Add request payload size limits.
- Add voice/audio duration or base64 size limits.
- Add max history length and max text lengths for voice chat.
- Add CORS allowlist for production domains and localhost dev.
- Add provider-call logging with user id, endpoint, provider, result, and rough cost class.
- Ensure no provider call happens before auth, quota, and payload validation pass.

Likely files:

- `orchestrator/frontend/api/voice-chat.ts`
- `orchestrator/frontend/api/suggest-words.ts`
- `orchestrator/frontend/api/grok-token.ts`
- `orchestrator/frontend/api/_shared/*`
- `orchestrator/frontend/tsconfig*.json`
- optional Supabase migration for rate-limit table/RPC

Acceptance criteria:

- Unauthenticated calls return `401`.
- Over-quota calls return `429` or another clear blocked status before provider calls.
- Oversized payloads return `413` or `400` before provider calls.
- Production CORS does not allow arbitrary origins.
- Local dev still works on localhost.
- API files are included in TypeScript checking.

### P1.4 Atomic generation submission

Plain-English problem:

> When a user generates a deck, the database should do the accounting, not the browser.

Current risky behavior:

- Browser checks credits.
- Browser creates or updates deck.
- Browser inserts words.
- Browser inserts generation job.
- Browser deducts credits.

Target behavior:

- Browser sends one generation intent.
- Server/database validates ownership and credits.
- Server/database creates deck, words, job, and credit debit in one transaction.
- Same request with same idempotency key returns same result instead of creating duplicates.

Tasks:

- Design and implement `submit_generation` as either a Supabase RPC or trusted API command.
- Prefer Supabase RPC for the first version if the main need is database transactionality.
- Include an idempotency key.
- Lock the profile/credit row during debit.
- Reject insufficient credits before creating job rows.
- Return deck id, job id, created word ids, credits remaining.
- Update `submitGeneration.ts` to call the command instead of directly mutating tables.
- Keep frontend validation for UX only, not security.

Likely files:

- `orchestrator/frontend/src/components/generate/submitGeneration.ts`
- `orchestrator/frontend/src/pages/GenerateGO.tsx`
- `orchestrator/frontend/src/components/generate/GenerateWizard.tsx`
- `orchestrator/frontend/supabase/migrations/*`

Acceptance criteria:

- One generation request creates deck/words/job and debits credits atomically.
- If credits are insufficient, nothing is created.
- If the same idempotency key is retried, no duplicate job/words are created.
- Two simultaneous submissions cannot overspend credits.
- Frontend no longer directly updates `profiles.credits` for generation.

### P1.5 Atomic retry request

Plain-English problem:

> Retrying a failed word should not be a custom browser sequence. It should be one safe command.

Tasks:

- Inspect current worker retry expectations: `claim_retry_word`, `retry_requested`, `retry_requested_at`, `failed_stage`, `current_stage`, `music_state`, and related fields.
- Implement `request_word_retry` RPC/API command.
- Validate user owns the word and deck.
- Validate the word is in a retryable state.
- Debit one credit atomically or reserve it if that is the current model.
- Set the retry fields the feeder expects.
- Create/associate retry job only if the existing worker design needs it.
- Update `DeckView.tsx`, `DeckViewPG.tsx`, and any music retry flow to use this command.

Likely files:

- `orchestrator/frontend/src/pages/DeckView.tsx`
- `orchestrator/frontend/src/pages/DeckViewPG.tsx`
- `orchestrator/frontend/src/pages/Music.tsx`
- `orchestrator/frontend/src/pages/MusicPG.tsx`
- `orchestrator/src/orchestration/feeder.py`
- `orchestrator/src/orchestration/state.py`
- `orchestrator/frontend/supabase/migrations/*`

Acceptance criteria:

- Retrying debits exactly one credit.
- Retrying creates/marks exactly one retry request.
- Repeated clicks do not create duplicate retry jobs.
- Invalid states are rejected.
- Worker still picks up retries normally.
- Frontend no longer directly updates credit for retry.

### P1.6 Restrict pipeline state and storage mutations

Plain-English problem:

> Users should be able to ask for actions, but they should not directly edit hidden worker state.

Tasks:

- Prevent normal users from directly updating worker-owned fields on `words`, `decks`, and `generation_jobs`.
- Worker-owned examples:
  - `words.status`
  - `words.current_stage`
  - `words.stage_attempts`
  - `words.failed_stage`
  - `words.music_state`
  - `words.video_url`
  - `words.thumbnail_url`
  - `generation_jobs.status`
  - `generation_jobs.priority`
  - `generation_jobs.words_completed`
- Keep safe user actions available through narrow RPCs or safe column grants:
  - rename deck
  - rate word
  - archive/delete own deck if supported
  - request retry
  - share word
- Fix `videos` storage policy so users cannot upload outside their own path, or make production uploads service-role only.
- Verify whether `audio` bucket exists and has policies.

Likely files:

- `orchestrator/frontend/supabase/migrations/*`
- `orchestrator/frontend/src/pages/DeckView.tsx`
- `orchestrator/frontend/src/pages/DeckViewPG.tsx`
- `orchestrator/frontend/src/hooks/useMoveWords.ts`
- `orchestrator/src/services/publishing.py`
- `orchestrator/src/services/suno_bakein.py`

Acceptance criteria:

- Non-admin user cannot directly set a word to complete.
- Non-admin user cannot directly set a job to approved or processing.
- Non-admin user cannot directly replace generated media URLs.
- Worker/service role can still update all pipeline fields.
- User can still perform allowed product actions through approved commands.
- Storage upload path ownership is enforced or uploads are service-only.

### P1.7 Local FastAPI exposure guard

Plain-English problem:

> Local development tools are powerful. They must not accidentally become public APIs.

Tasks:

- Confirm `STORAGE_MODE=cloud` disables local workspace/destructive routers.
- Add a startup warning or hard guard if local mode binds publicly without a local admin token.
- Document that local FastAPI routes are dev-only.
- Do not delete local mode yet.

Likely files:

- `orchestrator/src/app.py`
- `orchestrator/docs/PRODUCTION_BOUNDARY.md`
- deployment env examples

Acceptance criteria:

- Production cloud mode cannot mount local destructive routers.
- Local mode behavior remains available for development.
- The production boundary doc clearly warns against public local FastAPI exposure.

## Low-hanging fruit that is safe to do early

These are good early tasks because they reduce confusion and risk without broad rewrites:

1. Create `PRODUCTION_BOUNDARY.md`.
2. Add `tsconfig.api.json` or otherwise typecheck `frontend/api/**/*.ts`.
3. Add a shared CORS helper for Vercel APIs.
4. Add a shared Supabase JWT auth helper for Vercel APIs.
5. Remove invite-code fallback after verifying the RPC works.
6. Add tests for self-admin and self-credit denial.
7. Add tests for unauthenticated paid API rejection.
8. Add a local FastAPI production exposure warning/guard.
9. Verify `audio` bucket existence and document it.
10. Replace public share view-count update with a narrow increment RPC if time allows.

## Things not to do in Phase 1

Do not do these yet:

- Do not integrate Stripe before the credit system is safe.
- Do not build an iOS wrapper before mobile web and security are stable.
- Do not refactor all provider engines.
- Do not delete local DAW mode.
- Do not merge PG and non-PG UI variants.
- Do not rewrite `pipeline.py` broadly.
- Do not implement a full credit ledger unless Phase 1 is complete or the transactional RPC requires a minimal ledger table.
- Do not change generation aesthetics, prompts, or design polish unless needed for safety.

## Copy-paste master prompt for the next implementation chat

```text
You are working inside the Resonance repository. Your task is Phase 1 Focus Stabilization, not a broad rewrite.

Context:
- Resonance is a language-learning media generation app.
- Main active app is likely `orchestrator/`; GPU worker is likely `ltx-worker/`.
- Production appears to be Vercel frontend/API + Supabase Auth/DB/Storage + Railway/Docker Python job runner + LTX worker.
- Local FastAPI workspace routes are local/dev only and must not be treated as public production APIs.
- Existing docs are static audits. Verify the current repository before editing.

Primary goal:
Protect admin privileges, credits, paid AI endpoints, generation submission, retries, pipeline state, and storage from user/client tampering.

Safety rules:
1. Work on a new branch.
2. Do not apply migrations to production.
3. Do not print or expose `.env` secrets.
4. Do not delete legacy folders or duplicate UI variants.
5. Do not rewrite the whole app or provider pipeline.
6. Make small patches and explain each file changed.
7. Prefer tests or at least clear verification commands for every security-sensitive change.

Start with a verification pass:
- Confirm active repo root.
- Confirm canonical Supabase migration folder.
- Confirm current files for:
  - `frontend/src/components/generate/submitGeneration.ts`
  - `frontend/src/pages/DeckView.tsx`
  - `frontend/src/pages/DeckViewPG.tsx`
  - `frontend/src/components/RedeemCodeDialog.tsx`
  - `frontend/src/pages/Onboarding.tsx`
  - `frontend/api/voice-chat.ts`
  - `frontend/api/suggest-words.ts`
  - `frontend/api/grok-token.ts`
  - Supabase migrations for profiles, admin roles, invite codes, words, jobs, storage, transition RPCs.

Implement in this order:

1. Production boundary doc
- Create or update `orchestrator/docs/PRODUCTION_BOUNDARY.md`.
- State what is production, what is local-only, what migration folder is canonical, and what should not be deployed publicly.

2. Profile/role/credit lockdown
- Fix RLS/grants/RPCs so normal users cannot update `profiles.role`, `profiles.credits`, admin flags, billing fields, or internal fields.
- Keep safe preference updates working.
- Ensure `admin_roles` cannot be self-granted by changing `profiles.role`.
- Add tests or SQL verification for self-admin and self-credit denial.

3. Invite-code boundary
- Remove frontend fallback logic that directly reads `invite_codes` and updates `profiles.credits`.
- Make `redeem_invite_code` the only redemption path.
- Prevent non-admin users from listing invite codes.
- Harden the RPC with explicit `search_path` and concurrency safety if missing.

4. Paid API protection
- Require Supabase JWT auth for `/api/voice-chat`, `/api/suggest-words`, and `/api/grok-token`.
- Add CORS allowlist for production domains and localhost dev.
- Add payload size limits, audio/history/text limits, and per-user/per-IP rate limits.
- Ensure no provider call happens before auth, quota/rate, and payload validation pass.
- Add API TypeScript checking for `frontend/api/**/*.ts`.

5. Atomic generation submission
- Replace browser-side deck/word/job/credit mutation with one transactional RPC or trusted API command.
- Include idempotency key.
- Validate ownership and credits.
- Create deck, words, generation job, and debit credits in one transaction.
- Update `submitGeneration.ts` to call the command.
- Do not let the browser directly update `profiles.credits` for generation.

6. Atomic retry request
- Implement a `request_word_retry` command/RPC that validates ownership/state, debits credit once, sets the retry fields the worker expects, and prevents duplicate retries.
- Update `DeckView.tsx`, `DeckViewPG.tsx`, and any music retry flow to call it.
- Do not let the browser directly update credits for retry.

7. Pipeline/storage protection
- Prevent normal users from directly updating worker-owned fields on `words`, `decks`, and `generation_jobs`.
- Protect storage upload paths for `videos`, or make production media writes service-role only.
- Verify/create/document the `audio` bucket and policies.

Report format after each patch:
- Files changed.
- What risk this fixes.
- What user flow might break.
- Verification/test commands run.
- Anything still unresolved.

Do not continue to Stripe, iOS, UI redesign, provider abstraction, or major pipeline refactors until Phase 1 acceptance criteria are met.
```

## Specialized prompt: Database/RLS/Auth implementation chat

```text
Focus only on Resonance Phase 1 database authorization and RLS.

Inspect current Supabase migrations and live-intended schema. Do not assume old audit line numbers are current.

Fix these issues:
1. Normal users must not update `profiles.role`, `profiles.credits`, billing/admin/internal fields.
2. Normal users must not self-create or self-trigger `admin_roles`.
3. Admin role assignment must have one trusted path.
4. Invite codes must not be listable by normal users.
5. `redeem_invite_code` must be the only redemption path and must be concurrency-safe.
6. Normal users must not directly update pipeline-owned fields on `words`, `decks`, or `generation_jobs`.
7. `videos` storage uploads must be path-owned or service-only.
8. Verify/document `audio` bucket policies.

Create migrations only in the canonical migration folder. Do not apply to production.

Add or describe tests:
- user cannot self-admin
- user cannot self-credit
- user can update safe preferences
- user cannot list invite codes
- redeem invite works and respects max uses
- user cannot update `words.current_stage`, `words.status`, `words.video_url`, `generation_jobs.status`, or job priority
- user cannot upload outside own storage path

Return a clear diff summary and risk assessment.
```

## Specialized prompt: Paid API protection implementation chat

```text
Focus only on Resonance Phase 1 paid API protection.

Files of interest:
- `orchestrator/frontend/api/voice-chat.ts`
- `orchestrator/frontend/api/suggest-words.ts`
- `orchestrator/frontend/api/grok-token.ts`
- `orchestrator/frontend/api/_shared/*`
- frontend TypeScript configs

Implement:
1. Shared Supabase JWT verification helper.
2. Shared CORS allowlist helper: production domain(s) plus localhost dev.
3. Shared request-size/body validation helper.
4. Durable or best-available per-user/per-IP rate limiting. Do not rely only on in-memory state if Vercel/serverless is used.
5. Auth required for all paid endpoints.
6. No provider calls before auth, rate/quota, and payload validation.
7. API TypeScript checking for `frontend/api/**/*.ts`.

Endpoint behavior:
- unauthenticated = 401
- over rate/quota = 429 or clear blocked status
- oversized body/audio/history = 400/413
- provider error = sanitized response, no secrets, no raw provider internals

Do not redesign Speak UI. Do not change provider prompts except where needed for payload limits.

Return files changed, behavior changes, and test/verification commands.
```

## Specialized prompt: Generation transaction implementation chat

```text
Focus only on Resonance Phase 1 generation and retry transactionality.

Inspect first:
- `frontend/src/components/generate/submitGeneration.ts`
- `frontend/src/pages/GenerateGO.tsx`
- `frontend/src/components/generate/GenerateWizard.tsx`
- `frontend/src/pages/DeckView.tsx`
- `frontend/src/pages/DeckViewPG.tsx`
- `frontend/src/pages/Music.tsx`
- `frontend/src/pages/MusicPG.tsx`
- `orchestrator/src/orchestration/feeder.py`
- `orchestrator/src/orchestration/state.py`
- transition/retry Supabase migrations

Implement:
1. A transactional `submit_generation` command/RPC.
2. Idempotency key handling.
3. Atomic credit debit and deck/word/job creation.
4. Frontend change so `submitGeneration.ts` calls the command instead of writing tables directly.
5. A transactional `request_word_retry` command/RPC.
6. Frontend retry change so deck/music pages call the command instead of mutating credits/jobs/word state directly.

Rules:
- Browser may validate for UX but must not be trusted for credits.
- Browser must not directly debit `profiles.credits`.
- Browser must not directly create privileged job state.
- Repeated submit/retry with the same idempotency key must not duplicate jobs or charges.
- Insufficient credits must create nothing.

Return files changed, schema changes, frontend behavior changes, and tests/verification.
```

## Phase 1 final acceptance checklist

Phase 1 is done when all of this is true:

- [ ] The production boundary is documented.
- [ ] The canonical migration folder is documented.
- [ ] Normal users cannot self-admin.
- [ ] Normal users cannot self-edit credits.
- [ ] Normal users can still update safe preferences.
- [ ] Invite redemption uses only a safe RPC/command.
- [ ] Normal users cannot list invite codes.
- [ ] `/api/voice-chat` requires auth and rate limiting.
- [ ] `/api/suggest-words` requires auth and rate limiting.
- [ ] `/api/grok-token` requires auth and rate limiting.
- [ ] Paid endpoints reject oversized payloads before provider calls.
- [ ] Serverless API files are typechecked.
- [ ] Generation submit is atomic.
- [ ] Generation submit has idempotency.
- [ ] Retry request is atomic.
- [ ] Browser no longer directly debits credits for generation or retry.
- [ ] Browser cannot directly mutate worker-owned state fields.
- [ ] `videos` storage upload is owner-path constrained or service-only.
- [ ] `audio` bucket existence and policy are verified/documented.
- [ ] Local FastAPI destructive routes are clearly local-only and guarded from production exposure.
- [ ] Staging test confirms one full generation still works.

## Report template to bring back to the orchestration chat

```text
Phase 1 progress report

Branch:
Commit(s):

Completed:
-

Files changed:
-

Migrations added/changed:
-

Tests/commands run:
-

Manual flows tested:
-

What still worries me:
-

What broke or might break:
-

Questions for the lead chat:
-
```
