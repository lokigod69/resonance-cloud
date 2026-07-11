# SESSION HANDOFF — 2026-04-23 — GROK CONNECTS, SESSION STABLE, UX BUGS SURFACE

## TL;DR

The Grok Voice Agent session now connects end-to-end and Eve speaks. Two bugs from the prior session resolved: the token-parsing shape mismatch (client read `client_secret.value`, xAI returns top-level `value`) and the callback-identity churn that caused the WebSocket to self-close immediately after opening. A third-party curl against `POST https://api.x.ai/v1/realtime/client_secrets` confirmed the live response shape before the fix was written.

Sir Robert tested on iOS against production. Session establishes, Eve delivers a greeting, mic tap initiates audio streaming, conversation continues. That's the architectural success.

But the UX has a cascade of bugs that make the feature unusable despite the underlying connection being healthy. Most are in the mic/transcript render logic, not the Voice Agent protocol itself — the investigation and fix scope is localized to `Speak.tsx`, `useGrokRealtime.ts`, and possibly `grokSessionConfig.ts`.

Separately: the iOS Voxtral/Gemini shared-session regression from the prior session was **not tested again** this session. Its status is unknown. It may have resolved incidentally (Sir Robert recalled it "working" at one point) or may still be live.

---

## Commits landed this session

### `7047778` — `fix(grok): parse top-level client_secret value per xAI/OpenAI GA shape`
Two-line change in `useGrokRealtime.ts:354` and `:359`. Type annotation and field path corrected to `json?.value` matching xAI's current response shape (`{"value": "xai-realtime-client-secret-...", "expires_at": N}`). Pushed direct to main, deployed successfully.

### `b2c5153` — `fix(grok): stabilize callback identities to prevent session self-tear-down on open`
Four changes in two files:

1. `useGrokRealtime.ts` — `stopListening` dep array changed from `[isConnected, status]` to `[]`, with refs `isConnectedRef` and `statusRef` added and synced via effects, reads in the body swapped to `.current`. This is the root of the fix — the callback chain upstream (`teardownSession`, `endSession`) inherits stability.
2. `useGrokRealtime.ts` — mount effect at line 553-559 wrapped via `teardownSessionRef`, deps emptied to `[]`.
3. `Speak.tsx` — language-change effect at lines 220-236 uses `endGrokSessionRef.current()`, deps reduced to `[tutor.language]`.
4. `Speak.tsx` — unmount cleanup effect wrapped via `endGrokSessionRef` and `stopAllAudioRef`, deps emptied to `[]`.

Adversarial review confirmed correctness before push. Rebased onto origin/main (commit renamed through rebase), pushed, Vercel deployed successfully.

### Supabase, Vercel state
No schema changes this session. `XAI_API_KEY` confirmed live (curl against xAI returned a valid token envelope). The Vercel dashboard display hiding the value of Sensitive variables caused initial confusion but was not a bug — the key was populated throughout.

---

## The curl that unblocked the token diagnosis

```
POST https://api.x.ai/v1/realtime/client_secrets
Authorization: Bearer <XAI_API_KEY>
Content-Type: application/json
Body: {"expires_after":{"seconds":600}}
```

Response (redacted):
```json
{"value":"xai-realtime-client-secret-<REDACTED>","expires_at":1776885546}
```

This confirms: xAI is OpenAI-Realtime-GA-compatible. Top-level `value`, no `client_secret` wrapper. The investigation had ruled out env-var issues but couldn't determine response shape without the curl. Once the shape was known, the fix was unambiguous.

---

## What works now

Tested on iOS Safari against production:

- Grok → English → voice picker → category picker → level picker → "Start conversation"
- `/api/grok-token` returns 200 with valid token
- WebSocket connects to `wss://api.x.ai/v1/realtime` with `xai-client-secret.<token>` subprotocol
- `session.update` and `response.create` fire, server responds
- Eve delivers a spoken greeting
- Mic tap opens audio stream to server
- Subsequent tap closes audio stream
- Eve generates responses based on user audio

The WebSocket no longer self-closes on session start. The core Voice Agent protocol is live.

---

## What is broken (the bug cascade Sir Robert observed)

### B1 — Transcript pollution: mic tap prints interim transcript as a chat bubble
**Symptom:** User taps mic → begins speaking → partial transcript appears as a text bubble in the chat before the user has finished. Every subsequent tap appends another partial transcript starting from the first sentence, so after 4 mic presses there are 4 bubbles each longer than the last.

**Expected:** during a turn, the UI should show a visual indicator that the user is speaking (pulse, orb, small indicator near the mic button), but the actual transcribed text should not render in the chat bubbles at all during the turn. It should only appear after the turn ends, or be suppressed entirely — Sir Robert's preference: **suppress user transcript rendering entirely in Grok mode.** Grok's UX is voice-first; the user already knows what they said. Only Eve's spoken text needs visible rendering for accessibility/translation.

**Suspected root cause:** `useGrokRealtime.ts` is accumulating `input_audio_buffer.transcript` or similar server-side transcript delta events into the `messages` array without resetting state between turns, OR the messages array is being append-rendered every time a new transcript delta arrives. Needs investigation — the transcript event flow on the Voice Agent side + how it maps into `messages` state.

### B2 — Level lock-in: no way to change level once session starts
**Symptom:** After "Start conversation," there is no UI affordance to switch level. The user is locked into the initial level choice for the entire session.

**Expected:** either a level picker in the Grok State-3 header (mirroring Voxtral/Gemini where this already works via `tutor.cancelLevelChange`), OR at minimum a "New chat" button that returns to the level picker without unwinding the whole language/voice/category chain.

**Suspected root cause:** `Speak.tsx` Grok State-3 render branch (lines 646-835) has no level-change control. Voxtral/Gemini have a similar in-session level change feature via `startRoleplay` / `cancelLevelChange`; no equivalent wired for Grok.

### B3 — Language mismatch: Eve speaks German when English was selected
**Symptom:** Sir Robert chose English → free chat → tapped Start. Eve's greeting: `"Hallo, schön das du anrufst. Wie geht es dir heute?"` That's German. When Sir Robert responded, Eve auto-corrected `"hallo" ist ein freundlicher englischer Gruss. Sag 'hello' wenn du ans Telefon gehst..."` — teaching English **in German**, as if the target language is German and the user's native language is... also some kind of German-accented English?

**Expected:** when target language is English, Eve speaks English for the greeting and for all teaching. When target language is German, Eve speaks German for the greeting. The language should flip based on the selected target language, not the user's base/profile language.

**Suspected root cause:** `src/lib/grokSessionConfig.ts` builds the `instructions` field for `session.update`. The instructions probably reference `nativeLanguageDisplay` vs `languageDisplay` incorrectly, or the system prompt template is hardcoded with German defaults, or `startGrokConversationWithLevel` in `Speak.tsx` is passing the wrong field as `language` vs `nativeLanguageDisplay`. Needs investigation of the session config build and the prompt template.

### B4 — The "hello" English-greeting regression
**Symptom:** Even when English is the target language, Eve's greetings include awkward "hello" phrasing. This mirrors a known Gemini bug: `"the stupid 'hello' stuff again."` It's prompt drift — something in the system prompt template says "greet with hello" and it's leaking inappropriately when target ≠ English.

**Likely shared root cause with Gemini bug** — possibly a shared `_shared/pedagogy.ts` or greeting-template constant that was duplicated (per the standalone invariant) into `grokPedagogy.ts` and carries the same defect.

### B5 — Mic button state confusion after send
**Symptom:** After the user taps mic to send, the mic button stays red (recording state) when it should have returned to idle (blue/neutral). Sir Robert is sometimes unable to tell whether his tap registered, so he doesn't know if he's starting a new recording or waiting for Eve.

**Expected:** mic button renders as `recording` (red, pulse) ONLY while audio is streaming; reverts to `idle` (neutral mic icon) the moment `stopListening` is called; shows some `thinking`/`processing` state while Eve is generating; shows `playing` or similar while Eve's audio is streaming back.

**Suspected root cause:** `useGrokRealtime.ts` `isListening` state is not flipping back to `false` after `stopListening()`, OR the mic button's className logic in `Speak.tsx` lines 796-830 is reading the wrong state field.

### B6 — Eve sometimes doesn't respond after "send"
**Symptom:** After a correctly-registered user turn, Eve doesn't speak again. Unclear if this is because the WebSocket is in a bad state, because the transcript-pollution in B1 sent 4 copies of the same utterance and confused the server, or because the server's response is arriving but not being played.

**Likely downstream of B1** — if the message buffer has polluted/duplicated user turns, the server's response to "the user said the same thing 4 times" may be semantically confused, or may never trigger at all. Fix B1 first; re-test B6.

### B7 — Unnecessary "Corrections" panel in Grok
**Symptom:** A corrections-style panel (the kind used in Voxtral/Gemini modes for grammar correction surfacing) is rendering in Grok too. Sir Robert: `"we don't need that correction stuff in grok right now; it's just unnecessary."`

**Expected:** suppress `<CorrectionsPanel />` (or whatever component renders corrections) when `activeProvider === 'grok'`.

**Suspected root cause:** `Speak.tsx` renders `setCorrections(null)` / `corrections` state gets populated, and the render branch for Grok may be re-using a panel from Voxtral/Gemini. Easy to gate on `activeProvider`.

---

## Architectural context surfaced this session

### Push-to-talk vs hands-free (UX question)

The current Grok UX is push-to-talk: mic button gates audio streaming. The user tap opens the stream, another tap closes it. This is NOT the hands-free "always listening, server VAD detects turn boundaries" agent pattern that Sir Robert originally imagined when building Grok.

The underlying Voice Agent API supports both patterns. The push-to-talk pattern was built as the default. Moving to hands-free would require:

1. Auto-call `startListening()` inside `startSession` after `ws.onopen` resolves
2. Confirm `turn_detection: {type: 'server_vad'}` is set in `session.update` (currently unverified — needs read of `grokSessionConfig.ts`)
3. Replace mic button with a mute toggle or an "end call" button
4. Test barge-in (should work — `input_audio_buffer.speech_started` is already handled)

**Sir Robert's preference (stated this session):** keep both modes. Add a toggle so the user can choose push-to-talk or hands-free. The default preference is TBD until real-world testing.

**Sequencing caveat:** hands-free mode keeps the mic open continuously, which grabs the iOS audio session for the full session duration. This worsens the iOS Voxtral/Gemini shared-session conflict hypothesis unless resolved first via shell extraction (see Deferred Work below).

### Voice Agent architecture is confirmed, not TTS

For the record, because this came up as a concern this session: what we built IS the Voice Agent realtime WebSocket. Evidence: `wss://api.x.ai/v1/realtime` endpoint, ephemeral client-secret tokens, AudioWorklet PCM16 24kHz mic streaming, `input_audio_buffer.speech_started` handling for barge-in, five agent voices (Eve/Ara/Rex/Sal/Leo). Not a REST TTS call. The feeling of "it's just TTS" comes from the push-to-talk UX, not the protocol.

---

## Process notes

### What worked
- Codex investigation against pinned commit with paste-from-source reports.
- Adversarial review of the callback-stabilization implementation (4 changes across 2 files) caught zero new bugs but added confidence for a non-trivial refactor pattern.
- The two-line token fix was shipped without adversarial review because the change was binary-correctness (curl confirmed shape, code was changed to match). Correctly sized the review discipline to the change.
- External AI second-opinion (during the regression investigation) converged independently on the shared-session iOS hypothesis. Cross-model consensus was useful signal.

### What did not work yet
- Live in-session UX testing of Grok after the core connection was fixed. The UX bug cascade (B1–B7) was surfaced only in Sir Robert's hands-on iOS test. There's no path to catch transcript-rendering or state-machine bugs via static diff review. Mirror iOS testing via a Vercel preview URL before any future audio/mic feature ships to main.
- We have not yet verified whether iOS Voxtral/Gemini still have the shared-session audio-silence regression. Sir Robert: "I think it was working." Status: unknown.

### Pre-existing tech debt observed, not addressed
- `useGrokRealtime.ts:384` — `setStatus(isConnectedRef.current ? 'idle' : 'idle')` — both branches return `'idle'`. Likely a typo from the original implementation; Codex correctly did not touch it because the fix prompt said not to. File as tech debt.
- `Speak.tsx:247` — `speakMode` roleplay-switch effect still lists `endGrokSession` in its deps. After the callback-stability fix this is functionally fine (stable reference, won't re-fire spuriously) but inconsistent with the other effects. Small consistency cleanup; not a bug.

---

## Deferred work (not attempted this session)

### iOS Voxtral/Gemini shared-session regression
Prior session diagnosis: both `useVoiceTutor` and `useGrokRealtime` unconditionally mount in `Speak.tsx`, each creates its own iOS silent-primer `HTMLAudioElement` and AudioContext. iOS Safari allows only one media-session owner. The previously-hypothesized fix: extract a `<GrokShell />` child component that internally calls `useGrokRealtime`, render only when `activeProvider === 'grok'`. This would make Grok's audio resources mount/unmount with the provider selection.

**This fix is still deferred.** Sequencing recommendation: next chat should verify whether the regression is still live on current `b2c5153` before designing the shell extraction. If the regression resolved itself (plausible — some earlier state was cleared by the callback-stabilization fix since it closed orphaned AudioContexts via `teardownSession`), the shell extraction is a nice-to-have rather than a blocker.

Independent of whether the regression is live, the shell extraction becomes a **hard prerequisite** if we ship hands-free Grok mode, because hands-free = continuously-open mic = sustained iOS audio session ownership by Grok.

### Gemini English "hello" greeting regression + English/German mixing
Still live. Independent from the Grok work. Gemini generates German-laced English or English-laced German greetings inconsistent with the target language setting. Likely a prompt template defect in `_shared/pedagogy.ts` or `api/prompts/gemini.ts`. Low priority until core Grok is stabilized.

### Bisaya Start-button snap-back
Still live. Localized to `GrokPicker.tsx` or the language-validation path. Small surface, easy to fix once we look at it. Not blocking.

---

## File reference

### Files touched this session
- `frontend/src/hooks/useGrokRealtime.ts` — token parser fix + callback stabilization
- `frontend/src/pages/Speak.tsx` — effect dependency ref patterns

### Files likely in scope for next session (UX bug fixes)
- `frontend/src/hooks/useGrokRealtime.ts` — transcript state, isListening state, turn flow
- `frontend/src/pages/Speak.tsx` — Grok State-3 render, mic button className logic, level-change affordance, corrections panel gating
- `frontend/src/lib/grokSessionConfig.ts` — target language plumbing, greeting prompt, system instructions
- `frontend/src/lib/grokPedagogy.ts` — shared pedagogy text duplicated from `_shared/pedagogy.ts`; may contain the "hello" template issue

### Git state
- `main` at `b2c5153` (local) / equivalent commit hash on `origin/main` after push+deploy
- No active feature branches
- Remote `feat/grok-voice-agent` branch still present on GitHub (from prior session), can be cleaned up

### Vercel state
- Latest successful production deploy triggered by push of `b2c5153`
- `XAI_API_KEY` live, confirmed via curl
- No other env-var changes this session
