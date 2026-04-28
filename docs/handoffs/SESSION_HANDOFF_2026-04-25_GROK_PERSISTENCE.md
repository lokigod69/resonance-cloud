# SESSION HANDOFF — 2026-04-25 — GROK TRANSCRIPT PERSISTENCE SHIPPED

## TL;DR

Grok Voice Agent transcript persistence fix shipped to `origin/main`. Four scoped fixes in one commit to `useGrokRealtime.ts`: assistant messages now persist (xAI audio-session event name was being ignored), final user turn survives End Conversation via bounded teardown drain, Supabase errors surface instead of silently dropping, and FIX 08 race guard closes the conversation-start FK race. Teardown is now single-flight (double-End-tap protection) and timer leaks in `Promise.race` sites are cleaned up. Adversarial-reviewed across two cycles — one blocker round caught and patched. Ready for iOS device testing.

---

## What landed this session

### The bug

Sir Robert's hands-on iOS test on 2026-04-25 surfaced a Grok transcript persistence problem: after ending a conversation, history showed **some user messages, zero Eve replies, and the final user turn was also missing**. Screenshot confirmed.

### Investigation outcome

Source-only investigation identified two distinct root causes:

**Cause A (high confidence, protocol mismatch) — all assistant messages missing.** Grok sessions are configured for audio output. xAI emits assistant transcript under `response.output_audio_transcript.delta` for audio sessions. The hook was only listening for `response.text.delta` (text-mode event, copied from OpenAI Realtime shape). `pendingAssistantContentRef` never accumulated, `response.done` persisted empty strings, and the `if (!content) return` guard in `persistSpeakMessage` short-circuited every write.

**Cause B (medium confidence, teardown race) — last user turn missing.** End Conversation closed the WebSocket synchronously without awaiting the final `conversation.item.input_audio_transcription.completed` event or in-flight persistence promises. If xAI hadn't delivered the transcript yet, or the Supabase write was still pending, the row didn't exist when the history panel loaded.

**Bonus finding — Supabase error shape.** `.insert()` returns `{ data, error }`; the code only caught thrown errors, not returned `{ error }` objects. FK/RLS/RPC failures would silently disappear — even FIX 08's intended FK violation wouldn't reach the expected `console.warn`.

### Implementation — one commit, one file

All four fixes bundled into `frontend/src/hooks/useGrokRealtime.ts`:

- **Fix 1 — Assistant transcript handling.** Added `response.output_audio_transcript.delta` branch alongside existing `response.text.delta`. Both feed `appendAssistantDelta`. Added `response.output_audio_transcript.done` mismatch warning (observability only, never overwrites the delta-accumulated string).
- **Fix 2 — Teardown drain.** New `pendingPersistencePromisesRef` tracks all in-flight persist promises. On teardown: flushes any pending user turn with a final `input_audio_buffer.commit` + `response.create`, waits up to 2000ms for the `completed` event, then drains persistence promises with `Promise.allSettled` + 3000ms bound. Then `ws.close`.
- **Fix 3 — Supabase error surfacing.** Manual `{ error }` destructure + throw at every insert/update/rpc site. `persistConversationStart` rollback (`conversationInsertedRef.current = false`) preserved on the new throw path.
- **Fix 4 — FIX 08 race guard.** Memoized in-flight insert promise at `pendingConversationInsertRef`. Subsequent callers await the same promise. `conversationInsertedRef.current` flips true only after the insert resolves.

### Adversarial review cycle

**Round 1 review** returned `BLOCK` with two real findings:

1. **Teardown re-entrancy.** Double-End-tap could race the first teardown's 2000ms transcription wait and close the socket early.
2. **Stale cross-session promise completion.** Session A's in-flight insert could resolve after session B started, mutating B's refs with A's result.

Both are classic async-lifecycle hazards the fresh-eyes review caught.

**Blocker patch applied** with three surgical additions:

- `teardownPromiseRef` memoizes the in-flight teardown promise; second callers await the first instead of re-entering.
- Captured `conversationIdRef.current` at `persistConversationStart` entry, with staleness guards on success/failure/finally paths. Stale completions log and return without mutating refs.
- `sleepWithCancel` helper replaces bare `setTimeout` in both `Promise.race` sites; `finally { cancelTimeout() }` prevents timer leaks.

**Round 2 re-review** returned `APPROVE FOR COMMIT+PUSH` clean. No new blockers, previous blockers addressed, untouched parts of the prior bundle verified unregressed.

### Non-blocking items deferred

- iOS device verification (real-world xAI event names, 2000ms/3000ms timeout sufficiency on slow connections, double-End-tap behavior in practice).
- Caller B's silent return when caller A's insert rejects — message is dropped, future messages retry. Acceptable for now.
- Runtime confirmation that both `response.text.delta` and `response.output_audio_transcript.delta` don't both fire in the same session (xAI docs imply they don't; defensive handling covers the case if they do).

---

## Multi-agent git protocol — now in force for every session

Stored to memory; applies to every implementation prompt going forward:

> Every implementation session begins with `git pull --rebase origin main`. Agent reports incoming commits or conflicts before touching any file. Stage only files modified for the scoped task — never `git add -A`. Commit + push happen as one op only after adversarial review clears. On push rejection, rebase and retry — never force-push. Report any files left dirty or staged at session end. Never stash, revert, or commit files outside task scope. Never end session with own work uncommitted unless Sir Robert explicitly says hold.

This session was the first full cycle under the rule. It worked: one file, tight scope, clean review, surgical blocker patch, clean re-review, clean push. The rule prevents the cross-agent working-tree collisions that made the prior session (level picker ship) messy.

---

## What's still queued

Roughly priority order; Sir Robert decides.

### Immediately next — iOS device testing

Fresh Grok session walk-through:
1. Start → Voice → Mode → Level → Start → Eve greets.
2. Speak multiple turns, let Eve respond each time.
3. Tap End immediately after speaking.
4. Check history: both user turns and Eve replies visible, final turn not dropped.
5. Repeat with End tapped mid-Eve-response.
6. Repeat with rapid double-tap End (tests teardown single-flight).

If all three scenarios show complete transcripts, we're done with the persistence story. If something's off, drafted instrumentation prompts from the investigation are ready to deploy.

### Conversation quality work (Sir Robert's next focus)

With persistence now reliable, the next phase is improving **what** Eve says and **how** she teaches:
- System prompt tuning per level (`getGrokLevelInstructions` in `grokPedagogy.ts`).
- Pedagogy: correction style, vocabulary pacing, conversation scaffolding per level.
- Persona voice: how Eve and other characters behave, signature phrases, conversational register.
- Mode-specific behavior: Free Chat vs travel vs business vs roleplay.
- Study mode integration: how deck words get surfaced without feeling forced.

Separate investigation + implementation cycle, probably starting with Sir Robert prose-drafting desired behavior examples and comparing against current prompts.

### Other open tracks from prior sessions

- **FIX 06 — back button partial reset.** Original prompt preserved at `FIX_PROMPT_06_BACK_BUTTON_PARTIAL_RESET.md`. Lost from working tree in a prior session before commit. Re-dispatching produces the known-good diff.
- **Finding A — intermittent mic glitch producing corrupted user-only history rows.** Source investigation narrowed candidates; drafted instrumentation prompt in the investigation report. Ship to Vercel preview, reproduce on iOS, captured logs feed next pass.
- **Finding B — Eve's volume drops on second response.** Source investigation ranked candidates; drafted instrumentation prompt also in the investigation report. iOS Safari audio-session category/mode shift is the leading candidate.
- **Bonus finding — `ws.onmessage` and `ws.onclose` not cleared on `teardownSession`.** Real source-level hazard regardless of Finding A. Small standalone fix, possibly bundled with Finding A's eventual fix once iOS logs inform the diagnosis.
- **localStorage hardening cleanup pass.** Wrap all `localStorage.setItem` sites in try/catch uniformly for Safari private mode / restricted storage. Low priority, low risk.

### Zombie items

Nothing. The `zombie-backend-preserve-2026-04-24` stash was dropped after Phase 2B shipped as `0851db8`. No leftover stashes.

---

## Files touched this session

- `frontend/src/hooks/useGrokRealtime.ts` — only file modified.

No schema changes, no backend changes, no other frontend files, no LoRA / Suno / song-pipeline changes.

---

## Documents produced this session

- `INVESTIGATION_REPORT_GROK_TRANSCRIPT_BUG.md` — source investigation identifying Cause A + Cause B + error-surfacing observation.
- `IMPLEMENTATION_PROMPT_GROK_PERSISTENCE_FIX.md` — four-fix bundled implementation prompt.
- `ADVERSARIAL_REVIEW_GROK_PERSISTENCE.md` — round 1 review, returned BLOCK with two blockers.
- `FIX_PROMPT_GROK_PERSISTENCE_BLOCKERS.md` — targeted fix prompt for the two blockers plus timer leak cleanup.
- `ADVERSARIAL_RE_REVIEW_GROK_PERSISTENCE.md` — round 2 re-review, returned APPROVE FOR COMMIT+PUSH.
- `COMMIT_PUSH_GROK_PERSISTENCE.md` — ship dispatch.
- Three drafted instrumentation prompts (event stream, persistence result, End Conversation ordering) inside the investigation report, not dispatched — available if iOS testing reveals deeper issues.

---

## Optimistic note

Two adversarial review rounds earned their cost. Round 1 caught real hazards that would have shipped and produced intermittent user-facing bugs hard to debug later (session corruption from stale cross-session refs is exactly the class of bug that haunts production). The blocker patch was surgical, known-pattern, and clean. The workflow discipline is paying out.

If iOS testing shows clean transcripts end-to-end, the Grok functional story is done and Sir Robert can pivot to conversation quality work.
