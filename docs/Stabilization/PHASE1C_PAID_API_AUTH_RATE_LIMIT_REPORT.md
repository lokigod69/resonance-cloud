# Phase 1C Paid API Auth And Rate Limit Report

Date: 2026-05-02

## Files Changed

- `frontend/api/voice-chat.ts`
- `frontend/api/suggest-words.ts`
- `frontend/api/grok-token.ts`
- `frontend/api/_shared/auth.ts`
- `frontend/api/_shared/cors.ts`
- `frontend/api/_shared/http.ts`
- `frontend/api/_shared/quota.ts`
- `frontend/supabase/migrations/20260502010000_phase1c_api_quota_limits.sql`
- `frontend/tsconfig.api.json`
- `frontend/scripts/test-paid-api-protection.ts`
- `frontend/package.json`
- `frontend/src/hooks/useVoiceTutor.ts`
- `frontend/src/components/generate/steps/CategoryPicker.tsx`
- `docs/Stabilization/PHASE1C_PAID_API_PRECHECK.md`

## Migration

Added `20260502010000_phase1c_api_quota_limits.sql`.

New tables:
- `public.api_quota_settings`
- `public.api_quota_config`
- `public.api_quota_usage`
- `public.api_quota_audit_events`

New RPCs:
- `public.consume_api_quota(p_user_id uuid, p_action text, p_request_fingerprint text default null)`
- `public.get_api_quota_admin_snapshot()`
- `public.set_api_quota_enforcement(p_enabled boolean)`
- `public.update_api_quota_config(p_action text, p_per_minute int, p_per_day int)`

`consume_api_quota` is service-role only. Admin RPCs require `public.is_admin()` and reject limits above migration-owned hard maximums.

## Endpoint Behavior

All three protected endpoints now follow:

`OPTIONS/CORS -> auth -> body guard/JSON parsing -> validation -> quota -> provider call`

`voice-chat`:
- Requires `Authorization: Bearer <Supabase access token>`.
- Rejects invalid/missing auth with 401 before reading the request body.
- Validates JSON shape, language keys, provider/mode values, audio size, history size, transcript size, scenario prompt, character fields, and study words before any provider call.
- Uses the `voice_chat` quota action before Groq/Mistral/ElevenLabs/Gemini calls.
- Sanitizes upstream provider failures.

`suggest-words`:
- Requires Supabase auth.
- Enforces a 16 KB raw JSON body limit.
- Validates category, target language, base language, count `1..10`, and rejects unexpected fields before OpenRouter.
- Uses the `suggest_words` quota action before OpenRouter.

`grok-token`:
- Requires Supabase auth.
- Rejects unexpected request bodies and oversized bodies.
- Uses the `grok_token` quota action before xAI token minting.
- Sanitizes xAI failures.

## Quota Defaults

Global enforcement defaults to monitor-only/off. Usage is still recorded.

Starting config:
- `suggest_words`: 10/minute, 200/day, hard max 30/minute and 1000/day
- `voice_chat`: 6/minute, 120/day, hard max 15/minute and 500/day
- `grok_token`: 3/minute, 40/day, hard max 10/minute and 150/day

When enforcement is disabled, the quota RPC returns `allowed=true` with `mode='monitor_only'`. When enabled, over-limit requests return `allowed=false`; the API helper responds with 429 before provider calls.

If the server quota client cannot be configured or the RPC fails, endpoints fail closed with 429 and do not call providers.

## CORS

Paid endpoints no longer return wildcard CORS. Allowed browser origins:
- `https://resonanz.pro`
- `https://www.resonanz.pro`
- localhost/127.0.0.1/::1 development origins
- HTTPS Vercel preview origins ending in `.vercel.app`

Unknown production origins receive no `Access-Control-Allow-Origin`. OPTIONS responses do not call auth, quota, or providers.

## Frontend Callers

- `useVoiceTutor` now reads the current Supabase session and sends `Authorization` to `/api/voice-chat`.
- `CategoryPicker` now sends `Authorization` to `/api/suggest-words` and reports a friendly session-expired error if no token is available.
- `useGrokRealtime` already sent auth to `/api/grok-token`; no change was needed there.

## Admin Quotas Page

Skipped for Phase 1C. Endpoint protection was prioritized. The migration includes admin-only RPCs so a narrow `/admin/quotas` UI can be added in Phase 1C.1 without browser table writes.

## Known Limitations

- The migration must still be applied to Supabase before live quota usage is recorded.
- Default quota mode is monitor-only, so over-limit blocking requires enabling enforcement.
- The test suite mocks Supabase and providers; it proves endpoint order and mock call counts, not live provider behavior.
- No broad RLS tightening was done for words/decks/generation jobs.

## Rollout

1. Apply `20260502010000_phase1c_api_quota_limits.sql`.
2. Deploy the frontend/API changes with Supabase anon and service-role environment variables configured.
3. Leave quota enforcement monitor-only for initial observation.
4. Inspect `api_quota_usage` and admin snapshot RPC output.
5. Enable enforcement through `set_api_quota_enforcement(true)` when ready.
