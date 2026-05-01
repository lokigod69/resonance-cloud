# Phase 1C Paid API Verification

Date: 2026-05-02

## Checks Run

- `npm run build`
  - Result: passed.
  - Notes: Vite reported existing warnings for large chunks and `src/lib/supabase.ts` being both dynamically and statically imported.
- `npm run typecheck:api`
  - Result: passed.
- `npx eslint api/voice-chat.ts api/suggest-words.ts api/grok-token.ts api/_shared/*.ts src/hooks/useVoiceTutor.ts src/components/generate/steps/CategoryPicker.tsx scripts/test-paid-api-protection.ts`
  - Result: passed.
- `git diff --check`
  - Result: passed after normalizing touched text files.
- `npm run test:api:paid`
  - Result: passed.
- `npm run test:regressions`
  - Result: passed.

## Test Coverage Added

`frontend/scripts/test-paid-api-protection.ts` mocks Supabase Auth, quota RPC, and all paid provider hosts through `globalThis.fetch`.

Covered:
- `voice-chat` missing auth returns 401 and provider mocks are not called.
- `suggest-words` missing auth returns 401 and provider mocks are not called.
- `grok-token` missing auth returns 401 and provider mocks are not called.
- CORS preflight returns 204 and provider mocks are not called.
- `voice-chat` rejects oversized audio/history before provider calls.
- `suggest-words` rejects invalid input before provider calls.
- Over-quota returns 429 before provider calls.
- Successful mocked `suggest-words` reaches OpenRouter only after auth, validation, and quota.

No paid providers were called by tests.

## Not Run

- Live endpoint smoke tests against Groq, Mistral, ElevenLabs, Gemini, OpenRouter, or xAI were not run because Phase 1C verification must not call paid providers.
- Supabase migration was not applied from this workspace during this pass.

## Remaining Risks

- Production quota enforcement depends on applying the migration and configuring the service-role key in the API environment.
- Monitor-only default records usage but does not block over-limit requests until enforcement is enabled.
- The admin Quotas UI is not implemented in Phase 1C.

## Next Recommended Phase

Pipeline-field RLS hardening, after mapping remaining browser flows for moving/deleting/rating words, deck edits, admin queue actions, share counters, and storage cleanup.
