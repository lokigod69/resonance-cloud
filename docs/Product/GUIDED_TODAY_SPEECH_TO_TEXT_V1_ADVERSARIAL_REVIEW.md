# Guided Today Speech-to-Text V1 Adversarial Review

## Verdict

Pass with fixes.

The implementation is viable after review fixes. The endpoint is a Vercel Function, requires Supabase bearer auth, validates request shape/audio/MIME before quota/provider work, consumes the existing `voice_chat` quota action, calls only Groq Whisper STT, and returns only `{ "transcript": string }`.

## Git Truth

- Branch reviewed: `main`
- Speech-to-text implementation commit present on reviewed history: `c31c61b` (`Implement guided today speech transcription`)
- Commit reviewed before this adversarial review patch: `c0e6ab97555e0d340d52dca295ab9e36c14a9991`
- Final commit SHA pushed to `origin/main`: the commit containing this report; exact SHA is reported in the final response after push
- Worktree before review was not clean. Pre-existing dirty files were left untouched except for the files listed below.

## Files Changed During Review

- `frontend/api/guided-transcribe.ts`
- `frontend/src/data/guidedLessons.ts`
- `frontend/scripts/test-guided-speech-check.ts`
- `frontend/scripts/test-paid-api-protection.ts`
- `docs/Product/GUIDED_TODAY_SPEECH_TO_TEXT_V1_ADVERSARIAL_REVIEW.md`

## Bugs Found

1. Bad guided-transcribe bodies authenticated before request validation.
   - Impact: malformed/oversized/rejected bodies could hit Supabase Auth before being rejected.
   - Fix: `POST` now reads and validates the JSON body under the app limit before `requireSupabaseUser`, then consumes quota, then calls Groq.

2. Non-POST behavior relied on platform fallback.
   - Impact: the code did not explicitly prove `GET`/`PUT` rejection in local tests.
   - Fix: added explicit `GET`, `PUT`, `PATCH`, and `DELETE` exports returning `405` with `Allow: POST, OPTIONS`.

3. Lesson 1 real speak-target data did not accept the core answer variant.
   - Impact: the synthetic checker test passed, but the real lesson could mark “Do you speak English?” incorrect when the target included an intro phrase.
   - Fix: added shared lesson-1 speak core config for Bright, Wistful, and Sharp with accepted variants and ordered required tokens.

4. Local endpoint reachability is easy to test incorrectly.
   - Impact: `npm run dev` uses Vite’s `/api` proxy to FastAPI at `localhost:8090`; `frontend/api/guided-transcribe.ts` is a Vercel Function, and FastAPI has no `guided-transcribe` route.
   - Fix: documented the correct local test path below. No proxy change was made because other local `/api/*` workflows rely on the FastAPI proxy.

## Endpoint Reachability

| Environment | Result |
| --- | --- |
| `npm run dev` | Not sufficient for STT. `/api/guided-transcribe` is proxied by Vite to `http://localhost:8090`; source search found no FastAPI `guided-transcribe` route, so expect local API failure there. |
| Vercel production | Reachable. `frontend/vercel.json` routes `/api/(.*)` to `/api/$1`, and `frontend/api/guided-transcribe.ts` exports Vercel Function HTTP handlers. |
| `vercel dev` | Intended local full-stack path. Vercel documents `vercel dev` as the local environment for testing Vercel Functions. |

References used: [Vercel Functions API reference](https://vercel.com/docs/functions/functions-api-reference), [Vercel dev](https://vercel.com/docs/cli/dev), [Vercel Functions limits](https://vercel.com/docs/functions/limitations), [Groq Speech to Text](https://console.groq.com/docs/speech-to-text).

## Security/Auth/Quota Findings

- Frontend sends `Authorization: Bearer <Supabase access_token>` from `supabase.auth.getSession()`.
- Missing/invalid auth returns `401` before quota and provider calls.
- Invalid body, unsupported MIME, conversation/history payloads, and oversized audio reject before auth, quota, and provider calls.
- Success order is body validation -> auth -> quota -> Groq STT.
- Provider call sequence is proven in tests as `auth`, `quota`, `provider:groq-stt`.
- No bearer tokens are logged. Server logs only safe error messages.
- Provider errors are sanitized; raw provider bodies are not returned.
- CORS uses the Phase 1C helper and does not wildcard arbitrary origins.
- `voice_chat` quota reuse is acceptable for V1 but remains technical debt; a future `guided_transcribe` quota action would improve observability and limits.
- Current quota concurrency is as strong as Phase 1C infrastructure allows: the Supabase RPC uses atomic `insert ... on conflict do update` counters. Denied requests still increment counters by design.

## Body Size And Provider Compatibility

- App JSON body limit: `4 MB` via `readJsonWithLimit`.
- Decoded audio limit: `2.4 MB`; base64 string limit: `3,200,000` chars.
- Vercel platform request/response body limit is `4.5 MB`, so bodies above that can be rejected by Vercel before app code runs.
- Rejected guided-transcribe bodies do not consume quota after the review fix.
- Accepted browser MIME paths include Safari/iOS `audio/mp4` and non-Safari `audio/webm`/Opus.
- Groq’s STT docs list `mp4`, `ogg`, `wav`, and `webm` among supported direct upload formats.
- The endpoint maps MIME to upload filename extensions: `mp4`, `webm`, `mp3`, `wav`, `ogg`.

## UI/Data Boundary

- No new writes to `speak_conversations`, `speak_messages`, `decks`, `words`, `generation_jobs`, `profiles.credits`, Supabase storage, or local transcript/audio fields were found.
- The transcript is held in React state for display and answer checking only.
- Local progress stores attempts, match score, and pass/continue status only; `test-guided-today-data.ts` verifies raw speech transcripts are not stored.
- Old browser-native `speechRecognition.ts` is no longer used by the Today speak UI; it remains only as a legacy/helper import for static data tests.

## Tests And Checks Run

- `npm run build` - passed; existing Vite chunk/dynamic import warnings remain.
- `npm run check:i18n` - passed; known warn-only French gaps remain unrelated to guided speech keys.
- `npm run typecheck:api` - passed.
- `npx tsc -p tsconfig.app.json --noEmit` - passed.
- `npx tsx scripts/test-guided-speech-check.ts` - passed.
- `npx tsx scripts/test-paid-api-protection.ts` - passed; provider calls are mocked/intercepted.
- `npx tsx scripts/test-guided-today-data.ts` - passed, `8975 passed, 0 failed`.
- `npx tsx scripts/test-guided-today-path-overview.ts` - passed, `166 passed, 0 failed`; existing weak generic item warnings remain.
- `npx tsx scripts/test-guided-vibes.ts` - passed, `98 passed, 0 failed`.
- `npx eslint api/guided-transcribe.ts src/hooks/useGuidedSpeechRecognition.ts src/lib/guidedSpeechCheck.ts src/components/today/SpeakStep.tsx src/data/guidedLessons.ts scripts/test-guided-speech-check.ts scripts/test-paid-api-protection.ts` - passed.
- `git diff --check` - passed.
- `git diff --cached --check` - passed before staging.

## Tests Not Run

- Live browser microphone QA was not run in this review session.
- Live Groq STT was not called; automated tests intentionally avoid paid providers.
- `vercel dev` was not started because manual QA needs the tester’s Vercel/Supabase local env and browser login.

## Manual QA Instructions

1. From `D:\CODING\ResonanceTEST\orchestrator\frontend`, start the Vercel local environment:
   ```powershell
   npx vercel dev --listen 5173
   ```
   If `5173` is busy, use another port and open that port.

2. Do not use plain `npm run dev` for speech-to-text QA. It can render the UI, but `/api/guided-transcribe` will go to FastAPI through the Vite proxy and is not the Vercel Function.

3. Make sure local Vercel env has:
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GROQ_API_KEY`

4. Open `http://localhost:5173/login`, sign in with a Supabase test account, then open `http://localhost:5173/today`.

5. Start A1 Practical 1, reach the Speak step, and record:
   ```text
   Do you speak English?
   ```
   `Hi, do you speak English?` and `Hello, do you speak English?` should also pass.

6. Expected result:
   - Network tab shows `POST /api/guided-transcribe`.
   - Response body is only `{ "transcript": "..." }`.
   - The transcript box appears under “Du hast gesagt”.
   - The feedback chip turns green with `Richtig.`
   - Continue becomes enabled automatically.

7. To confirm the endpoint is being hit, open DevTools -> Network and filter for `guided-transcribe`.
   - `401`: session/access token missing or expired.
   - `413` or `400`: body/audio/MIME rejected before quota/provider.
   - `429`: quota unavailable or exceeded.
   - `502`: Groq STT unavailable or timed out; raw provider body should not appear.
   - `404` while using `npm run dev`: wrong local command; switch to `vercel dev`.

## Remaining Risks

- Local full-stack STT depends on using `vercel dev`; plain Vite dev remains intentionally FastAPI-proxied.
- The quota action is still `voice_chat`, so STT-only usage is not separately visible in quota admin surfaces.
- Quota enforcement depends on the deployed Supabase Phase 1C quota migration and current enforcement setting.
- Browser MediaRecorder behavior still varies by device; iPhone/Safari should prefer `audio/mp4`, but live device QA is still required.
