# Phase 1G Storage Cleanup Plan

Date: 2026-05-04

## Goal

Process `public.storage_cleanup_queue` rows created by trusted archive RPCs and delete the queued Supabase Storage objects with service-role credentials only.

## Current Queue Contract

`20260502160000_phase1e_user_deck_word_share_rpcs.sql` created `public.storage_cleanup_queue` with:

- `bucket`
- `object_path`
- `source_table`
- `source_id`
- `user_id`
- `status`: `pending`, `processing`, `complete`, `failed`
- `processed_at`
- `error_message`

Only admins can read queue rows through RLS. Browser clients have no insert/update/delete policy. Trusted RPCs enqueue object paths by deriving them from known word/deck records and storage URLs.

## Proposed Processor

Add a TypeScript service script under `frontend/scripts/` that can be run by:

- Railway worker
- Vercel cron
- manual `npm run ...` command

The script will:

1. Require `SUPABASE_URL` or `VITE_SUPABASE_URL`.
2. Require `SUPABASE_SERVICE_ROLE_KEY` or `SUPABASE_SERVICE_KEY`.
3. Select a bounded batch of queue rows where `status in ('pending', 'failed')`.
4. Validate each row before deletion:
   - bucket must be in the allowed bucket list, default `videos`
   - `object_path` must be relative
   - no leading slash
   - no URL-like path
   - no empty path
   - no `.` or `..` path segment
5. Claim each row by moving it to `processing`.
6. Call `supabase.storage.from(bucket).remove([object_path])`.
7. Mark successful rows `complete`, set `processed_at`, and clear `error_message`.
8. Mark failed rows `failed`, set `processed_at`, and store a concise error.
9. Best-effort insert an `admin_audit_events` row for failures.
10. Print a summary and exit non-zero only for invalid environment/configuration, not for per-row cleanup failures.

## Safety Properties

- Service role only: no browser token path and no anon-key fallback.
- Deletes only queued rows: command accepts no object path argument.
- Does not trust browser paths: queue is RLS-protected, and the processor validates paths again.
- Does not delete storage outside allowed buckets: default allowed bucket is `videos`; optional override is an explicit comma-separated bucket list.
- Retries are safe: failed rows are eligible on later runs; successful rows stay `complete`.
- Storage deletion is idempotent at the queue level: each row moves to `complete` only after the delete request succeeds.
- No paid providers are involved.

## Tests

Add a plain `tsx` test script with a mocked Supabase client:

- deletes a valid pending row and marks it complete
- skips disallowed buckets and marks them failed without calling Storage
- skips unsafe object paths and marks them failed without calling Storage
- retries a failed row
- records failure audit rows when Storage removal fails

## Verification

Run:

```powershell
npm run build
npm run typecheck:api
npm run test:api:paid
npm run test:phase1e:rls
npm run test:phase1f0:credits
npm run test:phase1f:admin
npm run test:phase1g:storage-cleanup
npx eslint scripts/process-storage-cleanup.ts scripts/test-storage-cleanup.ts
git diff --check
```
