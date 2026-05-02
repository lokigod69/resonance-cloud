# Phase 1F Admin RPC Report

Date: 2026-05-03

## Scope

Phase 1F moved privileged admin command mutations out of the browser and into audited SQL RPCs. The frontend admin pages now submit command intent, while the database owns credit balances, role source of truth, queue status transitions, refund amounts, invite code writes, system setting writes, and content archive/delete cleanup.

## Migration

Migration:

- `frontend/supabase/migrations/20260503020000_phase1f_admin_command_rpcs.sql`

The migration was applied directly with `psql` against the linked database and then recorded with:

- `supabase migration repair --linked --status applied 20260503020000`

This avoided a broad `supabase db push`, because unrelated local-only migrations still exist. `supabase migration list --linked` confirms:

- `20260503010000` is Local and Remote.
- `20260503020000` is Local and Remote.
- Unrelated local-only migrations remain and were not applied, including versions such as `20260404000000`, `20260406200000`, `20260406210000`, `20260407000000`, `20260408000000`, `20260409000000`, `20260409100000`, `20260416004500`, `20260418000000`, `20260418000100`, `20260418`, `20260420000000`, `20260420191500`, `20260420`, `20260421000000`, `20260422000000`, `20260423000000`, `20260429090000`, `20260501000000`, `20260501010000`, `20260501020000`, `20260501030000`, `20260502000000`, and `20260503000000`.

## Schema Changes

Added or reused:

- `public.admin_audit_events`
- `public.generation_jobs.admin_rejected_at`
- `public.generation_jobs.admin_refunded_at`
- `public.generation_jobs.admin_refund_amount`

The audit table records:

- actor user id
- action
- target table and id
- reason
- before snapshot
- after snapshot
- metadata

## RPCs Added

- `admin_adjust_user_credits(p_user_id uuid, p_delta int, p_reason text)`
- `admin_set_user_role(p_user_id uuid, p_role text, p_reason text)`
- `admin_create_invite_code(p_code text, p_credits int, p_max_uses int, p_reason text)`
- `admin_toggle_invite_code(p_code_id uuid, p_active boolean, p_reason text)`
- `admin_update_system_setting(p_key text, p_value jsonb, p_reason text)`
- `admin_approve_generation_job(p_job_id uuid, p_reason text)`
- `admin_reject_generation_job(p_job_id uuid, p_refund boolean, p_reason text)`
- `admin_archive_content(p_kind text, p_id uuid, p_reason text)`

## Privileged Mutation Guards

The migration tightens direct privileged writes:

- Admin role writes must use audited admin RPCs.
- Invite code writes must use audited admin RPCs.
- System setting updates must use audited admin RPCs.
- Profile privileged fields no longer trust browser admin sessions directly; RPCs set transaction-local trusted flags.
- Phase 1E pipeline-protected fields no longer trust browser admin sessions directly; RPCs set transaction-local trusted flags.

## Refund Behavior

`admin_reject_generation_job` locks the job, uses `generation_jobs.credits_charged` as the refund source of truth, and stores refund state on the job.

Repeated reject/refund calls are idempotent:

- first refundable rejection credits exactly `credits_charged`
- later calls do not refund again when `admin_refund_amount` is already set

The browser may display `credits_charged` as a preview, but it does not compute or apply refunds.

## Frontend Files Changed

- `frontend/src/pages/admin/Queue.tsx`
- `frontend/src/pages/admin/Users.tsx`
- `frontend/src/pages/admin/Content.tsx`
- `frontend/package.json`
- `frontend/scripts/test-phase1f-admin-rpcs.ts`
- `frontend/scripts/test-paid-api-protection.ts`

Admin Queue now displays deck type, credits charged, cost per word, and refunded amount where practical.

## Quota And Provider Safety

`api_quota_settings.enforcement_enabled` remains `false`.

No paid providers were called. Tests used SQL/REST/Auth paths only.

## Remaining Work

- Build a storage cleanup worker/cron for rows enqueued by `admin_archive_content` and Phase 1E cleanup helpers.
- Consider adding a dedicated admin audit viewer page.
- Consider adding richer rejection reason UX so admin-entered reasons are captured instead of fixed page-generated reasons.
