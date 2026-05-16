# Guided Today Review STT Parity Report

Date: 2026-05-17

## Verdict

Pass with fix. Guided Today Review now uses the same guided STT hook and answer checker path as the normal lesson Speak step.

## Root Cause

The Review speech step in `GuidedCheckpoint.tsx` used a separate browser-native `speechRecognition` helper with only local `idle/listening/done` state. It did not call `useGuidedSpeechRecognition`, did not hit `/api/guided-transcribe`, did not show a transcript, did not run `guidedSpeechCheck`, and rendered the Review `Weiter` action before any valid speech result.

## Files Changed

- `frontend/src/components/today/GuidedSpeechPrompt.tsx`
- `frontend/src/components/today/SpeakStep.tsx`
- `frontend/src/pages/GuidedCheckpoint.tsx`
- `frontend/scripts/test-guided-today-path-overview.ts`
- `frontend/scripts/test-guided-segment-reviews.ts`
- `docs/Product/GUIDED_TODAY_REVIEW_STT_PARITY_REPORT.md`

## Shared Component

Extracted `GuidedSpeechPrompt` as the shared speech UI and behavior component. It owns:

- `useGuidedSpeechRecognition`
- transcript rendering
- `checkGuidedSpeechAnswer`
- integrated success/close/fail transcript card
- expected-answer display
- retry/continue-anyway state
- the recording control and pulsing indicator

Normal lesson `SpeakStep` now wraps this component. Review uses the same component in `GuidedCheckpoint.tsx`.

## Review Phrase Mapping

Review maps directly to `item.lesson.speak`:

- `targetAnswer={item.lesson.speak.targetAnswer ?? item.lesson.speak.targetPhrase}`
- `displayAnswer={item.lesson.speak.displayAnswer ?? item.lesson.speak.targetAnswer ?? item.lesson.speak.targetPhrase}`
- `acceptedAnswers`, `requiredTokens`, `optionalTokens`, `language`, and `maxRecordingSeconds` all come from the original lesson speak config.

For lesson 1, this keeps the displayed expected answer as `Do you speak English?` while still accepting greeting variants such as `Hi, do you speak English?`, `Hello, do you speak English?`, and `Hi there, do you speak English?`.

## Continue / Skip Behavior

Review `Weiter` is disabled until the speech result is correct. Failed, close, error, or unsupported states expose `Trotzdem fortfahren`. Choosing that action advances explicitly and marks the current review item as needing review in the existing local review summary.

There is no silent pass-through before a speech attempt.

## Recording Icon Change

The active recording icon no longer uses the crossed-out microphone. The shared control now shows a red stop button with a stop-square icon and the existing pulsing red dot beside the control.

This applies to both:

- normal lesson Speak step
- Review speech prompt

## Boundaries

No changes were made to:

- `/api/guided-transcribe`
- `guided_transcribe` quota action
- Supabase schema or migration history
- quota enforcement
- Groq provider code
- TTS
- Speak tutor
- Grok realtime
- decks
- words
- generation jobs
- credits
- backend persistence

No audio or transcript persistence was added. Existing local review completion/pass state is the only review state updated.

## Tests / Checks

Run before commit and push:

- `npx tsx scripts/test-guided-speech-check.ts`
- `npx tsx scripts/test-guided-today-data.ts`
- `npx tsx scripts/test-guided-today-path-overview.ts`
- `npx tsx scripts/test-guided-vibes.ts`
- `npx tsx scripts/test-guided-segment-reviews.ts`
- `npm run check:i18n`
- `npm run build`
- targeted ESLint for changed TS/TSX files
- `git diff --check`
- `git diff --cached --check`

No paid providers were called by the automated tests.

## Production QA

1. Wait for Vercel production to deploy the pushed `main` commit.
2. Log in and open `/today`.
3. Open Review 1 from A1 Practical 1.
4. Complete the type prompt, then reach `Say the phrase out loud.`
5. Confirm `Weiter` is disabled before recording.
6. Press `Aufnahme starten`; recording should stay active and show the red stop control with a stop-square icon, not a crossed-out mic.
7. Say `Do you speak English?`
8. Press `Aufnahme stoppen`.
9. Confirm one authenticated `POST /api/guided-transcribe` appears after stop.
10. Confirm the transcript card shows `Du hast gesagt`, the correct state is integrated into the card, and `Weiter` unlocks.
11. Try a wrong phrase and confirm expected answer shows `Do you speak English?` and `Trotzdem fortfahren` appears only after the failed result.
