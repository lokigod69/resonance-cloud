# SESSION HANDOFF — 2026-04-24 — GROK UX BATCH (PHASE 1 → FIXES 01-07 → OPEN ITEMS)

## TL;DR

The Grok Voice Agent end-to-end experience is largely working on iOS. Push-to-talk is responsive, transcript suppression during the active session works, the protocol rewire from server-VAD to manual commit is shipping, and conversation history persistence to Supabase is live. Sir Robert's hands-on test confirmed the architecture is sound — Eve speaks, the mic responds, transcripts render correctly in history.

But the batch is not closed. Three things need addressing: (1) FIX 06 (back button partial-reset preserving language + selections) was staged in the working tree, lost in a working-tree event during concurrent backend agent work, and never committed; (2) FIX 08 (a race guard fix for `persistConversationStart` that was identified by adversarial review of FIX 07 but not yet implemented) is needed to prevent silent FK violations on slow networks; (3) Sir Robert observed three live-test findings that warrant investigation — an intermittent mic-handling glitch that produces corrupted user-only transcripts, a volume drop on Eve's second turn, and a UX design need to surface level selection in the pre-session Grok picker.

The plan has not collapsed. It just paused at the FIX 06 boundary while a Phase 2B backend agent was operating concurrently and a working-tree mishap dropped the staged changes. FIX 07 is committed and pushed at `d7aeadd` and is functional. The work picks up cleanly from "re-apply FIX 06, then FIX 08 with adversarial review, then ship the new findings."

---

## What landed this session

### Commits on `origin/main`

- **`bafb661`** — Phase 1 (prior session, included for context). Push-to-talk redesign: `turn_detection: null`, manual `input_audio_buffer.commit` + `response.create`, unified `GrokStatus` state machine, center-button UI, transcript suppression during active session, End Conversation with inline transcript reveal, corrections panel gated off for Grok.
- **`8ec0fbd`** — Tail-loss flush/commit ordering fix. Mic teardown moved before `commit` so worklet-produced PCM cannot leak past the commit message. Worklet gained a "stopped" state to make the invariant provable.
- **`e3a506b7f804092ca49a4a3675f2e8322ab55063`** — Bundled commit for FIXES 01 through 05 from the Speak-feature batch:
  - FIX 01: extended `Speak.tsx:473` Grok picker branch with `&& !grokShowTranscript` so End Conversation actually reaches the transcript reveal branch.
  - FIX 02: anchored Gemini level-zero and beginner greetings with `"Open with a ${targetLangName} greeting"` to discourage the "Hello my friend" English leak. Structural anchor, no negative instructions.
  - FIX 03: study mode toast on toggle (`@/components/Toast`); new chat confirmation modal (`@/components/ui/dialog`). Gated to non-Grok State-3 only.
  - FIX 04: Grok becomes the default Speak provider; Tagalog (`fil`) one-way auto-fallback to Voxtral. `defaultProviderFor(lang)` helper centralizes the fallback logic.
  - FIX 05: Gemini header split into two lines — voice name on line 1, mode + language on line 2. Truncation regression resolved.
- **`d7aeadd`** — FIX 07: Grok conversation transcript persistence to `speak_messages`. New `persistSpeakMessage` helper, `pendingAssistantContentRef` accumulating delta text, `message_count: 1 → 0` so invariant `message_count === count(speak_messages)` holds after greeting writes. Pushed pre-adversarial-review.

### Adversarial reviews completed

- `ADVERSARIAL_REVIEW_01_05.md` — passed clean. One product question (Grok always wins on entry vs respect persisted choice — Sir Robert chose option A) plus three non-blocking follow-ups (vowel-initial article grammar in greetings; German/French translations not yet provided for new toast/dialog keys; pre-existing `handleProviderChange` drift).
- `ADVERSARIAL_REVIEW_06_07.md` — found one blocking issue (F-07.1, race guard described below) plus minor flags. FIX 07 had already been pushed before this review ran, so the fix moves to a follow-up commit (FIX 08, drafted but not yet implemented).

### Pre-existing local working-tree state

`1914220` exists on local `main` ahead of `origin/main` and has not been pushed. Per Phase 2B agent confirmation, that commit is unrelated backend work (Phase 2B observability) and Phase 2B's working tree has been hard-reset to match `origin/main` for the Voice Tutor files specifically. The Phase 2B agent will push their backend work without affecting frontend files.

---

## What did NOT land this session

### FIX 06 — Back button partial reset (uncommitted, lost from working tree)

Spec: introduce `useVoiceTutor.endAndReturnToPicker` (a copy of `resetConversation` minus the single line `setLanguage(null)`). Wire it to: Voxtral/Gemini State-3 back button, roleplay scenario picker top-level back button, and the Grok active-session back button (via a rewritten `resetGrokConversation` that becomes a partial reset preserving `tutor.language`, `activeProvider`, `selectedGrokVoice`, `selectedGrokCategory`, and `grokLevel`).

State at session end: implementation was completed by an agent. Adversarial review (`ADVERSARIAL_REVIEW_06_07.md`) confirmed it clean with one scope flag (the roleplay goBack swap was not explicitly spec'd but was a defensible judgment call — Sir Robert confirmed: keep it). Sir Robert dispatched the commit-and-push prompt. The implementer reported back that the working tree no longer contained FIX 06 — both files match `HEAD` at `1914220` with zero diff after CRLF normalization. Hypothesis: the Phase 2B agent's stale working-tree event, an editor reload, or an EOL-conversion trigger silently dropped the unsaved staged changes.

The original FIX 06 implementation prompt (`FIX_PROMPT_06_BACK_BUTTON_PARTIAL_RESET.md`) is preserved. Re-applying is a single dispatch with the same spec.

User-visible consequence right now: tapping back from an active Grok session lands on the home/language picker instead of the pre-session Grok voice/category picker — Sir Robert noticed this in his test ("Start new conversation... and then I'm completely at the home page where I can choose my provider"). This is expected until FIX 06 ships.

### FIX 08 — `persistConversationStart` race guard (drafted, not implemented)

Adversarial review of FIX 07 found that the `await persistConversationStart()` guard inside `persistSpeakMessage` does not actually serialize on the conversation-row insert's *completion*. It serializes on the insert's *start* — `conversationInsertedRef.current` flips true synchronously before the `supabase.from('speak_conversations').insert()` round-trip. A second caller (e.g., `persistSpeakMessage` for the user's first turn) sees the flag true, returns from the guard immediately, and proceeds to `insert speak_messages` against a foreign key that does not yet exist in DB. The DB rejects with FK violation, the `try/catch` swallows it as a `console.warn`, and the message is silently lost.

In practice this is latent on fast networks (greeting audio generation takes seconds; Supabase inserts take 100-500ms; the conversation row usually exists by the time any second persist fires). On slow networks or when the user speaks during the greeting, it can hit. Most likely to manifest as user-turn rows missing from the persisted history.

The fix prompt is drafted at `FIX_PROMPT_08_RACE_GUARD.md`. The fix memoizes the in-flight insert promise so a second caller awaits the same promise the first caller created. `conversationInsertedRef.current` flips true only after the await resolves. Small change, contained to `persistConversationStart` plus two ref-reset sites in `startSession` and `teardownSession`.

The prompt explicitly instructs "stage only, do not push" — this fix MUST be adversarially reviewed before push. FIX 07 going out pre-review is how we got here.

---

## Live-test findings (Sir Robert, this session)

### Finding A — Intermittent mic glitch produces corrupted user-only history rows

Symptom: occasionally on session start, the first mic tap doesn't register. Subsequent taps either also fail to register or the system enters a state where it's recording but won't acknowledge a tap-to-send. When this happens, the resulting `speak_conversations` row in history shows only user-side bubbles (no assistant response), and each user bubble extends the previous one — Sir Robert's first phrase appears as "Hello, hello, are you talking with me now?" in bubble 1, then "Hello, hello, are you talking with me now? I'm sending it" in bubble 2, etc. Each bubble starts with the same opening fragment and elongates.

Diagnostic significance: this is the same failure mode as the pre-Phase-1 cascade, which means something is intermittently putting the session into a server-VAD-like state where xAI is re-emitting `conversation.item.input_audio_transcription.completed` events with progressively longer transcripts. The Phase 1 architecture explicitly rules out server VAD (`turn_detection: null` confirmed). So either:

- xAI is re-emitting the same turn's transcript as deltas-misclassified-as-completed under some condition (server-side bug or undocumented behavior),
- the client is not properly tearing down the worklet on tap-to-send and is sending PCM after the commit (revisit FIX `8ec0fbd` tail-loss invariant under stress),
- iOS Safari is doing something funky with the AudioContext under specific resume conditions,
- or there's a race between `startListening` and a half-torn-down prior turn.

What helps: this is reproducible enough that Sir Robert hit it once during this session and saw the corrupted history row. It does NOT happen every session — most sessions worked perfectly. Reproduces more on re-entry (start session, talk, end, start a new session, mic glitches). Worth instrumenting before guessing.

### Finding B — Eve's volume drops on the second response

First Eve response after a session start plays at normal volume. Second response (after Sir Robert's first user turn) plays at noticeably lower volume — "very, very low volume," roughly half. Loudness does not recover within the session.

Diagnostic significance: classic iOS Safari AudioContext quirk shape. Possible causes: AudioContext suspend-then-resume halving gain on iOS; `playheadRef` arithmetic accumulating something that causes overlapping `BufferSource` nodes; the iOS audio session category/mode shifting when the mic graph opens then closes; or some interaction between the worklet's "stopped" state from `8ec0fbd` and subsequent `queueAudioBuffer` calls.

Worth a focused investigation. Source-side starting points: `queueAudioBuffer` in `useGrokRealtime.ts`, `playheadRef`, the `silentPrimerRef` lifecycle, the AudioContext lifecycle.

### Finding C — Level selection should live in pre-session Grok picker

Sir Robert's design call: the Grok pre-session picker should require all three selections — Voice → Mode (free chat / travel / business / etc.) → Level — before the Start Conversation button activates. Each conversation chooses its own level. No mid-session level change.

This is simpler than the alternative we'd previously discussed (mid-session level change via `session.update`), which had unverified protocol behavior with xAI. Pre-session selection avoids the protocol question entirely.

This is a UI redesign of the Grok pre-session picker, not a hook-level change. Affects `Speak.tsx` Grok pre-session branch (around line 473 post-FIX-01). Should preserve the level for that conversation in `grokLevel` state — same plumbing as today, just adds a level-picker step in the UI flow.

Open design question for Sir Robert: should the Start Conversation button render disabled until all three selections are made? Or should level default to "intermediate" and become editable? Recommend: require explicit selection, show button as disabled with tooltip "select a level" if level is null.

---

## State of git

- `origin/main`: `d7aeadd` (FIX 07).
- Local `main`: `1914220` (one commit ahead, Phase 2B backend work, Sir Robert has not pushed).
- Phase 2B agent: working on a backend-only commit, has hard-reset their copy of frontend Voice Tutor files to match `origin/main`. Will push backend changes without disturbing frontend.
- FIX 06: lost from working tree, never committed anywhere.
- FIX 08: drafted, not implemented.

---

## What to do first in the next session

1. **Verify `1914220` does not touch frontend files.** Quick `git show --stat 1914220`. If it's pure backend, it's safe and can stay or be pushed at any time. If it inadvertently touched frontend files, investigate before push.

2. **Decide FIX 06 recovery path.** Two options: (a) check VSCode editor history (`~/.config/Code/User/History/`) for a recoverable copy of the staged changes — if found, restore in 30 seconds; (b) re-dispatch the original FIX 06 prompt to a fresh agent. The original prompt is at `FIX_PROMPT_06_BACK_BUTTON_PARTIAL_RESET.md` and was already adversarially reviewed clean — re-applying is low-risk. Recommend (a) attempted first, fall back to (b).

3. **Dispatch FIX 08 with explicit "stage only, do not push" discipline.** Adversarially review before push.

4. **Investigate Findings A and B.** These need source-level investigation before fix prompts can be written. Finding A likely requires WebSocket frame logging during a reproducible mic-glitch session on iOS — without that runtime evidence, source review can only enumerate possibilities. Finding B may be more amenable to source-only investigation (AudioContext lifecycle has a finite surface).

5. **Implement Finding C** (level in pre-session picker). Self-contained UI change, low risk, ships independently.

---

## Workflow discipline notes

- **FIX 07 was pushed before adversarial review.** Do not repeat. Every fix prompt going forward should explicitly say "stage only" in the implementation prompt, and the implementer should hand back to Sir Robert for review-then-commit, not commit-then-review.
- **The CRLF / EOL incident around FIX 06.** Whatever editor or tool flipped EOLs and dropped unsaved changes — worth checking `.gitattributes`, `.editorconfig`, and `core.autocrlf` for surprises. Not blocking but worth a low-priority pass.
- **Concurrent agent work is now a thing in this repo.** Phase 2B backend agent worked in parallel with frontend Speak fixes. Coordination so far: explicit cross-checks of working tree state. Going forward, agents should announce file-touch scope at session start.

---

## Files referenced

- `INVESTIGATION_REPORT_GROK_UX.md` — Phase 1 investigation.
- `INVESTIGATION_REPORT_VOXTRAL_GEMINI_UX.md` — Voxtral/Gemini UX investigation.
- `INVESTIGATION_REPORT_GROK_PHASE2.md` — Grok Phase 2 investigation (back button, history, mid-session controls, etc.).
- `ADVERSARIAL_REVIEW_01_05.md` — review of fixes 01-05 (clean).
- `ADVERSARIAL_REVIEW_06_07.md` — review of fixes 06-07 (F-07.1 blocking finding).
- `FIX_PROMPT_06_BACK_BUTTON_PARTIAL_RESET.md` — the original spec for FIX 06, ready to re-dispatch.
- `FIX_PROMPT_08_RACE_GUARD.md` — drafted fix for the F-07.1 race.
- `INVESTIGATION_GIT_STATE_FORENSICS.md` — drafted but not yet dispatched. May or may not be useful depending on what next session decides about FIX 06 recovery.
