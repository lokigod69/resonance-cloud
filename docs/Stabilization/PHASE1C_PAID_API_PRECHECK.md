# Phase 1C Paid API Precheck

Date: 2026-05-02

## `frontend/api/voice-chat.ts`

- Auth: no Supabase authentication is required before processing the request.
- CORS: returns `Access-Control-Allow-Origin: *`; preflight allows `POST, OPTIONS` and `Content-Type`.
- Request validation/body limits: parses `req.json()` directly. It validates `language` after parsing, checks corrections transcript counts only after parsing, and has no raw body size guard, audio size guard, history size guard, or strict shape validation before provider work.
- Provider calls it can trigger: Groq STT, Groq chat/completions for normal chat and corrections mode, Mistral TTS, ElevenLabs TTS, Gemini TTS.
- Current risk: an unauthenticated caller can submit oversized JSON/audio/history or malformed-but-expensive payloads that reach paid providers. Upstream error details may be returned in some 502 responses.

## `frontend/api/suggest-words.ts`

- Auth: no Supabase authentication is required.
- CORS: returns `Access-Control-Allow-Origin: *`; preflight allows `POST, OPTIONS` and `Content-Type`.
- Request validation/body limits: parses `req.json()` directly. It validates category, target language, base language, and count after parsing, but has no raw body size guard.
- Provider calls it can trigger: OpenRouter chat/completions using `deepseek/deepseek-v3.2`.
- Current risk: unauthenticated callers can spend OpenRouter quota. Oversized bodies are parsed before rejection. There is no durable per-user quota.

## `frontend/api/grok-token.ts`

- Auth: requires `Authorization: Bearer <token>` and verifies it with Supabase Auth using an anon client.
- CORS: returns `Access-Control-Allow-Origin: *`; preflight allows `POST, OPTIONS`, `Authorization`, and `Content-Type`.
- Request validation/body limits: no body is required, but unexpected body content is not size-checked before the xAI token request.
- Provider calls it can trigger: xAI realtime `client_secrets` token minting.
- Current risk: auth exists, but there is no durable quota/rate limit before xAI token minting, CORS is wildcard, and upstream timeout errors can be exposed.

## Typechecking And Quota Baseline

- `frontend/api/**/*.ts` is not included in the existing frontend TypeScript project references. There is no `frontend/tsconfig.api.json` or package script for API typechecking.
- No durable `api_quota_*` tables, `consume_api_quota` RPC, or shared API quota helper exists under `frontend/api/_shared`.

## Risks Before Phase 1C

- Paid provider calls can be reached without authentication on `voice-chat` and `suggest-words`.
- Authenticated but abusive users can call all three endpoints without durable minute/day limits.
- Oversized request bodies can be parsed before rejection.
- Wildcard production CORS makes browser-origin enforcement ineffective.
- Inconsistent error responses can leak upstream/provider internals.
