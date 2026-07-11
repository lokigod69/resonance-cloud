# SESSION HANDOFF — 2026-04-22 — GROK VOICE AGENT BUILD + PRODUCTION REGRESSION

## TL;DR

Built, reviewed, and merged Grok Voice Agent as a third Speak provider alongside Voxtral and Gemini. The architecture was deliberately standalone — zero changes to `useVoiceTutor.ts`, `voxtral.ts`, or `gemini.ts` — specifically to avoid regressing the existing providers.

**The invariant failed in production anyway.** All three providers are broken after the merge deployment. The failure mode suggests a shared-resource conflict (likely AudioContext or event dispatch in `Speak.tsx`) that diff review could not catch because all individual files look correct in isolation.

**Recommended immediate action:** revert the merge commit on `main`, restore pre-Grok production behavior, then investigate on a branch.

---

## What shipped this session

### The Grok Voice Agent feature (merged to main at `b531c8e`, fix at `816243f`)

Third Speak provider using xAI's Voice Agent API (Realtime WebSocket). Architecture:

- **Ephemeral token endpoint** — first authenticated serverless endpoint in the codebase (`/api/grok-token`). Validates Supabase JWT server-side, exchanges `XAI_API_KEY` for a short-lived client secret, returns it to the browser.
- **Standalone hook** — `useGrokRealtime.ts` owns WebSocket lifecycle, AudioWorklet-based PCM16 24kHz mic downsampling, inbound PCM playback queue with `AudioContext.currentTime` scheduling, barge-in via `input_audio_buffer.speech_started`, and its own copy of `primeAudioForIOS` + audio refs.
- **Session config builder** — `src/lib/grokSessionConfig.ts` constructs the `session.update` payload client-side. Injects level instructions (duplicated from `_shared/pedagogy.ts`), category prompt or free-chat prompt, and a tail instruction.
- **Nine categories + free chat** — Travel, Business, Romance, Philosophy, Daily Life, Food, Arts, News & Current Events, Free Chat. All terse ~3-sentence prompts from a single template. Web search tool enabled for all.
- **5-voice picker** — `eve`, `ara`, `rex`, `sal`, `leo` flat selection.
- **Migration** — two nullable columns on `speak_conversations`: `grok_voice`, `grok_category`, both with CHECK constraints. Applied successfully.
- **`XAI_API_KEY`** — added to Vercel as Sensitive, Production + Preview only.

### Existing work preserved (the invariant)

The design placed strict rules: zero line changes to `useVoiceTutor.ts`, `voxtral.ts`, `gemini.ts`, `_shared/pedagogy.ts`, `_shared/roleplay.ts`, `_shared/generic.ts`. Adversarial review verified zero lines changed in each. iOS audio primer was **duplicated** into `useGrokRealtime.ts` (byte-for-byte identical hash). Pedagogy text was duplicated into `grokPedagogy.ts`.

---

## Process followed

This session used the full discipline pattern that has worked on past features:

1. **Two read-only investigations** against live code (V1 + V2) producing paste-from-source reports with file paths and line ranges.
2. **V2 design doc** reconciling investigation findings + xAI documentation + ephemeral token spec + product decisions. Every claim verified.
3. **Implementation prompt** with six phased commits, pre-flight verification, explicit "What NOT to do" list, and a completion report format including SHA-256 hash comparison of the iOS primer to prove duplication.
4. **Adversarial review of the implementation prompt** against live code before dispatch.
5. **Codex dispatched** — completed six phases, committed feature branch.
6. **Adversarial review of the implementation** against the feature branch by a different agent. Returned FAIL with two blocking issues: (a) `primeAudioForIOS` called after an `await` in `startSession`, (b) raw xAI error text leaked in 502 responses.
7. **Fix prompt** narrowly scoped to the two blocking issues.
8. **Re-review of the fix** — PASS.
9. **Merge prompt** — `git merge --no-ff`, deliberate commit history preservation.
10. **Post-merge TypeScript error** surfaced in Vercel build (TS18047 on `tutor.voice` at `Speak.tsx:861`). Fixed with a one-line `if (!tutor.voice) return null` guard. Committed at `816243f`.
11. **Manual infrastructure steps completed by Sir Robert** — Supabase migration applied, CHECK constraints verified, `XAI_API_KEY` added to Vercel, Vercel redeploy triggered.
12. **Live test on production** — all three providers broken.

Every gate up to step 12 passed. The process worked exactly as designed; the production regression is not a process failure but a gap in what diff review can detect.

---

## What Sir Robert observed in live test

All tests performed on mobile against the latest Vercel deploy of `main` after the TS fix (`816243f`).

### Voxtral (Absolute Zero level, any character)
- Greeting text appears
- **No audio plays**
- Tapping the mic button appears to immediately send a message rather than starting a recording state. Flow is broken.

### Gemini (any mode + voice)
- Greeting text appears
- **No audio plays**
- Text mixes English and German within the same sentence — quality regression
- Tapping mic does put recorder in recording state; tapping again shows "thinking" but sends nothing — transcription doesn't appear

### Grok (Eve + Free Chat)
- Hit "Start conversation"
- **Nothing happens — stuck on loading indicator indefinitely**

### Grok (Sal + Bisaya/Cebuano)
- The Bisaya gray-out logic was specified for `fil` (Tagalog) only, not `ceb` (Bisaya)
- Clicking Start button doesn't start — UI snaps back to category grid, selections appear cleared, Start button greys out
- Suggests validation code is misfiring

---

## Diagnostic hypotheses (for next chat to verify)

These are educated guesses based on the symptom profile, not confirmed diagnoses. **The next chat should investigate before applying any fix.**

### Hypothesis 1: Shared AudioContext conflict
`useGrokRealtime.ts` creates its own `AudioContext`. `useVoiceTutor.ts` also creates one. Both hooks are instantiated in `Speak.tsx` unconditionally (React rules). Modern browsers — especially mobile Safari — have limits on concurrent AudioContexts per tab (often just one "playing" context at a time). The new Grok context might be taking ownership of the iOS audio session, leaving `useVoiceTutor`'s playback path silenced.

**Check:** does the audio pipeline in `useVoiceTutor` depend on `audioContextRef.current.state === 'running'`? If so, does the Grok hook's creation put it in 'suspended' or 'interrupted'?

### Hypothesis 2: Mic button event dispatch routed to wrong hook
Symptom: "tapping mic immediately sends" on Voxtral. If both hooks register listeners or both `startRecording` functions run, they may race. The "immediately sends" behavior matches a case where `startRecording` runs but is immediately followed by `stopRecording` before any audio is captured.

**Check:** does the mic button in the existing Voxtral/Gemini state-3 render call `tutor.startRecording()` or a wrapper that checks `activeProvider`? Does the Grok hook expose a conflicting handler?

### Hypothesis 3: pendingAudio / autoplay flow disrupted
`useVoiceTutor` has a `pendingAudio` state and a "tap to hear" button. The new dual-hook structure may have broken the flow where AudioContext activation triggers pending audio playback.

**Check:** is `pendingAudio` still being populated? Is the "tap to hear" button still rendering? Does anything in the new Speak.tsx flow clear it prematurely?

### Hypothesis 4: Grok hangs on token fetch
Grok's "stuck loading" symptom could be:
- `/api/grok-token` returning 500 (env var not live in this deployment yet despite being set)
- `/api/grok-token` returning 401 (Supabase JWT validation failing)
- WebSocket connection established but `session.update` response never arrives
- Token received but `session.update` payload malformed

**Check:** browser devtools Network tab on a failing Grok session. What does `/api/grok-token` return? Does a WebSocket connection get established? What events arrive on the socket?

### Hypothesis 5: Gemini English/German mixing
This is probably independent of the other three issues. Gemini language mix has drifted, possibly due to an unrelated upstream change or a prompt-text regression. Lower priority than the audio-gone bugs.

### Hypothesis 6: Bisaya Start button regression
`ceb` isn't in the planned gray-out list (only `fil` was). But the category picker or start-button handler may have new validation code that rejects Bisaya for reasons unrelated to Grok. Check `GrokPicker.tsx` and any language-check logic added in Phase 5.

---

## What worked correctly

- Six phased commits landed cleanly
- Adversarial reviews caught real bugs (iOS primer ordering, upstream error leak)
- Fix prompt + re-review caught those bugs before merge
- Grok column migration applied, CHECK constraints active in Supabase
- `XAI_API_KEY` added to Vercel (Sensitive, Production + Preview)
- TypeScript strict mode catches `tutor.voice` narrowing issue at build time — TS18047 at `Speak.tsx:861` fixed with one-line guard

---

## What did not work

- Production behavior of all three providers broke despite code-level invariant holding
- Diff review (six phased commits, two adversarial reviews) could not catch shared-resource runtime conflicts
- No live testing was done against the feature branch before merge to main — the path was Vercel main deploy → user test
- The `AudioContext` conflict hypothesis (if confirmed) was predictable and should have been caught in design review; it wasn't

---

## Files touched this session (reference for next chat)

### New files
- `frontend/api/grok-token.ts`
- `frontend/src/data/grokVoices.ts`
- `frontend/src/data/grokCategories.ts`
- `frontend/src/lib/grokPedagogy.ts`
- `frontend/src/lib/grokSessionConfig.ts`
- `frontend/src/hooks/useGrokRealtime.ts`
- `frontend/src/components/speak/GrokPicker.tsx`
- `frontend/public/audioWorklets/grokPcmDownsampler.js`
- `frontend/supabase/migrations/20260423000000_grok_speak_columns.sql`

### Modified files
- `frontend/src/components/speak/ProviderToggle.tsx` — extended to 3 options, `language` prop, `fil` gray-out
- `frontend/src/components/speak/VoiceTutorPicker.tsx` — `'grok'` dispatch arm, SpeakProvider type union
- `frontend/src/components/speak/SpeakHistoryPanel.tsx` — Grok badge + display name
- `frontend/src/pages/Speak.tsx` — top-level dispatch between old and new hooks, `useGrokRealtime()` added, post-Grok State 3 render block + one-line `tutor.voice` guard
- `frontend/api/voice-chat.ts` — Phase 6 cleanup, dead Grok branches removed

### Deleted files
- `frontend/api/prompts/grok.ts` — throwing stub removed

### Git state
- `main` at `816243f301d53d546537285cb8ee71f95ecedf3c` (post-TS-fix)
- Feature branch `feat/grok-voice-agent` deleted locally, still on remote (pending deletion confirmation from Sir Robert)

### Supabase state
- `speak_conversations.grok_voice text nullable` ✓
- `speak_conversations.grok_category text nullable` ✓
- `speak_conversations_grok_voice_check` CHECK constraint ✓
- `speak_conversations_grok_category_check` CHECK constraint ✓

### Vercel state
- `XAI_API_KEY` added as Sensitive, Production + Preview only, unticked Development
- Redeploy was triggered by Sir Robert after the env var add
- Other Vercel env vars (SUPABASE_SERVICE_ROLE_KEY, GOOGLE_AI_API_KEY) still flagged "Needs Attention" in the dashboard — unrelated to this work but should be cleaned up in a future pass

---

## Lessons and meta

- **Process was correct, prediction was wrong.** Every review gate functioned as designed. The gap is that even perfectly-isolated code paths can share runtime resources (AudioContext, mic stream, event dispatch) in ways that diff review cannot model.
- **Pre-merge live testing on feature branch** would have caught this. The process treated adversarial review + fix + re-review as sufficient evidence to merge. In the future, for features that touch audio/mic/realtime — deploy the feature branch to a Vercel preview URL, live-test the protected existing paths there, *then* merge. Cost: a few extra minutes; benefit: would have caught this exact class of bug.
- **Hypothesis 1 was discussable in design review.** Two simultaneous AudioContexts on mobile Safari is a known class of problem. It didn't come up in the V2 design discussion because we were focused on standalone *code* separation; the runtime AudioContext interaction didn't get named as a risk. Add it to the list.
- **The revert-and-investigate pattern is the right move.** Rebuilding Grok from scratch would throw away the correct 90%. Investigating the actual root cause lets us fix the minimum and preserve the work.

---

## Open follow-ups before next chat

Nothing that blocks investigation.

- Remote branch `feat/grok-voice-agent` is still on GitHub. Can be deleted after root cause is fully understood, or kept as an artifact if preferred.
- Non-blocking observations from the adversarial review (4-sentence category template, no token-expiry reconnect, trailing newline in voice-chat.ts, history panel ternary identity) remain as tech-debt tickets. Not part of this regression.
