# Phase 1C Adversarial Review

Date: 2026-05-02

## Rollout Status

- Vercel deployment for commit `0b9c470` was reported successful by GitHub commit status.
  - Vercel target: `https://vercel.com/lokigod69s-projects/frontend/2myCbYfA72Vj4o1iBanKkJfaxTQ6`
  - Deployment URL inspected: `https://frontend-6t4h19fiv-lokigod69s-projects.vercel.app`
  - Deployment status: Ready / Production.
- Current production has since advanced to later `main` deployments. The inspected latest deployment still includes the protected lambda bundles for `api/voice-chat`, `api/suggest-words`, and `api/grok-token`.
- Vercel env var presence is confirmed:
  - `SUPABASE_URL`
  - `VITE_SUPABASE_URL`
  - `SUPABASE_ANON_KEY`
  - `VITE_SUPABASE_ANON_KEY`
  - `SUPABASE_SERVICE_ROLE_KEY`

## Migration Status

`frontend/supabase/migrations/20260502010000_phase1c_api_quota_limits.sql` is not applied to the linked Supabase project.

Evidence:
- `supabase migration list --linked` shows local `20260502010000`, remote blank.
- REST RPC probes returned `PGRST202` for:
  - `consume_api_quota`
  - `get_api_quota_admin_snapshot`
  - `set_api_quota_enforcement`
  - `update_api_quota_config`

Impact:
- Phase 1C paid endpoints fail closed with 429 at the quota step after auth/validation and before provider calls.
- The Admin Quotas page will show an RPC/schema-cache error until the migration is applied.

## Live SQL Semantics

Requested live SQL semantics could not be fully verified because the migration is not present on the linked remote database.

Blocked checks:
- service-role can call `consume_api_quota`
- authenticated non-service user cannot call `consume_api_quota`
- admin can call `get_api_quota_admin_snapshot`
- non-admin cannot call admin quota RPCs
- `set_api_quota_enforcement` toggles the singleton setting
- `update_api_quota_config` rejects values above hard max

What was verified instead:
- The linked remote schema does not currently expose the Phase 1C quota RPCs.
- With the current endpoint code, a quota RPC miss/failure maps to 429 and provider calls do not happen.

## Endpoint Order Review

`voice-chat`:
- `OPTIONS` returns before auth/quota/provider.
- `POST` calls `requireSupabaseUser`, then bounded JSON read, validation, `consumeApiQuota`, then provider flow.
- Provider URLs are only reached after quota succeeds.
- Upstream provider errors are sanitized.
- No auth tokens are logged.

`suggest-words`:
- `OPTIONS` returns before auth/quota/provider.
- `POST` calls `requireSupabaseUser`, then bounded JSON read, validation, `consumeApiQuota`, then OpenRouter.
- OpenRouter is not called on auth, validation, quota denial, or quota RPC failure.
- No auth tokens are logged.

`grok-token`:
- `OPTIONS` returns before auth/quota/provider.
- `POST` calls `requireSupabaseUser`, then rejects unexpected/oversized body, then `consumeApiQuota`, then xAI token minting.
- xAI is not called on auth failure, body rejection, quota denial, or quota RPC failure.
- No auth tokens are logged.

## Findings

1. Migration missing on linked Supabase remote.
   - Severity: rollout blocker for live provider usage and Admin Quotas.
   - Endpoint behavior is fail-closed, so this blocks provider spend rather than allowing unmetered spend.

2. Corrections-mode browser caller lacked Authorization.
   - Fixed in `frontend/src/pages/Speak.tsx`.
   - The corrections request now sends the current Supabase access token.

## Test Expansion

Expanded `npm run test:api:paid` to cover:
- invalid auth returns 401 with no provider calls
- quota RPC failure returns 429 with no provider calls
- disallowed CORS origin gets no `Access-Control-Allow-Origin`
- successful `grok-token` calls xAI only after auth/quota
- successful `voice-chat` calls providers only after auth/quota
- corrections-mode validation rejection does not call providers
- current frontend language values remain accepted for `native_language` and `base_language`

No paid providers were called by these tests.

## Deploy Safety

Phase 1C endpoint code is safe against unauthenticated or unmetered paid provider calls. It is not live-functional for authenticated paid endpoints until the quota migration is applied, because the endpoints correctly fail closed with 429 when quota RPCs are unavailable.
