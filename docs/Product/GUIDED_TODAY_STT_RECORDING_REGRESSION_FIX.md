# Guided Today STT Recording Regression Fix

Date: 2026-05-17

## Verdict

Pass with fix. The regression was in the Guided Today Speak step recording control UI, not in `/api/guided-transcribe`, quota, Supabase, or the STT provider path.

## Root Cause

The UX polish moved the pulsing recording dot inside the same button that changes from `Aufnahme starten` to `Aufnahme stoppen`. The recorder hook was unchanged, but the interactive button changed its child structure while the start interaction was in flight. On touch/mobile production testing this could collapse the control into the stop state immediately, making recording appear to start and then fall back before the user could speak.

## Endpoint / Network Distinction

The broken path was a UI recording-state collapse before a deliberate stop/transcribe flow. Source review shows `/api/guided-transcribe` is only called after the hook receives `MediaRecorder.onstop`, builds a non-empty audio blob, and enters transcription. No endpoint, quota, Groq, Supabase, or persistence code was changed for this fix, and no paid provider call was used in verification.

## Files Changed

- `frontend/src/components/today/SpeakStep.tsx`
- `frontend/src/components/today/Today.css`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `docs/Product/GUIDED_TODAY_STT_RECORDING_REGRESSION_FIX.md`

## Fix

- Kept the separate `Aufnahme läuft...` chip removed.
- Restored the recording button content to a simple `MicOff` icon plus `Aufnahme stoppen` label while recording.
- Moved the pulsing recording dot into a fixed-width non-interactive slot immediately beside the button.
- Added `pointer-events: none` to the dot so it cannot intercept clicks/taps.
- Kept the integrated transcript-card success/fail display.
- Kept the expected answer display as `Do you speak English?`.

## Regression Coverage

Added source-level checks that:

- The Speak step does not render the old recording status chip.
- The start/stop button keeps `type="button"` and separate start/stop handlers.
- The recording dot is outside the start/stop button.
- The recording dot cannot capture pointer events.

The browser-only `MediaRecorder` hook was not unit-tested directly here; the regression guard targets the actual UI shape that changed in the bad commit.

## Checks Run

- `npx tsx scripts/test-guided-today-path-overview.ts`

Full required verification was run before commit and push:

- `npx tsx scripts/test-guided-speech-check.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npm run check:i18n`
- `npm run build`
- targeted ESLint for changed TypeScript/TSX files
- `git diff --check`
- `git diff --cached --check`

## Production Redeploy

Production needs the normal Vercel redeploy after the pushed `main` commit. No backend deployment or Supabase action is required.

## Manual QA

1. Open the production site after Vercel deploys the fix.
2. Log in normally and go to `/today`.
3. Start A1 Practical 1, lesson 1, and reach the Speak step.
4. Press `Aufnahme starten`.
5. Expected: the control stays in recording state, the red `Aufnahme stoppen` button remains visible, and a small pulsing red dot appears beside the button. The old `Aufnahme läuft...` chip should not appear.
6. Say: `Do you speak English?`
7. Press `Aufnahme stoppen`.
8. Expected network: one authenticated `POST /api/guided-transcribe`.
9. Expected response shape: `{ "transcript": "..." }`.
10. Expected UI: transcript card appears, correct result is integrated into the card, and Continue unlocks automatically.

If recording immediately exits again before pressing stop, inspect the browser console and Network panel. A missing `POST /api/guided-transcribe` indicates the issue is still in the browser recording lifecycle; a failed `POST` indicates an auth/body/quota/provider response problem after recording has stopped.
