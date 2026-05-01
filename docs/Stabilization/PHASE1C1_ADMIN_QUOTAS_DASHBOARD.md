# Phase 1C.1 Admin Quotas Dashboard

Date: 2026-05-02

## Summary

Added a narrow admin-only API Quotas page at `/admin/quotas`.

Files changed:
- `frontend/src/pages/admin/Quotas.tsx`
- `frontend/src/App.tsx`
- `frontend/src/components/layout/AppSidebar.tsx`
- `frontend/src/pages/Speak.tsx`
- `frontend/scripts/test-paid-api-protection.ts`

## Route And Access

- Route: `/admin/quotas`
- Guard: existing `AdminRoute`
- Layout: existing `AppLayout`
- Sidebar: adds `Quotas` under Admin navigation.

The existing broken `/admin/costs` sidebar item was left unchanged.

## RPC-Only Behavior

The page uses only these RPCs:
- `get_api_quota_admin_snapshot()`
- `set_api_quota_enforcement(p_enabled boolean)`
- `update_api_quota_config(p_action text, p_per_minute int, p_per_day int)`

The browser does not directly insert, update, or select from `api_quota_*` tables.

## UI Behavior

The page shows:
- Global enforcement mode:
  - `Monitor-only / Off`
  - `Enforced / On`
- Warnings:
  - “Monitor-only records usage but does not block provider calls.”
  - “Enforced blocks over-quota requests before provider calls.”
- Per-action rows for:
  - `voice_chat`
  - `suggest_words`
  - `grok_token`
- Per-minute limit, per-day limit, hard max values, recent usage total, updated timestamp.
- Editable per-minute/per-day values with client-side hard max validation.
- RPC errors if the migration is missing, admin access is denied, or hard max checks reject a change.

## Current Rollout Note

The linked Supabase remote does not yet have `20260502010000_phase1c_api_quota_limits.sql` applied. Until it is applied:
- `/admin/quotas` will render an RPC error from `get_api_quota_admin_snapshot`.
- Paid API endpoints will fail closed with 429 before provider calls for authenticated requests that reach quota.

## Verification

Checks run:
- `npm run build` passed. Vite reported the existing large chunk and mixed static/dynamic Supabase import warnings.
- `npm run typecheck:api` passed.
- `npm run test:api:paid` passed.
- `npm run test:regressions` passed.
- `npx eslint src/pages/admin/Quotas.tsx src/App.tsx src/components/layout/AppSidebar.tsx src/pages/Speak.tsx scripts/test-paid-api-protection.ts` passed.
- `git diff --check` passed.
